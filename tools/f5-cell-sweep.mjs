// F5: pick the static-batch spatial cell size.
//
// Batching trades frustum culling for submission cost. Cell 0 = one bucket per
// room (round-1 behaviour, maximum submission win, zero culling). Larger cells
// batch harder; smaller cells cull harder. This measures both sides of the trade
// in the SAME page load per cell: the frozen whole-room draw calls (what the
// COMP_CARD budget row reads) and the in-play median (what the player pays).
//
//   node tools/f5-cell-sweep.mjs [--rooms=a,b] [--cells=0,6,8,12,16] [--seconds=5]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('screenshots/f5');
fs.mkdirSync(DIR, { recursive: true });
const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm,parking_garage').split(',');
const CELLS = arg('cells', '0,6,8,12,16').split(',').map(Number);
const SECONDS = +arg('seconds', 5);

const pct = (a, p) => (a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0);
const r2 = (x) => Math.round(x * 100) / 100;
const SEED = `(() => { let s = 20260730 >>> 0;
  Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
})();`;

const PROBE = `window.__cs = (() => {
  const E = window.__engine; const dt = [], cpu = [], calls = [], tris = [];
  let last = performance.now(), orig = null;
  return {
    start() { dt.length = cpu.length = calls.length = tris.length = 0;
      E.renderer.info.autoReset = false;
      orig = E.composer.render.bind(E.composer);
      E.composer.render = (...a) => { E.renderer.info.reset();
        const t0 = performance.now(); orig(...a); const t1 = performance.now();
        cpu.push(t1 - t0); dt.push(t1 - last); last = t1;
        calls.push(E.renderer.info.render.calls); tris.push(E.renderer.info.render.triangles); };
      last = performance.now(); },
    stop() { E.composer.render = orig; E.renderer.info.autoReset = true;
      return { dt: dt.slice(), cpu: cpu.slice(), calls: calls.slice(), tris: tris.slice(),
        stats: window.__explore?.roomManager?.currentRoom?._mergeStats || null }; },
    frozen() {
      E.stop(); E.renderer.info.autoReset = false;
      const cam = E.camera.position.clone();
      E.camera.position.set(24, 24, 24); E.camera.lookAt(6, 0, 6); E.camera.updateMatrixWorld(true);
      E.renderer.info.reset(); E.renderScene(E.scene, E.camera);
      const r = { calls: E.renderer.info.render.calls, tris: E.renderer.info.render.triangles };
      E.camera.position.copy(cam); E.camera.updateMatrixWorld(true);
      E.renderer.info.autoReset = true; E.start(); return r; },
  };
})();`;

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
    '--disable-gpu-vsync', '--disable-frame-rate-limit',
    '--disable-features=CalculateNativeWinOcclusion', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});
const out = [];
for (const room of ROOMS) {
  for (const cell of CELLS) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    await ctx.addInitScript(SEED);
    await ctx.addInitScript(`window.__batchCell = ${cell};`);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
    await page.waitForTimeout(2000);
    await page.evaluate(PROBE);
    await page.evaluate(() => window.__cs.start());
    await page.waitForTimeout(SECONDS * 1000);
    const s = await page.evaluate(() => window.__cs.stop());
    const frozen = await page.evaluate(() => window.__cs.frozen());
    await ctx.close();
    const row = {
      room, cell,
      play_calls_p50: pct(s.calls, 0.5), play_calls_p95: pct(s.calls, 0.95),
      play_tris_p50: pct(s.tris, 0.5),
      cpu_p50: r2(pct(s.cpu, 0.5)), cpu_p95: r2(pct(s.cpu, 0.95)),
      dt_p50: r2(pct(s.dt, 0.5)), dt_p95: r2(pct(s.dt, 0.95)),
      frozen_calls: frozen.calls, frozen_tris: frozen.tris,
      meshes_after: s.stats?.after, buckets: s.stats?.buckets,
    };
    out.push(row);
    console.log(`${room} cell=${String(cell).padStart(2)}  play calls p50 ${String(row.play_calls_p50).padStart(4)} p95 ${String(row.play_calls_p95).padStart(4)} · tris ${row.play_tris_p50} · cpu p50 ${row.cpu_p50} p95 ${row.cpu_p95} · dt p50 ${row.dt_p50} · FROZEN calls ${row.frozen_calls} tris ${row.frozen_tris} · room meshes ${row.meshes_after} buckets ${row.buckets}`);
  }
}
fs.writeFileSync(path.join(DIR, 'cell-sweep.json'), JSON.stringify(out, null, 2));
await browser.close();
