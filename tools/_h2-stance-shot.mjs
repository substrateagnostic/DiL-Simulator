// One still of the staged fight ~6s in, plus a fresh-cache second-fight still.
//   node tools/_h2-stance-shot.mjs --port=5199 --fight=karen --out=screenshots/h2-run/frames/dev-karen.png
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '4519');
const FIGHT = arg('fight', 'karen');
const OUTPATH = join(REPO, arg('out', 'screenshots/h2-run/frames/stance.png'));
const SECOND = arg('second', '');   // also end fight 1 and start fight 2, shoot that
mkdirSync(dirname(OUTPATH), { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&qtier=high`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__explore && !!window.__explore.player, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate((fight) => {
  const ex = window.__explore;
  ex.player.flags.retry_karen = true;
  ex.player.flags.karen_retry_ready = true;
  ex._startCombat(fight);
}, FIGHT);
await page.waitForFunction(() => !!window.__combat && !!window.__combat.engine, { timeout: 30000 });
await page.waitForTimeout(6000);
await page.screenshot({ path: OUTPATH });
const st = await page.evaluate(() => {
  const e = window.__combat.scene.enemyGroups[0];
  return { meshy: !!e.group.userData.meshy, current: e.animator._current || 'proc' };
});
console.log(`shot 1 -> ${OUTPATH}  (meshy=${st.meshy} current=${st.current})`);

if (SECOND) {
  // Kill fight 1 through the dev win key path, then start the same fight again
  // (all assets session-cached => synchronous Meshy staging, no upgrade path).
  await page.evaluate(() => window.__combat._devInstantWin());
  await page.waitForFunction(() => !window.__combat, { timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.evaluate((fight) => window.__explore._startCombat(fight), FIGHT);
  await page.waitForFunction(() => !!window.__combat && !!window.__combat.engine, { timeout: 30000 });
  await page.waitForTimeout(6000);
  const p2 = OUTPATH.replace(/\.png$/, '-second.png');
  await page.screenshot({ path: p2 });
  const st2 = await page.evaluate(() => {
    const e = window.__combat.scene.enemyGroups[0];
    return { meshy: !!e.group.userData.meshy, current: e.animator._current || 'proc' };
  });
  console.log(`shot 2 -> ${p2}  (meshy=${st2.meshy} current=${st2.current})`);
}
await browser.close();
