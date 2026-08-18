// DifficultyPanel.js — the text mode picker. ONE live call site: MenuState,
// mid-run ('run' context).
//
// TitleState's New Game path used to open this too; as of 2026-08-17 it opens
// `src/ui/NewGameScreen.js` instead — the diorama slider — which binds to the
// same MODE_ORDER ids and calls the same `Difficulty.reset(id)`. The 'new'
// context here is kept working (it is the clean fallback if the visual screen
// is ever pulled), but nothing ships a path to it today.
//
// INPUT DISCIPLINE. This panel owns NO keyboard listener. Every other screen in
// this game is driven by polling `InputManager` from the host state's
// `update()`, and a DOM `keydown` listener bolted onto one panel would fire
// *alongside* that poll — the Enter that confirms a mode would also reach
// TitleState's own `_select()` on the same frame. So the panel exposes
// `move()` / `confirm()` / `close()` and the host calls them from the update it
// already has. Mouse clicks are the one thing the panel handles itself, because
// nothing else in the game reads the mouse.
//
// THE GATE. `open()` returns false when `DIFFICULTY_LIVE` is off, and every
// caller treats a false return as "there is no such screen" and carries on. That
// is what keeps a dark build's New Game flow bit-identical.

import { Difficulty } from '../core/DifficultyManager.js';
import { MODE_ORDER, DIFFICULTY_MODES } from '../data/difficulty.js';
import { AudioManager } from '../core/AudioManager.js';

// Plain, audience-first register throughout (producer, 2026-08-17): the mode
// names are Easy / Normal / Hard and the chrome around them matches. No trust
// jargon on this screen. The visual slider start-screen landed as
// `src/ui/NewGameScreen.js` and binds to the same MODE_ORDER ids.
const COPY = {
  titleNew: 'DIFFICULTY',
  titleRun: 'CHANGE DIFFICULTY',
  // Said plainly and once, at the moment the choice is made, because a player
  // who does not know a setting is reversible will pick the safe one and resent
  // it. This is the same reason the shipped PIP costs zero Review Points.
  blurbNew: 'This can be changed at any time from the pause menu. Nothing is locked behind it.',
  blurbRun: 'Takes effect from your next fight. Switch back whenever you like.',
  hint: '↑↓ select &nbsp; ENTER confirm &nbsp; ESC back',
};

class DifficultyPanelImpl {
  constructor() {
    this.overlay = null;
    this.index = 0;
    this._onPick = null;
    this._onCancel = null;
    this._context = 'new';
  }

  get isOpen() { return !!this.overlay; }

  /**
   * @param {object} opts
   * @param {'new'|'run'} opts.context  which copy to show
   * @param {function}    opts.onPick   called with the chosen mode id
   * @param {function}   [opts.onCancel]
   * @returns {boolean} false when the producer gate is closed — the caller
   *          should proceed exactly as it did before this screen existed.
   */
  open(opts = {}) {
    if (!Difficulty.live || this.overlay) return false;
    this._context = opts.context === 'run' ? 'run' : 'new';
    this._onPick = opts.onPick || null;
    this._onCancel = opts.onCancel || null;
    this.index = Math.max(0, MODE_ORDER.indexOf(Difficulty.selected));

    this.overlay = document.createElement('div');
    this.overlay.className = 'menu-overlay difficulty-overlay';
    this.overlay.style.zIndex = '70';
    document.getElementById('ui-overlay').appendChild(this.overlay);
    this._render();
    return true;
  }

  close() {
    if (this.overlay?.parentNode) this.overlay.parentNode.removeChild(this.overlay);
    this.overlay = null;
    this._onPick = null;
    this._onCancel = null;
  }

  cancel() {
    const cb = this._onCancel;
    this.close();
    if (cb) cb();
  }

  move(delta) {
    if (!this.overlay) return;
    const next = Math.max(0, Math.min(MODE_ORDER.length - 1, this.index + delta));
    if (next === this.index) return;
    this.index = next;
    AudioManager.playSfx('cursor');
    this._render();
  }

  confirm() {
    if (!this.overlay) return;
    const id = MODE_ORDER[this.index];
    const cb = this._onPick;
    AudioManager.playSfx('confirm');
    this.close();
    if (cb) cb(id);
  }

  _render() {
    if (!this.overlay) return;
    const current = Difficulty.selected;
    const rows = MODE_ORDER.map((id, i) => {
      const m = DIFFICULTY_MODES[id];
      const sel = i === this.index;
      // No floor stamp: the producer declined `difficultyFloor` (2026-08-17),
      // so the only mark is where you are now.
      const marks = [];
      if (id === current) marks.push('current');
      return `
        <div class="difficulty-row${sel ? ' selected' : ''}" data-index="${i}">
          <div class="difficulty-row-head">
            <span class="difficulty-row-name">${m.name.toUpperCase()}</span>
            ${marks.length ? `<span class="difficulty-row-mark">[${marks.join(' · ')}]</span>` : ''}
          </div>
          <div class="difficulty-row-blurb">${m.blurb}</div>
        </div>`;
    }).join('');

    this.overlay.innerHTML = `
      <div class="menu-panel difficulty-panel">
        <div class="menu-title">${this._context === 'run' ? COPY.titleRun : COPY.titleNew}</div>
        <div class="difficulty-rows">${rows}</div>
        <div class="difficulty-note">${this._context === 'run' ? COPY.blurbRun : COPY.blurbNew}</div>
        <div class="difficulty-hint">${COPY.hint}</div>
      </div>`;

    this.overlay.querySelectorAll('.difficulty-row').forEach((el) => {
      el.addEventListener('click', () => {
        const i = Number(el.dataset.index);
        if (i === this.index) this.confirm();
        else { this.index = i; AudioManager.playSfx('cursor'); this._render(); }
      });
    });
  }
}

export const DifficultyPanel = new DifficultyPanelImpl();
export default DifficultyPanel;
