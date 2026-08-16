// _dr-ledger.mjs — READ-ONLY. Enumerates every field-presence / field-spelling
// variance in the dialog corpus that a canonical authoring format would have to
// either express or normalize away. Prints; writes nothing.
//   node tools/_dr-ledger.mjs
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..');
const { DIALOGS } = await import(pathToFileURL(path.join(REPO, 'src/data/dialogs/index.js')).href);
const say = (s) => process.stdout.write(s + '\n');

const KNOWN = {
  text: new Set(['type', 'speaker', 'text', 'next', 'mood', 'minQuestStage', 'maxQuestStage', 'fallback']),
  choice: new Set(['type', 'speaker', 'text', 'prompt', 'choices', 'next', 'fallback', 'mood']),
  condition: new Set(['type', 'flag', 'ifTrue', 'ifFalse']),
  action: new Set(['type', 'action', 'next', 'flag', 'value', 'xp', 'encounter', 'quest', 'stat',
    'amount', 'item', 'stage', 'objective', 'status', 'quantity', 'ally', 'ability']),
  stage: new Set(['type', 'beats', 'next', 'concurrent']),
  end: new Set(['type']),
};
const CHOICE_KNOWN = new Set(['text', 'next', 'flag', 'flagValue', 'requires', 'requiresNot', 'minQuestStage', 'maxQuestStage']);

const rows = [];
const add = (cls, where, detail) => rows.push({ cls, where, detail });

let n = 0;
for (const [id, tree] of Object.entries(DIALOGS)) {
  tree.forEach((node, i) => {
    n++;
    const t = node.type;
    if (!KNOWN[t]) { add('UNKNOWN-NODE-TYPE', `${id}[${i}]`, `type: ${JSON.stringify(t)}`); return; }
    for (const k of Object.keys(node)) {
      if (!KNOWN[t].has(k)) add('UNKNOWN-FIELD', `${id}[${i}]`, `${t}.${k}`);
    }
    if (t === 'action' && node.action === 'set_flag' && node.value === undefined) {
      add('SET_FLAG-NO-VALUE', `${id}[${i}]`, `flag ${node.flag}`);
    }
    if (t === 'action' && node.action === 'set_flag' && node.value !== undefined
        && node.value !== true && node.value !== false) {
      add('SET_FLAG-ODD-VALUE', `${id}[${i}]`, `${node.flag} = ${JSON.stringify(node.value)}`);
    }
    if (t === 'choice') {
      if (node.prompt === undefined && node.text === undefined) add('CHOICE-NO-PROMPT', `${id}[${i}]`, '');
      if (node.prompt !== undefined && node.text !== undefined) add('CHOICE-BOTH-PROMPT-AND-TEXT', `${id}[${i}]`, '');
      if (node.prompt === undefined && node.text !== undefined) add('CHOICE-USES-text', `${id}[${i}]`, '');
      if (node.speaker === undefined) add('CHOICE-NO-SPEAKER', `${id}[${i}]`, '');
      for (const [ci, c] of (node.choices || []).entries()) {
        for (const k of Object.keys(c)) if (!CHOICE_KNOWN.has(k)) add('UNKNOWN-CHOICE-FIELD', `${id}[${i}].${ci}`, k);
        if (c.next === undefined) add('CHOICE-NO-NEXT', `${id}[${i}].${ci}`, c.text?.slice(0, 40));
        if (c.flag !== undefined && c.flagValue === undefined) add('CHOICE-FLAG-NO-VALUE', `${id}[${i}].${ci}`, c.flag);
      }
    }
    if (t === 'text' && node.speaker === undefined) add('TEXT-NO-SPEAKER', `${id}[${i}]`, '');
    if (t === 'action' && node.next === undefined) add('ACTION-NO-NEXT', `${id}[${i}]`, node.action);
    if (t === 'stage' && node.next === undefined) add('STAGE-NO-NEXT', `${id}[${i}]`, '');
    if (t === 'condition') {
      if (node.ifTrue === undefined) add('COND-NO-IFTRUE', `${id}[${i}]`, node.flag);
      if (node.ifFalse === undefined) add('COND-NO-IFFALSE', `${id}[${i}]`, node.flag);
    }
    // redundant explicit next (== i+1) — must be preserved to stay deep-equal
    for (const k of ['next', 'ifTrue', 'ifFalse']) {
      if (node[k] === i + 1) add(`REDUNDANT-${k}`, `${id}[${i}]`, '');
    }
  });
}

const byCls = new Map();
for (const r of rows) {
  if (!byCls.has(r.cls)) byCls.set(r.cls, []);
  byCls.get(r.cls).push(r);
}
say(`${n} nodes scanned across ${Object.keys(DIALOGS).length} trees`);
say('');
for (const [cls, list] of [...byCls].sort((a, b) => b[1].length - a[1].length)) {
  say(`${String(list.length).padStart(5)}  ${cls}`);
  if (list.length <= 12) for (const r of list) say(`         ${r.where}  ${r.detail}`);
}

// speaker hygiene for a line-oriented DSL: does any speaker contain a colon?
const speakers = new Set();
for (const tree of Object.values(DIALOGS)) for (const nd of tree) if (nd.speaker) speakers.add(nd.speaker);
say('');
say('SPEAKERS (' + speakers.size + '): ' + [...speakers].sort().join(' | '));
say('speakers containing ":" -> ' + [...speakers].filter(s => s.includes(':')).length);

// prose hygiene: how many text bodies contain a newline, or start with a token
// that a line-oriented parser would have to disambiguate?
let multiline = 0, leadingSpace = 0, longest = 0, longestId = '';
const DIRECTIVES = ['set', 'goto', 'if', 'else', 'end', 'ask', 'fight', 'give', 'xp', 'stat', 'heal', 'quest', 'recruit', 'teach', 'stage', 'scene'];
let ambiguous = 0;
for (const [id, tree] of Object.entries(DIALOGS)) {
  for (const nd of tree) {
    const s = nd.text ?? nd.prompt;
    if (typeof s !== 'string') continue;
    if (s.includes('\n')) multiline++;
    if (s !== s.trimStart()) leadingSpace++;
    if (s.length > longest) { longest = s.length; longestId = id; }
    const first = s.split(/\s/)[0]?.toLowerCase();
    if (DIRECTIVES.includes(first)) ambiguous++;
  }
}
say('');
say(`prose bodies: multiline ${multiline}, leading-space ${leadingSpace}, longest ${longest} chars (${longestId})`);
say(`prose bodies whose FIRST WORD collides with a candidate directive keyword: ${ambiguous}`);
