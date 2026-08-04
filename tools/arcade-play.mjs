// ============================================================
// tools/arcade-play.mjs — PLAY Sprint Review with a real keyboard
// ============================================================
// Boots the game at ?dev&arcade=1, which trips the REAL `launch_arcade`
// flag path (ExplorationState's flag-set listener dynamic-imports the
// state) rather than constructing ArcadeState behind the game's back —
// §4.3, verify the call path.
//
// Drives it with actual key events through a scripted policy, samples
// the live physics body every frame-ish (window.__arcade, DEV_MODE only),
// records a video, and writes a labelled screenshot set + run.json.
//
//   node tools/arcade-play.mjs --secs=75 --port=5174 --out=<dir>
//
// TWO THINGS THAT COST AN HOUR EACH, DO NOT REDISCOVER THEM:
//  1. InputManager derives justPressed by diffing key state BETWEEN
//     FRAMES. A zero-delay press() (down+up in one task) is invisible to
//     the game. Every tap must be held for several frames.
//  2. Playwright video recording drops the page to ~10-20 fps, so
//     "several frames" is ~200ms of wall clock, not 50.
//
// HEADED chromium per the house law; closes its own browser.
// ============================================================
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => {
  const hit = process.argv.find(a => a.startsWith(`--${k}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};

const SECS = Number(arg('secs', 75));
const OUT = path.resolve(arg('out', 'screenshots/g-run/arcade'));
const PORT = arg('port', '5174');
const VIDEO = arg('video', '1') !== '0';
const W = 1280, H = 720;
const TAP = Number(arg('tap', VIDEO ? 220 : 110));

fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-gl=angle', '--enable-gpu', `--window-size=${W},${H + 120}`],
  });
  const ctxOpts = { viewport: { width: W, height: H } };
  if (VIDEO) {
    fs.mkdirSync(path.join(OUT, 'video'), { recursive: true });
    ctxOpts.recordVideo = { dir: path.join(OUT, 'video'), size: { width: W, height: H } };
  }
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(`http://localhost:${PORT}/?dev&arcade=1&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
  await page.waitForSelector('#sr-root', { timeout: 20000 });
  await page.waitForFunction(() => !!window.__arcade, { timeout: 20000 });
  await sleep(700);

  const tap = async (key, ms = TAP) => {
    await page.keyboard.down(key);
    await sleep(ms);
    await page.keyboard.up(key);
  };
  const held = {};
  const hold = async (k, on) => {
    if (!!held[k] === !!on) return;
    held[k] = on;
    if (on) await page.keyboard.down(k); else await page.keyboard.up(k);
  };

  let n = 0;
  const shots = [];
  const shot = async (name) => {
    const f = path.join(OUT, `${String(n++).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: f });
    shots.push(path.basename(f));
  };

  // Live physics read — the actual body, not the HUD's rounding of it.
  const probe = () => page.evaluate(() => {
    const a = window.__arcade;
    if (!a) return null;
    const r = a.runner;
    return {
      x: +r.x.toFixed(2), y: +r.y.toFixed(2),
      gsp: +r.gsp.toFixed(2), vy: +r.vy.toFixed(2),
      ang: +(r.angle * 57.2958).toFixed(1),
      grounded: r.grounded, rolling: r.rolling, jumping: r.jumping,
      spin: r.spindash, shoes: +r.shoes.toFixed(2), inv: +r.invuln.toFixed(2),
      started: a.started, over: a.over, cause: a.overCause,
      score: a.score, clips: a.clips, floors: a.floors,
      dread: +a._dread().toFixed(3), props: a.active.length,
      runTime: +a.runTime.toFixed(1),
      fps: a._fps || 0,
    };
  });

  await shot('title-card');

  // ---- clock in -----------------------------------------------------------
  await tap('Space');
  await sleep(500);
  let s = await probe();
  if (!s.started) { await tap('Enter', TAP * 2); await sleep(400); s = await probe(); }
  await shot('01-clocked-in');

  // ---- SPIN DASH off the line ---------------------------------------------
  // Hold Down, tap jump to rev, release Down to fire. The single most
  // iconic Genesis input; proving it first proves the whole input path.
  await hold('ArrowDown', true);
  await sleep(200);
  for (let i = 0; i < 5; i++) { await tap('Space', 90); await sleep(90); }
  const charged = await probe();
  await shot('spindash-charge');
  await hold('ArrowDown', false);
  await sleep(160);
  const fired = await probe();
  await shot('spindash-release');

  await hold('ArrowRight', true);

  // ---- the run --------------------------------------------------------------
  const log = [];
  const t0 = Date.now();
  const beat = {};
  let peak = { gsp: 0, air: 0, downhill: 0, uphill: 0, floors: 0, score: 0 };
  const seen = {
    launchedOffCrest: false, rolled: false, smashed: false, hurt: false,
    sprung: false, boosted: false, shoes: false, aboveTopSpeed: false,
    checkpoint: false, deaths: [],
  };
  let prevScore = 0, prevGrounded = true, prevClips = 0;
  let deaths = 0;

  while ((Date.now() - t0) / 1000 < SECS) {
    const p = await probe();
    if (!p) break;
    const el = (Date.now() - t0) / 1000;
    log.push({ t: +el.toFixed(2), ...p });

    peak.gsp = Math.max(peak.gsp, Math.abs(p.gsp));
    peak.air = Math.max(peak.air, p.grounded ? 0 : p.y);
    peak.downhill = Math.min(peak.downhill, p.ang);
    peak.uphill = Math.max(peak.uphill, p.ang);
    peak.floors = Math.max(peak.floors, p.floors);
    peak.score = Math.max(peak.score, p.score);

    if (Math.abs(p.gsp) > 18.2) seen.aboveTopSpeed = true;
    if (p.rolling) seen.rolled = true;
    if (prevGrounded && !p.grounded && !p.jumping) seen.launchedOffCrest = true;
    if (p.shoes > 0) seen.shoes = true;
    if (p.inv > 0) seen.hurt = true;
    if (p.score - prevScore === 25) seen.smashed = true;
    if (p.score - prevScore >= 250) seen.checkpoint = true;
    if (!p.grounded && p.vy > 22) seen.sprung = true;
    if (p.grounded && p.gsp - Math.abs(0) > 24 && prevGrounded) seen.boosted = true;
    prevScore = p.score; prevGrounded = p.grounded; prevClips = p.clips;

    if (p.over) {
      deaths++;
      seen.deaths.push({ cause: p.cause, floors: p.floors, score: p.score, at: +el.toFixed(1) });
      await hold('ArrowRight', false);
      await hold('ArrowDown', false);
      await sleep(300);
      await shot(`death-${deaths}`);
      if (el < SECS - 15) {
        await tap('Enter', TAP * 2);
        await sleep(600);
        await shot(`restart-${deaths}`);
        await hold('ArrowRight', true);
      } else break;
      continue;
    }

    // --- policy: play it like a human who knows the game --------------------
    const r = Math.random();
    if (p.grounded && p.ang < -6 && Math.abs(p.gsp) > 5 && r < 0.55) {
      // Downhill: ROLL. This is the whole game — rolling a slope is how
      // you break top speed.
      await hold('ArrowDown', true);
      await sleep(TAP * 1.6);
      await hold('ArrowDown', false);
    } else if (r < 0.42) {
      // Variable-height jump.
      await page.keyboard.down('Space');
      await sleep(70 + Math.random() * 170);
      await page.keyboard.up('Space');
    } else if (r < 0.5) {
      // Occasional duck-and-hold to clear a ceiling pipe.
      await hold('ArrowDown', true);
      await sleep(TAP);
      await hold('ArrowDown', false);
    }

    // Independent flags, not a counter: a single counter meant whichever
    // beat fired first starved every beat with a lower index.
    if (el > 5 && !beat.acc) { await shot('accelerating'); beat.acc = 1; }
    if (el > 14 && !beat.flow) { await shot('flow'); beat.flow = 1; }
    if (el > 26 && !beat.mid) { await shot('mid-run'); beat.mid = 1; }
    if (el > 40 && !beat.deep) { await shot('deep-run'); beat.deep = 1; }
    if (Math.abs(p.gsp) > 24 && !beat.overtop) { await shot('above-top-speed'); beat.overtop = 1; }
    if (p.rolling && !beat.roll) { await shot('rolling'); beat.roll = 1; }
    if (p.dread > 0.65 && !beat.dread) { await shot('deadline-pressure'); beat.dread = 1; }
    if (!p.grounded && p.y > 4 && !beat.air) { await shot('airborne'); beat.air = 1; }

    await sleep(110);
  }

  await hold('ArrowRight', false);
  await hold('ArrowDown', false);
  await shot('final');

  const summary = {
    seconds: SECS,
    spindash: { chargedTo: charged && charged.spin, firedAt: fired && Math.abs(fired.gsp) },
    peak,
    seen,
    deaths,
    samples: log.length,
    errors,
  };
  fs.writeFileSync(path.join(OUT, 'run.json'), JSON.stringify({ summary, log }, null, 1), 'utf8');
  console.log(JSON.stringify(summary, null, 1));

  await page.close();
  await ctx.close();
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
