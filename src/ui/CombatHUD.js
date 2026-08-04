// Combat HUD — supports 1+ enemies and 1+ party members.
// Top-center: row of enemy bars with name/HP/telegraph; selected target gets a highlight.
// Bottom-left: stats wrapper. Active actor's full bars on top; remaining party shows compact bars below.
// New: showTargetPicker(enemies, onPick) — arrow-key cycle through alive enemies, Enter to pick.

// One-time injection of the cinematic HUD styles (intro banner + FX overlays).
// Kept here rather than in styles/combat.css so the whole cinematics layer ships
// as a self-contained unit.
let _cineStylesInjected = false;
function _ensureCineStyles() {
  if (_cineStylesInjected || typeof document === 'undefined') return;
  _cineStylesInjected = true;
  const style = document.createElement('style');
  style.id = 'combat-cine-styles';
  style.textContent = `
  /* Enemy intro banner (kinetic slide-in + settle) */
  .combat-enemy-intro {
    position: absolute; top: 34%; left: 0; right: 0; text-align: right;
    padding-right: 8vw; pointer-events: none; z-index: 40;
    transition: opacity 0.45s ease, transform 0.45s ease;
  }
  .combat-enemy-intro.leaving { opacity: 0; transform: translateX(40px); }
  /* Resting states are VISIBLE — the keyframes are pure entrance polish, so the
     banner still reads if the animation timeline is throttled (headless / heavy
     frame). Same pattern as .combat-message. */
  .combat-enemy-intro-kicker {
    font-family: 'VT323', monospace; font-size: 20px; letter-spacing: 6px;
    color: #6ea8ff; opacity: 0.9; text-shadow: 0 0 8px rgba(15,52,96,0.9);
    animation: introKicker 0.5s ease-out 0.15s both;
  }
  .combat-enemy-intro-name {
    font-family: 'Press Start 2P', cursive; font-size: 46px; line-height: 1.1;
    color: #fff; text-shadow: 3px 3px 0 #e94560, 6px 6px 12px rgba(0,0,0,0.8);
    transform: none; opacity: 1;
    animation: introNameSlide 0.6s cubic-bezier(0.16,1,0.3,1) both;
  }
  .combat-enemy-intro-bar {
    height: 4px; margin: 12px 0 10px auto; width: min(52vw,640px);
    background: linear-gradient(90deg, rgba(233,69,96,0) 0%, #e94560 60%, #ff8fa3 100%);
    box-shadow: 0 0 12px rgba(233,69,96,0.8);
    animation: introBarWipe 0.55s ease-out 0.35s both;
  }
  .combat-enemy-intro-sub {
    font-family: 'VT323', monospace; font-size: 22px; color: #ffb3c0;
    max-width: 46ch; margin-left: auto; text-shadow: 1px 1px 4px rgba(0,0,0,0.9);
    opacity: 1; animation: introSubFade 0.5s ease-out 0.55s both;
  }
  @keyframes introKicker { from{opacity:0;transform:translateX(30px)} to{opacity:0.9;transform:translateX(0)} }
  @keyframes introNameSlide { 0%{transform:translateX(120%);opacity:0} 70%{transform:translateX(-6%);opacity:1} 100%{transform:translateX(0);opacity:1} }
  @keyframes introBarWipe { from{width:0} to{width:min(52vw,640px)} }
  @keyframes introSubFade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
  @media (max-width:700px),(max-height:540px){
    .combat-enemy-intro-name{font-size:30px} .combat-enemy-intro-sub{font-size:17px}
  }
  /* Cinematic FX overlays (driven by CombatCinematics) */
  .combat-fx-overlay { position: absolute; inset: 0; pointer-events: none; z-index: 18; }
  .combat-fx-vignette {
    background: radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, var(--fx-color,#e94560) 140%);
    opacity: 0; mix-blend-mode: screen; animation: fxVignettePulse 0.66s ease-out forwards;
  }
  @keyframes fxVignettePulse { 0%{opacity:0} 30%{opacity:0.55} 100%{opacity:0} }
  .combat-fx-grid {
    background-image: linear-gradient(var(--fx-color,#66ff99) 1px, transparent 1px),
      linear-gradient(90deg, var(--fx-color,#66ff99) 1px, transparent 1px);
    background-size: 48px 48px; opacity: 0; mix-blend-mode: screen;
    animation: fxGridFlash 0.34s steps(2,end) forwards;
  }
  @keyframes fxGridFlash { 0%{opacity:0} 20%{opacity:0.30} 100%{opacity:0} }
  .combat-fx-scanline {
    background-image: repeating-linear-gradient(0deg, var(--fx-color,#cc88ff) 0px, var(--fx-color,#cc88ff) 1px, transparent 3px, transparent 5px);
    opacity: 0; mix-blend-mode: screen; animation: fxScanline 0.52s linear forwards;
  }
  @keyframes fxScanline { 0%{opacity:0;background-position-y:0} 25%{opacity:0.35} 100%{opacity:0;background-position-y:60px} }
  /* Power-move banner — its OWN slot in the upper third so the title reads
     clear of the centered combat-message (phase taunts) that used to bury it. */
  .combat-power-banner {
    position: absolute; top: 20%; left: 0; right: 0; text-align: center;
    pointer-events: none; z-index: 46;
    font-family: 'Press Start 2P', cursive; font-size: 40px; line-height: 1.1;
    color: #ffd700;
    text-shadow: 0 0 18px rgba(255,180,0,0.9), 3px 3px 0 #7a2a00, 5px 5px 14px rgba(0,0,0,0.85);
    animation: powerBannerSlam 0.4s cubic-bezier(0.2,1.4,0.4,1) both;
  }
  @keyframes powerBannerSlam {
    0%{opacity:0;transform:scale(1.9) translateY(-10px)}
    60%{opacity:1;transform:scale(0.94)}
    100%{opacity:1;transform:scale(1)}
  }
  .combat-power-banner.leaving { opacity: 0; transition: opacity 0.4s ease; }
  @media (max-width:700px),(max-height:540px){ .combat-power-banner{font-size:26px} }
  `;
  document.head.appendChild(style);
}

export class CombatHUD {
  constructor() {
    _ensureCineStyles();
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
    // NO opening paint here. `showMainMenu` has exactly one caller,
    // `CombatState._showMainMenuLive()`, which reads all eight arguments off the
    // live engine before input is enabled. A bare call from inside the HUD
    // applies eight defaults and is how the 9-buttons-to-4 collapse got in.
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
        <div class="combat-composure" style="display:none;">
          <span class="combat-composure-label">COMPOSURE</span>
          <div class="combat-composure-bar"><div class="combat-composure-fill"></div></div>
        </div>
        <div class="combat-locks" style="display:none;"></div>
        <div class="combat-telegraph" style="display:none;"></div>
      `;
      const hpFill = wrap.querySelector('.combat-enemy-hp-fill');
      const telegraphEl = wrap.querySelector('.combat-telegraph');
      const locksEl = wrap.querySelector('.combat-locks');
      const composureEl = wrap.querySelector('.combat-composure');
      const composureFill = wrap.querySelector('.combat-composure-fill');
      this.enemyRowEl.appendChild(wrap);
      this.enemyEntries.push({ index: i, infoEl: wrap, hpFill, telegraphEl, locksEl, composureEl, composureFill });
    });
  }

  // ── Composure / Break bar (one per enemy, under the HP bar) ───────────
  // Fills ONLY on weakness-tag hits. Empty it and the enemy loses a turn.
  updateComposureAll(enemies) {
    enemies.forEach((e, i) => {
      const entry = this.enemyEntries[i];
      if (!entry || !entry.composureEl) return;
      if (!e.maxComposure || e.hp <= 0) { entry.composureEl.style.display = 'none'; return; }
      entry.composureEl.style.display = '';
      const pct = Math.max(0, Math.min(100, (e.composure / e.maxComposure) * 100));
      entry.composureFill.style.width = `${pct}%`;
      const broken = (e.broken || 0) > 0;
      entry.composureEl.classList.toggle('broken', broken);
      const label = entry.composureEl.querySelector('.combat-composure-label');
      // The bar names its own key. Composure only ever moves on a hit that
      // matches the target's weakness tag, and single-lock Objections
      // deliberately never ask for that tag — so the player is always choosing
      // between cancelling the move and breaking the person. Saying WEAKNESS
      // ONLY on the label is the cheapest way to make that trade visible
      // instead of something you infer after forty fights.
      if (label) {
        label.textContent = broken
          ? 'VISIBLY RATTLED'
          : (e.weakness ? `COMPOSURE — ${String(e.weakness).toUpperCase()} ONLY` : 'COMPOSURE');
      }
    });
  }

  // One-shot flash on the bar when it empties.
  pulseComposureBreak(idx) {
    const entry = this.enemyEntries[idx];
    if (!entry || !entry.composureEl) return;
    entry.composureEl.classList.remove('breaking');
    void entry.composureEl.offsetWidth;   // restart the animation
    entry.composureEl.classList.add('breaking');
  }

  // ── LOCKS row (Sea of Stars) ─────────────────────────────────────────
  // locksPerEnemy: array parallel to enemies, each [{ tag, cleared }] or [].
  // sealedPerEnemy: parallel booleans — an enemy that has ESCALATED TO
  // COMMITTEE still shows its Objections, but none of them can be cleared.
  updateLocksAll(locksPerEnemy, sealedPerEnemy = []) {
    const TAG_LABEL = { legal: 'LEGAL', social: 'SOCIAL', audit: 'AUDIT', technical: 'TECH' };
    this.enemyEntries.forEach((entry, i) => {
      if (!entry.locksEl) return;
      const locks = locksPerEnemy?.[i];
      const sealed = !!sealedPerEnemy?.[i];
      if (!Array.isArray(locks) || locks.length === 0) {
        entry.locksEl.style.display = 'none';
        entry.locksEl.innerHTML = '';
        entry._lockSig = '';
        return;
      }
      // Only rewrite when the row actually changed. _refreshHUD() runs on every
      // beat and an unconditional innerHTML rewrite tore the shatter animation
      // off the chip that had just cleared (verified: shatter never survived
      // to a frame).
      const sig = locks.map(l => `${l.tag}:${l.cleared ? 1 : 0}`).join('|') + (sealed ? '|S' : '');
      if (entry._lockSig === sig) return;
      entry._lockSig = sig;
      entry.locksEl.style.display = '';
      entry.locksEl.classList.toggle('sealed', sealed);
      entry.locksEl.innerHTML =
        `<span class="combat-locks-label">${sealed ? 'COMMITTEE SEALED' : 'OBJECTIONS'}</span>` +
        locks.map(l => `<span class="combat-lock-chip lock-${l.tag}${l.cleared ? ' cleared' : ''}">${l.cleared ? '✓ ' : ''}${TAG_LABEL[l.tag] || l.tag.toUpperCase()}</span>`).join('');
    });
  }

  // Shatter animation on a single chip that just cleared.
  pulseLockCleared(enemyIndex, tag) {
    const entry = this.enemyEntries[enemyIndex];
    if (!entry || !entry.locksEl) return;
    const chip = entry.locksEl.querySelector(`.combat-lock-chip.lock-${tag}.cleared`);
    if (!chip) return;
    chip.classList.remove('shatter');
    void chip.offsetWidth;
    chip.classList.add('shatter');
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
        <div class="combat-party-bars">
          <div class="combat-party-hp-bar"><div class="combat-party-hp-fill" style="width:${p.maxHP > 0 ? (p.hp / p.maxHP) * 100 : 0}%"></div></div>
          <div class="combat-party-mp-bar"><div class="combat-party-mp-fill" style="width:${p.maxMP > 0 ? (p.mp / p.maxMP) * 100 : 0}%"></div></div>
        </div>
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
  // opts (8th arg, optional): { pressAdvantageUsed } — Press Advantage no
  // longer ends the turn, so the button must vanish once it has been used
  // this turn rather than relying on the momentum tier to hide it.
  showMainMenu(silenced = false, momentum = 0, bracing = false, retaliateReady = false, lowHP = false, pressAdvantageCost = 25, voicesAvailable = [], opts = {}) {
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

    // Press Advantage is a FREE action now (it does not end the turn), so it is
    // offered at any momentum tier and disappears once spent for this turn.
    if (momentum >= pressAdvantageCost && !opts.pressAdvantageUsed) {
      this.menuItems.push({ label: `▶ Press Advantage (${pressAdvantageCost}% · free)`, action: 'press_advantage', momentumSpend: true });
    }
    if (momentum >= 50 && momentum < 100) {
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
        // NEVER call showMainMenu() here — the HUD does not know the live
        // engine state, so every default would apply and Press Advantage,
        // Second Wind, Assert Dominance, Retaliate, Desperate Gamble, the
        // voices AND Silence would all be wiped. Raise the action instead and
        // let CombatState re-render with all eight arguments. Same contract the
        // ally submenu already uses (`onAllyActionSelect('back')`).
        if (this.onActionSelect) this.onActionSelect('back');
      } else if (this.onAbilitySelect) {
        this.onAbilitySelect(item.id, item);
      }
    } else if (this.currentMenu === 'items') {
      if (item.action === 'back') {
        if (this.onActionSelect) this.onActionSelect('back');
      } else if (this.onItemSelect) {
        this.onItemSelect(item.id);
      }
    } else if (this.currentMenu === 'voices') {
      if (item.action === 'back') {
        if (this.onActionSelect) this.onActionSelect('back');
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

  // Kinetic enemy-intro banner — big name slide-in + settle, one taunt line,
  // red/navy. Choreographed by CombatState with the CombatScene orbit-settle.
  showEnemyIntro(name, subtitle = '', opts = {}) {
    const el = document.createElement('div');
    el.className = 'combat-enemy-intro';
    el.innerHTML = `
      <div class="combat-enemy-intro-kicker">NOW ENTERING</div>
      <div class="combat-enemy-intro-name">${name}</div>
      <div class="combat-enemy-intro-bar"></div>
      ${subtitle ? `<div class="combat-enemy-intro-sub">${subtitle}</div>` : ''}
    `;
    this.container.appendChild(el);
    const hold = opts.hold || 1700;
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }, hold);
    return el;
  }

  // Full-screen FX overlay pulse used by the cinematic sequencer.
  // kind: 'vignette' (edge pulse) | 'grid' (audit) | 'scanline' (technical).
  pulseOverlay(kind = 'vignette', color = '#e94560', ms = 500) {
    const el = document.createElement('div');
    el.className = `combat-fx-overlay combat-fx-${kind}`;
    el.style.setProperty('--fx-color', color);
    this.container.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, ms);
    return el;
  }

  // ── LOOP IN (Baton Pass) prompt ──────────────────────────────────────
  // Fires right after Andrew lands a weakness hit with an ally on the bench.
  // candidates: [{ index, name }]; onPick(index) / onDecline().
  // Reuses the minigame-overlay pattern (Desperate Gamble / Retaliate) so it
  // reads as part of the same family of player-priced choices.
  showLoopInPrompt(candidates, onPick, onDecline) {
    this._closeLoopIn();
    const options = [...candidates, { index: -1, name: 'Keep it on my desk', decline: true }];
    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay loop-in-overlay';
    overlay.innerHTML = `
      <div class="minigame-title">Loop In a Colleague?</div>
      <div class="gamble-options">
        ${options.map((o, i) => `
          <div class="gamble-option${i === 0 ? ' selected' : ''}" data-i="${i}">
            <div class="gamble-option-name" style="color:${o.decline ? '#88aaff' : '#ffd700'}">${o.decline ? o.name : `Loop in ${o.name}`}</div>
            <div class="gamble-option-desc">${o.decline ? 'Andrew finishes the turn alone.' : 'Your colleague attacks with +50% damage.'}</div>
          </div>`).join('')}
      </div>
      <div class="minigame-hint">↑↓/WS navigate · ENTER/E confirm · ESC to decline</div>
    `;
    this.container.appendChild(overlay);

    let sel = 0;
    const optEls = overlay.querySelectorAll('.gamble-option');
    const updateSel = () => optEls.forEach((el, i) => el.classList.toggle('selected', i === sel));
    const finish = (i) => {
      const chosen = options[i];
      this._closeLoopIn();
      if (!chosen || chosen.decline) onDecline();
      else onPick(chosen.index);
    };
    const keyHandler = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { sel = Math.max(0, sel - 1); updateSel(); e.preventDefault(); }
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') { sel = Math.min(options.length - 1, sel + 1); updateSel(); e.preventDefault(); }
      else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); finish(sel); }
      else if (e.code === 'Escape') { e.preventDefault(); finish(options.length - 1); }
    };
    optEls.forEach((el, i) => el.addEventListener('click', () => { sel = i; updateSel(); finish(i); }));
    document.addEventListener('keydown', keyHandler);
    this._loopInCleanup = () => {
      document.removeEventListener('keydown', keyHandler);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };
  }

  _closeLoopIn() {
    if (this._loopInCleanup) { this._loopInCleanup(); this._loopInCleanup = null; }
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

  // Big centered-upper announcement for signature moves (ASSERT DOMINANCE),
  // rendered in its own slot above the combat-message band so it never gets
  // buried behind an enemy phase-taunt firing on the same beat.
  showBanner(text, hold = 1400) {
    if (this._powerBanner && this._powerBanner.parentNode) this._powerBanner.remove();
    const el = document.createElement('div');
    el.className = 'combat-power-banner';
    el.textContent = text;
    this.container.appendChild(el);
    this._powerBanner = el;
    setTimeout(() => {
      el.classList.add('leaving');
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
    }, hold);
    return el;
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
    this._closeLoopIn();
    if (this._tooltip) { this._tooltip.remove(); this._tooltip = null; }
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    if (this.enemyRowEl && this.enemyRowEl.parentNode) this.enemyRowEl.parentNode.removeChild(this.enemyRowEl);
    this.root = null;
    this.enemyRowEl = null;
    this.enemyEntries = [];
  }
}
