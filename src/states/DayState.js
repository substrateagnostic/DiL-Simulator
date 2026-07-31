// THE BILLABLE DAY — reception board, between-client boon shop, and 5:15 summary.
//
// One DOM state with three modes so the day reads as one continuous screen
// rather than three unrelated popups:
//   'board'   — start the day, take a walk-in, or resume an in-progress day
//   'between' — spend Billable Hours between clients
//   'summary' — the 5:15 bell: what banked, what evaporated
//
// The state owns no game rules. It reads the day record, calls purchaseBoon()
// for spending, and reports a single action string back through onResult().
// ExplorationState owns the day lifecycle.

import { AudioManager } from '../core/AudioManager.js';
import { ITEMS } from '../data/stats.js';
import {
  DAY_BOONS,
  DAY_TEXT,
  boonState,
  hoursAvailable,
  purchaseBoon,
  writeDay,
} from '../data/billableDay.js';

const fmt = (n) => '$' + Number(n || 0).toLocaleString();

export class DayState {
  /**
   * @param {object} opts
   *   mode       'board' | 'between' | 'summary'
   *   day        the day record (null in 'board' when no day is running)
   *   nextClient the client waiting in the next slot (between mode)
   *   summary    { aumBanked, xpGained, pbHits: [] } (summary mode)
   *   dianeLine  a pre-resolved Diane line to print at the top
   *   onReroll   () => client — regenerates the next client (Reschedule boon).
   *              The owner of client generation stays ExplorationState.
   *   onResult   (action) => void — 'start_day' | 'walk_in' | 'resume'
   *              | 'cancel' | 'continue' | 'abandon' | 'clock_out'
   */
  constructor(stateManager, player, opts = {}) {
    this.stateManager = stateManager;
    this.player = player;
    this.mode = opts.mode || 'board';
    this.day = opts.day || null;
    this.nextClient = opts.nextClient || null;
    this.summary = opts.summary || null;
    this.dianeLine = opts.dianeLine || '';
    // A second, louder Diane line. Used for the solo-day warning: the player is
    // about to stake a five-client escrow with nobody backing them up, and the
    // board is the last screen before that decision is irreversible.
    this.dianeWarning = opts.dianeWarning || '';
    this.onReroll = opts.onReroll || null;
    this.onResult = opts.onResult || (() => {});
    this._el = null;
    this._keyHandler = null;
    this._focusIndex = 0;
    this._rows = [];       // [{ kind: 'boon'|'action', id, el }]
    this._toastTimer = null;
  }

  enter() { this._render(); }

  exit() {
    if (this._toastTimer) clearTimeout(this._toastTimer);
    if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
  }

  pause() {}
  resume() {}
  update() {}

  // ── Rendering ─────────────────────────────────────────────────────────

  _render() {
    const overlay = document.getElementById('ui-overlay');
    const el = document.createElement('div');
    el.className = 'cr-overlay';
    el.innerHTML = `<div class="cr-panel day-panel">${this._panelHTML()}</div>`;
    overlay.appendChild(el);
    this._el = el;

    this._bindRows();

    this._keyHandler = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        this._move(-1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        this._move(1);
      } else if (e.key === 'Enter' || e.key === 'e' || e.key === 'E') {
        this._activate(this._focusIndex);
      } else if (e.key === 'Escape') {
        this._escape();
      }
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  _panelHTML() {
    if (this.mode === 'between') return this._betweenHTML();
    if (this.mode === 'summary') return this._summaryHTML();
    return this._boardHTML();
  }

  _header(title, subtitle) {
    return `
      <div class="cr-header">
        <div class="cr-title">${title}</div>
        <div class="cr-subtitle">${subtitle}</div>
      </div>`;
  }

  _dianeHTML() {
    const warn = this.dianeWarning
      ? `<div class="day-diane day-diane-warning">Diane: "${this.dianeWarning}"</div>`
      : '';
    if (!this.dianeLine) return warn;
    return `<div class="day-diane">Diane: "${this.dianeLine}"</div>${warn}`;
  }

  // ── Board mode ────────────────────────────────────────────────────────

  _boardHTML() {
    const T = DAY_TEXT.ui;
    const resuming = !!this.day;
    const left = resuming ? Math.max(0, this.day.total - this.day.served) : 0;

    const rows = resuming
      ? [
          { id: 'resume', label: `Return to the Board (${left} left)`, hint: `${this.day.hours} Hours banked · ${fmt(this.day.aumPending)} pending` },
          { id: 'abandon', label: 'Walk Off the Board', hint: T.forfeit_warning, danger: true },
        ]
      : [
          { id: 'start_day', label: 'Start the Day', hint: '3-5 clients, back to back. Billing posts at 5:15.', featured: true },
          { id: 'walk_in', label: 'Take a Walk-in', hint: 'One client. Banks immediately. No Hours.' },
          { id: 'cancel', label: 'Never Mind', hint: '' },
        ];

    return `
      ${this._header(DAY_TEXT.ui.board_title, DAY_TEXT.ui.board_subtitle)}
      <div class="cr-body">
        ${this._dianeHTML()}
        <div class="day-rows">${rows.map((r, i) => this._actionRowHTML(r, i)).join('')}</div>
      </div>
      <div class="cr-hint">Up / Down to select · Enter to confirm · Esc to close</div>
    `;
  }

  _actionRowHTML(r, i) {
    const cls = ['day-row', 'day-row-action'];
    if (r.featured) cls.push('day-row-featured');
    if (r.danger) cls.push('day-row-danger');
    if (i === 0) cls.push('day-row-focused');
    return `
      <div class="${cls.join(' ')}" data-kind="action" data-id="${r.id}">
        <div class="day-row-main">
          <span class="day-row-label">${r.label}</span>
        </div>
        ${r.hint ? `<div class="day-row-hint">${r.hint}</div>` : ''}
      </div>`;
  }

  // ── Between mode ──────────────────────────────────────────────────────

  _betweenHTML() {
    const d = this.day;
    const T = DAY_TEXT.ui;
    const hours = hoursAvailable(d);

    const lastParts = (d.lastHoursParts || [])
      .map(p => `<span class="day-part">${p.label} +${p.value}</span>`)
      .join('');

    const boonRows = DAY_BOONS.map((b, i) => {
      const st = boonState(d, b);
      const cls = ['day-row', 'day-row-boon'];
      if (st !== 'ok') cls.push('day-row-locked');
      if (i === 0) cls.push('day-row-focused');
      const tag = st === 'bought' ? T.boon_sold_out
        : st === 'poor' ? T.cannot_afford
        : st === 'unavailable' ? 'N/A'
        : `${b.cost} h`;
      return `
        <div class="${cls.join(' ')}" data-kind="boon" data-id="${b.id}">
          <div class="day-row-main">
            <span class="day-row-label">${b.name}</span>
            <span class="day-row-cost">${tag}</span>
          </div>
          <div class="day-row-hint">${b.desc}</div>
        </div>`;
    }).join('');

    return `
      ${this._header(T.between_title, T.between_subtitle)}
      <div class="cr-body">
        ${this._dianeHTML()}
        <div class="day-ledger">
          <div class="day-ledger-row">
            <span class="cr-fin-label">Cleared</span>
            <span class="cr-fin-value">${d.served} of ${d.total}</span>
          </div>
          <div class="day-ledger-row">
            <span class="cr-fin-label">Hours available</span>
            <span class="cr-fin-value cr-gold" id="day-hours">${hours}</span>
          </div>
          <div class="day-ledger-row">
            <span class="cr-fin-label">Billing in escrow</span>
            <span class="cr-fin-value cr-gold">${fmt(d.aumPending)}</span>
          </div>
        </div>
        ${d.lastHours ? `<div class="day-earned">Last meeting billed <b>${d.lastHours}</b> hours ${lastParts}</div>` : ''}
        ${this._nextClientHTML()}
        <div class="day-rows">${boonRows}</div>
        <div class="day-rows">${this._actionRowHTML({ id: 'continue', label: 'Next Client', hint: '' }, -1)}</div>
      </div>
      <div class="cr-hint">Up / Down to select · Enter to buy or continue · Esc to continue</div>
    `;
  }

  _nextClientHTML() {
    const c = this.nextClient;
    if (!c) return '';
    const d = this.day;
    const badges = (c.mutators || [])
      .filter(m => m.subtractive)
      .map(m => `<span class="day-badge">${m.label}</span>`)
      .join('');

    if (!d.revealNext) {
      return `
        <div class="day-next">
          <div class="day-next-title">NEXT ON THE BOARD</div>
          <div class="day-next-name">${c.name}</div>
          <div class="day-next-type">${c.type}${c.isClosing ? ' · Close of Business' : ''}</div>
          ${badges ? `<div class="day-badges">${badges}</div>` : ''}
        </div>`;
    }

    const es = c.enemyStats || {};
    return `
      <div class="day-next day-next-open">
        <div class="day-next-title">NEXT ON THE BOARD — FILE OPEN</div>
        <div class="day-next-name">${c.name}</div>
        <div class="day-next-type">${c.type}${c.isClosing ? ' · Close of Business' : ''}</div>
        <div class="day-next-stats">
          <span>Assets ${fmt(c.assets)}</span>
          <span>Patience ${es.maxHP}</span>
          <span>Assert ${es.atk}</span>
          <span>Compos ${es.def}</span>
        </div>
        ${badges ? `<div class="day-badges">${badges}</div>` : '<div class="day-badges day-badges-clear">No restrictions on file.</div>'}
      </div>`;
  }

  // ── Summary mode ──────────────────────────────────────────────────────

  _summaryHTML() {
    const T = DAY_TEXT.ui;
    const s = this.summary || {};
    const d = this.day || {};
    const pbHTML = (s.pbHits || []).length
      ? `<div class="day-pb">${s.pbHits.map(p => `<div class="day-pb-row">★ ${p}</div>`).join('')}</div>`
      : '';

    // Closing premium. Shown as a line-item breakdown rather than folded
    // silently into the banked figure — a risk premium the player cannot see
    // is the same as no risk premium at all.
    const prem = s.premium;
    const premiumHTML = (prem && prem.multiplier > 1) ? `
          <div class="cr-fin-row">
            <span class="cr-fin-label">${T.premium_escrow}</span>
            <span class="cr-fin-value">${fmt(s.escrow || 0)}</span>
          </div>
          ${(prem.parts || []).map(p => `
          <div class="cr-fin-row day-fin-sub">
            <span class="cr-fin-label">${p.label}${p.detail ? ` <span class="day-fin-detail">(${p.detail})</span>` : ''}</span>
            <span class="cr-fin-value cr-gold">+${Math.round(p.value * 100)}%</span>
          </div>`).join('')}
          <div class="cr-fin-row">
            <span class="cr-fin-label">${T.premium_multiplier}</span>
            <span class="cr-fin-value cr-gold">${prem.multiplier.toFixed(2)}x</span>
          </div>` : '';

    return `
      ${this._header(T.summary_title, T.summary_subtitle)}
      <div class="cr-body">
        ${this._dianeHTML()}
        <div class="cr-financials">
          <div class="cr-fin-row">
            <span class="cr-fin-label">Clients seen</span>
            <span class="cr-fin-value">${d.served || 0} of ${d.total || 0}</span>
          </div>
          <div class="cr-fin-row">
            <span class="cr-fin-label">Signed</span>
            <span class="cr-fin-value">${d.signed || 0}</span>
          </div>
          ${premiumHTML}
          <div class="cr-fin-row">
            <span class="cr-fin-label">AUM banked</span>
            <span class="cr-fin-value cr-gold">${fmt(s.aumBanked || 0)}</span>
          </div>
          <div class="cr-fin-row">
            <span class="cr-fin-label">XP earned today</span>
            <span class="cr-fin-value">${s.xpGained || 0}</span>
          </div>
          <div class="cr-fin-row">
            <span class="cr-fin-label">Hours billed / unbilled</span>
            <span class="cr-fin-value">${d.hoursSpent || 0} / ${d.hours || 0}</span>
          </div>
        </div>
        ${pbHTML}
      </div>
      <div class="cr-footer">
        <div class="day-row day-row-action day-row-featured day-row-focused" data-kind="action" data-id="clock_out">
          <div class="day-row-main"><span class="day-row-label">Clock Out</span></div>
        </div>
      </div>
      <div class="cr-hint">Enter to continue</div>
    `;
  }

  // ── Interaction ───────────────────────────────────────────────────────

  _bindRows() {
    this._rows = [...this._el.querySelectorAll('.day-row')].map(el => ({
      kind: el.dataset.kind,
      id: el.dataset.id,
      el,
    }));
    this._focusIndex = 0;
    this._rows.forEach((r, i) => {
      r.el.classList.toggle('day-row-focused', i === 0);
      r.el.addEventListener('click', () => this._activate(i));
    });
  }

  _move(delta) {
    if (this._rows.length === 0) return;
    const n = this._rows.length;
    this._focusIndex = (this._focusIndex + delta + n) % n;
    this._focusRows();
    AudioManager.playSfx('cursor');
  }

  // The between-clients panel is taller than the viewport on a short window
  // (six boons + the next-client card), so the focused row has to be scrolled
  // into the scrollable .cr-panel or keyboard players lose the cursor.
  _focusRows() {
    this._rows.forEach((r, i) => r.el.classList.toggle('day-row-focused', i === this._focusIndex));
    const el = this._rows[this._focusIndex]?.el;
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  _activate(i) {
    const row = this._rows[i];
    if (!row) return;
    this._focusIndex = i;
    if (row.kind === 'boon') {
      this._buy(row.id);
      return;
    }
    AudioManager.playSfx('confirm');
    this._finish(row.id);
  }

  _escape() {
    if (this.mode === 'between') this._finish('continue');
    else if (this.mode === 'summary') this._finish('clock_out');
    else this._finish('cancel');
  }

  _buy(boonId) {
    const res = purchaseBoon(this.player, this.day, boonId, {
      itemName: (id) => ITEMS[id]?.name || id,
    });
    if (!res.ok) {
      AudioManager.playSfx('cancel');
      this._flash(res.message);
      return;
    }
    AudioManager.playSfx('confirm');

    // Reschedule swaps the appointment there and then, so the card the player
    // is looking at is the client they will actually meet. The reveal flag is
    // deliberately NOT consumed — paying for a peek and then rescheduling
    // shows you the replacement's file too.
    if (boonId === 'reschedule' && this.onReroll) {
      const fresh = this.onReroll();
      if (fresh) this.nextClient = fresh;
    }

    writeDay(this.player, this.day);
    this._flash(res.message);
    this._refreshBetween();
  }

  // Re-render the between panel in place so costs, locks and the revealed
  // client file all update after a purchase.
  _refreshBetween() {
    if (this.mode !== 'between') return;
    const keep = this._focusIndex;
    const panel = this._el.querySelector('.day-panel');
    const scrollTop = panel?.scrollTop || 0;
    panel.innerHTML = this._betweenHTML();
    this._bindRows();
    this._focusIndex = Math.max(0, Math.min(keep, this._rows.length - 1));
    this._focusRows();
    if (panel) panel.scrollTop = scrollTop;
  }

  _flash(text) {
    let toast = this._el.querySelector('.day-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'day-toast';
      this._el.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add('day-toast-on');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('day-toast-on'), 2200);
  }

  _finish(action) {
    this.stateManager.pop();
    this.onResult(action);
  }
}
