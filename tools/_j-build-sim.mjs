// _j-build-sim.mjs — THROWAWAY harness for the J-run build-archetype lane.
//
// Question: combat "tends towards simplicity (spam the enemy weakness)". Can
// ABILITY TREES / BUILD IDENTITIES open multiple viable playstyle lanes without
// nerfing the weakness hit (which would tax the PIP/casual floor — the Run C
// failure mode) and without engine surgery beyond a priced list?
//
// This harness wraps tools/combat-sim.mjs — the REAL CombatEngine, the REAL
// ENEMY_STATS / PLAYER_ABILITIES / balance.json, and the same COMPETENT /
// CASUAL policies Run C and the H-run were tuned against. Nothing in src/ is
// modified. Proposed NEW ABILITIES are injected as DATA (Object.assign onto
// PLAYER_ABILITIES) so they run through the shipping code path; proposed NEW
// ENGINE BEHAVIOUR is applied as a per-fight monkeypatch, and every patch here
// is one line item in the scope ledger of D1-trees.md §8.
//
//   node tools/_j-build-sim.mjs --baseline            # Run C control, reproduced
//   node tools/_j-build-sim.mjs --builds              # the three trees, point-matched
//   node tools/_j-build-sim.mjs --shape               # WHERE each build's currencies come from
//   node tools/_j-build-sim.mjs --capstone            # MSJ (offensive One More) pricing sweep
//   node tools/_j-build-sim.mjs --findings            # Audit keystone tuning sweep
//   node tools/_j-build-sim.mjs --rotate              # enemy-side "The File Moves" A/B
//   node tools/_j-build-sim.mjs --pip                 # casual floor must not move
//   node tools/_j-build-sim.mjs --ng                  # NG+ laps
//   node tools/_j-build-sim.mjs --points              # point-budget audit of the shipped tree
//   node tools/_j-build-sim.mjs --runs 400

import {
  runFight, enc, competentTurn, casualTurn, buildPartyOverrides,
  rollBraceQuality, NO_RELIC, unlockedAbilities,
} from './combat-sim.mjs';
import { COMBAT_DEPTH, NG_PLUS_ENTRY, NG_PLUS_SCALING } from '../src/combat/CombatEngine.js';
import { PLAYER_ABILITIES, ENEMY_ABILITIES, ENEMY_STATS } from '../src/data/stats.js';

const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);

// ════════════════════════════════════════════════════════════════════════
// 1. PROPOSED DATA — new abilities and passive nodes.
//    Passives are ordinary PLAYER_ABILITIES entries with `type: 'passive'`,
//    which means they cost ZERO new persistence: Player.unlockedAbilities
//    already stores ids, MenuState already renders them, and Restructure
//    already refunds them. The engine never executes them; it reads them.
// ════════════════════════════════════════════════════════════════════════
export const J_ABILITIES = {
  // ── LITIGATION ────────────────────────────────────────────────────────
  aggravating_factors: {
    name: 'Aggravating Factors', type: 'passive', tree: 'litigation', depth: 1,
    upgradePointCost: 1, cost: 0,
    description: 'Weakness hits bank +10 Confidence. Press Advantage costs 10 less.',
  },
  escalate: {
    name: 'Escalate', type: 'attack', tree: 'litigation', depth: 2,
    upgradePointCost: 1, cost: 0, power: 30, momentumCost: 30, tagChoice: true,
    requires: 'aggravating_factors',
    description: 'Take it upstairs. Choose the practice area on the way.',
  },
  motion_summary_judgment: {
    name: 'Motion for Summary Judgment', type: 'passive', tree: 'litigation', depth: 5,
    upgradePointCost: 3, cost: 0, capstone: true, requires: 'per_my_last_email',
    description: 'Land a weakness hit and the floor is still yours. Once per engagement. The returned turn may not file a second practice-area action - one motion at a time, counsel.',
  },
  // ── RISK & COMPLIANCE ─────────────────────────────────────────────────
  contemporaneous_notes: {
    name: 'Contemporaneous Notes', type: 'passive', tree: 'compliance', depth: 1,
    upgradePointCost: 1, cost: 0,
    description: 'Bracing takes Composure: perfect 35% of the bar, good 15%. A brace also files an objection against the move it answers.',
  },
  adverse_inference: {
    name: 'Adverse Inference', type: 'passive', tree: 'compliance', depth: 2,
    upgradePointCost: 1, cost: 0, requires: 'contemporaneous_notes',
    description: 'Retaliate carries the practice area of the move it answers. Base power 22 → 26.',
  },
  standard_of_care: {
    name: 'Standard of Care', type: 'passive', tree: 'compliance', depth: 4,
    upgradePointCost: 2, cost: 0, requires: 'adverse_inference',
    description: 'Bracing removes a further 25% of the incoming hit. A perfect brace refunds 15 Confidence.',
  },
  subrogation: {
    name: 'Subrogation', type: 'passive', tree: 'compliance', depth: 5,
    upgradePointCost: 2, cost: 0, capstone: true, requires: 'standard_of_care',
    description: 'Damage taken while bracing is banked. Your next strike adds the bank and costs the opposition 30 Composure, whatever you hit them with.',
  },
  // ── AUDIT & ADVISORY ──────────────────────────────────────────────────
  findings: {
    name: 'Findings', type: 'passive', tree: 'audit', depth: 1,
    upgradePointCost: 1, cost: 0,
    description: 'Every off-weakness tagged hit and every objection you sustain files a Finding (max 5). Each is +8% damage; at 3 the file is Exposed. At 5, your next tagged hit CLOSES THE FILE: 1.5x damage and 30 Composure, whatever practice area you used.',
  },
  scope_expansion: {
    name: 'Scope Expansion', type: 'passive', tree: 'audit', depth: 3,
    upgradePointCost: 1, cost: 0, requires: 'findings',
    description: 'Debuffs file a Finding too, and last one turn longer.',
  },
  tie_out: {
    name: 'Tie-Out', type: 'attack', tag: 'audit', tree: 'audit', depth: 2,
    upgradePointCost: 1, cost: 12, power: 28, requires: 'findings',
    description: 'Two numbers that should match do not match. You say so out loud.',
  },
  adverse_opinion: {
    name: 'Adverse Opinion', type: 'passive', tree: 'audit', depth: 5,
    upgradePointCost: 1, cost: 0, requires: 'management_letter',
    description: 'Closing a file also costs them 6 Composure-as-a-stat for three turns. You are not accusing anyone of anything. You are declining to opine.',
  },
  management_letter: {
    name: 'Management Letter', type: 'attack_aoe', tag: 'audit', tree: 'audit', depth: 4,
    upgradePointCost: 2, cost: 40, power: 40, requires: 'scope_expansion', filesFindings: 2,
    description: 'The findings, restated for the board, in a font they will read. Hits the whole room and files two Findings on each of them.',
  },
  // ── RISK & COMPLIANCE, cont. ──────────────────────────────────────────
  notice_of_deficiency: {
    name: 'Notice of Deficiency', type: 'attack', tag: 'audit', tree: 'compliance', depth: 3,
    upgradePointCost: 2, cost: 25, power: 40, requires: 'adverse_inference', counterpunch: 0.6,
    description: 'Deals 60% more if you braced on your last turn. Cited, dated, and copied to two people who did not ask.',
  },
  material_weakness: {
    name: 'Material Weakness', type: 'passive', tree: 'audit', depth: 5,
    upgradePointCost: 2, cost: 0, capstone: true, requires: 'scope_expansion',
    description: 'A closed file IS a weakness. Closing one now counts as a weakness hit for every purpose - damage, Composure, Confidence, and handing the baton - whatever practice area you used. And a file now closes at four Findings, not five. It always was a weakness. You are the first person here to write it down.',
  },
};
Object.assign(PLAYER_ABILITIES, J_ABILITIES);

// ════════════════════════════════════════════════════════════════════════
// 2. THE TREES — spend order, point-matched to the shipped 1-point-per-level
//    curve. Level L has (L-1) points. Story finish ≈ L4 → 3 points.
// ════════════════════════════════════════════════════════════════════════
export const TREES = {
  // The shipped "tree", for the control. 13 points of nodes against 14
  // available — i.e. no build decision exists today, only an ordering one.
  shipped: {
    label: 'SHIPPED (control)',
    order: [
      ['cite_precedent', 1], ['due_diligence', 1], ['cc_all', 1],
      ['forensic_audit', 2], ['per_my_last_email', 2], ['whistleblower', 2],
      ['fiduciary_shield', 1], ['billable_hours', 1], ['power_of_attorney', 2],
    ],
  },
  litigation: {
    label: 'LITIGATION & ENFORCEMENT',
    order: [
      ['aggravating_factors', 1], ['cite_precedent', 1], ['escalate', 1],
      ['cc_all', 1], ['per_my_last_email', 2], ['motion_summary_judgment', 3],
    ],
  },
  compliance: {
    label: 'RISK & COMPLIANCE',
    order: [
      ['contemporaneous_notes', 1], ['adverse_inference', 1], ['notice_of_deficiency', 2],
      ['fiduciary_shield', 1], ['standard_of_care', 2], ['subrogation', 2],
    ],
  },
  audit: {
    label: 'AUDIT & ADVISORY',
    order: [
      ['findings', 1], ['tie_out', 1], ['due_diligence', 1], ['scope_expansion', 1],
      ['management_letter', 2], ['adverse_opinion', 1], ['material_weakness', 2],
    ],
  },
};

const STARTERS = ['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check'];

/** Points available at a given level (1 per level-up), plus quest abilities. */
export function buildUnlocked(treeId, level, opts = {}) {
  const s = new Set(STARTERS);
  let points = Math.max(0, level - 1) + (opts.extraPoints || 0);
  for (const [id, cost] of TREES[treeId].order) {
    if (cost === 0) continue;
    if (points < cost) break;
    points -= cost;
    s.add(id);
  }
  // Side-quest abilities are earned, not bought — same rule the shipped
  // harness uses (combat-sim.unlockedAbilities: notarized_strike + root_access
  // by L9). They are tree-agnostic on purpose: every build gets a legal and a
  // technical option from the story, which is what keeps the tag layer alive
  // in every lane.
  if (level >= 9 && !opts.noQuest) { s.add('notarized_strike'); s.add('root_access'); }
  return s;
}

/** Points actually spent at that level, for the point-matched audit. */
export function pointsSpent(treeId, level, opts = {}) {
  let points = Math.max(0, level - 1) + (opts.extraPoints || 0);
  let spent = 0;
  for (const [, cost] of TREES[treeId].order) {
    if (cost === 0) continue;
    if (points < cost) break;
    points -= cost; spent += cost;
  }
  return spent;
}

// ════════════════════════════════════════════════════════════════════════
// 3. ENGINE PATCHES — one function per proposed engine change. Each is a
//    line item in the scope ledger. Applied per-fight to the live engine.
// ════════════════════════════════════════════════════════════════════════
export const TUNE = {
  FIND_PER_STACK: 0.08,
  FIND_MAX: 5,
  FIND_MAX_CAPSTONE: 4,   // Material Weakness lowers the close threshold
  FIND_EXPOSED_AT: 99,   // `exposed` deliberately unused — see D1-trees.md §5.3
  FIND_CASH_COMPOSURE: 30,
  FIND_CASH_DAMAGE: 1.5,
  BRACE_PERFECT_STRIP: 0.35,
  BRACE_GOOD_STRIP: 0.15,
  RETALIATE_POWER: 26,
  STANDARD_OF_CARE_DR: 0.25,
  STANDARD_OF_CARE_MOMENTUM: 15,
  AGGRAVATING_MOMENTUM: 10,
  AGGRAVATING_PA_DISCOUNT: 10,
  SUBROGATION_CAP_MULT: 2.0,      // bank capped at 2x Andrew's ATK
  ESCALATE_MOMENTUM: 30,
  MSJ_MODE: 'oncePerFight',       // RECOMMENDED shape — see D1-trees.md §6.1
  MSJ_MOMENTUM: 0,
  MSJ_RESTRICT: true,     // returned turn may not spend a second tagged ability
};

function applyBuildPatches(engine, nodes, st, tune = TUNE) {
  const has = (id) => nodes.has(id);

  // ── AUDIT: FINDINGS ────────────────────────────────────────────────────
  // Hook: src/combat/CombatEngine.js `_calcDamage` (one read before the band,
  // one write after tag resolution). Reuses the SHIPPED-but-unwritten
  // `target.exposed` flag (read at :665, ticked at :1741, set by nothing).
  if (has('findings')) {
    const real = engine._calcDamage.bind(engine);
    engine._calcDamage = (atk, power, def, target, tag) => {
      const isEnemy = target && engine.enemies.includes(target);
      const isAndrewHit = isEnemy && !engine._jEnemyActing;
      const stacks = (isAndrewHit && target._findings) || 0;
      if (isAndrewHit && stacks >= tune.FIND_EXPOSED_AT) target.exposed = Math.max(target.exposed || 0, 2);
      const preLocks = isAndrewHit ? (target.locks || []).filter(l => l.cleared).length : 0;
      const r = real(atk, power, def, target, tag);
      if (!isAndrewHit) return r;
      if (stacks > 0) r.damage = Math.max(1, Math.floor(r.damage * (1 + tune.FIND_PER_STACK * stacks)));
      const maxF = has('material_weakness') ? tune.FIND_MAX_CAPSTONE : tune.FIND_MAX;
      if (tag) {
        if (stacks >= maxF) {
          // CLOSE THE FILE (Qualified Opinion): 1.5x plus full Composure
          // damage, whatever practice area the closing hit used.
          target._findings = 0;
          r.damage = Math.max(1, Math.floor(r.damage * tune.FIND_CASH_DAMAGE));
          engine._jCompSrc = 'findings';
          const res = engine._reduceComposure(target, tune.FIND_CASH_COMPOSURE);
          engine._jCompSrc = null;
          if (res.broke) r.broke = true;
          r.composureHit = (r.composureHit || 0) + res.amount;
          st.findingsCashed++;
          if (has('adverse_opinion')) {
            target.buffs.push({ stats: { def: -6 }, duration: 3, name: 'Adverse Opinion' });
          }
          // MATERIAL WEAKNESS: the close IS a weakness hit. Publishing
          // effective='super' is what makes the caller pay the +10 Confidence
          // and arm Loop In — no second code path, the shipped one is reused.
          if (has('material_weakness') && r.effective !== 'super') {
            r.effective = 'super';
            st.materialWeakness++;
          }
        } else {
          // A Finding is filed by an off-weakness tagged hit OR by sustaining
          // an objection — the two things the Objections system already makes
          // you do and never paid you for.
          // One Finding per action, however many ways it qualified. Plus any
          // the ability itself files (Management Letter, 2).
          const clearedNow = (target.locks || []).filter(l => l.cleared).length - preLocks;
          let filed = (r.effective !== 'super' || clearedNow > 0) ? 1 : 0;
          filed += PLAYER_ABILITIES[engine._jAbilityId || '']?.filesFindings || 0;
          if (filed > 0) {
            target._findings = Math.min(maxF, stacks + filed);
            st.findingsFiled += filed;
          }
        }
      }
      return r;
    };
    // Which ability is mid-flight, so `filesFindings` can be read in _calcDamage.
    const realAb0 = engine.playerAbility.bind(engine);
    engine.playerAbility = (id, ti) => {
      engine._jAbilityId = id;
      try { return realAb0(id, ti); } finally { engine._jAbilityId = null; }
    };
  }
  // Scope Expansion: debuffs file a Finding and last one turn longer.
  if (has('scope_expansion')) {
    const realAb = engine.playerAbility.bind(engine);
    engine.playerAbility = (id, ti) => {
      const a = PLAYER_ABILITIES[id];
      const bump = a && (a.type === 'debuff') && a.debuffDuration;
      if (bump) a.debuffDuration += 1;
      const r = realAb(id, ti);
      if (bump) a.debuffDuration -= 1;
      if (r && a && a.type === 'debuff' && a.tag) {
        const t = engine.enemies[r.targetIndex ?? engine.targetEnemyIndex];
        if (t && t.hp > 0) {
          if ((t._findings || 0) >= tune.FIND_MAX) {
            engine._jCompSrc = 'findings';
            const res = engine._reduceComposure(t, tune.FIND_CASH_COMPOSURE);
            engine._jCompSrc = null;
            if (res.broke) st.breaks++;
            t._findings = 0; st.findingsCashed++;
          } else { t._findings = Math.min(tune.FIND_MAX, (t._findings || 0) + 1); st.findingsFiled++; }
        }
      }
      return r;
    };
  }
  // ── COMPLIANCE: CONTEMPORANEOUS NOTES + STANDARD OF CARE ───────────────
  // Hook: `playerBrace` (:1800).
  if (has('contemporaneous_notes') || has('standard_of_care')) {
    const realBrace = engine.playerBrace.bind(engine);
    engine.playerBrace = (quality = 'good') => {
      // Neutralise the shipped perfect-strip so the node replaces it rather
      // than stacking with it, then apply the node's own strip.
      const savedStrip = COMBAT_DEPTH.BRACE_COMPOSURE_STRIP;
      if (has('contemporaneous_notes')) COMBAT_DEPTH.BRACE_COMPOSURE_STRIP = 0.0001;
      let r;
      try { r = realBrace(quality); } finally { COMBAT_DEPTH.BRACE_COMPOSURE_STRIP = savedStrip; }
      if (has('contemporaneous_notes')) {
        const target = engine.enemy;
        const frac = quality === 'perfect' ? tune.BRACE_PERFECT_STRIP
          : quality === 'good' ? tune.BRACE_GOOD_STRIP : 0;
        if (frac > 0 && target && target.hp > 0 && target.maxComposure > 0 && target.broken <= 0) {
          engine._jCompSrc = 'brace';
          const res = engine._reduceComposure(target, Math.max(1, Math.round(target.maxComposure * frac)));
          engine._jCompSrc = null;
          if (res.broke) r.brokeComposure = true;
          r.composureStripped = res.amount;
        }
        // A brace files an objection against the move it answers.
        for (const e of engine.enemies) {
          if (e.hp <= 0 || e.sealed) continue;
          const open = (e.locks || []).filter(l => !l.cleared);
          if (open.length > 0) { open[0].cleared = true; st.braceLockClears++; }
        }
      }
      if (has('standard_of_care') && quality === 'perfect') {
        engine._gainMomentum(tune.STANDARD_OF_CARE_MOMENTUM);
      }
      st.braces++;
      if (quality === 'perfect') st.perfectBraces++;
      return r;
    };
  }
  // Standard of Care: a further 25% off the braced hit.
  // Hook: `_executeEnemyAbility` attack/aoe branches (:1394, :1477) — the two
  // places `this.player.bracing` is already read.
  if (has('standard_of_care')) {
    const realExec = engine._executeEnemyAbility.bind(engine);
    engine._executeEnemyAbility = (...args) => {
      const wasBracing = engine.player.bracing;
      const before = engine.player.hp;
      const r = realExec(...args);
      if (wasBracing && r && r.braced && engine.player.hp < before) {
        const dealt = before - engine.player.hp;
        const refund = Math.floor(dealt * tune.STANDARD_OF_CARE_DR);
        engine.player.hp = Math.min(engine.player.maxHP, engine.player.hp + refund);
        if (r.damage) r.damage = Math.max(1, r.damage - refund);
      }
      return r;
    };
  }
  // Subrogation: bank what you eat while bracing; spend it on the next strike.
  if (has('subrogation')) {
    const realExec = engine._executeEnemyAbility.bind(engine);
    engine._executeEnemyAbility = (...args) => {
      const wasBracing = engine.player.bracing;
      const before = engine.player.hp;
      const r = realExec(...args);
      if (wasBracing && engine.player.hp < before) {
        engine.player._subrogation = (engine.player._subrogation || 0) + (before - engine.player.hp);
      }
      return r;
    };
    const realCalc = engine._calcDamage.bind(engine);
    engine._calcDamage = (atk, power, def, target, tag) => {
      const isEnemy = target && engine.enemies.includes(target);
      const isAndrewHit = isEnemy && !engine._jEnemyActing;
      const r = realCalc(atk, power, def, target, tag);
      const bank = engine.player._subrogation || 0;
      if (isAndrewHit && bank > 0 && r.damage > 0) {
        const cap = Math.floor(engine._getEffective(engine.player).atk * tune.SUBROGATION_CAP_MULT);
        const spend = Math.min(bank, cap);
        r.damage += spend;
        engine.player._subrogation = 0;
        engine._jCompSrc = 'subrogation';
        const res = engine._reduceComposure(target, tune.FIND_CASH_COMPOSURE);
        engine._jCompSrc = null;
        if (res.broke) r.broke = true;
        st.subrogationCashed++;
        st.subrogationDamage += spend;
      }
      return r;
    };
  }
  // Notice of Deficiency: +60% if Andrew braced on his previous turn.
  // Hook: `playerAbility` reads `ability.counterpunch` against a flag the
  // engine already owns the moment for (`player.bracing` set in playerBrace).
  if (has('notice_of_deficiency')) {
    const real = engine.playerAbility.bind(engine);
    engine.playerAbility = (id, ti) => {
      const a = PLAYER_ABILITIES[id];
      const armed = a && a.counterpunch && engine.player._jBracedLastTurn;
      const target = engine.enemies[ti ?? engine.targetEnemyIndex];
      const before = target ? target.hp : 0;
      const r = real(id, ti);
      if (armed && r && target && target.hp < before) {
        const extra = Math.floor((before - target.hp) * a.counterpunch);
        target.hp = Math.max(0, target.hp - extra);
        if (r.damage) r.damage += extra;
        st.counterpunches++;
        engine._checkVictory();
      }
      return r;
    };
  }

  // Adverse Inference: Retaliate carries the tag of the move it answers.
  // Hook: `playerRetaliate` (:1931) — pass a fifth argument to _calcDamage.
  if (has('adverse_inference')) {
    const real = engine.playerRetaliate.bind(engine);
    engine.playerRetaliate = (mult = 1.0, ti) => {
      const t = engine.enemies[ti ?? engine.targetEnemyIndex];
      const answered = t && t._jLastMoveTag;
      const savedCalc = engine._calcDamage;
      engine._calcDamage = (atk, power, def, target, tag) =>
        savedCalc.call(engine, atk, tune.RETALIATE_POWER, def, target, tag || answered || null);
      let r;
      try { r = real(mult, ti); } finally { engine._calcDamage = savedCalc; }
      if (r) st.retaliates++;
      return r;
    };
  }

  // ── LITIGATION: AGGRAVATING FACTORS ────────────────────────────────────
  // Hook: the two `_gainMomentum` call sites that already branch on
  // `effective === 'super'` (:824, :870, :908), and `getPressAdvantageCost`.
  if (has('aggravating_factors')) {
    const realPA = engine.getPressAdvantageCost.bind(engine);
    engine.getPressAdvantageCost = () => Math.max(15, realPA() - tune.AGGRAVATING_PA_DISCOUNT);
  }

  // Track which tag the enemy's pending move carries (for Adverse Inference).
  const realTele = engine.telegraph.bind(engine);
  engine.telegraph = () => {
    const r = realTele();
    for (const e of engine.enemies) {
      if (!e.telegraphedAbility) continue;
      const a = ENEMY_ABILITIES[e.telegraphedAbility];
      // Enemy abilities are 11/93 tagged; fall back to the first Objection tag
      // on the move, which _buildLocks derives hash-stably from the ability id.
      e._jLastMoveTag = (a && a.tag) || ((e.locks || [])[0] || {}).tag || null;
    }
    return r;
  };
}

// ── The enemy-side lever: THE FILE MOVES ────────────────────────────────
// Boss phases may carry their own `weakness` / `resistance`. Applied on phase
// entry. Hook: `_pickEnemyAbility` (:1491-1503) already resolves the active
// phase; two lines there write the fields.
export const PHASE_WEAKNESS = {
  karen:   [{ hpThreshold: 0.5, weakness: 'audit', resistance: 'social' },
            { hpThreshold: 0.25, weakness: 'social', resistance: 'legal' }],
  chad:    [{ hpThreshold: 0.5, weakness: 'technical', resistance: 'legal' },
            { hpThreshold: 0.25, weakness: 'legal', resistance: 'social' }],
  grandma: [{ hpThreshold: 0.5, weakness: 'legal', resistance: 'social' },
            { hpThreshold: 0.25, weakness: 'social', resistance: 'audit' }],
  rachel_boss: [{ hpThreshold: 0.5, weakness: 'technical', resistance: 'legal' },
                { hpThreshold: 0.25, weakness: 'audit', resistance: 'technical' }],
  algorithm: [{ hpThreshold: 0.5, weakness: 'legal', resistance: 'technical' },
              { hpThreshold: 0.25, weakness: 'social', resistance: 'legal' }],
  regional_director: [{ hpThreshold: 0.5, weakness: 'social', resistance: 'audit' }],
};

function applyRotation(engine, st) {
  const realPick = engine._pickEnemyAbility.bind(engine);
  const check = () => {
    for (const e of engine.enemies) {
      if (e.hp <= 0) continue;
      const rows = PHASE_WEAKNESS[e.enemyId];
      if (!rows) continue;
      const hpPct = e.hp / e.maxHP;
      let active = null;
      for (const row of rows) {
        if (hpPct <= row.hpThreshold && (!active || row.hpThreshold <= active.hpThreshold)) active = row;
      }
      if (active && e._jPhaseW !== active.hpThreshold) {
        e._jPhaseW = active.hpThreshold;
        e.weakness = active.weakness;
        e.resistance = active.resistance ?? e.resistance;
        st.rotations++;
      }
    }
  };
  engine._pickEnemyAbility = (e) => { check(); return realPick(e); };
  const realTele = engine.telegraph.bind(engine);
  engine.telegraph = () => { check(); return realTele(); };
}

// ── Instrumentation ─────────────────────────────────────────────────────
function instrument(engine) {
  const st = {
    andrewActions: 0, supers: 0, breaks: 0, locksSeen: 0, locksCleared: 0,
    fizzles: 0, brokenTurns: 0, momentumGained: 0, powerMoves: 0, loopIns: 0,
    mpSpent: 0, braces: 0, perfectBraces: 0, retaliates: 0, braceLockClears: 0,
    findingsFiled: 0, findingsCashed: 0, materialWeakness: 0,
    subrogationCashed: 0, subrogationDamage: 0, msjProcs: 0, escalates: 0,
    counterpunches: 0, rotations: 0, composureFromWeakness: 0, composureFromOther: 0,
  };
  const wrap = (name) => {
    const real = engine[name].bind(engine);
    engine[name] = (...args) => {
      const before = engine.player.mp;
      const r = real(...args);
      if (r) {
        st.andrewActions++;
        st.mpSpent += Math.max(0, before - engine.player.mp);
        if (r.effective === 'super' || (r.hits || []).some(h => h.effective === 'super')) st.supers++;
      }
      return r;
    };
  };
  for (const m of ['playerAttack', 'playerAbility', 'playerDesperateGamble']) wrap(m);
  const realPM = engine.playerPowerMove.bind(engine);
  engine.playerPowerMove = (...a) => { const r = realPM(...a); if (r) { st.powerMoves++; st.andrewActions++; } return r; };
  const realSW = engine.playerSecondWind.bind(engine);
  engine.playerSecondWind = (...a) => { const r = realSW(...a); if (r) st.andrewActions++; return r; };
  const realLI = engine.playerLoopIn.bind(engine);
  engine.playerLoopIn = (...a) => { const r = realLI(...a); if (r) st.loopIns++; return r; };
  const realGM = engine._gainMomentum.bind(engine);
  engine._gainMomentum = (amt) => { const b = engine.player.momentum; realGM(amt); st.momentumGained += engine.player.momentum - b; };
  const realRC = engine._reduceComposure.bind(engine);
  engine._reduceComposure = (t, amt) => {
    const r = realRC(t, amt);
    if (r.amount > 0) {
      // Default source is the shipped one: a weakness-tag hit inside
      // _calcDamage. Every alternative issuer stamps engine._jCompSrc.
      if (engine._jCompSrc) st.composureFromOther += r.amount;
      else st.composureFromWeakness += r.amount;
    }
    if (r.broke) st.breaks++;
    return r;
  };
  const realET = engine.enemyTurn.bind(engine);
  engine.enemyTurn = (i) => {
    const e = engine.enemies[i];
    const locks = (e && Array.isArray(e.locks)) ? e.locks : [];
    st.locksSeen += locks.length;
    st.locksCleared += locks.filter(l => l.cleared).length;
    engine._jEnemyActing = true;
    let r;
    try { r = realET(i); } finally { engine._jEnemyActing = false; }
    if (r && r.type === 'fizzle') st.fizzles++;
    if (r && r.type === 'broken') st.brokenTurns++;
    return r;
  };
  return st;
}

// ════════════════════════════════════════════════════════════════════════
// 4. POLICIES — one per build. Each is a competent player of THAT build.
// ════════════════════════════════════════════════════════════════════════
function pickTargetIndex(engine) {
  let best = -1, bestHp = Infinity, bestAtk = -1;
  engine.enemies.forEach((e, i) => {
    if (e.hp <= 0) return;
    if (e.hp < bestHp || (e.hp === bestHp && e.atk > bestAtk)) { best = i; bestHp = e.hp; bestAtk = e.atk; }
  });
  return best;
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
function estimateBiggestIncomingDamage(engine) {
  let worst = 0;
  const pDef = engine._getEffective(engine.player).def;
  for (const e of engine.enemies) {
    if (e.hp <= 0 || !e.telegraphedAbility) continue;
    const a = ENEMY_ABILITIES[e.telegraphedAbility];
    if (!a || (a.type !== 'attack' && a.type !== 'summon')) continue;
    const eAtk = engine._getEffective(e).atk;
    const est = Math.max(1, Math.floor((eAtk + (a.power ?? 0)) * 1.5 - pDef * 0.5));
    if (est > worst) worst = est;
  }
  return worst;
}
function attackAbilities(unlocked, mp) {
  const out = [];
  for (const id of unlocked) {
    const a = PLAYER_ABILITIES[id];
    if (!a || (a.type !== 'attack' && a.type !== 'attack_aoe')) continue;
    if (a.momentumCost) continue;              // escalate is handled separately
    if (mp < a.cost) continue;
    out.push(id);
  }
  return out;
}
function bestTaggedAbility(engine, unlocked, tag) {
  let best = null;
  for (const id of attackAbilities(unlocked, engine.player.mp)) {
    const a = PLAYER_ABILITIES[id];
    if (a.tag !== tag) continue;
    if (!best) { best = id; continue; }
    const b = PLAYER_ABILITIES[best];
    if (a.power > b.power || (a.power === b.power && a.cost < b.cost)) best = id;
  }
  return best;
}
function openLockTag(engine, target, unlocked) {
  if (!target || target.sealed) return null;
  const locks = (target.locks || []).filter(l => !l.cleared);
  if (locks.length === 0) return null;
  const sorted = [...locks].sort((a, b) =>
    (b.tag === target.weakness ? 1 : 0) - (a.tag === target.weakness ? 1 : 0));
  for (const l of sorted) if (bestTaggedAbility(engine, unlocked, l.tag)) return l.tag;
  return null;
}
function rollRetaliateMultiplier() {
  let correct = 0;
  for (let i = 0; i < 4; i++) if (Math.random() < 0.9) correct++;
  return 1.0 * (correct / 4);
}
/** Marks the next _reduceComposure as weakness-sourced, for the shape table. */
function taggedHit(engine, fn) { return fn(); }

// ── LITIGATION ──────────────────────────────────────────────────────────
// Weakness + momentum + burst. Escalate is a momentum-priced tag-agnostic
// weakness hit, which is the lane's answer to a rotating weakness AND its
// competitor for Assert Dominance's bar.
function litigationTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const hpRatio = p.hp / p.maxHP;
  const wasBrace = sim.justBraced; sim.justBraced = false;
  const target = engine.enemies[ti];

  const paCost = engine.getPressAdvantageCost();
  const paReserve = unlocked.has('escalate') ? TUNE.ESCALATE_MOMENTUM : 0;
  if (p.momentum >= paCost + paReserve && hpRatio >= 0.55 && !p.pressAdvantageUsedThisTurn) {
    engine.playerPressAdvantage(ti);
    if (engine.isOver) return;
  }

  if (hpRatio < 0.40 && p.momentum >= 50) { engine.playerSecondWind(); return; }
  const estHit = estimateBiggestIncomingDamage(engine);
  if ((hpRatio < 0.35 || p.hp < estHit * 1.1 + 10) && !p.silencedThisTurn) {
    if (unlocked.has('power_of_attorney') && p.mp >= PLAYER_ABILITIES.power_of_attorney.cost && p.maxHP - p.hp > 90) {
      engine.playerAbility('power_of_attorney'); return;
    }
    engine.playerAbility('coffee_break'); return;
  }
  if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }
  if (engine.counterActive) { engine.playerAttack(ti); return; }

  const lockTag = p.silencedThisTurn ? null : openLockTag(engine, target, unlocked);
  if (lockTag) { taggedHit(engine, () => engine.playerAbility(bestTaggedAbility(engine, unlocked, lockTag), ti)); return; }

  const biggest = biggestIncomingPower(engine);
  if (!p.bracing && !wasBrace && biggest !== null && (biggest >= 35 || (biggest >= 25 && hpRatio < 0.45))) {
    engine.playerBrace(rollBraceQuality(sim.relic.braceWindow, sim.relic.aim));
    sim.justBraced = true; return;
  }

  const ab = p.silencedThisTurn ? null : bestTaggedAbility(engine, unlocked, target.weakness);
  const abPow = ab ? PLAYER_ABILITIES[ab].power : -1;

  // ESCALATE — buy the practice area with Confidence. Taken whenever the
  // owned kit cannot reach the weakness at least as hard, and whenever there
  // is enough Confidence left over that Assert Dominance is not delayed a
  // whole turn by the purchase.
  if (!p.silencedThisTurn && unlocked.has('escalate') && target.weakness
      && abPow < PLAYER_ABILITIES.escalate.power
      && p.momentum >= TUNE.ESCALATE_MOMENTUM
      && p.mp >= PLAYER_ABILITIES.escalate.cost) {
    const saveTag = PLAYER_ABILITIES.escalate.tag;
    PLAYER_ABILITIES.escalate.tag = target.weakness;
    p.momentum -= TUNE.ESCALATE_MOMENTUM;
    const r = taggedHit(engine, () => engine.playerAbility('escalate', ti));
    PLAYER_ABILITIES.escalate.tag = saveTag;
    if (r) { sim.st.escalates++; return; }
    p.momentum += TUNE.ESCALATE_MOMENTUM;
  }
  if (ab) { taggedHit(engine, () => engine.playerAbility(ab, ti)); return; }

  if (p.retaliateReady) { engine.playerRetaliate(rollRetaliateMultiplier() * sim.relic.retaliateDamage, ti); return; }
  if (!p.silencedThisTurn && engine.aliveEnemies().length >= 3 && unlocked.has('cc_all') && p.mp >= PLAYER_ABILITIES.cc_all.cost) {
    engine.playerAbility('cc_all', ti); return;
  }
  if (sim.coffees > 0 && p.mp < 30) { sim.coffees--; engine.playerItem('coffee_large'); return; }
  if (hpRatio < 0.25) { engine.playerDesperateGamble(sim.gambleRisk || 'safe', ti); return; }
  engine.playerAttack(ti);
}

// ── RISK & COMPLIANCE ───────────────────────────────────────────────────
// Brace on every telegraph; Retaliate is the damage engine; Composure comes
// off defense, not off tags. Subrogation converts the hits it eats.
function complianceTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const hpRatio = p.hp / p.maxHP;
  const wasBrace = sim.justBraced; sim.justBraced = false;
  p._jBracedLastTurn = wasBrace;
  const target = engine.enemies[ti];

  const paCost = engine.getPressAdvantageCost();
  if (p.momentum >= paCost + 25 && hpRatio >= 0.6 && !p.pressAdvantageUsedThisTurn) {
    engine.playerPressAdvantage(ti);
    if (engine.isOver) return;
  }

  if (hpRatio < 0.35 && p.momentum >= 50) { engine.playerSecondWind(); return; }
  const estHit = estimateBiggestIncomingDamage(engine);
  if ((hpRatio < 0.30 || p.hp < estHit * 0.9) && !p.silencedThisTurn) {
    if (unlocked.has('power_of_attorney') && p.mp >= PLAYER_ABILITIES.power_of_attorney.cost && p.maxHP - p.hp > 90) {
      engine.playerAbility('power_of_attorney'); return;
    }
    engine.playerAbility('coffee_break'); return;
  }
  if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }
  if (engine.counterActive) { engine.playerAttack(ti); return; }

  // The counterpunch window is the build. Spend it before anything else:
  // Notice of Deficiency first (it is the big one), then Retaliate.
  if (wasBrace && !p.silencedThisTurn && unlocked.has('notice_of_deficiency')
      && p.mp >= PLAYER_ABILITIES.notice_of_deficiency.cost) {
    taggedHit(engine, () => engine.playerAbility('notice_of_deficiency', ti));
    return;
  }
  if (p.retaliateReady) { engine.playerRetaliate(rollRetaliateMultiplier() * sim.relic.retaliateDamage, ti); return; }

  // Brace ANY incoming attack — the whole lane is built on it.
  const biggest = biggestIncomingPower(engine);
  if (!p.bracing && !wasBrace && biggest !== null) {
    engine.playerBrace(rollBraceQuality(sim.relic.braceWindow, sim.relic.aim));
    sim.justBraced = true; return;
  }

  if (!p.silencedThisTurn && unlocked.has('fiduciary_shield')
      && !p.buffs.some(b => b.name === PLAYER_ABILITIES.fiduciary_shield.name)
      && p.mp >= PLAYER_ABILITIES.fiduciary_shield.cost && biggest !== null && biggest >= 30) {
    engine.playerAbility('fiduciary_shield'); return;
  }
  const lockTag = p.silencedThisTurn ? null : openLockTag(engine, target, unlocked);
  if (lockTag) { taggedHit(engine, () => engine.playerAbility(bestTaggedAbility(engine, unlocked, lockTag), ti)); return; }
  const ab = p.silencedThisTurn ? null : bestTaggedAbility(engine, unlocked, target.weakness);
  if (ab) { taggedHit(engine, () => engine.playerAbility(ab, ti)); return; }
  if (sim.coffees > 0 && p.mp < 25) { sim.coffees--; engine.playerItem('coffee_large'); return; }
  if (hpRatio < 0.25) { engine.playerDesperateGamble(sim.gambleRisk || 'safe', ti); return; }
  engine.playerAttack(ti);
}

// ── AUDIT & ADVISORY ────────────────────────────────────────────────────
// Findings accrue on OFF-weakness tagged hits — the first mechanic in the
// game that pays you for not hitting the weakness. Cash at 5, or rewrite the
// file with Material Weakness.
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

  if (hpRatio < 0.40 && p.momentum >= 50) { engine.playerSecondWind(); return; }
  const estHit = estimateBiggestIncomingDamage(engine);
  if ((hpRatio < 0.35 || p.hp < estHit * 1.1 + 10) && !p.silencedThisTurn) {
    if (unlocked.has('power_of_attorney') && p.mp >= PLAYER_ABILITIES.power_of_attorney.cost && p.maxHP - p.hp > 90) {
      engine.playerAbility('power_of_attorney'); return;
    }
    engine.playerAbility('coffee_break'); return;
  }
  if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }
  if (engine.counterActive) { engine.playerAttack(ti); return; }

  // Capstone: arm Material Weakness whenever the file is about to close and
  // the opposition is NOT already weak to the practice area we hit hardest in.
  // If they already are, the Qualified Opinion is worth more.
  // Declare only when the strongest practice area we own OUT-POWERS the one
  // they are actually weak to. When the two are the same button (which the
  // two story-gift abilities usually make true — see D1-trees.md §5.5), the
  // Qualified Opinion is worth more and the capstone correctly stays quiet.

  const biggest = biggestIncomingPower(engine);
  if (!p.bracing && !wasBrace && biggest !== null && (biggest >= 30 || (biggest >= 20 && hpRatio < 0.50))) {
    engine.playerBrace(rollBraceQuality(sim.relic.braceWindow, sim.relic.aim));
    sim.justBraced = true; return;
  }

  // Due Diligence: a tagged debuff clears Objections, files a Finding (Scope
  // Expansion) and drops their DEF for the ramp.
  if (!p.silencedThisTurn && unlocked.has('due_diligence')
      && !target.buffs.some(b => b.name === PLAYER_ABILITIES.due_diligence.name)
      && p.mp >= PLAYER_ABILITIES.due_diligence.cost) {
    engine.playerAbility('due_diligence', ti); return;
  }
  if (!p.silencedThisTurn && unlocked.has('billable_hours')
      && !p.buffs.some(b => b.name === PLAYER_ABILITIES.billable_hours.name)
      && p.mp >= PLAYER_ABILITIES.billable_hours.cost && hpRatio > 0.5) {
    engine.playerAbility('billable_hours'); return;
  }

  const lockTag = p.silencedThisTurn ? null : openLockTag(engine, target, unlocked);
  if (lockTag) { taggedHit(engine, () => engine.playerAbility(bestTaggedAbility(engine, unlocked, lockTag), ti)); return; }

  if (!p.silencedThisTurn) {
    // Audit does NOT avoid the weakness — that policy was measured and it is
    // strictly bad (see D1-trees.md §5.2). It plays the weakness normally and
    // treats the file as a PARALLEL meter that the Objections system was
    // already forcing it to feed. Two deliberate deviations:
    //   * at 4 Findings, take the off-weakness tag that COMPLETES the file,
    //     because closing it next turn is worth more than one 1.5x hit;
    //   * at 5 Findings, cash on the hardest hit available, weakness or not.
    const cand = attackAbilities(unlocked, p.mp).map(id => [id, PLAYER_ABILITIES[id]]).filter(([, a]) => a.tag);
    if (cand.length > 0) {
      const wId = bestTaggedAbility(engine, unlocked, target.weakness);
      const strongest = [...cand].sort((x, y) => y[1].power - x[1].power)[0][0];
      let pick = wId || strongest;
      if (engine.aliveEnemies().length >= 2 && unlocked.has('management_letter')
          && p.mp >= PLAYER_ABILITIES.management_letter.cost) {
        taggedHit(engine, () => engine.playerAbility('management_letter', ti)); return;
      }
      const maxF = unlocked.has('material_weakness') ? TUNE.FIND_MAX_CAPSTONE : TUNE.FIND_MAX;
      if (unlocked.has('findings')) {
        if (stacks >= maxF) {
          pick = strongest;                                    // close the file
        } else if (stacks === maxF - 1) {
          const off = cand.filter(([, a]) => a.tag !== target.weakness && a.tag !== target.resistance);
          if (off.length > 0) pick = off.sort((x, y) => y[1].power - x[1].power)[0][0];
        }
      }
      taggedHit(engine, () => engine.playerAbility(pick, ti)); return;
    }
  }
  if (p.retaliateReady) { engine.playerRetaliate(rollRetaliateMultiplier() * sim.relic.retaliateDamage, ti); return; }
  if (sim.coffees > 0 && p.mp < 30) { sim.coffees--; engine.playerItem('coffee_large'); return; }
  if (hpRatio < 0.25) { engine.playerDesperateGamble(sim.gambleRisk || 'safe', ti); return; }
  engine.playerAttack(ti);
}

// ── Motion for Summary Judgment (the offensive One More) ────────────────
// Wraps whichever policy the build runs. Turn-back only fires when the
// capstone node is owned. Chain is hard-capped at 1 in every mode.
function withMSJ(inner) {
  return (engine, sim, unlocked) => {
    if (!unlocked.has('motion_summary_judgment')) { inner(engine, sim, unlocked); return; }
    const before = sim.st.supers;
    const preBroken = engine.enemies.map(e => (e.brokenBonus > 0 || e.broken > 0));
    inner(engine, sim, unlocked);
    if (engine.isOver) return;
    if (sim.st.supers <= before) return;                       // no weakness hit
    const ti = engine.targetEnemyIndex ?? 0;
    if (preBroken[ti]) return;                                 // P5R no-re-down
    const t = engine.enemies[ti];
    if (t && (t.broken > 0 || t.brokenBonus > 0) && !preBroken[ti]) return;  // the hit that Broke
    if (TUNE.MSJ_MODE === 'oncePerEnemy') {
      sim.msjSpent = sim.msjSpent || new Set();
      if (sim.msjSpent.has(ti)) return;
      sim.msjSpent.add(ti);
    } else if (TUNE.MSJ_MODE === 'oncePerFight') {
      if (sim.msjUsed) return;
      sim.msjUsed = true;
    }
    if (TUNE.MSJ_MOMENTUM > 0) {
      if (engine.player.momentum < TUNE.MSJ_MOMENTUM) return;
      engine.player.momentum -= TUNE.MSJ_MOMENTUM;
    }
    sim.st.msjProcs++;
    if (TUNE.MSJ_RESTRICT) {
      // The returned turn is a REAL turn (attack, Brace, heal, item, momentum
      // verb) but it may not spend a SECOND tagged ability. Andrew therefore
      // still gets exactly one tagged hit per turn, so the Objections /
      // Composure trade Run C shipped survives by construction and the
      // enemy-denial double-dip H-run measured is impossible.
      const stripped = new Set([...unlocked].filter(id => {
        const a = PLAYER_ABILITIES[id];
        return !(a && a.tag && (a.type === 'attack' || a.type === 'attack_aoe'));
      }));
      inner(engine, sim, stripped);
    } else {
      inner(engine, sim, unlocked);    // the returned turn — a real, full turn
    }
  };
}

// ════════════════════════════════════════════════════════════════════════
// 5. Batch runner
// ════════════════════════════════════════════════════════════════════════
const POLICIES = {
  shipped: competentTurn,
  litigation: litigationTurn,
  compliance: complianceTurn,
  audit: auditTurn,
};

export function batchBuild(cfg, level, runs, treeId, opts = {}) {
  const unlocked = opts.unlocked || buildUnlocked(treeId, level, opts);
  const base = POLICIES[treeId] || competentTurn;
  const policy = withMSJ(base);
  const agg = {
    wins: 0, timeouts: 0, rounds: 0, hpLeft: 0, actions: 0, supers: 0, breaks: 0,
    locksSeen: 0, locksCleared: 0, fizzles: 0, brokenTurns: 0, momentum: 0,
    powerMoves: 0, loopIns: 0, braces: 0, perfectBraces: 0, retaliates: 0,
    braceLockClears: 0, findingsFiled: 0, findingsCashed: 0, materialWeakness: 0,
    subrogationCashed: 0, subrogationDamage: 0, msjProcs: 0, escalates: 0,
    counterpunches: 0, cW: 0, cO: 0,
  };
  for (let i = 0; i < runs; i++) {
    let st = null;
    const simRef = {};
    const r = runFight({ ...cfg, unlocked }, level, {
      policy: (engine, sim, unl) => {
        if (!sim.st) { sim.st = simRef.st; sim.relic = sim.relic || NO_RELIC; }
        return policy(engine, sim, unl);
      },
      onEngine: (e) => {
        st = instrument(e);
        simRef.st = st;
        applyBuildPatches(e, unlocked, st, opts.tune || TUNE);
        if (opts.rotate) applyRotation(e, st);
        if (opts.onEngine) opts.onEngine(e, st);
      },
    });
    if (r.win) { agg.wins++; agg.rounds += r.rounds; agg.hpLeft += r.hpPct; }
    if (r.timeout) agg.timeouts++;
    if (st) {
      agg.actions += st.andrewActions; agg.supers += st.supers; agg.breaks += st.breaks;
      agg.locksSeen += st.locksSeen; agg.locksCleared += st.locksCleared;
      agg.fizzles += st.fizzles; agg.brokenTurns += st.brokenTurns;
      agg.momentum += st.momentumGained; agg.powerMoves += st.powerMoves;
      agg.loopIns += st.loopIns; agg.braces += st.braces; agg.perfectBraces += st.perfectBraces;
      agg.retaliates += st.retaliates; agg.braceLockClears += st.braceLockClears;
      agg.findingsFiled += st.findingsFiled; agg.findingsCashed += st.findingsCashed;
      agg.materialWeakness += st.materialWeakness;
      agg.subrogationCashed += st.subrogationCashed; agg.subrogationDamage += st.subrogationDamage;
      agg.msjProcs += st.msjProcs; agg.escalates += st.escalates;
      agg.counterpunches += st.counterpunches;
      agg.cW += st.composureFromWeakness; agg.cO += st.composureFromOther;
    }
  }
  const w = Math.max(1, agg.wins);
  return {
    winRate: agg.wins / runs,
    avgRounds: agg.rounds / w,
    avgHpLeft: agg.hpLeft / w,
    actions: agg.actions / runs,
    supers: agg.supers / runs,
    breaks: agg.breaks / runs,
    lockClear: agg.locksSeen ? agg.locksCleared / agg.locksSeen : 0,
    fizzles: agg.fizzles / runs,
    brokenTurns: agg.brokenTurns / runs,
    effTurns: (agg.rounds / w) - (agg.fizzles / runs) - (agg.brokenTurns / runs),
    momentum: agg.momentum / runs,
    powerMoves: agg.powerMoves / runs,
    loopIns: agg.loopIns / runs,
    braces: agg.braces / runs,
    perfectBraces: agg.perfectBraces / runs,
    retaliates: agg.retaliates / runs,
    braceLockClears: agg.braceLockClears / runs,
    findingsFiled: agg.findingsFiled / runs,
    findingsCashed: agg.findingsCashed / runs,
    materialWeakness: agg.materialWeakness / runs,
    subrogationCashed: agg.subrogationCashed / runs,
    subrogationDamage: agg.subrogationDamage / runs,
    msjProcs: agg.msjProcs / runs,
    escalates: agg.escalates / runs,
    counterpunches: agg.counterpunches / runs,
    composureWeak: agg.cW / runs,
    composureOther: agg.cO / runs,
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

// ════════════════════════════════════════════════════════════════════════
// 6. CLI
// ════════════════════════════════════════════════════════════════════════
function parseArgs(argv) {
  const out = { flags: new Set(), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2); const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out.opts[key] = next; i++; } else out.flags.add(key);
    }
  }
  return out;
}

function runPoints() {
  console.log('\n=== POINT-BUDGET AUDIT ===');
  console.log('Upgrade points available: 1 per level-up → L4 = 3, L8 = 7, L10 = 9, L15 = 14.\n');
  for (const [id, tree] of Object.entries(TREES)) {
    const total = tree.order.reduce((s, [, c]) => s + c, 0);
    console.log(`${tree.label.padEnd(26)} total cost ${String(total).padStart(3)} pts`);
    for (const lvl of [3, 4, 6, 8, 10, 12, 15]) {
      const u = [...buildUnlocked(id, lvl, { noQuest: true })].filter(x => !STARTERS.includes(x));
      console.log(`   L${String(lvl).padEnd(3)} (${String(lvl - 1).padStart(2)} pts, ${String(pointsSpent(id, lvl)).padStart(2)} spent): ${u.join(', ') || '—'}`);
    }
    console.log('');
  }
}

function ladderTable(title, treeId, runs, opts = {}) {
  console.log(`\n=== ${title} — ${runs} runs/cell ===`);
  console.log('encounter'.padEnd(20) + 'lvl'.padStart(4) + 'pts'.padStart(5) + 'win'.padStart(8)
    + 'rounds'.padStart(8) + 'HPleft'.padStart(8) + 'eff.T'.padStart(7) + 'breaks'.padStart(8)
    + 'lockClr'.padStart(9) + 'supers'.padStart(8) + 'mom'.padStart(7));
  const rows = [];
  for (const row of LADDER) {
    const r = batchBuild(cfgFor(row), row.level, runs, treeId, opts);
    rows.push(r);
    console.log(row.id.padEnd(20) + String(row.level).padStart(4)
      + String(pointsSpent(treeId, row.level)).padStart(5)
      + pct(r.winRate).padStart(8) + n2(r.avgRounds).padStart(8)
      + pct(r.avgHpLeft).padStart(8) + n2(r.effTurns).padStart(7)
      + n2(r.breaks).padStart(8) + pct(r.lockClear).padStart(9)
      + n2(r.supers).padStart(8) + Math.round(r.momentum).toString().padStart(7));
  }
  return rows;
}

function runBuilds(runs) {
  const out = {};
  for (const t of ['shipped', 'litigation', 'compliance', 'audit']) {
    out[t] = ladderTable(TREES[t].label, t, runs);
  }
  console.log('\n=== DIVERSITY BAND — is any lane dominant? ===');
  console.log('encounter'.padEnd(20) + 'lvl'.padStart(4)
    + '  win: ship / lit / comp / audit        rounds: ship/lit/comp/aud       HPleft: ship/lit/comp/aud');
  LADDER.forEach((row, i) => {
    const w = ['shipped', 'litigation', 'compliance', 'audit'].map(t => out[t][i]);
    console.log(row.id.padEnd(20) + String(row.level).padStart(4) + '   '
      + w.map(r => pct(r.winRate).padStart(7)).join(' ') + '    '
      + w.map(r => n2(r.avgRounds).padStart(6)).join(' ') + '    '
      + w.map(r => pct(r.avgHpLeft).padStart(7)).join(' '));
  });
  const spread = (key) => {
    let worst = 0, where = '';
    LADDER.forEach((row, i) => {
      const v = ['litigation', 'compliance', 'audit'].map(t => out[t][i][key]);
      const d = Math.max(...v) - Math.min(...v);
      if (d > worst) { worst = d; where = `${row.id}@${row.level}`; }
    });
    return `${key}: max spread ${key === 'winRate' ? pct(worst) : n2(worst)} at ${where}`;
  };
  console.log('\n' + spread('winRate'));
  console.log(spread('avgRounds'));
  return out;
}

function runShape(runs) {
  console.log(`\n=== SHAPE — where each build's currencies come from (${runs} runs/cell) ===`);
  console.log('The design succeeds if these columns DIFFER. Same win rate, different plumbing.');
  const rows = [
    { id: 'karen', level: 4 }, { id: 'chad', level: 6 }, { id: 'grandma', level: 8 },
    { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  console.log('\n' + 'encounter'.padEnd(18) + 'build'.padEnd(13) + 'supers'.padStart(8)
    + 'compW'.padStart(8) + 'compOTH'.padStart(9) + 'breaks'.padStart(8)
    + 'brace'.padStart(7) + 'retal'.padStart(7) + 'braceLk'.padStart(9)
    + 'find'.padStart(7) + 'cash'.padStart(7) + 'matW'.padStart(7)
    + 'subro'.padStart(8) + 'msj'.padStart(6) + 'esc'.padStart(6));
  for (const row of rows) {
    for (const t of ['shipped', 'litigation', 'compliance', 'audit']) {
      const r = batchBuild(cfgFor(row), row.level, runs, t);
      console.log(`${row.id}@${row.level}`.padEnd(18) + t.padEnd(13)
        + n2(r.supers).padStart(8) + Math.round(r.composureWeak).toString().padStart(8)
        + Math.round(r.composureOther).toString().padStart(9) + n2(r.breaks).padStart(8)
        + n2(r.braces).padStart(7) + n2(r.retaliates).padStart(7)
        + n2(r.braceLockClears).padStart(9) + n2(r.findingsFiled).padStart(7)
        + n2(r.findingsCashed).padStart(7) + n2(r.materialWeakness).padStart(7)
        + n2(r.subrogationCashed).padStart(8) + n2(r.msjProcs).padStart(6)
        + n2(r.escalates).padStart(6));
    }
    console.log('');
  }
}

function runCapstone(runs) {
  console.log(`\n=== CAPSTONE PRICING — Motion for Summary Judgment (${runs} runs/cell) ===`);
  console.log('Litigation build only, at L10+ (capstone costs the 9th and 10th points).');
  console.log('Reference: H-run holds "effective enemy turns >= ~90% of Run C" as the bar.');
  const rows = [
    { id: 'grandma', level: 10 }, { id: 'restructuring_trio', level: 10, party: ['janet'] },
    { id: 'rachel_boss', level: 10 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
    { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  ];
  const MODES = [
    ['no capstone', null, 0, false],
    ['once/enemy, free', 'oncePerEnemy', 0, false],
    ['once/enemy, NO 2nd tag', 'oncePerEnemy', 0, true],
    ['once/turn, NO 2nd tag', 'oncePerTurn', 0, true],
    ['once/turn, -50 mom', 'oncePerTurn', 50, false],
    ['once/turn, free', 'oncePerTurn', 0, false],
  ];
  console.log('\n' + 'encounter'.padEnd(22) + 'capstone'.padEnd(22) + 'win'.padStart(8)
    + 'rounds'.padStart(8) + 'HPleft'.padStart(8) + 'eff.T'.padStart(7)
    + 'vs base'.padStart(9) + 'procs'.padStart(7) + 'chain'.padStart(7));
  for (const row of rows) {
    let baseEff = null;
    for (const [label, mode, mom, restrict] of MODES) {
      const savedMode = TUNE.MSJ_MODE, savedMom = TUNE.MSJ_MOMENTUM, savedR = TUNE.MSJ_RESTRICT;
      TUNE.MSJ_MODE = mode || 'oncePerEnemy'; TUNE.MSJ_MOMENTUM = mom; TUNE.MSJ_RESTRICT = !!restrict;
      const unlocked = mode
        ? buildUnlocked('litigation', row.level, { extraPoints: 2 })
        : new Set([...buildUnlocked('litigation', row.level, { extraPoints: 2 })].filter(x => x !== 'motion_summary_judgment'));
      const r = batchBuild(cfgFor(row), row.level, runs, 'litigation', { unlocked });
      TUNE.MSJ_MODE = savedMode; TUNE.MSJ_MOMENTUM = savedMom; TUNE.MSJ_RESTRICT = savedR;
      if (baseEff === null) baseEff = r.effTurns;
      console.log(`${row.id}@${row.level}`.padEnd(22) + label.padEnd(22)
        + pct(r.winRate).padStart(8) + n2(r.avgRounds).padStart(8)
        + pct(r.avgHpLeft).padStart(8) + n2(r.effTurns).padStart(7)
        + pct(r.effTurns / Math.max(0.01, baseEff)).padStart(9)
        + n2(r.msjProcs).padStart(7) + '1'.padStart(7));
    }
    console.log('');
  }
}

function runFindings(runs) {
  console.log(`\n=== FINDINGS TUNING — Audit keystone (${runs} runs/cell) ===`);
  const rows = [{ id: 'chad', level: 6 }, { id: 'grandma', level: 8 }, { id: 'rachel_boss', level: 9 },
    { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] }];
  // Two knobs: the ramp (per-stack damage) and the CLOSE (how many Findings a
  // file needs). They are not equally sensitive and the table says which.
  const SWEEP = [
    ['ramp  6% / close 5', 0.06, 5],
    ['ramp  8% / close 5  *', 0.08, 5],
    ['ramp 10% / close 5', 0.10, 5],
    ['ramp 12% / close 5', 0.12, 5],
    ['ramp  8% / close 4', 0.08, 4],
    ['ramp  8% / close 6', 0.08, 6],
    ['ramp  0% / close 5', 0.00, 5],
  ];
  console.log('\n' + 'encounter'.padEnd(20) + 'tuning'.padEnd(26) + 'win'.padStart(8)
    + 'rounds'.padStart(8) + 'HPleft'.padStart(8) + 'breaks'.padStart(8)
    + 'filed'.padStart(7) + 'closed'.padStart(8) + 'supers'.padStart(8));
  for (const row of rows) {
    for (const [label, per, close] of SWEEP) {
      const tune = { ...TUNE, FIND_PER_STACK: per, FIND_MAX: close, FIND_MAX_CAPSTONE: Math.max(2, close - 1) };
      const r = batchBuild(cfgFor(row), row.level, runs, 'audit', { tune });
      console.log(`${row.id}@${row.level}`.padEnd(20) + label.padEnd(26)
        + pct(r.winRate).padStart(8) + n2(r.avgRounds).padStart(8)
        + pct(r.avgHpLeft).padStart(8) + n2(r.breaks).padStart(8)
        + n2(r.findingsFiled).padStart(7) + n2(r.findingsCashed).padStart(8)
        + n2(r.supers).padStart(8));
    }
    console.log('');
  }
}

function runRotate(runs) {
  console.log(`\n=== "THE FILE MOVES" — boss phases carry their own weakness (${runs} runs/cell) ===`);
  console.log('Casual/PIP is untouched by construction (it never lands a tagged hit).');
  const rows = [
    { id: 'karen', level: 4 }, { id: 'chad', level: 6 }, { id: 'grandma', level: 8 },
    { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  console.log('\n' + 'encounter'.padEnd(20) + 'build'.padEnd(13) + 'rotate'.padStart(8)
    + 'win'.padStart(8) + 'rounds'.padStart(8) + 'HPleft'.padStart(8)
    + 'breaks'.padStart(8) + 'supers'.padStart(8) + 'rot'.padStart(6));
  for (const row of rows) {
    for (const t of ['shipped', 'litigation', 'compliance', 'audit']) {
      for (const rot of [false, true]) {
        const r = batchBuild(cfgFor(row), row.level, runs, t, { rotate: rot });
        console.log(`${row.id}@${row.level}`.padEnd(20) + t.padEnd(13)
          + (rot ? 'ON' : 'off').padStart(8) + pct(r.winRate).padStart(8)
          + n2(r.avgRounds).padStart(8) + pct(r.avgHpLeft).padStart(8)
          + n2(r.breaks).padStart(8) + n2(r.supers).padStart(8)
          + n2(r.fizzles).padStart(6));
      }
    }
    console.log('');
  }
}

function runPip(runs) {
  console.log(`\n=== PIP / CASUAL FLOOR — must not move (${runs} runs/cell) ===`);
  console.log('CASUAL never lands a tagged hit, so no keystone, no capstone and no');
  console.log('weakness rotation is reachable for it. Any movement here is a bug.');
  const rows = [
    { id: 'karen', level: 3 }, { id: 'karen', level: 4 }, { id: 'grandma', level: 7 },
    { id: 'grandma', level: 8 }, { id: 'rachel_boss', level: 9 },
    { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  const PIPS = [0, 0.20, 0.30];
  console.log('\n' + 'encounter'.padEnd(20) + 'variant'.padEnd(24)
    + PIPS.map(p => `PIP ${Math.round(p * 100)}%`.padStart(10)).join(''));
  for (const row of rows) {
    for (const [label, treeId, rot] of [
      ['shipped kit, no rotation', 'shipped', false],
      ['audit tree + rotation ON', 'audit', true],
    ]) {
      const cells = PIPS.map((p) => {
        const cfg = { ...cfgFor(row), pipResist: p };
        const unlocked = buildUnlocked(treeId, row.level);
        let wins = 0;
        for (let i = 0; i < runs; i++) {
          const r = runFight({ ...cfg, unlocked }, row.level, {
            policy: casualTurn,
            onEngine: (e) => {
              const st = instrument(e);
              applyBuildPatches(e, unlocked, st);
              if (rot) applyRotation(e, st);
            },
          });
          if (r.win) wins++;
        }
        return pct(wins / runs).padStart(10);
      });
      console.log(`${row.id}@${row.level}`.padEnd(20) + label.padEnd(24) + cells.join(''));
    }
  }
}

function runNg(runs) {
  console.log(`\n=== NG+ — carried kit vs fresh (${runs} runs/cell) ===`);
  console.log('Rule (tools/ng-sim.mjs): CARRY@NG+1 must not be EASIER than FRESH@NG.');
  const rows = [{ id: 'karen', level: 4 }, { id: 'grandma', level: 8 }, { id: 'rachel_boss', level: 9 }];
  console.log('\n' + 'encounter'.padEnd(18) + 'build'.padEnd(13) + 'lap'.padEnd(16)
    + 'win'.padStart(8) + 'rounds'.padStart(8) + 'HPleft'.padStart(8) + 'eff.T'.padStart(7));
  for (const row of rows) {
    for (const t of ['shipped', 'litigation', 'compliance', 'audit']) {
      // FRESH@NG: the tree spend a fresh player has at that level.
      const fresh = batchBuild({ ...cfgFor(row), ngPlus: true, ngPlusCount: 1 }, row.level, runs, t);
      // CARRY@NG+1: everything bought (14 points) — the full-tree carry.
      const carry = batchBuild({ ...cfgFor(row), ngPlus: true, ngPlusCount: 1 }, row.level, runs, t,
        { unlocked: buildUnlocked(t, 15, { extraPoints: 0 }) });
      const carry3 = batchBuild({ ...cfgFor(row), ngPlus: true, ngPlusCount: 3 }, row.level, runs, t,
        { unlocked: buildUnlocked(t, 15, { extraPoints: 0 }) });
      for (const [lap, r] of [['FRESH@NG', fresh], ['CARRY@NG+1', carry], ['CARRY@NG+3', carry3]]) {
        console.log(`${row.id}@${row.level}`.padEnd(18) + t.padEnd(13) + lap.padEnd(16)
          + pct(r.winRate).padStart(8) + n2(r.avgRounds).padStart(8)
          + pct(r.avgHpLeft).padStart(8) + n2(r.effTurns).padStart(7));
      }
    }
    console.log('');
  }
}

const args = parseArgs(process.argv.slice(2));
const RUNS = Number(args.opts.runs) || 300;
if (args.flags.has('points')) runPoints();
else if (args.flags.has('baseline')) ladderTable('SHIPPED (control)', 'shipped', RUNS);
else if (args.flags.has('builds')) runBuilds(RUNS);
else if (args.flags.has('shape')) runShape(RUNS);
else if (args.flags.has('capstone')) runCapstone(RUNS);
else if (args.flags.has('findings')) runFindings(RUNS);
else if (args.flags.has('rotate')) runRotate(RUNS);
else if (args.flags.has('pip')) runPip(RUNS);
else if (args.flags.has('ng')) runNg(RUNS);
else {
  console.log('Pick a mode: --points --baseline --builds --shape --capstone --findings --rotate --pip --ng');
}
