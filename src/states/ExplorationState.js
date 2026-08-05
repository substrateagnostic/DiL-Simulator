import { InputManager } from '../core/InputManager.js';
import { EventBus } from '../core/EventBus.js';
import { AudioManager } from '../core/AudioManager.js';
import { Engine } from '../core/Engine.js';
import { IsometricCamera } from '../world/IsometricCamera.js';
import { RoomManager } from '../world/RoomManager.js';
import { WALL_FADE_INSET } from '../world/Room.js';
import { StageDirector } from '../world/StageDirector.js';
import { Player } from '../entities/Player.js';
import { DialogState } from './DialogState.js';
import { CombatState } from './CombatState.js';
import { MenuState } from './MenuState.js';
import { ClientReviewState } from './ClientReviewState.js';
import { DayState } from './DayState.js';
import { DIALOGS } from '../data/dialogs/index.js';
import { ENCOUNTERS } from '../data/encounters/index.js';
import { TransitionOverlay } from '../ui/TransitionOverlay.js';
import { ElevatorRide } from '../ui/ElevatorRide.js';
import { generateClient, generateDayClient, generateBeneficiaryChain, applyChainModifiers, calculatePortfolioHealth } from '../data/ClientGenerator.js';
import {
  DAY_TEXT,
  applyDayStats,
  clearDay,
  closingPremiumParts,
  computeHours,
  newDay,
  readDay,
  revertDayStats,
  revokeDayStats,
  rollDayLength,
  writeDay,
} from '../data/billableDay.js';
import { ENEMY_STATS, XP_TABLE } from '../data/stats.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { ROOM_THOUGHTS, ROOM_THOUGHTS_BY_ACT, STORY_THOUGHTS } from '../data/thoughts.js';
import { SaveManager } from '../core/SaveManager.js';
import { AchievementManager } from '../core/AchievementManager.js';
import { NotificationArbiter, NC } from '../core/NotificationArbiter.js';
import { DEV_MODE, MESHY_MODE } from '../utils/constants.js';
import { ShopState } from './ShopState.js';
import { SHOP_ITEMS } from '../data/shop.js';
import { ROOM_AMBIENCE, pickAmbientCue, nextAmbientDelay } from '../data/ambience.js';
import { isDialogValidForQuestStage } from '../utils/dialogGating.js';
import { showDevPanel } from '../ui/DevPanel.js';
import { VaultKeypad } from '../ui/VaultKeypad.js';
import { applyReviewPurchases } from '../data/review.js';

// Every renovation the shop sells, by the flag it sets on purchase. Derived
// from SHOP_ITEMS rather than hand-listed so a new renovation joins the
// `renovations_all` completionist gate automatically (F-7).
const ALL_RENOVATION_FLAGS = SHOP_ITEMS
  .filter(i => i.category === 'renovation' && i.flag)
  .map(i => i.flag);

const INTERACTION_OFFSETS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const PRE_DESK_TEAM = ['janet', 'intern', 'isaiah', 'alex_it'];

// Where `_loadRoom` lands when the requested room does not exist in this build.
// Matches `Player.deserialize`'s own default for a save with no `currentRoom`.
const FALLBACK_ROOM = 'parking_garage';

const QUEST_OBJECTIVES = {
  main_act1: {
    0: 'Find your cubicle and settle in',
    1: 'Meet your coworkers',
    2: 'Report to Skip for your assignment',
    3: 'Handle the Henderson Trust meetings',
    4: 'Meet Karen Henderson in the Conference Room',
  },
  main_act2: {
    0: 'Meet Karen Henderson in the Conference Room',
    1: 'Meet Chad Henderson in the Conference Room',
    2: 'Meet Grandma Henderson in the Conference Room',
    3: 'Make your recommendation on the Henderson Trust',
  },
  main_act2_finale: {
    0: 'Head to the Executive Floor',
    1: 'Face the consequences',
  },
  main_act3: {
    0: 'Talk to Alex from IT about the encrypted partition',
    1: 'Find the Archive through the stairwell',
    2: 'Search the Archive for Henderson records',
    3: 'Confront the Janitor about his past',
    4: 'Return to Alex with the evidence',
  },
  henderson_trust: {
    briefing: 'Meet Karen Henderson in the Conference Room',
  },
  main_act4: {
    0: 'Investigate the strange occurrences',
    1: 'Rally the team: Talk to Janet, Diane, and the Mysterious Janitor',
    2: 'Convince Skip to stand up for the department',
    3: 'Access the HR Department',
    4: 'Find the Vault behind the Archive',
    5: 'Retrieve the 1947 charter from the Vault',
  },
  main_act5: {
    0: 'Defeat the Brand Consultant',
    1: 'Defeat the Restructuring Analyst',
    2: 'Defeat the Corporate Lawyer',
    3: 'Access the Board Room',
    4: 'Confront Meredith in the Board Room',
  },
  // DEAD DATA in Act 6: no Act-6 dialog emits `quest_update`, and `_updateQuest`
  // is the only reader. The live Act-6 HUD text is `_getStoryObjective()`.
  // Kept in the new order for consistency, not because anything displays it.
  main_act6: {
    0: 'Get Skip to prepare his speech',
    1: 'Rally the team for the board meeting',
    2: 'Gather evidence against Meredith',
    3: 'Convene the board',
    4: "Get the Janitor's Rolex",
  },
  main_act7: {
    0: 'Ascend to the Penthouse',
    1: "Defeat the CFO's Assistant",
    2: 'Defeat the Regional Director',
    3: 'Face The Algorithm',
    4: 'Choose the fate of the Trust Department',
  },
};

export class ExplorationState {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.player = new Player();
    this.camera = new IsometricCamera();
    this.roomManager = new RoomManager(Engine.scene);
    // Cutscene staging. Owned here (it needs the room, the player and the
    // tileMap) but TICKED FROM main.js, because this state stops updating the
    // moment a DialogState is pushed over it. See src/world/StageDirector.js.
    this.stage = new StageDirector(this);
    this.transition = new TransitionOverlay();
    this.tileMap = null;
    this.paused = false;
    // Ambient scheduler state (F-11) — see _updateAmbience.
    this._ambRoom = null;
    this._ambTimer = 0;
    this._ambState = {};
    this.hudElement = null;
    this.promptElement = null;
    this.locationElement = null;
    this.miniStatsElement = null;
    this.questElement = null;
    this.toastContainer = null;
    this.nearestNPC = null;
    this.nearestInteractable = null;
    this._pendingCombat = null;
    this._pendingDialog = null;
    // Archive-Janitor router destinations. Recomputed every frame by
    // `_getDialogId` and consumed by the `janitor_*_chosen` flag-set handlers.
    this._janitorBeatDialog = null;
    this._janitorRiddleDialog = null;
    this._lastPromptHTML = null;
    this._nearbyExitTarget = { x: 0, z: 0, data: null };
    this._nearbyInteractableTarget = { x: 0, z: 0, data: null };
    this._nearbyTargets = { exit: null, interactable: null };
    this._lastSupplyShopAum = null;
    this._supplyShopPromptText = null;
    this._lastElevatorLinkFrom = null;
    this._lastElevatorLinkTo = null;
    this._lastElevatorLinkResult = false;
    this._lastPromptNPC = null;
    this._lastPromptNPCName = null;
    this._npcPromptText = null;
    this._lastReadDialogId = null;
    this._readDialogFlag = null;

    // Quest tracking
    this.activeQuests = [];
    this.currentObjective = '';
    this.currentQuestId = 'main_act1';

    // Upgrade tooltip state
    this.upgradeTooltip = null;
    this._upgradeTooltipDismissed = false;
    this._lastSeenUpgradePoints = 0;

    // Event listeners
    this._listeners = [];
  }

  enter() {
    if (DEV_MODE) window.__explore = this; // harness/debug handle
    // Review Point purchases live outside the save (localStorage, beside the
    // achievement list) so they survive New Game+ and brand-new files. Stamp
    // them onto this player as flags on every load. Idempotent.
    applyReviewPurchases(this.player);
    Engine.scene.add(this.player.mesh);
    this._createHUD();
    // The arbiter's root is page-level, NOT inside `.exploration-hud` — combat
    // hides that element wholesale and the combat zones have to stay alive.
    // Scope gating is what keeps world notifications off the fight screen.
    NotificationArbiter.mount();
    NotificationArbiter.openScope('world');
    this._loadRoom(this.player.currentRoom);
    this._updateLocationDisplay(this.player.currentRoom);
    AudioManager.playMusic(this._getMusicForRoom(this.player.currentRoom));

    this._listeners.push(
      // Dialog mood → facial expression on the NPC being talked to
      EventBus.on('dialog-mood', ({ mood }) => {
        const expr = { angry: 'angry', smug: 'smug', worried: 'worried', defeated: 'hurt' }[mood];
        if (expr) this.nearestNPC?.animator?.setExpression(expr, 5);
      }),
      EventBus.on('start-combat', (data) => {
        const encounterId = typeof data === 'string' ? data : data.encounter;
        this._pendingCombat = encounterId;
      }),
      // Cutscene staging hand-off. `claimed` is the ack DialogState checks —
      // without a listener a `stage` node degrades to a no-op instead of
      // blocking the tree forever.
      EventBus.on('stage-beats', (payload) => {
        payload.claimed = true;
        this.stage.run(payload.beats, payload.done);
      }),
      EventBus.on('stage-skip', () => this.stage.finishNow()),
      EventBus.on('dialog-end', () => {
        // Transient actors a scene spawned live exactly as long as their
        // dialog; anything still walking finishes first.
        this.stage.endScene();
        if (this._pendingCombat) {
          const encounterId = this._pendingCombat;
          this._pendingCombat = null;
          // ARMING LATCH — `_pendingCombat` is cleared here but the fight is not
          // pushed for another 300 ms, and `paused` is not raised until
          // `_startCombat` runs. Without a latch covering that gap a mashing
          // player re-opens the pre-fight dialog underneath the fight (see the
          // re-entrancy guard in `_interact`). Cleared synchronously immediately
          // before `_startCombat`, so it can never deadlock the interact key.
          if (this._combatArming) return;
          this._combatArming = true;
          setTimeout(() => {
            this._combatArming = false;
            // Defence in depth: `_transitionArmed()` already keeps the pause key
            // shut for this whole window, but if a MenuState is somehow on the
            // stack when the timer fires, defer rather than push the fight
            // UNDERNEATH it. `resume()` flushes — never leave this set unflushed
            // or the interact guard locks forever.
            const menuOpen = this.stateManager.stack.some(s => s.constructor.name === 'MenuState');
            if (menuOpen) { this._pendingCombat = encounterId; return; }
            this._startCombat(encounterId);
          }, 300);
          return;
        }

        if (this._pendingDialog) {
          const dialogId = this._pendingDialog;
          this._pendingDialog = null;
          if (DIALOGS[dialogId]) {
            this._dialogArming = true;
            setTimeout(() => {
              this._dialogArming = false;
              // If the fight was already started via the terminal, don't re-push the intro dialog
              if (dialogId === 'algorithm_combat' && this.player.getFlag('defeated_algorithm')) return;
              // If the menu is open, defer the dialog until resume() fires after it closes
              const menuOpen = this.stateManager.stack.some(s => s.constructor.name === 'MenuState');
              if (menuOpen) {
                this._pendingDialog = dialogId;
                return;
              }
              const dialogState = new DialogState(DIALOGS[dialogId], this.player, this.stateManager, dialogId);
              this.stateManager.push(dialogState);
            }, 500);
          }
          return;
        }

        // The epilogue plays once the ending dialog chain has fully drained
        if (this._pendingEpilogue && !this._pendingCombat && !this._pendingDialog) {
          this._pendingEpilogue = false;
          // Same arming latch as the fight, for the same reason: 900 ms of
          // top-of-stack exploration with `paused` still false.
          if (this._epilogueArming) return;
          this._epilogueArming = true;
          setTimeout(async () => {
            this._epilogueArming = false;
            const menuOpen = this.stateManager.stack.some(s => s.constructor.name === 'MenuState');
            if (menuOpen) { this._pendingEpilogue = true; return; }
            const { EpilogueState } = await import('./EpilogueState.js');
            this.stateManager.push(new EpilogueState(this.stateManager, this.player));
          }, 900);
        }
      }),
      EventBus.on('quest-update', (data) => {
        const questId = typeof data === 'string' ? data : data.quest;
        const stage = typeof data === 'string' ? undefined : data.objective;
        this._updateQuest(questId, stage);
      }),
      EventBus.on('abilities-viewed', () => {
        this._dismissUpgradeTooltip();
      }),
      EventBus.on('flag-set', ({ key, value }) => {
        this._refreshStoryProgress();
        // Alex IT router: chain into the chosen dialog after router ends
        // Only queue pending dialogs when flags are set to truthy values — not when cleared
        if (key === 'alex_story_chosen' && value) {
          // act2_complete ceiling: past Act 2, the act2 reveal would play
          // empty (dialogGating caps alex_it_act2 at quest stage 299), so the
          // Act-3 scene carries the reveal instead — and now sets
          // knows_server_secret itself so the flag can't strand.
          const { hasAct2 } = this._alexStoryBeats();
          this._pendingDialog = hasAct2 ? 'alex_it_act2' : 'alex_it_act3';
          // Reset immediately so the flag can fire again for future story acts
          this.player.setFlag('alex_story_chosen', false);
        }
        if (key === 'alex_story_deferred' && value) {
          this._pendingDialog = this._getAlexSideQuestDialog();
        }
        if (key === 'alex_side_chosen' && value) {
          this._pendingDialog = this._getAlexSideQuestDialog();
          // Reset immediately so the flag can fire again next time the side router is used
          this.player.setFlag('alex_side_chosen', false);
        }
        // Archive-Janitor router: same chain as Alex's. `_getDialogId` stashed
        // both destinations when it decided to serve `janitor_router`; the
        // choice node sets one of these flags, and we queue the chosen scene so
        // it plays on `dialog-end` without a second interaction.
        if (key === 'janitor_story_chosen' && value) {
          if (this._janitorBeatDialog) this._pendingDialog = this._janitorBeatDialog;
          this.player.setFlag('janitor_story_chosen', false);
        }
        if (key === 'janitor_riddle_chosen' && value) {
          if (this._janitorRiddleDialog) this._pendingDialog = this._janitorRiddleDialog;
          this.player.setFlag('janitor_riddle_chosen', false);
        }
        if (key === 'alex_main_chosen' && value) {
          // Find the appropriate act-based dialog for Alex
          const act = this.player.actIndex || 0;
          const actDialogs = ['alex_it_act7', 'alex_it_act6', 'alex_it_act4', 'alex_it_act3'];
          const actThresholds = [7, 6, 4, 3];
          let mainDialog = 'alex_it_return';
          for (let i = 0; i < actDialogs.length; i++) {
            if (act >= actThresholds[i] && DIALOGS[actDialogs[i]]) {
              mainDialog = actDialogs[i];
              break;
            }
          }
          this._pendingDialog = mainDialog;
          // Reset immediately so the flag can fire again next time the side router is used
          this.player.setFlag('alex_main_chosen', false);
        }
        if (key === 'briefing_complete' && !this.player.getFlag('defeated_intern')) {
          this._showToast('Spar with the Intern before meeting Karen — you\'ll need the practice.', 'objective');
        }
        if (key === 'defeated_intern' && this.player.stats.level < 2) {
          const xpNeeded = XP_TABLE[1] - this.player.stats.xp;
          if (xpNeeded > 0) this.player.gainXP(xpNeeded);
          this._updateMiniStats();
          this._showToast('Intern defeated! Gained enough experience to reach Level 2!', 'objective');
        }
        if (key === 'branch_chosen') {
          this._showToast('The executive elevator is now unlocked.', 'objective');
          // Apply Henderson decision buff/debuff
          if (this.player.getFlag('path_legal')) {
            this.player.stats.def += 3;
          } else if (this.player.getFlag('path_bro')) {
            this.player.stats.spd += 3;
            this.player.stats.def -= 2;
          } else if (this.player.getFlag('path_grandma')) {
            this.player.stats.atk += 3;
          }
        }
        if (key === 'act2_complete') {
          this._showToast('Something is stirring in the building...', 'objective');
        }
        if (key === 'archive_accessible') {
          this._showToast('The Archive is now accessible from the back corridor.', 'objective');
        }
        if (key === 'hr_accessible') {
          this._showToast('The HR Department is now accessible.', 'objective');
        }
        if (key === 'vault_accessible') {
          this._showToast('The Vault behind the Archive is now accessible.', 'objective');
        }
        if (key === 'board_room_accessible') {
          this._showToast('The Board Room is now accessible from the executive floor.', 'objective');
        }
        if (key === 'act3_complete') {
          this._showToast('Meredith has locked down the building. Rally Janet, Diane, and the Janitor!', 'objective');
        }
        if (key === 'act5_complete') {
          this._showToast('Meredith is defeated, but the board meets tomorrow. Prepare the team!', 'objective');
        }
        if (key === 'diane_act6_rallied') {
          this._showToast("Diane rallied! Her documents are in the HR filing cabinet.", 'objective');
        }
        // Board Meeting set-piece — now the Act-6 spine (it gates the Rolex),
        // so it gets a toast the moment Skip has a speech.
        // NO `board_meeting_held` toast: `_refreshStoryProgress` already fires
        // an "Objective Updated" toast carrying the new ✓ line, and
        // `_showToast` stacks rather than replaces, so a bespoke one here
        // double-toasted the same beat.
        if (key === 'skip_speech_ready') {
          this._showToast('Skip is waiting in the Board Room. The board sits at 4.', 'objective');
        }
        if (key === 'act6_complete') {
          this._showToast('The Penthouse awaits. Face The Algorithm.', 'objective');
        }
        // Ending triggers — show appropriate ending dialog after Algorithm defeated
        if (key === 'ending_cooperative' && DIALOGS.ending_cooperative) {
          setTimeout(() => {
            const dialogState = new DialogState(DIALOGS['ending_cooperative'], this.player, this.stateManager, 'ending_cooperative');
            this.stateManager.push(dialogState);
          }, 500);
        }
        if (key === 'ending_compromise' && DIALOGS.ending_compromise) {
          setTimeout(() => {
            const dialogState = new DialogState(DIALOGS['ending_compromise'], this.player, this.stateManager, 'ending_compromise');
            this.stateManager.push(dialogState);
          }, 500);
        }
        if (key === 'ending_dissolution' && DIALOGS.ending_dissolution) {
          setTimeout(() => {
            const dialogState = new DialogState(DIALOGS['ending_dissolution'], this.player, this.stateManager, 'ending_dissolution');
            this.stateManager.push(dialogState);
          }, 500);
        }
        if (key === 'ending_architect' && DIALOGS.ending_architect) {
          setTimeout(() => {
            const dialogState = new DialogState(DIALOGS['ending_architect'], this.player, this.stateManager, 'ending_architect');
            this.stateManager.push(dialogState);
          }, 500);
        }
        // Post-credits: fires after ANY ending dialog completes (via read_ flag)
        if ((key === 'read_ending_cooperative' || key === 'read_ending_compromise' || key === 'read_ending_dissolution' || key === 'read_ending_architect') && DIALOGS.post_credits) {
          setTimeout(() => {
            const dialogState = new DialogState(DIALOGS['post_credits'], this.player, this.stateManager, 'post_credits');
            this.stateManager.push(dialogState);
          }, 2000);
        }
        // Arcade minigame launch — hide the exploration HUD while playing.
        // The `&& value` guard is load-bearing: the next line clears the
        // flag, which re-emits `flag-set` with the SAME key, and without
        // the guard that second emit pushed a SECOND ArcadeState on top of
        // the first — two scenes fighting over Engine.renderScene, two HUDs
        // in the DOM, and a title card that could never be dismissed
        // because the instance holding the keyboard was the other one.
        if (key === 'launch_arcade' && value) {
          this.player.setFlag('launch_arcade', false);
          import('./ArcadeState.js').then(({ ArcadeState }) => {
            if (this.hudElement) this.hudElement.style.display = 'none';
            const arcadeState = new ArcadeState(this.stateManager, this.player);
            const origExit = arcadeState.exit.bind(arcadeState);
            arcadeState.exit = () => {
              origExit();
              if (this.hudElement) this.hudElement.style.display = '';
            };
            this.stateManager.push(arcadeState);
          });
        }
        // act7_complete was read by Act-7 ally chats but never written
        // (logic-sweep MAJOR): mirror the Algorithm's defeat flag
        if (key === 'algorithm_defeated' && value) {
          this.player.setFlag('act7_complete', true);
          // Queue the epilogue for when the ending dialogs finish
          if (!this.player.getFlag('epilogue_seen')) this._pendingEpilogue = true;
        }
        // Act 6½: pulling the seal from box 0001 triggers The Firm's ambush
        if (key === 'has_recorder_seal') {
          this._pendingDialog = 'the_firm_ambush';
        }
        // Penthouse encounters chain: CFO's assistant → Regional Director → Algorithm
        if (key === 'penthouse_entered') {
          this._pendingDialog = 'cfos_assistant_combat';
        }
        if (key === 'cfos_defeated') {
          this._pendingDialog = 'regional_director_combat';
        }
        if (key === 'regional_director_defeated') {
          this._pendingDialog = 'algorithm_combat';
        }
        // Act 6 → 7 transition: board heard + rolex = penthouse unlocks.
        // The toast no longer claims the team is assembled — since the board
        // meeting became the gate, the ally/evidence prep is optional and a
        // player can reach this line at 1/5 allies.
        if (key === 'has_rolex') {
          this.player.setFlag('act6_complete', true);
          const levels = this.player.gainXP(500);
          this._updateMiniStats();
          this._showToast('The board has spoken. The watch is yours. +500 XP', 'objective');
          if (levels.length > 0) AudioManager.playSfx('levelup');
        }
        if (key === 'has_charter') {
          this._showToast('You have the 1947 Charter! Its power resonates through the building.', 'item');
        }
        // Wire quest completion flags to ability unlock system
        const questFlagMap = {
          quest_anomaly_347_complete: 'anomaly_347',
          quest_legacy_admin_complete: 'legacy_admin',
          quest_network_ghost_complete: 'network_ghost',
          quest_daves_legacy_complete: 'daves_legacy',
          quest_printer_soul_complete: 'printers_soul',
          quest_final_patch_complete: 'final_patch',
        };
        if (questFlagMap[key]) {
          this.player.questStates[questFlagMap[key]] = 'complete';
          this._showToast('New ability unlocked!', 'item');
        }
        // 3:47 Anomaly quest gives permanent SPD boost
        if (key === 'quest_anomaly_347_complete') {
          this.player.stats.spd += 3;
          this._updateMiniStats();
          this._showToast('SPD +3! The overclocked badge hums with power.', 'item');
        }
        // Network Ghost: derive all_boosters_placed when all 3 are set
        if (key === 'booster_br_placed' || key === 'booster_stair_placed' || key === 'booster_conf_placed') {
          if (this.player.getFlag('booster_br_placed') && this.player.getFlag('booster_stair_placed') && this.player.getFlag('booster_conf_placed')) {
            this.player.setFlag('all_boosters_placed', true);
          }
        }
        // Tuesday 2PM: derive tuesday_all_found when all 3 artifacts are collected
        if (key === 'tuesday_floppy_found' || key === 'tuesday_tag_found' || key === 'tuesday_sticky_found') {
          if (this.player.getFlag('tuesday_floppy_found') && this.player.getFlag('tuesday_tag_found') && this.player.getFlag('tuesday_sticky_found')) {
            this.player.setFlag('tuesday_all_found', true);
          }
        }
        // Story thoughts triggered by flags
        if (STORY_THOUGHTS[key]) {
          setTimeout(() => this._showMonologue(STORY_THOUGHTS[key]), 2000);
        }
        // Act completion achievements — fire immediately when the act-end flag lands
        const ACT_ACHIEVEMENT_FLAGS = [
          'briefing_complete', 'act2_complete', 'act3_complete',
          'act4_complete', 'act5_complete', 'act6_complete', 'algorithm_defeated',
          // Act 6½ + post-game choices
          'charter_certified', 'defeated_the_firm', 'meter_war_done',
          'bus515_done', 'daemon_kept', 'daemon_killed',
        ];
        if (ACT_ACHIEVEMENT_FLAGS.includes(key)) {
          AchievementManager.check(this.player, {});
        }
        // Refresh quest tracker on any flag change (picks up side quest starts/completions)
        this._refreshStoryProgress(true);
        // Janitor riddles complete — +2 all stats
        if (key === 'janitor_riddle_3_done') {
          this.player.stats.maxHP += 2;
          this.player.stats.hp += 2;
          this.player.stats.atk += 2;
          this.player.stats.def += 2;
          this.player.stats.spd += 2;
          this._updateMiniStats();
          this._showToast('All stats +2! The Janitor nods approvingly.', 'item');
        }
      }),
      EventBus.on('item-received', ({ name, quantity }) => {
        const prefix = quantity > 1 ? `${quantity}x ` : '';
        this._showToast(`Received ${prefix}${name}`, 'item');
      }),
      EventBus.on('renovation-purchased', () => {
        // Rebuild the current room so new furniture appears immediately
        this._loadRoom(this.player.currentRoom, this.player.position.x, this.player.position.z);
      }),
      EventBus.on('room-entered', (roomId) => {
        this._updateLocationDisplay(roomId);
        this._refreshStoryProgress(true);
        this._updateDayChip();

        // ── NG+ reads ─────────────────────────────────────────────────
        // `ng_plus_count` used to be written by MenuState and read by exactly
        // one thing (the enemy ladder). These are the Undertale half of P4.1:
        // a second-lap Andrew who knows, and a Diane who does not say so.
        // Two one-time flags, both `ng_` prefixed so they reset with the story.
        if (this.player.getFlag('ng_plus')) {
          if (roomId === 'cubicle_farm' && !this.player.getFlag('ng_read_farm')) {
            this.player.setFlag('ng_read_farm', true);
            setTimeout(() => this._showMonologue(
              'The carpet is the same. The fluorescent hum is the same. I know where the printer jams. That is the part that should not bother me.'
            ), 1600);
          }
          if (roomId === 'reception' && !this.player.getFlag('ng_read_diane')) {
            this.player.setFlag('ng_read_diane', true);
            setTimeout(() => this._showToast(
              'Diane: "You look tired in a way that is not about sleep. Sit down. I will get you the same coffee I got you the first time."',
              'objective',
            ), 2200);
          }
        }

        // Inner monologue on first room visit.
        //
        // F-3b: this used to be `thoughts[Math.floor(Math.random() * len)]`
        // behind a permanent `thought_<roomId>` flag — one of two authored
        // lines, once, forever. Half of every pair Alex wrote was unreachable
        // in any single save: 26 rooms x 2 lines, 26 of them dead. The pick
        // is now the whole array, in AUTHORED order.
        //
        // This is only safe because `_showMonologue` posts to the
        // NotificationArbiter's single-occupancy VOICE zone, so N lines QUEUE
        // (each with its own reading-time-scaled ttl) instead of the second
        // assigning over the first mid-read. Before the arbiter this change
        // would have doubled traffic on a measured first-writer-loses surface.
        const thoughtKey = `thought_${roomId}`;
        if (!this.player.getFlag(thoughtKey) && ROOM_THOUGHTS[roomId]) {
          this.player.setFlag(thoughtKey, true);
          const thoughts = ROOM_THOUGHTS[roomId];
          setTimeout(() => { for (const t of thoughts) this._showMonologue(t); }, 1500);
        }

        // F-3c: act-keyed room lines. The interiors change by act (time of day
        // already does — TOD_BY_ACT); Andrew never noticed. A line here fires
        // ONCE per (room, act) on any visit, including revisits long after the
        // first-visit pair is spent, so a room the player has walked through
        // forty times says something new when the story moves under it.
        // Its own flag namespace (`thought_<roomId>_a<act>`) — never reuse
        // `thought_<roomId>`, which is the first-visit latch.
        const actLines = ROOM_THOUGHTS_BY_ACT[roomId]?.[this.player.actIndex];
        if (actLines && actLines.length) {
          const actKey = `thought_${roomId}_a${this.player.actIndex}`;
          // An entry may be a bare string or `{ text, flag }` / `{ text, notFlag }`
          // for a line that asserts something the player might not have seen.
          const live = actLines
            .filter(l => typeof l === 'string'
              || ((!l.flag || this.player.getFlag(l.flag)) && (!l.notFlag || !this.player.getFlag(l.notFlag))))
            .map(l => (typeof l === 'string' ? l : l.text));
          // The latch is only spent when a line ACTUALLY fires — a gated line
          // whose flag is not yet set must stay available for a later visit.
          if (live.length && !this.player.getFlag(actKey)) {
            this.player.setFlag(actKey, true);
            setTimeout(() => { for (const t of live) this._showMonologue(t); }, 2600);
          }
        }

        // Day boons are floor-scoped. Runs for EVERY room (including a load
        // straight into a save), so the state can never drift out of sync.
        this._syncDayStatScope(roomId);

        if (roomId === 'reception') {
          this._onReceptionEntered();
        }

        // Executive floor: track first visit for cosmetic unlock
        if (roomId === 'executive_floor' && !this.player.getFlag('executive_floor_visited')) {
          this.player.setFlag('executive_floor_visited');
        }

        // Ending dialog re-triggers on every executive floor visit until the boss is defeated
        const endingBossDefeated = this.player.getFlag('regional_defeated') || this.player.getFlag('compliance_defeated') || this.player.getFlag('skip_defeated');
        if (roomId === 'executive_floor' && this.player.getFlag('branch_chosen') && !endingBossDefeated) {
          this.player.setFlag('ending_started');

          let endingDialogId = null;
          if (this.player.getFlag('path_legal')) {
            const isRetry = this.player.getFlag('retry_regional');
            endingDialogId = isRetry && DIALOGS.regional_retry ? 'regional_retry' : 'legal_eagle_ending';
          } else if (this.player.getFlag('path_bro')) {
            const isRetry = this.player.getFlag('retry_compliance');
            endingDialogId = isRetry && DIALOGS.compliance_retry ? 'compliance_retry' : 'bro_code_ending';
          } else if (this.player.getFlag('path_grandma')) {
            const isRetry = this.player.getFlag('retry_skip_boss');
            endingDialogId = isRetry && DIALOGS.skip_boss_retry ? 'skip_boss_retry' : 'secret_ending';
          }

          if (endingDialogId && DIALOGS[endingDialogId]) {
            setTimeout(() => {
              const endingDialog = new DialogState(DIALOGS[endingDialogId], this.player, this.stateManager, endingDialogId);
              this.stateManager.push(endingDialog);
            }, 1000);
          }
        }

        // HR Department: HR rep blocks entry until defeated
        if (roomId === 'hr_department' && !this.player.getFlag('defeated_hr_rep')) {
          if (DIALOGS.hr_rep_combat) {
            setTimeout(() => {
              const dialogState = new DialogState(DIALOGS['hr_rep_combat'], this.player, this.stateManager, 'hr_rep_combat');
              this.stateManager.push(dialogState);
            }, 800);
          }
        }

        // Archive: first visit triggers security guard encounter
        if (roomId === 'archive' && !this.player.getFlag('visited_archive')) {
          this.player.setFlag('visited_archive');
          this.player.setFlag('archive_found');
          if (DIALOGS.security_guard_combat) {
            setTimeout(() => {
              const dialogState = new DialogState(DIALOGS['security_guard_combat'], this.player, this.stateManager, 'security_guard_combat');
              this.stateManager.push(dialogState);
            }, 800);
          }
        }

        // Act 5 trigger: entering cubicle farm with charter triggers restructuring team cutscene (one-time)
        // `act3_complete` is the safety catch for the vault keypad: a player
        // who cracks 47-19-82 in Act 1 and lifts the charter must not detonate
        // Act 5 (a level-1 Andrew against the 3v2 Restructuring trio) on the
        // walk back to his desk. The sequence break gives you the object early;
        // it does not skip three acts of story. In the normal path act3_complete
        // is long since set, so this changes nothing.
        if (roomId === 'cubicle_farm' && this.player.getFlag('has_charter') && this.player.getFlag('act3_complete') && !this.player.getFlag('act4_complete') && !this.player.getFlag('act5_triggered') && DIALOGS.act5_trigger) {
          this.player.setFlag('act5_triggered');
          setTimeout(() => {
            const dialogState = new DialogState(DIALOGS['act5_trigger'], this.player, this.stateManager, 'act5_trigger');
            this.stateManager.push(dialogState);
          }, 800);
        }

        // Gauntlet fight 4: Data Analytics Duo — Lead + CFO's Assistant on executive floor
        // (replaces the solo Data Analytics Lead encounter; party from player.party comes along)
        if (roomId === 'executive_floor' && this.player.getFlag('corporate_lawyer_defeated') && !this.player.getFlag('act5_complete') && !this.player.getFlag('data_lead_fight_started') && DIALOGS.data_analytics_duo_intro) {
          this.player.setFlag('data_lead_fight_started');
          setTimeout(() => {
            const dialogState = new DialogState(DIALOGS['data_analytics_duo_intro'], this.player, this.stateManager, 'data_analytics_duo_intro');
            this.stateManager.push(dialogState);
          }, 800);
        }

        // Alex from IT recruitment: triggers when Andrew enters the server room after the trio fight
        if (roomId === 'server_room'
            && this.player.getFlag('restructuring_trio_defeated')
            && !this.player.getFlag('alex_it_recruit_offered')
            && DIALOGS.alex_it_recruit) {
          this.player.setFlag('alex_it_recruit_offered');
          setTimeout(() => {
            const dialogState = new DialogState(DIALOGS['alex_it_recruit'], this.player, this.stateManager, 'alex_it_recruit');
            this.stateManager.push(dialogState);
          }, 800);
        }

        // Board Room: trigger Meredith fight on every entry until act5 is complete
        // (act5_complete is the only reliable "fight won" gate — meredith_fight_started
        //  cannot be used here because it gets saved on first entry and permanently
        //  blocks re-entry after a loss)
        if (roomId === 'board_room' && this.player.getFlag('act4_complete') && !this.player.getFlag('act5_complete')) {
          this.player.setFlag('meredith_fight_started');
          if (DIALOGS.meredith_boss_combat) {
            setTimeout(() => {
              const dialogState = new DialogState(DIALOGS['meredith_boss_combat'], this.player, this.stateManager, 'meredith_boss_combat');
              this.stateManager.push(dialogState);
            }, 800);
          }
        }

        // Penthouse: Act 7 entrance triggers arrival dialog + CFO's Assistant fight
        if (roomId === 'penthouse' && this.player.getFlag('act6_complete') && !this.player.getFlag('penthouse_entered')) {
          this.player.setFlag('penthouse_entered');
          if (DIALOGS.penthouse_arrival) {
            setTimeout(() => {
              const dialogState = new DialogState(DIALOGS['penthouse_arrival'], this.player, this.stateManager, 'penthouse_arrival');
              this.stateManager.push(dialogState);
            }, 800);
          }
        }
      }),
    );

    this._initQuests();
  }

  exit() {
    this.stage.dispose();
    Engine.scene.remove(this.player.mesh);
    this._removeHUD();
    if (this._vaultKeypad) { this._vaultKeypad.close(); this._vaultKeypad = null; }
    for (const unsub of this._listeners) {
      unsub();
    }
    this._listeners = [];
  }

  pause() {
    this.paused = true;
    // A stale "Go through"/"Talk to" prompt shouldn't float over combat
    // or dialogs pushed on top of us
    this._hideInteractPrompt();
    // Same reasoning, same ruling as the arbiter's: the pulsing yellow
    // "Upgrade available!" panel sits bottom-centre, right beside the dialog
    // box, and it is not a notification the arbiter can defer — it is a
    // persistent affordance. So it yields the same way the prompt does, and
    // `resume()` re-evaluates it through `_checkUpgradeTooltip()`.
    if (this.upgradeTooltip) this.upgradeTooltip.style.display = 'none';
  }

  resume() {
    this.paused = false;
    this._updateMiniStats();
    this._updatePortfolioDisplay();
    this._refreshStoryProgress(true);
    AudioManager.playMusic(this._getMusicForRoom(this.player.currentRoom));
    // Check for upgrade points tooltip
    this._checkUpgradeTooltip();
    // Flush a fight that was deferred because the menu was open during the push
    // window. MANDATORY counterpart to the deferral in the `dialog-end` handler:
    // `_interact()` returns early while `_pendingCombat` is set, so a deferral
    // with no flush would lock the interact key for the rest of the session.
    if (this._pendingCombat) {
      const encounterId = this._pendingCombat;
      this._pendingCombat = null;
      this._combatArming = true;
      setTimeout(() => {
        this._combatArming = false;
        const menuOpen = this.stateManager.stack.some(s => s.constructor.name === 'MenuState');
        if (menuOpen) { this._pendingCombat = encounterId; return; }
        this._startCombat(encounterId);
      }, 300);
      return;
    }
    // Same for a deferred epilogue.
    if (this._pendingEpilogue) {
      this._pendingEpilogue = false;
      this._epilogueArming = true;
      setTimeout(async () => {
        this._epilogueArming = false;
        const menuOpen = this.stateManager.stack.some(s => s.constructor.name === 'MenuState');
        if (menuOpen) { this._pendingEpilogue = true; return; }
        const { EpilogueState } = await import('./EpilogueState.js');
        this.stateManager.push(new EpilogueState(this.stateManager, this.player));
      }, 900);
      return;
    }
    // Flush any dialog that was deferred because the menu was open during the push window
    if (this._pendingDialog) {
      const dialogId = this._pendingDialog;
      this._pendingDialog = null;
      if (DIALOGS[dialogId]) {
        setTimeout(() => {
          // If the fight was already started via the terminal, don't re-push the intro dialog
          if (dialogId === 'algorithm_combat' && this.player.getFlag('defeated_algorithm')) return;
          const menuOpen = this.stateManager.stack.some(s => s.constructor.name === 'MenuState');
          if (menuOpen) {
            this._pendingDialog = dialogId;
            return;
          }
          const dialogState = new DialogState(DIALOGS[dialogId], this.player, this.stateManager, dialogId);
          this.stateManager.push(dialogState);
        }, 500);
      }
    }
  }

  _getMusicForRoom(roomId) {
    const map = {
      server_room:     'server',
      executive_floor: 'executive',
      parking_garage:  'parking',
      break_room:      'break_room',
      archive:         'server',
      vault:           'server',
      stairwell:       'parking',
      board_room:      'executive',
      penthouse:       'executive',
      hr_department:   'exploration',
      // City chapter (Act 6½)
      city_street:     'city',
      transit_bus:     'city',
      luckys_diner:    'diner',
      old_branch:      'diner',
      records_hall:    'records',
      old_vault:       'records',
      floor_13:        'records',  // sparse and patient — right for a floor that waits
    };
    return map[roomId] || 'exploration';
  }

  syncFromPlayerState() {
    this._syncActFromFlags();
    this._refreshStoryProgress(true);
    this._updateMiniStats();
    this._updatePortfolioDisplay();
    this._updateDayChip();
    this._updateLocationDisplay(this.player.currentRoom);
  }

  _resolveRoomId(roomId) {
    if (roomId === 'skip_office' && this.player.getFlag('renovation_corner_office')) {
      return 'skip_office_large';
    }
    if (roomId === 'penthouse' && this.player.getFlag('renovation_penthouse')) {
      return 'penthouse_expanded';
    }
    return roomId;
  }

  // Story act → time of day for the world outside the windows.
  // City chapter rooms are always golden hour (the one nice afternoon).
  // Camera-side walls (south + east) fade out when the player walks near
  // them, so narrow rooms and lower terraces stay readable. The wall
  // meshes already carry per-room cloned transparent materials.
  // Invariant: this system is the sole wall-opacity owner; Engine only mirrors it to the walk-behind sleeve.
  _updateWallFade(dt) {
    const room = this.roomManager.currentRoom;
    if (!room || !room.data) return;
    const px = this.player.position.x;
    const pz = this.player.position.z;
    const blend = Math.min(1, dt * 7);
    // WALL_FADE_INSET is imported, not re-typed: Room._registerWallProp guards
    // registration on this exact number (a room too narrow for the band to ever
    // turn off must not register props at all), so a local literal here would
    // silently un-guard it.
    const southTarget = pz > room.data.height - WALL_FADE_INSET ? 0.16 : 1.0;
    const eastTarget = px > room.data.width - WALL_FADE_INSET ? 0.16 : 1.0;
    this._fadeWallMeshes(room.getSouthWallMeshes(), southTarget, blend);
    this._fadeWallMeshes(room.getEastWallMeshes(), eastTarget, blend);
    // Props BOLTED TO those walls fade with them. Without this the wall goes
    // glassy and the thing screwed to it does not — `executive_floor`'s
    // elevatorDoors at (8,11) stood at opacity 1.0 over Andrew for the whole
    // seated act of `secret_ending`. See Room._registerWallProp.
    this._fadeWallMeshes(room.getSouthWallProps(), southTarget, blend);
    this._fadeWallMeshes(room.getEastWallProps(), eastTarget, blend);
  }

  _fadeWallMeshes(meshes, target, blend) {
    for (let i = 0; i < meshes.length; i++) {
      const material = meshes[i].material;
      if (Math.abs(material.opacity - target) < 0.01) {
        material.opacity = target;
        continue;
      }
      material.opacity += (target - material.opacity) * blend;
    }
  }

  _applyTimeOfDay(roomId) {
    const CITY_ROOMS = ['city_street', 'transit_bus', 'records_hall', 'luckys_diner', 'old_branch', 'old_vault'];
    // Street-level rooms sit at the BOTTOM of the skyline — the city
    // chapter and the garage (the building's feet)
    Engine.setStreetLevel(CITY_ROOMS.includes(roomId) || roomId === 'parking_garage');
    if (CITY_ROOMS.includes(roomId)) {
      Engine.setTimeOfDay('goldenhour');
      return;
    }
    const act = this.player.actIndex || 0;
    const TOD_BY_ACT = ['morning', 'morning', 'morning', 'afternoon', 'afternoon', 'dusk', 'night', 'predawn'];
    Engine.setTimeOfDay(TOD_BY_ACT[Math.min(act, TOD_BY_ACT.length - 1)]);
  }

  // Camera pan band. A flat `setBounds(2, w - 2, ...)` inverts or collapses on
  // any room narrower than 4 tiles — the 4-wide stairwell got `[2, 2]`, pinning
  // the camera x permanently while the player walked ±1.1 tiles across it (the
  // only degenerate-bounds room in the game). Cap the inset at half the room so
  // the band is always non-negative and centred.
  _applyCameraBounds(roomData) {
    const insetX = Math.min(2, (roomData.width - 1) / 2);
    const insetZ = Math.min(2, (roomData.height - 1) / 2);
    this.camera.setBounds(insetX, roomData.width - insetX, insetZ, roomData.height - insetZ);
  }

  _loadRoom(roomId, spawnX, spawnZ) {
    // Rule 6: a room change mid-scene would otherwise be a permanent dialog
    // freeze — the actors the director is holding are about to be disposed.
    this.stage.abort();
    let actualId = this._resolveRoomId(roomId);
    let result = this.roomManager.loadRoom(actualId, spawnX, spawnZ, this.player.flags);
    // A save can name a room this build no longer has — a hand-edited slot, or
    // any save written before a room id was renamed (`ross_office` ->
    // `skip_office`, 2026-08-04; no migration shim, live saves were ruled
    // burnable). `RoomManager.loadRoom` tears the OLD room down before it
    // discovers the new one is missing, so returning null here left the boot
    // path on an empty scene with `this.tileMap` undefined and the first
    // `update()` threw. Fall back to the entry room instead of crashing.
    if (!result) {
      console.warn(`[ExplorationState] unknown room "${roomId}" — falling back to ${FALLBACK_ROOM}`);
      roomId = FALLBACK_ROOM;
      actualId = this._resolveRoomId(roomId);
      result = this.roomManager.loadRoom(actualId, undefined, undefined, this.player.flags);
    }
    this._applyTimeOfDay(roomId);
    if (result) {
      this.tileMap = result.tileMap;
      this.player.setPosition(result.spawnX, result.spawnZ, result.tileMap);
      this.player.currentRoom = roomId;
      this.camera.snapTo(result.spawnX, result.spawnZ, this.player.mesh.position.y);

      const roomData = this.roomManager.getRoomData(actualId);
      if (roomData) {
        this._applyCameraBounds(roomData);
      }
      // Non-transition load (boot, save load, dev fixture). Warm the new room's
      // programs and textures here too — not awaited, because this path has no
      // wipe to hide behind and the compile is better overlapped with the frames
      // that follow than blocking the one that starts them. See warmScene().
      Engine.warmScene(Engine.scene, Engine.camera);
    }
  }

  /**
   * The stairwell service door. The Archive is the ONLY room the Vault opens
   * off, and the Archive was flag-gated on `archive_accessible`, which the
   * story does not set until the Act 3 Alex-from-IT conversation. So the
   * Vault's "openable from minute one" keypad could never actually be reached
   * in Act 1 — the knowledge gate was nested inside a flag gate and the real
   * sequence break was one act, not six.
   *
   * The fix is a second door, not a smaller promise: the steel fire door at the
   * bottom landing of the stairwell takes the same building service override
   * the vault door does (documented on the circuit panel in the Janitor's
   * supply closet, first room of the game). A player who read that panel can
   * walk down in Act 1. The story path is untouched — `alex_it_act3` still sets
   * `archive_accessible` for everyone who did not.
   *
   * It is a DOOR, not an elevator: BUILDING_MAP runs the stairwell shaft from
   * floor 2 down to B2, the room's landings descend to Archive level on foot,
   * and ElevatorRide's LINKS table deliberately excludes stairwell>archive.
   * Every line of copy on this path has to stay true to that.
   */
  _openArchiveKeypad() {
    if (this._vaultKeypad) return;
    const early = !this.player.getFlag('act3_complete');
    this.paused = true;
    this._vaultKeypad = new VaultKeypad(
      () => {
        this._vaultKeypad = null;
        this.paused = false;
        this.player.setFlag('archive_accessible', true);
        if (early) this.player.setFlag('archive_cracked_early', true);
        AudioManager.playSfx('door');
        this._showToast('The steel door swings open with the reluctance of something closed for longer than intended.', 'objective');
        setTimeout(() => this._showMonologue(early
          ? "I memorized those numbers off a circuit panel in the supply closet this morning without meaning to. It didn't occur to me at the time that this was the sort of thing a building should try harder to prevent."
          : 'The code worked, which has stopped being surprising. The building has been very agreeable this week.'), 1100);
        this._autoSave();
      },
      () => {
        this._vaultKeypad = null;
        this.paused = false;
      },
      'service',
    );
    this._vaultKeypad.open();
  }

  /**
   * The vault keypad. Accepts the combination at any point in the game,
   * regardless of act or story flag. Entering it correctly proves the player
   * knows all three numbers, so all three code flags are granted along with
   * access — refusing to set them would leave the vault open and its contents
   * unreachable, which is the flag-gate this whole feature exists to remove.
   */
  _openVaultKeypad() {
    if (this._vaultKeypad) return;
    // Cracking it before the Janitor ever hands over the Rolex is the Tunic
    // payoff, and it is the only case that earns the monologue.
    const early = !this.player.getFlag('janitor_rallied');
    this.paused = true;
    this._vaultKeypad = new VaultKeypad(
      () => {
        this._vaultKeypad = null;
        this.paused = false;
        this.player.setFlag('vault_code_1', true);
        this.player.setFlag('vault_code_2', true);
        this.player.setFlag('vault_code_3', true);
        if (early) this.player.setFlag('vault_cracked_early', true);
        // Set last: the flag-set listener toasts on this one, and it should
        // land after the codes so the objective text reads correctly.
        this.player.setFlag('vault_accessible', true);
        AudioManager.playSfx('door');
        setTimeout(() => this._showMonologue(early
          ? "I typed in three numbers I noticed this morning and the vault opened. I would like to file a concern, but I'm not sure with whom."
          : "The vault opened on the first try. In this building, that's usually a sign that something worse is behind it."), 900);
        this._autoSave();
      },
      () => {
        this._vaultKeypad = null;
        this.paused = false;
      },
    );
    this._vaultKeypad.open();
  }

  /**
   * Day-scoped stat boons are Reception-floor only. Suspend them the moment
   * Andrew steps off the floor and reinstate them when he steps back on, so
   * banked Hours can never be carried into a story boss or the Act 5 gauntlet.
   * The day record is not touched — only whether its tempStats are live.
   */
  _syncDayStatScope(roomId) {
    const day = readDay(this.player);
    if (!day) return;
    const changed = roomId === 'reception'
      ? applyDayStats(this.player, day)
      : revokeDayStats(this.player, day);
    if (!changed) return;
    writeDay(this.player, day);
    this._showToast(
      roomId === 'reception' ? DAY_TEXT.ui.boons_resumed : DAY_TEXT.ui.boons_suspended,
      'info',
    );
  }

  async _changeRoom(targetRoom, spawnX, spawnZ) {
    // Room gating — check access before allowing entry
    const gatedRooms = {
      // The reception elevator tile is walkable (elevatorDoors don't
      // block), so standing on it bypassed the elevator dialog's
      // branch_chosen check entirely (logic-sweep MAJOR #10)
      executive_floor: { flag: 'branch_chosen', message: 'The keycard reader blinks red. AUTHORIZED PERSONNEL ONLY.' },
      // NOTE: `archive` is NOT in this table any more. The stairwell service
      // door is a knowledge gate, not a flag gate — see the block below this
      // gate table, which intercepts it before this lookup ever runs.
      hr_department: { flag: 'hr_accessible', message: "The HR Department is locked down. You need authorization." },
      // NOTE: `vault` is NOT in this table either, for the same reason as
      // `archive` — the vault keypad intercept below returns before this
      // lookup runs, so a `vault_accessible` row here could never fire. Both
      // knowledge-gated doors are handled in one place; do not re-add either.
      board_room: { flag: 'board_room_accessible', message: "The Board Room is restricted. Executive access only." },
      penthouse: { flag: 'act6_complete', message: "The staircase to the Penthouse is sealed. You need the Janitor's Rolex." },
      city_street: { flag: 'city_unlocked', message: "The garage door is down. You've never had a reason to open it." },
      // Jules says "staff only" — the door now agrees with her (#22)
      old_vault: { flag: 'delia_moved', message: 'Jules angles between you and the basement door. Staff only.' },
      penthouse_aquarium: { flag: 'renovation_penthouse', message: "The suite wing is unfinished. Fund the renovation first." },
      penthouse_analytics: { flag: 'renovation_penthouse', message: "The suite wing is unfinished. Fund the renovation first." },
      penthouse_bar: { flag: 'renovation_penthouse', message: "The suite wing is unfinished. Fund the renovation first." },
    };

    // Block executive floor while the corporate lawyer is active and undefeated.
    // INTENTIONALLY VESTIGIAL (#27): the trio post-dialog sets both flags in
    // the same frame, so this gate can never engage today. Kept (with the
    // reception lawyer NPC entry and the 'Push through to reception'
    // objective) in case the Act 5 gauntlet is ever re-split into solo fights.
    if (targetRoom === 'executive_floor'
      && this.player.getFlag('restructuring_defeated')
      && !this.player.getFlag('corporate_lawyer_defeated')) {
      this._showToast("The elevator won't open. Someone's waiting for you in the lobby.", 'info');
      return;
    }

    // Act 6½ — the penthouse elevator rejects the uncertified charter.
    // First rejection fires the charter_challenge dialog (Skip's call,
    // the Janitor's tip about Delia) which sets city_unlocked.
    if (targetRoom === 'penthouse'
      && this.player.getFlag('act6_complete')
      && !this.player.getFlag('charter_certified')) {
      this._showToast('The elevator scans the charter. A red light: SEAL NOT RECOGNIZED.', 'info');
      if (!this.player.getFlag('read_charter_challenge') && DIALOGS.charter_challenge) {
        setTimeout(() => {
          const dialogState = new DialogState(DIALOGS.charter_challenge, this.player, this.stateManager, 'charter_challenge');
          this.stateManager.push(dialogState);
        }, 700);
      }
      return;
    }
    // ── THE KNOWLEDGE GATE ────────────────────────────────────────────
    // Every other lock in this building is a flag check. These two ask the
    // player. The combination (47-19-82) is the building service override and
    // it is documented in the world from Act 1 — the circuit panel in the
    // Janitor's supply closet, first room of the game.
    //
    // BOTH doors on the route have to take it, or neither does: the Vault
    // opens only off the Archive, and the Archive is `archive_accessible`,
    // which the story does not set until Act 3. A keypad on the inner door
    // alone was a knowledge gate nested inside a flag gate, i.e. still a flag
    // gate. With the stairwell service door taking the same code, the walk from
    // supply closet to the charter is genuinely open in Act 1.
    //
    // Both story paths are untouched: `alex_it_act3` still sets
    // `archive_accessible` and `janitor_act4` still sets `vault_accessible`.
    if (targetRoom === 'archive' && !this.player.getFlag('archive_accessible')) {
      this._openArchiveKeypad();
      return;
    }
    if (targetRoom === 'vault' && !this.player.getFlag('vault_accessible')) {
      this._openVaultKeypad();
      return;
    }

    const gate = gatedRooms[targetRoom];
    if (gate && !this.player.getFlag(gate.flag)) {
      this._showToast(gate.message, 'info');
      return;
    }

    this.paused = true;
    this.stage.abort();   // rule 6 — nothing keeps walking through the wipe
    AudioManager.playSfx('door');

    const currentRoom = this.player.currentRoom;
    // EVERY elevator in the tower is a real ride: doors close over the
    // screen, the LED ticks the floors it passes, ding, doors part onto the
    // new room. (A2 unification: this used to fire on the garage shaft only
    // — the reception↔executive and floor_13 elevators just crossfaded,
    // which is why two of the three elevators felt like scene changes and
    // one felt like a building. ElevatorRide owns the link table now.)
    const ride = ElevatorRide.isElevatorLink(currentRoom, targetRoom)
      ? ElevatorRide.labelsFor(currentRoom, targetRoom)
      : null;
    const goingDown = targetRoom === 'archive' || (targetRoom === 'vault' && currentRoom === 'archive');
    const goingUp = currentRoom === 'archive' && targetRoom === 'stairwell';

    if (ride) {
      // With the doors shut the building is the only thing left to look at —
      // hold the blueprint shell glowing for the length of the trip.
      Engine.holdBuildingShell(true);
      // The Quiet Floor: late in the story, at night, the elevator stops
      // where it isn't supposed to. This used to be a 20% roll once per
      // session, which meant most players finished the game without ever
      // seeing the best-written scene in it. It is now GUARANTEED on the
      // first qualifying ride (proposal 4), and once Andrew has been there,
      // the car offers him a 13 button — the floor stops being an accident
      // and becomes a place he can choose.
      // Deliberately still limited to the lobby↔garage shaft even though
      // every shaft now rides: the executive elevator is ridden during
      // story-critical beats and a detour there would read as a bug
      // rather than a chill. (Widen this pair list if the producer wants
      // the whole tower to misbehave.)
      const act = this.player.actIndex || 0;
      const quietShaft = (currentRoom === 'parking_garage' && targetRoom === 'reception')
        || (currentRoom === 'reception' && targetRoom === 'parking_garage');
      // `floor_13_sat` is the legacy signal: saves written before the guarantee
      // landed have it set (the old 20% roll) but no `floor_13_found`. Reading
      // both stops a live save being detoured a second time — and being told
      // "I pressed the button this time" when it was the building's idea again.
      const found13 = this.player.getFlag('floor_13_found') || this.player.getFlag('floor_13_sat');
      if (quietShaft && act >= 5 && !found13) {
        const detour = ElevatorRide.labelsFor(currentRoom, 'floor_13');
        await ElevatorRide.close(detour.labels, detour.goingUp);
        this._showToast('The elevator settles between floors. The doors open to a number that wasn\'t pressed.', 'info');
        targetRoom = 'floor_13';
        spawnX = 8; spawnZ = 8;
      } else {
        const res = await ElevatorRide.close(ride.labels, ride.goingUp, {
          offer13: quietShaft && found13,
        });
        if (res?.chose13) {
          this._showToast('The elevator arrives at 13 without comment. For once, it didn\'t have to volunteer.', 'info');
          targetRoom = 'floor_13';
          spawnX = 8; spawnZ = 8;
        }
      }
    } else if (goingDown) {
      await this.transition.wipeDownOut(0.4);
    } else if (goingUp) {
      await this.transition.wipeUpOut(0.4);
    } else {
      await this.transition.fadeOut(0.3);
    }

    Engine.scene.remove(this.player.mesh);
    this.roomManager._clearCurrentRoom();

    const actualRoom = this._resolveRoomId(targetRoom);
    const result = this.roomManager.loadRoom(actualRoom, spawnX, spawnZ, this.player.flags);
    this._applyTimeOfDay(targetRoom);
    if (result) {
      this.tileMap = result.tileMap;
      this.player.setPosition(result.spawnX, result.spawnZ, result.tileMap);
      this.player.currentRoom = targetRoom;
      Engine.scene.add(this.player.mesh);
      this.camera.snapTo(result.spawnX, result.spawnZ, this.player.mesh.position.y);

      const roomData = this.roomManager.getRoomData(actualRoom);
      if (roomData) {
        this._applyCameraBounds(roomData);
      }
      AudioManager.playMusic(this._getMusicForRoom(targetRoom));

      if (targetRoom === 'reception' && !this.player.getFlag('reception_intro_done')) {
        setTimeout(() => {
          const dialogState = new DialogState(DIALOGS['receptionist_intro'], this.player, this.stateManager, 'receptionist_intro');
          this.stateManager.push(dialogState);
        }, 400);
      }
    }

    // Compile the new room's shaders and upload its textures while the wipe is
    // STILL COVERING THE SCREEN. Without this, the first rendered frame of a
    // room the player has not visited pays for every new program at once —
    // measured 307ms on the first `server_room` entry, 16 programs, and that
    // frame lands after the wipe has finished, i.e. mid-play. See
    // Engine.warmScene().
    // (IsometricCamera drives Engine.camera in place — there is no second
    // camera object to pass here.)
    await Engine.warmScene(Engine.scene, Engine.camera);

    if (ride) {
      // Release the hold first: the shell is already fading out of the new
      // room as the doors part, so the ride's glow reads as the arrival
      // pulse rather than snapping off.
      Engine.holdBuildingShell(false);
      await ElevatorRide.open();
    } else if (goingDown) {
      await this.transition.wipeDownIn(0.4);
    } else if (goingUp) {
      await this.transition.wipeUpIn(0.4);
    } else {
      await this.transition.fadeIn(0.3);
    }
    this.paused = false;
    // The Quiet Floor remembers being found. Set after the doors have parted
    // so the flag-set listener can't touch the HUD mid-transition; from here
    // on the car offers a 13 button on the lobby shaft.
    if (this.player.currentRoom === 'floor_13' && !this.player.getFlag('floor_13_found')) {
      this.player.setFlag('floor_13_found', true);
    }
    // FLUSH THE DEFERRED BOARD CLOSE — counterpart to the deferral in
    // `_refreshStoryProgress()`. Same placement rationale as floor_13 above:
    // after the wipe has finished, so the flag-set listener cannot touch the HUD
    // mid-transition. The board_room cast was disposed with the room, so the 18
    // hides this unblocks are off-camera by definition. Ordered before
    // `_autoSave` so the save that follows the walk-out already carries it.
    if (this._boardCloseDeferred && this.player.currentRoom !== 'board_room') {
      this._boardCloseDeferred = false;
      this._refreshStoryProgress(true);
    }
    this._autoSave(false);
  }

  _startCombat(encounterId) {
    this.paused = true;

    // First Karen fight: scripted 3-shot loss — boost ATK so she hits visibly hard
    const isFirstKaren = encounterId === 'karen'
      && !this.player.getFlag('retry_karen')
      && !this.player.getFlag('defeated_karen');
    const enemyOverrides = isFirstKaren ? { atk: 999 } : {};

    // Quarterly-review leverage (logic-sweep MAJOR #11): the review
    // promised your book of business would matter against Meredith.
    // Strong portfolio blunts her case; a weak one is her exhibit A.
    if (encounterId === 'meredith_boss' && ENEMY_STATS.meredith_boss) {
      const base = ENEMY_STATS.meredith_boss;
      if (this.player.getFlag('portfolio_strong')) {
        enemyOverrides.atk = Math.max(1, Math.round(base.atk * 0.85));
        enemyOverrides.def = Math.max(1, Math.round(base.def * 0.85));
      } else if (this.player.getFlag('portfolio_weak')) {
        enemyOverrides.atk = Math.round(base.atk * 1.1);
      }
    }

    // Grandma's cookies debuff: -5 ATK, -2 DEF for this fight only
    const cookieDebuff = encounterId === 'grandma' && this.player.getFlag('took_grandma_cookie');
    let savedAtk, savedDef;
    if (cookieDebuff) {
      savedAtk = this.player.stats.atk;
      savedDef = this.player.stats.def;
      this.player.stats.atk = Math.max(1, this.player.stats.atk - 5);
      this.player.stats.def = Math.max(1, this.player.stats.def - 2);
    }

    // MESHY CAST WARM-UP. Nothing is fetched at boot; exactly the GLBs this
    // encounter needs are pulled here so the network cost hides inside the
    // fade-out that is already on screen. Cached across fights for the rest of
    // the session, so a repeat opponent costs nothing. Failures resolve to null
    // and that character alone falls back to the procedural build — the fade
    // never waits on a broken asset, and it never waits longer than the fade
    // plus a hard 2.5s ceiling.
    const meshyWarm = MESHY_MODE
      ? Promise.race([
        import('../combat/MeshyCast.js')
          .then(m => m.preload(CombatState.castIds(encounterId, this.player).all))
          .catch(() => null),
        new Promise(r => setTimeout(r, 2500)),
      ])
      : Promise.resolve();

    Promise.all([this.transition.fadeOut(0.3), meshyWarm]).then(() => {
      const combatState = new CombatState(
        this.stateManager,
        this.player,
        encounterId,
        (result, perf) => {
          // Restore cookie debuff stats
          if (cookieDebuff) {
            this.player.stats.atk = savedAtk;
            this.player.stats.def = savedDef;
          }

          this.transition.remove();
          this.transition.fadeIn(0.3).then(() => {
            this.paused = false;
          });

          // First Karen fight always ends in defeat — scripted tutorial loss
          if (isFirstKaren) {
            this.player.setFlag('retry_karen', true);
            this.player.rest();
            this._loadRoom('cubicle_farm');
            setTimeout(() => {
              if (DIALOGS['karen_first_loss_tutorial']) {
                const tutDialog = new DialogState(DIALOGS['karen_first_loss_tutorial'], this.player, this.stateManager, 'karen_first_loss_tutorial');
                this.stateManager.push(tutDialog);
              }
            }, 1200);
            return;
          }

          if (result === 'victory') {
            this.player.setFlag('bestiary_' + encounterId, true);
            AchievementManager.check(this.player, { event: 'combat_victory', encounterId });

            if (encounterId === 'reception_client') {
              this._updateMiniStats();

              // Billable Day: bill the meeting before the review screen opens
              // so the review can show what the hour was worth.
              const activeDay = readDay(this.player);
              if (activeDay) {
                const earned = this._awardDayHours(activeDay, perf);
                this._showToast(`+${earned} Billable Hours`, 'item');
              }

              // Tutorial: track wins toward level 3 after first Karen loss
              if (this.player.getFlag('retry_karen') && !this.player.getFlag('defeated_karen')) {
                const wins = (this.player.getFlag('roguelite_tutorial_wins') || 0) + 1;
                this.player.setFlag('roguelite_tutorial_wins', wins);
                if (wins >= 3 && this.player.stats.level < 3) {
                  const xpNeeded = XP_TABLE[2] - this.player.stats.xp;
                  if (xpNeeded > 0) this.player.gainXP(xpNeeded);
                  this._updateMiniStats();
                  this.player.setFlag('karen_retry_ready', true);
                  this._showToast('3 clients handled — Level 3 reached! Head to the conference room — Karen\'s waiting.', 'objective');
                } else if (wins >= 3) {
                  this.player.setFlag('karen_retry_ready', true);
                  this._showToast("3 clients handled — Karen's in the conference room. Go get her.", 'objective');
                } else {
                  this._showToast(`Client ${wins}/3 handled — keep building experience!`, 'objective');
                }
              }

              const clientRaw = this.player.getFlag('currentClient');
              if (clientRaw) {
                let clientData;
                try { clientData = JSON.parse(clientRaw); } catch { clientData = null; }
                if (!clientData) {
                  this.player.setFlag('currentClient', null);
                  this._autoSave(false);
                  // A corrupt client still counts as a slot served, otherwise
                  // the day can never reach its own end.
                  if (activeDay) {
                    activeDay.served += 1;
                    writeDay(this.player, activeDay);
                  }
                  this._afterClientResolved();
                  return;
                }
                setTimeout(() => {
                  const reviewState = new ClientReviewState(
                    this.stateManager,
                    this.player,
                    clientData,
                    (accepted, opts) => this._onClientDecision(accepted, clientData, opts)
                  );
                  this.stateManager.push(reviewState);
                }, 500);
              }
              return;
            }

            this.player.setFlag(`defeated_${encounterId}`);
            const encounter = ENCOUNTERS[encounterId];
            // Safety net: also set <enemyId>_defeated for story bosses
            // so progression doesn't depend solely on post-dialog set_flag
            const storyBossFlags = { karen: 'karen_defeated', chad: 'chad_defeated', grandma: 'grandma_defeated' };
            if (encounter && storyBossFlags[encounter.enemyId]) {
              this.player.setFlag(storyBossFlags[encounter.enemyId], true);
            }
            EventBus.emit('combat-won', encounterId);
            this._updateMiniStats();
            this._autoSave(true);

            if (encounter && encounter.postDialogId && DIALOGS[encounter.postDialogId]) {
              setTimeout(() => {
                const postDialog = new DialogState(DIALOGS[encounter.postDialogId], this.player, this.stateManager, encounter.postDialogId);
                this.stateManager.push(postDialog);
              }, 500);
            }
          } else if (result === 'defeat') {
            this.player.setFlag('retry_' + encounterId, true);
            this._handleDefeat(encounterId);
          }
        },
        enemyOverrides
      );
      this.stateManager.push(combatState);
      this.transition.remove();
    });
  }

  // BOOKKEEPING, explicitly. "Game saved." is the single most-fired
  // notification in the game (every room transition, every story victory) and
  // the audit caught it sitting on top of the post-fight dialog for 6151 ms —
  // the game interrupting its own writing to report on its filesystem. As
  // BOOKKEEPING it gets the smallest, dimmest surface and it is structurally
  // incapable of being co-visible with a character's line.
  _autoSave(showToast = true) {
    SaveManager.save(this.player.serialize());
    if (showToast) this._showToast('Game saved.', 'info', undefined, { cls: NC.BOOKKEEPING, key: 'Saved' });
  }

  _handleDefeat(encounterId = null) {
    // Void an in-progress Billable Day before the generic client reset, so the
    // day's temporary boons are reversed exactly once and the escrowed AUM is
    // forfeited. Permanent progress is untouched.
    this._abandonDay('defeat');
    this.player.rest();
    this._resetClientSystem();
    // Reset ending gate so boss fights can be retried
    this.player.setFlag('ending_started', false);

    // Reset whichever gauntlet fight-started flag is in progress but not yet won,
    // so the fight retriggers after the player respawns.
    const gauntletFlags = [
      { started: 'restructuring_trio_started',      defeated: 'restructuring_trio_defeated' },
      { started: 'brand_consultant_fight_started',  defeated: 'brand_consultant_defeated' },
      { started: 'restructuring_fight_started',     defeated: 'restructuring_defeated' },
      { started: 'data_lead_fight_started',         defeated: 'data_lead_defeated' },
      { started: 'chief_fight_started',             defeated: 'chief_restructuring_defeated' },
      { started: 'meredith_fight_started',            defeated: 'act5_complete' },
    ];
    for (const { started, defeated } of gauntletFlags) {
      if (this.player.getFlag(started) && !this.player.getFlag(defeated)) {
        this.player.setFlag(started, false);
      }
    }

    this._loadRoom('cubicle_farm');
    this._autoSave(false);

    const DEATH_MESSAGES = [
      'You wake up at your desk... Was it all a dream?',
      'You come to face-down on your keyboard. There are 47 new emails.',
      'You regain consciousness. The fluorescent light above you flickers in what feels like judgment.',
      'You wake up. Someone has placed a sticky note on your forehead that says "DO NOT DISTURB." Nobody moved it.',
      'You open your eyes at your desk. A coworker walks past without making eye contact. Normal Tuesday.',
      'You wake up. Your coffee is cold. It was cold before, too.',
      'You stir at your desk. The clock says 3:47 PM. It always says 3:47 PM.',
      'Consciousness returns. You have 2 unread voicemails and a distinct sense of failure.',
      'You wake up at your cubicle. Someone has printed a motivational poster and taped it to your monitor. It says HANG IN THERE.',
      'You open your eyes. The building hums. It sounds almost sympathetic.',
    ];
    // THE FIFTEENTH EMITTER — the one the audit did not inventory, and the one
    // it MISDIAGNOSED. Its §5 blames "combat-message 'You wake up at your
    // desk...' at 100 % overlap with the exploration dialog-speaker 'Rachel'
    // for 1574 ms, in 3 separate runs" on an orphaned CombatState setTimeout.
    // It is not that. It is this: an EXPLORATION-side emitter that hand-built a
    // `.combat-message` at z-index 200 straight onto #ui-overlay on a flat
    // 3000 ms. The combat timer leak was real and is fixed; this was a second,
    // independent cause of the same frame.
    //
    // It is also prose — a written wake-up line — so it goes where prose goes.
    // If the player has already started a conversation, the conversation wins
    // and this waits its turn instead of printing through the speaker tag.
    NotificationArbiter.monologue(
      DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)]
    );

    this._offerPIP(encounterId);
  }

  /**
   * PIP discoverability. The Performance Improvement Plan is this game's God
   * Mode — free, opt-in, 20% resistance rising 2% per recorded defeat to a cap
   * of 80%, locking out nothing (see src/data/review.js). It lifts CASUAL play
   * over the 40% floor on every story boss (Karen L3: 16.8% -> 62.7%; Grandma
   * L7: 5.8% -> 40.8%, per `node tools/combat-sim.mjs --pip`). None of which
   * matters if the player never opens the shop tab it lives in.
   *
   * Hades' rule is that the aid finds the player, not the reverse. So the
   * building files the form AT you: once per story boss, never on the roguelite
   * loop, and never once the plan is already on file.
   */
  _offerPIP(encounterId) {
    if (!encounterId || encounterId === 'reception_client') return;
    if (this.player.getFlag('rp_pip')) return;          // already found it
    const seen = `pip_notice_${encounterId}`;
    if (this.player.getFlag(seen)) return;              // once per boss
    this.player.setFlag(seen, true);

    // Fires after the wake-up message has had its beat, so the two do not read
    // as one paragraph. Longer dwell than the default — it is a filing address,
    // not a status ping.
    setTimeout(() => {
      this._showToast(
        "Per policy, a Performance Improvement Plan has been placed in the Break Room's Performance Review tab. Participation is voluntary.",
        'objective',
        6000
      );
    }, 3200);
  }

  // ── Reception roguelite system ──────────────────────────────────────────────

  _onReceptionEntered() {
    // Allow clients after first Karen fight (tutorial phase) or after defeating Karen
    const tutorialPhase = this.player.getFlag('retry_karen') && !this.player.getFlag('defeated_karen');
    if (!this.player.getFlag('defeated_karen') && !tutorialPhase) return;

    // Reminder toast during tutorial phase
    if (tutorialPhase) {
      const wins = this.player.getFlag('roguelite_tutorial_wins') || 0;
      if (wins < 3) {
        setTimeout(() => this._showToast(`Level up by handling clients (${wins}/3) — then retry Karen.`, 'objective'), 800);
      }
    }

    const postGame = !!this.player.getFlag('algorithm_defeated');

    // ── Billable Day: resume an interrupted day ─────────────────────────────
    // Leaving the floor mid-day does NOT void the board — the day record lives
    // in a player flag and therefore survives a save/reload. Only a defeat or
    // an explicit walk-off voids the billing (see _abandonDay).
    const day = readDay(this.player);
    if (day) {
      // Defensive: a board that is already full has nothing left to serve.
      // Close it rather than booking a sixth client onto a five-client day.
      if (day.served >= day.total) { this._closeDay(); return; }
      const existingRaw = this.player.getFlag('currentClient');
      let dayClient = null;
      if (existingRaw) { try { dayClient = JSON.parse(existingRaw); } catch { dayClient = null; } }
      if (!dayClient) {
        dayClient = this._makeDayClient(day, day.index);
        this.player.setFlag('currentClient', JSON.stringify(dayClient));
      }
      this._applyClientToGameData(dayClient);
      this._updateDayChip();
      const left = Math.max(0, day.total - day.served);
      setTimeout(() => this._showToast(
        `Diane: "${DAY_TEXT.diane.day_resume.replace('{left}', left)}"`, 'objective',
      ), 600);
      this._announceMutators(dayClient);
      return;
    }
    this._updateDayChip();

    // One-time unlock toast on first post-game reception entry
    if (postGame && !this.player.getFlag('postGameReceptionUnlocked')) {
      this.player.setFlag('postGameReceptionUnlocked', true);
      setTimeout(() => this._showToast(
        'Diane: "Word got out. The clients you\'re seeing now are in a different league entirely."',
        'info'
      ), 400);
    }

    const existing = this.player.getFlag('currentClient');
    let client = null;
    if (existing) {
      try { client = JSON.parse(existing); } catch { client = null; }
      // Discard a cached pre-game client if we're now in post-game
      if (client && postGame && !client.isPostGame) client = null;
    }
    if (client) {
      this._applyClientToGameData(client);
      setTimeout(() => this._showToast(`${client.name} is waiting for you.`, 'objective'), 600);
    } else {
      // A queued beneficiary chain outranks a fresh walk-in: the family has to
      // arrive in order even if the player left reception between members,
      // otherwise the queue is silently orphaned.
      const queue = this.player.getFlag('chainQueue');
      const chainPending = Array.isArray(queue) && queue.length > 0;
      let intro;
      if (chainPending) {
        client = this._getNextClient();
        intro = `${client.name} is waiting for you.`;
      } else {
        // Whale referral: a signed whale sent a friend (guaranteed whale-tier)
        const referral = !postGame && this.player.getFlag('whale_referral_pending');
        if (referral) this.player.setFlag('whale_referral_pending', false);
        client = generateClient(null, this.player.stats.level, postGame, !!referral);
        intro = referral ? `The referral came through: ${client.name}` : `New client waiting: ${client.name}`;
      }
      this.player.setFlag('currentClient', JSON.stringify(client));
      this._applyClientToGameData(client);
      setTimeout(() => this._showToast(intro, 'objective'), 600);
    }

    // Surface combat mutators before the fight
    this._announceMutators(client);

    // The Billable Day is the featured way to work reception; the walk-in loop
    // stays available for the tutorial and for casual play. Diane makes the
    // offer, and the reception desk opens the roster.
    setTimeout(() => this._showToast(`Diane: "${DAY_TEXT.diane.day_offer}"`, 'info'), 2400);
  }

  _announceMutators(client) {
    if (!client?.mutators?.length) return;
    const labels = client.mutators.map(m => `${m.label} — ${m.desc}`).join('  ·  ');
    setTimeout(() => this._showToast(`⚠ ${labels}`, 'info'), 1500);
  }

  _applyClientToGameData(client) {
    // Mutate the singleton objects so CombatEngine and CombatScene pick up the generated stats
    Object.assign(ENEMY_STATS.reception_client, {
      ...client.enemyStats,
    });
    const visualBase = client.visualConfig || CHARACTER_CONFIGS[client.visualId] || {};
    Object.assign(CHARACTER_CONFIGS.reception_client, {
      ...visualBase,
      name: client.name,
    });
    this._refreshClientNpc();
  }

  _refreshClientNpc() {
    const npc = this.roomManager.entityManager.getNPC('reception_client');
    if (npc) npc.rebuild(CHARACTER_CONFIGS.reception_client);
  }

  _receptionUnlocked() {
    const tutorialPhase = this.player.getFlag('retry_karen') && !this.player.getFlag('defeated_karen');
    return !!this.player.getFlag('defeated_karen') || !!tutorialPhase;
  }

  // Meeting the client sitting in the waiting area — the fight itself.
  // This is the old reception-desk behaviour and is what the client NPC does.
  _meetCurrentClient() {
    if (!this._receptionUnlocked()) {
      this._showToast('You need to handle the Henderson meetings first.', 'info');
      return;
    }
    const clientRaw = this.player.getFlag('currentClient');
    if (!clientRaw) {
      this._onReceptionEntered();
      return;
    }
    AudioManager.playSfx('confirm');
    this._startCombat('reception_client');
  }

  // The reception desk itself now opens the Daily Roster: start a Billable Day,
  // take a single walk-in (the original loop, preserved), or return to / walk
  // off an in-progress board.
  _handleReceptionDesk() {
    if (!this._receptionUnlocked()) {
      this._showToast('You need to handle the Henderson meetings first.', 'info');
      return;
    }
    AudioManager.playSfx('confirm');
    const day = readDay(this.player);
    // Diane says the quiet part before the escrow is staked, not after. A solo
    // day was landing well under the fairness band and the only place that was
    // written down was Gameplay.md.
    const solo = !day && this._partySize() === 0;
    this.stateManager.push(new DayState(this.stateManager, this.player, {
      mode: 'board',
      day,
      dianeLine: day
        ? DAY_TEXT.diane.day_resume.replace('{left}', Math.max(0, day.total - day.served))
        : DAY_TEXT.diane.day_offer,
      dianeWarning: solo ? DAY_TEXT.diane.solo_warning : '',
      onResult: (action) => this._onBoardResult(action),
    }));
  }

  _onBoardResult(action) {
    if (action === 'start_day') { this._startDay(); return; }
    if (action === 'walk_in') {
      this._showToast(`Diane: "${DAY_TEXT.diane.walk_in}"`, 'info');
      if (!this.player.getFlag('currentClient')) this._onReceptionEntered();
      return;
    }
    if (action === 'abandon') { this._abandonDay('abandon'); return; }
    // 'resume' and 'cancel' both just return control to the floor.
  }

  // ── The Billable Day ────────────────────────────────────────────────────
  // Run structure for reception, per .claude/plans/research-gameplay-comps.md
  // P2.1 (Hades currency-scope split). Billable Hours are run-scoped and die
  // at 5:15; AUM is meta-scoped but held in escrow until the day closes.

  _partySize() { return Math.min(2, (this.player.party || []).length); }

  _startDay() {
    const total = rollDayLength(this._partySize());
    const dayNumber = (this.player.getFlag('daysWorked') || 0) + 1;
    const day = newDay(dayNumber, total, this.player, this._partySize());
    writeDay(this.player, day);

    const client = this._makeDayClient(day, 0);
    this.player.setFlag('currentClient', JSON.stringify(client));
    this._applyClientToGameData(client);
    this._updateDayChip();
    this._autoSave(false);

    this._showToast(`Diane: "${DAY_TEXT.diane.day_start.replace('{n}', total)}"`, 'objective');
    this._announceMutators(client);
  }

  /**
   * Build the client for a given slot. Beneficiary chains are a walk-in
   * feature and are deliberately not started inside a day — a queued chain
   * waits and resumes once the board is clear, so the escalation curve stays
   * legible. Whale referrals still honour their flag.
   */
  _makeDayClient(day, index) {
    const postGame = !!this.player.getFlag('algorithm_defeated');
    const referral = !postGame && !!this.player.getFlag('whale_referral_pending');
    if (referral) this.player.setFlag('whale_referral_pending', false);
    return generateDayClient({
      index,
      total: day.total,
      playerLevel: this.player.stats.level,
      postGame,
      forceWhale: referral,
      // The board is priced against who is actually walking in with him.
      // Read from the day record so a mid-day recruit cannot retune the
      // clients Andrew has already been quoted.
      partySize: Number.isFinite(day.partySize) ? day.partySize : this._partySize(),
    });
  }

  /** Award Billable Hours for a cleared day client. `perf` comes from CombatState. */
  _awardDayHours(day, perf) {
    const { hours, parts } = computeHours(perf || {}, day.index);
    day.hours += hours;
    day.hoursEarned += hours;
    day.lastHours = hours;
    day.lastHoursParts = parts;
    writeDay(this.player, day);
    this._updateDayChip();
    return hours;
  }

  /**
   * Called after a reception client has been accepted or declined.
   * Routes to the day flow when a board is running, otherwise to the original
   * single-client loop.
   */
  _afterClientResolved() {
    const day = readDay(this.player);
    if (!day) { this._scheduleNextClient(); return; }

    if (day.served >= day.total) { this._closeDay(); return; }

    day.index = day.served;
    const nextClient = this._makeDayClient(day, day.index);
    this.player.setFlag('currentClient', JSON.stringify(nextClient));
    this._applyClientToGameData(nextClient);
    writeDay(this.player, day);
    this._updateDayChip();
    this._autoSave(false);

    const left = Math.max(0, day.total - day.served);
    const dianeLine = nextClient.isClosing
      ? DAY_TEXT.diane.day_final_client
      : DAY_TEXT.diane.day_midway.replace('{left}', left);

    setTimeout(() => {
      this.stateManager.push(new DayState(this.stateManager, this.player, {
        mode: 'between',
        day,
        nextClient,
        dianeLine,
        onReroll: () => {
          const fresh = this._makeDayClient(day, day.index);
          this.player.setFlag('currentClient', JSON.stringify(fresh));
          this._applyClientToGameData(fresh);
          return fresh;
        },
        onResult: () => {
          // Boons may have changed stats; keep the HUD honest.
          this._updateMiniStats();
          this._updateDayChip();
          const c = this.player.getFlag('currentClient');
          if (c) {
            try { this._announceMutators(JSON.parse(c)); } catch { /* ignore */ }
          }
          this._autoSave(false);
        },
      }));
    }, 700);
  }

  /** 5:15. Bank the escrow, retire the day, show the summary. */
  _closeDay() {
    const day = readDay(this.player);
    if (!day) return;

    revertDayStats(this.player, day);
    // The closing premium. Escrow used to bank at face value, which made the
    // staked mode pay LESS per fight than walk-in spam once the ~50% solo
    // forfeit rate and the 20% victory heal were priced in — a risky mode with
    // a negative risk premium (measured: tools/day-sim.mjs). The bell now pays
    // for closing the day, for signing the whole board, and for the share of
    // Billable Hours left unspent.
    const escrow = Math.max(0, Math.round(day.aumPending || 0));
    const premium = closingPremiumParts(day);
    const aumBanked = Math.round(escrow * premium.multiplier);
    this.player.stats.aum = (this.player.stats.aum || 0) + aumBanked;
    const xpGained = Math.max(0, (this.player.stats.xp || 0) - (day.xpStart || 0));

    // The bell is when the day's clients go on the books — the same moment the
    // fee banks. Before this, a forfeited day voided the money but kept the
    // signed clients and the personal bests they minted.
    if (day.pendingClients) {
      this.player.setFlag('portfolioClients', (this.player.getFlag('portfolioClients') || 0) + day.pendingClients);
      this.player.setFlag('portfolioAUM',     (this.player.getFlag('portfolioAUM')     || 0) + (day.pendingAUM  || 0));
      this.player.setFlag('portfolioFees',    (this.player.getFlag('portfolioFees')    || 0) + (day.pendingFees || 0));
      this._updatePortfolioDisplay();
    }
    if ((day.pbRichest || 0) > (this.player.getFlag('pb_richest_client') || 0)) {
      this.player.setFlag('pb_richest_client', day.pbRichest);
    }
    if ((day.pbBestAum || 0) > (this.player.getFlag('pb_best_aum_single') || 0)) {
      this.player.setFlag('pb_best_aum_single', day.pbBestAum);
    }

    this.player.setFlag('daysWorked', (this.player.getFlag('daysWorked') || 0) + 1);

    // Personal bests — the day is its own scoreboard alongside the per-client
    // pb_ flags that already exist.
    const pbHits = [];
    if (aumBanked > (this.player.getFlag('pb_best_day_aum') || 0)) {
      this.player.setFlag('pb_best_day_aum', aumBanked);
      pbHits.push(`Best day banked: $${aumBanked.toLocaleString()}`);
    }
    if (day.served > (this.player.getFlag('pb_longest_day') || 0)) {
      this.player.setFlag('pb_longest_day', day.served);
      pbHits.push(`Longest day: ${day.served} clients`);
    }
    if (day.hoursEarned > (this.player.getFlag('pb_best_day_hours') || 0)) {
      this.player.setFlag('pb_best_day_hours', day.hoursEarned);
      pbHits.push(`Most hours billed: ${day.hoursEarned}`);
    }
    const perfect = day.total > 0 && day.signed >= day.total;
    if (perfect) this.player.setFlag('pb_perfect_day', true);

    const closed = { ...day };
    clearDay(this.player);
    this.player.setFlag('currentClient', null);
    this._updateMiniStats();
    this._updateDayChip();
    this._autoSave(false);
    AchievementManager.check(this.player, {
      event: 'day_closed',
      aum: aumBanked,
      clients: closed.served,
      signed: closed.signed || 0,
      total: closed.total || 0,
      perfect,
    });

    let dianeLine = (perfect ? DAY_TEXT.diane.bell_perfect : DAY_TEXT.diane.bell)
      .replace('{aum}', `$${aumBanked.toLocaleString()}`);
    // One-time teach: the premium is a table row unless someone says out loud
    // that the whole day pays better than the pieces.
    if (premium.multiplier > 1 && !this.player.getFlag('day_premium_explained')) {
      this.player.setFlag('day_premium_explained', true);
      dianeLine += ` ${DAY_TEXT.diane.premium}`;
    }

    setTimeout(() => {
      this.stateManager.push(new DayState(this.stateManager, this.player, {
        mode: 'summary',
        day: closed,
        dianeLine,
        summary: { aumBanked, xpGained, pbHits, escrow, premium },
        // The bell is where the day's signed clients actually join the book,
        // so it is also where the review has to be able to fire — checking
        // only on a client decision left day players permanently short.
        onResult: () => { if (!this._maybeQuarterlyReview()) this._scheduleNextClient(); },
      }));
    }, 700);
  }

  /**
   * Void the day. Called on a mid-day defeat and on an explicit walk-off.
   * Permanent progress (XP, achievements, unlocks, day-length records) is
   * untouched. What goes is everything the day had in escrow: the AUM, the
   * temporary boons, AND — since this pass — the signed clients and the
   * per-client personal bests, which used to survive a forfeit and leave a
   * record minted from revenue that never banked.
   */
  _abandonDay(reason = 'abandon') {
    const day = readDay(this.player);
    if (!day) return;
    revertDayStats(this.player, day);
    clearDay(this.player);
    this.player.setFlag('currentClient', null);
    this._updateMiniStats();
    this._updateDayChip();
    const line = reason === 'defeat' ? DAY_TEXT.diane.day_forfeit : DAY_TEXT.diane.day_abandon;
    setTimeout(() => this._showToast(`Diane: "${line}"`, 'objective'), reason === 'defeat' ? 3200 : 400);
  }

  _onClientDecision(accepted, clientData, opts = {}) {
    // Track chain state if this client is part of a beneficiary chain
    this._updateChainState(clientData, accepted);

    // Billable Day bookkeeping. The day counts every client Andrew actually
    // sat down with, signed or not.
    const day = readDay(this.player);
    if (day) {
      day.served += 1;
      if (accepted) day.signed += 1; else day.declined += 1;
      writeDay(this.player, day);
    }

    // Every client actually reviewed — accepted OR declined. This is the counter
    // the beneficiary-chain gate in _getNextClient() reads; it was never written
    // before, so the whole authored family-chain feature was dead code.
    // (portfolioClients counts ACCEPTED clients only and drives achievements +
    // the quarterly review, so it can't double as "seen".)
    this.player.setFlag('totalClientsSeen', (this.player.getFlag('totalClientsSeen') || 0) + 1);

    if (accepted) {
      this._applyClientAcceptBuff(clientData);
      // Failed negotiation: the client complained upstairs
      const negotiationAnger = opts.negotiated && !opts.success ? 1 : 0;
      const anger = Math.min(10, Math.max(0, (this.player.getFlag('bossAnger') || 0) + clientData.netAngerDelta + negotiationAnger));
      this.player.setFlag('bossAnger', anger);

      // Book of business. Inside a day this rides in escrow with the fee: a
      // forfeited day used to void the money and keep the signed client, the
      // portfolio AUM and the personal best it minted — a record built out of
      // revenue that never banked. One rule now: nothing from an unclosed day
      // is on the books.
      if (day) {
        day.pendingClients = (day.pendingClients || 0) + 1;
        day.pendingAUM     = (day.pendingAUM     || 0) + clientData.assets;
        day.pendingFees    = (day.pendingFees    || 0) + clientData.annualFees;
      } else {
        this.player.setFlag('portfolioClients', (this.player.getFlag('portfolioClients') || 0) + 1);
        this.player.setFlag('portfolioAUM',     (this.player.getFlag('portfolioAUM')     || 0) + clientData.assets);
        this.player.setFlag('portfolioFees',    (this.player.getFlag('portfolioFees')    || 0) + clientData.annualFees);
        this._updatePortfolioDisplay();
      }

      // Award AUM currency (player's spending money) — 1% of assets, minimum 50.
      // Negotiation gamble: 1.5x on success, 0.75x on failure.
      let aumEarned = Math.max(50, Math.floor(clientData.assets * 0.01));
      if (opts.negotiated) aumEarned = Math.floor(aumEarned * (opts.success ? 1.5 : 0.75));
      if (day) {
        // Escrow: inside a day the fee is not banked until the 5:15 bell, and
        // is voided outright by a defeat or a walk-off (report P2.1).
        day.aumPending = (day.aumPending || 0) + aumEarned;
        if (aumEarned > (day.bestAum || 0)) day.bestAum = aumEarned;
        writeDay(this.player, day);
        this._updateDayChip();
      } else {
        this.player.stats.aum = (this.player.stats.aum || 0) + aumEarned;
      }
      this._updateMiniStats();
      AchievementManager.check(this.player, { event: 'client_accepted', assets: clientData.assets, attributes: clientData.attributes });

      // Personal bests (shown in the Stats tab). Escrowed alongside the fee for
      // the same reason — see the portfolio block above.
      if (day) {
        day.pbRichest = Math.max(day.pbRichest || 0, clientData.assets);
        day.pbBestAum = Math.max(day.pbBestAum || 0, aumEarned);
      } else {
        if (clientData.assets > (this.player.getFlag('pb_richest_client') || 0)) {
          this.player.setFlag('pb_richest_client', clientData.assets);
        }
        if (aumEarned > (this.player.getFlag('pb_best_aum_single') || 0)) {
          this.player.setFlag('pb_best_aum_single', aumEarned);
        }
      }
      if (day) writeDay(this.player, day);
      const streak = (this.player.getFlag('pb_accept_streak_cur') || 0) + 1;
      this.player.setFlag('pb_accept_streak_cur', streak);
      if (streak > (this.player.getFlag('pb_accept_streak') || 0)) {
        this.player.setFlag('pb_accept_streak', streak);
      }

      // A signed whale refers a friend — next client is guaranteed whale-tier
      if (clientData.isWhale && !this.player.getFlag('whale_referral_pending')) {
        this.player.setFlag('whale_referral_pending', true);
        setTimeout(() => this._showToast(
          'Diane: "They\'re already on the phone raving about you. Expect a referral."', 'info'
        ), 2200);
      }

      const escrowNote = day ? ' (held until 5:15)' : '';
      if (opts.negotiated && opts.success) {
        this._showToast(`Negotiated premium fees! ${clientData.name} onboarded at +${aumEarned.toLocaleString()} AUM${escrowNote}.`, 'item');
      } else if (opts.negotiated) {
        this._showToast(`They haggled you down. +${aumEarned.toLocaleString()} AUM${escrowNote} — and the boss heard about it.`, 'info');
      } else {
        this._showToast(`${clientData.name} onboarded! +${aumEarned.toLocaleString()} AUM earned${escrowNote}.`, 'item');
      }
      this._checkBossAnger();
    } else {
      // Declining bad clients reduces anger slightly; declining good ones has no benefit
      const declineDelta = clientData.netAngerDelta > 0 ? -1 : 1;
      const anger = Math.min(10, Math.max(0, (this.player.getFlag('bossAnger') || 0) + declineDelta));
      this.player.setFlag('bossAnger', anger);
      this.player.setFlag('pb_accept_streak_cur', 0);
      AchievementManager.check(this.player, { event: 'client_declined' });
      this._showToast(`Client declined.`, 'info');
    }

    this.player.setFlag('currentClient', null);
    this._autoSave(false);

    // Quarterly review every 5 accepted clients
    if (this._maybeQuarterlyReview()) return; // it continues the loop when dismissed

    // Day board or the original single-client loop
    this._afterClientResolved();
  }

  _scheduleNextClient() {
    setTimeout(() => {
      if (this.player.currentRoom === 'reception') {
        const next = this._getNextClient();
        this.player.setFlag('currentClient', JSON.stringify(next));
        this._applyClientToGameData(next);
        this._showToast(`Next client: ${next.name}`, 'objective');
      }
    }, 1600);
  }

  _getNextClient() {
    // Check if there's a pending chain member
    const chainQueue = this.player.getFlag('chainQueue');
    if (chainQueue && Array.isArray(chainQueue) && chainQueue.length > 0) {
      const nextChainMember = chainQueue.shift();
      this.player.setFlag('chainQueue', chainQueue);

      // Apply chain modifiers based on how previous family members were handled
      const chainState = this.player.getFlag(`chain_${nextChainMember.chainId}`) || { acceptedCount: 0, rejectedCount: 0 };
      applyChainModifiers(nextChainMember, { ...chainState, lastName: nextChainMember.lastName });

      this._showToast(`Another ${nextChainMember.lastName} family member approaches...`, 'info');
      return nextChainMember;
    }

    // 20% chance to generate a beneficiary chain (starts at client #4+).
    // totalClientsSeen is incremented in _onClientDecision for every reviewed
    // client (accepted or declined) — before that write existed this branch was
    // unreachable and the whole family-chain feature never fired.
    const totalSeen = this.player.getFlag('totalClientsSeen') || 0;
    if (totalSeen >= 4 && Math.random() < 0.2) {
      const chain = generateBeneficiaryChain(this.player.stats.level);
      this.player.setFlag(`chain_${chain.id}`, { acceptedCount: 0, rejectedCount: 0 });
      // Queue the followers, return the lead
      const [lead, ...followers] = chain.members;
      this.player.setFlag('chainQueue', followers);
      this._showToast(`The ${chain.lastName} family wants your services...`, 'info');
      return lead;
    }

    const postGame = !!this.player.getFlag('algorithm_defeated');
    return generateClient(null, this.player.stats.level, postGame);
  }

  _updateChainState(clientData, accepted) {
    if (!clientData.chainId) return;
    const key = `chain_${clientData.chainId}`;
    const state = this.player.getFlag(key) || { acceptedCount: 0, rejectedCount: 0 };
    if (accepted) state.acceptedCount++;
    else state.rejectedCount++;
    this.player.setFlag(key, state);
  }

  /**
   * Fire a quarterly review if the book of business has grown by five clients
   * since the last one. Returns true if a review was scheduled.
   *
   * This used to be an exact `portfolioClients % 5 === 0` test evaluated only
   * on a single client decision. Inside a Billable Day the book does not grow
   * one at a time — every signed client rides in escrow and the whole lot is
   * added in one lump at the 5:15 bell (see _closeDay). A lump of +3 then +5
   * walks 3 -> 8 -> 13 and never once lands on a multiple of five, so a player
   * who mostly works days could go the entire game without a second review.
   * A high-water mark cannot be jumped over.
   */
  _maybeQuarterlyReview() {
    const count = this.player.getFlag('portfolioClients') || 0;
    if (count < 5) return false;
    // Legacy saves have no high-water mark. Seed it from the current book so
    // an existing player is not handed a free review the moment they load.
    if (!('lastQuarterlyReviewAt' in this.player.flags)) {
      this.player.setFlag('lastQuarterlyReviewAt', Math.floor(count / 5) * 5);
      return false;
    }
    const last = this.player.getFlag('lastQuarterlyReviewAt') || 0;
    if (count < last + 5) return false;
    this.player.setFlag('lastQuarterlyReviewAt', Math.floor(count / 5) * 5);
    setTimeout(() => this._showQuarterlyReview(), 800);
    return true;
  }

  _showQuarterlyReview() {
    const clients = this.player.getFlag('portfolioClients') || 0;
    const aum     = this.player.getFlag('portfolioAUM')     || 0;
    const fees    = this.player.getFlag('portfolioFees')    || 0;
    const health  = calculatePortfolioHealth(clients, aum, fees);
    const quarter = Math.ceil(clients / 5);

    const fmt = (n) => '$' + n.toLocaleString();

    const overlay = document.getElementById('ui-overlay');
    const el = document.createElement('div');
    el.className = 'cr-overlay';

    // Determine grade color
    const gradeColor = health.score >= 80 ? '#4ade80' : health.score >= 55 ? '#facc15' : '#f87171';

    // Portfolio health affects story: good portfolio = ammo against Meredith
    // in Act 5+. Consumed by the meredith_boss fight (_startCombat applies
    // enemy stat overrides + meredith_boss_combat branches on the flags) —
    // logic-sweep MAJOR #11. Latest review wins.
    const act = this.player.actIndex || 1;
    let storyNote = '';
    if (act >= 5) {
      this.player.setFlag('portfolio_strong', health.score >= 70);
      this.player.setFlag('portfolio_weak', health.score < 40);
      if (health.score >= 70) {
        storyNote = '<div class="qr-story-note">Your strong portfolio gives you leverage against Meredith\'s restructuring arguments.</div>';
      } else if (health.score < 40) {
        storyNote = '<div class="qr-story-note qr-story-warn">Meredith will use your weak portfolio as evidence for restructuring.</div>';
      }
    }

    // Reward or penalty based on grade
    const postGame = !!this.player.getFlag('algorithm_defeated');
    const XP_BY_GRADE = postGame
      ? { 'A+': 1500, 'A': 1000, 'B': 600, 'C': 300, 'D': 100, 'F': 0 }
      : { 'A+': 200, 'A': 150, 'B': 100, 'C': 50, 'D': 25, 'F': 0 };
    const xpReward = XP_BY_GRADE[health.grade] ?? 0;
    if (xpReward > 0) this.player.gainXP(xpReward);

    let rewardText = '';
    if (health.score >= 80) {
      this.player.stats.atk += 1;
      this.player.stats.def += 1;
      this._updateMiniStats();
      rewardText = `Skip is impressed. ATK +1, Composure +1. +${xpReward} XP`;
    } else if (health.score < 40) {
      const anger = Math.min(10, (this.player.getFlag('bossAnger') || 0) + 2);
      this.player.setFlag('bossAnger', anger);
      rewardText = `Skip is disappointed. Boss Anger +2.${xpReward > 0 ? ` +${xpReward} XP` : ''}`;
    } else {
      rewardText = `Skip gives a noncommittal nod. Acceptable performance.${xpReward > 0 ? ` +${xpReward} XP` : ''}`;
    }

    el.innerHTML = `
      <div class="cr-panel">
        <div class="cr-header">
          <div class="cr-title">QUARTERLY REVIEW — Q${quarter}</div>
          <div class="cr-subtitle">Portfolio Performance Assessment</div>
        </div>

        <div class="cr-body">
          <div class="qr-grade-block">
            <div class="qr-grade" style="color: ${gradeColor}">${health.grade}</div>
            <div class="qr-rating">${health.rating}</div>
          </div>

          <div class="cr-financials">
            <div class="cr-fin-row">
              <span class="cr-fin-label">Active Clients</span>
              <span class="cr-fin-value">${clients}</span>
            </div>
            <div class="cr-fin-row">
              <span class="cr-fin-label">Total AUM</span>
              <span class="cr-fin-value cr-gold">${fmt(aum)}</span>
            </div>
            <div class="cr-fin-row">
              <span class="cr-fin-label">Annual Fees</span>
              <span class="cr-fin-value cr-gold">${fmt(fees)}</span>
            </div>
            <div class="cr-fin-row">
              <span class="cr-fin-label">Avg AUM/Client</span>
              <span class="cr-fin-value">${clients > 0 ? fmt(Math.round(aum / clients)) : '$0'}</span>
            </div>
            <div class="cr-fin-row">
              <span class="cr-fin-label">Fee Yield</span>
              <span class="cr-fin-value">${aum > 0 ? ((fees / aum) * 100).toFixed(1) + '%' : '0%'}</span>
            </div>
          </div>

          <div class="qr-feedback">${rewardText}</div>
          ${storyNote}
        </div>

        <div class="cr-footer">
          <button class="cr-btn cr-accept cr-focused" id="qr-dismiss">
            Continue
          </button>
        </div>
        <div class="cr-hint">Press Enter to continue</div>
      </div>
    `;

    overlay.appendChild(el);

    const dismiss = () => {
      if (el.parentNode) el.parentNode.removeChild(el);
      window.removeEventListener('keydown', keyHandler);
      this._afterClientResolved();
    };

    const keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === 'e' || e.key === 'E' || e.key === 'Escape') {
        dismiss();
      }
    };

    window.addEventListener('keydown', keyHandler);
    el.querySelector('#qr-dismiss').addEventListener('click', dismiss);
  }

  _applyClientAcceptBuff(clientData) {
    const buffTotal = this.player.getFlag('clientBuffTotal') || {};
    for (const attr of clientData.attributes) {
      const changes = attr.buff || attr.debuff;
      if (!changes) continue;
      for (const [stat, val] of Object.entries(changes)) {
        if (this.player.stats[stat] !== undefined) {
          this.player.stats[stat] = Math.max(1, this.player.stats[stat] + val);
          buffTotal[stat] = (buffTotal[stat] || 0) + val;
        }
      }
    }
    this.player.setFlag('clientBuffTotal', buffTotal);
    this._updateMiniStats();
  }

  _checkBossAnger() {
    const anger = this.player.getFlag('bossAnger') || 0;
    if (anger >= 10) {
      this.player.setFlag('bossAnger', 5);
      const atkBefore = this.player.stats.atk;
      const defBefore = this.player.stats.def;
      this.player.stats.atk = Math.max(1, atkBefore - 3);
      this.player.stats.def = Math.max(1, defBefore - 3);
      const actualAtkLoss = atkBefore - this.player.stats.atk;
      const actualDefLoss = defBefore - this.player.stats.def;
      const prev = this.player.getFlag('skipAngerDebuffTotal') || { atk: 0, def: 0 };
      this.player.setFlag('skipAngerDebuffTotal', { atk: prev.atk + actualAtkLoss, def: prev.def + actualDefLoss });
      this._updateMiniStats();
      this._showToast('Skip: "Your client choices are an embarrassment." (ATK -3, Composure -3)', 'objective');
    }
  }

  _resetClientSystem() {
    // Reverse all accumulated client buffs/debuffs
    const buffTotal = this.player.getFlag('clientBuffTotal');
    if (buffTotal && typeof buffTotal === 'object') {
      for (const [stat, val] of Object.entries(buffTotal)) {
        if (this.player.stats[stat] !== undefined) {
          this.player.stats[stat] = Math.max(1, this.player.stats[stat] - val);
        }
      }
    }
    // Reverse Skip anger debuffs
    const skipDebuff = this.player.getFlag('skipAngerDebuffTotal') || { atk: 0, def: 0 };
    if (typeof skipDebuff === 'object') {
      this.player.stats.atk += skipDebuff.atk || 0;
      this.player.stats.def += skipDebuff.def || 0;
    } else if (skipDebuff > 0) {
      // Legacy: old format was a single number
      this.player.stats.atk += skipDebuff;
      this.player.stats.def += skipDebuff;
    }
    this.player.setFlag('currentClient', null);
    this.player.setFlag('bossAnger', 0);
    this.player.setFlag('clientBuffTotal', null);
    this.player.setFlag('skipAngerDebuffTotal', 0);
  }

  // ── End reception system ────────────────────────────────────────────────────

  _getNearbyTargets() {
    const px = Math.floor(this.player.position.x);
    const pz = Math.floor(this.player.position.z);
    let exit = null;
    let interactable = null;

    for (let i = 0; i < INTERACTION_OFFSETS.length; i++) {
      const offset = INTERACTION_OFFSETS[i];
      const dx = offset[0];
      const dz = offset[1];
      if (!interactable) {
        const data = this.tileMap?.getInteractable(px + dx, pz + dz);
        if (data) {
          interactable = this._nearbyInteractableTarget;
          interactable.x = px + dx;
          interactable.z = pz + dz;
          interactable.data = data;
        }
      }
      if (!exit) {
        const data = this.tileMap?.getExit(px + dx, pz + dz);
        if (data) {
          exit = this._nearbyExitTarget;
          exit.x = px + dx;
          exit.z = pz + dz;
          exit.data = data;
        }
      }
      if (exit && interactable) break;
    }

    this._nearbyTargets.exit = exit;
    this._nearbyTargets.interactable = interactable;
    return this._nearbyTargets;
  }

  _shouldPrioritizeExit(exitTarget, interactableTarget) {
    if (!exitTarget) return false;
    if (!interactableTarget) return true;

    const sameTile = exitTarget.x === interactableTarget.x && exitTarget.z === interactableTarget.z;
    if (!sameTile) return false;
    if (interactableTarget.data.type !== 'elevator') return false;

    return exitTarget.data.targetRoom !== 'executive_floor' || this.player.getFlag('branch_chosen');
  }

  _getInteractableDialogId(interactable) {
    if (interactable.dialogId === 'andrews_desk' && this.player.getFlag('grandma_defeated') && !this.player.getFlag('branch_chosen')) {
      return 'branch_decision';
    }
    // Water cooler doubles as the team huddle hub once any ally is recruited.
    // Reverts to its normal water_cooler dialog before the trio fight, and
    // any time you have no recruited teammates around.
    if (interactable.dialogId === 'water_cooler'
        && this.player.party && this.player.party.length > 0
        && DIALOGS.team_chat_hub) {
      return 'team_chat_hub';
    }
    return interactable.dialogId;
  }

  _getInteractPrompt(interactableTarget, exitTarget) {
    if (!interactableTarget) return 'Examine';

    if (interactableTarget.data.type === 'elevator') {
      if (this._shouldPrioritizeExit(exitTarget, interactableTarget)) {
        return 'Ride elevator';
      }
      return 'Check access';
    }

    if (interactableTarget.data.type === 'reception_desk') {
      // The desk is the Daily Roster now; the client NPC in the waiting area
      // is what starts a meeting.
      const day = readDay(this.player);
      if (day) return `Daily Roster (${Math.max(0, day.total - day.served)} left)`;
      return 'Daily Roster';
    }

    if (this._getInteractableDialogId(interactableTarget.data) === 'branch_decision') {
      return 'Review Henderson file';
    }

    if (interactableTarget.data.type === 'andrews_desk') {
      return 'Review desk';
    }

    if (interactableTarget.data.type === 'supply_shop') {
      const aum = this.player.stats.aum || 0;
      if (aum !== this._lastSupplyShopAum) {
        this._lastSupplyShopAum = aum;
        this._supplyShopPromptText = `Supply Shop (${aum.toLocaleString()} AUM)`;
      }
      return this._supplyShopPromptText;
    }

    return 'Examine';
  }

  // A fight / queued dialog / epilogue is committed and lands within
  // 300-900 ms. Exploration is still top-of-stack and `paused` is still
  // false for that whole window (see the dialog-end handler), so both the
  // interact key and the pause key have to stay shut or the pushed state
  // lands on top of whatever the player opened.
  //
  // DEADLOCK LAW: every term here must be transient. `_pendingCombat` /
  // `_pendingDialog` / `_pendingEpilogue` are cleared at the top of their
  // handler branches and re-set only on the menu-open deferral path, which
  // `resume()` always flushes; `_combatArming` / `_dialogArming` /
  // `_epilogueArming` clear synchronously inside their own timers. Adding a
  // term that can latch true is how you lock the player out of the pause menu.
  _transitionArmed() {
    return !!(this._pendingCombat || this._pendingDialog
           || this._combatArming || this._dialogArming
           || this._pendingEpilogue || this._epilogueArming);
  }

  _interact() {
    // RE-ENTRANCY GUARD. `start_combat` / a queued follow-up dialog only SET
    // `_pendingCombat` / `_pendingDialog`; the fight (or dialog) is pushed 300–500 ms
    // later from the `dialog-end` handler, and `paused` is not raised until
    // `_startCombat` actually runs. Without this guard a player mashing Enter
    // re-opens the pre-fight dialog inside that window, CombatState is pushed on
    // top of the orphan, and when the fight ends the orphan resumes and walks to
    // its `start_combat` node a SECOND time — re-launching a boss that is already
    // defeated and paying its one-time reward twice (measured: stress_ball x2).
    // This is generic: 32 of the 34 `start_combat` dialogs open on an unguarded
    // `text` node, so the exposure is every encounter in the game.
    if (this._transitionArmed()) return;

    const { exit, interactable } = this._getNearbyTargets();

    // Exit on the player's own tile always takes priority
    const onExitTile = exit && exit.x === Math.floor(this.player.position.x)
      && exit.z === Math.floor(this.player.position.z);
    if (onExitTile) {
      this._changeRoom(exit.data.targetRoom, exit.data.spawnX, exit.data.spawnZ);
      return;
    }

    const npc = this.roomManager.entityManager.getNearestInteractable(
      this.player.position.x,
      this.player.position.z
    );

    if (npc) {
      // Turn to face the player — through the StageDirector, not by setting
      // facingAngle and hoping. `faceTowards` only moves the animator's TARGET
      // angle (a ~2-3 frame ease at TURN_RATE 26/s), and this state stops
      // updating on the very next frame when DialogState is pushed, so the ease
      // never ran: the game's one line of staging did not render. A 0.4 s
      // non-blocking beat is ticked from main.js and does. Seated NPCs keep
      // their chair heading — a receptionist who swivels 180 degrees in her seat
      // to look at you is worse than one who does not.
      if (!npc.sitting) {
        this.stage.run([{ actor: npc, face: 'player', hold: 0.4, wait: false }]);
      }

      // Reception client NPC triggers roguelike combat directly.
      // The desk (below) opens the Daily Roster instead.
      if (npc.id === 'reception_client') {
        this._meetCurrentClient();
        return;
      }

      const dialogId = this._getNpcDialogId(npc);
      const dialog = DIALOGS[dialogId];

      if (dialog) {
        AudioManager.playSfx('confirm');
        const dialogState = new DialogState(dialog, this.player, this.stateManager, dialogId);
        this.stateManager.push(dialogState);
      }
      return;
    }

    if (this._shouldPrioritizeExit(exit, interactable)) {
      this._changeRoom(exit.data.targetRoom, exit.data.spawnX, exit.data.spawnZ);
      return;
    }

    if (interactable) {
      if (interactable.data.type === 'reception_desk') {
        this._handleReceptionDesk();
        return;
      }

      if (interactable.data.type === 'supply_shop') {
        AudioManager.playSfx('confirm');
        this.stateManager.push(new ShopState(this.stateManager, this.player));
        return;
      }

      if (interactable.data.dialogId) {
        const dialogId = this._getInteractableDialogId(interactable.data);
        const dialog = DIALOGS[dialogId];
        if (dialog) {
          AudioManager.playSfx('confirm');
          const dialogState = new DialogState(dialog, this.player, this.stateManager, dialogId);
          this.stateManager.push(dialogState);
          return;
        }
      }
    }

    if (exit) {
      this._changeRoom(exit.data.targetRoom, exit.data.spawnX, exit.data.spawnZ);
    }
  }

  _getNpcDialogId(npc) {
    return this._getValidNpcDialogId(npc, this._getDialogId(npc));
  }

  _getValidNpcDialogId(npc, dialogId) {
    if (isDialogValidForQuestStage(this.player, dialogId)) {
      return dialogId;
    }

    const neutralId = `neutral_${npc.id}`;
    if (DIALOGS[neutralId]) return neutralId;
    return DIALOGS.neutral_npc ? 'neutral_npc' : dialogId;
  }

  // SINGLE definition of "does Alex from IT owe the player a story beat".
  // Three places used to spell this out independently (the flag-set listener,
  // the router, and the objective text), and they drifted: the objective
  // demanded the Act-2 partition conversation with no `!act2_complete` term
  // while the router required one, so past Act 2 the HUD asked for a scene the
  // game structurally refused to serve.
  _alexStoryBeats() {
    const f = (k) => this.player.getFlag(k);
    return {
      hasAct2: !!(f('karen_defeated') && !f('knows_server_secret') && !f('act2_complete') && DIALOGS.alex_it_act2),
      hasAct3: !!(f('act2_complete') && !f('alex_it_act3_done') && DIALOGS.alex_it_act3),
    };
  }

  _alexStoryBeatAvailable() {
    const { hasAct2, hasAct3 } = this._alexStoryBeats();
    return hasAct2 || hasAct3;
  }

  // Appends the Act-2 partition lead to whatever the critical-path objective
  // is, while and only while Alex actually owes the player that scene.
  // `_getStoryObjective` output is injected as innerHTML by `_setQuest`, which
  // also strips tags for the toast, so `<br>` is safe here.
  _withAlexAct2Hint(text) {
    if (!this._alexStoryBeats().hasAct2) return text;
    return `${text}<br>• Alex from IT has something on the servers`;
  }

  _getDialogId(npc) {
    const id = npc.id;
    const act = this.player.actIndex;

    // Combat retry check runs first — overrides hardcoded dialogId on NPC
    const retryEncId = id === 'skip' ? 'skip_boss' : id;
    if (DIALOGS[`${retryEncId}_retry`] && this.player.getFlag(`retry_${retryEncId}`) && !this.player.getFlag(`defeated_${retryEncId}`)) {
      // Block Karen retry until 3 tutorial clients are handled
      if (id === 'karen' && !this.player.getFlag('karen_retry_ready')) {
        return 'karen_not_ready';
      }
      return `${retryEncId}_retry`;
    }

    // Block Karen until the intern spar is complete (required combat
    // tutorial). Scoped to briefing_complete: the pre-briefing water-cooler
    // Karen has no Henderson-meeting context and the Intern spar doesn't
    // exist yet — she gets karen_intro / karen_return instead (#13).
    if (id === 'karen' && this.player.getFlag('briefing_complete') && !this.player.getFlag('defeated_intern')) {
      return 'karen_intern_first';
    }

    // A JANITOR STORY BEAT OUTRANKS HIS RIDDLES, AND WHEN BOTH ARE LIVE THE
    // PLAYER PICKS. Every Archive-Janitor story beat is delivered as a
    // hardcoded `dialogId` on a room entry (rooms/index.js), and this riddle
    // block used to `return` above the hardcoded-dialogId check below — so any
    // unanswered riddle shadowed every one of them. That included
    // `janitor_act4`, the sole source of `vault_accessible`, `hr_accessible`,
    // `vault_code_1` and `janitor_rallied`: a player who guessed riddle 1 wrong
    // had no done-flag, no exit (the `riddle_*_attempted` gate re-serves the
    // same riddle forever) and no signpost (`janitor_needs_skip` was shadowed
    // too). It also blocked `janitor_act6`. Now the beat wins, and when a beat
    // and a riddle are both on offer `janitor_router` asks which door.
    const JANITOR_STORY_BEATS = new Set([
      'janitor_act3', 'janitor_needs_skip', 'janitor_act4', 'janitor_act6',
    ]);
    const janitorBeat = (id === 'janitor' && npc.dialogId
      && JANITOR_STORY_BEATS.has(npc.dialogId) && DIALOGS[npc.dialogId])
      ? npc.dialogId : null;

    let janitorRiddle = null;
    if (id === 'janitor' && act >= 3
        && this.player.getFlag('met_janitor') && this.player.getFlag('read_janitor_act3')) {
      if (!this.player.getFlag('janitor_riddle_1_done') && DIALOGS.janitor_riddle_1) janitorRiddle = 'janitor_riddle_1';
      else if (!this.player.getFlag('janitor_riddle_2_done') && DIALOGS.janitor_riddle_2) janitorRiddle = 'janitor_riddle_2';
      else if (!this.player.getFlag('janitor_riddle_3_done') && DIALOGS.janitor_riddle_3) janitorRiddle = 'janitor_riddle_3';
    }

    if (janitorBeat && janitorRiddle && DIALOGS.janitor_router) {
      // Stash both destinations for the `janitor_*_chosen` → `_pendingDialog`
      // chain in the flag-set listener (exact `alex_it_router` precedent).
      this._janitorBeatDialog   = janitorBeat;
      this._janitorRiddleDialog = janitorRiddle;
      return 'janitor_router';
    }
    if (janitorBeat)   return janitorBeat;    // beat wins if the router is missing
    if (janitorRiddle) return janitorRiddle;

    // Janitor: skip re-running the intro after first meeting — use short return dialog instead
    if (id === 'janitor' && this.player.getFlag('met_janitor') && npc.dialogId === 'janitor_intro' && DIALOGS.janitor_return) {
      return 'janitor_return';
    }

    // Janet act4 rally takes priority over lunch thief dialogId overrides.
    // Bounded below act 6: her rally is optional, and past the _act4 stage
    // band this returned a dialog the gate rejects — shadowing janet_act6
    // and the 5-ally finale counter forever (logic-sweep MAJOR #8).
    if (id === 'janet' && act >= 4 && act < 6 && !this.player.getFlag('janet_rallied') && DIALOGS.janet_act4) {
      return 'janet_act4';
    }

    // Skip act-4 rally can FAIL (3-of-4 buzzword check) — keep offering
    // it until he's rallied. Progression requires skip_rallied (the
    // Janitor won't move without him), so act stays 4 until this lands.
    // Bounded to act 4 exactly to match the _act4 stage band.
    if (id === 'skip' && act === 4 && !this.player.getFlag('skip_rallied') && DIALOGS.skip_act4) {
      return 'skip_act4';
    }

    // Rachel the trust officer (`rachel`, cubicle farm): the first
    // conversation is always her introduction, whatever act the player finds
    // her in. Her room entries carry the act-band return dialogs; routing the
    // intro here keeps those three entries mutually exclusive, so she can
    // never appear twice on the same chair.
    if (id === 'rachel' && !this.player.getFlag('met_rachel') && DIALOGS.rachel_intro) {
      return 'rachel_intro';
    }

    // A SPENT SET-PIECE IS NOT A REPEATABLE PROMPT. Skip's Board Room entry
    // carries `dialogId: 'board_meeting'`, and he deliberately STAYS in the room
    // after the meeting — `board_meeting_closed` is deferred until the player
    // walks out so eighteen bodies never delete themselves on camera. That left
    // the E prompt on him wired straight back into the 177-node set-piece, with
    // its `give_xp 300` on node 176, farmable once per press. The fix is
    // code-side and touches no entity: while he is standing in the room he has
    // already spoken in, he gets a short scene with no rewards and no flags
    // instead. Scoped to `board_room` so his office entries are untouched.
    if (id === 'skip'
        && this.player.currentRoom === 'board_room'
        && this.player.getFlag('board_meeting_held')
        && DIALOGS.board_meeting_after) {
      return 'board_meeting_after';
    }

    // A STORY BEAT OUTRANKS FLAVOUR. `npc.dialogId` normally wins here (CLAUDE.md
    // "NPC `dialogId` overrides act routing"), and that return is ABOVE every
    // Alex-from-IT route below it — printer quest, act4 trigger, Phantom
    // Approver, and the story router with its documented three guards. So
    // reading a server rack (an optional Act-1 flavour interactable) set
    // `server_secret_started`, which pins Alex's room entry to
    // `alex_server_secret`, which then shadowed the Act-2 partition reveal the
    // objective was sending the player to get: "finding Alex lands on his base
    // dialog". Only `alex_server_secret` is exempted, and only while a story
    // beat is actually on offer, so every other hardcoded dialogId is untouched.
    if (npc.dialogId && npc.dialogId !== npc.id && DIALOGS[npc.dialogId]
        && !(id === 'alex_it' && npc.dialogId === 'alex_server_secret' && this._alexStoryBeatAvailable())) {
      return npc.dialogId;
    }

    // Meredith paces the executive floor during Acts 3-4 (#20). First meeting
    // plays her intro; generic act routing then serves meredith_act3 (which
    // sets its own read flag) and meredith_return. Placed AFTER the hardcoded
    // dialogId check, and ceilinged at act4_complete so the board-room boss
    // era can never serve the stale intro.
    if (id === 'meredith'
        && !this.player.getFlag('act4_complete')
        && !this.player.getFlag('met_meredith')
        && DIALOGS.meredith_intro) {
      return 'meredith_intro';
    }

    // Printer from Hell side quest: route Alex to explanation dialog while active
    if (id === 'alex_it' && this.player.getFlag('printer_quest_started') && !this.player.getFlag('printer_quest_done')) {
      return 'alex_printer_quest';
    }

    // Special: Alex from IT + archive evidence = Act 4 trigger (must be before general routing)
    // Deferred if a side quest is already in progress — let it finish first.
    if (
      id === 'alex_it' &&
      this.player.getFlag('has_archive_evidence') &&
      !this.player.getFlag('act3_complete') &&
      DIALOGS.act4_trigger
    ) {
      const sideQuestInProgress = (
        (this.player.getFlag('anomaly_started')     && !this.player.getFlag('quest_anomaly_347_complete')) ||
        (this.player.getFlag('legacy_started')      && !this.player.getFlag('quest_legacy_admin_complete')) ||
        (this.player.getFlag('network_started')     && !this.player.getFlag('quest_network_ghost_complete')) ||
        (this.player.getFlag('dave_started')        && !this.player.getFlag('quest_daves_legacy_complete')) ||
        (this.player.getFlag('printer_soul_started') && !this.player.getFlag('quest_printer_soul_complete')) ||
        (this.player.getFlag('final_patch_started') && !this.player.getFlag('quest_final_patch_complete'))
      );
      if (!sideQuestInProgress) return 'act4_trigger';
    }

    // Phantom Approver: both locations found — skip router and go straight to completion
    if (
      id === 'alex_it' &&
      this.player.getFlag('legacy_started') &&
      this.player.getFlag('phantom_hr_found') &&
      this.player.getFlag('phantom_workstation_found') &&
      !this.player.getFlag('quest_legacy_admin_complete') &&
      DIALOGS.alex_it_quest_legacy
    ) {
      return 'alex_it_quest_legacy';
    }

    // Alex IT: when story beat is available, offer choice between story and side quests
    if (id === 'alex_it' && this.player.getFlag('met_alex_it')) {
      const { hasAct2, hasAct3 } = this._alexStoryBeats();

      // Player chose story from the router — go straight to the story dialog
      if ((hasAct2 || hasAct3) && this.player.getFlag('alex_story_chosen')) {
        this.player.setFlag('alex_story_chosen', false);
        return hasAct2 ? 'alex_it_act2' : 'alex_it_act3';
      }
      // Show router when story is available and not deferred
      if ((hasAct2 || hasAct3) && !this.player.getFlag('alex_story_deferred')) {
        if (DIALOGS.alex_it_router) return 'alex_it_router';
        return hasAct2 ? 'alex_it_act2' : 'alex_it_act3';
      }
      // Clear deferred flag after one side quest interaction so router shows again next time
      if (this.player.getFlag('alex_story_deferred')) {
        this.player.setFlag('alex_story_deferred', false);
      }
    }

    // Alex IT subquests: only route to side quest if player hasn't deferred
    if (id === 'alex_it' && this.player.getFlag('met_alex_it')) {
      const sideQuest = this._getAlexSideQuestDialog();
      if (sideQuest && sideQuest !== 'alex_it_return') {
        // If player deferred side quests, skip to regular dialog
        if (this.player.getFlag('alex_side_deferred')) {
          this.player.setFlag('alex_side_deferred', false);
        } else if (DIALOGS.alex_it_side_router) {
          return 'alex_it_side_router';
        } else {
          return sideQuest;
        }
      }
    }

    // Block generic act routing from firing alex_it_act2 before karen is defeated
    // Only applies after the intro has been read — don't intercept the first meeting
    if (id === 'alex_it' && this.player.getFlag('met_alex_it') && !this.player.getFlag('karen_defeated') && !this.player.getFlag('read_alex_it_act2')) {
      if (DIALOGS.alex_it_return) return 'alex_it_return';
    }

    if (
      id === 'intern' &&
      act >= 1 &&
      this.player.getFlag('read_intern_intro') &&
      !this.player.getFlag('defeated_intern') &&
      DIALOGS.intern_combat_intro
    ) {
      if (this.player.getFlag('retry_intern') && DIALOGS.intern_retry) return 'intern_retry';
      return 'intern_combat_intro';
    }

    // Compliance crossword — only after Alex has pointed the player to the archive
    if (id === 'compliance' && act >= 3 && this.player.getFlag('alex_it_act3_done') && !this.player.getFlag('compliance_crossword_done') && DIALOGS.compliance_crossword) {
      return 'compliance_crossword';
    }

    // Skip post-Karen debrief: required before Chad fight
    if (id === 'skip' && this.player.getFlag('karen_defeated') && !this.player.getFlag('skip_post_karen')) {
      return 'skip_post_karen';
    }

    // Skip post-Chad debrief: required before Grandma fight
    if (id === 'skip' && this.player.getFlag('chad_defeated') && !this.player.getFlag('skip_post_chad')) {
      return 'skip_post_chad';
    }

    // Social engineering chain (act 4–5 only): Isaiah → Diane → Intern
    if (act >= 4 && act < 6 && !this.player.getFlag('social_eng_complete')) {
      if (id === 'isaiah' && !this.player.getFlag('social_eng_started') && DIALOGS.social_engineering_1) return 'social_engineering_1';
      if (id === 'diane' && this.player.getFlag('social_eng_started') && !this.player.getFlag('social_eng_diane') && DIALOGS.social_engineering_2) return 'social_engineering_2';
      if (id === 'intern' && this.player.getFlag('social_eng_diane') && DIALOGS.social_engineering_3) return 'social_engineering_3';
    }

    // Ally recruitment: triggered after the trio fight when Andrew talks to recruitable team members
    if (id === 'isaiah'
        && this.player.getFlag('restructuring_trio_defeated')
        && !this.player.getFlag('isaiah_recruited')
        && !this.player.getFlag('isaiah_documents_shared')
        && DIALOGS.isaiah_recruit) {
      return 'isaiah_recruit';
    }
    if (id === 'diane'
        && this.player.getFlag('diane_act6_rallied')
        && !this.player.getFlag('diane_recruited')
        && DIALOGS.diane_recruit) {
      return 'diane_recruit';
    }

    // Alex from IT — Badge Audit personal mission (post-recruit; NO act cutoff).
    // These four ally missions used to expire at act6_complete, so a player who
    // beelined the Rolex permanently lost four missions, four ability unlocks
    // and 750 XP. They now stay claimable through Act 7 and post-game, matching
    // the Janitor's mission (which is has_rolex-gated and always survived).
    if (id === 'alex_it'
        && this.player.getFlag('alex_it_recruited')
        && DIALOGS.alex_badge_audit_offer
        && (!this.player.getFlag('alex_badge_audit_complete') || !this.player.getFlag(`read_alex_it_act${act}`))) {
      // While the personal mission is active OR done but the player hasn't seen it yet, prefer it
      if (this.player.getFlag('alex_has_patch_log') && !this.player.getFlag('alex_badge_audit_complete')) {
        return 'alex_badge_audit_return';
      }
      if (!this.player.getFlag('alex_badge_audit_complete')) {
        return 'alex_badge_audit_offer';
      }
    }

    // Isaiah — The Receipts personal mission (post-recruit; no act cutoff)
    if (id === 'isaiah'
        && this.player.getFlag('isaiah_recruited')
        && DIALOGS.isaiah_receipts_offer
        && !this.player.getFlag('isaiah_receipts_complete')) {
      if (this.player.getFlag('isaiah_has_receipts')) {
        return 'isaiah_receipts_return';
      }
      return 'isaiah_receipts_offer';
    }

    // Diane — The Original Handbook personal mission (post-recruit; no act cutoff)
    if (id === 'diane'
        && this.player.getFlag('diane_recruited')
        && DIALOGS.diane_handbook_offer
        && !this.player.getFlag('diane_handbook_complete')) {
      if (this.player.getFlag('diane_has_handbook')) {
        return 'diane_handbook_return';
      }
      return 'diane_handbook_offer';
    }

    // Janet — The Vacancy personal mission (post-recruit; no act cutoff)
    if (id === 'janet'
        && this.player.getFlag('janet_recruited')
        && DIALOGS.janet_vacancy_offer
        && !this.player.getFlag('janet_vacancy_complete')) {
      if (this.player.getFlag('janet_has_timesheet')) {
        return 'janet_vacancy_return';
      }
      return 'janet_vacancy_offer';
    }

    // Janitor — The Names personal mission (after the Rolex changes hands)
    if (id === 'janitor'
        && this.player.getFlag('has_rolex')
        && DIALOGS.janitor_names_offer
        && !this.player.getFlag('janitor_names_complete')) {
      if (this.player.getFlag('janitor_has_ledger')) {
        return 'janitor_names_return';
      }
      return 'janitor_names_offer';
    }

    // Dave's story — the D.K. who signed the printer's note (Printer from
    // Hell). The Janitor remembers him once the note has been found;
    // janitor_dave had no route at all before this (#20).
    if (id === 'janitor'
        && this.player.getFlag('met_janitor')
        && this.player.getFlag('printer_quest_done')
        && !this.player.getFlag('dave_janitor_done')
        && DIALOGS.janitor_dave) {
      return 'janitor_dave';
    }

    // Name the Pattern (proposal 3). Andrew has just handed back the ledger
    // where every entry ends REMEMBERED — the same word that shows up on 4%
    // of the monitors, on the label taped to Rack 7, and in what the printer
    // said before it powered down. The Janitor points at the shape. Once.
    if (id === 'janitor'
        && this.player.getFlag('janitor_names_complete')
        && !this.player.getFlag('read_janitor_pattern')
        && DIALOGS.janitor_pattern) {
      return 'janitor_pattern';
    }

    // F-12 · The Janitor's name. `ending_architect` has said "My name isn't
    // 'the Janitor.' It never was." since the game shipped, and never said
    // what it is. It sits AFTER the pattern scene deliberately: the pattern is
    // about the building, the name is about him, and in that order the second
    // reads as the smaller, later thing. Same routing shape as janitor_pattern
    // (own dialog, own read-flag) so no existing tree is edited to hold it.
    if (id === 'janitor'
        && this.player.getFlag('janitor_names_complete')
        && this.player.getFlag('read_janitor_pattern')
        && !this.player.getFlag('read_janitor_the_name')
        && DIALOGS.janitor_the_name) {
      return 'janitor_the_name';
    }

    // The Janitor never falls through to generic act routing — his act3/
    // act4/act6 story beats are served ONLY by the gated Archive entries
    // (explicit dialogIds, security_guard → act3 → needs_skip → act4
    // ordering). The garage janitor gives the intro at any act (he's
    // timeless — met_janitor gates the riddles and the Architect ending),
    // then small talk (logic-sweep MAJORs #5/#6).
    if (id === 'janitor') {
      if (!this.player.getFlag('met_janitor') && DIALOGS.janitor_intro) return 'janitor_intro';
      if (DIALOGS.janitor_return) return 'janitor_return';
    }

    if (act >= 7 && DIALOGS[`${id}_act7`] && !this.player.getFlag(`read_${id}_act7`)) return `${id}_act7`;
    if (act >= 6 && DIALOGS[`${id}_act6`] && !this.player.getFlag(`read_${id}_act6`)) return `${id}_act6`;
    if (act >= 4 && DIALOGS[`${id}_act4`] && !this.player.getFlag(`read_${id}_act4`)) return `${id}_act4`;
    if (act >= 3 && DIALOGS[`${id}_act3`] && !this.player.getFlag(`read_${id}_act3`)) return `${id}_act3`;
    // skip_act2 and janet_act2 both reference the Karen binder incident — hold them until Karen is defeated
    if (act >= 1 && (id === 'skip' || id === 'janet') && !this.player.getFlag('karen_defeated') && !this.player.getFlag(`read_${id}_act2`)) {
      if (DIALOGS[`${id}_intro`] && !this.player.getFlag(`read_${id}_intro`)) return `${id}_intro`;
      if (DIALOGS[`${id}_return`]) return `${id}_return`;
    }
    if (act >= 1 && DIALOGS[`${id}_act2`] && !this.player.getFlag(`read_${id}_act2`)) return `${id}_act2`;
    // Gate team intros until the player has checked their desk
    if (PRE_DESK_TEAM.includes(id) && !this.player.getFlag('checked_desk') && !this.player.getFlag(`read_${id}_intro`)) {
      return 'team_pre_intro';
    }
    if (DIALOGS[`${id}_intro`] && !this.player.getFlag(`read_${id}_intro`)) return `${id}_intro`;
    if (DIALOGS[`${id}_return`]) return `${id}_return`;
    if (act >= 7 && DIALOGS[`${id}_act7`]) return `${id}_act7`;
    if (act >= 6 && DIALOGS[`${id}_act6`]) return `${id}_act6`;
    if (act >= 4 && DIALOGS[`${id}_act4`]) return `${id}_act4`;
    if (act >= 3 && DIALOGS[`${id}_act3`]) return `${id}_act3`;
    if (act >= 1 && DIALOGS[`${id}_act2`]) return `${id}_act2`;
    if (DIALOGS[`${id}_intro`]) return `${id}_intro`;
    if (DIALOGS[id]) return id;

    return id;
  }

  _createHUD() {
    const overlay = document.getElementById('ui-overlay');

    this.hudElement = document.createElement('div');
    this.hudElement.className = 'exploration-hud';

    this.locationElement = document.createElement('div');
    this.locationElement.className = 'hud-location';
    this.locationElement.textContent = 'Cubicle Farm';
    this.hudElement.appendChild(this.locationElement);

    this.miniStatsElement = document.createElement('div');
    this.miniStatsElement.className = 'hud-mini-stats';
    this._updateMiniStats();
    this.hudElement.appendChild(this.miniStatsElement);

    // Billable Day chip — only rendered while a day is running.
    this.dayChipElement = document.createElement('div');
    this.dayChipElement.className = 'hud-day-chip';
    this.hudElement.appendChild(this.dayChipElement);
    this._updateDayChip();

    this.questElement = document.createElement('div');
    this.questElement.className = 'hud-quest-tracker';
    this.questElement.style.display = 'none';
    this.hudElement.appendChild(this.questElement);

    this.upgradeTooltip = document.createElement('div');
    this.upgradeTooltip.className = 'hud-upgrade-tooltip';
    this.upgradeTooltip.textContent = 'Upgrade available! Open the menu to assign upgrade points.';
    this.upgradeTooltip.style.display = 'none';
    this.hudElement.appendChild(this.upgradeTooltip);

    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'hud-toast-container';
    this.hudElement.appendChild(this.toastContainer);

    this.promptElement = document.createElement('div');
    this.promptElement.className = 'interact-prompt';
    const promptHTML = '<kbd>E</kbd> Interact';
    this.promptElement.innerHTML = promptHTML;
    this._lastPromptHTML = promptHTML;
    this.promptElement.style.display = 'none';
    this.promptElement.addEventListener('click', () => this._interact());
    this.hudElement.appendChild(this.promptElement);

    this.portfolioElement = document.createElement('div');
    this.portfolioElement.className = 'hud-portfolio';
    this.hudElement.appendChild(this.portfolioElement);
    this._updatePortfolioDisplay();

    this.monologueElement = document.createElement('div');
    this.monologueElement.className = 'inner-monologue';
    this.hudElement.appendChild(this.monologueElement);

    overlay.appendChild(this.hudElement);
  }

  _removeHUD() {
    if (this.hudElement && this.hudElement.parentNode) {
      this.hudElement.parentNode.removeChild(this.hudElement);
    }
  }

  _updateMiniStats() {
    if (!this.miniStatsElement) return;
    const { hp, maxHP, mp, maxMP, level, xp = 0 } = this.player.stats;
    const nextXP = level < XP_TABLE.length ? XP_TABLE[level] : XP_TABLE[XP_TABLE.length - 1];
    this.miniStatsElement.innerHTML = `
      <div class="hud-mini-stat">
        <span class="label">HP</span>
        <span class="value hp">${hp}/${maxHP}</span>
      </div>
      <div class="hud-mini-stat">
        <span class="label">Coffee</span>
        <span class="value mp">${mp}/${maxMP}</span>
      </div>
      <div class="hud-mini-stat">
        <span class="label">Lv</span>
        <span class="value">${level}</span>
      </div>
      <div class="hud-mini-stat">
        <span class="label">XP</span>
        <span class="value xp">${xp}/${nextXP}</span>
      </div>
    `;
  }

  // Billable Day HUD chip: which slot you are on, Hours banked, AUM in escrow.
  // Empty markup hides itself via `.hud-day-chip:empty`.
  _updateDayChip() {
    if (!this.dayChipElement) return;
    const day = readDay(this.player);
    if (!day) {
      this.dayChipElement.innerHTML = '';
      return;
    }
    const slot = Math.min(day.index + 1, day.total);
    const closing = slot >= day.total;
    this.dayChipElement.innerHTML = `
      <span class="day-chip-label">DAY ${day.dayNumber}</span>
      <span class="${closing ? 'day-chip-closing' : ''}">Client ${slot}/${day.total}</span>
      <span class="day-chip-hours">${DAY_TEXT.ui.hours_label} ${day.hours}</span>
      <span class="day-chip-escrow">Escrow $${Number(day.aumPending || 0).toLocaleString()}</span>
    `;
  }

  _updatePortfolioDisplay() {
    if (!this.portfolioElement) return;
    const clients = this.player.getFlag('portfolioClients') || 0;
    const aum     = this.player.getFlag('portfolioAUM')     || 0;
    const fees    = this.player.getFlag('portfolioFees')    || 0;

    if (clients === 0) {
      this.portfolioElement.innerHTML = '';
      return;
    }

    const fmt = (n) => '$' + n.toLocaleString();
    this.portfolioElement.innerHTML = `
      <div class="portfolio-title">BOOK OF BUSINESS</div>
      <div class="portfolio-row">
        <span class="portfolio-label">Clients</span>
        <span class="portfolio-value">${clients}</span>
      </div>
      <div class="portfolio-row">
        <span class="portfolio-label">AUM</span>
        <span class="portfolio-value portfolio-gold">${fmt(aum)}</span>
      </div>
      <div class="portfolio-row">
        <span class="portfolio-label">Fees/yr</span>
        <span class="portfolio-value portfolio-gold">${fmt(fees)}</span>
      </div>
    `;
  }

  _updateLocationDisplay(roomId) {
    const names = {
      cubicle_farm: 'Cubicle Farm',
      break_room: 'Break Room',
      skip_office: "Skip's Office",
      skip_office_large: "Skip's Office",   // renovated variant (_resolveRoomId)
      conference_room: 'Conference Room',
      server_room: 'IT Server Room',
      reception: 'Reception',
      parking_garage: 'Parking Garage',
      executive_floor: 'Executive Floor',
      stairwell: 'Back Corridor',
      archive: 'The Archive',
      hr_department: 'HR Department',
      vault: 'The Vault',
      board_room: 'The Board Room',
      penthouse: 'The Penthouse',
      penthouse_expanded: 'Penthouse',
      penthouse_aquarium: 'The Reef & Reel',
      penthouse_analytics: 'Analytics Suite',
      penthouse_bar: 'Private Lounge',
      city_street: 'Fennimore Avenue',
      transit_bus: 'The 5:15 Crosstown',
      records_hall: 'Hall of Records',
      luckys_diner: "Lucky's",
      floor_13: 'Floor 13',
      old_branch: 'The Roastery',
      old_vault: 'The First Vault',
    };
    if (this.locationElement) {
      this.locationElement.textContent = names[roomId] || roomId;
    }
  }

  _showInteractPrompt(text, isRead = false) {
    if (this.promptElement) {
      const key = ('ontouchstart' in window) ? 'A' : 'E';
      const html = `<kbd>${key}</kbd> ${text || 'Interact'}`;
      if (html !== this._lastPromptHTML) {
        this.promptElement.innerHTML = html;
        this._lastPromptHTML = html;
      }
      this.promptElement.style.display = 'block';
      this.promptElement.classList.toggle('read', isRead);
    }
  }

  _hideInteractPrompt() {
    if (this.promptElement) {
      this.promptElement.style.display = 'none';
    }
  }

  _isElevatorLink(targetRoom) {
    const fromRoom = this.player.currentRoom;
    if (fromRoom !== this._lastElevatorLinkFrom || targetRoom !== this._lastElevatorLinkTo) {
      this._lastElevatorLinkFrom = fromRoom;
      this._lastElevatorLinkTo = targetRoom;
      this._lastElevatorLinkResult = ElevatorRide.isElevatorLink(fromRoom, targetRoom);
    }
    return this._lastElevatorLinkResult;
  }

  _getNpcPromptText(npc) {
    if (npc !== this._lastPromptNPC || npc.name !== this._lastPromptNPCName) {
      this._lastPromptNPC = npc;
      this._lastPromptNPCName = npc.name;
      this._npcPromptText = `Talk to ${npc.name}`;
    }
    return this._npcPromptText;
  }

  _isDialogRead(dialogId) {
    if (this._readDialogFlag === null || dialogId !== this._lastReadDialogId) {
      this._lastReadDialogId = dialogId;
      this._readDialogFlag = `read_${dialogId}`;
    }
    return this.player.getFlag(this._readDialogFlag);
  }

  _initQuests() {
    this._refreshStoryProgress(true);
  }

  _syncActFromFlags() {
    let act = 0;
    if (this.player.getFlag('briefing_complete')) act = 1;
    if (this.player.getFlag('branch_chosen')) act = 2;
    if (this.player.getFlag('act2_complete')) act = 3;
    if (this.player.getFlag('act3_complete')) act = 4;
    if (this.player.getFlag('act4_complete')) act = 5;
    if (this.player.getFlag('act5_complete')) act = 6;
    if (this.player.getFlag('act6_complete')) act = 7;
    this.player.actIndex = act;
  }

  _getAlexSideQuestDialog() {
    const p = this.player;
    // Side quests only available after Henderson Trust arc is resolved
    if (!p.getFlag('act2_complete')) return 'alex_it_return';
    // Active quests take priority
    if (p.getFlag('anomaly_started') && !p.getFlag('quest_anomaly_347_complete')) return 'alex_it_quest_anomaly';
    if (p.getFlag('legacy_started') && !p.getFlag('quest_legacy_admin_complete')) return 'alex_it_quest_legacy';
    if (p.getFlag('network_started') && !p.getFlag('quest_network_ghost_complete')) return 'alex_it_quest_network';
    if (p.getFlag('dave_started') && !p.getFlag('quest_daves_legacy_complete')) return 'alex_it_quest_dave';
    if (p.getFlag('printer_soul_started') && !p.getFlag('quest_printer_soul_complete')) return 'alex_it_quest_printer';
    if (p.getFlag('final_patch_started') && !p.getFlag('quest_final_patch_complete')) return 'alex_it_quest_final';
    // Start next unstarted quest
    if (!p.getFlag('anomaly_started')) return 'alex_it_quest_anomaly';
    if (p.getFlag('quest_anomaly_347_complete') && !p.getFlag('legacy_started')) return 'alex_it_quest_legacy';
    if (p.getFlag('quest_legacy_admin_complete') && !p.getFlag('network_started')) return 'alex_it_quest_network';
    if (p.getFlag('quest_network_ghost_complete') && !p.getFlag('dave_started')) return 'alex_it_quest_dave';
    if (p.getFlag('quest_daves_legacy_complete') && !p.getFlag('printer_soul_started')) return 'alex_it_quest_printer';
    if (p.getFlag('quest_printer_soul_complete') && !p.getFlag('final_patch_started')) return 'alex_it_quest_final';
    return 'alex_it_return';
  }

  _getStoryObjective() {
    // Game complete
    if (this.player.getFlag('algorithm_defeated')) {
      return 'The story is over. Thank you for playing.';
    }

    // Act 6½ — The Countersignature (charter must be sealed before the penthouse)
    if (this.player.getFlag('act6_complete') && !this.player.getFlag('charter_certified')) {
      if (!this.player.getFlag('city_unlocked')) return 'Take the charter to the Penthouse elevator';
      if (this.player.getFlag('has_recorder_seal')) return 'Bring Delia the seal — finish this';
      if (this.player.getFlag('delia_moved')) return 'The Roastery, east end of Fennimore — box 0001 in the first vault';
      if (this.player.getFlag('met_delia')) return "Sit with Delia. Listen. She'll tell you when she's done";
      if (this.player.getFlag('form_11c_done')) return "Find Delia Okafor — Lucky's Diner, booth 4";
      return 'The city: Hall of Records, north off Fennimore Avenue — ask for Form 11-C';
    }

    // Act 7
    if (this.player.getFlag('act6_complete')) {
      if (this.player.getFlag('regional_director_defeated')) return 'Face The Algorithm in the Penthouse';
      if (this.player.getFlag('cfos_defeated')) return 'Defeat the Regional Director';
      if (this.player.getFlag('penthouse_entered')) return "Defeat the CFO's Assistant";
      return 'Ascend to the Penthouse and face The Algorithm';
    }

    // Act 6
    if (this.player.getFlag('act5_complete')) {
      // (There used to be a `has_rolex` line here. It was unreachable:
      // `has_rolex` derives `act6_complete`, and the Act-6½ block above tests
      // `act6_complete` first, so control never arrived with the Rolex in hand.
      // Removed rather than left as a lie about what the HUD can say.)
      const allyFlags = [
        { flag: 'janet_act6_rallied',  label: 'Janet' },
        { flag: 'diane_act6_rallied',  label: 'Diane' },
        { flag: 'intern_act6_rallied', label: 'Intern' },
        { flag: 'skip_speech_ready',   label: 'Skip' },
        { flag: 'grandma_ally',        label: 'Grandma Henderson' },
      ];
      const evidenceFlags = [
        { flag: 'diane_evidence',  label: "Diane's documents" },
        { flag: 'isaiah_evidence', label: "Isaiah's records" },
      ];
      const missingAllies   = allyFlags.filter(a => !this.player.getFlag(a.flag));
      const missingEvidence = evidenceFlags.filter(e => !this.player.getFlag(e.flag));
      const rallied = allyFlags.length - missingAllies.length;
      const evidence = evidenceFlags.length - missingEvidence.length;

      // The prep counter. It is a SUB-LINE from stage 2 onward — preparation
      // shapes how the board meeting goes, it no longer gates anything.
      const prepLines = [];
      if (rallied < 5 || evidence < 2) {
        prepLines.push(`Prep: ${rallied}/5 allies, ${evidence}/2 evidence`);
        if (missingAllies.length)   prepLines.push(`Rally:<br>${missingAllies.map(a => `• ${a.label}`).join('<br>')}`);
        if (missingEvidence.length) prepLines.push(`Evidence:<br>${missingEvidence.map(e => `• ${e.label}`).join('<br>')}`);
      }
      const prep = prepLines.length ? '<br>' + prepLines.join('<br>') : '';

      // STAGE 3 — the board has been heard. The board line does NOT vanish and
      // get replaced (the producer's "jarring swap"); it CONVERTS to a
      // struck-through green-✓ completed step that sits above the Rolex line
      // for the whole last leg of Act 6.
      if (this.player.getFlag('board_meeting_held')) {
        return '<span class="hud-quest-done">The board has been heard</span>'
          + "<br>Get the Janitor's Rolex — he's in the Archive";
      }

      // STAGE 2 — Skip has his speech. The meeting is the PRIMARY objective.
      if (this.player.getFlag('skip_speech_ready')) {
        return 'Convene the board — Skip is waiting in the Board Room' + prep;
      }

      // STAGE 1 — before Skip writes the speech.
      return 'The board votes on dissolution at 4 PM. Prepare the department.' + prep;
    }

    // Act 5
    if (this.player.getFlag('meredith_fight_started')) {
      return 'Defeat Meredith in the Board Room';
    }
    if (this.player.getFlag('chief_restructuring_defeated')) {
      return 'Confront Meredith in the Board Room';
    }
    if (this.player.getFlag('data_lead_defeated')) {
      return 'Clear the executive floor';
    }
    if (this.player.getFlag('corporate_lawyer_defeated')) {
      return 'Get to the executive floor';
    }
    if (this.player.getFlag('restructuring_defeated')) {
      // INTENTIONALLY VESTIGIAL (#27): unreachable while the trio post-dialog
      // sets corporate_lawyer_defeated in the same frame (checked above).
      return 'Push through to reception';
    }
    if (this.player.getFlag('act4_complete')) {
      return 'Fight through the Restructuring Team to reach the Board Room';
    }

    // Act 4
    // Both branches now require act3_complete. In the normal path that flag
    // is always already set (vault_accessible comes from janitor_act4, which
    // needs skip_rallied, which needs act3_complete), so nothing changes —
    // but a player who cracked the keypad in Act 1 must not have the Act 4
    // objective overwrite whatever they are actually supposed to be doing.
    if (this.player.getFlag('has_charter') && this.player.getFlag('act3_complete')) {
      return 'Return to the cubicle farm with the charter';
    }
    if (this.player.getFlag('vault_accessible') && this.player.getFlag('act3_complete') && !this.player.getFlag('has_charter')) {
      const codes = [this.player.getFlag('vault_code_1'), this.player.getFlag('vault_code_2'), this.player.getFlag('vault_code_3')];
      const codeCount = codes.filter(Boolean).length;
      if (codeCount < 3) {
        const hints = [];
        if (!this.player.getFlag('vault_code_2')) hints.push('HR Dept filing cabinets');
        if (!this.player.getFlag('vault_code_3')) hints.push('Server Room rack C');
        return `Find the Vault combination (${codeCount}/3) — check: ${hints.join(', ')}`;
      }
      return 'Open the Vault and retrieve the 1947 charter';
    }
    if (this.player.getFlag('act3_complete')) {
      const rallied = ['janet_rallied', 'diane_rallied', 'skip_rallied', 'janitor_rallied'].filter(f => this.player.getFlag(f)).length;
      return `Rally the team: Talk to Janet, Diane, Skip & the Janitor (${rallied}/4)`;
    }

    // Act 3
    if (this.player.getFlag('has_archive_evidence') && !this.player.getFlag('act3_complete')) {
      return 'Return the Archive evidence to Alex from IT';
    }
    if (this.player.getFlag('security_guard_info') && !this.player.getFlag('read_janitor_act3')) {
      return 'Find the Janitor in the Archive — he knows what happened here';
    }
    if (this.player.getFlag('visited_archive') && !this.player.getFlag('has_archive_password')) {
      return 'Get the archive access code from the Compliance Auditor (Executive Floor)';
    }
    if (this.player.getFlag('visited_archive') && !this.player.getFlag('has_archive_evidence')) {
      return 'Search the Archive for evidence';
    }
    if (this.player.getFlag('archive_accessible') && !this.player.getFlag('visited_archive')) {
      return 'Find the Archive through the back corridor';
    }
    // Act 2 finale — one line, because it is one conversation. These were two
    // separate objectives and the first was UNSATISFIABLE: it demanded the
    // Act-2 partition reveal, but the router requires `!act2_complete` to serve
    // `alex_it_act2` and dialogGating caps that dialog at quest stage 299. So
    // past Act 2 the HUD asked forever for a scene the game refused to give,
    // while Alex actually served `alex_it_act3` ("It just decrypted itself").
    // `alex_it_act3` now sets `knows_server_secret` as well, so one visit
    // clears both flags and this line retires honestly.
    if (this.player.getFlag('act2_complete')
        && (!this.player.getFlag('alex_it_act3_done') || !this.player.getFlag('knows_server_secret'))) {
      return 'Talk to Alex from IT — the partition decrypted itself';
    }
    if (this.player.getFlag('act2_complete')) {
      return 'Something strange is happening. Investigate.';
    }
    if (
      this.player.getFlag('regional_defeated') ||
      this.player.getFlag('compliance_defeated') ||
      this.player.getFlag('skip_defeated')
    ) {
      return 'Something strange is happening...';
    }
    if (this.player.getFlag('ending_started')) {
      return 'Face the consequences';
    }
    // ACT-2 BAND. Every one of these goes through `_withAlexAct2Hint`, which
    // appends the partition lead while — and only while — Alex actually owes
    // the player that scene. Before this, the Act-2 reveal that sets
    // `knows_server_secret` had NO objective anywhere in the game: across all
    // 183 lines of this function, the band between `karen_defeated` and
    // `act2_complete` only ever said "Talk to Skip" / "Meet Chad" / "Head to
    // the Executive Floor". A required-feeling story beat was 100 % missable
    // and completely unadvertised, which is how a playthrough reaches Act 3
    // with the state skipped and Alex opening on "It just decrypted itself".
    if (this.player.getFlag('branch_chosen')) {
      return this._withAlexAct2Hint('Head to the Executive Floor');
    }
    if (this.player.getFlag('grandma_defeated')) {
      return this._withAlexAct2Hint('Review the Henderson file at your desk');
    }
    if (this.player.getFlag('chad_defeated') && this.player.getFlag('skip_post_chad')) {
      return this._withAlexAct2Hint('Meet Grandma Henderson in the Conference Room');
    }
    if (this.player.getFlag('chad_defeated')) {
      return this._withAlexAct2Hint("Talk to Skip in his office");
    }
    if (this.player.getFlag('karen_defeated') && this.player.getFlag('skip_post_karen')) {
      return this._withAlexAct2Hint('Meet Chad Henderson in the Conference Room');
    }
    if (this.player.getFlag('karen_defeated')) {
      return this._withAlexAct2Hint("Talk to Skip in his office");
    }
    if (this.player.getFlag('retry_karen')) {
      const wins = this.player.getFlag('roguelite_tutorial_wins') || 0;
      if (wins >= 3) return "You're ready — retry Karen in the Conference Room";
      return `Handle reception clients to build experience (${wins}/3)`;
    }
    if (this.player.getFlag('briefing_complete') && !this.player.getFlag('defeated_intern')) {
      return 'Spar with the Intern to prepare for the Henderson meetings';
    }
    if (this.player.getFlag('briefing_complete')) {
      return 'Meet Karen Henderson in the Conference Room';
    }

    if (!this.player.getFlag('checked_desk') && !this.player.getFlag('ready_for_skip')) {
      return 'Find your cubicle and settle in';
    }
    if (!this.player.getFlag('ready_for_skip')) {
      const missing = [];
      if (!this.player.getFlag('met_janet'))   missing.push('Janet');
      if (!this.player.getFlag('met_intern'))  missing.push('the Intern');
      if (!this.player.getFlag('met_isaiah'))  missing.push('Isaiah');
      if (!this.player.getFlag('met_alex_it')) missing.push('Alex from IT');
      return `Meet your coworkers — find ${missing.join(', ')}`;
    }
    return 'Report to Skip for your assignment';
  }

  _refreshStoryProgress(silent = false) {
    // Auto-gate Skip until all four coworkers have been met
    if (
      this.player.getFlag('met_janet') &&
      this.player.getFlag('met_intern') &&
      this.player.getFlag('met_isaiah') &&
      this.player.getFlag('met_alex_it') &&
      !this.player.getFlag('ready_for_skip')
    ) {
      this.player.setFlag('ready_for_skip', true);
    }

    // Act 6 "fully prepared" signal — 5 allies + 2 pieces of evidence. This
    // used to be the gate on the Janitor's Rolex; it no longer gates anything.
    // Preparation now changes the TEXTURE of the board meeting (the nine
    // `requires`-gated ally contributions in BLOCK D of `board_meeting`), its
    // outcome tier reach, and the epilogue cards. Kept derived and kept named
    // honestly: `act6_ready` means "prepared", not "meeting held".
    if (
      this.player.getFlag('act5_complete') &&
      this.player.getFlag('janet_act6_rallied') &&
      this.player.getFlag('diane_act6_rallied') &&
      this.player.getFlag('intern_act6_rallied') &&
      this.player.getFlag('skip_speech_ready') &&
      this.player.getFlag('grandma_ally') &&
      this.player.getFlag('diane_evidence') &&
      this.player.getFlag('isaiah_evidence') &&
      !this.player.getFlag('act6_ready')
    ) {
      this.player.setFlag('act6_ready', true);
    }

    // The first Karen meeting is over — either she lost (karen_defeated) or the
    // player did (retry_karen, which hands off to the two retry entries). The
    // conference room's first Karen entry gates on this because it needs BOTH
    // terms and an NPC `condition` holds one notFlag. Without it, a player who
    // beat her on the first attempt left her standing in that room for the rest
    // of the game with a live `start_combat: karen` behind her.
    if (!this.player.getFlag('karen_first_meeting_over')
      && (this.player.getFlag('karen_defeated') || this.player.getFlag('retry_karen'))) {
      this.player.setFlag('karen_first_meeting_over', true);
    }

    // Every renovation funded (F-7). Derived because the shop writes one flag
    // per item and cosmetics.js can only gate on a single flag; ALL_RENOVATION_FLAGS
    // is the list SHOP_ITEMS ships, so a tenth renovation must be added there
    // too or this silently stops meaning "all".
    if (!this.player.getFlag('renovations_all')
      && ALL_RENOVATION_FLAGS.every(f => this.player.getFlag(f))) {
      this.player.setFlag('renovations_all', true);
    }

    // THE ROLEX IS GATED ON THE BOARD MEETING, NOT THE OTHER WAY ROUND.
    // Taking the Rolex derives `act6_complete`, which derives
    // `board_meeting_closed`, which clears every Board Room staging NPC — so
    // under the old order the watch silently deleted a 177-node set-piece the
    // player had been told (by Skip, in `skip_act6`) to go and skip. It also
    // deleted the Act 6 → 7 bridge: BLOCK H of `board_meeting` is where the
    // board chair says the order came from "Above" and Skip names the
    // penthouse. Derived flag because room NPC conditions support a single
    // flag/notFlag pair.
    //
    // The `|| has_rolex` clause is LOAD-BEARING, not belt-and-braces: without
    // it a legacy save that already holds the Rolex satisfies BOTH the
    // `act5_complete && !rolex_available` Archive entry and the `has_rolex`
    // one, and two Janitors stand in the Archive.
    if (
      this.player.getFlag('act5_complete') &&
      (this.player.getFlag('board_meeting_held') || this.player.getFlag('has_rolex')) &&
      !this.player.getFlag('rolex_available')
    ) {
      this.player.setFlag('rolex_available', true);
    }

    // The Board Meeting (Act 6 set-piece) closes when it has been held, or
    // when the player leaves for the Penthouse without holding it. Derived
    // one-way flag: room NPC conditions support a single flag/notFlag pair,
    // and every Board Room staging entry (plus Skip's office entries) hangs
    // off this one. Never cleared, and NEVER set from dialog data.
    //
    // DEFERRED WHILE THE PLAYER IS STILL IN THE ROOM. `board_meeting_held` sets
    // at node 175 and this derivation used to fire in the same tick, but the 18
    // `conditionFn` hides it triggers cannot execute until ExplorationState
    // ticks again — which is the first frame after the dialog pops. So the
    // entire cast (Skip, five allies, twelve suits) deleted itself in ONE
    // VISIBLE FRAME while the player stood there watching. A board that stays
    // seated while Andrew walks out is fictionally correct and costs nothing;
    // the flag's own contract is only that it be true by the time the player
    // could RE-ENTER, and `_changeRoom` rebuilds the room from flags anyway, so
    // the hides land off-camera either way. `_boardCloseDeferred` is flushed at
    // the end of `_changeRoom()`.
    if (
      (this.player.getFlag('board_meeting_held') || this.player.getFlag('act6_complete')) &&
      !this.player.getFlag('board_meeting_closed')
    ) {
      // `window.__boardDeferOff` is an A/B switch in the shape of
      // `window.__mergeStatics`: `tools/_g-board-close.mjs --nodefer` sets it to
      // reproduce the PRE-FIX same-tick derivation so the 18-bodies-in-one-frame
      // drop can be measured rather than described. Never true in normal play.
      const deferOff = typeof window !== 'undefined' && window.__boardDeferOff === true;
      if (this.player.currentRoom === 'board_room' && !deferOff) {
        this._boardCloseDeferred = true;
      } else {
        this.player.setFlag('board_meeting_closed', true);
        this._boardCloseDeferred = false;
      }
    }

    this._syncActFromFlags();

    let questId = 'main_act1';
    if (this.player.getFlag('briefing_complete')) questId = 'main_act2';
    if (this.player.getFlag('branch_chosen')) questId = 'main_act2_finale';
    if (this.player.getFlag('act2_complete')) questId = 'main_act3';
    if (this.player.getFlag('act3_complete')) questId = 'main_act4';
    if (this.player.getFlag('act4_complete')) questId = 'main_act5';
    if (this.player.getFlag('act5_complete')) questId = 'main_act6';
    if (this.player.getFlag('act6_complete')) questId = 'main_act7';

    this._setQuest(this._getStoryObjective(), { questId, silent });
  }

  _setQuest(objective, { questId = this.currentQuestId, silent = false } = {}) {
    if (!objective) return;

    const changed = objective !== this.currentObjective || questId !== this.currentQuestId;
    this.currentObjective = objective;
    this.currentQuestId = questId;
    this.player.questStates.currentObjective = objective;
    this.player.questStates.currentQuestId = questId;

    if (this.questElement) {
      this.questElement.style.display = 'block';
      const sideHints = this._getActiveSideQuestHints();
      const hintsHTML = sideHints.map(h =>
        `<div class="hud-quest-optional">${h}</div>`
      ).join('');
      const sideQuests = this._getActiveSideQuests();
      const sideQuestsHTML = sideQuests.map(q =>
        `<div class="hud-side-quest-entry">
          <div class="hud-side-quest-name">${q.name}</div>
          <div class="hud-side-quest-objective">${q.objective}</div>
        </div>`
      ).join('');
      this.questElement.innerHTML = `
        <div class="hud-quest-title">OBJECTIVE</div>
        <div class="hud-quest-objective">${objective}</div>
        ${hintsHTML ? `<div class="hud-quest-divider"></div>${hintsHTML}` : ''}
        ${sideQuestsHTML ? `<div class="hud-quest-divider"></div><div class="hud-side-quest-title">SIDE QUESTS</div>${sideQuestsHTML}` : ''}
      `;
    }

    if (changed && !silent) {
      this._showToast(`Objective Updated: ${objective.replace(/<br>/gi, ' ').replace(/<[^>]+>/g, '')}`, 'objective');
    }
  }

  _getActiveSideQuestHints() {
    const hints = [];
    const f = (flag) => this.player.getFlag(flag);

    // Janitor riddles — progressive. Gated on read_janitor_act3 (the
    // actual riddle unlock), not met_janitor alone — the Archive is
    // sealed until Act 3, so an earlier hint pointed at a locked room.
    if (f('met_janitor') && f('read_janitor_act3')) {
      if (!f('janitor_riddle_1_done')) {
        hints.push('The Janitor has a riddle for you — find him in the Archive');
      } else if (!f('janitor_riddle_2_done')) {
        hints.push('The Janitor has a second riddle waiting');
      } else if (!f('janitor_riddle_3_done')) {
        hints.push('The Janitor has one final riddle');
      }
    }

    return hints;
  }

  _getActiveSideQuests() {
    const quests = [];
    const f = (flag) => this.player.getFlag(flag);

    // The Lunch Thief
    if (f('lunch_thief_started') && !f('lunch_thief_complete')) {
      let objective = 'Check the break room fridge';
      if (f('lunch_thief_fridge_done') && !f('lunch_thief_culprit_revealed')) objective = 'Ask Janet about the thief';
      else if (f('lunch_thief_culprit_revealed')) objective = 'Confront the culprit';
      quests.push({ name: 'The Lunch Thief', objective });
    }

    // The Printer from Hell
    if (f('printer_quest_started') && !f('printer_quest_done')) {
      const objective = f('printer_toner_quest') ? "Find the printer's true purpose" : 'Ask Alex from IT about the printer';
      quests.push({ name: 'The Printer from Hell', objective });
    }

    // Server Room Secrets
    if (f('server_secret_started') && !f('server_secret_done')) {
      quests.push({ name: 'Server Room Secrets', objective: 'Help Alex with his discovery' });
    }

    // Motivational poster quests — unlocked after losing to Karen
    if (f('retry_karen')) {
      const atkDone = ['quest_atk_1_done','quest_atk_2_done','quest_atk_3_done','quest_atk_4_done','quest_atk_5_done'].filter(fl => f(fl)).length;
      if (atkDone < 5) quests.push({ name: 'Assertiveness Training', objective: `Find assertiveness posters (${atkDone}/5)` });
      const defDone = ['quest_def_1_done','quest_def_2_done','quest_def_3_done','quest_def_4_done','quest_def_5_done'].filter(fl => f(fl)).length;
      if (defDone < 5) quests.push({ name: 'Composure Training', objective: `Find composure posters (${defDone}/5)` });
    }

    // Alex IT subquests
    if (f('anomaly_started') && !f('quest_anomaly_347_complete')) {
      const anomalyObj = f('morse_decoded') ? 'Return to Alex from IT' : 'Find the Morse code pattern in server rack C';
      quests.push({ name: 'The 3:47 AM Anomaly', objective: anomalyObj });
    }
    if (f('legacy_started') && !f('quest_legacy_admin_complete')) {
      const found = (f('phantom_hr_found') ? 1 : 0) + (f('phantom_workstation_found') ? 1 : 0);
      let legacyObj;
      if (found >= 2) {
        legacyObj = 'Return to Alex from IT';
      } else {
        const remaining = [];
        if (!f('phantom_hr_found')) remaining.push('• HR filing cabinets');
        if (!f('phantom_workstation_found')) remaining.push('• Workstation in cubicle farm');
        legacyObj = `Investigate the Phantom Approver (${found}/2):<br>${remaining.join('<br>')}`;
      }
      quests.push({ name: 'The Phantom Approver', objective: legacyObj });
    }
    if (f('network_started') && !f('quest_network_ghost_complete')) {
      const placed = (f('booster_br_placed') ? 1 : 0) + (f('booster_stair_placed') ? 1 : 0) + (f('booster_conf_placed') ? 1 : 0);
      let netObj;
      if (placed >= 3) {
        netObj = 'Return to Alex from IT';
      } else {
        const remaining = [];
        if (!f('booster_br_placed')) remaining.push('• Break Room');
        if (!f('booster_stair_placed')) remaining.push('• Back Corridor');
        if (!f('booster_conf_placed')) remaining.push('• Conference Room');
        netObj = `Place signal boosters (${placed}/3):<br>${remaining.join('<br>')}`;
      }
      quests.push({ name: 'Network Ghost', objective: netObj });
    }
    if (f('dave_started') && !f('quest_daves_legacy_complete')) {
      const found = (f('tuesday_floppy_found') ? 1 : 0) + (f('tuesday_tag_found') ? 1 : 0) + (f('tuesday_sticky_found') ? 1 : 0);
      let daveObj;
      if (found >= 3) {
        daveObj = 'Return to Alex from IT';
      } else {
        const remaining = [];
        if (!f('tuesday_sticky_found')) remaining.push('• Sticky note — Cubicle Farm');
        if (!f('tuesday_floppy_found')) remaining.push('• Floppy disk — Break Room');
        if (!f('tuesday_tag_found')) remaining.push('• Server tag — Server Room');
        daveObj = `Locate the artifacts (${found}/3):<br>${remaining.join('<br>')}`;
      }
      quests.push({ name: 'The Tuesday 2PM', objective: daveObj });
    }
    if (f('printer_soul_started') && !f('quest_printer_soul_complete')) {
      let printerObj = 'Find the firmware disk (Server Room)';
      if (f('printer_firmware_found')) printerObj = "Connect to the printer's ethernet port";
      if (f('printer_soul_done')) printerObj = 'Return to Alex from IT';
      quests.push({ name: "Printer's Soul", objective: printerObj });
    }
    if (f('final_patch_started') && !f('quest_final_patch_complete')) {
      const patchObj = f('patch_monitor_silenced') ? 'Return to Alex to defend the server room' : 'Silence the network monitoring terminal';
      quests.push({ name: 'The Unauthorized Patch', objective: patchObj });
    }

    return quests;
  }

  _updateQuest(questId, stage) {
    const objectives = QUEST_OBJECTIVES[questId];
    if (!objectives) {
      this._refreshStoryProgress();
      return;
    }

    const objective = objectives[stage];
    if (objective) {
      this._setQuest(objective, { questId });
    } else {
      this._refreshStoryProgress();
    }
  }

  /**
   * The REAL toast of the game — 61 call sites, and NONE of them changed when
   * the arbiter landed. The body is now a post; everything the old body did by
   * hand (a new DOM node per call at a fixed anchor, a fixed 2600 ms life, no
   * awareness of any other surface) is the arbiter's job.
   *
   * `duration` is still honoured when a caller passes one explicitly, because
   * exactly one site does (the PIP notice at 6000 ms — someone hit the
   * too-fast-to-read problem, hand-patched the instance in front of them, and
   * moved on). Every other site now gets a reading-time-scaled ttl instead of
   * the 61st constant.
   *
   * @param {string} text
   * @param {'info'|'objective'|'item'} tone  visual tone, unchanged
   * @param {number} [duration]  explicit ms override
   * @param {{cls?:string}} [opts]  force a priority class (see _classifyToast)
   */
  _showToast(text, tone = 'info', duration = undefined, opts = {}) {
    if (!text) return;
    const { cls, speaker, body } = opts.cls
      ? { cls: opts.cls, speaker: opts.speaker || null, body: text }
      : this._classifyToast(text, tone);
    NotificationArbiter.post({
      cls,
      text: body,
      speaker,
      tone: cls === NC.VOICE ? undefined : tone,
      ttl: duration,
      key: opts.key,
    });
  }

  /**
   * Route a toast to a priority class from its CONTENT, not from a per-site
   * constant. Two patterns earn a promotion out of the glanceable rail:
   *
   *  - `Name: "..."` — a named character speaking. That is written dialogue
   *    delivered by a character, and the audit's headline pacing failure was
   *    exactly this: a 27-word Diane line rendered in a 2600 ms corner box at
   *    96 ms/word, roughly three times faster than a person reads, unpausable
   *    and unreplayable. It is a scene, not a notification.
   *  - >= 18 words — prose by length. `_showToast`'s median call is 8 words;
   *    everything above 18 measured as under-timed against 200 ms/word.
   *
   * Both become VOICE, which gets the prose surface, a reading-scaled ttl up to
   * 9 s, and an absolute claim over bookkeeping and commendations.
   */
  _classifyToast(text, tone) {
    const m = /^([A-Z][\w.'-]*(?: [A-Z][\w.'-]*)?): ["“](.+)["”]\s*$/s.exec(text.trim());
    if (m) return { cls: NC.VOICE, speaker: m[1], body: m[2] };
    const words = text.trim().split(/\s+/).length;
    if (words >= 18) return { cls: NC.VOICE, speaker: null, body: text };
    return { cls: NC.PROGRESS, speaker: null, body: text };
  }

  _checkUpgradeTooltip() {
    if (!this.upgradeTooltip) return;
    // Reset dismissed state if player gained new points since last dismiss
    if (this.player.upgradePoints > 0 && this.player.upgradePoints !== this._lastSeenUpgradePoints) {
      this._upgradeTooltipDismissed = false;
    }
    // Show tooltip if player has unspent upgrade points and hasn't opened abilities tab
    if (this.player.upgradePoints > 0 && !this._upgradeTooltipDismissed) {
      this.upgradeTooltip.style.display = '';
    } else {
      this.upgradeTooltip.style.display = 'none';
    }
  }

  _dismissUpgradeTooltip() {
    this._upgradeTooltipDismissed = true;
    this._lastSeenUpgradePoints = this.player.upgradePoints;
    if (this.upgradeTooltip) this.upgradeTooltip.style.display = 'none';
  }

  // ~1 in 25 monitors displays REMEMBERED instead of a spreadsheet. Until now
  // that was pure noise; the first time Andrew stands next to one he thinks
  // something about it, and the easter egg becomes the first piece of evidence
  // in the game's actual mystery (proposal 3). Once per save.
  _checkWhisperMonitor() {
    if (this._whisperDone) return;
    const spots = this.roomManager.currentRoom?.whisperSpots;
    if (!spots || spots.length === 0) return;
    if (this.player.getFlag('whisper_monitor_seen')) { this._whisperDone = true; return; }
    const px = this.player.position.x;
    const pz = this.player.position.z;
    for (const s of spots) {
      const dx = px - s.x;
      const dz = pz - s.z;
      if (dx * dx + dz * dz < 2.25) {
        this._whisperDone = true;
        this.player.setFlag('whisper_monitor_seen', true);
        return;
      }
    }
  }

  /**
   * Andrew's inner monologue. This used to be first-writer-LOSES: it assigned
   * `textContent` on one reused element and restarted a flat 5 s timer, so a
   * room thought (+1500 ms after room entry) and a STORY_THOUGHTS flag thought
   * (+2000 ms after any flag write) routinely landed inside each other's window
   * and the first was cut off mid-read with no transition. It also ran happily
   * on top of the dialog box, which is how `prose-w5.png` ends up with three
   * separate pieces of prose on screen at once.
   *
   * Now it is a VOICE post in the prose zone: it queues behind any live prose
   * (including a dialog scene, which holds VOICE), it is single-occupancy, and
   * its duration scales with how much there is to read.
   */
  _showMonologue(text) {
    if (!text) return;
    NotificationArbiter.monologue(text);
  }

  // ── Ambient scheduler (F-11) ──────────────────────────────────────────────
  // One timer, drained from `src/data/ambience.js`. Only runs in the
  // exploration state's own update, which `paused` already gates — so the whole
  // thing is silent during a room fade, a keypad, a dialog push and every
  // pushed state (Combat/Dialog/Shop/Menu/Arcade run their own update; this
  // one does not tick while they are on top).
  //
  // Two extra suppressions on top of that, both deliberate:
  //   • A VOICE surface is up. i-run's rule is that prose owns the player's
  //     attention alone; a cue fired under a line of Diane's is a cue the
  //     player half-hears. The slot is SKIPPED, not queued — the next one is
  //     seconds out and a backlog of stale room noise is worse than a gap.
  //   • The room has no entry. Silence is authored (floor_13).
  _updateAmbience(dt) {
    const entry = ROOM_AMBIENCE[this.player.currentRoom];
    if (!entry) { this._ambTimer = 0; return; }
    if (this._ambRoom !== this.player.currentRoom) {
      this._ambRoom = this.player.currentRoom;
      this._ambState = {};
      // First cue lands inside the room's own cadence, not on entry — the
      // room-entry beat already owns that second (transition, thought, toast).
      this._ambTimer = nextAmbientDelay(entry);
    }
    this._ambTimer -= dt;
    if (this._ambTimer > 0) return;
    this._ambTimer = nextAmbientDelay(entry);
    if (NotificationArbiter.isActive(NC.VOICE)) return;
    const cue = pickAmbientCue(entry, this._ambState);
    if (cue) AudioManager.playSfx(cue);
  }

  update(dt) {
    if (this.paused) return;

    this._updateWallFade(dt);
    this._updateAmbience(dt);

    if (DEV_MODE && InputManager.isJustPressed('f2')) {
      const existing = document.getElementById('dev-panel');
      if (existing) {
        existing._devClose();
      } else {
        this._showDevPanel();
      }
    }

    // Act 5 — Restructuring Trio: 3v2 multi-combatant fight (Andrew + Janet vs all three analysts).
    // Fires once act4_complete is set (set by act5_trigger dialog) and runs once.
    // Defeating the trio sets brand_consultant_defeated / restructuring_defeated / corporate_lawyer_defeated
    // so downstream gates (executive floor) keep working unchanged.
    if (this.player.currentRoom === 'cubicle_farm' && this.player.getFlag('act4_complete') && !this.player.getFlag('act5_complete') && !this.player.getFlag('restructuring_trio_started') && !this.player.getFlag('restructuring_trio_defeated') && DIALOGS.restructuring_trio_intro) {
      this.player.setFlag('restructuring_trio_started');
      setTimeout(() => {
        const dialogState = new DialogState(DIALOGS['restructuring_trio_intro'], this.player, this.stateManager, 'restructuring_trio_intro');
        this.stateManager.push(dialogState);
      }, 1200);
    }

    // Gauntlet fight 5: Chief of Restructuring chains after Data Analytics Lead is defeated
    if (this.player.currentRoom === 'executive_floor' && this.player.getFlag('data_lead_defeated') && !this.player.getFlag('chief_fight_started') && DIALOGS.chief_restructuring_combat) {
      this.player.setFlag('chief_fight_started');
      setTimeout(() => {
        const dialogState = new DialogState(DIALOGS['chief_restructuring_combat'], this.player, this.stateManager, 'chief_restructuring_combat');
        this.stateManager.push(dialogState);
      }, 2000);
    }

    // A staged beat owns Andrew's body (position, facing and the animator
    // tick). Input would otherwise fight the director for the same position
    // and `move()` would overwrite the facing every frame.
    if (!this.player._stageDriven) {
      const { x, z } = InputManager.getMovementVector();
      this.player.move(x, z, dt, this.tileMap);
      this.player.update(dt);
    }

    // Follow the player's ELEVATION too. A hardcoded 0 pinned the camera to the
    // ground floor of the only multi-level room in the game: descending the
    // stairwell's 1.80 m sank the player 66 px down a 900 px frame (7.3 % of
    // frame height) before he reached the bottom. `IsometricCamera.follow`
    // already lerps y at FOLLOW_SPEED, so this costs nothing in a flat room.
    this.camera.follow(this.player.position.x, this.player.position.z, this.player.mesh.position.y);
    this.camera.update(dt);

    this.roomManager.update(dt, this.player.flags, this.paused);

    this._checkWhisperMonitor();

    const nearNPC = this.roomManager.entityManager.getNearestInteractable(
      this.player.position.x,
      this.player.position.z
    );
    const { exit: nearExit, interactable: nearInteractable } = this._getNearbyTargets();

    // Exit on the player's own tile takes priority over nearby NPCs
    const onExitTile = nearExit && nearExit.x === Math.floor(this.player.position.x)
      && nearExit.z === Math.floor(this.player.position.z);

    if (onExitTile) {
      this._showInteractPrompt(
        this._isElevatorLink(nearExit.data.targetRoom)
          ? 'Ride elevator' : 'Go through'
      );
    } else if (nearNPC) {
      const dialogId = this._getNpcDialogId(nearNPC);
      const isRead = this._isDialogRead(dialogId);
      this._showInteractPrompt(this._getNpcPromptText(nearNPC), isRead);
    } else if (this._shouldPrioritizeExit(nearExit, nearInteractable)) {
      this._showInteractPrompt(
        this._isElevatorLink(nearExit.data.targetRoom)
          ? 'Ride elevator' : 'Go through'
      );
    } else if (nearInteractable) {
      const dialogId = this._getInteractableDialogId(nearInteractable.data);
      const isRead = dialogId ? this._isDialogRead(dialogId) : false;
      this._showInteractPrompt(this._getInteractPrompt(nearInteractable, nearExit), isRead);
    } else if (nearExit) {
      this._showInteractPrompt('Go through');
    } else {
      this._hideInteractPrompt();
    }

    if (InputManager.isInteractPressed()) {
      this._interact();
    }

    // Same guard as `_interact()`: during the 300-900 ms arming window the
    // pushed fight/dialog/epilogue would land UNDER the pause menu.
    if (InputManager.isCancelPressed() && !this._transitionArmed()) {
      this.stateManager.push(new MenuState(this.stateManager, this.player));
    }

    Engine.renderScene(Engine.scene, Engine.camera);
    Engine.skipDefaultRender();
  }

  _showDevPanel() {
    showDevPanel(this);
  }
}
