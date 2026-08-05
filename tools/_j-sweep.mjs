import { batchJ, SHIPPED, D2 } from './_j-econ-topology.mjs';
import { enc, competentTurn, buildPartyOverrides } from './combat-sim.mjs';
const rows = [
  { id: 'karen', level: 4 }, { id: 'grandma', level: 8 },
  { id: 'rachel_boss', level: 9 }, { id: 'algorithm', level: 10, party: ['janet','isaiah'] },
];
const cfgFor = (r) => { const c = enc(r.id); if (r.party) c.party = r.party; c.partyOverrides = buildPartyOverrides(c.party, r.level); return c; };
const RUNS = parseInt(process.argv[2] || '200', 10);
const pct = x => (x*100).toFixed(1)+'%';
const lanes = ['baseline','litigator','deflector','accrual','escalator','logistician'];
console.log('bar  rot  lane          enc            lvl    win  rounds   hp    breaks   eff   effpct');
for (const row of rows) {
  const base = batchJ(cfgFor(row), row.level, RUNS, SHIPPED, 'baseline', competentTurn);
  const beff = base.avgRounds - base.fizzles - base.brokenTurns;
  console.log(`--   --   SHIPPED       ${row.id.padEnd(16)}${String(row.level).padStart(3)}  ${pct(base.winRate)}  ${base.avgRounds.toFixed(2)}  ${pct(base.avgHpLeft)}  ${base.breaks.toFixed(2)}   ${beff.toFixed(2)}  100%`);
  for (const bar of [1]) {
    for (const rot of [null, 0.7, 0.8]) {
      const top = { ...D2, barScale: bar, columnCap: rot };
      for (const lane of lanes) {
        const r = batchJ(cfgFor(row), row.level, RUNS, top, lane, lane==='baseline'?competentTurn:null);
        const eff = r.avgRounds - r.fizzles - r.brokenTurns;
        console.log(`${String(bar).padEnd(5)}${(rot?String(rot):'off').padEnd(5)}${lane.padEnd(14)}${row.id.padEnd(16)}${String(row.level).padStart(3)}  ${pct(r.winRate)}  ${r.avgRounds.toFixed(2)}  ${pct(r.avgHpLeft)}  ${r.breaks.toFixed(2)}   ${eff.toFixed(2)}  ${pct(eff/beff)}`);
      }
    }
  }
}
