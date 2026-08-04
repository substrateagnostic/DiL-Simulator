// TWO-JANITORS LAW — the Archive carries nine `janitor` entries sharing one id,
// each gated on a single flag/notFlag pair. Exactly one may be live at a time.
// The three states around the Rolex are the fragile ones, and the
// `|| has_rolex` clause in `rolex_available`'s derivation exists precisely so a
// LEGACY save that already holds the Rolex does not satisfy two of them.
//
// Measured by evaluating each entry's own `conditionFn` against the live flag
// object — the same predicate `EntityManager.update()` calls. Reading
// `npc.visible` instead is a trap: conditionFn is only evaluated while
// ExplorationState is the TOP state, so any dialog pushed by a flag-set
// listener freezes every conditional NPC hidden and looks exactly like "the
// Janitor is missing".
//
//   node tools/_g-archive-check.mjs --port=5177
import { chromium } from 'playwright';
const arg = (k, d) => {
  const hit = process.argv.find(a => a.startsWith(`--${k}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};
const PORT = arg('port', '5177');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const LEGS = [
  { name: 'pre-board   (act5, board not held)', set: ['act5_complete'], clear: ['board_meeting_held', 'rolex_available', 'has_rolex', 'act6_complete'] },
  { name: 'forward     (board_meeting_held)', set: ['act5_complete', 'board_meeting_held'], clear: ['rolex_available', 'has_rolex', 'act6_complete'] },
  { name: 'legacy save (has_rolex, rolex_available unset)', set: ['act5_complete', 'has_rolex'], clear: ['rolex_available'] },
];

(async () => {
  const b = await chromium.launch({ headless: false, args: ['--use-gl=angle'] });
  const p = await (await b.newContext({ viewport: { width: 900, height: 600 } })).newPage();
  await p.goto(`http://localhost:${PORT}/?dev&fixture=act6&hud=0`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });

  let faults = 0;
  for (const leg of LEGS) {
    const r = await p.evaluate(({ set, clear }) => {
      const ex = window.__explore;
      for (const f of clear) ex.player.flags[f] = false;
      for (const f of set) ex.player.flags[f] = true;
      // Everything an act-5 save necessarily already holds. Without these the
      // EARLIER Janitor entries (act3 / needs_ross / act4) are also live and
      // the harness manufactures its own duplicate.
      for (const f of ['archive_accessible', 'security_guard_info', 'read_janitor_act3',
        'act3_complete', 'ross_rallied', 'janitor_rallied']) ex.player.flags[f] = true;
      ex._syncActFromFlags();
      ex._refreshStoryProgress(true);
      ex._loadRoom('archive', 6, 8);
      ex.player.currentRoom = 'archive';
      const npcs = ex.roomManager.entityManager.npcs;
      const flags = ex.player.flags;
      const live = npcs.filter(n => !n.conditionFn || n.conditionFn(flags));
      const counts = {};
      for (const n of live) counts[n.id] = (counts[n.id] || 0) + 1;
      return {
        room: ex.roomManager.currentRoom?.data?.id,
        total: npcs.length,
        rolexAvailable: !!flags.rolex_available,
        boardClosed: !!flags.board_meeting_closed,
        liveJanitors: live.filter(n => n.id === 'janitor').map(n => n.dialogId || '(act-routed)'),
        live: live.map(n => n.id),
        dupes: Object.entries(counts).filter(([, c]) => c > 1),
      };
    }, leg);
    await sleep(250);
    const ok = r.liveJanitors.length === 1 && r.dupes.length === 0;
    if (!ok) faults++;
    console.log(`${leg.name.padEnd(48)} rolex_available=${String(r.rolexAvailable).padEnd(5)} ` +
      `liveJanitors=${r.liveJanitors.length} [${r.liveJanitors.join(' ')}] ` +
      `live=[${r.live.join(' ')}] dupes=${JSON.stringify(r.dupes)}  ${ok ? 'OK' : 'FAULT'}`);
  }
  await b.close();
  console.log(faults ? `TWO-JANITORS FAIL: ${faults}` : 'TWO-JANITORS PASS: exactly one Janitor in every state');
  if (faults) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
