// FLOOR-SIT GROUNDING — the fix for "they're sitting on an invisible chair".
//
// The defeat pair (a58 "Step to Sit Transition", a359 "Look Back and Sit") are
// CHAIR sits. The performer settles onto furniture that does not exist on this
// stage: measured on the real bodies through the shipping clipsFor(), the settled
// Hips park at 36.7% (chad), 33.1% (karen) and 32.6% (client_m_heavy) of
// CHARACTER HEIGHT, with both feet still flat on the floor. The B23 sweep's
// silhouette-descent metric could not see it — "down at the last frame" is true
// of a chair sit — and the clips' own catalog row says so in the numbers nobody
// re-read: heightRatio_last 0.9167 for a58 and 0.7539 for a359, against 0.2471
// for an actual body on the ground.
//
// Nor could the trim table have fixed it: both clips' TRUE final frame is a
// loop-closing STANDING frame (a58 hips 0.405 -> 0.641 of standing height in one
// key, a359 0.331 -> 0.595), so the shipped windows already stop at the lowest
// pose the performance ever reaches. There is nothing further down to keep.
//
// WHAT THIS DOES. Over the clip's own descent curve, it keeps sinking the pelvis
// past where the chair would have been, down to a real floor height, and
// re-solves both legs so the ANKLES DO NOT MOVE. A chair sit translated straight
// down puts the shins through the floor — the shins are near-vertical and the
// feet are already planted, so every centimetre the hips lose, the feet lose too.
// Two-bone IK spends that distance in the knee instead: the knee rises, the shin
// lays back, and the result is a knees-up floor slump with the soles exactly
// where the original clip (and therefore `groundOffsets`) already put them.
//
// WHY IT RIDES THE CLIP'S OWN CURVE. The extra drop is proportional to how far
// the authored performance has already sunk (a running-minimum normalisation of
// the hips height), so it is 0 for every standing frame and full at the settle,
// on both clips, without either one's descent window being typed into this file.
// A future defeat clip with a different descent shape needs no new constant.
//
// SAFE BY CONSTRUCTION. Every degenerate case returns the clip untouched: a
// missing bone, a clip that does not descend, a settle already at floor height,
// an unreachable IK target. The role is opt-in from MeshyClips (defeat only), so
// nothing else in the cast can be reshaped by it.
import * as THREE from 'three';
import { groundOffset } from './MeshyRetarget.js';

// The settled pelvis height the solve AIMS at, as a fraction of this character's
// own bind hip height. An adult sitting on the ground carries the hip joint
// centre about a pelvis-thickness off the floor. This is a floor, not a target:
// fitFloorSit() only ever raises it, and only when the mesh says it has to.
export const SIT_HIP_FRAC = 0.10;

// The ceiling on that raise. 0.32 of bind hip height is still well under the
// 31–35% of BODY height the chair sit shipped at, so no amount of probing can
// walk the fix back to the defect.
const MAX_HIP_FRAC = 0.32;
// How far any part of the body may end up under the stage. Same number as the
// cast-wide floor-penetration rule.
const FLOOR_TOL = 0.01;
const FIT_ITERATIONS = 4;
const PROBE_KEY = '_meshyBodyProbe';
const PROBE_SAMPLES = 1400;

// How far the ankles are allowed to slide AWAY from the hips as the pelvis
// drops, as a fraction of the drop. 0 pins the feet exactly where the authored
// clip planted them and spends the whole drop in knee flexion (knees up under
// the chin). A positive value lets the legs extend, which lowers the knee and
// keeps a heavy build's thigh out of its own belly. Horizontal only — the ankle
// HEIGHT is always pinned, which is what keeps the soles on the floor.
export const ANKLE_SLIDE = 0.55;

// Below this the clip is not a descent and grounding would be inventing motion.
const MIN_DESCENT_FRAC = 0.05;
// Two-bone IK cannot reach further than this fraction of the fully-extended leg;
// stopping short keeps a visible bend in the knee instead of a locked stick.
const MAX_REACH = 0.985;

const LEGS = [
  { hip: 'LeftUpLeg', knee: 'LeftLeg', ankle: 'LeftFoot' },
  { hip: 'RightUpLeg', knee: 'RightLeg', ankle: 'RightFoot' },
];

// ── rest-pose forward kinematics ────────────────────────────────────────────
// captureRest() stores local { q, p, parent } and no scale, which is the same
// information the retargeter works from. Everything below therefore lives in
// "rest-FK space": if an ancestor carries a uniform scale the absolute lengths
// are off by that factor, but the target height is derived in the same space and
// the delta is written back into the same space, so nothing mixes units.
function chainOf(rest, name) {
  const chain = [];
  let n = name;
  const seen = new Set();
  while (n && rest.has(n) && !seen.has(n)) {
    seen.add(n);
    chain.push(n);
    n = rest.get(n).parent;
  }
  return chain.reverse();
}

function trackMap(clip) {
  const out = new Map();
  for (const track of clip.tracks) {
    const i = track.name.lastIndexOf('.');
    if (i < 0) continue;
    out.set(track.name.slice(0, i) + '|' + track.name.slice(i + 1), track);
  }
  return out;
}

function unionTimes(tracks) {
  const all = [];
  for (const t of tracks) if (t) for (const time of t.times) all.push(time);
  all.sort((a, b) => a - b);
  const times = [];
  for (const t of all) if (!times.length || t - times[times.length - 1] > 1e-6) times.push(t);
  return times;
}

export function floorSit(clip, targetRest, opts = {}) {
  if (!clip?.tracks?.length || !targetRest?.size) return clip;
  const hipFrac = opts.hipFrac ?? SIT_HIP_FRAC;
  const slide = opts.slide ?? ANKLE_SLIDE;
  for (const leg of LEGS) {
    for (const b of Object.values(leg)) if (!targetRest.has(b)) return clip;
  }
  if (!targetRest.has('Hips')) return clip;

  const tracks = trackMap(clip);
  const hipsPos = tracks.get('Hips|position');
  if (!hipsPos) return clip;

  // The bones whose curves this solve READS. Everything else rides along.
  const read = ['Hips'];
  for (const leg of LEGS) read.push(leg.hip, leg.knee, leg.ankle);
  const quat = new Map();
  for (const name of read) quat.set(name, tracks.get(name + '|quaternion') || null);

  const times = unionTimes([hipsPos, ...quat.values()]);
  if (times.length < 2) return clip;

  // Interpolants let the solve sample every read curve on ONE timeline even when
  // the source tracks disagree about their keyframe times.
  const qi = new Map();
  for (const [name, track] of quat) qi.set(name, track ? track.createInterpolant() : null);
  const pi = hipsPos.createInterpolant();

  // Static part of the chain above Hips: its world rotation and position never
  // change, so it is solved once.
  const above = chainOf(targetRest, 'Hips').slice(0, -1);
  const rootQ = new THREE.Quaternion();
  const rootP = new THREE.Vector3();
  {
    const v = new THREE.Vector3();
    for (const name of above) {
      const r = targetRest.get(name);
      rootP.add(v.copy(r.p).applyQuaternion(rootQ));
      rootQ.multiply(r.q);
    }
  }

  const scratch = {
    q: new THREE.Quaternion(), q2: new THREE.Quaternion(),
    v: new THREE.Vector3(), v2: new THREE.Vector3(),
  };

  // Pose one frame: world quaternion + position for every bone the solve needs.
  function pose(time) {
    const out = { q: new Map(), p: new Map() };
    const hq = new THREE.Quaternion();
    const hp = new THREE.Vector3();
    const local = targetRest.get('Hips');
    const t = qi.get('Hips');
    if (t) hq.fromArray(t.evaluate(time)); else hq.copy(local.q);
    hp.fromArray(pi.evaluate(time));
    const world = new THREE.Vector3().copy(hp).applyQuaternion(rootQ).add(rootP);
    const worldQ = new THREE.Quaternion().copy(rootQ).multiply(hq);
    out.q.set('Hips', worldQ); out.p.set('Hips', world);
    for (const leg of LEGS) {
      let pq = worldQ, pp = world;
      for (const bone of [leg.hip, leg.knee, leg.ankle]) {
        const r = targetRest.get(bone);
        const tr = qi.get(bone);
        const lq = new THREE.Quaternion();
        if (tr) lq.fromArray(tr.evaluate(time)); else lq.copy(r.q);
        const wp = new THREE.Vector3().copy(r.p).applyQuaternion(pq).add(pp);
        const wq = new THREE.Quaternion().copy(pq).multiply(lq);
        out.q.set(bone, wq); out.p.set(bone, wp);
        pq = wq; pp = wp;
      }
    }
    return out;
  }

  // ── the descent curve, read off the clip itself ──────────────────────────
  const frames = times.map(pose);
  const hipsY = frames.map(f => f.p.get('Hips').y);
  const top = Math.max(...hipsY);
  const settled = hipsY[hipsY.length - 1];
  if (!(top > 0) || top - settled < MIN_DESCENT_FRAC * top) return clip;

  // Bind hip height in the same space, so the target travels across the cast.
  const bindHips = (() => {
    const q = new THREE.Quaternion(), p = new THREE.Vector3(), v = new THREE.Vector3();
    for (const name of chainOf(targetRest, 'Hips')) {
      const r = targetRest.get(name);
      p.add(v.copy(r.p).applyQuaternion(q));
      q.multiply(r.q);
    }
    return p.y;
  })();
  const targetY = hipFrac * bindHips;
  const drop = settled - targetY;
  if (!(drop > 0.001)) return clip;   // already on the floor: nothing to fix

  // Running minimum makes the progress monotone, so a standing frame that
  // wobbles a centimetre cannot start the sink early or walk it backwards.
  const progress = [];
  let runMin = top;
  for (const y of hipsY) {
    runMin = Math.min(runMin, y);
    progress.push(Math.min(1, Math.max(0, (top - runMin) / (top - settled))));
  }

  // ── solve ────────────────────────────────────────────────────────────────
  const outHips = new Float32Array(times.length * 3);
  const outQ = new Map();
  for (const leg of LEGS) for (const b of [leg.hip, leg.knee, leg.ankle]) outQ.set(b, new Float32Array(times.length * 4));
  const rootQInv = new THREE.Quaternion().copy(rootQ).invert();

  for (let i = 0; i < times.length; i++) {
    const time = times[i];
    const f = frames[i];
    const d = progress[i] * drop;

    // Hips: the pelvis loses `d` of WORLD height. The delta is rotated into the
    // parent's frame before it touches the local track, so an Armature carrying
    // a rotation (the glTF Y-up convention leaves them everywhere) cannot turn a
    // sink into a sideways slide.
    const hipLocal = new THREE.Vector3().fromArray(pi.evaluate(time));
    hipLocal.add(scratch.v.set(0, -d, 0).applyQuaternion(rootQInv));
    hipLocal.toArray(outHips, i * 3);

    const hipsWorld = new THREE.Vector3().copy(f.p.get('Hips')).add(scratch.v2.set(0, -d, 0));

    for (const leg of LEGS) {
      const P0 = f.p.get(leg.hip), P1 = f.p.get(leg.knee), P2 = f.p.get(leg.ankle);
      // The leg root rides the pelvis rigidly — same rotation, new height.
      const hip = new THREE.Vector3().copy(P0).sub(f.p.get('Hips')).add(hipsWorld);
      const L1 = P1.distanceTo(P0), L2 = P2.distanceTo(P1);

      // Ankle target: height pinned exactly (this is what keeps the soles on the
      // floor and the measured floor band unchanged), horizontal allowed to
      // creep away from the hips so the knee is not forced under the chin.
      const target = new THREE.Vector3().copy(P2);
      if (slide > 0 && d > 0) {
        const away = new THREE.Vector3(P2.x - hip.x, 0, P2.z - hip.z);
        if (away.lengthSq() > 1e-8) target.add(away.normalize().multiplyScalar(slide * d));
      }

      const toTarget = new THREE.Vector3().subVectors(target, hip);
      let dist = toTarget.length();
      const reach = (L1 + L2) * MAX_REACH;
      if (!(dist > 1e-6) || !(L1 > 1e-6) || !(L2 > 1e-6)) { copyOriginal(leg, f, i); continue; }
      if (dist > reach) { toTarget.multiplyScalar(reach / dist); dist = reach; target.copy(hip).add(toTarget); }
      const floor = Math.abs(L1 - L2) + 1e-4;
      if (dist < floor) { toTarget.multiplyScalar(floor / dist); dist = floor; target.copy(hip).add(toTarget); }

      const n = new THREE.Vector3().copy(toTarget).divideScalar(dist);
      // THE BEND DIRECTION, and the one piece of this solve that has to be got
      // right twice. It is the knee's offset from the ORIGINAL hip->ankle line —
      // for a seated leg that is forward-and-UP, which is where a knee goes —
      // and it is then re-orthogonalised against the NEW line. Taking the raw
      // (knee - hip) vector and orthogonalising THAT against the new line looks
      // equivalent and is not: once the pelvis has dropped below the ankle the
      // new line tips the other way, the leftover perpendicular points DOWN, and
      // the knee solves through the floor (measured: chad kneeL -0.0866 m,
      // min sole -0.222 m).
      const nOrig = new THREE.Vector3().subVectors(P2, P0);
      const pole = new THREE.Vector3().subVectors(P1, P0);
      if (nOrig.lengthSq() > 1e-10) {
        nOrig.normalize();
        pole.addScaledVector(nOrig, -pole.dot(nOrig));
      }
      pole.addScaledVector(n, -pole.dot(n));
      if (pole.lengthSq() < 1e-8) {
        pole.set(0, 1, 0).addScaledVector(n, -n.y);
        if (pole.lengthSq() < 1e-8) pole.set(1, 0, 0);
      }
      pole.normalize();

      const a = Math.min(L1, Math.max(-L1, (dist * dist + L1 * L1 - L2 * L2) / (2 * dist)));
      const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
      const knee = new THREE.Vector3().copy(hip).addScaledVector(n, a).addScaledVector(pole, h);

      // World-space swing deltas, converted back to locals parent-before-child.
      const dq1 = swing(scratch, new THREE.Vector3().subVectors(P1, P0), new THREE.Vector3().subVectors(knee, hip));
      const w0 = new THREE.Quaternion().copy(dq1).multiply(f.q.get(leg.hip));
      const dq2 = swing(scratch, new THREE.Vector3().subVectors(P2, P1).applyQuaternion(dq1), new THREE.Vector3().subVectors(target, knee));
      const w1 = new THREE.Quaternion().copy(dq2).multiply(new THREE.Quaternion().copy(dq1).multiply(f.q.get(leg.knee)));
      // The foot KEEPS its authored world orientation, so a sole that was flat on
      // the floor is still flat on the floor after the leg has been re-solved.
      const w2 = f.q.get(leg.ankle);

      writeLocal(outQ.get(leg.hip), i, f.q.get('Hips'), w0);
      writeLocal(outQ.get(leg.knee), i, w0, w1);
      writeLocal(outQ.get(leg.ankle), i, w1, w2);
    }
  }

  function copyOriginal(leg, f, i) {
    writeLocal(outQ.get(leg.hip), i, f.q.get('Hips'), f.q.get(leg.hip));
    writeLocal(outQ.get(leg.knee), i, f.q.get(leg.hip), f.q.get(leg.knee));
    writeLocal(outQ.get(leg.ankle), i, f.q.get(leg.knee), f.q.get(leg.ankle));
  }

  const kept = clip.tracks.filter(t => {
    const i = t.name.lastIndexOf('.');
    const bone = t.name.slice(0, i), prop = t.name.slice(i + 1);
    if (bone === 'Hips' && prop === 'position') return false;
    return !(outQ.has(bone) && prop === 'quaternion');
  });
  const out = [...kept, new THREE.VectorKeyframeTrack('Hips.position', times.slice(), outHips)];
  for (const [bone, values] of outQ) out.push(new THREE.QuaternionKeyframeTrack(`${bone}.quaternion`, times.slice(), values));

  const result = new THREE.AnimationClip(clip.name, clip.duration, out, clip.blendMode);
  result.userData = {
    ...(clip.userData || {}),
    floorSit: {
      hipsFrom: +settled.toFixed(4), hipsTo: +targetY.toFixed(4),
      bindHips: +bindHips.toFixed(4), drop: +drop.toFixed(4),
      frac: hipFrac, slide,
    },
  };
  return result;
}

// ── THE FIT ─────────────────────────────────────────────────────────────────
// How far down is "on the floor" is a property of the BODY, not of the skeleton,
// and the difference between the cast's builds is large enough to matter: at one
// fixed pelvis height karen has 20 cm of daylight under her while client_m_heavy
// has 14 cm of thigh under the stage. So the drop is solved against the mesh —
// sink to a real floor-sit height, then raise only as far as the lowest vertex
// of the SETTLED pose demands.
//
// This is measured on the whole body on purpose. `groundOffset` samples only the
// bottom 12% of the bind bbox — the soles — which is correct for a standing
// clip and structurally blind to a pelvis driven under the stage. That blindness
// is exactly the failure mode this function exists to prevent.
//
// With no model it degrades to the un-probed solve at the aim height, which is a
// valid pose; every caller that HAS a body should pass it.
export function fitFloorSit(clip, targetRest, model, opts = {}) {
  const slide = opts.slide ?? ANKLE_SLIDE;
  if (!model) return floorSit(clip, targetRest, { hipFrac: opts.hipFrac ?? SIT_HIP_FRAC, slide });

  let candidates, bindHips;
  try {
    candidates = bodyCandidates(model);
    bindHips = hipsWorldY(model);
  } catch (_) { candidates = null; }
  if (!candidates?.length || !(bindHips > 0)) {
    return floorSit(clip, targetRest, { hipFrac: opts.hipFrac ?? SIT_HIP_FRAC, slide });
  }

  let frac = opts.hipFrac ?? SIT_HIP_FRAC;
  let best = null;
  let sole = null;
  const trace = [];
  try {
    for (let i = 0; i < FIT_ITERATIONS; i++) {
      const cand = floorSit(clip, targetRest, { hipFrac: frac, slide });
      if (cand === clip) return clip;             // the solve declined; nothing to fit
      // The soles are pinned by the solve, so the offset the engine will apply is
      // invariant across fracs and is read once.
      if (sole == null) sole = groundOffset(model, cand, { restore: false });
      const low = lowestAtEnd(model, cand, candidates) - sole;
      trace.push({ frac: +frac.toFixed(4), low: +low.toFixed(4) });
      best = cand;
      if (low >= -FLOOR_TOL || frac >= MAX_HIP_FRAC) break;
      frac = Math.min(MAX_HIP_FRAC, frac + (-low + FLOOR_TOL * 0.5) / bindHips);
    }
  } catch (_) {
    // Fitting is polish; a malformed mesh must never block a fight.
    if (!best) best = floorSit(clip, targetRest, { hipFrac: opts.hipFrac ?? SIT_HIP_FRAC, slide });
  } finally {
    try { restoreRest(model, targetRest); } catch (_) { /* keep the fight alive */ }
  }
  if (best?.userData?.floorSit) best.userData.floorSit.fit = trace;
  return best || clip;
}

function hipsWorldY(model) {
  let hips = null;
  model.traverse(o => { if (!hips && o.name === 'Hips') hips = o; });
  return hips ? hips.getWorldPosition(new THREE.Vector3()).y : 0;
}

// A strided sample of EVERY skinned vertex, not just the soles. Cached on the
// model like groundOffset's sole set, so a fight pays for it once.
function bodyCandidates(root) {
  if (root.userData?.[PROBE_KEY]) return root.userData[PROBE_KEY];
  const all = [];
  root.traverse(o => {
    const position = o.isSkinnedMesh && o.geometry?.attributes?.position;
    if (!position) return;
    all.push({ mesh: o, count: position.count });
  });
  let total = 0;
  for (const m of all) total += m.count;
  const stride = Math.max(1, Math.ceil(total / PROBE_SAMPLES));
  const out = [];
  for (const { mesh, count } of all) for (let i = 0; i < count; i += stride) out.push({ mesh, index: i });
  root.userData[PROBE_KEY] = out;
  return out;
}

function lowestAtEnd(root, clip, candidates) {
  let mixer = null;
  let min = Infinity;
  try {
    mixer = new THREE.AnimationMixer(root);
    const action = mixer.clipAction(clip);
    // LoopOnce + clamp. The default LoopRepeat wraps setTime(duration) back to
    // frame 0, and on a collapse clip frame 0 is the character STANDING — the
    // one frame that must not be mistaken for the settled pose.
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    mixer.setTime(Math.max(0, (clip.duration || 0) - 1e-4));
    root.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    for (const { mesh, index } of candidates) {
      v.fromBufferAttribute(mesh.geometry.attributes.position, index);
      mesh.applyBoneTransform(index, v);
      mesh.localToWorld(v);
      if (v.y < min) min = v.y;
    }
  } finally {
    try { mixer?.stopAllAction(); mixer?.uncacheRoot(root); } catch (_) { /* measurement is optional */ }
  }
  return Number.isFinite(min) ? min : 0;
}

function restoreRest(root, rest) {
  if (!rest?.size) return;
  root.traverse(o => {
    const pose = rest.get(o.name);
    if (!pose) return;
    o.quaternion.copy(pose.q);
    o.position.copy(pose.p);
  });
  root.updateMatrixWorld(true);
}

function swing(s, from, to) {
  if (from.lengthSq() < 1e-10 || to.lengthSq() < 1e-10) return s.q.identity().clone();
  return new THREE.Quaternion().setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
}

function writeLocal(values, i, parentWorld, world) {
  const local = new THREE.Quaternion().copy(parentWorld).invert().multiply(world);
  local.toArray(values, i * 4);
}
