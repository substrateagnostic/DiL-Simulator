import { NotificationArbiter } from '../core/NotificationArbiter.js';
// DOM UI state shown after defeating a reception client — accept or decline

import { readDay } from '../data/billableDay.js';

export class ClientReviewState {
  constructor(stateManager, player, clientData, onDecision) {
    this.stateManager = stateManager;
    this.player = player;
    this.clientData = clientData;
    this.onDecision = onDecision;
    this._el = null;
    this._keyHandler = null;
    this._focusIndex = 0; // 0 = Accept, 1 = Decline
  }

  enter() {
    // A modal owns the whole screen. Suspend the world scope so a queued
    // objective / achievement / autosave card cannot float over it; it comes
    // back the moment we pop (DEFER, DON'T DESTROY).
    NotificationArbiter.suspendScope('world');
    this._render();
  }

  exit() {
    NotificationArbiter.resumeScope('world');
    if (this._el && this._el.parentNode) {
      this._el.parentNode.removeChild(this._el);
    }
    if (this._keyHandler) {
      window.removeEventListener('keydown', this._keyHandler);
    }
  }

  pause() {}
  resume() {}
  update() {}

  _render() {
    const overlay = document.getElementById('ui-overlay');
    const c = this.clientData;
    const anger = this.player.getFlag('bossAnger') || 0;

    const fmtDollars = (n) => '$' + n.toLocaleString();
    const fmtPct = (r) => (r * 100).toFixed(1) + '%';
    const negotiateChancePct = Math.round(this._negotiateChance() * 100);
    const angerBar = '█'.repeat(Math.min(10, anger)) + '░'.repeat(Math.max(0, 10 - anger));
    const deltaStr = c.netAngerDelta > 0 ? `+${c.netAngerDelta}` : `${c.netAngerDelta}`;
    const deltaCls = c.netAngerDelta > 0 ? 'delta-bad' : c.netAngerDelta < 0 ? 'delta-good' : 'delta-neutral';

    const attrsHtml = c.attributes.map(attr => {
      const effectStr = _attrEffectStr(attr);
      return `
        <div class="cr-attr ${attr.positive ? 'cr-attr-pos' : 'cr-attr-neg'}">
          <div class="cr-attr-header">
            <span class="cr-attr-icon">${attr.positive ? '▲' : '▼'}</span>
            <span class="cr-attr-label">${attr.label}</span>
            <span class="cr-attr-effect">${effectStr}</span>
          </div>
          <div class="cr-attr-desc">${attr.desc}</div>
        </div>
      `;
    }).join('');

    // ── Billable Day framing ──────────────────────────────────────────────
    // Inside a day the review is a slot on the board, the AUM goes to escrow
    // rather than the bank, and any restriction the client carried is named
    // here so a hard fight is legible after the fact, not just during it.
    const day = readDay(this.player);
    const dayBanner = day ? `
      <div class="cr-day-banner">
        <span class="cr-day-slot">CLIENT ${Math.min(day.index + 1, day.total)} OF ${day.total}${c.isClosing ? ' · CLOSE OF BUSINESS' : ''}</span>
        ${day.lastHours ? `<span class="cr-day-hours">+${day.lastHours} Billable Hours</span>` : ''}
        <span class="cr-day-escrow">Escrow ${fmtDollars(day.aumPending)}</span>
      </div>` : '';

    const subMutators = (c.mutators || []).filter(m => m.subtractive);
    const mutatorHtml = subMutators.length ? `
      <div class="cr-day-mutators">
        ${subMutators.map(m => `<span class="day-badge" title="${m.desc}">${m.label}</span>`).join('')}
      </div>` : '';

    const el = document.createElement('div');
    el.className = 'cr-overlay';
    el.innerHTML = `
      <div class="cr-panel">
        <div class="cr-header">
          <div class="cr-title">CLIENT REVIEW</div>
          <div class="cr-subtitle">Prospect Evaluation Required</div>
        </div>

        <div class="cr-body">
          ${dayBanner}
          <div class="cr-name-block">
            <div class="cr-client-name">${c.name}</div>
            <div class="cr-client-type">${c.type}</div>
            ${mutatorHtml}
          </div>

          <div class="cr-financials">
            <div class="cr-fin-row">
              <span class="cr-fin-label">Total Assets</span>
              <span class="cr-fin-value cr-gold">${fmtDollars(c.assets)}</span>
            </div>
            <div class="cr-fin-row">
              <span class="cr-fin-label">Advisory Fee</span>
              <span class="cr-fin-value">${fmtPct(c.feeRate)}/yr</span>
            </div>
            <div class="cr-fin-row">
              <span class="cr-fin-label">Est. Annual Fees</span>
              <span class="cr-fin-value cr-gold">${fmtDollars(c.annualFees)}</span>
            </div>
            <div class="cr-fin-row">
              <span class="cr-fin-label">Risk Profile</span>
              <span class="cr-fin-value">${c.riskProfile}</span>
            </div>
          </div>

          <div class="cr-attrs-section">
            <div class="cr-attrs-title">CLIENT ATTRIBUTES</div>
            ${attrsHtml}
          </div>

          <div class="cr-anger-block">
            <span class="cr-anger-label">Boss Anger</span>
            <span class="cr-anger-bar">${angerBar}</span>
            <span class="cr-anger-val">${anger}/10</span>
            <span class="cr-anger-delta ${deltaCls}">(${deltaStr} if accepted)</span>
          </div>
        </div>

        <div class="cr-footer">
          <button class="cr-btn cr-accept cr-focused" id="cr-accept">
            <span class="cr-btn-key">←</span> Accept
          </button>
          <button class="cr-btn cr-negotiate" id="cr-negotiate" style="border-color:#daa520;color:#daa520">
            Negotiate (${negotiateChancePct}%)
          </button>
          <button class="cr-btn cr-decline" id="cr-decline">
            Decline <span class="cr-btn-key">→</span>
          </button>
        </div>
        <div class="cr-hint">${day
          ? 'Arrow Keys to select · Enter to confirm · Fees are held in escrow until the day closes at 5:15'
          : 'Arrow Keys to select · Enter to confirm · Negotiate: +50% fees or the boss hears about it'}</div>
      </div>
    `;

    overlay.appendChild(el);
    this._el = el;

    const buttons = [
      el.querySelector('#cr-accept'),
      el.querySelector('#cr-negotiate'),
      el.querySelector('#cr-decline'),
    ];
    const focusBtn = (i) => {
      this._focusIndex = i;
      buttons.forEach((b, j) => b.classList.toggle('cr-focused', j === i));
    };

    this._keyHandler = (e) => {
      if (e.key === 'ArrowLeft') {
        focusBtn(Math.max(0, this._focusIndex - 1));
      } else if (e.key === 'ArrowRight') {
        focusBtn(Math.min(buttons.length - 1, this._focusIndex + 1));
      } else if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        this._confirm();
      } else if (e.key === 'Escape') {
        this._decide(false);
      }
    };

    window.addEventListener('keydown', this._keyHandler);
    buttons[0].addEventListener('click', () => this._decide(true));
    buttons[1].addEventListener('click', () => this._negotiate());
    buttons[2].addEventListener('click', () => this._decide(false));
  }

  _confirm() {
    if (this._focusIndex === 0) this._decide(true);
    else if (this._focusIndex === 1) this._negotiate();
    else this._decide(false);
  }

  // Push for premium fees. Assertiveness-scaled coin flip:
  // win — accept at 1.5x AUM; lose — accept at 0.75x and +1 extra boss anger.
  _negotiate() {
    const chance = this._negotiateChance();
    const success = Math.random() < chance;
    this.stateManager.pop();
    this.onDecision(true, { negotiated: true, success });
  }

  _negotiateChance() {
    const atk = this.player.getCombatStats?.().atk ?? this.player.stats.atk ?? 12;
    return Math.min(0.85, 0.40 + atk * 0.01);
  }

  _decide(accepted) {
    this.stateManager.pop();
    this.onDecision(accepted);
  }
}

function _attrEffectStr(attr) {
  const statNames = { atk: 'Assert', def: 'Compos', spd: 'Effic' };
  const changes = attr.buff || attr.debuff;
  if (!changes) return '';
  return Object.entries(changes)
    .map(([k, v]) => `${statNames[k] || k} ${v > 0 ? '+' : ''}${v}`)
    .join(' ');
}
