// FIX ROUND 1 — B6, seated-NPC pose. A CLOSE-UP, because the defect is a
// leg pose and the room camera cannot see a leg.
//
// Puts a real NPC on a real chair through the shipping build, points a tight
// camera at it, and reports the pose in numbers as well as pixels: where the
// hip pivot sits, which way the thigh points relative to the body's own
// forward, and how far the ankle ends up from the floor.
//
//   node tools/_fr1-sit.mjs --tag=before

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const TAG = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'run';
const OUT = `screenshots/fix-round-1/sit-${TAG}`;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

try {
  await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act3&shot=cubicle_farm`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1600);

  const data = await page.evaluate(async () => {
    const ex = window.__explore;
    // Reach three through the running app's own module graph — a bare 'three'
    // specifier does not resolve in the page, and importing a second copy would
    // hand back a different class identity anyway.
    const THREE = await import('/node_modules/three/build/three.module.js');
    // Any visible NPC will do — the pose code is shared by the whole cast.
    const npc = (ex.roomManager.entityManager.npcs || []).find(n => n.mesh.visible);
    if (!npc) return { error: 'no visible npc' };
    // Sit it the way a room entry with `sitting: true` does.
    npc.animator.setSitting(true);
    npc.animator.update(0.016);
    const g = npc.mesh;
    const legLen = g.legLength ?? null;
    const leg = g.leftLeg;
    const knee = leg && leg.knee;
    const wp = (o) => { const v = new THREE.Vector3(); o.getWorldPosition(v); return { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) }; };
    // Ankle = bottom of the shin. Take the knee pivot and step down the shin.
    const kneeW = knee ? wp(knee) : null;
    let ankleW = null;
    if (knee) {
      const v = new THREE.Vector3(0, -(legLen * 0.48), 0);
      knee.localToWorld(v);
      ankleW = { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) };
    }
    const bodyW = wp(g);
    // Which way is the body facing? Nose is at local +z (CharacterBuilder).
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
    // Which way does the thigh point? Local -y of the hip pivot, in world.
    const thighDir = new THREE.Vector3(0, -1, 0).applyQuaternion(leg.getWorldQuaternion(new THREE.Quaternion()));
    // NOTE ON THE PICTURE. An inspection zoom was attempted here and is not in
    // this harness: pushing the orthographic camera's zoom and re-aiming it
    // produced a black frame twice, and chasing a capture bug is not evidence.
    // The numbers below are taken off the live scene graph through the real
    // rig, and `thighDotForward` is the whole finding — a signed dot product
    // between the thigh's own direction and the body's own forward. The
    // room-camera before/after stills carry the visual half.
    ex.player.setPosition(npc.x, npc.z + 1, ex.tileMap);
    return {
      id: npc.id, legLen,
      hipPivotWorldY: +(bodyW.y + (legLen || 0)).toFixed(3),
      groupY: bodyW.y,
      kneeW, ankleW,
      ankleAboveFloor: ankleW ? +ankleW.y.toFixed(3) : null,
      bodyForward: { x: +fwd.x.toFixed(3), z: +fwd.z.toFixed(3) },
      thighDirection: { x: +thighDir.x.toFixed(3), y: +thighDir.y.toFixed(3), z: +thighDir.z.toFixed(3) },
      // +1 = thigh points the same way the body faces (correct), -1 = backwards
      thighDotForward: +(thighDir.x * fwd.x + thighDir.z * fwd.z).toFixed(3),
    };
  });

  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/seated-closeup.png` });
  writeFileSync(`${OUT}/report.json`, JSON.stringify(data, null, 2));
  console.log(JSON.stringify(data, null, 2));
} catch (e) {
  console.error('HARNESS ERROR', e);
} finally {
  await browser.close();
}
