import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { SaveManager } from '../core/SaveManager.js';

export class TitleState {
  constructor(stateManager, onStart) {
    this.stateManager = stateManager;
    this.onStart = onStart;
    this.element = null;
    this.selectedIndex = 0;
    this.menuItems = [];
    this.hasSave = SaveManager.hasSave();
    this.controlsOverlay = null;
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
    if (this.hasSave) this.menuItems.push('Continue');
    this.menuItems.push('Controls');

    this.menuItems.forEach((label, i) => {
      const item = document.createElement('div');
      item.className = `title-menu-item${i === this.selectedIndex ? ' selected' : ''}`;
      item.textContent = label;
      item.addEventListener('click', () => {
        if (this.controlsOverlay) return;
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
      if (this.onStart) this.onStart('new');
    } else if (choice === 'Continue') {
      if (this.onStart) this.onStart('continue');
    } else if (choice === 'Controls') {
      this._showControls();
    }
  }

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

  update(dt) {
    if (this.controlsOverlay) {
      if (InputManager.isConfirmPressed() || InputManager.isCancelPressed()) {
        this._closeControls();
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
