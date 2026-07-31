import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Materials } from '../effects/MaterialLibrary.js';
import { bakeEnabled, bakeVertexColor, batchMaterialFor, materialSignature } from '../effects/GeometryBatch.js';
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
  // v7 — headScale defaults to heightScale. Nine cast members carried a
  // heightScale with no headScale, which scaled the BODY and left the head at
  // base size: measured, they ran 7.05–7.75 heads (LAW 1 caps at 7.0) and read
  // pin-headed. Every explicitly-authored headScale is still honoured exactly.
  const hd = config.headScale ?? config.heightScale ?? 1.0;
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
    // v7 — the yoke is solved against LAW 1's head-width rule instead of being a
    // free-floating 1.02× of the ribcage. With V7_HEAD_R = 0.0855 (half-width),
    // chestR·1.083 puts a default male shoulder line at 0.342 = 2.00 head-widths,
    // which is also biacromial/height ≈ 0.214 — the two independent checks agree.
    // Female builds run 0.88 of that (1.76 head-widths). The bible's 1.6 predates
    // the turnaround sheets; measured on karen_body_v2 the shoulder line is ~1.76
    // head-widths, and 1.6 on a 6.9-head figure reads as a waif, not a woman.
    // shoulderScale now works in BOTH directions (it used to be a no-op below 1,
    // so grandma's 0.92 never did anything).
    // The broad response is 0.55, not 1.35: at 1.35 Chad's yoke measured 3.3
    // head-widths and the deltoid could not clear it, so the sleeve top read as a
    // hard shelf STEP off a slab. 0.55 lands his shoulder line at 2.6 head-widths
    // (rider note 7) with the arm crest still outboard of the cloth.
    shoulderR: chestR * (1.083 + (shoulderScale - 1) * (shoulderScale > 1 ? 0.55 : 0.60))
      * (config.gender === 'f' ? 0.88 : 1.0),
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
  const stanceX = dims.hipR * 0.74;
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
    const thigh = limbSegment(0.078 * ws, 0.052 * ws, thighLen, mPants, { capBot: false, openBot: true, topology: 'trouser', seat: true });
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
    const shin = limbSegment(shinTopR, 0.044 * ws, shinFull, mPants, { capTop: false, openTop: true, topology: 'trouser' });
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
  const torso = buildTorso(dims, mSuit, detailed, hemDrop, config.gender === 'f');
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
  // v7 round-12 — the gusset was still PROUD of both thighs: half-width 0.089
  // against thigh inner surfaces at ±0.033 and a spherical front, so it bulged
  // forward exactly where the thighs recede (the "diaper" bulge, visible on every
  // figure in fight-the_firm). It is now narrower than the thigh gap in x and
  // shallower than the thigh radius in z — a pure light-blocker between the legs
  // that contributes no silhouette of its own.
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(dims.hipR * 0.42, 20, 16), mPants);
  pelvis.scale.set(0.90, 1.60, 0.98);
  pelvis.position.set(0, legLength - dims.hipR * 0.42, torsoZ);
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
  const shoulderY = legLength + Math.cos(hunch) * torsoH * 0.845;
  const shoulderZ = Math.sin(hunch) * torsoH * 0.845 + torsoZ;
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
        headR * 0.80 * (config.neckScale ?? 1));
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
      const cGeo = new THREE.TorusGeometry(headR * 0.86, 0.0105 * ws, 10, 22, cArc);
      cGeo.rotateZ(Math.PI / 2 - cArc / 2);
      const collar = new THREE.Mesh(cGeo, M.cloth(shadeHexToInt(shirtC, 0.84), { roughness: 0.66, sheen: 0.20, bump: 0.2 }));
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
      const nR = headR * 0.80 * (config.neckScale ?? 1);
      // Thinner and tighter than the first pass, which read as a padded neck-brace
      // roll standing proud of the shoulders.
      const cH = 0.044 * ws;
      const pGeo = new THREE.LatheGeometry([
        new THREE.Vector2(nR * 1.01, 0),
        new THREE.Vector2(nR * 1.06, cH * 0.34),
        new THREE.Vector2(nR * 1.10, cH * 0.76),
        new THREE.Vector2(nR * 1.07, cH * 0.94),
        new THREE.Vector2(nR * 1.03, cH * 0.60),
        new THREE.Vector2(nR * 0.985, cH * 0.10),
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
      const knot = new THREE.Mesh(new THREE.CylinderGeometry(0.0125 * ws, 0.017 * ws, 0.026 * ws, 10), mTie);
      knot.scale.set(1, 1, 0.58);
      // z pushed out to the torso's ACTUAL front surface (the lathe is squashed
      // to 0.66 depth, so chestR*0.5 was inside the jacket — Andrew's "front view
      // has lost … tie and shirt-front").
      knot.position.set(0, neckBaseY - torsoH * 0.045, neckBaseZ + dims.chestR * 0.68);
      staticNode.add(knot);
      const tieH = torsoH * 0.42;
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.036 * ws, tieH, 0.009), mTie);
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
    // v7 — the column is solved against the head placement, not guessed: it runs
    // from the collar (y=0 here, = neckBaseY) to the CHIN (nVis = neckH + extra),
    // then continues nUp further UP so its top is buried inside the jaw and there
    // is never a skin gap where the mandible meets it. Producer amendment 2 caps
    // the top radius at 0.55R ("a neck is a column, not a plinth").
    const nsc = config.neckScale ?? 1;
    const nExtra = config.neckExtra ?? 0;
    const nVis = neckH + nExtra;
    const nTop = headR * 0.55 * nsc, nBase = headR * 0.70 * nsc;
    const nUp = headR * 0.62;
    const neckGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0.001, -0.030),
      new THREE.Vector2(nBase * 1.08, -0.014),              // trapezius flare
      new THREE.Vector2(nBase, nVis * 0.10),
      new THREE.Vector2(nBase * 0.93, nVis * 0.38),
      new THREE.Vector2(nTop * 1.05, nVis * 0.78),
      new THREE.Vector2(nTop, nVis),
      new THREE.Vector2(nTop * 0.99, nVis + nUp * 0.55),
      new THREE.Vector2(nTop * 0.74, nVis + nUp),
      new THREE.Vector2(0.001, nVis + nUp * 1.06),
    ], 36);
    neckGeo.computeVertexNormals();
    neckGeo.scale(1, 1, 0.94);                              // a neck is a hair oval
    const neck = new THREE.Mesh(neckGeo, M.skin(shadeHexToInt(skinC, 0.88), null));
    neck.position.set(0, neckBaseY, neckBaseZ + Math.sin(hunch) * neckH * 0.5);
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
  // v7 — 1.80 built a hard shelf with a visible crest ring (chad r1: "football
  // pads with a faceted edge"). 1.42 keeps the gym-bro V measurable while the
  // crest stays inside one continuous taper.
  const deltoidR = 0.058 * ws * (musc ? 1.42 : 1.0);
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
      { capBot: false, capTop: false, openBot: true, openTop: true, deltoidR, topology: 'sleeve' });
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
      const L = upperArmLen, PR = 1.026;
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
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.0405 * ws, 0.0405 * ws, 0.018, 16), mShirt);
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
  // v7 — the head sits so the CHIN lands at the top of the visible neck column:
  //   chinY = neckBaseY + neckH + neckExtra,  headY = chinY + SKULL.DOWN·R.
  // That makes the exposed neck exactly `neckH` tall on every build (≈0.39 of a
  // head height, human) and puts the crown at legLength + torsoH + neckH + 2.70R,
  // which is the head-count equation in constants.js.
  const headY = neckBaseY + neckH + (config.neckExtra ?? 0) + headR * SKULL.DOWN;
  // Hunched builds carry the head FORWARD of the shoulder line (×1.7) — the other
  // half of the dowager's-curve read (see the hump above).
  const headZ = neckBaseZ + Math.sin(hunch) * (headR * SKULL.DOWN + neckH) * (hunch > 0.08 ? 1.7 : 1.0)
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
  const noseDial = config.noseScale ?? 1;
  const skull = makeHead(headR, mSkin, { jaw: jawDial, chin: chinDial, nose: noseDial, detailed });
  head.add(skull);

  // v7 — HAIR + EARS RIDE A SKULL SHELL. Every hair style in this file was
  // authored in "sphere of radius r" space. The v7 skull is that sphere scaled
  // (1, SKULL.UP, ~SKULL.FRONT), so instead of re-authoring 350 lines of hair by
  // hand — and getting a different answer for each style — the whole scalp
  // furniture is parented to a group carrying exactly that scale. Relative
  // placement (crown, hairline, nape) is preserved by construction, and
  // collapseNode bakes the scale into the merged geometry, so nothing carries a
  // non-uniform scale at runtime.
  const scalp = new THREE.Group();
  scalp.scale.set(1, SKULL.UP, 1.0);
  head.add(scalp);

  const mConcha = M.skin(shadeHexToInt(skinC, 0.74), null);
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
    // v7 — the ear is re-seated on the TALL skull: it spans the brow→nose-base
    // band (y +0.05R … −0.60R, centre −0.28R), which is the human placement, and
    // it is a tall oval rather than the near-round bead the squashed head needed.
    // Held INSIDE the skull silhouette (x 0.96 of the local half-width) so it can
    // never read as a detached bead in back-3/4.
    const earY = -headR * 0.28;
    const earX = side * headR * skullHalfW(-0.28) * 0.94;
    const ear = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.185, 20, 16), mSkin);
    ear.scale.set(0.38, 1.72, 0.98);
    ear.position.set(earX, earY, -headR * 0.20);
    ear.rotation.z = side * 0.06;
    head.add(ear);
    // A shallow, low-contrast concha. At 0.58 shade / 0.10R it rendered as a dark
    // bullet hole punched through the ear (andrew r1/r2 profile).
    const concha = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.078, 12, 10), mConcha);
    concha.scale.set(0.34, 1.40, 0.60);
    concha.position.set(earX * 1.03, earY - headR * 0.02, -headR * 0.15);
    head.add(concha);
  }

  // hair (before collapse so it merges by material)
  const mStreak = config.hairStreakColor != null ? M.hair(tc(config.hairStreakColor)) : null;
  const mUnder = config.hairUnderColor != null ? M.hair(tc(config.hairUnderColor)) : null;
  buildHair(scalp, headR, mHair, resolveHairStyle(config.hairStyle), mStreak, mUnder);

  // face textures + curved patch. The painter is handed the SOLVED layout the
  // geometry produced (see faceLayout()), so canvas landmarks land on the
  // sculpted brow / socket / nose / chin instead of being re-tuned by eye.
  const faceSize = detailed ? 512 : 256;
  faceConfig._layout = faceLayout(jawDial, chinDial);
  group.faceTextures = paintFaceSet(faceConfig, faceSize);
  let facePatch = null;
  if (group.faceTextures && group.faceTextures.neutral) {
    facePatch = makeFacePatch(headR, group.faceTextures.neutral, M, detailed,
      { jaw: jawDial, chin: chinDial, nose: noseDial });
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

  // ── GEOMETRY TRUTH (v7) ───────────────────────────────────────────────
  // The builder publishes the landmark numbers it actually used, so the review
  // harness measures the model instead of guessing at pixels. Read-only; nothing
  // in the runtime consumes it.
  {
    const crownY = headY + headR * SKULL.UP;
    const chinY = headY - headR * SKULL.DOWN;
    const eyeY = headY + headR * LM.eye;
    // widest row = the equator (cranial taper starts above +0.35R, jaw taper below 0)
    const cranialHalf = headR * skullHalfW(0);
    // gonion half-width, with the per-character jaw dial applied exactly as
    // sculptSkull applies it (so the number the harness prints is the number the
    // vertices got).
    const eGon = Math.sqrt(1 - (0.60 / SKULL.DOWN) ** 2);
    const gonionHalf = headR * eGon * (1 + (jawProfile(-0.60) - 1) * (1 + (jawDial - 1) * 1.6));
    group.metrics = {
      headR, headY, crownY, chinY, eyeY,
      headWidth: 2 * cranialHalf,
      headHeight: crownY - chinY,
      cheekY: headY - headR * 0.30,
      jawY: headY - headR * 0.60,
      headWOverH: +((2 * cranialHalf) / (crownY - chinY)).toFixed(3),
      eyeLinePct: +(((crownY - eyeY) / (crownY - chinY)) * 100).toFixed(1),
      jawOverCranialGeo: +((gonionHalf / cranialHalf) * 100 / 100).toFixed(3),
      neckOverHead: +((headR * 0.55 * (config.neckScale ?? 1)) / headR).toFixed(3),
      shoulderOverHeadW: +((dims.shoulderR * 2) / (2 * cranialHalf)).toFixed(3),
      shoulderR: dims.shoulderR, chestR: dims.chestR,
      legLength, torsoH, neckH,
      layout: faceConfig._layout,
    };
  }
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
    // ── Colour-baked bucketing ─────────────────────────────────────────
    // A v5 character was 47–70 draw calls (measured, cubicle_farm) because
    // per-material merging can only ever collapse meshes that share a
    // material INSTANCE, and a character is a dozen toon materials that
    // differ from each other by a hex value and nothing else. Moving the
    // colour into a vertex attribute merges skin + shirt + trousers + shoes
    // into one call. Exactness argument and eligibility rules: GeometryBatch.js.
    //
    // HAIR IS DELIBERATELY EXCLUDED. The merged hair mesh is the only one
    // that gets userData.noCast (so hair never smudges the face in the
    // shadow map), and that flag is per-mesh: if hair bucketed with skin the
    // whole bucket would have to pick one answer and one of the two would be
    // wrong. Keeping hair on the identity tier keeps the flag exact.
    const isHair = !!(hairSet && hairSet.has(o.material));
    const sig = isHair ? null : (bakeEnabled() ? materialSignature(o.material) : null);
    if (sig) bakeVertexColor(g, o.material.color);
    const key = sig ? `c|${sig}|${g.index ? 'i' : 'n'}` : o.material;
    let b = byMat.get(key);
    if (!b) byMat.set(key, (b = { mat: o.material, sig, geos: [] }));
    b.geos.push(g);
    toRemove.push(o);
  });
  for (const k of keep) node.attach(k);       // preserve world pose
  for (const o of toRemove) if (o.parent) o.parent.remove(o);
  _pruneEmpty(node);
  for (const b of byMat.values()) {
    const mat = b.sig ? (batchMaterialFor(b.mat, b.sig) || b.mat) : b.mat;
    let merged;
    try { merged = b.geos.length === 1 ? b.geos[0] : mergeGeometries(b.geos, false); }
    catch (e) { merged = null; }
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    if (hairSet && hairSet.has(b.mat)) mesh.userData.noCast = true;
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

// ══════════════════════════════════════════════════════════════════════
// V7 SKULL — head metrology + topology (CHARACTER BIBLE LAW 3/4 + the
// producer amendment "FACE TOPOLOGY, not paint-on-egg").
//
// EVERY number below is in units of R = headR = the skull's HALF-WIDTH.
// The base form is an ellipsoid:  x=±R,  y=+UP·R…−DOWN·R,  z=+FRONT·R…−BACK·R.
// Because UP === DOWN the equator (y=0) is exactly 50% of skull height, so the
// eye line sits at 50% by construction and never has to be re-solved.
//
// On top of that base, `sculptSkull()` applies the structure v6 had none of:
// cranial dome taper, temple planes, brow ridge, eye-socket recession, malar
// (cheekbone) crest, the cheek plane below it, jaw taper to the gonion, chin
// projection, and an INTEGRATED nose wedge. Amplitudes are all ≤0.11R and every
// falloff is smooth (smoothstep), so the Sleek Law still holds: no lumps, no
// pasted balls, ≤3 silhouette inflections per edge.
const SKULL = {
  UP: CHAR.V7_SKULL_UP ?? 1.35,
  DOWN: CHAR.V7_SKULL_DOWN ?? 1.35,
  FRONT: CHAR.V7_SKULL_FRONT ?? 1.02,
  BACK: CHAR.V7_SKULL_BACK ?? 1.14,
};
const SKULL_H = SKULL.UP + SKULL.DOWN;          // head height in R (2.70)

// Face patch band, expressed as skull-Y so it can never drift out of sync with
// the painter again: top just under the hairline, bottom at the under-chin pole.
const PATCH_Y_TOP = 0.86;
const PATCH_Y_BOT = -1.34;
const PATCH_ARC = 1.20;                          // ±azimuth (rad) — 93% of half-width
const PATCH_THETA_START = Math.acos(PATCH_Y_TOP / SKULL.UP);
const PATCH_THETA_LEN = Math.acos(PATCH_Y_BOT / SKULL.DOWN) - PATCH_THETA_START;

// Vertical landmarks on the human face, in skull-Y (R units).
//   crown +1.35 · hairline +0.68 · brow +0.16 · EYE 0.00 · nose base −0.62
//   mouth −0.80 · chin −1.35        (thirds: hairline→brow→nose→chin ≈ equal)
const LM = { hairline: 0.68, brow: 0.20, eye: 0.0, nose: -0.62, mouth: -0.86, chinPt: -1.27 };

// skull-Y → canvas-Y fraction (0 = top of the face tile).
function faceF(y) {
  return (Math.acos(Math.max(-1, Math.min(1, y / SKULL.UP))) - PATCH_THETA_START) / PATCH_THETA_LEN;
}
// world-x at a given skull-Y → canvas-U fraction offset from the tile centre.
// The patch maps U linearly onto azimuth, so a feature's canvas width has to be
// pre-corrected for how far the surface has turned away at that row. THIS is
// why the painter's mouth kept measuring narrow: it was authored in tile space
// with no conformal correction.
function faceU(x, y, halfW) {
  const s = Math.max(0.08, halfW);
  return Math.asin(Math.max(-1, Math.min(1, x / s))) / (PATCH_ARC * 2);
}
// Half-width of the sculpted skull at a given skull-Y (R units) — the ellipse
// times the jaw profile below the cheekbone.
function skullHalfW(y) {
  const e = Math.sqrt(Math.max(0, 1 - (y / (y >= 0 ? SKULL.UP : SKULL.DOWN)) ** 2));
  return e * jawProfile(y) * cranialTaper(y);
}

// ── the sculpt profiles ───────────────────────────────────────────────
const _sstep = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
// bell(centre, halfWidth) — 1 at the centre, 0 at ±halfWidth, C1 continuous
const _bell = (t, c, w) => { const d = Math.abs(t - c) / w; return d >= 1 ? 0 : Math.cos(d * Math.PI * 0.5) ** 2; };

// The cranium is widest at the parietal eminence (y≈+0.35R) and domes in above.
function cranialTaper(y) {
  if (y <= 0.35) return 1;
  const k = (y - 0.35) / (SKULL.UP - 0.35);
  return 1 - 0.14 * k * k;
}
// Below the cheekbone the face planes IN to the gonion and then to the chin.
// Anchors (y → multiplier on the ellipse half-width):
//   0.00 → 1.000   −0.30 → 1.030 (malar crest)   −0.60 → 0.930 (gonion)
//   −0.95 → 0.900  −1.20 → 0.910   −1.35 → 0.950
function jawProfile(y) {
  if (y >= 0) return 1;
  const A = [[0, 1.0], [-0.30, 1.03], [-0.60, 0.93], [-0.95, 0.90], [-1.20, 0.91], [-1.35, 0.95]];
  for (let i = 0; i < A.length - 1; i++) {
    if (y <= A[i][0] && y >= A[i + 1][0]) {
      const t = (A[i][0] - y) / (A[i][0] - A[i + 1][0]);
      const s = t * t * (3 - 2 * t);
      return A[i][1] + (A[i + 1][1] - A[i][1]) * s;
    }
  }
  return A[A.length - 1][1];
}

// Displace ONE point of the skull. `d` is the unit direction on the base sphere;
// the function returns the sculpted world-space offset in R units.
// `dial` carries the per-character jaw/chin values (LAW 4 clamps them).
function sculptSkull(d, dial, out) {
  const jawDial = dial.jaw, chinDial = dial.chin, noseK = dial.nose ?? 1;
  let x = d.x * SKULL.UP / SKULL.UP;                       // (kept explicit for clarity)
  x = d.x;
  let y = d.y * (d.y >= 0 ? SKULL.UP : SKULL.DOWN);
  let z = d.z * (d.z >= 0 ? SKULL.FRONT : SKULL.BACK);

  // 1 · cranial dome + jaw taper (radial, in the x/z plane)
  const radial = cranialTaper(y) * (1 + (jawProfile(y) - 1) * (1 + (jawDial - 1) * 1.6));
  x *= radial; z *= radial;

  // 2 · TEMPLE PLANE — a real skull is flat at the temples, not circular.
  //     A gentle inward pull on the side wall between brow and parietal.
  const templeW = _bell(y, 0.30, 0.70) * _bell(Math.abs(d.x), 0.86, 0.34);
  x *= 1 - 0.055 * templeW;

  // 3 · OCCIPUT / NAPE — the back of the jaw must not balloon behind the ear.
  if (z < 0 && y < -0.35) z *= 1 - 0.20 * _sstep(-0.35, -1.1, y);

  const front = Math.max(0, d.z);                          // 0 at the ear line, 1 at the nose
  const ax = Math.abs(x);

  // 4 · BROW RIDGE (supraorbital torus). A shelf over the eyes that is strongest
  //     over the socket (|x|≈0.36R) and slightly relieved at the glabella, so it
  //     reads as two brows and a bridge — not a Cro-Magnon band.
  const browBand = _bell(y, 0.20, 0.34);
  const browLat = 0.72 * _bell(ax, 0.36, 0.44) + 0.42 * _bell(ax, 0.03, 0.20);
  z += 0.070 * browBand * browLat * front;

  // 5 · EYE-SOCKET RECESSION — subtle (LAW 3: no horror shadows). The socket sits
  //     just under the ridge and inboard of the temple.
  const socket = _bell(y, -0.07, 0.32) * _bell(ax, 0.40, 0.34);
  z -= 0.048 * socket * front;

  // 6 · MALAR (cheekbone) CREST + the cheek plane that falls away below it.
  const malar = _bell(y, -0.30, 0.36) * _bell(ax, 0.62, 0.40);
  z += 0.040 * malar * front;
  x += 0.030 * malar * Math.sign(x) * front;
  const cheekPlane = _sstep(-0.35, -0.85, y) * _bell(ax, 0.60, 0.55);
  z -= 0.040 * cheekPlane * front;

  // 7 · MAXILLA / PHILTRUM shelf and the sub-lip recess, so the mouth sits in a
  //     plane instead of floating on a sphere.
  z += 0.024 * _bell(y, -0.66, 0.26) * _bell(ax, 0.0, 0.42) * front;
  z -= 0.018 * _bell(y, -0.96, 0.16) * _bell(ax, 0.0, 0.40) * front;

  // 8 · CHIN — a real mental protuberance, narrow and forward.
  const chinBand = _bell(y, -1.10, 0.34) * _bell(ax, 0.0, 0.34);
  z += 0.085 * chinDial * chinBand * front;
  // and the sub-mental plane tucks back under it
  z -= 0.030 * _bell(y, -1.30, 0.22) * front;

  // 9 · NOSE WEDGE (integrated, LAW 3: "a small 3D geometric wedge").
  //     Round-1 measured the nose TIP at z 1.058R against a brow at 1.079R — the
  //     nose sat BEHIND the brow plane, which is why the profile had no nose at
  //     all. A human nose tip projects past the brow by roughly a sixth of head
  //     height. The wedge is now an explicit profile (nasion dip → ridge → tip →
  //     columella → sub-nasal plane) with a half-width that opens toward the alae,
  //     so it reads in profile AND casts its own shadow at 3/4 without becoming
  //     a beak from the front (the alae are far less proud than the tip).
  if (y < 0.10 && y > -0.86 && front > 0.18) {
    const A = [[0.06, 0.000, 0.060], [-0.10, 0.070, 0.075], [-0.30, 0.210, 0.105],
      [-0.46, 0.300, 0.135], [-0.56, 0.330, 0.160], [-0.66, 0.190, 0.175],
      [-0.78, 0.060, 0.150], [-0.86, 0.000, 0.130]];
    let amp = 0, halfW = 0.10;
    for (let i = 0; i < A.length - 1; i++) {
      if (y <= A[i][0] && y >= A[i + 1][0]) {
        const u = (A[i][0] - y) / (A[i][0] - A[i + 1][0]);
        const sm = u * u * (3 - 2 * u);
        amp = A[i][1] + (A[i + 1][1] - A[i][1]) * sm;
        halfW = A[i][2] + (A[i + 1][2] - A[i][2]) * sm;
        break;
      }
    }
    const lat = _bell(ax, 0.0, halfW * 2.0);
    z += amp * lat * front * noseK;
  }

  out.set(x, y, z);
  return out;
}

// ── THE LAYOUT SOLVE ──────────────────────────────────────────────────
// Geometry carries FORM; texture carries FEATURES — so the geometry has to tell
// the painter where the features go. This converts the skull's anatomical
// landmarks (in R units) into canvas fractions on the face tile, including the
// CONFORMAL correction: a feature low on the face sits on a surface that has
// already turned away from the lens, so it must be painted WIDER in tile space
// to measure correctly in world space. v6 had no such correction, which is why
// every round re-tuned the mouth width by eye and it kept coming out narrow.
function faceLayout(jawDial = 0.9, chinDial = 1.0) {
  const hwEye = skullHalfW(LM.eye);
  const hwNose = skullHalfW(LM.nose);
  const hwMouth = skullHalfW(LM.mouth);
  const browF = faceF(LM.brow), eyeF = faceF(LM.eye);
  const noseF = faceF(LM.nose), mouthF = faceF(LM.mouth), chinF = faceF(LM.chinPt);
  const coreTop = browF - 0.06, coreBot = chinF + 0.05;
  const maskCY = (coreTop + coreBot) * 0.5;
  const maskR0 = 0.30;
  void jawDial; void chinDial;
  return {
    hairlineF: faceF(LM.hairline),
    browF, eyeF, noseF, mouthF, chinF,
    // pupils at ±0.40R (gap = one eye-width), eye corner-to-corner 0.40R
    eyeDXF: faceU(0.40, LM.eye, hwEye),
    eyeWF: (faceU(0.60, LM.eye, hwEye) - faceU(0.20, LM.eye, hwEye)) * 0.5,
    eyeHF: (faceF(-0.135) - faceF(0.135)) * 0.5,
    noseWF: faceU(0.17, LM.nose, hwNose),
    mouthWF: faceU(0.34, LM.mouth, hwMouth),
    // vertical conformal correction for the lip pair: at the mouth row the
    // surface has pitched ~40° away from the lens, so a lip authored in tile
    // fractions rendered as a thin ribbon (r4: "the mouth is a brown line").
    mouthHF: (faceF(LM.mouth - 0.12) - faceF(LM.mouth + 0.12)) * 0.5,
    jawWF: faceU(skullHalfW(-0.60) * 0.92, -0.60, skullHalfW(-0.60)),
    maskCY, maskR0, maskR1: 0.50,
    maskSX: 1.0,
    maskSY: ((coreBot - coreTop) * 0.5) / maskR0,
  };
}

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
  // v7 body surface topology — trouser drape / sleeve planes on top of the loft.
  if (opts.topology) {
    const lo = -half - rBot, hi = half + rTop;
    surfaceTopology(geo, { kind: opts.topology, seat: opts.seat === true, t: (y) => (y - lo) / (hi - lo) });
  } else {
    geo.computeVertexNormals();
  }
  return new THREE.Mesh(geo, mat);
}

function makeHead(rad, mat, opts = {}) {
  // v7 — the skull is SCULPTED, not painted. Tessellation is raised again on the
  // combat tier because the new brow/socket/malar/nose relief is carried by
  // vertices: at 64×52 the socket rim aliased into a faceted crease at 4×.
  // 96×80 was measurably smooth but cost ~15k tris on its own; 88×72 holds the
  // socket/nose/chin relief sub-pixel at fight framing for ~2.5k fewer.
  const wSeg = opts.detailed ? 88 : 52;
  const hSeg = opts.detailed ? 72 : 42;
  const geo = new THREE.SphereGeometry(1, wSeg, hSeg);
  const pos = geo.attributes.position;
  const d = new THREE.Vector3(), o = new THREE.Vector3();
  const dial = { jaw: opts.jaw ?? 0.9, chin: opts.chin ?? 1.0, nose: opts.nose ?? 1 };
  for (let i = 0; i < pos.count; i++) {
    d.fromBufferAttribute(pos, i).normalize();
    sculptSkull(d, dial, o);
    pos.setXYZ(i, o.x * rad, o.y * rad, o.z * rad);
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}

function makeFacePatch(rad, faceTex, M, detailed = false, dial = { jaw: 0.9, chin: 1.0 }) {
  // v7 — THE PATCH CONFORMS TO THE SCULPT. It is the same lat/long band the v6
  // patch was, but every vertex is run through `sculptSkull` with the SAME dials
  // the skull used, then pushed 0.4% proud. So the painted face now sits ON the
  // brow ridge, in the eye sockets, over the malar crest and down the nose wedge
  // instead of floating on a sphere in front of them.
  // v7 — 128² over a 137°×123° band was ~33k triangles, roughly half the whole
  // character, for ~1° per segment. 96² is ~1.4° per segment (still sub-pixel at
  // fight framing) and saves ~14k.
  const seg = detailed ? 96 : 56;
  const geo = new THREE.SphereGeometry(1, seg, seg,
    Math.PI * 0.5 - PATCH_ARC, PATCH_ARC * 2, PATCH_THETA_START, PATCH_THETA_LEN);
  {
    const pos = geo.attributes.position;
    const d = new THREE.Vector3(), o = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      d.fromBufferAttribute(pos, i).normalize();
      sculptSkull(d, { jaw: dial.jaw, chin: dial.chin, nose: dial.nose ?? 1 }, o);
      pos.setXYZ(i, o.x * rad * 1.004, o.y * rad * 1.004, o.z * rad * 1.004);
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
  mat.transparent = true;
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
  // v7 — re-seated on the new yoke arc (the widest row moved 0.82→0.855) and
  // pulled in so the blouse reads as a NECKLINE, not a pale trapezoid decal on
  // the sternum (karen r9).
  const rows = [
    [Math.max(shoulderR * 0.38, neckR * 1.05), torsoH * 1.008],
    [Math.max(shoulderR * 0.58, neckR * 1.14), torsoH * 0.980],
    [shoulderR * 0.72, torsoH * 0.945],
    [shoulderR * 0.82, torsoH * 0.898],
    [shoulderR * 0.86, torsoH * 0.852],
    [chestR * 0.86, torsoH * 0.80],
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

// ── BODY SURFACE TOPOLOGY (v7, producer amendment 4) ──────────────────
// "lumpiness improved; next bar is real surface topology on bodies
//  (garment/anatomy planes), not just clean lofts."
//
// A lathe is radially symmetric, so a clean loft can only ever be a tube: no
// chest, no shoulder blades, no drape. This applies a smooth (r, φ, y) field to
// a finished loft — front/back/side differ, but every amplitude is ≤3.5% of the
// local radius and every falloff is C1, so the Sleek Law still holds: no lumps,
// no pasted balls, ≤3 silhouette inflections per edge. All of it is SURFACE:
// the silhouette moves by at most ~2%.
function surfaceTopology(geo, opts) {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const bell = (t, c, w) => { const d = Math.abs(t - c) / w; return d >= 1 ? 0 : Math.cos(d * Math.PI * 0.5) ** 2; };
  const step = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    if (r < 1e-5) continue;
    const phi = Math.atan2(v.x, v.z);         // 0 = front (+z), ±π = back
    const aphi = Math.abs(phi);
    const t = opts.t(v.y);                    // 0..1 up the part
    let k = 1;
    if (opts.kind === 'torso') {
      // pectoral / bust shelf on the front, with a sternal groove between
      const chest = bell(t, opts.female ? 0.60 : 0.66, 0.17) * bell(aphi, 0.0, 1.25);
      k += (opts.female ? 0.052 : 0.038) * chest;
      k -= 0.016 * bell(t, opts.female ? 0.60 : 0.66, 0.15) * bell(aphi, 0.0, 0.24);
      // the two bust lobes only exist on a female build
      if (opts.female) k += 0.030 * bell(t, 0.60, 0.13) * (bell(aphi, 0.42, 0.30));
      // shoulder blades + spinal furrow on the back
      k += 0.032 * bell(t, 0.76, 0.20) * bell(aphi, 2.42, 0.42);
      k -= 0.020 * bell(t, 0.72, 0.30) * bell(aphi, Math.PI, 0.26);
      // the side nips in at the waist (latissimus taper)
      k -= 0.024 * bell(t, 0.42, 0.24) * bell(aphi, Math.PI * 0.5, 0.55);
      // a soft clavicle shelf under the yoke
      k += 0.020 * bell(t, 0.90, 0.11) * bell(aphi, 0.0, 1.0);
    } else if (opts.kind === 'trouser') {
      // trouser drape: a pressed front crease with a soft fold either side of it,
      // fading out at the ankle where the cloth breaks over the shoe
      const live = step(0.02, 0.22, t) * (1 - step(0.80, 1.0, t) * 0.6);
      k -= 0.020 * bell(aphi, 0.0, 0.30) * live;
      k += 0.016 * bell(aphi, 0.78, 0.42) * live;
      k += 0.012 * bell(aphi, 2.30, 0.55) * live;
      // the seat/thigh mass at the very top (thigh only — a shin has no seat)
      if (opts.seat) k += 0.026 * step(0.86, 1.0, t) * bell(aphi, Math.PI, 1.1);
    } else if (opts.kind === 'sleeve') {
      // deltoid plane on the outboard face + a soft inner-elbow hollow
      k += 0.026 * bell(t, 0.86, 0.20) * bell(aphi, Math.PI * 0.5, 0.9);
      k -= 0.018 * bell(t, 0.16, 0.20) * bell(aphi, 0.0, 0.7);
    }
    v.x *= k; v.z *= k;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildTorso(dims, mat, detailed = false, hem = 0, female = false) {
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
    V2(chestR, torsoH * 0.58),
    // v7 — THE YOKE ARC. v6 jumped chestR→shoulderR between t=0.71 and t=0.82; on
    // a broad build (Chad) that is a 32% radius rise over 11% of the torso, which
    // renders as a hard diagonal shelf with a corner at the deltoid. The rise is
    // now spread over t=0.58…0.855 as one convex arc, so shoulder→neck is a slope
    // the eye reads as tailoring (LAW 2: one loft, ≤3 inflections).
    V2(chestR + (shoulderR - chestR) * 0.16, torsoH * 0.66),
    V2(chestR + (shoulderR - chestR) * 0.44, torsoH * 0.735),
    V2(chestR + (shoulderR - chestR) * 0.76, torsoH * 0.795),
    V2(shoulderR * 0.998, torsoH * 0.855),
    V2(shoulderR * 0.965, torsoH * 0.905),
    V2(shoulderR * 0.85, torsoH * 0.952),
    V2(shoulderR * 0.60, torsoH * 0.995),
    V2(shoulderR * 0.34, torsoH * 1.025),
    V2(shoulderR * 0.16, torsoH * 1.04),
  ];
  const floorY = pts[pts.length - 1].y + 0.020;
  for (const p of upper) if (p.y > floorY) pts.push(p);
  // More radial segments on the combat tier so the shoulder yoke reads as a
  // smooth gradient, not hard triangular shading facets (item 9, Chad).
  // Radial segments raised on the combat tier: the v7 surface field varies with
  // azimuth, so 56 columns quantised the chest/blade planes into visible facets.
  const geo = new THREE.LatheGeometry(pts, detailed ? 84 : 40);
  surfaceTopology(geo, { kind: 'torso', female, t: (y) => y / torsoH });
  geo.scale(1, 1, 0.66);              // elliptical (flatter front-back)
  geo.computeVertexNormals();
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
// ── HAIR CONTAINMENT (producer amendment 1, enforced structurally) ────
// "hair masses must NEVER wrap forward past the ear line at or below jaw level —
//  Andrew's hair turns into a beard. Occiput mass ends ABOVE the collar."
//
// v6 chased this per style, one sphere at a time, and it kept coming back. v7
// makes it a LAW applied to every hair mesh in every style: below the ear line
// the forward reach shrinks to the ear plane, and nothing may pass a floor just
// under the jaw angle. Both limits are soft (12–15% carry-through) so the result
// is a compressed mass, never a flat cut edge.
//
// Thresholds are in FINAL head units and divided by `sy` because hair is built
// inside the scalp shell (which scales Y by SKULL.UP).
function containHair(mesh, r, sy) {
  mesh.updateMatrix();
  const g = mesh.geometry;
  g.applyMatrix4(mesh.matrix);
  mesh.position.set(0, 0, 0);
  mesh.rotation.set(0, 0, 0);
  mesh.scale.set(1, 1, 1);
  mesh.updateMatrix();
  const pos = g.attributes.position;
  const yEar = (-0.06 * r) / sy;        // ear line
  const yJaw = (-0.66 * r) / sy;        // jaw angle
  const yFloor = (-0.98 * r) / sy;      // hard floor: above the collar, above the chin
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (v.y < yEar) {
      const t = Math.min(1, (yEar - v.y) / (yEar - yJaw));
      const zMax = r * (0.62 - 0.74 * t * t * (3 - 2 * t));
      if (v.z > zMax) v.z = zMax + (v.z - zMax) * 0.12;
    }
    if (v.y < yFloor) v.y = yFloor + (v.y - yFloor) * 0.14;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
}

function buildHair(head, r, mat, style, streakMat = null, underMat = null) {
  const sy = head.scale.y || 1;
  const add = (m, isCap = false) => {
    m.userData.noCast = true;
    if (!isCap) containHair(m, r, sy);
    head.add(m);
  };

  // ── one continuous scalp-conforming cap ─────────────────────────────
  // Round-3 rebuild (items 1 & 2). The cap rides the head's OWN egg profile a
  // hair proud (`grow`), descends to the EAR LINE on the sides and back
  // (thetaLen ~1.5), and LIFTS its front-hemisphere rim up to a clean hairline
  // arc (`hairlineY`) so it never sheets over the face. This kills all three
  // failures at once: the crown is a single merged shell (no instanced blobs
  // reading as "horns"), the sides hug down to the ears (no bare scalp band /
  // cap-step), and the back joins seamlessly (no offset occiput). Strand grain
  // is PAINTED by the hair texture, never sculpted.
  function scalpCap(thetaLen, grow = 1.03, hairlineY = 0.36, seg = 44, sweep = 0) {
    const geo = new THREE.SphereGeometry(1, seg, Math.max(30, Math.round(seg * 0.8)), 0, Math.PI * 2, 0, thetaLen);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const theta = Math.acos(Math.max(-1, Math.min(1, v.y)));
      // v7 — THE RIM TAPERS TO ZERO THICKNESS. A cap held a uniform `grow` proud
      // of the scalp ends in a 2–3% ledge all the way round, which is the hard
      // "helmet edge / bowl cut" line every round has read. The proud offset now
      // eases out over the last fifth of the cap, so hair thins INTO the scalp.
      const rim = Math.min(1, Math.max(0, (theta / thetaLen - 0.76) / 0.24));
      let g = 1 + (grow - 1) * (1 - rim * rim * (3 - 2 * rim));
      // conform to the skull's own front/back depth
      v.z *= (v.z > 0 ? SKULL.FRONT : SKULL.BACK);
      v.multiplyScalar(r);
      // front hairline lift: raise front-of-head verts up to the hairline arc so
      // the forehead stays open. The lateral term is a flat-topped falloff (v6's
      // squared term lifted only the centre and left a bald triangle pointing up
      // the middle of the forehead — andrew r1/r2).
      if (v.z > 0 && v.y < hairlineY * r) {
        const front = Math.min(1, v.z / (r * 0.5));
        const lateral = Math.max(0, 1 - Math.max(0, (Math.abs(v.x) - r * 0.34) / (r * 0.58)) ** 2);
        const lift = (hairlineY * r - v.y) * front * lateral;
        v.y += lift;
        v.z -= lift * 0.45;              // ease the lifted rim back off the face
        // a lifted vertex IS the hairline: thin it out too
        g = 1 + (g - 1) * Math.max(0, 1 - lift / (r * 0.34));
      }
      // HAIR VOLUME — a soft azimuthal mass variation so the crown is not one
      // featureless dome (every round has read "helmet / bowl cut"). Amplitude is
      // ≤2.6% and both harmonics are smooth, so the silhouette gains modulation,
      // not inflections.
      {
        const phi = Math.atan2(v.x, v.z);
        const crownBand = Math.max(0, 1 - Math.abs(v.y - r * 0.55) / (r * 1.05));
        g += (0.017 * Math.cos(phi * 2.0 + 0.5) + 0.009 * Math.cos(phi * 4.0 - 0.3)) * crownBand;
      }
      // INTEGRATED FRINGE — extra volume along the hairline arc on the front of
      // the head, easing to zero above and below it. v6 hung a separate sphere
      // there; at every seat it either floated as a beret (r2) or sat as a hard
      // visor with its own bottom edge (r4). Growing the cap itself cannot produce
      // an edge, because it IS the cap.
      if (sweep > 0 && v.z > 0) {
        const prox = Math.max(0, 1 - Math.abs(v.y - hairlineY * r) / (r * 0.42));
        const fr = Math.min(1, v.z / (r * 0.42));
        g += sweep * prox * prox * (3 - 2 * prox) * fr;
      }
      v.multiplyScalar(g);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    add(m, true);          // the cap is generated ON the skull; it needs no clamp
    return m;
  }
  // v7 — the v6 default was a sphere of radius 0.98r centred near the head's own
  // centre: a SECOND HEAD of hair that swallowed the temples and, once the v7
  // skull grew 35% taller, hung well below the chin. That is the producer's
  // "Andrew's hair turns into a beard" in one line of geometry. It is now what its
  // name says — an occiput/nape mass sitting behind and above the ear line.
  function backMass(scaleY = 1.0, lowY = r * 0.02, depth = 0.96, wide = 1.02) {
    const back = new THREE.Mesh(new THREE.SphereGeometry(r * 0.74, 24, 20), mat);
    back.scale.set(wide, scaleY, depth);
    back.position.set(0, lowY, -r * 0.44);
    add(back);
  }
  // a single smooth swept fringe rooted at the hairline (never a row of blobs).
  function fringe(y = 0.4, depth = 0.62, widthS = 1.4, tiltX = 0.34, heightS = 0.5) {
    const f = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 24, 18), mat);
    f.scale.set(widthS, heightS, depth);
    f.rotation.x = tiltX;
    f.position.set(0, r * y, r * 0.46);
    add(f);
  }

  if (style === 'bob_asym') {
    // KAREN — an asymmetric side-parted platinum power-bob with a pale streak in
    // the under-layer (canonical portrait). v7 rebuild: v6 stacked NINE separate
    // masses here (cap, long side, brow lock, short side, two curtains, nape,
    // two streaks) and at 4× they read as a pile of overlapping bulbs — a
    // croissant, not a bob (karen r5). This is four: cap + one long sweep + two
    // jaw-length curtains + a nape, each flat enough that the silhouette carries
    // ≤3 inflections (LAW 2).
    scalpCap(1.46, 1.03, 0.60, 48, 0.13);
    // THE LONG SWEEP — one flat plane of hair crossing the part and riding down
    // over the outer half of one brow. Flat (y-scale 0.30) so it reads as hair
    // lying on the skull, not a second cranium.
    const sweep = new THREE.Mesh(new THREE.SphereGeometry(r * 0.78, 30, 22), mat);
    sweep.scale.set(1.04, 0.26, 0.80);
    sweep.rotation.set(0.12, 0.24, 0.24);
    sweep.position.set(-r * 0.20, r * 0.64, r * 0.30);
    add(sweep);
    // jaw-length curtains framing the face. containHair() holds them off the chin
    // and out of the neck, so they can be generous without becoming a chin-strap.
    for (const side2 of [-1, 1]) {
      const curtain = new THREE.Mesh(new THREE.SphereGeometry(r * 0.52, 24, 20), mat);
      curtain.scale.set(0.42, side2 < 0 ? 1.32 : 1.14, 1.22);
      curtain.position.set(side2 * r * 0.94, -r * (side2 < 0 ? 0.12 : 0.06), -r * 0.36);
      curtain.rotation.z = side2 * -0.10;
      add(curtain);
    }
    // DARK UNDERLAYER at the nape (producer ruling: platinum bob, dark underlayer)
    const backB = new THREE.Mesh(new THREE.SphereGeometry(r * 0.72, 26, 20), underMat || mat);
    backB.scale.set(1.04, 1.06, 0.94);
    backB.position.set(0, -r * 0.06, -r * 0.52);
    add(backB);
    // THE PALE STREAK — a broad light panel through the lower half of the long
    // side, seated ON the curtain plane so it reads from the front, not only in
    // profile.
    if (streakMat) {
      const streak = new THREE.Mesh(new THREE.SphereGeometry(r * 0.46, 22, 18), streakMat);
      streak.scale.set(0.30, 1.06, 0.94);
      streak.position.set(-r * 0.88, -r * 0.10, -r * 0.16);
      streak.rotation.z = 0.16;
      add(streak);
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
    // v7 — the v6 quiff was a sphere 0.72r across, scaled 1.42 in depth and seated
    // at z 0.66r: once the scalp shell stretched it, it reached z 1.68r and read as
    // a blonde BOWL swallowing the backwards cap (chad r7). A quiff is a crest at
    // the hairline, so that is what it is now — one flat mass, plus the cap's own
    // hairline sweep underneath it.
    scalpCap(1.44, 1.03, 0.56, 44, 0.06);
    backMass(0.98, r * 0.02, 0.96);
    const quiff = new THREE.Mesh(new THREE.SphereGeometry(r * 0.50, 26, 20), mat);
    quiff.scale.set(1.12, 0.34, 0.86);
    quiff.rotation.x = -0.22;
    quiff.position.set(0, r * 0.54, r * 0.50);
    add(quiff);
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
    scalpCap(1.28, 1.04, 0.36, 44, 0.11);
    const backG = new THREE.Mesh(new THREE.SphereGeometry(r * 0.78, 24, 20), mat);
    backG.scale.set(1.06, 1.00, 0.98);
    backG.position.set(0, r * 0.06, -r * 0.40);
    add(backG);
    for (const s of [-1, 1]) {
      const wave = new THREE.Mesh(new THREE.SphereGeometry(r * 0.34, 18, 14), mat);
      wave.scale.set(0.52, 0.86, 0.80);
      wave.position.set(s * r * 0.80, r * 0.26, r * 0.10);
      wave.rotation.z = s * -0.14;
      add(wave);
    }
    // ONE bun. Two stacked spheres read as a snowman on the crown (grandma r6).
    const bun = new THREE.Mesh(new THREE.SphereGeometry(r * 0.40, 26, 20), mat);
    bun.scale.set(1.02, 0.88, 1.0);
    bun.position.set(0, r * 1.02, -r * 0.30);
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
    // v7 — hairline dropped 0.52→0.36. On the taller skull a 0.52 hairline left
    // ~40% of the face as bare forehead (grandma r6: "a bald dome with a bun"),
    // where a human forehead is ~30% of face height. The sweep gives her the soft
    // rolled front an elderly updo has.
    scalpCap(1.30, 1.04, 0.36, 44, 0.11);
    const back = new THREE.Mesh(new THREE.SphereGeometry(r * 0.80, 24, 20), mat);
    back.scale.set(1.08, 1.02, 1.00);
    back.position.set(0, r * 0.04, -r * 0.42);
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
    scalpCap(1.5, 1.025, 0.56, 44, 0.10);
    backMass(1.0, r * 0.02, 0.98);
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
  // v7 — re-solved onto the sculpted skull: pupils sit at ±0.40R (one eye-width
  // of gap between them, LAW 3) and the eye LINE is y = 0, the skull equator.
  const lensR = r * (kind === 'sun' ? 0.27 : 0.245);
  const sep = r * 0.40;
  const tube = r * (kind === 'sun' ? 0.042 : 0.032);
  const zf = r * 1.02;               // lens plane — a real air gap over the socket
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(lensR, tube, 10, 26), frameMat);
    rim.scale.set(1, 0.86, 1);                 // an adult lens is wider than tall
    rim.position.set(s * sep, 0, zf);          // ON the eye line (skull equator)
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
    const lens = new THREE.Mesh(new THREE.CircleGeometry(lensR, 22), lensMat);
    lens.scale.set(1, 0.86, 1);
    lens.position.set(s * sep, 0, zf - tube * 0.4);
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
    glint.position.set(s * sep + s * lensR * 0.5, lensR * 0.56, zf + tube * 1.2);
    glint.userData.noFlash = true;
    head.add(glint);
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
    arm.position.set(s * (sep + lensR * 0.82), r * 0.02, r * 0.50);
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
      ear.position.set(rig.headR * 0.98, -rig.headR * 0.28, -rig.headR * 0.20);
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
        // v7 — the earlobe sits at y ≈ −0.52R on the sculpted skull (the ear spans
        // the brow→nose-base band). At −0.40R with the old squashed head these
        // landed mid-cheek as two white beads.
        pearl.position.set(side * (rig.headR * 0.95), -rig.headR * 0.52, -rig.headR * 0.12);
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
      // v7 — re-solved for the taller skull: the dome is stretched to the v7 crown
      // (+1.35R) and its rim lands on the hairline (+0.70R). At the v6 numbers it
      // capped only to 1.19R and read as a narrow band across a bald crown.
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(r * 1.06, 34, 24, 0, Math.PI * 2, 0, 1.06), capMat);
      dome.position.set(0, r * 0.02, -r * 0.05);
      dome.scale.set(1.11, 1.35, 1.20);
      dome.userData.noCast = true;
      group.head?.add(dome);
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.66, r * 0.66, 0.014, 20, 1, false, 0, Math.PI), capMat);
      brim.rotation.set(Math.PI / 2 - 0.18, Math.PI, 0);
      brim.position.set(0, r * 0.55, -r * 1.24);
      brim.userData.noCast = true;
      group.head?.add(brim);
      const btn = new THREE.Mesh(new THREE.SphereGeometry(r * 0.075, 10, 8), capMat);
      btn.position.set(0, r * 1.46, -r * 0.04);
      btn.userData.noCast = true;
      group.head?.add(btn);
      // front rim band: a shallow torus arc riding the dome's front edge, so the cap
      // terminates in a HARD hat line above the brow instead of fading into hair.
      // A shallow sweatband riding the dome's own rim — the v6 torus sat proud of
      // the hair and read as a dark bar cutting THROUGH the quiff (chad arena3).
      const rArc = Math.PI * 1.15;
      const rimGeo = new THREE.TorusGeometry(r * 1.03, r * 0.036, 8, 30, rArc);
      rimGeo.rotateZ(Math.PI / 2 - rArc / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.set(Math.PI / 2 - 0.16, 0, 0);
      rim.position.set(0, r * 0.80, -r * 0.06);
      rim.scale.set(1.06, 1.0, 1.10);
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
      visor.position.set(0, headR * 0.62, headR * 0.62);
      head?.add(visor);
    },
    party_hat: () => {
      const hat = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.65, 0.2, 10), Materials.custom(0xff4488));
      hat.position.set(0, headR * 1.48, 0);
      head?.add(hat);
    },
    tin_foil_hat: () => {
      const hat = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.85, 0.16, 6), Materials.custom(0xcccccc));
      hat.position.set(0, headR * 1.42, 0);
      head?.add(hat);
    },
    executives_fedora: () => {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.72, headR * 0.82, 0.1, 14), Materials.custom(0x1a1a1a));
      crown.position.set(0, headR * 1.34, 0);
      head?.add(crown);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.3, headR * 1.3, 0.016, 18), Materials.custom(0x1a1a1a));
      brim.position.set(0, headR * 1.20, 0);
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
    ergonomic_wrist_support: () => {
      // A padded brace on the writing wrist. Sits on the forearm rather than
      // in the hand, so it never fights a held-prop cosmetic for the same spot.
      const brace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.026, 0.055, 10), Materials.custom(0x3d4550));
      brace.position.set(handX, rig.legLength + rig.torsoH * 0.42, handZ);
      group.add(brace);
      const strap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.012, 10), Materials.custom(0x22272e));
      strap.position.set(handX, rig.legLength + rig.torsoH * 0.42 + 0.018, handZ);
      group.add(strap);
    },
    // ── Review Point exclusives (src/data/review.js) ──
    appreciation_cert: () => {
      const card = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.044, 0.005), Materials.custom(0xf2e6c8));
      card.position.set(0.07, rig.legLength + rig.torsoH * 0.76, rig.frontZ * 0.4 + 0.1);
      group.add(card);
      const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.004, 10), Materials.custom(0xdaa520));
      seal.rotation.x = Math.PI / 2;
      seal.position.set(0.09, rig.legLength + rig.torsoH * 0.745, rig.frontZ * 0.4 + 0.104);
      group.add(seal);
    },
    svp_tumbler: () => {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.021, 0.1, 12), Materials.custom(0x9aa3ad));
      body.position.set(-handX, rig.legLength + rig.torsoH * 0.34, handZ + 0.02);
      group.add(body);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.014, 12), Materials.custom(0x2a2f36));
      lid.position.set(-handX, rig.legLength + rig.torsoH * 0.34 + 0.055, handZ + 0.02);
      group.add(lid);
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
  blob.name = 'blobShadow';
  blob.userData.blobShadow = true;
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  blob.renderOrder = 2;
  blob.userData.noFlash = true;
  blob.castShadow = false;
  blob.receiveShadow = false;
  group.add(blob);
}
