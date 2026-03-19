const ACHIEVEMENT_KEY = 'trust_issues_achievements';

// Achievement definitions
const ACHIEVEMENTS = [
  // Story milestones
  { id: 'first_blood',       name: 'First Blood',          desc: 'Win your first combat',                    icon: '⚔',  check: (p, ctx) => ctx.event === 'combat_victory' },
  { id: 'karen_slayer',      name: 'Speak to MY Manager',  desc: 'Defeat Karen Henderson',                   icon: '📋', check: (p) => !!p.getFlag('defeated_karen') },
  { id: 'chad_bested',       name: 'Not Your Bro',         desc: 'Defeat Chad Henderson',                    icon: '💪', check: (p) => !!p.getFlag('defeated_chad') },
  { id: 'grandma_survived',  name: 'Legacy of Grief',      desc: 'Defeat Grandma Henderson',                 icon: '🧶', check: (p) => !!p.getFlag('defeated_grandma') },
  { id: 'hendersons_done',   name: 'Family Meeting Over',  desc: 'Defeat all three Hendersons',              icon: '🏆', check: (p) => !!p.getFlag('defeated_karen') && !!p.getFlag('defeated_chad') && !!p.getFlag('defeated_grandma') },

  // Combat mastery
  { id: 'assert_dominance',  name: 'Assert Dominance',     desc: 'Use Assert Dominance in combat',           icon: '⚡', check: (p, ctx) => ctx.event === 'power_move_used' },
  { id: 'brace_master',      name: 'Brace for Impact',     desc: 'Successfully brace an attack',             icon: '🛡', check: (p, ctx) => ctx.event === 'brace_success' },
  { id: 'counter_punch',     name: 'Counter-Offer',        desc: 'Retaliate after a successful brace',       icon: '↩', check: (p, ctx) => ctx.event === 'retaliate_used' },
  { id: 'weakness_exploit',  name: 'Due Diligence',        desc: 'Hit an enemy weakness',                    icon: '🎯', check: (p, ctx) => ctx.event === 'weakness_hit' },

  // Leveling
  { id: 'level_5',           name: 'Mid-Level Associate',  desc: 'Reach level 5',                            icon: '📈', check: (p) => (p.stats?.level || 1) >= 5 },
  { id: 'level_10',          name: 'Senior Associate',     desc: 'Reach level 10',                           icon: '📊', check: (p) => (p.stats?.level || 1) >= 10 },
  { id: 'level_15',          name: 'Trust Officer',        desc: 'Reach the maximum level',                  icon: '👔', check: (p) => (p.stats?.level || 1) >= 15 },

  // Roguelite
  { id: 'first_client',      name: 'First AUM',            desc: 'Accept your first reception client',       icon: '💼', check: (p, ctx) => ctx.event === 'client_accepted' },
  { id: 'ten_clients',       name: 'Growing Portfolio',    desc: 'Accept 10 reception clients',              icon: '📁', check: (p) => (p.getFlag('portfolioClients') || 0) >= 10 },
  { id: 'big_spender',       name: 'Retail Therapy',       desc: 'Spend AUM at the supply shop',             icon: '🛒', check: (p, ctx) => ctx.event === 'shop_purchase' },
  { id: 'millionaire',       name: 'AUM Millionaire',      desc: 'Accumulate 1,000,000 AUM',                 icon: '💰', check: (p) => (p.getFlag('portfolioAUM') || 0) >= 1000000 },
];

class AchievementManagerClass {
  constructor() {
    this._unlocked = null; // lazy load
  }

  _load() {
    if (this._unlocked !== null) return;
    try {
      const raw = localStorage.getItem(ACHIEVEMENT_KEY);
      this._unlocked = raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      this._unlocked = new Set();
    }
  }

  _save() {
    try {
      localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify([...this._unlocked]));
    } catch { /* ignore */ }
  }

  isUnlocked(id) {
    this._load();
    return this._unlocked.has(id);
  }

  getAll() {
    this._load();
    return ACHIEVEMENTS.map(a => ({ ...a, unlocked: this._unlocked.has(a.id) }));
  }

  /**
   * Check all achievements. Unlocks any that pass their check.
   * @param {Player} player
   * @param {{ event?: string, [key: string]: any }} ctx — event context
   * @returns {Array} newly unlocked achievements
   */
  check(player, ctx = {}) {
    this._load();
    const newlyUnlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (this._unlocked.has(a.id)) continue;
      try {
        if (a.check(player, ctx)) {
          this._unlocked.add(a.id);
          newlyUnlocked.push(a);
        }
      } catch { /* ignore individual check errors */ }
    }
    if (newlyUnlocked.length > 0) {
      this._save();
      for (const a of newlyUnlocked) {
        this._notify(a);
      }
    }
    return newlyUnlocked;
  }

  _notify(achievement) {
    const ui = document.getElementById('ui-overlay');
    if (!ui) return;
    const el = document.createElement('div');
    el.style.cssText = `
      position: absolute; bottom: 80px; right: 20px;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border: 2px solid #ffd700;
      border-radius: 8px;
      padding: 10px 16px;
      color: #fff;
      font-family: 'VT323', monospace;
      font-size: 18px;
      z-index: 200;
      pointer-events: none;
      box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
      animation: achievementSlide 0.4s ease-out;
      max-width: 260px;
    `;
    el.innerHTML = `<div style="color:#ffd700;font-size:13px;font-family:'Press Start 2P',cursive;margin-bottom:4px">Achievement!</div>
      <div>${achievement.icon} ${achievement.name}</div>
      <div style="font-size:14px;color:#aaa">${achievement.desc}</div>`;
    ui.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = '0';
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }, 3000);
  }

  reset() {
    this._unlocked = new Set();
    this._save();
  }
}

export const AchievementManager = new AchievementManagerClass();
