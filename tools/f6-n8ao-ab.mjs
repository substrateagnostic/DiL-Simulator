// F6 experiment — what does N8AO's transparency pass actually cost, and what
// does turning it off actually change?
//
// Found by the f6 CPU profile + traverse trace: n8ao's N8AOPass runs
// `detectTransparency()` and, because this scene contains transparent
// materials, `renderTransparency()` EVERY FRAME. That method (n8ao
// src/N8AOPass.js:382) does four full `scene.traverse()` walks, builds a
// Map with one entry per Object3D, and issues TWO extra full
// `renderer.render(scene, camera)` calls — each of which re-runs
// updateMatrixWorld + projectObject over the whole 967-node graph.
//
// None of that is visible in the draw-call metric (the extra renders draw only
// transparent objects), which is why the round-2 report attributed the
// CPU-throttled rows to draw-call submission. This prices it directly.
//
// Variants, each measured at CPU 1x and 4x, each pixel-diffed against baseline
// on a frozen frame via gl.readPixels:
//   baseline            as shipped
//   noTransparencyAware configuration.transparencyAware = false
//   noAO                setAmbientOcclusion(false)
//
//   node tools/f6-n8ao-ab.mjs [--rooms=cubicle_farm,reception] [--seconds=8]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', arg('room', 'cubicle_farm')).split(',').filter(Boolean);
const SECONDS = +arg('seconds', 8);
const OUT = 'screenshots/perf/f6';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180',
    '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
    '--ignore-gpu-blocklist', '--force_high_performance_gpu', '--force-device-scale-factor=1',
    '--autoplay-policy=no-user-gesture-required'],
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

const APPLY = (v) => {
  const E = window.__engine;
  const p = E._n8aoPass;
  if (v === 'baseline') {
    E.setAmbientOcclusion(true);
    if (p) { p.autoDetectTransparency = true; p.configuration.transparencyAware = true; }
  } else if (v === 'noTransparencyAware') {
    E.setAmbientOcclusion(true);
    if (p) { p.autoDetectTransparency = false; p.configuration.transparencyAware = false; }
  } else if (v === 'noAO') {
    E.setAmbientOcclusion(false);
  }
};

const measure = async (page, seconds) => {
  await page.evaluate(() => {
    window.__mm = { dt: [], last: performance.now(), on: true, calls: [], tris: [] };
    const E = window.__engine;
    E.renderer.info.autoReset = false;
    const tick = () => {
      if (!window.__mm.on) return;
      const t = performance.now();
      window.__mm.dt.push(t - window.__mm.last);
      window.__mm.last = t;
      window.__mm.calls.push(E.renderer.info.render.calls);
      window.__mm.tris.push(E.renderer.info.render.triangles);
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
    const med = (a) => { const x = [...a].sort((m, n) => m - n); return x.length ? x[Math.floor(x.length / 2)] : null; };
    return {
      frames: s.length, p50: p(0.5), p95: p(0.95), p99: p(0.99),
      max: s.length ? +s[s.length - 1].toFixed(2) : null,
      fps_p50: p(0.5) ? +(1000 / p(0.5)).toFixed(1) : null,
      callsP50: med(window.__mm.calls), trisP50: med(window.__mm.tris),
    };
  });
};

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

  const cdp = await ctx.newCDPSession(page);
  const runs = {};
  for (const rate of [1, 4]) {
    for (const v of ['baseline', 'noTransparencyAware', 'noAO']) {
      await page.evaluate(APPLY, v);
      await page.waitForTimeout(500);
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      runs[`${v}@${rate}x`] = await measure(page, SECONDS);
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
    }
  }
  await page.evaluate(APPLY, 'baseline');

  // frozen-frame pixel delta of each variant vs baseline, on the drawing buffer
  const pixels = await page.evaluate((applySrc) => {
    const apply = new Function('v', `(${applySrc})(v)`);
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
    const cmp = (a, b) => {
      let n = 0, mx = 0, perceptible = 0;
      for (let i = 0; i < a.length; i += 4) {
        const dr = Math.abs(a[i] - b[i]), dg = Math.abs(a[i + 1] - b[i + 1]), db = Math.abs(a[i + 2] - b[i + 2]);
        const d = Math.max(dr, dg, db);
        if (d) { n++; if (d > mx) mx = d; if (d > 2) perceptible++; }
      }
      return { pixels: n, maxDelta: mx, perceptiblePx: perceptible, totalPx: a.length / 4 };
    };
    apply('baseline'); grab(); grab(); grab();
    const base = grab();
    const out = {};
    for (const v of ['noTransparencyAware', 'noAO']) {
      apply(v); grab(); grab(); grab();
      out[v] = cmp(base, grab());
    }
    apply('baseline');
    E.start();
    return { w, h, out };
  }, APPLY.toString());

  results.push({ room, runs, pixels });
  console.log(`\n===== ${room} =====`);
  for (const [k, v] of Object.entries(runs)) {
    console.log(`  ${k.padEnd(28)} p50 ${String(v.p50).padStart(7)} p95 ${String(v.p95).padStart(7)} p99 ${String(v.p99).padStart(7)}  fps ${String(v.fps_p50).padStart(6)}  calls ${v.callsP50}  tris ${v.trisP50}`);
  }
  for (const [k, v] of Object.entries(pixels.out)) {
    console.log(`  pixel delta vs baseline · ${k}: ${v.pixels} / ${v.totalPx} px (${(v.pixels / v.totalPx * 100).toFixed(2)}%), max Δ ${v.maxDelta}/255, >2/255 on ${v.perceptiblePx} px`);
  }
  await page.close();
}

writeFileSync(`${OUT}/n8ao-ab.json`, JSON.stringify({ when: new Date().toISOString(), seconds: SECONDS, results }, null, 2));
console.log(`\nwrote ${OUT}/n8ao-ab.json`);
await browser.close();
