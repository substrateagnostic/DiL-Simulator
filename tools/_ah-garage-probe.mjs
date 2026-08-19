// ANDREW HARVEST piece 1 probe — the garage janitor no longer leaks riddles.
// A Vite dev server must already be running (--port=NNNN, default 5173).
//
// Legs:
//  A. act>=3 + met_janitor + read_janitor_act3, room=parking_garage:
//     the patrol's routed dialog is janitor_garage (NOT janitor_riddle_*).
//  B. same flags, room=archive: the riddle chain still serves janitor_riddle_1.
//  C. real E-press in the garage: DialogState opens janitor_garage and the
//     first line is the sweep line.
//  D. pre-met_janitor garage: intro still served (B7 — deliberately reachable).
//  E. ?routes=legacy agrees with the table on A, B and D.
import { chromium } from 'playwright';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const fails = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails.push(name);
};

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=parking_garage&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true && !!window.__explore, { timeout: 45_000 });

  const r = await page.evaluate(() => {
    const ex = window.__explore;
    const p = ex.player;
    // Act 4 era, janitor chain live, no riddles answered.
    for (const f of ['met_janitor', 'read_janitor_act3', 'briefing_complete', 'branch_chosen',
      'act2_complete', 'act3_complete', 'security_guard_info']) p.setFlag(f, true);
    ex._syncActFromFlags();
    const garageNpc = { id: 'janitor' };
    const out = {};
    p.currentRoom = 'parking_garage';
    out.garage = ex._getDialogId(garageNpc, false);
    p.currentRoom = 'archive';
    out.archive = ex._getDialogId(garageNpc, false);
    out.archivePinned = ex._getDialogId({ id: 'janitor', dialogId: 'janitor_return' }, false);
    // Pre-meeting garage state (fresh intro law, B7).
    p.setFlag('met_janitor', false);
    p.currentRoom = 'parking_garage';
    out.garageFirstMeet = ex._getDialogId(garageNpc, false);
    p.setFlag('met_janitor', true);
    p.currentRoom = 'parking_garage';
    return out;
  });
  check('A garage serves ambient line', r.garage === 'janitor_garage', `got ${r.garage}`);
  check('B archive still serves riddle', r.archive === 'janitor_riddle_1', `got ${r.archive}`);
  check('B2 archive pinned-return entry still riddles', r.archivePinned === 'janitor_riddle_1', `got ${r.archivePinned}`);
  check('D garage first meeting still intro', r.garageFirstMeet === 'janitor_intro', `got ${r.garageFirstMeet}`);

  // Leg C — real E-press on the live garage NPC.
  const c = await page.evaluate(async () => {
    const ex = window.__explore;
    const npc = ex.roomManager.entityManager.npcs.find(n => n.id === 'janitor');
    if (!npc) return { err: 'no janitor entity in garage' };
    // Park the player on the patrol body and interact through the shipping path.
    ex.player.setPosition(npc.mesh.position.x, npc.mesh.position.z, ex.tileMap);
    ex._interact();
    await new Promise(res => setTimeout(res, 700));
    const stack = ex.stateManager?.stack || [];
    const top = stack[stack.length - 1];
    const dlg = top?.constructor?.name === 'DialogState' ? top : null;
    return {
      state: top?.constructor?.name || 'none',
      dialogId: dlg?.dialogId ?? null,
      firstLine: document.querySelector('.dialog-text')?.textContent?.slice(0, 60) ?? null,
    };
  });
  if (c.err) check('C E-press opens janitor_garage', false, c.err);
  else check('C E-press opens janitor_garage', c.dialogId === 'janitor_garage', `state=${c.state} dialog=${c.dialogId} line="${c.firstLine}"`);
  await page.screenshot({ path: 'screenshots/ah-run/garage-sweep.png' }).catch(() => {});

  // Leg E — legacy path agreement.
  await page.goto(`http://localhost:${PORT}/?dev&routes=legacy&fixture=act1&shot=parking_garage&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true && !!window.__explore, { timeout: 45_000 });
  const l = await page.evaluate(() => {
    const ex = window.__explore;
    const p = ex.player;
    for (const f of ['met_janitor', 'read_janitor_act3', 'briefing_complete', 'branch_chosen',
      'act2_complete', 'act3_complete', 'security_guard_info']) p.setFlag(f, true);
    ex._syncActFromFlags();
    const out = {};
    p.currentRoom = 'parking_garage';
    out.garage = ex._getDialogId({ id: 'janitor' }, false);
    p.currentRoom = 'archive';
    out.archive = ex._getDialogId({ id: 'janitor' }, false);
    p.setFlag('met_janitor', false);
    p.currentRoom = 'parking_garage';
    out.garageFirstMeet = ex._getDialogId({ id: 'janitor' }, false);
    return out;
  });
  check('E legacy garage agrees', l.garage === 'janitor_garage', `got ${l.garage}`);
  check('E legacy archive agrees', l.archive === 'janitor_riddle_1', `got ${l.archive}`);
  check('E legacy first-meet agrees', l.garageFirstMeet === 'janitor_intro', `got ${l.garageFirstMeet}`);
} finally {
  await browser.close();
}
console.log(fails.length ? `RESULT: ${fails.length} FAIL — ${fails.join(', ')}` : 'RESULT: ALL PASS');
process.exitCode = fails.length ? 1 : 0;
