// _j-synth.mjs — THROWAWAY harness for the J-run SYNTHESIS lane.
//
// Wraps tools/_j-build-sim.mjs (D1's trees) and layers on the grafts the
// adversarial panel selected from D2 / D3 / D4:
//
//   REVIVAL       D3 §2.3 — hpThreshold 0 -> 0.12 on rachel_boss + regional_director
//   PIVOT         D3 Appendix A — per-phase weakness/resistance (replaces D1 §4)
//   TIER_LEVEL    D2 §5.4 — { 1:2, 2:6, 3:10 } level gate on tiered purchases
//   RESERVATION   D2 M2d "Turnabout", renamed, as the Compliance capstone
//   PROFILE       D3 §6.2 — the per-enemy maxComposure package (never A/B'd)
//   AD STRIP      D2 M4  — Assert Dominance strips 70% of maxComposure, power kept
//   Uc            H-run §7 — universal defensive One More ("Objection Sustained")
//   MSJ           D1 §6   — the aggressive One More as Litigation's capstone
//
// Nothing in src/ is modified. Enemy data is mutated IN MEMORY only.
//
//   node tools/_j-synth.mjs --revival     # graft 1, standalone, incl. PIP + NG+
//   node tools/_j-synth.mjs --pivot       # graft 1b, top-tag census per lane
//   node tools/_j-synth.mjs --gate        # graft 4, TIER_LEVEL A/B
//   node tools/_j-synth.mjs --capstoneab  # graft 3, Reservation vs Subrogation
//   node tools/_j-synth.mjs --package     # THE RECOMMENDED PACKAGE, ladder
//   node tools/_j-synth.mjs --shape       # where each lane's currencies come from
//   node tools/_j-synth.mjs --profile     # graft 6, maxComposure package A/B
//   node tools/_j-synth.mjs --ad          # graft 7, Assert Dominance + the strip
//   node tools/_j-synth.mjs --onemore     # Uc x trees, Uc + MSJ
//   node tools/_j-synth.mjs --upkeep      # graft 10, the Audit lane's MP economy
//   node tools/_j-synth.mjs --pip         # the casual floor, whole package
//   node tools/_j-synth.mjs --ng          # NG+ laps, whole package
//   node tools/_j-synth.mjs --day         # Reception inertness
//   node tools/_j-synth.mjs --runs 300

// The wrapped harness runs its own CLI at import time. Silence it.
const REAL_ARGV = process.argv.slice(2);
process.argv = [process.argv[0], process.argv[1]];
const _log = console.log; console.log = () => {};
const B = await import('./_j-build-sim.mjs');
const CS = await import('./combat-sim.mjs');
console.log = _log;
const { PLAYER_ABILITIES, ENEMY_ABILITIES, ENEMY_STATS } = await import('../src/data/stats.js');
const { COMBAT_DEPTH } = await import('../src/combat/CombatEngine.js');
process.argv = [process.argv[0], process.argv[1], ...REAL_ARGV];

const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);
const n1 = (x) => x.toFixed(1);
const dpp = (x) => (x >= 0 ? '+' : '') + (x * 100).toFixed(1);

// ════════════════════════════════════════════════════════════════════════
// 1. GRAFT — THE REVIVAL  (D3 §2.3).  Two numbers.
//    getActivePhaseIndex picks the phase with the LOWEST hpThreshold that is
//    still >= hpPercent; `hpPercent <= 0` is only true at death, so the third
//    phase of these three bosses has never fired in a shipped build.
// ════════════════════════════════════════════════════════════════════════
const DEAD_PHASES = ['rachel_boss', 'regional_director', 'algorithm'];
// RECOMMENDED: Meredith ONLY. regional_director is DEFERRED alongside the
// algorithm — measured at -13.7pp on CARRY@NG+2 and -7.0pp on CARRY@NG+3
// (--revsweep, 800 runs). D3 priced the Revival as two free numbers; it is one.
const REVIVE_AT = { rachel_boss: 0.12 };
const _origThresholds = {};
for (const id of DEAD_PHASES) {
  const ph = ENEMY_STATS[id]?.phases;
  if (ph && ph.length) _origThresholds[id] = ph[ph.length - 1].hpThreshold;
}
function setRevival(on, extra = {}) {
  const table = { ...REVIVE_AT, ...extra };
  for (const id of DEAD_PHASES) {
    const ph = ENEMY_STATS[id]?.phases;
    if (!ph || !ph.length) continue;
    ph[ph.length - 1].hpThreshold = on && table[id] != null ? table[id] : _origThresholds[id];
  }
}

// ════════════════════════════════════════════════════════════════════════
// 2. GRAFT — THE PIVOT  (D3 Appendix A, overriding D1 §4).
//    Two authoring laws are baked in: Karen and Chad pivot ONCE and LATE, and
//    the social phase goes LAST.
// ════════════════════════════════════════════════════════════════════════
// KAREN IS EXEMT IN THE RECOMMENDED TABLE. Measured (--pivottune, 800 runs):
// her pivot costs the shipped kit 97.1% -> 94.6% and buys topTag 61.7 -> 51.9
// on a 4.4-round tutorial fight. Exempting her puts the shipped kit back at
// 97.0% and costs nothing anywhere else. Same reasoning D3 used to exempt her
// from the Record: the tutorial boss teaches exactly one thing.
const PIVOT_D3 = {
  _karen_exempt: [
    { hpThreshold: 0.5, weakness: 'legal', resistance: 'social' },
    { hpThreshold: 0.25, weakness: 'audit', resistance: 'social' },
  ],
  chad: [
    { hpThreshold: 0.5, weakness: 'social', resistance: 'legal' },   // no pivot: social is the shallow lane at L5-6
    { hpThreshold: 0.25, weakness: 'audit', resistance: 'legal' },   // rage-quit: show him the balance
  ],
  grandma: [
    { hpThreshold: 0.5, weakness: 'social', resistance: 'audit' },   // The Look
    { hpThreshold: 0.25, weakness: 'legal', resistance: 'audit' },   // the final revision
  ],
  rachel_boss: [
    { hpThreshold: 0.6, weakness: 'legal', resistance: 'audit' },
    { hpThreshold: 0.3, weakness: 'audit', resistance: 'legal' },
    { hpThreshold: 0.12, weakness: 'social', resistance: 'legal' },  // social LAST
  ],
  regional_director: [
    { hpThreshold: 0.6, weakness: 'audit', resistance: 'legal' },
    { hpThreshold: 0.3, weakness: 'legal', resistance: 'audit' },
    { hpThreshold: 0.12, weakness: 'social', resistance: 'audit' },  // social LAST
  ],
  // algorithm: DELIBERATELY ABSENT — it does not pivot (D3 §2.2).
};
function installPivotTable() {
  for (const k of Object.keys(B.PHASE_WEAKNESS)) delete B.PHASE_WEAKNESS[k];
  Object.assign(B.PHASE_WEAKNESS, PIVOT_D3);
}
installPivotTable();

/** Standalone rotation patch (batchBuild's own applyRotation is private). */
function patchRotation(engine, acc) {
  const check = () => {
    for (const e of engine.enemies) {
      if (e.hp <= 0) continue;
      const rows = B.PHASE_WEAKNESS[e.enemyId];
      if (!rows) continue;
      const hpPct = e.hp / e.maxHP;
      let active = null;
      for (const row of rows) {
        if (hpPct <= row.hpThreshold && (!active || row.hpThreshold <= active.hpThreshold)) active = row;
      }
      if (active && e._synthPhaseW !== active.hpThreshold) {
        e._synthPhaseW = active.hpThreshold;
        e.weakness = active.weakness;
        e.resistance = active.resistance ?? e.resistance;
        if (acc) acc.rotations++;
      }
    }
  };
  const realPick = engine._pickEnemyAbility.bind(engine);
  engine._pickEnemyAbility = (e) => { check(); return realPick(e); };
  const realTele = engine.telegraph.bind(engine);
  engine.telegraph = () => { check(); return realTele(); };
}

// ════════════════════════════════════════════════════════════════════════
// 3. GRAFT — RESERVATION OF RIGHTS  (D2 M2d "Turnabout", renamed).
//    A braced hit reflects 35% (good) / 60% (perfect) of the PRE-HALVE damage
//    back at the sender. It is the only damage in the game computed from the
//    OPPONENT's Assertiveness, so it is strongest exactly where a weakness
//    build is weakest (Grandma atk 27, the Algorithm atk 30) and worthless
//    against fodder. Self-balancing; no per-encounter tuning.
// ════════════════════════════════════════════════════════════════════════
const RESERVE = { good: 0.35, perfect: 0.60 };

const SYNTH_ABILITIES = {
  reservation_of_rights: {
    name: 'Reservation of Rights', type: 'passive', tree: 'compliance', depth: 5,
    tier: 2, upgradePointCost: 1, cost: 0, requires: 'adverse_inference',
    description: 'Accepted under protest. A braced hit comes back at them for 35% of what it was going to be — 60% if the brace was perfect — computed from THEIR Assertiveness, not yours.',
  },
};
Object.assign(PLAYER_ABILITIES, SYNTH_ABILITIES);

// ── TIER FIELDS on D1's nodes.  Two shipped systems key off `tier`:
//    Player.canUnlockAbility returns false at tier 0, and
//    MenuState._spentUpgradePoints SKIPS `(a.tier ?? 0) === 0` — so a node with
//    no `tier` is buyable but is NOT refunded by Request Restructuring. Every
//    new node therefore needs an explicit tier. Verified against the shipped
//    source; this is a build-lane landmine, not a sim convenience.
const NODE_TIER = {
  aggravating_factors: 1, escalate: 1, motion_summary_judgment: 3,
  contemporaneous_notes: 1, adverse_inference: 1, notice_of_deficiency: 2,
  standard_of_care: 2, subrogation: 3, reservation_of_rights: 2,
  findings: 1, tie_out: 1, scope_expansion: 1, management_letter: 2,
  adverse_opinion: 2, material_weakness: 3,
};
for (const [id, t] of Object.entries(NODE_TIER)) if (PLAYER_ABILITIES[id]) PLAYER_ABILITIES[id].tier = t;

// ── The Compliance tree, with the capstone swappable for the A/B.
const COMPLIANCE_SUBRO = [...B.TREES.compliance.order];   // D1 as written
// Reservation AS THE CAPSTONE (the panel's graft-list gloss).
const COMPLIANCE_RESERVE = [
  ['contemporaneous_notes', 1], ['adverse_inference', 1], ['notice_of_deficiency', 2],
  ['fiduciary_shield', 1], ['standard_of_care', 2], ['reservation_of_rights', 2],
];
// Reservation AS A NODE BESIDE STANDARD OF CARE, displacing fiduciary_shield —
// the ordered instruction, and the shape the numbers prefer. Subrogation stays
// the capstone. Same 9 points; the tree loses only a generic +8 DEF buff.
const COMPLIANCE_BOTH = [
  ['contemporaneous_notes', 1], ['adverse_inference', 1], ['notice_of_deficiency', 2],
  ['reservation_of_rights', 1], ['standard_of_care', 2], ['subrogation', 2],
];
function setComplianceCapstone(which) {
  B.TREES.compliance.order = which === 'reserve' ? [...COMPLIANCE_RESERVE]
    : which === 'both' ? [...COMPLIANCE_BOTH] : [...COMPLIANCE_SUBRO];
}
setComplianceCapstone('both');

// ════════════════════════════════════════════════════════════════════════
// 4. GRAFT — THE TIER GATE  (D2 §5.4).  PLAYER_ABILITIES has tier / requires /
//    upgradePointCost but NO level gate, so an L4 player with 3 points buys
//    cite_precedent + per_my_last_email (a 55-power tier-2 nuke).
// ════════════════════════════════════════════════════════════════════════
const TIER_LEVEL = { 1: 2, 2: 6, 3: 10 };
const STARTERS = ['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check'];

function synthUnlocked(treeId, level, opts = {}) {
  const gate = opts.tierGate !== false;
  const s = new Set(STARTERS);
  let points = Math.max(0, level - 1) + (opts.extraPoints || 0);
  for (const [id, cost] of B.TREES[treeId].order) {
    if (cost === 0) continue;
    const tier = PLAYER_ABILITIES[id]?.tier ?? 1;
    if (gate && level < (TIER_LEVEL[tier] || 0)) break;    // prereq chain: break, do not skip
    if (points < cost) break;
    points -= cost;
    s.add(id);
  }
  if (level >= 9 && !opts.noQuest) { s.add('notarized_strike'); s.add('root_access'); }
  return s;
}
function synthSpent(treeId, level, opts = {}) {
  const gate = opts.tierGate !== false;
  let points = Math.max(0, level - 1) + (opts.extraPoints || 0);
  let spent = 0;
  for (const [id, cost] of B.TREES[treeId].order) {
    if (cost === 0) continue;
    const tier = PLAYER_ABILITIES[id]?.tier ?? 1;
    if (gate && level < (TIER_LEVEL[tier] || 0)) break;
    if (points < cost) break;
    points -= cost; spent += cost;
  }
  return spent;
}

// ════════════════════════════════════════════════════════════════════════
// 5. GRAFT — THE COMPOSURE PROFILE  (D3 §6.2).  One authored integer per
//    enemy decides which lane is correct against them. D3 swept the dials
//    individually and never ran the eight-enemy table as one config.
// ════════════════════════════════════════════════════════════════════════
const PROFILE_D3 = {   // D3 §6.2 as written
  karen: 90, chad: 60, grandma: 120, corporate_lawyer: 60,
  chief_of_restructuring: 180, rachel_boss: 120, regional_director: 180, algorithm: 120,
};
// RECOMMENDED: the DOWN dials only. Raising a bar above the shipped 120 ceiling
// does not make the "Closer" lane correct on that boss; it deletes the Break
// economy for every lane at once (regional_director breaks 0.99 -> 0.12 on
// Litigation, -7.3pp HP). Same failure as D2 §9.1's bar-scale null result,
// arriving at single-enemy scale.
const PROFILE_DOWN = { chad: 60, corporate_lawyer: 60 };
let PROFILE = PROFILE_DOWN;
const _origComposure = {};
for (const id of Object.keys(PROFILE_D3)) _origComposure[id] = ENEMY_STATS[id]?.maxComposure;
function setProfile(on) {
  const table = on === 'd3' ? PROFILE_D3 : PROFILE;
  for (const id of Object.keys(PROFILE_D3)) {
    if (!ENEMY_STATS[id]) continue;
    if (on && table[id] != null) ENEMY_STATS[id].maxComposure = table[id];
    else if (_origComposure[id] === undefined) delete ENEMY_STATS[id].maxComposure;
    else ENEMY_STATS[id].maxComposure = _origComposure[id];
  }
}

// ════════════════════════════════════════════════════════════════════════
// 6. ENGINE PATCHES applied through batchBuild's opts.onEngine hook (which
//    runs AFTER D1's applyBuildPatches and applyRotation, so these are the
//    outermost wrappers).
// ════════════════════════════════════════════════════════════════════════
let ACC = null;
function freshAcc() {
  return {
    rotations: 0, reserveProcs: 0, reserveDamage: 0, adUses: 0, adComposure: 0,
    ucProcs: 0, tagHits: 0, tagCount: {}, basics: 0, mpStarved: 0, endMp: 0,
    fights: 0, allyTagged: 0,
  };
}

function patchTagCensus(engine, acc) {
  const realAb = engine.playerAbility.bind(engine);
  engine.playerAbility = (id, ti) => {
    const r = realAb(id, ti);
    const a = PLAYER_ABILITIES[id];
    if (r && a && a.tag && !engine._synthInner) {
      acc.tagHits++;
      acc.tagCount[a.tag] = (acc.tagCount[a.tag] || 0) + 1;
    }
    return r;
  };
  const realAtk = engine.playerAttack.bind(engine);
  engine.playerAttack = (ti) => { const r = realAtk(ti); if (r) acc.basics++; return r; };
}

function patchReservation(engine, nodes, acc) {
  if (!nodes.has('reservation_of_rights')) return;
  const realBrace = engine.playerBrace.bind(engine);
  engine.playerBrace = (q = 'good') => { engine.player._synthBraceQ = q; return realBrace(q); };
  const realExec = engine._executeEnemyAbility.bind(engine);
  engine._executeEnemyAbility = (enemy, abilityId, eStats, pStats, prev, target, lockMult) => {
    const wasBracing = engine.player.bracing;
    const q = engine.player._synthBraceQ || 'good';
    const r = realExec(enemy, abilityId, eStats, pStats, prev, target, lockMult);
    // `braced` is set by the engine in exactly two places (attack, summon) and
    // is already on the result object. The reflect resolves on that frame.
    if (wasBracing && r && r.braced && r.damage > 0 && enemy && enemy.hp > 0) {
      const preHalve = r.damage * 2;                       // the engine halves with floor(x*0.5)
      const back = Math.max(1, Math.floor(preHalve * (RESERVE[q] ?? RESERVE.good)));
      enemy.hp = Math.max(0, enemy.hp - back);
      acc.reserveProcs++; acc.reserveDamage += back;
      engine._checkVictory && engine._checkVictory();
    }
    return r;
  };
}

/** D2 M4 — Assert Dominance strips 70% of the bar. Power UNCHANGED at 75. */
function patchAssertStrip(engine, acc, on) {
  const realPM = engine.playerPowerMove.bind(engine);
  engine.playerPowerMove = (ti) => {
    const idx = ti ?? engine.targetEnemyIndex ?? 0;
    const r = realPM(ti);
    if (r) {
      acc.adUses++;
      const t = engine.enemies[idx];
      if (on && t && t.hp > 0 && t.maxComposure > 0 && t.broken <= 0) {
        const res = engine._reduceComposure(t, Math.round(0.70 * t.maxComposure));
        acc.adComposure += res.amount;
      }
    }
    return r;
  };
}

/** Forces the "save for Assert Dominance" policy: PA and Escalate unaffordable. */
function patchSaveForAD(engine) {
  engine.getPressAdvantageCost = () => 9999;
  engine.playerPressAdvantage = () => null;
}

/**
 * H-run `Uc` — OBJECTION SUSTAINED. A weakness hit returns one action that may
 * only DEFEND or SUSTAIN. Implemented at the engine layer rather than the policy
 * layer because the returned menu is a fixed four-item decision (Brace / heal /
 * self-buff / item) — no lane policy is needed to pick from it.
 * Gates copied verbatim from weakness-turnback-economy.md §7.1.
 */
function patchUc(engine, acc, sim, upgrade = false) {
  // MSJ AS AN UPGRADE OF Uc, not an addition to it. D1 §6 says this in prose
  // ("Litigation's capstone upgrades one of those returns per engagement into
  // a real turn") but priced it as a separate proc. Priced as an addition it
  // pushes Litigation to 66-91% of baseline effective enemy turns; priced as
  // an upgrade the RETURN COUNT is unchanged and only its quality moves.
  // MEASURED AND REJECTED: letting the returned turn spend the momentum verbs
  // (Assert Dominance / Retaliate) costs 62-74% of baseline effective enemy
  // turns — a returned turn carrying a 75-power DEF-ignoring hit is worth
  // about a quarter of a boss. The returned turn is a BASIC ATTACK: untagged
  // by construction, so it can never publish `super` and can never re-arm.
  const upgraded = (ti) => {
    engine._synthInner = true;
    try { return !!engine.playerAttack(ti); }
    finally { engine._synthInner = false; }
  };
  const sustain = () => {
    const p = engine.player;
    if (engine.isOver) return;
    engine._synthInner = true;
    try {
      const hpRatio = p.hp / p.maxHP;
      const anyTelegraph = engine.enemies.some(e => e.hp > 0 && e.telegraphedAbility);
      if (!p.bracing && anyTelegraph) { engine.playerBrace(CS.rollBraceQuality(1)); return; }
      if (hpRatio < 0.75 && !p.silencedThisTurn && p.mp >= PLAYER_ABILITIES.coffee_break.cost) {
        engine.playerAbility('coffee_break'); return;
      }
      if (!p.silencedThisTurn && p._synthUnlocked?.has('fiduciary_shield')
        && !p.buffs.some(b => b.name === PLAYER_ABILITIES.fiduciary_shield.name)
        && p.mp >= PLAYER_ABILITIES.fiduciary_shield.cost) {
        engine.playerAbility('fiduciary_shield'); return;
      }
      if (sim && sim.coffees > 0 && p.mp < 30) { sim.coffees--; engine.playerItem('coffee_large'); }
    } finally { engine._synthInner = false; }
  };
  const arm = (r, preBroken, ti) => {
    if (!r) return;
    if (engine._synthInner) return;                        // the returned turn cannot re-arm
    if (engine.player._synthUcUsedThisTurn) return;        // once per Andrew turn
    const sup = r.effective === 'super' || (r.hits || []).some(h => h.effective === 'super');
    if (!sup) return;
    if (r.brokeComposure || r.broke || (r.hits || []).some(h => h.brokeComposure)) return;  // gate 2
    if (preBroken) return;                                 // gate 3 — P5R no-re-down
    engine.player._synthUcUsedThisTurn = true;
    acc.ucProcs++;
    if (upgrade && !engine.player._synthMsjUsed) {
      engine.player._synthMsjUsed = true;
      if (upgraded(ti)) return;
    }
    sustain();
  };
  for (const name of ['playerAbility', 'playerAttack']) {
    const real = engine[name].bind(engine);
    engine[name] = (...args) => {
      const ti = (name === 'playerAttack' ? args[0] : args[1]) ?? engine.targetEnemyIndex ?? 0;
      const t = engine.enemies[ti];
      const preBroken = !!(t && (t.broken > 0 || t.brokenBonus > 0));
      const r = real(...args);
      arm(r, preBroken, ti);
      return r;
    };
  }
  const realTS = engine.processTurnStart.bind(engine);
  engine.processTurnStart = (ent) => {
    if (ent === engine.player) engine.player._synthUcUsedThisTurn = false;
    return realTS(ent);
  };
}

// ── The composed onEngine hook ──────────────────────────────────────────
function makeHook(nodes, o = {}) {
  return (engine, st) => {
    engine.player._synthUnlocked = nodes;
    if (o.tagCensus !== false) patchTagCensus(engine, ACC);
    patchReservation(engine, nodes, ACC);
    patchAssertStrip(engine, ACC, !!o.adStrip);
    if (o.saveForAD) patchSaveForAD(engine);
    if (o.uc) patchUc(engine, ACC, null, !!o.ucUpgrade && !!o._msjOwned);
    if (o.trackMp) {
      const realTele = engine.telegraph.bind(engine);
      engine.telegraph = () => { if (engine.player.mp < 12) ACC.mpStarved++; return realTele(); };
    }
  };
}

// ════════════════════════════════════════════════════════════════════════
// 7. Runner
// ════════════════════════════════════════════════════════════════════════
const LADDER = B.LADDER;
function cfgFor(row) {
  const c = CS.enc(row.id);
  if (row.party) c.party = row.party;
  c.partyOverrides = CS.buildPartyOverrides(c.party, row.level);
  return c;
}

/**
 * cfgOpts: { revival, pivot, profile, tierGate, adStrip, uc, saveForAD, msj }
 */
function run(row, treeId, runs, o = {}) {
  setRevival(o.revival !== false);
  setProfile(o.profile || false);
  const savedMsj = B.TUNE.MSJ_MODE;
  ACC = freshAcc();
  let nodes = o.unlocked || synthUnlocked(treeId, row.level, { tierGate: o.tierGate !== false });
  // Disabling MSJ means NOT OWNING THE NODE. Do not do it by setting
  // TUNE.MSJ_MODE to a value withMSJ does not recognise — that removes the
  // gate entirely and the capstone fires UNLIMITED times (measured: 2.0-2.5
  // procs/fight). This bug ate one full pass of --pivot/--profile/--onemore.
  const msjOwned = nodes.has('motion_summary_judgment');
  // ucUpgrade routes the capstone THROUGH the Uc return instead of adding a
  // second one, so withMSJ must be switched off or the fight gets both.
  if ((o.msj === false || o.ucUpgrade) && msjOwned) {
    nodes = new Set([...nodes].filter(id => id !== 'motion_summary_judgment'));
  }
  o = { ...o, _msjOwned: msjOwned && o.msj !== false };
  const r = B.batchBuild(cfgFor(row), row.level, runs, treeId, {
    unlocked: nodes,
    rotate: o.pivot !== false,
    onEngine: makeHook(nodes, o),
  });
  B.TUNE.MSJ_MODE = savedMsj;
  const acc = ACC;
  const topTag = acc.tagHits
    ? Math.max(...Object.values(acc.tagCount)) / acc.tagHits : 0;
  const tags = acc.tagHits
    ? Object.values(acc.tagCount).filter(v => v / acc.tagHits >= 0.10).length : 0;
  return {
    ...r, acc, topTag, tags,
    reserveProcs: acc.reserveProcs / runs, reserveDamage: acc.reserveDamage / runs,
    adUses: acc.adUses / runs, adComposure: acc.adComposure / runs,
    ucProcs: acc.ucProcs / runs, points: synthSpent(treeId, row.level, { tierGate: o.tierGate !== false }),
  };
}

/** CASUAL / PIP arm: no build patches are reachable, so run the raw engine. */
function runCasual(row, runs, pip, o = {}) {
  setRevival(!!o.revival);
  setProfile(o.profile || false);
  ACC = freshAcc();
  const cfg = { ...cfgFor(row), pipResist: pip };
  let wins = 0;
  for (let i = 0; i < runs; i++) {
    const r = CS.runFight({ ...cfg, unlocked: CS.unlockedAbilities(row.level) }, row.level, {
      policy: CS.casualTurn,
      onEngine: (e) => {
        if (o.pivot) patchRotation(e, ACC);
        patchAssertStrip(e, ACC, !!o.adStrip);
      },
    });
    if (r.win) wins++;
  }
  return { winRate: wins / runs, adUses: ACC.adUses / runs };
}

// ════════════════════════════════════════════════════════════════════════
// 8. MODES
// ════════════════════════════════════════════════════════════════════════
const OFF = { revival: false, pivot: false, profile: false, tierGate: false, msj: false };
const PKG = { revival: true, pivot: true, profile: false, tierGate: true, msj: true };

function hdr(cols) { console.log(cols.map(([t, w]) => String(t).padStart(w)).join('')); }
function rowOut(cells) { console.log(cells.map(([t, w]) => String(t).padStart(w)).join('')); }

function modeRevival(runs) {
  console.log(`\n=== GRAFT 1 — THE REVIVAL, standalone (${runs} runs/cell) ===`);
  console.log('hpThreshold 0 -> 0.12 on rachel_boss + regional_director. Shipped kit,');
  console.log('COMPETENT policy, no other graft on. algorithm stays DEFERRED (D3 §5.5).');
  const rows = [
    { id: 'rachel_boss', level: 8 }, { id: 'rachel_boss', level: 9 },
    { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
    { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
    { id: 'grandma', level: 8 },
  ];
  hdr([['encounter', -22], ['revival', 10], ['win', 9], ['rounds', 9], ['HPleft', 9], ['breaks', 8], ['eff.T', 8]]);
  for (const row of rows) {
    for (const on of [false, true]) {
      const r = run(row, 'shipped', runs, { ...OFF, revival: on });
      rowOut([[`${row.id}@${row.level}`.padEnd(22), -22], [on ? 'ON' : 'off', 10],
      [pct(r.winRate), 9], [n2(r.avgRounds), 9], [pct(r.avgHpLeft), 9],
      [n2(r.breaks), 8], [n2(r.effTurns), 8]]);
    }
  }
  console.log('\n-- NG+ laps (shipped kit) — D3 predicts Meredith IMPROVES 6-8pp --');
  hdr([['encounter', -22], ['revival', 10], ['FRESH@NG', 12], ['CARRY@NG+1', 13], ['CARRY@NG+2', 13], ['CARRY@NG+3', 13]]);
  for (const row of [{ id: 'rachel_boss', level: 9 }, { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] }]) {
    for (const on of [false, true]) {
      const cells = [];
      const fresh = run({ ...row }, 'shipped', runs, { ...OFF, revival: on, unlocked: CS.unlockedAbilities(row.level), ngPlus: true });
      cells.push(fresh);
      for (const lap of [1, 2, 3]) {
        setRevival(on); ACC = freshAcc();
        const nodes = CS.unlockedAbilities(15);
        const r = B.batchBuild({ ...cfgFor(row), ngPlus: true, ngPlusCount: lap }, row.level, runs, 'shipped',
          { unlocked: nodes, rotate: false, onEngine: makeHook(nodes, {}) });
        cells.push(r);
      }
      rowOut([[`${row.id}@${row.level}`.padEnd(22), -22], [on ? 'ON' : 'off', 10],
      ...cells.map(c => [pct(c.winRate), c === cells[0] ? 12 : 13])]);
    }
  }
  console.log('\nNOTE: the FRESH@NG column above is run without ngPlus scaling on the first');
  console.log('cell by construction (it is the level-matched fresh ladder); read the three');
  console.log('CARRY columns against each other.');
}

function modeRevSweep(runs) {
  console.log(`\n=== GRAFT 1c — CAN THE DIRECTOR'S REVIVAL BE PRICED? (${runs} runs/cell) ===`);
  console.log('Mechanism hypothesis: the Revival costs whatever the boss can do in the');
  console.log('sub-threshold window, and NG+ HP scaling makes that window long. The');
  console.log("Director's revived kit is THREE straight attacks (30/25/24) replacing a");
  console.log('phase that carried quarterly_target, a DoT. Meredith\'s swaps a STUN for an');
  console.log('attack, which is why she is neutral.');
  const row = { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] };
  const sweeps = [
    ['dead (shipped)', null, null],
    ['0.12 (D3)', 0.12, null],
    ['0.08', 0.08, null],
    ['0.05', 0.05, null],
    ['0.12, synergy_blast 25->16', 0.12, ['synergy_blast', 16]],
    ['0.12, all three -6 power', 0.12, ['ALL', -6]],
  ];
  hdr([['variant', -30], ['L10 win', 10], ['rounds', 9], ['HPleft', 9], ['CARRY+1', 10], ['CARRY+2', 10], ['CARRY+3', 10]]);
  const savedPow = {};
  for (const id of ['market_correction', 'synergy_blast', 'corporate_mandate']) savedPow[id] = ENEMY_ABILITIES[id].power;
  for (const [label, thr, tweak] of sweeps) {
    for (const id of Object.keys(savedPow)) ENEMY_ABILITIES[id].power = savedPow[id];
    if (tweak) {
      if (tweak[0] === 'ALL') for (const id of Object.keys(savedPow)) ENEMY_ABILITIES[id].power = savedPow[id] + tweak[1];
      else ENEMY_ABILITIES[tweak[0]].power = tweak[1];
    }
    setRevival(thr != null, { regional_director: thr, rachel_boss: null });
    ACC = freshAcc();
    const nodes = CS.unlockedAbilities(row.level);
    const first = B.batchBuild(cfgFor(row), row.level, runs, 'shipped', { unlocked: nodes, rotate: false, onEngine: makeHook(nodes, {}) });
    const laps = [1, 2, 3].map(lap => {
      setRevival(thr != null, { regional_director: thr, rachel_boss: null });
      ACC = freshAcc();
      const n15 = CS.unlockedAbilities(15);
      return B.batchBuild({ ...cfgFor(row), ngPlus: true, ngPlusCount: lap }, row.level, runs, 'shipped',
        { unlocked: n15, rotate: false, onEngine: makeHook(n15, {}) });
    });
    rowOut([[label.padEnd(30), -30], [pct(first.winRate), 10], [n2(first.avgRounds), 9],
    [pct(first.avgHpLeft), 9], ...laps.map(l => [pct(l.winRate), 10])]);
  }
  for (const id of Object.keys(savedPow)) ENEMY_ABILITIES[id].power = savedPow[id];
}

function modePivot(runs) {
  console.log(`\n=== GRAFT 1b — THE PIVOT (D3 Appendix A) x the three lanes (${runs} runs/cell) ===`);
  console.log('Instrument: topTag% = share of ANDREW\'s tagged hits on his single most-used');
  console.log('practice area (the producer\'s complaint, as a number). tags = areas >=10%.');
  const rows = [
    { id: 'karen', level: 4 }, { id: 'chad', level: 6 }, { id: 'grandma', level: 8 },
    { id: 'rachel_boss', level: 9 }, { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
    { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  for (const treeId of ['shipped', 'litigation', 'compliance', 'audit']) {
    console.log(`\n-- ${treeId.toUpperCase()} --`);
    hdr([['encounter', -22], ['pivot', 8], ['win', 9], ['rounds', 9], ['HPleft', 9], ['topTag', 9], ['tags', 6], ['breaks', 8]]);
    for (const row of rows) {
      for (const on of [false, true]) {
        const r = run(row, treeId, runs, { ...PKG, pivot: on, msj: false });
        rowOut([[`${row.id}@${row.level}`.padEnd(22), -22], [on ? 'ON' : 'off', 8],
        [pct(r.winRate), 9], [n2(r.avgRounds), 9], [pct(r.avgHpLeft), 9],
        [pct(r.topTag), 9], [r.tags, 6], [n2(r.breaks), 8]]);
      }
    }
  }
}

function modePivotTune(runs) {
  console.log(`\n=== GRAFT 1b(ii) — PIVOT TABLE TUNING (${runs} runs/cell) ===`);
  console.log('Two things the --pivot A/B surfaced that D3 did not measure:');
  console.log(' (a) Karen loses win rate under the pivot on TWO lanes (shipped -2.5pp,');
  console.log('     audit -4.8pp). She is the tutorial boss. Does exempting her recover it?');
  console.log(' (b) Meredith gets EASIER (+5.2pp HP) because her phase-1 pivot to `legal`');
  console.log('     hands the player a 45-power button where audit tops out at 40.');
  console.log('     Generalised law under test: NEVER PIVOT TOWARD A TAG THE PLAYER HAS A');
  console.log('     BIGGER BUTTON IN. `technical` (root_access, 40, one ability) is the');
  console.log('     shallowest area in the game.');
  const base = JSON.parse(JSON.stringify(PIVOT_D3));
  const VARIANTS = {
    'off': null,
    'D3 table': base,
    'D3, karen exempt': (() => { const t = JSON.parse(JSON.stringify(base)); delete t.karen; return t; })(),
    'D3, rachel P1 technical': (() => { const t = JSON.parse(JSON.stringify(base)); t.rachel_boss[0].weakness = 'technical'; t.rachel_boss[0].resistance = 'legal'; return t; })(),
    'both fixes': (() => {
      const t = JSON.parse(JSON.stringify(base)); delete t.karen;
      t.rachel_boss[0].weakness = 'technical'; t.rachel_boss[0].resistance = 'legal'; return t;
    })(),
  };
  const rows = [{ id: 'karen', level: 3 }, { id: 'karen', level: 4 }, { id: 'rachel_boss', level: 9 }, { id: 'grandma', level: 8 }];
  for (const [label, table] of Object.entries(VARIANTS)) {
    console.log(`\n-- ${label} --`);
    hdr([['encounter', -20], ['build', -13], ['win', 9], ['rounds', 9], ['HPleft', 9], ['topTag', 9], ['tags', 6]]);
    for (const row of rows) {
      for (const treeId of ['shipped', 'audit', 'litigation']) {
        for (const k of Object.keys(B.PHASE_WEAKNESS)) delete B.PHASE_WEAKNESS[k];
        if (table) Object.assign(B.PHASE_WEAKNESS, JSON.parse(JSON.stringify(table)));
        const r = run(row, treeId, runs, { ...PKG, pivot: !!table, msj: false });
        rowOut([[`${row.id}@${row.level}`.padEnd(20), -20], [treeId.padEnd(13), -13],
        [pct(r.winRate), 9], [n2(r.avgRounds), 9], [pct(r.avgHpLeft), 9],
        [pct(r.topTag), 9], [r.tags, 6]]);
      }
    }
  }
  installPivotTable();
}

function modeGate(runs) {
  console.log(`\n=== GRAFT 4 — THE TIER GATE { 1:2, 2:6, 3:10 } (${runs} runs/cell) ===`);
  console.log('D2 reproduced on SHIPPED data: an L4 player with 3 points buys');
  console.log('cite_precedent + per_my_last_email and deletes Chad. Does the gate bite?');
  // D1's shipped order buys cite_precedent -> due_diligence -> cc_all with its
  // first three points, so D2's exploit is not reachable in it. This is the
  // OPTIMAL SHOPPER order — what a player who reads the numbers actually buys.
  B.TREES.greedy = {
    label: 'GREEDY SHOPPER (D2 exploit)',
    order: [['cite_precedent', 1], ['per_my_last_email', 2], ['forensic_audit', 2],
    ['whistleblower', 2], ['cc_all', 1], ['due_diligence', 1]],
  };
  console.log('\n-- D2 EXPLOIT, reproduced: the OPTIMAL SHOPPER at low level --');
  hdr([['encounter', -20], ['gate', 7], ['pts', 6], ['owns', -34], ['win', 9], ['rounds', 9], ['HPleft', 9]]);
  for (const row of [{ id: 'chad', level: 4 }, { id: 'chad', level: 5 }, { id: 'karen', level: 4 }, { id: 'grandma', level: 6 }]) {
    for (const gate of [false, true]) {
      const r = run(row, 'greedy', runs, { ...PKG, tierGate: gate, msj: false });
      const owns = [...synthUnlocked('greedy', row.level, { tierGate: gate })]
        .filter(id => B.TREES.greedy.order.some(([o]) => o === id)).join(',') || '-';
      rowOut([[`${row.id}@${row.level}`.padEnd(20), -20], [gate ? 'ON' : 'off', 7], [r.points, 6],
      [owns.slice(0, 34).padEnd(34), -34], [pct(r.winRate), 9], [n2(r.avgRounds), 9], [pct(r.avgHpLeft), 9]]);
    }
  }
  console.log('');
  const rows = [{ id: 'chad', level: 5 }, { id: 'chad', level: 6 }, { id: 'karen', level: 4 },
  { id: 'grandma', level: 7 }, { id: 'rachel_boss', level: 8 }];
  hdr([['encounter', -20], ['build', -14], ['gate', 7], ['pts', 6], ['win', 9], ['rounds', 9], ['HPleft', 9]]);
  for (const row of rows) {
    for (const treeId of ['shipped', 'litigation', 'compliance', 'audit']) {
      for (const gate of [false, true]) {
        const r = run(row, treeId, runs, { ...PKG, tierGate: gate, msj: false });
        rowOut([[`${row.id}@${row.level}`.padEnd(20), -20], [treeId.padEnd(14), -14],
        [gate ? 'ON' : 'off', 7], [r.points, 6],
        [pct(r.winRate), 9], [n2(r.avgRounds), 9], [pct(r.avgHpLeft), 9]]);
      }
    }
    console.log('');
  }
}

function modeCapstoneAB(runs) {
  console.log(`\n=== GRAFT 3 — RESERVATION OF RIGHTS vs SUBROGATION (${runs} runs/cell) ===`);
  console.log('D2 M2d, renamed. Reflect scales off the ENEMY\'s Assertiveness, so it should');
  console.log('be strongest on grandma (atk 27) and the algorithm (atk 30).');
  const rows = [{ id: 'grandma', level: 10 }, { id: 'rachel_boss', level: 10 },
  { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  { id: 'chad', level: 10 }, { id: 'karen', level: 10 }];
  hdr([['encounter', -22], ['tree shape', -16], ['eATK', 6], ['win', 9], ['rounds', 9], ['HPleft', 9], ['compOTH', 9], ['RoRproc', 9], ['RoRdmg', 8], ['SubDmg', 8]]);
  const LABEL = { subro: 'D1 as written', reserve: 'RoR as capstone', both: 'RoR@1 + Subro' };
  for (const row of rows) {
    for (const which of ['subro', 'reserve', 'both']) {
      setComplianceCapstone(which);
      const r = run(row, 'compliance', runs, { ...PKG, msj: false });
      const eatk = ENEMY_STATS[CS.enc(row.id).primary]?.atk ?? '-';
      rowOut([[`${row.id}@${row.level}`.padEnd(22), -22],
      [LABEL[which].padEnd(16), -16], [eatk, 6],
      [pct(r.winRate), 9], [n2(r.avgRounds), 9], [pct(r.avgHpLeft), 9],
      [n1(r.composureOther), 9],
      [n2(r.reserveProcs), 9], [n1(r.reserveDamage), 8], [n1(r.subrogationDamage), 8]]);
    }
    console.log('');
  }
  setComplianceCapstone('both');
}

function modePackage(runs) {
  console.log(`\n=== THE RECOMMENDED PACKAGE — full ladder, point-matched (${runs} runs/cell) ===`);
  console.log('Revival ON, Pivot ON, Tier gate ON, Reservation capstone, MSJ ON for Litigation.');
  console.log('Baseline column = SHIPPED kit with every graft OFF.');
  hdr([['encounter', -22], ['lvl', 5], ['build', -13], ['pts', 5], ['win', 9], ['rounds', 9], ['HPleft', 9], ['topTag', 9], ['breaks', 8], ['supers', 8]]);
  const band = [];
  for (const row of LADDER) {
    const base = run(row, 'shipped', runs, OFF);
    rowOut([[`${row.id}`.padEnd(22), -22], [row.level, 5], ['BASELINE'.padEnd(13), -13],
    [base.points, 5], [pct(base.winRate), 9], [n2(base.avgRounds), 9], [pct(base.avgHpLeft), 9],
    [pct(base.topTag), 9], [n2(base.breaks), 8], [n2(base.supers), 8]]);
    const wins = [];
    for (const treeId of ['shipped', 'litigation', 'compliance', 'audit']) {
      const r = run(row, treeId, runs, PKG);
      if (treeId !== 'shipped') wins.push(r.winRate);
      rowOut([[''.padEnd(22), -22], ['', 5], [treeId.padEnd(13), -13],
      [r.points, 5], [pct(r.winRate), 9], [n2(r.avgRounds), 9], [pct(r.avgHpLeft), 9],
      [pct(r.topTag), 9], [n2(r.breaks), 8], [n2(r.supers), 8]]);
    }
    band.push({ row: `${row.id}@${row.level}`, spread: Math.max(...wins) - Math.min(...wins) });
    console.log('');
  }
  console.log('-- diversity band (max win-rate spread across the three lanes) --');
  for (const b of band) console.log(`  ${b.row.padEnd(26)} ${dpp(b.spread)} pp`);
  console.log(`  WORST: ${dpp(Math.max(...band.map(b => b.spread)))} pp`);
}

function modeShape(runs) {
  console.log(`\n=== THE SHAPE TABLE — where each lane's Composure comes from (${runs} runs/cell) ===`);
  console.log('compW = Composure taken by weakness hits. compOTH = every other issuer.');
  console.log('This is the table the design lives or dies on.');
  const rows = [{ id: 'karen', level: 4 }, { id: 'chad', level: 6 }, { id: 'grandma', level: 8 },
  { id: 'rachel_boss', level: 9 }, { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] }];
  hdr([['encounter', -22], ['build', -13], ['supers', 8], ['compW', 8], ['compOTH', 9], ['breaks', 8],
  ['brace', 8], ['retal', 8], ['find', 7], ['closed', 8], ['resv', 7], ['esc', 7], ['msj', 6], ['topTag', 8]]);
  for (const row of rows) {
    for (const treeId of ['shipped', 'litigation', 'compliance', 'audit']) {
      const r = run(row, treeId, runs, PKG);
      rowOut([[`${row.id}@${row.level}`.padEnd(22), -22], [treeId.padEnd(13), -13],
      [n2(r.supers), 8], [n1(r.composureWeak), 8], [n1(r.composureOther), 9], [n2(r.breaks), 8],
      [n2(r.braces), 8], [n2(r.retaliates), 8], [n2(r.findingsFiled), 7], [n2(r.findingsCashed), 8],
      [n2(r.reserveProcs), 7], [n2(r.escalates), 7], [n2(r.msjProcs), 6], [pct(r.topTag), 8]]);
    }
    console.log('');
  }
}

function modeProfile(runs) {
  console.log(`\n=== GRAFT 6 — THE maxComposure PROFILE, AS A PACKAGE (${runs} runs/cell) ===`);
  console.log('chad 90->60, corporate_lawyer 120->60, chief_of_restructuring 120->180,');
  console.log('regional_director 120->180. karen/grandma/rachel/algorithm unchanged.');
  console.log('D3 swept these dials INDIVIDUALLY and never ran the table as one config.');
  const rows = [{ id: 'chad', level: 6 }, { id: 'grandma', level: 8 },
  { id: 'restructuring_trio', level: 8, party: ['janet'] },
  { id: 'rachel_boss', level: 9 },
  { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] }];
  hdr([['encounter', -22], ['profile', 10], ['build', -13], ['win', 9], ['rounds', 9], ['HPleft', 9], ['breaks', 8]]);
  for (const row of rows) {
    for (const treeId of ['litigation', 'compliance', 'audit']) {
      for (const on of [false, 'd3', true]) {
        const r = run(row, treeId, runs, { ...PKG, profile: on, msj: false });
        rowOut([[`${row.id}@${row.level}`.padEnd(22), -22],
        [on === 'd3' ? 'D3 full' : on ? 'DOWN only' : 'off', 10],
        [treeId.padEnd(13), -13], [pct(r.winRate), 9], [n2(r.avgRounds), 9],
        [pct(r.avgHpLeft), 9], [n2(r.breaks), 8]]);
      }
    }
    console.log('');
  }
}

function modeAD(runs) {
  console.log(`\n=== GRAFT 7 — ASSERT DOMINANCE: is the 100-Confidence tier dead? (${runs} runs/cell) ===`);
  console.log('D4 measured 0.00-0.17 uses/fight and flagged that its policy takes Press');
  console.log('Advantage greedily. Arm 2 forces a SAVE-FOR-AD player (PA unaffordable).');
  const rows = [{ id: 'chad', level: 6 }, { id: 'grandma', level: 8 }, { id: 'rachel_boss', level: 9 },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] }];
  hdr([['encounter', -22], ['build', -13], ['policy', -12], ['strip', 7], ['AD/fight', 10], ['ADcomp', 9], ['win', 9], ['rounds', 9], ['HPleft', 9]]);
  for (const row of rows) {
    for (const treeId of ['shipped', 'litigation', 'compliance']) {
      for (const [pol, save] of [['greedy-PA', false], ['save-for-AD', true]]) {
        for (const strip of (save ? [false, true] : [false])) {
          const r = run(row, treeId, runs, { ...PKG, msj: false, saveForAD: save, adStrip: strip });
          rowOut([[`${row.id}@${row.level}`.padEnd(22), -22], [treeId.padEnd(13), -13],
          [pol.padEnd(12), -12], [strip ? 'ON' : 'off', 7],
          [n2(r.adUses), 10], [n1(r.adComposure), 9],
          [pct(r.winRate), 9], [n2(r.avgRounds), 9], [pct(r.avgHpLeft), 9]]);
        }
      }
    }
    console.log('');
  }
  console.log('-- the trap D2 caught: does the strip land on the CASUAL floor? --');
  hdr([['encounter', -22], ['strip', 8], ['PIP 0%', 10], ['PIP 20%', 10], ['PIP 30%', 10], ['AD/fight', 10]]);
  for (const row of [{ id: 'karen', level: 3 }, { id: 'grandma', level: 7 }, { id: 'rachel_boss', level: 9 }]) {
    for (const strip of [false, true]) {
      const cells = [0, 0.20, 0.30].map(p => runCasual(row, runs, p, { ...PKG, adStrip: strip }));
      rowOut([[`${row.id}@${row.level}`.padEnd(22), -22], [strip ? 'ON' : 'off', 8],
      ...cells.map(c => [pct(c.winRate), 10]), [n2(cells[0].adUses), 10]]);
    }
  }
}

function modeOneMore(runs) {
  console.log(`\n=== THE ONE MORE FORK (${runs} runs/cell) ===`);
  console.log('Uc = H-run\'s universal DEFENSIVE turn-back (free, sustain-only).');
  console.log('MSJ = D1\'s Litigation capstone (once/fight, no second tagged ability).');
  console.log('eff.T = rounds - fizzles - broken turns. H-run\'s bar is >= ~90% of base.');
  const rows = [{ id: 'grandma', level: 10 }, { id: 'rachel_boss', level: 10 },
  { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  { id: 'restructuring_trio', level: 10, party: ['janet'] }];
  for (const treeId of ['shipped', 'litigation', 'compliance', 'audit']) {
    console.log(`\n-- ${treeId.toUpperCase()} --`);
    hdr([['encounter', -22], ['variant', -18], ['win', 9], ['rounds', 9], ['HPleft', 9], ['eff.T', 8], ['vs base', 9], ['procs', 8]]);
    for (const row of rows) {
      let baseEff = null;
      for (const [label, o] of [
        ['none', { uc: false, msj: false }],
        ['Uc universal', { uc: true, msj: false }],
        ['MSJ only (D1)', { uc: false, msj: true }],
        ['Uc + MSJ ADDED', { uc: true, msj: true }],
        ['Uc + MSJ UPGRADE', { uc: true, msj: true, ucUpgrade: true }],
      ]) {
        if (treeId !== 'litigation' && label.includes('MSJ')) continue;
        const r = run(row, treeId, runs, { ...PKG, ...o });
        if (baseEff === null) baseEff = r.effTurns;
        rowOut([[`${row.id}@${row.level}`.padEnd(22), -22], [label.padEnd(18), -18],
        [pct(r.winRate), 9], [n2(r.avgRounds), 9], [pct(r.avgHpLeft), 9],
        [n2(r.effTurns), 8], [pct(r.effTurns / baseEff), 9],
        [n2(r.ucProcs + r.msjProcs), 8]]);
      }
      console.log('');
    }
  }
}

function modeUpkeep(runs) {
  console.log(`\n=== GRAFT 10 — THE UPKEEP CHECK (D2's p_paper_trail lesson) (${runs} runs/cell) ===`);
  console.log('"A build whose identity is upkeep must be given an upkeep economy or it is');
  console.log('not a build." Does the Audit lane run dry on Coffee?');
  const rows = [{ id: 'grandma', level: 8 }, { id: 'rachel_boss', level: 9 },
  { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] }];
  hdr([['encounter', -22], ['build', -13], ['rounds', 9], ['actions', 9], ['basics', 9], ['MP<12 turns', 13], ['find', 8], ['closed', 8]]);
  for (const row of rows) {
    for (const treeId of ['shipped', 'litigation', 'compliance', 'audit']) {
      const r = run(row, treeId, runs, { ...PKG, msj: false, trackMp: true });
      rowOut([[`${row.id}@${row.level}`.padEnd(22), -22], [treeId.padEnd(13), -13],
      [n2(r.avgRounds), 9], [n2(r.actions), 9], [n2(r.acc.basics / runs), 9],
      [n2(r.acc.mpStarved / runs), 13], [n2(r.findingsFiled), 8], [n2(r.findingsCashed), 8]]);
    }
    console.log('');
  }
}

function modePip(runs) {
  console.log(`\n=== THE PIP / CASUAL FLOOR — the hard constraint (${runs} runs/cell) ===`);
  console.log('CASUAL never lands a tagged hit and never Braces, so every tree node and the');
  console.log('Pivot are unreachable BY CONSTRUCTION. What it CAN reach: the Revival, the');
  console.log('Composure profile, and Assert Dominance. Any movement is a bug.');
  const rows = [{ id: 'karen', level: 3 }, { id: 'karen', level: 4 },
  { id: 'grandma', level: 7 }, { id: 'grandma', level: 8 },
  { id: 'rachel_boss', level: 9 },
  { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] }];
  hdr([['encounter', -24], ['variant', -30], ['PIP 0%', 10], ['PIP 20%', 10], ['PIP 30%', 10]]);
  for (const row of rows) {
    for (const [label, o] of [
      ['shipped, all grafts off', { revival: false, pivot: false, profile: false }],
      ['package (revival+pivot)', { revival: true, pivot: true, profile: false }],
      ['package + profile', { revival: true, pivot: true, profile: true }],
    ]) {
      const cells = [0, 0.20, 0.30].map(p => runCasual(row, runs, p, o));
      rowOut([[`${row.id}@${row.level}`.padEnd(24), -24], [label.padEnd(30), -30],
      ...cells.map(c => [pct(c.winRate), 10])]);
    }
    console.log('');
  }
  console.log('-- and the COMPETENT tree arm, for completeness (no stat row moved) --');
  hdr([['encounter', -22], ['build', -13], ['win', 9], ['HPleft', 9]]);
  for (const row of [{ id: 'karen', level: 3 }, { id: 'grandma', level: 7 }]) {
    for (const treeId of ['shipped', 'audit']) {
      const r = run(row, treeId, runs, PKG);
      rowOut([[`${row.id}@${row.level}`.padEnd(22), -22], [treeId.padEnd(13), -13],
      [pct(r.winRate), 9], [pct(r.avgHpLeft), 9]]);
    }
  }
}

function modeNg(runs) {
  console.log(`\n=== NEW GAME+ — the whole package (${runs} runs/cell) ===`);
  console.log('Rule (tools/ng-sim.mjs): CARRY@NG+1 must not be EASIER than FRESH@NG.');
  const rows = [{ id: 'karen', level: 4 }, { id: 'grandma', level: 8 }, { id: 'rachel_boss', level: 9 },
  { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] }];
  hdr([['encounter', -20], ['build', -13], ['pkg', 6], ['FRESH@NG', 11], ['CARRY+1', 11], ['CARRY+2', 11], ['CARRY+3', 11]]);
  for (const row of rows) {
    for (const treeId of ['shipped', 'litigation', 'compliance', 'audit']) {
      for (const on of [false, true]) {
        const o = on ? PKG : OFF;
        const cells = [];
        for (const lap of [1, 1, 2, 3]) {
          const carry = cells.length > 0;
          setRevival(o.revival !== false); setProfile(o.profile || false);
          ACC = freshAcc();
          let nodes = carry
            ? synthUnlocked(treeId, 15, { tierGate: o.tierGate !== false })
            : synthUnlocked(treeId, row.level, { tierGate: o.tierGate !== false });
          if (o.msj === false) nodes = new Set([...nodes].filter(id => id !== 'motion_summary_judgment'));
          const r = B.batchBuild({ ...cfgFor(row), ngPlus: true, ngPlusCount: lap }, row.level, runs, treeId,
            { unlocked: nodes, rotate: o.pivot !== false, onEngine: makeHook(nodes, o) });
          cells.push(r);
        }
        rowOut([[`${row.id}@${row.level}`.padEnd(20), -20], [treeId.padEnd(13), -13],
        [on ? 'ON' : 'off', 6], ...cells.map(c => [pct(c.winRate), 11])]);
      }
    }
    console.log('');
  }
}

function modeDay(runs) {
  console.log(`\n=== RECEPTION / ROGUELITE — is the package inert? (${runs} runs/cell) ===`);
  console.log('reception_client has no phases[] (cannot pivot) and is not in the profile');
  console.log('table. Tree nodes DO fire here, so this measures them, not asserts them.');
  const TIERS = [
    { label: 'tier 0 walk-in', hp: 80, atk: 10, def: 8 },
    { label: 'tier 2 client', hp: 420, atk: 18, def: 14 },
    { label: 'tier 4 whale', hp: 900, atk: 26, def: 20 },
  ];
  hdr([['client', -18], ['lvl', 5], ['build', -22], ['win', 9], ['rounds', 9], ['HPleft', 9], ['find', 7], ['closed', 8]]);
  for (const t of TIERS) {
    for (const level of [4, 8]) {
      // The last two rows are the CONTROL that separates "the tree is bad in
      // Reception" from "the tree's POLICY is bad in Reception": same policy,
      // shipped kit, no tree nodes at all.
      for (const treeId of ['shipped', 'litigation', 'compliance', 'audit',
        'compliance#shippedkit', 'audit#shippedkit']) {
        const [tid, ctrl] = treeId.split('#');
        setRevival(true); setProfile(false); ACC = freshAcc();
        const nodes = ctrl ? synthUnlocked('shipped', level, {}) : synthUnlocked(tid, level, {});
        const cfg = { ...CS.enc('reception_client'), overrides: { reception_client: { maxHP: t.hp, hp: t.hp, atk: t.atk, def: t.def } } };
        const r = B.batchBuild(cfg, level, runs, tid, { unlocked: nodes, rotate: true, onEngine: makeHook(nodes, {}) });
        rowOut([[t.label.padEnd(18), -18], [level, 5], [treeId.padEnd(22), -22],
        [pct(r.winRate), 9], [n2(r.avgRounds), 9], [pct(r.avgHpLeft), 9],
        [n2(r.findingsFiled), 7], [n2(r.findingsCashed), 8]]);
      }
      console.log('');
    }
  }
}

function modePoints() {
  console.log('\n=== POINT BUDGET, WITH THE TIER GATE ON ===');
  console.log('Each tree costs 9 against a 14-point lifetime budget. 27 points of nodes.');
  for (const treeId of ['shipped', 'litigation', 'compliance', 'audit']) {
    const total = B.TREES[treeId].order.reduce((s, [, c]) => s + c, 0);
    console.log(`\n${B.TREES[treeId].label}  — total ${total} points`);
    console.log('  lvl  pts  spent  owned');
    for (const lvl of [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15]) {
      const nodes = synthUnlocked(treeId, lvl, {});
      const owned = B.TREES[treeId].order.filter(([id]) => nodes.has(id)).map(([id]) => id);
      console.log(`  ${String(lvl).padStart(3)}  ${String(lvl - 1).padStart(3)}  ${String(synthSpent(treeId, lvl, {})).padStart(5)}  ${owned.join(', ') || '-'}`);
    }
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────
const flags = new Set(); const opts = {};
for (let i = 0; i < REAL_ARGV.length; i++) {
  const a = REAL_ARGV[i];
  if (a.startsWith('--')) {
    const k = a.slice(2); const nx = REAL_ARGV[i + 1];
    if (nx && !nx.startsWith('--')) { opts[k] = nx; i++; } else flags.add(k);
  }
}
const RUNS = Number(opts.runs) || 300;
if (flags.has('points')) modePoints();
else if (flags.has('revival')) modeRevival(RUNS);
else if (flags.has('revsweep')) modeRevSweep(RUNS);
else if (flags.has('pivot')) modePivot(RUNS);
else if (flags.has('pivottune')) modePivotTune(RUNS);
else if (flags.has('gate')) modeGate(RUNS);
else if (flags.has('capstoneab')) modeCapstoneAB(RUNS);
else if (flags.has('package')) modePackage(RUNS);
else if (flags.has('shape')) modeShape(RUNS);
else if (flags.has('profile')) modeProfile(RUNS);
else if (flags.has('ad')) modeAD(RUNS);
else if (flags.has('onemore')) modeOneMore(RUNS);
else if (flags.has('upkeep')) modeUpkeep(RUNS);
else if (flags.has('pip')) modePip(RUNS);
else if (flags.has('ng')) modeNg(RUNS);
else if (flags.has('day')) modeDay(RUNS);
else console.log('Pick a mode: --points --revival --pivot --gate --capstoneab --package --shape --profile --ad --onemore --upkeep --pip --ng --day');
