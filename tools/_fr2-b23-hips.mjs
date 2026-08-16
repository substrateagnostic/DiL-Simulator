// FIX ROUND 2 - B23 GROUNDING. The metric the first defeat round did not have.
//
// The B23 sweep judged "does the body end up down" by SILHOUETTE DESCENT off the
// vendor's preview GIFs. That is true of a chair sit, so a chair sit is what
// shipped, and the producer read it immediately: "they're sitting on an
// invisible chair".
//
// This instrument reads the one number that discriminates: HIPS ALTITUDE AT THE
// SETTLED FRAME, as a fraction of the character's own height, measured on the
// real body through the shipping MeshyClips.clipsFor(). It reports the same
// number for the pre-fix clip (retarget + trim, no grounding), built on the same
// instrument in the same page, so the before column is a measurement and not a
// quotation. Feet and the min-sole floor come with it, because grounding the
// pelvis is only legal if the soles do not move.
//
//   node tools/_fr2-b23-hips.mjs                        karen, chad, client_m_heavy
//   node tools/_fr2-b23-hips.mjs --ids=karen,chad,grandma
//   node tools/_fr2-b23-hips.mjs --variants=0.16/0,0.16/0.55,0.20/0.8
//
// Headed Chromium, no dev server needed: it serves /src and /public/meshy itself.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, extname } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const OUT = join(REPO, args.out || 'screenshots/fix-round-2/b23-defeat');
mkdirSync(OUT, { recursive: true });
const TILE = +(args.tile || 560);
// karen is the female build, chad the male one, client_m_heavy the belly build
// the grounded pose stresses hardest (thigh against gut on a knees-up sit).
const IDS = String(args.ids || 'karen,chad,client_m_heavy').split(',').filter(Boolean);
// hipFrac/ankleSlide pairs to render beside the shipping defaults. Empty = just
// the shipping numbers.
const VARIANTS = args.variants ? String(args.variants).split(',').map(s => {
  const [f, sl] = s.split('/').map(Number); return { hipFrac: f, slide: sl };
}) : [];

const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.glb': 'model/gltf-binary', '.json': 'application/json', '.wasm': 'application/wasm' };

const HARNESS = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#0b0b12}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
</head><body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { captureRest, retargetClip, groundOffsets } from '/src/combat/MeshyRetarget.js';
import { clipsFor, preloadClips, genderFor, CLIP_IDS, CLIP_BEATS } from '/src/combat/MeshyClips.js';
import { fitFloorSit } from '/src/combat/MeshyFloorSit.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(${TILE}, ${TILE}); document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0b12);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const d1 = new THREE.DirectionalLight(0xffffff, 0.9); d1.position.set(3,4,2); scene.add(d1);
const d2 = new THREE.DirectionalLight(0xc6d4f2, 0.5); d2.position.set(-3,2,4); scene.add(d2);
const ramp = (()=>{const t=new THREE.DataTexture(new Uint8Array([80,160,255]),3,1,THREE.RedFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;return t;})();
scene.add(new THREE.GridHelper(3, 12, 0x3a4a5a, 0x1e2a38));
// THE FLOOR LINE. Every judgement in this sheet is "is the body on that line",
// so the line is drawn at exactly y=0 and nothing else is.
const line = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.006), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
line.rotation.x = -Math.PI/2; line.position.y = 0.002; scene.add(line);

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const group = new THREE.Group(); const inner = new THREE.Group();
group.add(inner); scene.add(group);

let model=null, mixer=null, H=1.7, skinned=[], targetRest=null, bones={};
let clips={}, offsets={};
const donorRaw = {};

const TRIM_FPS = 1000;
function trimLike(clip, t0, t1) {
  const out = THREE.AnimationUtils.subclip(clip, clip.name, t0*TRIM_FPS, Math.min(t1, clip.duration)*TRIM_FPS, TRIM_FPS);
  out.userData = { ...(out.userData||{}), trimmed: true };
  return out;
}

window.__initClips = async (ids) => {
  await preloadClips(ids);
  for (const g of ['m','f']) {
    const a = CLIP_IDS.defeat[g];
    if (donorRaw[a]) continue;
    const gl = await new Promise((r,j)=>loader.load('/meshy/clips/a'+a+'.glb', r, undefined, e=>j(String(e))));
    donorRaw[a] = { clip: gl.animations[0], rest: captureRest(gl.scene) };
  }
  return true;
};

window.__load = (id) => new Promise((res, rej) => {
  if (model) { inner.remove(model); model = null; }
  mixer = null; skinned = []; clips = {}; offsets = {};
  inner.position.set(0,0,0);
  loader.load('/meshy/'+id+'_idle.glb', g => {
    try {
      model = g.scene;
      targetRest = captureRest(model);
      model.traverse(c => {
        if (c.isSkinnedMesh) { c.frustumCulled = false; skinned.push(c); }
        if (c.isMesh && c.material) c.material = new THREE.MeshToonMaterial({ map: c.material.map||null, color: 0xffffff, gradientMap: ramp });
      });
      inner.add(model); group.updateMatrixWorld(true);
      bones = {}; model.traverse(o => { if (!bones[o.name]) bones[o.name] = o; });
      H = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y || 1.7;
      const bindHips = bones.Hips ? bones.Hips.getWorldPosition(new THREE.Vector3()).y : 0;
      // THE SHIPPING CALL, model included — the defeat clip's floor-sit fit
      // probes the mesh, so a call without it measures a different pose.
      clips = clipsFor(id, id, targetRest, model);
      // THE BEFORE COLUMN, built here: the same donor clip through the same
      // retarget and the same trim window, with the grounding withheld.
      const gender = genderFor(id, id);
      const aid = CLIP_IDS.defeat[gender];
      const d = donorRaw[aid];
      if (d) {
        let raw = retargetClip(d.clip, d.rest, targetRest);
        const beat = CLIP_BEATS[aid];
        if (beat?.trim) raw = trimLike(raw, beat.trim[0], beat.trim[1]);
        clips.defeat_pre = raw;
      }
      offsets = groundOffsets(model, clips, { restore: targetRest });
      res({ H:+H.toFixed(4), gender, bindHips:+bindHips.toFixed(4),
            roles:Object.keys(clips),
            durations:Object.fromEntries(Object.entries(clips).map(([k,c])=>[k,+c.duration.toFixed(3)])),
            offsets:Object.fromEntries(Object.entries(offsets).map(([k,v])=>[k,+v.toFixed(4)])),
            floorSit: clips.defeat?.userData?.floorSit ?? null,
            tracks:Object.fromEntries(Object.entries(clips).map(([k,c])=>[k,c.tracks.length])) });
    } catch (e) { rej(String(e && e.stack || e)); }
  }, undefined, e => rej(String(e)));
});

// Build a tuning variant of the defeat clip under an explicit hipFrac/slide.
window.__variant = (key, hipFrac, slide) => {
  const gender = genderFor(window.__id, window.__id);
  const aid = CLIP_IDS.defeat[gender];
  const d = donorRaw[aid];
  if (!d) return null;
  let raw = retargetClip(d.clip, d.rest, targetRest);
  const beat = CLIP_BEATS[aid];
  if (beat?.trim) raw = trimLike(raw, beat.trim[0], beat.trim[1]);
  const c = fitFloorSit(raw, targetRest, model, { hipFrac, slide });
  clips[key] = c;
  offsets[key] = groundOffsets(model, { [key]: c }, { restore: targetRest })[key] ?? 0;
  return { duration:+c.duration.toFixed(3), offset:+offsets[key].toFixed(4), floorSit: c.userData?.floorSit ?? null };
};

function resetRest() {
  model.traverse(o => { const r = targetRest.get(o.name); if (r) { o.quaternion.copy(r.q); o.position.copy(r.p); } });
  group.updateMatrixWorld(true);
}

window.__pose = (role, t) => {
  if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(model); mixer = null; }
  resetRest();
  inner.position.y = 0;
  const clip = clips[role]; if (!clip) return false;
  mixer = new THREE.AnimationMixer(model);
  const a = mixer.clipAction(clip);
  // LoopOnce + clamp, and a hair short of the end. The default LoopRepeat wraps
  // setTime(duration) back to frame 0, so a sweep that asks for the last frame
  // silently reports the FIRST one — which on a collapse clip is the character
  // standing up, i.e. exactly the reading this tool exists to take.
  a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.play();
  mixer.setTime(Math.min(t, Math.max(0, clip.duration - 1e-4)));
  inner.position.y = -(offsets[role] ?? 0);
  group.updateMatrixWorld(true);
  return true;
};

// WHOLE-MESH floor, not the sole-candidate floor. groundOffset() only ever looks
// at vertices in the bottom 12% of the BIND bbox — the feet — so a pelvis driven
// under the stage is invisible to it by construction. That is exactly what this
// change can get wrong, so it is what this reads.
window.__floor = () => {
  let min = Infinity; const v = new THREE.Vector3();
  for (const m of skinned) { m.updateMatrixWorld(true);
    const p = m.geometry.attributes.position;
    for (let i=0;i<p.count;i++){ v.fromBufferAttribute(p,i); m.applyBoneTransform(i,v); m.localToWorld(v); if (v.y<min) min=v.y; } }
  return +min.toFixed(4);
};

// The lowest vertex, with the bone it is mostly weighted to — so "it penetrates"
// becomes "the LEFT BUTTOCK penetrates" and the fix is aimed at the right thing.
window.__lowest = () => {
  let min = Infinity, best = null;
  const v = new THREE.Vector3();
  for (const m of skinned) { m.updateMatrixWorld(true);
    const p = m.geometry.attributes.position;
    const sk = m.skeleton;
    for (let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i); m.applyBoneTransform(i,v); m.localToWorld(v);
      if (v.y < min) {
        min = v.y;
        let bone = null;
        if (m.geometry.attributes.skinIndex && m.geometry.attributes.skinWeight) {
          let bi = 0, bw = -1;
          for (let k=0;k<4;k++){
            const w = m.geometry.attributes.skinWeight.getComponent(i,k);
            if (w > bw) { bw = w; bi = m.geometry.attributes.skinIndex.getComponent(i,k); }
          }
          bone = sk?.bones?.[bi]?.name ?? null;
        }
        best = { y:+v.y.toFixed(4), x:+v.x.toFixed(3), z:+v.z.toFixed(3), bone };
      }
    }
  }
  return best;
};

window.__offset = (role) => (offsets[role] == null ? null : +offsets[role].toFixed(4));

const wy = (n) => bones[n] ? +bones[n].getWorldPosition(new THREE.Vector3()).y.toFixed(4) : null;
window.__read = () => ({
  hips: wy('Hips'), kneeL: wy('LeftLeg'), kneeR: wy('RightLeg'),
  footL: wy('LeftFoot'), footR: wy('RightFoot'),
  toeL: wy('LeftToeBase'), toeR: wy('RightToeBase'),
  head: wy('head_end'), floor: window.__floor(),
});

window.__sweep = (role, n) => {
  const dur = clips[role]?.duration || 0;
  const rows = [];
  for (let s = 0; s < n; s++) {
    const t = n === 1 ? 0 : dur * s / (n - 1);
    if (!window.__pose(role, t)) return rows;
    rows.push({ t: +t.toFixed(3), ...window.__read() });
  }
  return rows;
};

// THE PROFILE AXIS, derived per character from the BIND HIP LINE
// (RightUpLeg - LeftUpLeg). A camera standing on that line looks straight down
// the shoulders and sees a true profile — which is the only view that answers
// "is the pelvis on the floor". Derived, never assumed: a "side view" that is
// really a front view cannot show what this sheet exists to show, and the gaze
// vector is the wrong axis to derive it from on a clip whose last act is a
// look-back.
let profile = 0;
window.__facing = () => {
  const l = bones.LeftUpLeg, r = bones.RightUpLeg;
  if (!l || !r) { profile = 0; return 0; }
  const a = l.getWorldPosition(new THREE.Vector3()), b = r.getWorldPosition(new THREE.Vector3());
  const d = b.sub(a); d.y = 0;
  profile = d.lengthSq() > 1e-9 ? Math.atan2(d.x, d.z) : 0;
  return +profile.toFixed(4);
};
// Offsets from that axis, calibrated by looking: atan2(hipLine) + 0 puts the
// camera behind the character on every one of these sculpts, so front is +PI and
// a true profile is +PI/2.
const OFFSETS = { side: Math.PI/2, front: Math.PI, tq: Math.PI*0.72 };
window.__shot = (angle) => {
  // Framed on the FLOOR, not on the head: the whole question is where the body
  // is relative to y=0, so the floor line must be in every tile at the same
  // place whatever the pose does.
  const d = H * 2.6, a = profile + (OFFSETS[angle] ?? 0);
  camera.position.set(Math.sin(a)*d, H*0.42, Math.cos(a)*d);
  camera.lookAt(0, H*0.34, 0);
  renderer.render(scene, camera);
};
window.__ready = true;
</script></body></html>`;

const ROOTS = { '/node_modules/': join(REPO, 'node_modules'), '/src/': join(REPO, 'src'), '/meshy/': join(REPO, 'public/meshy') };
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
page.on('pageerror', e => console.log('[page error]', String(e).slice(0, 500)));
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)); });
await page.goto(`http://localhost:${port}/harness.html`);
await page.waitForFunction(() => window.__ready === true, { timeout: 60000 });
await page.evaluate(i => window.__initClips(i), IDS);

const report = [];
for (const id of IDS) {
  let info;
  try {
    info = await page.evaluate(i => { window.__id = i; return window.__load(i); }, id);
    await page.evaluate(() => window.__facing());
  }
  catch (e) { console.log(`FAIL ${id}: ${String(e).slice(0, 400)}`); continue; }

  const roles = ['defeat_pre', 'defeat'];
  for (let vi = 0; vi < VARIANTS.length; vi++) {
    const v = VARIANTS[vi];
    const key = `v${vi}`;
    await page.evaluate(([k, f, s]) => window.__variant(k, f, s), [key, v.hipFrac, v.slide]);
    roles.push(key);
  }

  const rec = { id, H: info.H, gender: info.gender, bindHips: info.bindHips, floorSit: info.floorSit, roles: {} };
  for (const role of roles) {
    const rows = await page.evaluate(([r, n]) => window.__sweep(r, n), [role, 13]);
    if (!rows.length) continue;
    const last = rows[rows.length - 1];
    rec.roles[role] = {
      settleHips: last.hips, settleHipsPctH: +(100 * last.hips / info.H).toFixed(1),
      settleFootL: last.footL, settleFootR: last.footR,
      settleKneeL: last.kneeL, settleHead: last.head,
      settleFloor: last.floor,
      offset: await page.evaluate(r => window.__offset(r), role),
      lowest: await page.evaluate(([r, t]) => { window.__pose(r, t); return window.__lowest(); }, [role, last.t]),
      floorLo: +Math.min(...rows.map(r2 => r2.floor)).toFixed(4),
      floorHi: +Math.max(...rows.map(r2 => r2.floor)).toFixed(4),
      hipsTop: +Math.max(...rows.map(r2 => r2.hips)).toFixed(4),
      rows,
    };
  }
  report.push(rec);

  const R = rec.roles;
  console.log(`\n=== ${id}  (${info.gender})  height ${info.H.toFixed(3)}m  bind hips ${info.bindHips.toFixed(3)}m`);
  console.log('role         settle hips   %H     kneeL    footL    footR    head     floor@settle  floor band');
  for (const role of roles) {
    const r = R[role]; if (!r) continue;
    console.log(`${role.padEnd(12)} ${String(r.settleHips).padStart(8)}m ${String(r.settleHipsPctH).padStart(6)}% ${String(r.settleKneeL).padStart(8)} ${String(r.settleFootL).padStart(8)} ${String(r.settleFootR).padStart(8)} ${String(r.settleHead).padStart(8)} ${String(r.settleFloor).padStart(11)}   ${r.floorLo}..${r.floorHi}   off ${r.offset}  lowest ${r.lowest?.bone} y${r.lowest?.y}`);
  }
  if (rec.floorSit) console.log(`floorSit: hips ${rec.floorSit.hipsFrom} -> ${rec.floorSit.hipsTo} (drop ${rec.floorSit.drop}, frac ${rec.floorSit.frac}, slide ${rec.floorSit.slide})`);
  for (const role of roles) {
    const r = R[role]; if (!r) continue;
    console.log(`  hips curve ${role.padEnd(11)} ` + r.rows.map(x => x.hips.toFixed(2)).join(' '));
    console.log(`  floor curve ${role.padEnd(10)} ` + r.rows.map(x => x.floor.toFixed(3)).join(' '));
  }

  // ── stills. Side view is the judgement view; the 3/4 is the sanity check
  // that the legs did not solve into a splay only the side hides.
  const MARKS = [0, 0.35, 0.6, 0.8, 1.0];
  for (const angle of ['side', 'tq']) {
    const rowLabels = [];
    for (const role of roles) {
      const r = R[role]; if (!r) continue;
      const dur = r.rows[r.rows.length - 1].t;
      const tiles = [];
      for (const k of MARKS) {
        await page.evaluate(([ro, t]) => window.__pose(ro, t), [role, +(dur * k).toFixed(3)]);
        await page.evaluate(a => window.__shot(a), angle);
        tiles.push((await page.locator('canvas').screenshot()).toString('base64'));
      }
      rowLabels.push({ id: role === 'defeat_pre' ? 'BEFORE' : role === 'defeat' ? 'AFTER (ship)' : role,
        pass: role !== 'defeat_pre',
        lines: [`hips ${r.settleHips}m = ${r.settleHipsPctH}% H`, `feet ${r.settleFootL}/${r.settleFootR}`, `floor ${r.settleFloor}`],
        tiles });
    }
    await stitch(`DEFEAT GROUNDING — ${id} (${info.gender}) — ${angle} view, floor line at y=0`,
      MARKS.map(k => `t=${Math.round(k * 100)}%`), rowLabels, join(OUT, `${id}-floor-${angle}.png`), TILE);
  }
}

writeFileSync(join(OUT, 'hips.json'), JSON.stringify(report, null, 2));
console.log('\n-> ' + join(OUT, 'hips.json'));
await browser.close(); server.close();

async function stitch(title, cols, rowLabels, dest, tile) {
  const png = await page.evaluate(async ([tile, title, cols, rowLabels]) => {
    const HDR = 54, LBL = 230;
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
  }, [tile, title, cols, rowLabels]);
  writeFileSync(dest, Buffer.from(png.split(',')[1], 'base64'));
  console.log('[sheet] ' + dest);
}
