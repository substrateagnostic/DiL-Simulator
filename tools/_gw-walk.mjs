// GHOST-WALK, THE HUMAN HALF. The sweep proves the grid; this proves a BODY
// can do the thing the grid says it can. Two legs, both of them named in the
// producer's original report:
//
//   (a) BATHROOM THROUGH THE DOORS. The stall run faces SOUTH into the room
//       (rotation 0). Before the fix its 3-tile block sat one tile east of its
//       own mesh, so the tile in FRONT of the doors was sealed and the tiles
//       BEHIND were open: you could only reach the stalls from the back wall.
//       This walks Andrew from the room spawn to the front of the middle stall
//       with real keys and fires the interactable from the door side.
//   (b) GARAGE AISLE. Cars were blocking a tile of air off each far end,
//       sealing the drive aisles between parking columns. This walks the north
//       aisle end to end and the x=2 aisle north to south and asserts the body
//       actually travelled — a stopped walk is an invisible wall.
//   (c) THE BAR COUNTERS (small-debts round). `loungeBar` blocked one grid row
//       against a 0.99 m-deep mesh, so the counter's north 0.30 m stood on
//       walkable floor in Lucky's, the Roastery and the private lounge. This
//       walks in along the wall from the west end and asserts the body stops
//       at the counter, then walks the customer side end to end so the fix is
//       not just a wider wall.
//   (d) BOARD ROOM CREDENZAS (same round). Both sat off their own blocks —
//       0.32 m of the east one on walkable tile 13, 0.40 m of both on walkable
//       row 3 — so a body walking to the sideboard stopped inside it. Asserts
//       each mesh is inside its blocked rect and that the walk ends short of
//       the front face. Skip's renovated office carries the third credenza.
//
// HEADED per HANDOFF_PACKAGE 4.7. Writes stills to screenshots/ghost-walk/.
//   node tools/_gw-walk.mjs [--port=5173]

import { chromium } from 'playwright';
import fs from 'node:fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/ghost-walk';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.addInitScript(() => { try { localStorage.clear(); } catch {} });

// InputManager diffs key state between frames — hold every key like a human.
const hold = async (key, ms) => {
  await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
  await page.waitForTimeout(120);
};
let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
  if (!ok) fails++;
};
const top = () => page.evaluate(() => {
  const st = window.__explore?.stateManager.stack;
  return st?.[st.length - 1]?.constructor.name || 'none';
});
const pos = () => page.evaluate(() => ({
  x: +window.__explore.player.position.x.toFixed(2),
  z: +window.__explore.player.position.z.toFixed(2),
}));
const grid = (x, z) => page.evaluate(([x, z]) => window.__explore.tileMap.grid[z * window.__explore.tileMap.width + x], [x, z]);

try {
  // ── (a) BATHROOM, FROM THE DOOR SIDE ───────────────────────────────────
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=bathroom&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
  await page.waitForTimeout(1400);

  // The run blocks x 3-5 at z 0-1. In front of the doors (z 2) must be open;
  // behind them (z 0) must not.
  check('stall run blocks its own tiles (3,1)/(4,1)/(5,1)',
    (await grid(3, 1)) === 1 && (await grid(4, 1)) === 1 && (await grid(5, 1)) === 1);
  check('the tile east of the run (2,1) is no longer half-stall',
    (await grid(2, 1)) === 0, `grid=${await grid(2, 1)}`);
  check('the tile IN FRONT of the doors (4,2) is walkable', (await grid(4, 2)) === 0);

  // Walk there with real keys from the room spawn (4,4).
  const from = await pos();
  await hold('w', 900);
  const at = await pos();
  check('walked north toward the doors', at.z < from.z - 0.8, `${from.z} -> ${at.z}`);
  check('and stopped in front of the doors, not inside them', at.z >= 2.0, `z=${at.z}`);
  await page.screenshot({ path: `${OUT}/walk-bathroom-doors.png` });

  const prompt = await page.evaluate(() => {
    const ex = window.__explore;
    const { exit, interactable } = ex._getNearbyTargets();
    return interactable ? { prompt: ex._getInteractPrompt(interactable, exit), type: interactable.data.type } : null;
  });
  check('the stall door offers itself from the DOOR side', prompt?.type === 'stall_door', JSON.stringify(prompt));
  await hold('e', 140);
  await page.waitForTimeout(900);
  check('and it opens', (await top()) === 'DialogState', await top());
  await page.screenshot({ path: `${OUT}/walk-bathroom-stall-dialog.png` });

  // ── (b) GARAGE AISLES ──────────────────────────────────────────────────
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=parking_garage&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
  await page.waitForTimeout(1400);

  // The north lane, z 1, right across the room: this is the run that was cut
  // by a tile of invisible car off each bay's far end.
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(1.5, 1.5, ex.tileMap);
    ex.camera.snapTo(1.5, 1.5, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(400);
  const laneFrom = await pos();
  await hold('d', 2600);
  const laneTo = await pos();
  check('north lane crosses the garage unobstructed', laneTo.x > laneFrom.x + 6, `x ${laneFrom.x} -> ${laneTo.x}`);
  await page.screenshot({ path: `${OUT}/walk-garage-north-lane.png` });

  // The x=2 aisle, north to south between the two west bay columns.
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(2.5, 1.5, ex.tileMap);
    ex.camera.snapTo(2.5, 1.5, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(400);
  const aisleFrom = await pos();
  await hold('s', 1600);
  const aisleTo = await pos();
  // The middle of this aisle carries a structural column at (2,5) — the walk
  // is expected to reach it and stop, NOT to stop before it.
  check('west aisle runs from the north lane down to the column',
    aisleTo.z > aisleFrom.z + 2.5, `z ${aisleFrom.z} -> ${aisleTo.z}`);
  await page.screenshot({ path: `${OUT}/walk-garage-west-aisle.png` });

  // The x=6 drive aisle, north lane to south lane, straight past Andrew's own
  // bay. This is the run the h:3 car footprint used to seal: bays at x 4 and
  // x 9 block columns 3-4 and 8-9, so 5/6/7 is the aisle, and the only thing
  // standing in it is the structural column at (7,5) one column over.
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(6.5, 1.5, ex.tileMap);
    ex.camera.snapTo(6.5, 1.5, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(400);
  const bayFrom = await pos();
  await hold('s', 2400);
  const bayTo = await pos();
  check('the drive aisle past Andrews bay runs north lane to south lane',
    bayTo.z > bayFrom.z + 5, `z ${bayFrom.z} -> ${bayTo.z}`);
  await page.screenshot({ path: `${OUT}/walk-garage-andrews-bay.png` });

  // ── (c) THE BAR COUNTERS — the staff side is shut ──────────────────────
  //
  // SMALL-DEBTS round. `loungeBar` blocked ONE row against a 0.99 m-deep mesh
  // (backbar shelf at local z -0.30 through stool seats at +0.69), and every
  // placement sits at z 1.0 — so the counter's north 0.30 m stood on walkable
  // grid row 0 and a body could walk in along the wall from either end and
  // stand inside the counter. Three rooms, one prop.
  // `frontFrom` is west of the counter on a row that is actually clear in that
  // room — the private lounge's cigar corner blocks (2,1) and (2,2), so its
  // customer-side run starts east of the coffee table, not at the west wall.
  const BARS = [
    { room: 'luckys_diner',  fixture: 'act1', block: [5, 9],  enterFrom: 4.5, frontFrom: 1.5, front: 2.5, frontTo: 9.5 },
    { room: 'old_branch',    fixture: 'act7', block: [2, 6],  enterFrom: 1.5, frontFrom: 1.5, front: 2.5, frontTo: 6.5 },
    { room: 'penthouse_bar', fixture: 'act7', block: [6, 10], enterFrom: 5.5, frontFrom: 3.5, front: 2.5, frontTo: 10.5 },
  ];
  for (const bar of BARS) {
    await page.goto(`http://localhost:${PORT}/?dev&fixture=${bar.fixture}&shot=${bar.room}&qtier=high`);
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
    await page.waitForTimeout(1200);
    const [bx0, bx1] = bar.block;
    const mid = Math.round((bx0 + bx1) / 2);
    check(`${bar.room}: the counter owns both its rows (${mid},0)/(${mid},1)`,
      (await grid(mid, 0)) === 1 && (await grid(mid, 1)) === 1,
      `grid0=${await grid(mid, 0)} grid1=${await grid(mid, 1)}`);

    // Walk east along the wall into the counter's west end. The body must stop
    // at the block boundary instead of sliding in behind the bar.
    await page.evaluate((sx) => {
      const ex = window.__explore;
      ex.player.setPosition(sx, 0.6, ex.tileMap);
      ex.camera.snapTo(sx, 0.6, ex.player.mesh.position.y);
    }, bar.enterFrom);
    await page.waitForTimeout(400);
    await hold('d', 1800);
    const behind = await pos();
    check(`${bar.room}: cannot walk in behind the counter`, behind.x < bx0,
      `stopped at x=${behind.x}, first blocked column is ${bx0}`);
    await page.screenshot({ path: `${OUT}/walk-${bar.room}-staff-side.png` });

    // ...and the CUSTOMER side is still a clear run end to end.
    await page.evaluate(([sx, sz]) => {
      const ex = window.__explore;
      ex.player.setPosition(sx, sz, ex.tileMap);
      ex.camera.snapTo(sx, sz, ex.player.mesh.position.y);
    }, [bar.frontFrom, bar.front]);
    await page.waitForTimeout(400);
    const frontFrom = await pos();
    await hold('d', 2600);
    const frontTo = await pos();
    check(`${bar.room}: the customer side runs the length of the counter`,
      frontTo.x > bar.frontTo, `x ${frontFrom.x} -> ${frontTo.x}`);
    await page.screenshot({ path: `${OUT}/walk-${bar.room}-customer-side.png` });
  }

  // ── (d) BOARD ROOM CREDENZAS — the body never enters the sideboard ─────
  //
  // Both were on the pre-sweep integer convention: the east credenza's mesh ran
  // 13.68-14.32 against a block of [14,15), so 0.32 m of it stood on walkable
  // tiles 13 and a body walking east stopped 0.02 INSIDE its front face; both
  // ran z 3.60-6.50 against a block of [4,7), leaving 0.40 m on walkable row 3.
  // `Room._mergeStatics` batches every static prop into one geometry, which
  // leaves the credenza GROUP with zero meshes of its own — the first draft of
  // this leg measured an empty AABB and every check passed against the ±1e9
  // sentinel. Batching is bit-identical pixels by design (ghost-walk's own
  // header), so the stills below are unaffected; only draw submission changes.
  await page.addInitScript(() => { window.__mergeStatics = false; });
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&shot=board_room&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
  await page.waitForTimeout(1400);

  const credBox = await page.evaluate(() => {
    const ex = window.__explore;
    const out = {};
    for (const child of ex.roomManager.currentRoom.scene.children) {
      const t = child.userData?.furnitureType;
      if (t !== 'credenza' && t !== 'credenzaEast') continue;
      child.updateWorldMatrix(true, true);
      const b = { mnx: 1e9, mnz: 1e9, mxx: -1e9, mxz: -1e9 };
      child.traverse((c) => {
        if (!c.isMesh || !c.geometry) return;
        if (!c.geometry.boundingBox) c.geometry.computeBoundingBox();
        const bb = c.geometry.boundingBox, e = c.matrixWorld.elements;
        for (let i = 0; i < 8; i++) {
          const lx = i & 1 ? bb.max.x : bb.min.x, ly = i & 2 ? bb.max.y : bb.min.y, lz = i & 4 ? bb.max.z : bb.min.z;
          const wx = e[0] * lx + e[4] * ly + e[8] * lz + e[12];
          const wz = e[2] * lx + e[6] * ly + e[10] * lz + e[14];
          b.mnx = Math.min(b.mnx, wx); b.mxx = Math.max(b.mxx, wx);
          b.mnz = Math.min(b.mnz, wz); b.mxz = Math.max(b.mxz, wz);
        }
      });
      out[t] = { mnx: +b.mnx.toFixed(3), mxx: +b.mxx.toFixed(3), mnz: +b.mnz.toFixed(3), mxz: +b.mxz.toFixed(3) };
    }
    return out;
  });
  // Guard the sentinel explicitly: an empty AABB must FAIL, never pass.
  const boxed = (b) => b && Number.isFinite(b.mnx) && Math.abs(b.mnx) < 1e6 && b.mxx > b.mnx;
  check('both credenza meshes were actually measured (not an empty AABB)',
    boxed(credBox.credenza) && boxed(credBox.credenzaEast), JSON.stringify(credBox));
  check('east credenza sits inside its own blocked column [14,15)',
    boxed(credBox.credenzaEast) && credBox.credenzaEast.mnx >= 14 && credBox.credenzaEast.mxx <= 15,
    JSON.stringify(credBox.credenzaEast));
  check('both credenzas sit inside their own blocked rows [4,7)',
    boxed(credBox.credenza) && boxed(credBox.credenzaEast) &&
    credBox.credenza.mnz >= 4 && credBox.credenza.mxz <= 7 &&
    credBox.credenzaEast.mnz >= 4 && credBox.credenzaEast.mxz <= 7,
    `west z ${credBox.credenza.mnz}-${credBox.credenza.mxz}, east z ${credBox.credenzaEast.mnz}-${credBox.credenzaEast.mxz}`);
  check('the west credenza stays clear of the player EDGE_CLAMP (0.4)',
    boxed(credBox.credenza) && credBox.credenza.mxx <= 0.4, `west max x ${credBox.credenza.mxx}`);

  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(11.5, 5.5, ex.tileMap);
    ex.camera.snapTo(11.5, 5.5, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(400);
  await hold('d', 1800);
  const atSideboard = await pos();
  check('a body walking east stops AT the east credenza, not inside it',
    boxed(credBox.credenzaEast) && atSideboard.x + 0.25 < credBox.credenzaEast.mnx,
    `body x=${atSideboard.x} (+0.25 shoulder) vs credenza front ${credBox.credenzaEast.mnx}`);
  await page.screenshot({ path: `${OUT}/walk-board-room-credenza-east.png` });

  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(2.5, 3.5, ex.tileMap);
    ex.camera.snapTo(2.5, 3.5, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(400);
  await hold('a', 1800);
  const atWest = await pos();
  check('the row NORTH of the west credenza is clear floor again',
    atWest.x <= 1.4 && (await grid(0, 3)) === 0, `stopped x=${atWest.x}, grid(0,3)=${await grid(0, 3)}`);
  await page.screenshot({ path: `${OUT}/walk-board-room-credenza-west.png` });

  // Skip's renovated office carries the third credenza and the same z fix.
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&shot=skip_office_large&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(2.5, 3.5, ex.tileMap);
    ex.camera.snapTo(2.5, 3.5, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(400);
  await hold('a', 1600);
  const skipWest = await pos();
  check('skip_office_large: row 3 west of the credenza is clear floor',
    skipWest.x <= 1.4 && (await grid(0, 3)) === 0, `stopped x=${skipWest.x}, grid(0,3)=${await grid(0, 3)}`);
  await page.screenshot({ path: `${OUT}/walk-skip-office-credenza.png` });

  console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
} catch (err) {
  console.error('HARNESS ERROR:', err.message);
  fails++;
} finally {
  await browser.close();
  process.exit(fails ? 1 : 0);
}
