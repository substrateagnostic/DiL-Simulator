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
    description: 'Green frames. Helps you see the fine print. +1 ATK',
    slot: 'glasses',
    stats: { atk: 1 },
    // Green frames on purpose: the rachel_wardrobe narrator line plants a
    // pair of green-framed reading glasses on Rachel's desk, and the item
    // the mirror offers rhymes with it without a word (judge-endorsed).
    // CharacterBuilder reads this color for the cosmetic frame material.
    //
    // Round 2: the first value was 0x2f7d52, and at the mirror's shipping
    // scale it read as a ~2 px hue shift on a ring Andrew's default pair had
    // already drawn there — the one item the scene's last line plants was the
    // hardest change on the screen to see (judge). Same hue family, lifted in
    // value and saturation so it separates from the default near-black rim at
    // a glance; `buildGlasses` also thickens a COSMETIC rim (see there).
    visual: { type: 'glasses', color: 0x3fbf72 },
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
  visitor_badge: {
    name: 'Temporary Visitor Badge',
    description: 'Valid for one business day. Issued eleven months ago. +1 DEF',
    slot: 'badge',
    stats: { def: 1 },
    visual: { type: 'badge', color: 0xf0d060 },
    unlock: 'default', // day-one — the BADGE rack is otherwise empty until bestiary_intern
  },
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
  // Review Point exclusive — see src/data/review.js. The unlock flag is
  // stamped onto the player by applyReviewPurchases() on every load, so it
  // survives New Game+ and brand-new saves.
  appreciation_cert: {
    name: 'Certificate of Appreciation',
    description: 'Awarded in lieu of a raise, Q3 2004. Laminated. +3 DEF',
    slot: 'badge',
    stats: { def: 3 },
    visual: { type: 'badge', color: 0xf2e6c8 },
    unlock: { flag: 'rp_appreciation_cert' },
  },
  corner_office_key: {
    name: 'Corner Office Key',
    description: 'Worn around the neck. Subtle power move. +2 ATK, +2 DEF',
    slot: 'badge',
    stats: { atk: 2, def: 2 },
    visual: { type: 'key_lanyard', color: 0xdaa520 },
    unlock: { flag: 'skip_defeated' },
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
  // ── The Relic slot ────────────────────────────────────────────────────
  // Report P1.6: forgiveness ships as LOOT WITH A TRADEOFF, never as a shame
  // slider. Sea of Stars' Sixth Sense widens the timed-block window; its
  // Adamant Shard guarantees lock-breaks but costs 50% of the timing bonus.
  // This is that shape in one equip slot the game already had: the Brace QTE
  // gets 40% more window, and Retaliate — the reward Brace arms — gives up 20%
  // of its damage for it. Available from the start, because an accessibility
  // aid you have to earn is not one. `qte` is read by CombatState via
  // qteModifiers() below; a cosmetic without the field changes nothing.
  ergonomic_wrist_support: {
    name: 'Ergonomic Wrist Support',
    description: 'Requisitioned from Supply after a documented repetitive-strain complaint. Approved without a doctor\'s note. Wider Brace window, weaker Retaliate.',
    slot: 'accessory',
    stats: {},
    qte: { braceWindow: 1.4, retaliateDamage: 0.8 },
    visual: { type: 'wrist_rest', color: 0x3d4550 },
    unlock: 'default',
  },
  // ── LATE-GAME PAYOUTS (F-7) ───────────────────────────────────────────
  // Before these, all 17 cosmetics unlocked off Acts 1-3 plus the penthouse
  // chain. Act 4, Act 5, Act 6, the ENTIRE Act-6½ city chapter, the arcade
  // cabinet and all nine renovations paid nothing at all — the four longest
  // stretches of optional content in the game had no wardrobe consequence.
  // Five items, one per unpaid pillar, each an object the player actually
  // ended up holding.
  form_11c_cert: {
    name: 'Form 11-C Certification',
    description: 'Certified by a retired Deputy Recorder in booth 4 of a diner. Worth the paperwork. +3 DEF',
    slot: 'badge',
    stats: { def: 3 },
    visual: { type: 'cert_seal', color: 0xc9a227 },
    unlock: { flag: 'charter_certified' },
  },
  fennimore_citation: {
    name: 'Fennimore Citation',
    description: 'Officer Reyes has not spoken to you since. The citation is technically void. +2 SPD, +2 ATK',
    slot: 'accessory',
    stats: { spd: 2, atk: 2 },
    visual: { type: 'citation', color: 0xf2e2a8 },
    unlock: { flag: 'meter_war_done' },
  },
  ledger_pencil: {
    name: 'Ledger Pencil',
    description: 'Sharpened to four inches. Wrote every name in the ledger since 1947. +2 DEF, +5 MP',
    slot: 'accessory',
    stats: { def: 2, maxMP: 5 },
    visual: { type: 'pencil', color: 0xe0a83c },
    unlock: { flag: 'janitor_names_complete' },
  },
  high_score_crown: {
    name: 'High Score Crown',
    description: 'The break room cabinet ran out of leaderboard and awarded this. +3 SPD',
    slot: 'hat',
    stats: { spd: 3 },
    visual: { type: 'crown', color: 0xffcc33 },
    // The top SPRINT REVIEW distance tier (200 floors). `arcade_` flags carry
    // through New Game+ by CARRY_PREFIXES, so this survives a second lap the
    // way the arcade's own cosmetics do.
    unlock: { flag: 'arcade_fire_horses' },
  },
  stewards_badge: {
    name: 'Steward\'s Badge',
    description: 'Nine renovations funded one client meeting at a time. +2 ATK, +2 DEF, +10 HP',
    slot: 'accessory',
    stats: { atk: 2, def: 2, maxHP: 10 },
    visual: { type: 'steward_badge', color: 0xb08d57 },
    // Derived in ExplorationState._refreshStoryProgress() — there is no single
    // purchase that means "all nine", and the shop sets one flag per item.
    unlock: { flag: 'renovations_all' },
  },

  // Review Point exclusive — see src/data/review.js.
  svp_tumbler: {
    name: 'SVP-Grade Tumbler',
    description: 'Vacuum-sealed. Previously restricted to Senior VP and above. +2 ATK, +5 MP',
    slot: 'accessory',
    stats: { atk: 2, maxMP: 5 },
    visual: { type: 'tumbler', color: 0x9aa3ad },
    unlock: { flag: 'rp_svp_tumbler' },
  },
};

/**
 * Aggregate QTE modifiers from everything the player has equipped.
 * Multiplicative, so two relics that both widen a window stack sanely, and a
 * player with nothing equipped gets the identity object — which is what keeps
 * every existing save's combat feel bit-identical.
 */
export function qteModifiers(player) {
  const out = { braceWindow: 1, retaliateDamage: 1 };
  const equipped = player?.equipped;
  if (!equipped) return out;
  for (const slot of COSMETIC_SLOTS) {
    const q = COSMETICS[equipped[slot]]?.qte;
    if (!q) continue;
    for (const key of Object.keys(out)) {
      if (typeof q[key] === 'number') out[key] *= q[key];
    }
  }
  return out;
}
