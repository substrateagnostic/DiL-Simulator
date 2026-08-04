// THROWAWAY repro/verify instrument for the UX fix lane (g-run, lane UX).
//
// S3 — "any pre-fight dialog can be re-armed by mashing; Grandma's boss fight
// re-launches after she is defeated".
//
// Boots the real game to the conference room with Grandma live, walks the
// player onto her, and mashes Enter at a bored-player rate through
// `grandma_meeting`. Counts `start-combat` EventBus fires and snapshots the
// state stack. Observation only — no game function is patched; the counter
// subscribes to the shipping EventBus.
//
// Usage: node tools/_ux-retrigger.mjs --tag=before|after
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

const stack = () => window.__explore?.stateManager.stack.map(s => s.constructor.name) || [];
const dialogs = () => (window.__explore?.stateManager.stack || [])
  .filter(s => s.constructor.name === 'DialogState')
  .map(s => `${s.dialogId}@${s.currentIndex ?? '?'}`);

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=conference_room`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(400);

  // Put the story exactly where Grandma is the live conference-room NPC.
  await page.evaluate(() => {
    const ex = window.__explore;
    Object.assign(ex.player.flags, {
      retry_karen: true, karen_retry_ready: true, karen_defeated: true, defeated_karen: true,
      skip_post_karen: true, chad_defeated: true, defeated_chad: true, skip_post_chad: true,
    });
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    ex._loadRoom('conference_room', 6, 6.5);   // stand on Grandma's tile-adjacent square
    // Instrumentation: count every start-combat the EventBus actually carries.
    window.__ux = { starts: [], combats: [] };
    import('/src/core/EventBus.js').then(({ EventBus }) => {
      EventBus.on('start-combat', (d) => window.__ux.starts.push(typeof d === 'string' ? d : d.encounter));
    });
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/s3-retrigger-${tag}-1-grandma.png` });

  say(`stack at start: ${JSON.stringify(await page.evaluate(stack))}`);

  // ── The mash: Enter at ~110 ms, a bored player's rate, until the dialog
  //    reaches its `start_combat` node — then KEEP mashing straight through
  //    the 300 ms window in which the fight has not been pushed yet.
  const tap = async () => {
    await page.keyboard.down('Enter'); await page.waitForTimeout(35); await page.keyboard.up('Enter');
    await page.waitForTimeout(75);
  };
  let fired = -1;
  for (let i = 0; i < 90; i++) {
    await tap();
    const n = await page.evaluate(() => (window.__ux?.starts || []).length);
    if (n > 0) { fired = i; break; }
  }
  say(`start_combat reached after ${fired + 1} taps`);
  for (let i = 0; i < 8; i++) await tap();   // straight through the 300 ms window
  await page.waitForTimeout(1500);

  const s1 = await page.evaluate(stack);
  const d1 = await page.evaluate(dialogs);
  const starts1 = await page.evaluate(() => (window.__ux?.starts || []).slice());
  say(`after mash: stack=${JSON.stringify(s1)}`);
  say(`            dialogs=${JSON.stringify(d1)}`);
  say(`            start-combat fires=${starts1.length} ${JSON.stringify(starts1)}`);
  await page.screenshot({ path: `${OUT}/s3-retrigger-${tag}-2-after-mash.png` });

  // Keep mashing while the fight is up, then instant-win it (dev backtick) and
  // keep mashing — the audit's observed re-launch happened on the way out.
  let ready = false;
  for (let i = 0; i < 120 && !ready; i++) {
    ready = await page.evaluate(() => !!(window.__combat && window.__combat.engine && !window.__combat.engine.isOver
      && window.__combat.phase !== 'intro'));
    if (!ready) await page.waitForTimeout(400);
  }
  say(ready ? '  combat live — instant-winning through the normal victory path'
            : '  (no live CombatState — nothing to instant-win)');
  await page.waitForTimeout(500);
  // Dev instant-win — routes through the NORMAL victory path (_handleResult),
  // so XP, flags and post-dialogs all fire exactly as on a real killing blow.
  await page.evaluate(() => window.__combat && window.__combat._devInstantWin());
  await page.waitForTimeout(4000);
  // Keep clicking after the victory. If an orphan copy of the pre-fight dialog
  // survived under the fight, the player walks it to its `start_combat` node a
  // SECOND time — with grandma_defeated already true and the reward already paid.
  for (let i = 0; i < 90; i++) {
    await tap();
    const n = await page.evaluate(() => (window.__ux?.starts || []).length);
    if (n > 1) { say(`  >>> SECOND start_combat after ${i + 1} post-victory taps`); break; }
  }
  await page.waitForTimeout(4000);

  const s2 = await page.evaluate(stack);
  const starts2 = await page.evaluate(() => (window.__ux?.starts || []).slice());
  const flags = await page.evaluate(() => window.__explore ? ({
    grandma_defeated: !!window.__explore.player.getFlag('grandma_defeated'),
    defeated_grandma: !!window.__explore.player.getFlag('defeated_grandma'),
    items: window.__explore.player.inventory.map(i => `${i.id}x${i.quantity}`),
  }) : { LOST_EXPLORE_HANDLE: true });
  say(`FINAL stack=${JSON.stringify(s2)}`);
  say(`FINAL start-combat fires=${starts2.length} ${JSON.stringify(starts2)}`);
  say(`FINAL flags=${JSON.stringify(flags)}`);
  await page.screenshot({ path: `${OUT}/s3-retrigger-${tag}-3-final.png` });

  // Tail: did a second CombatState appear after the fight was already won?
  await page.waitForTimeout(6000);
  const s3 = await page.evaluate(stack);
  const enemyNow = await page.evaluate(() => window.__combat?.actualEnemyId || null);
  const starts3 = await page.evaluate(() => (window.__ux?.starts || []).slice());
  say(`TAIL (+6s) stack=${JSON.stringify(s3)} enemyId=${enemyNow} starts=${starts3.length}`);
  await page.screenshot({ path: `${OUT}/s3-retrigger-${tag}-4-tail.png` });

  // Two independent pass criteria:
  //   1. no ORPHAN pre-fight dialog stacked under the fight (the mechanism)
  //   2. start_combat never fires twice (the consequence)
  const orphan = d1.length > 0 && s1.includes('CombatState');
  const VERDICT = (!orphan && starts3.length === 1 && !s3.includes('CombatState'))
    ? 'PASS — no orphan dialog under the fight, exactly one start-combat, no fight left on the stack'
    : `FAIL — orphanUnderFight=${orphan} (${JSON.stringify(d1)}), starts=${starts3.length}, stack=${JSON.stringify(s3)}`;
  say(`VERDICT: ${VERDICT}`);

  writeFileSync(`${OUT}/s3-${tag}.json`, JSON.stringify({
    tag, afterMash: { stack: s1, dialogs: d1, starts: starts1 },
    final: { stack: s2, starts: starts2, flags },
    tail: { stack: s3, enemyNow, starts: starts3 },
    verdict: VERDICT, log,
  }, null, 2));
  say(`\nwrote ${OUT}/s3-${tag}.json`);
} finally {
  await browser.close();
}
