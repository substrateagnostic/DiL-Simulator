import { batchJ, SHIPPED, D2 } from './_j-econ-topology.mjs';
import { enc, competentTurn, buildPartyOverrides } from './combat-sim.mjs';
const rows = [{id:'karen',level:4},{id:'grandma',level:8},{id:'rachel_boss',level:9},{id:'algorithm',level:10,party:['janet','isaiah']}];
const cfgFor = (r) => { const c = enc(r.id); if (r.party) c.party = r.party; c.partyOverrides = buildPartyOverrides(c.party, r.level); return c; };
const RUNS = parseInt(process.argv[2]||'200',10);
for (const row of rows) {
  for (const [lbl,top,lane,pol] of [['SHIPPED',SHIPPED,'baseline',competentTurn],['D2/base',D2,'baseline',competentTurn],['D2/litig',D2,'litigator',null],['D2/defl',D2,'deflector',null],['D2/accr',D2,'accrual',null],['D2/escal',D2,'escalator',null],['D2/logi',D2,'logistician',null]]) {
    const r = batchJ(cfgFor(row), row.level, RUNS, top, lane, pol);
    const per = (o)=>Object.fromEntries(Object.entries(o).map(([k,v])=>[k,(v/RUNS).toFixed(0)]));
    console.log(`${row.id}@${row.level}`.padEnd(18), lbl.padEnd(10),
      'win',(r.winRate*100).toFixed(1).padStart(5), 'rnd',r.avgRounds.toFixed(2).padStart(6),
      'hp',(r.avgHpLeft*100).toFixed(1).padStart(5), 'brk',r.breaks.toFixed(2),
      'refl',r.reflected.toFixed(0).padStart(4), 'comp/fight',JSON.stringify(per(r.compBySrc)));
  }
  console.log('');
}
