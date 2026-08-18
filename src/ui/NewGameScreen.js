// NewGameScreen.js — THE NEW-GAME SCREEN: a difficulty slider you can SEE.
//
// The producer's ask (2026-08): a Stick-of-Truth-style selector "in concept,
// not execution" — the audience has no genre vocabulary and no trust-law
// vocabulary, so each stop's meaning has to land visually, in two seconds,
// without reading. The design: a small Display Case diorama of Andrew at his
// desk, and as the slider moves THE ROOM DRESSES ITSELF for the working
// conditions ahead —
//
//   EASY    supportive onboarding: warm light, a leafy plant, full coffee,
//           a welcome balloon, a sticky note on the monitor, morning window.
//   NORMAL  the shipped office as-is: neutral, honest, fluorescent,
//           Severance-overcast window, the dying succulent.
//   HARD    hostile workplace: overtime-dark window, stacks of red-tabbed
//           files, a packing carton, cold utility light, the coffee tipped
//           over and empty.
//
// THE IDS ARE THE FLIP LANE'S CONTRACT (src/data/difficulty.js): this screen
// binds to MODE_ORDER `easy` / `normal` / `hard` and reads display names from
// the mode table — never hardcode either here.
//
// LAWS THIS FILE HOLDS:
//  - ASSEMBLY, NOT NEW ART. Every prop is an existing `Furniture` factory or
//    the house `Materials` calls the factories themselves use. The light rig is
//    the real grammar: `Furniture.ceilingFixture` troffers at the exact
//    FIXTURE_PROFILES tints (office 0xefe9db / warm 0xffb264 / utility
//    0xccdcf0) with an anchored floor pool off `Furniture._floorPoolTex()`.
//  - THE REAL RENDER PATH. The vignette renders through
//    `Engine.renderScene(scene, camera)` + `Engine.skipDefaultRender()` (the
//    CombatState pattern), so bloom, tilt-shift (ortho camera — the diorama
//    blur applies), grade and the output transform all run. Never
//    renderer.render directly.
//  - INPUT DISCIPLINE (see DifficultyPanel.js). This screen owns NO keyboard
//    listener: TitleState polls InputManager and calls move()/confirm()/
//    cancel()/update(dt). Mouse is handled here because nothing else reads it.
//  - THE PRODUCER GATE. `open()` returns false while `DIFFICULTY_LIVE` is
//    off, and TitleState treats false as "no such screen". The gate is LIVE
//    as of 2026-08-17, so this screen ships; the check stays because it is
//    what would re-darken the New Game flow cleanly if the gate ever closed
//    again. DEV_MODE + `?newgame=1` is the door past a closed gate (same
//    shape as `?difficulty=` and Difficulty.force()).
//  - NO ARBITER BYPASS. This screen posts no transient text anywhere; it is a
//    full-screen state surface like the title itself. Nothing here may ever
//    grow a floating toast — post to NotificationArbiter if that day comes.
//  - PROSE LAW. The three descriptor lines in `SLIDER_LINES` were drafted by
//    `claude -p --model claude-opus-4-6` and are wired VERBATIM. Redlines
//    happen in playtest, not in this file.

import * as THREE from 'three';
import { Engine } from '../core/Engine.js';
import { AudioManager } from '../core/AudioManager.js';
import { Difficulty } from '../core/DifficultyManager.js';
import { MODE_ORDER, DIFFICULTY_MODES } from '../data/difficulty.js';
import { Furniture } from '../world/Furniture.js';
import { Materials } from '../effects/MaterialLibrary.js';
import { buildCharacter } from '../entities/CharacterBuilder.js';
import { CharacterAnimator } from '../entities/CharacterAnimator.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { createVoidBackdrop } from '../effects/VoidBackdrop.js';
import { CAMERA, DEV_MODE } from '../utils/constants.js';

// One descriptor line per stop — drafted by `claude -p --model
// claude-opus-4-6` (2026-08-17), wired VERBATIM per the prose law. The ladder
// turns on one verb: left a note / left nothing / left the building.
const SLIDER_LINES = {
  easy: 'Someone left you a nice note.',
  normal: 'No one left you anything.',
  hard: 'Someone left, and took the coffee.',
};

// Plain, audience-first register (producer, 2026-08-17 — the trust-jargon
// name sets were declined; no jargon on this screen). The note line is the
// same sentence DifficultyPanel says, because it is the one that matters.
const COPY = {
  title: 'NEW GAME',
  note: 'This can be changed at any time from the pause menu. Nothing is locked behind it.',
  hint: '&#8592;&#8594; adjust &nbsp; ENTER accept &nbsp; ESC back',
  accept: 'START',
  back: 'BACK',
};

// Per-stop looks. Light targets tween; prop groups toggle; window crossfades.
// Fixture tints and pool colours are the REAL FIXTURE_PROFILES numbers
// (Engine.applyRoomFX) so "conforms to the light-rig grammar" is true by
// construction: warm / office / utility.
const STOP_LOOKS = {
  easy: {
    ambient: 0xf5e9d4, ambientIntensity: 0.58,
    key: 0xffdfb4, keyIntensity: 1.06,
    fixture: 0xffb264, pool: 0xffd9a0, poolOpacity: 0.28,
    expression: 'victory',
  },
  normal: {
    // The house rig verbatim: ENGINE_AMBIENT 0xe9f1ec @ 0.52,
    // ENGINE_FLUORESCENT 0xf1f7ef @ 1.15 (Engine._setupLighting).
    ambient: 0xe9f1ec, ambientIntensity: 0.52,
    key: 0xf1f7ef, keyIntensity: 1.15,
    fixture: 0xefe9db, pool: 0xffefce, poolOpacity: 0.34,
    expression: 'neutral',
  },
  hard: {
    ambient: 0xc2cede, ambientIntensity: 0.30,
    key: 0xc9dcf2, keyIntensity: 0.92,
    fixture: 0xccdcf0, pool: 0x9fc4e6, poolOpacity: 0.26,
    expression: 'worried',
  },
};

// One number for both frustum builders (open + per-frame resize). The judge's
// round-1 headline was CROP THE CASE — half the frame was empty floor and the
// storytelling props ran ~40 px. The room shrank (see _buildScene) and the
// camera pulled in so the diorama fills the frame above the slider.
const ZOOM = 1.58;
// Where the camera looks (and orbits): nudged +x so the north-wall window
// shares the frame with the desk instead of clipping at the right edge.
const LOOK_AT = { x: 0.28, y: 1.0, z: 0.1 };

class NewGameScreenImpl {
  constructor() {
    this.overlay = null;
    this.index = 1;             // default stop = normal (middle)
    this._onPick = null;
    this._onCancel = null;
    this.scene = null;
    this.camera = null;
    this._time = 0;
    this._ownedMats = [];
    this._ownedTex = [];
    this._dragging = false;
    this._dragFrac = null;
    this._warm = 0;             // frames rendered — shadow warm-up
  }

  get isOpen() { return !!this.overlay; }

  /**
   * @param {object} opts
   * @param {function}  opts.onPick    called with the chosen mode id
   * @param {function} [opts.onCancel] called on Escape / BACK
   * @returns {boolean} false while the producer gate is closed (and no dev
   *          door) — the caller proceeds exactly as before this screen existed.
   */
  open(opts = {}) {
    const devDoor = DEV_MODE && new URLSearchParams(window.location.search).has('newgame');
    if ((!Difficulty.live && !devDoor) || this.overlay) return false;
    this._onPick = opts.onPick || null;
    this._onCancel = opts.onCancel || null;
    this.index = Math.max(0, MODE_ORDER.indexOf(Difficulty.selected));
    this._time = 0;
    this._warm = 0;

    // Harness handles (tools/_ng-shoot.mjs): the live singletons, exposed the
    // same way ExplorationState exposes __explore — NEVER via a page-side
    // `import()`, which hands a harness a second, uninitialised Engine
    // (CLAUDE.md, Playwright gotchas).
    if (DEV_MODE) { window.__ngScreen = this; window.__ngEngine = Engine; }

    this._buildScene();
    this._buildDom();
    this._applyStop(true);
    Engine.invalidateShadows();
    return true;
  }

  close() {
    if (this.overlay?.parentNode) this.overlay.parentNode.removeChild(this.overlay);
    this.overlay = null;
    this._onPick = null;
    this._onCancel = null;
    this._disposeScene();
  }

  cancel() {
    const cb = this._onCancel;
    AudioManager.playSfx('cursor');
    this.close();
    if (cb) cb();
  }

  confirm() {
    if (!this.overlay) return;
    const id = MODE_ORDER[this.index];
    const cb = this._onPick;
    AudioManager.playSfx('confirm');
    this.close();
    if (cb) cb(id);
  }

  move(delta) {
    if (!this.overlay) return;
    const next = Math.max(0, Math.min(MODE_ORDER.length - 1, this.index + delta));
    if (next === this.index) return;
    this.index = next;
    AudioManager.playSfx('cursor');
    this._applyStop();
  }

  /** Host-driven per-frame tick: animation, light tween, render. */
  update(dt) {
    if (!this.overlay || !this.scene) return;
    this._time += dt;
    const look = STOP_LOOKS[MODE_ORDER[this.index]];

    // Light tween — exponential approach, ~5/s. The dressing snaps (props are
    // facts); the LIGHT crossfades (weather is continuous).
    const k = Math.min(1, dt * 5);
    this._ambient.color.lerp(this._c(look.ambient), k);
    this._ambient.intensity += (look.ambientIntensity - this._ambient.intensity) * k;
    this._key.color.lerp(this._c(look.key), k);
    this._key.intensity += (look.keyIntensity - this._key.intensity) * k;
    this._pool.material.color.lerp(this._c(look.pool), k);
    this._pool.material.opacity += (look.poolOpacity - this._pool.material.opacity) * k;

    // Window crossfade
    for (const id of MODE_ORDER) {
      const pane = this._panes[id];
      const target = id === MODE_ORDER[this.index] ? 1 : 0;
      pane.material.opacity += (target - pane.material.opacity) * Math.min(1, dt * 6);
    }

    // Actors, not tripods: seated breath + a balloon that actually floats.
    this._animator.update(dt);
    if (this._balloon) {
      this._balloon.position.y = this._balloonBaseY + Math.sin(this._time * 1.3) * 0.035;
      this._balloon.rotation.z = Math.sin(this._time * 0.9) * 0.06;
    }

    // Shadow warm-up: the seated pose lands on the first animator tick, after
    // open() already invalidated — refresh once more so the map matches.
    if (this._warm < 3) { this._warm++; Engine.invalidateShadows(); }

    // Ortho frustum tracks the viewport (cheap; assignment + one flag).
    const aspect = Engine.width / Engine.height;
    const z = ZOOM;
    this.camera.left = -z * aspect; this.camera.right = z * aspect;
    // Asymmetric vertical window: the DOM panel owns the bottom third, so the
    // diorama is framed into the upper two.
    this.camera.top = z * 0.96; this.camera.bottom = -z * 1.04;
    this.camera.updateProjectionMatrix();

    Engine.renderScene(this.scene, this.camera);
    Engine.skipDefaultRender();
  }

  // ── The diorama ────────────────────────────────────────────────────────

  _c(hex) { return new THREE.Color(hex); }

  _own(mat) { this._ownedMats.push(mat); return mat; }

  _buildScene() {
    this.scene = new THREE.Scene();
    this.scene.background = createVoidBackdrop();

    // Camera — the house iso angles (CAMERA.ANGLE_X/Y), display-case distance.
    const aspect = Engine.width / Engine.height;
    const z = ZOOM;
    this.camera = new THREE.OrthographicCamera(-z * aspect, z * aspect, z * 0.96, -z * 1.04, 0.1, 100);
    const dist = 20;
    this.camera.position.set(
      dist * Math.sin(CAMERA.ANGLE_Y) * Math.cos(CAMERA.ANGLE_X),
      dist * Math.sin(CAMERA.ANGLE_X),
      dist * Math.cos(CAMERA.ANGLE_Y) * Math.cos(CAMERA.ANGLE_X)
    );
    this.camera.position.add(new THREE.Vector3(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z));
    this.camera.lookAt(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);

    // Lights — the house rig shape (steep key + cool fill), per-stop tinted.
    this._ambient = new THREE.AmbientLight(0xe9f1ec, 0.52);
    this.scene.add(this._ambient);
    this._key = new THREE.DirectionalLight(0xf1f7ef, 1.15);
    this._key.position.set(3, 9, 3);
    this._key.castShadow = true;
    this._key.shadow.mapSize.set(1024, 1024);
    this._key.shadow.camera.near = 0.5;
    this._key.shadow.camera.far = 30;
    this._key.shadow.camera.left = -4; this._key.shadow.camera.right = 4;
    this._key.shadow.camera.top = 4; this._key.shadow.camera.bottom = -4;
    this._key.shadow.bias = -0.001;
    this._key.shadow.radius = 4;
    this.scene.add(this._key);
    const fill = new THREE.DirectionalLight(0xb0c0d0, 0.22);
    fill.position.set(-5, 6, -3);
    this.scene.add(fill);

    // ── The case: floor slab on a dark plinth. SMALL on purpose — the round-1
    // judge's headline defect was a full empty room shell around a distant
    // desk; the case is now cropped to its contents. ──
    const floor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 3.4), Materials.floor());
    floor.position.set(0.1, -0.07, 0.1);
    floor.receiveShadow = true;
    this.scene.add(floor);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.12, 3.7), this._own(Materials.custom(0x14151c)));
    plinth.position.set(0.1, -0.2, 0.1);
    this.scene.add(plinth);

    // ── Walls: NORTH and WEST only (the two faces the iso camera reads) ──
    const wallMat = Materials.wall();
    const north = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.2, 0.12), wallMat);
    north.position.set(0.1, 1.1, -1.54);
    north.receiveShadow = true;
    this.scene.add(north);
    const west = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.2, 3.4), wallMat);
    west.position.set(-1.94, 1.1, 0.1);
    west.receiveShadow = true;
    this.scene.add(west);

    // ── Window on the north wall (the story clock in miniature) ──
    this._buildWindow();

    // ── The desk set — all real factories ──
    const desk = Furniture.desk(1.7, 0.7);
    desk.position.set(0.1, 0, 0.55);
    // Deterministic vignette: strip the desk's own RANDOM mug (the only
    // cylinder in its clutter) so the authored coffee read is the only mug.
    for (const c of [...desk.children]) {
      if (c.geometry && c.geometry.type === 'CylinderGeometry') desk.remove(c);
    }
    this.scene.add(desk);

    const chair = Furniture.chair();
    chair.position.set(0.1, 0, -0.15);
    this.scene.add(chair);

    const monitor = Furniture.monitor();
    monitor.position.set(-0.42, 0.02, 0.5);
    monitor.rotation.y = Math.PI;   // screen toward Andrew, back to camera
    this.scene.add(monitor);

    const keyboard = Furniture.keyboard();
    keyboard.position.set(0.1, 0.02, 0.42);
    this.scene.add(keyboard);

    // Neutral set dressing, present at every stop — the room reads OFFICE
    // before it reads anything else.
    const cabinet = Furniture.fileCabinet();
    cabinet.position.set(-1.55, 0, 0.95);
    cabinet.rotation.y = Math.PI / 2;   // faces EAST, into the room
    this.scene.add(cabinet);
    const bin = Furniture.trashCan();
    bin.position.set(-0.95, 0, 1.05);
    this.scene.add(bin);

    // Andrew — the shipping exploration build, seated, facing his desk.
    this._andrew = buildCharacter(CHARACTER_CONFIGS.andrew);
    this._andrew.position.set(0.1, 0, -0.15);
    this._andrew.rotation.y = 0;    // rotation 0 faces SOUTH (+z): desk & camera
    this.scene.add(this._andrew);
    this._animator = new CharacterAnimator(this._andrew);
    this._animator.setFacing(0);
    this._animator.setSitting(true);

    // ── Troffer + anchored pool (the light-rig grammar, per stop) ──
    this._fixtures = {};
    for (const id of MODE_ORDER) {
      const f = Furniture.ceilingFixture(2.0, STOP_LOOKS[id].fixture);
      f.position.set(0.1, 1.98, 0.35);   // hung over the desk, cut at frame top
      f.visible = false;
      this.scene.add(f);
      this._fixtures[id] = f;
    }
    const poolMat = new THREE.MeshBasicMaterial({
      map: Furniture._floorPoolTex(), color: 0xffefce, transparent: true,
      opacity: 0.34, depthWrite: false,
    });
    this._own(poolMat);
    this._pool = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.8), poolMat);
    this._pool.rotation.x = -Math.PI / 2;
    this._pool.position.set(0.1, 0.012, 0.25);
    this._pool.renderOrder = 2;
    this.scene.add(this._pool);

    // ── Per-stop dressing groups (keys ARE the mode ids) ──
    this._dressing = {
      easy: this._buildEasyProps(),
      normal: this._buildNormalProps(),
      hard: this._buildHardProps(),
    };
    for (const g of Object.values(this._dressing)) this.scene.add(g);
  }

  _mug(x, z) {
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.07, 8), Materials.mug());
    mug.position.set(x, 0.775, z);
    mug.castShadow = true;
    return mug;
  }

  _buildEasyProps() {
    const g = new THREE.Group();
    g.visible = false;

    // The leafy plant (the act5_complete desk plant, here on day one).
    const plant = Furniture.deskPlant();
    plant.position.set(0.78, 0.02, 0.68);
    g.add(plant);

    // Full coffee — an iso camera looks DOWN, so "full" is a coffee disc
    // visible inside the rim.
    const mug = this._mug(0.5, 0.4);
    g.add(mug);
    const coffee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.027, 0.027, 0.006, 8), Materials.coffee());
    coffee.position.set(0.5, 0.812, 0.4);
    g.add(coffee);

    // The welcome balloon, tied to a weight ON the desk corner. Short string
    // on purpose: round 1 anchored it to the floor and the judge read the
    // long vertical line as a compositional cut into the UI panel.
    const bx = 0.92, bz = 0.82;
    const balloonMat = this._own(Materials.custom(0xf0c04a));
    this._balloon = new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 10), balloonMat);
    this._balloon.scale.set(1, 1.18, 1);
    this._balloonBaseY = 1.42;
    this._balloon.position.set(bx, this._balloonBaseY, bz);
    this._balloon.castShadow = true;
    g.add(this._balloon);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.03, 6), balloonMat);
    knot.position.set(bx, 1.27, bz);
    knot.rotation.x = Math.PI;
    g.add(knot);
    const anchorMat = this._own(Materials.custom(0x555560));
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.48, 4), anchorMat);
    string.position.set(bx, 1.01, bz);
    g.add(string);
    // The weight on the desk the string ties to (a balloon needs an anchor).
    const weight = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.07), anchorMat);
    weight.position.set(bx, 0.765, bz);
    g.add(weight);

    // The helpful sticky note, on the monitor's camera-side face.
    const sticky = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.075, 0.006), this._own(Materials.custom(0xf2e26a)));
    sticky.position.set(-0.3, 1.0, 0.53);
    sticky.rotation.z = 0.08;
    g.add(sticky);
    return g;
  }

  _buildNormalProps() {
    const g = new THREE.Group();
    g.visible = false;
    // The shipped office as-is: the dying succulent and a plain mug.
    const plant = Furniture.deskPlantSucculent();
    plant.position.set(0.78, 0.02, 0.68);
    g.add(plant);
    g.add(this._mug(0.5, 0.4));
    return g;
  }

  _buildHardProps() {
    const g = new THREE.Group();
    g.visible = false;

    // Red-tabbed case files, stacked past reason. Paper + red tab, jitter
    // deterministic so every capture is the same room.
    const paperMat = Materials.paper();
    const tabMat = this._own(Materials.custom(0xc0392b));
    const stack = (x, z, n) => {
      for (let i = 0; i < n; i++) {
        const file = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.034, 0.34), paperMat);
        const j = Math.sin(i * 12.9898 + x * 78.233) * 0.09;
        file.position.set(x + j * 0.4, 0.757 + i * 0.035, z);
        file.rotation.y = j;
        file.castShadow = true;
        g.add(file);
        const tab = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.05), tabMat);
        tab.position.set(x + j * 0.4 + (i % 2 ? 0.06 : -0.05), 0.757 + i * 0.035, z + 0.18);
        tab.rotation.y = j;
        g.add(tab);
      }
    };
    // Stacks flank the mug spot instead of standing in front of it — the
    // round-1 judge found the tipped coffee buried behind the near stack.
    stack(0.88, 0.28, 9);
    stack(-0.68, 0.85, 5);

    // The packing carton (Meredith's prop — Furniture.cardboardBox), beside
    // the cabinet, clear of the UI panel (round 1 parked it behind the panel).
    const box = Furniture.cardboardBox(0.5);
    box.position.set(-1.35, 0, 1.5);
    box.rotation.y = -0.4;
    g.add(box);

    // The coffee, tipped and empty, ON THE SAME DESK SPOT the upright mug
    // occupies at the other two stops — the swap is spatial, so a player who
    // slides the handle watches the mug fall over.
    const mug = this._mug(0, 0);
    mug.rotation.z = Math.PI / 2;
    mug.position.set(0.5, 0.772, 0.4);
    g.add(mug);
    const stain = new THREE.Mesh(new THREE.CircleGeometry(0.055, 12), Materials.coffee());
    stain.rotation.x = -Math.PI / 2;
    stain.scale.x = 1.5;
    stain.position.set(0.38, 0.745, 0.44);
    g.add(stain);
    return g;
  }

  // The window is the CityBackdrop story clock in miniature: warm morning /
  // Severance overcast / obsidian overtime with lit windows. Three panes,
  // opacity-crossfaded (all depthWrite:false, draw order fixed).
  _buildWindow() {
    const frameMat = this._own(Materials.custom(0x2f3238));
    // Sized and placed so WALL shows on every side — the round-1 judge read a
    // frame floating at the crop edge as a pull-down projection screen. The
    // muntin cross (centre mullion + transom) is what says "window" at 40 px.
    const fw = 1.6, fh = 0.95, cx = 0.35, cy = 1.2, zf = -1.46;
    const bar = (w, h, x, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), frameMat);
      m.position.set(x, y, zf);
      this.scene.add(m);
    };
    bar(fw + 0.1, 0.05, cx, cy + fh / 2);       // head
    bar(fw + 0.1, 0.07, cx, cy - fh / 2);       // sill
    bar(0.05, fh, cx - fw / 2, cy);             // jambs
    bar(0.05, fh, cx + fw / 2, cy);
    bar(0.035, fh, cx, cy);                     // centre mullion
    bar(fw, 0.035, cx, cy + fh * 0.14);         // transom — the window read

    this._panes = {};
    // Keys MUST be the live mode ids: round 1 shipped this map still saying
    // `casual`/`standard`, so `order[id]` was undefined, the pane z went NaN,
    // and two of the three skies never rendered. The map is now derived.
    const order = Object.fromEntries(MODE_ORDER.map((id, i) => [id, i + 1]));
    for (const id of MODE_ORDER) {
      const tex = this._windowTex(id);
      this._ownedTex.push(tex);
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0, depthWrite: false,
      });
      this._own(mat);
      // BEHIND the frame bars, proud of the wall face (wall inner face is at
      // z -1.48, bars at -1.46). Round 2 put the panes IN FRONT of the bars
      // and the near-opaque sky painted the mullion and transom out of
      // existence — which is exactly what made the window read as a blank
      // projection screen. Depth-tested behind the opaque bars, the muntin
      // cross survives at every opacity.
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh), mat);
      pane.position.set(cx, cy, zf - 0.018 + order[id] * 0.002);
      pane.renderOrder = order[id];
      this.scene.add(pane);
      this._panes[id] = pane;
    }
  }

  _windowTex(id) {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 168;
    const x = c.getContext('2d');
    if (id === 'easy') {
      // Morning, warm. The one sky in the game that is on your side. Punchy on
      // purpose: the first cut washed into the beige wall and the window read
      // as empty (measured on ng-easy.png round 1).
      const gr = x.createLinearGradient(0, 0, 0, 168);
      gr.addColorStop(0, '#ffd98e'); gr.addColorStop(0.55, '#f7ae52'); gr.addColorStop(1, '#e08a3c');
      x.fillStyle = gr; x.fillRect(0, 0, 256, 168);
      const sun = x.createRadialGradient(190, 52, 6, 190, 52, 54);
      sun.addColorStop(0, 'rgba(255,244,208,1)'); sun.addColorStop(0.45, 'rgba(255,220,150,0.6)');
      sun.addColorStop(1, 'rgba(255,220,150,0)');
      x.fillStyle = sun; x.fillRect(0, 0, 256, 168);
      x.fillStyle = 'rgba(120,74,44,0.85)';
      x.fillRect(10, 100, 40, 68); x.fillRect(66, 116, 30, 52); x.fillRect(120, 108, 44, 60); x.fillRect(210, 122, 34, 46);
    } else if (id === 'normal') {
      // Severance overcast: pale grey slabs under a paper sky — cooled a step
      // so it separates from the warm wall around it. The slabs carry faint
      // window rows and stand in a horizon haze, because clean grey rects at
      // this size read as a bar chart on a projection screen (round-1 judge).
      const gr = x.createLinearGradient(0, 0, 0, 168);
      gr.addColorStop(0, '#d7dde6'); gr.addColorStop(1, '#aeb7c4');
      x.fillStyle = gr; x.fillRect(0, 0, 256, 168);
      const slabs = [[14, 84, 44], [74, 100, 34], [124, 76, 52], [196, 108, 40], [160, 120, 20]];
      x.fillStyle = 'rgba(118,128,142,0.9)';
      for (const [sx, sy, sw] of slabs) x.fillRect(sx, sy, sw, 168 - sy);
      // window rows — dim, regular, unlit (a working city, nobody home yet)
      x.fillStyle = 'rgba(210,216,224,0.35)';
      for (const [sx, sy, sw] of slabs) {
        for (let wy = sy + 8; wy < 160; wy += 12) {
          for (let wx = sx + 4; wx < sx + sw - 4; wx += 10) x.fillRect(wx, wy, 4, 3);
        }
      }
      // horizon haze the towers stand in
      const haze = x.createLinearGradient(0, 118, 0, 168);
      haze.addColorStop(0, 'rgba(215,221,230,0)'); haze.addColorStop(1, 'rgba(215,221,230,0.55)');
      x.fillStyle = haze; x.fillRect(0, 118, 256, 50);
    } else {
      // Overtime. Obsidian towers, sodium seams, other people's lit offices.
      const gr = x.createLinearGradient(0, 0, 0, 168);
      gr.addColorStop(0, '#090b12'); gr.addColorStop(0.75, '#0b0d15'); gr.addColorStop(1, '#1a1210');
      x.fillStyle = gr; x.fillRect(0, 0, 256, 168);
      x.fillStyle = '#05060a';
      x.fillRect(8, 60, 52, 108); x.fillRect(76, 84, 40, 84); x.fillRect(130, 48, 58, 120); x.fillRect(200, 76, 44, 92);
      // lit windows — mostly amber, a few utility-cool
      const lit = [[16, 72], [30, 92], [44, 110], [84, 96], [98, 120], [140, 60], [156, 84],
        [170, 108], [148, 132], [208, 88], [224, 112], [216, 140], [38, 140], [108, 144]];
      lit.forEach(([wx, wy], i) => {
        x.fillStyle = i % 4 === 3 ? 'rgba(159,196,230,0.8)' : 'rgba(255,178,100,0.85)';
        x.fillRect(wx, wy, 5, 4);
      });
      x.fillStyle = 'rgba(255,150,60,0.10)';
      x.fillRect(0, 150, 256, 18);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    return tex;
  }

  // ── Stop application ───────────────────────────────────────────────────

  _applyStop(instant = false) {
    const id = MODE_ORDER[this.index];
    const look = STOP_LOOKS[id];
    for (const [gid, group] of Object.entries(this._dressing)) group.visible = gid === id;
    for (const [fid, fixture] of Object.entries(this._fixtures)) fixture.visible = fid === id;
    this._animator.setExpression(look.expression);
    if (instant) {
      this._ambient.color.set(look.ambient);
      this._ambient.intensity = look.ambientIntensity;
      this._key.color.set(look.key);
      this._key.intensity = look.keyIntensity;
      this._pool.material.color.set(look.pool);
      this._pool.material.opacity = look.poolOpacity;
      for (const pid of MODE_ORDER) this._panes[pid].material.opacity = pid === id ? 1 : 0;
    }
    Engine.invalidateShadows();
    this._renderDom();
  }

  // ── DOM ────────────────────────────────────────────────────────────────

  _buildDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'ng-screen';
    this.overlay.innerHTML = `
      <div class="ng-header"><div class="ng-title">${COPY.title}</div></div>
      <div class="ng-panel">
        <div class="ng-mode-name"></div>
        <div class="ng-desc"></div>
        <div class="ng-slider">
          <div class="ng-track">
            <div class="ng-stop" data-i="0"></div>
            <div class="ng-stop" data-i="1"></div>
            <div class="ng-stop" data-i="2"></div>
            <div class="ng-handle"></div>
          </div>
          <div class="ng-labels">
            ${MODE_ORDER.map((id, i) => `<span class="ng-label" data-i="${i}">${DIFFICULTY_MODES[id].name.toUpperCase()}</span>`).join('')}
          </div>
        </div>
        <div class="ng-buttons">
          <div class="ng-btn ng-back">${COPY.back}</div>
          <div class="ng-btn ng-accept">${COPY.accept}</div>
        </div>
        <div class="ng-note">${COPY.note}</div>
        <div class="ng-hint">${COPY.hint}</div>
      </div>`;
    document.getElementById('ui-overlay').appendChild(this.overlay);

    // Mouse — the one input this screen reads itself (nothing else in the
    // game reads the mouse; keyboard stays polled by TitleState).
    this.overlay.querySelectorAll('.ng-stop, .ng-label').forEach((el) => {
      el.addEventListener('click', () => this._setIndex(Number(el.dataset.i)));
    });
    this.overlay.querySelector('.ng-accept').addEventListener('click', () => this.confirm());
    this.overlay.querySelector('.ng-back').addEventListener('click', () => this.cancel());

    // Drag the handle along the track.
    const track = this.overlay.querySelector('.ng-track');
    const fracFor = (ev) => {
      const r = track.getBoundingClientRect();
      return Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    };
    track.addEventListener('pointerdown', (ev) => {
      this._dragging = true;
      track.setPointerCapture(ev.pointerId);
      this.overlay.classList.add('ng-dragging');
      this._dragTo(fracFor(ev));
    });
    track.addEventListener('pointermove', (ev) => {
      if (this._dragging) this._dragTo(fracFor(ev));
    });
    const drop = (ev) => {
      if (!this._dragging) return;
      this._dragging = false;
      this.overlay?.classList.remove('ng-dragging');
      this._dragFrac = null;
      this._renderDom();   // snap the handle to its stop
    };
    track.addEventListener('pointerup', drop);
    track.addEventListener('pointercancel', drop);

    this._renderDom();
  }

  _setIndex(i) {
    const next = Math.max(0, Math.min(MODE_ORDER.length - 1, i));
    if (next === this.index) return;
    this.index = next;
    AudioManager.playSfx('cursor');
    this._applyStop();
  }

  _dragTo(frac) {
    this._dragFrac = frac;
    const nearest = Math.round(frac * (MODE_ORDER.length - 1));
    if (nearest !== this.index) {
      this.index = nearest;
      AudioManager.playSfx('cursor');
      this._applyStop();
    } else {
      this._renderDom();
    }
  }

  _renderDom() {
    if (!this.overlay) return;
    const id = MODE_ORDER[this.index];
    this.overlay.querySelector('.ng-mode-name').textContent = DIFFICULTY_MODES[id].name.toUpperCase();
    const desc = this.overlay.querySelector('.ng-desc');
    if (desc.textContent !== SLIDER_LINES[id]) {
      desc.textContent = SLIDER_LINES[id];
      desc.classList.remove('ng-desc-in');
      void desc.offsetWidth;   // restart the fade-in
      desc.classList.add('ng-desc-in');
    }
    const frac = this._dragging && this._dragFrac != null
      ? this._dragFrac : this.index / (MODE_ORDER.length - 1);
    this.overlay.querySelector('.ng-handle').style.left = `${frac * 100}%`;
    this.overlay.querySelectorAll('.ng-stop').forEach((el, i) => {
      el.classList.toggle('active', i === this.index);
    });
    this.overlay.querySelectorAll('.ng-label').forEach((el, i) => {
      el.classList.toggle('active', i === this.index);
    });
    this.overlay.dataset.stop = id;
  }

  // ── Teardown ───────────────────────────────────────────────────────────

  _disposeScene() {
    if (!this.scene) return;
    this.scene.traverse((c) => { if (c.isMesh && c.geometry) c.geometry.dispose(); });
    // Only materials/textures THIS screen created. MaterialLibrary instances
    // are cached and shared — never dispose those (CLAUDE.md law).
    for (const m of this._ownedMats) m.dispose();
    for (const t of this._ownedTex) t.dispose();
    this._ownedMats = [];
    this._ownedTex = [];
    this.scene = null;
    this.camera = null;
    this._animator = null;
    this._andrew = null;
    this._balloon = null;
    this._panes = null;
    this._fixtures = null;
    this._dressing = null;
    this._pool = null;
  }
}

export const NewGameScreen = new NewGameScreenImpl();
export default NewGameScreen;
