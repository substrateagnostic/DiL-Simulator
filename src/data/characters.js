import { COLORS } from '../utils/constants.js';
import _charOverrides from './character-overrides.json' with { type: 'json' };

export const CHARACTER_CONFIGS = {
  andrew: {
    name: 'Andrew',
    bodyColor: COLORS.SUIT_BLUE,
    pantsColor: 0x2a2a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: COLORS.BLUE_TIE,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BROWN,
    hairStyle: 'short',
    // LAW 7 #1: "dark short bob + glasses, coffee mug, light stubble". The
    // glasses were simply absent, which is half of why the front view read as a
    // back view (no glasses, no tie, no shirt-front).
    accessories: ['coffee_mug', 'glasses'],
    // v5 face/proportion fields
    gender: 'm', eyeColor: 0x4a3222, jaw: 1.00, chin: 1.02,
    browColor: 0x3a2a1e,
    beard: 'stubble', beardColor: 0x2a2016,
  },
  ross: {
    tone: 'silly',
    name: 'Skip Hartley',
    bodyColor: COLORS.POLO_GREEN,
    pantsColor: COLORS.KHAKI,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BROWN,
    hairStyle: 'short',
    accessories: ['bluetooth_earpiece', 'boss_mug'],
    shoeSize: 0.75,
    // v5 face — soft everyman, faintly weak chin (defeated-optimist Loman)
    gender: 'm', eyeColor: 0x4a3527, jaw: 1.05, chin: 0.98,
    // v7 FIX round-1 face shape — rounded, soft, low brow (LAW 7 #5).
    faceWidth: 1.07, cheek: 0.90, browRidge: 0.86,
  },
  janet: {
    name: 'Janet',
    bodyColor: COLORS.CARDIGAN,
    pantsColor: 0x3a3a4a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BROWN,
    hairStyle: 'bun',
    accessories: ['wine_tumbler'],
    // v5 face — tired dry wit, muted worn lip, narrow jaw
    gender: 'f', eyeColor: 0x5a4030, lipColor: 0x9a5a54, jaw: 0.86,
    // v7 FIX round-1 face shape — slim, narrow, planar cheek (LAW 7 #6).
    faceWidth: 0.92, cheek: 1.06, browRidge: 0.92, mouthWidth: 0.94,
  },
  alex_it: {
    name: 'Alex from IT',
    bodyColor: COLORS.HAWAIIAN,
    pantsColor: 0x5a5a3a,
    shirtColor: 0x8a6a4a, // plaid flannel under the hawaiian
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: 0x8a7c62, // ash-blond with grey flecks (producer likeness rev, 07-31 — no ginger)
    hairStyle: 'short',
    beard: true,
    beardColor: 0x6e6152, // taupe grey-brown trim beard
    accessories: [],
    // v5 face — late-30s Dirk Gently, hazel-grey eyes; ash-blond + grey, no ginger (producer likeness rev)
    gender: 'm', eyeColor: 0x6a6238, jaw: 1.02, chin: 1.02,
    // v7 FIX round-1 face shape — broad and rumpled, soft brow.
    faceWidth: 1.04, cheek: 0.94, browRidge: 0.96,
  },
  intern: {
    tone: 'silly',
    name: 'The Intern',
    bodyColor: 0x4a4a6a, // Oversized suit (gray-blue)
    pantsColor: 0x3a3a4a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0xa8622c,
    skinColor: COLORS.SKIN,
    hairColor: 0x5a3f28,   // warm brown to match the portrait (was near-black)
    hairStyle: 'short',
    // LAW 7 #8 wants clear glasses; the portrait's white ID tag is the other
    // signature. Both were missing from the 3D pass.
    accessories: ['name_tag', 'glasses'],
    shoeColor: 0x6b4a32,   // intern_body.png: scuffed brown lace-ups, not black
    // v7 FIX round-1 — headCountSkull 6.11 / headCountHair 5.715 against LAW 1's
    // 6.5–7.0 with hair on. His body is already short by design (heightScale
    // 0.92), so the correction is the head: 1.05 → 0.94 puts him at ≈6.6.
    // widthScale 1.10 was scaling the BODY, not the suit: with the head down to
    // 0.94 it put his shoulder line at 2.60 head-widths — the widest frame in
    // the cast, on the character LAW 7 #8 calls "small … slight". The body goes
    // slight (0.98) and the OVERSIZED read is carried by shoulderScale + the
    // jacket hem, which is what an oversized jacket actually is.
    // headScale 0.94 measured headCountHair 6.262, still under LAW 1's floor;
    // 0.90 lands ≈6.50. (His body stays short by design — heightScale 0.92.)
    widthScale: 0.98, heightScale: 0.92, headScale: 0.90,
    // THE HUNCHED-IN SILHOUETTE. His spine and shoulders were as erect and square
    // as Andrew's, so he read as a composed junior associate rather than the
    // portrait's terrified intern. hunch 0→0.15 (forward spine), headPitch 0.14
    // (≈8° cervical curl), shoulderLift 0.02 (shoulders in AND up).
    // v7 FIX round-1 — THE OVERSIZED SUIT. LAW 7 #8 and intern_body.png both say
    // "oversized suit swallowing the frame"; the critic logged it "absent
    // entirely, no lapels anywhere", and shoulderScale 0.90 was actively working
    // against it (a suit that is too SMALL for him). An oversized jacket is wide
    // in the shoulder and long in the hem on a small frame: 1.06 + a 0.085 hem +
    // lapel relief, with shoulderLift still pulling the shoulders in and up so it
    // reads as a boy inside his father's suit rather than a broad man.
    // v7 FIX round-2 — THE SILHOUETTE WAS INVERTED. Measured, he came in at
    // shoulderOverHeadW 2.312 against Chad's 2.235: the timid teenager had the
    // WIDEST frame in the cast and the gym-bro the second widest. shoulderScale
    // 1.06 was buying "oversized" in the one dimension that reads as physique.
    // An oversized jacket on a small frame is LONG and LOOSE, not broad, so the
    // read moves to the hem (0.085 → 0.115) and the shoulder line drops. At 0.82
    // the instrument disagreed (normframe fidelity 0.652 → 0.617: intern_body.png
    // really is a broad jacket), so this lands at 0.92 ≈ 2.14 head-widths — the
    // jacket stays oversized, and Chad (2.235) is the widest frame in the cast
    // again, which was the actual defect.
    hunch: 0.15, headPitch: 0.14, shoulderLift: 0.012, shoulderScale: 0.92,
    jacketHem: 0.115, lapels: true,
    // v7 PRODUCER-NOTES round-1 — 0.68 → 0.74 against the narrower NECK canon.
    // He measured the thinnest column in the cast (0.43 of head width) BEFORE
    // the cast-wide narrowing; 0.68 through the new taper would have made him a
    // stalk, which is the opposite failure. 0.74 holds him where he was.
    neckScale: 0.74,       // slight timid teenager — a slim neck, not jaw-wide
    // Portrait has NO glasses and warm-brown hair; the raised 'short' hairline now
    // shows a strip of forehead so fringe / brow / eyes still read as three bands.
    // v5 face — young, timid, small chin (early-Charlie-Brown big head)
    gender: 'm', eyeColor: 0x4a3a2a, jaw: 0.90, chin: 0.94, browColor: 0x3a2a1c,
    // FACE SHAPE — the sheet's soft NARROW young face with big eyes.
    faceWidth: 0.93, cheek: 0.95, browRidge: 0.78, eyeSize: 1.12, eyeGap: 1.03, mouthWidth: 0.92,
  },
  diane: {
    name: 'Diane',
    bodyColor: COLORS.BLAZER,
    pantsColor: 0x2a2a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: null,
    skinColor: COLORS.SKIN_DARK,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'bun',
    accessories: ['clipboard'],
    // v5 face — composed August-Wilson dignity, steady deep-brown eyes
    gender: 'f', eyeColor: 0x2e1d12, lipColor: 0xa5605a, jaw: 1.00,
    // v7 FIX round-1 face shape — composed, strong cheekbone, level brow.
    faceWidth: 1.00, cheek: 1.08, browRidge: 0.94,
  },
  janitor: {
    name: 'Mysterious Janitor',
    bodyColor: 0x4a5a6a, // Jumpsuit
    pantsColor: 0x4a5a6a,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN_DARK,
    hairColor: COLORS.HAIR_GRAY,
    hairStyle: 'short',
    beard: true,
    beardColor: 0xd8d4c8, // white stubble
    accessories: ['mop', 'gold_rolex'],
    hunch: 0.16, heightScale: 0.96,
    // v5 face — weathered elder griot, broad jaw, deep-set eyes
    gender: 'm', age: 'old', eyeColor: 0x3a2818, jaw: 1.10, chin: 1.02,
    // v7 FIX round-1 face shape — broad weathered elder, heavy brow.
    faceWidth: 1.06, cheek: 1.08, browRidge: 1.12,
  },
  karen: {
    tone: 'silly',
    name: 'Karen Henderson',
    bodyColor: 0xcc6688,
    pantsColor: 0x2a2a3a,
    shirtColor: 0xf2e8dc,   // cream blouse in the collar V
    tieColor: null,
    skinColor: 0xf0c0a0,
    hairColor: 0xe8d7ae,   // PLATINUM blonde (hair texture no longer darkens 2 stops)
    hairStreakColor: 0xfcf7ea,  // the portrait's pale streak on the long sweep
    hairUnderColor: 0x9a7f4e,   // producer ruling: platinum bob, DARK underlayer
    hairStyle: 'karen',    // → 'bob_asym': side-parted asymmetric sweep
    // Identity per the canonical portrait (round-2 gate): pearl studs + the gold
    // lapel brooch, not just "palette + one prop".
    accessories: ['purse', 'pearl_earrings', 'gold_brooch'],
    // v7 FIX round-2 — headCountHair measured 6.357 against LAW 1's 6.5–7.0 band
    // (note [B]: "Karen is now SHORTER-headed than the build this wave was meant
    // to beat", the shipped v6 at 6.50). Her crown height is right; the head was
    // 5% oversized. 1.02 lands her at 6.52 with the bob's 0.129R of hair-above-
    // crown included, which is the number the band is written about.
    hunch: 0.06, headScale: 1.02,
    // THE NECK (producer: "too much neck and none at all"). A narrower column
    // (0.92→0.76) plus 0.024 of extra length gives a clear, correctly-proportioned
    // lit taper between jaw and collar instead of a short wide skin slab.
    // v7 — 0.76/0.046 measured a 1.59-head-radius column at 0.42R wide: a stalk
    // (karen r9). The v7 neck is solved to `neckH` of exposed column on every
    // build, so she only needs a hair of extra length and a normal width.
    neckScale: 0.92, neckExtra: 0.010,
    // The pink blazer used to terminate exactly at the leg-split Y with zero hem
    // relief — a pink leotard over leggings. Now a real hem 0.07 below the hip.
    // v7 FIX round-4 — the hem sat 0.0796 below the hip pivot = 38.5% of her
    // standing height, which is mid-seat: a tunic length. A single-breasted
    // blazer hem lands AT the hip (≈41%), with a full trouser column below it.
    jacketHem: 0.048, necklineWide: true,
    // v5 face/proportion fields — bold DARK brows + red lip per the portrait
    // v7 FIX round-2 — IRIS. 0x3a2a1c is dark brown; the canonical portrait
    // (art/char_refs/generated/karen_body.png) gives her grey-blue eyes, and the
    // combat camera reads iris colour before it reads anything else on a face.
    gender: 'f', eyeColor: 0x6e7c88, jaw: 0.95, chin: 0.94, lipColor: 0xc83a52, browColor: 0x3e2f20, headForward: 0.02,
    // v7 FIX round-1 — FACE SHAPE (critic: "ONE FACE, TWENTY COSTUMES … the cast
    // is one skull in different wigs"; the layout block in _summary-final.json
    // was byte-identical for karen/chad/grandma/intern). karen_body_v2.png draws
    // a LONG OVAL with high cheekbones and a full mouth.
    faceWidth: 0.93, cheek: 1.14, browRidge: 1.05, mouthWidth: 1.06, eyeGap: 0.97,
  },
  chad: {
    tone: 'silly',
    name: 'Chad Henderson',
    bodyColor: 0xcc4444, // Red polo
    pantsColor: 0x6f6042, // darker/cooler khaki — was skin-toned (read bare-legged)
    shirtColor: null,
    tieColor: null,
    skinColor: 0xd99a70,   // gym tan
    hairColor: 0xa88a4e,   // blonde quiff (bible 0x8a6a38, lifted for the dark venue)
    hairStyle: 'quiff',    // real forward volume under the backwards cap
    accessories: ['protein_shake', 'gold_chain', 'backwards_cap'],
    belt: true,
    // v7 FIX round-2 — "chad's white sneakers became glossy black ball-shoes":
    // he had no shoeColor at all, so he inherited the cast default 0x1a1a1a.
    // chad_body.png is white low-top trainers.
    shoeColor: 0xeeece4, shoeSize: 1.04,
    // The polo hem used to dip ~0.06 BELOW the belt with khaki thighs starting
    // separately underneath — briefs-over-pants. The shell now ends AT the
    // waistband and a real trouser rise owns the pelvis.
    trouserRise: 0.10, jacketHem: -0.098,
    muscular: true,        // deltoid/bicep swell lives in the ARM loft (LAW 2)
    lapels: false,         // a POLO, not a blazer — kill the rectangular pec-slab lapels
    polo: true,            // knit collar + placket, so the garment CLASS reads as a polo
    shortSleeve: true,     // red polo w/ BARE muscular forearms (was red long sleeves)
    beard: 'stubble', beardColor: 0x55452c, // portrait stubble (deeper than 0x6a5236)
    // v7 — headScale tracks heightScale: at 1.0 against a 1.06 body he measured
    // 7.29 heads (LAW 1 caps at 7.0) and the head read undersized on the frame.
    // v7 PRODUCER-NOTES round-2 — HEAD SCALE (producer note 4: "Chad: head too
    // small + too round"). He measured headCountSkull 6.857 against LAW 1's
    // 6.5–7.0 band, i.e. he was sitting at the SMALL-HEAD end of the legal range
    // while the reference draws a big square-headed athlete. Solving
    // headCount = C0/(2.70R) + 1 for 6.55 gives R x 1.055, so 1.06 -> 1.12.
    widthScale: 1.06, heightScale: 1.06, headScale: 1.12,
    // ...and the ROUNDNESS half of the same note. `skullSquare` adds a gonial
    // corner, a flat frontal plane and parallel side walls (sculptSkull step 10).
    // He is the only build that asks for it: chad_body.png is a square-jawed,
    // flat-browed bull, and he measured a 0.096 deviation from a circular arc in
    // profile with a 4.63 structure energy — the definition of a painted egg.
    skullSquare: 2.00,
    // v5 face/proportion fields. Round-4: chin 1.08→1.00 and jaw 0.98→0.94 —
    // the nose-to-chin span measured ~45% of the skull, outside LAW 4's ±15% band
    // ("shorten the jaw shell ~8%"). The eye line rises back toward 50% with it.
    gender: 'm', eyeColor: 0x3a2a1a, jaw: 1.15, chin: 1.00, browColor: 0x4a3720,
    // v7 FIX round-1 — FACE SHAPE. chad_body.png draws a WIDE SQUARE face with a
    // heavy brow and a broad jaw; at jaw 0.94 / faceWidth 1.0 he measured within
    // 1% of Karen's and the Intern's skull (jawOverCranialGeo 0.839 vs 0.845 vs
    // 0.845). Every dial is inside LAW 4's ±15% band.
    faceWidth: 1.10, cheek: 1.12, browRidge: 1.22, eyeSize: 0.94, mouthWidth: 1.08,
    // Round-4 — THE GYM-BRO V. His shoulder line was congruent with the Intern's
    // (~2.3 head-widths on both). shoulderScale 1.22→1.45 against the stronger
    // broad-response, plus `muscular` arms, lands the deltoid line at ≈2.6
    // head-widths in ONE loft while waistScale 0.80 holds the waist near 1.05.
    // v7 FIX round-1 — neckScale 1.08 put neckOverHead at 0.594 against the
    // producer's amendment 2 ("neck radius ≤ ~0.55 of head radius"). The metric
    // is literally 0.55 × neckScale, so any value over 1.00 is an exceedance.
    // The reference does support a thick gym-bro neck, but a LAW exceedance
    // ships with Alex's explicit sign-off, not silently — so this complies at
    // 1.00 (0.550) and the ask is logged for him.
    // v7 PRODUCER-NOTES round-1 — HIS NECK IS EXEMPT. Producer, 2026-07-31:
    // "Chad: head too small + too round … his neck is GOOD, keep." The NECK
    // canon narrowed the whole cast's column (CharacterBuilder NECK.TOP
    // 0.55R → 0.485R), so holding Chad's RENDERED width where the producer
    // approved it needs the dial to go UP by exactly that ratio:
    // 0.485 × 1.13 = 0.548, which is his old 0.550 to three places — and still
    // inside amendment 2's ≤0.55 cap, so the exemption costs no law.
    shoulderScale: 1.45, waistScale: 0.80, neckScale: 1.13,
  },
  grandma: {
    name: 'Grandma Henderson',
    bodyColor: 0x8888aa, // Shawl color
    pantsColor: 0x9a97a2,   // grey stockings under the skirt (was a trouser tone)
    shirtColor: null,
    tieColor: null,
    skinColor: 0xe6c2a6,
    hairColor: COLORS.HAIR_WHITE,
    hairStyle: 'shawl',      // → 'bun_soft': top bun over a FULL skin head
    // Signature kit per the canonical portrait (round-2 gate): the shawl drape,
    // the cameo at the throat, the cane. Without these the flat periwinkle
    // jumpsuit read institutional-inmate rather than warm knitter.
    accessories: ['cane', 'shawl', 'cameo_brooch'],
    shawlColor: 0xa79fc6,
    // Producer ruling: she may stay a touch petite (~5.5–6 heads) but her FACE
    // must go fully human. heightScale 0.78 measured ≈0.86 of Karen, so the extra
    // 12% comes out of the LEGS (legScale) — the torso/head keep their mass.
    // v7 — headScale 1.10 measured 4.96 heads against the producer's 5.5–6
    // exception for her; 0.95 lands 5.59 and still reads a full head bigger,
    // proportionally, than the rest of the cast.
    // v7 FIX round-1 — headCountSkull measured 5.52 and headCountHair 4.759
    // against LAW 1's 6.5–7.0 with hair on: 1.7 heads short, i.e. squarely in the
    // chibi band the v6 verdict was written to kill. Two independent causes and
    // two fixes: (a) the top bun added 0.38R of hair above the crown — moved to
    // the back crown in buildHair, which is also the sheet's silhouette and which
    // alone recovers ~0.8 heads AND drops figureHeight from 0.815 of Andrew to
    // the bible's ~0.76; (b) headScale 0.95 on a 1.213 crown. Her crown height is
    // NOT the problem — 1.2135/1.5829 = 0.767 is exactly the bible's "~0.76
    // height" — so the head comes down, not the body: 0.84 lands ≈6.1 heads.
    // That splits the producer's stated 5.5–6 exception and LAW 1's 6.5–7.0;
    // going the rest of the way needs Alex's call on which of the two governs.
    // widthScale 1.10 also put her thigh spread at 0.416 against a 0.317 shoulder
    // line — the "giant hip saddlebag masses". 1.02 with the new 0.64 stance.
    heightScale: 0.80, legScale: 0.86, hunch: 0.12, widthScale: 1.02, headScale: 0.84,
    // v7 FIX round-2 — THE SKIRT. grandma_body.png is a full purple dress with a
    // flared mid-calf skirt over grey stockings; the builder had no skirt at all,
    // so she shipped in trousers and was the only hero whose normalized IoU
    // REGRESSED this round (0.4823 → 0.4363). `skirt` builds the cone; the
    // stocking tone goes on the shins, and the shoes are the sheet's black
    // mary-janes rather than the pumps the female default would give her.
    // hem measured off the normalized reference (screenshots/v7/norm/grandma-ref.png):
    // it clears the shoe by about one shoe-height, i.e. ~0.15 of leg length, not
    // the 0.30 the first pass guessed — half a calf of stocking was showing.
    skirt: true, skirtColor: 0x7a6f9c, skirtLength: 0.15, skirtFlare: 1.66,
    shoeColor: 0x24242a, shoeHeel: 0.012, shoeSize: 0.92,
    // v5 face/proportion fields — elderly read
    gender: 'f', age: 'old', eyeColor: 0x4a3a2a, jaw: 0.94, glasses: 'reading',
    lipColor: 0xb0645c, browColor: 0x7d7168,
    // headForward 0.05 was 0.7 of a head-radius of pure translation with nothing
    // bridging it; with the neck now solved to meet the head (CharacterBuilder,
    // headZ) a smaller carry still reads as the dowager's curve.
    lapels: false, shoulderScale: 0.92, headForward: 0.022,
    // LAW 1 "neck is VISIBLE — never sunk": the critic logged "ZERO visible neck".
    neckExtra: 0.012, neckScale: 0.86,
    // FACE SHAPE — soft, round, small-featured; the kindest face in the cast.
    faceWidth: 1.03, cheek: 0.90, browRidge: 0.80, eyeSize: 0.94, mouthWidth: 0.92,
  },
  compliance: {
    tone: 'scary',
    name: 'Compliance Auditor',
    bodyColor: COLORS.SUIT_BLACK,
    pantsColor: 0x1a1a1a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: COLORS.RED_TIE,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'short',
    accessories: ['clipboard', 'sunglasses'],
    // v5 face — stern square auditor jaw (eyes hidden behind the shades)
    gender: 'm', eyeColor: 0x3a2a1c, jaw: 1.08, chin: 1.05,
    // v7 FIX round-1 face shape — severe, planar, heavy supraorbital shelf.
    faceWidth: 1.05, cheek: 1.10, browRidge: 1.18, eyeSize: 0.92,
  },
  regional: {
    name: 'Regional Manager',
    bodyColor: 0x2a2a4a, // Power suit
    pantsColor: 0x2a2a4a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0xdaa520, // Gold tie
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_GRAY,
    hairStyle: 'short',
    accessories: ['golf_putter'],
    widthScale: 1.15, heightScale: 1.04,
    // v5 face — seasoned exec, strong jaw
    gender: 'm', eyeColor: 0x4a3828, jaw: 1.08, chin: 1.05,
    // v7 FIX round-1 face shape — seasoned exec, broad and heavy-browed.
    faceWidth: 1.06, cheek: 1.02, browRidge: 1.10,
  },
  ross_boss: {
    name: 'Skip Hartley (Unhinged)',
    bodyColor: 0x2a4a2a, // Dark power polo
    pantsColor: COLORS.KHAKI,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BROWN,
    hairStyle: 'short',
    accessories: ['bluetooth_earpiece', 'golf_putter'],
    // v5 face — same man as Ross (identical face fields)
    gender: 'm', eyeColor: 0x4a3527, jaw: 1.05, chin: 0.98,
    // v7 FIX round-1 — same man as Ross, so the same face dials.
    faceWidth: 1.07, cheek: 0.90, browRidge: 0.86,
  },
  rachel: {
    tone: 'scary',
    name: 'Meredith Sterling',
    bodyColor: 0x1a1a3a, // Navy power suit
    pantsColor: 0x1a1a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: 0xc0c0c0, // Silver
    hairStyle: 'bob',
    accessories: ['tablet', 'pearl_earrings'],
    heightScale: 1.08, widthScale: 0.86, hunch: -0.05,
    // v6 face — sharp/angular, cold steel eyes, severe cool lip (jaw clamped to
    // the human band 0.85; her severity lives in the tall/narrow silhouette)
    gender: 'f', eyeColor: 0x6a7078, lipColor: 0x9a5560, jaw: 0.88, chin: 1.02,
    // v7 FIX round-1 face shape — LAW 7 #7 "tall, narrow, sharp". Without dials
    // her solved layout hashed IDENTICAL to Andrew's; she is the cast's second
    // boss and cannot share a skull with the player.
    faceWidth: 0.89, cheek: 1.18, browRidge: 1.04, eyeSize: 0.94, mouthWidth: 0.94,
  },
  // Rachel — trust officer in the cubicle farm. NOT Meredith Sterling above
  // (whose internal ids are `rachel` / `rachel_boss`). Quiet, warm, first one in.
  // Draft field mapping: the draft labelled 0xf0d6b0 "fair skin" and 0x7a9ab5
  // "soft blue blouse". In this builder `bodyColor` IS the torso garment and
  // `skinColor` is skin, so the two values are assigned by intent, not by the
  // field names in the draft.
  rachel_to: {
    tone: 'warm',
    name: 'Rachel',
    bodyColor: 0x7a9ab5,   // soft blue blouse — not corporate-severe, not casual
    pantsColor: 0x3a3a5a,  // navy trousers
    shirtColor: null,      // blouse only; no jacket-over-shirt collar wedge
    tieColor: null,
    skinColor: 0xf0d6b0,   // fair skin
    hairColor: 0xd4b87a,   // long blonde
    hairStyle: 'long',     // long-hair sculpt implemented in CharacterBuilder
    shoeColor: 0x3a2a1a,
    // face — warm, unperformed; hazel-green eyes rather than steel
    gender: 'f', eyeColor: 0x6a8a5a, jaw: 1.0, chin: 1.0,
  },
  isaiah: {
    name: 'Isaiah',
    bodyColor: 0x3a5a8a, // Blue button-down
    pantsColor: 0x2a2a3a,
    shirtColor: null,
    tieColor: null,
    // v6 round-5 — Hispanic redo per the producer: warm medium-tan skin and
    // near-black hair with a warm cast (COLORS.SKIN_DARK/HAIR_DARK read as the
    // Janitor's/Diane's deep tone, which is not this character). His dignity stays
    // in the stance and the level, unhurried face — nothing else changes.
    skinColor: 0xd9a173,
    hairColor: 0x2b1d12,
    hairStyle: 'short',
    accessories: ['glasses'],
    // v5 face — calm balanced Stoic, deep-brown eyes
    gender: 'm', eyeColor: 0x2e1d12, jaw: 0.96, chin: 1.0, browColor: 0x241708,
  },
  hr_rep: {
    name: 'HR Representative',
    bodyColor: 0x6a4a8a, // Purple blazer
    pantsColor: 0x2a2a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BROWN,
    hairStyle: 'bun',
    accessories: ['clipboard'],
    // v5 face
    gender: 'f', eyeColor: 0x4a3325, lipColor: 0xb0655c, jaw: 0.94,
  },
  security_guard: {
    name: 'Security Guard',
    bodyColor: 0x2a2a4a, // Dark uniform
    pantsColor: 0x2a2a4a,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN_DARK,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'short',
    accessories: [],
    // v7 — headScale 0.95 against a 1.08 body measured 7.75 heads (LAW 1 caps at
    // 7.0): a pin head on a slab. 1.08 tracks the body; his bulk lives in
    // widthScale, which is where a bouncer's bulk belongs.
    widthScale: 1.28, heightScale: 1.08, headScale: 1.08,
    // v5 face — broad, strong square jaw
    gender: 'm', eyeColor: 0x2e1d12, jaw: 0.92, chin: 1.06,
  },
  cfos_assistant: {
    name: 'CFO\'s Assistant',
    bodyColor: 0x1a3a5a, // Navy power suit
    pantsColor: 0x1a2a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0xc0a020, // Gold tie
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BROWN,
    hairStyle: 'slick',
    accessories: ['glasses'],
    heightScale: 1.02, widthScale: 0.88,
    // v5 face — sharp corporate climber
    gender: 'm', eyeColor: 0x4a3828, jaw: 0.98, chin: 1.02,
  },
  regional_director: {
    tone: 'scary',
    name: 'Regional Director',
    bodyColor: 0x2a1a4a, // Deep purple executive suit
    pantsColor: 0x1a1a2a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0x8a0000, // Crimson tie
    skinColor: COLORS.SKIN_DARK,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'short',
    accessories: [],
    heightScale: 1.1, widthScale: 1.12,
    // v5 face — imposing, strong jaw
    gender: 'm', eyeColor: 0x33241a, jaw: 1.08, chin: 1.06,
  },
  algorithm: {
    name: 'The Algorithm',
    build: 'monolith', // floating obsidian slab — not a person, never was
    bodyColor: 0x001a33,
    pantsColor: 0x001020,
    shirtColor: 0x00aaff,
    tieColor: null,
    skinColor: 0x88ccff,
    hairColor: 0x00ffff,
    hairStyle: 'short',
    accessories: [],
  },
  // Act 5 restructuring team
  brand_consultant: {
    name: 'Brand Consultant',
    bodyColor: 0xcc6633, // burnt-orange blazer
    pantsColor: 0x2a2a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0xddaa00, // gold tie
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BLONDE,
    hairStyle: 'slick',
    accessories: ['clipboard'],
    // v5 face — blonde consultant, warm-hazel eyes
    gender: 'm', eyeColor: 0x5a4830, jaw: 0.98, chin: 1.0,
  },
  restructuring_analyst: {
    name: 'Restructuring Analyst',
    bodyColor: 0x3a3a5a, // dark slate suit
    pantsColor: 0x2a2a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0x554488, // purple tie
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'short',
    accessories: ['glasses'],
    // v5 face
    gender: 'm', eyeColor: 0x3a2a1c, jaw: 0.96, chin: 1.0,
  },
  corporate_lawyer: {
    tone: 'scary',
    name: 'Corporate Lawyer',
    bodyColor: COLORS.SUIT_BLACK,
    pantsColor: 0x1a1a1a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: COLORS.RED_TIE,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_GRAY,
    hairStyle: 'slick',
    accessories: ['clipboard', 'glasses'],
    // v5 face — senior, stern; cold gray eyes match the gray hair
    gender: 'm', eyeColor: 0x5a5560, jaw: 1.00, chin: 1.04,
  },
  data_analytics_lead: {
    name: 'Data Analytics Lead',
    bodyColor: 0x1a4a6a, // teal-navy blazer
    pantsColor: 0x1a2a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0x00aacc, // cyan tie
    skinColor: COLORS.SKIN_DARK,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'short',
    accessories: ['glasses'],
    // v5 face
    gender: 'm', eyeColor: 0x2e1d12, jaw: 0.96, chin: 1.0,
  },
  chief_of_restructuring: {
    tone: 'scary',
    name: 'Chief of Restructuring',
    bodyColor: 0x1a1a3a, // near-black power suit
    pantsColor: 0x111122,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0x8a0000, // crimson tie
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_WHITE,
    hairStyle: 'short',
    accessories: ['clipboard'],
    heightScale: 1.12, widthScale: 1.06,
    // v5 face — imposing, icy pale eyes to match the white hair, strong jaw
    gender: 'm', eyeColor: 0x60636c, jaw: 1.08, chin: 1.05,
  },
  rachel_boss: {
    tone: 'scary',
    name: 'Meredith Sterling, SVP',
    bodyColor: 0x1a1a3a, // navy power suit
    pantsColor: 0x1a1a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: 0xc0c0c0, // silver
    hairStyle: 'bob',
    accessories: ['tablet', 'pearl_earrings'],
    heightScale: 1.08, widthScale: 0.86, hunch: -0.05,
    // v6 face — identical to Rachel (same woman, boss form); jaw in the band
    gender: 'f', eyeColor: 0x6a7078, lipColor: 0x9a5560, jaw: 0.98, chin: 1.02,
  },

  // ── Act 6½ city cast ──────────────────────────────────────────────
  delia: {
    name: 'Delia Okafor',
    bodyColor: 0x7a5a6a,        // plum cardigan
    pantsColor: 0x3a3642,
    shirtColor: 0xe8e0d0,
    tieColor: null,
    skinColor: COLORS.SKIN_DARK,
    hairColor: 0xc8c4bc,        // silver locs
    hairStyle: 'bun',
    accessories: ['glasses'],
    heightScale: 0.9, hunch: 0.08, headScale: 1.05,
    // v5 face — retired Deputy Recorder, warm elder, kind deep-brown eyes
    gender: 'f', age: 'old', eyeColor: 0x3a2818, lipColor: 0xa8655c, jaw: 0.96, chin: 1.0,
  },
  parking_enforcer: {
    name: 'Officer Reyes',
    bodyColor: 0x2a4a6a,        // municipal blue
    pantsColor: 0x1a2a3a,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN_DARK,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'backwards_cap',
    accessories: ['clipboard'],
    widthScale: 1.15, browAngle: -0.15,
    // v5 face — broad, stern municipal jaw
    // prose is canon: Reyes is 'she' in her own dialog (sheet-batch catch)
    gender: 'f', eyeColor: 0x2e1d12, jaw: 1.08, chin: 1.05,
  },
  networking_guy: {
    tone: 'silly',
    name: 'The Networking Guy',
    bodyColor: 0x3a6a8a,        // quarter-zip
    pantsColor: 0x4a4a52,
    shirtColor: 0xe8e8e8,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BROWN,
    hairStyle: 'slick',
    accessories: ['bluetooth_earpiece'],
    taper: 1.25, mouthWidth: 1.3,
    // v5 face — glad-handing salesman
    gender: 'm', eyeColor: 0x4a3828, jaw: 1.00, chin: 1.0,
  },
  bus_driver: {
    name: 'Marlene',
    bodyColor: 0x4a4a5a,        // transit authority gray
    pantsColor: 0x2a2a32,
    shirtColor: 0xc8d0d8,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: 0xb84a2a,        // henna red
    hairStyle: 'bun',
    accessories: ['sunglasses'],
    widthScale: 1.1,
    // v5 face — bold lip (eyes behind the shades)
    gender: 'f', eyeColor: 0x4a3020, lipColor: 0xb05a50, jaw: 0.98, chin: 1.02,
  },
  records_clerk: {
    name: 'The Clerk',
    bodyColor: 0x5a5a52,        // archival beige-gray
    pantsColor: 0x3a3a34,
    shirtColor: 0xe8e4d8,
    tieColor: 0x6a5a3a,
    skinColor: 0xe8d0b0,        // indoor pallor
    hairColor: 0x8a8478,
    hairStyle: 'slick',
    accessories: ['glasses'],
    heightScale: 1.04, widthScale: 0.85, browAngle: 0.05,
    // v5 face — gaunt, pale, washed-out eyes (Borges' librarian)
    gender: 'm', eyeColor: 0x4a4238, jaw: 0.88, chin: 1.0,
  },
  diner_regular: {
    name: 'Earl',
    bodyColor: 0x6a4a3a,        // flannel brown
    pantsColor: 0x3a3e44,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_GRAY,
    hairStyle: 'short',
    beard: true,
    beardColor: 0xb8b0a0,
    accessories: ['coffee_mug'],
    widthScale: 1.12, hunch: 0.08,
    // v5 face — weathered old regular, broad jaw
    gender: 'm', age: 'old', eyeColor: 0x4a3828, jaw: 1.04, chin: 1.04,
  },
  barista: {
    name: 'Jules',
    bodyColor: 0x3a4a3a,        // forest apron
    pantsColor: 0x2a2a32,
    shirtColor: 0xd8d4c8,
    tieColor: null,
    skinColor: COLORS.SKIN_DARK,
    hairColor: 0x1a1a22,
    hairStyle: 'bun',
    accessories: [],
    heightScale: 0.96,
    // v5 face — young, soft, subtle lip
    gender: 'f', eyeColor: 0x2e1d12, lipColor: 0xa5605a, jaw: 0.90, chin: 0.96,
  },
  // The Firm — they move like a school of fish
  firm_partner: {
    tone: 'scary',
    name: 'The Firm (Partner)',
    bodyColor: 0x16161e,
    pantsColor: 0x16161e,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0x8a8a92,
    skinColor: COLORS.SKIN,
    hairColor: 0x6a6a72,
    hairStyle: 'slick',
    accessories: ['tablet'],
    heightScale: 1.08, widthScale: 0.9, browAngle: -0.1,
    // v5 face — chorus: identical cold steel eyes + sharp jaw across all three
    gender: 'm', eyeColor: 0x6a6e78, jaw: 0.88, chin: 1.02,
  },
  firm_associate: {
    tone: 'scary',
    name: 'The Firm (Associate)',
    bodyColor: 0x1a1a24,
    pantsColor: 0x1a1a24,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0x8a8a92,
    skinColor: COLORS.SKIN,
    hairColor: 0x3a3a42,
    hairStyle: 'slick',
    accessories: ['clipboard'],
    heightScale: 1.02, widthScale: 0.88, browAngle: -0.1,
    // v5 face — chorus uniformity: same steel eyes + jaw as the Partner
    gender: 'm', eyeColor: 0x6a6e78, jaw: 0.88, chin: 1.02,
  },
  firm_paralegal: {
    tone: 'scary',
    name: 'The Firm (Paralegal)',
    bodyColor: 0x20202a,
    pantsColor: 0x20202a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0x8a8a92,
    skinColor: COLORS.SKIN,
    hairColor: 0x4a4a52,
    hairStyle: 'bob',
    accessories: ['glasses'],
    heightScale: 0.96, widthScale: 0.85, browAngle: -0.1,
    // v5 face — chorus: same steel eyes, cold muted lip, sharp jaw
    gender: 'f', eyeColor: 0x6a6e78, lipColor: 0x8a5a5e, jaw: 0.88, chin: 1.02,
  },

  // Mutable placeholder — overwritten by ExplorationState before each reception fight
  reception_client: {
    name: 'Prospective Client',
    bodyColor: COLORS.SUIT_BLUE,
    pantsColor: 0x2a2a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: COLORS.BLUE_TIE,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BROWN,
    hairStyle: 'short',
    accessories: [],
    // v5 face — neutral default (visual fields spread over by ClientGenerator)
    gender: 'm', eyeColor: 0x4a3020, jaw: 0.96, chin: 1.0,
  },

  // ── THE BOARD ────────────────────────────────────────────────────────────
  // Generic suits for the Board Room's fourteen executive chairs. `board_meeting`
  // addresses eleven people for 178 nodes; before these existed it addressed
  // fourteen empty chairs. They are anonymous by design — same principle as
  // `reception_client` — but each needs its OWN id, because
  // `tools/_ux-dev.mjs` counts duplicate NPC ids per room and room data is
  // where these bodies live (a stage `spawn` cannot address twelve actors that
  // share one id either: `_resolveActor` returns the first match every time).
  // `board_chair` is the chairperson; she sits at the middle of the NORTH side,
  // directly across the table from Andrew — the HEAD chair at (3,5) has to stay
  // empty, because three separate closing lines say Skip sits down and that is
  // the only seat within one step of where he gives the speech.
  // The Board Member in seat twelve (north side, x:11) is deliberately NOT
  // cast here — his crossing on `board_member_spoke` is a producer casting
  // call, so he is a suit like the rest until that call is made.
  board_chair: {
    name: 'Board Chair',
    bodyColor: 0x2a2a38, pantsColor: 0x22222c, shirtColor: COLORS.SHIRT_WHITE, tieColor: null,
    skinColor: COLORS.SKIN, hairColor: COLORS.HAIR_GRAY, hairStyle: 'bob',
    accessories: ['glasses'],
    gender: 'f', eyeColor: 0x3a2c1e, lipColor: 0xa85f58, jaw: 0.93, chin: 0.98,
  },
  board_member_1:  { name: 'Board Member', bodyColor: 0x232838, pantsColor: 0x1e2130, shirtColor: COLORS.SHIRT_WHITE, tieColor: 0x7a2230, skinColor: COLORS.SKIN,      hairColor: COLORS.HAIR_GRAY,  hairStyle: 'short', accessories: [],          gender: 'm', eyeColor: 0x3d2c1c, jaw: 1.02, chin: 1.02 },
  board_member_2:  { name: 'Board Member', bodyColor: 0x30303a, pantsColor: 0x282830, shirtColor: COLORS.SHIRT_WHITE, tieColor: null,     skinColor: COLORS.SKIN_DARK, hairColor: COLORS.HAIR_DARK,  hairStyle: 'bun',   accessories: ['glasses'], gender: 'f', eyeColor: 0x2c1d12, lipColor: 0x9d5b52, jaw: 0.92 },
  board_member_3:  { name: 'Board Member', bodyColor: 0x1d2a3c, pantsColor: 0x1a2230, shirtColor: 0xdfe4ea,           tieColor: 0x2b4b7a, skinColor: COLORS.SKIN,      hairColor: COLORS.HAIR_WHITE, hairStyle: 'short', accessories: [],          gender: 'm', eyeColor: 0x4a3828, jaw: 0.97, chin: 1.04, heightScale: 0.97 },
  board_member_4:  { name: 'Board Member', bodyColor: 0x3a2f2a, pantsColor: 0x2e2622, shirtColor: COLORS.SHIRT_WHITE, tieColor: 0x5a6a3a, skinColor: COLORS.SKIN_DARK, hairColor: COLORS.HAIR_DARK,  hairStyle: 'slick', accessories: [],          gender: 'm', eyeColor: 0x33241a, jaw: 1.05, chin: 1.0,  widthScale: 1.08 },
  board_member_5:  { name: 'Board Member', bodyColor: 0x262632, pantsColor: 0x20202a, shirtColor: 0xe8e2d8,           tieColor: null,     skinColor: COLORS.SKIN,      hairColor: COLORS.HAIR_BLONDE, hairStyle: 'bob',  accessories: [],          gender: 'f', eyeColor: 0x4a5a6a, lipColor: 0xb0655c, jaw: 0.95 },
  board_member_6:  { name: 'Board Member', bodyColor: 0x2c3448, pantsColor: 0x252b3a, shirtColor: COLORS.SHIRT_WHITE, tieColor: 0x8a7420, skinColor: COLORS.SKIN,      hairColor: COLORS.HAIR_GRAY,  hairStyle: 'short', accessories: ['glasses'], gender: 'm', eyeColor: 0x3a2c1e, jaw: 0.99, chin: 0.98, heightScale: 1.03 },
  board_member_7:  { name: 'Board Member', bodyColor: 0x1f1f26, pantsColor: 0x1b1b21, shirtColor: 0xd9d4cc,           tieColor: 0x30507a, skinColor: COLORS.SKIN_DARK, hairColor: COLORS.HAIR_GRAY,  hairStyle: 'short', accessories: [],          gender: 'm', eyeColor: 0x2e1d12, jaw: 1.0,  chin: 1.06 },
  board_member_8:  { name: 'Board Member', bodyColor: 0x35303c, pantsColor: 0x2b2732, shirtColor: COLORS.SHIRT_WHITE, tieColor: null,     skinColor: COLORS.SKIN,      hairColor: COLORS.HAIR_BROWN, hairStyle: 'long',  accessories: [],          gender: 'f', eyeColor: 0x4a3325, lipColor: 0xa8564f, jaw: 0.94, heightScale: 0.98 },
  board_member_9:  { name: 'Board Member', bodyColor: 0x22303a, pantsColor: 0x1e2830, shirtColor: 0xe4e8ec,           tieColor: 0x6a2230, skinColor: COLORS.SKIN,      hairColor: COLORS.HAIR_DARK,  hairStyle: 'slick', accessories: [],          gender: 'm', eyeColor: 0x33241a, jaw: 1.03, chin: 1.0 },
  board_member_10: { name: 'Board Member', bodyColor: 0x2e2a24, pantsColor: 0x272420, shirtColor: COLORS.SHIRT_WHITE, tieColor: 0x3a5a4a, skinColor: COLORS.SKIN_DARK, hairColor: COLORS.HAIR_WHITE, hairStyle: 'bun',   accessories: ['glasses'], gender: 'f', eyeColor: 0x2c1d12, lipColor: 0x94564e, jaw: 0.91 },
  // Seat twelve — north side, x:11. The man who has not spoken since 1988.
  // Oldest read in the room; still a generic suit until casting says otherwise.
  board_member_twelve: { name: 'Board Member', bodyColor: 0x1c1c22, pantsColor: 0x18181e, shirtColor: 0xd0cbc2,       tieColor: 0x3a3a44, skinColor: COLORS.SKIN,      hairColor: COLORS.HAIR_WHITE, hairStyle: 'short', accessories: [],          gender: 'm', eyeColor: 0x53483c, jaw: 0.94, chin: 1.03, heightScale: 0.95, widthScale: 0.94 },
};

// Apply character-overrides.json (set via npm run editor)
for (const [id, ov] of Object.entries(_charOverrides)) {
  if (CHARACTER_CONFIGS[id]) Object.assign(CHARACTER_CONFIGS[id], ov);
}
