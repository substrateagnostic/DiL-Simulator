// F5: what allocates GPU resources MID-PLAY, and does it stall the frame?
//
// The vsync-off cubicle_farm run reports p50 7.8ms with a 605ms max, and 580ms
// of that max was spent INSIDE composer.render() with programs flat at 82 — so
// it is not a shader compile. The same window shows renderer.info.memory going
// textures 97→100 and geometries 269→276, i.e. resources being created while the
// player walks. A texture's first upload is a synchronous stall on the draw that
// needs it, and at 128fps with a saturated queue that stall is amplified.
//
// This finds the owners. Every frame it diffs the set of textures/geometries
// reachable from Engine.scene against the previous frame and names what is new,
// with the frame time it appeared on.
//
//   node tools/f5-midplay-alloc.mjs [--room=cubicle_farm] [--seconds=12] [--uncapped]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('screenshots/f5');
fs.mkdirSync(DIR, { recursive: true });
const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOM = arg('room', 'cubicle_farm');
const SECONDS = +arg('seconds', 12);
const UNCAPPED = process.argv.includes('--uncapped');

const PROBE = `
window.__ma = (() => {
  const E = window.__engine;
  const seenTex = new Set(), seenGeo = new Set();
  const events = [];
  const frames = [];
  let last = performance.now(), orig = null, on = false, frame = 0;
  const label = (o) => {
    const chain = [];
    let n = o;
    while (n && chain.length < 5) { chain.push(n.name || n.type); n = n.parent; }
    return chain.join(' < ');
  };
  const scan = (first) => {
    E.scene.traverse((o) => {
      if (o.geometry && !seenGeo.has(o.geometry.uuid)) {
        seenGeo.add(o.geometry.uuid);
        if (!first) events.push({ frame, kind: 'geometry', owner: label(o), name: o.geometry.type,
          verts: o.geometry.attributes?.position?.count ?? -1 });
      }
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) for (const k in m) {
        const v = m[k];
        if (v && v.isTexture && !seenTex.has(v.uuid)) {
          seenTex.add(v.uuid);
          const d = v.source && v.source.data;
          if (!first) events.push({ frame, kind: 'texture', owner: label(o), slot: k,
            cls: d ? (d.constructor && d.constructor.name) : 'none',
            w: d && d.width || 0, h: d && d.height || 0, texType: v.type, mips: !!v.generateMipmaps });
        }
      }
    });
  };
  return {
    start() {
      events.length = 0; frames.length = 0; frame = 0;
      E.renderer.info.autoReset = false;
      scan(true);
      orig = E.composer.render.bind(E.composer);
      E.composer.render = (...a) => {
        E.renderer.info.reset();
        const t0 = performance.now();
        orig(...a);
        const t1 = performance.now();
        if (on) {
          frames.push({ i: frame, dt: t1 - last, cpu: t1 - t0,
            tex: E.renderer.info.memory.textures, geo: E.renderer.info.memory.geometries,
            prog: E.renderer.info.programs.length });
          frame++;
          scan(false);
        }
        last = t1;
      };
      on = true; last = performance.now();
    },
    stop() {
      on = false;
      E.composer.render = orig; E.renderer.info.autoReset = true;
      return { events: events.slice(), frames: frames.slice() };
    },
  };
})();`;

const args = ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
  '--disable-features=CalculateNativeWinOcclusion', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist', '--force_high_performance_gpu'];
if (UNCAPPED) args.push('--disable-gpu-vsync', '--disable-frame-rate-limit');

const browser = await chromium.launch({ headless: false, args });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`${BASE}/?dev&fixture=act7&shot=${ROOM}&hud=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
await page.waitForTimeout(2600);
await page.evaluate(PROBE);
await page.evaluate(() => window.__ma.start());

// Same scripted patrol the harness uses.
const seq = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
const end = Date.now() + SECONDS * 1000;
let i = 0;
while (Date.now() < end) {
  const k = seq[i++ % seq.length];
  await page.keyboard.down(k);
  await page.waitForTimeout(Math.max(120, Math.min(1500, end - Date.now())));
  await page.keyboard.up(k);
  if (Date.now() < end) await page.waitForTimeout(70);
}
const r = await page.evaluate(() => window.__ma.stop());
await browser.close();

const dts = r.frames.map((f) => f.dt).sort((a, b) => a - b);
const p = (q) => dts[Math.min(dts.length - 1, Math.floor(dts.length * q))];
const worst = r.frames.slice().sort((a, b) => b.dt - a.dt).slice(0, 8);
console.log(`\n${ROOM} · ${UNCAPPED ? 'vsync OFF' : 'vsync on'} · ${r.frames.length} frames`);
console.log(`  dt p50 ${p(0.5).toFixed(1)}ms p95 ${p(0.95).toFixed(1)}ms max ${p(1).toFixed(1)}ms`);
console.log(`  worst frames (i / dt / cpu-in-render / tex / geo / prog):`);
for (const f of worst) console.log(`    ${String(f.i).padStart(5)}  ${f.dt.toFixed(1)}ms  ${f.cpu.toFixed(1)}ms  ${f.tex} ${f.geo} ${f.prog}`);
console.log(`\n  MID-PLAY ALLOCATIONS: ${r.events.length}`);
for (const e of r.events.slice(0, 40)) {
  const f = r.frames[e.frame];
  const near = r.frames.slice(Math.max(0, e.frame - 2), e.frame + 3).map((x) => x.dt.toFixed(0)).join('/');
  console.log(`    frame ${String(e.frame).padStart(5)}  ${e.kind.padEnd(8)} ${e.kind === 'texture' ? `${e.slot} ${e.cls} ${e.w}x${e.h} type${e.texType} mips=${e.mips}` : `${e.name} ${e.verts}v`}  · dt around: ${near}ms  · owner: ${e.owner}`);
}
fs.writeFileSync(path.join(DIR, `midplay-alloc-${ROOM}${UNCAPPED ? '-uncapped' : ''}.json`),
  JSON.stringify({ room: ROOM, uncapped: UNCAPPED, seconds: SECONDS, worst, events: r.events, frames: r.frames }, null, 2));
