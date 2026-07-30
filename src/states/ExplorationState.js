import { InputManager } from '../core/InputManager.js';
import { EventBus } from '../core/EventBus.js';
import { AudioManager } from '../core/AudioManager.js';
import { Engine } from '../core/Engine.js';
import { IsometricCamera } from '../world/IsometricCamera.js';
import { RoomManager } from '../world/RoomManager.js';
import { Player } from '../entities/Player.js';
import { DialogState } from './DialogState.js';
import { CombatState } from './CombatState.js';
import { MenuState } from './MenuState.js';
import { ClientReviewState } from './ClientReviewState.js';
import { DIALOGS } from '../data/dialogs/index.js';
import { ENCOUNTERS } from '../data/encounters/index.js';
import { TransitionOverlay } from '../ui/TransitionOverlay.js';
import { ElevatorRide } from '../ui/ElevatorRide.js';
import { generateClient, generateBeneficiaryChain, applyChainModifiers, calculatePortfolioHealth } from '../data/ClientGenerator.js';
import { ENEMY_STATS, XP_TABLE } from '../data/stats.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { ROOM_THOUGHTS, STORY_THOUGHTS } from '../data/thoughts.js';
import { SaveManager } from '../core/SaveManager.js';
import { AchievementManager } from '../core/AchievementManager.js';
import { DEV_MODE } from '../utils/constants.js';
import { ShopState } from './ShopState.js';
import { isDialogValidForQuestStage } from '../utils/dialogGating.js';
import { showDevPanel } from '../ui/DevPanel.js';

const INTERACTION_OFFSETS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const PRE_DESK_TEAM = ['janet', 'intern', 'isaiah', 'alex_it'];

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
  main_act6: {
    0: 'Rally the team for the board meeting',
    1: 'Gather evidence against Meredith',
    2: 'Get Skip to prepare his speech',
    3: 'Recruit Grandma Henderson as ally',
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
    this.transition = new TransitionOverlay();
    this.tileMap = null;
    this.paused = false;
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
    this._lastPromptHTML = null;
    this._nearbyExitTarget = { x: 0, z: 0, data: null };
    this._nearbyInteractableTarget = { x: 0, z: 0, data: null };
    this._nearbyTargets = { exit: null, interactable: null };
    this._lastClientPromptRaw = undefined;
    this._clientPromptText = null;
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
    Engine.scene.add(this.player.mesh);
    this._createHUD();
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
      EventBus.on('dialog-end', () => {
        if (this._pendingCombat) {
          const encounterId = this._pendingCombat;
          this._pendingCombat = null;
          setTimeout(() => this._startCombat(encounterId), 300);
          return;
        }

        if (this._pendingDialog) {
          const dialogId = this._pendingDialog;
          this._pendingDialog = null;
          if (DIALOGS[dialogId]) {
            setTimeout(() => {
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
          setTimeout(async () => {
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
          // empty (dialogGating caps it) and strand knows_server_secret
          const hasAct2 = this.player.getFlag('karen_defeated') && !this.player.getFlag('knows_server_secret')
            && !this.player.getFlag('act2_complete');
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
        // Arcade minigame launch — hide the exploration HUD while playing
        if (key === 'launch_arcade') {
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
        // Act 6 → 7 transition: all allies rallied + rolex = penthouse unlocks
        if (key === 'has_rolex') {
          this.player.setFlag('act6_complete', true);
          // Reward for completing all Act 6 prep (allies + evidence + rolex)
          const levels = this.player.gainXP(500);
          this._updateMiniStats();
          this._showToast('Team assembled, evidence secured. +500 XP', 'objective');
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

        // Inner monologue on first room visit
        const thoughtKey = `thought_${roomId}`;
        if (!this.player.getFlag(thoughtKey) && ROOM_THOUGHTS[roomId]) {
          this.player.setFlag(thoughtKey, true);
          const thoughts = ROOM_THOUGHTS[roomId];
          const thought = thoughts[Math.floor(Math.random() * thoughts.length)];
          setTimeout(() => this._showMonologue(thought), 1500);
        }

        if (roomId === 'reception') {
          this._onReceptionEntered();
        }

        // Executive floor: track first visit for cosmetic unlock
        if (roomId === 'executive_floor' && !this.player.getFlag('executive_floor_visited')) {
          this.player.setFlag('executive_floor_visited');
        }

        // Ending dialog re-triggers on every executive floor visit until the boss is defeated
        const endingBossDefeated = this.player.getFlag('regional_defeated') || this.player.getFlag('compliance_defeated') || this.player.getFlag('ross_defeated');
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
            const isRetry = this.player.getFlag('retry_ross_boss');
            endingDialogId = isRetry && DIALOGS.ross_boss_retry ? 'ross_boss_retry' : 'secret_ending';
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
        if (roomId === 'cubicle_farm' && this.player.getFlag('has_charter') && !this.player.getFlag('act4_complete') && !this.player.getFlag('act5_triggered') && DIALOGS.act5_trigger) {
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

        // Board Room: trigger Rachel fight on every entry until act5 is complete
        // (act5_complete is the only reliable "fight won" gate — rachel_fight_started
        //  cannot be used here because it gets saved on first entry and permanently
        //  blocks re-entry after a loss)
        if (roomId === 'board_room' && this.player.getFlag('act4_complete') && !this.player.getFlag('act5_complete')) {
          this.player.setFlag('rachel_fight_started');
          if (DIALOGS.rachel_boss_combat) {
            setTimeout(() => {
              const dialogState = new DialogState(DIALOGS['rachel_boss_combat'], this.player, this.stateManager, 'rachel_boss_combat');
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
    Engine.scene.remove(this.player.mesh);
    this._removeHUD();
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
  }

  resume() {
    this.paused = false;
    this._updateMiniStats();
    this._updatePortfolioDisplay();
    this._refreshStoryProgress(true);
    AudioManager.playMusic(this._getMusicForRoom(this.player.currentRoom));
    // Check for upgrade points tooltip
    this._checkUpgradeTooltip();
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
    this._updateLocationDisplay(this.player.currentRoom);
  }

  _resolveRoomId(roomId) {
    if (roomId === 'ross_office' && this.player.getFlag('renovation_corner_office')) {
      return 'ross_office_large';
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
    this._fadeWallMeshes(room.getSouthWallMeshes(), pz > room.data.height - 3.5 ? 0.16 : 1.0, blend);
    this._fadeWallMeshes(room.getEastWallMeshes(), px > room.data.width - 3.5 ? 0.16 : 1.0, blend);
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

  _loadRoom(roomId, spawnX, spawnZ) {
    const actualId = this._resolveRoomId(roomId);
    const result = this.roomManager.loadRoom(actualId, spawnX, spawnZ, this.player.flags);
    this._applyTimeOfDay(roomId);
    if (result) {
      this.tileMap = result.tileMap;
      this.player.setPosition(result.spawnX, result.spawnZ);
      this.player.currentRoom = roomId;
      this.camera.snapTo(result.spawnX, result.spawnZ);

      const roomData = this.roomManager.getRoomData(actualId);
      if (roomData) {
        this.camera.setBounds(2, roomData.width - 2, 2, roomData.height - 2);
      }
      // Non-transition load (boot, save load, dev fixture). Warm the new room's
      // programs and textures here too — not awaited, because this path has no
      // wipe to hide behind and the compile is better overlapped with the frames
      // that follow than blocking the one that starts them. See warmScene().
      Engine.warmScene(Engine.scene, Engine.camera);
    }
  }

  async _changeRoom(targetRoom, spawnX, spawnZ) {
    // Room gating — check access before allowing entry
    const gatedRooms = {
      // The reception elevator tile is walkable (elevatorDoors don't
      // block), so standing on it bypassed the elevator dialog's
      // branch_chosen check entirely (logic-sweep MAJOR #10)
      executive_floor: { flag: 'branch_chosen', message: 'The keycard reader blinks red. AUTHORIZED PERSONNEL ONLY.' },
      archive: { flag: 'archive_accessible', message: "The freight elevator won't move. You need a keycard." },
      hr_department: { flag: 'hr_accessible', message: "The HR Department is locked down. You need authorization." },
      vault: { flag: 'vault_accessible', message: "The vault door is sealed shut. You need more information." },
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
    // First rejection fires the charter_challenge dialog (Ross's call,
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
    const gate = gatedRooms[targetRoom];
    if (gate && !this.player.getFlag(gate.flag)) {
      this._showToast(gate.message, 'info');
      return;
    }

    this.paused = true;
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
      // The Quiet Floor: late in the story, at night, the elevator
      // sometimes stops where it isn't supposed to. Once per session.
      // Deliberately still limited to the lobby↔garage shaft even though
      // every shaft now rides: the executive elevator is ridden during
      // story-critical beats and a random detour there would read as a bug
      // rather than a chill. (Widen this pair list if the producer wants
      // the whole tower to misbehave.)
      const act = this.player.actIndex || 0;
      const quietShaft = (currentRoom === 'parking_garage' && targetRoom === 'reception')
        || (currentRoom === 'reception' && targetRoom === 'parking_garage');
      if (quietShaft && act >= 5 && !ExplorationState._quietFloorVisited
        && Math.random() < 0.2) {
        ExplorationState._quietFloorVisited = true;
        const detour = ElevatorRide.labelsFor(currentRoom, 'floor_13');
        await ElevatorRide.close(detour.labels, detour.goingUp);
        this._showToast('The elevator pauses. The doors open anyway.', 'info');
        targetRoom = 'floor_13';
        spawnX = 8; spawnZ = 8;
      } else {
        await ElevatorRide.close(ride.labels, ride.goingUp);
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
      this.player.setPosition(result.spawnX, result.spawnZ);
      this.player.currentRoom = targetRoom;
      Engine.scene.add(this.player.mesh);
      this.camera.snapTo(result.spawnX, result.spawnZ);

      const roomData = this.roomManager.getRoomData(actualRoom);
      if (roomData) {
        this.camera.setBounds(2, roomData.width - 2, 2, roomData.height - 2);
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
    // promised your book of business would matter against Rachel.
    // Strong portfolio blunts her case; a weak one is her exhibit A.
    if (encounterId === 'rachel_boss' && ENEMY_STATS.rachel_boss) {
      const base = ENEMY_STATS.rachel_boss;
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

    this.transition.fadeOut(0.3).then(() => {
      const combatState = new CombatState(
        this.stateManager,
        this.player,
        encounterId,
        (result) => {
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
                  this._scheduleNextClient();
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
            this._handleDefeat();
          }
        },
        enemyOverrides
      );
      this.stateManager.push(combatState);
      this.transition.remove();
    });
  }

  _autoSave(showToast = true) {
    SaveManager.save(this.player.serialize());
    if (showToast) this._showToast('Game saved.', 'info');
  }

  _handleDefeat() {
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
      { started: 'rachel_fight_started',            defeated: 'act5_complete' },
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
    const msg = document.createElement('div');
    msg.className = 'combat-message';
    msg.style.zIndex = '200';
    msg.textContent = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
    document.getElementById('ui-overlay').appendChild(msg);
    setTimeout(() => {
      if (msg.parentNode) msg.parentNode.removeChild(msg);
    }, 3000);
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
    if (client.mutators?.length) {
      const labels = client.mutators.map(m => `${m.label} — ${m.desc}`).join('  ·  ');
      setTimeout(() => this._showToast(`⚠ ${labels}`, 'info'), 1500);
    }
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

  _handleReceptionDesk() {
    const tutorialPhase = this.player.getFlag('retry_karen') && !this.player.getFlag('defeated_karen');
    if (!this.player.getFlag('defeated_karen') && !tutorialPhase) {
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

  _onClientDecision(accepted, clientData, opts = {}) {
    // Track chain state if this client is part of a beneficiary chain
    this._updateChainState(clientData, accepted);

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

      this.player.setFlag('portfolioClients', (this.player.getFlag('portfolioClients') || 0) + 1);
      this.player.setFlag('portfolioAUM',     (this.player.getFlag('portfolioAUM')     || 0) + clientData.assets);
      this.player.setFlag('portfolioFees',    (this.player.getFlag('portfolioFees')    || 0) + clientData.annualFees);
      this._updatePortfolioDisplay();

      // Award AUM currency (player's spending money) — 1% of assets, minimum 50.
      // Negotiation gamble: 1.5x on success, 0.75x on failure.
      let aumEarned = Math.max(50, Math.floor(clientData.assets * 0.01));
      if (opts.negotiated) aumEarned = Math.floor(aumEarned * (opts.success ? 1.5 : 0.75));
      this.player.stats.aum = (this.player.stats.aum || 0) + aumEarned;
      this._updateMiniStats();
      AchievementManager.check(this.player, { event: 'client_accepted', assets: clientData.assets, attributes: clientData.attributes });

      // Personal bests (shown in the Stats tab)
      if (clientData.assets > (this.player.getFlag('pb_richest_client') || 0)) {
        this.player.setFlag('pb_richest_client', clientData.assets);
      }
      if (aumEarned > (this.player.getFlag('pb_best_aum_single') || 0)) {
        this.player.setFlag('pb_best_aum_single', aumEarned);
      }
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

      if (opts.negotiated && opts.success) {
        this._showToast(`Negotiated premium fees! ${clientData.name} onboarded at +${aumEarned.toLocaleString()} AUM.`, 'item');
      } else if (opts.negotiated) {
        this._showToast(`They haggled you down. +${aumEarned.toLocaleString()} AUM — and the boss heard about it.`, 'info');
      } else {
        this._showToast(`${clientData.name} onboarded! +${aumEarned.toLocaleString()} AUM earned.`, 'item');
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
    const portfolioCount = this.player.getFlag('portfolioClients') || 0;
    if (portfolioCount > 0 && portfolioCount % 5 === 0) {
      setTimeout(() => this._showQuarterlyReview(), 800);
      return; // quarterly review will generate next client when dismissed
    }

    // Generate the next client after a short pause if still in reception
    this._scheduleNextClient();
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

    // Portfolio health affects story: good portfolio = ammo against Rachel
    // in Act 5+. Consumed by the rachel_boss fight (_startCombat applies
    // enemy stat overrides + rachel_boss_combat branches on the flags) —
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
      this._scheduleNextClient();
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
      const prev = this.player.getFlag('rossAngerDebuffTotal') || { atk: 0, def: 0 };
      this.player.setFlag('rossAngerDebuffTotal', { atk: prev.atk + actualAtkLoss, def: prev.def + actualDefLoss });
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
    // Reverse Ross anger debuffs
    const rossDebuff = this.player.getFlag('rossAngerDebuffTotal') || { atk: 0, def: 0 };
    if (typeof rossDebuff === 'object') {
      this.player.stats.atk += rossDebuff.atk || 0;
      this.player.stats.def += rossDebuff.def || 0;
    } else if (rossDebuff > 0) {
      // Legacy: old format was a single number
      this.player.stats.atk += rossDebuff;
      this.player.stats.def += rossDebuff;
    }
    this.player.setFlag('currentClient', null);
    this.player.setFlag('bossAnger', 0);
    this.player.setFlag('clientBuffTotal', null);
    this.player.setFlag('rossAngerDebuffTotal', 0);
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
      const clientRaw = this.player.getFlag('currentClient');
      if (clientRaw) {
        if (clientRaw !== this._lastClientPromptRaw) {
          this._lastClientPromptRaw = clientRaw;
          this._clientPromptText = null;
          try {
            const client = JSON.parse(clientRaw);
            if (client) this._clientPromptText = `Meet ${client.name}`;
          } catch {
            this._clientPromptText = null;
          }
        }
        if (this._clientPromptText) return this._clientPromptText;
      }
      return 'Reception Desk';
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

  _interact() {
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
      npc.faceTowards(this.player.position.x, this.player.position.z);

      // Reception client NPC triggers roguelike combat directly
      if (npc.id === 'reception_client') {
        this._handleReceptionDesk();
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

  _getDialogId(npc) {
    const id = npc.id;
    const act = this.player.actIndex;

    // Combat retry check runs first — overrides hardcoded dialogId on NPC
    const retryEncId = id === 'ross' ? 'ross_boss' : id;
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

    // Janitor riddles take priority over hardcoded dialogId (available act 3+, after meeting janitor AND after act3 confrontation)
    if (id === 'janitor' && this.player.actIndex >= 3 && this.player.getFlag('met_janitor') && this.player.getFlag('read_janitor_act3')) {
      if (!this.player.getFlag('janitor_riddle_1_done') && DIALOGS.janitor_riddle_1) return 'janitor_riddle_1';
      if (this.player.getFlag('janitor_riddle_1_done') && !this.player.getFlag('janitor_riddle_2_done') && DIALOGS.janitor_riddle_2) return 'janitor_riddle_2';
      if (this.player.getFlag('janitor_riddle_2_done') && !this.player.getFlag('janitor_riddle_3_done') && DIALOGS.janitor_riddle_3) return 'janitor_riddle_3';
    }

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

    // Ross act-4 rally can FAIL (3-of-4 buzzword check) — keep offering
    // it until he's rallied. Progression requires ross_rallied (the
    // Janitor won't move without him), so act stays 4 until this lands.
    // Bounded to act 4 exactly to match the _act4 stage band.
    if (id === 'ross' && act === 4 && !this.player.getFlag('ross_rallied') && DIALOGS.ross_act4) {
      return 'ross_act4';
    }

    // Rachel the trust officer (`rachel_to`, cubicle farm): the first
    // conversation is always her introduction, whatever act the player finds
    // her in. Her room entries carry the act-band return dialogs; routing the
    // intro here keeps those three entries mutually exclusive, so she can
    // never appear twice on the same chair.
    if (id === 'rachel_to' && !this.player.getFlag('met_rachel_to') && DIALOGS.rachel_to_intro) {
      return 'rachel_to_intro';
    }

    if (npc.dialogId && npc.dialogId !== npc.id && DIALOGS[npc.dialogId]) {
      return npc.dialogId;
    }

    // Rachel paces the executive floor during Acts 3-4 (#20). First meeting
    // plays her intro; generic act routing then serves rachel_act3 (which
    // sets its own read flag) and rachel_return. Placed AFTER the hardcoded
    // dialogId check, and ceilinged at act4_complete so the board-room boss
    // era can never serve the stale intro.
    if (id === 'rachel'
        && !this.player.getFlag('act4_complete')
        && !this.player.getFlag('met_rachel')
        && DIALOGS.rachel_intro) {
      return 'rachel_intro';
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
      const hasAct2 = this.player.getFlag('karen_defeated') && !this.player.getFlag('knows_server_secret')
        && !this.player.getFlag('act2_complete') && DIALOGS.alex_it_act2;
      const hasAct3 = this.player.getFlag('act2_complete') && !this.player.getFlag('alex_it_act3_done') && DIALOGS.alex_it_act3;

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

    // Ross post-Karen debrief: required before Chad fight
    if (id === 'ross' && this.player.getFlag('karen_defeated') && !this.player.getFlag('ross_post_karen')) {
      return 'ross_post_karen';
    }

    // Ross post-Chad debrief: required before Grandma fight
    if (id === 'ross' && this.player.getFlag('chad_defeated') && !this.player.getFlag('ross_post_chad')) {
      return 'ross_post_chad';
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

    // The Janitor never falls through to generic act routing — his act3/
    // act4/act6 story beats are served ONLY by the gated Archive entries
    // (explicit dialogIds, security_guard → act3 → needs_ross → act4
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
    // ross_act2 and janet_act2 both reference the Karen binder incident — hold them until Karen is defeated
    if (act >= 1 && (id === 'ross' || id === 'janet') && !this.player.getFlag('karen_defeated') && !this.player.getFlag(`read_${id}_act2`)) {
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
      ross_office: "Skip's Office",
      ross_office_large: "Skip's Office",   // renovated variant (_resolveRoomId)
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
      if (this.player.getFlag('has_rolex')) return 'Enter the Penthouse — you have the Janitor\'s Rolex';
      const allyFlags = [
        { flag: 'janet_act6_rallied',  label: 'Janet' },
        { flag: 'diane_act6_rallied',  label: 'Diane' },
        { flag: 'intern_act6_rallied', label: 'Intern' },
        { flag: 'ross_speech_ready',   label: 'Skip' },
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
      if (rallied < 5 || evidence < 2) {
        const lines = [`Prepare for the finale (${rallied}/5 allies, ${evidence}/2 evidence)`];
        if (missingAllies.length)   lines.push(`Rally:<br>${missingAllies.map(a => `• ${a.label}`).join('<br>')}`);
        if (missingEvidence.length) lines.push(`Evidence:<br>${missingEvidence.map(e => `• ${e.label}`).join('<br>')}`);
        return lines.join('<br>');
      }
      return 'Get the Janitor\'s Rolex';
    }

    // Act 5
    if (this.player.getFlag('rachel_fight_started')) {
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
    if (this.player.getFlag('has_charter')) {
      return 'Return to the cubicle farm with the charter';
    }
    if (this.player.getFlag('vault_accessible') && !this.player.getFlag('has_charter')) {
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
      const rallied = ['janet_rallied', 'diane_rallied', 'ross_rallied', 'janitor_rallied'].filter(f => this.player.getFlag(f)).length;
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
    if (this.player.getFlag('act2_complete') && !this.player.getFlag('knows_server_secret')) {
      return 'Talk to Alex from IT about the encrypted partition';
    }

    // Act 2 finale — after partition reveal, point back to Alex for act3 beat
    if (this.player.getFlag('act2_complete') && !this.player.getFlag('alex_it_act3_done')) {
      return 'Talk to Alex from IT — the partition decrypted itself';
    }
    if (this.player.getFlag('act2_complete')) {
      return 'Something strange is happening. Investigate.';
    }
    if (
      this.player.getFlag('regional_defeated') ||
      this.player.getFlag('compliance_defeated') ||
      this.player.getFlag('ross_defeated')
    ) {
      return 'Something strange is happening...';
    }
    if (this.player.getFlag('ending_started')) {
      return 'Face the consequences';
    }
    if (this.player.getFlag('branch_chosen')) {
      return 'Head to the Executive Floor';
    }
    if (this.player.getFlag('grandma_defeated')) {
      return 'Review the Henderson file at your desk';
    }
    if (this.player.getFlag('chad_defeated') && this.player.getFlag('ross_post_chad')) {
      return 'Meet Grandma Henderson in the Conference Room';
    }
    if (this.player.getFlag('chad_defeated')) {
      return "Talk to Skip in his office";
    }
    if (this.player.getFlag('karen_defeated') && this.player.getFlag('ross_post_karen')) {
      return 'Meet Chad Henderson in the Conference Room';
    }
    if (this.player.getFlag('karen_defeated')) {
      return "Talk to Skip in his office";
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

    if (!this.player.getFlag('checked_desk') && !this.player.getFlag('ready_for_ross')) {
      return 'Find your cubicle and settle in';
    }
    if (!this.player.getFlag('ready_for_ross')) {
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
    // Auto-gate Ross until all four coworkers have been met
    if (
      this.player.getFlag('met_janet') &&
      this.player.getFlag('met_intern') &&
      this.player.getFlag('met_isaiah') &&
      this.player.getFlag('met_alex_it') &&
      !this.player.getFlag('ready_for_ross')
    ) {
      this.player.setFlag('ready_for_ross', true);
    }

    // Act 6: the Janitor only hands over the Rolex once the team is
    // actually assembled — 5 allies + 2 pieces of evidence (the counter
    // the objective panel demands). Derived flag because room NPC
    // conditions support a single flag/notFlag pair (logic-sweep MAJOR #7).
    if (
      this.player.getFlag('act5_complete') &&
      this.player.getFlag('janet_act6_rallied') &&
      this.player.getFlag('diane_act6_rallied') &&
      this.player.getFlag('intern_act6_rallied') &&
      this.player.getFlag('ross_speech_ready') &&
      this.player.getFlag('grandma_ally') &&
      this.player.getFlag('diane_evidence') &&
      this.player.getFlag('isaiah_evidence') &&
      !this.player.getFlag('act6_ready')
    ) {
      this.player.setFlag('act6_ready', true);
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

  _showToast(text, tone = 'info') {
    if (!this.toastContainer || !text) return;

    const toast = document.createElement('div');
    toast.className = `hud-toast ${tone}`;
    toast.textContent = text;
    this.toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 250);
    }, 2600);
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

  _showMonologue(text) {
    if (!this.monologueElement || !text) return;
    // Cancel any existing monologue timer
    if (this._monologueTimer) clearTimeout(this._monologueTimer);

    this.monologueElement.textContent = text;
    this.monologueElement.classList.add('visible');

    this._monologueTimer = setTimeout(() => {
      this.monologueElement.classList.remove('visible');
      this._monologueTimer = null;
    }, 5000);
  }

  update(dt) {
    if (this.paused) return;

    this._updateWallFade(dt);

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

    const { x, z } = InputManager.getMovementVector();
    this.player.move(x, z, dt, this.tileMap);
    this.player.update(dt);

    this.camera.follow(this.player.position.x, this.player.position.z, 0);
    this.camera.update(dt);

    this.roomManager.update(dt, this.player.flags, this.paused);

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

    if (InputManager.isCancelPressed()) {
      const menuState = new MenuState(this.stateManager, this.player);
      this.stateManager.push(menuState);
    }

    Engine.renderScene(Engine.scene, Engine.camera);
    Engine.skipDefaultRender();
  }

  _showDevPanel() {
    showDevPanel(this);
  }
}
