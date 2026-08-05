// _j-verify.mjs — DID THE SHIPPED BUILD LAND INSIDE THE DOSSIER'S BANDS?
//
// The J-run's own harness (`tools/_j-synth.mjs` -> `tools/_j-build-sim.mjs`)
// measured a DESIGN: it injected the proposed abilities as data and the
// proposed engine behaviour as monkeypatches on the live engine. Now that the
// design is SHIPPED, running that harness would double-apply every patch on
// top of the real implementation and measure something that does not exist.
//
// This harness measures the SHIPPED CODE. It imports nothing from
// `_j-build-sim` (which would `Object.assign` its own ability rows over the
// real ones); the trees are DERIVED from `PLAYER_ABILITIES[].track` so they
// cannot drift from what the Abilities tab actually shows, the tier gate comes
// from the shipped `TIER_LEVEL`, and every passive reaches the engine through
// the same `nodes` option `CombatState` uses in a real fight.
//
// Everything wrapped here is INSTRUMENTATION ONLY — it counts, it never
// changes a number.
//
//   node tools/_j-verify.mjs --points               # the budget + the ladder
//   node tools/_j-verify.mjs --package --runs 600   # the ladder + diversity band
//   node tools/_j-verify.mjs --shape   --runs 600   # where each lane's Composure comes from
//   node tools/_j-verify.mjs --pip     --runs 800   # the casual floor
//   node tools/_j-verify.mjs --onemore --runs 600   # effective enemy turns under the turn-back
//   node tools/_j-verify.mjs --pivot   --runs 600   # top-tag share, shipped kit
import {
  runFight, enc, competentTurn, casualTurn, rollBraceQuality, NO_RELIC,
} from './combat-sim.mjs';
import { PLAYER_ABILITIES, TIER_LEVEL, PRACTICE_GROUPS } from '../src/data/stats.js';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};
const has = (k) => process.argv.includes(`--${k}`);
const RUNS = Number(arg('runs', 400));
const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);

const STARTERS = ['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check'];

// ── THE TREES, DERIVED FROM THE SHIPPED DATA ────────────────────────────
// Spend order inside a track is tier, then the `requires` chain, then cost —
// i.e. the order the Abilities tab renders and the only order the tier gate
// and the prerequisites permit.
function treeOrder(track) {
  return Object.entries(PLAYER_ABILITIES)
    .filter(([, a]) => a.track === track && a.upgradePointCost && !a.unlockQuest)
    .sort((x, y) => (x[1].depth ?? 99) - (y[1].depth ?? 99))
    .map(([id, a]) => [id, a.upgradePointCost, a.tier]);
}
const TREES = {
  shipped: { label: 'SHIPPED (control)', order: null },   // resolved below
  litigation: { label: PRACTICE_GROUPS.litigation.name, order: treeOrder('litigation') },
  compliance: { label: PRACTICE_GROUPS.compliance.name, order: treeOrder('compliance') },
  audit: { label: PRACTICE_GROUPS.audit.name, order: treeOrder('audit') },
};
// The control: the pre-trees purchase order, i.e. what a player bought when the
// tab was TIER 1 / TIER 2 / TIER 3 and there was no build decision to make.
TREES.shipped.order = [
  ['cite_precedent', 1, 1], ['due_diligence', 1, 1], ['cc_all', 1, 1],
  ['forensic_audit', 2, 2], ['per_my_last_email', 2, 2], ['whistleblower', 2, 3],
  ['fiduciary_shield', 1, 2], ['billable_hours', 1, 2], ['power_of_attorney', 2, 3],
];

/** Nodes owned at `level`, spending 1 point per level-up, under the tier gate. */
function buildUnlocked(treeId, level, opts = {}) {
  const s = new Set(STARTERS);
  let points = Math.max(0, level - 1) + (opts.extraPoints || 0);
  for (const [id, cost, tier] of TREES[treeId].order) {
    if (!opts.noGate && level < (TIER_LEVEL[tier] || 0)) continue;   // THE TIER GATE
    if (points < cost) break;
    points -= cost;
    s.add(id);
  }
  // Side-quest abilities are earned, not bought — the same rule combat-sim's
  // own `unlockedAbilities` uses. Tree-agnostic on purpose: every build gets a
  // legal and a technical option from the story, which is what keeps the tag
  // layer alive in every lane.
  if (level >= 9) { s.add('notarized_strike'); s.add('root_access'); }
  return s;
}

// ── INSTRUMENTATION (counts only; changes nothing) ──────────────────────
function instrument(engine, st) {
  const wrap = (name) => {
    const real = engine[name].bind(engine);
    engine[name] = (...a) => {
      const r = real(...a);
      if (r) {
        st.actions++;
        if (r.effective === 'super' || (r.hits || []).some(h => h.effective === 'super')) st.supers++;
        if (r.turnBack) st[r.turnBack === 'attack' ? 'msjProcs' : 'ucProcs']++;
      }
      return r;
    };
  };
  for (const m of ['playerAttack', 'playerAbility', 'playerDesperateGamble', 'playerRetaliate']) wrap(m);
  // TAG CENSUS — Andrew's tagged hits only, which is what `topTag` measures.
  const realCalc = engine._calcDamage.bind(engine);
  engine._calcDamage = (atk, power, def, target, tag) => {
    // ANDREW'S tagged hits only. Ally hits carry tags Andrew may not own, and
    // counting them inflates tag diversity on exactly the three party fights
    // (measured: restructuring_trio read 82.2% with allies in the census and
    // the dossier's Andrew-only number is 49.4%).
    if (tag && target && engine.enemies.includes(target) && !engine._vEnemyActing && !engine._vAllyActing) {
      st.tags[tag] = (st.tags[tag] || 0) + 1;
      st.tagTotal++;
    }
    return realCalc(atk, power, def, target, tag);
  };
  // COMPOSURE SOURCE. The shipped default is a weakness-tag hit inside
  // _calcDamage; anything else is an alternative issuer, which is the whole
  // claim the trees make. Stamped by the call site, not guessed.
  const realRC = engine._reduceComposure.bind(engine);
  engine._reduceComposure = (t, amt) => {
    const r = realRC(t, amt);
    if (r.amount > 0) {
      if (engine._vInCalcWeakness) st.compW += r.amount; else st.compOTH += r.amount;
    }
    if (r.broke) st.breaks++;
    return r;
  };
  // Distinguish the weakness-hit call inside _calcDamage from every other one.
  const realCalc2 = engine._calcDamage.bind(engine);
  engine._calcDamage = (atk, power, def, target, tag) => {
    const t = target;
    const weak = !!(tag && t && engine.enemies.includes(t) && t.weakness === tag);
    engine._vInCalcWeakness = weak;
    try { return realCalc2(atk, power, def, target, tag); }
    finally { engine._vInCalcWeakness = false; }
  };
  const realBrace = engine.playerBrace.bind(engine);
  engine.playerBrace = (q) => { st.braces++; if (q === 'perfect') st.perfect++; return realBrace(q); };
  const realET = engine.enemyTurn.bind(engine);
  engine.enemyTurn = (i) => {
    engine._vEnemyActing = true;
    let r; try { r = realET(i); } finally { engine._vEnemyActing = false; }
    if (r && r.type === 'fizzle') st.fizzles++;
    if (r && r.type === 'broken') st.brokenTurns++;
    return r;
  };
  for (const m of ['allyTurn', 'playerLoopIn']) {
    if (typeof engine[m] !== 'function') continue;
    const real = engine[m].bind(engine);
    engine[m] = (...a) => {
      engine._vAllyActing = true;
      try { return real(...a); } finally { engine._vAllyActing = false; }
    };
  }
}

// ── LANE POLICIES ───────────────────────────────────────────────────────
// Modelled on combat-sim's COMPETENT policy with the lane's own priorities,
// exactly as the J-run panel played them. They cast through the SHIPPED
// signatures, so Escalate goes through `playerAbility(id, ti, { tag })` rather
// than through a mutated ability row.
const AB = PLAYER_ABILITIES;
function pickTargetIndex(engine) {
  let best = -1, bestHp = Infinity;
  engine.enemies.forEach((e, i) => { if (e.hp > 0 && e.hp < bestHp) { bestHp = e.hp; best = i; } });
  return best;
}
function biggestIncomingPower(engine) {
  let worst = null;
  for (const e of engine.enemies) {
    if (e.hp <= 0 || !e.telegraphedAbility) continue;
    const a = engine.constructor.name && e.telegraphedAbility;
    const p = ENEMY_POWER(e);
    if (p !== null && (worst === null || p > worst)) worst = p;
  }
  return worst;
}
let _ENEMY_ABILITIES = null;
function ENEMY_POWER(e) {
  if (!_ENEMY_ABILITIES) return null;
  const a = _ENEMY_ABILITIES[e.telegraphedAbility];
  if (!a || (a.type !== 'attack' && a.type !== 'summon' && a.type !== 'dot')) return null;
  return a.power ?? 0;
}
function attackAbilities(unlocked, mp) {
  const out = [];
  for (const id of unlocked) {
    const a = AB[id];
    if (!a || (a.type !== 'attack' && a.type !== 'attack_aoe')) continue;
    if (a.momentumCost) continue;              // Escalate is handled separately
    if (mp < a.cost) continue;
    out.push(id);
  }
  return out;
}
function bestTagged(engine, unlocked, tag) {
  let best = null;
  for (const id of attackAbilities(unlocked, engine.player.mp)) {
    const a = AB[id];
    if (a.tag !== tag) continue;
    if (!best || a.power > AB[best].power) best = id;
  }
  return best;
}
function openLockTag(engine, target, unlocked) {
  if (!target || target.sealed) return null;
  const locks = (target.locks || []).filter(l => !l.cleared);
  if (!locks.length) return null;
  const sorted = [...locks].sort((a, b) => (b.tag === target.weakness ? 1 : 0) - (a.tag === target.weakness ? 1 : 0));
  for (const l of sorted) if (bestTagged(engine, unlocked, l.tag)) return l.tag;
  return null;
}
function rollRetaliate() {
  let c = 0; for (let i = 0; i < 4; i++) if (Math.random() < 0.9) c++;
  return c / 4;
}
function estIncoming(engine) {
  const pDef = engine._getEffective(engine.player).def;
  let worst = 0;
  for (const e of engine.enemies) {
    if (e.hp <= 0) continue;
    const p = ENEMY_POWER(e);
    if (p === null) continue;
    worst = Math.max(worst, Math.floor((engine._getEffective(e).atk + p) * 1.5 - pDef * 0.5));
  }
  return worst;
}

// THE RETURNED TURN. The engine ARMS it (`engine.turnBackReady`); a real
// player answers a prompt. The sim answers it the way the dossier priced it:
// 'attack' spends the Summary Judgment on a basic attack, 'sustain' braces or
// tops up. Runs through `engine.runTurnBack` so the engine's own re-arm guard
// applies, exactly as CombatState does.
function takeTurnBack(engine, sim, unlocked, ti) {
  const grade = engine.turnBackReady;
  if (!grade) return;
  engine.runTurnBack(() => {
    const p = engine.player;
    if (grade === 'attack') { engine.playerAttack(ti); return; }
    const anyTelegraph = engine.enemies.some(e => e.hp > 0 && e.telegraphedAbility);
    if (!p.bracing && anyTelegraph) { engine.playerBrace(rollBraceQuality(1)); return; }
    if (p.hp / p.maxHP < 0.75 && !p.silencedThisTurn && p.mp >= AB.coffee_break.cost) {
      engine.playerAbility('coffee_break'); return;
    }
    if (!p.silencedThisTurn && unlocked.has('fiduciary_shield')
      && !p.buffs.some(b => b.name === AB.fiduciary_shield.name) && p.mp >= AB.fiduciary_shield.cost) {
      engine.playerAbility('fiduciary_shield'); return;
    }
    if (sim.coffees > 0 && p.mp < 30) { sim.coffees--; engine.playerItem('coffee_large'); }
  });
}

function litigationTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const hpRatio = p.hp / p.maxHP;
  const wasBrace = sim.justBraced; sim.justBraced = false;
  const target = engine.enemies[ti];
  const paCost = engine.getPressAdvantageCost();
  const reserve = unlocked.has('escalate') ? 30 : 0;
  if (p.momentum >= paCost + reserve && hpRatio >= 0.55 && !p.pressAdvantageUsedThisTurn) {
    engine.playerPressAdvantage(ti);
    if (engine.isOver) return;
  }
  const act = () => {
    if (hpRatio < 0.40 && p.momentum >= 50) { engine.playerSecondWind(); return; }
    if ((hpRatio < 0.35 || p.hp < estIncoming(engine) * 1.1 + 10) && !p.silencedThisTurn) {
      if (unlocked.has('power_of_attorney') && p.mp >= AB.power_of_attorney.cost && p.maxHP - p.hp > 90) {
        engine.playerAbility('power_of_attorney'); return;
      }
      engine.playerAbility('coffee_break'); return;
    }
    if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }
    if (engine.counterActive) { engine.playerAttack(ti); return; }
    const lockTag = p.silencedThisTurn ? null : openLockTag(engine, target, unlocked);
    if (lockTag) { engine.playerAbility(bestTagged(engine, unlocked, lockTag), ti); return; }
    const biggest = biggestIncomingPower(engine);
    if (!p.bracing && !wasBrace && biggest !== null && (biggest >= 35 || (biggest >= 25 && hpRatio < 0.45))) {
      engine.playerBrace(rollBraceQuality(1)); sim.justBraced = true; return;
    }
    const ab = p.silencedThisTurn ? null : bestTagged(engine, unlocked, target.weakness);
    const abPow = ab ? AB[ab].power : -1;
    // ESCALATE — buy the practice area with Confidence.
    if (!p.silencedThisTurn && unlocked.has('escalate') && target.weakness
      && abPow < AB.escalate.power && p.momentum >= AB.escalate.momentumCost) {
      if (engine.playerAbility('escalate', ti, { tag: target.weakness })) { sim.escalates++; return; }
    }
    if (ab) { engine.playerAbility(ab, ti); return; }
    if (p.retaliateReady) { engine.playerRetaliate(rollRetaliate(), ti); return; }
    if (!p.silencedThisTurn && engine.aliveEnemies().length >= 3 && unlocked.has('cc_all') && p.mp >= AB.cc_all.cost) {
      engine.playerAbility('cc_all', ti); return;
    }
    if (sim.coffees > 0 && p.mp < 30) { sim.coffees--; engine.playerItem('coffee_large'); return; }
    if (hpRatio < 0.25) { engine.playerDesperateGamble(sim.gambleRisk || 'safe', ti); return; }
    engine.playerAttack(ti);
  };
  act();
  takeTurnBack(engine, sim, unlocked, ti);
}

function complianceTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const hpRatio = p.hp / p.maxHP;
  const wasBrace = sim.justBraced; sim.justBraced = false;
  const target = engine.enemies[ti];
  const paCost = engine.getPressAdvantageCost();
  if (p.momentum >= paCost + 25 && hpRatio >= 0.6 && !p.pressAdvantageUsedThisTurn) {
    engine.playerPressAdvantage(ti);
    if (engine.isOver) return;
  }
  const act = () => {
    if (hpRatio < 0.35 && p.momentum >= 50) { engine.playerSecondWind(); return; }
    if ((hpRatio < 0.30 || p.hp < estIncoming(engine) * 0.9) && !p.silencedThisTurn) {
      if (unlocked.has('power_of_attorney') && p.mp >= AB.power_of_attorney.cost && p.maxHP - p.hp > 90) {
        engine.playerAbility('power_of_attorney'); return;
      }
      engine.playerAbility('coffee_break'); return;
    }
    if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }
    if (engine.counterActive) { engine.playerAttack(ti); return; }
    // The counterpunch window IS the build.
    if (wasBrace && !p.silencedThisTurn && unlocked.has('notice_of_deficiency') && p.mp >= AB.notice_of_deficiency.cost) {
      engine.playerAbility('notice_of_deficiency', ti); return;
    }
    if (p.retaliateReady) { engine.playerRetaliate(rollRetaliate(), ti); return; }
    const biggest = biggestIncomingPower(engine);
    if (!p.bracing && !wasBrace && biggest !== null) {
      engine.playerBrace(rollBraceQuality(1)); sim.justBraced = true; return;
    }
    if (!p.silencedThisTurn && unlocked.has('fiduciary_shield')
      && !p.buffs.some(b => b.name === AB.fiduciary_shield.name)
      && p.mp >= AB.fiduciary_shield.cost && biggest !== null && biggest >= 30) {
      engine.playerAbility('fiduciary_shield'); return;
    }
    const lockTag = p.silencedThisTurn ? null : openLockTag(engine, target, unlocked);
    if (lockTag) { engine.playerAbility(bestTagged(engine, unlocked, lockTag), ti); return; }
    const ab = p.silencedThisTurn ? null : bestTagged(engine, unlocked, target.weakness);
    if (ab) { engine.playerAbility(ab, ti); return; }
    if (sim.coffees > 0 && p.mp < 25) { sim.coffees--; engine.playerItem('coffee_large'); return; }
    if (hpRatio < 0.25) { engine.playerDesperateGamble(sim.gambleRisk || 'safe', ti); return; }
    engine.playerAttack(ti);
  };
  act();
  takeTurnBack(engine, sim, unlocked, ti);
}

function auditTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const hpRatio = p.hp / p.maxHP;
  const wasBrace = sim.justBraced; sim.justBraced = false;
  const target = engine.enemies[ti];
  const stacks = target._findings || 0;
  const paCost = engine.getPressAdvantageCost();
  if (p.momentum >= paCost && hpRatio >= 0.55 && !p.pressAdvantageUsedThisTurn) {
    engine.playerPressAdvantage(ti);
    if (engine.isOver) return;
  }
  const act = () => {
    if (hpRatio < 0.40 && p.momentum >= 50) { engine.playerSecondWind(); return; }
    if ((hpRatio < 0.35 || p.hp < estIncoming(engine) * 1.1 + 10) && !p.silencedThisTurn) {
      if (unlocked.has('power_of_attorney') && p.mp >= AB.power_of_attorney.cost && p.maxHP - p.hp > 90) {
        engine.playerAbility('power_of_attorney'); return;
      }
      engine.playerAbility('coffee_break'); return;
    }
    if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }
    if (engine.counterActive) { engine.playerAttack(ti); return; }
    const biggest = biggestIncomingPower(engine);
    if (!p.bracing && !wasBrace && biggest !== null && (biggest >= 30 || (biggest >= 20 && hpRatio < 0.50))) {
      engine.playerBrace(rollBraceQuality(1)); sim.justBraced = true; return;
    }
    if (!p.silencedThisTurn && unlocked.has('due_diligence')
      && !target.buffs.some(b => b.name === AB.due_diligence.name) && p.mp >= AB.due_diligence.cost) {
      engine.playerAbility('due_diligence', ti); return;
    }
    const lockTag = p.silencedThisTurn ? null : openLockTag(engine, target, unlocked);
    if (lockTag) { engine.playerAbility(bestTagged(engine, unlocked, lockTag), ti); return; }
    if (!p.silencedThisTurn) {
      const cand = attackAbilities(unlocked, p.mp).map(id => [id, AB[id]]).filter(([, a]) => a.tag);
      if (cand.length > 0) {
        if (engine.aliveEnemies().length >= 2 && unlocked.has('management_letter') && p.mp >= AB.management_letter.cost) {
          engine.playerAbility('management_letter', ti); return;
        }
        const wId = bestTagged(engine, unlocked, target.weakness);
        const strongest = [...cand].sort((x, y) => y[1].power - x[1].power)[0][0];
        let pick = wId || strongest;
        const maxF = unlocked.has('material_weakness') ? 4 : 5;
        if (unlocked.has('findings')) {
          if (stacks >= maxF) pick = strongest;                   // close the file
          else if (stacks === maxF - 1) {
            const off = cand.filter(([, a]) => a.tag !== target.weakness && a.tag !== target.resistance);
            if (off.length > 0) pick = off.sort((x, y) => y[1].power - x[1].power)[0][0];
          }
        }
        engine.playerAbility(pick, ti); return;
      }
    }
    if (p.retaliateReady) { engine.playerRetaliate(rollRetaliate(), ti); return; }
    if (sim.coffees > 0 && p.mp < 30) { sim.coffees--; engine.playerItem('coffee_large'); return; }
    if (hpRatio < 0.25) { engine.playerDesperateGamble(sim.gambleRisk || 'safe', ti); return; }
    engine.playerAttack(ti);
  };
  act();
  takeTurnBack(engine, sim, unlocked, ti);
}

const POLICIES = {
  shipped: (e, s, u) => { competentTurn(e, s, u); takeTurnBack(e, s, u, pickTargetIndex(e)); },
  litigation: litigationTurn,
  compliance: complianceTurn,
  audit: auditTurn,
};

// ── Batch runner ────────────────────────────────────────────────────────
function batch(encId, level, treeId, runs, opts = {}) {
  const cfg = enc(encId);
  if (PARTY[encId] && cfg.party.length === 0) cfg.party = [...PARTY[encId]];
  const unlocked = opts.unlocked || buildUnlocked(treeId, level);
  const agg = {
    wins: 0, rounds: 0, hpLeft: 0, actions: 0, supers: 0, breaks: 0, braces: 0, perfect: 0,
    compW: 0, compOTH: 0, fizzles: 0, brokenTurns: 0, ucProcs: 0, msjProcs: 0, escalates: 0,
    tags: {}, tagTotal: 0,
  };
  for (let i = 0; i < runs; i++) {
    const st = {
      actions: 0, supers: 0, breaks: 0, braces: 0, perfect: 0, compW: 0, compOTH: 0,
      fizzles: 0, brokenTurns: 0, ucProcs: 0, msjProcs: 0, tags: {}, tagTotal: 0,
    };
    const sim = { escalates: 0 };
    const r = runFight(
      { ...cfg, unlocked, pipResist: opts.pipResist || 0 },
      level,
      {
        policy: (e, s, u) => { s.escalates = s.escalates || 0; POLICIES[treeId](e, s, u); sim.escalates = s.escalates; },
        onEngine: (e) => instrument(e, st),
      },
    );
    if (r.win) agg.wins++;
    agg.rounds += r.rounds;
    agg.hpLeft += r.hpPct;
    for (const k of ['actions', 'supers', 'breaks', 'braces', 'perfect', 'compW', 'compOTH', 'fizzles', 'brokenTurns', 'ucProcs', 'msjProcs', 'tagTotal']) agg[k] += st[k];
    for (const [t, n] of Object.entries(st.tags)) agg.tags[t] = (agg.tags[t] || 0) + n;
    agg.escalates += sim.escalates || 0;
  }
  const topTag = agg.tagTotal > 0 ? Math.max(...Object.values(agg.tags)) / agg.tagTotal : 0;
  return {
    win: agg.wins / runs, rounds: agg.rounds / runs, hpLeft: agg.hpLeft / runs,
    supers: agg.supers / runs, breaks: agg.breaks / runs, braces: agg.braces / runs,
    compW: agg.compW / runs, compOTH: agg.compOTH / runs,
    effT: (agg.rounds - agg.fizzles - agg.brokenTurns) / runs,
    uc: agg.ucProcs / runs, msj: agg.msjProcs / runs, esc: agg.escalates / runs,
    topTag, tags: agg.tags, tagsN: Object.keys(agg.tags).length,
  };
}

// The party each rung actually stages. `enc()` only reports the party an
// ENCOUNTER row declares; the two endgame bosses are fought with the bench in
// the shipping ladder (combat-sim's own LADDER passes it explicitly), and
// running them SOLO measures a fight the game never serves — it read 41% win /
// 18.5 rounds against the ladder's 100% / 4.5.
const PARTY = { regional_director: ['janet', 'isaiah'], algorithm: ['janet', 'isaiah'] };
const LADDER = [
  ['karen', 3], ['karen', 4], ['chad', 5], ['chad', 6], ['grandma', 7], ['grandma', 8],
  ['restructuring_trio', 7], ['restructuring_trio', 8], ['meredith_boss', 8], ['meredith_boss', 9],
  ['regional_director', 10], ['algorithm', 10],
];

async function main() {
  const { ENEMY_ABILITIES } = await import('../src/data/stats.js');
  _ENEMY_ABILITIES = ENEMY_ABILITIES;

  if (has('points')) {
    console.log('\n=== THE BUDGET (shipped data, derived) ===');
    let grand = 0;
    for (const [id, tree] of Object.entries(TREES)) {
      if (id === 'shipped') continue;
      const total = tree.order.reduce((n, r) => n + r[1], 0);
      grand += total;
      console.log(`\n${tree.label}  ${total} pts`);
      for (const [nid, cost, tier] of tree.order) {
        console.log(`   ${nid.padEnd(26)} ${cost} pt  tier ${tier}  (level ${TIER_LEVEL[tier] || 0}+)`);
      }
    }
    const general = Object.entries(PLAYER_ABILITIES)
      .filter(([, a]) => a.track === 'general' && a.upgradePointCost)
      .reduce((n, [, a]) => n + a.upgradePointCost, 0);
    console.log(`\nGENERAL PRACTICE (shared pool)  ${general} pts`);
    console.log(`\nTOTAL DEMAND ${grand + general} pts   |   SUPPLY 14 pts over 15 levels`);
    console.log('\n=== THE LADDER, as the tier gate actually produces it ===');
    for (let lv = 2; lv <= 12; lv++) {
      const row = ['litigation', 'compliance', 'audit'].map(t => {
        const s = buildUnlocked(t, lv);
        const own = TREES[t].order.filter(([id]) => s.has(id)).map(([id]) => id);
        return `${own.length}`;
      });
      console.log(`  L${String(lv).padEnd(3)} pts ${String(lv - 1).padEnd(3)} nodes owned  lit ${row[0]}  comp ${row[1]}  audit ${row[2]}`);
    }
    for (const t of ['litigation', 'compliance', 'audit']) {
      const s = buildUnlocked(t, 10);
      console.log(`  L10 ${t.padEnd(11)}: ${TREES[t].order.filter(([id]) => s.has(id)).map(([id]) => id).join(', ')}`);
    }
  }

  if (has('package')) {
    console.log(`\n=== THE LADDER + THE DIVERSITY BAND (${RUNS} runs/cell, shipped code) ===`);
    console.log('encounter               lvl  win: base / lit / comp / audit          rounds                    HP-left                   band');
    let worst = 0;
    for (const [e, lv] of LADDER) {
      const r = ['shipped', 'litigation', 'compliance', 'audit'].map(t => batch(e, lv, t, RUNS));
      const wins = r.map(x => x.win);
      const band = (Math.max(...wins.slice(1)) - Math.min(...wins.slice(1))) * 100;
      worst = Math.max(worst, band);
      console.log(`${e.padEnd(22)} ${String(lv).padStart(3)}  `
        + r.map(x => pct(x.win).padStart(6)).join(' /')
        + '   ' + r.map(x => n2(x.rounds).padStart(5)).join(' /')
        + '   ' + r.map(x => pct(x.hpLeft).padStart(6)).join(' /')
        + `   ${band.toFixed(1)} pp`);
    }
    console.log(`\nMAX WIN-RATE SPREAD ACROSS THE THREE LANES: ${worst.toFixed(1)} pp   (dossier band: <= ~8.0 pp)`);
  }

  if (has('shape')) {
    console.log(`\n=== WHERE EACH LANE'S COMPOSURE COMES FROM (${RUNS} runs/cell) ===`);
    console.log('compW = Composure taken by weakness hits. compOTH = every other issuer.');
    console.log('encounter          build        win     supers  compW   compOTH  breaks  brace  find/esc  topTag');
    const cells = [['chad', 6], ['grandma', 8], ['meredith_boss', 9], ['regional_director', 10], ['algorithm', 10]];
    let compOK = true;
    for (const [e, lv] of cells) {
      for (const t of ['shipped', 'litigation', 'compliance', 'audit']) {
        const r = batch(e, lv, t, RUNS);
        if ((t === 'compliance' || t === 'audit') && r.compOTH <= 0) compOK = false;
        console.log(`${e.padEnd(18)} ${t.padEnd(12)} ${pct(r.win).padStart(6)} ${n2(r.supers).padStart(7)} `
          + `${n2(r.compW).padStart(7)} ${n2(r.compOTH).padStart(8)} ${n2(r.breaks).padStart(7)} ${n2(r.braces).padStart(6)} `
          + `${n2(r.esc).padStart(8)} ${(r.supers < 1.0 ? '  (n/a)' : pct(r.topTag)).padStart(8)}`);
      }
    }
    console.log(`\ncompOTH NON-ZERO for compliance and audit on every cell: ${compOK ? 'YES' : 'NO'}`);
  }

  if (has('pivot')) {
    console.log(`\n=== TOP-TAG SHARE, SHIPPED KIT (${RUNS} runs/cell) — the producer's number ===`);
    console.log('A player who never opens the Abilities tab. topTag = share of Andrew\'s tagged');
    console.log('hits spent on his single most-used practice area.');
    console.log('encounter               lvl   topTag   tags   win     rounds  HP-left');
    for (const [e, lv] of LADDER) {
      const r = batch(e, lv, 'shipped', RUNS);
      console.log(`${e.padEnd(22)} ${String(lv).padStart(3)}   ${pct(r.topTag).padStart(6)} ${String(r.tagsN).padStart(6)} `
        + `${pct(r.win).padStart(7)} ${n2(r.rounds).padStart(7)} ${pct(r.hpLeft).padStart(8)}`);
    }
  }

  if (has('pip')) {
    console.log(`\n=== THE CASUAL / PIP FLOOR (${RUNS} runs/cell) — the hard constraint ===`);
    console.log('CASUAL never lands a tagged hit and never Braces, so every tree node and the');
    console.log('whole Pivot are unreachable by construction. Any movement is a bug.');
    console.log('encounter               lvl   PIP 0%    PIP 20%   PIP 30%');
    const cells = [['karen', 3], ['karen', 4], ['grandma', 7], ['grandma', 8],
      ['meredith_boss', 9], ['regional_director', 10], ['algorithm', 10]];
    for (const [e, lv] of cells) {
      const row = [0, 0.20, 0.30].map(pip => {
        const cfg = enc(e);
        if (PARTY[e] && cfg.party.length === 0) cfg.party = [...PARTY[e]];
        let wins = 0;
        for (let i = 0; i < RUNS; i++) {
          const r = runFight({ ...cfg, unlocked: buildUnlocked('shipped', lv), pipResist: pip }, lv, { policy: casualTurn });
          if (r.win) wins++;
        }
        return wins / RUNS;
      });
      console.log(`${e.padEnd(22)} ${String(lv).padStart(3)}   ${row.map(x => pct(x).padStart(7)).join('   ')}`);
    }
  }

  if (has('day')) {
    // D5's required check, in the form the ruling is actually about: does a
    // player who commits to a lane at level 2 have a harder RECEPTION LOOP?
    // The full Billable Day ledger (`node tools/day-sim.mjs --slots`) runs the
    // shipped kit and is unmoved by the trees; this is the per-lane read the
    // Compliance blurb's warning is priced against.
    const { generateDayClient } = await import('../src/data/ClientGenerator.js');
    const { ENEMY_STATS } = await import('../src/data/stats.js');
    console.log(`
=== RECEPTION, PER LANE (${RUNS} runs/cell) — D5's check ===`);
    console.log('lvl  slot  build         win      rounds   HP-left');
    for (const lv of [4, 8]) {
      for (const slot of [0, 3]) {
        for (const t of ['shipped', 'litigation', 'compliance', 'audit']) {
          const unlocked = buildUnlocked(t, lv);
          let wins = 0, rounds = 0, hp = 0;
          for (let i = 0; i < RUNS; i++) {
            const client = generateDayClient({ index: slot, total: 4, playerLevel: lv, partySize: 0 });
            Object.assign(ENEMY_STATS.reception_client, { ...client.enemyStats });
            const r = runFight(
              { primary: 'reception_client', enemyIds: ['reception_client'], party: [], unlocked },
              lv,
              { policy: POLICIES[t] },
            );
            if (r.win) wins++;
            rounds += r.rounds; hp += r.hpPct;
          }
          console.log(`${String(lv).padStart(3)}  ${String(slot).padStart(4)}  ${t.padEnd(12)} `
            + `${pct(wins / RUNS).padStart(6)}  ${n2(rounds / RUNS).padStart(7)}  ${pct(hp / RUNS).padStart(7)}`);
        }
      }
    }
  }

  if (has('onemore')) {
    console.log(`\n=== EFFECTIVE ENEMY TURNS UNDER THE TURN-BACK (${RUNS} runs/cell) ===`);
    console.log('eff.T = rounds - fizzles - broken turns. The bar is >= ~89% of baseline,');
    console.log('with restructuring_trio the known crowd exception.');
    console.log('encounter               lvl  build        eff.T   vs base   uc/fight  msj/fight');
    const cells = [['grandma', 10], ['meredith_boss', 10], ['regional_director', 10],
      ['algorithm', 10], ['restructuring_trio', 10]];
    for (const [e, lv] of cells) {
      // BASELINE: the same lane with the turn-back suppressed, so the comparison
      // isolates the mechanism rather than the lane.
      const base = batch(e, lv, 'litigation', RUNS, {});
      const noTB = (() => {
        const cfg = enc(e);
        if (PARTY[e] && cfg.party.length === 0) cfg.party = [...PARTY[e]];
        const unlocked = buildUnlocked('litigation', lv);
        let rounds = 0, fizz = 0, brok = 0;
        for (let i = 0; i < RUNS; i++) {
          const st = { actions: 0, supers: 0, breaks: 0, braces: 0, perfect: 0, compW: 0, compOTH: 0, fizzles: 0, brokenTurns: 0, ucProcs: 0, msjProcs: 0, tags: {}, tagTotal: 0 };
          const r = runFight({ ...cfg, unlocked }, lv, {
            policy: (en, s, u) => { const g = en.turnBackReady; litigationTurn(en, s, u); en.turnBackReady = null; void g; },
            onEngine: (en) => { instrument(en, st); en._armTurnBack = () => {}; },
          });
          rounds += r.rounds; fizz += st.fizzles; brok += st.brokenTurns;
        }
        return (rounds - fizz - brok) / RUNS;
      })();
      const ratio = noTB > 0 ? base.effT / noTB : 1;
      console.log(`${e.padEnd(22)} ${String(lv).padStart(3)}  litigation  ${n2(base.effT).padStart(6)} `
        + `${pct(ratio).padStart(8)}   ${n2(base.uc).padStart(7)}  ${n2(base.msj).padStart(8)}`);
    }
  }
}

main();
