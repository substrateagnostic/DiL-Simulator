import { chromium } from 'playwright';

const arg = (name, fallback) => {
  const hit = process.argv.find(value => value.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
};

const PORT = arg('port', '5173');
const SEED = 0x5eedc0de;
const RANDOM_STATES = 200;
const ROOMS = ['board_room', 'cubicle_farm'];

function valueText(value, present = true) {
  return present ? JSON.stringify(value) : '<missing>';
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&hud=0`, {
    waitUntil: 'domcontentloaded',
  });

  const result = await page.evaluate(async ({ randomStates, rooms, seed }) => {
    const [stateModule, devModule, graphModule, predicateModule] = await Promise.all([
      import('/src/states/ExplorationState.js'),
      import('/src/ui/DevPanel.js'),
      import('/src/data/story/graph.js'),
      import('/src/data/story/predicates.js'),
    ]);
    const { ExplorationState } = stateModule;
    const { DEV_PRESETS } = devModule;
    const { ACTS, ALL_RENOVATION_FLAGS, DERIVE } = graphModule;
    const { PREDICATES } = predicateModule;

    const readFlags = new Set();
    const collect = expr => {
      if (typeof expr === 'string') {
        readFlags.add(expr);
        return;
      }
      if (!Array.isArray(expr)) return;
      const [op, ...args] = expr;
      if (op === 'not' || op === 'all' || op === 'any') {
        args.forEach(collect);
      } else if (op === 'set' && args[0] === 'RENOVATION_FLAGS') {
        ALL_RENOVATION_FLAGS.forEach(flag => readFlags.add(flag));
      } else if (op === 'pred') {
        const predicate = PREDICATES[args[0]];
        predicate?.reads?.forEach(flag => readFlags.add(flag));
      }
    };
    DERIVE.forEach(rule => {
      collect(rule.when);
      collect(rule.deferWhile);
      // Randomize existing derived values too, proving latch and live modes.
      readFlags.add(rule.id);
    });
    ACTS.forEach(act => collect(act.when));
    const flagIds = [...readFlags].sort();

    const act7 = DEV_PRESETS.find(preset => preset.key === 'act7');
    const inputs = DEV_PRESETS.map(preset => ({
      key: `preset:${preset.key}`,
      label: preset.label,
      flags: { ...preset.flags },
    }));
    inputs.push({
      key: 'preset:post-game',
      label: 'POST-GAME (synthetic: act7 + algorithm_defeated + renovation_penthouse)',
      flags: {
        ...act7.flags,
        algorithm_defeated: true,
        renovation_penthouse: true,
      },
    });

    let random = seed >>> 0;
    const nextRandom = () => {
      random = (random + 0x6d2b79f5) >>> 0;
      let value = random;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    for (let index = 0; index < randomStates; index++) {
      inputs.push({
        key: `random:${String(index).padStart(3, '0')}`,
        label: `seed=${seed} draw=${index}`,
        flags: Object.fromEntries(flagIds.map(flag => [flag, nextRandom() < 0.5])),
      });
    }

    const makeSubject = (flags, room) => {
      const player = {
        flags: { ...flags },
        currentRoom: room,
        actIndex: 0,
        questStates: {},
        getFlag(id) { return this.flags[id] || false; },
        setFlag(id, value = true) { this.flags[id] = value; },
      };
      const subject = Object.create(ExplorationState.prototype);
      subject.player = player;
      subject._boardCloseDeferred = false;
      subject.currentQuestId = null;
      subject._getStoryObjective = () => 'graph-diff';
      subject._setQuest = function setQuest(_objective, { questId }) {
        this.currentQuestId = questId;
        this.player.questStates.currentQuestId = questId;
      };
      return subject;
    };

    const runPath = (flags, room, legacy) => {
      window.__graphOff = legacy;
      const subject = makeSubject(flags, room);
      const passes = [];
      for (let pass = 1; pass <= 2; pass++) {
        subject._refreshStoryProgress(true);
        passes.push({
          flags: { ...subject.player.flags },
          actIndex: subject.player.actIndex,
          questId: subject.currentQuestId,
          boardCloseDeferred: Boolean(subject._boardCloseDeferred),
        });
      }
      return passes;
    };

    const rows = [];
    const mismatches = [];
    for (const input of inputs) {
      for (const room of rooms) {
        const legacy = runPath(input.flags, room, true);
        const graph = runPath(input.flags, room, false);
        const before = mismatches.length;
        for (let pass = 0; pass < 2; pass++) {
          const legacyFlags = legacy[pass].flags;
          const graphFlags = graph[pass].flags;
          const allFlags = new Set([...Object.keys(legacyFlags), ...Object.keys(graphFlags)]);
          for (const flag of [...allFlags].sort()) {
            const legacyPresent = Object.hasOwn(legacyFlags, flag);
            const graphPresent = Object.hasOwn(graphFlags, flag);
            if (legacyPresent !== graphPresent || legacyFlags[flag] !== graphFlags[flag]) {
              mismatches.push({
                state: input.key,
                room,
                pass: pass + 1,
                field: flag,
                legacy: legacyFlags[flag],
                graph: graphFlags[flag],
                legacyPresent,
                graphPresent,
                input: input.flags,
              });
            }
          }
          for (const field of ['actIndex', 'questId', 'boardCloseDeferred']) {
            if (legacy[pass][field] !== graph[pass][field]) {
              mismatches.push({
                state: input.key,
                room,
                pass: pass + 1,
                field,
                legacy: legacy[pass][field],
                graph: graph[pass][field],
                legacyPresent: true,
                graphPresent: true,
                input: input.flags,
              });
            }
          }
        }
        rows.push({
          key: input.key,
          label: input.label,
          room,
          ok: mismatches.length === before,
        });
      }
    }
    delete window.__graphOff;
    return { rows, mismatches, flagIds };
  }, { randomStates: RANDOM_STATES, rooms: ROOMS, seed: SEED });

  console.log(`story graph diff seed=${SEED} read/output-flags=${result.flagIds.length}`);
  for (const row of result.rows) {
    console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.key} room=${row.room} passes=2 — ${row.label}`);
  }
  for (const mismatch of result.mismatches) {
    console.error(
      `MISMATCH state=${mismatch.state} room=${mismatch.room} pass=${mismatch.pass}`
      + ` flag=${mismatch.field}`
      + ` legacy=${valueText(mismatch.legacy, mismatch.legacyPresent)}`
      + ` graph=${valueText(mismatch.graph, mismatch.graphPresent)}`
      + ` input=${JSON.stringify(mismatch.input)}`,
    );
  }
  for (const error of pageErrors) console.error(`PAGEERROR ${error}`);
  if (result.mismatches.length || pageErrors.length) process.exitCode = 1;
} finally {
  await browser.close();
}
