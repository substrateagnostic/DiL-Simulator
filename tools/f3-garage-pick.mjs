// F3: name the mesh under each garage-void artifact pixel, and enumerate street-level
// towers whose LIT SEAM face is camera-facing (the suspected stretch/tear source).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('screenshots/f3');
fs.mkdirSync(DIR, { recursive: true });
const TAG = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'pick';

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
    '--disable-features=CalculateNativeWinOcclusion', '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:5173/?dev&fixture=act7&shot=parking_garage&hud=0', { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(650); await page.keyboard.up('ArrowRight');
await page.waitForTimeout(700);
await page.evaluate(async () => { window.__THREE = await import('/node_modules/three/build/three.module.js'); });
await page.waitForFunction(() => !!window.__THREE, { timeout: 15000 });

// Pixels read off iso_01/iso_02 by eye (same camera position as this run)
const PTS = [
  { x: 1166, y: 40, note: 'amber bar top' },
  { x: 1166, y: 200, note: 'amber bar mid' },
  { x: 1166, y: 340, note: 'amber bar just above its hard bottom cut' },
  { x: 1166, y: 380, note: 'just BELOW the hard bottom cut' },
  { x: 1902, y: 100, note: 'right thin line top' },
  { x: 1902, y: 400, note: 'right thin line mid' },
  { x: 1902, y: 520, note: 'right thin line near end' },
  { x: 1772, y: 240, note: 'orphan fragment A' },
  { x: 1890, y: 455, note: 'orphan fragment B' },
  { x: 100, y: 1000, note: 'bottom-left fragment' },
];

const out = await page.evaluate((pts) => {
  const THREE = window.__THREE;
  const E = window.__engine, cb = E.cityBackdrop;
  const rc = new THREE.Raycaster();
  const label = (obj) => {
    const idx = cb.buildings.findIndex(b => b.mesh === obj);
    if (idx >= 0) { const b = cb.buildings[idx];
      return `tower#${idx} var=${b.variant} h=${b.h.toFixed(1)} r=${b.radius.toFixed(1)} scaleY=${obj.scale.y} posY=${obj.position.y.toFixed(2)} color=#${obj.material.color.getHexString()}`; }
    if (obj === cb.hqTower) return `HQ_TOWER 11x46x8 scaleY=${obj.scale.y} posY=${obj.position.y.toFixed(2)} color=#${obj.material.color.getHexString()}`;
    const fx = cb.streetFX.find(f => f.mesh === obj);
    if (fx) return `streetFX kind=${fx.kind}`;
    if (cb.beacons.find(b => b.mesh === obj)) return 'beacon';
    if (cb.beacons.find(b => b.mast === obj)) return 'beacon mast';
    if (obj === cb.streetGround) return 'streetGround';
    if ((cb.mistPatches || []).find(m => m.mesh === obj)) return 'mist';
    let p = obj, chain = []; while (p) { chain.push(p.name || p.type); p = p.parent; }
    return 'ROOM/other: ' + chain.slice(0, 4).join(' < ');
  };
  const picks = [];
  for (const p of pts) {
    const ndc = new THREE.Vector2((p.x / 1920) * 2 - 1, -((p.y / 1080) * 2 - 1));
    rc.setFromCamera(ndc, E.camera);
    const inter = rc.intersectObjects(E.scene.children, true).filter(i => i.object.visible && i.object.isMesh);
    picks.push({ px: p, hits: inter.slice(0, 3).map(i => ({ d: +i.distance.toFixed(1), uv: i.uv ? [+i.uv.x.toFixed(3), +i.uv.y.toFixed(3)] : null, what: label(i.object) })) });
  }

  // Which towers present their LIT SEAM face to the camera, and how tall on screen?
  const camDir = new THREE.Vector3(); E.camera.getWorldDirection(camDir);
  const proj = (v) => { const q = v.clone().project(E.camera); return [(q.x * .5 + .5) * 1920, (1 - (q.y * .5 + .5)) * 1080]; };
  const FACE_N = { 0: [1, 0, 0], 1: [-1, 0, 0], 4: [0, 0, 1], 5: [0, 0, -1] };
  const seamRows = [];
  const all = cb.buildings.map((b, i) => ({ i, b, mesh: b.mesh, seamFaceKnown: null }));
  cb.group.updateMatrixWorld(true);
  for (const t of all) {
    if (t.b.variant === 3) continue;              // dark tower: no seam
    const m = t.mesh; const g = m.geometry;
    // recover which face carries the seam: the face whose 4 uvs include u===0
    const uv = g.attributes.uv; let seamFace = -1;
    for (let f = 0; f < 6; f++) { for (let k = 0; k < 4; k++) { if (uv.getX(f * 4 + k) === 0) { seamFace = f; } } }
    const n = FACE_N[seamFace];
    if (!n) continue;
    const nv = new THREE.Vector3(...n);
    const facing = nv.dot(camDir) < 0;            // faces the camera
    // world-space seam edge: the box edge at local u=0 of that face
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const ex = seamFace === 0 ? bb.max.x : seamFace === 1 ? bb.min.x : (seamFace === 4 ? bb.min.x : bb.max.x);
    const ez = seamFace === 4 ? bb.max.z : seamFace === 5 ? bb.min.z : (seamFace === 0 ? bb.max.z : bb.min.z);
    const lo = new THREE.Vector3(ex, bb.min.y, ez).applyMatrix4(m.matrixWorld);
    const hi = new THREE.Vector3(ex, bb.max.y, ez).applyMatrix4(m.matrixWorld);
    const [lx, ly] = proj(lo), [hx, hy] = proj(hi);
    const onScreen = Math.max(lx, hx) > -40 && Math.min(lx, hx) < 1960;
    seamRows.push({ i: t.i, variant: t.b.variant, r: +t.b.radius.toFixed(1), h: +t.b.h.toFixed(1),
      scaleY: m.scale.y, seamFace, facingCamera: facing, onScreen,
      seamWorldY: [+lo.y.toFixed(2), +hi.y.toFixed(2)],
      seamScreen: { x: Math.round(lx), yTop: Math.round(hy), yBot: Math.round(ly), heightPx: Math.round(ly - hy) } });
  }
  return { picks, seamRows: seamRows.filter(r => r.facingCamera && r.onScreen).sort((a, b) => b.seamScreen.heightPx - a.seamScreen.heightPx),
    streetLevel: cb.streetLevel, tod: cb.tod, towerColor: cb.buildings[0].mesh.material.color.getHexString() };
}, PTS);

console.log('streetLevel', out.streetLevel, 'tod', out.tod, 'tower tint #' + out.towerColor);
console.log('\n== raycast at artifact pixels ==');
for (const r of out.picks) {
  console.log(`px(${r.px.x},${r.px.y}) ${r.px.note}`);
  if (!r.hits.length) console.log('    (nothing — void)');
  for (const h of r.hits) console.log(`    d=${h.d} uv=${JSON.stringify(h.uv)} ${h.what}`);
}
console.log('\n== street-level towers presenting a LIT SEAM to the camera ==');
for (const s of out.seamRows) console.log(`  t${s.i} var${s.variant} r${s.r} h${s.h} scaleY${s.scaleY} seamFace${s.seamFace} worldY[${s.seamWorldY}] screen x${s.seamScreen.x} y${s.seamScreen.yTop}..${s.seamScreen.yBot} (${s.seamScreen.heightPx}px tall)`);
fs.writeFileSync(path.join(DIR, `${TAG}.json`), JSON.stringify(out, null, 1));
await browser.close();
