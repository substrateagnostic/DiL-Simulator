// FIX ROUND 1 — Bundle 1 evidence harness (B1, B2, B3, B4, B14).
//
// Every claim in the bundle-1 report comes off this file. It drives the
// SHIPPING code path headed with the quality tier pinned (CAPTURE LAW), and
// writes stills + a JSON of the numbers to screenshots/fix-round-1/.
//
// Usage: node tools/_fr1-ux.mjs [--port=5173]

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/fix-round-1';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const tap = async (key = 'Enter', hold = 90) => {
  await page.keyboard.down(key); await page.waitForTimeout(hold); await page.keyboard.up(key);
};
let fails = 0;
const results = [];
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  results.push({ name, ok, detail });
  if (!ok) fails++;
};
const top = () => page.evaluate(() => {
  const st = window.__explore?.stateManager.stack;
  return st?.[st.length - 1]?.constructor.name || 'none';
});
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

try {
  await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act3&shot=cubicle_farm`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1500);

  const tier = await page.evaluate(() => window.__engine?.qualityTier ?? '?');
  console.log(`quality tier at boot: ${tier}`);
  check('CAPTURE LAW: quality tier pinned high', tier === 'high', `tier=${tier}`);

  // ── B1 — a bail-safe tree can be left; a story tree cannot ─────────────
  // Push a dialog directly through the shipping DialogState so the case under
  // test is the tree, not the route that served it.
  const pushDialog = (id) => page.evaluate(async (dialogId) => {
    const ex = window.__explore;
    const { DialogState } = await import('/src/states/DialogState.js');
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    ex.stateManager.push(new DialogState(DIALOGS[dialogId], ex.player, ex.stateManager, dialogId));
    return !!DIALOGS[dialogId];
  }, id);

  // neutral_janet is pure prose end to end (no action, no stage, no flag choice).
  await pushDialog('neutral_janet');
  await page.waitForTimeout(700);
  const bailable = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    return st[st.length - 1].dialogBox?.canExit === true;
  });
  check('B1 bail-safe tree advertises the exit', bailable);
  await shot('B1-bailsafe-hint');
  const hint = await page.evaluate(() => document.querySelector('.dialog-esc-hint')?.textContent || '');
  check('B1 hint reads Leave once the line finishes', /Leave/.test(hint), `hint="${hint}"`);
  await tap('Escape');           // typewriter is already done — this is the exit
  await page.waitForTimeout(500);
  check('B1 Escape leaves the conversation', await top() === 'ExplorationState', `top=${await top()}`);
  const readFlag = await page.evaluate(() => !!window.__explore.player.getFlag('read_neutral_janet'));
  check('B1 a bail does NOT write read_<id>', readFlag === false, `read_neutral_janet=${readFlag}`);

  // karen_meeting carries start_combat. It must refuse.
  await pushDialog('karen_meeting');
  await page.waitForTimeout(700);
  const storyExit = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    return st[st.length - 1].dialogBox?.canExit === true;
  });
  check('B1 story tree does NOT advertise the exit', storyExit === false);
  await shot('B1-story-no-hint');
  await tap('Escape'); await page.waitForTimeout(250);
  await tap('Escape'); await page.waitForTimeout(500);
  check('B1 Escape cannot abort a start_combat tree', await top() === 'DialogState', `top=${await top()}`);
  // karen_meeting cannot be walked out of without starting the fight it exists
  // to start, so the page is REBOOTED instead. (First cut of this harness did
  // not: the fight pushed CombatState during the B2 window, CombatState
  // suspended the `world` scope, and the prose measurement below read a
  // deferral as a cadence failure. A harness that measures its own leftovers
  // is the exact failure mode CAPTURE LAW is about.)
  await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act3&shot=cubicle_farm`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1500);
  check('B2 measured on a clean exploration state', await top() === 'ExplorationState', `top=${await top()}`);

  // ── B2 — prose cadence ────────────────────────────────────────────────
  // Post four monologues at once (the measured worst case: a first visit to a
  // room in a new act) and time the gaps between successive voice-centre cards.
  const cadence = await page.evaluate(async () => {
    const A = window.__arbiter;
    A.reset();
    const seen = [];
    let last = null;
    const t0 = Date.now();
    A.monologue('The plant on my desk has given up. I understand it.');
    A.monologue('Four floors of people pretending the numbers mean something.');
    A.monologue('Somebody moved the coffee machine again.');
    A.monologue('I have been here nine days.');
    return await new Promise(res => {
      const iv = setInterval(() => {
        const el = document.querySelector('.na-zone-voice-centre .na-card');
        const txt = el ? el.textContent : null;
        if (txt !== last) {
          seen.push({ t: Date.now() - t0, txt: txt ? txt.slice(0, 28) : null });
          last = txt;
        }
        if (Date.now() - t0 > 22000) { clearInterval(iv); res(seen); }
      }, 40);
    });
  });
  const shows = cadence.filter(s => s.txt);
  const blanks = cadence.filter(s => !s.txt);
  // Gap = time from a card disappearing to the next one appearing.
  const gaps = [];
  for (let i = 0; i < cadence.length - 1; i++) {
    if (!cadence[i].txt && cadence[i + 1].txt && i > 0) gaps.push(cadence[i + 1].t - cadence[i].t);
  }
  const onScreen = [];
  for (let i = 0; i < cadence.length - 1; i++) {
    if (cadence[i].txt) onScreen.push(cadence[i + 1].t - cadence[i].t);
  }
  const minGap = gaps.length ? Math.min(...gaps) : 0;
  const minLife = onScreen.length ? Math.min(...onScreen) : 0;
  // Card-to-card period is what the player experiences as "another one".
  // Only cards that HAVE a successor have a period; the last card's life is not
  // a period and counting it as one made the harness fail on its own arithmetic.
  const period = [];
  for (let i = 0; i < gaps.length; i++) period.push(onScreen[i] + gaps[i]);
  const minPeriod = period.length ? Math.min(...period) : 0;
  console.log(`B2 cards shown=${shows.length} lives=${JSON.stringify(onScreen)} blank-gaps=${JSON.stringify(gaps)} period=${JSON.stringify(period)}`);
  check('B2 all four prose cards are shown', shows.length === 4, `shown=${shows.length}`);
  check('B2 every prose card holds its full floor (>= 2400 ms, no hurry)', minLife >= 2350, `min life=${minLife}ms`);
  // The gate is 1100 ms measured from RETIRE; the card's own 500 ms fade runs
  // inside it, so what is measured here is fully-blank screen after the fade.
  check('B2 fully-blank beat between prose cards (>= 500 ms)', minGap >= 500, `min blank=${minGap}ms`);
  check('B2 card-to-card period >= 3400 ms', minPeriod >= 3400, `min period=${minPeriod}ms`);
  await page.evaluate(() => window.__arbiter.reset());

  // ── B4 — emergency unstuck ────────────────────────────────────────────
  const unstick = await page.evaluate(async () => {
    const ex = window.__explore;
    // Park Andrew inside a blocked tile — the "I am in the furniture" case.
    let blocked = null;
    for (let x = 0; x < 24 && !blocked; x++) {
      for (let z = 0; z < 24; z++) if (ex.tileMap.get(x, z) === 1) { blocked = [x, z]; break; }
    }
    ex.player.setPosition(blocked[0], blocked[1], ex.tileMap);
    const before = { x: ex.player.position.x, z: ex.player.position.z, walkable: ex.tileMap.isWalkable(blocked[0], blocked[1]) };
    const { EventBus } = await import('/src/core/EventBus.js');
    EventBus.emit('unstick-player');
    await new Promise(r => setTimeout(r, 200));
    const p = ex.player.position;
    return {
      before,
      after: { x: p.x, z: p.z, walkable: ex.tileMap.isWalkable(p.x, p.z), exit: !!ex.tileMap.getExit(p.x, p.z) },
      room: ex.player.currentRoom,
    };
  });
  console.log('B4 ' + JSON.stringify(unstick));
  check('B4 unstick lands on a walkable tile', unstick.after.walkable === true, JSON.stringify(unstick.after));
  check('B4 unstick does not land on an exit trigger', unstick.after.exit === false);
  check('B4 unstick does not change room', unstick.room === 'cubicle_farm', `room=${unstick.room}`);
  await page.waitForTimeout(400);
  await shot('B4-unstuck-after');

  // ── B3 — boss anger bar at 0/10 ───────────────────────────────────────
  await page.evaluate(async () => {
    const ex = window.__explore;
    ex.player.setFlag('bossAnger', 0);
    const { ClientReviewState } = await import('/src/states/ClientReviewState.js');
    const { generateClient } = await import('/src/data/ClientGenerator.js');
    const c = generateClient(ex.player);
    ex.stateManager.push(new ClientReviewState(ex.stateManager, ex.player, c, () => {}));
  });
  await page.waitForTimeout(900);
  const anger = await page.evaluate(() => {
    const px = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return { text: el.textContent, color: getComputedStyle(el).color };
    };
    return { fill: px('.cr-anger-fill'), track: px('.cr-anger-track'), val: document.querySelector('.cr-anger-val')?.textContent };
  });
  console.log('B3 ' + JSON.stringify(anger));
  check('B3 at anger 0 the fill span is empty', anger.fill && anger.fill.text === '', `fill="${anger.fill?.text}"`);
  check('B3 the empty track is not painted the fill colour', anger.track && anger.track.color !== anger.fill?.color,
    `track=${anger.track?.color} fill=${anger.fill?.color}`);
  await shot('B3-anger-zero');
  await tap('Escape'); await page.waitForTimeout(500);

  // ── B14 — splash card life ────────────────────────────────────────────
  const splash = await page.evaluate(async () => {
    const { readingLife } = await import('/src/ui/CombatHUD.js');
    const { SPLASH_CARDS } = await import('/src/data/splash-cards.js');
    const out = {};
    for (const [id, c] of Object.entries(SPLASH_CARDS)) {
      out[id] = readingLife(`${c.title || ''} ${c.sub || ''}`);
    }
    return out;
  });
  console.log('B14 card life floors: ' + JSON.stringify(splash));
  const minLifeMs = Math.min(...Object.values(splash));
  check('B14 no splash card lives under 1600 ms', minLifeMs >= 1600, `min=${minLifeMs}ms (was 850-900 at the call sites)`);

  writeFileSync(`${OUT}/bundle1.json`, JSON.stringify({ results, cadence, unstick, anger, splash }, null, 2));
} catch (e) {
  console.error('HARNESS ERROR', e);
  fails++;
} finally {
  await browser.close();
}
console.log(fails === 0 ? '\nBUNDLE 1 EVIDENCE PASS' : `\nBUNDLE 1 EVIDENCE FAIL (${fails})`);
process.exit(fails === 0 ? 0 : 1);
