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
  // `legScale` shortens the LEGS only, so a petite character can lose stature
  // without shrinking her head/torso into a doll (Grandma read 0.86 of Karen's
  // height against the 0.76 petite spec).
  const legLength = (CHAR.V5_LEG_LENGTH ?? 0.70) * hs * (config.legScale ?? 1);
  const torsoH = (CHAR.V5_TORSO_H ?? 0.47) * hs;
  const neckH = (CHAR.V5_NECK_H ?? 0.075) * hs;
  group.legLength = legLength;

  // shoulderR is derived from the chest so broad builds read as broad
  // ROUNDED shoulders, not a flat coat-hanger shelf (Chad shoulderScale 1.5
  // used to flare the lathe top into a cape). Gentle broad response.
  // v6 round-3 — the ribcage was 0.165 (≈1.6 head-widths of half-width on its
  // own), which left NO budget for the arms inside LAW 1's 2.0-head-width
  // shoulder cap: Chad measured 2.3–2.4 as a flat shelf. A human ribcage is
  // ~1.4 head-widths, so the deltoid/arm mass — not the torso — carries the span.
  const chestR = 0.158 * ws;
  const dims = {
    hipR: 0.15 * ws * waistScale,
    waistR: 0.128 * ws * waistScale,
    chestR,
    // Tailored, not padded: a gentle broad response (was 1.08 + up to 0.55×) so
    // even Chad's shoulderScale 1.5 reads as a cut jacket that HANGS, not football
    // pads. Severance suits drape (addendum: shrink the shoulder ~20%, blend join).
    // v6 round-4 — broad response 0.34→0.50. Chad's shoulder line measured
    // congruent with the Intern's (2.3 head-widths on both: "the gym-bro V does
    // not exist"). With the deltoid now in the arm loft, the yoke needs to widen
    // WITH it or the arms hang off a narrow chest. Only shoulderScale>1 builds
    // are affected, and Chad is the only one in the cast.
    // v6 round-5 — broad response 0.50→1.15 (Chad is still the only build with
    // shoulderScale > 1). Measured on the r0 stills, his shoulder line came in at
    // the SAME 2.4-ish head-widths as the Intern's while the deltoid crest carried
    // all of it as a pasted ball; the trapezius/yoke has to widen with the arm or
    // the ">=2.6 head-width gym-V tapering to <=1.6 at the waist" (rider note 7)
    // is geometrically unreachable without a bicep wider than his own head.
    shoulderR: chestR * (1.02 + Math.max(0, shoulderScale - 1) * 1.35),
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
  // thigh + shin now sum to EXACTLY legLength so the sole lands on y≈0 (the old
  // 0.50/0.46 split left the figure hovering ~0.03 above the stage — "feet
  // floating").
  const thighLen = legLength * 0.52;
  const shinLen = legLength * 0.48;
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();               // hip pivot
    const thighWrap = new THREE.Group();
    // v6 round-3 — the knee is a FLAT butt joint between two lathes of the same
    // radius, so there is no cap sphere and no seam ring: the leg is one
    // continuous taper hip→ankle with a ≤2% mid-profile swell.
    // v6 round-5 — openBot: the thigh's flat bottom DISC (whose normals break 90°
    // where the side wall meets it) was still reading as a horizontal seam ring at
    // knee height on both of Grandma's legs at 4×. An open rim buried inside the
    // shin has no shading break and no silhouette.
    const thigh = limbSegment(0.078 * ws, 0.052 * ws, thighLen, mPants, { capBot: false, openBot: true });
    thigh.position.y = -thighLen / 2;
    thighWrap.add(thigh);
    collapseNode(thighWrap);
    leg.add(thighWrap);

    const knee = new THREE.Group();              // knee pivot
    knee.position.y = -thighLen;
    const shinWrap = new THREE.Group();
    // v6 round-4 — THE KNEE RING (LAW 2, karen_power_f5 both legs). The thigh's
    // flat bottom disc and the shin's flat top disc were EXACTLY coplanar at
    // y = -thighLen, so the two opposed faces z-fought into a 2–3px horizontal
    // "hose ring" on every trouser. The shin is now built 0.016 LONGER and lifted
    // by that amount, so its flat cap is buried inside the thigh and the visible
    // silhouette is one uninterrupted hip→ankle taper. rTop is solved so the
    // radius AT the knee plane still matches the thigh's 0.052 exit radius.
    const KNEE_TUCK = 0.016;
    const shinFull = shinLen + KNEE_TUCK;
    const shinTopR = (0.052 * ws) + (0.052 - 0.044) * ws * (KNEE_TUCK / shinFull);
    const shin = limbSegment(shinTopR, 0.044 * ws, shinFull, mPants, { capTop: false, openTop: true });
    shin.position.set(0, -shinFull / 2 + KNEE_TUCK, 0);
    shinWrap.add(shin);
    // v6 SLEEK LAW — no kneecap sphere. The shin's rounded top and the thigh's
    // rounded bottom share a radius (~0.055) so they overlap into a smooth knee.
    // shoe: ONE smooth lacquered loafer form (was a foot sphere + a heel sphere
    // reading as two lumps). A single elongated rounded mass carries heel→toe.
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.058 * ws, 22, 16), mShoe);
    foot.scale.set(0.92, 0.62, 2.0);
    // Sole flush with the stage: half-height = 0.058*ws*0.62.
    foot.position.set(0, -shinLen + 0.058 * ws * 0.62, 0.028);
    shinWrap.add(foot);
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
  const hemDrop = config.jacketHem ?? 0.0;
  const torso = buildTorso(dims, mSuit, detailed, hemDrop);
  torso.position.y = legLength;
  torso.position.z = torsoZ;
  torso.rotation.x = hunch;
  group.add(torso);
  group.body = torso;

  // v6 round-5 — DOWAGER'S CURVE. Producer, Grandma: "she straightened fully —
  // restore a touch of her hunch." A whole-torso tilt of 0.12rad is only ~7° and
  // reads as nothing once a garment covers the yoke; what says *hunch* is a rounded
  // upper BACK plus the head carried forward of the shoulders. This adds a low
  // rounded mass over the occipital yoke for any build that actually asks for a
  // hunch (grandma 0.12, janitor 0.16, intern 0.15) and never touches an erect one
  // (Rachel's negative hunch, everyone at 0).
  if (hunch > 0.08) {
    const humpR = dims.chestR * 0.92;
    const hump = new THREE.Mesh(new THREE.SphereGeometry(humpR, 24, 18), mSuit);
    hump.scale.set(1.02, 0.66, 0.60);
    hump.position.set(0, legLength + torsoH * (0.86 - hunch * 0.5), torsoZ - dims.chestR * 0.30);
    hump.rotation.x = hunch;
    group.add(hump);
  }

  // pelvis / crotch cover — a pants-coloured mass bridging the two thigh tops so
  // the dark background can't show through the inverted-V between the legs (Chad's
  // black crotch wedge). v6: taller so it reaches down past the upper thighs (the
  // longer v6 legs opened a gap below the old shallow cover); width kept just
  // under the thigh spread so slim builds don't bulge. Sits under the jacket hem.
  // v6 round-2 — the pelvis was a bulbous pod proud of BOTH trouser legs (the
  // "diaper" 4th side-inflection, karen/intern/andrew). Shrunk so its half-width
  // sits well inside the thigh spread and merges into the leg loft as one crotch
  // cover, not a discrete pod. Kept tall+thin so it still bridges the leg gap.
  // v6 round-3 — the pod was still PROUD of both trouser legs (half-depth
  // hipR*0.52 ≈ the thigh radius, bulging forward exactly where the thighs
  // recede: the diaper + deep-V crotch crease). It is now a thin, narrow
  // gusset that lives strictly INSIDE the thigh spread — a light-blocker
  // between the legs, contributing no silhouette inflection of its own.
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(dims.hipR * 0.58, 20, 16), mPants);
  pelvis.scale.set(1.02, 1.22, 0.52);
  pelvis.position.set(0, legLength - dims.hipR * 0.44, torsoZ);
  pelvis.rotation.x = hunch;
  group.add(pelvis);

  // TROUSER RISE — a pants-coloured shell from the hip pivot up to the belt, so
  // a waistband can sit at a human rise instead of at the crotch split (Chad:
  // "waistband/belt sits at the crotch split, trouser rise = 0"). Only built when
  // asked for; it lives UNDER the garment shell, which `jacketHem < 0` raises.
  const trouserRise = config.trouserRise ?? 0;
  if (trouserRise > 0) {
    const riseGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0.001, -0.03),
      new THREE.Vector2(dims.hipR * 0.92, -0.02),
      new THREE.Vector2(dims.hipR * 1.005, trouserRise * 0.45),
      new THREE.Vector2(dims.hipR * 0.975, trouserRise),
      new THREE.Vector2(dims.hipR * 0.90, trouserRise + 0.012),
      new THREE.Vector2(0.001, trouserRise + 0.016),
    ], detailed ? 48 : 32);
    riseGeo.computeVertexNormals();
    riseGeo.scale(1, 1, 0.68);
    const rise = new THREE.Mesh(riseGeo, mPants);
    rise.position.set(0, legLength, torsoZ);
    rise.rotation.x = hunch;
    group.add(rise);
  }

  // anchor points (group space)
  // v6 round-5 — the arm root drops from 0.87 to 0.82 of the torso height, i.e.
  // ONTO the yoke's widest row, and moves inboard (0.80→0.70 of shoulderR). Above
  // 0.82 the torso lathe eases inward fast, so an arm rooted at 0.87 hung its
  // crown out over a narrowing shell: that overhang IS the "discrete shoulder-ball
  // puff at the sleeve top" (LAW 2). Seated on the widest row with the loft's rim
  // pulled in (see deltoidR), the arm now emerges from inside the cloth.
  const shoulderY = legLength + Math.cos(hunch) * torsoH * 0.82;
  const shoulderZ = Math.sin(hunch) * torsoH * 0.82 + torsoZ;
  const shoulderX = dims.shoulderR * 0.70;
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
    // v6 round-3 — this pair is now GATED on an actual shirt. Chad, Ross and
    // Grandma all carry shirtColor: null yet still got the default off-white
    // wedge + collar, which rendered on Chad as "a proud rectangular pec-slab
    // plate with corner creases" in the middle of his polo (and on Grandma as a
    // white blob under the shawl). No shirt in the config → no shirt on the mesh.
    if (config.shirtColor != null) {
      // v6 round-4 — THE V NECKLINE. The old squashed sphere read as "a floating
      // white ellipse / sticker mid-chest" on Karen and a white pill on the Intern.
      // It is now a downward CONE (apex down = a real V) whose circular rim sits
      // under the collar band and whose point reaches into the sternum, hugged
      // flat against the torso's elliptical front. That is a blouse neckline.
      // The cone attempt sat INSIDE the torso: the yoke narrows hard toward the
      // neck base, so a fixed-radius shape floats in air at the top and is buried
      // at the chest — only its upper rim showed, which is the "floating pale
      // ellipse / sticker" read. The neckline is now a SHELL that follows the
      // torso's own lathe profile, with its arc narrowing row-by-row toward the
      // sternum — i.e. an actual V cut into the garment.
      const mNeckline = M.cloth(shirtC, { roughness: 0.60, sheen: 0.34, bump: 0.2, env: 0.25 });
      mNeckline.side = THREE.DoubleSide;
      const vee = buildNeckline(dims, torsoH, config.necklineWide ? 1.60 : 1.30, mNeckline,
        headR * 0.70 * (config.neckScale ?? 1));
      vee.position.set(0, legLength, torsoZ);
      vee.rotation.x = hunch;
      staticNode.add(vee);

      // collar band closing the top of the V — FRONT ONLY (v6 round-5). The old
      // 189° torus wrapped past the ears, so from 3/4 and behind every blazer in
      // the cast wore a bright white ring round the neck ("a priest's collar / neck
      // brace" on Karen). The arc is rotated in GEOMETRY space so it is centred on
      // +Z (the front) whatever the hunch, and shaded a stop under the blouse so it
      // never out-lights the face.
      const cArc = Math.PI * 0.62;
      const cGeo = new THREE.TorusGeometry(headR * 0.60, 0.017 * ws, 10, 20, cArc);
      cGeo.rotateZ(Math.PI / 2 - cArc / 2);
      const collar = new THREE.Mesh(cGeo, M.cloth(shadeHexToInt(shirtC, 0.94), { roughness: 0.62, sheen: 0.28, bump: 0.2 }));
      collar.position.set(0, neckBaseY - 0.004, neckBaseZ + 0.010);
      collar.rotation.set(Math.PI / 2 + hunch, 0, 0);
      staticNode.add(collar);
    }

    // POLO placket + knit collar (Chad) — a real garment-class read, so the 3D
    // matches the portrait's red polo instead of a plain long-sleeve crew.
    if (config.polo) {
      // v6 round-5 — the open-ended partial CYLINDER read as "two red blocks
      // flanking the neck with a notch cut between them" (Chad, 4× front + 3/4):
      // its two flat end caps faced the camera as slabs. A knit polo collar is now
      // ONE closed revolved band that flares outward-and-down off the neck base —
      // no end caps, no notch, and it wraps continuously at every angle.
      const mTrim = M.cloth(shadeHexToInt(suitC, 0.82), config.suitMat || {});
      const nR = headR * 0.70 * (config.neckScale ?? 1);
      // Thinner and tighter than the first pass, which read as a padded neck-brace
      // roll standing proud of the shoulders.
      const cH = 0.044 * ws;
      const pGeo = new THREE.LatheGeometry([
        new THREE.Vector2(nR * 1.02, 0),
        new THREE.Vector2(nR * 1.18, cH * 0.34),
        new THREE.Vector2(nR * 1.28, cH * 0.76),
        new THREE.Vector2(nR * 1.22, cH * 0.94),
        new THREE.Vector2(nR * 1.10, cH * 0.60),
        new THREE.Vector2(nR * 0.99, cH * 0.10),
      ], 36);
      pGeo.computeVertexNormals();
      pGeo.scale(1, 1, 0.88);
      const pCollar = new THREE.Mesh(pGeo, mTrim);
      pCollar.position.set(0, neckBaseY - 0.004, neckBaseZ);
      pCollar.rotation.x = hunch;
      staticNode.add(pCollar);
      // placket: sunk low-relief (LAW 2 ≤0.008 proud) with two buttons, so it reads
      // as a polo opening instead of the dark vertical crease it was.
      const placket = new THREE.Mesh(new THREE.BoxGeometry(0.026 * ws, torsoH * 0.17, 0.005), mTrim);
      placket.position.set(0, neckBaseY - torsoH * 0.12, neckBaseZ + dims.chestR * 0.655);
      placket.rotation.x = hunch;
      staticNode.add(placket);
      for (const by of [0.055, 0.115]) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.0058 * ws, 8, 6), Materials.custom(0xe8e0d4, { stops: 4 }));
        btn.scale.set(1, 1, 0.5);
        btn.position.set(0, neckBaseY - torsoH * by, neckBaseZ + dims.chestR * 0.665);
        staticNode.add(btn);
      }
    }

    // v6 round-3 FINAL — NO lapel geometry, by ruling. Every plate-shaped
    // attempt read as damage on the cloth rather than tailoring: sunk boxes
    // showed only their edges ("two vertical drawstring lines" on Karen's blazer,
    // "cracks in the cloth" on Andrew's), a chest-wrapping arc read as a flat
    // rectangular slab catching its own light, and a collar band + notch tabs
    // read as a scoop necklace with two pull-strings. LAW 2 permits tailoring as
    // low relief (<=0.008 proud) or A PAINT PASS only — and the jacket shell
    // reads clean on its own, with the collar/neckline and tie carrying the suit.
    // Do NOT re-add lapel plates without a texture pass to hang them on.
    // (config.lapels is still honoured by callers; it now only gates paint.)

    // tie
    if (config.tieColor) {
      const mTie = M.cloth(tc(config.tieColor), { roughness: 0.5, sheen: 0.6, bump: 0.15 });
      // v6 round-4 — the knot sat torsoH*0.12 BELOW the collar with the blade
      // starting lower still, so the critic read "a rounded brown slug floating
      // 0.04 below the button with a capsule tip". The knot is now a small
      // trapezoid seated AT the collar band and the blade's top overlaps it, so
      // the tie is anchored to the collar as one garment.
      const knot = new THREE.Mesh(new THREE.CylinderGeometry(0.017 * ws, 0.022 * ws, 0.032 * ws, 4), mTie);
      knot.rotation.y = Math.PI / 4;
      knot.scale.set(1, 1, 0.62);
      // z pushed out to the torso's ACTUAL front surface (the lathe is squashed
      // to 0.66 depth, so chestR*0.5 was inside the jacket — Andrew's "front view
      // has lost … tie and shirt-front").
      knot.position.set(0, neckBaseY - torsoH * 0.045, neckBaseZ + dims.chestR * 0.68);
      staticNode.add(knot);
      const tieH = torsoH * 0.42;
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.044 * ws, tieH, 0.011), mTie);
      tie.position.set(0, neckBaseY - torsoH * 0.045 - tieH * 0.5 + 0.010, neckBaseZ + dims.chestR * 0.655);
      tie.rotation.x = hunch;
      staticNode.add(tie);
    }

    // v6 round-4 — NO deltoid fillet spheres at all. Even flattened they read as
    // "discrete shoulder-ball puffs at the sleeve tops" (Karen, karen_power_f5) —
    // a LAW 2 violation. The deltoid swell now lives in the upper-arm lathe
    // profile (`config.muscular` widens it), and the arm root is seated deep
    // enough inside the torso yoke that the slope is continuous with no filler.

    // belt at the waist (opt-in) — separates jacket/shirt from pants so the
    // lower body doesn't read as bare legs (rider: Chad in a "red leotard").
    if (config.belt) {
      // Rides the TOP of the trouser rise when there is one, so the waistband
      // sits at a human rise instead of at the crotch split.
      const beltY = legLength + (config.trouserRise ?? 0) + 0.010;
      const beltR = dims.hipR * ((config.trouserRise ?? 0) > 0 ? 1.015 : 1.03);
      const mBelt = M.cloth(0x17130d, { roughness: 0.5, bump: 0.2 });
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(beltR, beltR, 0.034, 28), mBelt);
      belt.scale.z = 0.68;
      belt.position.set(0, beltY, torsoZ);
      staticNode.add(belt);
      // The belt must read as a band that WRAPS (critic: "a floating front-centre
      // buckle patch, not a wrapping band"), so the buckle is a small plate seated
      // flush on the band's front arc and the band itself carries all the way round.
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.028, 0.012), Materials.custom(0xcaa840));
      buckle.position.set(0, beltY, torsoZ + beltR * 0.66);
      staticNode.add(buckle);
    }

    // ── NECK (LAW 1) — a real lit tapered column between jaw and collar.
    // Producer, Karen: "too much neck and none at all" — the failure was a SHORT
    // WIDE untapered slab whose skin ran straight into the jaw, so the eye read
    // one continuous blob and the exposed part looked like chest. Fixes:
    //  · a proper lathe taper (R×0.54 top → R×0.70 base) with a small trapezius
    //    flare at the very base, so the column plainly narrows toward the jaw;
    //  · the neck skin is a value-stop DARKER than the face (painted AO under the
    //    jaw, LAW 3) so the jaw/neck boundary reads without added geometry;
    //  · per-character `neckExtra` lengthens the column (and lifts the head with
    //    it) where the collar was swallowing it.
    const nsc = config.neckScale ?? 1;
    const nExtra = config.neckExtra ?? 0;
    const nTop = headR * 0.54 * nsc, nBase = headR * 0.70 * nsc;
    const nLen = neckH * 1.18 + nExtra;
    const neckGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0.001, -nLen * 0.5 - 0.004),
      new THREE.Vector2(nBase * 1.14, -nLen * 0.5),         // trapezius flare
      new THREE.Vector2(nBase, -nLen * 0.28),
      new THREE.Vector2(nBase * 0.92, -nLen * 0.06),
      new THREE.Vector2(nTop * 1.03, nLen * 0.30),
      new THREE.Vector2(nTop, nLen * 0.5),
      new THREE.Vector2(nTop * 0.5, nLen * 0.5 + 0.006),
      new THREE.Vector2(0.001, nLen * 0.5 + 0.008),
    ], 36);
    neckGeo.computeVertexNormals();
    const neck = new THREE.Mesh(neckGeo, M.skin(shadeHexToInt(skinC, 0.88), null));
    neck.position.set(0, neckBaseY + nLen * 0.42, neckBaseZ + Math.sin(hunch) * neckH * 0.5);
    neck.rotation.x = hunch * 0.5;
    staticNode.add(neck);
  }
  collapseNode(staticNode);
  group.add(staticNode);

  // ── ARMS: shoulder pivot → upper + fore + cuff + hand ───────────────
  const upperArmLen = torsoH * 0.5;
  const foreArmLen = torsoH * 0.46;
  const handLocalY = -upperArmLen - foreArmLen - 0.02;
  // shortSleeve (Chad's polo) — the forearm renders as BARE SKIN with a suit-
  // coloured sleeve hem at the bicep, instead of a full sleeve + shirt cuff.
  const shortSleeve = config.shortSleeve === true;
  const foreMat = shortSleeve ? mSkin : mSuit;
  // v6 round-4 — the athletic V now lives in the ARM LOFT, not in a torso flare
  // (which read as a cape) and not in pasted deltoid balls. `muscular` swells the
  // upper-arm top (deltoid) and the bicep→elbow band inside ONE taper, which is
  // what pushes Chad's shoulder line past 2.6 head-widths while the waist holds.
  const musc = config.muscular === true;
  // v6 round-5 — the deltoid CREST radius (widest point of the upper arm, sitting
  // ~26% down from the shoulder) and the TOP RIM radius (what tucks inside the
  // yoke) are now separate dials. Chad's crest is pushed to 2.05× so the shoulder
  // line clears 2.6 head-widths (rider note 7) while the rim stays small enough to
  // hide inside the cloth.
  const deltoidR = 0.058 * ws * (musc ? 1.80 : 1.0);
  const upTopR = deltoidR * (musc ? 0.46 : 0.62);
  const upBotR = 0.05 * ws * (musc ? 1.28 : 1.0);
  const foreTopR = 0.05 * ws * (musc ? 1.28 : 1.0);
  const foreBotR = 0.04 * ws * (musc ? 1.14 : 1.0);
  const ELBOW_TUCK = 0.012;
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();               // shoulder pivot
    // shortSleeve builds the whole arm in SKIN as one loft and lays the polo
    // sleeve over it as a shell, so there is no cloth→skin butt joint on the
    // bicep (the old hem cylinder shared the sleeve's radius and z-fought into a
    // serrated red sawtooth ring at 4×).
    const armMat = shortSleeve ? mSkin : mSuit;
    const upper = limbSegment(upTopR, upBotR, upperArmLen, armMat,
      { capBot: false, capTop: false, openBot: true, openTop: true, deltoidR });
    upper.position.y = -upperArmLen / 2;
    arm.add(upper);
    // Forearm built LONGER and lifted so its open rim is buried inside the upper
    // arm — same butt-joint fix as the knee (no elbow seam ridge, no flat disc).
    const foreFull = foreArmLen + ELBOW_TUCK;
    const fore = limbSegment(foreTopR, foreBotR, foreFull, foreMat, { capTop: false, openTop: true });
    fore.position.set(0, -upperArmLen - foreFull / 2 + ELBOW_TUCK, 0.012);
    fore.rotation.x = -0.10;
    arm.add(fore);
    // v6 SLEEK LAW — no elbow sphere. The upper arm's rounded bottom (0.05) and
    // the forearm's rounded top (0.05) share a radius and overlap into a smooth
    // elbow, so the sleeve reads as one continuous cloth, not a jointed doll arm.
    if (shortSleeve) {
      // POLO SLEEVE — a cloth shell over the top 46% of the upper arm, riding the
      // same loft 4% proud, with an OPEN hem rim (no disc, no coplanar face). It
      // reads as a sleeve ending on the bicep instead of a band painted round it.
      const L = upperArmLen, PR = 1.042;
      const rMid = (deltoidR + upBotR) * 0.51;              // loft radius at −0.5L
      const rHem = deltoidR * 0.985 + (rMid - deltoidR * 0.985) * 0.85;   // at −0.46L
      const sGeo = new THREE.LatheGeometry([
        new THREE.Vector2(rHem * PR, -0.46 * L),
        new THREE.Vector2(deltoidR * 0.99 * PR, -0.24 * L),
        new THREE.Vector2(deltoidR * PR, -0.13 * L),
        new THREE.Vector2((deltoidR + upTopR) * 0.52 * PR, -0.04 * L),
        new THREE.Vector2(upTopR * 1.02, 0),
      ], 44);
      sGeo.computeVertexNormals();
      const sleeve = new THREE.Mesh(sGeo, mSuit);
      arm.add(sleeve);
    } else {
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.041 * ws, 0.041 * ws, 0.03, 14), mShirt);
      cuff.position.set(0, -upperArmLen - foreArmLen + 0.02, 0.03);
      arm.add(cuff);
    }
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

    // `shoulderLift` pulls the shoulders IN and UP — the "oversized suit
    // swallowing a hunched frame" read the Intern was missing.
    const lift = config.shoulderLift ?? 0;
    arm.position.set(side * (shoulderX + 0.010 * ws) * (1 - lift * 3), shoulderY - 0.025 + lift, shoulderZ + lift * 0.6);
    arm.rotation.z = side * (0.05 + lift * 4);
    arm.rotation.x = hunch * 0.5 + lift * 2;
    group.add(arm);
    if (side < 0) group.leftArm = arm; else group.rightArm = arm;
  }

  // ── HEAD (egg skull + ears + face patch + hair + glasses) ───────────
  // Head lifted (0.72→0.86 headR): with the lower face shortened to 0.80 the chin
  // rose only marginally above the collar, so Karen's chin landed straight on the
  // blouse (LAW 1: "neck is VISIBLE — never sunk in collar"). The lift exposes a
  // real lit neck column between jaw and collar on every build.
  const headY = neckBaseY + neckH + (config.neckExtra ?? 0) + headR * 0.90;
  // Hunched builds carry the head FORWARD of the shoulder line (×1.7) — the other
  // half of the dowager's-curve read (see the hump above).
  const headZ = neckBaseZ + Math.sin(hunch) * (headR * 0.9 + neckH) * (hunch > 0.08 ? 1.7 : 1.0)
    + (config.headForward ?? 0);
  const head = new THREE.Group();
  head.position.set(0, headY, headZ);
  // Slight downward nod so the face aims at the combat camera (which looks
  // UP at the head); without it, the up-view foreshortens the face into a
  // long blank jaw with the features crammed at the top.
  // HUNCH COMPENSATION: a hunched figure (Grandma) sits short, so the combat cam
  // looks LESS up at her — the fixed nod then over-pitched her face downward and
  // rotated the whole lower band (mouth/chin) out of view, leaving a mouthless
  // expanse below the nose (the cast-bug the patch-elongation fix didn't reach on
  // her). Pitching the head back up in proportion to the hunch re-presents the
  // lower face so the painted mouth lands on the visible front.
  // Base nod eased 0.15→0.09: at the old pitch a fringe could still clip over the
  // brow line and the lower face curved away from the lens.
  // `headPitch` adds a deliberate cervical curl (+ = chin down). The Intern's
  // archetype needs ~8° of forward curl; without it he reads as composed as Andrew.
  head.rotation.x = 0.09 - hunch * 0.42 + (config.headPitch ?? 0);

  // v6 LAW 4 — every jaw/chin dial is clamped into the human ±band [0.85, 1.15];
  // no lantern jaws, no pinched chins. (Silhouette/attitude live elsewhere.)
  const _clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const jawDial = _clamp(config.jaw ?? 0.9, 0.85, 1.15);
  const chinDial = _clamp(config.chin ?? 1.0, 0.85, 1.15);
  const skull = makeHead(headR, mSkin, { jaw: jawDial, chin: chinDial, detailed });
  head.add(skull);
  const mConcha = M.skin(shadeHexToInt(skinC, 0.58), null);
  for (const side of [-1, 1]) {
    // Rounder, seated further back on the skull (z −0.18, was −0.12) so at 3/4 it
    // tucks beside the head instead of floating as a pale disc mid-cheek
    // (Chad/Intern note). A dark concha dimple recessed into the front sells it
    // as an ear (item 8) — the old comment promised this but never drew it.
    // Smaller (0.23→0.20) and RAISED to the eye→nose band (y −0.05→−0.01) so it
    // no longer sits at mouth/jaw height (item: Chad "raise the ear") and never
    // dominates the skull side as a paddle (item: Grandma).
    // v6 round-3 — the eye line moved to y≈+0.12R and the nose base to ≈−0.20R,
    // so the ear's eye→nose band centres at ≈−0.04R. Slimmer + shorter so it can
    // never dominate the skull side as a paddle (grandma).
    // v6 round-4 — TUCKED TO THE SKULL. At x 0.94R / z −0.18R the ear's outer
    // edge stood ~0.03R proud of the hair silhouette in back-3/4, reading as "a
    // detached skin bead floating off the head" (Andrew, 4× in the fight stills).
    // Pulled in (0.94→0.88) and forward (−0.18→−0.11) so the whole form sits
    // INSIDE the skull's silhouette as low relief at eye→nose height.
    const ear = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.19, 16, 12), mSkin);
    ear.scale.set(0.44, 0.88, 0.80);
    ear.position.set(side * headR * 0.88, -headR * 0.04, -headR * 0.11);
    head.add(ear);
    const concha = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.10, 12, 10), mConcha);
    concha.scale.set(0.44, 0.78, 0.50);
    concha.position.set(side * headR * 0.925, -headR * 0.04, -headR * 0.05);
    head.add(concha);
  }

  // hair (before collapse so it merges by material)
  const mStreak = config.hairStreakColor != null ? M.hair(tc(config.hairStreakColor)) : null;
  const mUnder = config.hairUnderColor != null ? M.hair(tc(config.hairUnderColor)) : null;
  buildHair(head, headR, mHair, resolveHairStyle(config.hairStyle), mStreak, mUnder);

  // face textures + curved patch
  const faceSize = detailed ? 512 : 256;
  group.faceTextures = paintFaceSet(faceConfig, faceSize);
  let facePatch = null;
  if (group.faceTextures && group.faceTextures.neutral) {
    facePatch = makeFacePatch(headR, group.faceTextures.neutral, M, detailed);
    facePatch.userData.noMerge = true;
    head.add(facePatch);
  }

  collapseNode(head, [mHair, mStreak, mUnder].filter(Boolean));
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
    handX: shoulderX + 0.010 * ws,
    handZ: shoulderZ + 0.04,
    handLocalY,                     // arm-local Y of the hand (for held items)
    // The torso lathe is squashed to 0.66 depth, so its front SURFACE sits at
    // chestR*0.66 — accessories anchored to chestR*0.5 were sunk inside the body.
    frontZ: neckBaseZ + dims.chestR * 0.66,
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
        // v6 LAW 5 — skin is MATTE. Clearcoat + sheen stripped entirely (they
        // ring specular latitude bands and read plastic-horror under the arena
        // wash). Roughness raised to 0.82 so the diffuse gradient carries the
        // form; the higher-tessellated geometry does the rest.
        const m = new THREE.MeshPhysicalMaterial({
          color: faceTex ? 0xffffff : color, map: faceTex || null,
          roughness: 0.82, clearcoat: 0.0,
          sheen: 0.0, envMapIntensity: 0.28,
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
  // hairMat may be a single material or an array (hair + a streak colour), all of
  // which must keep noCast so hair never smudges the face.
  const hairSet = hairMat ? new Set(Array.isArray(hairMat) ? hairMat : [hairMat]) : null;
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
    if (hairSet && hairSet.has(mat)) mesh.userData.noCast = true;
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
    case 'karen': return 'bob_asym';
    case 'backwards_cap': return 'cap';
    case 'shawl': return 'bun_soft';
    case 'bob_asym': return 'bob_asym';
    case 'quiff': return 'quiff';
    case 'bun_soft': return 'bun_soft';
    case 'long': return 'long';
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
  // v6 round-3 — the base was #d0d0d0 (0.82×), which MULTIPLIES the material
  // colour: every hair in the cast rendered ~2 value-stops darker than its config
  // hex, so Karen's platinum 0xdccaa0 read ochre-brown and Chad's blonde read
  // chocolate. Near-white base → the config hex is the hair value you get.
  ctx.fillStyle = '#f6f6f6';
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    const len = 26 + Math.random() * 64;
    ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.20)' : 'rgba(130,130,130,0.16)';
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

// ── head metrology (LAW 3) ────────────────────────────────────────────
// The skull is an egg: crown eased 1.05×, lower hemisphere COMPRESSED. v6
// round-2 ran 0.90, which left 57% of the head below the eyes (mouth→chin 33%
// of skull height vs a human 20–22%) — the "stretched mask / all jaw" read.
// 0.80 shortens the lower face; FacePainter's eyeY/noseTipY/mouthY and
// makeFacePatch's theta band are solved against THIS number. Change all four
// together or the eye-line drifts off 50%.
const LOWER_FACE = 0.80;
// Patch band on the skull, in polar angle from the crown. Widened from 1.40 so
// the painted mouth can reach ~79% down the skull — at 1.40 the patch simply
// ENDED above the mouth line and left bare skull as a blank muzzle.
const PATCH_THETA_START = 0.68;
const PATCH_THETA_LEN = 1.62;

// ── geometry helpers ──────────────────────────────────────────────────
// v6 SLEEK LAW (LAW 2) — a limb is ONE continuous tapered loft, not a cylinder
// hidden behind two cap spheres. The rounded ends are built into the LATHE
// profile so there is no seam ring and no pasted ball; where two segments butt
// (thigh↔shin, upper↔fore-arm) their matched-radius rounded ends overlap into a
// smooth joint, so the knee/elbow reads as a gentle widening — never a kneecap.
// Total extent is preserved (±(len/2 + r)) so all downstream positions line up.
// v6 round-3: `capTop`/`capBot` may be set FLAT at a butt joint. Two rounded
// caps meeting at the knee/elbow summed into a full SPHERE at the joint — the
// "legs balloon at knee height then pinch to the ankle" / "horizontal seam rings
// at the knee" note. A flat cap against a matching flat cap is invisible and
// leaves the joint as a pure profile taper.
// v6 round-5 additions:
//   · `openBot`/`openTop` end the loft as an OPEN tube (no centre vertex, so no
//     flat disc). A flat disc at a butt joint still breaks the normals where the
//     side wall meets it, which is exactly the horizontal "hose ring" the critics
//     kept reading at the knee (grandma, both legs) and the elbow. An open rim
//     buried inside the mating segment has no silhouette and no shading break.
//   · `deltoidR` puts the widest point of the loft JUST BELOW the top and pulls
//     the top rim in to `rTop`, so an upper arm reads as one continuous
//     shoulder→bicep→elbow taper whose crown tucks inside the torso yoke —
//     replacing the rounded top cap that was rendering as a discrete
//     "shoulder-ball puff" proud of the jacket (LAW 2, Karen + Chad).
function limbSegment(rTop, rBot, len, mat, opts = {}) {
  const capTop = opts.capTop !== false;
  const capBot = opts.capBot !== false;
  const half = len / 2;
  const CAP = 6;                        // quarter-arc steps per rounded end
  const pts = [];
  if (capBot) {
    for (let i = 0; i <= CAP; i++) {
      const a = (Math.PI / 2) * (i / CAP);
      pts.push(new THREE.Vector2(Math.sin(a) * rBot, -half - Math.cos(a) * rBot));
    }
  } else if (opts.openBot) {
    pts.push(new THREE.Vector2(rBot, -half));
  } else {
    pts.push(new THREE.Vector2(0.0001, -half));
    pts.push(new THREE.Vector2(rBot, -half));
  }
  // straight tapered side. The midpoint carries a whisper of a swell (mid-limb
  // widening, ≤2%) — a gentle profile, never a kneecap.
  if (opts.deltoidR) {
    const d = opts.deltoidR;
    pts.push(new THREE.Vector2((d + rBot) * 0.5 * 1.02, 0));
    pts.push(new THREE.Vector2(d * 0.985, half * 0.52));
    pts.push(new THREE.Vector2(d, half * 0.74));          // deltoid crest
    pts.push(new THREE.Vector2((d + rTop) * 0.52, half * 0.92));
  } else {
    pts.push(new THREE.Vector2((rTop + rBot) * 0.5 * 1.02, 0));
  }
  pts.push(new THREE.Vector2(rTop, half));
  if (capTop) {
    for (let i = 1; i <= CAP; i++) {
      const a = (Math.PI / 2) * (i / CAP);
      pts.push(new THREE.Vector2(Math.cos(a) * rTop, half + Math.sin(a) * rTop));
    }
  } else if (!opts.openTop) {
    pts.push(new THREE.Vector2(0.0001, half));
  }
  // v6 round-5 — 28 radial segments faceted visibly on Chad's big deltoid/bicep
  // radii at 4x (hard triangular shading panels down the sleeve). 44 keeps every
  // limb sub-pixel-smooth at combat framing for a few hundred extra triangles.
  const geo = new THREE.LatheGeometry(pts, opts.seg ?? 44);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
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
    // v6 round-2 — the eye-line rendered at ~40-43% of skull height (LAW 3 wants
    // 50%) and 57% of the head read as jaw/jowl. The lower hemisphere is now
    // COMPRESSED (0.90) while the crown eases (1.05): the chin rises toward the
    // mouth, so the eye sits ≈50% down a shorter lower face and a real neck shows.
    v.y *= (yN >= 0 ? 1.05 : LOWER_FACE);
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

function makeFacePatch(rad, faceTex, M, detailed = false) {
  // v6 round-4 — the patch spanned ±1.0 rad (≈0.84R of frontal width) and, once
  // the alpha feather ate the outer ramp, the painted skin read as an inset oval
  // ~55% of the head-sphere width: the "matryoshka mask-hole" on Grandma. Widened
  // to ±1.11 rad (≈0.90R) so the face plate covers ≥75% of the frontal sphere.
  const phiStart = Math.PI * 0.5 - 1.11;
  const phiLen = 2.22;
  // Patch band nudged DOWN the skull (0.62→0.68) so the painted eyes/nose/mouth
  // seat lower — pairs with the shortened lower face to land the eye-line ≈50%.
  const thetaStart = PATCH_THETA_START;
  const thetaLen = PATCH_THETA_LEN;
  // Bulge kept minimal (0.4%) so the patch does NOT catch more light than the
  // skull beneath it — the "patch is brighter than the head" luminance step.
  // polygonOffset (below) keeps it from z-fighting despite the tiny gap.
  // Segment density is raised hard on the combat tier: at 48 the ~20 visible
  // latitude bands shaded as concentric "onion rings" across the cheeks/forehead
  // at 4× (item 4, Chad/Intern). 128 pushes each band sub-2px so the patch is a
  // clean gradient; smooth normals are recomputed to seal it.
  const seg = detailed ? 128 : 56;
  const geo = new THREE.SphereGeometry(rad * 1.004, seg, seg, phiStart, phiLen, thetaStart, thetaLen);
  // Conform the patch to the SAME egg the skull uses (makeHead): the skull is
  // elongated 1.09× in Y with a brow-ridge bulge, but the patch was a plain
  // sphere section — so it sat SHORTER than the skull and its lower-face
  // latitudes (mouth/chin) fell behind the skull, leaving the painted mouth
  // occluded by bare skull (item 1, Grandma's blank lower face). Matching the
  // elongation seats the mouth on the visible front face. Jaw-narrowing is
  // intentionally NOT copied (it would pull the patch behind the skull); the
  // un-narrowed patch stays a hair proud, which is what we want.
  {
    const pos = geo.attributes.position;
    const vv = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      vv.fromBufferAttribute(pos, i);
      const yN = vv.y / (rad * 1.004);
      vv.y *= (yN >= 0 ? 1.05 : LOWER_FACE);   // MATCH makeHead's shortened lower face
      if (yN > 0.15 && vv.z > 0) vv.z += rad * 0.03 * (yN - 0.15);
      pos.setXYZ(i, vv.x, vv.y, vv.z);
    }
  }
  geo.computeVertexNormals();
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

// `hem` controls where the garment shell TERMINATES relative to the hip pivot:
//   hem > 0  → a real jacket/blazer hem hanging that far BELOW the hip, a hair
//              proud of the trouser shell (Karen: the pink blazer used to end
//              exactly at the leg-split Y with zero relief → "pink leotard").
//   hem < 0  → the shell ends ABOVE the hip, so the belt + trouser rise own the
//              pelvis (Chad: the polo hem dipped below the belt → "briefs over
//              pants"). Points below the base are dropped so the loft stays
//              monotonic.
// A blouse/shirt neckline that RIDES the torso loft. Rows follow the same
// profile the jacket shell uses (a hair proud), and the swept arc narrows toward
// the sternum so the opening reads as a V rather than a pasted oval.
function buildNeckline(dims, torsoH, arcTop, mat, neckR = 0) {
  const { chestR, shoulderR } = dims;
  // Kept SHORT (collar → just under the collarbone): the first pass ran all the
  // way to the chest and painted a cream bib across the sternum.
  // The first two rows used to run at shoulderR*0.34 / *0.60 — INSIDE the neck
  // column on slim-necked builds, so the top of the neckline was swallowed and the
  // remaining rows read as a detached pale trapezoid floating mid-chest with pink
  // between it and the collar. The shell now starts at the collar radius so cloth
  // is continuous from the collar band down to the V point.
  const rows = [
    [Math.max(shoulderR * 0.40, neckR * 1.06), torsoH * 1.010],
    [Math.max(shoulderR * 0.66, neckR * 1.18), torsoH * 0.985],
    [shoulderR * 0.84, torsoH * 0.95],
    [shoulderR * 0.955, torsoH * 0.895],
    [shoulderR * 0.99, torsoH * 0.845],
    [chestR * 1.00, torsoH * 0.79],
  ];
  void chestR;
  const SEG = 22;
  const pos = [], idx = [];
  for (let i = 0; i < rows.length; i++) {
    const t = i / (rows.length - 1);
    // v6 round-5 — the arc taper was 0.92 of a NARROW top arc, so the shell shrank
    // to a small isolated wedge that read as "a pale paper triangle taped to the
    // sternum", visually detached from the collar band above it. The top row now
    // spans the same front arc the collar does (they meet as one garment) and the
    // taper carries it to a real V point at the sternum.
    const arc = arcTop * (1 - t * 0.86) + 0.05;
    const rr = rows[i][0] * 1.014, yy = rows[i][1];
    for (let j = 0; j <= SEG; j++) {
      const phi = -arc / 2 + (j / SEG) * arc;
      pos.push(-rr * Math.sin(phi), yy, rr * Math.cos(phi) * 0.66);
    }
  }
  for (let i = 0; i < rows.length - 1; i++) {
    for (let j = 0; j < SEG; j++) {
      const a = i * (SEG + 1) + j, b = a + 1, c = a + SEG + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

function buildTorso(dims, mat, detailed = false, hem = 0) {
  const { hipR, waistR, chestR, shoulderR, torsoH } = dims;
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const pts = [];
  if (hem > 0) {
    const hw = hipR * 1.10;                    // ~0.01 proud of the trousers
    pts.push(V2(0.001, -hem - 0.013));
    pts.push(V2(hw * 0.64, -hem - 0.009));
    pts.push(V2(hw, -hem));
    pts.push(V2(hw * 0.985, -hem * 0.42));
    pts.push(V2(hipR * 1.02, 0.02));
  } else {
    const y0 = -hem;                           // hem<0 raises the shell base
    pts.push(V2(0.001, y0 - 0.006));
    pts.push(V2(hipR * 0.82, y0));
    pts.push(V2(hipR, y0 + 0.028));
  }
  const upper = [
    V2(hipR * 0.98, torsoH * 0.16),
    V2(waistR, torsoH * 0.34),
    V2(waistR * 1.06, torsoH * 0.46),
    V2(chestR, torsoH * 0.60),
    // v6 round-3 — the profile used to hold ~chestR from 0.62 to 0.74 then jump
    // to shoulderR at 0.90 and cap abruptly: a vertical wall with a flat top,
    // which is the "horizontal coat-hanger shelf that drops 90° at the deltoid
    // corner". It is now ONE continuous convex V-to-yoke arc — the widest point
    // sits at 0.82 and every step above it eases inward, so shoulder→neck is a
    // rounded slope (LAW 2: one loft, ≤3 inflections).
    V2(chestR * 1.01, torsoH * 0.71),
    V2(shoulderR * 0.995, torsoH * 0.82),
    V2(shoulderR * 0.955, torsoH * 0.895),
    V2(shoulderR * 0.84, torsoH * 0.95),
    V2(shoulderR * 0.60, torsoH * 0.995),
    V2(shoulderR * 0.34, torsoH * 1.025),
    V2(shoulderR * 0.16, torsoH * 1.04),
  ];
  const floorY = pts[pts.length - 1].y + 0.020;
  for (const p of upper) if (p.y > floorY) pts.push(p);
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
function buildHair(head, r, mat, style, streakMat = null, underMat = null) {
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
      v.y *= (yN >= 0 ? 1.05 : LOWER_FACE);  // match head egg elongation (shortened lower)
      if (v.z < 0) v.z *= 0.92;          // match flattened occiput
      if (yN > 0.15 && v.z > 0) v.z += r * 0.03 * (yN - 0.15);  // match brow ridge
      v.multiplyScalar(grow);            // float uniformly proud of the skin
      // front hairline lift: raise front-of-head verts below the hairline up to
      // it (weighted by how far forward they are), so the forehead stays open
      // and the rim forms a natural arc that dips toward the temples/ears.
      // The lift is tapered LATERALLY (item 3): full at the centre-front so the
      // forehead opens, falling to zero by the temples so the cap stays down over
      // them. Without this, the temple rim lifted too, opening a bare-scalp wedge
      // between the fringe and the side mass (the Intern's "two detached lobes").
      if (v.z > 0 && v.y < hairlineY * r) {
        const front = Math.min(1, v.z / (r * 0.5));
        const lateral = Math.max(0, 1 - (Math.abs(v.x) / (r * 0.6)) ** 2);
        const lift = (hairlineY * r - v.y) * front * lateral;
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
  function fringe(y = 0.4, depth = 0.62, widthS = 1.4, tiltX = 0.34, heightS = 0.5) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(r * 0.7, 22, 16), mat);
    f.scale.set(widthS, heightS, depth);
    f.rotation.x = tiltX;
    f.position.set(0, r * y, r * 0.5);
    add(f);
  }

  if (style === 'bob_asym') {
    // KAREN — canonical portrait: an ASYMMETRIC side-parted platinum power-bob
    // with a pale streak in the under-layer. Round-3's 'bob' was a symmetric
    // centre-parted curtain that cold-read as "a blonde woman in pink"; no
    // portrait landmark survived the 3D pass. The part now sits ~0.25 head-widths
    // off centre, the long side sweeps DOWN over one brow, and the short side is
    // tucked back so a real strip of forehead reads on that half (which is also
    // what drops the apparent eye line back toward mid-skull).
    scalpCap(1.5, 1.035, 0.62);
    const PART = 0.5;                                    // ×r off centre
    const longSide = new THREE.Mesh(new THREE.SphereGeometry(r * 0.70, 26, 20), mat);
    longSide.scale.set(1.08, 0.42, 0.66);
    longSide.rotation.set(0.18, 0.32, 0.34);
    longSide.position.set(-r * 0.30, r * 0.60, r * 0.46);
    add(longSide);
    // THE FRINGE OVER ONE BROW (portrait signature, rider note 2). Both sweeps used
    // to sit at y≈0.7r — clear of the brow line — so the bob still cold-read as a
    // symmetric centre-part: nothing crossed the forehead. This lock rides the long
    // side down across the OUTER half of that brow and stops short of the eye, so
    // the asymmetry is legible from the front and both eyes still read.
    const browLock = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 22, 16), mat);
    browLock.scale.set(0.86, 0.26, 0.54);
    browLock.rotation.set(0.16, 0.30, 0.52);
    browLock.position.set(-r * 0.42, r * 0.40, r * 0.62);
    add(browLock);
    const shortSide = new THREE.Mesh(new THREE.SphereGeometry(r * 0.52, 22, 16), mat);
    shortSide.scale.set(0.78, 0.34, 0.56);
    shortSide.rotation.set(0.04, -0.42, -0.46);
    shortSide.position.set(r * (PART + 0.12), r * 0.72, r * 0.32);
    add(shortSide);
    // jaw-length side curtains: pushed BACK past the face-plate rim (so the rim
    // can never poke through as a skin sliver in profile — karen_power_f2) and
    // held clear of the neck column so the neck still reads as a lit column.
    // Jaw-length side curtains. Shortened (1.66→1.24) and pushed BACK (z −0.06 →
    // −0.20) so they frame the face without hanging down over the NECK — the
    // producer's "swallowed by hair" half of the neck failure — while still
    // overlapping the face-plate rim so no skin sliver pokes through in profile.
    // v6 round-5 — the curtains hung to −0.24r at z −0.20r, i.e. ACROSS the jaw in
    // the frontal read: at 4× they closed under the chin as a brown chin-strap
    // (the same "bearded" failure the silver shawl-hair had). They now stop at the
    // jaw ANGLE and sit further outboard and further back, so the jawline, chin and
    // the lit neck column are all clear of hair from the front.
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.SphereGeometry(r * 0.54, 22, 18), mat);
      side.scale.set(0.46, s < 0 ? 0.98 : 0.86, 1.14);
      side.position.set(s * r * 0.92, -r * (s < 0 ? 0.10 : 0.05), -r * 0.30);
      side.rotation.z = s * -0.12;
      add(side);
    }
    // DARK UNDERLAYER (producer ruling: "asymmetric platinum bob, dark
    // underlayer") — the nape mass takes the deeper value, so the platinum crown
    // reads as a lit top layer over it.
    // Pushed BACK (−0.46r → −0.62r) and shortened: the darker nape mass was
    // wrapping far enough forward to read as brown hair around the jaw from the
    // front. It must only be visible from 3/4-behind, under the platinum top layer.
    const backB = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 26, 20), underMat || mat);
    backB.scale.set(1.00, 1.12, 0.88);
    backB.position.set(0, -r * 0.10, -r * 0.62);
    add(backB);
    // THE PALE STREAK — the portrait's other signature. Seated on the LONG sweep
    // and pushed forward of the curtain plane so it reads from the front, not only
    // in profile.
    if (streakMat) {
      // A slim STRAND inside the sweep, not a pad on the cheek: narrow in x/z and
      // seated on the curtain plane so it reads as a lock of pale hair.
      // A pale BAND (rider note 2), not a hairline strand: the portrait's streak is
      // a broad light panel through the lower half of the long side. Widened in x/z
      // and pushed onto the curtain's outboard face so it reads at fight framing.
      const streak = new THREE.Mesh(new THREE.SphereGeometry(r * 0.50, 22, 18), streakMat);
      streak.scale.set(0.28, 0.86, 0.82);
      streak.position.set(-r * 0.86, -r * 0.10, -r * 0.14);
      streak.rotation.z = 0.20;
      add(streak);
      const streak2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 20, 16), streakMat);
      streak2.scale.set(0.74, 0.22, 0.54);
      streak2.rotation.set(0.16, 0.32, 0.40);
      streak2.position.set(-r * 0.50, r * 0.50, r * 0.50);
      add(streak2);
    }
  } else if (style === 'quiff') {
    // CHAD — a gym-bro quiff with REAL forward volume (~0.3 head-heights of
    // relief across the front third). The 'short' cap he used to wear was a
    // 0-relief scalp paint job, so under the backwards cap he had no hair read at
    // all. Worn UNDER the cap: the front mass is what shows.
    // v6 round-5 — hairline lifted 0.58→0.68 (measured forehead was 12% of face
    // height, human ~30%) and the quiff mass raised WITH the cap rim so the crest
    // stands ~0.3 head-heights proud of the scalp in front of it (rider note 8) and
    // still reads under the backwards cap.
    scalpCap(1.44, 1.03, 0.68);
    backMass(0.98, -r * 0.04, 1.0);
    const quiff = new THREE.Mesh(new THREE.SphereGeometry(r * 0.72, 26, 20), mat);
    quiff.scale.set(1.14, 0.46, 1.42);
    quiff.rotation.x = -0.30;
    quiff.position.set(0, r * 0.70, r * 0.66);
    add(quiff);
    const quiffRoot = new THREE.Mesh(new THREE.SphereGeometry(r * 0.60, 22, 16), mat);
    quiffRoot.scale.set(1.18, 0.54, 0.92);
    quiffRoot.position.set(0, r * 0.74, r * 0.26);
    add(quiffRoot);
  } else if (style === 'long') {
    // RACHEL (the friendly one — internal id `rachel_to`, display "Rachel"): long
    // blonde hair past the shoulders. Built to the same bible law as every other
    // style: a scalp-CONFORMING cap (no floating visor, no cap-step at the
    // hairline), a soft centre-ish part, and a single long back mass that hangs
    // below the nape instead of a stack of blobs.
    scalpCap(1.52, 1.035, 0.56);
    // the long fall: one tapered mass from the crown down past the shoulders
    const fallGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0.001, r * 0.86),
      new THREE.Vector2(r * 0.66, r * 0.62),
      new THREE.Vector2(r * 0.98, r * 0.10),
      new THREE.Vector2(r * 1.02, -r * 0.60),
      new THREE.Vector2(r * 0.92, -r * 1.30),
      new THREE.Vector2(r * 0.70, -r * 1.86),
      new THREE.Vector2(r * 0.34, -r * 2.06),
      new THREE.Vector2(0.001, -r * 2.10),
    ], 40);
    fallGeo.computeVertexNormals();
    const fall = new THREE.Mesh(fallGeo, mat);
    fall.scale.set(1.0, 1.0, 0.86);
    fall.position.set(0, 0, -r * 0.20);
    add(fall);
    // front curtains framing the face, jaw-length, tucked back off the cheeks
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.SphereGeometry(r * 0.56, 22, 18), mat);
      side.scale.set(0.46, 1.34, 1.06);
      side.position.set(s * r * 0.86, -r * 0.30, r * 0.04);
      side.rotation.z = s * -0.10;
      add(side);
    }
    // a soft off-centre part sweep (no hard centre seam)
    const sweep = new THREE.Mesh(new THREE.SphereGeometry(r * 0.66, 24, 18), mat);
    sweep.scale.set(1.04, 0.40, 0.62);
    sweep.rotation.set(0.16, 0.22, 0.16);
    sweep.position.set(-r * 0.18, r * 0.62, r * 0.44);
    add(sweep);
  } else if (style === 'bun_soft') {
    // GRANDMA — silver hair swept up into a TOP BUN over a FULL skin head. The
    // old 'shawl' shell was a smooth white swim-cap whose lower rim wrapped under
    // the jaw: the face became an inset oval ~55% of the head width (a matryoshka
    // mask-hole) with a grey chin-strap band beneath the chin. A shallow cap +
    // high hairline + a real bun leaves the whole face plate, jaw and chin in skin.
    scalpCap(0.98, 1.045, 0.70);
    const backG = new THREE.Mesh(new THREE.SphereGeometry(r * 0.84, 24, 18), mat);
    backG.scale.set(1.06, 0.88, 0.94);
    backG.position.set(0, r * 0.16, -r * 0.34);
    add(backG);
    for (const s of [-1, 1]) {
      const wave = new THREE.Mesh(new THREE.SphereGeometry(r * 0.34, 18, 14), mat);
      wave.scale.set(0.52, 0.86, 0.80);
      wave.position.set(s * r * 0.80, r * 0.26, r * 0.10);
      wave.rotation.z = s * -0.14;
      add(wave);
    }
    const bunBase = new THREE.Mesh(new THREE.SphereGeometry(r * 0.26, 16, 12), mat);
    bunBase.scale.set(1.1, 0.7, 1.0);
    bunBase.position.set(0, r * 0.86, -r * 0.16);
    add(bunBase);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 24, 18), mat);
    bun.scale.set(1.0, 0.90, 1.0);
    bun.position.set(0, r * 1.06, -r * 0.18);
    add(bun);
  } else if (style === 'side_part') {
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
    scalpCap(1.5, 1.035, 0.46);
    // curtain fringe: two smooth swept pieces meeting at a high part, sweeping
    // OUT to the temples (forehead + eye zone stay open).
    // v6 round-3 — the two bang lobes read as "croissant-shaped" and their lower
    // edge sat right on the brow, tucking the eyes under an overhang. Lifted and
    // flattened into one asymmetric side-swept curtain (portrait: an asymmetric
    // bob) that clears the brow line entirely.
    for (const s of [-1, 1]) {
      const bang = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 22, 16), mat);
      bang.scale.set(s < 0 ? 1.06 : 0.86, 0.40, 0.56);
      bang.rotation.set(0.20, s * 0.5, s * 0.42);
      bang.position.set(s * r * 0.34, r * 0.66, r * 0.52);
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
    // Hairline lifted (0.34→0.42) so a strip of forehead shows and the silver hair
    // stops reading as a tight nun's coif wrapped to the eyes (item: Grandma's
    // "hair opening ends above the mouth"); the raised eye-line keeps the seam hid.
    // Hairline lifted again (0.42→0.50) and the back mass pulled up and BACK: the
    // silver shell was closing under the jaw like a nun's coif, so the face
    // opening ended above the mouth line and "no mouth exists in any frame".
    // thetaLen pulled in from 1.5 to 1.24 so the silver shell stops at the ear
    // line instead of sheeting forward over the temples and cheeks (the coif).
    scalpCap(1.24, 1.045, 0.52);
    const back = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 22, 18), mat);
    back.scale.set(1.10, 1.10, 1.02);
    back.position.set(0, -r * 0.04, -r * 0.36);
    add(back);
    for (const s of [-1, 1]) {
      // Pushed DOWN and BACK (z −0.2→−0.5) off the ear line and narrowed (0.5→0.42)
      // so the silver drape frames behind the jaw instead of sitting over the ear
      // as a flat gray paddle (item: Grandma's ear paddle).
      // Shrunk hard (0.5→0.34 radius, 1.3→0.95 height) and kept behind the ear
      // plane so it can never read as "a flat hair-gray ear paddle dominating the
      // skull side".
      const drape = new THREE.Mesh(new THREE.SphereGeometry(r * 0.34, 18, 14), mat);
      drape.scale.set(0.44, 0.95, 0.72);
      drape.position.set(s * r * 0.84, -r * 0.34, -r * 0.52);   // outboard + BEHIND the jaw
      drape.rotation.z = s * -0.06;
      add(drape);
    }
  } else { // 'short'
    // Conforming cap to the ears + a single swept fringe rooted at the hairline.
    // Hairline RAISED (0.38→0.46) so a strip of forehead + full eyes show under
    // the fringe (item: Intern's hair eclipses the forehead/lenses). The fringe is
    // lifted and pulled back (y 0.4→0.52, less depth/tilt) so it can't clip down
    // over the eyes at a combat head-pitch (item: Andrew's blindfold fringe).
    // Hairline raised again (0.46→0.56) and the fringe lifted clear of the brow:
    // the black shell was eclipsing the Intern's forehead AND the top half of both
    // lenses, and clipping over Andrew's eyes as a blindfold band on impact
    // frames. Full lenses + a strip of forehead must always read.
    // v6 round-4 — the fringe SPHERE still bottomed out at ≈0.20R (below the
    // painted brow at 0.244R), so the forehead measured ~12% of face height
    // against a human ~30% and the band clipped over the eyes on impact frames.
    // Lifted and thinned into a swept band whose lower edge lands ≈0.55R: the
    // forehead now reads as a real third band between hairline and brow.
    scalpCap(1.5, 1.03, 0.60);
    backMass(1.0, -r * 0.04, 1.0);
    fringe(0.78, 0.44, 1.32, 0.10, 0.28);
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
    rim.position.set(s * sep, r * 0.118, zf);   // ON the painted eye-line (LAW 3 solve)
    rim.userData.noFlash = true;
    head.add(rim);
    // lens fill: sunglasses get a dark tint; reading/clear get a faint bluish
    // glass so the disc catches light and the rim reads as an actual lens.
    const lensMat = kind === 'sun'
      ? new THREE.MeshPhysicalMaterial({ color: 0x0a0a10, roughness: 0.12, metalness: 0.2, clearcoat: 0.9, transparent: true, opacity: 0.88 })
      // Reading/clear glass barely tints — a faint rim catch, not a frosted disc
      // that smudges the eyes behind it (addendum: Grandma's eyes are smudges).
      // Specular calmed (rougher clearcoat, low envMap) so the lens no longer
      // blows to a pink-white glare pool that half-drowns the pupil (critic).
      : new THREE.MeshPhysicalMaterial({ color: 0xbcd0e0, roughness: 0.2, metalness: 0.0, clearcoat: 0.4, clearcoatRoughness: 0.35, transparent: true, opacity: 0.10, envMapIntensity: 0.4 });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(lensR, 20), lensMat);
    lens.position.set(s * sep, r * 0.118, zf - tube * 0.4);
    lens.userData.noFlash = true;
    head.add(lens);
    // lens glint — a bright white dot sitting on the LENS FRONT (proud of the
    // rim, upper-inner) so each lens plainly catches light. This is the figurine
    // read that says "there is glass here" and keeps glasses-wearers from looking
    // dead-eyed under the dark venue wash (item 2). Bigger + further forward than
    // the old sub-pixel rim bead that never showed.
    // Smaller catchlight bead, seated at the upper-OUTER lens edge (not over the
    // pupil) so it says "glass" without drowning the eye (critic: glare pools).
    const glint = new THREE.Mesh(new THREE.SphereGeometry(tube * 1.05, 10, 8), catchMat);
    glint.position.set(s * sep + s * lensR * 0.5, r * 0.118 + lensR * 0.56, zf + tube * 1.2);
    glint.userData.noFlash = true;
    head.add(glint);
  }
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.016, r * 0.016, sep * 0.7, 8), frameMat);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, r * 0.145, zf + tube);
  bridge.userData.noFlash = true;
  head.add(bridge);
  // temple arms angling back to the ears (sell the air gap in profile)
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.014, r * 0.014, r * 0.72, 6), frameMat);
    arm.rotation.set(Math.PI / 2 - 0.12, 0, 0);
    arm.position.set(s * (sep + lensR * 0.82), r * 0.145, r * 0.62);
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
      // Seated on the EARLOBE and pushed forward of the hair curtain plane, or a
      // bob swallows them (they must read as the portrait's pearl studs).
      const pearlGeo = new THREE.SphereGeometry(0.0145, 12, 10);
      const pearlMat = Materials.custom(0xf6f0e2, { stops: 4 });
      for (const side of [-1, 1]) {
        const pearl = new THREE.Mesh(pearlGeo, pearlMat);
        pearl.position.set(side * (rig.headR * 0.88), -rig.headR * 0.40, rig.headR * 0.12);
        group.head?.add(pearl);
      }
      break;
    }
    case 'protein_shake': {
      // Seated at HAND height and pushed well forward of the fist (was riding up
      // at dy 0.05 into the forearm with the grip missing it — item 9). Grip
      // knuckles now wrap its front so it reads as held, not embedded.
      // Portrait: a GREY gym shaker with a dark screw lid — the old flat green
      // cylinder read as a pickle jar.
      const shakeMat = Materials.custom(0xb9bec4, { stops: 4 });
      const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.030, 0.125, 16), shakeMat);
      holdRight(bottle, 0.01, 0.0, 0.055);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0345, 0.0345, 0.030, 16), Materials.custom(0x8d7a66, { stops: 4 }));
      band.position.set(0.01, hy - 0.020, 0.115);
      group.rightArm?.add(band);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.034, 0.032, 16), Materials.custom(0x24272b, { stops: 4 }));
      cap.position.set(0.01, hy + 0.076, 0.115);
      group.rightArm?.add(cap);
      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.016, 10), Materials.custom(0x24272b, { stops: 4 }));
      spout.position.set(0.01, hy + 0.098, 0.122);
      group.rightArm?.add(spout);
      grip(1, 0.0, 0.035);
      break;
    }
    case 'backwards_cap': {
      // Chad's portrait signature. Worn OVER the quiff hair style, so the blonde
      // front tuft still reads (bible: blonde quiff) while the cap dome + rear
      // brim give the portrait's backwards-cap silhouette.
      const r = rig.headR;
      // Value matters more than hue here: at 0x2e2622 the cap was in the scene
      // graph but rendered black-on-black against the Refn stage, so the note "no
      // backwards cap" survived two passes. This reads as a dark cap AND holds a
      // silhouette against the void.
      // Round-4: at 0x8a7460 the cap was almost exactly Chad's blonde hair value,
      // so it merged into the hair and the note "no backwards cap" survived
      // another pass. A dark slate crown reads as a CAP against both the blonde
      // quiff below it and the black stage behind it.
      // v6 round-5 — 0x4c4f58 rendered olive-brown under the arena's warm key and
      // sat within a value stop of his blonde hair, so the crown still cold-read as
      // "a brown bowl cut" and the note "no backwards cap" survived. A cooler, DARKER
      // navy-slate separates from hair in both hue and value, and an explicit rim
      // band draws the hard hat edge across the forehead that says HAT.
      const capMat = Materials.custom(0x33384a, { stops: 4 });
      const rimMat = Materials.custom(0x262a38, { stops: 4 });
      // Round-3: the first pass capped only above y≈0.73R, so the quiff sat
      // proud of it and the cap was invisible. The dome now reaches down to
      // ≈0.46R — over the hair mass — so the backwards cap is the crown, with
      // blonde hair reading at the temples/nape below its rim.
      // v6 round-5 — RIM RAISED (thetaLen 1.14→0.94). At 1.14 the dome's front rim
      // sat at ≈0.46R, i.e. ~2mm above the brow: measured forehead was ~12% of face
      // height against a human ~30% (rider note 9), which is what made him read
      // brow-heavy and hairline-less. The rim now lands at ≈0.68R, so a real strip
      // of forehead plus the blonde quiff read under the cap.
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.10, 32, 22, 0, Math.PI * 2, 0, 0.94), capMat);
      dome.position.set(0, r * 0.04, -r * 0.05);
      dome.scale.set(1.02, 1.06, 1.04);
      dome.userData.noCast = true;
      group.head?.add(dome);
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.66, r * 0.66, 0.014, 20, 1, false, 0, Math.PI), capMat);
      brim.rotation.set(Math.PI / 2 - 0.18, Math.PI, 0);
      brim.position.set(0, r * 0.44, -r * 1.04);
      brim.userData.noCast = true;
      group.head?.add(brim);
      const btn = new THREE.Mesh(new THREE.SphereGeometry(r * 0.075, 10, 8), capMat);
      btn.position.set(0, r * 1.16, -r * 0.04);
      btn.userData.noCast = true;
      group.head?.add(btn);
      // front rim band: a shallow torus arc riding the dome's front edge, so the cap
      // terminates in a HARD hat line above the brow instead of fading into hair.
      const rArc = Math.PI * 1.05;
      const rimGeo = new THREE.TorusGeometry(r * 0.86, r * 0.055, 8, 28, rArc);
      rimGeo.rotateZ(Math.PI / 2 - rArc / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.set(Math.PI / 2 - 0.30, 0, 0);
      rim.position.set(0, r * 0.60, -r * 0.02);
      rim.scale.set(1.04, 1.0, 0.92);
      rim.userData.noCast = true;
      group.head?.add(rim);
      break;
    }
    case 'gold_chain': {
      // Chad's gold chain — a ring around the neck base with a small pendant dip
      // on the chest (portrait signature). Sits over the polo collar.
      // Round-4: `rig.frontZ` is already the torso's front SURFACE in world z, so
      // scaling it by 0.32 buried the ring inside the chest and only its top arc
      // showed — "a single floating yellow pill at sternum height / a badge
      // sticker". The chain now loops at the NECK BASE, proud of the collar, with
      // a short drape to a pendant sitting on the chest surface.
      // v6 round-5 — the ring was tilted 0.34rad AND pushed forward off the neck
      // axis, so only its front arc cleared the chest and it read as "a curved
      // yellow banana slab pasted on the pec". It is now centred on the NECK AXIS,
      // nearly flat, riding just under the polo collar's flare — a chain that
      // wraps, with one small pendant where the V dips.
      // v6 round-5b — a horizontal ring centred on the neck axis is geometrically
      // INSIDE the chest at chest height (the torso is far wider than the neck), so
      // the flat ring vanished and only its pendant showed. The chain is therefore
      // drawn as a hanging V ARC in the FRONTAL plane, laid against the chest
      // surface: an arc of a torus whose bottom sits at the sternum and whose ends
      // rise toward the collarbones. That is what a chain under an open polo does.
      const chainMat = Materials.custom(0xd8b23c, { stops: 4 });
      const nb = rig.legLength + rig.torsoH;            // neck base
      const arc = Math.PI * 0.98;
      const cR = rig.headR * 0.74;
      const cGeo = new THREE.TorusGeometry(cR, 0.0075, 8, 34, arc);
      cGeo.rotateZ(-Math.PI / 2 - arc / 2);             // centre the arc on -Y (a V)
      const chain = new THREE.Mesh(cGeo, chainMat);
      chain.scale.set(1.06, 0.86, 0.42);                // flatten onto the chest
      chain.rotation.x = -0.12;
      chain.position.set(0, nb - 0.014, rig.frontZ - 0.004);
      group.add(chain);
      const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 12, 10), chainMat);
      pendant.scale.set(1, 1.2, 0.62);
      pendant.position.set(0, nb - 0.014 - cR * 0.86, rig.frontZ + 0.004);
      group.add(pendant);
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
      // Round-4: the shaft was a 0.017-radius stick in a value that vanished
      // against the dark stage — the critic saw only "an orange blob clipped into
      // her right hip with no shaft". Thicker, warmer wood, a crook handle that
      // reads at fight framing, and a dark rubber ferrule on the floor.
      // v6 round-5 — at 0xc08c4c / r0.0145 the SHAFT still vanished: a thin
      // mid-value cylinder in a black void catches almost no key, so the still read
      // as "an orange blob at her hip with no cane" for a third round. The shaft is
      // now thicker and a light honey value that holds against the stage, the crook
      // is bigger, and the ferrule is pale grey (a dark ferrule was invisible too).
      const caneMat = Materials.custom(0xe0b070, { stops: 4 });
      const caneLen = Math.max(0.5, rig.handY);          // hand height ≈ to floor
      const topLocalY = hy - 0.02;                        // fist, arm-local
      const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.016, caneLen, 16), caneMat);
      cane.position.set(0.034, topLocalY - caneLen / 2, 0.100);
      group.rightArm?.add(cane);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.017, 10, 20, Math.PI * 1.2), caneMat);
      handle.rotation.set(Math.PI / 2, 0, -0.12);
      handle.position.set(0.034, topLocalY + 0.020, 0.100);
      group.rightArm?.add(handle);
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.021, 0.030, 12), Materials.custom(0x8e8e96, { stops: 4 }));
      ferrule.position.set(0.034, topLocalY - caneLen + 0.014, 0.100);
      group.rightArm?.add(ferrule);
      grip(1, 0.0, 0.03);
      break;
    }
    case 'name_tag': {
      // The Intern's portrait signature — a white ID tag on the lapel. Round-3
      // shrank it to an off-white 0.068 chip at 0.96 of frontZ, which the critic
      // read as absent. Bigger, brighter, seated proud of the jacket surface with
      // a printed name band so it reads as a TAG, not a smudge.
      const tag = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.044, 0.005),
        Materials.custom(0xf2eee2, { stops: 4 }));
      tag.position.set(0.072, rig.legLength + rig.torsoH * 0.66, rig.frontZ + 0.007);
      tag.rotation.set(0, -0.24, 0.08);
      group.add(tag);
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.008, 0.002),
        Materials.custom(0x5a6478, { stops: 4 }));
      line.position.set(0, -0.006, 0.004);
      tag.add(line);
      break;
    }
    case 'shawl': {
      // GRANDMA — a real draped shawl shell over the shoulders and upper back,
      // open at the front (portrait signature; "the flat periwinkle jumpsuit reads
      // institutional-inmate, not warm knitter"). Built as a sphere SHELL band so
      // it hangs over the yoke as cloth instead of being a pasted plate.
      // v6 round-5 — the shell ran R = bodyW*0.62 with a 1.26 y-stretch across a
      // 1.08-rad theta band: it swallowed the whole upper body and both arms, so she
      // cold-read as "a lilac Snuggie with two pale ovals floating over the arms",
      // and it buried the hunch the producer asked to see. It is now a SHOULDER
      // shawl: smaller radius, shallow band, no y-stretch, sitting on the yoke with
      // two slim front folds — the figure (and the lean) reads through it.
      const sh = config.shawlColor ?? 0xa4a2c8;
      const mShawl = Materials.custom(sh, { stops: 4 });
      const R = rig.bodyW * 0.46;
      const geo = new THREE.SphereGeometry(R, 40, 26, Math.PI * 0.22, Math.PI * 1.56, 0.52, 0.86);
      geo.scale(1, 1.06, 0.90);
      geo.computeVertexNormals();
      const drape = new THREE.Mesh(geo, mShawl);
      drape.position.set(0, rig.legLength + rig.torsoH * 0.88, rig.shoulderZ - R * 0.05);
      group.add(drape);
      // two slim front folds hanging off the shoulders down the chest
      for (const s of [-1, 1]) {
        const fold = new THREE.Mesh(new THREE.SphereGeometry(R * 0.17, 20, 16), mShawl);
        fold.scale.set(0.40, 1.45, 0.34);
        fold.position.set(s * R * 0.46, rig.legLength + rig.torsoH * 0.60, rig.frontZ * 0.92);
        fold.rotation.z = s * 0.12;
        group.add(fold);
      }
      break;
    }
    case 'cameo_brooch': {
      // Grandma's cameo at the throat (portrait: a dark oval brooch closing the
      // shawl). Small, seated on the cloth, with a pale carved face inside.
      const y = rig.legLength + rig.torsoH * 0.90;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.007, 18), Materials.custom(0x2a2028, { stops: 4 }));
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(0.82, 1, 1);
      rim.position.set(0, y, rig.frontZ + 0.008);
      group.add(rim);
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.004, 16), Materials.custom(0xd8cbb8, { stops: 4 }));
      face.rotation.x = Math.PI / 2;
      face.scale.set(0.82, 1, 1);
      face.position.set(0, y, rig.frontZ + 0.013);
      group.add(face);
      break;
    }
    case 'gold_brooch': {
      // Karen's gold lapel brooch (portrait signature) — a small flower of five
      // petals around a bead, sunk onto the blazer front, LEFT lapel.
      const mGold = Materials.custom(0xd9b53f, { stops: 4 });
      const bx = -rig.bodyW * 0.30, by = rig.legLength + rig.torsoH * 0.66;
      const bz = rig.frontZ * 0.92 + 0.006;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.0095, 10, 8), mGold);
        petal.scale.set(1, 1, 0.5);
        petal.position.set(bx + Math.cos(a) * 0.0115, by + Math.sin(a) * 0.0115, bz);
        group.add(petal);
      }
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 10, 8), Materials.custom(0xf0dc8a, { stops: 4 }));
      bead.scale.set(1, 1, 0.6);
      bead.position.set(bx, by, bz + 0.004);
      group.add(bead);
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
