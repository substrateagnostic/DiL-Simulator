// Combat HUD - player stats, action menu, enemy info
export class CombatHUD {
  constructor() {
    this.container = document.getElementById('ui-overlay');
    this.root = null;
    this.enemyInfo = null;
    this.statsEl = null;
    this.menuEl = null;
    this.onActionSelect = null;
    this.onAbilitySelect = null;
    this.onItemSelect = null;
    this.selectedIndex = 0;
    this.currentMenu = 'main';
    this.menuItems = [];
    this.canFlee = true;
    this.telegraphEl = null;
  }

  show(playerStats, enemyName, enemyHP, enemyMaxHP, options = {}) {
    this.remove();
    this.canFlee = options.canFlee !== false;

    this.root = document.createElement('div');
    this.root.className = 'combat-hud';

    this.enemyInfo = document.createElement('div');
    this.enemyInfo.className = 'combat-enemy-info';
    this.enemyInfo.innerHTML = `
      <div class="combat-enemy-name">${enemyName}</div>
      <div class="combat-enemy-hp-bar">
        <div class="combat-enemy-hp-fill" style="width: ${(enemyHP / enemyMaxHP) * 100}%"></div>
      </div>
      <div class="combat-telegraph" style="display:none;"></div>
    `;
    this.telegraphEl = this.enemyInfo.querySelector('.combat-telegraph');
    this.container.appendChild(this.enemyInfo);

    const panel = document.createElement('div');
    panel.className = 'combat-player-panel';

    this.statsEl = document.createElement('div');
    this.statsEl.className = 'combat-stats';
    this._updateStats(playerStats);
    panel.appendChild(this.statsEl);

    this.menuEl = document.createElement('div');
    this.menuEl.className = 'combat-actions';
    panel.appendChild(this.menuEl);

    this.root.appendChild(panel);
    this.container.appendChild(this.root);

    this.showMainMenu();
  }

  showMainMenu(silenced = false, momentum = 0, bracing = false, retaliateReady = false, lowHP = false) {
    this.currentMenu = 'main';
    this.selectedIndex = 0;
    this.menuItems = [
      { label: 'Attack', action: 'attack' },
      { label: silenced ? 'Special (Silenced)' : 'Special', action: 'special', disabled: silenced },
      { label: bracing ? 'Bracing...' : 'Brace', action: 'brace', braceActive: bracing },
      { label: 'Item', action: 'item' },
    ];

    if (retaliateReady) {
      this.menuItems.push({ label: '↩ Retaliate (Free)', action: 'retaliate', retaliateBtn: true });
    }

    if (this.canFlee) {
      this.menuItems.push({ label: 'Flee', action: 'flee' });
    }

    if (lowHP) {
      this.menuItems.push({ label: '🎲 Desperate Gamble', action: 'desperate_gamble', desperateBtn: true });
    }

    if (momentum >= 25 && momentum < 50) {
      this.menuItems.push({ label: `▶ Press Advantage (25%)`, action: 'press_advantage', momentumSpend: true });
    } else if (momentum >= 50 && momentum < 100) {
      this.menuItems.push({ label: `▶ Press Advantage (25%)`, action: 'press_advantage', momentumSpend: true });
      this.menuItems.push({ label: `★ Second Wind (50%)`, action: 'second_wind', momentumSpend: true });
    }

    if (momentum >= 100) {
      this.menuItems.push({ label: '⚡ ASSERT DOMINANCE', action: 'power_move', powerMove: true });
    }

    this._renderMenu();
  }

  showAbilities(abilities, playerMP) {
    this.currentMenu = 'abilities';
    this.selectedIndex = 0;
    this.menuItems = abilities.map((ability) => ({
      label: ability.name,
      cost: ability.cost,
      id: ability.id,
      description: ability.description,
      tag: ability.tag || null,
      disabled: playerMP < ability.cost,
    }));
    this.menuItems.push({ label: 'Back', action: 'back' });
    this._renderSubmenu();
  }

  showItems(inventory, items) {
    this.currentMenu = 'items';
    this.selectedIndex = 0;
    this.menuItems = inventory.map((entry) => ({
      label: `${items[entry.id]?.name || entry.id} x${entry.quantity}`,
      id: entry.id,
    }));
    this.menuItems.push({ label: 'Back', action: 'back' });
    this._renderSubmenu();
  }

  _renderMenu() {
    this.menuEl.className = 'combat-actions';
    this.menuEl.innerHTML = '';
    this.menuItems.forEach((item, i) => {
      const btn = document.createElement('div');
      let className = `combat-action-btn${i === this.selectedIndex ? ' selected' : ''}${item.disabled ? ' disabled' : ''}`;
      if (item.powerMove) className += ' power-move';
      if (item.braceActive) className += ' brace-active';
      if (item.retaliateBtn) className += ' retaliate-btn';
      if (item.momentumSpend) className += ' momentum-spend';
      if (item.desperateBtn) className += ' desperate-btn';
      btn.className = className;
      btn.textContent = item.label;
      if (item.disabled) {
        btn.style.opacity = '0.4';
        btn.style.pointerEvents = 'none';
      }
      btn.addEventListener('click', () => {
        if (!item.disabled) {
          this.selectedIndex = i;
          this._selectCurrent();
        }
      });
      this.menuEl.appendChild(btn);
    });
  }

  _renderSubmenu() {
    this.menuEl.className = 'combat-submenu';
    this.menuEl.innerHTML = '';
    // Tooltip element for ability descriptions
    if (this._tooltip) { this._tooltip.remove(); this._tooltip = null; }

    this.menuItems.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = `combat-submenu-item${i === this.selectedIndex ? ' selected' : ''}${item.disabled ? ' disabled' : ''}`;
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.label;
      if (item.tag) {
        const tagColors = { legal: '#ff9966', social: '#66bbff', audit: '#66ff99', technical: '#cc88ff' };
        const tagSpan = document.createElement('span');
        tagSpan.style.color = tagColors[item.tag] || '#aaa';
        tagSpan.style.fontSize = '13px';
        tagSpan.style.marginLeft = '6px';
        tagSpan.textContent = `[${item.tag}]`;
        nameSpan.appendChild(tagSpan);
      }
      el.appendChild(nameSpan);
      if (item.cost !== undefined) {
        const costSpan = document.createElement('span');
        costSpan.style.color = '#53a8b6';
        costSpan.style.fontSize = '16px';
        costSpan.textContent = `${item.cost} Coffee`;
        el.appendChild(costSpan);
      }
      el.addEventListener('click', () => {
        if (!item.disabled) {
          this.selectedIndex = i;
          this._selectCurrent();
        }
      });
      this.menuEl.appendChild(el);
    });

    // Show tooltip for selected ability
    const selected = this.menuItems[this.selectedIndex];
    if (selected && selected.description) {
      this._tooltip = document.createElement('div');
      this._tooltip.className = 'combat-ability-tooltip';
      this._tooltip.textContent = selected.tag
        ? `${selected.description} (${selected.tag})`
        : selected.description;
      this.menuEl.appendChild(this._tooltip);
    }
  }

  navigate(direction) {
    const prev = this.selectedIndex;
    if (this.currentMenu === 'main') {
      if (direction === 'up' && this.selectedIndex >= 2) this.selectedIndex -= 2;
      if (direction === 'down' && this.selectedIndex < this.menuItems.length - 2) this.selectedIndex += 2;
      if (direction === 'left' && this.selectedIndex % 2 === 1) this.selectedIndex--;
      if (direction === 'right' && this.selectedIndex % 2 === 0 && this.selectedIndex + 1 < this.menuItems.length) this.selectedIndex++;
    } else {
      if (direction === 'up') this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      if (direction === 'down') this.selectedIndex = Math.min(this.menuItems.length - 1, this.selectedIndex + 1);
    }

    if (prev !== this.selectedIndex) {
      if (this.currentMenu === 'main') this._renderMenu();
      else this._renderSubmenu();
    }
  }

  selectCurrent() {
    this._selectCurrent();
  }

  _selectCurrent() {
    const item = this.menuItems[this.selectedIndex];
    if (!item || item.disabled) return;

    if (this.currentMenu === 'main') {
      if (this.onActionSelect) this.onActionSelect(item.action);
    } else if (this.currentMenu === 'abilities') {
      if (item.action === 'back') {
        this.showMainMenu();
      } else if (this.onAbilitySelect) {
        this.onAbilitySelect(item.id);
      }
    } else if (this.currentMenu === 'items') {
      if (item.action === 'back') {
        this.showMainMenu();
      } else if (this.onItemSelect) {
        this.onItemSelect(item.id);
      }
    }
  }

  updatePlayerStats(stats) {
    this._updateStats(stats);
  }

  updateEnemyHP(hp, maxHP) {
    if (this.enemyInfo) {
      const fill = this.enemyInfo.querySelector('.combat-enemy-hp-fill');
      if (fill) fill.style.width = `${Math.max(0, (hp / maxHP) * 100)}%`;
    }
  }

  updateTelegraph(hint) {
    if (!this.telegraphEl) return;
    if (hint) {
      this.telegraphEl.textContent = `⚠ ${hint}`;
      this.telegraphEl.style.display = '';
    } else {
      this.telegraphEl.style.display = 'none';
    }
  }

  _updateStats(stats) {
    if (!this.statsEl) return;
    const momentum = Math.round(stats.momentum || 0);
    const momentumReady = momentum >= 100;
    this.statsEl.innerHTML = `
      <div class="combat-stats-name">${stats.name || 'Andrew'}</div>
      <div class="combat-stat-row">
        <span class="combat-stat-label">HP</span>
        <div class="combat-stat-bar">
          <div class="combat-stat-bar-fill hp" style="width: ${(stats.hp / stats.maxHP) * 100}%"></div>
        </div>
        <span class="combat-stat-value">${stats.hp}/${stats.maxHP}</span>
      </div>
      <div class="combat-stat-row">
        <span class="combat-stat-label">Coffee</span>
        <div class="combat-stat-bar">
          <div class="combat-stat-bar-fill mp" style="width: ${(stats.mp / stats.maxMP) * 100}%"></div>
        </div>
        <span class="combat-stat-value">${stats.mp}/${stats.maxMP}</span>
      </div>
      <div class="combat-stat-row">
        <span class="combat-stat-label" style="color: ${momentumReady ? '#ffd700' : '#aaa'}">Confidence</span>
        <div class="combat-stat-bar">
          <div class="combat-stat-bar-fill momentum" style="width: ${momentum}%"></div>
        </div>
        <span class="combat-stat-value" style="color: ${momentumReady ? '#ffd700' : '#fff'}">${momentum}%${momentumReady ? ' ⚡' : ''}</span>
      </div>
    `;
  }

  showTaunt(text, side = 'player') {
    const el = document.createElement('div');
    el.className = `combat-taunt combat-taunt-${side}`;
    el.textContent = text;
    this.container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }, 2500);
  }

  showMessage(text) {
    const msg = document.createElement('div');
    msg.className = 'combat-message';
    msg.textContent = text;
    this.container.appendChild(msg);
    setTimeout(() => {
      if (msg.parentNode) msg.parentNode.removeChild(msg);
    }, 2000);
    return msg;
  }

  disableInput() {
    this.menuEl.style.pointerEvents = 'none';
    this.menuEl.style.opacity = '0.5';
  }

  enableInput() {
    this.menuEl.style.pointerEvents = 'auto';
    this.menuEl.style.opacity = '1';
  }

  remove() {
    if (this._tooltip) { this._tooltip.remove(); this._tooltip = null; }
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    if (this.enemyInfo && this.enemyInfo.parentNode) this.enemyInfo.parentNode.removeChild(this.enemyInfo);
    this.root = null;
    this.enemyInfo = null;
    this.telegraphEl = null;
  }
}
