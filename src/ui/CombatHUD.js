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
    `;
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

  showMainMenu() {
    this.currentMenu = 'main';
    this.selectedIndex = 0;
    this.menuItems = [
      { label: 'Attack', action: 'attack' },
      { label: 'Special', action: 'special' },
      { label: 'Item', action: 'item' },
    ];

    if (this.canFlee) {
      this.menuItems.push({ label: 'Flee', action: 'flee' });
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
      btn.className = `combat-action-btn${i === this.selectedIndex ? ' selected' : ''}`;
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        this.selectedIndex = i;
        this._selectCurrent();
      });
      this.menuEl.appendChild(btn);
    });
  }

  _renderSubmenu() {
    this.menuEl.className = 'combat-submenu';
    this.menuEl.innerHTML = '';
    this.menuItems.forEach((item, i) => {
      const el = document.createElement('div');
      el.className = `combat-submenu-item${i === this.selectedIndex ? ' selected' : ''}${item.disabled ? ' disabled' : ''}`;
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item.label;
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

  _updateStats(stats) {
    if (!this.statsEl) return;
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
    `;
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
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    if (this.enemyInfo && this.enemyInfo.parentNode) this.enemyInfo.parentNode.removeChild(this.enemyInfo);
    this.root = null;
    this.enemyInfo = null;
  }
}
