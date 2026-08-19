// ANDREW HARVEST piece 2 probe — the ported act-aware ambient lines serve at
// the right acts through the shipping router. A Vite dev server must already
// be running (--port=NNNN, default 5173).
//
// Legs (query = _getDialogId through the real route table; press = real E):
//  A. press: Skip in skip_office at act 5 (act rung read) opens skip_return
//     and the first line is Andrew's 'Twenty years in this industry.'
//  B. query: Janet at act 7 (all act rungs read, not recruited-mission-live)
//     routes to janet_return; walk shows the a7 'come back down' line.
//  C. query: Diane at act 6 rallied, pre-meeting, reception -> diane_return.
//  D. query: Janitor post-everything in the archive -> janitor_return (the
//     has_rolex wrist variant is the first line).
//  E. press: Isaiah at act 6 with isaiah_evidence -> isaiah_return, first
//     line '23 breached agreements.'
import { chromium } from 'playwright';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const fails = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails.push(name);
};
const ACT5 = ['briefing_complete', 'branch_chosen', 'act2_complete', 'act3_complete', 'act4_complete',
  'karen_defeated', 'chad_defeated', 'grandma_defeated', 'skip_post_karen', 'skip_post_chad',
  'skip_rallied', 'janet_rallied', 'knows_server_secret', 'read_janet_quiz', 'trait_advance_reader',
  'checked_desk', 'met_janet', 'met_intern', 'met_isaiah', 'met_alex_it', 'met_rachel', 'defeated_intern'];
const READS = ['read_skip_intro', 'read_skip_act2', 'read_skip_act3', 'read_skip_act4', 'read_skip_act5',
  'read_janet_intro', 'read_janet_act2', 'read_janet_act4', 'read_janet_act6', 'read_janet_act7',
  'read_diane_intro', 'read_diane_act3', 'read_diane_act4', 'read_diane_act6',
  'read_isaiah_intro', 'read_isaiah_act3', 'read_isaiah_act6'];

async function pressOn(npcId, room, extraFlags) {
  return page.evaluate(async ({ npcId, room, flags }) => {
    const ex = window.__explore;
    for (const f of flags) ex.player.setFlag(f, true);
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    ex._loadRoom(room);
    await new Promise(res => setTimeout(res, 350)); // let EntityManager tick conditions
    const npc = ex.roomManager.entityManager.npcs.find(n => n.id === npcId && n.mesh?.visible !== false);
    if (!npc) return { err: `no visible ${npcId} in ${room}` };
    ex.player.setPosition(npc.mesh.position.x, npc.mesh.position.z, ex.tileMap);
    ex._interact();
    await new Promise(res => setTimeout(res, 700));
    const stack = ex.stateManager?.stack || [];
    const top = stack[stack.length - 1];
    const dlg = top?.constructor?.name === 'DialogState' ? top : null;
    // Let the typewriter finish before sampling the line.
    dlg?.dialogBox?.skipToEnd?.();
    await new Promise(res => setTimeout(res, 150));
    const out = {
      dialogId: dlg?.dialogId ?? null,
      line: document.querySelector('.dialog-text')?.textContent?.slice(0, 72) ?? null,
    };
    // close the dialog so the next leg starts clean
    if (dlg) { dlg.skipToEnd?.(); ex.stateManager.pop?.(); }
    return out;
  }, { npcId, room, flags: extraFlags });
}

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=cubicle_farm&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true && !!window.__explore, { timeout: 45_000 });

  // A — Skip, act 5, real press.
  const a = await pressOn('skip', 'skip_office', [...ACT5, ...READS]);
  check('A Skip act5 serves skip_return', !a.err && a.dialogId === 'skip_return',
    a.err || `dialog=${a.dialogId} line="${a.line}"`);
  check('A first line is Twenty years', (a.line || '').startsWith('Twenty years in this industry'), `"${a.line}"`);
  await page.screenshot({ path: 'screenshots/ah-run/skip-return-a4.png' }).catch(() => {});

  // E — Isaiah, act 6 with evidence, real press (cubicle farm water cooler).
  const e = await pressOn('isaiah', 'cubicle_farm', ['act5_complete', 'isaiah_evidence', 'restructuring_trio_defeated',
    'isaiah_recruited', 'isaiah_documents_shared', 'isaiah_receipts_complete', 'social_eng_complete']);
  check('E Isaiah act6 serves isaiah_return', !e.err && e.dialogId === 'isaiah_return',
    e.err || `dialog=${e.dialogId} line="${e.line}"`);
  check('E first line is 23 breached agreements', (e.line || '').startsWith('23 breached agreements'), `"${e.line}"`);
  await page.screenshot({ path: 'screenshots/ah-run/isaiah-return-a6.png' }).catch(() => {});

  // B/C/D — routed-id queries at targeted states.
  const q = await page.evaluate(() => {
    const ex = window.__explore;
    const p = ex.player;
    const out = {};
    // B: Janet at act 7, missions closed so the ladder is the surface.
    for (const f of ['act6_complete', 'board_meeting_held', 'has_rolex', 'janet_act6_rallied',
      'janet_recruited', 'janet_vacancy_complete', 'lunch_thief_started']) p.setFlag(f, true);
    ex._syncActFromFlags(); ex._refreshStoryProgress(true);
    p.currentRoom = 'break_room';
    out.janet = ex._getDialogId({ id: 'janet' }, false);
    // C: Diane at act 6 rallied pre-meeting — clear the act-7 flags first.
    for (const f of ['act6_complete', 'board_meeting_held', 'has_rolex']) p.setFlag(f, false);
    for (const f of ['diane_act6_rallied', 'diane_recruited', 'diane_handbook_complete']) p.setFlag(f, true);
    ex._syncActFromFlags(); ex._refreshStoryProgress(true);
    p.currentRoom = 'reception';
    out.diane = ex._getDialogId({ id: 'diane' }, false);
    // D: Janitor in the archive, post-ledger-chain, holding nothing.
    for (const f of ['act6_complete', 'has_rolex', 'met_janitor', 'read_janitor_act3',
      'janitor_riddle_1_done', 'janitor_riddle_2_done', 'janitor_riddle_3_done',
      'janitor_names_complete', 'read_janitor_pattern', 'read_janitor_the_name',
      'dave_janitor_done']) p.setFlag(f, true);
    ex._syncActFromFlags(); ex._refreshStoryProgress(true);
    p.currentRoom = 'archive';
    out.janitor = ex._getDialogId({ id: 'janitor' }, false);
    return out;
  });
  check('B Janet act7 routes to janet_return', q.janet === 'janet_return', `got ${q.janet}`);
  check('C Diane act6 rallied routes to diane_return', q.diane === 'diane_return', `got ${q.diane}`);
  check('D Janitor post-chain routes to janitor_return', q.janitor === 'janitor_return', `got ${q.janitor}`);
} finally {
  await browser.close();
}
console.log(fails.length ? `RESULT: ${fails.length} FAIL — ${fails.join(', ')}` : 'RESULT: ALL PASS');
process.exitCode = fails.length ? 1 : 0;
