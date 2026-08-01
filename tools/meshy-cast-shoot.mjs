// Meshy cast still-shooter: renders each runtime GLB (public/meshy/<id>_idle.glb)
// through the same toon conversion CombatScene applies (house 3-stop ramp, no
// PBR) under an approximated combat light rig, and captures bind-pose +
// idle-frame stills for the bind inspection + contact sheet.
//
//   node tools/meshy-cast-shoot.mjs --ids=a,b,c [--outroot=art/char_refs/meshy_pilot]
//
// Shots per id -> <outroot>/<id>/shots/: bind_front, bind_combat, idle1_combat,
// idle2_combat, idle1_front. Client ids live under clients/<id>/.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const ids = String(args.ids || '').split(',').filter(Boolean);
const OUTROOT = join(REPO, args.outroot || 'art/char_refs/meshy_pilot');
if (!ids.length) { console.error('need --ids'); process.exit(1); }

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.json': 'application/json' };

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#101018}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(800, 800); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x101018);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
// approximated CombatScene rig (ambient/dir/fill/faceKey/rims at base intensities)
scene.add(new THREE.AmbientLight(0xffffff, 0.30));
const dir = new THREE.DirectionalLight(0xffffff, 0.60); dir.position.set(2, 5, 3); scene.add(dir);
const fill = new THREE.DirectionalLight(0xc6d4f2, 0.52); fill.position.set(0.3, 1.7, 7.5); scene.add(fill);
const faceKey = new THREE.DirectionalLight(0xffdcbe, 0.62); faceKey.position.set(0.6, 3.9, 5.6); scene.add(faceKey);
const rimC = new THREE.DirectionalLight(0x9adfff, 0.62); rimC.position.set(-2.5, 2.5, -3); scene.add(rimC);
const rimM = new THREE.DirectionalLight(0xff9ae0, 0.56); rimM.position.set(2.5, 2.5, -3); scene.add(rimM);
// house 3-stop toon ramp (MaterialLibrary.getHouseGradientMap equivalent)
const data = new Uint8Array([80, 160, 255]);
const ramp = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
let mixer = null, model = null, H = 1.7;
new GLTFLoader().load(q.get('glb'), (gltf) => {
  model = gltf.scene;
  model.traverse(c => {
    if (c.isSkinnedMesh) c.frustumCulled = false;
    if (c.isMesh && c.material) {
      c.material = new THREE.MeshToonMaterial({ map: c.material.map || null, color: 0xffffff, gradientMap: ramp });
    }
  });
  scene.add(model);
  const box = new THREE.Box3().setFromObject(model);
  H = box.getSize(new THREE.Vector3()).y;
  model.position.y -= box.min.y; // feet on y=0
  window.__anims = gltf.animations?.map(a => a.name) || [];
  window.__mixerStart = () => {
    if (gltf.animations?.length) {
      mixer = new THREE.AnimationMixer(model);
      mixer.clipAction(gltf.animations[0]).play();
      mixer.timeScale = 1;
    }
  };
  window.__advance = (dt) => { if (mixer) mixer.update(dt); };
  window.__cam = (mode) => {
    if (mode === 'front') { camera.position.set(0, H * 0.55, H * 2.4); camera.lookAt(0, H * 0.5, 0); }
    else { camera.position.set(H * 0.85, H * 0.62, H * 1.85); camera.lookAt(0, H * 0.52, 0); }
    renderer.render(scene, camera);
  };
  window.__height = H;
  window.__ready = true;
}, undefined, (e) => { window.__error = String(e); });
</script></body></html>`;

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/harness.html') { res.setHeader('Content-Type', 'text/html'); return res.end(HARNESS); }
  const roots = { '/node_modules/': join(REPO, 'node_modules'), '/meshy/': join(REPO, 'public/meshy') };
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

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 800, height: 800 } })).newPage();

const shoot = async (dest) => {
  const buf = await page.locator('canvas').screenshot();
  mkdirSync(join(dest, '..'), { recursive: true });
  writeFileSync(dest, buf);
};

const summary = [];
for (const id of ids) {
  const isClient = id.startsWith('client_');
  const glb = `/meshy/${id}_idle.glb`;
  if (!existsSync(join(REPO, 'public/meshy', `${id}_idle.glb`))) { summary.push({ id, error: 'no GLB' }); continue; }
  const shotsDir = join(OUTROOT, isClient ? `clients/${id}` : id, 'shots');
  mkdirSync(shotsDir, { recursive: true });
  await page.goto(`http://localhost:${port}/harness.html?glb=${glb}`);
  try {
    await page.waitForFunction(() => window.__ready === true || window.__error, { timeout: 30000 });
  } catch { summary.push({ id, error: 'load timeout' }); continue; }
  const err = await page.evaluate(() => window.__error || null);
  if (err) { summary.push({ id, error: err.slice(0, 200) }); continue; }
  const h = await page.evaluate(() => window.__height);
  const anims = await page.evaluate(() => window.__anims);
  // bind pose (no mixer)
  await page.evaluate(() => window.__cam('front')); await shoot(join(shotsDir, 'bind_front.png'));
  await page.evaluate(() => window.__cam('combat')); await shoot(join(shotsDir, 'bind_combat.png'));
  // idle frames
  await page.evaluate(() => { window.__mixerStart(); window.__advance(1.2); window.__cam('combat'); });
  await shoot(join(shotsDir, 'idle1_combat.png'));
  await page.evaluate(() => { window.__advance(1.2); window.__cam('combat'); });
  await shoot(join(shotsDir, 'idle2_combat.png'));
  await page.evaluate(() => { window.__advance(0.6); window.__cam('front'); });
  await shoot(join(shotsDir, 'idle1_front.png'));
  summary.push({ id, aabbY: Math.round(h * 1000) / 1000, anims });
  console.log(`[shot] ${id} aabbY=${h.toFixed(3)} anims=${JSON.stringify(anims)}`);
}

await browser.close();
server.close();
console.log(JSON.stringify(summary, null, 2));
