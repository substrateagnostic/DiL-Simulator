# Research: autonomous perf-testing harness + img2threejs

*2026-07-29. Web research run for the `display-case` branch. Two independent topics.
Every claim that came from a single source is marked. Every "verify empirically"
line is there because the source did not confirm it — do not treat those as facts.*

Context read first: `art/COMP_CARD.md` (perf budget: 60fps mid laptop / 30fps
mobile floor, ≤4 full-screen post passes, ≤300 draw calls room / ≤150 combat,
degrade order AO → tilt-shift half-res → bloom half-res), `HANDOFF.md` Wave 5
addendum (open item: *"Perf: post chain + v5 characters need a real-hardware FPS
pass"*), `tools/shoot.mjs` + `tools/cine-shoot.mjs` (existing Playwright
harnesses), `ROADMAP.md` §R3 + Playwright playtest notes.

---

# TOPIC 1 — Autonomous performance-testing harness

## 1.0 Bottom line

**Build `tools/perf.mjs` as a fourth sibling to `shoot.mjs` / `cine-shoot.mjs`,
reusing the same `?dev&fixture=&shot=` fixture loader.** Do not adopt a
third-party perf framework — none of them understand a WebGL game loop, and the
repo already owns the hard part (deterministic scene entry + a dev handle).

The harness is four layers, in this order of value:

| Layer | What | Why it goes first |
|---|---|---|
| **A. In-page probe** | injected script — rAF frame-time ring buffer, `renderer.info` deltas, LoAF observer, heap sampling, per-frame cheap image fingerprint | Zero IPC cost, frame-accurate, gives *both* stutter and flicker signals from one 600-frame run. This is 80% of the value. |
| **B. Playwright driver** | walks the player on a scripted path, harvests the probe's JSON, asserts budgets, writes a report | Makes it runnable headlessly by an agent, and diffable across commits |
| **C. CDP trace** | only for frames layer A flagged — `Tracing.start` with the DevTools category set, saved as `.json` for offline attribution | Traces are huge; record them *conditionally*, not by default |
| **D. Full-res burst + odiff** | `odiff-bin` diffing of screenshot bursts, only around flagged frames | Confirms and *visually localises* flicker for a human/critic agent |

The single most important design decision: **the detector runs inside the page,
the confirmation runs outside.** Every naive design (screenshot every frame, diff
everything) dies on IPC cost — `page.screenshot()` is tens-to-hundreds of ms, so
it *is* the stutter you were trying to measure.

**→ §1.10 is the part to read if you only read one section.** A code audit ran
alongside this research; it found the audited N8AO settings, a shadow map being
fully re-rendered every frame, an `innerHTML` rebuild per frame in the walking
path, and an unfixed room-resource leak — plus the fact that the harness needs
**zero source changes** and that the frozen-frame flicker rig already exists in
`tools/cine-shoot.mjs`.

---

## 1.1 Read this before writing a line: the headless GPU trap

This invalidates more browser-game perf harnesses than any other single thing.

- Headless Chromium **does not use the GPU by default** ([Playwright #15533](https://github.com/microsoft/playwright/issues/15533), [#11627](https://github.com/microsoft/playwright/issues/11627)). It falls back to **SwiftShader**, a pure-CPU Vulkan/GL ES implementation ([Chromium SwiftShader docs](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md)).
- SwiftShader "emulates the whole pipeline conservatively, optimizing for *draws correctly anywhere*" — a heavy 3D scene took **~24s** where a 2D page took 2–3s ([Microlink: WebGL without a GPU](https://microlink.io/blog/webgl-without-a-gpu)).
- Consequence: **an FPS number from default headless Playwright is a measurement of SwiftShader, not of the game.** It will happily report 4fps for a scene that runs at 120fps on Alex's 3090, and it will rank optimisations wrongly (it over-punishes fill-rate/post passes, under-punishes draw calls).
- Chromium is also **removing the automatic SwiftShader fallback** — WebGL context creation will fail instead of silently falling back ([Intent to Remove: SwiftShader Fallback](https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM)). So a future Playwright bump may turn "wrong numbers" into "no numbers".

**Mitigation, in preference order:**

1. **Headed + real GPU (recommended for this project).** Alex runs Windows 11 with dual 3090s. Launch `chromium.launch({ headless: false, args: [...] })`. Headed Chromium uses the real GPU pipeline. The window can be off-screen/minimised; it does not need to be watched. This is the only configuration whose absolute fps means anything.
2. **Headless + forced ANGLE.** Community-reported flags: `--use-angle=d3d11` (Windows), `--use-gl=angle`, `--use-gl=egl`/`--use-gl=desktop`, `--enable-gpu`, `--ignore-gpu-blocklist`, `--enable-features=Vulkan` + `--use-angle=vulkan` (Linux) ([createIT](https://www.createit.com/blog/headless-chrome-testing-webgl-using-playwright/), [Promaton](https://blog.promaton.com/testing-3d-applications-with-playwright-on-gpu-1e9cfc8b54a9), [Michel Krämer](https://michelkraemer.com/enable-gpu-for-slow-playwright-tests-in-headless-mode/)). **These are folklore-grade — verify empirically.**
3. **Always assert what you got.** The harness's first act must be a GPU sanity gate, and it must **refuse to report fps** if the gate fails:

```js
// in-page, before any measurement
const gl = document.querySelector('canvas').getContext('webgl2');
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
const renderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL); // e.g. "ANGLE (NVIDIA ...)"
const software = /swiftshader|software|llvmpipe|basic render/i.test(renderer);
```
Write `renderer` into the report header. A report without it is worthless, and a
report with `SwiftShader` in it must be labelled **RELATIVE-ONLY** (still useful
for draw-call/allocation regressions, useless for fps budgets).

**Corollary for the flicker hunt:** flicker caused by *precision* (z-fighting,
shadow acne, dither) may not reproduce identically on SwiftShader vs ANGLE/D3D11
vs the eventual player's Intel iGPU. Flicker verification should run on the real
GPU, and ideally twice (D3D11 and `--use-angle=gl`) — a difference between the
two backends is itself a strong precision-bug signal.

---

## 1.2 Layer A — the in-page probe (`src/utils/PerfProbe.js`)

Gate the whole file behind `DEV_MODE` so it never costs a shipped player a
frame. Expose it as `window.__perf`.

### A1. Frame-time histogram (the primary stutter signal)

Never report a mean fps. Report the distribution. An average of 60fps with a
1-in-90-frames 40ms hitch *is exactly the producer's complaint* and averages hide
it completely.

```js
// per-frame, in the existing main loop next to updateTweens(dt)
const t = performance.now();
const dt = t - last; last = t;
frames[i++ & MASK] = dt;                 // preallocated Float32Array — no GC
```

Metrics the report must carry, per scene:

- `p50 / p95 / p99 / max` frame time (ms) — **p99 and max are the stutter metrics**
- `fps_p50` = `1000/p50`
- **`hitchCount`** = frames > 2× p50 (a "dropped frame"), and `severeHitches` = frames > 4× p50
- **`hitchesPerSecond`** — the number to trend across commits
- a compact histogram (bucket edges 8/12/16.7/20/25/33/50/100/∞ ms) so an agent can *see* whether it is bimodal (vsync 60↔30 oscillation) or long-tailed (GC/upload spikes)
- `longestRun` of consecutive over-budget frames (distinguishes one texture upload from sustained overdraw)

Rationale for the distribution-first approach and the ~16.6ms budget:
[Checkly](https://www.checklyhq.com/docs/learn/playwright/performance/) (run
headless, run repeatedly, assert on the **median**),
[Latish Sehgal on FPS measurement](https://latish.dev/blog/2026/05/27/measuring-performance-in-frontend-using-fps/)
("a usable FPS meter is about 15 lines of plain JavaScript, no library required"
— and that CI should turn FPS into a trend line / failing check like bundle size).

### A2. `renderer.info` deltas (the cheapest, highest-signal WebGL metric)

`renderer.info.render.calls` is the single most predictive number for a scene
like this one. Sample it every frame *and* diff it across frames.

```js
const r = Engine.renderer.info;
sample(r.render.calls, r.render.triangles, r.programs.length,
       r.memory.geometries, r.memory.textures);
```

- `render.calls` — assert against the COMP_CARD budgets (**≤300 room, ≤150 combat**). Community rule of thumb: <100 calls is smooth on nearly anything, >500 struggles even on strong GPUs ([utsubo: 100 three.js tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips), [threejsroadmap: Draw Calls, The Silent Killer](https://threejsroadmap.com/blog/draw-calls-the-silent-killer)).
- **`calls` *variance* within a steady room is a bug signal**, not just a cost signal — it means geometry/visibility churn per frame.
- `memory.geometries` / `memory.textures` must be **flat over a 60s soak**. Monotonic growth = leak (the standard three.js leak test — [utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips), [VerseEngine](https://verseengine.cloud/guide/general-tips/get-draw-call-counts.html)).
- **`programs.length` growing after warm-up = mid-play shader compilation**, which is a *guaranteed* multi-frame hitch. This is the most likely single cause of a stutter that happens the first time you walk into a part of a room. Sample it per frame and record the frame index of every increment — that timestamp is the smoking gun.

### A3. Long Animation Frames (LoAF) — free script attribution

Chrome 123+ ships the Long Animation Frames API: `PerformanceObserver` on
`long-animation-frame` reports frames delayed beyond ~50ms **with script
attribution and a style/layout/render phase breakdown**, which the old Long Tasks
API could not do ([Chrome for Developers: Long Animation Frames API](https://developer.chrome.com/docs/web-platform/long-animation-frames),
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing),
[SpeedCurve guide](https://www.speedcurve.com/blog/guide-long-animation-frames-loaf/)).

```js
new PerformanceObserver(list => {
  for (const e of list.getEntries()) hits.push({
    start: e.startTime, dur: e.duration, blocking: e.blockingDuration,
    renderStart: e.renderStart, styleAndLayout: e.styleAndLayoutStart,
    scripts: e.scripts.map(s => ({ name: s.name, src: s.sourceURL,
      fn: s.sourceFunctionName, char: s.sourceCharPosition, dur: s.duration })),
  });
}).observe({ type: 'long-animation-frame', buffered: true });
```

`scripts[].sourceFunctionName` + `sourceCharPosition` is **the function that ate
the frame, by name, with a file offset** — this is the single best
"agent-fixes-it-autonomously" primitive in the whole report, because it turns a
stutter into a file:line an agent can go read. Note the 50ms threshold: it will
catch severe hitches, not 20ms ones, so it complements A1 rather than replacing
it.

### A4. Heap sampling — the GC-stutter signal

Sample `performance.memory.usedJSHeapSize` (non-standard, Chrome-only, fine for a
dev harness) once per frame into the same ring buffer.

- A **sawtooth** = per-frame allocation churn. Report `allocRateMBPerSec` (mean positive slope) and `gcEvents` (count of sharp drops).
- Correlate: for each frame-time outlier in A1, check whether a heap drop occurred within ±3 frames. **`hitchesCorrelatedWithGC / hitchCount` is the metric that tells an agent whether to go hunt allocations or hunt uploads.**
- Grounding: minor GC still stops the world (typically 1–5ms) ([V8: Trash talk](https://v8.dev/blog/trash-talk), [renderlog on JS GC and frontend jank](https://renderlog.in/blog/javascript-garbage-collection-frontend/)). The WebGL-specific case study is the best single reference: a three.js-class app dropped **11 consecutive frames** after a major GC with "the GPU thread blocking for several hundred milliseconds", root-caused to *allocating a new WebGL texture object every frame instead of caching it*, and fixed by a one-line static cache ([Exploring garbage collection in V8 with WebGL](https://whenderson.dev/blog/webgl-garbage-collection/)). Note the shape of that bug: the visible symptom was a GPU-thread stall, the cause was a JS allocation. Do not assume a long GPU block means a GPU problem.

### A5. GPU-side frame time (optional, but decisive when it works)

`EXT_disjoint_timer_query_webgl2` gives real GPU time per pass without stalling
the pipeline ([Khronos spec](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/),
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query)).
It is the only way to answer "is the post chain or the geometry the cost?"

**Catch:** the extension has been **disabled in Chrome since Chrome 65** because
it enables Spectre-class and Rowhammer-style attacks ([Chromium: Mitigating
Side-Channel Attacks](https://www.chromium.org/Home/chromium-security/ssca/)). It
was re-exposed to developers behind **`chrome://flags/#enable-webgl-developer-extensions`**
([chromium-discuss thread](https://groups.google.com/a/chromium.org/g/chromium-discuss/c/B9zBnC96t0I),
[crbug 1230926](https://bugs.chromium.org/p/chromium/issues/detail?id=1230926)).

- The corresponding launch flag is almost certainly `--enable-webgl-developer-extensions`, but **no source confirmed the CLI switch spelling — verify empirically** by launching with it and checking `gl.getExtension('EXT_disjoint_timer_query_webgl2') !== null`. If it returns null, skip layer A5 entirely; do not block the harness on it.
- Easiest consumer: **[`stats-gl`](https://www.npmjs.com/package/stats-gl)** (`npm i stats-gl`, by Renaud Rohlinger — [repo](https://github.com/RenaudRohlinger/stats-gl)), which does FPS/CPU/**GPU** panels and explicitly documents "GPU logging is available only if the browser supports `EXT_disjoint_timer_query_webgl2` or WebGPU timestamp queries". Use it for interactive human sessions; for the headless harness prefer reading its numbers programmatically or hand-rolling the two queries so nothing draws to the screen.
- Alternative reference implementation: [figma/webgl-profiler](https://github.com/figma/webgl-profiler).
- Caveat from the spec: a query can come back **disjoint** (invalid) if the GPU was throttled mid-measurement. Discard disjoint samples; do not average them in.

### A6. The flicker fingerprint (the novel bit — see §1.4)

---

## 1.3 Layer B/C — Playwright driver and CDP

### What Playwright actually gives you

- **There is no `page.metrics()` in Playwright** (that's Puppeteer). You must open a CDP session: `const cdp = await context.newCDPSession(page)`. Playwright's CDP access is Chromium-only ([BrowserStack](https://www.browserstack.com/guide/playwright-performance-testing), [Playwright #37100 — built-in CDP metrics is still a feature *request*](https://github.com/microsoft/playwright/issues/37100)).
- `Performance.enable` → **`Performance.getMetrics`** returns cumulative counters: `Timestamp`, `TaskDuration`, `ScriptDuration`, `LayoutDuration`, `RecalcStyleDuration`, `JSHeapUsedSize`, `JSHeapTotalSize`, `Nodes`, `LayoutCount`, `FrameCount` (names to confirm at runtime — enumerate the returned array rather than hardcoding). Take two samples and **diff them** — the raw values are since-context-creation and meaningless alone. `ScriptDuration / wallClock` over the walk window is a good cheap "how CPU-bound is the JS" ratio. ([Checkly](https://www.checklyhq.com/docs/learn/playwright/performance/), [Scoro Engineering](https://medium.com/scoro-engineering/using-playwright-to-measure-and-track-web-performance-90feeafd6f9a))
- **`Emulation.setCPUThrottlingRate({ rate: 4 })`** is the mid-range-laptop and mobile-floor proxy. The COMP_CARD budget says "60fps mid laptop / 30fps recent mobile" — you cannot buy those machines, so define them as **rate 1 (native), rate 2 (mid laptop), rate 4 (mobile floor)** and assert the three budgets separately. This is the cheapest way to make a budget testable on a 3090. (Note: CPU throttling does *not* throttle the GPU — a fill-rate-bound post chain will look free under throttling. Pair it with a resolution sweep: 1280×720 / 1920×1080 / 2560×1440 at fixed CPU rate isolates fill-rate cost.)
- **Input must use the repo's proven pattern**, already documented in `ROADMAP.md`: `keyboard.down(key)` → `waitForTimeout(~90ms)` → `keyboard.up(key)`. `press()` puts keydown+keyup inside one frame and `InputManager.isJustPressed()` misses it. For *walking*, you want `keyboard.down('ArrowUp')`, hold for N seconds, `keyboard.up()` — a genuinely held key, which is exactly the reported-bug condition.

### CDP tracing — record it, but conditionally

`Tracing.start` with `traceConfig.includedCategories`, then read
`Tracing.dataCollected` events, then `Tracing.tracingComplete`. **You only get
`dataCollected` after `Tracing.end`, and you must supply the category config**
([CDP Tracing domain](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/),
[chromium-dev: getting tracing data via CDP](https://groups.google.com/a/chromium.org/g/chromium-dev/c/7VCMtME1Wyk)).

Category set to start from (the DevTools Performance-panel-equivalent):

```
devtools.timeline
disabled-by-default-devtools.timeline
disabled-by-default-devtools.timeline.frame
disabled-by-default-devtools.timeline.invalidationTracking
disabled-by-default-devtools.screenshot        // screenshots inside the trace
blink.user_timing
latencyInfo
toplevel
v8, v8.execute
disabled-by-default-v8.cpu_profiler            // JS sampling profiler in-trace
disabled-by-default-v8.gc                      // GC events
gpu, gpu.service                               // GPU-process work
benchmark, viz                                 // frame lifecycle / PipelineReporter
```

`disabled-by-default-devtools.screenshot` is the documented way to get
screenshots embedded in the trace ([CDP Tracing docs](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/)),
and `disabled-by-default-v8.gc_stats` / `disabled-by-default-v8.runtime_stats`
exist for deeper V8 attribution ([V8: Tracing V8](https://v8.dev/docs/trace)).

**Two warnings for the implementing agent:**
1. **Do not hardcode trace event names from this document.** The Chrome frame model has changed repeatedly (the modern frame lifecycle is carried by `PipelineReporter`/`EventLatency` async events rather than the old `DrawFrame`). Step one of writing the trace parser must be: record 5 seconds, then print `[...new Set(events.map(e => e.name))].sort()` and *look*. Build the parser against the names that actually appeared. ([Digging through Chrome traces](https://calendar.perfplanet.com/2023/digging-chrome-traces-introduction-example/), [A beginner's guide to Chrome tracing](https://nolanlawson.com/2022/10/26/a-beginners-guide-to-chrome-tracing/))
2. **Traces are enormous** — one report measured a full trace at **29.8MB** of JSON ([DebugBear](https://www.debugbear.com/blog/chrome-devtools-mcp-performance-debugging)). Never load a raw trace into an agent's context. Save to disk, extract to a ≤200-line summary, and let the agent read the summary. Layer A exists precisely so that traces are the exception.

### Frame capture: what not to use

- **`Page.startScreencast`** captures in real time with inconsistent frame timing and non-reproducible output (frame timing depends on wall clock and system load) ([puppeteer-capture](https://www.npmjs.com/package/puppeteer-capture)).
- **`HeadlessExperimental.beginFrame`** is the deterministic alternative — it controls when the compositor renders each frame, making frame-perfect reproducible capture possible ([puppeteer-capture](https://www.npmjs.com/package/puppeteer-capture), [headless-screen-recorder](https://github.com/brianbaso/headless-screen-recorder), [PyCDP docs](https://py-cdp.readthedocs.io/en/latest/api/headless_experimental.html)) — **but it is exclusive to `chrome-headless-shell` (old headless) and unavailable in `--headless=new`.** Modern Playwright defaults to new headless, and we want headed anyway for GPU. **Treat beginFrame as unavailable for this project** and note the deeper problem: a harness that controls frame scheduling is measuring a *different* frame pacing than the player experiences, which is the wrong thing for a stutter investigation.
- Conclusion: for *timing*, capture nothing — use layer A. For *pixels*, use layer A6 in-page (cheap, frame-accurate) plus `page.screenshot()` bursts (expensive, only where flagged).

---

## 1.4 Flicker/tear detection — recommended design

Web research on "automated flicker detection" returns camera-sensor and video-codec
literature (row-sum intensity differencing, motion-compensated frame differencing —
[patent US8068148B2](https://patents.google.com/patent/US8068148B2/en),
[Effective Flicker Detection Using ANN](https://easychair.org/publications/open/qBJF)),
not renderer-temporal-stability tooling. **There is no off-the-shelf tool for
this.** The one genuinely transferable idea is the oldest one: *comparison of
consecutive frames suppresses scene information and emphasises flicker*. Build on
that.

### The key insight: split the test into two conditions

|  | Camera **frozen** | Camera **moving** |
|---|---|---|
| Expected frame-to-frame diff | **exactly zero** (unless something is deliberately animated) | large and smooth |
| What a nonzero diff proves | temporal instability, unambiguously — AO noise, dither, z-fighting, jitter | nothing by itself |

**The frozen-camera burst is the entire flicker test, and it is trivially
automatable.** Freeze the camera and all animation (`updateTweens` paused, the
walk cycle halted, time uniforms held), render 60 frames, diff consecutive pairs.
Any nonzero pixel is a bug or an intentional animation you can enumerate and
mask. This converts a subjective "it shimmers" into a scalar per room.

For the moving case, use **second-difference / stability-of-motion**: over a
constant-velocity walk, per-tile SAD between frames should change *smoothly*.
Compute per-64×64-tile SAD per frame, then the second derivative over time per
tile; tiles whose motion-energy oscillates frame-to-frame (high frequency, low
spatial extent) are shimmering. Tiles with a large sudden global spike are a
tear/frame-drop. This is more code, so ship the frozen test first.

### A6. In-page fingerprint (cheap detector)

```js
// once: const small = new OffscreenCanvas(64, 64); const ctx = small.getContext('2d');
// per frame, AFTER the composer render:
ctx.drawImage(gameCanvas, 0, 0, 64, 64);            // GPU downsample, ~free
const px = ctx.getImageData(0, 0, 64, 64).data;      // 16KB readback
let sad = 0; for (let i = 0; i < px.length; i += 4) sad += Math.abs(px[i] - prev[i]);
fingerprint[frame] = sad;  prev.set(px);
```

64×64 costs ~16KB of readback per frame and stays in-page (no IPC). It gives a
per-frame temporal-instability scalar for a 600-frame run, at which point:

- frozen camera + `sad > 0` → flicker, report the frame indices
- moving camera + `sad` oscillating high/low on alternating frames → shimmer
- `sad` collapsing to 0 for k frames → **the renderer stopped producing new frames** (a stall/dropped-frame signature that frame-time alone can miss)

Caveat to state in the report: `getImageData` forces a readback and can itself
perturb timing slightly. Run the flicker pass and the timing pass as **separate
runs** of the same script (`--mode=timing` / `--mode=flicker`), never together.
Also note the downsample *averages away* single-pixel z-fighting — 64×64 finds
broad shimmer (AO, dither, banding); use the full-res burst for thin-line
z-fighting.

### D. Offline confirmation: **odiff**, not pixelmatch

**Use `odiff-bin`.** Verified numbers from its own benchmark
([repo](https://github.com/dmtrKovalenko/odiff), [README](https://github.com/dmtrKovalenko/odiff/blob/main/README.md)):

| Comparison | odiff | pixelmatch | ImageMagick |
|---|---|---|---|
| Full-page screenshot | **1.168 s** | 7.712 s (6.7×) | 8.881 s (7.65×) |
| 8K image | **1.951 s** | 10.614 s | — |

pixelmatch is pure JS, single-threaded, and not optimised for large images; odiff
was OCaml, now **Zig with SIMD (SSE2/AVX2/AVX512/NEON)**, efficient memory layout
and fast PNG decode ([odiff README](https://github.com/dmtrKovalenko/odiff),
[Why our visual regression is so slow](https://dev.to/dmtrkovalenko/why-our-visual-regression-is-so-slow-33dn)).
At 1920×1080 × 60-frame bursts × several rooms the difference is minutes vs
seconds per run — decisive for an autonomous loop.

API:
```js
const { compare } = require('odiff-bin');
const r = await compare(base, cmp, diffOut, {
  threshold: 0.1,          // 0..1 colour sensitivity
  antialiasing: true,      // exclude AA pixels from the count — IMPORTANT here
  outputDiffMask: true,    // writes the diff image (feed to a critic agent)
  failOnLayoutDiff: true,
  reduceRamUsage: false,
});
// also: const { ODiffServer } = require('odiff-bin')  — persistent server mode,
// avoids process spawn per comparison across a 60-frame burst. Use this.
```
Formats: PNG, JPEG, WebP, TIFF. **Verify the Windows prebuilt binary installs** —
the README advertises prebuilt binaries via a postinstall script for "major
platforms" but the source did not explicitly name Windows. If it fails, fall back
to `pixelmatch` + `pngjs` (pure JS, always works) and accept the 6× cost, or run
odiff under WSL.

Also noted, unverified and not recommended without checking: a vendor blog claims
a newer engine ("honeydiff") beats odiff ([Vizzly](https://vizzly.dev/blog/honeydiff-vs-odiff-pixelmatch-benchmarks/)).
Vendor benchmark, self-comparison — do not adopt on that basis.

**Set `antialiasing: true` and a nonzero `threshold`.** With AA and a dither pass
in the chain, a strict pixel-exact diff will scream on every frame and the signal
will be useless. Calibrate the threshold once against a known-good frozen burst.

---

## 1.5 WebGL-specific inspection

### Spector.js — yes for one-shot forensics, no for the loop

[Spector.js](https://github.com/BabylonJS/Spector.js) (BabylonJS) captures every
WebGL command in a frame with the associated visual state and context info; it is
a UMD module that bundles normally. Programmatic use:

```js
const spector = new SPECTOR.Spector();
spector.startCapture(canvas, /* commandCount */ 500);
// ... one frame ...
const capture = spector.stopCapture();     // JS object: full command list
spector.onCaptureStarted.add(...); spector.onCapture.add(cap => ...);
```

It also supports OffscreenCanvas/Worker capture (`spyWorker`, `captureWorker`,
`spyWorkers`), which is what makes headless automation possible, though
auto-injection can fail with cross-origin workers, strict CSP, or ES-module
workers ([repo](https://github.com/BabylonJS/Spector.js/), [readme](https://github.com/BabylonJS/Spector.js/blob/master/readme.md), [demos](https://spector.babylonjs.com/), [issue #293 on full programmatic capture](https://github.com/BabylonJS/Spector.js/issues/293), [Real-Time Rendering: Debugging WebGL with SpectorJS](https://www.realtimerendering.com/blog/debugging-webgl-with-spectorjs/)).

**Honest assessment for this project:** Spector's value is *redundant state
changes and draw-call ordering* — "you are rebinding the same program 40 times",
"you are issuing 300 draws where 20 would do". That is a one-time architectural
audit, worth doing **once** on a heavy room and once on a combat frame, with a
human or a critic agent reading the command list. It is the wrong tool for a
per-commit regression loop: the capture object is large, it perturbs timing, and
`renderer.info` already gives you the trendable numbers for free. **Recommendation:
one manual Spector audit of `penthouse_expanded` (or whichever room has the most
furniture) as a separate task; do not wire it into `perf.mjs`.**

### three.js `renderer.info` — the workhorse

Already covered in §1.2/A2. The one thing to add: **snapshot `renderer.info` per
room into a committed JSON baseline** (`perf-baseline.json`), the same way
`balance.json` is a committed override layer. Then the regression test is a diff,
not a judgement, and an agent can run it without knowing what "good" looks like:

```
room-cubicle_farm: calls 214 (baseline 208, +2.9%)  triangles 191k  programs 61
room-penthouse_expanded: calls 341 (baseline 298, +14.4%)  ⚠ OVER BUDGET (300)
```

### N8AO debug modes — free A/B isolation

N8AO exposes **`setDisplayMode('Combined' | 'AO' | 'No AO' | 'Split' | 'Split AO')`**
([N8AO README](https://github.com/N8python/n8ao/blob/master/README.md)). This is
a gift for autonomous flicker attribution: run the frozen-camera burst **twice**,
once with `'Combined'` and once with `'No AO'`. If the flicker disappears, it is
AO. If it survives, it is the geometry/materials/dither. Two runs, no reasoning
required. Generalise it: make the harness able to toggle each post pass
independently (`--passes=none|ao|tilt|grade|all`) and binary-search the flicker
to a pass automatically.

---

## 1.6 Off-the-shelf: MCP servers and CLI tools

### `chrome-devtools-mcp` — adopt as the *interactive* companion, not the harness

Official Google project, **Apache-2.0, 47.8k stars, pushed 2026-07-29**
(verified via GitHub API), [repo](https://github.com/ChromeDevTools/chrome-devtools-mcp),
[npm](https://www.npmjs.com/package/chrome-devtools-mcp),
[Chrome announcement](https://developer.chrome.com/blog/chrome-devtools-mcp).
Requirements: Node LTS, Chrome current stable or newer.

```json
{ "mcpServers": { "chrome-devtools": {
    "command": "npx", "args": ["-y", "chrome-devtools-mcp@latest"] } } }
```
(`--slim`, `--headless`, `--channel=canary|dev|beta|stable` are supported args.)

Tools relevant here, verified from the repo's own tool index and
`docs/tool-reference.md`:

- **`performance_start_trace`** (params include `reload`, **`autoStop`**), **`performance_stop_trace`** (`filePath` to save the raw trace), **`performance_analyze_insight`**
- **`emulate`** — includes **`cpuThrottlingRate`** ("CPU slowdown factor; omit or set to 1 to disable")
- **`screencast_start` / `screencast_stop`** — newer than most blog coverage
- heap snapshots: `take_heapsnapshot`, `compare_heapsnapshots`, `get_heapsnapshot_dominators`, `get_heapsnapshot_class_nodes`, `get_heapsnapshot_duplicate_strings`, … (a real leak-hunting suite)
- `evaluate_script`, `take_screenshot`, `take_snapshot`, `list_console_messages`, `press_key`, `navigate_page`, `lighthouse_audit` (explicitly *excludes* performance — "for performance audits, run `performance_start_trace`")

Its headline win: `performance_start_trace` returns a **~4KB summary instead of
the 29.8MB raw trace**, i.e. it is built for an agent's context window
([DebugBear](https://www.debugbear.com/blog/chrome-devtools-mcp-performance-debugging),
[Addy Osmani](https://addyosmani.com/blog/devtools-mcp/)).

**Its limitation is decisive for our use case:** the insight engine is
**page-load oriented** — LCP, CLS, TBT, render-blocking resources. DebugBear's
walkthrough covers only load metrics and *does not surface FPS, frame timing, or
animation performance*. Our bug is a steady-state 60fps-hold problem in a canvas
that has no LCP, no layout shift, and one network request. `performance_analyze_insight`
will have nothing useful to say about it.

**Verdict:** install it — the heap-snapshot suite, `evaluate_script`,
`cpuThrottlingRate`, and the summarised trace are genuinely valuable for an agent
doing *interactive* diagnosis, and `screencast_start` is a cheap frame-burst
source. But **do not build the regression loop on it.** MCP tool calls are
conversational, non-deterministic, and unversioned; `tools/perf.mjs` is a
committed script with a committed baseline that produces the same number every
time. Use the MCP server to *investigate*, use the script to *gate*.

Related note: `mcp__plugin_playwright_playwright__*` is already available in this
environment (including `browser_evaluate` and `browser_run_code_unsafe`), so an
agent can drive the probe interactively today without any new install.

### Nothing else is purpose-built

Searching for browser-game-specific perf harnesses turns up
[Shirajuki/js-game-rendering-benchmark](https://github.com/Shirajuki/js-game-rendering-benchmark)
(cross-engine comparison of three.js/pixi/phaser/babylon — a *benchmark*, not a
harness for your own game), plus the standard interactive toolkit: `stats-gl`,
`lil-gui`, Spector.js, `renderer.info`, DevTools Performance panel
([utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips),
[three.js Journey performance tips](https://threejs-journey.com/lessons/performance-tips)).
The consensus is exactly the recommendation here: **e2e frameworks (Playwright/
Cypress) read FPS metrics captured during the test, and tracking FPS on every
build turns a perf regression into a trend line or a failing check, like bundle
size or coverage** ([utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips),
[Latish Sehgal](https://latish.dev/blog/2026/05/27/measuring-performance-in-frontend-using-fps/)).
No one has packaged it. Writing ~400 lines is the correct call.

---

## 1.7 N8AO / SSAO temporal shimmer on orthographic cameras

### Status of the ortho question

N8AO **works with orthographic cameras and auto-detects them** — no user-side
configuration required; same for logarithmic depth buffers
([N8AO README](https://github.com/N8python/n8ao/blob/master/README.md)). So "AO
is broken on ortho" is *not* the issue. The shimmer has a different, and much
more interesting, cause.

### The mechanism behind "flicker while walking"

N8AO offers two temporal-stability paths, and **this project currently uses
neither** (see §1.10 for the audited settings — `accumulate` and `neuralDenoise`
are both unset):

- **`accumulate`** — accumulates samples across frames when the camera is still, *and disables automatically when the camera moves* ([N8AO README](https://github.com/N8python/n8ao/blob/master/README.md)). Worth knowing about, but note the trap: enabling it would make the game clean when standing still and noisy the instant the player walks, i.e. it would *sharpen* the reported symptom rather than fix it. It is the wrong tool for a follow-camera game.
- **`neuralDenoise`** — learned denoising that "enhances temporal stability and sharpens contact shadows", letting 4–8 samples produce "much cleaner and more stable AO". This is the one that helps a moving camera.

So the mechanism is the plain one: **a low-sample AO signal, spatially denoised
only, with the noise pattern anchored to the screen while the geometry slides
underneath it.** Because the iso camera *translates* rather than rotates (ISO
CAMERA LAW), every world surface moves across a fixed screen-space sampling
kernel at a constant rate — the worst case for spatial-only denoising. Standing
still, each pixel's AO is a stable (if noisy) constant; walking, each pixel gets
a fresh draw from the noise distribution every frame. That is shimmer, by
construction.

This is also why it survived Wave 5: **`npm run shoot` captures still frames, so
this entire bug class is structurally invisible to the existing harness.** Any
still screenshot of a noisy-but-static AO field looks fine.

### Mitigation ladder (cheapest first)

1. **`neuralDenoise: true`**, or the `Neural-Low` / `Neural-Medium` / `Neural-High` quality modes. The README states neural denoising "enhances temporal stability and sharpens contact shadows", letting **4–8 samples** produce "much cleaner and more stable AO while retaining small geometric details". This is the highest-leverage single change: better stability *and* fewer samples.
2. **Raise `aoSamples`.** `setQualityMode` presets: `Performance` 8/4, `Low` 16/4, `Medium` 16/8 (default), `High` 64/8, `Ultra` 64/16 (aoSamples/denoiseSamples). Moving from Medium to High is a pure noise-vs-cost trade.
3. **Tune the denoise pair deliberately, and understand the trap.** The README's advice for minimising flicker — `denoiseRadius = 0`, `denoiseSamples = 1` — is *for the accumulation path*: it keeps the AO unblurred so the stability comes purely from temporal accumulation. **Applying that setting while the player is walking is the worst possible configuration**, because accumulation is off and you have also disabled the spatial blur. Either accumulate (still camera, radius 0) *or* denoise spatially (moving camera, radius > 0) — the harness must test the moving case, and the setting must be chosen for the moving case.
4. **`halfRes: true` + `depthAwareUpsampling: true`.** 2–4× faster; "temporal stability is slightly reduced"; depth-aware upsampling costs a fixed ~1ms and the effect "looks horrible without" it. Note the README's own finding: **half-res at `Ultra` is slightly slower than full-res at `Performance` but produces significantly better results** — so if you are going to spend the frame, spend it on half-res-high-quality rather than full-res-low-quality. That is a direct, cited answer to a tuning question COMP_CARD's degrade ladder currently guesses at ("AO off → tilt-shift half-res → bloom half-res").
5. **`screenSpaceRadius: true`** (radius in pixels, 16–64 recommended) is worth testing on an ortho camera specifically: with a fixed ortho zoom, a screen-space radius is *constant in world units*, which removes one source of frame-to-frame variation that a world-space `aoRadius` can introduce at grazing angles.
6. **Lower `intensity`.** AO is applied as `pow(ao, intensity)` — a high intensity **amplifies the noise as well as the effect**. If AO intensity was pushed for the Severance look, that is a noise multiplier.
7. **TAA:** not recommended. A full temporal AA pass over an ortho pixel-crisp look will smear the lacquered-miniature aesthetic and adds a fifth full-screen pass against a ≤4 budget. N8AO's own accumulate/neural paths are the targeted version of the same idea.
8. **WebGPU/TSL note:** an [N8AO WebGPU/TSL port exists](https://github.com/marioandf/n8ao-webgpu). Consistent with COMP_CARD's L0 ruling, this is a future watch, not now.

### Do not stop at AO

Frozen-camera bursts (§1.4) will tell you in one run whether AO is even the
culprit. Other candidates that produce walk-correlated flicker, all testable the
same way by toggling one pass:

- **A time-animated dither/grain pass.** RetroPass (Bayer dither + 5-bit quantize + grain) and any grain in GradePass: if the noise is driven by a `time` uniform it is *deliberately* different every frame, which is flicker by construction. It must be off by default (COMP_CARD says RetroPass is), and the harness must assert it is off during a flicker run, or mask it.
- **Shadow-map flicker on moving geometry.** Well documented: moving models cast shadows that "twitch or flicker" with `DirectionalLight`, worse at low `mapSize`; tightening the shadow frustum (`shadow.camera.left/right/top/bottom`) usually helps more than raising resolution ([three.js #18521](https://github.com/mrdoob/three.js/issues/18521), [forum: directional light flickering with shadows](https://discourse.threejs.org/t/directional-light-flickering-issues-with-shadows/54884), [forum: moving the shadow frustum with the camera](https://discourse.threejs.org/t/moving-directionallight-shadow-frustum-with-camera/2700), [sbcode](https://sbcode.net/threejs/directional-light-shadow/), [DEV: mastering shadows in three.js](https://dev.to/outriding/mastering-shadows-in-threejs-setup-configuration-and-optimization-39nn)). **If the shadow frustum follows the player, every step re-quantises the shadow texel grid and the shadow edges crawl.** The standard fix is texel-snapping the shadow camera: round the shadow camera's position to whole shadow-texel increments so the grid does not slide between frames. This is a strong candidate for a follow-camera game and is *not* AO.
- **Z-fighting on `PlaneGeometry` overlays.** The project already has a documented gotcha about this (CLAUDE.md: screens flush against box faces flicker). Flicker that appears while walking may simply be a marginal-depth overlay becoming visible at certain camera offsets. The frozen-burst test at multiple player positions finds these.

---

## 1.8 Walking-stutter causes and how to instrument each

Ranked by likelihood for this codebase, each with the specific probe that
confirms or clears it. This is the table an autonomous agent should work top to
bottom.

| # | Cause | Confirming signal | Fix pattern |
|---|---|---|---|
| 1 | **Shader compile mid-play** (new material/light combination entering the frustum; a light added or removed) | `renderer.info.programs.length` increments at the hitch frame (A2); trace shows a long GPU-process/`v8` block at that timestamp | `renderer.compileAsync(scene, camera)` (or `compile`) during the room-transition wipe; never add/remove lights at runtime — use `light.visible = false` / `intensity = 0`, because adding/removing lights forces the renderer to **recompile all shader programs** ([Discover three.js: Big List of Tips](https://discoverthreejs.com/tips-and-tricks/), [utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips), [forum: reducing shader compile time](https://discourse.threejs.org/t/reducing-shader-compile-time-on-scene-initialization/56572)). One report: **~3.5s** of init stall from compiling many `MeshPhysicalMaterial`s with shadows — and MaterialLibrary v2 introduced physical/clearcoat tiers, so this project just walked into that risk area. |
| 2 | **Texture upload hitch** (first time a `CanvasTexture` is drawn — procedural normals, monitor screens, FacePainter faces) | A2 `memory.textures` increments at the hitch frame; the upload pipeline is a multi-stage init/convert/allocate/transfer path ([DeepWiki: three.js texture management](https://deepwiki.com/mrdoob/three.js/3.4-shadow-mapping)) | Warm every texture during the transition (render offscreen once, or `renderer.initTexture(tex)`); build canvas textures at room-load, never lazily on first sight |
| 3 | **Per-frame allocation → GC** | A4 heap sawtooth + hitch/GC correlation ratio; A3 LoAF `scripts[].sourceFunctionName` names the function | Pool/reuse: scratch `Vector3`s hoisted to module scope, no `.clone()` in `update()`, no array/object literals per frame, no closures per frame. The cited WebGL case dropped 11 frames from one per-frame texture allocation ([whenderson.dev](https://whenderson.dev/blog/webgl-garbage-collection/)) |
| 4 | **Shadow map re-rendered every frame** | Compare frame time with `renderer.shadowMap.autoUpdate = false`; `renderer.info.render.calls` roughly halves when shadows stop re-rendering (every caster is drawn again per shadow map) | For a static office: `shadowMap.autoUpdate = false` + `shadowMap.needsUpdate = true` only when something changed; keep `mapSize` as low as the look allows and the shadow frustum as tight as possible ([three.js docs: WebGLRenderer.shadowMap](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap), [Discover three.js](https://discoverthreejs.com/tips-and-tricks/)) |
| 5 | **Geometry rebuild / churn while walking** (near-wall auto-fade rebuilding meshes, LOD swaps, `EntityManager` show/hide churn) | A2: `render.calls` or `memory.geometries` *varies* frame to frame in a steady room | Toggle `visible`/material opacity instead of rebuilding; cache built geometry |
| 6 | **Post-chain fill-rate** (4 full-screen passes at native res on a high-DPI display) | Resolution sweep at fixed CPU throttle (§1.3): cost scaling ~linearly with pixel count ⇒ fill-rate bound, not CPU bound. A5 GPU timer confirms per-pass | The COMP_CARD degrade ladder; cap `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))` — or 1.5 |
| 7 | **DOM/UI thrash** (the HUD is DOM: `UIManager`, quest tracker, `FloatingText`, `updateBuffStatus`) | `Performance.getMetrics` diff shows non-trivial `LayoutDuration`/`RecalcStyleDuration`; LoAF entries report a `styleAndLayout` phase, not script | Batch writes, avoid layout-reading properties per frame, `transform`/`opacity` only, `will-change` on moving elements. Easy to overlook in a "3D perf" hunt and a real cause of walk-correlated jank because the HUD updates as the player moves |
| 8 | **vsync/rAF pacing** (bimodal 16.7/33.3 histogram) | A1 histogram is bimodal rather than long-tailed | This is "just over budget" — the frame occasionally misses vsync and doubles. Fix by reducing mean frame time, not by hunting a hitch. **Diagnosing #8 as #1–#5 wastes the most agent time**, hence the histogram-shape requirement in A1 |

---

## 1.9 Concrete harness design

### Files

```
tools/perf.mjs                  # Playwright driver (sibling of shoot.mjs)
tools/perf-probe.js             # injected via page.addInitScript — NOT shipped
                                # (see §1.10: window.__engine already exposes
                                #  everything, so no src/ change is needed)
.claude/plans/perf-baseline.json# committed per-room baselines (like balance.json)
screenshots/perf/               # burst frames + odiff masks + index.html
.claude/plans/perf-report.md    # generated, ≤200 lines, the agent's read target
```

### npm packages

```bash
npm i -D odiff-bin              # SIMD image diff (Windows install must be verified)
npm i -D stats-gl               # optional: GPU timer panel for human sessions
# playwright@^1.60 already present
# optional MCP (not in the loop): npx -y chrome-devtools-mcp@latest
```
Everything else (`PerformanceObserver`, `performance.memory`, `renderer.info`,
`OffscreenCanvas`, CDP via `context.newCDPSession`) is platform, no dependency.

### Measurement protocol (what `node tools/perf.mjs` does)

```
0. PRECONDITIONS
   - dev server up (reuse shoot.mjs's check); launch headed by default
     (--headless opt-in, and it stamps the report RELATIVE-ONLY)
   - GPU gate: read UNMASKED_RENDERER_WEBGL, record it, warn on software
   - fixed viewport 1920x1080, fixed devicePixelRatio, fixed seed
   - assert RetroPass off, assert no dialog/menu open, hud=0

1. WARM-UP (per scene, discarded)
   - enter the room via ?dev&fixture=act7&shot=<room>, wait __shotReady
   - hold 120 frames idle so shader compiles + texture uploads land in warm-up,
     not in the measurement (and record how many programs/textures appeared
     during warm-up — that count IS the "first visit hitch" budget)

2. TIMING RUN (per scene, 600 frames ~10s)
   - __perf.start()
   - scripted walk: keyboard.down('ArrowUp') hold 2s, up; right 2s; down 2s;
     left 2s; then a diagonal; then 2s idle
     (the walk must be identical every run — the whole method depends on it)
   - __perf.stop() -> JSON: frame histogram, renderer.info series, LoAF entries,
     heap series, correlation stats
   - CDP Performance.getMetrics diff across the window

3. CONDITIONAL TRACE
   - if hitchesPerSecond > threshold OR any frame > 50ms:
     re-run step 2 with Tracing.start(categories), save trace to disk,
     extract only: top 20 longest toplevel/v8 slices, GC events, program-compile
     slices, GPU-process blocks -> append to report. Never inline the trace.

4. FLICKER RUN (per scene, separate pass)
   - freeze: pause tweens/animators, hold time uniforms, camera fixed
   - 60 frames, in-page 64x64 fingerprint -> sad[] (expect all zeros)
   - if any sad > 0: full-res page.screenshot() burst of 12 frames around the
     worst indices -> odiff (ODiffServer, antialiasing:true) -> masks + counts
   - repeat with setDisplayMode('No AO'), then with each post pass disabled,
     to auto-attribute the flicker to a pass
   - then a MOVING flicker pass: constant-velocity walk, per-tile SAD second
     derivative, report the worst tiles as (x,y,w,h) rects

5. THROTTLE SWEEP (once, on 3 representative scenes)
   - Emulation.setCPUThrottlingRate 1, 2, 4  x  720p/1080p/1440p
   - report the 3x3 grid of fps_p50: CPU-bound vs fill-rate-bound falls straight
     out of the shape of the grid

6. SOAK (once)
   - 60s of continuous walking in one room; assert memory.geometries,
     memory.textures, programs.length, JSHeapUsedSize are all FLAT

7. REPORT
   - write perf-report.md (<=200 lines) + update/compare perf-baseline.json
   - exit code: 0 pass, 1 budget violation, 2 harness failure (GPU gate etc.)
```

### Budgets to assert (from COMP_CARD, made testable)

| Metric | Budget | Source |
|---|---|---|
| `fps_p50` @ throttle 1 | ≥ 60 | COMP_CARD |
| `fps_p50` @ throttle 2 ("mid laptop") | ≥ 60 | COMP_CARD, proxy defined here |
| `fps_p50` @ throttle 4 ("mobile floor") | ≥ 30 | COMP_CARD, proxy defined here |
| `p99` frame time | ≤ 2× p50 | this report |
| `hitchesPerSecond` | ≤ 0.2 (1 hitch / 5s) | this report — tighten once a baseline exists |
| `render.calls` room / combat | ≤ 300 / ≤ 150 | COMP_CARD |
| full-screen post passes | ≤ 4 | COMP_CARD |
| frozen-burst nonzero-diff frames | **0** | this report |
| soak: textures/geometries/programs growth | 0 | standard leak test |

### Why this is autonomous

Every output is a number with a committed baseline, so an agent can (i) run it,
(ii) read a ≤200-line report, (iii) get a *named function* from LoAF or a *named
pass* from the display-mode bisection, (iv) fix, (v) re-run and prove the delta.
No screenshots need human judgement except the odiff masks, which are exactly
what the existing contact-sheet critic pattern already handles.

### What NOT to build

- Don't diff every frame at full res — cost dwarfs the bug.
- Don't build on `HeadlessExperimental.beginFrame` (unavailable in new headless, and it changes the pacing you're measuring).
- Don't wire Spector.js into the loop (one manual audit instead).
- Don't build the gate on an MCP server (non-deterministic, unversioned).
- Don't report a mean fps. Ever.
- Don't trust any fps number without the `UNMASKED_RENDERER_WEBGL` string next to it.

---

## 1.10 Grounded in *this* codebase — audited hotspots and ranked hypotheses

*A code audit was run alongside the web research. Line numbers verified against
the `display-case` working tree, 2026-07-29. This section is what turns the
generic research above into a work order.*

### Two findings that change the harness design

**(1) The harness needs zero source changes.** `window.__engine = this` already
exists at `src/core/Engine.js:43-45` (gated on `?dev`), and transitively exposes
`renderer`, `composer`, `scene`, `camera`, `_n8aoPass`, `_bloomPass`,
`_tiltShiftPass`, `_gradePass`, `_retroPass`, `_dirLight`, `_roomFX`, plus
`start()`, `stop()`, `renderScene()`, `setAmbientOcclusion()` (`:211`),
`setTiltShift()` (`:215`), `setRetroPass()` (`:202`).

So **`src/utils/PerfProbe.js` should not be a committed source file.** Make it a
string injected by `tools/perf.mjs` via `page.addInitScript`, which monkey-patches
the single choke point:

```js
// injected, not committed. Every render path goes through composer.render().
const orig = __engine.composer.render.bind(__engine.composer);
__engine.composer.render = (...a) => { const t0 = performance.now();
  orig(...a); __perf.sample(t0, __engine.renderer.info); };
```
Nothing ships, nothing needs `DEV_MODE` gating, nothing can regress a player's
frame. This supersedes the `src/utils/PerfProbe.js` line in §1.9. (Verified: all
five render entry points — `Engine.js:1017`, `ExplorationState.js:2617`,
`CombatState.js:2076`, `ArcadeState.js:1231`, `main.js:131` — go through the
composer; nothing calls `renderer.render` directly.)

**(2) The frozen-camera flicker rig already exists.** `tools/cine-shoot.mjs`
already does deterministic frame stepping: `__engine.stop()` (`:143`), hand-stepped
`scene.update(1/60)` / `cine.update` / `particles.update` in a guard loop
(`:150-160`), explicit `__engine.renderScene(...)` (`:161`, `:198`), then
`start()` (`:203`). `__engine.stop()` freezes *everything* — including all the
non-shader temporal noise catalogued below. **So the strongest possible flicker
test is ~30 lines on top of an existing tool: `stop()`, then call `renderScene()`
twice with no state advanced at all, and diff. Any nonzero diff is renderer
nondeterminism — no masking, no thresholds, no judgement.** Then step 1 frame and
diff again to separate "noisy" from "animated". Build this first; it is the
cheapest high-confidence result in the whole plan.

### Ranked hypotheses for the reported flicker + stutter

**FLICKER — H1: N8AO under-sampled and over-amplified.** Audited config,
`src/core/Engine.js:147-166`:

| Setting | Value | Assessment |
|---|---|---|
| `aoSamples` | **8** (`:155`) | = the `Performance` preset's sample count (8/4). Lowest tier. |
| `denoiseSamples` | 8 (`:156`) | = `Medium`'s denoise. Hand-rolled 8/8 mix, no `setQualityMode()` call anywhere. |
| `denoiseRadius` | **12** (`:157`) | Heavy spatial blur compensating for the low sample count. |
| `intensity` | **7.5** (`:151`) | Applied as `pow(ao, intensity)`. The README's own "prominent" example is **5**. **This amplifies the noise as hard as it amplifies the effect.** |
| `halfRes` | **true** (`:159`) | Halves the sample density again. `depthAwareUpsampling` is *not* set — verify the installed `n8ao@2.x` default before assuming it's on. |
| `aoRadius` | 1.5 (`:151`), world-space | `screenSpaceRadius` unset → radius varies in screen terms. On a fixed-zoom ortho camera, `screenSpaceRadius: true` (16–64px) is worth A/B-ing. |
| `accumulate` | unset | Correctly so — see §1.7. |
| `neuralDenoise` | **unset** | **The highest-leverage single change available.** |

Fix order to try: `neuralDenoise: true` (or `setQualityMode('Neural-Medium')`) →
drop `intensity` toward 4–5 → raise `aoSamples` to 16 → then re-evaluate whether
`denoiseRadius` 12 can come down (a smaller radius preserves the contact shadows
COMP_CARD's grounding depends on). Note AO is force-disabled unless the frame is
exactly `Engine.scene` + `Engine.camera` (`Engine.js:236-239`), so **AO never runs
in combat** — consistent with COMP_CARD's ortho gate, and it means this hypothesis
predicts flicker in exploration only. That is a testable discriminator: if combat
also flickers, H1 is not the whole story.

**FLICKER — H2: quantize/dither crawl.** Confirmed *not* active by default:
`RetroPass` is the only time-animated noise (`src/effects/RetroPass.js:15` `time`
uniform, `:55` time-seeded film grain hash), and its Bayer 4×4 dither (`:33-44`,
`:61-62`) is screen-space and **not** time-animated — but the 6-bit quantize
boundary crawls under camera motion, which the file itself documents at `:58-60`.
`Engine.js:132-135` sets `strength = 0`, `enabled = false` unless 1998 mode is on.
`GradePass` and `TiltShiftPass` are fully deterministic (no `time` uniform, no
grain, no dither). **So: if the producer had 1998 MODE on, the flicker is
explained and the fix is one settings toggle.** Confirm that before spending a
session on AO. (Cosmetic note: `Engine.js:1000` increments the `time` uniform even
while the pass is disabled — harmless, but tidy it.)

**FLICKER — H3: non-shader randomness a naive frame-diff will blame on the
renderer.** All of these must be frozen (`__engine.stop()` handles it) or the
flicker harness will produce false positives forever:
- `Engine.js:992-997` — fluorescent hum, `Math.sin` **plus `Math.random() < 0.0015` random buzz-dip** multiplying `_dirLight.intensity`. Active in the 4 rooms with `lighting.flicker` (`src/data/rooms/index.js:41, 834, 1040, 1877`). **A random global light-intensity dip is literally a flicker — in those four rooms it is intended, and it will also mask a real one.** Test those rooms with flicker disabled.
- `src/effects/CityBackdrop.js:844-889` — beacon pulses, drifting light-trail streaks, cloud shadows, mist breathing, all keyed on accumulated time, running **every frame in every state** (`Engine.js:999`).
- `src/entities/CharacterAnimator.js:139`/`:278` — random blink interval per character. `src/world/IsometricCamera.js:69-70` — `Math.random()` camera shake. `src/entities/NPC.js:138` — random wander target.

**STUTTER — S1 (biggest free win): the 2048² shadow map is fully re-rendered
every frame.** `shadowMap.enabled = true`, `PCFShadowMap` (`Engine.js:55-56`).
Exactly **one** shadow-casting light in the entire game — `dirLight`
(`Engine.js:301-315`): `castShadow` (`:303`), `mapSize 2048×2048` (`:304-305`),
fixed 40×40 ortho frustum, near 0.5 / far 50 (`:306-311`), `bias -0.001`,
`radius 4` (`:312-313`). Room point lights never cast (`Room.js:170`,
`Engine.js:612-615`).

**`shadow.autoUpdate` / `shadowMap.autoUpdate` / `shadowMap.needsUpdate` appear
nowhere in `src/`** — the default `true` stands, so the full 2048² map is
re-rendered every frame over every caster. And the caster set is huge:
`castShadow = true` occurs ~120 times in `src/world/Furniture.js` (mostly
`group.traverse(c => c.castShadow = true)` covering whole subtrees), plus
`Room.js:286` (floor zones), `:465` (railings), `:806` (door frames). `cubicle_farm`
has **136 furniture entries** (then `archive` 46, `server_room` 45,
`executive_floor` 44; 747 entries across 26 rooms).

Every one of those is drawn a second time, every frame, into a shadow map whose
light never moves and whose furniture never moves. Options, cheapest first:
1. `shadowMap.autoUpdate = false` + `needsUpdate = true` every 2nd or 3rd frame. With `radius 4` PCF soft shadows, character shadows updating at 20–30Hz is very hard to see, and it cuts the shadow cost by 2–3×.
2. Better: `castShadow = false` on static furniture and bake their contact grounding into the existing authored fakes (`_roomFX` blob/gloss textures already do exactly this kind of work — `Engine.js:768`, `:785`). Then autoUpdate can stay on with a tiny caster set.
3. Drop `mapSize` to 1024 and *tighten the 40×40 frustum to the current room's bounds* — the community consensus is that tightening the frustum beats raising resolution ([three.js #18521](https://github.com/mrdoob/three.js/issues/18521), forum threads in §1.7). A 40-unit frustum on a small room is wasting most of its texels.
- Good news: the light does **not** follow the player, so there is no texel-crawl flicker from a sliding shadow frustum. If option 3 is taken and the frustum starts tracking the room, **texel-snap the shadow camera** or that flicker will be introduced.

**STUTTER — S2: `_showInteractPrompt` rebuilds `innerHTML` every single frame.**
`ExplorationState.js:2587-2606` calls it in every branch of `update(dt)`;
`_showInteractPrompt` (`:2021-2027`) rebuilds an `innerHTML` template string
(`:2024`) and re-runs `classList.toggle` **every frame even when the text has not
changed** → per-frame string allocation + HTML parse + forced style work. This is
§1.8 cause #7 (DOM thrash), confirmed, and it is **walk-correlated** because it
fires whenever the player is near anything. Fix: early-return if the text is
unchanged. One line, and it is the cheapest stutter fix in the file.

**STUTTER — S3: room resources are leaked on exit — a monotonic VRAM leak.**
`RoomManager._clearCurrentRoom()` (`src/world/RoomManager.js:110-119`) only calls
`scene.remove()`. **`Room.dispose()` exists at `src/world/Room.js:888-893` and is
never called by anything in the repo.** Worse, `RoomManager.js:42`
(`this.rooms[roomId] = room`) keeps a permanent map that is overwritten on
re-entry, orphaning the previous room's geometries and materials with no dispose.
For scale: `Furniture.js` contains **581 `new THREE.*Geometry`, 578 `new
THREE.Mesh`, 87 `new THREE.*Material`** call sites; `cubicle_farm` builds 136
entries per entry. Room-hopping therefore grows GPU memory without bound.

This is a real shipped bug, not just a test-harness problem — and **it is a strong
candidate for the producer's report**, because a leak presents exactly as "it gets
stuttery the longer I play", which a fresh-load screenshot pass can never
reproduce. It is also why §1.9's soak test (`memory.geometries` /
`memory.textures` flat over 60s) should be run *first*: it will fail immediately
and give a concrete fix before any AO tuning happens.

**STUTTER — S4: post-chain fill rate.** The composer chain is longer than the
COMP_CARD budget once you count sub-passes: `RenderPass` (disabled when AO is on,
`Engine.js:239`) → `N8AOPass` (`insertPass(pass, 1)`, `:165`) → `UnrealBloomPass`
(strength 0.46 / radius 0.5 / threshold 0.8, `:100-107`, itself multi-mip) →
`TiltShiftPass` (**2-pass separable H+V blur plus an extra render target** —
`TiltShiftPass.js:112`, `:128`, `:134`) → `GradePass` → `RetroPass` (off). That is
AO + bloom-mips + tilt-H + tilt-V + grade — **at or over the "≤4 full-screen
passes" budget**, before RetroPass exists.

And it is all at up to 2× DPR: `composer.setPixelRatio(Math.min(devicePixelRatio, 2))`
(`Engine.js:95`, `:98`). On a HiDPI laptop that is 4× the pixels through the whole
chain. Two cheap experiments: cap at 1.5, and half-res the tilt-shift blur (its
output is a blur — half-res is nearly free visually and is already COMP_CARD's
step 2 in the degrade ladder).

Also: `antialias: true` on the WebGLRenderer (`Engine.js:49-52`) allocates MSAA on
the **default framebuffer, which the scene never renders into** (the composer owns
rendering). Verify and likely remove — free memory and bandwidth.

**STUTTER — S5: confirmed per-frame allocations (GC churn).** Ranked:
- `ExplorationState.js:2543` — `InputManager.getMovementVector()` returns a fresh `{ x, z }` every frame (`src/core/InputManager.js:75`). Return into a reused scratch object.
- `ExplorationState.js:2580` — `_getNearbyTargets()` (`:1425`) returns a fresh `{ exit, interactable }`, and `:1416`/`:1420` allocate `{ x, z, data }` whenever the player is near an exit or interactable (i.e. constantly). Up to 3 objects/frame.
- `ExplorationState.js:2592`/`:2600` — `` `read_${dialogId}` `` template string allocated every frame while near an NPC.
- `ExplorationState.js:2513` — a `document.getElementById('dev-panel')` DOM query every frame (DEV_MODE only, but it is in the measured path — the harness must account for it or it will measure its own overhead).
- `CharacterAnimator.js:113`/`:341` — `lerpPose()` allocates an 8-key object per posed character per frame, ×2 with an active gesture (`:125`). **Combat-only** (early-out at `:337`), so it does not explain walking stutter, but it is real for the Clair Obscur cinematics.
- Clean, verified allocation-free: `IsometricCamera.update()` (`:44-85`), `Player.move`/`update` (`src/entities/Player.js:47-85`), `Engine._configurePostFor`/`_keyTiltShiftToRoom` (`:224-278`, cached `this._tsVec` at `:258`). Note `Engine.js:985` re-closures the rAF callback each frame (`requestAnimationFrame(() => this._loop())`) — trivial, but free to hoist.

**STUTTER — S6: two conflicting wall-fade systems fight every frame.**
`_updateWallFade(dt)` (`ExplorationState.js:642-657`, called at `:2511`) fades both
walls with a dt-eased lerp; then `:2547-2569` **overwrites both
`material.opacity` values with a different, non-eased formula** (0.15 floor vs
0.16, a 3.5-tile trigger vs a 3-tile ramp). This is a correctness bug (the eased
version never wins) as well as duplicated per-frame work. Delete one. Related:
`Room.js:387`/`:398` `mesh.material.clone()` per wall segment on every build —
needed for the fade, but uncached.

**Lower priority, noted:** `Engine.applyRoomFX()` (`Engine.js:357-722`) rebuilds
the entire lighting overlay per room load, allocating fresh `PlaneGeometry` at
`:494`, `:576`, `:590`, `:629`, `:702` (whereas `:452` correctly shares one). It
*does* dispose the previous group (`:359-366`), and all seven `_fx*Texture`
canvas-texture builders are properly memoized (`:726`, `:750`, `:768`, `:785`,
`:808`, `:833`, `:885`; `_fxFrameTexture` caches per `WxH` at `:913-940`). This is
a room-transition cost, not a walking cost — but per §1.8 #1/#2 it is exactly
where first-visit shader-compile and texture-upload hitches will land, so warm-up
must happen during the transition wipe. Also relevant: `MaterialLibrary.js:200-202`
explicitly refuses to cache any material carrying `opts.map`, so every mapped
material is fresh — worth a second look now that ProceduralNormals exists.

### Recommended order of work

1. **Ask the producer whether 1998 MODE was on.** One question, may end the flicker investigation (H2).
2. **Build the double-render flicker test** on top of `cine-shoot.mjs`'s existing `stop()`/`renderScene()` rig (~30 lines). Run per room. Any nonzero diff, with the AO on/off A/B via `setDisplayMode('No AO')` or `setAmbientOcclusion(false)`, attributes the flicker in one pass.
3. **Fix S3 (the room leak).** It is a shipped bug, it is cheap (`Room.dispose()` already exists), and it is the most likely explanation for stutter that worsens over a session.
4. **Fix S2** (one-line `innerHTML` early-return) and **S6** (delete the duplicate fade). Both cheap, both walk-correlated.
5. **Build `tools/perf.mjs`** per §1.9, with the injected-probe design above and a committed `perf-baseline.json`. Run headed on the 3090.
6. **Then** tune: S1 shadow autoUpdate, S4 pixel ratio + half-res tilt-shift, H1 N8AO neural denoise + intensity. In that order — S1 and S4 are pure wins, H1 is a look change that needs Alex's eye.

---

# TOPIC 2 — img2threejs

## 2.1 What it is (verified)

**Not a dead project. Not tiny.** Verified directly from the GitHub API on
2026-07-29:

| Field | Value |
|---|---|
| Repo | `img2threejs/img2threejs` (also reachable as `hoainho/img2threejs`) |
| Stars | **8,231** |
| Forks | 625 |
| Created | **2026-07-15** (14 days old) |
| Last push | 2026-07-29 (same day as this research) |
| License | **Apache-2.0** |
| Language | Python (tooling); **emits TypeScript** |
| Version | 1.4.3 |
| Open issues | 38 |
| Topics | `image-to-3d`, `procedural-generation`, `threejs`, `claude-code`, `ai-agents`, `webgl` |

**It is not a library and not a model. It is a Claude Code skill** — `SKILL.md`
sits at the repo root with `name: img2threejs`, and install is literally
`git clone … ~/.claude/skills/img2threejs`, invoked as
`/img2threejs <instructions>` with an attached image. The Python side
(`forge/`, stdlib-only, Python 3.10+, nothing to `pip install`) is **deterministic
validation and gating**; the *vision judgement and the code writing are done by
the host agent* — i.e. by Claude, on Alex's own tokens. There is no external API,
no model download, no cloud service, no per-asset fee.

## 2.2 What it actually does

> "Rebuild the object visible in a reference image as a **code-only** procedural
> Three.js model … This is reconstruction-by-code, **not** photogrammetry, mesh
> extraction, or downloaded art packs."

Output: a **TypeScript factory returning a `THREE.Group`**, plus an
`ObjectSculptSpec` JSON. Both text, both diffable, both extendable in-repo. The
group carries a runtime hierarchy — pivots, sockets, colliders, and a
`userData.tick` for a looping idle — so it is animatable rather than an inert lump.

Pipeline (staged, gated, self-correcting, one pass at a time):
`blockout → structural → form → material → surface → lighting → interaction → optimization`,
with a **render-vs-reference vision review after every pass** and a hard
`detailInventory` gate (every identity-defining detail — bevels, seams,
fasteners, engraved linework, gloss/matte zones, wear — must map to a real
component or material entry before code generation is allowed). `forge/next.py`
reports the current unlocked pass and unmet acceptance criteria, which is what
makes it drivable by an agent without hand-holding.

Shipped: v1.0 object pipeline · v1.1 detail inventory + strict-quality gate ·
**v1.2 humanoid character generator (anatomy track, proportion-lock,
feature-placement)** · v1.3 deterministic review harness, geometry-truth gates,
**CIEDE2000 colour math** · v1.4 CS2 weapon reconstruction · creature generator
(4 body plans). Subjects are classified `object | character | hybrid`; characters
route through an anatomy-aware track (**head-unit proportions**, facial
landmarks, pose) in `grimoire/character/reconstruction.md`, with an opt-in
"likeness maximization" path that fits a parametric template to image landmarks,
**de-lights the photo, camera-matches the render, and projects the reference onto
the mesh**, reporting **per-region confidence**.

In progress / future: **v1.5 The Character Update** (facial features,
rigging-ready topology, blendshapes, hair and clothing) — *in progress, not
shipped*. **v1.6 The Environment Update** (buildings, rooms, streets,
multi-object) — future.

## 2.3 Quality bar — measured, not claimed

I pulled the actual generated files from the showcase repo
(`img2threejs/img2threejs-showcase`) and counted:

| Demo | Lines | `new THREE.Mesh` | Materials | Merging? |
|---|---|---|---|---|
| Crowned Loot Chest | 318 | **16** | 4× `MeshStandardMaterial` + 1× `MeshPhysicalMaterial` | none |
| Doraemon House (whole iso diorama) | 1,056 | **53** | 5× `MeshStandardMaterial` | 2 refs to merge/instancing |
| Glock-18 Ghost Protocol | ~52KB source | — | — | — |

Geometry vocabulary is exactly this project's own: `BoxGeometry` ×13,
`SphereGeometry` ×12, `CylinderGeometry` ×8, `CapsuleGeometry` ×5,
`PlaneGeometry` ×3, `TorusGeometry`, `IcosahedronGeometry`, `ConeGeometry`,
`ExtrudeGeometry` — plus procedural canvas textures and occasional
`ShaderMaterial`. This is *the same construction language as `Furniture.js` and
`CharacterBuilder.js`.*

Three hard numbers that matter:

1. **~16–25 draw calls per prop.** Directly comparable to the project's own v5 characters (23–32 calls each, per HANDOFF). One hero prop is affordable. **Ten of them is 200 draw calls and blows the ≤300 room budget by itself.** Any adopted prop needs a merge pass (`BufferGeometryUtils.mergeGeometries` on same-material parts) before it enters a populated room — and the generated code does not do that for you (the chest had zero merging).
2. **Wrong material tier.** Output is `MeshStandardMaterial` / `MeshPhysicalMaterial` with its own inline material construction. This project is `MeshToonMaterial` via a **cached** `Materials.toon()` factory, and COMP_CARD's whole rendering strategy is per-material stylization control. Every adopted model needs a **material remap pass** to MaterialLibrary v2 — otherwise it (a) looks like a different game, (b) bypasses the cache, (c) risks the physical-material shader-compile cost flagged in §1.8 #1.
3. **Honest self-assessment, which I'll take at face value because it matches the measurements:** *"It is strong for hard-surface objects; characters are stylized reconstructions, not photoreal likeness."* And: *"'This cannot reach the requested fidelity from this image' is a valid, expected result."* The SKILL.md goes further, with a rule against over-claiming and a worked example of a gate passing while the render still "reads as toy" — *"2D gates are blind to 3D realism."* That is an unusually candid tool, and it is the correct calibration to plan against.

Caveats on the popularity signal: 8.2k stars in 14 days on an agent-skill repo, with a Trendshift badge and a donate page, is a **hype curve, not a track record**. 38 open issues, v1.5 in progress, and an ambitious roadmap (Unity/Unreal exporters, auto-rigging, procedural cities by v2.0) all point to a young project moving fast. Pin a commit if you adopt it.

## 2.4 Licensing

**Apache-2.0** for the skill and its scripts. Permissive, commercial-use-safe,
attribution-in-NOTICE only, includes a patent grant. **No license attaches to the
output** — the generated code is written by your own agent in your own repo, on
your tokens. There is no cloud ToS, no "generated asset" license class, and no
attribution requirement on the models. For a commercial itch.io release this is
the cleanest possible licensing position — cleaner than *any* generative-3D
service.

## 2.5 Use case (a): fixing characters from the 2D dialog portraits

The setup is unusually favourable. `art/CHARACTER_BIBLE.md` is already LAW,
canonical identity is already defined as `src/assets/portraits/<id>.png`, and the
HANDOFF punch list is already **pixel-measured** in exactly the vocabulary
img2threejs uses: head-units (6.5–7.3 adults; grandma at 3.6 is "a lone chibi"),
jaw taper (~15% below cheekbones), silhouette, arm length (fingertips to
mid-thigh). img2threejs's character track is head-unit proportions + facial
landmarks + per-region confidence, and its likeness path de-lights and
camera-matches the reference before projecting. That is a genuine capability
match, not a coincidence — and the portraits are already the exact input format
it wants (one clean reference image per subject).

**But:** v1.5, the update that adds facial features, rigging-ready topology,
blendshapes, hair and clothing, is **in progress**. Shipped today is v1.2's
anatomy track. Meanwhile `CharacterBuilder v5` + `FacePainter v5` already exist,
already have six working expressions, glasses-as-geometry, scalp-conforming hair,
36 configured humans, a `GESTURES` animation table, and a combat/room detail tier.
**A generated `THREE.Group` factory does not plug into any of that.** It has no
`group.leftLeg` / `group.body` refs for `CharacterAnimator`, no `legLength` for
sitting, no `FacePainter` texture swap for expressions, no `options.detailed`
tier. Adopting a generated character wholesale means re-implementing the entire
animation and expression layer around it.

**Verdict on (a): do not replace CharacterBuilder. Use img2threejs as a
measurement and critique instrument instead.**

The highest-value, lowest-risk play is to run its *intake and review* stages
without adopting its output geometry:
- `grimoire/intake/image_analysis.md`'s layered observation protocol + the
  `detailInventory` gate, run against each portrait, produces a **structured,
  enumerated list of identity-defining features per character** — precisely the
  artifact the round-2 critic notes are hand-producing today (backwards cap,
  stubble band, chain, squared jaw for Chad; asymmetric platinum bob with dark
  underlayer for Karen).
- Its **CIEDE2000 (ΔE00) colour gates** are directly reusable to settle
  "unify face/head skin albedo (porthole seam)" and "rebuild bob per portrait"
  as *numbers* rather than opinions — a real upgrade to the critique loop, and
  it composes with the existing `character-overrides.json` colour layer.
- Its per-region confidence reporting is the right shape for a punch list.

Then, selectively, use generated geometry for **isolated sub-parts** where v5 is
weakest and animation doesn't reach: Karen's bob shell, Chad's cap, Grandma's
glasses/hair shell, the prop grips ("contact not grasp at 3×+"). A generated hair
shell is a static child mesh parented to `group.head` — that *does* plug in,
cleanly, today.

## 2.6 Use case (b): props and furniture

**This is the strong fit.** Hard-surface objects are img2threejs's best-documented
strength and the whole `Furniture.js` static-factory pattern is a perfect
structural match: one function, returns a group, registered in the
`_placeFurniture()` switch, footprint added to `FURNITURE_FOOTPRINTS`. A
generated factory is ~90% of that shape already; the integration work is
mechanical (TS→JS, material remap, blocking flags, footprint).

Where it earns its keep: **the one saturated humming prop per room** that
COMP_CARD's Severance formula demands, the Drive/Tron night-layer set dressing,
the penthouse wings (aquarium/analytics/bar), the Act 6½ city rooms. Those are
hero objects where 16–25 draw calls is a fair price and where hand-authoring a
convincing one costs a lot of session time.

Where it does not: background furniture (needs to be cheap and repeated —
hand-authored + instanced beats generated every time), and anything that must
match an existing kit's silhouette language.

Note the roadmap gap: rooms/buildings/streets are **v1.6, not shipped**. Ask it
for objects, not environments.

## 2.7 The philosophy tension — the honest read

The project's rule is *zero external assets; everything procedural in code*.
COMP_CARD's rendering strategy is built on it (Hinterberg comp: "an AAA-reading
illustrated look built in the renderer, not in assets"), and the one item flagged
as unproven is procedural canvas normal maps.

**img2threejs does not violate that rule — it is the only image-to-3D tool I
found that doesn't.** Its output is source code that constructs primitives at
runtime: no `.glb`, no `.fbx`, no binary in the repo, no texture files, no
loader, no download, diffable in git, reviewable in a PR, editable by hand
afterward. It is *the same category of artifact as `Furniture.pokerTable()`*. A
generated `createFilingCabinetModel.ts` is not meaningfully more "asset" than a
hand-written `Furniture.fileCabinet()`; the difference is authorship, not
substrate.

So the real tension is **not asset-vs-procedural. It is three narrower things,
and each has a concrete guardrail:**

1. **Authorship and coherence.** The look works because one consistent hand made
   every mesh with the same vocabulary and the same MaterialLibrary. Generated
   models arrive with foreign material choices (`MeshStandard`/`Physical`, inline
   construction) and foreign proportions. *Guardrail: a mandatory material-remap
   + review pass before merge. Nothing enters the repo still calling
   `new THREE.MeshStandardMaterial`.*
2. **The perf budget is the real constraint, not the philosophy.** 16–25 calls
   per prop against ≤300 per room is the number that will actually bite.
   *Guardrail: merge same-material parts; cap generated props per room; add each
   one's draw-call count to `perf-baseline.json` from Topic 1 — which makes this
   check automatic rather than remembered.*
3. **Language mismatch.** Output is TypeScript; the repo is vanilla JS ES modules
   with no build-time type checking. *Guardrail: strip types on adoption (the
   files are hand-editable, this is a small mechanical pass) — and note that
   stripping types is also the natural moment to do the material remap and the
   merge, so make it one checklist, not three.*

None of those is a reason to refuse the tool. All three are reasons to treat
generated code as a **draft by a collaborator**, reviewed exactly like any other
contribution — which is, notably, the same standard the rest of this project
already applies to its own overnight agent output.

## 2.8 Alternatives (and why they're a worse fit *here*)

**Meshy** — Alex has a premium account, and it is the strongest tool in this
space by most measures: Meshy 6 won **63.8%** of professional preferences over
Tripo in a cited benchmark; up to ~600K faces for fidelity; a dedicated **Low
Poly Mode**; **Smart Topology** with natively separated parts and a settable
`target_polycount`; PBR maps (diffuse/roughness/metallic/normal); a developer API
(Pro $20/mo, 1,000 credits, 10 concurrent tasks); export to `.fbx/.obj/.usdz/.glb/.stl/.blend`
([Meshy image-to-3D](https://www.meshy.ai/features/image-to-3d), [API](https://www.meshy.ai/api), [pricing](https://www.meshy.ai/pricing), [best AI tools for 3D game assets](https://www.meshy.ai/blog/best-ai-tools-for-3d-game-assets)).
Licensing on a paid plan: **full private ownership, no attribution**, provided
you don't publish to the Meshy Community and your inputs don't infringe; free-tier
output is **CC BY 4.0** (commercial use *with attribution*)
([ownership](https://help.meshy.ai/en/articles/10137554-what-is-the-ownership-of-the-generated-models), [commercial use](https://help.meshy.ai/en/articles/9992001-can-i-use-my-generated-assets-for-commercial-projects)).

**Why it's still the wrong first choice for this game:** it produces **meshes with
PBR texture maps**. That means a `GLTFLoader`, binary files in the repo, texture
files, download weight on an itch.io web build, a material pipeline that fights
`MeshToonMaterial`, and an art-direction mismatch (PBR realism vs lacquered toon
ramps). It breaks the zero-external-asset rule *substantively*, not
technically — and it breaks the COMP_CARD rendering strategy, which is the more
expensive loss. It is the right tool the day this project decides to ship binary
assets; today it isn't.

Two places Meshy *is* the better tool right now, both non-shipping:
- **Reference/blockout only.** Generate a mesh, screenshot it from the iso angle, use it as a *proportion reference* for hand-authoring or for an img2threejs pass. Nothing binary ever enters `src/`.
- **The 2D art pipeline.** Marketing stills, an itch.io page hero, key art — where a rendered image, not a mesh, is the deliverable.

**Open-source self-hosted (Alex has dual 3090s):** TripoSR, **Hunyuan3D 2.1**
(production-ready, released June 2025; low-poly topology and biped/quadruped
binding, though "complex models can be incomplete"), **Trellis 2** — all free if
self-hosted ([Tripo blog: Meshy alternatives](https://www.tripo3d.ai/blog/meshy-alternative)).
Tripo also shipped **Smart Mesh P1.0** ([Barchart](https://www.barchart.com/story/news/936837/tripo-ai-introduces-smart-mesh-p1-0-defining-a-new-phase-for-ai-3d-production)).
Same verdict as Meshy, minus the quality and plus the GPU-hours: **mesh output,
same philosophy break, worse results.** No reason to prefer these over the
premium Meshy account Alex already has. TripoSR specifically is now old (2024) and
outclassed.

## 2.9 Recommendation

| Need | Tool | Confidence |
|---|---|---|
| Hero props / one-per-room signature objects | **img2threejs**, then merge + material-remap + strip types | High — its documented strength, and the output category matches the repo's philosophy exactly |
| Character *critique* + per-character detail inventories + ΔE00 colour gates | **img2threejs intake/review stages only** (don't adopt its geometry) | High — this directly serves the open round-2 punch list and needs no integration |
| Character sub-parts (hair shells, caps, glasses) | img2threejs, parented into CharacterBuilder v5's named refs | Medium — clean seam, but each needs a look review |
| Replacing CharacterBuilder v5 | **No.** v1.5 unshipped; would orphan CharacterAnimator, FacePainter, GESTURES, `options.detailed` | High |
| Rooms / streets / environments | Not yet — v1.6 unshipped | High |
| Proportion reference / blockout for hand-authoring | Meshy (premium, already owned) — screenshots only, nothing binary in `src/` | High |
| Marketing stills / itch.io key art | Meshy | High |
| Shipping binary meshes into the game | No tool. That's an art-direction decision (COMP_CARD L0-class), not a tooling one — and it should be Alex's call, not a side effect of adopting a tool | High |

**Suggested first move, small and reversible:** clone img2threejs to
`~/.claude/skills/img2threejs` at a pinned commit, and run it on **one** prop for
a room that needs its saturated hero object. Measure the result against three
gates before merging anything: draw calls (vs the room's `perf-baseline.json`
entry), material tier (must be `Materials.*`), and the contact-sheet look test at
the iso angle. One prop tells you more than any amount of further reading, and
the Topic 1 harness is what makes the verdict objective.

---

# Sources

**Topic 1 — harness, CDP, Playwright**
- [Playwright #37100 — built-in CDP metrics (feature request)](https://github.com/microsoft/playwright/issues/37100) · [#15533 headless GPU not enabled](https://github.com/microsoft/playwright/issues/15533) · [#11627 enable GPU by default](https://github.com/microsoft/playwright/issues/11627) · [#18810 WebGL accel in docker](https://github.com/microsoft/playwright/issues/18810)
- [Checkly — measuring page performance with Playwright](https://www.checklyhq.com/docs/learn/playwright/performance/) · [BrowserStack — Playwright performance testing](https://www.browserstack.com/guide/playwright-performance-testing) · [Scoro Engineering](https://medium.com/scoro-engineering/using-playwright-to-measure-and-track-web-performance-90feeafd6f9a) · [Latish Sehgal — measuring FPS](https://latish.dev/blog/2026/05/27/measuring-performance-in-frontend-using-fps/)
- [CDP Tracing domain](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/) · [CDP root](https://chromedevtools.github.io/devtools-protocol/) · [chromium-dev: getting tracing data via CDP](https://groups.google.com/a/chromium.org/g/chromium-dev/c/7VCMtME1Wyk) · [Digging through Chrome traces](https://calendar.perfplanet.com/2023/digging-chrome-traces-introduction-example/) · [A beginner's guide to Chrome tracing](https://nolanlawson.com/2022/10/26/a-beginners-guide-to-chrome-tracing/) · [DevTools timeline docs](https://github.com/GoogleChrome/devtools-docs/blob/master/docs/timeline.md)
- [Long Animation Frames API (Chrome)](https://developer.chrome.com/docs/web-platform/long-animation-frames) · [MDN long animation frame timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing) · [SpeedCurve LoAF guide](https://www.speedcurve.com/blog/guide-long-animation-frames-loaf/) · [Request Metrics: what is LoAF](https://requestmetrics.com/web-performance/long-animation-frame-loaf/) · [w3c/long-animation-frames](https://github.com/w3c/long-animation-frames)
- [Chromium: Using Chromium with SwiftShader](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md) · [Intent to Remove: SwiftShader fallback](https://groups.google.com/a/chromium.org/g/blink-dev/c/yhFguWS_3pM) · [Microlink: WebGL without a GPU](https://microlink.io/blog/webgl-without-a-gpu) · [createIT: headless Chrome WebGL + Playwright](https://www.createit.com/blog/headless-chrome-testing-webgl-using-playwright/) · [Promaton: testing 3D apps with Playwright on GPU](https://blog.promaton.com/testing-3d-applications-with-playwright-on-gpu-1e9cfc8b54a9) · [Michel Krämer: enable GPU for headless Playwright](https://michelkraemer.com/enable-gpu-for-slow-playwright-tests-in-headless-mode/) · [Chrome: supercharge web AI testing (WebGPU/WebGL/headless)](https://developer.chrome.com/blog/supercharge-web-ai-testing)
- [puppeteer-capture (screencast vs beginFrame)](https://www.npmjs.com/package/puppeteer-capture) · [headless-screen-recorder](https://github.com/brianbaso/headless-screen-recorder) · [PyCDP HeadlessExperimental](https://py-cdp.readthedocs.io/en/latest/api/headless_experimental.html)

**Topic 1 — image diff, WebGL inspection, GPU timing**
- [odiff](https://github.com/dmtrKovalenko/odiff) · [odiff README](https://github.com/dmtrKovalenko/odiff/blob/main/README.md) · [odiff-bin on npm](https://www.npmjs.com/package/odiff-bin/v/2.4.1) · [Why our visual regression is so slow](https://dev.to/dmtrkovalenko/why-our-visual-regression-is-so-slow-33dn) · [pixelmatch](https://www.npmjs.com/package/pixelmatch) · [Vizzly honeydiff benchmark (vendor, unverified)](https://vizzly.dev/blog/honeydiff-vs-odiff-pixelmatch-benchmarks/)
- [Spector.js](https://github.com/BabylonJS/Spector.js/) · [readme](https://github.com/BabylonJS/Spector.js/blob/master/readme.md) · [demos/docs](https://spector.babylonjs.com/) · [issue #293 programmatic capture](https://github.com/BabylonJS/Spector.js/issues/293) · [Real-Time Rendering: debugging WebGL with SpectorJS](https://www.realtimerendering.com/blog/debugging-webgl-with-spectorjs/) · [Performance debugging with Spector.JS](https://timmykokke.com/blog/2023/2023-06-06-spectorjs/)
- [EXT_disjoint_timer_query_webgl2 spec](https://registry.khronos.org/webgl/extensions/EXT_disjoint_timer_query_webgl2/) · [MDN](https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query) · [Chromium: mitigating side-channel attacks (why it's disabled)](https://www.chromium.org/Home/chromium-security/ssca/) · [chromium-discuss: works without flag enabled](https://groups.google.com/a/chromium.org/g/chromium-discuss/c/B9zBnC96t0I) · [crbug 1230926](https://bugs.chromium.org/p/chromium/issues/detail?id=1230926) · [figma/webgl-profiler](https://github.com/figma/webgl-profiler) · [stats-gl npm](https://www.npmjs.com/package/stats-gl) · [stats-gl repo](https://github.com/RenaudRohlinger/stats-gl)
- [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) · [tool reference](https://github.com/ChromeDevTools/chrome-devtools-mcp/blob/main/docs/tool-reference.md) · [Chrome announcement](https://developer.chrome.com/blog/chrome-devtools-mcp) · [DebugBear walkthrough](https://www.debugbear.com/blog/chrome-devtools-mcp-performance-debugging) · [Addy Osmani](https://addyosmani.com/blog/devtools-mcp/) · [Continue docs cookbook](https://docs.continue.dev/guides/chrome-devtools-mcp-performance)

**Topic 1 — three.js perf, AO, shadows, GC**
- [N8AO README](https://github.com/N8python/n8ao/blob/master/README.md) · [N8AO site](http://n8programs.com/n8ao/) · [n8ao npm](https://www.npmjs.com/package/n8ao) · [n8ao-webgpu (TSL port)](https://github.com/marioandf/n8ao-webgpu) · [three.js-ssao / DeepWiki SSAO](https://deepwiki.com/study-game-engines/three.js-ssao/3.1-screen-space-ambient-occlusion)
- [Discover three.js — Big List of Tips and Tricks](https://discoverthreejs.com/tips-and-tricks/) · [utsubo — 100 three.js perf tips (2026)](https://www.utsubo.com/blog/threejs-best-practices-100-tips) · [three.js Journey performance tips](https://threejs-journey.com/lessons/performance-tips) · [Draw Calls: The Silent Killer](https://threejsroadmap.com/blog/draw-calls-the-silent-killer) · [VerseEngine: obtaining draw-call counts](https://verseengine.cloud/guide/general-tips/get-draw-call-counts.html) · [Tobias Weiss: three.js 60fps](https://tobias-weiss.org/content/threejs-performance-optimization/)
- [three.js docs: WebGLRenderer.shadowMap](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.shadowMap) · [three.js #18521 low-res shadows on moving objects](https://github.com/mrdoob/three.js/issues/18521) · [forum: directional light flickering with shadows](https://discourse.threejs.org/t/directional-light-flickering-issues-with-shadows/54884) · [forum: moving the DirectionalLight shadow frustum with the camera](https://discourse.threejs.org/t/moving-directionallight-shadow-frustum-with-camera/2700) · [sbcode: directional light shadow](https://sbcode.net/threejs/directional-light-shadow/) · [DEV: mastering shadows in three.js](https://dev.to/outriding/mastering-shadows-in-threejs-setup-configuration-and-optimization-39nn) · [forum: reducing shader compile time](https://discourse.threejs.org/t/reducing-shader-compile-time-on-scene-initialization/56572) · [DeepWiki: three.js texture management & shadow mapping](https://deepwiki.com/mrdoob/three.js/3.4-shadow-mapping)
- [Exploring garbage collection in V8 with WebGL](https://whenderson.dev/blog/webgl-garbage-collection/) · [V8: Trash talk (Orinoco)](https://v8.dev/blog/trash-talk) · [V8: Tracing V8](https://v8.dev/docs/trace) · [renderlog: JS GC, pauses, allocation rate, frontend jank](https://renderlog.in/blog/javascript-garbage-collection-frontend/)
- [Shirajuki/js-game-rendering-benchmark](https://github.com/Shirajuki/js-game-rendering-benchmark)
- Flicker-detection prior art (camera/video domain, transferable idea only): [US8068148B2](https://patents.google.com/patent/US8068148B2/en) · [US8040393B2](https://patents.google.com/patent/US8040393B2/en) · [Effective Flicker Detection Using ANN](https://easychair.org/publications/open/qBJF)

**Topic 2 — img2threejs and alternatives**
- [img2threejs repo](https://github.com/hoainho/img2threejs) (= `img2threejs/img2threejs`) · [showcase repo](https://github.com/img2threejs/img2threejs-showcase) · [live gallery](https://img2threejs.github.io/img2threejs-showcase/) · [org page](https://github.com/img2threejs) · [project site](https://img2threejs.org/) · [explainx.ai writeup (July 2026)](https://explainx.ai/blog/img2threejs-bunpav-procedural-photo-threejs-july-2026) · repo metadata + `README.md` + `SKILL.md` + showcase sources read directly via the GitHub API, 2026-07-29
- [Meshy image-to-3D](https://www.meshy.ai/features/image-to-3d) · [Meshy API](https://www.meshy.ai/api) · [Meshy API docs — image-to-3D](https://docs.meshy.ai/en/api/image-to-3d) · [pricing](https://www.meshy.ai/pricing) · [ownership of generated models](https://help.meshy.ai/en/articles/10137554-what-is-the-ownership-of-the-generated-models) · [commercial use](https://help.meshy.ai/en/articles/9992001-can-i-use-my-generated-assets-for-commercial-projects) · [best AI tools for 3D game assets](https://www.meshy.ai/blog/best-ai-tools-for-3d-game-assets) · [Meshy-guide](https://github.com/meshy-dev/Meshy-guide)
- [Tripo: 6 best Meshy alternatives (2026)](https://www.tripo3d.ai/blog/meshy-alternative) · [Tripo Smart Mesh P1.0](https://www.barchart.com/story/news/936837/tripo-ai-introduces-smart-mesh-p1-0-defining-a-new-phase-for-ai-3d-production)
