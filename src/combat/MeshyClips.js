// SHARED CLIP LIBRARY for the Meshy combat cast — the CASTING SLATE.
//
// Every Meshy auto-rig in the cast carries the same 24 bone names, so a clip
// only has to exist once and can then drive any body. The local pelvis frames
// do differ, though: binding the donor rotations raw folds half the cast at the
// waist. Each file is therefore retargeted per rig at load, preserving the
// target's authored rest frame while keeping the one-file clip library.
//
// The calm stances also carry an authored slouch whose stacked spine flexion
// survives correct retargeting. Their target-space clips receive a bind-rebased
// posture clamp so the cast keeps its own proportions without looking downward.
// Reactions are SUPPOSED to bend and are never clamped.
//
// GENDER OF PERFORMANCE (art/MESHY_SLATE.md, from the two-pass study in
// art/char_refs/meshy_pilot/_clips/gender/FINAL_SLATE.md). Until this slate,
// seven clips covered all 33 characters and three of them were female-performed
// — so twenty-three male-built bodies flinched, guarded and cheered with a
// woman's carriage, and ten female-built bodies punched with a man's. Every
// reaction role is now a PAIR keyed on the character's build, and the calm
// stance is a per-character pick. The casting axis is the MODEL'S BUILD (stance
// width and pelvic height are body-proportion signals), not the character's
// pronouns — see compliance and brand_consultant, who are written they/their
// and cast off male-built sculpts on purpose.
//
// That is why this is ~2.8MB of clips for the whole cast instead of 31 fresh
// 9MB character exports per reaction.
import { CLIP_LOADER, registerClipProvider } from './MeshyCast.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { captureRest, retargetClip } from './MeshyRetarget.js';
import { clampPosture } from './MeshyPosture.js';

// REACTION ROLES — gender-keyed catalog ids. Names are Meshy's.
// `m` plays on the 23 male-built bodies, `f` on the 10 female-built ones.
export const CLIP_IDS = {
  guard:   { m: 138, f: 420 },  // "Block1" / "Left Hand Bitten, Step Back" — hands up, weight back (Brace)
  hurt:    { m: 174, f: 178 },  // "Face Punch Reaction" / "Hit Reaction" — torso recoil
  stagger: { m: 176, f: 391 },  // "Face Punch Reaction 2" / "Head Hold in Pain" (Composure Break)
  victory: { m: 49,  f: 59  },  // "Motivational Cheer" / "Victory Cheer"
  attack:  { m: 191, f: 214 },  // "Left Jab from Guard" / "Punch Forward with Both Fists"
};
const REACTION_ROLES = Object.keys(CLIP_IDS);

// THE BEAT REFERENCE. For each role, the clip the fight pacing was already
// tuned around before the slate split the cast — i.e. what shipped. Its
// duration is read off the loaded GLB, never hardcoded, so swapping a clip
// re-derives the whole window. See beatTimeScales().
const BEAT_REFERENCE = { guard: 138, hurt: 178, stagger: 391, victory: 59, attack: 191 };

// How far a performance may sit off the reference beat before it is corrected.
// A ±15% band is wide enough that a clip whose length is merely *different*
// (victory: 9.03s male vs 9.37s female) is left completely undistorted, and
// narrow enough that the 2x outliers the study found (the female attack at
// 3.50s against the male jab's 1.80s — "the women fight in slow motion") are
// pulled back into the same read. Correction is to the EDGE of the band, not to
// the reference itself: that is the smallest change that removes the artefact,
// so no clip is sped up further than it has to be.
const BEAT_TOLERANCE = 0.15;

// PER-CHARACTER CALM STANCE (the `idle` role), 33 rows. Reuse (`↺` in the
// slate) is deliberate and proved invisible: the male standing-clip pool is
// exactly at capacity, and every shared row is between characters that cannot
// occupy one stage — Tier E minors reuse from solo story bosses, Tier F clients
// reuse from bosses that a 1-v-1 reception fight never stages.
export const IDLE_IDS = {
  // A — player
  andrew: 336,
  // B — Loop-In bench allies
  janet: 317, alex_it: 56, isaiah: 338, diane: 252,
  // C — story bosses
  karen: 315, chad: 388, grandma: 247, meredith_boss: 310,
  regional_director: 2, firm_partner: 25, firm_associate: 47, firm_paralegal: 311,
  // D — gate enemies
  compliance: 29, regional: 34, skip_boss: 333, restructuring_analyst: 251,
  brand_consultant: 51, data_analytics_lead: 313, cfos_assistant: 314,
  chief_of_restructuring: 312, corporate_lawyer: 250,
  // E — minor enemies (↺ from solo story bosses)
  intern: 333, security_guard: 2, networking_guy: 34, hr_rep: 297, parking_enforcer: 309,
  // F — roguelite client bodies (↺ from bosses a 1-v-1 reception fight cannot stage)
  client_m_young: 251, client_m_athletic: 250, client_m_heavy: 312, client_m_elder: 25,
  client_f_pro: 243, client_f_elder: 249,
  // the pool's fallback body is client_m_young, so it holds client_m_young's stance
  reception_client: 251,
};

// Anything with no slate row (a character added after this table) falls back to
// the two shared calm stances on the old hash, so a new id gets a plausible
// stance instead of a frozen bind pose. Add the row rather than relying on it.
const FALLBACK_STANCES = [336, 338];

const cache = new Map();      // actionId -> { clip, donorRest } | null
const inflight = new Map();   // actionId -> Promise
const retargeted = new Map(); // modelId|aID|clamped -> AnimationClip
let warnedMissingRest = false;

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// THE CASTING AXIS: the model's build, which is the `gender` field
// CharacterBuilder itself branches on for chest width, shoulder line, heel
// height and skirt cut. The six roguelite client bodies are not in
// CHARACTER_CONFIGS at all (they live in MeshyCast.MESHY_MODELS), so their
// build is read off the id — and they are checked FIRST, because for a
// reception fight `id` is the literal string 'reception_client' whose config is
// a mutable placeholder while `modelId` is the body actually on stage.
// Unknown ids default MALE: 23 of 33 are male-built, so a bug that defaults
// female is the loud one.
export function genderFor(id, modelId = id) {
  if (/^client_f_/.test(modelId)) return 'f';
  if (/^client_m_/.test(modelId)) return 'm';
  const config = CHARACTER_CONFIGS[modelId] || CHARACTER_CONFIGS[id];
  return config?.gender === 'f' ? 'f' : 'm';
}

// The catalog id of a character's calm stance. Exported so a harness can name
// the clip it is measuring without duplicating the table.
export function idleIdFor(id, modelId = id) {
  return IDLE_IDS[modelId] ?? IDLE_IDS[id]
    ?? FALLBACK_STANCES[hash(String(id)) % FALLBACK_STANCES.length];
}

// The catalog id of one reaction role for one character.
export function reactionIdFor(role, id, modelId = id) {
  return CLIP_IDS[role]?.[genderFor(id, modelId)] ?? null;
}

// Per-character clip PHASE offset. Kept — and still wanted now that some
// characters share a stance via the reuse rows: two bodies on one stage must
// never breathe in lockstep, which reads as one puppet rig rather than two
// people. Stable per id, so a save reloaded mid-fight looks the same.
export function phaseFor(id) {
  return ((hash(id + '#phase') % 1000) / 1000);
}

function loadClip(actionId) {
  if (cache.has(actionId)) return Promise.resolve(cache.get(actionId)?.clip || null);
  if (inflight.has(actionId)) return inflight.get(actionId);
  if (!actionId) return Promise.resolve(null);
  const p = CLIP_LOADER(`clips/a${actionId}.glb`)
    .then(gltf => {
      const clip = gltf.animations?.[0] || null;
      if (clip) clip.name = `a${actionId}`;
      // The donor rest pose comes off the clip GLB's OWN armature, so the
      // retarget needs no hardcoded donor table and a clip generated on a
      // different rig would still resolve correctly.
      const entry = clip ? { clip, donorRest: captureRest(gltf.scene) } : null;
      cache.set(actionId, entry);
      return clip;
    })
    .catch(err => {
      // A missing reaction clip is not a broken fight — the character simply
      // keeps holding its stance for that beat.
      console.warn(`[meshy] clip a${actionId} unavailable:`, err);
      cache.set(actionId, null);
      return null;
    })
    .finally(() => inflight.delete(actionId));
  inflight.set(actionId, p);
  return p;
}

// Warm the clips an encounter needs, behind the same combat fade that fetches
// the character GLBs.
//
// BOTH genders of every reaction are always warmed (10 files, ~633KB). Loop-In
// can put a bench ally of either build on stage mid-fight, and the beat
// reference durations have to be readable whatever the encounter's cast looks
// like; warming one side would silently degrade the other to its stance.
// The 33 calm stances, by contrast, are genuinely per-encounter: only the
// staged characters' own idles are fetched.
export function preloadClips(ids = []) {
  const want = new Set();
  for (const role of REACTION_ROLES) {
    want.add(CLIP_IDS[role].m);
    want.add(CLIP_IDS[role].f);
  }
  for (const id of ids) want.add(idleIdFor(id));
  return Promise.all([...want].map(loadClip));
}

// The clip set for one character: its slate-assigned calm stance under the
// `idle` role, plus its build's reaction pair. Synchronous — anything not
// warmed is simply absent, and MeshyAnimator degrades that role to the stance
// (and MeshyCast keeps the GLB's own baked idle underneath as the last resort).
export function clipsFor(id, modelId = id, targetRest) {
  const out = {};
  // `stance` selects the posture clamp: forward-flexion limiting belongs to a
  // held calm pose and would fight a reaction that is supposed to double over.
  const clipFor = (actionId, stance) => {
    const entry = cache.get(actionId);
    if (!entry?.clip) return null;
    if (!targetRest?.size || !entry.donorRest?.size) {
      if (!warnedMissingRest) {
        console.warn('[meshy] rest pose unavailable; shared clips will play without retargeting');
        warnedMissingRest = true;
      }
      return entry.clip;
    }
    const key = `${modelId}|a${actionId}|${stance ? 'c' : 'r'}`;
    if (retargeted.has(key)) return retargeted.get(key);
    try {
      let clip = retargetClip(entry.clip, entry.donorRest, targetRest);
      if (stance) clip = clampPosture(clip, targetRest);
      retargeted.set(key, clip);
      return clip;
    } catch (err) {
      console.warn(`[meshy] could not retarget a${actionId} for ${modelId}; using donor clip:`, err);
      retargeted.set(key, entry.clip);
      return entry.clip;
    }
  };

  const stance = clipFor(idleIdFor(id, modelId), true);
  if (stance) out.idle = stance;
  const gender = genderFor(id, modelId);
  for (const role of REACTION_ROLES) {
    const c = clipFor(CLIP_IDS[role][gender], false);
    if (c) out[role] = c;
  }
  // The scheming beat reuses the attack accent rather than holding a dead
  // stance. Splitting `cast` off needs a PAIR: giving the men a distinct cast
  // and the women an aliased one would re-introduce exactly the asymmetry this
  // slate exists to remove, and the study found no female counterpart worth
  // casting. Alias both, or do neither.
  if (out.attack) out.cast = out.attack;
  return out;
}

// The reference beat length for a role, read off the loaded reference clip.
// Null until that clip is warmed, which is why preloadClips() warms both sides.
function referenceDuration(role) {
  return cache.get(BEAT_REFERENCE[role])?.clip?.duration || null;
}

// BEAT NORMALIZATION. Reactions play one-for-one against the wall clock, so a
// gender-split reaction layer also splits the beat DURATION: without this the
// male stagger runs 1.5x the female one and the female attack runs nearly 2x
// the male jab, which reads as enemies being arbitrarily heavier or lighter
// with no design intent behind it. Returns role -> playback multiplier for
// MeshyAnimator.play(). 1 means "already inside the window, do not touch it".
export function beatTimeScales(clips) {
  const out = {};
  for (const role of REACTION_ROLES) {
    const duration = clips?.[role]?.duration;
    const reference = referenceDuration(role);
    if (!duration || !reference) continue;
    const high = reference * (1 + BEAT_TOLERANCE);
    const low = reference * (1 - BEAT_TOLERANCE);
    out[role] = duration > high ? duration / high : (duration < low ? duration / low : 1);
  }
  if (out.attack != null) out.cast = out.attack;
  return out;
}

registerClipProvider(clipsFor, phaseFor, beatTimeScales);

export function isLoaded(actionId) { return cache.has(actionId) && !!cache.get(actionId)?.clip; }
