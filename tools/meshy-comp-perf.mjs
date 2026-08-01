// Meshy comp perf capture — measured numbers off the LIVE Karen fight.
//
//   node tools/meshy-comp-perf.mjs            -> procedural numbers
//   node tools/meshy-comp-perf.mjs --meshy    -> meshy-GLB numbers
//
// Captures: per-frame draw calls + triangles (renderer.info accumulated over
// ~120 frames with autoReset off, divided by frame count — includes every
// composer pass), geometries/textures/programs, JS heap, a 10s rAF frame-time
// sample (avg/p95), and the network bytes served for /meshy/ GLBs.
// Headed chromium so the real GPU renders. Requires npm run dev on :5173.
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const MESHY = process.argv.includes('--meshy');
const OUT = `art/char_refs/meshy_pilot/metrics/comp-perf-${MESHY ? 'meshy' : 'proc'}.json`;

const run = async () => {
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1940,1120'] });
  const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();

  let glbBytes = 0;
  const glbFiles = [];
  page.on('response', async (res) => {
    if (!res.url().includes('/meshy/')) return;
    try {
      const body = await res.body();
      glbBytes += body.length;
      glbFiles.push({ url: res.url().split('/').pop(), bytes: body.length });
    } catch { /* ignore */ }
  });

  await page.goto(`${BASE}/?dev&fixture=act7&fight=karen${MESHY ? '&meshy' : ''}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__combat, { timeout: 30000 });
  if (MESHY) {
    // wait until both GLBs are actually on the stage
    await page.waitForFunction(() => {
      const c = window.__combat;
      const skinned = (g) => { let n = 0; g?.group?.traverse(o => { if (o.isSkinnedMesh) n++; }); return n; };
      return skinned(c?.scene?.enemyGroups?.[0]) > 0 && skinned(c?.scene?.allyGroups?.[0]) > 0;
    }, { timeout: 30000 });
  }
  await page.waitForFunction(() => {
    const c = window.__combat;
    return !!c && c.inputEnabled === true;
  }, { timeout: 60000 });
  await page.waitForTimeout(3000); // settle on the resting player-turn camera

  // renderer.info accumulated across whole frames (all composer passes)
  const info = await page.evaluate(async () => {
    const r = window.__engine.renderer;
    const inf = r.info;
    inf.autoReset = false;
    inf.reset();
    const frames = await new Promise((resolve) => {
      let n = 0;
      const t0 = performance.now();
      const tick = () => {
        n++;
        if (performance.now() - t0 >= 2000) resolve(n);
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const out = {
      frames,
      callsPerFrame: +(inf.render.calls / frames).toFixed(1),
      trianglesPerFrame: Math.round(inf.render.triangles / frames),
      geometries: inf.memory.geometries,
      textures: inf.memory.textures,
      programs: inf.programs.length,
    };
    inf.autoReset = true;
    return out;
  });

  // 10s rAF frame-time sample
  const timing = await page.evaluate(async () => {
    const deltas = [];
    await new Promise((resolve) => {
      let last = performance.now();
      const t0 = last;
      const tick = (now) => {
        deltas.push(now - last);
        last = now;
        if (now - t0 >= 10000) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    deltas.shift();
    const sorted = [...deltas].sort((a, b) => a - b);
    const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const heap = performance.memory ? performance.memory.usedJSHeapSize : null;
    return {
      samples: deltas.length,
      avgFrameMs: +avg.toFixed(2),
      p95FrameMs: +p95.toFixed(2),
      avgFps: +(1000 / avg).toFixed(1),
      p95Fps: +(1000 / p95).toFixed(1),
      jsHeapMB: heap ? +(heap / 1048576).toFixed(1) : null,
    };
  });

  const result = {
    mode: MESHY ? 'meshy' : 'procedural',
    captured: new Date().toISOString(),
    viewport: '1920x1080 headed (real GPU)',
    ...info,
    ...timing,
    glbBytes,
    glbMB: +(glbBytes / 1048576).toFixed(2),
    glbFiles,
  };
  mkdirSync('art/char_refs/meshy_pilot/metrics', { recursive: true });
  writeFileSync(OUT, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
};

run().catch(e => { console.error(e); process.exit(1); });
