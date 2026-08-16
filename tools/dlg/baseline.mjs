// Deterministic deep snapshots for the dialog corpus.
//
// Object key order is preserved when a snapshot is written, but deepEqual compares
// objects by key/value presence rather than key order. Arrays remain order-sensitive.

import { createHash } from 'node:crypto';
import { constants as fsConstants } from 'node:fs';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const TOOL_DIR = import.meta.dirname;
const REPO_DIR = path.resolve(TOOL_DIR, '../..');
const DEFAULT_BASELINE = path.join(TOOL_DIR, 'baseline.json');
const PRE_NORMALIZE_BASELINE = path.join(TOOL_DIR, 'baseline.pre-normalize.json');
const DIALOGS_FILE = path.join(REPO_DIR, 'src/data/dialogs/index.js');
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export function deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && a.length !== b.length) return false;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!hasOwn(b, key) || !deepEqual(a[key], b[key])) return false;
  }
  return true;
}

function shown(value) {
  if (value === undefined) return 'undefined';
  const json = JSON.stringify(value);
  return json === undefined ? String(value) : json;
}

function childPath(base, key, arrayParent) {
  return arrayParent ? `${base}[${key}]` : `${base}.${key}`;
}

function diffValue(left, right, where, findings) {
  if (deepEqual(left, right)) return;
  const leftObject = left !== null && typeof left === 'object';
  const rightObject = right !== null && typeof right === 'object';
  if (!leftObject || !rightObject || Array.isArray(left) !== Array.isArray(right)) {
    findings.push(`${where}: ${shown(left)} != ${shown(right)}`);
    return;
  }

  if (Array.isArray(left) && left.length !== right.length) {
    findings.push(`${where}.length: ${left.length} != ${right.length}`);
  }

  const keys = [...Object.keys(left), ...Object.keys(right).filter((key) => !hasOwn(left, key))];
  for (const key of keys) {
    const field = childPath(where, key, Array.isArray(left));
    if (!hasOwn(right, key)) {
      findings.push(`${field}: only in LEFT`);
    } else if (!hasOwn(left, key)) {
      findings.push(`${field}: only in RIGHT`);
    } else {
      diffValue(left[key], right[key], field, findings);
    }
  }
}

export function diffTrees(leftObject, rightObject) {
  const findings = [];
  const sceneIds = [
    ...Object.keys(leftObject),
    ...Object.keys(rightObject).filter((sceneId) => !hasOwn(leftObject, sceneId)),
  ];

  for (const sceneId of sceneIds) {
    if (!hasOwn(rightObject, sceneId)) {
      findings.push(`${sceneId}: only in LEFT`);
      continue;
    }
    if (!hasOwn(leftObject, sceneId)) {
      findings.push(`${sceneId}: only in RIGHT`);
      continue;
    }

    const leftTree = leftObject[sceneId];
    const rightTree = rightObject[sceneId];
    if (!Array.isArray(leftTree) || !Array.isArray(rightTree)) {
      diffValue(leftTree, rightTree, sceneId, findings);
      continue;
    }
    if (leftTree.length !== rightTree.length) {
      findings.push(`${sceneId}.length: ${leftTree.length} != ${rightTree.length}`);
    }
    const length = Math.max(leftTree.length, rightTree.length);
    for (let index = 0; index < length; index++) {
      const where = `${sceneId}[${index}]`;
      const inLeft = hasOwn(leftTree, index);
      const inRight = hasOwn(rightTree, index);
      if (!inRight) findings.push(`${where}: only in LEFT`);
      else if (!inLeft) findings.push(`${where}: only in RIGHT`);
      else diffValue(leftTree[index], rightTree[index], where, findings);
    }
  }
  return findings;
}

function displayPath(filePath) {
  const relative = path.relative(REPO_DIR, filePath);
  return (relative || '.').split(path.sep).join('/');
}

function snapshotText(dialogs) {
  return `${JSON.stringify(dialogs, null, 2)}\n`;
}

function corpusSize(dialogs) {
  return {
    trees: Object.keys(dialogs).length,
    nodes: Object.values(dialogs).reduce((total, tree) => total + tree.length, 0),
  };
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readSnapshot(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function importLiveDialogs() {
  const url = pathToFileURL(DIALOGS_FILE);
  url.searchParams.set('baseline', `${Date.now()}`);
  return (await import(url.href)).DIALOGS;
}

function parseArgs(argv) {
  const write = argv.includes('--write');
  const verify = argv.includes('--verify');
  const outArg = argv.find((arg) => arg.startsWith('--out='));
  const againstArg = argv.find((arg) => arg.startsWith('--against='));
  const known = new Set(['--write', '--verify']);
  const unknown = argv.filter((arg) => !known.has(arg) && !arg.startsWith('--out=') && !arg.startsWith('--against='));
  if (unknown.length || write === verify || (outArg && !write) || (againstArg && !verify)) {
    throw new Error('Usage: node tools/dlg/baseline.mjs --write [--out=<file>] | --verify [--against=<file>]');
  }
  const resolveArg = (arg) => path.resolve(REPO_DIR, arg.slice(arg.indexOf('=') + 1));
  return {
    mode: write ? 'write' : 'verify',
    out: outArg ? resolveArg(outArg) : DEFAULT_BASELINE,
    against: againstArg ? resolveArg(againstArg) : null,
    customOut: Boolean(outArg),
  };
}

async function writeSnapshot(dialogs, filePath) {
  const text = snapshotText(dialogs);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, text, 'utf8');
  const { trees, nodes } = corpusSize(dialogs);
  process.stdout.write(`WRITE ${displayPath(filePath)}: ${trees} trees, ${nodes} nodes, ${Buffer.byteLength(text)} bytes\n`);
  return text;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === 'write') {
    const dialogs = await importLiveDialogs();
    const text = await writeSnapshot(dialogs, args.out);
    if (!args.customOut) {
      if (await fileExists(PRE_NORMALIZE_BASELINE)) {
        const permanent = await readFile(PRE_NORMALIZE_BASELINE, 'utf8');
        process.stdout.write(`PRESERVE ${displayPath(PRE_NORMALIZE_BASELINE)}: sha256 ${sha256(permanent)}\n`);
      } else {
        await writeFile(PRE_NORMALIZE_BASELINE, text, { encoding: 'utf8', flag: 'wx' });
        process.stdout.write(`WRITE ${displayPath(PRE_NORMALIZE_BASELINE)}: sha256 ${sha256(text)}\n`);
      }
    }
    return;
  }

  const leftPath = DEFAULT_BASELINE;
  const left = await readSnapshot(leftPath);
  const right = args.against ? await readSnapshot(args.against) : await importLiveDialogs();
  const findings = diffTrees(left, right);
  if (findings.length) {
    process.stderr.write(`FAIL: ${findings.length} dialog snapshot difference(s)\n`);
    for (const finding of findings) process.stderr.write(`${finding}\n`);
    process.exitCode = 1;
    return;
  }
  const target = args.against ? displayPath(args.against) : 'live DIALOGS';
  process.stdout.write(`PASS: ${displayPath(leftPath)} deep-equals ${target}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`FAIL: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

