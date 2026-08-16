// Surgical Phase-1 dialog normalizer. It parses source ranges and splices only
// the exact property/key spans named by the normalization ledger.
//
//   node tools/dlg/normalize.mjs --dry
//   node tools/dlg/normalize.mjs --rows=1,2,3
//   node tools/dlg/normalize.mjs --rows=4,5
//   node tools/dlg/normalize.mjs --all

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseAst } from 'rollup/parseAst';
import { deepEqual } from './baseline.mjs';

const REPO_DIR = path.resolve(import.meta.dirname, '../..');
const DIALOGS_FILE = path.join(REPO_DIR, 'src/data/dialogs/index.js');
const EXPECTED = new Map([[1, 307], [2, 132], [3, 74], [4, 35], [5, 1], [6, 0], [7, 3]]);
const ROW_NAMES = new Map([
  [1, 'redundant node next'],
  [2, 'redundant node ifFalse'],
  [3, 'redundant node ifTrue'],
  [4, 'choice prompt spelled text'],
  [5, 'set_flag without value'],
  [6, 'invalid node type'],
  [7, 'choice arm flag without flagValue (left unchanged)'],
]);
const NODE_TYPES = new Set(['text', 'choice', 'condition', 'action', 'stage', 'end']);
const NODE_FIELDS = new Map([
  ['text', new Set(['type', 'speaker', 'text', 'next', 'mood', 'minQuestStage', 'maxQuestStage', 'fallback'])],
  ['choice', new Set(['type', 'speaker', 'text', 'prompt', 'choices', 'next', 'fallback', 'mood'])],
  ['condition', new Set(['type', 'flag', 'ifTrue', 'ifFalse'])],
  ['action', new Set(['type', 'action', 'next', 'flag', 'value', 'xp', 'encounter', 'quest', 'stat',
    'amount', 'item', 'stage', 'objective', 'status', 'quantity', 'ally', 'ability'])],
  ['stage', new Set(['type', 'beats', 'next', 'concurrent'])],
  ['end', new Set(['type'])],
]);
const CHOICE_FIELDS = new Set([
  'text', 'next', 'flag', 'flagValue', 'requires', 'requiresNot',
  'minQuestStage', 'maxQuestStage',
]);

function propertyName(property) {
  if (property.type !== 'Property' || property.computed) return null;
  if (property.key.type === 'Identifier') return property.key.name;
  if (property.key.type === 'Literal' && typeof property.key.value === 'string') return property.key.value;
  return null;
}

function literalValue(property) {
  return property?.value?.type === 'Literal' ? property.value.value : undefined;
}

function propertyMap(object, where, problems) {
  const map = new Map();
  for (const property of object.properties) {
    const name = propertyName(property);
    if (name === null) {
      problems.push(`${where}: spread, computed, or unsupported property`);
      continue;
    }
    if (map.has(name)) problems.push(`${where}.${name}: duplicate property`);
    map.set(name, property);
  }
  return map;
}

function findDialogsObject(ast) {
  for (const statement of ast.body) {
    if (statement.type !== 'ExportNamedDeclaration' || statement.declaration?.type !== 'VariableDeclaration') continue;
    for (const declaration of statement.declaration.declarations) {
      if (declaration.id?.type === 'Identifier' && declaration.id.name === 'DIALOGS'
          && declaration.init?.type === 'ObjectExpression') return declaration.init;
    }
  }
  throw new Error('Could not locate export const DIALOGS = { ... }');
}

function scan(source) {
  const ast = parseAst(source);
  const dialogs = findDialogsObject(ast);
  const rows = new Map([...EXPECTED.keys()].map((row) => [row, []]));
  const problems = [];
  const sceneIds = [];

  for (const sceneProperty of dialogs.properties) {
    const sceneId = propertyName(sceneProperty);
    if (sceneId === null || sceneProperty.value?.type !== 'ArrayExpression') {
      problems.push('DIALOGS contains a non-static scene property or non-array tree');
      continue;
    }
    sceneIds.push(sceneId);
    for (let index = 0; index < sceneProperty.value.elements.length; index++) {
      const node = sceneProperty.value.elements[index];
      const site = `${sceneId}[${index}]`;
      if (node?.type !== 'ObjectExpression') {
        problems.push(`${site}: node is not an object literal`);
        continue;
      }
      const properties = propertyMap(node, site, problems);
      const type = literalValue(properties.get('type'));
      if (!NODE_TYPES.has(type)) {
        rows.get(6).push({ site, sceneId, index, node, type });
        continue;
      }

      for (const [name] of properties) {
        if (!NODE_FIELDS.get(type).has(name)) problems.push(`${site}.${name}: unknown ${type} field`);
      }

      const next = properties.get('next');
      const ifFalse = properties.get('ifFalse');
      const ifTrue = properties.get('ifTrue');
      if (next && literalValue(next) === index + 1) rows.get(1).push({ site, sceneId, index, node, property: next });
      if (ifFalse && literalValue(ifFalse) === index + 1) rows.get(2).push({ site, sceneId, index, node, property: ifFalse });
      if (ifTrue && literalValue(ifTrue) === index + 1) rows.get(3).push({ site, sceneId, index, node, property: ifTrue });

      if (type === 'choice') {
        const text = properties.get('text');
        const prompt = properties.get('prompt');
        if (text && prompt) problems.push(`${site}: choice has both text and prompt`);
        if (!text && !prompt) problems.push(`${site}: choice has neither text nor prompt`);
        if (text && !prompt) rows.get(4).push({ site, sceneId, index, node, property: text });

        const choices = properties.get('choices')?.value;
        if (choices?.type !== 'ArrayExpression') {
          problems.push(`${site}.choices: expected an array literal`);
        } else {
          choices.elements.forEach((arm, armIndex) => {
            const armSite = `${site}.choices[${armIndex}]`;
            if (arm?.type !== 'ObjectExpression') {
              problems.push(`${armSite}: choice arm is not an object literal`);
              return;
            }
            const armProperties = propertyMap(arm, armSite, problems);
            for (const [name] of armProperties) {
              if (!CHOICE_FIELDS.has(name)) problems.push(`${armSite}.${name}: unknown choice-arm field`);
            }
            if (armProperties.has('flag') && !armProperties.has('flagValue')) {
              rows.get(7).push({ site, sceneId, index, armIndex });
            }
          });
        }
      }

      if (type === 'action' && literalValue(properties.get('action')) === 'set_flag'
          && !properties.has('value')) {
        rows.get(5).push({
          site, sceneId, index, node,
          flagProperty: properties.get('flag'),
          flag: literalValue(properties.get('flag')),
        });
      }
    }
  }
  return { ast, dialogs, rows, problems, sceneIds };
}

function printRows(rows) {
  for (const row of EXPECTED.keys()) {
    const sites = rows.get(row).slice(0, 5).map((entry) => entry.site);
    process.stdout.write(`ROW ${row}: ${rows.get(row).length}  ${ROW_NAMES.get(row)}\n`);
    process.stdout.write(`  first 5: ${sites.length ? sites.join(', ') : '(none)'}\n`);
  }
}

function assertScan(scanResult, selectedRows, dry) {
  const failures = [...scanResult.problems];
  for (const row of [6, 7]) {
    if (scanResult.rows.get(row).length !== EXPECTED.get(row)) {
      failures.push(`ROW ${row}: expected ${EXPECTED.get(row)}, found ${scanResult.rows.get(row).length}`);
    }
  }
  for (const row of [1, 2, 3, 4, 5]) {
    const count = scanResult.rows.get(row).length;
    const expected = EXPECTED.get(row);
    if (dry) {
      if (count !== expected) failures.push(`ROW ${row}: expected ${expected}, found ${count}`);
    } else if (selectedRows.has(row)) {
      if (count !== expected) failures.push(`ROW ${row}: selected row expected ${expected}, found ${count}`);
    } else if (count !== 0 && count !== expected) {
      failures.push(`ROW ${row}: partial/unrecognized state; expected 0 or ${expected}, found ${count}`);
    }
  }
  if (scanResult.rows.get(5).length === 1) {
    const row5 = scanResult.rows.get(5)[0];
    if (row5.site !== 'receptionist_intro[13]' || row5.flag !== 'reception_intro_done') {
      failures.push(`ROW 5: expected receptionist_intro[13] / reception_intro_done, found ${row5.site} / ${row5.flag}`);
    }
    if (!row5.flagProperty) failures.push('ROW 5: set_flag node has no flag property to insert after');
  }
  const row7Sites = scanResult.rows.get(7).map((entry) => `${entry.site}.choices[${entry.armIndex}]`);
  const expectedRow7 = [
    'branch_decision[6].choices[0]',
    'branch_decision[6].choices[1]',
    'branch_decision[6].choices[2]',
  ];
  if (!deepEqual(row7Sites, expectedRow7)) {
    failures.push(`ROW 7 sites differ: ${JSON.stringify(row7Sites)} != ${JSON.stringify(expectedRow7)}`);
  }
  if (failures.length) throw new Error(`Normalization ledger refused:\n${failures.map((item) => `  - ${item}`).join('\n')}`);
}

function deletionEdit(source, entry, row) {
  const properties = entry.node.properties;
  const propertyIndex = properties.indexOf(entry.property);
  if (propertyIndex < 0) throw new Error(`${entry.site}: ROW ${row} property not found in its node`);
  if (propertyIndex > 0) {
    const previous = properties[propertyIndex - 1];
    const separator = source.slice(previous.end, entry.property.start);
    if (!/^,\s+$/.test(separator)) {
      throw new Error(`${entry.site}: ROW ${row} unexpected preceding separator ${JSON.stringify(separator)}`);
    }
    return { start: previous.end, end: entry.property.end, replacement: '', row, site: entry.site };
  }

  let end = entry.property.end;
  let cursor = end;
  while (/\s/.test(source[cursor] || '')) cursor++;
  if (source[cursor] === ',') end = cursor + 1;
  return { start: entry.node.start + 1, end, replacement: '', row, site: entry.site };
}

function makeEdits(source, rows, selectedRows) {
  const edits = [];
  for (const row of [1, 2, 3]) {
    if (!selectedRows.has(row)) continue;
    for (const entry of rows.get(row)) edits.push(deletionEdit(source, entry, row));
  }
  if (selectedRows.has(4)) {
    for (const entry of rows.get(4)) {
      edits.push({
        start: entry.property.key.start,
        end: entry.property.key.end,
        replacement: 'prompt',
        row: 4,
        site: entry.site,
      });
    }
  }
  if (selectedRows.has(5)) {
    for (const entry of rows.get(5)) {
      edits.push({
        start: entry.flagProperty.end,
        end: entry.flagProperty.end,
        replacement: ', value: true',
        row: 5,
        site: entry.site,
      });
    }
  }

  const ascending = [...edits].sort((a, b) => a.start - b.start || a.end - b.end);
  for (let index = 1; index < ascending.length; index++) {
    if (ascending[index].start < ascending[index - 1].end) {
      throw new Error(`Overlapping edits at ${ascending[index - 1].site} and ${ascending[index].site}`);
    }
  }
  return edits;
}

function applyEdits(source, edits) {
  let result = source;
  const descending = [...edits].sort((a, b) => b.start - a.start || b.end - a.end);
  for (const edit of descending) {
    result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
  }
  return result;
}

function collectProse(dialogs) {
  const strings = [];
  const visit = (value) => {
    if (value === null || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if ((key === 'text' || key === 'prompt') && typeof child === 'string') strings.push(child);
      visit(child);
    }
  };
  visit(dialogs);
  return strings.sort();
}

async function importDialogs(tag) {
  const url = pathToFileURL(DIALOGS_FILE);
  url.searchParams.set('normalize', `${tag}-${Date.now()}`);
  return (await import(url.href)).DIALOGS;
}

function parseArgs(argv) {
  if (argv.length !== 1) throw new Error('Usage: node tools/dlg/normalize.mjs --dry | --rows=1,2,3 | --rows=4,5 | --all');
  if (argv[0] === '--dry') return { dry: true, rows: new Set() };
  if (argv[0] === '--all') return { dry: false, rows: new Set([1, 2, 3, 4, 5]) };
  if (!argv[0].startsWith('--rows=')) throw new Error('Usage: node tools/dlg/normalize.mjs --dry | --rows=1,2,3 | --rows=4,5 | --all');
  const values = argv[0].slice('--rows='.length).split(',');
  if (!values.length || values.some((value) => !/^[1-5]$/.test(value))) throw new Error('--rows accepts only comma-separated rows 1 through 5');
  const rows = new Set(values.map(Number));
  if (rows.size !== values.length) throw new Error('--rows contains a duplicate row');
  return { dry: false, rows };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = await readFile(DIALOGS_FILE, 'utf8');
  const beforeDialogs = await importDialogs('before');
  const beforeKeys = Object.keys(beforeDialogs);
  const beforeLengths = Object.fromEntries(Object.entries(beforeDialogs).map(([key, tree]) => [key, tree.length]));
  const beforeProse = collectProse(beforeDialogs);
  const scanned = scan(source);
  printRows(scanned.rows);
  assertScan(scanned, args.rows, args.dry);
  process.stdout.write(`PASS: ledger matches the expected ${args.dry ? 'pre-normalization' : 'recognized'} state\n`);
  if (args.dry) {
    process.stdout.write(`DRY: no files written; prose multiset captured (${beforeProse.length} strings)\n`);
    return;
  }

  const edits = makeEdits(source, scanned.rows, args.rows);
  const candidate = applyEdits(source, edits);
  const candidateScan = scan(candidate);
  if (!deepEqual(candidateScan.sceneIds, scanned.sceneIds)) throw new Error('Candidate parse changed the AST scene key list');

  await writeFile(DIALOGS_FILE, candidate, 'utf8');
  try {
    const afterDialogs = await importDialogs('after');
    const afterKeys = Object.keys(afterDialogs);
    const afterLengths = Object.fromEntries(Object.entries(afterDialogs).map(([key, tree]) => [key, tree.length]));
    if (afterKeys.length !== 292 || !deepEqual(afterKeys, beforeKeys)) {
      throw new Error(`Post-write export key check failed: ${afterKeys.length} trees or changed key list`);
    }
    if (!deepEqual(afterLengths, beforeLengths)) throw new Error('Post-write tree lengths changed');
    const afterProse = collectProse(afterDialogs);
    if (!deepEqual(beforeProse, afterProse)) throw new Error('Text/prompt string-value multiset changed');
    process.stdout.write(`WRITE src/data/dialogs/index.js: ${edits.length} surgical edits (${[...args.rows].sort().map((row) => `ROW ${row}=${scanned.rows.get(row).length}`).join(', ')})\n`);
    process.stdout.write(`PASS: reparsed and re-imported 292 trees with the identical key list and tree lengths\n`);
    process.stdout.write(`PASS: text/prompt string-value multiset unchanged (${afterProse.length} strings)\n`);
  } catch (error) {
    await writeFile(DIALOGS_FILE, source, 'utf8');
    throw new Error(`Post-write verification failed; original source restored: ${error.message}`);
  }
}

main().catch((error) => {
  process.stderr.write(`FAIL: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
