// F5: price the COLOUR-BAKED batching tier and prove it is lossless.
//
// Round 1 of this pass merged meshes that shared a material INSTANCE
// (Room._mergeStatics, tools/f4-merge-perf.mjs). That left every room and every
// character over the ≤300 draw-call budget, because a room is hundreds of toon
// primitives whose only difference from each other is `material.color`.
// src/effects/GeometryBatch.js moves the colour into a vertex attribute so those
// primitives can share one draw. This tool answers the two questions that
// change: what did it cost in draw calls / CPU, and did any pixel move.
//
// A full PAGE RELOAD per variant, not a runtime toggle: the player character is
// built once at boot, so a room-reload A/B would leave Andrew batched either way
// and understate the win. `window.__bakeColor` is planted by addInitScript.
//
//   node tools/f5-bake-ab.mjs [--rooms=a,b] [--seconds=6] [--reps=2]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { compare } from 'odiff-bin';

const DIR = path.resolve('screenshots/f5');
fs.mkdirSync(DIR, { recursive: true });
const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm,reception,parking_garage').split(',');
const SECONDS = +arg('seconds', 6);
const REPS = +arg('reps', 2);

const pct = (a, p) => (a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0);
const r2 = (x) => Math.round(x * 100) / 100;

// Deterministic Math.random so blink phase / NPC wander cannot move a pixel
// between the two variants.
const SEED = `(() => { let s = 20260730 >>> 0;
  Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
})();`;

const PROBE = `
window.__bp = (() => {
  const E = window.__engine;
  const dt = [], cpu = [], calls = [];
  let last = performance.now(), on = false, orig = null;
  return {
    start() {
      dt.length = cpu.length = calls.length = 0;
      E.renderer.info.autoReset = false;
      orig = E.composer.render.bind(E.composer);
      E.composer.render = (...a) => {
        E.renderer.info.reset();
        const t0 = performance.now();
        orig(...a);
        const t1 = performance.now();
        cpu.push(t1 - t0);
        dt.push(t1 - last); last = t1;
        calls.push(E.renderer.info.render.calls);
      };
      on = true; last = performance.now();
    },
    stop() {
      if (on) { E.composer.render = orig; E.renderer.info.autoReset = true; on = false; }
      let meshes = 0, batches = 0, baked = 0;
      E.scene.traverse(c => { if (c.isMesh) { meshes++; if (/^batch_/.test(c.name)) batches++; if (c.material?.userData?.batchShared) baked++; } });
      return {
        dt: dt.slice(), cpu: cpu.slice(), calls: calls.slice(),
        meshes, batches, baked,
        mergeStats: window.__explore?.roomManager?.currentRoom?._mergeStats || null,
        geometries: E.renderer.info.memory.geometries,
        programs: E.renderer.info.programs?.length ?? -1,
        triangles: E.renderer.info.render.triangles,
      };
    },
  };
})();`;

// Freeze everything the renderer does not control, so a frozen A/B still is a
// statement about geometry batching and nothing else. This is the FREEZE_LOOK
// contract the harness uses too: the fluorescent hum is a LOOK value and stays
// in the game at its committed amplitude; the instrument removes it instead of
// the game shrinking it.
const FREEZE_LOOK = `(() => {
  const E = window.__engine;
  E.stop();
  E._flicker = false;
  if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
  for (const el of document.querySelectorAll('.dialog-box, #dialog-box, .dialog-container'))
    el.style.display = 'none';
  E.camera.position.set(24, 24, 24);
  E.camera.lookAt(6, 0, 6);
  E.camera.updateMatrixWorld(true);
  E.renderScene(E.scene, E.camera);
  E.renderScene(E.scene, E.camera);
})();`;

const ATTRIB = `(() => {
  const E = window.__engine;
  E.stop();
  E.renderer.info.autoReset = false;
  const measure = () => { E.renderer.info.reset(); E.renderScene(E.scene, E.camera); return E.renderer.info.render.calls; };
  const label = (o) => o.name || (o.isLight ? 'light:' + o.type : o.type);
  const full = measure();
  const rows = [];
  for (const child of E.scene.children.slice()) {
    if (!child.visible) continue;
    child.visible = false;
    rows.push({ node: label(child), calls: full - measure() });
    child.visible = true;
  }
  E.renderer.info.autoReset = true;
  E.start();
  return { full, rows: rows.filter(r => r.calls).sort((a, b) => b.calls - a.calls).slice(0, 12) };
})();`;

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
    '--disable-gpu-vsync', '--disable-frame-rate-limit',
    '--disable-features=CalculateNativeWinOcclusion', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});

const errs = [];
let gpu = null;

// One fresh context per variant so addInitScript lands before any module runs.
const session = async (room, bake, fn) => {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEED);
  await ctx.addInitScript(`window.__bakeColor = ${bake};`);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`${room}/${bake}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(`${room}/${bake} console: ${m.text().slice(0, 200)}`); });
  await page.goto(`${BASE}/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(2200);
  if (!gpu) {
    gpu = await page.evaluate(() => {
      const gl = document.querySelector('canvas').getContext('webgl2');
      const d = gl.getExtension('WEBGL_debug_renderer_info');
      return gl.getParameter(d.UNMASKED_RENDERER_WEBGL);
    });
    console.log('GPU:', gpu);
    if (/swiftshader|software|llvmpipe/i.test(gpu)) console.log('*** SOFTWARE RENDERER — RELATIVE-ONLY ***');
  }
  const out = await fn(page);
  await ctx.close();
  return out;
};

const timed = (room, bake) => session(room, bake, async (page) => {
  await page.evaluate(PROBE);
  await page.evaluate(() => window.__bp.start());
  await page.waitForTimeout(SECONDS * 1000);
  const s = await page.evaluate(() => window.__bp.stop());
  const attrib = await page.evaluate(ATTRIB);
  return {
    dt_p50: r2(pct(s.dt, 0.5)), dt_p95: r2(pct(s.dt, 0.95)), dt_p99: r2(pct(s.dt, 0.99)),
    fps: r2(1000 / pct(s.dt, 0.5)),
    cpu_p50: r2(pct(s.cpu, 0.5)), cpu_p95: r2(pct(s.cpu, 0.95)),
    calls_p50: pct(s.calls, 0.5), calls_max: Math.max(0, ...s.calls),
    tris: s.triangles, meshes: s.meshes, batches: s.batches, bakedMeshes: s.baked,
    geometries: s.geometries, programs: s.programs,
    stats: s.mergeStats, frames: s.dt.length, attrib,
  };
});

const still = (room, bake, tag) => session(room, bake, async (page) => {
  await page.evaluate(FREEZE_LOOK);
  await page.waitForTimeout(250);
  const p = path.join(DIR, `bake_${room}_${tag}.png`);
  await page.screenshot({ path: p });
  return p;
});

const out = [];
for (const room of ROOMS) {
  const on = [], off = [];
  // Interleaved so laptop thermal drift cannot masquerade as a win.
  for (let i = 0; i < REPS; i++) {
    on.push(await timed(room, true));
    off.push(await timed(room, false));
  }
  const pOn = await still(room, true, 'on');
  const pCtl = await still(room, true, 'on_ctl');   // floor: same variant twice
  const pOff = await still(room, false, 'off');
  const pOffCtl = await still(room, false, 'off_ctl');
  const dOpt = { threshold: 0.1, antialiasing: true, outputDiffMask: true };
  const control = await compare(pOn, pCtl, path.join(DIR, `bake_${room}_control.png`), dOpt);
  // SECOND CONTROL, and the one that decides how to read `diff`: the UNBAKED
  // build against itself, two fresh page loads. Any difference here is
  // pre-existing per-load nondeterminism (opaque sort order over z-coincident
  // decal surfaces — see CLAUDE.md's PlaneGeometry-overlay z-fighting note),
  // and `diff` only means "the bake changed something" to the extent it exceeds
  // BOTH controls.
  const controlOff = await compare(pOff, pOffCtl, path.join(DIR, `bake_${room}_control_off.png`), dOpt);
  const diff = await compare(pOff, pOn, path.join(DIR, `bake_${room}_diff.png`), dOpt);
  const strict = await compare(pOff, pOn, path.join(DIR, `bake_${room}_diff_strict.png`),
    { threshold: 0, antialiasing: false, outputDiffMask: true });

  out.push({ room, on, off, diff, control, controlOff, strict });
  const f = (a, k) => a.map((x) => x[k]).join(' / ');
  console.log(`\n=== ${room}`);
  console.log(`  BAKE ON   calls ${f(on, 'calls_p50')} · meshes ${f(on, 'meshes')} (batches ${f(on, 'batches')}, baked-mesh ${f(on, 'bakedMeshes')}) · dt p50 ${f(on, 'dt_p50')} p95 ${f(on, 'dt_p95')} · cpu p50 ${f(on, 'cpu_p50')} p95 ${f(on, 'cpu_p95')} · tris ${f(on, 'tris')} · programs ${f(on, 'programs')}`);
  console.log(`  BAKE OFF  calls ${f(off, 'calls_p50')} · meshes ${f(off, 'meshes')} (batches ${f(off, 'batches')}) · dt p50 ${f(off, 'dt_p50')} p95 ${f(off, 'dt_p95')} · cpu p50 ${f(off, 'cpu_p50')} p95 ${f(off, 'cpu_p95')} · tris ${f(off, 'tris')} · programs ${f(off, 'programs')}`);
  console.log(`  merge stats ON:  ${JSON.stringify(on[0]?.stats)}`);
  console.log(`  visual @0.1 off-vs-on: ${JSON.stringify(diff)}`);
  console.log(`  visual @0.1 CONTROL on-vs-on:   ${JSON.stringify(control)}`);
  console.log(`  visual @0.1 CONTROL off-vs-off: ${JSON.stringify(controlOff)}`);
  console.log(`  visual @0.0 off-vs-on: ${JSON.stringify(strict)}`);
  for (const [tag, v] of [['OFF', off[0]], ['ON', on[0]]]) {
    if (!v?.attrib) continue;
    console.log(`  draw-call attribution ${tag} (frozen, total ${v.attrib.full}):`);
    for (const r of v.attrib.rows) console.log(`      ${String(r.calls).padStart(5)}  ${r.node}`);
  }
}

fs.writeFileSync(path.join(DIR, 'bake-ab.json'), JSON.stringify({ gpu, seconds: SECONDS, reps: REPS, rooms: out }, null, 2));
if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 8));
await browser.close();
