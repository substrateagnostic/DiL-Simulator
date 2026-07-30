// F5: hunt the last bit.
//
// The frozen-frame gate as briefed says ZERO differing pixels. `readPixels` off
// the drawing buffer says cubicle_farm has 51 differing samples out of 8,294,400
// at a maximum per-channel delta of 1/255, and that they vanish with N8AO off.
// Before renegotiating the gate, exhaust the knobs: this renders the SAME frame
// twice (engine stopped, zero state advanced) under each N8AO configuration and
// counts differing samples straight off the GPU — no PNG, no compositor.
//
// A code read of n8ao 2.0.0 rules out the obvious suspects: the `time` uniform
// it sets from performance.now() on every render is DECLARED BUT NEVER USED in
// any shader body (dist/N8AO.js:146 is the only occurrence outside the uniform
// tables), and the denoise loop swaps its two internal targets an even number of
// times per render at denoiseIterations:2, so the ping-pong returns to the same
// assignment and cannot carry parity across renders. This tool tests what is
// left: half-res (the depth downsample + upsample path), sample count, and the
// denoise iteration count.
//
//   node tools/f5-lsb-hunt.mjs [--rooms=cubicle_farm] [--renders=6]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('screenshots/f5');
fs.mkdirSync(DIR, { recursive: true });
const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm,reception,parking_garage').split(',');
const RENDERS = +arg('renders', 6);
const WARM = +arg('warm', 2);      // discarded settle renders — see the note in MEASURE

// Each variant is applied to the live N8AOPass, then the frozen pair is measured.
const VARIANTS = [
  { name: 'as-shipped (halfRes, 8 samples, denoise 2)', cfg: {} },
  { name: 'halfRes OFF', cfg: { halfRes: false } },
  { name: 'denoiseIterations 1', cfg: { denoiseIterations: 1 } },
  { name: 'denoiseIterations 0 (raw AO, no denoise)', cfg: { denoiseIterations: 0 } },
  { name: 'aoSamples 16', cfg: { aoSamples: 16 } },
  { name: 'halfRes OFF + denoiseIterations 1', cfg: { halfRes: false, denoiseIterations: 1 } },
  { name: 'AO OFF (control — must be 0)', cfg: null },
];

const MEASURE = `
window.__lsb = async (cfg, renders, warm) => {
  const E = window.__engine;
  E.stop();
  E._flicker = false;
  if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
  for (const el of document.querySelectorAll('.dialog-box, #dialog-box, .dialog-container'))
    el.style.display = 'none';
  if (cfg === null) E.setAmbientOcclusion(false);
  else {
    E.setAmbientOcclusion(true);
    const c = E._n8aoPass && E._n8aoPass.configuration;
    if (c) for (const k in cfg) c[k] = cfg[k];
  }
  const gl = E.renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  // SETTLE RENDERS, discarded. Freezing the engine and immediately rendering is
  // not a steady state: N8AO re-runs detectTransparency() and can reconfigure its
  // compositor on the first render after a config or state change, the shadow map
  // is forced to refresh, and any texture still mid-upload lands. Measured
  // signature of that (this tool, warm=0): the FIRST pair sometimes differs
  // (11458 samples at Δ2 in parking_garage, 24623 at Δ2 in reception) and every
  // pair after it is bit-identical, in every room and every AO configuration.
  // A one-off settle is not temporal instability during play, which is what the
  // frozen-frame gate is about — so it is rendered and thrown away, and both
  // numbers are reported so the claim is checkable.
  for (let i = 0; i < warm; i++) E.renderScene(E.scene, E.camera);
  const frames = [];
  for (let i = 0; i < renders; i++) {
    E.renderScene(E.scene, E.camera);
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    frames.push(buf);
  }
  const pairs = [];
  let worstDelta = 0, worstCount = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1], b = frames[i];
    let n = 0, maxD = 0;
    for (let p = 0; p < a.length; p++) {
      const d = Math.abs(a[p] - b[p]);
      if (d) { n++; if (d > maxD) maxD = d; }
    }
    pairs.push({ samples: n, maxDelta: maxD });
    if (n > worstCount) worstCount = n;
    if (maxD > worstDelta) worstDelta = maxD;
  }
  return { w, h, total: w * h * 4, pairs, worstCount, worstDelta };
};`;

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
    '--disable-features=CalculateNativeWinOcclusion', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});
const out = [];
let gpu = null;
for (const room of ROOMS) {
  console.log(`\n### ${room}`);
  for (const v of VARIANTS) {
    // Fresh context per variant: an N8AO config change reallocates internal
    // targets, and a stale target is exactly the kind of carry-over this is
    // trying to rule out.
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
    await page.waitForTimeout(2000);
    if (!gpu) {
      gpu = await page.evaluate(() => {
        const gl = document.querySelector('canvas').getContext('webgl2');
        const d = gl.getExtension('WEBGL_debug_renderer_info');
        return gl.getParameter(d.UNMASKED_RENDERER_WEBGL);
      });
      console.log('GPU:', gpu);
    }
    await page.evaluate(MEASURE);
    const r = await page.evaluate(([cfg, n, w]) => window.__lsb(cfg, n, w), [v.cfg, RENDERS, WARM]);
    await ctx.close();
    out.push({ room, variant: v.name, cfg: v.cfg, ...r });
    console.log(`  ${r.worstCount === 0 ? 'BIT-IDENTICAL' : `${r.worstCount} samples, max Δ ${r.worstDelta}/255`}  · ${v.name}  · pairs ${r.pairs.map((p) => `${p.samples}/${p.maxDelta}`).join(' ')}`);
  }
}
fs.writeFileSync(path.join(DIR, `lsb-hunt${WARM ? '' : '-warm0'}.json`), JSON.stringify({ gpu, renders: RENDERS, warm: WARM, out }, null, 2));
await browser.close();
