import { readdirSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CombatEngine } from '../src/combat/CombatEngine.js';
import { Player } from '../src/entities/Player.js';
import { Furniture } from '../src/world/Furniture.js';
import { ALLY_ABILITIES, ALLY_STATS } from '../src/data/allies.js';
import { BESTIARY_DATA } from '../src/data/bestiary.js';
import { DIALOGS } from '../src/data/dialogs/index.js';
import { ENCOUNTERS } from '../src/data/encounters/index.js';
import { ITEMS } from '../src/data/items.js';
import { QUESTS } from '../src/data/quests/index.js';
import { ROOMS } from '../src/data/rooms/index.js';
import { SHOP_CATEGORIES, SHOP_ITEMS } from '../src/data/shop.js';
import { COSMETICS, COSMETIC_SLOTS } from '../src/data/cosmetics.js';
import { VOICES, VOICE_ACTIONS } from '../src/data/voices.js';
import { ROOM_THOUGHTS, STORY_THOUGHTS } from '../src/data/thoughts.js';
import { CHARACTER_CONFIGS } from '../src/data/characters.js';
import BALANCE from '../src/data/balance.json' with { type: 'json' };
import {
  ENEMY_ABILITIES,
  ENEMY_STATS,
  PLAYER_ABILITIES,
  PLAYER_BASE_STATS,
} from '../src/data/stats.js';

const issues = [];
const DIALOG_ACTIONS = new Set([
  'set_flag',
  'start_combat',
  'give_item',
  'heal',
  'quest_update',
  'give_xp',
  'modify_stat',
  'recruit_ally',
  'unlock_ally_ability',
]);
const PLAYER_STAT_KEYS = new Set(Object.keys(PLAYER_BASE_STATS));
// `maxComposure` is a first-class authorable enemy stat (CombatEngine
// _defaultMaxComposure reads ENEMY_STATS[id].maxComposure and therefore the
// balance.json enemies block too); it was simply missing from this list.
const ENEMY_STAT_KEYS = new Set(['maxHP', 'hp', 'atk', 'def', 'spd', 'xpReward', 'maxComposure']);
const ABILITY_NUMERIC_KEYS = new Set([
  'cost',
  'power',
  'healAmount',
  'mpHealAmount',
  'momentumGain',
  'debuffDuration',
  'buffDuration',
  'duration',
]);

function fail(message) {
  issues.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function validateDialogs() {
  for (const [id, nodes] of Object.entries(DIALOGS)) {
    assert(Array.isArray(nodes), `dialog ${id} is not an array`);
    if (!Array.isArray(nodes)) continue;

    nodes.forEach((node, index) => {
      for (const key of ['next', 'ifTrue', 'ifFalse', 'fallback']) {
        const value = node[key];
        if (value !== undefined) {
          assert(Number.isInteger(value), `dialog ${id} node ${index} ${key} is not an integer`);
          assert(value >= 0 && value < nodes.length, `dialog ${id} node ${index} ${key} out of range: ${value}`);
        }
      }

      if (node.type === 'choice') {
        assert(Array.isArray(node.choices), `dialog ${id} node ${index} choice node has no choices array`);
        assert((node.choices || []).length > 0, `dialog ${id} node ${index} choice node has no choices`);
        (node.choices || []).forEach((choice, choiceIndex) => {
          if (choice.next !== undefined) {
            assert(Number.isInteger(choice.next), `dialog ${id} node ${index} choice ${choiceIndex} next is not an integer`);
            assert(choice.next >= 0 && choice.next < nodes.length, `dialog ${id} node ${index} choice ${choiceIndex} next out of range: ${choice.next}`);
          }
        });
      }

      if (node.type === 'condition') {
        assert(!!node.flag, `dialog ${id} node ${index} condition missing flag`);
      }
      if (node.type === 'action' && node.action === 'set_flag') {
        assert(!!node.flag, `dialog ${id} node ${index} set_flag missing flag`);
      }
      if (node.type === 'action') {
        validateDialogAction(id, node, index);
      }
      if (node.type === 'stage') {
        validateStageNode(id, node, index);
      }
    });
  }
}

// STAGE BEATS (see src/world/StageDirector.js). Every degradation rule in the
// director is silent by design — a missing actor is a no-op, an unresolved mark
// falls back to "face only" — so a typo does not throw, it just plays half a
// scene. That has to be caught at build time instead.
const STAGE_VERBS = ['walkTo', 'face', 'sit', 'stand', 'exit', 'gesture', 'pose', 'expression', 'hold', 'show'];
const STAGE_POINT_FIELDS = ['walkTo', 'face', 'sit', 'exit', 'spawnAt'];
let _stageMarks = null, _stageNpcIds = null;
function validateStageNode(id, node, index) {
  if (_stageMarks === null) {
    _stageMarks = new Set();
    _stageNpcIds = new Set();
    for (const room of Object.values(ROOMS)) {
      for (const k of Object.keys(room.marks || {})) _stageMarks.add(k);
      for (const n of room.npcs || []) _stageNpcIds.add(n.id);
    }
  }
  assert(Array.isArray(node.beats) && node.beats.length > 0,
    `dialog ${id} node ${index} stage node has no beats`);
  for (const b of node.beats || []) {
    assert(typeof b.actor === 'string' && b.actor.length > 0,
      `dialog ${id} node ${index} stage beat has no actor`);
    if (typeof b.actor !== 'string') continue;
    assert(b.actor === 'player' || _stageNpcIds.has(b.actor) || !!CHARACTER_CONFIGS[b.actor],
      `dialog ${id} node ${index} stage beat actor "${b.actor}" is neither 'player', a room NPC id, nor a CHARACTER_CONFIGS id`);
    if (b.spawn) {
      assert(!!CHARACTER_CONFIGS[b.actor],
        `dialog ${id} node ${index} stage beat spawns "${b.actor}" but there is no CHARACTER_CONFIGS entry for it`);
    }
    assert(STAGE_VERBS.some(v => b[v] !== undefined),
      `dialog ${id} node ${index} stage beat for "${b.actor}" carries no verb (${STAGE_VERBS.join('/')})`);
    for (const f of STAGE_POINT_FIELDS) {
      const v = b[f];
      if (typeof v !== 'string') continue;
      assert(_stageMarks.has(v) || v === 'player' || _stageNpcIds.has(v) || !!CHARACTER_CONFIGS[v],
        `dialog ${id} node ${index} stage beat ${f}: "${v}" is neither a room mark nor an actor id`);
    }
    if (b.after !== undefined) {
      assert(Number.isInteger(b.after) && b.after >= 0 && b.after < node.beats.length,
        `dialog ${id} node ${index} stage beat after:${b.after} is out of range`);
    }
  }
}

// Successor set for a dialog node, modelling DialogState._processNode /
// _handleChoice / condition exactly: `next` wins, then ifTrue/ifFalse, then
// fall-through to index + 1. `end` terminates.
function dialogSuccessors(nodes, i) {
  const n = nodes[i];
  if (!n) return [];
  if (n.type === 'end') return [];
  if (n.type === 'choice') {
    return (n.choices || []).map((c, ci) => (c.next !== undefined ? c.next : i + 1));
  }
  if (n.type === 'condition') {
    return [
      n.ifTrue !== undefined ? n.ifTrue : i + 1,
      n.ifFalse !== undefined ? n.ifFalse : i + 1,
    ];
  }
  return [n.next !== undefined ? n.next : i + 1];
}

// REWARD REACHABILITY. `team_chat_hub` drifted one slot out of step with its
// own `/* NN */` comments and every jump was authored against the comments, so
// 48 of 119 nodes lost all paths from node 0 — including the Skeptic's-chair
// `modify_stat maxMP +5`, a permanent reward that could never be collected.
// Padding `end` nodes are a deliberate convention here, so only nodes that PAY
// something are checked: a reward with no path is always a bug.
const REWARD_ACTIONS = new Set(['give_item', 'give_xp', 'modify_stat', 'heal', 'recruit_ally', 'unlock_ally_ability']);
function validateRewardReachability() {
  for (const [id, nodes] of Object.entries(DIALOGS)) {
    if (!Array.isArray(nodes) || nodes.length === 0) continue;
    const seen = new Set();
    const stack = [0];
    while (stack.length) {
      const i = stack.pop();
      if (seen.has(i) || nodes[i] === undefined) continue;
      seen.add(i);
      for (const s of dialogSuccessors(nodes, i)) if (!seen.has(s)) stack.push(s);
    }
    nodes.forEach((node, i) => {
      if (node?.type !== 'action' || !REWARD_ACTIONS.has(node.action)) return;
      assert(seen.has(i), `dialog ${id} node ${i} pays a reward (${node.action}) but has no path from node 0`);
    });
  }
}

function validateDialogAction(dialogId, node, index) {
  assert(DIALOG_ACTIONS.has(node.action), `dialog ${dialogId} node ${index} has unknown action ${node.action}`);

  switch (node.action) {
    case 'set_flag':
      assert(!!node.flag, `dialog ${dialogId} node ${index} set_flag missing flag`);
      break;

    case 'start_combat':
      assert(!!ENCOUNTERS[node.encounter], `dialog ${dialogId} node ${index} start_combat references missing encounter ${node.encounter}`);
      break;

    case 'give_item':
      assert(!!ITEMS[node.item], `dialog ${dialogId} node ${index} give_item references missing item ${node.item}`);
      if (node.quantity !== undefined) {
        assert(Number.isInteger(node.quantity) && node.quantity > 0, `dialog ${dialogId} node ${index} give_item has invalid quantity ${node.quantity}`);
      }
      break;

    case 'quest_update': {
      const objective = node.objective ?? node.stage;
      const quest = QUESTS[node.quest];
      assert(!!quest, `dialog ${dialogId} node ${index} quest_update references missing quest ${node.quest}`);
      assert(objective !== undefined, `dialog ${dialogId} node ${index} quest_update missing objective/stage`);
      if (quest && objective !== undefined) {
        assert(
          quest.stages.some((stage) => stage.id === objective),
          `dialog ${dialogId} node ${index} quest_update references missing stage ${objective} for quest ${node.quest}`,
        );
      }
      break;
    }

    case 'give_xp':
      assert(Number.isFinite(node.xp) && node.xp >= 0, `dialog ${dialogId} node ${index} give_xp has invalid xp ${node.xp}`);
      break;

    case 'modify_stat':
      assert(!!node.stat, `dialog ${dialogId} node ${index} modify_stat missing stat`);
      assert(PLAYER_BASE_STATS[node.stat] !== undefined, `dialog ${dialogId} node ${index} modify_stat references missing stat ${node.stat}`);
      assert(Number.isFinite(node.amount), `dialog ${dialogId} node ${index} modify_stat has invalid amount ${node.amount}`);
      break;

    case 'recruit_ally':
      assert(!!ALLY_STATS[node.ally], `dialog ${dialogId} node ${index} recruit_ally references missing ally ${node.ally}`);
      break;

    case 'unlock_ally_ability': {
      const ally = ALLY_STATS[node.ally];
      assert(!!ally, `dialog ${dialogId} node ${index} unlock_ally_ability references missing ally ${node.ally}`);
      assert(!!ALLY_ABILITIES[node.ability], `dialog ${dialogId} node ${index} unlock_ally_ability references missing ability ${node.ability}`);
      if (ally && node.ability) {
        assert(
          (ally.abilities || []).includes(node.ability) || (ally.starterAbilities || []).includes(node.ability),
          `dialog ${dialogId} node ${index} unlock_ally_ability gives ${node.ability} to ally ${node.ally}, but ally does not list it`,
        );
      }
      break;
    }

    default:
      break;
  }
}

function validateDataReferences() {
  const enemyAbilityTypes = new Set(['attack', 'dot', 'heal', 'debuff', 'confuse', 'stun', 'silence', 'counter', 'repeat', 'summon', 'buff']);
  const allyAbilityTypes = new Set(['attack', 'attack_aoe', 'heal_ally', 'buff_party', 'debuff', 'silence']);

  for (const [id, enemy] of Object.entries(ENEMY_STATS)) {
    for (const abilityId of enemy.abilities || []) {
      assert(!!ENEMY_ABILITIES[abilityId], `enemy ${id} references missing ability ${abilityId}`);
    }
    assert(!!BESTIARY_DATA[id] || id === 'reception_client', `enemy ${id} has no bestiary entry`);
  }

  for (const [id, ability] of Object.entries(ENEMY_ABILITIES)) {
    assert(enemyAbilityTypes.has(ability.type), `enemy ability ${id} has unsupported type ${ability.type}`);
  }

  for (const [id, encounter] of Object.entries(ENCOUNTERS)) {
    const enemyIds = encounter.enemyIds || [encounter.enemyId];
    for (const enemyId of enemyIds) {
      assert(!!ENEMY_STATS[enemyId], `encounter ${id} references missing enemy ${enemyId}`);
    }
    for (const dialogId of [encounter.preDialogId, encounter.postDialogId].filter(Boolean)) {
      assert(!!DIALOGS[dialogId], `encounter ${id} references missing dialog ${dialogId}`);
    }
  }

  for (const [roomId, room] of Object.entries(ROOMS)) {
    assert(Number.isFinite(room.width) && room.width > 0, `room ${roomId} has invalid width`);
    assert(Number.isFinite(room.height) && room.height > 0, `room ${roomId} has invalid height`);

    for (const [kind, entries] of [
      ['furniture', room.furniture || []],
      ['npc', room.npcs || []],
      ['exit', room.exits || []],
      ['interactable', room.interactables || []],
    ]) {
      entries.forEach((entry, index) => {
        validateRoomCondition(roomId, kind, index, entry.condition);
        if (kind === 'furniture') {
          assert(typeof Furniture[entry.type] === 'function', `room ${roomId} furniture ${index} has unknown furniture type ${entry.type}`);
        }
        // Furniture may recess half a tile into the wall plane (walls sit
        // at -0.5 / size-0.5) — e.g. the elevator units are recessed
        // portals in their doorway gaps. NPCs, exits, and interactables
        // stay strictly in-grid.
        const slack = kind === 'furniture' ? 0.5 : 0;
        if (entry.x !== undefined) {
          assert(Number.isFinite(entry.x), `room ${roomId} ${kind} ${index} has non-numeric x`);
          assert(entry.x >= -slack && entry.x <= room.width + slack, `room ${roomId} ${kind} ${index} x outside bounds: ${entry.x}`);
        }
        if (entry.z !== undefined) {
          assert(Number.isFinite(entry.z), `room ${roomId} ${kind} ${index} has non-numeric z`);
          assert(entry.z >= -slack && entry.z <= room.height + slack, `room ${roomId} ${kind} ${index} z outside bounds: ${entry.z}`);
        }
      });
    }

    for (const [index, exit] of (room.exits || []).entries()) {
      assert(!!ROOMS[exit.targetRoom], `room ${roomId} exit ${index} targets missing room ${exit.targetRoom}`);
      if (exit.spawnX !== undefined) assert(Number.isFinite(exit.spawnX), `room ${roomId} exit ${index} has non-numeric spawnX`);
      if (exit.spawnZ !== undefined) assert(Number.isFinite(exit.spawnZ), `room ${roomId} exit ${index} has non-numeric spawnZ`);
      if (ROOMS[exit.targetRoom]) {
        if (exit.spawnX !== undefined) {
          assert(exit.spawnX >= 0 && exit.spawnX <= ROOMS[exit.targetRoom].width, `room ${roomId} exit ${index} spawnX outside target room: ${exit.spawnX}`);
        }
        if (exit.spawnZ !== undefined) {
          assert(exit.spawnZ >= 0 && exit.spawnZ <= ROOMS[exit.targetRoom].height, `room ${roomId} exit ${index} spawnZ outside target room: ${exit.spawnZ}`);
        }
      }
    }

    // POSTER PARITY (CLAUDE.md "One-time poster/side-quest pattern", read in
    // reverse). Every `motivationalPoster` prop must have a readable
    // interactable on or beside its tile. Three shipped without one and were
    // visually identical to the readable ones, so the player walked up, pressed
    // E, and got nothing — the "posters that do nothing" playtest note. Use a
    // visually distinct prop (`abstractPainting`, `oilPainting`, …) for pure
    // decoration instead of a poster nobody can read.
    const roomInteractables = room.interactables || [];
    (room.furniture || []).forEach((f, index) => {
      if (f.type !== 'motivationalPoster' && f.type !== 'executivePoster') return;
      const readable = roomInteractables.some(i =>
        Math.abs(i.x - f.x) <= 1.0 && Math.abs(i.z - f.z) <= 1.2);
      assert(readable, `room ${roomId} furniture ${index} is a ${f.type} at (${f.x}, ${f.z}) with no interactable within a tile — use a decoration prop or add the poster interactable`);

      // POSTER FACING. `rotation` sets mesh.rotation.y and theta -> (sin, cos),
      // so 0 faces SOUTH (north wall) and Math.PI/2 faces EAST (west wall) —
      // the two interior faces the isometric camera actually looks at. A poster
      // on the SOUTH wall (Math.PI) or the EAST wall (-Math.PI/2) presents its
      // back: the player walks to a readable prop and sees a 0.62 x 0.52
      // rectangle of frame edge. Eight shipped that way, one of them a stat
      // reward (`quest_atk_1`). Decoration on those walls is fine — use
      // `abstractPainting`/`oilPainting`; a POSTER is a thing to be read.
      const rot = ((f.rotation || 0) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const blind = Math.abs(rot - Math.PI) < 0.05 || Math.abs(rot - Math.PI * 1.5) < 0.05;
      assert(!blind, `room ${roomId} furniture ${index} is a ${f.type} at (${f.x}, ${f.z}) rotated to face away from the camera (${(rot * 180 / Math.PI).toFixed(0)}deg) — mount posters on the NORTH wall (z~0.1, rotation 0) or the WEST wall (x~0.1, rotation Math.PI/2)`);
    });

    // STAGING MARKS. A `stage` beat that names a mark this room does not have
    // silently degrades to "face only" at runtime, which reads as a scene that
    // half-played. Marks are cheap to typo, so they are checked here.
    for (const [name, m] of Object.entries(room.marks || {})) {
      assert(Array.isArray(m) && m.length >= 2 && typeof m[0] === 'number' && typeof m[1] === 'number',
        `room ${roomId} mark "${name}" must be [x, z]`);
      if (!Array.isArray(m)) continue;
      assert(m[0] >= 0 && m[0] <= room.width && m[1] >= 0 && m[1] <= room.height,
        `room ${roomId} mark "${name}" (${m[0]}, ${m[1]}) is outside the room (${room.width}x${room.height})`);
    }

    for (const npc of room.npcs || []) {
      if (npc.dialogId) assert(!!DIALOGS[npc.dialogId], `room ${roomId} npc ${npc.id} references missing dialog ${npc.dialogId}`);
    }
    for (const interactable of room.interactables || []) {
      if (interactable.dialogId) {
        assert(!!DIALOGS[interactable.dialogId], `room ${roomId} ${interactable.type} references missing dialog ${interactable.dialogId}`);
      }
    }
  }

  for (const [id, ability] of Object.entries(PLAYER_ABILITIES)) {
    if (ability.requires) assert(!!PLAYER_ABILITIES[ability.requires], `player ability ${id} references missing prerequisite ${ability.requires}`);
    if (ability.unlockQuest) assert(!!QUESTS[ability.unlockQuest], `player ability ${id} references missing unlock quest ${ability.unlockQuest}`);
  }

  for (const [id, ally] of Object.entries(ALLY_STATS)) {
    for (const abilityId of [...(ally.starterAbilities || []), ...(ally.abilities || [])]) {
      assert(!!ALLY_ABILITIES[abilityId], `ally ${id} references missing ability ${abilityId}`);
    }
  }

  for (const [id, ability] of Object.entries(ALLY_ABILITIES)) {
    assert(allyAbilityTypes.has(ability.type), `ally ability ${id} has unsupported type ${ability.type}`);
  }
}

function validateRoomCondition(roomId, kind, index, condition) {
  if (condition === undefined) return;
  assert(condition && typeof condition === 'object' && !Array.isArray(condition), `room ${roomId} ${kind} ${index} condition is not an object`);
  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) return;

  const allowedKeys = new Set(['flag', 'notFlag']);
  for (const key of Object.keys(condition)) {
    assert(allowedKeys.has(key), `room ${roomId} ${kind} ${index} condition has unsupported key ${key}`);
  }
  if (condition.flag !== undefined) {
    assert(typeof condition.flag === 'string' && condition.flag.length > 0, `room ${roomId} ${kind} ${index} condition flag is invalid`);
  }
  if (condition.notFlag !== undefined) {
    assert(typeof condition.notFlag === 'string' && condition.notFlag.length > 0, `room ${roomId} ${kind} ${index} condition notFlag is invalid`);
  }
}

function validateShopAndBalance() {
  const shopIds = new Set(SHOP_ITEMS.map((item) => item.id));
  const shopCategories = new Set(Object.keys(SHOP_CATEGORIES));
  assert(shopIds.size === SHOP_ITEMS.length, 'shop items contain duplicate IDs');

  for (const item of SHOP_ITEMS) {
    assert(!!item.id, 'shop item missing id');
    assert(shopCategories.has(item.category), `shop item ${item.id} has unknown category ${item.category}`);
    assert(Number.isFinite(item.price) && item.price >= 0, `shop item ${item.id} has invalid price ${item.price}`);
    if (item.maxStack !== undefined) {
      assert(Number.isInteger(item.maxStack) && item.maxStack > 0, `shop item ${item.id} has invalid maxStack ${item.maxStack}`);
    }
    if (item.category === 'consumable') {
      assert(!!ITEMS[item.id], `shop consumable ${item.id} has no matching inventory item`);
    }
    if (item.category === 'upgrade') {
      assert(item.statBoost && typeof item.statBoost === 'object', `shop upgrade ${item.id} missing statBoost`);
      for (const [stat, amount] of Object.entries(item.statBoost || {})) {
        assert(PLAYER_STAT_KEYS.has(stat), `shop upgrade ${item.id} boosts unknown stat ${stat}`);
        assert(Number.isFinite(amount) && amount > 0, `shop upgrade ${item.id} has invalid boost amount ${amount}`);
      }
    }
    if (item.category === 'decor' || item.category === 'renovation') {
      assert(!!item.flag, `shop ${item.category} item ${item.id} missing ownership flag`);
    }
  }

  for (const [stat, value] of Object.entries(BALANCE.player || {})) {
    assert(PLAYER_STAT_KEYS.has(stat), `balance player override references unknown stat ${stat}`);
    assert(Number.isFinite(value) && value > 0, `balance player override ${stat} has invalid value ${value}`);
  }

  for (const [enemyId, overrides] of Object.entries(BALANCE.enemies || {})) {
    assert(!!ENEMY_STATS[enemyId], `balance enemy override references missing enemy ${enemyId}`);
    for (const [stat, value] of Object.entries(overrides || {})) {
      assert(ENEMY_STAT_KEYS.has(stat), `balance enemy ${enemyId} override references unknown stat ${stat}`);
      assert(Number.isFinite(value) && value >= 0, `balance enemy ${enemyId} ${stat} has invalid value ${value}`);
    }
  }

  for (const [abilityId, overrides] of Object.entries(BALANCE.abilities || {})) {
    const ability = PLAYER_ABILITIES[abilityId] || ENEMY_ABILITIES[abilityId] || ALLY_ABILITIES[abilityId];
    assert(!!ability, `balance ability override references missing ability ${abilityId}`);
    for (const [key, value] of Object.entries(overrides || {})) {
      assert(ABILITY_NUMERIC_KEYS.has(key), `balance ability ${abilityId} override references unsupported field ${key}`);
      assert(Number.isFinite(value) && value >= 0, `balance ability ${abilityId} ${key} has invalid value ${value}`);
    }
  }

  for (const [itemId, overrides] of Object.entries(BALANCE.shop || {})) {
    assert(shopIds.has(itemId), `balance shop override references missing shop item ${itemId}`);
    for (const [key, value] of Object.entries(overrides || {})) {
      assert(key === 'price', `balance shop ${itemId} override references unsupported field ${key}`);
      assert(Number.isFinite(value) && value >= 0, `balance shop ${itemId} price has invalid value ${value}`);
    }
  }
}

/** A passive must return null from playerAbility, never a castable result. */
function engineSmokePassiveRefused(abilityId) {
  const engine = new CombatEngine({ ...PLAYER_BASE_STATS, mp: 999, maxMP: 999 }, 'karen');
  engine.player.momentum = 100;
  return engine.playerAbility(abilityId, 0) === null;
}

function validateCosmetics() {
  const slots = new Set(COSMETIC_SLOTS);
  for (const [id, cosmetic] of Object.entries(COSMETICS)) {
    assert(slots.has(cosmetic.slot), `cosmetic ${id} has unknown slot ${cosmetic.slot}`);
    assert(cosmetic.unlock === 'default' || (cosmetic.unlock && typeof cosmetic.unlock === 'object'), `cosmetic ${id} has invalid unlock descriptor`);
    if (cosmetic.unlock?.quest) {
      assert(!!QUESTS[cosmetic.unlock.quest], `cosmetic ${id} references missing unlock quest ${cosmetic.unlock.quest}`);
    }
    for (const [stat, value] of Object.entries(cosmetic.stats || {})) {
      assert(PLAYER_STAT_KEYS.has(stat), `cosmetic ${id} modifies unknown stat ${stat}`);
      assert(Number.isFinite(value), `cosmetic ${id} stat ${stat} has invalid value ${value}`);
    }
  }
}

function validateVoices() {
  for (const [id, voice] of Object.entries(VOICES)) {
    assert(voice.id === id, `voice ${id} has mismatched id ${voice.id}`);
    assert(typeof voice.trigger === 'function', `voice ${id} missing trigger function`);
    assert(!!VOICE_ACTIONS[voice.actionId], `voice ${id} references missing action ${voice.actionId}`);
  }

  for (const [id, action] of Object.entries(VOICE_ACTIONS)) {
    assert(!!VOICES[action.voice], `voice action ${id} references missing voice ${action.voice}`);
    assert(typeof action.effect === 'function', `voice action ${id} missing effect function`);
    assert(typeof action.needsTarget === 'boolean', `voice action ${id} needsTarget must be boolean`);
  }
}

function validateThoughts() {
  for (const [roomId, thoughts] of Object.entries(ROOM_THOUGHTS)) {
    assert(!!ROOMS[roomId], `room thoughts reference missing room ${roomId}`);
    assert(Array.isArray(thoughts) && thoughts.length > 0, `room thoughts for ${roomId} must be a non-empty array`);
    for (const [index, thought] of thoughts.entries()) {
      assert(typeof thought === 'string' && thought.length > 0, `room thought ${roomId} ${index} is invalid`);
    }
  }
  for (const [flag, thought] of Object.entries(STORY_THOUGHTS)) {
    assert(typeof flag === 'string' && flag.length > 0, 'story thought has invalid flag key');
    assert(typeof thought === 'string' && thought.length > 0, `story thought ${flag} is invalid`);
  }
}

function validateCombatSmoke() {
  const baseStats = { ...PLAYER_BASE_STATS };

  const buffEngine = new CombatEngine(baseStats, 'karen');
  const buffResult = buffEngine._executeEnemyAbility(
    buffEngine.enemy,
    'demand_corporate',
    buffEngine._getEffective(buffEngine.enemy),
    buffEngine._getEffective(buffEngine.player),
  );
  assert(buffResult?.type === 'buff', 'enemy buff ability did not return a buff result');
  assert(buffEngine.enemy.buffs.length === 1, 'enemy buff ability did not add a buff');
  assert(buffEngine.enemy.buffs[0].stats.atk === 8, 'enemy buff ability applied unexpected stats');

  const allyEngine = new CombatEngine(
    baseStats,
    'intern',
    {},
    {
      partyIds: ['janet'],
      partyOverrides: {
        janet: {
          maxHP: 220,
          maxMP: 80,
          hp: 220,
          mp: 50,
          unlockedAbilities: ['pto_request'],
        },
      },
    },
  );
  allyEngine.player.hp = 20;
  allyEngine.player.mp = 10;
  const allyResult = allyEngine.allyTurn(1);
  assert(allyResult?.type === 'ally_heal_ally', 'ally MP recovery smoke did not use heal_ally');
  assert(allyResult.mpHealAmount === 30, 'ally MP recovery returned unexpected amount');
  assert(allyEngine.player.mp === 40, 'ally MP recovery did not restore Andrew Coffee');

  const silenceEngine = new CombatEngine(
    baseStats,
    'karen',
    {},
    {
      partyIds: ['alex_it'],
      partyOverrides: {
        alex_it: {
          maxHP: 180,
          maxMP: 110,
          hp: 180,
          mp: 110,
          unlockedAbilities: ['force_quit'],
        },
      },
    },
  );
  const silenceResult = silenceEngine.allyTurn(1);
  assert(silenceResult?.type === 'ally_silence', 'ally silence smoke did not use silence ability');
  assert(silenceEngine.enemy.silenced > 0, 'ally silence did not apply enemy silence');
  const silenceEffects = silenceEngine.processTurnStart(silenceEngine.enemy);
  assert(silenceEffects.some((effect) => effect.type === 'silenced'), 'enemy silence did not produce turn-start effect');
  const silencedEnemyResult = silenceEngine.enemyTurn(0);
  assert(silencedEnemyResult?.type === 'silenced', 'silenced enemy did not skip its turn');

  for (const [abilityId, ability] of Object.entries(PLAYER_ABILITIES)) {
    // PASSIVES ARE NOT CASTABLE. They are Practice Group nodes the engine
    // READS (from CombatEngine.nodes); playerAbility refuses them outright, so
    // asking one to execute is asking for the null it correctly returns.
    if (ability.type === 'passive') {
      assert(engineSmokePassiveRefused(abilityId), `passive ${abilityId} must not be castable`);
      continue;
    }
    const engine = new CombatEngine({ ...baseStats, mp: 999, maxMP: 999 }, 'karen');
    // Confidence-priced abilities (Escalate) need a bar to spend.
    engine.player.momentum = 100;
    const result = engine.playerAbility(abilityId, 0);
    assert(!!result, `player ability ${abilityId} failed combat smoke execution`);
  }

  for (const abilityId of Object.keys(ALLY_ABILITIES)) {
    const engine = new CombatEngine(
      baseStats,
      'karen',
      {},
      {
        partyIds: ['janet'],
        partyOverrides: {
          janet: {
            maxHP: 220,
            maxMP: 999,
            hp: 120,
            mp: 999,
            unlockedAbilities: [abilityId],
          },
        },
      },
    );
    engine.player.hp = 50;
    engine.player.mp = 20;
    const result = engine.allyTurn(1);
    assert(!!result, `ally ability ${abilityId} failed combat smoke execution`);
  }

  for (const abilityId of Object.keys(ENEMY_ABILITIES)) {
    const engine = new CombatEngine({ ...baseStats, hp: 999, maxHP: 999 }, 'karen');
    const enemy = engine.enemy;
    const result = engine._executeEnemyAbility(
      enemy,
      abilityId,
      engine._getEffective(enemy),
      engine._getEffective(engine.player),
      'speak_to_manager',
      engine.player,
    );
    assert(!!result, `enemy ability ${abilityId} failed combat smoke execution`);
  }
}

// Dialog portraits: an asset on disk must be reachable from a speaker string
// that the dialog data actually emits.
//
// This exists because Alex from IT shipped four portraits that never once
// rendered. `PORTRAIT_KEYS` in DialogBox.js was keyed `'Alex'`; all 211 of his
// lines say `'Alex from IT'`. Nothing failed, nothing warned — the portrait row
// simply stayed hidden for the whole campaign. The two halves of the bug are
// both checked here: a stem with no reachable key at all (hard failure, that is
// art paid for and not shipping), and a key no dialog can ever match (reported,
// because aliases like 'Alex (Unhinged)' are deliberate).
//
// PORTRAIT_KEYS is read out of the source rather than imported: DialogBox.js
// pulls in AudioManager and touches the DOM at module scope, so it cannot load
// under node. If the block ever stops parsing, that is itself a failure — a
// silently-skipped validator is how the original bug survived.
function validatePortraits() {
  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, '../src/ui/DialogBox.js'), 'utf8');
  const block = src.match(/const PORTRAIT_KEYS = \{([\s\S]*?)\n\};/);
  if (!block) { fail('validate-data could not parse PORTRAIT_KEYS out of src/ui/DialogBox.js'); return; }
  const keys = new Map(); // speaker -> stem
  for (const m of block[1].matchAll(/^\s*(?:'([^']+)'|"([^"]+)")\s*:\s*'([^']+)'\s*,/gm)) {
    keys.set(m[1] ?? m[2], m[3]);
  }
  assert(keys.size > 0, 'PORTRAIT_KEYS parsed to zero rows — the regex and the file have drifted apart');

  const speakers = new Set();
  for (const nodes of Object.values(DIALOGS)) {
    if (!Array.isArray(nodes)) continue;
    for (const node of nodes) if (node && typeof node.speaker === 'string') speakers.add(node.speaker);
  }

  // stems that a live speaker can actually reach
  const reachable = new Set();
  for (const [speaker, stem] of keys) if (speakers.has(speaker)) reachable.add(stem);

  const stems = new Set(
    readdirSync(join(here, '../src/assets/portraits'))
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.replace(/\.png$/, '').replace(/_(angry|smug|worried)$/, '')),
  );
  for (const stem of stems) {
    assert(reachable.has(stem),
      `portrait ${stem}.png exists but no PORTRAIT_KEYS row maps a live dialog speaker to it — the art will never render`);
  }
  for (const [speaker, stem] of keys) {
    if (!speakers.has(speaker) && !stems.has(stem)) {
      fail(`PORTRAIT_KEYS row '${speaker}' -> '${stem}' is dead both ways: no dialog emits that speaker and no ${stem}.png exists`);
    }
  }
}

function validateSaveSmoke() {
  const player = new Player();
  player.deserialize({
    stats: { level: 2, aum: 1234 },
    flags: { checked_desk: true },
  });
  assert(player.stats.level === 2, 'partial save smoke did not apply stats');
  assert(player.stats.aum === 1234, 'partial save smoke did not preserve AUM');
  assert(player.inventory.length > 0, 'partial save smoke did not default inventory');
  assert(player.currentRoom === 'parking_garage', 'partial save smoke did not default current room');
  assert(player.getFlag('checked_desk') === true, 'partial save smoke did not apply flags');
}

validateDialogs();
validateRewardReachability();
validateDataReferences();
validateShopAndBalance();
validateCosmetics();
validateVoices();
validateThoughts();
validatePortraits();
validateCombatSmoke();
validateSaveSmoke();

if (issues.length > 0) {
  console.error(`Validation failed with ${issues.length} issue${issues.length === 1 ? '' : 's'}:`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('Validation passed: dialogs, data references, and combat smoke checks are clean.');
