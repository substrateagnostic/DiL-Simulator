// THROWAWAY: gender-of-performance experiment shooter.
//
// Renders SHIPPED optimized character GLBs (public/meshy/<id>_idle.glb, read
// only, never written) playing a chosen clip through the SHIPPED retarget path
// (src/combat/MeshyRetarget.js, imported read-only over the throwaway server),
// at the EXACT combat-stage framing CombatScene uses for a solo enemy.
//
// --frame=v8   camera (0,1.5,5) lookAt (0,0.95,0), flat stage scale 1.9
//              — the framing that shipped while this study's first pass ran.
// --frame=law  camera (0,2.05,5) lookAt (0,1.50,0) and the STAGE FRAMING LAW
//              (_stageScale: true height 1.20..1.80 remapped onto 2.28..2.70
//              world units, scale clamped 1.15..1.95) — the framing the
//              concurrent rig lane landed mid-session. DEFAULT.
// Both are transcribed from src/combat/CombatScene.js rather than imported,
// because that file is being edited by another lane and a comparison must not
// change framing between its own cells.
//
// so a defect that only shows at inspection distance cannot masquerade as a
// defect that shows in play. --yaw rotates the CHARACTER (not the camera) so
// side / three-quarter reads keep the identical lens and distance.
//
//   node tools/_gender-shoot.mjs --pairs=chad:andrew_a251,chad:andrew_a48 --frames=4 --out=x.png
//
// pair syntax: <charId>:<clipFile stem under _clips/gender/clips or public/meshy/clips>
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const GCLIPS = join(REPO, 'art/char_refs/meshy_pilot/_clips/gender/clips');
const SHIPCLIPS = join(REPO, 'public/meshy/clips');
const OUTDIR = join(REPO, 'art/char_refs/meshy_pilot/_clips/gender');
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const PAIRS = String(args.pairs || '').split(',').filter(Boolean).map(p => {
  const [ch, clip, label] = p.split(':');
  return { ch, clip, label: label || '' };
});
const FRAMES = Number(args.frames || 4);
const YAW = Number(args.yaw || 0);          // degrees, rotates the character
const COLS = Number(args.cols || FRAMES);
const OUT = args.out || 'shot.png';
const START = Number(args.start ?? 0.15);   // skip the clip's first 15% (settle)
const SPAN = Number(args.span ?? 0.7);
if (!PAIRS.length) { console.error('need --pairs'); process.exit(1); }
mkdirSync(OUTDIR, { recursive: true });

const FRAME = String(args.frame || 'law');
const CAM = FRAME === 'v8'
  ? { pos: [0, 1.5, 5], look: [0, 0.95, 0] }
  : { pos: [0, 2.05, 5], look: [0, 1.50, 0] };

// Game-window render, then crop the column the enemy actually occupies so the
// sheet shows true on-screen pixel scale rather than a re-framed close-up.
const VW = 1600, VH = 900;
const CROPX = Number(args.cropx || 560), CROPW = Number(args.cropw || 480);
const CROPY = Number(args.cropy || 70), CROPH = Number(args.croph || 800);

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.json': 'application/json' };

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#0d0d14;overflow:hidden}canvas{display:block}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { captureRest, retargetClip } from '/retarget/MeshyRetarget.js';
// --posture: also run the rig lane's LIVE posture clamp (src/combat/MeshyPosture.js,
// read-only). MeshyClips.js:106 applies it to stance_a/stance_b ONLY, never to a
// reaction role — so a reaction render is faithful WITHOUT this flag, and an
// idle render is faithful WITH it. Off by default so comparison cells stay pinned.
const POSTURE = ${JSON.stringify(!!args.posture)};
const clampPosture = POSTURE
  ? (await import('/src/combat/MeshyPosture.js')).clampPosture
  : (c) => c;
// CombatScene sizes every Meshy body against a PROCEDURAL probe of the same
// character (fit = probeH / glbH) before the 1.9 stage scale. Importing the real
// builder is the only way to land on the real on-screen size.
import { buildCharacter } from '/src/entities/CharacterBuilder.js';
import { CHARACTER_CONFIGS } from '/src/data/characters.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(${VW}, ${VH}); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x11111a);

// CombatScene solo-enemy camera, verbatim (see --frame).
const FRAME = ${JSON.stringify(FRAME)};
const camera = new THREE.PerspectiveCamera(50, ${VW} / ${VH}, 0.1, 100);
camera.position.set(${CAM.pos.join(', ')});
camera.lookAt(${CAM.look.join(', ')});
// CombatScene.STAGE + _stageScale, transcribed.
const STAGE = { H_LO: 1.20, H_HI: 1.80, LO: 2.28, HI: 2.70, SCALE_MIN: 1.15, SCALE_MAX: 1.95 };
const stageScale = (figureH) => {
  if (FRAME === 'v8') return 1.9;
  if (!(figureH > 0.2)) return 1.9;
  const t = Math.max(0, Math.min(1, (figureH - STAGE.H_LO) / (STAGE.H_HI - STAGE.H_LO)));
  const worldH = STAGE.LO + (STAGE.HI - STAGE.LO) * t;
  return Math.max(STAGE.SCALE_MIN, Math.min(STAGE.SCALE_MAX, worldH / figureH));
};

// CombatScene light rig at base intensities (same set meshy-cast-shoot approximates).
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const mk = (c, i, p) => { const l = new THREE.DirectionalLight(c, i); l.position.set(...p); scene.add(l); return l; };
mk(0xffffff, 0.60, [2, 5, 3]); mk(0xc6d4f2, 0.52, [0.3, 1.7, 7.5]); mk(0xffdcbe, 0.62, [0.6, 3.9, 5.6]);
mk(0x9adfff, 0.62, [-3.5, 3, -3.5]); mk(0xff9ae0, 0.56, [3.5, 2.6, -3.2]); mk(0xff9ae0, 0.30, [2.2, 0.55, -3.0]);

const ramp = new THREE.DataTexture(new Uint8Array([80, 160, 255]), 3, 1, THREE.RedFormat);
ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true;

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const load = (u) => new Promise((res, rej) => loader.load(u, res, undefined, rej));
const clipCache = {};
let model = null, mixer = null;

let stage = null;
window.__setup = async (charUrl, clipUrl, yawDeg, charId) => {
  if (stage) { scene.remove(stage); stage = null; model = null; }
  const g = await load(charUrl);
  model = g.scene;
  model.traverse(c => {
    if (c.isSkinnedMesh) c.frustumCulled = false;
    if (c.isMesh && c.material) c.material = new THREE.MeshToonMaterial({ map: c.material.map || null, color: 0xffffff, gradientMap: ramp });
  });
  const targetRest = captureRest(model);

  // Verbatim CombatScene._buildCombatant sizing.
  const probe = buildCharacter(CHARACTER_CONFIGS[charId] || {}, { detailed: false });
  const probeH = new THREE.Box3().setFromObject(probe).getSize(new THREE.Vector3()).y;
  const glbH = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;
  let fit = glbH > 0 ? probeH / glbH : 1;
  if (!(fit > 0.2 && fit < 5)) fit = 1;
  const inner = new THREE.Group();
  inner.scale.setScalar(fit);
  inner.add(model);
  stage = new THREE.Group();
  stage.add(inner);
  // CombatScene stages a solo enemy at the origin, facing the lens, at the
  // MEASURED stage scale (figureH = glbH * fit, per _buildCombatant).
  const figureH = glbH * fit;
  const sc = stageScale(figureH);
  stage.position.set(0, 0, 0);
  stage.scale.setScalar(sc);
  stage.rotation.y = (yawDeg || 0) * Math.PI / 180;
  scene.add(stage);
  window.__fit = { probeH, glbH, fit, figureH, stageScale: sc, worldH: figureH * sc };

  if (!clipCache[clipUrl]) {
    const cg = await load(clipUrl);
    clipCache[clipUrl] = { clip: cg.animations[0], donorRest: captureRest(cg.scene) };
  }
  const { clip, donorRest } = clipCache[clipUrl];
  // The shipping path: donor rotations re-solved into the target's own rest frame.
  let bound = clip, retargeted = false;
  try { bound = clampPosture(retargetClip(clip, donorRest, targetRest), targetRest); retargeted = true; } catch (e) { window.__retargetError = String(e); }
  mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(bound).play();
  mixer.setTime(0);
  return { duration: bound.duration, tracks: bound.tracks.length, retargeted, ...window.__fit };
};
window.__frame = (t) => { mixer.setTime(t); renderer.render(scene, camera); };
window.__ready = true;
</script></body></html>`;

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/harness.html') { res.setHeader('Content-Type', 'text/html'); return res.end(HARNESS); }
  const roots = {
    '/node_modules/': join(REPO, 'node_modules'),
    '/meshy/': join(REPO, 'public/meshy'),
    '/gclips/': GCLIPS,
    // Pinned copy of the shipping retargeter (sha256 1a1e3037…, from commit 2d18bcc).
    // Pinned rather than served live from src/ because a concurrent lane is
    // editing that file; both cells of a comparison must run identical code.
    '/retarget/': join(OUTDIR, '_retarget_snapshot'),
    '/src/': join(REPO, 'src'),               // read-only: CharacterBuilder is the size ruler
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

const browser = await chromium.launch({ headless: false, args: [`--window-size=${VW + 40},${VH + 120}`] });
const page = await (await browser.newContext({ viewport: { width: VW, height: VH } })).newPage();
await page.goto(`http://localhost:${port}/harness.html`);
await page.waitForFunction(() => window.__ready === true, { timeout: 60000 });

const clipUrlFor = (stem) => existsSync(join(GCLIPS, `${stem}.glb`)) ? `/gclips/${stem}.glb`
  : existsSync(join(SHIPCLIPS, `${stem}.glb`)) ? `/meshy/clips/${stem}.glb` : null;

const rows = [];
for (const { ch, clip, label } of PAIRS) {
  const charUrl = `/meshy/${ch}_idle.glb`;
  const clipUrl = clipUrlFor(clip);
  if (!clipUrl) { console.log(`[skip] no clip ${clip}`); continue; }
  let meta;
  try { meta = await page.evaluate(([c, k, y, id]) => window.__setup(c, k, y, id), [charUrl, clipUrl, YAW, ch]); }
  catch (e) { console.log(`[FAIL] ${ch}+${clip}: ${String(e).slice(0, 200)}`); continue; }
  const shots = [];
  for (let i = 0; i < FRAMES; i++) {
    const t = meta.duration * (START + SPAN * (FRAMES === 1 ? 0 : i / (FRAMES - 1)));
    await page.evaluate(tt => window.__frame(tt), t);
    shots.push((await page.locator('canvas').screenshot({
      clip: { x: CROPX, y: CROPY, width: CROPW, height: CROPH },
    })).toString('base64'));
  }
  if (args.dump) {
    const d = join(OUTDIR, String(args.dump));
    mkdirSync(d, { recursive: true });
    shots.forEach((s, i) => writeFileSync(join(d, `${ch}__${clip}__y${YAW}__${i}.png`), Buffer.from(s, 'base64')));
  }
  rows.push({ ch, clip, label, shots, meta });
  console.log(`[shot] ${ch} + ${clip}  dur=${meta.duration.toFixed(2)}s tracks=${meta.tracks} retargeted=${meta.retargeted} yaw=${YAW} worldH=${meta.worldH?.toFixed(2)} fit=${meta.fit?.toFixed(3)}`);
}
if (!rows.length) { await browser.close(); server.close(); process.exit(1); }

// --grid=N lays each PAIR as one cell in an N-wide grid (2x2 comparison sheets);
// default lays each pair as a full row of frames (motion strips).
const GRID = Number(args.grid || 0);
const sheet = await page.evaluate(async ({ rows, cw, chh, cols, yaw, grid }) => {
  const LBL = 26;
  const c = document.createElement('canvas');
  const perRow = grid ? grid : cols;
  const framesPerCell = grid ? Math.min(rows[0].shots.length, cols) : cols;
  const cellW = cw * framesPerCell;
  const nRows = grid ? Math.ceil(rows.length / grid) : rows.length;
  c.width = grid ? cellW * perRow : cw * cols; c.height = (chh + LBL) * nRows;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b0b12'; ctx.fillRect(0, 0, c.width, c.height);
  for (let r = 0; r < rows.length; r++) {
    const gx = grid ? (r % grid) * cellW : 0;
    const gy = grid ? Math.floor(r / grid) * (chh + LBL) : r * (chh + LBL);
    for (let i = 0; i < rows[r].shots.length && i < framesPerCell; i++) {
      const img = new Image(); img.src = 'data:image/png;base64,' + rows[r].shots[i]; await img.decode();
      ctx.drawImage(img, gx + i * cw, gy + LBL, cw, chh);
    }
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 15px monospace';
    const txt = `${rows[r].ch} + ${rows[r].clip}${rows[r].label ? '  [' + rows[r].label + ']' : ''}`;
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, cellW, LBL); ctx.clip();
    ctx.fillText(txt, gx + 6, gy + 18);
    ctx.restore();
    ctx.strokeStyle = '#3a3a56'; ctx.strokeRect(gx + 0.5, gy + 0.5, cellW - 1, chh + LBL - 1);
  }
  return c.toDataURL('image/png');
}, { rows, cw: CROPW, chh: CROPH, cols: COLS, yaw: YAW, grid: GRID });

const file = join(OUTDIR, OUT);
writeFileSync(file, Buffer.from(sheet.split(',')[1], 'base64'));
console.log(`sheet -> ${file}`);

await browser.close();
server.close();
process.exit(0);
