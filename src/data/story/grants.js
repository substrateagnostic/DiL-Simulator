import { COSMETIC_MILESTONES } from '../../arcade/constants.js';
import { ENCOUNTERS } from '../encounters/index.js';
import { REVIEW_ITEMS, STRETCH_GOALS } from '../review.js';
import { SHOP_ITEMS } from '../shop.js';
import { ROOM_THOUGHTS, ROOM_THOUGHTS_BY_ACT } from '../thoughts.js';

const row = (flag, when, src, note) => ({ flag, when, src, note });

// Flags written by JavaScript rather than by compiled dialog actions. This is
// an existential story model: resource-backed writes (shop AUM, arcade score,
// portfolio health, review currency) declare when the feature is available,
// not an ordering proof for the resource. DESIGN 7.3 explicitly leaves that
// resource ordering outside the monotone simulator.
export const CODE_GRANTS = [
  row('launch_arcade', true, 'main.js:207', 'Developer arcade launch hook; ordinary play can also write this from dialog data.'),

  row('taught_lock_composure', true, 'CombatState.js:1019', 'Combat tutorial latch.'),
  row('voice_litigator_high', true, 'CombatState.js:1330', 'Existential combat-voice usage threshold.'),
  row('voice_litigator_max', true, 'CombatState.js:1331', 'Existential combat-voice usage threshold.'),
  row('voice_witness_high', true, 'CombatState.js:1332', 'Existential combat-voice usage threshold.'),
  row('voice_witness_max', true, 'CombatState.js:1333', 'Existential combat-voice usage threshold.'),
  row('voice_skeptic_high', true, 'CombatState.js:1334', 'Existential combat-voice usage threshold.'),
  row('voice_apprentice_high', true, 'CombatState.js:1335', 'Existential combat-voice usage threshold.'),
  row('andrew_invoked_charter', 'has_charter', 'CombatState.js:1338', 'Written when Andrew invokes the Charter during combat.'),
  row('seen_karen_finisher', 'retry_karen', 'CombatState.js:2200', 'Karen finisher presentation latch.'),
  row('read_karen_first_loss_tutorial', 'retry_karen', 'DialogState.js:576',
    'Existential ordering declaration, not a new writer: the scene is served by the karen-first-loss '
    + 'trigger behind ¬defeated_karen, and the monotone closure banks defeated_karen for every '
    + 'reachable encounter, which closes the trigger before its auto-read can land. At runtime the '
    + 'ordering is forced — the first Karen fight is a scripted, unavoidable loss (atk 999), so '
    + 'retry_karen always precedes defeated_karen and the replay path re-offers the scene until it '
    + 'is read. Declared here because the rachel-after-karen trigger reads this flag as its event '
    + 'source; before that, nothing read it and the closure gap was invisible.'),

  row('epilogue_seen', 'act7_complete', 'EpilogueState.js:252', 'Written when the epilogue presentation completes.'),

  row('act7_complete', 'algorithm_defeated', 'ExplorationState.js:519', 'Mirrors the Algorithm post-dialog story flag for Act-7 ally chats.'),
  row('act6_complete', 'has_rolex', 'ExplorationState.js:542', 'Taking the Rolex advances Act 6 to Act 7.'),
  row('all_boosters_placed', ['all', 'booster_br_placed', 'booster_stair_placed', 'booster_conf_placed'], 'ExplorationState.js:570', 'Three-booster completion latch.'),
  row('tuesday_all_found', ['all', 'tuesday_floppy_found', 'tuesday_tag_found', 'tuesday_sticky_found'], 'ExplorationState.js:576', 'Three-artifact completion latch.'),
  row('ng_read_farm', 'ng_plus', 'ExplorationState.js:628', 'One-time New Game+ cubicle-farm read.'),
  row('ng_read_diane', 'ng_plus', 'ExplorationState.js:635', 'One-time New Game+ reception read.'),

  // The eleven measured code-side scene/visit latches.
  row('executive_floor_visited', 'branch_chosen', 'ExplorationState.js:736', 'First executive-floor visit latch.'),
  row('ending_started', 'branch_chosen', 'ExplorationState.js:741', 'Ending-entry record; written but deliberately not used as the re-entry guard.'),
  row('visited_archive', true, 'ExplorationState.js:776', 'First Archive visit latch; the Archive is a knowledge gate.'),
  row('archive_found', true, 'ExplorationState.js:776', 'Discovery flag written with visited_archive.'),
  row('act5_triggered', ['all', 'has_charter', 'act3_complete', ['not', 'act4_complete']], 'ExplorationState.js:3501', 'Compatibility record only. Current code writes it but never reads it in normal play.'),
  row('data_lead_fight_started', ['all', 'corporate_lawyer_defeated', ['not', 'act5_complete']], 'ExplorationState.js:797', 'Legacy delayed-push latch; runtime reconciler repairs interrupted saves.'),
  row('alex_it_recruit_offered', 'restructuring_trio_defeated', 'ExplorationState.js:805', 'One-shot Alex recruitment offer latch.'),
  row('meredith_fight_started', ['all', 'act4_complete', ['not', 'act5_complete']], 'ExplorationState.js:817', 'Objective record, not the retry guard.'),
  row('penthouse_entered', 'act6_complete', 'ExplorationState.js:831', 'Act-7 arrival latch and CFO chain event.'),
  row('restructuring_trio_started', ['all', 'act4_complete', ['not', 'act5_complete'], ['not', 'restructuring_trio_defeated']], 'ExplorationState.js:4323', 'Legacy delayed-push latch; runtime reconciler repairs interrupted saves.'),
  row('chief_fight_started', 'data_lead_defeated', 'ExplorationState.js:4332', 'Legacy delayed-push latch; runtime reconciler repairs interrupted saves.'),

  row('archive_accessible', true, 'ExplorationState.js:1153', 'Granted by correctly entering the Archive knowledge code 47-19-82.'),
  row('archive_cracked_early', ['not', 'archive_found'], 'ExplorationState.js:1154', 'Granted when the Archive knowledge gate is solved before its story discovery.'),
  row('vault_code_1', true, 'ExplorationState.js:1188', 'The Vault keypad grants all three observed-code flags after a correct solve.'),
  row('vault_code_2', true, 'ExplorationState.js:1189', 'The Vault keypad grants all three observed-code flags after a correct solve.'),
  row('vault_code_3', true, 'ExplorationState.js:1190', 'The Vault keypad grants all three observed-code flags after a correct solve.'),
  row('vault_cracked_early', ['not', 'has_rolex'], 'ExplorationState.js:1191', 'Granted when the Vault is cracked before the Janitor hands over the Rolex.'),
  row('vault_accessible', true, 'ExplorationState.js:1194', 'Granted by correctly entering the Vault knowledge code 47-19-82.'),
  row('floor_13_found', true, 'ExplorationState.js:1446', 'Written on the hidden Floor 13 transition.'),

  row('karen_defeated', 'defeated_karen', 'ExplorationState.js:1606', 'Story-boss alias safety net after victory.'),
  row('chad_defeated', 'defeated_chad', 'ExplorationState.js:1606', 'Story-boss alias safety net after victory.'),
  row('grandma_defeated', 'defeated_grandma', 'ExplorationState.js:1606', 'Story-boss alias safety net after victory.'),
  row('roguelite_tutorial_wins', 'retry_karen', 'ExplorationState.js:1555', 'Reception tutorial victory counter; truthiness is reachable after the first win.'),
  row('karen_retry_ready', 'roguelite_tutorial_wins', 'ExplorationState.js:1563', 'Resource/level threshold after three tutorial reception wins; count ordering is outside this simulator.'),
  row('postGameReceptionUnlocked', 'algorithm_defeated', 'ExplorationState.js:1769', 'Post-game reception unlock latch.'),
  row('currentClient', 'retry_karen', 'ExplorationState.js:1754', 'A generated reception client record; payload values are outside the boolean story model.'),
  row('portfolioClients', 'retry_karen', 'ExplorationState.js:2028', 'Book-of-business counter after a client decision/day close.'),
  row('portfolioAUM', 'retry_karen', 'ExplorationState.js:2029', 'Book-of-business AUM counter after a client decision/day close.'),
  row('portfolioFees', 'retry_karen', 'ExplorationState.js:2030', 'Book-of-business fee counter after a client decision/day close.'),
  row('daysWorked', 'retry_karen', 'ExplorationState.js:2040', 'Billable-day completion counter.'),
  row('totalClientsSeen', 'retry_karen', 'ExplorationState.js:2136', 'Reception client counter.'),
  row('portfolio_strong', 'retry_karen', 'ExplorationState.js:2340', 'Existential portfolio-health band; AUM/client ordering is outside DESIGN 7.3.'),
  row('portfolio_weak', 'retry_karen', 'ExplorationState.js:2341', 'Existential portfolio-health band; AUM/client ordering is outside DESIGN 7.3.'),
  row('whale_referral_pending', 'retry_karen', 'ExplorationState.js:2200', 'Generated-client referral latch.'),
  row('pb_richest_client', 'retry_karen', 'ExplorationState.js:2034', 'Reception personal best.'),
  row('pb_best_aum_single', 'retry_karen', 'ExplorationState.js:2037', 'Reception personal best.'),
  row('pb_best_day_aum', 'retry_karen', 'ExplorationState.js:2046', 'Billable-day personal best.'),
  row('pb_longest_day', 'retry_karen', 'ExplorationState.js:2050', 'Billable-day personal best.'),
  row('pb_best_day_hours', 'retry_karen', 'ExplorationState.js:2054', 'Billable-day personal best.'),
  row('pb_perfect_day', 'retry_karen', 'ExplorationState.js:2058', 'Perfect-day performance latch.'),
  row('day_premium_explained', 'retry_karen', 'ExplorationState.js:2080', 'One-time closing-premium explanation latch.'),
  row('bossAnger', 'retry_karen', 'ExplorationState.js:2143', 'Reception run-state value.'),
  row('pb_accept_streak_cur', 'retry_karen', 'ExplorationState.js:2193', 'Reception streak counter.'),
  row('pb_accept_streak', 'retry_karen', 'ExplorationState.js:2195', 'Reception personal best.'),
  row('chainQueue', 'retry_karen', 'ExplorationState.js:2251', 'Generated client-chain queue payload.'),
  row('lastQuarterlyReviewAt', 'retry_karen', 'ExplorationState.js:2307', 'Quarterly review cadence counter.'),
  row('clientBuffTotal', 'retry_karen', 'ExplorationState.js:2450', 'Reception run-state aggregate.'),
  row('skipAngerDebuffTotal', 'retry_karen', 'ExplorationState.js:2465', 'Reception run-state aggregate.'),
  row('whisper_monitor_seen', true, 'ExplorationState.js:4247', 'Proximity-based first whisper-monitor discovery.'),
  row('wardrobe_mirror_used', true, 'WardrobeState.js:103', 'Written on opening the sixth-floor bathroom mirror (the wardrobe preview). The bathroom is ungated from Act 1, so the grant is unconditional; clears the post-Karen-loss signpost and gates Rachel\'s later deadpan acknowledgement.'),
  row('wardrobe_tip_shown', true, 'WardrobeState.js:130', 'One-time Pause Menu -> Cosmetics teach latch, written on first mirror exit.'),

  // Finite template-key writes discovered by the setFlag grep. Keep these
  // derived from the same data tables as the runtime so additions cannot leave
  // the declaration stale.
  ...Object.keys(ROOM_THOUGHTS).map(room => row(
    `thought_${room}`, true, 'ExplorationState.js:660',
    `First-visit monologue latch for ${room}.`,
  )),
  ...Object.entries(ROOM_THOUGHTS_BY_ACT).flatMap(([room, acts]) => Object.keys(acts).flatMap(act => [
    row(`thought_${room}_a${act}`, true, 'ExplorationState.js:723', `Act-${act} monologue latch for ${room}.`),
    row(`thought_${room}_a${act}_owed`, true, 'ExplorationState.js:700', `Deferred Act-${act} monologue IOU for ${room}.`),
  ])),
  ...Object.keys(ENCOUNTERS).filter(id => id !== 'reception_client').map(id => row(
    `pip_notice_${id}`, true, 'ExplorationState.js:1709',
    `One-time Performance Improvement Plan notice written inside the defeat callback for ${id}; callback/event ordering is outside the boolean flag precondition model.`,
  )),
  row('chain_chain_<surname>_<timestamp>', 'retry_karen', 'ExplorationState.js:2268', 'Runtime-keyed beneficiary-chain state. generateBeneficiaryChain already prefixes its id with chain_, and the writer prefixes it once more; the unbounded timestamp key-space is declared as this template rather than enumerated.'),

  row('dayState', 'retry_karen', 'billableDay.js:488', 'Serialized in-progress Billable Day payload.'),
  row('pb_review_level', 'retry_karen', 'review.js:418', 'Performance-review level counter.'),

  row('arcade_highscore', 'launch_arcade', 'ArcadeState.js:868', 'Arcade score record; numeric ordering is outside the story model.'),
  row('arcade_best_distance', 'launch_arcade', 'ArcadeState.js:889', 'Arcade distance record; numeric ordering is outside the story model.'),
  ...COSMETIC_MILESTONES.map(item => row(
    item.flag, 'launch_arcade', 'ArcadeState.js:873',
    `Arcade cosmetic milestone at ${item.floors} floors; score ordering is outside the story model.`,
  )),

  ...SHOP_ITEMS.filter(item => item.flag).map(item => row(
    item.flag,
    item.category === 'renovation' ? 'algorithm_defeated' : true,
    `ShopState.js:${item.category === 'renovation' ? 438 : 435}`,
    `${item.category} purchase flag from SHOP_ITEMS; AUM ordering is outside the story model.`,
  )),
  ...SHOP_ITEMS.filter(item => item.category === 'upgrade').map(item => row(
    `shop_${item.id}`, true, 'ShopState.js:431',
    'Repeatable upgrade purchase counter; AUM ordering is outside the story model.',
  )),
  ...[...new Set(SHOP_ITEMS.map(item => item.category))].map(category => row(
    `bought_category_${category}`,
    category === 'renovation' ? 'algorithm_defeated' : true,
    'ShopState.js:444',
    `Written after any ${category} purchase; AUM ordering is outside the story model.`,
  )),

  ...REVIEW_ITEMS.filter(item => item.toggleFlag).map(item => row(
    item.toggleFlag, 'retry_karen', 'review.js:299',
    `Toggle for purchased review item ${item.id}; review-currency ordering is outside the story model.`,
  )),
  ...STRETCH_GOALS.map(goal => row(
    `stretch_${goal.id}`, 'retry_karen', 'review.js:360',
    `Review stretch-goal toggle for ${goal.id}; review-currency ordering is outside the story model.`,
  )),

  // MenuState writes these directly into freshData.flags rather than calling
  // Player.setFlag; they are included because story/room logic reads them.
  row('ng_plus', 'epilogue_seen', 'MenuState.js:289', 'New Game+ marker written while rolling a completed save into a fresh story.'),
  row('ng_plus_count', 'epilogue_seen', 'MenuState.js:290', 'New Game+ cycle counter.'),
];

// Pattern rules are declared once and instantiated by the simulator from the
// encounter and dialog corpora.
export const AUTO_GRANTS = [
  {
    id: 'combat-victory', when: 'victory',
    flags: ['defeated_<encounterId>', 'bestiary_<encounterId>'],
    src: 'ExplorationState.js:1540',
    note: 'Every reachable non-client encounter can be won; both flags are written by the combat callback.',
  },
  {
    id: 'combat-defeat', when: 'defeat', flags: ['retry_<encounterId>'],
    src: 'ExplorationState.js:1620', note: 'Every reachable flee/defeat path writes the encounter retry flag.',
  },
  {
    id: 'dialog-completion', when: 'completion', flags: ['read_<dialogId>'],
    src: 'DialogState.js:576', note: 'Written only after the dialog has shown at least one node and completes.',
  },
  {
    id: 'dialog-choice', when: 'choice', flags: ['_chose_<dialogId>_<nodeIndex>_<choiceIndex>'],
    src: 'DialogState.js:310', note: 'Any visible choice arm may be selected; generated choice telemetry is not enumerated here.',
  },
];

// A row is a triaged read-with-no-writer, never a blanket suppression. P6 adds
// rows only after the real simulator names the missing reads and source evidence
// supplies an honest reason.
export const NEVER_SET = [
];

export const SCENE_DISPOSITION = [
  {
    scene: 'vault_entrance', kind: 'cut',
    reason: 'Ratified CUT: superseded by the live VaultKeypad service-code interaction; its Janitor keycard line is non-canon because the vault uses 47-19-82, and any placement at the archive door would be unreachable or shadow the exit.',
  },
  {
    scene: 'vault_charter', kind: 'cut',
    reason: 'Ratified CUT: vault_boxes has held the charter and been the sole has_charter writer since the same commit that authored this duplicate display (3efc4d5); a16d32a removed the redundant second container.',
  },
  {
    scene: 'penthouse_terminal', kind: 'cut',
    reason: 'Ratified CUT: superseded on the same prop by algorithm_terminal, which owns pre-fight, start_combat, and post-defeat states; the orphan\'s one unique appendix line was ported into that live terminal branch.',
  },
];
