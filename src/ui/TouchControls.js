import { InputManager } from '../core/InputManager.js';

/**
 * Mobile touch controls overlay.
 * Renders a virtual d-pad (left) and action buttons (right).
 * Writes directly into InputManager.keys so all game logic works unchanged.
 */

const DPAD_SIZE = 140;
const BUTTON_SIZE = 56;
const EDGE_MARGIN = 16;
const BOTTOM_MARGIN = 24;

// Keys we inject into InputManager
const DIR_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
const ACTION_KEYS = { A: 'e', B: 'escape' };

export class TouchControls {
  constructor() {
    this.container = null;
    this.dpad = null;
    this.active = false;
    this._activeDirs = new Set();
    this._activeButtons = new Set();
    this._dpadTouchId = null;
    this._bound = {};
  }

  init() {
    // Only show on touch-capable devices
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;

    this._build();
    this.active = true;

    // Prevent double-tap zoom on the game container
    document.getElementById('game-container').style.touchAction = 'manipulation';
  }

  _build() {
    // Container
    this.container = document.createElement('div');
    this.container.id = 'touch-controls';
    this.container.innerHTML = `
      <div class="touch-dpad" id="touch-dpad">
        <div class="dpad-bg">
          <div class="dpad-arrow dpad-up" data-dir="arrowup"></div>
          <div class="dpad-arrow dpad-down" data-dir="arrowdown"></div>
          <div class="dpad-arrow dpad-left" data-dir="arrowleft"></div>
          <div class="dpad-arrow dpad-right" data-dir="arrowright"></div>
          <div class="dpad-center"></div>
        </div>
      </div>
      <div class="touch-buttons">
        <div class="touch-btn touch-btn-a" data-action="A">A</div>
        <div class="touch-btn touch-btn-b" data-action="B">B</div>
      </div>
    `;

    document.getElementById('game-container').appendChild(this.container);

    // D-pad zone touch handling (continuous, tracks position)
    this.dpad = document.getElementById('touch-dpad');
    this._bound.dpadStart = this._onDpadStart.bind(this);
    this._bound.dpadMove = this._onDpadMove.bind(this);
    this._bound.dpadEnd = this._onDpadEnd.bind(this);

    this.dpad.addEventListener('touchstart', this._bound.dpadStart, { passive: false });
    this.dpad.addEventListener('touchmove', this._bound.dpadMove, { passive: false });
    this.dpad.addEventListener('touchend', this._bound.dpadEnd, { passive: false });
    this.dpad.addEventListener('touchcancel', this._bound.dpadEnd, { passive: false });

    // Action buttons
    const buttons = this.container.querySelectorAll('.touch-btn');
    this._bound.btnStart = this._onBtnStart.bind(this);
    this._bound.btnEnd = this._onBtnEnd.bind(this);

    buttons.forEach(btn => {
      btn.addEventListener('touchstart', this._bound.btnStart, { passive: false });
      btn.addEventListener('touchend', this._bound.btnEnd, { passive: false });
      btn.addEventListener('touchcancel', this._bound.btnEnd, { passive: false });
    });
  }

  // --- D-pad logic: compute direction from touch position relative to d-pad center ---

  _onDpadStart(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    this._dpadTouchId = touch.identifier;
    this._updateDpadFromTouch(touch);
  }

  _onDpadMove(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === this._dpadTouchId) {
        this._updateDpadFromTouch(touch);
        return;
      }
    }
  }

  _onDpadEnd(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
      if (touch.identifier === this._dpadTouchId) {
        this._dpadTouchId = null;
        this._clearDirs();
        return;
      }
    }
  }

  _updateDpadFromTouch(touch) {
    const rect = this.dpad.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = touch.clientX - cx;
    const dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const deadzone = rect.width * 0.12;

    const newDirs = new Set();

    if (dist > deadzone) {
      const angle = Math.atan2(dy, dx); // radians, 0 = right

      // 8-direction with 45-degree sectors
      // Right: -PI/8 to PI/8
      // Down-Right: PI/8 to 3PI/8
      // Down: 3PI/8 to 5PI/8
      // etc.
      if (angle > -Math.PI * 3 / 8 && angle < Math.PI * 3 / 8) newDirs.add('arrowright');
      if (angle > Math.PI * 1 / 8 && angle < Math.PI * 7 / 8) newDirs.add('arrowdown');
      if (angle > Math.PI * 5 / 8 || angle < -Math.PI * 5 / 8) newDirs.add('arrowleft');
      if (angle > -Math.PI * 7 / 8 && angle < -Math.PI * 1 / 8) newDirs.add('arrowup');
    }

    // Update visual highlights
    this.dpad.querySelectorAll('.dpad-arrow').forEach(el => {
      el.classList.toggle('active', newDirs.has(el.dataset.dir));
    });

    // Update InputManager keys
    for (const dir of DIR_KEYS) {
      InputManager.keys[dir] = newDirs.has(dir);
    }
    this._activeDirs = newDirs;
  }

  _clearDirs() {
    for (const dir of DIR_KEYS) {
      InputManager.keys[dir] = false;
    }
    this._activeDirs.clear();
    this.dpad.querySelectorAll('.dpad-arrow').forEach(el => el.classList.remove('active'));
  }

  // --- Action buttons ---

  _onBtnStart(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const key = ACTION_KEYS[action];
    if (key) {
      InputManager.keys[key] = true;
      btn.classList.add('active');
      this._activeButtons.add(action);
    }
  }

  _onBtnEnd(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    const action = btn.dataset.action;
    const key = ACTION_KEYS[action];
    if (key) {
      InputManager.keys[key] = false;
      btn.classList.remove('active');
      this._activeButtons.delete(action);
    }
  }

  show() {
    if (this.container) this.container.style.display = '';
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }

  destroy() {
    if (this.dpad) {
      this.dpad.removeEventListener('touchstart', this._bound.dpadStart);
      this.dpad.removeEventListener('touchmove', this._bound.dpadMove);
      this.dpad.removeEventListener('touchend', this._bound.dpadEnd);
      this.dpad.removeEventListener('touchcancel', this._bound.dpadEnd);
    }
    if (this.container) {
      this.container.querySelectorAll('.touch-btn').forEach(btn => {
        btn.removeEventListener('touchstart', this._bound.btnStart);
        btn.removeEventListener('touchend', this._bound.btnEnd);
        btn.removeEventListener('touchcancel', this._bound.btnEnd);
      });
      this.container.remove();
    }
    this.active = false;
  }
}
