// Supply Shop — items the player can buy with AUM
// Categories: consumable (combat items), upgrade (permanent stat boost), decor (office flags)
import _balance from './balance.json' with { type: 'json' };

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
    price: 4_000,
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
    price: 500_000,
    maxStack: 3,
    statBoost: { atk: 3 },
  },
  {
    id: 'upgrade_composure',
    category: 'upgrade',
    name: 'Composure Workshop',
    description: 'Permanently increases DEF by 3. Price increases with each purchase.',
    price: 500_000,
    maxStack: 3,
    statBoost: { def: 3 },
  },
  {
    id: 'upgrade_patience',
    category: 'upgrade',
    name: 'Mindfulness Retreat',
    description: 'Permanently increases max HP by 20. Price increases with each purchase.',
    price: 500_000,
    maxStack: 3,
    statBoost: { maxHP: 20 },
  },
  {
    id: 'upgrade_efficiency',
    category: 'upgrade',
    name: 'Efficiency Seminar',
    description: 'Permanently increases SPD by 2. Price increases with each purchase.',
    price: 500_000,
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
    description: 'Survive a killing blow at 1 HP once per battle.',
    price: 90_000,
    maxStack: 1,
    flag: 'decor_motivational_poster',
    combatBonus: { posterActive: true },
  },

  // ── Renovations (post-game only, 5M AUM each, +2000 XP) ──────────────────
  { id: 'renovation_espresso_bar',           category: 'renovation', area: 'Break Room',       name: 'Espresso Bar',              description: 'A professional barista station for the break room.',                   price: 5_000_000, maxStack: 1, flag: 'renovation_espresso_bar' },
  { id: 'renovation_catering_fridge',        category: 'renovation', area: 'Break Room',       name: 'Executive Catering Wall',   description: 'Premium fridge and snack shelving for the break room.',                price: 5_000_000, maxStack: 1, flag: 'renovation_catering_fridge' },
  { id: 'renovation_ergonomic_workstations', category: 'renovation', area: 'Cubicle Farm',     name: 'Ergonomic Workstations',    description: 'Refresh the cubicle farm with plants and ergonomic additions.',         price: 5_000_000, maxStack: 1, flag: 'renovation_ergonomic_workstations' },
  { id: 'renovation_marble_counter',         category: 'renovation', area: 'Reception',        name: 'Marble Reception Counter',  description: 'Premium planters and stonework framing the reception desk.',            price: 5_000_000, maxStack: 1, flag: 'renovation_marble_counter' },
  { id: 'renovation_lobby_sculpture',        category: 'renovation', area: 'Reception',        name: 'Lobby Sculptures',          description: 'Commissioned bronze pieces in the reception lobby.',                   price: 5_000_000, maxStack: 1, flag: 'renovation_lobby_sculpture' },
  { id: 'renovation_projection_wall',        category: 'renovation', area: 'Conference Room',  name: 'Smart Projection Wall',     description: 'A full AV display wall across the conference room north end.',         price: 5_000_000, maxStack: 1, flag: 'renovation_projection_wall' },
  { id: 'renovation_corner_office',          category: 'renovation', area: "Ross's Office",    name: 'Corner Office Renovation',  description: "Grand paintings and executive furnishings for Ross's office.",         price: 5_000_000, maxStack: 1, flag: 'renovation_corner_office' },
  { id: 'renovation_trophy_wall',            category: 'renovation', area: 'The Board Room',   name: 'Victory Trophy Wall',       description: 'Display cases commemorating your wins along the board room walls.',   price: 5_000_000, maxStack: 1, flag: 'renovation_trophy_wall' },
  { id: 'renovation_penthouse',              category: 'renovation', area: 'The Penthouse',    name: 'Executive Suite Upgrade',   description: 'A floor-to-ceiling aquarium wall, live analytics displays, and a private cocktail lounge.', price: 10_000_000, maxStack: 1, flag: 'renovation_penthouse' },
];

export const SHOP_CATEGORIES = {
  consumable: 'Consumables',
  upgrade: 'Permanent Upgrades',
  decor: 'Office Decor',
  renovation: 'Renovations',
};

// Apply balance.json shop price overrides
for (const item of SHOP_ITEMS) {
  if (_balance.shop?.[item.id]?.price !== undefined) {
    item.price = _balance.shop[item.id].price;
  }
}
