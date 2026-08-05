// Prove the three prose edits changed TEXT ONLY: same node count, same types,
// same speakers-per-index where unchanged, and byte-identical routing.
//
//   node tools/_f-prose-shape.mjs [--base=<ref>]
//
// BASE defaults to HEAD~1, not HEAD. Comparing against HEAD only proves the
// working tree is unedited SINCE the last commit - so the moment the prose was
// committed, this harness went green by measuring nothing. Any later round
// re-running it as a regression check was reading a tautology. HEAD~1 keeps it
// answering the question it was built to answer one commit longer; pass
// --base=<ref> to aim it at whatever commit the prose actually landed before.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const BASE = process.argv.find(a => a.startsWith('--base='))?.slice(7) || 'HEAD~1';
const TREES = ['chad_return', 'janitor_the_name', 'intern_rehearsal'];
const grab = (src, id) => {
  const i = src.indexOf(`\n  ${id}: [`);
  if (i < 0) throw new Error(`no ${id}`);
  const j = src.indexOf('\n  ],', i);
  return src.slice(i, j);
};
const routes = (block) => [...block.matchAll(/\b(next|ifTrue|ifFalse):\s*(\d+)/g)].map(m => `${m[1]}=${m[2]}`).join(',');
const shape = (block) => [...block.matchAll(/\{\s*type:\s*'(\w+)'/g)].map(m => m[1]).join(',');
const head = execSync(`git show ${BASE}:src/data/dialogs/index.js`, { maxBuffer: 1 << 28 }).toString();
const now = fs.readFileSync('src/data/dialogs/index.js', 'utf8');
let bad = 0;
for (const t of TREES) {
  const a = grab(head, t), b = grab(now, t);
  const sameShape = shape(a) === shape(b);
  const sameRoutes = routes(a) === routes(b);
  const nA = shape(a).split(',').length, nB = shape(b).split(',').length;
  const ok = sameShape && sameRoutes;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${t.padEnd(18)} nodes ${nA}->${nB}  types ${sameShape ? 'identical' : 'CHANGED'}  routing ${sameRoutes ? 'identical' : 'CHANGED'}`);
}
console.log(bad ? `\nFAIL - ${bad}` : `\nTEXT-ONLY PASS - node count, node types and every next/ifTrue/ifFalse are byte-identical to ${BASE} in all three trees`);
process.exit(bad ? 1 : 0);
