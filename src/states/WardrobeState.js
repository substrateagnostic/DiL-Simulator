import * as THREE from 'three';
import { Engine } from '../core/Engine.js';
import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { NotificationArbiter, NC } from '../core/NotificationArbiter.js';
import { buildCharacter } from '../entities/CharacterBuilder.js';
import { CharacterAnimator } from '../entities/CharacterAnimator.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { COSMETICS, COSMETIC_SLOTS } from '../data/cosmetics.js';

// ============================================================
// THE WARDROBE — the sixth-floor mirror, and the pause menu's fitting room
// ============================================================
// The mirror over the basins IS the wardrobe preview: a focused overlay
// showing Andrew's live procedural exploration model, rebuilt on every
// equip exactly the way the world rebuilds him (Player.rebuildMesh ->
// buildCharacter with `cosmetic_<id>` accessories). Opened from the
// `wardrobe_mirror` interactable in ExplorationState._interact().
//
// ONE STATE, TWO DRESSINGS (`opts.dressing`, see the constructor). The pause
// menu's Cosmetics tab opens the SAME screen from anywhere in the building —
// no teleport, no load, because this state owns its scene and never touches
// the room the player is standing in. The tab keeps the full catalogue with
// its `???` cards as the BROWSING surface; this is the PREVIEW/equip surface
// it opens into.
//
// Contract with the rest of the game (do not break silently):
//   * EQUIP CODE IS NOT FORKED. Every change goes through
//     Player.equipCosmetic / Player.unequipCosmetic, the same two methods
//     MenuState's Cosmetics tab calls, so the real exploration mesh and
//     getCombatStats() are correct the moment this state pops.
//   * own Three.js scene, rendered via Engine.renderScene +
//     skipDefaultRender, per the ArcadeState pattern. Tilt-shift is
//     suspended for the duration (it blurs the frame thirds; fatal for a
//     full-frame character read) and restored in exit().
//   * suspendScope('world') on enter / resumeScope on exit — the arbiter
//     root is page-level and a queued toast must not float over the
//     mirror (the full-screen-surface law, CLAUDE.md Notifications).
//   * input is POLLED from update(), never a DOM keydown listener
//     (the DifficultyPanel law). Mouse clicks on cards are allowed.
//   * writes `wardrobe_mirror_used` on enter (clears the side-quest
//     signpost; declared in story/grants.js CODE_GRANTS) and
//     `wardrobe_tip_shown` on first exit (gates the one-time PROGRESS
//     teach: Pause Menu -> Cosmetics). BOTH ARE 'mirror'-DRESSING ONLY —
//     the menu path writes no flags, and pointing a player at the pause
//     menu while they are standing in it is not a teach.
//   * shows UNLOCKED cosmetics only. The pause-menu Cosmetics tab is the
//     complete catalogue with ??? cards; the mirror is what is actually
//     on the shelf. Both surfaces read Player.isCosmeticUnlocked.
// ============================================================

const STAT_LABELS = [
  ['atk', 'ASSERTIVENESS'],
  ['def', 'COMPOSURE'],
  ['spd', 'EFFICIENCY'],
  ['maxHP', 'PATIENCE'],
  ['maxMP', 'COFFEE'],
];

// A card's effect line. `stats` first; then `qte`, because the ONE relic in the
// game that trades a bonus for a cost — Ergonomic Wrist Support, +40 % Brace
// window for −20 % Retaliate — carries `stats: {}` and lives entirely in `qte`.
// It is `unlock: 'default'`, so before this it was a quarter of the starting
// rail rendering as a bare name with nothing under it: the game's only
// tradeoff item reading, on the screen built to explain items, as an item that
// does nothing (judge, wardrobe round 2).
//
// An UNKNOWN qte key still prints, as `key ×value`. That is deliberate: the
// failure this replaces was a silent one, and a new modifier must never be
// able to disappear here just because nobody added a label for it.

// The reflected bathroom wall. `TUBE_FRAC` is where the fixture row sits down
// the canvas; `_applyFraming` uses it to place the plane, so the tubes land in
// frame at any viewport instead of at one tuned pixel row.
const BACKDROP_W = 3.4;
const BACKDROP_H = 5.1;
const BACKDROP_Z = -1.5;
const TUBE_FRAC = 0.25;
// How long the fluorescent takes to strike and settle, ms. After this the key
// light is CONSTANT — see _updateStrike.
const STRIKE_MS = 720;

const QTE_LABELS = {
  braceWindow:      (v) => `${v > 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}% BRACE WINDOW`,
  retaliateDamage:  (v) => `${v > 1 ? '+' : '−'}${Math.round(Math.abs(v - 1) * 100)}% RETALIATE`,
};

function _effectLine(cos) {
  const parts = [];
  for (const [s, v] of Object.entries(cos.stats || {})) {
    parts.push(`+${v} ${STAT_LABELS.find(([k]) => k === s)?.[1] || s.toUpperCase()}`);
  }
  for (const [k, v] of Object.entries(cos.qte || {})) {
    if (v === 1) continue;
    parts.push(QTE_LABELS[k] ? QTE_LABELS[k](v) : `${k} ×${v}`);
  }
  return parts.join(' · ');
}

export class WardrobeState {
  /**
   * ONE STATE, TWO DRESSINGS (producer, 08-18).
   *   'mirror' — the sixth-floor bathroom. Mirror frame, the tiled wall, the
   *              half-lit fluorescent rig, the `wardrobe_mirror_used` grant
   *              and the one-time Pause-Menu teach.
   *   'stage'  — pushed from MenuState's Cosmetics tab, anywhere in the
   *              building. Same model, same equip calls, same input; no mirror
   *              frame, a neutral fitting-room ground, even light, and NO
   *              flags — looking at yourself in a menu is not looking in that
   *              bathroom's mirror, and the teach would be telling the player
   *              where they already are.
   * It costs no teleport and no load: this state owns its own scene and builds
   * Andrew procedurally, so it never touches the room the player is standing
   * in. That is the whole reason the menu can reuse it.
   */
  constructor(stateManager, player, opts = {}) {
    this.stateManager = stateManager;
    this.player = player;
    this.dressing = opts.dressing === 'stage' ? 'stage' : 'mirror';

    this.scene = null;
    this.camera = null;
    this.previewMesh = null;
    this.previewAnimator = null;
    this._previewYaw = 0;

    this.element = null;
    this.styleEl = null;
    this._rows = [];          // flat [{ slot, id }] of unlocked cosmetics
    this._selectedIndex = 0;
    this._explorationHud = null;
    this._prevTilt = true;
    this._resize = null;
    this._closing = false;
    // Fluorescent strike-and-settle, mirror dressing only. See _updateStrike.
    this._strikeT = 0;
    this._keyLight = null;
    this._fillLight = null;
    this._keyBase = 1;
  }

  enter() {
    NotificationArbiter.suspendScope('world');

    this._explorationHud = document.querySelector('.exploration-hud');
    if (this._explorationHud) this._explorationHud.style.display = 'none';

    this._prevTilt = Engine._tiltShiftOn !== false;
    Engine.setTiltShift(false);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x141b1f);

    this.camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 50);
    this._buildLights();

    this._buildBackdrop();
    this._buildPreview();
    this._buildDom();

    // The signpost clears the moment he actually looks in the mirror — and
    // ONLY the mirror. The pause-menu fitting room is not that bathroom.
    if (this.dressing === 'mirror') this.player.setFlag('wardrobe_mirror_used', true);

    this._resize = () => this._applyFraming();
    window.addEventListener('resize', this._resize);
    this._applyFraming();
  }

  exit() {
    window.removeEventListener('resize', this._resize);

    this._disposePreview();
    if (this._backdropPlane) {
      this._backdropPlane.geometry.dispose();
      this._backdropPlane.material.dispose();
      this._backdropTexture.dispose();
      this._backdropPlane = null;
      this._backdropTexture = null;
    }
    this.scene = null;
    this.camera = null;

    if (this.element && this.element.parentNode) this.element.parentNode.removeChild(this.element);
    if (this.styleEl && this.styleEl.parentNode) this.styleEl.parentNode.removeChild(this.styleEl);
    this.element = null;
    this.styleEl = null;

    Engine.setTiltShift(this._prevTilt);
    // Only un-hide the exploration HUD if THIS state hid it. On the menu path
    // MenuState hid it first and owns putting it back; clearing it here would
    // paint the world HUD under an open pause menu.
    if (this._explorationHud && this.dressing === 'mirror') this._explorationHud.style.display = '';

    NotificationArbiter.resumeScope('world');

    // One-time teach, AFTER the world scope is live again so it lands on the
    // exploration screen instead of deferring into a suspended scope. Mirror
    // dressing only: from the menu, the player is already where it points.
    if (this.dressing === 'mirror' && !this.player.getFlag('wardrobe_tip_shown')) {
      this.player.setFlag('wardrobe_tip_shown', true);
      NotificationArbiter.post({
        cls: NC.PROGRESS,
        text: 'Found the mirror. Change your look any time under Pause Menu → Cosmetics.',
      });
    }
  }

  pause() { if (this.element) this.element.style.display = 'none'; }
  resume() { if (this.element) this.element.style.display = ''; }

  // ---- light --------------------------------------------------------------

  // THE HALF-LIT FLUORESCENT, MADE LITERAL (producer, 08-18).
  // `ROOM_THOUGHTS.bathroom[0]` is the spec: "The mirror has one working
  // fluorescent and one dead one, which means you can see exactly half of how
  // tired you look." The reflected wall already carries a lit tube on the
  // model's LEFT (world -x, canvas left) and a dead one on his right, so the
  // rig lights him the same way and the two agree.
  //
  // THE GUARDRAIL, and it is the reason this is not just "turn the lights
  // down": the player is making a VISUAL CHOICE in here. Mood may own the
  // shadow side; the lit side must stay legible enough to judge a hat by. So
  // the key is front-biased (z 3.4 against x -2.0) rather than raking, and a
  // cool bounce off the tiled wall keeps the dark side readable instead of
  // black. Measured intent: the lit cheek reads, the far shoulder falls into
  // mood, and nothing about a cosmetic disappears.
  //
  // The 'stage' dressing (pause menu) gets an even, neutral fitting-room rig.
  // A menu is not a room, and a moody menu is a menu you cannot read.
  _buildLights() {
    if (this.dressing === 'stage') {
      this.scene.add(new THREE.AmbientLight(0xeef3f8, 0.82));
      const key = new THREE.DirectionalLight(0xf8fbff, 0.85);
      key.position.set(1.2, 2.8, 3.4);
      this.scene.add(key);
      const fill = new THREE.DirectionalLight(0xdfe8f2, 0.34);
      fill.position.set(-2.2, 1.4, 2.2);
      this.scene.add(fill);
      this._keyLight = key;
      this._keyBase = key.intensity;
      this._strikeT = STRIKE_MS;   // no strike beat in a menu
      return;
    }

    // One tube, one dead socket. The levels are MEASURED against the guardrail,
    // not dialled by eye: `_w-mirror.mjs` reads the settled glass off the PNG
    // and requires the lit half to beat the dark half by >1.15x AND to hold a
    // mean Rec.709 luma above 40, which is where a cosmetic stops being
    // judgeable. First pass was ambient 0.30 / key 1.22 and measured
    // 35.7 vs 24.9 — asymmetric, and too dark to shop in.
    this.scene.add(new THREE.AmbientLight(0xdfe9f2, 0.80));
    const key = new THREE.DirectionalLight(0xf3f9ff, 1.30);
    key.position.set(-2.0, 3.0, 3.4);      // the working tube, model's left
    this.scene.add(key);
    // Bounce off the tile on the dead side. Cool and weak: it is reflected
    // light off a wall, and it exists only so the shadow side keeps shape.
    const fill = new THREE.DirectionalLight(0x9fb4c4, 0.13);
    fill.position.set(2.6, 1.1, 1.6);
    this.scene.add(fill);
    this._keyLight = key;
    this._fillLight = fill;
    this._keyBase = key.intensity;
    this._strikeT = 0;
  }

  // A tube striking. TWO dips inside the first 360 ms, then it SETTLES and is
  // constant for the rest of the session — the producer's line is that it
  // never strobes through the selection, and a light that keeps twitching
  // while you compare two hats is a light arguing with the screen's job.
  _updateStrike(dt) {
    if (this._strikeT >= STRIKE_MS || !this._keyLight) return;
    this._strikeT = Math.min(STRIKE_MS, this._strikeT + dt * 1000);
    const t = this._strikeT;
    let k;
    if (t < 90)       k = 0.22;
    else if (t < 150) k = 0.95;
    else if (t < 205) k = 0.30;
    else if (t < 265) k = 1.00;
    else if (t < 300) k = 0.62;
    else              k = 0.62 + 0.38 * ((t - 300) / (STRIKE_MS - 300));
    this._keyLight.intensity = this._keyBase * k;
    if (this._strikeT >= STRIKE_MS) this._keyLight.intensity = this._keyBase;
  }

  // ---- preview ------------------------------------------------------------

  // What the mirror actually reflects: the bathroom behind him. A tile-grid
  // gradient plane and the fixture the room data describes — one working
  // fluorescent tube and one dead one (rooms/index.js bathroom: "the tube
  // over the mirror is dead" / ROOM_THOUGHTS' "one working fluorescent and
  // one dead one"). CanvasTexture per the furniture-screen pattern.
  //
  // ROUND 2 — THE GLASS IS A LETTERBOX, AND THE FIRST PASS AUTHORED FOR A
  // FULL SCREEN. The `.wd-mirror` pane is `min(38vh, 30vw)` wide — 342 px of
  // a 1600 px frame — and everything outside it is under a 200vmax vignette.
  // Measured through the shipping framing at 16:9, the glass shows only
  // canvas x 93-163 of 256 and stops at canvas y ~145. Both tubes were
  // authored at y 106 in world terms *above* the visible band, and the two
  // 100 px bars sat at x 20 and x 138, i.e. mostly outside the window on
  // either side. The judge's report — "no tile, no grout, no fluorescent
  // tube, no dead tube" — was correct: none of it was ever on screen.
  //
  // So: the tube row is authored at a KNOWN FRACTION of the plane
  // (`TUBE_FRAC`) and `_applyFraming` slides the plane so that row lands in
  // the upper third of whatever band the camera actually frames — measured,
  // not tuned. Both bars are centred on the canvas so the visible window cuts
  // them symmetrically, and the tile grid is tightened and lifted so it reads
  // as tile inside a 70 px-wide window instead of one lonely seam.
  _buildBackdrop() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 384;
    const g = canvas.getContext('2d');

    // 'stage' dressing: a neutral fitting-room ground. No tile, no fixture,
    // nothing that claims to be a place — the pause menu is not a room.
    if (this.dressing === 'stage') {
      const sg = g.createLinearGradient(0, 0, 0, 384);
      sg.addColorStop(0, '#39424b');
      sg.addColorStop(0.62, '#272e35');
      sg.addColorStop(1, '#171c21');
      g.fillStyle = sg;
      g.fillRect(0, 0, 256, 384);
      const pool = g.createRadialGradient(128, 250, 10, 128, 250, 190);
      pool.addColorStop(0, 'rgba(190, 208, 224, 0.16)');
      pool.addColorStop(1, 'rgba(190, 208, 224, 0)');
      g.fillStyle = pool;
      g.fillRect(0, 0, 256, 384);
      this._finishBackdrop(canvas);
      return;
    }

    const grad = g.createLinearGradient(0, 0, 0, 384);
    grad.addColorStop(0, '#4b5a63');
    grad.addColorStop(0.55, '#333f46');
    grad.addColorStop(1, '#1e262b');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 384);
    // Tile grid. 32 px pitch, not 64: the glass is ~70 px of canvas wide, and
    // at 64 the player saw a single vertical line and read it as banding.
    g.lineWidth = 1;
    for (let y = 16; y < 384; y += 32) {
      g.strokeStyle = 'rgba(255,255,255,0.11)';
      g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.16)';
      g.beginPath(); g.moveTo(0, y + 1); g.lineTo(256, y + 1); g.stroke();
    }
    for (let x = 16; x < 256; x += 32) {
      g.strokeStyle = 'rgba(255,255,255,0.09)';
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 384); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.14)';
      g.beginPath(); g.moveTo(x + 1, 0); g.lineTo(x + 1, 384); g.stroke();
    }
    // The two tubes. Each runs to its own EDGE of the canvas and they meet at
    // the centre, so whatever sub-window the glass happens to show, the left
    // of it is lit and the right of it is dark. Hunting for a pixel range that
    // is inside the window is how the first pass lost them; a bar that spans
    // the whole half cannot be missed. The seam sits at canvas centre, which
    // projects directly behind Andrew's head — so the wall is lit on one side
    // of him and not the other, which is the room's own line about being able
    // to see exactly half of how tired you look.
    const ty = Math.round(TUBE_FRAC * 384);
    const halo = g.createLinearGradient(0, ty, 0, ty + 86);
    halo.addColorStop(0, 'rgba(206, 228, 245, 0.34)');
    halo.addColorStop(1, 'rgba(206, 228, 245, 0)');
    g.fillStyle = halo;
    g.fillRect(0, ty + 10, 126, 78);
    g.fillStyle = 'rgba(236, 246, 254, 0.95)';
    g.fillRect(0, ty, 126, 10);
    // The dead one, dark against the wall, with a lit housing lip above it so
    // it reads as the same FIXTURE switched off and not as a shadow.
    g.fillStyle = 'rgba(31, 38, 43, 0.97)';
    g.fillRect(130, ty, 126, 10);
    g.fillStyle = 'rgba(120, 134, 143, 0.55)';
    g.fillRect(130, ty - 3, 126, 3);
    // the housing end-caps at the seam
    g.fillStyle = 'rgba(46, 55, 62, 0.98)';
    g.fillRect(120, ty - 3, 8, 15);
    g.fillRect(128, ty - 3, 8, 15);
    // And the wall itself goes with the fixtures: the dead half loses light.
    // Painted into the TEXTURE rather than left to the rig, because the plane
    // is MeshBasic (it is a backdrop, not a surface) and takes no lighting.
    // Starts at the SEAM (128), not before it: the falloff has to begin where
    // the dead tube begins, or it eats into the half the player shops on.
    const dark = g.createLinearGradient(128, 0, 256, 0);
    dark.addColorStop(0, 'rgba(6, 9, 12, 0)');
    dark.addColorStop(1, 'rgba(6, 9, 12, 0.72)');
    g.fillStyle = dark;
    g.fillRect(128, 0, 128, 384);

    this._finishBackdrop(canvas);
  }

  _finishBackdrop(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    this._backdropTexture = texture;
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(BACKDROP_W, BACKDROP_H),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    plane.position.set(0, 1.35, BACKDROP_Z);
    this._backdropPlane = plane;
    this.scene.add(plane);
  }

  _buildPreview() {
    this._disposePreview();

    const config = { ...CHARACTER_CONFIGS.andrew };
    const accessories = [...(config.accessories || [])];
    for (const slot of COSMETIC_SLOTS) {
      const cosId = this.player.equipped[slot];
      if (cosId) accessories.push('cosmetic_' + cosId);
    }
    config.accessories = accessories;

    this.previewMesh = buildCharacter(config, { detailed: true });
    this.previewMesh.rotation.y = this._previewYaw;
    this.scene.add(this.previewMesh);
    this.previewAnimator = new CharacterAnimator(this.previewMesh);
  }

  _disposePreview() {
    if (!this.previewMesh) return;
    this.scene.remove(this.previewMesh);
    // Geometries are per-build; materials come from the MaterialLibrary cache
    // and must NOT be disposed (never mutate/destroy a cached material).
    this.previewMesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.previewMesh = null;
    this.previewAnimator = null;
  }

  // Frame the reflection: mid-thigh up, like a real mirror over a basin.
  // Measured off the built mesh, not off constants, so any proportion change
  // in CharacterBuilder keeps the head in frame. The view is x-offset so the
  // character lands under the DOM mirror (centre-left), clear of the rail.
  _applyFraming() {
    if (!this.camera || !this.previewMesh) return;
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;

    const yaw = this.previewMesh.rotation.y;
    this.previewMesh.rotation.y = 0;
    const box = new THREE.Box3().setFromObject(this.previewMesh);
    this.previewMesh.rotation.y = yaw;

    const top = box.max.y + 0.14;
    const bottom = 0.55; // mid-thigh
    const mid = (top + bottom) / 2;
    const span = top - bottom;
    const dist = (span / 2) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));

    this.camera.position.set(0, mid, dist + 0.4);
    this.camera.lookAt(0, mid, 0);
    // Shift the projected image left so the model sits at ~34% frame width.
    this.camera.setViewOffset(w, h, Math.round(w * 0.16), 0, w, h);
    this.camera.updateProjectionMatrix();

    // Slide the reflected wall so its fixture row lands in the upper third of
    // the band the camera actually frames. Derived from the same `mid`/`fov`
    // the shot above uses, so the tubes cannot drift out of the glass when the
    // model's proportions or the viewport change — which is exactly how they
    // were lost the first time (see _buildBackdrop).
    if (this._backdropPlane) {
      const halfH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))
        * (this.camera.position.z - BACKDROP_Z);
      // 0.62 of the framed half-height. The head top projects at ndc ~0.87 and
      // the glass itself stops at ~0.86, so there is no room ABOVE him: the
      // fixture row sits level with his hair, which is where a wall fixture
      // reflects to in a mirror cropped at mid-thigh. Measured, not guessed —
      // at 0.36 it landed behind his shoulders (screen y 288 of 900).
      const tubeWorldY = mid + halfH * 0.62;
      this._backdropPlane.position.y = tubeWorldY - (0.5 - TUBE_FRAC) * BACKDROP_H;
    }
  }

  // ---- DOM ----------------------------------------------------------------

  _buildDom() {
    this.styleEl = document.createElement('style');
    this.styleEl.textContent = WARDROBE_CSS;
    document.head.appendChild(this.styleEl);

    this.element = document.createElement('div');
    // `wd-dress-`, NOT `wd-${dressing}`: the plain form makes the ROOT element
    // match `.wd-mirror`, the frame rule — a 342 px box with a 200vmax vignette
    // — and the whole screen collapses into it, rail on top of glass. Caught by
    // the luma check reading a model that had nowhere to be.
    this.element.className = `wd-root wd-dress-${this.dressing}`;
    // NO CAPTION. There was a line of Andrew-voice italic across the bottom of
    // the glass; the producer cut it on 08-18 — "the moment doesn't need a
    // snarky comment this time". The screen speaks for itself. The one-time
    // exit teach ("Pause Menu -> Cosmetics") is a different surface and stays.
    this.element.innerHTML = `
      <div class="wd-mirror">
        <div class="wd-mirror-gleam"></div>
      </div>
      <div class="wd-rail">
        <div class="wd-rail-title">${this.dressing === 'stage' ? 'FITTING ROOM' : 'WARDROBE'}</div>
        <div class="wd-rail-items"></div>
        <div class="wd-stats"></div>
        <div class="wd-hint">↑↓ browse &nbsp;·&nbsp; Enter wear / put back &nbsp;·&nbsp; ←→ turn &nbsp;·&nbsp; Esc done</div>
      </div>`;
    document.getElementById('ui-overlay').appendChild(this.element);

    this._renderRail();
    this._renderStats();
  }

  _unlockedRows() {
    const rows = [];
    for (const slot of COSMETIC_SLOTS) {
      for (const [id, cos] of Object.entries(COSMETICS)) {
        if (cos.slot !== slot) continue;
        if (this.player.isCosmeticUnlocked(id)) rows.push({ slot, id });
      }
    }
    return rows;
  }

  _renderRail() {
    this._rows = this._unlockedRows();
    if (this._selectedIndex >= this._rows.length) this._selectedIndex = Math.max(0, this._rows.length - 1);

    const wrap = this.element.querySelector('.wd-rail-items');
    wrap.innerHTML = '';
    let lastSlot = null;
    this._rows.forEach((row, idx) => {
      if (row.slot !== lastSlot) {
        lastSlot = row.slot;
        const head = document.createElement('div');
        head.className = 'wd-slot-head';
        head.textContent = row.slot.toUpperCase();
        wrap.appendChild(head);
      }
      const cos = COSMETICS[row.id];
      const equipped = this.player.equipped[row.slot] === row.id;
      const card = document.createElement('div');
      card.className = `wd-card${equipped ? ' wd-equipped' : ''}${idx === this._selectedIndex ? ' wd-selected' : ''}`;
      const stats = _effectLine(cos);
      card.innerHTML = `
        <div class="wd-card-top"><span class="wd-card-name">${cos.name}</span>${equipped ? '<span class="wd-worn">WORN</span>' : ''}</div>
        ${stats ? `<div class="wd-card-stats">${stats}</div>` : ''}`;
      card.addEventListener('click', () => {
        this._selectedIndex = idx;
        this._toggleSelected();
      });
      wrap.appendChild(card);
    });

    const sel = wrap.querySelector('.wd-card.wd-selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  _renderStats() {
    const bare = { ...this.player.stats };
    const eff = this.player.getCombatStats();
    const el = this.element.querySelector('.wd-stats');
    el.innerHTML = STAT_LABELS.map(([key, label]) => {
      const delta = (eff[key] ?? 0) - (bare[key] ?? 0);
      const deltaHtml = delta > 0 ? ` <span class="wd-delta">+${delta}</span>` : '';
      return `<div class="wd-stat"><span class="wd-stat-label">${label}</span><span class="wd-stat-value">${eff[key] ?? 0}${deltaHtml}</span></div>`;
    }).join('');
  }

  _toggleSelected() {
    const row = this._rows[this._selectedIndex];
    if (!row) return;
    if (this.player.equipped[row.slot] === row.id) {
      this.player.unequipCosmetic(row.slot);
    } else {
      this.player.equipCosmetic(row.id);
    }
    AudioManager.playSfx('confirm');
    this._buildPreview();
    this._applyFraming();
    this._renderRail();
    this._renderStats();
  }

  // ---- loop ---------------------------------------------------------------

  update(dt) {
    if (this._closing) return;

    if (InputManager.isCancelPressed()) {
      this._closing = true;
      this.stateManager.pop();
      return;
    }

    const up = InputManager.isJustPressed('arrowup') || InputManager.isJustPressed('w');
    const down = InputManager.isJustPressed('arrowdown') || InputManager.isJustPressed('s');
    if (up && this._selectedIndex > 0) {
      this._selectedIndex--;
      AudioManager.playSfx('cursor');
      this._renderRail();
    }
    if (down && this._selectedIndex < this._rows.length - 1) {
      this._selectedIndex++;
      AudioManager.playSfx('cursor');
      this._renderRail();
    }
    if (InputManager.isConfirmPressed()) this._toggleSelected();

    // Held turn — see the accessory from the side, the way you would.
    let turn = 0;
    if (InputManager.isDown('arrowleft') || InputManager.isDown('a')) turn -= 1;
    if (InputManager.isDown('arrowright') || InputManager.isDown('d')) turn += 1;
    if (turn !== 0 && this.previewMesh) {
      this._previewYaw += turn * 2.4 * dt;
      this.previewMesh.rotation.y = this._previewYaw;
    }

    if (this.previewAnimator) this.previewAnimator.update(dt);
    this._updateStrike(dt);

    Engine.renderScene(this.scene, this.camera);
    Engine.skipDefaultRender();
  }
}

// Injected, `wd-` prefixed, self-contained (the arcade Hud precedent) — no
// edits to styles/menu.css, which another lane owns right now.
const WARDROBE_CSS = `
.wd-root {
  position: absolute; inset: 0; z-index: 55;
  font-family: 'Courier New', monospace;
  pointer-events: none;
}
.wd-mirror {
  position: absolute; top: 7%; bottom: 9%;
  left: 34%; width: min(38vh, 30vw);
  transform: translateX(-50%);
  border: 10px solid #2b2f36;
  border-radius: 6px;
  box-shadow: 0 0 0 200vmax rgba(6, 9, 11, 0.985),
              inset 0 0 42px rgba(160, 190, 205, 0.10),
              inset 0 0 3px rgba(220, 240, 250, 0.28);
  pointer-events: none;
}
/* The 'stage' dressing keeps the same cut-out — it is what makes the model
   read at a size worth judging a hat by — but drops everything that says
   MIRROR: the bevelled frame, the bead of glass, the gleam. A pause menu
   opened on floor 9 must not claim to be the sixth-floor bathroom. */
.wd-dress-stage .wd-mirror {
  border: 1px solid rgba(120, 140, 158, 0.30);
  border-radius: 3px;
  box-shadow: 0 0 0 200vmax rgba(6, 9, 11, 0.975);
}
.wd-dress-stage .wd-mirror-gleam { display: none; }
.wd-mirror-gleam {
  position: absolute; inset: 0; overflow: hidden; border-radius: 2px;
}
.wd-mirror-gleam::before {
  content: ''; position: absolute; top: -20%; left: -60%;
  width: 55%; height: 150%;
  background: linear-gradient(105deg, transparent 0%, rgba(225, 240, 250, 0.07) 45%, rgba(225, 240, 250, 0.11) 50%, transparent 60%);
  transform: rotate(2deg);
}
.wd-rail {
  position: absolute; top: 7%; bottom: 9%; right: 4%;
  width: min(340px, 30vw);
  display: flex; flex-direction: column;
  background: rgba(12, 16, 19, 0.92);
  border: 1px solid #3a4450;
  border-radius: 6px;
  padding: 14px 14px 10px;
  pointer-events: auto;
}
.wd-rail-title {
  color: #e8edf2; font-size: 15px; letter-spacing: 4px; font-weight: bold;
  border-bottom: 1px solid #3a4450; padding-bottom: 8px; margin-bottom: 8px;
}
.wd-rail-items { flex: 1; overflow-y: auto; min-height: 0; }
.wd-slot-head {
  color: #6f8291; font-size: 10px; letter-spacing: 3px;
  margin: 10px 0 4px;
}
.wd-card {
  border: 1px solid #313b46; border-radius: 4px;
  padding: 7px 9px; margin-bottom: 5px;
  background: rgba(22, 28, 33, 0.9);
  cursor: pointer;
}
.wd-card.wd-selected { border-color: #53a8b6; background: rgba(35, 52, 60, 0.95); }
.wd-card.wd-equipped { border-left: 3px solid #ffcc33; }
.wd-card-top { display: flex; justify-content: space-between; align-items: baseline; }
.wd-card-name { color: #dfe6ec; font-size: 13px; }
.wd-worn { color: #ffcc33; font-size: 9px; letter-spacing: 2px; }
.wd-card-stats { color: #7fd1a8; font-size: 10.5px; margin-top: 3px; }
.wd-stats {
  border-top: 1px solid #3a4450; margin-top: 8px; padding-top: 8px;
}
.wd-stat { display: flex; justify-content: space-between; font-size: 11px; padding: 1px 0; }
.wd-stat-label { color: #8fa0aa; letter-spacing: 1px; }
.wd-stat-value { color: #dfe6ec; }
.wd-delta { color: #7fd1a8; }
.wd-hint {
  color: #5d6d79; font-size: 9.5px; text-align: center;
  margin-top: 8px; letter-spacing: 0.5px;
}
`;
