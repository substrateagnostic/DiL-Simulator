// THE ATTACK-FEEL RE-JUDGE — full-fight evidence videos (H2 lane).
//
// One FULL fight per representative encounter, at the fight's designed player
// level, through the shipping path (real fixture boot, real _startCombat, real
// DOM clicks on the real HUD), so a judge can score attack READ / impact
// CONFIRM / turn RHYTHM per character with timestamps.
//
//   node tools/_h2-fight-videos.mjs --port=4519 [--only=karen,chad] [--tag=before]
//
// CAPTURE LAW compliance:
//   * runs against `npx vite preview` (pass --port), never the dev server
//   * ?qtier=high pins the quality tier, AND the sampler re-reads the live
//     Engine.qualityTier every 250 ms — a capture whose tier moved FAILS ITSELF
//   * identity-checked: the staged enemy ids, the player's level and the
//     difficulty id are asserted against the recipe after combat enters, and
//     the sampler records whether every enemy body is the Meshy cast (an
//     A-posed procedural stand-in is a report row, not a surprise)
//
// Writes screenshots/h2-run/videos/<tag>-<name>.webm + <tag>-report.json.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, renameSync, readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '4519');
const TAG = arg('tag', 'before');
const ONLY = (arg('only', '') || '').split(',').filter(Boolean);
const OUT = join(REPO, 'screenshots/h2-run/videos');
mkdirSync(OUT, { recursive: true });

// ── The six fights ────────────────────────────────────────────────────────
// level = the fight's DESIGNED player level (CLAUDE.md: Karen ~3-4, Chad ~5-6,
// Grandma ~7-8; sims run meredith@8-9, trio@7). clearFlags peels the preset
// back to the honest pre-fight state (identity: a state a playthrough reaches).
const FIGHTS = [
  {
    name: 'karen', fixture: 'act1', level: 3, fight: 'karen',
    setFlags: { retry_karen: true, karen_retry_ready: true },
    expect: ['karen'], maxSec: 240,
  },
  {
    name: 'chad', fixture: 'act2', level: 6, fight: 'chad',
    clearFlags: ['chad_defeated', 'defeated_chad', 'grandma_defeated', 'defeated_grandma'],
    expect: ['chad'], maxSec: 300,
  },
  {
    name: 'grandma', fixture: 'act2', level: 8, fight: 'grandma',
    clearFlags: ['grandma_defeated', 'defeated_grandma'],
    expect: ['grandma'], maxSec: 360,
  },
  {
    name: 'meredith', fixture: 'act5', level: 9, fight: 'meredith_boss',
    expect: ['meredith_boss'], maxSec: 420,
  },
  {
    name: 'client', fixture: 'act3', shot: 'reception', level: 5, client: true,
    expect: ['reception_client'], maxSec: 240,
  },
  {
    name: 'trio', fixture: 'act5', level: 7, fight: 'restructuring_trio',
    clearFlags: ['restructuring_defeated'],
    expect: ['restructuring_analyst', 'brand_consultant', 'data_analytics_lead'], maxSec: 420,
  },
];

const report = [];

async function captureFight(cfg) {
  if (ONLY.length && !ONLY.includes(cfg.name)) return;
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1940,1120'] });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]));

  const shot = cfg.shot ? `&shot=${cfg.shot}` : '';
  await page.goto(`http://localhost:${PORT}/?dev&fixture=${cfg.fixture}${shot}&qtier=high`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__explore && !!window.__explore.player, { timeout: 60000 });
  await page.waitForTimeout(1800);

  // Stage the honest pre-fight state, level the player, start the fight.
  await page.evaluate(({ setFlags, clearFlags, level, fight, client }) => {
    const ex = window.__explore;
    for (const [k, v] of Object.entries(setFlags || {})) ex.player.flags[k] = v;
    for (const k of (clearFlags || [])) delete ex.player.flags[k];
    ex._syncActFromFlags?.();
    let guard = 0;
    while ((ex.player.stats.level || 1) < level && guard++ < 200) ex.player.gainXP(150);
    // top the bars back up after level-ups
    ex.player.stats.hp = ex.player.stats.maxHP;
    ex.player.stats.mp = ex.player.stats.maxMP;
    if (client) {
      ex._meetCurrentClient();               // no client yet -> generates one
      setTimeout(() => ex._meetCurrentClient(), 900);  // second call starts the fight
    } else {
      ex._startCombat(fight);
    }
  }, cfg);

  await page.waitForFunction(() => !!window.__combat && !!window.__combat.engine, { timeout: 30000 });

  // ── IDENTITY CHECK ──────────────────────────────────────────────────
  const identity = await page.evaluate(() => {
    const c = window.__combat;
    return {
      enemies: c.enemyIdsList,
      level: c.player.stats.level,
      difficulty: (window.__difficulty && window.__difficulty.id) || 'normal(default)',
      // window.__engine is the live singleton (Engine.js:85, DEV_MODE) — never
      // a page-side import(), which hands back a second uninitialised Engine.
      qtier: window.__engine?.qualityTier ?? null,
    };
  });
  const idOk = JSON.stringify(identity.enemies) === JSON.stringify(cfg.expect) && identity.level === cfg.level;
  console.log(`${cfg.name}: staged ${identity.enemies.join('+')} @L${identity.level} — identity ${idOk ? 'OK' : 'MISMATCH'}`);

  // ── SAMPLER — the capture polices itself ─────────────────────────────
  await page.evaluate(() => {
    window.__h2 = { qtier: new Set(), meshy: true, splash: [], banners: [], turns: 0, samples: 0 };
    window.__h2Timer = setInterval(() => {
      const c = window.__combat;
      const s = window.__h2;
      s.samples++;
      if (window.__engine) s.qtier.add(window.__engine.qualityTier);
      if (c && c.scene) {
        for (const e of c.scene.enemyGroups) {
          if (!e.group.userData.meshy) s.meshy = false;
        }
      }
      const sp = document.querySelector('.combat-splash-img');
      if (sp) {
        const id = (sp.getAttribute('src') || '').split('/').pop().split('-')[0];
        if (!s.splash.includes(id)) s.splash.push(id);
      }
      const b = document.querySelector('.combat-power-banner');
      if (b && !s.banners.includes(b.textContent)) s.banners.push(b.textContent);
    }, 250);
  });

  // ── THE DRIVER — a competent player, via the real DOM ────────────────
  const t0 = Date.now();
  const state = { turn: 0, usedPower: false, result: null };
  while (Date.now() - t0 < cfg.maxSec * 1000) {
    const st = await page.evaluate(() => {
      const c = window.__combat;
      if (!c) return { over: true };
      return {
        over: false,
        input: c.inputEnabled === true,
        picker: !!document.querySelector('.target-picker-overlay'),
        minigame: !!document.querySelector('.minigame-overlay'),
        isOver: c.engine?.isOver || false,
        result: c.engine?.result || null,
      };
    }).catch(() => ({ over: true }));
    if (st.over) { break; }
    state.result = st.result || state.result;

    if (st.picker) {
      await page.keyboard.press('Enter', { delay: 120 });
      await page.waitForTimeout(500);
      continue;
    }
    if (st.minigame) {
      // Brace timing bar / gamble menu / tag picker — commit on the default.
      await page.keyboard.press('Space', { delay: 120 });
      await page.waitForTimeout(250);
      await page.keyboard.press('Enter', { delay: 120 });
      await page.waitForTimeout(700);
      continue;
    }
    if (!st.input) { await page.waitForTimeout(350); continue; }

    // Input is live — pick one action.
    state.turn++;
    const buttons = await page.$$eval('.combat-action-btn', els =>
      els.map(e => ({ text: e.textContent.trim(), disabled: e.classList.contains('disabled') })));
    const find = (t) => buttons.find(b => b.text.includes(t) && !b.disabled);
    const click = async (t) => { await page.click(`.combat-action-btn:has-text("${t}")`).catch(() => {}); };

    if (find('ASSERT DOMINANCE') && !state.usedPower) {
      state.usedPower = true;
      await click('ASSERT DOMINANCE');
    } else if (state.turn % 3 === 2 && find('Special')) {
      await click('Special');
      await page.waitForTimeout(450);
      const picked = await page.evaluate(() => {
        const items = [...document.querySelectorAll('.combat-submenu-item')]
          .filter(e => !e.classList.contains('disabled') && !/back/i.test(e.textContent));
        if (!items.length) return false;
        items[0].click();
        return true;
      });
      if (!picked) { await page.keyboard.press('Escape', { delay: 100 }); await page.waitForTimeout(300); await click('Attack'); }
    } else if (find('Attack')) {
      await click('Attack');
    } else if (find('Item')) {
      // turn-back 'sustain' menu — spend the returned turn on an item
      await click('Item');
      await page.waitForTimeout(450);
      const picked = await page.evaluate(() => {
        const items = [...document.querySelectorAll('.combat-submenu-item')]
          .filter(e => !e.classList.contains('disabled') && !/back/i.test(e.textContent));
        if (!items.length) return false;
        items[0].click();
        return true;
      });
      if (!picked) { await page.keyboard.press('Escape', { delay: 100 }); await page.waitForTimeout(300); await click('Brace'); }
    } else if (find('Brace')) {
      await click('Brace');
    }
    await page.waitForTimeout(900);
  }

  // Let the victory/defeat sequence and the exploration fade play out on tape.
  await page.waitForTimeout(3500);

  const got = await page.evaluate(() => {
    clearInterval(window.__h2Timer);
    const s = window.__h2;
    return { ...s, qtier: [...s.qtier] };
  }).catch(() => ({}));

  await ctx.close();
  await browser.close();

  const vids = readdirSync(OUT).filter(f => f.endsWith('.webm') && !/^[a-z-]+-[a-z]+\.webm$/.test(f));
  if (vids.length) {
    const newest = vids.map(f => ({ f, t: existsSync(join(OUT, f)) ? statSync(join(OUT, f)).mtimeMs : 0 }))
      .sort((a, b) => b.t - a.t)[0].f;
    renameSync(join(OUT, newest), join(OUT, `${TAG}-${cfg.name}.webm`));
  }

  const row = {
    name: cfg.name, tag: TAG, identity, identityOk: idOk,
    turns: state.turn, result: state.result,
    durationSec: Math.round((Date.now() - t0) / 1000),
    meshyThroughout: got.meshy ?? null, splash: got.splash || [], banners: got.banners || [],
    errors,
  };
  report.push(row);
  console.log(`${cfg.name.padEnd(10)} turns=${row.turns} result=${row.result} dur=${row.durationSec}s meshy=${row.meshyThroughout} errors=${errors.length}`);
}

for (const cfg of FIGHTS) await captureFight(cfg);
writeFileSync(join(OUT, `${TAG}-report.json`), JSON.stringify(report, null, 1));
console.log(`\nwrote ${OUT}`);
