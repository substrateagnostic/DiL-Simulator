// FULL-CHAIN SPINE GATE — the instrument that replaces window.__spine().
//
// The V8 gate measured ONE joint, Hips->Spine02, which is precisely the joint
// the V8 pelvis retarget had already fixed. It reported green on a clip that is
// a monotonic forward slouch from Spine02 upward: every link tipping further
// forward than the one below it, terminating in a dropped skull. The test had
// been shaped around the fix. This one reads the WHOLE chain
//
//   Hips -> Spine02 -> Spine01 -> Spine -> neck -> Head -> head_end
//
// plus the gaze vector (headfront - Head), whose vertical component is exactly
// 0.000 in every character's bind pose and is therefore an absolute, untunable
// reference for "is this person looking at the floor".
//
// It runs three ways:
//   node tools/meshy-spine-gate.mjs                 full cast, shipping path
//   node tools/meshy-spine-gate.mjs --audition      screen candidate clips on the DONOR armature
//   node tools/meshy-spine-gate.mjs --shots         + 700px true-side proof sheets and time sweeps
//
// The cast run drives the REAL MeshyClips.clipsFor(), so a green sheet is a
// statement about what ships, not about a re-implementation.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const OUT = join(REPO, args.out || 'art/char_refs/meshy_pilot/_gate_v9');
mkdirSync(OUT, { recursive: true });
const GLBDIR = join(REPO, 'public/meshy');
const AUDITION = join(REPO, 'art/char_refs/meshy_pilot/_audition/clips');

const ids = args.ids ? String(args.ids).split(',').filter(Boolean)
  : readdirSync(GLBDIR).filter(f => f.endsWith('_idle.glb')).map(f => f.replace('_idle.glb', '')).sort();

// The sculpts that are stooped BY DESIGN. Their bind chain already carries the
// stoop, so the gate rebases on their own bind like everyone else but the
// absolute trunk-chord ceiling does not apply to them. Membership is a
// MEASUREMENT, not a taste call: bind trunk lean is 12.23 deg (client_m_elder),
// 5.94 (grandma) and 4.88 (client_f_elder) against a cast median of 1.1 and a
// non-elder maximum of 3.64. Those three are the only bodies whose own bind
// spends most of the 6 deg ceiling before a clip touches them.
const ELDERS = new Set(['grandma', 'client_m_elder', 'client_f_elder']);

// ACCEPTANCE, from the round-2 judge:
//   no joint above Spine02 more than +6 deg over that character's OWN bind
//   trunk chord (Hips->Head) <= 6 deg absolute for the non-elder cast
//   |gaze dy| <= 0.010   (bind is exactly 0.000 on all 33)
const JOINT_BUDGET = 6.0;
const TRUNK_ABS = 6.0;
const GAZE_ABS = 0.010;
// THE V8 RETARGET DISCRIMINANT, now a hard gate on every role rather than a
// reported number on the stance. A clip bound raw onto a foreign pelvis frame
// reads 90.3-164.3 deg at Hips>Spine02; a clip through the retarget reads
// 3.1-39.7 (the top of that band is the victory cheer's own hip drive). 60 sits
// in the 50 deg gap between the two populations, so nothing that skipped the
// fix can pass and nothing that took it can fail.
const HIPS_ABS = 60.0;
const SAMPLES = 9;

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.json': 'application/json', '.wasm': 'application/wasm' };
const TILE = +(args.tile || 720);

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#12121a}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// THE SHIPPING MODULES. clipsFor() is the function CombatScene calls.
import { captureRest, retargetClip, groundOffsets } from '/src/combat/MeshyRetarget.js';
import { clampPosture } from '/src/combat/MeshyPosture.js';
import { clipsFor, preloadClips, idleIdFor, genderFor, beatTimeScales, CLIP_IDS } from '/src/combat/MeshyClips.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(${TILE}, ${TILE}); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x12121a);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const d1 = new THREE.DirectionalLight(0xffffff, 0.85); d1.position.set(3,4,2); scene.add(d1);
const d2 = new THREE.DirectionalLight(0xc6d4f2, 0.5); d2.position.set(-3,2,4); scene.add(d2);
const d3 = new THREE.DirectionalLight(0x9adfff, 0.45); d3.position.set(0,2,-5); scene.add(d3);
const ramp = (()=>{const t=new THREE.DataTexture(new Uint8Array([80,160,255]),3,1,THREE.RedFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})();
scene.add(new THREE.GridHelper(3, 12, 0x3a4a5a, 0x1e2a38));
const line = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.005), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
line.rotation.x = -Math.PI/2; line.position.y = 0.0015; scene.add(line);
// PLUMB LINE through the ankle midpoint. A forward-head slouch is only legible
// in side view against a true vertical.
const plumbMat = new THREE.MeshBasicMaterial({ color: 0x44ff99, transparent: true, opacity: 0.55 });
const plumb = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 3), plumbMat);
plumb.rotation.y = Math.PI/2; scene.add(plumb);

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const group = new THREE.Group(); const inner = new THREE.Group();
group.add(inner); scene.add(group);

const CHAIN = ['Hips','Spine02','Spine01','Spine','neck','Head','head_end'];
const DEG = 180/Math.PI;
const UP = new THREE.Vector3(0,1,0);

let model=null, mixer=null, H=1.7, skinned=[], targetRest=null;
let clips={}, offsets={}, bones={}, forward=new THREE.Vector3(0,0,1);

function collectBones() {
  bones = {};
  model.traverse(o => { if (!bones[o.name]) bones[o.name] = o; });
}

// FORWARD is derived per character from the bind gaze vector, never assumed:
// a wrong forward axis turns a sagittal slouch into a lateral one and hides it.
function deriveForward() {
  const h = bones.Head, f = bones.headfront;
  if (!h || !f) { forward.set(0,0,1); return; }
  const a = h.getWorldPosition(new THREE.Vector3()), b = f.getWorldPosition(new THREE.Vector3());
  const d = b.sub(a); d.y = 0;
  forward.copy(d.lengthSq() > 1e-9 ? d.normalize() : new THREE.Vector3(0,0,1));
}

function segAngles(aName, bName) {
  const a = bones[aName], b = bones[bName];
  if (!a || !b) return null;
  const pa = a.getWorldPosition(new THREE.Vector3()), pb = b.getWorldPosition(new THREE.Vector3());
  const d = pb.sub(pa); const L = d.length() || 1; d.divideScalar(L);
  return {
    // total angle from vertical: always >= |sagittal|, so a clamp on it is conservative
    tot: +(Math.acos(Math.max(-1, Math.min(1, d.y))) * DEG).toFixed(2),
    // signed sagittal: + is forward, the direction the character is facing
    sag: +(Math.atan2(d.dot(forward), d.y) * DEG).toFixed(2),
  };
}

// The judge's readout, in full: six chain joints, the trunk chord, and the gaze.
window.__chain = () => {
  const out = { j: {} };
  for (let i = 0; i < CHAIN.length - 1; i++) {
    const k = CHAIN[i] + '>' + CHAIN[i+1];
    out.j[k] = segAngles(CHAIN[i], CHAIN[i+1]);
  }
  const trunk = segAngles('Hips', 'Head');
  out.trunk = trunk;
  const h = bones.Head, f = bones.headfront;
  if (h && f) {
    const g = f.getWorldPosition(new THREE.Vector3()).sub(h.getWorldPosition(new THREE.Vector3()));
    out.gazeDy = +(g.normalize().y).toFixed(4);
  } else out.gazeDy = null;
  // head travel forward of the ankle midpoint, in metres — the reading a player
  // actually sees in true side view
  const lf = bones.LeftFoot || bones.LeftToeBase, rf = bones.RightFoot || bones.RightToeBase;
  if (h && lf && rf) {
    const mid = lf.getWorldPosition(new THREE.Vector3()).add(rf.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
    const hp = h.getWorldPosition(new THREE.Vector3());
    out.headFwd = +(hp.sub(mid).dot(forward)).toFixed(4);
  } else out.headFwd = null;
  return out;
};

// clipsFor() hands back exactly one calm stance per character — the slate row —
// under the idle role, already posture-clamped. The gate therefore ALSO loads
// that character's stance donor GLB raw, so it can build the unclamped variant
// (idle_raw) on the same instrument and report a real before column rather
// than quoting a previous round's tool.
const donorRaw = {};   // action id -> { clip, rest }
window.__initClips = async (ids) => {
  await preloadClips(ids);
  for (const id of ids) {
    const a = idleIdFor(id);
    if (donorRaw[a]) continue;
    const g = await new Promise((r,j)=>loader.load('/meshy/clips/a'+a+'.glb', r, undefined, e=>j(String(e))));
    donorRaw[a] = { clip: g.animations[0], rest: captureRest(g.scene) };
  }
  return Object.keys(CLIP_IDS);
};

window.__load = (id) => new Promise((res, rej) => {
  if (model) { inner.remove(model); model = null; }
  mixer = null; skinned = []; clips = {}; offsets = {};
  inner.position.set(0,0,0);
  loader.load('/meshy/'+id+'_idle.glb', g => {
    try {
      model = g.scene;
      targetRest = captureRest(model);      // BEFORE anything touches transforms
      model.traverse(c => {
        if (c.isSkinnedMesh) { c.frustumCulled = false; skinned.push(c); }
        if (c.isMesh && c.material) c.material = new THREE.MeshToonMaterial({ map: c.material.map||null, color: 0xffffff, gradientMap: ramp });
      });
      inner.add(model); group.updateMatrixWorld(true);
      collectBones(); deriveForward();
      H = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y || 1.7;
      const t0 = performance.now();
      // THE SHIPPING CALL. Same arguments MeshyCast.clipsFor passes.
      clips = clipsFor(id, id, targetRest);
      const t1 = performance.now();
      // The before column: the same stance clip through the same retarget with
      // the posture clamp withheld. Also the proof that clipsFor() really is
      // clamping the idle — idleMatchesRaw MUST be false.
      const idleId = idleIdFor(id);
      const d = donorRaw[idleId];
      let idleMatchesRaw = null;
      if (d) {
        const raw = retargetClip(d.clip, d.rest, targetRest);
        clips.idle_raw = raw;
        // Also assert the clamped idle is that same clip, not some other row.
        idleMatchesRaw = !!clips.idle && clips.idle.tracks.length === raw.tracks.length
          && clips.idle.tracks.every((tr, i) => tr.name === raw.tracks[i].name
            && tr.values.length === raw.tracks[i].values.length
            && tr.values.every((v, k) => Math.abs(v - raw.tracks[i].values[k]) < 1e-6));
      }
      offsets = groundOffsets(model, clips, { restore: targetRest });
      const t2 = performance.now();
      const lf = bones.LeftFoot, rf = bones.RightFoot;
      plumb.position.set(0,1.5,0);
      if (lf && rf) {
        const mid = lf.getWorldPosition(new THREE.Vector3()).add(rf.getWorldPosition(new THREE.Vector3())).multiplyScalar(0.5);
        plumb.position.set(mid.x, 1.5, mid.z);
      }
      res({ H:+H.toFixed(4), roles:Object.keys(clips), stance:'a'+idleId, gender:genderFor(id, id),
            offsets, idleMatchesRaw,
            // clip IDENTITY per role. retargetClip preserves clip.name, and
            // loadClip stamps it 'a<actionId>' — so this is the cell-by-cell
            // proof of which performance each character actually got.
            cast:Object.fromEntries(Object.entries(clips).map(([k,c])=>[k,c.name])),
            dropped:Object.fromEntries(Object.entries(clips).map(([k,c])=>[k,c.userData?.retargetDroppedTracks ?? null])),
            tracks:Object.fromEntries(Object.entries(clips).map(([k,c])=>[k,c.tracks.length])),
            beats:beatTimeScales(clips),
            durations:Object.fromEntries(Object.entries(clips).map(([k,c])=>[k,+c.duration.toFixed(2)])),
            clipMs:+(t1-t0).toFixed(1), groundMs:+(t2-t1).toFixed(1),
            posture:Object.fromEntries(Object.entries(clips).map(([k,c])=>[k,!!c.userData?.postureClamped])) });
    } catch (e) { rej(String(e && e.stack || e)); }
  }, undefined, e => rej(String(e)));
});

function resetRest() {
  model.traverse(o => { const r = targetRest.get(o.name); if (r) { o.quaternion.copy(r.q); o.position.copy(r.p); } });
  group.updateMatrixWorld(true);
}

// role null = bind pose
window.__pose = (role, t, ground) => {
  if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model); mixer = null; }
  resetRest();
  inner.position.y = 0;
  if (!role) { group.updateMatrixWorld(true); return; }
  const clip = clips[role]; if (!clip) return;
  mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(clip).play();
  mixer.setTime(t);
  if (ground !== false) inner.position.y = -(offsets[role] ?? 0);
  group.updateMatrixWorld(true);
};

window.__floor = () => {
  let min = Infinity; const v = new THREE.Vector3();
  for (const m of skinned) { m.updateMatrixWorld(true);
    const p = m.geometry.attributes.position;
    for (let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i); m.applyBoneTransform(i,v); m.localToWorld(v); if (v.y<min) min=v.y; } }
  return +min.toFixed(4);
};

window.__sweep = (role, n) => {
  const dur = clips[role]?.duration || 0;
  const rows = [];
  for (let s = 0; s < n; s++) {
    const t = n === 1 ? 0 : dur * s / (n - 1);
    window.__pose(role, t);
    rows.push({ t: +t.toFixed(2), ...window.__chain(), floor: window.__floor() });
  }
  return rows;
};

window.__bind = () => { window.__pose(null, 0); return { ...window.__chain(), floor: window.__floor() }; };

// ── AUDITION: pose a candidate clip on its OWN donor armature. No character
// model, no retarget — the cheapest possible screen, and the delta-from-bind it
// reports is exactly what every one of the 33 will inherit.
const auditionCache = {};
window.__audition = async (file, n) => {
  let entry = auditionCache[file];
  if (!entry) {
    const g = await new Promise((r,j)=>loader.load('/audition/'+file, r, undefined, e=>j(String(e))));
    entry = { scene: g.scene, clip: g.animations[0] };
    auditionCache[file] = entry;
  }
  const root = entry.scene; const clip = entry.clip;
  if (!clip) return { file, error: 'no animation' };
  const prev = model; model = root;
  collectBones(); deriveForward();
  const rest = captureRest(root);
  const restore = () => root.traverse(o => { const r = rest.get(o.name); if (r) { o.quaternion.copy(r.q); o.position.copy(r.p); } });
  restore(); root.updateMatrixWorld(true);
  const bind = window.__chain();
  const mx = new THREE.AnimationMixer(root);
  mx.clipAction(clip).play();
  const rows = [];
  for (let s = 0; s < n; s++) {
    const t = n === 1 ? 0 : clip.duration * s / (n - 1);
    restore(); mx.setTime(t); root.updateMatrixWorld(true);
    rows.push({ t: +t.toFixed(2), ...window.__chain() });
  }
  mx.stopAllAction(); mx.uncacheRoot(root); restore(); root.updateMatrixWorld(true);
  model = prev; if (model) { collectBones(); deriveForward(); }
  return { file, duration: +clip.duration.toFixed(2), bind, rows };
};

// ── TRY-ON: put an AUDITION candidate on a real body through the shipping
// retarget (and optionally the posture clamp), so a clip is judged on a
// silhouette and not on a number alone. Numbers pick the shortlist; the eye
// picks the winner.
window.__tryOn = async (file, clamp) => {
  let entry = auditionCache[file];
  if (!entry) {
    const g = await new Promise((r,j)=>loader.load('/audition/'+file, r, undefined, e=>j(String(e))));
    entry = { scene: g.scene, clip: g.animations[0] };
    auditionCache[file] = entry;
  }
  let c = retargetClip(entry.clip, captureRest(entry.scene), targetRest);
  if (clamp) c = clampPosture(c, targetRest);
  clips.__try = c;
  offsets.__try = groundOffsets(model, { __try: c }, { restore: targetRest }).__try ?? 0;
  return { duration: +c.duration.toFixed(2), offset: +offsets.__try.toFixed(4) };
};

const ANGLES = { side: Math.PI/2, front: 0, back: Math.PI, tq: Math.PI*0.25 };
window.__shot = (angle, tight) => {
  const d = H * (tight ? 1.35 : 1.95), cy = H * (tight ? 0.72 : 0.52), a = ANGLES[angle] ?? 0;
  camera.position.set(Math.sin(a)*d, cy, Math.cos(a)*d);
  camera.lookAt(0, tight ? H*0.72 : cy, 0);
  renderer.render(scene, camera);
};
window.__ready = true;
</script></body></html>`;

const ROOTS = {
  '/node_modules/': join(REPO, 'node_modules'),
  '/src/': join(REPO, 'src'),
  '/audition/': AUDITION,
  '/meshy/': GLBDIR,
};
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
const page = await (await browser.newContext({ viewport: { width: TILE + 40, height: TILE + 60 } })).newPage();
page.on('pageerror', e => console.log('[page error]', String(e).slice(0, 400)));
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 250)); });
await page.goto(`http://localhost:${port}/harness.html`);
await page.waitForFunction(() => window.__ready === true, { timeout: 60000 });

const ABOVE = ['Spine02>Spine01', 'Spine01>Spine', 'Spine>neck', 'neck>Head', 'Head>head_end'];

// ── AUDITION MODE ───────────────────────────────────────────────────────────
if (args.audition) {
  const files = readdirSync(AUDITION).filter(f => f.endsWith('.glb')).sort((a, b) => (+a.slice(1)) - (+b.slice(1)));
  const results = [];
  for (const f of files) {
    let r;
    try { r = await page.evaluate(([ff, n]) => window.__audition(ff, n), [f, SAMPLES]); }
    catch (e) { console.log(`FAIL ${f}: ${String(e).slice(0, 160)}`); continue; }
    if (r.error) { console.log(`SKIP ${f}: ${r.error}`); continue; }
    // Worst DELTA over bind on any joint above Spine02, over the whole clip.
    // The retarget preserves deltas, so this number is what all 33 inherit.
    let worst = -99, worstJ = '', worstT = 0, trunkD = -99, gaze = 0;
    for (const row of r.rows) {
      for (const k of ABOVE) {
        const d = row.j[k].sag - r.bind.j[k].sag;
        if (d > worst) { worst = d; worstJ = k; worstT = row.t; }
      }
      trunkD = Math.max(trunkD, row.trunk.sag - r.bind.trunk.sag);
      gaze = Math.max(gaze, Math.abs(row.gazeDy - r.bind.gazeDy));
    }
    results.push({ file: f, id: +f.slice(1, -4), duration: r.duration, worstDelta: +worst.toFixed(2), worstJoint: worstJ, worstT, trunkDelta: +trunkD.toFixed(2), gazeDelta: +gaze.toFixed(4), bind: r.bind, rows: r.rows });
  }
  results.sort((a, b) => a.worstDelta - b.worstDelta);
  console.log('\n=== STANCE AUDITION — screened on the DONOR armature ===');
  console.log('worst delta = biggest forward tip over bind on any joint ABOVE Spine02, whole clip');
  console.log('id     dur    worstDelta  joint             @t     trunkD   gazeD');
  for (const r of results) {
    console.log(`${String(r.id).padEnd(6)} ${String(r.duration).padEnd(6)} ${String(r.worstDelta).padStart(8)}deg  ${r.worstJoint.padEnd(17)} ${String(r.worstT).padStart(5)}  ${String(r.trunkDelta).padStart(6)}  ${String(r.gazeDelta).padStart(7)}`);
  }
  writeFileSync(join(OUT, 'audition.json'), JSON.stringify(results, null, 2));
  console.log('-> ' + join(OUT, 'audition.json'));
  await browser.close(); server.close();
  process.exit(0);
}

// ── TRY-ON MODE ─────────────────────────────────────────────────────────────
// node tools/meshy-spine-gate.mjs --try=a247,a252,a336 --on=andrew,intern
if (args.try) {
  const cands = String(args.try).split(',').map(s => s.endsWith('.glb') ? s : s + '.glb');
  const bodies = String(args.on || 'andrew,intern').split(',');
  const clamp = args.clamp !== 'false';
  await page.evaluate(b => window.__initClips(b), bodies);
  for (const body of bodies) {
    const info = await page.evaluate(i => window.__load(i), body);
    const rows = [];
    for (const f of cands) {
      const t = await page.evaluate(([ff, cl]) => window.__tryOn(ff, cl), [f, clamp]);
      const tiles = [];
      const TS = [0, 0.25, 0.5, 0.75].map(k => +(t.duration * k).toFixed(2));
      for (const tt of TS) {
        await page.evaluate(p => window.__pose(p[0], p[1]), ['__try', tt]);
        await page.evaluate(() => window.__shot('side', false));
        tiles.push((await page.locator('canvas').screenshot()).toString('base64'));
      }
      await page.evaluate(p => window.__pose(p[0], p[1]), ['__try', t.duration * 0.5]);
      const chain = await page.evaluate(() => window.__chain());
      rows.push({ id: f.replace('.glb', ''), pass: true, tiles, lines: [
        `${t.duration}s  ground ${t.offset}`,
        `trunk ${chain.trunk.sag}d`, `gaze ${chain.gazeDy}`, `headFwd ${chain.headFwd}m`] });
      console.log(`[try] ${body} ${f} dur=${t.duration} trunk=${chain.trunk.sag} gaze=${chain.gazeDy}`);
    }
    await stitch(null, `STANCE TRY-ON — ${body}, TRUE SIDE ${TILE}px/cell, shipping retarget${clamp ? ' + posture clamp' : ''}`,
      ['t=0', 't=25%', 't=50%', 't=75%'], rows, join(OUT, `tryon_${body}${clamp ? '' : '_raw'}.png`), TILE);
  }
  await browser.close(); server.close(); process.exit(0);
}

// ── CAST GATE ───────────────────────────────────────────────────────────────
console.log('clips:', (await page.evaluate(i => window.__initClips(i), ids)).join(','));
const REACTION_ROLES = ['guard', 'hurt', 'stagger', 'victory', 'attack'];
const data = [];
let fails = 0;
for (const id of ids) {
  let info;
  try { info = await page.evaluate(i => window.__load(i), id); }
  catch (e) { console.log(`FAIL ${id}: ${String(e).slice(0, 300)}`); fails++; continue; }
  const bind = await page.evaluate(() => window.__bind());
  const rec = { id, height_m: info.H, gender: info.gender, stanceShipped: info.stance,
    cast: info.cast, dropped: info.dropped, tracks: info.tracks, beats: info.beats,
    durations: info.durations, offsets: {}, posture: info.posture,
    clipMs: info.clipMs, groundMs: info.groundMs, bind, stances: {}, reactions: {}, verdict: {} };
  for (const [r, v] of Object.entries(info.offsets)) rec.offsets[r] = +v.toFixed(4);

  // CLIP-PROCESSING INTEGRITY, per cell. A clip that came through a stale strip
  // path or a foreign rig shows up here as a dropped track or a short bind: the
  // retargeter silently skips any track whose bone is missing from either rest
  // map, and 24 rotations + 1 Hips translation is the whole authored rig.
  const badTracks = Object.entries(rec.tracks).filter(([r, n]) => r !== 'cast' && n !== 25).map(([r, n]) => `${r}=${n}`);
  const badDropped = Object.entries(rec.dropped).filter(([, n]) => n).map(([r, n]) => `${r}=${n}`);
  if (badTracks.length) console.log(`  !! ${id}: track count not 25 — ${badTracks.join(' ')}`);
  if (badDropped.length) console.log(`  !! ${id}: retarget DROPPED tracks — ${badDropped.join(' ')}`);
  if (info.idleMatchesRaw === true) console.log(`  !! ${id}: clipsFor().idle is NOT posture-clamped`);

  const elder = ELDERS.has(id);
  let worstJointExcess = -99, worstJointName = '', worstTrunk = -99, worstGaze = 0;
  let floorLo = Infinity, floorHi = -Infinity;
  let reactLo = Infinity, reactHi = -Infinity;
  // The unclamped state of the SAME stance clip, measured on the same
  // instrument, so the before column is not a quotation from another round.
  let rawJoint = -99, rawTrunk = -99, rawGaze = 0;
  if (info.roles.includes('idle_raw')) {
    const rows = await page.evaluate(([r, n]) => window.__sweep(r, n), ['idle_raw', SAMPLES]);
    for (const row of rows) {
      for (const k of ABOVE) rawJoint = Math.max(rawJoint, row.j[k].sag - bind.j[k].sag);
      rawTrunk = Math.max(rawTrunk, elder ? row.trunk.sag - bind.trunk.sag : row.trunk.sag);
      rawGaze = Math.max(rawGaze, Math.abs(row.gazeDy));
    }
  }
  rec.raw = { worstJointExcess: +rawJoint.toFixed(2), worstTrunk: +rawTrunk.toFixed(2), worstGaze: +rawGaze.toFixed(4) };
  {
    const rows = await page.evaluate(([r, n]) => window.__sweep(r, n), ['idle', SAMPLES]);
    rec.stances.idle = rows;
    for (const row of rows) {
      for (const k of ABOVE) {
        const excess = row.j[k].sag - bind.j[k].sag;
        if (excess > worstJointExcess) { worstJointExcess = excess; worstJointName = `${k}@idle t${row.t}`; }
      }
      worstTrunk = Math.max(worstTrunk, elder ? row.trunk.sag - bind.trunk.sag : row.trunk.sag);
      worstGaze = Math.max(worstGaze, Math.abs(row.gazeDy));
      floorLo = Math.min(floorLo, row.floor); floorHi = Math.max(floorHi, row.floor);
    }
  }
  // Reactions are supposed to bend; they are measured and reported, not gated.
  let hipsMax = Math.max(...rec.stances.idle.map(row => row.j['Hips>Spine02'].tot));
  for (const role of REACTION_ROLES) {
    const rows = await page.evaluate(([r, n]) => window.__sweep(r, n), [role, 6]);
    rec.reactions[role] = {
      clip: rec.cast[role],
      maxExcess: +Math.max(...rows.map(row => Math.max(...ABOVE.map(k => row.j[k].sag - bind.j[k].sag)))).toFixed(2),
      hipsSpine02Max: +Math.max(...rows.map(row => row.j['Hips>Spine02'].tot)).toFixed(2),
      floorLo: +Math.min(...rows.map(r2 => r2.floor)).toFixed(4), floorHi: +Math.max(...rows.map(r2 => r2.floor)).toFixed(4) };
    reactLo = Math.min(reactLo, rec.reactions[role].floorLo); reactHi = Math.max(reactHi, rec.reactions[role].floorHi);
    // THE V8 RETARGET WITNESS, now read across every role and not only the
    // stance: a clip that skipped the retarget reads 90-164 deg here, a clip
    // that went through it reads 3-40.
    hipsMax = Math.max(hipsMax, rec.reactions[role].hipsSpine02Max);
  }
  rec.verdict = {
    worstJointExcess: +worstJointExcess.toFixed(2), worstJointName,
    worstTrunk: +worstTrunk.toFixed(2), trunkMode: elder ? 'delta(elder)' : 'absolute',
    worstGaze: +worstGaze.toFixed(4),
    hipsSpine02Max: +hipsMax.toFixed(2),
    floorLo: +floorLo.toFixed(4), floorHi: +floorHi.toFixed(4),
    reactFloorLo: +reactLo.toFixed(4), reactFloorHi: +reactHi.toFixed(4),
    tracksOk: !badTracks.length && !badDropped.length,
    clamped: info.idleMatchesRaw === false,
  };
  // WHY, not just whether. The mechanical checks (tracks, retarget witness,
  // joint budget, gaze) say the pipeline is intact; the absolute trunk ceiling
  // is a CALMNESS check, authored for the two breathing stances, and the slate
  // deliberately casts gesture idles for some characters. Separating the
  // reasons keeps a taste call from reading as a rig failure.
  const reasons = [];
  if (badTracks.length) reasons.push('tracks:' + badTracks.join('/'));
  if (badDropped.length) reasons.push('dropped:' + badDropped.join('/'));
  if (hipsMax > HIPS_ABS) reasons.push(`retarget hips>sp02 ${hipsMax.toFixed(2)}`);
  if (worstJointExcess > JOINT_BUDGET) reasons.push(`joint +${worstJointExcess.toFixed(2)}`);
  if (worstGaze > GAZE_ABS) reasons.push(`gaze ${worstGaze.toFixed(4)}`);
  if (worstTrunk > TRUNK_ABS) reasons.push(`trunk ${worstTrunk.toFixed(2)} (calmness, peak sample)`);
  rec.verdict.reasons = reasons;
  rec.verdict.pass = reasons.length === 0;
  if (!rec.verdict.pass) fails++;
  data.push(rec);
  const v = rec.verdict;
  console.log(`${v.pass ? 'PASS' : 'FAIL'} ${id.padEnd(24)} ${info.gender} ${String(info.stance).padEnd(5)} joint+${String(v.worstJointExcess).padStart(6)}d trunk ${String(v.worstTrunk).padStart(6)}d  gaze ${String(v.worstGaze).padStart(7)}  hips>sp02<=${String(v.hipsSpine02Max).padStart(5)}d  stance floor ${v.floorLo.toFixed(4)}..${v.floorHi.toFixed(4)}  ${info.clipMs}+${info.groundMs}ms${reasons.length ? '  << ' + reasons.join('; ') : ''}`);
}

writeFileSync(join(OUT, 'gate.json'), JSON.stringify({ budget: { JOINT_BUDGET, TRUNK_ABS, GAZE_ABS, HIPS_ABS, SAMPLES }, data }, null, 2));

console.log('\n=== GATE VERDICT ===');
const mx = (f) => data.reduce((a, r) => Math.max(a, f(r)), -Infinity);
const mn = (f) => data.reduce((a, r) => Math.min(a, f(r)), Infinity);
console.log(`characters            ${data.length}`);
console.log(`worst joint excess    unclamped ${mx(r => r.raw.worstJointExcess).toFixed(2)} -> ${mx(r => r.verdict.worstJointExcess).toFixed(2)} deg  (budget ${JOINT_BUDGET})`);
console.log(`worst trunk chord     unclamped ${mx(r => r.raw.worstTrunk).toFixed(2)} -> ${mx(r => r.verdict.worstTrunk).toFixed(2)} deg  (ceiling ${TRUNK_ABS}, elders on delta)`);
const trunkExcess = r => r.verdict.worstTrunk - (ELDERS.has(r.id) ? 0 : r.bind.trunk.sag);
console.log(`trunk over OWN bind   ${mn(trunkExcess).toFixed(2)} .. ${mx(trunkExcess).toFixed(2)} deg  (the clamp is uniform; what is left is each sculpt's own lean)`);
console.log(`worst |gaze dy|       unclamped ${mx(r => r.raw.worstGaze).toFixed(4)} -> ${mx(r => r.verdict.worstGaze).toFixed(4)}      (ceiling ${GAZE_ABS})`);
console.log(`Hips>Spine02 max      ${mn(r => r.verdict.hipsSpine02Max).toFixed(2)} .. ${mx(r => r.verdict.hipsSpine02Max).toFixed(2)} deg  ALL ROLES  (retarget witness, ceiling ${HIPS_ABS}; unretargeted reads 90-164)`);
console.log(`floor band STANCE     ${mn(r => r.verdict.floorLo).toFixed(4)} .. ${mx(r => r.verdict.floorHi).toFixed(4)} m`);
console.log(`floor band REACTIONS  ${mn(r => r.verdict.reactFloorLo).toFixed(4)} .. ${mx(r => r.verdict.reactFloorHi).toFixed(4)} m  (the cheer and the jab leave the floor by design)`);
console.log(`clip build            avg ${(data.reduce((a, r) => a + r.clipMs, 0) / data.length).toFixed(1)}ms  ground avg ${(data.reduce((a, r) => a + r.groundMs, 0) / data.length).toFixed(1)}ms`);
console.log(`track integrity       ${data.filter(r => r.verdict.tracksOk).length}/${data.length} characters with 25 tracks and 0 dropped in every role`);
console.log(`idle posture-clamped  ${data.filter(r => r.verdict.clamped).length}/${data.length}`);
console.log(`FAILURES              ${data.filter(r => !r.verdict.pass).map(r => `${r.id} [${r.verdict.reasons.join('; ')}]`).join(', ') || 'none'}`);

// ── THE CASTING SLATE, as shipped. One row per character, the clip actually
// bound to each role and the beat multiplier it plays at.
console.log('\n=== SLATE AS SHIPPED ===');
console.log('character                b  idle   guard  hurt   stagger victory attack  | beat x (hurt/stag/atk)');
for (const r of data) {
  const c = r.cast, b = r.beats;
  const f = (k) => String(c[k] || '-').padEnd(6);
  console.log(`${r.id.padEnd(24)} ${r.gender}  ${f('idle')} ${f('guard')} ${f('hurt')} ${f('stagger')} ${f('victory')} ${f('attack')} | ${(b.hurt ?? 1).toFixed(3)} ${(b.stagger ?? 1).toFixed(3)} ${(b.attack ?? 1).toFixed(3)}`);
}
const allBeats = data.flatMap(r => Object.entries(r.beats).map(([k, v]) => v));
console.log(`timeScale window applied: ${Math.min(...allBeats).toFixed(3)} .. ${Math.max(...allBeats).toFixed(3)}`);

// ── PROOF SHEETS ────────────────────────────────────────────────────────────
async function stitch(cells, title, cols, rowLabels, dest, tile) {
  const png = await page.evaluate(async ([cells, tile, title, cols, rowLabels]) => {
    const HDR = 54, LBL = 210;
    const c = document.createElement('canvas');
    c.width = LBL + cols.length * tile; c.height = HDR + rowLabels.length * tile;
    const x = c.getContext('2d');
    x.fillStyle = '#0b0b12'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#fff'; x.font = 'bold 20px monospace'; x.fillText(title, 12, 26);
    x.font = 'bold 15px monospace'; x.fillStyle = '#8fd8ff';
    cols.forEach((s, i) => x.fillText(s, LBL + i * tile + 8, 46));
    for (let r = 0; r < rowLabels.length; r++) {
      const y = HDR + r * tile;
      const L = rowLabels[r];
      x.font = 'bold 16px monospace'; x.fillStyle = L.pass ? '#9be8bb' : '#ff9a7a';
      x.fillText(L.id, 8, y + 24);
      x.font = '13px monospace';
      L.lines.forEach((s, i) => { x.fillStyle = i === 0 ? '#cfe0ff' : '#9fb0cc'; x.fillText(s, 8, y + 48 + i * 18); });
      for (let i = 0; i < L.tiles.length; i++) {
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + L.tiles[i]; });
        x.drawImage(img, LBL + i * tile, y, tile, tile);
      }
      x.strokeStyle = '#333350'; x.beginPath(); x.moveTo(0, y); x.lineTo(c.width, y); x.stroke();
    }
    return c.toDataURL('image/png');
  }, [cells, tile, title, cols, rowLabels]);
  writeFileSync(dest, Buffer.from(png.split(',')[1], 'base64'));
  console.log('[sheet] ' + dest);
}

if (args.shots) {
  // The ten the judge named, plus the two elders and the clip donor's pilot pair.
  const WORST = ['andrew', 'karen', 'chief_of_restructuring', 'intern', 'skip_boss', 'meredith_boss',
    'chad', 'regional', 'brand_consultant', 'isaiah', 'grandma', 'client_m_elder'].filter(i => ids.includes(i));
  for (const angle of ['side', 'front']) {
    const rows = [];
    for (const id of WORST) {
      const info = await page.evaluate(i => window.__load(i), id);
      const rec = data.find(r => r.id === id);
      const tiles = [];
      for (const [role, t] of [[null, 0], ['idle', 2], ['idle', 6], ['guard', 0.6]]) {
        await page.evaluate(p => window.__pose(p[0], p[1]), [role, t]);
        await page.evaluate(([a, tg]) => window.__shot(a, tg), [angle, false]);
        tiles.push((await page.locator('canvas').screenshot()).toString('base64'));
      }
      rows.push({ id, pass: rec?.verdict.pass !== false, tiles, lines: [
        `stance ${info.stance}`,
        `joint +${rec?.verdict.worstJointExcess}d`,
        `trunk ${rec?.verdict.worstTrunk}d`,
        `gaze ${rec?.verdict.worstGaze}`,
        `floor ${rec?.verdict.floorLo}..${rec?.verdict.floorHi}`,
      ] });
    }
    const half = Math.ceil(rows.length / 2);
    for (let b = 0; b < 2; b++) {
      const slice = rows.slice(b * half, b * half + half);
      if (!slice.length) continue;
      await stitch(null, `MESHY V9 POSTURE GATE — ${angle.toUpperCase()} VIEW, ${TILE}px/cell   red = arena floor y=0, green = plumb through ankle midpoint   band ${b + 1}`,
        ['BIND', 'STANCE t=2', 'STANCE t=6', 'GUARD t=0.6'], slice, join(OUT, `gate_${angle}_band${b + 1}.png`), TILE);
    }
  }
  // TIME SWEEP — the image that proves whether a slouch is held or passed through.
  for (const id of ['andrew', 'intern'].filter(i => ids.includes(i))) {
    const info = await page.evaluate(i => window.__load(i), id);
    const rec = data.find(r => r.id === id);
    const TS = [0, 1.4, 2.8, 4.2, 5.6, 7.0, 8.4, 9.8, 11.0].filter(t => t <= (info.durations.idle ?? 0));
    const tiles = [];
    for (const t of TS) {
      await page.evaluate(p => window.__pose(p[0], p[1]), ['idle', t]);
      await page.evaluate(() => window.__shot('side', false));
      tiles.push((await page.locator('canvas').screenshot()).toString('base64'));
    }
    await stitch(null, `TIME SWEEP — ${id} (${info.stance}, ${info.durations.idle}s) TRUE SIDE ${TILE}px/cell   held-vs-passed-through proof`,
      TS.map(t => `t=${t}`), [{ id, pass: rec?.verdict.pass !== false, tiles, lines: [
        `joint +${rec?.verdict.worstJointExcess}d`, `trunk ${rec?.verdict.worstTrunk}d`, `gaze ${rec?.verdict.worstGaze}`] }],
      join(OUT, `sweep_${id}.png`), TILE);
  }
}

console.log('-> ' + join(OUT, 'gate.json'));
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
