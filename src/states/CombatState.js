import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { Engine } from '../core/Engine.js';
import { CombatScene } from '../combat/CombatScene.js';
import { CombatEngine } from '../combat/CombatEngine.js';
import { CombatHUD } from '../ui/CombatHUD.js';
import { FloatingText } from '../ui/FloatingText.js';
import { ITEMS } from '../data/stats.js';
import { ENCOUNTERS } from '../data/encounters/index.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';

export class CombatState {
  constructor(stateManager, player, enemyId, onEnd) {
    this.stateManager = stateManager;
    this.player = player;
    this.enemyId = enemyId;
    this.onEnd = onEnd;
    this.encounterConfig = ENCOUNTERS[enemyId] || {};
    this.canFlee = this.encounterConfig.canFlee !== false;
    this.scene = new CombatScene();
    this.engine = null;
    this.hud = new CombatHUD();
    this.floatingText = new FloatingText();
    this.particles = new ParticleSystem(this.scene.scene);
    this.phase = 'intro';
    this.animTimer = 0;
    this.pendingActions = [];
    this.inputEnabled = false;
  }

  enter() {
    this.scene.setEnemy(this.enemyId);
    this.engine = new CombatEngine(this.player.stats, this.enemyId);

    const bgColors = {
      intern: [0x1a2a1a, 0x0a3a0a, 0x2a3a1a, 0x4a8a2a],
      karen: [0x3a0a2a, 0x5a0a3a, 0x2a0a4a, 0xe94560],
      chad: [0x3a2a0a, 0x5a3a0a, 0x2a1a0a, 0xdd8833],
      grandma: [0x2a2a3a, 0x3a3a4a, 0x1a1a2a, 0x8888bb],
      compliance: [0x0a0a1a, 0x1a1a2a, 0x0a0a2a, 0xcc2222],
      regional: [0x2a1a0a, 0x3a2a1a, 0x4a3a2a, 0xdaa520],
      alex_boss: [0x1a3a1a, 0x0a2a3a, 0x2a1a3a, 0xe94560],
    };
    const colors = bgColors[this.enemyId] || [0x1a0533, 0x0a2463, 0x3e1f47, 0xe94560];
    this.scene.setBackgroundColors(...colors);

    this.hud.show(
      { ...this.player.stats, name: 'Andrew' },
      this.engine.enemy.name,
      this.engine.enemy.hp,
      this.engine.enemy.maxHP,
      { canFlee: this.canFlee }
    );

    this.hud.onActionSelect = (action) => this._handleAction(action);
    this.hud.onAbilitySelect = (id) => this._handleAbility(id);
    this.hud.onItemSelect = (id) => this._handleItem(id);

    this.phase = 'intro';
    this.animTimer = 1.0;

    this._resizeHandler = () => this.scene.resize();
    window.addEventListener('resize', this._resizeHandler);

    AudioManager.playSfx('confirm');
    AudioManager.playMusic('combat');
  }

  exit() {
    this.hud.remove();
    this.particles.dispose();
    this.scene.dispose();
    window.removeEventListener('resize', this._resizeHandler);
    AudioManager.stopMusic(0.5);
  }

  _startPlayerTurn() {
    const effects = this.engine.processTurnStart('player');
    if (effects.length > 0) {
      this._showEffects(effects, () => {
        if (this.engine.isOver) {
          this._handleResult();
          return;
        }
        if (this.engine.isPlayerStunned()) {
          this.hud.showMessage("Stunned! Can't move!");
          setTimeout(() => this._startEnemyTurn(), 1500);
          return;
        }
        this._enablePlayerInput();
      }, 'player');
      return;
    }

    if (this.engine.isPlayerStunned()) {
      this.hud.showMessage("Stunned! Can't move!");
      setTimeout(() => this._startEnemyTurn(), 1500);
      return;
    }

    this._enablePlayerInput();
  }

  _enablePlayerInput() {
    this.phase = 'player_turn';
    this.inputEnabled = true;
    this.hud.enableInput();
    this.hud.showMainMenu();
    this.hud.updatePlayerStats({
      ...this.player.stats,
      hp: this.engine.player.hp,
      mp: this.engine.player.mp,
      name: 'Andrew',
    });
    this.hud.updateEnemyHP(this.engine.enemy.hp, this.engine.enemy.maxHP);
  }

  _handleAction(action) {
    if (!this.inputEnabled) return;
    this.inputEnabled = false;
    AudioManager.playSfx('confirm');

    switch (action) {
      case 'attack':
        this._executePlayerAttack();
        break;
      case 'special':
        this.inputEnabled = true;
        this.hud.showAbilities(this.player.getAbilities(), this.engine.player.mp);
        break;
      case 'item':
        this.inputEnabled = true;
        this.hud.showItems(this.player.inventory, ITEMS);
        break;
      case 'flee':
        if (!this.canFlee) {
          this.inputEnabled = true;
          this.hud.showMessage("No walking out of this meeting.");
          return;
        }
        this._executeFlee();
        break;
    }
  }

  _handleAbility(abilityId) {
    if (!this.inputEnabled) return;
    this.inputEnabled = false;
    AudioManager.playSfx('confirm');

    const result = this.engine.playerAbility(abilityId);
    if (!result) {
      this.inputEnabled = true;
      return;
    }

    this.phase = 'animating';
    this.hud.disableInput();
    const delay = this._playPlayerActionResult(result);

    this._updateHUD();
    setTimeout(() => {
      if (this.engine.isOver) {
        this._handleResult();
      } else {
        this._startEnemyTurn();
      }
    }, result.skipsTurn ? 800 : delay);
  }

  _handleItem(itemId) {
    if (!this.inputEnabled) return;
    if (!this.player.useItem(itemId)) return;
    this.inputEnabled = false;
    AudioManager.playSfx('confirm');

    const result = this.engine.playerItem(itemId);
    if (!result) return;

    this.phase = 'animating';
    this.hud.disableInput();
    const delay = this._playPlayerActionResult(result);
    if (result.type === 'item') {
      this.hud.showMessage(`Used ${result.itemName}!`);
    }

    this._updateHUD();
    setTimeout(() => {
      if (this.engine.isOver) {
        this._handleResult();
      } else {
        this._startEnemyTurn();
      }
    }, delay);
  }

  _executePlayerAttack() {
    this.phase = 'animating';
    this.hud.disableInput();

    const result = this.engine.playerAttack();
    const delay = this._playPlayerActionResult(result);

    this._updateHUD();
    setTimeout(() => {
      if (this.engine.isOver) {
        this._handleResult();
      } else {
        this._startEnemyTurn();
      }
    }, delay);
  }

  _executeFlee() {
    const result = this.engine.playerFlee();
    if (result.success) {
      this.hud.showMessage('Got away safely!');
      setTimeout(() => this._endCombat('flee'), 1500);
    } else {
      this.hud.showMessage("Can't escape!");
      setTimeout(() => this._startEnemyTurn(), 1500);
    }
  }

  _playPlayerActionResult(result) {
    if (!result) {
      return 1000;
    }

    if (result.type === 'confused') {
      this.scene.flash(0xffaa00, 0.12);
      this.scene.shake(result.critical ? 0.5 : 0.3);
      AudioManager.playSfx('hit');
      this._spawnDamageNumber(result.damage, result.critical ? 'critical' : 'damage', 'player');
      this.hud.showMessage(result.message || 'Confused! The action backfires.');
      this.particles.burst({ x: 0, y: 1, z: 4 }, 12, 0xffaa00, 2, 0.7);
      return 1100;
    }

    if (result.type === 'counter') {
      this.scene.shake(0.6);
      AudioManager.playSfx('hit');
      this._spawnDamageNumber(result.damage, result.critical ? 'critical' : 'damage', 'player');
      this.hud.showMessage('"Great catch! But actually..." Counter!');
      this.particles.burst({ x: 0, y: 1, z: 4 }, 15, 0xffcc00, 3, 0.8);
      return 1200;
    }

    if (result.type === 'attack' || result.type === 'attack_aoe') {
      this.scene.enemyHurtAnim();
      this.scene.shake(result.critical ? 0.8 : 0.3);
      AudioManager.playSfx(result.critical ? 'critical' : 'hit');
      this._spawnDamageNumber(result.damage, result.critical ? 'critical' : 'damage', 'enemy');
      if (result.critical) {
        this.particles.burst({ x: 0, y: 1.2, z: 0 }, 25, 0xff4444, 4, 1.0);
      } else {
        this.particles.burst({ x: 0, y: 1.2, z: 0 }, 15, 0xffcc00, 3, 0.8);
      }
      return 1200;
    }

    if (result.type === 'heal') {
      AudioManager.playSfx('heal');
      this._spawnDamageNumber(`+${result.healAmount}`, 'heal', 'player');
      this.particles.burst({ x: 0, y: 1, z: 4 }, 10, 0x44ff44, 2, 1.0);
      this.hud.showMessage(`${result.abilityName}!`);
      return result.skipsTurn ? 800 : 1000;
    }

    if (result.type === 'buff') {
      AudioManager.playSfx('confirm');
      this.hud.showMessage(`${result.abilityName}! Buffed for ${result.duration} turns!`);
      return 1000;
    }

    if (result.type === 'item') {
      if (result.healAmount) {
        AudioManager.playSfx('heal');
        const target = result.healType === 'mp' ? 'player' : 'player';
        this._spawnDamageNumber(`+${result.healAmount}`, 'heal', target);
        this.particles.burst({ x: 0, y: 1, z: 4 }, 10, 0x44ff44, 2, 1.0);
      } else if (result.buffAmount) {
        AudioManager.playSfx('confirm');
        this.hud.showMessage(`${result.itemName} boosted your stats!`);
      }
      return 1000;
    }

    return 1000;
  }

  _startEnemyTurn() {
    this.phase = 'enemy_turn';
    this.inputEnabled = false;
    this.hud.disableInput();

    const effects = this.engine.processTurnStart('enemy');
    if (effects.length > 0) {
      this._showEffects(effects, () => {
        if (this.engine.isOver) {
          this._handleResult();
          return;
        }
        this._runEnemyTurn();
      }, 'enemy');
      return;
    }

    this._runEnemyTurn();
  }

  _runEnemyTurn() {
    setTimeout(() => {
      const result = this.engine.enemyTurn();
      if (!result) return;

      if (result.message) {
        this.hud.showMessage(result.message);
      }

      if (result.damage) {
        this.scene.enemyAttackAnim();
        setTimeout(() => {
          this.scene.shake(result.critical ? 0.8 : 0.4);
          this.scene.flash(0xff0000, 0.1);
          AudioManager.playSfx(result.critical ? 'critical' : 'hit');
          this._spawnDamageNumber(result.damage, result.critical ? 'critical' : 'damage', 'player');
          this.particles.burst({ x: 0, y: 1, z: 4 }, 12, 0xff0000, 2, 0.6);
          this._updateHUD();
        }, 200);
      } else if (result.healAmount) {
        AudioManager.playSfx('heal');
        this._spawnDamageNumber(`+${result.healAmount}`, 'heal', 'enemy');
        this.particles.burst({ x: 0, y: 1.2, z: 0 }, 10, 0x44ff44, 2, 1.0);
      }

      this._updateHUD();
      setTimeout(() => {
        if (this.engine.isOver) {
          this._handleResult();
        } else {
          this.engine.turn = 'player';
          this._startPlayerTurn();
        }
      }, 2000);
    }, 500);
  }

  _handleResult() {
    this.phase = 'result';
    this.inputEnabled = false;

    if (this.engine.result === 'victory') {
      AudioManager.playSfx('victory');
      this.scene.enemyDefeatAnim();

      const xp = this.engine.getXPReward();
      setTimeout(() => {
        this.hud.showMessage(`Victory! +${xp} XP`);
        this.player.stats.hp = this.engine.player.hp;
        this.player.stats.mp = this.engine.player.mp;
        const levels = this.player.gainXP(xp);
        if (levels.length > 0) {
          setTimeout(() => {
            AudioManager.playSfx('levelup');
            this.hud.showMessage(`Level Up! Now level ${levels[levels.length - 1]}!`);
          }, 1500);
        }
        setTimeout(() => this._endCombat('victory'), levels.length > 0 ? 3500 : 2000);
      }, 1000);
    } else if (this.engine.result === 'defeat') {
      AudioManager.playSfx('defeat');
      this.hud.showMessage('Your patience has run out...');
      setTimeout(() => this._endCombat('defeat'), 2500);
    }
  }

  _endCombat(result) {
    if (this.onEnd) this.onEnd(result);
    this.stateManager.pop();
  }

  _updateHUD() {
    this.hud.updatePlayerStats({
      ...this.player.stats,
      hp: this.engine.player.hp,
      mp: this.engine.player.mp,
      maxHP: this.engine.player.maxHP,
      maxMP: this.engine.player.maxMP,
      name: 'Andrew',
    });
    this.hud.updateEnemyHP(this.engine.enemy.hp, this.engine.enemy.maxHP);
  }

  _spawnDamageNumber(text, type, target = 'enemy') {
    const cx = window.innerWidth / 2;
    const baseY = target === 'enemy' ? window.innerHeight * 0.35 : window.innerHeight * 0.65;
    const offsetX = (Math.random() - 0.5) * 60;
    this.floatingText.spawn(String(text), cx + offsetX, baseY, type);
  }

  _showEffects(effects, callback, target = 'player') {
    let delay = 0;
    for (const effect of effects) {
      setTimeout(() => {
        if (effect.type === 'dot') {
          this.scene.flash(0x880088, 0.1);
          this._spawnDamageNumber(effect.damage, 'damage', target);
          this.hud.showMessage(`${effect.name}: ${effect.damage} damage!`);
        } else if (effect.type === 'buff_expire') {
          this.hud.showMessage(`${effect.name} wore off!`);
        } else if (effect.type === 'stunned') {
          this.hud.showMessage('Still stunned!');
        } else if (effect.type === 'confused') {
          this.hud.showMessage('Confused! Your next action may backfire.');
        }
        this._updateHUD();
      }, delay);
      delay += 800;
    }
    setTimeout(callback, delay + 300);
  }

  update(dt) {
    this.scene.update(dt);
    this.particles.update(dt);

    Engine.renderScene(this.scene.scene, this.scene.camera);
    Engine.skipDefaultRender();

    if (this.phase === 'intro') {
      this.animTimer -= dt;
      if (this.animTimer <= 0) {
        this._startPlayerTurn();
      }
      return;
    }

    if (this.phase === 'player_turn' && this.inputEnabled) {
      if (InputManager.isJustPressed('w') || InputManager.isJustPressed('arrowup')) {
        this.hud.navigate('up');
        AudioManager.playSfx('cursor');
      }
      if (InputManager.isJustPressed('s') || InputManager.isJustPressed('arrowdown')) {
        this.hud.navigate('down');
        AudioManager.playSfx('cursor');
      }
      if (InputManager.isJustPressed('a') || InputManager.isJustPressed('arrowleft')) {
        this.hud.navigate('left');
        AudioManager.playSfx('cursor');
      }
      if (InputManager.isJustPressed('d') || InputManager.isJustPressed('arrowright')) {
        this.hud.navigate('right');
        AudioManager.playSfx('cursor');
      }
      if (InputManager.isConfirmPressed()) {
        this.hud.selectCurrent();
      }
      if (InputManager.isCancelPressed()) {
        if (this.hud.currentMenu !== 'main') {
          this.hud.showMainMenu();
          AudioManager.playSfx('cancel');
        }
      }
    }
  }

  pause() {
    this.hud.disableInput();
  }

  resume() {
    if (this.phase === 'player_turn') {
      this.hud.enableInput();
    }
  }
}
