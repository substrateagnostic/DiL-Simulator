// THROWAWAY harness for the wardrobe-mirror lane (WardrobeState).
//
// Drives: bathroom -> stand at the basins -> E opens the mirror -> browse,
// equip a hat + glasses + accessory -> stats delta visible -> Esc closes ->
// PROGRESS teach toast lands -> re-enter shows WORN state -> unequip works.
// Writes stills to screenshots/w-run/.
//
// Usage: node tools/_w-mirror.mjs [--port=5299]
// HEADED per HANDOFF_PACKAGE 4.7.

import { chromium } from 'playwright';
import fs from 'node:fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5299';
const OUT = 'screenshots/w-run';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
// The fixture boot uses save slot 3 as scratch and a previous harness run's
// autosave would carry wardrobe_* flags into this one. Every run starts clean.
await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
const tap = async (key = 'Enter', hold = 70) => {
  await page.keyboard.down(key); await page.waitForTimeout(hold); await page.keyboard.up(key);
};
let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`);
  if (!ok) fails++;
};
const top = () => page.evaluate(() => {
  const st = window.__explore?.stateManager.stack;
  return st?.[st.length - 1]?.constructor.name || 'none';
});

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=bathroom&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1200);

  // 1. Stand beside the basins; the interact prompt should read the mirror.
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(1.5, 3.6, ex.tileMap);
    ex.camera.snapTo(1.5, 3.6, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(700);
  const prompt = await page.evaluate(() => {
    const ex = window.__explore;
    const { exit, interactable } = ex._getNearbyTargets();
    return interactable ? ex._getInteractPrompt(interactable, exit) : null;
  });
  check('mirror prompt', prompt === 'Check the mirror', String(prompt));
  await page.screenshot({ path: `${OUT}/00-bathroom-prompt.png` });

  // 2. E opens the wardrobe.
  await tap('e');
  await page.waitForTimeout(900);
  check('WardrobeState pushed', (await top()) === 'WardrobeState', await top());
  const flagUsed = await page.evaluate(() => !!window.__explore.player.getFlag('wardrobe_mirror_used'));
  check('wardrobe_mirror_used set on open', flagUsed);
  await page.screenshot({ path: `${OUT}/01-mirror-open.png` });

  // 3. The rail lists exactly the unlocked pool (act1 defaults = 4).
  const railInfo = await page.evaluate(() => ({
    cards: [...document.querySelectorAll('.wd-card .wd-card-name')].map(e => e.textContent),
    heads: [...document.querySelectorAll('.wd-slot-head')].map(e => e.textContent),
  }));
  console.log('  rail:', JSON.stringify(railInfo));
  check('rail shows 4 unlocked defaults', railInfo.cards.length === 4);

  // 4. Equip the visor (selected index 0).
  const beforeStats = await page.evaluate(() => ({ ...window.__explore.player.getCombatStats() }));
  await tap('Enter');
  await page.waitForTimeout(500);
  let equipped = await page.evaluate(() => ({ ...window.__explore.player.equipped }));
  check('visor equipped', equipped.hat === 'visor_green', JSON.stringify(equipped));
  await page.screenshot({ path: `${OUT}/02-visor-equipped.png` });

  // 5. Down to glasses, equip; down twice to an accessory, equip.
  await tap('ArrowDown'); await page.waitForTimeout(150);
  await tap('Enter'); await page.waitForTimeout(400);
  await tap('ArrowDown'); await page.waitForTimeout(150);
  await tap('Enter'); await page.waitForTimeout(400);
  equipped = await page.evaluate(() => ({ ...window.__explore.player.equipped }));
  check('glasses equipped', equipped.glasses === 'reading_glasses', JSON.stringify(equipped));
  check('accessory equipped', !!equipped.accessory, JSON.stringify(equipped));
  const afterStats = await page.evaluate(() => ({ ...window.__explore.player.getCombatStats() }));
  check('stat bonus applied (def +1 atk +1)',
    afterStats.def === beforeStats.def + 1 && afterStats.atk === beforeStats.atk + 1,
    `def ${beforeStats.def}->${afterStats.def} atk ${beforeStats.atk}->${afterStats.atk}`);
  const statStrip = await page.evaluate(() =>
    [...document.querySelectorAll('.wd-stat')].map(e => e.textContent.trim()).join(' | '));
  console.log('  stats strip:', statStrip);
  check('stat strip shows a delta', /\+\d/.test(statStrip));
  await page.screenshot({ path: `${OUT}/03-three-equipped.png` });

  // 6. Turn the model (held right arrow) — yaw must move.
  const yaw0 = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    return st[st.length - 1]._previewYaw;
  });
  await tap('ArrowRight', 400);
  const yaw1 = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    return st[st.length - 1]._previewYaw;
  });
  check('preview turns', Math.abs(yaw1 - yaw0) > 0.3, `${yaw0} -> ${yaw1}`);
  await page.screenshot({ path: `${OUT}/04-turned.png` });
  await tap('ArrowLeft', 400);

  // 7. Escape closes; teach toast lands after scope resume.
  await tap('Escape');
  await page.waitForTimeout(900);
  check('back to exploration', (await top()) === 'ExplorationState', await top());
  const tipShown = await page.evaluate(() => !!window.__explore.player.getFlag('wardrobe_tip_shown'));
  check('wardrobe_tip_shown set on first exit', tipShown);
  // The teach is PROGRESS class and correctly DEFERS behind the bathroom's
  // first-visit VOICE monologue (the claim ladder working, not a bug), so
  // poll for it rather than sampling one instant.
  let teachSeen = false;
  for (let i = 0; i < 60 && !teachSeen; i++) {
    teachSeen = await page.evaluate(() => document.body.textContent.includes('Pause Menu'));
    if (!teachSeen) await page.waitForTimeout(250);
  }
  check('PROGRESS teach visible (may defer behind VOICE)', teachSeen);
  await page.screenshot({ path: `${OUT}/05-exit-toast.png` });

  // 8. Re-enter: WORN badges persist; Enter on selected unequips.
  await tap('e');
  await page.waitForTimeout(700);
  check('re-entered', (await top()) === 'WardrobeState', await top());
  const wornCount = await page.evaluate(() => document.querySelectorAll('.wd-card.wd-equipped').length);
  check('3 WORN cards on re-entry', wornCount === 3, String(wornCount));
  await tap('Enter'); // toggle off the visor
  await page.waitForTimeout(400);
  equipped = await page.evaluate(() => ({ ...window.__explore.player.equipped }));
  check('unequip works', equipped.hat === null, JSON.stringify(equipped));
  await tap('Enter'); // put it back on
  await page.waitForTimeout(300);
  await tap('Escape');
  await page.waitForTimeout(600);
  const secondToast = await page.evaluate(() => !!window.__explore.player.getFlag('wardrobe_tip_shown'));
  check('no second teach needed (flag already set)', secondToast);

  console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
} catch (err) {
  console.error('HARNESS ERROR:', err.message);
  fails++;
} finally {
  await browser.close();
  process.exit(fails ? 1 : 0);
}
