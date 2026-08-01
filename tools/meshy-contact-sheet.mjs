// Cast contact sheet in the SHIPPING configuration.
//
// Renders every character in public/meshy/ holding the calm stance the game
// will actually give it — through the REAL MeshyClips.clipsFor(), so each cell
// carries that character's slate-assigned idle, its per-character retarget, the
// MeshyPosture clamp and the measured foot plant, not an approximation of any
// of them. Phase offset is the shipping phaseFor(). House toon ramp under the
// CombatScene light rig. Grandma gets her bone-socketed cane, exactly as
// CombatScene attaches it.
//
//   node tools/meshy-contact-sheet.mjs [--cols=6] [--cell=300]
//
// Sheet -> art/char_refs/meshy_pilot/_cast_contact_stances.png
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const COLS = Number(args.cols || 6);
const CELL = Number(args.cell || 300);
const OUT = join(REPO, args.out || 'art/char_refs/meshy_pilot/_cast_contact_stances.png');


const ids = readdirSync(join(REPO, 'public/meshy'))
  .filter(f => f.endsWith('_idle.glb')).map(f => f.replace('_idle.glb', '')).sort();

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.json': 'application/json', '.wasm': 'application/wasm' };
const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#0b0b12}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// THE SHIPPING MODULES. clipsFor() is the function CombatScene calls.
import { captureRest, groundOffset } from '/src/combat/MeshyRetarget.js';
import { clipsFor, preloadClips, phaseFor, genderFor } from '/src/combat/MeshyClips.js';
const CELL = ${CELL};
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
renderer.setSize(CELL, CELL); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0b12);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const mk = (c, i, p) => { const l = new THREE.DirectionalLight(c, i); l.position.set(...p); scene.add(l); };
mk(0xffffff, 0.60, [2, 5, 3]); mk(0xc6d4f2, 0.52, [0.3, 1.7, 7.5]); mk(0xffdcbe, 0.62, [0.6, 3.9, 5.6]);
mk(0x9adfff, 0.62, [-2.5, 2.5, -3]); mk(0xff9ae0, 0.56, [2.5, 2.5, -3]);
const ramp = new THREE.DataTexture(new Uint8Array([80, 160, 255]), 3, 1, THREE.RedFormat);
ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const load = u => new Promise((res, rej) => loader.load(u, res, undefined, rej));
// CombatScene hangs the model under an inner wrapper and drives the measured
// ground offset on that wrapper. Same two-node shape here, or the foot plant
// this sheet exists to show would be the sheet's own invention.
const inner = new THREE.Group(); scene.add(inner);
let model = null;

window.__warm = (ids) => preloadClips(ids);
window.__phase = (id) => phaseFor(id);

window.__render = async (id, phase, cane) => {
  if (model) { inner.remove(model); model = null; }
  inner.position.set(0, 0, 0);
  const g = await load('/meshy/' + id + '_idle.glb');
  model = g.scene;
  // captureRest BEFORE anything touches transforms — same order as MeshyCast.load
  const targetRest = captureRest(model);
  model.traverse(c => {
    if (c.isSkinnedMesh) c.frustumCulled = false;
    if (c.isMesh && c.material) c.material = new THREE.MeshToonMaterial({ map: c.material.map || null, color: 0xffffff, gradientMap: ramp });
  });
  inner.add(model);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const H = box.getSize(new THREE.Vector3()).y;
  if (cane) {
    let bone = null; model.traverse(o => { if (o.isBone && o.name === 'RightHand') bone = o; });
    if (bone) {
      model.updateMatrixWorld(true);
      const hw = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
      const holder = new THREE.Group();
      const desired = new THREE.Matrix4().makeTranslation(hw.x, hw.y, hw.z);
      new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(desired).decompose(holder.position, holder.quaternion, holder.scale);
      bone.add(holder);
      const reach = Math.max(0.15, hw.y - box.min.y), len = reach - 0.01;
      const wood = new THREE.MeshToonMaterial({ color: 0xe0b070, gradientMap: ramp });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.014, len, 14), wood); shaft.position.y = -len / 2; holder.add(shaft);
      const crook = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.015, 8, 18, Math.PI * 1.2), wood);
      crook.rotation.set(Math.PI / 2, 0, -0.12); crook.position.y = 0.022; holder.add(crook);
      const fer = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.019, 0.028, 10), new THREE.MeshToonMaterial({ color: 0x8e8e96, gradientMap: ramp }));
      fer.position.y = -len + 0.012; holder.add(fer);
      window.__caneTick = () => { const q = new THREE.Quaternion(); bone.getWorldQuaternion(q); holder.quaternion.copy(q).invert(); };
    }
  } else window.__caneTick = null;
  // THE SHIPPING CALL. Same arguments MeshyCast.clipsFor passes.
  const clip = clipsFor(id, id, targetRest).idle;
  if (!clip) return { H, clip: null };
  const off = groundOffset(model, clip, { restore: targetRest });
  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(clip).play();
  mixer.setTime(phase * clip.duration);
  inner.position.y = -off;
  model.updateMatrixWorld(true);
  if (window.__caneTick) window.__caneTick();
  camera.position.set(H * 0.26, H * 0.58, H * 1.58); camera.lookAt(0, H * 0.50, 0);
  renderer.render(scene, camera);
  return { H, clip: clip.name, ground: +off.toFixed(4), gender: genderFor(id, id) };
};
window.__ready = true;
</script></body></html>`;

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/harness.html') { res.setHeader('Content-Type', 'text/html'); return res.end(HARNESS); }
  const roots = { '/node_modules/': join(REPO, 'node_modules'), '/src/': join(REPO, 'src'), '/meshy/': join(REPO, 'public/meshy') };
  for (const [p, root] of Object.entries(roots)) {
    if (url.startsWith(p)) {
      try {
        const f = join(root, url.slice(p.length));
        res.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream');
        return res.end(readFileSync(f));
      } catch { res.statusCode = 404; return res.end('nf'); }
    }
  }
  res.statusCode = 404; res.end('nf');
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({ headless: false, args: [`--window-size=${CELL + 80},${CELL + 160}`] });
const page = await (await browser.newContext({ viewport: { width: CELL, height: CELL } })).newPage();
await page.goto(`http://localhost:${port}/harness.html`);
await page.waitForFunction(() => window.__ready === true, { timeout: 30000 });

await page.evaluate(i => window.__warm(i), ids);
const cells = [];
for (const id of ids) {
  try {
    const ph = await page.evaluate(i => window.__phase(i), id);
    const r = await page.evaluate(([i, p, c]) => window.__render(i, p, c), [id, ph, id === 'grandma']);
    if (!r.clip) { console.log(`[FAIL] ${id}: clipsFor() returned no idle`); continue; }
    cells.push({ id, a: r.clip.replace('a', ''), data: (await page.locator('canvas').screenshot()).toString('base64') });
    console.log(`[cell] ${id.padEnd(24)} ${r.gender} ${r.clip.padEnd(6)} phase ${ph.toFixed(2)}  ground ${String(r.ground).padStart(8)}  h=${r.H.toFixed(2)}`);
  } catch (e) { console.log(`[FAIL] ${id}: ${String(e).slice(0, 140)}`); }
}

const sheet = await page.evaluate(async ({ cells, cols, cell }) => {
  const LBL = 22, rows = Math.ceil(cells.length / cols);
  const c = document.createElement('canvas');
  c.width = cols * cell; c.height = rows * (cell + LBL);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#08080e'; ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < cells.length; i++) {
    const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + LBL);
    const img = new Image(); img.src = 'data:image/png;base64,' + cells[i].data; await img.decode();
    ctx.drawImage(img, x, y + LBL, cell, cell);
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 14px monospace';
    ctx.fillText(`${cells[i].id}  (a${cells[i].a})`, x + 6, y + 16);
  }
  return c.toDataURL('image/png');
}, { cells, cols: COLS, cell: CELL });

writeFileSync(OUT, Buffer.from(sheet.split(',')[1], 'base64'));
console.log(`\ncontact sheet -> ${OUT}  (${cells.length} characters)`);
await browser.close();
server.close();
process.exit(0);
