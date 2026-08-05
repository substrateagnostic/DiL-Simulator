// BEAT-CLASS VIDEOS — the judges' evidence for the attack-feel + splash-card work.
//
// One clip per beat class, each short enough that a judge is never asked to
// find the beat inside a long fight. HEADED chromium so the real GPU renders,
// 1920x1080, and `?qtier=high` PINS the quality tier — the adaptive governor
// degrades ON CAMERA otherwise, which is a documented law on this project.
//
//   node tools/_h-beat-videos.mjs [--port=5173] [--only=normal,power]
//
// Writes screenshots/h-run/videos/<beat>.webm plus a JSON of what each clip
// actually contained (so a clip that failed to stage its beat is visible as a
// number, not as a judge's disappointment).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, renameSync, readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '5173');
const ONLY = (arg('only', '') || '').split(',').filter(Boolean);
const OUT = join(REPO, 'screenshots/h-run/videos');
mkdirSync(OUT, { recursive: true });

const report = [];

async function clip(name, fightId, drive, { seconds = 12, setup = null } = {}) {
  if (ONLY.length && !ONLY.includes(name)) return;
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1940,1120'] });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&fight=${fightId}&qtier=high`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
  await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
  await page.waitForTimeout(1400);
  if (setup) await page.evaluate(setup);
  await page.waitForTimeout(400);

  // Everything the clip is supposed to contain, sampled at 20 Hz for its whole
  // length, so the report can say what the judge is about to see.
  const seen = await page.evaluate(() => {
    window.__seen = { splash: [], banners: [], numbers: 0, breaks: 0 };
    const t = setInterval(() => {
      const s = document.querySelector('.combat-splash-img');
      if (s) {
        const id = (s.getAttribute('src') || '').split('/').pop().split('-')[0];
        if (!window.__seen.splash.includes(id)) window.__seen.splash.push(id);
      }
      const b = document.querySelector('.combat-power-banner');
      if (b && !window.__seen.banners.includes(b.textContent)) window.__seen.banners.push(b.textContent);
      window.__seen.numbers += document.querySelectorAll('.floating-damage').length ? 1 : 0;
    }, 50);
    window.__seenTimer = t;
    return true;
  });
  void seen;

  await drive(page);
  await page.waitForTimeout(seconds * 1000);

  const got = await page.evaluate(() => {
    clearInterval(window.__seenTimer);
    return window.__seen;
  });
  await ctx.close();          // flushes the video
  await browser.close();
  // Playwright names videos by a random id; rename the newest to the beat.
  const vids = readdirSync(OUT).filter(f => f.endsWith('.webm') && !/^[a-z-]+\.webm$/.test(f));
  if (vids.length) {
    const newest = vids.map(f => ({ f, t: existsSync(join(OUT, f)) ? statSync(join(OUT, f)).mtimeMs : 0 }))
      .sort((a, b) => b.t - a.t)[0].f;
    renameSync(join(OUT, newest), join(OUT, `${name}.webm`));
  }
  report.push({ beat: name, fight: fightId, splash: got.splash, banners: got.banners, errors });
  console.log(`${name.padEnd(18)} splash=[${got.splash.join(',')}] banners=[${got.banners.join(',')}] errors=${errors.length}`);
}

const clickAttack = async (page) => { await page.click('.combat-action-btn:text-is("Attack")'); };

// ── V1  NORMAL HIT — three consecutive basic attacks, no crit ───────────
await clip('normal-hit', 'karen', async (page) => {
  for (let i = 0; i < 3; i++) {
    await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 20000 });
    await clickAttack(page);
    await page.waitForTimeout(4200);
  }
}, {
  seconds: 3,
  setup: () => {
    const c = window.__combat;
    c.engine.enemies.forEach(e => { e.maxHP = 3000; e.hp = 3000; });
    c.engine.player.maxHP = 4000; c.engine.player.hp = 4000;
  },
});

// ── V2  WEAKNESS HIT + THE TURN-BACK OFFER ──────────────────────────────
// Karen is weak to `legal`; File Motion is the free legal starter. The
// returned turn's restricted menu is the thing to watch.
await clip('weakness-turnback', 'karen', async (page) => {
  await page.click('.combat-action-btn:text-is("Special")');
  await page.waitForTimeout(600);
  await page.click('.combat-submenu-item:has-text("File Motion")').catch(() => {});
  await page.waitForTimeout(7000);
}, {
  seconds: 7,
  setup: () => {
    const c = window.__combat;
    c.engine.enemies.forEach(e => { e.maxHP = 3000; e.hp = 3000; });
    c.engine.player.maxHP = 4000; c.engine.player.hp = 4000; c.engine.player.mp = 999;
  },
});

// ── V3  COMPOSURE BREAK ─────────────────────────────────────────────────
await clip('composure-break', 'karen', async (page) => {
  await page.click('.combat-action-btn:text-is("Special")');
  await page.waitForTimeout(600);
  await page.click('.combat-submenu-item:has-text("File Motion")').catch(() => {});
  await page.waitForTimeout(6000);
}, {
  seconds: 8,
  setup: () => {
    const c = window.__combat;
    c.engine.enemies.forEach(e => {
      e.maxHP = 3000; e.hp = 3000;
      e.composure = 5;                      // one weakness hit from the Break
    });
    c.engine.player.maxHP = 4000; c.engine.player.hp = 4000; c.engine.player.mp = 999;
  },
});

// ── V4  POWER MOVE, WITH THE CARD ───────────────────────────────────────
await clip('power-move-card', 'karen', async (page) => {
  await page.click('.combat-action-btn:has-text("ASSERT DOMINANCE")');
  await page.waitForTimeout(4000);
}, {
  seconds: 6,
  setup: () => {
    const c = window.__combat;
    c.engine.enemies.forEach(e => { e.maxHP = 3000; e.hp = 3000; });
    c.engine.player.maxHP = 4000; c.engine.player.hp = 4000;
    c.engine.player.momentum = 100;
    c._enablePlayerInput();
  },
});

// ── V5  BOSS ULTIMATE TELEGRAPH, WITH THE WARNING CARD ──────────────────
await clip('ultimate-warning-card', 'karen', async (page) => {
  await page.evaluate(() => {
    const c = window.__combat;
    c.engine.enemies[0].hp = Math.round(c.engine.enemies[0].maxHP * 0.15);
    c.engine.telegraph = () => { c.engine.enemies[0].telegraphedAbility = 'live_tweet_rampage'; };
    c._enablePlayerInput();
  });
  await page.waitForTimeout(3000);
}, {
  seconds: 4,
  setup: () => {
    const c = window.__combat;
    c.engine.player.maxHP = 4000; c.engine.player.hp = 4000;
  },
});

// ── V6  THE SCRIPTED KAREN LOSS, WITH HER FINISHER CARD ─────────────────
await clip('karen-loss-finisher', 'karen', async (page) => {
  await clickAttack(page);
  await page.waitForTimeout(7000);
}, {
  seconds: 6,
  setup: () => {
    const c = window.__combat;
    c.player.setFlag('retry_karen', false);
    c.player.setFlag('seen_karen_finisher', false);
    c.enemyId = 'karen';
    c.engine.enemies.forEach(e => { e.maxHP = 3000; e.hp = 3000; e.atk = 999; });
    c.engine.allies[0].hp = 1;
  },
});

writeFileSync(join(OUT, 'videos.json'), JSON.stringify(report, null, 1));
console.log(`\nwrote ${OUT}`);
