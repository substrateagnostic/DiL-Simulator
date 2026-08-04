// One-off: dump the world-box dimensions of every prop the wall-fade geometric
// test currently claims, so the solidity term can be chosen from measurements
// instead of guessed. Feeds the `depth across the wall normal` cut in
// Room._registerWallProp.
//
//   node tools/_g-wall-dims.mjs --port=5177
import { chromium } from 'playwright';

const arg = (k, d) => {
  const hit = process.argv.find(a => a.startsWith(`--${k}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};
const PORT = arg('port', '5177');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ headless: false, args: ['--use-gl=angle'] });
  const p = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage();
  await p.goto(`http://localhost:${PORT}/?dev&fixture=act7&hud=0`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });

  const rooms = ['reception', 'executive_floor', 'stairwell', 'archive', 'vault', 'floor_13', 'luckys_diner', 'old_vault'];
  const out = [];
  for (const id of rooms) {
    await p.evaluate((r) => { window.__explore._loadRoom(r); }, id);
    await sleep(160);
    const rows = await p.evaluate(async () => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const ex = window.__explore;
      const room = ex.roomManager.currentRoom;
      const w = room.data.width, h = room.data.height;
      const res = [];
      const box = new THREE.Box3();
      for (const child of room.scene.children) {
        const t = child.userData?.furnitureType;
        if (!t) continue;
        const src = child.userData.fxBox || box.setFromObject(child);
        if (!isFinite(src.min.y)) continue;
        const cx = (src.min.x + src.max.x) / 2, cz = (src.min.z + src.max.z) / 2;
        const onEast = cx >= w - 1.4, onSouth = cz >= h - 1.4;
        if (!onEast && !onSouth) continue;
        const dx = src.max.x - src.min.x, dz = src.max.z - src.min.z, dy = src.max.y - src.min.y;
        if (dy <= 1.2) continue;
        res.push({
          room: room.data.id, type: t, cx: +cx.toFixed(2), cz: +cz.toFixed(2),
          dx: +dx.toFixed(3), dy: +dy.toFixed(3), dz: +dz.toFixed(3),
          minY: +src.min.y.toFixed(3),
          wall: onEast ? 'east' : 'south',
          depth: +(onEast ? dx : dz).toFixed(3),
          spanAlongWall: +(onEast ? dz : dx).toFixed(3),
        });
      }
      return res;
    });
    out.push(...rows);
  }
  await b.close();
  console.log('room                type              wall   depth  span   dy     minY');
  for (const r of out) {
    console.log(`${r.room.padEnd(18)} ${r.type.padEnd(16)} ${r.wall.padEnd(6)} ` +
      `${String(r.depth).padStart(6)} ${String(r.spanAlongWall).padStart(6)} ${String(r.dy).padStart(6)} ${String(r.minY).padStart(7)}`);
  }
  const depths = out.map(r => r.depth).sort((a, z) => a - z);
  console.log('depth range:', depths[0], '..', depths[depths.length - 1]);
})().catch(e => { console.error(e); process.exit(1); });
