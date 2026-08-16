// Assertions A/B/C from the Phase-2 round-trip contract over the converted
// production corpus.

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { deepEqual } from './baseline.mjs';
import { parseDlg } from './parse.mjs';
import { printScenes } from './print.mjs';

const REPO_DIR = path.resolve(import.meta.dirname, '../..');
const DIALOG_DIR = path.join(REPO_DIR, 'src/data/dialogs');

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

const files = (await readdir(DIALOG_DIR)).filter((file) => file.endsWith('.dlg')).sort();
let failures = 0;
let diagnostics = 0;
process.stdout.write('REAL CORPUS ROUND-TRIP\n');
process.stdout.write('File                               A       B       C\n');
process.stdout.write('------------------------------------------------------\n');
for (const file of files) {
  const filename = `src/data/dialogs/${file}`;
  const source = await readFile(path.join(DIALOG_DIR, file), 'utf8');
  const first = parseDlg(source, filename);
  const canonical = printScenes(first.scenes, first.comments);
  const second = parseDlg(canonical, filename);
  const a = deepEqual(withoutLines(first), withoutLines(second));
  const b = canonical === printScenes(second.scenes, second.comments);
  const c = first.diagnostics.length === 0 && second.diagnostics.length === 0;
  diagnostics += first.diagnostics.length + second.diagnostics.length;
  if (!(a && b && c)) failures += 1;
  process.stdout.write(`${file.padEnd(34)} ${a ? 'PASS' : 'FAIL'}    ${b ? 'PASS' : 'FAIL'}    ${c ? 'PASS' : 'FAIL'}\n`);
  for (const item of [...first.diagnostics, ...second.diagnostics]) process.stdout.write(`  ${item.message}\n`);
}
process.stdout.write(`${failures ? 'FAIL' : 'PASS'} total: ${files.length - failures}/${files.length} files; ${diagnostics} diagnostics\n`);
if (failures || diagnostics) process.exitCode = 1;

