import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { SaveManager } from '../core/SaveManager.js';
import { EventBus } from '../core/EventBus.js';
import { BESTIARY_DATA } from '../data/bestiary.js';
import { ENEMY_STATS, PLAYER_ABILITIES } from '../data/stats.js';
import { COSMETICS, COSMETIC_SLOTS } from '../data/cosmetics.js';
import { AchievementManager } from '../core/AchievementManager.js';

export class MenuState {
  constructor(stateManager, player) {
    this.stateManager = stateManager;
    this.player = player;
    this.element = null;
    this.selectedIndex = 0;
    this.menuItems = ['Resume', 'Abilities', 'Cosmetics', 'Journal', 'Achievements', 'Save Game', 'Controls', 'Audio Settings', 'Quit to Title'];
    this.achievementsOverlay = null;
    this.controlsOverlay = null;
    this.audioOverlay = null;
    this.bestiaryOverlay = null;
    this.abilitiesOverlay = null;
    this.cosmeticsOverlay = null;
    this.bestiarySelectedIndex = 0;
    this._abilitySelectedIndex = 0;
    this._cosmeticSelectedIndex = 0;
    this._cosmeticSlotIndex = 0;
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
    this._closeBestiary();
    this._closeControls();
    this._closeAudioSettings();
    this._closeAbilities();
    this._closeCosmetics();
    this._closeAchievements();
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
      case 'Abilities':
        this._showAbilities();
        break;
      case 'Cosmetics':
        this._showCosmetics();
        break;
      case 'Journal':
        this._showBestiary();
        break;
      case 'Achievements':
        this._showAchievements();
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

  _showBestiary() {
    if (this.bestiaryOverlay) return;

    const entries = Object.entries(BESTIARY_DATA);
    const defeated = entries.filter(([id]) => this.player.getFlag('bestiary_' + id));
    const clientCount = this.player.getFlag('portfolioClients') || 0;

    this.bestiaryOverlay = document.createElement('div');
    this.bestiaryOverlay.className = 'menu-overlay';
    this.bestiaryOverlay.style.zIndex = '60';

    const panel = document.createElement('div');
    panel.className = 'menu-panel bestiary-panel';

    const title = document.createElement('div');
    title.className = 'menu-title';
    title.textContent = 'JOURNAL';
    panel.appendChild(title);

    const summary = document.createElement('div');
    summary.className = 'bestiary-summary';
    summary.innerHTML = `
      <span>Defeated: ${defeated.length} / ${entries.length}</span>
      <span>Clients Served: ${clientCount}</span>
    `;
    panel.appendChild(summary);

    const grid = document.createElement('div');
    grid.className = 'bestiary-grid';

    entries.forEach(([id, entry]) => {
      const isDefeated = this.player.getFlag('bestiary_' + id);
      const stats = ENEMY_STATS[id];
      const card = document.createElement('div');
      card.className = `bestiary-card${isDefeated ? ' defeated' : ' unknown'}`;

      if (isDefeated && stats) {
        card.innerHTML = `
          <div class="bestiary-card-header">
            <span class="bestiary-name">${entry.name}</span>
            <span class="bestiary-category">${entry.category}</span>
          </div>
          <div class="bestiary-stats">
            <span>HP: ${stats.maxHP}</span>
            <span>ATK: ${stats.atk}</span>
            <span>DEF: ${stats.def}</span>
            <span>SPD: ${stats.spd}</span>
          </div>
          <div class="bestiary-quip">"${entry.quip}"</div>
        `;
      } else {
        card.innerHTML = `
          <div class="bestiary-card-header">
            <span class="bestiary-name">???</span>
            <span class="bestiary-category">${entry.category}</span>
          </div>
          <div class="bestiary-stats">
            <span>HP: ???</span>
            <span>ATK: ???</span>
            <span>DEF: ???</span>
            <span>SPD: ???</span>
          </div>
          <div class="bestiary-quip unknown-quip">Not yet defeated</div>
        `;
      }

      grid.appendChild(card);
    });

    panel.appendChild(grid);

    const back = document.createElement('div');
    back.className = 'menu-item';
    back.style.marginTop = '16px';
    back.textContent = 'Back';
    back.id = 'bestiary-back';
    back.addEventListener('click', () => this._closeBestiary());
    panel.appendChild(back);

    this.bestiaryOverlay.appendChild(panel);
    document.getElementById('ui-overlay').appendChild(this.bestiaryOverlay);
    if (this.element) this.element.style.display = 'none';
  }

  _closeBestiary() {
    if (this.bestiaryOverlay && this.bestiaryOverlay.parentNode) {
      this.bestiaryOverlay.parentNode.removeChild(this.bestiaryOverlay);
    }
    this.bestiaryOverlay = null;
    if (this.element) this.element.style.display = '';
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
      const focusMusic = this._audioFocus === 'music';
      const hl = 'background:rgba(233,69,96,0.15);border-left:3px solid #e94560;padding-left:8px;margin-left:-11px;';
      this.audioOverlay.innerHTML = `
        <div class="menu-panel">
          <div class="menu-title">AUDIO</div>
          <div style="color:#ddd;font-family:'VT323',monospace;font-size:22px;line-height:2.2;">
            <div style="${focusMusic ? hl : ''}">
              <span style="color:#e94560;">Music:</span>
              <span id="audio-music-toggle" style="cursor:pointer;margin-left:12px;color:${on ? '#44ff44' : '#ff4444'};">
                ${on ? 'ON' : 'OFF'}
              </span>
              &nbsp; [${bar(mv)}] ${mv}%
            </div>
            <div style="${!focusMusic ? hl : ''}">
              <span style="color:#e94560;">SFX Vol:</span>&nbsp;&nbsp; [${bar(sv)}] ${sv}%
            </div>
            <div style="font-size:16px;color:#888;margin-left:8px;">↑↓ select &nbsp; ← → adjust</div>
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

  // ---- Abilities Screen ----
  _showAbilities() {
    if (this.abilitiesOverlay) return;
    // Dismiss upgrade tooltip — player has seen the abilities screen
    EventBus.emit('abilities-viewed');
    this.abilitiesOverlay = document.createElement('div');
    this.abilitiesOverlay.className = 'menu-overlay';
    this.abilitiesOverlay.style.zIndex = '60';
    this._abilitySelectedIndex = 0;
    this._renderAbilities();
    document.getElementById('ui-overlay').appendChild(this.abilitiesOverlay);
    if (this.element) this.element.style.display = 'none';
  }

  _renderAbilities() {
    if (!this.abilitiesOverlay) return;
    const panel = document.createElement('div');
    panel.className = 'menu-panel abilities-panel';

    const title = document.createElement('div');
    title.className = 'menu-title';
    title.textContent = 'ABILITIES';
    panel.appendChild(title);

    const pointsDiv = document.createElement('div');
    pointsDiv.className = 'abilities-points';
    pointsDiv.innerHTML = `Upgrade Points: <span class="abilities-points-value">${this.player.upgradePoints}</span>`;
    panel.appendChild(pointsDiv);

    const grid = document.createElement('div');
    grid.className = 'abilities-grid';

    // Group abilities by tier
    const allAbilities = Object.entries(PLAYER_ABILITIES).filter(([, a]) => !a.unlockQuest);
    const questAbilities = Object.entries(PLAYER_ABILITIES).filter(([, a]) => a.unlockQuest);
    const tiers = [0, 1, 2, 3];
    let itemIndex = 0;

    for (const tier of tiers) {
      const tierAbilities = allAbilities.filter(([, a]) => (a.tier ?? 0) === tier);
      if (tierAbilities.length === 0) continue;

      const tierLabel = document.createElement('div');
      tierLabel.className = 'abilities-tier-label';
      tierLabel.textContent = tier === 0 ? 'STARTER' : `TIER ${tier}`;
      grid.appendChild(tierLabel);

      for (const [id, ability] of tierAbilities) {
        const unlocked = this.player.unlockedAbilities.has(id);
        const canUnlock = this.player.canUnlockAbility(id);
        const hasPrereq = !ability.requires || this.player.unlockedAbilities.has(ability.requires);
        const idx = itemIndex++;

        const card = document.createElement('div');
        card.className = `ability-card${unlocked ? ' unlocked' : canUnlock ? ' available' : ' locked'}${idx === this._abilitySelectedIndex ? ' selected' : ''}`;
        card.dataset.index = idx;

        const header = document.createElement('div');
        header.className = 'ability-card-header';
        header.innerHTML = `<span class="ability-name">${ability.name}</span>`;
        if (!unlocked && ability.upgradePointCost) {
          header.innerHTML += `<span class="ability-cost-badge">${ability.upgradePointCost} PT${ability.upgradePointCost > 1 ? 'S' : ''}</span>`;
        }
        if (unlocked) {
          header.innerHTML += `<span class="ability-unlocked-badge">LEARNED</span>`;
        }
        card.appendChild(header);

        const desc = document.createElement('div');
        desc.className = 'ability-desc';
        desc.textContent = ability.description;
        card.appendChild(desc);

        const meta = document.createElement('div');
        meta.className = 'ability-meta';
        const typeLabel = ability.type === 'attack' ? 'ATK' : ability.type === 'heal' ? 'HEAL' : ability.type === 'buff' ? 'BUFF' : ability.type === 'debuff' ? 'DEBUFF' : ability.type.toUpperCase();
        meta.innerHTML = `<span>${typeLabel}</span><span>${ability.cost} Coffee</span>`;
        if (ability.power) meta.innerHTML += `<span>Power: ${ability.power}</span>`;
        if (ability.healAmount) meta.innerHTML += `<span>+${ability.healAmount} HP</span>`;
        card.appendChild(meta);

        if (!unlocked && ability.requires && !hasPrereq) {
          const req = document.createElement('div');
          req.className = 'ability-req';
          req.textContent = `Requires: ${PLAYER_ABILITIES[ability.requires]?.name || ability.requires}`;
          card.appendChild(req);
        }

        card.addEventListener('click', () => {
          this._abilitySelectedIndex = idx;
          if (canUnlock) {
            this.player.unlockAbility(id);
            AudioManager.playSfx('confirm');
          }
          this._rerenderAbilities();
        });
        grid.appendChild(card);
      }
    }

    // Quest abilities section
    if (questAbilities.length > 0) {
      const tierLabel = document.createElement('div');
      tierLabel.className = 'abilities-tier-label';
      tierLabel.textContent = 'QUEST REWARDS';
      grid.appendChild(tierLabel);

      for (const [id, ability] of questAbilities) {
        const unlocked = this.player.questStates[ability.unlockQuest] === 'complete';
        const idx = itemIndex++;

        const card = document.createElement('div');
        card.className = `ability-card${unlocked ? ' unlocked' : ' locked'}${idx === this._abilitySelectedIndex ? ' selected' : ''}`;
        card.dataset.index = idx;

        const header = document.createElement('div');
        header.className = 'ability-card-header';
        header.innerHTML = `<span class="ability-name">${unlocked ? ability.name : '???'}</span>`;
        if (unlocked) header.innerHTML += `<span class="ability-unlocked-badge">LEARNED</span>`;
        card.appendChild(header);

        const desc = document.createElement('div');
        desc.className = 'ability-desc';
        desc.textContent = unlocked ? ability.description : 'Complete the associated quest to unlock';
        card.appendChild(desc);

        if (unlocked) {
          const meta = document.createElement('div');
          meta.className = 'ability-meta';
          meta.innerHTML = `<span>${ability.type.toUpperCase()}</span><span>${ability.cost} Coffee</span>`;
          if (ability.power) meta.innerHTML += `<span>Power: ${ability.power}</span>`;
          card.appendChild(meta);
        }

        grid.appendChild(card);
      }
    }

    panel.appendChild(grid);

    const back = document.createElement('div');
    back.className = 'menu-item';
    back.style.marginTop = '16px';
    back.textContent = 'Back';
    back.addEventListener('click', () => this._closeAbilities());
    panel.appendChild(back);

    this.abilitiesOverlay.innerHTML = '';
    this.abilitiesOverlay.appendChild(panel);
  }

  _rerenderAbilities() {
    this._renderAbilities();
  }

  _closeAbilities() {
    if (this.abilitiesOverlay && this.abilitiesOverlay.parentNode) {
      this.abilitiesOverlay.parentNode.removeChild(this.abilitiesOverlay);
    }
    this.abilitiesOverlay = null;
    if (this.element) this.element.style.display = '';
  }

  // ---- Cosmetics Screen ----
  _showCosmetics() {
    if (this.cosmeticsOverlay) return;
    this.cosmeticsOverlay = document.createElement('div');
    this.cosmeticsOverlay.className = 'menu-overlay';
    this.cosmeticsOverlay.style.zIndex = '60';
    this._cosmeticSlotIndex = 0;
    this._renderCosmetics();
    document.getElementById('ui-overlay').appendChild(this.cosmeticsOverlay);
    if (this.element) this.element.style.display = 'none';
  }

  _renderCosmetics() {
    if (!this.cosmeticsOverlay) return;
    const panel = document.createElement('div');
    panel.className = 'menu-panel cosmetics-panel';

    const title = document.createElement('div');
    title.className = 'menu-title';
    title.textContent = 'COSMETICS';
    panel.appendChild(title);

    // Current equipped summary
    const equipped = document.createElement('div');
    equipped.className = 'cosmetics-equipped';
    for (const slot of COSMETIC_SLOTS) {
      const cosId = this.player.equipped[slot];
      const cos = cosId ? COSMETICS[cosId] : null;
      const div = document.createElement('div');
      div.className = 'cosmetics-slot';
      div.innerHTML = `<span class="cosmetics-slot-label">${slot.toUpperCase()}</span><span class="cosmetics-slot-value">${cos ? cos.name : '— empty —'}</span>`;
      equipped.appendChild(div);
    }
    panel.appendChild(equipped);

    // Items by slot
    for (const slot of COSMETIC_SLOTS) {
      const slotItems = Object.entries(COSMETICS).filter(([, c]) => c.slot === slot);
      if (slotItems.length === 0) continue;

      const slotLabel = document.createElement('div');
      slotLabel.className = 'abilities-tier-label';
      slotLabel.textContent = slot.toUpperCase();
      panel.appendChild(slotLabel);

      const row = document.createElement('div');
      row.className = 'cosmetics-items-row';

      for (const [id, cos] of slotItems) {
        const unlocked = this.player.isCosmeticUnlocked(id);
        const isEquipped = this.player.equipped[slot] === id;

        const card = document.createElement('div');
        card.className = `cosmetic-card${unlocked ? (isEquipped ? ' equipped' : ' available') : ' locked'}`;

        const header = document.createElement('div');
        header.className = 'ability-card-header';
        header.innerHTML = `<span class="ability-name">${unlocked ? cos.name : '???'}</span>`;
        if (isEquipped) header.innerHTML += `<span class="ability-unlocked-badge">EQUIPPED</span>`;
        card.appendChild(header);

        if (unlocked) {
          const desc = document.createElement('div');
          desc.className = 'ability-desc';
          desc.textContent = cos.description;
          card.appendChild(desc);

          if (cos.stats) {
            const statLine = document.createElement('div');
            statLine.className = 'ability-meta';
            statLine.innerHTML = Object.entries(cos.stats)
              .map(([s, v]) => `<span>+${v} ${s.toUpperCase()}</span>`)
              .join('');
            card.appendChild(statLine);
          }

          card.addEventListener('click', () => {
            if (isEquipped) {
              this.player.unequipCosmetic(slot);
            } else {
              this.player.equipCosmetic(id);
            }
            AudioManager.playSfx('confirm');
            this._rerenderCosmetics();
          });
        } else {
          const desc = document.createElement('div');
          desc.className = 'ability-desc';
          desc.textContent = 'Not yet discovered';
          card.appendChild(desc);
        }

        row.appendChild(card);
      }
      panel.appendChild(row);
    }

    const back = document.createElement('div');
    back.className = 'menu-item';
    back.style.marginTop = '16px';
    back.textContent = 'Back';
    back.addEventListener('click', () => this._closeCosmetics());
    panel.appendChild(back);

    this.cosmeticsOverlay.innerHTML = '';
    this.cosmeticsOverlay.appendChild(panel);
  }

  _rerenderCosmetics() {
    this._renderCosmetics();
  }

  _closeCosmetics() {
    if (this.cosmeticsOverlay && this.cosmeticsOverlay.parentNode) {
      this.cosmeticsOverlay.parentNode.removeChild(this.cosmeticsOverlay);
    }
    this.cosmeticsOverlay = null;
    if (this.element) this.element.style.display = '';
  }

  update(dt) {
    if (this.abilitiesOverlay) {
      if (InputManager.isCancelPressed()) {
        this._closeAbilities();
      }
      return;
    }

    if (this.cosmeticsOverlay) {
      if (InputManager.isCancelPressed()) {
        this._closeCosmetics();
      }
      return;
    }

    if (this.bestiaryOverlay) {
      if (InputManager.isCancelPressed() || InputManager.isConfirmPressed()) {
        this._closeBestiary();
      }
      return;
    }

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

    if (this.achievementsOverlay) {
      if (InputManager.isCancelPressed() || InputManager.isConfirmPressed()) {
        this._closeAchievements();
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
    if (InputManager.isCancelPressed()) {
      this.stateManager.pop();
    }
  }

  _showAchievements() {
    const achievements = AchievementManager.getAll();
    const unlocked = achievements.filter(a => a.unlocked).length;

    this.achievementsOverlay = document.createElement('div');
    this.achievementsOverlay.style.cssText = `
      position: absolute; inset: 0; background: rgba(0,0,0,0.88);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 200; font-family: 'VT323', monospace; color: #fff;
    `;

    const rows = achievements.map(a => {
      const color = a.unlocked ? '#ffd700' : '#444';
      const nameColor = a.unlocked ? '#fff' : '#555';
      return `<div style="display:flex;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="font-size:22px;filter:${a.unlocked ? 'none' : 'grayscale(1) opacity(0.3)'}">${a.icon}</span>
        <div>
          <div style="color:${nameColor};font-size:18px">${a.unlocked ? a.name : '???'}</div>
          <div style="color:${color};font-size:15px">${a.unlocked ? a.desc : 'Locked'}</div>
        </div>
      </div>`;
    }).join('');

    this.achievementsOverlay.innerHTML = `
      <div style="font-family:'Press Start 2P',cursive;font-size:14px;color:#e94560;margin-bottom:12px">ACHIEVEMENTS</div>
      <div style="color:#aaa;font-size:16px;margin-bottom:16px">${unlocked} / ${achievements.length} unlocked</div>
      <div style="min-width:360px;max-width:480px;max-height:380px;overflow-y:auto;padding:0 16px">
        ${rows}
      </div>
      <div style="margin-top:16px;color:#888;font-size:15px">Enter / Esc to close</div>
    `;

    this.achievementsOverlay.addEventListener('click', () => this._closeAchievements());
    document.getElementById('ui-overlay').appendChild(this.achievementsOverlay);
  }

  _closeAchievements() {
    if (this.achievementsOverlay && this.achievementsOverlay.parentNode) {
      this.achievementsOverlay.parentNode.removeChild(this.achievementsOverlay);
    }
    this.achievementsOverlay = null;
  }
}
