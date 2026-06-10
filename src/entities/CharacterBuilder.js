import * as THREE from 'three';
import { Materials } from '../effects/MaterialLibrary.js';
import { CHAR } from '../utils/constants.js';

// Build a low-poly caricature character. Flat-shaded faceted geometry
// (icosahedron heads, hex-cylinder bodies), modeled faces (brows, nose,
// jaw, swappable mouths) with an expression rig driven by
// CharacterAnimator.setExpression().
//
// options.detailed = true for higher-detail combat close-ups (fingers, neck)
//
// Silhouette params (all optional, default 1.0 / 0):
//   config.heightScale — scales legs, torso, arms vertically
//   config.widthScale  — scales torso width and stance
//   config.headScale   — scales head + face features + hair
//   config.hunch       — radians of forward stoop (Grandma ~0.35)
//   config.taper       — shoulder:waist ratio (Chad ~1.45, default 1.12)
//   config.build       — 'monolith' replaces the humanoid (The Algorithm)
//
// Caricature face params (all optional):
//   config.browAngle   — resting brow rotation: -0.3 scowl .. +0.3 worried
//   config.noseScale   — 1.0 default; Ross 1.35, Rachel 0.8
//   config.jawScale    — 1.0 default; Chad 1.5
//   config.mouthWidth  — 1.0 default
//
// Group refs contract (consumed by CharacterAnimator/CombatScene — keep):
//   leftLeg rightLeg leftArm rightArm body head leftEye rightEye face
export function buildCharacter(config, options = {}) {
  if (config.build === 'monolith') return buildMonolith(config, options);

  const group = new THREE.Group();
  group.name = config.name || 'character';
  const detailed = options.detailed || false;

  // Silhouette dimensions — caricature boost: heads run 15% bigger
  const hs = config.heightScale || 1.0;
  const ws = config.widthScale || 1.0;
  const hd = (config.headScale || 1.0) * 1.15;
  const hunch = config.hunch || 0;
  const taper = config.taper || 1.12;
  const dims = {
    legW: CHAR.LEG_WIDTH,
    legH: CHAR.LEG_HEIGHT * hs,
    bodyW: CHAR.BODY_WIDTH * ws,
    bodyH: CHAR.BODY_HEIGHT * hs,
    bodyD: CHAR.BODY_DEPTH * (1 + (ws - 1) * 0.6),
    armW: CHAR.ARM_WIDTH,
    armH: CHAR.ARM_HEIGHT * hs,
    headR: CHAR.HEAD_RADIUS * hd,
  };
  const face = {
    brow: config.browAngle ?? 0,
    nose: config.noseScale ?? 1,
    jaw: config.jawScale ?? 1,
    mouthW: config.mouthWidth ?? 1,
  };

  const legMat = Materials.custom(config.pantsColor || 0x2a2a3a);
  const shoeMat = Materials.shoes();
  const bodyMat = Materials.custom(config.bodyColor || 0x2c3e6b);
  const skinMat = Materials.custom(config.skinColor || 0xf5c6a0);

  // ── Legs — pentagon cylinders, chunky shoes ─────────────────────────
  const shoeS = (config.shoeSize || 1.0) * 1.15;
  const stanceX = 0.1 * ws;
  const legGeo = new THREE.CylinderGeometry(dims.legW * 0.62, dims.legW * 0.55, dims.legH, 5);
  const shoeGeo = new THREE.BoxGeometry((dims.legW + 0.03) * shoeS, 0.07, (dims.legW + 0.06) * shoeS);

  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    const legMesh = new THREE.Mesh(legGeo, legMat);
    legMesh.position.y = dims.legH / 2;
    leg.add(legMesh);
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(0, 0.035, 0.03);
    leg.add(shoe);
    leg.position.set(side * stanceX, 0, 0);
    group.add(leg);
    if (side < 0) group.leftLeg = leg; else group.rightLeg = leg;
  }

  // ── Torso — hexagonal cylinder, shoulders wider than waist ──────────
  const shoulderR = (dims.bodyW / 2) * taper;
  const waistR = (dims.bodyW / 2) * 0.82;
  const bodyGeo = new THREE.CylinderGeometry(shoulderR, waistR, dims.bodyH, 6);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = dims.legH + dims.bodyH / 2 - Math.sin(hunch) * dims.bodyH * 0.12;
  body.position.z = Math.sin(hunch) * dims.bodyH * 0.18;
  body.rotation.x = hunch;
  group.add(body);
  group.body = body;

  const shoulderY = dims.legH + dims.bodyH - Math.sin(hunch) * dims.bodyH * 0.3;
  const headForward = Math.sin(hunch) * dims.bodyH * 0.55;

  // Collar/shirt detail — hexagonal ring at the neckline
  if (config.shirtColor) {
    const collarGeo = new THREE.CylinderGeometry(shoulderR * 0.72, shoulderR * 0.78, 0.08, 6);
    const collar = new THREE.Mesh(collarGeo, Materials.custom(config.shirtColor));
    collar.position.y = shoulderY - 0.02;
    collar.position.z = headForward * 0.7;
    collar.rotation.x = hunch;
    group.add(collar);
  }

  // Tie
  if (config.tieColor) {
    const tieGeo = new THREE.BoxGeometry(0.05, dims.bodyH * 0.55, 0.025);
    const tie = new THREE.Mesh(tieGeo, Materials.custom(config.tieColor));
    tie.position.set(0, dims.legH + dims.bodyH * 0.55, waistR + (shoulderR - waistR) * 0.55 + 0.02 + headForward * 0.5);
    tie.rotation.x = hunch;
    group.add(tie);
    const knotGeo = new THREE.ConeGeometry(0.05, 0.06, 4);
    const knot = new THREE.Mesh(knotGeo, Materials.custom(config.tieColor));
    knot.position.set(0, shoulderY - 0.07, tie.position.z + 0.015);
    knot.rotation.x = Math.PI + hunch;
    group.add(knot);
  }

  // ── Arms — pentagon cylinders with chunky mitt hands ─────────────────
  const armGeo = new THREE.CylinderGeometry(dims.armW * 0.62, dims.armW * 0.5, dims.armH, 5);
  const handGeo = new THREE.IcosahedronGeometry(0.075, 0);

  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    const armMesh = new THREE.Mesh(armGeo, bodyMat);
    armMesh.position.y = -dims.armH / 2 + 0.05;
    arm.add(armMesh);
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.y = -dims.armH + 0.09;
    arm.add(hand);
    if (detailed) {
      // A thumb wedge is all a mitt needs
      const thumbGeo = new THREE.ConeGeometry(0.02, 0.05, 4);
      const thumb = new THREE.Mesh(thumbGeo, skinMat);
      thumb.position.set(side * -0.05, -dims.armH + 0.1, 0.02);
      thumb.rotation.z = side * -0.6;
      arm.add(thumb);
    }
    arm.position.set(side * (shoulderR + dims.armW * 0.45), shoulderY - 0.05, headForward * 0.6);
    group.add(arm);
    if (side < 0) group.leftArm = arm; else group.rightArm = arm;
  }

  // Neck (detailed only)
  if (detailed) {
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.075, 0.09, 6);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = shoulderY + 0.04;
    neck.position.z = headForward * 0.85;
    group.add(neck);
  }

  // ── Head — faceted icosahedron, slightly tall ────────────────────────
  const headGeo = new THREE.IcosahedronGeometry(dims.headR, 1);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.scale.y = 1.08;
  head.position.y = shoulderY + dims.headR * 0.85;
  head.position.z = headForward;
  group.add(head);
  group.head = head;

  const headY = head.position.y;
  const headZ = head.position.z;

  // Faces squish DOWN under hair/hats so headwear sits ON the head
  // rather than the face floating up into the hairline.
  const FACE_DROP = {
    karen: 0.18, backwards_cap: 0.14, bob: 0.13, shawl: 0.12,
    bun: 0.07, short: 0.06, slick: 0.05,
  };
  const fy = dims.headR * (FACE_DROP[config.hairStyle] ?? 0.05);
  group.userData.faceDrop = fy;

  // Jaw/chin block — rendered as a beard when config.beard is set
  const beardMat = config.beard ? Materials.custom(config.beardColor || config.hairColor || 0x6a4a2a) : null;
  const jawGeo = new THREE.BoxGeometry(
    dims.headR * (config.beard ? 1.0 : 0.85) * face.jaw,
    dims.headR * (config.beard ? 0.52 : 0.38),
    dims.headR * (config.beard ? 0.62 : 0.5) * face.jaw
  );
  const jaw = new THREE.Mesh(jawGeo, beardMat || skinMat);
  jaw.position.set(0, headY - dims.headR * (config.beard ? 0.72 : 0.78), headZ + dims.headR * 0.28);
  group.add(jaw);
  if (config.beard) {
    // Moustache strip above the mouth
    const stacheGeo = new THREE.BoxGeometry(dims.headR * 0.5, dims.headR * 0.12, 0.03);
    const stache = new THREE.Mesh(stacheGeo, beardMat);
    stache.position.set(0, headY - dims.headR * 0.32 - fy * 0.6, headZ + dims.headR * 0.82);
    group.add(stache);
  }

  // ── Face rig (positions already account for the face drop) ──────────
  const eyeX = dims.headR * 0.38;
  const eyeY = headY + dims.headR * 0.06 - fy;
  const faceZ = headZ + dims.headR * 0.78;

  // Eyes: white + pupil, always (caricature standard)
  const whiteGeo = new THREE.SphereGeometry(dims.headR * 0.21, 8, 6);
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const pupilGeo = new THREE.SphereGeometry(dims.headR * 0.1, 6, 5);
  const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a22 });

  const leftEye = new THREE.Group();
  const lw = new THREE.Mesh(whiteGeo, whiteMat);
  lw.scale.z = 0.55;
  leftEye.add(lw);
  const lp = new THREE.Mesh(pupilGeo, pupilMat);
  lp.position.z = dims.headR * 0.14;
  leftEye.add(lp);
  leftEye.position.set(-eyeX, eyeY, faceZ);
  group.add(leftEye);
  group.leftEye = leftEye;

  const rightEye = leftEye.clone();
  rightEye.position.x = eyeX;
  group.add(rightEye);
  group.rightEye = rightEye;

  // Brows — the main expression instrument
  const browMat = Materials.custom(config.hairColor || 0x3a2a1a);
  const browGeo = new THREE.BoxGeometry(dims.headR * 0.58, dims.headR * 0.13, dims.headR * 0.13);
  const browY = headY + dims.headR * 0.45 - fy;
  const browL = new THREE.Mesh(browGeo, browMat);
  browL.position.set(-eyeX, browY, faceZ);
  browL.rotation.z = -face.brow;
  group.add(browL);
  const browR = new THREE.Mesh(browGeo, browMat);
  browR.position.set(eyeX, browY, faceZ);
  browR.rotation.z = face.brow;
  group.add(browR);

  // Nose — four-sided pyramid
  const noseGeo = new THREE.ConeGeometry(dims.headR * 0.16 * face.nose, dims.headR * 0.45 * face.nose, 4);
  const noseMesh = new THREE.Mesh(noseGeo, skinMat);
  noseMesh.position.set(0, headY - dims.headR * 0.12 - fy, headZ + dims.headR * 0.92);
  noseMesh.rotation.x = -Math.PI / 2;
  group.add(noseMesh);

  // Mouths — one visible at a time, swapped by expression
  const mouthMat = Materials.custom(0x6a3030);
  const mouthY = headY - dims.headR * 0.46 - fy * 0.6;
  const mouthZ = headZ + dims.headR * 0.8;
  const mw = face.mouthW;

  const mouths = {};
  mouths.neutral = new THREE.Mesh(new THREE.BoxGeometry(dims.headR * 0.42 * mw, 0.018, 0.02), mouthMat);
  mouths.smile = new THREE.Mesh(new THREE.TorusGeometry(dims.headR * 0.26 * mw, 0.018, 4, 10, Math.PI), mouthMat);
  mouths.smile.rotation.z = Math.PI; // bow downward = smile
  mouths.smile.position.y = dims.headR * 0.1;
  mouths.frown = new THREE.Mesh(new THREE.TorusGeometry(dims.headR * 0.22 * mw, 0.018, 4, 10, Math.PI), mouthMat);
  mouths.frown.position.y = -dims.headR * 0.12;
  mouths.o = new THREE.Mesh(new THREE.TorusGeometry(dims.headR * 0.12, 0.02, 4, 8), mouthMat);
  mouths.grim = new THREE.Mesh(new THREE.BoxGeometry(dims.headR * 0.55 * mw, 0.05, 0.02), Materials.custom(0x402020));

  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, mouthY, mouthZ);
  for (const [key, mesh] of Object.entries(mouths)) {
    mesh.visible = key === 'neutral';
    mouthGroup.add(mesh);
  }
  group.add(mouthGroup);

  // Expression rig handle (consumed by CharacterAnimator.setExpression)
  group.face = {
    browL, browR,
    browBaseL: browL.rotation.z,
    browBaseR: browR.rotation.z,
    browBaseY: browY,
    mouths,
  };

  // Ears (detailed only)
  if (detailed) {
    const earGeo = new THREE.IcosahedronGeometry(dims.headR * 0.16, 0);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(side * (dims.headR + 0.005), headY, headZ);
      ear.scale.set(0.6, 1, 0.8);
      group.add(ear);
    }
  }

  // ── Hair (flat-shades into facets automatically) ─────────────────────
  if (config.hairColor) {
    const hairMat = Materials.custom(config.hairColor);
    const headSegments = detailed ? 16 : 10;
    const headRings = detailed ? 12 : 8;
    if (config.hairStyle === 'short') {
      const hairGeo = new THREE.SphereGeometry(dims.headR + 0.025, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, headY + 0.02, headZ);
      group.add(hair);
    } else if (config.hairStyle === 'karen') {
      // Angular bob sits back off the face so brows/eyes stay readable
      const hairGeo = new THREE.BoxGeometry(dims.headR * 2.2, dims.headR * 1.15, dims.headR * 1.6);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, headY + dims.headR * 0.3, headZ - dims.headR * 0.25);
      group.add(hair);
      // Bangs shelf above the brows
      const bangsGeo = new THREE.BoxGeometry(dims.headR * 1.7, dims.headR * 0.3, dims.headR * 0.5);
      const bangs = new THREE.Mesh(bangsGeo, hairMat);
      bangs.position.set(0, headY + dims.headR * 0.72, headZ + dims.headR * 0.5);
      group.add(bangs);
      // The asymmetric front sweep
      const sweepGeo = new THREE.BoxGeometry(dims.headR * 0.55, dims.headR * 1.1, dims.headR * 0.45);
      const sweep = new THREE.Mesh(sweepGeo, hairMat);
      sweep.position.set(-dims.headR * 0.95, headY - dims.headR * 0.05, headZ + dims.headR * 0.45);
      sweep.rotation.z = 0.15;
      group.add(sweep);
    } else if (config.hairStyle === 'bob') {
      const capGeo = new THREE.SphereGeometry(dims.headR + 0.03, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.set(0, headY + 0.02, headZ);
      group.add(cap);
      const sideGeo = new THREE.BoxGeometry(0.06, dims.headR * 1.3, dims.headR * 1.6);
      for (const side of [-1, 1]) {
        const panel = new THREE.Mesh(sideGeo, hairMat);
        panel.position.set(side * (dims.headR + 0.01), headY - dims.headR * 0.15, headZ - 0.02);
        group.add(panel);
      }
      const backGeo = new THREE.BoxGeometry(dims.headR * 2.1, dims.headR * 1.4, 0.07);
      const back = new THREE.Mesh(backGeo, hairMat);
      back.position.set(0, headY - dims.headR * 0.1, headZ - dims.headR - 0.01);
      group.add(back);
    } else if (config.hairStyle === 'slick') {
      const slickGeo = new THREE.SphereGeometry(dims.headR + 0.025, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const slick = new THREE.Mesh(slickGeo, hairMat);
      slick.scale.set(1, 0.7, 1.15);
      slick.position.set(0, headY + 0.045, headZ - 0.03);
      group.add(slick);
    } else if (config.hairStyle === 'bun') {
      const hairBase = new THREE.SphereGeometry(dims.headR + 0.025, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const hairMesh = new THREE.Mesh(hairBase, hairMat);
      hairMesh.position.set(0, headY + 0.02, headZ);
      group.add(hairMesh);
      const bun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), hairMat);
      bun.position.set(0, headY + dims.headR + 0.05, headZ - 0.06);
      group.add(bun);
    } else if (config.hairStyle === 'backwards_cap') {
      const capGeo = new THREE.CylinderGeometry(dims.headR + 0.035, dims.headR + 0.035, 0.09, 8);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.set(0, headY + dims.headR * 0.5, headZ);
      group.add(cap);
      const brimGeo = new THREE.BoxGeometry(0.16, 0.025, 0.13);
      const brim = new THREE.Mesh(brimGeo, hairMat);
      brim.position.set(0, headY + dims.headR * 0.45, headZ - dims.headR - 0.035);
      group.add(brim);
    } else if (config.hairStyle === 'shawl') {
      // Hood sits behind the face — a babushka, not an egg
      const hoodGeo = new THREE.SphereGeometry(dims.headR + 0.05, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.72);
      const hood = new THREE.Mesh(hoodGeo, hairMat);
      hood.position.set(0, headY + 0.01, headZ - dims.headR * 0.22);
      group.add(hood);
      // Rim framing the face
      const rimGeo = new THREE.TorusGeometry(dims.headR * 0.95, dims.headR * 0.13, 5, 12, Math.PI * 1.25);
      const rim = new THREE.Mesh(rimGeo, hairMat);
      rim.position.set(0, headY + dims.headR * 0.05, headZ + dims.headR * 0.42);
      rim.rotation.z = Math.PI * 0.88;
      group.add(rim);
      // Knot under the chin
      const knot = new THREE.Mesh(new THREE.IcosahedronGeometry(dims.headR * 0.18, 0), hairMat);
      knot.position.set(0, headY - dims.headR * 0.95, headZ + dims.headR * 0.45);
      group.add(knot);
    } else {
      const hairGeo = new THREE.SphereGeometry(dims.headR + 0.025, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.set(0, headY + 0.02, headZ);
      group.add(hair);
    }
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

  _addBlobShadow(group, 0.3 * Math.max(ws, 1));

  return group;
}

// Soft contact shadow that follows the character.
function _addBlobShadow(group, radius) {
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.015;
  blob.renderOrder = 1;
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
  // Where the hands actually are — mirrors the arm construction above
  // (shoulder at legH+bodyH-0.05, hand at -armH+0.09 below it). Held items
  // anchor here so short/hunched/scaled skeletons still hold their props.
  const handY = d.legH + d.bodyH - 0.05 - d.armH + 0.09;
  const handX = d.bodyW / 2 + d.armW + 0.04;
  switch (acc) {
    case 'coffee_mug': {
      const mugGroup = new THREE.Group();
      const mugBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.045, 0.1, 8),
        Materials.mug()
      );
      mugBody.position.y = 0;
      mugGroup.add(mugBody);
      // Handle
      const handleGeo = new THREE.TorusGeometry(0.03, 0.008, 6, 8, Math.PI);
      const handle = new THREE.Mesh(handleGeo, Materials.mug());
      handle.position.set(0.05, 0, 0);
      handle.rotation.y = Math.PI / 2;
      mugGroup.add(handle);
      // Coffee liquid
      const liquidGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.02, 8);
      const liquid = new THREE.Mesh(liquidGeo, Materials.coffee());
      liquid.position.y = 0.04;
      mugGroup.add(liquid);
      mugGroup.position.set(handX + 0.02, handY + 0.03, 0.05);
      group.add(mugGroup);
      group.mugAccessory = mugGroup;
      break;
    }
    case 'boss_mug': {
      const mugGroup = new THREE.Group();
      const mugBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.05, 0.12, 8),
        Materials.mugRed()
      );
      mugGroup.add(mugBody);
      mugGroup.position.set(handX + 0.02, handY + 0.03, 0.05);
      group.add(mugGroup);
      break;
    }
    case 'bluetooth_earpiece': {
      const earGeo = new THREE.BoxGeometry(0.03, 0.05, 0.02);
      const ear = new THREE.Mesh(earGeo, Materials.custom(0x333333));
      ear.position.set(d.headR + 0.01, headY + 0.02, headZ);
      group.add(ear);
      break;
    }
    case 'clipboard': {
      const boardGeo = new THREE.BoxGeometry(0.2, 0.28, 0.02);
      const board = new THREE.Mesh(boardGeo, Materials.custom(0x8b6e4e));
      board.position.set(-(handX + 0.05), handY + 0.07, 0.1);
      board.rotation.z = 0.1;
      group.add(board);
      // Paper on clipboard
      const paperGeo = new THREE.BoxGeometry(0.17, 0.24, 0.005);
      const paper = new THREE.Mesh(paperGeo, Materials.paper());
      paper.position.set(0, 0.01, 0.013);
      board.add(paper);
      break;
    }
    case 'wine_tumbler': {
      const tumbler = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.035, 0.12, 8),
        Materials.custom(0x888888)
      );
      tumbler.position.set(-(handX + 0.02), handY + 0.03, 0.05);
      group.add(tumbler);
      break;
    }
    case 'sunglasses': {
      const fy = group.userData.faceDrop || 0;
      const glassesGeo = new THREE.BoxGeometry(d.headR * 2.2, 0.07, 0.025);
      const glasses = new THREE.Mesh(glassesGeo, Materials.custom(0x111111));
      glasses.position.set(0, headY + d.headR * 0.08 - fy, headZ + d.headR * 0.82);
      group.add(glasses);
      break;
    }
    case 'glasses': {
      // Thin spectacles: two lens frames + bridge (track the face drop)
      const fy = group.userData.faceDrop || 0;
      const frameMat = Materials.custom(0x444455);
      const lensGeo = new THREE.BoxGeometry(d.headR * 0.7, d.headR * 0.45, 0.015);
      const leftLens = new THREE.Mesh(lensGeo, frameMat);
      leftLens.position.set(-d.headR * 0.38, headY + d.headR * 0.06 - fy, headZ + d.headR * 0.86);
      group.add(leftLens);
      const rightLens = new THREE.Mesh(lensGeo, frameMat);
      rightLens.position.set(d.headR * 0.38, headY + d.headR * 0.06 - fy, headZ + d.headR * 0.86);
      group.add(rightLens);
      const bridgeGeo = new THREE.BoxGeometry(d.headR * 0.25, 0.015, 0.015);
      const bridge = new THREE.Mesh(bridgeGeo, frameMat);
      bridge.position.set(0, headY + d.headR * 0.1 - fy, headZ + d.headR * 0.86);
      group.add(bridge);
      break;
    }
    case 'tablet': {
      const tabGroup = new THREE.Group();
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.3, 0.015),
        Materials.custom(0x222230)
      );
      tabGroup.add(slab);
      const screen = new THREE.Mesh(
        new THREE.BoxGeometry(0.19, 0.26, 0.005),
        Materials.custom(0x88ccff, { emissive: 0x88ccff, emissiveIntensity: 0.5 })
      );
      screen.position.z = 0.011;
      tabGroup.add(screen);
      tabGroup.position.set(-(handX + 0.05), handY + 0.08, 0.12);
      tabGroup.rotation.z = 0.12;
      tabGroup.rotation.x = -0.2;
      group.add(tabGroup);
      break;
    }
    case 'pearl_earrings': {
      const pearlGeo = new THREE.SphereGeometry(0.022, 8, 8);
      const pearlMat = Materials.custom(0xf2ecdc, { stops: 4 });
      const leftPearl = new THREE.Mesh(pearlGeo, pearlMat);
      leftPearl.position.set(-(d.headR + 0.015), headY - 0.04, headZ);
      group.add(leftPearl);
      const rightPearl = new THREE.Mesh(pearlGeo, pearlMat);
      rightPearl.position.set(d.headR + 0.015, headY - 0.04, headZ);
      group.add(rightPearl);
      break;
    }
    case 'protein_shake': {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8),
        Materials.custom(0x44aa44)
      );
      bottle.position.set(handX + 0.02, handY + 0.05, 0.05);
      group.add(bottle);
      break;
    }
    case 'purse': {
      const purse = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.12, 0.06),
        Materials.custom(0xaa6633)
      );
      purse.position.set(-(d.bodyW / 2 + 0.15), d.legH + d.bodyH * 0.2, 0);
      group.add(purse);
      break;
    }
    case 'mop': {
      // Planted: head on the floor, shaft rising past the gripping hand
      const mopLen = Math.max(0.8, handY + 0.45);
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, mopLen, 6),
        Materials.custom(0xaa8844)
      );
      handle.position.set(-(handX + 0.03), mopLen / 2 + 0.04, 0.04);
      group.add(handle);
      const mopHead = new THREE.Mesh(
        new THREE.ConeGeometry(0.07, 0.14, 6),
        Materials.custom(0xd8d4c0)
      );
      mopHead.position.set(-(handX + 0.03), 0.07, 0.04);
      group.add(mopHead);
      break;
    }
    case 'gold_rolex': {
      const watch = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.03, 0.05),
        Materials.custom(0xdaa520)
      );
      watch.position.set(-(handX - 0.02), handY + 0.08, 0);
      group.add(watch);
      break;
    }
    case 'cane': {
      // Planted on the floor, handle meeting the hand — sized to the skeleton
      const caneLen = Math.max(0.3, handY);
      const caneMat = Materials.custom(0x663300);
      const cane = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.012, caneLen, 6),
        caneMat
      );
      cane.position.set(handX + 0.02, caneLen / 2, 0.06);
      group.add(cane);
      // Curved handle at hand height
      const handleGeo = new THREE.TorusGeometry(0.04, 0.012, 6, 8, Math.PI);
      const handle = new THREE.Mesh(handleGeo, caneMat);
      handle.position.set(handX + 0.02, caneLen + 0.01, 0.06);
      handle.rotation.x = Math.PI / 2;
      group.add(handle);
      break;
    }
    case 'name_tag': {
      const tagGeo = new THREE.BoxGeometry(0.12, 0.06, 0.01);
      const tag = new THREE.Mesh(tagGeo, Materials.paper());
      tag.position.set(0.08, d.legH + d.bodyH * 0.75, d.bodyD / 2 + 0.06);
      tag.rotation.z = 0.15; // Crooked!
      group.add(tag);
      break;
    }
    case 'golf_putter': {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.9, 6),
        Materials.metal()
      );
      shaft.position.set(d.bodyW / 2 + 0.2, 0.45, -0.1);
      shaft.rotation.z = 0.15;
      group.add(shaft);
      break;
    }
    // ---- Cosmetic equipment visuals ----
    default: {
      if (typeof acc === 'string' && acc.startsWith('cosmetic_')) {
        _addCosmeticVisual(group, acc.replace('cosmetic_', ''), headY, config);
      }
      break;
    }
  }
}

function _addCosmeticVisual(group, cosmeticId, headY) {
  // Render cosmetic equipment visuals based on the cosmetic ID
  const COSMETIC_VISUALS = {
    // Hats
    visor_green: (g, hy) => {
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(CHAR.HEAD_RADIUS * 2.2, 0.04, 0.15),
        Materials.custom(0x22aa44)
      );
      visor.position.set(0, hy + CHAR.HEAD_RADIUS * 0.5, CHAR.HEAD_RADIUS * 0.5);
      g.add(visor);
    },
    party_hat: (g, hy) => {
      const hat = new THREE.Mesh(
        new THREE.ConeGeometry(CHAR.HEAD_RADIUS * 0.7, 0.25, 8),
        Materials.custom(0xff4488)
      );
      hat.position.set(0, hy + CHAR.HEAD_RADIUS + 0.1, 0);
      g.add(hat);
    },
    tin_foil_hat: (g, hy) => {
      const hat = new THREE.Mesh(
        new THREE.ConeGeometry(CHAR.HEAD_RADIUS * 0.9, 0.2, 6),
        Materials.custom(0xcccccc)
      );
      hat.position.set(0, hy + CHAR.HEAD_RADIUS + 0.05, 0);
      g.add(hat);
    },
    executives_fedora: (g, hy) => {
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(CHAR.HEAD_RADIUS * 0.7, CHAR.HEAD_RADIUS * 0.8, 0.12, 12),
        Materials.custom(0x333333)
      );
      crown.position.set(0, hy + CHAR.HEAD_RADIUS * 0.6, 0);
      g.add(crown);
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(CHAR.HEAD_RADIUS * 1.3, CHAR.HEAD_RADIUS * 1.3, 0.02, 12),
        Materials.custom(0x333333)
      );
      brim.position.set(0, hy + CHAR.HEAD_RADIUS * 0.5, 0);
      g.add(brim);
    },
    // Glasses
    reading_glasses: (g, hy) => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(CHAR.HEAD_RADIUS * 2.0, 0.04, 0.015),
        Materials.custom(0x888888)
      );
      frame.position.set(0, hy + 0.02, CHAR.HEAD_RADIUS + 0.005);
      g.add(frame);
    },
    blue_light_blockers: (g, hy) => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(CHAR.HEAD_RADIUS * 2.0, 0.05, 0.015),
        Materials.custom(0x4488ff)
      );
      frame.position.set(0, hy + 0.02, CHAR.HEAD_RADIUS + 0.005);
      g.add(frame);
    },
    power_shades: (g, hy) => {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(CHAR.HEAD_RADIUS * 2.2, 0.06, 0.02),
        Materials.custom(0x111111)
      );
      frame.position.set(0, hy + 0.02, CHAR.HEAD_RADIUS);
      g.add(frame);
    },
    // Badges
    intern_badge: (g) => {
      const tag = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.06, 0.01),
        Materials.paper()
      );
      tag.position.set(0.08, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.75, CHAR.BODY_DEPTH / 2 + 0.05);
      g.add(tag);
    },
    compliance_pin: (g) => {
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 8),
        Materials.custom(0xdd4444)
      );
      pin.position.set(0.08, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.8, CHAR.BODY_DEPTH / 2 + 0.05);
      g.add(pin);
    },
    corner_office_key: (g) => {
      const lanyard = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.15, 0.01),
        Materials.custom(0xdaa520)
      );
      lanyard.position.set(0, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.6, CHAR.BODY_DEPTH / 2 + 0.05);
      g.add(lanyard);
      const key = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.03, 0.01),
        Materials.custom(0xdaa520)
      );
      key.position.set(0, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.5, CHAR.BODY_DEPTH / 2 + 0.05);
      g.add(key);
    },
    // Accessories
    stress_ball_clip: (g) => {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        Materials.custom(0xff6633)
      );
      ball.position.set(CHAR.BODY_WIDTH / 2 + 0.03, CHAR.LEG_HEIGHT + 0.05, 0);
      g.add(ball);
    },
    fountain_pen: (g) => {
      const pen = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.006, 0.12, 6),
        Materials.custom(0x111111)
      );
      pen.position.set(0.12, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.8, CHAR.BODY_DEPTH / 2 + 0.05);
      pen.rotation.z = 0.3;
      g.add(pen);
    },
    janitors_keyring: (g) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.03, 0.005, 6, 12),
        Materials.custom(0xaaaaaa)
      );
      ring.position.set(CHAR.BODY_WIDTH / 2 + 0.05, CHAR.LEG_HEIGHT + 0.1, 0);
      g.add(ring);
    },
    golden_calculator: (g) => {
      const calc = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.09, 0.01),
        Materials.custom(0xdaa520)
      );
      calc.position.set(-(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH + 0.08), CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.35, 0.05);
      g.add(calc);
    },
  };

  const visualFn = COSMETIC_VISUALS[cosmeticId];
  if (visualFn) visualFn(group, headY);
}
