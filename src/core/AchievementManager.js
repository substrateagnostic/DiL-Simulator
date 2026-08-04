import { NotificationArbiter, NC } from './NotificationArbiter.js';

const ACHIEVEMENT_KEY = 'trust_issues_achievements';

// Achievement definitions
const ACHIEVEMENTS = [
  // Story milestones
  { id: 'first_blood',       category: 'Story',          name: 'First Blood',          desc: 'Win your first combat',                                       icon: '⚔',  check: (p, ctx) => ctx.event === 'combat_victory' },
  { id: 'hendersons_done',   category: 'Story',          name: 'Family Meeting Over',  desc: 'Defeat all three Hendersons',                                 icon: '🏆', check: (p) => !!p.getFlag('defeated_karen') && !!p.getFlag('defeated_chad') && !!p.getFlag('defeated_grandma') },

  // Act completions
  { id: 'act1_complete',     category: 'Act Completions', name: 'First Day Jitters',    desc: 'Survive your first day in the Trust Department',              icon: '📎', check: (p) => !!p.getFlag('briefing_complete') },
  { id: 'act2_complete',     category: 'Act Completions', name: 'The Bill Comes Due',   desc: 'Survive the reckoning on the Executive Floor',               icon: '⚖',  check: (p) => !!p.getFlag('act2_complete') },
  { id: 'act3_complete',     category: 'Act Completions', name: 'Follow the Money',     desc: 'Uncover the truth in the Archive',                           icon: '🗂',  check: (p) => !!p.getFlag('act3_complete') },
  { id: 'act4_complete',     category: 'Act Completions', name: 'The Building Has Spoken', desc: 'Retrieve the 1947 charter from the Vault',               icon: '📜', check: (p) => !!p.getFlag('act4_complete') },
  { id: 'act5_complete',     category: 'Act Completions', name: 'Hostile Takeover Blocked', desc: 'Drive out the restructuring team',                      icon: '🏢', check: (p) => !!p.getFlag('act5_complete') },
  { id: 'act6_complete',     category: 'Act Completions', name: 'United We Stand',      desc: 'Rally the team and secure the evidence',                     icon: '🤝', check: (p) => !!p.getFlag('act6_complete') },
  { id: 'act7_complete',     category: 'Act Completions', name: 'Trust Issues Resolved', desc: 'Defeat The Algorithm',                                      icon: '💻', check: (p) => !!p.getFlag('algorithm_defeated') },

  // Act 6½ — The Countersignature
  { id: 'countersigned',     category: 'Act Completions', name: 'The Countersignature', desc: "Get the 1947 charter certified by the Recorder's living deputy", icon: '🖋', check: (p) => !!p.getFlag('charter_certified') },
  { id: 'served',            category: 'Act Completions', name: 'Served',               desc: 'Defeat The Firm in the first vault',                          icon: '✉',  check: (p) => !!p.getFlag('defeated_the_firm') },
  { id: 'gray_area',         category: 'Roguelite',       name: 'Honorary Gray Area',   desc: 'Win the Meter War — three appeals upheld against Officer Reyes', icon: '🅿', check: (p) => !!p.getFlag('meter_war_done') },
  { id: 'on_time',           category: 'Roguelite',       name: 'The 5:15 Runs On Time', desc: "Recover Marlene's transfer ledger and read the second handwriting", icon: '🚌', check: (p) => !!p.getFlag('bus515_done') },

  // The Daemon at Rack 7
  { id: 'rememberer',        category: 'Story',           name: 'One More Rememberer',  desc: 'Document Process 7 — Institutional Memory, Auxiliary',        icon: '🖥', check: (p) => !!p.getFlag('daemon_kept') },
  { id: 'finished_shift',    category: 'Story',           name: 'A Finished Shift',     desc: 'Let Process 7 reconcile its last timestamp',                  icon: '🕯', check: (p) => !!p.getFlag('daemon_killed') },

  // New Game+
  { id: 'lap_two',           category: 'Story',           name: 'Lap Two',              desc: 'Restart the week with everything you earned',                 icon: '🔁', check: (p) => !!p.getFlag('ng_plus') },

  // Combat mastery
  { id: 'assert_dominance',  category: 'Combat Mastery', name: 'Assert Dominance',     desc: 'Use Assert Dominance in combat',           icon: '⚡', check: (p, ctx) => ctx.event === 'power_move_used' },
  { id: 'brace_master',      category: 'Combat Mastery', name: 'Brace for Impact',     desc: 'Successfully brace an attack',             icon: '🛡', check: (p, ctx) => ctx.event === 'brace_success' },
  { id: 'counter_punch',     category: 'Combat Mastery', name: 'Counter-Offer',        desc: 'Retaliate after a successful brace',       icon: '↩', check: (p, ctx) => ctx.event === 'retaliate_used' },
  { id: 'weakness_exploit',  category: 'Combat Mastery', name: 'Due Diligence',        desc: 'Hit an enemy weakness',                    icon: '🎯', check: (p, ctx) => ctx.event === 'weakness_hit' },
  { id: 'second_opinion',    category: 'Combat Mastery', name: 'Second Opinion',       desc: 'Use Second Wind in combat',                icon: '🌀', check: (p, ctx) => ctx.event === 'second_wind_used' },
  { id: 'nothing_to_lose',   category: 'Combat Mastery', name: 'Nothing to Lose',      desc: 'Use Desperate Gamble',                     icon: '🎲', check: (p, ctx) => ctx.event === 'desperate_gamble_used' },
  { id: 'all_in',            category: 'Combat Mastery', name: 'All In',               desc: 'Choose All In on Desperate Gamble',        icon: '💀', check: (p, ctx) => ctx.event === 'all_in_used' },
  { id: 'follow_through',    category: 'Combat Mastery', name: 'Follow Through',       desc: 'Land a Follow Through combo hit',          icon: '🔗', check: (p, ctx) => ctx.event === 'combo_hit' },
  { id: 'perfect_form',      category: 'Combat Mastery', name: 'Perfect Form',         desc: 'Get a Perfect on the Brace QTE',           icon: '✋', check: (p, ctx) => ctx.event === 'perfect_brace' },

  // Leveling
  { id: 'level_5',           category: 'Leveling',       name: 'Mid-Level Associate',  desc: 'Reach level 5',                            icon: '📈', check: (p) => (p.stats?.level || 1) >= 5 },
  { id: 'level_10',          category: 'Leveling',       name: 'Senior Associate',     desc: 'Reach level 10',                           icon: '📊', check: (p) => (p.stats?.level || 1) >= 10 },
  { id: 'level_15',          category: 'Leveling',       name: 'Trust Officer',        desc: 'Reach the maximum level',                  icon: '👔', check: (p) => (p.stats?.level || 1) >= 15 },

  // Roguelite
  { id: 'first_client',      category: 'Roguelite',      name: 'First AUM',            desc: 'Accept your first reception client',                    icon: '💼', check: (p, ctx) => ctx.event === 'client_accepted' },
  { id: 'ten_clients',       category: 'Roguelite',      name: 'Growing Portfolio',    desc: 'Accept 10 reception clients',                           icon: '📁', check: (p) => (p.getFlag('portfolioClients') || 0) >= 10 },
  { id: 'dedicated',         category: 'Roguelite',      name: 'Dedicated',            desc: 'Accept 25 reception clients',                           icon: '📋', check: (p) => (p.getFlag('portfolioClients') || 0) >= 25 },
  { id: 'big_spender',       category: 'Roguelite',      name: 'Retail Therapy',       desc: 'Spend AUM at the supply shop',                          icon: '🛒', check: (p, ctx) => ctx.event === 'shop_purchase' },
  { id: 'supply_run',        category: 'Roguelite',      name: 'Supply Run',           desc: 'Buy from all three shop categories',                    icon: '🛍', check: (p) => !!p.getFlag('bought_category_consumable') && !!p.getFlag('bought_category_upgrade') && !!p.getFlag('bought_category_decor') },
  { id: 'millionaire',       category: 'Roguelite',      name: 'AUM Millionaire',      desc: 'Accumulate 1,000,000 AUM',                              icon: '💰', check: (p) => (p.getFlag('portfolioAUM') || 0) >= 1000000 },
  { id: 'hard_pass',         category: 'Roguelite',      name: 'Hard Pass',            desc: 'Decline a client after winning combat',                 icon: '🚪', check: (p, ctx) => ctx.event === 'client_declined' },

  // The Billable Day. `day_closed` is emitted by ExplorationState._closeDay
  // with { aum, clients, signed, total, perfect }; it used to be emitted into
  // a void — no achievement consumed it. ctx.clients is the number actually
  // served, so a forfeited day (which never reaches _closeDay) cannot pay out.
  { id: 'day_closed',        category: 'Roguelite',      name: 'Billable Human',       desc: 'Close your first Billable Day',                          icon: '🔔', check: (p, ctx) => ctx.event === 'day_closed' },
  { id: 'day_perfect',       category: 'Roguelite',      name: 'Full Conversion Event', desc: 'Close a Billable Day with every client signed',         icon: '✒', check: (p, ctx) => ctx.event === 'day_closed' && !!ctx.perfect },
  { id: 'day_five',          category: 'Roguelite',      name: 'Fully Utilized',       desc: 'Close a five-client Billable Day',                       icon: '📅', check: (p, ctx) => ctx.event === 'day_closed' && (ctx.clients || 0) >= 5 },
  { id: 'dream_client',      category: 'Roguelite',      name: 'Dream Client',         desc: 'Accept a client with no negative attributes',           icon: '⭐', check: (p, ctx) => ctx.event === 'client_accepted' && ctx.attributes && ctx.attributes.every(a => a.positive) },
  { id: 'high_roller',       category: 'Roguelite',      name: 'High Roller',          desc: 'Accept a client with 5,000,000 or more in assets',      icon: '💸', check: (p, ctx) => ctx.event === 'client_accepted' && ctx.assets >= 5_000_000 },
  { id: 'total_renovation',  category: 'Roguelite',      name: 'Full Renovation',      desc: 'Complete every office renovation',                       icon: '🏗', check: (p) =>
    !!p.getFlag('renovation_espresso_bar') &&
    !!p.getFlag('renovation_catering_fridge') &&
    !!p.getFlag('renovation_ergonomic_workstations') &&
    !!p.getFlag('renovation_marble_counter') &&
    !!p.getFlag('renovation_lobby_sculpture') &&
    !!p.getFlag('renovation_projection_wall') &&
    !!p.getFlag('renovation_corner_office') &&
    !!p.getFlag('renovation_trophy_wall') &&
    !!p.getFlag('renovation_penthouse')
  },
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
   * How many achievements are unlocked. This is the Review Point supply
   * (see src/data/review.js) — one point per commendation, ever, retroactive
   * for anyone who was playing before Review Points existed.
   * Filtered against the live definitions so a retired achievement id left
   * behind in localStorage cannot inflate the ledger.
   */
  getUnlockedCount() {
    this._load();
    return ACHIEVEMENTS.reduce((n, a) => n + (this._unlocked.has(a.id) ? 1 : 0), 0);
  }

  getTotalCount() {
    return ACHIEVEMENTS.length;
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

  /**
   * COMMENDATION — the lowest-stakes, most-deferrable class in the game, and
   * the one that used to shout loudest.
   *
   * THE BUG THIS REPLACES: this function hard-coded `bottom: 80px; right: 20px`
   * with no index and no stagger, and `check()` above loops `newlyUnlocked`
   * calling it once per item. The audit measured NINE toasts sharing one pixel
   * rect — bottom edge y+h=820, right edge x+w=1580 for all nine, 36 mutual
   * 100 %-overlap pairs, eight messages the player never saw. Two overlapping
   * is already unreadable and two happens constantly in normal play.
   *
   * Posting through the arbiter fixes it three ways at once: single occupancy
   * per zone (no stacking), coalescing on the shared key (a burst becomes one
   * "Achievement x9" card that names the first three), and deferral against
   * VOICE and DECISION so a commendation never lands on a boss's closing line.
   * Everything merged or deferred is in the Log tab.
   */
  _notify(achievement) {
    NotificationArbiter.post({
      cls: NC.COMMENDATION,
      key: 'Achievement',
      text: `${achievement.icon} ${achievement.name} — ${achievement.desc}`,
      html: `<div class="na-count">Achievement!</div>` +
        `<div class="na-line">${achievement.icon} ${achievement.name}</div>` +
        `<div class="na-more">${achievement.desc}</div>`,
    });
  }

  reset() {
    this._unlocked = new Set();
    this._save();
  }
}

export const AchievementManager = new AchievementManagerClass();
