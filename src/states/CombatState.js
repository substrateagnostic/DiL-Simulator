import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { Engine } from '../core/Engine.js';
import { CombatScene } from '../combat/CombatScene.js';
import { CombatEngine } from '../combat/CombatEngine.js';
import { CombatHUD } from '../ui/CombatHUD.js';
import { FloatingText } from '../ui/FloatingText.js';
import { ITEMS, ENEMY_ABILITIES, ENEMY_STATS, ANDREW_TAUNTS, XP_TABLE, PLAYER_ABILITIES } from '../data/stats.js';
import { VOICE_ACTIONS, VOICES } from '../data/voices.js';
import { AchievementManager } from '../core/AchievementManager.js';
import { ENCOUNTERS } from '../data/encounters/index.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { DEV_MODE } from '../utils/constants.js';

export class CombatState {
  constructor(stateManager, player, enemyId, onEnd, enemyOverrides = {}) {
    this.stateManager = stateManager;
    this.player = player;
    this.enemyId = enemyId; // encounter ID — used for flags, encounter config lookup
    this.onEnd = onEnd;
    this.enemyOverrides = enemyOverrides;
    this.encounterConfig = ENCOUNTERS[enemyId] || {};

    // Resolve enemy list — multi-enemy via enemyIds, fallback to single enemyId mapping
    this.enemyIdsList = (this.encounterConfig.enemyIds && this.encounterConfig.enemyIds.length > 0)
      ? [...this.encounterConfig.enemyIds]
      : [this.encounterConfig.enemyId || enemyId];
    // Resolve party list:
    //   1. Encounter `partyIds` overrides (forced narrative party, e.g. trio fight forces Janet)
    //   2. `player.party` — recruited, persistent allies
    //   3. Empty (Andrew alone)
    // Encounter also supports `noParty: true` to force a solo fight regardless of recruits.
    if (this.encounterConfig.noParty) {
      this.partyIdsList = [];
    } else if (this.encounterConfig.partyIds && this.encounterConfig.partyIds.length > 0) {
      this.partyIdsList = [...this.encounterConfig.partyIds];
    } else if (this.player?.party && this.player.party.length > 0) {
      // Cap to a reasonable number to keep the scene readable
      this.partyIdsList = this.player.party.slice(0, 2);
    } else {
      this.partyIdsList = [];
    }
    this.partyCharIds = ['andrew', ...this.partyIdsList]; // for the scene (visual)
    // The "primary" enemy — used for backdrop colors / ENEMY_STATS lookup for legacy code
    this.actualEnemyId = this.enemyIdsList[0];
    this.canFlee = this.encounterConfig.canFlee !== false;

    this.scene = new CombatScene();
    this.engine = null;
    this.hud = new CombatHUD();
    this.floatingText = new FloatingText();
    this.particles = new ParticleSystem(this.scene.scene);

    this.phase = 'intro';                 // intro, ally_turn, targeting, animating, enemy_phase, result
    this.animTimer = 0;
    this.inputEnabled = false;
    this._lastPhaseIndex = -1;
    this._activeAllyIndex = 0;            // Index into engine.allies that's currently acting
    this._allyTurnQueue = [];             // SPD-sorted ally indices for this round
    this._enemyTurnQueue = [];            // SPD-sorted enemy indices for the enemy phase
    this._pendingAbilityForTarget = null; // Stored ability waiting on target pick
    this._pendingActionForTarget = null;  // 'attack' | 'press_advantage' | 'power_move' | 'retaliate' | etc.
    this._targetIndex = 0;
  }

  enter() {
    // Build scene with all enemies + the party
    this.scene.setCombatants(this.enemyIdsList, this.partyCharIds, this.player);

    // Build engine. Per-ally overrides bring level-scaled stats + unlocked abilities + persisted HP/MP.
    const partyOverrides = {};
    for (const allyId of this.partyIdsList) {
      const eff = this.player.getAllyEffectiveStats(allyId);
      const persisted = this.player.allyState[allyId] || {};
      const unlocked = this.player.getAllyUnlockedAbilities(allyId);
      if (eff) {
        partyOverrides[allyId] = {
          maxHP: eff.maxHP, maxMP: eff.maxMP,
          atk: eff.atk, def: eff.def, spd: eff.spd,
          hp: persisted.hp ?? eff.maxHP,
          mp: persisted.mp ?? eff.maxMP,
          unlockedAbilities: unlocked.length > 0 ? unlocked : (eff.starterAbilities || eff.abilities),
        };
      }
    }
    this.engine = new CombatEngine(
      this.player.getCombatStats(),
      this.actualEnemyId,
      this.enemyOverrides,
      { enemyIds: this.enemyIdsList, partyIds: this.partyIdsList, partyOverrides }
    );

    // Backdrop colors keyed by primary enemy (legacy mapping)
    const bgColors = {
      intern: [0x1a2a1a, 0x0a3a0a, 0x2a3a1a, 0x4a8a2a],
      karen: [0x3a0a2a, 0x5a0a3a, 0x2a0a4a, 0xe94560],
      chad: [0x3a2a0a, 0x5a3a0a, 0x2a1a0a, 0xdd8833],
      grandma: [0x2a2a3a, 0x3a3a4a, 0x1a1a2a, 0x8888bb],
      compliance: [0x0a0a1a, 0x1a1a2a, 0x0a0a2a, 0xcc2222],
      regional: [0x2a1a0a, 0x3a2a1a, 0x4a3a2a, 0xdaa520],
      ross_boss: [0x1a3a1a, 0x0a2a3a, 0x2a1a3a, 0xe94560],
      reception_client: [0x0a1a2a, 0x1a2a3a, 0x0a0a1a, 0x3a8aaa],
      security_guard: [0x1a1a2a, 0x2a2a3a, 0x0a0a1a, 0x4a6a8a],
      hr_rep: [0x2a1a3a, 0x3a2a4a, 0x1a0a2a, 0x6a4a8a],
      restructuring_analyst: [0x1a1a1a, 0x2a2a2a, 0x0a0a0a, 0x888888],
      brand_consultant: [0x3a1a2a, 0x4a2a3a, 0x2a0a1a, 0xcc6688],
      corporate_lawyer: [0x0a0a0a, 0x1a1a1a, 0x0a0a0a, 0xaaaaaa],
      rachel_boss: [0x0a0a2a, 0x1a1a3a, 0x0a0a1a, 0xc0c0c0],
      cfos_assistant: [0x1a0a2e, 0x2a1a3e, 0x0a0a1e, 0x8844cc],
      regional_director: [0x0a1628, 0x1a2638, 0x0a0a18, 0x4488cc],
      algorithm: [0x000000, 0x0a0a0a, 0x000000, 0xff0000],
    };
    const colors = bgColors[this.actualEnemyId] || [0x1a0533, 0x0a2463, 0x3e1f47, 0xe94560];
    this.scene.setBackgroundColors(...colors);

    // HUD: enemies + party in the order the engine has them
    const enemiesView = this.engine.enemies.map(e => ({ name: e.name, hp: e.hp, maxHP: e.maxHP }));
    const partyView = this._buildPartyView();
    this.hud.show(enemiesView, partyView, { canFlee: this.canFlee });

    this.hud.onActionSelect = (action) => this._handleAction(action);
    this.hud.onAbilitySelect = (id, item) => this._handleAbility(id, item);
    this.hud.onItemSelect = (id) => this._handleItem(id);
    this.hud.onVoiceSelect = (actionId, item) => this._handleVoice(actionId, item);

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

  _buildPartyView() {
    return this.engine.allies.map((a, i) => ({
      name: a.name,
      hp: a.hp,
      maxHP: a.maxHP,
      mp: a.mp,
      maxMP: a.maxMP,
      momentum: a.momentum || 0,
      isPlayer: i === 0,
    }));
  }

  // ── Round / turn flow ─────────────────────────────────────────────────
  // Build a single SPD-sorted turn queue mixing allies and enemies (BG3-style interleave).
  // Each entry: { kind: 'ally' | 'enemy', index: number, spd: number }.
  // Stable secondary sort: allies before enemies on tie (player-friendly).
  _startRound() {
    const queue = [];
    this.engine.allies.forEach((a, i) => {
      if (a.hp > 0) queue.push({ kind: 'ally', index: i, spd: this.engine._getEffective(a).spd });
    });
    this.engine.enemies.forEach((e, i) => {
      if (e.hp > 0) queue.push({ kind: 'enemy', index: i, spd: this.engine._getEffective(e).spd });
    });
    queue.sort((x, y) => {
      if (y.spd !== x.spd) return y.spd - x.spd;
      // Tiebreaker: allies act before enemies
      if (x.kind !== y.kind) return x.kind === 'ally' ? -1 : 1;
      return 0;
    });
    this._turnQueue = queue;
    this._processNextTurn();
  }

  // Compatibility shim — older flow referenced this as the "next ally" — now it's just the next combatant.
  _processNextAllyTurn() { return this._processNextTurn(); }

  _processNextTurn() {
    if (this.engine.isOver) {
      this._handleResult();
      return;
    }
    // Drop entries for combatants that died before their turn came up
    while (this._turnQueue.length > 0) {
      const next = this._turnQueue[0];
      const entity = next.kind === 'ally' ? this.engine.allies[next.index] : this.engine.enemies[next.index];
      if (entity && entity.hp > 0) break;
      this._turnQueue.shift();
    }
    if (this._turnQueue.length === 0) {
      // Round complete — start a new one
      this._startRound();
      return;
    }
    const next = this._turnQueue.shift();
    if (next.kind === 'enemy') {
      this._runInterleavedEnemyTurn(next.index);
      return;
    }
    // Ally turn
    this._activeAllyIndex = next.index;
    const ally = this.engine.allies[this._activeAllyIndex];
    if (!ally || ally.hp <= 0) {
      this._processNextTurn();
      return;
    }
    this.hud.setActiveAlly(this._activeAllyIndex, this._buildPartyView());

    // Process turn-start effects (DoTs, status decrement) for this ally
    const effects = this.engine.processTurnStart(ally);
    const continueTurn = () => {
      if (this.engine.isOver) {
        this._handleResult();
        return;
      }
      // Stunned actors skip their turn
      if (ally.stunnedThisTurn) {
        this.hud.showMessage(`${ally.name} is stunned!`);
        setTimeout(() => this._processNextTurn(), 1200);
        return;
      }
      if (this._activeAllyIndex === 0) {
        this._enablePlayerInput();
      } else {
        this._runAllyAITurn(this._activeAllyIndex);
      }
    };

    if (effects.length > 0) {
      this._showEffects(effects, continueTurn, this._activeAllyIndex === 0 ? 'player' : 'enemy');
    } else {
      continueTurn();
    }
  }

  // Wraps _processNextEnemyTurn for the interleaved queue — runs ONE enemy then yields
  // back to the main turn loop instead of draining the whole enemy phase.
  _runInterleavedEnemyTurn(enemyIndex) {
    const enemy = this.engine.enemies[enemyIndex];
    if (!enemy || enemy.hp <= 0) {
      this._processNextTurn();
      return;
    }
    this.phase = 'enemy_phase';
    this.inputEnabled = false;
    this.hud.disableInput();

    const effects = this.engine.processTurnStart(enemy);
    const proceed = () => {
      if (this.engine.isOver) { this._handleResult(); return; }
      this._runSingleEnemyTurnInterleaved(enemyIndex);
    };
    if (effects.length > 0) this._showEffects(effects, proceed, 'enemy');
    else proceed();
  }

  // Same as _runSingleEnemyTurn but the post-completion call goes to _processNextTurn (interleaved)
  _runSingleEnemyTurnInterleaved(enemyIndex) {
    setTimeout(() => {
      const result = this.engine.enemyTurn(enemyIndex);
      if (!result) {
        this._processNextTurn();
        return;
      }

      if (result.type === 'blocked') {
        this.hud.showMessage(result.message);
        AudioManager.playSfx('confirm');
        this.particles.burst({ x: 0, y: 1, z: 4 }, 15, 0x4488ff, 3, 0.8);
        this._refreshHUD();
        setTimeout(() => this._processNextTurn(), 1500);
        return;
      }

      if (result.message) this.hud.showMessage(result.message);

      if (result.damage) {
        this.scene.enemyAttackAnim(enemyIndex);
        const targetAllyIndex = result.targetAllyIndex ?? 0;
        // Voice triggers: damage to Andrew arms the Skeptic
        if (targetAllyIndex === 0 && this.engine.noteDamageTakenByPlayer) this.engine.noteDamageTakenByPlayer();
        setTimeout(() => {
          this.scene.shake(result.critical ? 0.8 : 0.4);
          if (result.braced) {
            this.scene.flash(0x4488ff, 0.15);
            this.particles.burst({ x: 0, y: 1.2, z: 4 }, 20, 0x4488ff, 3, 0.9);
            this.hud.showMessage('BRACED! Damage halved! Retaliate available!');
            setTimeout(() => this._fireTaunt('brace_success'), 400);
            AchievementManager.check(this.player, { event: 'brace_success' });
          } else {
            this.scene.flash(0xff0000, 0.1);
            this.particles.burst({ x: 0, y: 1, z: 4 }, 12, 0xff0000, 2, 0.6);
            if (result.critical) setTimeout(() => this._fireTaunt('enemy_crit'), 400);
            this.scene.allyHurtAnim(targetAllyIndex);
          }
          AudioManager.playSfx(result.braced ? 'confirm' : (result.critical ? 'critical' : 'hit'));
          this._spawnDamageNumberForAlly(result.damage, result.critical ? 'critical' : 'damage', targetAllyIndex);
          this._refreshHUD();
          if (this.engine.posterJustTriggered) {
            this.engine.posterJustTriggered = false;
            setTimeout(() => {
              this.scene.flash(0xffdd00, 0.4);
              this.particles.burst({ x: 0, y: 1.2, z: 4 }, 25, 0xffdd00, 3, 1.0);
              this.hud.showMessage('HANG IN THERE! Survived at 1 HP!');
            }, 300);
          }
        }, 200);
      } else if (result.healAmount) {
        AudioManager.playSfx('heal');
        this._spawnDamageNumberAtEnemy(`+${result.healAmount}`, 'heal', enemyIndex);
        this.particles.burst({ x: 0, y: 1.2, z: 0 }, 10, 0x44ff44, 2, 1.0);
        // Voice triggers: enemy healing arms the Litigator
        if (this.engine.noteEnemyHeal) this.engine.noteEnemyHeal();
      }

      this._refreshHUD();
      setTimeout(() => {
        if (this.engine.isOver) this._handleResult();
        else this._processNextTurn();
      }, 1700);
    }, 400);
  }

  _enablePlayerInput() {
    this.phase = 'ally_turn';
    this.inputEnabled = true;
    this.hud.enableInput();
    // Voice triggers reset their "took damage recently" signal at the top of each player turn
    if (this.engine.clearRecentDamageNote) this.engine.clearRecentDamageNote();

    // Telegraph all enemies for the upcoming enemy phase
    this.engine.telegraph();
    const hints = this.engine.enemies.map(e => {
      if (e.hp <= 0) return null;
      const t = e.telegraphedAbility;
      const vulnerable = e.vulnerable > 0;
      return this._getTelegraphHint(t, e) + (vulnerable ? ' (VULNERABLE — hit for 1.5×!)' : '');
    });
    this.hud.updateTelegraphAll(hints);

    const voicesAvailable = this.engine.getAvailableVoices ? this.engine.getAvailableVoices() : [];
    // Resolve action descriptors for the voice submenu
    this._currentVoices = voicesAvailable.map(v => {
      const action = VOICE_ACTIONS[v.actionId] || {};
      return { ...v, action };
    });
    this.hud.showMainMenu(
      this.engine.player.silencedThisTurn,
      this.engine.player.momentum,
      this.engine.player.bracing,
      this.engine.player.retaliateReady,
      this.engine.player.hp / this.engine.player.maxHP < 0.25,
      this.engine.getPressAdvantageCost(),
      this._currentVoices,
    );
    this.hud.updatePlayerStats({
      ...this.player.stats,
      hp: this.engine.player.hp,
      mp: this.engine.player.mp,
      maxHP: this.engine.player.maxHP,
      maxMP: this.engine.player.maxMP,
      momentum: this.engine.player.momentum,
      name: 'Andrew',
      isPlayer: true,
      _xpTable: XP_TABLE,
    });
    this.hud.updateAllEnemies(this.engine.enemies);
    this.hud.updateBuffStatus(this.engine.player.buffs, this.engine.enemy?.buffs || []);
  }

  _runAllyAITurn(allyIndex) {
    this.phase = 'animating';
    this.hud.disableInput();
    const ally = this.engine.allies[allyIndex];
    this.hud.showMessage(`${ally.name}'s turn...`);
    setTimeout(() => {
      const result = this.engine.allyTurn(allyIndex);
      const delay = this._playAllyResult(result, allyIndex);
      this._refreshHUD();
      setTimeout(() => {
        if (this.engine.isOver) {
          this._handleResult();
        } else {
          this._processNextAllyTurn();
        }
      }, delay);
    }, 600);
  }

  _playAllyResult(result, allyIndex) {
    if (!result) return 600;
    const ally = this.engine.allies[allyIndex];
    if (result.message) this.hud.showMessage(result.message);

    if (result.type === 'confused') {
      this.scene.flash(0xffaa00, 0.10);
      this._spawnDamageNumberForAlly(result.damage, result.critical ? 'critical' : 'damage', allyIndex);
      return 1100;
    }

    if (result.aoe && Array.isArray(result.hits)) {
      this.scene.playerAttackAnim(allyIndex);
      AudioManager.playSfx(result.critical ? 'critical' : 'hit');
      this.particles.ring({ x: 0, y: 1.0, z: 0 }, 24, 0x88ccff, 4.0, 0.9);
      result.hits.forEach((h, i) => {
        setTimeout(() => {
          this.scene.enemyHurtAnim(h.targetIndex);
          this._spawnDamageNumberAtEnemy(h.damage, h.critical ? 'critical' : 'damage', h.targetIndex);
        }, 200 + i * 150);
      });
      this.scene.shake(0.4);
      return 700 + result.hits.length * 150;
    }

    if (result.type === 'ally_attack' || result.type === 'ally_attack_aoe') {
      this.scene.playerAttackAnim(allyIndex);
      AudioManager.playSfx(result.critical ? 'critical' : 'hit');
      const ti = result.targetIndex ?? 0;
      setTimeout(() => {
        this.scene.enemyHurtAnim(ti);
        this.scene.shake(result.critical ? 0.6 : 0.3);
        this._spawnDamageNumberAtEnemy(result.damage || 0, result.critical ? 'critical' : 'damage', ti);
      }, 220);
      return 1100;
    }

    if (result.type === 'ally_buff_party') {
      AudioManager.playSfx('confirm');
      this.scene.flash(0xffd700, 0.10);
      // Burst around each ally
      this.engine.allies.forEach((_a, i) => {
        const e = this.scene.allyGroups[i];
        if (e) this.particles.burst({ x: e.baseX - 2.2, y: 1.2, z: e.baseZ - 3.5 }, 12, 0xffdd44, 2, 0.7);
      });
      return 1100;
    }

    if (result.type === 'ally_heal_ally') {
      AudioManager.playSfx('heal');
      this._spawnDamageNumberForAlly(`+${result.healAmount}`, 'heal', result.healTargetAllyIndex ?? 0);
      return 1100;
    }

    if (result.type === 'ally_debuff') {
      AudioManager.playSfx('confirm');
      const ti = result.targetIndex ?? 0;
      this.scene.flash(0xffaa44, 0.08);
      this.particles.burst({ x: 0, y: 1.4, z: 0 }, 14, 0xffaa44, 2.5, 0.7);
      return 1000;
    }

    return 800;
  }

  // ── Action handlers ──────────────────────────────────────────────────
  _handleAction(action) {
    if (!this.inputEnabled) return;
    this.inputEnabled = false;
    AudioManager.playSfx('confirm');

    switch (action) {
      case 'attack':
        this._beginTargetedAction('attack');
        break;
      case 'special':
        this.inputEnabled = true;
        this.hud.showAbilities(this.player.getAbilities(), this.engine.player.mp);
        break;
      case 'brace':
        this._executeBrace();
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
      case 'power_move':
        this._beginTargetedAction('power_move');
        break;
      case 'press_advantage':
        this._beginTargetedAction('press_advantage');
        break;
      case 'second_wind':
        this._executeSecondWind();
        break;
      case 'retaliate':
        this._beginTargetedAction('retaliate');
        break;
      case 'desperate_gamble':
        this.inputEnabled = true;
        this._showDesperateGamble();
        break;
      case 'thoughts':
        this.inputEnabled = true;
        this.hud.showVoices(this._currentVoices || []);
        break;
    }
  }

  // ── Voice ("Reasonable Doubt") handler ────────────────────────────────
  _handleVoice(actionId, item) {
    if (!this.inputEnabled) return;
    const action = VOICE_ACTIONS[actionId];
    if (!action) return;
    AudioManager.playSfx('confirm');

    // For target-needing voice actions, show target picker if 2+ alive enemies
    if (action.needsTarget && this.engine.aliveEnemies().length > 1) {
      this.inputEnabled = false;
      const enemiesView = this.engine.enemies.map((e, i) => ({ name: e.name, hp: e.hp, maxHP: e.maxHP, idx: i }));
      this.phase = 'targeting';
      this.hud.showTargetPicker(enemiesView, (idx) => {
        this.scene.setTargetMarker(idx, true);
        this._executeVoiceAction(actionId, idx);
        setTimeout(() => this.scene.hideTargetMarker(), 1200);
      }, () => {
        this.phase = 'ally_turn';
        this.inputEnabled = true;
        this.hud.showVoices(this._currentVoices || []);
      });
    } else {
      this.inputEnabled = false;
      this._executeVoiceAction(actionId, undefined);
    }
  }

  _executeVoiceAction(actionId, targetIndex) {
    const result = this.engine.playerVoiceAction(actionId, targetIndex);
    if (!result) {
      this.inputEnabled = true;
      return;
    }

    this.phase = 'animating';
    this.hud.disableInput();

    // Track on the player profile (persists across fights). Update threshold flags so
    // dialogs can branch on them via the existing `requires` mechanism.
    if (this.player.voiceCounts && result.voiceId) {
      this.player.voiceCounts[result.voiceId] = (this.player.voiceCounts[result.voiceId] || 0) + 1;
      const counts = this.player.voiceCounts;
      if (counts.litigator  >= 5)  this.player.setFlag('voice_litigator_high');
      if (counts.litigator  >= 10) this.player.setFlag('voice_litigator_max');
      if (counts.witness    >= 3)  this.player.setFlag('voice_witness_high');
      if (counts.witness    >= 6)  this.player.setFlag('voice_witness_max');
      if (counts.skeptic    >= 5)  this.player.setFlag('voice_skeptic_high');
      if (counts.apprentice >= 5)  this.player.setFlag('voice_apprentice_high');
    }

    // Voice bubble — italic speech in the voice's color, top-center
    this._showVoiceBubble(result.voiceName, result.quote, result.voiceColor);

    let delay = 1400;
    setTimeout(() => {
      // Animate the action effect
      if (result.type === 'voice_attack') {
        this.scene.playerAttackAnim(this._activeAllyIndex);
        AudioManager.playSfx('critical');
        const ti = result.targetIndex ?? 0;
        this.scene.flash(this._hexFromColor(result.voiceColor), 0.18);
        this.particles.burst({ x: 0, y: 1.6, z: 1.5 }, 24, this._hexFromColor(result.voiceColor), 3, 0.9);
        setTimeout(() => {
          this.scene.enemyHurtAnim(ti);
          this.scene.shake(1.0);
          this._spawnDamageNumberAtEnemy(result.damage, 'critical', ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, 30, this._hexFromColor(result.voiceColor), 4, 1.0);
          if (result.skepticLocked) {
            setTimeout(() => this.hud.showMessage('The Skeptic falls silent.'), 500);
          }
        }, 220);
      } else if (result.type === 'voice_heal') {
        AudioManager.playSfx('heal');
        this._spawnDamageNumberForAlly(`+${result.healAmount}`, 'heal', 0);
        this.scene.flash(this._hexFromColor(result.voiceColor), 0.18);
        this.particles.burst({ x: 0, y: 1.0, z: 4 }, 24, this._hexFromColor(result.voiceColor), 3, 1.0);
        this.particles.rise({ x: 0, y: 0.4, z: 4 }, 16, 0xffffff, 1.6);
        if (result.cleared) setTimeout(() => this.hud.showMessage(`Cleared: ${result.cleared}`), 500);
      } else if (result.type === 'voice_skip') {
        AudioManager.playSfx('cancel');
        this.particles.rise({ x: 0, y: 0.5, z: 4 }, 12, 0x888888, 1.4);
        if (result.attemptFlee && this.canFlee) {
          // Use Skeptic to walk: 90% flee chance
          if (Math.random() < 0.9) {
            this.engine.isOver = true;
            this.engine.result = 'flee';
            this.hud.showMessage('You walk out of the meeting.');
            setTimeout(() => this._endCombat('flee'), 1500);
            return;
          }
          this.hud.showMessage("You can't quite make yourself leave.");
        }
      }
    }, 800);

    this._refreshHUD();
    setTimeout(() => {
      if (this.engine.isOver) this._handleResult();
      else this._processNextTurn();
    }, delay);
  }

  _hexFromColor(cssColor) {
    if (!cssColor) return 0xffffff;
    if (typeof cssColor === 'number') return cssColor;
    if (cssColor.startsWith('#')) {
      const hex = cssColor.slice(1);
      const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
      return parseInt(full, 16);
    }
    return 0xffffff;
  }

  _showVoiceBubble(voiceName, quote, color) {
    const el = document.createElement('div');
    el.className = 'combat-voice-bubble';
    el.style.borderColor = color || '#fff';
    el.style.color = color || '#fff';
    el.innerHTML = `<div class="combat-voice-name">${voiceName}</div><div class="combat-voice-quote">"${quote}"</div>`;
    document.getElementById('ui-overlay').appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 600);
    }, 2200);
  }

  // For single-target actions: pick target then execute
  _beginTargetedAction(action) {
    const enemiesView = this.engine.enemies.map((e, i) => ({ name: e.name, hp: e.hp, maxHP: e.maxHP, idx: i }));
    this.phase = 'targeting';
    this.hud.showTargetPicker(enemiesView, (idx) => {
      this._targetIndex = idx;
      this.scene.setTargetMarker(idx, true);
      this._dispatchTargetedAction(action, idx);
      // Hide marker shortly after — animations move on
      setTimeout(() => this.scene.hideTargetMarker(), 1200);
    }, () => {
      // Cancelled — return to main menu
      this.phase = 'ally_turn';
      this.inputEnabled = true;
      this.hud.enableInput();
      this.hud.showMainMenu(
        this.engine.player.silencedThisTurn,
        this.engine.player.momentum,
        this.engine.player.bracing,
        this.engine.player.retaliateReady,
        this.engine.player.hp / this.engine.player.maxHP < 0.25,
        this.engine.getPressAdvantageCost()
      );
    });
  }

  _dispatchTargetedAction(action, targetIndex) {
    switch (action) {
      case 'attack': this._executePlayerAttack(targetIndex); break;
      case 'power_move': this._executePowerMove(targetIndex); break;
      case 'press_advantage': this._executePressAdvantage(targetIndex); break;
      case 'retaliate': this._executeRetaliate(targetIndex); break;
      case 'ability': {
        const data = this._pendingAbilityForTarget;
        this._pendingAbilityForTarget = null;
        if (data) this._executeAbility(data.id, targetIndex);
        break;
      }
    }
  }

  _handleAbility(abilityId, item) {
    if (!this.inputEnabled) return;
    AudioManager.playSfx('confirm');
    const ability = PLAYER_ABILITIES[abilityId];
    if (!ability) return;

    const needsTarget = ability.type === 'attack' || ability.type === 'debuff';
    const isAoE = ability.type === 'attack_aoe' || ability.type === 'special'; // double_turn applies to all

    if (needsTarget && this.engine.aliveEnemies().length > 1) {
      this.inputEnabled = false;
      this._pendingAbilityForTarget = { id: abilityId };
      const enemiesView = this.engine.enemies.map((e, i) => ({ name: e.name, hp: e.hp, maxHP: e.maxHP, idx: i }));
      this.phase = 'targeting';
      this.hud.showTargetPicker(enemiesView, (idx) => {
        this.scene.setTargetMarker(idx, true);
        this._executeAbility(abilityId, idx);
        setTimeout(() => this.scene.hideTargetMarker(), 1200);
      }, () => {
        this.phase = 'ally_turn';
        this.inputEnabled = true;
        this.hud.showAbilities(this.player.getAbilities(), this.engine.player.mp);
      });
    } else {
      this.inputEnabled = false;
      this._executeAbility(abilityId, undefined);
    }
  }

  _executeAbility(abilityId, targetIndex) {
    const result = this.engine.playerAbility(abilityId, targetIndex);
    if (!result) {
      this.inputEnabled = true;
      return;
    }
    this.phase = 'animating';
    this.hud.disableInput();
    const delay = this._playPlayerActionResult(result, abilityId);

    if (result.critical) this._fireTaunt('crit');
    if (result.effective === 'super') { this._fireTaunt('weakness_hit'); AchievementManager.check(this.player, { event: 'weakness_hit' }); }
    if (result.combo) AchievementManager.check(this.player, { event: 'combo_hit' });
    this._checkPhaseChange();
    this._refreshHUD();
    setTimeout(() => {
      if (this.engine.isOver) {
        this._handleResult();
      } else if (result.doubleTurn) {
        const msg = result.debuffAmount ? 'Enemy DEF reduced! Double turn!' : 'Double turn!';
        this.hud.showMessage(msg);
        // Re-insert this ally at the front of the interleaved turn queue for an extra action
        const ally = this.engine.allies[this._activeAllyIndex];
        if (ally) this._turnQueue.unshift({ kind: 'ally', index: this._activeAllyIndex, spd: this.engine._getEffective(ally).spd });
        setTimeout(() => this._processNextTurn(), 600);
      } else {
        this._processNextTurn();
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
    if (result.type === 'item') this.hud.showMessage(`Used ${result.itemName}!`);

    this._refreshHUD();
    setTimeout(() => {
      if (this.engine.isOver) this._handleResult();
      else this._processNextAllyTurn();
    }, delay);
  }

  _executePlayerAttack(targetIndex) {
    this.phase = 'animating';
    this.hud.disableInput();
    const result = this.engine.playerAttack(targetIndex);
    const delay = this._playPlayerActionResult(result);

    if (result && result.critical) { this._fireTaunt('crit'); this.engine.noteCrit && this.engine.noteCrit(); }
    if (result && result.effective === 'super') { this._fireTaunt('weakness_hit'); AchievementManager.check(this.player, { event: 'weakness_hit' }); }
    if (result && result.combo) AchievementManager.check(this.player, { event: 'combo_hit' });
    this._checkPhaseChange();
    this._refreshHUD();
    setTimeout(() => {
      if (this.engine.isOver) this._handleResult();
      else this._processNextAllyTurn();
    }, delay);
  }

  _executeFlee() {
    const result = this.engine.playerFlee();
    if (result.success) {
      this.hud.showMessage('Got away safely!');
      setTimeout(() => this._endCombat('flee'), 1500);
    } else {
      this.hud.showMessage("Can't escape!");
      setTimeout(() => this._processNextAllyTurn(), 1500);
    }
  }

  _playPlayerActionResult(result, abilityId = null) {
    if (!result) return 1000;

    if (result.type === 'confused') {
      this.scene.flash(0xffaa00, 0.12);
      this.scene.shake(result.critical ? 0.5 : 0.3);
      AudioManager.playSfx('hit');
      this._spawnDamageNumberForAlly(result.damage, result.critical ? 'critical' : 'damage', this._activeAllyIndex);
      this.hud.showMessage(result.message || 'Confused! The action backfires.');
      this.particles.burst({ x: 0, y: 1, z: 4 }, 12, 0xffaa00, 2, 0.7);
      return 1100;
    }

    if (result.type === 'counter') {
      this.scene.shake(0.6);
      AudioManager.playSfx('hit');
      this._spawnDamageNumberForAlly(result.damage, result.critical ? 'critical' : 'damage', 0);
      this.hud.showMessage('"Great catch! But actually..." Counter!');
      this.particles.burst({ x: 0, y: 1, z: 4 }, 15, 0xffcc00, 3, 0.8);
      return 1200;
    }

    if (result.type === 'break_counter') {
      this.scene.playerAttackAnim(this._activeAllyIndex);
      AudioManager.playSfx('hit');
      this.scene.shake(0.2);
      const ti = result.targetIndex ?? 0;
      setTimeout(() => {
        this.scene.enemyHurtAnim(ti);
        this._spawnDamageNumberAtEnemy(result.damage, 'damage', ti);
      }, 100);
      this.hud.showMessage('Pushed through the counter!');
      this.particles.burst({ x: 0, y: 1.2, z: 0 }, 10, 0x44aaff, 2, 0.6);
      return 1200;
    }

    // AoE attack: per-target hurt anim
    if (result.aoe && Array.isArray(result.hits)) {
      const aniDelay = abilityId ? this._playAbilityAnim(abilityId, result, true) : 0;
      result.hits.forEach((h, i) => {
        setTimeout(() => {
          this.scene.enemyHurtAnim(h.targetIndex);
          this._spawnDamageNumberAtEnemy(h.damage, h.critical ? 'critical' : 'damage', h.targetIndex);
        }, 250 + i * 130);
      });
      return aniDelay || (700 + result.hits.length * 130);
    }

    if (abilityId) return this._playAbilityAnim(abilityId, result);

    // Generic single-target attack
    if (result.type === 'attack' || result.type === 'attack_aoe') {
      const ti = result.targetIndex ?? 0;
      this.scene.playerAttackAnim(this._activeAllyIndex);
      AudioManager.playSfx(result.critical ? 'critical' : 'hit');
      this.particles.stream({ x:  0.2, y: 1.0, z: 3.8 }, { x: 0, y: 1.2, z: 0.3 }, 14, 0xffffff, 0.20);
      this.particles.stream({ x: -0.1, y: 1.1, z: 3.8 }, { x: 0, y: 1.0, z: 0.2 },  8, 0xffee88, 0.22);
      setTimeout(() => {
        this.scene.enemyHurtAnim(ti);
        this.scene.shake(result.critical ? 0.8 : 0.3);
        this._spawnDamageNumberAtEnemy(result.damage, result.critical ? 'critical' : 'damage', ti);
        if (result.critical) this.particles.burst({ x: 0, y: 1.2, z: 0 }, 25, 0xff4444, 4, 1.0);
        else this.particles.burst({ x: 0, y: 1.2, z: 0 }, 15, 0xffcc00, 3, 0.8);
        if (result.effective === 'super') {
          setTimeout(() => this.hud.showMessage('WEAKNESS! +50% damage!'), 300);
        } else if (result.effective === 'resist') {
          setTimeout(() => this.hud.showMessage('Resisted... -30% damage.'), 300);
        }
        if (result.combo) {
          setTimeout(() => this.hud.showMessage('FOLLOW THROUGH! +25% damage!'), result.effective ? 600 : 300);
        }
      }, 220);
      return 1200;
    }

    if (result.type === 'heal') {
      AudioManager.playSfx('heal');
      this._spawnDamageNumberForAlly(`+${result.healAmount}`, 'heal', this._activeAllyIndex);
      this.particles.burst({ x: 0, y: 1, z: 4 }, 10, 0x44ff44, 2, 1.0);
      this.hud.showMessage(`${result.abilityName}!`);
      return result.skipsTurn ? 800 : 1000;
    }

    if (result.type === 'buff') {
      AudioManager.playSfx('confirm');
      this.hud.showMessage(`${result.abilityName}! Buffed for ${result.duration} turns!`);
      return 1000;
    }

    if (result.type === 'debuff') {
      AudioManager.playSfx('confirm');
      this.hud.showMessage(`${result.abilityName}! Enemy weakened for ${result.duration} turns!`);
      return 1000;
    }

    if (result.type === 'stall') {
      AudioManager.playSfx('confirm');
      this.hud.showMessage(`Stall! +${result.momentumGain} Confidence — enemy loses their turn!`);
      return 800;
    }

    if (result.type === 'special') {
      AudioManager.playSfx('confirm');
      this.hud.showMessage(`${result.abilityName}!`);
      return 1000;
    }

    if (result.type === 'item') {
      if (result.healAmount) {
        AudioManager.playSfx('heal');
        this._spawnDamageNumberForAlly(`+${result.healAmount}`, 'heal', this._activeAllyIndex);
        this.particles.burst({ x: 0, y: 1, z: 4 }, 10, 0x44ff44, 2, 1.0);
      } else if (result.buffAmount) {
        AudioManager.playSfx('confirm');
        this.hud.showMessage(`${result.itemName} boosted your stats!`);
      }
      return 1000;
    }

    return 1000;
  }

  // Same per-ability animations, but parameterized for AoE skip path.
  // skipImpact = true tells AoE callers to handle hurt/damage numbers themselves.
  _playAbilityAnim(abilityId, result, skipImpact = false) {
    const crit = result.critical;
    const ti = result.targetIndex ?? 0;
    const allyIndex = this._activeAllyIndex;

    switch (abilityId) {
      case 'file_motion': {
        this.scene.playerAbilityLunge(0.5, allyIndex);
        this.particles.stream(
          { x: 0.1, y: 1.0, z: 3.5 },
          { x: 0.0, y: 1.2, z: 0.3 },
          20, 0xfffde8, 0.35
        );
        if (!skipImpact) setTimeout(() => {
          this.scene.enemyHurtAnim(ti);
          this.scene.shake(crit ? 0.7 : 0.35);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 30 : 18, 0xfffde8, 2.5, 0.7);
          this.particles.burst({ x: 0, y: 1.0, z: 0 }, 8, 0xccccaa, 1.5, 0.5);
          if (crit) this.scene.flash(0xffffee, 0.1);
        }, 350);
        return 1400;
      }
      case 'cite_precedent': {
        this.scene.playerAbilityLunge(0.4, allyIndex);
        this.scene.flash(0xddaa00, 0.08);
        this.particles.burst({ x: 0,    y: 2.8, z: 0 }, 15, 0xffdd44, 0.8, 0.55);
        this.particles.burst({ x: 0.3,  y: 2.5, z: 0 }, 10, 0xddaa00, 0.6, 0.45);
        if (!skipImpact) setTimeout(() => {
          this.scene.flash(0xffdd00, 0.2);
          this.scene.shake(crit ? 1.0 : 0.7);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.5, z: 0 }, crit ? 35 : 25, 0xffd700, 3.5, 1.0);
          this.particles.burst({ x: 0, y: 0.3, z: 0 }, 12, 0xaa8800, 2.0, 0.6);
        }, 500);
        return 1600;
      }
      case 'per_my_last_email': {
        this.scene.playerAbilityLunge(0.8, allyIndex);
        this.hud.showMessage('Per My Last Email...');
        this.scene.flash(0x660000, 0.15);
        this.particles.burst({ x: 0, y: 1.8, z: 1.5 }, 20, 0xff2200, 3, 0.55);
        setTimeout(() => {
          this.scene.flash(0xaa0000, 0.18);
          this.scene.shake(0.6);
          this.particles.burst({ x: 0, y: 1.5, z: 0.8 }, 30, 0xff4400, 4, 0.75);
        }, 250);
        if (!skipImpact) setTimeout(() => {
          this.scene.flash(0xff0000, 0.3);
          this.scene.shake(crit ? 1.5 : 1.2);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 50 : 40, 0xff0000, 5,   1.2);
          this.particles.burst({ x: 0, y: 1.4, z: 0 }, 20,             0xff8800, 4,   0.9);
          this.particles.burst({ x: 0, y: 1.0, z: 0 }, 15,             0xffff00, 3,   0.7);
        }, 500);
        return 1800;
      }
      case 'cc_all': {
        this.scene.playerAbilityLunge(0.5, allyIndex);
        this.hud.showMessage('CC All! Everyone is now involved.');
        this.scene.flash(0x2244aa, 0.10);
        this.particles.ring({ x: 0, y: 1.0, z: 0 }, 28, 0x4488ff, 3.5, 1.0);
        // Note: AoE — caller (skipImpact=true) handles per-target hurt anims
        if (!skipImpact) setTimeout(() => {
          this.scene.shake(crit ? 0.7 : 0.4);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.ring({ x: 0, y: 1.3, z: 0 }, 24, 0x2266dd, 4.5, 0.85);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 25 : 15, 0x88aaff, 3, 0.8);
        }, 300);
        setTimeout(() => {
          this.particles.ring({ x: 0, y: 0.7, z: 0 }, 20, 0x66aaff, 5.5, 0.70);
        }, 500);
        return 1600;
      }
      case 'coffee_break': {
        AudioManager.playSfx('heal');
        this._spawnDamageNumberForAlly(`+${result.healAmount}`, 'heal', allyIndex);
        this.hud.showMessage(`${result.abilityName}!`);
        this.scene.flash(0x7a4522, 0.08);
        this.particles.rise({ x:  0.0, y: 0.4, z: 4.0 }, 18, 0xaa7744, 1.8);
        this.particles.rise({ x:  0.2, y: 0.7, z: 4.1 }, 12, 0xffcc88, 1.5);
        setTimeout(() => {
          this.particles.rise({ x: -0.2, y: 0.5, z: 3.9 }, 10, 0xdd9955, 1.3);
          this.particles.burst({ x: 0, y: 1.1, z: 4 }, 8, 0x44ff88, 1.5, 0.8);
        }, 300);
        return 1200;
      }
      case 'billable_hours': {
        AudioManager.playSfx('confirm');
        this.hud.showMessage(`${result.abilityName}! Stats buffed for ${result.duration} turns!`);
        this.scene.flash(0xddaa00, 0.12);
        this.particles.orbit({ x: 0, y: 1.0, z: 4 }, 16, 0xffd700, 0.9, 1.4);
        this.particles.orbit({ x: 0, y: 1.2, z: 4 }, 10, 0xffee44, 0.6, 1.1);
        setTimeout(() => {
          this.scene.flash(0xffdd00, 0.10);
          this.particles.burst({ x: 0, y: 2.2, z: 4 }, 25, 0xffd700, 2.5, 1.0);
          this.particles.burst({ x: 0, y: 1.8, z: 4 }, 15, 0xffee88, 2.0, 0.8);
        }, 400);
        return 1400;
      }
      case 'fiduciary_shield': {
        AudioManager.playSfx('confirm');
        this.hud.showMessage(`${result.abilityName}! DEF buffed for ${result.duration} turns!`);
        this.scene.flash(0x2266ff, 0.12);
        this.particles.orbit({ x: 0, y: 1.0, z: 4 }, 20, 0x4488ff, 1.2, 1.6);
        this.particles.orbit({ x: 0, y: 1.4, z: 4 }, 12, 0x88bbff, 0.8, 1.2);
        setTimeout(() => {
          this.particles.burst({ x: 0, y: 1.2, z: 4 }, 18, 0x4488ff, 2.5, 0.9);
        }, 400);
        return 1400;
      }
      case 'due_diligence': {
        AudioManager.playSfx('confirm');
        this.hud.showMessage(`${result.abilityName}! Enemy weakened for ${result.duration} turns!`);
        this.scene.flash(0xddaa00, 0.10);
        this.particles.burst({ x: 0, y: 1.5, z: 0 }, 20, 0xffd700, 3, 1.0);
        setTimeout(() => {
          this.scene.enemyHurtAnim(ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, 15, 0xffee44, 2.5, 0.8);
        }, 300);
        return 1300;
      }
      case 'whistleblower': {
        this.scene.playerAbilityLunge(0.7, allyIndex);
        this.hud.showMessage('Whistleblower!');
        this.scene.flash(0xcc0000, 0.12);
        this.particles.burst({ x: 0, y: 1.5, z: 2 }, 15, 0xff2200, 3, 0.6);
        setTimeout(() => {
          this.scene.flash(0xff0000, 0.15);
          this.scene.shake(0.5);
          this.particles.burst({ x: 0, y: 1.3, z: 1 }, 20, 0xff4400, 3.5, 0.8);
        }, 250);
        if (!skipImpact) setTimeout(() => {
          this.scene.flash(0xff2200, 0.25);
          this.scene.shake(crit ? 1.2 : 0.9);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 40 : 30, 0xff0000, 4, 1.0);
        }, 500);
        return 1600;
      }
      case 'power_of_attorney': {
        AudioManager.playSfx('heal');
        this.hud.showMessage(`${result.abilityName}!`);
        this._spawnDamageNumberForAlly(`+${result.healAmount}`, 'heal', allyIndex);
        this.scene.flash(0x22aa44, 0.15);
        this.particles.burst({ x: 0, y: 0.5, z: 4 }, 25, 0x44ff88, 3, 1.2);
        this.particles.rise({ x: 0, y: 0.3, z: 4 }, 20, 0x88ffaa, 2.0);
        setTimeout(() => {
          this.particles.burst({ x: 0, y: 1.5, z: 4 }, 15, 0x44ff44, 2.5, 0.9);
        }, 400);
        return 1400;
      }
      case 'root_access': {
        this.scene.playerAbilityLunge(0.6, allyIndex);
        this.hud.showMessage('Root Access!');
        this.particles.stream({ x: 0.1, y: 1.0, z: 3.5 }, { x: 0, y: 1.2, z: 0.3 }, 25, 0x00ff44, 0.4);
        this.particles.stream({ x: -0.1, y: 1.3, z: 3.5 }, { x: 0, y: 1.0, z: 0.2 }, 15, 0x44ff88, 0.35);
        if (!skipImpact) setTimeout(() => {
          this.scene.enemyHurtAnim(ti);
          this.scene.shake(crit ? 0.9 : 0.5);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 35 : 22, 0x00ff44, 3.5, 1.0);
          if (result.strippedBuffs) this.hud.showMessage('All enemy buffs stripped!');
        }, 400);
        return 1500;
      }
      case 'firewall': {
        AudioManager.playSfx('confirm');
        this.hud.showMessage('Firewall active! Next enemy action will be blocked.');
        this.scene.flash(0x2244aa, 0.15);
        this.particles.burst({ x: 0, y: 1.0, z: 3 }, 20, 0x4488ff, 3, 1.0);
        this.particles.orbit({ x: 0, y: 1.0, z: 4 }, 14, 0x88aaff, 1.0, 1.4);
        return 1300;
      }
      case 'temporal_audit': {
        AudioManager.playSfx('confirm');
        this.hud.showMessage('Temporal Audit! You get another action!');
        this.scene.flash(0x8844cc, 0.15);
        this.particles.burst({ x: 0, y: 1.2, z: 4 }, 20, 0xaa66ff, 3, 1.0);
        this.particles.orbit({ x: 0, y: 1.0, z: 4 }, 16, 0xcc88ff, 1.2, 1.5);
        return 1200;
      }
      case 'notarized_strike': {
        this.scene.playerAbilityLunge(0.7, allyIndex);
        this.hud.showMessage('Notarized Strike!');
        this.scene.flash(0xddaa00, 0.10);
        this.particles.burst({ x: 0, y: 2.5, z: 0 }, 12, 0xffd700, 1.0, 0.5);
        if (!skipImpact) setTimeout(() => {
          this.scene.flash(0xffdd00, 0.25);
          this.scene.shake(crit ? 1.2 : 0.8);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 35 : 25, 0xffd700, 4, 1.0);
          this.particles.burst({ x: 0, y: 0.5, z: 0 }, 10, 0xaa8800, 2, 0.6);
        }, 400);
        return 1500;
      }
      case 'invoke_charter': {
        this.scene.playerAbilityLunge(0.9, allyIndex);
        this.hud.showMessage('Invoke Charter!');
        this.scene.flash(0xffffff, 0.15);
        this.particles.burst({ x: 0, y: 3.0, z: 0 }, 20, 0xffffff, 1.5, 0.6);
        this.particles.burst({ x: 0, y: 2.8, z: 0 }, 15, 0xffd700, 1.2, 0.5);
        if (!skipImpact) setTimeout(() => {
          this.scene.flash(0xffffcc, 0.30);
          this.scene.shake(crit ? 1.5 : 1.0);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.5, z: 0 }, crit ? 45 : 35, 0xffffff, 5, 1.2);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, 20, 0xffd700, 4, 1.0);
        }, 500);
        return 1700;
      }
      default: {
        if (!skipImpact) {
          this.scene.enemyHurtAnim(ti);
          this.scene.shake(crit ? 0.8 : 0.3);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          if (result.damage) {
            this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
            this.particles.burst({ x: 0, y: 1.2, z: 0 }, 15, 0xffcc00, 3, 0.8);
            if (result.effective === 'super') setTimeout(() => this.hud.showMessage('WEAKNESS! +50% damage!'), 300);
            else if (result.effective === 'resist') setTimeout(() => this.hud.showMessage('Resisted... -30% damage.'), 300);
            if (result.combo) setTimeout(() => this.hud.showMessage('FOLLOW THROUGH! +25% damage!'), result.effective ? 600 : 300);
          }
          if (result.healAmount) {
            this._spawnDamageNumberForAlly(`+${result.healAmount}`, 'heal', this._activeAllyIndex);
            this.particles.burst({ x: 0, y: 1, z: 4 }, 10, 0x44ff44, 2, 1.0);
          }
        }
        return 1200;
      }
    }
  }

  // ── Result handling ──────────────────────────────────────────────────
  _handleResult() {
    this.phase = 'result';
    this.inputEnabled = false;

    if (this.engine.result === 'victory') {
      AudioManager.playSfx('victory');
      // Defeat anim for any enemies still in scene at hp 0
      this.engine.enemies.forEach((e, i) => { if (e.hp <= 0) this.scene.enemyDefeatAnim(i); });

      const xp = this.engine.getXPReward();
      setTimeout(() => {
        this.hud.showMessage(`Victory! +${xp} XP`);
        this.player.stats.hp = this.player.stats.maxHP;
        this.player.stats.mp = this.player.stats.maxMP;
        // Restore allies to full after victory (matches Andrew's restoration). Persisted to allyState.
        for (let i = 1; i < this.engine.allies.length; i++) {
          const ally = this.engine.allies[i];
          if (!ally.allyId || !this.player.allyState[ally.allyId]) continue;
          this.player.allyState[ally.allyId].hp = ally.maxHP;
          this.player.allyState[ally.allyId].mp = ally.maxMP;
        }
        const levels = this.player.gainXP(xp);
        if (levels.length > 0) {
          AchievementManager.check(this.player, { event: 'level_up' });
          setTimeout(() => {
            AudioManager.playSfx('levelup');
            this.hud.showMessage(`Level Up! Lv.${levels[levels.length - 1]}! +${levels.length} Upgrade Point${levels.length > 1 ? 's' : ''}!`);
          }, 1500);
        }
        setTimeout(() => this._endCombat('victory'), levels.length > 0 ? 3500 : 2000);
      }, 1000);
    } else if (this.engine.result === 'defeat') {
      AudioManager.playSfx('defeat');
      const scriptedKarenLoss = this.enemyId === 'karen' && !this.player.getFlag('retry_karen');
      if (!scriptedKarenLoss) this.player.deaths = (this.player.deaths || 0) + 1;
      this.hud.showMessage('Your patience has run out...');
      setTimeout(() => this._endCombat('defeat'), 2500);
    }
  }

  _endCombat(result) {
    if (this.onEnd) this.onEnd(result);
    this.stateManager.pop();
  }

  // ── HUD refresh helpers ──────────────────────────────────────────────
  _refreshHUD() {
    const ally = this.engine.allies[this._activeAllyIndex] || this.engine.allies[0];
    this.hud.updatePlayerStats({
      ...(this._activeAllyIndex === 0 ? this.player.stats : {}),
      hp: ally.hp,
      mp: ally.mp,
      maxHP: ally.maxHP,
      maxMP: ally.maxMP,
      momentum: this.engine.player.momentum,
      name: ally.name,
      isPlayer: this._activeAllyIndex === 0,
      _xpTable: this._activeAllyIndex === 0 ? XP_TABLE : null,
    });
    this.hud.updateAllEnemies(this.engine.enemies);
    this.hud.updateBuffStatus(this.engine.player.buffs, this.engine.enemy?.buffs || []);
    this.hud.refreshPartyRow(this._buildPartyView());
  }

  _spawnDamageNumberAtEnemy(text, type, enemyIndex) {
    const cx = window.innerWidth / 2;
    // Spread enemy damage numbers horizontally based on enemy index relative to center
    const count = this.engine.enemies.length;
    const offset = count > 1 ? ((enemyIndex - (count - 1) / 2) * 160) : 0;
    const baseY = window.innerHeight * 0.35;
    const jitter = (Math.random() - 0.5) * 40;
    this.floatingText.spawn(String(text), cx + offset + jitter, baseY, type);
  }

  _spawnDamageNumberForAlly(text, type, allyIndex) {
    const cx = window.innerWidth / 2;
    const count = this.engine.allies.length;
    const offset = count > 1 ? ((allyIndex - 0) * 120 + 100) : 0;
    const baseY = window.innerHeight * 0.65;
    const jitter = (Math.random() - 0.5) * 30;
    this.floatingText.spawn(String(text), cx + offset + jitter, baseY, type);
  }

  // Legacy entrypoint preserved for code that calls _spawnDamageNumber('text','type','enemy'|'player')
  _spawnDamageNumber(text, type, target = 'enemy') {
    if (target === 'enemy') this._spawnDamageNumberAtEnemy(text, type, this.engine.targetEnemyIndex);
    else this._spawnDamageNumberForAlly(text, type, this._activeAllyIndex);
  }

  _showEffects(effects, callback, target = 'player') {
    let delay = 0;
    for (const effect of effects) {
      setTimeout(() => {
        if (effect.type === 'dot') {
          this.scene.flash(0x880088, 0.1);
          if (target === 'player') this._spawnDamageNumberForAlly(effect.damage, 'damage', this._activeAllyIndex);
          else this._spawnDamageNumberAtEnemy(effect.damage, 'damage', 0);
          this.hud.showMessage(`${effect.name}: ${effect.damage} damage!`);
        } else if (effect.type === 'buff_expire') {
          this.hud.showMessage(`${effect.name} wore off!`);
        } else if (effect.type === 'stunned') {
          this.hud.showMessage('Still stunned!');
        } else if (effect.type === 'confused') {
          this.hud.showMessage('Confused! Your next action may backfire.');
        } else if (effect.type === 'silenced') {
          this.hud.showMessage(effect.message || 'Silenced! Can only use basic attacks.');
        } else if (effect.type === 'status_expire') {
          this.hud.showMessage(effect.message);
        }
        this._refreshHUD();
      }, delay);
      delay += 800;
    }
    setTimeout(callback, delay + 300);
  }

  // ── Brace / Retaliate / Power / Press / Gamble / Second Wind ─────────
  _executeBrace() {
    this._showBraceMiniGame((quality) => {
      const result = this.engine.playerBrace(quality);
      if (!result) return;

      this.phase = 'animating';
      this.hud.disableInput();

      const messages = {
        perfect: `Perfect stance! DEF +${result.defBonus} for ${result.duration} turns.`,
        good:    `Bracing! DEF +${result.defBonus} for ${result.duration} turns.`,
        miss:    `Off guard! DEF +${result.defBonus} for ${result.duration} turn.`,
      };
      this.hud.showMessage(messages[quality]);
      AudioManager.playSfx('confirm');
      const color = quality === 'perfect' ? 0xffd700 : quality === 'good' ? 0x4488ff : 0x888888;
      this.particles.burst({ x: 0, y: 1.2, z: 4 }, quality === 'perfect' ? 30 : 20, color, 2.5, 1.0);
      if (quality !== 'miss') this.particles.orbit({ x: 0, y: 1.0, z: 4 }, 12, 0x88aaff, 1.0, 1.2);
      if (quality === 'perfect') AchievementManager.check(this.player, { event: 'perfect_brace' });

      this._refreshHUD();
      setTimeout(() => this._processNextAllyTurn(), 1200);
    });
  }

  _showBraceMiniGame(onComplete) {
    const TRACK_W = 300;
    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.innerHTML = `
      <div class="minigame-title">Time your stance!</div>
      <div class="minigame-bar-track">
        <div class="minigame-marker" id="brace-marker"></div>
      </div>
      <div class="minigame-hint">Press SPACE or ENTER</div>
    `;
    document.getElementById('ui-overlay').appendChild(overlay);

    const marker = overlay.querySelector('#brace-marker');
    let pos = 0, dir = 1, done = false;
    const speed = 420;
    let last = performance.now();
    let animId;

    const tick = (now) => {
      if (done) return;
      const dt = (now - last) / 1000;
      last = now;
      pos += dir * speed * dt;
      if (pos >= TRACK_W) { pos = TRACK_W; dir = -1; }
      if (pos <= 0) { pos = 0; dir = 1; }
      marker.style.left = `${pos}px`;
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);

    const resolve = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(animId);
      const center = TRACK_W / 2;
      const pct = Math.abs(pos - center) / (TRACK_W / 2);
      const quality = pct <= 0.10 ? 'perfect' : pct <= 0.35 ? 'good' : 'miss';
      overlay.remove();
      onComplete(quality);
    };

    const keyHandler = (e) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
        e.preventDefault();
        document.removeEventListener('keydown', keyHandler);
        resolve();
      }
    };
    document.addEventListener('keydown', keyHandler);
    overlay.addEventListener('click', () => {
      document.removeEventListener('keydown', keyHandler);
      resolve();
    });
  }

  _executePowerMove(targetIndex) {
    const result = this.engine.playerPowerMove(targetIndex);
    if (!result) return;

    this.phase = 'animating';
    this.hud.disableInput();

    this.hud.showMessage('ASSERT DOMINANCE!');
    this._fireTaunt('power_move');
    this._checkPhaseChange();
    AchievementManager.check(this.player, { event: 'power_move_used' });
    this.scene.flash(0xffd700, 0.15);
    this.particles.burst({ x: 0, y: 2.5, z: 2 }, 30, 0xffd700, 4, 0.8);
    this.particles.burst({ x: 0, y: 1.8, z: 2 }, 20, 0xffff00, 3, 0.6);

    setTimeout(() => {
      this.scene.flash(0xffffff, 0.3);
      this.scene.shake(1.5);
      this.scene.enemyHurtAnim(result.targetIndex ?? 0);
      this.scene.playerAbilityLunge(1.0, this._activeAllyIndex);
      AudioManager.playSfx('critical');
      this._spawnDamageNumberAtEnemy(result.damage, 'critical', result.targetIndex ?? 0);
      this.particles.burst({ x: 0, y: 1.2, z: 0 }, 50, 0xffd700, 6, 1.5);
      this.particles.burst({ x: 0, y: 1.5, z: 0 }, 25, 0xffffff, 5, 1.2);
    }, 400);

    this._refreshHUD();
    setTimeout(() => {
      if (this.engine.isOver) this._handleResult();
      else this._processNextAllyTurn();
    }, 2000);
  }

  _executePressAdvantage(targetIndex) {
    const result = this.engine.playerPressAdvantage(targetIndex);
    if (!result) return;

    this.phase = 'animating';
    this.hud.disableInput();
    this.hud.showMessage('Press Advantage! Enemy DEF lowered!');
    this.scene.playerAbilityLunge(0.6, this._activeAllyIndex);
    this.scene.flash(0x8844ff, 0.10);
    this.particles.stream({ x: 0.1, y: 1.0, z: 3.5 }, { x: 0, y: 1.2, z: 0.3 }, 18, 0xaa66ff, 0.30);
    setTimeout(() => {
      this.scene.enemyHurtAnim(result.targetIndex ?? 0);
      this.scene.shake(result.critical ? 0.7 : 0.4);
      AudioManager.playSfx(result.critical ? 'critical' : 'hit');
      this._spawnDamageNumberAtEnemy(result.damage, result.critical ? 'critical' : 'damage', result.targetIndex ?? 0);
      this.particles.burst({ x: 0, y: 1.2, z: 0 }, result.critical ? 25 : 15, 0xaa66ff, 3, 0.9);
    }, 300);

    if (result.critical) this._fireTaunt('crit');
    this._checkPhaseChange();
    this._refreshHUD();
    setTimeout(() => {
      if (this.engine.isOver) this._handleResult();
      else this._processNextAllyTurn();
    }, 1400);
  }

  _executeSecondWind() {
    const result = this.engine.playerSecondWind();
    if (!result) return;

    this.phase = 'animating';
    this.hud.disableInput();
    let msg = `Second Wind! +${result.healAmount} HP`;
    if (result.clearedStatus) msg += ` | ${result.clearedStatus} cleared!`;
    this.hud.showMessage(msg);
    AchievementManager.check(this.player, { event: 'second_wind_used' });
    AudioManager.playSfx('heal');
    this._spawnDamageNumberForAlly(`+${result.healAmount}`, 'heal', 0);
    this.scene.flash(0x44aaff, 0.12);
    this.particles.burst({ x: 0, y: 1.0, z: 4 }, 18, 0x44aaff, 2.5, 1.0);
    this.particles.rise({ x: 0, y: 0.5, z: 4 }, 12, 0x88ccff, 1.8);

    this._refreshHUD();
    setTimeout(() => {
      if (this.engine.isOver) this._handleResult();
      else this._processNextAllyTurn();
    }, 1400);
  }

  _executeRetaliate(targetIndex) {
    this._showRetaliateQTE((multiplier) => {
      const result = this.engine.playerRetaliate(multiplier, targetIndex);
      if (!result) return;

      this.phase = 'animating';
      this.hud.disableInput();
      const msg = multiplier >= 1.4 ? 'DEVASTATING COUNTER!' : multiplier >= 1.0 ? 'Direct Counter!' : multiplier >= 0.66 ? 'Counter-Attack!' : 'Glancing Counter...';
      this.hud.showMessage(msg);
      this._fireTaunt('retaliate');
      AchievementManager.check(this.player, { event: 'retaliate_used' });
      this.scene.playerAttackAnim(this._activeAllyIndex);
      AudioManager.playSfx(result.critical ? 'critical' : 'hit');
      this.particles.stream({ x: 0.1, y: 1.0, z: 3.8 }, { x: 0, y: 1.2, z: 0.3 }, 16, 0x44ffaa, 0.25);
      setTimeout(() => {
        this.scene.enemyHurtAnim(result.targetIndex ?? 0);
        this.scene.shake(result.critical ? 0.8 : 0.4);
        this.scene.flash(0x44ffaa, 0.12);
        this._spawnDamageNumberAtEnemy(result.damage, result.critical ? 'critical' : 'damage', result.targetIndex ?? 0);
        this.particles.burst({ x: 0, y: 1.2, z: 0 }, result.critical ? 28 : 18, 0x44ffaa, 3, 0.9);
      }, 200);

      this._checkPhaseChange();
      this._refreshHUD();
      setTimeout(() => {
        if (this.engine.isOver) this._handleResult();
        else this._processNextAllyTurn();
      }, 1300);
    });
  }

  _showRetaliateQTE(onComplete) {
    const BASE_MULTIPLIERS = { 3: 0.75, 4: 1.0, 5: 1.25, 6: 1.5 };
    const LENGTH_OPTIONS = [
      { len: 3, label: '3 Keys',  desc: '0.75× base — minimum risk', color: '#88aaff' },
      { len: 4, label: '4 Keys',  desc: '1.0× base — standard counter', color: '#88ffaa' },
      { len: 5, label: '5 Keys',  desc: '1.25× base — aggressive counter', color: '#ffaa44' },
      { len: 6, label: '6 Keys',  desc: '1.5× base — maximum damage', color: '#ff4466' },
    ];

    const selOverlay = document.createElement('div');
    selOverlay.className = 'minigame-overlay';
    selOverlay.innerHTML = `
      <div class="minigame-title">Counter Sequence</div>
      <div class="gamble-options">
        ${LENGTH_OPTIONS.map((o, i) => `
          <div class="gamble-option${i === 0 ? ' selected' : ''}" data-len="${o.len}" data-i="${i}">
            <div class="gamble-option-name" style="color:${o.color}">${o.label}</div>
            <div class="gamble-option-desc">${o.desc}</div>
          </div>`).join('')}
      </div>
      <div class="minigame-hint">↑↓/WS navigate · ENTER/E confirm</div>
    `;
    document.getElementById('ui-overlay').appendChild(selOverlay);

    let selIdx = 0;
    const optEls = selOverlay.querySelectorAll('.gamble-option');
    const updateSel = () => optEls.forEach((el, i) => el.classList.toggle('selected', i === selIdx));
    const confirmSelection = () => {
      document.removeEventListener('keydown', selHandler);
      const chosenLen = LENGTH_OPTIONS[selIdx].len;
      selOverlay.remove();
      this._runRetaliateSequence(chosenLen, BASE_MULTIPLIERS[chosenLen], onComplete);
    };
    optEls.forEach((el, i) => {
      el.addEventListener('click', () => { selIdx = i; updateSel(); confirmSelection(); });
    });
    const selHandler = (e) => {
      if (e.code === 'ArrowUp'   || e.code === 'KeyW') { selIdx = Math.max(0, selIdx - 1); updateSel(); e.preventDefault(); }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { selIdx = Math.min(LENGTH_OPTIONS.length - 1, selIdx + 1); updateSel(); e.preventDefault(); }
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
        e.preventDefault();
        confirmSelection();
      }
    };
    document.addEventListener('keydown', selHandler);
  }

  _runRetaliateSequence(seqLen, baseMultiplier, onComplete) {
    const KEYS = [
      { code: 'ArrowUp',    label: '↑' },
      { code: 'ArrowDown',  label: '↓' },
      { code: 'ArrowLeft',  label: '←' },
      { code: 'ArrowRight', label: '→' },
      { code: 'KeyF',       label: 'F' },
    ];
    const sequence = Array.from({ length: seqLen }, () => KEYS[Math.floor(Math.random() * KEYS.length)]);

    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.innerHTML = `
      <div class="minigame-title">Counter sequence!</div>
      <div class="minigame-sequence">
        ${sequence.map((k, i) => `<span class="qte-key" data-i="${i}">${k.label}</span>`).join('')}
      </div>
      <div class="minigame-hint" id="qte-hint">Memorize...</div>
    `;
    document.getElementById('ui-overlay').appendChild(overlay);

    const keyEls = overlay.querySelectorAll('.qte-key');
    let inputIndex = 0, correct = 0, inputPhase = false, keyHandler, inputTimeout;
    const memorizeMs = 1200 + seqLen * 150;

    setTimeout(() => {
      if (!overlay.parentNode) return;
      overlay.querySelector('#qte-hint').textContent = 'Enter the sequence!';
      keyEls.forEach(el => { el.textContent = '?'; });
      inputPhase = true;

      inputTimeout = setTimeout(() => {
        if (!overlay.parentNode) return;
        document.removeEventListener('keydown', keyHandler);
        overlay.remove();
        onComplete(baseMultiplier * (correct / sequence.length));
      }, 3000);

      const WASD_TO_ARROW = { KeyW: 'ArrowUp', KeyS: 'ArrowDown', KeyA: 'ArrowLeft', KeyD: 'ArrowRight' };
      keyHandler = (e) => {
        if (!inputPhase || inputIndex >= sequence.length) return;
        const validCodes = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyF', 'KeyW', 'KeyA', 'KeyS', 'KeyD'];
        if (!validCodes.includes(e.code)) return;
        e.preventDefault();
        const pressedCode = WASD_TO_ARROW[e.code] || e.code;
        const el = keyEls[inputIndex];
        if (pressedCode === sequence[inputIndex].code) {
          correct++;
          el.textContent = sequence[inputIndex].label;
          el.classList.add('correct');
        } else {
          el.textContent = '✗';
          el.classList.add('wrong');
        }
        inputIndex++;
        if (inputIndex >= sequence.length) {
          clearTimeout(inputTimeout);
          document.removeEventListener('keydown', keyHandler);
          setTimeout(() => { overlay.remove(); onComplete(baseMultiplier * (correct / sequence.length)); }, 400);
        }
      };
      document.addEventListener('keydown', keyHandler);
    }, memorizeMs);
  }

  _showDesperateGamble() {
    const options = [
      { risk: 'safe',   label: 'Safe Bet',  desc: 'Guaranteed hit at normal damage (1×)', color: '#88aaff' },
      { risk: 'risky',  label: 'Risky Move', desc: '60% chance of 1.5× damage — or 0.5× on fail', color: '#ffaa44' },
      { risk: 'all_in', label: 'All-In',     desc: '30% chance of 2.5× damage — or nothing', color: '#ff4466' },
    ];
    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    overlay.innerHTML = `
      <div class="minigame-title">Desperate Gamble</div>
      <div class="gamble-options">
        ${options.map((o, i) => `
          <div class="gamble-option${i === 0 ? ' selected' : ''}" data-risk="${o.risk}" data-i="${i}">
            <div class="gamble-option-name" style="color:${o.color}">${o.label}</div>
            <div class="gamble-option-desc">${o.desc}</div>
          </div>`).join('')}
      </div>
      <div class="minigame-hint">↑↓ navigate · ENTER confirm</div>
    `;
    document.getElementById('ui-overlay').appendChild(overlay);

    let sel = 0;
    const optEls = overlay.querySelectorAll('.gamble-option');
    const updateSel = () => optEls.forEach((el, i) => el.classList.toggle('selected', i === sel));
    const resolve = (risk) => {
      document.removeEventListener('keydown', keyHandler);
      overlay.remove();
      this.inputEnabled = false;
      // For desperate gamble, target the lowest-HP alive enemy (most likely to finish)
      const alive = this.engine.aliveEnemies();
      const target = alive.length > 0 ? this.engine.enemies.indexOf(alive.slice().sort((a, b) => a.hp - b.hp)[0]) : 0;
      this._executeDesperateGamble(risk, target);
    };
    optEls.forEach((el) => el.addEventListener('click', () => resolve(el.dataset.risk)));
    const keyHandler = (e) => {
      if (e.code === 'ArrowUp')   { sel = Math.max(0, sel - 1); updateSel(); e.preventDefault(); }
      if (e.code === 'ArrowDown') { sel = Math.min(options.length - 1, sel + 1); updateSel(); e.preventDefault(); }
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') { e.preventDefault(); resolve(options[sel].risk); }
      if (e.code === 'Escape') {
        document.removeEventListener('keydown', keyHandler);
        overlay.remove();
        this._enablePlayerInput();
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  _executeDesperateGamble(risk, targetIndex) {
    const result = this.engine.playerDesperateGamble(risk, targetIndex);
    if (!result) return;

    this.phase = 'animating';
    this.hud.disableInput();
    AchievementManager.check(this.player, { event: 'desperate_gamble_used' });
    if (risk === 'all_in') AchievementManager.check(this.player, { event: 'all_in_used' });

    if (!result.success && risk === 'all_in') {
      this.hud.showMessage('Total miss! Nothing...');
      AudioManager.playSfx('confirm');
    } else {
      const label = risk === 'all_in' ? 'ALL IN pays off!' : risk === 'risky' ? (result.success ? 'Risky move pays off!' : 'Risky move backfires!') : 'Safe bet lands!';
      this.hud.showMessage(label);
      this.scene.playerAttackAnim(this._activeAllyIndex);
      AudioManager.playSfx(result.critical ? 'critical' : 'hit');
      setTimeout(() => {
        this.scene.enemyHurtAnim(result.targetIndex ?? 0);
        this.scene.shake(result.critical ? 1.0 : 0.4);
        this.scene.flash(result.critical ? 0xffd700 : 0xff4466, 0.15);
        this._spawnDamageNumberAtEnemy(result.damage, result.critical ? 'critical' : 'damage', result.targetIndex ?? 0);
        this.particles.burst({ x: 0, y: 1.2, z: 0 }, result.critical ? 35 : 18, 0xff4466, 3, 0.9);
      }, 200);
    }

    this._checkPhaseChange();
    this._refreshHUD();
    setTimeout(() => {
      if (this.engine.isOver) this._handleResult();
      else this._processNextAllyTurn();
    }, 1400);
  }

  _checkPhaseChange() {
    const enemyData = ENEMY_STATS[this.actualEnemyId];
    if (!enemyData || !enemyData.phases) return;
    const currentPhase = this.engine.getActivePhaseIndex();
    if (currentPhase > this._lastPhaseIndex) {
      this._lastPhaseIndex = currentPhase;
      const msg = enemyData.phaseMessages?.[currentPhase];
      const phaseMsg = Array.isArray(msg) ? msg[0] : (msg || `${this.engine.enemy.name} enters a new phase!`);
      setTimeout(() => {
        this.hud.showMessage(phaseMsg);
        this.scene.flash(0xff4400, 0.20);
        this.particles.burst({ x: 0, y: 1.5, z: 0 }, 25, 0xff4400, 4, 1.0);
        const taunt = this._pickTaunt('enemy');
        if (taunt) setTimeout(() => this.hud.showTaunt(taunt, 'enemy'), 600);
      }, 500);
    }
  }

  _fireTaunt(type) {
    if (!ANDREW_TAUNTS[type]) return;
    const lines = ANDREW_TAUNTS[type];
    const line = lines[Math.floor(Math.random() * lines.length)];
    if (Math.random() < 0.6) setTimeout(() => this.hud.showTaunt(line, 'player'), 300);
  }

  _pickTaunt(side) {
    const enemyData = ENEMY_STATS[this.actualEnemyId];
    if (!enemyData || !enemyData.taunts) return null;
    const taunts = enemyData.taunts;
    return taunts[Math.floor(Math.random() * taunts.length)];
  }

  _getTelegraphHint(abilityId, enemy = null) {
    if (!abilityId) return '';
    const ability = ENEMY_ABILITIES[abilityId];
    const name = enemy?.name || this.engine.enemy?.name || 'Enemy';
    if (!ability) return `${name} is making a move...`;
    switch (ability.type) {
      case 'attack': return `${name}: attack`;
      case 'dot': return `${name}: lingering`;
      case 'heal': return `${name}: heal`;
      case 'debuff': return `${name}: weaken`;
      case 'confuse': return `${name}: confuse`;
      case 'stun': return `${name}: stun — brace!`;
      case 'counter': return `${name}: counter — no abilities!`;
      case 'buff': return `${name}: power up`;
      case 'repeat': return `${name}: repeat`;
      default: return `${name}: ?`;
    }
  }

  update(dt) {
    this.scene.update(dt);
    this.particles.update(dt);

    Engine.renderScene(this.scene.scene, this.scene.camera);
    Engine.skipDefaultRender();

    if (this.phase === 'intro') {
      this.animTimer -= dt;
      if (this.animTimer <= 0) {
        this._startRound();
      }
      return;
    }

    if (this.phase === 'ally_turn' && this.inputEnabled) {
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
      if (InputManager.isConfirmPressed()) this.hud.selectCurrent();
      if (InputManager.isCancelPressed()) {
        if (this.hud.currentMenu !== 'main') {
          this.hud.showMainMenu();
          AudioManager.playSfx('cancel');
        }
      }
      if (DEV_MODE && InputManager.isJustPressed('`')) this._devInstantWin();
    }
  }

  _devInstantWin() {
    this.inputEnabled = false;
    this.hud.disableInput();
    for (const e of this.engine.enemies) e.hp = 0;
    this.engine.result = 'victory';
    this.engine.isOver = true;
    this.hud.showMessage('[DEV] Instant win');
    setTimeout(() => this._handleResult(), 800);
  }

  pause() { this.hud.disableInput(); }
  resume() {
    if (this.phase === 'ally_turn') this.hud.enableInput();
  }
}
