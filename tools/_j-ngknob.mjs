import { batchJ, SHIPPED, D2 } from './_j-econ-topology.mjs';
import { enc, competentTurn, buildPartyOverrides, buildPlayerStats } from './combat-sim.mjs';
const NG = [{id:'rachel_boss',level:9},{id:'algorithm',level:10,party:['janet','isaiah']},{id:'grandma',level:8}];
const SHOP = { atk: 9, def: 9, maxHP: 60, spd: 6 };
const cfgFor = (r) => { const c = enc(r.id); if (r.party) c.party = r.party; c.partyOverrides = buildPartyOverrides(c.party, r.level); return c; };
function ngCfg(row, carried, laps) {
  const cfg = cfgFor(row);
  if (carried) { cfg.atkBonus = SHOP.atk; cfg.defBonus = SHOP.def; const b = buildPlayerStats(row.level);
    cfg.playerExtra = { maxHP: b.maxHP + SHOP.maxHP, hp: b.maxHP + SHOP.maxHP, spd: b.spd + SHOP.spd }; cfg.carryAll = true; }
  if (laps > 0) { cfg.ngPlus = true; cfg.ngPlusCount = laps; }
  return cfg;
}
const RUNS = parseInt(process.argv[2]||'250',10);
const KNOBS = [
  ['SHIPPED', SHIPPED],
  ['D2 as-is', D2],
  ['D2 + NG cap 0.55', { ...D2, columnCap: 0.55 }],
  ['D2 + NG attrition 6', { ...D2, attritionPerDebuff: 6 }],
  ['D2 + NG cap .55 + attr 6', { ...D2, columnCap: 0.55, attritionPerDebuff: 6 }],
];
console.log('NG+ SOFTENING KNOB — CARRY laps only. Target: restore the shipped top-rung difficulty.');
console.log('enc              lvl  knob                        FRESH@NG   CARRY+1   CARRY+2   CARRY+3');
for (const row of NG) {
  for (const [lbl, top] of KNOBS) {
    const f = batchJ(ngCfg(row,false,0), row.level, RUNS, lbl==='SHIPPED'?SHIPPED:D2, 'baseline', competentTurn);
    const cells = [1,2,3].map(l => (batchJ(ngCfg(row,true,l), row.level, RUNS, top, 'baseline', competentTurn).winRate*100).toFixed(1)+'%');
    console.log(`${row.id.padEnd(16)}${String(row.level).padStart(3)}  ${lbl.padEnd(26)}${(f.winRate*100).toFixed(1)+'%'.padStart(2)}`.padEnd(70), cells.map(c=>c.padStart(9)).join(''));
  }
  console.log('');
}
