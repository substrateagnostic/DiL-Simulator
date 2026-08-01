// SPINE + FLOOR REVIEW — the verification gate for the V8 retarget/ground fix.
//
// SUPERSEDED AS A POSTURE GATE. Use tools/meshy-spine-gate.mjs.
// window.__spine() below reads ONE joint, Hips->Spine02 — which is exactly the
// joint the V8 pelvis retarget corrected. It is a faithful witness that the
// retarget still works and nothing more. It is structurally blind to the five
// joints above it, and it certified a calm stance that was a monotonic forward
// slouch from Spine02 to the skull. Its TILE is also 240px, below the
// resolution at which a human reviewer can adjudicate a hunch. Keep this file
// for the retarget/ground regression it does measure honestly; never quote it
// as evidence about posture.
//
// This harness imports the SHIPPING module (src/combat/MeshyRetarget.js) over
// HTTP and drives it exactly the way CombatScene does: capture the target rest
// pose off the freshly parsed GLB, retarget each shared clip against the donor
// rest pose read out of the clip GLB's own armature, measure the per-clip ground
// offset, and hang the model under a wrapper whose position.y is -offset. So a
// green sheet here is a statement about the game, not about a re-implementation.
//
// It reports, per character:
//   • spine-base tilt (hips -> Spine02 angle from vertical) NAIVE vs FIXED —
//     the discriminant that separated the 18 flagged characters with a 50 deg gap
//   • per-clip ground offset and, after the offset is applied, the min/max foot
//     height across the clip — i.e. the residual hover/sink band
// and renders stitched review sheets: side (mandatory — a spine defect lives in
// the side view), front, back, three-quarter, plus reaction-clip strips.
//
//   node tools/meshy-spine-floor-review.mjs [--ids=a,b] [--out=<dir>] [--noshots]
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const OUT = join(REPO, args.out || 'art/char_refs/meshy_pilot/_review_v8');
mkdirSync(OUT, { recursive: true });
const GLBDIR = join(REPO, 'public/meshy');
const ids = args.ids ? String(args.ids).split(',').filter(Boolean)
  : readdirSync(GLBDIR).filter(f => f.endsWith('_idle.glb')).map(f => f.replace('_idle.glb', '')).sort();

// The 18 the producer flagged on the stance contact sheet.
const FLAGGED = new Set(['alex_it', 'cfos_assistant', 'chad', 'chief_of_restructuring', 'client_m_athletic',
  'client_m_heavy', 'compliance', 'corporate_lawyer', 'data_analytics_lead', 'diane', 'firm_paralegal',
  'intern', 'isaiah', 'networking_guy', 'regional', 'regional_director', 'restructuring_analyst', 'ross_boss']);

// role -> clip file, mirroring MeshyClips.CLIP_IDS
const ROLES = { stance_a: 'a336', stance_b: 'a338', guard: 'a138', hurt: 'a178', stagger: 'a391', victory: 'a59', attack: 'a191' };
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.json': 'application/json', '.wasm': 'application/wasm' };
const TILE = 240;

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#12121a}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
// THE SHIPPING MODULE. Not a copy.
import { captureRest, retargetClip, groundOffsets } from '/src/combat/MeshyRetarget.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(${TILE}, ${TILE}); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x12121a);
const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 100);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const d1 = new THREE.DirectionalLight(0xffffff, 0.8); d1.position.set(3,4,2); scene.add(d1);
const d2 = new THREE.DirectionalLight(0xc6d4f2, 0.5); d2.position.set(-3,2,4); scene.add(d2);
const d3 = new THREE.DirectionalLight(0x9adfff, 0.45); d3.position.set(0,2,-5); scene.add(d3);
const ramp = (()=>{const t=new THREE.DataTexture(new Uint8Array([80,160,255]),3,1,THREE.RedFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})();
scene.add(new THREE.GridHelper(3, 12, 0x445566, 0x223344));
// THE FLOOR LINE. y=0 is literally where CombatScene puts every combatant.
const line = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.006), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
line.rotation.x = -Math.PI/2; line.position.y = 0.001; scene.add(line);

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
// group -> inner -> model, the same two-wrapper shape CombatScene builds. The
// ground offset goes on inner, exactly as MeshyAnimator drives it.
const group = new THREE.Group(); const inner = new THREE.Group();
group.add(inner); scene.add(group);

const donor = {};            // role -> { clip, donorRest }
let model=null, mixer=null, H=1.7, skinned=[], targetRest=null;
let fixedClips={}, offsets={};

window.__initClips = async (map) => {
  const out = {};
  for (const [role, file] of Object.entries(map)) {
    const g = await new Promise((r,j)=>loader.load('/clips/'+file+'.glb', r, undefined, e=>j(String(e))));
    donor[role] = { clip: g.animations[0], donorRest: captureRest(g.scene) };
    out[role] = { tracks: g.animations[0].tracks.length, dur: +g.animations[0].duration.toFixed(2), restBones: donor[role].donorRest.size };
  }
  return out;
};

window.__load = (id) => new Promise((res, rej) => {
  if (model) { inner.remove(model); model = null; }
  mixer = null; skinned = []; fixedClips = {}; offsets = {};
  inner.position.set(0,0,0); inner.scale.setScalar(1);
  loader.load('/meshy/'+id+'_idle.glb', g => {
    model = g.scene;
    // captureRest BEFORE anything touches transforms — same order as MeshyCast.load
    targetRest = captureRest(model);
    model.traverse(c => {
      if (c.isSkinnedMesh) { c.frustumCulled = false; skinned.push(c); }
      if (c.isMesh && c.material) c.material = new THREE.MeshToonMaterial({ map: c.material.map||null, color: 0xffffff, gradientMap: ramp });
    });
    inner.add(model); group.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(model);
    H = b.getSize(new THREE.Vector3()).y || 1.7;
    // Timed, because both of these run synchronously inside the combat fade in
    // CombatScene._buildMeshyCombatant — a slow ground measure would show up as
    // a hitch on the way into a fight.
    const t0 = performance.now();
    for (const [role, d] of Object.entries(donor)) fixedClips[role] = retargetClip(d.clip, d.donorRest, targetRest);
    const t1 = performance.now();
    offsets = groundOffsets(model, fixedClips, { restore: targetRest });
    const t2 = performance.now();
    res({ H: +H.toFixed(4), bindMinY: +b.min.y.toFixed(4), restBones: targetRest.size, offsets,
      retargetMs: +(t1 - t0).toFixed(1), groundMs: +(t2 - t1).toFixed(1) });
  }, undefined, e => rej(String(e)));
});

function resetRest() {
  model.traverse(o => { const r = targetRest.get(o.name); if (r) { o.quaternion.copy(r.q); o.position.copy(r.p); } });
  group.updateMatrixWorld(true);
}

// mode: 'bind' | 'naive' | 'fixed'
window.__pose = (mode, role, t) => {
  if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model); mixer = null; }
  resetRest();
  inner.position.y = 0;
  if (mode === 'bind') { group.updateMatrixWorld(true); return; }
  const clip = mode === 'naive' ? donor[role].clip : fixedClips[role];
  mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(clip).play();
  mixer.setTime(t);
  if (mode === 'fixed') inner.position.y = -(offsets[role] ?? 0);
  group.updateMatrixWorld(true);
};

// Lowest skinned vertex, full scan (this is a measurement, not a hot path).
window.__floor = () => {
  let min = Infinity; const v = new THREE.Vector3();
  for (const m of skinned) { m.updateMatrixWorld(true);
    const p = m.geometry.attributes.position;
    for (let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i); m.applyBoneTransform(i,v); m.localToWorld(v); if (v.y<min) min=v.y; } }
  return min;
};

// hips -> Spine02 segment angle from vertical. Rest is ~0-6 deg for everyone;
// anything large IS the banana.
window.__spine = () => {
  let hips=null, sp=null;
  model.traverse(o => { if (o.name === 'Hips') hips = o; if (o.name === 'Spine02') sp = o; });
  if (!hips || !sp) return null;
  const a = hips.getWorldPosition(new THREE.Vector3()), b = sp.getWorldPosition(new THREE.Vector3());
  const d = b.sub(a);
  return +(Math.acos(Math.max(-1, Math.min(1, d.y / (d.length()||1)))) * 180 / Math.PI).toFixed(2);
};

// Residual foot band for one role once the ground offset is applied: how far
// the lowest vertex strays from y=0 across the whole clip. Static per-clip
// offsets are only defensible if this band is small.
window.__band = (role, samples) => {
  const clip = fixedClips[role];
  let lo = Infinity, hi = -Infinity;
  for (let s = 0; s < samples; s++) {
    window.__pose('fixed', role, clip.duration * s / (samples - 1));
    const f = window.__floor();
    lo = Math.min(lo, f); hi = Math.max(hi, f);
  }
  return { lo: +lo.toFixed(4), hi: +hi.toFixed(4) };
};

// Horizontal root travel across a clip — the skate check (a59/a191 were
// exported before the authoring-side pin landed).
window.__skate = (role, mode, samples) => {
  let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
  for (let s = 0; s < samples; s++) {
    window.__pose(mode, role, fixedClips[role].duration * s / (samples - 1));
    let hips=null; model.traverse(o => { if (o.name === 'Hips') hips = o; });
    const p = hips.getWorldPosition(new THREE.Vector3());
    x0=Math.min(x0,p.x); x1=Math.max(x1,p.x); z0=Math.min(z0,p.z); z1=Math.max(z1,p.z);
  }
  return { dx: +(x1-x0).toFixed(4), dz: +(z1-z0).toFixed(4) };
};

window.__roleDuration = (role) => fixedClips[role]?.duration ?? 0;

const ANGLES = { front: 0, side: Math.PI/2, back: Math.PI, tq: Math.PI*0.25 };
window.__shot = (angle) => {
  const d = H * 1.9, cy = H * 0.5, a = ANGLES[angle] ?? 0;
  camera.position.set(Math.sin(a)*d, cy, Math.cos(a)*d);
  camera.lookAt(0, cy, 0);
  renderer.render(scene, camera);
};
window.__ready = true;
</script></body></html>`;

const ROOTS = {
  '/node_modules/': join(REPO, 'node_modules'),
  '/src/': join(REPO, 'src'),
  '/clips/': join(GLBDIR, 'clips'),
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
// HEADED chromium: swiftshader is ~8s/character and misleads timing.
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: TILE + 40, height: TILE + 40 } })).newPage();
page.on('pageerror', e => console.log('[page error]', String(e).slice(0, 300)));
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 200)); });
await page.goto(`http://localhost:${port}/harness.html`);
await page.waitForFunction(() => window.__ready === true, { timeout: 60000 });
console.log('clips:', JSON.stringify(await page.evaluate(m => window.__initClips(m), ROLES)));

const SHOOT = !args.noshots;
const data = [];
const sheetRows = { side: [], front: [], back: [], tq: [] };
// A representative slice for the reaction strips: 4 worst-affected, 2 clean
// controls, the clip donor, and the cane character.
const STRIP_IDS = ['firm_paralegal', 'intern', 'ross_boss', 'diane', 'karen', 'grandma', 'andrew', 'rachel_boss']
  .filter(i => ids.includes(i));

for (const id of ids) {
  let info;
  try { info = await page.evaluate(i => window.__load(i), id); }
  catch (e) { console.log(`FAIL ${id}: ${e}`); continue; }
  const rec = { id, flagged: FLAGGED.has(id), height_m: info.H, bindMinY_m: info.bindMinY, restBones: info.restBones,
    retargetMs: info.retargetMs, groundMs: info.groundMs, offsets: {}, bands: {}, spine: {}, skate: {} };
  for (const [role, v] of Object.entries(info.offsets)) rec.offsets[role] = +v.toFixed(4);

  // spine tilt, naive vs fixed, on the two calm stances at two times
  for (const role of ['stance_a', 'stance_b']) {
    for (const t of [2.0, 6.0]) {
      await page.evaluate(([m, r, tt]) => window.__pose(m, r, tt), ['naive', role, t]);
      const n = await page.evaluate(() => window.__spine());
      await page.evaluate(([m, r, tt]) => window.__pose(m, r, tt), ['fixed', role, t]);
      const f = await page.evaluate(() => window.__spine());
      rec.spine[`${role}@${t}`] = { naive: n, fixed: f };
    }
  }
  // spine tilt under every reaction clip (fixed only) — the 18 must be clean in
  // ALL SEVEN, not just the stance.
  for (const role of Object.keys(ROLES)) {
    await page.evaluate(([m, r, tt]) => window.__pose(m, r, tt), ['fixed', role, 0.6]);
    rec.spine[`${role}@0.6`] = { fixed: await page.evaluate(() => window.__spine()) };
  }
  // residual foot band per clip, offset applied
  for (const role of Object.keys(ROLES)) {
    rec.bands[role] = await page.evaluate(([r, s]) => window.__band(r, s), [role, 12]);
  }
  // skate check on the two clips the diagnosis called unpinned
  for (const role of ['victory', 'attack', 'stagger']) {
    rec.skate[role] = {
      naive: await page.evaluate(([r, m, s]) => window.__skate(r, m, s), [role, 'naive', 12]),
      fixed: await page.evaluate(([r, m, s]) => window.__skate(r, m, s), [role, 'fixed', 12]),
    };
  }
  data.push(rec);

  const worstBand = Math.max(...Object.values(rec.bands).map(b => Math.max(Math.abs(b.lo), Math.abs(b.hi))));
  const worstSpine = Math.max(...Object.entries(rec.spine).filter(([k]) => k.endsWith('@0.6')).map(([, v]) => v.fixed));
  console.log(`${rec.flagged ? '*' : ' '} ${id.padEnd(24)} spine naive=${String(rec.spine['stance_a@2'].naive ?? rec.spine['stance_b@2'].naive).padStart(6)}deg -> fixed<=${worstSpine.toFixed(1)}deg   foot band <=${worstBand.toFixed(3)}m   cost ${info.retargetMs}+${info.groundMs}ms`);

  if (!SHOOT) continue;
  // review tiles: BIND / NAIVE stance / FIXED stance t=2 / FIXED stance t=6
  const stance = 'stance_a';
  const cells = {};
  const shots = [
    ['bind', ['bind', stance, 0]],
    ['naive', ['naive', stance, 2.0]],
    ['fix2', ['fixed', stance, 2.0]],
    ['fix6', ['fixed', stance, 6.0]],
  ];
  for (const angle of ['side', 'front', 'back', 'tq']) {
    cells[angle] = [];
    for (const [, pose] of shots) {
      await page.evaluate(p => window.__pose(p[0], p[1], p[2]), pose);
      await page.evaluate(a => window.__shot(a), angle);
      cells[angle].push((await page.locator('canvas').screenshot()).toString('base64'));
    }
    sheetRows[angle].push({ id, flagged: rec.flagged, tiles: cells[angle], hover: rec.bands[stance], spineN: rec.spine[`${stance}@2`].naive, spineF: rec.spine[`${stance}@2`].fixed });
  }
}

// ---- reaction-clip strips: the guard/hurt/stagger/victory/attack beats, side
// view, so a defect that only shows up under a reaction cannot hide behind a
// clean stance sheet.
const reactionRows = [];
if (SHOOT) {
  for (const id of STRIP_IDS) {
    await page.evaluate(i => window.__load(i), id);
    const roleStrips = [];
    for (const role of ['guard', 'hurt', 'stagger', 'victory', 'attack']) {
      const dur = await page.evaluate(r => window.__roleDuration(r), role);
      const frames = [];
      for (let k = 0; k < 5; k++) {
        await page.evaluate(([r, t]) => window.__pose('fixed', r, t), [role, dur * (k / 4) * 0.98]);
        await page.evaluate(() => window.__shot('side'));
        frames.push((await page.locator('canvas').screenshot()).toString('base64'));
      }
      roleStrips.push({ role, frames });
    }
    reactionRows.push({ id, roleStrips });
    console.log(`[strip] ${id}`);
  }
}

// ---- stitch ----
async function stitch(rows, title, cols, dest) {
  const png = await page.evaluate(async ([rows, TILE, title, cols]) => {
    const HDR = 46, LBL = 168;
    const c = document.createElement('canvas');
    c.width = LBL + cols.length * TILE; c.height = HDR + rows.length * TILE;
    const x = c.getContext('2d');
    x.fillStyle = '#0b0b12'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#fff'; x.font = 'bold 16px monospace';
    x.fillText(title, 10, 22);
    x.font = 'bold 13px monospace';
    cols.forEach((s, i) => { x.fillStyle = i === 1 ? '#ff7777' : (i === 0 ? '#aab' : '#77ee99'); x.fillText(s, LBL + i * TILE + 6, 40); });
    for (let r = 0; r < rows.length; r++) {
      const y = HDR + r * TILE;
      x.fillStyle = rows[r].flagged ? '#ffbb88' : '#cfe8d8'; x.font = 'bold 13px monospace';
      x.fillText((rows[r].flagged ? '*' : ' ') + rows[r].id, 6, y + 20);
      x.font = '11px monospace';
      x.fillStyle = '#ff9999'; x.fillText('naive tilt ' + rows[r].spineN + 'd', 6, y + 40);
      x.fillStyle = '#99eebb'; x.fillText('fixed tilt ' + rows[r].spineF + 'd', 6, y + 56);
      x.fillStyle = '#9bb7ff'; x.fillText('foot ' + rows[r].hover.lo.toFixed(3) + '..' + rows[r].hover.hi.toFixed(3) + 'm', 6, y + 76);
      for (let i = 0; i < rows[r].tiles.length; i++) {
        const img = new Image();
        await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + rows[r].tiles[i]; });
        x.drawImage(img, LBL + i * TILE, y, TILE, TILE);
      }
      x.strokeStyle = '#333350'; x.beginPath(); x.moveTo(0, y); x.lineTo(c.width, y); x.stroke();
    }
    return c.toDataURL('image/png');
  }, [rows, TILE, title, cols]);
  writeFileSync(dest, Buffer.from(png.split(',')[1], 'base64'));
  console.log('[sheet] ' + dest);
}

if (SHOOT) {
  const COLS = ['BIND', 'NAIVE stance t=2', 'FIXED stance t=2', 'FIXED stance t=6'];
  for (const angle of ['side', 'front', 'back', 'tq']) {
    const rows = sheetRows[angle];
    const BAND = 11;
    for (let b = 0; b * BAND < rows.length; b++) {
      await stitch(rows.slice(b * BAND, b * BAND + BAND),
        `MESHY V8 SPINE+FLOOR REVIEW — ${angle.toUpperCase()} VIEW  band ${b + 1}   red line = arena floor y=0`,
        COLS, join(OUT, `review_${angle}_band${b + 1}.png`));
    }
  }
}

if (SHOOT && reactionRows.length) {
  for (const row of reactionRows) {
    const png = await page.evaluate(async ([row, TILE]) => {
      const HDR = 40, LBL = 96, ROLES = row.roleStrips;
      const c = document.createElement('canvas');
      c.width = LBL + 5 * TILE; c.height = HDR + ROLES.length * TILE;
      const x = c.getContext('2d');
      x.fillStyle = '#0b0b12'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = '#fff'; x.font = 'bold 16px monospace';
      x.fillText(`REACTION CLIPS — ${row.id}   SIDE VIEW, retargeted + grounded   red line = arena floor y=0`, 10, 24);
      for (let r = 0; r < ROLES.length; r++) {
        const y = HDR + r * TILE;
        x.fillStyle = '#9be8bb'; x.font = 'bold 13px monospace';
        x.fillText(ROLES[r].role, 8, y + 22);
        for (let i = 0; i < ROLES[r].frames.length; i++) {
          const img = new Image();
          await new Promise(res => { img.onload = res; img.src = 'data:image/png;base64,' + ROLES[r].frames[i]; });
          x.drawImage(img, LBL + i * TILE, y, TILE, TILE);
        }
        x.strokeStyle = '#333350'; x.beginPath(); x.moveTo(0, y); x.lineTo(c.width, y); x.stroke();
      }
      return c.toDataURL('image/png');
    }, [row, TILE]);
    const dest = join(OUT, `reactions_${row.id}.png`);
    writeFileSync(dest, Buffer.from(png.split(',')[1], 'base64'));
    console.log('[sheet] ' + dest);
  }
}

writeFileSync(join(OUT, 'review.json'), JSON.stringify(data, null, 2));

// ---- verdict table ----
console.log('\n=== VERDICT ===');
let maxFixedSpine = 0, maxBand = 0, maxSkate = 0, worstSpineId = '', worstBandId = '';
for (const r of data) {
  for (const [k, v] of Object.entries(r.spine)) {
    if (v.fixed > maxFixedSpine) { maxFixedSpine = v.fixed; worstSpineId = `${r.id} ${k}`; }
  }
  for (const [k, b] of Object.entries(r.bands)) {
    const w = Math.max(Math.abs(b.lo), Math.abs(b.hi));
    if (w > maxBand) { maxBand = w; worstBandId = `${r.id} ${k}`; }
  }
  for (const s of Object.values(r.skate)) maxSkate = Math.max(maxSkate, s.fixed.dx, s.fixed.dz);
}
const naiveMax = Math.max(...data.map(r => Math.max(...Object.values(r.spine).map(v => v.naive ?? 0))));
console.log(`spine tilt  NAIVE max ${naiveMax.toFixed(1)}deg  ->  FIXED max ${maxFixedSpine.toFixed(2)}deg  (${worstSpineId})`);
console.log(`foot band   FIXED worst |y| ${maxBand.toFixed(4)}m  (${worstBandId})`);
console.log(`root skate  FIXED worst ${maxSkate.toFixed(4)}m`);
const rt = data.map(r => r.retargetMs), gd = data.map(r => r.groundMs);
const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
console.log(`build cost  retarget 7 clips avg ${avg(rt).toFixed(1)}ms max ${Math.max(...rt)}ms | ground measure avg ${avg(gd).toFixed(1)}ms max ${Math.max(...gd)}ms`);
console.log('-> ' + join(OUT, 'review.json'));

await browser.close();
server.close();
