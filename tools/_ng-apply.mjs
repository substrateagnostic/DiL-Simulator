// _ng-apply.mjs — apply / revert the NG+ re-tune proposal as a whole.
//
// The proposal is DARK: nothing in `src/` carries it at rest (the l-run
// `_l-apply.mjs` precedent — balance is producer-gated, always). This script is
// the only thing that writes it, it is idempotent in both directions, and it is
// what generates `.claude/plans/ng-run/PROPOSAL.diff`:
//
//   node tools/_ng-apply.mjs --on          # write the re-tune into the tree
//   git --no-pager diff > .claude/plans/ng-run/PROPOSAL.diff
//   node tools/_ng-apply.mjs --off         # put the tree back
//   node tools/_ng-apply.mjs --check       # report which state the tree is in
//
// Every number below was measured through `tools/_ng-retune.mjs --cand P4`,
// which applies the SAME writes to the SAME live objects — so the capture and
// the table cannot describe different builds.
//
// WHAT IT TOUCHES: the three NG_PLUS_* export lines in CombatEngine.js and
// nothing else. The comment block above those constants and the Gameplay.md
// NG+ tables describe the SHIPPED ladder; both are listed in PROPOSAL.md as
// on-signature deliverables and are deliberately NOT patched here — a dark
// diff that rewrites prose is a dark diff nobody can read.
import { readFileSync, writeFileSync } from 'fs';

const ON = process.argv.includes('--on');
const OFF = process.argv.includes('--off');
const CHECK = process.argv.includes('--check') || (!ON && !OFF);

const ENG = 'src/combat/CombatEngine.js';

// ── THE PROPOSAL (candidate P4 in tools/_ng-retune.mjs) ─────────────────
// entry maxHP 1.70 -> 1.45   (the rounds bill: NG+ stops buying difficulty
//                             with fight length)
// per-lap maxHP 1.15 -> 1.10 (same bill, lap term)
// per-lap atk 1.15 -> 1.22   (the staircase, bought back at NG+2/NG+3 only —
//                             lap exponents are 0/0/1/1+d, so NG+1 and the
//                             Hard x NG+1 stack cannot move)
// decay 0.35 -> 0.85         (NG+3 re-steepened without touching NG+1/NG+2)
// entry atk / def / xpReward untouched; per-lap def / xpReward untouched.
const SHIPPED = {
  entry: 'export const NG_PLUS_ENTRY   = { maxHP: 1.70, atk: 1.45, def: 1.30, xpReward: 1.25 };',
  scaling: 'export const NG_PLUS_SCALING = { maxHP: 1.15, atk: 1.15, def: 1.10, xpReward: 1.20 };',
  lap: 'export const NG_PLUS_LAP = { decay: 0.35 };',
};
const PROPOSED = {
  entry: 'export const NG_PLUS_ENTRY   = { maxHP: 1.45, atk: 1.45, def: 1.30, xpReward: 1.25 };',
  scaling: 'export const NG_PLUS_SCALING = { maxHP: 1.10, atk: 1.22, def: 1.10, xpReward: 1.20 };',
  lap: 'export const NG_PLUS_LAP = { decay: 0.85 };',
};

function patch(on) {
  const s = readFileSync(ENG, 'utf8');
  let out = s;
  const from = on ? SHIPPED : PROPOSED;
  const to = on ? PROPOSED : SHIPPED;
  for (const k of Object.keys(SHIPPED)) {
    if (out.includes(to[k])) continue;          // already in the target state
    if (!out.includes(from[k])) {
      console.error(`FAULT: neither state of NG_PLUS ${k} line found — the file has drifted.`);
      console.error(`  expected: ${from[k]}`);
      process.exit(1);
    }
    out = out.replace(from[k], to[k]);
  }
  if (out !== s) writeFileSync(ENG, out);
}

function state() {
  const s = readFileSync(ENG, 'utf8');
  const st = {};
  for (const k of Object.keys(SHIPPED)) {
    st[k] = s.includes(PROPOSED[k]) ? 'ON' : s.includes(SHIPPED[k]) ? 'OFF' : 'DRIFTED';
  }
  return st;
}

if (ON || OFF) {
  patch(ON);
  console.log(ON ? 'PROPOSAL APPLIED' : 'PROPOSAL REVERTED');
}
const st = state();
console.log(JSON.stringify(st, null, 1));
if (Object.values(st).includes('DRIFTED')) {
  console.error('=> tree has DRIFTED from both states; do not trust --on/--off until resolved.');
  process.exit(1);
}
console.log(Object.values(st).every(v => v === 'ON') ? '=> tree is ON (proposal applied)'
  : Object.values(st).every(v => v === 'OFF') ? '=> tree is OFF (shipped baseline)'
    : '=> tree is MIXED — rerun --on or --off.');
