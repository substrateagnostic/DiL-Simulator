// THROWAWAY: skeleton-space measurement of the gendered-motion axes.
// Pixel silhouettes are confounded by dark costume against a dark stage, so this
// reads BONE world positions instead — exact, lighting-independent, comparable
// across bodies once normalised by the character's own standing height.
//
//   node tools/_gender-metrics.mjs --chars=chad,karen --clips=a336:M,andrew_a247:F,... --samples=24
//
// Reports, averaged over the clip and normalised to body height:
//   footSpread  |LeftFoot.x - RightFoot.x|      (stance width)
//   handOut     mean |Hand.x - Hips.x|          (arms held out from the torso)
//   hipsY       Hips world Y                    (pelvic carriage / stand height)
//   elbowOut    mean |ForeArm.x - Hips.x|
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const OUTDIR = join(REPO, 'art/char_refs/meshy_pilot/_clips/gender');
const GCLIPS = join(OUTDIR, 'clips');
const SHIPCLIPS = join(REPO, 'public/meshy/clips');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const CHARS = String(args.chars || 'chad,karen').split(',').filter(Boolean);
const CLIPS = String(args.clips || '').split(',').filter(Boolean).map(s => { const [id, g] = s.split(':'); return { id, g: g || '?' }; });
const SAMPLES = Number(args.samples || 24);
if (!CLIPS.length) { console.error('need --clips'); process.exit(1); }

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.json': 'application/json' };

const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { captureRest, retargetClip } from '/retarget/MeshyRetarget.js';
const scene = new THREE.Scene();
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const load = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));
const clipCache = {}; const charCache = {};
window.__measure = async (charUrl, clipUrl, samples) => {
  if (!charCache[charUrl]) charCache[charUrl] = await load(charUrl);
  // fresh scene graph each run so a previous mixer cannot leak pose state
  const g = charCache[charUrl];
  const root = g.scene;
  scene.add(root);
  root.position.set(0,0,0); root.scale.setScalar(1); root.rotation.set(0,0,0);
  const targetRest = captureRest(root);
  if (!clipCache[clipUrl]) {
    const cg = await load(clipUrl);
    clipCache[clipUrl] = { clip: cg.animations[0], donorRest: captureRest(cg.scene) };
  }
  const { clip, donorRest } = clipCache[clipUrl];
  let bound = clip; try { bound = retargetClip(clip, donorRest, targetRest); } catch (e) {}
  const mixer = new THREE.AnimationMixer(root);
  mixer.clipAction(bound).play();
  const find = (re) => { let hit = null; root.traverse(o => { if (!hit && re.test(o.name)) hit = o; }); return hit; };
  const B = {
    hips: find(/^Hips$/i), lf: find(/^LeftFoot$/i), rf: find(/^RightFoot$/i),
    lh: find(/^LeftHand$/i), rh: find(/^RightHand$/i),
    lfa: find(/^LeftForeArm$/i), rfa: find(/^RightForeArm$/i), head: find(/^Head$/i),
  };
  if (!B.hips || !B.lf || !B.rf) return { error: 'missing bones: ' + Object.entries(B).filter(([k,v])=>!v).map(([k])=>k).join(',') };
  const v = new THREE.Vector3();
  const wp = (o) => { o.getWorldPosition(v); return v.clone(); };
  const acc = { foot: [], hand: [], elbow: [], hipsY: [], headY: [] };
  for (let i = 0; i < samples; i++) {
    mixer.setTime(bound.duration * (0.12 + 0.76 * (i / (samples - 1))));
    root.updateMatrixWorld(true);
    const hips = wp(B.hips), lf = wp(B.lf), rf = wp(B.rf);
    acc.foot.push(Math.abs(lf.x - rf.x));
    acc.hipsY.push(hips.y);
    if (B.head) acc.headY.push(wp(B.head).y);
    if (B.lh && B.rh) acc.hand.push((Math.abs(wp(B.lh).x - hips.x) + Math.abs(wp(B.rh).x - hips.x)) / 2);
    if (B.lfa && B.rfa) acc.elbow.push((Math.abs(wp(B.lfa).x - hips.x) + Math.abs(wp(B.rfa).x - hips.x)) / 2);
  }
  const bbox = new THREE.Box3().setFromObject(root);
  const H = bbox.getSize(new THREE.Vector3()).y;
  scene.remove(root);
  mixer.stopAllAction();
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  return {
    H,
    footSpread: mean(acc.foot) / H,
    handOut: mean(acc.hand) / H,
    elbowOut: mean(acc.elbow) / H,
    hipsY: mean(acc.hipsY) / H,
    headY: mean(acc.headY) / H,
    duration: bound.duration,
  };
};
window.__ready = true;
</script></body></html>`;

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/harness.html') { res.setHeader('Content-Type', 'text/html'); return res.end(PAGE); }
  const roots = {
    '/node_modules/': join(REPO, 'node_modules'),
    '/meshy/': join(REPO, 'public/meshy'),
    '/gclips/': GCLIPS,
    '/retarget/': join(OUTDIR, '_retarget_snapshot'),
  };
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

const browser = await chromium.launch({ headless: false, args: ['--window-size=520,400'] });
const page = await (await browser.newContext({ viewport: { width: 400, height: 300 } })).newPage();
await page.goto(`http://localhost:${port}/harness.html`);
await page.waitForFunction(() => window.__ready === true, { timeout: 60000 });

const clipUrlFor = (stem) => existsSync(join(GCLIPS, `${stem}.glb`)) ? `/gclips/${stem}.glb`
  : existsSync(join(SHIPCLIPS, `${stem}.glb`)) ? `/meshy/clips/${stem}.glb` : null;

const out = [];
console.log('char\tclip\tperf\tfootSpread\thandOut\telbowOut\thipsY');
for (const ch of CHARS) {
  for (const { id, g } of CLIPS) {
    const cu = clipUrlFor(id);
    if (!cu) { console.log(`[skip] ${id}`); continue; }
    const m = await page.evaluate(([c, k, s]) => window.__measure(c, k, s), [`/meshy/${ch}_idle.glb`, cu, SAMPLES]);
    if (m.error) { console.log(`[FAIL] ${ch}+${id}: ${m.error}`); continue; }
    out.push({ ch, clip: id, perf: g, ...m });
    console.log(`${ch}\t${id}\t${g}\t${m.footSpread.toFixed(4)}\t${m.handOut.toFixed(4)}\t${m.elbowOut.toFixed(4)}\t${m.hipsY.toFixed(4)}`);
  }
}
// --out lets a second study write beside pass 1's file instead of over it.
writeFileSync(join(OUTDIR, String(args.out || 'bone_metrics.json')), JSON.stringify(out, null, 2));

// group summary
for (const ch of CHARS) {
  for (const g of ['M', 'F']) {
    const s = out.filter(o => o.ch === ch && o.perf === g);
    if (!s.length) continue;
    const mean = k => s.reduce((a, b) => a + b[k], 0) / s.length;
    console.log(`SUMMARY ${ch} ${g} (n=${s.length}): footSpread=${mean('footSpread').toFixed(4)} handOut=${mean('handOut').toFixed(4)} elbowOut=${mean('elbowOut').toFixed(4)} hipsY=${mean('hipsY').toFixed(4)}`);
  }
}
await browser.close();
server.close();
process.exit(0);
