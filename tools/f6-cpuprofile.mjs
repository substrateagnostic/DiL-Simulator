// F6 diagnostic — WHERE the CPU-throttled frame actually goes.
//
// The round-2 report closes with an inference, not a measurement: "draw-call
// submission is the dominant term" in the CPU-4x rows. LoAF cannot settle that
// (the whole game loop is one closure, so every long frame attributes to
// Engine.js's rAF arrow), and the report says so explicitly:
//   "Attribution below the loop needs a CPU profile, not LoAF."
//
// This is that CPU profile. CDP Profiler sampling at 100us over the same
// scripted patrol the harness uses, at CPU throttle 1x and 4x, aggregated by
// self time per call frame and rolled up into buckets that map to a fix:
//
//   gl-submit      three's WebGLRenderer inner loop (renderBufferDirect,
//                  setProgram, bindingStates, uniform uploads) — the draw-call
//                  submission cost the report is claiming.
//   scene-graph    projectObject / updateMatrixWorld / frustum culling — cost
//                  that scales with NODE count, not draw calls.
//   shadow         WebGLShadowMap.render
//   post           the composer passes' own JS
//   game           this repo's src/ (game logic, animators, states)
//   dom            style/layout/HUD
//   gpu-wait       (program)/(idle)/(garbage collector) and readback stalls
//
//   node tools/f6-cpuprofile.mjs [--room=cubicle_farm] [--seconds=10] [--rates=1,4]
//
// Read-only: touches nothing in src/, commits nothing, reverts nothing (there is
// nothing to revert). Writes screenshots/perf/f6/cpuprofile.json.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('room', arg('rooms', 'cubicle_farm')).split(',').filter(Boolean);
const SECONDS = +arg('seconds', 10);
const RATES = arg('rates', '1,4').split(',').map(Number);
// Quality tier to PIN for the profile. Engine's adaptive governor ships on, so
// without a pin the profile would be a blend of whatever tiers it wandered
// through. 'low' is the mobile-floor tier and is where the remaining CPU-4x
// tail lives, so it is worth profiling on its own.
const TIER = arg('tier', 'high');
const OUT = 'screenshots/perf/f6';

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

// ── bucket classification ────────────────────────────────────────────────
// Ordered: first match wins. Keyed on three.module's own function names, which
// are stable across r150+ and are what the sampler reports.
const GL_SUBMIT = new Set([
  'renderBufferDirect', 'setProgram', 'renderObject', 'renderObjects',
  'setup', 'setupVertexAttributes', 'upload', 'uploadUniforms', 'setValue',
  'setValueV3f', 'setValueM4', 'setValueT1', 'setValueV4f', 'setValueV2f',
  'setValueV1f', 'setValueV1i', 'refreshUniformsCommon', 'refreshTransformUniform',
  'getUniforms', 'setOptional', 'seqWithValue', 'bindVertexArrayObject',
  'updateBuffers', 'initAttributes', 'enableAttributeAndDivisor', 'texture2D',
  'setTexture2D', 'bindTexture', 'activeTexture', 'getParameters', 'getProgramCacheKey',
  'acquireProgram', 'setMaterial', 'markUniformsLightsNeedsUpdate',
]);
const SCENE_GRAPH = new Set([
  'projectObject', 'updateMatrixWorld', 'updateWorldMatrix', 'setFromProjectionMatrix',
  'intersectsObject', 'intersectsSprite', 'setFromObject', 'compose', 'decompose',
  'multiplyMatrices', 'setFromMatrixPosition', 'push', 'get', 'setupLights',
  'setupLightsView', 'sort',
]);
const POST = new Set(['render', 'swapBuffers', 'setSize', 'fsQuad', 'FullScreenQuad']);

const bucketOf = (fn, url) => {
  const three = /three\.module|three\/build|node_modules[\\/]three/.test(url);
  const src = /\/src\//.test(url) && !three;
  if (!fn || fn.startsWith('(')) {
    if (/garbage/.test(fn)) return 'gpu-wait/gc';
    if (/program|idle/.test(fn)) return 'gpu-wait/gc';
    return 'unattributed';
  }
  if (/ShadowMap|shadow/i.test(fn)) return 'shadow';
  if (three) {
    if (GL_SUBMIT.has(fn)) return 'gl-submit';
    if (SCENE_GRAPH.has(fn)) return 'scene-graph';
    if (POST.has(fn)) return 'post';
    return 'three-other';
  }
  if (src) return 'game';
  if (/n8ao/.test(url)) return 'post';
  if (/recalc|layout|style|innerHTML|appendChild/i.test(fn)) return 'dom';
  return 'other';
};

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

const results = [];

for (const room of ROOMS) {
  for (const rate of RATES) {
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
    await page.goto(`${BASE}/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
    // clear any popup
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
    await page.waitForTimeout(2500);   // warm-up: compiles/uploads land here
    await page.evaluate((t) => { const E = window.__engine; E.setAdaptiveQuality(false); E.setQualityTier(t); }, TIER);
    await page.waitForTimeout(500);

    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
    if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    // frame-time ground truth alongside the profile, so the bucket shares can be
    // multiplied back into milliseconds.
    await page.evaluate(() => {
      window.__f6 = { dt: [], last: performance.now(), on: true };
      const tick = () => {
        if (!window.__f6.on) return;
        const t = performance.now();
        window.__f6.dt.push(t - window.__f6.last);
        window.__f6.last = t;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await cdp.send('Profiler.start');
    await patrol(page, SECONDS);
    const { profile } = await cdp.send('Profiler.stop');
    const dt = await page.evaluate(() => { window.__f6.on = false; return window.__f6.dt; });
    if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});

    // ── aggregate self time ──────────────────────────────────────────────
    const byId = new Map();
    for (const n of profile.nodes) byId.set(n.id, n);
    const selfUs = new Map();               // node id -> microseconds
    const deltas = profile.timeDeltas || [];
    const samples = profile.samples || [];
    for (let i = 0; i < samples.length; i++) {
      const d = deltas[i] ?? 0;
      selfUs.set(samples[i], (selfUs.get(samples[i]) || 0) + d);
    }
    const totalUs = [...selfUs.values()].reduce((a, b) => a + b, 0) || 1;

    const buckets = new Map();
    const funcs = new Map();
    for (const [id, us] of selfUs) {
      const n = byId.get(id);
      if (!n) continue;
      const fn = n.callFrame.functionName || '(anonymous)';
      const url = n.callFrame.url || '';
      const b = bucketOf(fn, url);
      buckets.set(b, (buckets.get(b) || 0) + us);
      const key = `${b}|${fn}|${url.replace(/^https?:\/\/[^/]+/, '')}:${n.callFrame.lineNumber + 1}`;
      funcs.set(key, (funcs.get(key) || 0) + us);
    }

    const sorted = [...dt].sort((a, b) => a - b);
    const pct = (p) => sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))].toFixed(2) : null;
    const wall = SECONDS;

    const bucketRows = [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([b, us]) => ({
        bucket: b,
        ms: +(us / 1000).toFixed(1),
        pctOfProfile: +((us / totalUs) * 100).toFixed(1),
        msPerFrame: +((us / 1000) / (dt.length || 1)).toFixed(3),
      }));
    const funcRows = [...funcs.entries()]
      .sort((a, b) => b[1] - a[1]).slice(0, 30)
      .map(([k, us]) => {
        const [bucket, fn, where] = k.split('|');
        return {
          bucket, fn, where,
          ms: +(us / 1000).toFixed(1),
          pct: +((us / totalUs) * 100).toFixed(1),
          msPerFrame: +((us / 1000) / (dt.length || 1)).toFixed(3),
        };
      });

    const r = {
      room, rate, tier: TIER, frames: dt.length, wallS: wall,
      p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: sorted.length ? +sorted[sorted.length - 1].toFixed(2) : null,
      fps_p50: pct(0.5) ? +(1000 / pct(0.5)).toFixed(2) : null,
      profiledMs: +(totalUs / 1000).toFixed(1),
      profiledShareOfWall: +((totalUs / 1000) / (wall * 1000) * 100).toFixed(1),
      buckets: bucketRows, topFunctions: funcRows,
    };
    results.push(r);

    console.log(`\n=== ${room} @ CPU ${rate}x — ${dt.length} frames, p50 ${r.p50}ms p95 ${r.p95}ms ===`);
    for (const b of bucketRows) console.log(`  ${b.bucket.padEnd(14)} ${String(b.pctOfProfile).padStart(5)}%  ${String(b.msPerFrame).padStart(7)} ms/frame`);
    console.log('  --- top self-time functions ---');
    for (const f of funcRows.slice(0, 12)) console.log(`  ${String(f.pct).padStart(5)}%  ${f.msPerFrame.toFixed(3)}ms/f  ${f.bucket.padEnd(12)} ${f.fn}  ${f.where}`);

    await page.close();
  }
}

writeFileSync(`${OUT}/cpuprofile.json`, JSON.stringify({ when: new Date().toISOString(), seconds: SECONDS, results }, null, 2));
console.log(`\nwrote ${OUT}/cpuprofile.json`);
await browser.close();
