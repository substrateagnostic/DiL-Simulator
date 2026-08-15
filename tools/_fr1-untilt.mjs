// FIX ROUND 1 — B22 evidence, measured on the FUNCTION UNDER TEST.
//
// An earlier cut of this probe tried to pull clips out through
// MeshyCast.clipsFor and got only the GLBs' own baked idles back, so it
// measured nothing. This one calls the real `retargetClip` + `clampPosture`
// pair directly on a real donor clip and a real target rest — the same two
// calls MeshyClips.clipFor makes for a stance — and reports the largest
// frame-to-frame change in HEAD ORIENTATION that the clamp leaves behind.
//
// A head that swings more than a few degrees between two adjacent keys of a
// calm stance is not animating. The reported symptom is a full inversion.
//
//   node tools/_fr1-untilt.mjs --tag=before|after [--baseline=untilt-before.json]
//
// FIX ROUND 2 — THIS PROBE WAS ITS OWN BLIND SPOT. The first cut reported only
// rows over 40 deg and only in absolute terms, so when the untilt ceiling put a
// 36 deg head snap into the Compliance Officer's looping combat idle the number
// never reached the summary, the commit message or the escalation — and the
// round shipped presenting 48.41 -> 47.75 as its entire effect on head motion.
// A probe that prints the two rows you already know about is not a gate. Two
// changes, both load-bearing:
//   THE FLOOR IS 15 DEG, not 40. A calm stance has no business stepping 15 deg
//     between adjacent keys, so anything above it is worth a human reading.
//   EVERY ROW IS DIFFED AGAINST A STORED BASELINE. The gate is the DELTA, not
//     the absolute: a row that was already 31.99 deg and stayed 31.99 deg is
//     not this round's problem, and a row that moved 3.28 -> 36.14 is, even
//     though it never crosses 40. Regressions fail the process (exit 1);
//     improvements are printed and pass.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const TAG = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'run';
const BASE = process.argv.find(a => a.startsWith('--baseline='))?.slice(11) || 'untilt-before.json';
// A head step this large between adjacent keys of a calm stance is not animating.
const LOUD_DEG = 15;
// Below this a delta is clip-math noise / a rounding tick, not a change.
const DELTA_DEG = 0.5;
const OUT = 'screenshots/fix-round-1';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act3&shot=cubicle_farm`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1200);

  const out = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const MC = await import('/src/combat/MeshyCast.js');
    const CL = await import('/src/combat/MeshyClips.js');
    const { retargetClip, captureRest } = await import('/src/combat/MeshyRetarget.js');
    const { clampPosture } = await import('/src/combat/MeshyPosture.js');

    const ids = Object.keys(MC.MESHY_MODELS);
    const rows = [];
    const step = (track) => {
      const a = new THREE.Quaternion(), b = new THREE.Quaternion();
      let worst = 0, at = -1;
      for (let i = 4; i < track.values.length; i += 4) {
        a.fromArray(track.values, i - 4); b.fromArray(track.values, i);
        const d = 2 * Math.acos(Math.min(1, Math.abs(a.dot(b)))) * 180 / Math.PI;
        if (d > worst) { worst = d; at = i / 4; }
      }
      return { worst: +worst.toFixed(2), at };
    };

    for (const id of ids) {
      const actionId = CL.idleIdFor(id, id);
      let gltf;
      try { gltf = await MC.CLIP_LOADER(`clips/a${actionId}.glb`); }
      catch (e) { rows.push({ id, error: 'clip load' }); continue; }
      const donorClip = gltf.animations?.[0];
      if (!donorClip) { rows.push({ id, error: 'no donor clip' }); continue; }
      const donorRest = captureRest(gltf.scene);
      await MC.preload([id]);
      const inst = MC.instance(id);
      if (!inst?.restPose?.size) { rows.push({ id, error: 'no target rest' }); continue; }

      const re = retargetClip(donorClip, donorRest, inst.restPose);
      const cl = clampPosture(re, inst.restPose);
      const head = cl.tracks.find(t => t.name === 'Head.quaternion');
      const headRe = re.tracks.find(t => t.name === 'Head.quaternion');
      if (!head) { rows.push({ id, actionId, error: 'no Head track after clamp' }); continue; }
      const s = step(head);
      const sr = headRe ? step(headRe) : { worst: null, at: -1 };
      rows.push({
        id, actionId,
        clamped: !!cl.userData?.postureClamped,
        retargetHeadStepDeg: sr.worst,
        clampedHeadStepDeg: s.worst,
        atFrame: s.at, frames: head.values.length / 4,
      });
    }
    return rows;
  });

  const ok = out.filter(r => !r.error);
  const clamped = ok.filter(r => r.clamped);
  const worst = ok.reduce((m, r) => Math.max(m, r.clampedHeadStepDeg || 0), 0);
  const loud = ok.filter(r => (r.clampedHeadStepDeg || 0) > LOUD_DEG).sort((a, b) => b.clampedHeadStepDeg - a.clampedHeadStepDeg);

  const basePath = BASE.includes('/') ? BASE : `${OUT}/${BASE}`;
  let baseRows = null;
  if (existsSync(basePath)) {
    try { baseRows = new Map((JSON.parse(readFileSync(basePath, 'utf8')).rows || []).map(r => [r.id, r])); }
    catch { baseRows = null; }
  }

  console.log(`stances measured: ${ok.length}   actually posture-clamped: ${clamped.length}   errors: ${out.length - ok.length}`);
  console.log(`worst frame-to-frame HEAD step after the clamp: ${worst.toFixed(2)} deg`);
  console.log(`stances with a head step over ${LOUD_DEG} deg: ${loud.length}`);
  for (const r of loud) console.log(`  ${r.id} (a${r.actionId})  retarget ${r.retargetHeadStepDeg} -> clamped ${r.clampedHeadStepDeg} deg at frame ${r.atFrame}/${r.frames}`);

  // THE GATE: per-row delta against the baseline, every row, no top-N.
  const moved = [];
  if (baseRows) {
    for (const r of ok) {
      const b = baseRows.get(r.id);
      if (!b || b.clampedHeadStepDeg == null || r.clampedHeadStepDeg == null) continue;
      const d = +(r.clampedHeadStepDeg - b.clampedHeadStepDeg).toFixed(2);
      if (Math.abs(d) > DELTA_DEG) moved.push({ id: r.id, actionId: r.actionId, from: b.clampedHeadStepDeg, to: r.clampedHeadStepDeg, delta: d });
    }
    moved.sort((a, b) => b.delta - a.delta);
    console.log(`\nDELTA vs ${basePath}  (rows compared: ${ok.filter(r => baseRows.has(r.id)).length}, threshold ${DELTA_DEG} deg)`);
    if (!moved.length) console.log('  no row moved.');
    for (const m of moved) {
      console.log(`  ${m.delta > 0 ? 'WORSE' : 'better'}  ${m.id} (a${m.actionId})  ${m.from} -> ${m.to} deg  (${m.delta > 0 ? '+' : ''}${m.delta})`);
    }
  } else {
    console.log(`\nDELTA: no baseline at ${basePath} — absolute run only.`);
  }
  const regressions = moved.filter(m => m.delta > 0);

  writeFileSync(`${OUT}/untilt-${TAG}.json`, JSON.stringify({
    worst, loudDeg: LOUD_DEG, loudCount: loud.length, loud,
    baseline: baseRows ? basePath : null, moved, regressionCount: regressions.length,
    rows: out,
  }, null, 2));

  if (regressions.length) {
    console.log(`\nFAIL — ${regressions.length} row(s) got worse than the baseline.`);
    process.exitCode = 1;
  } else if (baseRows) {
    console.log('\nPASS — no row regressed against the baseline.');
  }
} catch (e) {
  console.error('HARNESS ERROR', e);
} finally {
  await browser.close();
}
