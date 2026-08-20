// Working-style check arms: the happy path (parse -> emit -> print round
// trip) and every diagnostic the feature added, each SEEN RED — this repo's
// law is that a gate that has never been seen to fail is not a gate (judge
// finding 2 on the pilot: the diagnostics shipped smoke-tested but with no
// committed red case). Run beside test-diagnostics.mjs.
import { parseDlg } from './parse.mjs';
import { emitNodes } from './emit.mjs';
import { allocate } from './lock.mjs';
import { printScenes } from './print.mjs';

let pass = 0;
let fail = 0;
const ok = (cond, name, extra = '') => {
  if (cond) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.log(`FAIL ${name}${extra ? ` — ${extra}` : ''}`); }
};

// ── 1. The happy path ──
const good = `scene wsc_test
  Narrator: A machine waits.
  @q
  ask Janet: Who brews?
    -> brew_pass requires met_janet check trait_percolator: I know this machine.
    fail -> brew_fail: I can also make coffee. Legally speaking.
    -> skip_it: Nobody. We have work.
  @brew_pass
  set check_test_passed
  goto out
  @brew_fail
  Janet: Noted.
  @skip_it
  Janet: Fine.
  @out
  end
`;
const parsed = parseDlg(good, 'wsc-test.dlg');
ok(parsed.diagnostics.length === 0, 'good file parses clean', JSON.stringify(parsed.diagnostics.map(d => d.message)));
const scene = parsed.scenes[0];
const alloc = allocate(scene.id, scene.stmts);
const nodes = emitNodes(scene, alloc.indexOf, alloc.length, alloc.pads);
const askNode = nodes.find(n => n.type === 'choice');
const arm = askNode.choices[0];
ok(arm.check === 'trait_percolator', 'check field emitted');
ok(arm.failText === 'I can also make coffee. Legally speaking.', 'failText emitted verbatim');
ok(Number.isInteger(arm.failNext) && nodes[arm.failNext]?.type === 'text', 'failNext resolved to the fail label');
ok(arm.requires === 'met_janet', 'check combines with requires');
ok(askNode.choices[1].check === undefined && askNode.choices[1].failText === undefined, 'plain arm untouched');
ok(alloc.lockAfter.scenes.wsc_test.arms?.[String(nodes.indexOf(askNode))]?.[0] === 'brew_pass|brew_fail',
  'arm ledger records the check arm as target|failTarget');

// Round trip: print -> reparse -> emit, identical JSON.
const printed = printScenes(parsed.scenes, parsed.comments);
const reparsed = parseDlg(printed, 'wsc-roundtrip.dlg');
ok(reparsed.diagnostics.length === 0, 'printed file reparses clean', JSON.stringify(reparsed.diagnostics.map(d => d.message)));
const re = reparsed.scenes[0];
const reAlloc = allocate(re.id, re.stmts);
const reNodes = emitNodes(re, reAlloc.indexOf, reAlloc.length, reAlloc.pads);
ok(JSON.stringify(reNodes) === JSON.stringify(nodes), 'print/parse round trip is identical');

// ── 2. Every diagnostic, seen red ──
const cases = [
  ['check arm with no fail line', `scene t1
  @q
  ask: Q?
    -> a check trait_percolator: pass
  @a
  end
`, 'needs a fail line'],
  ['fail line after a plain arm', `scene t2
  @q
  ask: Q?
    -> a: plain
    fail -> a: nope
  @a
  end
`, 'must immediately follow a choice arm that carries a check'],
  ['fail line with no ask at all', `scene t3
  Narrator: Hello.
  fail -> a: nope
  end
`, 'must immediately follow a choice arm'],
  ['two fail lines on one arm', `scene t4
  @q
  ask: Q?
    -> a check trait_percolator: pass
    fail -> a: one
    fail -> a: two
  @a
  end
`, 'exactly one'],
  ['check combined with sets', `scene t5
  @q
  ask: Q?
    -> a check trait_percolator sets oops: pass
    fail -> a: joke
  @a
  end
`, 'may not carry a sets modifier'],
  ['fail line with unresolved label', `scene t6
  @q
  ask: Q?
    -> a check trait_percolator: pass
    fail -> missing: joke
  @a
  end
`, 'does not define'],
  ['fail line with modifiers', `scene t7
  @q
  ask: Q?
    -> a check trait_percolator: pass
    fail -> a sets oops: joke
  @a
  end
`, 'takes no other modifiers'],
  ['fail line without a prose colon', `scene t8
  @q
  ask: Q?
    -> a check trait_percolator: pass
    fail -> a
  @a
  end
`, 'colon followed by its prose'],
];
for (const [name, source, needle] of cases) {
  const p = parseDlg(source, 'diag.dlg');
  const hit = p.diagnostics.some(d => d.message.includes(needle));
  ok(hit, `diagnostic red: ${name}`, `got: ${JSON.stringify(p.diagnostics.map(d => d.message))}`);
}

console.log(`${fail === 0 ? 'PASS' : 'FAIL'} total: ${pass}/${pass + fail} check-arm cases`);
if (fail) process.exitCode = 1;
