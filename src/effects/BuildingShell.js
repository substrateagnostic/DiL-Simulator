import * as THREE from 'three';
import { BUILDING_MAP, PLATE, TOP_FLOOR } from '../data/buildingMap.js';
import { ROOMS } from '../data/rooms/index.js';

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
const BLUEPRINT = 0x53a8b6;
const WARM = 0xffd890;

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

    // How much building exists above and below this floor
    const above = Math.max(0, Math.min(2, TOP_FLOOR - floor));
    const below = floor >= 0 ? Math.min(6, floor + 3) : Math.max(0, 3 + floor);

    // ── Ghost floor slabs ───────────────────────────────────────────────
    const slabGeo = new THREE.PlaneGeometry(PLATE.w, PLATE.d);
    const edgeGeo = new THREE.EdgesGeometry(slabGeo);
    const levels = [];
    for (let i = 1; i <= above; i++) levels.push(i);
    for (let i = 1; i <= below; i++) levels.push(-i);

    for (const level of levels) {
      const y = level * STOREY + (level > 0 ? 0.4 : 0);
      const depthFade = Math.max(0.25, 1 - (Math.abs(level) - 1) * 0.18);

      const slab = new THREE.Mesh(slabGeo, new THREE.MeshBasicMaterial({
        color: BLUEPRINT, transparent: true, opacity: 0.05 * depthFade,
        depthWrite: false, side: THREE.DoubleSide,
      }));
      slab.rotation.x = -Math.PI / 2;
      slab.position.set(cx, y, cz);
      group.add(slab);

      const outline = new THREE.LineSegments(
        edgeGeo,
        new THREE.LineBasicMaterial({
          color: BLUEPRINT, transparent: true,
          opacity: 0.22 * depthFade,
        })
      );
      outline.rotation.x = -Math.PI / 2;
      outline.position.set(cx, y, cz);
      group.add(outline);
    }

    // ── Corner columns spanning the visible shaft ───────────────────────
    if (levels.length > 0) {
      const topY = above * STOREY + 0.8;
      const botY = -below * STOREY;
      const colMat = new THREE.MeshBasicMaterial({
        color: BLUEPRINT, transparent: true, opacity: 0.1, depthWrite: false,
      });
      const colGeo = new THREE.BoxGeometry(0.22, topY - botY, 0.22);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(cx + sx * PLATE.w / 2, (topY + botY) / 2, cz + sz * PLATE.d / 2);
        group.add(col);
      }
    }

    // ── Ghost neighbor rooms — the REAL ones, where the map knows them ──
    const ghostMat = new THREE.MeshBasicMaterial({
      color: WARM, transparent: true, opacity: 0.05,
      depthWrite: false, side: THREE.BackSide,
    });
    const ghostEdgeMat = new THREE.LineBasicMaterial({
      color: WARM, transparent: true, opacity: 0.15,
    });
    const w = roomData.width, h = roomData.height;
    const seenTargets = new Set();
    const seenDoorways = new Set();

    for (const exit of (roomData.exits || [])) {
      let dx = 0, dz = 0;
      if (exit.z === 0) dz = -1;
      else if (exit.z === h - 1) dz = 1;
      else if (exit.x === 0) dx = -1;
      else if (exit.x === w - 1) dx = 1;
      else continue;

      const target = BUILDING_MAP[exit.targetRoom];
      const targetRoom = ROOMS[exit.targetRoom];

      if (target && targetRoom && target.floor === floor && !seenTargets.has(exit.targetRoom)) {
        // Aligned ghost: the neighbor at its true mapped position
        seenTargets.add(exit.targetRoom);
        const gw = targetRoom.width, gd = targetRoom.height;
        const gx = (target.offsetX - offsetX) + gw / 2 - 0.5;
        const gz = (target.offsetZ - offsetZ) + gd / 2 - 0.5;
        const ghostGeo = new THREE.BoxGeometry(gw, 2.6, gd);
        const ghost = new THREE.Mesh(ghostGeo, ghostMat);
        ghost.position.set(gx, 1.3, gz);
        group.add(ghost);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(ghostGeo), ghostEdgeMat);
        edges.position.copy(ghost.position);
        group.add(edges);
      } else if (!target || target.floor !== floor) {
        // Different floor (stairwell/elevator) or unmapped: small warm
        // hint beyond the doorway so the door still goes somewhere
        const key = `${dx},${dz},${Math.round((dx !== 0 ? exit.z : exit.x) / 3)}`;
        if (seenDoorways.has(key)) continue;
        seenDoorways.add(key);
        const ghostGeo = new THREE.BoxGeometry(dx !== 0 ? 4.5 : 4.5, 2.6, 4.5);
        const ghost = new THREE.Mesh(ghostGeo, ghostMat);
        ghost.position.set(exit.x + dx * 3.4, 1.3, exit.z + dz * 3.4);
        group.add(ghost);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(ghostGeo), ghostEdgeMat);
        edges.position.copy(ghost.position);
        group.add(edges);
      }

      // A breath of light at every threshold
      const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 2.0),
        new THREE.MeshBasicMaterial({ color: WARM, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide })
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
