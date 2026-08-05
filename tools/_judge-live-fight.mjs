// JUDGE ROUND 1 — live chad fight through the shipping path, headed, qtier pinned.
// Drives real menu clicks, logs live engine state each action, records video.
// Throwaway (tools/_judge-*). node tools/_judge-live-fight.mjs --port=5199
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, renameSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '5199');
const OUT = join(REPO, 'screenshots/judge-r1');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false, args: ['--window-size=1940,1120'] });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).split('\n')[0]));

await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&fight=chad&qtier=high`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
await page.waitForTimeout(1200);

// Realistic-but-survivable pins: watch the whole fight without dying.
await page.evaluate(() => {
  const c = window.__combat;
  c.engine.player.maxHP = 900; c.engine.player.hp = 900; c.engine.player.mp = 300;
});

const log = [];
const snap = async (label) => {
  const s = await page.evaluate(() => {
    const c = window.__combat; const e = c.engine.enemies[0];
    return {
      enemyHP: e.hp, maxHP: e.maxHP, weakness: e.weakness, resistance: e.resistance,
      composure: e.composure, maxComposure: e.maxComposure, broken: e.broken || 0,
      telegraph: e.telegraphedAbility || null,
      turnBack: c.engine.turnBackReady || null,
      momentum: c.engine.player.momentum,
      hudTelegraph: document.querySelector('.combat-telegraph-row')?.textContent?.slice(0, 120) || null,
      banners: document.querySelector('.combat-power-banner')?.textContent || null,
      splash: document.querySelector('.combat-splash-img')?.getAttribute('src')?.split('/').pop() || null,
      playerHP: c.engine.player.hp,
    };
  });
  log.push({ label, ...s });
  console.log(label, JSON.stringify(s));
};

const waitTurn = async () => {
  await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 30000 });
  await page.waitForTimeout(300);
};

const special = async (name) => {
  await page.click('.combat-action-btn:text-is("Special")');
  await page.waitForTimeout(500);
  const ok = await page.click(`.combat-submenu-item:has-text("${name}")`).then(() => true).catch(() => false);
  if (!ok) { await page.click('.combat-submenu-item:has-text("Back")').catch(() => {}); }
  return ok;
};

await snap('boot');

// Turn 1: basic attack (feel the normal beat).
await waitTurn(); await snap('t1-pre');
await page.click('.combat-action-btn:text-is("Attack")');
await page.waitForTimeout(4200); await snap('t1-post');

// Turn 2: File Motion (legal — chad RESISTS legal; expect resist read, no turn-back).
await waitTurn(); await snap('t2-pre');
await special('File Motion');
await page.waitForTimeout(4600); await snap('t2-post');

// Turn 3: Raise Concerns (social — chad weak; expect super + Objection Sustained offer).
await waitTurn(); await snap('t3-pre');
await special('Raise Concerns');
await page.waitForTimeout(2500); await snap('t3-mid');
// If the turn-back armed, the restricted menu is up: pick Brace if offered.
const braced = await page.click('.combat-action-btn:text-is("Brace")', { timeout: 3000 }).then(() => true).catch(() => false);
if (braced) {
  // brace QTE: press Enter mid-bar
  await page.waitForTimeout(700);
  await page.keyboard.down('Enter'); await page.waitForTimeout(120); await page.keyboard.up('Enter');
}
await page.waitForTimeout(4200); await snap('t3-post');

// Turns 4-9: alternate social hits to push toward Break (composure 60) and phase 1.
for (let i = 4; i <= 9; i++) {
  await waitTurn(); await snap(`t${i}-pre`);
  const used = await special('Raise Concerns');
  if (!used) await page.click('.combat-action-btn:text-is("Attack")').catch(() => {});
  await page.waitForTimeout(2200);
  // dismiss any turn-back offer with a heal/brace when possible
  const tb = await page.evaluate(() => window.__combat?.engine?.turnBackReady || null);
  if (tb) {
    const b2 = await page.click('.combat-action-btn:text-is("Brace")', { timeout: 2500 }).then(() => true).catch(() => false);
    if (b2) { await page.waitForTimeout(700); await page.keyboard.down('Enter'); await page.waitForTimeout(120); await page.keyboard.up('Enter'); }
  }
  await page.waitForTimeout(3800); await snap(`t${i}-post`);
}

// Push into phase 2 (<=25%): force HP down, then hit once to watch the pivot live.
await waitTurn();
await page.evaluate(() => { const e = window.__combat.engine.enemies[0]; e.hp = Math.round(e.maxHP * 0.20); });
await snap('phase2-forced-pre');
await page.click('.combat-action-btn:text-is("Attack")');
await page.waitForTimeout(4500); await snap('phase2-post');
await waitTurn(); await snap('phase2-turnstart');

writeFileSync(join(OUT, 'live-log.json'), JSON.stringify({ errors, log }, null, 1));
await ctx.close(); await browser.close();
const vids = readdirSync(OUT).filter(f => f.endsWith('.webm') && !/^chad-live\.webm$/.test(f));
if (vids.length) {
  const newest = vids.map(f => ({ f, t: statSync(join(OUT, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0].f;
  renameSync(join(OUT, newest), join(OUT, 'chad-live.webm'));
}
console.log('done; errors=', errors.length);
