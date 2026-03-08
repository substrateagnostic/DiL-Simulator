// Player stats (HP = Patience, MP = Coffee, ATK = Assertiveness, DEF = Composure, SPD = Bureaucratic Efficiency)

export const PLAYER_BASE_STATS = {
  maxHP: 100,
  maxMP: 60,
  hp: 100,
  mp: 60,
  atk: 12,
  def: 10,
  spd: 8,
  level: 1,
  xp: 0,
};

// XP needed per level
export const XP_TABLE = [0, 30, 80, 150, 250, 400, 600, 900, 1300, 2000];

// Stat growth per level
export const LEVEL_GROWTH = {
  maxHP: 12,
  maxMP: 8,
  atk: 2,
  def: 2,
  spd: 1,
};

// Player abilities
export const PLAYER_ABILITIES = {
  file_motion: {
    name: 'File Motion',
    description: 'Throw legal paperwork at the problem',
    cost: 10,
    power: 18,
    type: 'attack',
    unlockLevel: 1,
  },
  cite_precedent: {
    name: 'Cite Precedent',
    description: 'Reference devastating case law',
    cost: 25,
    power: 40,
    type: 'attack',
    unlockLevel: 1,
  },
  per_my_last_email: {
    name: 'Per My Last Email',
    description: 'The most devastating phrase in corporate America',
    cost: 50,
    power: 75,
    type: 'attack',
    unlockLevel: 3,
  },
  cc_all: {
    name: 'CC All',
    description: 'Passive-aggressive email blast to everyone',
    cost: 40,
    power: 30,
    type: 'attack_aoe',
    unlockLevel: 2,
  },
  coffee_break: {
    name: 'Coffee Break',
    description: 'Restore Patience by stepping away',
    cost: 0,
    healAmount: 35,
    type: 'heal',
    unlockLevel: 1,
    skipsTurn: true,
  },
  billable_hours: {
    name: 'Billable Hours',
    description: 'Buff all stats for 3 turns',
    cost: 30,
    buffAmount: { atk: 5, def: 5, spd: 3 },
    buffDuration: 3,
    type: 'buff',
    unlockLevel: 2,
  },
};

// Enemy stat templates
export const ENEMY_STATS = {
  intern: {
    name: 'The Intern',
    maxHP: 40,
    hp: 40,
    atk: 6,
    def: 4,
    spd: 5,
    xpReward: 25,
    abilities: ['paper_jam', 'confused_filing'],
  },
  karen: {
    name: 'Karen Henderson',
    maxHP: 120,
    hp: 120,
    atk: 16,
    def: 8,
    spd: 10,
    xpReward: 80,
    abilities: ['speak_to_manager', 'yelp_review', 'father_wanted'],
  },
  chad: {
    name: 'Chad Henderson',
    maxHP: 100,
    hp: 100,
    atk: 18,
    def: 6,
    spd: 12,
    xpReward: 80,
    abilities: ['bro_down', 'my_lawyer_says', 'trust_fund_tantrum'],
  },
  grandma: {
    name: 'Grandma Henderson',
    maxHP: 90,
    hp: 90,
    atk: 14,
    def: 12,
    spd: 6,
    xpReward: 100,
    abilities: ['guilt_trip', 'fresh_cookies', 'changed_the_will'],
  },
  compliance: {
    name: 'Compliance Auditor',
    maxHP: 140,
    hp: 140,
    atk: 18,
    def: 16,
    spd: 8,
    xpReward: 150,
    abilities: ['regulation_cite', 'audit_trail', 'form_27b_stroke_6'],
  },
  regional: {
    name: 'Regional Manager',
    maxHP: 160,
    hp: 160,
    atk: 20,
    def: 14,
    spd: 10,
    xpReward: 200,
    abilities: ['synergy_blast', 'corporate_restructure', 'golden_parachute'],
  },
  alex_boss: {
    name: 'Alex (Unhinged)',
    maxHP: 150,
    hp: 150,
    atk: 18,
    def: 12,
    spd: 14,
    xpReward: 200,
    abilities: ['quick_sync', 'circle_back', 'great_catch'],
  },
  // Mutable placeholder — overwritten by ClientGenerator before each reception fight
  reception_client: {
    name: 'Prospective Client',
    maxHP: 80,
    hp: 80,
    atk: 10,
    def: 8,
    spd: 6,
    xpReward: 40,
    abilities: ['portfolio_panic', 'demand_guarantees'],
  },
};

// Enemy ability definitions
export const ENEMY_ABILITIES = {
  // Intern
  paper_jam: { name: 'Paper Jam', power: 8, type: 'attack', message: 'The Intern caused a paper jam!!' },
  confused_filing: { name: 'Confused Filing', power: 12, type: 'attack', message: 'The Intern filed your documents in the shredder!' },

  // Karen
  speak_to_manager: { name: 'Speak to Manager!', power: 10, type: 'attack', message: 'Karen demands to speak to your manager!', effect: 'summon' },
  yelp_review: { name: 'Yelp Review', power: 8, type: 'dot', duration: 3, message: 'Karen is writing a scathing Yelp review in real time!' },
  father_wanted: { name: '"My Father Would Have..."', power: 25, type: 'attack', message: '"My father would have WANTED me to have everything!"' },

  // Chad
  bro_down: { name: 'Bro Down', power: 22, type: 'attack', message: 'Chad flexes aggressively!' },
  my_lawyer_says: { name: '"My Lawyer Says..."', power: 0, type: 'confuse', duration: 2, message: '"My lawyer says vibes are legally binding, bro."' },
  trust_fund_tantrum: { name: 'Trust Fund Tantrum', power: 30, type: 'attack', message: 'Chad throws a tantrum about his trust fund distribution!' },

  // Grandma
  guilt_trip: { name: 'Guilt Trip', power: 30, type: 'attack', message: '"I just want what\'s best for my grandchildren... *sniff*"' },
  fresh_cookies: { name: 'Fresh Cookies', power: 0, type: 'heal', healAmount: 25, message: 'Grandma pulls out a fresh batch of cookies!' },
  changed_the_will: { name: '"I Changed the Will"', power: 0, type: 'debuff', debuff: { atk: -4, def: -4 }, duration: 3, message: '"I\'ve been thinking about changing the will..."' },

  // Compliance Auditor
  regulation_cite: { name: 'Regulation §17.4.2', power: 22, type: 'attack', message: 'The Auditor cites regulation §17.4.2 at you!' },
  audit_trail: { name: 'Audit Trail', power: 15, type: 'dot', duration: 3, message: 'The Auditor begins tracing your audit trail!' },
  form_27b_stroke_6: { name: 'Form 27B/6', power: 35, type: 'attack', message: 'You haven\'t filed Form 27B/6. This is... problematic.' },

  // Regional Manager
  synergy_blast: { name: 'SYNERGY BLAST', power: 25, type: 'attack', message: 'The Regional Manager fires a devastating blast of SYNERGY!' },
  corporate_restructure: { name: 'Corporate Restructure', power: 0, type: 'debuff', debuff: { atk: -5, def: -5, spd: -3 }, duration: 2, message: '"We\'re restructuring your department."' },
  golden_parachute: { name: 'Golden Parachute', power: 0, type: 'heal', healAmount: 40, message: 'The Regional Manager activates their golden parachute!' },

  // Alex Boss
  quick_sync: { name: 'Quick Sync', power: 0, type: 'stun', duration: 1, message: '"Hey, got a sec for a quick sync?" (You don\'t.)' },
  circle_back: { name: 'Let\'s Circle Back', power: 0, type: 'repeat', message: '"Let\'s circle back on that." (He repeats his last attack.)' },
  great_catch: { name: 'Great Catch!', power: 0, type: 'counter', message: '"Great catch! But actually..." (Counter stance activated.)' },

  // Reception Clients
  portfolio_panic: { name: 'Portfolio Panic', power: 14, type: 'attack', message: 'The client erupts over their portfolio performance!' },
  demand_guarantees: { name: 'Demand Guarantees', power: 0, type: 'confuse', duration: 2, message: '"I need guaranteed 20% returns! Is that so hard?!"' },
  call_the_other_advisor: { name: 'Call My Other Advisor', power: 20, type: 'attack', message: 'The client threatens to take their business to Merrill Lynch!' },
  client_bro_down: { name: 'Bro, Trust Me', power: 16, type: 'attack', message: 'The client insists on putting everything in crypto, bro.' },
};

// Items
export const ITEMS = {
  coffee_large: {
    name: 'Large Coffee',
    description: 'Restores 30 Coffee',
    type: 'restore_mp',
    amount: 30,
  },
  antacid: {
    name: 'Antacid',
    description: 'Restores 40 Patience',
    type: 'restore_hp',
    amount: 40,
  },
  energy_drink: {
    name: 'Energy Drink',
    description: 'Restores 20 Coffee, boosts SPD for 3 turns',
    type: 'restore_mp_buff',
    amount: 20,
    buff: { spd: 3 },
    duration: 3,
  },
  stress_ball: {
    name: 'Stress Ball',
    description: 'Restores 60 Patience',
    type: 'restore_hp',
    amount: 60,
  },
  compliance_manual: {
    name: 'Compliance Manual',
    description: 'Boosts DEF by 5 for the whole battle',
    type: 'buff',
    buff: { def: 5 },
    duration: 99,
  },
  vending_fortune: {
    name: 'Vending Fortune',
    description: '"Your principal is well-endowed... with growth potential"',
    type: 'restore_hp',
    amount: 10,
  },
};
