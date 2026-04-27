import { PLAYER_ABILITIES, ENEMY_ABILITIES, ENEMY_STATS, ITEMS, pickMessage } from '../data/stats.js';
import { ALLY_STATS, ALLY_ABILITIES, ALLY_AI_PATTERNS } from '../data/allies.js';
import { VOICES, VOICE_ACTIONS } from '../data/voices.js';
import { COMBAT } from '../utils/constants.js';
import { randomRange } from '../utils/math.js';
import { ENEMY_AI_PATTERNS } from '../combat/EnemyAI.js';

// Multi-combatant turn-based engine.
// Backward compatible with single-enemy fights via get player() / get enemy().
// allies[0] is always the player (Andrew). Additional allies are AI-controlled.
// enemies[] has 1+ entries; AoE abilities hit all alive enemies.

export class CombatEngine {
  constructor(playerStats, enemyId, enemyOverrides = {}, opts = {}) {
    // Build allies — allies[0] is always the player
    this.allies = [this._initPlayer(playerStats)];
    const partyIds = opts.partyIds || [];
    for (const id of partyIds) {
      const ally = this._buildAlly(id, opts.partyOverrides?.[id]);
      if (ally) this.allies.push(ally);
    }

    // Build enemies. opts.enemyIds takes precedence; fall back to single enemyId.
    const enemyIds = (opts.enemyIds && opts.enemyIds.length > 0) ? opts.enemyIds : [enemyId];
    this.enemies = [];
    for (let i = 0; i < enemyIds.length; i++) {
      const eid = enemyIds[i];
      // Apply enemyOverrides only to the enemy whose id matches the original arg
      const overrides = (eid === enemyId) ? enemyOverrides : (opts.enemyOverrides?.[eid] || {});
      const enemy = this._buildEnemy(eid, overrides);
      if (enemy) this.enemies.push(enemy);
    }

    this.activeAllyIndex = 0;        // Index of ally currently taking a turn
    this.targetEnemyIndex = this._firstAliveEnemyIndex(); // Default target for single-target attacks
    this.turn = 'player';            // 'player' | 'enemy' (legacy semantics retained)
    this.turnCount = 0;
    this.isOver = false;
    this.result = null;
    this.log = [];
    this.counterActive = false;
    this.posterJustTriggered = false;
    // Voice ("Reasonable Doubt") state — see src/data/voices.js
    this.voiceState = {
      fired: { apprentice: false, litigator: false, skeptic: false, witness: false },
      sawCrit: false,
      sawEnemyHeal: false,
      tookDamageRecently: false,
      skepticLocked: false,
      lastVoiceUsed: null,
    };
  }

  _initPlayer(playerStats) {
    return {
      ...playerStats,
      buffs: [],
      dots: [],
      stunned: 0,
      confused: 0,
      silenced: 0,
      exposed: 0,
      protected: 0,
      stunnedThisTurn: false,
      confusedThisTurn: false,
      silencedThisTurn: false,
      blockNext: false,
      momentum: 0,
      bracing: false,
      retaliateReady: false,
      posterUsed: false,
      isPlayer: true,
      allyId: 'andrew',
      name: playerStats.name || 'Andrew',
      _alive: true,
    };
  }

  _buildAlly(allyId, overrides = {}) {
    const cfg = ALLY_STATS[allyId];
    if (!cfg) return null;
    // overrides may be: { hp, mp, maxHP, maxMP, atk, def, spd, abilities, unlockedAbilities }
    // Effective stats (level-scaled) come in via overrides — fall back to base config.
    const maxHP = overrides.maxHP ?? cfg.maxHP;
    const maxMP = overrides.maxMP ?? cfg.maxMP;
    return {
      ...cfg,
      maxHP,
      maxMP,
      atk: overrides.atk ?? cfg.atk,
      def: overrides.def ?? cfg.def,
      spd: overrides.spd ?? cfg.spd,
      // Active ability pool — defaults to unlocked starters; engine reads from this when picking abilities
      abilities: overrides.abilities ?? overrides.unlockedAbilities ?? cfg.starterAbilities ?? cfg.abilities,
      hp: Math.min(maxHP, overrides.hp ?? cfg.hp ?? maxHP),
      mp: Math.min(maxMP, overrides.mp ?? cfg.mp ?? maxMP),
      buffs: [],
      dots: [],
      stunned: 0,
      confused: 0,
      silenced: 0,
      exposed: 0,
      protected: 0,
      stunnedThisTurn: false,
      confusedThisTurn: false,
      isPlayer: false,
      allyId,
      _alive: true,
    };
  }

  _buildEnemy(enemyId, overrides = {}) {
    const base = ENEMY_STATS[enemyId];
    if (!base) return null;
    return {
      ...base,
      ...overrides,
      enemyId,
      hp: overrides.hp ?? base.hp ?? base.maxHP,
      buffs: [],
      dots: [],
      lastAbility: null,
      exposed: 0,
      protected: 0,
      vulnerable: 0,
      confuseCooldown: 0,
      telegraphedAbility: null,
      abilityIndex: 0,
      _alive: true,
    };
  }

  // ── Backward-compat getters ───────────────────────────────────────────
  get player() { return this.allies[0]; }
  get enemy() {
    // Prefer the currently-targeted alive enemy
    const cur = this.enemies[this.targetEnemyIndex];
    if (cur && cur.hp > 0) return cur;
    return this.enemies.find(e => e.hp > 0) || this.enemies[0];
  }
  get telegraphedAbility() { return this.enemy?.telegraphedAbility ?? null; }
  set telegraphedAbility(v) { if (this.enemy) this.enemy.telegraphedAbility = v; }
  get abilityIndex() { return this.enemy?.abilityIndex ?? 0; }
  set abilityIndex(v) { if (this.enemy) this.enemy.abilityIndex = v; }
  get enemyId() { return this.enemy?.enemyId; }

  // ── Helpers ───────────────────────────────────────────────────────────
  aliveEnemies() { return this.enemies.filter(e => e.hp > 0); }
  aliveAllies() { return this.allies.filter(a => a.hp > 0); }
  _firstAliveEnemyIndex() {
    for (let i = 0; i < this.enemies.length; i++) if (this.enemies[i].hp > 0) return i;
    return 0;
  }

  // Resolve the target enemy for an action. If targetIndex is invalid or dead, fall back to first alive.
  _resolveTarget(targetIndex) {
    if (typeof targetIndex === 'number' && this.enemies[targetIndex]?.hp > 0) {
      this.targetEnemyIndex = targetIndex;
      return this.enemies[targetIndex];
    }
    const idx = this._firstAliveEnemyIndex();
    this.targetEnemyIndex = idx;
    return this.enemies[idx];
  }

  // ── Damage calc ───────────────────────────────────────────────────────
  _calcDamage(attackerAtk, power, defenderDef, target = null, abilityTag = null) {
    const baseDmg = (attackerAtk + power) * COMBAT.BASE_DAMAGE_MULTIPLIER;
    const defense = defenderDef * COMBAT.DEFENSE_FACTOR;
    let damage = Math.max(1, Math.floor(baseDmg - defense + randomRange(-3, 3)));

    let critical = false;
    if (Math.random() < COMBAT.CRITICAL_CHANCE) {
      damage = Math.floor(damage * COMBAT.CRITICAL_MULTIPLIER);
      critical = true;
    }

    if (target) {
      if (target.exposed > 0) damage = Math.floor(damage * 1.3);
      if (target.protected > 0) damage = Math.floor(damage * 0.5);
    }

    let effective = null;
    const isEnemy = target && this.enemies.includes(target);
    if (abilityTag && isEnemy) {
      if (target.weakness === abilityTag) {
        damage = Math.floor(damage * 1.5);
        effective = 'super';
      } else if (target.resistance === abilityTag) {
        damage = Math.floor(damage * 0.7);
        effective = 'resist';
      }
    }

    if (isEnemy && target.vulnerable > 0) {
      damage = Math.floor(damage * 1.5);
      target.vulnerable = 0;
      effective = effective || 'vulnerable';
    }

    return { damage, critical, effective };
  }

  _getEffective(entity) {
    const stats = { ...entity };
    for (const buff of entity.buffs) {
      for (const [key, val] of Object.entries(buff.stats)) {
        if (stats[key] !== undefined) stats[key] += val;
      }
    }
    return stats;
  }

  _maybeConfuseActor(actor, actionLabel) {
    if (!actor.confusedThisTurn) return null;
    if (Math.random() >= 0.5) return null;
    const stats = this._getEffective(actor);
    const selfHit = this._calcDamage(stats.atk, 6, stats.def);
    actor.hp = Math.max(0, actor.hp - selfHit.damage);
    this._checkDefeat();
    return {
      type: 'confused',
      damage: selfHit.damage,
      critical: selfHit.critical,
      message: `Confused by corporate nonsense, ${actor.isPlayer ? 'your' : actor.name + '\'s'} ${actionLabel} backfires!`,
    };
  }

  _enemyHasDebuff(enemy) {
    return (enemy.buffs || []).some(b => Object.values(b.stats).some(v => v < 0));
  }

  _gainMomentum(amount) {
    this.player.momentum = Math.min(100, this.player.momentum + amount);
  }

  // ── Player (Andrew) actions ───────────────────────────────────────────
  playerAttack(targetIndex) {
    const target = this._resolveTarget(targetIndex);
    if (!target) return null;
    const confusion = this._maybeConfuseActor(this.player, 'attack');
    if (confusion) return confusion;

    if (this.counterActive) {
      this.counterActive = false;
      const pStats = this._getEffective(this.player);
      const eStats = this._getEffective(target);
      const dmg = this._calcDamage(pStats.atk, 5, eStats.def, target);
      target.hp = Math.max(0, target.hp - dmg.damage);
      this.player.stunned = 0;
      this.player.stunnedThisTurn = false;
      this.log.push({ type: 'break_counter', damage: dmg.damage });
      this._checkVictory();
      return { ...dmg, type: 'break_counter', message: 'Pushed through the counter! Reduced damage dealt.', targetIndex: this.targetEnemyIndex };
    }

    const pStats = this._getEffective(this.player);
    const eStats = this._getEffective(target);
    const dmg = this._calcDamage(pStats.atk, 0, eStats.def, target);
    const combo = this._enemyHasDebuff(target);
    let finalDamage = dmg.damage;
    if (combo) finalDamage = Math.floor(finalDamage * 1.25);
    target.hp = Math.max(0, target.hp - finalDamage);

    const momentumGain = 10 + (dmg.critical ? 10 : 0) + (dmg.effective === 'super' ? 10 : 0) + (combo ? 5 : 0);
    this._gainMomentum(momentumGain);

    this.log.push({ type: 'attack', damage: finalDamage, critical: dmg.critical });
    this._checkVictory();
    return { ...dmg, type: 'attack', damage: finalDamage, combo, momentumGain, targetIndex: this.targetEnemyIndex };
  }

  playerAbility(abilityId, targetIndex) {
    const ability = PLAYER_ABILITIES[abilityId];
    if (!ability || this.player.mp < ability.cost) return null;
    this.player.mp -= ability.cost;

    const confusion = this._maybeConfuseActor(this.player, ability.name);
    if (confusion) return confusion;

    const isAoE = ability.type === 'attack_aoe';

    if (this.counterActive && (ability.type === 'attack' || isAoE)) {
      this.counterActive = false;
      const counterDmg = this._calcDamage(this._getEffective(this.enemy).atk, 15, this._getEffective(this.player).def, this.player);
      this.player.hp = Math.max(0, this.player.hp - counterDmg.damage);
      this._checkDefeat();
      return { type: 'counter', damage: counterDmg.damage, critical: counterDmg.critical, abilityName: ability.name };
    }

    const pStats = this._getEffective(this.player);
    let result = { type: ability.type, abilityName: ability.name };

    switch (ability.type) {
      case 'attack': {
        const target = this._resolveTarget(targetIndex);
        if (!target) return null;
        const eStats = this._getEffective(target);
        const dmg = this._calcDamage(pStats.atk, ability.power, eStats.def, target, ability.tag);
        const combo = this._enemyHasDebuff(target);
        let finalDamage = dmg.damage;
        if (combo) finalDamage = Math.floor(finalDamage * 1.25);
        target.hp = Math.max(0, target.hp - finalDamage);
        const momentumGain = 10 + (dmg.critical ? 10 : 0) + (dmg.effective === 'super' ? 10 : 0) + (combo ? 5 : 0);
        this._gainMomentum(momentumGain);
        result = { ...result, damage: finalDamage, critical: dmg.critical, effective: dmg.effective, combo, momentumGain, targetIndex: this.targetEnemyIndex };
        if (ability.stripBuffs) {
          target.buffs = [];
          result.strippedBuffs = true;
        }
        break;
      }
      case 'attack_aoe': {
        const targets = this.aliveEnemies();
        if (targets.length === 0) return null;
        const hits = [];
        let comboAny = false;
        let critAny = false;
        let superAny = false;
        for (const t of targets) {
          const eStats = this._getEffective(t);
          const dmg = this._calcDamage(pStats.atk, ability.power, eStats.def, t, ability.tag);
          const combo = this._enemyHasDebuff(t);
          let finalDamage = dmg.damage;
          if (combo) finalDamage = Math.floor(finalDamage * 1.25);
          t.hp = Math.max(0, t.hp - finalDamage);
          if (ability.stripBuffs) t.buffs = [];
          hits.push({ targetIndex: this.enemies.indexOf(t), damage: finalDamage, critical: dmg.critical, effective: dmg.effective, combo });
          comboAny = comboAny || combo;
          critAny = critAny || dmg.critical;
          superAny = superAny || dmg.effective === 'super';
        }
        const momentumGain = 10 + (critAny ? 10 : 0) + (superAny ? 10 : 0) + (comboAny ? 5 : 0) + Math.min(10, (targets.length - 1) * 5);
        this._gainMomentum(momentumGain);
        result = {
          ...result,
          aoe: true,
          hits,
          damage: hits.reduce((s, h) => s + h.damage, 0),
          critical: critAny,
          effective: superAny ? 'super' : null,
          combo: comboAny,
          momentumGain,
          strippedBuffs: !!ability.stripBuffs,
        };
        break;
      }
      case 'heal': {
        const healAmt = ability.healAmount;
        this.player.hp = Math.min(this.player.maxHP, this.player.hp + healAmt);
        result = { ...result, healAmount: healAmt, skipsTurn: ability.skipsTurn };
        break;
      }
      case 'buff': {
        this.player.buffs.push({
          stats: ability.buffAmount,
          duration: ability.buffDuration,
          name: ability.name,
        });
        if (ability.special === 'block_next') {
          this.player.blockNext = true;
          result.blockNext = true;
        }
        result = { ...result, buffAmount: ability.buffAmount, duration: ability.buffDuration };
        break;
      }
      case 'debuff': {
        const target = this._resolveTarget(targetIndex);
        if (!target) return null;
        target.buffs.push({
          stats: ability.debuffAmount,
          duration: ability.debuffDuration,
          name: ability.name,
        });
        result = { ...result, debuffAmount: ability.debuffAmount, duration: ability.debuffDuration, targetIndex: this.targetEnemyIndex };
        break;
      }
      case 'stall': {
        this._gainMomentum(ability.momentumGain || 25);
        result = { ...result, momentumGain: ability.momentumGain || 25, skipsTurn: true };
        break;
      }
      case 'special': {
        if (ability.special === 'double_turn') {
          result.doubleTurn = true;
          if (ability.debuffAmount) {
            // Apply debuff to all alive enemies for double_turn (Temporal Audit) — feels right thematically
            for (const t of this.aliveEnemies()) {
              t.buffs.push({
                stats: ability.debuffAmount,
                duration: ability.debuffDuration || 2,
                name: ability.name,
              });
            }
            result.debuffAmount = ability.debuffAmount;
          }
        }
        break;
      }
    }

    this._checkVictory();
    return result;
  }

  playerItem(itemId) {
    const item = ITEMS[itemId];
    if (!item) return null;

    const confusion = this._maybeConfuseActor(this.player, item.name);
    if (confusion) return confusion;

    let result = { type: 'item', itemName: item.name };
    switch (item.type) {
      case 'restore_hp':
        this.player.hp = Math.min(this.player.maxHP, this.player.hp + item.amount);
        result.healAmount = item.amount;
        result.healType = 'hp';
        break;
      case 'restore_mp':
        this.player.mp = Math.min(this.player.maxMP, this.player.mp + item.amount);
        result.healAmount = item.amount;
        result.healType = 'mp';
        break;
      case 'restore_mp_buff':
        this.player.mp = Math.min(this.player.maxMP, this.player.mp + item.amount);
        if (item.buff) {
          this.player.buffs.push({ stats: item.buff, duration: item.duration, name: item.name });
        }
        result.healAmount = item.amount;
        result.healType = 'mp';
        break;
      case 'buff':
        this.player.buffs.push({ stats: item.buff, duration: item.duration, name: item.name });
        result.buffAmount = item.buff;
        break;
    }
    return result;
  }

  playerFlee() {
    const pSpd = this._getEffective(this.player).spd;
    // Fastest enemy speed determines flee resistance
    const eSpd = Math.max(...this.aliveEnemies().map(e => this._getEffective(e).spd), 0);
    const chance = COMBAT.FLEE_BASE_CHANCE + (pSpd - eSpd) * 0.05;
    if (Math.random() < chance) {
      this.isOver = true;
      this.result = 'flee';
      return { success: true };
    }
    return { success: false };
  }

  // ── Ally (AI) action ──────────────────────────────────────────────────
  // Plays the active non-player ally's turn. Returns a result object describing
  // what happened. Caller (CombatState) drives animation/UI from this.
  allyTurn(allyIndex) {
    const ally = this.allies[allyIndex];
    if (!ally || ally.hp <= 0) return null;

    const confusion = this._maybeConfuseActor(ally, 'attack');
    if (confusion) {
      return { ...confusion, allyIndex };
    }

    const abilityId = this._pickAllyAbility(ally);
    const ability = ALLY_ABILITIES[abilityId];
    if (!ability) {
      // Default basic attack
      const target = this._resolveTarget();
      if (!target) return null;
      const aStats = this._getEffective(ally);
      const eStats = this._getEffective(target);
      const dmg = this._calcDamage(aStats.atk, 0, eStats.def, target, null);
      target.hp = Math.max(0, target.hp - dmg.damage);
      this._checkVictory();
      return { type: 'ally_attack', allyIndex, allyName: ally.name, abilityName: 'Strike', damage: dmg.damage, critical: dmg.critical, targetIndex: this.targetEnemyIndex };
    }

    if (ability.cost && ally.mp < ability.cost) {
      // Fallback to basic if not enough MP
      const target = this._resolveTarget();
      const aStats = this._getEffective(ally);
      const eStats = this._getEffective(target);
      const dmg = this._calcDamage(aStats.atk, 0, eStats.def, target, null);
      target.hp = Math.max(0, target.hp - dmg.damage);
      this._checkVictory();
      return { type: 'ally_attack', allyIndex, allyName: ally.name, abilityName: 'Strike', damage: dmg.damage, critical: dmg.critical, targetIndex: this.targetEnemyIndex };
    }
    if (ability.cost) ally.mp = Math.max(0, ally.mp - ability.cost);

    const aStats = this._getEffective(ally);
    let result = { type: 'ally_' + ability.type, allyIndex, allyName: ally.name, abilityName: ability.name, message: pickMessage(ability.messages || ability.message) };

    switch (ability.type) {
      case 'attack': {
        const target = this._pickAllyAttackTarget(ally);
        if (!target) return null;
        const eStats = this._getEffective(target);
        const dmg = this._calcDamage(aStats.atk, ability.power || 10, eStats.def, target, ability.tag);
        target.hp = Math.max(0, target.hp - dmg.damage);
        result = { ...result, damage: dmg.damage, critical: dmg.critical, effective: dmg.effective, targetIndex: this.enemies.indexOf(target) };
        break;
      }
      case 'attack_aoe': {
        const targets = this.aliveEnemies();
        if (targets.length === 0) return null;
        const hits = [];
        for (const t of targets) {
          const eStats = this._getEffective(t);
          const dmg = this._calcDamage(aStats.atk, ability.power || 10, eStats.def, t, ability.tag);
          t.hp = Math.max(0, t.hp - dmg.damage);
          hits.push({ targetIndex: this.enemies.indexOf(t), damage: dmg.damage, critical: dmg.critical, effective: dmg.effective });
        }
        result = { ...result, aoe: true, hits, damage: hits.reduce((s, h) => s + h.damage, 0) };
        break;
      }
      case 'heal_ally': {
        // Pick the most-wounded ally (excluding fully-healthy)
        const candidates = this.aliveAllies().slice().sort((a, b) => (a.hp / a.maxHP) - (b.hp / b.maxHP));
        const tgt = candidates[0] || ally;
        const heal = ability.healAmount || 30;
        tgt.hp = Math.min(tgt.maxHP, tgt.hp + heal);
        result = { ...result, healAmount: heal, healTargetAllyIndex: this.allies.indexOf(tgt), healTargetName: tgt.name };
        break;
      }
      case 'buff_party': {
        for (const a of this.aliveAllies()) {
          a.buffs.push({ stats: ability.buffAmount, duration: ability.buffDuration || 2, name: ability.name });
        }
        result = { ...result, buffAmount: ability.buffAmount, duration: ability.buffDuration || 2 };
        break;
      }
      case 'debuff': {
        const target = this._pickAllyAttackTarget(ally);
        if (!target) return null;
        target.buffs.push({ stats: ability.debuffAmount, duration: ability.debuffDuration || 2, name: ability.name });
        result = { ...result, debuffAmount: ability.debuffAmount, duration: ability.debuffDuration || 2, targetIndex: this.enemies.indexOf(target) };
        break;
      }
    }

    this._checkVictory();
    return result;
  }

  _pickAllyAbility(ally) {
    const pattern = ALLY_AI_PATTERNS[ally.allyId] || { type: 'rotation' };
    const abilities = ally.abilities || [];
    if (abilities.length === 0) return null;

    // Heal preference if any ally is below threshold
    const lowestHpRatio = Math.min(...this.aliveAllies().map(a => a.hp / a.maxHP));
    if (lowestHpRatio < 0.4) {
      const healAbility = abilities.find(id => ALLY_ABILITIES[id]?.type === 'heal_ally');
      if (healAbility && Math.random() < 0.65) return healAbility;
    }

    // Two or more enemies + has AoE → bias toward AoE
    if (this.aliveEnemies().length >= 2) {
      const aoe = abilities.find(id => ALLY_ABILITIES[id]?.type === 'attack_aoe');
      if (aoe && Math.random() < 0.55) return aoe;
    }

    if (pattern.type === 'rotation') {
      const pick = abilities[(ally._rotation || 0) % abilities.length];
      ally._rotation = (ally._rotation || 0) + 1;
      return pick;
    }
    return abilities[Math.floor(Math.random() * abilities.length)];
  }

  // Allies focus the lowest-HP enemy (helps cleanup) by default
  _pickAllyAttackTarget(ally) {
    const alive = this.aliveEnemies();
    if (alive.length === 0) return null;
    return alive.slice().sort((a, b) => a.hp - b.hp)[0];
  }

  // ── Enemy turn ────────────────────────────────────────────────────────
  // Executes one enemy's turn. Caller (CombatState) iterates through enemies in SPD order.
  enemyTurn(enemyIndex) {
    if (this.isOver) return null;
    const enemy = this.enemies[enemyIndex];
    if (!enemy || enemy.hp <= 0) return null;

    // Counter expires at start of any enemy turn
    this.counterActive = false;

    // blockNext consumes only the FIRST enemy turn that comes after it
    if (this.player.blockNext) {
      this.player.blockNext = false;
      enemy.telegraphedAbility = null;
      this.turnCount++;
      return { type: 'blocked', message: `Blocked! ${enemy.name}'s action was nullified!`, enemyIndex };
    }

    const abilityId = enemy.telegraphedAbility ?? this._pickEnemyAbility(enemy);
    enemy.telegraphedAbility = null;
    const previousAbilityId = enemy.lastAbility;

    // Pick an ally target (aggro). Confuse/counter/heal/buff/repeat are special and stay player-centric.
    const ability = ENEMY_ABILITIES[abilityId];
    const targetingType = ability?.type;
    let target = this.player;
    let targetAllyIndex = 0;
    const allySensitive = ['attack', 'dot', 'debuff', 'stun', 'silence', 'summon'];
    if (allySensitive.includes(targetingType)) {
      target = this._pickEnemyTarget();
      targetAllyIndex = this.allies.indexOf(target);
    }
    enemy.lastTargetAllyIndex = targetAllyIndex;

    const eStats = this._getEffective(enemy);
    const tStats = this._getEffective(target);
    const result = this._executeEnemyAbility(enemy, abilityId, eStats, tStats, previousAbilityId, target);

    if (abilityId && ENEMY_ABILITIES[abilityId]?.type !== 'repeat') {
      enemy.lastAbility = abilityId;
    }

    this.turnCount++;
    this._checkDefeat();
    return result ? { ...result, enemyIndex, enemyName: enemy.name, targetAllyIndex, targetAllyName: target.name } : null;
  }

  // Pick which ally an enemy attacks. 60% bias toward Andrew (the player main),
  // otherwise lowest-HP-ratio alive ally. Allies with `protected > 0` get
  // weighted lower; allies that are dead are excluded.
  _pickEnemyTarget() {
    const alive = this.allies.filter(a => a.hp > 0);
    if (alive.length === 0) return this.player;
    if (alive.length === 1) return alive[0];
    // Andrew bias
    if (alive.includes(this.player) && Math.random() < 0.55) return this.player;
    // Otherwise pick lowest HP ratio — gang up on the wounded
    return alive.slice().sort((a, b) => (a.hp / a.maxHP) - (b.hp / b.maxHP))[0];
  }

  // Pre-roll telegraphed abilities for ALL alive enemies — call at start of player phase
  telegraph() {
    for (const e of this.enemies) {
      if (e.hp > 0) e.telegraphedAbility = this._pickEnemyAbility(e);
      else e.telegraphedAbility = null;
    }
    return this.enemies.map(e => e.telegraphedAbility);
  }

  // Per-target enemy-ability execution.
  // `target` is the ally being acted on (defaults to Andrew). pStats == effective stats of target.
  // Bracing/retaliateReady only applies when target IS Andrew (it's a player-input mechanic).
  _executeEnemyAbility(enemy, abilityId, eStats, pStats, previousAbilityId = null, target = this.player) {
    const ability = ENEMY_ABILITIES[abilityId];
    if (!ability) {
      const dmg = this._calcDamage(eStats.atk, 10, pStats.def, target);
      target.hp = Math.max(0, target.hp - dmg.damage);
      return { type: 'attack', damage: dmg.damage, critical: dmg.critical, message: `${enemy.name} attacks ${target.isPlayer ? 'you' : target.name}!` };
    }

    let result = { type: ability.type, abilityName: ability.name, message: pickMessage(ability.messages || ability.message) };

    switch (ability.type) {
      case 'attack': {
        const dmg = this._calcDamage(eStats.atk, ability.power, pStats.def, target);
        let finalDamage = dmg.damage;
        let braced = false;
        if (target.isPlayer && this.player.bracing) {
          finalDamage = Math.floor(finalDamage * 0.5);
          this.player.bracing = false;
          braced = true;
          this.player.retaliateReady = true;
        }
        target.hp = Math.max(0, target.hp - finalDamage);
        result.damage = finalDamage;
        result.critical = dmg.critical;
        result.braced = braced;
        break;
      }
      case 'dot': {
        target.dots.push({
          damage: ability.power,
          duration: ability.duration,
          name: ability.name,
        });
        break;
      }
      case 'heal': {
        const heal = ability.healAmount;
        enemy.hp = Math.min(enemy.maxHP, enemy.hp + heal);
        result.healAmount = heal;
        enemy.vulnerable = 1;
        break;
      }
      case 'debuff': {
        target.buffs.push({
          stats: ability.debuff,
          duration: ability.duration,
          name: ability.name,
        });
        break;
      }
      case 'confuse': {
        // Confuse always centers on Andrew — it's a player-only UI mechanic
        this.player.confused = Math.max(this.player.confused, ability.duration);
        enemy.vulnerable = 1;
        enemy.confuseCooldown = 3;
        break;
      }
      case 'stun': {
        target.stunned = Math.max(target.stunned, ability.duration);
        break;
      }
      case 'silence': {
        target.silenced = Math.max(target.silenced, ability.duration);
        break;
      }
      case 'counter': {
        this.counterActive = true;
        break;
      }
      case 'repeat': {
        if (previousAbilityId && previousAbilityId !== abilityId) {
          const repeated = this._executeEnemyAbility(enemy, previousAbilityId, eStats, pStats, previousAbilityId, target);
          if (repeated) {
            repeated.message = `${pickMessage(ability.messages || ability.message)} ${repeated.message}`.trim();
            return repeated;
          }
        }
        const dmg = this._calcDamage(eStats.atk, 15, pStats.def, target);
        target.hp = Math.max(0, target.hp - dmg.damage);
        result.damage = dmg.damage;
        result.message = `${pickMessage(ability.messages || ability.message)} It devolves into a louder basic attack.`;
        break;
      }
      case 'summon': {
        const dmg = this._calcDamage(eStats.atk, ability.power || 8, pStats.def, target);
        let finalDamage = dmg.damage;
        let braced = false;
        if (target.isPlayer && this.player.bracing) {
          finalDamage = Math.floor(finalDamage * 0.5);
          this.player.bracing = false;
          braced = true;
        }
        target.hp = Math.max(0, target.hp - finalDamage);
        result.damage = finalDamage;
        result.braced = braced;
        break;
      }
    }
    return result;
  }

  _pickEnemyAbility(enemy) {
    let abilities = enemy.abilities;
    if (enemy.phases) {
      const hpPercent = enemy.hp / enemy.maxHP;
      let activePhase = null;
      for (const phase of enemy.phases) {
        if (hpPercent <= phase.hpThreshold) {
          if (!activePhase || phase.hpThreshold <= activePhase.hpThreshold) {
            activePhase = phase;
          }
        }
      }
      if (activePhase) abilities = activePhase.abilities;
    }
    if (!abilities || abilities.length === 0) return null;

    const pattern = ENEMY_AI_PATTERNS[enemy.enemyId];
    if (!pattern) return this._pickRandom(abilities, true, enemy);

    switch (pattern.pattern) {
      case 'random':
        return this._pickRandom(abilities, true, enemy);

      case 'escalating': {
        const seq = pattern.sequence || [];
        if (enemy.abilityIndex < seq.length) {
          const pick = seq[enemy.abilityIndex];
          enemy.abilityIndex++;
          if (abilities.includes(pick)) return pick;
        }
        if (pattern.randomAfter) return abilities[Math.floor(Math.random() * abilities.length)];
        const last = seq[seq.length - 1];
        return abilities.includes(last) ? last : abilities[Math.floor(Math.random() * abilities.length)];
      }

      case 'aggressive': {
        const preferAttack = pattern.preferAttack || 0.7;
        if (Math.random() < preferAttack) {
          const attackAbilities = abilities.filter((id) => {
            const a = ENEMY_ABILITIES[id];
            return a && (a.type === 'attack' || a.type === 'dot');
          });
          if (attackAbilities.length > 0) return attackAbilities[Math.floor(Math.random() * attackAbilities.length)];
        }
        return abilities[Math.floor(Math.random() * abilities.length)];
      }

      case 'tactical': {
        const hpPercent = enemy.hp / enemy.maxHP;
        const healThreshold = pattern.healThreshold || 0.5;
        const healChance = pattern.healChance ?? 0.6;
        if (hpPercent < healThreshold) {
          const healAbility = abilities.find((id) => ENEMY_ABILITIES[id]?.type === 'heal');
          if (healAbility && Math.random() < healChance) return healAbility;
        }
        const debuffChance = pattern.debuffChance || 0.3;
        if (Math.random() < debuffChance) {
          const debuffAbilities = abilities.filter((id) => {
            const a = ENEMY_ABILITIES[id];
            if (!a) return false;
            if (a.type === 'confuse' && (this.player.confused > 0 || enemy.confuseCooldown > 0)) return false;
            return a.type === 'debuff' || a.type === 'confuse';
          });
          if (debuffAbilities.length > 0) return debuffAbilities[Math.floor(Math.random() * debuffAbilities.length)];
        }
        return abilities[Math.floor(Math.random() * abilities.length)];
      }

      case 'rotation': {
        const pick = abilities[enemy.abilityIndex % abilities.length];
        enemy.abilityIndex++;
        return pick;
      }

      case 'strategic': {
        const p1 = pattern.phase1 || [];
        const p2 = pattern.phase2 || [];
        if (enemy.abilityIndex < p1.length) {
          const pick = p1[enemy.abilityIndex];
          enemy.abilityIndex++;
          return abilities.includes(pick) ? pick : abilities[Math.floor(Math.random() * abilities.length)];
        }
        const p2Index = (enemy.abilityIndex - p1.length) % p2.length;
        enemy.abilityIndex++;
        const pick = p2[p2Index];
        return abilities.includes(pick) ? pick : abilities[Math.floor(Math.random() * abilities.length)];
      }

      case 'chaotic': {
        let pool = [...abilities];
        if (this.counterActive) pool = pool.filter(a => ENEMY_ABILITIES[a]?.type !== 'stun');
        if (this.player.stunned > 0) pool = pool.filter(a => ENEMY_ABILITIES[a]?.type !== 'counter');
        if (pool.length > 1 && enemy.lastAbility) {
          const noRepeat = pool.filter(a => a !== enemy.lastAbility);
          if (noRepeat.length > 0) pool = noRepeat;
        }
        if (pool.length === 0) pool = abilities;
        return pool[Math.floor(Math.random() * pool.length)];
      }

      default:
        return this._pickRandom(abilities, true, enemy);
    }
  }

  _pickRandom(abilities, healPreference = false, enemy = null) {
    if (healPreference && enemy) {
      const hpPercent = enemy.hp / enemy.maxHP;
      if (hpPercent < 0.3) {
        const healAbility = abilities.find((id) => ENEMY_ABILITIES[id]?.type === 'heal');
        if (healAbility && Math.random() < 0.6) return healAbility;
      }
    }
    let pool = abilities;
    if (this.player.confused > 0 || (enemy && enemy.confuseCooldown > 0)) {
      const filtered = abilities.filter((id) => ENEMY_ABILITIES[id]?.type !== 'confuse');
      if (filtered.length > 0) pool = filtered;
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Per-actor turn-start processing ───────────────────────────────────
  // who: 'player' (legacy), 'enemy' (legacy = first alive enemy), or pass an entity directly
  processTurnStart(who) {
    let entity, isPlayerSide, isEnemySide;
    if (who === 'player') {
      entity = this.player;
      isPlayerSide = true;
      isEnemySide = false;
    } else if (who === 'enemy') {
      entity = this.enemy;
      isPlayerSide = false;
      isEnemySide = true;
    } else {
      // Direct entity reference
      entity = who;
      isPlayerSide = !!entity?.isPlayer;
      isEnemySide = this.enemies.includes(entity);
    }
    if (!entity) return [];

    const results = [];

    if (isPlayerSide || (entity && entity.allyId)) {
      entity.stunnedThisTurn = entity.stunned > 0;
      entity.confusedThisTurn = entity.confused > 0;
    }

    for (let i = entity.dots.length - 1; i >= 0; i--) {
      const dot = entity.dots[i];
      const dmg = Math.floor(dot.damage * 0.7);
      entity.hp = Math.max(0, entity.hp - dmg);
      dot.duration--;
      results.push({ type: 'dot', damage: dmg, name: dot.name });
      if (dot.duration <= 0) entity.dots.splice(i, 1);
    }

    for (let i = entity.buffs.length - 1; i >= 0; i--) {
      entity.buffs[i].duration--;
      if (entity.buffs[i].duration < 0) {
        results.push({ type: 'buff_expire', name: entity.buffs[i].name });
        entity.buffs.splice(i, 1);
      }
    }

    if (isPlayerSide || (entity && entity.allyId)) {
      if (entity.stunnedThisTurn) {
        entity.stunned--;
        results.push({ type: 'stunned' });
      }
      if (entity.confusedThisTurn) {
        entity.confused--;
        results.push({ type: 'confused' });
      }
      if (entity.silenced > 0) {
        entity.silencedThisTurn = true;
        entity.silenced--;
        results.push({ type: 'silenced', message: 'Silenced! Can only use basic attacks.' });
      } else {
        entity.silencedThisTurn = false;
      }
    }

    if (isEnemySide && entity.confuseCooldown > 0) {
      entity.confuseCooldown--;
    }

    if (entity.exposed > 0) {
      entity.exposed--;
      if (entity.exposed <= 0) results.push({ type: 'status_expire', message: 'Expose wore off.' });
    }
    if (entity.protected > 0) {
      entity.protected--;
      if (entity.protected <= 0) results.push({ type: 'status_expire', message: 'Protect wore off.' });
    }
    if (isEnemySide && entity.vulnerable > 0) entity.vulnerable--;

    if (isPlayerSide) this._checkDefeat();
    else if (isEnemySide) this._checkVictory();

    return results;
  }

  isPlayerStunned() { return this.player.stunnedThisTurn; }
  isPlayerConfused() { return this.player.confusedThisTurn; }

  _checkVictory() {
    if (this.aliveEnemies().length === 0) {
      this.isOver = true;
      this.result = 'victory';
    }
  }

  _checkDefeat() {
    if (this.aliveAllies().length === 0) {
      // Specifically: if Andrew is dead, it's defeat (even if other allies are alive — Andrew is the player).
      // If Andrew alive but other allies dead, that's not defeat.
      if (this.player.hp <= 0) {
        if (this.player.posterActive && !this.player.posterUsed) {
          this.player.hp = 1;
          this.player.posterUsed = true;
          this.posterJustTriggered = true;
          return;
        }
        this.isOver = true;
        this.result = 'defeat';
      }
      return;
    }
    if (this.player.hp <= 0) {
      if (this.player.posterActive && !this.player.posterUsed) {
        this.player.hp = 1;
        this.player.posterUsed = true;
        this.posterJustTriggered = true;
        return;
      }
      this.isOver = true;
      this.result = 'defeat';
    }
  }

  // ── Special player actions ────────────────────────────────────────────
  playerBrace(quality = 'good') {
    const cfg = {
      perfect: { defBonus: 8, duration: 3, halve: true },
      good:    { defBonus: 5, duration: 2, halve: true },
      miss:    { defBonus: 2, duration: 1, halve: false },
    }[quality] || { defBonus: 5, duration: 2, halve: true };
    if (cfg.halve) this.player.bracing = true;
    this.player.buffs.push({ stats: { def: cfg.defBonus }, duration: cfg.duration, name: 'Brace Stance' });
    return { type: 'brace', defBonus: cfg.defBonus, duration: cfg.duration, quality };
  }

  playerPowerMove(targetIndex) {
    if (this.player.momentum < 100) return null;
    const target = this._resolveTarget(targetIndex);
    if (!target) return null;
    const pStats = this._getEffective(this.player);
    const baseDmg = (pStats.atk + 75) * COMBAT.BASE_DAMAGE_MULTIPLIER;
    const damage = Math.max(10, Math.floor(baseDmg + randomRange(-5, 5)));
    target.hp = Math.max(0, target.hp - damage);
    this.player.momentum = 0;
    this._checkVictory();
    return { type: 'power_move', damage, targetIndex: this.targetEnemyIndex };
  }

  getPressAdvantageCost() {
    const spd = this._getEffective(this.player).spd;
    return Math.max(15, 25 - Math.floor((spd - 8) * 0.5));
  }

  playerPressAdvantage(targetIndex) {
    const cost = this.getPressAdvantageCost();
    if (this.player.momentum < cost) return null;
    const target = this._resolveTarget(targetIndex);
    if (!target) return null;
    const pStats = this._getEffective(this.player);
    const eStats = this._getEffective(target);
    const dmg = this._calcDamage(pStats.atk, 18, eStats.def, target);
    const combo = this._enemyHasDebuff(target);
    let finalDamage = dmg.damage;
    if (combo) finalDamage = Math.floor(finalDamage * 1.25);
    target.hp = Math.max(0, target.hp - finalDamage);
    target.buffs.push({ stats: { def: -5 }, duration: 2, name: 'Press Advantage' });
    this.player.momentum = Math.max(0, this.player.momentum - cost);
    this._checkVictory();
    return { type: 'press_advantage', damage: finalDamage, critical: dmg.critical, combo, targetIndex: this.targetEnemyIndex };
  }

  playerSecondWind() {
    if (this.player.momentum < 50) return null;
    const healAmt = 75;
    this.player.hp = Math.min(this.player.maxHP, this.player.hp + healAmt);
    let clearedStatus = null;
    if (this.player.confused > 0) { this.player.confused = 0; clearedStatus = 'confusion'; }
    else if (this.player.stunned > 0) { this.player.stunned = 0; clearedStatus = 'stun'; }
    this.player.momentum = Math.max(0, this.player.momentum - 50);
    return { type: 'second_wind', healAmount: healAmt, clearedStatus };
  }

  playerRetaliate(multiplier = 1.0, targetIndex) {
    if (!this.player.retaliateReady) return null;
    this.player.retaliateReady = false;
    const target = this._resolveTarget(targetIndex);
    if (!target) return null;
    const pStats = this._getEffective(this.player);
    const eStats = this._getEffective(target);
    const dmg = this._calcDamage(pStats.atk, 22, eStats.def, target);
    const finalDamage = Math.max(1, Math.floor(dmg.damage * multiplier));
    target.hp = Math.max(0, target.hp - finalDamage);
    this._gainMomentum(Math.floor(15 * multiplier));
    this._checkVictory();
    return { type: 'retaliate', damage: finalDamage, critical: dmg.critical && multiplier >= 1.0, targetIndex: this.targetEnemyIndex };
  }

  playerDesperateGamble(risk, targetIndex) {
    const target = this._resolveTarget(targetIndex);
    if (!target) return null;
    const pStats = this._getEffective(this.player);
    const eStats = this._getEffective(target);
    const dmg = this._calcDamage(pStats.atk, 15, eStats.def, target);
    let multiplier = 1.0;
    let success = true;
    if (risk === 'risky') {
      success = Math.random() < 0.6;
      multiplier = success ? 1.5 : 0.5;
    } else if (risk === 'all_in') {
      success = Math.random() < 0.3;
      multiplier = success ? 2.5 : 0;
    }
    const finalDamage = Math.max(success ? 1 : 0, Math.floor(dmg.damage * multiplier));
    if (finalDamage > 0) {
      target.hp = Math.max(0, target.hp - finalDamage);
      this._gainMomentum(10);
    }
    this._checkVictory();
    return { type: 'desperate_gamble', damage: finalDamage, risk, success, critical: dmg.critical && success && multiplier >= 1.5, targetIndex: this.targetEnemyIndex };
  }

  // Returns the currently-active phase index for the primary (target) enemy. Used for boss phase animations.
  getActivePhaseIndex() {
    const enemy = this.enemy;
    if (!enemy?.phases) return -1;
    const hpPercent = enemy.hp / enemy.maxHP;
    let activeIndex = -1;
    let lowestThreshold = Infinity;
    for (let i = 0; i < enemy.phases.length; i++) {
      const phase = enemy.phases[i];
      if (hpPercent <= phase.hpThreshold && phase.hpThreshold <= lowestThreshold) {
        lowestThreshold = phase.hpThreshold;
        activeIndex = i;
      }
    }
    return activeIndex;
  }

  // Total XP from all defeated enemies (sum of xpReward)
  getXPReward() {
    return this.enemies.reduce((sum, e) => sum + (e.xpReward || 0), 0);
  }

  // ── Voices ("Reasonable Doubt") ───────────────────────────────────────
  // Returns the list of voices that are currently available to fire.
  // Called at the start of each player (Andrew) turn by CombatState.
  getAvailableVoices() {
    const out = [];
    for (const [id, voice] of Object.entries(VOICES)) {
      if (this.voiceState.fired[id]) continue;
      if (id === 'skeptic' && this.voiceState.skepticLocked) continue;
      try {
        if (voice.trigger(this)) out.push({ ...voice });
      } catch { /* trigger fn safety */ }
    }
    return out;
  }

  // Execute a voice action. Returns the result object from the action's effect().
  // Marks the voice as fired this combat. Voice actions are FREE — no MP cost,
  // do not advance the round queue (CombatState calls _processNextTurn after).
  playerVoiceAction(actionId, targetIndex) {
    const action = VOICE_ACTIONS[actionId];
    if (!action) return null;
    const voice = VOICES[action.voice];
    if (!voice) return null;
    if (this.voiceState.fired[action.voice]) return null;
    if (action.voice === 'skeptic' && this.voiceState.skepticLocked) return null;

    const result = action.effect(this, targetIndex);
    if (!result) return null;
    this.voiceState.fired[action.voice] = true;
    this.voiceState.lastVoiceUsed = action.voice;
    return {
      ...result,
      voiceId: action.voice,
      voiceName: voice.name,
      voiceColor: voice.color,
      actionName: action.name,
      actionDescription: action.description,
      quote: action.quote,
      actionId,
    };
  }

  // Track signals voices listen for. Called by CombatState at appropriate points.
  noteCrit() { this.voiceState.sawCrit = true; }
  noteEnemyHeal() { this.voiceState.sawEnemyHeal = true; }
  noteDamageTakenByPlayer() { this.voiceState.tookDamageRecently = true; }
  clearRecentDamageNote() { this.voiceState.tookDamageRecently = false; }
}
