// THROWAWAY DIAGNOSTIC — whole-cast floor contact + side-view spine sheet.
//
// For all 33 runtime GLBs: lowest SKINNED vertex Y (CPU skinning) at BIND, at
// the character's OWN wave-1 baked idle, and under the SHARED a336 stance, plus
// one true-side-view tile per pose so the whole cast can be read in one sheet.
//
// The floor plane is y = 0 because that is literally where CombatScene puts
// every combatant: group.position.set(x, 0, z) with no vertical offset anywhere
// in the Meshy path (CombatScene._buildMeshyCombatant).
//
//   node tools/_diag-floor-cast.mjs [--ids=...] [--out=<dir>]
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const OUT = join(REPO, args.out || 'art/char_refs/meshy_pilot/_diag_spine');
mkdirSync(OUT, { recursive: true });
const GLBDIR = join(REPO, 'public/meshy');
const ids = args.ids ? String(args.ids).split(',').filter(Boolean)
  : readdirSync(GLBDIR).filter(f => f.endsWith('_idle.glb')).map(f => f.replace('_idle.glb', '')).sort();

const AFFECTED = new Set(['alex_it', 'cfos_assistant', 'chad', 'chief_of_restructuring', 'client_m_athletic',
  'client_m_heavy', 'compliance', 'corporate_lawyer', 'data_analytics_lead', 'diane', 'firm_paralegal',
  'intern', 'isaiah', 'networking_guy', 'regional', 'regional_director', 'restructuring_analyst', 'skip_boss']);

const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.json': 'application/json', '.wasm': 'application/wasm' };
const TILE = 300;

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
const d1 = new THREE.DirectionalLight(0xffffff, 0.8); d1.position.set(3, 4, 2); scene.add(d1);
const d2 = new THREE.DirectionalLight(0xc6d4f2, 0.5); d2.position.set(-3, 2, 4); scene.add(d2);
const ramp = (() => { const t = new THREE.DataTexture(new Uint8Array([80,160,255]),3,1,THREE.RedFormat); t.minFilter=t.magFilter=THREE.NearestFilter; t.needsUpdate=true; return t; })();
const grid = new THREE.GridHelper(3, 12, 0xff4444, 0x2a3a4a); scene.add(grid);
const line = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.005), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
line.rotation.x = -Math.PI/2; line.position.y = 0.0005; scene.add(line);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
let model=null, mixer=null, H=1.7, skinned=[], gltf=null; const clipCache={};
window.__load = (url) => new Promise((res, rej) => {
  if (model) { scene.remove(model); model=null; } mixer=null; skinned=[];
  loader.load(url, g => {
    gltf = g; model = g.scene;
    model.traverse(c => { if (c.isSkinnedMesh) { c.frustumCulled=false; skinned.push(c); }
      if (c.isMesh && c.material) c.material = new THREE.MeshToonMaterial({ map: c.material.map||null, color: 0xffffff, gradientMap: ramp }); });
    scene.add(model); model.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(model);
    H = b.getSize(new THREE.Vector3()).y || 1.7;
    res({ H, minY: b.min.y, maxY: b.max.y });
  }, undefined, e => rej(String(e)));
});
window.__pose = async (mode, t) => {
  if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model); mixer = null; }
  model.updateMatrixWorld(true);
  if (mode === 'bind') return;
  let clip = null;
  if (mode === 'wave1') { const a = gltf.animations||[]; clip = a.find(x=>/idle/i.test(x.name)&&x.tracks.length>4) || a.find(x=>x.tracks.length>4) || a[0] || null; }
  else { if (!clipCache[mode]) clipCache[mode] = await new Promise((r,j)=>loader.load('/clips/'+mode+'.glb', g=>r(g.animations[0]), undefined, e=>j(String(e)))); clip = clipCache[mode]; }
  if (!clip) return;
  mixer = new THREE.AnimationMixer(model); mixer.clipAction(clip).play(); mixer.setTime(t||0);
  model.updateMatrixWorld(true);
};
window.__floor = () => {
  let min = Infinity; const v = new THREE.Vector3();
  for (const m of skinned) { m.updateMatrixWorld(true);
    const p = m.geometry.attributes.position, step = Math.max(1, Math.floor(p.count/24000));
    for (let i=0;i<p.count;i+=step){ v.fromBufferAttribute(p,i); m.applyBoneTransform(i,v); m.localToWorld(v); if (v.y<min) min=v.y; } }
  return min;
};
// Bone world Y (for head-height normalisation)
window.__boneY = (name) => { let y=null; model.traverse(o=>{ if(o.isBone&&o.name===name){o.updateMatrixWorld(true); y=o.getWorldPosition(new THREE.Vector3()).y;} }); return y; };
window.__shot = () => { const d=H*1.85; camera.position.set(d, H*0.52, 0); camera.lookAt(0,H*0.52,0); renderer.render(scene,camera); };
window.__ready = true;
</script></body></html>`;

const ROOTS = { '/node_modules/': join(REPO, 'node_modules'), '/meshy/': GLBDIR, '/clips/': join(GLBDIR, 'clips') };
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

const POSES = [{ k: 'bind', t: 0 }, { k: 'wave1', t: 2 }, { k: 'a336', t: 2 }, { k: 'a138', t: 1.6 }, { k: 'a391', t: 1.8 }];
const rows = [];
const data = [];
for (const id of ids) {
  let info;
  try { info = await page.evaluate(u => window.__load(u), `/meshy/${id}_idle.glb`); }
  catch (e) { console.log(`FAIL ${id}: ${e}`); continue; }
  const rec = { id, flagged: AFFECTED.has(id), bindHeight_m: +info.H.toFixed(4), bindMinY_m: +info.minY.toFixed(4) };
  const tiles = [];
  for (const p of POSES) {
    await page.evaluate(([m, t]) => window.__pose(m, t), [p.k, p.t]);
    rec['floorY_' + p.k] = +(await page.evaluate(() => window.__floor())).toFixed(4);
    if (p.k === 'bind') rec.neckY_m = +(await page.evaluate(() => window.__boneY('neck'))).toFixed(4);
    if (p.k === 'bind' || p.k === 'a336') {
      await page.evaluate(() => window.__shot());
      tiles.push((await page.locator('canvas').screenshot()).toString('base64'));
    }
  }
  // head height: crown (bind AABB top) to the neck bone — the conventional
  // "head" unit for reading a hover at a glance.
  rec.headHeight_m = +(info.maxY - rec.neckY_m).toFixed(4);
  for (const p of POSES) rec['hoverHeads_' + p.k] = +((rec['floorY_' + p.k]) / rec.headHeight_m).toFixed(2);
  data.push(rec);
  rows.push({ id, flagged: rec.flagged, tiles, hover: rec.floorY_a336, heads: rec.hoverHeads_a336 });
  console.log(`${rec.flagged ? '*' : ' '} ${id.padEnd(24)} bind=${rec.floorY_bind.toFixed(4)} wave1=${rec.floorY_wave1.toFixed(4)} a336=${rec.floorY_a336.toFixed(4)} a138=${rec.floorY_a138.toFixed(4)} a391=${rec.floorY_a391.toFixed(4)}  (${rec.hoverHeads_a336} heads on a336)`);
}

// cast sheet: 2 columns (BIND | SHARED a336), side view, N rows
const COLS = 6; // characters per band
for (let band = 0; band < Math.ceil(rows.length / COLS); band++) {
  const slice = rows.slice(band * COLS, band * COLS + COLS);
  const png = await page.evaluate(async ([slice, TILE, band]) => {
    const HDR = 30, ROWL = 22;
    const c = document.createElement('canvas');
    c.width = slice.length * TILE; c.height = HDR + 2 * (TILE + ROWL);
    const x = c.getContext('2d');
    x.fillStyle = '#0b0b12'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#fff'; x.font = 'bold 16px monospace';
    x.fillText(`CAST SIDE VIEW  band ${band + 1}   top = BIND POSE (no anim)   bottom = SHARED a336 STANCE   red line = arena floor y=0`, 10, 20);
    for (let i = 0; i < slice.length; i++) {
      for (let r = 0; r < 2; r++) {
        const y = HDR + r * (TILE + ROWL);
        x.fillStyle = slice[i].flagged ? '#ff8888' : '#88ddaa';
        x.font = 'bold 13px monospace';
        const lbl = r === 0 ? `${slice[i].flagged ? '*' : ' '}${slice[i].id}` : `hover ${slice[i].hover.toFixed(3)}m / ${slice[i].heads} heads`;
        x.fillText(lbl.slice(0, 30), i * TILE + 6, y + 15);
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + slice[i].tiles[r]; });
        x.drawImage(img, i * TILE, y + ROWL, TILE, TILE);
      }
    }
    return c.toDataURL('image/png');
  }, [slice, TILE, band]);
  const dest = join(OUT, `cast_side_band${band + 1}.png`);
  writeFileSync(dest, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`[cast sheet] ${dest}`);
}

writeFileSync(join(OUT, 'floor_cast.json'), JSON.stringify(data, null, 2));
await browser.close();
server.close();
console.log('\n-> ' + join(OUT, 'floor_cast.json'));
