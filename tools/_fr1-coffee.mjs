// FIX ROUND 1 — B24 / producer question C4: is starting Coffee (MP) too
// generous, and what should it be?
//
// SHIPS NOTHING. This writes a priced PROPOSAL; the producer signs the number.
//
// The playtest note is "too much starting coffee — special-spam". The combat
// hunt closed A1 (the Meshy warm-up ceiling) so difficulty is readable again,
// and its own finding was that "too easy" is REAL and PRE-EXISTING: 98-100 %
// win across the ladder at competent play. So the question this harness asks is
// not "does less MP make it harder" — of course it does — but:
//
//   1. HOW MUCH of a fight can be spent on specials at each candidate value?
//      That is the actual complaint: not difficulty, RHYTHM. If the whole fight
//      can be abilities, the basic attack is decoration.
//   2. What does it cost the CASUAL floor? Run C's failure mode was taxing the
//      player the Performance Improvement Plan exists for. A number that fixes
//      the power fantasy by breaking the floor is not a candidate.
//
// It wraps tools/combat-sim.mjs, so this is the REAL CombatEngine, the REAL
// PLAYER_ABILITIES and balance.json, and the same COMPETENT / CASUAL policies
// every previous balance ruling on this project was measured against.
//
//   node tools/_fr1-coffee.mjs [--runs 400]

import {
  batch, enc, buildPlayerStats, unlockedAbilities,
  competentTurn, casualTurn,
} from './combat-sim.mjs';
import { PLAYER_BASE_STATS, LEVEL_GROWTH, PLAYER_ABILITIES } from '../src/data/stats.js';

const RUNS = Number((process.argv.find(a => a.startsWith('--runs')) || '').split(/[= ]/)[1])
  || Number(process.argv[process.argv.indexOf('--runs') + 1]) || 300;

// The ladder the story actually walks, with the level the game expects there.
const LADDER = [
  ['intern', 1], ['karen', 3], ['chad', 5], ['grandma', 7],
  ['compliance', 8], ['meredith_boss', 9], ['regional_director', 11], ['algorithm', 12],
];

// Candidates. 75 is shipped. The two below it are the ones worth asking about:
// 50 keeps every ability affordable at level 1, 40 makes the FIRST ability cost
// a real fraction of the pool.
const CANDIDATES = [75, 60, 50, 40];

const SHIPPED = PLAYER_BASE_STATS.maxMP;

// What does a special COST, and how many can the pool buy? This is the rhythm
// question stated as arithmetic and it needs no simulation at all.
function affordability(base) {
  const rows = [];
  for (const [, level] of LADDER) {
    const maxMP = base + LEVEL_GROWTH.maxMP * (level - 1);
    const unlocked = [...unlockedAbilities(level)]
      .map(id => PLAYER_ABILITIES[id])
      .filter(a => a && a.type !== 'passive' && (a.cost || 0) > 0);
    if (!unlocked.length) continue;
    const costs = unlocked.map(a => a.cost);
    const cheapest = Math.min(...costs);
    const median = costs.slice().sort((a, b) => a - b)[Math.floor(costs.length / 2)];
    rows.push({
      level, maxMP,
      cheapest, median,
      castsOfCheapest: Math.floor(maxMP / cheapest),
      castsOfMedian: Math.floor(maxMP / median),
    });
  }
  return rows;
}

console.log(`B24 — STARTING COFFEE (MP). Shipped base maxMP = ${SHIPPED}, growth +${LEVEL_GROWTH.maxMP}/level.`);
console.log(`runs per cell: ${RUNS}\n`);

console.log('── 1. AFFORDABILITY: how many specials does the pool buy? ──');
console.log('(castsOfMedian is the honest rhythm number — how many times a fight');
console.log(' can be a special before the player has to press Attack.)\n');
for (const base of CANDIDATES) {
  const rows = affordability(base);
  const tag = base === SHIPPED ? ' (SHIPPED)' : '';
  console.log(`  base ${base}${tag}`);
  for (const r of rows) {
    console.log(`    L${String(r.level).padStart(2)}  pool ${String(r.maxMP).padStart(3)}  cheapest ${String(r.cheapest).padStart(2)} -> ${String(r.castsOfCheapest).padStart(2)} casts   median ${String(r.median).padStart(2)} -> ${String(r.castsOfMedian).padStart(2)} casts`);
  }
  console.log('');
}

console.log('── 2. WIN RATE AND FIGHT LENGTH, competent play ──\n');
const header = ['encounter'.padEnd(20), ...CANDIDATES.map(c => `mp${String(c).padStart(3)}`.padEnd(18))].join('');
console.log(header);
const results = {};
for (const [id, level] of LADDER) {
  const cells = [];
  for (const base of CANDIDATES) {
    // The pool is injected as a per-fight player override through the REAL
    // buildPlayerStats path — nothing in src/ is touched.
    const maxMP = base + LEVEL_GROWTH.maxMP * (level - 1);
    const r = batch({ ...enc(id), playerExtra: { maxMP, mp: maxMP } }, level, RUNS, { policy: competentTurn });
    cells.push(r);
    (results[id] ||= {})[base] = { level, win: r.winRate, rounds: r.avgRounds, hp: r.avgHpLeft };
  }
  console.log(id.padEnd(20) + cells.map(r =>
    `${(r.winRate * 100).toFixed(1)}% ${r.avgRounds.toFixed(2)}r`.padEnd(18)).join(''));
}

console.log('\n── 3. THE CASUAL FLOOR — this is the veto ──\n');
console.log(header);
const floor = {};
for (const [id, level] of LADDER) {
  const cells = [];
  for (const base of CANDIDATES) {
    const maxMP = base + LEVEL_GROWTH.maxMP * (level - 1);
    const r = batch({ ...enc(id), playerExtra: { maxMP, mp: maxMP } }, level, RUNS, { policy: casualTurn });
    cells.push(r);
    (floor[id] ||= {})[base] = { win: r.winRate, rounds: r.avgRounds };
  }
  console.log(id.padEnd(20) + cells.map(r =>
    `${(r.winRate * 100).toFixed(1)}% ${r.avgRounds.toFixed(2)}r`.padEnd(18)).join(''));
}

console.log('\n── 4. DELTAS AGAINST SHIPPED ──\n');
for (const base of CANDIDATES) {
  if (base === SHIPPED) continue;
  let dWinC = 0, dWinF = 0, dRounds = 0, n = 0;
  for (const [id] of LADDER) {
    dWinC += (results[id][base].win - results[id][SHIPPED].win) * 100;
    dWinF += (floor[id][base].win - floor[id][SHIPPED].win) * 100;
    dRounds += results[id][base].rounds - results[id][SHIPPED].rounds;
    n++;
  }
  console.log(`  base ${base}:  competent win ${(dWinC / n >= 0 ? '+' : '')}${(dWinC / n).toFixed(2)} pp`
    + `   casual win ${(dWinF / n >= 0 ? '+' : '')}${(dWinF / n).toFixed(2)} pp`
    + `   fight length ${(dRounds / n >= 0 ? '+' : '')}${(dRounds / n).toFixed(2)} rounds`);
}
console.log('\nNo number is shipped by this tool. See');
console.log('.claude/plans/playtest-notes/b24-coffee-proposal.md for the recommendation.');
