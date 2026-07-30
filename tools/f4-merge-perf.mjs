// F4: price Room._mergeStatics() and prove it is visually lossless.
//
// One browser session, vsync OFF (with vsync on, anything under 16.67ms reads
// identical), merge toggled at runtime via window.__mergeStatics and the room
// rebuilt in place. Passes are INTERLEAVED on/off/on/off so laptop thermal
// drift cannot masquerade as a win — the report prints both samples per side.
//
//   node tools/f4-merge-perf.mjs [--rooms=a,b] [--seconds=6] [--reps=2]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { compare } from 'odiff-bin';

const DIR = path.resolve('screenshots/f4');
fs.mkdirSync(DIR, { recursive: true });
const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm,reception,parking_garage').split(',');
const SECONDS = +arg('seconds', 6);
const REPS = +arg('reps', 2);
const SKIP_TIMING = process.argv.includes('--skip-timing');

const pct = (a, p) => a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0;
const r2 = (x) => Math.round(x * 100) / 100;

const PROBE = `
window.__mp = (() => {
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
      let meshes = 0, drawn = 0;
      const g = window.__explore?.roomManager?.roomGroup;
      if (g) g.traverse(c => { if (c.isMesh) { meshes++; if (c.name.startsWith('batch_')) drawn++; } });
      return { dt: dt.slice(), cpu: cpu.slice(), calls: calls.slice(),
        meshes, batches: drawn,
        mergeStats: window.__explore?.roomManager?.currentRoom?._mergeStats || null,
        geometries: E.renderer.info.memory.geometries,
        triangles: E.renderer.info.render.triangles };
    },
  };
})();`;

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
    '--disable-gpu-vsync', '--disable-frame-rate-limit',
    '--disable-features=CalculateNativeWinOcclusion', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });

await page.goto(`${BASE}/?dev&fixture=act7&shot=${ROOMS[0]}&hud=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
await page.waitForTimeout(2500);
const gpu = await page.evaluate(() => {
  const gl = document.querySelector('canvas').getContext('webgl2');
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  return gl.getParameter(d.UNMASKED_RENDERER_WEBGL);
});
console.log('GPU:', gpu);
if (/swiftshader|software|llvmpipe/i.test(gpu)) console.log('*** SOFTWARE RENDERER — RELATIVE-ONLY ***');
await page.evaluate(PROBE);

const measure = async (room, merge) => {
  await page.evaluate((m) => { window.__mergeStatics = m; }, merge);
  await page.evaluate((r) => window.__explore._loadRoom(r), room);
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.__mp.start());
  await page.waitForTimeout(SECONDS * 1000);
  const s = await page.evaluate(() => window.__mp.stop());
  return {
    dt_p50: r2(pct(s.dt, 0.5)), dt_p95: r2(pct(s.dt, 0.95)),
    fps: r2(1000 / pct(s.dt, 0.5)),
    cpu_p50: r2(pct(s.cpu, 0.5)), cpu_p95: r2(pct(s.cpu, 0.95)),
    calls_p50: pct(s.calls, 0.5), tris: s.triangles,
    meshes: s.meshes, batches: s.batches, geometries: s.geometries,
    stats: s.mergeStats, frames: s.dt.length,
  };
};

const out = [];
for (const room of ROOMS) {
  const on = [], off = [];
  for (let i = 0; i < (SKIP_TIMING ? 0 : REPS); i++) {
    on.push(await measure(room, true));
    off.push(await measure(room, false));
  }
  // Stills for the lossless proof: same room, frozen, merged then unmerged.
  const still = async (merge, tag) => {
    await page.evaluate((m) => { window.__mergeStatics = m; }, merge);
    await page.evaluate((r) => window.__explore._loadRoom(r), room);
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const E = window.__engine;
      E.stop();
      E.camera.position.set(24, 24, 24); E.camera.lookAt(6, 0, 6);
      E.camera.updateMatrixWorld(true);
      for (const el of document.querySelectorAll('.dialog-box, #dialog-box, .dialog-container'))
        el.style.display = 'none';
      E.renderScene(E.scene, E.camera); E.renderScene(E.scene, E.camera);
    });
    await page.waitForTimeout(200);
    const p = path.join(DIR, `merge_${room}_${tag}.png`);
    await page.screenshot({ path: p });
    await page.evaluate(() => window.__engine.start());
    return p;
  };
  const pOn = await still(true, 'merged');
  // CONTROL: the same capture procedure again, merged both times. Whatever this
  // reports is the floor — room rebuild + city-backdrop time + NPC blink — and
  // the merged-vs-unmerged number only means something above it.
  const pCtl = await still(true, 'merged_ctl');
  const pOff = await still(false, 'unmerged');
  const dOpt = { threshold: 0.1, antialiasing: true, outputDiffMask: true };
  const control = await compare(pOn, pCtl, path.join(DIR, `merge_${room}_control.png`), dOpt);
  const diff = await compare(pOff, pOn, path.join(DIR, `merge_${room}_diff.png`), dOpt);
  const strict = await compare(pOff, pOn, path.join(DIR, `merge_${room}_diff_strict.png`),
    { threshold: 0, antialiasing: false, outputDiffMask: true });

  // Draw-call attribution: freeze, then hide one top-level scene node at a
  // time and re-render. The delta is that node's per-frame draw calls. This is
  // what a "≤300 draw calls" budget conversation actually needs.
  const attribOf = () => page.evaluate(() => {
    const E = window.__engine;
    E.stop();
    E.renderer.info.autoReset = false;
    const measure = () => {
      E.renderer.info.reset();
      E.renderScene(E.scene, E.camera);
      return E.renderer.info.render.calls;
    };
    const label = (o) => o.name || (o.isLight ? `light:${o.type}` : o.type);
    const full = measure();
    const rows = [];
    for (const child of E.scene.children.slice()) {
      if (!child.visible) continue;
      child.visible = false;
      rows.push({ node: label(child), calls: full - measure() });
      child.visible = true;
    }
    // Characters live directly on Engine.scene, so group them by hand.
    const npcs = E.scene.children.filter(c => c.userData?.isCharacter || /char|npc|player/i.test(c.name || ''));
    let npcCalls = 0;
    if (npcs.length) {
      npcs.forEach(n => { n.visible = false; });
      npcCalls = full - measure();
      npcs.forEach(n => { n.visible = true; });
    }
    E.renderer.info.autoReset = true;
    E.start();
    return { full, rows: rows.sort((a, b) => b.calls - a.calls).slice(0, 12), npcs: npcs.length, npcCalls };
  });

  const attribUnmerged = await attribOf();          // the last still was unmerged
  await still(true, 'merged');
  const attribMerged = await attribOf();
  const attrib = attribMerged;

  out.push({ room, on, off, diff, strict, control, attribMerged, attribUnmerged });
  const f = (a, k) => a.map(x => x[k]).join(' / ');
  console.log(`\n=== ${room}`);
  console.log(`  MERGED   calls ${f(on, 'calls_p50')} · meshes ${f(on, 'meshes')} (batches ${f(on, 'batches')}) · dt p50 ${f(on, 'dt_p50')} p95 ${f(on, 'dt_p95')} · cpu p50 ${f(on, 'cpu_p50')} · tris ${f(on, 'tris')} · geo ${f(on, 'geometries')}`);
  console.log(`  UNMERGED calls ${f(off, 'calls_p50')} · meshes ${f(off, 'meshes')} · dt p50 ${f(off, 'dt_p50')} p95 ${f(off, 'dt_p95')} · cpu p50 ${f(off, 'cpu_p50')} · tris ${f(off, 'tris')} · geo ${f(off, 'geometries')}`);
  if (on[0]) console.log(`  merge stats: ${JSON.stringify(on[0].stats)}`);
  console.log(`  visual @0.1 merged-vs-unmerged: ${JSON.stringify(diff)}`);
  console.log(`  visual @0.1 CONTROL merged-vs-merged: ${JSON.stringify(control)}`);
  console.log(`  visual @0.0 merged-vs-unmerged: ${JSON.stringify(strict)}`);
  for (const [tag, a] of [['UNMERGED', attribUnmerged], ['MERGED', attribMerged]]) {
    console.log(`  draw-call attribution ${tag} (frozen frame, total ${a.full}):`);
    for (const r of a.rows) if (r.calls) console.log(`      ${String(r.calls).padStart(5)}  ${r.node}`);
  }
}

fs.writeFileSync(path.join(DIR, 'merge-perf.json'), JSON.stringify({ gpu, seconds: SECONDS, reps: REPS, rooms: out }, null, 2));
if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 6));
await browser.close();
