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
  // v7 FIX round-1 — on a female build shoulderR = chestBase·1.083·0.88 = 0.953
  // of chestR, i.e. the SHOULDER WAS NARROWER THAN THE RIBCAGE. The torso lathe
  // therefore had no yoke to climb: it went straight up and in from the chest,
  // which is half of why Karen's structured blazer reads as "a pink tunic". The
  // shoulder line still solves off the gender-neutral base (so LAW 1's
  // head-width cap is untouched at 1.80 for her), and only the RIBCAGE narrows.
  const chestBase = 0.158 * ws;
  const chestR = chestBase * (config.gender === 'f' ? 0.88 : 1.0);
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
    shoulderR: chestBase * (1.083 + (shoulderScale - 1) * (shoulderScale > 1 ? 0.55 : 0.60))
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
  const shoeHex = toneColor(config.shoeColor ?? 0x1a1a1a, tone);
  const mShoe = M.shoe(shoeHex);
  // THE SOLE LINE (v7 round-4). The sole only does its job if it separates in
  // VALUE from the upper, so the default is solved AWAY from whatever the upper
  // is: a light welt under a black dress shoe, a dark outsole under a white
  // trainer. Authors can still pin it with `soleColor`.
  const mSole = M.shoe(config.soleColor != null
    ? toneColor(config.soleColor, tone)
    : (((shoeHex >> 16 & 255) * 0.3 + (shoeHex >> 8 & 255) * 0.59 + (shoeHex & 255) * 0.11) < 90
      ? shadeHexToInt(0x000000 | shoeHex, 2.6) | 0x1c1c20
      : shadeHexToInt(shoeHex, 0.42)));
  const mHair = M.hair(hairColor);

  // ── LEGS: hip pivot → thigh, knee pivot → shin + shoe ───────────────
  // v7 FIX round-1 — HIPS WIDER THAN SHOULDERS. At stance 0.74·hipR with a
  // 0.078 thigh the leg pair spanned 0.378 against a default male shoulder line
  // of 0.342: every figure in the cast was 10% wider at the thigh than at the
  // deltoid, which is the "saddlebag" read the critic logged on Grandma (worst
  // case: her 1.10 widthScale put the thighs at 0.416 against a 0.317 shoulder
  // span). 0.64 · hipR with a 0.074 thigh lands the span at 0.340 ≈ the male
  // shoulder line, and a hair inside it on the 0.88-scaled female builds.
  const stanceX = dims.hipR * 0.64;
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
    const thigh = limbSegment(0.074 * ws, 0.052 * ws, thighLen, mPants, { capBot: false, openBot: true, topology: 'trouser', seat: true });
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
    // v7 FIX round-2 — THE TROUSER STOPS AT THE ANKLE. The shin lathe kept its
    // default rounded bottom cap and ran the full leg length, so its pole sat
    // 0.044·ws BELOW the sole plane: the trouser column literally continued
    // through and past the shoe as a stump (karen-final1-prof, chad-final1-prof,
    // grandma-final1-prof — all three). The lathe is shortened by HEM_LIFT so its
    // pole lands 0.050·ws ABOVE the sole, inside the shoe's ankle collar.
    const HEM_LIFT = 0.050 * ws;
    const shinFull = shinLen + KNEE_TUCK - HEM_LIFT - 0.044 * ws;
    const shinTopR = (0.052 * ws) + (0.052 - 0.044) * ws * (KNEE_TUCK / shinFull);
    const shin = limbSegment(shinTopR, 0.044 * ws, shinFull, mPants, { capTop: false, openTop: true, topology: 'trouser' });
    shin.position.set(0, -shinFull / 2 + KNEE_TUCK, 0);
    shinWrap.add(shin);
    // v6 SLEEK LAW — no kneecap sphere. The shin's rounded top and the thigh's
    // rounded bottom share a radius (~0.055) so they overlap into a smooth knee.
    // v7 FIX round-2 — a real FOOT (see buildShoe): heel back, ankle collar,
    // toe forward. `shoeHeel` gives the female builds the portrait's pump.
    const foot = buildShoe(ws, mShoe, detailed, {
      size: config.shoeSize ?? 1,
      heel: config.shoeHeel ?? (config.gender === 'f' ? 0.026 : 0),
      soleMat: mSole,
      probe: options.probe === true,
    });
    foot.position.set(0, -shinLen, 0.026);
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
  // A jacket over a shirt gets lapel relief; a polo or a shawl does not.
  const hasLapels = config.lapels ?? (config.shirtColor != null && !config.polo);
  const torso = buildTorso(dims, mSuit, detailed, hemDrop, config.gender === 'f', hasLapels);
  torso.position.y = legLength;
  torso.position.z = torsoZ;
  torso.rotation.x = hunch;
  torso.name = 'jacketShell';           // dev harness id (tools/pn-stage.js)
  group.add(torso);
  group.body = torso;

  // v6 round-5 — DOWAGER'S CURVE. Producer, Grandma: "she straightened fully —
  // restore a touch of her hunch." A whole-torso tilt of 0.12rad is only ~7° and
  // reads as nothing once a garment covers the yoke; what says *hunch* is a rounded
  // upper BACK plus the head carried forward of the shoulders. This adds a low
  // rounded mass over the occipital yoke for any build that actually asks for a
  // hunch (grandma 0.12, janitor 0.16, intern 0.15) and never touches an erect one
  // (Meredith's negative hunch, everyone at 0).
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
  // v7 FIX round-1 — THE PELVIS TEARDROP, killed by changing the SHAPE CLASS.
  // Every previous round shrank a hanging SPHERE and it came back, because a
  // sphere seated below the hip pivot and narrower than the thigh spread is,
  // by construction, a discrete rounded mass dangling in the gap between two
  // trouser legs. Under the combat key (low 3/4, warm rim) it lights as its own
  // form: "a glossy sac", "a diaper", "exposed anatomy" — and on Grandma it hung
  // 0.08 BELOW her coat hem.
  //
  // It is now the TOP OF THE TROUSERS instead: a HIP-WIDE lathe that starts at
  // the waistband and closes off ~0.30 of a hip-radius below the pivot. Three
  // properties make the artifact impossible rather than merely smaller:
  //   · width  = hipR (± the torso hem), so its silhouette is swallowed by the
  //     thigh lofts on both sides and by the garment shell above — it can never
  //     be a shape BETWEEN the legs, it is the shape the legs come out of;
  //   · depth  = 0.50 × radius, i.e. half-depth 0.077 at the widest row, matched
  //     to the thigh's own 0.078 front surface — nothing to catch a rim light;
  //   · drop   = hipR × 0.30 (≈0.045), against the old sphere's 0.20 vertical
  //     extent — a crotch seam, not a pod, and above every jacket hem in the cast
  //     (the shallowest is Karen's at −0.083).
  {
    const hr = dims.hipR;
    const gGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0.001, hr * 0.22),
      new THREE.Vector2(hr * 0.72, hr * 0.20),
      new THREE.Vector2(hr * 1.01, hr * 0.10),
      new THREE.Vector2(hr * 1.00, -hr * 0.08),
      new THREE.Vector2(hr * 0.86, -hr * 0.20),
      new THREE.Vector2(hr * 0.52, -hr * 0.28),
      new THREE.Vector2(0.001, -hr * 0.30),
    ], detailed ? 44 : 28);
    gGeo.scale(1, 1, 0.50);
    gGeo.computeVertexNormals();
    const pelvis = new THREE.Mesh(gGeo, mPants);
    pelvis.position.set(0, legLength, torsoZ);
    pelvis.rotation.x = hunch;
    group.add(pelvis);
  }

  // ── SKIRT (v7 FIX round-2) ────────────────────────────────────────────
  // Note [A]: "grandma wears TROUSERS with white cuff stripes instead of her
  // mid-calf skirt + stockings … she is the only hero whose IoU REGRESSED this
  // round." grandma_body.png is a full purple dress with a flared mid-calf skirt
  // over grey stockings; there was no skirt anywhere in the builder, so her
  // costume was carrying none of her silhouette. `config.skirt` builds one:
  // a flared lathe from the waistband to `skirtLength` (a fraction of the leg),
  // hem-lipped so the inside never shows, and the shins render in
  // `stockingColor` beneath it.
  if (config.skirt) {
    const hr = dims.hipR;
    const hemY = legLength * (config.skirtLength ?? 0.30);
    const flare = config.skirtFlare ?? 1.52;
    const mSkirt = M.cloth(tc(config.skirtColor ?? config.suitColor ?? config.bodyColor ?? 0x6a6a7a), config.suitMat || {});
    const drop = legLength - hemY;
    // LatheGeometry winds its normals from the point ORDER: the profile must run
    // bottom → top or the whole cone renders inside-out (first pass did exactly
    // that — the skirt was a translucent veil with the legs visible through it).
    const sGeo = new THREE.LatheGeometry([
      new THREE.Vector2(hr * flare * 0.90, -drop * 0.985),   // hem lip, turned in
      new THREE.Vector2(hr * flare * 0.965, -drop),
      new THREE.Vector2(hr * flare, -drop * 0.97),
      new THREE.Vector2(hr * (1 + (flare - 1) * 0.72), -drop * 0.76),
      new THREE.Vector2(hr * (1 + (flare - 1) * 0.30), -drop * 0.42),
      new THREE.Vector2(hr * 1.03, -drop * 0.10),
      new THREE.Vector2(hr * 0.98, 0.030),
    ], detailed ? 56 : 32);
    // soft vertical pleat modulation so the cone is cloth, not a lampshade
    {
      const p = sGeo.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const rad = Math.hypot(v.x, v.z);
        if (rad < 1e-5) continue;
        const phi = Math.atan2(v.x, v.z);
        const down = Math.min(1, Math.max(0, -v.y / drop));
        const k = 1 + (0.022 * Math.cos(phi * 7) + 0.012 * Math.cos(phi * 3)) * down;
        p.setXYZ(i, v.x * k, v.y, v.z * k);
      }
    }
    sGeo.scale(1, 1, 0.90);
    sGeo.computeVertexNormals();
    const skirt = new THREE.Mesh(sGeo, mSkirt);
    skirt.position.set(0, legLength, torsoZ);
    skirt.rotation.x = hunch * 0.5;
    group.add(skirt);
  }

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
  // v7 FIX round-1 — the arm root moves inboard 0.70 → 0.66 of shoulderR so the
  // upper arm's TOP RIM can be widened (see upTopR) without standing proud of
  // the yoke. Those two numbers together are what turns Chad's "two discrete
  // red balls sitting on the shoulders" into a deltoid that grows out of the
  // cloth: the rim now lands within 0.002 of the torso's own radius at the arm
  // seat, and only the crest (a real deltoid) clears it.
  const shoulderX = dims.shoulderR * 0.66;
  const neckBaseY = legLength + Math.cos(hunch) * torsoH;
  const neckBaseZ = Math.sin(hunch) * torsoH + torsoZ;
  // v7 FIX round-2 — THE HEAD'S Z IS SOLVED ONCE, HERE, so the NECK can be built
  // to reach it. Note [B]: "GRANDMA PROFILE IS BROKEN GEOMETRY … head cranes
  // forward off the neck with a visible under-jaw gap." Measured on her build the
  // head sat at z = 0.139 and the neck column at z = 0.061 — a 0.078 gap, 1.09
  // head-radii of nothing between mandible and trapezius. Two causes: the hunch
  // carry-forward multiplier was 1.7, and the neck's own lean was a fixed
  // hunch×0.5 that knew nothing about where the head had gone. The multiplier
  // comes down to 1.25 and the neck now leans by construction (see below).
  const headZ = neckBaseZ + Math.sin(hunch) * (headR * SKULL.DOWN + neckH) * (hunch > 0.08 ? 1.25 : 1.0)
    + (config.headForward ?? 0);

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
    // v6 round-3 — this pair is now GATED on an actual shirt. Chad, Skip and
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
        headR * (NECK.BASE * 1.333) * (config.neckScale ?? 1));
      vee.position.set(0, legLength, torsoZ);
      vee.rotation.x = hunch;
      staticNode.add(vee);

      // collar band closing the top of the V — FRONT ONLY (v6 round-5). The old
      // 189° torus wrapped past the ears, so from 3/4 and behind every blazer in
      // the cast wore a bright white ring round the neck ("a priest's collar / neck
      // brace" on Karen). The arc is rotated in GEOMETRY space so it is centred on
      // +Z (the front) whatever the hunch, and shaded a stop under the blouse so it
      // never out-lights the face.
      // v7 FIX round-1 — same solve as the polo collar: headR·0.86 stood 0.011
      // off the neck's headR·0.70 column on every shirted build, which at fight
      // framing is Karen's "grey ring collar" floating at the collarbone. Seated
      // on the column at +8% of cloth, and shaded 0.94 rather than 0.84 so it
      // reads as the blouse's own collar instead of a separate grey band.
      const cArc = Math.PI * 0.62;
      const cGeo = new THREE.TorusGeometry(headR * NECK.BASE * (config.neckScale ?? 1) * NECK.COLLAR, 0.0098 * ws, 10, 22, cArc);
      cGeo.rotateZ(Math.PI / 2 - cArc / 2);
      const collar = new THREE.Mesh(cGeo, M.cloth(shadeHexToInt(shirtC, 0.94), { roughness: 0.66, sheen: 0.20, bump: 0.2 }));
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
      // v7 FIX round-1 — THE LIFE-PRESERVER. The collar radius was headR·0.80
      // while the neck column's own base radius is headR·0.70; on Chad that is a
      // 0.011 air gap all the way round, which is the critic's "detached
      // life-preserver ring not touching the neck". It is now solved FROM the
      // neck lathe (which runs nBase·1.043 at the collar's y) plus 3% of cloth.
      const nR = headR * NECK.BASE * (config.neckScale ?? 1) * NECK.COLLAR;
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

    // JACKET BUTTON (v7 FIX round-2). karen_body.png is a SINGLE-BUTTON blazer
    // and the button is the one element that tells the eye "this garment opens".
    // A fastening is not a lapel plate — it stands 0.004 proud on the centre
    // line at the waist, where the shell's own closure crease (surfaceTopology,
    // `lapels`) meets it, so the V above it reads as an opening rather than a
    // painted bib. Gated on lapels + a real hem, i.e. an actual jacket.
    if (config.lapels === true || (config.shirtColor != null && !config.polo && (config.jacketHem ?? 0) > 0)) {
      const bMat = M.cloth(shadeHexToInt(suitC, 0.62), { roughness: 0.42, sheen: 0.5 });
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.0092 * ws, 0.0092 * ws, 0.005, 14), bMat);
      btn.rotation.x = Math.PI / 2 + hunch;
      btn.position.set(0, legLength + torsoH * 0.335, torsoZ + dims.waistR * 0.70 + 0.004);
      staticNode.add(btn);
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
      // v7 FIX round-1 — the neckline shell now rides 4.8% proud of the torso to
      // clear the lapel roll, so a tie at chestR·0.68 sat BEHIND the blouse and
      // rendered as two disconnected blue chips (andrew fx6). Pushed out to
      // chestR·0.82 / 0.80, which is just proud of the V's own front surface.
      knot.position.set(0, neckBaseY - torsoH * 0.045, neckBaseZ + dims.chestR * 0.82);
      staticNode.add(knot);
      const tieH = torsoH * 0.42;
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.036 * ws, tieH, 0.009), mTie);
      tie.position.set(0, neckBaseY - torsoH * 0.045 - tieH * 0.5 + 0.010, neckBaseZ + dims.chestR * 0.80);
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
    const nTop = headR * NECK.TOP * nsc, nBase = headR * NECK.BASE * nsc;
    const nUp = headR * 0.62;
    const neckGeo = new THREE.LatheGeometry([
      new THREE.Vector2(0.001, -0.030),
      new THREE.Vector2(nBase * NECK.FLARE, -0.014),        // trapezius flare
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
    // The column LEANS TO MEET THE HEAD (see the headZ solve above). A fixed
    // hunch×0.5 tilt left Grandma's mandible hanging 1.09 head-radii forward of
    // her own trapezius; solving the angle from the head's actual z closes it on
    // every build, hunched or erect, and costs nothing on the erect ones (their
    // headZ − neckBaseZ is ~0, so the lean is ~0).
    // v7 FIX round-4 — THE NECK SITS UNDER THE FACE, WHICH IS WHY NOBODY HAS A
    // JAW. The column was centred on the head's own z axis, so the throat line
    // ran at +0.46R — directly below the mouth — and the chin cleared it by only
    // 0.40R. On a head the neck balances on the atlas, which is back at the EAR
    // CANAL (≈ −0.20R), so the throat belongs well behind the face. Setting the
    // column's top back opens the under-jaw space that a mandible reads against;
    // no amount of chin projection can do that on its own, because the throat
    // was moving forward with it. The BASE is untouched, so the collar still
    // closes around it.
    const NECK_SET_BACK = headR * 0.17;
    neck.position.set(0, neckBaseY, neckBaseZ);
    neck.rotation.x = Math.atan2((headZ - neckBaseZ) - NECK_SET_BACK, Math.max(0.02, nVis + nUp * 0.5));
    // `probe` (dev harness only — tools/pn-stage.js) keeps the column out of the
    // merge so an ID-colour pass can measure its silhouette at every height
    // WITH collar/hair occlusion honoured. Zero cost in the game: nothing sets it.
    if (options.probe) { neck.name = 'neckColumn'; neck.userData.noMerge = true; }
    group._neckProbe = {
      baseY: neckBaseY,
      lathe: [[nBase * NECK.FLARE, -0.014], [nBase, nVis * 0.10], [nBase * 0.93, nVis * 0.38],
        [nTop * 1.05, nVis * 0.78], [nTop, nVis]],
    };
    staticNode.add(neck);
  }
  collapseNode(staticNode);
  group.add(staticNode);

  // ── ARMS: shoulder pivot → upper + fore + cuff + hand ───────────────
  // v7 FIX round-1 — ARM LENGTH against LAW 1 ("hands reach mid-thigh …
  // fingertips land ≈0.52–0.55; if hands stop at the hip, arms are too short").
  // 0.50/0.46 of torsoH gave a 0.545 reach and fingertips at 0.636 — the hip.
  // On Karen that parked both hands INSIDE the blazer's 0.165 hem radius, which
  // is why the fight still reads armless with a purse floating at the hip.
  // 0.60/0.54 is the bible's 0.30 upper / 0.27 fore at torsoH 0.50; with the
  // 0.052 hand the reach is 0.62 and the fingertips land at ≈0.55.
  const upperArmLen = torsoH * 0.58;
  const foreArmLen = torsoH * 0.52;
  // Hand length measured off the reference sheet: the approved mitten runs
  // ≈1.5 long : 1 wide and is ≈1.5× the cuff width. The v6 hand was 0.104 long
  // × 0.077 wide (1.34:1) hanging off an 0.080 wrist — i.e. the hand was
  // NARROWER than the arm it came out of, which is the whole "nub fist" read.
  const handLen = 0.105 * ws;
  const handLocalY = -upperArmLen - foreArmLen - handLen * 0.44;
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
  // v7 FIX round-1 — the rim was pinched to 0.46/0.62 of the crest, so the loft
  // had to climb 0.026 of radius in 0.012 of height (a ~66° wall) right at the
  // sleeve top: a shoulder BALL, which is what both critics read on Chad and
  // Karen ("boxy shoulder-cap seams standing proud of the shirt"). With the arm
  // root pulled inboard the rim can open to 0.62/0.72 and still hide inside the
  // yoke, and the crest is dropped from 0.74 to 0.60 of the half-length so the
  // flare is spread over twice the run.
  const upTopR = deltoidR * (musc ? 0.62 : 0.72);
  const upBotR = 0.05 * ws * (musc ? 1.28 : 1.0);
  const foreTopR = 0.05 * ws * (musc ? 1.28 : 1.0);
  // v7 FIX round-1 — a WRIST. 0.04 was a 20% taper off the elbow, so the forearm
  // arrived at the hand as a 0.080 tube (a real forearm loses ~40% elbow→wrist).
  // The hand cannot read as a hand while it is the same width as the arm.
  const foreBotR = 0.031 * ws * (musc ? 1.14 : 1.0);
  const ELBOW_TUCK = 0.012;
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();               // shoulder pivot
    // shortSleeve builds the whole arm in SKIN as one loft and lays the polo
    // sleeve over it as a shell, so there is no cloth→skin butt joint on the
    // bicep (the old hem cylinder shared the sleeve's radius and z-fought into a
    // serrated red sawtooth ring at 4×).
    const armMat = shortSleeve ? mSkin : mSuit;
    // v7 FIX round-1 — the top is CLOSED with a flat disc, not left as an open
    // rim. An open tube has no back face, so any frame where the deltoid clears
    // the yoke (walk swing, `shoulderLift` builds, Chad's 1.42 crest) showed the
    // hollow interior: the critic's "visible shoulder-seam gaps against the
    // sleeve caps". The disc is buried inside the torso loft, so unlike the
    // knee/elbow butt joints it can never break a silhouette normal.
    const upper = limbSegment(upTopR, upBotR, upperArmLen, armMat,
      { capBot: false, capTop: false, openBot: true, openTop: false, deltoidR, topology: 'sleeve' });
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
      // The shell rides the SAME loft the limb now uses (crest moved 0.74 → 0.60
      // of the half-length, rim opened): a sleeve authored against the old
      // profile would float off the arm at the crest and pinch at the hem.
      const L = upperArmLen, PR = 1.026;
      const rMid = (deltoidR + upBotR) * 0.51;              // loft radius at −0.5L
      const rHem = rMid + (deltoidR * 0.985 - rMid) * 0.19; // at −0.46L
      // v7 FIX round-2 — a ROLLED HEM. The lathe started at full radius, so the
      // sleeve ended in a zero-thickness open ring: from the side that rim is a
      // visible open ellipse and the shell reads as a tube that has come off the
      // arm ("the sleeve tube visibly detached at the armpit", chad-final1-prof).
      // Two extra points turn the cloth back onto the limb so the hem closes.
      const sGeo = new THREE.LatheGeometry([
        new THREE.Vector2(rHem * 0.985, -0.448 * L),
        new THREE.Vector2(rHem * 1.004, -0.458 * L),
        new THREE.Vector2(rHem * PR, -0.46 * L),
        new THREE.Vector2(deltoidR * 0.985 * PR, -0.29 * L),
        new THREE.Vector2(deltoidR * PR, -0.20 * L),
        new THREE.Vector2(deltoidR * 0.965 * PR, -0.12 * L),
        new THREE.Vector2((deltoidR * 0.72 + upTopR * 0.28) * PR, -0.05 * L),
        new THREE.Vector2(upTopR * 1.02, 0),
      ], 44);
      sGeo.computeVertexNormals();
      const sleeve = new THREE.Mesh(sGeo, mSuit);
      arm.add(sleeve);
    } else if (config.shirtColor != null) {
      // v7 FIX round-2 — the cuff used to be unconditional, and `mShirt` falls
      // back to off-white when shirtColor is null. Grandma (shirtColor: null)
      // therefore wore two bright white bands at the wrists over a purple dress:
      // the note's "TROUSERS with white cuff stripes". No shirt → no cuff.
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.0335 * ws, 0.0335 * ws, 0.018, 16),
        M.cloth(shadeHexToInt(shirtC, 0.88), { roughness: 0.64, sheen: 0.22, bump: 0.2 }));
      cuff.position.set(0, -upperArmLen - foreArmLen + 0.022, 0.03);
      arm.add(cuff);
    }
    // HAND — the reference sheet's mitten, built to its proportions.
    // art/char_refs/generated/_hands_reference.png is unambiguous: the approved
    // hand IS a mitten with one thumb lobe and no separated fingers. The defect
    // the critic logged is proportion, not fingers — "pale oven-mitt paddles"
    // (a 0.045 sphere scaled 0.85/1.15/0.60 is a flat oval with no wrist, no
    // taper and no knuckle line) and "nub fists" once the arms were too short to
    // clear the garment. buildHand lofts wrist → knuckles → tapered tip in ONE
    // surface and seats the thumb INBOARD-FORWARD, where the sheet puts it (the
    // old thumb sat outboard on the right arm, i.e. on the wrong side).
    const hand = buildHand(handLen, ws, mSkin, side, detailed, options.probe === true);
    hand.position.set(0, handLocalY, 0.036);
    arm.add(hand);
    collapseNode(arm);

    // `shoulderLift` pulls the shoulders IN and UP — the "oversized suit
    // swallowing a hunched frame" read the Intern was missing.
    const lift = config.shoulderLift ?? 0;
    arm.position.set(side * (shoulderX + 0.010 * ws) * (1 - lift * 3), shoulderY - 0.025 + lift, shoulderZ + lift * 0.6);
    // v7 FIX round-1 — 0.05rad hung both hands inside Karen's 0.165 blazer-hem
    // radius, so the fight still read "armless, purse floating at the hip".
    // Then normframe measurement gave the real number: at matched framing the
    // reference sheets have bbox width/height 0.42–0.48 and the v7 renders had
    // 0.25–0.33 — the cast was 30–45% too narrow, and almost all of that gap is
    // the arms hugging the ribcage. A relaxed human arm hangs ~9° out from
    // vertical; 0.05rad is 2.9° and 0.155 is 8.9°.
    arm.rotation.z = side * (0.155 + lift * 4);
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
  // `headZ` is solved up by the neck base (see there) so the neck column can be
  // built leaning to meet it — the two must never be computed independently.
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
  // v7 FIX round-1 — per-character face shape, every dial clamped inside LAW 4's
  // ±15% human band so identity never becomes caricature.
  const faceDial = {
    jaw: jawDial, chin: chinDial, nose: noseDial,
    wide: _clamp(config.faceWidth ?? 1, 0.88, 1.12),
    cheek: _clamp(config.cheek ?? 1, 0.80, 1.20),
    browRidge: _clamp(config.browRidge ?? 1, 0.75, 1.25),
    eyeSize: _clamp(config.eyeSize ?? 1, 0.88, 1.14),
    eyeGap: _clamp(config.eyeGap ?? 1, 0.90, 1.10),
    mouthWidth: _clamp(config.mouthWidth ?? 1, 0.88, 1.14),
    // `square` is structure, not proportion, so LAW 4's ±15% face band does not
    // govern it — but it is still clamped so no one can grow a cinder block.
    square: Math.min(2.2, Math.max(1.0, config.skullSquare ?? 1)),
  };
  const skull = makeHead(headR, mSkin, { ...faceDial, detailed });
  if (options.probe) { skull.userData.pnId = 'skullMesh'; skull.userData.noMerge = true; }
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
    // v7 FIX round-2 — the ear rides the landmark stack: LAW 3 seats it in the
    // brow→nose-base band, which after the muzzle correction is +0.16R … −0.55R,
    // centre −0.20R (it was −0.28R against the old, longer midface). A pinna is
    // also HELIX-rimmed, not a smooth bead — the profiles read "no ear anywhere,
    // the earring floats on the hair" — so a second thinner lobe stands a hair
    // proud of the first as a rim, which is what makes an ear read at 3/4.
    const earY = -headR * 0.20;
    // 0.94 put the ear's outer edge ≈0.01R proud of the skull; on the wide-face
    // builds that reads as a detached skin TAB at 3/4. 0.90 buries it.
    // v7 FIX round-4 — THE EARS DID NOT RENDER. Measured cast-wide on the
    // profile instrument: the pinna's outer edge sat INSIDE the skull's own
    // silhouette on every single character (earProud −0.005R andrew/intern,
    // −0.010R grandma, −0.035R chad, −0.145R karen), so the ear owned 0.0–0.8%
    // of the profile and 0.0–0.5% of the 3/4 — i.e. the bible's "simple 3D ears
    // at eye→nose height, tucked at 3/4" existed in the scene graph and nowhere
    // on screen. 0.90 was tuned to kill a "detached skin bead"; it killed the
    // ear. A real pinna stands a HAIR proud of the widest part of the skull, so
    // that is what this now solves for (≈ +0.02R).
    const earX = side * headR * skullHalfW(-0.20, faceDial.wide) * 0.92;
    const ear = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.185, 20, 16), mSkin);
    ear.scale.set(0.44, 1.72, 0.98);
    ear.position.set(earX, earY, -headR * 0.20);
    ear.rotation.z = side * 0.06;
    if (options.probe) { ear.userData.pnId = 'ear'; ear.userData.noMerge = true; }
    head.add(ear);
    const helix = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.150, 18, 14), mSkin);
    helix.scale.set(0.52, 1.62, 0.90);
    helix.position.set(earX + side * headR * 0.012, earY + headR * 0.02, -headR * 0.235);
    helix.rotation.z = side * 0.06;
    if (options.probe) { helix.userData.pnId = 'ear'; helix.userData.noMerge = true; }
    head.add(helix);
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
  buildHair(scalp, headR, mHair, resolveHairStyle(config.hairStyle), mStreak, mUnder, options.probe === true);

  // face textures + curved patch. The painter is handed the SOLVED layout the
  // geometry produced (see faceLayout()), so canvas landmarks land on the
  // sculpted brow / socket / nose / chin instead of being re-tuned by eye.
  const faceSize = detailed ? 512 : 256;
  faceConfig._layout = faceLayout(faceDial);
  group.faceTextures = paintFaceSet(faceConfig, faceSize);
  let facePatch = null;
  if (group.faceTextures && group.faceTextures.neutral) {
    facePatch = makeFacePatch(headR, group.faceTextures.neutral, M, detailed, faceDial);
    if (options.probe) { facePatch.userData.pnId = 'facePatch'; facePatch.userData.noMerge = true; }
    facePatch.userData.noMerge = true;
    head.add(facePatch);
  }

  collapseNode(head, [mHair, mStreak, mUnder].filter(Boolean));
  if (facePatch) {
    group.faceMesh = facePatch;
    // THE EXPRESSION CONTRACT: one name drives BOTH channels. CharacterAnimator
    // reads faceTextures for the paint and faceMorphIndex for the geometry and
    // sets them in the same call, so they can never disagree again.
    group.faceMorphIndex = facePatch.userData.faceMorphIndex || null;
  }

  // glasses as torus GEOMETRY (rework a) — parented to head, ride the bob
  if (config.glasses) {
    // Built into their own node so a review harness can isolate them: the
    // eyewear frame is a dark torus that crosses the nose band, and it was
    // dominating the horizontal-shadow-line measurement on every character who
    // wears a pair (andrew / grandma / intern read 60–85 against karen's 29
    // purely because of it). Costs one empty group in the game.
    const eyewear = new THREE.Group();
    eyewear.userData.pnId = 'eyewear';
    buildGlasses(eyewear, headR, config.glasses, detailed);
    head.add(eyewear);
  }

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
    // The torso lathe is squashed to 0.66 depth AND the v7 surface field adds up
    // to ~3.5% on the chest, so accessories seated at exactly 0.66 sank into the
    // cloth (the Intern's name tag, Karen's brooch). 0.70 keeps them on it.
    frontZ: neckBaseZ + dims.chestR * 0.70,
    // v7 FIX round-2 — `frontZ` is the surface at CHEST height (t≈0.58). Anything
    // seated at the collar with it floats: the torso lathe narrows from chestR to
    // shoulderR·0.965 up there AND the z-scale is 0.66, so on Grandma the cameo
    // sat 0.05 proud of the cloth — the note's "detached black rectangle hovering
    // at chest height". `collarZ`/`collarY` are the surface at t = 0.90.
    torsoZ,
    collarY: legLength + Math.cos(hunch) * torsoH * 0.90,
    collarZ: torsoZ + Math.sin(hunch) * torsoH * 0.90 + Math.cos(hunch) * dims.shoulderR * 0.965 * 0.66,
    chestR: dims.chestR,
    waistR: dims.waistR,
    shoulderRad: dims.shoulderR,
    hunch,
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
    for (const acc of config.accessories) addAccessory(group, acc, rig, config, detailed, options.probe === true);
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
    const cranialHalf = headR * skullHalfW(0, faceDial.wide);
    // gonion half-width, with the per-character jaw dial applied exactly as
    // sculptSkull applies it (so the number the harness prints is the number the
    // vertices got).
    const eGon = Math.sqrt(1 - (0.60 / SKULL.DOWN) ** 2);
    const gonionHalf = headR * eGon * faceDial.wide
      * (1 + (jawProfile(-0.60) - 1) * (1 + (1 - jawDial) * 4.5));
    group.metrics = {
      headR, headY, crownY, chinY, eyeY,
      headWidth: 2 * cranialHalf,
      headHeight: crownY - chinY,
      cheekY: headY - headR * 0.30,
      jawY: headY - headR * 0.60,
      headWOverH: +((2 * cranialHalf) / (crownY - chinY)).toFixed(3),
      eyeLinePct: +(((crownY - eyeY) / (crownY - chinY)) * 100).toFixed(1),
      jawOverCranialGeo: +((gonionHalf / cranialHalf) * 100 / 100).toFixed(3),
      neckOverHead: +(NECK.TOP * (config.neckScale ?? 1)).toFixed(3),
      neckBaseY: group._neckProbe ? group._neckProbe.baseY : null,
      neckLathe: group._neckProbe ? group._neckProbe.lathe : null,
      shoulderOverHeadW: +((dims.shoulderR * 2) / (2 * cranialHalf)).toFixed(3),
      shoulderR: dims.shoulderR, chestR: dims.chestR,
      waistR: dims.waistR, hipR: dims.hipR, ws, jacketHem: hemDrop,
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
        const hb = hairBumpTexture();
        if (hb) { m.bumpMap = hb; m.bumpScale = 0.010; }
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
      const hb = hairBumpTexture();
      if (hb) { m.bumpMap = hb; m.bumpScale = 0.006; }
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
// v7 PRODUCER-NOTES round-2 — STRAND TEXTURE (producer note 6: "Grandma: the
// hair reads as a BONNET — needs painted strand texture").
//
// The old texture was 150 faint strokes on a 256px canvas mapped ONCE around a
// sphere with no `repeat` and no bump. At head scale that is roughly one visible
// stroke per two centimetres of scalp at 20% alpha — i.e. nothing. What the
// renders showed was a smooth pale shell with a hard rim, which is a bonnet.
//
// Two changes, and the second is the one that matters:
//   · DENSITY + TILING. 520 strokes and a 2x3 repeat, so strands read as fibre
//     at the size a head is actually drawn.
//   · A BUMP MAP. Hair does not read as hair because it is striped; it reads as
//     hair because the strands CATCH LIGHT along their length. A diffuse-only
//     stripe on a smooth shell is still a smooth shell. The bump is the same
//     stroke field rendered as height, so the key rakes across it.
// Both stay LOW CONTRAST on the albedo (the "exposed brain" note on silver hair
// came from dark swirls), and every stroke is near-vertical: hair falls.
function _strandField(ctx, S, mode) {
  const dark = mode === 'bump' ? 'rgba(40,40,40,' : 'rgba(120,120,120,';
  const lite = mode === 'bump' ? 'rgba(240,240,240,' : 'rgba(255,255,255,';
  for (let i = 0; i < 520; i++) {
    const x = Math.random() * S, y = Math.random() * S;
    const len = 30 + Math.random() * 80;
    const up = Math.random() > 0.5;
    const a = mode === 'bump' ? (0.20 + Math.random() * 0.30) : (0.10 + Math.random() * 0.14);
    ctx.strokeStyle = (up ? lite : dark) + a.toFixed(3) + ')';
    ctx.lineWidth = 0.6 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    // near-vertical sway: a strand, never a swirl (v6's swirls read as
    // cerebral folds on white hair)
    ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 6, y + len * 0.5, x + (Math.random() - 0.5) * 9, y + len);
    ctx.stroke();
  }
}
function hairTexture(key = 'default') {
  if (typeof document === 'undefined') return null;
  if (_hairTexCache[key]) return _hairTexCache[key];
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  // Near-white base so the material COLOR carries the hair hue. A mid-grey base
  // MULTIPLIES the colour and drags every hair two value-stops darker (that is
  // why Karen's platinum once read ochre and Chad's blonde read chocolate).
  ctx.fillStyle = '#f6f6f6';
  ctx.fillRect(0, 0, S, S);
  _strandField(ctx, S, 'albedo');
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  _hairTexCache[key] = tex;
  return tex;
}

let _hairBumpTex = null;
function hairBumpTexture() {
  if (typeof document === 'undefined') return null;
  if (_hairBumpTex) return _hairBumpTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, S, S);
  _strandField(ctx, S, 'bump');
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  _hairBumpTex = tex;
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
// ── NECK CANON (producer note 1, 2026-07-31: "necks STILL too big — measure
//    EVERY point along the neck profile on renders") ────────────────────
//
// The column, the shirt collar, the polo collar and the blouse neckline used to
// carry FOUR independent copies of `headR * 0.70`, so narrowing the column left
// three garment rings ping-ing at the old radius (that is how the "life-
// preserver collar" note came back twice). They all solve off this block now.
//
// Measured on the pn harness against the round-3 build (tools/pn-shoot.mjs
// --only=neck): the visible column ran 0.58–0.61 of head WIDTH on andrew /
// karen / chad with a columnAspect (visible height ÷ mean width) of 0.60–0.81 —
// i.e. every hero's neck was wider than the exposed column was tall, which is
// the "plinth, not a column" read amendment 2 was written against. Amendment 2
// caps the TOP at 0.55R; 0.55 was being taken as a target rather than a ceiling.
//
// TOP comes down to 0.485R and BASE to 0.60R. That is a 19% taper the eye can
// actually see (it was 21% before, but starting so wide that the taper read as
// parallel), and it opens a real jaw/neck separation at the mandible.
// Chad is exempt by producer ruling ("his neck is GOOD, keep") — his neckScale
// is raised to hold his rendered width exactly where it is.
const NECK = {
  TOP: 0.485,     // half-width at the CHIN, in head radii
  BASE: 0.600,    // half-width at the collar seam
  FLARE: 1.05,    // trapezius flare at the very base (was 1.08)
  COLLAR: 1.075,  // garment rings ride this much proud of BASE
};

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
// How far the painted patch stands proud of the skull it is conformed to.
// v7 PRODUCER-NOTES round-1 — 1.004 → 1.016 (producer note 3, "horizontal
// shadow lines around the noses").
//
// The skull and the patch run the SAME sculpt at DIFFERENT tessellations (88×72
// over the whole sphere vs 96×96 over a 2.14-rad band). Wherever the sculpt has
// real curvature — the nose wedge, the lips, the chin — the coarser skull's
// chordal error exceeds the 0.4% gap and the skull POKES THROUGH the patch in
// latitude-aligned slivers. On the map-stripped form pass that shows as a stack
// of hard horizontal ridges across the mouth and under the nose, which is
// exactly the artifact the producer flagged, and it is neither paint nor sculpt
// intent: it is two surfaces fighting. 1.6% clears the worst chordal error while
// staying far under the patch's own alpha feather, so the rim never reads as a
// plate edge.
const PATCH_PROUD = 1.016;
const PATCH_THETA_START = Math.acos(PATCH_Y_TOP / SKULL.UP);
const PATCH_THETA_LEN = Math.acos(PATCH_Y_BOT / SKULL.DOWN) - PATCH_THETA_START;

// Vertical landmarks on the human face, in skull-Y (R units).
//
// v7 FIX round-2 — THE MUZZLE (note [A] "lower face is ~2× its human
// proportion"; note [B] "the midface melt"). The old stack was
//   brow +0.20 · eye 0.00 · nose −0.62 · mouth −0.86 · chin −1.27
// and it fails Loomis by a measurable margin. Projected to screen (which is
// what a player sees), brow→nose ran 0.82R against nose→chin 0.64R — a
// +28% overshoot on the middle third — so the eye-to-nose expanse was a
// featureless 0.8R of blank cheek. That expanse is what the smudge lived in
// and what read as a snout.
//
// The thirds are now solved, not authored: with brow at +0.16 and the chin
// point at −1.26, the SUB-NASAL lands on their midpoint (−0.55) and the mouth
// line a third of the way from there to the chin (−0.79). `nose` is the painted
// ALAE row (the nostril line), which sits a little above the sub-nasal.
//   brow→subnasal 0.71R  ·  subnasal→chin 0.71R    (equal, projected)
const LM = { hairline: 0.80, brow: 0.16, eye: 0.0, nose: -0.47, mouth: -0.79, chinPt: -1.26 };
// The sub-nasal (bottom of the nose) — the actual third boundary. Kept
// separate from LM.nose because the painter needs the alae row and the sculpt
// needs the plane under it.
const LM_SUBNASAL = -0.55;

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
function skullHalfW(y, wide = 1) {
  const e = Math.sqrt(Math.max(0, 1 - (y / (y >= 0 ? SKULL.UP : SKULL.DOWN)) ** 2));
  const w = wide === 1 ? 1 : (1 + (wide - 1) * (1 - _sstep(0.20, 1.05, y)));
  return e * jawProfile(y) * cranialTaper(y) * w;
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
//
// v7 FIX round-2 — **THIS FUNCTION WAS THE CREASE GENERATOR** (note [A]
// "horizontal shelf creases on all four heroes … reads as scars"). It was a
// six-anchor table interpolated with `t²(3−2t)` PER SEGMENT. Smoothstep has zero
// slope at both ends, so the profile's derivative was pinned to zero at every
// anchor and peaked in every gap: a scalloped radius curve with an inflection
// every 0.3R. The worst pair — 1.03 at −0.30 (a "malar crest" baked into the
// silhouette) falling to 0.93 at −0.60 — is a 10% radius swing over 0.3R with a
// hard slope reversal at each end, i.e. a horizontal welt right across both
// cheeks. Measured on the map-stripped form pass it dropped a white surface from
// L221 to L127 in twelve pixels at y ≈ −0.37R, which is the midpoint of exactly
// that segment.
//
// It is now ONE monotone taper plus one gentle chin recovery — two smoothsteps,
// each spread over ≥0.4R, so the steepest surface tilt anywhere is ~8.5°. The
// malar crest is not lost: step 6 of sculptSkull builds it as a localised,
// SHEARED (diagonal) swell, which is where a cheekbone belongs.
function jawProfile(y) {
  if (y >= 0) return 1;
  return 1 - 0.105 * _sstep(0.05, -1.00, y) + 0.045 * _sstep(-0.95, -1.38, y);
}

// Displace ONE point of the skull. `d` is the unit direction on the base sphere;
// the function returns the sculpted world-space offset in R units.
// `dial` carries the per-character jaw/chin values (LAW 4 clamps them).
function sculptSkull(d, dial, out) {
  const jawDial = dial.jaw, chinDial = dial.chin, noseK = dial.nose ?? 1;
  // v7 FIX round-1 — PER-CHARACTER FACE SHAPE (critic: "ONE FACE, TWENTY
  // COSTUMES … the cast is one skull in different wigs"). Three dials, all
  // inside LAW 4's ±15% human band:
  //   faceWidth — skull half-width at the FACE (below the parietal), so Karen
  //               can be a long oval and Chad a wide square without either head
  //               changing volume the way a global headScale would;
  //   cheek     — malar crest amplitude (round vs planar cheekbones);
  //   browRidge — supraorbital shelf amplitude (heavy vs soft).
  const wideK = dial.wide ?? 1;
  const cheekK = dial.cheek ?? 1;
  const browK = dial.browRidge ?? 1;
  let x = d.x;
  let y = d.y * (d.y >= 0 ? SKULL.UP : SKULL.DOWN);
  let z = d.z * (d.z >= 0 ? SKULL.FRONT : SKULL.BACK);

  // 1 · cranial dome + jaw taper (radial, in the x/z plane)
  // v7 FIX round-1 — THE JAW DIAL WAS INVERTED AND INERT. `jawProfile(y) − 1` is
  // NEGATIVE below the cheekbone (it is a taper), so `× (1 + (jawDial − 1)·1.6)`
  // made a HIGHER dial produce a NARROWER gonion — the opposite of what every
  // authored value and comment in characters.js means ("narrow jaw (0.81)" on
  // Janet rendered as the WIDEST jaw in the cast; LAW 4 clamps "Meredith/id-
  // meredith jaw:0.78→0.85" as a narrow outlier). And at 1.6 the whole authored
  // range moved the ratio by 1%: measured jawOverCranialGeo across the four
  // heroes was 0.839–0.848, which is the arithmetic behind "the cast is one
  // skull in different wigs". Sign flipped to match the bible, gain 1.6 → 4.5,
  // so LAW 4's 0.85–1.15 clamp now spans jaw/cranial 0.79 (narrow) → 0.88 (wide).
  const radial = cranialTaper(y) * (1 + (jawProfile(y) - 1) * (1 + (1 - jawDial) * 4.5));
  x *= radial; z *= radial;
  // 1b · face-width dial is applied at the very END of the sculpt (see `out`), NOT
  //      here: every anatomical bell below keys off |x|, so narrowing the skull
  //      first would slide the malar crest, socket and cheek plane inboard and
  //      give narrow-faced builds (intern 0.91, karen 0.93) hollow cheeks the
  //      wide-faced ones don't get. The anatomy is solved in canonical space and
  //      the whole face is scaled afterwards.
  const wideAt = (yy) => (wideK === 1 ? 1 : 1 + (wideK - 1) * (1 - _sstep(0.20, 1.05, yy)));

  // 2 · TEMPLE PLANE — a real skull is flat at the temples, not circular.
  //     A gentle inward pull on the side wall between brow and parietal.
  const templeW = _bell(y, 0.30, 0.70) * _bell(Math.abs(d.x), 0.86, 0.34);
  x *= 1 - 0.055 * templeW;

  // 3 · OCCIPUT / NAPE — the back of the jaw must not balloon behind the ear.
  if (z < 0 && y < -0.35) z *= 1 - 0.20 * _sstep(-0.35, -1.1, y);

  const front = Math.max(0, d.z);                          // 0 at the ear line, 1 at the nose
  const ax = Math.abs(x);

  // ── v7 FIX round-2 — THE HORIZONTAL SHELF CREASES (note [A], all four heroes;
  //    note [B] "the midface melt … it is GEOMETRY, not paint").
  //
  //    Measured off screenshots/v7/karen-fx8-f.png against the world scale the
  //    same image gives (eye→mouth = 0.854R = 122px, so 1R = 143px), the two
  //    lateral dark bands land at y = −0.385R and y = −0.594R. Those are, to the
  //    pixel, the lower edge of the malar bell (centre −0.30, half-width 0.36)
  //    and the cheekPlane/maxilla-shelf boundary. Both were built as
  //    `_bell(y,·) × _bell(ax,·)` products — i.e. bands of constant Y, which is a
  //    HORIZONTAL ridge. Human midface structure runs DIAGONALLY: the zygomatic
  //    arch climbs up-and-back toward the ear, the naso-labial plane change
  //    falls down-and-out toward the mouth corner. A horizontal ridge across a
  //    cheek is a scar; it is why a late-20s Chad cold-read ~55.
  //
  //    Every band below is therefore evaluated on a SHEARED y — `y + slope·ax` —
  //    so the form tilts with the anatomy, and every amplitude comes down. The
  //    sub-lip recess (the "toothless old man" scoop in profile) loses two
  //    thirds of its depth and triples its falloff width.
  const shear = (yy, slope) => yy + slope * ax;

  // 4 · BROW RIDGE (supraorbital torus). Sheared UP toward the temple, which is
  //     the direction a real supraorbital ridge runs, and softened 0.070 → 0.058
  //     so the ridge line stops reading as a second painted brow above the real
  //     one (visible as a crisp arc in karen-fx8-f).
  const browBand = _bell(shear(y, -0.13), LM.brow, 0.38);
  const browLat = 0.72 * _bell(ax, 0.36, 0.46) + 0.42 * _bell(ax, 0.03, 0.22);
  z += 0.046 * browK * browBand * browLat * front;

  // 5 · EYE-SOCKET — REAL geometry now (note [A] "eyes are still paint-on-egg at
  //     3/4: the far eye … floats off the head silhouette edge. No socket
  //     geometry."). Two forms, not one: the orbit recesses (deeper than v7's
  //     0.048 — that was inside the noise floor at fight framing), and a LOWER
  //     LID / orbital rim ridge sits just under it, so the eye reads as sitting
  //     IN a hollow between the brow shelf and the cheek rather than painted on
  //     a sphere. The pair is what makes the far eye turn away with the head.
  const socket = _bell(y, -0.05, 0.30) * _bell(ax, 0.40, 0.32);
  z -= 0.072 * socket * front;
  const lidRim = _bell(y, -0.26, 0.16) * _bell(ax, 0.40, 0.34);
  z += 0.026 * lidRim * front;

  // 6 · MALAR (cheekbone) CREST + the cheek plane below it — both sheared.
  //     Amplitude 0.040 → 0.026 and the Y falloff opens 0.36 → 0.54, so the
  //     crest is a broad diagonal swell instead of a 0.72R-tall welt.
  const malar = _bell(shear(y, -0.34), -0.30, 0.54) * _bell(ax, 0.62, 0.46);
  z += 0.026 * cheekK * malar * front;
  x += 0.020 * cheekK * malar * Math.sign(x) * front;
  // The cheek plane no longer uses a smoothstep in Y (a step IS an edge); it is
  // a wide sheared bell at a third of the old depth.
  const cheekPlane = _bell(shear(y, -0.30), -0.66, 0.62) * _bell(ax, 0.76, 0.52);
  z -= 0.0035 * cheekPlane * front;

  // 7 · MAXILLA / PHILTRUM shelf and the sub-lip recess. The shelf follows the
  //     sub-nasal row and is halved (0.038 → 0.019); the sub-lip recess, which
  //     was a 0.16-wide groove at −0.96 — a hard horizontal gutter directly
  //     under the mouth, and the exact source of the concave under-mouth scoop
  //     the profiles show — is now 0.008 over a 0.34 falloff.
  // v7 PRODUCER-NOTES round-1 — both of these were still CONSTANT-Y bells, the
  // one shape this file's own round-2 note calls "a scar": they sat at −0.61 and
  // −0.93, stacking two more horizontal ridges directly under the nose. They are
  // now sheared like steps 4 and 6 (the maxilla plane falls away-and-out toward
  // the mouth corner; the mental crease runs with the lip line) and softened —
  // the shelf 0.019 → 0.010 over a 0.44 falloff, the sub-lip recess 0.008 →
  // 0.005 over 0.40.
  z += 0.010 * _bell(shear(y, -0.26), LM_SUBNASAL - 0.06, 0.44) * _bell(ax, 0.12, 0.60) * front;
  z -= 0.005 * _bell(shear(y, -0.18), LM.mouth - 0.14, 0.40) * _bell(ax, 0.0, 0.44) * front;

  // 7b · MANDIBULAR FRONTAL PLANE (v7 FIX round-2 — the LAST third of the beard
  //      smudge, and the one that is nobody's paint bug).
  //
  //      Measured on the lit head close-up after the crease fix: forehead
  //      L≈172, jaw L≈112 — a 35% luminance drop across the lower third, which
  //      at fight framing reads as a garment on the face. The cause is not the
  //      texture (the dumped tile is flat — screenshots/v7/karen-g1-tile.png)
  //      and not the venue rig (LAW 5 puts the key front-and-above deliberately);
  //      it is that the lower face was a bare ELLIPSOID. On a 1.35-tall, 1.02-deep
  //      skull the front surface recedes 0.246R between the sub-nasal and y=−1.0,
  //      a 29° down-tilt, so the chin normal ends up nearly perpendicular to the
  //      key (n·key ≈ 0.09 against 0.98 at the forehead).
  //
  //      A human mandible is a comparatively FLAT frontal plane — that is why a
  //      real chin catches the same light as a real forehead. Raising the
  //      lower-front toward that plane is anatomy first and lighting second, and
  //      it is the only lever inside this file that can move the number: skin
  //      albedo is already ≈0.80 of white, so a painted counter-light (tried,
  //      measured, +2.4%) has nowhere to go.
  //      Falls off laterally (bell 0.82) so the jaw keeps its taper, and releases
  //      below −1.16 so the sub-mental still tucks under.
  // v7 FIX round-4 (producer: "ANDREW NEEDS A JAW — his profile reads jawless").
  //      Measured on the new profile instrument, the DEFAULT skull — Andrew's,
  //      and every cast member with no explicit dial — put the pogonion at 0.616
  //      of the nose's projection from the head's own centre plane, against a
  //      human 0.75-0.85 and against the Janitor's dialled 0.935. Below the
  //      mouth his outline ran straight down into the collar: no chin point, no
  //      mandibular line, no gonial corner. The plane and the protuberance below
  //      both come up, and the sub-mental tuck deepens WITH them so what appears
  //      is a jaw with a corner under it rather than simply a longer face.
  const mandible = _sstep(-0.34, -1.16, y) * _bell(ax, 0.0, 0.82);
  z += 0.380 * mandible * front * (1 - 0.55 * _sstep(-1.16, -1.40, y));

  // 8 · CHIN — a real mental protuberance, narrow and forward. Eased 0.085 →
  //     0.062 and widened, because a tall chin ball sitting under a deep sub-lip
  //     gutter is what made every profile read "toothless".
  const chinBand = _bell(y, -1.08, 0.40) * _bell(ax, 0.0, 0.40);
  // …and the chin's own weight no longer collapses at the pole: `front` is d.z on
  // the unit sphere, which tends to zero exactly where the mental protuberance
  // lives, so the term was being damped out of existence at the one row it
  // exists for. front^0.55 keeps the falloff (nothing behind the ear moves) with
  // usable amplitude on the lower front.
  z += 0.170 * chinDial * chinBand * Math.pow(front, 0.55);
  // and the sub-mental plane tucks back under it — deepened with the chin so the
  // profile turns a CORNER under the jaw instead of sloping into the throat.
  z -= 0.055 * _bell(y, -1.30, 0.24) * front;

  // 9 · NOSE WEDGE (integrated, LAW 3: "a small 3D geometric wedge").
  //     Round-1 measured the nose TIP at z 1.058R against a brow at 1.079R — the
  //     nose sat BEHIND the brow plane, which is why the profile had no nose at
  //     all. A human nose tip projects past the brow by roughly a sixth of head
  //     height. The wedge is now an explicit profile (nasion dip → ridge → tip →
  //     columella → sub-nasal plane) with a half-width that opens toward the alae,
  //     so it reads in profile AND casts its own shadow at 3/4 without becoming
  //     a beak from the front (the alae are far less proud than the tip).
  // v7 FIX round-1 — the ridge amplitudes come down ~18% and the lateral falloff
  // opens from 2.0× to 2.8× the local half-width. The v7 nose measured a 0.33R
  // tip inside a 0.33R-wide falloff: correct in profile, but from the front it
  // was a pinched blade dropping off a cliff into the cheek (the critic's
  // "shared nose over-sculpt … long pinched ridge with dark flank creases").
  // A wider falloff on a slightly lower ridge keeps the profile nose and lets
  // the flank BLEND into the maxilla shelf.
  // v7 FIX round-2 — the whole wedge moves UP with the landmark stack (the nose
  // base is now the middle-third boundary at −0.55, not −0.78) and the tip gains
  // projection (0.272 → 0.300). Measured against the new brow plane the tip now
  // stands 0.227R proud of the glabella = 8.7% of head height, which is inside
  // the human 8–13% band; at the old numbers on the old brow it was the reason
  // three of four profiles read "NO nose projection … the facial edge is
  // concave" (note [B], chad-final1-prof).
  // v7 PRODUCER-NOTES round-1 — THE SCALLOP (producer note 3, and the actual
  // root cause behind "horizontal shadow lines around the noses").
  //
  // The wedge used to be a 9-anchor table interpolated with `u²(3−2u)` PER
  // SEGMENT. That is the identical defect this file already documents and fixed
  // in `jawProfile` ("smoothstep has zero slope at both ends, so the profile's
  // derivative was pinned to zero at every anchor and peaked in every gap"). The
  // nose table was never converted. On the map-stripped form pass the residue is
  // unmistakable: a STACK of horizontal ridges at y ≈ −0.55, −0.63, −0.69, −0.74
  // and −0.79 — i.e. one at every table anchor and every gap between them, right
  // where the producer sees bars across the nose and lip.
  //
  // The profile is now analytic and C¹ everywhere: one asymmetric bell for the
  // projection (nasion → tip → sub-nasal) and one for the half-width (a narrow
  // bridge opening to the alae). Same tip projection (0.300R at y = −0.42), same
  // alae width, no anchors — so there is no row at which the surface can kink.
  if (y < 0.18 && y > -0.92 && front > 0.18) {
    const dy = y + 0.42;                                   // 0 at the nose tip row
    const amp = 0.300 * _bell(y, -0.42, dy >= 0 ? 0.58 : 0.46);
    const halfW = 0.055 + 0.085 * _bell(y, -0.52, 0.62);
    // 2.8 → 2.35 → 1.90: at 2.35 the falloff reached ±0.38R at the alae row, so
    // the surface tilt the wedge creates ran a third of the way across each
    // cheek, which under the front-and-above key IS a horizontal bar with a nose
    // in the middle of it (measured: a 4.14-nose-width smear on Karen). At 1.90
    // it ends inboard of the eye gap and the cheeks stay lit.
    const lat = _bell(ax, 0.0, halfW * 1.90);
    z += amp * lat * front * noseK;
  }

  // 10 · SKULL STRUCTURE (`square`) — v7 PRODUCER-NOTES round-2, producer note 4:
  //      "Chad: head too small and too round — a face painted on a baseball.
  //      Needs skull structure and scale."
  //
  //      Every dial up to here changes the FACE. None of them change the fact
  //      that the cranium is an ellipsoid: measured on the form pass, Chad's
  //      profile deviated from a circular arc by 0.096 and carried a structure
  //      energy of 4.63 — a smooth egg with features drawn on it. This dial adds
  //      the three planes that make a skull read as bone rather than as a ball,
  //      and it is off (1.0) for everyone who does not ask for it.
  //
  //      · GONIAL ANGLE — a real corner at the jaw angle, pushed out and back,
  //        so the mandible turns instead of tapering away.
  //      · FRONTAL PLANE — the forehead flattens across its width; a domed
  //        forehead is the single biggest "baseball" tell in front view.
  //      · SIDE WALL — the temple plane (step 2) carried down past the zygomatic
  //        arch, so the skull has parallel sides rather than a continuous curve.
  //      All three are sheared or laterally-belled, so none of them can become a
  //      constant-Y ridge (the defect note 3 was written against).
  const sqK = (dial.square ?? 1) - 1;
  if (sqK > 0) {
    // Amplitudes are the round-2 SECOND pass. At 0.080/0.060/0.048 the numbers
    // moved (gonial hold 78% → 88%) but the form pass still cold-read as an egg,
    // which is the only verdict that counts.
    const gon = _bell(shear(y, -0.20), -0.72, 0.46) * _bell(Math.abs(d.x), 0.76, 0.46) * (1 - front * 0.25);
    x += 0.135 * sqK * gon * Math.sign(x || 1);
    z -= 0.045 * sqK * gon;
    const frontal = _bell(y, 0.62, 0.58) * _bell(ax, 0.60, 0.48) * front;
    z -= 0.078 * sqK * frontal;
    const wall = _bell(y, -0.10, 0.80) * _bell(Math.abs(d.x), 0.90, 0.34);
    x *= 1 - 0.062 * sqK * wall;
    // A SQUARE CHIN. The mental protuberance (step 8) is belled at 0.40 of the
    // half-width, which builds a narrow point; a heavy jaw carries the chin
    // across the front of the mandible instead.
    const chinSq = _bell(shear(y, -0.10), -1.02, 0.44) * _bell(ax, 0.0, 0.62) * front;
    z += 0.030 * sqK * chinSq;
    x += 0.055 * sqK * _bell(y, -1.02, 0.40) * _bell(ax, 0.42, 0.40) * Math.sign(x || 1);
  }

  out.set(x * wideAt(y), y, z);
  return out;
}

// EXPRESSION GEOMETRY (the HYBRID)
//
// v7 PRODUCER-NOTES round-2. Producer's ruling, 2026-07-31: expressions are
// texture swaps, and now that the skull is genuinely sculpted the two channels
// DISAGREE - painted angry brows sit on top of a neutral geometric brow ridge,
// so at any distance where the sculpt reads, the face is wearing an expression
// it is not making. Adopt the hybrid: keep the texture swaps AND add
// per-expression geometry deltas keyed to the same six expression names.
//
// The deltas ship as MORPH TARGETS on the face patch (relative, with normals),
// so a swap costs one influence write and the GPU does the rest - the texture
// swap and the morph fire from the same setExpression call and cannot drift
// apart. Combat tier only: the exploration camera never reads a brow ridge, and
// morph attributes are the one thing in this file with a real memory cost.
//
// Every band below is either laterally belled or sheared, so none of them can
// become a constant-Y ridge (see note 3 - that lesson is not re-learnable).
const EXPR_KEYS = ['angry', 'smug', 'worried', 'hurt', 'victory'];

// browPitch   + = inner end of the brow drives DOWN (anger), - = inner end lifts
// browRaise   + = whole brow ridge lifts
// browAsym    applies browRaise to ONE side only (smug's single raised brow)
// lid         + = upper lid drives down over the eye (hooding)
// mouthOpen   + = jaw drops, lower face lengthens
// mouthCorner + = corners lift (smile), - = corners fall
// cheekRaise  + = malar mass lifts (a real smile is a cheek, not a mouth)
// chinTense   + = mental protuberance knots (grit / hurt)
// noseFlare   + = alae widen
function exprGeo(name) {
  switch (name) {
    case 'angry':   return { browPitch: 1.00, browRaise: -0.55, lid: 0.10, mouthOpen: 0.20, mouthCorner: -0.55, cheekRaise: 0.15, chinTense: 0.35, noseFlare: 0.55 };
    case 'smug':    return { browPitch: -0.25, browRaise: 0.30, browAsym: 1, lid: 0.55, mouthOpen: 0.00, mouthCorner: 0.40, cheekRaise: 0.35, chinTense: 0.00, noseFlare: 0.00 };
    case 'worried': return { browPitch: -0.85, browRaise: 0.35, lid: -0.15, mouthOpen: 0.45, mouthCorner: -0.30, cheekRaise: -0.15, chinTense: 0.20, noseFlare: 0.10 };
    case 'hurt':    return { browPitch: 0.45, browRaise: -0.20, lid: 0.75, mouthOpen: 0.15, mouthCorner: -0.40, cheekRaise: 0.45, chinTense: 0.55, noseFlare: 0.30 };
    case 'victory': return { browPitch: -0.30, browRaise: 0.60, lid: -0.10, mouthOpen: 0.55, mouthCorner: 0.85, cheekRaise: 0.80, chinTense: 0.00, noseFlare: 0.20 };
    default:        return null;
  }
}

// Returns the (R-unit) offset this expression adds at one point of the already
// sculpted skull. `d` is the unit direction on the base sphere, so this reads
// exactly like sculptSkull and shares its landmark stack.
function sculptExprDelta(d, dial, p, out) {
  out.set(0, 0, 0);
  if (!p) return out;
  const y = d.y * (d.y >= 0 ? SKULL.UP : SKULL.DOWN);
  const ax = Math.abs(d.x);
  const front = Math.max(0, d.z);
  if (front < 0.05) return out;                 // nothing behind the ear line moves
  const sx = Math.sign(d.x || 1);
  const shear = (yy, slope) => yy + slope * ax;

  // BROW - the ridge PITCHES about its own midpoint, so the inner end can drive
  // down while the outer end lifts. That is the shape difference between anger
  // and worry, and it is the one the painted brows have always claimed.
  const browBand = _bell(shear(y, -0.13), LM.brow, 0.34) * _bell(ax, 0.30, 0.44);
  const inner = Math.max(0, 1 - ax / 0.44);
  const pitch = (p.browPitch || 0) * inner - (p.browPitch || 0) * (1 - inner) * 0.55;
  const asym = p.browAsym ? (sx > 0 ? 1 : 0.15) : 1;
  out.y += browBand * asym * (-pitch * 0.055 + (p.browRaise || 0) * 0.038);
  out.z += browBand * asym * (p.browPitch || 0) * inner * 0.020;

  // LID - the upper lid rolls DOWN and slightly forward over the globe.
  const lidBand = _bell(y, -0.13, 0.22) * _bell(ax, 0.40, 0.30);
  out.y -= lidBand * (p.lid || 0) * 0.052;
  out.z += lidBand * (p.lid || 0) * 0.026;

  // CHEEK - a real smile lifts the malar mass. It is the difference between a
  // smile and a curve drawn on a cheek.
  const malar = _bell(shear(y, -0.34), -0.34, 0.50) * _bell(ax, 0.60, 0.44);
  out.y += malar * (p.cheekRaise || 0) * 0.040;
  out.z += malar * (p.cheekRaise || 0) * 0.022;

  // NOSE - alae flare outward.
  const alae = _bell(y, LM_SUBNASAL + 0.04, 0.20) * _bell(ax, 0.16, 0.20);
  out.x += alae * (p.noseFlare || 0) * 0.030 * sx;

  // MOUTH - the whole lower face lengthens on an open mouth (a jaw, not a hole),
  // and the corners travel on their own band.
  const jaw = _sstep(-0.55, -1.25, y) * _bell(ax, 0.0, 0.86);
  out.y -= jaw * (p.mouthOpen || 0) * 0.075;
  out.z -= jaw * (p.mouthOpen || 0) * 0.016;
  const corner = _bell(shear(y, -0.10), LM.mouth, 0.26) * _bell(ax, 0.30, 0.26);
  out.y += corner * (p.mouthCorner || 0) * 0.050;
  out.z += corner * (p.mouthCorner || 0) * 0.014;

  // CHIN - the mental knot of a grit or a wince.
  const chinB = _bell(y, -1.08, 0.34) * _bell(ax, 0.0, 0.36);
  out.z += chinB * (p.chinTense || 0) * 0.026;
  out.y += chinB * (p.chinTense || 0) * 0.014;

  // Fade to nothing before the patch border, so the patch can never peel off the
  // skull at its rim however hard an expression is driven.
  const edge = Math.min(1, front / 0.30) * (1 - _sstep(0.70, 0.88, y)) * (1 - _sstep(-1.16, -1.34, y));
  // Global gain. The first pass measured a mean image delta of 0.21-0.50 on the
  // form pass - present, provable, and still too quiet to carry across an arena.
  // 1.7 lands the deltas where the sculpt reads at fight framing without ever
  // approaching the edge fade, which is what protects the patch rim.
  out.multiplyScalar(edge * 1.7);
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
// v7 FIX round-1 — the layout now CONSUMES the per-character dials. It used to
// take jawDial/chinDial and immediately `void` them, which is exactly why
// screenshots/v7/_summary-final.json was byte-identical for every human in the
// cast: hairlineF/browF/eyeF/noseF/mouthF/jawWF and every feature width were the
// same 17 numbers on karen, chad, grandma and the intern. The reference sheets
// draw three different face shapes; the model drew one skull in three wigs.
function faceLayout(dial = {}) {
  const jawDial = dial.jaw ?? 0.9, chinDial = dial.chin ?? 1.0, wide = dial.wide ?? 1;
  const eyeK = dial.eyeSize ?? 1, gapK = dial.eyeGap ?? 1, mouthK = dial.mouthWidth ?? 1;
  const hwEye = skullHalfW(LM.eye, wide);
  const hwNose = skullHalfW(LM.nose, wide);
  const hwMouth = skullHalfW(LM.mouth, wide);
  // The chin dial lengthens/shortens the lower face, so the mouth and chin
  // landmarks move with it; the jaw dial widens the gonion band.
  const chinY = LM.chinPt * (0.90 + chinDial * 0.10);
  const mouthY = LM.mouth * (0.94 + chinDial * 0.06);
  const browF = faceF(LM.brow), eyeF = faceF(LM.eye);
  const noseF = faceF(LM.nose), mouthF = faceF(mouthY), chinF = faceF(chinY);
  const coreTop = browF - 0.06, coreBot = chinF + 0.05;
  const maskCY = (coreTop + coreBot) * 0.5;
  const maskR0 = 0.30;
  const jawHW = skullHalfW(-0.60, wide) / jawProfile(-0.60)
    * (1 + (jawProfile(-0.60) - 1) * (1 + (1 - jawDial) * 4.5));
  return {
    hairlineF: faceF(LM.hairline),
    browF, eyeF, noseF, mouthF, chinF,
    // pupils at ±0.40R (gap = one eye-width), eye corner-to-corner 0.40R
    eyeDXF: faceU(0.40 * gapK, LM.eye, hwEye),
    eyeWF: (faceU(0.60 * eyeK, LM.eye, hwEye) - faceU(0.20 * eyeK, LM.eye, hwEye)) * 0.5,
    eyeHF: (faceF(-0.135 * eyeK) - faceF(0.135 * eyeK)) * 0.5,
    noseWF: faceU(0.17 * (dial.nose ?? 1), LM.nose, hwNose),
    mouthWF: faceU(0.34 * mouthK, mouthY, hwMouth),
    // vertical conformal correction for the lip pair: at the mouth row the
    // surface has pitched ~40° away from the lens, so a lip authored in tile
    // fractions rendered as a thin ribbon (r4: "the mouth is a brown line").
    mouthHF: (faceF(mouthY - 0.12) - faceF(mouthY + 0.12)) * 0.5,
    // v7 FIX round-2 — jawWF WAS A CONSTANT BY CONSTRUCTION. It read
    // `faceU(jawHW * 0.92, −0.60, jawHW)`, i.e. asin(0.92)/(2·PATCH_ARC) — the
    // jaw dial and the width dial both appear in the numerator AND the
    // denominator and cancel exactly, so it emitted 0.4867 for every character
    // in the cast no matter what. That is one of the identical numbers note [B]
    // cites as evidence of "ONE FACE TEMPLATE UNDER EVERY WIG", and on this one
    // field the evidence was an instrument bug rather than a sculpt failure.
    // It is now the gonion half-width measured in the EYE row's conformal frame,
    // which is a real per-character ratio. (Diagnostic only — the painter does
    // not consume it.)
    jawWF: faceU(jawHW, -0.60, skullHalfW(LM.eye, wide)),
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
    pts.push(new THREE.Vector2(d * 0.985, half * 0.42));
    pts.push(new THREE.Vector2(d, half * 0.60));          // deltoid crest
    pts.push(new THREE.Vector2(d * 0.965, half * 0.76));
    pts.push(new THREE.Vector2(d * 0.72 + rTop * 0.28, half * 0.90));
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

// ── HAND (v7 FIX round-1) ─────────────────────────────────────────────
// The approved form is art/char_refs/generated/_hands_reference.png: a MITTEN
// with a single thumb lobe and no separated fingers. Measured off that sheet the
// mitten is ≈1.5 long : 1 wide across the knuckles, ≈1.5× the cuff width, and
// clearly depth-tapered (a hand, not a paddle). This lofts wrist → knuckle crest
// → rounded tip in ONE surface (LAW 2).
//
// v7 PRODUCER-NOTES round-1 — THE CHIRALITY BUG (producer note 5, 2026-07-31:
// "Chad's LEFT HAND IS ON BACKWARDS — palm-up left thumb should be far-left").
// The bug was not the mirror (position.x and rotation.z were both flipped by
// `side`, so the pair WAS mirrored). The bug was the hand's ANATOMICAL FRAME.
//
// The mitten was built wide across X and thin across Z, which puts the palm
// facing ±Z — i.e. straight at the camera, a fully supinated hand — on a figure
// standing at rest. It then hung the thumb INBOARD, and an inboard thumb on a
// palm-forward hand is a hand from the other arm. Two further tells agreed: the
// knuckle crease (a DORSAL mark) was painted on +z, the same face the finger
// CURL bent toward, so the same surface was being called palm and back at once.
//
// A relaxed standing arm is mid-pronated: the palm faces MEDIALLY (at the
// thigh) and the thumb points ANTERIOR. So the hand is now built in that frame —
// knuckle width along the FRONT-BACK axis, palm-to-back thickness along the
// MEDIAL-LATERAL axis, thumb forward, crease on the dorsum, curl toward the
// palm. `side` still mirrors it, and now the mirror is of a correct hand.
//   `side` is −1 for the left arm, +1 for the right.
function buildHand(hl, ws, mat, side, detailed, probe = false) {
  const g = new THREE.Group();
  const sm = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
  const seg = detailed ? 26 : 16;
  const geo = new THREE.SphereGeometry(1, seg, Math.max(14, Math.round(seg * 0.82)));
  // LOCAL FRAME (before the side rotation below):
  //   +x = ANTERIOR (thumb side)      half-extent HW = knuckle crest
  //   +z = PALM                       half-extent HD = palm↔back thickness
  //   -y = distal (fingertips)
  const HW = hl * 0.33;       // knuckle crest half-width  → 1.5 : 1 with length
  const HD = hl * 0.185;      // half-depth (palm ↔ back)
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // v7 FIX round-2 — A BLUNT END (note [B] "HANDS ARE STILL PADDLES"). The
    // mitten is the approved form (_hands_reference.png row 1), but a sphere
    // tapers to a POINT at its pole, and a pointed mitten is a paddle. Y is
    // remapped so the outer 16% of the sphere's length is compressed into the
    // last 4.5% — the vertex that used to sit at 0.84 (radius 0.54) now lands at
    // 0.955, so the fingertip end is a rounded BLOCK, which is what the sheet
    // draws. The width profile is then solved against the new y, not the old.
    const a = Math.abs(v.y), sgn = v.y < 0 ? -1 : 1;
    const yb = sgn * (a < 0.84 ? a * (0.955 / 0.84) : 0.955 + (a - 0.84) * (0.045 / 0.16));
    const t = (1 - yb) * 0.5;                        // 0 = wrist pole, 1 = tip
    // necked wrist → knuckle crest at t≈0.38 → blunt fingertip block
    let w = 0.72 + 0.30 * sm(0.02, 0.38, t) - 0.16 * sm(0.62, 1.0, t);
    // KNUCKLE CREASE — a shallow groove across the BACK of the hand (−z, the
    // dorsum), which is the one mark that says "there are fingers under this"
    // without splitting them. It used to be cut on +z, the palm.
    w -= 0.035 * Math.exp(-(((t - 0.44) / 0.055) ** 2)) * Math.max(0, -v.z);
    // a relaxed hand curls toward its own PALM (+z) from the knuckles down
    const curl = 0.30 * sm(0.42, 1.0, t);
    pos.setXYZ(i, v.x * w * HW, yb * hl * 0.5, v.z * w * HD + curl * HD);
  }
  geo.computeVertexNormals();
  const palm = new THREE.Mesh(geo, mat);
  if (probe) { palm.userData.pnId = 'palm'; palm.userData.noMerge = true; }
  g.add(palm);

  // THUMB — v7 FIX round-2: bigger (0.145 → 0.170 of hand length in radius, 0.24
  // → 0.30 long) and seated with a real NOTCH between it and the palm, because
  // at the old scale it merged into the palm as a bump and the note read "no
  // thumb". A mitten's thumb is the whole reason it is not a paddle.
  const tSeg = detailed ? 16 : 10;
  const tGeo = new THREE.SphereGeometry(1, tSeg, Math.max(8, Math.round(tSeg * 0.8)));
  const tp = tGeo.attributes.position;
  for (let i = 0; i < tp.count; i++) {
    v.fromBufferAttribute(tp, i);
    const t = (1 - v.y) * 0.5;
    const w = 0.92 - 0.20 * sm(0.55, 1.0, t);
    tp.setXYZ(i, v.x * w * hl * 0.170, v.y * hl * 0.30, v.z * w * hl * 0.160);
  }
  tGeo.computeVertexNormals();
  const thumb = new THREE.Mesh(tGeo, mat);
  // ANTERIOR (+x in the local frame) and a little to the palm side, angled up
  // and across the way a thenar eminence sits. Identical on both hands in local
  // space — the mirror is done once, by the frame rotation below.
  // MEASURED FIX (pn harness, --only=hands, round-1): with a side-independent
  // thumb the frame rotation below sent local +x to world +z on the RIGHT arm
  // and to world −z on the LEFT — thumbDZ came back +0.030 / −0.029, a pair
  // that is ROTATED 180 degrees rather than mirrored. That is precisely "the
  // left hand is on backwards". `side` on the x offset lands the thumb ANTERIOR
  // on both arms; `side` on rotation.z keeps the splay mirrored with it
  // (rotation.x is about the local x axis, which the frame rotation already
  // maps to opposite world axes, so it mirrors on its own).
  thumb.position.set(side * HW * 0.86, hl * 0.12, HD * 0.42);
  thumb.rotation.set(-0.34, 0, -side * 0.72);
  if (probe) { thumb.userData.pnId = 'thumb'; thumb.userData.noMerge = true; }
  g.add(thumb);
  // Rotate the whole hand into the arm's frame: local +z (palm) must point
  // MEDIALLY, i.e. to world −side·x. Rotation about Y by θ sends +z to
  // (sinθ, 0, cosθ), so θ = −side·π/2. The thumb therefore lands ANTERIOR on
  // both arms, and the pair is a true mirror.
  g.rotation.y = -side * Math.PI * 0.5;
  return g;
}

// ── SHOE (v7 FIX round-2) ─────────────────────────────────────────────
// Note [B] FEET: "every hero terminates in a black discus lens that pierces the
// trouser/skirt column sideways … karen-final1-prof shows the shoe as a
// symmetric UFO with equal toe and heel overhang; karen-final1-q34 shows
// 90-degree duck-splayed peanut shoes with trouser hems continuing BELOW the
// shoe tops into stump bottoms; grandma-final1-prof runs the lens straight
// through the skirt."
//
// Both halves of that were literally true in the code. The shoe was
// `SphereGeometry(0.058) scaled (0.92, 0.62, 2.0)` — a symmetric ellipsoid, so
// heel overhang == toe overhang by construction — and the shin lathe kept its
// default rounded bottom cap, whose pole sat 0.044·ws BELOW the sole plane, so
// the trouser genuinely did emerge underneath the shoe as a stump.
//
// This builds a FOOT: rows swept along z from a narrow heel through a tall
// ankle collar to a low tapered toe, each row a superellipse sitting on a flat
// sole. Asymmetric by construction (heel −0.070, toe +0.148), and the trouser
// now terminates above the collar (see the leg loop).
//   `heel` raises the rear of the sole and drops a block under it — a pump.
//
// v7 FIX round-4 — "SHOES READ AS DISCS" (round-3 critic, survived the round-2
// foot). Measured on renders, the round-2 foot was a single monolithic shell:
//   · footprint aspect (top-down) 2.02  — a lozenge; a real shoe is 2.6–2.9
//   · toe cap half-width 0.007 of a 0.054 max — a knife point, so from the game
//     iso the outline read as a symmetric almond, i.e. a disc
//   · ZERO sole: one colour, one shell, no horizontal break anywhere, so nothing
//     in the silhouette said "footwear" rather than "dark blob under a trouser"
// The rebuild is three parts, and the SOLE is the one that does the work:
//   1. UPPER — longer (0.250 vs 0.218) and narrower (0.098 vs 0.108), with a
//      TALL heel counter at the back, an instep crest, and a BLUNT toe cap
//      (0.021 half-width, not a point).
//   2. SOLE — a real slab under it, WELTED (8.5% wider than the upper at every
//      station) in a contrasting value, so a hard horizontal line runs all the
//      way round the foot at every camera angle. That line is what a viewer
//      reads as a shoe.
//   3. HEEL BLOCK — pumps get a tapered block under the rear of the sole with
//      the arch lifted clear of the floor between it and the ball.
function buildShoe(ws, mat, detailed, opts = {}) {
  const S = (opts.size ?? 1) * ws;
  const heel = (opts.heel ?? 0) * ws;
  // [z, halfWidth, topY] — all in ws units before `size`. y is measured from the
  // TOP OF THE SOLE, so the upper always sits on the slab.
  const ROWS = [
    [-0.078, 0.024, 0.044],   // heel, rounded off
    [-0.062, 0.037, 0.078],   // heel counter — the back of a shoe is TALL
    [-0.040, 0.049, 0.090],   // ankle collar: peak, plugs the trouser
    [-0.012, 0.048, 0.076],   // instep
    [0.020, 0.047, 0.057],    // vamp
    [0.058, 0.046, 0.044],
    [0.098, 0.042, 0.036],
    [0.135, 0.034, 0.029],    // toe box
    [0.162, 0.021, 0.020],    // BLUNT toe cap (was a 0.007 knife point)
    [0.172, 0.009, 0.011],
  ];
  const SOLE_H = 0.018;                           // slab thickness (ws units)
  const WELT = 1.085;                             // sole overhang → the lip line
  const SEG = detailed ? 22 : 14;
  const P = 3.0;                                  // superellipse exponent
  // The arch: heeled builds lift the sole's underside behind the ball of the
  // foot, so a real gap opens under the instep instead of a flat plank.
  const lift = (z) => heel * (1 - _sstep(-0.055, 0.028, z));
  const sh = (u) => Math.pow(Math.max(0, 1 - Math.pow(u, P)), 1 / P);

  const group = new THREE.Group();
  const soleTop = SOLE_H * S;

  // ── 1 · UPPER ───────────────────────────────────────────────────────
  {
    const pos = [], idx = [];
    for (let i = 0; i < ROWS.length; i++) {
      const [z0, hw0, top0] = ROWS[i];
      const z = z0 * S, hw = hw0 * S, top = top0 * S, y0 = lift(z0) + soleTop;
      for (let j = 0; j <= SEG; j++) {
        const a = (j / SEG) * Math.PI * 2;
        const cxx = Math.cos(a), syy = Math.sin(a);
        const shell = sh(Math.abs(cxx));
        const yy = syy >= 0 ? top * shell * Math.abs(syy) ** 0.35 : -0.006 * S * shell;
        pos.push(cxx * hw, y0 + yy, z);
      }
    }
    for (let i = 0; i < ROWS.length - 1; i++) {
      for (let j = 0; j < SEG; j++) {
        const a = i * (SEG + 1) + j, b = a + 1, c = a + SEG + 1, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    for (const [row, flip] of [[0, true], [ROWS.length - 1, false]]) {
      const base = row * (SEG + 1);
      const cIdx = pos.length / 3;
      const [z0, , top0] = ROWS[row];
      pos.push(0, lift(z0) + soleTop + top0 * S * 0.35, z0 * S);
      for (let j = 0; j < SEG; j++) {
        if (flip) idx.push(cIdx, base + j + 1, base + j);
        else idx.push(cIdx, base + j, base + j + 1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, mat);
    if (opts.probe) { mesh.userData.pnId = 'shoe'; mesh.userData.noMerge = true; }
    group.add(mesh);
  }

  // ── 2 · SOLE ────────────────────────────────────────────────────────
  // Three vertical stations per row (underside / welt edge / top) so the slab
  // has a bevelled edge that catches its own highlight. The footprint runs a
  // hair past the upper at heel and toe as well as sideways.
  {
    const soleMat = opts.soleMat || mat;
    const STA = [[0.00, 0.945], [0.55, 1.000], [1.00, 0.975]];
    const pos = [], idx = [];
    const zEx = 0.008 * S;
    const M = ROWS.length;
    const zOf = (i) => ROWS[i][0] * S + (i === 0 ? -zEx : i === M - 1 ? zEx : 0);
    // the toe/heel rows narrow to a point on the upper; a SOLE does not, so it
    // keeps a real footprint there — that is what stops the plan view reading
    // as an almond.
    const wOf = (i) => Math.max(ROWS[i][1], 0.015) * WELT * S;
    // plan outline: right chain heel→toe, then left chain toe→heel
    const outline = [];
    for (let i = 0; i < M; i++) outline.push([wOf(i), zOf(i), ROWS[i][0]]);
    for (let i = M - 1; i >= 0; i--) outline.push([-wOf(i), zOf(i), ROWS[i][0]]);
    const N = outline.length;
    for (const [t, wm] of STA) {
      for (const [x, z, z0] of outline) pos.push(x * wm, lift(z0) + t * soleTop, z);
    }
    for (let k = 0; k < STA.length - 1; k++) {
      for (let j = 0; j < N; j++) {
        const j2 = (j + 1) % N;
        const a = k * N + j, b = k * N + j2, c = (k + 1) * N + j, d = (k + 1) * N + j2;
        idx.push(a, c, b, b, c, d);
      }
    }
    for (const [k, top] of [[0, false], [STA.length - 1, true]]) {
      const base = k * N;
      for (let i = 0; i < M - 1; i++) {
        const r0 = base + i, r1 = base + i + 1;
        const l0 = base + (2 * M - 1 - i), l1 = base + (2 * M - 2 - i);
        if (top) { idx.push(r0, l1, r1, r0, l0, l1); }
        else { idx.push(r0, r1, l1, r0, l1, l0); }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, soleMat);
    if (opts.probe) { mesh.userData.pnId = 'sole'; mesh.userData.noMerge = true; }
    group.add(mesh);
  }

  // ── 3 · HEEL BLOCK (pumps) ──────────────────────────────────────────
  if (heel > 0) {
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.019 * S, 0.030 * S, heel + soleTop * 0.5, 14),
      opts.soleMat || mat);
    hb.position.set(0, (heel + soleTop * 0.5) * 0.5, -0.052 * S);
    hb.scale.set(1.15, 1, 1.5);
    group.add(hb);
  }
  return group;
}

// ── CAP BILL (v7 round-4) ─────────────────────────────────────────────
// A curled visor, built in head-local units of the head radius. Origin is the
// cap's own centre, so the caller positions it with (CAP_Y, CAP_Z).
//   · leaves the shell at the cap rim (0.50R up, 1.10R back) and pitches
//     down-and-back, so worn BACKWARDS it sits over the nape,
//   · the side edges CURL down, deepening toward the tip — this is the whole
//     point: it is what puts area in the profile silhouette,
//   · real thickness (0.060R → 0.034R), so the underside catches its own shade.
function buildCapBill(r, matTop, matUnder) {
  const NU = 14, NV = 10;
  const ROOT_Y = 0.50, ROOT_Z = -1.10, PITCH = 0.26, LEN = 0.80;
  const W0 = 0.78, W1 = 0.60, CURL0 = 0.03, CURL1 = 0.32, T0 = 0.070, T1 = 0.040;
  const pos = [], idxTop = [], idxUnder = [];
  const LOOP = NV * 2;                              // closed loop per station
  const station = (u) => {
    const zA = ROOT_Z - LEN * u * Math.cos(PITCH);
    const yA = ROOT_Y - LEN * u * Math.sin(PITCH);
    const round = u > 0.86 ? Math.sqrt(Math.max(0, 1 - ((u - 0.86) / 0.14) ** 2)) : 1;
    const hw = (W0 + (W1 - W0) * u) * round;
    const curl = CURL0 + (CURL1 - CURL0) * u;
    const t = T0 + (T1 - T0) * u;
    const pt = (v, sign) => [v * hw * r, (yA - curl * v * v + sign * t * 0.5) * r, zA * r];
    const loop = [];
    for (let j = 0; j <= NV; j++) loop.push(pt(-1 + 2 * (j / NV), 1));       // top edge
    for (let j = NV - 1; j >= 1; j--) loop.push(pt(-1 + 2 * (j / NV), -1));  // underside
    return loop;
  };
  for (let i = 0; i <= NU; i++) for (const p of station(i / NU)) pos.push(p[0], p[1], p[2]);
  // Faces j < NV are the TOP of the visor; the rest are the UNDERSIDE plus both
  // side rims. Splitting them gives the bill a darker undervisor and a dark
  // brim edge — the two cues that make a cap read as a cap and not as a fin.
  for (let i = 0; i < NU; i++) {
    for (let j = 0; j < LOOP; j++) {
      const j2 = (j + 1) % LOOP;
      const a = i * LOOP + j, b = i * LOOP + j2, c = (i + 1) * LOOP + j, d = (i + 1) * LOOP + j2;
      (j < NV ? idxTop : idxUnder).push(a, c, b, b, c, d);
    }
  }
  for (const [i, flip] of [[0, true], [NU, false]]) {
    const base = i * LOOP;
    const cIdx = pos.length / 3;
    let sx = 0, sy = 0, sz = 0;
    for (let j = 0; j < LOOP; j++) { sx += pos[(base + j) * 3]; sy += pos[(base + j) * 3 + 1]; sz += pos[(base + j) * 3 + 2]; }
    pos.push(sx / LOOP, sy / LOOP, sz / LOOP);
    for (let j = 0; j < LOOP; j++) {
      const j2 = (j + 1) % LOOP;
      if (flip) idxUnder.push(cIdx, base + j2, base + j);
      else idxUnder.push(cIdx, base + j, base + j2);
    }
  }
  const grp = new THREE.Group();
  for (const [ix, mm] of [[idxTop, matTop], [idxUnder, matUnder || matTop]]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos.slice(), 3));
    g.setIndex(ix);
    g.computeVertexNormals();
    grp.add(new THREE.Mesh(g, mm));
  }
  return grp;
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
  // Every dial the sculpt understands must be listed here AND in makeFacePatch.
  // (`square` was added in round-2 and silently did nothing for a build because
  // both of these rebuild the dial object with explicit keys rather than
  // forwarding it — worth remembering the next time a dial "has no effect".)
  const dial = {
    jaw: opts.jaw ?? 0.9, chin: opts.chin ?? 1.0, nose: opts.nose ?? 1,
    wide: opts.wide ?? 1, cheek: opts.cheek ?? 1, browRidge: opts.browRidge ?? 1,
    square: opts.square ?? 1,
  };
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
      sculptSkull(d, {
        jaw: dial.jaw, chin: dial.chin, nose: dial.nose ?? 1,
        wide: dial.wide ?? 1, cheek: dial.cheek ?? 1, browRidge: dial.browRidge ?? 1,
        square: dial.square ?? 1,
      }, o);
      pos.setXYZ(i, o.x * rad * PATCH_PROUD, o.y * rad * PATCH_PROUD, o.z * rad * PATCH_PROUD);
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
  // EXPRESSION MORPHS - the hybrid's geometry channel. Combat tier only.
  // Deltas are RELATIVE and normals ship with them, because a brow ridge that
  // moves without its normal moving does not read as a brow.
  let morphIndex = null;
  if (detailed) {
    const basePos = geo.attributes.position;
    const baseNrm = geo.attributes.normal;
    const n = basePos.count;
    const d2 = new THREE.Vector3(), e2 = new THREE.Vector3();
    const src = new THREE.SphereGeometry(1, seg, seg,
      Math.PI * 0.5 - PATCH_ARC, PATCH_ARC * 2, PATCH_THETA_START, PATCH_THETA_LEN);
    const sp = src.attributes.position;
    geo.morphTargetsRelative = true;
    geo.morphAttributes.position = [];
    geo.morphAttributes.normal = [];
    morphIndex = {};
    const tmp = new THREE.BufferGeometry();
    tmp.setIndex(geo.index);
    for (const name of EXPR_KEYS) {
      const p = exprGeo(name);
      const dp = new Float32Array(n * 3);
      const absolute = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        d2.fromBufferAttribute(sp, i).normalize();
        sculptExprDelta(d2, dial, p, e2);
        const dx = e2.x * rad * PATCH_PROUD, dy = e2.y * rad * PATCH_PROUD, dz = e2.z * rad * PATCH_PROUD;
        dp[i * 3] = dx; dp[i * 3 + 1] = dy; dp[i * 3 + 2] = dz;
        absolute[i * 3] = basePos.getX(i) + dx;
        absolute[i * 3 + 1] = basePos.getY(i) + dy;
        absolute[i * 3 + 2] = basePos.getZ(i) + dz;
      }
      tmp.setAttribute('position', new THREE.BufferAttribute(absolute, 3));
      tmp.computeVertexNormals();
      const mn = tmp.attributes.normal;
      const dn = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        dn[i * 3] = mn.getX(i) - baseNrm.getX(i);
        dn[i * 3 + 1] = mn.getY(i) - baseNrm.getY(i);
        dn[i * 3 + 2] = mn.getZ(i) - baseNrm.getZ(i);
      }
      morphIndex[name] = geo.morphAttributes.position.length;
      geo.morphAttributes.position.push(new THREE.BufferAttribute(dp, 3));
      geo.morphAttributes.normal.push(new THREE.BufferAttribute(dn, 3));
    }
    tmp.dispose();
    src.dispose();
  }

  const mat = M.skin(0xffffff, faceTex);
  mat.transparent = true;
  mat.depthWrite = true;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1;
  mat.polygonOffsetUnits = -1;
  const mesh = new THREE.Mesh(geo, mat);
  if (morphIndex) {
    mesh.userData.faceMorphIndex = morphIndex;
    mesh.morphTargetInfluences = new Array(EXPR_KEYS.length).fill(0);
  }
  return mesh;
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
  // v7 FIX round-1 — THE ROWS ARE NOW THE TORSO'S OWN ROWS. They were fixed
  // fractions of shoulderR (0.72 / 0.82 / 0.86) at heights where buildTorso's
  // lathe is at 0.85 / 0.965 / 0.998 of shoulderR — so every row below the
  // collar was 15–25% INSIDE the jacket. Only the topmost ring ever cleared the
  // cloth, which is exactly the critic's read: "a grey ring collar" on Karen and
  // "a collarless crew tube" on the Intern, with no blouse and no V anywhere.
  // Sampling buildTorso's profile at 2% proud puts the neckline ON the garment.
  const dS = shoulderR - chestR;
  const rows = [
    [Math.max(shoulderR * 0.60, neckR * 1.04), torsoH * 0.995],
    [shoulderR * 0.85, torsoH * 0.952],
    [shoulderR * 0.965, torsoH * 0.905],
    [shoulderR * 0.998, torsoH * 0.855],
    [chestR + dS * 0.76, torsoH * 0.795],
    [chestR + dS * 0.44, torsoH * 0.735],
    [chestR + dS * 0.16, torsoH * 0.660],
  ];
  const SEG = 22;
  const pos = [], idx = [];
  for (let i = 0; i < rows.length; i++) {
    const t = i / (rows.length - 1);
    // v6 round-5 — the arc taper was 0.92 of a NARROW top arc, so the shell shrank
    // to a small isolated wedge that read as "a pale paper triangle taped to the
    // sternum", visually detached from the collar band above it. The top row now
    // spans the same front arc the collar does (they meet as one garment) and the
    // taper carries it to a real V point at the sternum.
    // The V runs collar → sternum and closes to a point, so the JACKET edges on
    // either side of it are what read as lapels. LAW 2 bans lapel plates; the
    // shell's own relief (surfaceTopology `lapels`) plus this opening is the
    // legal way to draw a suit front.
    const arc = arcTop * (1 - t * 0.88) + 0.04;
    // 1.048 clears the lapel roll (which stands the torso 3% proud at φ≈0.34);
    // at 1.020 the roll punched through the blouse and the neckline rendered as
    // two cream horns with a pink strip up the middle.
    // v7 FIX round-4 — 1.048 was still being punched through by the lapel roll on
    // the female builds: Karen's neckline rendered with two PINK PRONGS cutting
    // down into the cream from the collar (measured on karen-r4c-garmentF). The
    // roll stands the torso ~3.5% proud at φ≈0.34, so the blouse needs more than
    // 4.8% of clearance to stay one continuous garment.
    const rr = rows[i][0] * 1.075, yy = rows[i][1];
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
      // v7 FIX round-1 — LAPELS AS RELIEF (producer amendment 4 + LAW 2, which
      // permits tailoring "as low relief (≤0.008 proud) or a paint pass" and
      // bans plate geometry). The critics logged "no lapels anywhere" on Karen
      // and the Intern, and the intern's ref sheet is a suit that is ALL lapel.
      // Two shallow ridges run from the yoke down to a centre break at the
      // sternum, with the placket sunk between them. Peak is 0.022 × chestR
      // ≈ 0.0035 proud — well inside the law, and it survives the mip chain
      // because it is a shading gradient, not an edge.
      // v7 FIX round-2 — the roll was 0.030 of the local radius ≈ 0.0042 absolute
      // at Karen's chestR: a shading whisper the mip chain ate, which is why the
      // note still logs "renders as a crew-neck tunic … no lapel geometry". The
      // roll goes to 0.055 (≈0.0077 at chestR 0.139 — at, not over, LAW 2's
      // ≤0.008 proud cap) and the FOLD EDGE outboard of it is deepened to 0.026,
      // because what the eye actually reads as a lapel is the crease where the
      // facing turns back, not the swell. Still one shell; still no plate.
      if (opts.lapels) {
        const run = step(0.26, 0.58, t) * (1 - step(0.88, 1.0, t));
        k += 0.055 * bell(aphi, 0.34, 0.28) * run;              // lapel roll
        k -= 0.030 * bell(aphi, 0.0, 0.16) * run;               // centre break
        k -= 0.026 * bell(aphi, 0.66, 0.13) * run;              // the FOLD edge
        k += 0.014 * bell(aphi, 0.84, 0.24) * step(0.55, 0.90, t);
        // the jacket's own front edge below the button — the closure line
        k -= 0.018 * bell(aphi, 0.0, 0.13) * step(0.30, 0.16, t);
      }
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

function buildTorso(dims, mat, detailed = false, hem = 0, female = false, lapels = false) {
  const { hipR, chestR, shoulderR, torsoH } = dims;
  // v7 FIX round-4 — THE WAIST (round-3 critic: "Karen's blazer still reads
  // tunic-ish at fight distance — the hem/waist relationship"). Measured off the
  // shell's own silhouette with the arms masked off, her jacket narrowed just
  // **9%** between chest and waist (0.909) against Andrew's tailored 0.805: a
  // straight tube ending below the hip is a tunic by definition, whatever colour
  // it is. A STRUCTURED blazer (the bible's word for her) is suppressed at the
  // waist and released over the hip, and that is what the eye reads as tailoring
  // at fight distance — before it can see a lapel, a button or a seam.
  const tailored = hem > 0 && lapels;
  const waistR = dims.waistR * (tailored ? (female ? 0.90 : 0.95) : 1);
  const V2 = (x, y) => new THREE.Vector2(x, y);
  const pts = [];
  if (hem > 0) {
    // The hem has to stay proud of the TROUSER at the height it lands on, or the
    // thigh punches through it; the trouser taper is 0.074→0.052 over the thigh,
    // so a higher hem needs a wider block.
    const hw = hipR * 1.12;
    // …and it is a HEM, not a dome: a flat underside meeting a near-vertical
    // edge, so the silhouette turns a corner instead of rolling under.
    pts.push(V2(0.001, -hem - 0.005));
    pts.push(V2(hw * 0.72, -hem - 0.004));
    pts.push(V2(hw * 0.995, -hem - 0.002));
    pts.push(V2(hw, -hem + 0.006));
    pts.push(V2(hw * 0.988, -hem * 0.45));
    pts.push(V2(hipR * 1.03, 0.02));
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
  surfaceTopology(geo, { kind: 'torso', female, lapels, t: (y) => y / torsoH });
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
  // EAR RELIEF (v7 round-4). Making the pinna proud of the skull is only half a
  // rendered ear: on every short cut in the cast the hair mass reaches z +0.62r
  // at the ear line, i.e. it covers the ear completely, and a proud ear then
  // pokes through it as a pale bead. The hair is therefore PARTED around the
  // pinna — pulled in to 0.90r inside a soft (y,z) window centred on the ear —
  // so the hair tucks behind it the way hair does on a head.
  const eY = (-0.20 * r) / sy, eZ = -0.20 * r;
  const bellE = (t, w) => { const d = Math.abs(t) / w; return d >= 1 ? 0 : Math.cos(d * Math.PI * 0.5) ** 2; };
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (v.y < yEar) {
      const t = Math.min(1, (yEar - v.y) / (yEar - yJaw));
      const zMax = r * (0.62 - 0.74 * t * t * (3 - 2 * t));
      if (v.z > zMax) v.z = zMax + (v.z - zMax) * 0.12;
    }
    if (v.y < yFloor) v.y = yFloor + (v.y - yFloor) * 0.14;
    const k = bellE(v.y - eY, (0.44 * r) / sy) * bellE(v.z - eZ, 0.36 * r);
    if (k > 0.02) {
      const cap = r * (1.22 - 0.32 * k);
      const ax2 = Math.abs(v.x);
      if (ax2 > cap) v.x = Math.sign(v.x) * (cap + (ax2 - cap) * 0.10);
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
}

function buildHair(head, r, mat, style, streakMat = null, underMat = null, probe = false) {
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
  // v7 FIX round-2 — THE RIM IS NOW A CONTOUR, NOT A LATITUDE (note [A] "hair
  // shells have holes … karen-final1-prof shows a large tan bald patch on the
  // occiput; grandma/intern-final1-headp show raw shell edges with skin above
  // the nape hairline"; Producer Amendment 1 asks for verification from 3/4 AND
  // side, and the side view failed on 3 of 4 heroes).
  //
  // The cause: `thetaLen` is a single latitude, and every style passed ~1.5 rad
  // — cos(1.5) = +0.07, i.e. the shell stopped AT THE EQUATOR all the way round.
  // Below that the only coverage was one `backMass` sphere of half-width 0.755r
  // sitting at z = −0.44r, which reaches neither the sides (|x| up to 0.9r) nor
  // the nape. Everything in between was bare skull, and it rendered as a bald
  // patch with a hard polygon edge above it.
  //
  // A real hairline is a CONTOUR: highest at the forehead, dropping past the ear
  // at the temple, lowest at the nape. The cap is therefore built to a generous
  // 2.30 rad and each vertex is clamped up to a per-azimuth rim — the caller's
  // thetaLen at the front, +0.30 rad at the sides, 2.26 rad (y ≈ −0.64r) at the
  // back. 8% of the overshoot is carried through so the rim is a soft roll, not
  // a cut. The front hairline lift below is unchanged and still owns the face.
  function scalpCap(thetaLen, grow = 1.03, hairlineY = 0.36, seg = 44, sweep = 0, partX = 0) {
    const NAPE_THETA = 2.26;
    const buildTheta = Math.max(thetaLen, NAPE_THETA + 0.04);
    const geo = new THREE.SphereGeometry(1, seg, Math.max(34, Math.round(seg * 0.92)), 0, Math.PI * 2, 0, buildTheta);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      let theta = Math.acos(Math.max(-1, Math.min(1, v.y)));
      const phi = Math.atan2(v.x, v.z);              // 0 = front, ±π = occiput
      const ab = Math.abs(phi);
      const back = _sstep(0.90, 2.50, ab);
      const rimTheta = Math.min(buildTheta,
        thetaLen + (NAPE_THETA - thetaLen) * back + 0.30 * (1 - back) * _sstep(0.35, 1.45, ab));
      if (theta > rimTheta) {
        const over = theta - rimTheta;
        theta = rimTheta + over * 0.08;              // soft roll, never a cut edge
        const st = Math.sin(theta);
        v.set(st * Math.sin(phi), Math.cos(theta), st * Math.cos(phi));
      }
      // v7 — THE RIM TAPERS TO ZERO THICKNESS. A cap held a uniform `grow` proud
      // of the scalp ends in a 2–3% ledge all the way round, which is the hard
      // "helmet edge / bowl cut" line every round has read. The proud offset now
      // eases out over the last fifth of the cap, so hair thins INTO the scalp.
      // v7 FIX round-2 — measured against the LOCAL rim (see rimTheta above), not
      // the caller's single latitude; otherwise the whole occiput extension would
      // sit past 1.0 and taper to zero thickness the moment it appeared.
      const rim = Math.min(1, Math.max(0, (theta / rimTheta - 0.76) / 0.24));
      // v7 FIX round-2b — THE TAPER USED TO REACH EXACTLY 1.0, i.e. the cap's
      // last quarter sat ON the skull surface with zero clearance. That is a
      // coincident-surface z-fight, and the SCULPT wins it wherever the malar or
      // temple terms push the skull out by more than a float epsilon: measured on
      // chad-Z-headp the hair vanished below y ≈ +0.28R and the whole side of his
      // head rendered bald under the cap. The taper now bottoms out at 22% of the
      // grow (≈0.66% proud at grow 1.03) — still no visible helmet ledge, but
      // never coincident.
      let g = 1 + (grow - 1) * (0.22 + 0.78 * (1 - rim * rim * (3 - 2 * rim)));
      // conform to the skull's own front/back depth
      v.z *= (v.z > 0 ? SKULL.FRONT : SKULL.BACK);
      v.multiplyScalar(r);
      // front hairline lift: raise front-of-head verts up to the hairline arc so
      // the forehead stays open. The lateral term is a flat-topped falloff (v6's
      // squared term lifted only the centre and left a bald triangle pointing up
      // the middle of the forehead — andrew r1/r2).
      if (v.z > 0 && v.y < hairlineY * r) {
        const front = Math.min(1, v.z / (r * 0.5));
        // v7 FIX round-1 — THE WIG LINE. The lateral term was a FLAT-TOP: full
        // lift for every |x| < 0.34r, so the cap's front rim was a dead-straight
        // horizontal line ruled across the forehead on every character ("a
        // straight wig-line across the forehead", karen-final-head). It is now a
        // soft arch — least lift on the centre line, most just inboard of the
        // temples, easing to zero at the ear plane — which is the shape of a
        // human hairline. `partX` slides the arch off centre so a side-parted
        // style (Karen's bob) gets an asymmetric hairline instead of a
        // symmetrical helmet rim.
        // MOST lift on the centre line, easing down toward the temples and out
        // to zero at the ear plane: a hairline is highest at the middle of the
        // forehead and recedes at the temples. (The first pass had this the other
        // way up and drew a widow's peak on the whole cast — intern fx7.)
        const u = Math.abs(v.x - partX * r) / r;
        const arch = 1.0 - 0.16 * Math.min(1, u / 0.60);
        const lateral = arch * Math.max(0, 1 - Math.max(0, (u - 0.44) / 0.62) ** 2);
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
    // v7 FIX round-1 — KAREN SAME-PERSON FAIL. Against karen_body_v2.png the v7
    // bob failed on four counts, all logged by both critics: a straight wig-line
    // across the forehead (fixed in scalpCap's hairline arch, driven off centre
    // here by partX so the SIDE PART reads); "symmetric detached earmuff shells"
    // at the ears (the curtains sat at ±0.94r with a 0.42 x-scale — isolated
    // lobes with a visible gap to the cap, and they pushed the hair-inclusive
    // head silhouette to 1.16r half-width, which is the football-head risk
    // re-entering through the HAIR); "a hard polygon seam across the crown" (the
    // sweep's rim, now sunk and laid along the skull); and a platinum underlayer
    // that never reads because it was parked at the NAPE while both the sheet and
    // the portrait lead with the pale streak on the long side.
    // v7 FIX round-2 — the cap's own hairline arch and fringe volume now carry
    // the front (the rim contour reaches the nape on its own), so the separate
    // sweep mass below only has to say "side part", not "cover the occiput".
    scalpCap(1.42, 1.028, 0.60, 48, 0.11, -0.24);
    // THE LONG SWEEP — one flat plane of hair crossing the part and riding down
    // over the outer half of one brow. Flat so it reads as hair lying on the
    // skull, not a second cranium; seated lower and rotated less than v7 so its
    // rim is buried in the cap instead of ruling a line across the crown.
    // v7 FIX round-2b — on the hardware capture (screenshots/v7/karen-HW-f.png)
    // the sweep's leading corner cleared the cap over the left temple and read as
    // a discrete tan LUMP on the forehead rather than a lock of hair. Flatter,
    // shallower and seated higher, so it dips to ~0.65R (the hairline is 0.81R):
    // a lock across the brow line, not a horn.
    // v7 FIX round-4 — the sweep's leading corner was still clearing the cap over
    // the left temple and rendering as a discrete pale LUMP on the forehead (the
    // critic's "detached pale blob at her temple"). Seated higher and pulled back
    // onto the crown, where a side-parted sweep actually lies.
    const sweep = new THREE.Mesh(new THREE.SphereGeometry(r * 0.70, 30, 22), mat);
    sweep.scale.set(1.00, 0.20, 0.70);
    sweep.rotation.set(0.12, 0.20, 0.10);
    sweep.position.set(-r * 0.20, r * 0.62, r * 0.12);
    add(sweep);
    // v7 FIX round-2 — THE ASYMMETRIC BOB IS NOW ASYMMETRIC IN DEPTH, and the
    // ear is uncovered on the tucked side. Both curtains used to sit at
    // z = −0.14r with a 1.14 depth scale, so each one reached z = +0.50r — a
    // quarter of a head FORWARD of the ear (whose front face is at −0.02r). The
    // ear was buried on both sides on every build in the cast, which is why the
    // profiles read "no ear anywhere, the earring floats on the hair", and why
    // the note logged "a white sideburn plate" at jaw level (Amendment 1).
    //   long side (−1): stays forward and low — this is the sweep the sheet
    //                   leads with, and it carries the PALE STREAK as its own
    //                   material instead of a separate slab standing proud of it.
    //   tucked side (+1): pulled behind the ear plane entirely (z = −0.46r), so
    //                   the ear, the lobe and the pearl stud all read.
    for (const side2 of [-1, 1]) {
      const long = side2 < 0;
      const curtain = new THREE.Mesh(new THREE.SphereGeometry(r * 0.54, 24, 20), mat);
      curtain.scale.set(0.30, long ? 1.02 : 0.94, long ? 0.86 : 0.80);
      curtain.position.set(side2 * r * 0.84, -r * (long ? 0.22 : 0.06), -r * (long ? 0.16 : 0.46));
      curtain.rotation.z = side2 * -0.12;
      add(curtain);
    }
    // THE PALE STREAK — a LOCK, not a plate. Giving the whole long curtain the
    // streak material (first attempt this round) turned the entire left side of
    // her head white against a tan crown: a two-tone helmet, not the portrait's
    // platinum highlight. It is now a narrow lock lying on the FRONT edge of the
    // long side, running temple → cheekbone, which is where karen_body_v2.png
    // puts it. Seated above the jaw band so Amendment 1 is untouched.
    // v7 FIX round-4 — THE WHITE SIDEBURN SLAB (round-3 critic). Measured against
    // the long curtain (x −1.00r…−0.68r, z −0.62r…+0.30r), the round-2 streak sat
    // at x −0.92…−0.64r and z +0.11…+0.44r: it stood 0.14r PROUD of the curtain's
    // front edge and reached 0.46r forward of the ear plane at cheek height. So it
    // was not a highlight in the hair — it was a near-white lens hanging in front
    // of the ear down to the jaw, which is both the critic's "white sideburn slab
    // / detached pale blob at the temple" AND a straight Amendment-1 containment
    // break. It is now a THIN lock lying ON the curtain's outer face (0.015r
    // proud), inside the curtain's own z span, so it reads as a platinum streak
    // in the bob instead of a slab beside the face.
    // …and re-seating it did not save it: at 0.015r proud on the curtain's outer
    // face it STILL rendered as a discrete white lens over the temple (measured
    // 2.0% of the front head, 4.0% at 3/4, hanging to −0.68R = below the ear
    // lobe). A near-white mesh laid over a tan mesh is a second surface; it can
    // only ever read as a slab. The platinum highlight belongs in the hair's own
    // VALUE — `hairColor` is already 0xe8d7ae platinum with a strand bump — so
    // the separate streak shell is gone. `hairStreakColor` is retained in the
    // data as the colour a future texture pass should use.
    // DARK UNDERLAYER — v7 FIX round-2: it was a 0.72r sphere at z = −0.52r whose
    // rear pole reached −1.18r against a cap back face at −1.17r, i.e. it poked
    // THROUGH the platinum and rendered as the tan/brown bald patch on the
    // occiput in karen-final1-prof. An underlayer is not a second skull; it is
    // the hair you see UNDER the outer layer at the nape. Smaller, forward of the
    // cap's back face, and dropped so only its lower band clears the new rim.
    const backB = new THREE.Mesh(new THREE.SphereGeometry(r * 0.66, 26, 20), underMat || mat);
    backB.scale.set(0.94, 0.86, 0.90);
    backB.position.set(0, -r * 0.34, -r * 0.40);
    add(backB);
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
    // v7 FIX round-1 — the scalp cap under the backwards cap is FLATTENED (grow
    // 1.03 → 1.015, hairline sweep 0.06 → 0). Measured: with the sweep the hair
    // reached z 0.795R at y=1.0R while the cap's front is only 0.756R there, so
    // the blonde punched THROUGH the navy dome as a wedge — the last third of
    // "his fight still reads 'man in a pudding bowl'". A man wearing a cap has
    // flat hair under it; the front tuft is the separate `quiff` mesh below.
    // grow 1.015 was inside the z-fight band even after the taper fix; a cap worn
    // UNDER a hat still has to be cloth-thick against a sculpted skull.
    scalpCap(1.44, 1.030, 0.56, 44, 0.0);
    backMass(0.96, r * 0.02, 0.94);
    // v7 FIX round-1 — the quiff crested at +0.96R inside the ×1.35 scalp shell,
    // i.e. ABOVE the backwards cap's rim (+0.69R): the blonde mass burst through
    // the front of the cap, which is half of why the cap "collapses to a black
    // yarmulke band". Dropped so the crest tops out at ≈0.67R — a tuft of hair
    // showing UNDER the cap rim, which is what chad_body.png draws.
    // v7 FIX round-2 — the crest is re-solved against the cap rim (now y = 0.52R):
    // the blonde band must live BETWEEN the brow (0.16R) and that rim, or it
    // either punches through the navy or disappears under it. This sits 0.26R…
    // 0.44R and stands proud at z 0.60r, so a real fringe reads under the cap
    // front from every angle.
    const quiff = new THREE.Mesh(new THREE.SphereGeometry(r * 0.52, 26, 20), mat);
    quiff.scale.set(1.16, 0.26, 0.88);
    quiff.rotation.x = -0.26;
    quiff.position.set(0, r * 0.26, r * 0.58);
    add(quiff);
  } else if (style === 'long') {
    // RACHEL (the friendly one — internal id `rachel`, display "Rachel"): long
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
    // v7 FIX round-1 — GRANDMA ASSEMBLY (this is the branch she actually gets:
    // `hairStyle: 'shawl'` resolves to 'bun_soft'). Three defects, one geometry
    // each, all measured:
    //  · "hairline is a hard cut at mid-forehead" — 0.36 put the cap rim barely
    //    above the brow. grandma_body.png has a HIGH hairline with a soft rolled
    //    front; 0.52 plus the new hairline arch gives her a real forehead third.
    //  · "bun is a detached sphere balanced on a hair cone (snowman/matryoshka)"
    //    — the bun sat at +1.02r INSIDE the ×1.35 scalp shell, i.e. 1.38r up,
    //    then added its own 0.38r on top: 0.38R of hair standing clear above the
    //    crown, on a crown that is only 1.35R up. That single sphere is also why
    //    headCountHair measured 4.759 against headCountSkull 5.52 (LAW 1 asks for
    //    6.5–7.0 WITH HAIR ON) and why figureHeight read 0.815 of Andrew against
    //    the bible's 0.76. The sheet's bun is small and on the BACK crown: it now
    //    sits at +0.50r / z −0.62r, inside the back mass and below the crown line.
    //  · the waves sat at +0.26r, z +0.10r — forward of the ear plane at temple
    //    height, which is where the "matryoshka mask-hole" read came from.
    scalpCap(1.26, 1.04, 0.40, 44, 0.14);
    // THE ROLLED FRONT. The cap alone is a smooth dome and its rim is a clean
    // arc, which under the arena key reads as a white SWIM CAP with a hard cut
    // across the forehead — the critic's exact note, and the reason she still
    // cold-read bald at fx7/fx8. grandma_body.png has an elderly updo: two soft
    // rolls sweeping back off a centre part. These sit PROUD of the forehead
    // (front z 0.96R against a 0.92R skull at that row) so they break the rim.
    for (const s of [-1, 1]) {
      // v7 FIX round-2 — at 0.44r they were two small bumps on a smooth dome and
      // she still cold-read as "a white knitted beanie" at arena framing
      // (grandma-a3-f). Bigger, further apart and rotated harder, so the silver
      // reads as two swept rolls off a centre part — which is the elderly updo
      // grandma_body.png draws.
      const roll = new THREE.Mesh(new THREE.SphereGeometry(r * 0.52, 22, 16), mat);
      roll.scale.set(0.94, 0.46, 0.84);
      roll.rotation.z = s * -0.30;
      roll.position.set(s * r * 0.42, r * 0.46, r * 0.54);
      add(roll);
    }
    const backG = new THREE.Mesh(new THREE.SphereGeometry(r * 0.76, 24, 20), mat);
    backG.scale.set(1.02, 0.96, 1.00);
    backG.position.set(0, r * 0.10, -r * 0.44);
    add(backG);
    // Temple waves brought FORWARD to the ear plane so the silver frames her
    // face; parked at z −0.06r they left a bare dome and she read bald (fx7).
    for (const s of [-1, 1]) {
      const wave = new THREE.Mesh(new THREE.SphereGeometry(r * 0.36, 18, 14), mat);
      wave.scale.set(0.48, 0.94, 0.90);
      wave.position.set(s * r * 0.76, r * 0.26, r * 0.10);
      wave.rotation.z = s * -0.14;
      add(wave);
    }
    // ONE bun, on the BACK CROWN. Two stacked spheres read as a snowman (r6); a
    // top bun reads as a matryoshka AND eats 1.7 heads off her proportion.
    // v7 FIX round-2 — the bun READS AGAIN (note [A]: "grandma … has no bun").
    // Round-1 buried it at the back crown to recover head-count, and it worked
    // (headCountHair 4.76 → 5.96) but it also removed her only hair signature —
    // grandma_body.png puts a small coiled bun clear of the crown at the back.
    // It is back on the crown line, at 0.28r radius rather than 0.34r, so the
    // silhouette gets its bun for ~0.10r of extra height rather than 0.38r.
    const bun = new THREE.Mesh(new THREE.SphereGeometry(r * 0.28, 24, 18), mat);
    bun.scale.set(1.02, 0.88, 1.02);
    bun.position.set(0, r * 0.86, -r * 0.46);
    add(bun);
    // the coil: a flattened torus round its base so it reads as wound hair
    const coil = new THREE.Mesh(new THREE.TorusGeometry(r * 0.20, r * 0.062, 8, 20), mat);
    coil.rotation.x = Math.PI / 2 - 0.30;
    coil.position.set(0, r * 0.76, -r * 0.44);
    add(coil);
    // v7 PRODUCER-NOTES round-2 — BREAK THE BONNET RIM (producer note 6). The
    // cap's hairline was one clean arc across the forehead, and a smooth pale
    // shell ending in a clean arc IS a bonnet no matter what the texture does.
    // Five small overlapping lobes of unequal size ride that arc, so the
    // silhouette edge becomes a soft scalloped hairline — the one thing a strand
    // texture can never do, because a texture does not change an outline.
    // Sized to SCALLOP the rim, not to sit on it: at 0.22–0.30r they read as
    // lumps stuck to the temple (measured by eye on grandma-r2f-hairQ). At
    // 0.13–0.19r, flattened and pulled back into the cap, only the outline
    // changes — which is the whole point.
    const HAIRLINE = [[-0.84, 0.28, 0.19], [-0.52, 0.44, 0.16], [-0.15, 0.52, 0.13],
      [0.25, 0.49, 0.15], [0.66, 0.37, 0.18]];
    for (const [hx, hy, hr] of HAIRLINE) {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(r * hr, 16, 12), mat);
      lobe.scale.set(1.15, 0.52, 0.66);
      lobe.rotation.z = -hx * 0.46;
      lobe.position.set(hx * r * 0.90, hy * r, r * (0.54 - Math.abs(hx) * 0.24));
      add(lobe);
    }
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
    // v7 FIX round-1 — GRANDMA ASSEMBLY. Three defects, one geometry each:
    //  · "hairline is a hard cut at mid-forehead" — 0.36 put the rim barely
    //    above the brow. The sheet has a HIGH hairline with a soft rolled front;
    //    0.52 plus the new hairline arch gives her a real forehead.
    //  · "bun is a detached sphere balanced on a hair cone (snowman/matryoshka)"
    //    — the bun sat at +1.02r INSIDE the 1.35 scalp shell, i.e. 1.38r up, then
    //    added its own 0.38r on top: 0.38R of hair standing above the crown. That
    //    is also why headCountHair measured 4.76 against headCountSkull 5.52.
    //    The sheet's bun is small and on the BACK crown; it now sits at +0.52r,
    //    z −0.66r, tucked into the back mass — below the crown line, so hair
    //    stops eating a head and a half off her proportion.
    //  · "ZERO visible neck (LAW 1: neck is VISIBLE, never sunk)" — the back mass
    //    reached the nape; it is pulled up and in.
    scalpCap(1.26, 1.04, 0.52, 44, 0.12);
    const back = new THREE.Mesh(new THREE.SphereGeometry(r * 0.74, 24, 20), mat);
    back.scale.set(1.02, 0.94, 1.00);
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
function addAccessory(group, acc, rig, config, detailed, probe = false) {
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
      new THREE.TorusGeometry(0.026 * rig.ws, 0.011 * rig.ws, 6, 12, Math.PI * 1.2),
      rig.skinMat);
    knuck.rotation.set(Math.PI / 2, 0, side < 0 ? -0.5 : 0.5);
    knuck.position.set(0, hy + dy, 0.062 + dz);
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
      // Same isolation node as the `config.glasses` path — andrew and the intern
      // get their pair through the ACCESSORY list, which is why tagging only the
      // other path left their nose-band measurement pinned at 72–85 while
      // grandma's fell 62 → 30.
      const eyewear = new THREE.Group();
      eyewear.userData.pnId = 'eyewear';
      buildGlasses(eyewear, rig.headR, 'clear', detailed);
      group.head.add(eyewear);
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
      // 0.0145 is 0.16 of headR — a marble, not a stud (karen fx7: "two big white
      // blobs at the ears"). 0.0092 is ≈0.10R, which is a pearl earring.
      const pearlGeo = new THREE.SphereGeometry(0.0092, 12, 10);
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
      // v7 FIX round-1 — THE PITH HELMET AND THE HALO. Measured against the v7
      // skull (half-width R, front +1.02R, back −1.14R, crown +1.35R) the v6 cap
      // was scaled (1.11, 1.35, 1.20) on a 1.06R sphere: 1.18R at the sides and
      // 1.27R at the FRONT, i.e. 18% and 25% PROUD of the head it was supposed to
      // be worn on. That is the "navy pith helmet / man in a pudding bowl". The
      // separate rim torus was worse: radius 1.03R held at y=+0.80R, where the
      // skull is only 0.78R wide — a ring standing 0.25R off the skull all the
      // way round, which is the "floating halo / full Saturn-ring ellipse visible
      // from the FRONT with lateral spike tips".
      //
      // The cap now HUGS by construction. One solve, three numbers:
      //   sides  cap = 1.06R  (0.06R of cloth over the skull's 1.00R)
      //   front  cap = 1.09R  (over 1.02R)     back cap = 1.23R (over 1.14R)
      // → z-half 1.16R centred at −0.07R, x-scale 1.00, and a y-scale that lands
      // the rim on the hairline (+0.70R) with the crown at +1.42R. The rim band
      // is now a SLICE OF THE SAME SPHERE, 1.5% proud — it cannot float, because
      // it is the cap.
      const CAP_R = r * 1.06;
      const CAP_SX = 1.00, CAP_SY = 1.33, CAP_SZ = 1.094;
      const CAP_Y = r * 0.01, CAP_Z = -r * 0.07;
      // v7 FIX round-2 — rim 1.13 → 1.20 (y 0.61R → 0.52R). At 1.13 the rim sat
      // ABOVE the quiff's crest, so the only hair anywhere was a sliver at one
      // temple and the cap cold-read as a beanie/kippah at 3/4 (chad-a3-q).
      const THETA = 1.20;                         // rim at cos(1.20)=0.362 of R
      const seatCap = (mesh, proud = 1) => {
        mesh.scale.set(CAP_SX * proud, CAP_SY, CAP_SZ * proud);
        mesh.position.set(0, CAP_Y, CAP_Z);
        mesh.userData.noCast = true;
        group.head?.add(mesh);
      };
      seatCap(new THREE.Mesh(
        new THREE.SphereGeometry(CAP_R, 36, 26, 0, Math.PI * 2, 0, THETA), capMat));
      // sweatband: the bottom 16% of the SAME dome, a hair proud — a hat line
      // above the brow that is geometrically incapable of standing off the skull.
      seatCap(new THREE.Mesh(
        new THREE.SphereGeometry(CAP_R, 36, 8, 0, Math.PI * 2, THETA * 0.84, THETA * 0.16), rimMat), 1.015);
      // BILL — worn backwards: it leaves the occiput and angles down-and-back.
      // A CylinderGeometry with phiLength π is a half-disc lying in the XZ plane
      // occupying x ≥ 0; rotateY(π/2) swings that half onto z ≤ 0 (backwards),
      // and only then does a small rotation.x drop its far edge. Doing the swing
      // with rotation.y AFTER an x-rotation (as v6/v7 did) tips the disc up on
      // edge instead — which is why the profile showed a navy FIN standing off
      // the back of his head rather than a bill.
      // v7 FIX round-2 — THE BILL WAS INSIDE THE CAP. Measured: the dome's back
      // face at y = +0.73R sits at z = −1.07R, and the bill was a 0.66R half-disc
      // centred at z = −0.57R — so 77% of its length was buried in the crown and
      // only 0.16R ever cleared it. That is the note's "no bill from front …
      // and none in profile; a plain navy dome". It now leaves the occiput AT the
      // shell (z = −1.10R, where the dome's surface is at that height) and
      // projects 0.6R clear, angled slightly down, which is a backwards cap.
      // v7 FIX round-4 — THE FIN. Measured on renders, the round-2 bill was a
      // FLAT half-disc 0.014 thick: it projected a real 0.382R past the occiput
      // and covered 5.6% of the head from behind, but only **1.39%** in profile
      // and **1.47%** at 3/4 — because a flat plate seen edge-on is a two-pixel
      // line. That is the round-3 note "the cap has no bill": geometrically it
      // was there, optically it was a razor blade.
      // A real visor is CURLED — the sides drop away from the centre line, and
      // the curl deepens toward the tip. That curl is what gives the bill a
      // silhouette from the side, and it is the shape that says CAP rather than
      // "dark wedge behind a head".
      const bill = buildCapBill(r, capMat, Materials.custom(0x191c26, { stops: 4 }));
      bill.position.set(0, CAP_Y, CAP_Z);
      for (const bm of bill.children) {
        bm.userData.noCast = true;
        if (probe) { bm.userData.pnId = 'capBill'; bm.userData.noMerge = true; }
      }
      group.head?.add(bill);
      const btn = new THREE.Mesh(new THREE.SphereGeometry(r * 0.070, 10, 8), rimMat);
      btn.position.set(0, CAP_Y + CAP_R * CAP_SY * 0.995, CAP_Z);
      btn.userData.noCast = true;
      group.head?.add(btn);
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
      // v7 FIX round-2 — the arc's top ends sat at nb−0.014, INSIDE the polo
      // collar (which runs nb−0.004 … nb+0.043): the chain rendered as a grey
      // ring cutting across the collar with a visible break at the front-left.
      chain.position.set(0, nb - 0.052, rig.frontZ - 0.004);
      group.add(chain);
      const pendant = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 12, 10), chainMat);
      pendant.scale.set(1, 1.2, 0.62);
      pendant.position.set(0, nb - 0.052 - cR * 0.86, rig.frontZ + 0.004);
      group.add(pendant);
      break;
    }
    case 'purse': {
      // Slung cleanly OFF the left forearm and hanging outside the hip, not
      // embedded in the arm/torso (rider: orange sliver at the elbow). Parented
      // to the arm so it rides naturally, with a strap up to the shoulder.
      // v7 FIX round-1 — at z 0.12 the bag hung a full hand's width FORWARD of
      // the arm with nothing joining it: the critic read "purse floating at hip".
      // Pulled back against the forearm, shrunk to sheet scale, and the chain
      // strap now runs UP the arm instead of hooping in mid-air.
      // v7 FIX round-2 — IT IS A SHOULDER BAG, NOT A CUFF. Parented to the ARM at
      // wrist height with a torus "handle" looped round the forearm, the whole
      // assembly read exactly as the note describes: "an orange box cuffed around
      // the wrist (oven-mitt read)" — because that is geometrically what it was.
      // karen_body.png hangs a quilted flap bag from a CHAIN over the shoulder,
      // resting at the hip. So: the bag is parented to the BODY at hip height and
      // a two-run chain climbs from it to the shoulder line. Nothing rides the
      // hand, so the hand is free to read as a hand.
      // v7 FIX round-4 — IT IS CARRIED, NOT WORN. The round-2 rebuild hung the
      // bag off the BODY at hip height on a two-run shoulder chain, which is why
      // the round-3 critic logged "the purse doesn't grip": nothing about it
      // touched a hand, so at fight distance it read as luggage parked against
      // her hip. `_hands_reference.png` grip vocabulary is a closed fist around
      // a handle with the knuckle roll over the front of it — the same vocabulary
      // every other held prop in the cast uses (mug, clipboard, cane). So: the
      // handle LOOP passes through the fist, the bag hangs from the loop's own
      // ends, and the whole assembly is parented to the arm so it rides the swing.
      const leather = Materials.custom(0xa9752f, { stops: 4 });
      const dark = Materials.custom(0x8a5a20, { stops: 4 });
      const chainM = Materials.custom(0xc8a030, { stops: 4 });
      const BX = 0.014, BZ = 0.056;
      const HR = 0.050;                       // handle radius = bag half-width
      const apexY = hy - 0.010;               // the loop's crest, inside the fist
      const cY = apexY - HR;                  // loop centre == the bag's top line
      const handle = new THREE.Mesh(new THREE.TorusGeometry(HR, 0.0062, 8, 22, Math.PI), chainM);
      handle.position.set(BX, cY, BZ);
      group.rightArm?.add(handle);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(HR * 2, 0.078, 0.038), leather);
      bag.position.set(BX, cY - 0.039, BZ);
      group.rightArm?.add(bag);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(HR * 2.04, 0.028, 0.041), dark);
      flap.position.set(BX, cY - 0.012, BZ);
      group.rightArm?.add(flap);
      const clasp = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.005, 12), chainM);
      clasp.rotation.x = Math.PI / 2;
      clasp.position.set(BX, cY - 0.030, BZ + 0.021);
      group.rightArm?.add(clasp);
      if (probe) { bag.userData.pnId = 'prop'; bag.userData.noMerge = true; }
      grip(1, apexY - hy, BZ - 0.062);
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
      // v7 FIX round-4 — TWO BUGS, both measured (critic: "cane not gripped, and
      // figureBottom = −0.152").
      //  (a) LENGTH: `Math.max(0.5, rig.handY)` floored the shaft at 0.50 world
      //      units. Grandma is a 1.20-tall build whose hand hangs at ~0.35, so
      //      the ferrule was driven 0.15 BELOW the stage — it clips through
      //      every floor in the game. The shaft is now solved from the hand
      //      height, which is the only number that can put the tip on the floor.
      //  (b) GRIP: the shaft ran at arm-local (0.034, 0.100) while the fist and
      //      its grip knuckles sit at (0, ~0.075) — 0.05 away, i.e. a stick
      //      standing NEXT to an open hand. Shaft and knuckles now share a
      //      station, so the fingers close over the wood.
      const GRIP_Z = 0.078;
      const topLocalY = hy - 0.02;                        // fist, arm-local
      // −0.004 measured figureBottom = −0.0174: the arm's own hang rotation and
      // the ferrule cap eat ~0.014 more than the hand height predicts. Solved
      // against the RENDER, per the harness rule, not against the formula.
      const caneLen = Math.max(0.22, rig.handY - 0.018);
      const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.016, caneLen, 16), caneMat);
      cane.position.set(0.012, topLocalY - caneLen / 2, GRIP_Z);
      group.rightArm?.add(cane);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.017, 10, 20, Math.PI * 1.2), caneMat);
      handle.rotation.set(Math.PI / 2, 0, -0.12);
      handle.position.set(0.012, topLocalY + 0.020, GRIP_Z);
      group.rightArm?.add(handle);
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.021, 0.030, 12), Materials.custom(0x8e8e96, { stops: 4 }));
      ferrule.position.set(0.012, topLocalY - caneLen + 0.014, GRIP_Z);
      group.rightArm?.add(ferrule);
      if (probe) { cane.userData.pnId = 'prop'; cane.userData.noMerge = true; }
      grip(1, 0.0, GRIP_Z - 0.062);
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
      // v7 FIX round-1 — "a specular balloon shawl (LAW 5 says satin, low sheen)"
      // and "arms fully swallowed by the shawl dome with two vestigial slit
      // marks". Two causes: Materials.custom is a 3-stop toon ramp, and on a
      // 0.29-radius smooth sphere band that ramp lands as one hard specular-
      // looking terminator across her whole back — a balloon. And the band was
      // wide enough to close over both deltoids.
      // Now: the painted-cloth material (4-stop, with a woven map so the value
      // break is broken up), a narrower band that stops INBOARD of the arms, and
      // a scalloped knit hem so the lower edge is cloth, not a latitude line.
      // v7 FIX round-2 — THE FLOATING CRESCENTS (note [B]: "the shawl back is a
      // welded SPHERE hump; two crescent 'drape' ribbons float in mid-air above
      // the shoulders attached to nothing"). Both were arithmetic, not styling:
      //  · The band ran theta 0.50…1.32 on a sphere of R = bodyW·0.42 = 0.123,
      //    whose horizontal radius therefore peaked at 0.969R = 0.119 — INSIDE a
      //    torso that is 0.145 wide at that height. The only parts of it that ever
      //    cleared the cloth were its top ring, which sat 0.06 ABOVE the shoulder
      //    line. Two arcs floating over nothing.
      //  · The phi window was wrong end-on: THREE seats φ=0 on −x, so
      //    phiStart 0.30π…1.40π left the opening on her LEFT SIDE, not the front.
      //
      // A shawl is not a sphere band. It is a SHELL THAT RIDES THE TORSO — the
      // same construction buildNeckline uses — sampling the jacket's own lathe
      // rows 6% proud, open at the FRONT by construction, from the trapezius down
      // to the waist, with a knit scallop on the hem.
      const sh = config.shawlColor ?? 0xa4a2c8;
      const mShawl = Materials.cloth(sh);
      const shoulderR = rig.shoulderRad, chestR = rig.chestR, waistR = rig.waistR;
      const dS = shoulderR - chestR;
      const rows = [
        [shoulderR * 0.86, rig.torsoH * 0.960, 0.60],
        [shoulderR * 0.998, rig.torsoH * 0.858, 0.52],
        [chestR + dS * 0.76, rig.torsoH * 0.796, 0.48],
        [chestR + dS * 0.44, rig.torsoH * 0.735, 0.46],
        [chestR + dS * 0.16, rig.torsoH * 0.660, 0.45],
        [chestR * 1.01, rig.torsoH * 0.575, 0.45],
        [waistR * 1.14, rig.torsoH * 0.455, 0.46],
        [waistR * 1.16, rig.torsoH * 0.360, 0.48],
        [waistR * 1.12, rig.torsoH * 0.268, 0.52],
        [waistR * 1.00, rig.torsoH * 0.230, 0.56],   // hem lip, turned back in
      ];
      const SEG = 40;
      const pv = [], pi = [];
      for (let i = 0; i < rows.length; i++) {
        const [r0, yy, gapHalf] = rows[i];
        // 1.06 kept the drape inside the sleeve line, so from the front it read as
        // two narrow lilac straps rather than the reference's wide triangular
        // knit falling to the elbow. 1.15 puts it ON the arms, where a shawl is.
        const rr = r0 * 1.15;
        const down = i / (rows.length - 1);
        for (let j = 0; j <= SEG; j++) {
          // φ measured from the FRONT (+z). The covered arc is everything outside
          // the front gap, so the opening is at the sternum where a shawl's is.
          const phi = gapHalf + (j / SEG) * (Math.PI * 2 - gapHalf * 2);
          const k = 1 + (0.026 * Math.cos(phi * 8) + 0.014 * Math.cos(phi * 3)) * down;
          pv.push(rr * k * Math.sin(phi), yy, rr * k * Math.cos(phi) * 0.68);
        }
      }
      for (let i = 0; i < rows.length - 1; i++) {
        for (let j = 0; j < SEG; j++) {
          const a = i * (SEG + 1) + j, b = a + 1, c = a + SEG + 1, d = c + 1;
          pi.push(a, c, b, b, c, d);
        }
      }
      const shGeo = new THREE.BufferGeometry();
      shGeo.setAttribute('position', new THREE.Float32BufferAttribute(pv, 3));
      shGeo.setIndex(pi);
      shGeo.computeVertexNormals();
      mShawl.side = THREE.DoubleSide;
      const drape = new THREE.Mesh(shGeo, mShawl);
      // seated EXACTLY like the torso lathe (same origin, same lean), because the
      // rows above are samples of that lathe's own profile.
      drape.position.set(0, rig.legLength, rig.torsoZ);
      drape.rotation.x = rig.hunch;
      group.add(drape);
      break;
    }
    case 'cameo_brooch': {
      // Grandma's cameo at the throat (portrait: a dark oval brooch closing the
      // shawl). Small, seated on the cloth, with a pale carved face inside.
      // v7 FIX round-2 — seated on `collarY/collarZ` (the torso surface at the
      // THROAT) instead of `frontZ` (the surface at the CHEST). Measured on
      // Grandma the two differ by 0.05 — a fifth of her chest depth — which is
      // exactly the note's "cameo brooch is a detached black rectangle hovering
      // at chest height". It is also tilted to lie ON the sloping yoke.
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.007, 18), Materials.custom(0x2a2028, { stops: 4 }));
      rim.rotation.set(Math.PI / 2 - 0.30 + rig.hunch, 0, 0);
      rim.scale.set(0.82, 1, 1);
      rim.position.set(0, rig.collarY, rig.collarZ + 0.006);
      group.add(rim);
      const face = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.004, 16), Materials.custom(0xd8cbb8, { stops: 4 }));
      face.rotation.set(Math.PI / 2 - 0.30 + rig.hunch, 0, 0);
      face.scale.set(0.82, 1, 1);
      face.position.set(0, rig.collarY + 0.002, rig.collarZ + 0.011);
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
    // ── Late-game payouts (F-7) ──
    // Chest pieces go on the LEFT lapel (x +0.07, the side appreciation_cert
    // and compliance_pin already use); held props go in the off hand
    // (-handX), which is the slot fountain_pen and the tumbler share. Nothing
    // below occupies a spot a same-slot cosmetic could also claim.
    form_11c_cert: () => {
      // A county seal, not a lapel pin: an embossed disc on its ribbon.
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.005, 14), Materials.custom(0xc9a227));
      disc.rotation.x = Math.PI / 2;
      disc.position.set(0.07, rig.legLength + rig.torsoH * 0.70, rig.frontZ * 0.4 + 0.104);
      group.add(disc);
      const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.032, 0.004), Materials.custom(0x7a2233));
      ribbon.position.set(0.07, rig.legLength + rig.torsoH * 0.745, rig.frontZ * 0.4 + 0.1);
      group.add(ribbon);
    },
    fennimore_citation: () => {
      // A folded parking ticket, carried rather than filed.
      const slip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.058, 0.004), Materials.custom(0xf2e2a8));
      slip.rotation.z = -0.22;
      slip.position.set(-handX, rig.legLength + rig.torsoH * 0.36, handZ + 0.02);
      group.add(slip);
    },
    ledger_pencil: () => {
      // Four inches of pencil. Behind the ear, where a tradesman keeps one.
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.062, 6), Materials.custom(0xe0a83c));
      shaft.rotation.set(0.35, 0, Math.PI / 2 - 0.25);
      shaft.position.set(headR * 0.86, headR * 0.34, -headR * 0.12);
      head?.add(shaft);
      const lead = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.012, 6), Materials.custom(0x2b2b2b));
      lead.rotation.set(0.35, 0, -Math.PI / 2 - 0.25);
      lead.position.set(headR * 0.86 - 0.036, headR * 0.34 + 0.012, -headR * 0.12);
      head?.add(lead);
    },
    high_score_crown: () => {
      // A cabinet-issue paper crown. Flat band, four points — the arcade would
      // not spring for anything with a curve in it.
      const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.86, headR * 0.86, 0.036, 14, 1, true), Materials.custom(0xffcc33));
      band.position.set(0, headR * 1.30, 0);
      head?.add(band);
      for (let i = 0; i < 4; i++) {
        const pt = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.042, 4), Materials.custom(0xffcc33));
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        pt.position.set(Math.cos(a) * headR * 0.86, headR * 1.35, Math.sin(a) * headR * 0.86);
        head?.add(pt);
      }
    },
    stewards_badge: () => {
      // A building-keys fob on the belt: nine renovations, one ring.
      const fob = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.042, 0.006), Materials.custom(0xb08d57));
      fob.position.set(d.bodyW / 2 + 0.028, rig.legLength + 0.06, 0.03);
      group.add(fob);
      const clip = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 10), Materials.custom(0x8a6f45));
      clip.position.set(d.bodyW / 2 + 0.028, rig.legLength + 0.09, 0.03);
      group.add(clip);
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
