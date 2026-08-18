// _q-quiz-play.mjs — headed day-one playthrough for the WORKING STYLE quiz
// (q-run). Garage → reception → cubicle farm → desk → Janet's quiz → team
// intro, through REAL input (held key events; InputManager diffs frames, so
// zero-delay presses are invisible). Screenshots land in screenshots/q-run/.
//
//   node tools/_q-quiz-play.mjs [--port=5199]
//
// Asserts, beyond the stills:
//   - the quiz auto-pushes after andrews_desk sets checked_desk
//   - Escape mid-quiz does NOT leave the dialog (the browser won't close)
//   - the percolator path sets exactly trait_percolator
//   - read_janet_quiz is written when the scene completes
//   - janet_intro serves the trait variant line (@q_ji_pc)

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5199';
const OUT = 'screenshots/q-run';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const tap = async (key = 'Enter', hold = 110) => {
  await page.keyboard.down(key); await page.waitForTimeout(hold); await page.keyboard.up(key);
};
let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fails++;
};
const top = () => page.evaluate(() => {
  const st = window.__explore?.stateManager.stack;
  return st?.[st.length - 1]?.constructor.name || 'none';
});
const flag = (k) => page.evaluate((key) => !!window.__explore?.player.getFlag(key), k);
const dialogText = () => page.evaluate(() => document.querySelector('.dialog-text')?.textContent || document.querySelector('#dialog-box')?.textContent || '');
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });

// Advance a linear dialog until it pops (never used on choice nodes).
const clearDialog = async (max = 40) => {
  for (let i = 0; i < max; i++) {
    if (await top() !== 'DialogState') return true;
    await tap('Enter'); await page.waitForTimeout(340);
  }
  return (await top()) !== 'DialogState';
};

// Drive a dialog by state, not by press-counting: advance prose with Enter;
// when a choice row is up, click the arm whose text matches the next pick.
// (Mouse clicks inside CHOICE_ARM_MS are silently dropped — wait it out.)
const drive = async (picks, { maxSteps = 80, onPrompt = null } = {}) => {
  const remaining = [...picks];
  for (let step = 0; step < maxSteps; step++) {
    if (await top() !== 'DialogState') return remaining.length === 0;
    const st = await page.evaluate(() => {
      const ds = window.__explore.stateManager.stack.slice(-1)[0];
      const box = ds.dialogBox;
      return { choices: !!box?.choicesVisible, arms: box?.choicesVisible ? (box.choices || []).map(c => c.text) : [] };
    });
    if (st.choices) {
      const pi = remaining.findIndex(p => st.arms.some(a => a.includes(p.match)));
      if (pi === -1) { console.log('  drive: no pick matches arms', JSON.stringify(st.arms)); return false; }
      const pick = remaining.splice(pi, 1)[0];
      if (pick.shot) await shot(pick.shot);
      const idx = st.arms.findIndex(a => a.includes(pick.match));
      await page.waitForTimeout(500);          // clear the 260 ms arm delay
      await page.locator('.dialog-choice').nth(idx).click();
      await page.waitForTimeout(600);
      if (remaining.length === 0 && onPrompt === 'stop-after-picks') return true;
    } else {
      await tap('Enter'); await page.waitForTimeout(380);
    }
  }
  return false;
};

// Cross into a neighbouring room through its real exit tile.
const goTo = async (target) => {
  const ok = await page.evaluate((tgt) => {
    const ex = window.__explore;
    const data = ex.roomManager.currentRoom.data;
    const exit = (data.exits || []).find(e => e.targetRoom === tgt);
    if (!exit) return false;
    // stand one tile off the exit, facing it
    const dx = exit.x <= 1 ? 1 : exit.x >= data.width - 2 ? -1 : 0;
    const dz = exit.z <= 1 ? 1 : exit.z >= data.height - 2 ? -1 : 0;
    ex.player.setPosition(exit.x + dx, exit.z + dz, ex.tileMap);
    ex.camera.snapTo(exit.x + dx, exit.z + dz, ex.player.mesh.position.y);
    window.__qExit = exit;
    return true;
  }, target);
  if (!ok) return false;
  const key = await page.evaluate(() => {
    const ex = window.__explore, e = window.__qExit;
    const dx = e.x - ex.player.position.x, dz = e.z - ex.player.position.z;
    return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : (dz > 0 ? 'ArrowDown' : 'ArrowUp');
  });
  for (let i = 0; i < 6; i++) {
    await page.keyboard.down(key); await page.waitForTimeout(260); await page.keyboard.up(key);
    await page.waitForTimeout(420);
    await tap('e');            // exits are interact-driven doors, not triggers
    await page.waitForTimeout(700);
    const room = await page.evaluate(() => window.__explore.player.currentRoom);
    if (room === target) return true;
  }
  const state = await page.evaluate(() => {
    const ex = window.__explore; const st = ex.stateManager.stack;
    return { room: ex.player.currentRoom, top: st[st.length - 1].constructor.name,
      x: ex.player.position.x, z: ex.player.position.z, paused: ex.paused };
  });
  if (state.room !== target) console.log('  goTo diag:', JSON.stringify(state));
  return state.room === target;
};

try {
  await page.goto(`http://localhost:${PORT}/?dev`);
  await page.waitForTimeout(5000);

  // Title → New Game → difficulty screen (NORMAL) → START. The number of
  // Enters varies with the splash, so press until exploration exists.
  for (let i = 0; i < 6; i++) {
    if (await page.evaluate(() => !!window.__explore)) break;
    await tap('Enter'); await page.waitForTimeout(1400);
  }
  await page.waitForFunction(() => !!window.__explore, { timeout: 30000 });
  await page.waitForTimeout(2500);

  check('boot: new game lands in the garage',
    (await page.evaluate(() => window.__explore.player.currentRoom)) === 'parking_garage');
  await shot('01-garage');

  // Garage → reception: the spawn point stands at the elevator ("Ride
  // elevator" prompt). E rides it; any key skips the LED tick.
  await tap('e');
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(600);
    if ((await page.evaluate(() => window.__explore.player.currentRoom)) === 'reception') break;
    await tap('Enter');
  }
  check('ride: garage -> reception',
    (await page.evaluate(() => window.__explore.player.currentRoom)) === 'reception');
  await page.waitForTimeout(1400);
  await clearDialog();   // receptionist_intro (auto-pushed, 400 ms)
  await page.waitForTimeout(400);

  // Reception → cubicle farm.
  check('walk: reception -> cubicle_farm', await goTo('cubicle_farm'));
  await page.waitForTimeout(800);

  // The desk. Interact -> andrews_desk -> quiz auto-push.
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(3, 11, ex.tileMap);
    ex.camera.snapTo(3, 11, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(600);
  await tap('e'); await page.waitForTimeout(700);
  check('desk: andrews_desk opens', await top() === 'DialogState');
  await shot('02-desk-scene');
  await clearDialog();
  check('desk: checked_desk set', await flag('checked_desk'));

  // The quiz pushes itself 500 ms after the desk scene ends.
  await page.waitForTimeout(1400);
  check('quiz: auto-pushed after desk check', await top() === 'DialogState');

  // Unskippable: Escape (twice) must not leave the conversation.
  await tap('Escape'); await page.waitForTimeout(300);
  await tap('Escape'); await page.waitForTimeout(500);
  check('quiz: Escape cannot close the browser tab', await top() === 'DialogState');

  // Percolator path, driven by state: Q1 fresh pot, Q2 full recalibration,
  // the unscored fluorescent question, then Enter through the result page.
  const drove = await drive([
    { match: 'twelve-cup', shot: '03-quiz-q1' },
    { match: 'recalibrate', shot: '03b-quiz-q2' },
    { match: 'longer than I will be', shot: '03c-quiz-last' },
  ], { onPrompt: 'stop-after-picks' });
  check('quiz: percolator path answered', drove);
  // Result page: advance past the progress bar to the verdict, then shoot.
  await tap('Enter'); await page.waitForTimeout(500);
  await tap('Enter'); await page.waitForTimeout(700);
  await shot('04-quiz-result');
  await clearDialog();
  check('quiz: trait_percolator set', await flag('trait_percolator'));
  check('quiz: exactly one trait', !(await flag('trait_advance_reader')) && !(await flag('trait_shock_absorber')));
  check('quiz: read_janet_quiz written on completion', await flag('read_janet_quiz'));

  // Team intro: Janet. The trait variant line must fire before the welcome.
  const janet = await page.evaluate(() => {
    const ex = window.__explore;
    const npc = ex.roomManager.entityManager.npcs.find(n => n.id === 'janet' && n.visible !== false) || null;
    if (!npc) return null;
    const { x, z } = npc.position;
    ex.player.setPosition(Math.round(x), Math.round(z) + 1, ex.tileMap);
    ex.camera.snapTo(Math.round(x), Math.round(z) + 1, ex.player.mesh.position.y);
    return { x, z };
  });
  check('janet: found in cubicle_farm', !!janet);
  await page.waitForTimeout(600);
  await tap('e'); await page.waitForTimeout(800);
  check('janet: dialog opens', await top() === 'DialogState');
  // Advance until the trait variant line is on screen, shoot it.
  let sawVariant = false;
  for (let i = 0; i < 8 && !sawVariant; i++) {
    await tap('Enter'); await page.waitForTimeout(520);
    const line = await dialogText();
    if (/Percolator/.test(line)) {
      sawVariant = true;
      await tap('Enter'); await page.waitForTimeout(300);   // finish typewriter
      await shot('05-janet-variant');
    }
  }
  check('janet: PERCOLATOR variant fires', sawVariant, await dialogText());
  // Leave through her ask.
  check('janet: left via her menu', await drive([{ match: 'I should get going' }]));
  check('janet: met_janet set', await flag('met_janet'));

  // Stats tab: Working Style row.
  await tap('Escape'); await page.waitForTimeout(900);
  const statsOpen = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    return st[st.length - 1]?.constructor.name;
  });
  check('menu: opens', statsOpen === 'MenuState');
  // Walk the cursor to the Stats row and open the overlay.
  for (let i = 0; i < 7; i++) { await tap('ArrowDown'); await page.waitForTimeout(150); }
  await tap('Enter'); await page.waitForTimeout(900);
  const hasRow = await page.evaluate(() => /Working Style/.test(document.body.innerHTML) && /The Percolator/.test(document.body.innerHTML));
  check('menu: Working Style row shows The Percolator', hasRow);
  await shot('06-stats-workstyle');

  console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
} catch (err) {
  console.error('HARNESS ERROR:', err.message);
  await shot('99-error');
  fails++;
} finally {
  await browser.close();
  process.exit(fails === 0 ? 0 : 1);
}
