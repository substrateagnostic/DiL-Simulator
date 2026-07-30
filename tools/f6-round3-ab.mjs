// F6 — interleaved A/B of the round-3 CPU patch.
//
// Two changes, both claimed pixel-exact:
//   M  Engine.renderScene(): ONE scene.updateMatrixWorld() per FRAME instead of
//      one per renderer.render() (a composed frame makes three).
//   T  N8AOFastTransparency: n8ao's renderTransparency() rewritten to one scene
//      walk with no per-frame allocation and dead-subtree pruning.
//
// Priced INTERLEAVED — every configuration measured once per round, rounds
// repeated — because the report's own method notes put single-session p50 drift
// at ~24% from thermal state alone, which is larger than the effect. Interleaving
// makes drift common-mode.
//
//   node tools/f6-round3-ab.mjs [--rooms=...] [--rates=1,4] [--seconds=6] [--rounds=3]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm,reception,parking_garage').split(',').filter(Boolean);
const RATES = arg('rates', '1,4').split(',').map(Number);
const SECONDS = +arg('seconds', 6);
const ROUNDS = +arg('rounds', 3);
const OUT = 'screenshots/perf/f6';
mkdirSync(OUT, { recursive: true });

const CONFIGS = [
  { id: 'round2', m: false, t: false, label: 'round-2 behaviour (both off)' },
  { id: 'M', m: true, t: false, label: '+ one matrix update per frame' },
  { id: 'T', m: false, t: true, label: '+ fast transparency only' },
  { id: 'MT', m: true, t: true, label: 'round-3 (both on)' },
];

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

const measure = async (page, seconds) => {
  await page.evaluate(() => {
    window.__mm = { dt: [], last: performance.now(), on: true, calls: [] };
    const E = window.__engine;
    E.renderer.info.autoReset = false;
    const tick = () => {
      if (!window.__mm.on) return;
      const t = performance.now();
      window.__mm.dt.push(t - window.__mm.last); window.__mm.last = t;
      window.__mm.calls.push(E.renderer.info.render.calls);
      E.renderer.info.reset();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await patrol(page, seconds);
  return page.evaluate(() => {
    window.__mm.on = false;
    window.__engine.renderer.info.autoReset = true;
    const s = [...window.__mm.dt].sort((a, b) => a - b);
    const p = (q) => (s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * q))].toFixed(2) : null);
    const c = [...window.__mm.calls].sort((a, b) => a - b);
    return { frames: s.length, p50: p(0.5), p95: p(0.95), p99: p(0.99), callsP50: c.length ? c[Math.floor(c.length / 2)] : null };
  });
};

const median = (a) => { const x = [...a].sort((m, n) => m - n); return x.length ? +(x.length % 2 ? x[(x.length - 1) / 2] : (x[x.length / 2 - 1] + x[x.length / 2]) / 2).toFixed(2) : null; };

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180',
    '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
    '--ignore-gpu-blocklist', '--force_high_performance_gpu', '--force-device-scale-factor=1',
    '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

const results = [];
for (const room of ROOMS) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${BASE}/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  for (let i = 0; i < 8; i++) {
    const busy = await page.evaluate(() => {
      const d = document.querySelector('.dialog-container');
      return (!!d && d.style.display !== 'none' && d.offsetParent !== null)
        || document.body.innerText.includes('EMPLOYEE PORTAL');
    }).catch(() => false);
    if (!busy) break;
    await page.keyboard.down('Enter'); await page.waitForTimeout(90);
    await page.keyboard.up('Enter'); await page.waitForTimeout(280);
  }
  await page.waitForTimeout(2500);

  // pixel exactness of the full round-3 config vs round-2 behaviour
  const pixels = await page.evaluate(() => {
    const E = window.__engine;
    E.stop();
    E._flicker = false;
    if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
    const gl = E.renderer.getContext();
    const w = E.renderer.domElement.width, h = E.renderer.domElement.height;
    const grab = () => {
      E.renderScene(E.scene, E.camera);
      const b = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b);
      return b;
    };
    const set = (m, t) => { window.__frameMatrix = m; window.__n8aoFast = t; };
    set(false, false); grab(); grab(); grab();
    const a = grab();
    set(true, true); grab(); grab(); grab();
    const b = grab();
    let differing = 0, maxDelta = 0;
    for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d) { differing++; if (d > maxDelta) maxDelta = d; } }
    E.start();
    return { samples: a.length, differing, maxDelta, w, h };
  });

  const cdp = await ctx.newCDPSession(page);
  const acc = {};
  for (const c of CONFIGS) for (const rate of RATES) acc[`${c.id}@${rate}x`] = { p50: [], p95: [], p99: [], calls: [] };

  for (let r = 0; r < ROUNDS; r++) {
    for (const rate of RATES) {
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      for (const c of CONFIGS) {
        await page.evaluate(({ m, t }) => { window.__frameMatrix = m; window.__n8aoFast = t; }, c);
        await page.waitForTimeout(300);
        const s = await measure(page, SECONDS);
        const a = acc[`${c.id}@${rate}x`];
        a.p50.push(s.p50); a.p95.push(s.p95); a.p99.push(s.p99); a.calls.push(s.callsP50);
      }
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
    }
    console.log(`  ${room}: round ${r + 1}/${ROUNDS} done`);
  }
  await page.evaluate(() => { window.__frameMatrix = true; window.__n8aoFast = true; });

  const table = {};
  for (const [k, v] of Object.entries(acc)) {
    table[k] = { p50: median(v.p50), p95: median(v.p95), p99: median(v.p99), calls: median(v.calls), n: v.p50.length };
  }
  results.push({ room, rounds: ROUNDS, seconds: SECONDS, pixels, table });

  console.log(`\n===== ${room} =====  (${ROUNDS} interleaved rounds x ${SECONDS}s)`);
  console.log(`  pixel exactness round-3 vs round-2, frozen frame, readPixels: ${pixels.differing} of ${pixels.samples} bytes differ (max Δ ${pixels.maxDelta}/255)`);
  for (const rate of RATES) {
    const base = table[`round2@${rate}x`];
    for (const c of CONFIGS) {
      const t = table[`${c.id}@${rate}x`];
      const d50 = base && t ? ` (${(t.p50 - base.p50 >= 0 ? '+' : '')}${(t.p50 - base.p50).toFixed(1)}ms p50, ${((t.p50 / base.p50 - 1) * 100).toFixed(1)}%)` : '';
      console.log(`  CPU${rate}x ${c.id.padEnd(7)} p50 ${String(t.p50).padStart(7)} p95 ${String(t.p95).padStart(7)} p99 ${String(t.p99).padStart(7)} calls ${String(t.calls).padStart(5)}${d50}`);
    }
  }
  await page.close();
}

writeFileSync(`${OUT}/round3-ab.json`, JSON.stringify({ when: new Date().toISOString(), rounds: ROUNDS, seconds: SECONDS, results }, null, 2));
console.log(`\nwrote ${OUT}/round3-ab.json`);
await browser.close();
