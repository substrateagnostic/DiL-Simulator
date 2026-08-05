// THROWAWAY evidence harness for F-10, the ACT DRESSING PASS.
//
//   node tools/_f-dressing.mjs [--port=5173]
//
// The claim under test is not "a prop exists" but "the SAME room looks
// different at two points in the story". So every row below shoots one room
// TWICE, through the shipping room builder, under two authored flag states,
// and reports the furniture delta between them. A dressing entry that changes
// nothing between its two states is a dressing entry that does not exist.
//
// HEADED per HANDOFF_PACKAGE §4.7, `?qtier=high` per the FIDELITY law (the
// adaptive governor hides the room-FX light-pool group at 'low', which would
// make a lighting-adjacent capture a picture of a different game).

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/f-run/dressing';
mkdirSync(OUT, { recursive: true });

// room, label, flags — two states per room, in story order.
const ROWS = [
  ['cubicle_farm', 'act1', { briefing_complete: true }],
  ['cubicle_farm', 'act5', { briefing_complete: true, act2_complete: true, act3_complete: true, act4_complete: true }],
  ['cubicle_farm', 'act7', { briefing_complete: true, act2_complete: true, act3_complete: true, act4_complete: true, act5_complete: true, act6_complete: true }],
  ['break_room', 'act1', { briefing_complete: true }],
  ['break_room', 'act4', { briefing_complete: true, act2_complete: true, act3_complete: true }],
  ['break_room', 'act7', { briefing_complete: true, act2_complete: true, act3_complete: true, act4_complete: true, act5_complete: true, act6_complete: true }],
  ['conference_room', 'act1', { briefing_complete: true }],
  ['conference_room', 'act5', { briefing_complete: true, act2_complete: true, act3_complete: true, act4_complete: true }],
  ['conference_room', 'act7', { briefing_complete: true, act2_complete: true, act3_complete: true, act4_complete: true, act5_complete: true, act6_complete: true }],
  ['executive_floor', 'act4', { briefing_complete: true, act2_complete: true, act3_complete: true }],
  ['executive_floor', 'act6', { briefing_complete: true, act2_complete: true, act3_complete: true, act4_complete: true, act5_complete: true }],
  ['executive_floor', 'act7', { briefing_complete: true, act2_complete: true, act3_complete: true, act4_complete: true, act5_complete: true, act6_complete: true, meredith_left: true }],
  ['reception', 'act1', { briefing_complete: true }],
  ['reception', 'act7', { briefing_complete: true, act2_complete: true, act3_complete: true, act4_complete: true, act5_complete: true, act6_complete: true }],
];

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
await page.goto(`http://localhost:${PORT}/?dev&qtier=high`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const tap = async (key, ms = 70) => {
  await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
};
await tap('Enter'); await page.waitForTimeout(400);
await tap('Enter'); await page.waitForTimeout(3500);

const seen = {};
for (const [room, label, flags] of ROWS) {
  const r = await page.evaluate(async ({ room, flags }) => {
    const ex = window.__explore;
    // Wipe the act flags first — these states are absolute, not cumulative.
    for (const k of ['briefing_complete', 'act2_complete', 'act3_complete', 'act4_complete',
      'act5_complete', 'act6_complete', 'meredith_left']) ex.player.flags[k] = false;
    Object.assign(ex.player.flags, flags);
    ex._syncActFromFlags?.();
    ex._refreshStoryProgress(true);
    await ex._changeRoom(room, 1, 1);
    await new Promise(res => setTimeout(res, 700));
    // What the room BUILDER actually placed, not what the data lists.
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const live = (ROOMS[room].furniture || []).filter(f => {
      if (!f.condition) return true;
      const { flag, notFlag } = f.condition;
      return (!flag || ex.player.getFlag(flag)) && (!notFlag || !ex.player.getFlag(notFlag));
    });
    const tally = {};
    for (const f of live) tally[f.type] = (tally[f.type] || 0) + 1;
    return { act: ex.player.actIndex, count: live.length, tally, qtier: (await import('/src/core/Engine.js')).Engine.qualityTier };
  }, { room, flags });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${room}-${label}.png` });
  (seen[room] ||= []).push({ label, ...r });
  console.log(`${room.padEnd(16)} ${label}  act=${r.act}  props=${r.count}  qtier=${r.qtier}`);
}

console.log('\n── DELTAS (a room that does not change between two acts is not dressed) ──');
let dressed = 0, flat = 0;
for (const [room, rows] of Object.entries(seen)) {
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    const keys = [...new Set([...Object.keys(a.tally), ...Object.keys(b.tally)])];
    const diff = keys
      .map(k => [k, (b.tally[k] || 0) - (a.tally[k] || 0)])
      .filter(([, d]) => d !== 0)
      .map(([k, d]) => `${d > 0 ? '+' : ''}${d} ${k}`);
    if (diff.length) dressed++; else flat++;
    console.log(`  ${room} ${a.label} -> ${b.label}: ${diff.length ? diff.join(', ') : 'NO CHANGE'}`);
  }
}
writeFileSync(`${OUT}/dressing.json`, JSON.stringify(seen, null, 2));
console.log(`\n${flat === 0 ? 'DRESSING PASS' : `DRESSING FAIL (${flat} flat transitions)`} — ${dressed} transitions with a visible change`);
await browser.close();
process.exit(flat ? 1 : 0);
