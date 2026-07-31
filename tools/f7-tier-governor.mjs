// F7 — prices the SHIPPED quality tiers and the adaptive governor.
//
// Round-2 QA's hardest open note: "HARD FAIL on the 4x-throttle playable gate
// ... p95 = 88.3 / 57.6 / 67.0ms vs the <=33ms gate". Round 2 answered it with a
// pass-cost ladder (tools/f6-tier-ladder.mjs) that toggled passes by hand and
// showed COMP_CARD's degrade order *could* reach the floor. Nothing shipped
// walked that ladder, so the number in the gate never moved.
//
// This tool measures what actually ships now:
//   - Engine.setQualityTier('high'|'medium'|'low'), which is the ladder as a
//     product feature (and which 'low' now extends past COMP_CARD's written
//     stopping point by dropping city_backdrop + room_fx — see Engine.js).
//   - Engine's adaptive governor in AUTO, which is what an unattended player on
//     slow hardware gets. Reported as a tier TRAJECTORY plus the steady-state
//     distribution AFTER it settles, because the pre-settle frames are the
//     top tier being measured, not the shipped experience.
//
// Deliberately separate from perf-harness.mjs: this is a diagnostic that pins
// engine state, and pinned state must never leak into the gate numbers.
//
//   node tools/f7-tier-governor.mjs [--rooms=a,b] [--rates=1,2,4] [--seconds=8]
//
// Read-only. Writes screenshots/perf/f7/tier-governor.json.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm,reception,parking_garage').split(',').filter(Boolean);
const RATES = arg('rates', '1,2,4').split(',').map(Number);
const SECONDS = +arg('seconds', 8);
const GOV_SECONDS = +arg('gov-seconds', 16);
const OUT = 'screenshots/perf/f7';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: [
    '--window-position=-2400,0', '--window-size=1940,1180',
    '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
    '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--force_high_performance_gpu',
    '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required',
  ],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

const patrol = async (page, seconds) => {
  const seq = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  const end = Date.now() + seconds * 1000;
  let i = 0;
  while (Date.now() < end) {
    const k = seq[i++ % seq.length];
    await page.keyboard.down(k);
    await page.waitForTimeout(Math.max(120, Math.min(1500, end - Date.now())));
    await page.keyboard.up(k);
    if (Date.now() < end) await page.waitForTimeout(70);
  }
};

// Samples frame time, draw calls AND the tier in force, per frame — the tier
// series is what makes a governor run readable.
const startProbe = (page) => page.evaluate(() => {
  const E = window.__engine;
  E.renderer.info.autoReset = false;
  window.__mm = { dt: [], calls: [], tier: [], t: [], last: performance.now(), t0: performance.now(), on: true };
  const tick = () => {
    if (!window.__mm.on) return;
    const t = performance.now();
    window.__mm.dt.push(t - window.__mm.last); window.__mm.last = t;
    window.__mm.t.push(t - window.__mm.t0);
    window.__mm.calls.push(E.renderer.info.render.calls);
    window.__mm.tier.push(E.qualityTier);
    E.renderer.info.reset();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});

const stopProbe = (page, dropBeforeMs = 0) => page.evaluate((drop) => {
  window.__mm.on = false;
  window.__engine.renderer.info.autoReset = true;
  const m = window.__mm;
  const keep = [];
  for (let i = 1; i < m.dt.length; i++) if (m.t[i] >= drop) keep.push(i);
  const dt = keep.map((i) => m.dt[i]);
  const calls = keep.map((i) => m.calls[i]);
  const s = [...dt].sort((a, b) => a - b);
  const p = (q) => (s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * q))].toFixed(2) : null);
  const cs = [...calls].sort((a, b) => a - b);
  // tier trajectory: [{ tier, atMs }] on every change
  const traj = [];
  for (let i = 0; i < m.tier.length; i++) {
    if (i === 0 || m.tier[i] !== m.tier[i - 1]) traj.push({ tier: m.tier[i], atMs: +m.t[i].toFixed(0) });
  }
  return {
    frames: dt.length, droppedBeforeMs: drop,
    p50: p(0.5), p95: p(0.95), p99: p(0.99), max: s.length ? +s[s.length - 1].toFixed(2) : null,
    fps_p50: p(0.5) ? +(1000 / p(0.5)).toFixed(2) : null,
    over33: dt.filter((x) => x > 33).length,
    callsP50: cs.length ? cs[cs.length >> 1] : null,
    callsMax: cs.length ? cs[cs.length - 1] : null,
    tierTrajectory: traj,
    endTier: m.tier[m.tier.length - 1] || null,
  };
}, dropBeforeMs);

const results = [];
let gpu = null;

for (const room of ROOMS) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  if (!gpu) {
    gpu = await page.evaluate(() => {
      const gl = document.querySelector('canvas').getContext('webgl2');
      const d = gl.getExtension('WEBGL_debug_renderer_info');
      return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
    });
  }
  const cdp = await ctx.newCDPSession(page);
  const row = { room, pinned: {}, governor: {} };

  // ── pinned tiers ────────────────────────────────────────────────────────
  for (const rate of RATES) {
    for (const tier of ['high', 'medium', 'low']) {
      await page.evaluate((t) => {
        const E = window.__engine;
        E.setAdaptiveQuality(false);      // pin: governor must not move under us
        E.setQualityTier(t);
      }, tier);
      await page.waitForTimeout(400);
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      await startProbe(page);
      await patrol(page, SECONDS);
      row.pinned[`${tier}@${rate}x`] = await stopProbe(page);
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await page.waitForTimeout(300);
    }
  }

  // ── governor in AUTO, at the mobile-floor proxy ─────────────────────────
  // Reset to the top tier first: the governor's job is to find its own level
  // from a cold start, which is what a player launching the game gets.
  for (const rate of [2, 4]) {
    await page.evaluate(() => {
      const E = window.__engine;
      E.setQualityTier('high');          // pins (turns governor off)
      E.setAdaptiveQuality(true);        // then hand control back
    });
    await page.waitForTimeout(300);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    await startProbe(page);
    await patrol(page, GOV_SECONDS);
    // Settle window: the governor needs 60 frames to fill its ring plus a
    // 90-frame cooldown per step. At the throttled frame rate that is a few
    // seconds; everything before it is the TOP tier being measured, not the
    // shipped steady state. Both are reported.
    row.governor[`auto@${rate}x`] = {
      whole: await page.evaluate(() => {
        const m = window.__mm;
        const s = [...m.dt.slice(1)].sort((a, b) => a - b);
        const p = (q) => (s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * q))].toFixed(2) : null);
        return { frames: s.length, p50: p(0.5), p95: p(0.95), max: +s[s.length - 1].toFixed(2) };
      }),
      settled: await stopProbe(page, 6000),
    };
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.waitForTimeout(300);
  }

  results.push(row);
  console.log(`  ${room}: ${['high', 'medium', 'low'].map((t) => `${t}@4x p50 ${row.pinned[`${t}@4x`]?.p50}/p95 ${row.pinned[`${t}@4x`]?.p95}`).join(' · ')}`);
  console.log(`    governor@4x settled p50 ${row.governor['auto@4x']?.settled.p50} p95 ${row.governor['auto@4x']?.settled.p95} endTier ${row.governor['auto@4x']?.settled.endTier} traj ${JSON.stringify(row.governor['auto@4x']?.settled.tierTrajectory)}`);
  await page.close();
}

writeFileSync(`${OUT}/tier-governor.json`, JSON.stringify({ when: new Date().toISOString(), gpu, seconds: SECONDS, govSeconds: GOV_SECONDS, results }, null, 1));
console.log(`\nwrote ${OUT}/tier-governor.json`);
await browser.close();
