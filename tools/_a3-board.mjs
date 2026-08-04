// THROWAWAY playtest harness for g-run lane A3 (board-meeting gating rework).
//
// Drives the Act 5 → Act 7 span in the NEW order through the shipping call
// paths (`_getDialogId`, `_refreshStoryProgress`, real DialogState pushes), and
// screenshots the objective panel at every stage so the "completes, not
// vanishes" beat is provable from artifacts rather than prose.
//
// Usage: node tools/_a3-board.mjs [--port=5173]
// HEADED per HANDOFF_PACKAGE §4.7. Evidence -> screenshots/g-run/board/
//
// Verification matrix (design §8):
//   1 happy path objective ladder      6 riddles still reachable after the Rolex
//   2 under-prepared meeting           7 legacy save A (act6_ready, no meeting)
//   3 bail-out writes nothing          8 legacy save B (has_rolex, no meeting)
//   4 riddle collision, ACT 4          9 mobile 390 px
//   5 riddle collision, ACT 6

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/g-run/board';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', e => console.log('   PAGEERROR:', e.message));

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fails++;
};
const tap = async (key = 'Enter') => {
  await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key);
};
const top = () => page.evaluate(() => {
  const st = window.__explore?.stateManager.stack;
  return st?.[st.length - 1]?.constructor.name || 'none';
});
const objHTML = () => page.evaluate(() =>
  document.querySelector('.hud-quest-objective')?.innerHTML || '');
const objText = () => page.evaluate(() =>
  document.querySelector('.hud-quest-objective')?.textContent || '');
const flags = (...keys) => page.evaluate((ks) => {
  const f = window.__explore.player.flags;
  return Object.fromEntries(ks.map(k => [k, !!f[k]]));
}, keys);
const shotQuest = async (name) => {
  // The quest tracker animates in; an element screenshot on a mid-animation
  // node throws "element is not visible". Clip off the bounding box instead,
  // and fall back to the full frame.
  const box = await page.evaluate(() => {
    const el = document.querySelector('.hud-quest-tracker');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return (r.width > 4 && r.height > 4)
      ? { x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.width + 16, height: r.height + 16 }
      : null;
  });
  await page.screenshot({ path: `${OUT}/${name}.png`, ...(box ? { clip: box } : {}) });
};
const shotFull = async (name) => page.screenshot({ path: `${OUT}/${name}.png` });

// Record every distinct `.dialog-text` string the box renders. The typewriter
// means a single before-tap read misses lines, so poll instead.
const startLineRecorder = () => page.evaluate(() => {
  window.__a3lines = [];
  clearInterval(window.__a3rec);
  window.__a3rec = setInterval(() => {
    const t = document.querySelector('.dialog-text')?.textContent || '';
    const L = window.__a3lines;
    if (t && L[L.length - 1] !== t) L.push(t);
  }, 70);
});
const recordedLines = () => page.evaluate(() => {
  clearInterval(window.__a3rec);
  return (window.__a3lines || []).slice();
});
const roomDump = () => page.evaluate(() => ({
  room: window.__explore.player.currentRoom,
  paused: !!window.__explore.paused,
  pendingCombat: window.__explore._pendingCombat || null,
  pendingDialog: window.__explore._pendingDialog || null,
  stack: window.__explore.stateManager.stack.map(s => s.constructor.name),
  npcs: window.__explore.roomManager.entityManager.npcs.filter(n => n.visible).map(n => n.id),
}));

// Load a room cleanly: clear the stack, load, let EntityManager run its first
// visibility pass, and report what is standing there.
const goRoom = async (room, x = 2, z = 2) => {
  await toExploration();
  await page.evaluate(({ r, px, pz }) => window.__explore._loadRoom(r, px, pz), { r: room, px: x, pz: z });
  await page.waitForTimeout(2200);
  await toExploration();
  await page.waitForTimeout(500);
  const d = await roomDump();
  console.log(`   ${room}:`, JSON.stringify(d));
  return d;
};

// Between sections: drop anything stacked over exploration. The harness parks
// the player on the Janitor's own tile, so a stray interact can open a
// neighbour's scene; this keeps one section's accident out of the next.
const toExploration = async () => {
  for (let i = 0; i < 12; i++) {
    const st = await page.evaluate(() => window.__explore.stateManager.stack.map(s => s.constructor.name));
    if (st.length === 1) break;
    await page.evaluate(() => window.__explore.stateManager.pop());
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => { window.__explore.paused = false; });
  await page.waitForTimeout(300);
};

// Which dialog would the CURRENT room's Janitor serve? Runs the real router.
const janitorDialog = () => page.evaluate(() => {
  const ex = window.__explore;
  const npc = ex.roomManager.entityManager.npcs.find(n => n.id === 'janitor' && n.visible);
  return npc ? ex._getNpcDialogId(npc) : null;
});
const visibleNpcs = (id) => page.evaluate((wanted) =>
  window.__explore.roomManager.entityManager.npcs
    .filter(n => n.visible && (!wanted || n.id === wanted))
    .map(n => n.id), id);

// Set flags, then run the SHIPPING derivation + room reload. Parks the player
// two tiles clear of the Janitor's tile so no NPC is in interact range.
const setup = async (obj, room) => {
  await toExploration();
  await page.evaluate(({ o, r }) => {
    const ex = window.__explore;
    ex.player.flags = {};
    Object.assign(ex.player.flags, o);
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    if (r) ex._loadRoom(r, 2, 2);
  }, { o: obj, r: room });
  await page.waitForTimeout(1800);
  await toExploration();
  await page.waitForTimeout(400);
};

// Walk a dialog forward, optionally answering choices by index.
const runDialog = async (picks = [], max = 90) => {
  const lines = [];
  for (let i = 0; i < max; i++) {
    if (await top() !== 'DialogState') break;
    const cs = await page.$$('.dialog-choice');
    const t = await page.evaluate(() =>
      document.querySelector('.dialog-text')?.textContent || '');
    if (t) lines.push(t);
    if (cs.length) {
      const idx = Math.min(picks.length ? picks.shift() : 0, cs.length - 1);
      await cs[idx].click();
    } else {
      await tap();
    }
    await page.waitForTimeout(230);
  }
  return lines;
};

const ACT6_BASE = {
  checked_desk: true, met_janet: true, met_intern: true, met_isaiah: true, met_alex_it: true,
  read_janet_intro: true, read_intern_intro: true, read_isaiah_intro: true, read_alex_it_intro: true,
  defeated_intern: true, briefing_complete: true, branch_chosen: true,
  karen_defeated: true, defeated_karen: true, chad_defeated: true, grandma_defeated: true,
  ross_post_karen: true, ross_post_chad: true, ross_post_grandma: true,
  // A real Act-6 save always has this: the Archive's security_guard NPC hangs
  // off `notFlag: security_guard_info`, and janitor_act3 (which sets
  // read_janitor_act3) requires it. Without it the guard is still standing on
  // the Janitor's tile and a stray interact starts his fight.
  security_guard_info: true,
  act2_complete: true, act3_complete: true,
  met_janitor: true, read_janitor_act3: true, janitor_rallied: true, ross_rallied: true,
  janitor_riddle_1_done: true, janitor_riddle_2_done: true, janitor_riddle_3_done: true,
  has_charter: true, act4_complete: true,
  corporate_lawyer_defeated: true, board_room_accessible: true, act5_complete: true,
};

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act6&shot=ross_office`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
  await page.waitForTimeout(1200);

  // ── 1. HAPPY PATH ────────────────────────────────────────────────────────
  console.log('\n=== 1. HAPPY PATH (objective ladder) ===');

  // STAGE 1 — act5_complete, Skip has not written the speech yet.
  await setup({ ...ACT6_BASE }, 'ross_office');
  await page.waitForTimeout(1400);
  const s1 = await objText();
  check('stage 1 names the 4 PM vote', /board votes on dissolution at 4 PM/i.test(s1), s1.slice(0, 90));
  check('stage 1 shows the prep counter as a sub-line', /Prep: 0\/5 allies, 0\/2 evidence/.test(s1), s1.slice(0, 140));
  check('stage 1 never says Rolex', !/rolex/i.test(s1));
  await page.waitForTimeout(3800);
  await shotQuest('01-stage1-prepare');

  // Talk to Skip → ross_act6 → ross_speech_ready.
  await page.evaluate(() => {
    const ex = window.__explore;
    const npc = ex.roomManager.entityManager.npcs.find(n => n.id === 'ross' && n.visible);
    return ex._getNpcDialogId(npc);
  });
  const skipDialog = await page.evaluate(() => {
    const ex = window.__explore;
    const npc = ex.roomManager.entityManager.npcs.find(n => n.id === 'ross' && n.visible);
    return npc ? ex._getNpcDialogId(npc) : null;
  });
  check('Skip serves ross_act6 in his office', skipDialog === 'ross_act6', String(skipDialog));
  await page.evaluate(async () => {
    const ex = window.__explore;
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const { DialogState } = await import('/src/states/DialogState.js');
    ex.stateManager.push(new DialogState(DIALOGS.ross_act6, ex.player, ex.stateManager, 'ross_act6'));
  });
  await page.waitForTimeout(500);
  await startLineRecorder();
  await runDialog();
  const skipLines = await recordedLines();
  const skipClose = skipLines[skipLines.length - 1] || '';
  check('Skip no longer names the Rolex', !skipLines.some(l => /rolex/i.test(l)), skipClose.slice(0, 90));
  check('Skip sends the player to the board room', /board room/i.test(skipLines.join(' ')), skipClose.slice(0, 110));
  await page.waitForTimeout(900);

  // STAGE 2 — board meeting is the PRIMARY objective.
  const s2 = await objText();
  check('stage 2 promotes the board meeting to primary',
    s2.startsWith('Convene the board'), s2.slice(0, 110));
  check('stage 2 demotes prep to a sub-line', /Prep: \d\/5 allies, \d\/2 evidence/.test(s2), s2.slice(0, 140));
  check('stage 2 has no "Optional:" prefix anywhere', !/Optional:/.test(s2));
  await page.waitForTimeout(3800);   // let the objective toast clear the frame
  await shotQuest('02-stage2-convene-board');
  await shotFull('02b-stage2-full-frame');

  // The Janitor refuses before the meeting.
  await goRoom('archive');
  check('Archive holds exactly one Janitor', (await visibleNpcs('janitor')).length === 1,
    JSON.stringify(await visibleNpcs('janitor')));
  const preBoardJanitor = await janitorDialog();
  check('Janitor serves janitor_waits_for_board before the meeting',
    preBoardJanitor === 'janitor_waits_for_board', String(preBoardJanitor));
  await page.evaluate(async () => {
    const ex = window.__explore;
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const { DialogState } = await import('/src/states/DialogState.js');
    ex.stateManager.push(new DialogState(DIALOGS.janitor_waits_for_board, ex.player, ex.stateManager, 'janitor_waits_for_board'));
  });
  await page.waitForTimeout(450);
  await shotFull('03-janitor-waits-for-board');
  await runDialog();
  await toExploration();
  await page.waitForTimeout(600);
  check('the waiting scene writes no Rolex flag', !(await flags('has_rolex')).has_rolex);

  // ── 3. BAIL-OUT (run before the real meeting so nothing is written) ──────
  console.log('\n=== 3. BAIL-OUT ===');
  await goRoom('board_room');
  check('Skip is staged in the Board Room on ross_speech_ready',
    (await visibleNpcs('ross')).length === 1, JSON.stringify(await visibleNpcs('ross')));
  const bailEntry = await page.evaluate(() => {
    const ex = window.__explore;
    const npc = ex.roomManager.entityManager.npcs.find(n => n.id === 'ross' && n.visible);
    return npc ? ex._getNpcDialogId(npc) : null;
  });
  check('Board-Room Skip serves board_meeting', bailEntry === 'board_meeting', String(bailEntry));
  await page.evaluate(async () => {
    const ex = window.__explore;
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const { DialogState } = await import('/src/states/DialogState.js');
    ex.stateManager.push(new DialogState(DIALOGS.board_meeting, ex.player, ex.stateManager, 'board_meeting'));
  });
  await page.waitForTimeout(500);
  // 9 lines of BLOCK A, then pick option 2 ("I need a minute").
  await runDialog([1], 14);
  await toExploration();
  await page.waitForTimeout(1200);
  const bail = await flags('board_meeting_held', 'board_meeting_closed', 'rolex_available');
  check('bail-out writes nothing', Object.values(bail).every(v => !v), JSON.stringify(bail));
  console.log('   board room after bailing:', JSON.stringify(await roomDump()));
  check('Skip is still staged in the Board Room after bailing',
    (await visibleNpcs('ross')).length === 1, JSON.stringify(await visibleNpcs('ross')));

  // ── 2. UNDER-PREPARED MEETING ───────────────────────────────────────────
  console.log('\n=== 2. UNDER-PREPARED MEETING (0/5 allies) ===');
  await page.evaluate(async () => {
    const ex = window.__explore;
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const { DialogState } = await import('/src/states/DialogState.js');
    ex.stateManager.push(new DialogState(DIALOGS.board_meeting, ex.player, ex.stateManager, 'board_meeting'));
  });
  await page.waitForTimeout(500);
  await startLineRecorder();
  await runDialog([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 260);
  const bmLines = await recordedLines();
  await toExploration();
  await page.waitForTimeout(1500);
  const held = await flags('board_meeting_held', 'board_meeting_closed', 'rolex_available', 'act6_ready');
  check('board_meeting_held fires at 0/5 allies', held.board_meeting_held, JSON.stringify(held));
  check('rolex_available derives from the meeting', held.rolex_available, JSON.stringify(held));
  check('act6_ready did NOT gate the meeting', held.act6_ready === false, JSON.stringify(held));
  check('the new Skip handoff line plays',
    bmLines.some(l => /old man down in the Archive/i.test(l)),
    (bmLines[bmLines.length - 1] || '').slice(0, 160));
  check('BLOCK H bridge still plays (penthouse named)',
    bmLines.some(l => /penthouse/i.test(l)));

  // STAGE 3 — the completed line.
  const s3html = await objHTML();
  const s3 = await objText();
  check('stage 3 keeps the board line as a COMPLETED step',
    /hud-quest-done/.test(s3html) && /The board has been heard/.test(s3), s3html.slice(0, 140));
  check('stage 3 shows the Rolex line below it',
    /Get the Janitor's Rolex/.test(s3), s3.slice(0, 120));
  await page.waitForTimeout(3800);   // toast clears; the PANEL is the evidence
  await shotQuest('04-stage3-board-done-rolex-next');
  await shotFull('05-stage3-full-frame');

  // Toast count on the transition — the bespoke duplicate is gone.
  const toasts = await page.evaluate(() =>
    [...document.querySelectorAll('.hud-toast, .toast')].map(t => t.textContent));
  console.log('   toasts on screen at stage 3:', JSON.stringify(toasts));

  // ── The Rolex ───────────────────────────────────────────────────────────
  await goRoom('archive');
  check('Archive still holds exactly one Janitor after the meeting',
    (await visibleNpcs('janitor')).length === 1, JSON.stringify(await visibleNpcs('janitor')));
  const postBoardJanitor = await janitorDialog();
  check('Janitor now serves janitor_act6', postBoardJanitor === 'janitor_act6', String(postBoardJanitor));
  await page.evaluate(async () => {
    const ex = window.__explore;
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const { DialogState } = await import('/src/states/DialogState.js');
    ex.stateManager.push(new DialogState(DIALOGS.janitor_act6, ex.player, ex.stateManager, 'janitor_act6'));
  });
  await page.waitForTimeout(500);
  await startLineRecorder();
  await runDialog([0], 20);
  const jLines = await recordedLines();
  await toExploration();
  check('Janitor opens knowing the meeting happened',
    jLines.some(l => /pipes got quiet/i.test(l)), (jLines[0] || '').slice(0, 90));
  check('Janitor warning re-points to the elevator, not the day being done',
    jLines.some(l => /elevator goes up one time/i.test(l))
      && !jLines.some(l => /the day's done/i.test(l)));
  await page.waitForTimeout(1000);
  const done = await flags('has_rolex', 'act6_complete');
  check('Rolex handed over → act6_complete', done.has_rolex && done.act6_complete, JSON.stringify(done));
  await page.waitForTimeout(700);
  const s4 = await objText();
  check('objective moves on to Act 6.5 / Act 7', !/board has been heard/i.test(s4), s4.slice(0, 110));
  await shotQuest('06-act7-objective');

  // ── 9. MOBILE ───────────────────────────────────────────────────────────
  console.log('\n=== 9. MOBILE 390 px ===');
  await page.setViewportSize({ width: 390, height: 844 });
  await setup({ ...ACT6_BASE, ross_speech_ready: true, board_meeting_held: true }, 'archive');
  await page.waitForTimeout(1600);
  const mobileVisible = await page.evaluate(() => {
    const el = document.querySelector('.hud-quest-objective');
    if (!el) return { found: false };
    const cs = getComputedStyle(el);
    const span = el.querySelector('.hud-quest-done');
    const ss = span ? getComputedStyle(span) : null;
    return {
      found: true,
      objDisplay: cs.display,
      spanFound: !!span,
      spanDisplay: ss?.display,
      spanDecoration: ss?.textDecorationLine,
      rect: el.getBoundingClientRect().height,
    };
  });
  check('completed ✓ line is rendered and visible at 390 px',
    mobileVisible.spanFound && mobileVisible.spanDisplay !== 'none'
      && mobileVisible.objDisplay !== 'none' && mobileVisible.rect > 0,
    JSON.stringify(mobileVisible));
  check('completed line is struck through', /line-through/.test(mobileVisible.spanDecoration || ''),
    mobileVisible.spanDecoration);
  await shotQuest('07-mobile-390-completed-line');
  await page.setViewportSize({ width: 1600, height: 900 });

  // ── 4. RIDDLE COLLISION, ACT 4 (the critical-path case) ─────────────────
  console.log('\n=== 4. RIDDLE COLLISION, ACT 4 ===');
  await setup({
    checked_desk: true, briefing_complete: true, branch_chosen: true,
    karen_defeated: true, chad_defeated: true, grandma_defeated: true,
    act2_complete: true, act3_complete: true,
    met_janitor: true, read_janitor_act3: true, ross_rallied: true,
    security_guard_info: true,
    // riddle 1 UNANSWERED and already attempted (the old dead end)
    riddle_1_attempted: true,
  }, 'archive');
  await page.waitForTimeout(1700);
  const act4Route = await janitorDialog();
  check('Act-4 Janitor offers the ROUTER, not the riddle',
    act4Route === 'janitor_router', String(act4Route));
  await shotFull('08-act4-router-offered');
  // Drive the router through the REAL interact path so the _pendingDialog
  // chain is exercised, not bypassed.
  await page.evaluate(async () => {
    const ex = window.__explore;
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const { DialogState } = await import('/src/states/DialogState.js');
    ex.stateManager.push(new DialogState(DIALOGS.janitor_router, ex.player, ex.stateManager, 'janitor_router'));
  });
  await page.waitForTimeout(450);
  await runDialog([0], 8);           // pick "The reason I came down here."
  await page.waitForTimeout(1400);   // _pendingDialog fires at +500 ms
  check('story choice chains straight into a dialog (no second interaction)',
    await top() === 'DialogState', `top=${await top()}`);
  await startLineRecorder();
  await runDialog([0, 0, 0], 40);
  const act4Lines = await recordedLines();
  await toExploration();
  await page.waitForTimeout(900);
  const act4Flags = await flags('vault_accessible', 'hr_accessible', 'vault_code_1', 'janitor_rallied');
  check('janitor_act4 landed all four critical-path flags',
    Object.values(act4Flags).every(Boolean), JSON.stringify(act4Flags));
  check('and the riddle is still unanswered (not burned)',
    !(await flags('janitor_riddle_1_done')).janitor_riddle_1_done);
  console.log('   act4 first line:', (act4Lines[0] || '').slice(0, 80));

  // ── 5. RIDDLE COLLISION, ACT 6 ──────────────────────────────────────────
  console.log('\n=== 5. RIDDLE COLLISION, ACT 6 ===');
  await setup({
    ...ACT6_BASE,
    janitor_riddle_3_done: false,
    riddle_3_attempted: true,
    ross_speech_ready: true, board_meeting_held: true,
  }, 'archive');
  await page.waitForTimeout(1700);
  const act6Route = await janitorDialog();
  check('Act-6 Janitor offers the ROUTER when a riddle is open',
    act6Route === 'janitor_router', String(act6Route));
  await page.evaluate(async () => {
    const ex = window.__explore;
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const { DialogState } = await import('/src/states/DialogState.js');
    ex.stateManager.push(new DialogState(DIALOGS.janitor_router, ex.player, ex.stateManager, 'janitor_router'));
  });
  await page.waitForTimeout(450);
  await runDialog([1], 8);           // pick the RIDDLE door
  await page.waitForTimeout(1400);
  check('riddle door chains into the riddle', await top() === 'DialogState', `top=${await top()}`);
  await runDialog([1], 20);          // answer WRONG on purpose
  await toExploration();
  await page.waitForTimeout(900);
  check('a wrong answer sets no done-flag',
    !(await flags('janitor_riddle_3_done')).janitor_riddle_3_done);
  check('and the router comes back next interaction',
    await janitorDialog() === 'janitor_router', String(await janitorDialog()));
  check('the Rolex scene is still reachable through the story door',
    !(await flags('has_rolex')).has_rolex);

  // ── 6. RIDDLES AFTER THE ROLEX ──────────────────────────────────────────
  console.log('\n=== 6. RIDDLES AFTER THE ROLEX ===');
  await setup({
    ...ACT6_BASE, janitor_riddle_3_done: false,
    board_meeting_held: true, ross_speech_ready: true,
    has_rolex: true, act6_complete: true,
  }, 'archive');
  await page.waitForTimeout(1700);
  check('post-Rolex Archive holds exactly one Janitor',
    (await visibleNpcs('janitor')).length === 1, JSON.stringify(await visibleNpcs('janitor')));
  const postRolex = await janitorDialog();
  check('riddle chain resumes after the Rolex', postRolex === 'janitor_riddle_3', String(postRolex));

  // ── 7. LEGACY SAVE A ────────────────────────────────────────────────────
  console.log('\n=== 7. LEGACY SAVE A (act6_ready, no meeting, no Rolex) ===');
  await setup({
    ...ACT6_BASE,
    janet_act6_rallied: true, diane_act6_rallied: true, intern_act6_rallied: true,
    ross_speech_ready: true, grandma_ally: true,
    diane_evidence: true, isaiah_evidence: true,
    act6_ready: true,
  }, 'archive');
  await page.waitForTimeout(1700);
  const legA = await flags('rolex_available', 'act6_ready', 'board_meeting_closed');
  check('legacy A: rolex_available stays false', !legA.rolex_available, JSON.stringify(legA));
  check('legacy A: exactly one Janitor', (await visibleNpcs('janitor')).length === 1,
    JSON.stringify(await visibleNpcs('janitor')));
  check('legacy A: Janitor points at the meeting',
    await janitorDialog() === 'janitor_waits_for_board', String(await janitorDialog()));
  const legAobj = await objText();
  check('legacy A: objective redirects to the meeting',
    legAobj.startsWith('Convene the board'), legAobj.slice(0, 90));
  await shotQuest('09-legacy-A-redirect');
  await goRoom('board_room');
  check('legacy A: Skip is staged in the Board Room',
    (await visibleNpcs('ross')).length === 1, JSON.stringify(await visibleNpcs('ross')));

  // ── 8. LEGACY SAVE B ────────────────────────────────────────────────────
  console.log('\n=== 8. LEGACY SAVE B (has_rolex + act6_complete, no meeting) ===');
  await setup({
    ...ACT6_BASE, ross_speech_ready: true, act6_ready: true,
    has_rolex: true, act6_complete: true,
  }, 'archive');
  await page.waitForTimeout(1700);
  const legB = await flags('rolex_available', 'board_meeting_closed', 'board_meeting_held');
  check('legacy B: rolex_available bridges from has_rolex', legB.rolex_available, JSON.stringify(legB));
  check('legacy B: board_meeting_closed bridges from act6_complete', legB.board_meeting_closed, JSON.stringify(legB));
  const legBjan = await visibleNpcs('janitor');
  check('legacy B: EXACTLY ONE Janitor stands in the Archive', legBjan.length === 1, JSON.stringify(legBjan));
  await shotFull('10-legacy-B-one-janitor');
  await goRoom('board_room');
  check('legacy B: Board Room staging is cleared',
    (await visibleNpcs()).length === 0, JSON.stringify(await visibleNpcs()));
  await goRoom('ross_office');
  check('legacy B: Skip is back in his office',
    (await visibleNpcs('ross')).length === 1, JSON.stringify(await visibleNpcs('ross')));

  console.log(`\n${fails === 0 ? 'A3 PASS' : `A3 FAIL (${fails})`}`);
  process.exitCode = fails === 0 ? 0 : 1;
} catch (e) {
  console.error('HARNESS ERROR', e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
