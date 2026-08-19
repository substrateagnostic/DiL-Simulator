// NPC dialog routing. ORDER IS BEHAVIOUR: the first matching row wins.

const JANITOR_BEAT = ['any',
  ['all', ['npcDialogId', 'janitor_act3'], ['dialogExists', 'janitor_act3']],
  ['all', ['npcDialogId', 'janitor_needs_skip'], ['dialogExists', 'janitor_needs_skip']],
  ['all', ['npcDialogId', 'janitor_act4'], ['dialogExists', 'janitor_act4']],
  ['all', ['npcDialogId', 'janitor_act6'], ['dialogExists', 'janitor_act6']],
];

const JANITOR_RIDDLE = ['all', ['act', '>=', 3], 'met_janitor', 'read_janitor_act3',
  ['any',
    ['all', ['not', 'janitor_riddle_1_done'], ['dialogExists', 'janitor_riddle_1']],
    ['all', ['not', 'janitor_riddle_2_done'], ['dialogExists', 'janitor_riddle_2']],
    ['all', ['not', 'janitor_riddle_3_done'], ['dialogExists', 'janitor_riddle_3']],
  ],
];

const ALEX_ACT2_BEAT = ['all', 'karen_defeated', ['not', 'knows_server_secret'],
  ['not', 'act2_complete'], ['dialogExists', 'alex_it_act2']];
const ALEX_ACT3_BEAT = ['all', 'act2_complete', ['not', 'act3_complete'],
  ['not', 'alex_it_act3_done'], ['dialogExists', 'alex_it_act3']];
const ALEX_STORY_BEAT = ['any', ALEX_ACT2_BEAT, ALEX_ACT3_BEAT];

const ALEX_SIDE_ANOMALY = ['any',
  ['all', 'anomaly_started', ['not', 'quest_anomaly_347_complete']],
  ['not', 'anomaly_started'],
];
const ALEX_SIDE_LEGACY = ['any',
  ['all', 'legacy_started', ['not', 'quest_legacy_admin_complete']],
  ['all', 'quest_anomaly_347_complete', ['not', 'legacy_started']],
];
const ALEX_SIDE_NETWORK = ['any',
  ['all', 'network_started', ['not', 'quest_network_ghost_complete']],
  ['all', 'quest_legacy_admin_complete', ['not', 'network_started']],
];
const ALEX_SIDE_DAVE = ['any',
  ['all', 'dave_started', ['not', 'quest_daves_legacy_complete']],
  ['all', 'quest_network_ghost_complete', ['not', 'dave_started']],
];
const ALEX_SIDE_PRINTER = ['any',
  ['all', 'printer_soul_started', ['not', 'quest_printer_soul_complete']],
  ['all', 'quest_daves_legacy_complete', ['not', 'printer_soul_started']],
];
const ALEX_SIDE_FINAL = ['any',
  ['all', 'final_patch_started', ['not', 'quest_final_patch_complete']],
  ['all', 'quest_printer_soul_complete', ['not', 'final_patch_started']],
];
const ALEX_SIDE_AVAILABLE = ['all', 'act2_complete', ['any',
  ALEX_SIDE_ANOMALY, ALEX_SIDE_LEGACY, ALEX_SIDE_NETWORK,
  ALEX_SIDE_DAVE, ALEX_SIDE_PRINTER, ALEX_SIDE_FINAL,
]];

const CLEAR_STORY_DEFERRED = {
  flag: 'alex_story_deferred', value: false,
  when: ['all', ['npc', 'alex_it'], 'met_alex_it', 'alex_story_deferred'],
};
const CLEAR_SIDE_DEFERRED = {
  flag: 'alex_side_deferred', value: false,
  when: ['all', ['npc', 'alex_it'], 'met_alex_it', 'alex_side_deferred', ALEX_SIDE_AVAILABLE],
};
const CLEAR_ALEX_DEFERRALS = [CLEAR_STORY_DEFERRED, CLEAR_SIDE_DEFERRED];

export const DIALOG_ROUTES = [
  {
    id: 'karen-retry-not-ready', npc: 'karen',
    when: ['all', ['dialogExists', 'karen_retry'], 'retry_karen', ['not', 'defeated_karen'], ['not', 'karen_retry_ready']],
    then: 'karen_not_ready',
    why: 'Karen retry is blocked until three tutorial clients have been handled.',
    src: 'ExplorationState.js:2787-2793',
  },
  {
    id: 'karen-combat-retry', npc: 'karen',
    when: ['all', ['dialogExists', 'karen_retry'], 'retry_karen', ['not', 'defeated_karen']],
    then: 'karen_retry',
    why: 'A live Karen retry overrides every lower-priority dialog on her NPC.',
    src: 'ExplorationState.js:2787-2795',
  },
  {
    id: 'skip-combat-retry', npc: 'skip',
    when: ['all', ['dialogExists', 'skip_boss_retry'], 'retry_skip_boss', ['not', 'defeated_skip_boss']],
    then: 'skip_boss_retry',
    why: 'Skip uses the skip_boss encounter id, and its live retry overrides his NPC dialog.',
    src: 'ExplorationState.js:2787-2795',
  },
  {
    id: 'chad-combat-retry', npc: 'chad',
    when: ['all', ['dialogExists', 'chad_retry'], 'retry_chad', ['not', 'defeated_chad']],
    then: 'chad_retry',
    why: 'A live Chad retry overrides every lower-priority dialog on his NPC.',
    src: 'ExplorationState.js:2787-2795',
  },
  {
    id: 'compliance-combat-retry', npc: 'compliance',
    when: ['all', ['dialogExists', 'compliance_retry'], 'retry_compliance', ['not', 'defeated_compliance']],
    then: 'compliance_retry',
    why: 'A live Compliance retry overrides every lower-priority dialog on the NPC.',
    src: 'ExplorationState.js:2787-2795',
  },
  {
    id: 'grandma-combat-retry', npc: 'grandma',
    when: ['all', ['dialogExists', 'grandma_retry'], 'retry_grandma', ['not', 'defeated_grandma']],
    then: 'grandma_retry',
    why: 'A live Grandma retry overrides every lower-priority dialog on her NPC.',
    src: 'ExplorationState.js:2787-2795',
  },
  {
    id: 'intern-combat-retry', npc: 'intern',
    when: ['all', ['dialogExists', 'intern_retry'], 'retry_intern', ['not', 'defeated_intern']],
    then: 'intern_retry',
    why: 'A live Intern retry overrides every lower-priority dialog on the NPC.',
    src: 'ExplorationState.js:2787-2795',
  },
  {
    id: 'regional-combat-retry', npc: 'regional',
    when: ['all', ['dialogExists', 'regional_retry'], 'retry_regional', ['not', 'defeated_regional']],
    then: 'regional_retry',
    why: 'A live Regional Manager retry overrides every lower-priority dialog on the NPC.',
    src: 'ExplorationState.js:2787-2795',
  },
  {
    id: 'firm-combat-retry', npc: 'the_firm',
    when: ['all', ['dialogExists', 'the_firm_retry'], 'retry_the_firm', ['not', 'defeated_the_firm']],
    then: 'the_firm_retry',
    why: 'The generic retry rule also preserves the existing Firm retry behavior for callers outside room NPC data.',
    src: 'ExplorationState.js:2787-2795',
  },
  {
    id: 'karen-intern-first', npc: 'karen',
    when: ['all', 'briefing_complete', ['not', 'defeated_intern']],
    then: 'karen_intern_first',
    why: 'After the briefing, Karen is blocked until the required Intern combat tutorial is complete.',
    src: 'ExplorationState.js:2797-2803',
  },
  {
    id: 'janitor-story-or-riddle-router', npc: 'janitor', room: 'archive',
    when: ['all', JANITOR_BEAT, JANITOR_RIDDLE, ['dialogExists', 'janitor_router'], ['pred', 'stashJanitorRoutes']],
    then: 'janitor_router',
    why: 'When an Archive story beat and a riddle are both live, the player chooses and both destinations are stashed for the flag listener. Room-scoped to the Archive with the riddle rows (Andrew\'s bb534b4 diagnosis): the beat dialogIds only exist on Archive entries, but the riddle half of this pairing must never pair a beat with a riddle anywhere else.',
    src: 'ExplorationState.js:2805-2837',
  },
  {
    id: 'janitor-story-beat', npc: 'janitor',
    when: JANITOR_BEAT,
    then: ['npcDialogId'],
    why: 'A hardcoded Archive Janitor story beat outranks the riddle chain when the router cannot be served. No room term needed: the four beat dialogIds exist only on Archive room entries, so this row is Archive-bound through npcDialogId by construction.',
    src: 'ExplorationState.js:2816-2838',
  },
  // THE GARAGE LEAK (Andrew, bb534b4, re-diagnosed against the table): the
  // parking-garage Janitor patrol has NO dialogId, and these riddle rows carried
  // no room term — so from act 3 until all three riddles were answered, every
  // E-press on the garage patrol served an Archive riddle in the garage, and a
  // wrong answer re-served it forever (wrong answers set no done-flag). The
  // riddles are the Archive Janitor's chain (gated on his Archive act-3 scene);
  // they are now room-scoped there. The producer declined Andrew's cast change
  // (a separate parking attendant) — the Mysterious Janitor's garage patrol is
  // deliberate story texture (a predecessor object is on a garage pillar) — so
  // the garage instead gets its own ambient row further down.
  {
    id: 'janitor-riddle-one', npc: 'janitor', room: 'archive',
    when: ['all', ['act', '>=', 3], 'met_janitor', 'read_janitor_act3', ['not', 'janitor_riddle_1_done'], ['dialogExists', 'janitor_riddle_1']],
    then: 'janitor_riddle_1',
    why: 'The first unfinished existing Janitor riddle is served after his Act 3 unlock — in the Archive only, so the garage patrol stops dispensing riddles.',
    src: 'ExplorationState.js:2823-2839',
  },
  {
    id: 'janitor-riddle-two', npc: 'janitor', room: 'archive',
    when: ['all', ['act', '>=', 3], 'met_janitor', 'read_janitor_act3', ['not', 'janitor_riddle_2_done'], ['dialogExists', 'janitor_riddle_2']],
    then: 'janitor_riddle_2',
    why: 'The second unfinished existing Janitor riddle follows the first by table priority, Archive-scoped like the first.',
    src: 'ExplorationState.js:2823-2839',
  },
  {
    id: 'janitor-riddle-three', npc: 'janitor', room: 'archive',
    when: ['all', ['act', '>=', 3], 'met_janitor', 'read_janitor_act3', ['not', 'janitor_riddle_3_done'], ['dialogExists', 'janitor_riddle_3']],
    then: 'janitor_riddle_3',
    why: 'The third unfinished existing Janitor riddle follows the first two by table priority, Archive-scoped like both.',
    src: 'ExplorationState.js:2823-2839',
  },
  {
    id: 'janitor-intro-bypass', npc: 'janitor',
    when: ['all', 'met_janitor', ['npcDialogId', 'janitor_intro'], ['dialogExists', 'janitor_return']],
    then: 'janitor_return',
    why: 'A room entry still pinned to the Janitor intro becomes small talk after the first meeting.',
    src: 'ExplorationState.js:2841-2844',
  },
  {
    id: 'janet-act4-rally', npc: 'janet',
    when: ['all', ['act', '>=', 4], ['act', '<', 6], ['not', 'janet_rallied'], ['dialogExists', 'janet_act4']],
    then: 'janet_act4',
    why: 'Janet\'s Act 4 rally outranks lunch-thief dialog ids but is ceilinged before Act 6.',
    src: 'ExplorationState.js:2846-2852',
  },
  {
    id: 'skip-act4-rally', npc: 'skip',
    when: ['all', ['act', '==', 4], ['not', 'skip_rallied'], ['dialogExists', 'skip_act4']],
    then: 'skip_act4',
    why: 'Skip\'s fallible rally remains available throughout exactly Act 4 until he is rallied.',
    src: 'ExplorationState.js:2854-2860',
  },
  {
    id: 'rachel-first-meeting', npc: 'rachel',
    when: ['all', ['not', 'met_rachel'], ['dialogExists', 'rachel_intro']],
    then: 'rachel_intro',
    why: 'Rachel\'s first conversation is her introduction regardless of the act in which she is found.',
    src: 'ExplorationState.js:2862-2869',
  },
  {
    id: 'skip-board-meeting-spent', npc: 'skip', room: 'board_room',
    when: ['all', 'board_meeting_held', ['dialogExists', 'board_meeting_after']],
    then: 'board_meeting_after',
    why: 'A spent board-room set-piece is replaced with a reward-free follow-up while Skip remains in the room.',
    src: 'ExplorationState.js:2871-2885',
  },
  {
    id: 'npc-hardcoded-dialogid',
    when: ['all', ['pred', 'npcHasDialogId'],
      ['not', ['all', ['npc', 'alex_it'], ['npcDialogId', 'alex_server_secret'], ['pred', 'alexMainPathPending']]]],
    then: ['npcDialogId'],
    why: 'A valid hardcoded NPC dialog outranks general routing except when Alex\'s server flavour would shadow a critical-path beat.',
    src: 'ExplorationState.js:2887-2906',
  },
  {
    id: 'meredith-first-meeting', npc: 'meredith',
    when: ['all', ['not', 'act4_complete'], ['not', 'act5_complete'], ['not', 'meredith_left'], ['not', 'met_meredith'], ['dialogExists', 'meredith_intro']],
    then: 'meredith_intro',
    why: 'Meredith\'s first-meeting intro is ceilinged by both later-act flags and by her departure state.',
    src: 'ExplorationState.js:2908-2924',
  },
  {
    id: 'alex-printer-quest', npc: 'alex_it',
    when: ['all', 'printer_quest_started', ['not', 'printer_quest_done'], ['not', ['pred', 'alexMainPathPending']]],
    then: 'alex_printer_quest',
    why: 'The printer explanation is served while active only when Alex owes no critical-path conversation.',
    src: 'ExplorationState.js:2926-2939',
  },
  {
    id: 'alex-act4-trigger', npc: 'alex_it',
    when: ['all', 'has_archive_evidence', ['not', 'act3_complete'], ['dialogExists', 'act4_trigger'], ['not', ['pred', 'sideQuestInProgress']]],
    then: 'act4_trigger',
    why: 'Archive evidence triggers Act 4 unless one of Alex\'s six side quests is currently in progress.',
    src: 'ExplorationState.js:2941-2958',
  },
  {
    id: 'alex-phantom-approver-complete', npc: 'alex_it',
    when: ['all', 'legacy_started', 'phantom_hr_found', 'phantom_workstation_found', ['not', 'quest_legacy_admin_complete'], ['dialogExists', 'alex_it_quest_legacy']],
    then: 'alex_it_quest_legacy',
    why: 'Finding both Phantom Approver locations bypasses the router and opens the completion scene directly.',
    src: 'ExplorationState.js:2960-2970',
  },
  {
    id: 'alex-story-chosen-act2', npc: 'alex_it',
    when: ['all', 'met_alex_it', ALEX_ACT2_BEAT, 'alex_story_chosen'],
    then: 'alex_it_act2',
    effect: { flag: 'alex_story_chosen', value: false },
    why: 'Choosing the story branch consumes its one-shot flag and serves the Act 2 beat before the Act 3 alternative.',
    src: 'ExplorationState.js:2972-2980',
  },
  {
    id: 'alex-story-chosen-act3', npc: 'alex_it',
    when: ['all', 'met_alex_it', ALEX_ACT3_BEAT, 'alex_story_chosen'],
    then: 'alex_it_act3',
    effect: { flag: 'alex_story_chosen', value: false },
    why: 'Choosing the story branch consumes its one-shot flag and serves the available Act 3 beat.',
    src: 'ExplorationState.js:2972-2980',
  },
  {
    id: 'alex-story-router', npc: 'alex_it',
    when: ['all', 'met_alex_it', ALEX_STORY_BEAT, ['not', 'alex_story_deferred'], ['dialogExists', 'alex_it_router']],
    then: 'alex_it_router',
    why: 'An available, non-deferred Alex story beat opens the story-versus-side-quest router when that dialog exists.',
    src: 'ExplorationState.js:2981-2985',
  },
  {
    id: 'alex-story-direct-act2', npc: 'alex_it',
    when: ['all', 'met_alex_it', ALEX_ACT2_BEAT, ['not', 'alex_story_deferred']],
    then: 'alex_it_act2',
    why: 'If the Alex story router is missing, the available Act 2 story scene is served directly.',
    src: 'ExplorationState.js:2981-2985',
    shadowed: 'Dead while DIALOGS.alex_it_router exists, and it does. This is a faithful '
      + 'transcription of the `if (DIALOGS.alex_it_router) return ...; return hasAct2 ? ...` '
      + 'fallback: the router row above always wins on the shipped corpus, so this branch is '
      + 'already unreachable in _getDialogId. Kept so the table still mirrors the function, and '
      + 'so the row is here the day someone deletes alex_it_router.',
  },
  {
    id: 'alex-story-direct-act3', npc: 'alex_it',
    when: ['all', 'met_alex_it', ALEX_ACT3_BEAT, ['not', 'alex_story_deferred']],
    then: 'alex_it_act3',
    why: 'If the Alex story router is missing, the available Act 3 story scene is served directly.',
    src: 'ExplorationState.js:2981-2985',
    shadowed: 'Same as alex-story-direct-act2: dead while DIALOGS.alex_it_router exists. A '
      + 'faithful transcription of an already-unreachable branch, kept for the day the router '
      + 'tree is removed.',
  },
  {
    id: 'alex-side-router', npc: 'alex_it',
    when: ['all', 'met_alex_it', ALEX_SIDE_AVAILABLE, ['not', 'alex_side_deferred'], ['dialogExists', 'alex_it_side_router']],
    then: 'alex_it_side_router', effect: CLEAR_STORY_DEFERRED,
    why: 'An available, non-deferred Alex side quest opens the side-quest router when that dialog exists.',
    src: 'ExplorationState.js:2986-3004',
  },
  {
    id: 'alex-side-anomaly-direct', npc: 'alex_it',
    when: ['all', 'met_alex_it', ['not', 'alex_side_deferred'], ['pred', 'alexSideAnomaly']],
    then: 'alex_it_quest_anomaly', effect: CLEAR_STORY_DEFERRED,
    why: 'Without the side router, Alex serves the active or next Anomaly 347 quest directly.',
    src: 'ExplorationState.js:2992-3003',
  },
  {
    id: 'alex-side-legacy-direct', npc: 'alex_it',
    when: ['all', 'met_alex_it', ['not', 'alex_side_deferred'], ['pred', 'alexSideLegacy']],
    then: 'alex_it_quest_legacy', effect: CLEAR_STORY_DEFERRED,
    why: 'Without the side router, Alex serves the active or next Phantom Approver quest directly.',
    src: 'ExplorationState.js:2992-3003',
  },
  {
    id: 'alex-side-network-direct', npc: 'alex_it',
    when: ['all', 'met_alex_it', ['not', 'alex_side_deferred'], ['pred', 'alexSideNetwork']],
    then: 'alex_it_quest_network', effect: CLEAR_STORY_DEFERRED,
    why: 'Without the side router, Alex serves the active or next Network Ghost quest directly.',
    src: 'ExplorationState.js:2992-3003',
  },
  {
    id: 'alex-side-dave-direct', npc: 'alex_it',
    when: ['all', 'met_alex_it', ['not', 'alex_side_deferred'], ['pred', 'alexSideDave']],
    then: 'alex_it_quest_dave', effect: CLEAR_STORY_DEFERRED,
    why: 'Without the side router, Alex serves the active or next Dave\'s Legacy quest directly.',
    src: 'ExplorationState.js:2992-3003',
  },
  {
    id: 'alex-side-printer-direct', npc: 'alex_it',
    when: ['all', 'met_alex_it', ['not', 'alex_side_deferred'], ['pred', 'alexSidePrinter']],
    then: 'alex_it_quest_printer', effect: CLEAR_STORY_DEFERRED,
    why: 'Without the side router, Alex serves the active or next Printer Soul quest directly.',
    src: 'ExplorationState.js:2992-3003',
  },
  {
    id: 'alex-side-final-direct', npc: 'alex_it',
    when: ['all', 'met_alex_it', ['not', 'alex_side_deferred'], ['pred', 'alexSideFinal']],
    then: 'alex_it_quest_final', effect: CLEAR_STORY_DEFERRED,
    why: 'Without the side router, Alex serves the active or next Final Patch quest directly.',
    src: 'ExplorationState.js:2992-3003',
  },
  {
    id: 'alex-pre-karen-return', npc: 'alex_it',
    when: ['all', 'met_alex_it', ['not', 'karen_defeated'], ['not', 'read_alex_it_act2'], ['dialogExists', 'alex_it_return']],
    then: 'alex_it_return', effect: CLEAR_ALEX_DEFERRALS,
    why: 'After Alex\'s intro, generic Act 2 routing is held until Karen is defeated.',
    src: 'ExplorationState.js:3007-3011',
  },
  {
    id: 'intern-combat-retry-after-intro', npc: 'intern',
    when: ['all', ['act', '>=', 1], 'read_intern_intro', ['not', 'defeated_intern'], 'retry_intern', ['dialogExists', 'intern_retry']],
    then: 'intern_retry',
    why: 'The Intern combat block retains its nested retry branch even though the generic retry rule normally wins first.',
    src: 'ExplorationState.js:3013-3021',
    shadowed: 'Dead, and dead in the shipped function too. The combat-retry rule at the top of '
      + 'the table fires on retry_intern && !defeated_intern && DIALOGS.intern_retry and returns '
      + 'the SAME scene, and every term of this row is a superset of that. No behaviour rides on '
      + 'it either way; it is transcribed because the nested branch is really there at :3013-3021, '
      + 'and check G finding it is the check doing its job on real code.',
  },
  {
    id: 'intern-combat-intro', npc: 'intern',
    when: ['all', ['act', '>=', 1], 'read_intern_intro', ['not', 'defeated_intern'], ['dialogExists', 'intern_combat_intro']],
    then: 'intern_combat_intro',
    why: 'After the Intern introduction, the required spar intro is served until the Intern is defeated.',
    src: 'ExplorationState.js:3013-3022',
  },
  {
    id: 'compliance-crossword', npc: 'compliance',
    when: ['all', ['act', '>=', 3], 'alex_it_act3_done', ['not', 'compliance_crossword_done'], ['dialogExists', 'compliance_crossword']],
    then: 'compliance_crossword',
    why: 'The Compliance crossword opens after Alex points the player toward the Archive and remains until completed.',
    src: 'ExplorationState.js:3024-3027',
  },
  {
    id: 'skip-post-karen', npc: 'skip',
    when: ['all', 'karen_defeated', ['not', 'skip_post_karen']],
    then: 'skip_post_karen',
    why: 'Skip\'s post-Karen debrief is required before the Chad fight path proceeds.',
    src: 'ExplorationState.js:3029-3032',
  },
  {
    id: 'skip-post-chad', npc: 'skip',
    when: ['all', 'chad_defeated', ['not', 'skip_post_chad']],
    then: 'skip_post_chad',
    why: 'Skip\'s post-Chad debrief is required before the Grandma fight path proceeds.',
    src: 'ExplorationState.js:3034-3037',
  },
  {
    id: 'social-engineering-isaiah', npc: 'isaiah',
    when: ['all', ['act', '>=', 4], ['act', '<', 6], ['not', 'social_eng_complete'], ['not', 'social_eng_started'], ['dialogExists', 'social_engineering_1']],
    then: 'social_engineering_1',
    why: 'Isaiah starts the Act 4-5 social-engineering chain while it is untouched.',
    src: 'ExplorationState.js:3039-3044',
  },
  {
    id: 'social-engineering-diane', npc: 'diane',
    when: ['all', ['act', '>=', 4], ['act', '<', 6], ['not', 'social_eng_complete'], 'social_eng_started', ['not', 'social_eng_diane'], ['dialogExists', 'social_engineering_2']],
    then: 'social_engineering_2',
    why: 'Diane serves the second Act 4-5 social-engineering scene after Isaiah starts the chain.',
    src: 'ExplorationState.js:3039-3044',
  },
  {
    id: 'social-engineering-intern', npc: 'intern',
    when: ['all', ['act', '>=', 4], ['act', '<', 6], ['not', 'social_eng_complete'], 'social_eng_diane', ['dialogExists', 'social_engineering_3']],
    then: 'social_engineering_3',
    why: 'The Intern serves the final Act 4-5 social-engineering scene after Diane\'s step.',
    src: 'ExplorationState.js:3039-3044',
  },
  {
    id: 'isaiah-recruit', npc: 'isaiah',
    when: ['all', 'restructuring_trio_defeated', ['not', 'isaiah_recruited'], ['not', 'isaiah_documents_shared'], ['dialogExists', 'isaiah_recruit']],
    then: 'isaiah_recruit',
    why: 'Isaiah becomes recruitable after the restructuring trio unless his documents path has already displaced it.',
    src: 'ExplorationState.js:3046-3053',
  },
  {
    id: 'diane-recruit', npc: 'diane',
    when: ['all', 'diane_act6_rallied', ['not', 'diane_recruited'], ['dialogExists', 'diane_recruit']],
    then: 'diane_recruit',
    why: 'Diane becomes recruitable after her Act 6 rally until she joins the team.',
    src: 'ExplorationState.js:3054-3059',
  },
  {
    id: 'alex-badge-audit-return', npc: 'alex_it',
    when: ['all', 'alex_it_recruited', ['dialogExists', 'alex_badge_audit_offer'], ['pred', 'alexBadgeMissionWindow'], 'alex_has_patch_log', ['not', 'alex_badge_audit_complete']],
    then: 'alex_badge_audit_return', effect: CLEAR_ALEX_DEFERRALS,
    why: 'Alex\'s badge-audit return outranks its offer while he has the patch log and the mission is incomplete.',
    src: 'ExplorationState.js:3061-3077',
  },
  {
    id: 'alex-badge-audit-offer', npc: 'alex_it',
    when: ['all', 'alex_it_recruited', ['dialogExists', 'alex_badge_audit_offer'], ['pred', 'alexBadgeMissionWindow'], ['not', 'alex_badge_audit_complete']],
    then: 'alex_badge_audit_offer', effect: CLEAR_ALEX_DEFERRALS,
    why: 'Alex\'s badge-audit mission remains claimable after recruitment with no act cutoff.',
    src: 'ExplorationState.js:3061-3077',
  },
  {
    id: 'isaiah-receipts-return', npc: 'isaiah',
    when: ['all', 'isaiah_recruited', ['dialogExists', 'isaiah_receipts_offer'], ['not', 'isaiah_receipts_complete'], 'isaiah_has_receipts'],
    then: 'isaiah_receipts_return',
    why: 'Isaiah receives the recovered receipts before repeating the mission offer.',
    src: 'ExplorationState.js:3079-3088',
  },
  {
    id: 'isaiah-receipts-offer', npc: 'isaiah',
    when: ['all', 'isaiah_recruited', ['dialogExists', 'isaiah_receipts_offer'], ['not', 'isaiah_receipts_complete']],
    then: 'isaiah_receipts_offer',
    why: 'Isaiah\'s receipts mission remains claimable after recruitment with no act cutoff.',
    src: 'ExplorationState.js:3079-3088',
  },
  {
    id: 'diane-handbook-return', npc: 'diane',
    when: ['all', 'diane_recruited', ['dialogExists', 'diane_handbook_offer'], ['not', 'diane_handbook_complete'], 'diane_has_handbook'],
    then: 'diane_handbook_return',
    why: 'Diane receives the recovered handbook before repeating the mission offer.',
    src: 'ExplorationState.js:3090-3099',
  },
  {
    id: 'diane-handbook-offer', npc: 'diane',
    when: ['all', 'diane_recruited', ['dialogExists', 'diane_handbook_offer'], ['not', 'diane_handbook_complete']],
    then: 'diane_handbook_offer',
    why: 'Diane\'s handbook mission remains claimable after recruitment with no act cutoff.',
    src: 'ExplorationState.js:3090-3099',
  },
  {
    id: 'janet-vacancy-return', npc: 'janet',
    when: ['all', 'janet_recruited', ['dialogExists', 'janet_vacancy_offer'], ['not', 'janet_vacancy_complete'], 'janet_has_timesheet'],
    then: 'janet_vacancy_return',
    why: 'Janet receives the recovered timesheet before repeating the mission offer.',
    src: 'ExplorationState.js:3101-3110',
  },
  {
    id: 'janet-vacancy-offer', npc: 'janet',
    when: ['all', 'janet_recruited', ['dialogExists', 'janet_vacancy_offer'], ['not', 'janet_vacancy_complete']],
    then: 'janet_vacancy_offer',
    why: 'Janet\'s vacancy mission remains claimable after recruitment with no act cutoff.',
    src: 'ExplorationState.js:3101-3110',
  },
  {
    id: 'janitor-names-return', npc: 'janitor',
    when: ['all', 'has_rolex', ['dialogExists', 'janitor_names_offer'], ['not', 'janitor_names_complete'], 'janitor_has_ledger'],
    then: 'janitor_names_return',
    why: 'The Janitor receives the recovered ledger before repeating the Names mission offer. DELIBERATELY no room term (garage-leak sweep ruling): the personal ledger mission follows the man, so mid-mission a garage E-press serves the mission rows — which sit ABOVE the garage sweep line by design — and the offer text itself carries the Vault location.',
    src: 'ExplorationState.js:3112-3121',
  },
  {
    id: 'janitor-names-offer', npc: 'janitor',
    when: ['all', 'has_rolex', ['dialogExists', 'janitor_names_offer'], ['not', 'janitor_names_complete']],
    then: 'janitor_names_offer',
    why: 'The Janitor\'s Names mission opens after the Rolex changes hands. DELIBERATELY no room term, same ruling as janitor-names-return: the mission follows the man, and the garage patrol serving the offer outranks the sweep line on purpose.',
    src: 'ExplorationState.js:3112-3121',
  },
  {
    id: 'janitor-dave', npc: 'janitor',
    when: ['all', 'met_janitor', 'printer_quest_done', ['not', 'dave_janitor_done'], ['dialogExists', 'janitor_dave']],
    then: 'janitor_dave',
    why: 'The Janitor explains Dave after the printer note is found, once. DELIBERATELY no room term (garage-leak sweep ruling): a once-scene about a person, behind its own done-flag, serveable wherever he is found — including the garage patrol.',
    src: 'ExplorationState.js:3123-3132',
  },
  {
    id: 'janitor-predecessors', npc: 'janitor',
    when: ['all', 'met_janitor', 'predecessors_all_found', ['not', 'read_janitor_predecessors'], ['dialogExists', 'janitor_predecessors']],
    then: 'janitor_predecessors',
    why: 'The Janitor names the three predecessors once all their objects have been found. DELIBERATELY no room term (garage-leak sweep ruling): one of the three objects is the garage pillar, so the payoff firing on the garage patrol — the player turns from the pillar and he is right there — is the best version of the scene, and it is a once-scene behind its own read flag.',
    src: 'ExplorationState.js:3134-3147',
  },
  {
    id: 'janitor-pattern', npc: 'janitor',
    when: ['all', 'janitor_names_complete', ['not', 'read_janitor_pattern'], ['dialogExists', 'janitor_pattern']],
    then: 'janitor_pattern',
    why: 'After the Names mission, the Janitor identifies the building-wide pattern once. DELIBERATELY no room term (garage-leak sweep ruling): this is a payoff about the man and the building, not the Archive room — the ledger mission rows above it are equally room-free, so the personal chain stays serveable wherever he is found, and the read flag makes it a once-scene.',
    src: 'ExplorationState.js:3149-3158',
  },
  {
    id: 'janitor-the-name', npc: 'janitor',
    when: ['all', 'janitor_names_complete', 'read_janitor_pattern', ['not', 'read_janitor_the_name'], ['dialogExists', 'janitor_the_name']],
    then: 'janitor_the_name',
    why: 'The Janitor reveals his name only after the broader pattern scene, and only once. DELIBERATELY no room term, same ruling as janitor-pattern: the name is about him, not about a room.',
    src: 'ExplorationState.js:3160-3172',
  },
  {
    id: 'janitor-terminal-intro', npc: 'janitor',
    when: ['all', ['not', 'met_janitor'], ['dialogExists', 'janitor_intro']],
    then: 'janitor_intro',
    why: 'The timeless Janitor introduction is the first half of his terminal fallback.',
    src: 'ExplorationState.js:3174-3183',
  },
  {
    id: 'janitor-garage-sweep', npc: 'janitor', room: 'parking_garage',
    when: ['all', 'met_janitor', ['dialogExists', 'janitor_garage']],
    then: 'janitor_garage',
    why: 'The garage patrol\'s own ambient line. With the riddle rows Archive-scoped, the garage E-press fell through to the Archive small-talk tree (Page 47, the Rolex catching the light); the patrol now sweeps and says something short and slightly wrong instead. First meeting still serves janitor_intro above — B7 established that the intro is deliberately reachable in the garage. Sits below every once-payoff row so the predecessors/pattern/name chain still lands here.',
    src: 'ExplorationState.js:3320-3323',
  },
  {
    id: 'janitor-terminal-return', npc: 'janitor',
    when: ['dialogExists', 'janitor_return'],
    then: 'janitor_return',
    why: 'With the shipped return tree present, the Janitor falls back to small talk before the generic act ladder.',
    src: 'ExplorationState.js:3174-3183',
  },
  {
    id: 'act-ladder',
    when: ['all'],
    then: ['ladder'], effect: CLEAR_ALEX_DEFERRALS,
    why: 'The generic suffix resolver is the final fallback, including the source-authoritative edge case where both Janitor terminal trees are missing.',
    src: 'ExplorationState.js:3185-3231',
  },
];
