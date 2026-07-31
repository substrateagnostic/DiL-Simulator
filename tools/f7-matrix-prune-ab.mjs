// F7 — is scene-graph matrix pruning worth shipping?
//
// The CPU profile at the mobile-floor tier (screenshots/perf/f6/cpuprofile.json,
// --tier=low --rates=4) makes `updateMatrixWorld` the largest non-idle entry in
// the frame: 2.726ms/frame, ahead of renderBufferDirect (2.177). With
// `multiplyMatrices` (0.958) that is 3.68ms of a 30ms frame spent recomputing
// world matrices for a ~970-node graph.
//
// The census (screenshots/perf/f6/scenegraph-ab.json) says ~380 of those 970
// nodes are INVISIBLE conditional-NPC duplicates — five Janets, three Rachels,
// three Interns, a Karen — that render nothing (three's projectObject early-outs
// on visible===false) but are still fully traversed by updateMatrixWorld, which
// does not check visibility.
//
// The catch, and the reason this needs measuring rather than asserting: setting
// `matrixWorldAutoUpdate = false` on a child does NOT prune it unless `force` is
// false at that point in the recursion — and three sets force=true at the ROOT,
// because Scene.matrixAutoUpdate defaults to true, so updateMatrix() runs and
// sets matrixWorldNeedsUpdate. Pruning therefore requires
// `scene.matrixAutoUpdate = false` as well. This tool proves whether the pair
// actually reduces the traversal, and prices the CEILING (freeze the entire
// graph) so the partial fix can be judged against what is even available.
//
//   node tools/f7-matrix-prune-ab.mjs [--rooms=..] [--tier=low] [--rates=4] [--rounds=3]
//
// Read-only on src/. Writes screenshots/perf/f7/matrix-prune-ab.json.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm').split(',').filter(Boolean);
const RATES = arg('rates', '4').split(',').map(Number);
const TIER = arg('tier', 'low');
const SECONDS = +arg('seconds', 6);
const ROUNDS = +arg('rounds', 3);
const OUT = 'screenshots/perf/f7';
mkdirSync(OUT, { recursive: true });

// Interleaved, because the report's own method notes put single-session p50
// drift at ~24% from thermal state — larger than the effect being measured.
const CONFIGS = [
  { id: 'base', label: 'as shipped (no pruning)' },
  { id: 'hidden', label: 'prune INVISIBLE top-level subtrees + scene.matrixAutoUpdate=false' },
  { id: 'all', label: 'CEILING — freeze the entire graph after one update' },
];

const APPLY = (id) => {
  const E = window.__engine;
  const S = E.scene;
  // full reset first
  S.matrixAutoUpdate = true;
  S.traverse((o) => { o.matrixWorldAutoUpdate = true; });
  S.updateMatrixWorld(true);
  if (id === 'base') return;
  if (id === 'hidden') {
    // force cannot be allowed to propagate from the root, or every
    // matrixWorldAutoUpdate=false below is ignored.
    S.matrixAutoUpdate = false;
    S.updateMatrix();
    S.updateMatrixWorld(true);
    S.matrixWorldNeedsUpdate = false;
    for (const c of S.children) if (c.visible === false) { c.matrixAutoUpdate = false; c.matrixWorldAutoUpdate = false; }
  }
  if (id === 'all') {
    S.updateMatrixWorld(true);
    S.matrixAutoUpdate = false;
    S.matrixWorldNeedsUpdate = false;
    for (const c of S.children) { c.matrixAutoUpdate = false; c.matrixWorldAutoUpdate = false; }
  }
};

const CENSUS = () => {
  const S = window.__engine.scene;
  let total = 0, pruned = 0;
  S.traverse(() => total++);
  const walk = (o, live) => { if (!live) pruned++; for (const c of o.children) walk(c, live && c.matrixWorldAutoUpdate !== false); };
  for (const c of S.children) walk(c, c.matrixWorldAutoUpdate !== false);
  return { total, prunedFromTraversal: pruned };
};

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
    await page.waitForTimeout(Math.max(120, Math.min(1200, end - Date.now())));
    await page.keyboard.up(k);
    if (Date.now() < end) await page.waitForTimeout(60);
  }
};

const measure = async (page, seconds) => {
  await page.evaluate(() => {
    const E = window.__engine;
    E.renderer.info.autoReset = false;
    window.__mm = { dt: [], calls: [], last: performance.now(), on: true };
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
    const s = [...window.__mm.dt.slice(1)].sort((a, b) => a - b);
    const p = (q) => (s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * q))].toFixed(2) : null);
    const cs = [...window.__mm.calls].sort((a, b) => a - b);
    return { frames: s.length, p50: p(0.5), p95: p(0.95), p99: p(0.99), callsP50: cs[cs.length >> 1] };
  });
};

// Pixel proof: the whole claim is "same pixels, less CPU". readPixels off the
// drawing buffer, base vs pruned, on a frozen frame.
const PIXELS = async (page) => page.evaluate(() => {
  const E = window.__engine;
  const gl = E.renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const grab = () => { E.renderScene(E.scene, E.camera); const b = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
  E.stop();
  E._flicker = false;
  if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
  const S = E.scene;
  S.matrixAutoUpdate = true; S.traverse((o) => { o.matrixWorldAutoUpdate = true; }); S.updateMatrixWorld(true);
  const a = grab();
  S.matrixAutoUpdate = false; S.updateMatrix(); S.updateMatrixWorld(true); S.matrixWorldNeedsUpdate = false;
  for (const c of S.children) if (c.visible === false) { c.matrixAutoUpdate = false; c.matrixWorldAutoUpdate = false; }
  const b = grab();
  let differing = 0, maxDelta = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d) { differing++; if (d > maxDelta) maxDelta = d; } }
  E.start();
  return { samples: a.length, differing, maxDelta, w, h };
});

const results = [];
for (const room of ROOMS) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.evaluate((t) => { const E = window.__engine; E.setAdaptiveQuality(false); E.setQualityTier(t); }, TIER);
  await page.waitForTimeout(400);

  const pixels = await PIXELS(page);
  await page.waitForTimeout(400);
  const census = { base: await page.evaluate(() => { const S = window.__engine.scene; S.matrixAutoUpdate = true; S.traverse((o) => { o.matrixWorldAutoUpdate = true; }); return null; }) };
  const cdp = await ctx.newCDPSession(page);
  const acc = {};
  for (let r = 0; r < ROUNDS; r++) {
    for (const rate of RATES) {
      for (const cfg of CONFIGS) {
        await page.evaluate(APPLY, cfg.id);
        if (r === 0) census[cfg.id] = await page.evaluate(CENSUS);
        await page.waitForTimeout(250);
        if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
        const m = await measure(page, SECONDS);
        if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        const key = `${cfg.id}@${rate}x`;
        (acc[key] ||= []).push(m);
      }
    }
  }
  // median across rounds — one thermal outlier must not decide this
  const table = {};
  for (const k in acc) {
    const med = (f) => { const v = acc[k].map(f).sort((a, b) => a - b); return v[v.length >> 1]; };
    table[k] = { p50: med((x) => x.p50), p95: med((x) => x.p95), p99: med((x) => x.p99), callsP50: med((x) => x.callsP50), n: acc[k].length };
  }
  results.push({ room, tier: TIER, pixels, census, table });
  console.log(`\n${room} @tier=${TIER}  pixels differing ${pixels.differing}/${pixels.samples} maxΔ ${pixels.maxDelta}`);
  for (const k in table) console.log(`  ${k.padEnd(14)} p50 ${table[k].p50}  p95 ${table[k].p95}  p99 ${table[k].p99}  calls ${table[k].callsP50}`);
  console.log(`  census: ${JSON.stringify(census)}`);
  await page.close();
}

writeFileSync(`${OUT}/matrix-prune-ab.json`, JSON.stringify({ when: new Date().toISOString(), tier: TIER, rounds: ROUNDS, seconds: SECONDS, results }, null, 1));
console.log(`\nwrote ${OUT}/matrix-prune-ab.json`);
await browser.close();
