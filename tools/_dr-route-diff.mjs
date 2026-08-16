// P7 routing-table differential proof. A Vite dev server must already be
// running; this tool never starts or stops it.

import { chromium } from 'playwright';

const PORT = process.argv.find(arg => arg.startsWith('--port='))?.slice(7) || '5173';
const FUZZ_CASES = Math.max(20_000, Number(process.argv.find(arg => arg.startsWith('--fuzz='))?.slice(7)) || 20_000);
const SEED = 0x0d1a109;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

function printMismatch(mismatch) {
  console.error('ROUTE MISMATCH');
  console.error(`  npc: ${mismatch.npc}${mismatch.dialogId ? ` (dialogId=${mismatch.dialogId})` : ''}`);
  console.error(`  room: ${mismatch.room}`);
  console.error(`  flags: ${JSON.stringify(mismatch.flags)}`);
  console.error(`  legacy: ${String(mismatch.legacy)}`);
  console.error(`  table: ${String(mismatch.table)}`);
  console.error(`  rule: ${mismatch.rule || '(none)'}`);
  if (mismatch.effects) console.error(`  effects: ${JSON.stringify(mismatch.effects)}`);
}

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=cubicle_farm&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true && !!window.__explore, { timeout: 45_000 });

  const result = await page.evaluate(async ({ fuzzCases, seed }) => {
    const [{ ROOMS }, { DEV_PRESETS }, { DIALOGS }, { DIALOG_ROUTES }] = await Promise.all([
      import('/src/data/rooms/index.js'),
      import('/src/ui/DevPanel.js'),
      import('/src/data/dialogs/index.js'),
      import('/src/data/story/routes.js'),
    ]);
    const ex = window.__explore;
    const roomIds = Object.keys(ROOMS);
    const byNpc = new Map();
    for (const room of Object.values(ROOMS)) {
      for (const npc of room.npcs || []) {
        const variants = byNpc.get(npc.id) || new Map();
        const key = npc.dialogId === undefined ? '<none>' : npc.dialogId;
        if (!variants.has(key)) variants.set(key, { id: npc.id, ...(npc.dialogId === undefined ? {} : { dialogId: npc.dialogId }) });
        byNpc.set(npc.id, variants);
      }
    }
    const npcIds = [...byNpc.keys()].sort();
    const npcCases = npcIds.flatMap(id => [...byNpc.get(id).values()]);
    const act7 = DEV_PRESETS.find(preset => preset.key === 'act7');
    const states = [...DEV_PRESETS, {
      key: 'post',
      flags: { ...act7.flags, algorithm_defeated: true, renovation_penthouse: true },
    }];

    const nonEmptyFlags = flags => Object.fromEntries(Object.entries(flags).filter(([, value]) => Boolean(value)));
    const mismatch = (npc, room, flags, legacy, table) => ({
      npc: npc.id, dialogId: npc.dialogId, room, flags: nonEmptyFlags(flags),
      legacy, table, rule: ex._lastDialogRouteId,
    });
    const compare = (npc, room, flags) => {
      ex.player.currentRoom = room;
      const legacy = ex._getDialogIdLegacy(npc, false);
      const table = ex._getDialogIdFromRoutes(npc, false);
      return legacy === table ? null : mismatch(npc, room, flags, legacy, table);
    };

    let presetComparisons = 0;
    for (const state of states) {
      ex.player.flags = { ...state.flags };
      ex._syncActFromFlags();
      ex._refreshStoryProgress(true);
      const flags = { ...ex.player.flags };
      for (const npc of npcCases) {
        for (const room of roomIds) {
          const failed = compare(npc, room, flags);
          if (failed) return { failed: { ...failed, phase: `preset:${state.key}` } };
          presetComparisons++;
        }
      }
    }

    const routeFlags = new Set();
    const collectExpr = expr => {
      if (typeof expr === 'string') { routeFlags.add(expr); return; }
      if (!Array.isArray(expr) || expr.length === 0) return;
      const [op, ...args] = expr;
      if (op === 'not') collectExpr(args[0]);
      else if (op === 'all' || op === 'any') args.forEach(collectExpr);
    };
    for (const route of DIALOG_ROUTES) {
      collectExpr(route.when);
      const effects = route.effect ? (Array.isArray(route.effect) ? route.effect : [route.effect]) : [];
      for (const effect of effects) collectExpr(effect.when);
    }
    for (const flag of [
      'briefing_complete', 'branch_chosen', 'act2_complete', 'act3_complete',
      'act4_complete', 'act5_complete', 'act6_complete', 'algorithm_defeated',
      'ready_for_skip', 'checked_desk', 'karen_defeated',
    ]) routeFlags.add(flag);
    for (const id of npcIds) {
      if (DIALOGS[`${id}_intro`] || ['janet', 'intern', 'isaiah', 'alex_it'].includes(id)) routeFlags.add(`read_${id}_intro`);
      for (let act = 2; act <= 7; act++) {
        if (DIALOGS[`${id}_act${act}`] || (act === 2 && (id === 'skip' || id === 'janet'))) {
          routeFlags.add(`read_${id}_act${act}`);
        }
      }
    }
    for (let act = 0; act <= 7; act++) routeFlags.add(`read_alex_it_act${act}`);
    const sweptFlags = [...routeFlags].sort();

    let randomState = seed >>> 0;
    const random = () => {
      randomState += 0x6d2b79f5;
      let value = randomState;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    for (let index = 0; index < fuzzCases; index++) {
      const flags = {};
      for (const flag of sweptFlags) if (random() < 0.5) flags[flag] = true;
      const npc = npcCases[Math.floor(random() * npcCases.length)];
      const room = roomIds[Math.floor(random() * roomIds.length)];
      ex.player.flags = flags;
      ex._syncActFromFlags();
      const failed = compare(npc, room, flags);
      if (failed) return { failed: { ...failed, phase: `fuzz:${index}`, seed } };
    }

    const commitStates = [
      {
        key: 'alex-story-chosen',
        flags: { met_alex_it: true, karen_defeated: true, alex_story_chosen: true },
        clears: ['alex_story_chosen'],
      },
      {
        key: 'alex-story-deferred',
        flags: { met_alex_it: true, karen_defeated: true, act2_complete: true, alex_story_deferred: true },
        clears: ['alex_story_deferred'],
      },
      {
        key: 'alex-side-deferred',
        flags: {
          met_alex_it: true, karen_defeated: true, act2_complete: true,
          act3_complete: true, read_alex_it_act2: true, alex_side_deferred: true,
        },
        clears: ['alex_side_deferred'],
      },
    ];
    const effectFlags = ['alex_story_chosen', 'alex_story_deferred', 'alex_side_deferred'];
    const runCommit = (method, state) => {
      ex.player.flags = { ...state.flags };
      ex.player.currentRoom = 'cubicle_farm';
      ex._syncActFromFlags();
      const answer = ex[method]({ id: 'alex_it' }, true);
      return { answer, flags: Object.fromEntries(effectFlags.map(flag => [flag, ex.player.getFlag(flag)])) };
    };
    for (const state of commitStates) {
      const legacy = runCommit('_getDialogIdLegacy', state);
      const table = runCommit('_getDialogIdFromRoutes', state);
      const writesLanded = state.clears.every(flag => !legacy.flags[flag] && !table.flags[flag]);
      if (!writesLanded || legacy.answer !== table.answer || effectFlags.some(flag => legacy.flags[flag] !== table.flags[flag])) {
        return { failed: {
          phase: `commit:${state.key}`, npc: 'alex_it', room: 'cubicle_farm',
          flags: nonEmptyFlags(state.flags), legacy: legacy.answer, table: table.answer,
          rule: ex._lastDialogRouteId, effects: { legacy: legacy.flags, table: table.flags },
        } };
      }
    }

    return {
      routes: DIALOG_ROUTES.length,
      rooms: roomIds.length,
      npcIds: npcIds.length,
      npcCases: npcCases.length,
      states: states.length,
      presetComparisons,
      sweptFlags: sweptFlags.length,
      fuzzCases,
      seed,
      commitCases: commitStates.length,
    };
  }, { fuzzCases: FUZZ_CASES, seed: SEED });

  if (result.failed) {
    console.error(`phase: ${result.failed.phase}`);
    printMismatch(result.failed);
    process.exitCode = 1;
  } else {
    console.log(`routes: ${result.routes}`);
    console.log(`preset matrix PASS: ${result.states} states x ${result.npcCases} NPC id/dialog variants x ${result.rooms} rooms = ${result.presetComparisons}`);
    console.log(`NPC ids covered: ${result.npcIds}`);
    console.log(`route flags swept: ${result.sweptFlags}`);
    console.log(`fuzz PASS: ${result.fuzzCases} seeded-random assignments (seed=${result.seed})`);
    console.log(`commit effects PASS: ${result.commitCases} targeted states, 3 one-shot flags`);
  }
} finally {
  await browser.close();
}
