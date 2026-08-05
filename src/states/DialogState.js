import { InputManager } from '../core/InputManager.js';
import { EventBus } from '../core/EventBus.js';
import { AudioManager } from '../core/AudioManager.js';
import { DialogBox } from '../ui/DialogBox.js';
import { ITEMS } from '../data/items.js';
import { getDialogQuestGate, getQuestStage, isStageInRange } from '../utils/dialogGating.js';

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
// KNOWLEDGE GATES. Persisted choice-greying plus a cursor that auto-parks on
// the first untried option is an answer key: wrong answers dim permanently, so
// mashing Enter brute-forces the Archive password and the Janitor's riddles in
// a handful of visits. These dialogs opt out of BOTH behaviours — their choices
// never render as seen and the cursor always starts at the top. Only the puzzle
// trees are listed; the 59 hub choice nodes keep their memory, which is what
// makes a hub read as explored. This is presentation only: no gate, flag or
// retry path is touched.
const KNOWLEDGE_GATE_DIALOGS = new Set([
  'compliance_crossword',
  'janitor_riddle_1',
  'janitor_riddle_2',
  'janitor_riddle_3',
]);

// EVERGREEN HUBS (A1-ux-audit C3). Choice memory is what makes a hub read as
// explored — right up until the last topic is spent, at which point EVERY row
// is at 42 % opacity and the hub reads as CLOSED. `team_chat_hub` is the named
// offender: it is a permanent post-recruit fixture the player is meant to come
// back to, and a fully-greyed panel tells them not to.
//
// The fix is one condition, not a second opt-out: memory stays on (so the
// cursor still walks you to the topic you have not heard) until the player has
// heard them all, and then the panel resets to fresh. Nothing about gating,
// flags or reachability changes — this is presentation, same as the
// KNOWLEDGE_GATE rule above.
const EVERGREEN_HUB_DIALOGS = new Set([
  'team_chat_hub',
]);

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
    this.dialogGate = getDialogQuestGate(dialogId);
    this.questStageAtStart = getQuestStage(player);

    this.dialogBox = new DialogBox();
    this.currentIndex = 0;
    this.waitingForInput = false;
    this.active = false;
    this.shownAnyNode = false;
  }

  // --- State interface ---

  enter() {
    this.active = true;
    this.currentIndex = 0;
    this._processNode();
  }

  exit() {
    this.active = false;
    this._stageRunning = false;
    clearTimeout(this._stageNet);
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

    // A stage beat is playing: the box is hidden and the world is moving.
    // Any confirm/cancel press snaps every beat to its end state rather than
    // making the player watch a walk they have already seen.
    if (this._stageRunning) {
      if (InputManager.isJustPressed('escape') || InputManager.isJustPressed('enter')
        || InputManager.isJustPressed('e') || InputManager.isJustPressed(' ')) {
        EventBus.emit('stage-skip');
      }
      return;
    }

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
    if (!this._isNodeValidForQuestStage(node)) {
      this.currentIndex = node.fallback !== undefined
        ? node.fallback
        : node.next !== undefined
          ? node.next
          : this.currentIndex + 1;
      this._processNode();
      return;
    }

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

      case 'stage':
        this._processStage(node);
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
    this.shownAnyNode = true;
    if (node.mood) EventBus.emit('dialog-mood', { speaker: node.speaker, mood: node.mood });
    this.dialogBox.show(node.speaker || 'Narrator', node.text, null, undefined, node.mood);

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
        if (!this._isNodeValidForQuestStage(choice)) return false;
        return true;
      });

    if (filteredChoices.length === 0) {
      this.currentIndex = node.fallback !== undefined
        ? node.fallback
        : node.next !== undefined
          ? node.next
          : this.currentIndex + 1;
      this._processNode();
      return;
    }

    this.shownAnyNode = true;

    // Map filtered choices to DialogBox format. Choices the player has
    // already taken (persisted per save) render greyed and the cursor
    // starts on the first unread one — EXCEPT exit-style choices (those
    // whose target node is an `end`), which stay fresh forever.
    const isQuiz = KNOWLEDGE_GATE_DIALOGS.has(this.dialogId);
    const boxChoices = filteredChoices.map(({ choice, originalIndex }, displayIdx) => {
      const targetIdx = choice.next !== undefined ? choice.next : this.currentIndex + 1;
      const isExit = this.dialogTree[targetIdx]?.type === 'end';
      const seen = !isQuiz && !isExit && this.dialogId
        && !!this.player.getFlag(`_chose_${this.dialogId}_${this.currentIndex}_${originalIndex}`);
      return { text: choice.text, id: displayIdx, seen };
    });
    // Evergreen hub, every non-exit topic spent: drop the greying wholesale so
    // the panel reads OPEN instead of CLOSED. The flags are untouched — this
    // is only what the player is shown, and the moment a NEW topic unlocks
    // (these hubs gate rows on ally flags) the greying comes straight back for
    // the ones already heard.
    if (EVERGREEN_HUB_DIALOGS.has(this.dialogId)) {
      const topics = boxChoices.filter((c, i) => {
        const t = filteredChoices[i].choice.next;
        const idx = t !== undefined ? t : this.currentIndex + 1;
        return this.dialogTree[idx]?.type !== 'end';
      });
      if (topics.length && topics.every(c => c.seen)) {
        for (const c of boxChoices) c.seen = false;
      }
    }

    this.dialogBox.show(node.speaker || 'Narrator', node.prompt || node.text || '', boxChoices, undefined, node.mood);

    // Set up choice callback
    this.dialogBox.onChoice = (choiceIndex) => {
      const chosen = filteredChoices[choiceIndex]?.choice;
      if (!chosen) {
        this.waitingForInput = false;
        this._processNode();
        return;
      }

      // Remember the pick so revisits grey it out — never for a knowledge gate,
      // where the record IS the answer key (and where it also bloats the save
      // with a `_chose_` flag per wrong guess).
      if (this.dialogId && !isQuiz) {
        const origIdx = filteredChoices[choiceIndex].originalIndex;
        this.player.setFlag(`_chose_${this.dialogId}_${this.currentIndex}_${origIdx}`, true);
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

  _isNodeValidForQuestStage(node) {
    if (!node) return true;
    const minQuestStage = node.minQuestStage ?? this.dialogGate?.min;
    const maxQuestStage = node.maxQuestStage ?? this.dialogGate?.max;
    if (minQuestStage === undefined && maxQuestStage === undefined) return true;
    return isStageInRange(
      this.questStageAtStart,
      minQuestStage ?? 0,
      maxQuestStage ?? Infinity
    );
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
        EventBus.emit('quest-update', {
          quest: node.quest,
          objective: node.objective ?? node.stage,
          status: node.status,
        });
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

      case 'unlock_ally_ability': {
        if (node.ally && node.ability) {
          this.player.unlockAllyAbility(node.ally, node.ability);
        }
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
   * Stage node. TWO MODES — the scene author picks per node.
   *
   * SCHEDULED (default) — hand the beats to whoever owns the world (normally
   * ExplorationState's StageDirector), HIDE the box, and BLOCK until the
   * director reports every blocking beat finished. The line before the move and
   * the line after it are separated by the move itself. Use it when the movement
   * IS the beat: an entrance, a sit-down the next line refers to, a walk-out.
   *
   * CONCURRENT (`concurrent: true`) — hand the beats over and advance to the next
   * node IMMEDIATELY, leaving the box up. The director keeps driving those actors
   * under the visible dialog, because it is ticked from main.js's global loop and
   * not from the (suspended) ExplorationState. Use it for motion that should read
   * as happening WHILE someone talks: background bodies repositioning, an ally
   * crossing the room during another character's line, an exit under the last
   * line of a scene. Producer note that earned this mode: "the dialog boxes are
   * blocking movement from working properly in the background."
   *
   * The unpause stays NARROW in both modes and that is the whole safety argument:
   * StageDirector ticks the animators of the actors IT is driving and nothing
   * else. ExplorationState.update() is still asleep, so player input, NPC
   * patrols, interactable proximity and exit tiles are all still frozen — a
   * concurrent beat cannot let the player walk out from under their own cutscene.
   *
   * DialogState deliberately holds no world reference (only `player` and
   * `stateManager`) and must not grow one, so this uses the same EventBus
   * hand-off as `start_combat`. `payload.claimed` is the listener's ack: if
   * nothing is listening — a dialog pushed with no exploration state under it,
   * which the fixture/test harnesses do — the node degrades to a no-op instead
   * of hanging the tree. The 20 s net covers a director that somehow never
   * calls back; `advanced` makes `done()` idempotent (rule 5).
   */
  _processStage(node) {
    if (node.concurrent) {
      // No gate, no hide, no block: the beats run under the text. `done` is null
      // because nothing is waiting on it — the director still fires its gate, and
      // `?.()` makes that a no-op. An unclaimed payload is the same no-op it is
      // in the scheduled path.
      EventBus.emit('stage-beats', { beats: node.beats || [], done: null, claimed: false });
      this.currentIndex = node.next !== undefined ? node.next : this.currentIndex + 1;
      this._processNode();
      return;
    }

    this._stageRunning = true;
    this.dialogBox.hide();

    let advanced = false;
    const go = () => {
      if (advanced) return;
      advanced = true;
      this._stageRunning = false;
      clearTimeout(this._stageNet);
      if (!this.active) return;
      this.currentIndex = node.next !== undefined ? node.next : this.currentIndex + 1;
      this._processNode();
    };

    const payload = { beats: node.beats || [], done: go, claimed: false };
    EventBus.emit('stage-beats', payload);
    if (!payload.claimed) { go(); return; }
    this._stageNet = setTimeout(go, 20000);
  }

  /**
   * End the dialog and pop this state.
   */
  _endDialog() {
    this.active = false;
    if (this.dialogId && this.shownAnyNode) {
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

    // Escape skips the typewriter but NEVER aborts the dialog — aborting
    // mid-tree skipped set_flag/start_combat actions while still marking
    // read_<id>, which could permanently strand story flags (e.g. losing
    // city_unlocked, met_* intros, or the Firm fight). Dialogs only end
    // through their own end nodes.
    if (InputManager.isJustPressed('escape')) {
      if (!this.dialogBox.isComplete()) {
        this.dialogBox.skipToEnd();
      }
    }
  }
}
