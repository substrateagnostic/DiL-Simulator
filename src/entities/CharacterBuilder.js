import * as THREE from 'three';
import { Materials } from '../effects/MaterialLibrary.js';
import { CHAR } from '../utils/constants.js';

// Build a character from primitives - capsules, spheres, boxes
// options.detailed = true for higher-poly combat close-up models
//
// Silhouette params (all optional, default 1.0 / 0):
//   config.heightScale — scales legs, torso, arms vertically
//   config.widthScale  — scales torso width/depth and stance
//   config.headScale   — scales head + face features + hair
//   config.hunch       — radians of forward stoop (Grandma ~0.35, Janitor ~0.15)
//   config.build       — 'monolith' replaces the humanoid entirely (The Algorithm)
export function buildCharacter(config, options = {}) {
  if (config.build === 'monolith') return buildMonolith(config, options);

  const group = new THREE.Group();
  group.name = config.name || 'character';
  const detailed = options.detailed || false;
  const headSegments = detailed ? 24 : 12;
  const headRings = detailed ? 20 : 10;

  // Silhouette dimensions
  const hs = config.heightScale || 1.0;
  const ws = config.widthScale || 1.0;
  const hd = config.headScale || 1.0;
  const hunch = config.hunch || 0;
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

  // Legs
  const legGeo = new THREE.BoxGeometry(dims.legW, dims.legH, dims.legW);
  const legMat = Materials.custom(config.pantsColor || 0x2a2a3a);
  const shoeMat = Materials.shoes();
  const shoeS = config.shoeSize || 1.0;
  const stanceX = 0.1 * ws;

  const leftLeg = new THREE.Group();
  const leftLegMesh = new THREE.Mesh(legGeo, legMat);
  leftLegMesh.position.y = dims.legH / 2;
  leftLeg.add(leftLegMesh);
  // Shoes
  const shoeGeo = new THREE.BoxGeometry((dims.legW + 0.02) * shoeS, 0.06, (dims.legW + 0.04) * shoeS);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, 0.03, 0.02);
  leftLeg.add(leftShoe);
  leftLeg.position.set(-stanceX, 0, 0);
  group.add(leftLeg);
  group.leftLeg = leftLeg;

  const rightLeg = new THREE.Group();
  const rightLegMesh = new THREE.Mesh(legGeo, legMat);
  rightLegMesh.position.y = dims.legH / 2;
  rightLeg.add(rightLegMesh);
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, 0.03, 0.02);
  rightLeg.add(rightShoe);
  rightLeg.position.set(stanceX, 0, 0);
  group.add(rightLeg);
  group.rightLeg = rightLeg;

  // Body / torso — hunch tips it forward and drops the shoulder line
  const bodyGeo = new THREE.BoxGeometry(dims.bodyW, dims.bodyH, dims.bodyD);
  const bodyMat = Materials.custom(config.bodyColor || 0x2c3e6b);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = dims.legH + dims.bodyH / 2 - Math.sin(hunch) * dims.bodyH * 0.12;
  body.position.z = Math.sin(hunch) * dims.bodyH * 0.18;
  body.rotation.x = hunch;
  group.add(body);
  group.body = body;

  const shoulderY = dims.legH + dims.bodyH - Math.sin(hunch) * dims.bodyH * 0.3;
  const headForward = Math.sin(hunch) * dims.bodyH * 0.55;

  // Collar/shirt detail
  if (config.shirtColor) {
    const collarGeo = new THREE.BoxGeometry(dims.bodyW * 0.6, 0.08, dims.bodyD + 0.01);
    const collarMat = Materials.custom(config.shirtColor);
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.y = shoulderY - 0.02;
    collar.position.z = headForward * 0.7;
    collar.rotation.x = hunch;
    group.add(collar);
  }

  // Tie
  if (config.tieColor) {
    const tieGeo = new THREE.BoxGeometry(0.04, dims.bodyH * 0.6, 0.02);
    const tieMat = Materials.custom(config.tieColor);
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(0, dims.legH + dims.bodyH * 0.55, dims.bodyD / 2 + 0.01 + headForward * 0.5);
    tie.rotation.x = hunch;
    group.add(tie);
  }

  // Arms
  const armGeo = new THREE.BoxGeometry(dims.armW, dims.armH, dims.armW);
  const armMat = Materials.custom(config.bodyColor || 0x2c3e6b);
  const skinMat = Materials.custom(config.skinColor || 0xf5c6a0);

  const leftArm = new THREE.Group();
  const leftArmMesh = new THREE.Mesh(armGeo, armMat);
  leftArmMesh.position.y = -dims.armH / 2 + 0.05;
  leftArm.add(leftArmMesh);
  // Hand — detailed mode uses separate fingers
  if (detailed) {
    const palmGeo = new THREE.BoxGeometry(0.08, 0.04, 0.06);
    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.position.y = -dims.armH + 0.1;
    leftArm.add(palm);
    const fingerGeo = new THREE.BoxGeometry(0.015, 0.04, 0.015);
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(fingerGeo, skinMat);
      finger.position.set(-0.025 + f * 0.017, -dims.armH + 0.07, 0);
      leftArm.add(finger);
    }
    // Thumb
    const thumbGeo = new THREE.BoxGeometry(0.015, 0.03, 0.015);
    const thumb = new THREE.Mesh(thumbGeo, skinMat);
    thumb.position.set(0.045, -dims.armH + 0.09, 0.02);
    thumb.rotation.z = 0.4;
    leftArm.add(thumb);
  } else {
    const handGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.y = -dims.armH + 0.1;
    leftArm.add(leftHand);
  }
  leftArm.position.set(-(dims.bodyW / 2 + dims.armW / 2), shoulderY - 0.05, headForward * 0.6);
  group.add(leftArm);
  group.leftArm = leftArm;

  const rightArm = new THREE.Group();
  const rightArmMesh = new THREE.Mesh(armGeo, armMat);
  rightArmMesh.position.y = -dims.armH / 2 + 0.05;
  rightArm.add(rightArmMesh);
  if (detailed) {
    const palmGeo = new THREE.BoxGeometry(0.08, 0.04, 0.06);
    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.position.y = -dims.armH + 0.1;
    rightArm.add(palm);
    const fingerGeo = new THREE.BoxGeometry(0.015, 0.04, 0.015);
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(fingerGeo, skinMat);
      finger.position.set(-0.025 + f * 0.017, -dims.armH + 0.07, 0);
      rightArm.add(finger);
    }
    const thumbGeo = new THREE.BoxGeometry(0.015, 0.03, 0.015);
    const thumb = new THREE.Mesh(thumbGeo, skinMat);
    thumb.position.set(-0.045, -dims.armH + 0.09, 0.02);
    thumb.rotation.z = -0.4;
    rightArm.add(thumb);
  } else {
    const handGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.y = -dims.armH + 0.1;
    rightArm.add(rightHand);
  }
  rightArm.position.set(dims.bodyW / 2 + dims.armW / 2, shoulderY - 0.05, headForward * 0.6);
  group.add(rightArm);
  group.rightArm = rightArm;

  // Neck (detailed only)
  if (detailed) {
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.08, 12);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = shoulderY + 0.04;
    neck.position.z = headForward * 0.85;
    group.add(neck);
  }

  // Head — higher poly in detailed mode
  const headGeo = new THREE.SphereGeometry(dims.headR, headSegments, headRings);
  const headMat = skinMat;
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = shoulderY + dims.headR * 0.8;
  head.position.z = headForward;
  group.add(head);
  group.head = head;

  const headY = head.position.y;
  const headZ = head.position.z;

  // Hair
  if (config.hairColor) {
    const hairMat = Materials.custom(config.hairColor);
    if (config.hairStyle === 'short') {
      const hairGeo = new THREE.SphereGeometry(dims.headR + 0.02, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = headY + 0.02;
      hair.position.z = headZ;
      group.add(hair);
    } else if (config.hairStyle === 'karen') {
      // "Speak to manager" angular bob
      const hairGeo = new THREE.BoxGeometry(dims.headR * 2.2, dims.headR * 1.2, dims.headR * 2.0);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = headY + dims.headR * 0.2;
      hair.position.z = headZ;
      group.add(hair);
    } else if (config.hairStyle === 'bob') {
      // Sleek executive bob — rounded helmet with blunt bottom edge and fringe
      const capGeo = new THREE.SphereGeometry(dims.headR + 0.03, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.y = headY + 0.02;
      cap.position.z = headZ;
      group.add(cap);
      const sideGeo = new THREE.BoxGeometry(0.05, dims.headR * 1.3, dims.headR * 1.7);
      const leftSide = new THREE.Mesh(sideGeo, hairMat);
      leftSide.position.set(-(dims.headR + 0.01), headY - dims.headR * 0.15, headZ - 0.02);
      group.add(leftSide);
      const rightSide = new THREE.Mesh(sideGeo, hairMat);
      rightSide.position.set(dims.headR + 0.01, headY - dims.headR * 0.15, headZ - 0.02);
      group.add(rightSide);
      const backGeo = new THREE.BoxGeometry(dims.headR * 2.1, dims.headR * 1.4, 0.06);
      const back = new THREE.Mesh(backGeo, hairMat);
      back.position.set(0, headY - dims.headR * 0.1, headZ - dims.headR - 0.01);
      group.add(back);
    } else if (config.hairStyle === 'slick') {
      // Slicked-back finance hair — flattened dome pulled toward the back
      const slickGeo = new THREE.SphereGeometry(dims.headR + 0.025, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const slick = new THREE.Mesh(slickGeo, hairMat);
      slick.scale.set(1, 0.7, 1.15);
      slick.position.y = headY + 0.04;
      slick.position.z = headZ - 0.03;
      group.add(slick);
    } else if (config.hairStyle === 'bun') {
      const hairBase = new THREE.SphereGeometry(dims.headR + 0.02, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const hairMesh = new THREE.Mesh(hairBase, hairMat);
      hairMesh.position.y = headY + 0.02;
      hairMesh.position.z = headZ;
      group.add(hairMesh);
      const bunGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const bun = new THREE.Mesh(bunGeo, hairMat);
      bun.position.set(0, headY + dims.headR + 0.05, headZ - 0.05);
      group.add(bun);
    } else if (config.hairStyle === 'backwards_cap') {
      const capGeo = new THREE.CylinderGeometry(dims.headR + 0.03, dims.headR + 0.03, 0.08, 12);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.y = headY + dims.headR * 0.5;
      cap.position.z = headZ;
      group.add(cap);
      // Backwards brim
      const brimGeo = new THREE.BoxGeometry(0.15, 0.02, 0.12);
      const brim = new THREE.Mesh(brimGeo, hairMat);
      brim.position.set(0, headY + dims.headR * 0.45, headZ - dims.headR - 0.03);
      group.add(brim);
    } else if (config.hairStyle === 'shawl') {
      // Grandma's hair with shawl
      const hairGeo = new THREE.SphereGeometry(dims.headR + 0.04, headSegments, headRings);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = headY;
      hair.position.z = headZ;
      group.add(hair);
    } else {
      // Default medium hair
      const hairGeo = new THREE.SphereGeometry(dims.headR + 0.02, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = headY + 0.02;
      hair.position.z = headZ;
      group.add(hair);
    }
  }

  // Eyes
  const eyeX = dims.headR * 0.35;
  const eyeGeo = new THREE.SphereGeometry(detailed ? 0.035 * hd : 0.03 * hd, detailed ? 10 : 6, detailed ? 10 : 6);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-eyeX, headY + 0.02, headZ + dims.headR - 0.02);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(eyeX, headY + 0.02, headZ + dims.headR - 0.02);
  group.add(rightEye);
  group.leftEye = leftEye;
  group.rightEye = rightEye;

  // Detailed face features
  if (detailed) {
    // Eye whites
    const whiteGeo = new THREE.SphereGeometry(0.04 * hd, 10, 10);
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftWhite = new THREE.Mesh(whiteGeo, whiteMat);
    leftWhite.position.set(-eyeX, headY + 0.02, headZ + dims.headR - 0.03);
    group.add(leftWhite);
    const rightWhite = new THREE.Mesh(whiteGeo, whiteMat);
    rightWhite.position.set(eyeX, headY + 0.02, headZ + dims.headR - 0.03);
    group.add(rightWhite);
    // Move pupils forward
    leftEye.position.z = headZ + dims.headR + 0.005;
    rightEye.position.z = headZ + dims.headR + 0.005;

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(0.06 * hd, 0.015, 0.02);
    const browMat = Materials.custom(config.hairColor || 0x333333);
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-eyeX, headY + 0.065 * hd, headZ + dims.headR - 0.01);
    leftBrow.rotation.z = 0.1;
    group.add(leftBrow);
    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.position.set(eyeX, headY + 0.065 * hd, headZ + dims.headR - 0.01);
    rightBrow.rotation.z = -0.1;
    group.add(rightBrow);

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.02 * hd, 0.05 * hd, 6);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, headY - 0.01, headZ + dims.headR + 0.01);
    nose.rotation.x = -Math.PI / 2;
    group.add(nose);

    // Mouth
    const mouthGeo = new THREE.BoxGeometry(0.06 * hd, 0.012, 0.01);
    const mouthMat = Materials.custom(0xcc6666);
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, headY - 0.05 * hd, headZ + dims.headR - 0.01);
    group.add(mouth);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.03 * hd, 8, 8);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-dims.headR - 0.01, headY, headZ);
    group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(dims.headR + 0.01, headY, headZ);
    group.add(rightEar);
  }

  // Accessories
  if (config.accessories) {
    for (const acc of config.accessories) {
      addAccessory(group, acc, headY, config, dims, headZ);
    }
  }

  // Cast shadows
  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  _addBlobShadow(group, 0.3 * Math.max(ws, 1));

  return group;
}

// Soft contact shadow that follows the character — grounds them far better
// than the mushy directional shadow map at this scale.
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
      mugGroup.position.set(d.bodyW / 2 + d.armW + 0.05, d.legH + d.bodyH * 0.4, 0.05);
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
      mugGroup.position.set(d.bodyW / 2 + d.armW + 0.05, d.legH + d.bodyH * 0.4, 0.05);
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
      board.position.set(-(d.bodyW / 2 + d.armW + 0.1), d.legH + d.bodyH * 0.3, 0.1);
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
      tumbler.position.set(-(d.bodyW / 2 + d.armW + 0.05), d.legH + d.bodyH * 0.3, 0.05);
      group.add(tumbler);
      break;
    }
    case 'sunglasses': {
      const glassesGeo = new THREE.BoxGeometry(d.headR * 2.2, 0.06, 0.02);
      const glasses = new THREE.Mesh(glassesGeo, Materials.custom(0x111111));
      glasses.position.set(0, headY + 0.02, headZ + d.headR);
      group.add(glasses);
      break;
    }
    case 'glasses': {
      // Thin spectacles: two lens frames + bridge
      const frameMat = Materials.custom(0x444455);
      const lensGeo = new THREE.BoxGeometry(d.headR * 0.7, d.headR * 0.45, 0.015);
      const leftLens = new THREE.Mesh(lensGeo, frameMat);
      leftLens.position.set(-d.headR * 0.4, headY + 0.02, headZ + d.headR);
      group.add(leftLens);
      const rightLens = new THREE.Mesh(lensGeo, frameMat);
      rightLens.position.set(d.headR * 0.4, headY + 0.02, headZ + d.headR);
      group.add(rightLens);
      const bridgeGeo = new THREE.BoxGeometry(d.headR * 0.25, 0.015, 0.015);
      const bridge = new THREE.Mesh(bridgeGeo, frameMat);
      bridge.position.set(0, headY + 0.03, headZ + d.headR);
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
      tabGroup.position.set(-(d.bodyW / 2 + d.armW + 0.1), d.legH + d.bodyH * 0.35, 0.12);
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
      bottle.position.set(d.bodyW / 2 + d.armW + 0.05, d.legH + d.bodyH * 0.3, 0.05);
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
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6),
        Materials.custom(0xaa8844)
      );
      handle.position.set(-(d.bodyW / 2 + d.armW + 0.08), d.legH + 0.3, 0);
      group.add(handle);
      break;
    }
    case 'gold_rolex': {
      const watch = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.03, 0.05),
        Materials.custom(0xdaa520)
      );
      watch.position.set(-(d.bodyW / 2 + d.armW / 2), d.legH + d.bodyH * 0.4, 0);
      group.add(watch);
      break;
    }
    case 'cane': {
      const cane = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.012, 0.8, 6),
        Materials.custom(0x663300)
      );
      cane.position.set(d.bodyW / 2 + d.armW + 0.08, 0.4, 0.05);
      group.add(cane);
      // Curved handle
      const handleGeo = new THREE.TorusGeometry(0.04, 0.012, 6, 8, Math.PI);
      const handle = new THREE.Mesh(handleGeo, Materials.custom(0x663300));
      handle.position.set(d.bodyW / 2 + d.armW + 0.08, 0.8, 0.05);
      handle.rotation.x = Math.PI / 2;
      group.add(handle);
      break;
    }
    case 'name_tag': {
      const tagGeo = new THREE.BoxGeometry(0.12, 0.06, 0.01);
      const tag = new THREE.Mesh(tagGeo, Materials.paper());
      tag.position.set(0.08, d.legH + d.bodyH * 0.75, d.bodyD / 2 + 0.01);
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
      tag.position.set(0.08, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.75, CHAR.BODY_DEPTH / 2 + 0.01);
      g.add(tag);
    },
    compliance_pin: (g) => {
      const pin = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 8),
        Materials.custom(0xdd4444)
      );
      pin.position.set(0.08, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.8, CHAR.BODY_DEPTH / 2 + 0.01);
      g.add(pin);
    },
    corner_office_key: (g) => {
      const lanyard = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.15, 0.01),
        Materials.custom(0xdaa520)
      );
      lanyard.position.set(0, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.6, CHAR.BODY_DEPTH / 2 + 0.01);
      g.add(lanyard);
      const key = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.03, 0.01),
        Materials.custom(0xdaa520)
      );
      key.position.set(0, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.5, CHAR.BODY_DEPTH / 2 + 0.01);
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
      pen.position.set(0.12, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.8, CHAR.BODY_DEPTH / 2 + 0.01);
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
