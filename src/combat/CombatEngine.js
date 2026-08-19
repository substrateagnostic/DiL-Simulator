import { PLAYER_ABILITIES, ENEMY_ABILITIES, ENEMY_STATS, ITEMS, pickMessage } from '../data/stats.js';
import { ALLY_STATS, ALLY_ABILITIES, ALLY_AI_PATTERNS } from '../data/allies.js';
import { VOICES, VOICE_ACTIONS } from '../data/voices.js';
import { COMBAT } from '../utils/constants.js';
import { randomRange } from '../utils/math.js';
import { ENEMY_AI_PATTERNS } from '../combat/EnemyAI.js';
// DIFFICULTY MODES. Four questions, four accessors, no branch on mode anywhere
// in this file: the phase rows an enemy fights with, the AI pattern row it
// draws through, two COMBAT_DEPTH values, and one multiplier on Andrew's
// working-copy stats. While `DIFFICULTY_LIVE` is false every one of them
// returns the shipped value, so this import is inert. See
// `src/core/DifficultyManager.js`.
import { Difficulty } from '../core/DifficultyManager.js';

// Multi-combatant turn-based engine.
// Backward compatible with single-enemy fights via get player() / get enemy().
// allies[0] is always the player (Andrew). Additional allies are AI-controlled.
// enemies[] has 1+ entries; AoE abilities hit all alive enemies.

// ── Tunables (COMBAT DEPTH pass) ────────────────────────────────────────
// All of these are plain module constants so the editor's balance layer can
// still override the DATA they act on (ENEMY_STATS.maxComposure,
// ENEMY_ABILITIES[id].locks) without needing to know about the engine.
export const COMBAT_DEPTH = {
  // LOCKS (Sea of Stars). A telegraphed enemy move can carry 1–3 damage-type
  // locks. Landing a matching-tag hit before the enemy acts clears one.
  LOCK_TAGS: ['legal', 'social', 'audit', 'technical'],
  // Each cleared lock shaves this much off the telegraphed hit. All clear = fizzle.
  LOCK_PARTIAL_REDUCTION: 0.30,
  LOCK_MIN_MULTIPLIER: 0.10,

  // COMPOSURE / BREAK (Honkai: Star Rail Toughness model).
  // Only weakness-tag hits reduce it. At zero the enemy loses a turn and
  // takes +20% damage until it recovers.
  // Sim-tuned: bars land at 60/90/120 → 2/3/4 weakness hits to Break, which
  // puts roughly one Break per fight in reach without making it automatic.
  COMPOSURE_PER_WEAKNESS_HIT: 30,
  COMPOSURE_STEP: 30,          // bars are multiples of 30, HSR-style
  COMPOSURE_MIN: 60,
  COMPOSURE_MAX: 120,
  BROKEN_DAMAGE_BONUS: 1.20,
  // HSR's standing pre-Break tax: while an enemy still has Composure, your
  // damage is 0.9×. It is what makes Breaking read as "unlocking your real
  // damage" rather than a bonus. It is a REFRAMING, not a nerf — it only
  // works paired with PLAYER_DAMAGE_COMPENSATION below, which is why the two
  // constants are documented as one decision.
  UNBROKEN_DAMAGE_TAX: 0.90,
  // …and the base-damage raise the tax is REQUIRED to ship with. Report P1.2:
  // "Pair with the 0.9× pre-break tax ONLY IF you also raise base damage —
  // otherwise it reads as a nerf." The first pass shipped the tax alone, and
  // the sim caught it: a naive basic-attack policy — the median player, who
  // never engages with Break at all — lost roughly 10pp of win rate at every
  // level (see tools/combat-sim.mjs --tax-ab). Competent play was untouched,
  // so the skill floor dropped while the ceiling held: exactly the failure
  // Broche names in P1.7.
  //
  // 1.13, not the arithmetic 1/0.90 = 1.111: the band ends in a Math.floor,
  // which costs another ~0.5 damage per hit on top of the multiply. 1.13 is
  // the value that MEASURES back to parity, not the one that looks tidy
  // (tools/combat-sim.mjs --dps, 200k basic attacks vs Karen at L7:
  //  no band 30.240 · tax alone 27.009 · 1.11 comp 29.257 · 1.13 comp 30.284).
  // Applied to player-and-ally damage against any enemy that HAS a Composure
  // bar, immediately before the band, so:
  //   unbroken  1.13 × 0.90 → 30.28 vs a 30.24 baseline — held harmless
  //   broken    1.13 × 1.20 → +33% over baseline, not +20%
  // Raising COMBAT.BASE_DAMAGE_MULTIPLIER instead would have buffed every
  // enemy too (the formula is shared), which is why the raise lives here.
  // Do not change one of these three numbers without the other two.
  PLAYER_DAMAGE_COMPENSATION: 1.13,
  // Metaphor deny-model: a PERFECT Brace takes something from the enemy.
  BRACE_COMPOSURE_STRIP: 0.20,

  // AGENCY ECONOMY
  LOOP_IN_DAMAGE_BONUS: 1.5,   // P5R Baton Pass rank-2 analogue
  LOOP_IN_MOMENTUM: 10,

  // FAIRNESS: confusion scrambles targeting / dampens force. It never
  // replaces the chosen action (Sandfall: "no frustrating deaths").
  CONFUSED_POWER_MULT: 0.65,
  CONFUSED_SCRAMBLE_CHANCE: 0.5,

  // Desperate Gamble. The menu is meant to be a real trichotomy — no row may
  // dominate the other two, in either direction.
  //   safe    1.00× guaranteed
  //   risky   60% × 1.5 + 40% × 0.5 = EV 1.10×, moderate variance
  //   all_in  40% × 2.7             = EV 1.08×, maximum variance, plus a
  //           25-momentum floor on the whiff so it is never a dead turn
  // It shipped at 30% × 2.5 = EV 0.75× (strictly worse than safe, with an
  // achievement attached teaching players to take a bad bet — report G9). The
  // first fix over-corrected to 40% × 3.0 = EV 1.20× with 40 consolation
  // momentum, which made all_in the EV-dominant row for anyone doing the
  // arithmetic and turned a designed trap into a designed answer. 2.7 × 25
  // puts it a hair UNDER risky on raw EV, so choosing it is a statement about
  // variance and about the momentum floor, not a calculation.
  // Measured: tools/combat-sim.mjs --gamble.
  ALL_IN_CHANCE: 0.40,
  ALL_IN_MULTIPLIER: 2.7,
  ALL_IN_CONSOLATION_MOMENTUM: 25,

  // ── DENIAL TAX ("Escalated to Committee") ───────────────────────────────
  // The counterweight to perfect play, and a deliberate deviation from the
  // brief: it is in neither Sea of Stars nor the comps report. It exists
  // because Locks and Break stack — voiding a telegraph takes an enemy turn,
  // Breaking takes another, and a player who reads both correctly can take a
  // boss's whole kit away indefinitely with nothing given back.
  //
  // At DENIAL_LIMIT consecutive denied turns the enemy stops improvising and
  // its next telegraphed move is SEALED: the locks are shown but cannot be
  // cleared, and its Composure will not move while the seal holds. The counter
  // resets once the sealed move resolves. It is announced, it is on the HUD,
  // and it has a one-time teach line — it is a rule, not a gotcha.
  //
  // Measured (`node tools/combat-sim.mjs --denial-ab`, 300 runs, competent
  // policy — DENIAL_LIMIT off vs 2, Andrew's HP at victory):
  //   meredith_boss L9   78.8% -> 77.0%    win 99.3% -> 98.7%
  //   algorithm  L10   65.0% -> 66.8%    win 99.3% -> 100.0%
  //   grandma     L8   91.3% -> 88.8%    win 100%  -> 100%
  // i.e. against a *competent* policy it is nearly free — it is priced against
  // the ceiling, not the floor, and it does not move the win rate. Do not
  // raise DENIAL_LIMIT past 2 expecting a difficulty knob; it is not one.
  DENIAL_LIMIT: 2,
  // What a sealed move is WORTH. The seal used to only guarantee that one move
  // would land un-reduced; this makes the move the player cannot answer also
  // the move that hurts, which is the only shape that reads as the enemy being
  // paid back rather than merely not being robbed again.
  //
  // Honest measurement, because the number invites a bigger claim than it can
  // support (`node tools/combat-sim.mjs --denial-ab 1.0,1.35,1.6`, 400 runs,
  // competent policy, Andrew's HP at victory):
  //   meredith_boss L9   denial off 78.3% | 1.00x 76.7% | 1.35x 76.5% | 1.60x 76.4%
  //   algorithm   L10  denial off 65.3% | 1.00x 66.0% | 1.35x 65.7% | 1.60x 65.4%
  //   grandma     L8   denial off 90.5% | 1.00x 90.6% | 1.35x 90.9% | 1.60x 90.8%
  // A seal fires at most once or twice a fight, so the premium is worth a few
  // tenths of a point of margin, not several points. It is shipped for
  // LEGIBILITY — the sealed move visibly hits harder, so the rule teaches
  // itself — and NOT as a difficulty dial. Raising it will not move the win
  // rate; it will only start manufacturing the unanswerable burst that
  // Sandfall's "no frustrating deaths" rule forbids, because a sealed move is
  // by definition one the player was given no counter to.
  // The lever that actually moves the ceiling is DENIAL_LIMIT (78.3% -> 76.7%
  // on Meredith), and even that is deliberately small.
  SEALED_DAMAGE_BONUS: 1.35,
  // Momentum decay per player turn under Escalation Clause / the Open-Door
  // Policy stretch goal. The report's named version of both.
  MOMENTUM_DECAY: 10,
  // Press Advantage's price, hoisted out of `getPressAdvantageCost` so the
  // balance harness can A/B it (`tools/_l-balance.mjs --cand F1`). Same two
  // numbers as before — the cost is `max(FLOOR, BASE - floor((spd - 8) / 2))`.
  // It is a CEILING-ONLY knob: combat-sim's CASUAL policy has no branch that
  // calls Press Advantage, so moving it cannot reach the PIP floor. See the
  // note above `getPressAdvantageCost` for what the price is buying.
  PRESS_ADVANTAGE_BASE: 40,
  PRESS_ADVANTAGE_FLOOR: 25,
};

// ── New Game+ ladder ────────────────────────────────────────────────────
// Two numbers, not one. `NG_PLUS_ENTRY` is the ENTRY RUNG — applied once the
// moment you step onto any NG+ lap; `NG_PLUS_SCALING` compounds for every lap
// beyond the first. Kept as plain exports so the balance editor and the
// headless sims (tools/ng-sim.mjs) can read the same numbers.
//
// Why an entry rung exists at all: the first version of this ladder was
// 1.35/1.15/1.10 compounding from lap 1, which was WEAKER on lap 1 than the
// flat 1.4/1.3/1.2 it replaced — and lap 1 is the only lap most players ever
// run. NG+ hands back every ability, every upgrade point and all the AUM, so
// lap 1 has to be priced against the CARRY, not against the base enemy, or it
// lands in the documented Dark Souls anti-pattern (report P4.1 / G3) where the
// second lap is easier than the first.
//
// Harness: `node tools/ng-sim.mjs` — 500 runs/cell, competent policy, FRESH
// kit (abilities per the level curve) vs CARRIED kit (all 19 abilities plus
// maxed permanent shop upgrades: +9 atk, +9 def, +60 maxHP, +6 spd).
// The ladder is correct when CARRY@NG+1 <= FRESH@NG. As shipped:
//
//   encounter    lvl   FRESH@NG   CARRY@NG   CARRY@NG+1  CARRY@NG+2  CARRY@NG+3
//   karen         4       96.0%     100.0%        95.8%       82.8%       75.4%
//   chad          6      100.0%     100.0%       100.0%       99.8%       98.6%
//   grandma       8       99.8%     100.0%        99.4%       97.2%       97.0%
//   meredith_boss   9       98.4%     100.0%        82.6%       48.2%       29.8%
//   algorithm    10       99.6%     100.0%        80.8%       51.4%       35.6%
//
// Read the table honestly: karen/chad/grandma sit at the ceiling in BOTH the
// FRESH@NG and CARRY@NG+1 columns, so those rows cannot demonstrate the ladder
// either way — a couple of points of wobble there is sampling noise. The two
// rows with headroom are the ones that carry the claim: meredith_boss
// 98.4% -> 82.6% -> 48.2% -> 29.8% and algorithm 99.6% -> 80.8% -> 51.4% ->
// 35.6%. That is a staircase; the previous constants (maxHP per-lap 1.35, no
// decay) produced 27.3% -> 1.0% and 27.7% -> 4.0%, i.e. a wall, which
// contradicted this comment's own "ends somewhere a human can stand". maxHP
// per-lap was cut 1.35 -> 1.15 (`--hpscale` sweep) because the two finales are
// damage races and HP compounding is the term that turns them into a cliff;
// the decay below then softens only the top rung.
//
// Re-run it before touching any of these constants. `--sweep` sweeps the maxHP
// entry rung, `--hpscale` the per-lap maxHP, `--lapdecay` the top-rung decay.
export const NG_PLUS_ENTRY   = { maxHP: 1.70, atk: 1.45, def: 1.30, xpReward: 1.25 };
export const NG_PLUS_SCALING = { maxHP: 1.15, atk: 1.15, def: 1.10, xpReward: 1.20 };
export const NG_PLUS_CAP = 3;   // laps beyond this stop compounding

// Per-lap DECAY on the compounding exponent. The exponent for `laps` is
// 1 + d + d^2 + ... (laps-1 terms), so lap 1 and lap 2 are IDENTICAL at any d
// (exponents 0 and 1) and only lap 3 is affected. It exists because the first
// version compounded flat and the top rung stopped being a ladder: at d = 1.0
// with the old 1.35 HP scaling the finale rows measured meredith_boss 1.0% and
// algorithm 4.0% at CARRY@NG+3 — functionally unwinnable, which contradicts the
// "ends somewhere a human can stand" claim above. NG+3 now lands at 29.8% /
// 35.6%: below the 40-85% story band on purpose, because the top rung of a
// voluntary ladder is a flex, not a checkpoint — but a flex you can pass.
// Swept in tools/ng-sim.mjs --lapdecay.
// Held on an object (like NG_PLUS_ENTRY) so the harness can sweep it in place.
export const NG_PLUS_LAP = { decay: 0.35 };

/**
 * Compounding exponent for a given lap count: a decaying geometric sum so each
 * further lap adds less than the last. laps 0/1/2 return 0/0/1 at every decay
 * value, which is why the shipped NG and NG+1/NG+2 numbers are untouched.
 * Exported so tools/ng-sim.mjs prints the same multipliers the engine builds.
 */
export function ngLapExponent(laps) {
  let e = 0;
  for (let k = 0; k < Math.max(0, laps - 1); k++) e += Math.pow(NG_PLUS_LAP.decay, k);
  return e;
}

// ── Overtime (Performance Review hard mode) ─────────────────────────────
// Opt-in, reversible, locks nothing out. Multiplies on top of the NG+ lap.
export const OVERTIME_SCALING = { maxHP: 1.25, atk: 1.25, xpReward: 1.50 };

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
      const enemy = this._buildEnemy(eid, overrides, !!opts.ngPlus, opts.ngPlusCount || 0, !!opts.overtime);
      if (enemy) this.enemies.push(enemy);
    }
    // Remembered by CombatState for the NG+ taunt pool and the XP payout.
    this.ngPlusCount = opts.ngPlus ? Math.max(1, opts.ngPlusCount || 1) : 0;
    this.overtime = !!opts.overtime;
    // Player-authored difficulty (src/data/review.js). A plain Set of ids —
    // every stretch goal is SUBTRACTIVE, so the engine only ever asks
    // "is this one on?" and takes something away. Old saves pass nothing.
    this.stretch = new Set(opts.stretch || []);
    // Performance Improvement Plan — the opt-in forgiveness layer (P1.6, the
    // Hades God Mode analogue). A flat fraction of incoming damage removed from
    // ANDREW only; allies, enemies and every other multiplier are untouched, so
    // it cannot interact with weakness, Break, Locks or the mutators. Computed
    // in src/data/review.js from `player.deaths`; 0 for anyone who never
    // requisitioned it, which is what keeps old saves bit-identical.
    this.pipResist = Math.max(0, Math.min(0.95, Number(opts.pipResist) || 0));

    // ── PRACTICE GROUPS ──────────────────────────────────────────────
    // Which tree NODES Andrew owns. Passives are ordinary PLAYER_ABILITIES
    // rows the engine never EXECUTES — it reads them from here. Empty for any
    // caller that passes nothing, which is exactly the shipped behaviour, so
    // an old save or a harness that has not been updated is bit-identical.
    this.nodes = new Set(opts.nodes || []);
    // AUDIT-ON-HARD: the record can start seeded (`seedRecord`, shipped 0) —
    // the auditor read their file before the meeting. Seeds `_findingsEver`
    // (the assault-slow record) ONLY, never `_findings`: the shield arrives
    // pre-warmed, the burst clock still starts at zero. Gated on the
    // `findings` node so no other lane ever carries a record.
    const _seed = Difficulty.auditRamp().seedRecord;
    if (_seed > 0 && this.nodes.has('findings')) {
      for (const e of this.enemies) e._findingsEver = _seed;
    }
    // TURN-BACK ("Objection Sustained"). One mechanism, two grades: `sustain`
    // is universal and may not deal damage; `attack` is the Litigation
    // capstone's upgrade of that same return and may be a BASIC ATTACK ONLY.
    // Never a second return, never a second prompt, never a second code path.
    this.turnBackReady = null;
    this._inTurnBack = false;
    this._msjSpent = false;
    this._activeAbility = null;

    this.activeAllyIndex = 0;        // Index of ally currently taking a turn
    this.targetEnemyIndex = this._firstAliveEnemyIndex(); // Default target for single-target attacks
    this.turn = 'player';            // 'player' | 'enemy' (legacy semantics retained)
    this.turnCount = 0;
    this.isOver = false;
    this.result = null;
    this.log = [];
    this.counterActive = false;
    this.posterJustTriggered = false;
    // Baton pass ("Loop In") — armed by a weakness hit while an ally is alive.
    this.loopInReady = false;
    this._allyDamageMult = 1;   // set during a Loop In so the ally hits harder
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
    // MODE MULTIPLIERS land on the engine's WORKING COPY of Andrew's stats and
    // never on the save. That is what makes a mid-run mode switch instant and
    // reversible: the number in the pause menu is the number on the save, and
    // Hard's smaller Coffee pool exists only for the length of a fight. `mp` is
    // clamped so a switch cannot leave Andrew holding more than the pool.
    const maxMP = Difficulty.playerStat('maxMP', playerStats.maxMP);
    const maxHP = Difficulty.playerStat('maxHP', playerStats.maxHP);
    return {
      ...playerStats,
      maxMP,
      maxHP,
      mp: Math.min(maxMP, playerStats.mp ?? maxMP),
      hp: Math.min(maxHP, playerStats.hp ?? maxHP),
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
      // Per-turn agency guards. Live only on the engine's working copy of the
      // player stats — nothing here is persisted, so saves are unaffected.
      pressAdvantageUsedThisTurn: false,
      loopInUsedThisTurn: false,
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

  _buildEnemy(enemyId, overrides = {}, ngPlus = false, ngCount = 0, overtime = false) {
    const base = ENEMY_STATS[enemyId];
    if (!base) return null;
    // New Game+ scaling — applied before overrides so scripted fights
    // (e.g. first-Karen atk:999) keep their explicit values.
    //
    // This used to be a FLAT ×1.4 HP / ×1.3 ATK no matter how many laps you
    // had run, while NG+ carried every ability, upgrade point and quest state
    // forward — the documented Dark Souls anti-pattern, where NG+ is easier
    // than NG. `ng_plus_count` was written by MenuState and read by nothing.
    // It is now the exponent: each completed lap compounds, capped at 3 laps
    // so the ladder ends somewhere a human can stand.
    // Entry rung × per-lap compounding for every lap after the first, so lap 1
    // is priced against the carried loadout rather than against a fresh save.
    const laps = ngPlus ? Math.max(1, Math.min(NG_PLUS_CAP, ngCount || 1)) : 0;
    const rung = (key) => NG_PLUS_ENTRY[key] * Math.pow(NG_PLUS_SCALING[key], ngLapExponent(laps));
    const scaled = laps ? {
      maxHP: Math.round((base.maxHP || 100) * rung('maxHP')),
      atk: Math.round((base.atk || 10) * rung('atk')),
      def: Math.round((base.def || 5) * rung('def')),
      xpReward: Math.round((base.xpReward || 0) * rung('xpReward')),
    } : {};
    // Overtime — the opt-in Performance Review hard mode. Stacks on top of
    // NG+ multiplicatively and is reversible at any time from the shop.
    if (overtime) {
      const src = laps ? scaled : base;
      scaled.maxHP = Math.round((src.maxHP || base.maxHP || 100) * OVERTIME_SCALING.maxHP);
      scaled.atk = Math.round((src.atk || base.atk || 10) * OVERTIME_SCALING.atk);
      scaled.xpReward = Math.round((src.xpReward ?? base.xpReward ?? 0) * OVERTIME_SCALING.xpReward);
    }
    const merged = { ...base, ...scaled, ...overrides };
    // PHASE-LIST SURGERY. Resolved after `overrides` so a scripted fight that
    // hands in its own `phases` still wins, and returned as the SAME ARRAY when
    // the mode asks for shipped phases, so the default path allocates nothing.
    // The resolver spreads `{ abilities }` over each shipped row, which is what
    // makes "the Pivot's weakness rows are untouched" a property of the code
    // rather than a promise in a comment.
    merged.phases = Difficulty.phasesFor(enemyId, merged.phases);
    // MODE ENEMY MULTIPLIERS, applied LAST — which means they apply ON TOP of
    // an explicit `overrides` value, not under it (the n-run judge caught the
    // old comment claiming the opposite): the scripted first-Karen fight hands
    // in `atk: 999` and on Hard she is built at 1449. That beat survives
    // because 999 was already a guaranteed one-shot and so is any multiple of
    // it — but a future scripted beat that hands in a NUMBER TUNED TO BE
    // SURVIVABLE will be silently retuned by the mode. If that beat ever
    // exists, swap this to the NG+ block's order (multiply base, then spread
    // overrides), which exists for exactly that reason.
    // Deliberately NOT applied to `maxHP`: more enemy health is more ROUNDS,
    // and the balance lane's whole finding about the declined package was that
    // its bill was a 13-round Meredith. A hard mode raises the threat per turn;
    // it does not make the fight take longer.
    merged.atk = Difficulty.enemyStat('atk', merged.atk);
    merged.def = Difficulty.enemyStat('def', merged.def);
    const maxComposure = this._defaultMaxComposure(merged);
    return {
      ...merged,
      enemyId,
      hp: overrides.hp ?? scaled.maxHP ?? base.hp ?? base.maxHP,
      buffs: [],
      dots: [],
      lastAbility: null,
      exposed: 0,
      protected: 0,
      vulnerable: 0,
      silenced: 0,
      silencedThisTurn: false,
      confuseCooldown: 0,
      telegraphedAbility: null,
      abilityIndex: 0,
      // ── Composure / Break (HSR Toughness). Depletes on weakness-tag hits.
      maxComposure,
      composure: maxComposure,
      broken: 0,
      brokenBonus: 0,
      // ── Locks on the currently telegraphed move
      locks: [],
      lockAbilityId: null,
      // ── Denial tax. Counts consecutive turns taken away from this enemy
      // (fizzle / Break / block / silence). At COMBAT_DEPTH.DENIAL_LIMIT the
      // next telegraphed move is sealed. See _noteDenial().
      denialStreak: 0,
      sealed: false,
      _alive: true,
    };
  }

  // ── Stretch goals (player-authored difficulty) ────────────────────────
  hasStretch(id) { return this.stretch.has(id); }

  /** Does Andrew own this Practice Group node? */
  hasNode(id) { return this.nodes.has(id); }

  // ── E0 — THE PIVOT ────────────────────────────────────────────────────
  // Four bosses author `weakness` / `resistance` PER PHASE. On phase entry the
  // enemy's live weakness changes and the HUD announces it for free:
  // CombatHUD already renders `COMPOSURE — <WEAKNESS> ONLY` off live enemy
  // state every frame, and _checkPhaseChange already fires a phase message, a
  // screen flash and a taunt.
  //
  // THIS CANNOT LIVE IN _calcDamage ALONE. The HUD and _getTelegraphHint read
  // `enemy.weakness` directly, so the resolved value has to be PERSISTENT
  // state, not a per-hit lookup. Row 0 (the base state) is never touched, so
  // every documented weakness in Gameplay.md and every dialog hint stays true.
  //
  // AUTHORING LAWS, all three earned by measurement:
  //   1. The tutorial boss does not pivot. Karen teaches exactly one thing;
  //      her pivot cost the shipped kit 2.5 pp of win rate to buy 10 points of
  //      top-tag share on a 4.4-round fight.
  //   2. The SOCIAL phase goes LAST. From L8 `per_my_last_email` (55 power) is
  //      the biggest single-target ability in the game, so a social phase is a
  //      damage UPGRADE; it is parked where it cannot shorten the fight.
  //   3. Pivot toward the player's SECOND-BEST area, never their worst.
  //      Setting Meredith's phase-1 weakness to `technical` — the area with
  //      exactly one ability in the whole game — made monotony WORSE
  //      (top tag 42.2 % -> 56.2 %): a player with no button in the new area
  //      just keeps hitting the old button off-weakness.
  _syncPhaseTraits(enemy) {
    if (!enemy || !enemy.phases || enemy.hp <= 0) return;
    const hpPercent = enemy.hp / enemy.maxHP;
    let active = null;
    for (const phase of enemy.phases) {
      if (hpPercent <= phase.hpThreshold && (!active || phase.hpThreshold <= active.hpThreshold)) {
        active = phase;
      }
    }
    // Falling out of every phase band (a heal above row 0's threshold) must put
    // the BASE traits back, or a healed boss keeps a weakness it no longer has.
    const want = active && (active.weakness || active.resistance) ? active : null;
    const key = want ? want.hpThreshold : 'base';
    if (enemy._phaseTraitKey === key) return;
    enemy._phaseTraitKey = key;
    if (enemy._baseWeakness === undefined) {
      enemy._baseWeakness = enemy.weakness ?? null;
      enemy._baseResistance = enemy.resistance ?? null;
    }
    enemy.weakness = (want && want.weakness) || enemy._baseWeakness;
    enemy.resistance = (want && want.resistance) || enemy._baseResistance;
  }

  /** Resolve phase traits for every living enemy. Cheap; runs on turn beats. */
  syncAllPhaseTraits() {
    for (const e of this.enemies) this._syncPhaseTraits(e);
  }

  // Composure bar size. Authorable per enemy via ENEMY_STATS[id].maxComposure
  // (and therefore via balance.json's `enemies` override block); otherwise
  // derived from maxHP in HSR-style steps of 30, clamped so the final bosses
  // don't need fifteen weakness hits to Break.
  _defaultMaxComposure(merged) {
    if (typeof merged.maxComposure === 'number') return merged.maxComposure;
    const { COMPOSURE_STEP: step, COMPOSURE_MIN: lo, COMPOSURE_MAX: hi } = COMBAT_DEPTH;
    const hp = merged.maxHP || 100;
    return Math.max(lo, Math.min(hi, Math.round(hp / 100) * step || step));
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

  // ── LOCKS (Sea of Stars) ──────────────────────────────────────────────
  // A telegraphed enemy move names its own counter: a row of damage-type
  // chips. Clear them all with matching-tag hits before the enemy acts and
  // the move fizzles, consuming the turn. Partial clears weaken it.

  // Stable string hash so a given ability always requests the same tags —
  // Locks must be LEARNABLE, not re-rolled every fight.
  _lockHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // How many locks a move carries. Authorable per ability via
  // ENEMY_ABILITIES[id].locks (explicit tag array) or .lockCount.
  // Sim-tuned: ONLY genuinely heavy moves and hard denial carry locks. Putting
  // locks on every jab made every enemy turn fizzle and combat stopped hurting.
  // NOTE: the lock floor (20) sits BELOW the telegraph's HEAVY threshold (26)
  // on purpose — a 20-25 power swing is worth announcing a counter for even
  // though the hint does not call it heavy. Do not "fix" one to match the
  // other without re-running `node tools/combat-sim.mjs --lock-audit`, which
  // prints per-enemy lock coverage: at this floor 23 of the game's 24 enemies
  // carry at least one locked move (the exception is `intern`, the two-ability
  // tutorial fodder, which is deliberately outside the mechanic). Raising the
  // floor to 26 drops coverage and whole encounters stop teaching Locks.
  _lockCountFor(ability) {
    if (!ability) return 0;
    if (Array.isArray(ability.locks)) return ability.locks.length;
    if (typeof ability.lockCount === 'number') return Math.max(0, ability.lockCount);
    const p = ability.power || 0;
    switch (ability.type) {
      case 'attack':
      case 'dot':
      case 'summon':
      case 'repeat':
        // Sim-tuned band. Andrew solo gets ONE tagged hit per turn, so a
        // 1-lock move is the fizzle he can actually earn on his own; the 34+
        // haymakers need two, which is what a party is for. The floor sits at
        // 20 so every enemy in the game has at least one locked move — below
        // that, whole encounters never showed the mechanic.
        if (p >= 34) return 2;
        if (p >= 20) return 1;
        return 0;
      case 'stun':    return 1;
      case 'confuse': return 1;
      case 'counter': return 1;
      default:        return 0;
    }
  }

  // Tag pool for an enemy. `technical` is quest-gated for Andrew, so it is only
  // ever requested by an enemy actually weak to it — or by an explicit authored
  // `locks` array. The resisted tag STAYS in the pool on purpose: sometimes the
  // only way to cancel the move is to swing with the type it shrugs off, and
  // that trade is the point.
  _lockTagPool(enemy) {
    const pool = [];
    for (const t of COMBAT_DEPTH.LOCK_TAGS) {
      if (t === 'technical' && enemy.weakness !== 'technical') continue;
      pool.push(t);
    }
    return pool;
  }

  // Which of an enemy's moves announce a counter at all. Capped at a third of
  // the kit (heaviest first), with a guaranteed minimum of one.
  // Sim finding: without the cap, enemies whose whole kit sat in the lockable
  // power band (Chad) could be fizzled every single turn — 100% win, 100% HP.
  // With it, the big swings telegraph a counter and the jabs still land.
  _lockableSet(enemy) {
    if (enemy._lockable) return enemy._lockable;
    const all = new Set(enemy.abilities || []);
    for (const p of enemy.phases || []) for (const a of (p.abilities || [])) all.add(a);
    const ids = [...all];
    const power = (id) => ENEMY_ABILITIES[id]?.power || 0;
    const qualifying = ids
      .filter(id => this._lockCountFor(ENEMY_ABILITIES[id]) > 0)
      .sort((a, b) => (power(b) - power(a)) || (a < b ? -1 : 1));
    const cap = Math.max(1, Math.ceil(ids.length / 3));
    let picked = qualifying.slice(0, cap);
    if (picked.length === 0) {
      // Guarantee most enemies show the mechanic at least once: promote the
      // heaviest offensive move even if it sits under the power floor. The
      // floor of 12 keeps the tutorial Intern (4-power jabs) lock-free — a
      // first fight should not open with a puzzle.
      const OFFENSIVE = ['attack', 'dot', 'summon', 'stun', 'confuse', 'counter', 'repeat'];
      const heaviest = ids
        .filter(id => OFFENSIVE.includes(ENEMY_ABILITIES[id]?.type))
        .filter(id => power(id) >= 12 || !['attack', 'dot', 'summon', 'repeat'].includes(ENEMY_ABILITIES[id]?.type))
        .sort((a, b) => (power(b) - power(a)) || (a < b ? -1 : 1))[0];
      if (heaviest) picked = [heaviest];
    }
    enemy._lockable = new Set(picked);
    return enemy._lockable;
  }

  _buildLocks(enemy, abilityId) {
    if (!abilityId) return [];
    const ability = ENEMY_ABILITIES[abilityId];
    if (!ability) return [];
    if (Array.isArray(ability.locks)) {
      return ability.locks.map(tag => ({ tag, cleared: false }));
    }
    if (!this._lockableSet(enemy).has(abilityId)) return [];
    const fullPool = this._lockTagPool(enemy);
    // Promoted moves floor at 1 so the guarantee above actually produces a lock.
    const count = Math.min(Math.max(1, this._lockCountFor(ability)), fullPool.length);
    if (count <= 0) return [];
    // A SINGLE-lock move never asks for the tag the enemy is already weak to.
    // Otherwise spamming the one weakness ability voids the enemy's whole kit
    // for free (sim: Meredith finished at 95% HP against an unaware policy).
    // Making the lone lock a second tag is the forcing function that actually
    // pays off carrying one ability per damage type.
    const pool = (count === 1 && fullPool.length > 1)
      ? fullPool.filter(t => t !== enemy.weakness)
      : fullPool;
    // Hash-rotated so a given move always demands the same tags — Locks must be
    // learnable, not re-rolled per fight.
    const off = this._lockHash(abilityId) % pool.length;
    const tags = [];
    for (let i = 0; i < count; i++) tags.push(pool[(off + i) % pool.length]);
    return tags.map(tag => ({ tag, cleared: false }));
  }

  // Land a tagged hit on a target: clears at most one matching lock.
  // Returns the number cleared (0 or 1). A SEALED move (see _noteDenial) shows
  // its locks and refuses every one of them.
  _clearLocks(target, abilityTag) {
    if (!abilityTag || !target || !Array.isArray(target.locks)) return 0;
    if (target.sealed) return 0;
    const lock = target.locks.find(l => !l.cleared && l.tag === abilityTag);
    if (!lock) return 0;
    lock.cleared = true;
    return 1;
  }

  // ── DENIAL TAX ("Escalated to Committee") ─────────────────────────────
  // Called every time an enemy's turn is taken away from it. Two consecutive
  // denials and the organisation closes ranks: the next telegraphed move is
  // sealed (locks visible, unclearable) and Composure will not move while the
  // seal holds. This is the price of the fizzle+Break stack — without it an
  // optimal policy finished the last two bosses above 87% HP.
  _noteDenial(enemy) {
    if (!enemy || enemy.hp <= 0) return false;
    enemy.denialStreak = (enemy.denialStreak || 0) + 1;
    if (enemy.denialStreak >= Difficulty.depth('DENIAL_LIMIT', COMBAT_DEPTH.DENIAL_LIMIT)) {
      enemy.denialStreak = 0;
      enemy.sealed = true;
      return true;
    }
    return false;
  }

  /** Reset the streak: the enemy got to act, so nothing is owed. */
  _clearDenial(enemy) {
    if (!enemy) return;
    enemy.denialStreak = 0;
    enemy.sealed = false;
  }

  /** Public read for the HUD. */
  isSealed(enemyIndex = this.targetEnemyIndex) {
    return !!this.enemies[enemyIndex]?.sealed;
  }

  // Public read for the HUD: [{ tag, cleared }] for a given enemy.
  getLocks(enemyIndex = this.targetEnemyIndex) {
    return this.enemies[enemyIndex]?.locks || [];
  }

  // ── COMPOSURE / BREAK (HSR Toughness) ─────────────────────────────────
  // Only weakness-tag hits fill it. At zero the enemy loses its next turn and
  // takes +20% damage until it recovers.
  _reduceComposure(target, amount) {
    if (!target || target.hp <= 0 || !target.maxComposure) return { broke: false, amount: 0 };
    if (target.broken > 0) return { broke: false, amount: 0 };   // already broken
    // Sealed: the committee is not available for comment.
    if (target.sealed) return { broke: false, amount: 0, sealed: true };
    const applied = Math.min(amount, target.composure);
    target.composure = Math.max(0, target.composure - amount);
    if (target.composure <= 0) {
      // Spec parity with the P1.2 mapping: a Break opens a real window.
      // `broken` costs the enemy its next turn; `brokenBonus` carries the +20%
      // through the remainder of this player turn AND the whole next one, so
      // "takes +20% for a round" is true without having to bank a second action.
      target.broken = 1;
      target.brokenBonus = 2;
      // ...and the same off-by-one applies to the 1.5x vulnerability window.
      // `vulnerable` is decremented in processTurnStart on the ENEMY side, and a
      // broken enemy still runs its turn-start before losing the turn itself. At
      // 1, the counter therefore hit zero before the player ever got to swing:
      // the hit that broke the bar is excluded by `wasVulnerable` in _calcDamage
      // (so it cannot double-dip), and by the player's next turn the window was
      // already gone. Anyone whose route to a Break was a plain weakness hit or a
      // perfect Brace never saw the 1.5x at all.
      //
      // 2 spends one tick on the enemy's skipped turn and leaves exactly one
      // full player turn to cash in — the same shape as brokenBonus above.
      // Heal/Confuse still set vulnerable = 1 (see _pickEnemyAbility): those fire
      // DURING the enemy's turn, so their single tick already lands after the
      // player has had a swing. Only the Break-sourced window is extended.
      target.vulnerable = 2;
      return { broke: true, amount: applied };
    }
    return { broke: false, amount: applied };
  }

  // ── Damage calc ───────────────────────────────────────────────────────
  _calcDamage(attackerAtk, power, defenderDef, target = null, abilityTag = null) {
    // The Pivot is persistent state, but a hit that crosses a phase boundary
    // must be scored against the traits the enemy has ON THAT FRAME.
    if (target && this.enemies.includes(target)) this._syncPhaseTraits(target);
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
    let composureHit = 0;
    let broke = false;
    let lockCleared = 0;
    const isEnemy = target && this.enemies.includes(target);
    // A Broken enemy eats +20% until the window closes. Sampled BEFORE this hit
    // can itself cause the Break, so the breaking hit doesn't double-dip.
    const wasBroken = isEnemy && (target.brokenBonus > 0 || target.broken > 0);
    // Same guard for the vulnerability window: a Break now SETS vulnerable, so
    // without this the breaking hit would consume the window it just opened.
    const wasVulnerable = isEnemy && target.vulnerable > 0;
    if (abilityTag && isEnemy) {
      if (target.weakness === abilityTag) {
        damage = Math.floor(damage * 1.5);
        effective = 'super';
      } else if (target.resistance === abilityTag) {
        damage = Math.floor(damage * 0.7);
        effective = 'resist';
      }
    }
    if (isEnemy && target.maxComposure > 0) {
      // Compensation × band. The compensation exists so the standing pre-Break
      // tax is a REFRAMING of the same damage rather than a nerf — see
      // PLAYER_DAMAGE_COMPENSATION above. Both factors are gated on the enemy
      // actually having a Composure bar, so an enemy authored with
      // maxComposure: 0 is outside the system entirely in both directions.
      const band = wasBroken ? COMBAT_DEPTH.BROKEN_DAMAGE_BONUS : COMBAT_DEPTH.UNBROKEN_DAMAGE_TAX;
      damage = Math.floor(damage * COMBAT_DEPTH.PLAYER_DAMAGE_COMPENSATION * band);
    }

    // ── AUDIT: FINDINGS (E1) ──────────────────────────────────────────
    // The FIRST mechanic in the game that pays you for hitting the tag the
    // enemy is NOT weak to — which the Objections system was already forcing
    // you to do, and never paid for. The ramp is read BEFORE tag resolution
    // so the closing hit is not also boosted by the stack it consumes.
    const findings = (isEnemy && this.hasNode('findings')) ? (target._findings || 0) : 0;
    if (findings > 0) damage = Math.max(1, Math.floor(damage * (1 + 0.08 * findings)));

    if (isEnemy && abilityTag) {
      // Locks clear on a matching tag regardless of weakness.
      lockCleared = this._clearLocks(target, abilityTag);
      // Composure only moves on a genuine weakness hit.
      if (effective === 'super') {
        const res = this._reduceComposure(target, COMBAT_DEPTH.COMPOSURE_PER_WEAKNESS_HIT);
        composureHit = res.amount;
        broke = res.broke;
      }
      if (this.hasNode('findings')) {
        // MATERIAL WEAKNESS (E2) lowers the close threshold 5 -> 4.
        const maxF = this.hasNode('material_weakness') ? 4 : 5;
        if (findings >= maxF) {
          // CLOSE THE FILE.
          target._findings = 0;
          damage = Math.max(1, Math.floor(damage * 1.5));
          const res = this._reduceComposure(target, 30);
          composureHit += res.amount;
          broke = broke || res.broke;
          if (this.hasNode('adverse_opinion')) {
            target.buffs.push({ stats: { def: -6 }, duration: 3, name: 'Adverse Opinion' });
          }
          // MATERIAL WEAKNESS (E2) again: the close IS a weakness hit, for
          // every purpose. Publishing `effective = 'super'` is the point — the
          // +10 Confidence, the Loop In arm, the taunt and the achievement all
          // come free off the shipped chain, and no second code path exists.
          // Verified safe downstream: `weakness_exploit` is a ONE-SHOT
          // achievement a level-10 player unlocked in Act 1, and
          // reviewPointsEarned() counts UNIQUE achievements, so the Review
          // Point supply cannot be inflated by this.
          if (this.hasNode('material_weakness') && effective !== 'super') effective = 'super';
        } else {
          // One Finding per action however many ways it qualified, plus any the
          // ability files itself (Management Letter, 2). A mode may resize the
          // ramp's clock (`Difficulty.auditRamp().fileRate`, shipped 1) — Hard
          // grants fewer turns, so the file grows faster there. rate 1 is
          // arithmetic-identical to the shipped line.
          const filed = ((effective !== 'super' || lockCleared > 0) ? 1 : 0)
            + (this._activeAbility?.filesFindings || 0);
          if (filed > 0) {
            const ramp = Difficulty.auditRamp();
            // The mode dial applies HERE and not in _fileFinding, on a measured
            // ruling: this site is exhibits (damage-carrying tagged hits), that
            // one is notes (Scope Expansion's debuff rider). Doubling the notes
            // too let Due Diligence race the file to a close no damaging hit
            // was there to cash — Meredith@8 audit fell 60.8 % -> 47.3 %.
            const add = filed * ramp.fileRate;
            target._findings = Math.min(maxF, findings + add);
            // The RECORD is monotonic: it never resets when the file closes.
            // Only `assaultSlow` modes read it (see enemyTurn).
            target._findingsEver = (target._findingsEver || 0) + add;
          }
        }
      }
    }

    // ── COMPLIANCE: SUBROGATION (E8) ──────────────────────────────────
    // Damage taken while bracing is banked; the next damaging action adds the
    // bank (capped at 2x Assertiveness) and costs the target 30 Composure
    // WHATEVER you hit them with — the lane's exclusive second issuer.
    if (isEnemy && this.hasNode('subrogation') && (this.player._subrogation || 0) > 0 && damage > 0) {
      const cap = Math.floor(this._getEffective(this.player).atk * 2);
      damage += Math.min(this.player._subrogation, cap);
      this.player._subrogation = 0;
      const res = this._reduceComposure(target, 30);
      composureHit += res.amount;
      broke = broke || res.broke;
    }

    if (isEnemy && wasVulnerable) {
      damage = Math.floor(damage * 1.5);
      target.vulnerable = 0;
      effective = effective || 'vulnerable';
    }

    // Performance Improvement Plan: applied last and only to Andrew, so it is
    // a clean scalar on whatever the rest of the pipeline produced. Floors at
    // 1 so a fully-vested PIP still cannot make Andrew immortal.
    if (this.pipResist > 0 && target && target.isPlayer) {
      damage = Math.max(1, Math.floor(damage * (1 - this.pipResist)));
    }

    // Roguelite mutator: Billable Hours — every hit you land on a litigious
    // client chips your Patience. Never lethal (floors at 1 HP).
    let thorns = 0;
    if (isEnemy && target.mutators?.some(m => m.id === 'thorns')) {
      thorns = 4;
      this.player.hp = Math.max(1, this.player.hp - thorns);
    }

    return { damage, critical, effective, thorns, composureHit, broke, lockCleared, wasBroken };
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

  // Confusion no longer steals the turn. Sandfall's first principle for
  // Expedition 33 was "no frustrating deaths" — a 50% coin-flip that replaces
  // the action you chose with a self-hit is exactly the failure mode they
  // named. Confusion now scrambles WHO you hit and dampens HOW HARD; the
  // action you picked always happens.
  // Returns { targetIndex, damageMult, scrambled, dampened }.
  _applyConfusion(actor, requestedTargetIndex) {
    if (!actor || !actor.confusedThisTurn) {
      return { targetIndex: requestedTargetIndex, damageMult: 1, scrambled: false, dampened: false };
    }
    const alive = this.aliveEnemies();
    let targetIndex = requestedTargetIndex;
    let scrambled = false;
    if (alive.length > 1 && Math.random() < COMBAT_DEPTH.CONFUSED_SCRAMBLE_CHANCE) {
      const intended = this.enemies[requestedTargetIndex] ?? this.enemy;
      const others = alive.filter(e => e !== intended);
      if (others.length > 0) {
        targetIndex = this.enemies.indexOf(others[Math.floor(Math.random() * others.length)]);
        scrambled = true;
      }
    }
    return { targetIndex, damageMult: COMBAT_DEPTH.CONFUSED_POWER_MULT, scrambled, dampened: true };
  }

  // Arm / disarm the Loop In baton pass. Called at the end of every offensive
  // Andrew action: a weakness hit with a living ally on the bench arms it,
  // anything else clears it.
  _noteLoopIn(effective) {
    // Matrixed Reporting (stretch goal): allies run on a rotation you do not
    // control, so the baton never comes back to you.
    if (this.hasStretch('matrixed')) { this.loopInReady = false; return; }
    if (this.player.loopInUsedThisTurn) { this.loopInReady = false; return; }
    const benchAlive = this.allies.some((a, i) => i > 0 && a.hp > 0);
    this.loopInReady = effective === 'super' && benchAlive && !this.isOver;
  }

  // Ally indices eligible to receive a Loop In right now.
  getLoopInCandidates() {
    if (!this.loopInReady) return [];
    const out = [];
    for (let i = 1; i < this.allies.length; i++) if (this.allies[i].hp > 0) out.push(i);
    return out;
  }

  _enemyHasDebuff(enemy) {
    return (enemy.buffs || []).some(b => Object.values(b.stats).some(v => v < 0));
  }

  _gainMomentum(amount) {
    this.player.momentum = Math.min(100, this.player.momentum + amount);
  }

  // ── E10 — AGGRAVATING FACTORS ─────────────────────────────────────────
  // The Litigation keystone. A weakness hit banks +10 Confidence on top of the
  // shipped +10 super bonus (so 20 -> 30 with the base 10), which is what
  // makes the lane's turn economy an ISSUER rather than a discount.
  _weaknessMomentumBonus(effective) {
    return (effective === 'super' && this.hasNode('aggravating_factors')) ? 10 : 0;
  }

  // ── Player (Andrew) actions ───────────────────────────────────────────
  playerAttack(targetIndex) {
    const conf = this._applyConfusion(this.player, targetIndex);
    const target = this._resolveTarget(conf.targetIndex);
    if (!target) return null;
    // Sampled BEFORE the hit: the turn-back must never arm off a target that
    // was already Broken when the swing started.
    const preBroken = !!(target.brokenBonus > 0 || target.broken > 0);

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
    if (conf.dampened) finalDamage = Math.max(1, Math.floor(finalDamage * conf.damageMult));
    target.hp = Math.max(0, target.hp - finalDamage);

    const momentumGain = 10 + (dmg.critical ? 10 : 0) + (dmg.effective === 'super' ? 10 : 0)
      + (combo ? 5 : 0) + this._weaknessMomentumBonus(dmg.effective);
    this._gainMomentum(momentumGain);

    this.log.push({ type: 'attack', damage: finalDamage, critical: dmg.critical });
    this._checkVictory();
    this._noteLoopIn(dmg.effective);
    const out = {
      ...dmg, type: 'attack', damage: finalDamage, combo, momentumGain,
      targetIndex: this.targetEnemyIndex,
      confusedScramble: conf.scrambled, confusedDampened: conf.dampened,
      locksCleared: dmg.lockCleared, brokeComposure: dmg.broke,
    };
    this._armTurnBack(out, preBroken);
    return out;
  }

  /**
   * @param {object} opts  `opts.tag` supplies the practice area for a
   *   `tagChoice` ability (Escalate). The HUD picks it; the engine only has to
   *   accept it, which is what makes the tag layer a question of what you can
   *   AFFORD rather than what you happen to own.
   */
  playerAbility(abilityId, targetIndex, opts = {}) {
    const ability = PLAYER_ABILITIES[abilityId];
    if (!ability || this.player.mp < ability.cost) return null;
    // A PASSIVE IS NOT CASTABLE. Practice Group passives are ordinary
    // PLAYER_ABILITIES rows so they cost zero new persistence — but the engine
    // READS them (this.nodes), it never executes them, and nothing upstream
    // should be able to spend a turn on one.
    if (ability.type === 'passive') return null;
    // E11 — ESCALATE. Priced in Confidence, not Coffee, so it competes
    // directly with Assert Dominance (100), Second Wind (50) and Press
    // Advantage (15-30) for the same bar.
    if (ability.momentumCost) {
      if (this.player.momentum < ability.momentumCost) return null;
      this.player.momentum -= ability.momentumCost;
    }
    this.player.mp -= ability.cost;
    // Read back in _calcDamage for `filesFindings`; cleared in the finally.
    this._activeAbility = ability;
    try {
      return this._playerAbilityInner(ability, abilityId, targetIndex, opts);
    } finally {
      this._activeAbility = null;
    }
  }

  _playerAbilityInner(ability, abilityId, targetIndex, opts = {}) {
    // E11: a tagChoice ability carries whatever practice area the caller
    // picked. Falls back to the ability's own tag, so a caller that supplies
    // nothing is never left untagged by accident.
    const chosenTag = ability.tagChoice ? (opts.tag || ability.tag || 'legal') : ability.tag;

    const conf = this._applyConfusion(this.player, targetIndex);
    targetIndex = conf.targetIndex;
    const preTarget = this.enemies[targetIndex ?? this.targetEnemyIndex];
    const preBroken = !!(preTarget && (preTarget.brokenBonus > 0 || preTarget.broken > 0));

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
        const dmg = this._calcDamage(pStats.atk, ability.power, eStats.def, target, chosenTag);
        const combo = this._enemyHasDebuff(target);
        let finalDamage = dmg.damage;
        if (combo) finalDamage = Math.floor(finalDamage * 1.25);
        if (conf.dampened) finalDamage = Math.max(1, Math.floor(finalDamage * conf.damageMult));
        // C3 — NOTICE OF DEFICIENCY: +60% if Andrew braced on his PREVIOUS
        // turn. `_bracedLastTurn` is stamped in processTurnStart, so this
        // reads the turn before, not the frame before.
        if (ability.counterpunch && this.player._bracedLastTurn) {
          finalDamage = Math.floor(finalDamage * (1 + ability.counterpunch));
        }
        target.hp = Math.max(0, target.hp - finalDamage);
        const momentumGain = 10 + (dmg.critical ? 10 : 0) + (dmg.effective === 'super' ? 10 : 0)
          + (combo ? 5 : 0) + this._weaknessMomentumBonus(dmg.effective);
        this._gainMomentum(momentumGain);
        result = {
          ...result, damage: finalDamage, critical: dmg.critical, effective: dmg.effective, combo, momentumGain,
          targetIndex: this.targetEnemyIndex,
          locksCleared: dmg.lockCleared, brokeComposure: dmg.broke,
        };
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
        let locksClearedTotal = 0;
        let brokeAny = false;
        for (const t of targets) {
          const eStats = this._getEffective(t);
          const dmg = this._calcDamage(pStats.atk, ability.power, eStats.def, t, chosenTag);
          const combo = this._enemyHasDebuff(t);
          let finalDamage = dmg.damage;
          if (combo) finalDamage = Math.floor(finalDamage * 1.25);
          if (conf.dampened) finalDamage = Math.max(1, Math.floor(finalDamage * conf.damageMult));
          t.hp = Math.max(0, t.hp - finalDamage);
          if (ability.stripBuffs) t.buffs = [];
          hits.push({ targetIndex: this.enemies.indexOf(t), damage: finalDamage, critical: dmg.critical, effective: dmg.effective, combo, brokeComposure: dmg.broke });
          comboAny = comboAny || combo;
          critAny = critAny || dmg.critical;
          superAny = superAny || dmg.effective === 'super';
          locksClearedTotal += dmg.lockCleared;
          brokeAny = brokeAny || dmg.broke;
        }
        const momentumGain = 10 + (critAny ? 10 : 0) + (superAny ? 10 : 0) + (comboAny ? 5 : 0)
          + Math.min(10, (targets.length - 1) * 5) + this._weaknessMomentumBonus(superAny ? 'super' : null);
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
          locksCleared: locksClearedTotal,
          brokeComposure: brokeAny,
        };
        break;
      }
      case 'heal': {
        // healPerLevel: heals grow with the player so a flat ceiling
        // can't make sustained-damage enemies unwinnable (sim finding)
        let healAmt = ability.healAmount + (ability.healPerLevel || 0) * (this.player.level || 1);
        if (conf.dampened) healAmt = Math.max(1, Math.floor(healAmt * conf.damageMult));
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
        // E4 — SCOPE EXPANSION: while we're in here. One turn longer.
        const dur = ability.debuffDuration + (this.hasNode('scope_expansion') ? 1 : 0);
        target.buffs.push({
          stats: ability.debuffAmount,
          duration: dur,
          name: ability.name,
        });
        // Tagged debuffs are still tagged hits: they clear a Lock. They do not
        // move Composure — that stays weakness-damage-only (HSR rule).
        const cleared = this._clearLocks(target, chosenTag);
        // E4 — and a tagged debuff files a Finding, or closes the file.
        if (this.hasNode('scope_expansion') && this.hasNode('findings') && chosenTag) {
          this._fileFinding(target);
        }
        result = { ...result, debuffAmount: ability.debuffAmount, duration: dur, targetIndex: this.targetEnemyIndex, locksCleared: cleared };
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
    this._noteLoopIn(result.effective);
    if (conf.scrambled) result.confusedScramble = true;
    if (conf.dampened) result.confusedDampened = true;
    this._armTurnBack(result, preBroken);
    return result;
  }

  /** File one Finding on a target, or close the file if it is already full. */
  _fileFinding(target) {
    if (!target || target.hp <= 0) return;
    const maxF = this.hasNode('material_weakness') ? 4 : 5;
    const stacks = target._findings || 0;
    if (stacks >= maxF) {
      target._findings = 0;
      this._reduceComposure(target, 30);
      if (this.hasNode('adverse_opinion')) {
        target.buffs.push({ stats: { def: -6 }, duration: 3, name: 'Adverse Opinion' });
      }
    } else {
      // NO mode dial here, on purpose: this is the notes path (Scope
      // Expansion's debuff rider), and the Hard accommodation doubles
      // exhibits only — see the _calcDamage filing site for the measurement.
      target._findings = Math.min(maxF, stacks + 1);
      target._findingsEver = (target._findingsEver || 0) + 1;
    }
  }

  /** Public read for the HUD: how full the file is on a given enemy.
   *  `count`/`max` are the STANDING file (empties on a close); `ever` is the
   *  monotonic record (`_findingsEver` — a close never resets it, and on Hard
   *  it arrives seeded); `slowPct` is the documentation shield actually
   *  applied to this enemy's outgoing ATK — the SAME arithmetic as the
   *  enemyTurn site (`assaultSlow × min(5, ever)`, capped 0.5), so the HUD
   *  prints what the engine does rather than a re-derivation that can drift.
   *  0 on every mode without an `audit` block, i.e. everything but Hard.
   *  Null for any build without the `findings` node — the chip's gate. */
  getFindings(enemyIndex = this.targetEnemyIndex) {
    if (!this.hasNode('findings')) return null;
    const t = this.enemies[enemyIndex];
    if (!t || t.hp <= 0) return null;
    const ever = t._findingsEver || 0;
    const slow = Difficulty.auditRamp().assaultSlow;
    return {
      count: t._findings || 0,
      max: this.hasNode('material_weakness') ? 4 : 5,
      ever,
      slowPct: (slow > 0 && ever > 0) ? Math.min(0.5, slow * Math.min(5, ever)) : 0,
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // OBJECTION SUSTAINED — the One More, one mechanism in two grades
  // ══════════════════════════════════════════════════════════════════
  // When Andrew's action lands `effective === 'super'`, control returns to him
  // for one additional action in the same turn slot.
  //
  //   'sustain'  UNIVERSAL, free. The returned action MAY NOT DEAL DAMAGE:
  //              Brace, items, self-buffs and heals only. No basic attack, no
  //              attack/attack_aoe, no Press Advantage, no Assert Dominance,
  //              no Retaliate, no Desperate Gamble, no Second Wind, no debuff,
  //              no stall, no special.
  //   'attack'   MOTION FOR SUMMARY JUDGMENT, the Litigation capstone. Once
  //              per engagement, THAT SAME RETURN may be a BASIC ATTACK
  //              instead. Not a second proc, not a second prompt, not a second
  //              code path — an UPGRADE of the return that was already coming.
  //
  // WHY UPGRADE AND NOT ADDITION, measured: adding them drops Litigation to
  // 66.8-89.8 % of baseline effective enemy turns, below the documented bar on
  // four of five cells. Upgrading holds 67.6-93.6 % — the NUMBER of returned
  // turns is unchanged and only their QUALITY moves.
  //
  // AND THE RETURNED-TURN LAW: letting the return spend the MOMENTUM VERBS
  // (Assert Dominance, Retaliate) instead of a basic attack costs 62-74 % of
  // baseline effective enemy turns. A returned turn carrying a 75-power
  // DEF-ignoring hit is worth about a quarter of a boss. The returned turn is
  // a BASIC ATTACK. Not "any untagged action".
  //
  // THE CHAIN IS 1 BY CONSTRUCTION in both grades: the returned action is
  // either non-damaging or untagged, so it can never publish `super` and can
  // never re-arm. `_inTurnBack` is belt and braces on top of that.
  _armTurnBack(result, preBroken) {
    if (!result || this._inTurnBack || this.isOver) return;
    if (this.player.turnBackUsedThisTurn) return;              // once per Andrew turn
    const sup = result.effective === 'super'
      || (result.hits || []).some(h => h.effective === 'super');
    if (!sup) return;
    // Never off the hit that BROKE the bar — the Break already bought a turn.
    if (result.brokeComposure || result.broke
      || (result.hits || []).some(h => h.brokeComposure)) return;
    // Never off a hit on an ALREADY-broken target (P5R's no-re-down rule).
    if (preBroken) return;
    this.player.turnBackUsedThisTurn = true;
    // CROWD SUPPRESSION: no Summary Judgment while more than one enemy is
    // alive. Measured, the trio cell reads 67.6 % of baseline effective enemy
    // turns because one extra player action against a three-body queue
    // accelerates the kill rather than denying a telegraph. Thematically free:
    // you cannot move for summary judgment against three parties at once.
    const solo = this.aliveEnemies().length <= 1;
    const upgrade = this.hasNode('motion_summary_judgment') && !this._msjSpent && solo;
    if (upgrade) this._msjSpent = true;
    this.turnBackReady = upgrade ? 'attack' : 'sustain';
    result.turnBack = this.turnBackReady;
  }

  /** True if `abilityId` is legal on the current returned turn. */
  turnBackAllows(abilityId) {
    if (this.turnBackReady !== 'sustain') return true;
    const a = PLAYER_ABILITIES[abilityId];
    if (!a) return false;
    return a.type === 'heal' || a.type === 'buff';
  }

  /** Consume the arm and run `fn` as the returned action. */
  runTurnBack(fn) {
    if (!this.turnBackReady) return null;
    this.turnBackReady = null;
    this._inTurnBack = true;
    try { return fn(); } finally { this._inTurnBack = false; }
  }

  playerItem(itemId) {
    const item = ITEMS[itemId];
    if (!item) return null;

    const conf = this._applyConfusion(this.player, this.targetEnemyIndex);
    const dampen = (n) => conf.dampened ? Math.max(1, Math.floor(n * conf.damageMult)) : n;

    let result = { type: 'item', itemName: item.name, confusedDampened: conf.dampened };
    switch (item.type) {
      case 'restore_hp':
        this.player.hp = Math.min(this.player.maxHP, this.player.hp + dampen(item.amount));
        result.healAmount = dampen(item.amount);
        result.healType = 'hp';
        break;
      case 'restore_mp':
        this.player.mp = Math.min(this.player.maxMP, this.player.mp + dampen(item.amount));
        result.healAmount = dampen(item.amount);
        result.healType = 'mp';
        break;
      case 'restore_mp_buff':
        this.player.mp = Math.min(this.player.maxMP, this.player.mp + dampen(item.amount));
        if (item.buff) {
          this.player.buffs.push({ stats: item.buff, duration: item.duration, name: item.name });
        }
        result.healAmount = dampen(item.amount);
        result.healType = 'mp';
        break;
      case 'buff':
        this.player.buffs.push({ stats: item.buff, duration: item.duration, name: item.name });
        result.buffAmount = item.buff;
        break;
      // Due Diligence Memo — the lock-reveal. Weakness/resistance are real
      // mechanical depth that most players never perceive (a 1.5× multiplier
      // inside _calcDamage produces no distinct feedback), and the lock chips
      // on a telegraphed heavy move are the read the whole turn hangs on.
      // This item just says it out loud.
      case 'reveal':
        result.revealText = this._buildRevealText(this.enemies[this.targetEnemyIndex] || this.enemy);
        break;
    }
    return result;
  }

  /** One line naming a target's weakness, resistance and telegraphed locks. */
  _buildRevealText(target) {
    if (!target) return 'The file is empty.';
    const up = (s) => String(s).toUpperCase();
    const parts = [];
    parts.push(target.weakness ? `weak ${up(target.weakness)}` : 'no exploitable weakness');
    if (target.resistance) parts.push(`resists ${up(target.resistance)}`);
    const abilityId = target.telegraphedAbility;
    const ability = abilityId ? ENEMY_ABILITIES[abilityId] : null;
    if (ability) {
      const locks = (target.locks || []).filter(l => !l.cleared).map(l => up(l.tag));
      parts.push(locks.length
        ? `next: ${ability.name} [${locks.join(' / ')}]`
        : `next: ${ability.name}`);
    }
    if (target.maxComposure) parts.push(`composure ${target.composure}/${target.maxComposure}`);
    return `FIDUCIARY DISCLOSURE: ${target.name} — ${parts.join(', ')}.`;
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

    const conf = this._applyConfusion(ally, this.targetEnemyIndex);
    // `_allyDamageMult` is 1 normally and LOOP_IN_DAMAGE_BONUS during a baton pass.
    const allyMult = this._allyDamageMult * (conf.dampened ? conf.damageMult : 1);
    const scaleDmg = (n) => Math.max(1, Math.floor(n * allyMult));

    const abilityId = this._pickAllyAbility(ally);
    const ability = ALLY_ABILITIES[abilityId];
    if (!ability || (ability.cost && ally.mp < ability.cost)) {
      // Default / fallback basic attack
      const target = this._resolveTarget(conf.scrambled ? conf.targetIndex : undefined);
      if (!target) return null;
      const aStats = this._getEffective(ally);
      const eStats = this._getEffective(target);
      const dmg = this._calcDamage(aStats.atk, 0, eStats.def, target, null);
      const finalDamage = scaleDmg(dmg.damage);
      target.hp = Math.max(0, target.hp - finalDamage);
      this._checkVictory();
      return {
        type: 'ally_attack', allyIndex, allyName: ally.name, abilityName: 'Strike',
        damage: finalDamage, critical: dmg.critical, targetIndex: this.targetEnemyIndex,
        confusedScramble: conf.scrambled, confusedDampened: conf.dampened,
      };
    }
    if (ability.cost) ally.mp = Math.max(0, ally.mp - ability.cost);

    const aStats = this._getEffective(ally);
    let result = { type: 'ally_' + ability.type, allyIndex, allyName: ally.name, abilityName: ability.name, message: pickMessage(ability.messages || ability.message) };

    switch (ability.type) {
      case 'attack': {
        const target = conf.scrambled
          ? (this.enemies[conf.targetIndex] || this._pickAllyAttackTarget(ally))
          : this._pickAllyAttackTarget(ally);
        if (!target) return null;
        const eStats = this._getEffective(target);
        const dmg = this._calcDamage(aStats.atk, ability.power || 10, eStats.def, target, ability.tag);
        const finalDamage = scaleDmg(dmg.damage);
        target.hp = Math.max(0, target.hp - finalDamage);
        result = {
          ...result, damage: finalDamage, critical: dmg.critical, effective: dmg.effective,
          targetIndex: this.enemies.indexOf(target),
          locksCleared: dmg.lockCleared, brokeComposure: dmg.broke,
        };
        break;
      }
      case 'attack_aoe': {
        const targets = this.aliveEnemies();
        if (targets.length === 0) return null;
        const hits = [];
        let locksClearedTotal = 0;
        let brokeAny = false;
        for (const t of targets) {
          const eStats = this._getEffective(t);
          const dmg = this._calcDamage(aStats.atk, ability.power || 10, eStats.def, t, ability.tag);
          const finalDamage = scaleDmg(dmg.damage);
          t.hp = Math.max(0, t.hp - finalDamage);
          hits.push({ targetIndex: this.enemies.indexOf(t), damage: finalDamage, critical: dmg.critical, effective: dmg.effective, brokeComposure: dmg.broke });
          locksClearedTotal += dmg.lockCleared;
          brokeAny = brokeAny || dmg.broke;
        }
        result = { ...result, aoe: true, hits, damage: hits.reduce((s, h) => s + h.damage, 0), locksCleared: locksClearedTotal, brokeComposure: brokeAny };
        break;
      }
      case 'heal_ally': {
        // Pick the most-wounded ally (excluding fully-healthy)
        const candidates = this.aliveAllies().slice().sort((a, b) => (a.hp / a.maxHP) - (b.hp / b.maxHP));
        const tgt = candidates[0] || ally;
        const heal = ability.healAmount || 0;
        if (heal > 0) tgt.hp = Math.min(tgt.maxHP, tgt.hp + heal);
        if (ability.mpHealAmount) {
          for (const a of this.aliveAllies()) {
            a.mp = Math.min(a.maxMP, a.mp + ability.mpHealAmount);
          }
        }
        result = {
          ...result,
          healAmount: heal,
          mpHealAmount: ability.mpHealAmount || 0,
          healTargetAllyIndex: this.allies.indexOf(tgt),
          healTargetName: tgt.name,
        };
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
        const cleared = this._clearLocks(target, ability.tag);
        result = { ...result, debuffAmount: ability.debuffAmount, duration: ability.debuffDuration || 2, targetIndex: this.enemies.indexOf(target), locksCleared: cleared };
        break;
      }
      case 'silence': {
        const target = this._pickAllyAttackTarget(ally);
        if (!target) return null;
        // Bosses (phased enemies) shake silence off after one turn —
        // sim-validated: full recastable silence made the final bosses'
        // difficulty depend on party comp (100% vs 22% identical stats)
        const dur = target.phases ? 1 : (ability.duration || 2);
        target.silenced = Math.max(target.silenced || 0, dur);
        const cleared = this._clearLocks(target, ability.tag);
        result = { ...result, duration: dur, targetIndex: this.enemies.indexOf(target), locksCleared: cleared };
        break;
      }
    }

    this._checkVictory();
    if (conf.scrambled) result.confusedScramble = true;
    if (conf.dampened) result.confusedDampened = true;
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

    if (enemy.silencedThisTurn) {
      enemy.telegraphedAbility = null;
      this._resetLocks(enemy);
      const sealing = this._noteDenial(enemy);
      this.turnCount++;
      return { type: 'silenced', message: `${enemy.name} is force-quit and loses the turn.`, enemyIndex, sealing };
    }

    // COMPOSURE BREAK — the bar hit zero. The enemy loses this turn and its
    // Composure refills. The +20% window (brokenBonus) outlives the recovery
    // by design; it expires at the start of the player turn after next.
    if (enemy.broken > 0) {
      enemy.broken--;
      enemy.telegraphedAbility = null;
      this._resetLocks(enemy);
      enemy.composure = enemy.maxComposure;
      const sealing = this._noteDenial(enemy);
      this.turnCount++;
      return {
        type: 'broken',
        message: `${enemy.name} has lost their composure. The turn goes with it.`,
        enemyIndex, sealing,
      };
    }

    // blockNext consumes only the FIRST enemy turn that comes after it
    if (this.player.blockNext) {
      this.player.blockNext = false;
      enemy.telegraphedAbility = null;
      this._resetLocks(enemy);
      const sealing = this._noteDenial(enemy);
      this.turnCount++;
      return { type: 'blocked', message: `Blocked! ${enemy.name}'s action was nullified!`, enemyIndex, sealing };
    }

    const abilityId = enemy.telegraphedAbility ?? this._pickEnemyAbility(enemy);
    enemy.telegraphedAbility = null;
    const previousAbilityId = enemy.lastAbility;

    // ── Resolve LOCKS on the telegraphed move ───────────────────────────
    const locks = (enemy.lockAbilityId === abilityId && Array.isArray(enemy.locks)) ? enemy.locks : [];
    const locksTotal = locks.length;
    const locksClear = locks.filter(l => l.cleared).length;
    this._resetLocks(enemy);
    if (locksTotal > 0 && locksClear >= locksTotal) {
      // FULL CLEAR — the move fizzles and the enemy's turn is consumed.
      enemy.lastAbility = abilityId;
      const sealing = this._noteDenial(enemy);
      this.turnCount++;
      return {
        type: 'fizzle',
        abilityName: ENEMY_ABILITIES[abilityId]?.name || 'that',
        message: `${enemy.name} reaches for it and finds nothing there.`,
        enemyIndex, enemyName: enemy.name, locksTotal, locksCleared: locksClear, sealing,
      };
    }
    // The enemy is about to act, so nothing is owed to it: the seal it may
    // have been holding is spent and the streak starts over.
    const wasSealed = !!enemy.sealed;
    this._clearDenial(enemy);
    // A sealed move could never have its locks cleared, so the partial-clear
    // ladder below cannot apply to it. Instead it lands with the denial
    // premium: this is the one place the enemy is paid back for the turns it
    // was denied. See COMBAT_DEPTH.SEALED_DAMAGE_BONUS.
    const lockMult = wasSealed
      ? (COMBAT_DEPTH.SEALED_DAMAGE_BONUS ?? 1)
      : (locksTotal > 0
        ? Math.max(COMBAT_DEPTH.LOCK_MIN_MULTIPLIER, 1 - COMBAT_DEPTH.LOCK_PARTIAL_REDUCTION * locksClear)
        : 1);

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
    // THE PAPER TRAIL SLOWS THE ASSAULT (`Difficulty.auditRamp().assaultSlow`,
    // shipped 0). Each Finding EVER FILED on THIS enemy — `_findingsEver`, the
    // monotonic record, capped at five — shaves its outgoing ATK: a documented
    // opponent swings with a lawyer watching, and the record does not unhappen
    // when the file closes. Keying the shield on the record rather than the
    // standing stacks is a measured call twice over: standing stacks empty on
    // every close, so the shield vanished exactly when the lane cashed its
    // payoff (transient arm: trio@7 51.0 % vs base 46.8 %); and a monotonic
    // counter deletes the hold-the-file line outright, because refusing to
    // close earns nothing the honest loop does not. Only the Audit lane can
    // file on anyone, so the guard is intrinsic; `_getEffective` returns a
    // copy, so this never touches the enemy's real stats.
    const _slow = Difficulty.auditRamp().assaultSlow;
    const _ever = Math.min(5, enemy._findingsEver || 0);
    if (_slow > 0 && _ever > 0) {
      eStats.atk = Math.max(1, Math.round(eStats.atk * (1 - Math.min(0.5, _slow * _ever))));
    }
    const tStats = this._getEffective(target);
    const result = this._executeEnemyAbility(enemy, abilityId, eStats, tStats, previousAbilityId, target, lockMult);

    if (abilityId && ENEMY_ABILITIES[abilityId]?.type !== 'repeat') {
      enemy.lastAbility = abilityId;
    }

    this.turnCount++;
    this._checkDefeat();
    return result ? {
      ...result, enemyIndex, enemyName: enemy.name, targetAllyIndex, targetAllyName: target.name,
      locksTotal, locksCleared: locksClear,
      lockPartial: locksTotal > 0 && locksClear > 0,
      wasSealed,
    } : null;
  }

  _resetLocks(enemy) {
    enemy.locks = [];
    enemy.lockAbilityId = null;
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

  // Pre-roll telegraphed abilities for ALL alive enemies — call at start of player phase.
  // A telegraph is a PROMISE, not a preview: once rolled it is not re-rolled
  // until the enemy consumes it. Re-rolling would throw away Locks the player
  // has already paid tagged hits to clear.
  telegraph() {
    // The Pivot resolves BEFORE the roll is published, so the telegraph hint,
    // the Objections row and the Composure label all read the same weakness.
    this.syncAllPhaseTraits();
    for (const e of this.enemies) {
      if (e.hp <= 0) {
        e.telegraphedAbility = null;
        this._resetLocks(e);
        continue;
      }
      if (!e.telegraphedAbility) e.telegraphedAbility = this._pickEnemyAbility(e);
      if (e.lockAbilityId !== e.telegraphedAbility) {
        e.locks = this._buildLocks(e, e.telegraphedAbility);
        e.lockAbilityId = e.telegraphedAbility;
      }
    }
    return this.enemies.map(e => e.telegraphedAbility);
  }

  // Per-target enemy-ability execution.
  // `target` is the ally being acted on (defaults to Andrew). pStats == effective stats of target.
  // Bracing/retaliateReady only applies when target IS Andrew (it's a player-input mechanic).
  _executeEnemyAbility(enemy, abilityId, eStats, pStats, previousAbilityId = null, target = this.player, lockMult = 1) {
    const ability = ENEMY_ABILITIES[abilityId];
    // Partially-cleared Locks shave the incoming hit down proportionally.
    const shave = (n) => Math.max(1, Math.floor(n * lockMult));
    if (!ability) {
      const dmg = this._calcDamage(eStats.atk, 10, pStats.def, target);
      const finalDamage = shave(dmg.damage);
      target.hp = Math.max(0, target.hp - finalDamage);
      return { type: 'attack', damage: finalDamage, critical: dmg.critical, message: `${enemy.name} attacks ${target.isPlayer ? 'you' : target.name}!` };
    }

    let result = { type: ability.type, abilityName: ability.name, message: pickMessage(ability.messages || ability.message) };

    switch (ability.type) {
      case 'attack': {
        const dmg = this._calcDamage(eStats.atk, ability.power, pStats.def, target);
        let finalDamage = shave(dmg.damage);
        let braced = false;
        if (target.isPlayer && this.player.bracing) {
          const preHalve = finalDamage;
          finalDamage = Math.floor(finalDamage * 0.5);
          // E6 — STANDARD OF CARE: a FURTHER 25 % off the braced hit.
          if (this.hasNode('standard_of_care')) finalDamage = Math.max(1, Math.floor(finalDamage * 0.75));
          this.player.bracing = false;
          braced = true;
          this.player.retaliateReady = true;
          this._afterBracedHit(enemy, preHalve, finalDamage, result);
        }
        target.hp = Math.max(0, target.hp - finalDamage);
        result.damage = finalDamage;
        result.critical = dmg.critical;
        result.braced = braced;
        break;
      }
      case 'dot': {
        target.dots.push({
          damage: shave(ability.power),
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
      case 'buff': {
        enemy.buffs.push({
          stats: ability.buff,
          duration: ability.duration || 1,
          name: ability.name,
        });
        result.buffAmount = ability.buff;
        result.duration = ability.duration || 1;
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
          const repeated = this._executeEnemyAbility(enemy, previousAbilityId, eStats, pStats, previousAbilityId, target, lockMult);
          if (repeated) {
            repeated.message = `${pickMessage(ability.messages || ability.message)} ${repeated.message}`.trim();
            return repeated;
          }
        }
        const dmg = this._calcDamage(eStats.atk, 15, pStats.def, target);
        const finalDamage = shave(dmg.damage);
        target.hp = Math.max(0, target.hp - finalDamage);
        result.damage = finalDamage;
        result.message = `${pickMessage(ability.messages || ability.message)} It devolves into a louder basic attack.`;
        break;
      }
      case 'summon': {
        const dmg = this._calcDamage(eStats.atk, ability.power || 8, pStats.def, target);
        let finalDamage = shave(dmg.damage);
        let braced = false;
        if (target.isPlayer && this.player.bracing) {
          const preHalve = finalDamage;
          finalDamage = Math.floor(finalDamage * 0.5);
          if (this.hasNode('standard_of_care')) finalDamage = Math.max(1, Math.floor(finalDamage * 0.75));
          this.player.bracing = false;
          braced = true;
          this._afterBracedHit(enemy, preHalve, finalDamage, result);
        }
        target.hp = Math.max(0, target.hp - finalDamage);
        result.damage = finalDamage;
        result.braced = braced;
        break;
      }
    }
    return result;
  }

  // ── E7 + E8 — the two nodes that fire on the frame a Brace CONNECTS ────
  // `braced` is set in exactly two places in this file (the attack branch and
  // the summon branch) and nowhere else — verified. Both call this.
  //
  // RESERVATION OF RIGHTS is the only damage in the game that scales off the
  // OPPONENT: it is computed from the PRE-HALVE hit, which is a function of
  // their Assertiveness, not yours. Accepted under protest. Every word of this
  // is coming back.
  _afterBracedHit(enemy, preHalve, dealt, result) {
    if (this.hasNode('subrogation')) {
      this.player._subrogation = (this.player._subrogation || 0) + dealt;
    }
    if (this.hasNode('reservation_of_rights') && enemy && enemy.hp > 0 && preHalve > 0) {
      const q = this.player._braceQuality === 'perfect' ? 0.60 : 0.35;
      const back = Math.max(1, Math.floor(preHalve * q));
      enemy.hp = Math.max(0, enemy.hp - back);
      result.reservation = back;
      this._checkVictory();
    }
  }

  // ── THE AGGRESSION FLOOR (`preferAttack`) ─────────────────────────────
  // An authorable per-enemy chance that a turn which would otherwise have been
  // chosen UNIFORMLY AT RANDOM out of the active phase's list is spent on a
  // damaging move instead. It is INERT unless `ENEMY_AI_PATTERNS[id]` sets a
  // `preferAttack` value: with no row, every branch below falls through to
  // exactly the pick it made before, so authoring nothing is bit-identical to
  // the shipped build.
  //
  // It exists because the balance diagnosis found the difficulty leaking out
  // of the enemy's TURN QUALITY, not its damage numbers. Measured on the
  // shipped build (`node tools/_l-balance.mjs --diag`), of the enemy turns that
  // survived Objections and Composure, the share that dealt ZERO damage was
  // 73.8% for Grandma, 50.7% for Meredith, 49.7% for the Algorithm and 49.6%
  // for the trio — their phase lists are mostly heals, buffs, debuffs and
  // stuns, and the picker draws from them flat. The `aggressive` pattern has
  // had exactly this dial since it shipped (`preferAttack: 0.7`, which is why
  // Chad reads 5.6% quiet); this generalises the same dial to the other four
  // patterns rather than inventing a mechanic.
  //
  // `strategic` is the one that is also a BUG FIX. Its rotation lists were
  // authored against an enemy's BASE `abilities` array, and the phase system
  // then replaced that array per HP band — so `abilities.includes(pick)` is
  // false for most of the fight (Meredith's phase-1 list has no
  // `strategic_pivot`; the Director's phase-0 and phase-2 lists have no
  // `market_correction` / `quarterly_target`) and the rotation silently
  // degrades to a uniform random draw. That fallback is what this dial catches.
  //
  // TWO FIELDS, AND THE DIFFERENCE IS THE WHOLE POINT.
  //   `preferAttack`        — unconditional. What `aggressive` has always had.
  //   `escalateAfterDenial` — fires ONLY on a pick made while the enemy is
  //                           owed a turn: `denialStreak > 0` (its last move
  //                           fizzled, or it was Broken, stunned or blocked)
  //                           or `sealed` (the Denial Tax is about to pay it
  //                           back). This is THE ESCALATION RESPONSE.
  //
  // The gate is not decoration, it is the entire safety argument. Measured
  // (`node tools/_l-balance.mjs --diag`), the CASUAL policy denies **0.0%** of
  // enemy turns on every solo rung — it lands no tagged hit, so it clears no
  // Objection, and it never Braces or Breaks — so a `escalateAfterDenial` row
  // is unreachable for the player the Performance Improvement Plan exists for.
  // An UNGATED `preferAttack` is not: authored at 0.55 on Grandma it cost the
  // casual floor **31.6 pp** at grandma@8 / PIP 20%. The fiction is the same
  // one the Denial Tax already ships ("Escalated to Committee"): the move you
  // objected away comes back as the thing there is no objection to.
  //
  // Called from `_pickEnemyAbility`, which runs inside `telegraph()` on the
  // PLAYER'S turn — i.e. after the denial has been recorded and before
  // `_clearDenial` runs, which happens only when the enemy actually acts.
  _damagingPick(abilities, chance) {
    if (!chance || Math.random() >= chance) return null;
    const atks = abilities.filter((id) => {
      const a = ENEMY_ABILITIES[id];
      return a && (a.type === 'attack' || a.type === 'dot' || a.type === 'summon');
    });
    if (atks.length === 0) return null;
    return atks[Math.floor(Math.random() * atks.length)];
  }

  /** Unconditional `preferAttack`. Called from inside each pattern branch, in
   *  the position that branch would otherwise have drawn uniformly at random. */
  _attackFallback(abilities, pattern) {
    return pattern ? this._damagingPick(abilities, pattern.preferAttack) : null;
  }

  /** THE ESCALATION RESPONSE. Checked BEFORE the pattern, not inside it.
   *
   *  Ordering is the whole mechanic. The first version of this sat where the
   *  pattern would otherwise have rolled at random — i.e. AFTER `tactical`'s
   *  heal branch and AFTER its `debuffChance` branch, both of which return
   *  early. Measured on Grandma, only 50.0 per cent of the picks she made while
   *  owed a turn ever reached it, so an 0.85 dial delivered about 0.42 and the
   *  ladder barely moved. It also read wrong: a boss whose move you just
   *  objected away should not answer by baking cookies.
   *
   *  It outranks the pattern for every enemy, which is why it lives here and
   *  not in five branches. Everything downstream is unchanged. */
  _escalationPick(abilities, pattern, enemy) {
    if (!pattern || !pattern.escalateAfterDenial) return null;
    const owed = !!(enemy && ((enemy.denialStreak || 0) > 0 || enemy.sealed));
    if (!owed) return null;
    return this._damagingPick(abilities, pattern.escalateAfterDenial);
  }

  _pickEnemyAbility(enemy) {
    // The Pivot resolves before the move is chosen, so the phase message, the
    // telegraph and the HUD's `COMPOSURE — X ONLY` all agree on the same frame.
    this._syncPhaseTraits(enemy);
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

    const pattern = Difficulty.aiFor(enemy.enemyId, ENEMY_AI_PATTERNS[enemy.enemyId]);
    // THE ESCALATION RESPONSE outranks the pattern entirely — see
    // `_escalationPick` for why the ordering is the mechanic and not a detail.
    const escalated = this._escalationPick(abilities, pattern, enemy);
    if (escalated) return escalated;
    if (!pattern) return this._pickRandom(abilities, true, enemy);

    switch (pattern.pattern) {
      case 'random':
        return this._attackFallback(abilities, pattern) || this._pickRandom(abilities, true, enemy);

      case 'escalating': {
        const seq = pattern.sequence || [];
        if (enemy.abilityIndex < seq.length) {
          const pick = seq[enemy.abilityIndex];
          enemy.abilityIndex++;
          if (abilities.includes(pick)) return pick;
        }
        if (pattern.randomAfter) {
          return this._attackFallback(abilities, pattern)
            || abilities[Math.floor(Math.random() * abilities.length)];
        }
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
        return this._attackFallback(abilities, pattern)
          || abilities[Math.floor(Math.random() * abilities.length)];
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
          if (abilities.includes(pick)) return pick;
          return this._attackFallback(abilities, pattern)
            || abilities[Math.floor(Math.random() * abilities.length)];
        }
        const p2Index = (enemy.abilityIndex - p1.length) % p2.length;
        enemy.abilityIndex++;
        const pick = p2[p2Index];
        if (abilities.includes(pick)) return pick;
        return this._attackFallback(abilities, pattern)
          || abilities[Math.floor(Math.random() * abilities.length)];
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
        return this._attackFallback(pool, pattern)
          || pool[Math.floor(Math.random() * pool.length)];
      }

      default:
        return this._attackFallback(abilities, pattern) || this._pickRandom(abilities, true, enemy);
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
    if (isPlayerSide) {
      // Agency guards reset at the top of every Andrew turn: Press Advantage is
      // free (doesn't end the turn) but strictly once per turn, and Loop In is
      // armed only by a weakness hit taken this turn.
      entity.pressAdvantageUsedThisTurn = false;
      entity.loopInUsedThisTurn = false;
      this.loopInReady = false;
      // TURN-BACK bookkeeping. Once per Andrew turn, and the arm is cleared so
      // a return can never carry over into the next one.
      entity.turnBackUsedThisTurn = false;
      this.turnBackReady = null;
      // C3 — Notice of Deficiency reads "did he brace on his PREVIOUS turn",
      // so the flag rolls forward here rather than being read live.
      entity._bracedLastTurn = !!entity._bracedThisTurn;
      entity._bracedThisTurn = false;
      // The Pivot has to be resolved on every turn boundary, not only when the
      // enemy acts: a DoT or a Reservation reflect can cross a phase threshold
      // between turns, and the HUD reads `enemy.weakness` live.
      this.syncAllPhaseTraits();

      // The Break window (+20%) outlives the enemy's skipped turn by exactly
      // one player turn — see _reduceComposure. Expire it here so the bonus
      // covers "the rest of this turn plus the next one" rather than only the
      // remainder of the turn that landed the Break.
      for (const e of this.enemies) {
        if (e.brokenBonus > 0) e.brokenBonus--;
      }

      // Momentum decay. Two sources, same number: the Escalation Clause
      // mutator (a client who takes something instead of adding a stat) and
      // the Open-Door Policy stretch goal. Applied before the player acts so
      // the HUD they read is the number they get.
      const decayers = this.aliveEnemies().filter(
        e => e.mutators?.some(m => m.id === 'escalation_clause')
      );
      if (decayers.length > 0 || this.hasStretch('open_door')) {
        const before = entity.momentum;
        entity.momentum = Math.max(0, entity.momentum - COMBAT_DEPTH.MOMENTUM_DECAY);
        if (before > 0) {
          results.push({
            type: 'status_expire',
            message: `Confidence slips ${before - entity.momentum}.`,
          });
        }
      }
    }
    if (isEnemySide) {
      entity.silencedThisTurn = entity.silenced > 0;
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
    if (isEnemySide) {
      if (entity.silencedThisTurn) {
        entity.silenced--;
        results.push({ type: 'silenced', message: `${entity.name} is silenced.` });
      } else {
        entity.silencedThisTurn = false;
      }
    }

    if (isEnemySide && entity.confuseCooldown > 0) {
      entity.confuseCooldown--;
    }

    // Roguelite mutators (reception clients only)
    if (isEnemySide && entity.mutators?.length && entity.hp > 0) {
      for (const mut of entity.mutators) {
        if (mut.id === 'volatile') {
          // Market Mood — Assertiveness swings ±30% every turn
          if (entity.baseAtk === undefined) entity.baseAtk = entity.atk;
          entity.atk = Math.max(4, Math.round(entity.baseAtk * (0.7 + Math.random() * 0.6)));
        } else if (mut.id === 'compound') {
          // Compound Interest — money makes money
          const heal = Math.ceil(entity.maxHP * 0.02);
          if (entity.hp < entity.maxHP) {
            entity.hp = Math.min(entity.maxHP, entity.hp + heal);
            results.push({ type: 'status_expire', message: `${mut.label}: ${entity.name} recovers ${heal}.` });
          }
        }
      }
    }

    if (entity.exposed > 0) {
      entity.exposed--;
      if (entity.exposed <= 0) results.push({ type: 'status_expire', message: 'Expose wore off.' });
    }
    if (entity.protected > 0) {
      entity.protected--;
      if (entity.protected <= 0) results.push({ type: 'status_expire', message: 'Protect wore off.' });
    }
    // Ticks on the enemy's own turn-start, which a broken enemy still runs
    // before losing the turn. Heal/Confuse arm this at 1 (one tick = one player
    // turn); a Composure Break arms it at 2 so the skipped turn does not eat the
    // whole window. See _reduceComposure.
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

    // Metaphor's deny-model: a defensive action that takes something from the
    // enemy instead of only protecting you. A PERFECT stance strips 20% of the
    // target's Composure, which makes Brace a legitimate route to a Break
    // rather than a turn spent standing still.
    let composureStripped = 0;
    let brokeComposure = false;
    // E5 — CONTEMPORANEOUS NOTES REPLACES the shipped flat 20 % perfect strip
    // (it does not stack with it) and extends it to a GOOD brace, which is what
    // turns Bracing from a turn spent standing still into the Compliance lane's
    // route to a Break.
    const notes = this.hasNode('contemporaneous_notes');
    const frac = notes
      ? (quality === 'perfect' ? 0.35 : quality === 'good' ? 0.15 : 0)
      : (quality === 'perfect' ? COMBAT_DEPTH.BRACE_COMPOSURE_STRIP : 0);
    if (frac > 0) {
      const target = this.enemy;
      if (target && target.hp > 0 && target.maxComposure > 0 && target.broken <= 0) {
        const strip = Math.max(1, Math.round(target.maxComposure * frac));
        const res = this._reduceComposure(target, strip);
        composureStripped = res.amount;
        brokeComposure = res.broke;
      }
    }
    let objectionsCleared = 0;
    if (notes && quality !== 'miss') {
      // A brace is an objection to the move it answers.
      for (const e of this.enemies) {
        if (e.hp <= 0 || e.sealed) continue;
        const open = (e.locks || []).find(l => !l.cleared);
        if (open) { open.cleared = true; objectionsCleared++; }
      }
    }
    // E6 — STANDARD OF CARE, half one: a perfect Brace refunds 15 Confidence.
    if (this.hasNode('standard_of_care') && quality === 'perfect') this._gainMomentum(15);
    // Stamped for Reservation of Rights, which needs to know HOW WELL he braced
    // on the frame the enemy's blow resolves.
    this.player._braceQuality = quality;
    this.player._bracedThisTurn = true;
    return { type: 'brace', defBonus: cfg.defBonus, duration: cfg.duration, quality, composureStripped, brokeComposure, objectionsCleared };
  }

  playerPowerMove(targetIndex) {
    if (this.player.momentum < 100) return null;
    // Approval Process (stretch goal): the two comeback valves are off.
    if (this.hasStretch('approval_process')) return null;
    const conf = this._applyConfusion(this.player, targetIndex);
    const target = this._resolveTarget(conf.targetIndex);
    if (!target) return null;
    const pStats = this._getEffective(this.player);
    const baseDmg = (pStats.atk + 75) * COMBAT.BASE_DAMAGE_MULTIPLIER;
    let damage = Math.max(10, Math.floor(baseDmg + randomRange(-5, 5)));
    if (conf.dampened) damage = Math.max(1, Math.floor(damage * conf.damageMult));
    target.hp = Math.max(0, target.hp - damage);
    this.player.momentum = 0;
    this._checkVictory();
    return {
      type: 'power_move', damage, targetIndex: this.targetEnemyIndex,
      confusedScramble: conf.scrambled, confusedDampened: conf.dampened,
    };
  }

  // Press Advantage no longer ends the turn, so it is priced accordingly:
  // base 40 (was 25), floor 25 (was 15). At high SPD it lands around 34,
  // i.e. roughly every third turn — tempo, not a free extra action every turn.
  getPressAdvantageCost() {
    const spd = this._getEffective(this.player).spd;
    const base = Math.max(
      COMBAT_DEPTH.PRESS_ADVANTAGE_FLOOR,
      Difficulty.depth('PRESS_ADVANTAGE_BASE', COMBAT_DEPTH.PRESS_ADVANTAGE_BASE)
        - Math.floor((spd - 8) * 0.5),
    );
    // AGGRAVATING FACTORS (E10): -10, floored at 15.
    return this.hasNode('aggravating_factors') ? Math.max(15, base - 10) : base;
  }

  // E33's Gradient Attack model: Press Advantage costs momentum but does NOT
  // end the turn — it slots BETWEEN actions, so momentum reads as tempo rather
  // than a damage battery. Hard-capped at once per turn so it can never loop.
  playerPressAdvantage(targetIndex) {
    const cost = this.getPressAdvantageCost();
    if (this.player.momentum < cost) return null;
    if (this.player.pressAdvantageUsedThisTurn) return null;
    // Confusion has to apply here too. It was skipped on Press Advantage,
    // Retaliate, Assert Dominance and Desperate Gamble, which made confusion a
    // player-favouring inconsistency in a system whose whole pitch is that it
    // is consistent: the action you chose always happens, at reduced force and
    // possibly on the wrong target.
    const conf = this._applyConfusion(this.player, targetIndex);
    const target = this._resolveTarget(conf.targetIndex);
    if (!target) return null;
    const pStats = this._getEffective(this.player);
    const eStats = this._getEffective(target);
    const dmg = this._calcDamage(pStats.atk, 18, eStats.def, target);
    const combo = this._enemyHasDebuff(target);
    let finalDamage = dmg.damage;
    if (combo) finalDamage = Math.floor(finalDamage * 1.25);
    if (conf.dampened) finalDamage = Math.max(1, Math.floor(finalDamage * conf.damageMult));
    target.hp = Math.max(0, target.hp - finalDamage);
    target.buffs.push({ stats: { def: -5 }, duration: 2, name: 'Press Advantage' });
    this.player.momentum = Math.max(0, this.player.momentum - cost);
    this.player.pressAdvantageUsedThisTurn = true;
    this._checkVictory();
    return {
      type: 'press_advantage', damage: finalDamage, critical: dmg.critical, combo,
      targetIndex: this.targetEnemyIndex, freeAction: true,
      confusedScramble: conf.scrambled, confusedDampened: conf.dampened,
    };
  }

  // ── LOOP IN (Persona 5 Royal Baton Pass) ──────────────────────────────
  // Armed by a weakness hit while a recruited ally is alive and on the bench.
  // Hands the follow-up to that ally: they act immediately at +50% damage and
  // are spent for the round. Once per Andrew turn.
  playerLoopIn(allyIndex) {
    if (!this.loopInReady) return null;
    if (this.player.loopInUsedThisTurn) return null;
    const ally = this.allies[allyIndex];
    if (!ally || ally.hp <= 0 || ally.isPlayer) return null;

    this.loopInReady = false;
    this.player.loopInUsedThisTurn = true;
    this._allyDamageMult = COMBAT_DEPTH.LOOP_IN_DAMAGE_BONUS;
    let res;
    try {
      res = this.allyTurn(allyIndex);
    } finally {
      this._allyDamageMult = 1;
    }
    if (!res) return null;
    this._gainMomentum(COMBAT_DEPTH.LOOP_IN_MOMENTUM);
    return {
      ...res,
      loopIn: true,
      loopInAllyIndex: allyIndex,
      loopInAllyName: ally.name,
      momentumGain: COMBAT_DEPTH.LOOP_IN_MOMENTUM,
    };
  }

  playerSecondWind() {
    if (this.player.momentum < 50) return null;
    if (this.hasStretch('approval_process')) return null;
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
    const conf = this._applyConfusion(this.player, targetIndex);
    const target = this._resolveTarget(conf.targetIndex);
    if (!target) return null;
    const pStats = this._getEffective(this.player);
    const eStats = this._getEffective(target);
    // E9 — ADVERSE INFERENCE. Retaliate carries the PRACTICE AREA of the move
    // it answers, so it clears Objections and can land as a weakness hit, and
    // its base power goes 22 -> 26. Shipped, Retaliate passed no tag at all,
    // which is why it moved no Composure and cleared nothing: the QTE lane's
    // signature move was the one attack in the game outside the tag system.
    const inference = this.hasNode('adverse_inference');
    const answeredTag = inference ? this._telegraphedTag(target) : null;
    const dmg = this._calcDamage(pStats.atk, inference ? 26 : 22, eStats.def, target, answeredTag);
    let finalDamage = Math.max(1, Math.floor(dmg.damage * multiplier));
    if (conf.dampened) finalDamage = Math.max(1, Math.floor(finalDamage * conf.damageMult));
    target.hp = Math.max(0, target.hp - finalDamage);
    this._gainMomentum(Math.floor(15 * multiplier));
    this._checkVictory();
    return {
      type: 'retaliate', damage: finalDamage, critical: dmg.critical && multiplier >= 1.0,
      targetIndex: this.targetEnemyIndex, effective: dmg.effective,
      locksCleared: dmg.lockCleared, brokeComposure: dmg.broke,
      confusedScramble: conf.scrambled, confusedDampened: conf.dampened,
    };
  }

  // The practice area of the move an enemy is currently telegraphing. Enemy
  // abilities are only 11/93 tagged, so this falls back to the first Objection
  // on the move — which `_buildLocks` derives hash-stably from the ability id,
  // and is therefore just as learnable.
  _telegraphedTag(enemy) {
    if (!enemy) return null;
    const ab = ENEMY_ABILITIES[enemy.telegraphedAbility];
    return (ab && ab.tag) || ((enemy.locks || []).find(l => !l.cleared) || {}).tag || null;
  }

  playerDesperateGamble(risk, targetIndex) {
    const conf = this._applyConfusion(this.player, targetIndex);
    const target = this._resolveTarget(conf.targetIndex);
    if (!target) return null;
    const pStats = this._getEffective(this.player);
    const eStats = this._getEffective(target);
    const dmg = this._calcDamage(pStats.atk, 15, eStats.def, target);
    let multiplier = 1.0;
    let success = true;
    if (risk === 'risky') {
      // EV 1.1× — already a fair bet, left alone.
      success = Math.random() < 0.6;
      multiplier = success ? 1.5 : 0.5;
    } else if (risk === 'all_in') {
      // 40% × 2.7× = EV 1.08×, a hair under risky's 1.10×, with a 25-momentum
      // floor on the whiff. See COMBAT_DEPTH.ALL_IN_* for the full history —
      // this row is priced so that neither it nor risky dominates.
      success = Math.random() < COMBAT_DEPTH.ALL_IN_CHANCE;
      multiplier = success ? COMBAT_DEPTH.ALL_IN_MULTIPLIER : 0;
    }
    let finalDamage = Math.max(success ? 1 : 0, Math.floor(dmg.damage * multiplier));
    if (conf.dampened && finalDamage > 0) finalDamage = Math.max(1, Math.floor(finalDamage * conf.damageMult));
    let consolationMomentum = 0;
    if (finalDamage > 0) {
      target.hp = Math.max(0, target.hp - finalDamage);
      this._gainMomentum(10);
    } else if (risk === 'all_in') {
      consolationMomentum = COMBAT_DEPTH.ALL_IN_CONSOLATION_MOMENTUM;
      this._gainMomentum(consolationMomentum);
    }
    this._checkVictory();
    return {
      type: 'desperate_gamble', damage: finalDamage, risk, success,
      critical: dmg.critical && success && multiplier >= 1.5,
      targetIndex: this.targetEnemyIndex, consolationMomentum,
      confusedScramble: conf.scrambled, confusedDampened: conf.dampened,
    };
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
    // Routine Inspection (stretch goal): internal counsel is unavailable.
    if (this.hasStretch('routine_inspection')) return [];
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
