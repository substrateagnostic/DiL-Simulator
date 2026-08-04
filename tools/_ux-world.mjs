// THROWAWAY repro/verify instrument for the UX fix lane (g-run, lane UX).
//
// Measures, off the LIVE shipping code path, the world-side findings:
//   S2d  camera elevation tracking as the player descends
//   S2a  stairwell slope in degrees, from the real floorZones
//   B1   interactables that punch a walkable hole through their own furniture
//   B2   NPCs standing inside blocking furniture
//   S1   motivationalPoster props with no matching poster interactable
//   S4b  objective text at each dev preset
//
// Observation only — reads TileMap/Room/Player state, patches nothing.
//
// Usage: node tools/_ux-world.mjs --tag=before|after
// Requires `npm run dev` on :5173. HEADED per HANDOFF_PACKAGE §4.7.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const tag = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'before';
const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/g-run/ux';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const log = [];
const say = (s) => { log.push(s); console.log(s); };
const R = {};

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act5&shot=archive`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(800);

  // S2c (spawn height on room entry) lives in tools/_ux-spawn.mjs, NOT here.
  // It has to be sampled from the node side: an in-page setTimeout/rAF loop
  // starves the game's own loop and reads a world that never ticked, which is
  // the convenience-harness trap HANDOFF_PACKAGE §4.3 warns about. This file
  // only measures things that are true of a settled frame.

  // ── S2a / S2d — stairwell geometry + camera elevation tracking ──────────
  // Enter the stairwell from the TOP (its own playerSpawn) and WALK DOWN with
  // real key input — an in-page rAF loop starves the game's own loop and reads
  // a camera that never ticked, which is exactly the kind of convenience
  // harness HANDOFF_PACKAGE §4.3 warns about.
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act5&shot=stairwell`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1500);

  R.s2 = await page.evaluate(() => {
    const room = window.__explore.roomManager?.currentRoom;
    const zones = room?.data?.floorZones || [];
    const ys = zones.map(z => z.y ?? 0);
    const rises = [];
    for (let i = 1; i < zones.length; i++) {
      const d = Math.abs((zones[i].y ?? 0) - (zones[i - 1].y ?? 0));
      if (d > 0.001) rises.push(+d.toFixed(3));
    }
    const descent = Math.max(...ys) - Math.min(...ys);
    const rise = rises.length ? Math.max(...rises) : 0;
    return {
      zoneCount: zones.length, descent: +descent.toFixed(3),
      depth: room?.data?.height ?? 0,
      risePerStep: rise,
      pitchDeg: +(Math.atan2(rise, 1.0) * 180 / Math.PI).toFixed(1),
      storeys: +(descent / 2.5).toFixed(2),
      furnitureTypes: (room?.data?.furniture || []).map(f => f.type),
    };
  });
  say(`S2a stairwell: zones=${R.s2.zoneCount} descent=${R.s2.descent} m (${R.s2.storeys} storeys @2.5m) over depth=${R.s2.depth} tiles`);
  say(`S2a rise/step=${R.s2.risePerStep} m over a 1.00 m tread -> PITCH ${R.s2.pitchDeg} deg`);
  say(`S2a furniture: ${JSON.stringify(R.s2.furnitureTypes)}`);

  // Walk down holding W, sampling the shipping camera + the player's projected
  // head position in SCREEN PIXELS (the number that actually reads as "sinking").
  const headSample = () => {
    const ex = window.__explore;
    const E = window.__engine;
    const tm = ex.roomManager?.currentRoom?.tileMap;
    const p = ex.player;
    const fy = tm?.heightAt ? tm.heightAt(p.position.x, p.position.z) : 0;
    const v = p.mesh.position.clone();
    v.y += 1.6;                       // head height
    v.project(E.camera);
    return {
      z: +p.position.z.toFixed(2),
      floorY: +fy.toFixed(3),
      meshY: +p.mesh.position.y.toFixed(3),
      camY: +(ex.camera?.current?.y ?? 0).toFixed(3),
      camGap: +((ex.camera?.current?.y ?? 0) - fy).toFixed(3),
      headPx: Math.round((1 - v.y) / 2 * window.innerHeight),
    };
  };
  const walk = [await page.evaluate(headSample)];
  await page.keyboard.down('w');
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(320); walk.push(await page.evaluate(headSample)); }
  await page.keyboard.up('w');
  await page.waitForTimeout(500);
  walk.push(await page.evaluate(headSample));
  R.s2.walk = walk;
  const heads = walk.map(w => w.headPx);
  R.s2.headDriftPx = Math.max(...heads) - Math.min(...heads);
  R.s2.worstCamGap = Math.max(...walk.map(w => Math.abs(w.camGap)));
  say(`S2d walk-down: ${walk.map(w => `z${w.z}/fy${w.floorY}/cam${w.camY}/px${w.headPx}`).join('  ')}`);
  say(`S2d HEAD DRIFT across the whole descent = ${R.s2.headDriftPx} px of ${900}; worst |camY - floorY| = ${R.s2.worstCamGap} m`);
  await page.screenshot({ path: `${OUT}/s2a-stairwell-${tag}.png` });

  // ── B1 — grid value on every interactable tile, LIVE, room by room ──────
  // Dumped for ALL interactables so the before/after diff is exact: a tile that
  // reads 2 (walkable) before and 1 (blocked) after is a piece of furniture
  // whose collision the interactable had been silently deleting.
  R.b1 = await page.evaluate(async () => {
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const ex = window.__explore;
    const out = [];
    for (const id of Object.keys(ROOMS)) {
      ex._loadRoom(id);
      const room = ex.roomManager?.currentRoom;
      const tm = room?.tileMap;
      if (!tm) continue;
      for (const it of (ROOMS[id].interactables || [])) {
        const gx = Math.floor(it.x), gz = Math.floor(it.z);
        const furn = (ROOMS[id].furniture || []).find(f =>
          Math.floor(f.x) === gx && Math.floor(f.z) === gz);
        out.push({
          key: `${id}|${it.id || it.type}|${gx},${gz}`,
          room: id, it: it.id || it.type, x: gx, z: gz,
          furn: furn ? furn.type : null, grid: tm.get(gx, gz),
          reachable: tm.getInteractable(gx, gz) ? 1 : 0,
        });
      }
    }
    return out;
  });
  const b1Walkable = R.b1.filter(r => r.furn && r.grid === 2);
  say(`B1 interactable tiles total=${R.b1.length}; sitting on furniture and WALKABLE (grid=2): ${b1Walkable.length}`);
  b1Walkable.slice(0, 45).forEach(r => say(`   ${r.room} ${r.it} (${r.x},${r.z}) -> ${r.furn} grid=${r.grid}`));

  // ── B1 SAFETY GATE — restoring collision must not strand any interactable.
  // Flood-fills from playerSpawn over walkable tiles in EVERY room and checks
  // that each interactable is still reachable from within INTERACTION_OFFSETS
  // (the exact neighbourhood `_getNearbyTargets` scans). Same test for exits.
  R.reach = await page.evaluate(async () => {
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const ex = window.__explore;
    const OFF = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
    const bad = [];
    let checked = 0;
    for (const id of Object.keys(ROOMS)) {
      ex._loadRoom(id);
      const tm = ex.roomManager?.currentRoom?.tileMap;
      if (!tm) continue;
      const sp = ROOMS[id].playerSpawn || { x: 1, z: 1 };
      const seen = new Set();
      const q = [[Math.floor(sp.x), Math.floor(sp.z)]];
      seen.add(`${q[0][0]},${q[0][1]}`);
      while (q.length) {
        const [x, z] = q.pop();
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz, k = `${nx},${nz}`;
          if (seen.has(k)) continue;
          if (nx < 0 || nz < 0 || nx >= tm.width || nz >= tm.height) continue;
          if (!tm.isWalkable(nx, nz)) continue;
          // multi-level rooms: honour the ledge rule the player is bound by
          if (tm.heights && Math.abs(tm.heightAt(nx, nz) - tm.heightAt(x, z)) > 0.55) continue;
          seen.add(k); q.push([nx, nz]);
        }
      }
      for (const it of (ROOMS[id].interactables || [])) {
        if (it.condition) continue;   // conditional props are gated by flags, not geometry
        checked++;
        const gx = Math.floor(it.x), gz = Math.floor(it.z);
        const ok = OFF.some(([dx, dz]) => seen.has(`${gx - dx},${gz - dz}`));
        if (!ok) bad.push({ room: id, it: it.id || it.type, x: gx, z: gz, kind: 'interactable' });
      }
      for (const e of (ROOMS[id].exits || [])) {
        checked++;
        const gx = Math.floor(e.x), gz = Math.floor(e.z);
        if (!seen.has(`${gx},${gz}`)) bad.push({ room: id, it: e.targetRoom, x: gx, z: gz, kind: 'exit' });
      }
    }
    return { checked, bad };
  });
  say(`REACH gate: ${R.reach.checked} interactables+exits checked, UNREACHABLE = ${R.reach.bad.length}`);
  R.reach.bad.forEach(r => say(`   !! ${r.room} ${r.kind} ${r.it} (${r.x},${r.z})`));

  // ── B2 — NPCs standing on a BLOCKED tile with no sitting:true ───────────
  // Read off the LIVE tilemap, so NO_BLOCK furniture (chairs, keyboards,
  // posters) is correctly excluded — only genuinely solid props count.
  R.b2 = await page.evaluate(async () => {
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const ex = window.__explore;
    const out = [];
    for (const id of Object.keys(ROOMS)) {
      ex._loadRoom(id);
      const tm = ex.roomManager?.currentRoom?.tileMap;
      if (!tm) continue;
      for (const n of (ROOMS[id].npcs || [])) {
        const gx = Math.floor(n.x), gz = Math.floor(n.z);
        if (n.sitting) continue;
        if (tm.get(gx, gz) !== 1) continue;
        const furn = (ROOMS[id].furniture || []).find(f =>
          Math.floor(f.x) === gx && Math.floor(f.z) === gz);
        out.push({ room: id, npc: n.id, x: n.x, z: n.z, furn: furn ? furn.type : '(footprint)', cond: JSON.stringify(n.condition || null) });
      }
    }
    return out;
  });
  say(`B2 NPCs standing on a BLOCKED tile with no sitting:true: ${R.b2.length}`);
  R.b2.forEach(r => say(`   ${r.room} ${r.npc} (${r.x},${r.z}) on ${r.furn} cond=${r.cond}`));

  // ── S1 — motivationalPoster props with no poster interactable ───────────
  R.s1 = await page.evaluate(async () => {
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const out = [];
    for (const id of Object.keys(ROOMS)) {
      const posters = (ROOMS[id].furniture || []).filter(f => f.type === 'motivationalPoster');
      const inter = (ROOMS[id].interactables || []);
      for (const p of posters) {
        const hit = inter.some(i => Math.abs(i.x - p.x) <= 1.0 && Math.abs(i.z - p.z) <= 1.2);
        if (!hit) out.push({ room: id, x: p.x, z: p.z });
      }
    }
    return out;
  });
  say(`S1 dead poster props (no poster interactable within 1 tile): ${R.s1.length}`);
  R.s1.forEach(r => say(`   ${r.room} (${r.x}, ${r.z})`));

  // ── B3 — interactables with no furniture to aim at (CLAUDE.md law) ──────
  // Includes CONDITIONAL interactables, which the reach gate skips: a quest
  // tile on bare carpet is invisible whether or not its flag is set.
  R.b3 = await page.evaluate(async () => {
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const SKIP = new Set(['elevator', 'exit']);      // exits carry their own doors
    const out = [];
    for (const id of Object.keys(ROOMS)) {
      const furn = ROOMS[id].furniture || [];
      for (const it of (ROOMS[id].interactables || [])) {
        if (SKIP.has(it.type)) continue;
        const near = furn.some(f => Math.abs(f.x - it.x) <= 1.0 && Math.abs(f.z - it.z) <= 1.2);
        if (!near) out.push({ room: id, it: it.id || it.type, dialogId: it.dialogId, x: it.x, z: it.z });
      }
    }
    return out;
  });
  say(`B3 interactables with NO furniture within a tile: ${R.b3.length}`);
  R.b3.forEach(r => say(`   ${r.room} ${r.it} (${r.x},${r.z}) ${r.dialogId || ''}`));

  // ── B2 shot — Grandma in the break room at Act 5 ────────────────────────
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.flags.act5_complete = true;
    ex._refreshStoryProgress(true);
    ex._loadRoom('break_room', 9, 8);
  });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/b2-break-grandma-${tag}.png` });

  // ── S4b — objective text at each shipped dev preset ─────────────────────
  R.s4 = await page.evaluate(async () => {
    const { DEV_PRESETS } = await import('/src/ui/DevPanel.js');
    const ex = window.__explore;
    const out = [];
    for (const p of DEV_PRESETS) {
      ex.player.flags = {};
      Object.assign(ex.player.flags, p.flags);
      ex._syncActFromFlags();
      ex._refreshStoryProgress(true);
      out.push({ key: p.key, label: p.label, act: ex.player.actIndex, objective: ex._getStoryObjective() });
    }
    return out;
  });
  say('S4 objective per dev preset:');
  R.s4.forEach(r => say(`   ${r.key.padEnd(5)} act=${r.act}  ${String(r.objective).replace(/<[^>]+>/g, ' ')}`));

  writeFileSync(`${OUT}/world-${tag}.json`, JSON.stringify({ tag, ...R, log }, null, 2));
  say(`\nwrote ${OUT}/world-${tag}.json`);
} finally {
  await browser.close();
}
