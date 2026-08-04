// Retarget verification + motion audit on the REAL cast.
//
// Loads a character GLB from public/meshy/ and a shared clip GLB from
// public/meshy/clips/, binds the clip's tracks to the character's skeleton
// (identical 24-bone rig across the whole cast — see meshy-clip-fetch.mjs) and
// renders an N-frame strip spanning the clip's full duration, through the same
// house toon ramp CombatScene applies.
//
// This is the gate the producer asked for: the same clip on at least three
// different body types (male suit / female skirt / grandma) before anything
// rolls out cast-wide.
//
//   node tools/meshy-clip-strip.mjs --chars=regional,meredith_boss,grandma --clips=336,338,415
//   node tools/meshy-clip-strip.mjs --chars=andrew --clips=178 --frames=8 --tag=hurt
//
// Sheets -> art/char_refs/meshy_pilot/_clips/strip_<tag>_<clip>.png
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const CHARS = String(args.chars || 'regional,meredith_boss,grandma').split(',').filter(Boolean);
const CLIPS = String(args.clips || '').split(',').filter(Boolean);
const FRAMES = Number(args.frames || 7);
const TAG = args.tag || 'clip';
const OUTDIR = join(REPO, 'art/char_refs/meshy_pilot/_clips');
if (!CLIPS.length) { console.error('need --clips'); process.exit(1); }
mkdirSync(OUTDIR, { recursive: true });

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary' };

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#101018}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(360, 360); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x101018);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
// CombatScene light rig at base intensities
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const mk = (c, i, p) => { const l = new THREE.DirectionalLight(c, i); l.position.set(...p); scene.add(l); };
mk(0xffffff, 0.60, [2, 5, 3]); mk(0xc6d4f2, 0.52, [0.3, 1.7, 7.5]); mk(0xffdcbe, 0.62, [0.6, 3.9, 5.6]);
mk(0x9adfff, 0.62, [-2.5, 2.5, -3]); mk(0xff9ae0, 0.56, [2.5, 2.5, -3]);
const ramp = new THREE.DataTexture(new Uint8Array([80, 160, 255]), 3, 1, THREE.RedFormat);
ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const load = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));
const clipCache = {};
let model = null, mixer = null, H = 1.7, action = null;

window.__setup = async (charUrl, clipUrl) => {
  if (model) { scene.remove(model); model = null; }
  const g = await load(charUrl);
  model = g.scene;
  model.traverse(c => {
    if (c.isSkinnedMesh) c.frustumCulled = false;
    if (c.isMesh && c.material) c.material = new THREE.MeshToonMaterial({ map: c.material.map || null, color: 0xffffff, gradientMap: ramp });
  });
  scene.add(model);
  const box = new THREE.Box3().setFromObject(model);
  H = box.getSize(new THREE.Vector3()).y;
  model.position.y -= box.min.y;
  if (!clipCache[clipUrl]) {
    const cg = await load(clipUrl);
    clipCache[clipUrl] = cg.animations[0];
  }
  const clip = clipCache[clipUrl];
  mixer = new THREE.AnimationMixer(model);
  // The whole point: a clip authored on the DONOR rig, bound straight onto this
  // character. If the bone names or the rig convention differed, this throws or
  // the character explodes — either way the strip shows it.
  action = mixer.clipAction(clip);
  action.play();
  mixer.setTime(0);
  return { duration: clip.duration, tracks: clip.tracks.length, height: H };
};
window.__frame = (t) => {
  mixer.setTime(t);
  camera.position.set(H * 0.30, H * 0.62, H * 1.55); camera.lookAt(0, H * 0.50, 0);
  renderer.render(scene, camera);
};
window.__ready = true;
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

const browser = await chromium.launch({ headless: false, args: ['--window-size=520,520'] });
const page = await (await browser.newContext({ viewport: { width: 400, height: 400 } })).newPage();
await page.goto(`http://localhost:${port}/harness.html`);
await page.waitForFunction(() => window.__ready === true, { timeout: 30000 });

for (const clipId of CLIPS) {
  const clipUrl = `/meshy/clips/a${clipId}.glb`;
  if (!existsSync(join(REPO, 'public/meshy/clips', `a${clipId}.glb`))) { console.log(`[skip] no clip a${clipId}`); continue; }
  const rows = [];
  for (const ch of CHARS) {
    let meta;
    try {
      meta = await page.evaluate(([c, k]) => window.__setup(c, k), [`/meshy/${ch}_idle.glb`, clipUrl]);
    } catch (e) { console.log(`[FAIL] ${ch} + a${clipId}: ${String(e).slice(0, 200)}`); continue; }
    const shots = [];
    for (let i = 0; i < FRAMES; i++) {
      const t = meta.duration * (i / (FRAMES - 1)) * 0.999;
      await page.evaluate(tt => window.__frame(tt), t);
      shots.push((await page.locator('canvas').screenshot()).toString('base64'));
    }
    rows.push({ ch, shots, meta });
    console.log(`[strip] ${ch} + a${clipId}  dur=${meta.duration.toFixed(2)}s tracks=${meta.tracks} h=${meta.height.toFixed(2)}`);
  }
  if (!rows.length) continue;
  const sheet = await page.evaluate(async ({ rows, frames, tag, clipId }) => {
    const CELL = 360, LBL = 24;
    const c = document.createElement('canvas');
    c.width = CELL * frames; c.height = (CELL + LBL) * rows.length;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0b0b12'; ctx.fillRect(0, 0, c.width, c.height);
    for (let r = 0; r < rows.length; r++) {
      for (let i = 0; i < rows[r].shots.length; i++) {
        const img = new Image(); img.src = 'data:image/png;base64,' + rows[r].shots[i]; await img.decode();
        ctx.drawImage(img, i * CELL, r * (CELL + LBL) + LBL, CELL, CELL);
      }
      ctx.fillStyle = '#ffd479'; ctx.font = 'bold 17px monospace';
      ctx.fillText(`${rows[r].ch}   clip a${clipId} (${tag})   dur ${rows[r].meta.duration.toFixed(2)}s   ${rows[r].meta.tracks} tracks`, 8, r * (CELL + LBL) + 17);
    }
    return c.toDataURL('image/png');
  }, { rows, frames: FRAMES, tag: TAG, clipId });
  const file = join(OUTDIR, `strip_${TAG}_a${clipId}.png`);
  writeFileSync(file, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log(`sheet -> ${file}`);
}

await browser.close();
server.close();
process.exit(0);
