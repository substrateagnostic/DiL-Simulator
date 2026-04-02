// Supply Shop — items the player can buy with AUM
// Categories: consumable (combat items), upgrade (permanent stat boost), decor (office flags)

export const SHOP_ITEMS = [
  // ── Consumables ─────────────────────────────────────────────────────────────
  {
    id: 'antacid',
    category: 'consumable',
    name: 'Antacid',
    description: 'Restores 40 Patience in combat',
    price: 4_000,
    maxStack: 5,
  },
  {
    id: 'coffee_large',
    category: 'consumable',
    name: 'Large Coffee',
    description: 'Restores 30 Coffee in combat',
    price: 2_500,
    maxStack: 5,
  },
  {
    id: 'energy_drink',
    category: 'consumable',
    name: 'Energy Drink',
    description: 'Restores 20 Coffee, boosts SPD for 3 turns',
    price: 6_000,
    maxStack: 3,
  },
  {
    id: 'stress_ball',
    category: 'consumable',
    name: 'Stress Ball',
    description: 'Restores 60 Patience in combat',
    price: 9_000,
    maxStack: 3,
  },

  // ── Permanent Upgrades ───────────────────────────────────────────────────────
  // Price escalates with each purchase: cost = price × (1 + timesBought)
  {
    id: 'upgrade_assertiveness',
    category: 'upgrade',
    name: 'Assertiveness Training',
    description: 'Permanently increases ATK by 3. Price increases with each purchase.',
    price: 1_000_000,
    maxStack: 3,
    statBoost: { atk: 3 },
  },
  {
    id: 'upgrade_composure',
    category: 'upgrade',
    name: 'Composure Workshop',
    description: 'Permanently increases DEF by 3. Price increases with each purchase.',
    price: 1_000_000,
    maxStack: 3,
    statBoost: { def: 3 },
  },
  {
    id: 'upgrade_patience',
    category: 'upgrade',
    name: 'Mindfulness Retreat',
    description: 'Permanently increases max HP by 20. Price increases with each purchase.',
    price: 1_000_000,
    maxStack: 3,
    statBoost: { maxHP: 20 },
  },
  {
    id: 'upgrade_efficiency',
    category: 'upgrade',
    name: 'Efficiency Seminar',
    description: 'Permanently increases SPD by 2. Price increases with each purchase.',
    price: 1_000_000,
    maxStack: 3,
    statBoost: { spd: 2 },
  },

  // ── Office Decor ─────────────────────────────────────────────────────────────
  {
    id: 'decor_plant',
    category: 'decor',
    name: 'Office Plant',
    description: 'A small succulent for your desk. Morale +1.',
    price: 10_000,
    maxStack: 1,
    flag: 'decor_plant',
  },
  {
    id: 'decor_keyboard',
    category: 'decor',
    name: 'Mechanical Keyboard',
    description: 'The satisfying clack of productivity.',
    price: 20_000,
    maxStack: 1,
    flag: 'decor_keyboard',
  },
  {
    id: 'decor_coffee_machine',
    category: 'decor',
    name: 'Premium Coffee Machine',
    description: 'Restores 5 extra Coffee at the start of each battle.',
    price: 60_000,
    maxStack: 1,
    flag: 'decor_coffee_machine',
    combatBonus: { startMp: 5 },
  },
  {
    id: 'decor_motivational_poster',
    category: 'decor',
    name: '"Hang in There" Poster',
    description: 'Survive at 1 HP once per battle.',
    price: 35_000,
    maxStack: 1,
    flag: 'decor_motivational_poster',
  },
];

export const SHOP_CATEGORIES = {
  consumable: 'Consumables',
  upgrade: 'Permanent Upgrades',
  decor: 'Office Decor',
};
