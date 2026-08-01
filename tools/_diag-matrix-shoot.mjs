// THROWAWAY DIAGNOSTIC — the SPINE/FLOOR render matrix.
//
// Axes:
//   asset : RAW export GLB (art/char_refs/meshy_pilot/_raw_runtime) vs
//           OPTIMIZED runtime GLB (public/meshy)
//   pose  : BIND (no animation) | WAVE1 (the character's OWN baked Meshy idle,
//           authored on its own rig) | STANCE (the SHARED a336 clip authored on
//           andrew's rig and retargeted by bone name)
//   angle : front / side / back / three-quarter  (side is the spine read)
//
// Per character it writes one 4-col x 6-row contact sheet, plus a cast-wide
// side-view sheet. It ALSO measures, per cell, the lowest SKINNED vertex Y
// (CPU skinning via SkinnedMesh.applyBoneTransform) against the floor plane at
// y = 0 — the floor-contact / "karen is hovering" number.
//
//   node tools/_diag-matrix-shoot.mjs --ids=a,b,c [--out=<dir>]
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const ids = String(args.ids || '').split(',').filter(Boolean);
if (!ids.length) { console.error('need --ids'); process.exit(1); }
const OUT = args.out ? (args.out.match(/^[A-Za-z]:|^\//) ? args.out : join(REPO, args.out))
  : join(REPO, 'art/char_refs/meshy_pilot/_diag_spine');
mkdirSync(OUT, { recursive: true });

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.json': 'application/json', '.wasm': 'application/wasm' };
const TILE = 340;

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#12121a}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(${TILE}, ${TILE}); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x12121a);
const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
// Approximated CombatScene rig, but deliberately flatter so SILHOUETTE reads.
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const dir = new THREE.DirectionalLight(0xffffff, 0.75); dir.position.set(2, 5, 3); scene.add(dir);
const fill = new THREE.DirectionalLight(0xc6d4f2, 0.45); fill.position.set(-2, 2, 5); scene.add(fill);
const back = new THREE.DirectionalLight(0xffffff, 0.5); back.position.set(0, 3, -5); scene.add(back);
const ramp = (() => {
  const d = new THREE.DataTexture(new Uint8Array([80, 160, 255]), 3, 1, THREE.RedFormat);
  d.minFilter = THREE.NearestFilter; d.magFilter = THREE.NearestFilter; d.needsUpdate = true; return d;
})();

// FLOOR + PLUMB GRID. The floor plane sits at y = 0 (the arena floor: CombatScene
// puts every combatant group at position.y = 0 and applies no vertical offset),
// so any gap between the shoes and this grid IS the hover.
const grid = new THREE.GridHelper(4, 16, 0xff4444, 0x334455);
grid.position.y = 0; scene.add(grid);
const floorLine = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.006),
  new THREE.MeshBasicMaterial({ color: 0xff3333 }));
floorLine.position.set(0, 0.0005, 0); floorLine.rotation.x = -Math.PI / 2; scene.add(floorLine);

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
let model = null, mixer = null, H = 1.7, bindMinY = 0, skinned = [];

function clearModel() {
  if (model) { scene.remove(model); model = null; }
  mixer = null; skinned = [];
}

window.__load = (url) => new Promise((res, rej) => {
  clearModel();
  loader.load(url, (gltf) => {
    model = gltf.scene;
    model.traverse(c => {
      if (c.isSkinnedMesh) { c.frustumCulled = false; skinned.push(c); }
      if (c.isMesh && c.material) c.material = new THREE.MeshToonMaterial({ map: c.material.map || null, color: 0xffffff, gradientMap: ramp });
    });
    scene.add(model);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    H = box.getSize(new THREE.Vector3()).y || 1.7;
    bindMinY = box.min.y;
    window.__gltf = gltf;
    window.__anims = (gltf.animations || []).map(a => ({ name: a.name, dur: a.duration, tracks: a.tracks.length }));
    res({ H, bindMinY, anims: window.__anims });
  }, undefined, e => rej(String(e)));
});

// Pose the model. mode: 'bind' | 'wave1' | 'stance'
window.__pose = async (mode, t) => {
  if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model); mixer = null; }
  model.updateMatrixWorld(true);
  if (mode === 'bind') return;
  let clip = null;
  if (mode === 'wave1') {
    const anims = window.__gltf.animations || [];
    // MeshyCast uses animations[0]; prefer the one that actually carries the
    // baked idle if the export names it (Armature / Idle_N / baselayer).
    clip = anims.find(a => /idle/i.test(a.name) && a.tracks.length > 4) || anims.find(a => a.tracks.length > 4) || anims[0] || null;
  } else {
    if (!window.__clipCache) {
      window.__clipCache = await new Promise((res, rej) =>
        loader.load('/clips/a336.glb', g => res(g.animations[0]), undefined, e => rej(String(e))));
    }
    clip = window.__clipCache;
  }
  if (!clip) return;
  mixer = new THREE.AnimationMixer(model);
  const act = mixer.clipAction(clip); act.play();
  mixer.setTime(t || 0);
  model.updateMatrixWorld(true);
};

// LOWEST SKINNED VERTEX in world space, for the current pose. Box3.setFromObject
// reports the BIND bounds for a SkinnedMesh, so the skin has to be evaluated on
// the CPU: applyBoneTransform is exactly what the vertex shader does.
window.__floor = () => {
  let min = Infinity, minMesh = null, max = -Infinity;
  const v = new THREE.Vector3();
  for (const m of skinned) {
    m.updateMatrixWorld(true);
    const pos = m.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 24000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i);
      m.applyBoneTransform(i, v);
      m.localToWorld(v);
      if (v.y < min) { min = v.y; minMesh = m.name; }
      if (v.y > max) max = v.y;
    }
  }
  return { minY: min, maxY: max, mesh: minMesh, verts: skinned.reduce((a, m) => a + m.geometry.attributes.position.count, 0) };
};

// Camera framing is normalised on the BIND height so every cell is the same
// apparent size and a spine bend is not confused with a scale change.
window.__cam = (angle) => {
  const d = H * 1.85, cy = H * 0.52;
  const A = { front: 0, side: Math.PI / 2, back: Math.PI, threeq: Math.PI * 0.25 }[angle] ?? 0;
  camera.position.set(Math.sin(A) * d, cy, Math.cos(A) * d);
  camera.lookAt(0, cy, 0);
  renderer.render(scene, camera);
};
window.__tile = ${TILE};
window.__ready = true;
</script></body></html>`;

const ROOTS = {
  '/node_modules/': join(REPO, 'node_modules'),
  '/opt/': join(REPO, 'public/meshy'),
  '/raw/': join(REPO, 'art/char_refs/meshy_pilot/_raw_runtime'),
  '/clips/': join(REPO, 'public/meshy/clips'),
};
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/harness.html') { res.setHeader('Content-Type', 'text/html'); return res.end(HARNESS); }
  for (const [prefix, root] of Object.entries(ROOTS)) {
    if (url.startsWith(prefix)) {
      try {
        const p = join(root, url.slice(prefix.length));
        res.setHeader('Content-Type', MIME[extname(p)] || 'application/octet-stream');
        return res.end(readFileSync(p));
      } catch { res.statusCode = 404; return res.end('nf'); }
    }
  }
  res.statusCode = 404; res.end('nf');
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

// HEADED chromium — headless SwiftShader is both slow and a different rasteriser.
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: TILE + 40, height: TILE + 40 } })).newPage();
await page.goto(`http://localhost:${port}/harness.html`);
await page.waitForFunction(() => window.__ready === true, { timeout: 60000 });

const ANGLES = ['front', 'side', 'back', 'threeq'];
const POSES = [
  { key: 'bind', t: 0, label: 'BIND (no animation)' },
  { key: 'wave1', t: 2.0, label: 'WAVE-1 baked idle (own rig)' },
  { key: 'stance', t: 2.0, label: 'SHARED a336 stance (andrew rig)' },
];
const ASSETS = [{ key: 'raw', base: '/raw/' }, { key: 'opt', base: '/opt/' }];

const measurements = [];

for (const id of ids) {
  const rows = [];   // { label, tiles: [dataURL x4] }
  for (const pose of POSES) {
    for (const asset of ASSETS) {
      const file = `${asset.base}${id}_idle.glb`;
      const localPath = join(ROOTS[asset.base], `${id}_idle.glb`);
      if (!existsSync(localPath)) { console.log(`  skip ${id} ${asset.key} (missing)`); continue; }
      let info;
      try { info = await page.evaluate(u => window.__load(u), file); }
      catch (e) { console.log(`  FAIL load ${id} ${asset.key}: ${e}`); continue; }
      await page.evaluate(([m, t]) => window.__pose(m, t), [pose.key, pose.t]);
      const floor = await page.evaluate(() => window.__floor());
      measurements.push({
        id, asset: asset.key, pose: pose.key,
        bindHeight_m: +info.H.toFixed(4),
        bindMinY_m: +info.bindMinY.toFixed(4),
        lowestVertexY_m: +floor.minY.toFixed(4),
        topVertexY_m: +floor.maxY.toFixed(4),
        verts: floor.verts,
        anims: info.anims.map(a => a.name + ':' + a.tracks).join(' '),
      });
      const tiles = [];
      for (const a of ANGLES) {
        await page.evaluate(ang => window.__cam(ang), a);
        const buf = await page.locator('canvas').screenshot();
        tiles.push(buf.toString('base64'));
      }
      rows.push({ label: `${pose.label}  —  ${asset.key.toUpperCase()}`, tiles });
      console.log(`  ${id} ${pose.key}/${asset.key}  footY=${floor.minY.toFixed(4)}m  H=${info.H.toFixed(3)}m`);
    }
  }
  if (!rows.length) continue;
  // stitch the per-character sheet in the page (canvas 2D), then save
  const png = await page.evaluate(async ([rows, TILE, title, ANGLES]) => {
    const HDR = 34, LBL = 210;
    const c = document.createElement('canvas');
    c.width = LBL + ANGLES.length * TILE;
    c.height = HDR + rows.length * TILE;
    const x = c.getContext('2d');
    x.fillStyle = '#0b0b12'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#ffffff'; x.font = 'bold 20px monospace';
    x.fillText(title, 12, 24);
    x.font = 'bold 15px monospace'; x.fillStyle = '#ffcc66';
    ANGLES.forEach((a, i) => x.fillText(a.toUpperCase(), LBL + i * TILE + 10, 24));
    for (let r = 0; r < rows.length; r++) {
      const y = HDR + r * TILE;
      x.fillStyle = '#e8e8f0'; x.font = '13px monospace';
      rows[r].label.split('  —  ').forEach((s, k) => x.fillText(s, 10, y + 26 + k * 20));
      for (let i = 0; i < rows[r].tiles.length; i++) {
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + rows[r].tiles[i]; });
        x.drawImage(img, LBL + i * TILE, y, TILE, TILE);
      }
      x.strokeStyle = '#3a3a55'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(0, y); x.lineTo(c.width, y); x.stroke();
    }
    return c.toDataURL('image/png');
  }, [rows, TILE, `${id}  —  spine/floor render matrix  (red line = arena floor y=0)`, ANGLES]);
  const dest = join(OUT, `matrix_${id}.png`);
  writeFileSync(dest, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`[sheet] ${dest}`);
}

writeFileSync(join(OUT, 'measurements.json'), JSON.stringify(measurements, null, 2));
await browser.close();
server.close();
console.log('\nMEASUREMENTS -> ' + join(OUT, 'measurements.json'));
