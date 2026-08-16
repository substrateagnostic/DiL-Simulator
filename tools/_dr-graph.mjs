// _dr-graph.mjs — READ-ONLY. Sizes the story-graph and routing-table extraction:
// how many jump targets need labels, how many routing rules exist, how many
// spend-before-grant one-shot latches, and which dialogs are unreachable from
// any known entry point. Prints; writes nothing.
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const { DIALOGS } = await import(pathToFileURL(path.join(REPO, 'src/data/dialogs/index.js')).href);
const { ROOMS } = await import(pathToFileURL(path.join(REPO, 'src/data/rooms/index.js')).href);
const { ENCOUNTERS } = await import(pathToFileURL(path.join(REPO, 'src/data/encounters/index.js')).href);
const say = (s) => process.stdout.write(s + '\n');

// ── 1. label demand: how many nodes are the target of an explicit jump? ──
let targets = 0, explicitJumps = 0, nodes = 0;
for (const tree of Object.values(DIALOGS)) {
  const t = new Set();
  tree.forEach((n, i) => {
    nodes++;
    for (const k of ['next', 'ifTrue', 'ifFalse', 'fallback']) {
      if (n[k] !== undefined) { t.add(n[k]); explicitJumps++; }
    }
    for (const c of n.choices || []) if (c.next !== undefined) { t.add(c.next); explicitJumps++; }
  });
  targets += t.size;
}
say(`LABEL DEMAND: ${targets} distinct jump targets across ${nodes} nodes (${(100 * targets / nodes).toFixed(1)}% of nodes need a label)`);
say(`explicit jump sites: ${explicitJumps}`);

// ── 2. routing rules in _getDialogId ──
const es = readFileSync(path.join(REPO, 'src/states/ExplorationState.js'), 'utf8').split('\n');
const start = es.findIndex(l => l.includes('_getDialogId(npc) {'));
const end = es.findIndex((l, i) => i > start && /^  _createHUD\(\)/.test(l));
const body = es.slice(start, end);
const returns = body.filter(l => /return\s+[`'"]/.test(l) || /return\s+\w+;/.test(l)).length;
const ifs = body.filter(l => /^\s*if\s*\(/.test(l)).length;
say('');
say(`ROUTING: _getDialogId spans ExplorationState.js:${start + 1}-${end} (${body.length} lines), ${ifs} \`if\` statements, ${returns} return sites`);

// ── 3. spend-before-grant one-shots in the room-entered block ──
say('');
say('ONE-SHOT LATCHES set by ExplorationState before pushing a dialog:');
es.forEach((l, i) => {
  const m = l.match(/this\.player\.setFlag\('([a-z0-9_]+)'\)\s*;/);
  if (m) say(`  ExplorationState.js:${i + 1}  ${m[1]}`);
});

// ── 4. reachability: which dialog ids are referenced anywhere? ──
const referenced = new Set();
const src = [
  readFileSync(path.join(REPO, 'src/states/ExplorationState.js'), 'utf8'),
  readFileSync(path.join(REPO, 'src/data/rooms/index.js'), 'utf8'),
  readFileSync(path.join(REPO, 'src/data/encounters/index.js'), 'utf8'),
  readFileSync(path.join(REPO, 'src/states/CombatState.js'), 'utf8'),
].join('\n');
for (const id of Object.keys(DIALOGS)) {
  const re = new RegExp(`['"\`]${id}['"\`]`);
  if (re.test(src)) referenced.add(id);
}
// plus: reachable by the generic act/intro/return ladder from any NPC id
const npcIds = new Set();
for (const r of Object.values(ROOMS)) for (const n of r.npcs || []) npcIds.add(n.id);
for (const id of Object.keys(DIALOGS)) {
  for (const suffix of ['_intro', '_return', '_act2', '_act3', '_act4', '_act6', '_act7', '_retry']) {
    if (id.endsWith(suffix) && npcIds.has(id.slice(0, -suffix.length))) referenced.add(id);
  }
  if (npcIds.has(id)) referenced.add(id);
}
for (const e of Object.values(ENCOUNTERS)) {
  if (e.preDialogId) referenced.add(e.preDialogId);
  if (e.postDialogId) referenced.add(e.postDialogId);
}
const orphans = Object.keys(DIALOGS).filter(id => !referenced.has(id));
say('');
say(`DIALOG REACHABILITY (static name search over routing code + rooms + encounters):`);
say(`  ${referenced.size}/${Object.keys(DIALOGS).length} dialog ids appear as a literal somewhere; ${orphans.length} do not:`);
for (const o of orphans) say(`    ${o}`);
