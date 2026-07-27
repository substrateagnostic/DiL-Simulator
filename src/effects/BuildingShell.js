import * as THREE from 'three';
import { BUILDING_MAP, PLATE, TOP_FLOOR } from '../data/buildingMap.js';

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

const STOREY = 3.4;
// Seam-light language: the ghost building is an architectural hologram —
// thin, dim, precise lines; never scaffolding. Desaturated cool slate
// (NOT cyan — saturated cyan verticals read synthwave against the sodium
// city, critic-flagged), a sodium-adjacent warmth for thresholds.
const BLUEPRINT = 0x59626e;
const WARM = 0xffc27d;

export class BuildingShell {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
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
        // Whisper-quiet since the sRGB fix dropped the city to true
        // black — the blueprint dream must never read as glass sheets
        const slab = new THREE.Mesh(slabGeo, new THREE.MeshBasicMaterial({
          color: BLUEPRINT, transparent: true, opacity: 0.013 * depthFade,
          depthWrite: false, side: THREE.DoubleSide,
        }));
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
          new THREE.LineBasicMaterial({
            color: BLUEPRINT, transparent: true,
            opacity: (level < 0 ? 0.038 : 0.018) * depthFade, depthWrite: false,
          })
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
      const colMat = new THREE.MeshBasicMaterial({
        color: BLUEPRINT, transparent: true, opacity: 0.05, depthWrite: false,
      });
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
    for (const exit of (roomData.exits || [])) {
      let dx = 0, dz = 0;
      if (exit.z === 0) dz = -1;
      else if (exit.z === h - 1) dz = 1;
      else if (exit.x === 0) dx = -1;
      else if (exit.x === w - 1) dx = 1;
      else continue;

      // A breath of light at every threshold
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 2.0),
        new THREE.MeshBasicMaterial({ color: WARM, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide })
      );
      glow.position.set(exit.x + dx * 0.9, 1.0, exit.z + dz * 0.9);
      if (dx !== 0) glow.rotation.y = Math.PI / 2;
      group.add(glow);
    }

    this.scene.add(group);
    this.group = group;
    return { x: cx, z: cz };
  }
}
