import * as THREE from 'three';
import { buildCharacter } from './CharacterBuilder.js';
import { CharacterAnimator } from './CharacterAnimator.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { PLAYER_BASE_STATS, PLAYER_ABILITIES, XP_TABLE, LEVEL_GROWTH, TIER_LEVEL } from '../data/stats.js';
import { ALLY_STATS } from '../data/allies.js';
import { STARTING_INVENTORY } from '../data/items.js';
import { COSMETICS, COSMETIC_SLOTS } from '../data/cosmetics.js';
import { applyReviewPurchases } from '../data/review.js';
import { PLAYER } from '../utils/constants.js';
import { EventBus } from '../core/EventBus.js';
import { Difficulty } from '../core/DifficultyManager.js';

export class Player {
  constructor() {
    this.mesh = buildCharacter(CHARACTER_CONFIGS.andrew);
    this.animator = new CharacterAnimator(this.mesh);
    this.stats = { ...PLAYER_BASE_STATS };
    this.inventory = STARTING_INVENTORY.map(i => ({ ...i }));
    this.flags = {}; // Story flags
    this.questStates = {}; // Quest progress
    this.position = { x: 0, z: 0 };
    this.currentRoom = 'parking_garage';
    this.actIndex = 0;
    // Upgrade system
    this.upgradePoints = 0;
    this.deaths = 0;
    this.unlockedAbilities = new Set(['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check']); // starters
    // Cosmetic equipment: { hat: null, glasses: null, badge: null, accessory: null }
    this.equipped = {};
    for (const slot of COSMETIC_SLOTS) this.equipped[slot] = null;
    // Party / allies
    this.party = []; // ordered array of recruited allyIds (e.g., ['janet', 'alex_it'])
    this.allyState = {}; // { allyId: { hp, mp, unlockedAbilities: [ids] } }
    // Reasonable Doubt — voice usage profile across the game (see src/data/voices.js)
    this.voiceCounts = { apprentice: 0, litigator: 0, skeptic: 0, witness: 0 };
    // Combat preference: 'manual' = player picks each ally's action (BG3-style),
    // 'auto' = AI runs allies on their turn. Per-fight toggle is also available
    // via the in-combat HUD; this is the persistent default.
    this.allyControl = 'manual';
  }

  // `tileMap` is REQUIRED for any multi-level room. The terrain lerp that keeps
  // Andrew's feet on the floor lives in `move()`, and `move()` does not run
  // while ExplorationState is paused — which it is for the whole room-change
  // fade. Hardcoding y = 0 here therefore rendered the player a full 1.800 m
  // above the floor for the entire transition into the stairwell (measured,
  // flat at delta = 1.800 through t = 4071 ms) and then dropped him. That is
  // the "you walk through the floor" read.
  setPosition(x, z, tileMap = null) {
    this.position.x = x;
    this.position.z = z;
    this.mesh.position.set(x, tileMap?.heightAt ? tileMap.heightAt(x, z) : 0, z);
  }

  move(dx, dz, dt, tileMap) {
    const speed = PLAYER.SPEED * dt;
    const nx = this.position.x + dx * speed;
    const nz = this.position.z + dz * speed;

    const isMoving = dx !== 0 || dz !== 0;
    this.animator.setWalking(isMoving);

    if (isMoving) {
      this.animator.setFacing(Math.atan2(dx, dz));
    }

    // Check X and Z independently for wall sliding (from-position lets
    // multi-level rooms refuse ledge jumps while allowing stair steps)
    if (tileMap) {
      if (tileMap.canMove(nx, this.position.z, 0.3, this.position.x, this.position.z)) {
        this.position.x = nx;
      }
      if (tileMap.canMove(this.position.x, nz, 0.3, this.position.x, this.position.z)) {
        this.position.z = nz;
      }
      // Clamp to room perimeter so character doesn't clip through walls.
      // These two numbers define the player's REACHABLE band and are read by
      // Room._registerWallProp to decide whether a walk-behind fade can ever
      // turn off in a given room — keep them in PLAYER, not inline.
      this.position.x = Math.max(PLAYER.EDGE_CLAMP, Math.min(tileMap.width - PLAYER.EDGE_CLAMP_FAR, this.position.x));
      this.position.z = Math.max(PLAYER.EDGE_CLAMP, Math.min(tileMap.height - PLAYER.EDGE_CLAMP_FAR, this.position.z));
    } else {
      this.position.x = nx;
      this.position.z = nz;
    }

    // Ride the terrain: lerp toward the current tile's floor height.
    //
    // B5 — THE STAIRS CLIPPED. `heightAt` is a per-tile STEP function (a tread
    // is a flat slab; the stairwell's rise is 0.42 m per tile), and this lerp
    // closes only `dt * 12` of the gap per frame — about 20 % at 60 fps, so a
    // single riser takes ~15 frames to climb. For those frames the body is
    // BELOW the tread it is standing on and the step passes through Andrew's
    // shins. Measured walking the flight: worst foot-to-floor delta -0.267 m,
    // and -0.15 to -0.16 recurring on every riser.
    //
    // The remedy is asymmetric on purpose. Going DOWN, lagging above the new
    // floor for a few frames reads as a step down and is kept exactly as it
    // was. Going UP, the body may never sink more than SINK_TOLERANCE into the
    // stair — 6 cm, inside the shoe, invisible at the shipping camera — so the
    // lerp is clamped rather than sped up. Speeding it up would pop a 0.42 m
    // rise in three frames on every tread; clamping keeps the soft weight
    // shift and just refuses to let it pass through the geometry.
    const SINK_TOLERANCE = 0.06;
    const targetY = tileMap ? tileMap.heightAt(this.position.x, this.position.z) : 0;
    const curY = this.mesh.position.y;
    let newY = Math.abs(targetY - curY) < 0.01 ? targetY : curY + (targetY - curY) * Math.min(1, dt * 12);
    if (newY < targetY - SINK_TOLERANCE) newY = targetY - SINK_TOLERANCE;
    this.mesh.position.set(this.position.x, newY, this.position.z);
  }

  update(dt) {
    this.animator.update(dt);
  }

  // Get available abilities — only unlocked ones (manual + quest)
  getAbilities() {
    const abilities = [];
    for (const [id, ability] of Object.entries(PLAYER_ABILITIES)) {
      if (ability.unlockQuest) {
        if (this.questStates[ability.unlockQuest] === 'complete') {
          abilities.push({ id, ...ability });
        }
      } else if (this.unlockedAbilities.has(id)) {
        abilities.push({ id, ...ability });
      }
    }
    return abilities;
  }

  // Minimum character level for a node of this tier (TIER_LEVEL, stats.js).
  // Returns 0 for tier 0 / quest abilities, which have no gate.
  tierGateFor(id) {
    const ability = PLAYER_ABILITIES[id];
    if (!ability || ability.unlockQuest) return 0;
    return TIER_LEVEL[ability.tier] || 0;
  }

  // Check if an ability can be unlocked (level + prerequisite + enough points)
  canUnlockAbility(id) {
    const ability = PLAYER_ABILITIES[id];
    if (!ability || ability.unlockQuest) return false;
    if (this.unlockedAbilities.has(id)) return false;
    if (ability.tier === 0) return false; // starters are auto-unlocked
    // THE TIER GATE. Without it the Practice Groups' level-by-level identity is
    // unenforceable: measured on shipped data, an optimal shopper spending the
    // same three points on cite_precedent + per_my_last_email instead of a lane
    // order HALVES Chad (6.34 rounds -> 3.72). It costs a player following a
    // lane in order almost nothing, because all three lanes were already
    // shaped that way.
    if ((this.stats.level || 1) < this.tierGateFor(id)) return false;
    const pointCost = ability.upgradePointCost || 1;
    if (this.upgradePoints < pointCost) return false;
    if (ability.requires && !this.unlockedAbilities.has(ability.requires)) return false;
    return true;
  }

  // Spend upgrade points to unlock an ability
  unlockAbility(id) {
    if (!this.canUnlockAbility(id)) return false;
    const ability = PLAYER_ABILITIES[id];
    this.upgradePoints -= (ability.upgradePointCost || 1);
    this.unlockedAbilities.add(id);
    return true;
  }

  // Get combat stats with cosmetic bonuses applied
  getCombatStats() {
    const base = { ...this.stats };
    const maxHPBefore = base.maxHP;
    const maxMPBefore = base.maxMP;
    for (const slot of COSMETIC_SLOTS) {
      const cosId = this.equipped[slot];
      if (!cosId) continue;
      const cos = COSMETICS[cosId];
      if (!cos || !cos.stats) continue;
      for (const [stat, val] of Object.entries(cos.stats)) {
        if (base[stat] !== undefined) base[stat] += val;
      }
    }
    // Cosmetic maxHP/maxMP gains also fill current HP/MP so the bonus is felt immediately
    const maxHPGain = base.maxHP - maxHPBefore;
    const maxMPGain = base.maxMP - maxMPBefore;
    if (maxHPGain > 0) base.hp = Math.min(base.hp + maxHPGain, base.maxHP);
    if (maxMPGain > 0) base.mp = Math.min(base.mp + maxMPGain, base.maxMP);
    // Apply decor combat bonuses
    if (this.getFlag('decor_coffee_machine')) {
      base.mp = Math.min(base.maxMP, base.mp + 5);
    }
    if (this.getFlag('decor_motivational_poster')) {
      base.posterActive = true;
    }
    // Final cap
    if (base.hp > base.maxHP) base.hp = base.maxHP;
    if (base.mp > base.maxMP) base.mp = base.maxMP;
    return base;
  }

  // Equip a cosmetic item (returns true if changed)
  equipCosmetic(id) {
    const cos = COSMETICS[id];
    if (!cos) return false;
    this.equipped[cos.slot] = id;
    this.rebuildMesh();
    return true;
  }

  // Unequip a slot
  unequipCosmetic(slot) {
    if (!this.equipped[slot]) return false;
    this.equipped[slot] = null;
    this.rebuildMesh();
    return true;
  }

  // Rebuild mesh with current cosmetics applied (for third-person + combat)
  rebuildMesh() {
    const parent = this.mesh.parent;
    const pos = this.mesh.position.clone();
    const rot = this.mesh.rotation.clone();
    if (parent) parent.remove(this.mesh);

    // Build config with cosmetic accessories
    const config = { ...CHARACTER_CONFIGS.andrew };
    const extraAccessories = [...(config.accessories || [])];
    for (const slot of COSMETIC_SLOTS) {
      const cosId = this.equipped[slot];
      if (cosId) extraAccessories.push('cosmetic_' + cosId);
    }
    config.accessories = extraAccessories;

    this.mesh = buildCharacter(config);
    this.animator = new CharacterAnimator(this.mesh);
    this.mesh.position.copy(pos);
    this.mesh.rotation.copy(rot);
    if (parent) parent.add(this.mesh);
  }

  // Check if a cosmetic is unlocked based on flags/quests
  isCosmeticUnlocked(id) {
    const cos = COSMETICS[id];
    if (!cos) return false;
    if (cos.unlock === 'default') return true;
    if (cos.unlock.flag) return !!this.flags[cos.unlock.flag];
    if (cos.unlock.quest) return this.questStates[cos.unlock.quest] === 'complete';
    return false;
  }

  // Gain XP and check for level up — grants upgrade points instead of auto-unlocking abilities
  gainXP(amount) {
    this.stats.xp += amount;
    const results = [];
    while (this.stats.level < XP_TABLE.length && this.stats.xp >= XP_TABLE[this.stats.level]) {
      this.stats.level++;
      this.stats.maxHP += LEVEL_GROWTH.maxHP;
      this.stats.maxMP += LEVEL_GROWTH.maxMP;
      this.stats.atk += LEVEL_GROWTH.atk;
      this.stats.def += LEVEL_GROWTH.def;
      this.stats.spd += LEVEL_GROWTH.spd;
      this.stats.hp = this.stats.maxHP;
      this.stats.mp = this.stats.maxMP;
      this.upgradePoints += 1;
      results.push(this.stats.level);
    }
    return results; // Returns array of levels gained
  }

  // Full heal
  rest() {
    this.stats.hp = this.stats.maxHP;
    this.stats.mp = this.stats.maxMP;
    this.restAllies();
  }

  // ── Party / ally management ──────────────────────────────────────────
  // Add an ally to the party (idempotent). Initializes their ally state to full HP/MP and starter abilities.
  addAlly(allyId) {
    if (!ALLY_STATS[allyId]) return false;
    if (!this.party.includes(allyId)) this.party.push(allyId);
    if (!this.allyState[allyId]) {
      const cfg = ALLY_STATS[allyId];
      const baseStarters = cfg.starterAbilities || cfg.abilities || [];
      const stats = this.getAllyEffectiveStats(allyId);
      this.allyState[allyId] = {
        hp: stats.maxHP,
        mp: stats.maxMP,
        unlockedAbilities: [...baseStarters],
      };
    }
    EventBus.emit('ally-recruited', { allyId });
    return true;
  }

  // True if this ally is currently in the party
  hasAlly(allyId) {
    return this.party.includes(allyId);
  }

  // Restore all recruited allies to full HP/MP — called on Player.rest()
  restAllies() {
    for (const allyId of this.party) {
      const stats = this.getAllyEffectiveStats(allyId);
      if (!this.allyState[allyId]) {
        this.allyState[allyId] = { hp: stats.maxHP, mp: stats.maxMP, unlockedAbilities: [...(ALLY_STATS[allyId].starterAbilities || ALLY_STATS[allyId].abilities)] };
      } else {
        this.allyState[allyId].hp = stats.maxHP;
        this.allyState[allyId].mp = stats.maxMP;
      }
    }
  }

  // Compute effective ally stats — base stats + LEVEL_GROWTH scaled by Andrew's level.
  // Allies share Andrew's level so the party scales together.
  getAllyEffectiveStats(allyId) {
    const cfg = ALLY_STATS[allyId];
    if (!cfg) return null;
    const playerLevel = this._currentLevel();
    const lvUp = Math.max(0, playerLevel - 1);
    // Allies grow at 80% of Andrew's growth — keeps them slightly behind in raw stats but useful
    const f = cfg.growthFactor || 0.8;
    return {
      ...cfg,
      maxHP: cfg.maxHP + Math.floor(LEVEL_GROWTH.maxHP * f * lvUp),
      maxMP: cfg.maxMP + Math.floor(LEVEL_GROWTH.maxMP * f * lvUp),
      atk:   cfg.atk   + Math.floor(LEVEL_GROWTH.atk   * f * lvUp),
      def:   cfg.def   + Math.floor(LEVEL_GROWTH.def   * f * lvUp),
      spd:   cfg.spd   + Math.floor(LEVEL_GROWTH.spd   * f * lvUp),
    };
  }

  _currentLevel() {
    let lvl = 1;
    for (let i = 0; i < XP_TABLE.length; i++) {
      if (this.stats.xp >= XP_TABLE[i]) lvl = i + 2; else break;
    }
    return Math.min(15, lvl);
  }

  // Get a list of unlocked abilities for an ally (returns ability ids)
  getAllyUnlockedAbilities(allyId) {
    return [...(this.allyState[allyId]?.unlockedAbilities || [])];
  }

  // Add an ability to an ally's unlocked set (used by ability menu unlock flow)
  unlockAllyAbility(allyId, abilityId) {
    if (!this.allyState[allyId]) return false;
    const list = this.allyState[allyId].unlockedAbilities;
    if (!list.includes(abilityId)) list.push(abilityId);
    return true;
  }

  // Returns true if the player can unlock this non-starter ally ability right now
  // (ally is recruited, ability is in pool, not already unlocked, has upgrade points).
  canUnlockAllyAbility(allyId, abilityId) {
    const cfg = ALLY_STATS[allyId];
    if (!cfg) return false;
    if (!this.allyState[allyId]) return false;
    if (!cfg.abilities.includes(abilityId)) return false;
    if (this.allyState[allyId].unlockedAbilities.includes(abilityId)) return false;
    if (this.upgradePoints < 1) return false;
    return true;
  }

  // Spend 1 upgrade point to teach an ally a new ability from their pool.
  spendPointOnAllyAbility(allyId, abilityId) {
    if (!this.canUnlockAllyAbility(allyId, abilityId)) return false;
    this.upgradePoints -= 1;
    this.unlockAllyAbility(allyId, abilityId);
    return true;
  }

  // Add item to inventory
  addItem(id, quantity = 1) {
    const existing = this.inventory.find(i => i.id === id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.inventory.push({ id, quantity });
    }
  }

  // Use item
  useItem(id) {
    const idx = this.inventory.findIndex(i => i.id === id && i.quantity > 0);
    if (idx === -1) return false;
    this.inventory[idx].quantity--;
    if (this.inventory[idx].quantity <= 0) {
      this.inventory.splice(idx, 1);
    }
    return true;
  }

  // Set/get story flags
  setFlag(key, value = true) {
    const previous = this.flags[key];
    this.flags[key] = value;
    if (previous !== value) {
      EventBus.emit('flag-set', { key, value, previous });
    }
  }

  getFlag(key) {
    return this.flags[key] || false;
  }

  // Serialization for save
  serialize() {
    return {
      stats: { ...this.stats },
      inventory: this.inventory.map(i => ({ ...i })),
      flags: { ...this.flags },
      questStates: { ...this.questStates },
      position: { ...this.position },
      currentRoom: this.currentRoom,
      actIndex: this.actIndex,
      upgradePoints: this.upgradePoints,
      deaths: this.deaths,
      unlockedAbilities: [...this.unlockedAbilities],
      equipped: { ...this.equipped },
      party: [...this.party],
      allyState: JSON.parse(JSON.stringify(this.allyState)),
      voiceCounts: { ...this.voiceCounts },
      allyControl: this.allyControl,
      // DIFFICULTY MODE — ADDITIVE, and additive in the strong sense: while the
      // producer gate is closed these are always the default, every save
      // written before this reads them as the default, and no field was
      // renamed, removed or repurposed to make room. `difficultyFloor` is the
      // EASIEST mode this run has been played on, which is the number the
      // records read; see DifficultyManager.set().
      ...Difficulty.serialize(),
    };
  }

  deserialize(data) {
    Object.assign(this.stats, data.stats || {});
    this.inventory = Array.isArray(data.inventory)
      ? data.inventory.map(i => ({ ...i }))
      : STARTING_INVENTORY.map(i => ({ ...i }));
    this.flags = { ...(data.flags || {}) };
    this.questStates = { ...(data.questStates || {}) };
    this.position = { x: 0, z: 0, ...(data.position || {}) };
    this.currentRoom = data.currentRoom || 'parking_garage';
    this.actIndex = data.actIndex || 0;
    this.upgradePoints = data.upgradePoints || 0;
    this.deaths = data.deaths || 0;
    // An unknown or absent mode lands on the default, which is the shipped
    // game — a stale or hand-edited blob can never change how a fight plays.
    Difficulty.adopt(data);
    if (data.stats?.aum !== undefined) this.stats.aum = data.stats.aum;
    this.unlockedAbilities = new Set(data.unlockedAbilities || ['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check']);
    ['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check'].forEach(id => this.unlockedAbilities.add(id));
    if (data.equipped) {
      this.equipped = { ...data.equipped };
      const hasCosmetics = COSMETIC_SLOTS.some(s => this.equipped[s]);
      if (hasCosmetics) this.rebuildMesh();
    }
    // Party state — rebuild ally state objects (don't trust unknown ally ids)
    this.party = Array.isArray(data.party) ? data.party.filter(id => ALLY_STATS[id]) : [];
    this.allyState = {};
    if (data.allyState && typeof data.allyState === 'object') {
      for (const [id, st] of Object.entries(data.allyState)) {
        if (!ALLY_STATS[id]) continue;
        const stats = this.getAllyEffectiveStats(id);
        this.allyState[id] = {
          hp: Math.min(stats.maxHP, st.hp ?? stats.maxHP),
          mp: Math.min(stats.maxMP, st.mp ?? stats.maxMP),
          unlockedAbilities: Array.isArray(st.unlockedAbilities)
            ? st.unlockedAbilities
            : [...(ALLY_STATS[id].starterAbilities || ALLY_STATS[id].abilities)],
        };
      }
    }
    // Ensure recruited allies always have state initialized
    for (const allyId of this.party) {
      if (!this.allyState[allyId]) {
        const stats = this.getAllyEffectiveStats(allyId);
        const cfg = ALLY_STATS[allyId];
        this.allyState[allyId] = {
          hp: stats.maxHP, mp: stats.maxMP,
          unlockedAbilities: [...(cfg.starterAbilities || cfg.abilities)],
        };
      }
    }
    // Voice profile
    this.voiceCounts = { apprentice: 0, litigator: 0, skeptic: 0, witness: 0 };
    if (data.voiceCounts && typeof data.voiceCounts === 'object') {
      for (const k of Object.keys(this.voiceCounts)) {
        if (typeof data.voiceCounts[k] === 'number') this.voiceCounts[k] = data.voiceCounts[k];
      }
    }
    // Combat ally-control preference
    this.allyControl = (data.allyControl === 'auto') ? 'auto' : 'manual';
    // Review Point purchases are a localStorage ledger, deliberately NOT part
    // of the save (so they survive New Game+, slot switches and deleted
    // files). `this.flags` was just replaced wholesale by the save's flags,
    // so the purchase flags have to be re-stamped here — ExplorationState
    // enters BEFORE deserialize on the Continue path, so its own call is not
    // enough on its own.
    applyReviewPurchases(this);
    this.setPosition(this.position.x, this.position.z);
  }
}
