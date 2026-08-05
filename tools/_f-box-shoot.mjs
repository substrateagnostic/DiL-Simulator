// D2 evidence: the packing carton, and Meredith standing at it.
//
// Two plates through the shipping room builder at the shipping iso camera,
// HEADED and `?qtier=high` (the adaptive governor hides the room-FX pool group
// at 'low', which would make a dressing capture a picture of a different game):
//
//   before  act4_complete           - the secondary desk, undressed
//   after   act5_complete           - the carton on it, Meredith at (3,4)
//
// It also snaps a tight crop of the desk so the prop can be judged as a prop
// rather than as four pixels in a wide shot, and reports the furniture delta
// the room builder actually applied.
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
    ex.roomManager?.mainScene?.traverse?.(o => {
      if (o.userData?.furnitureType === 'cardboardBox') boxNodes++;
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
    const v = cam.position.clone().set(3, 0.9, 3).project(cam);
    const sx = (v.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-v.y * 0.5 + 0.5) * window.innerHeight;
    // Hide the HUD and every text surface for the plate.
    document.querySelectorAll('.na-root, #hud, .game-hud, .ui-hud').forEach(e => { e.style.display = 'none'; });
    if (ex.hudElement) ex.hudElement.style.display = 'none';
    ex.ui?.hide?.();
    return { tally, count: live.length, boxNodes, meredith: npcs, screen: [Math.round(sx), Math.round(sy)] };
  }, { flags });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/exec-${label}.png` });
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
await browser.close();
process.exit(diff.length ? 0 : 1);
