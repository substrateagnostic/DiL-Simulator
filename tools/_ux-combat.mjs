// THROWAWAY repro/verify instrument for the UX fix lane (g-run, lane UX).
//
// S5 — "every dynamic combat button is destroyed by a submenu round-trip".
// Drives a REAL Karen fight through the shipping fixture boot
// (?dev&fixture=act3&fight=karen), forces the engine into a state where all
// five dynamic buttons are up, screenshots the main menu, clicks the abilities
// submenu's Back row, and screenshots again. Reads the menu labels straight off
// the DOM the player sees.
//
// Also proves S5b (Silence nullified by an Item-submenu round trip).
//
// Usage: node tools/_ux-combat.mjs --tag=before|after
// Requires `npm run dev` on :5173. HEADED per HANDOFF_PACKAGE §4.7.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const tag = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'before';
const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/g-run/ux';
mkdirSync(OUT, { recursive: true });

const readMenu = () => {
  const items = [...document.querySelectorAll('.combat-action-btn, .combat-submenu-item')];
  return items.map(el => (el.textContent || '').trim()
    + (el.classList.contains('disabled') ? ' [DISABLED]' : ''));
};

const engineState = () => {
  const c = window.__combat;
  if (!c) return null;
  const p = c.engine.player;
  return {
    momentum: p.momentum,
    retaliateReady: !!p.retaliateReady,
    silenced: !!p.silencedThisTurn,
    hpPct: +(p.hp / p.maxHP).toFixed(2),
    hp: p.hp, maxHP: p.maxHP,
    paCost: c.engine.getPressAdvantageCost(),
    voices: (c._currentVoices || []).length,
    menu: c.hud.currentMenu,
  };
};

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const log = [];
const say = (s) => { log.push(s); console.log(s); };

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act3&fight=karen`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForFunction(() => window.__combat && window.__combat.inputEnabled === true, { timeout: 45000 });
  await page.waitForTimeout(600);

  // ── Force the full dynamic-button state on the REAL engine ─────────────
  await page.evaluate(() => {
    const c = window.__combat;
    const p = c.engine.player;
    p.momentum = 100;
    p.retaliateReady = true;
    p.hp = Math.floor(p.maxHP * 0.20);
    p.pressAdvantageUsedThisTurn = false;
    c._enablePlayerInput();      // shipping re-render path
  });
  await page.waitForTimeout(400);

  const before = await page.evaluate(readMenu);
  const stBefore = await page.evaluate(engineState);
  say(`BEFORE (${tag}): ${JSON.stringify(before)}`);
  say(`  engine: ${JSON.stringify(stBefore)}`);
  await page.screenshot({ path: `${OUT}/s5-combat-menu-${tag}-1-main.png` });

  // ── Open Special, then click its Back row ───────────────────────────────
  await page.evaluate(() => {
    const c = window.__combat;
    c._handleAction('special');
  });
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/s5-combat-menu-${tag}-2-submenu.png` });

  // Select the Back item the way a player does (cursor onto it, confirm)
  const backIdx = await page.evaluate(() => {
    const c = window.__combat;
    return c.hud.menuItems.findIndex(i => i.action === 'back');
  });
  say(`  abilities submenu Back index = ${backIdx}`);
  await page.evaluate((i) => {
    const c = window.__combat;
    c.hud.selectedIndex = i;
    c.hud.selectCurrent();           // exactly what Enter / a mouse click does
  }, backIdx);
  await page.waitForTimeout(400);

  const after = await page.evaluate(readMenu);
  const stAfter = await page.evaluate(engineState);
  say(`AFTER Back (${tag}): ${JSON.stringify(after)}`);
  say(`  engine: ${JSON.stringify(stAfter)}`);
  await page.screenshot({ path: `${OUT}/s5-combat-menu-${tag}-3-after-back.png` });

  const lost = before.filter(b => !after.includes(b));
  say(`LOST ON BACK: ${lost.length} -> ${JSON.stringify(lost)}`);

  // ── S5b: Silence nullified by an Item-submenu round trip ───────────────
  await page.evaluate(() => {
    const c = window.__combat;
    c.engine.player.silencedThisTurn = true;
    c._enablePlayerInput();
  });
  await page.waitForTimeout(350);
  const silBefore = await page.evaluate(readMenu);
  say(`SILENCED before: ${JSON.stringify(silBefore)}`);
  await page.screenshot({ path: `${OUT}/s5b-silence-${tag}-1-before.png` });

  await page.evaluate(() => window.__combat._handleAction('item'));
  await page.waitForTimeout(300);
  const backIdx2 = await page.evaluate(() => window.__combat.hud.menuItems.findIndex(i => i.action === 'back'));
  await page.evaluate((i) => { const c = window.__combat; c.hud.selectedIndex = i; c.hud.selectCurrent(); }, backIdx2);
  await page.waitForTimeout(400);
  const silAfter = await page.evaluate(readMenu);
  say(`SILENCED after item-Back: ${JSON.stringify(silAfter)}`);
  await page.screenshot({ path: `${OUT}/s5b-silence-${tag}-2-after-back.png` });

  const stillSilenced = silAfter.some(l => /Silenced/.test(l));
  say(`SILENCE HELD AFTER BACK: ${stillSilenced}`);

  writeFileSync(`${OUT}/s5-${tag}.json`, JSON.stringify({
    tag, before, stBefore, after, stAfter, lost, silBefore, silAfter, stillSilenced,
  }, null, 2));
  say(`\nwrote ${OUT}/s5-${tag}.json`);
} finally {
  await browser.close();
}
