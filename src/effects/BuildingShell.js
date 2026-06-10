import * as THREE from 'three';

// The ghost of the building around the current room. Translucent floor
// slabs stacked above and below, blueprint corner columns, and a dim warm
// "room" glowing beyond every exit doorway — so no door ever leads to
// nothing, and no room ever floats alone.
//
// Rebuilt per room load (RoomManager). City-chapter rooms skip it: those
// are other buildings, and the street is nobody's floor plan.

const SKIP_ROOMS = new Set([
  'city_street', 'transit_bus', 'records_hall', 'luckys_diner', 'old_branch', 'old_vault',
]);

const STOREY = 3.4;        // vertical distance between ghost floors
const MARGIN = 5;          // how far the tower extends past the room
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

  buildFor(roomData) {
    this.clear();
    if (!roomData || SKIP_ROOMS.has(roomData.id)) return;

    const w = roomData.width;
    const h = roomData.height;
    const group = new THREE.Group();
    group.name = 'building_shell';

    const fw = w + MARGIN * 2;   // tower footprint
    const fh = h + MARGIN * 2;
    const cx = (w - 1) / 2;      // room center in world units
    const cz = (h - 1) / 2;

    // ── Ghost floor slabs — two above, and all the way down to the
    // city's street level so the tower has real depth below you ────────
    const slabGeo = new THREE.PlaneGeometry(fw, fh);
    const edgeGeo = new THREE.EdgesGeometry(slabGeo);
    const LEVELS = [2, 1, -1, -2, -3, -4, -5, -6]; // -6 ≈ tower bases (~ -20)

    for (const level of LEVELS) {
      const y = level * STOREY + (level > 0 ? 0.4 : 0); // upper floors clear the walls
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

    // ── Corner columns spanning the full ghost tower ───────────────────
    const topY = 2 * STOREY + 0.8;
    const botY = -6 * STOREY;
    const colMat = new THREE.MeshBasicMaterial({
      color: BLUEPRINT, transparent: true, opacity: 0.1, depthWrite: false,
    });
    const colGeo = new THREE.BoxGeometry(0.22, topY - botY, 0.22);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.set(cx + sx * fw / 2, (topY + botY) / 2, cz + sz * fh / 2);
      group.add(col);
    }

    // ── Ghost rooms beyond each exit — the door goes somewhere ─────────
    const ghostMat = new THREE.MeshBasicMaterial({
      color: WARM, transparent: true, opacity: 0.055,
      depthWrite: false, side: THREE.BackSide, // glow seen from inside
    });
    const ghostEdgeMat = new THREE.LineBasicMaterial({
      color: WARM, transparent: true, opacity: 0.16,
    });
    const seen = new Set();
    for (const exit of (roomData.exits || [])) {
      // Direction the exit leaves the room
      let dx = 0, dz = 0;
      if (exit.z === 0) dz = -1;
      else if (exit.z === h - 1) dz = 1;
      else if (exit.x === 0) dx = -1;
      else if (exit.x === w - 1) dx = 1;
      else continue;

      // One ghost room per doorway cluster (adjacent exit tiles share one)
      const key = `${dx},${dz},${Math.round((dx !== 0 ? exit.z : exit.x) / 3)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const gw = 4.5, gh = 2.6, gd = 4.5;
      const ghostGeo = new THREE.BoxGeometry(
        dx !== 0 ? gd : gw, gh, dz !== 0 ? gd : gw
      );
      const ghost = new THREE.Mesh(ghostGeo, ghostMat);
      ghost.position.set(
        exit.x + dx * (gd / 2 + 1.2),
        gh / 2,
        exit.z + dz * (gd / 2 + 1.2)
      );
      group.add(ghost);

      const ghostEdges = new THREE.LineSegments(new THREE.EdgesGeometry(ghostGeo), ghostEdgeMat);
      ghostEdges.position.copy(ghost.position);
      group.add(ghostEdges);

      // A breath of light at the threshold
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
  }
}
