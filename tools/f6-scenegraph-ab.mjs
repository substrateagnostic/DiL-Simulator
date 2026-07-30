// F6 experiment — is the CPU-throttled frame node-bound or draw-call-bound?
//
// The f6 CPU profile says `updateMatrixWorld` + `traverse` + `projectObject` +
// `multiplyMatrices` are ~18ms/frame at CPU 4x in cubicle_farm, the same order
// as the whole of draw-call submission. That cost scales with the number of
// Object3Ds in the scene, NOT with the number of draw calls — a distinction the
// round-2 report did not make.
//
// This prices it, live, with no source change:
//   A. node census (total Object3D, meshes, empty groups, depth) per top-level node
//   B. who calls Object3D.traverse() per frame, by stack
//   C. A/B: `matrixWorldAutoUpdate = false` on the static roots vs baseline,
//      at CPU 1x and 4x, with a frozen-frame readPixels equality check so the
//      claim "identical pixels" is measured and not asserted.
//
//   node tools/f6-scenegraph-ab.mjs [--room=cubicle_farm] [--seconds=8]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', arg('room', 'cubicle_farm')).split(',').filter(Boolean);
const SECONDS = +arg('seconds', 8);
const OUT = 'screenshots/perf/f6';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180',
    '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
    '--ignore-gpu-blocklist', '--force_high_performance_gpu', '--force-device-scale-factor=1',
    '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

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

const measure = async (page, seconds) => {
  await page.evaluate(() => {
    window.__mm = { dt: [], last: performance.now(), on: true, calls: [] };
    const E = window.__engine;
    E.renderer.info.autoReset = false;
    const tick = () => {
      if (!window.__mm.on) return;
      const t = performance.now();
      window.__mm.dt.push(t - window.__mm.last);
      window.__mm.last = t;
      window.__mm.calls.push(E.renderer.info.render.calls);
      E.renderer.info.reset();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await patrol(page, seconds);
  return page.evaluate(() => {
    window.__mm.on = false;
    window.__engine.renderer.info.autoReset = true;
    const s = [...window.__mm.dt].sort((a, b) => a - b);
    const p = (q) => (s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * q))].toFixed(2) : null);
    const c = [...window.__mm.calls].sort((a, b) => a - b);
    return {
      frames: s.length, p50: p(0.5), p95: p(0.95), p99: p(0.99),
      max: s.length ? +s[s.length - 1].toFixed(2) : null,
      callsP50: c.length ? c[Math.floor(c.length / 2)] : null,
      callsMax: c.length ? c[c.length - 1] : null,
    };
  });
};

const results = [];
for (const room of ROOMS) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${BASE}/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  for (let i = 0; i < 8; i++) {
    const busy = await page.evaluate(() => {
      const d = document.querySelector('.dialog-container');
      return (!!d && d.style.display !== 'none' && d.offsetParent !== null)
        || document.body.innerText.includes('EMPLOYEE PORTAL');
    }).catch(() => false);
    if (!busy) break;
    await page.keyboard.down('Enter'); await page.waitForTimeout(90);
    await page.keyboard.up('Enter'); await page.waitForTimeout(280);
  }
  await page.waitForTimeout(2500);

  // ── A. node census ────────────────────────────────────────────────────
  const census = await page.evaluate(() => {
    const E = window.__engine;
    const count = (n) => {
      let total = 0, meshes = 0, empties = 0, maxDepth = 0;
      const walk = (o, d) => {
        total++;
        if (o.isMesh) meshes++;
        else if (o.children.length === 0) empties++;
        if (d > maxDepth) maxDepth = d;
        for (const c of o.children) walk(c, d + 1);
      };
      walk(n, 0);
      return { total, meshes, empties, maxDepth };
    };
    const top = E.scene.children.map((c) => ({
      name: c.name || c.type, visible: c.visible, ...count(c),
      matrixWorldAutoUpdate: c.matrixWorldAutoUpdate !== false,
    })).sort((a, b) => b.total - a.total);
    return { scene: count(E.scene), top };
  });

  // ── B. who calls traverse() per frame ─────────────────────────────────
  const traceTraverse = await page.evaluate(async () => {
    const THREE_PROTO = Object.getPrototypeOf(window.__engine.scene);
    const orig = THREE_PROTO.traverse;
    const hits = new Map();
    let frames = 0;
    THREE_PROTO.traverse = function (cb) {
      const st = (new Error()).stack || '';
      const line = st.split('\n')[2] || st.split('\n')[1] || '?';
      const k = line.trim().slice(0, 160);
      hits.set(k, (hits.get(k) || 0) + 1);
      return orig.call(this, cb);
    };
    await new Promise((res) => {
      const tick = () => { if (++frames >= 60) return res(); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    THREE_PROTO.traverse = orig;
    return { frames, callers: [...hits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10) };
  });

  // ── C. the A/B ────────────────────────────────────────────────────────
  // Freeze the static roots' world matrices. `matrixWorldAutoUpdate = false` on a
  // subtree root makes Object3D.updateMatrixWorld() skip the whole subtree
  // (three only recurses into a child when child.matrixWorldAutoUpdate === true
  // or the parent forced it), which is exactly the cost the profile is showing.
  const STATIC_ROOTS = `(() => {
    const E = window.__engine;
    const names = [];
    for (const c of E.scene.children) {
      const n = c.name || '';
      if (/^room_|^room_fx$|^city_backdrop$|^building_shell$/.test(n)) names.push(n);
    }
    return names;
  })()`;
  const staticRoots = await page.evaluate(STATIC_ROOTS);

  const cdp = await ctx.newCDPSession(page);
  const runs = {};
  for (const rate of [1, 4]) {
    for (const variant of ['baseline', 'frozenMatrices']) {
      await page.evaluate((v) => {
        const E = window.__engine;
        for (const c of E.scene.children) {
          const n = c.name || '';
          if (!/^room_|^room_fx$|^city_backdrop$|^building_shell$/.test(n)) continue;
          if (v === 'frozenMatrices') {
            c.updateMatrixWorld(true);
            c.matrixWorldAutoUpdate = false;
          } else {
            c.matrixWorldAutoUpdate = true;
          }
        }
      }, variant);
      await page.waitForTimeout(400);
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      runs[`${variant}@${rate}x`] = await measure(page, SECONDS);
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
    }
  }

  // ── C2. pixel equality: same frozen frame, matrices live vs frozen ─────
  const pixels = await page.evaluate(() => {
    const E = window.__engine;
    E.stop();
    E._flicker = false;
    if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
    const gl = E.renderer.getContext();
    const w = E.renderer.domElement.width, h = E.renderer.domElement.height;
    const grab = () => {
      E.renderScene(E.scene, E.camera);
      const buf = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return buf;
    };
    const setFrozen = (on) => {
      for (const c of E.scene.children) {
        const n = c.name || '';
        if (!/^room_|^room_fx$|^city_backdrop$|^building_shell$/.test(n)) continue;
        if (on) { c.updateMatrixWorld(true); c.matrixWorldAutoUpdate = false; }
        else c.matrixWorldAutoUpdate = true;
      }
    };
    setFrozen(false); grab(); grab();          // settle
    const a = grab();
    setFrozen(true); grab();                    // settle
    const b = grab();
    let diff = 0, maxD = 0;
    for (let i = 0; i < a.length; i++) {
      const d = Math.abs(a[i] - b[i]);
      if (d) { diff++; if (d > maxD) maxD = d; }
    }
    setFrozen(false);
    E.start();
    return { samples: a.length, differing: diff, maxDelta: maxD, w, h };
  });

  results.push({ room, census, traceTraverse, staticRoots, runs, pixels });
  console.log(`\n===== ${room} =====`);
  console.log(`scene nodes ${census.scene.total} (meshes ${census.scene.meshes}, empty ${census.scene.empties}, depth ${census.scene.maxDepth})`);
  for (const t of census.top.slice(0, 10)) console.log(`   ${String(t.total).padStart(5)} nodes  ${String(t.meshes).padStart(4)} meshes  ${t.name}`);
  console.log(`traverse() calls over ${traceTraverse.frames} frames:`);
  for (const [k, n] of traceTraverse.callers) console.log(`   ${String(n).padStart(5)}x  ${k}`);
  console.log(`static roots frozen: ${staticRoots.join(', ')}`);
  for (const [k, v] of Object.entries(runs)) {
    console.log(`   ${k.padEnd(22)} p50 ${String(v.p50).padStart(7)}  p95 ${String(v.p95).padStart(7)}  p99 ${String(v.p99).padStart(7)}  calls p50 ${v.callsP50}`);
  }
  console.log(`pixel equality (frozen frame, live vs frozen matrices): ${pixels.differing} of ${pixels.samples} samples differ, max delta ${pixels.maxDelta}`);
  await page.close();
}

writeFileSync(`${OUT}/scenegraph-ab.json`, JSON.stringify({ when: new Date().toISOString(), seconds: SECONDS, results }, null, 2));
console.log(`\nwrote ${OUT}/scenegraph-ab.json`);
await browser.close();
