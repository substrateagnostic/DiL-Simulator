// _m-modes.mjs — THE REBALANCE WAVE'S INSTRUMENT.
//
// Two things are being measured and they are not the same question:
//
//   PART 1, the frame. Three difficulty modes, each a named bundle of
//   multipliers read from `src/data/difficulty.js`. This harness measures them
//   by calling `Difficulty.force(mode)` and then running the SHIPPING engine —
//   it does not patch data objects the way `_l-balance.mjs` does, because the
//   modes ARE data and forcing one is exactly what the game will do. That also
//   means the harness measures the same code path the player gets, which is the
//   whole of §4.3 of the handoff package.
//
//   PART 2, the surgery. Boss `phases[].abilities` redrawn toward their damage
//   kits. `--census` reports the mechanism (what fraction of each phase pool is
//   a damage verb, shipped vs surgery) and the run modes report the outcome.
//
// THE ARM THAT MAKES THE TABLES READABLE is `shipped` — the identity bundle,
// measured as if it were a mode. Every table below runs it, and `--null` runs
// it TWICE so the second column is the instrument's own resolution. A gate
// finer than its own null is not a gate.
//
//   node tools/_m-modes.mjs --census                      # the mechanism, no sim
//   node tools/_m-modes.mjs --ladder  --runs 600          # per-mode boss ladder
//   node tools/_m-modes.mjs --floor   --runs 800          # the 21-cell CASUAL gate
//   node tools/_m-modes.mjs --lanes   --runs 600          # the diversity band per mode
//   node tools/_m-modes.mjs --breaks  --runs 600          # Break economy per boss per mode
//   node tools/_m-modes.mjs --ladder --modes shipped,standard --runs 1500
import { runFight, enc, casualTurn, buildPlayerStats } from './combat-sim.mjs';
import { POLICIES, buildUnlocked, instrument, PARTY, LADDER, initEnemyAbilities } from './_j-verify.mjs';
import { Difficulty } from '../src/core/DifficultyManager.js';
import { PHASE_SURGERY, DIFFICULTY_MODES, MODE_ORDER } from '../src/data/difficulty.js';
import { ENEMY_STATS, ENEMY_ABILITIES } from '../src/data/stats.js';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};
const has = (k) => process.argv.includes(`--${k}`);
const RUNS = Number(arg('runs', 400));
const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);
const pad = (s, n) => String(s).padStart(n);

// `shipped` first in every table: it is the null arm and the before-column.
const MODES = (arg('modes', null) || ['shipped', ...MODE_ORDER].join(',')).split(',').map(s => s.trim());

// ── DAMAGE VERBS ────────────────────────────────────────────────────────
// The same three types `CombatEngine._damagingPick` treats as an attack, so the
// census and the Escalation Response cannot disagree about what "damaging"
// means. `dot` is in the list and is ALSO the reason the shipped `quiet` metric
// over-reads — see `instrumentEnemy` below.
const DAMAGING = new Set(['attack', 'dot', 'summon']);
const isDamaging = (id) => DAMAGING.has(ENEMY_ABILITIES[id]?.type);

// ── INSTRUMENT ──────────────────────────────────────────────────────────
// `_l-balance.mjs`'s enemy-side counters, plus two corrections this wave needs.
//
// 1. QUIET IS SPLIT. The shipped `quiet` number counts any enemy turn that
//    landed and moved Andrew's HP by zero — which books a DoT application as a
//    quiet turn, because the damage arrives on Andrew's own turn-start two
//    beats later. Karen reads 32 % quiet almost entirely on `yelp_review`. The
//    fix is not to redefine `quiet` (the prior art's tables would stop
//    comparing) but to report `dotT` beside it, so a reader can see how much of
//    the number is a bookkeeping artefact and how much is a boss baking.
// 2. LOW WATER AND NEAR DEATH are the producer-facing pair, not win rate. Win
//    saturates at 100 % long before a fight stops being frightening.
function instrumentEnemy(engine, st) {
  const realET = engine.enemyTurn.bind(engine);
  engine.enemyTurn = (i) => {
    const e = engine.enemies[i];
    if (!e || e.hp <= 0) return realET(i);
    const before = engine.player.hp;
    const picked = e.telegraphedAbility;
    st.eTurns++;
    if (e.sealed) st.sealedTurns++;
    const r = realET(i);
    const drop = Math.max(0, before - engine.player.hp);
    st.dmgTaken += drop;
    const t = r && r.type;
    if (t === 'fizzle') st.fizzles2++;
    else if (t === 'broken') st.broken2++;
    else if (drop > 0) { st.landedHits++; st.landedDamage += drop; }
    else {
      st.noDamageTurns++;
      if (ENEMY_ABILITIES[picked]?.type === 'dot') st.dotTurns++;
      const ty = ENEMY_ABILITIES[picked]?.type;
      if (ty === 'heal') st.healTurns++;
      else if (ty === 'debuff' || ty === 'buff') st.buffTurns++;
    }
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
  noDamageTurns: 0, dotTurns: 0, healTurns: 0, buffTurns: 0, dmgTaken: 0, lowWater: 1,
});

function cellFor(encId, level, treeId, runs, opts = {}) {
  const cfg = enc(encId);
  if (PARTY[encId] && cfg.party.length === 0) cfg.party = [...PARTY[encId]];
  const unlocked = opts.unlocked || buildUnlocked(treeId, level);
  const agg = ZERO();
  agg.lowWater = 0;
  let wins = 0, rounds = 0, hpLeft = 0, nearDeath = 0;
  for (let i = 0; i < runs; i++) {
    const st = ZERO();
    const policy = opts.policy || ((e, s, u) => { POLICIES[treeId](e, s, u); });
    const r = runFight(
      { ...cfg, unlocked, pipResist: opts.pipResist || 0 },
      level,
      { policy, onEngine: (e) => { instrument(e, st); instrumentEnemy(e, st); } },
    );
    if (r.win) { wins++; hpLeft += r.hpPct; }
    rounds += r.rounds;
    // A defeat is the deepest low-water there is. Counting survivors only would
    // make a mode look SAFER the more often it killed the player.
    const lw = r.win ? st.lowWater : 0;
    if (lw <= 0.25) nearDeath++;
    for (const k of Object.keys(agg)) if (k !== 'tags' && k !== 'lowWater') agg[k] += st[k];
    agg.lowWater += lw;
    for (const [t, n] of Object.entries(st.tags)) agg.tags[t] = (agg.tags[t] || 0) + n;
  }
  const topTag = agg.tagTotal > 0 ? Math.max(...Object.values(agg.tags)) / agg.tagTotal : 0;
  return {
    runs, win: wins / runs, rounds: rounds / runs,
    hpLeft: wins ? hpLeft / wins : 0,
    dmgPerTurn: agg.eTurns ? agg.dmgTaken / agg.eTurns : 0,
    dmgPerLanded: agg.landedHits ? agg.landedDamage / agg.landedHits : 0,
    denial: agg.eTurns ? (agg.fizzles2 + agg.broken2) / agg.eTurns : 0,
    quiet: agg.eTurns ? agg.noDamageTurns / agg.eTurns : 0,
    dotT: agg.eTurns ? agg.dotTurns / agg.eTurns : 0,
    healT: agg.eTurns ? agg.healTurns / agg.eTurns : 0,
    eTurns: agg.eTurns / runs,
    breaks: agg.breaks / runs, braces: agg.braces / runs,
    lowWater: agg.lowWater / runs, nearDeath: nearDeath / runs,
    topTag, supers: agg.supers / runs,
  };
}

function withMode(id, fn) {
  const prev = Difficulty.force(id);
  try { return fn(); } finally { Difficulty.force(prev); }
}

// ── THE CENSUS — the mechanism, with no sampler in it ───────────────────
function runCensus() {
  console.log('\n=== PHASE-LIST CENSUS — the mechanism, computed off the files ===');
  console.log('damaging = share of the phase pool whose ability type is attack / dot / summon,');
  console.log('           i.e. exactly what CombatEngine._damagingPick counts. Repetition is a');
  console.log('           weight because every pattern that reaches a random draw draws');
  console.log('           uniformly from the array.');
  console.log('The two invariants this table proves, per row:');
  console.log('  KEPT  — every shipped id is still in the pool (nothing is deleted).');
  console.log('  OWN   — no id was introduced that the enemy does not already own.');
  console.log('');
  let faults = 0;
  for (const [eid, rows] of Object.entries(PHASE_SURGERY)) {
    const base = ENEMY_STATS[eid];
    if (!base?.phases) { console.log(`${eid}: NO PHASES — surgery row is dead`); faults++; continue; }
    const owned = new Set([...(base.abilities || []), ...base.phases.flatMap(p => p.abilities || [])]);
    console.log(`\n${eid}`);
    base.phases.forEach((p, i) => {
      const before = p.abilities || [];
      const after = Array.isArray(rows[i]) && rows[i].length ? rows[i] : before;
      const share = (a) => a.length ? a.filter(isDamaging).length / a.length : 0;
      const kept = before.every(id => after.includes(id));
      const own = after.every(id => owned.has(id));
      if (!kept || !own) faults++;
      console.log(`  phase ${i} (<= ${p.hpThreshold})  damaging ${pad(pct(share(before)), 6)} -> ${pad(pct(share(after)), 6)}`
        + `   pool ${before.length} -> ${after.length}   KEPT ${kept ? 'yes' : 'NO'}   OWN ${own ? 'yes' : 'NO'}`);
      if (after !== before) console.log(`      ${after.join(' ')}`);
    });
  }
  // LOCK COVERAGE. `_lockableSet` caps at ceil(dedupedIds / 3), so a re-weight
  // is invisible to it and an ADDED id can move it. Checked rather than assumed.
  console.log('\n--- Lock pool size (deduped ids across base + every phase) ---');
  console.log('enemy                  shipped  surgery   cap shipped -> surgery');
  for (const eid of Object.keys(PHASE_SURGERY)) {
    const base = ENEMY_STATS[eid];
    if (!base?.phases) continue;
    const setOf = (phases) => new Set([...(base.abilities || []), ...phases.flatMap(p => p.abilities || [])]);
    const a = setOf(base.phases);
    const b = setOf(Difficulty.phasesFor(eid, base.phases));
    const capA = Math.max(1, Math.ceil(a.size / 3));
    const capB = Math.max(1, Math.ceil(b.size / 3));
    const moved = capA !== capB;
    if (moved) faults++;
    console.log(`${eid.padEnd(22)} ${pad(a.size, 7)}  ${pad(b.size, 7)}   ${capA} -> ${capB}${moved ? '   *** MOVED ***' : ''}`);
  }
  console.log(`\nfaults: ${faults}`);
  return faults;
}

// ── THE LADDER, PER MODE ────────────────────────────────────────────────
const STORY = [
  ['karen', 3], ['karen', 4], ['chad', 5], ['chad', 6], ['grandma', 7], ['grandma', 8],
  ['restructuring_trio', 7], ['restructuring_trio', 8], ['meredith_boss', 8], ['meredith_boss', 9],
  ['regional_director', 10], ['algorithm', 10],
];

function runLadder() {
  console.log(`\n=== THE LADDER, PER MODE (${RUNS} runs/cell, COMPETENT shipped kit) ===`);
  console.log('low-water = the lowest fraction of maxHP Andrew ever stood at, averaged over');
  console.log('            runs, with a defeat counted as 0. near-death = share of runs whose');
  console.log('            low-water reached 25 %. These are the producer-facing pair; win rate');
  console.log('            saturates long before a fight stops being frightening.');
  console.log('quiet     = enemy turns that landed and dealt 0 damage. dotT is the part of that');
  console.log('            which is a DoT being APPLIED (the damage lands two beats later on');
  console.log('            Andrew\'s turn-start) — subtract it to read the real bookkeeping turns.');
  const baseVals = {};
  for (const mode of MODES) {
    const b = DIFFICULTY_MODES[mode];
    console.log(`\n-- ${mode.toUpperCase()}${b ? '  (' + b.name + ')' : '  [UNKNOWN]'}`);
    console.log('encounter              lvl    win  rounds  low-water  near-death  eTurns  denial   quiet    dotT   healT   dmg/T   TTK  breaks');
    withMode(mode, () => {
      for (const [e, lv] of STORY) {
        const r = cellFor(e, lv, 'shipped', RUNS);
        const maxHP = buildPlayerStats(lv).maxHP;
        const ttk = r.dmgPerTurn > 0 ? maxHP / r.dmgPerTurn : Infinity;
        const key = `${e}@${lv}`;
        if (mode === MODES[0]) baseVals[key] = r;
        const d = baseVals[key];
        const dlw = mode === MODES[0] ? '' : ` (${((r.lowWater - d.lowWater) * 100 >= 0 ? '+' : '') + ((r.lowWater - d.lowWater) * 100).toFixed(1)})`;
        console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ${pad(pct(r.win), 5)}  ${pad(n2(r.rounds), 6)}  `
          + `${pad(pct(r.lowWater), 9)}  ${pad(pct(r.nearDeath), 10)}  ${pad(n2(r.eTurns), 6)}  `
          + `${pad(pct(r.denial), 6)}  ${pad(pct(r.quiet), 6)}  ${pad(pct(r.dotT), 6)}  ${pad(pct(r.healT), 6)}  `
          + `${pad(n2(r.dmgPerTurn), 6)}  ${pad(ttk.toFixed(1), 5)}  ${pad(n2(r.breaks), 5)}${dlw}`);
      }
    });
  }
}

// ── THE 21-CELL FLOOR — CASUAL's gate, and only CASUAL's ────────────────
const FLOOR_CELLS = [['karen', 3], ['karen', 4], ['grandma', 7], ['grandma', 8],
  ['meredith_boss', 9], ['regional_director', 10], ['algorithm', 10]];
const FLOOR_PIP = [0, 0.20, 0.30];
const DEATHS_FOR = [0, 0, 5];

function runFloor() {
  console.log(`\n=== THE 21-CELL CASUAL FLOOR (${RUNS} runs/cell, CASUAL policy) ===`);
  console.log('CASUAL policy: basic attacks, the free starter heal, Assert Dominance when the');
  console.log('bar fills on its own. Never a tagged hit, never a Brace, so it denies 0.0 % of');
  console.log('enemy turns on every solo rung and every denial-gated component is unreachable.');
  console.log('');
  console.log('The three columns are the resistance the player has REQUISITIONED (the shipped');
  console.log('Performance Improvement Plan at 0 / 10 / 25 recorded defeats). A mode with an');
  console.log('assist takes the MAX of the two, so:');
  console.log('  • column PIP 0 %  measures the ASSIST — Casual lifting an unaided player.');
  console.log('  • columns 20/30 % measure the PHASE SURGERY ALONE, because the assist is');
  console.log('    already saturated there and both arms run the same resistance. THAT is the');
  console.log('    bill, and it is the pair of columns the gate is read on.');
  console.log('Judge against the NULL ARM (the identity bundle measured a second time), never');
  console.log('against a round number.');
  const arms = [...MODES];
  if (has('null')) arms.splice(1, 0, 'shipped#null');
  const baseVals = {};
  let nullMean = null;
  for (const arm of arms) {
    const mode = arm.split('#')[0];
    const vals = {};
    withMode(mode, () => {
      for (const [e, lv] of FLOOR_CELLS) {
        for (const p of FLOOR_PIP) {
          // The columns are the resistance a player has REQUISITIONED, and the
          // shipped PIP formula is 0.20 + 0.02 x deaths — so column 0 is an
          // UNFILED player (0 deaths, no plan), column 20 % is a filed player
          // at 0 deaths and column 30 % is a filed player at 5. The mode assist
          // runs the identical formula off the identical `deaths`, so columns 2
          // and 3 hand BOTH arms the same number and isolate the surgery, while
          // column 1 is the assist doing its whole job. Feeding `assistResist`
          // the column instead of the deaths is the bug that made the first
          // draw of this table unreadable: it handed Casual 0.40 and 0.70.
          const assist = Difficulty.assistResist(DEATHS_FOR[FLOOR_PIP.indexOf(p)]);
          const r = cellFor(e, lv, 'shipped', RUNS, { policy: casualTurn, pipResist: Math.max(p, assist) });
          vals[`${e}@${lv}|${p}`] = r.win;
        }
      }
    });
    if (arm === arms[0]) Object.assign(baseVals, vals);
    const keys = Object.keys(vals);
    const deltas = keys.map(k => (vals[k] - baseVals[k]) * 100);
    const billKeys = keys.filter(k => !k.endsWith('|0'));
    const bill = billKeys.map(k => (vals[k] - baseVals[k]) * 100);
    const meanAbs = deltas.reduce((s, d) => s + Math.abs(d), 0) / deltas.length;
    const billAbs = bill.reduce((s, d) => s + Math.abs(d), 0) / bill.length;
    const billSigned = bill.reduce((s, d) => s + d, 0) / bill.length;
    const billWorst = bill.reduce((w, d) => Math.abs(d) > Math.abs(w) ? d : w, 0);
    if (arm.endsWith('#null')) nullMean = billAbs;
    const b = DIFFICULTY_MODES[mode];
    console.log(`\n-- ${arm.toUpperCase()}${arm.endsWith('#null') ? '  [NULL ARM — identical bundle, second draw]' : b ? '  (' + b.name + ')' : ''}`);
    console.log('encounter              lvl   PIP 0%    PIP 20%   PIP 30%' + (arm === arms[0] ? '' : '   (delta vs first arm)'));
    for (const [e, lv] of FLOOR_CELLS) {
      const cells = FLOOR_PIP.map(p => {
        const v = vals[`${e}@${lv}|${p}`];
        const d = (v - baseVals[`${e}@${lv}|${p}`]) * 100;
        return arm === arms[0] ? pad(pct(v), 8)
          : `${pad(pct(v), 8)}${pad((d >= 0 ? '+' : '') + d.toFixed(1), 6)}`;
      });
      console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ` + cells.join(' '));
    }
    if (arm !== arms[0]) {
      // THE VERDICT IS SIGNED, NOT ABSOLUTE. A candidate that moves 14 cells
      // UPWARD by 1.8 pp has not billed the floor for anything — it has helped
      // it, slightly, and an absolute-magnitude rule calls that a failure. Only
      // a NEGATIVE drift past the instrument's own resolution is a bill.
      const nul = nullMean ?? 2;
      const verdict = arm.endsWith('#null') ? 'RESOLUTION'
        : (billSigned >= -nul * 0.5) ? 'PASS — the floor does not pay for this'
          : (billSigned < -nul * 1.35) ? 'FAIL — the floor pays for this'
            : 'MARGINAL — re-run at higher n';
      console.log(`   all 21: mean |delta| ${meanAbs.toFixed(2)} pp`);
      console.log(`   THE BILL (14 cells at PIP 20/30 %): mean |delta| ${billAbs.toFixed(2)} pp   `
        + `signed ${(billSigned >= 0 ? '+' : '') + billSigned.toFixed(2)} pp   worst ${(billWorst >= 0 ? '+' : '') + billWorst.toFixed(1)} pp`
        + (nullMean != null && !arm.endsWith('#null') ? `   (null = ${nullMean.toFixed(2)} pp)` : '')
        + `   ${verdict}`);
    }
  }
}

// ── THE DIVERSITY BAND, PER MODE ────────────────────────────────────────
function runLanes() {
  console.log(`\n=== THE DIVERSITY BAND, PER MODE (${RUNS} runs/cell) ===`);
  console.log("J's law is <= 8.0 pp between the three Practice Groups at every rung.");
  console.log('This table has NO null arm and four passes of the identical shipped config have');
  console.log('read max bands of 6.3 / 6.5 / 7.5 / 10.0 pp — read a cell only when it moves');
  console.log('further than that spread.');
  for (const mode of MODES) {
    const b = DIFFICULTY_MODES[mode];
    console.log(`\n-- ${mode.toUpperCase()}${b ? '  (' + b.name + ')' : ''}`);
    console.log('encounter              lvl   win: lit / comp / audit          band');
    let worst = 0, worstAt = '';
    withMode(mode, () => {
      for (const [e, lv] of LADDER) {
        const r = ['litigation', 'compliance', 'audit'].map(t => cellFor(e, lv, t, RUNS));
        const wins = r.map(x => x.win);
        const band = (Math.max(...wins) - Math.min(...wins)) * 100;
        if (band > worst) { worst = band; worstAt = `${e}@${lv}`; }
        console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ` + r.map(x => pad(pct(x.win), 6)).join(' /')
          + `   ${pad(band.toFixed(1) + ' pp', 8)}`);
      }
    });
    console.log(`   MAX BAND: ${worst.toFixed(1)} pp at ${worstAt}`);
  }
}

// ── THE BREAK ECONOMY ───────────────────────────────────────────────────
// A declared floor per boss. Breaking is the mechanic the whole Composure
// system exists to teach, and a mode that suppresses it has broken a system
// rather than tuned a number. Karen is the tutorial and her floor is the
// strictest.
const BREAK_FLOOR = {
  karen: 0.50,             // the Break tutorial. Half a Break a fight, minimum.
  chad: 0.25, grandma: 0.25, meredith_boss: 0.25,
  regional_director: 0.15, algorithm: 0.15,
};
function runBreaks() {
  console.log(`\n=== THE BREAK ECONOMY, PER MODE (${RUNS} runs/cell, COMPETENT) ===`);
  console.log('breaks/fight, against a DECLARED FLOOR per boss. A mode is allowed to be mean.');
  console.log('It is not allowed to delete a system: at 0.0x breaks the Composure bar is');
  console.log('decoration and the tutorial that teaches it is a lie.');
  for (const mode of MODES) {
    const b = DIFFICULTY_MODES[mode];
    console.log(`\n-- ${mode.toUpperCase()}${b ? '  (' + b.name + ')' : ''}`);
    console.log('encounter              lvl  breaks/fight   floor   verdict');
    withMode(mode, () => {
      for (const [e, lv] of STORY) {
        const floor = BREAK_FLOOR[e];
        if (floor === undefined) continue;
        const r = cellFor(e, lv, 'shipped', RUNS);
        const ok = r.breaks >= floor;
        console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ${pad(n2(r.breaks), 12)}   ${pad(n2(floor), 5)}   ${ok ? 'ok' : '*** UNDER FLOOR ***'}`);
      }
    });
  }
}

async function main() {
  await initEnemyAbilities();
  let faults = 0;
  if (has('census')) faults += runCensus();
  if (has('ladder')) runLadder();
  if (has('floor')) runFloor();
  if (has('lanes')) runLanes();
  if (has('breaks')) runBreaks();
  if (!['census', 'ladder', 'floor', 'lanes', 'breaks'].some(has)) {
    console.log('pick a mode: --census --ladder --floor --lanes --breaks');
  }
  if (faults > 0) process.exitCode = 1;
}

main();
