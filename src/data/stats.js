// Player stats (HP = Patience, MP = Coffee, ATK = Assertiveness, DEF = Composure, SPD = Bureaucratic Efficiency)

export const PLAYER_BASE_STATS = {
  maxHP: 100,
  maxMP: 75,
  hp: 100,
  mp: 75,
  atk: 12,
  def: 10,
  spd: 8,
  level: 1,
  xp: 0,
  aum: 0,       // Assets Under Management — earned from reception clients, spent at shop
};

// XP needed per level — 15 levels, exponential curve (~1.35x per gap).
// Level 1→2 costs 325 XP (~5 reception fights at 65 XP each).
// Story bosses alone yield ~835 XP total, landing the player around level 4.
// Levels 5–10 require consistent roguelite grinding; 11–15 are hardcore territory.
//   Gap per level: 325→450→600→800→1075→1450→1950→2625→3550→4800→6475→8750→11800→16000
export const XP_TABLE = [
  0,      // Lv 1
  325,    // Lv 2  (+325,   ~5 fights)
  775,    // Lv 3  (+450,   ~7 fights)
  1375,   // Lv 4  (+600,   ~9 fights)
  2175,   // Lv 5  (+800,   ~12 fights)
  3250,   // Lv 6  (+1075,  ~17 fights)
  4700,   // Lv 7  (+1450,  ~22 fights)
  6650,   // Lv 8  (+1950,  ~30 fights)
  9275,   // Lv 9  (+2625,  ~40 fights)
  12825,  // Lv 10 (+3550,  ~55 fights)
  17625,  // Lv 11 (+4800,  ~74 fights)
  24100,  // Lv 12 (+6475,  ~100 fights)
  32850,  // Lv 13 (+8750,  ~135 fights)
  44650,  // Lv 14 (+11800, ~182 fights)
  60650,  // Lv 15 (+16000, ~246 fights)
];

// Stat growth per level
export const LEVEL_GROWTH = {
  maxHP: 12,
  maxMP: 10,
  atk: 2,
  def: 2,
  spd: 1,
};

// Player abilities
// Starter abilities (tier 0) are free at level 1.
// Others require spending upgrade points AND having the prerequisite unlocked.
export const PLAYER_ABILITIES = {
  file_motion: {
    name: 'File Motion',
    description: 'Throw legal paperwork at the problem',
    cost: 10,
    power: 15,
    type: 'attack',
    tag: 'legal',
    tier: 0, // starter — free
  },
  coffee_break: {
    name: 'Coffee Break',
    description: 'Restore Patience by stepping away',
    cost: 0,
    healAmount: 50,
    type: 'heal',
    tier: 0, // starter — free
    skipsTurn: true,
  },
  cite_precedent: {
    name: 'Cite Precedent',
    description: 'Reference devastating case law',
    cost: 25,
    power: 30,
    type: 'attack',
    tag: 'legal',
    tier: 1,
    requires: 'file_motion',
    upgradePointCost: 1,
  },
  cc_all: {
    name: 'CC All',
    description: 'Passive-aggressive email blast to everyone',
    cost: 40,
    power: 25,
    type: 'attack_aoe',
    tag: 'social',
    tier: 1,
    requires: 'file_motion',
    upgradePointCost: 1,
  },
  due_diligence: {
    name: 'Due Diligence',
    description: 'Expose the enemy\'s weaknesses through thorough analysis',
    cost: 15,
    type: 'debuff',
    tag: 'audit',
    debuffAmount: { def: -5 },
    debuffDuration: 3,
    tier: 1,
    requires: 'coffee_break',
    upgradePointCost: 1,
  },
  billable_hours: {
    name: 'Billable Hours',
    description: 'Buff all stats for 3 turns',
    cost: 30,
    buffAmount: { atk: 5, def: 5, spd: 3 },
    buffDuration: 3,
    type: 'buff',
    tier: 2,
    requires: 'cc_all',
    upgradePointCost: 1,
  },
  per_my_last_email: {
    name: 'Per My Last Email',
    description: 'The most devastating phrase in corporate America',
    cost: 50,
    power: 55,
    type: 'attack',
    tag: 'social',
    tier: 2,
    requires: 'cite_precedent',
    upgradePointCost: 2,
  },
  forensic_audit: {
    name: 'Forensic Audit',
    description: 'Uncover discrepancies with a thorough financial review',
    cost: 35,
    power: 40,
    type: 'attack',
    tag: 'audit',
    tier: 2,
    requires: 'due_diligence',
    upgradePointCost: 2,
  },
  fiduciary_shield: {
    name: 'Fiduciary Shield',
    description: 'Invoke fiduciary duty for a protective barrier',
    cost: 20,
    type: 'buff',
    buffAmount: { def: 8 },
    buffDuration: 2,
    tier: 2,
    requires: 'due_diligence',
    upgradePointCost: 1,
  },
  whistleblower: {
    name: 'Whistleblower',
    description: 'Blow the whistle on corporate malfeasance',
    cost: 45,
    power: 45,
    type: 'attack',
    tag: 'legal',
    tier: 3,
    requires: 'per_my_last_email',
    upgradePointCost: 2,
  },
  power_of_attorney: {
    name: 'Power of Attorney',
    description: 'Invoke ultimate legal authority to restore patience',
    cost: 40,
    healAmount: 130,
    type: 'heal',
    tier: 3,
    requires: 'fiduciary_shield',
    upgradePointCost: 2,
    skipsTurn: false,
  },
  // Subquest-unlocked abilities (no upgrade points needed)
  root_access: {
    name: 'Root Access',
    description: 'Hack directly into the enemy\'s mainframe',
    cost: 35,
    power: 40,
    type: 'attack',
    tag: 'technical',
    stripBuffs: true,
    unlockQuest: 'legacy_admin',
  },
  firewall: {
    name: 'Firewall',
    description: 'Block the next enemy ability entirely',
    cost: 20,
    type: 'buff',
    buffAmount: { def: 0 },
    buffDuration: 1,
    special: 'block_next',
    unlockQuest: 'network_ghost',
  },
  temporal_audit: {
    name: 'Temporal Audit',
    description: 'Audit across timelines — reduce enemy DEF and take two actions this turn',
    cost: 45,
    type: 'special',
    special: 'double_turn',
    debuffAmount: { def: -6 },
    debuffDuration: 2,
    unlockQuest: 'daves_legacy',
  },
  notarized_strike: {
    name: 'Notarized Strike',
    description: 'A legally binding attack with full notarial authority',
    cost: 30,
    power: 45,
    type: 'attack',
    tag: 'legal',
    unlockQuest: 'printers_soul',
  },
  invoke_charter: {
    name: 'Invoke Charter',
    description: 'Read the 1947 charter aloud — devastating to bad-faith enemies',
    cost: 60,
    power: 80,
    type: 'attack',
    tag: 'legal',
    unlockQuest: 'final_patch',
  },
};

// Enemy stat templates
export const ENEMY_STATS = {
  intern: {
    name: 'The Intern',
    maxHP: 140,
    hp: 140,
    atk: 1,
    def: 4,
    spd: 5,
    xpReward: 25,
    abilities: ['paper_jam', 'confused_filing'],
    weakness: 'legal', resistance: null,
  },
  karen: {
    name: 'Karen Henderson',
    maxHP: 300,
    hp: 300,
    atk: 15,
    def: 16,
    spd: 14,
    xpReward: 150,
    abilities: ['speak_to_manager', 'yelp_review', 'father_wanted'],
    weakness: 'legal', resistance: 'social',
    phases: [
      { hpThreshold: 0.5, abilities: ['speak_to_manager', 'yelp_review', 'father_wanted', 'demand_corporate'] },
      { hpThreshold: 0.25, abilities: ['father_wanted', 'demand_corporate', 'live_tweet_rampage'] },
    ],
    phaseMessages: [
      "Karen is FURIOUS. She's calling everyone she's ever met!",
      "Karen has GONE NUCLEAR. The Yelp review is going viral!",
    ],
    taunts: [
      "I WANT YOUR SUPERVISOR. And your supervisor's supervisor.",
      '"My attorney is on speed dial and I am not afraid to use it!"',
      '"One star. Zero. Stars. I am telling EVERYONE."',
      '"Do you know who my father was?! DO YOU?!"',
    ],
  },
  chad: {
    name: 'Chad Henderson',
    maxHP: 480,
    hp: 480,
    atk: 18,
    def: 14,
    spd: 20,
    xpReward: 200,
    abilities: ['bro_down', 'my_lawyer_says', 'trust_fund_tantrum'],
    weakness: 'social', resistance: 'legal',
    phases: [
      { hpThreshold: 0.5, abilities: ['bro_down', 'trust_fund_tantrum', 'alpha_mode'] },
      { hpThreshold: 0.25, abilities: ['trust_fund_tantrum', 'alpha_mode', 'rage_quit_attack'] },
    ],
    phaseMessages: [
      'Chad flexes and enters ALPHA MODE. His protein shake overflows.',
      'Chad is COMPLETELY unhinged. He throws away his CFA study guide.',
    ],
    taunts: [
      '"BRO you literally cannot do this to me, do you know who I am?!"',
      '"My lawyers are CALLING RIGHT NOW. Multiple lawyers, bro."',
      '"ALPHA DOES NOT LOSE, BRO. ALPHA. DOES. NOT. LOSE."',
      '"I\'m going to put everything in crypto and there\'s nothing you can do!"',
    ],
  },
  grandma: {
    name: 'Grandma Henderson',
    maxHP: 600,
    hp: 600,
    atk: 21,
    def: 22,
    spd: 12,
    xpReward: 250,
    abilities: ['guilt_trip', 'fresh_cookies', 'changed_the_will', 'passive_aggression'],
    weakness: 'audit', resistance: 'social',
    phases: [
      { hpThreshold: 0.5, abilities: ['guilt_trip', 'fresh_cookies', 'changed_the_will', 'emergency_shortbread', 'passive_aggression', 'the_look'] },
      { hpThreshold: 0.25, abilities: ['changed_the_will', 'emergency_shortbread', 'final_revision', 'the_look', 'gerald_incident'] },
    ],
    phaseMessages: [
      'Grandma looks... disappointed. Dangerously, quietly disappointed.',
      'Grandma has changed the will. Again. She brought a notary.',
    ],
    taunts: [
      '"This is not what your grandfather would have wanted. Not one bit."',
      '"I may need to re-examine the beneficiary designations... all of them."',
      '*dabs eyes* "I just want what\'s best. For everyone. Except you, apparently."',
      '"The church has been very understanding. Very generous, actually."',
    ],
  },
  compliance: {
    name: 'Compliance Auditor',
    maxHP: 580,
    hp: 580,
    atk: 13,
    def: 16,
    spd: 8,
    xpReward: 150,
    abilities: ['regulation_cite', 'audit_trail', 'form_27b_stroke_6'],
    weakness: 'legal', resistance: 'audit',
  },
  regional: {
    name: 'Regional Manager',
    maxHP: 600,
    hp: 600,
    atk: 13,
    def: 14,
    spd: 10,
    xpReward: 200,
    abilities: ['synergy_blast', 'corporate_restructure', 'golden_parachute'],
    weakness: 'social', resistance: 'legal',
  },
  ross_boss: {
    name: 'Ross (Unhinged)',
    maxHP: 520,
    hp: 520,
    atk: 14,
    def: 12,
    spd: 14,
    xpReward: 200,
    abilities: ['quick_sync', 'circle_back', 'great_catch'],
    weakness: 'social', resistance: 'technical',
  },
  // Mutable placeholder — overwritten by ClientGenerator before each reception fight
  reception_client: {
    name: 'Prospective Client',
    maxHP: 80,
    hp: 80,
    atk: 10,
    def: 8,
    spd: 6,
    xpReward: 65,
    abilities: ['portfolio_panic', 'demand_guarantees'],
    weakness: 'audit', resistance: null,
  },

  // Acts 3–5 enemies
  security_guard: {
    name: 'Security Guard',
    maxHP: 500,
    hp: 500,
    atk: 12,
    def: 14,
    spd: 8,
    xpReward: 60,
    abilities: ['badge_check', 'tackle', 'radio_backup'],
    weakness: 'legal', resistance: null,
  },
  hr_rep: {
    name: 'HR Representative',
    maxHP: 500,
    hp: 500,
    atk: 8,
    def: 12,
    spd: 6,
    xpReward: 45,
    abilities: ['mandatory_training', 'policy_violation', 'formal_warning', 'sensitivity_seminar', 'hostile_work_complaint'],
    weakness: 'social', resistance: null,
  },
  restructuring_analyst: {
    name: 'Restructuring Analyst',
    maxHP: 280,
    hp: 280,
    atk: 10,
    def: 10,
    spd: 12,
    xpReward: 160,
    abilities: ['downsize', 'efficiency_report', 'outsource_threat'],
    weakness: 'audit', resistance: null,
  },
  brand_consultant: {
    name: 'Brand Consultant',
    maxHP: 420,
    hp: 420,
    atk: 9,
    def: 8,
    spd: 14,
    xpReward: 150,
    abilities: ['rebrand', 'focus_group', 'logo_redesign'],
    weakness: 'social', resistance: 'audit',
  },
  data_analytics_lead: {
    name: 'Data Analytics Lead',
    maxHP: 520,
    hp: 520,
    atk: 12,
    def: 11,
    spd: 14,
    xpReward: 180,
    abilities: ['dashboard_overload', 'pivot_table', 'data_predictive_model'],
    weakness: 'social', resistance: 'technical',
  },
  chief_of_restructuring: {
    name: 'Chief of Restructuring',
    maxHP: 620,
    hp: 620,
    atk: 16,
    def: 16,
    spd: 10,
    xpReward: 220,
    abilities: ['chief_strategic_pivot', 'chief_corporate_mandate', 'force_majeure'],
    weakness: 'legal', resistance: 'audit',
  },
  corporate_lawyer: {
    name: 'Corporate Lawyer',
    maxHP: 420,
    hp: 420,
    atk: 14,
    def: 16,
    spd: 10,
    xpReward: 250,
    abilities: ['cease_desist', 'legal_jargon', 'billable_assault'],
    weakness: 'audit', resistance: 'legal',
  },
  rachel_boss: {
    name: 'Rachel, SVP',
    maxHP: 720,
    hp: 720,
    atk: 18,
    def: 18,
    spd: 12,
    xpReward: 450,
    abilities: ['strategic_pivot', 'performance_review', 'restructure_threat'],
    weakness: 'audit', resistance: 'social',
    phases: [
      { hpThreshold: 0.6, abilities: ['strategic_pivot', 'performance_review', 'restructure_threat'] },
      { hpThreshold: 0.3, abilities: ['hostile_takeover', 'board_resolution', 'golden_handcuffs'] },
      { hpThreshold: 0, abilities: ['hostile_takeover', 'board_resolution', 'final_assessment'] },
    ],
  },
  cfos_assistant: {
    name: 'CFO\'s Assistant',
    maxHP: 480,
    hp: 480,
    atk: 14,
    def: 14,
    spd: 14,
    xpReward: 180,
    abilities: ['expense_review', 'budget_slash', 'cfo_call'],
    weakness: 'audit', resistance: 'legal',
  },
  regional_director: {
    name: 'Regional Director',
    maxHP: 720,
    hp: 720,
    atk: 20,
    def: 20,
    spd: 10,
    xpReward: 350,
    abilities: ['corporate_mandate', 'synergy_blast', 'market_correction', 'quarterly_target'],
    weakness: 'legal', resistance: 'social',
    phases: [
      { hpThreshold: 0.6, abilities: ['corporate_mandate', 'synergy_blast', 'quarterly_target'] },
      { hpThreshold: 0.3, abilities: ['market_correction', 'corporate_mandate', 'quarterly_target'] },
      { hpThreshold: 0, abilities: ['market_correction', 'synergy_blast', 'corporate_mandate'] },
    ],
  },
  algorithm: {
    name: 'The Algorithm',
    maxHP: 880,
    hp: 880,
    atk: 26,
    def: 22,
    spd: 16,
    xpReward: 500,
    abilities: ['data_harvest', 'pattern_recognition', 'risk_assessment'],
    weakness: 'technical', resistance: 'social',
    phases: [
      { hpThreshold: 0.7, abilities: ['data_harvest', 'pattern_recognition', 'risk_assessment', 'system_overload'] },
      { hpThreshold: 0.35, abilities: ['predictive_model', 'algorithmic_trading', 'data_harvest', 'process_termination', 'system_overload'] },
      { hpThreshold: 0, abilities: ['total_optimization', 'algorithmic_trading', 'predictive_model', 'process_termination', 'pattern_recognition'] },
    ],
  },
};

// Pick a random message from an array, or return the string if it's not an array
export function pickMessage(msg) {
  return Array.isArray(msg) ? msg[Math.floor(Math.random() * msg.length)] : msg;
}

// Enemy ability definitions
export const ENEMY_ABILITIES = {
  // Intern
  paper_jam: { name: 'Paper Jam', power: 4, type: 'attack', messages: [
    'The Intern caused a paper jam!!',
    'The Intern jams the copier. Paper flies everywhere!',
    'The Intern accidentally prints 500 copies of their lunch order!',
  ]},
  confused_filing: { name: 'Confused Filing', power: 4, type: 'attack', messages: [
    'The Intern filed your documents in the shredder!',
    'The Intern alphabetized your files... by the second letter.',
    'The Intern stapled your lunch to a Form W-2!',
  ]},

  // Karen
  speak_to_manager: { name: 'Speak to Manager!', power: 10, type: 'attack', effect: 'summon', messages: [
    'Karen demands to speak to your manager!',
    '"I WILL be speaking to someone in charge about this!"',
    'Karen pulls out her phone. "I\'m calling corporate RIGHT NOW."',
  ]},
  yelp_review: { name: 'Yelp Review', power: 8, type: 'dot', duration: 3, messages: [
    'Karen is writing a scathing Yelp review in real time!',
    'Karen begins live-tweeting her dissatisfaction!',
    '"One star. Would give zero if I could." Karen types furiously.',
  ]},
  father_wanted: { name: '"My Father Would Have..."', power: 25, type: 'attack', messages: [
    '"My father would have WANTED me to have everything!"',
    '"Daddy promised me the lake house! I have TEXTS!"',
    '"Do you know what my father went through to build this?!"',
  ]},

  // Chad
  bro_down: { name: 'Bro Down', power: 22, type: 'attack', messages: [
    'Chad flexes aggressively!',
    'Chad slams a protein shake and charges!',
    '"You don\'t even LIFT, bro!" Chad attacks!',
    'Chad does a power clean and hurls the barbell at you!',
  ]},
  my_lawyer_says: { name: '"My Lawyer Says..."', power: 0, type: 'confuse', duration: 1, messages: [
    '"My lawyer says vibes are legally binding, bro."',
    '"My lawyer is like, super smart dude. He went to online law school."',
    '"My lawyer says I can sue for emotional damages from this meeting."',
  ]},
  trust_fund_tantrum: { name: 'Trust Fund Tantrum', power: 30, type: 'attack', messages: [
    'Chad throws a tantrum about his trust fund distribution!',
    '"I NEED that money for my NFT project!" Chad rages!',
    'Chad kicks over a chair and screams about his inheritance!',
    '"This is literally THEFT! Grandpa SAID I could have it all!"',
  ]},

  // Karen phase abilities
  demand_corporate: { name: 'Demand Corporate', power: 0, type: 'buff', buff: { atk: 8, def: 6 }, duration: 1, messages: [
    '"I am DEMANDING to speak with your entire corporate chain of command!"',
    'Karen pulls out a laminated list of demands. Each one is legally dubious.',
    '"I have RIGHTS. I have READ them. ALL of them." Karen steels herself.',
  ]},
  live_tweet_rampage: { name: 'Live Tweet Rampage', power: 35, type: 'attack', messages: [
    'Karen live-tweets the entire meeting. Her 12 followers are outraged.',
    '"THREAD: A Trust Officer Tried to DENY My Rightful Inheritance (1/47)"',
    'Karen\'s phone screen glows as she tweets into the void. It still hurts somehow.',
  ]},

  // Chad phase abilities
  alpha_mode: { name: 'Alpha Mode', power: 0, type: 'buff', buff: { atk: 12, spd: 6 }, duration: 3, messages: [
    '"ALPHA MODE ACTIVATED." Chad crushes his empty protein container.',
    '"I am the apex predator of this trust dispute." Chad\'s eyes go blank.',
    '"No thoughts. Head empty. Pure AGGRESSION." Chad enters the zone.',
  ]},
  rage_quit_attack: { name: 'Rage Quit', power: 42, type: 'attack', messages: [
    'Chad upends the conference table in a fit of entitled rage!',
    '"I AM DONE WITH THIS PROCESS." Chad flings a stack of legal briefs!',
    '"My therapist said I needed to set BOUNDARIES." The briefcase becomes a weapon.',
  ]},

  // Grandma phase abilities
  emergency_shortbread: { name: 'Emergency Shortbread', power: 0, type: 'heal', healAmount: 110, messages: [
    'Grandma produces an entire tin of emergency shortbread from her handbag.',
    '"I baked these this morning. I knew today would be difficult."',
    'The smell of butter and passive aggression fills the room. Grandma heals.',
  ]},
  final_revision: { name: '"Final" Revision', power: 0, type: 'debuff', debuff: { atk: -8, def: -6 }, duration: 3, messages: [
    '"I\'ve drafted a final revision to the trust. My attorney has a copy."',
    '"Funny you should mention legacy. I was just thinking about legacy." The words land like a gavel.',
    '"This is the final revision. I said that last time too." The threat is absolute.',
  ]},
  passive_aggression: { name: 'Passive Aggression', power: 14, type: 'dot', duration: 3, messages: [
    '"I\'m not upset. I\'m just... thinking about the future." The words settle in and begin to sting.',
    '"No, you go ahead. Don\'t worry about me." The silence starts to hurt.',
    'Grandma smiles tightly and says nothing. The nothing keeps hurting.',
  ]},
  the_look: { name: 'The Look', type: 'stun', duration: 1, messages: [
    'Grandma removes her glasses. She looks at you. You cannot move.',
    'Grandma says nothing. She doesn\'t need to. The Look says everything.',
    'A silence descends. Grandma\'s eyes communicate something ancient and terrible. You freeze.',
  ]},
  gerald_incident: { name: 'The Gerald Incident', power: 38, type: 'attack', messages: [
    '"Gerald never would have stood for this. And Gerald was a man who stood for THINGS."',
    '"Do you know what Gerald would do right now? Because I do. I was there."',
    '"I have been patient. Gerald taught me patience. Gerald is gone." The grief becomes a weapon.',
  ]},

  // Grandma
  guilt_trip: { name: 'Guilt Trip', power: 30, type: 'attack', messages: [
    '"I just want what\'s best for my grandchildren... *sniff*"',
    '"I\'ve given my whole LIFE to this family..." *dabs eyes with handkerchief*',
    '"Your grandfather would be rolling in his grave right now."',
    '"No, no. I\'ll be fine. I always am. Don\'t worry about little old me."',
  ]},
  fresh_cookies: { name: 'Fresh Cookies', power: 0, type: 'heal', healAmount: 75, messages: [
    'Grandma pulls out a fresh batch of cookies!',
    'Grandma opens her purse. The smell of snickerdoodles fills the room.',
    '"Cookie, dear? I made them this morning." Grandma heals!',
  ]},
  changed_the_will: { name: '"I Changed the Will"', power: 0, type: 'debuff', debuff: { atk: -4, def: -4 }, duration: 3, messages: [
    '"I\'ve been thinking about changing the will..."',
    '"Perhaps I should leave everything to the church instead."',
    '"Did I mention I spoke with MY attorney yesterday?"',
  ]},

  // Compliance Auditor
  regulation_cite: { name: 'Regulation §17.4.2', power: 22, type: 'attack', messages: [
    'The Auditor cites regulation §17.4.2 at you!',
    'The Auditor drops a 400-page compliance manual on the table!',
    '"Per federal regulation 12 CFR §9.18..." The Auditor attacks!',
  ]},
  audit_trail: { name: 'Audit Trail', power: 15, type: 'dot', duration: 3, messages: [
    'The Auditor begins tracing your audit trail!',
    'The Auditor pulls up your transaction history. All of it.',
    '"We\'ll be reviewing every entry since 2019." The paper trail grows.',
  ]},
  form_27b_stroke_6: { name: 'Form 27B/6', power: 35, type: 'attack', messages: [
    'You haven\'t filed Form 27B/6. This is... problematic.',
    '"This form needed three signatures. You have two. DENIED."',
    'The Auditor stamps REJECTED in red ink across your face!',
  ]},

  // Regional Manager
  synergy_blast: { name: 'SYNERGY BLAST', power: 25, type: 'attack', messages: [
    'The Regional Manager fires a devastating blast of SYNERGY!',
    '"Let\'s leverage our core competencies!" A beam of pure buzzwords hits you!',
    '"SYNERGY! DISRUPTION! PARADIGM SHIFT!" The words deal physical damage!',
  ]},
  corporate_restructure: { name: 'Corporate Restructure', power: 0, type: 'debuff', debuff: { atk: -5, def: -5, spd: -3 }, duration: 1, messages: [
    '"We\'re restructuring your department."',
    '"Going forward, your role has been... redefined."',
    '"The org chart changed overnight. You report to a committee now."',
  ]},
  golden_parachute: { name: 'Golden Parachute', power: 0, type: 'heal', healAmount: 90, messages: [
    'The Regional Manager activates their golden parachute!',
    'The manager opens a briefcase full of stock options. They feel renewed.',
    '"My severance package is worth more than your salary." The manager heals!',
  ]},

  // Alex Boss
  quick_sync: { name: 'Quick Sync', power: 0, type: 'stun', duration: 1, messages: [
    '"Hey, got a sec for a quick sync?" (You don\'t.)',
    '"Let\'s just hop on a quick call—" You\'re trapped.',
    '"This will only take a minute." (It never does.)',
  ]},
  circle_back: { name: 'Let\'s Circle Back', power: 0, type: 'repeat', messages: [
    '"Let\'s circle back on that." (He repeats his last attack.)',
    '"Per our earlier discussion..." (Same attack, new buzzwords.)',
    '"Just following up on my follow-up." (Here we go again.)',
  ]},
  great_catch: { name: 'Great Catch!', power: 0, type: 'counter', messages: [
    '"Great catch! But actually..." (Counter stance activated.)',
    '"Love the initiative! However..." (He braces for your next move.)',
    '"That\'s a great point. Let me push back on that." (Counter ready.)',
  ]},

  // Reception Clients
  portfolio_panic: { name: 'Portfolio Panic', power: 14, type: 'attack', messages: [
    'The client erupts over their portfolio performance!',
    '"Why is my balance LOWER than yesterday?!" The client rages!',
    '"I saw on CNBC that everyone else is making money!" The client attacks!',
    '"My brother-in-law\'s advisor gets him 30% returns!" Panic ensues!',
  ]},
  demand_guarantees: { name: 'Demand Guarantees', power: 0, type: 'confuse', duration: 1, messages: [
    '"I need guaranteed 20% returns! Is that so hard?!"',
    '"Just put it all in something SAFE that also grows 25% a year."',
    '"My last advisor PROMISED me no losses!" (They didn\'t.)',
    '"Can\'t you just guarantee the market goes up?"',
  ]},
  call_the_other_advisor: { name: 'Call My Other Advisor', power: 20, type: 'attack', messages: [
    'The client threatens to take their business to Merrill Clinch!',
    '"Gorman Stately would NEVER treat me this way!"',
    '"I\'m calling Schwalb. They appreciate their clients!"',
    '"My golf buddy says his advisor at J.P. Morgue is MUCH better."',
  ]},
  client_bro_down: { name: 'Bro, Trust Me', power: 16, type: 'attack', messages: [
    'The client insists on putting everything in crypto, bro.',
    '"Have you heard of this new memecoin? It\'s gonna 100x, trust me."',
    '"My buddy on Reddit says SPY puts are free money!"',
    '"Just YOLO the whole trust into GameStop. What could go wrong?"',
  ]},

  // Security Guard
  badge_check: { name: 'Badge Check', power: 14, type: 'attack', messages: [
    '"Your badge is expired." The guard doesn\'t wait for you to explain.',
    '"This badge photo doesn\'t even look like you." The guard squints.',
    '"Floor access denied." The guard blocks your path!',
  ]},
  tackle: { name: 'Tackle', power: 20, type: 'attack', messages: [
    'The security guard tackles you into a filing cabinet!',
    'The guard body-checks you into the wall!',
    '"STOP RIGHT THERE!" The guard charges!',
  ]},
  radio_backup: { name: 'Radio for Backup', power: 0, type: 'buff', buff: { atk: 4, def: 4 }, duration: 3, messages: [
    '"All units, I need backup on the sixth floor!" The guard looks more confident.',
    'The guard clicks their radio. "Send reinforcements." Static crackles.',
  ]},

  // HR Representative
  mandatory_training: { name: 'Mandatory Training', power: 0, type: 'stun', duration: 1, messages: [
    '"You\'re required to complete a 4-hour sensitivity module. Right now."',
    '"We need you to watch this 90-minute video on workplace decorum."',
    '"Sign this acknowledgment form. All 47 pages."',
  ]},
  formal_warning: { name: 'Formal Warning', power: 12, type: 'dot', duration: 3, messages: [
    'The HR Rep places a formal warning in your permanent file. It stings.',
    '"This will go on your record." The words echo ominously.',
    'A yellow post-it appears on your file: "SEE ME." The bureaucracy wounds.',
  ]},
  sensitivity_seminar: { name: 'Sensitivity Seminar', power: 0, type: 'debuff', debuff: { atk: -3, spd: -3 }, duration: 1, messages: [
    '"Perhaps we should discuss your communication style." You feel vaguely guilty.',
    '"Let\'s unpack your behavior in that last meeting." Your confidence shrinks.',
  ]},
  policy_violation: { name: 'Policy Violation', power: 14, type: 'attack', tag: 'legal', messages: [
    '"Section 4.7, paragraph B clearly states—" The citation hits like a hammer.',
    'The HR Rep slides a policy document across the desk. Highlighted. Annotated. Devastating.',
    '"You are in direct violation of company policy." The words land like a punch.',
  ]},
  hostile_work_complaint: { name: 'Hostile Work Environment', power: 24, type: 'attack', tag: 'social', messages: [
    '"I\'ve filed a hostile work environment complaint on your behalf. Against you."',
    'The HR Rep produces a thick stack of complaints. All signed. All notarized.',
    '"Twelve coworkers have reported your behavior." The bureaucratic weight is crushing.',
  ]},

  // Restructuring Analyst
  downsize: { name: 'Downsize', power: 18, type: 'attack', messages: [
    '"Your position has been identified for potential elimination." Ouch.',
    '"We\'re optimizing headcount." The analyst highlights your name on a list.',
    '"The data suggests your role is... redundant."',
  ]},
  efficiency_report: { name: 'Efficiency Report', power: 0, type: 'debuff', debuff: { def: -4, spd: -4 }, duration: 1, messages: [
    'The analyst shows you a graph where your productivity is a flatline.',
    '"Your KPIs are... concerning." A spreadsheet materializes.',
    'The analyst taps a pie chart. Your slice is labeled "waste."',
  ]},
  outsource_threat: { name: 'Outsource Threat', power: 22, type: 'attack', messages: [
    '"We could replace your entire department with a SaaS platform for $9.99/month."',
    '"AI could do your job. In fact, it already does — better."',
    '"Have you seen what contractors in Bangalore charge? Much less than you."',
  ]},

  // Brand Consultant
  rebrand: { name: 'Rebrand', power: 0, type: 'confuse', duration: 1, messages: [
    '"We\'re pivoting your identity to align with our new brand architecture." You forget who you are.',
    '"Your personal brand needs work. Let me show you a mood board."',
    '"Have you considered that your name doesn\'t test well in focus groups?"',
  ]},
  focus_group: { name: 'Focus Group', power: 14, type: 'attack', messages: [
    '"Our focus group found your performance \'deeply concerning.\' Here are 47 pages of feedback."',
    'The consultant reads anonymous feedback aloud. It\'s not anonymous anymore.',
    '"On a scale of 1-10, the group rated you a \'yikes.\'"',
  ]},
  logo_redesign: { name: 'Logo Redesign', power: 0, type: 'heal', healAmount: 20, messages: [
    'The consultant unveils a new logo. It\'s the old logo but in a different font. They feel energized.',
    '"Behold our refreshed visual identity!" It\'s imperceptibly different. The consultant heals.',
  ]},

  // Data Analytics Lead
  dashboard_overload: { name: 'Dashboard Overload', power: 16, type: 'attack', tag: 'technical', messages: [
    '"I\'m just pulling up a few dashboards." Forty-seven browser tabs open simultaneously. It hurts.',
    'The lead pivots their screen toward you. Every metric is red. Somehow this is your fault.',
    '"Let me walk you through the data." The data is a wall of numbers moving at lethal speed.',
  ]},
  pivot_table: { name: 'Pivot Table', power: 0, type: 'debuff', debuff: { atk: -4, spd: -4 }, duration: 2, tag: 'technical', messages: [
    '"I\'ve restructured your action items into a pivot table." You can no longer move efficiently.',
    'The lead reorganizes your entire strategy mid-conversation. You lose the thread.',
    '"Let me reframe this." Everything you planned is suddenly in the wrong column.',
  ]},
  data_predictive_model: { name: 'Predictive Model', power: 24, type: 'attack', tag: 'technical', messages: [
    '"My model predicted you\'d do that. Three moves ago." The counterpunch lands before you swing.',
    '"The regression analysis said you\'d be here. At this time. Doing exactly this." Devastating.',
    '"Statistically, you lose. The confidence interval is 99.7%." It feels accurate.',
  ]},

  // Chief of Restructuring
  chief_strategic_pivot: { name: 'Strategic Pivot', power: 20, type: 'attack', tag: 'audit', messages: [
    '"We\'re going in a different direction." The direction is directly at you.',
    '"The strategy has evolved." The new strategy involves hitting you very hard.',
    '"Pivoting." It\'s not a metaphor.',
  ]},
  chief_corporate_mandate: { name: 'Corporate Mandate', power: 0, type: 'stun', duration: 1, tag: 'legal', messages: [
    '"This comes from the top." A document materializes. You cannot argue with a document.',
    '"Regional has authorized this." The weight of corporate authority pins you in place.',
    '"You are hereby directed to stand down." You stand down.',
  ]},
  force_majeure: { name: 'Force Majeure', power: 0, type: 'heal', healAmount: 30, messages: [
    '"Unforeseeable circumstances." The Chief invokes a legal clause and regroups.',
    '"Acts of God. Market forces. Beyond our control." The Chief recovers momentum.',
    'The Chief cites an obscure contract clause that apparently restores vitality.',
  ]},

  // Corporate Lawyer
  cease_desist: { name: 'Cease & Desist', power: 0, type: 'stun', duration: 1, messages: [
    '"You are hereby ordered to cease and desist all activities pending review." You freeze.',
    '"My client demands you stop. Immediately. I have paperwork." You\'re paralyzed.',
    'A cease and desist letter materializes from thin air. You can\'t move.',
  ]},
  legal_jargon: { name: 'Legal Jargon', power: 0, type: 'confuse', duration: 1, messages: [
    '"Pursuant to Section 14(a)(2)(iii) of the aforementioned..." Your brain shuts down.',
    '"The party of the first part, notwithstanding..." Your eyes glaze over.',
    '"Under the doctrine of respondeat superior, vis-à-vis..." Nothing makes sense anymore.',
  ]},
  billable_assault: { name: 'Billable Assault', power: 28, type: 'attack', messages: [
    'The lawyer charges you $450/hour while also charging AT you.',
    '"This conversation is billable." The lawyer attacks and invoices you simultaneously.',
    'Each word costs $50. The lawyer uses a LOT of words. Violently.',
  ]},

  // Rachel SVP (3-phase boss)
  strategic_pivot: { name: 'Strategic Pivot', power: 20, type: 'attack', messages: [
    '"This department is pivoting. You\'re either on the bus or under it."',
    '"We\'re going in a new direction. You\'re not invited."',
    '"Strategic realignment requires... sacrifices." Rachel strikes!',
  ]},
  performance_review: { name: 'Performance Review', power: 0, type: 'debuff', debuff: { atk: -4, def: -4 }, duration: 1, messages: [
    'Rachel reads your performance review aloud. Every word is a scalpel.',
    '"Let me share some \'constructive feedback.\'" Rachel\'s smile doesn\'t reach her eyes.',
    '"I\'ve prepared a 360-degree assessment. It\'s mostly degrees of disappointment."',
  ]},
  restructure_threat: { name: 'Restructure Threat', power: 16, type: 'dot', duration: 3, messages: [
    '"I\'m restructuring this department. Starting with your position."',
    '"By Friday, this department will look very different. Very." The threat lingers.',
    '"I have a meeting with the board tomorrow. About you." Dread sets in.',
  ]},
  hostile_takeover: { name: 'Hostile Takeover', power: 30, type: 'attack', messages: [
    'Rachel executes a hostile takeover of your composure!',
    '"This isn\'t personal. It\'s structural." Rachel\'s attack feels VERY personal.',
    'Rachel presents a PowerPoint titled "Why You\'re Wrong." It has 30 slides.',
  ]},
  board_resolution: { name: 'Board Resolution', power: 0, type: 'heal', healAmount: 40, messages: [
    'Rachel invokes a board resolution. The corporate hierarchy reinforces her.',
    '"The board has approved my proposal." Rachel\'s power grows.',
  ]},
  golden_handcuffs: { name: 'Golden Handcuffs', power: 0, type: 'stun', duration: 1, messages: [
    '"Your compensation package includes a non-compete. You can\'t leave. Ever."',
    '"I\'ve locked your stock options. You\'re not going anywhere."',
  ]},
  final_assessment: { name: 'Final Assessment', power: 35, type: 'attack', messages: [
    '"My final assessment: this department doesn\'t need you. It needs ME."',
    '"The data is clear. I am the future of this organization. You are the past."',
  ]},

  // CFO's Assistant
  expense_review: { name: 'Expense Review', power: 18, type: 'attack', messages: [
    '"This lunch receipt from 2019... explain yourself."',
    '"You claimed $12 for parking on a day the office was closed."',
    '"Your coffee expenses exceed your department\'s supply budget."',
  ]},
  budget_slash: { name: 'Budget Slash', power: 0, type: 'debuff', debuff: { atk: -5, spd: -3 }, duration: 3, messages: [
    '"Your department budget has been reduced by 40%."',
    '"We\'re implementing a spending freeze. Effective now."',
  ]},
  cfo_call: { name: 'CFO on Line One', power: 0, type: 'buff', buff: { atk: 6, def: 6 }, duration: 1, messages: [
    '"The CFO is backing me on this." The assistant grows more confident.',
    'The assistant holds up their phone. "The CFO says hi." Power radiates from the screen.',
  ]},

  // Regional Director
  corporate_mandate: { name: 'Corporate Mandate', power: 24, type: 'attack', messages: [
    '"By mandate of the board: your department is being absorbed."',
    '"Corporate has decided. There is no appeal." The director strikes!',
    '"This comes from the top. You have no recourse."',
  ]},
  market_correction: { name: 'Market Correction', power: 30, type: 'attack', messages: [
    '"The market has spoken. Your services are... corrected."',
    '"Consider this a correction to your career trajectory."',
    '"Markets are efficient. Your employment is not." A devastating blow!',
  ]},
  quarterly_target: { name: 'Quarterly Target', power: 22, type: 'dot', duration: 3, messages: [
    '"You missed Q3 targets by 0.3%. This will be on your record."',
    '"Your quarterly performance is trending down. Again."',
    '"Every quarter you underperform, the board takes notice."',
  ]},

  // The Algorithm (Final Boss)
  data_harvest: { name: 'Data Harvest', power: 18, type: 'attack', messages: [
    'The Algorithm scrapes your performance data and weaponizes it.',
    'The Algorithm processes your entire work history in 0.003 seconds. It\'s not impressed.',
    'Every email you\'ve ever sent is analyzed. The Algorithm attacks with your own words.',
  ]},
  pattern_recognition: { name: 'Pattern Recognition', power: 0, type: 'debuff', debuff: { def: -6 }, duration: 1, messages: [
    '"I have identified 47 inefficiencies in your workflow." Your defenses crumble.',
    '"Your behavioral patterns are... predictable." The Algorithm adapts.',
    '"Anomaly detected: human error rate 94.7%." Your guard drops.',
  ]},
  risk_assessment: { name: 'Risk Assessment', power: 0, type: 'confuse', duration: 1, messages: [
    '"Probability of your success: 3.7%." The numbers swirl around you.',
    '"Running Monte Carlo simulation... all outcomes unfavorable."',
    '"Risk assessment complete. Recommendation: surrender."',
  ]},
  predictive_model: { name: 'Predictive Model', power: 0, type: 'counter', messages: [
    '"I predicted your move 3 turns ago." Counter stance activated.',
    '"Your next action has already been accounted for." The Algorithm braces.',
  ]},
  algorithmic_trading: { name: 'Algorithmic Trading', power: 28, type: 'attack', messages: [
    'The Algorithm executes 10,000 trades per second. Each one costs you patience.',
    'High-frequency trading algorithms assault your composure at lightspeed!',
    'The Algorithm shorts your confidence and goes long on despair.',
  ]},
  total_optimization: { name: 'TOTAL OPTIMIZATION', power: 40, type: 'attack', messages: [
    '"Humans are the bottleneck. I am the solution." The Algorithm unleashes its full power.',
    '"OPTIMIZATION COMPLETE. HUMAN INPUT: DEPRECATED." Reality warps!',
    '"All inefficiencies will be eliminated. Starting with you." Maximum power!',
  ]},
  process_termination: { name: 'Process Termination', power: 0, type: 'stun', duration: 1, messages: [
    '"PROCESS TERMINATED." Your action is forcibly cancelled.',
    '"You are running an unauthorized process. Terminating." You freeze.',
    '"Input rejected. Rebooting user." You can\'t move.',
  ]},
  system_overload: { name: 'System Overload', power: 20, type: 'dot', duration: 3, messages: [
    'The Algorithm floods your cognitive load. Damage accumulates.',
    '"Overclocking human capacity." Data pours into your mind, turn after turn.',
    '"Distributed processing — your patience is the shared resource." Damage begins building.',
  ]},
};

// Andrew's in-combat quips
export const ANDREW_TAUNTS = {
  crit: [
    "That's going in the quarterly report.",
    "Documented. Timestamped. Witnessed.",
    "You call that a defense?",
    "That's why I bill hourly.",
  ],
  weakness_hit: [
    "I did my due diligence.",
    "Should've read the fine print.",
    "Weakness identified. Exploited. Filed.",
    "That's what the risk assessment was for.",
  ],
  brace_success: [
    "I anticipated that.",
    "Already had the counter-memo drafted.",
    "Predicted it. Mitigated it. Moving on.",
    "Per my earlier risk assessment.",
  ],
  power_move: [
    "ASSERT DOMINANCE. This meeting is adjourned.",
    "Conference room. Now. Everyone.",
    "I invoke my full authority as Trust Officer.",
    "Andrew has entered the building.",
  ],
  confused: [
    "What was I... where is my coffee.",
    "The synergy is... disorienting.",
    "I need to reschedule my thoughts.",
  ],
  enemy_crit: [
    "That's going on your permanent record.",
    "HR will be hearing about this.",
    "Bold move. Filing a counter-claim.",
    "Noted. Not appreciated. But noted.",
  ],
  retaliate: [
    "Counter-offer.",
    "Per my last email — no.",
    "You should've read the brace clause.",
    "That's what we call a learning moment.",
  ],
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
