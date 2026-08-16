// Dialog semantic comparator. It projects both inputs through DialogState's read
// semantics before comparing them. A missing speaker and speaker: undefined are
// intentionally collapsed because the renderer treats both as "no speaker"; this
// is the only field whose presence is normalized away here.
//
//   node tools/_dr-semantic-equal.mjs <left.json> <right.json>
//   node tools/_dr-semantic-equal.mjs <left.json> --live

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { deepEqual, diffTrees } from './dlg/baseline.mjs';

const REPO_DIR = path.resolve(import.meta.dirname, '..');
const DIALOGS_FILE = path.join(REPO_DIR, 'src/data/dialogs/index.js');
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const ACTION_PAYLOAD_FIELDS = [
  'xp', 'encounter', 'quest', 'stat', 'amount', 'item', 'stage', 'objective',
  'status', 'quantity', 'ally', 'ability',
];

function copyPresent(target, source, fields) {
  for (const field of fields) {
    if (hasOwn(source, field)) target[field] = source[field];
  }
}

function projectNode(node, index, sceneId) {
  const projected = { type: node.type };
  switch (node.type) {
    case 'text':
      projected.speaker = node.speaker;
      copyPresent(projected, node, ['text', 'mood', 'minQuestStage', 'maxQuestStage']);
      projected.edgeNext = node.next ?? index + 1;
      return projected;

    case 'choice':
      projected.speaker = node.speaker;
      projected.promptShown = node.prompt || node.text || '';
      projected.edgeFallback = node.fallback ?? undefined;
      projected.choices = (node.choices || []).map((arm) => {
        const choice = {};
        copyPresent(choice, arm, [
          'text', 'flag', 'flagValue', 'requires', 'requiresNot',
          'minQuestStage', 'maxQuestStage',
        ]);
        choice.edgeNext = arm.next ?? index + 1;
        return choice;
      });
      return projected;

    case 'condition':
      copyPresent(projected, node, ['flag']);
      projected.edgeTrue = node.ifTrue ?? index + 1;
      projected.edgeFalse = node.ifFalse ?? index + 1;
      return projected;

    case 'action':
      copyPresent(projected, node, ['action']);
      if (node.action === 'set_flag') {
        projected.flagWritten = node.flag;
        projected.valueWritten = node.value !== undefined ? node.value : true;
      }
      copyPresent(projected, node, ACTION_PAYLOAD_FIELDS);
      projected.edgeNext = node.next ?? index + 1;
      return projected;

    case 'stage':
      copyPresent(projected, node, ['beats', 'concurrent']);
      projected.edgeNext = node.next ?? index + 1;
      return projected;

    case 'end':
      return projected;

    default:
      throw new Error(`${sceneId}[${index}]: unknown node type ${JSON.stringify(node.type)}`);
  }
}

function projectDialogs(dialogs) {
  return Object.fromEntries(Object.entries(dialogs).map(([sceneId, tree]) => [
    sceneId,
    tree.map((node, index) => projectNode(node, index, sceneId)),
  ]));
}

async function readSnapshot(arg) {
  const filePath = path.resolve(REPO_DIR, arg);
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readLive() {
  const url = pathToFileURL(DIALOGS_FILE);
  url.searchParams.set('semantic-equal', `${Date.now()}`);
  return (await import(url.href)).DIALOGS;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || (args[1] === '--live' ? args[0].startsWith('--') : args[1].startsWith('--'))) {
    throw new Error('Usage: node tools/_dr-semantic-equal.mjs <left.json> <right.json> | <left.json> --live');
  }

  const left = await readSnapshot(args[0]);
  const right = args[1] === '--live' ? await readLive() : await readSnapshot(args[1]);
  const leftProjection = projectDialogs(left);
  const rightProjection = projectDialogs(right);
  if (deepEqual(leftProjection, rightProjection)) {
    const rightName = args[1] === '--live' ? 'live DIALOGS' : args[1].split('\\').join('/');
    process.stdout.write(`PASS: rendered dialog semantics match (${args[0].split('\\').join('/')} vs ${rightName})\n`);
    return;
  }

  const findings = diffTrees(leftProjection, rightProjection);
  process.stderr.write(`FAIL: ${findings.length} rendered semantic difference(s)\n`);
  for (const finding of findings) process.stderr.write(`${finding}\n`);
  process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`FAIL: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});

