import * as THREE from 'three';
import { BUILDING_MAP, PLATE, TOP_FLOOR } from '../data/buildingMap.js';
import { DEV_MODE } from '../utils/constants.js';

// The ghost of the building around the current room — v2: ONE canonical
// tower. Every interior room has a floor number and a position on the
// shared plate (src/data/buildingMap.js), so the shell stays the same
// size and shape everywhere; the room shifts within it. Moving through
// the game reads as moving through a single skyscraper.
//
// Floor-aware: ghost floors above/below reflect where you actually are
// (penthouse has nothing above; the vault at B3 has nothing below).
// Exit ghosts align with the REAL mapped neighbor rooms when they share
// the floor. City-chapter rooms aren't in the map — no shell out there;
// the street uses CityBackdrop's street-level mode instead (P3).
//
// ── v3: THE PULSE (A2) ───────────────────────────────────────────────────
// The shell used to render always-on at opacities in the 0.013–0.06 range —
// permanently present and permanently invisible, paying draw calls to
// deliver nothing. It is now an EVENT: on room entry the blueprint fades in
// over 0.4s, holds bright for 1.2s, and fades out over 0.8s. The building
// acknowledges where you are, then goes back to minding its own business.
//
// Because it only appears for ~2.4s it can afford to be legible, so the
// peak opacities here are 5–8× the old always-on values. At rest the group
// is `visible = false` — zero draws, not "technically drawn at 1.3%".
//
//   pulse()        — fire the envelope (buildFor does this automatically)
//   setHold(bool)  — hold at full brightness: the elevator ride glows
//                    steadily, and a future pause-map can hold it open
//   update(dt)     — drive from Engine's frame loop

const STOREY = 3.4;
// Seam-light language: the ghost building is an architectural hologram —
// thin, dim, precise lines; never scaffolding. Desaturated cool slate
// (NOT cyan — saturated cyan verticals read synthwave against the sodium
// city, critic-flagged), a sodium-adjacent warmth for thresholds.
const BLUEPRINT = 0x59626e;
const WARM = 0xffc27d;

// Pulse envelope, seconds.
const FADE_IN = 0.4, HOLD = 1.2, FADE_OUT = 0.8;

// Peak opacities — what the shell looks like at envelope = 1. These read
// CLEARLY on purpose; the pulse earns the brightness by being brief.
// The outlines and columns are 1px lines / 7cm posts in a deliberately
// desaturated slate — at 0.3 they still vanished against the true-black
// city (verified in a forced-peak still). Transient geometry can afford
// near-full opacity; it's the COLOUR that keeps this a quiet hologram
// rather than a neon grid.
const PEAK = {
  slab:        0.10,    // basement fill, before depth fade
  outlineDown: 0.70,    // outlines below the floor, before depth fade
  outlineUp:   0.45,    // outlines above
  column:      0.55,
  threshold:   0.34,
};

const smoothstep = t => t * t * (3 - 2 * t);

export class BuildingShell {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
    this._mats = [];        // [{ mat, peak }]
    this._phase = 'idle';
    this._t = 0;
    this._level = 0;
    this._applied = -1;
    this._hold = false;
    // Dev/verification handle: ?dev&shell=1 pins the shell open so a still
    // can be shot mid-pulse without racing a 2.4s window.
    try {
      this._hold = DEV_MODE && new URLSearchParams(window.location.search).get('shell') === '1';
      if (DEV_MODE) window.__shell = this;   // same spirit as window.__explore
    } catch { /* headless */ }
  }

  clear() {
    if (this.group) {
      this.scene.remove(this.group);
      this.group.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
      this.group = null;
    }
    this._mats = [];
    this._applied = -1;
  }

  // Fire the pulse envelope from the top.
  pulse() {
    this._phase = 'in';
    this._t = 0;
  }

  // Hold the shell at full brightness (elevator ride, future pause-map).
  // Releasing it fades out over the normal FADE_OUT.
  setHold(on) {
    const next = !!on;
    if (next === this._hold) return;
    this._hold = next;
    if (!next) { this._phase = 'idle'; this._t = 0; }   // idle decays _level
  }

  isHeld() { return this._hold; }

  // Drive from Engine's frame loop.
  update(dt) {
    if (!this.group) return;
    if (this._hold) {
      this._level = Math.min(1, this._level + dt / FADE_IN);
    } else if (this._phase === 'in') {
      this._t += dt;
      this._level = smoothstep(Math.min(1, this._t / FADE_IN));
      if (this._t >= FADE_IN) { this._phase = 'hold'; this._t = 0; this._level = 1; }
    } else if (this._phase === 'hold') {
      this._t += dt;
      this._level = 1;
      if (this._t >= HOLD) { this._phase = 'out'; this._t = 0; }
    } else if (this._phase === 'out') {
      this._t += dt;
      this._level = smoothstep(Math.max(0, 1 - this._t / FADE_OUT));
      if (this._t >= FADE_OUT) { this._phase = 'idle'; this._level = 0; }
    } else if (this._level > 0) {
      // Released hold — decay at the normal fade-out rate.
      this._level = Math.max(0, this._level - dt / FADE_OUT);
    }
    this._applyLevel();
  }

  _applyLevel() {
    if (Math.abs(this._level - this._applied) < 0.002) return;
    this._applied = this._level;
    const lit = this._level > 0.002;
    this.group.visible = lit;   // at rest the shell costs nothing at all
    if (!lit) return;
    for (const e of this._mats) e.mat.opacity = e.peak * this._level;
  }

  // Register a material so the envelope drives it. `peak` is its opacity at
  // envelope = 1; it starts at 0 so nothing flashes on the build frame.
  _track(mat, peak) {
    mat.opacity = 0;
    this._mats.push({ mat, peak });
    return mat;
  }

  // Returns the plate center in world coords (for recentering the city
  // backdrop), or null when the room is outside the building.
  buildFor(roomData) {
    this.clear();
    if (!roomData) return null;
    const entry = BUILDING_MAP[roomData.id];
    if (!entry) return null;

    const { floor, offsetX, offsetZ } = entry;
    const group = new THREE.Group();
    group.name = 'building_shell';
    group.visible = false;

    // Plate placement: room tile (0,0) is world (0,0); the plate's origin
    // sits at (-offsetX, -offsetZ).
    const cx = -offsetX + PLATE.w / 2 - 0.5;
    const cz = -offsetZ + PLATE.d / 2 - 0.5;

    // How much building exists above and below this floor. The ground
    // floor shows NOTHING below — it sits on the street, and ghost
    // basements under it read as floating (Alex). Basement rooms keep
    // their own remaining depth.
    const above = Math.max(0, Math.min(2, TOP_FLOOR - floor));
    const below = floor === 0 ? 0
      : floor > 0 ? Math.min(6, floor + 3)
      : Math.max(0, 3 + floor);

    // ── Ghost floor slabs ───────────────────────────────────────────────
    // Fills get a room-shaped hole: translucent layers directly above or
    // below the playable floor shimmer against it (Alex's flicker note) —
    // the blueprint only exists OUTSIDE the room.
    // After rotation.x = -PI/2, shape (x, y) maps to world (x, -z).
    const px0 = -offsetX - 0.5;
    const pz0 = -offsetZ - 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(px0, -(pz0 + PLATE.d));
    shape.lineTo(px0 + PLATE.w, -(pz0 + PLATE.d));
    shape.lineTo(px0 + PLATE.w, -pz0);
    shape.lineTo(px0, -pz0);
    shape.closePath();
    const PAD = 0.8; // hole slightly larger than the room so nothing peeks at the wall line
    const hole = new THREE.Path();
    hole.moveTo(-0.5 - PAD, -(roomData.height - 0.5 + PAD));
    hole.lineTo(roomData.width - 0.5 + PAD, -(roomData.height - 0.5 + PAD));
    hole.lineTo(roomData.width - 0.5 + PAD, 0.5 + PAD);
    hole.lineTo(-0.5 - PAD, 0.5 + PAD);
    hole.closePath();
    shape.holes.push(hole);
    const slabGeo = new THREE.ShapeGeometry(shape);
    const edgeGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(PLATE.w, PLATE.d));
    const levels = [];
    for (let i = 1; i <= above; i++) levels.push(i);
    for (let i = 1; i <= below; i++) levels.push(-i);

    for (const level of levels) {
      const y = level * STOREY + (level > 0 ? 0.4 : 0);
      const depthFade = Math.max(0.25, 1 - (Math.abs(level) - 1) * 0.18);

      // Floors ABOVE the current one are outline-only and very faint —
      // filled slabs overhead read as a ceiling pressing down on the
      // room (Alex's playtest note). Below keeps the filled stack.
      if (level < 0) {
        const slab = new THREE.Mesh(slabGeo, this._track(new THREE.MeshBasicMaterial({
          color: BLUEPRINT, transparent: true,
          depthWrite: false, side: THREE.DoubleSide,
        }), PEAK.slab * depthFade));
        slab.rotation.x = -Math.PI / 2;
        // Shape coords are absolute world XZ — only the height moves
        slab.position.set(0, y, 0);
        group.add(slab);
      }

      // Outlines only on the two levels nearest the room — a deep stack
      // of glowing rectangles below the floor read as ground grid lines
      // (critic: flirts with the banned 80s-grid kitsch)
      if (Math.abs(level) <= 2) {
        const outline = new THREE.LineSegments(
          edgeGeo,
          this._track(new THREE.LineBasicMaterial({
            color: BLUEPRINT, transparent: true, depthWrite: false,
          }), (level < 0 ? PEAK.outlineDown : PEAK.outlineUp) * depthFade)
        );
        outline.rotation.x = -Math.PI / 2;
        outline.position.set(cx, y, cz);
        group.add(outline);
      }
    }

    // ── Corner columns spanning the visible shaft ───────────────────────
    if (levels.length > 0) {
      const topY = above * STOREY + 0.8;
      const botY = -below * STOREY;
      const colMat = this._track(new THREE.MeshBasicMaterial({
        color: BLUEPRINT, transparent: true, depthWrite: false,
      }), PEAK.column);
      // Thin precise seam-columns, not scaffolding posts
      const colGeo = new THREE.BoxGeometry(0.07, topY - botY, 0.07);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(cx + sx * PLATE.w / 2, (topY + botY) / 2, cz + sz * PLATE.d / 2);
        group.add(col);
      }
    }

    // ── Thresholds ──────────────────────────────────────────────────────
    // The old translucent "ghost neighbor" boxes and doorway-hint volumes
    // read as leftover debug/collision geometry in stills (critic verdict:
    // thread-killer) — deleted. Doors keep only a breath of warm light at
    // the threshold; the building shell's slabs and columns carry the
    // architecture.
    const w = roomData.width, h = roomData.height;
    const glowGeo = new THREE.PlaneGeometry(1.6, 2.0);
    const glowMat = this._track(new THREE.MeshBasicMaterial({
      color: WARM, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }), PEAK.threshold);
    for (const exit of (roomData.exits || [])) {
      let dx = 0, dz = 0;
      if (exit.z === 0) dz = -1;
      else if (exit.z === h - 1) dz = 1;
      else if (exit.x === 0) dx = -1;
      else if (exit.x === w - 1) dx = 1;
      else continue;

      // A breath of light at every threshold
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(exit.x + dx * 0.9, 1.0, exit.z + dz * 0.9);
      if (dx !== 0) glow.rotation.y = Math.PI / 2;
      group.add(glow);
    }

    this.scene.add(group);
    this.group = group;
    // Entering a room IS the pulse trigger — every path that loads a room
    // (walk, elevator, save load, dev fixture) comes through here, so no
    // caller has to remember to ask for it.
    this._level = 0;
    this._applied = -1;
    this.pulse();
    return { x: cx, z: cz };
  }
}
