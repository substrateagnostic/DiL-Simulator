import { PLAYER_ABILITIES, ENEMY_ABILITIES, ENEMY_STATS, ITEMS } from '../data/stats.js';
import { COMBAT } from '../utils/constants.js';
import { clamp, randomRange } from '../utils/math.js';

export class CombatEngine {
  constructor(playerStats, enemyId) {
    this.player = { ...playerStats, buffs: [], dots: [], stunned: 0, confused: 0 };
    this.enemy = { ...ENEMY_STATS[enemyId], buffs: [], dots: [], lastAbility: null };
    this.enemyId = enemyId;
    this.turn = 'player';
    this.turnCount = 0;
    this.isOver = false;
    this.result = null; // 'victory' | 'defeat' | 'flee'
    this.log = [];
    this.counterActive = false; // For Alex's "Great Catch"
  }

  // Calculate damage
  _calcDamage(attackerAtk, power, defenderDef) {
    const baseDmg = (attackerAtk + power) * COMBAT.BASE_DAMAGE_MULTIPLIER;
    const defense = defenderDef * COMBAT.DEFENSE_FACTOR;
    let damage = Math.max(1, Math.floor(baseDmg - defense + randomRange(-3, 3)));

    // Critical hit check
    let critical = false;
    if (Math.random() < COMBAT.CRITICAL_CHANCE) {
      damage = Math.floor(damage * COMBAT.CRITICAL_MULTIPLIER);
      critical = true;
    }

    return { damage, critical };
  }

  // Get effective stats (with buffs)
  _getEffective(entity) {
    const stats = { ...entity };
    for (const buff of entity.buffs) {
      for (const [key, val] of Object.entries(buff.stats)) {
        if (stats[key] !== undefined) stats[key] += val;
      }
    }
    return stats;
  }

  // Player basic attack
  playerAttack() {
    if (this.counterActive) {
      // Alex's counter
      this.counterActive = false;
      const counterDmg = this._calcDamage(this._getEffective(this.enemy).atk, 15, this._getEffective(this.player).def);
      this.player.hp = Math.max(0, this.player.hp - counterDmg.damage);
      this.log.push({ type: 'counter', damage: counterDmg.damage, message: '"Great catch! But actually..." Alex counters!' });
      return { type: 'counter', damage: counterDmg.damage, critical: counterDmg.critical };
    }

    const pStats = this._getEffective(this.player);
    const eStats = this._getEffective(this.enemy);
    const result = this._calcDamage(pStats.atk, 10, eStats.def);
    this.enemy.hp = Math.max(0, this.enemy.hp - result.damage);
    this.log.push({ type: 'attack', damage: result.damage, critical: result.critical });

    this._checkVictory();
    return result;
  }

  // Player ability
  playerAbility(abilityId) {
    const ability = PLAYER_ABILITIES[abilityId];
    if (!ability || this.player.mp < ability.cost) return null;

    this.player.mp -= ability.cost;

    if (this.counterActive && ability.type === 'attack') {
      this.counterActive = false;
      const counterDmg = this._calcDamage(this._getEffective(this.enemy).atk, 15, this._getEffective(this.player).def);
      this.player.hp = Math.max(0, this.player.hp - counterDmg.damage);
      return { type: 'counter', damage: counterDmg.damage, abilityName: ability.name };
    }

    const pStats = this._getEffective(this.player);
    const eStats = this._getEffective(this.enemy);
    let result = { type: ability.type, abilityName: ability.name };

    switch (ability.type) {
      case 'attack':
      case 'attack_aoe': {
        const dmg = this._calcDamage(pStats.atk, ability.power, eStats.def);
        this.enemy.hp = Math.max(0, this.enemy.hp - dmg.damage);
        result = { ...result, damage: dmg.damage, critical: dmg.critical };
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
        result = { ...result, buffAmount: ability.buffAmount, duration: ability.buffDuration };
        break;
      }
    }

    this._checkVictory();
    return result;
  }

  // Player item use
  playerItem(itemId) {
    const item = ITEMS[itemId];
    if (!item) return null;

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

  // Player flee
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

  // Enemy turn - returns action result
  enemyTurn() {
    if (this.isOver) return null;

    const eStats = this._getEffective(this.enemy);
    const pStats = this._getEffective(this.player);

    // Pick ability using simple AI
    const abilityId = this._pickEnemyAbility();
    const ability = ENEMY_ABILITIES[abilityId];

    if (!ability) {
      // Basic attack fallback
      const dmg = this._calcDamage(eStats.atk, 10, pStats.def);
      this.player.hp = Math.max(0, this.player.hp - dmg.damage);
      this._checkDefeat();
      return { type: 'attack', damage: dmg.damage, critical: dmg.critical, message: `${this.enemy.name} attacks!` };
    }

    this.enemy.lastAbility = abilityId;
    let result = { type: ability.type, abilityName: ability.name, message: ability.message };

    switch (ability.type) {
      case 'attack': {
        const dmg = this._calcDamage(eStats.atk, ability.power, pStats.def);
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
        this.player.confused = ability.duration;
        break;
      }
      case 'stun': {
        this.player.stunned = ability.duration;
        break;
      }
      case 'counter': {
        this.counterActive = true;
        break;
      }
      case 'repeat': {
        // Repeat last ability
        if (this.enemy.lastAbility && this.enemy.lastAbility !== abilityId) {
          return this.enemyTurn(); // Recursion with different lastAbility
        }
        // Fallback to basic attack
        const dmg = this._calcDamage(eStats.atk, 15, pStats.def);
        this.player.hp = Math.max(0, this.player.hp - dmg.damage);
        result.damage = dmg.damage;
        break;
      }
      case 'summon': {
        // Flavor only - does minor damage
        const dmg = this._calcDamage(eStats.atk, ability.power || 8, pStats.def);
        this.player.hp = Math.max(0, this.player.hp - dmg.damage);
        result.damage = dmg.damage;
        break;
      }
    }

    this._checkDefeat();
    return result;
  }

  _pickEnemyAbility() {
    const abilities = this.enemy.abilities;
    if (!abilities || abilities.length === 0) return null;

    // Simple AI: weighted random with some intelligence
    const hpPercent = this.enemy.hp / this.enemy.maxHP;

    // If low HP, prefer healing if available
    if (hpPercent < 0.3) {
      const healAbility = abilities.find(id => ENEMY_ABILITIES[id]?.type === 'heal');
      if (healAbility && Math.random() < 0.6) return healAbility;
    }

    // Otherwise random from available
    return abilities[Math.floor(Math.random() * abilities.length)];
  }

  // Process start of turn (DoTs, buff expiry)
  processTurnStart(who) {
    const entity = who === 'player' ? this.player : this.enemy;
    const results = [];

    // Process DoTs
    for (let i = entity.dots.length - 1; i >= 0; i--) {
      const dot = entity.dots[i];
      const dmg = Math.floor(dot.damage * 0.7);
      entity.hp = Math.max(0, entity.hp - dmg);
      dot.duration--;
      results.push({ type: 'dot', damage: dmg, name: dot.name });
      if (dot.duration <= 0) entity.dots.splice(i, 1);
    }

    // Process buff durations
    for (let i = entity.buffs.length - 1; i >= 0; i--) {
      entity.buffs[i].duration--;
      if (entity.buffs[i].duration <= 0) {
        results.push({ type: 'buff_expire', name: entity.buffs[i].name });
        entity.buffs.splice(i, 1);
      }
    }

    // Process stun/confuse
    if (who === 'player') {
      if (entity.stunned > 0) {
        entity.stunned--;
        results.push({ type: 'stunned' });
      }
      if (entity.confused > 0) {
        entity.confused--;
      }
    }

    if (who === 'player') this._checkDefeat();
    else this._checkVictory();

    return results;
  }

  isPlayerStunned() {
    return this.player.stunned > 0;
  }

  isPlayerConfused() {
    return this.player.confused > 0;
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
