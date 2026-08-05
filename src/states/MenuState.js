import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { SaveManager } from '../core/SaveManager.js';
import { EventBus } from '../core/EventBus.js';
import { BESTIARY_DATA } from '../data/bestiary.js';
import { ENEMY_STATS, PLAYER_ABILITIES, XP_TABLE, PRACTICE_GROUPS, TIER_LEVEL } from '../data/stats.js';
import { ALLY_STATS, ALLY_ABILITIES } from '../data/allies.js';
import { COSMETICS, COSMETIC_SLOTS } from '../data/cosmetics.js';
import { AchievementManager } from '../core/AchievementManager.js';
import { NotificationArbiter, NC } from '../core/NotificationArbiter.js';
import { Player } from '../entities/Player.js';

export class MenuState {
  constructor(stateManager, player) {
    this.stateManager = stateManager;
    this.player = player;
    this.element = null;
    this.selectedIndex = 0;
    this.menuItems = ['Resume', 'Abilities', 'Cosmetics', 'Journal', 'Log', 'Achievements', 'Stats', 'Save Game', 'Controls', 'Settings', 'Quit to Title'];
    // New Game+ unlocks after the Algorithm falls
    if (player.getFlag('algorithm_defeated')) {
      this.menuItems.splice(this.menuItems.length - 1, 0, 'New Game+');
    }
    this._ngPlusArmed = false;
    this._restructureArmed = false;
    this.achievementsOverlay = null;
    this.controlsOverlay = null;
    this.audioOverlay = null;
    this.bestiaryOverlay = null;
    this.logOverlay = null;
    this.abilitiesOverlay = null;
    this.cosmeticsOverlay = null;
    this.statsOverlay = null;
    this.bestiarySelectedIndex = 0;
    this._abilitySelectedIndex = 0;
    this._cosmeticSelectedIndex = 0;
    this._cosmeticSlotIndex = 0;
  }

  enter() {
    // A modal owns the whole screen. Suspend the world scope so a queued
    // objective / achievement / autosave card cannot float over it; it comes
    // back the moment we pop (DEFER, DON'T DESTROY).
    NotificationArbiter.suspendScope('world');
    const overlay = document.getElementById('ui-overlay');

    // Tag definitions per menu item
    const itemMeta = {
      'Resume':         { tag: '[SYS]',      tagColor: '#53a8b6', section: 'SYSTEM' },
      'Abilities':      { tag: '[PROFILE]',  tagColor: '#ffcc33', section: 'CHARACTER' },
      'Cosmetics':      { tag: '[PROFILE]',  tagColor: '#ffcc33', section: null },
      'Journal':        { tag: '[DATABASE]', tagColor: '#53a8b6', section: null },
      'Log':            { tag: '[INBOX]',    tagColor: '#53a8b6', section: null },
      'Achievements':   { tag: '[RECORDS]',  tagColor: '#53a8b6', section: null },
      'Stats':          { tag: '[PROFILE]',  tagColor: '#ffcc33', section: null },
      'Save Game':      { tag: '[SYS]',      tagColor: '#44cc88', section: 'SETTINGS' },
      'Controls':       { tag: '[SYS]',      tagColor: '#53a8b6', section: null },
      'Settings': { tag: '[SYS]',      tagColor: '#53a8b6', section: null },
      'New Game+':      { tag: '[NG+]',      tagColor: '#ffaa44', section: null },
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

      // Unread badge on Log. Deferral is only honest if the player can SEE
      // that something was held — otherwise "we saved it for you" is
      // indistinguishable from "we lost it".
      const unread = label === 'Log' ? NotificationArbiter.getUnreadCount() : 0;
      const item = document.createElement('div');
      item.className = `menu-item${i === this.selectedIndex ? ' selected' : ''}`;
      item.innerHTML = `
        <span class="menu-item-label">${label}${unread > 0 ? ` <span style="color:#ffd700;font-size:0.85em">(${unread})</span>` : ''}</span>
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

  // Defence in depth, not the fix: if anything ever lands on top of the pause
  // menu, `GameStateManager.push()` calls these and the panel gets out of the
  // way instead of floating over the new state. The real guard is
  // `ExplorationState._transitionArmed()`, which stops the burial happening.
  pause()  { if (this.element) this.element.style.display = 'none'; }
  resume() { if (this.element) this.element.style.display = ''; }

  exit() {
    NotificationArbiter.resumeScope('world');
    this._closeLog();
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
      case 'Log':
        this._showLog();
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
      case 'Settings':
        this._showAudioSettings();
        break;
      case 'New Game+':
        this._startNewGamePlus();
        break;
      case 'Quit to Title':
        EventBus.emit('quit-to-title');
        break;
    }
  }

  // New Game+: story resets to Monday morning; you keep AUM, abilities,
  // cosmetics, records, and the arcade. Enemies hit 30% harder.
  // Two-press confirm — the first press arms it.
  _startNewGamePlus() {
    const items = this.element.querySelectorAll('.menu-item');
    const idx = this.menuItems.indexOf('New Game+');
    if (!this._ngPlusArmed) {
      this._ngPlusArmed = true;
      if (items[idx]) {
        items[idx].style.color = '#ffaa44';
        items[idx].innerHTML = items[idx].innerHTML.replace('New Game+', 'New Game+ — press again to restart the week');
      }
      return;
    }

    const data = this.player.serialize();
    const freshData = new Player().serialize();

    // Carry: currency, identity, growth, records, arcade — not story
    freshData.stats.aum = data.stats.aum || 0;
    freshData.deaths = data.deaths || 0;
    freshData.equipped = { ...data.equipped };
    freshData.unlockedAbilities = data.unlockedAbilities;
    freshData.questStates = data.questStates;
    // Ally-taught abilities are bought with the SAME upgradePoints as Andrew's
    // tree (1 each, counted by _spentUpgradePoints), but `party` and
    // `allyState` deliberately do not carry into a new lap — so every point a
    // player sank into Janet or Isaiah used to evaporate at the lap change,
    // silently, while the docs promised "you keep your upgrade points". Refund
    // the ally share into the carried pool. Andrew's own tree is not refunded:
    // `unlockedAbilities` carries, so those points are still doing their job.
    const allyRefund = this._spentAllyUpgradePoints();
    freshData.upgradePoints = (data.upgradePoints || 0) + allyRefund;

    const CARRY_PREFIXES = ['arcade_', 'bestiary_', 'pb_'];
    const cosmeticFlags = (Array.isArray(COSMETICS) ? COSMETICS : Object.values(COSMETICS))
      .map(c => c.unlock?.flag)
      .filter(Boolean);
    freshData.flags = {};
    for (const [k, v] of Object.entries(data.flags || {})) {
      if (v && (CARRY_PREFIXES.some(p => k.startsWith(p)) || cosmeticFlags.includes(k))) {
        freshData.flags[k] = v;
      }
    }
    freshData.flags.ng_plus = true;
    freshData.flags.ng_plus_count = (data.flags?.ng_plus_count || 0) + 1;

    SaveManager.save(freshData);
    window.location.reload();
  }

  _saveGame() {
    const data = this.player.serialize();
    const success = SaveManager.save(data);
    const msg = success ? 'Game Saved!' : 'Save Failed!';
    NotificationArbiter.note(success ? NC.BOOKKEEPING : NC.PROGRESS, msg);
    if (this._saveFlash && this._saveFlash.parentNode) this._saveFlash.remove();
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8); color: ${success ? '#44ff44' : '#ff4444'};
      padding: 16px 32px; border-radius: 8px; font-family: 'Press Start 2P', cursive;
      font-size: 16px; z-index: 200;
    `;
    flash.textContent = msg;
    document.getElementById('ui-overlay').appendChild(flash);
    this._saveFlash = flash;
    setTimeout(() => {
      if (flash.parentNode) flash.parentNode.removeChild(flash);
      if (this._saveFlash === flash) this._saveFlash = null;
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
      const S = this._settings;
      const bar = (v) => {
        const filled = Math.round(v * 10);
        return '■'.repeat(filled) + '□'.repeat(10 - filled);
      };
      const onOff = (v) => `<span style="color:${v ? '#44ff44' : '#ff4444'};">${v ? 'ON' : 'OFF'}</span>`;
      const speedLabel = S.textSpeed >= 1.4 ? 'SLOW' : S.textSpeed <= 0.6 ? 'FAST' : 'NORMAL';
      const hl = 'background:rgba(233,69,96,0.15);border-left:3px solid #e94560;padding-left:8px;margin-left:-11px;';
      const row = (i, label, value) =>
        `<div style="${this._audioFocus === i ? hl : ''}"><span style="color:#e94560;">${label}</span>&nbsp; ${value}</div>`;
      this.audioOverlay.innerHTML = `
        <div class="menu-panel">
          <div class="menu-title">SETTINGS</div>
          <div style="color:#ddd;font-family:'VT323',monospace;font-size:22px;line-height:2.1;">
            ${row(0, 'Music:', `[${bar(S.musicVol)}] ${Math.round(S.musicVol * 100)}%`)}
            ${row(1, 'SFX:', `[${bar(S.sfxVol)}] ${Math.round(S.sfxVol * 100)}%`)}
            ${row(2, 'Text Speed:', speedLabel)}
            ${row(3, '1998 MODE:', onOff(S.retro) + '<span style="font-size:15px;color:#888;"> (off reduces flicker)</span>')}
            ${row(4, 'Screen Shake:', onOff(S.shake))}
            <div style="font-size:16px;color:#888;margin-left:8px;">↑↓ select &nbsp; ← → adjust</div>
          </div>
          <div class="menu-item" style="margin-top:16px;" id="audio-back">Back</div>
        </div>
      `;
      document.getElementById('audio-back')?.addEventListener('click', () => this._closeAudioSettings());
    };

    import('../core/Settings.js').then(({ SETTINGS }) => {
      this._settings = SETTINGS;
      document.getElementById('ui-overlay').appendChild(this.audioOverlay);
      if (this.element) this.element.style.display = 'none';
      render();
      this._audioRender = render;
      this._audioFocus = 0; // row index
    });
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
    // THE SCARCITY, SAID OUT LOUD. The total is DERIVED, never typed, so it
    // cannot drift when a node is added: three Practice Groups at nine points
    // each, plus the shared pool, against one point per level-up for life.
    const demand = Object.values(PLAYER_ABILITIES)
      .filter(a => a.upgradePointCost && !a.unlockQuest)
      .reduce((n, a) => n + a.upgradePointCost, 0);
    pointsDiv.innerHTML = `Upgrade Points: <span class="abilities-points-value">${this.player.upgradePoints}</span>`
      + `<span class="abilities-demand"> &nbsp;/&nbsp; ${demand} points of development plan</span>`;
    panel.appendChild(pointsDiv);

    // Character tabs — Andrew + each recruited ally
    const characterTabs = this._buildCharacterTabs();
    if (characterTabs.length > 1) {
      panel.appendChild(this._renderCharacterTabs(characterTabs));
    }

    // Active character determines which ability list we render
    const active = this._abilityActiveActor || 'andrew';
    if (active !== 'andrew' && ALLY_STATS[active]) {
      // Render ally ability tree
      panel.appendChild(this._renderAllyAbilities(active));

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
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'abilities-grid';

    // ── PRACTICE GROUPS ─────────────────────────────────────────────
    // Was `const tiers = [0,1,2,3]` — a PURCHASE-ORDER concept. It is now the
    // firm's career tracks, in tier order INSIDE each track, so a column reads
    // as a development plan rather than as a shopping list.
    const allAbilities = Object.entries(PLAYER_ABILITIES).filter(([, a]) => !a.unlockQuest);
    const questAbilities = Object.entries(PLAYER_ABILITIES).filter(([, a]) => a.unlockQuest);
    const groups = [
      ['__starters', { name: 'THE TRUNK', blurb: 'Free, and every track keeps all of it. No build choice can ever lock you out of a practice area — only out of how well you work in it.', rider: '' }],
      ...Object.entries(PRACTICE_GROUPS),
    ];
    let itemIndex = 0;
    this._abilityActions = [];

    for (const [trackId, group] of groups) {
      const trackAbilities = allAbilities
        .filter(([, a]) => (trackId === '__starters' ? (a.tier ?? 0) === 0 : a.track === trackId))
        // `depth` is the AUTHORED spend order inside a track; tier is the level gate.
        // Sorting by depth first is what makes the column read as a development
        // plan rather than as a price list.
        .sort((x, y) => ((x[1].depth ?? 99) - (y[1].depth ?? 99)) || ((x[1].tier ?? 0) - (y[1].tier ?? 0)));
      if (trackAbilities.length === 0) continue;

      const owned = trackAbilities.filter(([id]) => this.player.unlockedAbilities.has(id))
        .reduce((n, [, a]) => n + (a.upgradePointCost || 0), 0);
      const total = trackAbilities.reduce((n, [, a]) => n + (a.upgradePointCost || 0), 0);

      const tierLabel = document.createElement('div');
      tierLabel.className = 'abilities-tier-label';
      tierLabel.textContent = total > 0 ? `${group.name}  —  ${owned}/${total} PTS` : group.name;
      grid.appendChild(tierLabel);

      const blurb = document.createElement('div');
      blurb.className = 'abilities-track-blurb';
      blurb.textContent = group.blurb;
      grid.appendChild(blurb);
      if (group.rider) {
        const rider = document.createElement('div');
        rider.className = 'abilities-track-rider';
        rider.textContent = group.rider;
        grid.appendChild(rider);
      }

      for (const [id, ability] of trackAbilities) {
        const unlocked = this.player.unlockedAbilities.has(id);
        const canUnlock = this.player.canUnlockAbility(id);
        const hasPrereq = !ability.requires || this.player.unlockedAbilities.has(ability.requires);
        const gate = this.player.tierGateFor(id);
        const levelLocked = !unlocked && gate > 0 && (this.player.stats.level || 1) < gate;
        const idx = itemIndex++;

        const card = document.createElement('div');
        card.className = `ability-card${unlocked ? ' unlocked' : canUnlock ? ' available' : ' locked'}`
          + `${ability.type === 'passive' ? ' passive' : ''}${ability.capstone ? ' capstone' : ''}`
          + `${levelLocked ? ' level-locked' : ''}${idx === this._abilitySelectedIndex ? ' selected' : ''}`;
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
        if (ability.capstone) header.innerHTML += `<span class="ability-capstone-badge">CAPSTONE</span>`;
        card.appendChild(header);

        const desc = document.createElement('div');
        desc.className = 'ability-desc';
        desc.textContent = ability.description;
        card.appendChild(desc);

        const meta = document.createElement('div');
        meta.className = 'ability-meta';
        const typeLabel = ability.type === 'attack' ? 'ATK' : ability.type === 'heal' ? 'HEAL' : ability.type === 'buff' ? 'BUFF' : ability.type === 'debuff' ? 'DEBUFF' : ability.type.toUpperCase();
        // A PASSIVE has no cast cost and never will; printing "0 Coffee" on it
        // reads as a bug rather than as a rule.
        if (ability.type === 'passive') {
          meta.innerHTML = '<span>PASSIVE</span><span>always on</span>';
        } else {
          meta.innerHTML = `<span>${typeLabel}</span>`
            + (ability.momentumCost ? `<span>${ability.momentumCost} Confidence</span>` : `<span>${ability.cost} Coffee</span>`);
          if (ability.power) meta.innerHTML += `<span>Power: ${ability.power}</span>`;
          if (ability.healAmount) meta.innerHTML += `<span>+${ability.healAmount} HP</span>`;
        }
        card.appendChild(meta);

        if (levelLocked) {
          const req = document.createElement('div');
          req.className = 'ability-req';
          req.textContent = `Available at level ${gate}`;
          card.appendChild(req);
        }
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

    // ── Restructure (free respec) ──────────────────────────────────────
    // Experimentation volume is a function of the cost of being wrong.
    // Hades refunds the whole Mirror for one Key; Vampire Survivors refunds
    // PowerUps at 100% with no penalty. This tree has hard `requires` chains
    // and 19 abilities, so a player who spent into the wrong branch was stuck
    // with it for the rest of the run. Free, unlimited, two-press confirm.
    // Quest abilities are untouched — those are earned, not bought.
    panel.appendChild(this._buildRestructureButton());

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

  // How many upgrade points are currently sunk into unlockable abilities —
  // Andrew's tree plus anything taught to an ally. Refunding exactly this
  // means the Liquidate-Final-Point sale can never be farmed by respeccing:
  // a liquidated point was never spent on an ability, so it never comes back.
  _spentUpgradePoints() {
    let spent = 0;
    for (const [id, a] of Object.entries(PLAYER_ABILITIES)) {
      if (a.unlockQuest || (a.tier ?? 0) === 0) continue;
      if (this.player.unlockedAbilities.has(id)) spent += a.upgradePointCost || 1;
    }
    return spent + this._spentAllyUpgradePoints();
  }

  /** Just the ally half of the ledger — refunded on New Game+. */
  _spentAllyUpgradePoints() {
    let spent = 0;
    for (const allyId of (this.player.party || [])) {
      const cfg = ALLY_STATS[allyId];
      const starters = new Set(cfg?.starterAbilities || cfg?.abilities || []);
      for (const abilityId of this.player.getAllyUnlockedAbilities(allyId)) {
        if (!starters.has(abilityId)) spent += 1;
      }
    }
    return spent;
  }

  _buildRestructureButton() {
    const btn = document.createElement('div');
    btn.className = 'menu-item';
    btn.style.cssText = 'margin-top:12px;color:#53a8b6;border:1px solid #53a8b6;padding:6px 12px;border-radius:4px;cursor:pointer;text-align:center;';
    const spent = this._spentUpgradePoints();
    btn.textContent = 'Request Restructuring';
    btn.addEventListener('click', () => {
      if (spent === 0) {
        this._flashAbilityMessage('Andrew has no skill investments to liquidate. The assessment took four seconds.');
        return;
      }
      if (!this._restructureArmed) {
        this._restructureArmed = true;
        btn.textContent = 'Press again to liquidate all skill investments';
        btn.style.color = '#ffaa44';
        btn.style.borderColor = '#ffaa44';
        return;
      }
      this._restructure(spent);
    });
    return btn;
  }

  _restructure(refund) {
    const STARTERS = ['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check'];
    this.player.unlockedAbilities = new Set(STARTERS);
    for (const allyId of (this.player.party || [])) {
      const cfg = ALLY_STATS[allyId];
      if (!cfg || !this.player.allyState[allyId]) continue;
      this.player.allyState[allyId].unlockedAbilities = [...(cfg.starterAbilities || cfg.abilities || [])];
    }
    this.player.upgradePoints += refund;
    this._restructureArmed = false;
    AudioManager.playSfx('confirm');
    this._rerenderAbilities();
    this._flashAbilityMessage("All skill investments have been liquidated. Andrew's file is, briefly, pristine.");
  }

  _flashAbilityMessage(text) {
    const host = this.abilitiesOverlay || document.getElementById('ui-overlay');
    if (!host) return;
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute; bottom:12%; left:50%; transform:translateX(-50%);
      max-width:min(520px, 86vw); text-align:center;
      background:rgba(6,6,12,0.92); border:1px solid #53a8b6; border-radius:4px;
      padding:10px 18px; font-family:'VT323', monospace; font-size:19px; color:#d8d4cc;
      z-index:80; pointer-events:none;`;
    el.textContent = text;
    host.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2600);
  }

  _buildCharacterTabs() {
    const tabs = [{ id: 'andrew', name: 'Andrew' }];
    for (const allyId of (this.player.party || [])) {
      const cfg = ALLY_STATS[allyId];
      if (cfg) tabs.push({ id: allyId, name: cfg.name });
    }
    return tabs;
  }

  _renderCharacterTabs(tabs) {
    const wrap = document.createElement('div');
    wrap.className = 'abilities-character-tabs';
    const active = this._abilityActiveActor || 'andrew';
    for (const t of tabs) {
      const btn = document.createElement('div');
      btn.className = `abilities-character-tab${t.id === active ? ' active' : ''}`;
      btn.textContent = t.name;
      btn.addEventListener('click', () => {
        this._abilityActiveActor = t.id;
        this._abilitySelectedIndex = 0;
        this._rerenderAbilities();
        AudioManager.playSfx('cursor');
      });
      wrap.appendChild(btn);
    }
    return wrap;
  }

  _renderAllyAbilities(allyId) {
    const grid = document.createElement('div');
    grid.className = 'abilities-grid';

    const cfg = ALLY_STATS[allyId];
    const state = this.player.allyState[allyId];
    if (!cfg || !state) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:20px;text-align:center;color:#888';
      empty.textContent = 'Ally state not initialized.';
      grid.appendChild(empty);
      return grid;
    }

    // Show ally header
    const header = document.createElement('div');
    header.className = 'abilities-ally-header';
    const eff = this.player.getAllyEffectiveStats(allyId);
    header.innerHTML = `
      <div class="abilities-ally-name">${cfg.name} <span class="abilities-ally-role">— ${cfg.role}</span></div>
      <div class="abilities-ally-stats">HP ${eff.maxHP} · Coffee ${eff.maxMP} · ATK ${eff.atk} · DEF ${eff.def} · SPD ${eff.spd}</div>
    `;
    grid.appendChild(header);

    // Starter abilities
    const starters = cfg.starterAbilities || [];
    const starterLabel = document.createElement('div');
    starterLabel.className = 'abilities-tier-label';
    starterLabel.textContent = 'STARTER';
    grid.appendChild(starterLabel);

    let itemIndex = 0;
    this._abilityActions = [];

    for (const abilityId of starters) {
      const ability = ALLY_ABILITIES[abilityId];
      if (!ability) continue;
      const idx = itemIndex++;
      const card = document.createElement('div');
      card.className = `ability-card unlocked${idx === this._abilitySelectedIndex ? ' selected' : ''}`;
      card.innerHTML = `
        <div class="ability-card-header">
          <span class="ability-name">${ability.name}</span>
          <span class="ability-unlocked-badge">LEARNED</span>
        </div>
        <div class="ability-desc">${ability.description}</div>
        <div class="ability-meta">
          <span>${(ability.type || '').toUpperCase()}</span>
          <span>${ability.cost || 0} Coffee</span>
          ${ability.power ? `<span>Power: ${ability.power}</span>` : ''}
          ${ability.healAmount ? `<span>+${ability.healAmount} HP</span>` : ''}
          ${ability.tag ? `<span style="color:#88aacc">[${ability.tag}]</span>` : ''}
        </div>
      `;
      this._abilityActions.push(null);
      grid.appendChild(card);
    }

    // Unlockable abilities (not in starterAbilities)
    const unlockables = (cfg.abilities || []).filter(id => !starters.includes(id));
    if (unlockables.length > 0) {
      const tierLabel = document.createElement('div');
      tierLabel.className = 'abilities-tier-label';
      tierLabel.textContent = 'UNLOCKABLE';
      grid.appendChild(tierLabel);

      for (const abilityId of unlockables) {
        const ability = ALLY_ABILITIES[abilityId];
        if (!ability) continue;
        const idx = itemIndex++;
        const isUnlocked = state.unlockedAbilities.includes(abilityId);
        const canUnlock = !isUnlocked && this.player.canUnlockAllyAbility(allyId, abilityId);

        const card = document.createElement('div');
        card.className = `ability-card${isUnlocked ? ' unlocked' : canUnlock ? ' available' : ' locked'}${idx === this._abilitySelectedIndex ? ' selected' : ''}`;
        card.innerHTML = `
          <div class="ability-card-header">
            <span class="ability-name">${ability.name}</span>
            ${isUnlocked ? '<span class="ability-unlocked-badge">LEARNED</span>' : '<span class="ability-cost-badge">1 PT</span>'}
          </div>
          <div class="ability-desc">${ability.description}</div>
          <div class="ability-meta">
            <span>${(ability.type || '').toUpperCase()}</span>
            <span>${ability.cost || 0} Coffee</span>
            ${ability.power ? `<span>Power: ${ability.power}</span>` : ''}
            ${ability.healAmount ? `<span>+${ability.healAmount} HP</span>` : ''}
            ${ability.tag ? `<span style="color:#88aacc">[${ability.tag}]</span>` : ''}
          </div>
        `;
        if (canUnlock) {
          card.addEventListener('click', () => {
            this._abilitySelectedIndex = idx;
            if (this.player.spendPointOnAllyAbility(allyId, abilityId)) {
              AudioManager.playSfx('confirm');
            }
            this._rerenderAbilities();
          });
          this._abilityActions.push(() => {
            this.player.spendPointOnAllyAbility(allyId, abilityId);
            AudioManager.playSfx('confirm');
            this._rerenderAbilities();
          });
        } else {
          this._abilityActions.push(null);
        }
        grid.appendChild(card);
      }
    }

    this._abilityCount = itemIndex;
    return grid;
  }

  _closeAbilities() {
    if (this.abilitiesOverlay && this.abilitiesOverlay.parentNode) {
      this.abilitiesOverlay.parentNode.removeChild(this.abilitiesOverlay);
    }
    this.abilitiesOverlay = null;
    this._restructureArmed = false;
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

    if (this.logOverlay) {
      // SCROLLING IS THE POINT. The ring holds 40 entries and the panel shows
      // about seven; without this the Log is only a safety net for the last
      // seven notices, on the keyboard/gamepad path that is the game's primary
      // input. Arrows/WS scroll; confirm/cancel still close.
      const rows = this._logRowsEl;
      if (rows) {
        if (InputManager.isJustPressed('arrowdown') || InputManager.isJustPressed('s')) rows.scrollTop += 72;
        if (InputManager.isJustPressed('arrowup') || InputManager.isJustPressed('w')) rows.scrollTop -= 72;
      }
      if (InputManager.isCancelPressed() || InputManager.isConfirmPressed()) {
        this._closeLog();
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

      const S = this._settings;
      if (S && (up || down)) {
        this._audioFocus = (this._audioFocus + (down ? 1 : 4)) % 5;
        AudioManager.playSfx('cursor');
      }
      if (S && (left || right)) {
        const dir = right ? 1 : -1;
        switch (this._audioFocus) {
          case 0: S.musicVol = Math.max(0, Math.min(1, S.musicVol + dir * 0.1)); break;
          case 1: S.sfxVol = Math.max(0, Math.min(1, S.sfxVol + dir * 0.1)); break;
          case 2: { // slow 1.5 / normal 1.0 / fast 0.5
            const speeds = [1.5, 1.0, 0.5];
            const i = speeds.findIndex(v => Math.abs(v - S.textSpeed) < 0.01);
            S.textSpeed = speeds[Math.max(0, Math.min(2, (i < 0 ? 1 : i) + dir))];
            break;
          }
          case 3: S.retro = !S.retro; break;
          case 4: S.shake = !S.shake; break;
        }
        import('../core/Settings.js').then(({ applySettings, saveSettings }) => {
          applySettings();
          saveSettings();
        });
        AudioManager.playSfx('cursor');
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

  // ── Message Log ────────────────────────────────────────────────────────
  // The safety net that licenses the arbiter's aggressive deferral. Before
  // this, a notification the game overwrote, buried or destroyed was gone
  // PERMANENTLY — no transient surface in the game could even be dismissed
  // early, let alone re-read. Now every post is in a 40-entry ring with the
  // arbiter's own verdict on it, so "we held your achievement until the boss
  // finished talking" and "we merged nine of these into one card" are both
  // recoverable rather than lossy.
  _showLog() {
    if (this.logOverlay) return;
    const entries = NotificationArbiter.getLog();
    NotificationArbiter.markLogRead();

    // Player-facing names for the arbiter's classes. The internal names are
    // the narrative ruling's vocabulary, not the player's, and they do not fit
    // the column: COMMENDATION rendered as "COMMENDA".
    const CLS_LABEL = {
      VOICE: 'VOICE',
      DECISION: 'ACTION',
      CONSEQUENCE: 'COMBAT',
      PROGRESS: 'PROGRESS',
      COMMENDATION: 'REWARD',
      BOOKKEEPING: 'SYSTEM',
    };
    const CLS_COLOR = {
      VOICE: '#e2d4c2',
      DECISION: '#ffcc33',
      CONSEQUENCE: '#ff8844',
      PROGRESS: '#53a8b6',
      COMMENDATION: '#ffd700',
      BOOKKEEPING: '#7a8494',
    };
    // What the arbiter did with it, in the player's language.
    const STATUS_LABEL = {
      'shown': '',
      'shown (deferred)': 'held until it was safe',
      'deferred': 'waiting',
      'coalesced': 'merged',
      'dropped': 'missed',
    };

    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const now = Date.now();
    const ago = (t) => {
      const s = Math.max(0, Math.round((now - t) / 1000));
      if (s < 60) return `${s}s ago`;
      const m = Math.round(s / 60);
      return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
    };

    const rows = entries.length === 0
      ? `<div style="color:#666;font-size:17px;padding:18px 0;text-align:center">Nothing has happened yet today.</div>`
      : entries.map(e => {
        const color = CLS_COLOR[e.cls] || '#aaa';
        const status = STATUS_LABEL[e.status] ?? e.status;
        return `<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
          <span style="flex:0 0 92px;color:${color};font-size:10px;font-family:'Press Start 2P',cursive;letter-spacing:0.03em;padding-top:4px">${CLS_LABEL[e.cls] || e.cls}</span>
          <span style="flex:1;color:#ddd;font-size:17px;line-height:1.25">${esc(e.text)}${e.count > 1 ? ` <span style="color:#ffd700">x${e.count}</span>` : ''}
            ${status ? `<div style="color:#777;font-size:14px">${status}</div>` : ''}</span>
          <span style="flex:0 0 62px;color:#555;font-size:14px;text-align:right;padding-top:3px">${ago(e.at)}</span>
        </div>`;
      }).join('');

    this.logOverlay = document.createElement('div');
    this.logOverlay.className = 'menu-log-overlay';
    this.logOverlay.style.cssText = `
      position: absolute; inset: 0; background: rgba(0,0,0,0.95);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 200; font-family: 'VT323', monospace; color: #fff;
    `;
    this.logOverlay.innerHTML = `
      <div style="font-family:'Press Start 2P',cursive;font-size:14px;color:#e94560;margin-bottom:12px">MESSAGE LOG</div>
      <div style="color:#aaa;font-size:16px;margin-bottom:16px">the last ${entries.length} notice${entries.length === 1 ? '' : 's'}, newest first</div>
      <div class="menu-log-rows" style="min-width:520px;max-width:680px;max-height:400px;overflow-y:auto;padding:0 16px">
        ${rows}
      </div>
      <div style="margin-top:16px;color:#888;font-size:15px">${entries.length > 6 ? '&#8593;&#8595; scroll &nbsp;·&nbsp; ' : ''}Enter / Esc to close</div>
    `;

    this.logOverlay.addEventListener('click', () => this._closeLog());
    document.getElementById('ui-overlay').appendChild(this.logOverlay);
    this._logRowsEl = this.logOverlay.querySelector('.menu-log-rows');
    // Without this a click aimed at the SCROLLBAR bubbles to the overlay's own
    // close handler, so the mouse path cannot scroll either.
    this._logRowsEl?.addEventListener('click', (e) => e.stopPropagation());
    if (this.element) this.element.style.display = 'none';
  }

  _closeLog() {
    if (this.logOverlay && this.logOverlay.parentNode) {
      this.logOverlay.parentNode.removeChild(this.logOverlay);
    }
    this.logOverlay = null;
    this._logRowsEl = null;
    if (this.element) this.element.style.display = '';
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
        ${(this.player.getFlag('pb_richest_client') || this.player.getFlag('pb_accept_streak')) ? `
        <div style="border-top:1px solid #1a2a3a;margin-top:14px;padding-top:10px">
          <div style="color:#53a8b6;font-size:14px;letter-spacing:1px;margin-bottom:6px">RECEPTION RECORDS</div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#8aa;font-size:16px">Richest Client Signed</span>
            <span style="color:#ffd700;font-size:16px">$${(this.player.getFlag('pb_richest_client') || 0).toLocaleString()}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            <span style="color:#8aa;font-size:16px">Best Single Commission</span>
            <span style="color:#ffd700;font-size:16px">${(this.player.getFlag('pb_best_aum_single') || 0).toLocaleString()} AUM</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            <span style="color:#8aa;font-size:16px">Longest Accept Streak</span>
            <span style="color:#ffd700;font-size:16px">${this.player.getFlag('pb_accept_streak') || 0}</span>
          </div>
        </div>` : ''}
        ${this.player.getFlag('daysWorked') ? `
        <div style="border-top:1px solid #1a2a3a;margin-top:14px;padding-top:10px">
          <div style="color:#53a8b6;font-size:14px;letter-spacing:1px;margin-bottom:6px">BILLABLE DAY RECORDS${this.player.getFlag('pb_perfect_day') ? ' <span style="color:#ffd700">★</span>' : ''}</div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:#8aa;font-size:16px">Days Closed</span>
            <span style="color:#ffd700;font-size:16px">${this.player.getFlag('daysWorked') || 0}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            <span style="color:#8aa;font-size:16px">Highest Daily AUM</span>
            <span style="color:#ffd700;font-size:16px">$${(this.player.getFlag('pb_best_day_aum') || 0).toLocaleString()}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            <span style="color:#8aa;font-size:16px">Largest Board Closed</span>
            <span style="color:#ffd700;font-size:16px">${this.player.getFlag('pb_longest_day') || 0}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px">
            <span style="color:#8aa;font-size:16px">Most Hours Earned</span>
            <span style="color:#ffd700;font-size:16px">${this.player.getFlag('pb_best_day_hours') || 0}</span>
          </div>
        </div>` : ''}
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
