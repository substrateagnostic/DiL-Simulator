// FIX ROUND 1 — Bundle 2 diagnostics + evidence (B5, B6, B8, B9, B11, B19, B20).
//
// Diagnose-then-fix items get their diagnosis here in NUMBERS, off the shipping
// path, headed, quality tier pinned. Run before and after a change to get the
// delta; --tag names the output set.
//
//   node tools/_fr1-world.mjs --tag=before
//   node tools/_fr1-world.mjs --tag=after

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const TAG = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'run';
const OUT = `screenshots/fix-round-1/world-${TAG}`;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const report = {};

const boot = async (room, fixture = 'act3') => {
  await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=${fixture}&shot=${room}`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1600);
  const tier = await page.evaluate(() => window.__engine?.qualityTier ?? '?');
  if (tier !== 'high') throw new Error(`CAPTURE LAW: tier is ${tier}, not high`);
};

// Rec.709 luma stats and pixel diffs are taken off the SAVED FILE, decoded in a
// second page — the renderer does not set preserveDrawingBuffer, so an in-page
// canvas probe of the live game measures 0 (CLAUDE.md, harness gotchas). Same
// decode route the existing _f-lum2 / _g-lum instruments use, so the numbers are
// directly comparable to theirs.
const lab = await browser.newPage();
await lab.goto('about:blank');
const uri = (f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`;
const load = `async (s) => { const i = new Image(); await new Promise((r, j) => { i.onload = r; i.onerror = j; i.src = s; }); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(i, 0, 0); return x; }`;

const luma = (file, box = null) => lab.evaluate(async ({ s, box: b, load: L }) => {
  const x = await eval(L)(s);
  const w = b ? b.w : x.canvas.width, h = b ? b.h : x.canvas.height;
  const d = x.getImageData(b ? b.x : 0, b ? b.y : 0, w, h).data;
  let sum = 0, sq = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    sum += l; sq += l * l; n++;
  }
  const mean = sum / n;
  return { mean: +mean.toFixed(2), sd: +Math.sqrt(sq / n - mean * mean).toFixed(2) };
}, { s: uri(file), box, load });

const pxDiff = (a, b, thresh = 6) => lab.evaluate(async ({ A, B, t, load: L }) => {
  const xa = await eval(L)(A), xb = await eval(L)(B);
  const da = xa.getImageData(0, 0, xa.canvas.width, xa.canvas.height).data;
  const db = xb.getImageData(0, 0, xb.canvas.width, xb.canvas.height).data;
  let changed = 0; const n = Math.min(da.length, db.length) >> 2;
  for (let i = 0; i < n; i++) {
    const j = i << 2;
    if (Math.abs(da[j] - db[j]) > t || Math.abs(da[j + 1] - db[j + 1]) > t || Math.abs(da[j + 2] - db[j + 2]) > t) changed++;
  }
  return +(100 * changed / n).toFixed(3);
}, { A: uri(a), B: uri(b), t: thresh, load });

try {
  // ── B11 — how far off the wall does a poster hang? ─────────────────────
  // Measured in metres off the room's own interior wall face, through the real
  // Room build. Wall interior faces: north z = -0.5, west x = -0.5 (the wall
  // slab centre is at -0.575 with thickness 0.15).
  await boot('cubicle_farm');
  report.B11 = await page.evaluate(() => {
    const ex = window.__explore;
    let root = ex.player.mesh; while (root.parent) root = root.parent;
    const THREE = window.__engine.THREE || null;
    const out = [];
    root.traverse(o => {
      if (!o.userData || !o.userData.furnitureType) return;
      const t = o.userData.furnitureType;
      if (!['motivationalPoster', 'executivePoster'].includes(t)) return;
      const box = new (window.__THREE_Box3 || Object).constructor;
      out.push({ t, x: +o.position.x.toFixed(3), z: +o.position.z.toFixed(3), r: +o.rotation.y.toFixed(3) });
    });
    return out;
  });

  // ── B8 / B9 — the green strip, and is the room flickering or z-fighting? ─
  // Two frames of the SAME static camera with the fluorescent flicker pinned
  // OFF. Anything that still moves is geometry, not light.
  const froze = await page.evaluate(() => {
    const E = window.__engine;
    if (!E) return false;
    E._flicker = false;
    if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
    return true;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/cf-frozen-a.png` });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/cf-frozen-b.png` });
  // And two frames with the flicker LIVE, for the size of the light wobble.
  await page.evaluate(() => { window.__engine._flicker = true; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/cf-live-a.png` });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/cf-live-b.png` });
  report.B9 = {
    flickerPinned: froze,
    frozenPairChangedPct: await pxDiff(`${OUT}/cf-frozen-a.png`, `${OUT}/cf-frozen-b.png`),
    livePairChangedPct: await pxDiff(`${OUT}/cf-live-a.png`, `${OUT}/cf-live-b.png`),
  };
  // The green runner's own colour as the player sees it, sampled off the file.
  report.B8 = { runnerBand: await luma(`${OUT}/cf-frozen-a.png`, { x: 1100, y: 470, w: 120, h: 60 }) };
  await page.screenshot({ path: `${OUT}/B8-cubicle-farm.png` });

  // ── B19 — does penthouse_expanded have windows? ────────────────────────
  report.B19 = await page.evaluate(async () => {
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const g = (id) => ({ id, windows: (ROOMS[id]?.windows || []).length, width: ROOMS[id]?.width });
    return [g('penthouse'), g('penthouse_expanded')];
  });

  // ── B5 — stairwell: can the player stand inside a step? ────────────────
  await boot('stairwell', 'act5');
  report.B5 = await page.evaluate(() => {
    const ex = window.__explore;
    const tm = ex.tileMap;
    const rows = [];
    for (let z = 0; z < 24; z++) {
      const r = [];
      for (let x = 0; x < 6; x++) r.push({ v: tm.get(x, z), y: +(tm.heightAt ? tm.heightAt(x, z) : 0).toFixed(3) });
      rows.push(r);
    }
    // Walk down the flight one sub-tile step at a time and record where the
    // player's feet end up versus the tile height under them.
    const trace = [];
    ex.player.setPosition(1.5, 1.5, tm);
    for (let i = 0; i < 90; i++) {
      ex.player.move(0, 1, 0.033, tm);
      const p = ex.player.position;
      const floor = tm.heightAt ? tm.heightAt(p.x, p.z) : 0;
      trace.push({ z: +p.z.toFixed(2), feet: +ex.player.mesh.position.y.toFixed(3), floor: +floor.toFixed(3), d: +(ex.player.mesh.position.y - floor).toFixed(3) });
    }
    const worst = trace.reduce((a, b) => (Math.abs(b.d) > Math.abs(a.d) ? b : a), trace[0]);
    return { worstFootDelta: worst, samples: trace.filter((_, i) => i % 10 === 0), heights: rows.map(r => r.map(c => c.y)) };
  });
  await page.screenshot({ path: `${OUT}/B5-stairwell.png` });

  // ── B6 — seated NPCs: knee / shin angles on every sitting body ──────────
  await boot('conference_room', 'act3');
  report.B6 = await page.evaluate(() => {
    const ex = window.__explore;
    const out = [];
    for (const npc of ex.roomManager.entityManager.npcs || []) {
      if (!npc.animator || !npc.animator.isSitting) continue;
      const g = npc.mesh;
      const leg = g.leftLeg || (g.children || []).find(c => c.name === 'leftLeg');
      out.push({
        id: npc.id,
        sitting: true,
        legRotX: leg ? +leg.rotation.x.toFixed(3) : null,
        hipY: +g.position.y.toFixed(3),
      });
    }
    return out;
  });
  await page.screenshot({ path: `${OUT}/B6-seated.png` });

  // ── B20 — the city plate at act 3 (afternoon) and act 6 (night) ─────────
  for (const [act, fx] of [[3, 'act3'], [6, 'act6']]) {
    await boot('cubicle_farm', fx);
    await page.evaluate(() => { const E = window.__engine; if (E) { E._flicker = false; if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity; } });
    await page.waitForTimeout(500);
    const f = `${OUT}/B20-city-act${act}.png`;
    await page.screenshot({ path: f });
    // The city plate is the left third of the frame — all backdrop, no room.
    report[`B20_act${act}`] = {
      key: await page.evaluate(() => window.__explore?._lastTodKey ?? null),
      plate: await luma(f, { x: 0, y: 0, w: 520, h: 900 }),
    };
  }

  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  console.error('HARNESS ERROR', e);
} finally {
  await browser.close();
}
