// _l-balance.mjs — THE BALANCE LANE. "Way too easy" (producer, 2026-08-05),
// turned into numbers and then into a priced proposal.
//
// It measures the SHIPPED engine and the SHIPPED trees. It imports the lane
// policies and the tree derivation from `tools/_j-verify.mjs` rather than
// re-typing them, so a change to what the Abilities tab renders moves this
// harness too. Nothing under `src/` is modified at rest: every candidate is
// applied to the live data objects inside a `withCandidate()` scope that
// records each write and restores it, which is exactly what a `balance.json`
// row does at module load (see the override block at the bottom of stats.js).
//
//   node tools/_l-balance.mjs --diag    --runs 400   # WHERE does the difficulty leak?
//   node tools/_l-balance.mjs --ladder  --runs 600   # baseline + every candidate, competent
//   node tools/_l-balance.mjs --pip     --runs 800   # the 21-cell casual floor, per candidate
//   node tools/_l-balance.mjs --lanes   --runs 600   # the J diversity band under a candidate
//   node tools/_l-balance.mjs --day     --runs 400   # reception / roguelite loop
//   node tools/_l-balance.mjs --ng      --runs 400   # NG+ laps
//   node tools/_l-balance.mjs --cand X,Y             # restrict to named candidates
import {
  runFight, enc, casualTurn, buildPlayerStats,
} from './combat-sim.mjs';
import {
  POLICIES, buildUnlocked, instrument, PARTY, LADDER, initEnemyAbilities,
} from './_j-verify.mjs';
import { COMBAT_DEPTH } from '../src/combat/CombatEngine.js';
import { ENEMY_AI_PATTERNS } from '../src/combat/EnemyAI.js';
import {
  ENEMY_STATS, ENEMY_ABILITIES, PLAYER_BASE_STATS, PLAYER_ABILITIES, ITEMS,
} from '../src/data/stats.js';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};
const has = (k) => process.argv.includes(`--${k}`);
const RUNS = Number(arg('runs', 400));
const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);
const pad = (s, n) => String(s).padStart(n);

// ── THE CANDIDATE SCOPE ─────────────────────────────────────────────────
// A candidate is a list of writes against the live data objects. Every write
// goes through `set()`, which records the previous value so `withCandidate`
// can put it back — a candidate that forgets to restore contaminates every
// later cell, which is the failure the J-run published on itself (§8, the
// TUNE.MSJ_MODE contamination).
function makeCtx() {
  const undo = [];
  const set = (obj, key, val) => {
    undo.push([obj, key, Object.prototype.hasOwnProperty.call(obj, key), obj[key]]);
    obj[key] = val;
  };
  return {
    undo, set,
    depth: (k, v) => set(COMBAT_DEPTH, k, v),
    player: (k, v) => set(PLAYER_BASE_STATS, k, v),
    enemy: (id, k, v) => { if (ENEMY_STATS[id]) set(ENEMY_STATS[id], k, v); },
    eab: (id, k, v) => { if (ENEMY_ABILITIES[id]) set(ENEMY_ABILITIES[id], k, v); },
    item: (id, k, v) => { if (ITEMS[id]) set(ITEMS[id], k, v); },
    pab: (id, k, v) => { if (PLAYER_ABILITIES[id]) set(PLAYER_ABILITIES[id], k, v); },
    ai: (id, k, v) => { if (ENEMY_AI_PATTERNS[id]) set(ENEMY_AI_PATTERNS[id], k, v); },
  };
}
function withCandidate(cand, fn) {
  const ctx = makeCtx();
  if (cand.apply) cand.apply(ctx);
  try { return fn(); } finally {
    for (let i = ctx.undo.length - 1; i >= 0; i--) {
      const [obj, key, had, val] = ctx.undo[i];
      if (had) obj[key] = val; else delete obj[key];
    }
    // `_lockable` is memoised per enemy INSTANCE, not per stats row, so it
    // cannot leak across fights — but the phase-trait resolver writes live
    // weakness onto the instance too. Both die with the engine.
  }
}

// ── EXTENDED INSTRUMENT ─────────────────────────────────────────────────
// j-verify's `instrument` counts the player's side. The balance question is
// the ENEMY's side: how many turns does it get, how many are taken from it,
// and what is a turn worth when it lands. Everything here is a counter.
function instrumentEnemy(engine, st) {
  const realET = engine.enemyTurn.bind(engine);
  engine.enemyTurn = (i) => {
    const e = engine.enemies[i];
    if (!e || e.hp <= 0) return realET(i);
    const before = engine.player.hp;
    st.eTurns++;
    if (e.sealed) st.sealedTurns++;
    const r = realET(i);
    const drop = Math.max(0, before - engine.player.hp);
    st.dmgTaken += drop;
    st.dmgOnEnemyTurn += drop;
    const t = r && r.type;
    if (t === 'fizzle') st.fizzles2++;
    else if (t === 'broken') st.broken2++;
    else if (drop > 0) { st.landedHits++; st.landedDamage += drop; }
    else st.noDamageTurns++;
    return r;
  };
  // DoT ticks and any other turn-start bleed land on the player's own
  // processTurnStart, not on an enemy turn. They are still enemy damage.
  const realPTS = engine.processTurnStart.bind(engine);
  engine.processTurnStart = (who) => {
    const isPlayer = who === engine.player;
    const before = isPlayer ? engine.player.hp : 0;
    const r = realPTS(who);
    if (isPlayer) st.dmgTaken += Math.max(0, before - engine.player.hp);
    return r;
  };
  // Counter / thorns damage fires inside the player's own action.
  for (const m of ['playerAttack', 'playerAbility', 'playerPowerMove', 'playerRetaliate',
    'playerDesperateGamble', 'playerPressAdvantage']) {
    if (typeof engine[m] !== 'function') continue;
    const real = engine[m].bind(engine);
    engine[m] = (...a) => {
      const before = engine.player.hp;
      const r = real(...a);
      st.dmgTaken += Math.max(0, before - engine.player.hp);
      return r;
    };
  }
  const realPA = engine.playerPressAdvantage.bind(engine);
  engine.playerPressAdvantage = (...a) => { const r = realPA(...a); if (r) st.paUses++; return r; };
  // LOW WATER. Win rate is a coin-flip statistic and it saturates at 100% long
  // before a fight stops being frightening. The number that tracks "did this
  // get close" is the lowest fraction of maxHP Andrew ever stood at. Sampled
  // after every enemy turn and every player action, which is every frame that
  // can move it.
  const sample = () => {
    const f = engine.player.hp / Math.max(1, engine.player.maxHP);
    if (f < st.lowWater) st.lowWater = f;
  };
  for (const m of ['enemyTurn', 'processTurnStart', 'playerAttack', 'playerAbility',
    'playerPowerMove', 'playerRetaliate', 'playerDesperateGamble', 'playerPressAdvantage',
    'playerBrace', 'playerItem', 'playerSecondWind']) {
    if (typeof engine[m] !== 'function') continue;
    const real = engine[m].bind(engine);
    engine[m] = (...a) => { const r = real(...a); sample(); return r; };
  }
}

const ZERO = () => ({
  actions: 0, supers: 0, breaks: 0, braces: 0, perfect: 0, compW: 0, compOTH: 0,
  fizzles: 0, brokenTurns: 0, ucProcs: 0, msjProcs: 0, tags: {}, tagTotal: 0,
  eTurns: 0, sealedTurns: 0, fizzles2: 0, broken2: 0, landedHits: 0, landedDamage: 0,
  noDamageTurns: 0, dmgTaken: 0, dmgOnEnemyTurn: 0, enemyHealTurns: 0,
  paUses: 0, lowWater: 1,
});

function cellFor(encId, level, treeId, runs, opts = {}) {
  const cfg = enc(encId);
  if (PARTY[encId] && cfg.party.length === 0) cfg.party = [...PARTY[encId]];
  const unlocked = opts.unlocked || buildUnlocked(treeId, level);
  const agg = ZERO();
  agg.lowWater = 0;
  let wins = 0, rounds = 0, hpLeft = 0, deaths = 0, nearDeath = 0, items = 0;
  for (let i = 0; i < runs; i++) {
    const st = ZERO();
    const sim = {};
    const policy = opts.policy || ((e, s, u) => { POLICIES[treeId](e, s, u); });
    const r = runFight(
      { ...cfg, unlocked, pipResist: opts.pipResist || 0, coffees: opts.coffees },
      level,
      { policy, onEngine: (e) => { instrument(e, st); instrumentEnemy(e, st); } },
    );
    if (r.win) { wins++; hpLeft += r.hpPct; } else deaths++;
    rounds += r.rounds;
    items += r.itemsUsed;
    // A defeat is the deepest low-water there is. Counting survivors only
    // would make a candidate look SAFER the more often it killed the player.
    const lw = r.win ? st.lowWater : 0;
    if (lw <= 0.25) nearDeath++;
    for (const k of Object.keys(agg)) if (k !== 'tags' && k !== 'lowWater') agg[k] += st[k];
    agg.lowWater += lw;
    for (const [t, n] of Object.entries(st.tags)) agg.tags[t] = (agg.tags[t] || 0) + n;
    void sim;
  }
  const topTag = agg.tagTotal > 0 ? Math.max(...Object.values(agg.tags)) / agg.tagTotal : 0;
  const denied = agg.fizzles2 + agg.broken2;
  return {
    runs, win: wins / runs, deaths,
    rounds: rounds / runs,
    hpLeft: wins ? hpLeft / wins : 0,
    // The producer-facing number: what is one of the boss's turns worth?
    // Denominator is turn ATTEMPTS, so a denied turn correctly counts as a
    // zero — that is the point of the currency-is-turns finding.
    dmgPerTurn: agg.eTurns ? agg.dmgTaken / agg.eTurns : 0,
    dmgPerLanded: agg.landedHits ? agg.landedDamage / agg.landedHits : 0,
    denial: agg.eTurns ? denied / agg.eTurns : 0,
    quiet: agg.eTurns ? agg.noDamageTurns / agg.eTurns : 0,
    sealed: agg.eTurns ? agg.sealedTurns / agg.eTurns : 0,
    eTurns: agg.eTurns / runs,
    breaks: agg.breaks / runs, braces: agg.braces / runs,
    supers: agg.supers / runs, topTag,
    compOTH: agg.compOTH / runs,
    lowWater: agg.lowWater / runs,
    nearDeath: nearDeath / runs,
    paUses: agg.paUses / runs,
    items: items / runs,
  };
}

// ── THE CANDIDATES ──────────────────────────────────────────────────────
// Ordered cheapest-first, exactly as the brief asks. Every one of them is a
// DATA write except where the comment says otherwise.
//
// The five story-boss attack rows, with their shipped powers. Grouped so a
// candidate can move "every boss haymaker" without naming 20 ids inline.
const BOSS_ATTACKS = {
  karen: ['father_wanted', 'live_tweet_rampage', 'speak_to_manager'],
  chad: ['bro_down', 'trust_fund_tantrum', 'rage_quit_attack'],
  grandma: ['guilt_trip', 'gerald_incident', 'passive_aggression'],
  meredith_boss: ['strategic_pivot', 'hostile_takeover', 'final_assessment', 'restructure_threat'],
  regional_director: ['corporate_mandate', 'synergy_blast', 'market_correction', 'quarterly_target'],
  algorithm: ['data_harvest', 'algorithmic_trading', 'total_optimization', 'system_overload'],
  chief_of_restructuring: ['chief_strategic_pivot'],
  corporate_lawyer: ['billable_assault'],
  restructuring_analyst: ['downsize', 'efficiency_report'],
  brand_consultant: ['rebrand', 'focus_group'],
  data_analytics_lead: ['dashboard_overload', 'pivot_table'],
};
function scaleBossPower(ctx, mult, only = null) {
  for (const [boss, ids] of Object.entries(BOSS_ATTACKS)) {
    if (only && !only.includes(boss)) continue;
    for (const id of ids) {
      const a = ENEMY_ABILITIES[id];
      if (!a || typeof a.power !== 'number' || a.power <= 0) continue;
      ctx.eab(id, 'power', Math.round(a.power * mult));
    }
  }
}

export const CANDIDATES = {
  base: { label: 'BASELINE (shipped)', apply: null },
  // THE NULL ARM. Byte-identical to `base`, measured as if it were a
  // candidate. Its delta column is the instrument's own resolution, and
  // nothing smaller than it is a finding. This exists because the first PIP
  // pass judged candidates against a <=2pp rule while two 500-run
  // measurements of the SAME shipped config disagreed by up to 4.0pp
  // (karen@3 / PIP 0%: 13.0% then 17.0%). A gate finer than its own null is
  // not a gate; it is a random number generator with an opinion.
  null2: { label: 'NULL ARM (identical to baseline — this is the noise floor)', apply: null },

  // ── A: the enemy hits harder ──────────────────────────────────────────
  A1: {
    label: 'A1  boss ability power x1.20',
    note: 'balance.json enemyAbilities block. The brief\'s "cheapest lever".',
    apply: (c) => scaleBossPower(c, 1.20),
  },
  A2: {
    label: 'A2  boss ability power x1.35',
    apply: (c) => scaleBossPower(c, 1.35),
  },
  A3: {
    label: 'A3  boss ATK +25%',
    note: 'balance.json enemies block.',
    apply: (c) => {
      for (const id of Object.keys(BOSS_ATTACKS)) {
        const e = ENEMY_STATS[id];
        if (e) c.enemy(id, 'atk', Math.round(e.atk * 1.25));
      }
    },
  },

  // ── B: the enemy gets more turns (denial pricing) ─────────────────────
  // CASUAL never lands a tagged hit, never Braces, never Breaks and therefore
  // never denies a single turn. Everything in this block is INVISIBLE to the
  // floor by construction, which is the property the whole proposal turns on.
  B1: {
    label: 'B1  partial lock relief 0.30 -> 0.18',
    note: 'COMBAT_DEPTH constant. A half-answered objection buys less.',
    apply: (c) => c.depth('LOCK_PARTIAL_REDUCTION', 0.18),
  },
  B2: {
    label: 'B2  two locks on the haymakers (p>=34 -> p>=26)',
    note: 'balance.json enemyAbilities lockCount. Solo Andrew gets one tagged hit a turn.',
    apply: (c) => {
      for (const ids of Object.values(BOSS_ATTACKS)) {
        for (const id of ids) {
          const a = ENEMY_ABILITIES[id];
          if (!a || typeof a.power !== 'number') continue;
          if (a.power >= 26 && a.power < 34) c.eab(id, 'lockCount', 2);
        }
      }
    },
  },
  B3: {
    label: 'B3  DENIAL_LIMIT 2 -> 1',
    note: 'COMBAT_DEPTH constant. Known risk: a seal also freezes Composure.',
    apply: (c) => c.depth('DENIAL_LIMIT', 1),
  },

  // ── C: the player has less slack ──────────────────────────────────────
  C1: {
    label: 'C1  starting Coffee 75 -> 60 (B24)',
    note: 'balance.json player block. Already simmed: casual +0.15pp.',
    apply: (c) => c.player('maxMP', 60),
  },
  C2: {
    label: 'C2  coffee_break heal 40 -> 30',
    note: 'balance.json abilities block. The free starter heal.',
    apply: (c) => c.pab('coffee_break', 'healAmount', 30),
  },

  // ── D: the fight lasts longer, so the enemy gets more turns ───────────
  D1: {
    label: 'D1  story-boss maxHP x1.25',
    note: 'balance.json enemies block. H-run says this recovers almost nothing. Verify.',
    apply: (c) => {
      for (const id of ['karen', 'chad', 'grandma', 'meredith_boss', 'regional_director',
        'algorithm', 'chief_of_restructuring', 'corporate_lawyer']) {
        const e = ENEMY_STATS[id];
        if (e) c.enemy(id, 'maxHP', Math.round(e.maxHP * 1.25));
      }
    },
  },

  // ── E: the turns the enemy DOES get are spent on damage ───────────────
  // The diagnosis lever. `preferAttack` is the dial the `aggressive` pattern
  // has always had (Chad: 0.7, and Chad reads 5.6% quiet turns against
  // Grandma's 73.8%); E generalises it to the other four patterns. The engine
  // support is inert until a row is authored, so `base` above is bit-identical
  // to the shipped build.
  // E1 is kept, UNSHIPPABLE, because it is the measurement that produced E3.
  // It is what "raise the enemy's turn quality" looks like when it is NOT
  // gated on something the casual floor cannot do: 9.12 pp mean movement on
  // the 21-cell PIP table and -31.6 pp at grandma@8 / PIP 20%.
  E1: {
    label: 'E1  aggression floor, UNGATED preferAttack   [REJECTED — see --pip]',
    note: 'Kept as the control that shows why E3 is gated.',
    apply: (c) => {
      const rows = {
        karen: 0.45, grandma: 0.55, meredith_boss: 0.55, regional_director: 0.50,
        algorithm: 0.50, restructuring_analyst: 0.50, brand_consultant: 0.50,
        corporate_lawyer: 0.50, cfos_assistant: 0.50, compliance: 0.50, regional: 0.50,
        skip_boss: 0.45, hr_rep: 0.45, security_guard: 0.45,
      };
      for (const [id, v] of Object.entries(rows)) c.ai(id, 'preferAttack', v);
    },
  },
  E2: {
    label: 'E2  aggression floor, UNGATED, gentle (0.35)   [REJECTED — see --pip]',
    apply: (c) => {
      for (const id of ['karen', 'grandma', 'meredith_boss', 'regional_director', 'algorithm',
        'restructuring_analyst', 'brand_consultant', 'corporate_lawyer', 'cfos_assistant',
        'compliance', 'regional', 'skip_boss', 'hr_rep', 'security_guard']) {
        c.ai(id, 'preferAttack', 0.35);
      }
    },
  },
  // THE ESCALATION RESPONSE. Same dial, fired only on a pick the enemy makes
  // while it is owed a turn — after a fizzle, a Break, a stun, a block, or
  // while holding the Denial Tax seal. CASUAL denies 0.0% of turns, so this
  // is unreachable for the floor by construction rather than by tuning.
  // THE REJECTED VARIANT, kept because it is the measurement that justifies
  // the exemption in E3 below. `algorithm` is the ONE encounter where CASUAL
  // denies any enemy turn at all (6.1%, via Janet and Isaiah), so it is the one
  // row of the fifteen that the PIP floor can actually feel.
  E3all: {
    label: 'E3all  ESCALATION RESPONSE on every pattern incl. algorithm  [REJECTED]',
    apply: (c) => {
      for (const id of Object.keys(ENEMY_AI_PATTERNS)) {
        if (id === 'intern') continue;
        c.ai(id, 'escalateAfterDenial', 0.85);
      }
    },
  },
  E3: {
    label: 'E3  ESCALATION RESPONSE: escalateAfterDenial 0.85, algorithm EXEMPT',
    note: 'EnemyAI.js rows. Fires only on a turn the player took away.',
    // `intern` is excluded so this candidate is byte-for-byte what
    // `tools/_l-apply.mjs --on` writes. It is in no measured cell (it is the
    // scripted tutorial), so nothing in any table moves either way — but a
    // harness that measures a slightly different thing than the patch applies
    // is the whole reason `_j-verify.mjs` had to replace `_j-synth.mjs`.
    // TWO EXEMPTIONS.
    // `intern` — the scripted tutorial enemy, in no measured cell, and an
    //   escalation response on a character whose whole kit is 4-power jabs is
    //   noise in the diff.
    // `algorithm` — the ONLY encounter where the CASUAL policy denies an enemy
    //   turn (6.1%; every solo rung reads 0.0%), because that fight stages
    //   Janet and Isaiah and the ALLIES clear locks on the casual player's
    //   behalf. Leaving it in put `algorithm@10 / PIP 0%` at -6.0 pp against a
    //   null arm whose own worst cell is -2.8; taking it out puts the same cell
    //   at -1.6. It is also the one exemption the fiction already argues for:
    //   the Algorithm is exempt from THE PIVOT for the same reason (it already
    //   modelled you), and a thing that does not care what you say twice does
    //   not have feelings about being objected to either.
    apply: (c) => {
      for (const id of Object.keys(ENEMY_AI_PATTERNS)) {
        if (id === 'intern' || id === 'algorithm') continue;
        c.ai(id, 'escalateAfterDenial', 0.85);
      }
    },
  },
  // THE FALLBACK §8 offers if the producer says no to longer fights. It was
  // cited from the wrong file and the wrong candidate in the first draft, so
  // it is a first-class arm now and gets measured like one.
  P10: {
    label: 'P10  THE PROPOSAL WITHOUT F1  = E3 + B3 + C1',
    note: 'What cutting Press Advantage actually gives back, measured.',
    apply: (c) => {
      CANDIDATES.E3.apply(c);
      CANDIDATES.B3.apply(c);
      CANDIDATES.C1.apply(c);
    },
  },
  E4: {
    label: 'E4  ESCALATION RESPONSE at 1.00 (always, when owed)',
    apply: (c) => {
      for (const id of Object.keys(ENEMY_AI_PATTERNS)) {
        if (id === 'intern') continue;
        c.ai(id, 'escalateAfterDenial', 1.0);
      }
    },
  },

  // ── F: the player's action economy ────────────────────────────────────
  // Andrew takes ~2 actions a round (main action + the free Press Advantage +
  // the Objection-Sustained return) against a boss that lands well under one.
  // CASUAL never calls Press Advantage — combat-sim's casualTurn has no branch
  // for it — so this is a ceiling-only knob, and it is the only player-side
  // one in this set. It is NOT a tree node; the Litigation keystone
  // (`aggravating_factors`, -10 and floor 15) rides on top of it, so raising
  // the base makes that node worth MORE, not less.
  F1: {
    label: 'F1  Press Advantage base cost 40 -> 52',
    note: 'CombatEngine.getPressAdvantageCost. No data knob exists for it.',
    apply: (c) => c.depth('PRESS_ADVANTAGE_BASE', 52),
  },

  // ── THE PACKAGES ──────────────────────────────────────────────────────
  // P1/P2 are kept as the REJECTED first attempt (ungated E1). P5 onward is
  // the proposal. Publishing the rejected pair is the point: the 21-cell table
  // is the only reason the difference is known.
  P1: {
    label: 'P1  REJECTED: E1(ungated) + B3 + B2',
    apply: (c) => { CANDIDATES.E1.apply(c); CANDIDATES.B3.apply(c); CANDIDATES.B2.apply(c); },
  },
  P2: {
    label: 'P2  REJECTED: P1 + C1 + F1',
    apply: (c) => { CANDIDATES.P1.apply(c); CANDIDATES.C1.apply(c); CANDIDATES.F1.apply(c); },
  },
  P3: {
    label: 'P3  REJECTED: P2 + boss power x1.15',
    apply: (c) => { CANDIDATES.P2.apply(c); scaleBossPower(c, 1.15); },
  },
  P4: {
    label: 'P4  REJECTED: P2 + boss power x1.30 (the "70-85% win" attempt)',
    apply: (c) => { CANDIDATES.P2.apply(c); scaleBossPower(c, 1.30); },
  },

  // ── THE PROPOSAL ──────────────────────────────────────────────────────
  P5: {
    label: 'P5  THE DENIAL PACKAGE = E3 + B3 + B2',
    note: 'Every component is unreachable by a player who never denies a turn.',
    apply: (c) => { CANDIDATES.E3.apply(c); CANDIDATES.B3.apply(c); CANDIDATES.B2.apply(c); },
  },
  P6: {
    label: 'P6  THE PROPOSAL = P5 + F1 (Press Advantage 52) + C1 (Coffee 60)',
    note: 'F1 is ceiling-only. C1 is B24, already priced at +0.15pp on the floor.',
    apply: (c) => { CANDIDATES.P5.apply(c); CANDIDATES.F1.apply(c); CANDIDATES.C1.apply(c); },
  },
  P7: {
    label: 'P7  P6 + boss power x1.15  (the first component the FLOOR pays for)',
    apply: (c) => { CANDIDATES.P6.apply(c); scaleBossPower(c, 1.15); },
  },
  // P8 drops B2. Suspicion under test: a haymaker that demands TWO tags is
  // unclearable by a solo Andrew, so the policy stops spending tagged hits on
  // Objections and just presses the printed weakness — i.e. B2 buys turn count
  // by raising MONOTONY, which is the exact number the J-run's Pivot was built
  // to lower. Measured on P6: Grandma's top-tag went 47.9% -> 60.8%.
  // *** THE PROPOSAL *** — what `tools/_l-apply.mjs --on` writes.
  // B2 is OUT. It bought ~5pp of HP-left on Grandma and cost ~11pp of
  // MONOTONY there (top-tag 49.7% -> 60.8%), because a haymaker that demands
  // two tags is unclearable by a solo Andrew, so the policy stops spending
  // tagged hits on Objections and just presses the printed weakness. That is
  // the exact number the J-run's Pivot was built to lower, and it is not for
  // sale at this price.
  P8: {
    label: 'P8  *** THE PROPOSAL ***  = E3 + B3 + F1(52) + C1',
    note: 'Escalation Response + DENIAL_LIMIT 1 + Press Advantage 52 + Coffee 60.',
    apply: (c) => {
      CANDIDATES.E3.apply(c);
      CANDIDATES.B3.apply(c);
      CANDIDATES.F1.apply(c);
      CANDIDATES.C1.apply(c);
    },
  },
  // P9 is P8 with a gentler Press Advantage. F1 is the component that
  // lengthens fights, and a longer fight is exactly what the Audit lane's
  // Findings ramp is worst at — the diversity band's worst cell under P8 is
  // Audit on Meredith. 48 is the smallest step that is still a step.
  // The refutation arm: THE PROPOSAL plus the cheapest lever the brief asked
  // for first. It exists to price the brief's premise, not to be shipped.
  A15: {
    label: 'A15  THE PROPOSAL + boss ability power x1.15  [the brief\'s premise, priced]',
    apply: (c) => { CANDIDATES.P8.apply(c); scaleBossPower(c, 1.15); },
  },
  P9: {
    label: 'P9  P8 with a gentler Press Advantage (48)',
    apply: (c) => {
      CANDIDATES.E3.apply(c);
      CANDIDATES.B3.apply(c);
      c.depth('PRESS_ADVANTAGE_BASE', 48);
      CANDIDATES.C1.apply(c);
    },
  },
};

// ── REPORTERS ───────────────────────────────────────────────────────────
const STORY = [
  ['karen', 3], ['karen', 4], ['chad', 5], ['chad', 6], ['grandma', 7], ['grandma', 8],
  ['restructuring_trio', 7], ['restructuring_trio', 8], ['meredith_boss', 8], ['meredith_boss', 9],
  ['regional_director', 10], ['algorithm', 10],
];
// The 21 cells the PIP floor is defended on — 7 encounters x 3 resistances,
// the same grid the J-run published, so the two numbers are comparable.
const PIP_CELLS = [['karen', 3], ['karen', 4], ['grandma', 7], ['grandma', 8],
  ['meredith_boss', 9], ['regional_director', 10], ['algorithm', 10]];
const PIP_LEVELS = [0, 0.20, 0.30];

function selectedCandidates() {
  const only = arg('cand', null);
  if (!only) return Object.keys(CANDIDATES).filter(k => k !== 'null2');
  const want = only.split(',').map(s => s.trim());
  return ['base', ...want.filter(k => k !== 'base' && CANDIDATES[k])];
}

function runDiag() {
  console.log(`\n=== DIAGNOSIS — where does the difficulty leak? (${RUNS} runs/cell, shipped) ===`);
  console.log('One row per story rung, COMPETENT (shipped-kit) policy.');
  console.log('eTurns = enemy turn attempts.  denial = fizzled + Broken share of them.');
  console.log('quiet  = turns that landed but dealt zero damage (heal/buff/debuff/stun/confuse).');
  console.log('dmg/T  = player HP lost per enemy turn ATTEMPT.  dmg/hit = per turn that actually hurt.');
  console.log('');
  console.log('encounter              lvl    win  rounds  HP-left  eTurns  denial   quiet  sealed   dmg/T  dmg/hit   TTK');
  console.log('TTK = enemy turn ATTEMPTS needed to kill Andrew at that dmg/T, against the turns');
  console.log('      he actually grants. A boss that needs 46 and gets 5 was never in the fight.');
  for (const [e, lv] of STORY) {
    const r = cellFor(e, lv, 'shipped', RUNS);
    const maxHP = buildPlayerStats(lv).maxHP;
    const ttk = r.dmgPerTurn > 0 ? maxHP / r.dmgPerTurn : Infinity;
    console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ${pad(pct(r.win), 5)}  ${pad(n2(r.rounds), 6)}  `
      + `${pad(pct(r.hpLeft), 7)}  ${pad(n2(r.eTurns), 6)}  ${pad(pct(r.denial), 6)}  ${pad(pct(r.quiet), 6)}  `
      + `${pad(pct(r.sealed), 6)}  ${pad(n2(r.dmgPerTurn), 6)}  ${pad(n2(r.dmgPerLanded), 7)}  ${pad(ttk.toFixed(1), 5)}`);
  }

  // THE LOAD-BEARING CLAIM, checked rather than asserted: the denial pricing
  // block (candidates B*) is invisible to the casual floor only if CASUAL
  // never denies a turn. CASUAL lands no tagged hit and never Braces, so it
  // should clear no Objection and fill no Composure bar — but "should" is not
  // a measurement, and the whole proposal rests on this row being zero.
  console.log('\n--- CASUAL: does the floor ever deny an enemy turn? ---');
  console.log('encounter              lvl    win  eTurns  denial   breaks  braces   dmg/T');
  for (const [e, lv] of PIP_CELLS) {
    const r = cellFor(e, lv, 'shipped', RUNS, { policy: casualTurn });
    console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ${pad(pct(r.win), 5)}  ${pad(n2(r.eTurns), 6)}  `
      + `${pad(pct(r.denial), 6)}  ${pad(n2(r.breaks), 6)}  ${pad(n2(r.braces), 6)}  ${pad(n2(r.dmgPerTurn), 6)}`);
  }
}

function runLadder() {
  const keys = selectedCandidates();
  console.log(`\n=== THE LADDER, PER CANDIDATE (${RUNS} runs/cell, COMPETENT shipped kit) ===`);
  for (const k of keys) {
    const cand = CANDIDATES[k];
    console.log(`\n-- ${cand.label}${cand.note ? '   [' + cand.note + ']' : ''}`);
    console.log('encounter              lvl    win  rounds  HP-left  low-water  near-death  denial   dmg/T  breaks    PA');
    withCandidate(cand, () => {
      for (const [e, lv] of STORY) {
        const r = cellFor(e, lv, 'shipped', RUNS);
        console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ${pad(pct(r.win), 5)}  ${pad(n2(r.rounds), 6)}  `
          + `${pad(pct(r.hpLeft), 7)}  ${pad(pct(r.lowWater), 9)}  ${pad(pct(r.nearDeath), 10)}  `
          + `${pad(pct(r.denial), 6)}  ${pad(n2(r.dmgPerTurn), 6)}  ${pad(n2(r.breaks), 6)}  ${pad(n2(r.paUses), 4)}`);
      }
    });
  }
}

function runPip() {
  // The NULL ARM always runs, second, so every table carries its own
  // resolution line. A candidate is only OUT if it beats the null AND does it
  // directionally — 21 cells drifting one way is a finding, 21 cells drifting
  // both ways at the same magnitude is the sampler.
  const sel = selectedCandidates();
  const keys = ['base', 'null2', ...sel.filter(k => k !== 'base' && k !== 'null2')];
  console.log(`\n=== THE 21-CELL PIP FLOOR (${RUNS} runs/cell, CASUAL) ===`);
  console.log('CASUAL: basic attacks, the free starter heal, Assert Dominance when the bar');
  console.log('fills on its own. Never a tagged hit, never a Brace.');
  console.log('Judge every candidate against the NULL ARM, not against a round number.');
  let nullMean = null;
  const baseVals = {};
  for (const k of keys) {
    const cand = CANDIDATES[k];
    const vals = {};
    withCandidate(cand, () => {
      for (const [e, lv] of PIP_CELLS) {
        for (const pipv of PIP_LEVELS) {
          const r = cellFor(e, lv, 'shipped', RUNS, { policy: casualTurn, pipResist: pipv });
          vals[`${e}@${lv}|${pipv}`] = r.win;
        }
      }
    });
    if (k === 'base') Object.assign(baseVals, vals);
    const deltas = Object.keys(vals).map(kk => (vals[kk] - (baseVals[kk] ?? vals[kk])) * 100);
    const meanAbs = deltas.reduce((s, d) => s + Math.abs(d), 0) / deltas.length;
    const meanSigned = deltas.reduce((s, d) => s + d, 0) / deltas.length;
    const worst = deltas.reduce((w, d) => Math.abs(d) > Math.abs(w) ? d : w, 0);
    const down = deltas.filter(d => d < -0.05).length;
    const up = deltas.filter(d => d > 0.05).length;
    if (k === 'null2') nullMean = meanAbs;
    console.log(`\n-- ${CANDIDATES[k].label}`);
    console.log('encounter              lvl   PIP 0%   PIP 20%  PIP 30%' + (k === 'base' ? '' : '     (delta vs base)'));
    for (const [e, lv] of PIP_CELLS) {
      const cells = PIP_LEVELS.map(p => {
        const v = vals[`${e}@${lv}|${p}`];
        const b = baseVals[`${e}@${lv}|${p}`];
        const d = (v - b) * 100;
        return k === 'base' ? pad(pct(v), 8)
          : `${pad(pct(v), 8)}${pad((d >= 0 ? '+' : '') + d.toFixed(1), 6)}`;
      });
      console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ` + cells.join(' '));
    }
    if (k !== 'base') {
      // Direction is the signal; magnitude alone is mostly the sampler.
      const dirBias = Math.abs(down - up) / deltas.length;
      const verdict = k === 'null2' ? 'RESOLUTION'
        : (meanAbs <= (nullMean ?? 2) * 1.35 && dirBias < 0.45) ? 'PASS — inside the null'
          : (meanSigned < -1.5 && down >= 15) ? 'FAIL — the floor pays for this'
            : 'MARGINAL — re-run at higher n';
      console.log(`   mean |delta| ${meanAbs.toFixed(2)} pp   signed mean `
        + `${(meanSigned >= 0 ? '+' : '') + meanSigned.toFixed(2)} pp   worst cell `
        + `${(worst >= 0 ? '+' : '') + worst.toFixed(1)} pp   ${down} down / ${up} up`
        + (k === 'null2' ? '' : `   (null = ${(nullMean ?? 0).toFixed(2)} pp)`)
        + `   ${verdict}`);
    }
  }
}

function runLanes() {
  const keys = selectedCandidates();
  console.log(`\n=== THE DIVERSITY BAND, PER CANDIDATE (${RUNS} runs/cell) ===`);
  console.log("J's law is <= 8.0 pp between the three Practice Groups at every rung");
  console.log('(COMBAT-PLAYSTYLE-DOSSIER sections 2.5 / 5.5 / 10.5; the SHIPPED worst rung is 9.3 pp).');
  console.log('This table has no null arm and one 400-run draw of the SAME shipped config has');
  console.log('read a max band of 6.3 / 6.5 / 7.5 / 10.0 pp across four passes -- read a single');
  console.log('cell only when it moves further than that spread.');
  for (const k of keys) {
    const cand = CANDIDATES[k];
    console.log(`\n-- ${cand.label}`);
    console.log('encounter              lvl   win: lit / comp / audit          band   topTag(shipped)');
    let worst = 0;
    withCandidate(cand, () => {
      for (const [e, lv] of LADDER) {
        const r = ['litigation', 'compliance', 'audit'].map(t => cellFor(e, lv, t, RUNS));
        const wins = r.map(x => x.win);
        const band = (Math.max(...wins) - Math.min(...wins)) * 100;
        worst = Math.max(worst, band);
        const sh = cellFor(e, lv, 'shipped', RUNS);
        console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ` + r.map(x => pad(pct(x.win), 6)).join(' /')
          + `   ${pad(band.toFixed(1) + ' pp', 8)}   ${pad(sh.supers < 1.0 ? '(n/a)' : pct(sh.topTag), 7)}`);
      }
    });
    console.log(`   MAX BAND: ${worst.toFixed(1)} pp`);
  }
}

async function runDay() {
  const { generateDayClient } = await import('../src/data/ClientGenerator.js');
  const keys = selectedCandidates();
  console.log(`\n=== RECEPTION / ROGUELITE LOOP (${RUNS} runs/cell) ===`);
  console.log('The grind that funds the level-ups. A candidate that breaks this breaks pacing.');
  console.log('cand   lvl  slot  policy       win     rounds   HP-left');
  for (const k of keys) {
    withCandidate(CANDIDATES[k], () => {
      for (const lv of [4, 8]) {
        for (const slot of [0, 3]) {
          for (const [name, pol] of [['competent', null], ['casual', casualTurn]]) {
            let wins = 0, rounds = 0, hp = 0;
            for (let i = 0; i < RUNS; i++) {
              const client = generateDayClient({ index: slot, total: 4, playerLevel: lv, partySize: 0 });
              Object.assign(ENEMY_STATS.reception_client, { ...client.enemyStats });
              const r = runFight(
                { primary: 'reception_client', enemyIds: ['reception_client'], party: [], unlocked: buildUnlocked('shipped', lv) },
                lv,
                { policy: pol || POLICIES.shipped },
              );
              if (r.win) { wins++; hp += r.hpPct; }
              rounds += r.rounds;
            }
            console.log(`${k.padEnd(6)} ${pad(lv, 3)}  ${pad(slot, 4)}  ${name.padEnd(11)} `
              + `${pad(pct(wins / RUNS), 6)}  ${pad(n2(rounds / RUNS), 7)}  ${pad(pct(wins ? hp / wins : 0), 7)}`);
          }
        }
      }
    });
  }
}

function runNg() {
  const keys = selectedCandidates();
  console.log(`\n=== NEW GAME+ LAPS — FRESH ARM ONLY (${RUNS} runs/cell, COMPETENT) ===`);
  console.log('NOT the authority. This runs the LEVEL-CURVE kit on an NG+ lap, which is a');
  console.log('player the game never produces: NG+ hands back every ability and the AUM to');
  console.log('rebuy every permanent upgrade. It therefore OVERSTATES NG+ difficulty badly —');
  console.log('it read meredith@NG+2 at 1.5% where `node tools/ng-sim.mjs` (carried kit, the');
  console.log('purpose-built instrument) reads 76.3% under the same package. Use ng-sim for');
  console.log('any NG+ ruling; this arm is only useful as a same-kit A/B.');
  console.log('cand   encounter          lvl   FRESH    NG+1     NG+2     NG+3');
  const cells = [['grandma', 8], ['meredith_boss', 9], ['regional_director', 10], ['algorithm', 10]];
  for (const k of keys) {
    withCandidate(CANDIDATES[k], () => {
      for (const [e, lv] of cells) {
        const cfg = enc(e);
        if (PARTY[e] && cfg.party.length === 0) cfg.party = [...PARTY[e]];
        const row = [0, 1, 2, 3].map(lap => {
          let wins = 0;
          for (let i = 0; i < RUNS; i++) {
            const r = runFight({
              ...cfg, unlocked: buildUnlocked('shipped', lv),
              ngPlus: lap > 0, ngPlusCount: lap,
            }, lv, { policy: POLICIES.shipped });
            if (r.win) wins++;
          }
          return pct(wins / RUNS);
        });
        console.log(`${k.padEnd(6)} ${e.padEnd(18)} ${pad(lv, 3)}  ` + row.map(x => pad(x, 7)).join('  '));
      }
    });
  }
}

async function main() {
  await initEnemyAbilities();
  if (has('diag')) runDiag();
  if (has('ladder')) runLadder();
  if (has('pip')) runPip();
  if (has('lanes')) runLanes();
  if (has('day')) await runDay();
  if (has('ng')) runNg();
  if (!['diag', 'ladder', 'pip', 'lanes', 'day', 'ng'].some(has)) {
    console.log('pick a mode: --diag --ladder --pip --lanes --day --ng');
  }
  void buildPlayerStats;
}

main();
