import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { SaveManager } from '../core/SaveManager.js';
import { EventBus } from '../core/EventBus.js';

export class TitleState {
  constructor(stateManager, onStart) {
    this.stateManager = stateManager;
    this.onStart = onStart;
    this.element = null;
    this.selectedIndex = 0;
    this.menuItems = [];
    this.hasSave = SaveManager.hasSave();
  }

  enter() {
    AudioManager.stopMusic(0.5);
    const overlay = document.getElementById('ui-overlay');

    this.element = document.createElement('div');
    this.element.className = 'title-screen';

    // Logo
    const logo = document.createElement('div');
    logo.className = 'title-logo';
    logo.innerHTML = `
      <span class="title-main">TRUST ISSUES</span>
      <span class="title-sub">A WELLS FARGO SIMULATOR</span>
    `;
    this.element.appendChild(logo);

    // Menu
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
        this.selectedIndex = i;
        this._select();
      });
      menu.appendChild(item);
    });

    this.element.appendChild(menu);

    // Bottom prompt
    const prompt = document.createElement('div');
    prompt.className = 'title-prompt';
    prompt.textContent = 'Press ENTER to start';
    this.element.appendChild(prompt);

    // Version
    const version = document.createElement('div');
    version.className = 'title-version';
    version.textContent = 'v1.0.0 // "Handle their assets carefully"';
    this.element.appendChild(version);

    overlay.appendChild(this.element);
  }

  exit() {
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
    // Simple controls overlay
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    overlay.innerHTML = `
      <div class="menu-panel">
        <div class="menu-title">CONTROLS</div>
        <div style="color: #ddd; font-family: 'VT323', monospace; font-size: 22px; line-height: 1.8;">
          <div><span style="color: #e94560;">WASD / Arrows</span> — Move</div>
          <div><span style="color: #e94560;">E / Enter</span> — Interact / Confirm</div>
          <div><span style="color: #e94560;">ESC</span> — Back / Menu</div>
          <div><span style="color: #e94560;">Space</span> — Advance Dialog</div>
          <div style="margin-top: 16px; color: #888; font-size: 18px;">
            "Your patience is your HP.<br>Your coffee is your mana.<br>Welcome to corporate America."
          </div>
        </div>
        <div class="menu-item" style="margin-top: 20px;" id="controls-back">← Back</div>
      </div>
    `;
    document.getElementById('ui-overlay').appendChild(overlay);
    document.getElementById('controls-back').addEventListener('click', () => {
      overlay.parentNode.removeChild(overlay);
    });
    // Also close on ESC
    const handler = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        window.removeEventListener('keydown', handler);
      }
    };
    window.addEventListener('keydown', handler);
  }

  update(dt) {
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
