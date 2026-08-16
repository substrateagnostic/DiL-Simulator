// P8 shipping-path regression gate: an interrupted delayed story scene must be
// re-served after a real page reload, then become one-shot only after it ends.
//
// The harness expects an already-running Vite server. It uses the dev fixture
// only to create exact pre-trigger state; triggering, saving, page reload,
// TitleState -> Load Game, DialogState completion, and the final reload all use
// shipping paths.
//
// Usage: node tools/_dr-latch-interrupt.mjs [--port=5173] [--headed]

import { chromium } from 'playwright';
import { TRIGGERS } from '../src/data/story/graph.js';

const PORT = process.argv.find(arg => arg.startsWith('--port='))?.slice(7) || '5173';
const HEADED = process.argv.includes('--headed');
const BASE = `http://localhost:${PORT}`;

const converted = [
  {
    id: 'archive-security-entry', oldOnce: 'flag:visited_archive', record: 'visited_archive',
    scene: 'security_guard_combat', startRoom: 'stairwell', targetRoom: 'archive',
    flags: { archive_accessible: true }, action: 'room',
  },
  {
    id: 'data-analytics-duo-entry', oldOnce: 'flag:data_lead_fight_started',
    record: 'data_lead_fight_started', scene: 'data_analytics_duo_intro',
    startRoom: 'server_room', targetRoom: 'executive_floor', action: 'room',
    flags: {
      branch_chosen: true, path_legal: true, regional_defeated: true,
      act4_complete: true, corporate_lawyer_defeated: true,
    },
  },
  {
    id: 'alex-it-recruit-entry', oldOnce: 'flag:alex_it_recruit_offered',
    record: 'alex_it_recruit_offered', scene: 'alex_it_recruit',
    startRoom: 'cubicle_farm', targetRoom: 'server_room', action: 'room',
    flags: { act4_complete: true, restructuring_trio_defeated: true },
  },
  {
    id: 'penthouse-arrival', oldOnce: 'flag:penthouse_entered', record: 'penthouse_entered',
    scene: 'penthouse_arrival', startRoom: 'executive_floor', targetRoom: 'penthouse',
    action: 'room', flags: {
      act6_complete: true, charter_certified: true, read_cfos_assistant_combat: true,
    },
  },
  {
    id: 'restructuring-trio-update', oldOnce: 'flag:restructuring_trio_started',
    record: 'restructuring_trio_started', scene: 'restructuring_trio_intro',
    startRoom: 'cubicle_farm', action: 'update', flags: { act4_complete: true },
  },
  {
    id: 'chief-restructuring-update', oldOnce: 'flag:chief_fight_started',
    record: 'chief_fight_started', scene: 'chief_restructuring_combat',
    startRoom: 'executive_floor', action: 'update',
    flags: { act4_complete: true, data_lead_defeated: true, regional_defeated: true },
  },
  {
    id: 'karen-first-loss', oldOnce: 'flag:retry_karen', record: 'retry_karen',
    scene: 'karen_first_loss_tutorial', startRoom: 'cubicle_farm', action: 'karen-loss',
    flags: { briefing_complete: true },
  },
  {
    id: 'firm-ambush-chain', oldOnce: 'flag:has_recorder_seal', record: 'has_recorder_seal',
    scene: 'the_firm_ambush', startRoom: 'old_vault', action: 'pending-flag',
    flags: { act5_complete: true },
  },
  {
    id: 'cfos-assistant-chain', oldOnce: 'flag:penthouse_entered', record: 'penthouse_entered',
    scene: 'cfos_assistant_combat', startRoom: 'penthouse', action: 'pending-flag',
    flags: { act6_complete: true, charter_certified: true, read_penthouse_arrival: true },
  },
  {
    id: 'regional-director-chain', oldOnce: 'flag:cfos_defeated', record: 'cfos_defeated',
    scene: 'regional_director_combat', startRoom: 'penthouse', action: 'pending-flag',
    flags: {
      act6_complete: true, charter_certified: true, penthouse_entered: true,
      read_penthouse_arrival: true, read_cfos_assistant_combat: true,
    },
  },
  {
    id: 'algorithm-chain', oldOnce: 'flag:regional_director_defeated',
    record: 'regional_director_defeated', scene: 'algorithm_combat',
    startRoom: 'penthouse', action: 'pending-flag', flags: {
      act6_complete: true, charter_certified: true, penthouse_entered: true,
      cfos_defeated: true, read_penthouse_arrival: true,
      read_cfos_assistant_combat: true, read_regional_director_combat: true,
    },
  },
  // The ending and post-credits cases stand in the PENTHOUSE, so they must
  // carry the whole penthouse chain's read flags the way algorithm-chain above
  // does. Without them the reload re-offers penthouse_arrival / the CFO fight —
  // correctly, that is the P8 repair working — and it lands on top of the scene
  // under test, so waitForDialog times out on a game that is behaving. Same law
  // as CLAUDE.md's CAPTURE LAW: a fixture that jumps past a scene must set that
  // scene's flags, or it is not reproducing a reachable state.
  ...['cooperative', 'compromise', 'dissolution', 'architect'].map(ending => ({
    id: `ending-${ending}-chain`, oldOnce: `flag:ending_${ending}`,
    record: `ending_${ending}`, scene: `ending_${ending}`,
    startRoom: 'penthouse', action: 'flag',
    flags: {
      act6_complete: true, charter_certified: true, algorithm_defeated: true,
      penthouse_entered: true, cfos_defeated: true, regional_director_defeated: true,
      read_penthouse_arrival: true, read_cfos_assistant_combat: true,
      read_regional_director_combat: true, read_algorithm_combat: true,
      read_post_credits: true,
    },
  })),
  ...['cooperative', 'compromise', 'dissolution', 'architect'].map(ending => ({
    id: `post-credits-after-${ending}`, oldOnce: `flag:read_ending_${ending}`,
    record: `read_ending_${ending}`, scene: 'post_credits',
    startRoom: 'penthouse', action: 'flag',
    flags: {
      act6_complete: true, charter_certified: true, algorithm_defeated: true,
      penthouse_entered: true, cfos_defeated: true, regional_director_defeated: true,
      read_penthouse_arrival: true, read_cfos_assistant_combat: true,
      read_regional_director_combat: true, read_algorithm_combat: true,
      // `ending_<x>` is deliberately NOT pre-set: it would arm the ending-chain
      // trigger, whose scene would then replay on the reload and land on top of
      // post_credits. The harness sets read_ending_<x> itself as the record.
    },
  })),
];

const historicalAct5 = {
  id: 'HISTORICAL act5-trigger interrupt', oldOnce: 'flag:act5_triggered',
  record: 'act5_triggered', scene: 'act5_trigger', startRoom: 'archive',
  targetRoom: 'cubicle_farm', action: 'historical-act5', flags: {},
};

const triggerById = new Map(TRIGGERS.map(trigger => [trigger.id, trigger]));
// A reArmOnDefeat row only stays served-once once its payoff has landed; the
// harness must therefore hand assertNoThirdServe the grants a win would set.
for (const test of converted) {
  const trigger = triggerById.get(test.id);
  if (trigger?.reArmOnDefeat && trigger.grants?.length) test.reArmGrants = trigger.grants;
}
const expectedIds = new Set(converted.map(test => test.id));
const missing = converted.filter(test => !triggerById.has(test.id));
const wrongOnce = converted.filter(test => triggerById.get(test.id)?.once !== 'scene');
const uncoveredFlagRows = TRIGGERS.filter(trigger => trigger.once?.startsWith('flag:'));
if (missing.length || wrongOnce.length || uncoveredFlagRows.length || expectedIds.size !== converted.length) {
  console.error('HARNESS/GRAPH COVERAGE FAILURE', {
    missing: missing.map(row => row.id),
    wrongOnce: wrongOnce.map(row => row.id),
    uncoveredFlagRows: uncoveredFlagRows.map(row => row.id),
    duplicateCaseIds: expectedIds.size !== converted.length,
  });
  process.exit(1);
}

const browser = await chromium.launch({ headless: !HEADED });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', error => console.log(`PAGEERROR ${error.message}`));

const tap = async (key = 'Enter') => {
  await page.keyboard.down(key);
  await page.waitForTimeout(70);
  await page.keyboard.up(key);
  await page.waitForTimeout(180);
};

const stackState = () => page.evaluate(() => {
  const ex = window.__explore;
  const stack = ex?.stateManager?.stack || [];
  const top = stack[stack.length - 1];
  return {
    room: ex?.player?.currentRoom || null,
    top: top?.constructor?.name || null,
    dialogId: top?.dialogId || null,
    dialogs: stack.filter(state => state?.constructor?.name === 'DialogState')
      .map(state => state.dialogId),
  };
});

async function bootFixture(test) {
  await page.goto(`${BASE}/?dev`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/?dev&shot=${encodeURIComponent(test.startRoom)}&qtier=low`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });

  await page.evaluate(async testRow => {
    const ex = window.__explore;
    while (ex.stateManager.stack.length > 1) ex.stateManager.pop();
    ex._pendingDialog = null;
    ex._pendingCombat = null;
    ex._storyTriggerClaims.clear();
    ex._act5Pushed = false;

    if (testRow.action === 'historical-act5') {
      // Exact fixture from tools/_r-act5latch.mjs: the shipped act5 preset
      // minus the two flags produced by act5_trigger itself.
      const { DEV_PRESETS } = await import('/src/ui/DevPanel.js');
      const preset = DEV_PRESETS.find(item => item.key === 'act5');
      ex.player.flags = { ...preset.flags };
      ex.player.flags.visited_archive = true;
      ex.player.flags.archive_found = true;
      ex.player.flags.security_guard_info = true;
      ex.player.flags.defeated_security_guard = true;
      delete ex.player.flags.act4_complete;
      delete ex.player.flags.act5_triggered;
      delete ex.player.flags.read_act5_trigger;
    } else {
      ex.player.flags = { ...testRow.flags };
      delete ex.player.flags[testRow.record];
      delete ex.player.flags[`read_${testRow.scene}`];
    }

    ex.player.flags.__dr_latch_case = testRow.id;
    ex.player.currentRoom = testRow.startRoom;
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    ex._loadRoom(testRow.startRoom);
    ex._autoSave(false);
  }, test);
}

async function fireShippingTrigger(test) {
  if (test.action === 'room' || test.action === 'historical-act5') {
    await page.evaluate(testRow => {
      void window.__explore._changeRoom(testRow.targetRoom, 5, 10);
    }, test);
  } else if (test.action === 'flag' || test.action === 'pending-flag') {
    await page.evaluate(async testRow => {
      const ex = window.__explore;
      ex.player.setFlag(testRow.record, true);
      if (testRow.action === 'pending-flag') {
        const { EventBus } = await import('/src/core/EventBus.js');
        EventBus.emit('dialog-end');
      }
    }, test);
  } else if (test.action === 'karen-loss') {
    await page.evaluate(() => { void window.__explore._startCombat('karen'); });
    await page.waitForFunction(() => {
      const stack = window.__explore.stateManager.stack;
      return stack[stack.length - 1]?.constructor?.name === 'CombatState';
    }, { timeout: 15000 });
    await page.evaluate(() => {
      const stack = window.__explore.stateManager.stack;
      stack[stack.length - 1]._endCombat('defeat');
    });
  } else if (test.action !== 'update') {
    throw new Error(`Unknown action ${test.action}`);
  }

  await page.waitForFunction(record => window.__explore.player.getFlag(record) === true,
    test.record, { timeout: 15000 });
  // Update-driven pushes write after the room autosave. Use the shipping save
  // method at the observed latch edge so every case has the same crash image.
  return page.evaluate(testRow => {
    const ex = window.__explore;
    ex._autoSave(false);
    const stack = ex.stateManager.stack;
    const top = stack[stack.length - 1];
    const raw = JSON.parse(localStorage.getItem('trust_issues_save_3'));
    return {
      recordLive: !!ex.player.getFlag(testRow.record),
      recordSaved: !!raw?.flags?.[testRow.record],
      readLive: !!ex.player.getFlag(`read_${testRow.scene}`),
      top: top?.constructor?.name || null,
      dialogId: top?.dialogId || null,
    };
  }, test);
}

async function reloadThroughLoadGame(test) {
  await page.evaluate(() => {
    history.replaceState(null, '', `${location.pathname}?dev`);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const load = page.locator('.title-menu-item', { hasText: 'Load Game' });
  await load.waitFor({ timeout: 30000 });
  await load.click();
  const slot = page.locator('.save-slot-card', { hasText: 'SLOT 3' });
  await slot.waitFor({ timeout: 10000 });
  await slot.click();
  await page.waitForFunction(caseId => window.__explore?.player?.flags?.__dr_latch_case === caseId,
    test.id, { timeout: 30000 });
}

async function waitForDialog(scene, timeout) {
  await page.waitForFunction(sceneId => {
    const stack = window.__explore?.stateManager?.stack || [];
    const top = stack[stack.length - 1];
    return top?.constructor?.name === 'DialogState' && top.dialogId === sceneId;
  }, scene, { timeout });
}

async function playDialogToEnd(test) {
  for (let press = 0; press < 140; press++) {
    const state = await stackState();
    if (!state.dialogs.includes(test.scene)) {
      return page.evaluate(scene => !!window.__explore.player.getFlag(`read_${scene}`), test.scene);
    }
    await tap();
  }
  return false;
}

async function assertNoThirdServe(test) {
  await page.evaluate(testRow => {
    const ex = window.__explore;
    // Keep downstream scenes from obscuring the target assertion. These are
    // harness-only fixture flags, assigned without emitting story events.
    if (testRow.scene.startsWith('ending_')) ex.player.flags.read_post_credits = true;
    if (testRow.scene === 'penthouse_arrival') ex.player.flags.read_cfos_assistant_combat = true;
    if (testRow.scene === 'act5_trigger') ex.player.flags.read_restructuring_trio_intro = true;
    // "NEVER AGAIN" IS ONLY TRUE OF A SCENE THAT PAID OUT. This leg plays the
    // dialog to its end but never fights the fight it starts, and for a
    // `reArmOnDefeat` row that is indistinguishable from a loss — so
    // `_reconcileSceneLatches` correctly clears read_<scene> and offers it
    // again. That is the repair working, not a defect; asserting otherwise
    // would be asserting the soft-lock is correct. Land the grant first, then
    // assert never-again, which is the state a WIN produces.
    if (testRow.reArmGrants) for (const flag of testRow.reArmGrants) ex.player.flags[flag] = true;
    ex._autoSave(false);
  }, test);
  await reloadThroughLoadGame(test);
  const delay = triggerById.get(test.id)?.delayMs || (test.scene === 'act5_trigger' ? 800 : 2000);
  await page.waitForTimeout(delay + 1200);
  const state = await stackState();
  return { ok: !state.dialogs.includes(test.scene), state };
}

let failures = 0;
async function runCase(test) {
  try {
    await bootFixture(test);
    const interrupted = await fireShippingTrigger(test);
    const interruptedOk = interrupted.recordLive && interrupted.recordSaved
      && !interrupted.readLive && interrupted.dialogId !== test.scene;
    if (!interruptedOk) throw new Error(`interrupt window not captured: ${JSON.stringify(interrupted)}`);

    await reloadThroughLoadGame(test);
    const trigger = triggerById.get(test.id);
    await waitForDialog(test.scene, (trigger?.delayMs || 800) + 15000);
    const replay = await stackState();
    const completed = await playDialogToEnd(test);
    if (!completed) throw new Error(`scene did not complete/read: ${JSON.stringify(await stackState())}`);
    const third = await assertNoThirdServe(test);
    if (!third.ok) throw new Error(`scene served a third time: ${JSON.stringify(third.state)}`);

    console.log(`PASS  ${test.id} | ${test.oldOnce} -> scene | interrupted=unread/saved | re-served=${replay.dialogId} | completed=read_${test.scene} | third=blocked`);
  } catch (error) {
    failures++;
    console.log(`FAIL  ${test.id} | ${error.message}`);
  }
}

// ── LEG 4: A LOST FIGHT MUST BE RE-ARMED ───────────────────────────────────
// The three legs above are arm -> interrupt -> re-served -> played -> NOT
// served a third time. That last assertion is correct for a scene the player
// FINISHED and dead wrong for one they LOST: `read_<scene>` is written when the
// dialog ends, which for a scene whose last action is `fight` is before the
// fight is entered, and nothing clears it. Four trigger scenes start an
// encounter with no NPC and no interactable anywhere in rooms/index.js, so one
// defeat would strand their grants for the life of the save — between them the
// sole writers of corporate_lawyer_defeated, data_lead_defeated,
// board_room_accessible and charter_certified, i.e. Acts 5, 6 and 7.
// The graph declares `reArmOnDefeat` on those rows and
// `_reconcileSceneLatches` honours it at LOAD and on DEFEAT. This leg drives
// the shipping defeat path and asserts the scene comes back.
async function runDefeatRearm() {
  const rows = await page.evaluate(async () => {
    const { TRIGGERS } = await import('/src/data/story/graph.js');
    const ex = window.__explore;
    const out = [];
    for (const trigger of TRIGGERS.filter(t => t.reArmOnDefeat && t.grants?.length)) {
      while (ex.stateManager.stack.length > 1) ex.stateManager.pop();
      // Exactly the state a defeat leaves: the scene was read, the payoff did not land.
      ex.player.flags[`read_${trigger.scene}`] = true;
      for (const flag of trigger.grants) ex.player.flags[flag] = false;
      const before = !!ex.player.getFlag(`read_${trigger.scene}`);
      ex._handleDefeat('reception_client');
      ex.syncFromPlayerState();
      out.push({
        id: trigger.id, scene: trigger.scene, grants: trigger.grants,
        before, after: !!ex.player.getFlag(`read_${trigger.scene}`),
        offerable: ex._storyTriggerOnceAvailable(trigger.id),
      });
    }
    return out;
  });
  if (!rows.length) { failures++; console.log('FAIL  defeat-rearm | no reArmOnDefeat trigger rows found — the leg would silently pass'); return; }
  for (const row of rows) {
    const ok = row.before && !row.after && row.offerable;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  DEFEAT RE-ARM ${row.id} | read_${row.scene} ${row.before} -> ${row.after} | re-offerable=${row.offerable} | protects ${row.grants.join(', ')}`);
  }
}

try {
  for (const test of converted) await runCase(test);
  await runCase(historicalAct5);
  await runDefeatRearm();
  console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAIL(S)`} — ${converted.length} converted trigger(s) + historical act5_trigger + the defeat re-arm leg`);
} finally {
  await browser.close();
}

process.exit(failures === 0 ? 0 : 1);
