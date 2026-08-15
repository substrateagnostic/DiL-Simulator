import { NotificationArbiter, NC } from '../core/NotificationArbiter.js';
import * as THREE from 'three';
import { Engine } from '../core/Engine.js';
import { InputManager } from '../core/InputManager.js';
import { DEV_MODE } from '../utils/constants.js';
import * as K from '../arcade/constants.js';
import { Terrain, TerrainRibbon, KILL_Y } from '../arcade/Terrain.js';
import { Runner } from '../arcade/Runner.js';
import { PropFactory, PROP_KIND, PROP_DEF } from '../arcade/Props.js';
import { Backdrop } from '../arcade/Backdrop.js';
import { Hud } from '../arcade/Hud.js';
import { ArcadeSfx } from '../arcade/Sfx.js';

// ============================================================
// SPRINT REVIEW — the break-room cabinet
// ============================================================
// A Genesis-Sonic momentum platformer wearing an office. The physics
// live in src/arcade/Runner.js and the level in src/arcade/Terrain.js;
// this file is the state shell: scene, camera, prop lifetime, collision,
// the Deadline, scoring, and the two cards.
//
// Contract with the rest of the game (do not break silently):
//   * own Three.js scene, rendered via Engine.renderScene +
//     skipDefaultRender, per the ArcadeState pattern.
//   * player flags `arcade_highscore` / `arcade_best_distance` and the
//     four `arcade_*` cosmetic flags are read and written here. They are
//     carried across New Game+ by MenuState's `arcade_` CARRY_PREFIX.
//   * `arcade_best_distance` now stores FLOORS (units / 25), not raw
//     world units, and the ATK/DEF ladder is floors/40 capped at 5.
// ============================================================

const RESTART_KEYS = ['enter', ' '];

export class ArcadeState {
  constructor(stateManager, player) {
    this.stateManager = stateManager;
    this.player = player;

    this.scene = null;
    this.camera = null;
    this.terrain = null;
    this.ribbon = null;
    this.runner = null;
    this.backdrop = null;
    this.hud = null;
    this.sfx = null;
    this.props = null;

    this.active = [];        // live props
    this.particles = [];
    this.pool = [];
    this.speedLines = [];

    this._accum = 0;
    this._inputLock = 0.25;
    this._prevTilt = true;
    this._prevRetro = false;
    this._resize = null;
  }

  // =========================================================
  // LIFECYCLE
  // =========================================================

  enter() {
    // Same reasoning as the epilogue: SPRINT REVIEW owns the screen, and the
    // exploration HUD is hidden for the duration but the arbiter root is
    // page-level and would keep painting into the minigame.
    NotificationArbiter.suspendScope('world');
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050b10);

    this.camera = new THREE.OrthographicCamera(-10, 10, 6, -6, 0.1, 200);
    this.camera.position.set(0, 0, 40);
    this.camera.lookAt(0, 0, 0);

    this.terrain = new Terrain();
    this.ribbon = new TerrainRibbon(this.terrain);
    this.scene.add(this.ribbon.mesh);

    this.backdrop = new Backdrop(this.scene);
    this.props = new PropFactory();

    this.runner = new Runner(this.terrain);
    this.runner.applyCosmetics({
      gold: !!this.player.getFlag('arcade_gold_wheels'),
      tie: !!this.player.getFlag('arcade_fancy_roof'),
      pinstripe: !!this.player.getFlag('arcade_armored'),
      flames: !!this.player.getFlag('arcade_fire_horses'),
    });
    this.scene.add(this.runner.group);

    this._buildDeadline();
    this._buildParticlePool();

    this.hud = new Hud();
    this.sfx = new ArcadeSfx();

    this.highScore = this.player.getFlag('arcade_highscore') || 0;
    this.bestFloors = this.player.getFlag('arcade_best_distance') || 0;

    // The display case's tilt-shift blurs the top and bottom thirds of an
    // orthographic frame — correct for a diorama, fatal for a runner
    // whose obstacles arrive at the frame edge. The 1998 CRT pass goes ON
    // instead: this IS a cabinet in the break room. Both are restored in
    // exit() so nothing leaks back into exploration.
    this._prevTilt = Engine._tiltShiftOn !== false;
    this._prevRetro = Engine._retroOn === true;
    Engine.setTiltShift(false);
    Engine.setRetroPass(true);

    this._resize = () => this._onResize();
    window.addEventListener('resize', this._resize);
    this._onResize();

    this._reset(true);

    // Dev-only handle for tools/arcade-play.mjs — the harness reads real
    // physics state (gsp, angle, grounded) instead of guessing from the HUD.
    if (DEV_MODE) window.__arcade = this;
  }

  exit() {
    NotificationArbiter.resumeScope('world');
    Engine.setTiltShift(this._prevTilt);
    Engine.setRetroPass(this._prevRetro);
    window.removeEventListener('resize', this._resize);

    if (this.sfx) this.sfx.stop();
    if (this.hud) this.hud.destroy();
    if (this.ribbon) this.ribbon.dispose();
    if (this.runner) this.runner.dispose();
    if (this.backdrop) this.backdrop.dispose();
    if (this.props) this.props.dispose();
    for (const p of this.pool) { p.mesh.geometry.dispose(); p.mesh.material.dispose(); }
    for (const s of this.speedLines) { s.geometry.dispose(); s.material.dispose(); }
    if (this._dlGeos) for (const g of this._dlGeos) g.dispose();
    if (this._dlMats) for (const m of this._dlMats) m.dispose();

    this.pool.length = 0;
    this.speedLines.length = 0;
    this.active.length = 0;
    this.scene = null;
  }

  pause() {}
  resume() {}

  _onResize() {
    this._aspect = window.innerWidth / Math.max(1, window.innerHeight);
    this._applyZoom(this._zoom || K.CAM_HALF_H);
  }

  _applyZoom(halfH) {
    this._zoom = halfH;
    const a = this._aspect || 1.777;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.left = -halfH * a;
    this.camera.right = halfH * a;
    this.camera.updateProjectionMatrix();
    this._halfW = halfH * a;
  }

  // =========================================================
  // SETUP HELPERS
  // =========================================================

  _buildDeadline() {
    this._dlGeos = [];
    this._dlMats = [];
    const g = new THREE.Group();

    const push = (geo, mat) => { this._dlGeos.push(geo); this._dlMats.push(mat); return new THREE.Mesh(geo, mat); };

    // A dark falloff so the wall reads as a mass, not a card.
    const fade = push(new THREE.PlaneGeometry(26, 60),
      new THREE.MeshBasicMaterial({ color: 0x02060a, transparent: true, opacity: 0.9 }));
    fade.position.set(-13, 0, 3);
    g.add(fade);

    // Filing cabinets stacked to the ceiling: the backlog, arriving.
    const cabGeo = new THREE.BoxGeometry(2.6, 1.5, 1);
    const cabMat = new THREE.MeshBasicMaterial({ color: 0x3a4550 });
    const cabMat2 = new THREE.MeshBasicMaterial({ color: 0x2c353e });
    this._dlGeos.push(cabGeo); this._dlMats.push(cabMat, cabMat2);
    for (let r = 0; r < 24; r++) {
      for (let c = 0; c < 4; c++) {
        const m = new THREE.Mesh(cabGeo, (r + c) % 2 ? cabMat : cabMat2);
        m.position.set(-1.4 - c * 2.62, -18 + r * 1.55 + (c % 2) * 0.4, 4);
        g.add(m);
      }
    }
    // The leading edge: red overdue band.
    const edge = push(new THREE.PlaneGeometry(0.5, 60),
      new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
    edge.position.set(0.1, 0, 5);
    g.add(edge);
    const glow = push(new THREE.PlaneGeometry(3.0, 60),
      new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.22 }));
    glow.position.set(-1.4, 0, 4.9);
    g.add(glow);

    this.deadlineMesh = g;
    this.scene.add(g);
  }

  _buildParticlePool() {
    const geo = () => new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 140; i++) {
      const m = new THREE.Mesh(geo(), new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, depthWrite: false,
      }));
      m.visible = false;
      m.renderOrder = 6;
      this.scene.add(m);
      this.pool.push({ mesh: m, life: 0, max: 1, vx: 0, vy: 0, grav: 0, spin: 0 });
    }
    // Speed lines — flat streaks that only appear above 0.7 top speed.
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.05), new THREE.MeshBasicMaterial({
        color: 0xbdf6e6, transparent: true, opacity: 0, depthWrite: false,
      }));
      m.visible = false;
      m.renderOrder = 7;
      this.scene.add(m);
      this.speedLines.push(m);
      m.userData = { life: 0, vx: 0 };
    }
  }

  // =========================================================
  // RUN STATE
  // =========================================================

  _reset(firstTime) {
    for (const p of this.active) this.scene.remove(p.mesh);
    this.active.length = 0;
    for (const p of this.pool) { p.life = 0; p.mesh.visible = false; }
    for (const s of this.speedLines) { s.userData.life = 0; s.visible = false; }

    this.terrain.reset();
    this.runner.reset();

    this.score = 0;
    this.clips = 0;
    this.floors = 0;
    this.startX = this.runner.x;
    this.maxX = this.runner.x;
    this.topSpeedSeen = 0;
    this.runTime = 0;
    this.deadlineX = this.runner.x - K.DEADLINE_HEADSTART;
    this.combo = 0;
    this.comboTimer = 0;
    this.shake = 0;
    this.hitstop = 0;
    this.over = false;
    this.overCause = '';
    this.started = false;
    this.shownMilestones = new Set();
    this._spawnedTo = 0;
    this._inputLock = firstTime ? 0.25 : 0.12;

    this.camX = this.runner.x;
    this.camY = this.runner.y + 1.4;
    this._applyZoom(K.CAM_HALF_H);

    this.hud.hideCard();
    this.hud.showTitleCard();
    this.hud.update(this._hudState());
  }

  _hudState() {
    return {
      score: this.score,
      clips: this.clips,
      floors: this.floors,
      best: Math.max(this.highScore, this.score),
      speed: this.runner.speed,
      topSpeed: this.runner.topSpeed,
      dread: this._dread(),
      over: this.over,
    };
  }

  _dread() {
    const gap = this.runner.x - this.deadlineX;
    return Math.max(0, Math.min(1, 1 - gap / K.DEADLINE_MAX_GAP));
  }

  // =========================================================
  // MAIN LOOP
  // =========================================================

  update(dt) {
    // Sim first, present last — a runner at 18 u/s cannot afford a frame
    // of presentation latency, and skipDefaultRender must be asserted on
    // every path or the exploration scene draws over us.
    Engine.skipDefaultRender();

    if (this._inputLock > 0) this._inputLock -= dt;
    const canInput = this._inputLock <= 0;

    if (InputManager.isJustPressed('escape') && canInput) {
      this._present();
      this.stateManager.pop();
      return;
    }

    if (!this.started) {
      if (canInput && RESTART_KEYS.some(k => InputManager.isJustPressed(k))) {
        this.started = true;
        this.hud.hideCard();
        this.sfx.start();
      }
      this._renderOnly(dt);
      this._present();
      return;
    }

    if (this.over) {
      if (canInput && InputManager.isJustPressed('enter')) {
        this._reset(false);
        this.started = true;
        this.hud.hideCard();
        this.sfx.start();
      }
      this._renderOnly(dt);
      this._present();
      return;
    }

    const step = Math.min(dt, 0.05);
    this.runTime += step;

    // Hit-stop: freeze the sim for a couple of frames on a smash so the
    // impact reads. Genesis did it with a palette flash; we do both.
    if (this.hitstop > 0) {
      this.hitstop -= step;
      this._renderOnly(step);
      this._present();
      return;
    }

    // ---- fixed-step physics ---------------------------------------------
    const input = this._readInput();
    this._accum += step;
    const FIXED = 1 / 120;
    let guard = 12;
    while (this._accum >= FIXED && guard-- > 0) {
      this.runner.step(FIXED, input);
      // jumpPressed / spindash rev are edge events: consume after one step
      input.jumpPressed = false;
      this._accum -= FIXED;
    }
    if (guard <= 0) this._accum = 0;

    this._handleRunnerEvents();

    // ---- world -------------------------------------------------------------
    this.terrain.ensureAhead(this.runner.x + this._halfW + 90);
    this._drainSpawns();
    this._updateProps(step);
    this._collide();
    this._updateDeadline(step);
    this._updateCamera(step);
    this._updateParticles(step);
    this._updateSpeedLines(step);

    // ---- scoring ----------------------------------------------------------
    if (this.runner.x > this.maxX) this.maxX = this.runner.x;
    this.floors = Math.max(0, Math.floor((this.maxX - this.startX) / K.UNITS_PER_FLOOR));
    this.topSpeedSeen = Math.max(this.topSpeedSeen, this.runner.speed);
    if (this.comboTimer > 0) { this.comboTimer -= step; if (this.comboTimer <= 0) this.combo = 0; }

    this._checkMilestones();

    // ---- fail states --------------------------------------------------------
    if (this.runner.y < KILL_Y) this._gameOver('DOWN THE STAIRWELL', 'Facilities will hear about this.');
    else if (this.deadlineX >= this.runner.x) this._gameOver('THE QUARTER CLOSED', 'The backlog caught up. It always does.');

    this.sfx.setDread(this._dread());
    this.hud.update(this._hudState());
    this._present();
  }

  _present() {
    Engine.renderScene(this.scene, this.camera);
  }

  /** Visuals only — used on the title card, game-over card, and hit-stop. */
  _renderOnly(dt) {
    this.runner.render(dt);
    this._updateCamera(dt, true);
    this._updateParticles(dt);
    this._updateSpeedLines(dt);
    this.ribbon.update(this.camX, this._halfW);
    this.backdrop.update(this.camX, this.camY);
    for (const p of this.active) this._animateProp(p, dt);
  }

  _readInput() {
    const right = InputManager.isDown('arrowright') || InputManager.isDown('d');
    const left = InputManager.isDown('arrowleft') || InputManager.isDown('a');
    const jumpHeld = InputManager.isDown(' ') || InputManager.isDown('arrowup') || InputManager.isDown('w');
    const jumpPressed = InputManager.isJustPressed(' ') || InputManager.isJustPressed('arrowup')
      || InputManager.isJustPressed('w');
    const downHeld = InputManager.isDown('arrowdown') || InputManager.isDown('s');
    return { dir: (right ? 1 : 0) + (left ? -1 : 0), jumpHeld, jumpPressed, downHeld };
  }

  // =========================================================
  // EVENTS FROM THE BODY
  // =========================================================

  _handleRunnerEvents() {
    for (const e of this.runner.drainEvents()) {
      switch (e.type) {
        case 'jump': this.sfx.jump(); break;
        case 'roll': this.sfx.roll(); this._dust(6, 0x9fb4c2); break;
        case 'skid': this._dust(2, 0xc9d6de); if (Math.random() < 0.25) this.sfx.skid(); break;
        case 'land':
          this.sfx.land(e.impact);
          if (e.impact > 12) { this.shake = Math.min(0.5, e.impact * 0.018); this._dust(10, 0xb8c9d4); }
          else this._dust(4, 0xb8c9d4);
          break;
        case 'launch': this.sfx.launch(); this._dust(5, 0xd6f2e8); break;
        case 'spring': this.sfx.spring(); this.shake = 0.22; break;
        case 'boost': this.sfx.boost(); this.shake = 0.16; break;
        case 'hurt': this.sfx.hurt(); this.shake = 0.42; break;
        case 'smash': this.sfx.smash(); break;
        case 'spindash_rev': this.sfx.spindashRev(e.charge); this._dust(3, 0xc9d6de); break;
        case 'spindash_go':
          this.sfx.spindashGo(); this.shake = 0.3;
          this._burst(this.runner.x, this.runner.y + 0.4, 0xffd76a, 14, 5);
          break;
      }
    }
  }

  // =========================================================
  // PROPS
  // =========================================================

  _drainSpawns() {
    for (const req of this.terrain.drainPending()) {
      const kind = this._kindFor(req);
      if (!kind) continue;
      const mesh = this.props.create(kind);
      let y;
      if (req.absY !== undefined) {
        y = req.absY;
      } else {
        const g = this.terrain.heightAt(req.x);
        if (g === null) continue;               // decoration landed over a gap
        y = g + (req.yOff || 0);
      }
      mesh.position.set(req.x, y, 0.2);
      this.scene.add(mesh);
      this.active.push({
        kind, mesh, x: req.x, y,
        def: PROP_DEF[kind],
        dead: false, phase: Math.random() * Math.PI * 2, used: false,
      });
    }
  }

  _kindFor(req) {
    const r = Math.random();
    switch (req.type) {
      case 'clip': return PROP_KIND.CLIP;
      case 'coffee': return PROP_KIND.COFFEE;
      case 'stapler': return PROP_KIND.STAPLER;
      case 'spring': return PROP_KIND.SPRING;
      case 'boostpad': return PROP_KIND.BOOSTPAD;
      case 'puddle': return PROP_KIND.PUDDLE;
      case 'pipe': return PROP_KIND.PIPE;
      case 'checkpoint': return PROP_KIND.CHECKPOINT;
      case 'obstacle':
        if (req.tier === 'hard') return r < 0.55 ? PROP_KIND.BINDERS : PROP_KIND.COOLER;
        return r < 0.55 ? PROP_KIND.BOX : PROP_KIND.CHAIR;
      default: return null;
    }
  }

  _updateProps(dt) {
    const cull = this.camX - this._halfW - 30;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      if (p.x < cull || p.dead) {
        this.scene.remove(p.mesh);
        this.active.splice(i, 1);
        continue;
      }
      this._animateProp(p, dt);
    }
  }

  _animateProp(p, dt) {
    p.phase += dt;
    switch (p.kind) {
      case PROP_KIND.CLIP:
        p.mesh.rotation.y = p.phase * 4.2;
        p.mesh.position.y = p.y + Math.sin(p.phase * 2.4) * 0.07;
        break;
      case PROP_KIND.COFFEE:
      case PROP_KIND.STAPLER:
        p.mesh.rotation.y = p.phase * 2.2;
        p.mesh.position.y = p.y + Math.sin(p.phase * 2.0) * 0.13;
        break;
      case PROP_KIND.SPRING: {
        const b = p.mesh.userData.ball;
        if (b) {
          const k = p.compress > 0 ? (p.compress -= dt * 4) : 0;
          b.scale.set(1 + k * 0.5, Math.max(0.35, 1 - k), 1 + k * 0.5);
        }
        break;
      }
      case PROP_KIND.BOOSTPAD: {
        const ch = p.mesh.userData.chevrons;
        if (ch) for (let i = 0; i < ch.length; i++) {
          const t = (p.phase * 3 + i * 0.25) % 1;
          ch[i].position.y = 0.10 + (t < 0.4 ? 0.04 : 0);
        }
        break;
      }
      case PROP_KIND.CHAIR: {
        const w = p.mesh.userData.wheels;
        if (w) for (const x of w) x.rotation.y = p.phase * 2;
        p.mesh.position.x = p.x + Math.sin(p.phase * 1.6) * 0.22;
        break;
      }
      case PROP_KIND.CHECKPOINT: {
        const s = p.mesh.userData.screen;
        if (s) s.material = p.used ? this.props.M.lamp : this.props.M.lampOff;
        if (p.used) p.mesh.rotation.y = Math.min(Math.PI * 2, (p.mesh.rotation.y || 0) + dt * 9);
        break;
      }
      default: break;
    }
  }

  // =========================================================
  // COLLISION
  // =========================================================

  _collide() {
    const r = this.runner;
    const halfW = r.ballMode ? K.BALL_R : K.RUNNER_W * 0.5;
    const rL = r.x - halfW, rR = r.x + halfW;
    const rB = r.y, rT = r.y + (r.ballMode ? K.BALL_R * 2 : K.RUNNER_H);

    for (const p of this.active) {
      if (p.dead) continue;
      const d = p.def;
      if (rR < p.x - d.hw || rL > p.x + d.hw) continue;
      const pB = p.y + d.y0, pT = p.y + d.y1;
      if (rT < pB || rB > pT) continue;

      // ---- pickups -------------------------------------------------------
      if (d.pickup) {
        p.dead = true;
        if (d.clips) {
          this.clips += d.clips;
          this.score += d.clips * K.CLIP_POINTS;
          this.sfx.stapler();
          this.hud.pop(`+${d.clips} CLIPS`);
          this._burst(p.x, p.y, 0xffd76a, 16, 4);
        } else if (d.shoes) {
          r.shoes = d.shoes;
          this.sfx.shoes();
          this.hud.pop('CAFFEINATED');
          this._burst(p.x, p.y, 0xffe27a, 12, 3.5);
        } else {
          this.clips += 1;
          this.combo += 1;
          this.comboTimer = 1.1;
          this.score += K.CLIP_POINTS + Math.min(40, this.combo * 2);
          this.sfx.clip();
          this._burst(p.x, p.y, 0xdfe8f0, 4, 2.4);
        }
        continue;
      }

      // ---- spring ---------------------------------------------------------
      if (d.spring) {
        r.springLaunch(d.spring);
        p.compress = 1;
        this.score += 10;
        continue;
      }

      // ---- boost pad -------------------------------------------------------
      if (d.boost) {
        if (r.grounded && r.gsp < d.boost) { r.boost(d.boost); this.score += 15; }
        continue;
      }

      // ---- checkpoint -------------------------------------------------------
      if (d.checkpoint) {
        if (!p.used) {
          p.used = true;
          this.deadlineX -= 46;
          this.score += 250;
          this.sfx.checkpoint();
          this.hud.pop('MILESTONE MET  +250');
          this._burst(p.x, p.y + 1.6, 0x5fd8c0, 20, 5);
        }
        continue;
      }

      // ---- slick (coffee puddle) — a ONE-SHOT momentum tax -------------------
      // Deliberately not a continuous drag. Continuous drag that exceeds
      // ground ACC is not a tax, it is a wall you can never walk out of;
      // a single multiplicative hit costs you the same speed at pace and
      // is mathematically incapable of trapping a stopped player.
      if (d.slick) {
        if (!p.used) {
          p.used = true;
          if (r.grounded) r.gsp *= 0.45; else r.vx *= 0.45;
          this._burst(p.x, p.y + 0.15, 0x8a6a44, 10, 3);
          this.hud.pop('SPILL');
        }
        continue;
      }

      // ---- obstacles ----------------------------------------------------------
      if (d.smashable && r.ballMode) {
        p.dead = true;
        this.score += K.SMASH_POINTS;
        this.hitstop = 0.055;
        this.shake = 0.3;
        r.smashBounce();
        this._burst(p.x, p.y + 0.5, 0xc79a5e, 18, 5);
        this.hud.pop(`+${K.SMASH_POINTS}`);
        continue;
      }
      if (r.invuln > 0) continue;

      // Wipeout: scatter the clips, kill the speed. Losing the momentum IS
      // the punishment — the Deadline does the rest.
      const lost = Math.min(this.clips, 22);
      this.clips -= lost;
      this._scatterClips(lost);
      r.hurt();
      this.combo = 0;
      this.hitstop = 0.07;
      this.hud.pop('WRITTEN UP');
      break;
    }
  }

  // =========================================================
  // THE DEADLINE
  // =========================================================

  _updateDeadline(dt) {
    const t = this.runTime;
    let v = K.DEADLINE_START_SPEED +
      (K.DEADLINE_END_SPEED - K.DEADLINE_START_SPEED) * Math.min(1, t / K.DEADLINE_RAMP_TIME);
    if (t > K.DEADLINE_RAMP_TIME) v += ((t - K.DEADLINE_RAMP_TIME) / 30) * K.DEADLINE_LATE_RAMP;
    this.deadlineX += v * dt;
    // It never lags further behind than MAX_GAP — outrunning it buys you
    // breathing room, not immunity.
    this.deadlineX = Math.max(this.deadlineX, this.runner.x - K.DEADLINE_MAX_GAP);

    this.deadlineMesh.position.set(this.deadlineX, this.camY, 0);

    // Paper storm off the leading edge, denser the closer it is.
    const dread = this._dread();
    if (dread > 0.25 && Math.random() < dread * 0.9) {
      this._spawn(this.deadlineX + Math.random() * 1.5,
        this.camY - this._zoom + Math.random() * this._zoom * 2,
        0xe8dcc0, {
          vx: 5 + Math.random() * 7, vy: 1 + Math.random() * 4,
          grav: -6, life: 1.2, size: 0.22 + Math.random() * 0.18, spin: 6,
        });
    }
  }

  // =========================================================
  // CAMERA
  // =========================================================

  _updateCamera(dt, idle) {
    const r = this.runner;
    // Horizontal: lead the runner by a fraction of a second of travel, so
    // at speed you see what you are about to hit. Genesis extended camera.
    const lead = Math.max(-3, Math.min(K.CAM_LOOKAHEAD_MAX, r.gsp * K.CAM_LOOKAHEAD));
    const targetX = r.x + (idle ? 0 : lead);
    this.camX += (targetX - this.camX) * Math.min(1, dt * 6.5);

    // Vertical: dead zone, then a capped chase — slow on the ground so
    // rolling terrain does not seasick you, fast in the air so a spring
    // launch stays framed.
    const targetY = r.y + 1.5;
    const dy = targetY - this.camY;
    if (Math.abs(dy) > K.CAM_DEADZONE_Y) {
      const want = dy - Math.sign(dy) * K.CAM_DEADZONE_Y;
      const cap = (r.grounded ? K.CAM_FOLLOW_Y_GROUND : K.CAM_FOLLOW_Y_AIR) * dt;
      this.camY += Math.sign(want) * Math.min(Math.abs(want), cap);
    }

    // Speed widens the frame — you earn more reaction time by going fast.
    const over = Math.max(0, r.speed - K.TOP * 0.5) / (K.TOP * 1.4);
    const wantZoom = K.CAM_HALF_H * (1 + Math.min(0.16, over * 0.16));
    this._applyZoom(this._zoom + (wantZoom - this._zoom) * Math.min(1, dt * 2.2));

    // Shake.
    let sx = 0, sy = 0;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.6);
      sx = (Math.random() - 0.5) * this.shake;
      sy = (Math.random() - 0.5) * this.shake;
    }
    this.camera.position.set(this.camX + sx, this.camY + sy, 40);

    if (!idle) {
      this.runner.render(dt);
      this.ribbon.update(this.camX, this._halfW);
      this.backdrop.update(this.camX, this.camY);
    }
  }

  // =========================================================
  // PARTICLES
  // =========================================================

  _spawn(x, y, color, o = {}) {
    for (const p of this.pool) {
      if (p.life > 0) continue;
      p.life = p.max = o.life ?? 0.5;
      p.vx = o.vx ?? 0;
      p.vy = o.vy ?? 0;
      p.grav = o.grav ?? -14;
      p.spin = o.spin ?? 0;
      p.mesh.material.color.setHex(color);
      p.mesh.material.opacity = o.opacity ?? 0.95;
      const s = o.size ?? 0.16;
      p.mesh.scale.set(s, s, 1);
      p.mesh.position.set(x, y, 1.2);
      p.mesh.rotation.z = Math.random() * Math.PI;
      p.mesh.visible = true;
      return p;
    }
    return null;
  }

  _burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      this._spawn(x, y, color, {
        vx: Math.cos(a) * speed * (0.6 + Math.random() * 0.6),
        vy: Math.sin(a) * speed * (0.6 + Math.random() * 0.6) + 1.5,
        life: 0.45 + Math.random() * 0.3,
        size: 0.13 + Math.random() * 0.12,
        spin: (Math.random() - 0.5) * 12,
      });
    }
  }

  _dust(n, color) {
    const r = this.runner;
    for (let i = 0; i < n; i++) {
      this._spawn(r.x - 0.3 - Math.random() * 0.4, r.y + 0.08 + Math.random() * 0.2, color, {
        vx: -1.5 - Math.random() * 2.5 - r.speed * 0.08,
        vy: 0.6 + Math.random() * 1.8,
        grav: -5, life: 0.32 + Math.random() * 0.2,
        size: 0.13 + Math.random() * 0.14, opacity: 0.55,
      });
    }
  }

  // Genesis ring scatter, in paperclips: a ring of them thrown up and out,
  // bouncing once. Losing them is meant to hurt to watch.
  _scatterClips(n) {
    const r = this.runner;
    for (let i = 0; i < Math.min(n, 20); i++) {
      const a = (i / Math.max(1, Math.min(n, 20))) * Math.PI * 2;
      this._spawn(r.x, r.y + 0.7, 0xd8dee6, {
        vx: Math.cos(a) * 5.5, vy: Math.abs(Math.sin(a)) * 8 + 3,
        grav: -22, life: 1.15, size: 0.2, spin: 9, opacity: 1,
      });
    }
  }

  _updateParticles(dt) {
    for (const p of this.pool) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.mesh.visible = false; continue; }
      p.vy += p.grav * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.rotation.z += p.spin * dt;
      p.mesh.material.opacity = Math.min(1, (p.life / p.max) * 1.4);
    }
  }

  _updateSpeedLines(dt) {
    const r = this.runner;
    const fast = r.speed > r.topSpeed * 0.78;

    // BLAZING WINGTIPS (the 200-floor cosmetic) earns a real flame trail.
    if (r.flameTrail && r.speed > r.topSpeed * 0.55 && Math.random() < 0.75) {
      this._spawn(r.x - 0.35, r.y + 0.18 + Math.random() * 0.3,
        Math.random() < 0.5 ? 0xff8a2b : 0xffd76a, {
          vx: -3 - Math.random() * 3, vy: 1.2 + Math.random() * 1.6,
          grav: -2, life: 0.28, size: 0.18 + Math.random() * 0.16, opacity: 0.85,
        });
    }

    if (fast) {
      for (const s of this.speedLines) {
        if (s.userData.life > 0) continue;
        if (Math.random() > 0.35) continue;
        // Short, dim, and kept in the band the runner occupies. The first
        // pass drew 4-unit streaks across the full frame height and they
        // read as rendering artefacts hanging in mid-air, not as motion.
        s.userData.life = 0.18;
        s.userData.vx = -r.speed * 1.6;
        const len = 0.9 + Math.random() * 1.4;
        s.scale.set(len, 1, 1);
        s.position.set(
          this.camX + this._halfW * (0.15 + Math.random() * 0.85),
          r.y + 0.2 + (Math.random() - 0.35) * 2.6, 1.5);
        s.material.opacity = 0.16 + Math.random() * 0.16;
        s.visible = true;
        break;
      }
    }
    for (const s of this.speedLines) {
      if (s.userData.life <= 0) continue;
      s.userData.life -= dt;
      s.position.x += s.userData.vx * dt;
      s.material.opacity = Math.max(0, s.material.opacity - dt * 2.2);
      if (s.userData.life <= 0) s.visible = false;
    }
  }

  // =========================================================
  // PROGRESSION / END OF RUN
  // =========================================================

  _checkMilestones() {
    for (const m of K.COSMETIC_MILESTONES) {
      if (this.floors >= m.floors && !this.shownMilestones.has(m.flag) && !this.player.getFlag(m.flag)) {
        this.shownMilestones.add(m.flag);
        this.hud.pop(`★ ${m.label}`);
        this.sfx.stapler();
      }
    }
  }

  _gameOver(cause, flavour) {
    if (this.over) return;
    this.over = true;
    this.overCause = cause;
    this.sfx.setDread(0);
    this.sfx.die();
    this.shake = 0.6;
    this._burst(this.runner.x, this.runner.y + 0.8, 0xff5b5b, 24, 7);
    this.runner.dead = true;

    const record = this.score > this.highScore;
    if (record) {
      this.highScore = this.score;
      this.player.setFlag('arcade_highscore', this.score);
    }

    // Cosmetic unlocks are granted on the run that earned them.
    const unlocks = [];
    for (const m of K.COSMETIC_MILESTONES) {
      if (this.floors >= m.floors && !this.player.getFlag(m.flag)) {
        this.player.setFlag(m.flag, true);
        unlocks.push(m.label);
      }
    }

    // Permanent stat ladder: +1 ATK/+1 DEF per 40 floors of personal best,
    // capped at +5. Only the NEW tiers pay out, so this cannot be farmed.
    const prevBest = this.bestFloors || 0;
    const newBest = Math.max(prevBest, this.floors);
    const prevTiers = Math.min(5, Math.floor(prevBest / 40));
    const newTiers = Math.min(5, Math.floor(newBest / 40));
    const tiers = newTiers - prevTiers;
    if (newBest > prevBest) {
      this.bestFloors = newBest;
      this.player.setFlag('arcade_best_distance', newBest);
    }
    if (tiers > 0) {
      this.player.stats.atk = (this.player.stats.atk || 0) + tiers;
      this.player.stats.def = (this.player.stats.def || 0) + tiers;
      // B17 — SAY SOMETHING. The permanent stat ladder paid out silently
      // except for a number on the game-over card, which is the one screen the
      // player is least likely to read carefully (they are looking at the
      // distance and pressing retry). A PERMANENT change to Assertiveness and
      // Composure is exactly the class the arbiter calls PROGRESS.
      //
      // Posted to the WORLD scope, which this state suspends — so it does not
      // paint over the cabinet, it is held and shown when the player is back in
      // the break room with the rest of the game around them. That is the
      // correct read for a stat change: it belongs to the office, not the game
      // inside the game. DEFER, DON'T DESTROY does the rest.
      NotificationArbiter.post({
        cls: NC.PROGRESS,
        tone: 'item',
        text: `SPRINT REVIEW: Assertiveness +${tiers}, Composure +${tiers} — permanently.`,
        key: 'Sprint Review',
      });
    }
    // Same treatment for a cosmetic milestone, which had the same problem.
    for (const label of unlocks) {
      NotificationArbiter.post({ cls: NC.PROGRESS, tone: 'item', text: `SPRINT REVIEW: ${label}`, key: 'Sprint Review' });
    }

    this.hud.showGameOver({
      cause,
      flavour,
      record,
      score: this.score,
      clips: this.clips,
      floors: this.floors,
      topSpeed: this.topSpeedSeen.toFixed(1),
      best: this.highScore,
      unlocks,
      tiers,
    });
  }
}
