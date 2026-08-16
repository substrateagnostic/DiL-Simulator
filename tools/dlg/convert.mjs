// One-shot Phase-3 converter from the shipped JavaScript corpus to .dlg files.
//
// The 3,195 inline /* NN */ markers in the source are deliberately dropped:
// they are array-index markers, and mechanical @n<i> labels replace them at
// every actual jump target. They are not dialogue comments and their removal is
// not a loss of authored documentation.
//
//   node tools/dlg/convert.mjs --dry
//   DIALOGS_LOCK_RESEED=i-know node tools/dlg/convert.mjs --write


import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseAst } from 'rollup/parseAst';
import { deepEqual, diffTrees } from './baseline.mjs';
import { emitNodes } from './emit.mjs';
import { allocate, saveLock } from './lock.mjs';
import { parseDlg } from './parse.mjs';
import { printScenes } from './print.mjs';

const TOOL_DIR = import.meta.dirname;
const REPO_DIR = path.resolve(TOOL_DIR, '../..');
const DIALOG_DIR = path.join(REPO_DIR, 'src/data/dialogs');
const DIALOGS_FILE = path.join(DIALOG_DIR, 'index.js');
const LOCK_FILE = path.join(DIALOG_DIR, 'dialogs.lock.json');
const BASELINE_FILE = path.join(TOOL_DIR, 'baseline.json');
const DIALOG_STATE_FILE = path.join(REPO_DIR, 'src/states/DialogState.js');
const EXPECTED_COMMENTS = 943;
const EXPECTED_INDEX_MARKERS = 3195;
const MAX_FILE_LINES = 600;

function propertyName(property) {
  if (property?.type !== 'Property' || property.computed) return null;
  if (property.key.type === 'Identifier') return property.key.name;
  if (property.key.type === 'Literal' && typeof property.key.value === 'string') return property.key.value;
  return null;
}

function propertyMap(object) {
  return new Map(object.properties.map((property) => [propertyName(property), property]));
}

function findDialogsObject(ast) {
  for (const statement of ast.body) {
    if (statement.type !== 'ExportNamedDeclaration' || statement.declaration?.type !== 'VariableDeclaration') continue;
    for (const declaration of statement.declaration.declarations) {
      if (declaration.id?.type === 'Identifier' && declaration.id.name === 'DIALOGS'
          && declaration.init?.type === 'ObjectExpression') return declaration.init;
    }
  }
  throw new Error('Could not locate export const DIALOGS = { ... }.');
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

function jumpTargets(tree, sceneId) {
  const targets = new Set();
  const add = (target, context) => {
    if (!Number.isInteger(target) || target < 0 || target >= tree.length) {
      throw new Error(`${sceneId}: ${context} has invalid jump target ${JSON.stringify(target)}.`);
    }
    targets.add(target);
  };
  for (let index = 0; index < tree.length; index += 1) {
    const node = tree[index];
    for (const field of ['next', 'ifTrue', 'ifFalse']) {
      if (Object.hasOwn(node, field)) add(node[field], `node ${index}.${field}`);
    }
    for (let armIndex = 0; armIndex < (node.choices?.length ?? 0); armIndex += 1) {
      add(node.choices[armIndex].next, `node ${index}.choices[${armIndex}].next`);
    }
  }
  return targets;
}

function actionStatement(node, sceneId, index) {
  const fields = {
    set_flag: ['flag', 'value'],
    start_combat: ['encounter'],
    give_item: ['item', 'quantity'],
    give_xp: ['xp'],
    modify_stat: ['stat', 'amount'],
    heal: [],
    quest_update: ['quest', 'stage', 'objective', 'status'],
    recruit_ally: ['ally'],
    unlock_ally_ability: ['ally', 'ability'],
  }[node.action];
  if (!fields) throw new Error(`${sceneId}[${index}]: unknown action ${JSON.stringify(node.action)}.`);
  const stmt = { kind: 'action', action: node.action };
  for (const field of fields) if (Object.hasOwn(node, field)) stmt[field] = node[field];
  return stmt;
}

const BEAT_FIELDS = new Set([
  'walkTo', 'face', 'sit', 'stand', 'exit', 'gesture', 'pose', 'expression',
  'spawn', 'spawnAt', 'teleportTo', 'show', 'speed', 'hold', 'after', 'wait',
]);
const NO_ARG_BEATS = new Set(['sit', 'stand', 'spawn', 'show']);

function stageStatement(node, sceneId, nodeIndex, counters) {
  const referenced = new Set();
  for (let beatIndex = 0; beatIndex < node.beats.length; beatIndex += 1) {
    const beat = node.beats[beatIndex];
    if (!Object.hasOwn(beat, 'after')) continue;
    if (!Number.isInteger(beat.after) || beat.after < 0 || beat.after >= node.beats.length) {
      throw new Error(`${sceneId}[${nodeIndex}].beats[${beatIndex}].after is out of range.`);
    }
    referenced.add(beat.after);
    counters.afterSites += 1;
  }
  const beats = node.beats.map((beat, beatIndex) => {
    if (typeof beat.actor !== 'string') {
      throw new Error(`${sceneId}[${nodeIndex}].beats[${beatIndex}] has no string actor.`);
    }
    const converted = {
      labels: referenced.has(beatIndex) ? [`b${beatIndex}`] : [],
      actor: beat.actor,
      ops: [],
    };
    for (const [field, value] of Object.entries(beat)) {
      if (field === 'actor') continue;
      if (!BEAT_FIELDS.has(field)) {
        throw new Error(`${sceneId}[${nodeIndex}].beats[${beatIndex}] has unknown field ${field}.`);
      }
      if (field === 'after') converted.ops.push({ verb: 'after', value: `b${value}` });
      else if (field === 'wait') {
        if (value !== false) throw new Error(`${sceneId}[${nodeIndex}].beats[${beatIndex}] has unsupported wait:${value}.`);
        converted.ops.push({ verb: 'nowait', value: false });
      } else {
        if (NO_ARG_BEATS.has(field) && value !== true) {
          throw new Error(`${sceneId}[${nodeIndex}].beats[${beatIndex}] has unsupported ${field}:${value}.`);
        }
        converted.ops.push({ verb: field, value });
      }
    }
    return converted;
  });
  return { kind: 'stage', concurrent: node.concurrent === true, beats };
}

function statementFromNode(node, index, targets, sceneId, counters) {
  let stmt;
  if (node.type === 'text') {
    stmt = { kind: 'text', speaker: node.speaker, text: node.text };
    if (Object.hasOwn(node, 'mood')) stmt.mood = node.mood;
  } else if (node.type === 'choice') {
    stmt = {
      kind: 'choice',
      prompt: node.prompt,
      arms: node.choices.map((arm) => {
        const converted = { text: arm.text, next: `n${arm.next}` };
        for (const field of ['flag', 'flagValue', 'requires', 'requiresNot']) {
          if (Object.hasOwn(arm, field)) converted[field] = arm[field];
        }
        return converted;
      }),
    };
    if (Object.hasOwn(node, 'speaker')) stmt.speaker = node.speaker;
  } else if (node.type === 'condition') {
    stmt = { kind: 'condition', flag: node.flag, ifTrue: null, ifFalse: null };
    if (Object.hasOwn(node, 'ifTrue')) stmt.ifTrue = `n${node.ifTrue}`;
    if (Object.hasOwn(node, 'ifFalse')) stmt.ifFalse = `n${node.ifFalse}`;
  } else if (node.type === 'action') {
    stmt = actionStatement(node, sceneId, index);
  } else if (node.type === 'stage') {
    if (!Array.isArray(node.beats)) throw new Error(`${sceneId}[${index}]: stage node has no beats array.`);
    stmt = stageStatement(node, sceneId, index, counters);
  } else if (node.type === 'end') {
    stmt = { kind: 'end' };
  } else {
    throw new Error(`${sceneId}[${index}]: unknown node type ${JSON.stringify(node.type)}.`);
  }
  stmt.labels = targets.has(index) ? [`n${index}`] : [];
  if (Object.hasOwn(node, 'next')) stmt.next = `n${node.next}`;
  else if (['text', 'choice', 'action', 'stage'].includes(stmt.kind)) stmt.next = null;
  return stmt;
}

function sourceCommentLines(source) {
  const comments = [];
  let offset = 0;
  const lines = source.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    if (raw.trimStart().startsWith('//')) {
      comments.push({ raw, start: offset, end: offset + raw.length, line: index + 1 });
    }
    offset += raw.length + 1;
  }
  return comments;
}

function commentText(raw, indent) {
  const trimmed = raw.trimStart().replace(/\r$/, '');
  return `${indent}#${trimmed.slice(2)}`;
}

function nestedArray(nodeElement, nodeType) {
  const properties = propertyMap(nodeElement);
  const name = nodeType === 'choice' ? 'choices' : nodeType === 'stage' ? 'beats' : null;
  const value = name ? properties.get(name)?.value : null;
  return value?.type === 'ArrayExpression' ? value : null;
}

function classifyComments(source, dialogsObject, sceneEntries) {
  const comments = sourceCommentLines(source);
  if (comments.length !== EXPECTED_COMMENTS) {
    throw new Error(`Expected ${EXPECTED_COMMENTS} // comment lines, found ${comments.length}.`);
  }
  const records = [];
  const sceneForProperty = new Map(sceneEntries.map((entry) => [entry.property, entry]));
  const firstScene = sceneEntries[0];

  for (const sourceComment of comments) {
    let anchor;
    if (sourceComment.start < dialogsObject.start) {
      anchor = { kind: 'file-header', scene: firstScene };
    } else {
      const containingSceneProperty = dialogsObject.properties.find(
        (property) => sourceComment.start >= property.start && sourceComment.end <= property.end,
      );
      if (!containingSceneProperty) {
        const following = dialogsObject.properties.find((property) => property.start > sourceComment.end);
        anchor = following
          ? { kind: 'scene', scene: sceneForProperty.get(following) }
          : { kind: 'scene-end', scene: sceneEntries.at(-1) };
      } else {
        const sceneEntry = sceneForProperty.get(containingSceneProperty);
        const elements = containingSceneProperty.value.elements;
        const containingNodeIndex = elements.findIndex(
          (element) => sourceComment.start >= element.start && sourceComment.end <= element.end,
        );
        if (containingNodeIndex >= 0) {
          const array = nestedArray(elements[containingNodeIndex], sceneEntry.tree[containingNodeIndex].type);
          const followingNestedIndex = array?.elements.findIndex((element) => element.start > sourceComment.end) ?? -1;
          if (followingNestedIndex >= 0) {
            const kind = sceneEntry.tree[containingNodeIndex].type === 'choice' ? 'arm' : 'beat';
            anchor = { kind, scene: sceneEntry, nodeIndex: containingNodeIndex, childIndex: followingNestedIndex };
          } else {
            anchor = { kind: 'stmt', scene: sceneEntry, nodeIndex: containingNodeIndex };
          }
        } else {
          const followingNodeIndex = elements.findIndex((element) => element.start > sourceComment.end);
          anchor = followingNodeIndex >= 0
            ? { kind: 'stmt', scene: sceneEntry, nodeIndex: followingNodeIndex }
            : { kind: 'scene-end', scene: sceneEntry };
        }
      }
    }
    records.push({ source: sourceComment, anchor });
  }
  return records;
}

function materializeComment(record) {
  const { anchor } = record;
  const indent = anchor.kind === 'scene' || anchor.kind === 'file-header'
    ? ''
    : anchor.kind === 'arm' || anchor.kind === 'beat' ? '    ' : '  ';
  const comment = { text: commentText(record.source.raw, indent), attachedTo: anchor.kind };
  let target;
  if (anchor.kind === 'scene' || anchor.kind === 'file-header' || anchor.kind === 'scene-end') target = anchor.scene.scene;
  else if (anchor.kind === 'stmt') target = anchor.scene.scene.stmts[anchor.nodeIndex];
  else if (anchor.kind === 'arm') target = anchor.scene.scene.stmts[anchor.nodeIndex].arms[anchor.childIndex];
  else target = anchor.scene.scene.stmts[anchor.nodeIndex].beats[anchor.childIndex];
  Object.defineProperty(comment, '_anchor', {
    value: { kind: anchor.kind === 'file-header' ? 'scene' : anchor.kind, target, labelPosition: 0 },
    enumerable: false,
  });
  return comment;
}

function isFullRule(record) {
  return record.anchor.kind === 'scene'
    && /^\s*\/\/ ={20,}\s*$/.test(record.source.raw);
}

function bannerTitle(records) {
  const firstRule = records.findIndex(isFullRule);
  if (firstRule < 0) return null;
  const secondRule = records.findIndex((record, index) => index > firstRule && isFullRule(record));
  if (secondRule < 0) return null;
  const title = records.slice(firstRule + 1, secondRule)
    .map((record) => record.source.raw.trim().replace(/^\/\/\s?/, '').trim())
    .find(Boolean);
  return title ?? null;
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24).replace(/-$/g, '');
}

function lineCount(text) {
  return text.split('\n').length - 1;
}

function renderEntries(entries, records) {
  const entrySet = new Set(entries);
  const comments = records.filter((record) => entrySet.has(record.anchor.scene)).map(materializeComment);
  return printScenes(entries.map((entry) => entry.scene), comments);
}

function groupFiles(sceneEntries, commentRecords) {
  const recordsByScene = new Map(sceneEntries.map((entry) => [entry, []]));
  for (const record of commentRecords) recordsByScene.get(record.anchor.scene).push(record);
  const bannerStarts = sceneEntries.filter((entry) => recordsByScene.get(entry).some(isFullRule));
  const ruleCount = commentRecords.filter(isFullRule).length;
  if (ruleCount !== 70 || bannerStarts.length !== 35) {
    throw new Error(`Expected 70 scene-level full-width rule lines in 35 banner blocks, found ${ruleCount} in ${bannerStarts.length} blocks.`);
  }

  const sections = [];
  let current = [];
  for (const entry of sceneEntries) {
    if (current.length && bannerStarts.includes(entry)) {
      sections.push(current);
      current = [];
    }
    current.push(entry);
  }
  if (current.length) sections.push(current);

  const files = [];
  let packed = [];
  for (const section of sections) {
    const candidate = [...packed, ...section];
    if (packed.length && lineCount(renderEntries(candidate, commentRecords)) > MAX_FILE_LINES) {
      files.push(packed);
      packed = [...section];
    } else {
      packed = candidate;
    }
  }
  if (packed.length) files.push(packed);

  return files.map((entries, index) => {
    const records = entries.flatMap((entry) => recordsByScene.get(entry));
    const title = bannerTitle(records);
    if (!title) throw new Error(`File group ${index + 1} has no banner title.`);
    const slug = slugify(title);
    if (!slug) throw new Error(`Could not derive a filename slug from banner title ${JSON.stringify(title)}.`);
    const filename = `${String(index + 1).padStart(2, '0')}-${slug}.dlg`;
    const text = renderEntries(entries, commentRecords);
    return { filename, title, entries, text, lines: lineCount(text) };
  });
}

function countHashLines(files) {
  return files.reduce((total, file) => total + file.text.split('\n').filter((line) => line.trimStart().startsWith('#')).length, 0);
}

function corpusSize(dialogs) {
  return {
    scenes: Object.keys(dialogs).length,
    nodes: Object.values(dialogs).reduce((total, tree) => total + tree.length, 0),
  };
}

async function buildPlan() {
  const [source, baselineText, dialogStateSource] = await Promise.all([
    readFile(DIALOGS_FILE, 'utf8'),
    readFile(BASELINE_FILE, 'utf8'),
    readFile(DIALOG_STATE_FILE, 'utf8'),
  ]);
  const indexMarkerCount = (source.match(/^\s*\/\*\s*\d+\s*\*\//gm) ?? []).length;
  if (indexMarkerCount !== EXPECTED_INDEX_MARKERS) {
    throw new Error(`Expected ${EXPECTED_INDEX_MARKERS} inline index markers, found ${indexMarkerCount}.`);
  }

  const url = pathToFileURL(DIALOGS_FILE);
  url.searchParams.set('convert', `${Date.now()}`);
  const liveDialogs = (await import(url.href)).DIALOGS;
  const baseline = JSON.parse(baselineText);
  if (!deepEqual(liveDialogs, baseline)) {
    const findings = diffTrees(baseline, liveDialogs).slice(0, 10);
    throw new Error(`Live DIALOGS does not equal tools/dlg/baseline.json:\n${findings.join('\n')}`);
  }

  const sourceAst = parseAst(source);
  const dialogsObject = findDialogsObject(sourceAst);
  const dialogStateAst = parseAst(dialogStateSource);
  const quiz = findStringSet(dialogStateAst, 'KNOWLEDGE_GATE_DIALOGS');
  const evergreen = findStringSet(dialogStateAst, 'EVERGREEN_HUB_DIALOGS');
  const properties = dialogsObject.properties;
  const sceneIds = properties.map(propertyName);
  if (sceneIds.some((id) => id === null) || new Set(sceneIds).size !== sceneIds.length) {
    throw new Error('DIALOGS scene properties must be static and globally unique.');
  }
  if (!deepEqual(sceneIds, Object.keys(liveDialogs))) {
    throw new Error('AST scene property order differs from the imported DIALOGS key order.');
  }

  const counters = { afterSites: 0 };
  let targetCount = 0;
  const sceneEntries = properties.map((property, sceneIndex) => {
    const id = sceneIds[sceneIndex];
    if (property.value?.type !== 'ArrayExpression') throw new Error(`${id} is not an array literal.`);
    const tree = liveDialogs[id];
    if (property.value.elements.length !== tree.length) throw new Error(`${id}: AST/imported node length differs.`);
    const targets = jumpTargets(tree, id);
    targetCount += targets.size;
    const modes = [];
    if (quiz.has(id)) modes.push('quiz');
    if (evergreen.has(id)) modes.push('evergreen-hub');
    const scene = {
      id,
      modes,
      stmts: tree.map((node, index) => statementFromNode(node, index, targets, id, counters)),
    };
    return { id, tree, property, targets, scene };
  });
  for (const id of [...quiz, ...evergreen]) {
    if (!liveDialogs[id]) throw new Error(`DialogState declares mode for unknown scene ${id}.`);
  }
  if (counters.afterSites !== 9) throw new Error(`Expected 9 stage after sites, found ${counters.afterSites}.`);

  const commentRecords = classifyComments(source, dialogsObject, sceneEntries);
  const files = groupFiles(sceneEntries, commentRecords);
  const hashCount = countHashLines(files);
  if (hashCount !== EXPECTED_COMMENTS) {
    throw new Error(`Comment preservation failed: expected ${EXPECTED_COMMENTS} # lines, emitted ${hashCount}.`);
  }
  const expectedCommentText = commentRecords.map((record) => commentText(record.source.raw, '').trimStart());
  const emittedCommentText = files.flatMap((file) => file.text.split('\n')
    .filter((line) => line.trimStart().startsWith('#'))
    .map((line) => line.trimStart()));
  if (!deepEqual(expectedCommentText, emittedCommentText)) {
    throw new Error('Comment preservation failed: # comment content or source order changed.');
  }

  let lock = { version: 1, scenes: {} };
  const compiled = {};
  for (const entry of sceneEntries) {
    const allocated = allocate(entry.id, entry.scene.stmts, lock, { reseed: true });
    lock = allocated.lockAfter;
    for (let index = 0; index < entry.scene.stmts.length; index += 1) {
      if (allocated.indexOf.get(entry.scene.stmts[index]) !== index) {
        throw new Error(`${entry.id}: reseed did not preserve source index ${index}.`);
      }
    }
    const expectedLabels = Object.fromEntries([...entry.targets].sort((a, b) => a - b).map((target) => [`n${target}`, target]));
    if (!deepEqual(lock.scenes[entry.id], { labels: expectedLabels, length: entry.tree.length })) {
      throw new Error(`${entry.id}: seeded lock does not match the mechanical target map.`);
    }
    compiled[entry.id] = emitNodes(entry.scene, allocated.indexOf, allocated.length, allocated.pads);
  }
  if (!deepEqual(compiled, baseline)) {
    const findings = diffTrees(baseline, compiled).slice(0, 10);
    throw new Error(`In-memory converted corpus is not identical to baseline:\n${findings.join('\n')}`);
  }

  for (const file of files) {
    const parsed = parseDlg(file.text, `src/data/dialogs/${file.filename}`);
    if (parsed.diagnostics.length) {
      throw new Error(`${file.filename}: canonical conversion produced ${parsed.diagnostics.length} diagnostic(s):\n${parsed.diagnostics.map((item) => item.message).join('\n')}`);
    }
  }
  const size = corpusSize(compiled);
  return {
    files, lock, size, targetCount, afterSites: counters.afterSites,
    inputComments: commentRecords.length, outputComments: hashCount,
    bannerBlocks: 35, sections: 36,
  };
}

function printSummary(plan, mode) {
  process.stdout.write(`CONVERT ${mode.toUpperCase()}\n`);
  process.stdout.write(`source: src/data/dialogs/index.js (${plan.size.scenes} scenes, ${plan.size.nodes} nodes)\n`);
  process.stdout.write(`jump targets: ${plan.targetCount} mechanical n<T> labels\n`);
  process.stdout.write(`stage after sites: ${plan.afterSites}\n`);
  process.stdout.write(`comments: ${plan.inputComments} // lines in -> ${plan.outputComments} # lines out\n`);
  process.stdout.write(`grouping: start + ${plan.bannerBlocks} banner blocks = ${plan.sections} sections -> ${plan.files.length} files (target <= ${MAX_FILE_LINES} lines)\n`);
  process.stdout.write('File                              Scenes  Lines  First scene -> Last scene\n');
  process.stdout.write('------------------------------------------------------------------------\n');
  for (const file of plan.files) {
    const first = file.entries[0].id;
    const last = file.entries.at(-1).id;
    process.stdout.write(`${file.filename.padEnd(34)} ${String(file.entries.length).padStart(6)}  ${String(file.lines).padStart(5)}  ${first} -> ${last}\n`);
  }
  const oversized = plan.files.filter((file) => file.lines > MAX_FILE_LINES);
  process.stdout.write(`oversized single sections: ${oversized.length ? oversized.map((file) => `${file.filename} (${file.lines})`).join(', ') : 'none'}\n`);
  process.stdout.write(`PASS: in-memory conversion deep-equals tools/dlg/baseline.json (${plan.size.scenes}/${plan.size.scenes} scenes)\n`);
  process.stdout.write('PASS: scene ids are globally unique; modes match DialogState.js; comment and after-site assertions hold\n');
}

function parseArgs(argv) {
  if (argv.length !== 1 || !['--dry', '--write'].includes(argv[0])) {
    throw new Error('Usage: node tools/dlg/convert.mjs --dry | --write');
  }
  return argv[0].slice(2);
}

async function main() {
  const mode = parseArgs(process.argv.slice(2));
  const plan = await buildPlan();
  printSummary(plan, mode);
  if (mode === 'dry') {
    process.stdout.write('DRY: no files written\n');
    return;
  }
  const expectedNames = new Set(plan.files.map((file) => file.filename));
  const existingDlg = (await readdir(DIALOG_DIR)).filter((name) => name.endsWith('.dlg'));
  const stale = existingDlg.filter((name) => !expectedNames.has(name));
  if (stale.length) throw new Error(`Refusing to leave stale .dlg files: ${stale.join(', ')}.`);
  for (const file of plan.files) {
    await writeFile(path.join(DIALOG_DIR, file.filename), file.text, 'utf8');
    process.stdout.write(`WRITE src/data/dialogs/${file.filename}: ${file.lines} lines\n`);
  }
  await saveLock(LOCK_FILE, plan.lock);
  const lockLines = (await readFile(LOCK_FILE, 'utf8')).split('\n').length - 1;
  process.stdout.write(`WRITE src/data/dialogs/dialogs.lock.json: ${lockLines} lines (DIALOGS_LOCK_RESEED=i-know acknowledged)\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`FAIL: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
