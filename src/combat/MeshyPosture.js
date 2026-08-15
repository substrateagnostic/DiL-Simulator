/*
 * The shared calm clips were authored with a forward curl through every torso
 * joint. Retargeting correctly preserves that motion delta, which also means it
 * stacks the donor's slouch onto each character's different bind posture. A
 * sagittal, one-sided world-space ceiling rebased to each character's own bind
 * keeps those differences while preventing inherited forward curl from
 * accumulating down the chain. Lateral and backward motion remain deliberately
 * untouched, and Hips stays outside the correction because its leg children own
 * the verified foot plant.
 */
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);
const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;
const EPSILON = 1e-12;
const CORRECTED_BONES = ['Spine02', 'Spine01', 'Spine', 'neck', 'Head'];
const REQUIRED_BONES = [...CORRECTED_BONES, 'head_end'];
const CHILD = {
  Spine02: 'Spine01',
  Spine01: 'Spine',
  Spine: 'neck',
  neck: 'Head',
  Head: 'head_end',
};

function trackBinding(track) {
  const dot = track.name.lastIndexOf('.');
  return dot < 0 ? [track.name, ''] : [track.name.slice(0, dot), track.name.slice(dot + 1)];
}

function softClampMax(x, limit, knee) {
  const d = x - (limit - knee);
  if (d <= 0) return x;
  return limit - knee * Math.exp(-d / knee);
}

/**
 * B22 — THE HEAD FLIP, and it is a branch cut.
 *
 * `sagittal(v) = atan2(v.forward, v.y)` is the angle this whole file measures
 * lean in, and atan2 has a discontinuity: it returns (-180, 180], so a vector
 * that crosses the half-plane behind the character jumps ~360 degrees between
 * one frame and the next. Every clamp here then compares that raw angle against
 * a raw limit, so on the crossing frame the correction it computes is not a few
 * degrees — it is most of a full turn, applied to the head. Measured on the
 * shipping stance clip a333 (the Intern and Skip Hartley Unhinged both use it):
 * the RETARGETED head moves 1.85 degrees between adjacent keys, and after the
 * posture clamp the same pair of keys is 48.41 degrees apart, rising to 172.02
 * degrees — a near-inversion — as the gaze ceiling is relaxed. The clip is
 * baked, so it replays at the same instant every time that character animates,
 * which is exactly the reported "head flips upside down while moving".
 *
 * The remedy is to do every comparison in WRAPPED DELTA space. `softClampMax`
 * satisfies `softClampMax(x, L, k) - L === softClampMax(x - L, 0, k)`, so
 * clamping `wrapDeg(sag - limit)` against zero is algebraically the same curve
 * whenever no wrap occurs — every frame that was already correct stays
 * bit-identical — and is finite and continuous on the frames that cross.
 */
function wrapDeg(a) {
  let x = a % 360;
  if (x > 180) x -= 360;
  if (x < -180) x += 360;
  return x;
}

function sameTimes(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function sortedTimes(times) {
  for (let i = 1; i < times.length; i++) {
    if (times[i] < times[i - 1]) return false;
  }
  return true;
}

function unionTimes(tracks) {
  const all = [];
  for (const track of tracks) {
    for (const time of track.times) all.push(time);
  }
  all.sort((a, b) => a - b);
  const unique = [];
  for (const time of all) {
    if (!unique.length || time !== unique[unique.length - 1]) unique.push(time);
  }
  return Float32Array.from(unique);
}

function clampPostureImpl(clip, targetRest, opts) {
  if (!clip?.tracks || !targetRest?.get) return clip;
  if (REQUIRED_BONES.some(name => !targetRest.has(name)) || !targetRest.has('Hips')) return clip;

  const quaternionTracks = new Map();
  for (const track of clip.tracks) {
    const [name, property] = trackBinding(track);
    if (property === 'quaternion' && !quaternionTracks.has(name)) quaternionTracks.set(name, track);
  }
  if (CORRECTED_BONES.some(name => !quaternionTracks.has(name))) return clip;

  const worldRest = new Map();
  const visiting = new Set();
  const restWorld = (name) => {
    if (worldRest.has(name)) return worldRest.get(name);
    const pose = targetRest.get(name);
    if (!pose || visiting.has(name)) throw new Error(`Invalid posture rest hierarchy at ${name}`);
    visiting.add(name);
    const world = pose.q.clone();
    if (pose.parent && targetRest.has(pose.parent)) world.premultiply(restWorld(pose.parent));
    visiting.delete(name);
    worldRest.set(name, world);
    return world;
  };

  for (const name of REQUIRED_BONES) restWorld(name);
  const hipsRest = targetRest.get('Hips');
  const rootWorld = hipsRest.parent && targetRest.has(hipsRest.parent)
    ? restWorld(hipsRest.parent).clone()
    : new THREE.Quaternion();

  const budgetDeg = Math.max(0, opts.budgetDeg ?? 2.5);
  const kneeDeg = Math.max(Number.EPSILON, opts.kneeDeg ?? 1.25);
  const gazeLimit = Math.max(0, opts.gazeLimit ?? 0.006);
  const gazeKnee = Math.max(Number.EPSILON, opts.gazeKnee ?? 0.004);
  const headfront = targetRest.get('headfront');
  if (!headfront) return clip;

  const gazeBind = headfront.p.clone().applyQuaternion(restWorld('Head')).normalize();
  const forward = gazeBind.clone();
  forward.y = 0;
  if (!Number.isFinite(forward.lengthSq()) || forward.lengthSq() <= EPSILON) return clip;
  forward.normalize();
  const lateral = new THREE.Vector3().crossVectors(forward, UP).normalize();
  const sagittal = vector => Math.atan2(vector.dot(forward), vector.y) * RAD_TO_DEG;

  const limits = new Map();
  const direction = new THREE.Vector3();
  for (const name of CORRECTED_BONES) {
    direction.copy(targetRest.get(CHILD[name]).p).applyQuaternion(restWorld(name)).normalize();
    limits.set(name, sagittal(direction) + budgetDeg);
  }
  const gazeSagBind = sagittal(gazeBind);
  const gazeEpsilonDeg = Math.asin(THREE.MathUtils.clamp(gazeLimit, 0, 1)) * RAD_TO_DEG;
  const gazeKneeDeg = Math.max(
    Number.EPSILON,
    Math.asin(THREE.MathUtils.clamp(gazeKnee, 0, 1)) * RAD_TO_DEG,
  );

  const correctedTracks = CORRECTED_BONES.map(name => quaternionTracks.get(name));
  const sharedTimes = sortedTimes(correctedTracks[0].times)
    && correctedTracks.every(track => sameTimes(track.times, correctedTracks[0].times));
  const times = sharedTimes ? correctedTracks[0].times.slice() : unionTimes(correctedTracks);
  if (!times.length) return clip;

  const interpolants = new Map();
  for (const [name, track] of quaternionTracks) interpolants.set(name, track.createInterpolant());
  const outputValues = new Map(CORRECTED_BONES.map(name => [name, new Float32Array(times.length * 4)]));

  const local = new THREE.Quaternion();
  const world = new THREE.Quaternion();
  const parentWorld = new THREE.Quaternion();
  const inverseParent = new THREE.Quaternion();
  const rotation = new THREE.Quaternion();
  const probe = new THREE.Vector3();

  const clampSegment = (name, worldQuaternion) => {
    direction.copy(targetRest.get(CHILD[name]).p).applyQuaternion(worldQuaternion).normalize();
    const sag = sagittal(direction);
    // B22: measure the excess over the ceiling as a WRAPPED delta, never as a
    // difference of two raw atan2 readings. See wrapDeg.
    const rel = wrapDeg(sag - limits.get(name));
    const relTarget = softClampMax(rel, 0, kneeDeg);
    if (relTarget < rel - 1e-6) {
      rotation.setFromAxisAngle(lateral, (rel - relTarget) * DEG_TO_RAD);
      worldQuaternion.premultiply(rotation);
    }
  };

  // Once the gaze is level the head's PITCH is spent: any further rotation about
  // `lateral` would tip the eyes off the horizon again, and the gaze ceiling is
  // the harder of the two requirements. What is left over on Head>head_end after
  // that is head TILT during the look-around beat, not a dropped skull — on a
  // stooped sculpt a rolled head still projects several degrees of apparent
  // forward lean into the sagittal plane. Rolling about the gaze vector ITSELF
  // removes it, because a rotation cannot move its own axis: the eyes stay
  // exactly where the gaze clamp put them and only the head's cant changes.
  const roll = new THREE.Vector3();
  const perp = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  // B22 — THE HEAD FLIP. Playtest note: "enemy head flips upside down while
  // moving." The combat hunt ruled out a rest-map mis-bind (34/34 GLBs clean)
  // and named this function's per-frame re-solve as a lead. It is the cause.
  //
  // h(u) = 0 over the roll circle has TWO roots, `alpha + acos` and
  // `alpha - acos`, and they can be most of a half-turn apart. The solver
  // picked whichever had the smaller absolute angle, INDEPENDENTLY ON EVERY
  // FRAME, with no memory. Wherever the two roots cross in magnitude — which
  // they do whenever the head passes through the geometry that generates them —
  // consecutive frames select different branches and the correction jumps by up
  // to ~180 deg about the gaze axis. A 180 deg roll about the gaze axis IS the
  // head upside down, and because it is baked into the clip it replays at
  // exactly the same moment every time that clip plays.
  //
  // Two guards, and they are independent on purpose:
  //   CONTINUITY — after the first frame, choose the root nearest the root this
  //     clip chose last frame, not the one nearest zero. That is what makes the
  //     correction a continuous curve instead of a branch lottery.
  //   A CEILING — reject any root beyond MAX_UNTILT_DEG. This is the structural
  //     half: untilting a head is a few degrees of cant, so a solution of 40 deg
  //     or more is not the answer to the question being asked, whatever the
  //     continuity pass thinks. With this in place the head CANNOT invert even
  //     if a future edit reintroduces a discontinuity.
  // Frames where the solve fails already return without rolling; `prevPsi` is
  // deliberately NOT reset there, so the next successful frame still resumes on
  // the branch the clip was on before the gap.
  const MAX_UNTILT_DEG = 35;
  let prevPsi = null;
  const untiltHead = (worldQuaternion) => {
    direction.copy(targetRest.get('head_end').p).applyQuaternion(worldQuaternion).normalize();
    const sag = sagittal(direction);
    // B22, same wrap as clampSegment. `target` is rebuilt as an absolute angle
    // afterwards because the roll solve below needs tan(target).
    const rel = wrapDeg(sag - limits.get('Head'));
    const relTarget = softClampMax(rel, 0, kneeDeg);
    const target = limits.get('Head') + relTarget;
    if (relTarget >= rel - 1e-6 || direction.y <= 0) return;
    roll.copy(headfront.p).applyQuaternion(worldQuaternion).normalize();
    const along = direction.dot(roll);
    perp.copy(direction).addScaledVector(roll, -along);
    const radius = perp.length();
    if (radius <= 1e-6) return;
    e1.copy(perp).divideScalar(radius);
    e2.crossVectors(roll, e1);
    // Solve  h(u) = u.forward - tan(target) * u.y = 0  over the roll circle.
    const k = Math.tan(target * DEG_TO_RAD);
    const h = v => v.dot(forward) - k * v.y;
    const A = along * h(roll);
    const P = radius * h(e1);
    const Q = radius * h(e2);
    const R = Math.hypot(P, Q);
    if (R <= 1e-9 || Math.abs(A) > R) return;   // the target lean is off this circle
    const alpha = Math.atan2(Q, P);
    const acos = Math.acos(THREE.MathUtils.clamp(-A / R, -1, 1));
    const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
    const roots = [wrap(alpha + acos), wrap(alpha - acos)]
      // THE CEILING first: a root outside the untilt budget is not a candidate
      // at all, so no amount of continuity can walk the head onto it.
      .filter(a => Math.abs(a) * RAD_TO_DEG <= MAX_UNTILT_DEG);
    if (!roots.length) return;
    // THE CONTINUITY: nearest the branch this clip is already on. Only the
    // first corrected frame falls back to "nearest zero".
    const ref = prevPsi === null ? 0 : prevPsi;
    let psi = roots[0];
    for (const r of roots) {
      if (Math.abs(wrap(r - ref)) < Math.abs(wrap(psi - ref))) psi = r;
    }
    prevPsi = psi;
    rotation.setFromAxisAngle(roll, psi);
    worldQuaternion.premultiply(rotation);
  };

  const sampleLocal = (name, time) => {
    const interpolant = interpolants.get(name);
    return interpolant ? local.fromArray(interpolant.evaluate(time)) : local.copy(targetRest.get(name).q);
  };

  for (let frame = 0; frame < times.length; frame++) {
    const time = times[frame];
    parentWorld.copy(rootWorld).multiply(sampleLocal('Hips', time));

    for (const name of CORRECTED_BONES) {
      world.copy(parentWorld).multiply(sampleLocal(name, time));
      clampSegment(name, world);

      if (name === 'Head') {
        probe.copy(headfront.p).applyQuaternion(world).normalize();
        const gazeSag = sagittal(probe);
        // B22 — THE ONE THAT ACTUALLY BIT. The gaze ceiling is 0.34 deg, so
        // this delta is the tightest clamp in the file and the raw subtraction
        // of two atan2 readings made it the loudest: one branch crossing turned
        // `gazeDelta` into ~358 and premultiplied most of a full turn onto the
        // head. Wrapped, the correction stays the few degrees it is meant to be.
        const gazeDelta = wrapDeg(gazeSag - gazeSagBind);
        const gazeTargetDelta = Math.sign(gazeDelta)
          * softClampMax(Math.abs(gazeDelta), gazeEpsilonDeg, gazeKneeDeg);
        // B22, RESIDUAL — READ THIS BEFORE CAPPING THIS CORRECTION.
        // Traced frame by frame on a333 (the Intern's and Skip Hartley
        // Unhinged's stance):
        //
        //   frame   114     115     116     117     118      119      120
        //   gazeSag 114.63  122.02  137.06  171.07  -144.15  -120.66  -110.44
        //
        // The authored gaze sweeps through near-vertical at up to 45 deg per
        // 30 fps frame, and crosses the atan2 branch cut between 117 and 118 —
        // which `wrapDeg` above now absorbs, and that half IS fixed. Against
        // the 0.34 deg gaze ceiling the rule still asks for an 81 deg
        // correction on one frame and 126 on the next, and the 45 deg
        // difference between them is the residual snap: the retargeted head
        // moves 1.85 deg between those two keys and the clamped head 47.75.
        //
        // A CAP HERE WAS TRIED AND MUST NOT BE SHIPPED AS-IS. Capping the
        // correction at 12 deg with a smoothstep hand-off does fix the snap
        // (a333 48.41 -> 11.42 deg) but it takes tools/meshy-spine-gate.mjs
        // from 2 FAILs to 14 — the gate's `gaze <= 0.010` discriminant is
        // measuring precisely the pin the cap removes, and it breaks on
        // alex_it, brand_consultant, chief_of_restructuring,
        // client_m_elder/heavy, compliance, firm_partner, intern and isaiah.
        // The gaze gate and this stance clip are in genuine tension; resolving
        // it is a casting/clip decision, not a line change (HANDOFF §2 item 3
        // already offers swaps for this class). Left named, with a
        // reproduction, rather than traded for a worse number elsewhere.
        const gazeCorrection = gazeDelta - gazeTargetDelta;
        if (Math.abs(gazeCorrection) > 1e-6) {
          rotation.setFromAxisAngle(lateral, gazeCorrection * DEG_TO_RAD);
          world.premultiply(rotation);
        }
        untiltHead(world);
      }

      inverseParent.copy(parentWorld).invert();
      local.copy(inverseParent).multiply(world).normalize();
      local.toArray(outputValues.get(name), frame * 4);
      parentWorld.copy(world);
    }
  }

  const tracks = clip.tracks.map(track => {
    const [name, property] = trackBinding(track);
    if (property === 'quaternion' && outputValues.has(name)) {
      return new THREE.QuaternionKeyframeTrack(track.name, times.slice(), outputValues.get(name));
    }
    return track.clone();
  });
  const result = new THREE.AnimationClip(clip.name, clip.duration, tracks, clip.blendMode);
  result.userData = {
    ...(clip.userData || {}),
    postureClamped: true,
    postureBonesCorrected: CORRECTED_BONES.length,
  };
  return result;
}

export function clampPosture(clip, targetRest, opts = {}) {
  try {
    return clampPostureImpl(clip, targetRest, opts);
  } catch (_) {
    return clip;
  }
}
