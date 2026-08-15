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
//   node tools/_fr1-untilt.mjs --tag=before|after

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
  const bad = ok.filter(r => (r.clampedHeadStepDeg || 0) > 40).sort((a, b) => b.clampedHeadStepDeg - a.clampedHeadStepDeg);
  console.log(`stances measured: ${ok.length}   actually posture-clamped: ${clamped.length}   errors: ${out.length - ok.length}`);
  console.log(`worst frame-to-frame HEAD step after the clamp: ${worst.toFixed(2)} deg`);
  console.log(`stances with a head step over 40 deg: ${bad.length}`);
  for (const r of bad) console.log(`  ${r.id} (a${r.actionId})  retarget ${r.retargetHeadStepDeg} -> clamped ${r.clampedHeadStepDeg} deg at frame ${r.atFrame}/${r.frames}`);
  writeFileSync(`${OUT}/untilt-${TAG}.json`, JSON.stringify({ worst, badCount: bad.length, bad, rows: out }, null, 2));
} catch (e) {
  console.error('HARNESS ERROR', e);
} finally {
  await browser.close();
}
