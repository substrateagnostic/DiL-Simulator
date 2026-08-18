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

// Trigger timing and routing remain beside their shipping call sites in
// ExplorationState, but this table owns every once-predicate. `once: 'scene'`
// means the runtime reads `read_<scene>`; DialogState writes that flag only
// after the scene has actually shown a node.
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
    when: true, once: 'scene', scene: 'security_guard_combat', delayMs: 800,
    grants: ['security_guard_info'], src: 'ExplorationState.js:776',
    note: 'visited_archive and archive_found are still written as records; read_security_guard_combat is the once-guard.',
  },
  {
    id: 'data-analytics-duo-entry', on: 'room-entered', room: 'executive_floor',
    when: ['all', 'corporate_lawyer_defeated', ['not', 'act5_complete']],
    once: 'scene', scene: 'data_analytics_duo_intro', delayMs: 800,
    grants: ['data_lead_defeated', 'cfos_assistant_duo_defeated'],
    src: 'ExplorationState.js:795',
    reArmOnDefeat: true,
    note: 'data_lead_fight_started is still written as a record; read_data_analytics_duo_intro is the once-guard. '
      + 'reArmOnDefeat is MANDATORY here: this scene starts a fight, grants a critical-path flag, '
      + 'and data_analytics_duo has NO player-initiable route anywhere in rooms/index.js - no NPC, no '
      + 'interactable. A read flag is monotone and a defeat cannot clear it, so without this a single '
      + 'loss would strand data_lead_defeated and with it the Chief, board_room_accessible, Meredith '
      + 'and Acts 5-7. The pre-P8 latch was cleared on defeat by _reconcileSceneLatches; this restores '
      + 'that and keeps the interruption repair.',
  },
  {
    id: 'alex-it-recruit-entry', on: 'room-entered', room: 'server_room',
    when: 'restructuring_trio_defeated', once: 'scene',
    scene: 'alex_it_recruit', delayMs: 800, grants: ['alex_it_recruited'],
    src: 'ExplorationState.js:805',
    note: 'alex_it_recruit_offered is still written as a record; read_alex_it_recruit is the once-guard.',
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
    when: 'act6_complete', once: 'scene', scene: 'penthouse_arrival',
    delayMs: 800, grants: [], src: 'ExplorationState.js:831',
    note: 'penthouse_entered is still written as a record and chains the CFO encounter; read_penthouse_arrival is the once-guard.',
  },
  {
    id: 'act5-restructuring', on: 'update', room: 'cubicle_farm',
    when: ['all', 'has_charter', 'act3_complete', ['not', 'act4_complete']],
    once: 'scene', scene: 'act5_trigger', delayMs: 800,
    grants: ['act4_complete', 'janet_recruited'], src: 'ExplorationState.js:3483',
    note: 'read_act5_trigger is the persisted once-guard and _act5Pushed is session-only/re-armed on room exit. act5_triggered is still written as a record but never read in normal play.',
  },
  {
    id: 'restructuring-trio-update', on: 'update', room: 'cubicle_farm',
    when: ['all', 'act4_complete', ['not', 'act5_complete'], ['not', 'restructuring_trio_defeated']],
    once: 'scene', scene: 'restructuring_trio_intro', delayMs: 1200,
    grants: ['restructuring_trio_defeated', 'brand_consultant_defeated',
      'restructuring_defeated', 'corporate_lawyer_defeated'],
    src: 'ExplorationState.js:4319',
    reArmOnDefeat: true,
    note: 'restructuring_trio_started is still written as a record; read_restructuring_trio_intro is the '
      + 'once-guard. reArmOnDefeat is MANDATORY: restructuring_trio has no NPC and no interactable '
      + 'anywhere, and this fight is the sole writer of corporate_lawyer_defeated.',
  },
  {
    id: 'chief-restructuring-update', on: 'update', room: 'executive_floor',
    when: 'data_lead_defeated', once: 'scene',
    scene: 'chief_restructuring_combat', delayMs: 2000,
    grants: ['chief_restructuring_defeated', 'board_room_accessible'],
    src: 'ExplorationState.js:4331',
    reArmOnDefeat: true,
    note: 'chief_fight_started is still written as a record; read_chief_restructuring_combat is the '
      + 'once-guard. reArmOnDefeat is MANDATORY: chief_of_restructuring has no NPC and no interactable, '
      + 'and this fight is the sole writer of board_room_accessible.',
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
    id: 'desk-quiz-chain', on: 'flag-set', flag: 'checked_desk',
    when: ['not', 'briefing_complete'], once: 'scene', scene: 'janet_quiz',
    delayMs: 500, grants: [], src: 'ExplorationState.js:542',
    note: 'Janet set the desk PC\'s browser homepage to the working-style quiz; it fires once, '
      + 'right after the first desk check and before the team intros (the PRE_DESK_TEAM guard '
      + 'already forces desk-before-intros, so the quiz precedes every coworker scene on any '
      + 'real save). read_janet_quiz is the once-guard and the replay path covers a quit inside '
      + 'the 500 ms window. The ¬briefing_complete term keeps the day-one-framed scene from '
      + 'replaying onto a pre-quiz legacy save mid-campaign: such a save simply never takes the '
      + 'quiz, and every trait-conditional line falls back to its original by construction.',
  },
  {
    id: 'karen-first-loss', on: 'flag-set', flag: 'retry_karen',
    when: ['not', 'defeated_karen'], once: 'scene',
    scene: 'karen_first_loss_tutorial', delayMs: 1200, grants: [],
    src: 'ExplorationState.js:1526',
    note: 'retry_karen remains the loss record and event source; read_karen_first_loss_tutorial is the once-guard.',
  },
  {
    id: 'firm-ambush-chain', on: 'flag-set', flag: 'has_recorder_seal',
    when: true, once: 'scene', scene: 'the_firm_ambush', delayMs: 500,
    grants: ['charter_certified'], src: 'ExplorationState.js:523',
    reArmOnDefeat: true,
    note: 'has_recorder_seal remains the event source; read_the_firm_ambush is the once-guard and permits '
      + 'interrupted-event replay. reArmOnDefeat here is BELT-AND-BRACES, not the primary recovery, and '
      + 'the distinction matters because the first version of this note claimed the opposite. The Firm '
      + 'DOES have a player-initiable route: the old_vault firm_partner NPC (rooms/index.js:2878) serves '
      + 'the_firm_retry, whose condition (has_recorder_seal && !defeated_the_firm) is live in exactly the '
      + 'post-defeat state, and the shared the_firm_defeated post-dialog writes charter_certified either '
      + 'way. The three Act-5 gauntlet rows are the ones with no route at all. This row re-arms the ambush '
      + 'so a lost fight is re-offered where it happened rather than only at the partner.',
  },
  {
    id: 'cfos-assistant-chain', on: 'flag-set', flag: 'penthouse_entered',
    when: true, once: 'scene', scene: 'cfos_assistant_combat', delayMs: 500,
    grants: ['cfos_defeated'], src: 'ExplorationState.js:527',
    note: 'penthouse_entered remains the event source; read_cfos_assistant_combat is the once-guard.',
  },
  {
    id: 'regional-director-chain', on: 'flag-set', flag: 'cfos_defeated',
    when: true, once: 'scene', scene: 'regional_director_combat', delayMs: 500,
    grants: ['regional_director_defeated'], src: 'ExplorationState.js:531',
    note: 'cfos_defeated remains the event source; read_regional_director_combat is the once-guard.',
  },
  {
    id: 'algorithm-chain', on: 'flag-set', flag: 'regional_director_defeated',
    when: true, once: 'scene', scene: 'algorithm_combat', delayMs: 500,
    grants: ['algorithm_defeated'], src: 'ExplorationState.js:534',
    note: 'regional_director_defeated remains the event source; read_algorithm_combat is the once-guard.',
  },
  ...['cooperative', 'compromise', 'dissolution', 'architect'].map((ending, index) => ({
    id: `ending-${ending}-chain`, on: 'flag-set', flag: `ending_${ending}`,
    when: true, once: 'scene', scene: `ending_${ending}`, delayMs: 500,
    grants: [], src: `ExplorationState.js:${465 + index * 6}`,
    note: `The ending choice remains the event source; the ending scene's read flag is the once-guard.`,
  })),
  ...['cooperative', 'compromise', 'dissolution', 'architect'].map(ending => ({
    id: `post-credits-after-${ending}`, on: 'flag-set', flag: `read_ending_${ending}`,
    when: true, once: 'scene', scene: 'post_credits', delayMs: 2000,
    grants: [], src: 'ExplorationState.js:489',
    note: 'The ending read remains the event source; read_post_credits is the shared once-guard.',
  })),
];
