import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { SaveManager } from '../core/SaveManager.js';
import { EventBus } from '../core/EventBus.js';
import { BESTIARY_DATA } from '../data/bestiary.js';
import { ENEMY_STATS, PLAYER_ABILITIES, XP_TABLE } from '../data/stats.js';
import { COSMETICS, COSMETIC_SLOTS } from '../data/cosmetics.js';
import { AchievementManager } from '../core/AchievementManager.js';

export class MenuState {
  constructor(stateManager, player) {
    this.stateManager = stateManager;
    this.player = player;
    this.element = null;
    this.selectedIndex = 0;
    this.menuItems = ['Resume', 'Abilities', 'Cosmetics', 'Journal', 'Achievements', 'Stats', 'Save Game', 'Controls', 'Audio Settings', 'Quit to Title'];
    this.achievementsOverlay = null;
    this.controlsOverlay = null;
    this.audioOverlay = null;
    this.bestiaryOverlay = null;
    this.abilitiesOverlay = null;
    this.cosmeticsOverlay = null;
    this.statsOverlay = null;
    this.bestiarySelectedIndex = 0;
    this._abilitySelectedIndex = 0;
    this._cosmeticSelectedIndex = 0;
    this._cosmeticSlotIndex = 0;
  }

  enter() {
    const overlay = document.getElementById('ui-overlay');

    // Tag definitions per menu item
    const itemMeta = {
      'Resume':         { tag: '[SYS]',      tagColor: '#53a8b6', section: 'SYSTEM' },
      'Abilities':      { tag: '[PROFILE]',  tagColor: '#ffcc33', section: 'CHARACTER' },
      'Cosmetics':      { tag: '[PROFILE]',  tagColor: '#ffcc33', section: null },
      'Journal':        { tag: '[DATABASE]', tagColor: '#53a8b6', section: null },
      'Achievements':   { tag: '[RECORDS]',  tagColor: '#53a8b6', section: null },
      'Stats':          { tag: '[PROFILE]',  tagColor: '#ffcc33', section: null },
      'Save Game':      { tag: '[SYS]',      tagColor: '#44cc88', section: 'SETTINGS' },
      'Controls':       { tag: '[SYS]',      tagColor: '#53a8b6', section: null },
      'Audio Settings': { tag: '[SYS]',      tagColor: '#53a8b6', section: null },
      'Quit to Title':  { tag: '[EXIT]',     tagColor: '#e94560', section: null },
    };

    this.element = document.createElement('div');
    this.element.className = 'menu-overlay';

    const panel = document.createElement('div');
    panel.className = 'menu-panel';

    // ── Portal header bar ──
    const header = document.createElement('div');
    header.className = 'menu-portal-header';
    header.innerHTML = `
      <span class="menu-portal-name">EMPLOYEE PORTAL</span>
      <span class="menu-portal-status">⚠ SESSION PAUSED</span>
    `;
    panel.appendChild(header);

    // ── Employee badge ──
    const s = this.player.stats;
    const badge = document.createElement('div');
    badge.className = 'menu-employee-badge';
    badge.innerHTML = `
      <div class="menu-employee-id">
        <span class="menu-employee-id-label">LVL</span>
        <span class="menu-employee-id-value">${s.level}</span>
      </div>
      <div class="menu-employee-info">
        <div class="menu-employee-name">ANDREW</div>
        <div class="menu-employee-role">TRUST OFFICER · DEPT. 7</div>
        <div class="menu-employee-fields">
          <div class="menu-employee-field">
            <span class="menu-employee-field-label">HP</span>
            <span class="menu-employee-field-value">${s.hp}/${s.maxHP}</span>
          </div>
          <div class="menu-employee-field">
            <span class="menu-employee-field-label">☕</span>
            <span class="menu-employee-field-value">${s.mp}/${s.maxMP}</span>
          </div>
          <div class="menu-employee-field">
            <span class="menu-employee-field-label">AUM</span>
            <span class="menu-employee-field-value">$${(s.aum || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>
    `;
    panel.appendChild(badge);

    // ── Nav items ──
    const items = document.createElement('div');
    items.className = 'menu-items';

    let lastSection = null;
    this.menuItems.forEach((label, i) => {
      const meta = itemMeta[label] || { tag: '[SYS]', tagColor: '#888', section: null };

      // Section divider
      if (meta.section && meta.section !== lastSection) {
        const divider = document.createElement('div');
        divider.className = 'menu-nav-divider';
        divider.textContent = meta.section;
        items.appendChild(divider);
        lastSection = meta.section;
      }

      const item = document.createElement('div');
      item.className = `menu-item${i === this.selectedIndex ? ' selected' : ''}`;
      item.innerHTML = `
        <span class="menu-item-label">${label}</span>
        <span class="menu-item-arrow">▶</span>
      `;
      item.addEventListener('click', () => {
        if (this.controlsOverlay) return;
        this.selectedIndex = i;
        this._select();
      });
      items.appendChild(item);
    });

    panel.appendChild(items);

    // ── Footer ──
    const footer = document.createElement('div');
    footer.className = 'menu-portal-footer';
    footer.textContent = 'UNAUTHORIZED ACCESS IS PROHIBITED · HR-PORTAL v2.4.1';
    panel.appendChild(footer);

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
    this._closeStats();
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
      case 'Stats':
        this._showStats();
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
          <div class="bestiary-stats">
            <span style="color:#ff6666">Weak: ${stats.weakness || 'none'}</span>
            <span style="color:#6688ff">Resist: ${stats.resistance || 'none'}</span>
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

    const row = (keys, action) => {
      const badges = keys.map(k => `<span class="controls-key">${k}</span>`).join('<span class="controls-sep">/</span>');
      return `<div class="controls-row"><div class="controls-keys">${badges}</div><span class="controls-action">${action}</span></div>`;
    };

    this.controlsOverlay = document.createElement('div');
    this.controlsOverlay.className = 'menu-overlay';
    this.controlsOverlay.style.zIndex = '60';
    this.controlsOverlay.innerHTML = `
      <div class="menu-panel controls-panel">
        <div class="menu-title">CONTROLS</div>
        <div class="controls-body">
          <div class="controls-section-header">Exploration</div>
          ${row(['W A S D', '↑ ↓ ← →'], 'Move')}
          ${row(['E', 'Enter'], 'Interact')}
          ${row(['Esc'], 'Open Pause Menu')}

          <div class="controls-section-header">Combat</div>
          ${row(['↑ ↓'], 'Navigate actions')}
          ${row(['Enter'], 'Confirm selection')}
          ${row(['Esc'], 'Cancel / Back')}

          <div class="controls-section-header">Dialog &amp; Menus</div>
          ${row(['Space', 'E', 'Enter'], 'Advance dialog')}
          ${row(['↑ ↓'], 'Navigate')}
          ${row(['← →'], 'Change category / tab')}
          ${row(['Esc'], 'Close / Back')}
        </div>
        <div class="menu-item" id="menu-controls-back">
          <span class="menu-item-label">Back</span>
          <span class="menu-item-arrow">▶</span>
        </div>
      </div>
    `;
    document.getElementById('ui-overlay').appendChild(this.controlsOverlay);
    if (this.element) this.element.style.display = 'none';
    document.getElementById('menu-controls-back').addEventListener('click', () => {
      this._closeControls();
    });
  }

  _closeControls() {
    if (this.controlsOverlay && this.controlsOverlay.parentNode) {
      this.controlsOverlay.parentNode.removeChild(this.controlsOverlay);
    }
    this.controlsOverlay = null;
    if (this.element) this.element.style.display = '';
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
    this._abilityActions = [];

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
        this._abilityActions.push(canUnlock ? () => {
          this.player.unlockAbility(id);
          AudioManager.playSfx('confirm');
          this._rerenderAbilities();
        } : null);
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

        this._abilityActions.push(null);
        grid.appendChild(card);
      }
    }

    this._abilityCount = itemIndex;
    panel.appendChild(grid);

    // Sell last upgrade point — only when every ability is already learned
    const allUpgradeUnlocked = Object.entries(PLAYER_ABILITIES)
      .filter(([, a]) => a.upgradePointCost)
      .every(([id]) => this.player.unlockedAbilities.has(id));
    const allQuestUnlocked = Object.entries(PLAYER_ABILITIES)
      .filter(([, a]) => a.unlockQuest)
      .every(([, a]) => this.player.questStates[a.unlockQuest] === 'complete');
    if (allUpgradeUnlocked && allQuestUnlocked && this.player.upgradePoints === 1) {
      const sellBtn = document.createElement('div');
      sellBtn.className = 'menu-item';
      sellBtn.style.cssText = 'margin-top:12px;color:#ffd700;border:1px solid #ffd700;padding:6px 12px;border-radius:4px;cursor:pointer;text-align:center;';
      sellBtn.textContent = 'Liquidate Final Point  (+5,000,000 AUM)';
      sellBtn.addEventListener('click', () => {
        this.player.upgradePoints -= 1;
        this.player.stats.aum = (this.player.stats.aum || 0) + 5_000_000;
        AudioManager.playSfx('confirm');
        this._rerenderAbilities();
      });
      panel.appendChild(sellBtn);
    }

    const back = document.createElement('div');
    back.className = 'menu-item';
    back.style.marginTop = '16px';
    back.textContent = 'Back';
    back.addEventListener('click', () => this._closeAbilities());
    panel.appendChild(back);

    this.abilitiesOverlay.innerHTML = '';
    this.abilitiesOverlay.appendChild(panel);
    const sel = this.abilitiesOverlay.querySelector('.ability-card.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
    this._cosmeticSelectedIndex = 0;
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
    this._cosmeticActions = [];
    let cosIdx = 0;
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
        const idx = cosIdx++;

        const card = document.createElement('div');
        card.className = `cosmetic-card${unlocked ? (isEquipped ? ' equipped' : ' available') : ' locked'}${idx === this._cosmeticSelectedIndex ? ' selected' : ''}`;

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

          const action = () => {
            if (isEquipped) {
              this.player.unequipCosmetic(slot);
            } else {
              this.player.equipCosmetic(id);
            }
            AudioManager.playSfx('confirm');
            this._rerenderCosmetics();
          };
          card.addEventListener('click', () => { this._cosmeticSelectedIndex = idx; action(); });
          this._cosmeticActions.push(action);
        } else {
          const desc = document.createElement('div');
          desc.className = 'ability-desc';
          desc.textContent = 'Not yet discovered';
          card.appendChild(desc);
          this._cosmeticActions.push(null);
        }

        row.appendChild(card);
      }
      panel.appendChild(row);
    }
    this._cosmeticCount = cosIdx;

    const back = document.createElement('div');
    back.className = 'menu-item';
    back.style.marginTop = '16px';
    back.textContent = 'Back';
    back.addEventListener('click', () => this._closeCosmetics());
    panel.appendChild(back);

    this.cosmeticsOverlay.innerHTML = '';
    this.cosmeticsOverlay.appendChild(panel);
    const sel = this.cosmeticsOverlay.querySelector('.cosmetic-card.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
      if (InputManager.isCancelPressed()) { this._closeAbilities(); return; }
      const up   = InputManager.isJustPressed('arrowup')   || InputManager.isJustPressed('w');
      const down = InputManager.isJustPressed('arrowdown') || InputManager.isJustPressed('s');
      if (up && this._abilitySelectedIndex > 0) {
        this._abilitySelectedIndex--;
        AudioManager.playSfx('cursor');
        this._rerenderAbilities();
      }
      if (down && this._abilitySelectedIndex < (this._abilityCount ?? 1) - 1) {
        this._abilitySelectedIndex++;
        AudioManager.playSfx('cursor');
        this._rerenderAbilities();
      }
      if (InputManager.isConfirmPressed()) {
        this._abilityActions?.[this._abilitySelectedIndex]?.();
      }
      return;
    }

    if (this.cosmeticsOverlay) {
      if (InputManager.isCancelPressed()) { this._closeCosmetics(); return; }
      const up   = InputManager.isJustPressed('arrowup')   || InputManager.isJustPressed('w');
      const down = InputManager.isJustPressed('arrowdown') || InputManager.isJustPressed('s');
      if (up && this._cosmeticSelectedIndex > 0) {
        this._cosmeticSelectedIndex--;
        AudioManager.playSfx('cursor');
        this._rerenderCosmetics();
      }
      if (down && this._cosmeticSelectedIndex < (this._cosmeticCount ?? 1) - 1) {
        this._cosmeticSelectedIndex++;
        AudioManager.playSfx('cursor');
        this._rerenderCosmetics();
      }
      if (InputManager.isConfirmPressed()) {
        this._cosmeticActions?.[this._cosmeticSelectedIndex]?.();
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

    if (this.statsOverlay) {
      if (InputManager.isCancelPressed() || InputManager.isConfirmPressed()) {
        this._closeStats();
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

    const CATEGORY_ORDER = ['Story', 'Act Completions', 'Combat Mastery', 'Leveling', 'Roguelite'];
    const grouped = {};
    for (const cat of CATEGORY_ORDER) grouped[cat] = [];
    for (const a of achievements) {
      const cat = a.category || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(a);
    }

    const rows = CATEGORY_ORDER.map(cat => {
      const items = grouped[cat];
      if (!items || items.length === 0) return '';
      const unlockedInCat = items.filter(a => a.unlocked).length;
      const header = `<div style="margin:14px 0 6px;padding:4px 8px;background:rgba(233,69,96,0.15);border-left:3px solid #e94560;font-family:'Press Start 2P',cursive;font-size:9px;color:#e94560;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center">
        <span>${cat.toUpperCase()}</span>
        <span style="color:#666;font-size:8px">${unlockedInCat}/${items.length}</span>
      </div>`;
      const entries = items.map(a => {
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
      return header + entries;
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

  _showStats() {
    const s = this.player.getCombatStats();
    const level = s.level || 1;
    const xp = s.xp || 0;
    const isMaxLevel = level >= XP_TABLE.length;
    const prevXP = level > 1 ? XP_TABLE[level - 1] : 0;
    const nextXP = isMaxLevel ? xp : XP_TABLE[level];
    const xpPct = isMaxLevel ? 100 : Math.min(100, Math.max(0, ((xp - prevXP) / (nextXP - prevXP)) * 100));
    const xpLabel = isMaxLevel ? 'MAX' : `${xp - prevXP} / ${nextXP - prevXP}`;

    const statRows = [
      { label: 'Patience',              themeLabel: 'HP',      value: `${s.hp} / ${s.maxHP}`,   color: '#e94560', pct: (s.hp / s.maxHP) * 100 },
      { label: 'Coffee',                themeLabel: 'MP',      value: `${s.mp} / ${s.maxMP}`,   color: '#53a8b6', pct: (s.mp / s.maxMP) * 100 },
      { label: 'Assertiveness',         themeLabel: 'ATK',     value: s.atk,                    color: '#ff8844', pct: Math.min(100, (s.atk / 50) * 100) },
      { label: 'Composure',             themeLabel: 'DEF',     value: s.def,                    color: '#44aaff', pct: Math.min(100, (s.def / 50) * 100) },
      { label: 'Bureaucratic Efficiency', themeLabel: 'SPD',   value: s.spd,                    color: '#88ff88', pct: Math.min(100, (s.spd / 50) * 100) },
    ];

    const rowsHtml = statRows.map(r => `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="color:#aaa;font-size:17px">${r.label} <span style="color:#555;font-size:14px">(${r.themeLabel})</span></span>
          <span style="color:#fff;font-size:17px">${r.value}</span>
        </div>
        <div style="height:10px;background:#1a1a2a;border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${r.pct}%;background:${r.color};border-radius:3px;transition:width 0.3s"></div>
        </div>
      </div>`).join('');

    this.statsOverlay = document.createElement('div');
    this.statsOverlay.style.cssText = `
      position: absolute; inset: 0; background: rgba(0,0,0,0.88);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 200; font-family: 'VT323', monospace; color: #fff;
    `;
    this.statsOverlay.innerHTML = `
      <div style="font-family:'Press Start 2P',cursive;font-size:14px;color:#e94560;margin-bottom:16px">CHARACTER STATS</div>
      <div style="min-width:380px;max-width:480px;background:#0d1117;border:2px solid #0f3460;border-radius:8px;padding:20px 24px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #1a2a3a">
          <span style="font-family:'Press Start 2P',cursive;font-size:13px;color:#fff">Andrew</span>
          <span style="color:#88aaff;font-size:20px">Level ${level}</span>
        </div>
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="color:#88aaff;font-size:17px">Experience</span>
            <span style="color:#88aaff;font-size:17px">${xpLabel}</span>
          </div>
          <div style="height:10px;background:#1a1a2a;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${xpPct}%;background:linear-gradient(90deg,#3355cc,#88aaff);border-radius:3px"></div>
          </div>
        </div>
        ${rowsHtml}
        <div style="border-top:1px solid #1a2a3a;margin-top:14px;padding-top:12px;display:flex;justify-content:space-between">
          <span style="color:#ffd700;font-size:18px">AUM</span>
          <span style="color:#ffd700;font-size:18px">$${(s.aum || 0).toLocaleString()}</span>
        </div>
        ${this.player.upgradePoints > 0 ? `<div style="margin-top:8px;display:flex;justify-content:space-between">
          <span style="color:#ff8844;font-size:18px">Upgrade Points</span>
          <span style="color:#ff8844;font-size:18px">${this.player.upgradePoints}</span>
        </div>` : ''}
        <div style="margin-top:8px;display:flex;justify-content:space-between">
          <span style="color:#888;font-size:18px">Times Defeated</span>
          <span style="color:#888;font-size:18px">${this.player.deaths || 0}</span>
        </div>
      </div>
      <div style="margin-top:16px;color:#888;font-size:15px">Enter / Esc to close</div>
    `;

    this.statsOverlay.addEventListener('click', () => this._closeStats());
    document.getElementById('ui-overlay').appendChild(this.statsOverlay);
    if (this.element) this.element.style.display = 'none';
  }

  _closeStats() {
    if (this.statsOverlay && this.statsOverlay.parentNode) {
      this.statsOverlay.parentNode.removeChild(this.statsOverlay);
    }
    this.statsOverlay = null;
    if (this.element) this.element.style.display = '';
  }
}
