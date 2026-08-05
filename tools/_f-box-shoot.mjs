// D2 evidence: the packing carton, and Meredith standing at it.
//
// Two plates through the shipping room builder at the shipping iso camera,
// HEADED and `?qtier=high` (the adaptive governor hides the room-FX pool group
// at 'low', which would make a dressing capture a picture of a different game):
//
//   before  act4_complete           - the secondary desk, undressed
//   after   act5_complete           - the carton on it, Meredith at (3,4)
//
// It also snaps a HERO crop of the carton so the prop can be judged as a prop
// rather than as four pixels in a wide shot, and reports the furniture delta
// the room builder actually applied.
//
// AND IT ASSERTS THE FACING, which is the whole reason this file changed in
// round 3. Round 2 PRINTED `facing` off the live mesh and shipped a woman
// standing with her back to the box, because a printed number is a rorschach
// test that agrees with whoever wrote the room data. A radian is not the
// judgement; DIRECTION is. So: forward = (sin ry, cos ry), to-box = the
// normalised vector from her feet to the carton's world position, and the
// harness requires dot(forward, to-box) > 0.7 AND the wrapped angular error
// < 0.6 rad. Fails loud, exits non-zero.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/f-run/box';
mkdirSync(OUT, { recursive: true });

const STATES = [
  ['before-act4', { briefing_complete: true, act2_complete: true, act3_complete: true, act4_complete: true }],
  ['after-act5', { briefing_complete: true, act2_complete: true, act3_complete: true, act4_complete: true, act5_complete: true }],
];

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(`http://localhost:${PORT}/?dev&qtier=high`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const tap = async (key, ms = 90) => { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); };
await tap('Enter'); await page.waitForTimeout(400);
await tap('Enter'); await page.waitForTimeout(3500);

const seen = {};
for (const [label, flags] of STATES) {
  const r = await page.evaluate(async ({ flags }) => {
    const ex = window.__explore;
    for (const k of ['briefing_complete', 'act2_complete', 'act3_complete', 'act4_complete',
      'act5_complete', 'act6_complete', 'meredith_left']) ex.player.flags[k] = false;
    Object.assign(ex.player.flags, flags);
    ex._syncActFromFlags?.();
    ex._refreshStoryProgress(true);
    // `_loadRoom`, not `_changeRoom`: the executive floor is keycard-gated and
    // `_changeRoom` correctly refuses it. This is the same door tools/shoot.mjs
    // uses for its room plates.
    // Spawn at (4,5), next to the secondary desk, so the camera frames it
    // rather than the room centre.
    ex._loadRoom('executive_floor', 4, 5);
    ex._updateLocationDisplay('executive_floor');
    await new Promise(res => setTimeout(res, 1200));
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const live = (ROOMS.executive_floor.furniture || []).filter(f => {
      if (!f.condition) return true;
      const { flag, notFlag } = f.condition;
      return (!flag || ex.player.getFlag(flag)) && (!notFlag || !ex.player.getFlag(notFlag));
    });
    const tally = {};
    for (const f of live) tally[f.type] = (tally[f.type] || 0) + 1;
    // Was the mesh actually built? Ask the live scene, not the data.
    // Was the mesh actually BUILT, and is the woman actually there? Ask the
    // live scene graph, not the room data.
    let boxNodes = 0;
    let boxPos = null;
    ex.roomManager?.mainScene?.traverse?.(o => {
      if (o.userData?.furnitureType !== 'cardboardBox') return;
      boxNodes++;
      // World position, not the authored x/z: the assertion has to test the
      // mesh the camera photographs, or it is testing room data again.
      o.updateMatrixWorld?.(true);
      boxPos = { x: o.matrixWorld.elements[12], y: o.matrixWorld.elements[13], z: o.matrixWorld.elements[14] };
    });
    const npcs = (ex.roomManager?.entityManager?.npcs || [])
      .filter(n => n.id === 'meredith' && n.mesh?.visible)
      .map(n => ({ x: +n.mesh.position.x.toFixed(2), z: +n.mesh.position.z.toFixed(2), facing: +(n.mesh.rotation.y).toFixed(2) }));
    // Project the desk's world position to screen space so the crop finds the
    // prop instead of a hand-guessed rectangle.
    // NOTE: no `import('three')` here -- a bare specifier does not resolve
    // inside an evaluate(), and `import('/src/core/Engine.js')` hands back a
    // SECOND EngineClass under Vite HMR (see CityBackdrop's window.__city note).
    // Both are avoided by reaching the live camera through the app's own object
    // graph and cloning a Vector3 that already exists.
    // `window.__engine` is the singleton the app itself installed under
    // DEV_MODE. IsometricCamera is a controller, not a THREE camera -- it
    // drives Engine.camera.
    const cam = window.__engine.camera;
    // Centre the crop on the CARTON, not on the desk tile - that was the one
    // number the round-2 note said needed changing. And size it by measuring
    // the prop's real on-screen footprint: project all 8 corners of its 0.5 m
    // cube, take the screen-space bounding box, and open the crop to 3x its
    // width so the carton fills a third of the frame at any camera zoom.
    const c = boxPos || { x: 3, y: 0.9, z: 3 };
    const proj = (x, y, z) => {
      const v = cam.position.clone().set(x, y, z).project(cam);
      return [(v.x * 0.5 + 0.5) * window.innerWidth, (-v.y * 0.5 + 0.5) * window.innerHeight];
    };
    const [sx, sy] = proj(c.x, c.y + 0.18, c.z);
    let bx0 = Infinity, bx1 = -Infinity;
    for (const dx of [-0.25, 0.25]) for (const dy of [0, 0.36]) for (const dz of [-0.25, 0.25]) {
      const [px] = proj(c.x + dx, c.y + dy, c.z + dz);
      bx0 = Math.min(bx0, px); bx1 = Math.max(bx1, px);
    }
    const propW = Math.max(8, bx1 - bx0);
    // Hide the HUD and every text surface for the plate.
    document.querySelectorAll('.na-root, #hud, .game-hud, .ui-hud').forEach(e => { e.style.display = 'none'; });
    if (ex.hudElement) ex.hudElement.style.display = 'none';
    ex.ui?.hide?.();
    return {
      tally, count: live.length, boxNodes, meredith: npcs, box: boxPos,
      screen: [Math.round(sx), Math.round(sy)],
      propW: +propW.toFixed(1),
    };
  }, { flags });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/exec-${label}.png` });
  // Context crop: 520x400 around the CARTON (round 2 centred it on the desk
  // tile, which put the prop off toward one corner). Desk, box and the woman
  // all in one rectangle.
  const [sx, sy] = r.screen;
  await page.screenshot({
    path: `${OUT}/exec-${label}-crop.png`,
    clip: { x: Math.max(0, sx - 260), y: Math.max(0, sy - 200), width: 520, height: 400 },
  });
  seen[label] = r;
  console.log(`${label.padEnd(12)} props=${r.count}  cardboardBox data=${r.tally.cardboardBox || 0} builtNodes=${r.boxNodes}  meredith=${JSON.stringify(r.meredith)}`);
}

const keys = [...new Set([...Object.keys(seen['before-act4'].tally), ...Object.keys(seen['after-act5'].tally)])];
const diff = keys.map(k => [k, (seen['after-act5'].tally[k] || 0) - (seen['before-act4'].tally[k] || 0)])
  .filter(([, d]) => d !== 0).map(([k, d]) => `${d > 0 ? '+' : ''}${d} ${k}`);
console.log(`\nact4 -> act5 delta: ${diff.join(', ') || 'NO CHANGE'}`);

// ---- THE ASSERTION ----------------------------------------------------
// Is she facing the box? Not `what is her facing value` - IS SHE FACING THE
// BOX. forward = (sin ry, cos ry) because theta -> (sin, 0, cos) and z=0 is
// the north wall; to-box is normalised; dot > 0.7 is a cone of about 45 deg
// either side, and the wrapped angular error must also be under 0.6 rad.
let facingFail = 0;
{
  const a = seen['after-act5'];
  const her = a.meredith[0];
  if (!her || !a.box) {
    console.log(`\nFACING  FAIL  meredith=${JSON.stringify(a.meredith)} box=${JSON.stringify(a.box)} - nothing to measure`);
    facingFail = 1;
  } else {
    const fx = Math.sin(her.facing), fz = Math.cos(her.facing);
    let dx = a.box.x - her.x, dz = a.box.z - her.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    const dot = fx * dx + fz * dz;
    const want = Math.atan2(a.box.x - her.x, a.box.z - her.z);
    let err = Math.abs(her.facing - want) % (Math.PI * 2);
    if (err > Math.PI) err = Math.PI * 2 - err;
    const ok = dot > 0.7 && err < 0.6;
    if (!ok) facingFail = 1;
    console.log(`\nFACING  ${ok ? 'PASS' : 'FAIL'}  she is at (${her.x}, ${her.z}) facing ${her.facing.toFixed(3)} rad;`
      + ` carton at (${a.box.x.toFixed(2)}, ${a.box.z.toFixed(2)});`
      + ` faceTowards would want ${want.toFixed(3)};`
      + ` err ${err.toFixed(3)} rad (< 0.6);`
      + ` dot(forward, to-box) = ${dot.toFixed(4)} (> 0.7)`);
    console.log(`        forward vector (${fx.toFixed(3)}, ${fz.toFixed(3)}) -> ${Math.abs(fz) > Math.abs(fx) ? (fz > 0 ? 'SOUTH' : 'NORTH') : (fx > 0 ? 'EAST' : 'WEST')};`
      + ` carton lies ${Math.abs(dz) > Math.abs(dx) ? (dz > 0 ? 'SOUTH' : 'NORTH') : (dx > 0 ? 'EAST' : 'WEST')} of her`);
  }
}
// ---- THE HERO PLATE ---------------------------------------------------
// The carton is about 36 px wide in a 1920x1080 frame. That is not the crop
// rect's fault - it is a diorama camera looking at a half-metre box - so
// "make the carton fill a third of the frame" cannot be done by tightening a
// rectangle alone. It is done by RENDERING MORE PIXELS THROUGH THE SAME
// CAMERA: the ortho frustum's vertical world extent is fixed and the aspect
// is preserved at 16:9, so a 5760x3240 viewport is the identical shipping
// framing at 3x the sample density. Then the crop is 3x the prop's measured
// on-screen width, which is the third-of-frame the note asked for, and every
// pixel in it was drawn rather than stretched.
{
  await page.setViewportSize({ width: 5760, height: 3240 });
  await page.waitForTimeout(1500);
  const h = await page.evaluate(() => {
    const ex = window.__explore;
    let box = null;
    ex.roomManager?.mainScene?.traverse?.(o => {
      if (o.userData?.furnitureType !== 'cardboardBox') return;
      o.updateMatrixWorld?.(true);
      box = { x: o.matrixWorld.elements[12], y: o.matrixWorld.elements[13], z: o.matrixWorld.elements[14] };
    });
    const c = box || { x: 3, y: 0.9, z: 3 };
    const cam = window.__engine.camera;
    const proj = (x, y, z) => {
      const v = cam.position.clone().set(x, y, z).project(cam);
      return [(v.x * 0.5 + 0.5) * window.innerWidth, (-v.y * 0.5 + 0.5) * window.innerHeight];
    };
    let bx0 = Infinity, bx1 = -Infinity;
    for (const dx of [-0.25, 0.25]) for (const dy of [0, 0.36]) for (const dz of [-0.25, 0.25]) {
      const [px] = proj(c.x + dx, c.y + dy, c.z + dz);
      bx0 = Math.min(bx0, px); bx1 = Math.max(bx1, px);
    }
    const [sx, sy] = proj(c.x, c.y + 0.18, c.z);
    return { propW: bx1 - bx0, sx, sy, vw: window.innerWidth, vh: window.innerHeight };
  });
  const cw = Math.round(h.propW * 3), ch = Math.round(h.propW * 3 * 0.75);
  await page.screenshot({
    path: `${OUT}/exec-hero-box.png`,
    clip: {
      x: Math.max(0, Math.min(h.vw - cw, h.sx - cw / 2)),
      y: Math.max(0, Math.min(h.vh - ch, h.sy - ch / 2)),
      width: cw, height: ch,
    },
  });
  console.log(`\nHERO    ${cw}x${ch} px at a ${h.vw}x${h.vh} render;`
    + ` the carton measures ${h.propW.toFixed(1)} px across, i.e. ${(100 / 3).toFixed(0)}% of the crop width`);
}
await browser.close();
process.exit(diff.length && !facingFail ? 0 : 1);
