/*
 * Meshy's auto-rigger emits two pelvis conventions that can look identical in bind
 * pose while giving Hips and the upper legs radically different local frames.
 * Combat clips all come from one donor armature, so binding those local rotations
 * straight onto every character makes the child-rest cancellations fight the clip.
 * The visible result is that roughly half the cast folds sideways at the waist.
 * A motion delta describes a change in the donor's world frame, not in the target
 * bone's own frame, so rotations travel through world space and are then re-solved
 * parent-before-child into target locals.
 * Root translation is handled separately because the stage owns horizontal travel.
 * Foot grounding is also clip-specific: attacks, hurts, and crouches reach different
 * lows even on the same body.
 * Its offset therefore comes from the minimum sole height over the whole clip; a
 * crouch grounded anywhere above its lowest frame would punch through the floor.
 */
import * as THREE from 'three';

const CANDIDATE_KEY = '_meshySoleCandidates';
const hierarchyCache = new WeakMap();
let warnedLegacyRest = false;

export function captureRest(root) {
  const rest = new Map();
  root?.traverse(o => {
    // Track binding also stops at the first matching name, so duplicate helper
    // nodes must not replace the actual bone's authored rest transform.
    if (!o.name || rest.has(o.name)) return;
    let parent = o.parent;
    while (parent && !parent.name) parent = parent.parent;
    rest.set(o.name, {
      q: o.quaternion.clone(),
      p: o.position.clone(),
      parent: parent?.name || null,
    });
  });
  return rest;
}

function restHierarchy(rest) {
  const cached = hierarchyCache.get(rest);
  if (cached) return cached;

  const order = [];
  const worldRest = new Map();
  const visiting = new Set();
  const visited = new Set();

  function visit(name) {
    if (visited.has(name)) return;
    if (visiting.has(name)) throw new Error(`Cycle in captured rest hierarchy at ${name}`);
    visiting.add(name);
    const pose = rest.get(name);
    const parent = pose.parent;
    if (parent && rest.has(parent)) visit(parent);

    const world = pose.q.clone();
    if (parent && worldRest.has(parent)) world.premultiply(worldRest.get(parent));
    worldRest.set(name, world);
    order.push(name);
    visiting.delete(name);
    visited.add(name);
  }

  for (const name of rest.keys()) visit(name);
  const result = { order, worldRest };
  hierarchyCache.set(rest, result);
  return result;
}

function hasParentInfo(rest) {
  for (const pose of rest.values()) {
    if (Object.prototype.hasOwnProperty.call(pose, 'parent')) return true;
  }
  return false;
}

function resultClip(clip, tracks, dropped) {
  const result = new THREE.AnimationClip(clip.name, clip.duration, tracks, clip.blendMode);
  result.userData = { ...(clip.userData || {}), retargetDroppedTracks: dropped };
  return result;
}

export function retargetClip(clip, donorRest, targetRest, opts = {}) {
  const legacy = !hasParentInfo(donorRest) || !hasParentInfo(targetRest);
  if (legacy) {
    if (!warnedLegacyRest) {
      console.warn('[MeshyRetarget] Rest maps lack parent data; using local-frame rotation fallback.');
      warnedLegacyRest = true;
    }
  }

  const quaternionTracks = new Map();
  const tracks = [];
  let dropped = 0;
  const anim = new THREE.Quaternion();
  const out = new THREE.Quaternion();

  for (const track of clip.tracks) {
    const [boneName, prop] = track.name.split('.');
    const dr = donorRest.get(boneName);
    const tr = targetRest.get(boneName);
    if (!dr || !tr) { dropped++; continue; }

    if (prop === 'quaternion') {
      if (legacy) {
        const correction = tr.q.clone().multiply(dr.q.clone().invert());
        const values = new Float32Array(track.values.length);
        for (let i = 0; i < values.length; i += 4) {
          anim.fromArray(track.values, i);
          out.copy(correction).multiply(anim).toArray(values, i);
        }
        tracks.push(new THREE.QuaternionKeyframeTrack(track.name, track.times.slice(), values));
      } else {
        quaternionTracks.set(boneName, track);
      }
    } else if (prop === 'position') {
      // CombatScene owns stage travel. Donor root motion would skate the actor,
      // while the vertical delta still needs to follow the target's hip height.
      const k = dr.p.y !== 0 ? tr.p.y / dr.p.y : 1;
      const pinXZ = opts.pinXZ !== false;
      const values = new Float32Array(track.values.length);
      for (let i = 0; i < values.length; i += 3) {
        values[i] = pinXZ ? tr.p.x : tr.p.x + (track.values[i] - dr.p.x) * k;
        values[i + 1] = tr.p.y + (track.values[i + 1] - dr.p.y) * k;
        values[i + 2] = pinXZ ? tr.p.z : tr.p.z + (track.values[i + 2] - dr.p.z) * k;
      }
      tracks.push(new THREE.VectorKeyframeTrack(track.name, track.times.slice(), values));
    } else {
      dropped++;
    }
  }
  if (legacy) return resultClip(clip, tracks, dropped);

  const allTimes = [];
  for (const track of quaternionTracks.values()) {
    for (const time of track.times) allTimes.push(time);
  }
  allTimes.sort((a, b) => a - b);
  const times = [];
  for (const time of allTimes) {
    if (!times.length || time - times[times.length - 1] > 1e-6) times.push(time);
  }
  if (!times.length) return resultClip(clip, clip.tracks.slice(), 0);

  const donor = restHierarchy(donorRest);
  const target = restHierarchy(targetRest);
  const interpolants = new Map();
  const outputValues = new Map();
  const donorWorld = new Map();
  const targetWorld = new Map();
  for (const [name, track] of quaternionTracks) {
    interpolants.set(name, track.createInterpolant());
    outputValues.set(name, new Float32Array(times.length * 4));
  }
  for (const name of donor.order) donorWorld.set(name, new THREE.Quaternion());
  for (const name of target.order) targetWorld.set(name, new THREE.Quaternion());

  const identity = new THREE.Quaternion();
  const local = new THREE.Quaternion();
  const inverse = new THREE.Quaternion();

  // If donor and target are the same rig, Wt0 === Wd0 and Andrew stays bit-equal.
  // Matching rest frames reduce to donor locals, so the already-clean spine stays clean.
  for (let frame = 0; frame < times.length; frame++) {
    const time = times[frame];
    for (const name of donor.order) {
      const pose = donorRest.get(name);
      const parentWorld = donorWorld.get(pose.parent) || identity;
      const interpolant = interpolants.get(name);
      if (interpolant) local.fromArray(interpolant.evaluate(time));
      else local.copy(pose.q);
      donorWorld.get(name).copy(parentWorld).multiply(local);
    }

    for (const name of target.order) {
      const pose = targetRest.get(name);
      const parentWorld = targetWorld.get(pose.parent) || identity;
      const world = targetWorld.get(name);
      if (quaternionTracks.has(name)) {
        world.copy(donorWorld.get(name));
        inverse.copy(donor.worldRest.get(name)).invert();
        world.multiply(inverse).multiply(target.worldRest.get(name));
        inverse.copy(parentWorld).invert();
        local.copy(inverse).multiply(world);
        local.toArray(outputValues.get(name), frame * 4);
      } else {
        world.copy(parentWorld).multiply(pose.q);
      }
    }
  }

  for (const [name, track] of quaternionTracks) {
    tracks.push(new THREE.QuaternionKeyframeTrack(track.name, times.slice(), outputValues.get(name)));
  }
  return resultClip(clip, tracks, dropped);
}

function soleCandidates(root) {
  if (root.userData?.[CANDIDATE_KEY]) return root.userData[CANDIDATE_KEY];
  const meshes = [];
  let minY = Infinity;
  let maxY = -Infinity;
  root.traverse(o => {
    const position = o.isSkinnedMesh && o.geometry?.attributes?.position;
    if (!position) return;
    meshes.push({ mesh: o, position });
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  });

  const all = [];
  const cutoff = minY + 0.12 * (maxY - minY);
  for (const { mesh, position } of meshes) {
    for (let i = 0; i < position.count; i++) {
      if (position.getY(i) < cutoff) all.push({ mesh, index: i });
    }
  }
  const stride = Math.max(1, Math.ceil(all.length / 400));
  const candidates = all.filter((_, i) => i % stride === 0);
  root.userData[CANDIDATE_KEY] = candidates;
  return candidates;
}

function restorePose(root, rest) {
  if (!rest?.size) return;
  root.traverse(o => {
    const pose = rest.get(o.name);
    if (!pose) return;
    o.quaternion.copy(pose.q);
    o.position.copy(pose.p);
  });
  root.updateMatrixWorld(true);
}

export function groundOffset(root, clip, opts = {}) {
  let mixer = null;
  let min = Infinity;
  try {
    const candidates = opts.candidates || soleCandidates(root);
    const samples = Math.max(1, opts.samples ?? 14);
    const duration = Math.max(0, clip.duration || 0);
    const v = new THREE.Vector3();
    mixer = new THREE.AnimationMixer(root);
    // LoopOnce + clamp, and the last sample a hair short of the end. Under the
    // default LoopRepeat, setTime(duration) wraps to clip time 0, so the final
    // sample of every sweep silently re-read the FIRST frame and the true end
    // pose was never measured on any role. Harmless on a clip that returns to
    // its stance; not harmless on `defeat`, whose whole point is the pose it
    // stops on. Frame 0 is still sampled at s=0, so this only ADDS information:
    // the measured minimum can only fall, the offset the animator subtracts can
    // only shrink, and a character can therefore only be LIFTED by this fix,
    // never sunk. Measured on chad's defeat: offset 0.0625 -> 0.0313, which is
    // exactly the 3.5 cm his right foot was spending under the stage on the
    // settled frame that nothing had ever looked at.
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    for (let s = 0; s < samples; s++) {
      const t = samples === 1 ? 0 : Math.min(duration - 1e-4, duration * s / (samples - 1));
      mixer.setTime(Math.max(0, t));
      root.updateMatrixWorld(true);
      for (const { mesh, index } of candidates) {
        v.fromBufferAttribute(mesh.geometry.attributes.position, index);
        mesh.applyBoneTransform(index, v);
        mesh.localToWorld(v);
        min = Math.min(min, v.y);
      }
    }
  } catch (_) {
    min = Infinity;
  } finally {
    try { mixer?.stopAllAction(); mixer?.uncacheRoot(root); } catch (_) { /* measurement is optional */ }
    if (opts.restore !== false) {
      try { restorePose(root, opts.restore || opts.targetRest); } catch (_) { /* keep the fight alive */ }
    }
  }
  return Number.isFinite(min) ? min : 0;
}

export function groundOffsets(root, clips, opts = {}) {
  const offsets = {};
  try {
    const candidates = opts.candidates || soleCandidates(root);
    for (const [role, clip] of Object.entries(clips || {})) {
      if (clip) offsets[role] = groundOffset(root, clip, { ...opts, candidates, restore: false });
    }
  } catch (_) {
    // Grounding is polish; a malformed mesh must never block combat setup.
  } finally {
    try { restorePose(root, opts.restore || opts.targetRest); } catch (_) { /* keep the fight alive */ }
  }
  return offsets;
}
