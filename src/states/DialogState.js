import { InputManager } from '../core/InputManager.js';
import { EventBus } from '../core/EventBus.js';
import { AudioManager } from '../core/AudioManager.js';
import { DialogBox } from '../ui/DialogBox.js';
import { ITEMS } from '../data/items.js';

/**
 * DialogState - Game state for displaying dialog trees.
 *
 * Implements the state interface (enter, exit, update, pause, resume)
 * expected by GameStateManager's pushdown automaton.
 *
 * Dialog nodes are processed sequentially from a flat array.
 * Each node type is handled differently:
 *   text      - Display speaker + text, advance on input
 *   choice    - Display text then choices, branch on selection
 *   condition - Check player flag, branch silently
 *   action    - Execute side effect, continue immediately
 *   end       - Close dialog
 */
export class DialogState {
  /**
   * @param {Array} dialogTree - Array of dialog node objects
   * @param {object} player - Player instance (has flags, inventory, stats, etc.)
   * @param {object} stateManager - GameStateManager reference for popping self
   * @param {string|null} dialogId - Optional ID for tracking read state
   */
  constructor(dialogTree, player, stateManager, dialogId = null) {
    this.dialogTree = dialogTree;
    this.player = player;
    this.stateManager = stateManager;
    this.dialogId = dialogId;

    this.dialogBox = new DialogBox();
    this.currentIndex = 0;
    this.waitingForInput = false;
    this.active = false;
  }

  // --- State interface ---

  enter() {
    this.active = true;
    this.currentIndex = 0;
    this._processNode();
  }

  exit() {
    this.active = false;
    this.dialogBox.hide();
    this.dialogBox.destroy();
  }

  pause() {
    this.dialogBox.hide();
  }

  resume() {
    // Re-show current node if we were paused mid-dialog
    if (this.active && this.currentIndex < this.dialogTree.length) {
      const node = this.dialogTree[this.currentIndex];
      if (node.type === 'text' || node.type === 'choice') {
        this._showTextNode(node);
      }
    }
  }

  update(dt) {
    if (!this.active) return;

    // Update typewriter
    this.dialogBox.update(dt);

    // Handle input
    if (this.waitingForInput) {
      this._handleInput();
    }
  }

  // --- Internal processing ---

  /**
   * Process the node at this.currentIndex.
   * Text/choice nodes display UI and wait. Others execute immediately.
   */
  _processNode() {
    if (this.currentIndex >= this.dialogTree.length) {
      this._endDialog();
      return;
    }

    const node = this.dialogTree[this.currentIndex];

    switch (node.type) {
      case 'text':
        this._showTextNode(node);
        break;

      case 'choice':
        this._showChoiceNode(node);
        break;

      case 'condition':
        this._processCondition(node);
        break;

      case 'action':
        this._processAction(node);
        break;

      case 'end':
        this._endDialog();
        break;

      default:
        console.warn(`DialogState: Unknown node type "${node.type}" at index ${this.currentIndex}`);
        this.currentIndex++;
        this._processNode();
        break;
    }
  }

  /**
   * Display a text node -- speaker name and typewriter text.
   */
  _showTextNode(node) {
    this.dialogBox.show(node.speaker || 'Narrator', node.text);

    // Set up advance callback
    this.dialogBox.onAdvance = () => {
      this.currentIndex = node.next !== undefined ? node.next : this.currentIndex + 1;
      this.waitingForInput = false;
      this._processNode();
    };
    this.dialogBox.onChoice = null;

    this.waitingForInput = true;
  }

  /**
   * Display a choice node -- text first, then choices appear after typewriter.
   */
  _showChoiceNode(node) {
    // Filter choices by `requires` (flag must be truthy) and `requiresNot` (flag must be falsy).
    // This lets a single choice node branch dynamically without exploding into multiple nodes.
    const filteredChoices = node.choices
      .map((c, originalIndex) => ({ choice: c, originalIndex }))
      .filter(({ choice }) => {
        if (choice.requires && !this.player.getFlag(choice.requires)) return false;
        if (choice.requiresNot && this.player.getFlag(choice.requiresNot)) return false;
        return true;
      });

    // Map filtered choices to DialogBox format
    const boxChoices = filteredChoices.map(({ choice }, displayIdx) => ({
      text: choice.text,
      id: displayIdx,
    }));

    this.dialogBox.show(node.speaker || 'Narrator', node.prompt || node.text || '', boxChoices);

    // Set up choice callback
    this.dialogBox.onChoice = (choiceIndex) => {
      const chosen = filteredChoices[choiceIndex]?.choice;
      if (!chosen) {
        this.waitingForInput = false;
        this._processNode();
        return;
      }

      // Set flag if the choice specifies one
      if (chosen.flag) {
        this.player.setFlag(chosen.flag, chosen.flagValue !== undefined ? chosen.flagValue : true);
      }

      // Jump to the next index specified by the choice
      if (chosen.next !== undefined) {
        this.currentIndex = chosen.next;
      } else {
        this.currentIndex++;
      }

      this.waitingForInput = false;
      this._processNode();
    };

    this.dialogBox.onAdvance = null;
    this.waitingForInput = true;
  }

  /**
   * Condition node - check player flag and branch.
   */
  _processCondition(node) {
    const flagValue = this.player.getFlag(node.flag);

    if (flagValue) {
      this.currentIndex = node.ifTrue !== undefined ? node.ifTrue : this.currentIndex + 1;
    } else {
      this.currentIndex = node.ifFalse !== undefined ? node.ifFalse : this.currentIndex + 1;
    }

    this._processNode();
  }

  /**
   * Action node - execute side effect and continue.
   */
  _processAction(node) {
    switch (node.action) {
      case 'set_flag':
        this.player.setFlag(node.flag, node.value !== undefined ? node.value : true);
        break;

      case 'start_combat':
        EventBus.emit('start-combat', { encounter: node.encounter });
        break;

      case 'give_item': {
        const quantity = node.quantity || 1;
        this.player.addItem(node.item, quantity);
        const itemData = ITEMS[node.item];
        const itemName = itemData ? itemData.name : node.item;
        // Show a brief notification via the dialog box itself
        // Actually, we want the dialog to continue, so just emit an event
        EventBus.emit('item-received', { item: node.item, name: itemName, quantity });
        AudioManager.playSfx('confirm');
        break;
      }

      case 'heal':
        this.player.rest();
        AudioManager.playSfx('heal');
        break;

      case 'quest_update':
        EventBus.emit('quest-update', { quest: node.quest, objective: node.objective, status: node.status });
        break;

      case 'give_xp': {
        const levels = this.player.gainXP(node.xp || 0);
        if (levels.length > 0) AudioManager.playSfx('levelup');
        break;
      }

      case 'modify_stat': {
        const { stat, amount = 0 } = node;
        if (this.player.stats[stat] !== undefined) {
          this.player.stats[stat] = Math.max(1, this.player.stats[stat] + amount);
        }
        break;
      }

      case 'recruit_ally': {
        if (node.ally) this.player.addAlly(node.ally);
        AudioManager.playSfx('confirm');
        break;
      }

      default:
        console.warn(`DialogState: Unknown action "${node.action}" at index ${this.currentIndex}`);
        break;
    }

    // Continue to next node
    this.currentIndex = node.next !== undefined ? node.next : this.currentIndex + 1;
    this._processNode();
  }

  /**
   * End the dialog and pop this state.
   */
  _endDialog() {
    this.active = false;
    if (this.dialogId) {
      this.player.setFlag(`read_${this.dialogId}`, true);
    }
    EventBus.emit('dialog-end');
    this.stateManager.pop();
  }

  /**
   * Handle keyboard input during dialog.
   */
  _handleInput() {
    // Confirm / advance / skip
    // Space is blocked when choices are visible — player must use mouse or Enter
    const spaceOk = !this.dialogBox.choicesVisible;
    if (InputManager.isJustPressed('e') || InputManager.isJustPressed('enter') || (spaceOk && InputManager.isJustPressed(' '))) {
      this.dialogBox.handleConfirm();
      return;
    }

    // Choice navigation
    if (this.dialogBox.choicesVisible) {
      if (InputManager.isJustPressed('arrowup') || InputManager.isJustPressed('w')) {
        this.dialogBox.choiceUp();
      }
      if (InputManager.isJustPressed('arrowdown') || InputManager.isJustPressed('s')) {
        this.dialogBox.choiceDown();
      }
    }

    // Cancel / skip to end of text, then exit dialog on second press
    if (InputManager.isJustPressed('escape')) {
      if (!this.dialogBox.isComplete()) {
        this.dialogBox.skipToEnd();
      } else {
        this._endDialog();
      }
    }
  }
}
