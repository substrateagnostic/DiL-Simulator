// _h-econ-rachel.mjs — THROWAWAY. Sizes the one compensating knob the Ub
// variant actually needs. Meredith (rachel_boss) is the only encounter whose
// band moves more than ~3pp under a free ADMIN turn, because hers is the
// longest fight and therefore banks the most free Braces.
//
//   node tools/_h-econ-rachel.mjs
import { batchTB, VARIANTS } from './_h-econ-turnback.mjs';
import { enc, batch, competentTurn, casualTurn, buildPartyOverrides } from './combat-sim.mjs';
import { ENEMY_STATS } from '../src/data/stats.js';

const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);
const RUNS = parseInt(process.argv[2] || '400', 10);

const base = { atk: ENEMY_STATS.rachel_boss.atk, maxHP: ENEMY_STATS.rachel_boss.maxHP };
console.log(`Meredith stock: atk ${base.atk}, maxHP ${base.maxHP}\n`);

const ROWS = [
  { label: 'stock', atk: base.atk, hp: base.maxHP },
  { label: 'atk 21->23', atk: 23, hp: base.maxHP },
  { label: 'atk 21->24', atk: 24, hp: base.maxHP },
  { label: 'atk 21->25', atk: 25, hp: base.maxHP },
  { label: 'hp 900->1000', atk: base.atk, hp: 1000 },
  { label: 'atk 23 + hp 950', atk: 23, hp: 950 },
];

console.log('=== MEREDITH under Ub (free ADMIN turn) — COMPETENT L8/L9, CASUAL floor ===');
console.log('knob'.padEnd(18) + 'L8 win'.padStart(9) + 'L8 rnd'.padStart(8) + 'L8 hp'.padStart(8)
  + 'L9 win'.padStart(9) + 'L9 rnd'.padStart(8) + 'L9 hp'.padStart(8)
  + '| CASUAL L8 off'.padStart(16) + 'CAS L8 PIP20%'.padStart(15) + 'CAS L9 off'.padStart(12));
for (const row of ROWS) {
  ENEMY_STATS.rachel_boss.atk = row.atk;
  ENEMY_STATS.rachel_boss.maxHP = row.hp;
  const c8 = batchTB(enc('rachel_boss'), 8, RUNS, 'Uc');
  const c9 = batchTB(enc('rachel_boss'), 9, RUNS, 'Uc');
  const k8 = batch(enc('rachel_boss'), 8, RUNS, { policy: casualTurn });
  const k8p = batch({ ...enc('rachel_boss'), pipResist: 0.20 }, 8, RUNS, { policy: casualTurn });
  const k9 = batch(enc('rachel_boss'), 9, RUNS, { policy: casualTurn });
  console.log(row.label.padEnd(18)
    + pct(c8.winRate).padStart(9) + n2(c8.avgRounds).padStart(8) + pct(c8.avgHpLeft).padStart(8)
    + pct(c9.winRate).padStart(9) + n2(c9.avgRounds).padStart(8) + pct(c9.avgHpLeft).padStart(8)
    + ('| ' + pct(k8.winRate)).padStart(16) + pct(k8p.winRate).padStart(15) + pct(k9.winRate).padStart(12));
}
ENEMY_STATS.rachel_boss.atk = base.atk;
ENEMY_STATS.rachel_boss.maxHP = base.maxHP;

console.log('\n=== CONTROL — same rows with the turn-back OFF (what the knob costs Run C) ===');
console.log('knob'.padEnd(18) + 'L8 win'.padStart(9) + 'L8 rnd'.padStart(8) + 'L8 hp'.padStart(8)
  + 'L9 win'.padStart(9) + 'L9 rnd'.padStart(8) + 'L9 hp'.padStart(8));
for (const row of ROWS) {
  ENEMY_STATS.rachel_boss.atk = row.atk;
  ENEMY_STATS.rachel_boss.maxHP = row.hp;
  const c8 = batchTB(enc('rachel_boss'), 8, RUNS, 'off');
  const c9 = batchTB(enc('rachel_boss'), 9, RUNS, 'off');
  console.log(row.label.padEnd(18)
    + pct(c8.winRate).padStart(9) + n2(c8.avgRounds).padStart(8) + pct(c8.avgHpLeft).padStart(8)
    + pct(c9.winRate).padStart(9) + n2(c9.avgRounds).padStart(8) + pct(c9.avgHpLeft).padStart(8));
}
ENEMY_STATS.rachel_boss.atk = base.atk;
ENEMY_STATS.rachel_boss.maxHP = base.maxHP;
