// _dr-corpus.mjs — READ-ONLY measurement of the dialog corpus for the
// dialog-refactor design. Prints structural statistics only; writes nothing.
//   node tools/_dr-corpus.mjs
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const { DIALOGS } = await import(pathToFileURL(path.join(REPO, 'src/data/dialogs/index.js')).href);

const say = (s) => process.stdout.write(s + '\n');

let trees = 0, nodes = 0;
const byType = new Map();
const fieldsByType = new Map();
const actions = new Map();
const choiceFields = new Map();
let jumpsBack = 0, jumpsFwdSkip = 0, jumpsFallthrough = 0, totalJumps = 0;
let hubs = 0, conditionNodes = 0, stageNodes = 0, stageBeats = 0;
const treeSizes = [];
let choiceNodes = 0, choicesTotal = 0, choicesWithFlag = 0, choicesWithRequires = 0;
let padEnds = 0, endNodes = 0;
const flagsWritten = new Map();
const flagsRead = new Map();
let speakers = new Set();
let concurrentStages = 0;
let minMax = 0;

function bump(m, k, n = 1) { m.set(k, (m.get(k) || 0) + n); }

for (const [id, tree] of Object.entries(DIALOGS)) {
  trees++;
  treeSizes.push([id, tree.length]);
  tree.forEach((n, i) => {
    nodes++;
    bump(byType, n.type);
    if (!fieldsByType.has(n.type)) fieldsByType.set(n.type, new Map());
    for (const k of Object.keys(n)) bump(fieldsByType.get(n.type), k);
    if (n.speaker) speakers.add(n.speaker);
    if (n.minQuestStage !== undefined || n.maxQuestStage !== undefined) minMax++;
    if (n.type === 'action') {
      bump(actions, n.action);
      if (n.action === 'set_flag') bump(flagsWritten, n.flag);
    }
    if (n.type === 'condition') { conditionNodes++; bump(flagsRead, n.flag); }
    if (n.type === 'end') endNodes++;
    if (n.type === 'stage') {
      stageNodes++; stageBeats += (n.beats || []).length;
      if (n.concurrent) concurrentStages++;
    }
    if (n.type === 'choice') {
      choiceNodes++;
      choicesTotal += (n.choices || []).length;
      for (const c of n.choices || []) {
        for (const k of Object.keys(c)) bump(choiceFields, k);
        if (c.flag) choicesWithFlag++;
        if (c.requires || c.requiresNot) choicesWithRequires++;
        if (c.next !== undefined) {
          totalJumps++;
          if (c.next < i) jumpsBack++; else if (c.next > i + 1) jumpsFwdSkip++; else jumpsFallthrough++;
        }
      }
    }
    for (const k of ['next', 'ifTrue', 'ifFalse', 'fallback']) {
      if (n[k] === undefined) continue;
      totalJumps++;
      if (n[k] < i) jumpsBack++; else if (n[k] > i + 1) jumpsFwdSkip++; else jumpsFallthrough++;
    }
  });
  // padding ends: an `end` node with no inbound edge
  const inbound = new Set();
  tree.forEach((n, i) => {
    const push = (t) => { if (t !== undefined) inbound.add(t); };
    if (n.type === 'end') return;
    if (n.type === 'choice') { for (const c of n.choices || []) push(c.next !== undefined ? c.next : i + 1); if (n.fallback !== undefined) push(n.fallback); return; }
    if (n.type === 'condition') { push(n.ifTrue !== undefined ? n.ifTrue : i + 1); push(n.ifFalse !== undefined ? n.ifFalse : i + 1); return; }
    push(n.next !== undefined ? n.next : i + 1);
  });
  tree.forEach((n, i) => { if (n.type === 'end' && !inbound.has(i) && i !== 0) padEnds++; });
  if ((tree.filter(n => n.type === 'choice').length) >= 2) hubs++;
}

say(`TREES: ${trees}   NODES: ${nodes}   mean ${(nodes / trees).toFixed(1)} nodes/tree`);
treeSizes.sort((a, b) => b[1] - a[1]);
say(`largest: ${treeSizes.slice(0, 8).map(([k, v]) => `${k}=${v}`).join('  ')}`);
say(`smallest count: ${treeSizes.filter(([, v]) => v <= 2).length} trees of <=2 nodes`);
say('');
say('NODE TYPES: ' + [...byType].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
say('');
for (const [t, m] of fieldsByType) {
  say(`fields on ${t}: ` + [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
}
say('');
say('ACTIONS: ' + [...actions].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  '));
say('');
say(`CHOICE nodes ${choiceNodes}, choices ${choicesTotal} (mean ${(choicesTotal / choiceNodes).toFixed(2)}), with flag ${choicesWithFlag}, with requires/requiresNot ${choicesWithRequires}`);
say('choice fields: ' + [...choiceFields].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
say('');
say(`JUMPS: total explicit ${totalJumps} — backward ${jumpsBack}, forward-skip ${jumpsFwdSkip}, redundant(+1) ${jumpsFallthrough}`);
say(`condition nodes ${conditionNodes}   end nodes ${endNodes}   unreferenced 'end' pads ${padEnds}`);
say(`stage nodes ${stageNodes} (${concurrentStages} concurrent), ${stageBeats} beats`);
say(`nodes carrying min/maxQuestStage: ${minMax}`);
say(`trees with >=2 choice nodes (hub-shaped): ${hubs}`);
say(`distinct speakers: ${speakers.size}`);
say('');
say(`distinct flags written by set_flag: ${flagsWritten.size}`);
say(`distinct flags read by condition:   ${flagsRead.size}`);
const writtenOnce = [...flagsWritten].filter(([, v]) => v === 1).length;
say(`flags written by exactly one node:  ${writtenOnce}`);
const readNeverWritten = [...flagsRead.keys()].filter(k => !flagsWritten.has(k));
say(`flags read by a condition but never written by any set_flag: ${readNeverWritten.length}`);
say('  ' + readNeverWritten.slice(0, 40).join(' '));
