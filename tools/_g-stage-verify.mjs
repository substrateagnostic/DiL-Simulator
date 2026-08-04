// Structural-equivalence gate for the cutscene-staging edit.
//
// CLAUDE.md's law: "NEVER insert a node into the middle of a dialog array" —
// every next / ifTrue / ifFalse / choice.next is an ABSOLUTE index. Staging
// therefore APPENDS `stage` nodes at the end of each tree and routes into them.
// This tool proves that is what happened: it diffs the working tree's dialogs
// against HEAD's, treating `stage` nodes as transparent (an edge that now goes
// text -> stage -> text must be reported as text -> text), and fails if any
// pre-existing node or edge changed.
//
//   node tools/_g-stage-verify.mjs            (compares against HEAD)
//   node tools/_g-stage-verify.mjs <ref>      (compares against <ref>)
//
// Also reports, for the NEW tree only: out-of-range jumps, nodes with no path
// from node 0, and every stage beat whose mark/actor cannot be resolved
// against src/data/rooms/index.js.

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const REF = process.argv[2] || 'HEAD';
const TMP = path.join(REPO, '.stage-verify-tmp');

function sig(n) {
  const c = { ...n };
  delete c.next; delete c.ifTrue; delete c.ifFalse; delete c.fallback;
  if (Array.isArray(c.choices)) c.choices = c.choices.map(ch => { const d = { ...ch }; delete d.next; return d; });
  return JSON.stringify(c);
}

// Every index a node can jump to, in declaration order.
function edges(tree, i) {
  const n = tree[i];
  if (!n) return [];
  const nx = n.next !== undefined ? n.next : i + 1;
  switch (n.type) {
    case 'end': return [];
    case 'condition': return [n.ifTrue !== undefined ? n.ifTrue : i + 1,
                             n.ifFalse !== undefined ? n.ifFalse : i + 1];
    case 'choice': {
      const out = (n.choices || []).map(c => (c.next !== undefined ? c.next : i + 1));
      if (n.fallback !== undefined) out.push(n.fallback);
      return out;
    }
    default: return [nx];
  }
}

// Walk THROUGH stage nodes so an edge reads the same before and after.
function resolve(tree, i) {
  const seen = new Set();
  while (tree[i] && tree[i].type === 'stage') {
    if (seen.has(i)) return '<stage-cycle>';
    seen.add(i);
    i = tree[i].next !== undefined ? tree[i].next : i + 1;
  }
  if (i >= tree.length || i < 0) return '<END>';
  return i;
}

function walk(tree) {
  const nodes = [];      // multiset of reachable payload sigs
  const edgeSet = [];    // multiset of "fromSig => toSig"
  const seen = new Set();
  const start = resolve(tree, 0);
  const q = typeof start === 'number' ? [start] : [];
  const reached = new Set();
  while (q.length) {
    const i = q.shift();
    if (seen.has(i)) continue;
    seen.add(i);
    reached.add(i);
    const s = sig(tree[i]);
    nodes.push(s);
    for (const raw of edges(tree, i)) {
      const t = resolve(tree, raw);
      edgeSet.push(`${s} => ${typeof t === 'number' ? sig(tree[t]) : t}`);
      if (typeof t === 'number') q.push(t);
    }
  }
  return { nodes: nodes.sort(), edges: edgeSet.sort(), reached };
}

function multisetDiff(a, b) {
  const count = (arr) => arr.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
  const A = count(a), B = count(b);
  const out = [];
  for (const [k, v] of A) if ((B.get(k) || 0) !== v) out.push(`- ${v}x ${k}`);
  for (const [k, v] of B) if ((A.get(k) || 0) !== v) out.push(`+ ${v}x ${k}`);
  return out;
}

mkdirSync(TMP, { recursive: true });
const headSrc = execFileSync('git', ['show', `${REF}:src/data/dialogs/index.js`], { cwd: REPO, maxBuffer: 64 * 1024 * 1024 });
const headFile = path.join(TMP, 'dialogs-head.js');
writeFileSync(headFile, headSrc);

const { DIALOGS: NEW } = await import(pathToFileURL(path.join(REPO, 'src/data/dialogs/index.js')).href);
const { DIALOGS: OLD } = await import(pathToFileURL(headFile).href);
const { ROOMS } = await import(pathToFileURL(path.join(REPO, 'src/data/rooms/index.js')).href);
const { CHARACTER_CONFIGS } = await import(pathToFileURL(path.join(REPO, 'src/data/characters.js')).href);

let fails = 0;
const say = (s) => process.stdout.write(s + '\n');

say(`stage-verify: working tree vs ${REF}`);
say('');

// ── 1. structural equivalence of every pre-existing tree ──────────────────
let changed = 0, staged = 0;
for (const id of Object.keys(OLD)) {
  if (!NEW[id]) { say(`FAIL  ${id}: tree deleted`); fails++; continue; }
  const a = walk(OLD[id]);
  const b = walk(NEW[id]);
  const nStage = NEW[id].filter(n => n.type === 'stage').length;
  if (nStage) staged++;
  const dn = multisetDiff(a.nodes, b.nodes);
  const de = multisetDiff(a.edges, b.edges);
  if (dn.length || de.length) {
    changed++;
    fails++;
    say(`FAIL  ${id}: ${dn.length} node diffs, ${de.length} edge diffs`);
    for (const l of [...dn, ...de].slice(0, 8)) say(`        ${l.slice(0, 190)}`);
  }
}
say(`  ${Object.keys(OLD).length} trees compared, ${staged} now carry stage nodes, ${changed} structurally changed`);

// ── 2. NEW tree hygiene: range + reachability ─────────────────────────────
let range = 0, orphan = 0;
for (const [id, tree] of Object.entries(NEW)) {
  const { reached } = walk(tree);
  for (let i = 0; i < tree.length; i++) {
    for (const e of edges(tree, i)) {
      if (e < 0 || e > tree.length) { say(`FAIL  ${id}[${i}] jumps out of range -> ${e}`); range++; fails++; }
    }
    // A stage node must be reachable AND must be a stage node's worth of work
    if (tree[i].type === 'stage') {
      if (!Array.isArray(tree[i].beats) || tree[i].beats.length === 0) { say(`FAIL  ${id}[${i}] stage node with no beats`); fails++; }
      let hit = false;
      for (let j = 0; j < tree.length; j++) for (const e of edges(tree, j)) if (e === i) hit = true;
      if (!hit && i !== 0) { say(`FAIL  ${id}[${i}] stage node has no inbound edge`); orphan++; fails++; }
    }
  }
}
say(`  range violations: ${range}   orphan stage nodes: ${orphan}`);

// ── 3. every stage beat resolves ──────────────────────────────────────────
// A beat's actor must be a room NPC id, a spawnable CHARACTER_CONFIGS id, or
// 'player'; every mark string must exist in at least one room's `marks`.
const allMarks = new Set();
const roomNpcIds = new Set();
for (const r of Object.values(ROOMS)) {
  for (const k of Object.keys(r.marks || {})) allMarks.add(k);
  for (const n of r.npcs || []) roomNpcIds.add(n.id);
}
let beatFails = 0, beats = 0;
const pointFields = ['walkTo', 'face', 'sit', 'exit', 'spawnAt'];
for (const [id, tree] of Object.entries(NEW)) {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].type !== 'stage') continue;
    for (const b of tree[i].beats) {
      beats++;
      const a = b.actor;
      if (typeof a !== 'string') { say(`FAIL  ${id}[${i}] beat actor is not a string`); beatFails++; fails++; continue; }
      const known = a === 'player' || roomNpcIds.has(a) || !!CHARACTER_CONFIGS[a];
      if (!known) { say(`FAIL  ${id}[${i}] unknown actor "${a}"`); beatFails++; fails++; }
      if (b.spawn && !CHARACTER_CONFIGS[a]) { say(`FAIL  ${id}[${i}] spawn "${a}" has no CHARACTER_CONFIGS entry`); beatFails++; fails++; }
      for (const f of pointFields) {
        const v = b[f];
        if (typeof v !== 'string') continue;
        if (allMarks.has(v) || v === 'player' || roomNpcIds.has(v) || CHARACTER_CONFIGS[v]) continue;
        say(`FAIL  ${id}[${i}] beat ${f}: "${v}" is neither a mark nor an actor`);
        beatFails++; fails++;
      }
      if (typeof b.after === 'number' && (b.after < 0 || b.after >= tree[i].beats.length)) {
        say(`FAIL  ${id}[${i}] beat after:${b.after} out of range`); beatFails++; fails++;
      }
      const verbs = ['walkTo', 'face', 'sit', 'stand', 'exit', 'gesture', 'pose', 'expression', 'hold', 'show'];
      if (!verbs.some(v => b[v] !== undefined)) { say(`FAIL  ${id}[${i}] beat for "${a}" has no verb`); beatFails++; fails++; }
    }
  }
}
say(`  ${beats} stage beats checked, ${beatFails} unresolved`);

rmSync(TMP, { recursive: true, force: true });
say('');
say(fails === 0 ? 'PASS — no pre-existing node or edge changed; every stage beat resolves.' : `FAIL — ${fails} problems.`);
process.exit(fails === 0 ? 0 : 1);
