// Combat HUD — supports 1+ enemies and 1+ party members.
// Top-center: row of enemy bars with name/HP/telegraph; selected target gets a highlight.
// Bottom-left: stats wrapper. Active actor's full bars on top; remaining party shows compact bars below.
// New: showTargetPicker(enemies, onPick) — arrow-key cycle through alive enemies, Enter to pick.

export class CombatHUD {
  constructor() {
    this.container = document.getElementById('ui-overlay');
    this.root = null;
    this.enemyRowEl = null;       // row container holding all enemy info blocks
    this.enemyEntries = [];       // [{ index, infoEl, hpFill, telegraphEl }]
    this.statsEl = null;          // active actor stat block
    this.partyRowEl = null;       // compact party bar row
    this.menuEl = null;
    this.onActionSelect = null;
    this.onAbilitySelect = null;
    this.onItemSelect = null;
    this.selectedIndex = 0;
    this.currentMenu = 'main';
    this.menuItems = [];
    this.canFlee = true;
    this._activeAllyIndex = 0;
    this._highlightedEnemyIndex = -1;
    this._targetPickerCleanup = null;
  }

  // enemies: [{ name, hp, maxHP }, ...]; party: [{ name, hp, maxHP, mp, maxMP, momentum, isPlayer }, ...]
  show(enemies, party, options = {}) {
    this.remove();
    this.canFlee = options.canFlee !== false;

    this.root = document.createElement('div');
    this.root.className = 'combat-hud';

    // Top: enemy row
    this.enemyRowEl = document.createElement('div');
    this.enemyRowEl.className = 'combat-enemy-row';
    if (enemies.length === 1) this.enemyRowEl.classList.add('single');
    if (enemies.length >= 3) this.enemyRowEl.classList.add('crowded');
    this.container.appendChild(this.enemyRowEl);
    this._renderEnemyRow(enemies);

    // Bottom: player panel
    const panel = document.createElement('div');
    panel.className = 'combat-player-panel';

    const statsWrapper = document.createElement('div');
    statsWrapper.className = 'combat-stats-wrapper';

    this.statsEl = document.createElement('div');
    this.statsEl.className = 'combat-stats';
    statsWrapper.appendChild(this.statsEl);

    this.buffStatusEl = document.createElement('div');
    this.buffStatusEl.className = 'combat-buff-status';
    statsWrapper.appendChild(this.buffStatusEl);

    this.partyRowEl = document.createElement('div');
    this.partyRowEl.className = 'combat-party-row';
    statsWrapper.appendChild(this.partyRowEl);

    panel.appendChild(statsWrapper);

    this.menuEl = document.createElement('div');
    this.menuEl.className = 'combat-actions';
    panel.appendChild(this.menuEl);

    this.root.appendChild(panel);
    this.container.appendChild(this.root);

    // Initial render of stats/party using the active ally
    this._activeAllyIndex = 0;
    this._renderStats(party[0] || {});
    this._renderPartyRow(party);
    this.showMainMenu();
  }

  _renderEnemyRow(enemies) {
    if (!this.enemyRowEl) return;
    this.enemyRowEl.innerHTML = '';
    this.enemyEntries = [];
    enemies.forEach((e, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'combat-enemy-info';
      if (e.hp <= 0) wrap.classList.add('dead');
      wrap.innerHTML = `
        <div class="combat-enemy-name">${e.name}</div>
        <div class="combat-enemy-hp-bar">
          <div class="combat-enemy-hp-fill" style="width: ${e.maxHP > 0 ? (e.hp / e.maxHP) * 100 : 0}%"></div>
        </div>
        <div class="combat-telegraph" style="display:none;"></div>
      `;
      const hpFill = wrap.querySelector('.combat-enemy-hp-fill');
      const telegraphEl = wrap.querySelector('.combat-telegraph');
      this.enemyRowEl.appendChild(wrap);
      this.enemyEntries.push({ index: i, infoEl: wrap, hpFill, telegraphEl });
    });
  }

  setEnemies(enemies) {
    this._renderEnemyRow(enemies);
    if (this._highlightedEnemyIndex >= 0) {
      this.highlightEnemy(this._highlightedEnemyIndex);
    }
  }

  updateEnemyHP(idx, hp, maxHP) {
    // Backward compat: if called with (hp, maxHP) treat as enemy 0
    if (typeof maxHP === 'undefined') {
      maxHP = hp;
      hp = idx;
      idx = 0;
    }
    const entry = this.enemyEntries[idx];
    if (!entry) return;
    entry.hpFill.style.width = `${Math.max(0, (hp / maxHP) * 100)}%`;
    if (hp <= 0) entry.infoEl.classList.add('dead');
  }

  updateAllEnemies(enemies) {
    enemies.forEach((e, i) => this.updateEnemyHP(i, e.hp, e.maxHP));
  }

  highlightEnemy(idx) {
    this._highlightedEnemyIndex = idx;
    this.enemyEntries.forEach((e, i) => {
      e.infoEl.classList.toggle('targeted', i === idx);
    });
  }

  clearEnemyHighlight() {
    this._highlightedEnemyIndex = -1;
    this.enemyEntries.forEach(e => e.infoEl.classList.remove('targeted'));
  }

  // hints: array of strings parallel to enemies (one telegraph per enemy)
  updateTelegraphAll(hints) {
    this.enemyEntries.forEach((entry, i) => {
      const hint = hints[i];
      if (hint) {
        entry.telegraphEl.textContent = `⚠ ${hint}`;
        entry.telegraphEl.style.display = '';
      } else {
        entry.telegraphEl.style.display = 'none';
      }
    });
  }

  // Backward-compat: single-enemy telegraph hint (uses enemy 0)
  updateTelegraph(hint) {
    if (this.enemyEntries.length === 0) return;
    if (this.enemyEntries.length === 1) {
      const entry = this.enemyEntries[0];
      if (hint) {
        entry.telegraphEl.textContent = `⚠ ${hint}`;
        entry.telegraphEl.style.display = '';
      } else {
        entry.telegraphEl.style.display = 'none';
      }
    }
  }

  _renderPartyRow(party) {
    if (!this.partyRowEl) return;
    this.partyRowEl.innerHTML = '';
    party.forEach((p, i) => {
      if (i === this._activeAllyIndex) return; // Active actor's full bars are already shown above
      const item = document.createElement('div');
      item.className = 'combat-party-bar';
      if (p.hp <= 0) item.classList.add('dead');
      item.innerHTML = `
        <span class="combat-party-name">${p.name}</span>
        <div class="combat-party-hp-bar"><div class="combat-party-hp-fill" style="width:${p.maxHP > 0 ? (p.hp / p.maxHP) * 100 : 0}%"></div></div>
        <span class="combat-party-hp-num">${p.hp}/${p.maxHP}</span>
      `;
      this.partyRowEl.appendChild(item);
    });
  }

  setActiveAlly(index, party) {
    this._activeAllyIndex = index;
    if (party) {
      this._renderStats(party[index] || {});
      this._renderPartyRow(party);
    }
  }

  // Public refresh — updates the compact party-row bars without re-rendering the active actor stats.
  refreshPartyRow(party) {
    this._renderPartyRow(party);
  }

  // ── Main / sub menus ─────────────────────────────────────────────────
  showMainMenu(silenced = false, momentum = 0, bracing = false, retaliateReady = false, lowHP = false, pressAdvantageCost = 25, voicesAvailable = []) {
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
    if (this.canFlee) this.menuItems.push({ label: 'Flee', action: 'flee' });
    if (lowHP) this.menuItems.push({ label: '🎲 Desperate Gamble', action: 'desperate_gamble', desperateBtn: true });

    // Reasonable Doubt — Thoughts button only appears when voices are available
    if (Array.isArray(voicesAvailable) && voicesAvailable.length > 0) {
      const label = voicesAvailable.length === 1
        ? `💭 ${voicesAvailable[0].name} speaks...`
        : `💭 Thoughts (${voicesAvailable.length})`;
      this.menuItems.push({ label, action: 'thoughts', voiceBtn: true });
    }

    if (momentum >= pressAdvantageCost && momentum < 50) {
      this.menuItems.push({ label: `▶ Press Advantage (${pressAdvantageCost}%)`, action: 'press_advantage', momentumSpend: true });
    } else if (momentum >= 50 && momentum < 100) {
      this.menuItems.push({ label: `▶ Press Advantage (${pressAdvantageCost}%)`, action: 'press_advantage', momentumSpend: true });
      this.menuItems.push({ label: `★ Second Wind (+75 HP)`, action: 'second_wind', momentumSpend: true });
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
      type: ability.type,
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

  // Manual-control ally main menu — Attack / Abilities / Skip + Auto-toggle.
  showAllyMenu(ally, allyControlMode = 'manual') {
    this.currentMenu = 'allyMain';
    this.selectedIndex = 0;
    this.menuItems = [
      { label: `${ally.name}: Attack`, action: 'attack' },
      { label: `Abilities (${ally.mp}/${ally.maxMP} Coffee)`, action: 'abilities' },
      { label: 'Skip', action: 'skip' },
      { label: allyControlMode === 'auto' ? '⟳ Switch to MANUAL' : '⟳ Switch to AUTO', action: 'toggle_auto', momentumSpend: true },
    ];
    this._renderMenu();
  }

  showAllyAbilities(abilities, mp) {
    this.currentMenu = 'allyAbilities';
    this.selectedIndex = 0;
    this.menuItems = abilities.map((a) => ({
      label: a.name,
      cost: a.cost,
      id: a.id,
      description: a.description,
      tag: a.tag || null,
      type: a.type,
      disabled: mp < (a.cost || 0),
    }));
    this.menuItems.push({ label: 'Back', action: 'back' });
    this._renderSubmenu();
  }

  // Voice submenu — list available voices and their action.
  // voices: [{ id, name, color, actionId, action: { name, description, quote } }]
  showVoices(voices) {
    this.currentMenu = 'voices';
    this.selectedIndex = 0;
    this.menuItems = voices.map(v => ({
      label: v.action.name,
      id: v.actionId,
      voiceId: v.id,
      voiceName: v.name,
      voiceColor: v.color,
      description: v.action.description,
      quote: v.action.quote,
    }));
    this.menuItems.push({ label: 'Back', action: 'back' });
    this._renderVoicesSubmenu();
  }

  _renderVoicesSubmenu() {
    this.menuEl.className = 'combat-submenu combat-voices-submenu';
    this.menuEl.innerHTML = '';
    if (this._tooltip) { this._tooltip.remove(); this._tooltip = null; }

    this.menuItems.forEach((item, i) => {
      if (item.action === 'back') {
        const back = document.createElement('div');
        back.className = `combat-submenu-item${i === this.selectedIndex ? ' selected' : ''}`;
        back.textContent = item.label;
        back.addEventListener('click', () => { this.selectedIndex = i; this._selectCurrent(); });
        this.menuEl.appendChild(back);
        return;
      }
      const card = document.createElement('div');
      card.className = `voice-card${i === this.selectedIndex ? ' selected' : ''}`;
      card.style.borderLeft = `3px solid ${item.voiceColor}`;
      const speakerLine = document.createElement('div');
      speakerLine.className = 'voice-speaker';
      speakerLine.style.color = item.voiceColor;
      speakerLine.textContent = `[${item.voiceName}]`;
      card.appendChild(speakerLine);

      const quote = document.createElement('div');
      quote.className = 'voice-quote';
      quote.textContent = `"${item.quote}"`;
      card.appendChild(quote);

      const actionLine = document.createElement('div');
      actionLine.className = 'voice-action-name';
      actionLine.textContent = `→ ${item.label}`;
      card.appendChild(actionLine);

      const desc = document.createElement('div');
      desc.className = 'voice-desc';
      desc.textContent = item.description;
      card.appendChild(desc);

      card.addEventListener('click', () => { this.selectedIndex = i; this._selectCurrent(); });
      this.menuEl.appendChild(card);
    });
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
      if (item.voiceBtn) className += ' voice-btn';
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
      if (item.type === 'attack_aoe') {
        const aoe = document.createElement('span');
        aoe.style.color = '#ffaa44';
        aoe.style.fontSize = '13px';
        aoe.style.marginLeft = '6px';
        aoe.textContent = '[ALL]';
        nameSpan.appendChild(aoe);
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

  selectCurrent() { this._selectCurrent(); }

  _selectCurrent() {
    const item = this.menuItems[this.selectedIndex];
    if (!item || item.disabled) return;

    if (this.currentMenu === 'main') {
      if (this.onActionSelect) this.onActionSelect(item.action);
    } else if (this.currentMenu === 'abilities') {
      if (item.action === 'back') {
        this.showMainMenu();
      } else if (this.onAbilitySelect) {
        this.onAbilitySelect(item.id, item);
      }
    } else if (this.currentMenu === 'items') {
      if (item.action === 'back') {
        this.showMainMenu();
      } else if (this.onItemSelect) {
        this.onItemSelect(item.id);
      }
    } else if (this.currentMenu === 'voices') {
      if (item.action === 'back') {
        this.showMainMenu();
      } else if (this.onVoiceSelect) {
        this.onVoiceSelect(item.id, item);
      }
    } else if (this.currentMenu === 'allyMain') {
      if (this.onAllyActionSelect) this.onAllyActionSelect(item.action);
    } else if (this.currentMenu === 'allyAbilities') {
      if (item.action === 'back') {
        // Caller will re-show the ally main menu
        if (this.onAllyActionSelect) this.onAllyActionSelect('back');
      } else if (this.onAllyAbilitySelect) {
        this.onAllyAbilitySelect(item.id, item);
      }
    }
  }

  // ── Stats / buffs ────────────────────────────────────────────────────
  // Backward-compat: callers pass a player-stats object. We re-route to the
  // active actor stats panel.
  updatePlayerStats(stats) { this._renderStats(stats); }
  updateActorStats(stats) { this._renderStats(stats); }

  _renderStats(stats) {
    if (!this.statsEl) return;
    const momentum = Math.round(stats.momentum || 0);
    const momentumReady = momentum >= 100;
    const showMomentum = stats.isPlayer !== false; // hide for non-Andrew allies
    const mpRow = (stats.maxMP && stats.maxMP > 0)
      ? `<div class="combat-stat-row">
          <span class="combat-stat-label">Coffee</span>
          <div class="combat-stat-bar">
            <div class="combat-stat-bar-fill mp" style="width: ${(stats.mp / stats.maxMP) * 100}%"></div>
          </div>
          <span class="combat-stat-value">${stats.mp}/${stats.maxMP}</span>
        </div>` : '';
    const momentumRow = showMomentum
      ? `<div class="combat-stat-row">
          <span class="combat-stat-label" style="color: ${momentumReady ? '#ffd700' : '#aaa'}">Confidence</span>
          <div class="combat-stat-bar">
            <div class="combat-stat-bar-fill momentum" style="width: ${momentum}%"></div>
          </div>
          <span class="combat-stat-value" style="color: ${momentumReady ? '#ffd700' : '#fff'}">${momentum}%${momentumReady ? ' ⚡' : ''}</span>
        </div>` : '';
    this.statsEl.innerHTML = `
      <div class="combat-stats-name">${stats.name || 'Andrew'}</div>
      <div class="combat-stat-row">
        <span class="combat-stat-label">HP</span>
        <div class="combat-stat-bar">
          <div class="combat-stat-bar-fill hp" style="width: ${(stats.hp / stats.maxHP) * 100}%"></div>
        </div>
        <span class="combat-stat-value">${stats.hp}/${stats.maxHP}</span>
      </div>
      ${mpRow}
      ${momentumRow}
    `;
  }

  updateBuffStatus(playerBuffs = [], enemyBuffs = []) {
    if (!this.buffStatusEl) return;
    const statLabel = s => ({ atk: 'ATK', def: 'DEF', spd: 'SPD', mp: 'Coffee' }[s] || s.toUpperCase());
    const pills = [];
    for (const b of playerBuffs) {
      const parts = Object.entries(b.stats).map(([s, v]) => `${v > 0 ? '+' : ''}${v} ${statLabel(s)}`).join(' ');
      pills.push(`<span class="combat-buff-pill buff-positive">${b.name}${parts ? ` (${parts})` : ''} · ${b.duration + 1}T</span>`);
    }
    for (const b of enemyBuffs) {
      const isDebuff = Object.values(b.stats).some(v => v < 0);
      const parts = Object.entries(b.stats).map(([s, v]) => `${v > 0 ? '+' : ''}${v} ${statLabel(s)}`).join(' ');
      pills.push(`<span class="combat-buff-pill ${isDebuff ? 'buff-debuff' : 'buff-enemy'}">${b.name}${parts ? ` (${parts})` : ''} · ${b.duration + 1}T</span>`);
    }
    this.buffStatusEl.innerHTML = pills.join('');
  }

  // ── Target picker overlay ────────────────────────────────────────────
  // enemies: [{ name, hp, maxHP, idx }]; onPick(idx) called when user confirms.
  // onCancel() called on Escape (returns to main menu).
  showTargetPicker(enemies, onPick, onCancel) {
    this._closeTargetPicker();
    const aliveEnemies = enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) {
      onPick(0);
      return;
    }
    if (aliveEnemies.length === 1) {
      // Single target — auto-pick
      onPick(aliveEnemies[0].idx);
      return;
    }

    let cursor = 0;
    this.highlightEnemy(aliveEnemies[cursor].idx);
    const overlay = document.createElement('div');
    overlay.className = 'target-picker-overlay';
    overlay.innerHTML = `<div class="target-picker-hint">← → / A D to choose target · ENTER to confirm · ESC to cancel</div>`;
    this.container.appendChild(overlay);

    const finish = (idx) => {
      this._closeTargetPicker();
      onPick(idx);
    };
    const cancel = () => {
      this._closeTargetPicker();
      if (onCancel) onCancel();
    };

    const keyHandler = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        cursor = (cursor - 1 + aliveEnemies.length) % aliveEnemies.length;
        this.highlightEnemy(aliveEnemies[cursor].idx);
        e.preventDefault();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        cursor = (cursor + 1) % aliveEnemies.length;
        this.highlightEnemy(aliveEnemies[cursor].idx);
        e.preventDefault();
      } else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
        e.preventDefault();
        finish(aliveEnemies[cursor].idx);
      } else if (e.code === 'Escape') {
        e.preventDefault();
        cancel();
      }
    };
    document.addEventListener('keydown', keyHandler);

    // Click on an enemy info block to pick it
    const clickHandlers = [];
    aliveEnemies.forEach((e) => {
      const entry = this.enemyEntries[e.idx];
      if (!entry) return;
      const handler = () => finish(e.idx);
      entry.infoEl.addEventListener('click', handler);
      entry.infoEl.classList.add('clickable');
      clickHandlers.push({ entry, handler });
    });

    this._targetPickerCleanup = () => {
      document.removeEventListener('keydown', keyHandler);
      for (const { entry, handler } of clickHandlers) {
        entry.infoEl.removeEventListener('click', handler);
        entry.infoEl.classList.remove('clickable');
      }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      this.clearEnemyHighlight();
    };
  }

  _closeTargetPicker() {
    if (this._targetPickerCleanup) {
      this._targetPickerCleanup();
      this._targetPickerCleanup = null;
    }
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
    if (!this.menuEl) return;
    this.menuEl.style.pointerEvents = 'none';
    this.menuEl.style.opacity = '0.5';
  }

  enableInput() {
    if (!this.menuEl) return;
    this.menuEl.style.pointerEvents = 'auto';
    this.menuEl.style.opacity = '1';
  }

  remove() {
    this._closeTargetPicker();
    if (this._tooltip) { this._tooltip.remove(); this._tooltip = null; }
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    if (this.enemyRowEl && this.enemyRowEl.parentNode) this.enemyRowEl.parentNode.removeChild(this.enemyRowEl);
    this.root = null;
    this.enemyRowEl = null;
    this.enemyEntries = [];
  }
}
