// MESHY COMBAT CAST — registry, lazy loader, session cache.
//
// The rigged Meshy GLBs in public/meshy/ are the DEFAULT combat-stage cast
// (producer ruling, 2026-08-01). Exploration stays 100% procedural and never
// touches this module. `?nomeshy` flips the whole stage back to the procedural
// builds (see MESHY_MODE in utils/constants.js).
//
// Loading discipline:
//   • NOTHING loads at boot. `preload(ids)` is called from the combat
//     transition (ExplorationState._startCombat) so the fetch hides inside the
//     fade-out that was already on screen.
//   • Every GLB is parsed once per session and cached here; a second fight with
//     the same character reuses the parse (`preload` resolves instantly).
//   • Instances are SkeletonUtils clones, so one cached parse can stand on
//     stage twice (mirror fights, ally + enemy overlap) with independent
//     AnimationMixers.
//   • Failure is per-character and silent to the player: `get(id)` returns null
//     and CombatScene falls back to the procedural v7 build for that slot only.
//     A fight can never open on an empty stage because of an asset 404.
import * as THREE from 'three';
import { getHouseGradientMap } from '../effects/MaterialLibrary.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { DEV_MODE } from '../utils/constants.js';
import { captureRest } from './MeshyRetarget.js';

// yaw: extra Y rotation if a GLB's native facing differs from the procedural
// convention (rotation.y = 0 faces +z / the camera). All wave models are +z.
export const MESHY_MODELS = {
  // Pilot pair (proof video, producer-signed)
  karen: { url: 'karen_idle.glb' },
  andrew: { url: 'andrew_idle.glb' },
  // Full combat-cast wave (art/MESHY_WAVE.md). The Algorithm is intentionally
  // absent — the monolith stays procedural by producer order.
  intern: { url: 'intern_idle.glb' },
  chad: { url: 'chad_idle.glb' },
  // Meshy dropped her cane entirely (hands empty) — it is bone-socketed at
  // runtime instead. See MeshyProps.attachCane.
  grandma: { url: 'grandma_idle.glb', props: ['cane'] },
  compliance: { url: 'compliance_idle.glb' },
  regional: { url: 'regional_idle.glb' },
  skip_boss: { url: 'skip_boss_idle.glb' },
  security_guard: { url: 'security_guard_idle.glb' },
  hr_rep: { url: 'hr_rep_idle.glb' },
  restructuring_analyst: { url: 'restructuring_analyst_idle.glb' },
  brand_consultant: { url: 'brand_consultant_idle.glb' },
  corporate_lawyer: { url: 'corporate_lawyer_idle.glb' },
  data_analytics_lead: { url: 'data_analytics_lead_idle.glb' },
  cfos_assistant: { url: 'cfos_assistant_idle.glb' },
  chief_of_restructuring: { url: 'chief_of_restructuring_idle.glb' },
  meredith_boss: { url: 'meredith_boss_idle.glb' },
  regional_director: { url: 'regional_director_idle.glb' },
  parking_enforcer: { url: 'parking_enforcer_idle.glb' },
  networking_guy: { url: 'networking_guy_idle.glb' },
  firm_partner: { url: 'firm_partner_idle.glb' },
  firm_associate: { url: 'firm_associate_idle.glb' },
  firm_paralegal: { url: 'firm_paralegal_idle.glb' },
  // Loop-In bench allies
  janet: { url: 'janet_idle.glb' },
  alex_it: { url: 'alex_it_idle.glb' },
  isaiah: { url: 'isaiah_idle.glb' },
  diane: { url: 'diane_idle.glb' },
  // Roguelite client body pool. `reception_client` is the fallback body; the
  // per-client pick happens in CombatScene via resolveMeshyId().
  client_m_young: { url: 'client_m_young_idle.glb' },
  client_m_athletic: { url: 'client_m_athletic_idle.glb' },
  client_m_heavy: { url: 'client_m_heavy_idle.glb' },
  client_m_elder: { url: 'client_m_elder_idle.glb' },
  client_f_pro: { url: 'client_f_pro_idle.glb' },
  client_f_elder: { url: 'client_f_elder_idle.glb' },
  reception_client: { url: 'client_m_young_idle.glb' },
};

// Vite's BASE_URL is '/' for the Vercel build and './' for `package:itch`
// (which runs `vite build --base=./`). These are runtime fetches, not bundler
// imports, so the base has to be applied by hand or the itch package 404s.
const BASE = (import.meta.env?.BASE_URL || '/') + 'meshy/';

const cache = new Map();    // id -> { scene, animations, restPose } (parsed once per session)
const inflight = new Map(); // id -> Promise
const failed = new Set();   // ids whose GLB 404'd or failed to parse

let _loaderPromise = null;
let _skelUtils = null;

// GLTFLoader + MeshoptDecoder are imported lazily so neither the loader nor the
// ~30KB wasm decoder is in the boot bundle. Runtime GLBs are gltfpack -cc
// (EXT_meshopt_compression + KHR_mesh_quantization) — without the decoder wired
// in, every load throws.
function loader() {
  if (!_loaderPromise) {
    _loaderPromise = Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/libs/meshopt_decoder.module.js'),
      import('three/addons/utils/SkeletonUtils.js'),
    ]).then(([{ GLTFLoader }, { MeshoptDecoder }, skelUtils]) => {
      _skelUtils = skelUtils;
      const l = new GLTFLoader();
      l.setMeshoptDecoder(MeshoptDecoder);
      return l;
    });
  }
  return _loaderPromise;
}

// Convert the GLTF PBR materials to the game's toon family (keeping the Meshy
// base-color texture). MeshStandardMaterial under the arena's summed key/fill/
// rim rig blows out to white-clip and carries a specular term the art direction
// forbids (flat/cel, Archer read); every shipped character/prop is
// MeshToonMaterial on the HOUSE 3-stop ramp, so the import uses that exact
// gradient — same material language, no shine.
function toonify(root) {
  root.traverse(c => {
    if (c.isSkinnedMesh) c.frustumCulled = false;
    if (c.isMesh && c.material) {
      c.material = new THREE.MeshToonMaterial({
        map: c.material.map || null,
        color: 0xffffff,
        gradientMap: getHouseGradientMap(),
      });
    }
  });
}

// Raw GLB fetch on the shared loader — used by MeshyClips for the armature-only
// reaction clips, which need the same meshopt-aware loader but none of the
// material/skeleton handling below.
export function CLIP_LOADER(relUrl) {
  return loader().then(l => new Promise((resolve, reject) => {
    l.load(BASE + relUrl, resolve, undefined, reject);
  }));
}

// Load one character. Resolves to the cached entry, or null on failure — the
// caller (CombatScene) treats null as "use the procedural build".
export function load(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  if (failed.has(id)) return Promise.resolve(null);
  if (inflight.has(id)) return inflight.get(id);
  const def = MESHY_MODELS[id];
  if (!def) return Promise.resolve(null);

  const p = loader().then(l => new Promise(resolve => {
    l.load(BASE + def.url, gltf => {
      try {
        const restPose = captureRest(gltf.scene);
        toonify(gltf.scene);
        // MEASURE ONCE, ON THE ORIGINAL. Box3.setFromObject on a SkeletonUtils
        // clone of a gltfpack-quantized skinned mesh reports ~0 height (the
        // dequantization does not survive the clone's bounds path) — Andrew came
        // out 853725x and vanished off the front stage. The parse-time
        // measurement, taken after an explicit world-matrix update, is correct
        // and is the number every instance is fitted with.
        gltf.scene.updateMatrixWorld(true);
        const nativeHeight = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3()).y;
        const entry = { scene: gltf.scene, animations: gltf.animations || [], def, nativeHeight, restPose };
        cache.set(id, entry);
        resolve(entry);
      } catch (err) {
        console.warn(`[meshy] ${id} parsed but could not be prepared — falling back to procedural:`, err);
        failed.add(id);
        resolve(null);
      }
    }, undefined, err => {
      console.warn(`[meshy] ${id} failed to load (${BASE + def.url}) — falling back to procedural:`, err);
      failed.add(id);
      resolve(null);
    });
  })).catch(err => {
    console.warn(`[meshy] loader unavailable for ${id} — falling back to procedural:`, err);
    failed.add(id);
    return null;
  }).finally(() => inflight.delete(id));

  inflight.set(id, p);
  return p;
}

// Warm the cache for exactly the characters an encounter needs. Called from the
// combat transition so the network cost hides behind the fade. Never rejects.
// Ids are resolved through resolveId first so the roguelite client warms the
// BODY that is actually going to be staged, not the pool default.
export function preload(ids) {
  const want = [...new Set(ids.map(id => resolveId(id, CHARACTER_CONFIGS[id])))]
    .filter(id => MESHY_MODELS[id]);
  if (!want.length) return Promise.resolve([]);
  // The shared clips ride along: both builds' reaction pairs (a fixed ~633KB,
  // because Loop-In can bring a bench ally of either build on stage mid-fight)
  // plus the slate-assigned calm stance of each character this encounter
  // actually stages. `want` is already resolved, so the roguelite client warms
  // the stance of the BODY that will be on the floor, not the pool default.
  return Promise.all([
    ...want.map(load),
    import('./MeshyClips.js').then(m => m.preloadClips(want)).catch(() => null),
  ]);
}

// A ready-to-stage clone of a cached model, or null if it is not cached (either
// not preloaded yet or it failed). Synchronous by design: CombatScene builds the
// stage in one pass and must decide procedural-vs-Meshy per slot without an
// await, so anything not warmed by preload() simply builds procedurally.
export function instance(id) {
  const entry = cache.get(id);
  if (!entry || !_skelUtils) return null;
  // SkeletonUtils.clone rebinds skinned meshes to the cloned skeleton (a plain
  // Object3D.clone shares the bone references and every copy would animate the
  // first one's skeleton). Materials and geometry stay shared.
  const scene = _skelUtils.clone(entry.scene);
  return {
    scene, animations: entry.animations, def: entry.def,
    nativeHeight: entry.nativeHeight, restPose: entry.restPose,
  };
}

// Which GLB a character id should stage. Identity for everyone except the
// roguelite client, which picks a body out of the 6-body pool from the
// generated client's visual config (see pickClientBody).
export function resolveId(id, config) {
  if (id === 'reception_client') return pickClientBody(config);
  return id;
}

// The clip set handed to a MeshyAnimator. The slate-assigned calm stance
// REPLACES the character's own baked idle when it is loaded (producer note: the
// wave idles read as an A-pose); the baked clip stays as the fallback so a
// failed clip fetch degrades to wave-1 behaviour rather than a frozen bind pose.
export function clipsFor(inst, id, modelId = id) {
  const clips = { idle: inst.animations?.[0] || null };
  // The instance's own scene goes with the rest pose: the defeat clip's floor-sit
  // fit probes the MESH to find how far this build's pelvis can sink before
  // something is under the stage, and the answer differs by 14 cm across the
  // cast. It poses and restores the body exactly the way groundOffsets does.
  if (_clipsFor) Object.assign(clips, _clipsFor(id, modelId, inst.restPose, inst.scene));
  return clips;
}

// MeshyClips registers itself here on first load; keeping the reference
// indirect avoids a static import cycle (MeshyClips needs CLIP_LOADER).
let _clipsFor = null;
let _phaseFor = null;
let _beatsFor = null;
let _readyFor = null;
export function registerClipProvider(fn, phaseFn, beatsFn, readyFn) {
  _clipsFor = fn; _phaseFor = phaseFn; _beatsFor = beatsFn; _readyFor = readyFn || null;
}

// CAN THIS SLOT BE STAGED AS A MESHY BODY *RIGHT NOW*?
//
// `instance()` alone is not the question. A body whose GLB is parsed but whose
// shared reaction clips are still in flight stages as a Meshy figure holding its
// baked idle — no attack, no hurt, no cast, for the whole fight. That is the
// A-pose the casting slate exists to remove, and it is indistinguishable from
// "the enemy is not animating" to a player. Everything the fight needs must be
// warm before the body goes on stage; until then CombatScene stands the
// procedural build (which DOES have gestures) and upgrades in place later.
export function isStageable(id, modelId = id) {
  if (!cache.has(modelId) || !_skelUtils) return false;
  return !_readyFor || _readyFor(id, modelId);
}
export function phaseFor(id) { return _phaseFor ? _phaseFor(id) : 0; }
// Per-role playback multipliers that land every build's reaction on the same
// beat length. Empty before MeshyClips has registered, which is exactly the
// old one-for-one behaviour.
export function beatTimeScales(clips) { return _beatsFor ? _beatsFor(clips) : {}; }

// ── roguelite client body pool ──────────────────────────────────────────────
// ClientGenerator hands CombatScene a CHARACTER_CONFIGS-shaped visual config.
// The 6 Meshy client bodies are neutral grey so they can be tinted; this maps
// the generator's gender/age/build signals onto the closest body.
const CLIENT_BODIES = {
  m: { young: 'client_m_young', athletic: 'client_m_athletic', heavy: 'client_m_heavy', elder: 'client_m_elder' },
  f: { young: 'client_f_pro', athletic: 'client_f_pro', heavy: 'client_f_pro', elder: 'client_f_elder' },
};

export function pickClientBody(config = {}) {
  // ClientGenerator stamps an explicit body id onto the visual config
  // (generateVisualConfig → meshyBody). Everything below is the fallback for a
  // config that predates it — a legacy save's serialised `currentClient`.
  if (config.meshyBody && MESHY_MODELS[config.meshyBody]) return config.meshyBody;
  const acc = config.accessories || [];
  const female = config.gender === 'f'
    || ['bun', 'karen', 'shawl'].includes(config.hairStyle)
    || acc.includes('purse');
  const elder = acc.includes('cane');
  const sex = female ? 'f' : 'm';
  const build = elder ? 'elder' : (config.build || 'young');
  const pick = CLIENT_BODIES[sex][build] || CLIENT_BODIES[sex].young;
  return MESHY_MODELS[pick] ? pick : 'reception_client';
}

// RUNTIME TINT for the roguelite client bodies. No-op for the authored cast —
// their colours are baked and correct.
//
// Honest description of what this can and cannot do: each client body is ONE
// mesh on ONE baked atlas, and the atlas already carries skin tone and hair
// colour. There is no clothing-only mask, so a material tint necessarily washes
// the whole figure. The tint is therefore built to be a HUE WASH, not a repaint:
//   • the target is normalised so its brightest channel is 1.0 — the tint can
//     only ever REMOVE light from the other channels, never darken overall,
//   • then pulled 55% back toward white, so even a hot pink blazer lands as a
//     rosy cast rather than pink skin.
// The grey sweater/trousers, being neutral, take almost all of the visible
// shift; skin and hair move a little. That is the trade, and it is why the
// clients read as different people without needing 30 more Meshy generations.
const TINT_STRENGTH = 0.45;
const CLIENT_IDS = new Set(['client_m_young', 'client_m_athletic', 'client_m_heavy',
  'client_m_elder', 'client_f_pro', 'client_f_elder', 'reception_client']);

export function applyTint(root, id, config) {
  const modelId = resolveId(id, config);
  if (!CLIENT_IDS.has(modelId)) return;
  const src = config?.bodyColor;
  if (src == null) return;
  const c = new THREE.Color(src);
  const peak = Math.max(c.r, c.g, c.b) || 1;
  c.setRGB(c.r / peak, c.g / peak, c.b / peak);
  c.lerp(new THREE.Color(0xffffff), 1 - TINT_STRENGTH);
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    // The cached parse's materials are SHARED by every clone — tinting in place
    // would recolour the previous client too. Clone per instance; the texture
    // and the gradient ramp stay shared.
    o.material = o.material.clone();
    o.material.color.copy(c);
  });
}

export function isCached(id) { return cache.has(id); }
export function hasModel(id) { return !!MESHY_MODELS[id] && !failed.has(id); }

// Test/diagnostic hook: forget everything so a reload path can be exercised.
export function _resetCache() { cache.clear(); failed.clear(); inflight.clear(); }

// Harness handle (?dev only) — tools/meshy-entry-timing.mjs measures preload and
// instance costs directly off this, the same way ?dev exposes window.__explore.
if (DEV_MODE && typeof window !== 'undefined') {
  window.__meshyCast = { load, preload, instance, isCached, isStageable, hasModel, resolveId, MESHY_MODELS, _resetCache };
}
