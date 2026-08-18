// _q-trait-sim.mjs — measures the three WORKING STYLE perks (Janet's quiz,
// src/data/traits.js) against the ≤ ~2 pp win-rate bar the commission set at
// karen@3. Report-only; nothing in src/ is modified.
//
// The perks are plumbed in CombatState (not the engine), so this harness
// reproduces each hook the same way CombatState applies it:
//   advance_reader  — engine.player.momentum = 10 at fight start (onEngine)
//   percolator      — +1 MP at each of Andrew's turn starts (processTurnStart
//                     wrap, player entity only — exactly the CombatState hook)
//   shock_absorber  — brace bands ×1.2, through the same relic channel the
//                     sim already models (cfg.relic.braceWindow), under both
//                     the steady and the shaky aim models
//
//   node tools/_q-trait-sim.mjs                    # karen@3 + context rungs
//   node tools/_q-trait-sim.mjs --runs 4000
//
// Policies: COMPETENT exercises all three hooks; CASUAL never Braces, so the
// shock_absorber row is structurally 0.0 there — reported, not hidden.

import {
  batch, enc, competentTurn, casualTurn, NO_RELIC, AIM_STEADY, AIM_SHAKY,
} from './combat-sim.mjs';
import { TRAITS } from '../src/data/traits.js';

const RUNS = Number(process.argv.find(a => a.startsWith('--runs'))
  ? process.argv[process.argv.indexOf('--runs') + 1] : 3000);

const AR = TRAITS.advance_reader.perk.startMomentum;   // 10
const SA = TRAITS.shock_absorber.perk.qteWindow;       // 1.2
const PC = TRAITS.percolator.perk.mpPerTurn;           // 1

const arms = {
  baseline: {},
  advance_reader: {
    opts: { onEngine: (e) => { e.player.momentum = Math.min(100, AR); } },
  },
  percolator: {
    opts: {
      onEngine: (e) => {
        const orig = e.processTurnStart.bind(e);
        e.processTurnStart = (ent) => {
          const r = orig(ent);
          if (ent === e.player) e.player.mp = Math.min(e.player.maxMP, e.player.mp + PC);
          return r;
        };
      },
    },
  },
  shock_absorber: {
    cfg: { relic: { ...NO_RELIC, braceWindow: SA } },
  },
  'shock_absorber (shaky aim)': {
    cfg: { relic: { ...NO_RELIC, braceWindow: SA, aim: AIM_SHAKY } },
    baseCfg: { relic: { ...NO_RELIC, aim: AIM_SHAKY } },
  },
};

const rungs = [
  ['karen', 3],       // THE BAR — the commission's named rung
  ['chad', 5],
  ['grandma', 7],
];
const policies = [['COMPETENT', competentTurn], ['CASUAL', casualTurn]];

const pp = (x) => (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + ' pp';

console.log(`=== WORKING STYLE perk A/B — ${RUNS} runs/arm ===`);
console.log(`values: advance_reader startMomentum=${AR}  shock_absorber qteWindow=${SA}  percolator mpPerTurn=${PC}\n`);

for (const [polName, policy] of policies) {
  console.log(`── policy: ${polName} ──`);
  for (const [encId, level] of rungs) {
    const base = enc(encId);
    const baselineByCfg = new Map();
    const baseFor = (armDef) => {
      const key = JSON.stringify(armDef.baseCfg || {});
      if (!baselineByCfg.has(key)) {
        baselineByCfg.set(key, batch({ ...base, ...(armDef.baseCfg || {}) }, level, RUNS, { policy }));
      }
      return baselineByCfg.get(key);
    };
    for (const [name, armDef] of Object.entries(arms)) {
      if (name === 'baseline') { baseFor(armDef); continue; }
      if (polName === 'CASUAL' && name.startsWith('shock_absorber')) {
        console.log(`  ${encId}@${level}  ${name.padEnd(28)} 0.0 pp by construction (CASUAL never Braces)`);
        continue;
      }
      const b = baseFor(armDef);
      const r = batch({ ...base, ...(armDef.cfg || {}) }, level, RUNS, { policy, ...(armDef.opts || {}) });
      console.log(`  ${encId}@${level}  ${name.padEnd(28)} win ${ (r.winRate * 100).toFixed(1) }% vs ${ (b.winRate * 100).toFixed(1) }%  Δ ${pp(r.winRate - b.winRate)}   rounds ${r.avgRounds.toFixed(2)} vs ${b.avgRounds.toFixed(2)}  hpLeft ${(r.avgHpLeft * 100).toFixed(1)}% vs ${(b.avgHpLeft * 100).toFixed(1)}%`);
    }
  }
  console.log('');
}
console.log('BAR: each perk ≤ ~2 pp at karen@3. Anything above is a FAIL for the packet.');
