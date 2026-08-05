// _j-floor.mjs — THE CASUAL / PIP FLOOR, as a SAME-INSTRUMENT A/B.
//
// The dossier's hard constraint: CASUAL never lands a tagged hit and never
// Braces, so every Practice Group node and the whole Pivot are unreachable by
// construction. The floor must not move.
//
// Deliberately imports NOTHING from the J package (no TIER_LEVEL, no
// PRACTICE_GROUPS, no tree data) so the SAME FILE runs against the pre-J tree
// and the shipped one. That is what makes this an A/B rather than two
// measurements taken a week apart against a printed table.
//
//   node tools/_j-floor.mjs --runs 800 --tag before
//   node tools/_j-floor.mjs --runs 800 --tag after
//   node tools/_j-floor.mjs --diff before after
import { runFight, enc, casualTurn, unlockedAbilities } from './combat-sim.mjs';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const OUT = 'C:/Users/agall/projects/DiL_Simulator/screenshots/j-run';
mkdirSync(OUT, { recursive: true });
const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};
const RUNS = Number(arg('runs', 800));
const pct = (x) => (x * 100).toFixed(1) + '%';

// The two endgame bosses are fought with the bench; running them solo measures
// a fight the game never serves.
const PARTY = { regional_director: ['janet', 'isaiah'], algorithm: ['janet', 'isaiah'] };
const CELLS = [
  ['karen', 3], ['karen', 4], ['grandma', 7], ['grandma', 8],
  ['meredith_boss', 9], ['regional_director', 10], ['algorithm', 10],
];
const PIPS = [0, 0.20, 0.30];

const diffMode = process.argv.includes('--diff');
if (diffMode) {
  const i = process.argv.indexOf('--diff');
  const a = JSON.parse(readFileSync(join(OUT, `floor-${process.argv[i + 1]}.json`), 'utf8'));
  const b = JSON.parse(readFileSync(join(OUT, `floor-${process.argv[i + 2]}.json`), 'utf8'));
  console.log(`\n=== CASUAL / PIP FLOOR — ${process.argv[i + 1]} vs ${process.argv[i + 2]} (${a.runs} runs/cell) ===`);
  console.log('encounter               lvl   PIP 0%            PIP 20%           PIP 30%');
  let sum = 0, n = 0, down = 0, up = 0, flat = 0;
  for (const key of Object.keys(a.cells)) {
    const [e, lv] = key.split('@');
    const row = PIPS.map((_, k) => {
      const x = a.cells[key][k], y = b.cells[key][k];
      const d = (y - x) * 100;
      sum += Math.abs(d); n++;
      if (d < -0.05) down++; else if (d > 0.05) up++; else flat++;
      return `${pct(x)} -> ${pct(y)} ${d >= 0 ? '+' : ''}${d.toFixed(1)}`.padStart(24);
    });
    console.log(`${e.padEnd(22)} ${lv.padStart(3)} ${row.join(' ')}`);
  }
  console.log(`\nMEAN |delta| ACROSS ${n} CELLS: ${(sum / n).toFixed(2)} pp   (${down} down, ${up} up, ${flat} flat)`);
  console.log('The dossier\'s own bar: non-directional, ~1.7 pp mean, no stat compensation charged to the floor.');
  process.exit(0);
}

const cells = {};
for (const [e, lv] of CELLS) {
  const cfg = enc(e);
  if (PARTY[e] && cfg.party.length === 0) cfg.party = [...PARTY[e]];
  cells[`${e}@${lv}`] = PIPS.map((pip) => {
    let wins = 0;
    for (let i = 0; i < RUNS; i++) {
      const r = runFight({ ...cfg, unlocked: unlockedAbilities(lv), pipResist: pip }, lv, { policy: casualTurn });
      if (r.win) wins++;
    }
    return wins / RUNS;
  });
  console.log(`${e}@${lv}  ${cells[`${e}@${lv}`].map(pct).join('  ')}`);
}
const tag = arg('tag', 'after');
writeFileSync(join(OUT, `floor-${tag}.json`), JSON.stringify({ runs: RUNS, cells }, null, 1));
console.log(`\nwrote ${join(OUT, `floor-${tag}.json`)}`);
