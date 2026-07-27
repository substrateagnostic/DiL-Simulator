import * as THREE from 'three';
import { Materials } from '../effects/MaterialLibrary.js';
import { CHAR } from '../utils/constants.js';
import { paintFaceSet } from './FacePainter.js';

// CharacterBuilder v4 — PS1-era low-poly realism (direction board C with
// board-A palette discipline for the scary tier). Realistic ~5.75
// head-height proportions, segmented faceted geometry, and painted canvas
// face textures: expressions are texture swaps, like it's 1998.
//
// v4.5 (S5-P5): painted cloth textures via Materials.cloth (weave noise,
// button placket on the chest front, belt line on the pelvis) + silhouette
// refinements: angled shoulder caps, toe-tapered shoes, narrower forearms,
// shorter neck. Total height stays ~1.45.
//
// Tone dial (config.tone): 'silly' | 'scary' | 'normal' (default).
// Silly = features exaggerated + saturated; scary = compressed features +
// body palette desaturated ~35%; normal = mild desaturation.
//
// Silhouette params still honored: heightScale, widthScale, headScale,
// hunch, taper. config.build === 'monolith' unchanged (The Algorithm).
//
// Group refs contract (CharacterAnimator/CombatScene):
//   leftLeg rightLeg leftArm rightArm body head — unchanged
//   faceMesh + faceTextures — NEW (texture-swap expressions)
//   legLength — NEW (sitting pose math)
export function buildCharacter(config, options = {}) {
  if (config.build === 'monolith') return buildMonolith(config, options);

  const group = new THREE.Group();
  group.name = config.name || 'character';

  const hs = config.heightScale || 1.0;
  const ws = config.widthScale || 1.0;
  const hd = config.headScale || 1.0;
  const hunch = config.hunch || 0;
  const taper = config.taper || 1.1;
  const tone = config.tone || 'normal';

  // PS1 proportions — total ≈ 1.45 world units at scale 1
  const dims = {
    legH: 0.62 * hs,
    legW: 0.085 * Math.sqrt(ws),
    pelvisH: 0.16 * hs,
    chestH: 0.36 * hs,
    bodyW: 0.34 * ws,
    bodyD: 0.17 * (1 + (ws - 1) * 0.5),
    armH: 0.52 * hs,
    armW: 0.07,
    headW: 0.23 * hd,
    headH: 0.27 * hd,
    headD: 0.23 * hd,
  };
  // Accessory-compat fields (addAccessory contract)
  dims.bodyH = dims.pelvisH + dims.chestH;
  dims.headR = dims.headH / 2;
  group.legLength = dims.legH;

  const tc = (c) => toneColor(c, tone);
  const pantsC = tc(config.pantsColor ?? 0x2a2a3a);
  const bodyC = tc(config.bodyColor ?? 0x2c3e6b);
  const legMat = Materials.custom(pantsC);
  // Painted cloth (weave noise + hem) replaces the flat body color —
  // tone treatment runs first so the cache key carries (color, tone).
  const bodyMat = Materials.cloth(bodyC, 'plain');         // sleeves, sides
  const chestFrontMat = Materials.cloth(bodyC, 'placket'); // button placket
  const beltMat = Materials.cloth(pantsC, 'belt');         // pelvis belt line
  const skinMat = Materials.custom(tc(config.skinColor ?? 0xf5c6a0));
  const shoeMat = Materials.custom(tc(0x1a1a1a));

  // ── Legs — two segments each, lower pre-bent (the PS1 knee) ────────
  const stanceX = dims.bodyW * 0.26;
  const upperLegGeo = new THREE.BoxGeometry(dims.legW * 1.15, dims.legH * 0.52, dims.legW * 1.2);
  const lowerLegGeo = new THREE.BoxGeometry(dims.legW, dims.legH * 0.5, dims.legW);
  const shoeS = (config.shoeSize || 1.0);
  const shoeGeo = new THREE.BoxGeometry(dims.legW * 1.5 * shoeS, 0.055, dims.legW * 2.4 * shoeS);
  {
    // Toe taper — same vertex trick as the head wedge: the front half
    // narrows and the top slopes down toward the toe.
    const pos = shoeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      if (pos.getZ(i) > 0) {
        pos.setX(i, pos.getX(i) * 0.66);
        if (pos.getY(i) > 0) pos.setY(i, pos.getY(i) * 0.45);
      }
    }
    shoeGeo.computeVertexNormals();
  }

  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); // pivot at hip
    const upper = new THREE.Mesh(upperLegGeo, legMat);
    upper.position.y = -dims.legH * 0.26;
    leg.add(upper);
    const lower = new THREE.Mesh(lowerLegGeo, legMat);
    lower.position.set(0, -dims.legH * 0.75, 0.012); // slight forward bend
    leg.add(lower);
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(0, -dims.legH + 0.025, dims.legW * 0.55);
    leg.add(shoe);
    leg.position.set(side * stanceX, dims.legH, 0);
    group.add(leg);
    if (side < 0) group.leftLeg = leg; else group.rightLeg = leg;
  }

  // ── Torso — pelvis + tapered chest, segmented like it's billed hourly ─
  const pelvisGeo = new THREE.BoxGeometry(dims.bodyW * 0.92, dims.pelvisH, dims.bodyD);
  const pelvis = new THREE.Mesh(pelvisGeo, beltMat);
  pelvis.position.y = dims.legH + dims.pelvisH / 2;
  group.add(pelvis);

  const chestGeo = new THREE.BoxGeometry(dims.bodyW, dims.chestH, dims.bodyD);
  // Shoulder taper: widen the top of the chest
  {
    const pos = chestGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 0) {
        pos.setX(i, pos.getX(i) * taper);
        pos.setZ(i, pos.getZ(i) * (1 + (taper - 1) * 0.35));
      } else {
        pos.setX(i, pos.getX(i) * 0.88);
      }
    }
    chestGeo.computeVertexNormals();
  }
  // 6-material array: button placket on the front (+z) face only.
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z.
  const chest = new THREE.Mesh(
    chestGeo,
    [bodyMat, bodyMat, bodyMat, bodyMat, chestFrontMat, bodyMat]
  );
  chest.position.y = dims.legH + dims.pelvisH + dims.chestH / 2 - Math.sin(hunch) * dims.chestH * 0.15;
  chest.position.z = Math.sin(hunch) * dims.chestH * 0.3;
  chest.rotation.x = hunch;
  group.add(chest);
  group.body = chest;

  const shoulderY = dims.legH + dims.pelvisH + dims.chestH - Math.sin(hunch) * dims.chestH * 0.35;
  const shoulderX = (dims.bodyW * taper) / 2;
  const headForward = Math.sin(hunch) * dims.chestH * 0.6;

  // Shirt collar V + tie, painted-on simplicity
  if (config.shirtColor) {
    const collarGeo = new THREE.BoxGeometry(dims.bodyW * 0.5, 0.05, dims.bodyD + 0.012);
    const collar = new THREE.Mesh(collarGeo, Materials.custom(tc(config.shirtColor)));
    collar.position.set(0, shoulderY - 0.035, headForward * 0.6);
    collar.rotation.x = hunch;
    group.add(collar);
  }
  if (config.tieColor) {
    const tieGeo = new THREE.BoxGeometry(0.045, dims.chestH * 0.72, 0.015);
    const tie = new THREE.Mesh(tieGeo, Materials.custom(tc(config.tieColor)));
    tie.position.set(0, shoulderY - dims.chestH * 0.42, dims.bodyD / 2 + 0.012 + headForward * 0.5);
    tie.rotation.x = hunch;
    group.add(tie);
  }

  // ── Arms — two segments, pre-bent at the elbow ──────────────────────
  const upperArmGeo = new THREE.BoxGeometry(dims.armW * 1.1, dims.armH * 0.5, dims.armW * 1.1);
  const lowerArmGeo = new THREE.BoxGeometry(dims.armW * 0.78, dims.armH * 0.46, dims.armW * 0.78);
  const handGeo = new THREE.BoxGeometry(dims.armW * 1.15, 0.07, dims.armW * 1.05);

  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); // pivot at shoulder
    const upper = new THREE.Mesh(upperArmGeo, bodyMat);
    upper.position.y = -dims.armH * 0.25;
    arm.add(upper);
    const lower = new THREE.Mesh(lowerArmGeo, bodyMat);
    lower.position.set(0, -dims.armH * 0.72, 0.02); // elbow pre-bend
    lower.rotation.x = -0.1;
    arm.add(lower);
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.set(0, -dims.armH * 0.97, 0.035);
    arm.add(hand);
    arm.position.set(side * (shoulderX + dims.armW * 0.6), shoulderY - 0.03, headForward * 0.6);
    arm.rotation.z = side * 0.06; // arms hang slightly out
    group.add(arm);
    if (side < 0) group.leftArm = arm; else group.rightArm = arm;
  }

  // Shoulder caps — small angled boxes bridging the arm join. Static on
  // the torso (a jacket shoulder, not a sleeve), so they don't swing.
  const capGeo = new THREE.BoxGeometry(dims.armW * 1.7, 0.05, dims.armW * 1.55);
  for (const side of [-1, 1]) {
    const cap = new THREE.Mesh(capGeo, bodyMat);
    cap.position.set(side * (shoulderX + dims.armW * 0.35), shoulderY - 0.002, headForward * 0.6);
    cap.rotation.z = -side * 0.32; // slope down-outward
    group.add(cap);
  }

  // ── Neck + head — tapered box with the painted face ────────────────
  const neckGeo = new THREE.BoxGeometry(dims.headW * 0.42, 0.055, dims.headW * 0.42);
  const neck = new THREE.Mesh(neckGeo, skinMat);
  neck.position.set(0, shoulderY + 0.018, headForward * 0.85);
  group.add(neck);

  const headGeo = new THREE.BoxGeometry(dims.headW, dims.headH, dims.headD);
  {
    // Taper: narrower jaw than brow — the PS1 head wedge
    const pos = headGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y < 0) {
        pos.setX(i, pos.getX(i) * 0.78);
        pos.setZ(i, pos.getZ(i) * 0.85);
      }
    }
    headGeo.computeVertexNormals();
  }
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.set(0, shoulderY + 0.045 + dims.headH / 2, headForward);
  group.add(head);
  group.head = head;

  const headY = head.position.y;
  const headZ = head.position.z;
  const preHeadChildren = group.children.length;

  // The face — a painted texture plane on the front of the head.
  // Lambert so it takes scene lighting like the rest of the body
  // (MeshBasic glows under bloom and reads as a mask).
  group.faceTextures = paintFaceSet(config);
  if (group.faceTextures.neutral) {
    const faceMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(dims.headW * 0.86, dims.headH * 0.74),
      new THREE.MeshLambertMaterial({ map: group.faceTextures.neutral, transparent: true })
    );
    faceMesh.position.set(0, headY - dims.headH * 0.08, headZ + dims.headD / 2 + 0.004);
    group.add(faceMesh);
    group.faceMesh = faceMesh;
  }

  // ── Hair — geometry caps scaled to the box head ─────────────────────
  if (config.hairColor) {
    const hairMat = Materials.custom(tc(config.hairColor));
    const hw = dims.headW, hh = dims.headH, hdp = dims.headD;
    const style = config.hairStyle || 'short';

    if (style === 'karen') {
      const bob = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.3, hh * 0.95, hdp * 1.15), hairMat);
      bob.position.set(0, headY + hh * 0.28, headZ - hdp * 0.12);
      group.add(bob);
      const sweep = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.32, hh * 0.72, hdp * 0.3), hairMat);
      sweep.position.set(-hw * 0.56, headY + hh * 0.02, headZ + hdp * 0.32);
      sweep.rotation.z = 0.14;
      group.add(sweep);
    } else if (style === 'bob') {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.22, hh * 0.5, hdp * 1.2), hairMat);
      cap.position.set(0, headY + hh * 0.42, headZ - hdp * 0.05);
      group.add(cap);
      for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.14, hh * 0.85, hdp * 1.0), hairMat);
        panel.position.set(side * hw * 0.62, headY + hh * 0.02, headZ - hdp * 0.08);
        group.add(panel);
      }
      const back = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.2, hh * 0.95, hdp * 0.18), hairMat);
      back.position.set(0, headY, headZ - hdp * 0.6);
      group.add(back);
    } else if (style === 'slick') {
      const slick = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.08, hh * 0.32, hdp * 1.1), hairMat);
      slick.position.set(0, headY + hh * 0.46, headZ - hdp * 0.1);
      slick.rotation.x = -0.12;
      group.add(slick);
    } else if (style === 'bun') {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.12, hh * 0.42, hdp * 1.12), hairMat);
      cap.position.set(0, headY + hh * 0.42, headZ - hdp * 0.06);
      group.add(cap);
      const bun = new THREE.Mesh(new THREE.SphereGeometry(hw * 0.22, 6, 5), hairMat);
      bun.position.set(0, headY + hh * 0.52, headZ - hdp * 0.62);
      group.add(bun);
    } else if (style === 'backwards_cap') {
      const band = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.16, hh * 0.22, hdp * 1.16), hairMat);
      band.position.set(0, headY + hh * 0.34, headZ);
      group.add(band);
      const dome = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.06, hh * 0.3, hdp * 1.06), hairMat);
      dome.position.set(0, headY + hh * 0.55, headZ);
      group.add(dome);
      const brim = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.62, 0.02, hdp * 0.5), hairMat);
      brim.position.set(0, headY + hh * 0.3, headZ - hdp * 0.78);
      group.add(brim);
    } else if (style === 'shawl') {
      // Babushka hood: cap above the brow + sides/back only — the face
      // plane must stay fully outside the hood geometry
      const cap = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.24, hh * 0.42, hdp * 1.28), hairMat);
      cap.position.set(0, headY + hh * 0.44, headZ - hdp * 0.1);
      group.add(cap);
      for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(hw * 0.16, hh * 1.0, hdp * 1.1), hairMat);
        panel.position.set(side * hw * 0.64, headY - hh * 0.02, headZ - hdp * 0.12);
        group.add(panel);
      }
      const back = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.24, hh * 1.15, hdp * 0.2), hairMat);
      back.position.set(0, headY - hh * 0.05, headZ - hdp * 0.66);
      group.add(back);
      const knot = new THREE.Mesh(new THREE.SphereGeometry(hw * 0.13, 5, 4), hairMat);
      knot.position.set(0, headY - hh * 0.66, headZ + hdp * 0.42);
      group.add(knot);
    } else { // 'short' and default
      const cap = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.1, hh * 0.4, hdp * 1.1), hairMat);
      cap.position.set(0, headY + hh * 0.42, headZ - hdp * 0.08);
      group.add(cap);
      const back = new THREE.Mesh(new THREE.BoxGeometry(hw * 1.08, hh * 0.5, hdp * 0.16), hairMat);
      back.position.set(0, headY + hh * 0.1, headZ - hdp * 0.58);
      group.add(back);
    }
  }

  // Everything added since the head (face + hair) rides WITH the head —
  // the walk bob animates head.position.y directly and siblings lag a
  // frame behind (the bald-flash bug). attach() preserves world pose.
  for (const child of group.children.slice(preHeadChildren)) {
    head.attach(child);
  }

  // Accessories
  if (config.accessories) {
    for (const acc of config.accessories) {
      addAccessory(group, acc, headY, config, dims, headZ);
    }
  }

  // Cast shadows
  group.traverse(child => {
    if (child.isMesh && !child.userData.noFlash) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  _addBlobShadow(group, 0.30 * Math.max(ws, 1));

  return group;
}

// Tone-driven palette: scary desaturates hard (board-A discipline),
// normal mildly, silly keeps full saturation.
function toneColor(color, tone) {
  const keep = tone === 'scary' ? 0.6 : tone === 'silly' ? 1.0 : 0.86;
  const dark = tone === 'scary' ? 0.9 : 1.0;
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  const lum = 0.3 * r + 0.59 * g + 0.11 * b;
  const mix = (ch) => Math.min(255, Math.round((ch * keep + lum * (1 - keep)) * dark));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

// Shared soft radial gradient for the contact shadow — dark core fading to
// nothing at the rim (a flat uniform disc reads as a hovering coaster, not
// a shadow). Cached: one texture for every character in the scene.
let _blobShadowTex = null;
function _blobShadowTexture() {
  if (_blobShadowTex) return _blobShadowTex;
  // Headless (validate:data smoke test builds a Player in Node): no canvas.
  // Return null → material renders as a solid-colour plane, which never gets
  // rasterised headless anyway. In-game `document` always exists.
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 63);
  g.addColorStop(0, 'rgba(0,0,0,0.95)');
  g.addColorStop(0.4, 'rgba(0,0,0,0.7)');
  g.addColorStop(0.72, 'rgba(0,0,0,0.24)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  _blobShadowTex = new THREE.CanvasTexture(c);
  _blobShadowTex.colorSpace = THREE.SRGBColorSpace;
  _blobShadowTex.minFilter = THREE.LinearFilter;
  _blobShadowTex.generateMipmaps = false;
  return _blobShadowTex;
}

// Soft contact shadow that follows the character — this is the ONLY thing
// grounding the feet to the floor (there is no shadow-casting key light in
// the room scenes), so its strength is doing real work.
//
// CRITIC-TUNED (round 3, "NPC figures stand on a shadowless floor and
// visibly hover"): radial-gradient sprite instead of a flat disc, deeper
// core opacity, and a wider soft footprint. A later L2 lane rebuilds the
// character bodies — it MUST preserve this grounding shadow: keep the
// gradient sprite and these opacity/radius values, do not revert to a flat
// CircleGeometry at opacity 0.22.
function _addBlobShadow(group, radius) {
  const r = radius * 1.5;   // soft falloff means the visible core is smaller
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(r * 2, r * 2),
    new THREE.MeshBasicMaterial({
      map: _blobShadowTexture(),
      color: 0x000000,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
    })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  // renderOrder 2 (was 1): draws AFTER the combat stage's additive magenta
  // floor pool, so the contact ellipse actually darkens the floor under the
  // feet instead of being washed out by the glow (fight-karen "feet dissolve
  // into the void, no contact shadow" note).
  blob.renderOrder = 2;
  blob.userData.noFlash = true;     // excluded from combat white-flash
  blob.castShadow = false;
  blob.receiveShadow = false;
  group.add(blob);
}

// The Algorithm — a floating obsidian slab with a living screen face.
// Exposes the same named refs as a humanoid (body/head/limb stubs) so
// CharacterAnimator and CombatScene treat it interchangeably.
function buildMonolith(config, options = {}) {
  const group = new THREE.Group();
  group.name = config.name || 'algorithm';
  group.isMonolith = true;

  // Obsidian slab
  const slabMat = Materials.custom(0x070b14, { stops: 4 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.9, 0.3), slabMat);
  slab.position.y = 1.2;
  group.add(slab);
  group.body = slab;

  // Glowing edge trim
  const trimMat = Materials.custom(0x00ffee, { emissive: 0x00ffee, emissiveIntensity: 0.9 });
  const vTrimGeo = new THREE.BoxGeometry(0.03, 1.94, 0.05);
  const leftTrim = new THREE.Mesh(vTrimGeo, trimMat);
  leftTrim.position.set(-0.49, 1.2, 0.13);
  group.add(leftTrim);
  const rightTrim = new THREE.Mesh(vTrimGeo, trimMat);
  rightTrim.position.set(0.49, 1.2, 0.13);
  group.add(rightTrim);

  // Screen face — code rain + a red eye
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#020408';
  ctx.fillRect(0, 0, 128, 256);
  ctx.font = '9px monospace';
  for (let col = 0; col < 12; col++) {
    const x = 4 + col * 10;
    const streamLen = 8 + Math.floor(Math.random() * 16);
    const yStart = Math.floor(Math.random() * 100);
    for (let row = 0; row < streamLen; row++) {
      const alpha = (1 - row / streamLen) * 0.8;
      ctx.fillStyle = row === 0 ? 'rgba(180,255,235,0.95)' : `rgba(0,220,180,${alpha})`;
      const ch = String.fromCharCode(0x30 + Math.floor(Math.random() * 74));
      ctx.fillText(ch, x, yStart + row * 10);
    }
  }
  // The eye
  const grad = ctx.createRadialGradient(64, 96, 2, 64, 96, 30);
  grad.addColorStop(0, 'rgba(255,40,60,1)');
  grad.addColorStop(0.35, 'rgba(255,40,60,0.55)');
  grad.addColorStop(1, 'rgba(255,40,60,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 96, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff2030';
  ctx.beginPath();
  ctx.arc(64, 96, 7, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.82, 1.74),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  screen.position.set(0, 1.2, 0.16);
  group.add(screen);
  group.screenFace = screen;

  // Hover ring under the slab
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.025, 8, 32),
    Materials.custom(0x00ffee, { emissive: 0x00ffee, emissiveIntensity: 0.7 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  group.add(ring);

  // Reference head (for taunt bubbles / targeting math)
  group.head = new THREE.Object3D();
  group.head.position.set(0, 2.3, 0);
  group.add(group.head);

  // Stub limbs so CharacterAnimator no-ops cleanly
  group.leftLeg = new THREE.Group();
  group.rightLeg = new THREE.Group();
  group.leftArm = new THREE.Group();
  group.rightArm = new THREE.Group();
  group.add(group.leftLeg, group.rightLeg, group.leftArm, group.rightArm);

  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  _addBlobShadow(group, 0.45);

  return group;
}

function addAccessory(group, acc, headY, config, dims, headZ = 0) {
  const d = dims || {
    legH: CHAR.LEG_HEIGHT, bodyW: CHAR.BODY_WIDTH, bodyH: CHAR.BODY_HEIGHT,
    bodyD: CHAR.BODY_DEPTH, armW: CHAR.ARM_WIDTH, armH: CHAR.ARM_HEIGHT, headR: CHAR.HEAD_RADIUS,
  };
  // Where the hands actually are — mirrors the v4 arm construction
  // (shoulder at legH+bodyH-0.03, hand at -armH*0.97 below it).
  const handY = d.legH + d.bodyH - 0.03 - d.armH * 0.97;
  const handX = (d.bodyW * (config?.taper || 1.1)) / 2 + d.armW + 0.03;
  switch (acc) {
    case 'coffee_mug': {
      const mugGroup = new THREE.Group();
      const mugBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.036, 0.08, 8),
        Materials.mug()
      );
      mugGroup.add(mugBody);
      const handleGeo = new THREE.TorusGeometry(0.024, 0.007, 6, 8, Math.PI);
      const handle = new THREE.Mesh(handleGeo, Materials.mug());
      handle.position.set(0.04, 0, 0);
      handle.rotation.y = Math.PI / 2;
      mugGroup.add(handle);
      const liquid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034, 0.034, 0.015, 8),
        Materials.coffee()
      );
      liquid.position.y = 0.032;
      mugGroup.add(liquid);
      mugGroup.position.set(handX + 0.02, handY + 0.05, 0.06);
      group.add(mugGroup);
      group.rightArm?.attach(mugGroup); // held items ride the arm swing
      group.mugAccessory = mugGroup;
      break;
    }
    case 'boss_mug': {
      const mug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.042, 0.1, 8),
        Materials.mugRed()
      );
      mug.position.set(handX + 0.02, handY + 0.05, 0.06);
      group.add(mug);
      group.rightArm?.attach(mug);
      break;
    }
    case 'bluetooth_earpiece': {
      const ear = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.045, 0.018),
        Materials.custom(0x333333)
      );
      ear.position.set(d.headR + 0.085, headY, headZ);
      group.add(ear);
      break;
    }
    case 'clipboard': {
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(0.17, 0.24, 0.015),
        Materials.custom(0x8b6e4e)
      );
      board.position.set(-(handX + 0.02), handY + 0.1, 0.09);
      board.rotation.z = 0.08;
      group.add(board);
      group.leftArm?.attach(board);
      const paper = new THREE.Mesh(
        new THREE.BoxGeometry(0.145, 0.2, 0.005),
        Materials.paper()
      );
      paper.position.set(0, 0.005, 0.011);
      board.add(paper);
      break;
    }
    case 'wine_tumbler': {
      const tumbler = new THREE.Mesh(
        new THREE.CylinderGeometry(0.032, 0.028, 0.1, 8),
        Materials.custom(0x888888)
      );
      tumbler.position.set(-(handX + 0.02), handY + 0.05, 0.05);
      group.add(tumbler);
      group.leftArm?.attach(tumbler);
      break;
    }
    case 'sunglasses': {
      const glasses = new THREE.Mesh(
        new THREE.BoxGeometry(d.headR * 2.0, 0.05, 0.02),
        Materials.custom(0x111111)
      );
      glasses.position.set(0, headY + d.headR * 0.16, headZ + d.headR * 0.92);
      group.add(glasses);
      break;
    }
    case 'glasses': {
      const frameMat = Materials.custom(0x444455);
      for (const side of [-1, 1]) {
        const lens = new THREE.Mesh(
          new THREE.BoxGeometry(d.headR * 0.62, d.headR * 0.42, 0.012),
          frameMat
        );
        lens.position.set(side * d.headR * 0.42, headY + d.headR * 0.14, headZ + d.headR * 0.95);
        group.add(lens);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(d.headR * 0.24, 0.012, 0.012), frameMat);
      bridge.position.set(0, headY + d.headR * 0.18, headZ + d.headR * 0.95);
      group.add(bridge);
      break;
    }
    case 'tablet': {
      const tabGroup = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 0.012), Materials.custom(0x222230));
      tabGroup.add(slab);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.155, 0.215, 0.004),
        Materials.custom(0x88ccff, { emissive: 0x88ccff, emissiveIntensity: 0.5 })
      );
      screen.position.z = 0.009;
      tabGroup.add(screen);
      tabGroup.position.set(-(handX + 0.02), handY + 0.1, 0.1);
      tabGroup.rotation.set(-0.18, 0, 0.1);
      group.add(tabGroup);
      group.leftArm?.attach(tabGroup);
      break;
    }
    case 'pearl_earrings': {
      const pearlGeo = new THREE.SphereGeometry(0.016, 8, 8);
      const pearlMat = Materials.custom(0xf2ecdc, { stops: 4 });
      for (const side of [-1, 1]) {
        const pearl = new THREE.Mesh(pearlGeo, pearlMat);
        pearl.position.set(side * (d.headR + 0.078), headY - 0.03, headZ);
        group.add(pearl);
      }
      break;
    }
    case 'protein_shake': {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034, 0.034, 0.15, 8),
        Materials.custom(0x44aa44)
      );
      bottle.position.set(handX + 0.02, handY + 0.07, 0.05);
      group.add(bottle);
      group.rightArm?.attach(bottle);
      break;
    }
    case 'purse': {
      const purse = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.11, 0.05),
        Materials.custom(0xaa6633)
      );
      purse.position.set(-(d.bodyW / 2 + 0.1), d.legH + 0.06, 0);
      group.add(purse);
      // Chain strap up to the shoulder — board B said so
      const strap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, d.bodyH * 0.85, 5),
        Materials.custom(0xc8a030)
      );
      strap.position.set(-(d.bodyW / 2 + 0.05), d.legH + d.bodyH * 0.55, 0);
      strap.rotation.z = 0.18;
      group.add(strap);
      break;
    }
    case 'mop': {
      const mopLen = Math.max(0.9, handY + 0.5);
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.013, mopLen, 6),
        Materials.custom(0xaa8844)
      );
      handle.position.set(-(handX + 0.03), mopLen / 2 + 0.04, 0.04);
      group.add(handle);
      const mopHead = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, 0.12, 6),
        Materials.custom(0xd8d4c0)
      );
      mopHead.position.set(-(handX + 0.03), 0.06, 0.04);
      group.add(mopHead);
      break;
    }
    case 'gold_rolex': {
      const watch = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.025, 0.04),
        Materials.custom(0xdaa520)
      );
      watch.position.set(-(handX - 0.01), handY + 0.12, 0.02);
      group.add(watch);
      group.leftArm?.attach(watch);
      break;
    }
    case 'cane': {
      const caneLen = Math.max(0.4, handY + 0.04);
      const caneMat = Materials.custom(0x663300);
      const cane = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.011, caneLen, 6),
        caneMat
      );
      cane.position.set(handX + 0.02, caneLen / 2, 0.06);
      group.add(cane);
      const handle = new THREE.Mesh(
        new THREE.TorusGeometry(0.034, 0.011, 6, 8, Math.PI),
        caneMat
      );
      handle.position.set(handX + 0.02, caneLen + 0.008, 0.06);
      handle.rotation.x = Math.PI / 2;
      group.add(handle);
      break;
    }
    case 'name_tag': {
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.008), Materials.paper());
      tag.position.set(0.07, d.legH + d.bodyH * 0.72, d.bodyD / 2 + 0.02);
      tag.rotation.z = 0.15; // Crooked!
      group.add(tag);
      break;
    }
    case 'golf_putter': {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.85, 6),
        Materials.metal()
      );
      shaft.position.set(handX + 0.12, 0.43, -0.08);
      shaft.rotation.z = 0.15;
      group.add(shaft);
      group.rightArm?.attach(shaft);
      break;
    }
    // ---- Cosmetic equipment visuals (Andrew only) ----
    default: {
      if (typeof acc === 'string' && acc.startsWith('cosmetic_')) {
        _addCosmeticVisual(group, acc.replace('cosmetic_', ''), headY, d, headZ);
      }
      break;
    }
  }
}

function _addCosmeticVisual(group, cosmeticId, headY, d, headZ = 0) {
  const handX = d.bodyW / 2 + d.armW + 0.03;
  const COSMETIC_VISUALS = {
    // Hats
    visor_green: (g) => {
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(d.headR * 2.1, 0.035, 0.13),
        Materials.custom(0x22aa44)
      );
      visor.position.set(0, headY + d.headR * 0.6, headZ + d.headR * 0.5);
      g.add(visor);
    },
    party_hat: (g) => {
      const hat = new THREE.Mesh(
        new THREE.ConeGeometry(d.headR * 0.65, 0.2, 8),
        Materials.custom(0xff4488)
      );
      hat.position.set(0, headY + d.headR + 0.1, headZ);
      g.add(hat);
    },
    tin_foil_hat: (g) => {
      const hat = new THREE.Mesh(
        new THREE.ConeGeometry(d.headR * 0.85, 0.16, 6),
        Materials.custom(0xcccccc)
      );
      hat.position.set(0, headY + d.headR + 0.07, headZ);
      g.add(hat);
    },
    executives_fedora: (g) => {
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(d.headR * 0.68, d.headR * 0.78, 0.1, 12),
        Materials.custom(0x333333)
      );
      crown.position.set(0, headY + d.headR * 0.82, headZ);
      g.add(crown);
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(d.headR * 1.25, d.headR * 1.25, 0.016, 12),
        Materials.custom(0x333333)
      );
      brim.position.set(0, headY + d.headR * 0.72, headZ);
      g.add(brim);
    },
    // Glasses
    reading_glasses: (g) => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(d.headR * 1.9, 0.035, 0.012),
        Materials.custom(0x888888)
      );
      frame.position.set(0, headY + d.headR * 0.14, headZ + d.headR * 0.95);
      g.add(frame);
    },
    blue_light_blockers: (g) => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(d.headR * 1.9, 0.045, 0.012),
        Materials.custom(0x4488ff)
      );
      frame.position.set(0, headY + d.headR * 0.14, headZ + d.headR * 0.95);
      g.add(frame);
    },
    power_shades: (g) => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(d.headR * 2.05, 0.05, 0.016),
        Materials.custom(0x111111)
      );
      frame.position.set(0, headY + d.headR * 0.14, headZ + d.headR * 0.92);
      g.add(frame);
    },
    // Badges
    intern_badge: (g) => {
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.05, 0.008), Materials.paper());
      tag.position.set(0.07, d.legH + d.bodyH * 0.72, d.bodyD / 2 + 0.02);
      g.add(tag);
    },
    compliance_pin: (g) => {
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), Materials.custom(0xdd4444));
      pin.position.set(0.07, d.legH + d.bodyH * 0.78, d.bodyD / 2 + 0.02);
      g.add(pin);
    },
    corner_office_key: (g) => {
      const lanyard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.13, 0.008), Materials.custom(0xdaa520));
      lanyard.position.set(0, d.legH + d.bodyH * 0.58, d.bodyD / 2 + 0.02);
      g.add(lanyard);
      const key = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.008), Materials.custom(0xdaa520));
      key.position.set(0, d.legH + d.bodyH * 0.48, d.bodyD / 2 + 0.02);
      g.add(key);
    },
    // Accessories
    stress_ball_clip: (g) => {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), Materials.custom(0xff6633));
      ball.position.set(d.bodyW / 2 + 0.025, d.legH + 0.04, 0);
      g.add(ball);
    },
    fountain_pen: (g) => {
      const pen = new THREE.Mesh(
        new THREE.CylinderGeometry(0.007, 0.005, 0.1, 6),
        Materials.custom(0x111111)
      );
      pen.position.set(0.1, d.legH + d.bodyH * 0.78, d.bodyD / 2 + 0.02);
      pen.rotation.z = 0.3;
      g.add(pen);
    },
    janitors_keyring: (g) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.025, 0.004, 6, 12),
        Materials.custom(0xaaaaaa)
      );
      ring.position.set(d.bodyW / 2 + 0.04, d.legH + 0.08, 0);
      g.add(ring);
    },
    golden_calculator: (g) => {
      const calc = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.008), Materials.custom(0xdaa520));
      calc.position.set(-handX, d.legH + d.bodyH * 0.35, 0.05);
      g.add(calc);
    },
  };

  const visualFn = COSMETIC_VISUALS[cosmeticId];
  if (visualFn) visualFn(group);
}
