// _j-enemy.mjs — THROWAWAY harness for the J-run ENCOUNTER-DESIGNER lane.
//
// Question: the producer says combat "tends toward simplicity (spam the enemy
// weakness)". This lane fixes it from the ENEMY side — monotony should be
// punished by the opposition, not merely under-rewarded.
//
// Everything below is implemented as a MONKEY-PATCH over the real engine that
// tools/combat-sim.mjs already drives, so every number is measured against the
// shipped CombatEngine, the shipped ENEMY_STATS / PLAYER_ABILITIES and the
// shipped balance.json. Nothing in src/ is touched.
//
//   node tools/_j-enemy.mjs --baseline            # Run C ladder + tag-monotony instruments
//   node tools/_j-enemy.mjs --record              # THE RECORD variants, unaware policy
//   node tools/_j-enemy.mjs --adaptive            # THE RECORD, record-aware policy
//   node tools/_j-enemy.mjs --pivot               # phase weakness pivot
//   node tools/_j-enemy.mjs --deadphase           # the hpThreshold:0 phases nobody has seen
//   node tools/_j-enemy.mjs --combined            # RECORD + PIVOT + archetype locks
//   node tools/_j-enemy.mjs --pip                 # CASUAL/PIP floor (must not move)
//   node tools/_j-enemy.mjs --day                 # roguelite / Reception exposure
//   node tools/_j-enemy.mjs --ng                  # NG+ laps
//   node tools/_j-enemy.mjs --onemore             # fresh-tag-gated One More capstone
//   node tools/_j-enemy.mjs --feint               # Brace-punish (deferred telegraph)
//   node tools/_j-enemy.mjs --runs 400

import {
  runFight, enc, competentTurn, casualTurn, naiveTurn,
  buildPartyOverrides, unlockedAbilities, rollBraceQuality, NO_RELIC, buildPlayerStats,
} from './combat-sim.mjs';
import { COMBAT_DEPTH } from '../src/combat/CombatEngine.js';
import { ENEMY_STATS, ENEMY_ABILITIES, PLAYER_ABILITIES } from '../src/data/stats.js';

const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);

// ── AUTHORED DATA (the design's data layer, mirrored here for measurement) ──

// D3-PIVOT. Per-phase weakness/resistance for the phased bosses. Index 0 is
// the BASE (pre-phase) state, then one row per `phases[]` entry.
export const PIVOT = {
  // KAREN pivots ONCE, and late: her 50% phase is still plain legal so the
  // tutorial lesson (Objections + Composure) lands uncontested. The 25% row is
  // the foreshadow — "bring receipts to a live-tweet" — on a boss who is
  // nearly dead by the time it fires.
  karen: [
    { weakness: 'legal',  resistance: 'social' },   // base — "speak to the manager"
    { weakness: 'legal',  resistance: 'social' },   // 50% — she called her father
    { weakness: 'audit',  resistance: 'social' },   // 25% — live-tweeting; bring receipts
  ],
  // CHAD pivots ONCE and LATE for the same reason Karen does, plus one of its
  // own: he is weak to SOCIAL, which is the player's shallowest practice area
  // at levels 5-6 (raise_concerns 15; per_my_last_email is level 8). Any early
  // pivot off social is a damage UPGRADE for the player, not a demand. So his
  // 50% phase stays social and only the 25% phase moves.
  chad: [
    { weakness: 'social', resistance: 'legal'  },
    { weakness: 'social', resistance: 'legal'  },   // 50% — alpha mode
    { weakness: 'audit',  resistance: 'legal'  },   // 25% — rage-quit; show him the balance
  ],
  grandma: [
    { weakness: 'audit',  resistance: 'social' },
    { weakness: 'social', resistance: 'audit'  },   // 50% — The Look
    { weakness: 'legal',  resistance: 'audit'  },   // 25% — the final revision
  ],
  // MEREDITH / THE DIRECTOR: the SOCIAL row is deliberately last. From level 8
  // `per_my_last_email` (55 power, social) is the biggest single-target
  // ability in the game, so a social phase is a damage UPGRADE for the player,
  // not a demand. Parked in the sub-12% phase it costs the fight nothing.
  rachel_boss: [
    { weakness: 'audit',  resistance: 'social' },
    { weakness: 'legal',  resistance: 'audit'  },   // 60% — hostile takeover
    { weakness: 'audit',  resistance: 'legal'  },   // 30% — golden handcuffs, back to the file
    { weakness: 'social', resistance: 'legal'  },   // 12% — final assessment
  ],
  regional_director: [
    { weakness: 'legal',  resistance: 'social' },
    { weakness: 'audit',  resistance: 'legal'  },   // 60%
    { weakness: 'legal',  resistance: 'audit'  },   // 30%
    { weakness: 'social', resistance: 'audit'  },   // 12%
  ],
  // The Algorithm does NOT pivot. It adapts instead (recordThreshold 2).
};

// D3-DEADPHASE. The three bosses whose final phase is authored at
// hpThreshold: 0 — `hpPercent <= 0` is only true at death, so the phase never
// activates and its kit has never been seen. Real thresholds:
export const PHASE_FIX = {
  rachel_boss: 0.12,
  regional_director: 0.12,
  // algorithm: 0.15 — MEASURED AND DEFERRED. Reviving TOTAL OPTIMIZATION (40
  // power) costs the NG+ ladder 20+ pp at every carried lap because NG+ scaling
  // compounds a late-phase spike. Threshold and power sweeps do not recover it.
  // Ship it only with its own repricing pass. See D3-enemy.md §7.3.
};

// D3-RECORD per-enemy authoring. `false` = never adapts. The number is how
// many consecutive same-tag arguments it takes before a Precedent is filed, so
// a LOWER number is a sharper opponent. This table IS the difficulty curve.
export const RECORD_BY_ENEMY = {
  intern: false,             // tutorial fodder — two abilities, no mechanics
  reception_client: false,   // 1–3 round roguelite fights; would never fire anyway
  karen: false,              // FIRST BOSS. She teaches Objections + Composure. Nothing else.
  chad: 4,                   // first opponent who takes notes, and slowly
  compliance: 4,
  regional: 4,
  ross_boss: 4,
  security_guard: 4,
  brand_consultant: 4,
  restructuring_analyst: 4,
  // THE ALGORITHM is deliberately absent: its weakness is `technical`, and the
  // shipped kit has exactly one technical attack, so the two-ways-to-say-it law
  // exempts it anyway. Threshold 2 was measured and rejected — it does not file
  // a single extra Precedent (0.00/fight) but it forces near-strict alternation
  // on a 13-round NG+ fight, costing 19 pp at CARRY@NG+1 for nothing.
};
export const RECORD_DEFAULT = 3;

// D3-ARCHETYPE. Authored lock rows (ENEMY_ABILITIES[id].locks) that give each
// boss a fixed two-tag demand instead of the hash-derived one.
export const ARCHETYPE_LOCKS = {
  // KAREN — the Complainant. Legal demand on the heavy, audit on the escalation.
  father_wanted: ['legal'],
  demand_corporate: ['audit', 'legal'],
  live_tweet_rampage: ['audit'],
  // CHAD — the Heir. Social on the heavy, legal on the tantrum.
  trust_fund_tantrum: ['social'],
  alpha_mode: ['legal', 'social'],
  rage_quit_attack: ['legal'],
  // GRANDMA — the Matriarch. Audit + social.
  changed_the_will: ['audit'],
  final_revision: ['social', 'audit'],
  gerald_incident: ['social'],
  // MEREDITH — the Operator. All three, one per phase.
  restructure_threat: ['audit'],
  hostile_takeover: ['legal', 'audit'],
  final_assessment: ['social', 'legal'],
  // REGIONAL DIRECTOR
  market_correction: ['audit', 'legal'],
  quarterly_target: ['legal'],
  // THE ALGORITHM — technical is quest-gated, so its locks stay answerable
  // with the starter kit; only its Composure demands technical.
  system_overload: ['audit'],
  process_termination: ['legal', 'audit'],
  total_optimization: ['social', 'audit'],
};

// ── VARIANTS ─────────────────────────────────────────────────────────────
// record: { threshold, penalty, clearOnBrace, decay }  |  pivot | phaseFix |
// archetype | feint
export const VARIANTS = {
  off: null,

  // THE RECORD alone — flat threshold across the whole roster (A/B arms)
  R2:   { record: { threshold: 2, penalty: 'resist', flat: true } },
  R3:   { record: { threshold: 3, penalty: 'resist', flat: true } },
  R4:   { record: { threshold: 4, penalty: 'resist', flat: true } },
  R3n:  { record: { threshold: 3, penalty: 'neutral', flat: true } },
  R3c:  { record: { threshold: 3, penalty: 'nocomposure', flat: true } },
  R3b:  { record: { threshold: 3, penalty: 'resist', clearOnBrace: true, flat: true } },
  R3d:  { record: { threshold: 3, penalty: 'resist', decay: 2, flat: true } },
  // …and the GRADED ladder (RECORD_BY_ENEMY), which is the recommendation
  RG:   { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true } },

  // THE PIVOT alone (and the dead-phase fix it depends on)
  F:    { phaseFix: true },
  P:    { pivot: true, phaseFix: true },
  Pk:   { pivot: true, phaseFix: true, pivotSkip: ['karen'] },
  Pw:   { pivot: true, phaseFix: true, weaknessOnly: true },
  Pkw:  { pivot: true, phaseFix: true, pivotSkip: ['karen'], weaknessOnly: true },

  // ARCHETYPE LOCKS alone
  A:    { archetype: true },

  // THE RECOMMENDATION — graded Record + graded Pivot + the dead-phase fix.
  RP:   { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true }, pivot: true, phaseFix: true },
  // THE SHIPPING CANDIDATE: graded Record + "two ways to say it" + decay 1.
  RPX:  { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true, minPool: true, decay: 1 }, pivot: true, phaseFix: true },
  RPXn: { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true, minPool: true }, pivot: true, phaseFix: true },
  RPn:  { record: { threshold: RECORD_DEFAULT, penalty: 'neutral', clearOnBrace: true }, pivot: true, phaseFix: true },
  RPnb: { record: { threshold: RECORD_DEFAULT, penalty: 'resist' }, pivot: true, phaseFix: true },
  RPA:  { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true }, pivot: true, phaseFix: true, archetype: true },
  // Punishment shapes on top of the graded ladder
  RPs:  { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true, seal: true }, pivot: true, phaseFix: true },
  RPc:  { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true, composureRegen: 20 }, pivot: true, phaseFix: true },
  RPsc: { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true, seal: true, composureRegen: 20 }, pivot: true, phaseFix: true },
  Rs:   { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true, seal: true } },
  // Decay arms: a Precedent expires on its own after N enemy turns, which
  // bounds monotony's cost at a RATE LIMIT and makes a lockout impossible.
  RPd:  { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true, decay: 1 }, pivot: true, phaseFix: true },
  RPd2: { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true, decay: 2 }, pivot: true, phaseFix: true },
  RPdn: { record: { threshold: RECORD_DEFAULT, penalty: 'neutral', clearOnBrace: true, decay: 1 }, pivot: true, phaseFix: true },
  // WIND-UP pressure profile — the lane-differentiation lever
  W:    { windup: ['rachel_boss', 'grandma'] },
  RPW:  { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true }, pivot: true, phaseFix: true, windup: ['rachel_boss', 'grandma'] },
  // Reactive pivot arms
  PR:   { pivot: true, pivotReactive: true, phaseFix: true },
  RPR:  { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true }, pivot: true, pivotReactive: true, phaseFix: true },
  RPRs: { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true, seal: true }, pivot: true, pivotReactive: true, phaseFix: true },

  // Brace-punish
  FE:   { feint: true },
  RPF:  { record: { threshold: RECORD_DEFAULT, penalty: 'resist', clearOnBrace: true }, pivot: true, phaseFix: true, feint: true },
};

// ── PATCH LAYER ──────────────────────────────────────────────────────────

function activePhaseIndex(enemy) {
  if (!enemy?.phases) return -1;
  const hpPercent = enemy.hp / enemy.maxHP;
  let idx = -1, lowest = Infinity;
  enemy.phases.forEach((p, i) => {
    if (hpPercent <= p.hpThreshold && p.hpThreshold <= lowest) { lowest = p.hpThreshold; idx = i; }
  });
  return idx;
}

function recordThresholdFor(enemy, cfg) {
  if (cfg.flat) return cfg.threshold;          // uniform-threshold A/B arm
  const per = RECORD_BY_ENEMY[enemy.enemyId];
  if (per === false) return null;
  if (typeof per === 'number') return per;
  return cfg.threshold;
}

// Apply the pivot PERSISTENTLY: this is what the shipped implementation does
// (`_syncPhaseTraits` on phase entry), and it is what makes the pivot visible
// on the HUD's `COMPOSURE — <TAG> ONLY` label. A policy that reads the label
// therefore sees it; a policy that does not, does not.
export function syncPivot(engine, opts = {}) {
  for (const e of engine.enemies) {
    if (e.hp <= 0) continue;
    const table = PIVOT[e.enemyId];
    if (!table) continue;
    if (opts.pivotSkip && opts.pivotSkip.includes(e.enemyId)) continue;
    if (e._pivotBase === undefined) e._pivotBase = { w: e.weakness, r: e.resistance };
    const idx = activePhaseIndex(e) + 1;   // -1 → row 0 (base)

    if (opts.pivotReactive) {
      // REACTIVE PIVOT. Phase 0 is always the authored base (the documented
      // weakness every hint in the game names). On every LATER phase entry the
      // opponent re-guards: the new weakness is the tag from its authored pool
      // that Andrew has used LEAST, and the new resistance is the tag he has
      // used MOST. It cannot be walked into, because it always moves away.
      if (idx <= 0) {
        e.weakness = table[0].weakness;
        if (!opts.weaknessOnly) e.resistance = table[0].resistance;
        e._pivotPhase = 0;
        continue;
      }
      if (e._pivotPhase === idx) continue;      // already re-guarded for this phase
      e._pivotPhase = idx;
      const pool = [...new Set(table.map(r => r.weakness))];
      const use = e._tagUse || {};
      const cands = pool.filter(t => t !== e.weakness);
      if (cands.length) {
        cands.sort((a, b) => (use[a] || 0) - (use[b] || 0) || pool.indexOf(a) - pool.indexOf(b));
        e.weakness = cands[0];
        engine._j.st.pivots++;
      }
      if (!opts.weaknessOnly) {
        const most = Object.entries(use).sort((a, b) => b[1] - a[1]).map(([t]) => t)
          .filter(t => t !== e.weakness);
        if (most.length) e.resistance = most[0];
      }
      continue;
    }

    const row = table[Math.min(idx, table.length - 1)];
    if (!row) continue;
    if (e.weakness !== row.weakness) engine._j.st.pivots++;
    e.weakness = row.weakness;
    if (!opts.weaknessOnly) e.resistance = row.resistance;
  }
}

/**
 * Install the J-run enemy-side rules on a live engine.
 * Returns the stats object the batch aggregates.
 */
export function instrument(engine, variant) {
  const V = variant || {};
  const st = {
    andrewActions: 0, taggedHits: 0, weakTagHits: 0, tagCounts: {},
    aTagged: 0, aWeak: 0, aTagCounts: {},
    precedentsFiled: 0, precedentsStruck: 0, precedentedHits: 0,
    breaks: 0, locksSeen: 0, locksCleared: 0, fizzles: 0, brokenTurns: 0,
    supers: 0, loopIns: 0, oneMores: 0, deferrals: 0, distinctTagRuns: 0,
    pivots: 0, mpSpent: 0, rounds: 0,
  };
  engine._j = { st, V };

  // ── PIVOT: recompute weakness/resistance from the active phase ─────────
  if (V.pivot) {
    const realTele = engine.telegraph.bind(engine);
    engine.telegraph = () => { syncPivot(engine, V); return realTele(); };
    syncPivot(engine, V);
  }

  // ── THE RECORD ────────────────────────────────────────────────────────
  // An ALLY's tagged hit strikes a standing Precedent but never advances one.
  // The record is Andrew's; the bench is how you get off it.
  const strikeArgument = (target, tag) => {
    if (!V.record || !tag || !target) return;
    if (target._precedent && target._precedent !== tag) {
      target._precedent = null; target._recStreak = 0; target._recTag = null;
      st.precedentsStruck++;
    }
  };

  const noteArgument = (target, tag) => {
    if (!V.record || !tag || !target) return;
    const thr = recordThresholdFor(target, V.record);
    if (thr === null) return;
    // "TWO WAYS TO SAY IT" — a Precedent may only be filed on a practice area
    // Andrew owns at least two attack abilities in. Without this the rule
    // punishes the shape of the ability tree rather than the player's choices:
    // `technical` has exactly one attack ability in the shipped kit, so the
    // Algorithm (weak: technical) would lock a player out of their only super
    // for the rest of the fight. Measured: NG+1 CARRY 82% -> 55% without it.
    if (V.record.minPool) {
      const pool = engine._jUnlocked;
      if (pool) {
        let n = 0;
        for (const id of pool) {
          const a = PLAYER_ABILITIES[id];
          if (a && a.tag === tag && (a.type === 'attack' || a.type === 'attack_aoe')) n++;
        }
        if (n < 2) return;
      }
    }
    if (target._recTag === tag) {
      target._recStreak = (target._recStreak || 0) + 1;
    } else {
      // A DIFFERENT argument strikes any standing Precedent.
      if (target._precedent) { st.precedentsStruck++; target._precedent = null; }
      target._recTag = tag;
      target._recStreak = 1;
    }
    if (!target._precedent && target._recStreak >= thr) {
      target._precedent = tag;
      target._precedentAge = 0;
      st.precedentsFiled++;
      // "OVERRULED": filing a Precedent also seals the enemy's pending move,
      // reusing the shipped Denial-tax seal (locks visible but unclearable,
      // Composure frozen, SEALED_DAMAGE_BONUS on the hit).
      if (V.record.seal) target.sealed = true;
    }
  };

  const realCalc = engine._calcDamage.bind(engine);
  engine._calcDamage = (atk, power, def, target, tag = null) => {
    const isEnemy = target && engine.enemies.includes(target);
    if (!isEnemy) return realCalc(atk, power, def, target, tag);

    if (V.pivot) syncPivot(engine, V);

    let restoreRec = null;
    if (V.record && tag && target._precedent === tag) {
      st.precedentedHits++;
      const save = { w: target.weakness, r: target.resistance };
      const pen = V.record.penalty;
      if (pen === 'resist') {
        if (target.weakness === tag) target.weakness = '__struck__';
        target.resistance = tag;
      } else if (pen === 'neutral') {
        if (target.weakness === tag) target.weakness = '__struck__';
      } else if (pen === 'nocomposure') {
        // damage untouched; block only the Composure payload
        target._blockComposure = true;
      }
      restoreRec = () => {
        target.weakness = save.w; target.resistance = save.r;
        target._blockComposure = false;
      };
    }

    const res = realCalc(atk, power, def, target, tag);

    if (restoreRec) restoreRec();

    if (tag) {
      st.taggedHits++;
      if (!target._tagUse) target._tagUse = {};
      target._tagUse[tag] = (target._tagUse[tag] || 0) + 1;
      st.tagCounts[tag] = (st.tagCounts[tag] || 0) + 1;
      if (res.effective === 'super') st.weakTagHits++;
      if (engine._jActor === 'andrew') {
        st.aTagged++;
        st.aTagCounts[tag] = (st.aTagCounts[tag] || 0) + 1;
        if (res.effective === 'super') st.aWeak++;
      }
      if (engine._jActor === 'andrew') noteArgument(target, tag);
      else strikeArgument(target, tag);      // an ally spoke: it counts AGAINST the record, never for it
    }
    return res;
  };

  if (V.record && V.record.penalty === 'nocomposure') {
    const realRed = engine._reduceComposure.bind(engine);
    engine._reduceComposure = (t, amt) => {
      if (t && t._blockComposure) return { broke: false, amount: 0 };
      return realRed(t, amt);
    };
  }

  // Tagged non-damaging abilities (due_diligence) also go on the record.
  const realAbility = engine.playerAbility.bind(engine);
  engine.playerAbility = (id, ti) => {
    const a = PLAYER_ABILITIES[id];
    const before = engine.player.mp;
    engine._jActor = 'andrew';
    let r;
    try { r = realAbility(id, ti); } finally { engine._jActor = null; }
    if (r) {
      st.andrewActions++;
      st.mpSpent += Math.max(0, before - engine.player.mp);
      if (a && a.tag && (a.type === 'debuff' || a.type === 'silence')) {
        const t = engine.enemies[r.targetIndex ?? engine.targetEnemyIndex];
        if (t) noteArgument(t, a.tag);
      }
      if (r.effective === 'super' || (r.hits || []).some(h => h.effective === 'super')) st.supers++;
    }
    return r;
  };
  for (const m of ['playerAttack', 'playerRetaliate', 'playerDesperateGamble', 'playerPowerMove', 'playerSecondWind', 'playerPressAdvantage']) {
    const real = engine[m].bind(engine);
    engine[m] = (...a) => {
      engine._jActor = 'andrew';
      let r;
      try { r = real(...a); } finally { engine._jActor = null; }
      if (r) {
        st.andrewActions++;
        if (r.effective === 'super' || (r.hits || []).some(h => h.effective === 'super')) st.supers++;
      }
      return r;
    };
  }

  // A PERFECT Brace strikes the record on every enemy ("you let them talk").
  const realBrace = engine.playerBrace.bind(engine);
  engine.playerBrace = (q) => {
    const r = realBrace(q);
    if (r && q === 'perfect' && V.record && V.record.clearOnBrace) {
      for (const e of engine.enemies) {
        if (e.hp > 0 && e._precedent) { e._precedent = null; e._recStreak = 0; e._recTag = null; st.precedentsStruck++; }
      }
    }
    return r;
  };

  const realLI = engine.playerLoopIn.bind(engine);
  engine.playerLoopIn = (...a) => { const r = realLI(...a); if (r) st.loopIns++; return r; };

  const realRC = engine._reduceComposure.bind(engine);
  engine._reduceComposure = (t, amt) => {
    if (V.record && V.record.penalty === 'nocomposure' && t && t._blockComposure) return { broke: false, amount: 0 };
    const r = realRC(t, amt);
    if (r.broke) st.breaks++;
    return r;
  };

  // ── FEINT: a bracing player is READ, and the heavy is deferred ─────────
  const realET = engine.enemyTurn.bind(engine);
  engine.enemyTurn = (i) => {
    const e = engine.enemies[i];
    const locks = (e && Array.isArray(e.locks)) ? e.locks : [];
    st.locksSeen += locks.length;
    st.locksCleared += locks.filter(l => l.cleared).length;

    if (V.feint && e && e.hp > 0 && engine.player.bracing && e.telegraphedAbility) {
      const ab = ENEMY_ABILITIES[e.telegraphedAbility];
      const heavy = ab && (ab.type === 'attack' || ab.type === 'summon') && (ab.power || 0) >= 26;
      const alreadyDeferred = e._deferredOnce;
      if (heavy && !alreadyDeferred) {
        // The move is held. Locks the player already cleared STAY cleared, the
        // telegraph STAYS on the board, and a chip lands instead.
        e._deferredOnce = true;
        st.deferrals++;
        const chip = Math.max(1, Math.floor((engine._getEffective(e).atk * 1.5 - engine._getEffective(engine.player).def * 0.5) * 0.5));
        const dealt = engine.player.bracing ? Math.floor(chip * 0.5) : chip;
        engine.player.hp = Math.max(0, engine.player.hp - dealt);
        engine.player.bracing = false;
        engine.player.retaliateReady = true;
        engine.turnCount++;
        engine._checkDefeat();
        return { type: 'attack', damage: dealt, enemyIndex: i, deferred: true, message: `${e.name} sees the guard and waits.` };
      }
    }
    if (e) e._deferredOnce = false;

    // ── WIND-UP profile: fewer, bigger, fully-announced hits ──────────────
    // The enemy spends a turn visibly winding up; the next turn the same
    // telegraphed move lands at WINDUP_MULT. Halves the enemy's action count
    // and doubles its per-hit weight, which is the only shape that makes
    // Brace/Retaliate arithmetic pay.
    if (V.windup && e && e.hp > 0 && V.windup.includes(e.enemyId)) {
      const abId = e.telegraphedAbility;
      const ab = ENEMY_ABILITIES[abId];
      const heavy = ab && (ab.type === 'attack' || ab.type === 'summon') && (ab.power || 0) >= 20;
      if (heavy && !e._wound) {
        e._wound = abId;
        st.deferrals++;
        engine.turnCount++;
        return { type: 'windup', enemyIndex: i, message: `${e.name} is winding up.` };
      }
      if (e._wound && e._wound === abId && ab) {
        e._wound = null;
        const save = ab.power;
        ab.power = Math.round(save * (V.windupMult || 2.0));
        try { 
          if (V.pivot) syncPivot(engine, V);
          const rr = realET(i);
          if (rr && rr.type === 'fizzle') st.fizzles++;
          if (rr && rr.type === 'broken') st.brokenTurns++;
          return rr;
        } finally { ab.power = save; }
      }
      e._wound = null;
    }

    if (V.pivot) syncPivot(engine, V);
    const r = realET(i);

    if (r && r.type === 'fizzle') st.fizzles++;
    if (r && r.type === 'broken') st.brokenTurns++;
    // "THE RECORD IS CLOSING": a standing Precedent regenerates Composure.
    if (V.record && V.record.composureRegen && e && e.hp > 0 && e._precedent && e.broken <= 0) {
      e.composure = Math.min(e.maxComposure, e.composure + V.record.composureRegen);
    }
    // Precedent decay
    if (V.record && V.record.decay && e && e._precedent) {
      e._precedentAge = (e._precedentAge || 0) + 1;
      if (e._precedentAge >= V.record.decay) { e._precedent = null; e._recStreak = 0; e._recTag = null; }
    }
    return r;
  };

  return st;
}

// Apply the data-layer changes that live OUTSIDE the engine instance
// (phase thresholds, authored locks). Returns an undo function.
export function applyDataLayer(variant) {
  const undo = [];
  const V = variant || {};
  if (V.phaseFix) {
    for (const [id, thr] of Object.entries(PHASE_FIX)) {
      const phases = ENEMY_STATS[id]?.phases;
      if (!phases) continue;
      phases.forEach((p, i) => {
        if (p.hpThreshold === 0) {
          const save = p.hpThreshold;
          p.hpThreshold = thr;
          undo.push(() => { p.hpThreshold = save; });
        }
      });
    }
  }
  if (V.archetype) {
    for (const [id, locks] of Object.entries(ARCHETYPE_LOCKS)) {
      const ab = ENEMY_ABILITIES[id];
      if (!ab) continue;
      const save = ab.locks;
      ab.locks = locks;
      undo.push(() => { if (save === undefined) delete ab.locks; else ab.locks = save; });
    }
  }
  return () => { for (const f of undo.reverse()) f(); };
}

// ── POLICIES ─────────────────────────────────────────────────────────────

function pickTargetIndex(engine) {
  let best = -1, bestHp = Infinity, bestAtk = -1;
  engine.enemies.forEach((e, i) => {
    if (e.hp <= 0) return;
    if (e.hp < bestHp || (e.hp === bestHp && e.atk > bestAtk)) { best = i; bestHp = e.hp; bestAtk = e.atk; }
  });
  return best;
}

function affordableTagged(engine, unlocked, tag) {
  let best = null;
  for (const id of unlocked) {
    const a = PLAYER_ABILITIES[id];
    if (!a || (a.type !== 'attack' && a.type !== 'attack_aoe')) continue;
    if (a.tag !== tag) continue;
    if (engine.player.mp < a.cost) continue;
    if (!best || a.power > PLAYER_ABILITIES[best].power) best = id;
  }
  return best;
}

// MONO — the producer's complaint, expressed as a policy. It reads the
// `COMPOSURE — <TAG> ONLY` label, presses the matching ability, and does
// nothing else: no Objections, no Brace, no Retaliate, no baton. It heals when
// hurt and cashes Assert Dominance when the bar fills on its own. This is the
// "spam the enemy weakness" lane, and on the shipped ladder it is GOOD.
export function monoTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const target = engine.enemies[ti];
  const hpRatio = p.hp / p.maxHP;
  if (hpRatio < 0.40 && !p.silencedThisTurn && p.mp >= PLAYER_ABILITIES.coffee_break.cost) {
    engine.playerAbility('coffee_break'); return;
  }
  if (sim.coffees > 0 && p.mp < 25) { sim.coffees--; engine.playerItem('coffee_large'); return; }
  if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }
  const id = p.silencedThisTurn ? null : affordableTagged(engine, unlocked, target.weakness);
  if (id) { engine.playerAbility(id, ti); return; }
  engine.playerAttack(ti);
}

// ── BUILDS ───────────────────────────────────────────────────────────────
// A build is a TAG POOL. The untagged verbs (Coffee Break, Stall, buffs,
// Power of Attorney, Temporal Audit) belong to everyone; the tagged attack
// abilities are what upgrade points actually buy, and they cluster by practice
// area. A specialist policy is COMPETENT restricted to one practice area.
export const BUILD_TAGS = {
  litigator: ['legal'],
  rainmaker: ['social'],
  auditor: ['audit'],
  sysadmin: ['technical'],
  generalist: ['legal', 'social', 'audit', 'technical'],
  // Two-practice hybrids — what a real player who respecs once ends up with.
  'lit+aud': ['legal', 'audit'],
  'rain+aud': ['social', 'audit'],
  'lit+rain': ['legal', 'social'],
};

export function buildPolicy(buildName, inner = competentTurn) {
  const tags = BUILD_TAGS[buildName] || BUILD_TAGS.generalist;
  return (engine, sim, unlocked) => {
    const pool = new Set([...unlocked].filter(id => {
      const a = PLAYER_ABILITIES[id];
      if (!a) return false;
      if (!a.tag) return true;             // untagged verbs are universal
      return tags.includes(a.tag);
    }));
    inner(engine, sim, pool);
  };
}

// ── LANES ────────────────────────────────────────────────────────────────
// A LANE is not a tag. Tags are a lock-and-key; the lanes are the four
// resource systems the engine already ships. Each of these is a legitimate way
// to play, and the encounter roster decides which one is best against whom.

// OBJECTOR — the shipped COMPETENT policy: Objections first, Composure second.
// (= competentTurn)

// BREAKER — refuses to spend its one tagged hit on Objections. Everything goes
// into the Composure bar and the Break window.
export function breakerTurn(engine, sim, unlocked) {
  sim.ignoreLocks = true;
  competentTurn(engine, sim, unlocked);
}

// CLOSER — the momentum lane. Never braces, never chases Objections; banks
// Confidence, spends it on Press Advantage every turn and on Assert Dominance
// the moment the bar fills.
export function closerTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const hpRatio = p.hp / p.maxHP;
  const paCost = engine.getPressAdvantageCost();
  if (p.momentum >= paCost + 25 && !p.pressAdvantageUsedThisTurn) {
    engine.playerPressAdvantage(ti);
    if (engine.isOver) return;
  }
  if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }
  if (hpRatio < 0.40 && p.momentum >= 50) { engine.playerSecondWind(); return; }
  if (hpRatio < 0.30 && !p.silencedThisTurn) { engine.playerAbility('coffee_break'); return; }
  if (sim.coffees > 0 && p.mp < 25) { sim.coffees--; engine.playerItem('coffee_large'); return; }
  const target = engine.enemies[ti];
  const id = p.silencedThisTurn ? null : affordableTagged(engine, unlocked, target.weakness);
  if (id) { engine.playerAbility(id, ti); }
  else engine.playerAttack(ti);
  const c = engine.getLoopInCandidates();
  if (c.length > 0) engine.playerLoopIn(c[0]);
}

// GUARDIAN — the QTE lane. Braces anything incoming, cashes every Retaliate,
// lets the counter-punch be the damage.
export function guardianTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const hpRatio = p.hp / p.maxHP;
  const wasBrace = sim.justBraced;
  sim.justBraced = false;
  if (hpRatio < 0.30 && !p.silencedThisTurn) { engine.playerAbility('coffee_break'); return; }
  if (p.retaliateReady) {
    let correct = 0; for (let i = 0; i < 4; i++) if (Math.random() < 0.9) correct++;
    engine.playerRetaliate(1.0 * (correct / 4) * sim.relic.retaliateDamage, ti);
    return;
  }
  let incoming = null;
  for (const e of engine.enemies) {
    if (e.hp <= 0 || !e.telegraphedAbility) continue;
    const a = ENEMY_ABILITIES[e.telegraphedAbility];
    if (a && (a.type === 'attack' || a.type === 'summon')) incoming = Math.max(incoming ?? 0, a.power ?? 0);
  }
  if (!p.bracing && !wasBrace && incoming !== null) {
    engine.playerBrace(rollBraceQuality(sim.relic.braceWindow, sim.relic.aim));
    sim.justBraced = true;
    return;
  }
  const target = engine.enemies[ti];
  const id = p.silencedThisTurn ? null : affordableTagged(engine, unlocked, target.weakness);
  if (id) engine.playerAbility(id, ti); else engine.playerAttack(ti);
  const c = engine.getLoopInCandidates();
  if (c.length > 0) engine.playerLoopIn(c[0]);
}

// SPAM — the monotony player the producer described. Identical to COMPETENT
// except it decides the target's weakness ONCE, on the first turn, and never
// re-reads the label. Every enemy-side rule in this file is therefore invisible
// to it, which is exactly the arm that measures "what does monotony cost now?".
export function spamTurn(engine, sim, unlocked) {
  const saved = [];
  for (const e of engine.enemies) {
    if (e._spamWeak === undefined) e._spamWeak = e.weakness;
    saved.push([e, e.weakness, e.resistance]);
    e.weakness = e._spamWeak;
    if (e._spamResist === undefined) e._spamResist = e.resistance;
    e.resistance = e._spamResist;
  }
  try { competentTurn(engine, sim, unlocked); }
  finally { for (const [e, w, r] of saved) { e.weakness = w; e.resistance = r; } }
}

// ADAPTIVE — the record-aware player. Identical to COMPETENT except it reads
// the Precedent chip and the Composure label, and refuses to argue into a
// filed Precedent. This is the policy the design is FOR.
export function adaptiveTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  const ti = pickTargetIndex(engine);
  if (ti < 0) return;
  const target = engine.enemies[ti];
  const V = engine._j?.V || {};
  if (!V.record) { competentTurn(engine, sim, unlocked); return; }

  const thr = recordThresholdFor(target, V.record);
  const prec = target._precedent || null;
  const streak = target._recStreak || 0;
  const lastTag = target._recTag || null;

  // Which tag would the shipped policy be about to use? The weakness one,
  // after the pivot is resolved.
  let liveWeak = target.weakness;
  if (V.pivot) {
    const t = PIVOT[target.enemyId];
    if (t) {
      const row = t[Math.min(activePhaseIndex(target) + 1, t.length - 1)];
      if (row) liveWeak = row.weakness;
    }
  }

  // Tags this turn must avoid: anything under a Precedent, plus the tag that
  // would FILE one if repeated now.
  // Same "two ways to say it" law the enemy uses — a player who understands
  // the rule does not dodge a Precedent that can never be filed.
  const eligible = (tag) => {
    if (!tag) return false;
    if (!V.record.minPool) return true;
    let n = 0;
    for (const id of (engine._jUnlocked || [])) {
      const a = PLAYER_ABILITIES[id];
      if (a && a.tag === tag && (a.type === 'attack' || a.type === 'attack_aoe')) n++;
    }
    return n >= 2;
  };
  const avoid = new Set();
  if (prec) avoid.add(prec);
  if (thr !== null && lastTag && streak >= thr - 1 && !prec && eligible(lastTag)) avoid.add(lastTag);

  if (avoid.size === 0) { competentTurn(engine, sim, unlocked); return; }

  // Press Advantage is free — take it on the same terms as COMPETENT.
  const hpRatio = p.hp / p.maxHP;
  const paCost = engine.getPressAdvantageCost();
  if (p.momentum >= paCost && hpRatio >= 0.55 && !p.pressAdvantageUsedThisTurn) {
    engine.playerPressAdvantage(ti);
    if (engine.isOver) return;
  }

  // Emergencies still outrank the record.
  if (hpRatio < 0.40 && p.momentum >= 50) { engine.playerSecondWind(); return; }
  if (hpRatio < 0.30 && !p.silencedThisTurn) { engine.playerAbility('coffee_break'); return; }
  if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }

  // A perfect Brace also strikes the record — the defensive answer. Take it
  // when a haymaker is inbound anyway.
  if (V.record.clearOnBrace && prec && !p.bracing && !sim.justBraced) {
    let biggest = null;
    for (const e of engine.enemies) {
      if (e.hp <= 0 || !e.telegraphedAbility) continue;
      const a = ENEMY_ABILITIES[e.telegraphedAbility];
      if (a && (a.type === 'attack' || a.type === 'summon')) biggest = Math.max(biggest ?? 0, a.power ?? 0);
    }
    if (biggest !== null && biggest >= 26) {
      engine.playerBrace(rollBraceQuality(sim.relic.braceWindow, sim.relic.aim));
      sim.justBraced = true;
      return;
    }
  }

  // Otherwise: strike the record with a different argument. Prefer a tag that
  // is ALSO an open Objection, then the live weakness, then anything.
  const openLockTags = (target.locks || []).filter(l => !l.cleared && !avoid.has(l.tag)).map(l => l.tag);
  const order = [...openLockTags, liveWeak, 'legal', 'social', 'audit', 'technical'];
  for (const tag of order) {
    if (!tag || avoid.has(tag)) continue;
    const id = affordableTagged(engine, unlocked, tag);
    if (id) {
      engine.playerAbility(id, ti);
      const cands = engine.getLoopInCandidates();
      if (cands.length > 0) engine.playerLoopIn(cands[0]);
      return;
    }
  }

  // Nothing legal left — fall through to the shipped policy with the
  // precedented attacks stripped, so it takes the best remaining verb.
  const stripped = new Set([...unlocked].filter(id => {
    const a = PLAYER_ABILITIES[id];
    return !(a && a.tag && avoid.has(a.tag) && (a.type === 'attack' || a.type === 'attack_aoe'));
  }));
  competentTurn(engine, sim, stripped);
}

// ONE MORE, fresh-tag gated: a weakness hit hands the turn back ONLY when its
// tag differs from the previous tagged hit on that enemy. Wraps a policy.
export function freshOneMorePolicy(inner) {
  return (engine, sim, unlocked) => {
    const st = engine._j?.st;
    engine.player._jOneMoreUsed = false;      // once per TURN, not per fight
    const before = engine.enemies.map(e => e._recTag);
    const preSupers = st ? st.supers : 0;
    inner(engine, sim, unlocked);
    if (engine.isOver || !st) return;
    if (st.supers <= preSupers) return;
    const ti = pickTargetIndex(engine);
    if (ti < 0) return;
    const t = engine.enemies[ti];
    // fresh = the tag that just landed is not the tag that landed before it
    const wasFresh = before[ti] !== t._recTag;
    if (!wasFresh) return;
    if (engine.player._jOneMoreUsed) return;
    engine.player._jOneMoreUsed = true;
    st.oneMores++;
    inner(engine, sim, unlocked);
  };
}

// ── BATCH ────────────────────────────────────────────────────────────────
export function batchJ(cfg, level, runs, variantKey, policyName = 'adaptive', extra = {}) {
  const V = VARIANTS[variantKey] ?? null;
  const undo = applyDataLayer(V);
  const base = policyName === 'casual' ? casualTurn
    : policyName === 'naive' ? naiveTurn
      : policyName === 'competent' ? competentTurn
        : policyName === 'spam' ? spamTurn
          : policyName === 'mono' ? monoTurn
            : policyName === 'breaker' ? breakerTurn
              : policyName === 'closer' ? closerTurn
                : policyName === 'guardian' ? guardianTurn
            : policyName.startsWith('build:')
              ? buildPolicy(policyName.slice(6), extra.aware ? adaptiveTurn : competentTurn)
              : adaptiveTurn;
  const inner0 = extra.oneMore ? freshOneMorePolicy(base) : base;
  const policy = (engine, sim, unlocked) => { engine._jUnlocked = unlocked; return inner0(engine, sim, unlocked); };

  const agg = {
    wins: 0, timeouts: 0, rounds: 0, hpLeft: 0, taggedHits: 0, weakTagHits: 0,
    aTagged: 0, aWeak: 0, aTagCounts: {},
    tagCounts: {}, precedentsFiled: 0, precedentsStruck: 0, precedentedHits: 0,
    breaks: 0, locksSeen: 0, locksCleared: 0, fizzles: 0, brokenTurns: 0,
    supers: 0, loopIns: 0, oneMores: 0, deferrals: 0, actions: 0, allRounds: 0,
  };
  for (let i = 0; i < runs; i++) {
    let st = null;
    const r = runFight(cfg, level, {
      policy,
      onEngine: (e) => { st = instrument(e, V); e.player._jOneMoreUsed = false; },
    });
    if (r.win) { agg.wins++; agg.rounds += r.rounds; agg.hpLeft += r.hpPct; }
    if (r.timeout) agg.timeouts++;
    agg.allRounds += r.rounds;
    if (st) {
      agg.taggedHits += st.taggedHits; agg.weakTagHits += st.weakTagHits;
      agg.aTagged += st.aTagged; agg.aWeak += st.aWeak;
      for (const [k, v] of Object.entries(st.aTagCounts)) agg.aTagCounts[k] = (agg.aTagCounts[k] || 0) + v;
      for (const [k, v] of Object.entries(st.tagCounts)) agg.tagCounts[k] = (agg.tagCounts[k] || 0) + v;
      agg.precedentsFiled += st.precedentsFiled; agg.precedentsStruck += st.precedentsStruck;
      agg.precedentedHits += st.precedentedHits;
      agg.breaks += st.breaks; agg.locksSeen += st.locksSeen; agg.locksCleared += st.locksCleared;
      agg.fizzles += st.fizzles; agg.brokenTurns += st.brokenTurns; agg.supers += st.supers;
      agg.loopIns += st.loopIns; agg.oneMores += st.oneMores; agg.deferrals += st.deferrals;
      agg.actions += st.andrewActions;
    }
  }
  undo();
  const w = Math.max(1, agg.wins);
  // Tag concentration: share of tagged hits spent on the single most-used tag.
  const counts = Object.values(agg.aTagCounts);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const topShare = counts.length ? Math.max(...counts) / total : 0;
  const distinct = counts.filter(c => c / total >= 0.10).length;
  return {
    winRate: agg.wins / runs,
    avgRounds: agg.rounds / w,
    avgHpLeft: agg.hpLeft / w,
    avgActions: agg.actions / runs,
    taggedHits: agg.aTagged / runs,
    weakShare: agg.aTagged ? agg.aWeak / agg.aTagged : 0,
    allTagged: agg.taggedHits / runs,
    topTagShare: topShare,
    distinctTags: distinct,
    precFiled: agg.precedentsFiled / runs,
    precStruck: agg.precedentsStruck / runs,
    precHits: agg.precedentedHits / runs,
    breaks: agg.breaks / runs,
    lockClear: agg.locksSeen ? agg.locksCleared / agg.locksSeen : 0,
    fizzles: agg.fizzles / runs,
    brokenTurns: agg.brokenTurns / runs,
    supers: agg.supers / runs,
    loopIns: agg.loopIns / runs,
    oneMores: agg.oneMores / runs,
    deferrals: agg.deferrals / runs,
    effTurns: (agg.allRounds / runs) - (agg.fizzles / runs) - (agg.brokenTurns / runs),
    rawRounds: agg.allRounds / runs,
    timeouts: agg.timeouts,
    tagCounts: agg.aTagCounts,
    allTagCounts: agg.tagCounts,
  };
}

// ── LADDERS ──────────────────────────────────────────────────────────────
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

function parseArgs(argv) {
  const out = { flags: new Set(), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out.opts[key] = next; i++; }
      else out.flags.add(key);
    }
  }
  return out;
}

const H = (s, n) => String(s).padStart(n);

function tableRow(row, r) {
  return `${(row.id + ' ' + row.level).padEnd(24)}` +
    H(pct(r.winRate), 8) + H(n2(r.avgRounds), 8) + H(pct(r.avgHpLeft), 9) +
    H(n2(r.taggedHits), 8) + H(pct(r.weakShare), 9) + H(pct(r.topTagShare), 9) +
    H(r.distinctTags, 6) + H(n2(r.breaks), 8) + H(pct(r.lockClear), 9) +
    H(n2(r.effTurns), 8);
}
const TABLE_HEAD = 'encounter/lvl'.padEnd(24) + H('win', 8) + H('rounds', 8) + H('hp left', 9) +
  H('tagged', 8) + H('weak%', 9) + H('top tag%', 9) + H('tags', 6) + H('breaks', 8) +
  H('lockclr', 9) + H('effturn', 8);

function runTable(label, variantKey, policy, runs, rows = LADDER) {
  console.log(`\n=== ${label} ===`);
  console.log(TABLE_HEAD);
  const out = {};
  for (const row of rows) {
    const r = batchJ(cfgFor(row), row.level, runs, variantKey, policy);
    out[`${row.id}@${row.level}`] = r;
    console.log(tableRow(row, r));
  }
  return out;
}

function deltaTable(label, baseKey, varKey, policy, runs, rows = LADDER, basePolicy = null) {
  console.log(`\n=== ${label} ===`);
  console.log('encounter/lvl'.padEnd(24) + H('win Δpp', 9) + H('rounds Δ', 10) + H('hp Δpp', 9) +
    H('weak% b→v', 14) + H('top% b→v', 13) + H('breaks Δ', 10) + H('effturn Δ', 10) + H('prec/f', 8));
  for (const row of rows) {
    const a = batchJ(cfgFor(row), row.level, runs, baseKey, basePolicy || policy);
    const b = batchJ(cfgFor(row), row.level, runs, varKey, policy);
    console.log(`${(row.id + ' ' + row.level).padEnd(24)}` +
      H(((b.winRate - a.winRate) * 100).toFixed(1), 9) +
      H((b.avgRounds - a.avgRounds).toFixed(2), 10) +
      H(((b.avgHpLeft - a.avgHpLeft) * 100).toFixed(1), 9) +
      H(`${(a.weakShare * 100).toFixed(0)}→${(b.weakShare * 100).toFixed(0)}`, 14) +
      H(`${(a.topTagShare * 100).toFixed(0)}→${(b.topTagShare * 100).toFixed(0)}`, 13) +
      H((b.breaks - a.breaks).toFixed(2), 10) +
      H((b.effTurns - a.effTurns).toFixed(2), 10) +
      H(b.precFiled.toFixed(2), 8));
  }
}

// PIP ladder (casual floor)
const PIP_LADDER = [
  { id: 'karen', level: 3 }, { id: 'karen', level: 4 },
  { id: 'chad', level: 5 }, { id: 'chad', level: 6 },
  { id: 'grandma', level: 7 }, { id: 'grandma', level: 8 },
  { id: 'restructuring_trio', level: 8, party: ['janet'] },
  { id: 'rachel_boss', level: 9 },
  { id: 'regional_director', level: 10, party: ['janet', 'isaiah'] },
  { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
];
const pipResistFor = (d) => Math.min(0.80, 0.20 + 0.02 * Math.max(0, d));

function runPip(runs, keys) {
  console.log(`\n=== PIP / CASUAL FLOOR — CASUAL policy, ${runs} runs/cell ===`);
  console.log('The design is unreachable for a policy that never lands a tagged hit.');
  const deaths = [0, 5, 10];
  console.log('encounter/lvl'.padEnd(24) + keys.map(k =>
    ['off', ...deaths.map(d => `${d}d`)].map(h => H(`${k}:${h}`, 11)).join('')).join(''));
  for (const row of PIP_LADDER) {
    let line = (row.id + ' ' + row.level).padEnd(24);
    for (const k of keys) {
      for (const [i, d] of [null, ...deaths].entries()) {
        const c = { ...cfgFor(row), pipResist: i === 0 ? 0 : pipResistFor(d) };
        line += H(pct(batchJ(c, row.level, runs, k, 'casual').winRate), 11);
      }
    }
    console.log(line);
  }
}

// ── MAIN ─────────────────────────────────────────────────────────────────
const args = parseArgs(process.argv.slice(2));
const RUNS = parseInt(args.opts.runs || '300', 10);
const KEYS = (args.opts.keys || '').split(',').filter(Boolean);

if (args.flags.has('baseline')) {
  runTable(`BASELINE (Run C shipped) — COMPETENT policy, ${RUNS} runs`, 'off', 'competent', RUNS);
  console.log('\n-- tag census on the baseline (which tags does the shipped policy actually press?) --');
  for (const row of LADDER) {
    const r = batchJ(cfgFor(row), row.level, RUNS, 'off', 'competent');
    const tot = Object.values(r.tagCounts).reduce((a, b) => a + b, 0) || 1;
    const mix = Object.entries(r.tagCounts).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${(v / tot * 100).toFixed(0)}%`).join('  ');
    console.log(`${(row.id + ' ' + row.level).padEnd(24)} ${mix}`);
  }
}

if (args.flags.has('record')) {
  const keys = KEYS.length ? KEYS : ['R2', 'R3', 'R4', 'R3n', 'R3c'];
  for (const k of keys) {
    runTable(`RECORD ${k} — UNAWARE (shipped COMPETENT) policy, ${RUNS} runs — the monotony tax`, k, 'competent', RUNS);
  }
}

if (args.flags.has('adaptive')) {
  const keys = KEYS.length ? KEYS : ['R3', 'R3b'];
  for (const k of keys) {
    runTable(`RECORD ${k} — ADAPTIVE (record-aware) policy, ${RUNS} runs`, k, 'adaptive', RUNS);
  }
}

if (args.flags.has('deadphase')) {
  console.log('\n=== DEAD PHASES — hpThreshold:0 never activates (hpPct <= 0 only at death) ===');
  for (const [id, thr] of Object.entries(PHASE_FIX)) {
    const ph = ENEMY_STATS[id].phases;
    console.log(`${id.padEnd(20)} thresholds ${ph.map(p => p.hpThreshold).join(', ')}  → proposed ${thr} for the last row`);
    console.log(`${''.padEnd(20)} unreachable kit: ${ph[ph.length - 1].abilities.join(', ')}`);
  }
  deltaTable(`DEAD-PHASE FIX (F) vs shipped — COMPETENT, ${RUNS} runs`, 'off', 'F', 'competent', RUNS,
    LADDER.filter(r => ['rachel_boss', 'regional_director', 'algorithm'].includes(r.id)));
}

if (args.flags.has('pivot')) {
  const keys = KEYS.length ? KEYS : ['P'];
  for (const k of keys) {
    deltaTable(`PIVOT ${k} vs shipped — SPAM policy (never re-reads the label), ${RUNS} runs`, 'off', k, 'spam', RUNS, LADDER, 'competent');
    deltaTable(`PIVOT ${k} vs shipped — ADAPTIVE policy (reads the label), ${RUNS} runs`, 'off', k, 'adaptive', RUNS, LADDER, 'competent');
    runTable(`PIVOT ${k} — ADAPTIVE, absolute, ${RUNS} runs`, k, 'adaptive', RUNS);
  }
}

if (args.flags.has('combined')) {
  const keys = KEYS.length ? KEYS : ['RPA'];
  for (const k of keys) {
    deltaTable(`${k} vs shipped — SPAM policy (the monotony tax), ${RUNS} runs`, 'off', k, 'spam', RUNS, LADDER, 'competent');
    deltaTable(`${k} vs shipped — ADAPTIVE policy (the answer), ${RUNS} runs`, 'off', k, 'adaptive', RUNS, LADDER, 'competent');
    runTable(`${k} — ADAPTIVE, absolute numbers, ${RUNS} runs`, k, 'adaptive', RUNS);
  }
}

if (args.flags.has('pip')) {
  runPip(RUNS, KEYS.length ? KEYS : ['off', 'RPA']);
}

if (args.flags.has('feint')) {
  deltaTable(`FEINT (FE) vs shipped — COMPETENT, ${RUNS} runs`, 'off', 'FE', 'competent', RUNS);
}

if (args.flags.has('onemore')) {
  console.log(`\n=== FRESH-TAG ONE MORE on top of ${KEYS[0] || 'RPA'} — ADAPTIVE, ${RUNS} runs ===`);
  console.log(TABLE_HEAD + H('1mores', 8));
  const k = KEYS[0] || 'RPA';
  for (const row of LADDER) {
    const r = batchJ(cfgFor(row), row.level, RUNS, k, 'adaptive', { oneMore: true });
    console.log(tableRow(row, r) + H(n2(r.oneMores), 8));
  }
}

if (args.flags.has('builds')) {
  const key = KEYS[0] || 'RP';
  const builds = ['litigator', 'rainmaker', 'auditor', 'generalist', 'lit+aud', 'rain+aud'];
  for (const [label, variantKey] of [['SHIPPED', 'off'], [`PROPOSED (${key})`, key]]) {
    console.log(`\n=== BUILD MATRIX — ${label}, record-aware play, ${RUNS} runs/cell ===`);
    console.log('win% / rounds / hp-left, by practice-area build');
    console.log('encounter/lvl'.padEnd(22) + builds.map(b => H(b, 20)).join(''));
    for (const row of LADDER) {
      let line = (row.id + ' ' + row.level).padEnd(22);
      for (const b of builds) {
        const r = batchJ(cfgFor(row), row.level, RUNS, variantKey, `build:${b}`, { aware: true });
        line += H(`${(r.winRate * 100).toFixed(0)}/${r.avgRounds.toFixed(1)}/${(r.avgHpLeft * 100).toFixed(0)}`, 20);
      }
      console.log(line);
    }
  }
}

if (args.flags.has('mono')) {
  const key = KEYS[0] || 'RP';
  console.log(`\n=== MONOTONY TAX — MONO policy (presses the weakness ability, nothing else), ${RUNS} runs ===`);
  console.log('encounter/lvl'.padEnd(22) + H('shipped win', 13) + H('rnd', 7) + H('hp', 7) +
    H(`${key} win`, 12) + H('rnd', 7) + H('hp', 7) + H('Δwin pp', 9) + H('prec/f', 8));
  for (const row of LADDER) {
    const a = batchJ(cfgFor(row), row.level, RUNS, 'off', 'mono');
    const b = batchJ(cfgFor(row), row.level, RUNS, key, 'mono');
    console.log((row.id + ' ' + row.level).padEnd(22) +
      H(pct(a.winRate), 13) + H(n2(a.avgRounds), 7) + H(pct(a.avgHpLeft), 7) +
      H(pct(b.winRate), 12) + H(n2(b.avgRounds), 7) + H(pct(b.avgHpLeft), 7) +
      H(((b.winRate - a.winRate) * 100).toFixed(1), 9) + H(n2(b.precFiled), 8));
  }
}


if (args.flags.has('ng')) {
  // Mirrors tools/ng-sim.mjs: FRESH = the level's honest kit; CARRIED = what
  // MenuState._startNewGamePlus actually hands back (every ability + maxed
  // shop stats). The ladder is correct when CARRIED@NG+1 is not easier than
  // FRESH@NG.
  const ALL = new Set(Object.keys(PLAYER_ABILITIES));
  const MAXED = { atk: 9, def: 9, maxHP: 60, spd: 6 };
  const rows = [
    { id: 'karen', level: 4 }, { id: 'chad', level: 6 }, { id: 'grandma', level: 8 },
    { id: 'rachel_boss', level: 9 },
    { id: 'algorithm', level: 10, party: ['janet', 'isaiah'] },
  ];
  const mk = (row, carried, laps) => {
    const cfg = cfgFor(row);
    if (carried) {
      cfg.unlocked = new Set(ALL);
      cfg.atkBonus = MAXED.atk; cfg.defBonus = MAXED.def;
      const base = buildPlayerStats(row.level);
      cfg.playerExtra = { maxHP: base.maxHP + MAXED.maxHP, hp: base.maxHP + MAXED.maxHP, spd: base.spd + MAXED.spd };
    } else cfg.unlocked = unlockedAbilities(row.level);
    if (laps > 0) { cfg.ngPlus = true; cfg.ngPlusCount = laps; }
    return cfg;
  };
  const key = KEYS[0] || 'RP';
  console.log(`
=== NG+ LADDER — shipped vs ${key}, ADAPTIVE, ${RUNS} runs/cell ===`);
  console.log('encounter/lvl'.padEnd(20) + H('FRESH@NG', 18) + H('CARRY@NG+1', 18) + H('CARRY@NG+2', 18) + H('CARRY@NG+3', 18));
  for (const row of rows) {
    for (const [label, vk, pol] of [['shipped', 'off', 'competent'], [key, key, 'adaptive']]) {
      let line = (row.id + ' ' + row.level + ' ' + label).padEnd(20);
      const cells = [[false, 0], [true, 1], [true, 2], [true, 3]];
      for (const [carried, laps] of cells) {
        const r = batchJ(mk(row, carried, laps), row.level, RUNS, vk, pol);
        line += H(`${(r.winRate * 100).toFixed(1)}% / ${r.avgRounds.toFixed(2)}`, 18);
      }
      console.log(line);
    }
  }
}

if (args.flags.has('day')) {
  // The roguelite / Reception exposure. `reception_client` has no phases (so it
  // cannot pivot) and is authored `record: false` (so it cannot file a
  // Precedent). This measures that the design is INERT there, rather than
  // asserting it.
  const key = KEYS[0] || 'RP';
  const TIERS = [
    { label: 'tier 0 (walk-in)', hp: 120, atk: 10, def: 8 },
    { label: 'tier 2', hp: 420, atk: 16, def: 12 },
    { label: 'tier 4 (whale)', hp: 740, atk: 22, def: 16 },
  ];
  console.log(`
=== RECEPTION / ROGUELITE — is the design inert on short fights? ${RUNS} runs/cell ===`);
  console.log('client'.padEnd(20) + H('lvl', 5) + H('shipped win', 14) + H('rnd', 7) + H('hp', 8) +
    H(`${key} win`, 13) + H('rnd', 7) + H('hp', 8) + H('prec/f', 8));
  const save = { ...ENEMY_STATS.reception_client };
  for (const t of TIERS) {
    for (const lv of [4, 8]) {
      Object.assign(ENEMY_STATS.reception_client, { maxHP: t.hp, hp: t.hp, atk: t.atk, def: t.def });
      const cfg = { primary: 'reception_client', enemyIds: ['reception_client'], party: [], partyOverrides: {} };
      const a = batchJ(cfg, lv, RUNS, 'off', 'competent');
      const b = batchJ(cfg, lv, RUNS, key, 'adaptive');
      console.log(t.label.padEnd(20) + H(lv, 5) + H(pct(a.winRate), 14) + H(n2(a.avgRounds), 7) + H(pct(a.avgHpLeft), 8) +
        H(pct(b.winRate), 13) + H(n2(b.avgRounds), 7) + H(pct(b.avgHpLeft), 8) + H(n2(b.precFiled), 8));
    }
  }
  Object.assign(ENEMY_STATS.reception_client, save);
}

if (args.flags.has('archetype')) {
  console.log(`
=== ARCHETYPE LOCKS — measured and REJECTED, ${RUNS} runs ===`);
  console.log('Authored 2-tag lock rows collapse the clear rate (one tagged hit per turn)');
  console.log('and, where the authored tag IS the weakness, they RAISE monotony.');
  console.log('encounter/lvl'.padEnd(22) + H('lockclr off', 13) + H('lockclr A', 12) +
    H('top% off', 11) + H('top% A', 10) + H('win off', 10) + H('win A', 9));
  for (const row of LADDER) {
    const a = batchJ(cfgFor(row), row.level, RUNS, 'off', 'competent');
    const b = batchJ(cfgFor(row), row.level, RUNS, 'A', 'competent');
    console.log((row.id + ' ' + row.level).padEnd(22) + H(pct(a.lockClear), 13) + H(pct(b.lockClear), 12) +
      H(pct(a.topTagShare), 11) + H(pct(b.topTagShare), 10) + H(pct(a.winRate), 10) + H(pct(b.winRate), 9));
  }
}


if (args.flags.has('lanes')) {
  const key = KEYS[0] || 'RP';
  const lanes = [['objector', 'competent'], ['breaker', 'breaker'], ['closer', 'closer'],
    ['guardian', 'guardian'], ['adaptive', 'adaptive']];
  for (const [label, vk] of [['SHIPPED', 'off'], [`PROPOSED (${key})`, key]]) {
    console.log(`
=== LANE MATRIX — ${label}, ${RUNS} runs/cell (win% / rounds / hp-left) ===`);
    console.log('encounter/lvl'.padEnd(22) + lanes.map(l => H(l[0], 19)).join(''));
    for (const row of LADDER) {
      let line = (row.id + ' ' + row.level).padEnd(22);
      for (const [, pol] of lanes) {
        const r = batchJ(cfgFor(row), row.level, RUNS, vk, pol);
        line += H(`${(r.winRate * 100).toFixed(0)}/${r.avgRounds.toFixed(1)}/${(r.avgHpLeft * 100).toFixed(0)}`, 19);
      }
      console.log(line);
    }
  }
}


if (args.flags.has('dial')) {
  // maxComposure is already authorable per enemy (ENEMY_STATS / balance.json
  // `enemies` block). This is the measurement that turns it into a LANE dial.
  const rows = [{ id: 'grandma', level: 8 }, { id: 'rachel_boss', level: 9 }, { id: 'karen', level: 4 }];
  const lanes = [['objector', 'competent'], ['breaker', 'breaker'], ['closer', 'closer']];
  console.log(`
=== COMPOSURE DIAL — maxComposure sweep, lane win%/rounds/hp, shipped rules, ${RUNS} runs ===`);
  console.log('encounter'.padEnd(18) + H('comp', 6) + lanes.map(l => H(l[0], 16)).join(''));
  for (const row of rows) {
    const save = ENEMY_STATS[row.id].maxComposure;
    for (const comp of [60, 90, 120, 180, 240]) {
      ENEMY_STATS[row.id].maxComposure = comp;
      let line = (row.id + ' ' + row.level).padEnd(18) + H(comp, 6);
      for (const [, pol] of lanes) {
        const r = batchJ(cfgFor(row), row.level, RUNS, 'off', pol);
        line += H(`${(r.winRate * 100).toFixed(0)}/${r.avgRounds.toFixed(1)}/${(r.avgHpLeft * 100).toFixed(0)}`, 16);
      }
      console.log(line);
    }
    if (save === undefined) delete ENEMY_STATS[row.id].maxComposure; else ENEMY_STATS[row.id].maxComposure = save;
  }
}

if (args.flags.has('reactive')) {
  console.log(`
=== REACTIVE PIVOT (PR) vs SCRIPTED (P) — MONO policy, ${RUNS} runs ===`);
  console.log('encounter/lvl'.padEnd(22) + H('shipped', 10) + H('scripted P', 13) + H('reactive PR', 14));
  for (const row of LADDER) {
    const a = batchJ(cfgFor(row), row.level, RUNS, 'off', 'mono');
    const b = batchJ(cfgFor(row), row.level, RUNS, 'P', 'mono');
    const c = batchJ(cfgFor(row), row.level, RUNS, 'PR', 'mono');
    console.log((row.id + ' ' + row.level).padEnd(22) + H(pct(a.winRate), 10) + H(pct(b.winRate), 13) + H(pct(c.winRate), 14));
  }
}

if (args.flags.size === 0) {
  console.log('pick a mode: --baseline --record --adaptive --pivot --deadphase --combined --pip --day --ng --lanes --builds --mono --archetype --dial --reactive --feint --onemore');
}
