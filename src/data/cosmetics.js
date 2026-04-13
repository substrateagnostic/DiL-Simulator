// Equippable cosmetic items — visual changes + optional minor stat bonuses
// Slots: hat, glasses, badge, accessory
// Unlocked via story milestones, quest completion, combat drops

export const COSMETIC_SLOTS = ['hat', 'glasses', 'badge', 'accessory'];

export const COSMETICS = {
  // --- Hats ---
  visor_green: {
    name: 'Accountant\'s Visor',
    description: 'Classic green banker\'s visor. +1 DEF',
    slot: 'hat',
    stats: { def: 1 },
    visual: { type: 'visor', color: 0x22aa44 },
    unlock: 'default', // available from start
  },
  party_hat: {
    name: 'Party Hat',
    description: 'Left over from the office birthday party. +1 SPD',
    slot: 'hat',
    stats: { spd: 1 },
    visual: { type: 'party_hat', color: 0xff4488 },
    unlock: { flag: 'karen_defeated' },
  },
  tin_foil_hat: {
    name: 'Tin Foil Hat',
    description: 'For when the conspiracy theories get too real. +2 DEF',
    slot: 'hat',
    stats: { def: 2 },
    visual: { type: 'tin_foil', color: 0xcccccc },
    unlock: { flag: 'archive_found' },
  },
  executives_fedora: {
    name: 'Executive\'s Fedora',
    description: 'Found in the executive floor coat closet. +2 ATK',
    slot: 'hat',
    stats: { atk: 2 },
    visual: { type: 'fedora', color: 0x333333 },
    unlock: { flag: 'executive_floor_visited' },
  },

  // --- Glasses ---
  reading_glasses: {
    name: 'Reading Glasses',
    description: 'Helps you see the fine print. +1 ATK',
    slot: 'glasses',
    stats: { atk: 1 },
    visual: { type: 'glasses', color: 0x888888 },
    unlock: 'default',
  },
  blue_light_blockers: {
    name: 'Blue Light Blockers',
    description: 'Protection from screen-induced headaches. +1 DEF, +1 SPD',
    slot: 'glasses',
    stats: { def: 1, spd: 1 },
    visual: { type: 'glasses', color: 0x4488ff },
    unlock: { quest: 'anomaly_347' },
  },
  power_shades: {
    name: 'Power Shades',
    description: 'The kind worn in hostile negotiations. +2 ATK',
    slot: 'glasses',
    stats: { atk: 2 },
    visual: { type: 'sunglasses', color: 0x111111 },
    unlock: { flag: 'chad_defeated' },
  },

  // --- Badges ---
  intern_badge: {
    name: 'Intern Badge',
    description: '"HELLO MY NAME IS..." Surprisingly endearing. +5 HP',
    slot: 'badge',
    stats: { maxHP: 5 },
    visual: { type: 'badge', color: 0xffffff },
    unlock: { flag: 'bestiary_intern' },
  },
  compliance_pin: {
    name: 'Compliance Pin',
    description: 'A small pin that says "I COMPLY". +2 DEF',
    slot: 'badge',
    stats: { def: 2 },
    visual: { type: 'badge', color: 0xdd4444 },
    unlock: { flag: 'compliance_defeated' },
  },
  corner_office_key: {
    name: 'Corner Office Key',
    description: 'Worn around the neck. Subtle power move. +2 ATK, +2 DEF',
    slot: 'badge',
    stats: { atk: 2, def: 2 },
    visual: { type: 'key_lanyard', color: 0xdaa520 },
    unlock: { flag: 'ross_defeated' },
  },

  // --- Accessories ---
  stress_ball_clip: {
    name: 'Stress Ball (Belt Clip)',
    description: 'Always within reach. +5 HP',
    slot: 'accessory',
    stats: { maxHP: 5 },
    visual: { type: 'belt_ball', color: 0xff6633 },
    unlock: 'default',
  },
  fountain_pen: {
    name: 'Fountain Pen',
    description: 'A Montblanc. Borrowed permanently from the executive floor. +2 ATK',
    slot: 'accessory',
    stats: { atk: 2 },
    visual: { type: 'pen', color: 0x111111 },
    unlock: { flag: 'regional_defeated' },
  },
  janitors_keyring: {
    name: 'Janitor\'s Keyring',
    description: 'Opens every door in the building. +3 SPD',
    slot: 'accessory',
    stats: { spd: 3 },
    visual: { type: 'keyring', color: 0xaaaaaa },
    unlock: { flag: 'janitor_confronted' },
  },
  golden_calculator: {
    name: 'Golden Calculator',
    description: 'For when the numbers need to be EXACT. +3 ATK, +5 MP',
    slot: 'accessory',
    stats: { atk: 3, maxMP: 5 },
    visual: { type: 'calculator', color: 0xdaa520 },
    unlock: { flag: 'regional_director_defeated' },
  },
};
