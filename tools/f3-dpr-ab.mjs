// F3: interleaved A/B of the composer pixel-ratio cap, measured with GPU timer
// queries in ONE page so machine contention cancels out. Alternates
// pixelRatio 1.5 (capped, as shipped) and 2.0 (the old value) N times and
// reports the median of each.
//   node tools/f3-dpr-ab.mjs --pairs=3
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PAIRS = Number(process.argv.find(a => a.startsWith('--pairs='))?.slice(8) || 3);
const SECONDS = Number(process.argv.find(a => a.startsWith('--seconds='))?.slice(10) || 6);
const ROOM = process.argv.find(a => a.startsWith('--room='))?.slice(7) || 'cubicle_farm';
const OUT = path.resolve('screenshots/f3');
fs.mkdirSync(OUT, { recursive: true });

const PROBE = `
window.__q = {
  on: false, target: null, frame: 0, samples: {}, pending: [], disjoint: 0, ready: false,
  init() {
    if (this.ready) return true;
    const E = window.__engine; if (!E) return false;
    const gl = E.renderer.getContext();
    this.gl = gl; this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    if (!this.ext) return false;
    const self = this;
    this.wrap = (obj, label) => {
      if (obj.__f3wrapped) return;
      const orig = obj.render.bind(obj);
      obj.__f3wrapped = true;
      obj.render = function (...a) {
        if (!self.on || self.busy || self.target !== label) return orig(...a);
        const q = gl.createQuery();
        self.busy = true;
        gl.beginQuery(self.ext.TIME_ELAPSED_EXT, q);
        const r = orig(...a);
        gl.endQuery(self.ext.TIME_ELAPSED_EXT);
        self.busy = false;
        self.pending.push({ q, label });
        return r;
      };
    };
    this.rewrap = () => {
      this.labels = [];
      for (const p of E.composer.passes) {
        const l = p.name || p.constructor.name;
        this.labels.push(l); this.wrap(p, l);
      }
      this.labels.push('TOTAL'); this.wrap(E.composer, 'TOTAL');
    };
    this.rewrap();
    const step = () => {
      if (self.on) {
        const pool = E.composer.passes.filter(p => p.enabled).map(p => p.name || p.constructor.name).concat('TOTAL');
        self.target = pool[self.frame % pool.length]; self.frame++;
        self.drain();
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    this.ready = true; return true;
  },
  drain() {
    const gl = this.gl, ext = this.ext, keep = [];
    for (const e of this.pending) {
      if (!gl.getQueryParameter(e.q, gl.QUERY_RESULT_AVAILABLE)) { keep.push(e); continue; }
      if (gl.getParameter(ext.GPU_DISJOINT_EXT)) { this.disjoint++; gl.deleteQuery(e.q); continue; }
      (this.samples[e.label] ||= []).push(gl.getQueryParameter(e.q, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(e.q);
    }
    this.pending = keep;
  },
  setPR(pr) {
    const E = window.__engine;
    E.renderer.setPixelRatio(pr);
    E.composer.setPixelRatio(pr);
    E.composer.setSize(E.width, E.height);
    this.rewrap();
    return { pr: E.renderer.getPixelRatio(), buffer: [E.renderer.domElement.width, E.renderer.domElement.height] };
  },
  start() { this.init(); this.samples = {}; this.disjoint = 0; this.frame = 0; this.on = true; },
  stop() {
    this.on = false; this.drain();
    const q = (a, p) => a.length ? +a[Math.min(a.length - 1, Math.floor(a.length * p))].toFixed(3) : null;
    const out = {};
    for (const k of Object.keys(this.samples)) {
      const a = [...this.samples[k]].sort((x, y) => x - y);
      out[k] = { n: a.length, p50: q(a, 0.5), p95: q(a, 0.95) };
    }
    return out;
  },
};
`;

const browser = await chromium.launch({ headless: false, args: [
  '--window-position=-2400,0', '--window-size=1940,1180',
  '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
  '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--force_high_performance_gpu',
  '--enable-webgl-developer-extensions', '--disable-gpu-vsync', '--disable-frame-rate-limit',
  '--autoplay-policy=no-user-gesture-required',
]});
// deviceScaleFactor 2 so devicePixelRatio is 2 — a real HiDPI laptop
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
await ctx.addInitScript(PROBE);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto(`http://localhost:5173/?dev&fixture=act7&shot=${ROOM}&hud=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 40000 });
const gpu = await page.evaluate(() => {
  const c = document.querySelector('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl');
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  const r = d ? String(gl.getParameter(d.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  return { renderer: r, software: /swiftshader|software|llvmpipe|basic render/i.test(r), dpr: devicePixelRatio,
    timer: !!gl.getExtension('EXT_disjoint_timer_query_webgl2') };
});
console.log('GPU', gpu.renderer, 'dpr', gpu.dpr, 'timer', gpu.timer, gpu.software ? '** SOFTWARE — RELATIVE ONLY **' : '');
await page.waitForTimeout(2500);
if (!await page.evaluate(() => window.__q.init())) { console.log('GPU TIMER UNAVAILABLE'); await browser.close(); process.exit(2); }

const trials = [];
for (let i = 0; i < PAIRS; i++) {
  for (const pr of [1.5, 2.0]) {
    const cfg = await page.evaluate((p) => window.__q.setPR(p), pr);
    await page.waitForTimeout(900);
    await page.evaluate(() => window.__q.start());
    for (const k of ['ArrowRight', 'ArrowLeft']) {
      await page.keyboard.down(k); await page.waitForTimeout((SECONDS * 1000) / 2); await page.keyboard.up(k);
    }
    const m = await page.evaluate(() => window.__q.stop());
    trials.push({ pair: i, pr, ...cfg, m });
    const post = ['_UnrealBloomPass', 'TiltShiftPass', 'grade'].reduce((s, k) => s + (m[k]?.p50 || 0), 0);
    console.log(`pair ${i} pr=${cfg.pr} buf=${cfg.buffer.join('x')}  TOTAL p50 ${m.TOTAL?.p50}  post-only p50 ${post.toFixed(3)}  ` +
      Object.keys(m).map(k => `${k.slice(0, 12)}=${m[k].p50}`).join(' '));
  }
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.floor(s.length / 2)].toFixed(3) : null; };
const summary = {};
for (const pr of [1.5, 2.0]) {
  const rows = trials.filter(t => t.pr === pr);
  summary[pr] = {
    buffer: rows[0]?.buffer,
    total_p50: med(rows.map(r => r.m.TOTAL?.p50).filter(Boolean)),
    total_p95: med(rows.map(r => r.m.TOTAL?.p95).filter(Boolean)),
    postOnly_p50: med(rows.map(r => ['_UnrealBloomPass', 'TiltShiftPass', 'grade'].reduce((s, k) => s + (r.m[k]?.p50 || 0), 0))),
    aoPlusScene_p50: med(rows.map(r => Object.entries(r.m).find(([k]) => /export|N8AO|RenderPass/.test(k))?.[1]?.p50).filter(Boolean)),
  };
}
console.log('\n== medians over', PAIRS, 'interleaved pairs ==');
for (const pr of [2.0, 1.5]) console.log(` pr ${pr} buf ${summary[pr].buffer?.join('x')}  TOTAL p50 ${summary[pr].total_p50} / p95 ${summary[pr].total_p95}   post-only p50 ${summary[pr].postOnly_p50}   scene+AO p50 ${summary[pr].aoPlusScene_p50}`);
const d = summary[2.0].total_p50 - summary[1.5].total_p50;
console.log(` cap 2.0 -> 1.5 saves ${d.toFixed(3)} ms p50 (${(100 * d / summary[2.0].total_p50).toFixed(1)}%)`);
fs.writeFileSync(path.join(OUT, 'dpr-ab.json'), JSON.stringify({ gpu, trials, summary }, null, 1));
if (errs.length) console.log('ERRORS', errs.slice(0, 3));
await browser.close();
