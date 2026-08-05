// SPLASH CARD TRIGGER VERIFICATION — does each card fire from its REAL hook?
//
// The proof sheet (_h-card-shots.mjs) proves the renderer. This proves the
// wiring: every card is driven from the shipping path, with the class rules
// (no damage number on a threat card, no card on a whiffed All-In, once per
// boss per fight, once per save for the finisher) checked as assertions.
//
//   node tools/_h-card-triggers.mjs [--port=5173]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '5173');
const OUT = join(REPO, 'screenshots/h-run/cards');
mkdirSync(OUT, { recursive: true });

const results = [];
const check = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });

async function fight(id, extra = '') {
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('  ! pageerror', String(e).split('\n')[0]));
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&fight=${id}&qtier=high${extra}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__combat, { timeout: 45000 });
  await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 45000 });
  await page.waitForTimeout(900);
  return page;
}
// The card's own id, read back off the rendered title, so a mis-wired trigger
// showing the WRONG card fails instead of quietly passing.
const cardOnScreen = (page) => page.evaluate(() => {
  const el = document.querySelector('.combat-splash');
  if (!el) return null;
  return {
    cls: el.className,
    title: el.querySelector('.combat-splash-title')?.textContent || '',
    src: (el.querySelector('.combat-splash-img')?.getAttribute('src') || '').split('/').pop(),
    numbers: document.querySelectorAll('.floating-damage').length,
    banner: !!document.querySelector('.combat-power-banner'),
  };
});

// ── 1. ASSERT DOMINANCE — the reward card on the contact beat ───────────
{
  const page = await fight('karen');
  await page.evaluate(() => {
    const c = window.__combat;
    c.engine.player.momentum = 100;
    c.engine.enemies.forEach(e => { e.maxHP = 4000; e.hp = 4000; });
    c._enablePlayerInput();
  });
  await page.waitForTimeout(400);
  await page.click('.combat-action-btn:has-text("ASSERT DOMINANCE")');
  await page.waitForTimeout(760);                 // the authored 680ms slam + a frame
  const c = await cardOnScreen(page);
  await page.screenshot({ path: join(OUT, 'trigger-assert-dominance.png') });
  check('Assert Dominance fires the card on the 680ms contact beat', !!c && c.src === 'assert_dominance.webp', c ? c.src : 'no card');
  check('  card carries the REWARD class (slam left)', !!c && /reward/.test(c.cls), c?.cls);
  check('  the old ASSERT DOMINANCE banner is gone (one title, not two)', !!c && c.banner === false);
  check('  the damage number is on screen WITH the card', !!c && c.numbers > 0, `${c?.numbers} numbers`);
  await page.close();
}

// ── 2. BOSS ULTIMATE TELEGRAPH — the threat card, no number ─────────────
{
  const page = await fight('karen');
  const first = await page.evaluate(async () => {
    const c = window.__combat;
    // Drive Karen into her final phase so her ultimate is in the pool, then
    // pin the roll to the ultimate and re-run the real telegraph beat. The
    // telegraph block lives in _enablePlayerInput(); the spec named an older
    // method (_startPlayerTurn) that no longer exists.
    c.engine.enemies[0].hp = Math.round(c.engine.enemies[0].maxHP * 0.15);
    c.engine.enemies[0].telegraphedAbility = 'live_tweet_rampage';
    c.engine.telegraph = () => { c.engine.enemies[0].telegraphedAbility = 'live_tweet_rampage'; };
    c._enablePlayerInput();
    return true;
  });
  await page.waitForTimeout(320);
  const c = await cardOnScreen(page);
  await page.screenshot({ path: join(OUT, 'trigger-boss-ultimate.png') });
  check('Karen ultimate telegraph fires the warning card', !!c && c.src === 'boss_karen.webp', c ? c.src : 'no card');
  check('  card carries the THREAT class (slam right)', !!c && /threat/.test(c.cls), c?.cls);
  check('  NO damage number on a threat card', !!c && c.numbers === 0, `${c?.numbers} numbers`);
  // Scarcity: the same telegraph again must NOT re-play it.
  await page.evaluate(() => { document.querySelector('.combat-splash')?.remove(); window.__combat._enablePlayerInput(); });
  await page.waitForTimeout(320);
  const again = await cardOnScreen(page);
  check('  once per boss per fight (second telegraph plays no card)', again === null, again ? again.src : 'none');
  await page.close();
}

// ── 3. ALL-IN — the card is gated on the gamble LANDING ─────────────────
for (const success of [false, true]) {
  const page = await fight('karen');
  await page.evaluate((win) => {
    const c = window.__combat;
    c.engine.player.hp = Math.max(1, Math.round(c.engine.player.maxHP * 0.1));
    c.engine.enemies.forEach(e => { e.maxHP = 4000; e.hp = 4000; });
    const real = c.engine.playerDesperateGamble.bind(c.engine);
    c.engine.playerDesperateGamble = (risk, ti) => {
      const r = real(risk, ti);
      if (r) { r.success = win; if (!win) { r.damage = 0; r.critical = false; } }
      return r;
    };
    c._enablePlayerInput();
  }, success);
  await page.waitForTimeout(300);
  await page.click('.combat-action-btn:has-text("Desperate Gamble")');
  await page.waitForTimeout(350);
  await page.click('.gamble-option[data-risk="all_in"]');
  await page.waitForTimeout(700);
  const c = await cardOnScreen(page);
  if (success) {
    await page.screenshot({ path: join(OUT, 'trigger-all-in.png') });
    check('All-In card fires when the 40% LANDS', !!c && c.src === 'all_in.webp', c ? c.src : 'no card');
  } else {
    check('All-In card does NOT fire on the miss', c === null, c ? c.src : 'none');
  }
  await page.close();
}

// ── 4. BOSS KILL — story boss only ─────────────────────────────────────
{
  const page = await fight('karen');
  await page.evaluate(() => {
    const c = window.__combat;
    c.engine.enemies.forEach(e => { e.hp = 1; });
    c._enablePlayerInput();
  });
  await page.waitForTimeout(300);
  await page.click('.combat-action-btn:text-is("Attack")');
  await page.waitForTimeout(1400);
  const c = await cardOnScreen(page);
  await page.screenshot({ path: join(OUT, 'trigger-boss-kill.png') });
  check('Boss-kill card fires on a story boss final blow', !!c && c.src === 'boss_kill.webp', c ? c.src : 'no card');
  await page.close();
}
{
  const page = await fight('reception_client');
  await page.evaluate(() => {
    const c = window.__combat;
    c.engine.enemies.forEach(e => { e.hp = 1; });
    c._enablePlayerInput();
  });
  await page.waitForTimeout(300);
  await page.click('.combat-action-btn:text-is("Attack")');
  await page.waitForTimeout(1400);
  const c = await cardOnScreen(page);
  check('Reception client kill fires NO card (scarcity law)', c === null, c ? c.src : 'none');
  await page.close();
}

// ── 5. THE SCRIPTED-LOSS FINISHER ──────────────────────────────────────
{
  const page = await fight('karen');
  await page.evaluate(() => {
    const c = window.__combat;
    c.player.setFlag('retry_karen', false);
    c.player.setFlag('seen_karen_finisher', false);
    c.enemyId = 'karen';
    c.engine.allies[0].hp = 1;
    c.engine.enemies[0].atk = 999;
    c._enablePlayerInput();
  });
  await page.waitForTimeout(300);
  await page.click('.combat-action-btn:text-is("Attack")');
  // The defeat resolves on Karen's turn, so the card's 1500ms life opens
  // somewhere around +2.5s. Poll for it rather than guessing a sample point --
  // a fixed wait was landing AFTER the card had already left.
  let c = null;
  try {
    await page.waitForSelector('.combat-splash', { timeout: 8000 });
    c = await cardOnScreen(page);
    await page.screenshot({ path: join(OUT, 'trigger-karen-finisher.png') });
  } catch { /* leaves c null -> the check fails loudly */ }
  check('Scripted Karen loss fires her finisher card', !!c && c.src === 'karen_finisher.webp', c ? c.src : 'no card');
  check('  it uses THREAT dress (done TO the player)', !!c && /threat/.test(c.cls), c?.cls);
  const flag = await page.evaluate(() => !!window.__combat.player.getFlag('seen_karen_finisher'));
  check('  once per save (flag written)', flag);
  await page.close();
}

writeFileSync(join(OUT, 'triggers.json'), JSON.stringify(results, null, 1));
const failed = results.filter(r => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks pass`);
await browser.close();
process.exit(failed ? 1 : 0);
