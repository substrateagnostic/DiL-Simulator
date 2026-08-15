import * as THREE from 'three';

// The void around the room dioramas — v3 for the Display Case rebuild.
// A deep obsidian gradient with the faintest magenta bleed low on the
// horizon: the city's neon breathing against the glass. The v1/v2
// blueprint grid and floor-plan fragments are GONE — critics read the
// faint grid lines under the rooms as exactly the 80s-grid kitsch the
// comp card bans, and they doubled as stray cyan streaks in the frame.
// Wet-black reflections stay; the grid does not.
//
// Engine wiring (done by the orchestrator — see integration notes):
//   import { createVoidBackdrop, RECOMMENDED_FOG } from '../effects/VoidBackdrop.js';
//   this.scene.background = createVoidBackdrop();
//   this.scene.fog = new THREE.Fog(RECOMMENDED_FOG.color, RECOMMENDED_FOG.near, RECOMMENDED_FOG.far);
//
// Note: CityBackdrop.setTimeOfDay() retints fog.color per palette at
// runtime; RECOMMENDED_FOG is the boot value (matches the night keys).

export const RECOMMENDED_FOG = { color: 0x08080f, near: 42, far: 88 };

export function createVoidBackdrop() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Deep obsidian radial gradient, gently lifted at center
  const grad = ctx.createRadialGradient(size / 2, size * 0.44, 80, size / 2, size / 2, size * 0.78);
  grad.addColorStop(0, '#15151f');
  grad.addColorStop(0.55, '#0c0c13');
  grad.addColorStop(1, '#050507');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Magenta horizon bleed — low in frame, the faintest neon haze where
  // the unseen city meets the dark. Wide, soft, restrained.
  const mag = ctx.createLinearGradient(0, size * 0.60, 0, size);
  mag.addColorStop(0, 'rgba(233,69,96,0)');
  mag.addColorStop(0.55, 'rgba(233,69,96,0.045)');
  mag.addColorStop(0.8, 'rgba(214,60,92,0.028)');
  mag.addColorStop(1, 'rgba(180,50,80,0.012)');
  ctx.fillStyle = mag;
  ctx.fillRect(0, size * 0.60, size, size * 0.40);
  // ...and a single breath of sodium beneath it
  const sod = ctx.createLinearGradient(0, size * 0.78, 0, size);
  sod.addColorStop(0, 'rgba(255,154,60,0)');
  sod.addColorStop(0.6, 'rgba(255,154,60,0.02)');
  sod.addColorStop(1, 'rgba(255,154,60,0.008)');
  ctx.fillStyle = sod;
  ctx.fillRect(0, size * 0.78, size, size * 0.22);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * B20 — THE DAY SKY. Playtest, relayed through the act-flag hunt: the acts-3-4
 * "afternoon" city plate reads as night, and it is why more than one reader
 * (the coordinator included) misjudged which act a screenshot was from.
 *
 * The tower palette was not the whole story. `CityBackdrop.TIME_OF_DAY` has
 * always carried separate morning/afternoon keys whose own comment says "pale
 * overcast corporate (Severance) — slabs as milky silhouettes, glass-edge
 * highlights, no neon" — but the SKY those slabs stand against is
 * `createVoidBackdrop()`, a hard-coded obsidian radial with a magenta horizon
 * bleed, installed once at Engine.init and never swapped. So no palette value
 * could ever have made day read as day: dark towers or pale ones, they were
 * standing in front of a black sky with sodium under it.
 *
 * This is that sky's daytime twin, and NOTHING ELSE CHANGES: the obsidian
 * backdrop is untouched and stays the boot value and the one every
 * dusk/night/predawn/goldenhour act uses, so the late-game look — the one the
 * whole Drive/Tron grade was built for — is bit-identical.
 *
 * Overcast, not blue. Severance's exteriors are a white winter sky over a flat
 * horizon; a saturated blue would fight the room interiors, which are lit by
 * cool fluorescents and have no warm key to balance it.
 */
export function createDayBackdrop() {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // High overcast: brightest near the top, settling into a cooler haze at the
  // horizon where the aerial perspective on the far towers takes over.
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#d7dee6');
  grad.addColorStop(0.52, '#c4ccd6');
  grad.addColorStop(0.86, '#aeb8c4');
  grad.addColorStop(1, '#9fa9b6');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // A single soft brightening where the sun is behind the cloud deck. Off
  // centre so the plate is not symmetrical, and very wide so it never reads as
  // a light source — an overcast sky has one bright quarter, not a sun.
  const glow = ctx.createRadialGradient(size * 0.34, size * 0.20, 40, size * 0.34, size * 0.20, size * 0.72);
  glow.addColorStop(0, 'rgba(255,255,255,0.30)');
  glow.addColorStop(0.5, 'rgba(255,255,255,0.11)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // The lowest band picks up a touch of the city's own grey — smog, distance,
  // the same job the night plate's sodium breath does at the other end.
  const low = ctx.createLinearGradient(0, size * 0.74, 0, size);
  low.addColorStop(0, 'rgba(150,160,172,0)');
  low.addColorStop(1, 'rgba(150,160,172,0.34)');
  ctx.fillStyle = low;
  ctx.fillRect(0, size * 0.74, size, size * 0.26);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Which TIME_OF_DAY keys stand under the day sky. The two the CityBackdrop
// palette table itself calls "pale overcast corporate"; everything from
// goldenhour on keeps the obsidian void.
export const DAY_SKY_KEYS = new Set(['morning', 'afternoon']);
