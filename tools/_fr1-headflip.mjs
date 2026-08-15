// FIX ROUND 1 — B22, the head flip.
//
// Runs every shipping clip through the REAL clip pipeline (`clipsFor`, which is
// what CombatScene calls — verify the call path) and measures, per clip, the
// largest frame-to-frame change in where the HEAD POINTS. A head that rotates
// more than a few degrees between two adjacent keyframes of a walk or an idle
// is not animating, it is teleporting; the reported symptom is a full
// inversion, which shows here as a delta near 180 deg.
//
//   node tools/_fr1-headflip.mjs --tag=before

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const TAG = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'run';
const OUT = 'screenshots/fix-round-1';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act3&shot=cubicle_farm`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1200);

  const rows = await page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    // THE SHIPPING CALL PATH, not a convenience harness (HANDOFF §4.3): the
    // combat scene reaches clips through MeshyCast.instance() -> restPose ->
    // MeshyCast.clipsFor(), which is what routes into MeshyClips.clipsFor with
    // a real target rest and therefore what runs clampPosture at all.
    const MeshyCast = await import('/src/combat/MeshyCast.js');
    const MeshyClips = await import('/src/combat/MeshyClips.js');
    const ids = Object.keys(MeshyCast.MESHY_MODELS);
    await MeshyCast.preload(ids);
    await MeshyClips.preloadClips(ids);
    const out = [];
    for (const id of ids) {
      let clips;
      try {
        const inst = MeshyCast.instance(id);
        if (!inst) { out.push({ id, error: 'no instance' }); continue; }
        clips = MeshyCast.clipsFor(inst, id, id);
      } catch (e) { out.push({ id, error: String(e).slice(0, 90) }); continue; }
      if (!clips) { out.push({ id, error: 'no clips' }); continue; }
      for (const [role, clip] of Object.entries(clips)) {
        if (!clip || !clip.tracks) continue;
        const head = clip.tracks.find(t => /(^|\.)Head\.quaternion$/.test(t.name) || t.name === 'Head.quaternion');
        if (!head) continue;
        const q0 = new THREE.Quaternion();
        const q1 = new THREE.Quaternion();
        let worst = 0, worstAt = -1;
        for (let i = 4; i < head.values.length; i += 4) {
          q0.fromArray(head.values, i - 4);
          q1.fromArray(head.values, i);
          // Angle between two orientations, double-cover aware.
          const dot = Math.min(1, Math.abs(q0.dot(q1)));
          const deg = 2 * Math.acos(dot) * 180 / Math.PI;
          if (deg > worst) { worst = deg; worstAt = (i / 4); }
        }
        out.push({ id, role, frames: head.values.length / 4, worstStepDeg: +worst.toFixed(2), atFrame: worstAt });
      }
    }
    return out;
  });

  const bad = rows.filter(r => r.worstStepDeg > 40).sort((a, b) => b.worstStepDeg - a.worstStepDeg);
  const errs = rows.filter(r => r.error);
  const max = rows.reduce((m, r) => Math.max(m, r.worstStepDeg || 0), 0);
  console.log(`clips measured: ${rows.length - errs.length}   load errors: ${errs.length}`);
  console.log(`worst head step across the whole cast: ${max.toFixed(2)} deg`);
  console.log(`clips with a head step over 40 deg: ${bad.length}`);
  for (const r of bad.slice(0, 20)) console.log(`  ${r.id}/${r.role}  ${r.worstStepDeg} deg at frame ${r.atFrame}/${r.frames}`);
  writeFileSync(`${OUT}/headflip-${TAG}.json`, JSON.stringify({ max, badCount: bad.length, bad, errs, rows }, null, 2));
} catch (e) {
  console.error('HARNESS ERROR', e);
} finally {
  await browser.close();
}
