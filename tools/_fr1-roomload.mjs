// FIX ROUND 1 — B13, "Alex's room slow load — profile it".
//
// Times the SHIPPING room-build path (`RoomManager.loadRoom`, which is what
// `_loadRoom` and `_changeRoom` both call) for every room, cold and warm, and
// reports what the time is made of. Report-only; changes nothing.
//
//   node tools/_fr1-roomload.mjs

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/fix-round-1';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

try {
  await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act5&shot=cubicle_farm`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1500);

  const rows = await page.evaluate(async () => {
    const ex = window.__explore;
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const ids = Object.keys(ROOMS);
    const out = [];
    for (const id of ids) {
      const d = ROOMS[id];
      const counts = {
        furniture: (d.furniture || []).length,
        npcs: (d.npcs || []).length,
        lights: (d.lights || []).length,
        interactables: (d.interactables || []).length,
        tiles: (d.width || 0) * (d.height || 0),
      };
      // COLD then WARM: the second build hits every material/geometry cache in
      // MaterialLibrary and the Furniture factories.
      const t0 = performance.now();
      ex.roomManager.loadRoom(id, undefined, undefined, ex.player.flags);
      const cold = performance.now() - t0;
      const t1 = performance.now();
      ex.roomManager.loadRoom(id, undefined, undefined, ex.player.flags);
      const warm = performance.now() - t1;
      out.push({ id, cold: +cold.toFixed(1), warm: +warm.toFixed(1), ...counts });
    }
    return out;
  });

  rows.sort((a, b) => b.cold - a.cold);
  console.log('room                    cold(ms)  warm(ms)  furn  npc  light  tiles');
  for (const r of rows) {
    console.log(`${r.id.padEnd(22)} ${String(r.cold).padStart(8)} ${String(r.warm).padStart(9)} ${String(r.furniture).padStart(5)} ${String(r.npcs).padStart(4)} ${String(r.lights).padStart(6)} ${String(r.tiles).padStart(6)}`);
  }
  const total = rows.reduce((s, r) => s + r.cold, 0);
  console.log(`\n${rows.length} rooms, total cold build ${total.toFixed(0)} ms, median ${rows[Math.floor(rows.length / 2)].cold} ms`);
  const sr = rows.find(r => r.id === 'server_room');
  if (sr) console.log(`server_room (Alex's room): cold ${sr.cold} ms, warm ${sr.warm} ms, rank ${rows.indexOf(sr) + 1} of ${rows.length}`);
  writeFileSync(`${OUT}/roomload.json`, JSON.stringify(rows, null, 2));
} catch (e) {
  console.error('HARNESS ERROR', e);
} finally {
  await browser.close();
}
