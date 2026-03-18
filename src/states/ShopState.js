import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { SHOP_ITEMS, SHOP_CATEGORIES } from '../data/shop.js';
import { AchievementManager } from '../core/AchievementManager.js';

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

  _cycleCategory(dir) {
    const cats = Object.keys(SHOP_CATEGORIES);
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
    return SHOP_ITEMS.filter(i => i.category === this.currentCategory);
  }

  _getPlayerStock(itemId) {
    const entry = this.player.inventory.find(e => e.id === itemId);
    return entry ? entry.quantity : 0;
  }

  _render() {
    if (!this.root) return;
    this._items = this._getFilteredItems();
    const aum = this.player.stats.aum || 0;
    const cats = Object.keys(SHOP_CATEGORIES);

    const catTabs = cats.map(c => {
      const active = c === this.currentCategory;
      return `<span style="padding:4px 14px;border-radius:4px;cursor:pointer;
        background:${active ? 'rgba(233,69,96,0.3)' : 'transparent'};
        border:1px solid ${active ? '#e94560' : 'rgba(255,255,255,0.2)'};
        color:${active ? '#e94560' : '#aaa'};font-size:18px;"
        onclick="window.__shopCat('${c}')"
      >${SHOP_CATEGORIES[c]}</span>`;
    }).join('');

    const rows = this._items.map((item, i) => {
      const selected = i === this.selectedIndex;
      const stock = item.category === 'consumable' ? this._getPlayerStock(item.id) : 0;
      const maxed = item.maxStack && stock >= item.maxStack;
      const decored = item.flag && this.player.getFlag(item.flag);
      const canAfford = aum >= item.price;
      const unavailable = maxed || decored;

      let statusText = '';
      if (decored) statusText = ' [owned]';
      else if (maxed) statusText = ` [max ${item.maxStack}]`;
      else if (item.category === 'consumable') statusText = ` (x${stock})`;

      return `<div style="
        display:flex; justify-content:space-between; align-items:center;
        padding:8px 16px; border-radius:4px; margin-bottom:4px;
        background:${selected ? 'rgba(233,69,96,0.2)' : 'transparent'};
        border:1px solid ${selected ? '#e94560' : 'transparent'};
        opacity:${unavailable ? '0.5' : '1'};
        cursor:${unavailable ? 'not-allowed' : 'pointer'};
        font-size:20px;
      " onclick="window.__shopBuy(${i})">
        <span>${item.name}${statusText}</span>
        <span style="color:${canAfford && !unavailable ? '#ffd700' : '#888'}">${item.price.toLocaleString()} AUM</span>
      </div>`;
    }).join('');

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

  _purchase() {
    const item = this._items[this.selectedIndex];
    if (!item) return;

    const aum = this.player.stats.aum || 0;
    if (aum < item.price) {
      this._flash('Not enough AUM!', '#e94560');
      AudioManager.playSfx('cancel');
      return;
    }

    // Check if already owned / maxed
    if (item.flag && this.player.getFlag(item.flag)) {
      this._flash('Already owned!', '#e94560');
      return;
    }
    if (item.category === 'consumable') {
      const stock = this._getPlayerStock(item.id);
      if (item.maxStack && stock >= item.maxStack) {
        this._flash(`Max stack reached (${item.maxStack})`, '#e94560');
        return;
      }
    }

    // Deduct AUM
    this.player.stats.aum = aum - item.price;
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
    }

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
