// SPLASH CARD PROOF SHEET — every card in the slate, rendered through the
// SHIPPING renderer (CombatHUD.showSplashCard) over a real combat frame, at the
// real viewport, with the quality tier PINNED so the adaptive governor cannot
// degrade on camera.
//
//   node tools/_h-card-shots.mjs [--port=5173] [--fight=karen]
//
// Writes screenshots/h-run/cards/<id>.png plus a JSON of measured asset sizes.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const arg = (k, d) => {
  const m = process.argv.find(a => a.startsWith(`--${k}=`));
  return m ? m.split('=')[1] : d;
};
const PORT = arg('port', '5173');
const FIGHT = arg('fight', 'karen');
const OUT = join(REPO, 'screenshots/h-run/cards');
mkdirSync(OUT, { recursive: true });

const CARDS = [
  'assert_dominance', 'boss_kill', 'all_in',
  'boss_karen', 'boss_chad', 'boss_grandma',
  'boss_meredith', 'boss_director', 'boss_algorithm',
  'karen_finisher',
];

const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
const page = await ctx.newPage();
const failures = [];
page.on('pageerror', e => failures.push('pageerror: ' + String(e).split('\n')[0]));
page.on('response', r => { if (r.status() >= 400 && /splash/.test(r.url())) failures.push(`HTTP ${r.status()} ${r.url()}`); });

await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&fight=${FIGHT}&qtier=high`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__combat, { timeout: 45000 });
await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 45000 });
await page.waitForTimeout(1200);

const report = [];
for (const id of CARDS) {
  const meta = await page.evaluate((cid) => {
    const hud = window.__combat.hud;
    const el = hud.showSplashCard(cid, 6000);
    if (!el) return { ok: false };
    const img = el.querySelector('.combat-splash-img');
    const title = el.querySelector('.combat-splash-title');
    return {
      ok: true, src: img?.getAttribute('src') || null,
      title: title?.textContent || '',
      sub: el.querySelector('.combat-splash-sub')?.textContent || '',
      cls: el.className,
      typeCls: el.querySelector('.combat-splash-type')?.className || '',
    };
  }, id);
  if (!meta.ok) { failures.push(`${id}: showSplashCard returned null`); continue; }
  // Let the slam settle onto its hold frame before the grab.
  await page.waitForTimeout(500);
  const natural = await page.evaluate(() => {
    const i = document.querySelector('.combat-splash-img');
    return { w: i?.naturalWidth || 0, h: i?.naturalHeight || 0, complete: !!i?.complete };
  });
  await page.screenshot({ path: join(OUT, `${id}.png`) });
  report.push({ id, ...meta, natural });
  if (!natural.complete || natural.w === 0) failures.push(`${id}: image did not decode`);
  await page.evaluate(() => { const e = document.querySelector('.combat-splash'); if (e) e.remove(); });
  await page.waitForTimeout(120);
}

// Shipped byte sizes, measured off the emitted assets.
const ASSETS = join(REPO, 'src/assets/splash_cards');
const sizes = readdirSync(ASSETS).filter(f => f.endsWith('.webp'))
  .map(f => ({ file: f, kb: +(statSync(join(ASSETS, f)).size / 1024).toFixed(1) }))
  .sort((a, b) => b.kb - a.kb);

writeFileSync(join(OUT, 'cards.json'), JSON.stringify({ report, sizes, failures }, null, 1));
console.log('cards rendered:', report.length, '/', CARDS.length);
for (const r of report) console.log(` ${r.id.padEnd(18)} ${String(r.natural.w)}x${r.natural.h}  "${r.title}" / "${r.sub}"  [${r.typeCls}]`);
console.log('sizes:', sizes.map(s => `${s.file} ${s.kb}KB`).join('  '));
console.log('over 300KB:', sizes.filter(s => s.kb > 300).length);
if (failures.length) { console.log('FAILURES:'); failures.forEach(f => console.log('  ' + f)); }
await browser.close();
process.exit(failures.length ? 1 : 0);
