// THROWAWAY repro/verify instrument for the UX fix lane (g-run, lane UX).
//
// S4 — the alex_it Act-2 machine. Four defects, four probes, all through the
// SHIPPING router (`ExplorationState._getDialogId`) and the SHIPPING objective
// function (`_getStoryObjective`) — nothing is reimplemented here.
//
//   S4a  the Act-2 partition reveal has no objective anywhere
//   S4b  after act2_complete the objective demands an unservable dialog
//   S4c  reading a server rack pins Alex to `alex_server_secret` and shadows
//        the story beat
//   S4d  (recorded, not fixed) the router chains rather than replaces
//
// Usage: node tools/_ux-alex.mjs --tag=before|after
// Requires `npm run dev` on :5173. HEADED per HANDOFF_PACKAGE §4.7.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const tag = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'before';
const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/g-run/ux';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const log = [];
const say = (s) => { log.push(s); console.log(s); };

// Base Act-1-complete flag set (the shipped `act1` dev preset), plus the
// Henderson-arc flags each scenario needs.
const BASE = {
  checked_desk: true, met_janet: true, met_intern: true, met_isaiah: true, met_alex_it: true,
  read_janet_intro: true, read_intern_intro: true, read_isaiah_intro: true, read_alex_it_intro: true,
  defeated_intern: true, briefing_complete: true,
};

const SCENARIOS = [
  { name: 'A. karen down, partition not yet found',
    flags: { ...BASE, retry_karen: true, karen_retry_ready: true, karen_defeated: true, defeated_karen: true } },
  { name: 'B. same + read a server rack first (server_secret_started)',
    flags: { ...BASE, retry_karen: true, karen_retry_ready: true, karen_defeated: true, defeated_karen: true,
             server_secret_started: true } },
  { name: 'C. act2_complete, partition NEVER found (the producer state)',
    flags: { ...BASE, branch_chosen: true, retry_karen: true, karen_retry_ready: true, karen_defeated: true,
             defeated_karen: true, ross_post_karen: true, chad_defeated: true, defeated_chad: true,
             grandma_defeated: true, defeated_grandma: true, defeated_compliance: true,
             defeated_regional: true, defeated_ross_boss: true, act2_complete: true } },
  { name: 'D. act2_complete + partition found (normal path)',
    flags: { ...BASE, branch_chosen: true, retry_karen: true, karen_retry_ready: true, karen_defeated: true,
             defeated_karen: true, ross_post_karen: true, chad_defeated: true, defeated_chad: true,
             grandma_defeated: true, defeated_grandma: true, defeated_compliance: true,
             defeated_regional: true, defeated_ross_boss: true, act2_complete: true,
             knows_server_secret: true } },
];

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=server_room`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(800);

  const results = [];
  for (const sc of SCENARIOS) {
    const r = await page.evaluate(async (s) => {
      const { ROOMS } = await import('/src/data/rooms/index.js');
      const ex = window.__explore;
      ex.player.flags = {};
      Object.assign(ex.player.flags, s.flags);
      ex._syncActFromFlags();
      ex._refreshStoryProgress(true);
      ex._loadRoom('server_room');

      // Pick the alex_it room entry whose condition matches the current flags —
      // this is the entry EntityManager would have visible, and its hardcoded
      // `dialogId` is the one `_getDialogId` sees.
      const f = ex.player.flags;
      const entry = (ROOMS.server_room.npcs || []).find(n => {
        if (n.id !== 'alex_it') return false;
        const c = n.condition;
        if (!c) return true;
        if (c.flag && !f[c.flag]) return false;
        if (c.notFlag && f[c.notFlag]) return false;
        return true;
      });
      const npc = { id: 'alex_it', dialogId: entry?.dialogId };
      const served = ex._getNpcDialogId(npc);

      // The router CHAINS: it sets `alex_story_chosen`, whose flag-set listener
      // stashes the real story dialog in `_pendingDialog`. Follow it.
      let chained = null;
      if (served === 'alex_it_router') {
        ex._pendingDialog = null;
        ex.player.setFlag('alex_story_chosen', true);
        chained = ex._pendingDialog;
        ex._pendingDialog = null;
        ex.player.setFlag('alex_story_chosen', false);
      }
      return {
        name: s.name,
        act: ex.player.actIndex,
        objective: String(ex._getStoryObjective() || ''),
        alexRoomDialogId: entry ? (entry.dialogId || '(none)') : 'NO MATCHING ENTRY',
        served,
        chained,
      };
    }, sc);
    results.push(r);
    say(`\n${r.name}`);
    say(`   act=${r.act}`);
    say(`   objective : ${r.objective.replace(/<br>/g, ' | ').replace(/<[^>]+>/g, '')}`);
    say(`   alex room dialogId : ${r.alexRoomDialogId}`);
    say(`   router serves      : ${r.served}${r.chained ? `  -> chains to '${r.chained}'` : ''}`);
  }

  // Scenario C is the seed: does the objective now name something the router
  // will actually serve, and does the served dialog set knows_server_secret?
  const C = results[2];
  const chainOK = await page.evaluate(async (served) => {
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const nodes = DIALOGS[served] || [];
    // walk from 0 following next/ifTrue/ifFalse and collect set_flag targets
    const seen = new Set(); const stack = [0]; const flags = [];
    while (stack.length) {
      const i = stack.pop();
      if (seen.has(i) || !nodes[i]) continue;
      seen.add(i);
      const n = nodes[i];
      if (n.type === 'action' && n.action === 'set_flag') flags.push(n.flag);
      if (n.type === 'end') continue;
      if (n.type === 'choice') { for (const c of (n.choices || [])) stack.push(c.next !== undefined ? c.next : i + 1); continue; }
      if (n.type === 'condition') { stack.push(n.ifTrue !== undefined ? n.ifTrue : i + 1); stack.push(n.ifFalse !== undefined ? n.ifFalse : i + 1); continue; }
      stack.push(n.next !== undefined ? n.next : i + 1);
    }
    return { served, flags };
  }, C.chained || C.served);
  say(`\nScenario C served '${chainOK.served}', which can set: ${JSON.stringify(chainOK.flags)}`);
  const canSet = chainOK.flags.includes('knows_server_secret');
  say(`  -> can that dialog set knows_server_secret? ${canSet}`);

  const A = results[0], B = results[1];
  const verdict = [];
  verdict.push(A.objective.includes('Alex')
    ? 'S4a PASS — the Act-2 band objective names Alex'
    : 'S4a FAIL — the Act-2 partition reveal is unsignposted');
  verdict.push(canSet
    ? 'S4b PASS — the post-act2 objective points at a dialog that can clear it'
    : 'S4b FAIL — objective demands a state no reachable dialog can set');
  say(`  (scenario B alex room entry = '${B.alexRoomDialogId}', router serves '${B.served}'`
    + `${B.chained ? ` -> '${B.chained}'` : ''})`);
  verdict.push(B.served !== 'alex_server_secret'
    ? `S4c PASS — a read server rack no longer shadows the story beat (serves ${B.served}${B.chained ? ` -> ${B.chained}` : ''})`
    : 'S4c FAIL — alex_server_secret shadows the Act-2 story beat');
  verdict.forEach(v => say(v));

  writeFileSync(`${OUT}/s4-${tag}.json`, JSON.stringify({ tag, results, chainOK, verdict, log }, null, 2));
  say(`\nwrote ${OUT}/s4-${tag}.json`);
  await page.screenshot({ path: `${OUT}/s4-alex-${tag}.png` });
} finally {
  await browser.close();
}
