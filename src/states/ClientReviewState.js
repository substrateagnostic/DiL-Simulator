// DOM UI state shown after defeating a reception client — accept or decline

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
    this._render();
  }

  exit() {
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

    const el = document.createElement('div');
    el.className = 'cr-overlay';
    el.innerHTML = `
      <div class="cr-panel">
        <div class="cr-header">
          <div class="cr-title">CLIENT REVIEW</div>
          <div class="cr-subtitle">Prospect Evaluation Required</div>
        </div>

        <div class="cr-body">
          <div class="cr-name-block">
            <div class="cr-client-name">${c.name}</div>
            <div class="cr-client-type">${c.type}</div>
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
          <button class="cr-btn cr-decline" id="cr-decline">
            Decline <span class="cr-btn-key">→</span>
          </button>
        </div>
        <div class="cr-hint">Arrow Keys to select · Enter to confirm</div>
      </div>
    `;

    overlay.appendChild(el);
    this._el = el;

    const acceptBtn = el.querySelector('#cr-accept');
    const declineBtn = el.querySelector('#cr-decline');

    this._keyHandler = (e) => {
      if (e.key === 'ArrowLeft') {
        this._focusIndex = 0;
        acceptBtn.classList.add('cr-focused');
        declineBtn.classList.remove('cr-focused');
      } else if (e.key === 'ArrowRight') {
        this._focusIndex = 1;
        declineBtn.classList.add('cr-focused');
        acceptBtn.classList.remove('cr-focused');
      } else if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        this._decide(this._focusIndex === 0);
      } else if (e.key === 'Escape') {
        this._decide(false);
      }
    };

    window.addEventListener('keydown', this._keyHandler);
    acceptBtn.addEventListener('click', () => this._decide(true));
    declineBtn.addEventListener('click', () => this._decide(false));
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
