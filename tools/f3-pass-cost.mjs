// F3 per-pass GPU cost, measured with EXT_disjoint_timer_query_webgl2.
//
//   node tools/f3-pass-cost.mjs --label=before
//
// Each composer pass' render() is wrapped in a GPU timer query. Only one query
// is in flight at a time (WebGL2 allows exactly one TIME_ELAPSED_EXT query per
// context), so the probe rotates which pass it measures, one per frame. Over a
// 900-frame walk every pass collects >100 samples. Disjoint samples are
// discarded, never averaged in.
//
// GPU milliseconds are immune to vsync and to CPU-side noise, which is why this
// is the instrument for a fill-rate question and the frame-time histogram is
// not.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const LABEL = process.argv.find(a => a.startsWith('--label='))?.slice(8) || 'run';
const ROOMS = (process.argv.find(a => a.startsWith('--rooms='))?.slice(8) || 'cubicle_farm,parking_garage').split(',');
const DSFS = (process.argv.find(a => a.startsWith('--dsf='))?.slice(6) || '1,2').split(',').map(Number);
const SECONDS = Number(process.argv.find(a => a.startsWith('--seconds='))?.slice(10) || 14);
const OUT = path.resolve('screenshots/f3');
fs.mkdirSync(OUT, { recursive: true });

const ARGS = [
  '--window-position=-2400,0', '--window-size=1300,820',
  '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
  '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--force_high_performance_gpu',
  '--enable-webgl-developer-extensions', '--disable-gpu-vsync', '--disable-frame-rate-limit',
  '--autoplay-policy=no-user-gesture-required',
];

const PROBE = `
window.__pc = {
  ready: false, on: false, frame: 0, samples: {}, frameGpu: [], frameCpu: [],
  disjoint: 0, inFlight: null, pending: [], names: [],
  init() {
    if (this.ready) return true;
    const E = window.__engine; if (!E) return false;
    const gl = E.renderer.getContext();
    this.gl = gl;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (!this.ext) return false;
    const self = this;
    const wrap = (obj, label) => {
      const orig = obj.render.bind(obj);
      obj.render = function (...a) {
        if (!self.on || self.inFlight || self.target !== label) return orig(...a);
        const q = gl.createQuery();
        gl.beginQuery(self.ext.TIME_ELAPSED_EXT, q);
        self.inFlight = q;
        const r = orig(...a);
        gl.endQuery(self.ext.TIME_ELAPSED_EXT);
        self.pending.push({ q, label });
        self.inFlight = null;
        return r;
      };
    };
    this.names = [];
    for (const p of E.composer.passes) {
      const label = (p.name || p.constructor.name);
      this.names.push(label);
      this.samples[label] = [];
      wrap(p, label);
    }
    // whole composer (scene + all passes)
    this.names.push('TOTAL');
    this.samples.TOTAL = [];
    wrap(E.composer, 'TOTAL');
    // per-frame: rotate the measured pass, drain finished queries
    const step = () => {
      if (self.on) {
        const enabled = E.composer.passes.filter(p => p.enabled).map(p => p.name || p.constructor.name);
        const pool = [...enabled, 'TOTAL'];
        self.target = pool[self.frame % pool.length];
        self.frame++;
        self.drain();
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    this.ready = true;
    return true;
  },
  drain() {
    const gl = this.gl, ext = this.ext;
    const keep = [];
    for (const e of this.pending) {
      const avail = gl.getQueryParameter(e.q, gl.QUERY_RESULT_AVAILABLE);
      const dis = gl.getParameter(ext.GPU_DISJOINT_EXT);
      if (!avail) { keep.push(e); continue; }
      if (dis) { this.disjoint++; gl.deleteQuery(e.q); continue; }
      const ns = gl.getQueryParameter(e.q, gl.QUERY_RESULT);
      gl.deleteQuery(e.q);
      (this.samples[e.label] ||= []).push(ns / 1e6);
    }
    this.pending = keep;
  },
  start() { this.init(); for (const k in this.samples) this.samples[k] = []; this.disjoint = 0; this.frame = 0; this.on = true; },
  stop() {
    this.on = false; this.drain();
    const q = (arr, p) => arr.length ? +arr[Math.min(arr.length - 1, Math.floor(arr.length * p))].toFixed(3) : null;
    const out = { disjoint: this.disjoint, passes: {} };
    for (const k of this.names) {
      const a = [...(this.samples[k] || [])].sort((x, y) => x - y);
      out.passes[k] = { n: a.length, p50: q(a, 0.5), p95: q(a, 0.95) };
    }
    const E = window.__engine;
    out.enabled = E.composer.passes.filter(p => p.enabled).map(p => p.name || p.constructor.name);
    out.fullScreenPasses = out.enabled.length;
    out.pixelRatio = E.renderer.getPixelRatio();
    out.buffer = { w: E.renderer.domElement.width, h: E.renderer.domElement.height };
    return out;
  },
};
`;

const GPU_GATE = () => {
  const c = document.querySelector('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  const r = d ? String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  return {
    renderer: r, software: /swiftshader|software|llvmpipe|basic render/i.test(r), dpr: devicePixelRatio,
    timer: !!(gl.getExtension('EXT_disjoint_timer_query_webgl2')),
  };
};

const results = [];
for (const dsf of DSFS) {
  const browser = await chromium.launch({ headless: false, args: ARGS });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: dsf });
  await context.addInitScript(PROBE);
  for (const room of ROOMS) {
    const page = await context.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(`http://localhost:5173/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 40000 });
    const gpu = await page.evaluate(GPU_GATE);
    await page.waitForTimeout(2500);
    const ok = await page.evaluate(() => window.__pc.init());
    if (!ok) { console.log(`[${room}] dsf=${dsf}  GPU TIMER UNAVAILABLE — skipping`); await page.close(); continue; }
    await page.evaluate(() => window.__pc.start());
    for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
      await page.keyboard.down(k); await page.waitForTimeout((SECONDS * 1000) / 5); await page.keyboard.up(k);
    }
    await page.waitForTimeout((SECONDS * 1000) / 5);
    const m = await page.evaluate(() => window.__pc.stop());
    results.push({ room, dsf, gpu, ...m, errs });
    console.log(`\n[${room}] dsf=${dsf} pr=${m.pixelRatio} buffer=${m.buffer.w}x${m.buffer.h} enabled passes=${m.fullScreenPasses} (${m.enabled.join(' -> ')})`);
    console.log(`  GPU ${gpu.renderer}${gpu.software ? '  ** SOFTWARE — RELATIVE ONLY **' : ''}  timerQuery=${gpu.timer} disjointDropped=${m.disjoint}`);
    let sum = 0;
    for (const k of Object.keys(m.passes)) {
      const p = m.passes[k]; if (!p.n) continue;
      if (k !== 'TOTAL') sum += p.p50;
      console.log(`   ${k.padEnd(16)} n=${String(p.n).padStart(4)}  GPU p50 ${String(p.p50).padStart(7)} ms   p95 ${String(p.p95).padStart(7)} ms`);
    }
    console.log(`   ${'(sum of passes)'.padEnd(16)}            GPU p50 ${sum.toFixed(3)} ms`);
    if (errs.length) console.log('  ERRORS', errs.slice(0, 3));
    await page.close();
  }
  await browser.close();
}
fs.writeFileSync(path.join(OUT, `pass-cost-${LABEL}.json`), JSON.stringify(results, null, 1));
console.log('\nwrote', path.join(OUT, `pass-cost-${LABEL}.json`));
