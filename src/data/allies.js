import _allyOverrides from './ally-overrides.json' with { type: 'json' };

// Recruitable ally party members for multi-combatant fights.
// allies[0] is always the player (Andrew); these are allies[1+].
//
// AI control: each ally has an ALLY_AI_PATTERNS entry (rotation by default).
// Built-in heuristics override the pattern: heal preference if any ally < 40% HP,
// AoE preference when 2+ alive enemies. CombatEngine handles target picking.

// `abilities` is the FULL pool — used for ability-tree display and gating.
// `starterAbilities` is what the ally has unlocked when recruited; the rest must
// be unlocked via upgrade points in the menu (same flow as Andrew).
// `growthFactor` (default 0.8) scales LEVEL_GROWTH stat gains so allies trail
// Andrew slightly. `tags` are thematic hints used by AI / dialogue.
export const ALLY_STATS = {
  janet: {
    name: 'Janet',
    role: 'Senior Trust Officer',
    tags: ['social', 'audit'],
    maxHP: 220,
    hp: 220,
    maxMP: 80,
    mp: 80,
    atk: 13,
    def: 11,
    spd: 9,
    growthFactor: 0.85,
    abilities: ['nope_email', 'rally_team', 'group_complaint', 'fact_check', 'binder_slam', 'pto_request'],
    starterAbilities: ['nope_email', 'rally_team', 'fact_check'],
    recruitedRoom: 'cubicle_farm',
  },
  alex_it: {
    name: 'Alex from IT',
    role: 'Sysadmin',
    tags: ['technical', 'audit'],
    maxHP: 180,
    hp: 180,
    maxMP: 110,
    mp: 110,
    atk: 11,
    def: 9,
    spd: 13,
    growthFactor: 0.8,
    abilities: ['ddos_email', 'ssh_in', 'force_quit', 'backup_restore', 'kernel_panic', 'ticket_close'],
    starterAbilities: ['ddos_email', 'ssh_in', 'force_quit'],
    recruitedRoom: 'server_room',
  },
  isaiah: {
    name: 'Isaiah',
    role: 'Operations Manager',
    tags: ['social', 'defense'],
    maxHP: 260,
    hp: 260,
    maxMP: 70,
    mp: 70,
    atk: 12,
    def: 14,
    spd: 7,
    growthFactor: 0.9,
    abilities: ['motion_to_table', 'bridge_builder', 'redirect', 'filing_cabinet', 'staff_meeting', 'paperwork_blizzard'],
    starterAbilities: ['motion_to_table', 'bridge_builder', 'filing_cabinet'],
    recruitedRoom: 'cubicle_farm',
  },
  diane: {
    name: 'Diane',
    role: 'HR Compliance',
    tags: ['audit', 'social'],
    maxHP: 210,
    hp: 210,
    maxMP: 95,
    mp: 95,
    atk: 13,
    def: 12,
    spd: 10,
    growthFactor: 0.85,
    abilities: ['hr_complaint', 'receipt', 'policy_loophole', 'termination_letter', 'cite_handbook', 'mandatory_training'],
    starterAbilities: ['hr_complaint', 'receipt', 'cite_handbook'],
    recruitedRoom: 'hr_office',
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
  // Janet — tier 2 unlocks
  binder_slam: {
    name: 'Binder Slam',
    description: 'Drop a 4-inch policy binder on a desk. The whole floor flinches.',
    cost: 28,
    power: 28,
    type: 'attack',
    tag: 'audit',
    messages: [
      'Janet THUMPS the policy binder onto the desk. Pages settle.',
      'Janet: "Page. Forty. Seven."',
    ],
  },
  pto_request: {
    name: 'PTO Request',
    description: 'Force the meeting to take a break. Restores party MP.',
    cost: 30,
    type: 'heal_ally',
    healAmount: 0,
    mpHealAmount: 30,
    messages: [
      'Janet announces a five-minute break. Coffee is brewed. Lawsuits cool.',
    ],
  },

  // ── Alex from IT — technical/audit ────────────────────────────────
  ddos_email: {
    name: 'Reply-All Storm',
    description: 'Forward every server log to every executive. Inboxes melt.',
    cost: 12,
    power: 18,
    type: 'attack',
    tag: 'technical',
    messages: [
      'Alex: "I forwarded the audit trail. To everyone. Yes, including the board."',
      'Alex hits SEND. The cubicle farm\'s phones all buzz at once.',
    ],
  },
  ssh_in: {
    name: 'SSH In',
    description: 'Remote-disable an enemy\'s laptop mid-pitch.',
    cost: 22,
    power: 24,
    type: 'attack',
    tag: 'technical',
    messages: [
      'Alex types four characters and presses Enter. The enemy\'s screen blue-screens.',
      'Alex: "I had your hostname on a sticky note since orientation."',
    ],
  },
  force_quit: {
    name: 'Force Quit',
    description: 'Cmd-Option-Esc the loudest speaker in the room.',
    cost: 20,
    type: 'silence',
    tag: 'technical',
    duration: 2,
    messages: [
      'Alex: "I just... force-quit the talking."',
      'Alex slams the kill command. Their PowerPoint freezes mid-sentence.',
    ],
  },
  backup_restore: {
    name: 'Backup Restore',
    description: 'Roll back the most-wounded ally to a healthier snapshot.',
    cost: 26,
    type: 'heal_ally',
    healAmount: 70,
    messages: [
      'Alex: "Restoring from yesterday\'s backup. You owe me a coffee."',
    ],
  },
  kernel_panic: {
    name: 'Kernel Panic',
    description: 'Trigger a system-wide failure. Big AoE technical damage.',
    cost: 38,
    power: 22,
    type: 'attack_aoe',
    tag: 'technical',
    messages: [
      'Alex: "On three, I\'m hard-rebooting the entire building."',
      'Lights flicker. Servers scream. Three suits drop their tablets.',
    ],
  },
  ticket_close: {
    name: 'Ticket Closed',
    description: 'Mark this whole problem as "Resolved — Working as Intended."',
    cost: 30,
    type: 'debuff',
    tag: 'technical',
    debuffAmount: { atk: -6, spd: -3 },
    debuffDuration: 2,
    messages: [
      'Alex: "Closed your ticket. Pebkac. Read the wiki."',
    ],
  },

  // ── Isaiah — operations / defense ─────────────────────────────────
  motion_to_table: {
    name: 'Motion to Table',
    description: 'Suggest revisiting the topic next quarter. Enemies lose attack steam.',
    cost: 14,
    type: 'debuff',
    tag: 'social',
    debuffAmount: { atk: -5 },
    debuffDuration: 3,
    messages: [
      'Isaiah: "Why don\'t we table this and circle back next quarter?"',
      'Isaiah: "Let\'s parking-lot that one and revisit at the offsite."',
    ],
  },
  bridge_builder: {
    name: 'Bridge Builder',
    description: 'Buff party DEF by acknowledging everyone\'s feelings.',
    cost: 18,
    type: 'buff_party',
    buffAmount: { def: 6 },
    buffDuration: 3,
    messages: [
      'Isaiah: "I hear what everyone\'s saying. You all have valid points."',
      'Isaiah de-escalates. The room exhales.',
    ],
  },
  redirect: {
    name: 'Redirect',
    description: 'Step into the spotlight. Take aggro and brace for impact.',
    cost: 16,
    type: 'buff_party',
    buffAmount: { def: 3 },
    buffDuration: 2,
    special: 'taunt',
    messages: [
      'Isaiah: "Talk to me. Not him. Me."',
      'Isaiah moves between the team and the threat.',
    ],
  },
  filing_cabinet: {
    name: 'Filing Cabinet',
    description: 'Pull the actual paper trail. Heavy single-target hit.',
    cost: 24,
    power: 26,
    type: 'attack',
    tag: 'audit',
    messages: [
      'Isaiah opens a four-drawer cabinet, finds the right manila folder, lays it open.',
      'Isaiah: "I keep paper for a reason."',
    ],
  },
  staff_meeting: {
    name: 'Staff Meeting',
    description: 'Call a 30-minute working session. Allies recover MP.',
    cost: 32,
    type: 'heal_ally',
    healAmount: 0,
    mpHealAmount: 25,
    messages: [
      'Isaiah books the conference room. Everyone has to come.',
    ],
  },
  paperwork_blizzard: {
    name: 'Paperwork Blizzard',
    description: 'Bury the room in forms. AoE audit damage.',
    cost: 36,
    power: 18,
    type: 'attack_aoe',
    tag: 'audit',
    messages: [
      'Isaiah: "Everyone needs to fill out a 1099-MISC, a W-9, and form 4506-T."',
      'Paper cuts. So many paper cuts.',
    ],
  },

  // ── Diane — HR / compliance ───────────────────────────────────────
  hr_complaint: {
    name: 'HR Complaint',
    description: 'Document the hostile language. Single target loses ATK.',
    cost: 12,
    type: 'debuff',
    tag: 'social',
    debuffAmount: { atk: -6 },
    debuffDuration: 2,
    messages: [
      'Diane: "I am going to need a written statement."',
      'Diane: "That\'s in your file now."',
    ],
  },
  receipt: {
    name: 'Receipt',
    description: 'Produce documentation that contradicts everything they just said.',
    cost: 18,
    power: 22,
    type: 'attack',
    tag: 'audit',
    messages: [
      'Diane: "Funny you should mention that. I have the email chain."',
      'Diane prints something on the closest office printer. The room reads it.',
    ],
  },
  policy_loophole: {
    name: 'Policy Loophole',
    description: 'Find the line in the handbook that lets you do this anyway.',
    cost: 20,
    type: 'buff_party',
    buffAmount: { atk: 3, spd: 2 },
    buffDuration: 3,
    messages: [
      'Diane: "Section 4.2 says we can. They missed it in revision."',
    ],
  },
  termination_letter: {
    name: 'Termination Letter',
    description: 'Devastating audit attack. Cost is high. So is the impact.',
    cost: 42,
    power: 50,
    type: 'attack',
    tag: 'audit',
    messages: [
      'Diane slides a folder across. "Read the cover sheet."',
      'Diane: "Your effective date was yesterday."',
    ],
  },
  cite_handbook: {
    name: 'Cite Handbook',
    description: 'Quote the employee handbook chapter and verse. Targets DEF drops.',
    cost: 14,
    type: 'debuff',
    tag: 'audit',
    debuffAmount: { def: -5 },
    debuffDuration: 2,
    messages: [
      'Diane: "Page 12, paragraph C. You signed it."',
    ],
  },
  mandatory_training: {
    name: 'Mandatory Training',
    description: 'Force the room into a 60-minute compliance video.',
    cost: 38,
    type: 'debuff',
    tag: 'social',
    debuffAmount: { atk: -3, def: -3, spd: -2 },
    debuffDuration: 2,
    messages: [
      'Diane: "Everyone needs to complete this module by EOD."',
      'A grainy 2003-era training video starts playing on the conference TV.',
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
  janet:   { type: 'rotation' },
  alex_it: { type: 'rotation' },
  isaiah:  { type: 'rotation' },
  diane:   { type: 'rotation' },
};

// Apply ally-overrides.json (set via `npm run editor`).
for (const [id, o] of Object.entries(_allyOverrides.stats || {})) {
  if (ALLY_STATS[id]) {
    Object.assign(ALLY_STATS[id], o);
    if (o.maxHP !== undefined) ALLY_STATS[id].hp = o.maxHP;
    if (o.maxMP !== undefined) ALLY_STATS[id].mp = o.maxMP;
  } else {
    // Allow defining a brand-new ally entirely from the override file.
    ALLY_STATS[id] = { ...o, hp: o.maxHP, mp: o.maxMP };
  }
}
for (const [id, o] of Object.entries(_allyOverrides.abilities || {})) {
  if (ALLY_ABILITIES[id]) Object.assign(ALLY_ABILITIES[id], o);
  else ALLY_ABILITIES[id] = { ...o };
}
