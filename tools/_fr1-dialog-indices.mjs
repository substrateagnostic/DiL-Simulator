// FIX ROUND 1 — the append-only law, checked directly.
//
// tools/_g-stage-verify.mjs signs NODE CONTENT, so an AUTHORIZED in-place prose
// edit trips it and its FAIL cannot distinguish "someone reworded a line the
// producer asked them to reword" from "someone inserted a node into the middle
// of a tree and silently renumbered 80 jump targets". The second is the thing
// the law exists to prevent. This checks that one directly: tree count, tree
// LENGTHS, per-index node TYPES, and every jump target (next / ifTrue /
// ifFalse / fallback / choice.next) against HEAD.
//
// Run it beside stage-verify whenever a fix round edits dialog text in place.
// It needs HEAD dumped first:
//   git show HEAD:src/data/dialogs/index.js > <tmp>/head-dialogs.js
//   node tools/_fr1-dialog-indices.mjs
import { DIALOGS as NOW } from '../src/data/dialogs/index.js';
const HEAD = (await import('file:///C:/Users/agall/AppData/Local/Temp/claude/C--Users-agall-projects-DiL-Simulator/fa0e7e41-3b95-493d-99f2-c721aa26a910/scratchpad/head-dialogs.js')).DIALOGS;
let bad = 0;
const keysNow = Object.keys(NOW), keysHead = Object.keys(HEAD);
if (keysNow.length !== keysHead.length) { console.log(`tree COUNT changed ${keysHead.length} -> ${keysNow.length}`); bad++; }
for (const k of keysHead) {
  const a = HEAD[k], b = NOW[k];
  if (!b) { console.log(`tree removed: ${k}`); bad++; continue; }
  if (a.length !== b.length) { console.log(`LENGTH CHANGED ${k}: ${a.length} -> ${b.length}`); bad++; continue; }
  for (let i = 0; i < a.length; i++) {
    const ta = a[i]?.type, tb = b[i]?.type;
    // The one deliberate type change: poster_cf_5's broken `type:'Andrew'`.
    if (ta !== tb && !(k === 'poster_cf_5' && ta === 'Andrew' && tb === 'text')) {
      console.log(`TYPE CHANGED ${k}[${i}]: ${ta} -> ${tb}`); bad++;
    }
    const ja = JSON.stringify({ n: a[i]?.next, t: a[i]?.ifTrue, f: a[i]?.ifFalse, fb: a[i]?.fallback, c: (a[i]?.choices || []).map(c => c.next) });
    const jb = JSON.stringify({ n: b[i]?.next, t: b[i]?.ifTrue, f: b[i]?.ifFalse, fb: b[i]?.fallback, c: (b[i]?.choices || []).map(c => c.next) });
    if (ja !== jb) { console.log(`EDGE CHANGED ${k}[${i}]: ${ja} -> ${jb}`); bad++; }
  }
}
console.log(bad === 0 ? 'PASS — every index, every node type and every edge target is unchanged; only text moved.' : `FAIL — ${bad}`);
