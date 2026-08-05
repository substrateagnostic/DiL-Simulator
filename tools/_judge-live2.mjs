import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, renameSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const OUT = join(REPO, 'screenshots/judge-r1');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: false, args: ['--window-size=1940,1120'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
await page.goto('http://localhost:5199/?dev&fixture=act7&fight=chad&qtier=high', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
await page.waitForTimeout(1200);
const log = [];
const snap = async (label) => {
  const s = await page.evaluate(() => {
    const c = window.__combat; if (!c) return null; const e = c.engine.enemies[0];
    return { hp: e.hp, w: e.weakness, r: e.resistance, comp: e.composure, broken: e.broken||0, tel: e.telegraphedAbility||null, phaseMsgVisible: document.querySelector('.combat-power-banner')?.textContent||null };
  });
  log.push({ label, ...s }); console.log(label, JSON.stringify(s));
};
// beef enemy so it survives; set to 22% to be in phase 2 band after sync
await page.evaluate(() => {
  const c = window.__combat;
  c.engine.player.maxHP = 900; c.engine.player.hp = 900; c.engine.player.mp = 300;
  const e = c.engine.enemies[0]; e.maxHP = 3000; e.hp = 3000;
});
await snap('base');
// attack once at full HP (base weakness social)
await page.click('.combat-action-btn:text-is("Attack")');
await page.waitForTimeout(4500); await snap('after-t1');
// drop to 22% and attack -> phase change should fire, weakness -> audit
await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 30000 });
await page.evaluate(() => { const e = window.__combat.engine.enemies[0]; e.hp = Math.round(e.maxHP * 0.22); });
await page.click('.combat-action-btn:text-is("Attack")');
await page.waitForTimeout(2000); await snap('phase2-mid');
await page.waitForTimeout(3500); await snap('phase2-post');
// now composure: set low, hit with the NEW weakness (audit: Spot Check) to Break
await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 30000 });
await page.evaluate(() => { const e = window.__combat.engine.enemies[0]; e.composure = 5; });
await snap('pre-break');
await page.click('.combat-action-btn:text-is("Special")');
await page.waitForTimeout(500);
await page.click('.combat-submenu-item:has-text("Spot Check")').catch(async () => { await page.click('.combat-submenu-item:has-text("Back")').catch(()=>{}); });
await page.waitForTimeout(2500); await snap('break-mid');
await page.waitForTimeout(4000); await snap('break-post');
await page.waitForTimeout(3000); await snap('enemy-broken-turn');
writeFileSync(join(OUT, 'live2-log.json'), JSON.stringify({ errors, log }, null, 1));
await ctx.close(); await browser.close();
const vids = readdirSync(OUT).filter(f => f.startsWith('page'));
if (vids.length) { const newest = vids.map(f => ({ f, t: statSync(join(OUT,f)).mtimeMs })).sort((a,b)=>b.t-a.t)[0].f; renameSync(join(OUT,newest), join(OUT,'chad-live-2.webm')); }
console.log('done; errors=', errors.length);
