// SHARED REACTION CLIPS for the Meshy combat cast.
//
// Every Meshy auto-rig in the cast carries the same 24 bone names, so a reaction
// only has to exist once. The local pelvis frames do differ, though: binding the
// donor rotations raw folds half the cast at the waist. Each shared file is
// therefore retargeted per rig at load, preserving the target's authored rest
// frame while keeping the one-file clip library.
//
// That is why this is ~430KB of clips for the whole cast instead of 31 fresh
// 9MB character exports per reaction.
import { CLIP_LOADER, registerClipProvider } from './MeshyCast.js';
import { captureRest, retargetClip } from './MeshyRetarget.js';

// Catalog ids, chosen off preview strips AND re-judged on real characters
// (art/char_refs/meshy_pilot/_clips/strip_*.png). Names are Meshy's.
export const CLIP_IDS = {
  stance_a: 336,  // "Long Breathe and Look Around" — 11.3s, natural arm hang
  stance_b: 338,  // "Short Breathe and Look Around" — 7.9s, the calmest hold
  guard: 138,     // "Block1" — hands up, weight back (Brace)
  hurt: 178,      // "Hit Reaction" — 1.67s torso recoil + arm fling
  stagger: 391,   // "Head Hold in Pain" — hands to head, doubles over (Break)
  victory: 59,    // "Victory Cheer" — 9.4s, arm up + overhead pump (403 was too small a bounce)
  attack: 191,    // "Left Jab from Guard"
};

// The two calm stances alternate across the cast so a group fight does not
// breathe in unison. See stanceFor().
const STANCE_ROLES = ['stance_a', 'stance_b'];

const cache = new Map();   // role -> { clip, donorRest } | null
const inflight = new Map();
const retargeted = new Map(); // modelId|role -> AnimationClip
let warnedMissingRest = false;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Which calm stance a character holds, and at what phase. Stable per id, so a
// save reloaded mid-fight looks the same, and two characters on stage together
// almost never share both clip AND phase.
export function stanceFor(id) {
  return STANCE_ROLES[hash(id) % STANCE_ROLES.length];
}
export function phaseFor(id) {
  return ((hash(id + '#phase') % 1000) / 1000);
}

function loadRole(role) {
  if (cache.has(role)) return Promise.resolve(cache.get(role)?.clip || null);
  if (inflight.has(role)) return inflight.get(role);
  const actionId = CLIP_IDS[role];
  if (!actionId) return Promise.resolve(null);
  const p = CLIP_LOADER(`clips/a${actionId}.glb`)
    .then(gltf => {
      const clip = gltf.animations?.[0] || null;
      if (clip) clip.name = role;
      const entry = clip ? { clip, donorRest: captureRest(gltf.scene) } : null;
      cache.set(role, entry);
      return clip;
    })
    .catch(err => {
      // A missing reaction clip is not a broken fight — the character simply
      // keeps holding its stance for that beat.
      console.warn(`[meshy] reaction clip ${role} (a${actionId}) unavailable:`, err);
      cache.set(role, null);
      return null;
    })
    .finally(() => inflight.delete(role));
  inflight.set(role, p);
  return p;
}

// Warm every shared clip. Called from the same combat-transition preload as the
// character GLBs, so the whole reaction layer arrives behind the fade.
export function preloadClips() {
  return Promise.all(Object.keys(CLIP_IDS).map(loadRole));
}

// The clip set for one character: its calm stance under the `idle` role, plus
// every reaction. Synchronous — anything not warmed is simply absent, and
// MeshyAnimator degrades that role to the stance.
export function clipsFor(id, modelId = id, targetRest) {
  const out = {};
  const clipFor = (role) => {
    const entry = cache.get(role);
    if (!entry?.clip) return null;
    if (!targetRest?.size || !entry.donorRest?.size) {
      if (!warnedMissingRest) {
        console.warn('[meshy] rest pose unavailable; shared reaction clips will play without retargeting');
        warnedMissingRest = true;
      }
      return entry.clip;
    }
    const key = `${modelId}|${role}`;
    if (retargeted.has(key)) return retargeted.get(key);
    try {
      const clip = retargetClip(entry.clip, entry.donorRest, targetRest);
      retargeted.set(key, clip);
      return clip;
    } catch (err) {
      console.warn(`[meshy] could not retarget ${role} for ${modelId}; using donor clip:`, err);
      retargeted.set(key, entry.clip);
      return entry.clip;
    }
  };

  const stance = clipFor(stanceFor(id));
  if (stance) out.idle = stance;
  for (const role of ['guard', 'hurt', 'stagger', 'victory', 'attack']) {
    const c = clipFor(role);
    if (c) out[role] = c;
  }
  // The scheming beat reuses the attack accent rather than holding a dead
  // stance; a dedicated cast clip is a later pass.
  if (out.attack) out.cast = out.attack;
  return out;
}

registerClipProvider(clipsFor, phaseFor);

export function isLoaded(role) { return cache.has(role) && !!cache.get(role)?.clip; }
