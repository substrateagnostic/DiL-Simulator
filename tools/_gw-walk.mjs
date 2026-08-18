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

  console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
} catch (err) {
  console.error('HARNESS ERROR:', err.message);
  fails++;
} finally {
  await browser.close();
  process.exit(fails ? 1 : 0);
}
