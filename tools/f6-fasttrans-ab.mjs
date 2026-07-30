// F6 gate — the N8AO transparency fast path must be BIT-IDENTICAL to stock.
//
// src/effects/N8AOFastTransparency.js replaces n8ao's renderTransparency() with
// a version that walks the scene once instead of four times, allocates nothing,
// and prunes subtrees that cannot draw. That is only legitimate if the frame it
// produces is the same frame. This measures it rather than asserting it:
//
//   • frozen frame, engine stopped, flicker pinned off
//   • render through the FAST path, gl.readPixels the drawing buffer
//   • flip window.__n8aoFast = false (n8ao's own method, kept live on the pass
//     as __n8aoStockRenderTransparency), render the same frame, readPixels
//   • compare every one of the 8,294,400 bytes
//
// Then the same A/B for cost: p50/p95/p99 and draw calls at CPU 1x and 4x.
//
//   node tools/f6-fasttrans-ab.mjs [--rooms=cubicle_farm,reception,parking_garage] [--seconds=8]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', arg('room', 'cubicle_farm,reception,parking_garage')).split(',').filter(Boolean);
const SECONDS = +arg('seconds', 8);
const RATES = arg('rates', '1,4').split(',').map(Number);
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
    return {
      frames: s.length, p50: p(0.5), p95: p(0.95), p99: p(0.99),
      max: s.length ? +s[s.length - 1].toFixed(2) : null,
      fps_p50: p(0.5) ? +(1000 / p(0.5)).toFixed(1) : null,
      callsP50: c.length ? c[Math.floor(c.length / 2)] : null,
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

  const installed = await page.evaluate(() => ({
    installed: !!window.__engine._n8aoPass?.__n8aoFastInstalled,
    transparencyAware: !!window.__engine._n8aoPass?.configuration?.transparencyAware,
  }));

  // ── exactness ──────────────────────────────────────────────────────────
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
    window.__n8aoFast = true; grab(); grab(); grab();
    const fast = grab();
    window.__n8aoFast = false; grab(); grab(); grab();
    const stock = grab();
    let differing = 0, maxDelta = 0;
    for (let i = 0; i < fast.length; i++) {
      const d = Math.abs(fast[i] - stock[i]);
      if (d) { differing++; if (d > maxDelta) maxDelta = d; }
    }
    // self-consistency control: two FAST renders of the same frozen frame
    window.__n8aoFast = true; grab();
    const a = grab(); const b = grab();
    let ctl = 0;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) ctl++;
    E.start();
    return { w, h, samples: fast.length, differing, maxDelta, selfControl: ctl };
  });

  // ── cost ───────────────────────────────────────────────────────────────
  const cdp = await ctx.newCDPSession(page);
  const runs = {};
  for (const rate of RATES) {
    for (const fast of [true, false]) {
      await page.evaluate((f) => { window.__n8aoFast = f; }, fast);
      await page.waitForTimeout(400);
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      runs[`${fast ? 'fast' : 'stock'}@${rate}x`] = await measure(page, SECONDS);
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
    }
  }
  await page.evaluate(() => { window.__n8aoFast = true; });

  results.push({ room, installed, pixels, runs });
  console.log(`\n===== ${room} =====  (fast path installed: ${installed.installed}, transparencyAware: ${installed.transparencyAware})`);
  console.log(`  EXACTNESS fast vs stock: ${pixels.differing} of ${pixels.samples} bytes differ, max Δ ${pixels.maxDelta}/255  (self-control ${pixels.selfControl})`);
  for (const [k, v] of Object.entries(runs)) {
    console.log(`  ${k.padEnd(12)} p50 ${String(v.p50).padStart(7)} p95 ${String(v.p95).padStart(7)} p99 ${String(v.p99).padStart(7)}  fps ${String(v.fps_p50).padStart(6)}  calls ${v.callsP50}`);
  }
  await page.close();
}

writeFileSync(`${OUT}/fasttrans-ab.json`, JSON.stringify({ when: new Date().toISOString(), seconds: SECONDS, results }, null, 2));
console.log(`\nwrote ${OUT}/fasttrans-ab.json`);
await browser.close();
