import * as THREE from 'three';
import { Materials } from '../effects/MaterialLibrary.js';
import { CHAR } from '../utils/constants.js';

// Build a character from primitives - capsules, spheres, boxes
// options.detailed = true for higher-poly combat close-up models
export function buildCharacter(config, options = {}) {
  const group = new THREE.Group();
  group.name = config.name || 'character';
  const detailed = options.detailed || false;
  const headSegments = detailed ? 24 : 12;
  const headRings = detailed ? 20 : 10;

  // Legs
  const legGeo = new THREE.BoxGeometry(CHAR.LEG_WIDTH, CHAR.LEG_HEIGHT, CHAR.LEG_WIDTH);
  const legMat = Materials.custom(config.pantsColor || 0x2a2a3a);
  const shoeMat = Materials.shoes();
  const shoeS = config.shoeSize || 1.0;

  const leftLeg = new THREE.Group();
  const leftLegMesh = new THREE.Mesh(legGeo, legMat);
  leftLegMesh.position.y = CHAR.LEG_HEIGHT / 2;
  leftLeg.add(leftLegMesh);
  // Shoes
  const shoeGeo = new THREE.BoxGeometry((CHAR.LEG_WIDTH + 0.02) * shoeS, 0.06, (CHAR.LEG_WIDTH + 0.04) * shoeS);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, 0.03, 0.02);
  leftLeg.add(leftShoe);
  leftLeg.position.set(-0.1, 0, 0);
  group.add(leftLeg);
  group.leftLeg = leftLeg;

  const rightLeg = new THREE.Group();
  const rightLegMesh = new THREE.Mesh(legGeo, legMat);
  rightLegMesh.position.y = CHAR.LEG_HEIGHT / 2;
  rightLeg.add(rightLegMesh);
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, 0.03, 0.02);
  rightLeg.add(rightShoe);
  rightLeg.position.set(0.1, 0, 0);
  group.add(rightLeg);
  group.rightLeg = rightLeg;

  // Body / torso
  const bodyGeo = new THREE.BoxGeometry(CHAR.BODY_WIDTH, CHAR.BODY_HEIGHT, CHAR.BODY_DEPTH);
  const bodyMat = Materials.custom(config.bodyColor || 0x2c3e6b);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT / 2;
  group.add(body);
  group.body = body;

  // Collar/shirt detail
  if (config.shirtColor) {
    const collarGeo = new THREE.BoxGeometry(CHAR.BODY_WIDTH * 0.6, 0.08, CHAR.BODY_DEPTH + 0.01);
    const collarMat = Materials.custom(config.shirtColor);
    const collar = new THREE.Mesh(collarGeo, collarMat);
    collar.position.y = CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT - 0.02;
    group.add(collar);
  }

  // Tie
  if (config.tieColor) {
    const tieGeo = new THREE.BoxGeometry(0.04, CHAR.BODY_HEIGHT * 0.6, 0.02);
    const tieMat = Materials.custom(config.tieColor);
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(0, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.55, CHAR.BODY_DEPTH / 2 + 0.01);
    group.add(tie);
  }

  // Arms
  const armGeo = new THREE.BoxGeometry(CHAR.ARM_WIDTH, CHAR.ARM_HEIGHT, CHAR.ARM_WIDTH);
  const armMat = Materials.custom(config.bodyColor || 0x2c3e6b);
  const skinMat = Materials.custom(config.skinColor || 0xf5c6a0);

  const leftArm = new THREE.Group();
  const leftArmMesh = new THREE.Mesh(armGeo, armMat);
  leftArmMesh.position.y = -CHAR.ARM_HEIGHT / 2 + 0.05;
  leftArm.add(leftArmMesh);
  // Hand — detailed mode uses separate fingers
  if (detailed) {
    const palmGeo = new THREE.BoxGeometry(0.08, 0.04, 0.06);
    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.position.y = -CHAR.ARM_HEIGHT + 0.1;
    leftArm.add(palm);
    const fingerGeo = new THREE.BoxGeometry(0.015, 0.04, 0.015);
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(fingerGeo, skinMat);
      finger.position.set(-0.025 + f * 0.017, -CHAR.ARM_HEIGHT + 0.07, 0);
      leftArm.add(finger);
    }
    // Thumb
    const thumbGeo = new THREE.BoxGeometry(0.015, 0.03, 0.015);
    const thumb = new THREE.Mesh(thumbGeo, skinMat);
    thumb.position.set(0.045, -CHAR.ARM_HEIGHT + 0.09, 0.02);
    thumb.rotation.z = 0.4;
    leftArm.add(thumb);
  } else {
    const handGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.y = -CHAR.ARM_HEIGHT + 0.1;
    leftArm.add(leftHand);
  }
  leftArm.position.set(-(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH / 2), CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT - 0.05, 0);
  group.add(leftArm);
  group.leftArm = leftArm;

  const rightArm = new THREE.Group();
  const rightArmMesh = new THREE.Mesh(armGeo, armMat);
  rightArmMesh.position.y = -CHAR.ARM_HEIGHT / 2 + 0.05;
  rightArm.add(rightArmMesh);
  if (detailed) {
    const palmGeo = new THREE.BoxGeometry(0.08, 0.04, 0.06);
    const palm = new THREE.Mesh(palmGeo, skinMat);
    palm.position.y = -CHAR.ARM_HEIGHT + 0.1;
    rightArm.add(palm);
    const fingerGeo = new THREE.BoxGeometry(0.015, 0.04, 0.015);
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(fingerGeo, skinMat);
      finger.position.set(-0.025 + f * 0.017, -CHAR.ARM_HEIGHT + 0.07, 0);
      rightArm.add(finger);
    }
    const thumbGeo = new THREE.BoxGeometry(0.015, 0.03, 0.015);
    const thumb = new THREE.Mesh(thumbGeo, skinMat);
    thumb.position.set(-0.045, -CHAR.ARM_HEIGHT + 0.09, 0.02);
    thumb.rotation.z = -0.4;
    rightArm.add(thumb);
  } else {
    const handGeo = new THREE.SphereGeometry(0.055, 8, 8);
    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.y = -CHAR.ARM_HEIGHT + 0.1;
    rightArm.add(rightHand);
  }
  rightArm.position.set(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH / 2, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT - 0.05, 0);
  group.add(rightArm);
  group.rightArm = rightArm;

  // Neck (detailed only)
  if (detailed) {
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.07, 0.08, 12);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT + 0.04;
    group.add(neck);
  }

  // Head — higher poly in detailed mode
  const headGeo = new THREE.SphereGeometry(CHAR.HEAD_RADIUS, headSegments, headRings);
  const headMat = skinMat;
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT + CHAR.HEAD_RADIUS * 0.8;
  group.add(head);
  group.head = head;

  // Hair
  if (config.hairColor) {
    const hairMat = Materials.custom(config.hairColor);
    if (config.hairStyle === 'short') {
      const hairGeo = new THREE.SphereGeometry(CHAR.HEAD_RADIUS + 0.02, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.6);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = head.position.y + 0.02;
      group.add(hair);
    } else if (config.hairStyle === 'karen') {
      // "Speak to manager" angular bob
      const hairGeo = new THREE.BoxGeometry(CHAR.HEAD_RADIUS * 2.2, CHAR.HEAD_RADIUS * 1.2, CHAR.HEAD_RADIUS * 2.0);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = head.position.y + CHAR.HEAD_RADIUS * 0.2;
      group.add(hair);
    } else if (config.hairStyle === 'bun') {
      const hairBase = new THREE.SphereGeometry(CHAR.HEAD_RADIUS + 0.02, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const hairMesh = new THREE.Mesh(hairBase, hairMat);
      hairMesh.position.y = head.position.y + 0.02;
      group.add(hairMesh);
      const bunGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const bun = new THREE.Mesh(bunGeo, hairMat);
      bun.position.set(0, head.position.y + CHAR.HEAD_RADIUS + 0.05, -0.05);
      group.add(bun);
    } else if (config.hairStyle === 'backwards_cap') {
      const capGeo = new THREE.CylinderGeometry(CHAR.HEAD_RADIUS + 0.03, CHAR.HEAD_RADIUS + 0.03, 0.08, 12);
      const cap = new THREE.Mesh(capGeo, hairMat);
      cap.position.y = head.position.y + CHAR.HEAD_RADIUS * 0.5;
      group.add(cap);
      // Backwards brim
      const brimGeo = new THREE.BoxGeometry(0.15, 0.02, 0.12);
      const brim = new THREE.Mesh(brimGeo, hairMat);
      brim.position.set(0, head.position.y + CHAR.HEAD_RADIUS * 0.45, -CHAR.HEAD_RADIUS - 0.03);
      group.add(brim);
    } else if (config.hairStyle === 'shawl') {
      // Grandma's hair with shawl
      const hairGeo = new THREE.SphereGeometry(CHAR.HEAD_RADIUS + 0.04, headSegments, headRings);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = head.position.y;
      group.add(hair);
    } else {
      // Default medium hair
      const hairGeo = new THREE.SphereGeometry(CHAR.HEAD_RADIUS + 0.02, headSegments, headRings, 0, Math.PI * 2, 0, Math.PI * 0.55);
      const hair = new THREE.Mesh(hairGeo, hairMat);
      hair.position.y = head.position.y + 0.02;
      group.add(hair);
    }
  }

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(detailed ? 0.035 : 0.03, detailed ? 10 : 6, detailed ? 10 : 6);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.07, head.position.y + 0.02, CHAR.HEAD_RADIUS - 0.02);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.07, head.position.y + 0.02, CHAR.HEAD_RADIUS - 0.02);
  group.add(rightEye);

  // Detailed face features
  if (detailed) {
    // Eye whites
    const whiteGeo = new THREE.SphereGeometry(0.04, 10, 10);
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftWhite = new THREE.Mesh(whiteGeo, whiteMat);
    leftWhite.position.set(-0.07, head.position.y + 0.02, CHAR.HEAD_RADIUS - 0.03);
    group.add(leftWhite);
    const rightWhite = new THREE.Mesh(whiteGeo, whiteMat);
    rightWhite.position.set(0.07, head.position.y + 0.02, CHAR.HEAD_RADIUS - 0.03);
    group.add(rightWhite);
    // Move pupils forward
    leftEye.position.z = CHAR.HEAD_RADIUS + 0.005;
    rightEye.position.z = CHAR.HEAD_RADIUS + 0.005;

    // Eyebrows
    const browGeo = new THREE.BoxGeometry(0.06, 0.015, 0.02);
    const browMat = Materials.custom(config.hairColor || 0x333333);
    const leftBrow = new THREE.Mesh(browGeo, browMat);
    leftBrow.position.set(-0.07, head.position.y + 0.065, CHAR.HEAD_RADIUS - 0.01);
    leftBrow.rotation.z = 0.1;
    group.add(leftBrow);
    const rightBrow = new THREE.Mesh(browGeo, browMat);
    rightBrow.position.set(0.07, head.position.y + 0.065, CHAR.HEAD_RADIUS - 0.01);
    rightBrow.rotation.z = -0.1;
    group.add(rightBrow);

    // Nose
    const noseGeo = new THREE.ConeGeometry(0.02, 0.05, 6);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, head.position.y - 0.01, CHAR.HEAD_RADIUS + 0.01);
    nose.rotation.x = -Math.PI / 2;
    group.add(nose);

    // Mouth
    const mouthGeo = new THREE.BoxGeometry(0.06, 0.012, 0.01);
    const mouthMat = Materials.custom(0xcc6666);
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, head.position.y - 0.05, CHAR.HEAD_RADIUS - 0.01);
    group.add(mouth);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-CHAR.HEAD_RADIUS - 0.01, head.position.y, 0);
    group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(CHAR.HEAD_RADIUS + 0.01, head.position.y, 0);
    group.add(rightEar);
  }

  // Accessories
  if (config.accessories) {
    for (const acc of config.accessories) {
      addAccessory(group, acc, head.position.y, config);
    }
  }

  // Cast shadows
  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

function addAccessory(group, acc, headY, config) {
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
      mugGroup.position.set(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH + 0.05, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.4, 0.05);
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
      mugGroup.position.set(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH + 0.05, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.4, 0.05);
      group.add(mugGroup);
      break;
    }
    case 'bluetooth_earpiece': {
      const earGeo = new THREE.BoxGeometry(0.03, 0.05, 0.02);
      const ear = new THREE.Mesh(earGeo, Materials.custom(0x333333));
      ear.position.set(CHAR.HEAD_RADIUS + 0.01, headY + 0.02, 0);
      group.add(ear);
      break;
    }
    case 'clipboard': {
      const boardGeo = new THREE.BoxGeometry(0.2, 0.28, 0.02);
      const board = new THREE.Mesh(boardGeo, Materials.custom(0x8b6e4e));
      board.position.set(-(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH + 0.1), CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.3, 0.1);
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
      tumbler.position.set(-(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH + 0.05), CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.3, 0.05);
      group.add(tumbler);
      break;
    }
    case 'sunglasses': {
      const glassesGeo = new THREE.BoxGeometry(CHAR.HEAD_RADIUS * 2.2, 0.06, 0.02);
      const glasses = new THREE.Mesh(glassesGeo, Materials.custom(0x111111));
      glasses.position.set(0, headY + 0.02, CHAR.HEAD_RADIUS);
      group.add(glasses);
      break;
    }
    case 'protein_shake': {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.18, 8),
        Materials.custom(0x44aa44)
      );
      bottle.position.set(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH + 0.05, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.3, 0.05);
      group.add(bottle);
      break;
    }
    case 'purse': {
      const purse = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.12, 0.06),
        Materials.custom(0xaa6633)
      );
      purse.position.set(-(CHAR.BODY_WIDTH / 2 + 0.15), CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.2, 0);
      group.add(purse);
      break;
    }
    case 'mop': {
      const handle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6),
        Materials.custom(0xaa8844)
      );
      handle.position.set(-(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH + 0.08), CHAR.LEG_HEIGHT + 0.3, 0);
      group.add(handle);
      break;
    }
    case 'gold_rolex': {
      const watch = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.03, 0.05),
        Materials.custom(0xdaa520)
      );
      watch.position.set(-(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH / 2), CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.4, 0);
      group.add(watch);
      break;
    }
    case 'cane': {
      const cane = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.012, 0.8, 6),
        Materials.custom(0x663300)
      );
      cane.position.set(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH + 0.08, 0.4, 0.05);
      group.add(cane);
      // Curved handle
      const handleGeo = new THREE.TorusGeometry(0.04, 0.012, 6, 8, Math.PI);
      const handle = new THREE.Mesh(handleGeo, Materials.custom(0x663300));
      handle.position.set(CHAR.BODY_WIDTH / 2 + CHAR.ARM_WIDTH + 0.08, 0.8, 0.05);
      handle.rotation.x = Math.PI / 2;
      group.add(handle);
      break;
    }
    case 'name_tag': {
      const tagGeo = new THREE.BoxGeometry(0.12, 0.06, 0.01);
      const tag = new THREE.Mesh(tagGeo, Materials.paper());
      tag.position.set(0.08, CHAR.LEG_HEIGHT + CHAR.BODY_HEIGHT * 0.75, CHAR.BODY_DEPTH / 2 + 0.01);
      tag.rotation.z = 0.15; // Crooked!
      group.add(tag);
      break;
    }
    case 'golf_putter': {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.01, 0.01, 0.9, 6),
        Materials.metal()
      );
      shaft.position.set(CHAR.BODY_WIDTH / 2 + 0.2, 0.45, -0.1);
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
