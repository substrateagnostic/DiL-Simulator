// PRACTICE GROUPS, rendered through the shipping menu. Opens the Abilities tab
// at two levels (2, the first build decision; 10, the capstone rung) and grabs
// the panel, plus a machine-readable census of what the tab actually shows.
//
//   node tools/_j-menu-shot.mjs [--port=5173]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '5173');
const OUT = join(REPO, 'screenshots/j-run');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).split('\n')[0]));

await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&qtier=high`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__explore, { timeout: 45000 });
await page.waitForTimeout(1800);

const census = [];
for (const [level, points] of [[2, 1], [10, 9]]) {
  await page.evaluate(({ lv, pts }) => {
    const player = window.__explore.player;
    player.stats.level = lv;
    player.upgradePoints = pts;
    player.unlockedAbilities = new Set(['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check']);
  }, { lv: level, pts: points });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  // Abilities is the second row of the pause menu.
  await page.evaluate(() => {
    const items = [...document.querySelectorAll('.menu-item')];
    const ab = items.find(i => /abilit/i.test(i.textContent));
    if (ab) ab.click();
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(OUT, `abilities-L${level}.png`) });
  // …and the first Practice Group column, which is the screen the build
  // decision is actually made on.
  await page.evaluate(() => {
    const label = [...document.querySelectorAll('.abilities-tier-label')]
      .find(e => /LITIGATION/.test(e.textContent));
    if (label) label.scrollIntoView({ block: 'start' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `abilities-L${level}-litigation.png`) });
  census.push(await page.evaluate((lv) => ({
    level: lv,
    headers: [...document.querySelectorAll('.abilities-tier-label')].map(e => e.textContent.trim()),
    blurbs: [...document.querySelectorAll('.abilities-track-blurb')].length,
    riders: [...document.querySelectorAll('.abilities-track-rider')].length,
    cards: [...document.querySelectorAll('.ability-card')].map(c => ({
      name: c.querySelector('.ability-name')?.textContent,
      cls: c.className.replace('ability-card', '').trim(),
      req: c.querySelector('.ability-req')?.textContent || '',
    })),
    demand: document.querySelector('.abilities-demand')?.textContent?.trim(),
  }), level));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

writeFileSync(join(OUT, 'abilities-census.json'), JSON.stringify({ census, errors }, null, 1));
for (const c of census) {
  console.log(`\nLEVEL ${c.level}   ${c.demand}`);
  console.log('  headers:', c.headers.join(' | '));
  console.log(`  blurbs ${c.blurbs}  riders ${c.riders}  cards ${c.cards.length}`);
  const locked = c.cards.filter(x => /level-locked/.test(x.cls));
  console.log(`  level-locked cards: ${locked.length}${locked.length ? '  e.g. ' + locked[0].name + ' -> ' + locked[0].req : ''}`);
  const passives = c.cards.filter(x => /passive/.test(x.cls));
  console.log(`  passive cards: ${passives.length}   capstones: ${c.cards.filter(x => /capstone/.test(x.cls)).length}`);
}
console.log('\npage errors:', errors.length ? errors.join(' | ') : 'none');
await browser.close();
process.exit(errors.length ? 1 : 0);
