// THROWAWAY DIAGNOSTIC — rest-pose (bind pose) skeleton dump for the Meshy cast.
//
// Reads the glTF JSON chunk out of a GLB directly (no three.js needed: node TRS
// lives in the JSON, uncompressed, even for gltfpack -cc files) and reports, per
// character, the LOCAL rest rotation of every bone in the spine chain plus the
// derived world-space rest orientation of each spine bone.
//
// The question this answers: do all 33 Meshy auto-rigs share the same REST
// ORIENTATIONS, or only the same bone NAMES? If rest orientations differ, then
// applying andrew's local rotation tracks to another rig bends it.
//
//   node tools/_diag-restpose.mjs --ids=andrew,karen,intern,... [--dir=public/meshy]
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const DIR = args.dir
  ? (args.dir.match(/^[A-Za-z]:|^\//) ? args.dir : join(REPO, args.dir))
  : join(REPO, 'public/meshy');
const SUFFIX = args.suffix || '_idle.glb';

function readGLBJson(path) {
  const buf = readFileSync(path);
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
  let off = 12;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    if (type === 0x4e4f534a) return JSON.parse(buf.slice(off + 8, off + 8 + len).toString('utf8'));
    // glTF chunk lengths are already 4-byte aligned (padded) per spec.
    off += 8 + len;
    if (len === 0) break;
  }
  throw new Error('no JSON chunk');
}

// ---- tiny quaternion / matrix helpers (no deps) ----
const qMul = (a, b) => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
];
const qConj = q => [-q[0], -q[1], -q[2], q[3]];
const qNorm = q => { const l = Math.hypot(...q) || 1; return q.map(v => v / l); };
// angle in degrees between two orientations
function qAngleDeg(a, b) {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, d)) * 180 / Math.PI;
}
// rotate a vector by a quaternion
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
const vLen = v => Math.hypot(v[0], v[1], v[2]);
const angBetween = (a, b) => {
  const la = vLen(a), lb = vLen(b);
  if (!la || !lb) return 0;
  const d = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, d))) * 180 / Math.PI;
};

function buildSkeleton(gltf) {
  const nodes = gltf.nodes || [];
  const parent = new Map();
  nodes.forEach((n, i) => (n.children || []).forEach(c => parent.set(c, i)));
  const byName = new Map();
  nodes.forEach((n, i) => { if (n.name && !byName.has(n.name)) byName.set(n.name, i); });
  const local = i => {
    const n = nodes[i] || {};
    if (n.matrix) {
      // decompose column-major 4x4 -> t, r (ignore scale magnitude for rot)
      const m = n.matrix;
      const t = [m[12], m[13], m[14]];
      const sx = Math.hypot(m[0], m[1], m[2]) || 1;
      const sy = Math.hypot(m[4], m[5], m[6]) || 1;
      const sz = Math.hypot(m[8], m[9], m[10]) || 1;
      const r = [
        [m[0] / sx, m[4] / sy, m[8] / sz],
        [m[1] / sx, m[5] / sy, m[9] / sz],
        [m[2] / sx, m[6] / sy, m[10] / sz],
      ];
      const tr = r[0][0] + r[1][1] + r[2][2];
      let q;
      if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(r[2][1] - r[1][2]) / s, (r[0][2] - r[2][0]) / s, (r[1][0] - r[0][1]) / s, 0.25 * s]; }
      else if (r[0][0] > r[1][1] && r[0][0] > r[2][2]) { const s = Math.sqrt(1 + r[0][0] - r[1][1] - r[2][2]) * 2; q = [0.25 * s, (r[0][1] + r[1][0]) / s, (r[0][2] + r[2][0]) / s, (r[2][1] - r[1][2]) / s]; }
      else if (r[1][1] > r[2][2]) { const s = Math.sqrt(1 + r[1][1] - r[0][0] - r[2][2]) * 2; q = [(r[0][1] + r[1][0]) / s, 0.25 * s, (r[1][2] + r[2][1]) / s, (r[0][2] - r[2][0]) / s]; }
      else { const s = Math.sqrt(1 + r[2][2] - r[0][0] - r[1][1]) * 2; q = [(r[0][2] + r[2][0]) / s, (r[1][2] + r[2][1]) / s, 0.25 * s, (r[1][0] - r[0][1]) / s]; }
      return { t, q: qNorm(q), s: [sx, sy, sz] };
    }
    return {
      t: n.translation || [0, 0, 0],
      q: qNorm(n.rotation || [0, 0, 0, 1]),
      s: n.scale || [1, 1, 1],
    };
  };
  // world rest transform (rotation + position), walking up the parent chain
  const world = i => {
    const chain = [];
    let cur = i;
    while (cur !== undefined) { chain.unshift(cur); cur = parent.get(cur); }
    let q = [0, 0, 0, 1];
    let p = [0, 0, 0];
    let sc = [1, 1, 1];
    for (const c of chain) {
      const l = local(c);
      const tt = qRot(q, [l.t[0] * sc[0], l.t[1] * sc[1], l.t[2] * sc[2]]);
      p = [p[0] + tt[0], p[1] + tt[1], p[2] + tt[2]];
      q = qNorm(qMul(q, l.q));
      sc = [sc[0] * l.s[0], sc[1] * l.s[1], sc[2] * l.s[2]];
    }
    return { q, p };
  };
  return { nodes, byName, local, world, parent };
}

// Meshy 24-bone naming. VERIFIED hierarchy (andrew dump): the spine bones are
// named in DESCENDING order — Spine02 is the LOWEST, Spine the HIGHEST:
//   Hips -> Spine02 -> Spine01 -> Spine -> neck -> Head
const SPINE = ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head'];
const ARMS = ['LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'];
const LEGS = ['LeftUpLeg', 'LeftLeg', 'LeftFoot', 'RightUpLeg', 'RightLeg', 'RightFoot'];
const ALL = [...SPINE, ...ARMS, ...LEGS];

const ids = String(args.ids || '').split(',').filter(Boolean);
if (!ids.length) { console.error('need --ids'); process.exit(1); }

const out = {};
for (const id of ids) {
  const path = join(DIR, id + SUFFIX);
  if (!existsSync(path)) { out[id] = { error: 'missing ' + path }; continue; }
  let gltf;
  try { gltf = readGLBJson(path); } catch (e) { out[id] = { error: String(e) }; continue; }
  const sk = buildSkeleton(gltf);
  const rec = { boneNames: [], local: {}, worldQ: {}, worldP: {}, chainAngles: {}, missing: [] };
  // full bone list from the skin, if present
  const skin = (gltf.skins || [])[0];
  if (skin) rec.boneNames = skin.joints.map(j => sk.nodes[j]?.name).filter(Boolean);
  for (const b of ALL) {
    const i = sk.byName.get(b);
    if (i === undefined) { rec.missing.push(b); continue; }
    const l = sk.local(i);
    const w = sk.world(i);
    rec.local[b] = { q: l.q.map(v => +v.toFixed(6)), t: l.t.map(v => +v.toFixed(6)), s: l.s.map(v => +v.toFixed(4)) };
    rec.worldQ[b] = w.q.map(v => +v.toFixed(6));
    rec.worldP[b] = w.p.map(v => +v.toFixed(6));
  }
  // Rest-pose spine LEAN: the world-space vector from each spine bone to the next,
  // measured against straight-up. A big number here at rest = a banana bind pose.
  for (let i = 0; i < SPINE.length - 1; i++) {
    const a = rec.worldP[SPINE[i]], b = rec.worldP[SPINE[i + 1]];
    if (!a || !b) continue;
    const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    rec.chainAngles[`${SPINE[i]}->${SPINE[i + 1]}`] = {
      fromVertical: +angBetween(v, [0, 1, 0]).toFixed(2),
      // signed sagittal lean: +Z forward. positive = leaning forward (hunch),
      // negative = leaning back (sway-back).
      sagittalDeg: +(Math.atan2(v[2], v[1]) * 180 / Math.PI).toFixed(2),
      lenM: +vLen(v).toFixed(4),
    };
  }
  out[id] = rec;
}

// ---- comparison against a reference (default andrew, the clip donor) ----
const REF = args.ref || 'andrew';
const ref = out[REF];
const report = { dir: DIR, ref: REF, chars: {} };
for (const id of ids) {
  const r = out[id];
  if (!r || r.error) { report.chars[id] = { error: r?.error }; continue; }
  const entry = {
    boneCount: r.boneNames.length,
    boneNamesMatchRef: ref && !ref.error
      ? JSON.stringify(r.boneNames) === JSON.stringify(ref.boneNames) : null,
    missing: r.missing,
    spineRest: r.chainAngles,
    deltaVsRef: {},
  };
  if (ref && !ref.error && id !== REF) {
    for (const b of ALL) {
      if (!r.local[b] || !ref.local[b]) continue;
      entry.deltaVsRef[b] = {
        localRestDeg: +qAngleDeg(r.local[b].q, ref.local[b].q).toFixed(3),
        worldRestDeg: +qAngleDeg(r.worldQ[b], ref.worldQ[b]).toFixed(3),
      };
    }
  }
  report.chars[id] = entry;
}
console.log(JSON.stringify(report, null, 2));
