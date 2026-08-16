import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { deepEqual } from './baseline.mjs';
import { emitNodes } from './emit.mjs';
import { allocate } from './lock.mjs';
import { parseDlg } from './parse.mjs';
import { printScenes } from './print.mjs';

const FIXTURE_DIR = path.join(import.meta.dirname, 'fixtures');

function withoutLines(value) {
  if (Array.isArray(value)) return value.map(withoutLines);
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, child] of Object.entries(value)) {
      if (key !== 'line') result[key] = withoutLines(child);
    }
    return result;
  }
  return value;
}

function recordCoverage(parsed, text, coverage) {
  if (parsed.comments.length) coverage.add('comments');
  if (text.includes('Diane (Front Desk):')) coverage.add('parenthesized-speaker');
  if (text.includes('mood=')) coverage.add('mood');
  if (text.includes('mode quiz') && text.includes('mode evergreen-hub')) coverage.add('both-modes');
  if (text.includes('—') && text.includes('#') && text.includes('"') && text.includes('*')) coverage.add('prose-punctuation');
  for (const scene of parsed.scenes) {
    for (const stmt of scene.stmts) {
      coverage.add(`kind:${stmt.kind}`);
      if (stmt.labels.length > 1) coverage.add('stacked-labels');
      if (stmt.next) coverage.add(`goto:${stmt.kind}`);
      if (stmt.kind === 'text' && stmt.text.length === 360) coverage.add('body-360');
      if (stmt.kind === 'choice') {
        if (!Object.hasOwn(stmt, 'speaker')) coverage.add('ask:no-speaker');
        for (const arm of stmt.arms) {
          const mods = ['flag', 'requires', 'requiresNot'].filter((key) => Object.hasOwn(arm, key));
          coverage.add(`arm-mod-count:${mods.length}`);
          if (Object.hasOwn(arm, 'flag') && !Object.hasOwn(arm, 'flagValue')) coverage.add('arm:set-bare');
          if (arm.flagValue === true) coverage.add('arm:set-true');
          if (arm.flagValue === false) coverage.add('arm:set-false');
          if (arm.flagValue === 2) coverage.add('arm:set-2');
        }
      }
      if (stmt.kind === 'condition') {
        coverage.add(`if:${Boolean(stmt.ifTrue)}:${Boolean(stmt.ifFalse)}`);
      }
      if (stmt.kind === 'action') {
        coverage.add(`action:${stmt.action}`);
        if (stmt.action === 'give_item') coverage.add(`give:quantity:${Object.hasOwn(stmt, 'quantity')}`);
        if (stmt.action === 'quest_update') {
          coverage.add(`quest:${Object.hasOwn(stmt, 'stage')}:${Object.hasOwn(stmt, 'status')}`);
        }
      }
      if (stmt.kind === 'stage') {
        coverage.add(`stage:concurrent:${stmt.concurrent}`);
        for (const beat of stmt.beats) for (const op of beat.ops) coverage.add(`beat:${op.verb}`);
      }
    }
  }
}

const requiredCoverage = [
  'kind:text', 'kind:choice', 'kind:condition', 'kind:action', 'kind:stage', 'kind:end',
  'action:set_flag', 'action:give_xp', 'action:start_combat', 'action:quest_update',
  'action:modify_stat', 'action:give_item', 'action:recruit_ally',
  'action:unlock_ally_ability', 'action:heal',
  'give:quantity:false', 'give:quantity:true',
  'quest:true:false', 'quest:false:false', 'quest:false:true',
  'if:false:false', 'if:true:false', 'if:false:true', 'if:true:true',
  'goto:text', 'goto:action', 'goto:stage', 'goto:choice',
  'arm-mod-count:0', 'arm-mod-count:1', 'arm-mod-count:2',
  'arm:set-bare', 'arm:set-true', 'arm:set-false', 'arm:set-2',
  'stage:concurrent:false', 'stage:concurrent:true',
  'beat:walkTo', 'beat:face', 'beat:exit', 'beat:spawnAt', 'beat:teleportTo',
  'beat:gesture', 'beat:pose', 'beat:expression', 'beat:speed', 'beat:hold',
  'beat:sit', 'beat:stand', 'beat:spawn', 'beat:show', 'beat:nowait', 'beat:after',
  'mood', 'ask:no-speaker', 'both-modes', 'comments', 'parenthesized-speaker',
  'prose-punctuation', 'body-360', 'stacked-labels',
];

const fixtureFiles = (await readdir(FIXTURE_DIR))
  .filter((file) => file.endsWith('.dlg'))
  .sort();
const coverage = new Set();
let failures = 0;
process.stdout.write('Fixture                              A       B       C\n');
process.stdout.write('--------------------------------------------------------\n');

for (const file of fixtureFiles) {
  const source = await readFile(path.join(FIXTURE_DIR, file), 'utf8');
  const first = parseDlg(source, `tools/dlg/fixtures/${file}`);
  recordCoverage(first, source, coverage);
  const canonical = printScenes(first.scenes, first.comments);
  const second = parseDlg(canonical, `tools/dlg/fixtures/${file}`);
  const a = deepEqual(withoutLines(first), withoutLines(second));
  const b = canonical === printScenes(second.scenes, second.comments);
  const c = first.diagnostics.length === 0 && second.diagnostics.length === 0;
  let emit = true;
  try {
    for (const scene of first.scenes) {
      const allocated = allocate(scene.id, scene.stmts, { version: 1, scenes: {} }, { reseed: true });
      const nodes = emitNodes(scene, allocated.indexOf, allocated.length, allocated.pads);
      emit &&= nodes.length === allocated.length && nodes.every(Boolean);
    }
  } catch {
    emit = false;
  }
  const pass = a && b && c && emit;
  if (!pass) failures += 1;
  process.stdout.write(`${file.padEnd(36)} ${a ? 'PASS' : 'FAIL'}    ${b ? 'PASS' : 'FAIL'}    ${c && emit ? 'PASS' : 'FAIL'}\n`);
  if (first.diagnostics.length) {
    for (const item of first.diagnostics) process.stdout.write(`  ${item.message}\n`);
  }
}

if (fixtureFiles.length < 40) {
  process.stdout.write(`FAIL fixture count: expected at least 40, found ${fixtureFiles.length}\n`);
  failures += 1;
}
const missing = requiredCoverage.filter((item) => !coverage.has(item));
if (missing.length) {
  process.stdout.write(`FAIL missing grammar coverage: ${missing.join(', ')}\n`);
  failures += 1;
} else {
  process.stdout.write(`PASS grammar coverage: ${requiredCoverage.length}/${requiredCoverage.length} required forms\n`);
}
process.stdout.write(`${failures ? 'FAIL' : 'PASS'} total: ${fixtureFiles.length - failures}/${fixtureFiles.length} fixtures\n`);
if (failures) process.exitCode = 1;
