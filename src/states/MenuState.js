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
    this.menuItems = ['Resume', 'Save Game', 'Controls', 'Audio Settings', 'Quit to Title'];
    this.controlsOverlay = null;
    this.audioOverlay = null;
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

    const stats = document.createElement('div');
    stats.style.cssText = 'color: #aaa; font-family: "VT323", monospace; font-size: 18px; margin-bottom: 16px; text-align: center;';
    stats.innerHTML = `
      Lv.${this.player.stats.level} - HP: ${this.player.stats.hp}/${this.player.stats.maxHP} - Coffee: ${this.player.stats.mp}/${this.player.stats.maxMP}
    `;
    panel.appendChild(stats);

    const items = document.createElement('div');
    items.className = 'menu-items';

    this.menuItems.forEach((label, i) => {
      const item = document.createElement('div');
      item.className = `menu-item${i === this.selectedIndex ? ' selected' : ''}`;
      item.textContent = label;
      item.addEventListener('click', () => {
        if (this.controlsOverlay) return;
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
    this._closeControls();
    this._closeAudioSettings();
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
      case 'Audio Settings':
        this._showAudioSettings();
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
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8); color: ${success ? '#44ff44' : '#ff4444'};
      padding: 16px 32px; border-radius: 8px; font-family: 'Press Start 2P', cursive;
      font-size: 16px; z-index: 200;
    `;
    flash.textContent = msg;
    document.getElementById('ui-overlay').appendChild(flash);
    setTimeout(() => {
      if (flash.parentNode) flash.parentNode.removeChild(flash);
    }, 1500);
  }

  _showControls() {
    if (this.controlsOverlay) return;

    this.controlsOverlay = document.createElement('div');
    this.controlsOverlay.className = 'menu-overlay';
    this.controlsOverlay.style.zIndex = '60';
    this.controlsOverlay.innerHTML = `
      <div class="menu-panel">
        <div class="menu-title">CONTROLS</div>
        <div style="color: #ddd; font-family: 'VT323', monospace; font-size: 22px; line-height: 1.8;">
          <div><span style="color: #e94560;">WASD / Arrows</span> - Move</div>
          <div><span style="color: #e94560;">E / Enter</span> - Interact / Confirm</div>
          <div><span style="color: #e94560;">ESC</span> - Back / Pause Menu</div>
          <div><span style="color: #e94560;">Space</span> - Advance Dialog</div>
        </div>
        <div class="menu-item" style="margin-top: 20px;" id="menu-controls-back">Back</div>
      </div>
    `;
    document.getElementById('ui-overlay').appendChild(this.controlsOverlay);
    document.getElementById('menu-controls-back').addEventListener('click', () => {
      this._closeControls();
    });
  }

  _closeControls() {
    if (this.controlsOverlay && this.controlsOverlay.parentNode) {
      this.controlsOverlay.parentNode.removeChild(this.controlsOverlay);
    }
    this.controlsOverlay = null;
  }

  _showAudioSettings() {
    if (this.audioOverlay) return;

    const musicVol  = Math.round(AudioManager.musicVolume * 100);
    const sfxVol    = Math.round(AudioManager.sfxVolume * 100);
    const musicOn   = AudioManager.musicVolume > 0;

    this.audioOverlay = document.createElement('div');
    this.audioOverlay.className = 'menu-overlay';
    this.audioOverlay.style.zIndex = '60';

    const render = () => {
      const mv = Math.round(AudioManager.musicVolume * 100);
      const sv = Math.round(AudioManager.sfxVolume * 100);
      const on = AudioManager.musicVolume > 0;
      const bar = (pct) => {
        const filled = Math.round(pct / 10);
        return '■'.repeat(filled) + '□'.repeat(10 - filled);
      };
      this.audioOverlay.innerHTML = `
        <div class="menu-panel">
          <div class="menu-title">AUDIO</div>
          <div style="color:#ddd;font-family:'VT323',monospace;font-size:22px;line-height:2.2;">
            <div>
              <span style="color:#e94560;">Music:</span>
              <span id="audio-music-toggle" style="cursor:pointer;margin-left:12px;color:${on ? '#44ff44' : '#ff4444'};">
                ${on ? 'ON' : 'OFF'}
              </span>
            </div>
            <div><span style="color:#e94560;">Music Vol:</span> [${bar(mv)}] ${mv}%</div>
            <div style="font-size:16px;color:#888;margin-left:8px;">← → to adjust</div>
            <div><span style="color:#e94560;">SFX Vol:</span>&nbsp;&nbsp; [${bar(sv)}] ${sv}%</div>
            <div style="font-size:16px;color:#888;margin-left:8px;">← → to adjust</div>
          </div>
          <div class="menu-item" style="margin-top:16px;" id="audio-back">Back</div>
        </div>
      `;
      document.getElementById('audio-music-toggle')?.addEventListener('click', () => {
        if (AudioManager.musicVolume > 0) {
          AudioManager.setMusicVolume(0);
        } else {
          AudioManager.setMusicVolume(0.3);
        }
        render();
      });
      document.getElementById('audio-back')?.addEventListener('click', () => this._closeAudioSettings());
    };

    document.getElementById('ui-overlay').appendChild(this.audioOverlay);
    if (this.element) this.element.style.display = 'none';
    render();
    this._audioRender = render;
    this._audioFocus = 'music'; // 'music' or 'sfx'
  }

  _closeAudioSettings() {
    if (this.audioOverlay && this.audioOverlay.parentNode) {
      this.audioOverlay.parentNode.removeChild(this.audioOverlay);
    }
    this.audioOverlay = null;
    this._audioRender = null;
    if (this.element) this.element.style.display = '';
  }

  update(dt) {
    if (this.controlsOverlay) {
      if (InputManager.isConfirmPressed() || InputManager.isCancelPressed()) {
        this._closeControls();
      }
      return;
    }

    if (this.audioOverlay) {
      if (InputManager.isCancelPressed()) { this._closeAudioSettings(); return; }

      const left  = InputManager.isJustPressed('arrowleft')  || InputManager.isJustPressed('a');
      const right = InputManager.isJustPressed('arrowright') || InputManager.isJustPressed('d');
      const up    = InputManager.isJustPressed('arrowup')    || InputManager.isJustPressed('w');
      const down  = InputManager.isJustPressed('arrowdown')  || InputManager.isJustPressed('s');

      if (up || down) {
        this._audioFocus = this._audioFocus === 'music' ? 'sfx' : 'music';
        AudioManager.playSfx('cursor');
      }
      if (left || right) {
        const delta = right ? 0.1 : -0.1;
        if (this._audioFocus === 'music') {
          AudioManager.setMusicVolume(AudioManager.musicVolume + delta);
        } else {
          AudioManager.setSfxVolume(AudioManager.sfxVolume + delta);
          AudioManager.playSfx('cursor');
        }
      }
      if (left || right || up || down) this._audioRender?.();
      if (InputManager.isConfirmPressed()) { this._closeAudioSettings(); return; }
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
    if (InputManager.isCancelPressed()) {
      this.stateManager.pop();
    }
  }
}
