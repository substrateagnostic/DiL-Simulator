import * as THREE from 'three';
import * as K from './constants.js';

// ============================================================
// RUNNER — Andrew, and the honest Genesis integrator
// ============================================================
// The integrator is the point of the whole rebuild, so it is written to
// be readable rather than clever. Two states:
//
//   GROUNDED: a scalar ground speed `gsp` along the surface tangent.
//             Gravity is applied as the Genesis slope factor
//             (gsp -= SLOPE * sin(angle) * dt), which is what makes a
//             downhill actually PAY and an uphill actually COST.
//             Leaving the ground is decided by a ballistic test: step
//             one substep tangentially, then check whether the free-fall
//             path is above the floor. Over a crest it is, so you launch
//             — that single test is what makes hills feel like Sonic and
//             not like a Chrome dino.
//
//   AIRBORNE: plain (vx, vy) with AIR_ACC steering and jump-cut. On
//             landing, shallow angles keep vx outright (Genesis rule)
//             and steep ones project the velocity onto the tangent, so
//             you can pour a whole jump's momentum into a downslope.
//
// Rolling swaps the friction/slope table (half friction, 4x downhill
// factor, no acceleration) — the classic "you cannot steer but you go
// like hell downhill" contract.
// ============================================================

const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

export class Runner {
  constructor(terrain) {
    this.terrain = terrain;
    this.group = new THREE.Group();
    this._geos = [];
    this._mats = [];
    this._build();
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = this.terrain.heightAt(0) ?? 0;
    this.gsp = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.grounded = true;
    this.rolling = false;
    this.jumping = false;
    this.crouching = false;
    this.spindash = -1;         // -1 = not charging
    this.controlLock = 0;
    this.invuln = 0;
    this.shoes = 0;             // seconds of speed-shoe boost left
    this.dead = false;
    this.facing = 1;
    this._runPhase = 0;
    this._spinPhase = 0;
    this._squash = 1;
    this._lastLandSpeed = 0;
    this.events = [];
  }

  get topSpeed() { return this.shoes > 0 ? K.TOP * 1.45 : K.TOP; }
  get speed() { return this.grounded ? Math.abs(this.gsp) : Math.hypot(this.vx, this.vy); }
  get ballMode() { return this.rolling || this.jumping; }
  /** Half-height of the collision box right now. */
  get halfH() { return this.ballMode ? K.BALL_R : K.RUNNER_H * 0.5; }
  get centreY() { return this.y + this.halfH; }

  _emit(e) { this.events.push(e); }
  drainEvents() { const e = this.events.slice(); this.events.length = 0; return e; }

  // =========================================================
  // PHYSICS
  // =========================================================

  /**
   * One fixed substep. `input` = { dir: -1|0|1, jumpHeld, jumpPressed,
   * downHeld }.
   */
  step(dt, input) {
    if (this.dead) return;
    if (this.controlLock > 0) this.controlLock -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.shoes > 0) this.shoes -= dt;

    const dir = this.controlLock > 0 ? 0 : input.dir;

    if (this.grounded) this._stepGround(dt, dir, input);
    else this._stepAir(dt, dir, input);

    if (this.gsp > K.MAX_SPEED) this.gsp = K.MAX_SPEED;
    if (this.gsp < -K.MAX_SPEED) this.gsp = -K.MAX_SPEED;
  }

  _stepGround(dt, dir, input) {
    const s = Math.sin(this.angle);

    // ---- spindash ------------------------------------------------------
    if (this.spindash >= 0) {
      this.spindash = Math.max(0, this.spindash - K.SPINDASH_DECAY * dt);
      if (input.jumpPressed) {
        this.spindash = Math.min(K.SPINDASH_MAX_CHARGE, this.spindash + 2);
        this._emit({ type: 'spindash_rev', charge: this.spindash });
      }
      if (!input.downHeld) {
        this.gsp = (K.SPINDASH_BASE + Math.floor(this.spindash) * K.SPINDASH_PER) * (this.facing || 1);
        this.spindash = -1;
        this.crouching = false;
        this.rolling = true;
        this._emit({ type: 'spindash_go', speed: Math.abs(this.gsp) });
      }
      // A charging spindash does not move, but it does still obey gravity
      // on a slope so you cannot park one on a wall.
      this.gsp -= K.SLOPE * s * dt * 0.25;
      this._advanceGround(dt);
      return;
    }

    // ---- crouch / start a spindash --------------------------------------
    if (input.downHeld && Math.abs(this.gsp) < 0.6 && !this.rolling) {
      this.crouching = true;
      if (input.jumpPressed) {
        this.spindash = 2;
        this._emit({ type: 'spindash_rev', charge: 2 });
        return;
      }
    } else {
      this.crouching = false;
    }

    // ---- jump ------------------------------------------------------------
    if (input.jumpPressed && !this.crouching) {
      const c = Math.cos(this.angle);
      // Jump along the surface NORMAL — the Genesis rule. On a slope this
      // throws you outward, which is why launching off a hill flank feels
      // so different from jumping on the flat.
      this.vx = this.gsp * c - K.JUMP * s;
      this.vy = this.gsp * s + K.JUMP * c;
      this.grounded = false;
      this.jumping = true;
      this.rolling = false;
      this.crouching = false;
      this._emit({ type: 'jump' });
      this._stepAir(dt, dir, input);
      return;
    }

    // ---- roll -------------------------------------------------------------
    if (input.downHeld && !this.rolling && Math.abs(this.gsp) >= K.ROLL_START) {
      this.rolling = true;
      this._emit({ type: 'roll' });
    }

    // ---- accelerate / brake ----------------------------------------------
    const top = this.topSpeed;
    if (!this.rolling) {
      if (dir > 0) {
        if (this.gsp < 0) { this.gsp += K.DEC * dt; if (this.gsp >= 0) this.gsp = 0.5; this._emit({ type: 'skid' }); }
        else if (this.gsp < top) this.gsp = Math.min(top, this.gsp + K.ACC * dt);
      } else if (dir < 0) {
        if (this.gsp > 0) { this.gsp -= K.DEC * dt; if (this.gsp <= 0) this.gsp = -0.5; this._emit({ type: 'skid' }); }
        else if (this.gsp > -top) this.gsp = Math.max(-top, this.gsp - K.ACC * dt);
      } else {
        const f = Math.min(Math.abs(this.gsp), K.FRC * dt);
        this.gsp -= f * sign(this.gsp);
      }
      if (dir !== 0) this.facing = dir;
    } else {
      // Rolling: you may brake, never accelerate.
      if (dir < 0 && this.gsp > 0) this.gsp -= K.ROLL_DEC * dt;
      else if (dir > 0 && this.gsp < 0) this.gsp += K.ROLL_DEC * dt;
      const f = Math.min(Math.abs(this.gsp), K.ROLL_FRC * dt);
      this.gsp -= f * sign(this.gsp);
      if (Math.abs(this.gsp) < K.ROLL_MIN) this.rolling = false;
    }

    // ---- slope factor ------------------------------------------------------
    if (this.rolling) {
      const downhill = this.gsp === 0 || this.gsp * s < 0;
      this.gsp -= (downhill ? K.SLOPE_ROLL_DOWN : K.SLOPE_ROLL_UP) * s * dt;
    } else if (!this.crouching) {
      this.gsp -= K.SLOPE * s * dt;
    }

    // ---- slip on a steep face at low speed ----------------------------------
    if (Math.abs(this.angle) > K.SLIP_ANGLE && Math.abs(this.gsp) < K.SLIP_SPEED) {
      this.gsp -= K.SLOPE * s * dt * 2.0;
      this.controlLock = K.CONTROL_LOCK;
    }

    this._advanceGround(dt);
  }

  _advanceGround(dt) {
    const c = Math.cos(this.angle);
    const s = Math.sin(this.angle);
    const vx = this.gsp * c;
    const vy = this.gsp * s;
    const nx = this.x + vx * dt;

    // THE LAUNCH TEST. Take one free-fall step from here; if that path
    // clears the floor, the floor fell away faster than gravity can hold
    // us to it, so we are airborne. Crests launch, dips do not.
    const ballistic = this.y + vy * dt - 0.5 * K.GRAVITY * dt * dt;
    const ground = this.terrain.heightAt(nx);

    if (ground === null) {
      this.x = nx;
      this.y = ballistic;
      this.vx = vx;
      this.vy = vy - K.GRAVITY * dt;
      this.grounded = false;
      return;
    }
    if (ballistic > ground + 1e-4) {
      this.x = nx;
      this.y = ballistic;
      this.vx = vx;
      this.vy = vy - K.GRAVITY * dt;
      this.grounded = false;
      if (Math.abs(this.gsp) > K.TOP * 0.55) this._emit({ type: 'launch', speed: Math.abs(this.gsp) });
      return;
    }
    this.x = nx;
    this.y = ground;
    this.angle = this.terrain.angleAt(nx);
  }

  _stepAir(dt, dir, input) {
    // Jump cut — release early, stop rising. Variable jump height is the
    // single biggest contributor to a platformer feeling responsive.
    if (this.jumping && !input.jumpHeld && this.vy > K.JUMP_CUT) this.vy = K.JUMP_CUT;

    if (dir !== 0) {
      const top = this.topSpeed;
      const next = this.vx + dir * K.AIR_ACC * dt;
      // Air control may steer up to top speed but never past it; slopes
      // and springs are the only things allowed to break the cap.
      if (Math.abs(next) <= Math.max(top, Math.abs(this.vx))) this.vx = next;
      this.facing = dir;
    }
    this.vy -= K.GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const ground = this.terrain.heightAt(this.x);
    if (ground !== null && this.vy <= 0 && this.y <= ground) {
      this.y = ground;
      this.grounded = true;
      this.jumping = false;
      this.angle = this.terrain.angleAt(this.x);
      const a = this.angle;
      if (Math.abs(a) < 0.4) {
        // Shallow: keep horizontal speed outright.
        this.gsp = this.vx;
      } else {
        // Steep: project onto the tangent, so a big drop onto a downslope
        // converts into real ground speed instead of evaporating.
        this.gsp = this.vx * Math.cos(a) + this.vy * Math.sin(a);
      }
      this._lastLandSpeed = -this.vy;
      this._squash = 0.72;
      this.vy = 0;
      if (this.rolling && Math.abs(this.gsp) < K.ROLL_MIN) this.rolling = false;
      this._emit({ type: 'land', impact: this._lastLandSpeed, speed: Math.abs(this.gsp) });
    }
  }

  // ---- external impulses --------------------------------------------------

  springLaunch(power) {
    // Carry the horizontal component across BEFORE dropping to air state,
    // or a spring hit while grounded launches you straight up with a stale
    // vx and eats the run you just built.
    if (this.grounded) this.vx = this.gsp * Math.cos(this.angle);
    this.grounded = false;
    this.jumping = false;
    this.rolling = false;
    this.vy = power;
    this._emit({ type: 'spring' });
  }

  boost(speed) {
    if (this.grounded) this.gsp = Math.max(this.gsp, speed);
    else this.vx = Math.max(this.vx, speed);
    this._emit({ type: 'boost' });
  }

  hurt() {
    this.grounded = false;
    this.jumping = false;
    this.rolling = false;
    // Knock back far enough to clear the thing that hit you: at -7.5 for
    // the 0.45s control lock you end up ~3 units behind it, which is room
    // to jump from. -5.5 left you inside its hitbox as invulnerability ran out.
    this.vx = -7.5;
    this.vy = 10.5;
    this.gsp = 0;
    this.invuln = 1.6;
    this.controlLock = 0.45;
    this._emit({ type: 'hurt' });
  }

  smashBounce() {
    // Genesis badnik bounce: if you were falling you get thrown back up,
    // if you were rising you keep rising. Rewards aggression.
    if (this.vy < 0) this.vy = 11.5;
    this._emit({ type: 'smash' });
  }

  // =========================================================
  // VISUAL
  // =========================================================

  _g(g) { this._geos.push(g); return g; }
  _m(c) { const m = new THREE.MeshBasicMaterial({ color: c }); this._mats.push(m); return m; }

  /** Give a mesh a back-face hull so it reads as a sticker at any size. */
  _rim(mesh, scale = 1.18) {
    const hull = new THREE.Mesh(mesh.geometry, this._outlineMat);
    hull.scale.setScalar(scale);
    hull.renderOrder = -1;
    mesh.add(hull);
    return mesh;
  }

  _build() {
    // Andrew's suit is canon navy, but a navy body on a navy-teal office
    // at 110px tall is a smudge. Lifted to a clear cobalt so the INTERIOR
    // of the silhouette reads as a jacket and not as fill inside an
    // outline, with the shirt narrowed so it stops eating the chest.
    const SUIT = 0x3c56a8;
    const SUIT_D = 0x2a3d7c;
    const SHIRT = 0xeef3fa;
    const SKIN = 0xf3c79e;
    const HAIR = 0x54402e;
    const TIE = 0xd4342f;
    const SHOE = 0x2b2018;

    this.mats = {
      suit: this._m(SUIT), suitD: this._m(SUIT_D), shirt: this._m(SHIRT),
      skin: this._m(SKIN), hair: this._m(HAIR), tie: this._m(TIE), shoe: this._m(SHOE),
      blur: this._m(0xd8f4ea),
    };

    // INVERTED-HULL OUTLINE. A navy suit on a navy-teal office floor is
    // invisible at speed — measured on the first render pass, the runner
    // was a 60px smudge and two critics would have called it a bug, not a
    // style. Genesis solved silhouette with palette separation; we cannot
    // (Andrew's suit is canon), so we solve it with a sticker outline:
    // every limb gets a back-face-only copy scaled up 18%. The real mesh
    // wins the depth test everywhere it covers, so only the rim survives.
    this._outlineMat = new THREE.MeshBasicMaterial({
      color: 0x7ad4c0, side: THREE.BackSide,
    });
    this._mats.push(this._outlineMat);

    // ---- standing/running body ------------------------------------------
    const stand = new THREE.Group();
    const torso = new THREE.Mesh(this._g(new THREE.BoxGeometry(0.52, 0.66, 0.34)), this.mats.suit);
    torso.position.y = 1.06; stand.add(this._rim(torso, 1.10));
    const lapel = new THREE.Mesh(this._g(new THREE.BoxGeometry(0.14, 0.48, 0.06)), this.mats.shirt);
    lapel.position.set(0.02, 1.08, 0.18); stand.add(lapel);
    const tie = new THREE.Mesh(this._g(new THREE.BoxGeometry(0.09, 0.4, 0.04)), this.mats.tie);
    tie.position.set(0.02, 1.02, 0.22); stand.add(tie);
    this.tieMesh = tie;

    const head = new THREE.Mesh(this._g(new THREE.SphereGeometry(0.21, 12, 10)), this.mats.skin);
    head.position.y = 1.58; stand.add(this._rim(head, 1.12));
    const hair = new THREE.Mesh(
      this._g(new THREE.SphereGeometry(0.225, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62)),
      this.mats.hair);
    hair.position.y = 1.60; hair.rotation.z = -0.16; stand.add(this._rim(hair, 1.11));

    // Limb geometries are pre-translated so their ORIGIN sits at the joint
    // (shoulder / hip). rotation.z on the mesh then swings the limb about
    // that joint instead of about its own middle. One geometry per limb —
    // sharing one and calling translate() twice would double the shift.
    const armGeo = () => { const g = this._g(new THREE.BoxGeometry(0.15, 0.52, 0.15)); g.translate(0, -0.26, 0); return g; };
    this.armF = new THREE.Mesh(armGeo(), this.mats.suitD);
    this.armB = new THREE.Mesh(armGeo(), this.mats.suitD);
    this.armF.position.set(0.06, 1.32, 0.16);
    this.armB.position.set(-0.02, 1.32, -0.16);
    stand.add(this._rim(this.armF, 1.16), this._rim(this.armB, 1.16));

    const legGeo = this._g(new THREE.BoxGeometry(0.18, 0.62, 0.18));
    legGeo.translate(0, -0.31, 0);
    this.legF = new THREE.Mesh(legGeo, this.mats.suitD);
    this.legB = new THREE.Mesh(legGeo, this.mats.suitD);
    this.legF.position.set(0.02, 0.70, 0.10);
    this.legB.position.set(-0.02, 0.70, -0.10);
    stand.add(this._rim(this.legF, 1.14), this._rim(this.legB, 1.14));

    const shoeGeo = this._g(new THREE.BoxGeometry(0.26, 0.13, 0.3));
    this.shoeF = new THREE.Mesh(shoeGeo, this.mats.shoe);
    this.shoeB = new THREE.Mesh(shoeGeo, this.mats.shoe);
    this.shoeF.position.set(0.04, -0.30, 0.05);
    this.shoeB.position.set(0.04, -0.30, 0.05);
    this.legF.add(this._rim(this.shoeF, 1.16)); this.legB.add(this._rim(this.shoeB, 1.16));

    this.stand = stand;
    this.group.add(stand);

    // ---- the "figure-8" fast-run legs -------------------------------------
    // Genesis Sonic replaces legs with a spinning blur above ~0.75 top
    // speed. This is that, in wingtips: a flattened torus that spins.
    const blurGeo = this._g(new THREE.TorusGeometry(0.30, 0.10, 6, 16));
    this.runBlur = new THREE.Mesh(blurGeo, this.mats.blur);
    this.runBlur.position.y = 0.33;
    this.runBlur.scale.set(1.0, 0.62, 1.0);
    this.runBlur.visible = false;
    // Parented to `stand`, NOT to the group: the invulnerability flicker
    // and the landing squash both drive stand.visible / stand.scale, and a
    // sibling blur stayed on screen after the body vanished — which read
    // on camera as a detached black ellipse rolling along the floor.
    stand.add(this._rim(this.runBlur, 1.10));

    // ---- the curled ball --------------------------------------------------
    const ball = new THREE.Group();
    const core = new THREE.Mesh(this._g(new THREE.SphereGeometry(K.BALL_R, 14, 10)), this.mats.suit);
    ball.add(this._rim(core, 1.11));
    // Three tumbling wedges read as the Genesis spin-frame arcs. They must
    // sit IN FRONT of the sphere (z > BALL_R) — authored inside it at
    // radius 0.86R they were swallowed whole and the curl rendered as a
    // plain blue circle with no sense of rotation at all.
    const wedge = this._g(new THREE.TorusGeometry(K.BALL_R * 0.66, 0.085, 6, 14, Math.PI * 0.85));
    this.ballArcs = [];
    for (let i = 0; i < 3; i++) {
      const w = new THREE.Mesh(wedge, i === 1 ? this.mats.shirt : this.mats.suitD);
      w.rotation.z = (i / 3) * Math.PI * 2;
      w.position.z = K.BALL_R + 0.04;
      ball.add(w);
      this.ballArcs.push(w);
    }
    const flick = new THREE.Mesh(this._g(new THREE.BoxGeometry(0.42, 0.09, 0.05)), this.mats.tie);
    flick.position.set(-0.22, 0.26, K.BALL_R + 0.06);
    ball.add(flick);
    this.ballTie = flick;
    ball.position.y = K.BALL_R;
    ball.visible = false;
    this.ball = ball;
    this.group.add(ball);
  }

  /** Cosmetic flags read once at build; called by ArcadeState after construction. */
  applyCosmetics(flags) {
    if (flags.gold) this.mats.shoe.color.setHex(0xd9a441);
    if (flags.tie) this.mats.tie.color.setHex(0xd6303a);
    if (flags.pinstripe) { this.mats.suit.color.setHex(0x38406b); this.mats.suitD.color.setHex(0x272d52); }
    this.flameTrail = !!flags.flames;
  }

  /** Visual update — animation only, never touches physics. */
  render(dt) {
    const g = this.group;
    g.position.set(this.x, this.y, 0);

    const spd = this.speed;
    const ballMode = this.ballMode || this.spindash >= 0;
    this.stand.visible = !ballMode;
    this.ball.visible = ballMode;

    if (ballMode) {
      const rate = this.spindash >= 0 ? 26 : Math.max(9, spd * 2.4);
      this._spinPhase += rate * dt;
      this.ball.rotation.z = -this._spinPhase;
      for (let i = 0; i < this.ballArcs.length; i++) {
        this.ballArcs[i].rotation.z = (i / 3) * Math.PI * 2 - this._spinPhase * 1.7;
      }
      this.ball.rotation.y = 0;
      g.rotation.z = 0;
      return;
    }

    // Body lean: into the run, and along the slope when grounded.
    const lean = Math.max(-0.30, Math.min(0.30, -this.gsp * 0.0105));
    g.rotation.z = (this.grounded ? this.angle : 0) + lean * (this.facing >= 0 ? 1 : -1);
    this.stand.scale.set(1, this._squash, 1);
    this._squash += (1 - this._squash) * Math.min(1, dt * 12);
    this.stand.rotation.y = this.facing >= 0 ? 0 : Math.PI;

    const fast = this.grounded && spd > this.topSpeed * 0.72;
    this.runBlur.visible = fast;
    this.legF.visible = !fast;
    this.legB.visible = !fast;

    if (fast) {
      this._runPhase += spd * 3.4 * dt;
      this.runBlur.rotation.z = -this._runPhase;
      this.runBlur.position.y = 0.33;
      // Arms pinned back, Genesis dash pose.
      this.armF.rotation.x = 0;
      this.armF.rotation.z = -2.5;
      this.armB.rotation.z = -2.3;
    } else if (this.grounded) {
      this._runPhase += Math.max(1.2, spd * 2.1) * dt * (spd > 0.2 ? 1 : 0.35);
      const swing = Math.sin(this._runPhase * Math.PI) * Math.min(1, 0.35 + spd * 0.07);
      this.legF.rotation.z = swing * 0.95;
      this.legB.rotation.z = -swing * 0.95;
      this.armF.rotation.z = -swing * 0.85;
      this.armB.rotation.z = swing * 0.85;
      const bob = Math.abs(Math.sin(this._runPhase * Math.PI)) * Math.min(0.09, spd * 0.007);
      this.stand.position.y = bob;
    } else {
      // Airborne but not curled (post-spring / post-hit): flail.
      this._runPhase += 6 * dt;
      const s = Math.sin(this._runPhase * Math.PI);
      this.legF.rotation.z = 0.6 + s * 0.3;
      this.legB.rotation.z = -0.3 + s * 0.3;
      this.armF.rotation.z = -1.6 + s * 0.4;
      this.armB.rotation.z = -1.9 - s * 0.4;
      this.stand.position.y = 0;
    }

    // Tie streams behind at speed — cheap, and it sells the wind.
    if (this.tieMesh) {
      this.tieMesh.rotation.z = Math.min(1.25, spd * 0.055) * (this.facing >= 0 ? 1 : -1);
    }

    // Invulnerability flicker.
    this.stand.visible = this.invuln > 0 ? (Math.floor(this.invuln * 22) % 2 === 0) : true;
  }

  dispose() {
    for (const g of this._geos) g.dispose();
    for (const m of this._mats) m.dispose();
    this._geos.length = 0;
    this._mats.length = 0;
  }
}
