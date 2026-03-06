import { AudioManager } from '../core/AudioManager.js';
import { TEXT_SPEED } from '../utils/constants.js';

// Speaker name colors for visual distinction
const SPEAKER_COLORS = {
  'Andrew':             '#5588cc',
  'Alex':               '#4a7c59',
  'Janet':              '#8b6e8b',
  'Dave from IT':       '#e07040',
  'The Intern':         '#6a6a8a',
  'Monica':             '#2d2d4e',
  'Mysterious Janitor': '#4a5a6a',
  'Karen Henderson':    '#cc6688',
  'Chad Henderson':     '#cc4444',
  'Grandma Henderson':  '#8888aa',
  'Compliance Auditor': '#cc2222',
  'Regional Manager':   '#daa520',
  'Alex (Unhinged)':    '#44cc44',
  'Narrator':           '#e94560',
  'Printer':            '#88ccff',
  'Vending Machine':    '#53a8b6',
  'Fridge Note':        '#ff6b6b',
};

export class DialogBox {
  constructor() {
    this.overlay = document.getElementById('ui-overlay');

    // DOM elements (created lazily)
    this.container = null;
    this.box = null;
    this.speakerEl = null;
    this.textEl = null;
    this.advanceEl = null;
    this.choicesEl = null;

    // Typewriter state
    this.fullText = '';
    this.displayedChars = 0;
    this.charTimer = 0;
    this.speed = TEXT_SPEED.NORMAL;
    this.complete = false;

    // Choice state
    this.choices = null;
    this.selectedIndex = 0;
    this.choiceElements = [];
    this.choicesVisible = false;

    // Callbacks
    this.onAdvance = null;
    this.onChoice = null;

    // Visibility
    this.active = false;
  }

  _createElements() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.className = 'dialog-container';
    this.container.style.display = 'none';

    this.box = document.createElement('div');
    this.box.className = 'dialog-box';

    this.speakerEl = document.createElement('div');
    this.speakerEl.className = 'dialog-speaker';

    this.textEl = document.createElement('div');
    this.textEl.className = 'dialog-text';

    this.advanceEl = document.createElement('div');
    this.advanceEl.className = 'dialog-advance';
    this.advanceEl.textContent = '\u25BC';
    this.advanceEl.style.display = 'none';

    this.choicesEl = document.createElement('div');
    this.choicesEl.className = 'dialog-choices';
    this.choicesEl.style.display = 'none';

    this.box.appendChild(this.speakerEl);
    this.box.appendChild(this.textEl);
    this.box.appendChild(this.choicesEl);
    this.box.appendChild(this.advanceEl);
    this.container.appendChild(this.box);
    this.overlay.appendChild(this.container);
  }

  /**
   * Show a dialog line with optional choices.
   * @param {string} speaker - Name to display in the speaker tag
   * @param {string} text - Full text to type out
   * @param {Array|null} choices - Optional array of { text, id } objects
   * @param {number} speed - ms per character (default TEXT_SPEED.NORMAL)
   */
  show(speaker, text, choices = null, speed = TEXT_SPEED.NORMAL) {
    this._createElements();

    // Speaker tag
    this.speakerEl.textContent = speaker;
    const speakerColor = SPEAKER_COLORS[speaker] || '#e94560';
    this.speakerEl.style.background = speakerColor;

    // Reset typewriter
    this.fullText = text;
    this.displayedChars = 0;
    this.charTimer = 0;
    this.speed = speed;
    this.complete = false;
    this.textEl.innerHTML = '';

    // Reset choices
    this.choices = choices;
    this.selectedIndex = 0;
    this.choiceElements = [];
    this.choicesVisible = false;
    this.choicesEl.style.display = 'none';
    this.choicesEl.innerHTML = '';

    // Hide advance indicator
    this.advanceEl.style.display = 'none';

    // Show container
    this.container.style.display = '';
    this.active = true;
  }

  /**
   * Hide the dialog box completely.
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
    this.active = false;
    this.complete = false;
    this.choices = null;
    this.choicesVisible = false;
  }

  /**
   * Returns true if the typewriter has finished displaying all text.
   */
  isComplete() {
    return this.complete;
  }

  /**
   * Skip the typewriter and show the full text immediately.
   */
  skipToEnd() {
    if (!this.active || this.complete) return;

    this.displayedChars = this.fullText.length;
    this.textEl.textContent = this.fullText;
    this.complete = true;
    this._onTextComplete();
  }

  /**
   * Called when typewriter finishes. Shows advance indicator or choices.
   */
  _onTextComplete() {
    if (this.choices && this.choices.length > 0) {
      this._showChoices();
    } else {
      this.advanceEl.style.display = '';
    }
  }

  /**
   * Build and display choice buttons.
   */
  _showChoices() {
    this.choicesEl.innerHTML = '';
    this.choiceElements = [];
    this.selectedIndex = 0;
    this.choicesVisible = true;

    this.choices.forEach((choice, i) => {
      const el = document.createElement('div');
      el.className = 'dialog-choice';
      el.innerHTML = `<span class="dialog-choice-indicator">&gt;</span> ${this._escapeHtml(choice.text)}`;

      el.addEventListener('mouseenter', () => {
        this._selectChoice(i);
      });

      el.addEventListener('click', () => {
        this._confirmChoice();
      });

      this.choicesEl.appendChild(el);
      this.choiceElements.push(el);
    });

    // Highlight first choice
    this._updateChoiceHighlight();
    this.choicesEl.style.display = '';
  }

  /**
   * Move choice selection.
   * @param {number} index
   */
  _selectChoice(index) {
    this.selectedIndex = index;
    this._updateChoiceHighlight();
    AudioManager.playSfx('cursor');
  }

  /**
   * Update visual highlight on choices.
   */
  _updateChoiceHighlight() {
    this.choiceElements.forEach((el, i) => {
      if (i === this.selectedIndex) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });
  }

  /**
   * Confirm the currently selected choice.
   */
  _confirmChoice() {
    if (!this.choicesVisible || !this.choices) return;

    const choice = this.choices[this.selectedIndex];
    AudioManager.playSfx('confirm');

    if (this.onChoice) {
      this.onChoice(choice.id !== undefined ? choice.id : this.selectedIndex);
    }
  }

  /**
   * Navigate choices up.
   */
  choiceUp() {
    if (!this.choicesVisible) return;
    this.selectedIndex = (this.selectedIndex - 1 + this.choices.length) % this.choices.length;
    this._updateChoiceHighlight();
    AudioManager.playSfx('cursor');
  }

  /**
   * Navigate choices down.
   */
  choiceDown() {
    if (!this.choicesVisible) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.choices.length;
    this._updateChoiceHighlight();
    AudioManager.playSfx('cursor');
  }

  /**
   * Handle confirm input (Enter/E/Space).
   * If text is still typing, skip to end.
   * If text is complete and no choices, advance.
   * If choices visible, confirm choice.
   */
  handleConfirm() {
    if (!this.active) return;

    if (!this.complete) {
      this.skipToEnd();
      return;
    }

    if (this.choicesVisible) {
      this._confirmChoice();
      return;
    }

    // Text complete, no choices -- advance
    AudioManager.playSfx('confirm');
    if (this.onAdvance) {
      this.onAdvance();
    }
  }

  /**
   * Update typewriter effect. Call each frame.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (!this.active || this.complete) return;

    this.charTimer += dt * 1000; // Convert to ms

    while (this.charTimer >= this.speed && this.displayedChars < this.fullText.length) {
      this.charTimer -= this.speed;
      this.displayedChars++;

      // Play text blip every few characters (not every one -- too noisy)
      if (this.displayedChars % 3 === 0) {
        AudioManager.playSfx('text');
      }
    }

    // Update displayed text
    this.textEl.textContent = this.fullText.substring(0, this.displayedChars);

    // Check if complete
    if (this.displayedChars >= this.fullText.length) {
      this.complete = true;
      this._onTextComplete();
    }
  }

  /**
   * Escape HTML special characters.
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Remove all DOM elements and clean up.
   */
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }
}
