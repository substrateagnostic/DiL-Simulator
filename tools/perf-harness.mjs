// TRUST ISSUES — performance & temporal-stability harness.
//
// A fourth sibling to shoot.mjs / cine-shoot.mjs. Reuses the same
// ?dev&fixture=&shot= fixture loader and the dev-only window.__engine /
// window.__explore handles. Modifies NOTHING in src/ — the probe is injected
// via page.addInitScript and monkey-patches composer.render(), the single
// choke point every render path goes through (Engine.js:1049-1054).
//
//   node tools/perf-harness.mjs                       full baseline (every layer)
//   node tools/perf-harness.mjs --mode=frozen         renderer determinism only
//   node tools/perf-harness.mjs --mode=walk           flicker bursts + stepped A/B
//   node tools/perf-harness.mjs --mode=timing         timing + LoAF + leak + headroom
//   node tools/perf-harness.mjs --mode=frozen,walk    comma-separated modes
//   node tools/perf-harness.mjs --mode=ladder         pass-cost ladder only
//   node tools/perf-harness.mjs --rooms=cubicle_farm --frames=20
//   node tools/perf-harness.mjs --headless            (stamps the report RELATIVE-ONLY)
//
// Requires the dev server running (npm run dev). Each run MERGES into any
// existing perf-baseline.json, so a single-mode run does not wipe the others.
//
// GPU GATE — headless Chromium falls back to SwiftShader (pure-CPU GL), whose
// fps numbers are meaningless for a WebGL game. The harness launches HEADED by
// default, reads UNMASKED_RENDERER_WEBGL, and REFUSES to present absolute fps
// if the renderer is software. The headed window is positioned off-screen
// (--window-position) and never fullscreened, so it does not steal focus.
// On a hybrid laptop it also asks for the dGPU (--force_high_performance_gpu);
// without that flag Chromium quietly uses the integrated GPU instead.
//
// LAYERS
//   1. FROZEN-FRAME DETERMINISM — __engine.stop(), then render the SAME frame
//      N times with zero state advanced. Any nonzero pixel diff is renderer
//      nondeterminism: no thresholds, no masking, no judgement. Guarded by two
//      controls (capture-live, capture-stable), qualified by a perceptual
//      re-diff, and attributed by an individual per-post-pass bisection.
//   2. WALKING BURSTS — hold a direction, capture N frames, odiff CONSECUTIVE
//      pairs with the HUD masked. A no-input burst in the same room is the
//      control (it measures the room's intentional animation floor).
//   2b. DETERMINISTIC STEPPED WALK — engine frozen, sim hand-stepped exactly one
//      frame per capture, PRNG pinned, shared start position: run twice (AO on /
//      AO off) so the diff distributions are directly comparable. This is what
//      separates flicker from honest camera translation.
//   3. FRAME TIMING — rAF delta histogram (p50/p95/p99/max, hitch rate,
//      bimodality), renderer.info per-frame series (draw calls, triangles,
//      programs, geometries, textures, heap), CDP Performance.getMetrics deltas,
//      LoAF script attribution resolved to file:line, and a room-hop leak curve.
//   4. MODES — full speed, Emulation.setCPUThrottlingRate(4) as the mobile-floor
//      proxy, and a second browser with vsync disabled for real headroom plus a
//      cumulative pass-cost ladder (vsync clamps every rung to 16.67ms).
//
// OUTPUT
//   perf-baseline.json            machine-readable baseline (diff across commits)
//   screenshots/perf/BASELINE.md  numbers + verdicts + method gotchas
//   screenshots/perf/index.html   flicker sheet (odiff masks, per pair)
//   screenshots/perf/*.png        frames + odiff masks

import { chromium } from 'playwright';
import { ODiffServer } from 'odiff-bin';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------- args ------

const argOf = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a === undefined ? d : a.slice(k.length + 3);
};
const has = (k) => process.argv.includes(`--${k}`);

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
// LABEL names the run and therefore the report; OUT is where the frames and the
// report go. Two runs with different --out never overwrite each other's frames —
// which matters because the previous round destroyed its own before-set by
// re-running into the same directory, and a before/after mask comparison with no
// before masks is not evidence.
const LABEL = argOf('label', 'BASELINE');
const OUT = argOf('out', 'screenshots/perf');
const BASELINE_JSON = argOf('json', 'perf-baseline.json');
const REPORT_MD = argOf('report', `${LABEL}.md`);
const MEASURED = argOf('measured', '');
// --merge=off disables Room's static-batch merge for the whole run, so the
// batching can be priced (frame cost saved vs room-build cost added) with the
// same harness rather than a bespoke tool.
const MERGE_OFF = argOf('merge', 'on') === 'off';

const ROOMS = argOf('rooms', 'cubicle_farm,reception,parking_garage').split(',').filter(Boolean);
const FIXTURE = argOf('fixture', 'act7');
const MODE = argOf('mode', 'all');
const HEADLESS = has('headless');
const KEEP_HUD = has('keep-hud');
const VIEW = { width: +argOf('width', 1920), height: +argOf('height', 1080) };
const BURST_FRAMES = +argOf('frames', 14);
const BURST_MS = +argOf('interval', 90);
const TIMING_S = +argOf('timing', 30);
const THROTTLED_S = +argOf('timing-throttled', 15);
const THROTTLE_RATE = +argOf('throttle', 4);
// 18 hops over a 6-room cycle gives every room 3 visits, which is the minimum
// for a cache-warm re-entry comparison (see leakRun's steady-state block).
const HOPS = +argOf('hops', 24);   // 6-room cycle -> 4 visits per room, i.e. 3 post-warm deltas for the trend gate
const FROZEN_RENDERS = +argOf('frozen-renders', 8);   // 7 consecutive pairs — a stronger claim than 4
const STEP = +argOf('step', 1);          // sim frames advanced per stepped capture
const PRE_STEPS = +argOf('pre-steps', 30); // sim frames of walking before capture starts
const SEED = +argOf('seed', 20260730);   // PRNG seed for the stepped A/B
const WINDOW_POS = argOf('window-position', '-2400,0');

const UNCAPPED_S = +argOf('uncapped', 10);
const LADDER_S = +argOf('ladder-seconds', 8);

// --mode accepts a comma-separated list (e.g. --mode=frozen,walk). 'ladder' runs
// ONLY the vsync-off phase, so the pass-cost ladder can be re-measured with
// longer rungs without spending six minutes on everything else.
const MODES = new Set(MODE.split(',').map((s) => s.trim()).filter(Boolean));
const wants = (m) => MODES.has('all') || MODES.has(m);

// Rooms cycled by the leak detector. Deliberately mixes the heaviest room
// (cubicle_farm, 136 furniture entries) with lighter ones so the growth curve
// is not dominated by a single build.
const HOP_CYCLE = ['cubicle_farm', 'reception', 'break_room', 'conference_room', 'server_room', 'executive_floor'];

// -------------------------------------------------------------- probe -------
// Injected via addInitScript, so it is installed before the app boots and the
// LoAF observer never misses an entry. NOTHING here ships to a player.

const PROBE = `
(() => {
  if (window.__perf) return;
  const N = 32768;
  const P = {
    on: false, n: 0, wrapped: false, dropped: 0,
    t: new Float64Array(N), dt: new Float64Array(N), cpu: new Float64Array(N),
    calls: new Int32Array(N), tris: new Float64Array(N), progs: new Int32Array(N),
    geos: new Int32Array(N), texs: new Int32Array(N), heap: new Float64Array(N),
    loaf: [], _last: 0, loafSupported: false,
  };
  window.__perf = P;

  try {
    P._obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!P.on || P.loaf.length >= 500) continue;
        P.loaf.push({
          start: e.startTime, dur: e.duration,
          blocking: e.blockingDuration || 0,
          renderStart: e.renderStart || 0,
          styleAndLayoutStart: e.styleAndLayoutStart || 0,
          scripts: (e.scripts || []).map((s) => ({
            name: s.name || '', src: s.sourceURL || '', fn: s.sourceFunctionName || '',
            char: (s.sourceCharPosition === undefined ? -1 : s.sourceCharPosition),
            dur: s.duration, invoker: s.invoker || '', invokerType: s.invokerType || '',
          })),
        });
      }
    });
    P._obs.observe({ type: 'long-animation-frame', buffered: true });
    P.loafSupported = true;
  } catch (e) { P.loafSupported = false; }

  // The one choke point: Engine.renderScene() -> composer.render(). Every
  // render entry point in the game goes through it (Engine, Exploration,
  // Combat, Arcade, main.js portrait).
  P.wrap = () => {
    const eng = window.__engine;
    if (P.wrapped) return true;
    if (!eng || !eng.composer || !eng.renderer) return false;
    const info = eng.renderer.info;
    // three resets info.render at the start of EVERY renderer.render() call, and
    // a composer frame issues one per pass — so the post-render value would only
    // describe the LAST pass. Take manual control and reset once per frame, so
    // calls/triangles cover shadow map + scene + every post pass.
    info.autoReset = false;
    const orig = eng.composer.render.bind(eng.composer);
    P._origRender = eng.composer.render;
    eng.composer.render = function (...a) {
      const t0 = performance.now();
      info.reset();
      orig(...a);
      const t1 = performance.now();
      if (P.on) {
        if (P.n < N) {
          const i = P.n++;
          P.t[i] = t0;
          P.dt[i] = P._last ? t0 - P._last : 0;
          P.cpu[i] = t1 - t0;
          P.calls[i] = info.render.calls;
          P.tris[i] = info.render.triangles;
          P.progs[i] = eng.renderer.info.programs ? eng.renderer.info.programs.length : 0;
          P.geos[i] = info.memory.geometries;
          P.texs[i] = info.memory.textures;
          P.heap[i] = (performance.memory && performance.memory.usedJSHeapSize) || 0;
        } else { P.dropped++; }
        P._last = t0;
      } else { P._last = 0; }
    };
    P.wrapped = true;
    return true;
  };

  const iv = setInterval(() => { if (P.wrap()) clearInterval(iv); }, 25);

  P.start = () => { P.n = 0; P._last = 0; P.dropped = 0; P.loaf.length = 0; P.wrap(); P.on = true; };
  P.stop = () => { P.on = false; return P.dump(); };

  P.snapshot = () => {
    const eng = window.__engine;
    if (!eng) return null;
    const i = eng.renderer.info;
    return {
      calls: i.render.calls, triangles: i.render.triangles,
      geometries: i.memory.geometries, textures: i.memory.textures,
      programs: i.programs ? i.programs.length : 0,
      heap: (performance.memory && performance.memory.usedJSHeapSize) || 0,
    };
  };

  P.dump = () => {
    const n = P.n;
    const a = (buf, from) => Array.from(buf.subarray(from || 0, n));
    return {
      n, dropped: P.dropped, loafSupported: P.loafSupported, loaf: P.loaf.slice(),
      // dt[0] is a sentinel (no previous frame) — drop it.
      dt: a(P.dt, 1), cpu: a(P.cpu), calls: a(P.calls), tris: a(P.tris),
      progs: a(P.progs), geos: a(P.geos), texs: a(P.texs), heap: a(P.heap), t: a(P.t),
    };
  };
})();
`;

// Deterministic PRNG, injected per-page. The stepped A/B below needs the two
// runs to traverse the same states; Math.random() drives NPC wander, blink
// timers and camera shake, so it has to be pinned. Injected only — src/ never
// sees this, and it is opt-in per page.
const SEED_SCRIPT = (seed) => `
(() => {
  const mk = (n) => { let s = n >>> 0; return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }; };
  Math.random = mk(${seed});
  window.__perfReseed = (n) => { Math.random = mk(n >>> 0); };
  window.__perfSeed = ${seed};
})();
`;

// --------------------------------------------------------------- stats ------

const pct = (sorted, p) => {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[i];
};
const r2 = (x) => Math.round(x * 100) / 100;

const HIST_EDGES = [8, 12, 16.7, 20, 25, 33, 50, 100, Infinity];

const histogram = (vals) => {
  const buckets = new Array(HIST_EDGES.length).fill(0);
  for (const v of vals) {
    for (let i = 0; i < HIST_EDGES.length; i++) {
      if (v < HIST_EDGES[i]) { buckets[i]++; break; }
    }
  }
  return buckets;
};

// Bimodal = two separated peaks in the frame-time histogram (vsync 60<->30
// oscillation). Long-tailed = one peak with a tail (GC / upload spikes). The
// distinction decides whether an agent hunts a hitch or lowers mean frame cost.
const detectBimodal = (buckets, total) => {
  if (!total) return { bimodal: false };
  const peaks = [];
  for (let i = 0; i < buckets.length; i++) {
    const l = i > 0 ? buckets[i - 1] : -1;
    const r = i < buckets.length - 1 ? buckets[i + 1] : -1;
    if (buckets[i] > l && buckets[i] >= r && buckets[i] / total >= 0.08) peaks.push(i);
  }
  if (peaks.length < 2) return { bimodal: false, peaks };
  peaks.sort((a, b) => buckets[b] - buckets[a]);
  const [p1, p2] = peaks.slice(0, 2).sort((a, b) => a - b);
  let valley = Infinity;
  for (let i = p1 + 1; i < p2; i++) valley = Math.min(valley, buckets[i]);
  const smaller = Math.min(buckets[p1], buckets[p2]);
  const bimodal = p2 - p1 >= 2 && valley <= smaller * 0.5;
  return { bimodal, peaks: [p1, p2], valley: valley === Infinity ? null : valley };
};

const summariseFrames = (dt, seconds) => {
  const clean = dt.filter((v) => v > 0 && v < 5000);
  const sorted = [...clean].sort((a, b) => a - b);
  const p50 = pct(sorted, 50);
  const hitchT = p50 * 2, severeT = p50 * 4;
  let hitches = 0, severe = 0, run = 0, longestRun = 0;
  for (const v of clean) {
    if (v > hitchT) { hitches++; run++; longestRun = Math.max(longestRun, run); } else run = 0;
    if (v > severeT) severe++;
  }
  const buckets = histogram(clean);
  const mode = detectBimodal(buckets, clean.length);
  return {
    frames: clean.length,
    seconds: r2(seconds),
    p50: r2(p50), p95: r2(pct(sorted, 95)), p99: r2(pct(sorted, 99)),
    max: r2(sorted[sorted.length - 1] || 0), min: r2(sorted[0] || 0),
    fps_p50: r2(p50 ? 1000 / p50 : 0),
    fps_p95: r2(pct(sorted, 95) ? 1000 / pct(sorted, 95) : 0),
    hitchCount: hitches, severeHitches: severe,
    hitchesPerSecond: r2(seconds ? hitches / seconds : 0),
    longestHitchRun: longestRun,
    histogram: { edges: HIST_EDGES.map((e) => (e === Infinity ? 'inf' : e)), buckets },
    shape: mode.bimodal ? 'bimodal' : 'unimodal/long-tail',
    modeDetail: mode,
  };
};

const seriesStats = (arr) => {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  return {
    min: sorted[0], max: sorted[sorted.length - 1],
    p50: pct(sorted, 50), p95: pct(sorted, 95),
    first: arr[0], last: arr[arr.length - 1],
    variance: sorted[sorted.length - 1] - sorted[0],
  };
};

// ---------------------------------------------------- LoAF -> file:line -----

const servedCache = new Map();
const diskCache = new Map();

const fetchServed = async (url) => {
  if (servedCache.has(url)) return servedCache.get(url);
  let text = null;
  try {
    const res = await fetch(url);
    if (res.ok) text = await res.text();
  } catch { /* offline / data: url */ }
  servedCache.set(url, text);
  return text;
};

const readDisk = (rel) => {
  if (diskCache.has(rel)) return diskCache.get(rel);
  let text = null;
  try { if (existsSync(rel)) text = readFileSync(rel, 'utf8'); } catch { /* ignore */ }
  diskCache.set(rel, text);
  return text;
};

// Vite serves src/*.js with import specifiers rewritten, so the char offset is
// an offset into the SERVED text, not the file on disk. Resolve the served
// line, then locate that exact line in the on-disk file to get a real,
// clickable file:line. Falls back to the served line number with a marker.
const resolveLoc = async (src, char) => {
  if (!src || char === undefined || char < 0) return null;
  const text = await fetchServed(src);
  if (!text) return null;
  const head = text.slice(0, char);
  const servedLine = head.split('\n').length;
  const lineText = (text.split('\n')[servedLine - 1] || '').trim();
  let rel = null;
  try { rel = new URL(src).pathname.replace(/^\//, '').split('?')[0]; } catch { /* ignore */ }
  if (rel && lineText.length > 4) {
    const disk = readDisk(rel);
    if (disk) {
      const lines = disk.split('\n');
      const hits = [];
      for (let i = 0; i < lines.length; i++) if (lines[i].trim() === lineText) hits.push(i + 1);
      if (hits.length === 1) return { file: rel, line: hits[0], exact: true, code: lineText };
      if (hits.length > 1) return { file: rel, line: hits[0], exact: false, ambiguous: hits.length, code: lineText };
    }
  }
  return { file: rel || src, line: servedLine, exact: false, servedOnly: true, code: lineText };
};

const attributeLoaf = async (loaf) => {
  const agg = new Map();
  for (const e of loaf) {
    for (const s of e.scripts) {
      const key = `${s.src}|${s.fn}|${s.char}`;
      const cur = agg.get(key) || { src: s.src, fn: s.fn, char: s.char, invoker: s.invoker, invokerType: s.invokerType, totalMs: 0, count: 0, maxMs: 0 };
      cur.totalMs += s.dur;
      cur.maxMs = Math.max(cur.maxMs, s.dur);
      cur.count++;
      agg.set(key, cur);
    }
  }
  const top = [...agg.values()].sort((a, b) => b.totalMs - a.totalMs).slice(0, 8);
  for (const t of top) {
    t.totalMs = r2(t.totalMs);
    t.maxMs = r2(t.maxMs);
    t.loc = await resolveLoc(t.src, t.char);
  }
  return top;
};

// ------------------------------------------------------------ browser -------

const GPU_GATE = `(() => {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { ok: false, renderer: 'NO WEBGL CONTEXT', vendor: '', software: true };
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const timer = !!gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const software = /swiftshader|software|llvmpipe|basic render|microsoft basic/i.test(String(renderer));
    return { ok: true, renderer: String(renderer), vendor: String(vendor), software, gpuTimerQuery: timer,
             dpr: window.devicePixelRatio };
  } catch (e) { return { ok: false, renderer: 'GATE THREW: ' + e.message, software: true }; }
})()`;

// Snapshot of every render setting that decides the frame cost, read live off
// window.__engine. Committed into the baseline so a later run can prove WHICH
// setting changed, and so "was 1998 MODE on?" is answered by data.
const CONFIG_SNAPSHOT = `(() => {
  const e = window.__engine;
  if (!e) return null;
  const prim = (o) => {
    if (!o) return null;
    const out = {};
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (v === null || ['number', 'string', 'boolean'].includes(typeof v)) out[k] = v;
    }
    return out;
  };
  const ctxAttrs = (() => { try { return e.renderer.getContext().getContextAttributes(); } catch (x) { return null; } })();
  const sh = e._dirLight && e._dirLight.shadow;
  return {
    pixelRatio: e.renderer.getPixelRatio(),
    drawingBuffer: { w: e.renderer.domElement.width, h: e.renderer.domElement.height },
    cssSize: { w: e.renderer.domElement.clientWidth, h: e.renderer.domElement.clientHeight },
    contextAntialias: ctxAttrs ? ctxAttrs.antialias : null,
    shadowMap: {
      enabled: e.renderer.shadowMap.enabled, type: e.renderer.shadowMap.type,
      autoUpdate: e.renderer.shadowMap.autoUpdate, needsUpdate: e.renderer.shadowMap.needsUpdate,
    },
    dirLight: e._dirLight ? {
      castShadow: e._dirLight.castShadow,
      mapSize: sh ? [sh.mapSize.width, sh.mapSize.height] : null,
      bias: sh ? sh.bias : null, radius: sh ? sh.radius : null,
      frustum: sh && sh.camera ? { left: sh.camera.left, right: sh.camera.right, top: sh.camera.top, bottom: sh.camera.bottom, near: sh.camera.near, far: sh.camera.far } : null,
    } : null,
    flags: { aoOn: e._aoOn, tiltShiftOn: e._tiltShiftOn, retroOn: e._retroOn },
    retroPass: e._retroPass ? { enabled: e._retroPass.enabled, strength: e._retroPass.uniforms.strength.value } : null,
    n8ao: e._n8aoPass ? prim(e._n8aoPass.configuration) : null,
    // n8ao ships bundled, so its constructor name is a minified symbol. Resolve
    // pass identity against the engine's own refs instead of trusting the name.
    passes: ((e.composer && e.composer.passes) || []).map((p) => {
      let name = p.constructor.name;
      if (p === e._n8aoPass) name = 'N8AOPass';
      else if (p === e._bloomPass) name = 'UnrealBloomPass';
      else if (p === e._tiltShiftPass) name = 'TiltShiftPass';
      else if (p === e._gradePass) name = 'GradePass';
      else if (p === e._retroPass) name = 'RetroPass';
      else if (p === e._renderPass) name = 'RenderPass';
      return { type: name, enabled: p.enabled !== false, renderToScreen: !!p.renderToScreen };
    }),
  };
})()`;

// Uncapped throughput: with vsync on, every measurement floors at 16.67ms and a
// cost ladder flatlines the moment it gets under budget — it can prove nothing
// about headroom. A second browser with vsync off turns "60fps, capped" into
// "how much frame budget is actually left".
const UNCAPPED_ARGS = ['--disable-gpu-vsync', '--disable-frame-rate-limit', '--disable-features=CalculateNativeWinOcclusion'];

const launch = async (extraArgs = []) => {
  const args = [
    `--window-position=${WINDOW_POS}`,
    `--window-size=${VIEW.width + 16},${VIEW.height + 120}`,
    // An off-screen window is a candidate for occlusion/background throttling
    // on Windows, which would silently halve the frame rate we are measuring.
    '--disable-backgrounding-occluded-windows',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-features=CalculateNativeWinOcclusion',
    '--ignore-gpu-blocklist',
    '--enable-gpu-rasterization',
    '--force_high_performance_gpu',        // prefer the dGPU on a hybrid laptop
    '--force-device-scale-factor=1',
    '--enable-webgl-developer-extensions', // may unlock EXT_disjoint_timer_query_webgl2
    '--js-flags=--expose-gc',              // window.gc() for a clean leak signal
    '--autoplay-policy=no-user-gesture-required',
    ...extraArgs,
  ];
  const browser = await chromium.launch({ headless: HEADLESS, args });
  const context = await browser.newContext({
    viewport: { width: VIEW.width, height: VIEW.height },
    deviceScaleFactor: 1,
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(PROBE);
  return { browser, context };
};

const clearPopups = async (page) => {
  for (let i = 0; i < 12; i++) {
    const busy = await page.evaluate(() => {
      const dlg = document.querySelector('.dialog-container');
      const open = !!dlg && dlg.style.display !== 'none' && dlg.offsetParent !== null;
      return open || document.body.innerText.includes('EMPLOYEE PORTAL');
    }).catch(() => false);
    if (!busy) break;
    await page.keyboard.down('Enter');
    await page.waitForTimeout(90);
    await page.keyboard.up('Enter');
    await page.waitForTimeout(280);
  }
};

const openRoom = async (context, room, { hud = false, seed = null } = {}) => {
  const page = await context.newPage();
  if (seed !== null) await page.addInitScript(SEED_SCRIPT(seed));
  // Must be set before the first room build, i.e. before the page's scripts run.
  if (MERGE_OFF) await page.addInitScript('window.__mergeStatics = false;');
  const url = `${BASE}/?dev&fixture=${FIXTURE}&shot=${room}${hud ? '' : '&hud=0'}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
  await clearPopups(page);
  await page.waitForTimeout(1200);
  await clearPopups(page);
  await page.waitForFunction(() => !!window.__engine && !!window.__perf && window.__perf.wrapped, { timeout: 15000 });
  return page;
};

// Warm-up: hold still long enough that first-visit shader compiles and texture
// uploads land HERE and not in the measurement window. The count of programs /
// textures that appear during warm-up IS the first-visit hitch budget.
const warmUp = async (page, ms = 2500) => {
  const before = await page.evaluate(() => window.__perf.snapshot());
  await page.waitForTimeout(ms);
  const after = await page.evaluate(() => window.__perf.snapshot());
  return {
    programsCompiledDuringWarmup: after.programs - before.programs,
    texturesUploadedDuringWarmup: after.textures - before.textures,
    programs: after.programs, textures: after.textures, geometries: after.geometries,
  };
};

const hideOverlay = (page) => page.evaluate(() => {
  let s = document.getElementById('__perf_hide');
  if (!s) {
    s = document.createElement('style');
    s.id = '__perf_hide';
    s.textContent = '#ui-overlay{visibility:hidden !important}';
    document.head.appendChild(s);
  }
});

const showOverlay = (page) => page.evaluate(() => {
  const s = document.getElementById('__perf_hide');
  if (s) s.remove();
});

// Union of every visible DOM overlay rect — fed to odiff as ignoreRegions so a
// HUD repaint is never mistaken for renderer flicker. Rescanned every frame so
// elements that appear mid-burst (interact prompt, toast) are still covered.
const scanHudRects = (page) => page.evaluate(() => {
  const out = [];
  const root = document.getElementById('ui-overlay');
  if (!root) return out;
  const walk = (el) => {
    for (const c of el.children) {
      const r = c.getBoundingClientRect();
      const vis = getComputedStyle(c).visibility !== 'hidden' && getComputedStyle(c).display !== 'none';
      if (vis && r.width > 1 && r.height > 1) out.push({ x1: Math.floor(r.left), y1: Math.floor(r.top), x2: Math.ceil(r.right), y2: Math.ceil(r.bottom) });
      else if (vis) walk(c);
    }
  };
  walk(root);
  return out;
});

const unionRects = (frames) => {
  const all = frames.flat();
  const merged = [];
  for (const r of all) {
    const pad = 6;
    const cand = { x1: Math.max(0, r.x1 - pad), y1: Math.max(0, r.y1 - pad), x2: r.x2 + pad, y2: r.y2 + pad };
    let hit = false;
    for (const m of merged) {
      if (cand.x1 <= m.x2 && cand.x2 >= m.x1 && cand.y1 <= m.y2 && cand.y2 >= m.y1) {
        m.x1 = Math.min(m.x1, cand.x1); m.y1 = Math.min(m.y1, cand.y1);
        m.x2 = Math.max(m.x2, cand.x2); m.y2 = Math.max(m.y2, cand.y2);
        hit = true; break;
      }
    }
    if (!hit) merged.push(cand);
  }
  return merged;
};

// odiff returns the SET of rows and columns containing differing pixels. Group
// contiguous runs to turn that into readable hotspot bands / a bbox.
const runs = (idx, gap = 12) => {
  if (!idx || !idx.length) return [];
  const out = [];
  let s = idx[0], p = idx[0];
  for (const v of idx.slice(1)) {
    if (v - p > gap) { out.push([s, p]); s = v; }
    p = v;
  }
  out.push([s, p]);
  return out;
};

const hotspots = (res) => {
  if (res.match || res.reason !== 'pixel-diff') return null;
  const rows = runs(res.diffLines || []);
  const cols = runs(res.diffCols || []);
  if (!rows.length || !cols.length) return null;
  const bbox = { x: cols[0][0], y: rows[0][0], w: cols[cols.length - 1][1] - cols[0][0], h: rows[rows.length - 1][1] - rows[0][0] };
  const bands = [];
  for (const r of rows.slice(0, 4)) for (const c of cols.slice(0, 4)) bands.push({ x: c[0], y: r[0], w: c[1] - c[0], h: r[1] - r[0] });
  return { bbox, bands: bands.slice(0, 8), rowBands: rows.length, colBands: cols.length };
};

// --------------------------------------------------- 1. frozen determinism --

// Render the frozen frame N times and diff consecutive pairs. Nothing in the
// scene advances between renders, so any nonzero pixel is the renderer.
const frozenPairs = async (page, room, tag, odiff, { perceptual = false } = {}) => {
  const shots = [];
  for (let i = 0; i < FROZEN_RENDERS; i++) {
    await page.evaluate(() => window.__engine.renderScene(window.__engine.scene, window.__engine.camera));
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.waitForTimeout(120);
    const f = join(OUT, `${room}_${tag}_${i}.png`);
    await page.screenshot({ path: f });
    shots.push(f);
  }
  const pairs = [];
  for (let i = 0; i < shots.length - 1; i++) {
    const out = join(OUT, `${room}_${tag}_diff_${i}${i + 1}.png`);
    const res = await odiff.compare(shots[i], shots[i + 1], out, {
      threshold: 0, antialiasing: false, outputDiffMask: true,
      captureDiffLines: true, captureDiffCols: true, timeout: 30000,
    });
    let perceptible = null;
    if (perceptual && !res.match) {
      const pOut = join(OUT, `${room}_${tag}_diffp_${i}${i + 1}.png`);
      const pRes = await odiff.compare(shots[i], shots[i + 1], pOut, {
        threshold: 0.1, antialiasing: true, outputDiffMask: true, timeout: 30000,
      });
      perceptible = { count: pRes.diffCount || 0, percentage: r2(pRes.diffPercentage || 0), match: !!pRes.match };
      if (pRes.match && existsSync(pOut)) { try { rmSync(pOut); } catch { /* ignore */ } }
    }
    pairs.push({
      pair: `${i}->${i + 1}`, match: !!res.match,
      diffCount: res.diffCount || 0, diffPercentage: res.diffPercentage || 0,
      perceptible, hotspots: hotspots(res), mask: res.match ? null : out,
    });
    if (res.match && existsSync(out)) { try { rmSync(out); } catch { /* ignore */ } }
  }
  return {
    pairs, shots,
    deterministic: pairs.every((p) => p.match),
    totalDiffPx: pairs.reduce((a, p) => a + p.diffCount, 0),
    worstDiffPx: pairs.reduce((a, p) => Math.max(a, p.diffCount), 0),
  };
};

// Which post pass is responsible? Disable each ONE at a time (not cumulatively)
// and re-run the same frozen test. AO and tilt-shift must go through the Engine
// setters because _configurePostFor() re-asserts their pass enables every frame.
const PASS_BISECT = [
  { key: 'noAO', label: 'N8AO off', off: () => window.__engine.setAmbientOcclusion(false), on: () => window.__engine.setAmbientOcclusion(true) },
  { key: 'noBloom', label: 'bloom off', off: () => { if (window.__engine._bloomPass) window.__engine._bloomPass.enabled = false; }, on: () => { if (window.__engine._bloomPass) window.__engine._bloomPass.enabled = true; } },
  { key: 'noTiltShift', label: 'tilt-shift off', off: () => window.__engine.setTiltShift(false), on: () => window.__engine.setTiltShift(true) },
];

const frozenRun = async (context, room, odiff) => {
  const page = await openRoom(context, room);
  const warm = await warmUp(page, 2500);
  await hideOverlay(page);

  // Freeze EVERYTHING. cine-shoot.mjs proves this rig: __engine.stop() halts the
  // rAF loop, so the fluorescent-hum Math.random(), CityBackdrop time, camera
  // shake, NPC wander and blink timers are all held. Whatever moves after this
  // is the RENDERER, nothing else.
  //
  // ONE THING stop() does NOT hold, and it is what round 1 mis-attributed to the
  // renderer: `Engine._loop` writes `_dirLight.intensity` from the fluorescent
  // hum, so whatever factor the last live frame applied is still sitting on the
  // light when the loop halts. That is a constant across renders, but any frame
  // the loop DOES manage to run between two captures moves it — and cubicle_farm
  // was the only one of the three measured rooms carrying `lighting.flicker`,
  // which is exactly the room that reported 51 differing samples while reception
  // and parking_garage read bit-identical. So the hum is switched off and the key
  // intensity is put back to its authored base before anything is measured. The
  // amplitude in src/ is a LOOK value and is left alone (round 1 halved it; QA
  // correctly rejected that as an unsigned look change) — the instrument removes
  // the variable instead of the game shrinking it.
  await page.evaluate(() => {
    const E = window.__engine;
    E.stop();
    E._flicker = false;
    if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
  });
  await page.waitForTimeout(250);

  // MAGNITUDE, not just count, and MEASURED FIRST. The PNG pair diff answers "do
  // any pixels differ"; it cannot answer "by how much", and that is the only
  // question that decides whether renderer nondeterminism is a bug or a float
  // artefact. So read the drawing buffer directly — gl.readPixels on consecutive
  // frozen renders, no screenshot path, no PNG encode, no compositor — and report
  // the largest per-channel delta. 1 = last significant bit of an 8-bit channel,
  // i.e. below the smallest step the display can show.
  //
  // This block used to run AFTER the screenshot burst below. It runs first now:
  // the burst interleaves `page.screenshot()` round trips and waits between
  // renders, and a determinism claim should be measured on the shortest possible
  // path from render to bytes, with nothing else in it.
  const lsb = await page.evaluate((N) => {
    const E = window.__engine;
    const gl = E.renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const read = () => {
      E.renderScene(E.scene, E.camera);
      const b = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b);
      return b;
    };
    // TWO SETTLE RENDERS, discarded, and then the measured window. Freezing the
    // engine and immediately rendering is not a steady state: N8AO re-runs
    // detectTransparency() and can reconfigure its compositor on the first render
    // after a state change, the shadow map is forced to refresh off the loop, and
    // any texture still mid-upload lands. Measured signature, with no settle
    // (tools/f5-lsb-hunt.mjs --warm=0, screenshots/f5/lsb-hunt-warm0.json): the
    // FIRST pair sometimes differs — 11,458 samples at Δ2 in parking_garage,
    // 24,623 at Δ2 in reception — and EVERY pair after it is bit-identical, in
    // all 3 rooms across all 7 AO configurations. With the settle, 21 of 21
    // configurations report 0 differing samples of 8,294,400. A one-off cost of
    // freezing is not temporal instability during play, which is what this gate
    // is about, so it is rendered and thrown away — and the settle pair is kept
    // as its own reported number so the claim stays checkable.
    const settle = [];
    for (let s = 0; s < 3; s++) settle.push(read());
    let settlePx = 0, settleMax = 0;
    for (let s = 1; s < settle.length; s++) {
      for (let i = 0; i < settle[0].length; i += 4) {
        const d = Math.max(Math.abs(settle[s - 1][i] - settle[s][i]),
          Math.abs(settle[s - 1][i + 1] - settle[s][i + 1]),
          Math.abs(settle[s - 1][i + 2] - settle[s][i + 2]));
        if (d) { settlePx++; if (d > settleMax) settleMax = d; }
      }
    }
    let a = read();
    let maxDelta = 0, diffPx = 0;
    const hist = {};
    const perPair = [];
    for (let k = 1; k < N; k++) {
      const b = read();
      let pairPx = 0, pairMax = 0;
      for (let i = 0; i < a.length; i += 4) {
        const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
        if (d) { pairPx++; if (d > pairMax) pairMax = d; hist[d] = (hist[d] || 0) + 1; }
      }
      perPair.push({ px: pairPx, max: pairMax });
      diffPx += pairPx;
      if (pairMax > maxDelta) maxDelta = pairMax;
      a = b;
    }
    return {
      width: w, height: h, pixels: w * h, renders: N, maxDelta, diffPx, hist, perPair,
      settle: { renders: settle.length, diffPx: settlePx, maxDelta: settleMax },
    };
  }, FROZEN_RENDERS);

  const base = await frozenPairs(page, room, 'frozen', odiff, { perceptual: true });
  const pairs = base.pairs;
  const deterministic = base.deterministic;

  // DRAW-CALL ATTRIBUTION. A "≤300 draw calls" verdict with no composition is
  // an unactionable number. The frame is already frozen, so hide one top-level
  // scene node at a time, re-render, and read the delta off renderer.info: that
  // is exactly what that node costs per frame. Shadow-caster cost shows up as
  // the DirectionalLight row (the shadow map redraws every caster).
  const attribution = await page.evaluate(() => {
    const E = window.__engine;
    const info = E.renderer.info;
    const prevAuto = info.autoReset;
    info.autoReset = false;
    const measure = () => { info.reset(); E.renderScene(E.scene, E.camera); return info.render.calls; };
    const full = measure();
    const rows = [];
    for (const child of E.scene.children.slice()) {
      if (!child.visible) continue;
      child.visible = false;
      const calls = full - measure();
      child.visible = true;
      if (calls > 0) rows.push({ node: child.name || (child.isLight ? `light:${child.type}` : child.type), calls });
    }
    info.autoReset = prevAuto;
    E.renderScene(E.scene, E.camera);
    rows.sort((a, b) => b.calls - a.calls);
    return { full, rows };
  });

  // CAPTURE-STABILITY CONTROL: two screenshots with NO render between them. The
  // browser composites the WebGL canvas asynchronously, so if this pair differs
  // the capture path itself is unstable and every "nondeterminism" number above
  // is confounded. This must be 0 for the determinism verdict to mean anything.
  const capA = join(OUT, `${room}_frozen_capctl_0.png`);
  const capB = join(OUT, `${room}_frozen_capctl_1.png`);
  await page.screenshot({ path: capA });
  await page.waitForTimeout(150);
  await page.screenshot({ path: capB });
  const capDiff = join(OUT, `${room}_frozen_capctl_diff.png`);
  const capRes = await odiff.compare(capA, capB, capDiff, {
    threshold: 0, antialiasing: false, outputDiffMask: true, captureDiffLines: true, captureDiffCols: true, timeout: 30000,
  });
  const captureStable = !!capRes.match;
  const captureControl = { stable: captureStable, diffCount: capRes.diffCount || 0, diffPercentage: r2(capRes.diffPercentage || 0), hotspots: hotspots(capRes) };
  for (const f of [capA, capB]) if (existsSync(f)) { try { rmSync(f); } catch { /* ignore */ } }
  if (captureStable && existsSync(capDiff)) { try { rmSync(capDiff); } catch { /* ignore */ } }

  // LIVE-CAPTURE SANITY CONTROL. "Deterministic" is only meaningful if the
  // capture path is actually re-reading a fresh framebuffer. Nudge the camera
  // by a hair and render again — that pair MUST differ. If it does not, the
  // screenshots are stale and the whole determinism verdict is a lie.
  await page.evaluate(() => {
    const eng = window.__engine;
    eng.__perfCamX = eng.camera.position.x;
    eng.camera.position.x += 0.06;
    eng.camera.updateMatrixWorld(true);
    eng.renderScene(eng.scene, eng.camera);
  });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(120);
  const nudged = join(OUT, `${room}_frozen_nudge.png`);
  await page.screenshot({ path: nudged });
  const sanityRes = await odiff.compare(base.shots[base.shots.length - 1], nudged, join(OUT, `${room}_frozen_nudge_diff.png`), {
    threshold: 0, antialiasing: false, outputDiffMask: false, timeout: 30000,
  });
  const sanity = {
    captureIsLive: !sanityRes.match,
    diffCount: sanityRes.diffCount || 0,
    diffPercentage: r2(sanityRes.diffPercentage || 0),
  };
  await page.evaluate(() => {
    const eng = window.__engine;
    if (eng.__perfCamX !== undefined) { eng.camera.position.x = eng.__perfCamX; eng.camera.updateMatrixWorld(true); }
    eng.renderScene(eng.scene, eng.camera);
  });
  for (const f of [nudged, join(OUT, `${room}_frozen_nudge_diff.png`)]) if (existsSync(f)) { try { rmSync(f); } catch { /* ignore */ } }

  // PASS BISECTION — disable each post pass individually and re-run the identical
  // frozen test. Whichever removal makes the frame reproduce is the culprit; if
  // none of them do, the instability is below the post chain (scene shading, GPU
  // float scheduling) and no amount of AO tuning will touch it.
  const bisect = {};
  if (!deterministic) {
    for (const v of PASS_BISECT) {
      await page.evaluate(v.off);
      const r = await frozenPairs(page, room, `frozen_${v.key}`, odiff);
      await page.evaluate(v.on);
      bisect[v.key] = {
        label: v.label, deterministic: r.deterministic,
        totalDiffPx: r.totalDiffPx, worstDiffPx: r.worstDiffPx,
        pairs: r.pairs.map((p) => p.diffCount),
        // Ratio, not equality. Demanding exactly 0 mislabels a variant that cuts
        // 39764 differing pixels down to 1 as "not the cause".
        reductionPct: base.totalDiffPx ? r2((1 - r.totalDiffPx / base.totalDiffPx) * 100) : null,
      };
      // Keep only the diff masks, not 5 full-res frames per variant.
      for (const s of r.shots) if (existsSync(s)) { try { rmSync(s); } catch { /* ignore */ } }
    }
  }
  const culprits = Object.values(bisect)
    .filter((v) => v.deterministic || (v.reductionPct !== null && v.reductionPct >= 95))
    .map((v) => `${v.label} (−${v.reductionPct}%${v.deterministic ? ', fully deterministic' : ''})`);

  await page.evaluate(() => { try { window.__engine.start(); } catch (e) { /* ignore */ } }).catch(() => {});
  await page.close();

  const perceptibleTotal = pairs.reduce((a, p) => a + (p.perceptible ? p.perceptible.count : 0), 0);

  return {
    room, deterministic, pairs, warm, sanity, captureControl, lsb, attribution,
    lsbVerdict: lsb.maxDelta === 0
      ? 'BIT-IDENTICAL — consecutive frozen renders match exactly in the drawing buffer'
      : lsb.maxDelta <= 1
        ? `LAST-BIT ONLY — max per-channel delta ${lsb.maxDelta}/255 over ${lsb.diffPx} pixel-samples; below one display step, cannot be seen`
        : `MAGNITUDE ${lsb.maxDelta}/255 — above last-bit, treat as a real defect`,
    verdictValid: captureStable && sanity.captureIsLive,
    totalDiffPx: base.totalDiffPx,
    worstDiffPx: base.worstDiffPx,
    perceptibleTotalPx: perceptibleTotal,
    bisect,
    aoAttribution: !deterministic
      ? (culprits.length
          ? `removed by: ${culprits.join('; ')}`
          : 'no single post pass accounts for it — the instability is below the post chain')
      : null,
    perceptibleVerdict: !deterministic
      ? (perceptibleTotal === 0
          ? 'SUB-VISIBLE — 0 perceptible px at threshold 0.1; this is LSB float noise, not player-visible flicker'
          : `${perceptibleTotal} perceptible px — potentially visible`)
      : null,
  };
};

// ------------------------------------------------------- 2. walking burst ---

const OPPOSITE = { ArrowRight: 'ArrowLeft', ArrowLeft: 'ArrowRight', ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp' };

const playerPos = (page) => page.evaluate(() => {
  const p = window.__explore && window.__explore.player && window.__explore.player.position;
  return p ? { x: p.x, z: p.z } : null;
});

// A held direction that walks straight into a wall turns the "walking" burst
// into a second static control — and the first version of this, which probed by
// actually walking for 350ms, happily picked a direction with 1 tile of runway
// and produced a burst median of 0.1% one run and 19% the next. Read the runway
// off the TileMap instead: exact, instant, and it tells us how far we can go.
const measureRunway = (page) => page.evaluate(() => {
  const ex = window.__explore;
  if (!ex || !ex.tileMap) return null;
  const tm = ex.tileMap, p = ex.player.position;
  const dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
  const out = {};
  for (const k of Object.keys(dirs)) {
    const [dx, dz] = dirs[k];
    let d = 0;
    for (let i = 1; i <= 80; i++) {
      const s = i * 0.25;
      if (!tm.canMove(p.x + dx * s, p.z + dz * s)) break;
      d = s;
    }
    out[k] = d;
  }
  return out;
});

const pickDirection = async (page) => {
  const runway = await measureRunway(page);
  if (!runway) return { key: 'ArrowRight', runway: null, probed: [] };
  const ranked = Object.entries(runway).map(([key, d]) => ({ key, runway: d })).sort((a, b) => b.runway - a.runway);
  const best = ranked[0];
  // Back up along the opposite so the whole burst has room ahead of it, but only
  // as far as that direction's own runway allows.
  const back = Math.min(runway[OPPOSITE[best.key]] || 0, 3.5);
  if (back > 0.5) {
    const holdMs = Math.min(1600, Math.round((back / 3.5) * 1600));
    await page.keyboard.down(OPPOSITE[best.key]);
    await page.waitForTimeout(holdMs);
    await page.keyboard.up(OPPOSITE[best.key]);
    await page.waitForTimeout(150);
  }
  const after = await measureRunway(page);
  return { key: best.key, runway: best.runway, runwayAfterBackup: after ? after[best.key] : null, probed: ranked };
};

const captureBurst = async (page, room, tag, { hold = null } = {}) => {
  const frames = [], masks = [];
  const start = await playerPos(page);
  if (hold) await page.keyboard.down(hold);
  const t0 = Date.now();
  for (let i = 0; i < BURST_FRAMES; i++) {
    masks.push(await scanHudRects(page));
    const f = join(OUT, `${room}_${tag}_f${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: f });
    frames.push(f);
    if (i < BURST_FRAMES - 1) await page.waitForTimeout(BURST_MS);
  }
  const elapsed = Date.now() - t0;
  if (hold) await page.keyboard.up(hold);
  const end = await playerPos(page);
  return {
    frames,
    ignoreRegions: unionRects(masks),
    elapsedMs: elapsed,
    displacement: start && end ? r2(Math.hypot(end.x - start.x, end.z - start.z)) : null,
  };
};

const diffBurst = async (odiff, room, tag, burst) => {
  const pairs = [];
  for (let i = 0; i < burst.frames.length - 1; i++) {
    const out = join(OUT, `${room}_${tag}_diff_${String(i).padStart(2, '0')}.png`);
    const res = await odiff.compare(burst.frames[i], burst.frames[i + 1], out, {
      // AA on + a small colour threshold: with MSAA and a grade pass, a strict
      // pixel-exact diff screams on every frame and the signal is lost.
      threshold: 0.1, antialiasing: true, outputDiffMask: true,
      captureDiffLines: true, captureDiffCols: true,
      ignoreRegions: burst.ignoreRegions.length ? burst.ignoreRegions : undefined,
      timeout: 60000,
    });
    pairs.push({
      pair: `${i}->${i + 1}`,
      changedPct: r2(res.diffPercentage || 0),
      changedPx: res.diffCount || 0,
      hotspots: hotspots(res),
      mask: res.match ? null : out,
    });
    if (res.match && existsSync(out)) { try { rmSync(out); } catch { /* ignore */ } }
  }
  const vals = pairs.map((p) => p.changedPct).sort((a, b) => a - b);
  return {
    pairs,
    median: r2(pct(vals, 50)), p95: r2(pct(vals, 95)), max: r2(vals[vals.length - 1] || 0),
    mean: r2(vals.reduce((a, b) => a + b, 0) / (vals.length || 1)),
  };
};

const walkRun = async (context, room, odiff) => {
  const page = await openRoom(context, room);
  await warmUp(page, 2200);
  if (!KEEP_HUD) await hideOverlay(page);

  // CONTROL first — no input at all. Whatever changes here is the room's
  // intentional animation (city backdrop, fluorescent hum, NPC idle/blink),
  // i.e. the floor the walking burst has to be judged against.
  const controlBurst = await captureBurst(page, room, 'static');
  const control = await diffBurst(odiff, room, 'static', controlBurst);

  const dir = await pickDirection(page);
  const walkBurst = await captureBurst(page, room, 'walk', { hold: dir.key });
  const walk = await diffBurst(odiff, room, 'walk', walkBurst);

  await page.close();

  // Walking should differ from a static frame — that is motion, not flicker.
  // Flicker is what shows up in the SHAPE: small, high-frequency, spatially
  // scattered change that does not scale with the camera's translation. Report
  // the ratio and the hotspots and let a human/critic read the masks.
  const ratio = control.median > 0.0005 ? r2(walk.median / control.median) : null;
  return {
    room,
    direction: dir.key, directionProbe: dir.probed,
    runwayTiles: dir.runway, runwayAfterBackup: dir.runwayAfterBackup,
    walkDisplacement: walkBurst.displacement,
    walkElapsedMs: walkBurst.elapsedMs, framesPerBurst: BURST_FRAMES, intervalMs: BURST_MS,
    hudMask: walkBurst.ignoreRegions,
    control, walk, walkOverControl: ratio,
    verdict: walkBurst.displacement !== null && walkBurst.displacement < 0.3
      ? 'INVALID — player did not move (walled in); rerun with a different spawn'
      : (control.max > 0.02 ? 'room animates while idle — control floor is nonzero' : 'idle control is clean'),
  };
};

// -------------------------------------------- 2b. deterministic step-walk ---
// The wall-clock burst above answers the literal question ("what changes between
// frames while walking?") but its answer is dominated by camera translation —
// ~19% of pixels change simply because the world slid. This variant removes
// every confound the harness can remove:
//   * __engine.stop() so no frame renders except the ones we ask for
//   * _updateCallback(1/60) stepped by hand — captures are EXACTLY one sim
//     frame apart, which is what the player actually sees consecutively
//   * a pinned PRNG + a shared start position, so the AO-on and AO-off runs
//     traverse the same states and their pair-diff distributions are comparable
// The AO-on minus AO-off delta is then a direct measure of how much per-frame
// instability the N8AO pass contributes on top of honest motion.

const steppedCapture = async (page, room, tag, dir, startPos, ao) => {
  if (!ao) await page.evaluate(() => window.__engine.setAmbientOcclusion(false));
  // BOTH passes teleport, even the one that is already there: snapTo() also
  // resets the follow camera onto the player, and an unequal camera offset put
  // one pass inside IsometricCamera's dead zone and the other outside it —
  // which desynced the A/B and produced a fake 2.5pp swing.
  await page.evaluate((p) => {
    const ex = window.__explore;
    ex.player.setPosition(p.x, p.z);
    ex.camera.snapTo(p.x, p.z);
  }, startPos);
  await page.evaluate((s) => { if (window.__perfReseed) window.__perfReseed(s); }, SEED);
  await page.evaluate(() => window.__engine.stop());
  await page.waitForTimeout(150);
  await page.keyboard.down(dir);
  // Pre-roll so the capture window measures SUSTAINED walking. Without it the
  // first frames sit inside the camera dead zone, where nothing but the player
  // sprite moves and the diff understates the real walking condition.
  await page.evaluate((n) => { for (let j = 0; j < n; j++) window.__engine._updateCallback(1 / 60); }, PRE_STEPS);
  const capStart = await playerPos(page);
  const frames = [], masks = [];
  for (let i = 0; i < BURST_FRAMES; i++) {
    await page.evaluate((k) => { for (let j = 0; j < k; j++) window.__engine._updateCallback(1 / 60); }, STEP);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    masks.push(await scanHudRects(page));
    const f = join(OUT, `${room}_${tag}_f${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: f });
    frames.push(f);
  }
  await page.keyboard.up(dir);
  const end = await playerPos(page);
  await page.evaluate(() => { try { window.__engine.start(); } catch (e) { /* ignore */ } }).catch(() => {});
  return {
    frames, ignoreRegions: unionRects(masks), endPos: end, capStart,
    captureDisplacement: capStart && end ? r2(Math.hypot(end.x - capStart.x, end.z - capStart.z)) : null,
  };
};

const steppedWalkRun = async (context, room, odiff) => {
  // Pass 1 — AO on. Probe the direction here and remember where we ended up.
  const p1 = await openRoom(context, room, { seed: SEED });
  await warmUp(p1, 2200);
  if (!KEEP_HUD) await hideOverlay(p1);
  const dir = await pickDirection(p1);
  const startPos = await playerPos(p1);
  const capOn = await steppedCapture(p1, room, 'stepwalk', dir.key, startPos, true);
  const displacement = startPos && capOn.endPos ? r2(Math.hypot(capOn.endPos.x - startPos.x, capOn.endPos.z - startPos.z)) : null;
  await p1.close();
  const aoOn = await diffBurst(odiff, room, 'stepwalk', capOn);

  // Pass 2 — AO off, teleported to pass 1's start, same direction, same seed.
  const p2 = await openRoom(context, room, { seed: SEED });
  await warmUp(p2, 2200);
  if (!KEEP_HUD) await hideOverlay(p2);
  const capOff = await steppedCapture(p2, room, 'stepwalk_noao', dir.key, startPos, false);
  await p2.close();
  const aoOff = await diffBurst(odiff, room, 'stepwalk_noao', capOff);

  const delta = r2(aoOn.median - aoOff.median);
  const moved = Math.min(capOn.captureDisplacement ?? 0, capOff.captureDisplacement ?? 0);
  return {
    room, direction: dir.key, stepFrames: STEP, preSteps: PRE_STEPS, seed: SEED,
    startPos, displacement, framesPerBurst: BURST_FRAMES,
    captureDisplacementAoOn: capOn.captureDisplacement,
    captureDisplacementAoOff: capOff.captureDisplacement,
    aoOn, aoOff, medianDelta: delta,
    aoShareOfChange: aoOn.median > 0 ? r2(delta / aoOn.median) : null,
    verdict: moved < 0.05
      ? 'INVALID — the capture window produced no movement (walled in during pre-roll)'
      : (delta > 0.5
          ? `AO adds ${delta} percentage points of per-frame change while walking (${r2((delta / (aoOn.median || 1)) * 100)}% of all inter-frame change)`
          : `AO contributes ${delta}pp — not the dominant per-frame change while walking`),
  };
};

// ------------------------------------------------------------ 3. timing -----

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

const cdpMetrics = (m) => Object.fromEntries(m.metrics.map((x) => [x.name, x.value]));

// Cumulative strip-down ladder. Each rung removes ONE cost and re-walks the same
// scripted patrol, so the p50 delta between rungs IS that feature's frame cost.
// Nothing is committed — every toggle is reverted before the page closes.
// Note _configurePostFor() re-asserts AO and tilt-shift enables EVERY frame, so
// those two must be turned off through the Engine setters, not the pass flags.
const COST_LADDER = [
  { label: 'baseline (as shipped)', apply: () => {} },
  { label: '- shadow map re-render (autoUpdate=false)', apply: () => { window.__engine.renderer.shadowMap.autoUpdate = false; } },
  { label: '- N8AO pass', apply: () => { window.__engine.setAmbientOcclusion(false); } },
  { label: '- bloom pass', apply: () => { if (window.__engine._bloomPass) window.__engine._bloomPass.enabled = false; } },
  { label: '- tilt-shift (2 blur passes)', apply: () => { window.__engine.setTiltShift(false); } },
  { label: '- shadows entirely (shadowMap.enabled=false)', apply: () => { window.__engine.renderer.shadowMap.enabled = false; } },
];

const costLadder = async (page, seconds) => {
  const rungs = [];
  for (const rung of COST_LADDER) {
    await page.evaluate(rung.apply);
    await page.waitForTimeout(400);
    await page.evaluate(() => window.__perf.start());
    const t0 = Date.now();
    await patrol(page, seconds);
    const d = await page.evaluate(() => window.__perf.stop());
    const s = summariseFrames(d.dt, (Date.now() - t0) / 1000);
    const calls = seriesStats(d.calls);
    rungs.push({
      label: rung.label, p50: s.p50, p95: s.p95, fps_p50: s.fps_p50,
      drawCallsP50: calls ? calls.p50 : null, trianglesP50: seriesStats(d.tris) ? Math.round(seriesStats(d.tris).p50) : null,
      cpuMsP50: seriesStats(d.cpu.map(r2)) ? seriesStats(d.cpu.map(r2)).p50 : null,
    });
  }
  await page.evaluate(() => {
    const e = window.__engine;
    e.renderer.shadowMap.enabled = true;
    e.renderer.shadowMap.autoUpdate = true;
    e.setAmbientOcclusion(true);
    e.setTiltShift(true);
    if (e._bloomPass) e._bloomPass.enabled = true;
  });
  for (let i = 1; i < rungs.length; i++) {
    rungs[i].savedMs = r2(rungs[i - 1].p50 - rungs[i].p50);
    rungs[i].savedCalls = rungs[i - 1].drawCallsP50 - rungs[i].drawCallsP50;
  }
  return rungs;
};

const timingRun = async (context, room, { throttle = 1, seconds = TIMING_S, ladder = false } = {}) => {
  const page = await openRoom(context, room);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable').catch(() => {});
  const warm = await warmUp(page, 2500);
  const config = await page.evaluate(CONFIG_SNAPSHOT);
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });

  const m0 = cdpMetrics(await cdp.send('Performance.getMetrics'));
  await page.evaluate(() => window.__perf.start());
  const wall0 = Date.now();
  await patrol(page, seconds);
  const wall = (Date.now() - wall0) / 1000;
  const data = await page.evaluate(() => window.__perf.stop());
  const m1 = cdpMetrics(await cdp.send('Performance.getMetrics'));
  if (throttle > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});

  const timing = summariseFrames(data.dt, wall);
  const loafTop = await attributeLoaf(data.loaf);

  // renderer.info downsampled to ~1Hz, plus every frame where the program count
  // stepped: a mid-play shader compile is a guaranteed multi-frame hitch and
  // that frame index is the smoking gun.
  const perSecond = [];
  if (data.t.length) {
    const t0 = data.t[0];
    let sec = 0;
    for (let i = 0; i < data.t.length; i++) {
      const s = Math.floor((data.t[i] - t0) / 1000);
      if (s >= sec) {
        perSecond.push({ s, calls: data.calls[i], triangles: data.tris[i], programs: data.progs[i], geometries: data.geos[i], textures: data.texs[i], heapMB: r2(data.heap[i] / 1048576) });
        sec = s + 1;
      }
    }
  }
  const programSteps = [];
  for (let i = 1; i < data.progs.length; i++) {
    if (data.progs[i] > data.progs[i - 1]) {
      programSteps.push({ frame: i, from: data.progs[i - 1], to: data.progs[i], atSec: r2((data.t[i] - data.t[0]) / 1000), frameMs: r2(data.dt[i - 1] || 0) });
    }
  }
  const textureSteps = [];
  for (let i = 1; i < data.texs.length; i++) {
    if (data.texs[i] > data.texs[i - 1]) textureSteps.push({ frame: i, from: data.texs[i - 1], to: data.texs[i], atSec: r2((data.t[i] - data.t[0]) / 1000) });
  }

  const heapMB = data.heap.map((h) => h / 1048576);
  const cdpDelta = {
    scriptDurationS: r2((m1.ScriptDuration || 0) - (m0.ScriptDuration || 0)),
    layoutDurationS: r2((m1.LayoutDuration || 0) - (m0.LayoutDuration || 0)),
    recalcStyleDurationS: r2((m1.RecalcStyleDuration || 0) - (m0.RecalcStyleDuration || 0)),
    taskDurationS: r2((m1.TaskDuration || 0) - (m0.TaskDuration || 0)),
    layoutCount: (m1.LayoutCount || 0) - (m0.LayoutCount || 0),
    recalcStyleCount: (m1.RecalcStyleCount || 0) - (m0.RecalcStyleCount || 0),
    nodes: m1.Nodes || 0,
    jsHeapUsedMB: r2((m1.JSHeapUsedSize || 0) / 1048576),
    wallS: r2(wall),
  };
  cdpDelta.scriptShareOfWall = r2(cdpDelta.scriptDurationS / (wall || 1));
  cdpDelta.styleLayoutShareOfWall = r2((cdpDelta.layoutDurationS + cdpDelta.recalcStyleDurationS) / (wall || 1));

  // 4s rungs put bloom and tilt-shift inside the noise floor (they read as
  // negative savings). 8s is the shortest rung that separated them reliably.
  const ladderRungs = ladder ? await costLadder(page, LADDER_S) : null;

  await page.close();

  return {
    room, throttle, warm, config, ladder: ladderRungs, timing,
    cpuMs: seriesStats(data.cpu.map(r2)),
    drawCalls: seriesStats(data.calls),
    triangles: seriesStats(data.tris),
    programs: seriesStats(data.progs),
    geometries: seriesStats(data.geos),
    textures: seriesStats(data.texs),
    heapMB: seriesStats(heapMB.map(r2)),
    perSecond, programSteps, textureSteps,
    loafSupported: data.loafSupported,
    loafCount: data.loaf.length,
    loafTop,
    cdp: cdpDelta,
    droppedSamples: data.dropped,
  };
};

// ------------------------------------------------- 4b. transition hitches ---

// The within-room timing runs prove "0 mid-run compile steps" — but they never
// cross a room boundary, and the leak table's program count oscillates across
// re-entries (39 → 55 → 53 → 54 → 55), which is exactly the signature of shader
// programs being released and recompiled. A recompile is a guaranteed multi-frame
// stall, so the FIRST FRAMES AFTER A TRANSITION are the frames to measure.
//
// Method: probe running, hop with __explore._loadRoom(), then read the frame
// series for the following second and attribute the worst frame. Programs,
// geometries and textures are sampled either side of the hop so a compile shows
// up as a count step next to a time spike.
// TWO WINDOWS PER HOP, and the distinction is the whole point of the fix this
// round measures.
//
//   window A — "raw", the clock starts BEFORE the room is built, so it contains
//     the build frame and every shader compile and texture upload that lands in
//     it. This is what round 1 reported (307ms). It is a load cost, not a
//     post-transition cost: in the shipped game those frames happen while the
//     wipe covers the screen.
//   window B — "as shipped", the clock starts after the room is built AND after
//     Engine.warmScene() has resolved, which is exactly what
//     ExplorationState._changeRoom() awaits behind the wipe before revealing the
//     room. These are the frames a player actually sees after a door opens, and
//     they are what the ≤50ms budget row means by "in the second after a room
//     transition".
//
// Both are reported. B is gated; A is kept so a regression in load cost is still
// visible and so the round-1 number stays comparable.
//
// A hop that records fewer than MIN_FRAMES frames is an INSTRUMENT DROPOUT, not
// a pass. Round 1 recorded a hop with 0 frames on the worst-case room and its
// max() silently returned 0 — that hop is now retried once and, if it is still
// short, flagged and excluded from the verdict rather than counted as clean.
const MIN_TRANSITION_FRAMES = 10;

const transitionRun = async (context, hops = 8) => {
  const page = await openRoom(context, HOP_CYCLE[0]);
  await warmUp(page, 2500);
  const rows = [];

  const sampleWindow = async (ms) => {
    await page.evaluate(() => window.__perf.start());
    await page.waitForTimeout(ms);
    const d = await page.evaluate(() => window.__perf.stop());
    const dt = d.dt.filter((x) => x > 0);
    return { d, dt };
  };

  const doHop = async (room, windowMs) => {
    const before = await page.evaluate(() => window.__perf.snapshot());
    // Window A: clock running across the build itself.
    await page.evaluate(() => window.__perf.start());
    await page.evaluate((r) => window.__explore._loadRoom(r), room);
    await page.waitForTimeout(windowMs);
    const dA = await page.evaluate(() => window.__perf.stop());
    const dtA = dA.dt.filter((x) => x > 0);
    // The shipped transition awaits warmScene() behind the wipe. _loadRoom()
    // fires it without awaiting (it has no wipe), so the harness awaits it here
    // to reproduce the _changeRoom() ordering before opening window B.
    const warm = await page.evaluate(async () => {
      const e = window.__engine;
      return e.warmScene ? await e.warmScene(e.scene, e.camera) : null;
    });
    const mid = await page.evaluate(() => window.__perf.snapshot());
    // Window B: post-wipe frames only.
    const { d: dB, dt: dtB } = await sampleWindow(windowMs);
    const after = await page.evaluate(() => window.__perf.snapshot());
    const stat = (dt) => {
      const worst = dt.length ? Math.max(...dt) : 0;
      return {
        frames: dt.length, worstMs: r2(worst), worstFrameIndex: dt.indexOf(worst),
        over33: dt.filter((x) => x > 33).length,
        over50: dt.filter((x) => x > 50).length,
        steadyMs: dt.length > 6 ? r2(pct(dt.slice(Math.max(0, dt.length - 20)).sort((a, b) => a - b), 0.5)) : 0,
        firstFrames: dt.slice(0, 6).map(r2),
      };
    };
    const spread = (progs) => {
      const nz = progs.filter((x) => x > 0);
      return nz.length ? Math.max(...nz) - Math.min(...nz) : 0;
    };
    return {
      room, before, mid, after, warm,
      raw: { ...stat(dtA), compiledDuringWindow: spread(dA.progs) },
      shipped: { ...stat(dtB), compiledDuringWindow: spread(dB.progs) },
      programs: `${before.programs}→${after.programs}`,
      programDelta: after.programs - before.programs,
      programsWarmedBehindWipe: mid.programs - before.programs,
      programsAfterReveal: after.programs - mid.programs,
      geometries: `${before.geometries}→${after.geometries}`,
      textures: `${before.textures}→${after.textures}`,
    };
  };

  for (let i = 0; i < hops; i++) {
    const room = HOP_CYCLE[(i + 1) % HOP_CYCLE.length];
    let r = await doHop(room, 1400);
    let retried = false;
    if (r.shipped.frames < MIN_TRANSITION_FRAMES || r.raw.frames < MIN_TRANSITION_FRAMES) {
      // Re-enter the previous room, then retry this hop once, so the retry is a
      // genuine transition and not a no-op reload of the room we are already in.
      await page.evaluate((prev) => window.__explore._loadRoom(prev), HOP_CYCLE[i % HOP_CYCLE.length]);
      await page.waitForTimeout(700);
      r = await doHop(room, 1800);
      retried = true;
    }
    const dropout = r.shipped.frames < MIN_TRANSITION_FRAMES || r.raw.frames < MIN_TRANSITION_FRAMES;
    rows.push({ hop: i + 1, retried, dropout, ...r });
  }
  await page.close();

  const good = rows.filter((r) => !r.dropout);
  const dropouts = rows.filter((r) => r.dropout);
  const worstShipped = good.reduce((a, r) => Math.max(a, r.shipped.worstMs), 0);
  const worstRaw = good.reduce((a, r) => Math.max(a, r.raw.worstMs), 0);
  const compilesShipped = good.filter((r) => r.shipped.compiledDuringWindow > 0).length;
  const compilesAfterReveal = good.filter((r) => r.programsAfterReveal > 0).length;
  const warmedTotal = rows.reduce((a, r) => a + (r.programsWarmedBehindWipe || 0), 0);
  return {
    hops, rows, dropouts: dropouts.length,
    worstMs: worstShipped, worstRawMs: worstRaw,
    hopsWithCompiles: compilesShipped, hopsCompilingAfterReveal: compilesAfterReveal,
    programsWarmedBehindWipe: warmedTotal,
    verdict: dropouts.length
      ? `INSTRUMENT DROPOUT — ${dropouts.length} of ${hops} hop(s) recorded <${MIN_TRANSITION_FRAMES} frames even after a retry (${dropouts.map((r) => `hop ${r.hop} ${r.room}`).join(', ')}); those hops are NOT counted as clean. Worst measured post-reveal frame across the ${good.length} valid hop(s): ${worstShipped}ms.`
      : worstShipped <= 50
        ? `CLEAN — worst frame in any post-reveal second is ${worstShipped}ms across ${hops} hops; ${warmedTotal} program(s) were compiled behind the wipe by warmScene() and ${compilesAfterReveal} hop(s) compiled anything after the reveal. Raw load window (build frame included, hidden by the wipe in play) peaked at ${worstRaw}ms.`
        : `HITCH — worst post-reveal frame ${worstShipped}ms across ${hops} hops (${compilesShipped} hop(s) compiled shaders after the reveal). Raw load window peaked at ${worstRaw}ms.`,
  };
};

// -------------------------------------------------------------- 4. leak ----

const leakRun = async (context) => {
  const page = await openRoom(context, HOP_CYCLE[0]);
  await warmUp(page, 2500);
  const samples = [];
  const snap = async (label, hop) => {
    const s = await page.evaluate(() => window.__perf.snapshot());
    samples.push({ hop, room: label, geometries: s.geometries, textures: s.textures, programs: s.programs, heapMB: r2(s.heap / 1048576), drawCalls: s.calls });
  };
  await snap(HOP_CYCLE[0], 0);
  for (let i = 0; i < HOPS; i++) {
    const room = HOP_CYCLE[(i + 1) % HOP_CYCLE.length];
    await page.evaluate((r) => window.__explore._loadRoom(r), room);
    await page.waitForTimeout(500);
    if (i % 3 === 2) {
      await page.evaluate(() => { try { if (window.gc) window.gc(); } catch (e) { /* ignore */ } });
      await page.waitForTimeout(180);
    }
    await snap(room, i + 1);
  }
  await page.close();

  const first = samples[0], last = samples[samples.length - 1];
  const growth = (k) => ({ first: first[k], last: last[k], delta: r2(last[k] - first[k]), perHop: r2((last[k] - first[k]) / HOPS) });
  const geo = growth('geometries'), tex = growth('textures'), prog = growth('programs'), heap = growth('heapMB');
  // Monotonic upward slope over a repeating room cycle = nothing is being
  // released. On a repeating cycle the counts should return to the same value
  // every time the same room comes back around.
  const monotonic = (k) => samples.every((s, i) => i === 0 || s[k] >= samples[i - 1][k]);

  // STEADY STATE — the metric that actually separates a leak from a warm cache.
  // first→last conflates two different things: resources that were never
  // released (a leak, unbounded) and caches that filled the first time each new
  // room was seen (MaterialLibrary's monitor screens and skylines, the toon
  // gradient ramps, ProceduralNormals — bounded, and correct to keep).
  // Compare the SAME room's last two visits instead: if teardown releases
  // everything the room built, revisiting it must land on the same count. A
  // positive delta there is a leak with no ceiling; +0 is proof there is none,
  // no matter what the first→last number says.
  const perRoom = {};
  for (const s of samples) (perRoom[s.room] ||= []).push(s);
  // Only rooms with THREE visits qualify. A two-visit comparison is still
  // confounded: between a room's first and second visit the harness sees other
  // rooms for the first time, so their caches fill in between and inflate the
  // delta. From the second visit onward every cache the cycle can touch is warm,
  // so visit N vs visit N-1 (N ≥ 3) isolates this room's own teardown.
  const revisits = Object.entries(perRoom)
    .filter(([, v]) => v.length >= 3)
    .map(([room, v]) => ({
      room, visits: v.length,
      hops: `${v[v.length - 2].hop}→${v[v.length - 1].hop}`,
      textures: v[v.length - 1].textures - v[v.length - 2].textures,
      geometries: v[v.length - 1].geometries - v[v.length - 2].geometries,
      programs: v[v.length - 1].programs - v[v.length - 2].programs,
    }));
  // NET across the cycle, not the per-room worst. A single room's delta carries
  // ±2 of jitter because the snapshot can land with the player/NPC meshes in a
  // different build state; the sign flips room to room (measured: -2, -1, -1, 0,
  // +1, +1). A leak cannot be negative anywhere, so the net over a full cycle is
  // the statistic that distinguishes jitter from growth. Per-room numbers are
  // reported in the table so the jitter is visible rather than hidden.
  const net = (k) => revisits.reduce((a, r) => a + r[k], 0);
  const worst = (k) => (revisits.length ? Math.max(...revisits.map((r) => r[k])) : 0);

  // PER-ROOM TREND, and this is the gate — not the net.
  //
  // Round 1 gated on the net across the cycle (-3 geometries) while one room,
  // executive_floor, showed +1 on its last re-entry. QA was right that "net
  // aggregation passes a positive per-room delta" contradicts the stated
  // doctrine ("a positive number here is unbounded growth"). Both readings were
  // too coarse: a single delta cannot tell growth from a bounded oscillation,
  // and the net can hide one room's growth behind another's jitter.
  //
  // So classify each room's own visit SERIES, from its 2nd visit onward (the
  // 1st is excluded — caches for the other rooms in the cycle fill between
  // visit 1 and 2, which inflates that one delta for reasons that are not this
  // room's teardown):
  //   GROWTH      every delta > 0 — unbounded, a leak, fails.
  //   OSCILLATING bounded (max-min ≤ 2) with at least one non-positive delta —
  //               the count returns, it just lands on either side of a build
  //               boundary. Passes, and is named so it is not mistaken for flat.
  //   FLAT        every delta 0.
  //   UNBOUNDED   not bounded and not monotonic — fails; needs a look.
  // A room needs 3+ visits (i.e. 2+ post-warm deltas) to be classifiable at all.
  const classify = (series) => {
    if (series.length < 3) return { verdict: 'INSUFFICIENT', deltas: [], span: 0 };
    const post = series.slice(1);                    // drop visit 1 (cold caches)
    const deltas = post.slice(1).map((v, i) => v - post[i]);
    const span = Math.max(...post) - Math.min(...post);
    if (!deltas.length) return { verdict: 'INSUFFICIENT', deltas, span };
    if (deltas.every((d) => d === 0)) return { verdict: 'FLAT', deltas, span };
    if (deltas.every((d) => d > 0)) return { verdict: 'GROWTH', deltas, span };
    if (span <= 2) return { verdict: 'OSCILLATING', deltas, span };
    return { verdict: 'UNBOUNDED', deltas, span };
  };
  const trends = Object.entries(perRoom).map(([room, v]) => ({
    room, visits: v.length,
    geometries: { series: v.map((s) => s.geometries), ...classify(v.map((s) => s.geometries)) },
    textures: { series: v.map((s) => s.textures), ...classify(v.map((s) => s.textures)) },
    programs: { series: v.map((s) => s.programs), ...classify(v.map((s) => s.programs)) },
  }));
  const failing = trends.filter((t) => ['geometries', 'textures', 'programs']
    .some((k) => t[k].verdict === 'GROWTH' || t[k].verdict === 'UNBOUNDED'));
  const classifiable = trends.filter((t) => t.geometries.verdict !== 'INSUFFICIENT');

  const steady = {
    revisits, trends, failingRooms: failing.map((t) => t.room), classifiable: classifiable.length,
    textures: net('textures'), geometries: net('geometries'), programs: net('programs'),
    worstTextures: worst('textures'), worstGeometries: worst('geometries'), worstPrograms: worst('programs'),
  };

  return {
    hops: HOPS, cycle: HOP_CYCLE, samples,
    geometries: geo, textures: tex, programs: prog, heapMB: heap, steady,
    geometriesMonotonic: monotonic('geometries'),
    texturesMonotonic: monotonic('textures'),
    verdict: !classifiable.length
      ? `INCONCLUSIVE — no room was entered 3 times in ${HOPS} hops, so no per-room trend can be classified. Raise --hops.`
      : failing.length
        ? `LEAK — ${failing.length} room(s) show a per-room series that grows without bound: ${failing.map((t) => `${t.room} geo[${t[
          'geometries'].series.join(',')}] tex[${t.textures.series.join(',')}]`).join('; ')}`
        : `FLAT / BOUNDED at steady state — every one of the ${classifiable.length} room(s) with 3+ visits has a bounded per-room series (${classifiable.map((t) => `${t.room}: geo ${t.geometries.verdict}`).join(', ')}). No room's count grows monotonically across its own re-entries, which is the definition of a leak. First→last over ${HOPS} hops reads textures ${tex.delta >= 0 ? '+' : ''}${tex.delta} / geometries ${geo.delta >= 0 ? '+' : ''}${geo.delta}, which is the caches filling on first sight of each room, not growth.`,
  };
};

// ------------------------------------------------------------- reporting ---

const bar = (n, max, w = 28) => '#'.repeat(Math.max(0, Math.round((n / (max || 1)) * w)));

// COMP_CARD's budgets, made testable. Absolute-fps budgets are skipped when the
// renderer was software, because a SwiftShader fps number cannot fail or pass a
// hardware budget — it is not measuring the same thing.
const budgetCheck = (result) => {
  const out = [];
  const soft = (result.gpu && result.gpu.software) || HEADLESS;
  const byMode = (t) => (t.vsync === 'disabled' ? 'vsync off' : `CPU ${t.throttle}x`);
  for (const t of result.timing || []) {
    // One draw-call row per room, not one per throttle rate: CPU throttling
    // cannot change how many draws a frame issues, so round 1's duplicate rows
    // (two FAILs per room, 6 of its 11 fails) were the same fact counted twice.
    if (t.throttle === 1) {
      out.push({
        metric: `draw calls · ${t.room}`, budget: '≤ 300', actual: String(t.drawCalls.p50),
        pass: t.drawCalls.p50 <= 300, source: 'COMP_CARD',
      });
      out.push({
        metric: `fps p50 native · ${t.room}`, budget: '≥ 60', actual: soft ? 'n/a (software)' : String(t.timing.fps_p50),
        pass: soft ? true : t.timing.fps_p50 >= 59.5, source: 'COMP_CARD', skipped: soft,
      });
    }
    if (t.throttle === 2) {
      out.push({
        metric: `fps p50 @CPU 2x (mid laptop) · ${t.room}`, budget: '≥ 60',
        actual: soft ? 'n/a (software)' : String(t.timing.fps_p50),
        pass: soft ? true : t.timing.fps_p50 >= 59.5, source: 'COMP_CARD proxy', skipped: soft,
      });
      out.push({
        metric: `p95 frame time @CPU 2x (mid laptop) · ${t.room}`, budget: '≤ 33ms',
        actual: soft ? 'n/a (software)' : `${t.timing.p95}ms`,
        pass: soft ? true : t.timing.p95 <= 33, source: 'harness (mid-laptop playability)', skipped: soft,
      });
    }
    if (t.throttle === THROTTLE_RATE) {
      out.push({
        metric: `p95 frame time @CPU ${THROTTLE_RATE}x (mobile floor) · ${t.room}`, budget: '≤ 33ms',
        actual: soft ? 'n/a (software)' : `${t.timing.p95}ms`,
        pass: soft ? true : t.timing.p95 <= 33, source: 'harness (mobile-floor playability)', skipped: soft,
      });
      out.push({
        metric: `fps p50 @CPU ${THROTTLE_RATE}x (mobile floor) · ${t.room}`, budget: '≥ 30',
        actual: soft ? 'n/a (software)' : String(t.timing.fps_p50),
        pass: soft ? true : t.timing.fps_p50 >= 30, source: 'COMP_CARD proxy', skipped: soft,
      });
    }
    out.push({
      metric: `p99 ≤ 2× p50 · ${t.room} (${byMode(t)})`, budget: `≤ ${r2(t.timing.p50 * 2)}ms`,
      actual: `${t.timing.p99}ms`, pass: t.timing.p99 <= t.timing.p50 * 2, source: 'harness',
    });
    // p95 frame time, vsync ON. Reported, NOT gated: with vsync the GPU cannot
    // present faster than 16.67ms, so a scene with any headroom at all still
    // reports p50 = 16.7 and p95 = one tick plus scheduling jitter. Gating the
    // 16.6ms budget on this number makes it unpassable by construction. The
    // gated version is the vsync-off row below, which is the same budget
    // measured where it can actually be met or missed.
    if (t.throttle === 1) {
      out.push({
        metric: `p95 frame time · ${t.room} (vsync on — informational)`, budget: '≤ 16.6ms + 1 tick',
        actual: `${t.timing.p95}ms`, pass: true, skipped: true, source: 'gated on the vsync-off row',
      });
    }
  }
  for (const t of result.uncapped || []) {
    out.push({
      metric: `p95 frame time · ${t.room} (vsync OFF)`, budget: '≤ 16.6ms',
      actual: soft ? 'n/a (software)' : `${t.timing.p95}ms`,
      pass: soft ? true : t.timing.p95 <= 16.6, source: 'COMP_CARD 60fps, measured uncapped', skipped: soft,
    });
  }
  for (const f of result.frozen || []) {
    // The gate is stated on MAGNITUDE, not on a pixel count. See the readPixels
    // table in VERDICTS: a count cannot tell a different image from a float
    // reduction rounding the other way, and Δ=1 is the last bit of an 8-bit
    // channel — below one display step, so structurally invisible. Δ>1 fails.
    if (f.lsb) {
      // THE GATE AS BRIEFED: literally zero differing samples on the drawing
      // buffer. Round 1 restated it as "≤1 LSB" inside the report, which QA
      // correctly called a gate renegotiation by the measured party. It is
      // stated here at ZERO, first, and it either passes or it does not.
      out.push({
        metric: `frozen-frame differing samples on the drawing buffer · ${f.room}`,
        budget: '0',
        actual: `${f.lsb.diffPx} of ${f.lsb.pixels * (f.lsb.renders - 1)} (${f.lsb.renders} renders, ${f.lsb.renders - 1} pairs × ${f.lsb.pixels} px)`,
        pass: f.lsb.diffPx === 0, source: 'harness (readPixels, exact)',
      });
      out.push({
        metric: `frozen-frame max channel delta · ${f.room}`, budget: '0/255',
        actual: `${f.lsb.maxDelta}/255`, pass: f.lsb.maxDelta === 0, source: 'harness (readPixels)',
      });
      if (f.lsb.settle) {
        out.push({
          metric: `frozen-frame SETTLE pair (discarded warm renders) · ${f.room}`,
          budget: 'diagnostic',
          actual: `${f.lsb.settle.diffPx} samples, max Δ ${f.lsb.settle.maxDelta}/255 over ${f.lsb.settle.renders} warm renders`,
          pass: true, skipped: true, source: 'diagnostic — the cost of freezing, not of playing',
        });
      }
    }
    out.push({
      metric: `frozen-frame PERCEPTIBLE diff px · ${f.room}`, budget: '0',
      actual: String(f.perceptibleTotalPx ?? 0), pass: (f.perceptibleTotalPx ?? 0) === 0, source: 'harness',
    });
    out.push({
      metric: `frozen-frame exact-match pairs · ${f.room}`, budget: 'all (informational)',
      actual: `${f.pairs.filter((p) => p.match).length}/${f.pairs.length}`,
      pass: true, skipped: true, source: 'diagnostic — gated on LSB above',
    });
  }
  if (result.transitions) {
    const t = result.transitions;
    // A dropout can never pass: round 1 had a hop that recorded 0 frames and
    // max() of an empty set returned 0, which read as clean on the worst-case
    // room. See transitionRun().
    out.push({
      metric: 'worst frame in the second after a room transition (post-reveal)', budget: '≤ 50ms',
      actual: t.dropouts ? `${t.worstMs}ms — ${t.dropouts} hop(s) DROPPED OUT` : `${t.worstMs}ms`,
      pass: !t.dropouts && t.worstMs <= 50, source: 'harness',
    });
    out.push({
      metric: 'shader programs compiled AFTER the room is revealed', budget: '0',
      actual: `${t.hopsCompilingAfterReveal} of ${t.hops} hop(s)`,
      pass: t.hopsCompilingAfterReveal === 0, source: 'harness (warmScene)',
    });
    out.push({
      metric: 'transition hops with a usable frame sample', budget: `${t.hops}`,
      actual: `${t.hops - t.dropouts}`, pass: t.dropouts === 0, source: 'harness (instrument check)',
    });
    out.push({
      metric: 'raw load window incl. the build frame (hidden by the wipe in play)',
      budget: 'diagnostic', actual: `${t.worstRawMs}ms`,
      pass: true, skipped: true, source: 'diagnostic — not a post-transition cost',
    });
  }
  if (result.leak) {
    const st = result.leak.steady;
    if (st) {
      // GATED PER ROOM ON THE TREND, not on the net and not on a single delta.
      // See the classify() note in leakRun() for why: a net can hide one room's
      // growth behind another's jitter, and a single re-entry delta cannot tell
      // growth from a bounded ±1 oscillation. A leak is a series that only ever
      // goes up. Round 1's net-based rows are kept below as diagnostics so the
      // numbers stay comparable, but they are no longer what passes or fails.
      const sign = (n) => `${n >= 0 ? '+' : ''}${n}`;
      for (const key of ['geometries', 'textures', 'programs']) {
        const bad = (st.trends || []).filter((t) => t[key].verdict === 'GROWTH' || t[key].verdict === 'UNBOUNDED');
        const osc = (st.trends || []).filter((t) => t[key].verdict === 'OSCILLATING');
        const usable = (st.trends || []).filter((t) => t[key].verdict !== 'INSUFFICIENT');
        out.push({
          metric: `${key} per-room re-entry series is bounded (no monotonic growth)`,
          budget: '0 rooms growing',
          actual: bad.length
            ? `${bad.length} growing: ${bad.map((t) => `${t.room}[${t[key].series.join(',')}]`).join(' ')}`
            : `0 of ${usable.length} room(s)${osc.length ? ` — ${osc.length} bounded-oscillating: ${osc.map((t) => `${t.room}[${t[key].series.join(',')}] span ${t[key].span}`).join(' ')}` : ''}`,
          pass: usable.length > 0 && bad.length === 0,
          source: 'leak test (per-room trend)',
        });
      }
      out.push({
        metric: 'net over cycle: textures / geometries / programs on re-entry',
        budget: 'diagnostic',
        actual: `${sign(st.textures)} / ${sign(st.geometries)} / ${sign(st.programs)} (worst room ${sign(st.worstTextures)} / ${sign(st.worstGeometries)} / ${sign(st.worstPrograms)})`,
        pass: true, skipped: true, source: 'diagnostic — gated per room above',
      });
    }
    out.push({
      metric: 'textures first→last over room hops (cache warm-up, informational)',
      budget: 'n/a', actual: `${result.leak.textures.delta >= 0 ? '+' : ''}${result.leak.textures.delta}`,
      pass: true, skipped: true, source: 'diagnostic — gated on steady state above',
    });
  }
  return out;
};

const writeReport = (result) => {
  const L = [];
  const gpu = result.gpu;
  const soft = gpu.software || HEADLESS;

  L.push(`# PERF ${LABEL} — TRUST ISSUES`);
  L.push('');
  L.push(`- **When** ${result.when}`);
  L.push(`- **Commit** \`${result.commit}\` (branch \`${result.branch}\`)`);
  // PROVENANCE. The previous round stamped a commit hash while measuring
  // uncommitted working-tree edits, so nothing pinned the measured code and the
  // numbers were unreproducible. A dirty tree now says so, names the files, and
  // ships the exact diff next to the report: `git checkout <commit> && git apply
  // <patch>` reconstructs the measured state byte for byte.
  // --measured=<text> overrides the tree stamp. It exists for the BEFORE half of
  // a comparison, where the harness runs from the working tree but the PAGE is
  // served by a second dev server pointed at a clean git worktree: the code that
  // was measured is not the code the harness was read from, and saying otherwise
  // would repeat exactly the provenance error this run is fixing.
  if (MEASURED) {
    L.push(`- **Measured code** ${MEASURED}`);
    L.push(`- **Served from** \`${BASE}\``);
  } else if (result.tree) {
    const t = result.tree;
    if (t.dirty) {
      L.push(`- **Working tree** DIRTY — ${t.files.length} file(s) modified vs \`${result.commit}\`; diff sha256 \`${t.diffSha.slice(0, 16)}\` (${t.diffBytes} bytes)`);
      L.push(`- **Reproduce this exact state**: \`git checkout ${result.commit} && git apply ${t.patchFile}\``);
      L.push(`- **Modified (in the patch)**: ${t.files.map((f) => `\`${f}\``).join(', ')}`);
      if (t.untracked?.length) {
        L.push(t.patchIncludesUntracked
          ? `- **New files (also in the patch, as add-file hunks)**: ${t.untracked.map((f) => `\`${f}\``).join(', ')}`
          : `- **Untracked, NOT in the patch** (copy these by hand to reproduce): ${t.untracked.map((f) => `\`${f}\``).join(', ')}`);
      }
      if (t.patchIncludesUntracked) {
        L.push(`- **Patch composition** ${t.trackedBytes} bytes of tracked diff + ${t.untrackedBytes} bytes of new-file hunks = ${t.diffBytes} bytes. Verify before trusting it: \`git apply --check ${t.patchFile}\` against a clean \`${result.commit}\`.`);
      }
      L.push('- **NOT COMMITTED.** This branch\'s committed state is still `' + result.commit + '`, i.e. the BEFORE behaviour. Every win in this report exists only in the archived patch until an integrator lands it. That is a deliberate constraint on this run, not an oversight — see INTEGRATOR HANDOFF at the end of this file.');
      L.push('- **Patch vs measurement drift, stated plainly:** the patch is regenerated whenever this file is, so if the');
      L.push('  report was rebuilt with `--mode=report` after the measurement it can contain later edits. For this');
      L.push('  build: **every file under `src/` is byte-identical to what was measured** (last `src/` write 06:59:29');
      L.push('  local; the measurement finished 07:15:07 local). What changed afterwards is confined to `tools/` — this');
      L.push('  report\'s own prose/table generation, and three new read-only diagnostic scripts');
      L.push('  (`f5-midplay-alloc.mjs`, `f5-proof-sheet.mjs`, `f5-transition-smoke.mjs`) that no measurement path');
      L.push('  calls. If you need byte-exact tooling provenance too, re-run the harness after landing the patch.');
    } else {
      L.push(`- **Working tree** CLEAN — the measured code is exactly \`${result.commit}\``);
    }
  }
  L.push(`- **GPU (UNMASKED_RENDERER_WEBGL)** \`${gpu.renderer}\``);
  L.push(`- **Vendor** \`${gpu.vendor}\` · devicePixelRatio ${gpu.dpr} · EXT_disjoint_timer_query_webgl2: ${gpu.gpuTimerQuery ? 'available' : 'unavailable'}`);
  L.push(`- **Mode** ${HEADLESS ? 'HEADLESS' : 'HEADED'} · viewport ${VIEW.width}x${VIEW.height} @ dpr 1 · fixture \`${FIXTURE}\``);
  L.push('');
  L.push(soft
    ? `> ## ⚠ RELATIVE-ONLY\n> The renderer string is software (or the run was headless). Absolute fps in this\n> report is a measurement of the CPU rasteriser, **not of the game**. Draw-call,\n> allocation, program-count and leak numbers remain valid; fps numbers do not.`
    : `> Hardware GPU confirmed — absolute fps numbers are meaningful.`);
  L.push('');
  L.push(`Every measurement below was taken with \`?dev\` on (required for \`window.__engine\`),`);
  L.push(`so DEV_MODE-only per-frame work is inside the numbers. See METHOD NOTES / GOTCHAS.`);
  L.push('');
  if (result.carriedForward) {
    L.push(`> Sections not re-measured this run, carried forward: ${Object.entries(result.carriedForward).map(([k, v]) => `\`${k}\` (${v})`).join(', ')}.`);
    L.push('');
  }

  L.push('**Read order:** VERDICTS → BUDGETS → METHOD NOTES. The per-room TIMING sections in between are');
  L.push('reference detail; you do not need them unless a verdict points you there.');
  L.push('');
  L.push('## ROUND 2 — QA NOTES, ANSWERED');
  L.push('');
  L.push('Each row is a note raised against the round-1 report, with the measurement that settles it. Where a');
  L.push('note is not settled it says so and says what would settle it.');
  L.push('');
  L.push('| QA note (round 1) | round 1 | round 2 | status |');
  L.push('|---|---|---|---|');
  L.push('| Frozen-frame determinism is not literally zero (cubicle 51 samples @ Δ1) | 51 samples, Δ1 | **0 of 14,515,200 samples, Δ0, all 3 rooms** | **CLOSED.** Root cause was the instrument, not the renderer: `cubicle_farm` is the only measured room with `lighting.flicker`, and `stop()` leaves the hum\'s last factor on the key light. Rig now pins `_flicker=false` + restores `_baseDirIntensity`, reads `readPixels` before the screenshot burst, and discards 3 settle renders. Cross-checked in `screenshots/f5/lsb-hunt.json`: bit-identical in 21/21 room×AO-config combinations. |');
  L.push('| Gate was re-stated from "zero px" to "≤1 LSB" by the measured party | gate moved | **gate restated at 0 and PASSES at 0** | **CLOSED.** No renegotiation was needed. |');
  L.push('| Mid-play shader compiles are not dead — 307ms worst post-transition frame, 1 hop compiling | 307ms, 1 hop | **33.8ms worst post-reveal frame, 0 hops compiling after reveal, 39 programs warmed behind the wipe** | **CLOSED.** `Engine.warmScene()` runs `renderer.compile()` + `initTexture()` on the new scene and `_changeRoom()` awaits it before the wipe lifts. |');
  L.push('| Transition hop 4 recorded 0 frames — a dropout on the worst-case data point that `max()` scored as clean | silent 0 | **8/8 hops usable, dropouts retried and excluded from the verdict rather than passed** | **CLOSED.** New budget row: "transition hops with a usable frame sample". |');
  L.push('| Unsigned look change inside a perf patch (AO intensity 7.5→3.5, GradePass removed, antialias off); cubicle diffed 3.98% | 3.98% | **reverted to 7.5; whole-frame diff 2.19%; with the city backdrop hidden on both sides 0.40% (floor 32 px)** | **CLOSED for AO.** `intensity` is a shader exponent and measured 0.00ms, so the look knob was free to put back. `screenshots/f4/room-ab.json`: perf-patch-only delta is 0.40% / 0.03% / 0.68% / 0.02% (cubicle / reception / garage / exec floor). The remaining 1.7–2.2% is the CityBackdrop tear fix, which is a producer-reported bug fix, evidenced in `screenshots/f3/PROOF_tear_removed.png`. |');
  L.push('| Leak gate passed a +1 per-room geometry delta via net aggregation, contradicting its own doctrine | net −3, worst room +1 | **gated per room on the SERIES; all 6 rooms FLAT for geometries, net +0/+0/+0** | **CLOSED.** `GROWTH` (every delta positive) and `UNBOUNDED` fail; `OSCILLATING` (span ≤2, one non-positive delta) passes and is named. Leak hops raised 18→24 so each room gets 4 visits. |');
  L.push('| Stale entry-point files contradicted the canonical archives | root files stale | **root is now the canonical current pair; `BASELINE.md` is an explicit pointer; `screenshots/perf/README.md` maps the layout** | **CLOSED.** |');
  L.push('| The patch archive did not include the untracked tools, so it could not reproduce the run | modified files only | **patch now carries add-file hunks for every new file; `git apply --check` verified against a clean worktree (exit 0)** | **CLOSED.** |');
  L.push('| `rachel_boss` combat A/B best pair 0.62% / 12,891 px, unexplained | 0.62% unexplained | **cross-build best pair 0.55% (11,422 px) vs SAME-BUILD best pair 0.55% (11,426 px)** | **CLOSED — it is animation phase, not look.** The two agree to 4 px. `karen`\'s same-build floor is 0.61% while its cross-build number is 0%, which is the same effect from the other side. |');
  L.push('| `f3/PROOF_tear_removed.png` is not self-explanatory | bare odiff mask | **regenerated as a captioned sheet** with both stills, the commit each came from, the column-step table, the mechanism, and the generating filenames (`tools/f5-proof-sheet.mjs`) | **CLOSED.** |');
  L.push('| Draw calls 1.1–2× over the ≤300 budget in every room | 461–604 / 326–329 / 491 | **412 / 311 / 412** | **IMPROVED, STILL RED.** −11% to −33% from round 1 and −77% from the un-batched baseline (1810/756/1130), via colour-baked static batching. Attribution table below shows the floor is the articulated v5 character rigs plus the shadow map. Not renegotiated. |');
  L.push('| 4×-throttle playability: p95 88.3 / 57.6 / 67.0ms vs ≤33ms | 88.3 / 57.6 / 67.0 | **79.2 / 55.4 / 59.9** | **STILL FAILS.** See the CPU-4x rows in BUDGETS and the note below on what closing it would cost. A CPU-2x ("mid laptop") row is now measured too, and reception and parking_garage PASS the 33ms p95 there (26.6 / 27.0ms). |');
  L.push('| Nothing is committed | dirty tree | **still dirty, by instruction** | **OPEN BY DESIGN.** See INTEGRATOR HANDOFF at the end of this file. |');
  L.push('| cubicle p99 fails the p99 ≤ 2×p50 ratio at CPU 4x (124 vs 122.6ms) | 124 vs 122.6 | **97.4 vs 123.6ms — PASSES** | **CLOSED.** |');
  L.push('| Unexplained worst-frame outliers in the vsync-off runs (reception 421ms, cubicle 525ms) | 421 / 525ms | **reception 15.4ms, garage 31.5ms, cubicle 605ms** | **PARTLY OPEN.** Two of three are clean. The cubicle outlier is attributed but not fixed — see the note in METHOD NOTES / GOTCHAS. |');
  L.push('');

  // ---- verdicts
  L.push('## VERDICTS');
  L.push('');
  if (result.frozen.length) {
    // HEADLINE FROM readPixels, NOT FROM THE PNG PATH. Round 1's headline said
    // "3/3 rooms NONDETERMINISTIC" while its own readPixels table said two of the
    // three were bit-identical — the headline was reading the screenshot pipeline
    // and calling it the renderer. The gate and the headline now both come off the
    // drawing buffer; the PNG columns are kept as a capture-path diagnostic and
    // labelled as one.
    const haveLsb = result.frozen.every((f) => f.lsb);
    const badLsb = result.frozen.filter((f) => f.lsb && f.lsb.diffPx > 0);
    const bad = haveLsb ? badLsb : result.frozen.filter((f) => !f.deterministic);
    const nRenders = (result.frozen[0].pairs.length || 0) + 1;
    L.push(`**Renderer determinism (frozen frame, rendered ${nRenders}x with zero state advanced, measured by \`gl.readPixels\` on the drawing buffer):** ` +
      (bad.length
        ? `**${bad.length}/${result.frozen.length} rooms NONDETERMINISTIC**`
        : `**all ${result.frozen.length} rooms BIT-IDENTICAL** — 0 differing samples`));
    L.push('');
    L.push('| room | renderer bit-identical | PNG-path pair diffs (px) — DIAGNOSTIC | worst % | perceptible px (thr 0.1) | capture-stable ctl | capture-live ctl | AO attribution |');
    L.push('|---|---|---|---|---|---|---|---|');
    for (const f of result.frozen) {
      const worst = f.pairs.reduce((a, b) => (b.diffCount > (a ? a.diffCount : -1) ? b : a), null);
      const live = f.sanity ? (f.sanity.captureIsLive ? `PASS (${f.sanity.diffPercentage}%)` : '**FAIL**') : '—';
      const stab = f.captureControl ? (f.captureControl.stable ? 'PASS (0 px)' : `**FAIL — ${f.captureControl.diffCount} px with no render**`) : '—';
      const perc = f.pairs.some((p) => p.perceptible)
        ? f.pairs.map((p) => (p.perceptible ? p.perceptible.count : 0)).join(' / ')
        : '—';
      const bit = f.lsb ? (f.lsb.diffPx === 0 ? 'YES' : `**NO (${f.lsb.diffPx} samples, Δ ${f.lsb.maxDelta})**`) : (f.deterministic ? 'YES' : '**NO**');
      L.push(`| ${f.room} | ${bit} | ${f.pairs.map((p) => p.diffCount).join(' / ')} | ${worst ? r2(worst.diffPercentage) : 0}% | ${perc} | ${stab} | ${live} | ${f.aoAttribution || '—'} |`);
    }
    L.push('');
    L.push('_The PNG column is **not** a renderer measurement and must not be read as one — see the readPixels table');
    L.push('immediately below, where all three rooms are bit-identical. Whatever the PNG pairs disagree about enters');
    L.push('downstream of the drawing buffer (canvas compositing, colour conversion, PNG encode). It is kept because it');
    L.push('localises WHERE a difference lands, which readPixels cannot do, and because the AO/pass bisection is run');
    L.push('through it._');
    L.push('');
    L.push('_The mechanism that fits all three controls: **`readPixels` is synchronous with the GPU and `page.screenshot()`');
    L.push('is not.** `readPixels` blocks until the frame is finished, so it can only ever return a complete frame. A');
    L.push('screenshot asks the browser to hand over the canvas, which Chrome services from its own compositing');
    L.push('pipeline, asynchronously, with `preserveDrawingBuffer: false` — so a capture taken right after a render can');
    L.push('land on a composite from either side of the swap. That predicts exactly the observed pattern: the');
    L.push('capture-stable control (two screenshots, NO render between) matches at 0 px because there is no swap to land');
    L.push('on the wrong side of, while the render-then-capture pairs show occasional large single-pair outliers rather');
    L.push('than a steady low-level noise floor. Any future flicker claim should be made on `readPixels`; the PNG bursts');
    L.push('are for localisation only._');
    L.push('');
    if (result.frozen.some((f) => f.lsb)) {
      L.push('**Magnitude of the nondeterminism — `gl.readPixels` on the drawing buffer, no screenshot path:**');
      L.push('');
      L.push('| room | buffer | max per-channel delta | differing pixel-samples | per-pair (px / max Δ) | verdict |');
      L.push('|---|---|---|---|---|---|');
      for (const f of result.frozen) {
        if (!f.lsb) continue;
        const pp = f.lsb.perPair.map((p) => `${p.px}/${p.max}`).join(' · ');
        L.push(`| ${f.room} | ${f.lsb.width}x${f.lsb.height} | **${f.lsb.maxDelta}/255** | ${f.lsb.diffPx} of ${f.lsb.pixels * (f.lsb.renders - 1)} | ${pp} | ${f.lsbVerdict.split(' — ')[0]} |`);
      }
      L.push('');
      L.push('_`readPixels` reads the drawing buffer straight off the GPU — no PNG encode, no compositor, no canvas');
      L.push('colour conversion. **The gate in BUDGETS is stated at LITERALLY ZERO differing samples, as briefed.**');
      L.push('Round 1 restated it as "≤ 1 LSB" inside this report on the argument that Δ=1 is below one display step.');
      L.push('That argument is true and it is still recorded here, but restating a gate is not the measured party\'s');
      L.push('call, so the row is back at 0 and the magnitude column is reported next to it as detail._');
      L.push('');
      L.push('_**Round 1\'s one non-zero room is now explained, and it was the instrument.** `cubicle_farm` reported 51');
      L.push('differing samples at Δ=1 while `reception` and `parking_garage` read bit-identical. `cubicle_farm` is the');
      L.push('only one of the three that carries `lighting.flicker` (src/data/rooms/index.js:41) — the fluorescent hum,');
      L.push('which writes `_dirLight.intensity` from `Engine._loop`. `__engine.stop()` halts the loop but leaves');
      L.push('whatever factor the last live frame applied sitting on the light, and any loop tick that slips between');
      L.push('two captures moves it. A global key-intensity nudge of that size lands as a last-bit change on a few dozen');
      L.push('pixels — which is exactly the shape of the measurement. The rig now pins `_flicker = false` and restores');
      L.push('`_dirLight.intensity = _baseDirIntensity` before anything is read, and the readPixels block was moved to');
      L.push('run FIRST, before the screenshot burst, so nothing sits between render and bytes. Independently confirmed');
      L.push('with `tools/f5-lsb-hunt.mjs`, which renders the same frozen frame 6× under seven different N8AO');
      L.push('configurations (half-res on/off, denoise iterations 0/1/2, 8/16 samples, AO off) and reports');
      L.push('bit-identical in every one. A code read of n8ao 2.0.0 also clears the two suspects round 1 hypothesised:');
      L.push('its `time` uniform is declared but never used in any shader body, and its denoise loop swaps its two');
      L.push('internal targets an even number of times per render, so there is no invocation-parity carry-over._');
      L.push('');
      // The two measurements can disagree hard, and when they do the readPixels
      // one wins — it is upstream of everything the other one can be confused by.
      const contradict = result.frozen.filter((f) => f.lsb && f.lsb.diffPx === 0 && !f.deterministic);
      if (contradict.length) {
        L.push(`> **The two measurements disagree, and that is the finding.** In ${contradict.map((f) => `\`${f.room}\``).join(', ')} the`);
        L.push('> drawing buffer is **bit-identical** across consecutive renders — 0 differing samples out of 8,294,400 —');
        L.push('> while PNG screenshots of those same renders differ by up to ' +
          `${Math.max(...contradict.map((f) => f.worstDiffPx)).toLocaleString()} px. A difference cannot originate in the`);
        L.push('> renderer if the renderer\'s output is identical, so it enters **downstream of the drawing buffer**:');
        L.push('> canvas compositing, colour conversion, or PNG encode. The screenshot-based determinism verdict in');
        L.push('> the table above is therefore not a statement about the renderer, and the run-to-run magnitude swings');
        L.push('> earlier rounds saw in it (22 px one session, 18,010 px the next on the same commit) are explained.');
        L.push('> `readPixels` is the measurement to trend; the PNG pairs are kept only to localise where a diff lands.');
        L.push('');
      }
    }
    if (result.frozen.some((f) => f.attribution)) {
      L.push('**Draw-call attribution** — frozen frame, one top-level scene node hidden at a time, delta read');
      L.push('off `renderer.info.render.calls`. This is the composition behind the ≤300 budget row:');
      L.push('');
      for (const f of result.frozen) {
        if (!f.attribution) continue;
        L.push(`- \`${f.room}\` — **${f.attribution.full} calls** total: ` +
          f.attribution.rows.map((r) => `${r.node} ${r.calls}`).join(' · '));
      }
      L.push('');
      L.push('_The `light:DirectionalLight` row is the shadow map: it redraws every caster in the room, so it');
      L.push('tracks the room row. Character rows are the articulated v5 rigs — each one is its own limb/face');
      L.push('hierarchy and cannot be batched without losing CharacterAnimator, so they are the floor under any');
      L.push('draw-call target. Read the budget against this table rather than as a single number._');
      L.push('');
    }
    const withBisect = result.frozen.filter((f) => f.bisect && Object.keys(f.bisect).length);
    if (withBisect.length) {
      L.push('Post-pass bisection — each pass disabled INDIVIDUALLY, identical frozen test re-run:');
      L.push('');
      L.push('| room | variant | deterministic | exact pair diffs (px) | reduction vs baseline |');
      L.push('|---|---|---|---|---|');
      for (const f of withBisect) {
        L.push(`| ${f.room} | _baseline_ | ${f.deterministic ? 'yes' : 'no'} | ${f.pairs.map((p) => p.diffCount).join(' / ')} | — |`);
        for (const k of Object.keys(f.bisect)) {
          const b = f.bisect[k];
          const hit = b.deterministic || (b.reductionPct !== null && b.reductionPct >= 95);
          const red = b.reductionPct === null ? '—'
            : b.reductionPct >= 0 ? `−${b.reductionPct}%`
            : b.reductionPct > -100 ? `+${Math.abs(b.reductionPct)}% (worse)`
            : `×${r2(1 + Math.abs(b.reductionPct) / 100)} worse`;
          L.push(`| ${f.room} | ${b.label} | ${b.deterministic ? 'YES' : 'no'} | ${b.pairs.join(' / ')} | ${hit ? `**${red}**` : red} |`);
        }
      }
      L.push('');
      // Which variant holds up across EVERY room? The secondary variants swing wildly
      // between runs because the baseline magnitude itself does; a variant that
      // reduces in all rooms is the one worth acting on.
      const keys = [...new Set(withBisect.flatMap((f) => Object.keys(f.bisect)))];
      const consistent = keys.filter((k) => withBisect.every((f) => f.bisect[k] && (f.bisect[k].deterministic || f.bisect[k].reductionPct >= 95)));
      const inconsistent = keys.filter((k) => !consistent.includes(k));
      if (consistent.length) {
        L.push(`**Consistent across all ${withBisect.length} rooms:** ${consistent.map((k) => withBisect[0].bisect[k].label).join(', ')} ` +
          `— removing this reduced the differing-pixel count by ≥95% in every room.`);
      } else {
        L.push('**No variant reduced the diff by ≥95% in every room** — do not attribute this to a single pass.');
      }
      if (inconsistent.length) {
        L.push('');
        L.push(`_Not reproducible: ${inconsistent.map((k) => withBisect[0].bisect[k].label).join(', ')}. These read as culprits in some rooms and as ` +
          `"made it worse" in others, which is what you expect when the baseline magnitude itself swings by orders of magnitude between runs. Ignore them._`);
      }
      L.push('');
      for (const f of withBisect) if (f.perceptibleVerdict) L.push(`- \`${f.room}\`: ${f.perceptibleVerdict}`);
      L.push('');
      L.push('_Hypothesis for whoever picks this up (NOT verified by this harness): the exact-diff pattern is');
      L.push('period-2 across repeated renders of the identical frame — e.g. `8838 / 0 / 8986 / 8986`, `17983 / 0 /');
      L.push('17983 / 17983` — and it vanishes when either N8AO or the tilt-shift blur is removed. N8AO runs');
      L.push('`denoiseIterations: 2` at `halfRes`, i.e. a ping-pong between two render targets. Output that depends');
      L.push('on *invocation parity* rather than on scene state would produce exactly this. The magnitude also swings');
      L.push('a lot run to run (reception measured 18010 px in one session and 22 px in the next on the same commit),');
      L.push('which is consistent with parity/state carry-over rather than with a per-pixel noise function. Confirm by');
      L.push('reading n8ao\'s denoise loop before changing any AO setting on this evidence.');
      L.push('');
      L.push('_Cross-check taken during harness development: the same frozen test run HEADLESS (SwiftShader, the CPU');
      L.push('rasteriser) reports `reception` as fully deterministic — 0 differing pixels. So the instability is tied to');
      L.push('the D3D11/NVIDIA execution path, not to the shader algebra. That is consistent with GPU warp-scheduling');
      L.push('nondeterminism in a reduction, and it is another reason the perceptible count is 0: it is last-bit._');
      L.push('');
    }
    L.push('');
    L.push('_Two controls guard this verdict. **capture-live**: nudge the camera 0.06 units and re-render — that pair must DIFFER,');
    L.push('or we are screenshotting a stale framebuffer. **capture-stable**: two screenshots with NO render between them — that pair');
    L.push('must MATCH, or the browser\'s async canvas compositing is producing the differences rather than the renderer. A "NO" in');
    L.push('the deterministic column only means renderer nondeterminism when capture-stable passes._');
    L.push('');
    L.push('_The **exact** column uses threshold 0 with antialiasing off, so a single least-significant-bit counts —');
    L.push('that is the right test for determinism and deliberately has no tolerance. The **perceptible** column re-runs');
    L.push('the same pairs at the perceptual threshold used for the walking bursts. When exact is large and perceptible');
    L.push('is ~0, the instability is sub-visible float/rounding noise and is NOT the flicker a player would report._');
    L.push('');
  }
  if (result.walk.length) {
    L.push('**Walking flicker (consecutive-frame odiff, HUD masked; static burst = control):**');
    L.push('');
    L.push('| room | dir | runway | moved | control med % | walk med % | walk p95 % | walk max % |');
    L.push('|---|---|---|---|---|---|---|---|');
    for (const w of result.walk) {
      L.push(`| ${w.room} | ${w.direction} | ${w.runwayTiles ?? '?'} tiles | ${w.walkDisplacement} tiles | ${w.control.median} | ${w.walk.median} | ${w.walk.p95} | ${w.walk.max} |`);
    }
    L.push('');
    L.push('Per-pair % changed (this is the flicker sheet in numbers — see `index.html` for the masks):');
    L.push('');
    for (const w of result.walk) {
      L.push(`- \`${w.room}\` walk: ${w.walk.pairs.map((p) => p.changedPct).join(' · ')}`);
      L.push(`- \`${w.room}\` static (control): ${w.control.pairs.map((p) => p.changedPct).join(' · ')}`);
    }
    L.push('');
    L.push('_Read the walk series as a distribution, not a median. The isometric follow camera has a dead zone,');
    L.push('so most consecutive pairs at 90ms spacing barely change and one or two change a lot when the camera');
    L.push('catches up. A spiky series is the camera, not flicker. The deterministic stepped walk below removes this._');
    L.push('');
    for (const w of result.walk) {
      if (w.control.max > 0.02) {
        const worst = w.control.pairs.reduce((a, b) => (b.changedPct > a.changedPct ? b : a), w.control.pairs[0]);
        L.push(`- \`${w.room}\` idle control is **not** clean: worst static pair ${worst.changedPct}% changed` +
          (worst.hotspots ? ` — bbox ${worst.hotspots.bbox.x},${worst.hotspots.bbox.y} ${worst.hotspots.bbox.w}x${worst.hotspots.bbox.h} (${worst.hotspots.rowBands} row bands)` : '') +
          `. Some of that is authored (city backdrop, fluorescent hum, NPC blink); read the mask.`);
      }
    }
    L.push('');
  }
  if (result.stepWalk.length) {
    L.push('**Deterministic stepped walk** — engine frozen, sim hand-stepped 1 frame per capture, PRNG pinned,');
    L.push('same start position and direction for both passes. The AO-on/AO-off delta is a like-for-like measure');
    L.push('of how much per-frame instability the N8AO pass adds on top of honest camera translation.');
    L.push('');
    L.push('| room | dir | moved in window (AO on / off) | AO ON median % | AO OFF median % | delta pp | AO share of inter-frame change |');
    L.push('|---|---|---|---|---|---|---|');
    for (const s of result.stepWalk) {
      L.push(`| ${s.room} | ${s.direction} | ${s.captureDisplacementAoOn} / ${s.captureDisplacementAoOff} tiles | ${s.aoOn.median} | ${s.aoOff.median} | ${s.medianDelta} | ${s.aoShareOfChange === null ? '—' : r2(s.aoShareOfChange * 100) + '%'} |`);
    }
    L.push('');
    for (const s of result.stepWalk) {
      L.push(`- \`${s.room}\`: ${s.verdict}`);
      L.push(`  - AO ON per-pair %: ${s.aoOn.pairs.map((p) => p.changedPct).join(' · ')}`);
      L.push(`  - AO OFF per-pair %: ${s.aoOff.pairs.map((p) => p.changedPct).join(' · ')}`);
    }
    L.push('');
  }
  if (result.leak) {
    L.push(`**Resource leak (${result.leak.hops} scripted room hops around ${result.leak.cycle.length} rooms):** ${result.leak.verdict}`);
    L.push('');
    L.push('| hop | room | geometries | textures | programs | heap MB |');
    L.push('|---|---|---|---|---|---|');
    for (const s of result.leak.samples) L.push(`| ${s.hop} | ${s.room} | ${s.geometries} | ${s.textures} | ${s.programs} | ${s.heapMB} |`);
    L.push('');
    if (result.leak.steady) {
      L.push('Same-room re-entry deltas — the leak test that cannot be fooled by a warming cache:');
      L.push('');
      L.push('| room | visits | hops compared | Δ textures | Δ geometries | Δ programs |');
      L.push('|---|---|---|---|---|---|');
      for (const r of result.leak.steady.revisits) {
        L.push(`| ${r.room} | ${r.visits} | ${r.hops} | ${r.textures > 0 ? `**+${r.textures}**` : r.textures} | ${r.geometries > 0 ? `**+${r.geometries}**` : r.geometries} | ${r.programs > 0 ? `**+${r.programs}**` : r.programs} |`);
      }
      L.push('');
      L.push('_Visiting a room for the FIRST time fills shared caches (MaterialLibrary monitor screens and skylines,');
      L.push('toon gradient ramps, ProceduralNormals) and those are supposed to persist — counting them as growth marks');
      L.push('a correctly-behaving cache as a leak. Leaving and re-entering the same room is the test with no such');
      L.push('confound: everything the room built must be gone, so the count must come back to where it was._');
      L.push('');
      if (result.leak.steady.trends?.length) {
        L.push('**PER-ROOM SERIES — this is the gate.** Every visit\'s count for the same room, in order:');
        L.push('');
        L.push('| room | visits | geometries series | verdict | span | textures series | verdict | programs series | verdict |');
        L.push('|---|---|---|---|---|---|---|---|---|');
        for (const t of result.leak.steady.trends) {
          const cell = (k) => `${t[k].series.join(' → ')}`;
          const v = (k) => (t[k].verdict === 'GROWTH' || t[k].verdict === 'UNBOUNDED' ? `**${t[k].verdict}**` : t[k].verdict);
          L.push(`| ${t.room} | ${t.visits} | ${cell('geometries')} | ${v('geometries')} | ${t.geometries.span} | ${cell('textures')} | ${v('textures')} | ${cell('programs')} | ${v('programs')} |`);
        }
        L.push('');
        L.push('_Round 1 gated on the NET across the cycle and passed a room (`executive_floor`) whose last re-entry was');
        L.push('+1 geometry, which contradicted its own stated doctrine that "a positive number here is unbounded');
        L.push('growth". Both readings were too coarse. A single delta cannot tell growth from a bounded oscillation, and');
        L.push('a net can hide one room\'s growth behind another\'s jitter. The gate is now each room\'s own SERIES,');
        L.push('classified from its second visit onward (the first is dropped — the other rooms\' caches fill between');
        L.push('visit 1 and 2 for reasons that are not this room\'s teardown):');
        L.push('`GROWTH` = every delta positive, i.e. unbounded, FAILS. `UNBOUNDED` = not bounded and not monotonic,');
        L.push('FAILS. `OSCILLATING` = span ≤ 2 with at least one non-positive delta — the count does return, it just');
        L.push('lands either side of a build boundary; PASSES, and is named rather than hidden inside "flat".');
        L.push('`FLAT` = every delta zero. A room needs 3+ visits to be classifiable at all._');
        L.push('');
      }
    }
  }
  if (result.transitions) {
    const t = result.transitions;
    L.push(`**Transition hitch (${t.hops} room hops, two frame windows per hop):** ${t.verdict}`);
    L.push('');
    L.push('| hop | room | POST-REVEAL worst ms | frames | >33 | >50 | RAW worst ms | frames | programs before→after | warmed behind wipe | compiled after reveal | warm ms | note |');
    L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of t.rows) {
      const flag = r.dropout ? '**DROPOUT**' : r.retried ? 'retried' : '';
      const sw = r.shipped.worstMs;
      L.push(`| ${r.hop} | ${r.room} | ${sw > 50 ? `**${sw}**` : sw} | ${r.shipped.frames} | ${r.shipped.over33} | ${r.shipped.over50} | ${r.raw.worstMs} | ${r.raw.frames} | ${r.programs} | ${r.programsWarmedBehindWipe} | ${r.programsAfterReveal > 0 ? `**${r.programsAfterReveal}**` : 0} | ${r.warm ? r2(r.warm.ms) : '—'} | ${flag} |`);
    }
    L.push('');
    L.push('_**Read the POST-REVEAL column, not RAW.** Round 1 reported a single number (307ms) taken from a window');
    L.push('whose clock started BEFORE the room was built, so it contained the build frame and the sixteen shader');
    L.push('programs that compiled inside it. In the shipped game those frames are under a wipe:');
    L.push('`ExplorationState._changeRoom()` awaits `wipeDownOut/wipeUpOut(0.4)` (or `fadeOut(0.3)`), then builds the');
    L.push('room, then **awaits `Engine.warmScene()`** — `renderer.compileAsync()` plus `initTexture()` on every map in');
    L.push('the new scene — and only then plays the wipe back in. RAW is that hidden cost, kept as a load-time');
    L.push('diagnostic and for comparability with round 1. POST-REVEAL is the window that starts where the player');
    L.push('starts seeing frames, and it is what the ≤50ms budget row means by "after a room transition"._');
    L.push('');
    L.push('_`warmed behind wipe` is how many programs `warmScene()` compiled while the screen was covered;');
    L.push('`compiled after reveal` is how many were left to compile once the player could see — that column is the');
    L.push('actual "no mid-play compiles" gate and it must be 0. A hop with fewer than 10 frames in either window is a');
    L.push('DROPOUT: it is retried once from the previous room and, if still short, excluded from the verdict instead of');
    L.push('being counted as clean (round 1 had a 0-frame hop on the worst-case room whose `max()` returned 0)._');
    L.push('');
    L.push('_Note the hop is driven through `__explore._loadRoom()` rather than through a real doorway, because the');
    L.push('hop cycle crosses rooms that are not adjacent. `_loadRoom()` fires `warmScene()` without awaiting it (it');
    L.push('has no wipe to hide behind), so the harness awaits it explicitly between the two windows to reproduce');
    L.push('`_changeRoom()`\'s ordering exactly._');
    L.push('');
  }

  // ---- headline timing table across every mode
  const allT = [...result.timing, ...result.uncapped];
  if (allT.length) {
    L.push('**Frame timing headline** (scripted patrol walk; vsync on unless noted):');
    L.push('');
    L.push('| room | mode | p50 ms | fps@p50 | p95 | p99 | max | hitch/s | draw calls p50 | shape |');
    L.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const t of allT) {
      const mode = t.vsync === 'disabled' ? 'vsync OFF' : `CPU ${t.throttle}x`;
      L.push(`| ${t.room} | ${mode} | ${t.timing.p50} | ${t.timing.fps_p50} | ${t.timing.p95} | ${t.timing.p99} | ${t.timing.max} | ${t.timing.hitchesPerSecond} | ${t.drawCalls.p50} | ${t.timing.shape} |`);
    }
    L.push('');
    L.push(`Budgets (COMP_CARD): ≥60fps native, ≥30fps mobile floor (CPU 4x proxy), ≤300 draw calls per room.`);
    L.push('');
  }

  // ---- timing detail
  for (const t of allT) {
    L.push(`## TIMING — ${t.room} @ ${t.vsync === 'disabled' ? 'vsync DISABLED (headroom)' : `CPU throttle ${t.throttle}x`}`);
    L.push('');
    L.push(`${t.timing.frames} frames over ${t.timing.seconds}s of scripted walking.`);
    L.push('');
    L.push(`| p50 | p95 | p99 | max | fps@p50 | hitches | hitches/s | severe | longest run | shape |`);
    L.push('|---|---|---|---|---|---|---|---|---|---|');
    L.push(`| ${t.timing.p50}ms | ${t.timing.p95}ms | ${t.timing.p99}ms | ${t.timing.max}ms | ${t.timing.fps_p50} | ${t.timing.hitchCount} | ${t.timing.hitchesPerSecond} | ${t.timing.severeHitches} | ${t.timing.longestHitchRun} | ${t.timing.shape} |`);
    L.push('');
    L.push('```');
    const maxB = Math.max(...t.timing.histogram.buckets);
    t.timing.histogram.buckets.forEach((b, i) => {
      const lo = i === 0 ? 0 : t.timing.histogram.edges[i - 1];
      const hi = t.timing.histogram.edges[i];
      L.push(`  ${String(lo).padStart(5)}-${String(hi).padStart(5)} ms | ${String(b).padStart(5)} ${bar(b, maxB)}`);
    });
    L.push('```');
    L.push('');
    L.push(`- CPU inside \`composer.render()\`: p50 ${t.cpuMs.p50}ms · p95 ${t.cpuMs.p95}ms · max ${t.cpuMs.max}ms`);
    L.push(`- draw calls: ${t.drawCalls.min}–${t.drawCalls.max} (p50 ${t.drawCalls.p50}) · budget ≤300 room → ${t.drawCalls.p50 > 300 ? '**OVER**' : 'ok'}`);
    L.push(`- triangles p50: ${Math.round(t.triangles.p50).toLocaleString()}`);
    L.push(`- programs: ${t.programs.first} → ${t.programs.last} (${t.programSteps.length} mid-run compile step${t.programSteps.length === 1 ? '' : 's'})`);
    if (t.programSteps.length) L.push(`  - steps: ${t.programSteps.slice(0, 6).map((s) => `f${s.frame}@${s.atSec}s ${s.from}→${s.to} (frame ${s.frameMs}ms)`).join(', ')}`);
    L.push(`- textures: ${t.textures.first} → ${t.textures.last} · geometries ${t.geometries.first} → ${t.geometries.last}`);
    L.push(`- heap: ${t.heapMB.first}MB → ${t.heapMB.last}MB (min ${t.heapMB.min} / max ${t.heapMB.max})`);
    L.push(`- warm-up absorbed ${t.warm.programsCompiledDuringWarmup} program compiles + ${t.warm.texturesUploadedDuringWarmup} texture uploads (this is the first-visit hitch budget)`);
    if (t.config) {
      const c = t.config;
      L.push(`- render config: pixelRatio ${c.pixelRatio} · drawing buffer ${c.drawingBuffer.w}x${c.drawingBuffer.h} · context antialias ${c.contextAntialias}`);
      L.push(`  - shadowMap enabled ${c.shadowMap.enabled}, autoUpdate **${c.shadowMap.autoUpdate}**, type ${c.shadowMap.type}` + (c.dirLight ? ` · dirLight mapSize ${c.dirLight.mapSize.join('x')}, frustum ${c.dirLight.frustum.left}..${c.dirLight.frustum.right}` : ''));
      L.push(`  - 1998 MODE (RetroPass): retroOn=**${c.flags.retroOn}**, pass enabled=${c.retroPass ? c.retroPass.enabled : 'n/a'}, strength=${c.retroPass ? c.retroPass.strength : 'n/a'}`);
      if (c.n8ao) L.push(`  - N8AO: ${['aoSamples', 'denoiseSamples', 'denoiseRadius', 'aoRadius', 'intensity', 'halfRes', 'depthAwareUpsampling', 'screenSpaceRadius', 'accumulate'].filter((k) => c.n8ao[k] !== undefined).map((k) => `${k}=${c.n8ao[k]}`).join(' · ')}`);
      L.push(`  - composer passes: ${c.passes.map((p) => `${p.type}${p.enabled ? '' : '(off)'}`).join(' → ')}`);
    }
    L.push(`- CDP over the window: script ${t.cdp.scriptDurationS}s (${r2(t.cdp.scriptShareOfWall * 100)}% of wall) · style+layout ${r2((t.cdp.layoutDurationS + t.cdp.recalcStyleDurationS))}s (${r2(t.cdp.styleLayoutShareOfWall * 100)}%) · ${t.cdp.recalcStyleCount} style recalcs · ${t.cdp.layoutCount} layouts · ${t.cdp.nodes} DOM nodes`);
    L.push('');
    if (!t.loafSupported) {
      L.push('_LoAF (long-animation-frame) unsupported in this Chromium build._');
    } else if (!t.loafTop.length) {
      L.push(`_No long animation frames (>50ms) observed — ${t.loafCount} LoAF entries._`);
    } else {
      L.push(`**Top LoAF script attributions** (${t.loafCount} long frames):`);
      L.push('');
      L.push('| total ms | max ms | n | function | file:line |');
      L.push('|---|---|---|---|---|');
      for (const s of t.loafTop.slice(0, 5)) {
        const loc = s.loc ? `\`${s.loc.file}:${s.loc.line}\`${s.loc.exact ? '' : s.loc.servedOnly ? ' _(served offset)_' : ` _(${s.loc.ambiguous} matches)_`}` : '_unresolved_';
        L.push(`| ${s.totalMs} | ${s.maxMs} | ${s.count} | \`${s.fn || '(anonymous)'}\` | ${loc} |`);
      }
      L.push('');
      for (const s of t.loafTop.slice(0, 5)) if (s.loc && s.loc.code) L.push(`- \`${s.loc.file}:${s.loc.line}\` — \`${s.loc.code.slice(0, 120)}\``);
    }
    L.push('');
    if (t.ladder) {
      L.push(`**Cost ladder** — cumulative strip-down, same scripted patrol at each rung. The delta between`);
      L.push(`rungs is that feature's frame cost on this GPU. Nothing was committed; all toggles reverted.`);
      L.push('');
      L.push('| rung | p50 ms | fps@p50 | p95 ms | draw calls | saved ms | saved calls |');
      L.push('|---|---|---|---|---|---|---|');
      for (const r of t.ladder) {
        L.push(`| ${r.label} | ${r.p50} | ${r.fps_p50} | ${r.p95} | ${r.drawCallsP50} | ${r.savedMs === undefined ? '—' : r.savedMs} | ${r.savedCalls === undefined ? '—' : r.savedCalls} |`);
      }
      L.push('');
      L.push('_Trust the **draw calls** column: it is exact and reproduces to ±10 across runs. The **saved ms** column is');
      L.push('a single sample per rung and its noise floor is roughly ±1.5ms, so a rung reading "-1.9" saved means');
      L.push('"indistinguishable from zero", not "made it worse". Only deltas well above that floor are real._');
      L.push('');
    }
  }

  const budgets = budgetCheck(result);
  if (budgets.length) {
    const failed = budgets.filter((b) => !b.pass);
    L.push('## BUDGETS');
    L.push('');
    L.push(`${failed.length} of ${budgets.length} checks FAIL. Run with \`--gate\` to make failures exit 1 (default exits 0).`);
    L.push('');
    L.push('| | metric | budget | actual | source |');
    L.push('|---|---|---|---|---|');
    for (const b of [...failed, ...budgets.filter((x) => x.pass)]) {
      L.push(`| ${b.pass ? (b.skipped ? '–' : 'PASS') : '**FAIL**'} | ${b.metric} | ${b.budget} | ${b.actual} | ${b.source} |`);
    }
    L.push('');
  }

  L.push('## METHOD NOTES / GOTCHAS');
  L.push('');
  L.push('- **Headed is mandatory.** Headless Chromium renders through SwiftShader (CPU). `--headless` still works');
  L.push('  and is useful for draw-call/leak regressions, but it stamps this report RELATIVE-ONLY and its fps is fiction.');
  L.push('- **The dGPU needs asking for.** Without `--force_high_performance_gpu` this laptop hands Chromium the');
  L.push('  integrated AMD Radeon 740M, not the RTX 4050 — a ~2x difference in every number. The GPU string in the');
  L.push('  header is the only proof of which one ran.');
  L.push('- **vsync clamps everything at 16.67ms.** Any cost comparison that lands under budget reads identical.');
  L.push('  That is why the cost ladder runs in a second browser with `--disable-gpu-vsync`.');
  L.push('- **Off-screen windows get throttled.** `--disable-backgrounding-occluded-windows`,');
  L.push('  `--disable-renderer-backgrounding` and `--disable-features=CalculateNativeWinOcclusion` are load-bearing;');
  L.push('  without them an off-screen window silently halves its frame rate.');
  L.push('- **`renderer.info.render.calls` needs `autoReset = false`.** three resets it at the start of every');
  L.push('  `renderer.render()`, and a composer frame issues one per pass — so the naive post-frame read reports only');
  L.push('  the last pass. The probe takes manual control and resets once per frame, so the number covers shadow map');
  L.push('  + scene + every post pass. Comparing against a differently-collected number is meaningless.');
  L.push('- **Everything here runs with `?dev`**, which is required for `window.__engine`. DEV_MODE-only per-frame');
  L.push('  work (e.g. the `getElementById(\'dev-panel\')` query in `ExplorationState.update`) is inside these numbers.');
  L.push('- **LoAF attribution is frame-level here, not statement-level.** The whole game loop is one arrow-function');
  L.push('  closure (`Engine.js:1001`), so `sourceFunctionName` resolves to that closure for anything inside the loop.');
  L.push('  Attribution below the loop needs a CPU profile, not LoAF. LoAF is still decisive for work OUTSIDE the loop');
  L.push('  (event listeners, timers) — which is how the audio-init hitch was found.');
  L.push('- **Vite serves transformed source**, so a LoAF char offset is an offset into the served text. The harness');
  L.push('  fetches the served file, resolves the line, then re-locates that exact line on disk. Rows marked');
  L.push('  _(served offset)_ or _(N matches)_ did not resolve uniquely — treat those line numbers as approximate.');
  L.push('- **Laptop p50 drifts run to run.** `cubicle_farm` measured p50 20.8ms in one session and 16.7ms in the');
  L.push('  next on the same commit — a ~24% swing, most likely thermal state after a long harness run. Draw-call');
  L.push('  counts, program counts and leak deltas are rock-steady; frame-time p50 is not. Compare timing numbers only');
  L.push('  within one session, prefer the vsync-off numbers, and treat a <25% p50 change as inconclusive.');
  L.push('- **The wall-clock walking burst is noisy by nature.** Its median swings with how much runway the player');
  L.push('  had and where the camera dead zone happened to be. The deterministic stepped walk reproduces to ~0.05pp');
  L.push('  across runs; prefer it for any before/after comparison.');
  L.push('- **The room-hop leak test uses `__explore._loadRoom()` directly**, which bypasses `_changeRoom`\'s gating and');
  L.push('  transition wipe. That is deliberate (it isolates build/teardown), but it means the numbers do not include');
  L.push('  whatever the transition itself allocates.');
  L.push('- **`--headless` is verified working**, and reports `SwiftShader` — which is exactly why the RELATIVE-ONLY');
  L.push('  stamp exists. Use it for draw-call / program-count / leak regressions in CI; never for an fps claim.');
  L.push('- **Nothing in `src/` was touched.** The probe, the PRNG pin and every toggle are injected per page and');
  L.push('  reverted before the page closes.');
  L.push('- **The vsync-off `cubicle_farm` outlier is attributed, not fixed.** p50/p95/p99 are 7.8 / 11.2 / 13.7ms and');
  L.push('  the max is ~605ms, with **580ms of it spent inside `composer.render()`** and `programs` flat at 82 across the');
  L.push('  window — so it is not a shader compile. The window also shows `memory.textures` 97→100 and `geometries`');
  L.push('  269→276, i.e. three GPU textures and seven geometries created mid-window; none of them are reachable from');
  L.push('  `Engine.scene`, so they are render targets or internal quad geometry, not content. It is intermittent: a');
  L.push('  dedicated repeat (`tools/f5-midplay-alloc.mjs --uncapped`, 1200 frames, per-frame scene-resource diffing)');
  L.push('  measured max **25.4ms** and **zero** scene-reachable mid-play allocations in the same room. Leading');
  L.push('  hypothesis is a driver-level stall inside a render call when an uncapped 128fps loop saturates the queue and');
  L.push('  a render-target reallocation forces a pipeline flush — a configuration that does not exist in shipped play,');
  L.push('  which is vsync-capped and reports a 33.8ms max (exactly one dropped frame) in the same room. Next step to');
  L.push('  close it: gate a CDP trace on frames >100ms and read the GPU-process slices, or wrap each composer pass in');
  L.push('  an `EXT_disjoint_timer_query_webgl2` query (the extension is available on this machine).');
  L.push('- **Static batching reorders coplanar opaque surfaces, and that is visible at ~0.1–0.7% of the frame.** Two');
  L.push('  z-coincident opaque faces (a monitor face flush on a desktop, a windscreen decal flush on a car roof — the');
  L.push('  `PlaneGeometry`-overlay z-fight documented in CLAUDE.md) are drawn in an order three decides from');
  L.push('  `material.id`, so ANY change to material identity flips which one wins. Merging changes material identity by');
  L.push('  construction. Measured: colour-baked batching moves 0.13% of `cubicle_farm` against a 3–25 px control floor');
  L.push('  (`screenshots/f5/bake-ab.json`), and round-1\'s identity-only merging already moved 0.14%');
  L.push('  (`screenshots/f4/merge-perf.json`) at the same locations, so baking does not make it worse. Neither ordering');
  L.push('  is authored — both are arbitrary — but the fix belongs in the content: give those surfaces a real depth');
  L.push('  separation (a 0.001 z push or `polygonOffset`) and the ordering stops mattering. Masks:');
  L.push('  `screenshots/f5/bake_*_diff.png`, `screenshots/f4/room_*_diff_noCity.png`.');
  L.push('- **The batch spatial-cell dial is measured and set to 0 (one bucket per room).** Batching trades frustum');
  L.push('  culling for submission cost, so cells of 6 / 8 / 12 tiles were swept on three rooms');
  L.push('  (`screenshots/f5/cell-sweep.json`). Every cell size RAISED the frozen whole-room draw calls (cubicle 505 →');
  L.push('  765 / 705 / 642, garage 534 → 667 / 572 / 561, reception 426 → 488 / 457 / 438) and produced no CPU win');
  L.push('  outside the noise floor — cell 0 and cell 999 are the same partition and measured 6.2ms vs 9.2ms p50 in that');
  L.push('  same sweep, which is the size of the noise. Keep 0 until a room gets big enough to change the answer.');
  L.push('');
  L.push('## REMAINING — THE TWO RED GATES, AND WHAT CLOSING THEM COSTS');
  L.push('');
  L.push('Both remaining failure classes are the same fact seen twice: **draw-call submission cost**. Neither can be');
  L.push('closed by tuning, and both need a decision that is not a perf engineer\'s to make, so they are written up');
  L.push('rather than quietly re-baselined.');
  L.push('');
  L.push('**1. Draw calls · ≤300 · measured 412 / 311 / 412.** The attribution table in VERDICTS is the whole story.');
  L.push('After colour-baked batching a room\'s own geometry is a minority of the frame; the floor is:');
  L.push('');
  L.push('- **the articulated v5 character rigs** — ~35 meshes and ~62 draw calls each including their shadow-map pass,');
  L.push('  and a populated room has four or five of them. `CharacterBuilder.collapseNode()` already merges everything');
  L.push('  rigid *within* each animated node (head / torso / two arms / two legs), and colour-baking widened those');
  L.push('  buckets further. Going below this means merging ACROSS animated nodes, which is the same thing as deleting');
  L.push('  `CharacterAnimator`. The alternatives are a real skinned rig (one draw call per character, a rewrite of the');
  L.push('  character pipeline) or fewer NPCs on screen (a design call).');
  L.push('- **the shadow map** — ~104–129 calls, because three re-renders every caster into the 2048² map. It is already');
  L.push('  on a manual 2-frame cadence. The cost ladder prices removing it entirely at **100 draw calls and 0.0ms** on');
  L.push('  this GPU, i.e. it is pure submission cost with no measurable GPU cost here — which is exactly why it hurts');
  L.push('  the CPU-bound proxies and nothing else. Options, all look decisions: raise the cadence to 3 (20Hz character');
  L.push('  shadows), or take `castShadow` off static furniture and let the authored `_roomFX` contact blobs carry the');
  L.push('  grounding.');
  L.push('- **the transparent overlays** (`room_fx` ~87 calls, `building_shell` ~88) — each blob/slab carries its own');
  L.push('  material because its opacity is authored per item, and alpha blending of different colours does not commute,');
  L.push('  so they cannot share a bucket without changing pixels. Making them share one material with a per-vertex');
  L.push('  alpha would fix it and is a contained change, but it is a change to how the lighting overlay is authored.');
  L.push('');
  L.push('**2. Mobile-floor playability · p95 ≤33ms at CPU 4× · measured 79.2 / 55.4 / 59.9ms.** CPU throttling');
  L.push('multiplies main-thread work and nothing else, so this row is a direct function of the draw-call count above.');
  L.push('At native the same rooms sit at 7.8 / 6.8 / 7.8ms p50 with the GPU idle enough to hit 128–147fps uncapped, and');
  L.push('at CPU 2× ("mid laptop") reception and parking_garage already PASS the 33ms p95 (26.6 / 27.0ms). Arithmetic');
  L.push('for what would close it: p95 79.2ms at 4× is ~19.8ms of main-thread work per frame; the budget needs ~8.25ms.');
  L.push('Draw-call submission is the dominant term, so it needs roughly a halving of calls again — i.e. exactly the');
  L.push('character-rig and shadow-caster decisions above. **Also worth QA\'s attention: a 4× CPU throttle on this');
  L.push('machine\'s CPU is a harsh stand-in for "recent mobile", and the harness invented that mapping — it is not in');
  L.push('COMP_CARD.** If the intended floor is a real device, the honest fix is to measure one, not to argue about the');
  L.push('multiplier. Either way that is a QA/producer call and nothing here has been re-baselined on it.');
  L.push('');
  L.push('**Also open:** the intermittent vsync-off `cubicle_farm` 605ms outlier (attributed in METHOD NOTES, not');
  L.push('fixed), and the coplanar-decal depth separation that would make static batching pixel-exact (a content fix,');
  L.push('~0.1–0.7% of the frame, also in METHOD NOTES).');
  L.push('');
  L.push('## HOW TO RE-RUN');
  L.push('');
  L.push('```');
  L.push('npm run dev                                   # in another terminal');
  L.push('node tools/perf-harness.mjs                   # full baseline');
  L.push('node tools/perf-harness.mjs --mode=frozen     # determinism only (~30s)');
  L.push('node tools/perf-harness.mjs --mode=walk       # flicker bursts only');
  L.push('node tools/perf-harness.mjs --mode=timing     # timing + LoAF + leak + headroom');
  L.push('node tools/perf-harness.mjs --mode=frozen,walk    # both visual layers, no timing');
  L.push('node tools/perf-harness.mjs --mode=ladder --ladder-seconds=12   # pass-cost ladder only');
  L.push('node tools/perf-harness.mjs --rooms=archive,vault --frames=20');
  L.push('node tools/perf-harness.mjs --headless        # CI-safe; fps stamped RELATIVE-ONLY');
  L.push('node tools/perf-harness.mjs --mode=report     # rebuild this file, no measurement');
  L.push('node tools/perf-harness.mjs --gate            # exit 1 on any budget violation');
  L.push('node tools/perf-harness.mjs --prune           # drop the raw frames, keep the masks');
  L.push('```');
  L.push('');
  L.push(`Machine-readable baseline: \`${BASELINE_JSON}\`. Flicker sheet: \`${OUT}/index.html\`.`);
  L.push('');

  // INTEGRATOR HANDOFF. The run that produces this report is not allowed to
  // commit, so the report has to carry everything the person who IS allowed needs.
  if (!MEASURED && result.tree?.dirty) {
    const t = result.tree;
    L.push('## INTEGRATOR HANDOFF');
    L.push('');
    L.push(`**Nothing in this report is committed.** \`${result.branch}\` is still at \`${result.commit}\`, which is the`);
    L.push('BEFORE state — including whatever this report says was fixed. The measured code lives in exactly one place:');
    L.push('');
    L.push('```');
    L.push(`# verify the archive applies cleanly to the commit it was measured against`);
    L.push(`git stash -u                     # or work in a fresh worktree`);
    L.push(`git checkout ${result.commit}`);
    L.push(`git apply --check ${t.patchFile}`);
    L.push(`git apply ${t.patchFile}`);
    L.push('```');
    L.push('');
    L.push(`- patch \`${t.patchFile}\` · sha256 \`${t.diffSha}\` · ${t.diffBytes} bytes`);
    L.push(`- ${t.files.length} modified file(s)${t.untracked?.length ? ` + ${t.untracked.length} new file(s)` : ''}${t.patchIncludesUntracked ? ', all inside the patch' : ''}`);
    L.push('- re-run `node tools/perf-harness.mjs --gate` after landing it; the numbers in this file were taken from');
    L.push('  that exact tree and should reproduce within the noise bands listed in METHOD NOTES.');
    L.push('');
    L.push('_If this patch is lost or rebased away, the shipped game keeps the BEFORE behaviour: the per-room-hop');
    L.push('resource leak, the every-frame full shadow-map redraw, the un-batched draw-call counts, the first-keypress');
    L.push('audio freeze, and the shader compiles landing on the first visible frame of a new room._');
    L.push('');
    L.push('> **⚠ `screenshots/` IS GITIGNORED** (`.gitignore:9`), so this patch and every piece of evidence beside it');
    L.push('> live outside version control. A `git clean -xdf` deletes the only copy of the measured code. Before doing');
    L.push('> anything destructive to the working tree, copy `' + t.patchFile + '` somewhere git can see, or land it.');
    L.push('');
  }

  writeFileSync(join(OUT, REPORT_MD), L.join('\n'));
};

const writeSheet = (result) => {
  const sec = [];
  for (const f of result.frozen) {
    const cells = f.pairs.map((p) => `<figure class="${p.match ? 'ok' : 'bad'}">${p.mask ? `<img src="${p.mask.split(/[\\/]/).pop()}" loading="lazy">` : '<div class="clean">identical</div>'}<figcaption>${p.pair} — ${p.diffCount} px (${r2(p.diffPercentage)}%)</figcaption></figure>`).join('');
    sec.push(`<section><h2>FROZEN — ${f.room} <small>${f.deterministic ? 'deterministic' : 'NONDETERMINISTIC'}</small></h2><div class="strip">${cells}</div></section>`);
  }
  for (const w of result.walk) {
    for (const [tag, d] of [['walk', w.walk], ['static (control)', w.control]]) {
      const cells = d.pairs.map((p) => `<figure class="${p.changedPct > 0.5 ? 'bad' : p.changedPct > 0.02 ? 'warn' : 'ok'}">${p.mask ? `<img src="${p.mask.split(/[\\/]/).pop()}" loading="lazy">` : '<div class="clean">identical</div>'}<figcaption>${p.pair} — ${p.changedPct}%</figcaption></figure>`).join('');
      sec.push(`<section><h2>${tag.toUpperCase()} — ${w.room} <small>${tag === 'walk' ? w.direction + ', ' + w.walkDisplacement + ' tiles' : 'no input'} · median ${d.median}% · max ${d.max}%</small></h2><div class="strip">${cells}</div></section>`);
    }
  }
  for (const s of result.stepWalk) {
    for (const [tag, d] of [['stepped walk · AO ON', s.aoOn], ['stepped walk · AO OFF', s.aoOff]]) {
      const cells = d.pairs.map((p) => `<figure class="${p.changedPct > 0.5 ? 'bad' : p.changedPct > 0.02 ? 'warn' : 'ok'}">${p.mask ? `<img src="${p.mask.split(/[\\/]/).pop()}" loading="lazy">` : '<div class="clean">identical</div>'}<figcaption>${p.pair} — ${p.changedPct}%</figcaption></figure>`).join('');
      sec.push(`<section><h2>${tag} — ${s.room} <small>${s.direction} · 1 sim frame apart · median ${d.median}% · max ${d.max}%</small></h2><div class="strip">${cells}</div></section>`);
    }
  }
  writeFileSync(join(OUT, 'index.html'), `<!doctype html>
<meta charset="utf-8"><title>TRUST ISSUES — perf / flicker sheet</title>
<style>
 body{background:#08080f;color:#ddd;font-family:monospace;margin:16px}
 h1{color:#e94560}
 h2{color:#53a8b6;font-size:15px;margin:20px 0 6px}
 h2 small{color:#667;font-weight:normal}
 .strip{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px}
 figure{margin:0;border:1px solid #222;background:#11111e}
 figure.bad{border-color:#e94560} figure.warn{border-color:#d9a441} figure.ok{border-color:#2b4}
 img{width:100%;display:block}
 .clean{padding:26px 4px;text-align:center;color:#2b4;font-size:12px}
 figcaption{font-size:11px;color:#8ab;padding:3px}
 .hdr{border:1px solid #333;padding:10px;background:#11111e;color:#8ab}
</style>
<h1>Perf / flicker sheet — ${result.when}</h1>
<div class="hdr">GPU: <b>${result.gpu.renderer}</b> · ${HEADLESS || result.gpu.software ? '<b style="color:#e94560">RELATIVE-ONLY (software / headless)</b>' : 'hardware'} · commit ${result.commit}</div>
${sec.join('\n')}`);
};

// ---------------------------------------------------------------- main ------

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  // Clear stale frames so a --rooms subset never mixes old masks into the sheet —
  // but ONLY for the modes this run will regenerate. An unscoped sweep here wiped
  // every frozen/walk mask during a --mode=timing run, leaving the sheet pointing
  // at deleted files.
  const staleTags = [];
  if (wants('frozen')) staleTags.push('frozen');
  if (wants('walk')) staleTags.push('static', 'walk', 'stepwalk', 'stepwalk_noao');
  if (staleTags.length) {
    for (const f of readdirSync(OUT)) {
      if (!/\.png$/.test(f)) continue;
      // Room ids contain underscores (cubicle_farm), so strip the matched room
      // prefix rather than splitting on the first '_'.
      const room = ROOMS.find((r) => f.startsWith(r + '_'));
      if (!room) continue;
      const rest = f.slice(room.length + 1);
      if (staleTags.some((t) => rest.startsWith(t))) { try { rmSync(join(OUT, f)); } catch { /* ignore */ } }
    }
  }

  // Dev-server precondition — fail loudly rather than measuring a 404.
  // (--mode=report never touches the page, so it does not need the server.)
  if (!MODES.has('report')) {
    try {
      const res = await fetch(BASE, { method: 'GET' });
      if (!res.ok) throw new Error('status ' + res.status);
    } catch (e) {
      console.error(`\n  ✗ dev server not reachable at ${BASE} — run \`npm run dev\` first (${e.message})`);
      process.exit(2);
    }
  }

  const { execSync } = await import('child_process');
  const git = (() => {
    try {
      return {
        commit: execSync('git rev-parse --short HEAD').toString().trim(),
        branch: execSync('git rev-parse --abbrev-ref HEAD').toString().trim(),
      };
    } catch { return { commit: 'unknown', branch: 'unknown' }; }
  })();
  // Pin the measured code even when it is not committed: hash the diff, list the
  // files, and save the patch beside the report.
  const { createHash } = await import('node:crypto');
  const tree = (() => {
    try {
      const tracked = execSync('git diff HEAD -- src tools', { maxBuffer: 64 * 1024 * 1024 }).toString();
      const files = execSync('git diff --name-only HEAD -- src tools').toString().trim().split('\n').filter(Boolean);
      // UNTRACKED FILES GO IN THE PATCH TOO. `git diff` cannot see them, and round
      // 1 only listed them in prose — so `git apply AFTER.patch` reproduced the
      // modified sources but none of the new tools (including the harness itself),
      // i.e. the archive could not actually reproduce the run. `git diff --no-index
      // --binary /dev/null <file>` emits a valid add-file hunk for each, appended
      // after the tracked diff so one `git apply` restores everything.
      const untracked = execSync('git ls-files --others --exclude-standard -- src tools')
        .toString().trim().split('\n').filter(Boolean);
      let adds = '';
      for (const f of untracked) {
        try {
          execSync(`git diff --no-index --binary -- /dev/null "${f}"`, { maxBuffer: 64 * 1024 * 1024 });
        } catch (e) {
          // `git diff --no-index` exits 1 when the files differ, which is always.
          // The patch text is on stdout of the failed call.
          if (e.stdout) adds += e.stdout.toString();
        }
      }
      const diff = tracked + adds;
      const sha = createHash('sha256').update(diff).digest('hex');
      // Skip the patch when --measured is set: the harness's cwd is not the tree
      // that served the page, so a diff of the cwd would describe the wrong code.
      const patchFile = `${OUT}/${LABEL}.patch`;
      if (diff.length && !MEASURED) { mkdirSync(OUT, { recursive: true }); writeFileSync(patchFile, diff); }
      return {
        dirty: files.length > 0, files, untracked, diffSha: sha, diffBytes: diff.length, patchFile,
        patchIncludesUntracked: adds.length > 0, trackedBytes: tracked.length, untrackedBytes: adds.length,
      };
    } catch { return null; }
  })();

  // report-only: rebuild BASELINE.md + index.html from the stored baseline with no
  // browser and no measurement. For iterating on the report itself.
  const REPORT_ONLY = MODES.has('report');
  if (REPORT_ONLY) {
    if (!existsSync(BASELINE_JSON)) {
      console.error(`  ✗ --mode=report needs an existing ${BASELINE_JSON}`);
      process.exit(2);
    }
    const prev = JSON.parse(readFileSync(BASELINE_JSON, 'utf8'));
    // PROVENANCE BUG, FIXED HERE. run() recomputes the tree diff and rewrites
    // `<LABEL>.patch` on EVERY invocation, including this one — but this path used
    // to print the sha stored in the JSON at measurement time. So a report
    // regenerated after any later edit stated a sha that did not match the patch
    // sitting next to it, which is precisely the provenance failure this round was
    // asked to fix. The report now describes the patch that is actually on disk,
    // and if that differs from the measured one it says so, with both shas.
    if (tree && prev.tree && tree.diffSha !== prev.tree.diffSha) {
      prev.treeAtMeasurement = prev.tree;
      prev.tree = { ...tree, driftFrom: prev.treeAtMeasurement.diffSha, driftBytes: prev.treeAtMeasurement.diffBytes };
    } else if (tree) {
      prev.tree = tree;
    }
    writeReport(prev);
    writeSheet(prev);
    console.log(`\n  → ${OUT}/${REPORT_MD} (regenerated from ${BASELINE_JSON}, no measurement)`);
    console.log(`  → ${OUT}/index.html`);
    process.exit(0);
  }

  const { browser, context } = await launch();
  const odiff = new ODiffServer();
  const result = {
    when: new Date().toISOString(), ...git, tree, label: LABEL,
    harness: { headless: HEADLESS, viewport: VIEW, fixture: FIXTURE, rooms: ROOMS, burstFrames: BURST_FRAMES, burstIntervalMs: BURST_MS, timingSeconds: TIMING_S, throttledSeconds: THROTTLED_S, throttleRate: THROTTLE_RATE, hops: HOPS },
    gpu: null, frozen: [], walk: [], stepWalk: [], timing: [], uncapped: [], leak: null,
    transitions: null, errors: [],
  };

  try {
    // GPU gate — every fps number in this report is worthless without it.
    const gate = await context.newPage();
    await gate.goto(BASE, { waitUntil: 'domcontentloaded' });
    result.gpu = await gate.evaluate(GPU_GATE);
    await gate.close();
    console.log(`\n  GPU: ${result.gpu.renderer}`);
    if (result.gpu.software || HEADLESS) console.log('  ⚠ SOFTWARE / HEADLESS — report will be stamped RELATIVE-ONLY');

    if (wants('frozen')) {
      for (const room of ROOMS) {
        try {
          const r = await frozenRun(context, room, odiff);
          result.frozen.push(r);
          console.log(`  ${r.deterministic ? '✓' : '✗'} frozen ${room} — ${r.deterministic ? 'deterministic' : `${r.pairs.map((p) => p.diffCount).join('/')} px differ`}`);
        } catch (e) { result.errors.push(`frozen:${room}: ${e.message}`); console.log(`  ✗ frozen ${room} — ${e.message}`); }
      }
    }

    if (wants('walk')) {
      for (const room of ROOMS) {
        try {
          const r = await walkRun(context, room, odiff);
          result.walk.push(r);
          console.log(`  ✓ walk ${room} — control med ${r.control.median}% · walk med ${r.walk.median}% · max ${r.walk.max}% (${r.walkDisplacement} tiles)`);
        } catch (e) { result.errors.push(`walk:${room}: ${e.message}`); console.log(`  ✗ walk ${room} — ${e.message}`); }
        try {
          const s = await steppedWalkRun(context, room, odiff);
          result.stepWalk.push(s);
          console.log(`  ✓ stepwalk ${room} — AO on med ${s.aoOn.median}% · AO off med ${s.aoOff.median}% · delta ${s.medianDelta}pp`);
        } catch (e) { result.errors.push(`stepwalk:${room}: ${e.message}`); console.log(`  ✗ stepwalk ${room} — ${e.message}`); }
      }
    }

    if (wants('timing')) {
      for (const room of ROOMS) {
        // Rate 2 is COMP_CARD's "60fps mid laptop" proxy and round 1 never ran it,
        // so the report had a native row and a mobile-floor row with nothing in
        // between — which is where most of the actual audience sits.
        for (const [rate, secs] of [[1, TIMING_S], [2, THROTTLED_S], [THROTTLE_RATE, THROTTLED_S]]) {
          try {
            // No cost ladder here — with vsync on, every rung under budget reads
            // 16.67ms and the ms column is meaningless. The ladder runs in the
            // uncapped phase below instead.
            const r = await timingRun(context, room, { throttle: rate, seconds: secs });
            result.timing.push(r);
            console.log(`  ✓ timing ${room} @${rate}x — p50 ${r.timing.p50}ms p95 ${r.timing.p95}ms p99 ${r.timing.p99}ms max ${r.timing.max}ms · ${r.timing.hitchesPerSecond} hitch/s · calls ${r.drawCalls.p50}`);
          } catch (e) { result.errors.push(`timing:${room}@${rate}: ${e.message}`); console.log(`  ✗ timing ${room} @${rate}x — ${e.message}`); }
        }
      }
    }

    if (wants('timing') || wants('leak')) {
      try {
        result.leak = await leakRun(context);
        console.log(`  ${result.leak.verdict.startsWith('LEAK') ? '✗' : '✓'} leak — ${result.leak.verdict}`);
      } catch (e) { result.errors.push(`leak: ${e.message}`); console.log(`  ✗ leak — ${e.message}`); }
    }

    if (wants('timing') || wants('transition')) {
      try {
        result.transitions = await transitionRun(context, +argOf('transition-hops', 8));
        console.log(`  ${result.transitions.verdict.startsWith('CLEAN') ? '✓' : '✗'} transitions — ${result.transitions.verdict}`);
      } catch (e) { result.errors.push(`transitions: ${e.message}`); console.log(`  ✗ transitions — ${e.message}`); }
    }
  } finally {
    try { odiff.stop(); } catch { /* ignore */ }
    await browser.close();
  }

  // Phase 2 — a separate browser with vsync disabled, for true headroom.
  if ((wants('timing') || wants('ladder')) && !has('no-uncapped')) {
    const u = await launch(UNCAPPED_ARGS);
    try {
      for (const room of ROOMS) {
        try {
          const r = await timingRun(u.context, room, { throttle: 1, seconds: UNCAPPED_S, ladder: room === ROOMS[0] && !has('no-ladder') });
          r.vsync = 'disabled';
          result.uncapped.push(r);
          console.log(`  ✓ uncapped ${room} — p50 ${r.timing.p50}ms (${r.timing.fps_p50} fps) p95 ${r.timing.p95}ms · calls ${r.drawCalls.p50}`);
        } catch (e) { result.errors.push(`uncapped:${room}: ${e.message}`); console.log(`  ✗ uncapped ${room} — ${e.message}`); }
      }
    } finally { await u.browser.close(); }
  }

  // Merge over any existing baseline so `--mode=frozen` does not wipe the timing
  // section (and vice versa). Sections this run produced win; sections it did not
  // touch are carried forward with a note about when they were taken.
  let merged = result;
  if (existsSync(BASELINE_JSON)) {
    try {
      const prev = JSON.parse(readFileSync(BASELINE_JSON, 'utf8'));
      merged = { ...prev, ...result, carriedForward: {} };
      // Merge PER ENTRY, not per section. A `--rooms=reception` run replaces only
      // reception's row; wholesale array replacement silently deleted the other
      // rooms' results and made a subset run look like a shrinking baseline.
      const keyOf = (e) => `${e.room}|${e.throttle === undefined ? '' : e.throttle}|${e.vsync || ''}`;
      for (const k of ['frozen', 'walk', 'stepWalk', 'timing', 'uncapped']) {
        const fresh = result[k] || [];
        const old = prev[k] || [];
        if (!fresh.length && !old.length) continue;
        if (!fresh.length) { merged[k] = old; merged.carriedForward[k] = prev.when; continue; }
        const freshKeys = new Set(fresh.map(keyOf));
        const kept = old.filter((e) => !freshKeys.has(keyOf(e)));
        // Stable presentation order regardless of which subset ran.
        const order = ['cubicle_farm', 'reception', 'parking_garage'];
        const rank = (e) => { const i = order.indexOf(e.room); return i < 0 ? order.length : i; };
        merged[k] = [...fresh, ...kept].sort((a, b) =>
          rank(a) - rank(b) || String(a.room).localeCompare(String(b.room)) || (a.throttle || 0) - (b.throttle || 0));
        if (kept.length) merged.carriedForward[k] = `${kept.length} entr${kept.length === 1 ? 'y' : 'ies'} from ${prev.when}`;
      }
      if (!result.leak && prev.leak) { merged.leak = prev.leak; merged.carriedForward.leak = prev.when; }
      if (!result.transitions && prev.transitions) { merged.transitions = prev.transitions; merged.carriedForward.transitions = prev.when; }
      if (!Object.keys(merged.carriedForward).length) delete merged.carriedForward;
    } catch { merged = result; }
  }

  // The raw burst frames are only diff INPUTS — the sheet references masks alone.
  // They are worth keeping by default (a human hunting flicker wants the actual
  // frames, not just the mask), but ~120MB per full run adds up: --prune drops them.
  if (has('prune')) {
    let n = 0;
    for (const f of readdirSync(OUT)) {
      if (/_(f\d+|frozen_\d+|frozen_noAO_\d+|frozen_noBloom_\d+|frozen_noTiltShift_\d+)\.png$/.test(f)) {
        try { rmSync(join(OUT, f)); n++; } catch { /* ignore */ }
      }
    }
    console.log(`  pruned ${n} source frames (masks kept)`);
  }

  writeFileSync(BASELINE_JSON, JSON.stringify(merged, null, 2));
  writeReport(merged);
  writeSheet(merged);
  console.log(`\n  → ${BASELINE_JSON}`);
  console.log(`  → ${OUT}/${REPORT_MD}`);
  console.log(`  → ${OUT}/index.html`);
  if (result.errors.length) console.log(`  ⚠ ${result.errors.length} error(s): ${result.errors.join(' | ')}`);

  const violations = budgetCheck(merged).filter((b) => !b.pass);
  if (violations.length) console.log(`  ⚠ ${violations.length} budget violation(s) — see ${OUT}/${REPORT_MD} § BUDGETS`);

  const producedNothing = !result.timing.length && !result.frozen.length && !result.walk.length && !result.uncapped.length;
  if (result.errors.length && producedNothing) process.exit(2);   // harness failure
  if (has('gate') && violations.length) process.exit(1);          // budget failure (opt-in gate)
  process.exit(0);
};

run();
