import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { SaveManager } from '../core/SaveManager.js';

const ROOM_DISPLAY_NAMES = {
  cubicle_farm:    'Cubicle Farm',
  reception:       'Reception',
  break_room:      'Break Room',
  ross_office:     "Ross's Office",
  conference_room: 'Conference Room',
  server_room:     'Server Room',
  stairwell:       'Back Corridor',
  archive:         'Archive',
  executive_floor: 'Executive Floor',
  parking_garage:  'Parking Garage',
  penthouse:       'Penthouse',
  hr_department:   'HR Department',
  board_room:      'Board Room',
};

function formatRoomName(id) {
  return ROOM_DISPLAY_NAMES[id] || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export class TitleState {
  constructor(stateManager, onStart) {
    this.stateManager = stateManager;
    this.onStart = onStart;
    this.element = null;
    this.selectedIndex = 0;
    this.menuItems = [];
    this.hasAnySave = SaveManager.hasSave();
    this.controlsOverlay = null;
    this.slotOverlay = null;
    this._slotMode = null;       // 'new' or 'continue'
    this._slotIndex = 0;         // selected slot (0-based)
    this._slotItems = [];        // available slots for current mode
  }

  enter() {
    AudioManager.stopMusic(0.5);
    const overlay = document.getElementById('ui-overlay');

    this.element = document.createElement('div');
    this.element.className = 'title-screen';

    const logo = document.createElement('div');
    logo.className = 'title-logo';
    logo.innerHTML = `
      <span class="title-main">TRUST ISSUES</span>
      <span class="title-sub">A TRUST OFFICER SIMULATOR</span>
    `;
    this.element.appendChild(logo);

    const menu = document.createElement('div');
    menu.className = 'title-menu';

    this.menuItems = ['New Game'];
    if (this.hasAnySave) this.menuItems.push('Load Game');
    this.menuItems.push('Controls');

    this.menuItems.forEach((label, i) => {
      const item = document.createElement('div');
      item.className = `title-menu-item${i === this.selectedIndex ? ' selected' : ''}`;
      item.textContent = label;
      item.addEventListener('click', () => {
        if (this.controlsOverlay || this.slotOverlay) return;
        this.selectedIndex = i;
        this._select();
      });
      menu.appendChild(item);
    });

    this.element.appendChild(menu);

    const prompt = document.createElement('div');
    prompt.className = 'title-prompt';
    prompt.textContent = ('ontouchstart' in window) ? 'Tap to start' : 'Press ENTER to start';
    this.element.appendChild(prompt);

    const version = document.createElement('div');
    version.className = 'title-version';
    version.textContent = 'v1.0.0 // "Handle their assets carefully"';
    this.element.appendChild(version);

    overlay.appendChild(this.element);
  }

  exit() {
    this._closeControls();
    this._closeSlotPicker();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  _updateSelection() {
    const items = this.element.querySelectorAll('.title-menu-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === this.selectedIndex);
    });
  }

  _select() {
    const choice = this.menuItems[this.selectedIndex];
    AudioManager.playSfx('confirm');

    if (choice === 'New Game') {
      this._showSlotPicker('new');
    } else if (choice === 'Load Game') {
      this._showSlotPicker('continue');
    } else if (choice === 'Controls') {
      this._showControls();
    }
  }

  // ── Slot picker ────────────────────────────────────────────────────────────

  _showSlotPicker(mode) {
    if (this.slotOverlay) return;
    this._slotMode = mode;

    // Build the list of slots to show
    if (mode === 'continue') {
      // Only slots that have data
      this._slotItems = [];
      for (let s = 1; s <= SaveManager.getSlotCount(); s++) {
        if (SaveManager.hasSave(s)) this._slotItems.push(s);
      }
      if (this._slotItems.length === 0) {
        // Shouldn't happen since we only show Load Game when hasAnySave, but guard anyway
        return;
      }
    } else {
      // All slots
      this._slotItems = [];
      for (let s = 1; s <= SaveManager.getSlotCount(); s++) {
        this._slotItems.push(s);
      }
    }
    this._slotIndex = 0;

    this.slotOverlay = document.createElement('div');
    this.slotOverlay.className = 'menu-overlay';

    const title = mode === 'new' ? 'SELECT SAVE SLOT' : 'LOAD GAME';

    const slotsHtml = this._slotItems.map((slot, i) => {
      const info = SaveManager.getSaveInfo(slot);
      const isEmpty = !info;
      const cardClass = `save-slot-card${i === this._slotIndex ? ' selected' : ''}`;

      let content;
      if (isEmpty) {
        content = `
          <div class="save-slot-num">SLOT ${slot}</div>
          <div class="save-slot-status empty">— Empty —</div>
        `;
      } else {
        content = `
          <div class="save-slot-num">SLOT ${slot}</div>
          <div class="save-slot-info">
            <span class="save-slot-level">Level ${info.level}</span>
            <span class="save-slot-room">${formatRoomName(info.currentRoom)}</span>
          </div>
          <div class="save-slot-date">${formatDate(info.timestamp)}</div>
        `;
      }

      return `<div class="${cardClass}" data-slot-idx="${i}" onclick="window.__slotPick(${i})">${content}</div>`;
    }).join('');

    this.slotOverlay.innerHTML = `
      <div class="menu-panel save-slot-panel">
        <div class="menu-title">${title}</div>
        <div class="save-slot-list">${slotsHtml}</div>
        <div class="menu-item" style="margin-top: 16px;" id="slot-back">Back</div>
      </div>
    `;

    document.getElementById('ui-overlay').appendChild(this.slotOverlay);

    window.__slotPick = (idx) => {
      this._slotIndex = idx;
      this._confirmSlot();
    };

    document.getElementById('slot-back').addEventListener('click', () => {
      this._closeSlotPicker();
    });

    this._injectSlotStyles();
  }

  _updateSlotSelection() {
    if (!this.slotOverlay) return;
    const cards = this.slotOverlay.querySelectorAll('.save-slot-card');
    cards.forEach((card, i) => {
      card.classList.toggle('selected', i === this._slotIndex);
    });
  }

  _confirmSlot() {
    const slot = this._slotItems[this._slotIndex];
    const mode = this._slotMode;
    const info = SaveManager.getSaveInfo(slot);

    if (mode === 'new' && info) {
      // Occupied slot — ask to overwrite
      this._showOverwriteConfirm(slot);
      return;
    }

    AudioManager.playSfx('confirm');
    this._closeSlotPicker();
    if (this.onStart) this.onStart(mode, slot);
  }

  _showOverwriteConfirm(slot) {
    const existing = this.slotOverlay.querySelector('.save-slot-confirm');
    if (existing) existing.remove();

    const confirm = document.createElement('div');
    confirm.className = 'save-slot-confirm';
    confirm.innerHTML = `
      <div style="color: #e94560; margin-bottom: 10px;">Overwrite save in Slot ${slot}?</div>
      <div style="display:flex; gap: 12px; justify-content: center;">
        <div class="menu-item" id="confirm-overwrite">Overwrite</div>
        <div class="menu-item" id="cancel-overwrite">Cancel</div>
      </div>
    `;
    this.slotOverlay.querySelector('.save-slot-panel').appendChild(confirm);

    document.getElementById('confirm-overwrite').addEventListener('click', () => {
      SaveManager.deleteSave(slot);
      AudioManager.playSfx('confirm');
      this._closeSlotPicker();
      if (this.onStart) this.onStart('new', slot);
    });
    document.getElementById('cancel-overwrite').addEventListener('click', () => {
      confirm.remove();
    });
  }

  _closeSlotPicker() {
    if (window.__slotPick) delete window.__slotPick;
    if (this.slotOverlay && this.slotOverlay.parentNode) {
      this.slotOverlay.parentNode.removeChild(this.slotOverlay);
    }
    this.slotOverlay = null;
    this._slotMode = null;
  }

  _injectSlotStyles() {
    if (document.getElementById('save-slot-styles')) return;
    const style = document.createElement('style');
    style.id = 'save-slot-styles';
    style.textContent = `
      .save-slot-panel { min-width: 340px; }
      .save-slot-list { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
      .save-slot-card {
        border: 2px solid #444;
        padding: 12px 16px;
        cursor: pointer;
        font-family: 'VT323', monospace;
        transition: border-color 0.1s, background 0.1s;
        background: rgba(255,255,255,0.03);
      }
      .save-slot-card:hover, .save-slot-card.selected {
        border-color: #e94560;
        background: rgba(233,69,96,0.08);
      }
      .save-slot-num {
        font-size: 13px;
        color: #888;
        margin-bottom: 4px;
        letter-spacing: 1px;
      }
      .save-slot-status.empty { color: #555; font-size: 20px; }
      .save-slot-info {
        display: flex;
        gap: 16px;
        font-size: 22px;
        color: #eee;
      }
      .save-slot-level { color: #64dc64; }
      .save-slot-room  { color: #53a8b6; }
      .save-slot-date  { font-size: 16px; color: #666; margin-top: 2px; }
      .save-slot-confirm {
        margin-top: 14px;
        padding-top: 14px;
        border-top: 1px solid #333;
        text-align: center;
        font-family: 'VT323', monospace;
        font-size: 20px;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Controls overlay ───────────────────────────────────────────────────────

  _showControls() {
    if (this.controlsOverlay) return;

    this.controlsOverlay = document.createElement('div');
    this.controlsOverlay.className = 'menu-overlay';
    this.controlsOverlay.innerHTML = `
      <div class="menu-panel">
        <div class="menu-title">CONTROLS</div>
        <div style="color: #ddd; font-family: 'VT323', monospace; font-size: 22px; line-height: 1.8;">
          <div><span style="color: #e94560;">WASD / Arrows</span> - Move</div>
          <div><span style="color: #e94560;">E / Enter</span> - Interact / Confirm</div>
          <div><span style="color: #e94560;">ESC</span> - Back / Menu</div>
          <div><span style="color: #e94560;">Space</span> - Advance Dialog</div>
          ${'ontouchstart' in window ? `
          <div style="margin-top: 12px; border-top: 1px solid #333; padding-top: 12px;">
            <div style="color: #53a8b6; font-size: 18px; margin-bottom: 6px;">TOUCH CONTROLS</div>
            <div><span style="color: #e94560;">D-Pad</span> - Move</div>
            <div><span style="color: #64dc64;">A Button</span> - Interact / Confirm</div>
            <div><span style="color: #dc6464;">B Button</span> - Back / Menu</div>
            <div><span style="color: #e94560;">Tap Dialog</span> - Advance Text</div>
          </div>
          ` : ''}
          <div style="margin-top: 16px; color: #888; font-size: 18px;">
            "Your patience is your HP.<br>Your coffee is your mana.<br>Welcome to corporate America."
          </div>
        </div>
        <div class="menu-item" style="margin-top: 20px;" id="controls-back">Back</div>
      </div>
    `;
    document.getElementById('ui-overlay').appendChild(this.controlsOverlay);
    document.getElementById('controls-back').addEventListener('click', () => {
      this._closeControls();
    });
  }

  _closeControls() {
    if (this.controlsOverlay && this.controlsOverlay.parentNode) {
      this.controlsOverlay.parentNode.removeChild(this.controlsOverlay);
    }
    this.controlsOverlay = null;
  }

  // ── Input ──────────────────────────────────────────────────────────────────

  update(dt) {
    if (this.controlsOverlay) {
      if (InputManager.isConfirmPressed() || InputManager.isCancelPressed()) {
        this._closeControls();
      }
      return;
    }

    if (this.slotOverlay) {
      if (InputManager.isCancelPressed()) {
        this._closeSlotPicker();
        return;
      }
      if (InputManager.isJustPressed('arrowup') || InputManager.isJustPressed('w')) {
        this._slotIndex = Math.max(0, this._slotIndex - 1);
        this._updateSlotSelection();
        AudioManager.playSfx('cursor');
      }
      if (InputManager.isJustPressed('arrowdown') || InputManager.isJustPressed('s')) {
        this._slotIndex = Math.min(this._slotItems.length - 1, this._slotIndex + 1);
        this._updateSlotSelection();
        AudioManager.playSfx('cursor');
      }
      if (InputManager.isConfirmPressed()) {
        this._confirmSlot();
      }
      return;
    }

    if (InputManager.isJustPressed('arrowup') || InputManager.isJustPressed('w')) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this._updateSelection();
      AudioManager.playSfx('cursor');
    }
    if (InputManager.isJustPressed('arrowdown') || InputManager.isJustPressed('s')) {
      this.selectedIndex = Math.min(this.menuItems.length - 1, this.selectedIndex + 1);
      this._updateSelection();
      AudioManager.playSfx('cursor');
    }
    if (InputManager.isConfirmPressed()) {
      this._select();
    }
  }
}
