// One-off: identify the tall black slab standing near the executive floor's
// conference table in every shot of that room (it is in the A2 audit's own
// baseline D1 plate too, so it predates the staging lane).
//
// RESOLVED 2026-08-04: it is `elevatorDoors` at (8,11) on the SOUTH wall, NOT a
// `building_shell` column. It stayed at opacity 1.0 while the wall it is bolted
// to faded to 0.16, so it occluded Andrew for the seated act of `secret_ending`.
// Fixed in `Room._registerWallProp` + `ExplorationState._updateWallFade`.
//
// HANDOFF TO THE LEVEL LANE: the `building_shell` columns are a SEPARATE, still
// open question — they are the vertical bars visible outside the room in the
// wide plates. Nothing in this lane touched them; if they need to move, that is
// a level/architecture call, not a wall-fade one.
import { chromium } from 'playwright';

const PORT = process.argv[2] || '5177';
(async () => {
  const b = await chromium.launch({ headless: false, args: ['--use-gl=angle'] });
  const p = await (await b.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
  await p.goto(`http://localhost:${PORT}/?dev&fixture=act1&hud=0`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__shotReady === true, { timeout: 40000 });
  await p.evaluate(() => { window.__explore._loadRoom('executive_floor'); });
  await new Promise(r => setTimeout(r, 1200));
  const out = await p.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const ex = window.__explore;
    const g = window.__probeScene === 'room' ? ex.roomManager.roomGroup : (await import('/src/core/Engine.js')).Engine.scene;
    const rows = [];
    const box = new THREE.Box3();
    g.traverse((c) => {
      if (!c.isMesh && !c.isGroup) return;
      if (c === g) return;
      box.setFromObject(c);
      if (!isFinite(box.min.x)) return;
      const h = box.max.y - box.min.y;
      const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
      // tall things standing in the room's south-west quadrant
      if (h > 1.2 && cx > 2 && cx < 9 && cz > 7 && cz < 20 && box.min.y < 3) {
        rows.push({
          name: c.name || '(unnamed)', type: c.type,
          furn: c.userData?.furnitureType || null,
          h: +h.toFixed(2), cx: +cx.toFixed(2), cz: +cz.toFixed(2),
          w: +(box.max.x - box.min.x).toFixed(2), d: +(box.max.z - box.min.z).toFixed(2),
          mat: c.material ? (Array.isArray(c.material) ? 'multi' : `#${c.material.color?.getHexString?.() ?? '?'} op=${c.material.opacity}`) : null,
          visible: c.visible,
        });
      }
    });
    return { rows, npcs: ex.roomManager.entityManager.npcs.map(n => ({ id: n.id, v: n.visible, x: n.position.x, z: n.position.z })) };
  });
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})();
