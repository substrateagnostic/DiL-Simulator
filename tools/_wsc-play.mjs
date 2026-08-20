// _wsc-play.mjs — headed evidence harness for the WORKING-STYLE CHECK pilot.
//
// Plays every check site BOTH ways — as the trait's holder and as a
// non-holder — through the shipping DialogState machinery (the
// _g-cut-shoot precedent: dialog pushed via the same DialogState
// constructor ExplorationState uses, then driven with real key events and
// real clicks). Asserts, per site:
//   - the arm renders [WORKING STYLE — <TRAIT>] for holders and
//     [WORKING STYLE CHECK — FAILED] + the authored fail text for everyone
//     else, and BOTH are selectable;
//   - THE SAVE-KEY LAW: holder and non-holder write the SAME
//     _chose_<dialogId>_<node>_<choice> key;
//   - pass writes its check_*_passed flag (and bm_true_push at site A);
//     fail writes none of them; spend flags land on both branches where
//     authored;
//   - a spent row does not re-offer;
//   - the Unchipped Mug unlocks off check_freshpot_passed, equips through
//     Player.equipCosmetic, renders in the Fitting Room (WardrobeState
//     'stage'), and survives a serialize/deserialize round trip with the
//     _chose_ key.
//
// Needs `npm run dev` up. Usage: node tools/_wsc-play.mjs [--port=5199]
// Stills into screenshots/wsc-run/.

import { chromium } from 'playwright';
import fs from 'node:fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5199';
const OUT = 'screenshots/wsc-run';
fs.mkdirSync(OUT, { recursive: true });

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fails++;
};

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });

// InputManager diffs key state between frames — hold every tap (CLAUDE.md).
async function tap(page, key, hold = 140) {
  await page.keyboard.down(key);
  await page.waitForTimeout(hold);
  await page.keyboard.up(key);
  await page.waitForTimeout(90);
}

async function boot(fixture, room, traits) {
  const page = await context.newPage();
  await page.goto(`http://localhost:${PORT}/?dev&fixture=${fixture}&shot=${room}&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 90000 });
  await page.evaluate((set) => {
    const p = window.__explore.player;
    for (const t of ['trait_advance_reader', 'trait_shock_absorber', 'trait_percolator']) {
      p.flags[t] = false;
    }
    for (const t of set) p.setFlag(t, true);
  }, traits);
  return page;
}

async function pushDialog(page, id) {
  await page.evaluate(async (dialogId) => {
    const ex = window.__explore;
    const [{ DialogState }, { DIALOGS }] = await Promise.all([
      import('/src/states/DialogState.js'),
      import('/src/data/dialogs/index.js'),
    ]);
    ex.stateManager.push(new DialogState(DIALOGS[dialogId], ex.player, ex.stateManager, dialogId));
  }, id);
  await page.waitForTimeout(400);
}

function dsState(page) {
  return page.evaluate(() => {
    const stack = window.__explore.stateManager.stack;
    const top = stack[stack.length - 1];
    if (!top || !top.dialogTree) return null;
    return {
      index: top.currentIndex,
      choices: top.dialogBox?.choicesVisible
        ? [...document.querySelectorAll('.dialog-choice')].map(el => el.textContent.replace(/^[·>]\s*/, '').trim())
        : null,
    };
  });
}

// Spam Enter through text/stage nodes until the dialog stands at `index` with
// choices visible (Enter at an intermediate ask commits its cursor row, which
// for every ask on these routes is a safe arm-0).
async function advanceTo(page, index, maxPresses = 80) {
  for (let i = 0; i < maxPresses; i++) {
    const s = await dsState(page);
    if (!s) return null;
    if (s.index === index && s.choices) return s;
    await tap(page, 'Enter');
  }
  return null;
}

// Click the nth choice row, waiting out DialogBox's 260 ms CHOICE_ARM_MS —
// a click inside the window is silently DROPPED (CLAUDE.md harness gotcha).
async function clickChoice(page, nth) {
  await page.waitForTimeout(420);
  const rows = page.locator('.dialog-choice');
  await rows.nth(nth).click();
  await page.waitForTimeout(350);
}

const flag = (page, name) => page.evaluate(n => !!window.__explore.player.getFlag(n), name);

const PASS_A = '[WORKING STYLE — SHOCK ABSORBER]';
const PASS_B = '[WORKING STYLE — ADVANCE READER]';
const PASS_C = '[WORKING STYLE — PERCOLATOR]';
const FAILP = '[WORKING STYLE CHECK — FAILED]';

// ════ RUN B1 — board meeting as THE SHOCK ABSORBER ═══════════════════════
{
  console.log('\n── RUN B1: board_meeting, holder of trait_shock_absorber ──');
  const page = await boot('act6', 'board_room', ['trait_shock_absorber']);
  await pushDialog(page, 'board_meeting');

  const c32 = await advanceTo(page, 32);
  check('B1 reaches Block C ask (node 32)', !!c32);
  check('B1 Block C has 4 rows', c32?.choices?.length === 4, `got ${c32?.choices?.length}`);
  check('B1 absorb row carries the pass prefix', !!c32?.choices?.[3]?.startsWith(PASS_A), c32?.choices?.[3]);
  await page.screenshot({ path: `${OUT}/A-holder-choices.png` });

  await clickChoice(page, 3);
  const s = await dsState(page);
  check('B1 pass routes to ws_absorb_pass (195)', s?.index >= 195 && s?.index <= 201, `index ${s?.index}`);
  check('B1 pass writes check_absorb_passed', await flag(page, 'check_absorb_passed'));
  check('B1 pass writes bm_true_push (a true thing)', await flag(page, 'bm_true_push'));
  check('B1 writes _chose_board_meeting_32_3', await flag(page, '_chose_board_meeting_32_3'));
  await tap(page, 'Enter'); // land the first branch line for the still
  await page.screenshot({ path: `${OUT}/A-pass-branch.png` });

  const c48 = await advanceTo(page, 48);
  check('B1 pass branch lands on the floor (node 48)', !!c48);
  const bylawsRow = c48?.choices?.findIndex(t => t.includes('bylaws'));
  check('B1 bylaws row shows the FAILED prefix to a Shock Absorber',
    bylawsRow >= 0 && c48.choices[bylawsRow].startsWith(FAILP), c48?.choices?.[bylawsRow]);
  check('B1 bylaws fail text is the authored joke',
    !!c48?.choices?.[bylawsRow]?.includes('page twenty-six'), c48?.choices?.[bylawsRow]);
  await page.screenshot({ path: `${OUT}/B-nonholder-choices.png` });

  await clickChoice(page, bylawsRow);
  const s2 = await dsState(page);
  check('B1 bylaws fail routes to ws_bylaws_fail (211)', s2?.index >= 211 && s2?.index <= 213, `index ${s2?.index}`);
  check('B1 bylaws fail spends bm_bylaws_done', await flag(page, 'bm_bylaws_done'));
  check('B1 bylaws fail does NOT write check_bylaws_passed', !(await flag(page, 'check_bylaws_passed')));
  await page.screenshot({ path: `${OUT}/B-fail-branch.png` });

  const c48b = await advanceTo(page, 48);
  check('B1 spent bylaws row does not re-offer', !!c48b && !c48b.choices.some(t => t.includes('bylaws')));
  await page.close();
}

// ════ RUN B2 — board meeting as THE ADVANCE READER ═══════════════════════
{
  console.log('\n── RUN B2: board_meeting, holder of trait_advance_reader ──');
  const page = await boot('act6', 'board_room', ['trait_advance_reader']);
  await pushDialog(page, 'board_meeting');

  const c32 = await advanceTo(page, 32);
  check('B2 absorb row shows the FAILED prefix to an Advance Reader',
    !!c32?.choices?.[3]?.startsWith(FAILP), c32?.choices?.[3]);
  check('B2 absorb fail text is the authored joke',
    !!c32?.choices?.[3]?.includes('Hope the rest writes itself'), c32?.choices?.[3]);
  await page.screenshot({ path: `${OUT}/A-nonholder-choices.png` });

  await clickChoice(page, 3);
  const s = await dsState(page);
  check('B2 fail routes to ws_absorb_fail (202)', s?.index >= 202 && s?.index <= 204, `index ${s?.index}`);
  check('B2 fail writes NO pass flag', !(await flag(page, 'check_absorb_passed')));
  check('B2 fail writes NO bm_true_push', !(await flag(page, 'bm_true_push')));
  check('B2 writes the SAME _chose_board_meeting_32_3 key (save-key law)',
    await flag(page, '_chose_board_meeting_32_3'));
  await tap(page, 'Enter');
  await page.screenshot({ path: `${OUT}/A-fail-branch.png` });

  const c48 = await advanceTo(page, 48);
  const bylawsRow = c48?.choices?.findIndex(t => t.includes('bylaws'));
  check('B2 bylaws row carries the pass prefix', bylawsRow >= 0 && c48.choices[bylawsRow].startsWith(PASS_B),
    c48?.choices?.[bylawsRow]);
  await page.screenshot({ path: `${OUT}/B-holder-choices.png` });

  await clickChoice(page, bylawsRow);
  const s2 = await dsState(page);
  check('B2 bylaws pass routes to ws_bylaws_pass (205)', s2?.index >= 205 && s2?.index <= 210, `index ${s2?.index}`);
  check('B2 bylaws pass writes check_bylaws_passed', await flag(page, 'check_bylaws_passed'));
  check('B2 bylaws pass spends bm_bylaws_done', await flag(page, 'bm_bylaws_done'));
  await tap(page, 'Enter');
  await page.screenshot({ path: `${OUT}/B-pass-branch.png` });

  const c48b = await advanceTo(page, 48);
  check('B2 spent bylaws row does not re-offer', !!c48b && !c48b.choices.some(t => t.includes('bylaws')));
  await page.close();
}

// ════ RUN C1 — team huddle as THE PERCOLATOR (+ the mug) ═════════════════
{
  console.log('\n── RUN C1: team_chat_hub, holder of trait_percolator ──');
  const page = await boot('act5', 'break_room', ['trait_percolator']);

  const routed = await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.party = ex.player.party?.length ? ex.player.party : ['janet'];
    return ex._getInteractableDialogId({ dialogId: 'water_cooler' });
  });
  check('C1 water cooler routes to team_chat_hub with a party', routed === 'team_chat_hub', routed);

  await pushDialog(page, 'team_chat_hub');
  const c0 = await advanceTo(page, 0);
  const row = c0?.choices?.findIndex(t => t.includes('coffee') || t.includes('machine'));
  check('C1 freshpot row carries the pass prefix', row >= 0 && c0.choices[row].startsWith(PASS_C), c0?.choices?.[row]);
  await page.screenshot({ path: `${OUT}/C-holder-choices.png` });

  await clickChoice(page, row);
  const s = await dsState(page);
  check('C1 pass routes to ws_freshpot_pass (120)', s?.index >= 120 && s?.index <= 126, `index ${s?.index}`);
  check('C1 pass writes check_freshpot_passed', await flag(page, 'check_freshpot_passed'));
  check('C1 pass spends check_freshpot_done', await flag(page, 'check_freshpot_done'));
  check('C1 writes _chose_team_chat_hub_0_13', await flag(page, '_chose_team_chat_hub_0_13'));
  await tap(page, 'Enter');
  await page.screenshot({ path: `${OUT}/C-pass-branch.png` });

  const c0b = await advanceTo(page, 0);
  check('C1 spent freshpot row does not re-offer',
    !!c0b && !c0b.choices.some(t => t.includes('machine has terms')));

  // The mug: unlock, equip, serialize round trip.
  const mug = await page.evaluate(async () => {
    const p = window.__explore.player;
    const unlocked = p.isCosmeticUnlocked('unchipped_mug');
    const equipped = p.equipCosmetic('unchipped_mug');
    const { Player } = await import('/src/entities/Player.js');
    const p2 = new Player();
    p2.deserialize(JSON.parse(JSON.stringify(p.serialize())));
    return {
      unlocked,
      equipped,
      slot: p.equipped.accessory,
      rtChose: !!p2.getFlag('_chose_team_chat_hub_0_13'),
      rtPassed: !!p2.getFlag('check_freshpot_passed'),
      rtUnlocked: p2.isCosmeticUnlocked('unchipped_mug'),
      rtEquipped: p2.equipped.accessory,
    };
  });
  check('C1 mug unlocks off check_freshpot_passed', mug.unlocked === true);
  check('C1 mug equips into the accessory slot', mug.equipped === true && mug.slot === 'unchipped_mug');
  check('C1 round trip keeps the _chose_ key', mug.rtChose);
  check('C1 round trip keeps check_freshpot_passed + unlock', mug.rtPassed && mug.rtUnlocked === true);
  check('C1 round trip keeps the equip', mug.rtEquipped === 'unchipped_mug');

  // Leave the hub through its own exit row, then open the Fitting Room.
  const cExit = await advanceTo(page, 0);
  const exitRow = cExit?.choices?.findIndex(t => t.includes('Get back to work'));
  if (exitRow >= 0) await clickChoice(page, exitRow);
  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    const ex = window.__explore;
    const { WardrobeState } = await import('/src/states/WardrobeState.js');
    ex.stateManager.push(new WardrobeState(ex.stateManager, ex.player, { dressing: 'stage' }));
  });
  await page.waitForTimeout(1600);
  const card = await page.evaluate(() =>
    [...document.querySelectorAll('.wd-card')].map(el => el.textContent).find(t => t.includes('Unchipped')));
  check('C1 Fitting Room lists The Unchipped Mug', !!card, card);
  check('C1 Fitting Room card shows WORN', !!card && card.includes('WORN'), card);
  await page.screenshot({ path: `${OUT}/C-mug-fitting-room.png` });
  await page.close();
}

// ════ RUN C2 — team huddle with NO trait (legacy-save shape) ═════════════
{
  console.log('\n── RUN C2: team_chat_hub, no trait at all (legacy save) ──');
  const page = await boot('act5', 'break_room', []);
  await pushDialog(page, 'team_chat_hub');
  const c0 = await advanceTo(page, 0);
  const row = c0?.choices?.findIndex(t => t.includes('coffee') || t.includes('machine'));
  check('C2 freshpot row shows the FAILED prefix with no trait', row >= 0 && c0.choices[row].startsWith(FAILP),
    c0?.choices?.[row]);
  check('C2 fail text is the authored joke', !!c0?.choices?.[row]?.includes('Odds are roughly even'), c0?.choices?.[row]);
  await page.screenshot({ path: `${OUT}/C-nonholder-choices.png` });

  await clickChoice(page, row);
  const s = await dsState(page);
  check('C2 fail routes to ws_freshpot_fail (127)', s?.index >= 127 && s?.index <= 131, `index ${s?.index}`);
  check('C2 fail spends check_freshpot_done', await flag(page, 'check_freshpot_done'));
  check('C2 fail does NOT write check_freshpot_passed', !(await flag(page, 'check_freshpot_passed')));
  const mugLocked = await page.evaluate(() => window.__explore.player.isCosmeticUnlocked('unchipped_mug'));
  check('C2 mug stays locked on a fail', mugLocked === false || mugLocked === undefined, String(mugLocked));
  await tap(page, 'Enter');
  await page.screenshot({ path: `${OUT}/C-fail-branch.png` });
  await page.close();
}

await browser.close();
console.log(fails === 0 ? '\nALL CHECKS PASS' : `\n${fails} FAILURES`);
process.exit(fails ? 1 : 0);
