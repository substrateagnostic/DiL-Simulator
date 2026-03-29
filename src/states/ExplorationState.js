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
import { generateClient, generateBeneficiaryChain, applyChainModifiers, calculatePortfolioHealth } from '../data/ClientGenerator.js';
import { ENEMY_STATS, XP_TABLE } from '../data/stats.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { ROOM_THOUGHTS, STORY_THOUGHTS } from '../data/thoughts.js';
import { SaveManager } from '../core/SaveManager.js';
import { AchievementManager } from '../core/AchievementManager.js';
import { ShopState } from './ShopState.js';

const INTERACTION_OFFSETS = [
  [0, 0],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const QUEST_OBJECTIVES = {
  main_act1: {
    0: 'Find your cubicle and settle in',
    1: 'Meet your coworkers',
    2: 'Report to Ross for your assignment',
    3: 'Handle the Henderson Trust meetings',
    4: 'Meet Karen Henderson in the Conference Room',
  },
  main_act2: {
    0: 'Meet Karen Henderson in the Conference Room',
    1: 'Meet Chad Henderson in the Conference Room',
    2: 'Meet Grandma Henderson in the Conference Room',
    3: 'Make your recommendation on the Henderson Trust',
  },
  main_act3: {
    0: 'Head to the Executive Floor',
    1: 'Face the consequences',
  },
  henderson_trust: {
    briefing: 'Meet Karen Henderson in the Conference Room',
  },
  main_act4: {
    0: 'Investigate the strange occurrences',
    1: 'Rally the team: Talk to Janet, Diane, and the Mysterious Janitor',
    2: 'Convince Ross to stand up for the department',
    3: 'Access the HR Department',
    4: 'Find the Vault behind the Archive',
    5: 'Retrieve the 1947 charter from the Vault',
  },
  main_act5: {
    0: 'Defend the department from the Restructuring Team',
    1: 'Defeat the Brand Consultant',
    2: 'Defeat the Corporate Lawyer',
    3: 'Access the Board Room',
    4: 'Confront Rachel in the Board Room',
  },
  main_act6: {
    0: 'Rally the team for the board meeting',
    1: 'Gather evidence against Rachel',
    2: 'Get Ross to prepare his speech',
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
    Engine.scene.add(this.player.mesh);
    this._createHUD();
    this._loadRoom(this.player.currentRoom);
    this._updateLocationDisplay(this.player.currentRoom);
    AudioManager.playMusic(this._getMusicForRoom(this.player.currentRoom));

    this._listeners.push(
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
              const dialogState = new DialogState(DIALOGS[dialogId], this.player, this.stateManager, dialogId);
              this.stateManager.push(dialogState);
            }, 500);
          }
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
      EventBus.on('flag-set', ({ key }) => {
        this._refreshStoryProgress();
        if (key === 'briefing_complete' && !this.player.getFlag('defeated_intern')) {
          this._showToast('Optional: spar with the Intern for a quick combat tutorial.', 'item');
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
          this._showToast('The Archive is now accessible from the stairwell.', 'objective');
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
          this._showToast('Rachel has locked down the building. Rally Janet, Diane, and the Janitor!', 'objective');
        }
        if (key === 'act5_complete') {
          this._showToast('Rachel is defeated, but the board meets tomorrow. Prepare the team!', 'objective');
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
        // Arcade minigame launch
        if (key === 'launch_arcade') {
          this.player.setFlag('launch_arcade', false);
          import('./ArcadeState.js').then(({ ArcadeState }) => {
            const arcadeState = new ArcadeState(this.stateManager, this.player);
            this.stateManager.push(arcadeState);
          });
        }
        // Penthouse encounters chain: CFO's assistant → Regional Director → Algorithm
        if (key === 'penthouse_entered') {
          setTimeout(() => this._startCombat('cfos_assistant'), 2000);
        }
        if (key === 'cfos_defeated') {
          setTimeout(() => this._startCombat('regional_director'), 1500);
        }
        if (key === 'regional_director_defeated') {
          setTimeout(() => this._startCombat('algorithm'), 1500);
        }
        // Act 6 → 7 transition: all allies rallied + rolex = penthouse unlocks
        if (key === 'has_rolex') {
          this.player.setFlag('act6_complete', true);
        }
        if (key === 'has_charter') {
          this._showToast('You have the 1947 Charter! Its power resonates through the building.', 'item');
        }
        // Wire quest completion flags to ability unlock system
        const questFlagMap = {
          quest_legacy_admin_complete: 'legacy_admin',
          quest_network_ghost_complete: 'network_ghost',
          quest_daves_legacy_complete: 'daves_legacy',
          quest_printers_soul_complete: 'printers_soul',
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
        // Story thoughts triggered by flags
        if (STORY_THOUGHTS[key]) {
          setTimeout(() => this._showMonologue(STORY_THOUGHTS[key]), 2000);
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
          if (DIALOGS.security_guard_combat) {
            setTimeout(() => {
              const dialogState = new DialogState(DIALOGS['security_guard_combat'], this.player, this.stateManager, 'security_guard_combat');
              this.stateManager.push(dialogState);
            }, 800);
          }
        }

        // Act 5 trigger: entering cubicle farm with charter triggers restructuring team (one-time)
        if (roomId === 'cubicle_farm' && this.player.getFlag('has_charter') && !this.player.getFlag('act4_complete') && !this.player.getFlag('act5_triggered') && DIALOGS.act5_trigger) {
          this.player.setFlag('act5_triggered');
          setTimeout(() => {
            const dialogState = new DialogState(DIALOGS['act5_trigger'], this.player, this.stateManager, 'act5_trigger');
            this.stateManager.push(dialogState);
          }, 800);
        }

        // Board Room: first visit with act5 triggers Rachel boss
        if (roomId === 'board_room' && this.player.getFlag('act4_complete') && !this.player.getFlag('act5_complete') && !this.player.getFlag('rachel_fight_started')) {
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
  }

  resume() {
    this.paused = false;
    this._updateMiniStats();
    this._updatePortfolioDisplay();
    this._refreshStoryProgress(true);
    AudioManager.playMusic(this._getMusicForRoom(this.player.currentRoom));
    // Check for upgrade points tooltip
    this._checkUpgradeTooltip();
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

  _loadRoom(roomId, spawnX, spawnZ) {
    const result = this.roomManager.loadRoom(roomId, spawnX, spawnZ);
    if (result) {
      this.tileMap = result.tileMap;
      this.player.setPosition(result.spawnX, result.spawnZ);
      this.player.currentRoom = roomId;
      this.camera.snapTo(result.spawnX, result.spawnZ);

      const roomData = this.roomManager.getRoomData(roomId);
      if (roomData) {
        this.camera.setBounds(2, roomData.width - 2, 2, roomData.height - 2);
      }
    }
  }

  async _changeRoom(targetRoom, spawnX, spawnZ) {
    // Room gating — check access before allowing entry
    const gatedRooms = {
      archive: { flag: 'archive_accessible', message: "The freight elevator won't move. You need a keycard." },
      hr_department: { flag: 'hr_accessible', message: "The HR Department is locked down. You need authorization." },
      vault: { flag: 'vault_accessible', message: "The vault door is sealed shut. You need more information." },
      board_room: { flag: 'board_room_accessible', message: "The Board Room is restricted. Executive access only." },
      penthouse: { flag: 'act6_complete', message: "The staircase to the Penthouse is sealed. You need the Janitor's Rolex." },
    };
    const gate = gatedRooms[targetRoom];
    if (gate && !this.player.getFlag(gate.flag)) {
      this._showToast(gate.message, 'info');
      return;
    }

    this.paused = true;
    AudioManager.playSfx('door');

    const currentRoom = this.player.currentRoom;
    const goingDown = targetRoom === 'archive' || (targetRoom === 'vault' && currentRoom === 'archive');
    const goingUp = currentRoom === 'archive' && targetRoom === 'stairwell';

    if (goingDown) {
      await this.transition.wipeDownOut(0.4);
    } else if (goingUp) {
      await this.transition.wipeUpOut(0.4);
    } else {
      await this.transition.fadeOut(0.3);
    }

    Engine.scene.remove(this.player.mesh);
    this.roomManager._clearCurrentRoom();

    const result = this.roomManager.loadRoom(targetRoom, spawnX, spawnZ);
    if (result) {
      this.tileMap = result.tileMap;
      this.player.setPosition(result.spawnX, result.spawnZ);
      this.player.currentRoom = targetRoom;
      Engine.scene.add(this.player.mesh);
      this.camera.snapTo(result.spawnX, result.spawnZ);

      const roomData = this.roomManager.getRoomData(targetRoom);
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

    if (goingDown) {
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

    this.transition.fadeOut(0.3).then(() => {
      const combatState = new CombatState(
        this.stateManager,
        this.player,
        encounterId,
        (result) => {
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
                  this._showToast('3 clients handled — Level 3 reached! You\'re ready for Karen.', 'objective');
                } else if (wins < 3) {
                  this._showToast(`Client ${wins}/3 handled — keep building experience!`, 'objective');
                }
              }

              const clientRaw = this.player.getFlag('currentClient');
              if (clientRaw) {
                let clientData;
              try { clientData = JSON.parse(clientRaw); } catch { clientData = null; }
              if (!clientData) return;
                setTimeout(() => {
                  const reviewState = new ClientReviewState(
                    this.stateManager,
                    this.player,
                    clientData,
                    (accepted) => this._onClientDecision(accepted, clientData)
                  );
                  this.stateManager.push(reviewState);
                }, 500);
              }
              return;
            }

            this.player.setFlag(`defeated_${encounterId}`);
            EventBus.emit('combat-won', encounterId);
            this._updateMiniStats();
            this._autoSave(true);

            const encounter = ENCOUNTERS[encounterId];
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
    this._loadRoom('cubicle_farm');

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

    const existing = this.player.getFlag('currentClient');
    if (existing) {
      let client;
      try { client = JSON.parse(existing); } catch { client = null; }
      if (!client) { this.player.setFlag('currentClient', null); return; }
      this._applyClientToGameData(client);
      setTimeout(() => this._showToast(`${client.name} is waiting for you.`, 'objective'), 600);
    } else {
      const client = generateClient(null, this.player.stats.level);
      this.player.setFlag('currentClient', JSON.stringify(client));
      this._applyClientToGameData(client);
      setTimeout(() => this._showToast(`New client waiting: ${client.name}`, 'objective'), 600);
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

  _onClientDecision(accepted, clientData) {
    // Track chain state if this client is part of a beneficiary chain
    this._updateChainState(clientData, accepted);

    if (accepted) {
      this._applyClientAcceptBuff(clientData);
      const anger = Math.min(10, Math.max(0, (this.player.getFlag('bossAnger') || 0) + clientData.netAngerDelta));
      this.player.setFlag('bossAnger', anger);

      this.player.setFlag('portfolioClients', (this.player.getFlag('portfolioClients') || 0) + 1);
      this.player.setFlag('portfolioAUM',     (this.player.getFlag('portfolioAUM')     || 0) + clientData.assets);
      this.player.setFlag('portfolioFees',    (this.player.getFlag('portfolioFees')    || 0) + clientData.annualFees);
      this._updatePortfolioDisplay();

      // Award AUM currency (player's spending money) — 1% of assets, minimum 50
      const aumEarned = Math.max(50, Math.floor(clientData.assets * 0.01));
      this.player.stats.aum = (this.player.stats.aum || 0) + aumEarned;
      this._updateMiniStats();
      AchievementManager.check(this.player, { event: 'client_accepted' });
      this._autoSave(false);

      this._showToast(`${clientData.name} onboarded! +${aumEarned.toLocaleString()} AUM earned.`, 'item');
      this._checkBossAnger();
    } else {
      // Declining bad clients reduces anger slightly; declining good ones has no benefit
      const declineDelta = clientData.netAngerDelta > 0 ? -1 : 1;
      const anger = Math.min(10, Math.max(0, (this.player.getFlag('bossAnger') || 0) + declineDelta));
      this.player.setFlag('bossAnger', anger);
      this._showToast(`Client declined.`, 'info');
    }

    this.player.setFlag('currentClient', null);

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

    // 20% chance to generate a beneficiary chain (starts at client #4+)
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

    return generateClient(null, this.player.stats.level);
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

    // Portfolio health affects story: good portfolio = ammo against Rachel in Act 5+
    const act = this.player.actIndex || 1;
    let storyNote = '';
    if (act >= 5 && health.score >= 70) {
      storyNote = '<div class="qr-story-note">Your strong portfolio gives you leverage against Rachel\'s restructuring arguments.</div>';
      this.player.setFlag('portfolio_strong', true);
    } else if (act >= 5 && health.score < 40) {
      storyNote = '<div class="qr-story-note qr-story-warn">Rachel will use your weak portfolio as evidence for restructuring.</div>';
      this.player.setFlag('portfolio_strong', false);
    }

    // Reward or penalty based on grade
    const XP_BY_GRADE = { 'A+': 150, 'A': 150, 'B': 100, 'C': 50, 'D': 25, 'F': 0 };
    const xpReward = XP_BY_GRADE[health.grade] ?? 0;
    if (xpReward > 0) this.player.gainXP(xpReward);

    let rewardText = '';
    if (health.score >= 80) {
      this.player.stats.atk += 1;
      this.player.stats.def += 1;
      this._updateMiniStats();
      rewardText = `Ross is impressed. ATK +1, Composure +1. +${xpReward} XP`;
    } else if (health.score < 40) {
      const anger = Math.min(10, (this.player.getFlag('bossAnger') || 0) + 2);
      this.player.setFlag('bossAnger', anger);
      rewardText = `Ross is disappointed. Boss Anger +2.${xpReward > 0 ? ` +${xpReward} XP` : ''}`;
    } else {
      rewardText = `Ross gives a noncommittal nod. Acceptable performance.${xpReward > 0 ? ` +${xpReward} XP` : ''}`;
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
      this._showToast('Ross: "Your client choices are an embarrassment." (ATK -3, Composure -3)', 'objective');
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

    for (const [dx, dz] of INTERACTION_OFFSETS) {
      if (!interactable) {
        const data = this.tileMap?.getInteractable(px + dx, pz + dz);
        if (data) interactable = { x: px + dx, z: pz + dz, data };
      }
      if (!exit) {
        const data = this.tileMap?.getExit(px + dx, pz + dz);
        if (data) exit = { x: px + dx, z: pz + dz, data };
      }
      if (exit && interactable) break;
    }

    return { exit, interactable };
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
        let client;
        try { client = JSON.parse(clientRaw); } catch { client = null; }
        if (client) return `Meet ${client.name}`;
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
      return `Supply Shop (${aum.toLocaleString()} AUM)`;
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

      const dialogId = this._getDialogId(npc);
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

  _getDialogId(npc) {
    const id = npc.id;
    const act = this.player.actIndex;

    // Combat retry check runs first — overrides hardcoded dialogId on NPC
    const retryEncId = { ross: 'ross_boss' }[id] || id;
    if (DIALOGS[`${retryEncId}_retry`] && this.player.getFlag(`retry_${retryEncId}`) && !this.player.getFlag(`defeated_${retryEncId}`)) {
      return `${retryEncId}_retry`;
    }

    if (npc.dialogId && npc.dialogId !== npc.id && DIALOGS[npc.dialogId]) {
      return npc.dialogId;
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

    // Special: Alex from IT + archive evidence = Act 4 trigger
    if (
      id === 'alex_it' &&
      this.player.getFlag('has_archive_evidence') &&
      !this.player.getFlag('act3_complete') &&
      DIALOGS.act4_trigger
    ) {
      return 'act4_trigger';
    }

    // Janitor riddle progression (available from act 3+)
    if (id === 'janitor' && act >= 3) {
      if (!this.player.getFlag('janitor_riddle_1_done') && DIALOGS.janitor_riddle_1) return 'janitor_riddle_1';
      if (this.player.getFlag('janitor_riddle_1_done') && !this.player.getFlag('janitor_riddle_2_done') && DIALOGS.janitor_riddle_2) return 'janitor_riddle_2';
      if (this.player.getFlag('janitor_riddle_2_done') && !this.player.getFlag('janitor_riddle_3_done') && DIALOGS.janitor_riddle_3) return 'janitor_riddle_3';
    }

    // Compliance crossword (available when act >= 3 and compliance NPC is on exec floor)
    if (id === 'compliance' && act >= 3 && !this.player.getFlag('compliance_crossword_done') && DIALOGS.compliance_crossword) {
      return 'compliance_crossword';
    }

    // Social engineering chain (act 4+): Isaiah → Diane → Intern
    if (act >= 4 && !this.player.getFlag('social_eng_complete')) {
      if (id === 'isaiah' && !this.player.getFlag('social_eng_started') && DIALOGS.social_engineering_1) return 'social_engineering_1';
      if (id === 'diane' && this.player.getFlag('social_eng_started') && !this.player.getFlag('social_eng_diane') && DIALOGS.social_engineering_2) return 'social_engineering_2';
      if (id === 'intern' && this.player.getFlag('social_eng_diane') && DIALOGS.social_engineering_3) return 'social_engineering_3';
    }

    if (act >= 7 && DIALOGS[`${id}_act7`] && !this.player.getFlag(`read_${id}_act7`)) return `${id}_act7`;
    if (act >= 6 && DIALOGS[`${id}_act6`] && !this.player.getFlag(`read_${id}_act6`)) return `${id}_act6`;
    if (act >= 4 && DIALOGS[`${id}_act4`] && !this.player.getFlag(`read_${id}_act4`)) return `${id}_act4`;
    if (act >= 3 && DIALOGS[`${id}_act3`] && !this.player.getFlag(`read_${id}_act3`)) return `${id}_act3`;
    if (act >= 1 && DIALOGS[`${id}_act2`] && !this.player.getFlag(`read_${id}_act2`)) return `${id}_act2`;
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
    this.promptElement.innerHTML = '<kbd>E</kbd> Interact';
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
      ross_office: "Ross's Office",
      conference_room: 'Conference Room',
      server_room: 'IT Server Room',
      reception: 'Reception',
      parking_garage: 'Parking Garage',
      executive_floor: 'Executive Floor',
      stairwell: 'The Stairwell',
      archive: 'The Archive',
      hr_department: 'HR Department',
      vault: 'The Vault',
      board_room: 'The Board Room',
      penthouse: 'The Penthouse',
    };
    if (this.locationElement) {
      this.locationElement.textContent = names[roomId] || roomId;
    }
  }

  _showInteractPrompt(text, isRead = false) {
    if (this.promptElement) {
      const key = ('ontouchstart' in window) ? 'A' : 'E';
      this.promptElement.innerHTML = `<kbd>${key}</kbd> ${text || 'Interact'}`;
      this.promptElement.style.display = 'block';
      this.promptElement.classList.toggle('read', isRead);
    }
  }

  _hideInteractPrompt() {
    if (this.promptElement) {
      this.promptElement.style.display = 'none';
    }
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

  _getStoryObjective() {
    // Game complete
    if (this.player.getFlag('algorithm_defeated')) {
      return 'The story is over. Thank you for playing.';
    }

    // Act 7
    if (this.player.getFlag('act6_complete')) {
      if (this.player.getFlag('regional_director_defeated')) return 'Face The Algorithm in the Penthouse';
      if (this.player.getFlag('cfos_defeated')) return 'Defeat the Regional Director';
      return 'Ascend to the Penthouse and face The Algorithm';
    }

    // Act 6
    if (this.player.getFlag('act5_complete')) {
      if (this.player.getFlag('has_rolex')) return 'Enter the Penthouse — you have the Janitor\'s Rolex';
      const allyFlags = [
        { flag: 'janet_act6_rallied',  label: 'Janet' },
        { flag: 'diane_act6_rallied',  label: 'Diane' },
        { flag: 'intern_rallied',      label: 'Intern' },
        { flag: 'ross_speech_ready',   label: 'Ross' },
      ];
      const evidenceFlags = [
        { flag: 'diane_evidence',  label: "Diane's documents" },
        { flag: 'isaiah_evidence', label: "Isaiah's records" },
      ];
      const missingAllies   = allyFlags.filter(a => !this.player.getFlag(a.flag));
      const missingEvidence = evidenceFlags.filter(e => !this.player.getFlag(e.flag));
      const rallied = allyFlags.length - missingAllies.length;
      const evidence = evidenceFlags.length - missingEvidence.length;
      if (rallied < 4 || evidence < 2) {
        const lines = [`Prepare for the finale (${rallied}/4 allies, ${evidence}/2 evidence)`];
        if (missingAllies.length)   lines.push(`Rally:<br>${missingAllies.map(a => `• ${a.label}`).join('<br>')}`);
        if (missingEvidence.length) lines.push(`Evidence:<br>${missingEvidence.map(e => `• ${e.label}`).join('<br>')}`);
        return lines.join('<br>');
      }
      return 'Get the Janitor\'s Rolex';
    }

    // Act 5
    if (this.player.getFlag('rachel_fight_started')) {
      return 'Defeat Rachel in the Board Room';
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
      if (rallied < 4) return `Rally the team: Talk to Janet, Diane, Ross & the Janitor (${rallied}/4)`;
      return 'Open the Vault and retrieve the 1947 charter';
    }

    // Act 3
    if (this.player.getFlag('has_archive_evidence') && !this.player.getFlag('act3_complete')) {
      return 'Return the Archive evidence to Alex from IT';
    }
    if (this.player.getFlag('visited_archive') && !this.player.getFlag('has_archive_evidence')) {
      return 'Search the Archive for evidence';
    }
    if (this.player.getFlag('archive_accessible') && !this.player.getFlag('visited_archive')) {
      return 'Find the Archive through the stairwell';
    }
    if (this.player.getFlag('act2_complete') && !this.player.getFlag('alex_it_act3_done')) {
      return 'Talk to Alex from IT about the encrypted partition';
    }

    // Act 2 finale
    if (
      this.player.getFlag('act2_complete')
    ) {
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
    if (this.player.getFlag('chad_defeated')) {
      return 'Meet Grandma Henderson in the Conference Room';
    }
    if (this.player.getFlag('karen_defeated')) {
      return 'Meet Chad Henderson in the Conference Room';
    }
    if (this.player.getFlag('briefing_complete')) {
      return 'Meet Karen Henderson in the Conference Room';
    }

    if (!this.player.getFlag('checked_desk')) {
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
    return 'Report to Ross for your assignment';
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
      const sideHTML = sideHints.map(h =>
        `<div class="hud-quest-optional">${h}</div>`
      ).join('');
      this.questElement.innerHTML = `
        <div class="hud-quest-title">OBJECTIVE</div>
        <div class="hud-quest-objective">${objective}</div>
        ${sideHTML ? `<div class="hud-quest-divider"></div>${sideHTML}` : ''}
      `;
    }

    if (changed && !silent) {
      this._showToast(`Objective Updated: ${objective.replace(/<br>/gi, ' ').replace(/<[^>]+>/g, '')}`, 'objective');
    }
  }

  _getActiveSideQuestHints() {
    const hints = [];
    const f = (flag) => this.player.getFlag(flag);

    // Early optional: spar with the Intern
    if (f('briefing_complete') && !f('defeated_intern')) {
      hints.push('Optional: spar with the Intern for a combat tutorial');
    }

    // Janitor riddles — progressive
    if (f('met_janitor')) {
      if (!f('janitor_riddle_1_done')) {
        hints.push('The Janitor has a riddle for you — find him in the Archive');
      } else if (!f('janitor_riddle_2_done')) {
        hints.push('The Janitor has a second riddle waiting');
      } else if (!f('janitor_riddle_3_done')) {
        hints.push('The Janitor has one final riddle');
      }
    }

    // Motivational poster quests — only shown after Ross mentions them in the Karen loss tutorial
    if (f('retry_karen')) {
      const atkDone = ['quest_atk_1_done','quest_atk_2_done','quest_atk_3_done','quest_atk_4_done','quest_atk_5_done'].filter(f).length;
      if (atkDone < 5) {
        hints.push(`Find assertiveness posters for ATK bonuses (${atkDone}/5)`);
      }
      const defDone = ['quest_def_1_done','quest_def_2_done','quest_def_3_done','quest_def_4_done','quest_def_5_done'].filter(f).length;
      if (defDone < 5) {
        hints.push(`Find composure posters for DEF bonuses (${defDone}/5)`);
      }
    }

    // Alex IT subquests
    if (f('anomaly_started') && !f('quest_anomaly_347_complete')) {
      hints.push('Alex mentioned a signal at 3:47 AM...');
    }
    if (f('legacy_started') && !f('quest_legacy_admin_complete')) {
      hints.push('Alex needs help tracing an old admin account');
    }
    if (f('network_started') && !f('quest_network_ghost_complete')) {
      hints.push('Something strange on the network — Alex is investigating');
    }
    if (f('dave_started') && !f('quest_daves_legacy_complete')) {
      hints.push("What happened to Alex's predecessor, Dave?");
    }
    if (f('printer_quest_started') && !f('quest_printers_soul_complete')) {
      hints.push('The printer is acting stranger than usual...');
    }
    if (f('final_patch_started') && !f('quest_final_patch_complete')) {
      hints.push('Alex has a plan for the charter and the server');
    }

    return hints;
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

    const { x, z } = InputManager.getMovementVector();
    this.player.move(x, z, dt, this.tileMap);
    this.player.update(dt);

    // Slope the stairwell — player and camera descend together as they walk north
    if (this.player.currentRoom === 'stairwell') {
      const t = Math.max(0, Math.min(1, (18 - this.player.position.z) / 16));
      const elevation = -0.7 * t;
      this.player.mesh.position.y = elevation;
      this.camera.follow(this.player.position.x, this.player.position.z, elevation);
    }

    // Fade south wall when player gets close to it
    const southWallMeshes = this.roomManager.currentRoom?.getSouthWallMeshes() ?? [];
    if (southWallMeshes.length > 0 && this.tileMap) {
      const southWallZ = this.tileMap.height - 0.5;
      const dist = southWallZ - this.player.position.z;
      // Fully opaque 3+ tiles away, fades to 0.15 opacity within 1 tile
      const opacity = Math.min(1, Math.max(0.15, (dist - 1) / 2));
      for (const mesh of southWallMeshes) {
        mesh.material.opacity = opacity;
      }
    }

    // Fade east wall when player gets close to it
    const eastWallMeshes = this.roomManager.currentRoom?.getEastWallMeshes() ?? [];
    if (eastWallMeshes.length > 0 && this.tileMap) {
      const eastWallX = this.tileMap.width - 0.5;
      const dist = eastWallX - this.player.position.x;
      // Fully opaque 3+ tiles away, fades to 0.15 opacity within 1 tile
      const opacity = Math.min(1, Math.max(0.15, (dist - 1) / 2));
      for (const mesh of eastWallMeshes) {
        mesh.material.opacity = opacity;
      }
    }

    if (this.player.currentRoom !== 'stairwell') {
      this.camera.follow(this.player.position.x, this.player.position.z, 0);
    }
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
        nearExit.data.targetRoom === 'executive_floor' ? 'Ride elevator' : 'Go through'
      );
    } else if (nearNPC) {
      const dialogId = this._getDialogId(nearNPC);
      const isRead = this.player.getFlag(`read_${dialogId}`);
      this._showInteractPrompt(`Talk to ${nearNPC.name}`, isRead);
    } else if (this._shouldPrioritizeExit(nearExit, nearInteractable)) {
      this._showInteractPrompt(
        nearExit.data.targetRoom === 'executive_floor' ? 'Ride elevator' : 'Go through'
      );
    } else if (nearInteractable) {
      const dialogId = this._getInteractableDialogId(nearInteractable.data);
      const isRead = dialogId ? this.player.getFlag(`read_${dialogId}`) : false;
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

    Engine.renderer.render(Engine.scene, Engine.camera);
    Engine.skipDefaultRender();
  }
}
