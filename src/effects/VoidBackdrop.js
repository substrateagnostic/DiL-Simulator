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
