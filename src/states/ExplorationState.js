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
import { DIALOGS } from '../data/dialogs/index.js';
import { ENCOUNTERS } from '../data/encounters/index.js';
import { TransitionOverlay } from '../ui/TransitionOverlay.js';

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
    this.nearestNPC = null;
    this.nearestInteractable = null;
    this._pendingCombat = null;
    this._pendingDialog = null;

    // Quest tracking
    this.activeQuests = [];
    this.currentObjective = '';

    // Event listeners
    this._listeners = [];
  }

  enter() {
    // Add player to scene
    Engine.scene.add(this.player.mesh);

    // Create HUD elements
    this._createHUD();

    // Load initial room
    this._loadRoom(this.player.currentRoom);

    // Start exploration music
    AudioManager.playMusic('exploration');

    // Set up event listeners
    this._listeners.push(
      EventBus.on('start-combat', (data) => {
        const encounterId = typeof data === 'string' ? data : data.encounter;
        this._pendingCombat = encounterId;
      }),
      EventBus.on('dialog-end', () => {
        // Dialog ended - check for pending combat
        if (this._pendingCombat) {
          const enc = this._pendingCombat;
          this._pendingCombat = null;
          setTimeout(() => this._startCombat(enc), 300);
          return;
        }
        // Check for pending dialog chain
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
      EventBus.on('room-entered', (roomId) => {
        this._updateLocationDisplay(roomId);
        // Trigger Act 3 ending when entering executive floor
        if (roomId === 'executive_floor' && this.player.getFlag('branch_chosen') && !this.player.getFlag('ending_started')) {
          this.player.setFlag('ending_started');
          let endingDialogId = null;
          if (this.player.getFlag('path_legal')) endingDialogId = 'legal_eagle_ending';
          else if (this.player.getFlag('path_bro')) endingDialogId = 'bro_code_ending';
          else if (this.player.getFlag('path_grandma')) endingDialogId = 'secret_ending';
          if (endingDialogId && DIALOGS[endingDialogId]) {
            setTimeout(() => {
              const endingDialog = new DialogState(DIALOGS[endingDialogId], this.player, this.stateManager, endingDialogId);
              this.stateManager.push(endingDialog);
            }, 1000);
          }
        }
      }),
    );

    // Set initial quest
    this._initQuests();
  }

  exit() {
    Engine.scene.remove(this.player.mesh);
    this._removeHUD();
    // Clean up listeners
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
    // Resume exploration music after combat
    AudioManager.playMusic('exploration');
  }

  _loadRoom(roomId, spawnX, spawnZ) {
    const result = this.roomManager.loadRoom(roomId, spawnX, spawnZ);
    if (result) {
      this.tileMap = result.tileMap;
      this.player.setPosition(result.spawnX, result.spawnZ);
      this.player.currentRoom = roomId;
      this.camera.snapTo(result.spawnX, result.spawnZ);

      // Set camera bounds
      const roomData = this.roomManager.getRoomData(roomId);
      if (roomData) {
        this.camera.setBounds(2, roomData.width - 2, 2, roomData.height - 2);
      }
    }
  }

  async _changeRoom(targetRoom, spawnX, spawnZ) {
    this.paused = true;
    AudioManager.playSfx('door');

    await this.transition.fadeOut(0.3);

    // Clear current room from scene
    Engine.scene.remove(this.player.mesh);
    this.roomManager._clearCurrentRoom();

    // Load new room
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
    }

    await this.transition.fadeIn(0.3);
    this.paused = false;
  }

  _startCombat(encounterId) {
    this.paused = true;
    this.transition.fadeOut(0.3).then(() => {
      const combatState = new CombatState(
        this.stateManager,
        this.player,
        encounterId,
        (result) => {
          // Combat ended — fade back to exploration
          this.transition.remove(); // Clear any lingering overlay before fade-in
          this.transition.fadeIn(0.3).then(() => {
            this.paused = false;
          });
          if (result === 'victory') {
            this.player.setFlag(`defeated_${encounterId}`);
            EventBus.emit('combat-won', encounterId);
            this._updateMiniStats();
            // Show post-combat dialog if defined
            const encounter = ENCOUNTERS[encounterId];
            if (encounter && encounter.postDialogId && DIALOGS[encounter.postDialogId]) {
              // Chain branch decision after grandma's defeat
              if (encounterId === 'grandma' && !this.player.getFlag('branch_chosen')) {
                this._pendingDialog = 'branch_decision';
              }
              setTimeout(() => {
                const postDialog = new DialogState(DIALOGS[encounter.postDialogId], this.player, this.stateManager, encounter.postDialogId);
                this.stateManager.push(postDialog);
              }, 500);
            }
          } else if (result === 'defeat') {
            this._handleDefeat();
          }
        }
      );
      this.stateManager.push(combatState);
      this.transition.remove(); // Remove fade-out overlay so combat scene is visible
    });
  }

  _handleDefeat() {
    // Game over - heal and return to cubicle farm
    this.player.rest();
    this._loadRoom('cubicle_farm');
    // Show game over message
    const msg = document.createElement('div');
    msg.className = 'combat-message';
    msg.style.zIndex = '200';
    msg.textContent = 'You wake up at your desk... Was it all a dream?';
    document.getElementById('ui-overlay').appendChild(msg);
    setTimeout(() => { if (msg.parentNode) msg.parentNode.removeChild(msg); }, 3000);
  }

  _interact() {
    // Check for nearby NPC
    const npc = this.roomManager.entityManager.getNearestInteractable(
      this.player.position.x, this.player.position.z
    );

    if (npc) {
      // Face NPC toward player
      npc.faceTowards(this.player.position.x, this.player.position.z);

      // Get dialog tree based on NPC state and act
      const dialogId = this._getDialogId(npc);
      const dialog = DIALOGS[dialogId];

      if (dialog) {
        AudioManager.playSfx('confirm');
        const dialogState = new DialogState(dialog, this.player, this.stateManager, dialogId);
        this.stateManager.push(dialogState);
      }
      return;
    }

    // Check for tile-based interactable
    const px = Math.floor(this.player.position.x);
    const pz = Math.floor(this.player.position.z);
    // Check adjacent tiles too
    for (const [dx, dz] of [[0,0], [1,0], [-1,0], [0,1], [0,-1]]) {
      const interactable = this.tileMap?.getInteractable(px + dx, pz + dz);
      if (interactable && interactable.dialogId) {
        const dialog = DIALOGS[interactable.dialogId];
        if (dialog) {
          AudioManager.playSfx('confirm');
          const dialogState = new DialogState(dialog, this.player, this.stateManager, interactable.dialogId);
          this.stateManager.push(dialogState);
          return;
        }
      }
    }

    // Check for exit
    for (const [dx, dz] of [[0,0], [1,0], [-1,0], [0,1], [0,-1]]) {
      const exit = this.tileMap?.getExit(px + dx, pz + dz);
      if (exit) {
        this._changeRoom(exit.targetRoom, exit.spawnX, exit.spawnZ);
        return;
      }
    }
  }

  _getDialogId(npc) {
    // If NPC has an explicit dialogId that differs from its id, use it directly
    if (npc.dialogId && npc.dialogId !== npc.id && DIALOGS[npc.dialogId]) {
      return npc.dialogId;
    }

    const id = npc.id;
    const act = this.player.actIndex;

    // Check for act-specific dialog
    if (act >= 2 && DIALOGS[`${id}_act3`]) return `${id}_act3`;
    if (act >= 1 && DIALOGS[`${id}_act2`]) return `${id}_act2`;
    if (DIALOGS[`${id}_intro`]) return `${id}_intro`;
    if (DIALOGS[id]) return id;

    // Fallback
    return id;
  }

  _createHUD() {
    const overlay = document.getElementById('ui-overlay');

    this.hudElement = document.createElement('div');
    this.hudElement.className = 'exploration-hud';

    // Location name
    this.locationElement = document.createElement('div');
    this.locationElement.className = 'hud-location';
    this.locationElement.textContent = 'Cubicle Farm';
    this.hudElement.appendChild(this.locationElement);

    // Mini stats
    this.miniStatsElement = document.createElement('div');
    this.miniStatsElement.className = 'hud-mini-stats';
    this._updateMiniStats();
    this.hudElement.appendChild(this.miniStatsElement);

    // Quest tracker
    this.questElement = document.createElement('div');
    this.questElement.className = 'hud-quest-tracker';
    this.questElement.style.display = 'none';
    this.hudElement.appendChild(this.questElement);

    // Interact prompt (hidden by default)
    this.promptElement = document.createElement('div');
    this.promptElement.className = 'interact-prompt';
    this.promptElement.innerHTML = '<kbd>E</kbd> Interact';
    this.promptElement.style.display = 'none';
    this.hudElement.appendChild(this.promptElement);

    overlay.appendChild(this.hudElement);
  }

  _removeHUD() {
    if (this.hudElement && this.hudElement.parentNode) {
      this.hudElement.parentNode.removeChild(this.hudElement);
    }
  }

  _updateMiniStats() {
    if (!this.miniStatsElement) return;
    this.miniStatsElement.innerHTML = `
      <div class="hud-mini-stat">
        <span class="label">HP</span>
        <span class="value hp">${this.player.stats.hp}/${this.player.stats.maxHP}</span>
      </div>
      <div class="hud-mini-stat">
        <span class="label">☕</span>
        <span class="value mp">${this.player.stats.mp}/${this.player.stats.maxMP}</span>
      </div>
      <div class="hud-mini-stat">
        <span class="label">Lv</span>
        <span class="value">${this.player.stats.level}</span>
      </div>
    `;
  }

  _updateLocationDisplay(roomId) {
    const names = {
      cubicle_farm: 'Cubicle Farm',
      break_room: 'Break Room',
      alex_office: "Alex's Office",
      conference_room: 'Conference Room',
      server_room: 'IT Server Room',
      reception: 'Reception',
      parking_garage: 'Parking Garage',
      executive_floor: 'Executive Floor',
    };
    if (this.locationElement) {
      this.locationElement.textContent = names[roomId] || roomId;
    }
  }

  _showInteractPrompt(text, isRead = false) {
    if (this.promptElement) {
      this.promptElement.innerHTML = `<kbd>E</kbd> ${text || 'Interact'}`;
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
    // Set initial quest based on act
    this._setQuest('Find your cubicle and settle in');
  }

  _setQuest(objective) {
    this.currentObjective = objective;
    if (this.questElement) {
      this.questElement.style.display = 'block';
      this.questElement.innerHTML = `
        <div class="hud-quest-title">OBJECTIVE</div>
        <div class="hud-quest-objective">${objective}</div>
      `;
    }
  }

  _updateQuest(questId, stage) {
    // If stage is a string, it's the objective text directly
    if (typeof stage === 'string') {
      this._setQuest(stage);
      return;
    }

    // Otherwise look up by stage number
    const questObjectives = {
      'main_act1': {
        0: 'Find your cubicle and settle in',
        1: 'Meet your coworkers',
        2: 'Report to Alex for your assignment',
        3: 'Handle the Henderson Trust meetings',
        4: 'Meet Karen Henderson in the Conference Room',
      },
      'main_act2': {
        0: 'Meet Karen Henderson in the Conference Room',
        1: 'Meet Chad Henderson in the Conference Room',
        2: 'Meet Grandma Henderson in the Conference Room',
        3: 'Make your recommendation on the Henderson Trust',
      },
      'main_act3': {
        0: 'Head to the Executive Floor',
        1: 'Face the consequences',
      },
    };

    const objectives = questObjectives[questId];
    if (objectives && objectives[stage]) {
      this._setQuest(objectives[stage]);
    }
  }

  update(dt) {
    if (this.paused) return;

    // Player movement
    const { x, z } = InputManager.getMovementVector();
    this.player.move(x, z, dt, this.tileMap);
    this.player.update(dt);

    // Camera follow
    this.camera.follow(this.player.position.x, this.player.position.z);
    this.camera.update(dt);

    // Update room entities
    this.roomManager.update(dt, this.player.flags);

    // Check for nearby interactables
    const nearNPC = this.roomManager.entityManager.getNearestInteractable(
      this.player.position.x, this.player.position.z
    );

    // Check for exit and interactable tiles (current + adjacent)
    const px = Math.floor(this.player.position.x);
    const pz = Math.floor(this.player.position.z);
    let nearExit = false;
    let nearInteractable = null;
    for (const [dx, dz] of [[0,0], [1,0], [-1,0], [0,1], [0,-1]]) {
      if (!nearExit) {
        const exit = this.tileMap?.getExit(px + dx, pz + dz);
        if (exit) nearExit = true;
      }
      if (!nearInteractable) {
        const inter = this.tileMap?.getInteractable(px + dx, pz + dz);
        if (inter) nearInteractable = inter;
      }
    }

    // Show/hide interact prompt (with read state)
    if (nearNPC) {
      const dialogId = this._getDialogId(nearNPC);
      const isRead = this.player.getFlag(`read_${dialogId}`);
      this._showInteractPrompt(`Talk to ${nearNPC.name}`, isRead);
    } else if (nearExit) {
      this._showInteractPrompt('Go through');
    } else if (nearInteractable) {
      const isRead = nearInteractable.dialogId ? this.player.getFlag(`read_${nearInteractable.dialogId}`) : false;
      this._showInteractPrompt('Examine', isRead);
    } else {
      this._hideInteractPrompt();
    }

    // Interact
    if (InputManager.isInteractPressed()) {
      this._interact();
    }

    // Pause menu
    if (InputManager.isCancelPressed()) {
      const menuState = new MenuState(this.stateManager, this.player);
      this.stateManager.push(menuState);
    }

    // Render main scene (and skip Engine's default render)
    Engine.renderer.render(Engine.scene, Engine.camera);
    Engine.skipDefaultRender();
  }
}
