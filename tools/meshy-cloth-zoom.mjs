// Cloth-zoom parity shooter — the instrument for judging a TEXTURE change on the
// cast, at the two distances that decide whether a texture defect ships.
//
//   fight  : the combat camera's actual framing (whole body, ~1.15 body-heights
//            out) — "does the player ever see this?"
//   zoom   : torso filling the frame — "is the defect real, or did we imagine it?"
//            ISO CAMERA LAW says fight distance is the ruling one, but a defect
//            has to be *visible somewhere* before it is worth spending on, and a
//            texture artifact you cannot find at zoom does not exist.
//
// Renders through the house toon conversion CombatScene applies (3-stop ramp,
// map preserved, PBR dropped) under the approximated combat light rig, so the
// only variable between two runs is the atlas.
//
//   node tools/meshy-cloth-zoom.mjs --ids=firm_partner,compliance \
//        --glbdir=public/meshy --out=screenshots/g-run/misc/streak_before
//
// HEADED chromium (§4.7) — swiftshader misreports both timing and gradients.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const ids = String(args.ids || '').split(',').filter(Boolean);
const abs = (p) => (p.match(/^[A-Za-z]:|^\//) ? p : join(REPO, p));
const GLBDIR = abs(args.glbdir || 'public/meshy');
const OUT = abs(args.out || 'screenshots/g-run/misc/cloth_zoom');
if (!ids.length) { console.error('need --ids'); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.json': 'application/json' };

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#101018}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(900, 900); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x101018);
const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100);
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const dir = new THREE.DirectionalLight(0xffffff, 0.60); dir.position.set(2, 5, 3); scene.add(dir);
const fill = new THREE.DirectionalLight(0xc6d4f2, 0.52); fill.position.set(0.3, 1.7, 7.5); scene.add(fill);
const faceKey = new THREE.DirectionalLight(0xffdcbe, 0.62); faceKey.position.set(0.6, 3.9, 5.6); scene.add(faceKey);
const rimC = new THREE.DirectionalLight(0x9adfff, 0.62); rimC.position.set(-2.5, 2.5, -3); scene.add(rimC);
const rimM = new THREE.DirectionalLight(0xff9ae0, 0.56); rimM.position.set(2.5, 2.5, -3); scene.add(rimM);
const ramp = new THREE.DataTexture(new Uint8Array([80, 160, 255]), 3, 1, THREE.RedFormat);
ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
let model = null, H = 1.7;
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
loader.load(q.get('glb'), (gltf) => {
  model = gltf.scene;
  model.traverse(c => {
    if (c.isSkinnedMesh) c.frustumCulled = false;
    if (c.isMesh && c.material) {
      if (c.material.map) { c.material.map.anisotropy = 8; c.material.map.needsUpdate = true; }
      c.material = new THREE.MeshToonMaterial({ map: c.material.map || null, color: 0xffffff, gradientMap: ramp });
    }
  });
  scene.add(model);
  const box = new THREE.Box3().setFromObject(model);
  H = box.getSize(new THREE.Vector3()).y;
  model.position.y -= box.min.y;
  window.__cam = (mode) => {
    if (mode === 'fight')      { camera.position.set(H * 0.55, H * 0.60, H * 1.15); camera.lookAt(0, H * 0.52, 0); }
    else if (mode === 'zoom')  { camera.position.set(H * 0.10, H * 0.72, H * 0.42); camera.lookAt(0, H * 0.68, 0); }
    else if (mode === 'zoom2') { camera.position.set(-H * 0.16, H * 0.55, H * 0.38); camera.lookAt(0, H * 0.52, 0); }
    renderer.render(scene, camera);
  };
  window.__ready = true;
}, undefined, (e) => { window.__error = String(e); });
</script></body></html>`;

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/harness.html') { res.setHeader('Content-Type', 'text/html'); return res.end(HARNESS); }
  const roots = { '/node_modules/': join(REPO, 'node_modules'), '/meshy/': GLBDIR };
  for (const [prefix, root] of Object.entries(roots)) {
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

const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: 900, height: 900 } })).newPage();

for (const id of ids) {
  if (!existsSync(join(GLBDIR, `${id}_idle.glb`))) { console.log(`[skip] ${id} — no GLB in ${GLBDIR}`); continue; }
  await page.goto(`http://localhost:${port}/harness.html?glb=/meshy/${id}_idle.glb`);
  try { await page.waitForFunction(() => window.__ready === true || window.__error, { timeout: 30000 }); }
  catch { console.log(`[fail] ${id} load timeout`); continue; }
  const err = await page.evaluate(() => window.__error || null);
  if (err) { console.log(`[fail] ${id} ${err.slice(0, 160)}`); continue; }
  for (const mode of ['fight', 'zoom', 'zoom2']) {
    await page.evaluate((m) => window.__cam(m), mode);
    writeFileSync(join(OUT, `${id}_${mode}.png`), await page.locator('canvas').screenshot());
  }
  console.log(`[shot] ${id}`);
}
await browser.close();
server.close();
console.log('->', OUT);
