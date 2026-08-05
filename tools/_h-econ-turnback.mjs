// _h-econ-turnback.mjs — THROWAWAY harness for the H-run combat-economy lane.
//
// Question: the producer said GO on "a weakness hit hands the turn back to the
// player" (attack-feel-design.md §5.3 item 3.6) with the caveat that combat
// scaling deserves another look now that weaknesses are telegraphed in text
// (CombatHUD.js:220 prints `COMPOSURE — LEGAL ONLY`).
//
// This harness wraps tools/combat-sim.mjs — same engine, same data, same
// player policy — and adds the turn-back rule as a POLICY WRAPPER, which is
// exactly what the rule is: control returns to the same actor inside the same
// turn slot. Nothing in src/ is touched.
//
//   node tools/_h-econ-turnback.mjs --baseline          # Run C numbers + new columns
//   node tools/_h-econ-turnback.mjs --variants          # a..g across the ladder
//   node tools/_h-econ-turnback.mjs --chains            # degenerate-line hunt
//   node tools/_h-econ-turnback.mjs --trade             # does TB collapse the Objections/Composure trade?
//   node tools/_h-econ-turnback.mjs --pip  --variant c  # casual floor
//   node tools/_h-econ-turnback.mjs --knobs             # compensating-scaling sweep
//   node tools/_h-econ-turnback.mjs --symmetry          # enemy-side one-more
//   node tools/_h-econ-turnback.mjs --runs 400

import {
  runFight, enc, competentTurn, casualTurn, naiveTurn,
  buildPartyOverrides, buildPlayerStats, unlockedAbilities,
} from './combat-sim.mjs';
import { COMBAT_DEPTH } from '../src/combat/CombatEngine.js';
import { ENEMY_STATS, ENEMY_ABILITIES, PLAYER_ABILITIES } from '../src/data/stats.js';

const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);

// ── The rule, as a family of variants ───────────────────────────────────
// Each variant answers: after Andrew lands a weakness hit, does he act again,
// and what does it cost?
//
//   cap          max turn-backs per Andrew turn (Infinity = unlimited chaining)
//   eatsVuln     the proc consumes the enemy's vulnerability window (sets 0)
//   momentumCost momentum paid per proc; proc is refused if unaffordable
//   allyArms     an ally's weakness hit taken via Loop In also arms a turn-back
//   xorLoopIn    a turn-back and a Loop In cannot both happen in one turn
//   brokenArms   a weakness hit on an already-BROKEN enemy still arms it
export const VARIANTS = {
  off: null,
  a: { label: '(a) unlimited chaining',            cap: Infinity, eatsVuln: false, momentumCost: 0,  allyArms: false, xorLoopIn: false, brokenArms: true },
  b: { label: '(b) once per turn',                 cap: 1,        eatsVuln: false, momentumCost: 0,  allyArms: false, xorLoopIn: false, brokenArms: true },
  c: { label: '(c) once/turn + eats vuln window',  cap: 1,        eatsVuln: true,  momentumCost: 0,  allyArms: false, xorLoopIn: false, brokenArms: true },
  d: { label: '(d) unlimited, -10 momentum/proc',  cap: Infinity, eatsVuln: false, momentumCost: 10, allyArms: false, xorLoopIn: false, brokenArms: true },
  d2:{ label: '(d2) unlimited, -25 momentum/proc', cap: Infinity, eatsVuln: false, momentumCost: 25, allyArms: false, xorLoopIn: false, brokenArms: true },
  f: { label: '(f) once/turn, ally super re-arms', cap: 1,        eatsVuln: false, momentumCost: 0,  allyArms: true,  xorLoopIn: false, brokenArms: true },
  g: { label: '(g) once/turn XOR Loop In',         cap: 1,        eatsVuln: false, momentumCost: 0,  allyArms: false, xorLoopIn: true,  brokenArms: true },
  h: { label: '(h) once/turn, XOR LoopIn, no-chain-into-Break', cap: 1, eatsVuln: false, momentumCost: 0, allyArms: false, xorLoopIn: true, brokenArms: false },
  R: { label: 'R  once/turn, XOR LoopIn, eats vuln, no Break-chain', cap: 1, eatsVuln: true, momentumCost: 0, allyArms: false, xorLoopIn: true, brokenArms: false },
  // Same as g/h/R but the policy SPENDS the weakness hit on the extra swing
  // rather than on the baton. The shipped competent policy always takes the
  // baton, which makes an XOR rule invisible in every fight that has allies —
  // a policy artefact, not a design property, so it is measured both ways.
  gT: { label: '(g\') once/turn XOR LoopIn, prefers the turn-back', cap: 1, eatsVuln: false, momentumCost: 0, allyArms: false, xorLoopIn: true, brokenArms: true, preferTurnBack: true },
  RT: { label: "R'  once/turn, XOR LoopIn (prefers TB), eats vuln, no Break-chain", cap: 1, eatsVuln: true, momentumCost: 0, allyArms: false, xorLoopIn: true, brokenArms: false, preferTurnBack: true },

  // ── The RESTRICTED follow-up family ────────────────────────────────────
  // The extra action is NOT a full turn. It is one untagged basic attack, so:
  // it cannot chain (a basic attack can never be `super`), it cannot clear an
  // Objection, and it cannot move Composure — Andrew still gets exactly ONE
  // tagged hit per turn and the Objections/Composure trade survives intact.
  P:  { label: 'P   free BASIC follow-up, once/turn (full force)', cap: 1, extra: 'basic', extraMult: 1.0, xorLoopIn: false, brokenArms: true },
  P2: { label: 'P2  free BASIC follow-up, once/turn, 0.60x force', cap: 1, extra: 'basic', extraMult: 0.60, xorLoopIn: false, brokenArms: true },
  P3: { label: 'P3  free BASIC follow-up, once/turn, 0.75x, XOR LoopIn', cap: 1, extra: 'basic', extraMult: 0.75, xorLoopIn: true, brokenArms: true, preferTurnBack: true },
  P4: { label: 'P4  free BASIC follow-up, 0.75x, XOR LoopIn, no Break-chain', cap: 1, extra: 'basic', extraMult: 0.75, xorLoopIn: true, brokenArms: false, preferTurnBack: true },

  // ── The BUDGET-NEUTRAL family ─────────────────────────────────────────
  // A weakness hit already pays four currencies. These variants make the
  // turn-back a REPRICING rather than a fifth payment: it costs momentum
  // (Rm) or it takes the place of the momentum the weakness hit would have
  // banked (Rn).
  Rm: { label: 'Rm  once/turn, -25 momentum/proc, prefers TB, eats vuln, no Break-chain', cap: 1, momentumCost: 25, eatsVuln: true, xorLoopIn: true, brokenArms: false, preferTurnBack: true },
  Rn: { label: 'Rn  once/turn, weakness hit banks NO momentum, prefers TB, eats vuln, no Break-chain', cap: 1, eatsVuln: true, xorLoopIn: true, brokenArms: false, preferTurnBack: true, noSuperMomentum: true },
  Pm: { label: 'Pm  free BASIC follow-up 0.75x, -15 momentum/proc, no Break-chain', cap: 1, extra: 'basic', extraMult: 0.75, momentumCost: 15, brokenArms: false },
  Rm35: { label: 'Rm35  once/turn, -35 momentum/proc', cap: 1, momentumCost: 35, eatsVuln: true, xorLoopIn: true, brokenArms: false, preferTurnBack: true },
  Rm50: { label: 'Rm50  once/turn, -50 momentum/proc', cap: 1, momentumCost: 50, eatsVuln: true, xorLoopIn: true, brokenArms: false, preferTurnBack: true },
  Rm25v: { label: 'Rm25v  once/turn, -25 momentum, KEEPS vuln window', cap: 1, momentumCost: 25, eatsVuln: false, xorLoopIn: true, brokenArms: false, preferTurnBack: true },

  // W — the weakness hit does not hand back the turn; it hands back the
  // FREE ACTION the game already has. Press Advantage is re-armed at zero
  // momentum for the rest of this turn. Reuses a shipped verb, a shipped
  // button and a shipped animation, and is bounded by PA's own once-per-turn.
  W: { label: 'W   weakness re-arms Press Advantage, free, once/turn', cap: 1, extra: 'press', brokenArms: true },
  Wb: { label: 'Wb  weakness re-arms Press Advantage free, no Break-chain', cap: 1, extra: 'press', brokenArms: false },

  // F1 — the beat exists but is a once-per-FIGHT flourish (first weakness hit
  // on each enemy). Caps total value at one extra action per enemy.
  F1: { label: 'F1  full extra action, FIRST weakness hit per enemy only', cap: 1, oncePerEnemy: true, eatsVuln: false, xorLoopIn: false, brokenArms: true },

  // X — the returned turn is a REAL turn (heal, Brace, item, basic attack)
  // but it may not spend a second TAGGED ability. Andrew still gets exactly
  // one tagged hit per turn, so the Objections/Composure trade survives by
  // construction and the enemy-denial double-dip is impossible.
  X:  { label: 'X   full extra action, NO second tagged ability', cap: 1, extra: 'untagged', brokenArms: false },
  Xm: { label: 'Xm  full extra action, no tagged ability, -25 momentum', cap: 1, extra: 'untagged', momentumCost: 25, brokenArms: false },
  Xx: { label: 'Xx  full extra action, no tagged ability, XOR Loop In', cap: 1, extra: 'untagged', xorLoopIn: true, preferTurnBack: true, brokenArms: false },
  // Price / reserve sweep around Xm. `reserve` models a player who declines
  // the buy rather than spending the momentum they were saving — the shipped
  // wrapper always takes it, so reserve 0 is a FLOOR, not a mean.
  Xm15r25: { label: 'Xm  -15 momentum, keep 25 in reserve', cap: 1, extra: 'untagged', momentumCost: 15, momentumReserve: 25, brokenArms: false },
  Xm20r25: { label: 'Xm  -20 momentum, keep 25 in reserve', cap: 1, extra: 'untagged', momentumCost: 20, momentumReserve: 25, brokenArms: false },
  Xm25r25: { label: 'Xm  -25 momentum, keep 25 in reserve', cap: 1, extra: 'untagged', momentumCost: 25, momentumReserve: 25, brokenArms: false },
  Xm25r50: { label: 'Xm  -25 momentum, keep 50 in reserve', cap: 1, extra: 'untagged', momentumCost: 25, momentumReserve: 50, brokenArms: false },
  Xm30r25: { label: 'Xm  -30 momentum, keep 25 in reserve', cap: 1, extra: 'untagged', momentumCost: 30, momentumReserve: 25, brokenArms: false },

  // U — the returned turn is an ADMIN turn. Free, once per turn, but it may
  // not deal damage: Brace, Coffee Break, an item, a buff/debuff. The damage
  // economy is untouched, so the fight keeps its length; what the beat buys is
  // sustain and tempo.
  U:  { label: 'U   free ADMIN turn (no damage), once/turn', cap: 1, extra: 'utility', brokenArms: true },
  Ub: { label: 'Ub  free ADMIN turn, no Break-chain / no re-down', cap: 1, extra: 'utility', brokenArms: false },
  // Uc tightens Ub: the admin turn may only DEFEND or SUSTAIN. Debuffs are
  // excluded because a tagged debuff feeds Follow Through (x1.25 on every
  // later hit) and `stall` is excluded because it feeds Assert Dominance —
  // both are damage-economy actions wearing a utility hat.
  Uc: { label: 'Uc  free DEFEND/SUSTAIN turn only (no debuff, no stall)', cap: 1, extra: 'sustain', brokenArms: false },
  // Ud tightens Uc again: no HEAL either. The returned turn is Brace, an item
  // or a self-buff. This is the version that cannot convert a heal turn into a
  // damage turn, which is the single mechanism that shortens Meredith.
  Ud: { label: 'Ud  free GUARD turn only (Brace / item / self-buff)', cap: 1, extra: 'guard', brokenArms: false },
};

// ── Instrumentation ─────────────────────────────────────────────────────
function instrument(engine, tb) {
  const st = {
    andrewActions: 0, tbProcs: 0, maxChain: 0, breaks: 0,
    locksSeen: 0, locksCleared: 0, fizzles: 0, brokenTurns: 0,
    momentumGained: 0, powerMoves: 0, pressAdvantages: 0, secondWinds: 0,
    loopIns: 0, supers: 0, enemyOneMores: 0, mpSpent: 0,
  };
  engine._tb = { cfg: tb, st, superThisAction: false, allySuper: false, procs: 0, brokeThisAction: false, loopInThisTurn: false };

  const wrapPlayerAction = (name) => {
    const real = engine[name].bind(engine);
    engine[name] = (...args) => {
      const before = engine.player.mp;
      const preBroken = engine.enemies.map(e => (e.brokenBonus > 0 || e.broken > 0));
      const r = real(...args);
      if (r) {
        st.andrewActions++;
        st.mpSpent += Math.max(0, before - engine.player.mp);
        const sup = r.effective === 'super' || (r.hits || []).some(h => h.effective === 'super');
        if (sup) {
          engine._tb.superThisAction = true; st.supers++;
          // Rn: the weakness hit's momentum IS the turn-back. Claw back the
          // whole gain of the hit that armed it, so the fifth payment replaces
          // the third rather than stacking on it.
          if (tb && tb.noSuperMomentum) {
            engine.player.momentum = Math.max(0, engine.player.momentum - (r.momentumGain || 0));
          }
        }
        if (r.brokeComposure || (r.hits || []).some(h => h.brokeComposure)) engine._tb.brokeThisAction = true;
        // P5R's rule: a weakness hit on an ALREADY-downed target grants no
        // second One More. Sampled before the action so the Break itself is
        // handled by brokeThisAction and never double-counted.
        const ti = r.targetIndex ?? 0;
        if (sup) engine._tb.lastTargetIndex = ti;
        if (sup && preBroken[ti]) engine._tb.brokenTargetThisAction = true;
        if (sup && (r.hits || []).some((h, i) => h.effective === 'super' && preBroken[h.targetIndex])) engine._tb.brokenTargetThisAction = true;
      }
      return r;
    };
  };
  for (const m of ['playerAttack', 'playerAbility', 'playerRetaliate', 'playerDesperateGamble']) wrapPlayerAction(m);

  const realPM = engine.playerPowerMove.bind(engine);
  engine.playerPowerMove = (...a) => { const r = realPM(...a); if (r) { st.powerMoves++; st.andrewActions++; } return r; };
  const realPA = engine.playerPressAdvantage.bind(engine);
  engine.playerPressAdvantage = (...a) => { const r = realPA(...a); if (r) st.pressAdvantages++; return r; };
  const realSW = engine.playerSecondWind.bind(engine);
  engine.playerSecondWind = (...a) => { const r = realSW(...a); if (r) { st.secondWinds++; st.andrewActions++; } return r; };
  const realLI = engine.playerLoopIn.bind(engine);
  engine.playerLoopIn = (...a) => {
    const r = realLI(...a);
    if (r) {
      st.loopIns++;
      engine._tb.loopInThisTurn = true;
      if (r.effective === 'super' || (r.hits || []).some(h => h.effective === 'super')) engine._tb.allySuper = true;
    }
    return r;
  };
  const realGM = engine._gainMomentum.bind(engine);
  engine._gainMomentum = (amt) => { const b = engine.player.momentum; realGM(amt); st.momentumGained += engine.player.momentum - b; };
  const realRC = engine._reduceComposure.bind(engine);
  engine._reduceComposure = (t, amt) => { const r = realRC(t, amt); if (r.broke) st.breaks++; return r; };
  const realET = engine.enemyTurn.bind(engine);
  engine.enemyTurn = (i) => {
    const e = engine.enemies[i];
    const locks = (e && Array.isArray(e.locks)) ? e.locks : [];
    st.locksSeen += locks.length;
    st.locksCleared += locks.filter(l => l.cleared).length;
    const r = realET(i);
    if (r && r.type === 'fizzle') st.fizzles++;
    if (r && r.type === 'broken') st.brokenTurns++;
    return r;
  };
  return st;
}

// ── The turn-back wrapper ───────────────────────────────────────────────
// The rule expressed where it actually lives: control returns to the same
// actor inside the same turn slot, so it is one more call to the same policy
// with every once-per-turn guard (Press Advantage, Loop In) still standing.
function lowestHpEnemy(engine) {
  let best = -1, bestHp = Infinity;
  engine.enemies.forEach((e, i) => { if (e.hp > 0 && e.hp < bestHp) { best = i; bestHp = e.hp; } });
  return best;
}

// The restricted follow-up: one untagged basic attack at `mult` force.
// Implemented as a real playerAttack (so momentum, combo and thorns all behave)
// with the overshoot handed back when the variant discounts it.
function freeBasic(engine, mult) {
  const ti = lowestHpEnemy(engine);
  if (ti < 0) return;
  const before = engine.enemies[ti].hp;
  const r = engine.playerAttack(ti);
  if (!r || mult >= 1) return;
  const dealt = before - engine.enemies[ti].hp;
  const kept = Math.max(1, Math.floor(dealt * mult));
  engine.enemies[ti].hp = Math.max(0, before - kept);
  if (engine.enemies[ti].hp > 0 && engine.result === 'victory') { engine.isOver = false; engine.result = null; }
}

export function turnBackPolicy(inner) {
  return (engine, sim, unlocked) => {
    const tb = engine._tb;
    if (!tb || !tb.cfg) { inner(engine, sim, unlocked); return; }
    const cfg = tb.cfg;
    tb.procs = 0;
    tb.loopInThisTurn = false;
    let chain = 0;
    const realCands = engine.getLoopInCandidates.bind(engine);
    for (let guard = 0; guard < 400; guard++) {
      tb.superThisAction = false;
      tb.allySuper = false;
      tb.brokeThisAction = false;
      tb.brokenTargetThisAction = false;
      // preferTurnBack: withhold the baton during the main action so the
      // weakness hit is available to pay for the extra swing instead.
      if (cfg.preferTurnBack && tb.procs < cfg.cap) engine.getLoopInCandidates = () => [];
      try { inner(engine, sim, unlocked); } finally { engine.getLoopInCandidates = realCands; }
      if (engine.isOver) break;
      const armed = tb.superThisAction || (cfg.allyArms && tb.allySuper);
      if (!armed) {
        // No super landed, so the baton could not have been armed either
        // (loopInReady is set only by a super) — nothing was withheld.
        break;
      }
      if (!cfg.brokenArms && (tb.brokeThisAction || tb.brokenTargetThisAction)) break;
      if (cfg.xorLoopIn && tb.loopInThisTurn) break;
      if (tb.procs >= cfg.cap) break;
      if (cfg.oncePerEnemy) {
        tb.spent = tb.spent || new Set();
        const ti = tb.lastTargetIndex ?? 0;
        if (tb.spent.has(ti)) break;
        tb.spent.add(ti);
      }
      if (cfg.momentumCost > 0) {
        if (engine.player.momentum - cfg.momentumCost < (cfg.momentumReserve || 0)) break;
        engine.player.momentum -= cfg.momentumCost;
      }
      if (cfg.eatsVuln) {
        for (const e of engine.enemies) if (e.hp > 0 && e.vulnerable > 0) e.vulnerable = 0;
      }
      tb.procs++;
      chain++;
      tb.st.tbProcs++;
      if (cfg.extra === 'utility' || cfg.extra === 'sustain' || cfg.extra === 'guard') {
        const sustainOnly = cfg.extra === 'sustain' || cfg.extra === 'guard';
        const guardOnly = cfg.extra === 'guard';
        // Everything that deals damage is off the table for the returned turn.
        const stripped = new Set([...unlocked].filter(id => {
          const a = PLAYER_ABILITIES[id];
          if (!a) return false;
          if (a.type === 'attack' || a.type === 'attack_aoe') return false;
          if (sustainOnly && (a.type === 'debuff' || a.type === 'stall' || a.type === 'special')) return false;
          if (guardOnly && a.type === 'heal') return false;
          return true;
        }));
        const saved = {};
        const blocked = guardOnly
          ? ['playerAttack', 'playerPowerMove', 'playerRetaliate', 'playerDesperateGamble', 'playerPressAdvantage', 'playerSecondWind']
          : ['playerAttack', 'playerPowerMove', 'playerRetaliate', 'playerDesperateGamble', 'playerPressAdvantage'];
        for (const m of blocked) {
          saved[m] = engine[m];
          engine[m] = () => null;
        }
        try { inner(engine, sim, stripped); }
        finally { for (const m of Object.keys(saved)) engine[m] = saved[m]; }
        if (!cfg.xorLoopIn && !engine.isOver) {
          const c = engine.getLoopInCandidates();
          if (c.length > 0) engine.playerLoopIn(c[0]);
        }
        break;
      }
      if (cfg.extra === 'untagged') {
        // Same policy, same turn, but the tagged attack abilities are off the
        // menu — so the returned turn cannot be a second weakness hit, cannot
        // clear a second Objection and cannot move Composure again.
        const stripped = new Set([...unlocked].filter(id => {
          const a = PLAYER_ABILITIES[id];
          return !(a && a.tag && (a.type === 'attack' || a.type === 'attack_aoe'));
        }));
        inner(engine, sim, stripped);
        if (!cfg.xorLoopIn && !engine.isOver) {
          const c = engine.getLoopInCandidates();
          if (c.length > 0) engine.playerLoopIn(c[0]);
        }
        break;
      }
      if (cfg.extra === 'press') {
        // Re-arm Press Advantage at zero cost for this turn.
        const save = engine.player.momentum;
        engine.player.pressAdvantageUsedThisTurn = false;
        engine.player.momentum = 100;
        engine.playerPressAdvantage(lowestHpEnemy(engine));
        engine.player.momentum = save;
        if (!cfg.xorLoopIn && !engine.isOver) {
          const c = engine.getLoopInCandidates();
          if (c.length > 0) engine.playerLoopIn(c[0]);
        }
        break;
      }
      if (cfg.extra === 'basic') {
        freeBasic(engine, cfg.extraMult ?? 1);
        // A basic attack is untagged: it can never be `super`, so the
        // restricted family terminates by construction. If the variant is not
        // XOR, the baton is still available off the ORIGINAL weakness hit.
        if (!cfg.xorLoopIn && !engine.isOver) {
          const c = engine.getLoopInCandidates();
          if (c.length > 0) engine.playerLoopIn(c[0]);
        }
        break;
      }
    }
    if (chain > tb.st.maxChain) tb.st.maxChain = chain;
  };
}

// ── Batch ───────────────────────────────────────────────────────────────
export function batchTB(cfg, level, runs, variantKey, policy = competentTurn) {
  const tb = VARIANTS[variantKey] ?? null;
  const wrapped = tb ? turnBackPolicy(policy) : policy;
  const agg = {
    runs, wins: 0, timeouts: 0, rounds: 0, hpLeft: 0, actions: 0, tbProcs: 0,
    maxChain: 0, breaks: 0, locksSeen: 0, locksCleared: 0, fizzles: 0,
    momentumGained: 0, powerMoves: 0, loopIns: 0, supers: 0, mpSpent: 0, brokenTurns: 0,
  };
  for (let i = 0; i < runs; i++) {
    let st = null;
    const r = runFight(cfg, level, {
      policy: wrapped,
      onEngine: (e) => { st = instrument(e, tb); },
    });
    if (r.win) { agg.wins++; agg.rounds += r.rounds; agg.hpLeft += r.hpPct; }
    if (r.timeout) agg.timeouts++;
    if (st) {
      agg.actions += st.andrewActions; agg.tbProcs += st.tbProcs;
      agg.maxChain = Math.max(agg.maxChain, st.maxChain);
      agg.breaks += st.breaks; agg.locksSeen += st.locksSeen; agg.locksCleared += st.locksCleared;
      agg.fizzles += st.fizzles; agg.brokenTurns += st.brokenTurns;
      agg.momentumGained += st.momentumGained; agg.powerMoves += st.powerMoves;
      agg.loopIns += st.loopIns; agg.supers += st.supers; agg.mpSpent += st.mpSpent;
    }
  }
  const w = Math.max(1, agg.wins);
  return {
    winRate: agg.wins / runs,
    avgRounds: agg.rounds / w,
    avgHpLeft: agg.hpLeft / w,
    avgActions: agg.actions / runs,
    avgProcs: agg.tbProcs / runs,
    maxChain: agg.maxChain,
    breaks: agg.breaks / runs,
    lockClear: agg.locksSeen ? agg.locksCleared / agg.locksSeen : 0,
    fizzles: agg.fizzles / runs,
    brokenTurns: agg.brokenTurns / runs,
    momentum: agg.momentumGained / runs,
    powerMoves: agg.powerMoves / runs,
    loopIns: agg.loopIns / runs,
    supers: agg.supers / runs,
    mpSpent: agg.mpSpent / runs,
    timeouts: agg.timeouts,
  };
}

// ── Ladders ─────────────────────────────────────────────────────────────
export const LADDER = [
  { id: 'karen', level: 3 },
  { id: 'karen', level: 4 },
  { id: 'chad', level: 5 },
  { id: 'chad', level: 6 },
  { id: 'grandma', level: 7 },
  { id: 'grandma', level: 8 },
  { id: 'restructuring_trio', level: 7, party: ['janet'] },
  { id: 'restructuring_trio', level: 8, party: ['janet'] },
  { id: 'rachel_boss', level: 8 },
  { id: 'rachel_boss', level: 9 },
  { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
];

function cfgFor(row) {
  const c = enc(row.id);
  if (row.party) c.party = row.party;
  c.partyOverrides = buildPartyOverrides(c.party, row.level);
  return c;
}

function header(cols) { return cols.join(''); }

function runBaseline(runs, variantKey = 'off') {
  const v = VARIANTS[variantKey];
  console.log(`\n=== BASELINE + INSTRUMENTS — ${v ? v.label : 'turn-back OFF (Run C shipped)'}, COMPETENT, ${runs} runs ===`);
  console.log(header([
    'encounter'.padEnd(20), 'lvl'.padStart(4), 'win'.padStart(8), 'rounds'.padStart(8),
    'actions'.padStart(8), 'hp left'.padStart(9), 'breaks'.padStart(8), 'lockclr'.padStart(8),
    'fizzle'.padStart(7), 'supers'.padStart(7), 'mom'.padStart(7), 'PM'.padStart(6), 'procs'.padStart(7), 'chain'.padStart(6),
  ]));
  for (const row of LADDER) {
    const r = batchTB(cfgFor(row), row.level, runs, variantKey);
    console.log(header([
      row.id.padEnd(20), String(row.level).padStart(4), pct(r.winRate).padStart(8),
      n2(r.avgRounds).padStart(8), n2(r.avgActions).padStart(8), pct(r.avgHpLeft).padStart(9),
      n2(r.breaks).padStart(8), pct(r.lockClear).padStart(8), n2(r.fizzles).padStart(7),
      n2(r.supers).padStart(7), Math.round(r.momentum).toString().padStart(7),
      n2(r.powerMoves).padStart(6), n2(r.avgProcs).padStart(7), String(r.maxChain).padStart(6),
    ]));
  }
}

function runVariants(runs, keys) {
  const rows = LADDER.filter(r => ['karen', 'chad', 'grandma', 'rachel_boss', 'algorithm', 'restructuring_trio'].includes(r.id));
  const base = {};
  console.log(`\n=== VARIANT MATRIX — COMPETENT, ${runs} runs/cell ===`);
  console.log('deltas are vs turn-back OFF. rounds- = fight got shorter. hp+ = player took less damage.');
  for (const row of rows) {
    const key = `${row.id}@${row.level}`;
    base[key] = batchTB(cfgFor(row), row.level, runs, 'off');
  }
  for (const vk of keys) {
    const v = VARIANTS[vk];
    console.log(`\n-- ${v.label} --`);
    console.log(header(['encounter'.padEnd(20), 'lvl'.padStart(4), 'win'.padStart(8), 'Δwin'.padStart(8),
      'rounds'.padStart(8), 'Δrnd'.padStart(8), 'actions'.padStart(8), 'Δact'.padStart(8),
      'hp left'.padStart(9), 'Δhp'.padStart(8), 'breaks'.padStart(8), 'Δbrk'.padStart(7),
      'lockclr'.padStart(8), 'mom'.padStart(7), 'procs'.padStart(7), 'chain'.padStart(6)]));
    for (const row of rows) {
      const key = `${row.id}@${row.level}`;
      const b = base[key];
      const r = batchTB(cfgFor(row), row.level, runs, vk);
      const d = (x, y, f = (z) => z.toFixed(2)) => ((x - y >= 0 ? '+' : '') + f(x - y));
      console.log(header([
        row.id.padEnd(20), String(row.level).padStart(4), pct(r.winRate).padStart(8),
        d(r.winRate * 100, b.winRate * 100, z => z.toFixed(1) + 'pp').padStart(8),
        n2(r.avgRounds).padStart(8), d(r.avgRounds, b.avgRounds).padStart(8),
        n2(r.avgActions).padStart(8), d(r.avgActions, b.avgActions).padStart(8),
        pct(r.avgHpLeft).padStart(9), d(r.avgHpLeft * 100, b.avgHpLeft * 100, z => z.toFixed(1) + 'pp').padStart(8),
        n2(r.breaks).padStart(8), d(r.breaks, b.breaks).padStart(7),
        pct(r.lockClear).padStart(8), Math.round(r.momentum).toString().padStart(7),
        n2(r.avgProcs).padStart(7), String(r.maxChain).padStart(6),
      ]));
    }
  }
}

// ── Degenerate-line hunt ────────────────────────────────────────────────
// The failure mode the brief names: multi-enemy fights where the weakness
// target rotates, so an unlimited rule never runs out of a legal super.
function runChains(runs) {
  const MULTI = [
    { id: 'restructuring_trio', level: 7, party: ['janet'] },
    { id: 'restructuring_trio', level: 8, party: ['janet'] },
    { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
    { id: 'karen', level: 8 },       // over-levelled: the grind case
    { id: 'grandma', level: 12 },    // NG-adjacent over-level
  ];
  console.log(`\n=== DEGENERATE-LINE HUNT — ${runs} runs/cell ===`);
  console.log('longest single-turn chain, and how much of the fight the extra actions are.');
  console.log(header(['encounter'.padEnd(20), 'lvl'.padStart(4), 'variant'.padStart(6),
    'actions'.padStart(9), 'procs'.padStart(8), 'proc%'.padStart(8), 'maxchain'.padStart(9),
    'rounds'.padStart(8), 'mp spent'.padStart(9), 'timeouts'.padStart(9)]));
  for (const row of MULTI) {
    for (const vk of ['off', 'a', 'd', 'b', 'R']) {
      const r = batchTB(cfgFor(row), row.level, runs, vk);
      console.log(header([
        row.id.padEnd(20), String(row.level).padStart(4), vk.padStart(6),
        n2(r.avgActions).padStart(9), n2(r.avgProcs).padStart(8),
        pct(r.avgActions ? r.avgProcs / r.avgActions : 0).padStart(8),
        String(r.maxChain).padStart(9), n2(r.avgRounds).padStart(8),
        Math.round(r.mpSpent).toString().padStart(9), String(r.timeouts).padStart(9),
      ]));
    }
  }
}

// ── The trade ───────────────────────────────────────────────────────────
// Run C's shipped claim (CombatHUD.js:212, CombatState.js:846): Andrew gets ONE
// tagged hit per turn, so clearing Objections and filling Composure are two
// budgets competing for the same swing. A turn-back gives him a SECOND tagged
// hit. If both numbers rise together the trade is gone.
function runTrade(runs, keys) {
  const rows = [
    { id: 'karen', level: 4 },
    { id: 'grandma', level: 8 },
    { id: 'rachel_boss', level: 9 },
    { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  console.log(`\n=== DOES THE TURN-BACK COLLAPSE THE OBJECTIONS/COMPOSURE TRADE? — ${runs} runs/cell ===`);
  console.log('A live trade = one number can only rise if the other falls.');
  console.log(header(['encounter'.padEnd(16), 'lvl'.padStart(4), 'variant'.padStart(8),
    'breaks/fight'.padStart(13), 'lock clear %'.padStart(13), 'fizzles'.padStart(9), 'both/fight'.padStart(11)]));
  for (const row of rows) {
    for (const vk of ['off', ...keys]) {
      const r = batchTB(cfgFor(row), row.level, runs, vk);
      console.log(header([
        row.id.padEnd(16), String(row.level).padStart(4), vk.padStart(8),
        n2(r.breaks).padStart(13), pct(r.lockClear).padStart(13), n2(r.fizzles).padStart(9),
        n2(r.breaks + r.fizzles).padStart(11),
      ]));
    }
  }
}

// ── Casual floor (PIP) ──────────────────────────────────────────────────
// The 40-85% mandate has a floor as well as a ceiling. CASUAL never uses a
// tagged ability, so the turn-back is invisible to it — which is the point:
// the mechanic widens the skill gap, and the compensating knobs must not
// close the floor to pay for it.
function pipResistFor(d) { return Math.min(0.80, 0.20 + 0.02 * Math.max(0, d)); }
function runPip(runs, variantKey, knobs) {
  applyKnobs(knobs);
  console.log(`\n=== PIP / CASUAL FLOOR — variant ${variantKey}, knobs ${knobs ? knobs.label : 'none'}, ${runs} runs ===`);
  const deaths = [0, 5, 10];
  console.log(header(['encounter'.padEnd(20), 'lvl'.padStart(4), 'off'.padStart(9),
    ...deaths.map(d => `${d}d/${Math.round(pipResistFor(d) * 100)}%`.padStart(9))]));
  for (const row of LADDER) {
    const cfg = cfgFor(row);
    const cells = [0, ...deaths.map(pipResistFor)].map(resist =>
      pct(batchTB({ ...cfg, pipResist: resist }, row.level, runs, variantKey, casualTurn).winRate).padStart(9));
    console.log(header([row.id.padEnd(20), String(row.level).padStart(4), ...cells]));
  }
  clearKnobs();
}

// ── Compensating scaling knobs ──────────────────────────────────────────
// What the doc has to size. Each knob is expressed the way it would actually
// ship: a COMBAT_DEPTH constant or a balance.json row.
const SAVED = {};
function applyKnobs(k) {
  if (!k) return;
  for (const key of ['COMPOSURE_PER_WEAKNESS_HIT', 'UNBROKEN_DAMAGE_TAX', 'PLAYER_DAMAGE_COMPENSATION', 'BROKEN_DAMAGE_BONUS', 'DENIAL_LIMIT', 'LOOP_IN_DAMAGE_BONUS']) {
    if (k[key] !== undefined) { SAVED[key] = COMBAT_DEPTH[key]; COMBAT_DEPTH[key] = k[key]; }
  }
  if (k.composureScale) {
    SAVED._composure = {};
    for (const id of Object.keys(ENEMY_STATS)) {
      const s = ENEMY_STATS[id];
      if (s.maxComposure) { SAVED._composure[id] = s.maxComposure; s.maxComposure = Math.round(s.maxComposure * k.composureScale / 30) * 30; }
    }
  }
  if (k.hpScale) {
    SAVED._hp = {};
    for (const id of (k.hpTargets || Object.keys(ENEMY_STATS))) {
      const s = ENEMY_STATS[id];
      if (!s) continue;
      SAVED._hp[id] = s.maxHP;
      s.maxHP = Math.round(s.maxHP * k.hpScale);
      if (s.phases) for (const p of s.phases) { /* phases key off %, no absolute HP */ }
    }
  }
}
function clearKnobs() {
  for (const key of Object.keys(SAVED)) {
    if (key === '_composure') { for (const id of Object.keys(SAVED._composure)) ENEMY_STATS[id].maxComposure = SAVED._composure[id]; }
    else if (key === '_hp') { for (const id of Object.keys(SAVED._hp)) ENEMY_STATS[id].maxHP = SAVED._hp[id]; }
    else COMBAT_DEPTH[key] = SAVED[key];
    delete SAVED[key];
  }
}

const KNOBS = [
  { label: 'none' },
  { label: 'composure bars x1.5 (60/90/120 -> 90/135/180)', composureScale: 1.5 },
  { label: 'composure per weakness hit 30 -> 20', COMPOSURE_PER_WEAKNESS_HIT: 20 },
  { label: 'boss maxHP x1.15', hpScale: 1.15, hpTargets: ['karen', 'chad', 'grandma', 'rachel_boss', 'algorithm', 'regional_director', 'restructuring_chief', 'restructuring_analyst', 'corporate_lawyer'] },
  { label: 'boss maxHP x1.25', hpScale: 1.25, hpTargets: ['karen', 'chad', 'grandma', 'rachel_boss', 'algorithm', 'regional_director', 'restructuring_chief', 'restructuring_analyst', 'corporate_lawyer'] },
  { label: 'DENIAL_LIMIT 2 -> 1', DENIAL_LIMIT: 1 },
  { label: 'composure x1.5 + DENIAL_LIMIT 1', composureScale: 1.5, DENIAL_LIMIT: 1 },
  { label: 'composure x1.5 + boss HP x1.15', composureScale: 1.5, hpScale: 1.15, hpTargets: ['karen', 'chad', 'grandma', 'rachel_boss', 'algorithm', 'regional_director', 'restructuring_chief', 'restructuring_analyst', 'corporate_lawyer'] },
];

function runKnobs(runs, variantKey) {
  const rows = [
    { id: 'karen', level: 3 }, { id: 'karen', level: 4 },
    { id: 'chad', level: 5 }, { id: 'grandma', level: 7 }, { id: 'grandma', level: 8 },
    { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  // Target band = the turn-back-OFF numbers with no knobs.
  const target = {};
  for (const row of rows) target[`${row.id}@${row.level}`] = batchTB(cfgFor(row), row.level, runs, 'off');
  console.log(`\n=== COMPENSATING SCALING — variant ${variantKey}, ${runs} runs/cell ===`);
  console.log('Goal: restore Run C\'s ROUNDS and HP-LEFT band while keeping the beat.');
  console.log('Δ columns are vs turn-back OFF at stock balance (the Run C band).');
  for (const k of KNOBS) {
    applyKnobs(k);
    console.log(`\n-- ${k.label} --`);
    console.log(header(['encounter'.padEnd(18), 'lvl'.padStart(4), 'win'.padStart(8), 'rounds'.padStart(8),
      'Δrnd'.padStart(8), 'hp left'.padStart(9), 'Δhp'.padStart(8), 'breaks'.padStart(8), 'actions'.padStart(8)]));
    for (const row of rows) {
      const b = target[`${row.id}@${row.level}`];
      const r = batchTB(cfgFor(row), row.level, runs, variantKey);
      const dr = r.avgRounds - b.avgRounds, dh = (r.avgHpLeft - b.avgHpLeft) * 100;
      console.log(header([row.id.padEnd(18), String(row.level).padStart(4), pct(r.winRate).padStart(8),
        n2(r.avgRounds).padStart(8), ((dr >= 0 ? '+' : '') + n2(dr)).padStart(8),
        pct(r.avgHpLeft).padStart(9), ((dh >= 0 ? '+' : '') + dh.toFixed(1) + 'pp').padStart(8),
        n2(r.breaks).padStart(8), n2(r.avgActions).padStart(8)]));
    }
    clearKnobs();
  }
}

// ── TURN DENIAL ─────────────────────────────────────────────────────────
// The metric that explains every other number in this report. A boss's
// pressure is not its HP, it is how many turns it actually gets to USE:
//   effective enemy turns = rounds - fizzled turns - Broken turns
// A rule that hands the player a second tagged hit per turn buys BOTH
// denial budgets in one turn, and enemy-HP compensation cannot buy them back.
function runDenial(runs, keys) {
  const rows = [
    { id: 'karen', level: 4 }, { id: 'chad', level: 5 }, { id: 'grandma', level: 7 },
    { id: 'restructuring_trio', level: 7, party: ['janet'] },
    { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  console.log(`\n=== TURN DENIAL — ${runs} runs/cell, COMPETENT ===`);
  console.log(header(['encounter'.padEnd(20), 'lvl'.padStart(4), 'variant'.padStart(8),
    'rounds'.padStart(8), 'fizzles'.padStart(9), 'broken'.padStart(8), 'EFF TURNS'.padStart(11),
    'vs off'.padStart(9), 'hp left'.padStart(9)]));
  for (const row of rows) {
    let baseEff = null;
    for (const vk of ['off', ...keys]) {
      const r = batchTB(cfgFor(row), row.level, runs, vk);
      const eff = Math.max(0, r.avgRounds - r.fizzles - r.brokenTurns);
      if (baseEff === null) baseEff = eff;
      console.log(header([row.id.padEnd(20), String(row.level).padStart(4), vk.padStart(8),
        n2(r.avgRounds).padStart(8), n2(r.fizzles).padStart(9), n2(r.brokenTurns).padStart(8),
        n2(eff).padStart(11), (baseEff ? pct(eff / baseEff) : '-').padStart(9), pct(r.avgHpLeft).padStart(9)]));
    }
  }
}

// ── NG+ laps ────────────────────────────────────────────────────────────
// tools/ng-sim.mjs's correctness rule: CARRY@NG+1 must not be EASIER than
// FRESH@NG. A rule that doubles the player's action rate is exactly the kind
// of thing that breaks a ladder built on enemy stat multipliers.
const NG_LADDER = [
  { id: 'karen', level: 4 },
  { id: 'chad', level: 6 },
  { id: 'grandma', level: 8 },
  { id: 'rachel_boss', level: 9 },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
];
const MAXED_SHOP = { atk: 9, def: 9, maxHP: 60, spd: 6 };
function ngCfg(row, carried, laps) {
  const cfg = cfgFor(row);
  if (carried) {
    cfg.unlocked = new Set(Object.keys(PLAYER_ABILITIES));
    cfg.atkBonus = MAXED_SHOP.atk;
    cfg.defBonus = MAXED_SHOP.def;
    const base = buildPlayerStats(row.level);
    cfg.playerExtra = { maxHP: base.maxHP + MAXED_SHOP.maxHP, hp: base.maxHP + MAXED_SHOP.maxHP, spd: base.spd + MAXED_SHOP.spd };
  } else cfg.unlocked = unlockedAbilities(row.level);
  if (laps > 0) { cfg.ngPlus = true; cfg.ngPlusCount = laps; }
  return cfg;
}
function runNg(runs, keys) {
  console.log(`\n=== NG+ LAPS — ${runs} runs/cell, COMPETENT ===`);
  console.log("Ladder is correct when CARRY@NG+1 <= FRESH@NG. win% (rounds / Andrew HP left).");
  for (const vk of ['off', ...keys]) {
    console.log(`\n-- ${vk === 'off' ? 'turn-back OFF (Run C shipped)' : VARIANTS[vk].label} --`);
    console.log(header(['encounter'.padEnd(16), 'lvl'.padStart(4), 'FRESH@NG'.padStart(22), 'CARRY@NG+1'.padStart(22), 'CARRY@NG+2'.padStart(22), 'CARRY@NG+3'.padStart(22)]));
    for (const row of NG_LADDER) {
      const cells = [];
      const f = batchTB(ngCfg(row, false, 0), row.level, runs, vk);
      cells.push(`${pct(f.winRate)} (${n2(f.avgRounds)}/${pct(f.avgHpLeft)})`.padStart(22));
      for (const laps of [1, 2, 3]) {
        const r = batchTB(ngCfg(row, true, laps), row.level, runs, vk);
        cells.push(`${pct(r.winRate)} (${n2(r.avgRounds)}/${pct(r.avgHpLeft)})`.padStart(22));
      }
      console.log(header([row.id.padEnd(16), String(row.level).padStart(4), ...cells]));
    }
  }
}

// ── Enemy-side symmetry ─────────────────────────────────────────────────
// Andrew has no weakness field today and only 11 of 93 enemy abilities carry a
// tag, so symmetry is an AUTHORING change before it is a balance one. Modelled
// here by giving Andrew a weakness tag and letting a matching tagged enemy
// ability hand the enemy its turn back.
function runSymmetry(runs, variantKey) {
  const rows = [
    { id: 'karen', level: 4 }, { id: 'chad', level: 6 }, { id: 'grandma', level: 8 },
    { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  const taggedByEnemy = {};
  for (const id of Object.keys(ENEMY_STATS)) {
    const abil = ENEMY_STATS[id].abilities || [];
    const tags = abil.map(a => ENEMY_ABILITIES[a]?.tag).filter(Boolean);
    if (tags.length) taggedByEnemy[id] = tags;
  }
  console.log(`\n=== ENEMY-SIDE SYMMETRY — Andrew given weakness '${'social'}', ${runs} runs/cell ===`);
  console.log('Only 11 of 93 enemy abilities carry a tag today, so the enemy one-more is');
  console.log('mostly unreachable without an authoring pass. Enemies that CAN reach it:');
  for (const [id, tags] of Object.entries(taggedByEnemy)) console.log(`  ${id.padEnd(24)} ${[...new Set(tags)].join(',')}`);
  console.log(header(['\nencounter'.padEnd(19), 'lvl'.padStart(4), 'variant'.padStart(14), 'win'.padStart(8), 'rounds'.padStart(8), 'hp left'.padStart(9), 'enemy 1-mores'.padStart(14)]));
  for (const row of rows) {
    for (const mode of ['player only', 'both sides']) {
      const r = batchSym(cfgFor(row), row.level, runs, variantKey, mode === 'both sides');
      console.log(header([row.id.padEnd(19), String(row.level).padStart(4), mode.padStart(14),
        pct(r.winRate).padStart(8), n2(r.avgRounds).padStart(8), pct(r.avgHpLeft).padStart(9), n2(r.enemyOneMores).padStart(14)]));
    }
  }
}

function batchSym(cfg, level, runs, variantKey, enemySide) {
  const tb = VARIANTS[variantKey];
  const wrapped = tb ? turnBackPolicy(competentTurn) : competentTurn;
  let wins = 0, rounds = 0, hp = 0, one = 0;
  for (let i = 0; i < runs; i++) {
    let st = null;
    const r = runFight({ ...cfg, playerExtra: { weakness: 'social' } }, level, {
      policy: wrapped,
      onEngine: (e) => {
        st = instrument(e, tb);
        if (!enemySide) return;
        const realET = e.enemyTurn.bind(e);
        e.enemyTurn = (idx) => {
          const res = realET(idx);
          // A tagged enemy ability matching Andrew's weakness hands the turn
          // back to the enemy, once.
          const abilId = res && res.abilityId;
          const tag = abilId ? ENEMY_ABILITIES[abilId]?.tag : null;
          if (tag && tag === 'social' && res.damage > 0 && !e.isOver) { one++; realET(idx); }
          return res;
        };
      },
    });
    if (r.win) { wins++; rounds += r.rounds; hp += r.hpPct; }
  }
  const w = Math.max(1, wins);
  return { winRate: wins / runs, avgRounds: rounds / w, avgHpLeft: hp / w, enemyOneMores: one / runs };
}

// ── CLI ─────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { flags: new Set(), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { out.opts[key] = next; i++; } else out.flags.add(key);
  }
  return out;
}

const IS_CLI = !!(process.argv[1] && process.argv[1].split('\\').join('/').endsWith('_h-econ-turnback.mjs'));
const args = parseArgs(process.argv.slice(2));
const RUNS = parseInt(args.opts.runs || '300', 10);
const VK = args.opts.variant || 'R';
const ALL = ['a', 'b', 'c', 'd', 'd2', 'f', 'g', 'h', 'R'];

if (!IS_CLI) { /* imported as a library — run nothing */ }
else if (args.flags.has('baseline')) runBaseline(RUNS, args.opts.on || 'off');
else if (args.flags.has('variants')) runVariants(RUNS, (args.opts.keys || ALL.join(',')).split(','));
else if (args.flags.has('chains')) runChains(RUNS);
else if (args.flags.has('trade')) runTrade(RUNS, (args.opts.keys || 'a,b,R').split(','));
else if (args.flags.has('pip')) runPip(RUNS, VK, KNOBS.find(k => k.label === (args.opts.knob || 'none')));
else if (args.flags.has('knobs')) runKnobs(RUNS, VK);
else if (args.flags.has('symmetry')) runSymmetry(RUNS, VK);
else if (args.flags.has('ng')) runNg(RUNS, (args.opts.keys || 'RT,Rm,P4').split(','));
else if (args.flags.has('denial')) runDenial(RUNS, (args.opts.keys || 'a,b,RT,Rm35,P,X,F1').split(','));
else {
  runBaseline(RUNS, 'off');
  runVariants(RUNS, ALL);
}
