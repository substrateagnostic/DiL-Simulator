// THROWAWAY DIAGNOSTIC — what the SHARED clip does to each rig's skeleton.
//
// The shared reaction clips (public/meshy/clips/a*.glb) carry LOCAL rotation
// tracks for all 24 bones, authored on andrew's rig. This script applies those
// tracks to each character's own rest skeleton (exactly as THREE's
// AnimationMixer does — overwrite bone.quaternion by node name) and reports the
// resulting geometry:
//
//   • spine sagittal profile (world offsets of Spine02/Spine01/Spine/neck/Head
//     relative to Hips) — the S-curve metric
//   • lowest FOOT BONE world Y relative to the bind-pose lowest foot bone —
//     the hover/sink metric
//
// Everything is computed twice: on the character's REST pose (control) and on
// the clip-applied pose. If the clip-applied spine profile diverges only for
// the producer-flagged characters, H1 (retarget rest-pose mismatch) is proven.
//
//   node tools/_diag-clipbend.mjs --ids=a,b,c [--clip=a336] [--t=0]
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const DIR = join(REPO, args.dir || 'public/meshy');
const CLIP = args.clip || 'a336';
const TIMES = String(args.t || '0,2.0,5.0').split(',').map(Number);

function readGLB(path) {
  const buf = readFileSync(path);
  let off = 12, json = null, bin = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const body = buf.slice(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(body.toString('utf8'));
    else if (type === 0x004e4942) bin = body;
    off += 8 + len;
    if (len === 0) break;
  }
  return { json, bin };
}

const COMP = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const NCOMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function readAccessor(g, bin, idx) {
  const a = g.accessors[idx];
  const bv = g.bufferViews[a.bufferView];
  const [Ctor, sz] = COMP[a.componentType];
  const n = NCOMP[a.type];
  const start = (bv.byteOffset || 0) + (a.byteOffset || 0);
  const out = new Float32Array(a.count * n);
  const stride = bv.byteStride || n * sz;
  for (let i = 0; i < a.count; i++) {
    const base = start + i * stride;
    for (let c = 0; c < n; c++) {
      const o = base + c * sz;
      let v;
      switch (a.componentType) {
        case 5126: v = bin.readFloatLE(o); break;
        case 5123: v = bin.readUInt16LE(o); break;
        case 5122: v = bin.readInt16LE(o); break;
        case 5121: v = bin.readUInt8(o); break;
        case 5120: v = bin.readInt8(o); break;
        case 5125: v = bin.readUInt32LE(o); break;
      }
      out[i * n + c] = v;
    }
  }
  return out;
}

// ---- quaternion / vector helpers ----
const qMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qNorm = q => { const l = Math.hypot(...q) || 1; return q.map(v => v / l); };
function qRot(q, v) {
  const [x, y, z, w] = q;
  const ix = w * v[0] + y * v[2] - z * v[1];
  const iy = w * v[1] + z * v[0] - x * v[2];
  const iz = w * v[2] + x * v[1] - y * v[0];
  const iw = -x * v[0] - y * v[1] - z * v[2];
  return [
    ix * w + iw * -x + iy * -z - iz * -y,
    iy * w + iw * -y + iz * -x - ix * -z,
    iz * w + iw * -z + ix * -y - iy * -x,
  ];
}
function slerp(a, b, t) {
  let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let bb = b;
  if (d < 0) { bb = b.map(v => -v); d = -d; }
  if (d > 0.9995) return qNorm(a.map((v, i) => v + (bb[i] - v) * t));
  const th = Math.acos(d), s = Math.sin(th);
  const w1 = Math.sin((1 - t) * th) / s, w2 = Math.sin(t * th) / s;
  return qNorm(a.map((v, i) => v * w1 + bb[i] * w2));
}

// ---- clip sampling ----
const clipPath = join(DIR, 'clips', CLIP + '.glb');
const { json: cg, bin: cbin } = readGLB(clipPath);
const clipAnim = cg.animations[0];
const clipTracks = new Map(); // boneName -> { path, times, values }
for (const ch of clipAnim.channels) {
  const s = clipAnim.samplers[ch.sampler];
  const name = cg.nodes[ch.target.node]?.name;
  if (!name) continue;
  const times = readAccessor(cg, cbin, s.input);
  const values = readAccessor(cg, cbin, s.output);
  clipTracks.set(name + '|' + ch.target.path, { times, values, n: ch.target.path === 'rotation' ? 4 : 3 });
}
function sample(name, path, t) {
  const tr = clipTracks.get(name + '|' + path);
  if (!tr) return null;
  const { times, values, n } = tr;
  let i = 0;
  while (i < times.length - 1 && times[i + 1] < t) i++;
  const j = Math.min(i + 1, times.length - 1);
  const span = times[j] - times[i];
  const f = span > 0 ? (t - times[i]) / span : 0;
  const a = Array.from(values.slice(i * n, i * n + n));
  const b = Array.from(values.slice(j * n, j * n + n));
  if (n === 4) return slerp(qNorm(a), qNorm(b), Math.max(0, Math.min(1, f)));
  return a.map((v, k) => v + (b[k] - v) * Math.max(0, Math.min(1, f)));
}

// ---- DONOR REST POSE, straight out of the clip GLB's own armature ----
// The stripped clip keeps the donor's node hierarchy, so its rest TRS IS the
// rig the tracks were authored against. That is what a retarget needs.
const donorRest = new Map();  // boneName -> { q, t }
for (const n of cg.nodes || []) {
  if (!n.name) continue;
  donorRest.set(n.name, { q: qNorm(n.rotation || [0, 0, 0, 1]), t: (n.translation || [0, 0, 0]).slice() });
}
const qInv = q => { const l = q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2 || 1; return [-q[0] / l, -q[1] / l, -q[2] / l, q[3] / l]; };

// ---- character skeleton ----
const SPINE = ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head'];
const FEET = ['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot'];

function loadRig(id) {
  const p = join(DIR, id + '_idle.glb');
  if (!existsSync(p)) return null;
  const { json: g } = readGLB(p);
  const nodes = g.nodes;
  const parent = new Map();
  nodes.forEach((n, i) => (n.children || []).forEach(c => parent.set(c, i)));
  const byName = new Map();
  nodes.forEach((n, i) => { if (n.name && !byName.has(n.name)) byName.set(n.name, i); });
  return { g, nodes, parent, byName };
}

// Walk the rig and return world positions, optionally overriding local rotations
// with the clip's values (exactly what AnimationMixer does: bind-by-name,
// overwrite bone.quaternion).
function pose(rig, { applyClip = false, t = 0, retarget = false } = {}) {
  const { nodes, parent, byName } = rig;
  const world = new Map(); // nodeIndex -> { q, p, s }
  const localOf = (i) => {
    const n = nodes[i] || {};
    const restQ = qNorm(n.rotation || [0, 0, 0, 1]);
    const restT = (n.translation || [0, 0, 0]).slice();
    let q = restQ;
    let tr = restT.slice();
    const s = n.scale || [1, 1, 1];
    if (applyClip && n.name) {
      const cq = sample(n.name, 'rotation', t);
      const dr = donorRest.get(n.name);
      if (cq) {
        // NAIVE (what ships today): overwrite the target's local rotation with
        // the donor's. Correct only if both rigs share a rest orientation.
        // RETARGET: target_local = target_rest * inverse(donor_rest) * donor_local
        q = retarget && dr ? qNorm(qMul(restQ, qMul(qInv(dr.q), cq))) : cq;
      }
      const ct = sample(n.name, 'translation', t);
      // MeshyClips ships a Hips translation track; the mixer applies it in the
      // node's own units. Naive = the donor's ABSOLUTE hip height. Retarget =
      // the target's own rest hips plus the donor's DELTA, height-scaled.
      if (ct) {
        if (retarget && dr) {
          const k = (dr.t[1] || 1) === 0 ? 1 : (restT[1] / dr.t[1]);
          tr = [restT[0] + (ct[0] - dr.t[0]) * k, restT[1] + (ct[1] - dr.t[1]) * k, restT[2] + (ct[2] - dr.t[2]) * k];
        } else tr = ct.slice();
      }
    }
    return { q, t: tr, s };
  };
  const resolve = (i) => {
    if (world.has(i)) return world.get(i);
    const par = parent.get(i);
    const P = par === undefined ? { q: [0, 0, 0, 1], p: [0, 0, 0], s: [1, 1, 1] } : resolve(par);
    const l = localOf(i);
    const tt = qRot(P.q, [l.t[0] * P.s[0], l.t[1] * P.s[1], l.t[2] * P.s[2]]);
    const out = {
      q: qNorm(qMul(P.q, l.q)),
      p: [P.p[0] + tt[0], P.p[1] + tt[1], P.p[2] + tt[2]],
      s: [P.s[0] * l.s[0], P.s[1] * l.s[1], P.s[2] * l.s[2]],
    };
    world.set(i, out);
    return out;
  };
  nodes.forEach((_, i) => resolve(i));
  const out = {};
  for (const [name, i] of byName) out[name] = world.get(i);
  return out;
}

const ids = String(args.ids || '').split(',').filter(Boolean);
const AFFECTED = new Set(['alex_it', 'cfos_assistant', 'chad', 'chief_of_restructuring', 'client_m_athletic',
  'client_m_heavy', 'compliance', 'corporate_lawyer', 'data_analytics_lead', 'diane', 'firm_paralegal',
  'intern', 'isaiah', 'networking_guy', 'regional', 'regional_director', 'restructuring_analyst', 'skip_boss']);

const rows = [];
for (const id of ids) {
  const rig = loadRig(id);
  if (!rig) { rows.push({ id, error: 'missing' }); continue; }
  const rest = pose(rig, { applyClip: false });
  const H = rest.Hips;
  // model height in metres: Armature scale 0.01 is already folded into world
  const hipsY = H.p[1];
  const rec = { id, flagged: AFFECTED.has(id), hipsY: +hipsY.toFixed(4), frames: {} };
  // rest sagittal profile (control)
  const prof = (P) => SPINE.slice(1).map(b => {
    const v = [P[b].p[0] - P.Hips.p[0], P[b].p[1] - P.Hips.p[1], P[b].p[2] - P.Hips.p[2]];
    return { b, dz: +v[2].toFixed(4), dy: +v[1].toFixed(4) };
  });
  rec.restProfile = prof(rest);
  const restFootY = Math.min(...FEET.map(f => rest[f]?.p[1] ?? Infinity));
  rec.restFootY = +restFootY.toFixed(4);
  for (const t of TIMES) {
    const P = pose(rig, { applyClip: true, t, retarget: !!args.retarget });
    const footY = Math.min(...FEET.map(f => P[f]?.p[1] ?? Infinity));
    // SPINE-BASE HORIZONTAL THROW: how far the lower spine (Spine02) sits
    // BEHIND (-z) or in front of the hips, in metres and as % of body height.
    const sp = P.Spine02;
    const throwZ = sp.p[2] - P.Hips.p[2];
    const throwX = sp.p[0] - P.Hips.p[0];
    const rise = sp.p[1] - P.Hips.p[1];
    // Angle of the hips->Spine02 segment from vertical. Rest is ~0-6deg for
    // everyone; anything large here IS the banana.
    const seg = [throwX, rise, throwZ];
    const lenS = Math.hypot(...seg);
    const fromVert = Math.acos(Math.max(-1, Math.min(1, rise / (lenS || 1)))) * 180 / Math.PI;
    rec.frames['t' + t] = {
      spineBaseFromVerticalDeg: +fromVert.toFixed(2),
      spineBaseThrowZ_m: +throwZ.toFixed(4),
      headDz_m: +(P.Head.p[2] - P.Hips.p[2]).toFixed(4),
      footY_m: +footY.toFixed(4),
      footYvsRest_m: +(footY - restFootY).toFixed(4),
      profile: prof(P),
    };
  }
  rows.push(rec);
}

// compact table
console.log(`CLIP ${CLIP} applied to each rig (dir=${DIR})`);
console.log('flag id                  restBaseTilt  ' + TIMES.map(t => `t=${t}: baseTilt throwZ  footDY`).join(' | '));
for (const r of rows) {
  if (r.error) { console.log(r.id, r.error); continue; }
  const restTilt = (() => {
    const p = r.restProfile[0];
    return Math.atan2(Math.hypot(p.dz), p.dy) * 180 / Math.PI;
  })();
  const cells = TIMES.map(t => {
    const f = r.frames['t' + t];
    return `${String(f.spineBaseFromVerticalDeg).padStart(7)}° ${String(f.spineBaseThrowZ_m).padStart(7)}m ${String(f.footYvsRest_m).padStart(7)}m`;
  }).join(' | ');
  console.log((r.flagged ? '*' : ' ') + ' ' + r.id.padEnd(20) + String(restTilt.toFixed(2)).padStart(6) + '°   ' + cells);
}
if (args.json) console.log(JSON.stringify(rows, null, 2));
