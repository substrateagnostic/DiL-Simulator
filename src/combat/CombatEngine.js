import { PLAYER_ABILITIES, ENEMY_ABILITIES, ENEMY_STATS, ITEMS, pickMessage } from '../data/stats.js';
import { COMBAT } from '../utils/constants.js';
import { randomRange } from '../utils/math.js';
import { ENEMY_AI_PATTERNS } from '../combat/EnemyAI.js';

export class CombatEngine {
  constructor(playerStats, enemyId) {
    this.player = {
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
    };
    this.enemy = { ...ENEMY_STATS[enemyId], buffs: [], dots: [], lastAbility: null, exposed: 0, protected: 0 };
    this.enemyId = enemyId;
    this.turn = 'player';
    this.turnCount = 0;
    this.abilityIndex = 0;
    this.isOver = false;
    this.result = null;
    this.log = [];
    this.counterActive = false;
  }

  _calcDamage(attackerAtk, power, defenderDef, target = null) {
    const baseDmg = (attackerAtk + power) * COMBAT.BASE_DAMAGE_MULTIPLIER;
    const defense = defenderDef * COMBAT.DEFENSE_FACTOR;
    let damage = Math.max(1, Math.floor(baseDmg - defense + randomRange(-3, 3)));

    let critical = false;
    if (Math.random() < COMBAT.CRITICAL_CHANCE) {
      damage = Math.floor(damage * COMBAT.CRITICAL_MULTIPLIER);
      critical = true;
    }

    // Apply expose/protect modifiers
    if (target) {
      if (target.exposed > 0) damage = Math.floor(damage * 1.3);
      if (target.protected > 0) damage = Math.floor(damage * 0.5);
    }

    return { damage, critical };
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

  _maybeConfusePlayer(actionLabel) {
    if (!this.player.confusedThisTurn) return null;
    if (Math.random() >= 0.5) return null;

    const playerStats = this._getEffective(this.player);
    const selfHit = this._calcDamage(playerStats.atk, 6, playerStats.def);
    this.player.hp = Math.max(0, this.player.hp - selfHit.damage);
    this._checkDefeat();

    return {
      type: 'confused',
      damage: selfHit.damage,
      critical: selfHit.critical,
      message: `Confused by corporate nonsense, your ${actionLabel} backfires!`,
    };
  }

  playerAttack() {
    const confusion = this._maybeConfusePlayer('attack');
    if (confusion) return confusion;

    if (this.counterActive) {
      // Basic attack breaks through counter at half power
      this.counterActive = false;
      const pStats = this._getEffective(this.player);
      const eStats = this._getEffective(this.enemy);
      const result = this._calcDamage(pStats.atk, 5, eStats.def, this.enemy);
      this.enemy.hp = Math.max(0, this.enemy.hp - result.damage);
      // Also clear stun — fighting through the corporate BS
      this.player.stunned = 0;
      this.player.stunnedThisTurn = false;
      this.log.push({ type: 'break_counter', damage: result.damage });
      this._checkVictory();
      return { ...result, type: 'break_counter', message: 'Pushed through the counter! Reduced damage dealt.' };
    }

    const pStats = this._getEffective(this.player);
    const eStats = this._getEffective(this.enemy);
    const result = this._calcDamage(pStats.atk, 10, eStats.def, this.enemy);
    this.enemy.hp = Math.max(0, this.enemy.hp - result.damage);
    this.log.push({ type: 'attack', damage: result.damage, critical: result.critical });

    this._checkVictory();
    return result;
  }

  playerAbility(abilityId) {
    const ability = PLAYER_ABILITIES[abilityId];
    if (!ability || this.player.mp < ability.cost) return null;

    this.player.mp -= ability.cost;

    const confusion = this._maybeConfusePlayer(ability.name);
    if (confusion) return confusion;

    if (this.counterActive && ability.type === 'attack') {
      this.counterActive = false;
      const counterDmg = this._calcDamage(this._getEffective(this.enemy).atk, 15, this._getEffective(this.player).def, this.player);
      this.player.hp = Math.max(0, this.player.hp - counterDmg.damage);
      this._checkDefeat();
      return { type: 'counter', damage: counterDmg.damage, critical: counterDmg.critical, abilityName: ability.name };
    }

    const pStats = this._getEffective(this.player);
    const eStats = this._getEffective(this.enemy);
    let result = { type: ability.type, abilityName: ability.name };

    switch (ability.type) {
      case 'attack':
      case 'attack_aoe': {
        const dmg = this._calcDamage(pStats.atk, ability.power, eStats.def, this.enemy);
        this.enemy.hp = Math.max(0, this.enemy.hp - dmg.damage);
        result = { ...result, damage: dmg.damage, critical: dmg.critical };
        // Handle stripBuffs special
        if (ability.stripBuffs) {
          this.enemy.buffs = [];
          result.strippedBuffs = true;
        }
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
        // Handle block_next special
        if (ability.special === 'block_next') {
          this.player.blockNext = true;
          result.blockNext = true;
        }
        result = { ...result, buffAmount: ability.buffAmount, duration: ability.buffDuration };
        break;
      }
      case 'debuff': {
        this.enemy.buffs.push({
          stats: ability.debuffAmount,
          duration: ability.debuffDuration,
          name: ability.name,
        });
        result = { ...result, debuffAmount: ability.debuffAmount, duration: ability.debuffDuration };
        break;
      }
      case 'special': {
        if (ability.special === 'double_turn') {
          result.doubleTurn = true;
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

    const confusion = this._maybeConfusePlayer(item.name);
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
    const eSpd = this._getEffective(this.enemy).spd;
    const chance = COMBAT.FLEE_BASE_CHANCE + (pSpd - eSpd) * 0.05;
    if (Math.random() < chance) {
      this.isOver = true;
      this.result = 'flee';
      return { success: true };
    }
    return { success: false };
  }

  enemyTurn() {
    if (this.isOver) return null;

    // Counter expires at start of enemy turn — prevents stun+counter lock
    this.counterActive = false;

    // Check if player's blockNext is active
    if (this.player.blockNext) {
      this.player.blockNext = false;
      this.turnCount++;
      return { type: 'blocked', message: 'Blocked! The enemy\'s action was nullified!' };
    }

    const eStats = this._getEffective(this.enemy);
    const pStats = this._getEffective(this.player);
    const abilityId = this._pickEnemyAbility();
    const previousAbilityId = this.enemy.lastAbility;
    const result = this._executeEnemyAbility(abilityId, eStats, pStats, previousAbilityId);

    if (abilityId && ENEMY_ABILITIES[abilityId]?.type !== 'repeat') {
      this.enemy.lastAbility = abilityId;
    }

    this.turnCount++;
    this._checkDefeat();
    return result;
  }

  _executeEnemyAbility(abilityId, eStats, pStats, previousAbilityId = null) {
    const ability = ENEMY_ABILITIES[abilityId];

    if (!ability) {
      const dmg = this._calcDamage(eStats.atk, 10, pStats.def, this.player);
      this.player.hp = Math.max(0, this.player.hp - dmg.damage);
      return { type: 'attack', damage: dmg.damage, critical: dmg.critical, message: `${this.enemy.name} attacks!` };
    }

    let result = { type: ability.type, abilityName: ability.name, message: pickMessage(ability.messages || ability.message) };

    switch (ability.type) {
      case 'attack': {
        const dmg = this._calcDamage(eStats.atk, ability.power, pStats.def, this.player);
        this.player.hp = Math.max(0, this.player.hp - dmg.damage);
        result.damage = dmg.damage;
        result.critical = dmg.critical;
        break;
      }
      case 'dot': {
        this.player.dots.push({
          damage: ability.power,
          duration: ability.duration,
          name: ability.name,
        });
        break;
      }
      case 'heal': {
        const heal = ability.healAmount;
        this.enemy.hp = Math.min(this.enemy.maxHP, this.enemy.hp + heal);
        result.healAmount = heal;
        break;
      }
      case 'debuff': {
        this.player.buffs.push({
          stats: ability.debuff,
          duration: ability.duration,
          name: ability.name,
        });
        break;
      }
      case 'confuse': {
        this.player.confused = Math.max(this.player.confused, ability.duration);
        break;
      }
      case 'stun': {
        this.player.stunned = Math.max(this.player.stunned, ability.duration);
        break;
      }
      case 'counter': {
        this.counterActive = true;
        break;
      }
      case 'repeat': {
        if (previousAbilityId && previousAbilityId !== abilityId) {
          const repeated = this._executeEnemyAbility(previousAbilityId, eStats, pStats, previousAbilityId);
          if (repeated) {
            repeated.message = `${pickMessage(ability.messages || ability.message)} ${repeated.message}`.trim();
            return repeated;
          }
        }

        const dmg = this._calcDamage(eStats.atk, 15, pStats.def, this.player);
        this.player.hp = Math.max(0, this.player.hp - dmg.damage);
        result.damage = dmg.damage;
        result.message = `${pickMessage(ability.messages || ability.message)} It devolves into a louder basic attack.`;
        break;
      }
      case 'summon': {
        const dmg = this._calcDamage(eStats.atk, ability.power || 8, pStats.def, this.player);
        this.player.hp = Math.max(0, this.player.hp - dmg.damage);
        result.damage = dmg.damage;
        break;
      }
    }

    return result;
  }

  _pickEnemyAbility() {
    // Check for multi-phase boss support
    let abilities = this.enemy.abilities;
    if (this.enemy.phases) {
      const hpPercent = this.enemy.hp / this.enemy.maxHP;
      let activePhase = null;
      for (const phase of this.enemy.phases) {
        if (hpPercent <= phase.hpThreshold) {
          if (!activePhase || phase.hpThreshold >= activePhase.hpThreshold) {
            activePhase = phase;
          }
        }
      }
      if (activePhase) {
        abilities = activePhase.abilities;
      }
    }

    if (!abilities || abilities.length === 0) return null;

    const pattern = ENEMY_AI_PATTERNS[this.enemyId];
    if (!pattern) {
      // Default: random with heal preference at low HP
      return this._pickRandom(abilities, true);
    }

    switch (pattern.pattern) {
      case 'random':
        return this._pickRandom(abilities, true);

      case 'escalating': {
        const seq = pattern.sequence || [];
        if (this.abilityIndex < seq.length) {
          const pick = seq[this.abilityIndex];
          this.abilityIndex++;
          if (abilities.includes(pick)) return pick;
        }
        // Past sequence
        if (pattern.randomAfter) {
          return abilities[Math.floor(Math.random() * abilities.length)];
        }
        // Repeat last in sequence
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
          if (attackAbilities.length > 0) {
            return attackAbilities[Math.floor(Math.random() * attackAbilities.length)];
          }
        }
        return abilities[Math.floor(Math.random() * abilities.length)];
      }

      case 'tactical': {
        const hpPercent = this.enemy.hp / this.enemy.maxHP;
        const healThreshold = pattern.healThreshold || 0.5;
        if (hpPercent < healThreshold) {
          const healAbility = abilities.find((id) => ENEMY_ABILITIES[id]?.type === 'heal');
          if (healAbility && Math.random() < 0.6) return healAbility;
        }
        const debuffChance = pattern.debuffChance || 0.3;
        if (Math.random() < debuffChance) {
          const debuffAbilities = abilities.filter((id) => {
            const a = ENEMY_ABILITIES[id];
            return a && (a.type === 'debuff' || a.type === 'confuse');
          });
          if (debuffAbilities.length > 0) {
            return debuffAbilities[Math.floor(Math.random() * debuffAbilities.length)];
          }
        }
        return abilities[Math.floor(Math.random() * abilities.length)];
      }

      case 'rotation': {
        const pick = abilities[this.abilityIndex % abilities.length];
        this.abilityIndex++;
        return pick;
      }

      case 'strategic': {
        const p1 = pattern.phase1 || [];
        const p2 = pattern.phase2 || [];
        if (this.abilityIndex < p1.length) {
          const pick = p1[this.abilityIndex];
          this.abilityIndex++;
          return abilities.includes(pick) ? pick : abilities[Math.floor(Math.random() * abilities.length)];
        }
        // Phase 2: loop through
        const p2Index = (this.abilityIndex - p1.length) % p2.length;
        this.abilityIndex++;
        const pick = p2[p2Index];
        return abilities.includes(pick) ? pick : abilities[Math.floor(Math.random() * abilities.length)];
      }

      case 'chaotic': {
        // Prevent degenerate loops: don't stun if counter is active, don't counter if just stunned
        let pool = [...abilities];
        if (this.counterActive) {
          // Counter is up — don't also stun (that creates an unbreakable loop)
          pool = pool.filter(a => ENEMY_ABILITIES[a]?.type !== 'stun');
        }
        if (this.player.stunned > 0) {
          // Player is stunned — don't waste a counter (they can't attack anyway)
          pool = pool.filter(a => ENEMY_ABILITIES[a]?.type !== 'counter');
        }
        if (pool.length === 0) pool = abilities;
        return pool[Math.floor(Math.random() * pool.length)];
      }

      default:
        return this._pickRandom(abilities, true);
    }
  }

  _pickRandom(abilities, healPreference = false) {
    if (healPreference) {
      const hpPercent = this.enemy.hp / this.enemy.maxHP;
      if (hpPercent < 0.3) {
        const healAbility = abilities.find((id) => ENEMY_ABILITIES[id]?.type === 'heal');
        if (healAbility && Math.random() < 0.6) return healAbility;
      }
    }
    return abilities[Math.floor(Math.random() * abilities.length)];
  }

  processTurnStart(who) {
    const entity = who === 'player' ? this.player : this.enemy;
    const results = [];

    if (who === 'player') {
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
      if (entity.buffs[i].duration <= 0) {
        results.push({ type: 'buff_expire', name: entity.buffs[i].name });
        entity.buffs.splice(i, 1);
      }
    }

    if (who === 'player') {
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

    // Decrement exposed/protected for both player and enemy
    if (entity.exposed > 0) {
      entity.exposed--;
      if (entity.exposed <= 0) {
        results.push({ type: 'status_expire', message: 'Expose wore off.' });
      }
    }
    if (entity.protected > 0) {
      entity.protected--;
      if (entity.protected <= 0) {
        results.push({ type: 'status_expire', message: 'Protect wore off.' });
      }
    }

    if (who === 'player') this._checkDefeat();
    else this._checkVictory();

    return results;
  }

  isPlayerStunned() {
    return this.player.stunnedThisTurn;
  }

  isPlayerConfused() {
    return this.player.confusedThisTurn;
  }

  _checkVictory() {
    if (this.enemy.hp <= 0) {
      this.isOver = true;
      this.result = 'victory';
    }
  }

  _checkDefeat() {
    if (this.player.hp <= 0) {
      this.isOver = true;
      this.result = 'defeat';
    }
  }

  getXPReward() {
    return this.enemy.xpReward || 0;
  }
}
