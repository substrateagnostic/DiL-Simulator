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
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN_DARK,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'short',
    accessories: [],
  },
  intern: {
    name: 'The Intern',
    bodyColor: 0x4a4a6a, // Oversized suit (gray-blue)
    pantsColor: 0x3a3a4a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0x884422,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'short',
    accessories: ['name_tag'],
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
  garage_worker: {
    name: 'Parking Attendant',
    bodyColor: 0xe87722,   // hi-vis orange vest
    pantsColor: 0x334455,  // dark navy work pants
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN_MEDIUM,
    hairColor: COLORS.HAIR_BROWN,
    hairStyle: 'short',
    accessories: [],
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
    accessories: ['mop', 'gold_rolex'],
  },
  karen: {
    name: 'Karen Henderson',
    bodyColor: 0xcc6688,
    pantsColor: 0x2a2a3a,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BLONDE,
    hairStyle: 'karen',
    accessories: ['purse'],
  },
  chad: {
    name: 'Chad Henderson',
    bodyColor: 0xcc4444, // Red polo
    pantsColor: COLORS.KHAKI,
    shirtColor: null,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_BLONDE,
    hairStyle: 'backwards_cap',
    accessories: ['protein_shake'],
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
  },
  compliance: {
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
    name: 'Rachel',
    bodyColor: 0x1a1a3a, // Navy power suit
    pantsColor: 0x1a1a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: 0xc0c0c0, // Silver
    hairStyle: 'bob',
    accessories: ['tablet', 'pearl_earrings'],
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
  },
  regional_director: {
    name: 'Regional Director',
    bodyColor: 0x2a1a4a, // Deep purple executive suit
    pantsColor: 0x1a1a2a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0x8a0000, // Crimson tie
    skinColor: COLORS.SKIN_DARK,
    hairColor: COLORS.HAIR_DARK,
    hairStyle: 'short',
    accessories: [],
  },
  algorithm: {
    name: 'The Algorithm',
    bodyColor: 0x001a33, // Dark digital blue
    pantsColor: 0x001020,
    shirtColor: 0x00aaff, // Glowing blue
    tieColor: null,
    skinColor: 0x88ccff, // Pale digital skin
    hairColor: 0x00ffff, // Cyan hair
    hairStyle: 'short',
    accessories: ['glasses'],
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
    name: 'Chief of Restructuring',
    bodyColor: 0x1a1a3a, // near-black power suit
    pantsColor: 0x111122,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: 0x8a0000, // crimson tie
    skinColor: COLORS.SKIN,
    hairColor: COLORS.HAIR_WHITE,
    hairStyle: 'short',
    accessories: ['clipboard'],
  },
  rachel_boss: {
    name: 'Rachel, SVP',
    bodyColor: 0x1a1a3a, // navy power suit
    pantsColor: 0x1a1a3a,
    shirtColor: COLORS.SHIRT_WHITE,
    tieColor: null,
    skinColor: COLORS.SKIN,
    hairColor: 0xc0c0c0, // silver
    hairStyle: 'bob',
    accessories: ['tablet', 'pearl_earrings'],
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
