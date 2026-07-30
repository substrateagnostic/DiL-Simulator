// F4: name the textures and materials that survive a room teardown.
//
// The 12-hop leak test in tools/perf-harness.mjs reports the SIZE of the leak
// (+82 textures over 12 hops). This names the OWNERS. It patches
// Texture.prototype.dispose / Material.prototype.dispose through a live
// instance (the classes are ES-module singletons, so a prototype patch reaches
// every texture in the app), inventories everything reachable from the room
// group, hops rooms, and prints what was never disposed grouped by the mesh
// and map slot that referenced it — i.e. by Furniture factory.
//
//   node tools/f4-texleak.mjs [--rooms=a,b] [--headless]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { compare } from 'odiff-bin';

const DIR = path.resolve('screenshots/f4');
fs.mkdirSync(DIR, { recursive: true });
const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm,reception,break_room,server_room,parking_garage').split(',');

const browser = await chromium.launch({
  headless: process.argv.includes('--headless'),
  args: ['--window-position=-2400,0', '--window-size=1300,900', '--force-device-scale-factor=1',
    '--disable-features=CalculateNativeWinOcclusion', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 240)); });

await page.goto(`${BASE}/?dev&fixture=act7&shot=${ROOMS[0]}&hud=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
await page.waitForTimeout
  ? await page.waitForTimeout(2000) : null;

const SLOTS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'emissiveMap',
  'aoMap', 'bumpMap', 'displacementMap', 'lightMap', 'specularMap', 'gradientMap', 'matcap', 'envMap'];

await page.evaluate((SLOTS) => {
  const E = window.__engine;
  // Reach Texture.prototype / Material.prototype through live instances.
  let tex = null, mat = null;
  E.scene.traverse((c) => {
    if (!c.isMesh) return;
    const m = Array.isArray(c.material) ? c.material[0] : c.material;
    if (m && !mat) mat = m;
    if (!m) return;
    for (const s of SLOTS) if (m[s]?.isTexture && !tex) tex = m[s];
  });
  const patch = (obj, tag) => {
    if (!obj) return false;
    const proto = Object.getPrototypeOf(obj);
    // Walk to the base prototype that actually defines dispose().
    let p = proto;
    while (p && !Object.prototype.hasOwnProperty.call(p, 'dispose')) p = Object.getPrototypeOf(p);
    if (!p) return false;
    const orig = p.dispose;
    p.dispose = function (...a) { this.__disposedBy = tag; return orig.apply(this, a); };
    return true;
  };
  window.__leakPatched = { tex: patch(tex, 'tex'), mat: patch(mat, 'mat') };
  window.__inventory = () => {
    const out = [];
    const g = window.__explore?.roomManager?.roomGroup
      || E.scene.children.find(c => c.name?.startsWith('room_'));
    if (!g) return -1;
    g.traverse((c) => {
      if (!c.isMesh && !c.isLine && !c.isPoints && !c.isSprite) return;
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      for (const m of mats) {
        if (!m) continue;
        out.push({ kind: 'material', ref: m, mesh: c.name || c.type, type: m.type, slot: '-', size: '-' });
        for (const s of SLOTS) {
          const t = m[s];
          if (t?.isTexture) out.push({
            kind: 'texture', ref: t, mesh: c.name || c.type, type: t.type, slot: s,
            size: `${t.source?.data?.width || '?'}x${t.source?.data?.height || '?'}`,
          });
        }
      }
    });
    window.__inv = out;
    return out.length;
  };
  window.__survivors = () => {
    const seen = new Set();
    const rows = [];
    for (const e of window.__inv || []) {
      if (seen.has(e.ref)) continue;
      seen.add(e.ref);
      if (e.ref.__disposedBy) continue;
      rows.push({ kind: e.kind, mesh: e.mesh, type: e.type, slot: e.slot, size: e.size,
        shared: e.ref.userData?.shared === true, owned: e.ref.userData?.roomOwned === true });
    }
    window.__inv = null;
    return rows;
  };
}, SLOTS);

const patched = await page.evaluate(() => window.__leakPatched);
console.log('prototype patch:', patched);

for (let i = 0; i < ROOMS.length; i++) {
  const room = ROOMS[i];
  const next = ROOMS[(i + 1) % ROOMS.length];
  await page.evaluate((r) => window.__explore._loadRoom(r), room);
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => ({
    n: window.__inventory(),
    tex: window.__engine.renderer.info.memory.textures,
    geo: window.__engine.renderer.info.memory.geometries,
  }));
  await page.evaluate((r) => window.__explore._loadRoom(r), next);
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({
    rows: window.__survivors(),
    tex: window.__engine.renderer.info.memory.textures,
    geo: window.__engine.renderer.info.memory.geometries,
  }));

  const texRows = after.rows.filter(r => r.kind === 'texture');
  const matRows = after.rows.filter(r => r.kind === 'material');
  console.log(`\n=== ${room} -> ${next} · inventoried ${before.n} refs · renderer textures ${before.tex} -> ${after.tex} (geo ${before.geo} -> ${after.geo})`);
  const group = (rows) => {
    const m = new Map();
    for (const r of rows) {
      const k = `${r.mesh.replace(/_[-\d.]+_[-\d.]+$/, '')} · ${r.type} · ${r.slot} · ${r.size}`;
      m.set(k, (m.get(k) || 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  console.log(`  undisposed TEXTURES: ${texRows.length}`);
  for (const [k, n] of group(texRows).slice(0, 25)) console.log(`    x${n}  ${k}`);
  console.log(`  undisposed MATERIALS: ${matRows.length}`);
  for (const [k, n] of group(matRows).slice(0, 15)) console.log(`    x${n}  ${k}`);
}

// ── Round-trip corruption check ────────────────────────────────────────────
// The failure mode of any dispose() sweep is disposing something SHARED: the
// surface goes black/white three rooms later. So: still of room[0] on a fresh
// visit, cycle every room, come back, still again, exact odiff. A shared
// texture killed on the way out shows up here and nowhere else.
const shot = async (tag) => {
  await page.evaluate((r) => window.__explore._loadRoom(r), ROOMS[0]);
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const E = window.__engine;
    E.stop();
    // Pin the camera by hand — the follow camera's dead zone and the room-entry
    // narrator dialog would otherwise dominate the diff and hide the thing we
    // are actually testing for (a blanked shared texture).
    E.camera.position.set(24, 24, 24);
    E.camera.lookAt(6, 0, 6);
    E.camera.updateMatrixWorld(true);
    for (const el of document.querySelectorAll('.dialog-box, #dialog-box, .dialog-container'))
      el.style.display = 'none';
    E.renderScene(E.scene, E.camera); E.renderScene(E.scene, E.camera);
  });
  await page.waitForTimeout(200);
  const p = path.join(DIR, `roundtrip_${ROOMS[0]}_${tag}.png`);
  await page.screenshot({ path: p });
  await page.evaluate(() => window.__engine.start());
  return p;
};
const first = await shot('first');
for (const r of ROOMS.slice(1)) {
  await page.evaluate((x) => window.__explore._loadRoom(x), r);
  await page.waitForTimeout(500);
}
const second = await shot('return');
const rt = await compare(first, second, path.join(DIR, `roundtrip_${ROOMS[0]}_diff.png`),
  { threshold: 0, antialiasing: false, outputDiffMask: true });
// The exact threshold catches sub-visible AO/dither/precision noise, which is not
// what this test is for: a disposed SHARED texture blanks a surface, and that is
// a perceptible, localised change. So the verdict is read at threshold 0.1.
const rtp = await compare(first, second, path.join(DIR, `roundtrip_${ROOMS[0]}_diff_perceptible.png`),
  { threshold: 0.1, antialiasing: true, outputDiffMask: true });
console.log(`\nROUND TRIP ${ROOMS[0]} first-visit vs return-visit`);
console.log(`  exact (threshold 0, AA off):        ${JSON.stringify(rt)}`);
console.log(`  perceptible (threshold 0.1, AA on): ${JSON.stringify(rtp)}   <- the corruption verdict`);

if (errs.length) console.log('\nPAGE ERRORS:', errs.slice(0, 5));
await browser.close();
