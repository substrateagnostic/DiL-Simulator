import { AudioManager } from '../core/AudioManager.js';
import { TEXT_SPEED, DEV_MODE } from '../utils/constants.js';
import { SETTINGS } from '../core/Settings.js';
import { NotificationArbiter, NC } from '../core/NotificationArbiter.js';

// Every DialogBox instance claims the same VOICE hold. The box does not go
// through the arbiter — it owns its own DOM, its typewriter, the CHOICE_ARM_MS
// guard and the KNOWLEDGE_GATE_DIALOGS presentation law, all untouched. It
// only DECLARES that a character is speaking, which is what lets the arbiter
// hold every commendation, autosave and objective toast until the scene ends.
const VOICE_TAG = 'dialog-box';

// How long a freshly-rendered choice row ignores mouse clicks. Long enough to
// swallow the second half of a double-click that was aimed at the typewriter
// skip, short enough that a deliberate click never feels dropped.
const CHOICE_ARM_MS = 260;

// Speaker name colors for visual distinction
const SPEAKER_COLORS = {
  'Andrew':             '#5588cc',
  // The speaker string the dialog data actually uses is 'Alex from IT'. The bare
  // 'Alex' row is a legacy alias kept only so old/branching data does not regress.
  'Alex from IT':       '#4a7c59',
  'Alex':               '#4a7c59',
  'Janet':              '#8b6e8b',
  'Dave from IT':       '#e07040',
  'The Intern':         '#6a6a8a',
  'Monica':             '#2d2d4e',
  'Mysterious Janitor': '#4a5a6a',
  // F-12. `janitor_the_name` node 2 is the ONE line in the game that speaks
  // under this string: the label corrects itself on the same beat he does.
  // Same colour, same portrait stem, so nothing about him changes except what
  // the box has been calling him. Adding a speaker string means adding it in
  // BOTH tables -- the colour map here and PORTRAIT_KEYS below are keyed on the
  // exact string in `src/data/dialogs`, and a missing row is silent in each.
  'Curtis Briggs':      '#4a5a6a',
  'Karen Henderson':    '#cc6688',
  'Chad Henderson':     '#cc4444',
  'Grandma Henderson':  '#8888aa',
  'Compliance Auditor': '#cc2222',
  'Regional Manager':   '#daa520',
  'Skip Hartley':       '#d28b26',
  'Diane':              '#5aa6b2',
  'Diane (Front Desk)': '#5aa6b2',
  'Isaiah':             '#b08968',
  'Meredith Sterling':  '#9d4edd',
  'Meredith Sterling, SVP': '#9d4edd',
  // Rachel the trust officer (NPC id `rachel`) — no relation to Meredith.
  'Rachel':             '#7a9ab5',
  'Brand Consultant':   '#ff9f1c',
  'Restructuring Analyst': '#6c757d',
  'Chief of Restructuring': '#495057',
  'Corporate Lawyer':   '#2b6cb0',
  'Data Analytics Lead':'#2a9d8f',
  'HR Representative':  '#c77dff',
  'Security Guard':     '#607d8b',
  "CFO's Assistant":    '#7b2cbf',
  'Regional Director':  '#b8860b',
  'The Algorithm':      '#00b4d8',
  'The Janitor':        '#4a5a6a',
  'Alex (Unhinged)':    '#44cc44',
  'Narrator':           '#e94560',
  'Printer':            '#88ccff',
  'Vending Machine':    '#53a8b6',
  'Fridge Note':        '#ff6b6b',
  'Archive Terminal':   '#4cc9f0',
  'Delia Okafor':       '#d4a373',
  'The Clerk':          '#8d99ae',
  'The Firm':           '#6a040f',
  'The Board Member':   '#adb5bd',
};

// Speaker → portrait file stem. Any `<stem>.png` (or `<stem>_<mood>.png`)
// dropped into src/assets/portraits/ is picked up automatically at build time.
// KEYS ARE THE EXACT `speaker` STRINGS IN src/data/dialogs — not NPC ids, not
// display names from characters.js. A key that no dialog node emits is dead
// weight: 'Alex' sat here for the whole campaign while every one of his 211
// lines says 'Alex from IT', so his four shipped portraits never once rendered.
// Before adding a row, grep the speaker string out of the dialog data.
const PORTRAIT_KEYS = {
  'Andrew': 'andrew',
  'Alex from IT': 'alex_it',
  'Alex': 'alex_it',
  'Alex (Unhinged)': 'alex_it',
  'Janet': 'janet',
  'The Intern': 'intern',
  'Mysterious Janitor': 'janitor',
  'The Janitor': 'janitor',
  'Curtis Briggs': 'janitor',      // F-12 — same face, the name he actually has
  'Karen Henderson': 'karen',
  'Chad Henderson': 'chad',
  'Grandma Henderson': 'grandma',
  'Compliance Auditor': 'compliance',
  'Regional Manager': 'regional',
  // Stems follow the internal ids, which were renamed to match the display
  // names on 2026-08-04 (see the naming law at the top of CLAUDE.md). The PNGs
  // were renamed with them; import.meta.glob picks them up by stem.
  'Skip Hartley': 'skip',
  'Diane': 'diane',
  'Diane (Front Desk)': 'diane',
  'Isaiah': 'isaiah',
  'Meredith Sterling': 'meredith',
  'Meredith Sterling, SVP': 'meredith',
  // 'Rachel' is the trust officer, id `rachel` — NOT Meredith Sterling.
  // Do NOT point her at meredith.png; that is Meredith Sterling's face.
  // Neutral only so far; her `mood: 'worried'` node falls back to the base PNG.
  'Rachel': 'rachel',
  // Deputy Recorder, Act 7. Four moods shipped; her `angry` and `smug` nodes fire.
  'Delia Okafor': 'delia',
  'Brand Consultant': 'brand_consultant',
  'Restructuring Analyst': 'restructuring_analyst',
  'Chief of Restructuring': 'chief_of_restructuring',
  'Corporate Lawyer': 'corporate_lawyer',
  'Data Analytics Lead': 'data_analytics_lead',
  'HR Representative': 'hr_rep',
  'Security Guard': 'security_guard',
  "CFO's Assistant": 'cfos_assistant',
  'Regional Director': 'regional_director',
  'The Algorithm': 'algorithm',
  'Printer': 'printer',
};

// Bundled portrait images (empty object until art lands — that's fine)
const PORTRAIT_FILES = import.meta.glob('../assets/portraits/*.png', { eager: true, query: '?url', import: 'default' });
function portraitUrl(stem) {
  for (const [path, url] of Object.entries(PORTRAIT_FILES)) {
    if (path.endsWith(`/${stem}.png`)) return url;
  }
  return null;
}

// Dev-only orphan guard. Alex from IT shipped four portraits that never rendered
// because no PORTRAIT_KEYS row matched his speaker string; nothing anywhere said
// so. This makes the next one loud instead of silent. Costs nothing in a player
// build (DEV_MODE is false, and the block is a single boolean test at import).
if (DEV_MODE) {
  const wired = new Set(Object.values(PORTRAIT_KEYS));
  const orphans = Object.keys(PORTRAIT_FILES)
    .map((p) => p.split('/').pop().replace(/\.png$/, ''))
    .filter((stem) => !/_(angry|smug|worried)$/.test(stem))
    .filter((stem) => !wired.has(stem));
  if (orphans.length) {
    console.warn(`[DialogBox] portrait assets on disk with no PORTRAIT_KEYS row: ${orphans.join(', ')}`);
  }
}

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

    // Portrait — floats above the box's left edge, JRPG style
    this.portraitEl = document.createElement('img');
    this.portraitEl.className = 'dialog-portrait';
    this.portraitEl.style.cssText = `
      position: absolute; left: 4px; top: -134px;
      width: 120px; height: 120px;
      border: 2px solid #e94560; border-radius: 4px;
      background: #0a0a14;
      display: none; pointer-events: none;
      box-shadow: 0 4px 18px rgba(0,0,0,0.55);
    `;

    // Truth in labelling: Escape (touch: B) only SKIPS the typewriter — it has
    // never exited the dialog, and aborting mid-tree is deliberately disabled
    // (DialogState._handleInput, June 11 fix: an aborted tree skipped
    // set_flag/start_combat while still marking read_<id>). The hint is hidden
    // once the line finishes typing, because then the key does nothing at all.
    this.escHintEl = document.createElement('div');
    this.escHintEl.className = 'dialog-esc-hint';
    this.escHintEl.textContent = this._skipHintLabel();
    this.escHintEl.style.cssText = `
      position: absolute; bottom: 6px; left: 10px;
      font-family: 'VT323', monospace; font-size: 14px;
      color: rgba(255,255,255,0.35); pointer-events: none;
    `;

    this.box.appendChild(this.portraitEl);
    this.box.appendChild(this.speakerEl);
    this.box.appendChild(this.textEl);
    this.box.appendChild(this.choicesEl);
    this.box.appendChild(this.advanceEl);
    this.box.appendChild(this.escHintEl);
    this.container.appendChild(this.box);
    this.overlay.appendChild(this.container);

    // Tap-to-advance for mobile (skip typewriter or advance to next line)
    this.box.addEventListener('click', () => {
      if (this.choicesEl && this.choicesEl.style.display !== 'none') return; // don't interfere with choice taps
      if (!this.isComplete()) {
        this.skipToEnd();
      } else if (this.onAdvance) {
        this.onAdvance();
      }
    });
  }

  /**
   * Show a dialog line with optional choices.
   * @param {string} speaker - Name to display in the speaker tag
   * @param {string} text - Full text to type out
   * @param {Array|null} choices - Optional array of { text, id } objects
   * @param {number} speed - ms per character (default TEXT_SPEED.NORMAL)
   */
  show(speaker, text, choices = null, speed = TEXT_SPEED.NORMAL, mood = null) {
    this._createElements();
    speed = speed * (SETTINGS.textSpeed || 1);

    // Speaker tag
    this.speakerEl.textContent = speaker;
    const speakerColor = SPEAKER_COLORS[speaker] || '#e94560';
    this.speakerEl.style.background = speakerColor;

    // Portrait (mood variant falls back to base, base falls back to hidden)
    const portraitKey = PORTRAIT_KEYS[speaker];
    let pUrl = null;
    if (portraitKey) {
      if (mood) pUrl = portraitUrl(`${portraitKey}_${mood}`);
      if (!pUrl) pUrl = portraitUrl(portraitKey);
    }
    if (pUrl) {
      if (this.portraitEl.dataset.url !== pUrl) {
        this.portraitEl.src = pUrl;
        this.portraitEl.dataset.url = pUrl;
        // Punch-in on speaker change
        this.portraitEl.style.transition = 'none';
        this.portraitEl.style.transform = 'translateY(8px)';
        this.portraitEl.style.opacity = '0.3';
        requestAnimationFrame(() => {
          this.portraitEl.style.transition = 'transform 0.14s ease-out, opacity 0.14s ease-out';
          this.portraitEl.style.transform = 'translateY(0)';
          this.portraitEl.style.opacity = '1';
        });
      }
      this.portraitEl.style.display = '';
    } else {
      this.portraitEl.style.display = 'none';
      this.portraitEl.dataset.url = '';
    }

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

    // Skip hint is only true while the typewriter is running
    this.escHintEl.textContent = this._skipHintLabel();
    this.escHintEl.style.display = '';

    // Show container
    this.container.style.display = '';
    this.active = true;
    // Owner element passed so the hold auto-expires if the box is ever torn
    // down by a path that skips hide()/destroy(). The most important holder in
    // the game should be the best defended one.
    NotificationArbiter.hold(NC.VOICE, VOICE_TAG, this.container);
  }

  /**
   * Hide the dialog box completely.
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
    NotificationArbiter.release(VOICE_TAG);
    this.active = false;
    this.complete = false;
    this.choices = null;
    this.choicesVisible = false;
  }

  /**
   * Label for the skip hint. Touch devices press the on-screen B button,
   * which InputManager maps to 'escape' (TouchControls.ACTION_KEYS).
   */
  _skipHintLabel() {
    return ('ontouchstart' in window) ? '[B] Skip' : '[ESC] Skip';
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
    // Nothing left to skip — stop advertising the key
    if (this.escHintEl) this.escHintEl.style.display = 'none';
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
    this._choicesShownAt = performance.now();

    this.choices.forEach((choice, i) => {
      const el = document.createElement('div');
      el.className = 'dialog-choice' + (choice.seen ? ' seen' : '');
      el.innerHTML = `<span class="dialog-choice-indicator">${choice.seen ? '·' : '&gt;'}</span> ${this._escapeHtml(choice.text)}`;

      el.addEventListener('mouseenter', () => {
        this._selectChoice(i);
      });

      el.addEventListener('click', () => {
        // ARM DELAY. The box's own click handler skips the typewriter, which
        // renders these buttons UNDER a stationary pointer; `mouseenter` then
        // moves the cursor onto whichever one landed there, and a second click
        // ~100 ms later committed a choice the player had not read. The
        // keyboard path is already guarded (skip first, confirm second); this
        // gives the mouse path the same beat.
        if (performance.now() - this._choicesShownAt < CHOICE_ARM_MS) return;
        this._confirmChoice();
      });

      this.choicesEl.appendChild(el);
      this.choiceElements.push(el);
    });

    // Cursor starts on the first unread choice (all read → first)
    const firstFresh = this.choices.findIndex(c => !c.seen);
    this.selectedIndex = firstFresh >= 0 ? firstFresh : 0;
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
    NotificationArbiter.release(VOICE_TAG);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }
}
