import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { SaveManager } from '../core/SaveManager.js';
import { EventBus } from '../core/EventBus.js';

export class MenuState {
  constructor(stateManager, player) {
    this.stateManager = stateManager;
    this.player = player;
    this.element = null;
    this.selectedIndex = 0;
    this.menuItems = ['Resume', 'Save Game', 'Controls', 'Quit to Title'];
  }

  enter() {
    const overlay = document.getElementById('ui-overlay');

    this.element = document.createElement('div');
    this.element.className = 'menu-overlay';

    const panel = document.createElement('div');
    panel.className = 'menu-panel';

    const title = document.createElement('div');
    title.className = 'menu-title';
    title.textContent = 'PAUSED';
    panel.appendChild(title);

    // Player stats summary
    const stats = document.createElement('div');
    stats.style.cssText = 'color: #aaa; font-family: "VT323", monospace; font-size: 18px; margin-bottom: 16px; text-align: center;';
    stats.innerHTML = `
      Lv.${this.player.stats.level} — HP: ${this.player.stats.hp}/${this.player.stats.maxHP} — Coffee: ${this.player.stats.mp}/${this.player.stats.maxMP}
    `;
    panel.appendChild(stats);

    const items = document.createElement('div');
    items.className = 'menu-items';

    this.menuItems.forEach((label, i) => {
      const item = document.createElement('div');
      item.className = `menu-item${i === this.selectedIndex ? ' selected' : ''}`;
      item.textContent = label;
      item.addEventListener('click', () => {
        this.selectedIndex = i;
        this._select();
      });
      items.appendChild(item);
    });

    panel.appendChild(items);
    this.element.appendChild(panel);
    overlay.appendChild(this.element);
  }

  exit() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }

  _updateSelection() {
    const items = this.element.querySelectorAll('.menu-item');
    items.forEach((item, i) => {
      item.classList.toggle('selected', i === this.selectedIndex);
    });
  }

  _select() {
    const choice = this.menuItems[this.selectedIndex];
    AudioManager.playSfx('confirm');

    switch (choice) {
      case 'Resume':
        this.stateManager.pop();
        break;
      case 'Save Game':
        this._saveGame();
        break;
      case 'Controls':
        this._showControls();
        break;
      case 'Quit to Title':
        EventBus.emit('quit-to-title');
        break;
    }
  }

  _saveGame() {
    const data = this.player.serialize();
    const success = SaveManager.save(data);
    const msg = success ? 'Game Saved!' : 'Save Failed!';
    // Brief flash message
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8); color: ${success ? '#44ff44' : '#ff4444'};
      padding: 16px 32px; border-radius: 8px; font-family: 'Press Start 2P', cursive;
      font-size: 16px; z-index: 200;
    `;
    flash.textContent = msg;
    document.getElementById('ui-overlay').appendChild(flash);
    setTimeout(() => { if (flash.parentNode) flash.parentNode.removeChild(flash); }, 1500);
  }

  _showControls() {
    // Same as title screen controls
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    overlay.style.zIndex = '60';
    overlay.innerHTML = `
      <div class="menu-panel">
        <div class="menu-title">CONTROLS</div>
        <div style="color: #ddd; font-family: 'VT323', monospace; font-size: 22px; line-height: 1.8;">
          <div><span style="color: #e94560;">WASD / Arrows</span> — Move</div>
          <div><span style="color: #e94560;">E / Enter</span> — Interact / Confirm</div>
          <div><span style="color: #e94560;">ESC</span> — Back / Pause Menu</div>
          <div><span style="color: #e94560;">Space</span> — Advance Dialog</div>
        </div>
        <div class="menu-item" style="margin-top: 20px;" id="menu-controls-back">← Back</div>
      </div>
    `;
    document.getElementById('ui-overlay').appendChild(overlay);
    document.getElementById('menu-controls-back').addEventListener('click', () => {
      overlay.parentNode.removeChild(overlay);
    });
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
    if (InputManager.isCancelPressed()) {
      this.stateManager.pop();
    }
  }
}
