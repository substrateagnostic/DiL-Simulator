// FIX ROUND 2 — B2, proof that a deferred act band is no longer a dropped one.
//
// Round 1 fixed a cadence complaint ("dialogue every 2 seconds") by SKIPPING
// the act-keyed room band on the same entry that spends the first-visit latch.
// Correct about cadence, wrong about lifetime: an act band is keyed to ONE act
// index, so a room first entered DURING act 3 or act 6 and never revisited
// inside that act lost its lines for the rest of the save. Six rooms carry both
// bands.
//
// The fix leaves an IOU (`thought_<roomId>_a<act>_owed`) when a band is skipped
// and pays the oldest outstanding one on a later visit in any act. This drives
// the SHIPPING _loadRoom through the real ExplorationState and reads the real
// flags, in four legs. Leg B is the discriminant: before the fix the band
// lookup was ROOM_THOUGHTS_BY_ACT[room][actIndex] and actIndex is 7 by then, so
// the act-6 latch could never be set again and those lines were gone for the
// save. Legs:
//
//   A  first entry inside act 6      -> first-visit latch spent, band NOT fired,
//                                       IOU written
//   B  act moves on to 7, re-enter   -> the act-6 band fires and its latch spends
//   C  enter again                   -> nothing fires twice
//
// A room the player never stood in during act 3 must get NOTHING later, which is
// leg D — the reason this is an IOU and not "walk down the acts until something
// fires".
//
//   node tools/_fr2-b2-actband.mjs [--port=5173]

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/fix-round-2';
mkdirSync(OUT, { recursive: true });

const ROOM = 'conference_room';   // carries bands at act 3 and act 6, both ungated

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });

try {
  await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act6&shot=reception`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1200);

  const out = await page.evaluate(async (room) => {
    const ex = window.__explore;
    const p = ex.player;
    const read = () => ({
      act: p.actIndex,
      firstVisit: !!p.getFlag(`thought_${room}`),
      a6: !!p.getFlag(`thought_${room}_a6`),
      a6owed: !!p.getFlag(`thought_${room}_a6_owed`),
      a3: !!p.getFlag(`thought_${room}_a3`),
      a3owed: !!p.getFlag(`thought_${room}_a3_owed`),
    });
    // Start clean on this room's thought flags so the legs are honest.
    for (const k of Object.keys(p.flags)) if (k.startsWith(`thought_${room}`)) delete p.flags[k];

    const enter = async (other) => {
      ex._loadRoom(other);
      await new Promise(r => setTimeout(r, 260));
      ex._loadRoom(room);
      await new Promise(r => setTimeout(r, 400));
    };

    const legs = {};
    legs.start = read();
    await enter('reception');
    legs.A_firstEntryInAct6 = read();

    // THE STORY MOVES ON — and it has to move on the way the game moves it.
    // Writing p.actIndex directly does nothing that lasts: _loadRoom re-derives
    // the act from flags on every entry, so the first cut of this probe ran
    // three legs that were all still act 6 and reported a pass it had not
    // earned. Apply the act-7 preset's flags and re-derive.
    const { DEV_PRESETS } = await import('/src/ui/DevPanel.js');
    Object.assign(p.flags, DEV_PRESETS.find(x => x.key === 'act7').flags);
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    await enter('reception');
    legs.B_reentryInAct7 = read();

    await enter('reception');
    legs.C_thirdEntry = read();

    // LEG D — a room the player never stood in during an earlier act must not
    // be paid an IOU it never earned.
    const virgin = 'break_room';
    for (const k of Object.keys(p.flags)) if (k.startsWith(`thought_${virgin}`)) delete p.flags[k];
    ex._loadRoom('reception');
    await new Promise(r => setTimeout(r, 260));
    ex._loadRoom(virgin);
    await new Promise(r => setTimeout(r, 400));
    ex._loadRoom('reception');
    await new Promise(r => setTimeout(r, 260));
    ex._loadRoom(virgin);
    await new Promise(r => setTimeout(r, 400));
    legs.D_virginRoomInAct7 = {
      room: virgin,
      firstVisit: !!p.getFlag(`thought_${virgin}`),
      a3: !!p.getFlag(`thought_${virgin}_a3`),
      a6: !!p.getFlag(`thought_${virgin}_a6`),
      a3owed: !!p.getFlag(`thought_${virgin}_a3_owed`),
      a6owed: !!p.getFlag(`thought_${virgin}_a6_owed`),
    };
    return legs;
  }, ROOM);

  const A = out.A_firstEntryInAct6, B = out.B_reentryInAct7, C = out.C_thirdEntry, D = out.D_virginRoomInAct7;
  const checks = [
    ['A first entry spends the first-visit latch', A.firstVisit === true],
    ['A does NOT fire the act-6 band on that entry', A.a6 === false],
    ['A writes the act-6 IOU',                      A.a6owed === true],
    ['B is genuinely in act 7 now',                  B.act === 7],
    ['B pays the act-6 band after the act moved on', B.a6 === true],
    ['C fires nothing a second time',                C.a6 === true && C.a3 === false],
    ['D pays no band a virgin room never earned',    D.a3 === false && D.a6 === false && D.a3owed === false && D.a6owed === false],
  ];
  for (const [label, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  const failed = checks.filter(([, ok]) => !ok).length;
  writeFileSync(`${OUT}/b2-actband.json`, JSON.stringify({ room: ROOM, legs: out, failed }, null, 2));
  console.log(`\n${failed ? `FAIL — ${failed} check(s)` : `PASS — all ${checks.length}`}`);
  if (failed) process.exitCode = 1;
} catch (e) {
  console.error('HARNESS ERROR', e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
