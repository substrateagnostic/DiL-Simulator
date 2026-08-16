import { SHOP_ITEMS } from '../shop.js';

// Derived from the shop inventory so adding a renovation automatically extends
// the completionist rule instead of leaving a second hand-maintained list.
export const ALL_RENOVATION_FLAGS = SHOP_ITEMS
  .filter(item => item.category === 'renovation' && item.flag)
  .map(item => item.flag);

export const ACTS = [
  { index: 1, id: 'act1', when: 'briefing_complete', quest: 'main_act2' },
  { index: 2, id: 'act2', when: 'branch_chosen', quest: 'main_act2_finale' },
  { index: 3, id: 'act3', when: 'act2_complete', quest: 'main_act3' },
  { index: 4, id: 'act4', when: 'act3_complete', quest: 'main_act4' },
  { index: 5, id: 'act5', when: 'act4_complete', quest: 'main_act5' },
  { index: 6, id: 'act6', when: 'act5_complete', quest: 'main_act6' },
  { index: 7, id: 'act7', when: 'act6_complete', quest: 'main_act7' },
];

// ORDER IS BEHAVIOUR. This is one top-to-bottom pass, never a fixpoint. In
// particular, the Intern placement rules intentionally run before the Board
// Room close rule, while rules 6-9 read the intern_at_desk value rule 5 writes.
export const DERIVE = [
  {
    id: 'ready_for_skip',
    mode: 'latch',
    when: ['all', 'met_janet', 'met_intern', 'met_isaiah', 'met_alex_it', 'met_rachel'],
    note: 'Auto-gate Skip until all FIVE coworkers have been met. Rachel must be in the same five-person list the HUD prints, or the objective can ask for someone the gate does not want, or vice versa.',
  },
  {
    id: 'act6_ready',
    mode: 'latch',
    when: ['all', 'act5_complete', 'janet_act6_rallied', 'diane_act6_rallied',
      'intern_act6_rallied', 'skip_speech_ready', 'grandma_ally', 'diane_evidence',
      'isaiah_evidence'],
    note: 'This is the Act 6 fully prepared signal: five allies plus two pieces of evidence. It used to gate the Janitor\'s Rolex but now changes the board meeting contributions, outcome tier reach, and epilogue cards; act6_ready therefore means “prepared,” not “meeting held.”',
  },
  {
    id: 'karen_first_meeting_over',
    mode: 'latch',
    when: ['any', 'karen_defeated', 'retry_karen'],
    note: 'The first Karen meeting is over whether Karen lost (karen_defeated) or the player lost (retry_karen). This synthetic flag needs BOTH terms because an NPC condition holds only one flag/notFlag pair; without it, winning on the first attempt leaves Karen in the conference room for the rest of the game with a live start_combat: karen behind her.',
  },
  {
    id: 'meredith_era_over',
    mode: 'latch',
    when: ['any', 'act4_complete', 'act5_complete'],
    note: 'Meredith’s acts-3-4 pacing entry really needs act2_complete && !act4_complete && !act5_complete, while an NPC condition holds only one notFlag. This one-way synthetic flag exists because a straddling save reached act 5+ with act4_complete unset and otherwise left the stale Meredith pacer standing mid-room at night.',
  },
  {
    id: 'intern_at_desk',
    mode: 'live',
    when: ['any', ['not', 'act5_complete'], 'board_meeting_closed'],
    note: 'The Intern is at his workstation except during the Act 6 rehearsal-and-board window. This and the next four live flags partition five mutually exclusive placements. They are five flags, not one, because an NPC condition holds ONE flag/notFlag pair and three of the placement states need two positive terms.',
  },
  {
    id: 'intern_confronting',
    mode: 'live',
    when: ['all', 'intern_at_desk', 'lunch_thief_culprit_revealed',
      ['not', 'lunch_thief_complete']],
    note: 'This is the at-desk, culprit-revealed, lunch-quest-incomplete placement. It belongs to a five-flag partition rather than one flag because an NPC condition holds ONE flag/notFlag pair and three of the placement states need two positive terms.',
  },
  {
    id: 'intern_desk_idle',
    mode: 'live',
    when: ['all', 'intern_at_desk', 'lunch_thief_complete'],
    note: 'This is the at-desk, lunch-quest-complete placement. It belongs to a five-flag partition rather than one flag because an NPC condition holds ONE flag/notFlag pair and three of the placement states need two positive terms.',
  },
  {
    id: 'intern_rehearsing',
    mode: 'live',
    when: ['all', ['not', 'intern_at_desk'], ['not', 'read_intern_rehearsal']],
    note: 'This is the away-from-desk, rehearsal-unread placement. It belongs to a five-flag partition rather than one flag because an NPC condition holds ONE flag/notFlag pair and three of the placement states need two positive terms.',
  },
  {
    id: 'intern_rally_ready',
    mode: 'live',
    when: ['all', ['not', 'intern_at_desk'], 'read_intern_rehearsal',
      ['not', 'intern_act6_rallied']],
    note: 'This is the away-from-desk, rehearsal-read, not-yet-rallied placement. It belongs to a five-flag partition rather than one flag because an NPC condition holds ONE flag/notFlag pair and three of the placement states need two positive terms.',
  },
  {
    id: 'predecessors_all_found',
    mode: 'latch',
    when: ['all', 'pred_bathroom_found', 'pred_garage_found', 'pred_copy_found'],
    note: 'Diane names three predecessors in Act 1, and their three objects can be found in any order across three rooms. The third object found derives this single flag because both an NPC condition and the router can read only one flag.',
  },
  {
    id: 'renovations_all',
    mode: 'latch',
    when: ['set', 'RENOVATION_FLAGS'],
    note: 'The shop writes one flag per funded renovation while cosmetics.js can gate on only one flag. RENOVATION_FLAGS is derived from the SHOP_ITEMS the game ships, so a newly added renovation automatically joins the meaning of “all.”',
  },
  {
    id: 'rolex_available',
    mode: 'latch',
    when: ['all', 'act5_complete', ['any', 'board_meeting_held', 'has_rolex']],
    note: 'The Rolex is gated on the board meeting, not the other way around, because taking it derives act6_complete and closes the Board Room set-piece. The || has_rolex term is load-bearing: without it, a legacy save already holding the Rolex satisfies both the act5_complete && !rolex_available Archive entry and the has_rolex entry, putting TWO Janitors in the Archive.',
  },
  {
    id: 'board_meeting_closed',
    mode: 'latch',
    when: ['any', 'board_meeting_held', 'act6_complete'],
    deferWhile: ['room', 'board_room'],
    note: 'One-way close signal for every Board Room staging entry. It is deferred while the player stands in board_room because board_meeting_held is set at dialog node 175, but the 18 conditionFn hides cannot run until the first visible frame after the dialog pops; setting the flag immediately made all 18 bodies delete themselves in ONE VISIBLE FRAME. The cast may remain seated until Andrew walks out, and _changeRoom rebuilds from flags on re-entry, so flushing _boardCloseDeferred after the wipe lands the hides off-camera without changing the flag’s contract.',
  },
];

export const GATES = [
  {
    room: 'executive_floor',
    requires: 'branch_chosen',
    message: 'The keycard reader blinks red. AUTHORIZED PERSONNEL ONLY.',
    note: 'The reception elevator tile is walkable, so this gate prevents standing on it from bypassing the elevator dialog’s branch_chosen check.',
  },
  {
    room: 'hr_department',
    requires: 'hr_accessible',
    message: 'The HR Department is locked down. You need authorization.',
    note: 'Ordinary flag gate from the shipping gatedRooms table.',
  },
  {
    room: 'board_room',
    requires: 'board_room_accessible',
    message: 'The Board Room is restricted. Executive access only.',
    note: 'Ordinary flag gate from the shipping gatedRooms table.',
  },
  {
    room: 'penthouse',
    requires: 'act6_complete',
    message: 'The staircase to the Penthouse is sealed. You need the Janitor\'s Rolex.',
    note: 'Ordinary flag gate from the shipping gatedRooms table; the separate charter certification check remains an earlier special conditional.',
  },
  {
    room: 'city_street',
    requires: 'city_unlocked',
    message: 'The garage door is down. You\'ve never had a reason to open it.',
    note: 'Ordinary flag gate from the shipping gatedRooms table.',
  },
  {
    room: 'old_vault',
    requires: 'delia_moved',
    message: 'Jules angles between you and the basement door. Staff only.',
    note: 'Jules says “staff only,” so the door enforces the same restriction.',
  },
  {
    room: 'penthouse_aquarium',
    requires: 'renovation_penthouse',
    message: 'The suite wing is unfinished. Fund the renovation first.',
    note: 'Ordinary renovation flag gate from the shipping gatedRooms table.',
  },
  {
    room: 'penthouse_analytics',
    requires: 'renovation_penthouse',
    message: 'The suite wing is unfinished. Fund the renovation first.',
    note: 'Ordinary renovation flag gate from the shipping gatedRooms table.',
  },
  {
    room: 'penthouse_bar',
    requires: 'renovation_penthouse',
    message: 'The suite wing is unfinished. Fund the renovation first.',
    note: 'Ordinary renovation flag gate from the shipping gatedRooms table.',
  },
  {
    room: 'archive',
    kind: 'knowledge',
    code: '47-19-82',
    note: 'NOT a flag-table row. _openArchiveKeypad intercepts this knowledge gate before the table lookup; an archive_accessible flag row here would therefore be unreachable. The outer Archive door takes the building service override so the route is genuinely knowledge-gated from Act 1 rather than nesting knowledge behind a later story flag.',
  },
  {
    room: 'vault',
    kind: 'knowledge',
    code: '47-19-82',
    note: 'NOT a flag-table row. _openVaultKeypad intercepts this knowledge gate before the table lookup, just like Archive; a vault_accessible flag row here could never fire. Both doors on the route must accept the same building service override or the inner keypad remains a knowledge gate nested inside a flag gate.',
  },
  {
    room: 'executive_floor',
    kind: 'special',
    when: ['all', 'restructuring_defeated', ['not', 'corporate_lawyer_defeated']],
    message: 'The elevator won\'t open. Someone\'s waiting for you in the lobby.',
    note: 'Declaration only in P5; the explicit conditional before the ordinary table lookup remains authoritative. It is intentionally vestigial because the trio post-dialog currently sets restructuring_defeated and corporate_lawyer_defeated in the same frame, but it is kept with the reception lawyer and “Push through to reception” objective in case the Act 5 gauntlet is split back into solo fights.',
  },
  {
    room: 'penthouse',
    kind: 'special',
    when: ['all', 'act6_complete', ['not', 'charter_certified']],
    message: 'The elevator scans the charter. A red light: SEAL NOT RECOGNIZED.',
    note: 'Declaration only in P5; this explicit conditional must remain ahead of the ordinary penthouse flag gate because the first rejection can fire charter_challenge, Skip’s call and the Janitor’s tip about Delia, which sets city_unlocked.',
  },
];

// Declaration-only in P6. ExplorationState remains authoritative until P8.
// `once` records what the code does today; every legacy persisted latch carries
// a named waiver so the simulator can keep the debt visible.
export const TRIGGERS = [
  {
    id: 'legal-ending-first-entry', on: 'room-entered', room: 'executive_floor',
    when: ['all', 'branch_chosen', 'path_legal', ['not', 'regional_defeated'],
      ['not', 'compliance_defeated'], ['not', 'skip_defeated'], ['not', 'retry_regional']],
    once: 'always', scene: 'legal_eagle_ending', delayMs: 1000, grants: [],
    src: 'ExplorationState.js:741',
    note: 'The ending_started flag is written as a record but is not a guard; this re-fires on every qualifying executive-floor entry until the branch boss is defeated.',
  },
  {
    id: 'legal-ending-retry', on: 'room-entered', room: 'executive_floor',
    when: ['all', 'branch_chosen', 'path_legal', 'retry_regional',
      ['not', 'regional_defeated'], ['not', 'compliance_defeated'], ['not', 'skip_defeated']],
    once: 'always', scene: 'regional_retry', delayMs: 1000, grants: [],
    src: 'ExplorationState.js:747', note: 'Retry variant of the repeatable Legal Eagle ending entry.',
  },
  {
    id: 'bro-ending-first-entry', on: 'room-entered', room: 'executive_floor',
    when: ['all', 'branch_chosen', 'path_bro', ['not', 'regional_defeated'],
      ['not', 'compliance_defeated'], ['not', 'skip_defeated'], ['not', 'retry_compliance']],
    once: 'always', scene: 'bro_code_ending', delayMs: 1000, grants: [],
    src: 'ExplorationState.js:750', note: 'Repeatable Bro Code ending entry until the branch boss is defeated.',
  },
  {
    id: 'bro-ending-retry', on: 'room-entered', room: 'executive_floor',
    when: ['all', 'branch_chosen', 'path_bro', 'retry_compliance',
      ['not', 'regional_defeated'], ['not', 'compliance_defeated'], ['not', 'skip_defeated']],
    once: 'always', scene: 'compliance_retry', delayMs: 1000, grants: [],
    src: 'ExplorationState.js:750', note: 'Retry variant of the repeatable Bro Code ending entry.',
  },
  {
    id: 'grandma-ending-first-entry', on: 'room-entered', room: 'executive_floor',
    when: ['all', 'branch_chosen', 'path_grandma', ['not', 'regional_defeated'],
      ['not', 'compliance_defeated'], ['not', 'skip_defeated'], ['not', 'retry_skip_boss']],
    once: 'always', scene: 'secret_ending', delayMs: 1000, grants: ['secret_path_complete'],
    src: 'ExplorationState.js:753', note: 'Repeatable Grandma-path ending entry until Skip is defeated.',
  },
  {
    id: 'grandma-ending-retry', on: 'room-entered', room: 'executive_floor',
    when: ['all', 'branch_chosen', 'path_grandma', 'retry_skip_boss',
      ['not', 'regional_defeated'], ['not', 'compliance_defeated'], ['not', 'skip_defeated']],
    once: 'always', scene: 'skip_boss_retry', delayMs: 1000, grants: [],
    src: 'ExplorationState.js:753', note: 'Retry variant of the repeatable Grandma-path ending entry.',
  },
  {
    id: 'hr-rep-entry', on: 'room-entered', room: 'hr_department',
    when: ['not', 'defeated_hr_rep'], once: 'always', scene: 'hr_rep_combat', delayMs: 800,
    grants: ['defeated_hr_rep'], src: 'ExplorationState.js:766',
    note: 'Re-fires after a loss; the HR Rep also remains an NPC route in the room.',
  },
  {
    id: 'archive-security-entry', on: 'room-entered', room: 'archive',
    when: true, once: 'flag:visited_archive', scene: 'security_guard_combat', delayMs: 800,
    grants: ['security_guard_info'], src: 'ExplorationState.js:776',
    waiver: 'archive-security-npc-fallback',
    note: 'Legacy first-visit latch is spent before the delayed push, but an undefeated Security Guard remains a direct NPC route in the Archive.',
  },
  {
    id: 'data-analytics-duo-entry', on: 'room-entered', room: 'executive_floor',
    when: ['all', 'corporate_lawyer_defeated', ['not', 'act5_complete']],
    once: 'flag:data_lead_fight_started', scene: 'data_analytics_duo_intro', delayMs: 800,
    grants: ['data_lead_defeated', 'cfos_assistant_duo_defeated'],
    src: 'ExplorationState.js:795', waiver: 'unfinished-scene-runtime-reconciler',
    note: 'Persisted pre-push latch; UNFINISHED_SCENE_LATCHES clears it on load and defeat until P8 converts the trigger.',
  },
  {
    id: 'alex-it-recruit-entry', on: 'room-entered', room: 'server_room',
    when: 'restructuring_trio_defeated', once: 'flag:alex_it_recruit_offered',
    scene: 'alex_it_recruit', delayMs: 800, grants: ['alex_it_recruited'],
    src: 'ExplorationState.js:805', waiver: 'alex-it-remains-an-npc',
    note: 'The offer latch is spent before the delayed push; Alex remains directly interactable and the latch grants no critical-path flag.',
  },
  {
    id: 'meredith-board-entry', on: 'room-entered', room: 'board_room',
    when: ['all', 'act4_complete', ['not', 'act5_complete']], once: 'always',
    scene: 'meredith_boss_combat', delayMs: 800, grants: ['act5_complete'],
    src: 'ExplorationState.js:817',
    note: 'meredith_fight_started is written for objectives but deliberately not read as a guard, so a defeat can retry on the next entry.',
  },
  {
    id: 'penthouse-arrival', on: 'room-entered', room: 'penthouse',
    when: 'act6_complete', once: 'flag:penthouse_entered', scene: 'penthouse_arrival',
    delayMs: 800, grants: [], src: 'ExplorationState.js:831',
    waiver: 'arrival-is-flavour-and-combat-has-room-routes',
    note: 'Legacy pre-push latch can lose the arrival card, but it grants no progression and both penthouse combatants have direct NPC routes.',
  },
  {
    id: 'act5-restructuring', on: 'update', room: 'cubicle_farm',
    when: ['all', 'has_charter', 'act3_complete', ['not', 'act4_complete']],
    once: 'scene', scene: 'act5_trigger', delayMs: 800,
    grants: ['act4_complete', 'janet_recruited'], src: 'ExplorationState.js:3483',
    note: 'CURRENT FIXED SHAPE: !act4_complete is the persisted guard and _act5Pushed is session-only/re-armed on room exit. act5_triggered is still written but never read in normal play; this is scene-equivalent and is not a live waiver.',
  },
  {
    id: 'restructuring-trio-update', on: 'update', room: 'cubicle_farm',
    when: ['all', 'act4_complete', ['not', 'act5_complete'], ['not', 'restructuring_trio_defeated']],
    once: 'flag:restructuring_trio_started', scene: 'restructuring_trio_intro', delayMs: 1200,
    grants: ['restructuring_trio_defeated', 'brand_consultant_defeated',
      'restructuring_defeated', 'corporate_lawyer_defeated'],
    src: 'ExplorationState.js:4319', waiver: 'unfinished-scene-runtime-reconciler',
    note: 'Persisted pre-push latch; UNFINISHED_SCENE_LATCHES clears it on load and defeat until P8 converts the trigger.',
  },
  {
    id: 'chief-restructuring-update', on: 'update', room: 'executive_floor',
    when: 'data_lead_defeated', once: 'flag:chief_fight_started',
    scene: 'chief_restructuring_combat', delayMs: 2000,
    grants: ['chief_restructuring_defeated', 'board_room_accessible'],
    src: 'ExplorationState.js:4331', waiver: 'unfinished-scene-runtime-reconciler',
    note: 'Persisted pre-push latch; UNFINISHED_SCENE_LATCHES clears it on load and defeat until P8 converts the trigger.',
  },
  {
    id: 'charter-certification-block', on: 'room-blocked', room: 'penthouse',
    when: ['all', 'act6_complete', ['not', 'charter_certified']], once: 'scene',
    scene: 'charter_challenge', delayMs: 700,
    grants: ['read_charter_challenge', 'city_unlocked'], src: 'ExplorationState.js:1281',
    note: 'The code guards with !read_charter_challenge, so interruption re-serves the scene on the next blocked elevator attempt.',
  },
  {
    id: 'receptionist-first-entry', on: 'room-entered', room: 'reception',
    when: true, once: 'scene', scene: 'receptionist_intro', delayMs: 400,
    grants: ['reception_intro_done'], src: 'ExplorationState.js:1410',
    note: 'The actual guard is reception_intro_done, which the scene grants; semantically the same completion latch as once:scene.',
  },
  {
    id: 'karen-first-loss', on: 'flag-set', flag: 'retry_karen',
    when: ['not', 'defeated_karen'], once: 'flag:retry_karen',
    scene: 'karen_first_loss_tutorial', delayMs: 1200, grants: [],
    src: 'ExplorationState.js:1526', waiver: 'scripted-loss-callback',
    note: 'The push is in the scripted first-loss callback immediately after retry_karen is written; it is not replayed from a persisted flag, but the tutorial grants no progression and Karen remains routed.',
  },
  {
    id: 'firm-ambush-chain', on: 'flag-set', flag: 'has_recorder_seal',
    when: true, once: 'flag:has_recorder_seal', scene: 'the_firm_ambush', delayMs: 500,
    grants: ['charter_certified'], src: 'ExplorationState.js:523',
    waiver: 'legacy-flag-event-chain',
    note: 'The persisted seal flag is also the event latch; a reload does not replay the event. P6 records this live debt for P8.',
  },
  {
    id: 'cfos-assistant-chain', on: 'flag-set', flag: 'penthouse_entered',
    when: true, once: 'flag:penthouse_entered', scene: 'cfos_assistant_combat', delayMs: 500,
    grants: ['cfos_defeated'], src: 'ExplorationState.js:527',
    waiver: 'penthouse-npc-fallback',
    note: 'The flag event queues the fight, while the CFO assistant also remains a direct NPC route in both penthouse layouts.',
  },
  {
    id: 'regional-director-chain', on: 'flag-set', flag: 'cfos_defeated',
    when: true, once: 'flag:cfos_defeated', scene: 'regional_director_combat', delayMs: 500,
    grants: ['regional_director_defeated'], src: 'ExplorationState.js:531',
    waiver: 'penthouse-npc-fallback',
    note: 'The flag event queues the fight, while the Regional Director also remains a direct NPC route in both penthouse layouts.',
  },
  {
    id: 'algorithm-chain', on: 'flag-set', flag: 'regional_director_defeated',
    when: true, once: 'flag:regional_director_defeated', scene: 'algorithm_combat', delayMs: 500,
    grants: ['algorithm_defeated'], src: 'ExplorationState.js:534',
    waiver: 'algorithm-terminal-fallback',
    note: 'The flag event queues the fight; algorithm_terminal independently routes the same combat while the Algorithm is undefeated.',
  },
  ...['cooperative', 'compromise', 'dissolution', 'architect'].map((ending, index) => ({
    id: `ending-${ending}-chain`, on: 'flag-set', flag: `ending_${ending}`,
    when: true, once: `flag:ending_${ending}`, scene: `ending_${ending}`, delayMs: 500,
    grants: [], src: `ExplorationState.js:${465 + index * 6}`,
    waiver: 'legacy-ending-flag-event',
    note: 'The Algorithm post-dialog writes the ending choice before this delayed push; persisted flags are not replayed after interruption. P6 records the live debt for P8.',
  })),
  ...['cooperative', 'compromise', 'dissolution', 'architect'].map(ending => ({
    id: `post-credits-after-${ending}`, on: 'flag-set', flag: `read_ending_${ending}`,
    when: true, once: `flag:read_ending_${ending}`, scene: 'post_credits', delayMs: 2000,
    grants: [], src: 'ExplorationState.js:489', waiver: 'legacy-post-credits-flag-event',
    note: 'Completion of any ending schedules post_credits from a persisted read flag event; a reload does not replay the event.',
  })),
];
