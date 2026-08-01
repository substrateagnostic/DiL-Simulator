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
    const target = softClampMax(sag, limits.get(name), kneeDeg);
    if (target < sag - 1e-6) {
      rotation.setFromAxisAngle(lateral, (sag - target) * DEG_TO_RAD);
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
  const untiltHead = (worldQuaternion) => {
    direction.copy(targetRest.get('head_end').p).applyQuaternion(worldQuaternion).normalize();
    const sag = sagittal(direction);
    const target = softClampMax(sag, limits.get('Head'), kneeDeg);
    if (target >= sag - 1e-6 || direction.y <= 0) return;
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
    let psi = alpha + acos;
    const other = alpha - acos;
    const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
    psi = wrap(psi); const psi2 = wrap(other);
    if (Math.abs(psi2) < Math.abs(psi)) psi = psi2;   // the least visible of the two roots
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
        const gazeDelta = gazeSag - gazeSagBind;
        const gazeTargetDelta = Math.sign(gazeDelta)
          * softClampMax(Math.abs(gazeDelta), gazeEpsilonDeg, gazeKneeDeg);
        const gazeTarget = gazeSagBind + gazeTargetDelta;
        if (Math.abs(gazeTarget - gazeSag) > 1e-6) {
          rotation.setFromAxisAngle(lateral, (gazeSag - gazeTarget) * DEG_TO_RAD);
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
