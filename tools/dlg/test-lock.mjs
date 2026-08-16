import { readFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { emitNodes } from './emit.mjs';
import { allocate, loadLock, saveLock } from './lock.mjs';

const stmt = (...labels) => ({ kind: 'end', labels });
const indexList = (result, stmts) => stmts.map((item) => result.indexOf.get(item));
const emptyLock = () => ({ version: 1, scenes: {} });
const tests = [];
const test = (name, run) => tests.push({ name, run });
const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);

test('fresh allocation and packing', () => {
  const stmts = [stmt('a'), stmt(), stmt('c')];
  const result = allocate('fresh', stmts, emptyLock());
  return equal(indexList(result, stmts), [0, 1, 2])
    && equal(result.lockAfter.scenes.fresh.labels, { a: 0, c: 2 });
});

test('unchanged recompile', () => {
  const firstStmts = [stmt('a'), stmt('b')];
  const first = allocate('same', firstStmts, emptyLock());
  const secondStmts = [stmt('a'), stmt('b')];
  const second = allocate('same', secondStmts, first.lockAfter);
  return equal(indexList(second, secondStmts), [0, 1]);
});

test('append at tail', () => {
  const lock = { version: 1, scenes: { append: { labels: { a: 0, b: 1 }, length: 2 } } };
  const stmts = [stmt('a'), stmt('b'), stmt('c')];
  const result = allocate('append', stmts, lock);
  return equal(indexList(result, stmts), [0, 1, 2]);
});

test('middle label allocated at tail', () => {
  const lock = { version: 1, scenes: { middle: { labels: { a: 0, b: 1 }, length: 2 } } };
  const stmts = [stmt('a'), stmt('new_label'), stmt('b')];
  const result = allocate('middle', stmts, lock);
  return equal(indexList(result, stmts), [0, 2, 1])
    && result.lockAfter.scenes.middle.labels.new_label === 2;
});

test('removed label becomes end pad', () => {
  const lock = { version: 1, scenes: { removed: { labels: { a: 0, old: 1 }, length: 2 } } };
  const only = stmt('a');
  const scene = { id: 'removed', stmts: [only] };
  const result = allocate('removed', scene.stmts, lock);
  const nodes = emitNodes(scene, result.indexOf, result.length, result.pads);
  return equal(result.pads, [1]) && equal(nodes[1], { type: 'end' }) && result.length === 2;
});

test('rename costs a pad', () => {
  const lock = { version: 1, scenes: { rename: { labels: { old: 0 }, length: 1 } } };
  const renamed = stmt('new_name');
  const result = allocate('rename', [renamed], lock);
  return result.indexOf.get(renamed) === 1 && equal(result.pads, [0])
    && equal(result.lockAfter.scenes.rename.labels, { old: 0, new_name: 1 });
});

test('reorder locked labels errors', () => {
  const lock = { version: 1, scenes: { reorder: { labels: { a: 0, b: 1 }, length: 2 } } };
  try {
    allocate('reorder', [stmt('b'), stmt('a')], lock);
    return false;
  } catch (error) {
    return error.message.includes('_chose_') && error.message.includes('@a')
      && error.message.includes('index 0') && error.message.includes('cursor 2');
  }
});

test('duplicate source label errors', () => {
  try {
    allocate('duplicate', [stmt('same'), stmt('same')], emptyLock());
    return false;
  } catch (error) {
    return error.message.includes('Duplicate label @same');
  }
});

test('two aliases share one index', () => {
  const aliased = stmt('first', 'second');
  const first = allocate('aliases', [aliased], emptyLock());
  const againStmt = stmt('first', 'second');
  const second = allocate('aliases', [againStmt], first.lockAfter);
  return first.lockAfter.scenes.aliases.labels.first === 0
    && first.lockAfter.scenes.aliases.labels.second === 0
    && second.indexOf.get(againStmt) === 0;
});

test('reseed ignores existing lock', () => {
  const lock = { version: 1, scenes: { reseed: { labels: { a: 5 }, length: 6 } } };
  const item = stmt('a');
  const result = allocate('reseed', [item], lock, { reseed: true });
  return result.indexOf.get(item) === 0 && result.length === 1
    && result.lockAfter.scenes.reseed.labels.a === 0;
});

test('reseed save requires acknowledgement', async () => {
  const result = allocate('guarded', [stmt('a')], emptyLock(), { reseed: true });
  const prior = process.env.DIALOGS_LOCK_RESEED;
  delete process.env.DIALOGS_LOCK_RESEED;
  try {
    await saveLock(path.join(import.meta.dirname, 'fixtures', '.guarded-lock.json'), result.lockAfter);
    return false;
  } catch (error) {
    return error.message.includes('DIALOGS_LOCK_RESEED=i-know');
  } finally {
    if (prior === undefined) delete process.env.DIALOGS_LOCK_RESEED;
    else process.env.DIALOGS_LOCK_RESEED = prior;
  }
});

test('length is monotonic', () => {
  const lock = { version: 1, scenes: { shrink: { labels: {}, length: 4 } } };
  const result = allocate('shrink', [stmt()], lock);
  return result.length === 4 && equal(result.pads, [1, 2, 3]);
});

test('locked hole remains a pad', () => {
  const lock = { version: 1, scenes: { hole: { labels: { a: 0, c: 2 }, length: 3 } } };
  const stmts = [stmt('a'), stmt('c')];
  const result = allocate('hole', stmts, lock);
  return equal(indexList(result, stmts), [0, 2]) && equal(result.pads, [1]);
});

test('duplicate index on different statements errors', () => {
  const lock = { version: 1, scenes: { collision: { labels: { a: 0, b: 0 }, length: 1 } } };
  try {
    allocate('collision', [stmt('a'), stmt('b')], lock);
    return false;
  } catch (error) {
    return error.message.includes('Duplicate index 0');
  }
});

test('save order is deterministic', async () => {
  const file = path.join(import.meta.dirname, 'fixtures', '.ordered-lock.json');
  const lock = {
    version: 1,
    scenes: {
      second: { labels: { z: 2, a: 0, m: 2 }, length: 3 },
      first: { labels: {}, length: 0 },
    },
  };
  await saveLock(file, lock);
  try {
    const written = await readFile(file, 'utf8');
    const loaded = await loadLock(file);
    return loaded.version === 1 && loaded.scenes.second.length === 3
      && written.indexOf('"second"') < written.indexOf('"first"')
      && written.indexOf('"a"') < written.indexOf('"m"')
      && written.indexOf('"m"') < written.indexOf('"z"')
      && written.endsWith('\n');
  } finally {
    await unlink(file);
  }
});

let failures = 0;
process.stdout.write('Case                                      Result\n');
process.stdout.write('------------------------------------------------\n');
for (const { name, run } of tests) {
  let pass = false;
  try {
    pass = Boolean(await run());
  } catch (error) {
    process.stdout.write(`  ${error.message}\n`);
  }
  if (!pass) failures += 1;
  process.stdout.write(`${name.padEnd(42)} ${pass ? 'PASS' : 'FAIL'}\n`);
}
process.stdout.write(`${failures ? 'FAIL' : 'PASS'} total: ${tests.length - failures}/${tests.length} lock cases\n`);
if (failures) process.exitCode = 1;
