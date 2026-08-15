// REGRESSION GATE (r-run): the Act-5 entry cutscene must always be recoverable.
//
// `act4_complete` has exactly ONE setter in the whole game — node 8 of the
// `act5_trigger` dialog (src/data/dialogs/index.js:2177) — and it gates the
// Restructuring trio, the executive-floor gauntlet, `board_room_accessible`,
// the Meredith fight and therefore Acts 5, 6 and 7.
//
// AS SHIPPED (0c0253f) that dialog had exactly ONE pusher, in the `room-entered`
// listener, behind a PERSISTED latch that was spent 800 ms before the dialog was
// constructed — and the game auto-saves inside that window. Any interruption
// (quit, crash, closed tab, defeat dump) banked "the scene happened" for a scene
// that never ran, and nothing in the game could ever push it again.
//
// Three legs. Run with `--pre` to flip `window.__sceneLatchLegacy`, which
// restores the shipped READ side (the persisted latch guards the push, and the
// load-time reconcile is a no-op) and watch leg B fail. `--pre` cannot restore
// leg C's original failure, because that came from the `room-entered` copy of
// the push, which this fix DELETED — the measurement of that one is in the
// commit body: `_handleDefeat` banked `act5_triggered:true / act4_complete:false`
// synchronously, 800 ms before the dialog it guards was constructed.
//
// Usage: node tools/_r-act5latch.mjs [--port=5173] [--pre]

import { chromium } from 'playwright';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const PRE = process.argv.includes('--pre');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fails++;
};
// InputManager diffs key state between frames — a zero-delay press is invisible.
const tap = async (key = 'Enter') => {
  await page.keyboard.down(key); await page.waitForTimeout(70); await page.keyboard.up(key);
  await page.waitForTimeout(230);
};

// The exact pre-trigger state: the shipped `act5` F2 preset MINUS the two flags
// the trigger itself produces. This is what a player holds the instant they
// lift the charter out of the vault.
const arm = () => page.evaluate(async () => {
  const ex = window.__explore;
  const { DEV_PRESETS } = await import('/src/ui/DevPanel.js');
  const preset = DEV_PRESETS.find(p => p.key === 'act5');
  while (ex.stateManager.stack.length > 1) ex.stateManager.pop();
  ex.player.flags = { ...preset.flags };
  // The preset does not carry the Archive's own entry latches, and staging the
  // fixture IN the archive would otherwise push the security-guard fight over
  // the leg under test. A player who has the charter has long since done both.
  ex.player.flags.visited_archive = true;
  ex.player.flags.archive_found = true;
  ex.player.flags.security_guard_info = true;
  ex.player.flags.defeated_security_guard = true;
  delete ex.player.flags.act4_complete;
  delete ex.player.flags.act5_triggered;
  ex._act5Pushed = false;
  ex.player.currentRoom = 'archive';
  ex._syncActFromFlags();
  ex._refreshStoryProgress(true);
  ex._loadRoom('archive');
  return { act: ex.player.actIndex, charter: !!ex.player.getFlag('has_charter') };
});

const state = () => page.evaluate(() => {
  const ex = window.__explore;
  const st = ex.stateManager.stack;
  const top = st[st.length - 1];
  return {
    act4: !!ex.player.getFlag('act4_complete'),
    act5t: !!ex.player.getFlag('act5_triggered'),
    room: ex.player.currentRoom,
    top: top?.constructor.name,
    dialogId: top?.dialogId || null,
  };
});

// Drive whatever dialog is up to its end.
const clearDialogs = async (max = 40) => {
  for (let i = 0; i < max; i++) {
    const s = await state();
    if (s.top === 'ExplorationState') return true;
    await tap();
  }
  return (await state()).top === 'ExplorationState';
};

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act4&shot=archive&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
  if (PRE) await page.evaluate(() => { window.__sceneLatchLegacy = true; });
  await page.waitForTimeout(600);
  console.log(PRE ? '(running with the PRE-FIX persisted latch)\n' : '');

  // ── LEG A — a clean, uninterrupted entry still works ────────────────────
  const pre = await arm();
  check('fixture holds the charter at act 4', pre.charter && pre.act === 4, JSON.stringify(pre));
  await page.evaluate(() => window.__explore._changeRoom('cubicle_farm', 5, 10));
  await page.waitForTimeout(2400);
  const opened = await state();
  check('A. clean entry opens act5_trigger', opened.top === 'DialogState' && opened.dialogId === 'act5_trigger',
    `top=${opened.top} id=${opened.dialogId}`);
  await clearDialogs();
  const a = await state();
  check('A. and playing it through sets act4_complete', a.act4 === true, JSON.stringify(a));

  // ── LEG B — THE REGRESSION. An interrupted scene must re-arm. ───────────
  // Reproduce the shipping interruption exactly: enter the room, let the latch
  // and the autosave land, then take the blob off disk (or the identical
  // `player.serialize()` snapshot if the transition's `_autoSave` has not
  // fired yet) and re-enter through the shipping load path, the way TitleState
  // "Continue" and MenuState "Load" both do.
  await arm();
  await page.evaluate(() => window.__explore._changeRoom('cubicle_farm', 5, 10));
  await page.waitForTimeout(1600);
  const mid = await state();
  console.log(`  mid-scene: ${JSON.stringify(mid)}`);
  const restored = await page.evaluate(() => {
    const ex = window.__explore;
    const raw = localStorage.getItem('trust_issues_save_1');
    const blob = raw ? JSON.parse(raw) : ex.player.serialize();
    while (ex.stateManager.stack.length > 1) ex.stateManager.pop();   // the tab closing
    ex.player.deserialize(blob);
    ex.syncFromPlayerState();                                         // the shipping load path
    ex._loadRoom(ex.player.currentRoom);
    return { act4: !!ex.player.getFlag('act4_complete'), act5t: !!ex.player.getFlag('act5_triggered') };
  });
  console.log(`  restored from the interrupted save: ${JSON.stringify(restored)}`);
  // The player is standing in the cubicle farm holding the charter. Give the
  // game one second of ordinary play.
  await page.waitForTimeout(2400);
  const reoffered = await state();
  check('B. an interrupted act5_trigger is re-offered without leaving the room',
    reoffered.top === 'DialogState' && reoffered.dialogId === 'act5_trigger',
    `top=${reoffered.top} id=${reoffered.dialogId}`);
  await clearDialogs();
  const b = await state();
  check('B. and act4_complete is recovered', b.act4 === true, JSON.stringify(b));

  // ── LEG C — a defeat dump must not bank the latch without the content ───
  // `_handleDefeat` calls `_loadRoom('cubicle_farm')` (which emits
  // room-entered, RoomManager.js:101) and then `_autoSave` SYNCHRONOUSLY.
  await arm();
  const legC = await page.evaluate(() => {
    const ex = window.__explore;
    ex._handleDefeat('reception_client');
    return {
      act5t: !!ex.player.getFlag('act5_triggered'),
      act4: !!ex.player.getFlag('act4_complete'),
      room: ex.player.currentRoom,
    };
  });
  console.log(`  immediately after _handleDefeat (this is what it autosaved): ${JSON.stringify(legC)}`);
  check('C. a defeat dump does not bank act5_triggered ahead of the scene',
    legC.act5t === false, `act5_triggered=${legC.act5t}`);
  await page.waitForTimeout(2400);
  const cOffered = await state();
  check('C. and the scene is offered after the respawn',
    cOffered.top === 'DialogState' && cOffered.dialogId === 'act5_trigger',
    `top=${cOffered.top} id=${cOffered.dialogId}`);

  console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAIL(S)'}`);
} finally {
  await browser.close();
}
process.exit(fails === 0 ? 0 : 1);
