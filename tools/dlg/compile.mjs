// Phase-3 in-memory compiler and corpus validator.
//
//   node tools/dlg/compile.mjs --check
//   node tools/dlg/compile.mjs --json=<file>


import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseAst } from 'rollup/parseAst';
import { deepEqual } from './baseline.mjs';
import { formatDiagnostic } from './diagnostics.mjs';
import { emitNodes } from './emit.mjs';
import { allocate, loadLock } from './lock.mjs';
import { parseDlg } from './parse.mjs';

const TOOL_DIR = import.meta.dirname;
const REPO_DIR = path.resolve(TOOL_DIR, '../..');
const DIALOG_DIR = path.join(REPO_DIR, 'src/data/dialogs');
const LOCK_FILE = path.join(DIALOG_DIR, 'dialogs.lock.json');
const DIALOG_STATE_FILE = path.join(REPO_DIR, 'src/states/DialogState.js');
const ENCOUNTERS_FILE = path.join(REPO_DIR, 'src/data/encounters/index.js');
const ITEMS_FILE = path.join(REPO_DIR, 'src/data/items.js');
const STATS_FILE = path.join(REPO_DIR, 'src/data/stats.js');
const ROOMS_FILE = path.join(REPO_DIR, 'src/data/rooms/index.js');
const CHARACTERS_FILE = path.join(REPO_DIR, 'src/data/characters.js');
const TRAITS_FILE = path.join(REPO_DIR, 'src/data/traits.js');
const NODE_TYPES = new Set(['text', 'choice', 'condition', 'action', 'stage', 'end']);

function importFresh(filePath, tag) {
  const url = pathToFileURL(filePath);
  url.searchParams.set('dlg-compile', `${tag}-${Date.now()}`);
  return import(url.href);
}

function findStringSet(ast, name) {
  for (const statement of ast.body) {
    if (statement.type !== 'VariableDeclaration') continue;
    for (const declaration of statement.declarations) {
      if (declaration.id?.type !== 'Identifier' || declaration.id.name !== name) continue;
      const init = declaration.init;
      const values = init?.type === 'NewExpression'
        && init.callee?.type === 'Identifier' && init.callee.name === 'Set'
        && init.arguments?.[0]?.type === 'ArrayExpression'
        ? init.arguments[0].elements.map((element) => element?.type === 'Literal' ? element.value : undefined)
        : null;
      if (!values || values.some((value) => typeof value !== 'string')) {
        throw new Error(`${name} must be a static new Set([...string literals]) declaration.`);
      }
      return new Set(values);
    }
  }
  throw new Error(`Could not locate ${name} in src/states/DialogState.js.`);
}

function diagnosticKind(item) {
  if (item.message.includes('does not define') || item.message.includes('undefined label')) return 'unresolved';
  if (item.message.includes('label @') && item.message.includes('already defined')) return 'duplicate-label';
  if (item.message.includes('needs an end statement that can be reached')) return 'no-end';
  return 'grammar';
}

function statementReferenceCount(scene) {
  let count = 0;
  for (const stmt of scene.stmts) {
    if (stmt.next) count += 1;
    if (stmt.kind === 'condition') {
      if (stmt.ifTrue) count += 1;
      if (stmt.ifFalse) count += 1;
    }
    if (stmt.kind === 'choice') {
      count += stmt.arms.length;
      count += stmt.arms.filter((arm) => arm.failNext !== undefined).length;
    }
    if (stmt.kind === 'stage') {
      for (const beat of stmt.beats) count += beat.ops.filter(({ verb }) => verb === 'after').length;
    }
  }
  return count;
}

function nodeEdges(tree, index) {
  const node = tree[index];
  if (!node || node.type === 'end') return [];
  if (node.type === 'condition') return [node.ifTrue ?? index + 1, node.ifFalse ?? index + 1];
  if (node.type === 'choice') {
    const edges = (node.choices ?? []).map((choice) => choice.next ?? index + 1);
    for (const choice of node.choices ?? []) {
      if (choice.failNext !== undefined) edges.push(choice.failNext);
    }
    if (node.fallback !== undefined) edges.push(node.fallback);
    return edges;
  }
  return [node.next ?? index + 1];
}

function reachable(tree) {
  const pending = tree.length ? [0] : [];
  const visited = new Set();
  while (pending.length) {
    const index = pending.pop();
    if (!Number.isInteger(index) || index < 0 || index >= tree.length || visited.has(index)) continue;
    visited.add(index);
    pending.push(...nodeEdges(tree, index));
  }
  return visited;
}

function modeIssues(sceneRecords, quizExpected, evergreenExpected) {
  const issues = [];
  const declared = {
    quiz: new Map(),
    'evergreen-hub': new Map(),
  };
  for (const { scene, file } of sceneRecords) {
    for (const mode of scene.modes) {
      if (!declared[mode].has(scene.id)) declared[mode].set(scene.id, []);
      declared[mode].get(scene.id).push(file);
    }
  }
  const compare = (mode, expected) => {
    for (const id of expected) {
      const sites = declared[mode].get(id) ?? [];
      if (sites.length !== 1) issues.push(`${id}: DialogState requires exactly one mode ${mode} declaration, found ${sites.length}.`);
    }
    for (const [id, sites] of declared[mode]) {
      if (!expected.has(id)) issues.push(`${id}: declares mode ${mode}, but DialogState does not list it.`);
      else if (sites.length !== 1) issues.push(`${id}: mode ${mode} is declared ${sites.length} times.`);
    }
  };
  compare('quiz', quizExpected);
  compare('evergreen-hub', evergreenExpected);
  return issues;
}

function displayPath(filePath) {
  return path.relative(REPO_DIR, filePath).split(path.sep).join('/');
}

// Additive means: every scene the lock already had is still there, every label
// it already had is still there AT THE SAME INDEX, and no scene's length shrank.
// Everything else is a violation and fails the build.
export function classifyLockDelta(before, after) {
  const violations = [];
  const additions = [];
  for (const [sceneId, scene] of Object.entries(before.scenes ?? {})) {
    const next = after.scenes?.[sceneId];
    if (!next) {
      violations.push(`dialogs.lock.json: scene ${sceneId} would be dropped from the lock.`);
      continue;
    }
    for (const [label, index] of Object.entries(scene.labels ?? {})) {
      if (!Object.hasOwn(next.labels ?? {}, label)) {
        violations.push(`dialogs.lock.json: @${label} would be dropped from scene ${sceneId} (its index must stay reserved).`);
      } else if (next.labels[label] !== index) {
        violations.push(`dialogs.lock.json: @${label} in scene ${sceneId} would move ${index} -> ${next.labels[label]}, which changes _chose_ save keys.`);
      }
    }
    if ((next.length ?? 0) < (scene.length ?? 0)) {
      violations.push(`dialogs.lock.json: scene ${sceneId} would shrink ${scene.length} -> ${next.length}.`);
    }
  }
  for (const [sceneId, scene] of Object.entries(after.scenes ?? {})) {
    const prev = before.scenes?.[sceneId];
    if (!prev) { additions.push(`+ scene ${sceneId} (${Object.keys(scene.labels ?? {}).length} labels, length ${scene.length})`); continue; }
    for (const [label, index] of Object.entries(scene.labels ?? {})) {
      if (!Object.hasOwn(prev.labels ?? {}, label)) additions.push(`+ @${label} = ${index} in ${sceneId}`);
    }
    if ((scene.length ?? 0) > (prev.length ?? 0)) additions.push(`~ ${sceneId} length ${prev.length} -> ${scene.length}`);
  }
  return { violations, additions, dirty: !deepEqual(before, after) };
}

export async function compileCorpus() {
  const filenames = (await readdir(DIALOG_DIR)).filter((name) => name.endsWith('.dlg')).sort();
  if (!filenames.length) throw new Error('No src/data/dialogs/*.dlg files were found.');
  const [lock, dialogStateSource, encountersModule, itemsModule, statsModule, roomsModule, charactersModule, traitsModule] = await Promise.all([
    loadLock(LOCK_FILE),
    readFile(DIALOG_STATE_FILE, 'utf8'),
    importFresh(ENCOUNTERS_FILE, 'encounters'),
    importFresh(ITEMS_FILE, 'items'),
    importFresh(STATS_FILE, 'stats'),
    importFresh(ROOMS_FILE, 'rooms'),
    importFresh(CHARACTERS_FILE, 'characters'),
    importFresh(TRAITS_FILE, 'traits'),
  ]);
  const stateAst = parseAst(dialogStateSource);
  const quizExpected = findStringSet(stateAst, 'KNOWLEDGE_GATE_DIALOGS');
  const evergreenExpected = findStringSet(stateAst, 'EVERGREEN_HUB_DIALOGS');

  const sceneRecords = [];
  const parseDiagnostics = [];
  let refCount = 0;
  for (const filename of filenames) {
    const source = await readFile(path.join(DIALOG_DIR, filename), 'utf8');
    const parsed = parseDlg(source, `src/data/dialogs/${filename}`);
    parseDiagnostics.push(...parsed.diagnostics);
    for (const scene of parsed.scenes) {
      sceneRecords.push({ scene, file: filename });
      refCount += statementReferenceCount(scene);
    }
  }

  const duplicates = [];
  const firstScene = new Map();
  const uniqueRecords = [];
  for (const record of sceneRecords) {
    if (firstScene.has(record.scene.id)) {
      duplicates.push(`${record.scene.id}: ${firstScene.get(record.scene.id)} and ${record.file}.`);
    } else {
      firstScene.set(record.scene.id, record.file);
      uniqueRecords.push(record);
    }
  }

  let lockAfter = lock;
  const dialogs = {};
  const allocationIssues = [];
  for (const { scene, file } of uniqueRecords) {
    try {
      const allocated = allocate(scene.id, scene.stmts, lockAfter);
      lockAfter = allocated.lockAfter;
      dialogs[scene.id] = emitNodes(scene, allocated.indexOf, allocated.length, allocated.pads);
    } catch (error) {
      allocationIssues.push(`${file} / ${scene.id}: ${error.message}`);
    }
  }
  // THE LOCK IS APPEND-ONLY, NOT FROZEN (DESIGN 3.3 rule 1: "a new label takes
  // the next free index"). This used to be a flat `deepEqual(lock, lockAfter)`
  // error, which made the lock immutable rather than append-only and therefore
  // made the corpus UNGROWABLE: adding one labelled statement — or one scene —
  // failed both `dialogs:build` and `dialogs:check`, and the only writer of the
  // file was the one-shot `--reseed` converter. Chapter 2 authoring would have
  // been blocked on its first line.
  //
  // What must stay hard is the invariant the lock exists FOR: no label may move
  // and none may be dropped, because `_chose_${dialogId}_${nodeIndex}_${choiceIndex}`
  // is a persisted save key. `allocate()` already throws on a backwards move and
  // already carries a removed label's index forward as a reserved pad, so the
  // classification here only has to catch a lock that changed some other way.
  const lockDelta = classifyLockDelta(lock, lockAfter);
  const lockIssues = lockDelta.violations;

  const unknownTypes = [];
  let nodeCount = 0;
  for (const [sceneId, tree] of Object.entries(dialogs)) {
    nodeCount += tree.length;
    for (let index = 0; index < tree.length; index += 1) {
      if (!NODE_TYPES.has(tree[index]?.type)) unknownTypes.push(`${sceneId}[${index}]: ${JSON.stringify(tree[index]?.type)}.`);
    }
  }

  const noEnd = [];
  const unreachable = [];
  for (const [sceneId, tree] of Object.entries(dialogs)) {
    const visited = reachable(tree);
    if (![...visited].some((index) => tree[index].type === 'end')) noEnd.push(sceneId);
    const indices = tree.map((_, index) => index).filter((index) => !visited.has(index));
    if (indices.length) unreachable.push({ sceneId, indices });
  }
  const unreachableCount = unreachable.reduce((total, entry) => total + entry.indices.length, 0);

  // EVERY CHOICE NODE MUST CARRY A LABEL, and this is a save-key rule, not a
  // style rule. `_chose___` is persisted, and
  // the lock only pins an index that a LABEL claims. An unlabelled `ask` therefore
  // slides whenever a line is inserted above it, silently changing that key for
  // every save in the wild - measured on the shipped corpus: one prose line added
  // above branch_decision's ask moved it 6 -> 8, and the whole reviewable lock diff
  // was "length": 36 -> 37. 49 of the 61 choice nodes were unpinned; all 61 are
  // pinned now, and this keeps it that way. A label costs nothing: it consumes no
  // index, and adding all 49 left index.js byte-identical.
  const unpinnedChoices = [];
  for (const { scene, file } of uniqueRecords) {
    for (const stmt of scene.stmts) {
      if (stmt.kind !== 'choice' || (stmt.labels ?? []).length) continue;
      unpinnedChoices.push(`${file} / ${scene.id}: an  with no @label. Give it one so the lock pins its index and its _chose_ save keys cannot move.`);
    }
  }

  // WORKING-STYLE CHECKS key directly on the trait flags — "the trait IS the
  // stat" (SKILL-CHECK-SEED, director shape 1). A check against anything else
  // has no working-style name for DialogState to print in the pass prefix, so
  // it is a build error, the same way an unknown fight id is.
  const traitFlags = new Set(Object.values(traitsModule.TRAITS).map((trait) => trait.flag));
  const checkIssues = [];
  let checkArms = 0;
  for (const [sceneId, tree] of Object.entries(dialogs)) {
    for (let index = 0; index < tree.length; index += 1) {
      const node = tree[index];
      if (node.type !== 'choice') continue;
      (node.choices ?? []).forEach((choice, choiceIndex) => {
        if (!Object.hasOwn(choice, 'check')) return;
        checkArms += 1;
        if (!traitFlags.has(choice.check)) {
          checkIssues.push(`${sceneId}[${index}] arm ${choiceIndex}: ${choice.check} is not a trait flag (known: ${[...traitFlags].join(', ')}).`);
        }
      });
    }
  }

  const modes = modeIssues(sceneRecords, quizExpected, evergreenExpected);
  const encounterIssues = [];
  const itemIssues = [];
  const statIssues = [];
  let fights = 0;
  let gives = 0;
  let stats = 0;
  for (const [sceneId, tree] of Object.entries(dialogs)) {
    for (let index = 0; index < tree.length; index += 1) {
      const node = tree[index];
      if (node.type !== 'action') continue;
      if (node.action === 'start_combat') {
        fights += 1;
        if (!Object.hasOwn(encountersModule.ENCOUNTERS, node.encounter)) encounterIssues.push(`${sceneId}[${index}]: ${node.encounter}.`);
      } else if (node.action === 'give_item') {
        gives += 1;
        if (!Object.hasOwn(itemsModule.ITEMS, node.item)) itemIssues.push(`${sceneId}[${index}]: ${node.item}.`);
      } else if (node.action === 'modify_stat') {
        stats += 1;
        if (!Object.hasOwn(statsModule.PLAYER_BASE_STATS, node.stat)) statIssues.push(`${sceneId}[${index}]: ${node.stat}.`);
      }
    }
  }

  // This is the resolution contract from tools/_g-stage-verify.mjs: actors may
  // be the player, a room NPC, or a spawnable character; string-valued point
  // fields may also name any room mark.
  const allMarks = new Set();
  const roomNpcIds = new Set();
  for (const room of Object.values(roomsModule.ROOMS)) {
    for (const mark of Object.keys(room.marks ?? {})) allMarks.add(mark);
    for (const npc of room.npcs ?? []) roomNpcIds.add(npc.id);
  }
  const pointFields = ['walkTo', 'face', 'sit', 'exit', 'spawnAt', 'teleportTo'];
  const stageIssues = [];
  let actorChecks = 0;
  let markChecks = 0;
  for (const [sceneId, tree] of Object.entries(dialogs)) {
    for (let index = 0; index < tree.length; index += 1) {
      const node = tree[index];
      if (node.type !== 'stage') continue;
      for (let beatIndex = 0; beatIndex < node.beats.length; beatIndex += 1) {
        const beat = node.beats[beatIndex];
        actorChecks += 1;
        const actorKnown = typeof beat.actor === 'string'
          && (beat.actor === 'player' || roomNpcIds.has(beat.actor) || Object.hasOwn(charactersModule.CHARACTER_CONFIGS, beat.actor));
        if (!actorKnown) stageIssues.push(`${sceneId}[${index}].beats[${beatIndex}]: unknown actor ${JSON.stringify(beat.actor)}.`);
        if (beat.spawn && !Object.hasOwn(charactersModule.CHARACTER_CONFIGS, beat.actor)) {
          stageIssues.push(`${sceneId}[${index}].beats[${beatIndex}]: spawn actor ${JSON.stringify(beat.actor)} has no CHARACTER_CONFIGS entry.`);
        }
        for (const field of pointFields) {
          const value = beat[field];
          if (typeof value !== 'string') continue;
          markChecks += 1;
          if (allMarks.has(value) || value === 'player' || roomNpcIds.has(value)
              || Object.hasOwn(charactersModule.CHARACTER_CONFIGS, value)) continue;
          stageIssues.push(`${sceneId}[${index}].beats[${beatIndex}].${field}: ${JSON.stringify(value)} is neither a mark nor an actor.`);
        }
      }
    }
  }

  const byKind = {
    unresolved: parseDiagnostics.filter((item) => diagnosticKind(item) === 'unresolved'),
    duplicateLabel: parseDiagnostics.filter((item) => diagnosticKind(item) === 'duplicate-label'),
    parsedNoEnd: parseDiagnostics.filter((item) => diagnosticKind(item) === 'no-end'),
    grammar: parseDiagnostics.filter((item) => diagnosticKind(item) === 'grammar'),
  };
  const named = [
    { name: 'unknown node type', count: unknownTypes.length, checked: `${nodeCount} nodes`, details: unknownTypes },
    { name: 'unresolved label', count: byKind.unresolved.length, checked: `${refCount} label references`, diagnostics: byKind.unresolved },
    { name: 'duplicate label within a scene', count: byKind.duplicateLabel.length, checked: `${sceneRecords.length} scenes`, diagnostics: byKind.duplicateLabel },
    { name: 'duplicate scene id across files', count: duplicates.length, checked: `${sceneRecords.length} declarations`, details: duplicates },
    { name: 'scene with no reachable end', count: noEnd.length, checked: `${Object.keys(dialogs).length} scenes`, details: noEnd },
    { name: 'choice node pinned by a label', count: unpinnedChoices.length, checked: `${sceneRecords.length} scenes`, details: unpinnedChoices },
    { name: 'mode declaration agreement', count: modes.length, checked: `${quizExpected.size + evergreenExpected.size} DialogState entries`, details: modes },
    { name: 'fight encounter resolution', count: encounterIssues.length, checked: `${fights} fight statements`, details: encounterIssues },
    { name: 'give item resolution', count: itemIssues.length, checked: `${gives} give statements`, details: itemIssues },
    { name: 'stat id resolution', count: statIssues.length, checked: `${stats} stat statements`, details: statIssues },
    { name: 'stage actor and mark resolution', count: stageIssues.length, checked: `${actorChecks} actors + ${markChecks} marks`, details: stageIssues },
    { name: 'working-style check trait resolution', count: checkIssues.length, checked: `${checkArms} check arms`, details: checkIssues },
  ];
  const infrastructure = [
    ...byKind.grammar.map((item) => formatDiagnostic(item)),
    ...allocationIssues,
    ...lockIssues,
  ];
  // The parser also reports no-reachable-end. The emitted-graph named check is
  // authoritative, so the parser copy is not double-counted.
  if (byKind.parsedNoEnd.length !== noEnd.length) {
    infrastructure.push(`Parser/emitted no-reachable-end counts disagree (${byKind.parsedNoEnd.length} vs ${noEnd.length}).`);
  }
  const errorCount = named.reduce((total, check) => total + check.count, 0) + infrastructure.length;
  return {
    dialogs,
    lockAfter,
    lockDelta,
    lockFile: LOCK_FILE,
    files: filenames,
    sceneRecords,
    named,
    infrastructure,
    warnings: unreachable,
    warningCount: unreachableCount,
    errorCount,
    nodeCount,
    modeCount: quizExpected.size + evergreenExpected.size,
  };
}

export function printCompileSummary(result, mode = 'check') {
  process.stdout.write(`COMPILE ${mode.toUpperCase()}\n`);
  process.stdout.write(`corpus: ${result.files.length} files, ${Object.keys(result.dialogs).length} scenes, ${result.nodeCount} nodes\n`);
  for (const check of result.named) {
    process.stdout.write(`${check.count ? 'FAIL' : 'PASS'} ${check.name}: ${check.count} error(s) (${check.checked} checked)\n`);
    for (const detail of check.details ?? []) process.stdout.write(`  ${detail}\n`);
    for (const item of check.diagnostics ?? []) process.stdout.write(`${formatDiagnostic(item)}\n`);
  }
  process.stdout.write(`WARN node with no path from index 0: ${result.warningCount} warning(s) (${result.nodeCount} nodes checked)\n`);
  for (const warning of result.warnings) {
    process.stdout.write(`  ${warning.sceneId}: ${warning.indices.join(', ')}\n`);
  }
  process.stdout.write(`${result.infrastructure.length ? 'FAIL' : 'PASS'} parser/allocation/lock integrity: ${result.infrastructure.length} error(s)\n`);
  for (const detail of result.infrastructure) process.stdout.write(`  ${detail.split('\n').join('\n  ')}\n`);
  process.stdout.write(`${result.errorCount ? 'FAIL' : 'PASS'} compile: ${result.errorCount} error(s), ${result.warningCount} warning(s)\n`);
}

function parseArgs(argv) {
  if (argv.length !== 1) throw new Error('Usage: node tools/dlg/compile.mjs --check | --json=<file>');
  if (argv[0] === '--check') return { mode: 'check', out: null };
  if (argv[0].startsWith('--json=') && argv[0].length > '--json='.length) {
    return { mode: 'json', out: path.resolve(REPO_DIR, argv[0].slice('--json='.length)) };
  }
  throw new Error('Usage: node tools/dlg/compile.mjs --check | --json=<file>');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await compileCorpus();
  printCompileSummary(result, args.mode);
  if (result.errorCount) {
    process.exitCode = 1;
    return;
  }
  if (args.out) {
    const text = `${JSON.stringify(result.dialogs, null, 2)}\n`;
    await writeFile(args.out, text, 'utf8');
    process.stdout.write(`WRITE ${displayPath(args.out)}: ${result.nodeCount} nodes\n`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`FAIL: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}

