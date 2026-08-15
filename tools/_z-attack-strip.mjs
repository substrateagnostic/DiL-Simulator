// _z-attack-strip — a frame burst across ONE enemy attack, so the claim
// "enemies A-pose / do not use attack animations" can be looked at instead of
// argued. Shoots the SHIPPING path at ?qtier=high.
//
//   node tools/_z-attack-strip.mjs --fight=security_guard --tag=proc --nomeshy
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const PORT = arg('port', '5199');
const FIGHT = arg('fight', 'security_guard');
const TAG = arg('tag', 'shot');
const NOMESHY = process.argv.includes('--nomeshy');
const OUT = join('screenshots', 'z-run', `${FIGHT}-${TAG}`);

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1400,860', '--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const url = `http://localhost:${PORT}/?dev&fixture=act7&fight=${FIGHT}&qtier=high${NOMESHY ? '&nomeshy' : ''}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
  await page.evaluate(() => {
    const c = window.__combat;
    if (c?.engine?.player) { c.engine.player.spd = 999; c.engine.player.maxHP = 9999; c.engine.player.hp = 9999; }
    for (const e of c?.engine?.enemies || []) { e.maxHP = 99999; e.hp = 99999; }
  });
  await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
  await page.waitForTimeout(1200);
  const kind = await page.evaluate(() => {
    const e = window.__combat.scene.enemyGroups[0];
    return { animator: e.animator.constructor.name, roles: e.animator.actions ? Object.keys(e.animator.actions) : null };
  });
  console.log('enemy animator:', JSON.stringify(kind));

  // Arm a marker the moment the enemy attack animation fires, then burst.
  await page.evaluate(() => {
    const s = window.__combat.scene;
    const o = s.enemyAttackAnim.bind(s);
    s.enemyAttackAnim = (...a) => { window.__atk = performance.now(); return o(...a); };
  });
  await page.click('.combat-action-btn:text-is("Attack")');
  await page.waitForFunction(() => !!window.__atk, { timeout: 20000 });
  for (let i = 0; i < 10; i++) {
    const buf = await page.screenshot();
    writeFileSync(join(OUT, `f${String(i).padStart(2, '0')}.png`), buf);
    await page.waitForTimeout(70);
  }
  console.log('wrote', OUT);
  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
