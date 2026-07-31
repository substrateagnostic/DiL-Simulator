import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { SHOP_ITEMS, SHOP_CATEGORIES } from '../data/shop.js';
import {
  REVIEW_ITEMS, REVIEW_COPY, reviewPointsAvailable, reviewPointsEarned,
  ownsReviewItem, purchaseReviewItem, toggleReviewItem,
  STRETCH_GOALS, stretchUnlocked, stretchActive, unlockStretchGoal,
  toggleStretchGoal, activeChallengePoints, reviewLevel, unlockedMemos,
  recordedReviewLevel, pipResistance,
} from '../data/review.js';
import { AchievementManager } from '../core/AchievementManager.js';
import { EventBus } from '../core/EventBus.js';
import { SaveManager } from '../core/SaveManager.js';

/**
 * ShopState — Supply shop where players spend AUM.
 * Pushed over ExplorationState; popped on close.
 */
export class ShopState {
  constructor(stateManager, player) {
    this.stateManager = stateManager;
    this.player = player;
    this.root = null;
    this.selectedIndex = 0;
    this.currentCategory = 'consumable';
    this._items = [];
  }

  enter() {
    this._buildUI();
    this._render();
  }

  exit() {
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    if (window.__shopCat) delete window.__shopCat;
    if (window.__shopBuy) delete window.__shopBuy;
  }

  pause() { }
  resume() { this._render(); }

  update(_dt) {
    if (InputManager.isJustPressed('escape') || InputManager.isCancelPressed()) {
      AudioManager.playSfx('cancel');
      this.stateManager.pop();
      return;
    }
    if (InputManager.isJustPressed('arrowup') || InputManager.isJustPressed('w')) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this._render();
      AudioManager.playSfx('cursor');
    }
    if (InputManager.isJustPressed('arrowdown') || InputManager.isJustPressed('s')) {
      this.selectedIndex = Math.min(this._items.length - 1, this.selectedIndex + 1);
      this._render();
      AudioManager.playSfx('cursor');
    }
    if (InputManager.isJustPressed('arrowleft') || InputManager.isJustPressed('a')) {
      this._cycleCategory(-1);
    }
    if (InputManager.isJustPressed('arrowright') || InputManager.isJustPressed('d')) {
      this._cycleCategory(1);
    }
    if (InputManager.isConfirmPressed()) {
      this._purchase();
    }
  }

  _getAvailableCategories() {
    const all = Object.keys(SHOP_CATEGORIES);
    // Performance Review is a separate ledger (Review Points, not AUM) and
    // only shows once the player has earned at least one point — otherwise
    // it is an empty tab explaining a currency they do not have.
    const withReview = reviewPointsEarned() > 0 ? [...all, 'review'] : all;
    if (!this.player.getFlag('algorithm_defeated')) return withReview.filter(c => c !== 'renovation');
    return withReview;
  }

  _cycleCategory(dir) {
    const cats = this._getAvailableCategories();
    const idx = cats.indexOf(this.currentCategory);
    this.currentCategory = cats[(idx + dir + cats.length) % cats.length];
    this.selectedIndex = 0;
    this._render();
    AudioManager.playSfx('cursor');
  }

  _buildUI() {
    const ui = document.getElementById('ui-overlay');
    this.root = document.createElement('div');
    this.root.id = 'shop-overlay';
    this.root.style.cssText = `
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.85);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      z-index: 100; font-family: 'VT323', monospace; color: #fff;
    `;
    ui.appendChild(this.root);
  }

  _getFilteredItems() {
    // The Performance Review tab is one list of two kinds of row: the original
    // Review Point purchases, then the subtractive Stretch Goal ladder. They
    // share a ledger and a render path on purpose — the ladder IS the tab's
    // sink, and splitting them into two screens would hide the Review Level
    // from the place you spend to raise it.
    if (this.currentCategory === 'review') {
      return [
        ...REVIEW_ITEMS,
        ...STRETCH_GOALS.map(g => ({
          id: g.id, kind: 'stretch', cost: g.cost, cp: g.cp,
          name: g.name, description: g.desc,
        })),
      ];
    }
    return SHOP_ITEMS.filter(i => i.category === this.currentCategory);
  }

  _getPlayerStock(itemId) {
    const entry = this.player.inventory.find(e => e.id === itemId);
    return entry ? entry.quantity : 0;
  }

  // Upgrades cost more with each purchase: base × (1 + timesBought)
  _getEffectivePrice(item) {
    if (item.category !== 'upgrade') return item.price;
    const bought = this.player.getFlag(`shop_${item.id}`) || 0;
    return item.price * (1 + bought);
  }

  _render() {
    if (!this.root) return;
    this._items = this._getFilteredItems();
    const aum = this.player.stats.aum || 0;
    const cats = this._getAvailableCategories();

    const catTabs = cats.map(c => {
      const active = c === this.currentCategory;
      const label = c === 'review' ? REVIEW_COPY.title : SHOP_CATEGORIES[c];
      return `<span style="padding:4px 14px;border-radius:4px;cursor:pointer;
        background:${active ? 'rgba(233,69,96,0.3)' : 'transparent'};
        border:1px solid ${active ? '#e94560' : 'rgba(255,255,255,0.2)'};
        color:${active ? '#e94560' : '#aaa'};font-size:18px;"
        onclick="window.__shopCat('${c}')"
      >${label}</span>`;
    }).join('');

    if (this.currentCategory === 'review') {
      this._renderReview(catTabs);
      return;
    }

    const isRenovation = this.currentCategory === 'renovation';
    let rows = '';
    let lastArea = null;
    this._items.forEach((item, i) => {
      if (isRenovation && item.area && item.area !== lastArea) {
        lastArea = item.area;
        rows += `<div style="margin:10px 0 4px;padding:3px 8px;background:rgba(233,69,96,0.12);border-left:3px solid #e94560;font-family:'Press Start 2P',cursive;font-size:8px;color:#e94560;letter-spacing:1px">${item.area.toUpperCase()}</div>`;
      }

      const selected = i === this.selectedIndex;
      const stock = item.category === 'consumable' ? this._getPlayerStock(item.id)
        : item.category === 'upgrade' ? (this.player.getFlag(`shop_${item.id}`) || 0) : 0;
      const maxed = item.maxStack && stock >= item.maxStack;
      const decored = item.flag && this.player.getFlag(item.flag);
      const effectivePrice = this._getEffectivePrice(item);
      const canAfford = aum >= effectivePrice;
      const unavailable = maxed || decored;

      let statusText = '';
      if (decored) statusText = ' [owned]';
      else if (maxed) statusText = ` [max ${item.maxStack}]`;
      else if (item.category === 'consumable') statusText = ` (x${stock})`;
      else if (item.category === 'upgrade' && stock > 0) statusText = ` [${stock}/${item.maxStack}]`;

      rows += `<div style="
        display:flex; justify-content:space-between; align-items:center;
        padding:8px 16px; border-radius:4px; margin-bottom:4px;
        background:${selected ? 'rgba(233,69,96,0.2)' : 'transparent'};
        border:1px solid ${selected ? '#e94560' : 'transparent'};
        opacity:${unavailable ? '0.5' : '1'};
        cursor:${unavailable ? 'not-allowed' : 'pointer'};
        font-size:20px;
      " onclick="window.__shopBuy(${i})">
        <span>${item.name}${statusText}</span>
        <span style="color:${canAfford && !unavailable ? '#ffd700' : '#888'}">${effectivePrice.toLocaleString()} AUM</span>
      </div>`;
    });

    const selected = this._items[this.selectedIndex];
    const descHTML = selected ? `<div style="color:#aaa;font-size:16px;padding:8px 16px;border-top:1px solid rgba(255,255,255,0.1);max-width:400px;text-align:center">${selected.description}</div>` : '';

    this.root.innerHTML = `
      <div style="font-family:'Press Start 2P',cursive;font-size:16px;color:#e94560;margin-bottom:16px">Supply Shop</div>
      <div style="font-size:20px;color:#ffd700;margin-bottom:12px">AUM Balance: ${aum.toLocaleString()}</div>
      <div style="display:flex;gap:8px;margin-bottom:16px">${catTabs}</div>
      <div style="min-width:420px;max-width:500px;background:rgba(255,255,255,0.04);border:2px solid #e94560;border-radius:8px;padding:12px;max-height:300px;overflow-y:auto">
        ${rows || '<div style="color:#888;text-align:center;padding:16px">No items available</div>'}
      </div>
      ${descHTML}
      <div style="margin-top:16px;color:#888;font-size:16px">↑↓ Navigate · ←→ Category · Enter Buy · Esc Close</div>
    `;

    // Wire up click handlers via globals (simplest DOM approach)
    window.__shopCat = (cat) => { this.currentCategory = cat; this.selectedIndex = 0; this._render(); };
    window.__shopBuy = (idx) => { this.selectedIndex = idx; this._purchase(); };
  }

  // ── Performance Review (Review Points, src/data/review.js) ────────────
  // Separate ledger, separate render path: nothing here costs AUM, and the
  // toggle row is a switch rather than a purchase once it is owned.
  _renderReview(catTabs) {
    const available = reviewPointsAvailable();
    const earned = reviewPointsEarned();

    let rows = '';
    let stretchHeaderDone = false;
    this._items.forEach((item, i) => {
      const isStretch = item.kind === 'stretch';
      const owned = isStretch ? stretchUnlocked(item.id) : ownsReviewItem(item.id);
      const isToggle = item.kind === 'toggle' || isStretch;
      const toggledOn = owned && (isStretch
        ? stretchActive(this.player, item.id)
        : (item.kind === 'toggle' && !!this.player.getFlag(item.toggleFlag)));
      const selected = i === this.selectedIndex;
      const affordable = available >= item.cost;
      const spent = owned && !item.repeatable;

      let status = '';
      if (isToggle && owned) status = toggledOn ? ' [ACTIVE]' : ' [standby]';
      else if (spent) status = ` ${REVIEW_COPY.owned}`;
      if (isStretch) status += ` <span style="color:#8f8a80">+${item.cp} CP</span>`;

      const right = (owned && !item.repeatable)
        ? (isToggle ? (toggledOn ? 'DISABLE' : 'ENABLE') : '—')
        : `${item.cost} RP`;

      if (isStretch && !stretchHeaderDone) {
        stretchHeaderDone = true;
        rows += `<div style="font-family:'Press Start 2P',cursive;font-size:9px;color:#e9a045;
          letter-spacing:1px;margin:12px 0 6px;padding-left:16px">${REVIEW_COPY.stretchTab.toUpperCase()}</div>`;
      }

      rows += `<div style="
        display:flex; justify-content:space-between; align-items:center;
        padding:8px 16px; border-radius:4px; margin-bottom:4px;
        background:${selected ? 'rgba(233,69,96,0.2)' : 'transparent'};
        border:1px solid ${selected ? '#e94560' : 'transparent'};
        opacity:${(spent && !isToggle) ? '0.55' : '1'};
        cursor:pointer; font-size:20px;
      " onclick="window.__shopBuy(${i})">
        <span>${item.name}${status}</span>
        <span style="color:${(owned || affordable) ? '#53a8b6' : '#888'}">${right}</span>
      </div>`;
    });

    const selected = this._items[this.selectedIndex];
    const descHTML = selected
      ? `<div style="color:#aaa;font-size:16px;padding:8px 16px;border-top:1px solid rgba(255,255,255,0.1);max-width:440px;text-align:center">${selected.description}</div>`
      : '';

    const cp = activeChallengePoints(this.player);
    const level = reviewLevel(this.player);
    const recorded = recordedReviewLevel(this.player);
    const memos = unlockedMemos(this.player);
    // The active level is a declaration; the recorded one is the receipt. Show
    // both, and say out loud what closes the gap.
    const pendingHTML = level > recorded ? `
      <div style="font-size:16px;color:#e9a045;margin-bottom:6px;max-width:460px;text-align:center">
        ${REVIEW_COPY.levelPending.replace('{active}', level).replace('{recorded}', recorded)}
      </div>` : '';
    const pipPct = Math.round(pipResistance(this.player) * 100);
    const pipHTML = pipPct > 0 ? `
      <div style="font-size:16px;color:#53a8b6;margin-bottom:6px">
        Performance Improvement Plan active — ${pipPct}% damage mitigation on file
      </div>` : '';
    const memosHTML = memos.length === 0 ? '' : `
      <div style="margin-top:10px;min-width:440px;max-width:520px;max-height:120px;overflow-y:auto;
                  border-top:1px solid rgba(255,255,255,0.12);padding-top:8px">
        <div style="font-family:'Press Start 2P',cursive;font-size:9px;color:#8f8a80;
                    letter-spacing:1px;margin-bottom:6px">${REVIEW_COPY.memoHeader}</div>
        ${memos.map(m => `
          <div style="margin-bottom:8px">
            <div style="font-size:17px;color:#d8d4cc">${m.subject}</div>
            <div style="font-size:15px;color:#8f8a80;line-height:1.35">${m.body}</div>
          </div>`).join('')}
      </div>`;

    this.root.innerHTML = `
      <div style="font-family:'Press Start 2P',cursive;font-size:16px;color:#e94560;margin-bottom:16px">${REVIEW_COPY.title}</div>
      <div style="font-size:20px;color:#53a8b6;margin-bottom:4px">Review Points: ${available} available &nbsp;·&nbsp; ${earned} earned</div>
      <div style="font-size:20px;color:#e9a045;margin-bottom:6px">Review Level ${level} active &nbsp;·&nbsp; ${recorded} on file &nbsp;·&nbsp; ${cp} CP</div>
      ${pendingHTML}
      ${pipHTML}
      <div style="font-size:16px;color:#8f8a80;margin-bottom:4px;max-width:460px;text-align:center">${REVIEW_COPY.ladderBlurb}</div>
      <div style="font-size:15px;color:#6f6a63;margin-bottom:12px;max-width:460px;text-align:center">${REVIEW_COPY.ladderEarn}</div>
      <div style="display:flex;gap:8px;margin-bottom:16px">${catTabs}</div>
      <div style="min-width:440px;max-width:520px;background:rgba(255,255,255,0.04);border:2px solid #53a8b6;border-radius:8px;padding:12px;max-height:260px;overflow-y:auto">
        ${rows}
      </div>
      ${descHTML}
      ${memosHTML}
      <div style="margin-top:16px;color:#888;font-size:16px">↑↓ Navigate · ←→ Category · Enter Select · Esc Close</div>
    `;

    window.__shopCat = (cat) => { this.currentCategory = cat; this.selectedIndex = 0; this._render(); };
    window.__shopBuy = (idx) => { this.selectedIndex = idx; this._purchase(); };
  }

  _purchaseReview() {
    const item = this._items[this.selectedIndex];
    if (!item) return;

    // Stretch goals: buy the unlock once, then it is a free switch forever.
    // Toggling changes the ACTIVE Review Level and nothing else — the
    // high-water that unlocks Meredith's memos is written in the combat
    // victory path (CombatState._handleResult), because Kaycee's Mod pays for
    // winning at Challenge Level N, not for selecting it from a menu.
    if (item.kind === 'stretch') {
      if (!stretchUnlocked(item.id)) {
        const res = unlockStretchGoal(item.id);
        if (!res.ok) {
          this._flash(res.reason === 'broke' ? REVIEW_COPY.broke : 'Unavailable.', '#e94560');
          AudioManager.playSfx('cancel');
          return;
        }
        AudioManager.playSfx('confirm');
        this._flash(`${item.name} added to your development plan.`, '#53a8b6');
        this._render();
        return;
      }
      const on = toggleStretchGoal(this.player, item.id);
      AudioManager.playSfx('confirm');
      this._flash(
        on ? `${item.name} accepted.` : `${item.name} withdrawn.`,
        on ? '#e9a045' : '#53a8b6',
      );
      SaveManager.save(this.player.serialize());
      this._render();
      return;
    }

    const owned = ownsReviewItem(item.id);

    // Owned toggle → flip it rather than charging again.
    if (item.kind === 'toggle' && owned) {
      const on = toggleReviewItem(this.player, item.id);
      AudioManager.playSfx('confirm');
      const copy = item.id === 'rp_pip'
        ? (on ? REVIEW_COPY.pipOn : REVIEW_COPY.pipOff)
        : (on ? REVIEW_COPY.toggleOn : REVIEW_COPY.toggleOff);
      this._flash(copy, on ? '#e9a045' : '#53a8b6');
      SaveManager.save(this.player.serialize());
      this._render();
      return;
    }
    if (owned && !item.repeatable) {
      this._flash('Already on file.', '#888');
      return;
    }

    const res = purchaseReviewItem(item.id, this.player);
    if (!res.ok) {
      this._flash(res.reason === 'broke' ? REVIEW_COPY.broke : 'Unavailable.', '#e94560');
      AudioManager.playSfx('cancel');
      return;
    }
    AudioManager.playSfx('confirm');
    this._flash(`${item.name} approved.`, '#53a8b6');
    // Cosmetic unlocks change the equip list, not the mesh — no rebuild needed
    // until the player equips it from the Cosmetics tab.
    SaveManager.save(this.player.serialize());
    this._render();
  }

  _purchase() {
    if (this.currentCategory === 'review') { this._purchaseReview(); return; }

    const item = this._items[this.selectedIndex];
    if (!item) return;

    const aum = this.player.stats.aum || 0;
    const effectivePrice = this._getEffectivePrice(item);
    if (aum < effectivePrice) {
      this._flash('Not enough AUM!', '#e94560');
      AudioManager.playSfx('cancel');
      return;
    }

    // Check if already owned / maxed
    if (item.flag && this.player.getFlag(item.flag)) {
      this._flash('Already owned!', '#e94560');
      return;
    }
    if (item.maxStack) {
      const stock = item.category === 'consumable' ? this._getPlayerStock(item.id)
        : item.category === 'upgrade' ? (this.player.getFlag(`shop_${item.id}`) || 0) : 0;
      if (stock >= item.maxStack) {
        this._flash(`Max stack reached (${item.maxStack})`, '#e94560');
        return;
      }
    }

    // Deduct AUM
    this.player.stats.aum = aum - effectivePrice;
    AudioManager.playSfx('confirm');

    // Apply purchase
    if (item.category === 'consumable') {
      this.player.addItem(item.id, 1);
      this._flash(`Purchased ${item.name}!`, '#44ff88');
    } else if (item.category === 'upgrade') {
      if (item.statBoost) {
        for (const [stat, val] of Object.entries(item.statBoost)) {
          this.player.stats[stat] = (this.player.stats[stat] || 0) + val;
          // Also bump current HP/MP if maxHP/maxMP increased
          if (stat === 'maxHP') this.player.stats.hp = Math.min(this.player.stats.hp + val, this.player.stats.maxHP);
          if (stat === 'maxMP') this.player.stats.mp = Math.min(this.player.stats.mp + val, this.player.stats.maxMP);
        }
      }
      // Track purchase count for max stack
      const countKey = `shop_${item.id}`;
      this.player.setFlag(countKey, (this.player.getFlag(countKey) || 0) + 1);
      this._flash(`${item.name} applied!`, '#ffd700');
    } else if (item.category === 'decor') {
      this.player.setFlag(item.flag, true);
      this._flash(`${item.name} installed!`, '#88aaff');
    } else if (item.category === 'renovation') {
      this.player.setFlag(item.flag, true);
      this.player.gainXP(2000);
      this._flash(`${item.name} complete! +2000 XP`, '#ffd700');
      EventBus.emit('renovation-purchased');
    }

    this.player.setFlag(`bought_category_${item.category}`, true);
    SaveManager.save(this.player.serialize());
    AchievementManager.check(this.player, { event: 'shop_purchase' });
    this._render();
  }

  _flash(text, color) {
    if (!this.root) return;
    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute; top:40%; left:50%; transform:translateX(-50%);
      font-family:'Press Start 2P',cursive; font-size:14px; color:${color};
      text-shadow: 1px 1px 4px rgba(0,0,0,0.8);
      pointer-events:none; z-index:10;
    `;
    el.textContent = text;
    this.root.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1200);
  }
}
