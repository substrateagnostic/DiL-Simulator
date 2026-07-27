import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Materials } from '../effects/MaterialLibrary.js';
import { CHAR } from '../utils/constants.js';
import { paintFaceSet } from './FacePainter.js';

// CharacterBuilder v5 — "a lacquered miniature of a REAL adult."
//
// Ported from the approved proto_chars prototype (director-reviewed):
//   LatheGeometry torso (elliptical = jacket shell), Capsule/tapered
//   limbs, sculpted egg head + curved painted face patch (plate mode),
//   ~5.6-head realistic proportions, MeshPhysicalMaterial lacquer, and the
//   pivot-group contract (which kills the v4 bald-flash by construction).
//
// Director's reworks applied in the port:
//   (a) FACES  — FacePainter v5 at 512 (combat) / 256 (rooms), doubled
//       feature contrast, feather seam-kill; glasses are torus GEOMETRY,
//       never face paint.
//   (b) HAIR   — a scalp-conforming shell + overlapping back mass so there
//       is no cap-step or bare occiput; Karen's bob crown de-helmeted.
//   (c) EXPR   — the full six-expression set rides through faceTextures.
//   (d) PERF   — mergeGeometries collapses each animated node to a few
//       draw calls (a character is ~20 calls, not ~50).
//   (e) TIER   — options.detailed FINALLY means something:
//         detailed:true  (combat) = MeshPhysicalMaterial + 512 face.
//         detailed:false (rooms)  = MeshStandardMaterial + 256 face.
//
// Group refs contract (CharacterAnimator / CombatScene), unchanged:
//   leftLeg rightLeg leftArm rightArm body head faceMesh faceTextures
//   legLength  (+ monolith stubs). leftLeg/rightLeg also expose `.knee`
//   (a sub-pivot) so the animator can bend the shin for seated poses.
export function buildCharacter(config, options = {}) {
  if (config.build === 'monolith') return buildMonolith(config, options);

  const detailed = options.detailed === true;
  const group = new THREE.Group();
  group.name = config.name || 'character';

  // ── silhouette dials (v4-compatible field names honored) ────────────
  const hs = config.heightScale ?? 1.0;
  const ws = config.widthScale ?? 1.0;
  const hd = config.headScale ?? 1.0;
  const hunch = config.hunch ?? 0;
  const shoulderScale = config.shoulderScale ?? (config.taper ? 0.85 + config.taper * 0.15 : 1.0);
  const waistScale = config.waistScale ?? 1.0;
  const tone = config.tone || 'normal';

  // ── realistic proportions (single head dial → head-count ratio) ─────
  const headR = (CHAR.V5_HEAD_R ?? 0.122) * hd;
  const legLength = (CHAR.V5_LEG_LENGTH ?? 0.70) * hs;
  const torsoH = (CHAR.V5_TORSO_H ?? 0.47) * hs;
  const neckH = (CHAR.V5_NECK_H ?? 0.075) * hs;
  group.legLength = legLength;

  // shoulderR is derived from the chest so broad builds read as broad
  // ROUNDED shoulders, not a flat coat-hanger shelf (Chad shoulderScale 1.5
  // used to flare the lathe top into a cape). Gentle broad response.
  const chestR = 0.165 * ws;
  const dims = {
    hipR: 0.15 * ws * waistScale,
    waistR: 0.128 * ws * waistScale,
    chestR,
    // Tailored, not padded: a gentle broad response (was 1.08 + up to 0.55×) so
    // even Chad's shoulderScale 1.5 reads as a cut jacket that HANGS, not football
    // pads. Severance suits drape (addendum: shrink the shoulder ~20%, blend join).
    shoulderR: chestR * (1.02 + Math.max(0, shoulderScale - 1) * 0.34),
    torsoH,
  };

  // ── colors (map v4 fields → v5, apply tone treatment to cloth/hair) ──
  const tc = (c) => toneColor(c, tone);
  const suitC = tc(config.suitColor ?? config.bodyColor ?? 0x3a4256);
  const pantsC = tc(config.pantsColor ?? config.suitColor ?? config.bodyColor ?? 0x2a2a3a);
  const shirtC = config.shirtColor != null ? tc(config.shirtColor) : 0xeef0f2;
  const skinC = toneColor(config.skinColor ?? 0xe8b48f, tone === 'scary' ? 'scary' : 'normal');
  const hairColor = tc(config.hairColor ?? 0x3a2a1c);

  // Face config carries the tone-treated skin so scary enemies read ashen.
  const faceConfig = { ...config, skinColor: skinC };

  // ── material tier ───────────────────────────────────────────────────
  const M = makeMaterialKit(detailed);
  const mSuit = M.cloth(suitC, config.suitMat || {});
  const mPants = M.cloth(pantsC, config.suitMat || {});
  const mShirt = M.cloth(shirtC, { roughness: 0.62, sheen: 0.3, bump: 0.2, env: 0.25 });
  const mSkin = M.skin(skinC, null);
  const mShoe = M.shoe(toneColor(config.shoeColor ?? 0x1a1a1a, tone));
  const mHair = M.hair(hairColor);

  // ── LEGS: hip pivot → thigh, knee pivot → shin + shoe ───────────────
  const stanceX = dims.hipR * 0.52;
  const thighLen = legLength * 0.5;
  const shinLen = legLength * 0.46;
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();               // hip pivot
    const thighWrap = new THREE.Group();
    const thigh = limbSegment(0.072 * ws, 0.056 * ws, thighLen, mPants);
    thigh.position.y = -thighLen / 2;
    thighWrap.add(thigh);
    collapseNode(thighWrap);
    leg.add(thighWrap);

    const knee = new THREE.Group();              // knee pivot
    knee.position.y = -thighLen;
    const shinWrap = new THREE.Group();
    const shin = limbSegment(0.055 * ws, 0.044 * ws, shinLen, mPants);
    shin.position.set(0, -shinLen / 2 + 0.01, 0.01);
    shinWrap.add(shin);
    // kneecap — a rounded pants-coloured cover over the thigh/shin junction so
    // the two capsule ends don't cross as a visible articulation "ring" through
    // the trouser (item 10). Larger than either segment so the crease sits inside
    // it; merges into the shin (same material) on collapse.
    const kneecap = new THREE.Mesh(new THREE.SphereGeometry(0.063 * ws, 16, 12), mPants);
    kneecap.scale.set(1.02, 0.92, 1.05);
    kneecap.position.set(0, 0.006, 0.012);
    shinWrap.add(kneecap);
    // shoe: smooth lacquered form
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.062 * ws, 20, 14), mShoe);
    foot.scale.set(0.85, 0.62, 1.7);
    foot.position.set(0, -shinLen + 0.05, 0.03);
    shinWrap.add(foot);
    const heel = new THREE.Mesh(new THREE.SphereGeometry(0.05 * ws, 16, 12), mShoe);
    heel.scale.set(0.85, 0.7, 0.9);
    heel.position.set(0, -shinLen + 0.05, -0.03);
    shinWrap.add(heel);
    collapseNode(shinWrap);
    knee.add(shinWrap);
    leg.add(knee);
    leg.knee = knee;

    leg.position.set(side * stanceX, legLength, 0);
    group.add(leg);
    if (side < 0) group.leftLeg = leg; else group.rightLeg = leg;
  }

  // ── TORSO (jacket shell) — the one animated body mesh ───────────────
  const torsoZ = Math.sin(hunch) * torsoH * 0.2;
  const torso = buildTorso(dims, mSuit, detailed);
  torso.position.y = legLength;
  torso.position.z = torsoZ;
  torso.rotation.x = hunch;
  group.add(torso);
  group.body = torso;

  // pelvis / crotch cover — a pants-coloured mass bridging the two thigh tops so
  // the dark background can't show through the inverted-V between the legs as a
  // "mesh hole" (item 9, Chad's black crotch wedge). Sits under the jacket hem.
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(dims.hipR * 0.92, 20, 16), mPants);
  pelvis.scale.set(1.18, 0.78, 0.72);
  pelvis.position.set(0, legLength - dims.hipR * 0.22, torsoZ);
  pelvis.rotation.x = hunch;
  group.add(pelvis);

  // anchor points (group space)
  const shoulderY = legLength + Math.cos(hunch) * torsoH * 0.9;
  const shoulderZ = Math.sin(hunch) * torsoH * 0.9 + torsoZ;
  const shoulderX = dims.shoulderR * 0.62;
  const neckBaseY = legLength + Math.cos(hunch) * torsoH;
  const neckBaseZ = Math.sin(hunch) * torsoH + torsoZ;

  // ── STATIC dressing (shirt/collar/lapels/tie/pads/neck) → one node ──
  const staticNode = new THREE.Group();
  {
    // shirt V wedge peeking out of the collar — a NARROW downward V of blouse
    // seated flush to the chest (was a wide flat ellipse that read as a white
    // splat pasted at the collarbone, addendum [B]). Narrower + taller + tucked
    // under the collar band so it reads as an open neckline, not a decal.
    // Narrower, taller, flatter, and tucked HIGHER against the collar (item 11:
    // Karen's cream blouse read as a "dinner plate glued to the sternum"). Now a
    // slim neckline slit seated between the lapels, not a bulging oval.
    const shirt = new THREE.Mesh(new THREE.SphereGeometry(dims.chestR * 0.42, 18, 14), mShirt);
    shirt.scale.set(0.5, 1.02, 0.16);
    shirt.position.set(0, neckBaseY - torsoH * 0.13, neckBaseZ + dims.chestR * 0.24);
    shirt.rotation.x = hunch;
    staticNode.add(shirt);

    // collar band
    const collar = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.62, 0.022 * ws, 10, 24, Math.PI * 1.15), mShirt);
    collar.position.set(0, neckBaseY - 0.01, neckBaseZ + 0.02);
    collar.rotation.set(Math.PI / 2 + hunch, 0, 0);
    staticNode.add(collar);

    // lapels + jacket seam — LOW-RELIEF, sunk against the chest so they read as
    // tailoring on the jacket, not paper cutouts taped to a doll (addendum:
    // "floating decal tailoring … gap shadow under the collar pieces"). Thin
    // (0.01), tucked to the torso front surface, laid nearly FLAT (the old
    // side*0.3 z-tilt flared them into detached triangles), and shaded only a
    // hair off the suit (0.9, was 0.82) so they don't catch a different light.
    if (config.lapels !== false) {
      const mLapel = M.cloth(shadeHexToInt(suitC, 0.9), config.suitMat || {});
      const lapZ = neckBaseZ + dims.chestR * 0.5;
      for (const side of [-1, 1]) {
        const lap = new THREE.Mesh(new THREE.BoxGeometry(dims.chestR * 0.5, torsoH * 0.44, 0.01), mLapel);
        lap.position.set(side * dims.chestR * 0.3, neckBaseY - torsoH * 0.28, lapZ);
        lap.rotation.set(hunch, side * 0.06, side * 0.14);
        staticNode.add(lap);
      }
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.007, torsoH * 0.55, 0.008), M.cloth(shadeHexToInt(suitC, 0.78), {}));
      seam.position.set(0, neckBaseY - torsoH * 0.4, lapZ + 0.004);
      seam.rotation.x = hunch;
      staticNode.add(seam);
    }

    // tie
    if (config.tieColor) {
      const mTie = M.cloth(tc(config.tieColor), { roughness: 0.5, sheen: 0.6, bump: 0.15 });
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.026 * ws, 12, 10), mTie);
      knot.scale.set(1, 1.2, 0.7);
      knot.position.set(0, neckBaseY - torsoH * 0.12, neckBaseZ + dims.chestR * 0.5);
      knot.rotation.x = hunch;
      staticNode.add(knot);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.05 * ws, torsoH * 0.5, 0.012), mTie);
      tie.position.set(0, neckBaseY - torsoH * 0.4, neckBaseZ + dims.chestR * 0.46);
      tie.rotation.x = hunch;
      staticNode.add(tie);
    }

    // shoulder join — a TAILORED sleeve-head, not a football pad. Shrunk ~22%
    // (0.082→0.064r) and flattened into an ellipse that lies along the shoulder
    // slope, tucked down and inboard so it blends the jacket→arm seam instead of
    // ballooning above it with a visible crease (addendum: shrink ~20%, blend
    // the sleeve join — suits hang, they don't bulge).
    for (const side of [-1, 1]) {
      const pad = new THREE.Mesh(new THREE.SphereGeometry(0.064 * ws, 24, 18), mSuit);
      pad.scale.set(1.28, 0.72, 1.06);
      pad.position.set(side * (shoulderX - 0.012), shoulderY - 0.05, shoulderZ);
      pad.rotation.z = side * 0.24;   // lie along the shoulder slope, not perched on top
      staticNode.add(pad);
    }

    // belt at the waist (opt-in) — separates jacket/shirt from pants so the
    // lower body doesn't read as bare legs (rider: Chad in a "red leotard").
    if (config.belt) {
      const belt = new THREE.Mesh(
        new THREE.CylinderGeometry(dims.hipR * 1.03, dims.hipR * 1.03, 0.032, 24),
        M.cloth(0x17130d, { roughness: 0.5, bump: 0.2 }));
      belt.scale.z = 0.66;
      belt.position.set(0, legLength + 0.012, torsoZ);
      staticNode.add(belt);
      // Buckle sunk flush to the belt front (was +0.008 proud → hovered off the
      // body). Thinner and seated right on the belt's front arc.
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.014), Materials.custom(0xcaa840));
      buckle.position.set(0, legLength + 0.012, torsoZ + dims.hipR * 0.62);
      staticNode.add(buckle);
    }

    // neck (smooth: more radial segments so the lit column reads gradient-clean,
    // not concentric "hose rings" at 4× — item 7)
    const neckGeo = new THREE.CylinderGeometry(headR * 0.62, headR * 0.72, neckH, 28, 2);
    neckGeo.computeVertexNormals();
    const neck = new THREE.Mesh(neckGeo, mSkin);
    neck.position.set(0, neckBaseY + neckH * 0.45, neckBaseZ + Math.sin(hunch) * neckH * 0.5);
    neck.rotation.x = hunch * 0.5;
    staticNode.add(neck);
  }
  collapseNode(staticNode);
  group.add(staticNode);

  // ── ARMS: shoulder pivot → upper + fore + cuff + hand ───────────────
  const upperArmLen = torsoH * 0.5;
  const foreArmLen = torsoH * 0.46;
  const handLocalY = -upperArmLen - foreArmLen - 0.02;
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();               // shoulder pivot
    const upper = limbSegment(0.058 * ws, 0.05 * ws, upperArmLen, mSuit);
    upper.position.y = -upperArmLen / 2;
    arm.add(upper);
    const fore = limbSegment(0.048 * ws, 0.04 * ws, foreArmLen, mSuit);
    fore.position.set(0, -upperArmLen - foreArmLen / 2 + 0.01, 0.015);
    fore.rotation.x = -0.12;
    arm.add(fore);
    // elbow cover — hides the upper/fore capsule junction crease so the sleeve
    // reads as one cloth, not a jointed doll arm (item 10).
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.053 * ws, 16, 12), mSuit);
    elbow.scale.set(1.02, 0.95, 1.05);
    elbow.position.set(0, -upperArmLen + 0.004, 0.006);
    arm.add(elbow);
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.041 * ws, 0.041 * ws, 0.03, 14), mShirt);
    cuff.position.set(0, -upperArmLen - foreArmLen + 0.02, 0.03);
    arm.add(cuff);
    // mitten hand + thumb
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.045 * ws, 14, 12), mSkin);
    palm.scale.set(0.85, 1.15, 0.6);
    palm.position.set(0, handLocalY, 0.04);
    arm.add(palm);
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.02 * ws, 10, 8), mSkin);
    thumb.scale.set(1, 1.5, 1);
    thumb.position.set(side * 0.035 * ws, handLocalY + 0.01, 0.05);
    thumb.rotation.z = side * 0.6;
    arm.add(thumb);
    collapseNode(arm);

    arm.position.set(side * (shoulderX + 0.03 * ws), shoulderY - 0.02, shoulderZ);
    arm.rotation.z = side * 0.08;
    arm.rotation.x = hunch * 0.5;
    group.add(arm);
    if (side < 0) group.leftArm = arm; else group.rightArm = arm;
  }

  // ── HEAD (egg skull + ears + face patch + hair + glasses) ───────────
  const headY = neckBaseY + neckH + headR * 0.72;
  const headZ = neckBaseZ + Math.sin(hunch) * (headR * 0.9 + neckH) + (config.headForward ?? 0);
  const head = new THREE.Group();
  head.position.set(0, headY, headZ);
  // Slight downward nod so the face aims at the combat camera (which looks
  // UP at the head); without it, the up-view foreshortens the face into a
  // long blank jaw with the features crammed at the top.
  head.rotation.x = 0.15;

  const skull = makeHead(headR, mSkin, { jaw: config.jaw ?? 0.82, chin: config.chin ?? 1.0, detailed });
  head.add(skull);
  const mConcha = M.skin(shadeHexToInt(skinC, 0.58), null);
  for (const side of [-1, 1]) {
    // Rounder, seated further back on the skull (z −0.18, was −0.12) so at 3/4 it
    // tucks beside the head instead of floating as a pale disc mid-cheek
    // (Chad/Intern note). A dark concha dimple recessed into the front sells it
    // as an ear (item 8) — the old comment promised this but never drew it.
    const ear = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.23, 16, 12), mSkin);
    ear.scale.set(0.58, 0.96, 0.82);
    ear.position.set(side * headR * 0.95, -headR * 0.05, -headR * 0.18);
    head.add(ear);
    const concha = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.12, 12, 10), mConcha);
    concha.scale.set(0.5, 0.8, 0.5);
    concha.position.set(side * headR * 1.0, -headR * 0.05, -headR * 0.10);
    head.add(concha);
  }

  // hair (before collapse so it merges by material)
  buildHair(head, headR, mHair, resolveHairStyle(config.hairStyle));

  // face textures + curved patch
  const faceSize = detailed ? 512 : 256;
  group.faceTextures = paintFaceSet(faceConfig, faceSize);
  let facePatch = null;
  if (group.faceTextures && group.faceTextures.neutral) {
    facePatch = makeFacePatch(headR, group.faceTextures.neutral, M);
    facePatch.userData.noMerge = true;
    head.add(facePatch);
  }

  collapseNode(head, mHair);
  if (facePatch) group.faceMesh = facePatch;

  // glasses as torus GEOMETRY (rework a) — parented to head, ride the bob
  if (config.glasses) buildGlasses(head, headR, config.glasses, detailed);

  group.add(head);
  group.head = head;

  // ── rig anchors for accessories (recomputed for v5 geometry) ────────
  const rig = {
    legLength, torsoH, headR,
    headY: 0, headZ: 0,              // relative to head node (0,0 = center)
    headWorldY: headY, headWorldZ: headZ,
    shoulderY, shoulderZ, shoulderX,
    handY: shoulderY - 0.02 + handLocalY,
    handX: shoulderX + 0.03 * ws,
    handZ: shoulderZ + 0.04,
    handLocalY,                     // arm-local Y of the hand (for held items)
    frontZ: neckBaseZ + dims.chestR * 0.5,
    bodyW: dims.shoulderR * 2,
    ws,
    skinMat: mSkin,                 // plain skin (no face tex) — for grip fingers
    // legacy dims shim so cosmetic visuals that read d.* keep working
    d: {
      legH: legLength, bodyW: dims.shoulderR * 2, bodyH: torsoH,
      bodyD: dims.chestR * 1.3, armW: 0.05 * ws, armH: upperArmLen + foreArmLen,
      headR,
    },
  };

  // ── Accessories (held items attach to the arm so they ride the swing) ─
  if (config.accessories) {
    for (const acc of config.accessories) addAccessory(group, acc, rig, config, detailed);
  }

  // ── shadows: hair + face do not self-shadow; blob does the grounding ─
  group.traverse(child => {
    if (child.isMesh) {
      child.castShadow = !child.userData.noFlash && !child.userData.noCast && child !== group.faceMesh;
      child.receiveShadow = !child.userData.noFlash;
    }
  });

  _addBlobShadow(group, 0.30 * Math.max(ws, 1));
  return group;
}

// ── material kit (the two tiers) ──────────────────────────────────────
function makeMaterialKit(detailed) {
  if (detailed) {
    return {
      skin: (color, faceTex) => {
        // Round-3 (item 7): specular lobes STILL rang latitude bands on the neck
        // and forehead at 4×. Clearcoat/sheen eased further (0.16→0.08, 0.16→0.10)
        // and roughness up so the skin is a clean matte gradient — the geometry
        // (now higher-tessellated) carries the form, not a banded highlight.
        const m = new THREE.MeshPhysicalMaterial({
          color: faceTex ? 0xffffff : color, map: faceTex || null,
          roughness: 0.62, clearcoat: 0.08, clearcoatRoughness: 0.6,
          sheen: 0.10, sheenColor: new THREE.Color(0xff9a80), envMapIntensity: 0.42,
        });
        // A faint noise bump on the BARE skin (skull/neck/ears — never the painted
        // face patch) dithers the smooth light falloff so the neck's quantized
        // gradient stops reading as concentric "hose rings" (item 7).
        if (!faceTex) {
          const b = skinBumpTexture();
          if (b) { m.bumpMap = b; m.bumpScale = 0.004; }
        }
        return m;
      },
      hair: (color) => {
        const t = hairTexture();
        // Softer than before (rougher, low clearcoat/sheen): the glossy sheen
        // lobe was catching horizontal specular rings on the smooth curved hair
        // — read as "scanline banding" on light/silver hair at 4× (addendum [B]).
        // Matte-satin hair kills the shimmer while keeping fibre grain.
        const m = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(color), roughness: 0.66, clearcoat: 0.1,
          clearcoatRoughness: 0.6, sheen: 0.16,
          sheenColor: new THREE.Color(color).multiplyScalar(1.2), envMapIntensity: 0.45,
        });
        if (t) m.map = t;
        return m;
      },
      cloth: (color, opts = {}) => {
        const w = weaveTexture();
        const m = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(color), roughness: opts.roughness ?? 0.72,
          sheen: opts.sheen ?? 0.5, sheenColor: new THREE.Color(opts.sheenColor ?? 0xffffff),
          sheenRoughness: 0.5, clearcoat: opts.clearcoat ?? 0.0, envMapIntensity: opts.env ?? 0.32,
        });
        if (w) { m.bumpMap = w; m.bumpScale = opts.bump ?? 0.22; }
        return m;
      },
      shoe: (color) => new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color), roughness: 0.22, clearcoat: 0.85,
        clearcoatRoughness: 0.2, envMapIntensity: 0.9,
      }),
    };
  }
  // room tier — cheaper MeshStandardMaterial (no clearcoat/sheen lobe)
  return {
    skin: (color, faceTex) => new THREE.MeshStandardMaterial({
      color: faceTex ? 0xffffff : color, map: faceTex || null, roughness: 0.62, metalness: 0.0,
    }),
    hair: (color) => {
      const t = hairTexture();
      const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.5, metalness: 0.0 });
      if (t) m.map = t;
      return m;
    },
    cloth: (color, opts = {}) => {
      const w = weaveTexture();
      const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: opts.roughness ?? 0.78, metalness: 0.0 });
      if (w) { m.bumpMap = w; m.bumpScale = (opts.bump ?? 0.4) * 0.6; }
      return m;
    },
    shoe: (color) => new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.34, metalness: 0.15 }),
  };
}

// ── merge: collapse a node's meshes to one mesh per material ───────────
// Skips meshes flagged userData.noMerge (kept as-is, e.g. the face patch)
// and never recurses into child pivot groups tagged animNode. Merged
// meshes whose material === hairMat get noCast so hair doesn't smudge the
// face. Preserves the node as a live pivot the animator can still drive.
function collapseNode(node, hairMat = null) {
  if (typeof mergeGeometries !== 'function') return;
  node.updateWorldMatrix(true, true);
  const nodeInv = node.matrixWorld.clone().invert();
  const byMat = new Map();
  const keep = [];
  const toRemove = [];
  node.traverse(o => {
    if (!o.isMesh) return;
    if (o.userData.noMerge) { keep.push(o); return; }
    o.updateWorldMatrix(true, false);
    const g = normalizeAttrs(o.geometry.clone());
    g.applyMatrix4(nodeInv.clone().multiply(o.matrixWorld));
    const arr = byMat.get(o.material) || [];
    arr.push(g);
    byMat.set(o.material, arr);
    toRemove.push(o);
  });
  for (const k of keep) node.attach(k);       // preserve world pose
  for (const o of toRemove) if (o.parent) o.parent.remove(o);
  _pruneEmpty(node);
  for (const [mat, geoms] of byMat) {
    let merged;
    try { merged = geoms.length === 1 ? geoms[0] : mergeGeometries(geoms, false); }
    catch (e) { merged = null; }
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    if (hairMat && mat === hairMat) mesh.userData.noCast = true;
    node.add(mesh);
  }
}

function normalizeAttrs(g) {
  // keep only position/normal/uv so every geometry in a merge matches
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    const n = g.attributes.position.count;
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  }
  if (!g.index) g = g.toNonIndexed();   // shouldn't happen (all our geoms indexed)
  return g;
}

function _pruneEmpty(node) {
  for (const child of [...node.children]) {
    if (child.isGroup) {
      _pruneEmpty(child);
      let hasMesh = false;
      child.traverse(o => { if (o.isMesh) hasMesh = true; });
      if (!hasMesh && child !== node) node.remove(child);
    }
  }
}

// ── palette treatment ────────────────────────────────────────────────
function toneColor(color, tone) {
  const keep = tone === 'scary' ? 0.6 : tone === 'silly' ? 1.0 : 0.9;
  const dark = tone === 'scary' ? 0.9 : 1.0;
  const r = (color >> 16) & 255, g = (color >> 8) & 255, b = color & 255;
  const lum = 0.3 * r + 0.59 * g + 0.11 * b;
  const mix = (ch) => Math.min(255, Math.round((ch * keep + lum * (1 - keep)) * dark));
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

function shadeHexToInt(c, f) {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * f));
  const b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
}

function resolveHairStyle(style) {
  // v4 style names → v5 sculpted styles
  switch (style) {
    case 'karen': return 'bob';
    case 'backwards_cap': return 'cap';
    case 'shawl': return 'shawl';
    case 'bob': return 'bob';
    case 'bun': return 'bun';
    case 'slick': return 'slick';
    case 'side_part': return 'side_part';
    case 'short':
    default: return 'short';
  }
}

// ── canvas texture helpers (headless-guarded) ─────────────────────────
const _hairTexCache = {};
function hairTexture(key = 'default') {
  if (typeof document === 'undefined') return null;
  if (_hairTexCache[key]) return _hairTexCache[key];
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  // Near-white base so the material COLOR carries the hair hue (a mid-grey base
  // used to drag every hair toward grey — and on white/silver hair the dark
  // swirled strands read as cerebral folds, the "exposed brain" note). Strands
  // are now faint, thin, and mostly VERTICAL (hair falls; it doesn't swirl), so
  // they read as fibre grain on any hair colour instead of brain wrinkles.
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    const len = 26 + Math.random() * 64;
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(232,232,232,0.22)' : 'rgba(96,96,96,0.20)';
    ctx.lineWidth = 0.5 + Math.random() * 1.0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Gentle near-vertical sway (±5px) — a strand, not a swirl.
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 5, y + len * 0.5, x + (Math.random() - 0.5) * 7, y + len);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearFilter;
  _hairTexCache[key] = tex;
  return tex;
}

let _skinBumpTex = null;
function skinBumpTexture() {
  if (typeof document === 'undefined') return null;
  if (_skinBumpTex) return _skinBumpTex;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  // Fine, high-frequency value noise — used only as a low-amplitude bumpMap to
  // dither the skin's diffuse gradient (kills 8-bit Mach banding on the neck).
  for (let i = 0; i < S * S; i++) {
    const x = i % S, y = (i / S) | 0;
    const h = Math.sin(x * 91.73 + y * 47.31) * 7391.71;
    const v = 128 + ((h - Math.floor(h)) - 0.5) * 30;
    const j = i * 4;
    img.data[j] = img.data[j + 1] = img.data[j + 2] = v;
    img.data[j + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 4);
  tex.minFilter = THREE.LinearFilter;
  _skinBumpTex = tex;
  return tex;
}

let _weaveTex = null;
function weaveTexture() {
  if (typeof document === 'undefined') return null;
  if (_weaveTex) return _weaveTex;
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, S, S);
  const img = ctx.getImageData(0, 0, S, S);
  // The old hard ((x+y)&1)*±12 checker tiled at repeat(4,6) aliased into a
  // visible vertical corduroy stripe on the blazers (addendum minor: "fine
  // vertical scanline … muddying the lacquer"). Replaced with a much SUBTLER,
  // isotropic value-noise (±4) at a finer, non-directional repeat so cloth
  // reads as woven texture without a regular stripe.
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const v = 128 + ((h - Math.floor(h)) - 0.5) * 8;
      const i = (y * S + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  _weaveTex = tex;
  return tex;
}

// ── geometry helpers ──────────────────────────────────────────────────
function limbSegment(rTop, rBot, len, mat) {
  const geo = new THREE.CylinderGeometry(rTop, rBot, len, 16, 3, false);
  geo.computeVertexNormals();
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(geo, mat));
  const capTop = new THREE.Mesh(new THREE.SphereGeometry(rTop, 14, 10), mat);
  capTop.position.y = len / 2; grp.add(capTop);
  const capBot = new THREE.Mesh(new THREE.SphereGeometry(rBot, 14, 10), mat);
  capBot.position.y = -len / 2; grp.add(capBot);
  return grp;
}

function makeHead(rad, mat, opts = {}) {
  // Higher tessellation on the combat tier so the forehead/cheek read as a
  // clean gradient, not faceted latitude bands at 4× (item 7).
  const wSeg = opts.detailed ? 64 : 44;
  const hSeg = opts.detailed ? 52 : 36;
  const geo = new THREE.SphereGeometry(rad, wSeg, hSeg);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const jaw = opts.jaw ?? 0.82;
  const chin = opts.chin ?? 1.0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const yN = v.y / rad;
    v.y *= 1.09;                       // egg elongation (rounder = less long jaw)
    if (v.z < 0) v.z *= 0.92;          // flatten back of head
    if (yN < 0) {
      const t = -yN;
      const narrow = 1 - t * (1 - jaw);
      v.x *= narrow; v.z *= narrow;
      if (yN < -0.6 && v.z > 0) v.z += rad * 0.05 * chin * (t - 0.6);
    }
    if (yN > 0.15 && v.z > 0) v.z += rad * 0.03 * (yN - 0.15);   // brow ridge
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function makeFacePatch(rad, faceTex, M) {
  const phiStart = Math.PI * 0.5 - 1.0;
  const phiLen = 2.0;
  const thetaStart = 0.62;
  const thetaLen = 1.4;
  // Bulge kept minimal (0.4%) so the patch does NOT catch more light than the
  // skull beneath it — the "patch is brighter than the head" luminance step.
  // polygonOffset (below) keeps it from z-fighting despite the tiny gap.
  const geo = new THREE.SphereGeometry(rad * 1.004, 48, 48, phiStart, phiLen, thetaStart, thetaLen);
  const uv = geo.attributes.uv;
  let uMin = 1, uMax = 0, vMin = 1, vMax = 0;
  for (let i = 0; i < uv.count; i++) {
    uMin = Math.min(uMin, uv.getX(i)); uMax = Math.max(uMax, uv.getX(i));
    vMin = Math.min(vMin, uv.getY(i)); vMax = Math.max(vMax, uv.getY(i));
  }
  for (let i = 0; i < uv.count; i++) {
    const u = (uv.getX(i) - uMin) / (uMax - uMin);
    const vv = (uv.getY(i) - vMin) / (vMax - vMin);
    uv.setXY(i, 1 - u, vv);
  }
  const mat = M.skin(0xffffff, faceTex);
  mat.transparent = true;             // soft feather blends into head skin
  mat.depthWrite = true;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1;
  mat.polygonOffsetUnits = -1;
  return new THREE.Mesh(geo, mat);
}

function buildTorso(dims, mat, detailed = false) {
  const { hipR, waistR, chestR, shoulderR, torsoH } = dims;
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const pts = [
    V2(0.001, -0.02),
    V2(hipR * 0.75, -0.01),
    V2(hipR, 0.02),
    V2(hipR * 0.98, torsoH * 0.16),
    V2(waistR, torsoH * 0.34),
    V2(waistR * 1.06, torsoH * 0.46),
    V2(chestR, torsoH * 0.62),
    V2(chestR * 1.02, torsoH * 0.74),
    V2(shoulderR, torsoH * 0.9),
    V2(shoulderR * 0.9, torsoH * 0.96),
    V2(shoulderR * 0.5, torsoH * 1.0),
    V2(shoulderR * 0.28, torsoH * 1.02),
  ];
  // More radial segments on the combat tier so the shoulder yoke reads as a
  // smooth gradient, not hard triangular shading facets (item 9, Chad).
  const geo = new THREE.LatheGeometry(pts, detailed ? 56 : 36);
  geo.computeVertexNormals();
  geo.scale(1, 1, 0.66);              // elliptical (flatter front-back)
  return new THREE.Mesh(geo, mat);
}

// ── HAIR ──────────────────────────────────────────────────────────────
// Addendum rework (b): hair must be SCALP-CONFORMING — no cap-step, no float
// shadow, no skin gap at the hairline (that gap is exactly where the magenta
// rim light leaked in and read as a hue-glitch seam). Every style lays:
//   1. a HUGGING scalp cap (thickness ~1.02 — essentially painted onto the
//      skull, so its lower edge throws no proud-ledge shadow),
//   2. a hairline band sunk FLUSH (~1.006r) just under the cap edge, so any
//      sliver between hair and the face patch reads as hair, never lit skin,
//   3. an overlapping back mass over the occiput/nape,
//   4. per-style volume, rooted into the scalp so it grows down (no floating
//      visor/disc).
function buildHair(head, r, mat, style) {
  const add = (m) => { m.userData.noCast = true; head.add(m); };

  // ── one continuous scalp-conforming cap ─────────────────────────────
  // Round-3 rebuild (items 1 & 2). The cap rides the head's OWN egg profile a
  // hair proud (`grow`), descends to the EAR LINE on the sides and back
  // (thetaLen ~1.5), and LIFTS its front-hemisphere rim up to a clean hairline
  // arc (`hairlineY`) so it never sheets over the face. This kills all three
  // failures at once: the crown is a single merged shell (no instanced blobs
  // reading as "horns"), the sides hug down to the ears (no bare scalp band /
  // cap-step), and the back joins seamlessly (no offset occiput). Strand grain
  // is PAINTED by the hair texture, never sculpted.
  function scalpCap(thetaLen, grow = 1.03, hairlineY = 0.36, seg = 44) {
    const geo = new THREE.SphereGeometry(r, seg, Math.max(26, Math.round(seg * 0.7)), 0, Math.PI * 2, 0, thetaLen);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const yN = v.y / r;
      v.y *= 1.09;                       // match head egg elongation
      if (v.z < 0) v.z *= 0.92;          // match flattened occiput
      if (yN > 0.15 && v.z > 0) v.z += r * 0.03 * (yN - 0.15);  // match brow ridge
      v.multiplyScalar(grow);            // float uniformly proud of the skin
      // front hairline lift: raise front-of-head verts below the hairline up to
      // it (weighted by how far forward they are), so the forehead stays open
      // and the rim forms a natural arc that dips toward the temples/ears.
      if (v.z > 0 && v.y < hairlineY * r) {
        const front = Math.min(1, v.z / (r * 0.5));
        const lift = (hairlineY * r - v.y) * front;
        v.y += lift;
        v.z -= lift * 0.45;              // ease the lifted rim back off the face
      }
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    add(m);
    return m;
  }
  // nape/occiput volume behind & below the cap rim; overlaps it (no seam step).
  function backMass(scaleY = 1.0, lowY = -r * 0.05, depth = 1.08, wide = 1.05) {
    const back = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 24, 20), mat);
    back.scale.set(wide, scaleY, depth);
    back.position.set(0, lowY, -r * 0.22);
    add(back);
  }
  // a single smooth swept fringe rooted at the hairline (never a row of blobs).
  function fringe(y = 0.4, depth = 0.62, widthS = 1.4, tiltX = 0.34) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(r * 0.7, 22, 16), mat);
    f.scale.set(widthS, 0.5, depth);
    f.rotation.x = tiltX;
    f.position.set(0, r * y, r * 0.5);
    add(f);
  }

  if (style === 'side_part') {
    scalpCap(1.5, 1.03, 0.42);
    backMass(1.0, -r * 0.05, 1.05);
    const sweep = new THREE.Mesh(new THREE.SphereGeometry(r * 0.72, 20, 16), mat);
    sweep.scale.set(1.3, 0.55, 0.95);
    sweep.rotation.set(-0.1, 0, 0.12);
    sweep.position.set(-r * 0.12, r * 0.6, r * 0.46);
    add(sweep);
    const sweep2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 16, 12), mat);
    sweep2.scale.set(1.0, 0.56, 0.95);
    sweep2.position.set(r * 0.4, r * 0.56, r * 0.42);
    add(sweep2);
  } else if (style === 'bob') {
    // De-helmeted (item 1): ONE continuous crown — NO discrete lumps, NO center-
    // part sphere. The cap conforms to the ears; a soft curtain fringe parts
    // above the brow so both eyes read; jaw-length side curtains frame the face.
    scalpCap(1.5, 1.035, 0.34);
    // curtain fringe: two smooth swept pieces meeting at a high part, sweeping
    // OUT to the temples (forehead + eye zone stay open).
    for (const s of [-1, 1]) {
      const bang = new THREE.Mesh(new THREE.SphereGeometry(r * 0.6, 20, 16), mat);
      bang.scale.set(0.95, 0.5, 0.6);
      bang.rotation.set(0.3, s * 0.5, s * 0.5);
      bang.position.set(s * r * 0.36, r * 0.5, r * 0.58);
      add(bang);
    }
    // jaw-length side curtains framing the face
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.SphereGeometry(r * 0.56, 20, 16), mat);
      side.scale.set(0.58, 1.7, 1.0);
      side.position.set(s * r * 0.82, -r * 0.5, r * 0.02);
      side.rotation.z = s * -0.1;
      add(side);
    }
    const back = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 22, 18), mat);
    back.scale.set(1.12, 1.5, 0.94);
    back.position.set(0, -r * 0.3, -r * 0.4);
    add(back);
  } else if (style === 'bun') {
    scalpCap(1.5, 1.035, 0.4);
    backMass(1.0, -r * 0.04, 1.05);
    for (const s of [-1, 1]) {
      const wave = new THREE.Mesh(new THREE.SphereGeometry(r * 0.4, 14, 12), mat);
      wave.scale.set(0.72, 1.0, 1.0);
      wave.position.set(s * r * 0.8, r * 0.2, r * 0.05);
      add(wave);
    }
    const bun = new THREE.Mesh(new THREE.SphereGeometry(r * 0.36, 18, 14), mat);
    bun.position.set(0, r * 0.3, -r * 0.92);
    add(bun);
  } else if (style === 'slick') {
    // Pompadour rooted into the conforming cap (no floating wedge, no bald band).
    scalpCap(1.5, 1.03, 0.4);
    backMass(0.95, -r * 0.02, 1.0);
    const pomp = new THREE.Mesh(new THREE.SphereGeometry(r * 0.66, 22, 16), mat);
    pomp.scale.set(1.3, 0.9, 1.0);
    pomp.rotation.x = -0.22;
    pomp.position.set(0, r * 0.66, r * 0.4);
    add(pomp);
    // filler bridging quiff→crown so their overlap reads as one mass (no seam)
    const bridge = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 18, 14), mat);
    bridge.scale.set(1.2, 0.72, 0.92);
    bridge.position.set(0, r * 0.62, r * 0.12);
    add(bridge);
  } else if (style === 'cap') {
    // backwards baseball cap: a conforming fabric dome + front tuft + rear brim +
    // button. High hairline (0.55) keeps it a dome sitting ON the crown.
    scalpCap(1.15, 1.06, 0.55);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(r * 0.7, 18, 14), mat);
    tuft.scale.set(1.32, 0.44, 0.72);
    tuft.rotation.x = 0.42;
    tuft.position.set(0, r * 0.56, r * 0.58);
    add(tuft);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.02, 16, 1, false, 0, Math.PI), mat);
    brim.rotation.set(Math.PI / 2, Math.PI, 0);
    brim.position.set(0, r * 0.4, -r * 1.0);
    add(brim);
    const btn = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 8, 6), mat);
    btn.position.set(0, r * 1.06, 0);
    add(btn);
  } else if (style === 'shawl') {
    // Grandma (item 3): the crown cap + a back mass. Side drapes are pushed
    // BEHIND the jawline (z negative) and stop short of the chin, so the white
    // hair frames the face from the sides/back but NEVER wraps under the jaw and
    // closes beneath the chin (the "bearded Dumbledore" read).
    // Lower hairline (0.34) so the white hair comes down over the forehead and
    // hides the patch's top feather edge — kills the faint stippled seam at the
    // hairline (item 6, Grandma) without re-wrapping the jaw.
    scalpCap(1.5, 1.045, 0.34);
    const back = new THREE.Mesh(new THREE.SphereGeometry(r * 1.0, 22, 18), mat);
    back.scale.set(1.18, 1.4, 1.06);
    back.position.set(0, -r * 0.22, -r * 0.3);
    add(back);
    for (const s of [-1, 1]) {
      const drape = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 18, 14), mat);
      drape.scale.set(0.5, 1.5, 0.8);
      drape.position.set(s * r * 0.94, -r * 0.42, -r * 0.2);   // outboard + BEHIND the jaw
      drape.rotation.z = s * -0.06;
      add(drape);
    }
  } else { // 'short'
    // Conforming cap to the ears + a single swept fringe rooted at the hairline.
    // No bald band, no floating beret (Andrew/Intern fix).
    scalpCap(1.5, 1.03, 0.38);
    backMass(1.0, -r * 0.04, 1.0);
    fringe(0.4, 0.62, 1.42, 0.34);
  }
}

function buildGlasses(head, r, kind, detailed) {
  // Addendum order (a): glasses are thin torus GEOMETRY, never face paint.
  // They MUST stand clearly in front of the curved face patch (which bulges
  // to ~1.012r), or they read as rings painted on the face (Grandma). So the
  // lens plane sits at ~1.06r with a real air gap, the rims get a catchlight,
  // and reading/clear lenses get a faint glass fill so the rim reads as a rim.
  const frameMat = new THREE.MeshPhysicalMaterial({
    color: kind === 'reading' ? 0x6a4a24 : 0x14141a,
    roughness: 0.28, metalness: 0.45, clearcoat: 0.8, clearcoatRoughness: 0.2,
    envMapIntensity: 1.0,
  });
  const catchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const lensR = r * (kind === 'sun' ? 0.25 : 0.22);
  const sep = r * 0.31;
  const tube = r * (kind === 'sun' ? 0.045 : 0.034);
  const zf = r * 1.06;               // lens plane — clearly proud of the face
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(lensR, tube, 10, 24), frameMat);
    rim.position.set(s * sep, r * 0.02, zf);
    rim.userData.noFlash = true;
    head.add(rim);
    // lens fill: sunglasses get a dark tint; reading/clear get a faint bluish
    // glass so the disc catches light and the rim reads as an actual lens.
    const lensMat = kind === 'sun'
      ? new THREE.MeshPhysicalMaterial({ color: 0x0a0a10, roughness: 0.12, metalness: 0.2, clearcoat: 0.9, transparent: true, opacity: 0.88 })
      // Reading/clear glass barely tints — a faint rim catch, not a frosted disc
      // that smudges the eyes behind it (addendum: Grandma's eyes are smudges).
      : new THREE.MeshPhysicalMaterial({ color: 0xbcd0e0, roughness: 0.08, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.05, transparent: true, opacity: 0.10, envMapIntensity: 1.2 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(lensR, 20), lensMat);
    lens.position.set(s * sep, r * 0.02, zf - tube * 0.4);
    lens.userData.noFlash = true;
    head.add(lens);
    // catchlight — a small bright bead near the top-outer of each rim so the
    // glasses read as glossy geometry even under the dark venue wash.
    const catch1 = new THREE.Mesh(new THREE.SphereGeometry(tube * 0.9, 8, 6), catchMat);
    catch1.position.set(s * sep - s * lensR * 0.5, r * 0.02 + lensR * 0.55, zf + tube * 0.6);
    catch1.userData.noFlash = true;
    head.add(catch1);
  }
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.016, r * 0.016, sep * 0.7, 8), frameMat);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, r * 0.05, zf + tube);
  bridge.userData.noFlash = true;
  head.add(bridge);
  // temple arms angling back to the ears (sell the air gap in profile)
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.014, r * 0.014, r * 0.72, 6), frameMat);
    arm.rotation.set(Math.PI / 2 - 0.12, 0, 0);
    arm.position.set(s * (sep + lensR * 0.82), r * 0.06, r * 0.62);
    arm.userData.noFlash = true;
    head.add(arm);
  }
}

// ── Accessories — placement recomputed for v5 arm/head geometry ───────
function addAccessory(group, acc, rig, config, detailed) {
  const handX = rig.handX, handY = rig.handY, handZ = rig.handZ;
  const d = rig.d;
  // Held items are placed in ARM-LOCAL space at the hand and parented to
  // the arm, so they meet the hand exactly and ride the swing (attaching a
  // group-space item drifts off the hand once the arm rotates).
  const hy = rig.handLocalY;
  const holdRight = (obj, dx = 0, dy = 0, dz = 0) => { obj.position.set(dx, hy + dy, 0.06 + dz); group.rightArm?.add(obj); };
  const holdLeft = (obj, dx = 0, dy = 0, dz = 0) => { obj.position.set(-dx, hy + dy, 0.06 + dz); group.leftArm?.add(obj); };
  // Curled grip fingers over the FRONT of a held prop — sells a closed fist on
  // the mitten hand so props read as GRIPPED, not clipping through an open hand
  // (addendum: "nobody grips anything"). side: -1 left arm, +1 right arm.
  const grip = (side, dy = 0, dz = 0) => {
    const arm = side < 0 ? group.leftArm : group.rightArm;
    if (!arm || !rig.skinMat) return;
    const knuck = new THREE.Mesh(
      new THREE.TorusGeometry(0.03 * rig.ws, 0.013 * rig.ws, 6, 12, Math.PI * 1.2),
      rig.skinMat);
    knuck.rotation.set(Math.PI / 2, 0, side < 0 ? -0.5 : 0.5);
    knuck.position.set(0, hy + dy, 0.075 + dz);
    arm.add(knuck);
  };
  switch (acc) {
    case 'coffee_mug': {
      const mugGroup = new THREE.Group();
      mugGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.08, 10), Materials.mug()));
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.007, 6, 8, Math.PI), Materials.mug());
      handle.position.set(0.04, 0, 0);
      handle.rotation.y = Math.PI / 2;
      mugGroup.add(handle);
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.015, 10), Materials.coffee());
      liquid.position.y = 0.032;
      mugGroup.add(liquid);
      holdRight(mugGroup, 0.01, 0.05, 0.0);
      grip(1);
      group.mugAccessory = mugGroup;
      break;
    }
    case 'boss_mug': {
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.042, 0.1, 10), Materials.mugRed());
      holdRight(mug, 0.01, 0.05, 0.0);
      grip(1);
      break;
    }
    case 'bluetooth_earpiece': {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.045, 0.018), Materials.custom(0x333333));
      ear.position.set(rig.headR + 0.02, -0.02, -0.02);
      group.head?.add(ear);
      break;
    }
    case 'clipboard': {
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.24, 0.015), Materials.custom(0x8b6e4e));
      board.rotation.set(-0.5, 0, 0.08);
      holdLeft(board, 0.0, 0.08, 0.05);
      const paper = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.2, 0.005), Materials.paper());
      paper.position.set(0, 0.005, 0.011);
      board.add(paper);
      grip(-1, 0.02, 0.0);
      break;
    }
    case 'wine_tumbler': {
      const tumbler = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.1, 10), Materials.custom(0x888888));
      holdLeft(tumbler, 0.01, 0.05, 0.0);
      grip(-1);
      break;
    }
    case 'sunglasses': {
      buildGlasses(group.head, rig.headR, 'sun', detailed);
      break;
    }
    case 'glasses': {
      buildGlasses(group.head, rig.headR, 'clear', detailed);
      break;
    }
    case 'tablet': {
      const tabGroup = new THREE.Group();
      tabGroup.add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.25, 0.012), Materials.custom(0x222230)));
      const screen = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.215, 0.004), Materials.custom(0x88ccff, { emissive: 0x88ccff, emissiveIntensity: 0.5 }));
      screen.position.z = 0.009;
      tabGroup.add(screen);
      tabGroup.rotation.set(-0.5, 0, 0.1);
      holdLeft(tabGroup, 0.0, 0.09, 0.06);
      grip(-1, 0.03, 0.0);
      break;
    }
    case 'pearl_earrings': {
      const pearlGeo = new THREE.SphereGeometry(0.016, 8, 8);
      const pearlMat = Materials.custom(0xf2ecdc, { stops: 4 });
      for (const side of [-1, 1]) {
        const pearl = new THREE.Mesh(pearlGeo, pearlMat);
        pearl.position.set(side * (rig.headR * 0.98), -rig.headR * 0.55, 0);
        group.head?.add(pearl);
      }
      break;
    }
    case 'protein_shake': {
      // Seated at HAND height and pushed well forward of the fist (was riding up
      // at dy 0.05 into the forearm with the grip missing it — item 9). Grip
      // knuckles now wrap its front so it reads as held, not embedded.
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.13, 12), Materials.custom(0x44aa44));
      holdRight(bottle, 0.01, 0.0, 0.055);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.03, 12), Materials.custom(0x2a2a2a));
      cap.position.set(0.01, hy + 0.075, 0.115);
      group.rightArm?.add(cap);
      grip(1, 0.0, 0.035);
      break;
    }
    case 'purse': {
      // Slung cleanly OFF the left forearm and hanging outside the hip, not
      // embedded in the arm/torso (rider: orange sliver at the elbow). Parented
      // to the arm so it rides naturally, with a strap up to the shoulder.
      const purse = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.055), Materials.custom(0xaa6633));
      purse.position.set(-0.02, hy + 0.02, 0.12);
      group.leftArm?.add(purse);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.058), Materials.custom(0x8a4e22));
      flap.position.set(-0.02, hy + 0.06, 0.12);
      group.leftArm?.add(flap);
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.006, 6, 16, Math.PI), Materials.custom(0xc8a030));
      strap.rotation.set(Math.PI / 2, 0, 0);
      strap.position.set(-0.02, hy + 0.11, 0.12);
      group.leftArm?.add(strap);
      break;
    }
    case 'mop': {
      const mopLen = Math.max(0.9, handY + 0.5);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, mopLen, 6), Materials.custom(0xaa8844));
      handle.position.set(-(handX + 0.03), mopLen / 2 + 0.04, handZ);
      group.add(handle);
      const mopHead = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 8), Materials.custom(0xd8d4c0));
      mopHead.position.set(-(handX + 0.03), 0.06, handZ);
      group.add(mopHead);
      break;
    }
    case 'gold_rolex': {
      const watch = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.04), Materials.custom(0xdaa520));
      holdLeft(watch, -0.01, 0.06, -0.02);   // on the wrist, just above the hand
      break;
    }
    case 'cane': {
      // GRIPPED in the right hand (was free-standing beside an open hand). The
      // shaft is parented to the arm, its top at the fist and its foot reaching
      // the floor; a curled grip wraps the handle.
      const caneMat = Materials.custom(0x663300);
      const caneLen = Math.max(0.5, rig.handY);          // hand height ≈ to floor
      const topLocalY = hy - 0.02;                        // fist, arm-local
      const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.011, caneLen, 8), caneMat);
      cane.position.set(0.02, topLocalY - caneLen / 2, 0.09);
      group.rightArm?.add(cane);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.012, 6, 10, Math.PI), caneMat);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(0.02, topLocalY + 0.012, 0.09);
      group.rightArm?.add(handle);
      grip(1, 0.0, 0.02);
      break;
    }
    case 'name_tag': {
      // Sunk against the lapel as low-relief (was floating ~0.03 proud of the
      // chest). Thinner card, seated on the torso front surface.
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.045, 0.005), Materials.paper());
      tag.position.set(0.075, rig.legLength + rig.torsoH * 0.7, rig.frontZ * 0.62 + 0.03);
      tag.rotation.z = 0.12;
      group.add(tag);
      break;
    }
    case 'golf_putter': {
      const club = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.7, 6), Materials.metal());
      shaft.position.y = -0.35;
      club.add(shaft);
      const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.04), Materials.metal());
      headMesh.position.set(0.03, -0.7, 0.02);
      club.add(headMesh);
      club.rotation.z = 0.2;
      holdRight(club, 0.02, 0.0, 0.04);
      grip(1);
      break;
    }
    default: {
      if (typeof acc === 'string' && acc.startsWith('cosmetic_')) {
        _addCosmeticVisual(group, acc.replace('cosmetic_', ''), rig);
      }
      break;
    }
  }
}

function _addCosmeticVisual(group, cosmeticId, rig) {
  const d = rig.d, headR = rig.headR;
  const handX = rig.handX, handY = rig.handY, handZ = rig.handZ;
  const head = group.head;
  const COSMETIC_VISUALS = {
    visor_green: () => {
      const visor = new THREE.Mesh(new THREE.BoxGeometry(headR * 2.1, 0.035, 0.13), Materials.custom(0x22aa44));
      visor.position.set(0, headR * 0.5, headR * 0.5);
      head?.add(visor);
    },
    party_hat: () => {
      const hat = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.65, 0.2, 10), Materials.custom(0xff4488));
      hat.position.set(0, headR * 1.15, 0);
      head?.add(hat);
    },
    tin_foil_hat: () => {
      const hat = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.85, 0.16, 6), Materials.custom(0xcccccc));
      hat.position.set(0, headR * 1.05, 0);
      head?.add(hat);
    },
    executives_fedora: () => {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.72, headR * 0.82, 0.1, 14), Materials.custom(0x1a1a1a));
      crown.position.set(0, headR * 0.95, 0);
      head?.add(crown);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.3, headR * 1.3, 0.016, 18), Materials.custom(0x1a1a1a));
      brim.position.set(0, headR * 0.82, 0);
      head?.add(brim);
    },
    reading_glasses: () => buildGlasses(head, headR, 'reading', true),
    blue_light_blockers: () => {
      const g = new THREE.Group();
      buildGlasses(head, headR, 'clear', true);
    },
    power_shades: () => buildGlasses(head, headR, 'sun', true),
    intern_badge: () => {
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.05, 0.008), Materials.paper());
      tag.position.set(0.07, rig.legLength + rig.torsoH * 0.72, rig.frontZ * 0.4 + 0.1);
      group.add(tag);
    },
    compliance_pin: () => {
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), Materials.custom(0xdd4444));
      pin.position.set(0.07, rig.legLength + rig.torsoH * 0.78, rig.frontZ * 0.4 + 0.1);
      group.add(pin);
    },
    corner_office_key: () => {
      const lanyard = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.13, 0.008), Materials.custom(0xdaa520));
      lanyard.position.set(0, rig.legLength + rig.torsoH * 0.58, rig.frontZ * 0.4 + 0.1);
      group.add(lanyard);
      const key = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.025, 0.008), Materials.custom(0xdaa520));
      key.position.set(0, rig.legLength + rig.torsoH * 0.48, rig.frontZ * 0.4 + 0.1);
      group.add(key);
    },
    stress_ball_clip: () => {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), Materials.custom(0xff6633));
      ball.position.set(d.bodyW / 2 + 0.025, rig.legLength + 0.04, 0.04);
      group.add(ball);
    },
    fountain_pen: () => {
      const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.005, 0.1, 6), Materials.custom(0x111111));
      pen.position.set(0.1, rig.legLength + rig.torsoH * 0.78, rig.frontZ * 0.4 + 0.1);
      pen.rotation.z = 0.3;
      group.add(pen);
    },
    janitors_keyring: () => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 6, 12), Materials.custom(0xaaaaaa));
      ring.position.set(d.bodyW / 2 + 0.04, rig.legLength + 0.08, 0.04);
      group.add(ring);
    },
    golden_calculator: () => {
      const calc = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.008), Materials.custom(0xdaa520));
      calc.position.set(-handX, rig.legLength + rig.torsoH * 0.35, handZ + 0.02);
      group.add(calc);
    },
  };
  const fn = COSMETIC_VISUALS[cosmeticId];
  if (fn) fn();
}

// ── The Algorithm (monolith) — verbatim from v4, contract preserved ───
function buildMonolith(config, options = {}) {
  const group = new THREE.Group();
  group.name = config.name || 'algorithm';
  group.isMonolith = true;

  const slabMat = Materials.custom(0x070b14, { stops: 4 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.9, 0.3), slabMat);
  slab.position.y = 1.2;
  group.add(slab);
  group.body = slab;

  const trimMat = Materials.custom(0x00ffee, { emissive: 0x00ffee, emissiveIntensity: 0.9 });
  const vTrimGeo = new THREE.BoxGeometry(0.03, 1.94, 0.05);
  const leftTrim = new THREE.Mesh(vTrimGeo, trimMat);
  leftTrim.position.set(-0.49, 1.2, 0.13);
  group.add(leftTrim);
  const rightTrim = new THREE.Mesh(vTrimGeo, trimMat);
  rightTrim.position.set(0.49, 1.2, 0.13);
  group.add(rightTrim);

  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (canvas) {
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
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 1.74), new THREE.MeshBasicMaterial({ map: tex }));
    screen.position.set(0, 1.2, 0.16);
    group.add(screen);
    group.screenFace = screen;
  }

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.025, 8, 32), Materials.custom(0x00ffee, { emissive: 0x00ffee, emissiveIntensity: 0.7 }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  group.add(ring);

  group.head = new THREE.Object3D();
  group.head.position.set(0, 2.3, 0);
  group.add(group.head);

  group.leftLeg = new THREE.Group();
  group.rightLeg = new THREE.Group();
  group.leftArm = new THREE.Group();
  group.rightArm = new THREE.Group();
  group.add(group.leftLeg, group.rightLeg, group.leftArm, group.rightArm);

  group.traverse(child => {
    if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
  });

  _addBlobShadow(group, 0.45);
  return group;
}

// ── contact shadow (CRITIC-TUNED params preserved from HEAD) ──────────
let _blobShadowTex = null;
function _blobShadowTexture() {
  if (_blobShadowTex) return _blobShadowTex;
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

function _addBlobShadow(group, radius) {
  const r = radius * 1.5;
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
  blob.renderOrder = 2;
  blob.userData.noFlash = true;
  blob.castShadow = false;
  blob.receiveShadow = false;
  group.add(blob);
}
