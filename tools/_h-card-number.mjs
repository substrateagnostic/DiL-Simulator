// CARD / NUMBER CO-TERMINATION — does the splash card end with its own damage
// number, or does it hold a plate with nothing under it?
//
// The Assert Dominance card and the damage number are spawned on the SAME
// cinematic step (POWER_MOVE t=0.68, `impact: true`). At the shipped 1300 ms
// card vs FloatingText's 820 ms life that left ~480 ms of numberless plate.
// This samples the DOM at 20 Hz and prints the two on-screen intervals, so the
// gap is a reading rather than the subtraction of two authored constants.
//
//   node tools/_h-card-number.mjs [--port=5173] [--tag=after]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=').slice(1).join('=') : d; };
const PORT = arg('port', '5173');
const TAG = arg('tag', 'after');
const OUT = join('screenshots', 'h-run', 'card-number');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).split('\n')[0]));

await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&fight=karen&qtier=high`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  const c = window.__combat;
  c.engine.player.maxHP = 9999; c.engine.player.hp = 9999; c.engine.player.spd = 999;
  c.engine.player.momentum = 100;
  for (const e of c.engine.enemies) { e.maxHP = 9000; e.hp = 9000; }
  c._enablePlayerInput();
});
await page.waitForTimeout(500);

await page.evaluate(() => {
  window.__cn = [];
  window.__cnT0 = performance.now();
  window.__cnTimer = setInterval(() => {
    window.__cn.push([
      +(performance.now() - window.__cnT0).toFixed(1),
      document.querySelectorAll('.combat-splash').length,
      document.querySelectorAll('.floating-damage').length,
    ]);
  }, 50);
});

await page.click('.combat-action-btn:has-text("ASSERT DOMINANCE")');
await page.waitForTimeout(5000);

const s = await page.evaluate(() => { clearInterval(window.__cnTimer); return window.__cn; });
await ctx.close();
await browser.close();

// FIRST contiguous run only. The enemy answers the Power Move on its own turn
// and spawns its own bigdamage number ~2 s later; a plain min/max over the whole
// sample would fold that second number into the first one's lifetime.
const span = (i) => {
  let a = null, b = null;
  for (const r of s) {
    if (r[i] > 0) { if (a === null) a = r[0]; b = r[0]; }
    else if (a !== null) break;
  }
  return a === null ? null : { fromMs: Math.round(a), toMs: Math.round(b), durMs: Math.round(b - a) + 50 };
};
const card = span(1), num = span(2);
const out = {
  tag: TAG, errors, samples: s.length, card, number: num,
  startSkewMs: card && num ? num.fromMs - card.fromMs : null,
  endGapMs: card && num ? card.toMs - num.toMs : null,
};
writeFileSync(join(OUT, `card-number-${TAG}.json`), JSON.stringify(out, null, 1));
console.log(`\nCARD/NUMBER  tag=${TAG}  samples=${s.length}  errors=${errors.length}`);
console.log(`  card   on screen ${card ? `${card.fromMs}..${card.toMs} ms (${card.durMs} ms)` : 'NOT SEEN'}`);
console.log(`  number on screen ${num ? `${num.fromMs}..${num.toMs} ms (${num.durMs} ms)` : 'NOT SEEN'}`);
console.log(`  start skew ${out.startSkewMs} ms   card outlasts number by ${out.endGapMs} ms`);
