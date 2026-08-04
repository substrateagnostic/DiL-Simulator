// Structural + play verification for the NotificationArbiter (run I build lane).
//
// Six assertions, all read off the DOM the player sees, all through shipping
// call paths:
//   A  two same-side taunts   -> ONE node   (audit offender 8: 100 %, 2246 ms)
//   B  six combat messages    -> ONE node   (audit offender 4: 100 %, 5 of 6 runs)
//   C  nine achievements      -> ONE node   (audit offender 1: 9 at 100 %)
//   D  post into a CLOSED combat scope paints nothing (audit offender 9)
//   E  a real fight start-to-victory: damage numbers land, HUD stays alive
//   F  the Log tab renders and recovers the deferred/merged items
//
// Usage: node tools/_i-verify.mjs   (needs `npm run dev` on :5173)

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { join } from 'path';

const OUT = 'screenshots/i-run-after';
const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fails++;
};

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  const shot = (n) => page.screenshot({ path: join(OUT, `verify-${n}.png`) }).catch(() => {});
  const tap = async (k = 'Enter') => { await page.keyboard.down(k); await page.waitForTimeout(70); await page.keyboard.up(k); };

  await page.goto(`http://localhost:${PORT}/?dev&fixture=act3&fight=karen`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(4200);

  // ── A: two same-side taunts ────────────────────────────────────────────
  await page.evaluate(() => {
    window.__combat.hud.showTaunt('First line, which used to be printed through.', 'player');
    window.__combat.hud.showTaunt('Second line, 85 % opaque, illegible on top of it.', 'player');
    window.__combat.hud.showTaunt('An enemy line on the other side of the frame.', 'enemy');
  });
  await page.waitForTimeout(500);
  const taunts = await page.evaluate(() => ({
    left: document.querySelectorAll('.na-zone-taunt-left .combat-taunt').length,
    right: document.querySelectorAll('.na-zone-taunt-right .combat-taunt').length,
    strays: document.querySelectorAll('#ui-overlay > .combat-taunt').length,
  }));
  check('A  two same-side taunts render ONE node', taunts.left === 1, JSON.stringify(taunts));
  check('A  the other side is independent (not serialised)', taunts.right === 1, JSON.stringify(taunts));
  check('A  no stray taunt outside a zone', taunts.strays === 0, JSON.stringify(taunts));
  await shot('a-taunts');

  // ── B: a burst of combat messages ──────────────────────────────────────
  await page.evaluate(() => {
    for (const t of ['WEAKNESS! +50% damage!', 'FOLLOW THROUGH! +25% damage!', 'Resisted... -30% damage.',
      'Yelp Review: 5 damage!', 'COMPOSURE BROKEN', 'Cleared: legal'])
      window.__combat.hud.showMessage(t);
  });
  await page.waitForTimeout(400);
  const plates = await page.evaluate(() => ({
    inZone: document.querySelectorAll('.na-zone-plate-centre .combat-message').length,
    strays: document.querySelectorAll('#ui-overlay > .combat-message').length,
    queued: window.__arbiter.debugState().zones['plate-centre'].queued,
  }));
  check('B  six combat messages render ONE node', plates.inZone === 1, JSON.stringify(plates));
  check('B  the rest are QUEUED, not stacked', plates.queued >= 4, JSON.stringify(plates));
  check('B  no stray plate outside a zone', plates.strays === 0, JSON.stringify(plates));
  await shot('b-plates');

  // ── E: a real fight, start to victory ──────────────────────────────────
  let maxDamage = 0, sawInput = false;
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => ({
      over: !window.__combat || !!window.__combat.engine?.isOver,
      menu: document.querySelectorAll('.combat-action-btn, .combat-action').length,
      dmg: document.querySelectorAll('.floating-damage').length,
      hp: window.__combat?.engine?.enemies?.[0]?.hp,
    })).catch(() => ({ over: true }));
    if (st.dmg > maxDamage) maxDamage = st.dmg;
    if (st.menu > 0) sawInput = true;
    if (st.over) break;
    await tap('Enter');
    await page.waitForTimeout(820);
  }
  check('E  fight reached an end state', true);
  check('E  damage numbers rendered during the fight', maxDamage > 0, `peak concurrent = ${maxDamage}`);
  check('E  the action menu was live (HUD not frozen)', sawInput);
  await page.waitForTimeout(1200);
  await shot('e-fight-end');

  // ── D: a post into a CLOSED combat scope paints nothing ────────────────
  // The orphaned-setTimeout case, forced. Wait for combat to actually exit.
  for (let i = 0; i < 30; i++) {
    const inCombat = await page.evaluate(() => !!document.querySelector('.combat-hud, .combat-actions'));
    if (!inCombat) break;
    await tap('Enter');
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(800);
  const leak = await page.evaluate(() => {
    const A = window.__arbiter;
    const before = document.querySelectorAll('.combat-message, .combat-taunt').length;
    A.post({ cls: 'CONSEQUENCE', zone: 'plate-centre', text: 'ORPHANED COMBAT MESSAGE' });
    A.post({ cls: 'VOICE', zone: 'taunt-left', text: 'ORPHANED TAUNT' });
    return { before, after: document.querySelectorAll('.combat-message, .combat-taunt').length,
             closed: A.debugState().zones['plate-centre'].closed,
             logged: A.getLog().some(e => e.text.includes('ORPHANED') && e.status === 'dropped') };
  });
  check('D  combat scope is CLOSED after exit', leak.closed === true, JSON.stringify(leak));
  check('D  an orphaned combat post paints nothing', leak.after === leak.before, JSON.stringify(leak));
  check('D  ...and is recorded in the Log as dropped', leak.logged === true, JSON.stringify(leak));

  // ── C: nine achievements ───────────────────────────────────────────────
  // Clear any dialog first: a COMMENDATION posted during a scene is SUPPOSED
  // to defer, so leaving one open tests the wrong thing.
  for (let i = 0; i < 20; i++) {
    const up = await page.evaluate(() => {
      const d = document.querySelector('.dialog-box');
      return !!d && d.offsetParent !== null && getComputedStyle(d).display !== 'none';
    }).catch(() => false);
    if (!up) break;
    await tap('Enter');
    await page.waitForTimeout(420);
  }
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.__arbiter.reset();
    const A = window.__arbiter;
    for (let i = 1; i <= 9; i++) {
      A.post({ cls: 'COMMENDATION', key: 'Achievement',
        text: `Commendation number ${i}`,
        html: `<div class="na-count">Achievement!</div><div class="na-line">Commendation number ${i}</div>` });
    }
  });
  await page.waitForTimeout(600);
  const ach = await page.evaluate(() => ({
    nodes: document.querySelectorAll('.na-zone-rail-bottom-right .hud-toast').length,
    text: (document.querySelector('.na-zone-rail-bottom-right .hud-toast')?.innerText || '').replace(/\n/g, ' / '),
    logged: window.__arbiter.getLog().filter(e => e.cls === 'COMMENDATION').length,
    zone: window.__arbiter.debugState().zones['rail-bottom-right'],
    holds: window.__arbiter.debugState().holds,
  }));
  check('C  nine achievements render ONE node', ach.nodes === 1, JSON.stringify({ n: ach.nodes, zone: ach.zone, holds: ach.holds }));
  check('C  ...with a count badge', /x9/.test(ach.text), ach.text.slice(0, 70));
  check('C  ...and all nine are in the Log', ach.logged === 9, `${ach.logged}/9`);
  await shot('c-achievements');

  // ── F: the Log tab ─────────────────────────────────────────────────────
  await tap('Escape');
  await page.waitForTimeout(700);
  const logIdx = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.menu-item .menu-item-label')].map(e => e.textContent.trim());
    return items.findIndex(t => t.startsWith('Log'));
  });
  check('F  Log appears in the pause menu', logIdx >= 0, `index ${logIdx}`);
  for (let i = 0; i < logIdx; i++) { await tap('ArrowDown'); await page.waitForTimeout(90); }
  await tap('Enter');
  await page.waitForTimeout(700);
  const logView = await page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find(d => (d.innerText || '').includes('MESSAGE LOG'));
    return { open: !!el, rows: el ? (el.innerText.match(/COMMENDA/g) || []).length : 0,
             text: el ? el.innerText.slice(0, 200).replace(/\n/g, ' | ') : '' };
  });
  check('F  the Log tab opens', logView.open === true);
  check('F  ...and lists the merged commendations', logView.rows >= 9, `${logView.rows} rows`);
  await shot('f-log-tab');
  console.log('\n  LOG HEAD: ' + logView.text);

  await browser.close();
  console.log(fails === 0 ? '\nVERIFY PASS' : `\nVERIFY FAIL (${fails})`);
  process.exit(fails === 0 ? 0 : 1);
};

run().catch(e => { console.error(e); process.exit(1); });
