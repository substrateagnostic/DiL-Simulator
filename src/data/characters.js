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
    accessories: ['coffee_mug'],
  },
  ross: {
    tone: 'silly',
    name: 'Ross',
    bodyColor: COLORS.POLO_GREEN,
    pantsColor: COLORS.KHAKI,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BROWN,
    hairStyle: 'short',
    accessories: ['bluetooth_earpiece', 'boss_mug'],
    shoeSize: 0.75,
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
  },
  alex_it: {
    name: 'Alex from IT',
    bodyColor: COLORS.HAWAIIAN,
    pantsColor: 0x5a5a3a,
    shirtColor: 0x8a6a4a, // plaid flannel under the hawaiian
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: 0x9a7a4a, // sandy brown
    hairStyle: 'short',
    beard: true,
    beardColor: 0x8a5f38, // ginger-brown
    accessories: [],
  },
  intern: {
    tone: 'silly',
    name: 'The Intern',
    bodyColor: 0x4a4a6a, // Oversized suit (gray-blue)
    pantsColor: 0x3a3a4a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0x884422,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'short',
    accessories: ['name_tag'],
    widthScale: 1.18, heightScale: 0.92, headScale: 1.05,
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
  },
  karen: {
    tone: 'silly',
    name: 'Karen Henderson',
    bodyColor: 0xcc6688,
    pantsColor: 0x2a2a3a,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BLONDE,
    hairStyle: 'karen',
    accessories: ['purse'],
    hunch: 0.14, headScale: 1.05,
  },
  chad: {
    tone: 'silly',
    name: 'Chad Henderson',
    bodyColor: 0xcc4444, // Red polo
    pantsColor: COLORS.KHAKI,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BLONDE,
    hairStyle: 'backwards_cap',
    accessories: ['protein_shake'],
    widthScale: 1.35, heightScale: 1.06, headScale: 0.92,
  },
  grandma: {
    name: 'Grandma Henderson',
    bodyColor: 0x8888aa, // Shawl color
    pantsColor: 0x6a6a7a,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_WHITE,
    hairStyle: 'shawl',
    accessories: ['cane'],
    heightScale: 0.76, hunch: 0.38, widthScale: 1.12, headScale: 1.12,
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
  },
  ross_boss: {
    name: 'Ross (Unhinged)',
    bodyColor: 0x2a4a2a, // Dark power polo
    pantsColor: COLORS.KHAKI,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BROWN,
    hairStyle: 'short',
    accessories: ['bluetooth_earpiece', 'golf_putter'],
  },
  rachel: {
    tone: 'scary',
    name: 'Rachel',
    bodyColor: 0x1a1a3a, // Navy power suit
    pantsColor: 0x1a1a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: 0xc0c0c0, // Silver
    hairStyle: 'bob',
    accessories: ['tablet', 'pearl_earrings'],
    heightScale: 1.08, widthScale: 0.86, hunch: -0.05,
  },
  isaiah: {
    name: 'Isaiah',
    bodyColor: 0x3a5a8a, // Blue button-down
    pantsColor: 0x2a2a3a,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN_DARK,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'short',
    accessories: ['glasses'],
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
  },
  rachel_boss: {
    tone: 'scary',
    name: 'Rachel, SVP',
    bodyColor: 0x1a1a3a, // navy power suit
    pantsColor: 0x1a1a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: 0xc0c0c0, // silver
    hairStyle: 'bob',
    accessories: ['tablet', 'pearl_earrings'],
    heightScale: 1.08, widthScale: 0.86, hunch: -0.05,
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
  },
};

// Apply character-overrides.json (set via npm run editor)
for (const [id, ov] of Object.entries(_charOverrides)) {
  if (CHARACTER_CONFIGS[id]) Object.assign(CHARACTER_CONFIGS[id], ov);
}
