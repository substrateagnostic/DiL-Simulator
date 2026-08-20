// _ng-retune.mjs — THE NG+ RE-TUNE BILL's instrument (dossier §6.5, the
// "largest unpaid bill in the design"; the n-run audit accommodation's declared
// NG+ residual).
//
// WHAT IT MEASURES, and through which path: NG+ laps × difficulty modes ×
// practice lanes, all through the SHIPPING code — modes via `Difficulty.force()`
// (the `_m-modes.mjs` pattern: forcing a mode is exactly what the game does, so
// the harness measures the same path the player gets), laps via the engine's own
// `ngPlus`/`ngPlusCount` opts (what CombatState passes off `ng_plus_count`), and
// candidates as in-place writes to the exported `NG_PLUS_ENTRY` /
// `NG_PLUS_SCALING` / `NG_PLUS_LAP` objects (the `ng-sim.mjs --sweep` precedent),
// recorded and restored around every scope so a candidate cannot contaminate a
// later cell (the J-run's own published failure, TUNE.MSJ_MODE).
//
//   node tools/_ng-retune.mjs --matrix --runs 300              # the survey
//   node tools/_ng-retune.mjs --matrix --cand H45 --runs 300   # one knob, alone
//   node tools/_ng-retune.mjs --ladder --runs 400              # ng-sim acceptance per mode
//   node tools/_ng-retune.mjs --null   --runs 600              # the instrument's own noise
//   node tools/_ng-retune.mjs --touch  --cand P1 --runs 600    # lap-0 cells must not move
//   node tools/_ng-retune.mjs --modes normal,hard --laps 0,1,2 --rungs meredith_boss@12
//
// TWO LOADOUT MODELS, BOTH DELIBERATE — say which one a number came from:
//
//   LANE  (--matrix): `buildUnlocked(treeId, level)` + that lane's policy, no
//         shop stats. This is the n-run instrument (`_n-audit.mjs`), so the lane
//         gaps here compare 1:1 with the accommodation's own evidence and with
//         the CLAUDE.md residual ("meredith@12 NG+1 x Hard: Audit gap ~28-38 pp").
//         It UNDERSTATES an NG+ player's stat line (no rebought shop upgrades)
//         and models the lane as a build rather than as carry-all; the gap
//         between lanes is the claim, not the absolute win rate. `--shop` adds
//         the maxed shop stats to every lane for a sensitivity read.
//
//   CARRY (--ladder): every ability + maxed permanent shop upgrades, COMPETENT
//         policy — ng-sim.mjs's CARRY definition verbatim, so the acceptance
//         rule (CARRY@NG+1 <= FRESH@NG, per mode now) is measured by the same
//         instrument that set the shipped constants.
//
// HOUSE METRICS (win rate alone is the WRONG metric — CLAUDE.md, the l-run):
// rounds, low-water (defeat counted as 0), near-death (low-water <= 25%),
// dmg/T (damage per enemy turn ATTEMPT — a denied turn scores zero), timeouts.
//
// ONE GOTCHA THIS FILE EXISTS TO REMEMBER: since DIFFICULTY_LIVE flipped
// (2026-08-17) the resolver's default mode is `normal`, so ANY harness that does
// not force a mode is measuring Normal (surgery phases + Grandma AI weights) —
// including tools/ng-sim.mjs and the NG+ table in CombatEngine.js's own comment,
// which were both written pre-flip against `shipped`. Every cell here runs
// inside an explicit `withMode`.

import { runFight, enc, buildPlayerStats, competentTurn } from './combat-sim.mjs';
import { POLICIES, buildUnlocked, instrument, PARTY, initEnemyAbilities } from './_j-verify.mjs';
import { Difficulty } from '../src/core/DifficultyManager.js';
import {
  NG_PLUS_ENTRY, NG_PLUS_SCALING, NG_PLUS_CAP, NG_PLUS_LAP, ngLapExponent,
} from '../src/combat/CombatEngine.js';
import { PLAYER_ABILITIES } from '../src/data/stats.js';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};
const has = (k) => process.argv.includes(`--${k}`);
const RUNS = Number(arg('runs', 300));
const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);
const pad = (s, n) => String(s).padStart(n);

// ── THE CANDIDATE KNOBS ─────────────────────────────────────────────────
// Every candidate is a write against the three NG_PLUS_* objects and nothing
// else — the exact edit the dark diff makes to CombatEngine.js. Shape:
// { entry: {...}, scaling: {...}, lap: {...} }, missing keys untouched.
//
// Naming: H = entry maxHP, HS = per-lap maxHP scaling, A = entry atk,
// AS = per-lap atk scaling, D = entry def, P = composed package.
export const CANDS = {
  base: { label: 'BASELINE (shipped NG+ constants)' },
  // Rounds knobs — NG+ buys its difficulty with maxHP, the one stat the modes
  // deliberately do NOT use ("more HP is more ROUNDS").
  H45: { label: 'entry maxHP 1.70 -> 1.45', entry: { maxHP: 1.45 } },
  H50: { label: 'entry maxHP 1.70 -> 1.50', entry: { maxHP: 1.50 } },
  H55: { label: 'entry maxHP 1.70 -> 1.55', entry: { maxHP: 1.55 } },
  HS05: { label: 'per-lap maxHP 1.15 -> 1.05', scaling: { maxHP: 1.05 } },
  HS10: { label: 'per-lap maxHP 1.15 -> 1.10', scaling: { maxHP: 1.10 } },
  // Stacking knobs — Hard multiplies atk ON TOP of the NG+ rung (1.45 x 1.45 =
  // 2.10 at NG+1), which is the compounding suspicion.
  A35: { label: 'entry atk 1.45 -> 1.35', entry: { atk: 1.35 } },
  AS10: { label: 'per-lap atk 1.15 -> 1.10', scaling: { atk: 1.10 } },
  // Def is a rounds knob wearing an atk costume (it taxes player damage).
  D20: { label: 'entry def 1.30 -> 1.20', entry: { def: 1.20 } },
  // Staircase-restoring singles: per-lap atk and decay touch NG+2/NG+3 ONLY
  // (lap exponents are 0/0/1/1+d), so the Hard x NG+1 stack cannot move.
  ASU25: { label: 'per-lap atk 1.15 -> 1.25', scaling: { atk: 1.25 } },
  ASU30: { label: 'per-lap atk 1.15 -> 1.30', scaling: { atk: 1.30 } },
  LD60: { label: 'lap decay 0.35 -> 0.60', lap: { decay: 0.60 } },
  // Composed packages — the HP cut pays the rounds bill, the per-lap atk raise
  // buys the staircase back at the laps where the HP cut flattened it.
  P1: {
    label: 'P1: entry HP 1.45, per-lap HP 1.10, per-lap atk 1.25, decay 0.60',
    entry: { maxHP: 1.45 }, scaling: { maxHP: 1.10, atk: 1.25 }, lap: { decay: 0.60 },
  },
  P2: {
    label: 'P2: entry HP 1.45, per-lap HP 1.10, per-lap atk 1.22, decay 0.50',
    entry: { maxHP: 1.45 }, scaling: { maxHP: 1.10, atk: 1.22 }, lap: { decay: 0.50 },
  },
  P3: {
    label: 'P3: entry HP 1.50, per-lap HP 1.08, per-lap atk 1.28, decay 0.60',
    entry: { maxHP: 1.50 }, scaling: { maxHP: 1.08, atk: 1.28 }, lap: { decay: 0.60 },
  },
};

function withCand(name, fn) {
  const cand = CANDS[name];
  if (!cand) throw new Error(`unknown candidate ${name}`);
  const undo = [];
  const write = (obj, patch) => {
    for (const [k, v] of Object.entries(patch || {})) {
      undo.push([obj, k, obj[k]]);
      obj[k] = v;
    }
  };
  write(NG_PLUS_ENTRY, cand.entry);
  write(NG_PLUS_SCALING, cand.scaling);
  write(NG_PLUS_LAP, cand.lap);
  try { return fn(); } finally {
    for (let i = undo.length - 1; i >= 0; i--) { const [o, k, v] = undo[i]; o[k] = v; }
  }
}

function withMode(id, fn) {
  const prev = Difficulty.force(id);
  try { return fn(); } finally { Difficulty.force(prev); }
}

// Effective enemy multiplier at a lap under the CURRENT constants.
function rung(key, laps) {
  if (laps <= 0) return 1;
  const l = Math.min(NG_PLUS_CAP, laps);
  return NG_PLUS_ENTRY[key] * Math.pow(NG_PLUS_SCALING[key], ngLapExponent(l));
}

// ── THE CELL — _n-audit's batch + _m-modes' enemy-side counters ─────────
function instrumentEnemy(engine, st) {
  const realET = engine.enemyTurn.bind(engine);
  engine.enemyTurn = (i) => {
    const e = engine.enemies[i];
    if (!e || e.hp <= 0) return realET(i);
    const before = engine.player.hp;
    st.eTurns++;
    const r = realET(i);
    st.dmgTaken += Math.max(0, before - engine.player.hp);
    const t = r && r.type;
    if (t === 'fizzle') st.denied++;
    else if (t === 'broken') st.denied++;
    return r;
  };
  const realPTS = engine.processTurnStart.bind(engine);
  engine.processTurnStart = (who) => {
    const isPlayer = who === engine.player;
    const before = isPlayer ? engine.player.hp : 0;
    const r = realPTS(who);
    if (isPlayer) st.dmgTaken += Math.max(0, before - engine.player.hp);
    return r;
  };
  const sample = () => {
    const f = engine.player.hp / Math.max(1, engine.player.maxHP);
    if (f < st.low) st.low = f;
  };
  for (const m of ['enemyTurn', 'processTurnStart', 'playerAttack', 'playerAbility',
    'playerPowerMove', 'playerRetaliate', 'playerDesperateGamble', 'playerPressAdvantage',
    'playerBrace', 'playerItem', 'playerSecondWind']) {
    if (typeof engine[m] !== 'function') continue;
    const real = engine[m].bind(engine);
    engine[m] = (...a) => { const r = real(...a); sample(); return r; };
  }
}

// Maxed permanent shop upgrades (SHOP_ITEMS 'upgrade', maxStack 3) — ng-sim's
// MAXED_SHOP verbatim.
const MAXED_SHOP = { atk: 9, def: 9, maxHP: 60, spd: 6 };
const ALL_ABILITIES = new Set(Object.keys(PLAYER_ABILITIES));

function cellFor(encId, level, treeId, laps, runs, opts = {}) {
  const cfg = enc(encId);
  if (PARTY[encId] && cfg.party.length === 0) cfg.party = [...PARTY[encId]];
  const carry = opts.carry || false;
  const unlocked = carry ? new Set(ALL_ABILITIES) : buildUnlocked(treeId, level);
  if (carry || opts.shop) {
    cfg.atkBonus = MAXED_SHOP.atk;
    cfg.defBonus = MAXED_SHOP.def;
    const b = buildPlayerStats(level);
    cfg.playerExtra = { maxHP: b.maxHP + MAXED_SHOP.maxHP, hp: b.maxHP + MAXED_SHOP.maxHP, spd: b.spd + MAXED_SHOP.spd };
  }
  if (laps > 0) { cfg.ngPlus = true; cfg.ngPlusCount = laps; }
  // The mode assist is applied here, not only in a floor table — the _m-modes
  // law. One field, two sources, never stacked.
  const pipResist = Math.max(opts.pipResist || 0, Difficulty.assistResist(opts.deaths || 0));
  const agg = { wins: 0, rounds: 0, hpLeft: 0, low: 0, nearD: 0, eTurns: 0, denied: 0, dmg: 0, breaks: 0, timeouts: 0 };
  for (let i = 0; i < runs; i++) {
    const st = {
      actions: 0, supers: 0, breaks: 0, braces: 0, perfect: 0, compW: 0, compOTH: 0,
      fizzles: 0, brokenTurns: 0, ucProcs: 0, msjProcs: 0, tags: {}, tagTotal: 0,
      eTurns: 0, denied: 0, dmgTaken: 0, low: 1,
    };
    // `carry` defaults to COMPETENT (the ng-sim CARRY definition); `lanePolicy`
    // keeps the carried kit but plays the LANE — the REAL NG+ lane player,
    // who owns every ability (NG+ carries them all) and every passive but
    // spends their turns the way their lane does.
    const policy = opts.policy
      || ((carry && !opts.lanePolicy) ? competentTurn : ((e, s, u) => POLICIES[treeId](e, s, u)));
    const r = runFight(
      { ...cfg, unlocked, pipResist },
      level,
      { policy, onEngine: (e) => { instrument(e, st); instrumentEnemy(e, st); } },
    );
    if (r.win) { agg.wins++; agg.hpLeft += r.hpPct; }
    if (r.timeout) agg.timeouts++;
    agg.rounds += r.rounds;
    const lw = r.win ? st.low : 0;         // a defeat is the deepest low-water there is
    agg.low += lw;
    if (lw <= 0.25) agg.nearD++;
    agg.eTurns += st.eTurns; agg.denied += st.denied; agg.dmg += st.dmgTaken;
    agg.breaks += st.breaks;
  }
  return {
    win: agg.wins / runs, rounds: agg.rounds / runs,
    hpLeft: agg.wins ? agg.hpLeft / agg.wins : 0,
    lowWater: agg.low / runs, nearDeath: agg.nearD / runs,
    eTurns: agg.eTurns / runs,
    denial: agg.eTurns ? agg.denied / agg.eTurns : 0,
    dmgPerTurn: agg.eTurns ? agg.dmg / agg.eTurns : 0,
    breaks: agg.breaks / runs,
    timeouts: agg.timeouts,
  };
}

// ── CELL SETS ───────────────────────────────────────────────────────────
// At-level story rungs plus the named long fights. meredith_boss@12 is the
// n-run judge's residual rung (its 300-run spot check: lit 86.7 % / audit
// 60.7 %, rounds 27.95, on Hard NG+1).
const RUNGS_DEFAULT = 'karen@4,grandma@8,meredith_boss@9,meredith_boss@12,regional_director@10,algorithm@10';
const RUNGS = (arg('rungs', RUNGS_DEFAULT)).split(',').map(s => {
  const [e, lv] = s.split('@');
  return [e.trim(), Number(lv)];
});
const MODES = (arg('modes', 'easy,normal,hard')).split(',').map(s => s.trim());
const LAPS = (arg('laps', '0,1,2')).split(',').map(Number);
const LANES = (arg('lanes', 'litigation,compliance,audit')).split(',').map(s => s.trim());

function header() {
  console.log(`NG+ effective enemy multipliers under ${arg('cand', 'base')}:`);
  console.log('  lap    maxHP    atk    def');
  for (const l of [0, 1, 2, 3]) {
    console.log(`  ${l === 0 ? 'NG ' : 'NG+' + l}  ${pad(rung('maxHP', l).toFixed(3), 7)}  ${pad(rung('atk', l).toFixed(3), 5)}  ${pad(rung('def', l).toFixed(3), 5)}`);
  }
  console.log('  (Hard multiplies atk x1.45 ON TOP of the lap rung, after overrides.)');
}

// ── --matrix: the survey ────────────────────────────────────────────────
function runMatrix() {
  const cand = arg('cand', 'base');
  // --loadout lane|shop|real   (default lane — the n-run comparable instrument)
  //   lane: buildUnlocked(tree, level), no shop stats
  //   shop: lane kit + maxed shop stats
  //   real: ALL abilities (what NG+ actually carries) + maxed shop stats,
  //         played with the LANE's policy — the honest NG+ lane player.
  const loadout = arg('loadout', 'lane');
  const cellOpts = loadout === 'real' ? { carry: true, lanePolicy: true }
    : loadout === 'shop' ? { shop: true } : {};
  console.log(`\n=== NG+ x MODE x LANE MATRIX — cand ${cand} (${CANDS[cand].label}), ${RUNS} runs/cell, loadout ${loadout.toUpperCase()} ===`);
  header();
  for (const mode of MODES) {
    console.log(`\n-- MODE ${mode.toUpperCase()}`);
    console.log('encounter              lvl lap      win: lit / comp / aud       band     rounds: lit / comp / aud      lowW: lit/comp/aud   nearD: lit/comp/aud    dmg/T: lit/comp/aud');
    withMode(mode, () => {
      for (const [e, lv] of RUNGS) {
        for (const laps of LAPS) {
          const r = LANES.map(t => withCand(cand, () => cellFor(e, lv, t, laps, RUNS, { ...cellOpts })));
          const wins = r.map(x => x.win);
          const band = (Math.max(...wins) - Math.min(...wins)) * 100;
          console.log(`${e.padEnd(21)} ${pad(lv, 3)}  +${laps}  ${r.map(x => pad(pct(x.win), 6)).join(' /')}`
            + `  ${pad(band.toFixed(1), 5)} pp   ${r.map(x => pad(n2(x.rounds), 6)).join(' /')}`
            + `   ${r.map(x => pad(pct(x.lowWater), 5)).join('/')}`
            + `   ${r.map(x => pad(pct(x.nearDeath), 5)).join('/')}`
            + `   ${r.map(x => pad(n2(x.dmgPerTurn), 5)).join('/')}`
            + (r.some(x => x.timeouts) ? `   TIMEOUTS ${r.map(x => x.timeouts).join('/')}` : ''));
        }
      }
    });
  }
}

// ── --ladder: the ng-sim acceptance rule, per mode ─────────────────────
function runLadder() {
  const cand = arg('cand', 'base');
  const LADDER_ROWS = [
    { id: 'karen', level: 4 }, { id: 'chad', level: 6 }, { id: 'grandma', level: 8 },
    { id: 'meredith_boss', level: 9 }, { id: 'algorithm', level: 10 },
  ];
  console.log(`\n=== NG+ LADDER ACCEPTANCE, PER MODE — cand ${cand} (${CANDS[cand].label}), ${RUNS} runs/cell, CARRY kit, COMPETENT ===`);
  console.log('Rule (ng-sim.mjs): CARRY@NG+1 <= FRESH@NG — a second lap must not be easier.');
  header();
  for (const mode of MODES) {
    console.log(`\n-- MODE ${mode.toUpperCase()}`);
    console.log('encounter          lvl   FRESH@NG   CARRY@NG  CARRY@NG+1  CARRY@NG+2  CARRY@NG+3');
    withMode(mode, () => {
      for (const row of LADDER_ROWS) {
        const cells = [];
        cells.push(withCand(cand, () => cellFor(row.id, row.level, 'shipped', 0, RUNS, { carry: false, policy: competentTurn })));
        for (const laps of [0, 1, 2, 3]) {
          cells.push(withCand(cand, () => cellFor(row.id, row.level, 'shipped', laps, RUNS, { carry: true })));
        }
        const [fresh, c0, c1, c2, c3] = cells;
        const viol = c1.win > fresh.win + 0.02 ? '   ** CARRY@NG+1 > FRESH@NG **' : '';
        console.log(`${row.id.padEnd(18)} ${pad(row.level, 2)}   ${pad(pct(fresh.win), 8)}  ${pad(pct(c0.win), 9)}  ${pad(pct(c1.win), 10)}  ${pad(pct(c2.win), 10)}  ${pad(pct(c3.win), 10)}${viol}`);
        console.log(`${''.padEnd(18)}      rounds  ${pad(n2(fresh.rounds), 6)}  ${pad(n2(c0.rounds), 9)}  ${pad(n2(c1.rounds), 10)}  ${pad(n2(c2.rounds), 10)}  ${pad(n2(c3.rounds), 10)}`);
      }
    });
  }
}

// ── --null: the instrument's own resolution ─────────────────────────────
function runNull() {
  console.log(`\n=== NULL ARM — the same shipped cell measured twice (${RUNS} runs/cell) ===`);
  console.log('Nothing here is a finding unless it clears these deltas.');
  const cells = [['meredith_boss', 12, 'audit', 1, 'hard'], ['meredith_boss', 12, 'litigation', 1, 'hard'],
    ['grandma', 8, 'audit', 1, 'normal'], ['algorithm', 10, 'litigation', 2, 'normal']];
  for (const [e, lv, t, laps, mode] of cells) {
    const a = withMode(mode, () => cellFor(e, lv, t, laps, RUNS));
    const b = withMode(mode, () => cellFor(e, lv, t, laps, RUNS));
    console.log(`${e}@${lv} ${t} NG+${laps} ${mode}:  win ${pct(a.win)} vs ${pct(b.win)}  (|d| ${(Math.abs(a.win - b.win) * 100).toFixed(1)} pp)`
      + `  rounds ${n2(a.rounds)} vs ${n2(b.rounds)}`);
  }
}

// ── --touch: lap-0 must not move (the constants only reach laps > 0) ────
function runTouch() {
  const cand = arg('cand', 'P1');
  console.log(`\n=== TOUCH TEST — cand ${cand} vs base on LAP-0 cells (${RUNS} runs/cell) ===`);
  console.log('NG_PLUS_* is only read when laps > 0, so lap-0 deltas must be pure noise.');
  const cells = [['karen', 3, 'shipped', 'normal'], ['grandma', 8, 'audit', 'hard'], ['meredith_boss', 9, 'litigation', 'normal']];
  for (const [e, lv, t, mode] of cells) {
    const a = withMode(mode, () => withCand('base', () => cellFor(e, lv, t, 0, RUNS)));
    const b = withMode(mode, () => withCand(cand, () => cellFor(e, lv, t, 0, RUNS)));
    console.log(`${e}@${lv} ${t} ${mode}:  win ${pct(a.win)} -> ${pct(b.win)}  (${((b.win - a.win) * 100).toFixed(1)} pp)`
      + `  rounds ${n2(a.rounds)} -> ${n2(b.rounds)}`);
  }
}

await initEnemyAbilities();
if (has('matrix')) runMatrix();
if (has('ladder')) runLadder();
if (has('null')) runNull();
if (has('touch')) runTouch();
if (!has('matrix') && !has('ladder') && !has('null') && !has('touch')) {
  console.log('pass one of --matrix --ladder --null --touch  (see header)');
  header();
}
