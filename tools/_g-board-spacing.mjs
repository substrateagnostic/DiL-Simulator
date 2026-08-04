// Crowding measurement over a `_g-cut-shoot` take: the smallest distance
// between any two actors on any sampled frame, and where it happened.
//
// The board meeting's `speak_west` / `speak_east` marks used to sit 0.40 tiles
// directly behind an occupied chair, so an ally addressing the board stood
// inside a seated body. This puts a number on it.
//
//   node tools/_g-board-spacing.mjs screenshots/g-run/cutscenes/board_meeting/actors.json [--min=0.6]
import fs from 'node:fs';
import path from 'node:path';

const FILE = process.argv.find(a => a.endsWith('.json'));
const MIN = Number((process.argv.find(a => a.startsWith('--min=')) || '').split('=')[1] || 0.6);
const data = JSON.parse(fs.readFileSync(path.resolve(FILE), 'utf8'));

let worst = { d: Infinity };
const perPair = new Map();
let frames = 0;
for (const s of data.samples) {
  const ids = Object.keys(s.a);
  frames++;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const A = s.a[ids[i]], B = s.a[ids[j]];
      const d = Math.hypot(A.x - B.x, A.z - B.z);
      const key = `${ids[i]}|${ids[j]}`;
      if (!perPair.has(key) || perPair.get(key).d > d) perPair.set(key, { d, t: s.t, at: [A.x, A.z] });
      if (d < worst.d) worst = { d, t: s.t, a: ids[i], b: ids[j], ax: A.x, az: A.z, bx: B.x, bz: B.z };
    }
  }
}

// The gated number is ALLY-vs-SEATED-BOARD-MEMBER: that is what the
// `speak_west` / `speak_east` marks control, and the only pair class the mark
// nudge can move. Ally-vs-ally and Skip's BLOCK-H return route are separate,
// PRE-EXISTING crowding and are reported but not gated — moving a mark cannot
// fix a walk leg.
const ALLIES = new Set(['janet', 'diane', 'intern', 'isaiah', 'grandma']);
const SEATED = (id) => id.startsWith('board_member') || id === 'board_chair';
let gated = { d: Infinity };
for (const [k, v] of perPair) {
  const [a, b] = k.split('|');
  const isGated = (ALLIES.has(a) && SEATED(b)) || (ALLIES.has(b) && SEATED(a));
  if (isGated && v.d < gated.d) gated = { d: v.d, pair: k, t: v.t };
}

console.log(`${path.basename(path.dirname(path.resolve(FILE)))}  frames=${frames}  actors=${Object.keys(data.report).length}`);
console.log(`whole-take MIN pairwise: ${worst.d.toFixed(3)} tiles  (${worst.a} @${worst.ax},${worst.az}  vs  ${worst.b} @${worst.bx},${worst.bz}  at t=${worst.t}ms)`);
console.log(`GATED  ally vs seated board member: ${gated.d.toFixed(3)} tiles  (${(gated.pair || '').replace('|', ' vs ')} at t=${gated.t}ms)`);
const tight = [...perPair.entries()].sort((a, z) => a[1].d - z[1].d).slice(0, 10);
console.log('tightest pairs:');
for (const [k, v] of tight) console.log(`  ${k.replace('|', ' vs ').padEnd(42)} ${v.d.toFixed(3)}t  at t=${v.t}ms`);
console.log(gated.d >= MIN ? `PASS (ally-vs-seated >= ${MIN})` : `FAIL (ally-vs-seated < ${MIN})`);
if (gated.d < MIN) process.exit(1);
