// Recruitable ally party members for multi-combatant fights.
// allies[0] is always the player (Andrew); these are allies[1+].
//
// AI control: each ally has an ALLY_AI_PATTERNS entry (rotation by default).
// Built-in heuristics override the pattern: heal preference if any ally < 40% HP,
// AoE preference when 2+ alive enemies. CombatEngine handles target picking.

export const ALLY_STATS = {
  janet: {
    name: 'Janet',
    maxHP: 220,
    hp: 220,
    maxMP: 80,
    mp: 80,
    atk: 13,
    def: 11,
    spd: 9,
    abilities: ['nope_email', 'rally_team', 'group_complaint', 'fact_check'],
  },
};

// Ally ability definitions. Same shape as PLAYER_ABILITIES where applicable,
// plus new types: heal_ally (target-picked), buff_party (all allies).
export const ALLY_ABILITIES = {
  // Janet — passive-aggressive social fire
  nope_email: {
    name: 'Nope.',
    description: 'A one-word reply that hits like a truck.',
    cost: 8,
    power: 16,
    type: 'attack',
    tag: 'social',
    messages: [
      'Janet hits Reply-All with one word: "Nope."',
      'Janet replies: "Per Andrew\'s last email — no."',
    ],
  },
  group_complaint: {
    name: 'Group Complaint',
    description: 'Drag the whole conference call into HR jeopardy.',
    cost: 24,
    power: 14,
    type: 'attack_aoe',
    tag: 'social',
    messages: [
      'Janet emails the entire department, CC: HR.',
      'Janet stands up. "I\'d like to log a formal complaint — for everyone."',
    ],
  },
  rally_team: {
    name: 'Rally',
    description: 'Pep talk from a fellow trust officer.',
    cost: 18,
    type: 'buff_party',
    buffAmount: { atk: 4, def: 3 },
    buffDuration: 3,
    messages: [
      'Janet: "We\'ve seen worse than this. Stay sharp."',
      'Janet rallies the team. Spines straighten.',
    ],
  },
  fact_check: {
    name: 'Fact Check',
    description: 'Cross-reference their claims against the policy binder.',
    cost: 14,
    type: 'debuff',
    tag: 'audit',
    debuffAmount: { atk: -4, def: -3 },
    debuffDuration: 2,
    messages: [
      'Janet flips open the binder. "That\'s not what page 47 says."',
      'Janet: "Receipts." She has them.',
    ],
  },
  // Reserved for future allies (heal example, kept here for reference)
  break_room_visit: {
    name: 'Break Room Visit',
    description: 'Bring snacks. Mid-fight. Yes really.',
    cost: 22,
    type: 'heal_ally',
    healAmount: 60,
    messages: ['Snacks arrive. Morale rises.'],
  },
};

// Ally AI patterns — rotation is the default; future allies can have custom decision trees.
export const ALLY_AI_PATTERNS = {
  janet: { type: 'rotation' },
};
