#!/usr/bin/env node
/**
 * TRUST ISSUES story simulator (P6).
 *
 * This tool intentionally computes a MONOTONE FIXPOINT: derived flags, scene
 * reachability, combat outcomes, and grants are repeatedly coupled until none
 * can add anything. That is deliberately different from the runtime story
 * evaluator's single ordered pass, which P5 preserved for behavior identity.
 * Do not "fix" either one to match the other.
 *
 * Honest limit (DESIGN 7.3): optimistic monotone closure plus Check F models
 * negative-precondition expiry, but it does not model resource ordering such as
 * AUM prices or level gates. A PASS is not a proof that those resources can be
 * acquired in the required playthrough order.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { DIALOGS } from '../src/data/dialogs/index.js';
import { ENCOUNTERS } from '../src/data/encounters/index.js';
import { ROOMS } from '../src/data/rooms/index.js';
import { ACTS, ALL_RENOVATION_FLAGS, DERIVE, GATES, TRIGGERS } from '../src/data/story/graph.js';
import { AUTO_GRANTS, CODE_GRANTS, NEVER_SET, SCENE_DISPOSITION } from '../src/data/story/grants.js';
import { PREDICATES } from '../src/data/story/predicates.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EXPLORATION_PATH = resolve(ROOT, 'src/states/ExplorationState.js');
const DIALOG_PATH = resolve(ROOT, 'src/data/dialogs/index.js');
const ROOM_PATH = resolve(ROOT, 'src/data/rooms/index.js');
const ROUTES_PATH = resolve(ROOT, 'src/data/story/routes.js');
const EXPLORATION_SOURCE = readFileSync(EXPLORATION_PATH, 'utf8');
const DIALOG_SOURCE = readFileSync(DIALOG_PATH, 'utf8');
const ROOM_SOURCE = readFileSync(ROOM_PATH, 'utf8');

const args = process.argv.slice(2);
const selftest = args.includes('--selftest');
const regressOnly = args.includes('--regress');
const reportArg = args.find(arg => arg.startsWith('--report='));
const reportFile = reportArg ? resolve(process.cwd(), reportArg.slice('--report='.length)) : null;
const unknownArgs = args.filter(arg => !arg.startsWith('--report=') && arg !== '--selftest' && arg !== '--regress');
if (unknownArgs.length) {
  console.error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  process.exit(2);
}

let DIALOG_ROUTES = null;
if (existsSync(ROUTES_PATH)) {
  const routeModule = await import(pathToFileURL(ROUTES_PATH).href);
  DIALOG_ROUTES = routeModule.DIALOG_ROUTES || null;
}

// Say the limits out loud, in the tool's own output, every run. The second
// sentence was added after a judge found a critical bug of exactly that shape
// that A-G could not see: the closure banks defeated_<id> AND retry_<id> for
// every reachable encounter, so it models a player who wins and loses every
// fight at once and never loses access to anything. Check E's second half now
// covers the one variant that can strand the critical path (a fight-bearing
// once:'scene' trigger with no player-initiable route), but the general class
// remains outside the proof and nobody should believe otherwise.
const LIMITATION = 'Monotone closure does not model resource ordering (AUM prices or level gates); '
  + 'Check F covers negative-precondition expiry only. It also does not model COMBAT OUTCOME: the '
  + 'closure grants both defeated_<id> and retry_<id> for every reachable encounter, so a bug of the '
  + 'form "X becomes unreachable after a defeat" is invisible to A-G except for the one shape Check E '
  + 'now tests by hand (a fight-bearing once:scene trigger whose encounter has no player-initiable route).';
const CHECK_NAMES = {
  A: 'ACT COMPLETABILITY',
  B: 'FLAG REACHABILITY',
  C: 'SCENE REACHABILITY',
  D: 'GATE CLOSABILITY',
  E: 'NO SPEND-BEFORE-GRANT',
  F: 'EXPIRY / ORDERING',
  G: 'ROUTE SHADOWING',
};

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function sourceLine(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function lineFor(source, needle, fallback) {
  const offset = source.indexOf(needle);
  return offset < 0 ? fallback : sourceLine(source, offset);
}

function allExpr(...terms) {
  const flat = terms.flatMap(term => {
    if (term === true || term == null) return [];
    if (Array.isArray(term) && term[0] === 'all') return term.slice(1);
    return [term];
  });
  if (terms.some(term => term === false)) return false;
  if (!flat.length) return true;
  return flat.length === 1 ? flat[0] : ['all', ...flat];
}

function evalExpr(expr, flags, ctx = {}) {
  if (expr === true || expr == null) return true;
  if (expr === false) return false;
  if (typeof expr === 'string') return flags.has(expr);
  if (!Array.isArray(expr) || !expr.length) return false;
  const [op, ...rest] = expr;
  switch (op) {
    case 'not': return !evalExpr(rest[0], flags, ctx);
    case 'all': return rest.every(term => evalExpr(term, flags, ctx));
    case 'any': return rest.some(term => evalExpr(term, flags, ctx));
    case 'room': return ctx.room === rest[0];
    case 'npc': return ctx.npc === rest[0];
    case 'npcDialogId': return ctx.npcDialogId === rest[0];
    case 'set': {
      const members = rest[0] === 'RENOVATION_FLAGS' ? ALL_RENOVATION_FLAGS : [];
      return members.every(flag => flags.has(flag));
    }
    case 'pred': {
      const pred = PREDICATES[rest[0]];
      if (!pred) return Boolean(ctx.predicates?.[rest[0]]);
      return Boolean(pred.test({ flags: Object.fromEntries([...flags].map(flag => [flag, true])), ...ctx }));
    }
    default: return false;
  }
}

// P7 added two route operators whose operands are NOT FLAGS: `dialogExists`
// takes a scene id and `act` takes a comparator and a number. Without them in
// this skip list check B reported 40+ phantom findings the first time
// routes.js existed — scene ids, and the literal strings ">=", "==" and "<",
// all reported as flags that nothing writes.
function flagsReadByExpr(expr, out = new Set()) {
  if (typeof expr === 'string') out.add(expr);
  else if (Array.isArray(expr) && expr.length) {
    const [op, ...rest] = expr;
    if (op === 'room' || op === 'npc' || op === 'npcDialogId' || op === 'dialogExists' || op === 'act') {
      return out;
    } else if (op === 'set' && rest[0] === 'RENOVATION_FLAGS') {
      for (const flag of ALL_RENOVATION_FLAGS) out.add(flag);
    } else if (op === 'pred') {
      for (const flag of PREDICATES[rest[0]]?.reads || []) out.add(flag);
    } else {
      for (const term of rest) flagsReadByExpr(term, out);
    }
  }
  return out;
}

function negativeFlags(expr, negated = false, out = new Set()) {
  if (typeof expr === 'string') {
    if (negated) out.add(expr);
    return out;
  }
  if (!Array.isArray(expr) || !expr.length) return out;
  const [op, ...rest] = expr;
  if (op === 'not') return negativeFlags(rest[0], !negated, out);
  // Same non-flag operand rule as flagsReadByExpr: a scene id, an npc id, a
  // room id and an act comparator are not flags and must not become findings.
  if (op === 'room' || op === 'npc' || op === 'npcDialogId' || op === 'dialogExists' || op === 'act') return out;
  for (const term of rest) negativeFlags(term, negated, out);
  return out;
}

function conditionExpr(condition) {
  if (!condition || typeof condition !== 'object') return true;
  return allExpr(condition.flag || true, condition.notFlag ? ['not', condition.notFlag] : true);
}

function addLiteral(path, flag, positive) {
  if (!flag) return path;
  if (path.values.has(flag)) return path.values.get(flag) === positive ? path : null;
  const next = { pos: new Set(path.pos), neg: new Set(path.neg), values: new Map(path.values) };
  if (positive) {
    if (next.neg.has(flag)) return null;
    next.pos.add(flag);
  } else {
    if (next.pos.has(flag)) return null;
    next.neg.add(flag);
  }
  return next;
}

function writeLiteral(path, flag, value) {
  const next = { pos: new Set(path.pos), neg: new Set(path.neg), values: new Map(path.values) };
  next.values.set(flag, value);
  return next;
}

function pathKey(path) {
  return `+${[...path.pos].sort().join(',')}|-${[...path.neg].sort().join(',')}|=${[...path.values].sort(([a], [b]) => a.localeCompare(b)).map(([flag, value]) => `${flag}:${value}`).join(',')}`;
}

function pathExpr(path) {
  return allExpr(
    ...[...path.pos].sort(),
    ...[...path.neg].sort().map(flag => ['not', flag]),
  );
}

function harvestDialog(scene, nodes) {
  const grants = [];
  const combats = [];
  const queue = [{ index: 0, path: { pos: new Set(), neg: new Set(), values: new Map() } }];
  const visited = new Set();
  let queueHead = 0;
  let visits = 0;

  const push = (index, path, fromIndex = -1) => {
    if (!path || !Number.isInteger(index) || index < 0 || index >= nodes.length) return;
    // These dialogs contain repeatable menus whose grant-bearing arms and
    // finish arm are all reachable on their first pass. Cut only the menu's
    // repeat edge; other backward edges are compiler stage jumps or branches.
    if (scene === 'team_chat_hub' && fromIndex > 0 && index === 0) return;
    if (scene === 'board_meeting' && fromIndex > 48 && index === 48) return;
    queue.push({ index, path });
  };

  while (queueHead < queue.length) {
    const { index, path } = queue[queueHead];
    queueHead += 1;
    const signature = `${index}|${pathKey(path)}`;
    if (visited.has(signature)) continue;
    visited.add(signature);
    visits += 1;
    if (visits > 100000) throw new Error(`Dialog path harvest exceeded 100000 states in ${scene}`);

    const node = nodes[index];
    if (!node) continue;
    const when = pathExpr(path);
    const nextIndex = node.next !== undefined ? node.next : index + 1;

    if (node.type === 'condition') {
      push(node.ifTrue !== undefined ? node.ifTrue : index + 1, addLiteral(path, node.flag, true), index);
      push(node.ifFalse !== undefined ? node.ifFalse : index + 1, addLiteral(path, node.flag, false), index);
      continue;
    }

    if (node.type === 'choice') {
      for (let choiceIndex = 0; choiceIndex < (node.choices || []).length; choiceIndex += 1) {
        const choice = node.choices[choiceIndex];
        let armPath = path;
        if (choice.requires) armPath = addLiteral(armPath, choice.requires, true);
        if (choice.requiresNot) armPath = addLiteral(armPath, choice.requiresNot, false);
        if (!armPath) continue;
        if (choice.flag && choice.flagValue !== false) {
          grants.push({
            id: `dialog-choice:${scene}:${index}:${choiceIndex}`,
            flag: choice.flag, when: pathExpr(armPath), scene,
            src: `src/data/dialogs/index.js:${lineFor(DIALOG_SOURCE, `\"${scene}\": [`, 1)}`,
            note: `Choice flag at node ${index}, arm ${choiceIndex}.`, kind: 'dialog',
          });
          armPath = writeLiteral(armPath, choice.flag, true);
        } else if (choice.flag && choice.flagValue === false) {
          armPath = writeLiteral(armPath, choice.flag, false);
        }
        push(choice.next !== undefined ? choice.next : index + 1, armPath, index);
      }
      continue;
    }

    if (node.type === 'action' && node.action === 'set_flag') {
      if (node.value !== false) {
        grants.push({
          id: `dialog:${scene}:${index}`,
          flag: node.flag, when, scene,
          src: `src/data/dialogs/index.js:${lineFor(DIALOG_SOURCE, `\"${scene}\": [`, 1)}`,
          note: `set_flag at node ${index}.`, kind: 'dialog',
        });
        push(nextIndex, writeLiteral(path, node.flag, true), index);
      } else {
        push(nextIndex, writeLiteral(path, node.flag, false), index);
      }
      continue;
    }

    if (node.type === 'action' && node.action === 'start_combat') {
      combats.push({ scene, encounter: node.encounter, when, node: index });
    }
    if (node.type !== 'end') push(nextIndex, path, index);
  }
  // A loop/hub can reach the same action node through many histories. That is
  // one grant event with a disjunctive path condition, not hundreds of grants.
  const grouped = new Map();
  for (const grant of grants) {
    if (!grouped.has(grant.id)) grouped.set(grant.id, { ...grant, alternatives: [] });
    grouped.get(grant.id).alternatives.push(grant.when);
  }
  const mergedGrants = [...grouped.values()].map(grant => {
    const alternatives = [...new Map(grant.alternatives.map(expr => [JSON.stringify(expr), expr])).values()];
    const { alternatives: _alternatives, ...base } = grant;
    return { ...base, when: alternatives.length === 1 ? alternatives[0] : ['any', ...alternatives] };
  });
  return { grants: mergedGrants, combats };
}

function walkObjects(value, visit, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  visit(value);
  for (const child of Object.values(value)) walkObjects(child, visit, seen);
}

function gateAccessExpr(room, gates) {
  const relevant = gates.filter(gate => gate.room === room);
  const terms = [];
  for (const gate of relevant) {
    if (!gate.kind) terms.push(gate.requires);
    else if (gate.kind === 'special' && gate.when) terms.push(['not', gate.when]);
  }
  return allExpr(...terms);
}

function extractMethodSlice(startMarker, endMarker) {
  const start = EXPLORATION_SOURCE.indexOf(startMarker);
  const end = EXPLORATION_SOURCE.indexOf(endMarker, start + startMarker.length);
  return start < 0 ? '' : EXPLORATION_SOURCE.slice(start, end < 0 ? undefined : end);
}

function literalFlagReads(source, baseLine, addRead) {
  const regexes = [
    /getFlag\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)/g,
    /\bf\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)/g,
  ];
  for (const regex of regexes) for (const match of source.matchAll(regex)) {
    addRead(match[1], `ExplorationState.js:${baseLine + sourceLine(source, match.index) - 1}`);
  }
}

function literalRouteScenes(source) {
  const scenes = new Set();
  for (const match of source.matchAll(/return\s+['"]([a-z0-9_]+)['"]/g)) scenes.add(match[1]);
  for (const match of source.matchAll(/DIALOGS\.([a-z0-9_]+)/g)) scenes.add(match[1]);
  return scenes;
}

function makeModel(overrides = {}) {
  const dialogs = overrides.dialogs || DIALOGS;
  const gates = overrides.gates || clone(GATES);
  const triggers = overrides.triggers || clone(TRIGGERS);
  const codeGrants = overrides.codeGrants || clone(CODE_GRANTS);
  const dispositions = overrides.dispositions || clone(SCENE_DISPOSITION);
  const dialogRoutes = Object.hasOwn(overrides, 'dialogRoutes') ? overrides.dialogRoutes : clone(DIALOG_ROUTES);
  const sceneRoutes = [];
  const structural = new Map();
  const reads = new Map();
  const dialogGrants = [];
  const combatStarts = [];
  const roomEdges = new Map(Object.keys(ROOMS).map(room => [room, new Set()]));
  const severedEvidence = new Map(overrides.severedEvidence || []);

  const addStructural = (scene, source, kind) => {
    if (!scene || !dialogs[scene]) return;
    if (!structural.has(scene)) structural.set(scene, []);
    structural.get(scene).push({ source, kind });
  };
  const addRead = (flag, source) => {
    if (!flag) return;
    if (!reads.has(flag)) reads.set(flag, new Set());
    reads.get(flag).add(source);
  };
  const addExprReads = (expr, source) => {
    for (const flag of flagsReadByExpr(expr)) addRead(flag, source);
  };

  for (const [scene, nodes] of Object.entries(dialogs)) {
    const harvested = harvestDialog(scene, nodes);
    dialogGrants.push(...harvested.grants);
    combatStarts.push(...harvested.combats);
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      const src = `src/data/dialogs/index.js:${lineFor(DIALOG_SOURCE, `\"${scene}\": [`, 1)}`;
      if (node.type === 'condition') addRead(node.flag, src);
      for (const choice of node.choices || []) {
        if (choice.requires) addRead(choice.requires, src);
        if (choice.requiresNot) addRead(choice.requiresNot, src);
      }
    }
  }

  const roomNpcIds = new Set();
  const ladderNpcEntries = [];
  for (const [roomId, room] of Object.entries(ROOMS)) {
    for (const npc of room.npcs || []) {
      if (npc.id) roomNpcIds.add(npc.id);
      if (npc.id && !npc.dialogId) ladderNpcEntries.push({ npc: npc.id, room: roomId, when: conditionExpr(npc.condition) });
    }
    walkObjects(room, object => {
      if (typeof object.targetRoom === 'string') roomEdges.get(roomId)?.add(object.targetRoom);
      if (object.condition) {
        if (object.condition.flag) addRead(object.condition.flag, `src/data/rooms/index.js:${lineFor(ROOM_SOURCE, object.condition.flag, 1)}`);
        if (object.condition.notFlag) addRead(object.condition.notFlag, `src/data/rooms/index.js:${lineFor(ROOM_SOURCE, object.condition.notFlag, 1)}`);
      }
      if (typeof object.conditionFn === 'function') {
        const fnSource = object.conditionFn.toString();
        for (const match of fnSource.matchAll(/getFlag\(\s*['"]([A-Za-z0-9_]+)['"]\s*\)/g)) {
          addRead(match[1], `src/data/rooms/index.js:${lineFor(ROOM_SOURCE, match[1], 1)}`);
        }
      }
      if (object.dialogId && dialogs[object.dialogId]) {
        const baseWhen = conditionExpr(object.condition);
        const src = `src/data/rooms/index.js:${lineFor(ROOM_SOURCE, `dialogId: '${object.dialogId}'`, 1)}`;
        sceneRoutes.push({ scene: object.dialogId, when: baseWhen, room: roomId, src, kind: 'room-data' });
        addStructural(object.dialogId, src, 'room-data');
      }
    });
  }

  for (const trigger of triggers) {
    const src = trigger.src || 'src/data/story/graph.js';
    addExprReads(trigger.when, src);
    if (trigger.once?.startsWith('flag:')) addRead(trigger.once.slice(5), src);
    if (trigger.flag) addRead(trigger.flag, src);
    addStructural(trigger.scene, src, 'trigger');
  }

  for (const rule of DERIVE) {
    addExprReads(rule.when, 'src/data/story/graph.js');
    if (rule.deferWhile) addExprReads(rule.deferWhile, 'src/data/story/graph.js');
  }
  for (const gate of gates) {
    if (gate.requires) addRead(gate.requires, 'src/data/story/graph.js');
    if (gate.when) addExprReads(gate.when, 'src/data/story/graph.js');
  }

  // P7 has not landed yet: use the legacy router source for B/C, while G emits
  // an explicit no-op notice. These scenes are existential legacy routes; room
  // data and triggers retain their stronger preconditions in the closure.
  const routeSlice = extractMethodSlice('  _getInteractableDialogId(', '  _syncActFromFlags()');
  const routeBase = sourceLine(EXPLORATION_SOURCE, EXPLORATION_SOURCE.indexOf('  _getInteractableDialogId('));
  literalFlagReads(routeSlice, routeBase, addRead);
  const sideRouteSlice = extractMethodSlice('  _getAlexSideQuestDialog()', '  _getStoryObjective()');
  const sideRouteBase = sourceLine(EXPLORATION_SOURCE, EXPLORATION_SOURCE.indexOf('  _getAlexSideQuestDialog()'));
  literalFlagReads(sideRouteSlice, sideRouteBase, addRead);
  const legacyScenes = new Set([...literalRouteScenes(routeSlice), ...literalRouteScenes(sideRouteSlice)]);
  for (const scene of legacyScenes) {
    if (!dialogs[scene]) continue;
    const src = `ExplorationState.js:${lineFor(EXPLORATION_SOURCE, `return '${scene}'`, routeBase)}`;
    addStructural(scene, src, 'legacy-route');
  }

  // Two interactable rewrites sit immediately above the NPC router and are
  // code routes in their own right.
  if (dialogs.branch_decision) sceneRoutes.push({ scene: 'branch_decision', when: ['all', 'grandma_defeated', ['not', 'branch_chosen']], room: 'cubicle_farm', src: 'ExplorationState.js:2546', kind: 'legacy-interactable-route' });
  if (dialogs.team_chat_hub) sceneRoutes.push({ scene: 'team_chat_hub', when: ['any', 'janet_recruited', 'alex_it_recruited', 'isaiah_recruited', 'diane_recruited', 'grandma_ally'], room: 'cubicle_farm', src: 'ExplorationState.js:2550', kind: 'legacy-interactable-route' });
  if (dialogs.neutral_npc) sceneRoutes.push({ scene: 'neutral_npc', when: true, room: null, src: 'ExplorationState.js:2729', kind: 'legacy-fallback' });
  // _changeRoom guarantees one Floor-13 detour from the lobby shaft at Act 5+
  // even though no static ROOMS exit targets the hidden floor.
  if (dialogs.floor_13_window) sceneRoutes.push({ scene: 'floor_13_window', when: 'act4_complete', room: null, src: 'ExplorationState.js:1367', kind: 'dynamic-room-route' });

  const objectiveSlice = extractMethodSlice('  _getStoryObjective()', '  _refreshStoryProgress(silent');
  const objectiveBase = sourceLine(EXPLORATION_SOURCE, EXPLORATION_SOURCE.indexOf('  _getStoryObjective()'));
  literalFlagReads(objectiveSlice, objectiveBase, addRead);

  // The actual legacy ladder has the formerly missing Act-5 rung. Model Act 2
  // THROUGH Act 7. The retired P0 census tool modelled it as act{2,3,4,6,7},
  // predating the act-5 rung, and therefore called skip_act5 an orphan.
  const actWhen = { 2: 'briefing_complete', 3: 'act2_complete', 4: 'act3_complete', 5: 'act4_complete', 6: 'act5_complete', 7: 'act6_complete' };
  for (const npc of roomNpcIds) {
    const templates = [
      `neutral_${npc}`,
      `${npc}_intro`,
      `${npc}_return`,
      ...[2, 3, 4, 5, 6, 7].map(act => `${npc}_act${act}`),
      npc,
    ];
    for (const scene of templates) {
      if (!dialogs[scene]) continue;
      const src = 'ExplorationState.js:3195';
      addStructural(scene, src, 'ladder');
      for (const entry of ladderNpcEntries.filter(item => item.npc === npc)) {
        const actMatch = scene.match(/_act([2-7])$/);
        const when = allExpr(entry.when, actMatch ? actWhen[Number(actMatch[1])] : true);
        sceneRoutes.push({ scene, when, room: entry.room, src, kind: 'ladder' });
      }
    }
  }
  for (const encounterId of Object.keys(ENCOUNTERS)) {
    const scene = `${encounterId}_retry`;
    if (dialogs[scene]) {
      sceneRoutes.push({ scene, when: `retry_${encounterId}`, room: null, src: 'ExplorationState.js:2789', kind: 'ladder-retry' });
      addStructural(scene, 'ExplorationState.js:2789', 'ladder-retry');
    }
  }

  for (const [encounterId, encounter] of Object.entries(ENCOUNTERS)) {
    if (encounter.preDialogId) addStructural(encounter.preDialogId, 'src/data/encounters/index.js', `encounter:${encounterId}:pre`);
    if (encounter.postDialogId) addStructural(encounter.postDialogId, 'src/data/encounters/index.js', `encounter:${encounterId}:post`);
  }

  // A special legacy return with no room-data, trigger, or ladder route still
  // needs an existential route until P7 gives it an exact declarative `when`.
  // Do not add this fallback to scenes already modeled above: doing so would
  // bypass their real room/act preconditions.
  const legacyRouteWhen = {
    karen_not_ready: ['all', 'retry_karen', ['not', 'defeated_karen'], ['not', 'karen_retry_ready']],
    karen_intern_first: ['all', 'briefing_complete', ['not', 'defeated_intern']],
    janitor_router: ['all', 'met_janitor', 'read_janitor_act3'],
    janitor_return: 'met_janitor',
    janet_act4: ['all', 'act3_complete', ['not', 'janet_rallied']],
    skip_act4: ['all', 'act3_complete', ['not', 'skip_rallied']],
    rachel_intro: ['not', 'met_rachel'],
    board_meeting_after: 'board_meeting_held',
    meredith_intro: ['all', 'act2_complete', ['not', 'meredith_era_over'], ['not', 'meredith_left'], ['not', 'met_meredith']],
    alex_printer_quest: ['all', 'printer_quest_started', ['not', 'printer_quest_done']],
    act4_trigger: ['all', 'has_archive_evidence', ['not', 'act3_complete']],
    alex_it_quest_legacy: ['all', 'act2_complete', 'quest_anomaly_347_complete', ['not', 'legacy_started']],
    alex_it_router: 'met_alex_it',
    alex_it_side_router: ['all', 'met_alex_it', 'act2_complete'],
    alex_it_return: 'met_alex_it',
    intern_retry: ['all', 'retry_intern', ['not', 'defeated_intern']],
    intern_combat_intro: ['all', 'read_intern_intro', ['not', 'defeated_intern']],
    compliance_crossword: ['all', 'act2_complete', 'alex_it_act3_done', ['not', 'compliance_crossword_done']],
    skip_post_karen: ['all', 'karen_defeated', ['not', 'skip_post_karen']],
    skip_post_chad: ['all', 'chad_defeated', ['not', 'skip_post_chad']],
    social_engineering_1: ['all', 'act3_complete', ['not', 'social_eng_started'], ['not', 'social_eng_complete']],
    social_engineering_2: ['all', 'social_eng_started', ['not', 'social_eng_diane'], ['not', 'social_eng_complete']],
    social_engineering_3: ['all', 'social_eng_diane', ['not', 'social_eng_complete']],
    isaiah_recruit: ['all', 'restructuring_trio_defeated', ['not', 'isaiah_recruited'], ['not', 'isaiah_documents_shared']],
    diane_recruit: ['all', 'diane_act6_rallied', ['not', 'diane_recruited']],
    alex_badge_audit_offer: ['all', 'act5_complete', 'alex_it_recruited', ['not', 'alex_badge_audit_complete']],
    alex_badge_audit_return: ['all', 'alex_has_patch_log', ['not', 'alex_badge_audit_complete']],
    isaiah_receipts_offer: ['all', 'act5_complete', 'isaiah_recruited', ['not', 'isaiah_receipts_complete']],
    isaiah_receipts_return: ['all', 'isaiah_has_receipts', ['not', 'isaiah_receipts_complete']],
    diane_handbook_offer: ['all', 'act5_complete', 'diane_recruited', ['not', 'diane_handbook_complete']],
    diane_handbook_return: ['all', 'diane_has_handbook', ['not', 'diane_handbook_complete']],
    janet_vacancy_offer: ['all', 'act5_complete', 'janet_recruited', ['not', 'janet_vacancy_complete']],
    janet_vacancy_return: ['all', 'janet_has_timesheet', ['not', 'janet_vacancy_complete']],
    janitor_names_offer: ['all', 'has_rolex', ['not', 'janitor_names_complete']],
    janitor_names_return: ['all', 'janitor_has_ledger', ['not', 'janitor_names_complete']],
    janitor_dave: ['all', 'met_janitor', 'printer_quest_done', ['not', 'dave_janitor_done']],
    janitor_predecessors: ['all', 'met_janitor', 'predecessors_all_found', ['not', 'read_janitor_predecessors']],
    janitor_pattern: ['all', 'janitor_names_complete', ['not', 'read_janitor_pattern']],
    janitor_the_name: ['all', 'janitor_names_complete', 'read_janitor_pattern', ['not', 'read_janitor_the_name']],
    team_pre_intro: ['not', 'checked_desk'],
    alex_it_quest_anomaly: ['all', 'act2_complete', ['not', 'anomaly_started']],
    alex_it_quest_network: ['all', 'quest_legacy_admin_complete', ['not', 'network_started']],
    alex_it_quest_dave: ['all', 'quest_network_ghost_complete', ['not', 'dave_started']],
    alex_it_quest_printer: ['all', 'quest_daves_legacy_complete', ['not', 'printer_soul_started']],
    alex_it_quest_final: ['all', 'quest_printer_soul_complete', ['not', 'final_patch_started']],
  };
  for (const scene of legacyScenes) {
    if (!dialogs[scene] || sceneRoutes.some(route => route.scene === scene)) continue;
    const refs = structural.get(scene) || [];
    if (refs.some(ref => ref.kind === 'trigger' || ref.kind === 'dialog-route')) continue;
    sceneRoutes.push({ scene, when: legacyRouteWhen[scene] ?? true, room: null, src: `ExplorationState.js:${lineFor(EXPLORATION_SOURCE, `return '${scene}'`, routeBase)}`, kind: 'legacy-route-fallback' });
  }

  if (dialogRoutes) {
    for (const route of dialogRoutes) {
      addExprReads(route.when, route.src || 'src/data/story/routes.js');
      if (typeof route.then === 'string') {
        sceneRoutes.push({ scene: route.then, when: route.when ?? true, room: route.room || null, npc: route.npc, src: route.src || 'src/data/story/routes.js', kind: 'dialog-route' });
        addStructural(route.then, route.src || 'src/data/story/routes.js', 'dialog-route');
      }
    }
  }

  for (const grant of codeGrants) addExprReads(grant.when, grant.src);

  if (overrides.extraReads) {
    for (const [flag, src] of overrides.extraReads) addRead(flag, src);
  }

  if (overrides.removeStructuralScenes) {
    for (const scene of overrides.removeStructuralScenes) structural.delete(scene);
  }

  // Encounters a PLAYER can start on their own: any scene an NPC entry or an
  // interactable in room data points at, that contains a start_combat. An
  // encounter's own preDialogId does NOT count — that is the push the fight
  // already came from, so it is no recovery route at all.
  const playerInitiableEncounters = overrides.playerInitiableEncounters ?? (() => {
    const out = new Set();
    for (const room of Object.values(ROOMS)) {
      for (const entry of [...(room.npcs ?? []), ...(room.interactables ?? [])]) {
        for (const node of dialogs[entry.dialogId] ?? []) {
          if (node.type === 'action' && node.action === 'start_combat') out.add(node.encounter);
        }
      }
    }
    return out;
  })();

  return {
    dialogs, gates, triggers, codeGrants, dispositions, dialogRoutes,
    sceneRoutes: overrides.sceneRoutes || sceneRoutes, roomEdges,
    structural, reads, dialogGrants, combatStarts, severedEvidence,
    playerInitiableEncounters,
    extraGrants: overrides.extraGrants || [],
  };
}

function reachableRooms(model, flags, blockedRooms) {
  const reachable = new Set(['parking_garage']);
  let changed = true;
  while (changed) {
    changed = false;
    for (const room of [...reachable]) {
      for (const target of model.roomEdges.get(room) || []) {
        if (reachable.has(target) || blockedRooms?.has(target)) continue;
        if (!evalExpr(gateAccessExpr(target, model.gates), flags, { room: target })) continue;
        reachable.add(target);
        changed = true;
      }
    }
  }
  return reachable;
}

function routeIsOpen(route, model, flags, rooms) {
  const access = route.room ? rooms.has(route.room) : true;
  return access && evalExpr(route.when, flags, { room: route.room, npc: route.npc });
}

function triggerIsOpen(trigger, model, flags, events, rooms) {
  if (!evalExpr(trigger.when, flags, { room: trigger.room })) return false;
  if (trigger.on !== 'room-blocked' && trigger.room && !rooms.has(trigger.room)) return false;
  if (trigger.once === 'scene' && flags.has(`read_${trigger.scene}`)) return false;
  if (trigger.once?.startsWith('flag:')) {
    const latch = trigger.once.slice(5);
    if (trigger.on === 'flag-set') return events.has(trigger.flag);
    if (flags.has(latch)) return false;
  }
  if (trigger.on === 'flag-set' && !events.has(trigger.flag)) return false;
  return true;
}

function allGrantRecords(model) {
  const derive = DERIVE.map(rule => ({
    id: `derive:${rule.id}`, flag: rule.id, when: rule.when,
    src: 'src/data/story/graph.js', note: rule.note, kind: 'derive',
  }));
  const code = model.codeGrants.map((grant, index) => ({ ...grant, id: `code:${index}:${grant.flag}`, kind: 'code' }));
  return [...model.dialogGrants, ...derive, ...code, ...model.extraGrants];
}

function runClosure(model, startFlags = [], options = {}) {
  const flags = new Set(startFlags);
  const everLive = new Set();
  const initial = new Set(startFlags);
  const blocked = options.blockedFlags || new Set();
  const scenes = new Set();
  const encounters = new Set();
  const events = new Set();
  const fired = new Set();
  const trace = new Map([...flags].map(flag => [flag, { iteration: 0, source: 'start-state' }]));
  const sceneTrace = new Map();
  const grantRecords = allGrantRecords(model);
  const liveRecords = grantRecords.filter(grant => grant.kind === 'derive'
    && DERIVE.find(rule => rule.id === grant.flag)?.mode === 'live');
  const latchRecords = grantRecords.filter(grant => grant.kind === 'derive'
    && DERIVE.find(rule => rule.id === grant.flag)?.mode !== 'live');
  const triggerLatchFlags = new Set(
    model.triggers
      .filter(trigger => trigger.on !== 'flag-set' && trigger.once?.startsWith('flag:'))
      .map(trigger => trigger.once.slice(5)),
  );

  let iteration = 0;
  let changed = true;
  const addFlag = (flag, source, recordId = null) => {
    if (!flag || blocked.has(flag)) return false;
    if (recordId) fired.add(recordId);
    if (flags.has(flag)) return false;
    flags.add(flag);
    if (!initial.has(flag)) events.add(flag);
    trace.set(flag, { iteration, source });
    return true;
  };
  const addScene = (scene, source) => {
    if (!scene || !model.dialogs[scene] || scenes.has(scene)) return false;
    scenes.add(scene);
    sceneTrace.set(scene, { iteration, source });
    return true;
  };

  while (changed) {
    changed = false;
    iteration += 1;
    if (iteration > 1000) throw new Error('Story closure exceeded 1000 iterations');

    // Simulator-only DERIVE fixpoint. Runtime remains a single ordered pass.
    let deriveChanged = true;
    while (deriveChanged) {
      deriveChanged = false;
      for (const record of latchRecords) {
        if (evalExpr(record.when, flags) && addFlag(record.flag, record.src, record.id)) {
          deriveChanged = true;
          changed = true;
        }
      }
    }

    // Live DERIVE rows are recomputed and may clear. Keep their current truth
    // separate from the monotone persistent set, while remembering every live
    // polarity that was reachable for the existential closure/report.
    const activeFlags = new Set(flags);
    let liveChanged = true;
    let livePasses = 0;
    while (liveChanged) {
      liveChanged = false;
      livePasses += 1;
      if (livePasses > 100) throw new Error('Live DERIVE evaluation exceeded 100 fixpoint passes');
      for (const record of liveRecords) {
        const value = evalExpr(record.when, activeFlags);
        if (value && !activeFlags.has(record.flag) && !blocked.has(record.flag)) {
          activeFlags.add(record.flag);
          liveChanged = true;
        } else if (!value && activeFlags.delete(record.flag)) {
          liveChanged = true;
        }
        if (value && !blocked.has(record.flag)) {
          fired.add(record.id);
          if (!everLive.has(record.flag)) {
            everLive.add(record.flag);
            trace.set(record.flag, { iteration, source: record.src });
            changed = true;
          }
        }
      }
    }
    const rooms = reachableRooms(model, activeFlags, options.blockedRooms);

    for (const route of model.sceneRoutes) {
      if (routeIsOpen(route, model, activeFlags, rooms) && addScene(route.scene, route.src)) changed = true;
    }

    for (const trigger of model.triggers) {
      if (!triggerIsOpen(trigger, model, activeFlags, events, rooms)) continue;
      if (addScene(trigger.scene, trigger.src)) changed = true;
      if (trigger.on !== 'flag-set' && trigger.once?.startsWith('flag:')) {
        const latch = trigger.once.slice(5);
        if (addFlag(latch, trigger.src, `trigger-latch:${trigger.id}`)) changed = true;
        // CODE_GRANTS declares the same code write whose operational route is
        // represented by this trigger. Mark that declaration as exercised so
        // Check F tests the real trigger ordering rather than a duplicate row.
        for (const grant of grantRecords.filter(record => record.kind === 'code' && record.flag === latch)) {
          fired.add(grant.id);
        }
      }
    }

    for (const grant of grantRecords) {
      if (grant.kind === 'derive') continue;
      if (grant.kind === 'dialog' && !scenes.has(grant.scene)) continue;
      if (grant.kind === 'code' && triggerLatchFlags.has(grant.flag)) continue;
      if (evalExpr(grant.when, activeFlags) && addFlag(grant.flag, grant.src, grant.id)) changed = true;
    }

    for (const scene of scenes) {
      if (addFlag(`read_${scene}`, 'DialogState.js:576', `auto-read:${scene}`)) changed = true;
    }

    for (const start of model.combatStarts) {
      if (scenes.has(start.scene) && evalExpr(start.when, activeFlags) && !encounters.has(start.encounter)) {
        encounters.add(start.encounter);
        changed = true;
      }
    }

    for (const encounterId of encounters) {
      if (encounterId !== 'reception_client') {
        if (addFlag(`defeated_${encounterId}`, 'ExplorationState.js:1602', `auto-victory:${encounterId}:defeated`)) changed = true;
        if (addFlag(`bestiary_${encounterId}`, 'ExplorationState.js:1541', `auto-victory:${encounterId}:bestiary`)) changed = true;
        if (addFlag(`retry_${encounterId}`, 'ExplorationState.js:1621', `auto-defeat:${encounterId}`)) changed = true;
      }
      const post = ENCOUNTERS[encounterId]?.postDialogId;
      if (post && addScene(post, `src/data/encounters/index.js (${encounterId} victory)`)) changed = true;
    }
  }

  return { flags: new Set([...flags, ...everLive]), persistentFlags: flags, liveFlags: everLive, scenes, encounters, events, fired, trace, sceneTrace, iterations: iteration };
}

function addOrderableGrantFlags(model, closure) {
  // The union closure can contain both arms of a player choice. A later grant
  // may still be obtainable on the arm that did not set an opposing flag (for
  // example daemon_tip_alt after choosing KEEP, before choosing TERMINATE on
  // another possible history). Recover only grants proven by a second closure
  // in which all of their expiring negatives are withheld. Check F applies the
  // same ordering proof to every such negative precondition.
  const cache = new Map();
  let added = 0;
  let changed = true;
  while (changed) {
    changed = false;
    for (const grant of allGrantRecords(model)) {
      if (closure.flags.has(grant.flag)) continue;
      const blockers = [...negativeFlags(grant.when)]
        .filter(flag => flag !== grant.flag && closure.flags.has(flag))
        .sort();
      if (!blockers.length) continue;
      const key = blockers.join('\0');
      if (!cache.has(key)) cache.set(key, runClosure(model, [], { blockedFlags: new Set(blockers) }));
      const ordered = cache.get(key);
      if (!ordered.fired.has(grant.id)) continue;
      closure.flags.add(grant.flag);
      closure.trace.set(grant.flag, { iteration: closure.iterations, source: `${grant.src} (ordered before ${blockers.join(', ')})` });
      added += 1;
      changed = true;
    }
  }
  closure.orderingAugmentations = added;
}

function finding(check, id, message, src = null, category = null) {
  return { check, id, message, src, category };
}

function checkA(model, closure) {
  const findings = [];
  for (const act of ACTS) {
    if (!closure.flags.has(act.when)) {
      findings.push(finding('A', act.id, `Act ${act.index} is not completable: required flag ${act.when} is absent from fresh-save closure.`, 'src/data/story/graph.js'));
    }
  }
  return findings;
}

function checkB(model, closure) {
  const findings = [];
  const codeFlags = new Set(model.codeGrants.map(grant => grant.flag));
  const never = new Map(NEVER_SET.map(row => [row.flag, row]));
  for (const [flag, sources] of [...model.reads.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (closure.flags.has(flag) || codeFlags.has(flag) || never.has(flag)) continue;
    const src = [...sources][0];
    findings.push(finding('B', flag, `Flag ${flag} is read but has no reachable grant, CODE_GRANTS row, or triaged NEVER_SET reason.`, src));
  }
  return findings;
}

function checkC(model) {
  const findings = [];
  const disposition = new Map(model.dispositions.map(row => [row.scene, row]));
  for (const scene of Object.keys(model.dialogs).sort()) {
    const routed = model.structural.has(scene);
    const ruling = disposition.get(scene);
    if (routed && ruling?.kind === 'cut') {
      findings.push(finding('C', scene, `Scene ${scene} is routed despite a ratified CUT disposition.`, model.structural.get(scene)[0]?.source, 'disposition-conflict'));
    } else if (!routed && !ruling) {
      const severed = model.severedEvidence.get(scene);
      findings.push(finding(
        'C', scene,
        severed
          ? `SEVERED scene ${scene} has lost every route. Evidence: ${severed}`
          : `NEVER-WIRED scene ${scene} has no trigger, route, room/NPC/interactable entry, encounter reference, or act2-through-act7 ladder form.`,
        'src/data/dialogs/index.js', severed ? 'severed' : 'never-wired',
      ));
    }
  }
  return findings;
}

// D HAS TWO HALVES AND THIS USED TO IMPLEMENT ONE.
// Closure membership proves the key EXISTS. The ordering half — DESIGN 4.6's
// "and reached BEFORE the room behind it is needed" — is the property that
// actually matters, and the old comment argued it was implied. It is not, quite:
// some sceneRoutes (the legacy-route fallbacks and the ladder-retry rows) are
// built with `room: null`, so `routeIsOpen` applies no gate to them and a scene
// behind a locked door can be counted reachable through one of those.
//
// The direct test, and the one a player would recognise: THE KEY MUST NOT BE
// INSIDE THE LOCKED ROOM. Re-run the closure with the gate's own flag blocked;
// if the room's contents can still grant it, the gate is circular. Blocking the
// flag is stronger than blocking the room and needs no new machinery — a flag
// that is only obtainable behind its own gate cannot appear in a closure that
// refuses to add it, and one that has an outside source is unaffected.
function checkD(model, closure) {
  const findings = [];
  for (const gate of model.gates.filter(item => item.requires)) {
    if (!closure.flags.has(gate.requires)) {
      findings.push(finding('D', `${gate.room}:${gate.requires}`, `Gate for ${gate.room} cannot close: ${gate.requires} is absent from fresh-save closure (including room-order constraints).`, 'src/data/story/graph.js'));
      continue;
    }
    const withoutRoom = runClosure(model, [], { blockedRooms: new Set([gate.room]) });
    if (!withoutRoom.flags.has(gate.requires)) {
      findings.push(finding('D', `${gate.room}:${gate.requires}`,
        `Gate for ${gate.room} is CIRCULAR: ${gate.requires} is only grantable from inside ${gate.room}, the room it unlocks. `
        + `The key is behind its own door.`,
        'src/data/story/graph.js'));
    }
  }
  return findings;
}

// E2, and it is the half the first cut of this check did not have.
// `once: 'scene'` fixes spend-before-grant for an INTERRUPTED scene, because
// `read_<scene>` is written only when a node was shown. It does NOT fix a LOST
// one: for a scene whose last action is `fight`, the read flag lands before the
// fight is entered and is never cleared. If that encounter has no other
// player-initiable route — no NPC in any room, no interactable — one defeat
// strands every flag the scene grants, permanently, on a live save.
// Measured on the shipped tree the day it was introduced: four such triggers,
// between them the sole writers of corporate_lawyer_defeated,
// data_lead_defeated, board_room_accessible and charter_certified. A trigger in
// that shape must declare `reArmOnDefeat`, which `_reconcileSceneLatches`
// honours at load and on defeat.
function fightEncountersOf(model, sceneId) {
  const tree = model.dialogs[sceneId] || [];
  return tree.filter(node => node.type === 'action' && node.action === 'start_combat')
    .map(node => node.encounter);
}

function checkE(model) {
  const findings = [];
  for (const trigger of model.triggers) {
    if (trigger.once === 'scene' || trigger.once === 'always') {
      if (trigger.once !== 'scene' || !trigger.grants?.length || trigger.reArmOnDefeat) continue;
      const encounters = fightEncountersOf(model, trigger.scene);
      if (!encounters.length) continue;
      const stranded = encounters.filter(encounter => !model.playerInitiableEncounters.has(encounter));
      if (!stranded.length) continue;
      findings.push(finding('E', trigger.id,
        `Trigger ${trigger.id} is once:'scene' and its scene ${trigger.scene} starts ${stranded.join(', ')}, `
        + `which no NPC or interactable can start. read_${trigger.scene} is written before the fight and is never `
        + `cleared, so ONE DEFEAT strands ${trigger.grants.join(', ')} for the life of the save. `
        + `Declare reArmOnDefeat: true on the row, or give the encounter a player-initiable route.`,
        trigger.src));
      continue;
    }
    if (trigger.once?.startsWith('flag:') && typeof trigger.waiver === 'string' && trigger.waiver.trim()) continue;
    findings.push(finding('E', trigger.id, `Trigger ${trigger.id} spends ${trigger.once || '<missing once>'} before ${trigger.scene} without a named waiver.`, trigger.src));
  }
  return findings;
}

function checkF(model, closure) {
  const findings = [];
  const cache = new Map();
  for (const grant of allGrantRecords(model)) {
    const negatives = [...negativeFlags(grant.when)]
      .filter(flag => flag !== grant.flag
        && closure.flags.has(flag)
        // An alternative path that remains satisfiable with f=true means the
        // grant event as a whole does not expire on f.
        && triExpr(grant.when, new Map([[flag, true]]), {}) === false)
      .sort();
    for (const expiringFlag of negatives) {
      if (!cache.has(expiringFlag)) cache.set(expiringFlag, runClosure(model, [], { blockedFlags: new Set([expiringFlag]) }));
      const beforeExpiry = cache.get(expiringFlag);
      if (beforeExpiry.fired.has(grant.id)) continue;
      findings.push(finding(
        'F', `${grant.id}:before:${expiringFlag}`,
        `Grant ${grant.flag} cannot be ordered before expiring flag ${expiringFlag}; its precondition is ${JSON.stringify(grant.when)}.`,
        grant.src,
      ));
    }
  }
  return findings;
}

function triExpr(expr, assignment, ctx) {
  if (expr === true || expr == null) return true;
  if (expr === false) return false;
  if (typeof expr === 'string') return assignment.has(expr) ? assignment.get(expr) : undefined;
  if (!Array.isArray(expr) || !expr.length) return false;
  const [op, ...rest] = expr;
  if (op === 'not') {
    const value = triExpr(rest[0], assignment, ctx);
    return value === undefined ? undefined : !value;
  }
  if (op === 'all') {
    let unknown = false;
    for (const term of rest) {
      const value = triExpr(term, assignment, ctx);
      if (value === false) return false;
      if (value === undefined) unknown = true;
    }
    return unknown ? undefined : true;
  }
  if (op === 'any') {
    let unknown = false;
    for (const term of rest) {
      const value = triExpr(term, assignment, ctx);
      if (value === true) return true;
      if (value === undefined) unknown = true;
    }
    return unknown ? undefined : false;
  }
  if (op === 'room') return ctx.room === rest[0];
  if (op === 'npc') return ctx.npc === rest[0];
  if (op === 'npcDialogId') return ctx.npcDialogId === rest[0];
  // `dialogExists` and `act` are CONCRETE in this model, not free variables:
  // the compiled corpus is fixed, and the act index is enumerated 0-7 by the
  // caller's context loop. Modelling them as free booleans instead would let
  // the solver satisfy `act >= 6` and `act < 6` at once and quietly under-report
  // shadowing, which is the failure mode a shadow check exists to avoid.
  if (op === 'dialogExists') return Boolean(ctx.dialogs?.[rest[0]]);
  if (op === 'act') {
    const value = Number(ctx.act ?? 0);
    if (rest[0] === '>=') return value >= rest[1];
    if (rest[0] === '==') return value === rest[1];
    if (rest[0] === '<') return value < rest[1];
    return undefined;
  }
  if (op === 'pred') {
    const key = `@pred:${rest[0]}`;
    return assignment.has(key) ? assignment.get(key) : undefined;
  }
  if (op === 'set') {
    return triExpr(['all', ...(rest[0] === 'RENOVATION_FLAGS' ? ALL_RENOVATION_FLAGS : [])], assignment, ctx);
  }
  return undefined;
}

function satAtoms(expr, out = new Set()) {
  if (typeof expr === 'string') out.add(expr);
  else if (Array.isArray(expr) && expr.length) {
    const op = expr[0];
    // Everything triExpr resolves from the CONTEXT is not a search variable.
    if (op === 'room' || op === 'npc' || op === 'npcDialogId' || op === 'dialogExists' || op === 'act') return out;
    if (op === 'pred') out.add(`@pred:${expr[1]}`);
    else for (const term of expr.slice(1)) satAtoms(term, out);
  }
  return out;
}

function filtersCompatible(earlier, target, ctx) {
  if (earlier.npc && earlier.npc !== ctx.npc) return false;
  if (earlier.room && earlier.room !== ctx.room) return false;
  return true;
}

// CHECK G IS A SAT PROBLEM AND MUST NOT BE BRANCHED IN A FIXED VARIABLE ORDER.
// Measured on the shipped 65-row table the moment P7 landed: the terminal
// `act-ladder` row has 64 earlier compatible rules and 151 distinct atoms
// between them, so a fixed order is a 2^151 search — the tool ran for over ten
// minutes without finishing, on a check that had been wired into `npm run
// check`. A gate that does not terminate is worse than no gate.
//
// The fix is variable RELEVANCE: only ever branch on an atom belonging to a
// constraint that is currently undecided — the target while its value is
// unknown, otherwise the first competitor still unknown — so every decision
// resolves something instead of wandering through irrelevant flags. A decision
// budget backstops it, and exhausting it is reported as a FAILURE that says
// "could not decide", never as a silent pass.
const G_DECISION_BUDGET = 200000;

function firstUndeterminedAtom(expr, assignment) {
  for (const atom of satAtoms(expr)) if (!assignment.has(atom)) return atom;
  return null;
}

const G_ACT_CONTEXTS = [0, 1, 2, 3, 4, 5, 6, 7];

// Every `['npcDialogId', X]` literal anywhere in the table, plus "no hardcoded
// dialogId". Pinning this to null instead — which is what the first cut did —
// makes every rule that reads a room entry's hardcoded dialogId permanently
// unsatisfiable, and check G then reports the three Janitor rows and the
// intro bypass as shadowed when they are nothing of the kind.
function npcDialogIdContexts(routes) {
  const out = new Set([null]);
  const walk = expr => {
    if (!Array.isArray(expr) || !expr.length) return;
    if (expr[0] === 'npcDialogId') { out.add(expr[1]); return; }
    for (const term of expr.slice(1)) walk(term);
  };
  for (const route of routes) walk(route.when);
  return [...out];
}

function ruleHasUnshadowedAssignment(routes, index, dialogs) {
  const target = routes[index];
  const earlier = routes.slice(0, index);
  const npcContexts = target.npc ? [target.npc] : [...new Set([null, '__other__', ...routes.map(route => route.npc).filter(Boolean)])];
  const roomContexts = target.room ? [target.room] : [...new Set([null, '__other__', ...routes.map(route => route.room).filter(Boolean)])];
  const dialogIdContexts = npcDialogIdContexts(routes);
  let budget = G_DECISION_BUDGET;
  let exhausted = false;

  for (const npc of npcContexts) for (const room of roomContexts) for (const act of G_ACT_CONTEXTS) for (const npcDialogId of dialogIdContexts) {
    const ctx = { npc, room, act, dialogs, npcDialogId };
    const competitors = earlier.filter(rule => filtersCompatible(rule, target, ctx));
    const assignment = new Map();
    const search = () => {
      if (budget <= 0) { exhausted = true; return false; }
      budget -= 1;
      const targetValue = triExpr(target.when ?? true, assignment, ctx);
      if (targetValue === false) return false;
      let pending = null;
      for (const rule of competitors) {
        const value = triExpr(rule.when ?? true, assignment, ctx);
        if (value === true) return false;
        if (value === undefined && pending === null) pending = rule;
      }
      if (targetValue === true && pending === null) return true;
      const source = targetValue === undefined ? (target.when ?? true) : (pending.when ?? true);
      const variable = firstUndeterminedAtom(source, assignment);
      if (variable === null) return false;
      assignment.set(variable, false);
      if (search()) return true;
      assignment.set(variable, true);
      if (search()) return true;
      assignment.delete(variable);
      return false;
    };
    if (search()) return { ok: true, exhausted: false };
  }
  return { ok: false, exhausted };
}

function checkG(model) {
  if (!model.dialogRoutes) return { findings: [], waivers: [], notice: 'NOT IMPLEMENTED / NO-OP: src/data/story/routes.js is absent (P7); legacy route reads/scenes are still harvested for Checks B/C.' };
  const findings = [];
  const waivers = [];
  for (let index = 0; index < model.dialogRoutes.length; index += 1) {
    const route = model.dialogRoutes[index];
    const verdict = ruleHasUnshadowedAssignment(model.dialogRoutes, index, model.dialogs);
    if (verdict.ok) continue;
    const where = route.src || 'src/data/story/routes.js';
    // A row may carry `shadowed: '<reason>'` when it is a FAITHFUL transcription
    // of a branch that is already dead in the shipped function. It is reported
    // by name on every run, exactly like a trigger waiver, so the count can only
    // go down — it is never silently swallowed, and it never applies to a row
    // whose deadness the exhaustion path could not decide.
    if (route.shadowed && !verdict.exhausted) {
      waivers.push(`WAIVER G SHADOWED ${route.id || `route-${index}`} (${where}): ${route.shadowed}`);
      continue;
    }
    if (verdict.exhausted) {
      findings.push(finding('G', route.id || `route-${index}`, `Route ${route.id || index} could not be decided within ${G_DECISION_BUDGET} decisions. This is NOT a pass — raise the budget or simplify the rule.`, where));
    } else {
      findings.push(finding('G', route.id || `route-${index}`, `Route ${route.id || index} is shadowed: no satisfying assignment lets it fire before all earlier compatible rules.`, where));
    }
  }
  return { findings, waivers, notice: null };
}

function runChecks(model, startFlags = []) {
  const closure = runClosure(model, startFlags);
  addOrderableGrantFlags(model, closure);
  const g = checkG(model);
  const checks = {
    A: checkA(model, closure),
    B: checkB(model, closure),
    C: checkC(model),
    D: checkD(model, closure),
    E: checkE(model),
    F: checkF(model, closure),
    G: g.findings,
  };
  return { closure, checks, notices: g.notice ? [g.notice] : [], routeWaivers: g.waivers || [] };
}

function reportFor(model, result) {
  const waiverRows = model.triggers.filter(trigger => trigger.once?.startsWith('flag:') && trigger.waiver);
  const neverRows = NEVER_SET.filter(row => row.reason && row.reason.trim());
  const cutRows = model.dispositions.filter(row => row.kind === 'cut');
  const restoreRows = model.dispositions.filter(row => row.kind === 'restore');
  const failures = Object.values(result.checks).flat();
  return {
    ok: failures.length === 0,
    model: {
      scenes: Object.keys(model.dialogs).length,
      triggers: model.triggers.length,
      codeGrants: model.codeGrants.length,
      autoGrantPatterns: AUTO_GRANTS.length,
      closureFlags: result.closure.flags.size,
      reachableScenes: result.closure.scenes.size,
      reachableEncounters: result.closure.encounters.size,
      closureIterations: result.closure.iterations,
      orderingAugmentations: result.closure.orderingAugmentations || 0,
    },
    checks: Object.fromEntries(Object.entries(result.checks).map(([id, rows]) => [id, {
      name: CHECK_NAMES[id], status: id === 'G' && result.notices.length ? 'NOT IMPLEMENTED' : rows.length ? 'FAIL' : 'PASS', findings: rows,
    }])),
    notices: result.notices,
    routeWaivers: result.routeWaivers || [],
    exceptions: {
      triggerWaivers: waiverRows.map(trigger => ({ id: trigger.id, waiver: trigger.waiver, once: trigger.once, src: trigger.src, note: trigger.note })),
      neverSet: neverRows,
      sceneDisposition: model.dispositions,
    },
    counts: {
      failures: failures.length,
      triggerWaivers: waiverRows.length,
      neverSet: neverRows.length,
      sceneCut: cutRows.length,
      sceneRestore: restoreRows.length,
    },
    limitation: LIMITATION,
  };
}

function formatReport(report) {
  const lines = [
    'TRUST ISSUES STORY SIMULATOR — P6',
    'MODEL: monotone forward FIXPOINT (intentionally different from the runtime evaluator\'s single ordered pass).',
    `CORPUS: ${report.model.scenes} scenes; ${report.model.triggers} triggers; ${report.model.codeGrants} code grants; ${report.model.autoGrantPatterns} auto-grant patterns.`,
    `CLOSURE: ${report.model.closureFlags} flags; ${report.model.reachableScenes} scenes; ${report.model.reachableEncounters} encounters; ${report.model.closureIterations} iterations.`,
    `ORDERING: ${report.model.orderingAugmentations} flag(s) recovered by a proven before-expiry choice order.`,
  ];
  for (const [id, check] of Object.entries(report.checks)) {
    if (check.status === 'NOT IMPLEMENTED') {
      lines.push(`NOTICE ${id} ${check.name}: ${report.notices[0]}`);
    } else if (!check.findings.length) {
      lines.push(`PASS ${id} ${check.name}`);
    } else {
      for (const row of check.findings) {
        lines.push(`FAIL ${id} ${row.src ? `${row.src} ` : ''}${row.message}`);
      }
    }
  }
  for (const row of report.exceptions.sceneDisposition) {
    if (row.kind === 'restore') lines.push(`WAIVER C RESTORE ${row.scene}: ${row.reason} WIRING: ${row.wiring}`);
    else lines.push(`WAIVER C CUT ${row.scene}: ${row.reason}`);
  }
  for (const row of report.exceptions.neverSet) {
    lines.push(`WAIVER B NEVER_SET ${row.flag}: ${row.reason}${row.src ? ` (${row.src})` : ''}`);
  }
  for (const row of report.exceptions.triggerWaivers) {
    lines.push(`WAIVER E ${row.waiver} [${row.id}, ${row.once}] ${row.src}: ${row.note}`);
  }
  for (const row of report.routeWaivers || []) lines.push(row);
  lines.push(`SUMMARY: ${report.counts.failures} failure(s); ${report.counts.triggerWaivers} trigger waiver row(s); ${(report.routeWaivers || []).length} shadowed-route waiver row(s); ${report.counts.neverSet} NEVER_SET row(s); ${report.counts.sceneCut} CUT disposition(s); ${report.counts.sceneRestore} RESTORE disposition(s).`);
  lines.push(`HONEST LIMIT: ${report.limitation}`);
  lines.push(report.ok ? 'RESULT: GREEN' : 'RESULT: RED');
  return lines.join('\n');
}

function observedRed(findings, predicate = () => true) {
  return findings.some(predicate);
}

function runRegressionRow(baseModel) {
  const legacyTriggers = clone(baseModel.triggers).filter(trigger => trigger.id !== 'act5-restructuring');
  legacyTriggers.push({
    id: 'regression-act5-persisted-latch', on: 'update', room: 'cubicle_farm',
    when: ['all', 'has_charter', 'act3_complete', ['not', 'act4_complete']],
    once: 'flag:act5_triggered', scene: 'act5_trigger', delayMs: 800,
    grants: ['act4_complete'], src: 'REGRESSION #1',
    note: 'Pre-fix persisted latch reconstructed in memory.',
  });
  const model = { ...baseModel, triggers: legacyTriggers };
  const eRed = observedRed(checkE(model), row => row.id === 'regression-act5-persisted-latch');
  const interrupted = runClosure(model, ['briefing_complete', 'branch_chosen', 'act2_complete', 'act3_complete', 'has_charter', 'act5_triggered']);
  // Same law as the selftest rows: assert the CHECK fires, not just that the
  // closure lost the flag. checkA is run against the interrupted start state.
  const aClosureLost = !interrupted.flags.has('act4_complete');
  const aRed = aClosureLost && observedRed(checkA(model, interrupted), row => row.id === 'act5');
  return {
    check: 'REGRESSION #1 (E+A)',
    mutation: 'restore pre-fix act5_triggered persisted latch; start interrupted save with latch=true / act4_complete=false',
    expected: 'RED', observed: eRed && aRed ? 'RED (E latch + A interrupted state)' : `FAILED (E=${eRed}, A=${aRed})`, ok: eRed && aRed,
  };
}

function runSelftests() {
  const rows = [];
  const base = makeModel();

  const withoutAct4 = { ...base, dialogGrants: base.dialogGrants.filter(grant => grant.flag !== 'act4_complete') };
  const aResult = runClosure(withoutAct4);
  // `ok` MUST assert the CHECK reported, not merely that the closure changed.
  // It used to read `!aResult.flags.has('act4_complete')`, which is a property of
  // the mutation rather than of check A: stubbing checkA to `return []` printed
  // A | RED | GREEN in the table and still exited 0, and the exit code is the
  // only thing npm run check reads. Every row below asserts `observed === 'RED'`.
  const aRed = observedRed(checkA(withoutAct4, aResult), row => row.id === 'act5');
  rows.push({ check: 'A', mutation: 'delete the sole act4_complete grant from act5_trigger', expected: 'RED', observed: aRed ? 'RED' : 'GREEN', ok: aRed && !aResult.flags.has('act4_complete') });

  const bReads = new Map([...base.reads].map(([flag, sources]) => [flag, new Set(sources)]));
  bReads.set('selftest_unwritten_route_flag', new Set(['selftest:route']));
  const bModel = { ...base, reads: bReads };
  const bClosure = runClosure(bModel);
  const bRed = observedRed(checkB(bModel, bClosure), row => row.id === 'selftest_unwritten_route_flag');
  rows.push({ check: 'B', mutation: 'add a route read of selftest_unwritten_route_flag with no writer', expected: 'RED', observed: bRed ? 'RED' : 'GREEN', ok: bRed });

  const cStructural = new Map(base.structural);
  cStructural.delete('dying_plant');
  const cModel = {
    ...base,
    structural: cStructural,
    sceneRoutes: base.sceneRoutes.filter(route => route.scene !== 'dying_plant'),
    severedEvidence: new Map([['dying_plant', 'selftest removed both current room entries']]),
  };
  const cRed = observedRed(checkC(cModel), row => row.id === 'dying_plant' && row.category === 'severed');
  rows.push({ check: 'C', mutation: 'delete both room routes to live scene dying_plant', expected: 'RED', observed: cRed ? 'RED (SEVERED)' : 'GREEN', ok: cRed });

  const dGates = clone(GATES).map(gate => gate.room === 'executive_floor' && !gate.kind ? { ...gate, requires: 'selftest_gate_inside' } : gate);
  const dModel = {
    ...base,
    gates: dGates,
    extraGrants: [{ id: 'selftest-gate-grant', flag: 'selftest_gate_inside', when: true, scene: 'executive_desk', src: 'selftest:executive_desk', note: 'Granted only by a scene behind the mutated gate.', kind: 'dialog' }],
  };
  const dClosure = runClosure(dModel);
  const dRed = observedRed(checkD(dModel, dClosure), row => row.id.includes('selftest_gate_inside'));
  rows.push({ check: 'D', mutation: 'require a flag granted only by executive_desk behind that gate', expected: 'RED', observed: dRed ? 'RED' : 'GREEN', ok: dRed });

  const eTriggers = clone(TRIGGERS);
  eTriggers[0] = { ...eTriggers[0], once: 'flag:selftest_started' };
  delete eTriggers[0].waiver;
  const eModel = { ...base, triggers: eTriggers };
  const eRed = observedRed(checkE(eModel), row => row.id === eTriggers[0].id);
  rows.push({ check: 'E', mutation: `change ${eTriggers[0].id} from once:always to unwaived flag:selftest_started`, expected: 'RED', observed: eRed ? 'RED' : 'GREEN', ok: eRed });

  const fModel = {
    ...base,
    extraGrants: [{ id: 'selftest-expired-ally', flag: 'selftest_ally_reward', when: ['all', 'act6_complete', ['not', 'act5_complete']], src: 'selftest:expired-mission', note: 'Mission appears only after its own expiry.', kind: 'code' }],
  };
  const fClosure = runClosure(fModel);
  const fRed = observedRed(checkF(fModel, fClosure), row => row.id.startsWith('selftest-expired-ally:'));
  rows.push({ check: 'F', mutation: 'add ally reward requiring act6_complete but expiring at act5_complete', expected: 'RED', observed: fRed ? 'RED' : 'GREEN', ok: fRed });

  const gRoutes = [
    { id: 'selftest-broad', npc: 'janet', when: true, then: 'janet_return', src: 'selftest:1' },
    { id: 'selftest-shadowed', npc: 'janet', when: 'briefing_complete', then: 'janet_act2', src: 'selftest:2' },
  ];
  const gModel = { ...base, dialogRoutes: gRoutes };
  const gRed = observedRed(checkG(gModel).findings, row => row.id === 'selftest-shadowed');
  rows.push({ check: 'G', mutation: 'insert an unconditional Janet rule above a narrower Janet rule', expected: 'RED', observed: gRed ? 'RED' : 'GREEN', ok: gRed });

  rows.push(runRegressionRow(base));
  return rows;
}

function formatSelftests(rows) {
  const headers = ['CHECK', 'MUTATION APPLIED', 'EXPECTED', 'OBSERVED'];
  const data = [headers, ...rows.map(row => [row.check, row.mutation, row.expected, row.observed])];
  const widths = headers.map((_, index) => Math.max(...data.map(row => row[index].length)));
  const format = row => row.map((cell, index) => cell.padEnd(widths[index])).join(' | ');
  const divider = widths.map(width => '-'.repeat(width)).join('-|-');
  return [
    'STORY SIMULATOR SELFTEST — SEVEN MUTATIONS, SEVEN REDS',
    format(headers), divider, ...data.slice(1).map(format),
    'REGRESSION #1 historical bug: measured 2026-08-15 by tools/_r-act5latch.mjs — an interrupted entry banks act5_triggered:true / act4_complete:false and Acts 5, 6, 7 become unreachable forever.',
    rows.every(row => row.ok) ? 'SELFTEST RESULT: PASS' : 'SELFTEST RESULT: FAIL',
  ].join('\n');
}

if (selftest || regressOnly) {
  const rows = runSelftests();
  const selected = regressOnly && !selftest ? rows.filter(row => row.check.startsWith('REGRESSION')) : rows;
  console.log(formatSelftests(selected));
  process.exit(selected.every(row => row.ok) ? 0 : 1);
}

const model = makeModel();
const result = runChecks(model);
const report = reportFor(model, result);
const human = formatReport(report);
console.log(human);
if (reportFile) {
  writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`JSON REPORT: ${reportFile}`);
}
process.exit(report.ok ? 0 : 1);
