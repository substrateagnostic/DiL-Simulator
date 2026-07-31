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
    gender: 'm', eyeColor: 0x4a3222, jaw: 0.88, chin: 1.02,
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
    gender: 'm', eyeColor: 0x4a3527, jaw: 0.85, chin: 0.98,
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
    gender: 'f', eyeColor: 0x5a4030, lipColor: 0x9a5a54, jaw: 0.81,
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
    gender: 'm', eyeColor: 0x6a6238, jaw: 0.84, chin: 1.02,
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
    widthScale: 1.10, heightScale: 0.92, headScale: 1.05,
    // THE HUNCHED-IN SILHOUETTE. His spine and shoulders were as erect and square
    // as Andrew's, so he read as a composed junior associate rather than the
    // portrait's terrified intern. hunch 0→0.15 (forward spine), headPitch 0.14
    // (≈8° cervical curl), shoulderLift 0.02 (shoulders in AND up).
    hunch: 0.15, headPitch: 0.14, shoulderLift: 0.02, shoulderScale: 0.90,
    neckScale: 0.68,       // slight timid teenager — a slim neck, not jaw-wide
    // Portrait has NO glasses and warm-brown hair; the raised 'short' hairline now
    // shows a strip of forehead so fringe / brow / eyes still read as three bands.
    // v5 face — young, timid, small chin (early-Charlie-Brown big head)
    gender: 'm', eyeColor: 0x4a3a2a, jaw: 0.88, chin: 0.94, browColor: 0x3a2a1c,
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
    gender: 'f', eyeColor: 0x2e1d12, lipColor: 0xa5605a, jaw: 0.83,
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
    gender: 'm', age: 'old', eyeColor: 0x3a2818, jaw: 0.86, chin: 1.02,
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
    hunch: 0.06, headScale: 1.05,
    // THE NECK (producer: "too much neck and none at all"). A narrower column
    // (0.92→0.76) plus 0.024 of extra length gives a clear, correctly-proportioned
    // lit taper between jaw and collar instead of a short wide skin slab.
    neckScale: 0.76, neckExtra: 0.046,
    // The pink blazer used to terminate exactly at the leg-split Y with zero hem
    // relief — a pink leotard over leggings. Now a real hem 0.07 below the hip.
    jacketHem: 0.07, necklineWide: true,
    // v5 face/proportion fields — bold DARK brows + red lip per the portrait
    gender: 'f', eyeColor: 0x3a2a1c, jaw: 0.88, chin: 0.94, lipColor: 0xc83a52, browColor: 0x3e2f20, headForward: 0.02,
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
    // The polo hem used to dip ~0.06 BELOW the belt with khaki thighs starting
    // separately underneath — briefs-over-pants. The shell now ends AT the
    // waistband and a real trouser rise owns the pelvis.
    trouserRise: 0.10, jacketHem: -0.098,
    muscular: true,        // deltoid/bicep swell lives in the ARM loft (LAW 2)
    lapels: false,         // a POLO, not a blazer — kill the rectangular pec-slab lapels
    polo: true,            // knit collar + placket, so the garment CLASS reads as a polo
    shortSleeve: true,     // red polo w/ BARE muscular forearms (was red long sleeves)
    beard: 'stubble', beardColor: 0x55452c, // portrait stubble (deeper than 0x6a5236)
    widthScale: 1.06, heightScale: 1.06, headScale: 1.0,
    // v5 face/proportion fields. Round-4: chin 1.08→1.00 and jaw 0.98→0.94 —
    // the nose-to-chin span measured ~45% of the skull, outside LAW 4's ±15% band
    // ("shorten the jaw shell ~8%"). The eye line rises back toward 50% with it.
    gender: 'm', eyeColor: 0x3a2a1a, jaw: 0.94, chin: 1.00, browColor: 0x4a3720,
    // Round-4 — THE GYM-BRO V. His shoulder line was congruent with the Intern's
    // (~2.3 head-widths on both). shoulderScale 1.22→1.45 against the stronger
    // broad-response, plus `muscular` arms, lands the deltoid line at ≈2.6
    // head-widths in ONE loft while waistScale 0.80 holds the waist near 1.05.
    shoulderScale: 1.45, waistScale: 0.80, neckScale: 1.08,
  },
  grandma: {
    name: 'Grandma Henderson',
    bodyColor: 0x8888aa, // Shawl color
    pantsColor: 0x6a6a7a,
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
    heightScale: 0.80, legScale: 0.86, hunch: 0.12, widthScale: 1.10, headScale: 1.10,
    // v5 face/proportion fields — elderly read
    gender: 'f', age: 'old', eyeColor: 0x4a3a2a, jaw: 0.92, glasses: 'reading',
    lipColor: 0xb0645c, browColor: 0x8a8078,
    lapels: false, shoulderScale: 0.92, headForward: 0.05,
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
    gender: 'm', eyeColor: 0x3a2a1c, jaw: 0.88, chin: 1.05,
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
    gender: 'm', eyeColor: 0x4a3828, jaw: 0.90, chin: 1.05,
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
    gender: 'm', eyeColor: 0x4a3527, jaw: 0.85, chin: 0.98,
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
    gender: 'f', eyeColor: 0x6a7078, lipColor: 0x9a5560, jaw: 0.85, chin: 1.02,
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
    gender: 'm', eyeColor: 0x2e1d12, jaw: 0.84, chin: 1.0, browColor: 0x241708,
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
    gender: 'f', eyeColor: 0x4a3325, lipColor: 0xb0655c, jaw: 0.83,
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
    widthScale: 1.28, heightScale: 1.08, headScale: 0.95,
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
    gender: 'm', eyeColor: 0x4a3828, jaw: 0.85, chin: 1.02,
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
    gender: 'm', eyeColor: 0x33241a, jaw: 0.90, chin: 1.06,
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
    gender: 'm', eyeColor: 0x5a4830, jaw: 0.85, chin: 1.0,
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
    gender: 'm', eyeColor: 0x3a2a1c, jaw: 0.84, chin: 1.0,
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
    gender: 'm', eyeColor: 0x5a5560, jaw: 0.86, chin: 1.04,
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
    gender: 'm', eyeColor: 0x2e1d12, jaw: 0.84, chin: 1.0,
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
    gender: 'm', eyeColor: 0x60636c, jaw: 0.90, chin: 1.05,
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
    gender: 'f', eyeColor: 0x6a7078, lipColor: 0x9a5560, jaw: 0.85, chin: 1.02,
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
    gender: 'f', age: 'old', eyeColor: 0x3a2818, lipColor: 0xa8655c, jaw: 0.84, chin: 1.0,
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
    gender: 'f' // prose is canon: Reyes is 'she' in her own dialog (sheet-batch catch), eyeColor: 0x2e1d12, jaw: 0.90, chin: 1.05,
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
    gender: 'm', eyeColor: 0x4a3828, jaw: 0.86, chin: 1.0,
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
    gender: 'f', eyeColor: 0x4a3020, lipColor: 0xb05a50, jaw: 0.85, chin: 1.02,
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
    gender: 'm', eyeColor: 0x4a4238, jaw: 0.80, chin: 1.0,
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
    gender: 'm', age: 'old', eyeColor: 0x4a3828, jaw: 0.88, chin: 1.04,
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
    gender: 'f', eyeColor: 0x2e1d12, lipColor: 0xa5605a, jaw: 0.81, chin: 0.96,
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
    gender: 'm', eyeColor: 0x6a6e78, jaw: 0.80, chin: 1.02,
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
    gender: 'm', eyeColor: 0x6a6e78, jaw: 0.80, chin: 1.02,
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
    gender: 'f', eyeColor: 0x6a6e78, lipColor: 0x8a5a5e, jaw: 0.80, chin: 1.02,
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
    gender: 'm', eyeColor: 0x4a3020, jaw: 0.84, chin: 1.0,
  },
};

// Apply character-overrides.json (set via npm run editor)
for (const [id, ov] of Object.entries(_charOverrides)) {
  if (CHARACTER_CONFIGS[id]) Object.assign(CHARACTER_CONFIGS[id], ov);
}
