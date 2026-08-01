// THROWAWAY DIAGNOSTIC — visual proof that a proper retarget fixes the S-spine.
//
// Renders, side by side, the SAME shared clip applied two ways:
//   NAIVE     — what ships today: the donor's local rotation tracks are bound by
//               bone name and overwrite the target's local rotations outright.
//   RETARGET  — target_local = target_rest * inverse(donor_rest) * donor_local,
//               per bone, per keyframe; Hips translation rebased onto the
//               target's own rest hips and scaled by the hip-height ratio.
//
// The donor rest pose is read out of the clip GLB's own armature (the stripped
// clip keeps the donor node hierarchy), so nothing is assumed.
//
//   node tools/_diag-retarget-shoot.mjs --ids=a,b,c [--clip=a336]
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const ids = String(args.ids || '').split(',').filter(Boolean);
const CLIP = args.clip || 'a336';
const OUT = join(REPO, 'art/char_refs/meshy_pilot/_diag_spine');
mkdirSync(OUT, { recursive: true });
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm' };
const TILE = 330;

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#12121a}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(${TILE}, ${TILE}); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x12121a);
const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 100);
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const d1 = new THREE.DirectionalLight(0xffffff, 0.8); d1.position.set(3,4,2); scene.add(d1);
const d2 = new THREE.DirectionalLight(0xc6d4f2, 0.5); d2.position.set(-3,2,4); scene.add(d2);
const ramp = (()=>{const t=new THREE.DataTexture(new Uint8Array([80,160,255]),3,1,THREE.RedFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})();
scene.add(new THREE.GridHelper(3,12,0xff4444,0x2a3a4a));
const line = new THREE.Mesh(new THREE.PlaneGeometry(3,0.005), new THREE.MeshBasicMaterial({color:0xff2222}));
line.rotation.x=-Math.PI/2; line.position.y=0.0005; scene.add(line);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
let model=null, mixer=null, H=1.7, skinned=[], bones=new Map();
let donorClip=null, donorRest=new Map();

window.__initClip = (name) => new Promise((res, rej) => {
  loader.load('/clips/'+name+'.glb', g => {
    donorClip = g.animations[0];
    // The stripped clip keeps the DONOR armature — read its rest pose straight off.
    g.scene.traverse(o => { donorRest.set(o.name, { q: o.quaternion.clone(), p: o.position.clone() }); });
    res({ tracks: donorClip.tracks.length, dur: donorClip.duration, restBones: donorRest.size });
  }, undefined, e => rej(String(e)));
});

window.__load = (url) => new Promise((res, rej) => {
  if (model) { scene.remove(model); model=null; }
  mixer=null; skinned=[]; bones=new Map();
  loader.load(url, g => {
    model = g.scene;
    model.traverse(c => {
      if (c.isSkinnedMesh) { c.frustumCulled=false; skinned.push(c); }
      if (c.isBone || c.isObject3D) bones.set(c.name, { q: c.quaternion.clone(), p: c.position.clone(), node: c });
      if (c.isMesh && c.material) c.material = new THREE.MeshToonMaterial({ map: c.material.map||null, color: 0xffffff, gradientMap: ramp });
    });
    scene.add(model); model.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(model);
    H = b.getSize(new THREE.Vector3()).y || 1.7;
    res({ H });
  }, undefined, e => rej(String(e)));
});

// Build a per-character retargeted copy of the donor clip.
function retargeted() {
  const tracks = [];
  const qd = new THREE.Quaternion(), qi = new THREE.Quaternion(), qa = new THREE.Quaternion(), qo = new THREE.Quaternion();
  for (const tr of donorClip.tracks) {
    const bone = tr.name.split('.')[0];
    const prop = tr.name.split('.')[1];
    const rest = bones.get(bone), dr = donorRest.get(bone);
    if (!rest || !dr) continue;
    if (prop === 'quaternion') {
      const v = Float32Array.from(tr.values);
      for (let i = 0; i < v.length; i += 4) {
        qa.set(v[i], v[i+1], v[i+2], v[i+3]);
        qi.copy(dr.q).invert();
        qo.copy(rest.q).multiply(qi).multiply(qa);
        v[i]=qo.x; v[i+1]=qo.y; v[i+2]=qo.z; v[i+3]=qo.w;
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(tr.name, Array.from(tr.times), Array.from(v)));
    } else if (prop === 'position' && bone === 'Hips') {
      // Rebase onto the TARGET's own rest hips, and scale the donor's delta by
      // the hip-height ratio so a 1.50m grandma does not get a 1.75m hip bob.
      const k = dr.p.y !== 0 ? rest.p.y / dr.p.y : 1;
      const v = Float32Array.from(tr.values);
      for (let i = 0; i < v.length; i += 3) {
        v[i]   = rest.p.x + (v[i]   - dr.p.x) * k;
        v[i+1] = rest.p.y + (v[i+1] - dr.p.y) * k;
        v[i+2] = rest.p.z + (v[i+2] - dr.p.z) * k;
      }
      tracks.push(new THREE.VectorKeyframeTrack(tr.name, Array.from(tr.times), Array.from(v)));
    }
  }
  return new THREE.AnimationClip('retarget', donorClip.duration, tracks);
}

window.__pose = (mode, t) => {
  if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model); mixer = null; }
  // reset to rest
  for (const [n, r] of bones) { r.node.quaternion.copy(r.q); r.node.position.copy(r.p); }
  model.updateMatrixWorld(true);
  if (mode === 'rest') return;
  const clip = mode === 'naive' ? donorClip : retargeted();
  mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(clip).play();
  mixer.setTime(t);
  model.updateMatrixWorld(true);
};

window.__floor = () => {
  let min = Infinity; const v = new THREE.Vector3();
  for (const m of skinned) { m.updateMatrixWorld(true);
    const p = m.geometry.attributes.position, step = Math.max(1, Math.floor(p.count/24000));
    for (let i=0;i<p.count;i+=step){ v.fromBufferAttribute(p,i); m.applyBoneTransform(i,v); m.localToWorld(v); if (v.y<min) min=v.y; } }
  return min;
};
window.__shot = (side) => {
  const d = H*1.85, cy = H*0.52;
  if (side === 'side') camera.position.set(d, cy, 0); else camera.position.set(0, cy, d);
  camera.lookAt(0, cy, 0); renderer.render(scene, camera);
};
window.__ready = true;
</script></body></html>`;

const ROOTS = { '/node_modules/': join(REPO, 'node_modules'), '/meshy/': join(REPO, 'public/meshy'), '/clips/': join(REPO, 'public/meshy/clips') };
const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/harness.html') { res.setHeader('Content-Type', 'text/html'); return res.end(HARNESS); }
  for (const [p, root] of Object.entries(ROOTS)) if (url.startsWith(p)) {
    try { const f = join(root, url.slice(p.length)); res.setHeader('Content-Type', MIME[extname(f)] || 'application/octet-stream'); return res.end(readFileSync(f)); }
    catch { res.statusCode = 404; return res.end('nf'); }
  }
  res.statusCode = 404; res.end('nf');
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: TILE + 40, height: TILE + 40 } })).newPage();
await page.goto(`http://localhost:${port}/harness.html`);
await page.waitForFunction(() => window.__ready === true, { timeout: 60000 });
console.log('clip:', JSON.stringify(await page.evaluate(n => window.__initClip(n), CLIP)));

const rows = [];
for (const id of ids) {
  await page.evaluate(u => window.__load(u), `/meshy/${id}_idle.glb`);
  const cells = [];
  for (const mode of ['naive', 'retarget']) {
    await page.evaluate(([m, t]) => window.__pose(m, t), [mode, 2.0]);
    const f = await page.evaluate(() => window.__floor());
    for (const s of ['side', 'front']) {
      await page.evaluate(v => window.__shot(v), s);
      cells.push({ mode, side: s, floor: f, png: (await page.locator('canvas').screenshot()).toString('base64') });
    }
  }
  rows.push({ id, cells });
  console.log(`${id}  naive footY=${cells[0].floor.toFixed(4)}  retarget footY=${cells[2].floor.toFixed(4)}`);
}

const png = await page.evaluate(async ([rows, TILE, CLIP]) => {
  const HDR = 46, LBL = 150;
  const c = document.createElement('canvas');
  c.width = LBL + 4 * TILE; c.height = HDR + rows.length * TILE;
  const x = c.getContext('2d');
  x.fillStyle = '#0b0b12'; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#fff'; x.font = 'bold 18px monospace';
  x.fillText(`RETARGET PROOF — shared clip ${CLIP} @ t=2.0s   (red line = arena floor y=0)`, 10, 22);
  x.font = 'bold 14px monospace';
  ['NAIVE  side', 'NAIVE  front', 'RETARGET  side', 'RETARGET  front'].forEach((s, i) => {
    x.fillStyle = i < 2 ? '#ff7777' : '#77ee99'; x.fillText(s, LBL + i * TILE + 8, 40);
  });
  for (let r = 0; r < rows.length; r++) {
    const y = HDR + r * TILE;
    x.fillStyle = '#e8e8f0'; x.font = 'bold 14px monospace';
    x.fillText(rows[r].id, 8, y + 24);
    x.font = '12px monospace'; x.fillStyle = '#ff9999';
    x.fillText('naive hover', 8, y + 48);
    x.fillText(rows[r].cells[0].floor.toFixed(4) + 'm', 8, y + 64);
    x.fillStyle = '#99eebb';
    x.fillText('retarget hover', 8, y + 88);
    x.fillText(rows[r].cells[2].floor.toFixed(4) + 'm', 8, y + 104);
    for (let i = 0; i < 4; i++) {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + rows[r].cells[i].png; });
      x.drawImage(img, LBL + i * TILE, y, TILE, TILE);
    }
    x.strokeStyle = '#3a3a55'; x.beginPath(); x.moveTo(0, y); x.lineTo(c.width, y); x.stroke();
  }
  return c.toDataURL('image/png');
}, [rows, TILE, CLIP]);
const dest = join(OUT, `retarget_proof_${CLIP}.png`);
writeFileSync(dest, Buffer.from(png.split(',')[1], 'base64'));
console.log('[proof] ' + dest);
await browser.close();
server.close();
