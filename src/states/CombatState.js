import { InputManager } from '../core/InputManager.js';
import { AudioManager } from '../core/AudioManager.js';
import { Engine } from '../core/Engine.js';
import { CombatScene } from '../combat/CombatScene.js';
import { CombatEngine } from '../combat/CombatEngine.js';
import { CombatHUD } from '../ui/CombatHUD.js';
import { FloatingText } from '../ui/FloatingText.js';
import { ITEMS, ENEMY_ABILITIES, ENEMY_STATS, ANDREW_TAUNTS, SEAL_COPY, XP_TABLE, PLAYER_ABILITIES } from '../data/stats.js';
import { VOICE_ACTIONS, VOICES } from '../data/voices.js';
// Manual ally control reads ability definitions directly (_handleAllyAction /
// _handleAllyAbility / _executeAllyAbility). This import was missing, so every
// manual-mode ally ability threw a ReferenceError.
import { ALLY_ABILITIES } from '../data/allies.js';
import { AchievementManager } from '../core/AchievementManager.js';
import { NotificationArbiter, NC } from '../core/NotificationArbiter.js';
import { ENCOUNTERS } from '../data/encounters/index.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { CombatCinematics, ARENA_PALETTES, resolveArena } from '../combat/CombatCinematics.js';
import { DAY_BALANCE, dayMutatorActive, readDay } from '../data/billableDay.js';
import { qteModifiers } from '../data/cosmetics.js';
import {
  activeStretchIds, reviewLevel, noteReviewLevel, pipResistance, REVIEW_COPY,
} from '../data/review.js';
import { DEV_MODE } from '../utils/constants.js';

export class CombatState {
  // Which CHARACTER_CONFIGS ids will stand on the stage for this encounter.
  // Split out of the constructor so the combat transition can warm exactly
  // those Meshy GLBs (and nothing else) before the state is built — the
  // constructor calls it too, so there is only one implementation to drift.
  static castIds(encounterId, player) {
    const cfg = ENCOUNTERS[encounterId] || {};
    const enemies = (cfg.enemyIds && cfg.enemyIds.length > 0)
      ? [...cfg.enemyIds]
      : [cfg.enemyId || encounterId];
    let party;
    if (cfg.noParty) party = [];
    else if (cfg.partyIds && cfg.partyIds.length > 0) party = [...cfg.partyIds];
    else if (player?.party && player.party.length > 0) party = player.party.slice(0, 2);
    else party = [];
    return { enemies, party, all: [...enemies, 'andrew', ...party] };
  }

  constructor(stateManager, player, enemyId, onEnd, enemyOverrides = {}) {
    this.stateManager = stateManager;
    this.player = player;
    this.enemyId = enemyId; // encounter ID — used for flags, encounter config lookup
    this.onEnd = onEnd;
    this.encounterConfig = ENCOUNTERS[enemyId] || {};
    // Encounter configs may carry their own enemyOverrides (balance-sim
    // rec: lets the trio fight tune its members without touching their
    // solo fights). Call-site overrides win on conflict.
    this.enemyOverrides = { ...(this.encounterConfig.enemyOverrides || {}), ...enemyOverrides };

    // Resolve enemy list — multi-enemy via enemyIds, fallback to single enemyId mapping.
    // Party list:
    //   1. Encounter `partyIds` overrides (forced narrative party, e.g. trio fight forces Janet)
    //   2. `player.party` — recruited, persistent allies (capped at 2 for readability)
    //   3. Empty (Andrew alone)
    // Encounter also supports `noParty: true` to force a solo fight regardless of recruits.
    const cast = CombatState.castIds(enemyId, player);
    this.enemyIdsList = cast.enemies;
    this.partyIdsList = cast.party;
    this.partyCharIds = ['andrew', ...this.partyIdsList]; // for the scene (visual)
    // The "primary" enemy — used for backdrop colors / ENEMY_STATS lookup for legacy code
    this.actualEnemyId = this.enemyIdsList[0];
    this.canFlee = this.encounterConfig.canFlee !== false;
    // Belt and braces for the Billable Day: ENCOUNTERS.reception_client already
    // sets canFlee:false, and it must stay that way inside a day — HP is only
    // written back to the player on victory, so a flee would hand back a free
    // full bar and erase the day's attrition.
    if (enemyId === 'reception_client' && readDay(this.player)) this.canFlee = false;

    this.scene = new CombatScene();
    this.engine = null;
    this.hud = new CombatHUD();
    this.floatingText = new FloatingText();
    this.particles = new ParticleSystem(this.scene.scene);
    // Cinematic sequencer — authored camera + flourishes layered on the scene.
    this.cine = new CombatCinematics(this.scene, this.hud, this.particles);
    // THE CONTACT CLOCK. Every impact chain in this file registers itself in
    // `_impactHook` via _scheduleImpact() and is fired from here — on the game
    // clock, on the frame the timeline's `impact` step lands.
    this.cine.onImpact = () => { if (this._impactHook) this._impactHook(); };
    this._impactHook = null;
    this._enemyTelegraphInfo = {}; // per-enemy { attack, heavy } stashed from telegraph

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
    // Billable Day: subtractive mutators carried by this fight's client, and
    // the performance counters the day's Hours award is computed from.
    this._subMutators = [];
    this._itemsUsed = 0;
    this._perf = null;
    // Review Level snapshotted at the START of the fight. The memo ladder pays
    // for winning under a set of stretch goals, so the level that gets recorded
    // has to be the one that was running when the bell went — not one the
    // player could otherwise flip on afterwards. Nothing can change it mid-
    // fight today (the toggles live in the break-room shop, which is an
    // exploration state), but snapshotting makes that a guarantee rather than
    // a coincidence.
    this._reviewLevelAtStart = reviewLevel(this.player);
  }

  // ── Billable Day mutator helpers ──────────────────────────────────────
  // Subtractive mutators (see src/data/billableDay.js) take a capability away
  // from Andrew instead of inflating the client — the Balatro Boss Blind model
  // from the comps report (P2.4). They are read off the built enemies so a
  // scripted or multi-enemy fight can never inherit a stale client's rules.
  _hasMutator(id) { return dayMutatorActive(this._subMutators, id); }

  _collectMutators() {
    const seen = new Set();
    const out = [];
    for (const e of (this.engine?.enemies || [])) {
      for (const m of (e.mutators || [])) {
        if (!m || !m.subtractive || seen.has(m.id)) continue;
        seen.add(m.id);
        out.push(m);
      }
    }
    return out;
  }

  // Abilities available to Andrew right now, minus anything a mutator bans.
  _availableAbilities() {
    const list = this.player.getAbilities();
    if (!this._hasMutator('retained_counsel')) return list;
    return list.filter(a => a.tag !== 'legal');
  }

  enter() {
    // Hide the exploration HUD (location badge + quest/objective tracker) for
    // the duration of combat. ExplorationState.pause() leaves it up, so without
    // this the OBJECTIVE panel + "Parking Garage" badge bleed through the fight
    // and collide with enemy taunts (critic). Restored in exit().
    this._explorationHud = document.querySelector('.exploration-hud');
    if (this._explorationHud) {
      this._explorationHudDisplay = this._explorationHud.style.display;
      this._explorationHud.style.display = 'none';
    }
    // DEFER, DON'T DESTROY. Hiding `.exploration-hud` used to kill any live
    // toast INSTANTLY while its own setTimeout kept running and removed the
    // node, so the message never came back: measured at 234 ms of an intended
    // 2600 ms, 91 % of the message lost, in 4 separate runs (always the
    // "Objective Updated" toast at combat entry). Suspending the world scope
    // puts the visible item back in the queue with its REMAINING ttl; it
    // re-surfaces when combat ends. The combat scope opens for this fight.
    NotificationArbiter.mount();
    NotificationArbiter.suspendScope('world');
    NotificationArbiter.openScope('combat');

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
      {
        enemyIds: this.enemyIdsList,
        partyIds: this.partyIdsList,
        partyOverrides,
        // Per-enemy overrides keyed by id (multi-enemy fights) — lets an
        // encounter tune its members without touching their solo fights
        enemyOverrides: this.encounterConfig.enemyOverrides || {},
        ngPlus: !!this.player.getFlag?.('ng_plus'),
        // ng_plus_count was written by MenuState and read by nothing until
        // now — the enemy ladder compounds off it (see NG_PLUS_SCALING).
        ngPlusCount: Number(this.player.getFlag?.('ng_plus_count')) || 0,
        // Overtime: the opt-in Performance Review hard mode (src/data/review.js)
        overtime: !!this.player.getFlag?.('overtime_active'),
        // Stretch Goals: the subtractive, player-priced difficulty ladder.
        // Empty array on any save that never opened the Performance Review tab.
        stretch: activeStretchIds(this.player),
        // Performance Improvement Plan: 0 unless the player filed it.
        pipResist: pipResistance(this.player),
      }
    );

    // Reasonable Doubt: unlock the Charter voice in the Meredith fight if the
    // player has read the charter via the team_chat_hub Witness branch.
    const fightingRachel = this.enemyIdsList.includes('meredith_boss') || this.actualEnemyId === 'meredith_boss';
    if (fightingRachel && this.player.getFlag('witness_charter_read')) {
      this.engine.voiceState.charterUnlocked = true;
    }

    // Per-venue arena palette (backdrop swirl + rim tint). Resolved from the
    // encounter's `arena` field, then the enemy-id venue map, then a default.
    this._arena = resolveArena(this.encounterConfig, this.actualEnemyId);
    this.scene.setArenaLighting(ARENA_PALETTES[this._arena] || ARENA_PALETTES.conference);

    // HUD: enemies + party in the order the engine has them
    const enemiesView = this.engine.enemies.map(e => ({ name: e.name, hp: e.hp, maxHP: e.maxHP }));
    const partyView = this._buildPartyView();
    this.hud.show(enemiesView, partyView, { canFlee: this.canFlee });

    this.hud.onActionSelect = (action) => this._handleAction(action);
    this.hud.onAbilitySelect = (id, item) => this._handleAbility(id, item);
    this.hud.onItemSelect = (id) => this._handleItem(id);
    this.hud.onVoiceSelect = (actionId, item) => this._handleVoice(actionId, item);
    this.hud.onAllyActionSelect = (action) => {
      if (action === 'back') {
        this._enableAllyInput(this._activeAllyIndex);
      } else {
        this._handleAllyAction(action);
      }
    };
    this.hud.onAllyAbilitySelect = (id) => this._handleAllyAbility(id);

    this.phase = 'intro';
    this.animTimer = 1.7; // longer beat so the intro banner + orbit-settle breathe

    // Enemy intro: kinetic name banner + one taunt line, choreographed with the
    // CombatScene slide-in and a camera orbit-settle onto the enemy.
    const introName = this.engine.enemies[0]?.name || 'Opponent';
    this.hud.showEnemyIntro(introName, this._introTaunt(), { hold: 1650 });
    this.cine.play('intro', {});

    // Billable Day: read the fight's subtractive mutators and announce them
    // once the intro banner clears, so a restriction is never a surprise the
    // player only discovers by finding a greyed-out button.
    this._subMutators = this._collectMutators();
    if (this._subMutators.length > 0) {
      const line = this._subMutators.map(m => `${m.label} — ${m.desc}`).join('   ·   ');
      setTimeout(() => this.hud.showMessage(line), 1800);
    }

    this._resizeHandler = () => this.scene.resize();
    window.addEventListener('resize', this._resizeHandler);

    AudioManager.playSfx('confirm');
    // Encounters may specify a battle-music variant via `music` in their config
    AudioManager.playMusic(this.encounterConfig.music || 'combat');

    // Dev-only handle for the cinematics verification harness (tools/cine-shoot):
    // lets it poll input readiness and trigger the real power-move sequence.
    if (DEV_MODE && typeof window !== 'undefined') window.__combat = this;
  }

  exit() {
    if (DEV_MODE && typeof window !== 'undefined' && window.__combat === this) window.__combat = null;

    // THE TIMER LEAK. This function cancelled no pending setTimeout, and
    // ~60 sites in this file schedule `this.hud.showMessage(...)` on a delay.
    // `CombatHUD.container` is the page-level `#ui-overlay`, which survives the
    // state transition — so a message scheduled before the fight ended used to
    // appendChild onto whatever screen was showing when it fired. The probe
    // caught "You wake up at your desk... Was it all a dream?" at 100 % overlap
    // with the exploration dialog speaker for 1574 ms, in 3 separate runs.
    //
    // Fixed at the SINK, not at 60 sources: closing the combat scope drops the
    // pending plate/taunt items to the Log, and every LATER post into a closed
    // scope is logged and dropped instead of painted. `hud.remove()` below
    // latches the HUD closed for the same reason (belt and braces).
    NotificationArbiter.closeScope('combat');
    NotificationArbiter.resumeScope('world');

    // Restore the exploration HUD hidden on enter().
    if (this._explorationHud) {
      this._explorationHud.style.display = this._explorationHudDisplay || '';
      this._explorationHud = null;
    }
    this.hud.remove();
    this.cine.dispose();
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
    // Client-First Scheduling (stretch goal): every enemy acts before the
    // department on the opening round. Subtractive — it takes the initiative
    // away rather than adding a stat — and it only costs the first round, so
    // it reads as one bite, exactly like an Ascension tier.
    this._roundNumber = (this._roundNumber || 0) + 1;
    if (this._roundNumber === 1 && this.engine.hasStretch?.('client_first')) {
      queue.sort((x, y) => (x.kind === y.kind ? 0 : (x.kind === 'enemy' ? -1 : 1)));
    }
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
      } else if ((this.player.allyControl || 'manual') === 'manual') {
        // BG3-style: player picks each ally's action manually
        this._enableAllyInput(this._activeAllyIndex);
      } else {
        this._runAllyAITurn(this._activeAllyIndex);
      }
    };

    if (effects.length > 0) {
      this._showEffects(effects, continueTurn, { side: 'ally', index: this._activeAllyIndex });
    } else {
      continueTurn();
    }
  }

  // ── Manual ally input ─────────────────────────────────────────────────
  // When player.allyControl === 'manual', allies get their own action menu
  // on their turn. Simpler than Andrew's: Attack, Abilities, Skip, plus
  // Auto/Manual toggle.
  _enableAllyInput(allyIndex) {
    this.phase = 'ally_turn';
    this.inputEnabled = true;
    this.hud.enableInput();
    const ally = this.engine.allies[allyIndex];
    this.hud.updatePlayerStats({
      hp: ally.hp, mp: ally.mp,
      maxHP: ally.maxHP, maxMP: ally.maxMP,
      momentum: 0, name: ally.name,
      isPlayer: false,
    });
    this.hud.updateAllEnemies(this.engine.enemies);
    this.hud.showAllyMenu(ally, this.player.allyControl || 'manual');
  }

  _handleAllyAction(action) {
    if (!this.inputEnabled) return;
    AudioManager.playSfx('confirm');
    const ally = this.engine.allies[this._activeAllyIndex];
    if (!ally) return;

    switch (action) {
      case 'attack':
        this.inputEnabled = false;
        this._beginAllyTargetedAttack();
        break;
      case 'abilities': {
        // Build the unlocked-ability list for this ally
        const unlocked = (this.player.allyState[ally.allyId]?.unlockedAbilities) || ally.abilities || [];
        const list = unlocked
          .map(id => ({ id, ...(ALLY_ABILITIES[id] || {}) }))
          .filter(a => a.name); // skip undefined
        this.inputEnabled = true;
        this.hud.showAllyAbilities(list, ally.mp);
        break;
      }
      case 'skip':
        this.inputEnabled = false;
        this.hud.showMessage(`${ally.name} holds.`);
        setTimeout(() => this._processNextTurn(), 800);
        break;
      case 'toggle_auto':
        // Flip persistent preference and either keep manual menu (manual) or
        // hand the rest of this turn to the AI (auto)
        this.player.allyControl = (this.player.allyControl === 'auto') ? 'manual' : 'auto';
        if (this.player.allyControl === 'auto') {
          this.inputEnabled = false;
          this._runAllyAITurn(this._activeAllyIndex);
        } else {
          this._enableAllyInput(this._activeAllyIndex);
        }
        break;
    }
  }

  _handleAllyAbility(abilityId) {
    if (!this.inputEnabled) return;
    AudioManager.playSfx('confirm');
    const ability = ALLY_ABILITIES[abilityId];
    if (!ability) return;
    const ally = this.engine.allies[this._activeAllyIndex];
    if (ally.mp < (ability.cost || 0)) {
      this.hud.showMessage("Not enough Coffee.");
      return;
    }

    const needsTarget = ability.type === 'attack' || ability.type === 'debuff';
    if (needsTarget && this.engine.aliveEnemies().length > 1) {
      this.inputEnabled = false;
      const enemiesView = this.engine.enemies.map((e, i) => ({ name: e.name, hp: e.hp, maxHP: e.maxHP, idx: i }));
      this.phase = 'targeting';
      this.hud.showTargetPicker(enemiesView, (idx) => {
        this.scene.setTargetMarker(idx, true);
        this._executeAllyAbility(abilityId, idx);
        setTimeout(() => this.scene.hideTargetMarker(), 1200);
      }, () => {
        this.phase = 'ally_turn';
        this.inputEnabled = true;
        this._enableAllyInput(this._activeAllyIndex);
      });
    } else {
      this.inputEnabled = false;
      this._executeAllyAbility(abilityId, undefined);
    }
  }

  _beginAllyTargetedAttack() {
    const ally = this.engine.allies[this._activeAllyIndex];
    if (!ally) return;
    if (this.engine.aliveEnemies().length === 1) {
      this._executeAllyBasicAttack(this.engine._firstAliveEnemyIndex());
      return;
    }
    const enemiesView = this.engine.enemies.map((e, i) => ({ name: e.name, hp: e.hp, maxHP: e.maxHP, idx: i }));
    this.phase = 'targeting';
    this.hud.showTargetPicker(enemiesView, (idx) => {
      this.scene.setTargetMarker(idx, true);
      this._executeAllyBasicAttack(idx);
      setTimeout(() => this.scene.hideTargetMarker(), 1200);
    }, () => {
      this.phase = 'ally_turn';
      this.inputEnabled = true;
      this._enableAllyInput(this._activeAllyIndex);
    });
  }

  _executeAllyBasicAttack(targetIndex) {
    const allyIndex = this._activeAllyIndex;
    const ally = this.engine.allies[allyIndex];
    const target = this.engine._resolveTarget(targetIndex);
    if (!ally || !target) { this._processNextTurn(); return; }

    this.phase = 'animating';
    this.hud.disableInput();
    const aStats = this.engine._getEffective(ally);
    const eStats = this.engine._getEffective(target);
    const dmg = this.engine._calcDamage(aStats.atk, 0, eStats.def, target);
    target.hp = Math.max(0, target.hp - dmg.damage);
    this.engine._checkVictory();

    const result = {
      type: 'ally_attack',
      allyIndex,
      allyName: ally.name,
      damage: dmg.damage,
      critical: dmg.critical,
      targetIndex: this.engine.enemies.indexOf(target),
      locksCleared: dmg.lockCleared,
      brokeComposure: dmg.broke,
    };
    const delay = this._playAllyResult(result, allyIndex);
    this._refreshHUD();
    setTimeout(() => {
      if (this.engine.isOver) this._handleResult();
      else this._processNextTurn();
    }, delay);
  }

  _executeAllyAbility(abilityId, targetIndex) {
    const allyIndex = this._activeAllyIndex;
    const ally = this.engine.allies[allyIndex];
    const ability = ALLY_ABILITIES[abilityId];
    if (!ally || !ability) { this._processNextTurn(); return; }

    // Manual MP spend (mirrors what allyTurn() does in AI mode)
    if (ability.cost) ally.mp = Math.max(0, ally.mp - ability.cost);

    const aStats = this.engine._getEffective(ally);
    let result = { type: 'ally_' + ability.type, allyIndex, allyName: ally.name, abilityName: ability.name, message: ability.messages ? (ability.messages[Math.floor(Math.random() * ability.messages.length)]) : (ability.message || '') };

    switch (ability.type) {
      case 'attack': {
        const target = this.engine._resolveTarget(targetIndex);
        if (!target) { this._processNextTurn(); return; }
        const eStats = this.engine._getEffective(target);
        const dmg = this.engine._calcDamage(aStats.atk, ability.power || 10, eStats.def, target, ability.tag);
        target.hp = Math.max(0, target.hp - dmg.damage);
        result = { ...result, damage: dmg.damage, critical: dmg.critical, effective: dmg.effective, targetIndex: this.engine.enemies.indexOf(target), locksCleared: dmg.lockCleared, brokeComposure: dmg.broke };
        break;
      }
      case 'attack_aoe': {
        const targets = this.engine.aliveEnemies();
        const hits = [];
        let locksClearedTotal = 0;
        let brokeAny = false;
        for (const t of targets) {
          const eStats = this.engine._getEffective(t);
          const dmg = this.engine._calcDamage(aStats.atk, ability.power || 10, eStats.def, t, ability.tag);
          t.hp = Math.max(0, t.hp - dmg.damage);
          hits.push({ targetIndex: this.engine.enemies.indexOf(t), damage: dmg.damage, critical: dmg.critical, effective: dmg.effective });
          locksClearedTotal += dmg.lockCleared;
          brokeAny = brokeAny || dmg.broke;
        }
        result = { ...result, aoe: true, hits, damage: hits.reduce((s, h) => s + h.damage, 0), locksCleared: locksClearedTotal, brokeComposure: brokeAny };
        break;
      }
      case 'heal_ally': {
        const candidates = this.engine.aliveAllies().slice().sort((a, b) => (a.hp / a.maxHP) - (b.hp / b.maxHP));
        const tgt = candidates[0] || ally;
        const heal = ability.healAmount || 0;
        if (heal > 0) tgt.hp = Math.min(tgt.maxHP, tgt.hp + heal);
        if (ability.mpHealAmount) {
          for (const a of this.engine.aliveAllies()) {
            a.mp = Math.min(a.maxMP, a.mp + ability.mpHealAmount);
          }
        }
        result = {
          ...result,
          healAmount: heal,
          mpHealAmount: ability.mpHealAmount || 0,
          healTargetAllyIndex: this.engine.allies.indexOf(tgt),
          healTargetName: tgt.name,
        };
        break;
      }
      case 'buff_party': {
        for (const a of this.engine.aliveAllies()) {
          a.buffs.push({ stats: ability.buffAmount, duration: ability.buffDuration || 2, name: ability.name });
        }
        result = { ...result, buffAmount: ability.buffAmount, duration: ability.buffDuration || 2 };
        break;
      }
      case 'debuff': {
        const target = this.engine._resolveTarget(targetIndex);
        if (!target) { this._processNextTurn(); return; }
        target.buffs.push({ stats: ability.debuffAmount, duration: ability.debuffDuration || 2, name: ability.name });
        result = { ...result, debuffAmount: ability.debuffAmount, duration: ability.debuffDuration || 2, targetIndex: this.engine.enemies.indexOf(target), locksCleared: this.engine._clearLocks(target, ability.tag) };
        break;
      }
      case 'silence': {
        const target = this.engine._resolveTarget(targetIndex);
        if (!target) { this._processNextTurn(); return; }
        target.silenced = Math.max(target.silenced || 0, ability.duration || 2);
        result = { ...result, targetIndex: this.engine.enemies.indexOf(target), locksCleared: this.engine._clearLocks(target, ability.tag) };
        break;
      }
    }

    this.engine._checkVictory();
    this.phase = 'animating';
    this.hud.disableInput();
    const delay = this._playAllyResult(result, allyIndex);
    this._refreshHUD();
    setTimeout(() => {
      if (this.engine.isOver) this._handleResult();
      else this._processNextTurn();
    }, delay);
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
    if (effects.length > 0) this._showEffects(effects, proceed, { side: 'enemy', index: enemyIndex });
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

      // ESCALATED TO COMMITTEE — the denial tax fired on THIS turn. Announced
      // once, over whatever denial beat produced it, and every downstream
      // timeout in this function is pushed back by `sealPad` so the two
      // banners never fight for the same second.
      const sealPad = result.sealing ? 1500 : 0;
      if (result.sealing) this._announceSeal(enemyIndex);

      if (result.type === 'blocked') {
        this.hud.showMessage(result.message);
        AudioManager.playSfx('confirm');
        this.particles.burst({ x: 0, y: 1, z: 4 }, 15, 0x4488ff, 3, 0.8);
        this._refreshHUD();
        this._refreshDepthHUD();
        setTimeout(() => this._processNextTurn(), 1500 + sealPad);
        return;
      }

      // LOCKS full clear — the telegraphed move never happens and the turn goes
      // with it. This is the payoff beat for the whole Locks read, so it gets a
      // banner, a shatter flash and the enemy's own confusion animation.
      if (result.type === 'fizzle') {
        this.hud.showBanner('MOTION VOID', 1200);
        setTimeout(() => this.hud.showMessage(result.message), 500);
        AudioManager.playSfx('confirm');
        this.scene.flash(0xffd700, 0.20);
        this.hud.pulseOverlay('grid', '#ffd700', 480);
        this.scene.enemyCastAnim(enemyIndex);
        this.particles.ring({ x: 0, y: 1.2, z: 0 }, 26, 0xffd700, 4.0, 0.9);
        this.particles.rise({ x: 0, y: 0.6, z: 0 }, 14, 0xfff0a0, 1.6);
        const entry = this.scene.enemyGroups?.[enemyIndex];
        if (entry?.animator) entry.animator.setExpression('worried');
        this._refreshHUD();
        this._refreshDepthHUD();
        setTimeout(() => this._processNextTurn(), 1700 + sealPad);
        return;
      }

      // COMPOSURE BREAK — the enemy skips the turn it just lost.
      if (result.type === 'broken') {
        this.hud.showMessage(result.message);
        AudioManager.playSfx('cancel');
        this.scene.flash(0x7fd4ff, 0.14);
        this.particles.rise({ x: 0, y: 0.5, z: 0 }, 16, 0x7fd4ff, 1.7);
        const entry = this.scene.enemyGroups?.[enemyIndex];
        if (entry?.animator) entry.animator.setExpression('defeated');
        this._refreshHUD();
        this._refreshDepthHUD();
        setTimeout(() => this._processNextTurn(), 1500 + sealPad);
        return;
      }

      if (result.message) this.hud.showMessage(result.message);
      // Partially-cleared Locks: say so, so the reduced number is legible.
      if (result.lockPartial && result.locksTotal > 0) {
        const pct = Math.round(30 * result.locksCleared);
        setTimeout(() => this.hud.showMessage(`The motion lands — ${pct}% weaker than filed.`), 900);
      }

      if (result.damage) {
        // Cinematic: lean on the coil, hold through contact, THEN cut to the
        // victim. Anchored to the attacker's own contact frame — the shipped
        // build cut away 786ms before the committed shove, so at the frame the
        // blow actually landed the attacker was entirely off camera.
        const eContact = this.scene.enemyContactMs(enemyIndex, 'attack', 200);
        this.cine.play('enemy_attack', {
          heavy: !!this._enemyTelegraphInfo[enemyIndex]?.heavy,
          contactMs: eContact,
        });
        this.scene.enemyAttackAnim(enemyIndex);
        const targetAllyIndex = result.targetAllyIndex ?? 0;
        // Voice triggers: damage to Andrew arms the Skeptic
        if (targetAllyIndex === 0 && this.engine.noteDamageTakenByPlayer) this.engine.noteDamageTakenByPlayer();
        this._scheduleImpact(() => {
          this.scene.holdEnemyPose(enemyIndex, 140);
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
          // The victim number must be the loudest object on screen (P5 grammar) —
          // a braced hit is muted, a clean hit is BIG, a crit is bigger still.
          const hitType = result.braced ? 'damage' : (result.critical ? 'critical' : 'bigdamage');
          this._spawnDamageNumberForAlly(result.damage, hitType, targetAllyIndex);
          this._refreshHUD();
          if (this.engine.posterJustTriggered) {
            this.engine.posterJustTriggered = false;
            setTimeout(() => {
              this.scene.flash(0xffdd00, 0.4);
              this.particles.burst({ x: 0, y: 1.2, z: 4 }, 25, 0xffdd00, 3, 1.0);
              this.hud.showMessage('HANG IN THERE! Survived at 1 HP!');
            }, 300);
          }
        }, eContact);
      } else if (result.healAmount) {
        AudioManager.playSfx('heal');
        this.scene.enemyCastAnim(enemyIndex);   // gathering cast pose, not a dead idle
        this._spawnDamageNumberAtEnemy(`+${result.healAmount}`, 'heal', enemyIndex);
        this.particles.burst({ x: 0, y: 1.2, z: 0 }, 10, 0x44ff44, 2, 1.0);
        // Voice triggers: enemy healing arms the Litigator
        if (this.engine.noteEnemyHeal) this.engine.noteEnemyHeal();
      } else {
        // Buff / debuff / confuse and other non-damaging moves — still ACT with
        // the body so the turn never reads as the enemy standing inert.
        this.scene.enemyCastAnim(enemyIndex);
      }

      this._refreshHUD();
      setTimeout(() => {
        if (this.engine.isOver) this._handleResult();
        else this._processNextTurn();
      }, 1200);
      // 400ms of dead air opened every single enemy turn. 150 is still a beat
      // of "they are about to do something" without being a pause.
    }, 150);
  }

  // SINGLE source of truth for the eight-argument `showMainMenu` law
  // (CLAUDE.md). Every path back to the main menu — first render, submenu Back,
  // target-picker cancel, Escape, "no abilities available" — must come through
  // here. A bare `showMainMenu()` applies all eight defaults and silently
  // deletes Press Advantage / Second Wind / Assert Dominance / Retaliate /
  // Desperate Gamble / voices, and re-enables a Silenced Special button.
  _showMainMenuLive() {
    const p = this.engine.player;
    this.hud.showMainMenu(
      p.silencedThisTurn,
      p.momentum,
      p.bracing,
      p.retaliateReady,
      p.hp / p.maxHP < 0.25,
      this.engine.getPressAdvantageCost(),
      this._currentVoices,
      { pressAdvantageUsed: !!p.pressAdvantageUsedThisTurn },
    );
  }

  _enablePlayerInput() {
    this.phase = 'ally_turn';
    this.inputEnabled = true;
    this.hud.enableInput();
    // Voice triggers reset their "took damage recently" signal at the top of each player turn
    if (this.engine.clearRecentDamageNote) this.engine.clearRecentDamageNote();

    // Telegraph all enemies for the upcoming enemy phase.
    // Under NDA (Billable Day mutator) the roll still happens — the enemy will
    // do exactly what it decided — but the player is not told what it is.
    this.engine.telegraph();
    const sealed = this._hasMutator('under_nda');
    const briefingOnly = !!this.engine.hasStretch?.('summary_briefing');
    const hints = this.engine.enemies.map(e => {
      if (e.hp <= 0) return null;
      if (sealed) return `${e.name}: sealed (Under NDA)`;
      const t = e.telegraphedAbility;
      const vulnerable = e.vulnerable > 0;
      // Summary Briefing (stretch goal): the move keeps its name, the
      // Objections are redacted. Information denial, not stat inflation.
      if (briefingOnly) {
        const name = ENEMY_ABILITIES[t]?.name || 'something';
        return `${e.name}: ${name} [redacted]`;
      }
      const committee = e.sealed ? ' — COMMITTEE SEALED' : '';
      return this._getTelegraphHint(t, e)
        + committee
        + (vulnerable ? ' (VULNERABLE — hit for 1.5×!)' : '');
    });
    this.hud.updateTelegraphAll(hints);

    // Drive each enemy's FACE from what it is telegraphing, so combatants emote
    // through the fight instead of holding a dead neutral while the banner reads
    // "attack" (addendum: the six-expression set must be wired to combat state
    // and proven on camera). No hold — it persists through the player's turn;
    // the attack/hurt/defeat anims swap it when they fire.
    this.engine.enemies.forEach((e, i) => {
      if (e.hp <= 0) { this._enemyTelegraphInfo[i] = null; return; }
      // Stash whether this telegraphed move is an attack, and whether it's a
      // HEAVY one (power >= 26 — same threshold the telegraph hint uses), so
      // the enemy-turn cinematic can pick ENEMY_ATTACK vs ENEMY_HEAVY.
      const ab = ENEMY_ABILITIES[e.telegraphedAbility];
      const type = ab?.type;
      const isAttack = type === 'attack' || type === 'dot';
      this._enemyTelegraphInfo[i] = { attack: isAttack, heavy: isAttack && (ab?.power || 0) >= 26 };
      const entry = this.scene.enemyGroups?.[i];
      if (!entry || !entry.animator) return;
      // Under NDA the face must not leak the intent the banner just hid.
      if (sealed) { entry.animator.setExpression('angry'); return; }
      const scheming = type === 'heal' || type === 'buff' || type === 'debuff' || type === 'confuse';
      entry.animator.setExpression(scheming ? 'smug' : 'angry');
    });

    const voicesAvailable = this.engine.getAvailableVoices ? this.engine.getAvailableVoices() : [];
    // Resolve action descriptors for the voice submenu
    this._currentVoices = voicesAvailable.map(v => {
      const action = VOICE_ACTIONS[v.actionId] || {};
      return { ...v, action };
    });
    this._showMainMenuLive();
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
    this._refreshDepthHUD();
    this._maybeTeachLockComposureTrade();
  }

  // ONE-TIME TEACH: Objections and Composure pull against each other on
  // purpose (a single-lock move never asks for the tag the enemy is weak to,
  // so cancelling a move and Breaking the person can never be the same swing).
  // The trade is close to TOTAL, not marginal, and it is measured:
  // `node tools/combat-sim.mjs --trade --runs 300` runs one policy twice,
  // differing only in whether it chases objections —
  //   karen L4        lock-first 0.38 breaks / 63.6% cleared | break-first 0.81 / 0.0%
  //   grandma L8      lock-first 0.81 / 81.9%                | break-first 0.96 / 0.0%
  //   meredith_boss L9  lock-first 0.29 / 76.7%                | break-first 1.01 / 0.0%
  // Three of four rows clear ZERO objections the moment the weakness tag wins
  // the turn. A player will not infer that from the HUD, so Andrew says it.
  // Fires once, ever.
  _maybeTeachLockComposureTrade() {
    if (this.player.getFlag?.('taught_lock_composure')) return;
    const e = this.engine.enemy;
    if (!e || e.hp <= 0) return;
    const hasLocks = Array.isArray(e.locks) && e.locks.some(l => !l.cleared);
    if (!hasLocks || !e.maxComposure || !e.weakness) return;
    if (this._hasMutator?.('under_nda') || this.engine.hasStretch?.('summary_briefing')) return;
    this.player.setFlag('taught_lock_composure', true);
    // 34 words. It went through showTaunt, which lands in the bark band
    // (1800-4000 ms) — 118 ms/word, a 3200 ms deficit, numerically the same
    // failure as the audit's headline 27-word Diane toast, on the ONE beat that
    // teaches the game's central combat trade-off and never fires again.
    // It is a scene, so it gets the prose surface and a prose ttl.
    setTimeout(() => NotificationArbiter.post({
      cls: NC.VOICE,
      zone: 'voice-centre',
      text: 'The moves they want me to stop are never the ones that would actually hurt them. Which means stopping them and hurting them are two different budgets. That seems like something I should remember.',
    }), 900);
  }

  // ── COMBAT DEPTH HUD ─────────────────────────────────────────────────
  // Locks row + Composure bar. Called whenever either can have changed.
  // Under NDA (Billable Day mutator) the Locks row is sealed along with the
  // telegraph — the objections are still live, the player just isn't told.
  _refreshDepthHUD() {
    // Two different kinds of "sealed" meet here, and they are not the same
    // thing. Under NDA / Summary Briefing HIDE the Objections (the player is
    // not told). ESCALATED TO COMMITTEE SHOWS them and refuses them.
    const hidden = (this._hasMutator && this._hasMutator('under_nda'))
      || !!this.engine.hasStretch?.('summary_briefing');
    const locks = this.engine.enemies.map(e => (e.hp > 0 && !hidden) ? (e.locks || []) : []);
    const committee = this.engine.enemies.map(e => e.hp > 0 && !!e.sealed);
    this.hud.updateLocksAll(locks, committee);
    this.hud.updateComposureAll(this.engine.enemies);
  }

  // ESCALATED TO COMMITTEE. Banner + log line + one Andrew read. Kept in one
  // place so every denial path (fizzle / Break / block / silence) announces the
  // same way and the player learns the cause from the first time it happens.
  _announceSeal(enemyIndex) {
    const enemy = this.engine.enemies[enemyIndex];
    if (!enemy) return;
    setTimeout(() => {
      this.hud.showBanner(SEAL_COPY.banner, 1300);
      this.hud.showMessage(SEAL_COPY.message.replace('{name}', enemy.name));
      AudioManager.playSfx('cancel');
      this.scene.flash(0xffc85a, 0.16);
      const entry = this.scene.enemyGroups?.[enemyIndex];
      if (entry?.animator) entry.animator.setExpression('smug');
      this._refreshDepthHUD();
    }, 900);
    if (!this._sealTaunted) {
      this._sealTaunted = true;
      setTimeout(() => this.hud.showTaunt(ANDREW_TAUNTS.escalated[0], 'player'), 1700);
    }
  }

  // Fire the lock-shatter beat + banner for whatever a player/ally action cleared.
  _playLockFeedback(result, tag = null) {
    if (!result || !result.locksCleared) return;
    const ti = result.targetIndex ?? this.engine.targetEnemyIndex ?? 0;
    const enemy = this.engine.enemies[ti];
    this._refreshDepthHUD();
    // The chip has to be rendered as `cleared` before we can shatter it.
    if (tag) this.hud.pulseLockCleared(ti, tag);
    const remaining = (enemy?.locks || []).filter(l => !l.cleared).length;
    AudioManager.playSfx(remaining === 0 ? 'critical' : 'confirm');
    this.scene.flash(remaining === 0 ? 0xffd700 : 0x88ccff, remaining === 0 ? 0.18 : 0.09);
    this.particles.burst({ x: 0, y: 1.6, z: 0 }, remaining === 0 ? 26 : 14, remaining === 0 ? 0xffd700 : 0x88ccff, 3, 0.8);
    setTimeout(() => {
      this.hud.showMessage(remaining === 0
        ? 'ALL LOCKS CLEARED — motion void'
        : 'LOCK CLEARED — others remain on file');
    }, 320);
  }

  // Fire the Composure-break beat.
  _playBreakFeedback(result) {
    if (!result || !result.brokeComposure) return;
    const ti = result.targetIndex ?? this.engine.targetEnemyIndex ?? 0;
    this._refreshDepthHUD();
    this.hud.pulseComposureBreak(ti);
    setTimeout(() => {
      this.hud.showBanner('COMPOSURE BROKEN', 1300);
      AudioManager.playSfx('critical');
      this.scene.flash(0xffffff, 0.26);
      this.scene.shake(1.1);
      this.hud.pulseOverlay('vignette', '#7fd4ff', 620);
      this.scene.enemyHurtAnim(ti);
      this.particles.burst({ x: 0, y: 1.4, z: 0 }, 40, 0x7fd4ff, 5, 1.1);
      this.particles.ring({ x: 0, y: 1.0, z: 0 }, 26, 0xffffff, 4.5, 0.9);
      setTimeout(() => this.hud.showMessage('Loses next turn. All incoming damage increased 20% until composure recovers.'), 700);
    }, 420);
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
    // Allies clear Locks and fill Composure with their tagged abilities too —
    // that is what makes a mixed party able to void a two-lock haymaker.
    this._playLockFeedback(result, null);
    this._playBreakFeedback(result);
    this._noteConfusion(result);

    if (result.type === 'confused') {
      this.scene.flash(0xffaa00, 0.10);
      this._spawnDamageNumberForAlly(result.damage, result.critical ? 'critical' : 'damage', allyIndex);
      return 1100;
    }

    if (result.aoe && Array.isArray(result.hits)) {
      this.scene.playerAttackAnim(allyIndex);
      const aoeContact = this.scene.allyContactMs(allyIndex, 'attack', 200);
      this.particles.ring({ x: 0, y: 1.0, z: 0 }, 24, 0x88ccff, 4.0, 0.9);
      result.hits.forEach((h, i) => {
        setTimeout(() => {
          if (i === 0) { this.scene.strikeAccent(allyIndex); AudioManager.playSfx(result.critical ? 'critical' : 'hit'); this.scene.shake(0.4); }
          this.scene.enemyHurtAnim(h.targetIndex);
          this._spawnDamageNumberAtEnemy(h.damage, h.critical ? 'critical' : 'damage', h.targetIndex);
          this._refreshHPBars();
        }, aoeContact + i * 150);
      });
      return aoeContact + 500 + result.hits.length * 150;
    }

    if (result.type === 'ally_attack' || result.type === 'ally_attack_aoe') {
      this.scene.playerAttackAnim(allyIndex);
      const ti = result.targetIndex ?? 0;
      const allyContact = this.scene.allyContactMs(allyIndex, 'attack', 220);
      setTimeout(() => {
        AudioManager.playSfx(result.critical ? 'critical' : 'hit');
        this.scene.strikeAccent(allyIndex);
        this.scene.enemyHurtAnim(ti);
        this.scene.holdAllyPose(allyIndex, 140);
        this._refreshHPBars();
        this.scene.impactBeat(result.critical ? 'crit' : 'normal', 0xffffff);
        this._spawnDamageNumberAtEnemy(result.damage || 0, result.critical ? 'critical' : 'damage', ti);
      }, allyContact);
      return allyContact + 620;
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
      const label = result.healAmount > 0
        ? `+${result.healAmount}`
        : result.mpHealAmount > 0
          ? `+${result.mpHealAmount} Coffee`
          : '+0';
      this._spawnDamageNumberForAlly(label, 'heal', result.healTargetAllyIndex ?? 0);
      return 1100;
    }

    if (result.type === 'ally_debuff') {
      AudioManager.playSfx('confirm');
      const ti = result.targetIndex ?? 0;
      this.scene.flash(0xffaa44, 0.08);
      this.particles.burst({ x: 0, y: 1.4, z: 0 }, 14, 0xffaa44, 2.5, 0.7);
      return 1000;
    }

    if (result.type === 'ally_silence') {
      AudioManager.playSfx('confirm');
      const ti = result.targetIndex ?? 0;
      this.scene.flash(0x88ccff, 0.08);
      this.particles.burst({ x: 0, y: 1.4, z: 0 }, 16, 0x88ccff, 2.5, 0.7);
      this._spawnDamageNumberAtEnemy('SILENCED', 'status', ti);
      return 1000;
    }

    return 800;
  }

  // ── Action handlers ──────────────────────────────────────────────────
  _handleAction(action) {
    if (!this.inputEnabled) return;

    // Submenu Back is a pure UI move: it must not consume the turn, must not
    // drop input, and must re-render the main menu from LIVE engine state.
    if (action === 'back') {
      AudioManager.playSfx('cancel');
      this._showMainMenuLive();
      return;
    }

    this.inputEnabled = false;
    AudioManager.playSfx('confirm');

    switch (action) {
      case 'attack':
        this._beginTargetedAction('attack');
        break;
      case 'special': {
        this.inputEnabled = true;
        const list = this._availableAbilities();
        if (list.length === 0) {
          this.hud.showMessage('Opposing counsel has objected to everything you know.');
          this._showMainMenuLive();
          break;
        }
        this.hud.showAbilities(list, this.engine.player.mp);
        break;
      }
      case 'brace':
        this._executeBrace();
        break;
      case 'item':
        if (this._hasMutator('expense_freeze')) {
          this.inputEnabled = true;
          this.hud.showMessage('Expense Freeze: accounting has locked the account.');
          break;
        }
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
    // The Charter Read sets a permanent flag the post-Meredith dialog branches on
    if (result.charterInvoked) this.player.setFlag('andrew_invoked_charter');

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

  // Reasonable Doubt voices. VOICE class, own zone, single occupancy — it used
  // to append a fresh node per call straight onto #ui-overlay on a flat 2200 ms.
  _showVoiceBubble(voiceName, quote, color) {
    NotificationArbiter.post({
      cls: NC.VOICE,
      zone: 'bubble-top',
      text: `${voiceName}: "${quote}"`,
      html: `<div class="combat-voice-name" style="color:${color || '#fff'}">${voiceName}</div>` +
        `<div class="combat-voice-quote" style="color:${color || '#fff'}">"${quote}"</div>`,
    });
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
      this._showMainMenuLive();
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
    // Retained Counsel bans the legal tag outright — belt and braces behind
    // the filtered menu, so a keyboard shortcut can't slip one through.
    if (ability.tag === 'legal' && this._hasMutator('retained_counsel')) {
      this.hud.showMessage('Retained Counsel: opposing counsel objects. Sustained.');
      return;
    }

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
        this.hud.showAbilities(this._availableAbilities(), this.engine.player.mp);
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
    // Cinematic: offensive abilities get the tag-flavored beat (legal/social/
    // audit/technical each distinct); heals/buffs get the self-framing beat.
    const ability = PLAYER_ABILITIES[abilityId];
    const offensive = result.type === 'attack' || result.type === 'attack_aoe' || result.type === 'debuff' || !!result.damage;
    if (offensive) {
      this.cine.play('ability', {
        tag: ability?.tag,
        crit: !!(result.critical || result.effective === 'super'),
        targetIndex,
        contactMs: this.scene.allyContactMs(this._activeAllyIndex, 'attack', 350),
      });
    } else {
      this.cine.play('self_ability', {});
    }
    const delay = this._playPlayerActionResult(result, abilityId);

    if (result.critical) this._fireTaunt('crit');
    if (result.effective === 'super') { this._fireTaunt('weakness_hit'); AchievementManager.check(this.player, { event: 'weakness_hit' }); }
    if (result.combo) AchievementManager.check(this.player, { event: 'combo_hit' });
    this._playLockFeedback(result, ability?.tag);
    this._playBreakFeedback(result);
    this._noteConfusion(result);
    this._checkPhaseChange();
    this._refreshHUD({ deferBars: !!result.damage });
    setTimeout(() => {
      if (this.engine.isOver) {
        this._handleResult();
      } else if (this._maybeOfferLoopIn(() => this._processNextTurn())) {
        // Loop In prompt owns the continuation
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
    if (this._hasMutator('expense_freeze')) {
      this.hud.showMessage('Expense Freeze: accounting has locked the account.');
      return;
    }
    if (this.engine.hasStretch?.('lean_ops')) {
      this.hud.showMessage('Lean Operations: the revised supply policy does not permit this.');
      return;
    }
    if (!this.player.useItem(itemId)) return;
    this.inputEnabled = false;
    this._itemsUsed++;
    AudioManager.playSfx('confirm');

    const result = this.engine.playerItem(itemId);
    if (!result) return;

    this.phase = 'animating';
    this.hud.disableInput();
    const delay = this._playPlayerActionResult(result);
    if (result.type === 'item') this.hud.showMessage(`Used ${result.itemName}!`);
    // Due Diligence Memo: the file gets read out after the "used it" beat.
    if (result.revealText) setTimeout(() => this.hud.showMessage(result.revealText), 1100);

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
    // Cinematic: dolly to Andrew on wind-up, CUT to the target on impact —
    // anchored to the measured contact frame, so the camera can no longer be
    // home 155ms before the fist arrives.
    this.cine.play('attack', {
      crit: !!(result && (result.critical || result.effective === 'super')),
      targetIndex,
      contactMs: this.scene.allyContactMs(this._activeAllyIndex, 'attack', 220),
    });
    const delay = this._playPlayerActionResult(result);

    if (result && result.critical) { this._fireTaunt('crit'); this.engine.noteCrit && this.engine.noteCrit(); }
    if (result && result.effective === 'super') { this._fireTaunt('weakness_hit'); AchievementManager.check(this.player, { event: 'weakness_hit' }); }
    if (result && result.combo) AchievementManager.check(this.player, { event: 'combo_hit' });
    this._playBreakFeedback(result);
    this._noteConfusion(result);
    this._checkPhaseChange();
    this._refreshHUD({ deferBars: true });
    setTimeout(() => {
      if (this.engine.isOver) this._handleResult();
      else if (this._maybeOfferLoopIn(() => this._processNextAllyTurn())) { /* prompt owns it */ }
      else this._processNextAllyTurn();
    }, delay);
  }

  // Confusion no longer steals the turn — it scrambles targeting and dampens
  // force. Surface which one actually happened so the player can read it.
  _noteConfusion(result) {
    if (!result) return;
    const who = result.allyName || 'Andrew';
    if (result.confusedScramble) {
      setTimeout(() => this.hud.showMessage(`${who} swings with conviction at the wrong person.`), 260);
    } else if (result.confusedDampened && result.damage) {
      setTimeout(() => this.hud.showMessage('Right target. The swing arrives at 65% force.'), 260);
    }
  }

  // ── LOOP IN (Baton Pass) ─────────────────────────────────────────────
  // Offered the instant Andrew lands a weakness hit with a recruited ally on
  // the bench. Returns true if the prompt took ownership of the continuation.
  _maybeOfferLoopIn(continueFn) {
    if (!this.engine.loopInReady) return false;
    const candidates = this.engine.getLoopInCandidates()
      .map(i => ({ index: i, name: this.engine.allies[i]?.name || 'Colleague' }))
      .filter(c => c.name);
    if (candidates.length === 0) return false;

    this.phase = 'targeting';
    this.hud.showLoopInPrompt(
      candidates,
      (allyIndex) => {
        const res = this.engine.playerLoopIn(allyIndex);
        if (!res) { continueFn(); return; }
        // The ally has spent their action — drop them from this round's queue.
        const qi = (this._turnQueue || []).findIndex(q => q.kind === 'ally' && q.index === allyIndex);
        if (qi >= 0) this._turnQueue.splice(qi, 1);
        this.phase = 'animating';
        this.hud.disableInput();
        this.hud.showBanner(`${res.loopInAllyName} replies all — +50% damage!`, 1100);
        AudioManager.playSfx('confirm');
        this.scene.flash(0xffd700, 0.14);
        // _playAllyResult already fires the lock/break beats — don't double them.
        const delay = this._playAllyResult(res, allyIndex);
        this._refreshHUD();
        setTimeout(() => {
          if (this.engine.isOver) this._handleResult();
          else continueFn();
        }, delay + 200);
      },
      () => { this.engine.loopInReady = false; continueFn(); },
    );
    return true;
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
        this.scene.strikeAccent(this._activeAllyIndex);
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

    // Generic single-target attack — the beat every other beat is measured
    // against. EVERYTHING that says "a blow landed" now fires on the contact
    // frame of the clip this body is actually playing: the hit SFX (was 735ms
    // early), the damage number (505ms early), the hit-stop (395ms early) and
    // the HP bar (finished 264ms early).
    if (result.type === 'attack' || result.type === 'attack_aoe') {
      const ti = result.targetIndex ?? 0;
      const ai = this._activeAllyIndex;
      this.scene.playerAttackAnim(ai);
      const contact = this.scene.allyContactMs(ai, 'attack', 220);
      // Approach streaks stay in ANTICIPATION — they are the travel, not the hit.
      this.particles.stream({ x:  0.2, y: 1.0, z: 3.8 }, { x: 0, y: 1.2, z: 0.3 }, 14, 0xffffff, 0.20);
      this.particles.stream({ x: -0.1, y: 1.1, z: 3.8 }, { x: 0, y: 1.0, z: 0.2 },  8, 0xffee88, 0.22);
      this._scheduleImpact(() => {
        const cls = result.effective === 'super' ? 'weak' : (result.critical ? 'crit' : 'normal');
        this.scene.impactBeat(cls, result.critical ? 0xffee88 : 0xffffff);
        this.scene.strikeAccent(ai);
        this.scene.enemyHurtAnim(ti);
        this.scene.holdAllyPose(ai, 140);      // the follow-through — "committed"
        AudioManager.playSfx(result.critical ? 'critical' : 'hit');
        this._spawnDamageNumberAtEnemy(result.damage, result.critical ? 'critical' : 'damage', ti);
        this._refreshHPBars();
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
      }, contact);
      // Control returns ~620ms after contact: freeze release, HP drain, the
      // held pose, then the camera home. Persona's normal-attack total is
      // 0.90-1.15s input-to-input and this lands inside it.
      return contact + 620;
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
        const contact = this.scene.playerAbilityAnim(allyIndex, { distance: 0.5 });
        this.particles.stream(
          { x: 0.1, y: 1.0, z: 3.5 },
          { x: 0.0, y: 1.2, z: 0.3 },
          20, 0xfffde8, 0.35
        );
        if (!skipImpact) this._scheduleImpact(() => {
          this.scene.enemyHurtAnim(ti);
          this.scene.shake(crit ? 0.7 : 0.35);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 30 : 18, 0xfffde8, 2.5, 0.7);
          this.particles.burst({ x: 0, y: 1.0, z: 0 }, 8, 0xccccaa, 1.5, 0.5);
          if (crit) this.scene.flash(0xffffee, 0.1);
          this.scene.holdAllyPose(allyIndex, 140);
          this._refreshHPBars();
        }, contact);
        return contact + 900;
      }
      case 'cite_precedent': {
        const contact = this.scene.playerAbilityAnim(allyIndex, { distance: 0.4 });
        this.scene.flash(0xddaa00, 0.08);
        this.particles.burst({ x: 0,    y: 2.8, z: 0 }, 15, 0xffdd44, 0.8, 0.55);
        this.particles.burst({ x: 0.3,  y: 2.5, z: 0 }, 10, 0xddaa00, 0.6, 0.45);
        if (!skipImpact) this._scheduleImpact(() => {
          this.scene.flash(0xffdd00, 0.2);
          this.scene.shake(crit ? 1.0 : 0.7);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.5, z: 0 }, crit ? 35 : 25, 0xffd700, 3.5, 1.0);
          this.particles.burst({ x: 0, y: 0.3, z: 0 }, 12, 0xaa8800, 2.0, 0.6);
          this.scene.holdAllyPose(allyIndex, 140);
          this._refreshHPBars();
        }, contact);
        return contact + 950;
      }
      case 'per_my_last_email': {
        const contact = this.scene.playerAbilityAnim(allyIndex, { distance: 0.8 });
        this.hud.showMessage('Per My Last Email...');
        this.scene.flash(0x660000, 0.15);
        this.particles.burst({ x: 0, y: 1.8, z: 1.5 }, 20, 0xff2200, 3, 0.55);
        setTimeout(() => {
          this.scene.flash(0xaa0000, 0.18);
          this.scene.shake(0.6);
          this.particles.burst({ x: 0, y: 1.5, z: 0.8 }, 30, 0xff4400, 4, 0.75);
        }, 250);
        if (!skipImpact) this._scheduleImpact(() => {
          this.scene.flash(0xff0000, 0.3);
          this.scene.shake(crit ? 1.5 : 1.2);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 50 : 40, 0xff0000, 5,   1.2);
          this.particles.burst({ x: 0, y: 1.4, z: 0 }, 20,             0xff8800, 4,   0.9);
          this.particles.burst({ x: 0, y: 1.0, z: 0 }, 15,             0xffff00, 3,   0.7);
          this.scene.holdAllyPose(allyIndex, 140);
          this._refreshHPBars();
        }, contact);
        return contact + 1000;
      }
      case 'cc_all': {
        const contact = this.scene.playerAbilityAnim(allyIndex, { distance: 0.5 });
        this.hud.showMessage('CC All! Everyone is now involved.');
        this.scene.flash(0x2244aa, 0.10);
        this.particles.ring({ x: 0, y: 1.0, z: 0 }, 28, 0x4488ff, 3.5, 1.0);
        // Note: AoE — caller (skipImpact=true) handles per-target hurt anims
        if (!skipImpact) this._scheduleImpact(() => {
          this.scene.shake(crit ? 0.7 : 0.4);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.ring({ x: 0, y: 1.3, z: 0 }, 24, 0x2266dd, 4.5, 0.85);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 25 : 15, 0x88aaff, 3, 0.8);
          this.scene.holdAllyPose(allyIndex, 140);
          this._refreshHPBars();
        }, contact);
        setTimeout(() => {
          this.particles.ring({ x: 0, y: 0.7, z: 0 }, 20, 0x66aaff, 5.5, 0.70);
        }, 500);
        return 1600;
      }
      case 'coffee_break': {
        this.scene.playerCastAnim(allyIndex);
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
        this.scene.playerCastAnim(allyIndex);
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
        this.scene.playerCastAnim(allyIndex);
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
        this.scene.playerCastAnim(allyIndex);
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
        const contact = this.scene.playerAbilityAnim(allyIndex, { distance: 0.7 });
        this.hud.showMessage('Whistleblower!');
        this.scene.flash(0xcc0000, 0.12);
        this.particles.burst({ x: 0, y: 1.5, z: 2 }, 15, 0xff2200, 3, 0.6);
        setTimeout(() => {
          this.scene.flash(0xff0000, 0.15);
          this.scene.shake(0.5);
          this.particles.burst({ x: 0, y: 1.3, z: 1 }, 20, 0xff4400, 3.5, 0.8);
        }, 250);
        if (!skipImpact) this._scheduleImpact(() => {
          this.scene.flash(0xff2200, 0.25);
          this.scene.shake(crit ? 1.2 : 0.9);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 40 : 30, 0xff0000, 4, 1.0);
          this.scene.holdAllyPose(allyIndex, 140);
          this._refreshHPBars();
        }, contact);
        return contact + 950;
      }
      case 'power_of_attorney': {
        this.scene.playerCastAnim(allyIndex);
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
        const contact = this.scene.playerAbilityAnim(allyIndex, { distance: 0.6 });
        this.hud.showMessage('Root Access!');
        this.particles.stream({ x: 0.1, y: 1.0, z: 3.5 }, { x: 0, y: 1.2, z: 0.3 }, 25, 0x00ff44, 0.4);
        this.particles.stream({ x: -0.1, y: 1.3, z: 3.5 }, { x: 0, y: 1.0, z: 0.2 }, 15, 0x44ff88, 0.35);
        if (!skipImpact) this._scheduleImpact(() => {
          this.scene.enemyHurtAnim(ti);
          this.scene.shake(crit ? 0.9 : 0.5);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 35 : 22, 0x00ff44, 3.5, 1.0);
          if (result.strippedBuffs) this.hud.showMessage('All enemy buffs stripped!');
          this.scene.holdAllyPose(allyIndex, 140);
          this._refreshHPBars();
        }, contact);
        return contact + 950;
      }
      case 'firewall': {
        this.scene.playerCastAnim(allyIndex);
        AudioManager.playSfx('confirm');
        this.hud.showMessage('Firewall active! Next enemy action will be blocked.');
        this.scene.flash(0x2244aa, 0.15);
        this.particles.burst({ x: 0, y: 1.0, z: 3 }, 20, 0x4488ff, 3, 1.0);
        this.particles.orbit({ x: 0, y: 1.0, z: 4 }, 14, 0x88aaff, 1.0, 1.4);
        return 1300;
      }
      case 'temporal_audit': {
        this.scene.playerCastAnim(allyIndex);
        AudioManager.playSfx('confirm');
        this.hud.showMessage('Temporal Audit! You get another action!');
        this.scene.flash(0x8844cc, 0.15);
        this.particles.burst({ x: 0, y: 1.2, z: 4 }, 20, 0xaa66ff, 3, 1.0);
        this.particles.orbit({ x: 0, y: 1.0, z: 4 }, 16, 0xcc88ff, 1.2, 1.5);
        return 1200;
      }
      case 'notarized_strike': {
        const contact = this.scene.playerAbilityAnim(allyIndex, { distance: 0.7 });
        this.hud.showMessage('Notarized Strike!');
        this.scene.flash(0xddaa00, 0.10);
        this.particles.burst({ x: 0, y: 2.5, z: 0 }, 12, 0xffd700, 1.0, 0.5);
        if (!skipImpact) this._scheduleImpact(() => {
          this.scene.flash(0xffdd00, 0.25);
          this.scene.shake(crit ? 1.2 : 0.8);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, crit ? 35 : 25, 0xffd700, 4, 1.0);
          this.particles.burst({ x: 0, y: 0.5, z: 0 }, 10, 0xaa8800, 2, 0.6);
          this.scene.holdAllyPose(allyIndex, 140);
          this._refreshHPBars();
        }, contact);
        return contact + 950;
      }
      case 'invoke_charter': {
        const contact = this.scene.playerAbilityAnim(allyIndex, { distance: 0.9 });
        this.hud.showMessage('Invoke Charter!');
        this.scene.flash(0xffffff, 0.15);
        this.particles.burst({ x: 0, y: 3.0, z: 0 }, 20, 0xffffff, 1.5, 0.6);
        this.particles.burst({ x: 0, y: 2.8, z: 0 }, 15, 0xffd700, 1.2, 0.5);
        if (!skipImpact) this._scheduleImpact(() => {
          this.scene.flash(0xffffcc, 0.30);
          this.scene.shake(crit ? 1.5 : 1.0);
          this.scene.enemyHurtAnim(ti);
          AudioManager.playSfx(crit ? 'critical' : 'hit');
          this._spawnDamageNumberAtEnemy(result.damage, crit ? 'critical' : 'damage', ti);
          this.particles.burst({ x: 0, y: 1.5, z: 0 }, crit ? 45 : 35, 0xffffff, 5, 1.2);
          this.particles.burst({ x: 0, y: 1.2, z: 0 }, 20, 0xffd700, 4, 1.0);
          this.scene.holdAllyPose(allyIndex, 140);
          this._refreshHPBars();
        }, contact);
        return contact + 1050;
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
          this._refreshHPBars();
        }
        return 1200;
      }
    }
  }

  // ── Result handling ──────────────────────────────────────────────────
  _handleResult() {
    // Re-entrancy guard. 20 call sites reach this, all of them guarded only by
    // `if (this.engine.isOver)` — plus `_devInstantWin`'s unguarded 800 ms timer.
    // A clean fight resolves once, but a corrupted stack (see the `_interact`
    // guard in ExplorationState) turned a double resolve into duplicated
    // one-time boss rewards. One boolean makes that structurally impossible.
    if (this._resultHandled) return;
    this._resultHandled = true;

    this.phase = 'result';
    this.inputEnabled = false;

    if (this.engine.result === 'victory') {
      AudioManager.playSfx('victory');
      // Defeat anim for any enemies still in scene at hp 0
      this.engine.enemies.forEach((e, i) => { if (e.hp <= 0) this.scene.enemyDefeatAnim(i); });

      // Billable Day performance snapshot — taken BEFORE the post-fight heal,
      // because "what shape you finished in" is the thing the Hours award
      // reads. Harmless for every other fight; onEnd's second arg is optional.
      this._perf = {
        hpRatio: this.engine.player.maxHP > 0
          ? this.engine.player.hp / this.engine.player.maxHP
          : 0,
        turns: this.engine.turnCount,
        itemsUsed: this._itemsUsed,
      };

      // Attrition inside a Billable Day: a reception client does not hand back
      // a full bar. Walk-in mode and every story fight keep the full restore.
      const inDay = this.enemyId === 'reception_client' && !!readDay(this.player);
      let healPct = inDay ? DAY_BALANCE.victoryHealPct : 1;
      // Expedited Recovery (stretch goal): Ascension A5's shape — you still
      // heal, you just heal half as much of what you were going to get.
      if (this.engine.hasStretch?.('lasting_consequences')) healPct *= 0.5;

      const xp = this.engine.getXPReward();
      setTimeout(() => {
        this.hud.showMessage(`Victory! +${xp} XP`, { jump: true });
        if (healPct >= 1) {
          this.player.stats.hp = this.player.stats.maxHP;
          this.player.stats.mp = this.player.stats.maxMP;
        } else {
          this.player.stats.hp = Math.min(
            this.player.stats.maxHP,
            Math.max(1, Math.round(this.engine.player.hp + this.player.stats.maxHP * healPct)),
          );
          this.player.stats.mp = Math.min(
            this.player.stats.maxMP,
            Math.round(this.engine.player.mp + this.player.stats.maxMP * healPct),
          );
        }
        // Restore allies after victory (matches Andrew's restoration). Persisted to allyState.
        for (let i = 1; i < this.engine.allies.length; i++) {
          const ally = this.engine.allies[i];
          if (!ally.allyId || !this.player.allyState[ally.allyId]) continue;
          if (healPct >= 1) {
            this.player.allyState[ally.allyId].hp = ally.maxHP;
            this.player.allyState[ally.allyId].mp = ally.maxMP;
          } else {
            this.player.allyState[ally.allyId].hp = Math.min(ally.maxHP, Math.round(ally.hp + ally.maxHP * healPct));
            this.player.allyState[ally.allyId].mp = Math.min(ally.maxMP, Math.round(ally.mp + ally.maxMP * healPct));
          }
        }
        // The memo ladder's payout point. Kaycee's Mod (report P4.2) unlocks
        // its dev logs for CLEARING Challenge Level N; this used to fire on the
        // shop toggle, which meant all four of Meredith's memos could be read
        // from a menu without a single round fought under the modifiers.
        const levelled = noteReviewLevel(this.player, this._reviewLevelAtStart);
        const levels = this.player.gainXP(xp);
        if (levels.length > 0) {
          AchievementManager.check(this.player, { event: 'level_up' });
          setTimeout(() => {
            AudioManager.playSfx('levelup');
            this.hud.showMessage(`Level Up! Lv.${levels[levels.length - 1]}! +${levels.length} Upgrade Point${levels.length > 1 ? 's' : ''}!`);
          }, 1500);
        }
        // Queued behind the level-up line so two messages never collide, and
        // the close-out is pushed back to leave room for whatever fired.
        let endDelay = levels.length > 0 ? 3500 : 2000;
        if (levelled) {
          setTimeout(() => this.hud.showMessage(
            REVIEW_COPY.levelUpToast.replace('{level}', levelled),
          ), levels.length > 0 ? 3000 : 1500);
          endDelay += 1500;
        }
        setTimeout(() => this._endCombat('victory'), endDelay);
      }, 1000);
    } else if (this.engine.result === 'defeat') {
      AudioManager.playSfx('defeat');
      const scriptedKarenLoss = this.enemyId === 'karen' && !this.player.getFlag('retry_karen');
      if (!scriptedKarenLoss) this.player.deaths = (this.player.deaths || 0) + 1;
      // JUMPS the plate queue. This is the line that tells the player why the
      // fight ended, and it fires 2500 ms before closeScope('combat') discards
      // whatever is still pending — which is exactly what happened to it once.
      this.hud.showMessage('Your patience has run out...', { jump: true });
      setTimeout(() => this._endCombat('defeat'), 2500);
    }
  }

  _endCombat(result) {
    // Second arg is the Billable Day performance snapshot (null on defeat/flee).
    // Every existing onEnd callback takes one argument and ignores it.
    if (this.onEnd) this.onEnd(result, this._perf);
    this.stateManager.pop();
  }

  // ── HUD refresh helpers ──────────────────────────────────────────────
  // HP BARS ARE NOT PART OF THE COMMAND. _refreshHUD() runs synchronously
  // inside every execute path, so the enemy's bar was commanded down at +9ms,
  // started visibly draining at +55ms and had FINISHED at +477ms — 264ms before
  // the fist landed. `deferBars` holds the enemy bars back so the impact
  // callback can call _refreshHPBars() on the contact frame instead. Only the
  // player-action paths pass it; every other caller keeps the shipped
  // behaviour, which was already contact-adjacent.
  _refreshHUD({ deferBars = false } = {}) {
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
    if (!deferBars) this.hud.updateAllEnemies(this.engine.enemies);
    this.hud.updateBuffStatus(this.engine.player.buffs, this.engine.enemy?.buffs || []);
    this.hud.refreshPartyRow(this._buildPartyView());
    this._refreshDepthHUD();
  }

  // The deferred half of _refreshHUD — call it from an impact callback.
  _refreshHPBars() {
    this.hud.updateAllEnemies(this.engine.enemies);
  }

  // ── _scheduleImpact — the one contact scheduler ──────────────────────
  // Replaces every hand-tuned `setTimeout(..., 220/300/350/500)` in the attack
  // paths. `fn` runs on the frame the active cinematic timeline reaches its
  // `impact` step; the timer is a LATCHED SAFETY NET for any path that has no
  // timeline (or whose timeline was cancelled), so the chain can never be
  // silently dropped and can never run twice.
  //
  // Why not just the timer: measured through the shipping code path under
  // capture load, a setTimeout scheduled for the contact frame fired 51ms late
  // while the game-clock timeline step landed within 5ms.
  _scheduleImpact(fn, ms) {
    let fired = false;
    const once = () => {
      if (fired) return;
      fired = true;
      if (this._impactHook === once) this._impactHook = null;
      fn();
    };
    this._impactHook = once;
    setTimeout(once, Math.max(0, ms) + 110);
    return once;
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
    // The enemy-turn cut frames Andrew on the RIGHT of stage, so the LOUD victim
    // numbers (bigdamage / crit) are pushed LEFT into the dark gap beside him and
    // lifted — clear air, not composited on his torso where it read as a jersey
    // number (critic #3). Softer hits keep the lower slot below the reaction.
    const loud = type === 'bigdamage' || type === 'critical';
    const offset = count > 1 ? ((allyIndex - 0) * 120 + 100) : (loud ? -300 : 0);
    const baseY = window.innerHeight * (loud ? 0.34 : 0.65);
    const jitter = (Math.random() - 0.5) * (loud ? 16 : 30);
    this.floatingText.spawn(String(text), cx + offset + jitter, baseY, type);
  }

  // Legacy entrypoint preserved for code that calls _spawnDamageNumber('text','type','enemy'|'player')
  _spawnDamageNumber(text, type, target = 'enemy') {
    if (target === 'enemy') this._spawnDamageNumberAtEnemy(text, type, this.engine.targetEnemyIndex);
    else this._spawnDamageNumberForAlly(text, type, this._activeAllyIndex);
  }

  _showEffects(effects, callback, target = { side: 'ally', index: 0 }) {
    const targetInfo = typeof target === 'string'
      ? { side: target === 'enemy' ? 'enemy' : 'ally', index: 0 }
      : target;
    let delay = 0;
    for (const effect of effects) {
      setTimeout(() => {
        if (effect.type === 'dot') {
          this.scene.flash(0x880088, 0.1);
          if (targetInfo.side === 'enemy') this._spawnDamageNumberAtEnemy(effect.damage, 'damage', targetInfo.index || 0);
          else this._spawnDamageNumberForAlly(effect.damage, 'damage', targetInfo.index || 0);
          this.hud.showMessage(`${effect.name}: ${effect.damage} damage!`);
        } else if (effect.type === 'buff_expire') {
          this.hud.showMessage(`${effect.name} wore off!`);
        } else if (effect.type === 'stunned') {
          this.hud.showMessage('Still stunned!');
        } else if (effect.type === 'confused') {
          // Confusion no longer replaces the chosen action — it scrambles the
          // target and takes 35% off the force. Say exactly that.
          this.hud.showMessage("Andrew can't tell them apart. Swings land randomly at 65% force.");
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
      this.scene.playerBraceAnim(this._activeAllyIndex, quality);

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

      // Metaphor deny-model: a PERFECT stance takes Composure off the target,
      // so Brace is a route to a Break rather than a turn spent standing still.
      let extra = 0;
      if (result.composureStripped > 0) {
        extra = 900;
        setTimeout(() => {
          this.hud.showMessage("Andrew doesn't flinch. Their Composure drops 20%.");
          this.particles.stream({ x: 0, y: 1.2, z: 3.6 }, { x: 0, y: 1.4, z: 0.2 }, 16, 0xffd700, 0.28);
        }, 900);
        this._playBreakFeedback({ brokeComposure: result.brokeComposure, targetIndex: this.engine.targetEnemyIndex });
      }

      this._refreshHUD();
      this._refreshDepthHUD();
      setTimeout(() => this._processNextAllyTurn(), 1200 + extra);
    });
  }

  _showBraceMiniGame(onComplete) {
    const TRACK_W = 300;
    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    NotificationArbiter.hold(NC.DECISION, 'combat-decision', overlay);   // auto-expires when the overlay leaves the DOM
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

    // Relic slot: Ergonomic Wrist Support widens both bands by 40% (P1.6).
    // Identity multiplier for anyone with nothing equipped, so the shipped
    // 0.10 / 0.35 feel is untouched by default.
    const widen = qteModifiers(this.player).braceWindow;
    const perfectBand = 0.10 * widen;
    const goodBand = 0.35 * widen;

    const resolve = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(animId);
      const center = TRACK_W / 2;
      const pct = Math.abs(pos - center) / (TRACK_W / 2);
      const quality = pct <= perfectBand ? 'perfect' : pct <= goodBand ? 'good' : 'miss';
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

    const ai = this._activeAllyIndex;
    const ti = result.targetIndex ?? 0;
    // THE SWING, WHICH DID NOT EXIST. _executePowerMove called
    // playerAbilityLunge() — a group translate — and never playerAttackAnim, so
    // on the game's signature move Andrew stood in his calm stance and slid 1.0
    // units while the screen did all the work. The charge stays authored at
    // 680ms; the body clip is started early enough that ITS contact frame lands
    // on that beat instead of arriving after it.
    const SLAM = 680;
    const contact = this.scene.allyContactMs(ai, 'attack', 220);
    setTimeout(() => this.scene.playerAttackAnim(ai), Math.max(0, SLAM - contact));

    // Cinematic: slow low-angle push-in, backdrop darkens, one hard rim beat,
    // burst on impact (POWER_MOVE timeline), and the splash card on the same
    // frame. The card carries the title now — showBanner('ASSERT DOMINANCE')
    // would put two titles on screen.
    this.cine.play('power', { targetIndex, contactMs: SLAM });
    setTimeout(() => this._fireTaunt('power_move'), 1400);
    setTimeout(() => this._checkPhaseChange(), 1600);
    AchievementManager.check(this.player, { event: 'power_move_used' });
    // Anticipation charge during the low push-in
    this.particles.burst({ x: 0, y: 2.5, z: 2 }, 30, 0xffd700, 4, 0.8);
    this.particles.burst({ x: 0, y: 1.8, z: 2 }, 20, 0xffff00, 3, 0.6);

    this._scheduleImpact(() => {
      this.scene.impactBeat('power', 0xffffff);
      this.scene.strikeAccent(ai);
      this.scene.enemyHurtAnim(ti);
      this.scene.holdAllyPose(ai, 220);        // the finisher pose is HELD
      AudioManager.playSfx('critical');
      this._spawnDamageNumberAtEnemy(result.damage, 'critical', ti);
      this._refreshHPBars();
      this.particles.burst({ x: 0, y: 1.2, z: 0 }, 50, 0xffd700, 6, 1.5);
      this.particles.burst({ x: 0, y: 1.5, z: 0 }, 25, 0xffffff, 5, 1.2);
    }, SLAM);

    this._refreshHUD({ deferBars: true });
    setTimeout(() => {
      if (this.engine.isOver) this._handleResult();
      else this._processNextAllyTurn();
    }, 2300);
  }

  _executePressAdvantage(targetIndex) {
    const result = this.engine.playerPressAdvantage(targetIndex);
    if (!result) {
      // Already spent this turn (or no momentum) — hand input straight back
      // rather than eating the turn on a no-op.
      this.hud.showMessage('Advantage already filed. Choose your action.');
      this._enablePlayerInput();
      return;
    }

    this.phase = 'animating';
    this.hud.disableInput();
    const ai = this._activeAllyIndex;
    const ti = result.targetIndex ?? 0;
    // Press Advantage is a free action, not a mime: it plays a real body clip
    // now instead of only translating the group 0.6 units.
    const contact = this.scene.playerAbilityAnim(ai, { distance: 0.6 });
    this.cine.play('attack', { crit: !!result.critical, targetIndex, contactMs: contact });
    this.hud.showMessage('Advantage filed. Your action remains unspent.');
    this.scene.flash(0x8844ff, 0.10);
    this.particles.stream({ x: 0.1, y: 1.0, z: 3.5 }, { x: 0, y: 1.2, z: 0.3 }, 18, 0xaa66ff, 0.30);
    this._scheduleImpact(() => {
      this.scene.impactBeat(result.critical ? 'crit' : 'light', 0xaa66ff);
      this.scene.enemyHurtAnim(ti);
      this.scene.holdAllyPose(ai, 120);
      AudioManager.playSfx(result.critical ? 'critical' : 'hit');
      this._spawnDamageNumberAtEnemy(result.damage, result.critical ? 'critical' : 'damage', ti);
      this._refreshHPBars();
      this.particles.burst({ x: 0, y: 1.2, z: 0 }, result.critical ? 25 : 15, 0xaa66ff, 3, 0.9);
    }, contact);

    if (result.critical) this._fireTaunt('crit');
    this._checkPhaseChange();
    this._refreshHUD({ deferBars: true });
    this._refreshDepthHUD();
    setTimeout(() => {
      if (this.engine.isOver) { this._handleResult(); return; }
      // E33 Gradient model: this does NOT end the turn. Andrew still acts.
      this._enablePlayerInput();
    }, contact + 700);
  }

  _executeSecondWind() {
    const result = this.engine.playerSecondWind();
    if (!result) return;

    this.phase = 'animating';
    this.hud.disableInput();
    this.cine.play('second_wind', {});
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
      // The other half of the Ergonomic Wrist Support trade: a wider Brace
      // window is paid for out of Retaliate's damage. 1 with nothing equipped.
      const result = this.engine.playerRetaliate(
        multiplier * qteModifiers(this.player).retaliateDamage, targetIndex,
      );
      if (!result) return;

      this.phase = 'animating';
      this.hud.disableInput();
      const ai = this._activeAllyIndex;
      const rContact = this.scene.allyContactMs(ai, 'attack', 200);
      this.cine.play('retaliate', { crit: !!result.critical, targetIndex, contactMs: rContact });
      const msg = multiplier >= 1.4 ? 'DEVASTATING COUNTER!' : multiplier >= 1.0 ? 'Direct Counter!' : multiplier >= 0.66 ? 'Counter-Attack!' : 'Glancing Counter...';
      this.hud.showMessage(msg);
      this._fireTaunt('retaliate');
      AchievementManager.check(this.player, { event: 'retaliate_used' });
      this.scene.playerAttackAnim(ai);
      this.particles.stream({ x: 0.1, y: 1.0, z: 3.8 }, { x: 0, y: 1.2, z: 0.3 }, 16, 0x44ffaa, 0.25);
      this._scheduleImpact(() => {
        this.scene.impactBeat(result.critical ? 'crit' : 'normal', 0x44ffaa);
        this.scene.strikeAccent(ai);
        this.scene.enemyHurtAnim(result.targetIndex ?? 0);
        this.scene.holdAllyPose(ai, 140);
        AudioManager.playSfx(result.critical ? 'critical' : 'hit');
        this._spawnDamageNumberAtEnemy(result.damage, result.critical ? 'critical' : 'damage', result.targetIndex ?? 0);
        this._refreshHPBars();
        this.particles.burst({ x: 0, y: 1.2, z: 0 }, result.critical ? 28 : 18, 0x44ffaa, 3, 0.9);
      }, rContact);

      this._checkPhaseChange();
      this._refreshHUD({ deferBars: true });
      setTimeout(() => {
        if (this.engine.isOver) this._handleResult();
        else this._processNextAllyTurn();
      }, rContact + 700);
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
    NotificationArbiter.hold(NC.DECISION, 'combat-decision', selOverlay);   // auto-expires when the overlay leaves the DOM
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
    NotificationArbiter.hold(NC.DECISION, 'combat-decision', overlay);   // auto-expires when the overlay leaves the DOM
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
      { risk: 'all_in', label: 'All-In',     desc: '40% chance to deal 3× damage. Miss banks 40 Confidence.', color: '#ff4466' },
    ];
    const overlay = document.createElement('div');
    overlay.className = 'minigame-overlay';
    NotificationArbiter.hold(NC.DECISION, 'combat-decision', overlay);   // auto-expires when the overlay leaves the DOM
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
      // Cinematic: risk-tiered drama (safe steady / risky commit / all-in
      // low-angle). `splash` gates the All-In card on the gamble actually
      // LANDING — a splash card on a whiffed 40% would read as a reward for
      // losing, and the miss already banks 40 Confidence of its own.
      const ai = this._activeAllyIndex;
      const gContact = this.scene.allyContactMs(ai, 'attack', 200);
      this.cine.play('gamble', {
        risk, targetIndex, contactMs: gContact,
        splash: risk === 'all_in' && !!result.success,
      });
      this.scene.playerAttackAnim(ai);
      this._scheduleImpact(() => {
        this.scene.impactBeat(result.critical ? 'crit' : 'normal', result.critical ? 0xffd700 : 0xff4466);
        this.scene.strikeAccent(ai);
        this.scene.enemyHurtAnim(result.targetIndex ?? 0);
        this.scene.holdAllyPose(ai, 160);
        AudioManager.playSfx(result.critical ? 'critical' : 'hit');
        this._spawnDamageNumberAtEnemy(result.damage, result.critical ? 'critical' : 'damage', result.targetIndex ?? 0);
        this._refreshHPBars();
        this.particles.burst({ x: 0, y: 1.2, z: 0 }, result.critical ? 35 : 18, 0xff4466, 3, 0.9);
      }, gContact);
    }

    if (!result.success && result.consolationMomentum > 0) {
      setTimeout(() => this.hud.showMessage(`Nothing lands. The attempt itself was worth ${result.consolationMomentum} Confidence.`), 700);
    }

    this._checkPhaseChange();
    this._refreshHUD();
    this._refreshDepthHUD();
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
    if (!enemyData) return null;
    // New Game+: they have had this meeting before. `ngTaunts` is mixed into
    // the normal pool rather than replacing it, so the repetition reads as a
    // recurring quarter and not as a second script.
    const ngPlus = !!this.player.getFlag?.('ng_plus');
    const pool = (ngPlus && enemyData.ngTaunts)
      ? [...(enemyData.taunts || []), ...enemyData.ngTaunts]
      : enemyData.taunts;
    if (!pool || pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // A single opening taunt line for the intro banner (falls back to a generic).
  _introTaunt() {
    const t = this._pickTaunt('enemy');
    return t || 'Let\'s make this quick.';
  }

  _getTelegraphHint(abilityId, enemy = null) {
    if (!abilityId) return '';
    const ability = ENEMY_ABILITIES[abilityId];
    const name = enemy?.name || this.engine.enemy?.name || 'Enemy';
    if (!ability) return `${name} is making a move...`;
    // Magnitude matters: brace-everything turtling loses fights
    // (sim-validated), so big hits announce themselves
    const heavy = (ability.power || 0) >= 26 ? ' (HEAVY — brace!)' : '';
    // LOCKS: if this move carries objections, the telegraph line says so and
    // the chip row underneath names the types that cancel it.
    const locked = (enemy?.locks || []).some(l => !l.cleared) ? ' — file an objection' : '';
    switch (ability.type) {
      case 'attack': return `${name}: attack${heavy}` + locked;
      case 'dot': return `${name}: lingering` + locked;
      case 'heal': return `${name}: heal` + locked;
      case 'debuff': return `${name}: weaken` + locked;
      case 'confuse': return `${name}: confuse` + locked;
      case 'stun': return `${name}: stun — brace!` + locked;
      case 'counter': return `${name}: counter — no abilities!` + locked;
      case 'buff': return `${name}: power up` + locked;
      case 'repeat': return `${name}: repeat` + locked;
      default: return `${name}: ?` + locked;
    }
  }

  update(dt) {
    this.scene.update(dt);
    // FREEZE MEANS FREEZE. CombatScene.update() early-returns during hit-stop,
    // but the camera timeline and the particles were advanced UNCONDITIONALLY
    // here — so a "freeze" moved the camera and kept the sparks flying while
    // the bodies stood still. That is the opposite of what a hit-stop is for,
    // and the comment in this file already claimed the correct behaviour.
    if (this.scene.freezeTimer <= 0) {
      this.cine.update(dt);   // advance camera timelines on the game clock (locked to gestures/hit-stop)
      this.particles.update(dt);
    }

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
          this._showMainMenuLive();
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
