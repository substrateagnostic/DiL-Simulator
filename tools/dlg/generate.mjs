// Build/check the committed dialog module from the .dlg authoring corpus.
//
//   node tools/dlg/generate.mjs
//   node tools/dlg/generate.mjs --check


import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileCorpus, printCompileSummary } from './compile.mjs';

const REPO_DIR = path.resolve(import.meta.dirname, '../..');
const OUTPUT_FILE = path.join(REPO_DIR, 'src/data/dialogs/index.js');
const OUTPUT_NAME = 'src/data/dialogs/index.js';
const BANNER = `// DO NOT EDIT — generated file.
// Generated from src/data/dialogs/*.dlg by npm run dialogs:build.
// Edit the .dlg files, not this file; all 943 authoring comments live there.`;

export function renderDialogsModule(dialogs) {
  return `${BANNER}\n\nexport const DIALOGS = ${JSON.stringify(dialogs, null, 2)};\n`;
}

function parseArgs(argv) {
  if (argv.length === 0) return { check: false };
  if (argv.length === 1 && argv[0] === '--check') return { check: true };
  throw new Error('Usage: node tools/dlg/generate.mjs [--check]');
}

function byteDescription(byte) {
  if (byte === undefined) return 'EOF';
  if (byte === 0x0a) return 'LF';
  if (byte === 0x0d) return 'CR';
  if (byte >= 0x20 && byte <= 0x7e) return `${JSON.stringify(String.fromCharCode(byte))} (0x${byte.toString(16).padStart(2, '0')})`;
  return `0x${byte.toString(16).padStart(2, '0')}`;
}

function describeDifference(expected, actual) {
  const sharedLength = Math.min(expected.length, actual.length);
  let offset = 0;
  while (offset < sharedLength && expected[offset] === actual[offset]) offset += 1;
  if (offset === sharedLength && expected.length === actual.length) return null;
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (expected[index] === 0x0a) line += 1;
  }
  return `expected ${expected.length} bytes, found ${actual.length} bytes; first difference at byte ${offset} (line ${line}): expected ${byteDescription(expected[offset])}, found ${byteDescription(actual[offset])}`;
}

async function main() {
  const { check } = parseArgs(process.argv.slice(2));
  const result = await compileCorpus();
  if (result.errorCount > 0) {
    printCompileSummary(result, check ? 'check' : 'build');
    process.exitCode = 1;
    return;
  }

  const source = renderDialogsModule(result.dialogs);
  const expected = Buffer.from(source, 'utf8');
  const summary = `${result.files.length} files, ${Object.keys(result.dialogs).length} scenes, ${result.nodeCount} nodes, ${result.warningCount} warnings`;

  if (!check) {
    await writeFile(OUTPUT_FILE, source, { encoding: 'utf8' });
    process.stdout.write(`WRITE ${OUTPUT_NAME}: ${summary}\n`);
    return;
  }

  let actual;
  try {
    actual = await readFile(OUTPUT_FILE);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    process.stderr.write(`FAIL ${OUTPUT_NAME} is missing; run npm run dialogs:build\n`);
    process.exitCode = 1;
    return;
  }
  const difference = describeDifference(expected, actual);
  if (difference) {
    process.stderr.write(`FAIL ${OUTPUT_NAME} is stale: ${difference}. Run npm run dialogs:build.\n`);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(`PASS ${OUTPUT_NAME} is current: ${summary}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`FAIL: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
