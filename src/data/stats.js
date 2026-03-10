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
  due_diligence: {
    name: 'Due Diligence',
    description: 'Expose the enemy\'s weaknesses through thorough analysis',
    cost: 15,
    type: 'debuff',
    debuffAmount: { def: -5 },
    debuffDuration: 3,
    unlockLevel: 3,
  },
  fiduciary_shield: {
    name: 'Fiduciary Shield',
    description: 'Invoke fiduciary duty for a protective barrier',
    cost: 20,
    type: 'buff',
    buffAmount: { def: 8 },
    buffDuration: 2,
    unlockLevel: 4,
  },
  whistleblower: {
    name: 'Whistleblower',
    description: 'Blow the whistle on corporate malfeasance',
    cost: 45,
    power: 55,
    type: 'attack',
    unlockLevel: 5,
  },
  power_of_attorney: {
    name: 'Power of Attorney',
    description: 'Invoke ultimate legal authority to restore patience',
    cost: 40,
    healAmount: 100,
    type: 'heal',
    unlockLevel: 6,
    skipsTurn: false,
  },
  // Subquest-unlocked abilities
  root_access: {
    name: 'Root Access',
    description: 'Hack directly into the enemy\'s mainframe',
    cost: 35,
    power: 50,
    type: 'attack',
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
    description: 'Audit across timelines — take two actions this turn',
    cost: 45,
    type: 'special',
    special: 'double_turn',
    unlockQuest: 'daves_legacy',
  },
  notarized_strike: {
    name: 'Notarized Strike',
    description: 'A legally binding attack with full notarial authority',
    cost: 30,
    power: 60,
    type: 'attack',
    unlockQuest: 'printers_soul',
  },
  invoke_charter: {
    name: 'Invoke Charter',
    description: 'Read the 1947 charter aloud — devastating to bad-faith enemies',
    cost: 60,
    power: 100,
    type: 'attack',
    unlockQuest: 'final_patch',
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
  ross_boss: {
    name: 'Ross (Unhinged)',
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

  // Acts 3–5 enemies
  security_guard: {
    name: 'Security Guard',
    maxHP: 90,
    hp: 90,
    atk: 16,
    def: 14,
    spd: 8,
    xpReward: 60,
    abilities: ['badge_check', 'tackle', 'radio_backup'],
  },
  hr_rep: {
    name: 'HR Representative',
    maxHP: 60,
    hp: 60,
    atk: 10,
    def: 12,
    spd: 6,
    xpReward: 45,
    abilities: ['mandatory_training', 'formal_warning', 'sensitivity_seminar'],
  },
  restructuring_analyst: {
    name: 'Restructuring Analyst',
    maxHP: 80,
    hp: 80,
    atk: 14,
    def: 10,
    spd: 12,
    xpReward: 70,
    abilities: ['downsize', 'efficiency_report', 'outsource_threat'],
  },
  brand_consultant: {
    name: 'Brand Consultant',
    maxHP: 70,
    hp: 70,
    atk: 12,
    def: 8,
    spd: 14,
    xpReward: 65,
    abilities: ['rebrand', 'focus_group', 'logo_redesign'],
  },
  corporate_lawyer: {
    name: 'Corporate Lawyer',
    maxHP: 130,
    hp: 130,
    atk: 20,
    def: 16,
    spd: 10,
    xpReward: 120,
    abilities: ['cease_desist', 'legal_jargon', 'billable_assault'],
  },
  rachel_boss: {
    name: 'Rachel, SVP',
    maxHP: 200,
    hp: 200,
    atk: 22,
    def: 18,
    spd: 12,
    xpReward: 300,
    abilities: ['strategic_pivot', 'performance_review', 'restructure_threat'],
    phases: [
      { hpThreshold: 0.6, abilities: ['strategic_pivot', 'performance_review', 'restructure_threat'] },
      { hpThreshold: 0.3, abilities: ['hostile_takeover', 'board_resolution', 'golden_handcuffs'] },
      { hpThreshold: 0, abilities: ['hostile_takeover', 'board_resolution', 'final_assessment'] },
    ],
  },
  cfos_assistant: {
    name: 'CFO\'s Assistant',
    maxHP: 160,
    hp: 160,
    atk: 18,
    def: 14,
    spd: 14,
    xpReward: 180,
    abilities: ['expense_review', 'budget_slash', 'cfo_call'],
  },
  regional_director: {
    name: 'Regional Director',
    maxHP: 220,
    hp: 220,
    atk: 24,
    def: 20,
    spd: 10,
    xpReward: 350,
    abilities: ['corporate_mandate', 'synergy_blast', 'market_correction', 'quarterly_target'],
    phases: [
      { hpThreshold: 0.6, abilities: ['corporate_mandate', 'synergy_blast', 'quarterly_target'] },
      { hpThreshold: 0.3, abilities: ['market_correction', 'corporate_mandate', 'quarterly_target'] },
      { hpThreshold: 0, abilities: ['market_correction', 'synergy_blast', 'corporate_mandate'] },
    ],
  },
  algorithm: {
    name: 'The Algorithm',
    maxHP: 300,
    hp: 300,
    atk: 20,
    def: 22,
    spd: 16,
    xpReward: 500,
    abilities: ['data_harvest', 'pattern_recognition', 'risk_assessment'],
    phases: [
      { hpThreshold: 0.7, abilities: ['data_harvest', 'pattern_recognition', 'risk_assessment'] },
      { hpThreshold: 0.35, abilities: ['predictive_model', 'algorithmic_trading', 'data_harvest'] },
      { hpThreshold: 0, abilities: ['total_optimization', 'algorithmic_trading', 'predictive_model'] },
    ],
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

  // Security Guard
  badge_check: { name: 'Badge Check', power: 14, type: 'attack', message: '"Your badge is expired." The guard doesn\'t wait for you to explain.' },
  tackle: { name: 'Tackle', power: 20, type: 'attack', message: 'The security guard tackles you into a filing cabinet!' },
  radio_backup: { name: 'Radio for Backup', power: 0, type: 'buff', buff: { atk: 4, def: 4 }, duration: 3, message: '"All units, I need backup on the sixth floor!" The guard looks more confident.' },

  // HR Representative
  mandatory_training: { name: 'Mandatory Training', power: 0, type: 'stun', duration: 1, message: '"You\'re required to complete a 4-hour sensitivity module. Right now."' },
  formal_warning: { name: 'Formal Warning', power: 12, type: 'dot', duration: 3, message: 'The HR Rep places a formal warning in your permanent file. It stings.' },
  sensitivity_seminar: { name: 'Sensitivity Seminar', power: 0, type: 'debuff', debuff: { atk: -3, spd: -3 }, duration: 2, message: '"Perhaps we should discuss your communication style." You feel vaguely guilty.' },

  // Restructuring Analyst
  downsize: { name: 'Downsize', power: 18, type: 'attack', message: '"Your position has been identified for potential elimination." Ouch.' },
  efficiency_report: { name: 'Efficiency Report', power: 0, type: 'debuff', debuff: { def: -4, spd: -4 }, duration: 2, message: 'The analyst shows you a graph where your productivity is a flatline.' },
  outsource_threat: { name: 'Outsource Threat', power: 22, type: 'attack', message: '"We could replace your entire department with a SaaS platform for $9.99/month."' },

  // Brand Consultant
  rebrand: { name: 'Rebrand', power: 0, type: 'confuse', duration: 2, message: '"We\'re pivoting your identity to align with our new brand architecture." You forget who you are.' },
  focus_group: { name: 'Focus Group', power: 14, type: 'attack', message: '"Our focus group found your performance \'deeply concerning.\' Here are 47 pages of feedback."' },
  logo_redesign: { name: 'Logo Redesign', power: 0, type: 'heal', healAmount: 20, message: 'The consultant unveils a new logo. It\'s the old logo but in a different font. They feel energized.' },

  // Corporate Lawyer
  cease_desist: { name: 'Cease & Desist', power: 0, type: 'stun', duration: 1, message: '"You are hereby ordered to cease and desist all activities pending review." You freeze.' },
  legal_jargon: { name: 'Legal Jargon', power: 0, type: 'confuse', duration: 2, message: '"Pursuant to Section 14(a)(2)(iii) of the aforementioned..." Your brain shuts down.' },
  billable_assault: { name: 'Billable Assault', power: 28, type: 'attack', message: 'The lawyer charges you $450/hour while also charging AT you.' },

  // Rachel SVP (3-phase boss)
  strategic_pivot: { name: 'Strategic Pivot', power: 20, type: 'attack', message: '"This department is pivoting. You\'re either on the bus or under it."' },
  performance_review: { name: 'Performance Review', power: 0, type: 'debuff', debuff: { atk: -4, def: -4 }, duration: 2, message: 'Rachel reads your performance review aloud. Every word is a scalpel.' },
  restructure_threat: { name: 'Restructure Threat', power: 16, type: 'dot', duration: 3, message: '"I\'m restructuring this department. Starting with your position."' },
  hostile_takeover: { name: 'Hostile Takeover', power: 30, type: 'attack', message: 'Rachel executes a hostile takeover of your composure!' },
  board_resolution: { name: 'Board Resolution', power: 0, type: 'heal', healAmount: 40, message: 'Rachel invokes a board resolution. The corporate hierarchy reinforces her.' },
  golden_handcuffs: { name: 'Golden Handcuffs', power: 0, type: 'stun', duration: 1, message: '"Your compensation package includes a non-compete. You can\'t leave. Ever."' },
  final_assessment: { name: 'Final Assessment', power: 35, type: 'attack', message: '"My final assessment: this department doesn\'t need you. It needs ME."' },

  // CFO's Assistant
  expense_review: { name: 'Expense Review', power: 18, type: 'attack', message: '"This lunch receipt from 2019... explain yourself."' },
  budget_slash: { name: 'Budget Slash', power: 0, type: 'debuff', debuff: { atk: -5, spd: -3 }, duration: 3, message: '"Your department budget has been reduced by 40%."' },
  cfo_call: { name: 'CFO on Line One', power: 0, type: 'buff', buff: { atk: 6, def: 6 }, duration: 2, message: '"The CFO is backing me on this." The assistant grows more confident.' },

  // Regional Director
  corporate_mandate: { name: 'Corporate Mandate', power: 24, type: 'attack', message: '"By mandate of the board: your department is being absorbed."' },
  market_correction: { name: 'Market Correction', power: 30, type: 'attack', message: '"The market has spoken. Your services are... corrected."' },
  quarterly_target: { name: 'Quarterly Target', power: 0, type: 'dot', duration: 3, message: '"You missed Q3 targets by 0.3%. This will be on your record."' },

  // The Algorithm (Final Boss)
  data_harvest: { name: 'Data Harvest', power: 18, type: 'attack', message: 'The Algorithm scrapes your performance data and weaponizes it.' },
  pattern_recognition: { name: 'Pattern Recognition', power: 0, type: 'debuff', debuff: { def: -6 }, duration: 2, message: '"I have identified 47 inefficiencies in your workflow." Your defenses crumble.' },
  risk_assessment: { name: 'Risk Assessment', power: 0, type: 'confuse', duration: 2, message: '"Probability of your success: 3.7%." The numbers swirl around you.' },
  predictive_model: { name: 'Predictive Model', power: 0, type: 'counter', message: '"I predicted your move 3 turns ago." Counter stance activated.' },
  algorithmic_trading: { name: 'Algorithmic Trading', power: 28, type: 'attack', message: 'The Algorithm executes 10,000 trades per second. Each one costs you patience.' },
  total_optimization: { name: 'TOTAL OPTIMIZATION', power: 40, type: 'attack', message: '"Humans are the bottleneck. I am the solution." The Algorithm unleashes its full power.' },
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
