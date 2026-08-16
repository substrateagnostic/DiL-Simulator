// REGRESSION GATE (r-run): the Alex-from-IT routing machine.
//
// Five legs, all through the SHIPPING router. Playtest 2026-08-15: "a lot of
// flagging issues with Alex_IT ... early quest starts, base-dialog landings,
// pre-greyed options."
//
//   1  SOFT-LOCK. `alex_it_side_router`'s "What's going on with the main
//      investigation?" row sets `alex_main_chosen`; the listener's table falls
//      through the non-existent `alex_it_act4` to `alex_it_act3` at act 4/5,
//      and `_pendingDialog` pushes it RAW (no neutral swap). `alex_it_act3`'s
//      quest-stage band is 300-399 while `act3_complete` puts the player at
//      400, so every node fails and the skip walk follows the appended
//      catch-up tail 19->20->21->22->23->19 forever: RangeError inside
//      `DialogState.enter()`, after the world was already paused. Blank box, no
//      key closes it.
//   2  SHADOWING. `printer_quest_started` (set by examining a cubicle-farm
//      printer in Act 1/2) routed Alex to `alex_printer_quest` ABOVE
//      `act4_trigger`, the sole setter of `act3_complete` — while the HUD read
//      "Return the Archive evidence to Alex from IT".
//   3  SHADOWING. `alex_server_secret` did the same; its exemption only covered
//      the story beats, not the act4 trigger.
//   4  NEUTRAL FALL-THROUGH. `act >= 3 && !read_alex_it_act3` kept returning an
//      out-of-band `alex_it_act3` at act 4+, and `_getValidNpcDialogId`
//      silently substituted `neutral_alex_it` — so Alex answered "Not a great
//      time. Something is blinking that should not be blinking" for the rest of
//      the game, and `alex_it_return` was unreachable.
//   5  DEAD DEFERRALS. `_getDialogId` consumed `alex_story_deferred` /
//      `alex_side_deferred`, and `update()` calls it EVERY FRAME to label the
//      interact prompt — so "not right now" was eaten one frame after the
//      router closed and both routers' defer rows did nothing.
//
// Usage: node tools/_r-alex.mjs [--port=5173]

import { chromium } from 'playwright';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => { errors.push(e.message); });

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fails++;
};

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act4&shot=server_room&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
  await page.waitForTimeout(700);

  const setup = (extra = {}, del = []) => page.evaluate(async ({ extra, del }) => {
    const ex = window.__explore;
    const { DEV_PRESETS } = await import('/src/ui/DevPanel.js');
    while (ex.stateManager.stack.length > 1) ex.stateManager.pop();
    ex.player.flags = { ...DEV_PRESETS.find(p => p.key === 'act4').flags, ...extra };
    for (const k of del) delete ex.player.flags[k];
    ex.player.currentRoom = 'server_room';
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    return ex.player.actIndex;
  }, { extra, del });

  // Route Alex the way the room does: pick the entry whose condition matches.
  const serve = (commit = false) => page.evaluate(async (commit) => {
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const ex = window.__explore;
    const f = ex.player.flags;
    const entry = (ROOMS.server_room.npcs || []).find(n => {
      if (n.id !== 'alex_it') return false;
      const c = n.condition; if (!c) return true;
      if (c.flag && !f[c.flag]) return false;
      if (c.notFlag && f[c.notFlag]) return false;
      return true;
    });
    return ex._getNpcDialogId({ id: 'alex_it', dialogId: entry?.dialogId || 'alex_it' }, commit);
  }, commit);

  // ── 1. the soft-lock ────────────────────────────────────────────────────
  const act = await setup();
  errors.length = 0;
  const lock = await page.evaluate(async () => {
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const ex = window.__explore;
    ex._pendingDialog = null;
    ex.player.setFlag('alex_main_chosen', true);   // the side-router row
    const queued = ex._pendingDialog;
    ex._pendingDialog = null;
    let pushed = null, threw = null;
    try {
      const { DialogState } = await import('/src/states/DialogState.js');
      const ds = new DialogState(DIALOGS[queued], ex.player, ex.stateManager, queued);
      ex.stateManager.push(ds);
      pushed = ex.stateManager.stack[ex.stateManager.stack.length - 1]?.constructor.name;
    } catch (e) { threw = String(e && e.message); }
    while (ex.stateManager.stack.length > 1) ex.stateManager.pop();
    return { queued, pushed, threw };
  });
  console.log(`  act=${act}  alex_main_chosen queues '${lock.queued}'  pushed=${lock.pushed}  threw=${lock.threw}`);
  check('1a. the main-investigation row queues an IN-BAND dialog at act 4',
    lock.queued !== 'alex_it_act3', `queued=${lock.queued}`);
  check('1b. and pushing it does not throw', !lock.threw && errors.length === 0,
    lock.threw || errors.join(' | '));

  // The structural half: even a raw out-of-band push must terminate.
  const cycle = await page.evaluate(async () => {
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const { DialogState } = await import('/src/states/DialogState.js');
    const ex = window.__explore;
    let threw = null;
    try {
      const ds = new DialogState(DIALOGS.alex_it_act3, ex.player, ex.stateManager, 'alex_it_act3');
      ex.stateManager.push(ds);
    } catch (e) { threw = String(e && e.message); }
    const top = ex.stateManager.stack[ex.stateManager.stack.length - 1]?.constructor.name;
    while (ex.stateManager.stack.length > 1) ex.stateManager.pop();
    return { threw, top };
  });
  check('1c. an out-of-band raw push of alex_it_act3 terminates instead of recursing',
    !cycle.threw && cycle.top === 'ExplorationState', `${cycle.threw || ''} top=${cycle.top}`);

  // ── 2/3. the two shadowers vs act4_trigger ──────────────────────────────
  await setup({ has_archive_evidence: true, printer_quest_started: true }, ['act3_complete']);
  const printerServed = await serve();
  check('2. the printer side quest no longer shadows act4_trigger',
    printerServed === 'act4_trigger', `served=${printerServed}`);

  await setup({ has_archive_evidence: true, server_secret_started: true }, ['act3_complete']);
  const secretServed = await serve();
  check('3. alex_server_secret no longer shadows act4_trigger',
    secretServed === 'act4_trigger', `served=${secretServed}`);

  // and both are still served once Alex owes nothing
  await setup({ printer_quest_started: true });
  const printerLater = await serve();
  check('2b. the printer quest is still served when no beat is pending',
    printerLater === 'alex_printer_quest', `served=${printerLater}`);

  // ── 4. out-of-band act row must fall through, not go neutral ────────────
  // act 4, `read_alex_it_act3` never set (the Act-3 scene was skipped) and
  // every side quest complete, so nothing above the generic rows claims him.
  await setup({
    quest_anomaly_347_complete: true, quest_legacy_admin_complete: true,
    quest_network_ghost_complete: true, quest_daves_legacy_complete: true,
    quest_printer_soul_complete: true, quest_final_patch_complete: true,
    printer_quest_done: true, server_secret_done: true,
    alex_it_act3_done: true, knows_server_secret: true,
    // fall past the side-quest hub so the GENERIC act rows are what answer
    alex_side_deferred: true,
  });
  const stale = await serve();
  check('4. a stale act row falls through to alex_it_return, not neutral_alex_it',
    stale !== 'neutral_alex_it' && stale !== 'neutral_npc', `served=${stale}`);

  // ── 5. the per-frame prompt path must not eat a deferral ───────────────
  await setup({ alex_side_deferred: true, anomaly_started: true });
  const deferKept = await page.evaluate(async () => {
    const ex = window.__explore;
    // three frames' worth of prompt labelling
    for (let i = 0; i < 3; i++) ex._getNpcDialogId({ id: 'alex_it', dialogId: 'alex_it' });
    return !!ex.player.getFlag('alex_side_deferred');
  });
  check('5a. the prompt updater does not consume alex_side_deferred', deferKept === true);
  const deferSpent = await page.evaluate(async () => {
    const ex = window.__explore;
    ex._getNpcDialogId({ id: 'alex_it', dialogId: 'alex_it' }, true);   // the press
    return !!ex.player.getFlag('alex_side_deferred');
  });
  check('5b. and the press still consumes it', deferSpent === false);

  // ── 6. Server Room Secrets cannot start before the Henderson arc ────────
  const early = await page.evaluate(async () => {
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const ex = window.__explore;
    const walk = (flags) => {
      const nodes = DIALOGS.server_rack_inspect;
      let i = 0, guard = 0, set = false;
      while (nodes[i] && guard++ < 60) {
        const n = nodes[i];
        if (n.type === 'end') break;
        if (n.type === 'action' && n.action === 'set_flag' && n.flag === 'server_secret_started') set = true;
        // `?? i + 1` is MANDATORY and this walker did not have it. DialogState
        // resolves a missing ifTrue/ifFalse/next as fall-through (DialogState.js
        // :303, :305, :193), and the P1 normalisation deleted every one of those
        // fields that equalled index+1 — 513 of them. server_rack_inspect[5]
        // lost `ifFalse: 6`, so this walk fell off the end at node 5 and check 6b
        // has reported a failure that is not in the game since commit 333d306.
        // Any harness that resolves an edge by hand must apply the same default.
        if (n.type === 'condition') { i = (flags[n.flag] ? n.ifTrue : n.ifFalse) ?? i + 1; continue; }
        i = n.next !== undefined ? n.next : i + 1;
      }
      return set;
    };
    return {
      preBriefing: walk({ met_alex_it: true }),
      postAct2: walk({ met_alex_it: true, act2_complete: true }),
    };
  });
  check('6a. the rack does not start the quest before act2_complete', early.preBriefing === false);
  check('6b. and it does start it after', early.postAct2 === true);

  console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAIL(S)'}`);
} finally {
  await browser.close();
}
process.exit(fails === 0 ? 0 : 1);
