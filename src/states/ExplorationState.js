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
    2: 'Report to Alex for your assignment',
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

    // Event listeners
    this._listeners = [];
  }

  enter() {
    Engine.scene.add(this.player.mesh);
    this._createHUD();
    this._loadRoom(this.player.currentRoom);
    AudioManager.playMusic('exploration');

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
      EventBus.on('flag-set', ({ key }) => {
        this._refreshStoryProgress();
        if (key === 'briefing_complete' && !this.player.getFlag('defeated_intern')) {
          this._showToast('Optional: spar with the Intern for a quick combat tutorial.', 'item');
        }
        if (key === 'branch_chosen') {
          this._showToast('The executive elevator is now unlocked.', 'objective');
        }
      }),
      EventBus.on('item-received', ({ name, quantity }) => {
        const prefix = quantity > 1 ? `${quantity}x ` : '';
        this._showToast(`Received ${prefix}${name}`, 'item');
      }),
      EventBus.on('room-entered', (roomId) => {
        this._updateLocationDisplay(roomId);
        this._refreshStoryProgress(true);

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
    AudioManager.playMusic('exploration');
  }

  syncFromPlayerState() {
    this._syncActFromFlags();
    this._refreshStoryProgress(true);
    this._updateMiniStats();
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
    this.paused = true;
    AudioManager.playSfx('door');

    await this.transition.fadeOut(0.3);

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
          this.transition.remove();
          this.transition.fadeIn(0.3).then(() => {
            this.paused = false;
          });

          if (result === 'victory') {
            this.player.setFlag(`defeated_${encounterId}`);
            EventBus.emit('combat-won', encounterId);
            this._updateMiniStats();

            const encounter = ENCOUNTERS[encounterId];
            if (encounter && encounter.postDialogId && DIALOGS[encounter.postDialogId]) {
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
      this.transition.remove();
    });
  }

  _handleDefeat() {
    this.player.rest();
    this._loadRoom('cubicle_farm');

    const msg = document.createElement('div');
    msg.className = 'combat-message';
    msg.style.zIndex = '200';
    msg.textContent = 'You wake up at your desk... Was it all a dream?';
    document.getElementById('ui-overlay').appendChild(msg);
    setTimeout(() => {
      if (msg.parentNode) msg.parentNode.removeChild(msg);
    }, 3000);
  }

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

    if (this._getInteractableDialogId(interactableTarget.data) === 'branch_decision') {
      return 'Review Henderson file';
    }

    if (interactableTarget.data.type === 'andrews_desk') {
      return 'Review desk';
    }

    return 'Examine';
  }

  _interact() {
    const npc = this.roomManager.entityManager.getNearestInteractable(
      this.player.position.x,
      this.player.position.z
    );

    if (npc) {
      npc.faceTowards(this.player.position.x, this.player.position.z);

      const dialogId = this._getDialogId(npc);
      const dialog = DIALOGS[dialogId];

      if (dialog) {
        AudioManager.playSfx('confirm');
        const dialogState = new DialogState(dialog, this.player, this.stateManager, dialogId);
        this.stateManager.push(dialogState);
      }
      return;
    }

    const { exit, interactable } = this._getNearbyTargets();

    if (this._shouldPrioritizeExit(exit, interactable)) {
      this._changeRoom(exit.data.targetRoom, exit.data.spawnX, exit.data.spawnZ);
      return;
    }

    if (interactable && interactable.data.dialogId) {
      const dialogId = this._getInteractableDialogId(interactable.data);
      const dialog = DIALOGS[dialogId];
      if (dialog) {
        AudioManager.playSfx('confirm');
        const dialogState = new DialogState(dialog, this.player, this.stateManager, dialogId);
        this.stateManager.push(dialogState);
        return;
      }
    }

    if (exit) {
      this._changeRoom(exit.data.targetRoom, exit.data.spawnX, exit.data.spawnZ);
    }
  }

  _getDialogId(npc) {
    if (npc.dialogId && npc.dialogId !== npc.id && DIALOGS[npc.dialogId]) {
      return npc.dialogId;
    }

    const id = npc.id;
    const act = this.player.actIndex;

    if (
      id === 'intern' &&
      act >= 1 &&
      this.player.getFlag('read_intern_intro') &&
      !this.player.getFlag('defeated_intern') &&
      DIALOGS.intern_combat_intro
    ) {
      return 'intern_combat_intro';
    }

    if (act >= 2 && DIALOGS[`${id}_act3`] && !this.player.getFlag(`read_${id}_act3`)) return `${id}_act3`;
    if (act >= 1 && DIALOGS[`${id}_act2`] && !this.player.getFlag(`read_${id}_act2`)) return `${id}_act2`;
    if (DIALOGS[`${id}_intro`] && !this.player.getFlag(`read_${id}_intro`)) return `${id}_intro`;
    if (DIALOGS[`${id}_return`]) return `${id}_return`;
    if (act >= 2 && DIALOGS[`${id}_act3`]) return `${id}_act3`;
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

    this.toastContainer = document.createElement('div');
    this.toastContainer.className = 'hud-toast-container';
    this.hudElement.appendChild(this.toastContainer);

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
        <span class="label">Coffee</span>
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
    this._refreshStoryProgress(true);
  }

  _syncActFromFlags() {
    let act = 0;
    if (this.player.getFlag('briefing_complete')) act = 1;
    if (this.player.getFlag('branch_chosen')) act = 2;
    this.player.actIndex = act;
  }

  _getStoryObjective() {
    if (
      this.player.getFlag('regional_defeated') ||
      this.player.getFlag('compliance_defeated') ||
      this.player.getFlag('alex_defeated')
    ) {
      return 'Take a breath. You survived your first week.';
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

    const metCoworkers = ['met_janet', 'met_dave', 'met_intern', 'met_monica']
      .filter((flag) => this.player.getFlag(flag))
      .length;

    if (!this.player.getFlag('checked_desk')) {
      return 'Find your cubicle and settle in';
    }
    if (metCoworkers < 2) {
      return 'Meet your coworkers';
    }
    return 'Report to Alex for your assignment';
  }

  _refreshStoryProgress(silent = false) {
    this._syncActFromFlags();

    let questId = 'main_act1';
    if (this.player.getFlag('briefing_complete')) questId = 'main_act2';
    if (this.player.getFlag('branch_chosen')) questId = 'main_act3';

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
      this.questElement.innerHTML = `
        <div class="hud-quest-title">OBJECTIVE</div>
        <div class="hud-quest-objective">${objective}</div>
      `;
    }

    if (changed && !silent) {
      this._showToast(`Objective Updated: ${objective}`, 'objective');
    }
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

  update(dt) {
    if (this.paused) return;

    const { x, z } = InputManager.getMovementVector();
    this.player.move(x, z, dt, this.tileMap);
    this.player.update(dt);

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

    this.camera.follow(this.player.position.x, this.player.position.z);
    this.camera.update(dt);

    this.roomManager.update(dt, this.player.flags);

    const nearNPC = this.roomManager.entityManager.getNearestInteractable(
      this.player.position.x,
      this.player.position.z
    );
    const { exit: nearExit, interactable: nearInteractable } = this._getNearbyTargets();

    if (nearNPC) {
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
