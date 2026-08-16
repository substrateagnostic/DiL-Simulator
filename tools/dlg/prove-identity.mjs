// Phase-3 gate: compile the inert .dlg corpus and prove value identity with the
// frozen post-Phase-1 snapshot.
//
//   node tools/dlg/prove-identity.mjs


import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { deepEqual, diffTrees } from './baseline.mjs';
import { compileCorpus } from './compile.mjs';

const BASELINE_FILE = path.join(import.meta.dirname, 'baseline.json');

function collectProse(dialogs) {
  const values = [];
  const visit = (value) => {
    if (value === null || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if ((key === 'text' || key === 'prompt') && typeof child === 'string') values.push(child);
      visit(child);
    }
  };
  visit(dialogs);
  return values.sort();
}

async function main() {
  const baseline = JSON.parse(await readFile(BASELINE_FILE, 'utf8'));
  const compiled = await compileCorpus();
  const baselineIds = Object.keys(baseline);
  const compiledIds = Object.keys(compiled.dialogs);
  const missing = baselineIds.filter((id) => !Object.hasOwn(compiled.dialogs, id));
  const extra = compiledIds.filter((id) => !Object.hasOwn(baseline, id));
  const keyPass = missing.length === 0 && extra.length === 0;
  const proseBefore = collectProse(baseline);
  const proseAfter = collectProse(compiled.dialogs);
  const prosePass = deepEqual(proseBefore, proseAfter);

  let passes = 0;
  const failures = [];
  process.stdout.write('IDENTITY PROOF\n');
  process.stdout.write('Scene                                      Nodes  Result\n');
  process.stdout.write('--------------------------------------------------------\n');
  for (const sceneId of baselineIds) {
    const tree = baseline[sceneId];
    const pass = Object.hasOwn(compiled.dialogs, sceneId) && deepEqual(tree, compiled.dialogs[sceneId]);
    if (pass) passes += 1;
    else {
      const findings = diffTrees({ [sceneId]: tree }, Object.hasOwn(compiled.dialogs, sceneId)
        ? { [sceneId]: compiled.dialogs[sceneId] }
        : {}).slice(0, 3);
      failures.push({ sceneId, findings });
    }
    process.stdout.write(`${sceneId.padEnd(42)} ${String(tree.length).padStart(5)}  ${pass ? 'PASS' : 'FAIL'}\n`);
    if (!pass) {
      for (const finding of failures.at(-1).findings) process.stdout.write(`  ${finding}\n`);
    }
  }
  for (const sceneId of extra) failures.push({ sceneId, findings: [`${sceneId}: only in compiled corpus`] });

  process.stdout.write('--------------------------------------------------------\n');
  process.stdout.write(`scene key sets: ${keyPass ? 'PASS' : 'FAIL'} (${baselineIds.length} baseline, ${compiledIds.length} compiled)\n`);
  if (missing.length) process.stdout.write(`missing scene ids: ${missing.join(', ')}\n`);
  if (extra.length) process.stdout.write(`extra scene ids: ${extra.join(', ')}\n`);
  process.stdout.write(`text/prompt multiset: ${prosePass ? 'PASS' : 'FAIL'} (${proseBefore.length} values)\n`);
  process.stdout.write(`compiler checks: ${compiled.errorCount ? 'FAIL' : 'PASS'} (${compiled.errorCount} errors, ${compiled.warningCount} warnings)\n`);
  process.stdout.write(`TOTAL ${baselineIds.length}  PASS ${passes}  FAIL ${baselineIds.length - passes}\n`);
  process.stdout.write(`${passes}/${baselineIds.length} identical\n`);

  if (!keyPass || !prosePass || compiled.errorCount || passes !== baselineIds.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`FAIL: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

