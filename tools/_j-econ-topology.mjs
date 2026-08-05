// _j-econ-topology.mjs — THROWAWAY harness for the J-run REWARD-TOPOLOGY lane.
//
// Question the producer asked: combat "tends toward simplicity (spam the enemy
// weakness)". This harness does not ask "is weakness too strong" — it asks
// "what does each VERB get PAID, and by whom". It wraps tools/combat-sim.mjs
// (the real CombatEngine, the real ENEMY_STATS / PLAYER_ABILITIES / balance.json)
// and expresses the proposed currency-graph rewrite as engine wrappers +
// per-lane player policies. Nothing in src/ is touched.
//
//   node tools/_j-econ-topology.mjs --graph      # today's payoff matrix, measured
//   node tools/_j-econ-topology.mjs --ladder     # baseline topology vs proposed, shipped policy
//   node tools/_j-econ-topology.mjs --lanes      # the five build lanes across the boss ladder
//   node tools/_j-econ-topology.mjs --spam       # weakness-share of actions + Break provenance
//   node tools/_j-econ-topology.mjs --denial     # effective enemy turns (the h-run budget)
//   node tools/_j-econ-topology.mjs --trade      # Objections vs Composure still inverted?
//   node tools/_j-econ-topology.mjs --pip        # CASUAL / PIP floor
//   node tools/_j-econ-topology.mjs --ng         # NG+ ladder correctness
//   node tools/_j-econ-topology.mjs --sweep      # bar scale x diminishing grid
//   node tools/_j-econ-topology.mjs --capstone   # the single-build One More (F1)
//   node tools/_j-econ-topology.mjs --day        # reception / roguelite spot-check
//   ... all accept --runs N

import {
  runFight, enc, competentTurn, casualTurn, naiveTurn,
  buildPartyOverrides, buildPlayerStats, unlockedAbilities,
  rollBraceQuality, NO_RELIC,
} from './combat-sim.mjs';
import { COMBAT_DEPTH } from '../src/combat/CombatEngine.js';
import { PLAYER_ABILITIES, ENEMY_ABILITIES, ENEMY_STATS, ITEMS } from '../src/data/stats.js';

const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);
const sgn = (x, f = n2) => (x >= 0 ? '+' : '') + f(x);

// ── D2 DATA ADDITIONS ───────────────────────────────────────────────────
// Registered onto the REAL PLAYER_ABILITIES / ITEMS objects so the real engine
// resolves them. This is the "DATA + MENU + BALANCE" shape the brief asks for:
// everything below is a row in src/data/stats.js, not engine surgery.
const NEW_ABILITIES = {
  conflict_of_interest: {
    name: 'Conflict of Interest', cost: 20, type: 'debuff', tag: 'legal',
    debuffAmount: { atk: -8 }, debuffDuration: 3,
    tier: 1, requires: 'file_motion', upgradePointCost: 1,
  },
  document_everything: {
    name: 'Document Everything', cost: 22, type: 'dot', tag: 'audit',
    power: 44, duration: 3,
    tier: 1, requires: 'spot_check', upgradePointCost: 1,
  },
  reply_all_thread: {
    name: 'Reply All', cost: 30, type: 'dot', tag: 'social',
    power: 56, duration: 3,
    tier: 2, requires: 'cc_all', upgradePointCost: 2,
  },
};
for (const [id, a] of Object.entries(NEW_ABILITIES)) PLAYER_ABILITIES[id] = a;

const NEW_ITEMS = {
  certified_mail:  { name: 'Certified Mail',  type: 'clear_lock', tag: 'legal'  },
  calendar_invite: { name: 'Calendar Invite', type: 'clear_lock', tag: 'social' },
  expense_report:  { name: 'Expense Report',  type: 'clear_lock', tag: 'audit'  },
};
for (const [id, it] of Object.entries(NEW_ITEMS)) ITEMS[id] = it;

// ── TOPOLOGY: the proposed currency graph, as a config ───────────────────
export const SHIPPED = {
  label: 'SHIPPED (Run C)',
  barScale: 1,
  exposeOnSuper: 0,
  braceClearsLock: 0,
  bracePerfectPct: 0.20,     // COMBAT_DEPTH.BRACE_COMPOSURE_STRIP as shipped
  braceGoodPct: 0,
  retaliateComposure: 0,
  braceReflect: null,
  retaliatePower: 22,
  attritionPerDebuff: 0,
  attritionMaxStacks: 2,
  playerDots: false,
  compoundAt: 0,
  compoundMult: 0,
  powerMoveBreaks: false,
  powerMovePower: 75,
  taggedItems: false,
  rotation: null,
  columnCap: null,
  capstoneF1: false,
};

export const D2 = {
  label: 'D2 FOUR LEDGERS',
  barScale: 1.0,             // M0  bar size UNCHANGED — the budget is paid by M6
  exposeOnSuper: 1,          // M1  a super sets exposed=1 (x1.3 for the rest of the turn)
  braceClearsLock: 1,        // M2a perfect Brace clears one Objection, any tag
  bracePerfectPct: 0.25,     // M2b perfect Brace strips 25% of the bar (was 20%)
  braceGoodPct: 0.12,        //     ...and a GOOD brace now strips 12%
  retaliateComposure: 40,    // M2c Retaliate strips 40 x QTE multiplier, untagged
  braceReflect: { good: 0.35, perfect: 0.60 },  // M2d TURNABOUT — a braced hit is
                             //     reflected. The only damage in the game that scales
                             //     off the ENEMY's attack instead of Andrew's.
  retaliatePower: 30,        // M2e Retaliate base power 22 -> 30
  attritionPerDebuff: 12,    // M3a enemy turn-start: -12 composure per active debuff
  attritionMaxStacks: 2,
  playerDots: true,          // M3b player-side DoTs
  compoundAt: 2,             // M3c COMPOUNDING — DoTs tick x1.5 on a target carrying
  compoundMult: 0.5,         //     2+ debuff stacks. The Paperwork lane's earned x1.5.
  powerMoveBreaks: true,     // M4a Assert Dominance strips the POLITICS column outright
  powerMovePower: 75,        //     Raw power UNCHANGED. The first pass cut it to 55 to
                             //     "pay" for the strip and the PIP sweep caught it
                             //     immediately: CASUAL is the one policy that DOES use
                             //     Assert Dominance, so the cut landed entirely on the
                             //     casual floor (karen@3 60.7% -> 36.7% at 0 deaths).
  taggedItems: true,         // M5  tagged consumables clear an Objection
  columnCap: 0.70,           // M6  THE 70% RULE: no single COLUMN may contribute more
                             //     than 70% of a Composure bar per cycle, so a Break
                             //     always takes at least two columns
  rotation: null,
  capstoneF1: false,         // M7  off unless the Litigation capstone is bought
};

// THE FOUR COLUMNS. Every route into Composure belongs to exactly one, and the
// 70% rule is enforced per column, not per route — so Brace and Retaliate share
// a budget (they are one lane), and so do Assert Dominance and tagged items.
export const COLUMN_OF = {
  weakness:   'PRESSURE',
  brace:      'PROCEDURE',
  retaliate:  'PROCEDURE',
  attrition:  'PAPERWORK',
  power_move: 'POLITICS',
  item:       'POLITICS',
};
const ACTIVE_COLUMNS = new Set(['weakness', 'brace', 'retaliate', 'power_move', 'item']);

function variantOf(base, over) { return { ...base, ...over }; }

// ── Bar scale is a GLOBAL (read at enemy construction) ───────────────────
const BAR_SAVE = {};
function applyBar(top) {
  BAR_SAVE.min = COMBAT_DEPTH.COMPOSURE_MIN;
  BAR_SAVE.max = COMBAT_DEPTH.COMPOSURE_MAX;
  BAR_SAVE.step = COMBAT_DEPTH.COMPOSURE_STEP;
  BAR_SAVE.brace = COMBAT_DEPTH.BRACE_COMPOSURE_STRIP;
  const s = top.barScale;
  COMBAT_DEPTH.COMPOSURE_MIN = Math.round(BAR_SAVE.min * s);
  COMBAT_DEPTH.COMPOSURE_MAX = Math.round(BAR_SAVE.max * s);
  COMBAT_DEPTH.COMPOSURE_STEP = Math.round(BAR_SAVE.step * s);
  COMBAT_DEPTH.BRACE_COMPOSURE_STRIP = top.bracePerfectPct;
}
function clearBar() {
  if (BAR_SAVE.min === undefined) return;
  COMBAT_DEPTH.COMPOSURE_MIN = BAR_SAVE.min;
  COMBAT_DEPTH.COMPOSURE_MAX = BAR_SAVE.max;
  COMBAT_DEPTH.COMPOSURE_STEP = BAR_SAVE.step;
  COMBAT_DEPTH.BRACE_COMPOSURE_STRIP = BAR_SAVE.brace;
  delete BAR_SAVE.min;
}

// ── Engine wrapping: the topology, expressed where it would actually live ──
function wire(engine, top, passives, st) {
  engine._top = top;
  engine._pass = passives;
  engine._pendingTag = null;
  engine._src = null;              // provenance of the current composure spend
  engine._superStreak = new Map(); // enemyIndex -> { tag, n }
  engine._f1spent = new Set();

  // --- _reduceComposure: provenance + diminishing pressure ---------------
  const realRC = engine._reduceComposure.bind(engine);
  engine._reduceComposure = (t, amt) => {
    const src = engine._src || 'weakness';
    let amount = amt;
    // M6 — THE 70% RULE. Each COLUMN may contribute at most `columnCap` of the
    // bar per cycle, so no single argument ever closes it: a Break always takes
    // at least two columns. The ledger resets when the bar refills.
    const col = COLUMN_OF[src] || 'PRESSURE';
    if (top.columnCap && col !== 'PAPERWORK') {
      if (!t._colSpent) t._colSpent = {};
      const capAmt = Math.round((t.maxComposure || 0) * top.columnCap);
      const allowed = Math.max(0, capAmt - (t._colSpent[col] || 0));
      amount = Math.min(amount, allowed);
      if (amount <= 0) return { broke: false, amount: 0, capped: true };
    }
    // (legacy rotation knob, kept so --sweep can A/B the two shapes)
    if (top.rotation && ACTIVE_COLUMNS.has(src)) {
      if (t._lastColumn === col) amount = Math.max(1, Math.floor(amount * top.rotation));
      t._lastColumn = col;
    }
    const r = realRC(t, amount);
    if (top.columnCap && r.amount > 0 && col !== 'PAPERWORK') {
      if (!t._colSpent) t._colSpent = {};
      t._colSpent[col] = (t._colSpent[col] || 0) + r.amount;
    }
    if (r.amount > 0 || r.broke) {
      st.compBySrc[src] = (st.compBySrc[src] || 0) + r.amount;
      if (r.broke) {
        st.breakBySrc[src] = (st.breakBySrc[src] || 0) + 1; st.breaks++;
        t._lastColumn = null; t._colSpent = {};
      }
    }
    return r;
  };

  // --- player action wrappers -------------------------------------------
  const noteSuper = (r) => {
    if (!r) return false;
    return r.effective === 'super' || (r.hits || []).some(h => h.effective === 'super');
  };

  const wrapAction = (name, tagOf) => {
    const real = engine[name].bind(engine);
    engine[name] = (...args) => {
      engine._pendingTag = tagOf(...args);
      engine._src = 'weakness';
      const r = real(...args);
      engine._src = null;
      if (r) {
        st.actions++;
        if (engine._pendingTag) st.taggedActions++;
        const sup = noteSuper(r);
        if (sup) {
          st.supers++;
          const ti = r.targetIndex ?? 0;
          // diminishing bookkeeping: same tag on consecutive Andrew turns
          const rec = engine._superStreak.get(ti);
          if (rec && rec.tag === engine._pendingTag) rec.n++;
          else engine._superStreak.set(ti, { tag: engine._pendingTag, n: 1 });
          // M1 — the crack is open
          if (top.exposeOnSuper > 0) {
            const t = engine.enemies[ti];
            if (t && t.hp > 0) t.exposed = Math.max(t.exposed || 0, top.exposeOnSuper);
          }
        } else if (engine._pendingTag) {
          // a non-super tagged hit resets the streak: the ledger heard a new column
          const ti = r.targetIndex ?? 0;
          engine._superStreak.delete(ti);
        }
      }
      engine._pendingTag = null;
      return r;
    };
  };
  wrapAction('playerAttack', () => null);
  wrapAction('playerAbility', (id) => PLAYER_ABILITIES[id]?.tag || null);

  // --- p_paper_trail: "The File Is Already Open" — upkeep costs 40% less Coffee
  if (passives.has('p_paper_trail')) {
    const realAb0 = engine.playerAbility.bind(engine);
    engine.playerAbility = (id, ti) => {
      const a = PLAYER_ABILITIES[id];
      if (!a || (a.type !== 'debuff' && a.type !== 'dot')) return realAb0(id, ti);
      const full = a.cost;
      a.cost = Math.round(full * 0.6);
      try { return realAb0(id, ti); } finally { a.cost = full; }
    };
  }

  // --- M3b: player-side DoTs (the engine has no `dot` case on the player path)
  if (top.playerDots) {
    const realAb = engine.playerAbility.bind(engine);
    engine.playerAbility = (id, ti) => {
      const a = PLAYER_ABILITIES[id];
      if (!a || a.type !== 'dot') return realAb(id, ti);
      if (engine.player.mp < a.cost) return null;
      engine.player.mp -= a.cost;
      const target = engine.enemies[ti ?? engine.targetEnemyIndex] || engine.enemy;
      if (!target || target.hp <= 0) return null;
      target.dots.push({ damage: a.power, duration: a.duration, name: a.name });
      const cleared = engine._clearLocks(target, a.tag);
      st.actions++; st.taggedActions++; st.dotsApplied++;
      // a fresh column billed: the pressure streak resets
      engine._superStreak.delete(engine.enemies.indexOf(target));
      return { type: 'dot', abilityName: a.name, targetIndex: engine.enemies.indexOf(target), locksCleared: cleared };
    };
  }

  // --- M2a/M2b: the Deflection lane -------------------------------------
  const realBrace = engine.playerBrace.bind(engine);
  engine.playerBrace = (q) => {
    engine._src = 'brace';
    engine._braceQuality = q;
    const r = realBrace(q);
    // M2b — a GOOD brace now strips too (the engine only pays `perfect`).
    if (q === 'good' && top.braceGoodPct > 0) {
      const t = engine.enemy;
      if (t && t.hp > 0 && t.maxComposure > 0 && t.broken <= 0) {
        engine._reduceComposure(t, Math.max(1, Math.round(t.maxComposure * top.braceGoodPct)));
      }
    }
    engine._src = null;
    st.actions++; st.braces++;
    if (q === 'perfect') st.perfectBraces++;
    const n = (q === 'perfect')
      ? (passives.has('p_thick_skin') ? 2 : top.braceClearsLock)
      : (passives.has('p_thick_skin') && q === 'good' ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const t = engine.enemy;
      if (!t || t.sealed || !Array.isArray(t.locks)) break;
      const lk = t.locks.find(l => !l.cleared);
      if (!lk) break;
      lk.cleared = true;
      st.locksClearedOffTag++;
    }
    return r;
  };

  const realRet = engine.playerRetaliate.bind(engine);
  engine.playerRetaliate = (mult, ti) => {
    const tgtBefore = engine.enemies[ti ?? engine.targetEnemyIndex];
    const hpBefore = tgtBefore ? tgtBefore.hp : 0;
    const r = realRet(mult, ti);
    if (r && top.retaliatePower !== 22 && tgtBefore) {
      // repriced base power 22 -> retaliatePower, applied as a post-scale so the
      // rest of the pipeline (crit, band, thorns) is untouched
      const dealt = hpBefore - tgtBefore.hp;
      const scale = (engine._getEffective(engine.player).atk + top.retaliatePower)
                  / (engine._getEffective(engine.player).atk + 22);
      const extra = Math.max(0, Math.round(dealt * (scale - 1)));
      tgtBefore.hp = Math.max(0, tgtBefore.hp - extra);
      engine._checkVictory();
    }
    if (r) {
      st.actions++; st.retaliates++;
      const strip = top.retaliateComposure * (passives.has('p_last_word') ? 1.8 : 1);
      if (strip > 0) {
        const t = engine.enemies[r.targetIndex ?? engine.targetEnemyIndex];
        if (t && t.hp > 0) {
          engine._src = 'retaliate';
          engine._reduceComposure(t, Math.round(strip * Math.max(0.4, mult)));
          engine._src = null;
        }
      }
    }
    return r;
  };

  // --- M3a: attrition on the enemy's own turn start ----------------------
  const realPTS = engine.processTurnStart.bind(engine);
  engine.processTurnStart = (who) => {
    const ent = (who === 'player') ? engine.player : (who === 'enemy' ? engine.enemy : who);
    const isEnemy = ent && engine.enemies.includes(ent);
    if (isEnemy && top.attritionPerDebuff > 0 && ent.hp > 0) {
      const stacks = Math.min(
        top.attritionMaxStacks,
        (ent.buffs || []).filter(b => Object.values(b.stats).some(v => v < 0)).length
      );
      if (stacks > 0) {
        const per = passives.has('p_paper_trail') ? 16 : top.attritionPerDebuff;
        engine._src = 'attrition';
        // The paperwork does not care that they closed ranks: attrition is the
        // only Composure route that works through a SEAL.
        const wasSealed = ent.sealed; ent.sealed = false;
        engine._reduceComposure(ent, per * stacks);
        ent.sealed = wasSealed;
        engine._src = null;
        if (passives.has('p_paper_trail')) {
          engine.player.mp = Math.min(engine.player.maxMP, engine.player.mp + 3 * stacks);
        }
      }
    }
    // M3c — COMPOUNDING. Interest accrues: a DoT on a target already carrying
    // `compoundAt` debuff stacks ticks 50% harder. This is the Paperwork lane's
    // earned x1.5 — the same size as the weakness bonus, bought with setup turns
    // instead of with a tag.
    if (isEnemy && top.compoundAt && ent.hp > 0 && ent.dots?.length) {
      const negs = (ent.buffs || []).filter(b => Object.values(b.stats).some(v => v < 0)).length;
      if (negs >= top.compoundAt) {
        for (const d of ent.dots) {
          const extra = Math.floor(d.damage * 0.7 * top.compoundMult);
          ent.hp = Math.max(0, ent.hp - extra);
          st.compoundDamage += extra;
        }
      }
    }
    // p_statute_of_limitations: DoTs tick twice on a Broken target
    if (isEnemy && passives.has('p_statute_of_limitations') && ent.broken > 0 && ent.dots?.length) {
      for (const d of ent.dots) ent.hp = Math.max(0, ent.hp - Math.floor(d.damage * 0.7));
    }
    if (ent === engine.player) {
      engine._superStreakTurn = true;
      engine.player.parallelUsedThisTurn = false;
      engine.player.pressAdvantageUses = 0;
    }
    return realPTS(who);
  };

  // --- M4a: Assert Dominance is a Break button ---------------------------
  const realPM = engine.playerPowerMove.bind(engine);
  engine.playerPowerMove = (ti) => {
    if (!top.powerMoveBreaks) {
      const r = realPM(ti);
      if (r) { st.actions++; st.powerMoves++; }
      return r;
    }
    if (engine.player.momentum < 100) return null;
    const target = engine.enemies[ti ?? engine.targetEnemyIndex] || engine.enemy;
    if (!target || target.hp <= 0) return null;
    const pAtk = engine._getEffective(engine.player).atk;
    let damage = Math.max(10, Math.floor((pAtk + top.powerMovePower) * 1.5 + (Math.random() * 10 - 5)));
    target.hp = Math.max(0, target.hp - damage);
    engine.player.momentum = 0;
    if (target.hp > 0 && target.composure > 0 && !target.sealed && target.broken <= 0) {
      engine._src = 'power_move';
      // Assert Dominance strips the POLITICS column's whole budget in one swing.
      engine._reduceComposure(target, Math.round(target.maxComposure * (top.columnCap || 1)));
      engine._src = null;
    }
    engine._checkVictory();
    st.actions++; st.powerMoves++;
    return { type: 'power_move', damage, targetIndex: engine.enemies.indexOf(target) };
  };

  // --- M5: tagged consumables clear an Objection -------------------------
  const realItem = engine.playerItem.bind(engine);
  engine.playerItem = (id) => {
    const it = ITEMS[id];
    if (top.taggedItems && it && it.type === 'clear_lock') {
      const t = engine.enemy;
      let cleared = 0;
      if (t && !t.sealed && Array.isArray(t.locks)) {
        const lk = t.locks.find(l => !l.cleared && l.tag === it.tag);
        if (lk) { lk.cleared = true; cleared = 1; st.locksClearedOffTag++; }
      }
      st.itemsUsed++;
      if (passives.has('p_corporate_card') && t && t.hp > 0) {
        engine._src = 'item';
        engine._reduceComposure(t, 15);
        engine._src = null;
      }
      return { type: 'item', itemName: it.name, locksCleared: cleared };
    }
    const r = realItem(id);
    if (r) {
      st.itemsUsed++;
      if (passives.has('p_corporate_card')) {
        const t = engine.enemy;
        if (t && t.hp > 0) { engine._src = 'item'; engine._reduceComposure(t, 15); engine._src = null; }
      }
    }
    return r;
  };

  // --- momentum passive --------------------------------------------------
  if (passives.has('p_political_capital')) {
    const realGM = engine._gainMomentum.bind(engine);
    engine._gainMomentum = (a) => realGM(Math.round(a * 1.25));
  }

  // --- press advantage counter (for p_open_door) -------------------------
  const realPA = engine.playerPressAdvantage.bind(engine);
  engine.playerPressAdvantage = (ti) => {
    if (passives.has('p_open_door') && (engine.player.pressAdvantageUses || 0) < 2) {
      engine.player.pressAdvantageUsedThisTurn = false;
    }
    const r = realPA(ti);
    if (r) { engine.player.pressAdvantageUses = (engine.player.pressAdvantageUses || 0) + 1; st.pressAdv++; }
    return r;
  };

  // --- instrumentation on enemy turns -----------------------------------
  const realET = engine.enemyTurn.bind(engine);
  engine.enemyTurn = (i) => {
    const e = engine.enemies[i];
    const locks = (e && Array.isArray(e.locks)) ? e.locks : [];
    st.locksSeen += locks.length;
    st.locksCleared += locks.filter(l => l.cleared).length;
    const q = engine._braceQuality;
    const r = realET(i);
    if (r && r.type === 'fizzle') st.fizzles++;
    if (r && r.type === 'broken') st.brokenTurns++;
    // M2d — TURNABOUT. A braced hit comes back at the sender.
    if (r && r.braced && top.braceReflect && e && e.hp > 0) {
      const pctBack = top.braceReflect[q === 'perfect' ? 'perfect' : 'good'] || 0;
      const back = Math.max(1, Math.round((r.damage || 0) * 2 * pctBack));
      e.hp = Math.max(0, e.hp - back);
      st.reflected += back;
      engine._checkVictory();
    }
    if (r && r.braced) engine._braceQuality = null;
    return r;
  };
  const realLI = engine.playerLoopIn.bind(engine);
  engine.playerLoopIn = (...a) => { const r = realLI(...a); if (r) st.loopIns++; return r; };
}

function freshStats() {
  return {
    actions: 0, taggedActions: 0, supers: 0, breaks: 0, braces: 0, perfectBraces: 0,
    retaliates: 0, powerMoves: 0, pressAdv: 0, itemsUsed: 0, dotsApplied: 0,
    locksSeen: 0, locksCleared: 0, locksClearedOffTag: 0, fizzles: 0, brokenTurns: 0, reflected: 0, compoundDamage: 0,
    loopIns: 0, compBySrc: {}, breakBySrc: {},
  };
}

// ── BUILDS — same upgrade-point spend, different shapes ──────────────────
const FREE = ['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check'];

// [abilityOrPassive, pointCost] in purchase order. Points available = level - 1.
const LANES = {
  baseline: { label: 'BASELINE (shipped kit)', buy: null },
  litigator: {
    label: 'LITIGATOR  (weakness / burst)',
    buy: [['cite_precedent', 1, 1], ['due_diligence', 1, 1], ['p_zealous_advocacy', 1, 1],
          ['per_my_last_email', 2, 2], ['whistleblower', 2, 3], ['p_no_further_questions', 3, 3]],
  },
  deflector: {
    label: 'DEFLECTOR  (brace / counter)',
    buy: [['cite_precedent', 1, 1], ['p_thick_skin', 1, 1], ['due_diligence', 1, 1],
          ['conflict_of_interest', 1, 1], ['fiduciary_shield', 1, 2], ['forensic_audit', 2, 2],
          ['p_last_word', 3, 3]],
  },
  accrual: {
    label: 'ACCRUAL    (debuff / paperwork)',
    buy: [['due_diligence', 1, 1], ['document_everything', 1, 1], ['conflict_of_interest', 1, 1],
          ['forensic_audit', 2, 2], ['p_paper_trail', 1, 2], ['cc_all', 1, 1],
          ['reply_all_thread', 2, 2], ['p_statute_of_limitations', 3, 3]],
  },
  escalator: {
    label: 'ESCALATOR  (momentum / tempo)',
    buy: [['cite_precedent', 1, 1], ['p_political_capital', 1, 1], ['due_diligence', 1, 1],
          ['cc_all', 1, 1], ['forensic_audit', 2, 2], ['p_open_door', 3, 3]],
  },
  logistician: {
    label: 'LOGISTICIAN(items / supply)',
    buy: [['due_diligence', 1, 1], ['p_expense_account', 1, 1], ['cite_precedent', 1, 1],
          ['fiduciary_shield', 1, 2], ['forensic_audit', 2, 2], ['p_corporate_card', 3, 3]],
  },
};
// TIER GATE (a D2 proposal in its own right — the shipped tree has none, so a
// L4 player with 3 points can already buy Per My Last Email, a 55-power tier-2
// nuke, which is a documented power spike this harness reproduces).
//   tier 1 from level 2, tier 2 from level 6, tier 3 from level 10.
const TIER_LEVEL = { 1: 2, 2: 6, 3: 10 };
const PASSIVE_IDS = new Set([
  'p_zealous_advocacy', 'p_no_further_questions', 'p_thick_skin', 'p_last_word',
  'p_paper_trail', 'p_statute_of_limitations', 'p_political_capital', 'p_open_door',
  'p_expense_account', 'p_corporate_card',
]);

export function buildFor(lane, level) {
  if (lane === 'baseline' || !LANES[lane].buy) {
    return { unlocked: unlockedAbilities(level), passives: new Set(), points: level - 1 };
  }
  let budget = level - 1;
  const unlocked = new Set(FREE);
  const passives = new Set();
  for (const [id, cost, tier] of LANES[lane].buy) {
    if (level < (TIER_LEVEL[tier] || 2)) continue;
    if (cost > budget) continue;
    budget -= cost;
    if (PASSIVE_IDS.has(id)) passives.add(id); else unlocked.add(id);
  }
  if (level >= 9) { unlocked.add('notarized_strike'); unlocked.add('root_access'); }
  return { unlocked, passives, points: (level - 1) - budget };
}

// ── POLICIES ────────────────────────────────────────────────────────────
function pickTargetIndex(engine) {
  let best = -1, bestHp = Infinity, bestAtk = -1;
  engine.enemies.forEach((e, i) => {
    if (e.hp <= 0) return;
    if (e.hp < bestHp || (e.hp === bestHp && e.atk > bestAtk)) { best = i; bestHp = e.hp; bestAtk = e.atk; }
  });
  return best;
}
function attackAbilities(unlocked, mp) {
  const out = [];
  for (const id of unlocked) {
    const a = PLAYER_ABILITIES[id];
    if (!a || (a.type !== 'attack' && a.type !== 'attack_aoe')) continue;
    if (mp < a.cost) continue;
    out.push(id);
  }
  return out;
}
function bestTagged(engine, unlocked, tag) {
  let best = null;
  for (const id of attackAbilities(unlocked, engine.player.mp)) {
    const a = PLAYER_ABILITIES[id];
    if (a.tag !== tag) continue;
    if (!best || a.power > PLAYER_ABILITIES[best].power) best = id;
  }
  return best;
}
function anyTagged(engine, unlocked, tag) {
  const atk = bestTagged(engine, unlocked, tag);
  if (atk) return atk;
  for (const id of unlocked) {
    const a = PLAYER_ABILITIES[id];
    if (!a || a.tag !== tag) continue;
    if ((a.type === 'debuff' || a.type === 'dot') && engine.player.mp >= a.cost) return id;
  }
  return null;
}
function openLockTag(engine, target, unlocked, items) {
  if (!target || target.sealed) return null;
  const locks = (target.locks || []).filter(l => !l.cleared);
  if (locks.length === 0) return null;
  const sorted = [...locks].sort((a, b) => (b.tag === target.weakness ? 1 : 0) - (a.tag === target.weakness ? 1 : 0));
  for (const l of sorted) if (anyTagged(engine, unlocked, l.tag)) return l.tag;
  return null;
}
function lockItemFor(engine, target, items) {
  if (!target || target.sealed) return null;
  const locks = (target.locks || []).filter(l => !l.cleared);
  for (const l of locks) {
    for (const [id, n] of Object.entries(items)) {
      if (n > 0 && ITEMS[id]?.type === 'clear_lock' && ITEMS[id].tag === l.tag) return id;
    }
  }
  return null;
}
function biggestIncomingPower(engine) {
  let biggest = null;
  for (const e of engine.enemies) {
    if (e.hp <= 0 || !e.telegraphedAbility) continue;
    const a = ENEMY_ABILITIES[e.telegraphedAbility];
    if (a && (a.type === 'attack' || a.type === 'summon')) {
      const pw = a.power ?? 0;
      if (biggest === null || pw > biggest) biggest = pw;
    }
  }
  return biggest;
}
function estimateBiggestIncoming(engine) {
  let worst = 0;
  const pDef = engine._getEffective(engine.player).def;
  for (const e of engine.enemies) {
    if (e.hp <= 0 || !e.telegraphedAbility) continue;
    const a = ENEMY_ABILITIES[e.telegraphedAbility];
    if (!a || (a.type !== 'attack' && a.type !== 'summon')) continue;
    const est = Math.max(1, Math.floor((engine._getEffective(e).atk + (a.power ?? 0)) * 1.5 - pDef * 0.5));
    if (est > worst) worst = est;
  }
  return worst;
}
function rollRetaliate() {
  let c = 0;
  for (let i = 0; i < 4; i++) if (Math.random() < 0.9) c++;
  return 1.0 * (c / 4);
}
function hasDot(target, name) { return (target.dots || []).some(d => d.name === name); }
function hasDebuff(target, name) { return (target.buffs || []).some(b => b.name === name); }

export function makeLanePolicy(lane) {
  return (engine, sim, unlocked) => {
    engine.telegraph();
    const p = engine.player;
    const ti = pickTargetIndex(engine);
    if (ti < 0) return;
    const target = engine.enemies[ti];
    const hpRatio = p.hp / p.maxHP;
    const pass = sim.passives || new Set();
    const items = sim.items || {};
    const wasBrace = sim.justBraced;
    sim.justBraced = false;

    // ---- FREE ACTIONS -------------------------------------------------
    const paCost = engine.getPressAdvantageCost();
    const paLimit = pass.has('p_open_door') ? 2 : 1;
    // The Escalation lane banks toward the guaranteed Break instead of bleeding
    // momentum into tempo — that is the whole shape of the build.
    const paCeiling = (lane === 'escalator') ? 75 : 1000;
    while (p.momentum >= paCost && p.momentum < paCeiling && hpRatio >= 0.55 && (p.pressAdvantageUses || 0) < paLimit) {
      const before = p.pressAdvantageUses || 0;
      engine.playerPressAdvantage(ti);
      if (engine.isOver) return;
      if ((p.pressAdvantageUses || 0) === before) break;
    }
    // Logistics: p_expense_account — one item per turn is a free action.
    if (pass.has('p_expense_account') && !p.itemFreeUsedThisFight) {
      const li = lockItemFor(engine, target, items);
      if (li) { items[li]--; p.itemFreeUsedThisFight = true; engine.playerItem(li); }
      else if (hpRatio < 0.55 && (items.stress_ball || 0) > 0) {
        items.stress_ball--; p.itemFreeUsedThisFight = true; engine.playerItem('stress_ball');
      } else if (p.mp < 30 && (items.coffee_large || 0) > 0) {
        items.coffee_large--; p.itemFreeUsedThisFight = true; engine.playerItem('coffee_large');
      }
    }
    // Escalation: PARALLEL TRACK — 60 momentum buys one free item action.
    if (lane === 'escalator' && p.momentum >= 60 && !p.parallelUsedThisTurn) {
      const want = (hpRatio < 0.5 && (items.stress_ball || 0) > 0) ? 'stress_ball'
        : (p.mp < 25 && (items.coffee_large || 0) > 0) ? 'coffee_large' : null;
      if (want) { items[want]--; p.momentum -= 60; p.parallelUsedThisTurn = true; engine.playerItem(want); }
    }

    // ---- MAIN ACTION ---------------------------------------------------
    const est = estimateBiggestIncoming(engine);
    const healNeeded = hpRatio < 0.35 || p.hp < est * 1.1 + 10;
    const biggest = biggestIncomingPower(engine);

    if (hpRatio < 0.40 && p.momentum >= 50 && lane !== 'escalator') { engine.playerSecondWind(); return finish(engine); }
    if (hpRatio < 0.32 && p.momentum >= 50 && lane === 'escalator') { engine.playerSecondWind(); return finish(engine); }
    if (healNeeded && !p.silencedThisTurn) {
      if (unlocked.has('power_of_attorney') && p.mp >= PLAYER_ABILITIES.power_of_attorney.cost && p.maxHP - p.hp > 90) {
        engine.playerAbility('power_of_attorney'); return finish(engine);
      }
      if (p.mp >= PLAYER_ABILITIES.coffee_break.cost) { engine.playerAbility('coffee_break'); return finish(engine); }
      if ((items.stress_ball || 0) > 0) { items.stress_ball--; engine.playerItem('stress_ball'); return finish(engine); }
    }
    if (p.momentum >= 100) { engine.playerPowerMove(ti); return finish(engine); }
    if (engine.counterActive) { engine.playerAttack(ti); return finish(engine); }

    const lockTag = p.silencedThisTurn ? null : openLockTag(engine, target, unlocked, items);
    const weak = p.silencedThisTurn ? null : bestTagged(engine, unlocked, target.weakness);

    switch (lane) {
      case 'litigator': {
        // even a burst player reads the heavy telegraph
        if (lockTag && biggest !== null && biggest >= 26) {
          engine.playerAbility(anyTagged(engine, unlocked, lockTag), ti); return finish(engine);
        }
        if (!p.bracing && !wasBrace && biggest !== null && biggest >= 30) {
          engine.playerBrace(rollBraceQuality(sim.relic.braceWindow, sim.relic.aim));
          sim.justBraced = true; return finish(engine);
        }
        if (weak) { engine.playerAbility(weak, ti); return finish(engine); }
        if (lockTag) { engine.playerAbility(anyTagged(engine, unlocked, lockTag), ti); return finish(engine); }
        break;
      }
      case 'deflector': {
        if (p.retaliateReady) { engine.playerRetaliate(rollRetaliate(), ti); return finish(engine); }
        if (!p.bracing && !wasBrace && biggest !== null && biggest >= 14) {
          engine.playerBrace(rollBraceQuality(sim.relic.braceWindow, sim.relic.aim));
          sim.justBraced = true; return finish(engine);
        }
        if (lockTag) { engine.playerAbility(anyTagged(engine, unlocked, lockTag), ti); return finish(engine); }
        if (weak) { engine.playerAbility(weak, ti); return finish(engine); }
        break;
      }
      case 'accrual': {
        // Upkeep, not churn: one DoT and two debuff stacks is the whole engine.
        // Anything beyond that is a wasted turn, so the lane goes back to hitting.
        const dots = (target.dots || []).length;
        const negs = (target.buffs || []).filter(b => Object.values(b.stats).some(v => v < 0)).length;
        const upkeepOk = (id) => p.mp >= Math.round(PLAYER_ABILITIES[id].cost * (pass.has('p_paper_trail') ? 0.6 : 1)) + 20;
        if (dots < 2 && !p.silencedThisTurn) {
          for (const id of ['reply_all_thread', 'document_everything']) {
            if (unlocked.has(id) && upkeepOk(id) && !hasDot(target, PLAYER_ABILITIES[id].name)) {
              engine.playerAbility(id, ti); return finish(engine);
            }
          }
        }
        if (negs < 2 && !p.silencedThisTurn) {
          for (const id of ['due_diligence', 'conflict_of_interest']) {
            if (unlocked.has(id) && upkeepOk(id) && !hasDebuff(target, PLAYER_ABILITIES[id].name)) {
              engine.playerAbility(id, ti); return finish(engine);
            }
          }
        }
        if (lockTag) { engine.playerAbility(anyTagged(engine, unlocked, lockTag), ti); return finish(engine); }
        if (weak) { engine.playerAbility(weak, ti); return finish(engine); }
        break;
      }
      case 'escalator': {
        if (p.momentum >= 60 && p.momentum < 100 && hpRatio > 0.55 && (biggest === null || biggest < 26) && unlocked.has('stall')) {
          engine.playerAbility('stall'); return finish(engine);
        }
        if (lockTag) { engine.playerAbility(anyTagged(engine, unlocked, lockTag), ti); return finish(engine); }
        if (weak) { engine.playerAbility(weak, ti); return finish(engine); }
        break;
      }
      case 'logistician': {
        const li = lockItemFor(engine, target, items);
        if (li && !pass.has('p_expense_account')) { items[li]--; engine.playerItem(li); return finish(engine); }
        if (lockTag) { engine.playerAbility(anyTagged(engine, unlocked, lockTag), ti); return finish(engine); }
        if (weak) { engine.playerAbility(weak, ti); return finish(engine); }
        break;
      }
    }
    // shared fallbacks
    if (!p.bracing && !wasBrace && biggest !== null && (biggest >= 30 || (biggest >= 20 && hpRatio < 0.5))) {
      engine.playerBrace(rollBraceQuality(sim.relic.braceWindow, sim.relic.aim));
      sim.justBraced = true; return finish(engine);
    }
    if (p.retaliateReady) { engine.playerRetaliate(rollRetaliate(), ti); return finish(engine); }
    if (!p.silencedThisTurn && engine.aliveEnemies().length >= 3 && unlocked.has('cc_all') && p.mp >= PLAYER_ABILITIES.cc_all.cost) {
      engine.playerAbility('cc_all', ti); return finish(engine);
    }
    if ((items.coffee_large || 0) > 0 && p.mp < 30) { items.coffee_large--; engine.playerItem('coffee_large'); return finish(engine); }
    if (hpRatio < 0.25) { engine.playerDesperateGamble('safe', ti); return finish(engine); }
    engine.playerAttack(ti);
    return finish(engine);
  };
}

function finish(engine) {
  // M7 capstone: FIRST weakness hit per enemy per fight returns a full action.
  const top = engine._top, pass = engine._pass;
  if (top?.capstoneF1 && pass?.has('p_no_further_questions') && !engine.isOver) {
    const ti = engine._lastSuperTarget;
    if (ti !== undefined && ti !== null && !engine._f1spent.has(ti)) {
      engine._f1spent.add(ti);
      engine._f1pending = true;
    }
  }
  const c = engine.getLoopInCandidates();
  if (c.length > 0) engine.playerLoopIn(c[0]);
}

// Capstone wrapper: re-enter the policy once per enemy after its first super.
function capstoneWrap(inner) {
  return (engine, sim, unlocked) => {
    const before = engine._f1spent ? engine._f1spent.size : 0;
    engine._lastSuperTarget = null;
    const track = (name) => {
      const real = engine[name].bind(engine);
      engine[name] = (...a) => {
        const r = real(...a);
        if (r && (r.effective === 'super' || (r.hits || []).some(h => h.effective === 'super'))) {
          engine._lastSuperTarget = r.targetIndex ?? 0;
        }
        return r;
      };
      return real;
    };
    const rA = track('playerAttack'), rB = track('playerAbility');
    try { inner(engine, sim, unlocked); } finally { engine.playerAttack = rA; engine.playerAbility = rB; }
    if (engine._f1pending && !engine.isOver) {
      engine._f1pending = false;
      inner(engine, sim, unlocked);
    }
  };
}

// ── BATCH ───────────────────────────────────────────────────────────────
export function batchJ(cfg, level, runs, top, lane, policyOverride = null) {
  applyBar(top);
  const build = buildFor(lane, level);
  const agg = {
    wins: 0, rounds: 0, hp: 0, timeouts: 0,
    st: freshStats(), enemyHp: 0,
  };
  const base = makeLanePolicy(lane);
  const policy = policyOverride
    || (top.capstoneF1 && build.passives.has('p_no_further_questions') ? capstoneWrap(base) : base);
  for (let i = 0; i < runs; i++) {
    const st = freshStats();
    const items = lane === 'logistician'
      ? { coffee_large: 2, stress_ball: 2, certified_mail: 1, calendar_invite: 1, expense_report: 1 }
      : { coffee_large: 2, stress_ball: 0 };
    const r = runFight({ ...cfg, unlocked: cfg.carryAll ? new Set(Object.keys(PLAYER_ABILITIES)) : build.unlocked, coffees: 2 }, level, {
      policy: (e, sim, un) => {
        sim.passives = build.passives; sim.items = items;
        return policy(e, sim, un);
      },
      onEngine: (e) => wire(e, top, build.passives, st),
    });
    if (r.win) { agg.wins++; agg.rounds += r.rounds; agg.hp += r.hpPct; }
    if (r.timeout) agg.timeouts++;
    agg.enemyHp += r.enemyHpPct;
    for (const k of Object.keys(st)) {
      if (k === 'compBySrc' || k === 'breakBySrc') {
        for (const [s, v] of Object.entries(st[k])) agg.st[k][s] = (agg.st[k][s] || 0) + v;
      } else agg.st[k] += st[k];
    }
  }
  clearBar();
  const w = Math.max(1, agg.wins);
  const s = agg.st;
  return {
    winRate: agg.wins / runs,
    avgRounds: agg.rounds / w,
    avgHpLeft: agg.hp / w,
    enemyHpLeft: agg.enemyHp / runs,
    timeouts: agg.timeouts,
    actions: s.actions / runs,
    taggedShare: s.actions ? s.taggedActions / s.actions : 0,
    superShare: s.actions ? s.supers / s.actions : 0,
    supers: s.supers / runs,
    breaks: s.breaks / runs,
    fizzles: s.fizzles / runs,
    brokenTurns: s.brokenTurns / runs,
    lockClear: s.locksSeen ? s.locksCleared / s.locksSeen : 0,
    offTagClears: s.locksClearedOffTag / runs,
    loopIns: s.loopIns / runs,
    powerMoves: s.powerMoves / runs,
    braces: s.braces / runs,
    perfectBraces: s.perfectBraces / runs,
    retaliates: s.retaliates / runs,
    items: s.itemsUsed / runs,
    reflected: s.reflected / runs,
    compound: s.compoundDamage / runs,
    dots: s.dotsApplied / runs,
    breakBySrc: s.breakBySrc,
    compBySrc: s.compBySrc,
    points: build.points,
  };
}

// ── LADDERS ─────────────────────────────────────────────────────────────
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
const H = (cols) => cols.join('');

// ── REPORTS ─────────────────────────────────────────────────────────────
function runGraph(runs) {
  console.log(`\n=== 1. THE PAYOFF MATRIX AS SHIPPED — what each verb is actually paid, ${runs} runs ===`);
  console.log('Break provenance: which route emptied the Composure bar. 100% one column = one lane owns denial.');
  console.log(H(['encounter'.padEnd(20), 'lvl'.padStart(4), 'actions'.padStart(8), 'tagged%'.padStart(8),
    'super%'.padStart(8), 'breaks'.padStart(8), 'by weakness'.padStart(12), 'by brace'.padStart(10),
    'lockclr'.padStart(8), 'offtag clears'.padStart(14), 'loopIn'.padStart(7)]));
  for (const row of LADDER) {
    const r = batchJ(cfgFor(row), row.level, runs, SHIPPED, 'baseline', competentTurn);
    const bw = r.breakBySrc.weakness || 0, bb = r.breakBySrc.brace || 0;
    const tot = Math.max(1, bw + bb);
    console.log(H([row.id.padEnd(20), String(row.level).padStart(4), n2(r.actions).padStart(8),
      pct(r.taggedShare).padStart(8), pct(r.superShare).padStart(8), n2(r.breaks).padStart(8),
      pct(bw / tot).padStart(12), pct(bb / tot).padStart(10), pct(r.lockClear).padStart(8),
      n2(r.offTagClears).padStart(14), n2(r.loopIns).padStart(7)]));
  }
}

function runLadder(runs, top) {
  console.log(`\n=== 2. LADDER — shipped policy + shipped kit, SHIPPED vs ${top.label}, ${runs} runs/cell ===`);
  console.log('This is the "does the game still work for a player who changes nothing" table.');
  console.log(H(['encounter'.padEnd(20), 'lvl'.padStart(4), 'win base'.padStart(10), 'win D2'.padStart(9),
    'Δwin'.padStart(8), 'rnd base'.padStart(9), 'rnd D2'.padStart(8), 'Δrnd'.padStart(8),
    'hp base'.padStart(9), 'hp D2'.padStart(8), 'Δhp'.padStart(8), 'brk base'.padStart(9), 'brk D2'.padStart(8)]));
  for (const row of LADDER) {
    const a = batchJ(cfgFor(row), row.level, runs, SHIPPED, 'baseline', competentTurn);
    const b = batchJ(cfgFor(row), row.level, runs, top, 'baseline', competentTurn);
    console.log(H([row.id.padEnd(20), String(row.level).padStart(4),
      pct(a.winRate).padStart(10), pct(b.winRate).padStart(9),
      sgn((b.winRate - a.winRate) * 100, z => z.toFixed(1) + 'pp').padStart(8),
      n2(a.avgRounds).padStart(9), n2(b.avgRounds).padStart(8), sgn(b.avgRounds - a.avgRounds).padStart(8),
      pct(a.avgHpLeft).padStart(9), pct(b.avgHpLeft).padStart(8),
      sgn((b.avgHpLeft - a.avgHpLeft) * 100, z => z.toFixed(1) + 'pp').padStart(8),
      n2(a.breaks).padStart(9), n2(b.breaks).padStart(8)]));
  }
}

const LANE_KEYS = ['baseline', 'litigator', 'deflector', 'accrual', 'escalator', 'logistician'];

function runLanes(runs, top, keys) {
  console.log(`\n=== 3. BUILD LANES — ${top.label}, ${runs} runs/cell. Same upgrade points, five shapes. ===`);
  for (const lane of keys) {
    console.log(`\n-- ${LANES[lane].label} --`);
    console.log(H(['encounter'.padEnd(20), 'lvl'.padStart(4), 'pts'.padStart(4), 'win'.padStart(8),
      'rounds'.padStart(8), 'hp left'.padStart(9), 'breaks'.padStart(8), 'tagged%'.padStart(8),
      'lockclr'.padStart(8), 'PM'.padStart(6), 'brace'.padStart(7), 'ret'.padStart(6), 'dot'.padStart(6), 'item'.padStart(6)]));
    for (const row of LADDER) {
      const r = batchJ(cfgFor(row), row.level, runs, top, lane, lane === 'baseline' ? competentTurn : null);
      console.log(H([row.id.padEnd(20), String(row.level).padStart(4), String(r.points).padStart(4),
        pct(r.winRate).padStart(8), n2(r.avgRounds).padStart(8), pct(r.avgHpLeft).padStart(9),
        n2(r.breaks).padStart(8), pct(r.taggedShare).padStart(8), pct(r.lockClear).padStart(8),
        n2(r.powerMoves).padStart(6), n2(r.braces).padStart(7), n2(r.retaliates).padStart(6),
        n2(r.dots).padStart(6), n2(r.items).padStart(6)]));
    }
  }
}

function runSpam(runs, top) {
  const rows = [
    { id: 'karen', level: 4 }, { id: 'chad', level: 6 }, { id: 'grandma', level: 8 },
    { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  console.log(`\n=== 4. SPAM INDEX + BREAK PROVENANCE — ${runs} runs/cell ===`);
  console.log('spam% = share of Andrew actions that are a weakness-tag hit. Provenance = who paid for the Break.');
  console.log(H(['encounter'.padEnd(16), 'lvl'.padStart(4), 'topology'.padStart(16), 'lane'.padStart(12),
    'spam%'.padStart(8), 'breaks'.padStart(8), 'weak'.padStart(7), 'brace'.padStart(7),
    'retal'.padStart(7), 'attrit'.padStart(7), 'power'.padStart(7), 'item'.padStart(7)]));
  for (const row of rows) {
    const cells = [
      ['SHIPPED', SHIPPED, 'baseline', competentTurn],
      [top.label, top, 'baseline', competentTurn],
      [top.label, top, 'litigator', null],
      [top.label, top, 'deflector', null],
      [top.label, top, 'accrual', null],
      [top.label, top, 'escalator', null],
      [top.label, top, 'logistician', null],
    ];
    for (const [lbl, t, lane, pol] of cells) {
      const r = batchJ(cfgFor(row), row.level, runs, t, lane, pol);
      const b = r.breakBySrc, tot = Math.max(1e-9, Object.values(b).reduce((s, v) => s + v, 0));
      const share = (k) => (b[k] ? pct(b[k] / tot) : '-');
      console.log(H([row.id.padEnd(16), String(row.level).padStart(4), lbl.padStart(16), lane.padStart(12),
        pct(r.superShare).padStart(8), n2(r.breaks).padStart(8),
        share('weakness').padStart(7), share('brace').padStart(7), share('retaliate').padStart(7),
        share('attrition').padStart(7), share('power_move').padStart(7), share('item').padStart(7)]));
    }
  }
}

function runDenial(runs, top) {
  const rows = [
    { id: 'karen', level: 4 }, { id: 'chad', level: 5 }, { id: 'grandma', level: 7 },
    { id: 'restructuring_trio', level: 7, party: ['janet'] },
    { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  console.log(`\n=== 5. TURN DENIAL — the h-run budget. eff turns = rounds - fizzles - broken turns. ${runs} runs ===`);
  console.log(H(['encounter'.padEnd(20), 'lvl'.padStart(4), 'topology/lane'.padStart(24),
    'rounds'.padStart(8), 'fizzle'.padStart(8), 'broken'.padStart(8), 'EFF'.padStart(8), 'vs shipped'.padStart(11), 'hp left'.padStart(9)]));
  for (const row of rows) {
    let baseEff = null;
    const cells = [
      ['SHIPPED/baseline', SHIPPED, 'baseline', competentTurn],
      ['D2/baseline', top, 'baseline', competentTurn],
      ['D2/litigator', top, 'litigator', null],
      ['D2/deflector', top, 'deflector', null],
      ['D2/accrual', top, 'accrual', null],
      ['D2/escalator', top, 'escalator', null],
      ['D2/logistician', top, 'logistician', null],
    ];
    for (const [lbl, t, lane, pol] of cells) {
      const r = batchJ(cfgFor(row), row.level, runs, t, lane, pol);
      const eff = Math.max(0, r.avgRounds - r.fizzles - r.brokenTurns);
      if (baseEff === null) baseEff = eff;
      console.log(H([row.id.padEnd(20), String(row.level).padStart(4), lbl.padStart(24),
        n2(r.avgRounds).padStart(8), n2(r.fizzles).padStart(8), n2(r.brokenTurns).padStart(8),
        n2(eff).padStart(8), pct(eff / baseEff).padStart(11), pct(r.avgHpLeft).padStart(9)]));
    }
  }
}

function runTrade(runs, top) {
  const rows = [
    { id: 'karen', level: 4 }, { id: 'grandma', level: 8 },
    { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  console.log(`\n=== 6. OBJECTIONS vs COMPOSURE — is the trade still live? ${runs} runs/cell ===`);
  console.log('A live trade = the two numbers cannot both rise. D2 opens NEW doors to each, so the');
  console.log('question is whether a single lane can buy both at once.');
  console.log(H(['encounter'.padEnd(16), 'lvl'.padStart(4), 'cell'.padStart(22),
    'breaks/fight'.padStart(13), 'lock clear %'.padStart(13), 'both/fight'.padStart(11)]));
  for (const row of rows) {
    const cells = [
      ['SHIPPED/baseline', SHIPPED, 'baseline', competentTurn],
      ['D2/baseline', top, 'baseline', competentTurn],
      ['D2/litigator', top, 'litigator', null],
      ['D2/deflector', top, 'deflector', null],
      ['D2/accrual', top, 'accrual', null],
    ];
    for (const [lbl, t, lane, pol] of cells) {
      const r = batchJ(cfgFor(row), row.level, runs, t, lane, pol);
      console.log(H([row.id.padEnd(16), String(row.level).padStart(4), lbl.padStart(22),
        n2(r.breaks).padStart(13), pct(r.lockClear).padStart(13), n2(r.breaks + r.fizzles).padStart(11)]));
    }
  }
}

function pipResistFor(d) { return Math.min(0.80, 0.20 + 0.02 * Math.max(0, d)); }
function runPip(runs, top) {
  console.log(`\n=== 7. CASUAL / PIP FLOOR — the constraint that cannot move. ${runs} runs/cell ===`);
  console.log('CASUAL never lands a tagged hit, so every D2 route is unreachable for it by construction.');
  const deaths = [0, 10, 20];
  console.log(H(['encounter'.padEnd(20), 'lvl'.padStart(4), 'topology'.padStart(10), 'off'.padStart(9),
    ...deaths.map(d => `${d}d/${Math.round(pipResistFor(d) * 100)}%`.padStart(9))]));
  for (const row of LADDER) {
    for (const [lbl, t] of [['SHIPPED', SHIPPED], ['D2', top]]) {
      const cfg = cfgFor(row);
      const cells = [0, ...deaths.map(pipResistFor)].map(resist =>
        pct(batchJ({ ...cfg, pipResist: resist }, row.level, runs, t, 'baseline', casualTurn).winRate).padStart(9));
      console.log(H([row.id.padEnd(20), String(row.level).padStart(4), lbl.padStart(10), ...cells]));
    }
  }
}

const NG_LADDER = [
  { id: 'karen', level: 4 }, { id: 'chad', level: 6 }, { id: 'grandma', level: 8 },
  { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
];
const MAXED_SHOP = { atk: 9, def: 9, maxHP: 60, spd: 6 };
function ngCfg(row, carried, laps) {
  const cfg = cfgFor(row);
  if (carried) {
    cfg.atkBonus = MAXED_SHOP.atk;
    cfg.defBonus = MAXED_SHOP.def;
    const base = buildPlayerStats(row.level);
    cfg.playerExtra = { maxHP: base.maxHP + MAXED_SHOP.maxHP, hp: base.maxHP + MAXED_SHOP.maxHP, spd: base.spd + MAXED_SHOP.spd };
  }
  if (laps > 0) { cfg.ngPlus = true; cfg.ngPlusCount = laps; }
  return cfg;
}
function runNg(runs, top) {
  console.log(`
=== 8. NG+ LADDER — correct when CARRY@NG+1 <= FRESH@NG. ${runs} runs/cell ===`);
  console.log('FRESH = the level-curve kit on a fresh lap. CARRY = every ability + maxed shop upgrades.');
  for (const [lbl, t, lane, pol] of [['SHIPPED/baseline', SHIPPED, 'baseline', competentTurn],
                                     ['D2/baseline', top, 'baseline', competentTurn],
                                     ['D2/litigator', top, 'litigator', null],
                                     ['D2/deflector', top, 'deflector', null]]) {
    console.log(`
-- ${lbl} --`);
    console.log(H(['encounter'.padEnd(16), 'lvl'.padStart(4), 'FRESH@NG'.padStart(22),
      'CARRY@NG+1'.padStart(22), 'CARRY@NG+2'.padStart(22), 'CARRY@NG+3'.padStart(22)]));
    for (const row of NG_LADDER) {
      const cells = [];
      const f = batchJ(ngCfg(row, false, 0), row.level, runs, t, lane, pol);
      cells.push(`${pct(f.winRate)} (${n2(f.avgRounds)}/${pct(f.avgHpLeft)})`.padStart(22));
      for (const laps of [1, 2, 3]) {
        const c = ngCfg(row, true, laps);
        c.carryAll = true;
        const r = batchJ(c, row.level, runs, t, lane, pol);
        cells.push(`${pct(r.winRate)} (${n2(r.avgRounds)}/${pct(r.avgHpLeft)})`.padStart(22));
      }
      console.log(H([row.id.padEnd(16), String(row.level).padStart(4), ...cells]));
    }
  }
}

function runSweep(runs, top) {
  const rows = [{ id: 'karen', level: 4 }, { id: 'grandma', level: 8 }, { id: 'rachel_boss', level: 9 },
                { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] }];
  const caps = [null, 0.6, 0.7, 0.8];
  const lanes = ['baseline', 'litigator', 'deflector'];
  console.log(`
=== 9. THE 70% RULE — sweeping the column cap. ${runs} runs/cell ===`);
  console.log('Target: hold the default player near Run C while stopping one column from owning Break.');
  console.log(H(['encounter'.padEnd(14), 'lvl'.padStart(4), 'cap'.padStart(6), 'lane'.padStart(11),
    'win'.padStart(8), 'rounds'.padStart(8), 'hp left'.padStart(9), 'breaks'.padStart(8), 'weak-comp%'.padStart(11)]));
  for (const row of rows) {
    const b = batchJ(cfgFor(row), row.level, runs, SHIPPED, 'baseline', competentTurn);
    console.log(H([row.id.padEnd(14), String(row.level).padStart(4), 'SHIP'.padStart(6), 'baseline'.padStart(11),
      pct(b.winRate).padStart(8), n2(b.avgRounds).padStart(8), pct(b.avgHpLeft).padStart(9),
      n2(b.breaks).padStart(8), '100.0%'.padStart(11)]));
    for (const cap of caps) {
      for (const lane of lanes) {
        const t = variantOf(top, { columnCap: cap });
        const r = batchJ(cfgFor(row), row.level, runs, t, lane, lane === 'baseline' ? competentTurn : null);
        const tot = Math.max(1e-9, Object.values(r.compBySrc).reduce((s2, v) => s2 + v, 0));
        console.log(H([row.id.padEnd(14), String(row.level).padStart(4), (cap ? String(cap) : 'off').padStart(6),
          lane.padStart(11), pct(r.winRate).padStart(8), n2(r.avgRounds).padStart(8), pct(r.avgHpLeft).padStart(9),
          n2(r.breaks).padStart(8), pct((r.compBySrc.weakness || 0) / tot).padStart(11)]));
      }
    }
  }
}

function runCapstone(runs, top) {
  console.log(`\n=== 10. THE CAPSTONE ONE MORE — Litigation terminal node only. ${runs} runs/cell ===`);
  console.log('F1 shape: the FIRST weakness hit on each enemy returns one full action. Once per enemy per fight.');
  console.log(H(['encounter'.padEnd(20), 'lvl'.padStart(4), 'cell'.padStart(26), 'win'.padStart(8),
    'rounds'.padStart(8), 'hp left'.padStart(9), 'eff turns'.padStart(10), 'breaks'.padStart(8)]));
  for (const row of LADDER) {
    let baseEff = null;
    for (const [lbl, t, lane, pol] of [
      ['SHIPPED/baseline', SHIPPED, 'baseline', competentTurn],
      ['D2/litigator (no capstone)', top, 'litigator', null],
      ['D2/litigator + capstone', variantOf(top, { capstoneF1: true }), 'litigator', null],
    ]) {
      const r = batchJ(cfgFor(row), row.level, runs, t, lane, pol);
      const eff = Math.max(0, r.avgRounds - r.fizzles - r.brokenTurns);
      if (baseEff === null) baseEff = eff;
      console.log(H([row.id.padEnd(20), String(row.level).padStart(4), lbl.padStart(26),
        pct(r.winRate).padStart(8), n2(r.avgRounds).padStart(8), pct(r.avgHpLeft).padStart(9),
        `${n2(eff)} (${pct(eff / baseEff)})`.padStart(10), n2(r.breaks).padStart(8)]));
    }
  }
}

function runDay(runs, top) {
  console.log(`\n=== 11. RECEPTION / ROGUELITE SPOT-CHECK — reception_client is weak AUDIT and has a bar. ${runs} runs ===`);
  console.log(H(['cell'.padStart(24), 'lvl'.padStart(4), 'win'.padStart(8), 'rounds'.padStart(8), 'hp left'.padStart(9), 'breaks'.padStart(8)]));
  for (const lv of [3, 6, 9]) {
    for (const [lbl, t, lane, pol] of [
      ['SHIPPED/baseline', SHIPPED, 'baseline', competentTurn],
      ['D2/baseline', top, 'baseline', competentTurn],
      ['D2/accrual', top, 'accrual', null],
      ['D2/deflector', top, 'deflector', null],
    ]) {
      const r = batchJ(enc('reception_client'), lv, runs, t, lane, pol);
      console.log(H([lbl.padStart(24), String(lv).padStart(4), pct(r.winRate).padStart(8),
        n2(r.avgRounds).padStart(8), pct(r.avgHpLeft).padStart(9), n2(r.breaks).padStart(8)]));
    }
  }
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
const IS_CLI = !!(process.argv[1] && process.argv[1].split('\\').join('/').endsWith('_j-econ-topology.mjs'));
const args = parseArgs(process.argv.slice(2));
const RUNS = parseInt(args.opts.runs || '300', 10);
const TOP = D2;

if (!IS_CLI) { /* imported */ }
else if (args.flags.has('graph')) runGraph(RUNS);
else if (args.flags.has('ladder')) runLadder(RUNS, TOP);
else if (args.flags.has('lanes')) runLanes(RUNS, TOP, (args.opts.keys || LANE_KEYS.join(',')).split(','));
else if (args.flags.has('spam')) runSpam(RUNS, TOP);
else if (args.flags.has('denial')) runDenial(RUNS, TOP);
else if (args.flags.has('trade')) runTrade(RUNS, TOP);
else if (args.flags.has('pip')) runPip(RUNS, TOP);
else if (args.flags.has('ng')) runNg(RUNS, TOP);
else if (args.flags.has('sweep')) runSweep(RUNS, TOP);
else if (args.flags.has('capstone')) runCapstone(RUNS, TOP);
else if (args.flags.has('day')) runDay(RUNS, TOP);
else { runGraph(RUNS); runLadder(RUNS, TOP); runLanes(RUNS, TOP, LANE_KEYS); }
