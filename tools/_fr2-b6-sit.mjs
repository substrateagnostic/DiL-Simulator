// FIX ROUND 2 — B6, the picture round 1 owed and did not deliver.
//
// Round 1 carried this item on a dot product ("thigh points the way the body
// faces") and shipped a `seated-closeup.png` pair that was a black fade frame
// against a wide room shot — it could not show a leg, which is the whole
// defect. Its own header admits an inspection zoom "produced a black frame
// twice, and chasing a capture bug is not evidence". This is the capture bug,
// chased.
//
// WHY IT WENT BLACK, and the fix: the shipping exploration render is
// Engine's own loop calling renderScene(this.scene, this.camera) every frame,
// and IsometricCamera writes camera.position from `cameraController.current`
// on that same frame. Any harness that stops the loop to render one hand-aimed
// frame is reading a canvas with preserveDrawingBuffer off — i.e. black. So we
// do not stop the loop and we do not build a camera: we push the SHIPPING
// orthographic camera's frustum in to a close-up width, park the controller on
// the chair (bounds cleared, dead zone defeated by writing `current` directly)
// and let the game keep rendering itself. Every pass in the Display Case stack
// is still in the loop; tilt-shift is the one thing switched off, because it
// blurs the top and bottom thirds of an orthographic frame and the legs are in
// the bottom third.
//
// CAPTURE LAW: ?qtier=high, and the quality tier is sampled after the shot and
// reported, so a governor demotion cannot pass as a picture of the game.
//
//   node tools/_fr2-b6-sit.mjs --npc=reception_client --zoom=1.5
//
// Three plates: seated-closeup.png (in situ, shipping room), seated-rig.png
// (same camera, room geometry hidden so the thigh line is visible at all) and
// seated-rig-prefix.png (the same body with the pre-fix sign put back).

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const ZOOM = Number(process.argv.find(a => a.startsWith('--zoom='))?.slice(7) || 1.9);
const ROOM = process.argv.find(a => a.startsWith('--room='))?.slice(7) || 'reception';
const WHO  = process.argv.find(a => a.startsWith('--npc='))?.slice(6) || 'diane';
const OUT = 'screenshots/fix-round-2/b6-sit';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

try {
  await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act3&shot=${ROOM}`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1600);

  const info = await page.evaluate(async ({ zoom, who }) => {
    const ex = window.__explore;
    const THREE = await import('/node_modules/three/build/three.module.js');
    const eng = window.__engine;

    // Prefer a body the ROOM DATA seats, so the plate is the shipping state and
    // not a pose the harness invented.
    const npcs = (ex.roomManager.entityManager.npcs || []).filter(n => n.mesh.visible);
    const npc = npcs.find(n => n.id === who && n.animator?.isSitting) || npcs.find(n => n.animator?.isSitting) || npcs[0];
    if (!npc) return { error: 'no visible npc' };
    const authoredSitting = !!npc.animator?.isSitting;
    if (!authoredSitting) { npc.animator.setSitting(true); npc.animator.update(0.016); }

    // Andrew's body out of the close-up so it cannot occlude the chair — but
    // his POSITION stays inside the room, parked in the south-east corner,
    // because ExplorationState._updateWallFade keys the south/east wall
    // transparency off it. Without that the near wall is opaque and it is the
    // wall, not the camera, that hides the legs.
    const tm = ex.tileMap;
    ex.player.setPosition(Math.max(1, (tm?.width ?? 12) - 1.4), Math.max(1, (tm?.height ?? 10) - 1.4), tm);
    if (ex.player?.mesh) ex.player.mesh.visible = false;

    // Frustum in. Same camera object the game renders through — only its
    // extents change, so nothing about the projection is a harness invention.
    const aspect = eng.width / eng.height;
    eng.camera.left = -zoom * aspect;
    eng.camera.right = zoom * aspect;
    eng.camera.top = zoom;
    eng.camera.bottom = -zoom;
    eng.camera.updateProjectionMatrix();

    // Park the follow controller ON the chair. Bounds cleared first (a 4-wide
    // room clamps the inset), and `current` written directly because the dead
    // zone would otherwise refuse a sub-tile move.
    // WORLD coordinates off the mesh, not the NPC's authored tile fields — the
    // controller is fed player.mesh.position by ExplorationState, so anything
    // else here is a unit mismatch and aims the frame at empty floor.
    const cc = ex.camera;   // ExplorationState.camera IS the IsometricCamera
    cc.clearBounds?.();
    const mp = npc.mesh.position;
    const aim = { x: mp.x, z: mp.z, y: mp.y + 0.60 };
    cc.snapTo(aim.x, aim.z, aim.y);
    cc.follow(aim.x, aim.z, aim.y);
    // ExplorationState.update() re-aims the controller at Andrew every frame,
    // which drags the close-up off the chair. Pin it.
    cc.follow = () => {};

    // Tilt-shift blurs the bottom third of an ortho frame; the legs are there.
    eng.setTiltShift?.(false);
    // HUD off, and the arbiter's prose card with it — this is a plate of the
    // rig, not of the interface, and the VOICE zone is page-level so hiding the
    // exploration HUD does not take it.
    const hud = document.querySelector('.exploration-hud');
    if (hud) hud.style.display = 'none';
    const na = document.querySelector('.na-root');
    if (na) na.style.display = 'none';

    const wp = (o) => { const v = new THREE.Vector3(); o.getWorldPosition(v); return { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) }; };
    const g = npc.mesh;
    const legLen = g.legLength ?? null;
    const leg = g.leftLeg;
    const knee = leg && leg.knee;
    let ankleW = null;
    if (knee) { const v = new THREE.Vector3(0, -(legLen * 0.48), 0); knee.localToWorld(v); ankleW = { x: +v.x.toFixed(3), y: +v.y.toFixed(3), z: +v.z.toFixed(3) }; }
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(g.getWorldQuaternion(new THREE.Quaternion()));
    const thighDir = new THREE.Vector3(0, -1, 0).applyQuaternion(leg.getWorldQuaternion(new THREE.Quaternion()));

    return {
      id: npc.id, authoredSitting, legLen, zoom, aim,
      groupY: wp(g).y,
      kneeW: knee ? wp(knee) : null,
      ankleW, ankleAboveFloor: ankleW ? +ankleW.y.toFixed(3) : null,
      bodyForward: { x: +fwd.x.toFixed(3), z: +fwd.z.toFixed(3) },
      thighDirection: { x: +thighDir.x.toFixed(3), y: +thighDir.y.toFixed(3), z: +thighDir.z.toFixed(3) },
      thighDotForward: +(thighDir.x * fwd.x + thighDir.z * fwd.z).toFixed(3),
    };
  }, { zoom: ZOOM, who: WHO });

  // Let the follow lerp settle and several real frames composite.
  await page.waitForTimeout(1200);
  // AIM CHECK, then one measured correction. The frame centre is the
  // controller's lookAt point; anything that leaves the body off centre is a
  // unit or a parenting error, so measure the residual in NDC and null it
  // rather than eyeballing a zoom number.
  const aimErr = await page.evaluate(async (who) => {
    const ex = window.__explore; const eng = window.__engine;
    const THREE = await import('/node_modules/three/build/three.module.js');
    const npc = (ex.roomManager.entityManager.npcs || []).find(n => n.id === who) || null;
    if (!npc) return null;
    const p = new THREE.Vector3(); npc.mesh.getWorldPosition(p); p.y += 0.55;
    const ndcOf = (v) => { const q = v.clone().project(eng.camera); return { x: +q.x.toFixed(3), y: +q.y.toFixed(3) }; };
    const before = ndcOf(p);
    // finite difference on the two ground axes
    const cc = ex.camera; const x0 = cc.current.x, z0 = cc.current.z;
    cc.current.x = x0 + 1; cc.update(0); const dx = ndcOf(p);
    cc.current.x = x0; cc.current.z = z0 + 1; cc.update(0); const dz = ndcOf(p);
    cc.current.z = z0; cc.update(0);
    const a = dx.x - before.x, b = dz.x - before.x, c = dx.y - before.y, d = dz.y - before.y;
    const det = a * d - b * c;
    if (Math.abs(det) > 1e-6) {
      const sx = (-before.x * d + before.y * b) / det;
      const sz = (-a * before.y + c * before.x) / det;
      cc.current.x = x0 + sx; cc.current.z = z0 + sz;
      cc.target.x = cc.current.x; cc.target.z = cc.current.z;
      cc.update(0);
    }
    return { before, after: ndcOf(p) };
  }, WHO);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/seated-closeup.png` });

  // CAPTURE LAW: prove the tier did not walk down under capture load, and that
  // the frame is not black.
  const tier = await page.evaluate(() => window.__engine?.qualityTier ?? null);
  const luma = await page.evaluate(async () => {
    // Read the SAVED path's own pixels is impossible in-page (no
    // preserveDrawingBuffer); this only asserts the canvas is attached + sized.
    const c = document.querySelector('canvas');
    return c ? { w: c.width, h: c.height } : null;
  });

  // SECOND PLATE — same camera, same frame, every furniture prop hidden except
  // the seat the body is on. The office is a room full of desks and every
  // authored sit puts the legs under one, so the in-situ plate can prove the
  // camera is on the chair but not the thigh line. This one can. It is a RIG
  // plate and is labelled as one: nothing about the pose changes, only what is
  // standing between it and the lens.
  const rig = await page.evaluate((who) => {
    const ex = window.__explore;
    const npc = (ex.roomManager.entityManager.npcs || []).find(n => n.id === who);
    if (!npc) return null;
    const room = ex.roomManager.currentRoom;
    // The room merges its static furniture into batched meshes
    // (Room._mergeStatics), so per-prop userData is gone by render time and a
    // furnitureType sweep leaves the desk standing. Hide by TOP-LEVEL CHILD
    // instead: everything in the room scene goes except the floor plane, the
    // lights and the bodies.
    let hidden = 0; const kept = [];
    const bodies = new Set((ex.roomManager.entityManager.npcs || []).map(n => n.mesh));
    for (const o of [...room.scene.children]) {
      if (bodies.has(o) || o.isLight || /floor|tile|ground/i.test(o.name || '')) { kept.push(o.name || o.type); continue; }
      if (o.visible) { o.visible = false; hidden++; }
    }
    npc.mesh.visible = true;
    return { hidden, kept: kept.slice(0, 12) };
  }, WHO);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/seated-rig.png` });

  // THE BEFORE, from the same camera on the same body. The round-1 fix is one
  // sign on each thigh (CharacterAnimator: rotation.x -PI/2, was +PI/2), so the
  // defect is reproduced by putting that sign back AFTER the animator has run
  // its frame — no src change, no second build, and the two plates differ in
  // exactly the thing the item is about.
  const pre = await page.evaluate((who) => {
    const ex = window.__explore;
    const npc = (ex.roomManager.entityManager.npcs || []).find(n => n.id === who);
    if (!npc) return null;
    const orig = npc.animator.update.bind(npc.animator);
    npc.animator.update = (dt) => {
      orig(dt);
      if (npc.mesh.leftLeg)  npc.mesh.leftLeg.rotation.x  = Math.PI / 2;
      if (npc.mesh.rightLeg) npc.mesh.rightLeg.rotation.x = Math.PI / 2;
    };
    return { restored: 'thigh rotation.x = +PI/2 (pre-fix)' };
  }, WHO);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/seated-rig-prefix.png` });

  const report = { ...info, aimErr, rig, pre, qualityTier: tier, canvas: luma };
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} catch (e) {
  console.error('HARNESS ERROR', e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
