// THROWAWAY repro/verify instrument for the UX fix lane (g-run, lane UX).
//
// D1/D2 — the F2 Quest-Skip presets. Applies each preset through the SHIPPING
// path (`Object.assign(player.flags, preset.flags)` → `_syncActFromFlags()` →
// `_refreshStoryProgress(true)`, exactly what DevPanel does), then reads the
// derived act, the HUD objective, and every room's VISIBLE NPC set for
// duplicate ids on the same tile.
//
// Usage: node tools/_ux-dev.mjs [--tag=after|round4|…] [--port=5173]
// HEADED per HANDOFF_PACKAGE §4.7.
//
// BASELINE PROTECTION. `--tag` used to default to `before`, so every bare
// `node tools/_ux-dev.mjs` — which is how the gate is invoked — rewrote
// `dev-before.json`, the file NAMED as the D1/D2 pre-fix baseline. Measured:
// dev-before.json was two days NEWER than dev-after.json, i.e. the "before"
// artifact was a post-fix run and the real baseline was gone. The baseline now
// has its own write-once name (`dev-D1D2-BASELINE.json`) and the default tag is
// a neutral `run`. Re-capturing the baseline on purpose takes --force-baseline.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'fs';

const tag = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'run';
const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/g-run/ux';
mkdirSync(OUT, { recursive: true });

const BASELINE = `${OUT}/dev-D1D2-BASELINE.json`;
let outFile = `${OUT}/dev-${tag}.json`;
let baselineNote = null;
if (tag === 'before' || tag === 'baseline') {
  if (existsSync(BASELINE) && !process.argv.includes('--force-baseline')) {
    outFile = `${OUT}/dev-baseline-rerun-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    baselineNote = `${BASELINE} already exists and was NOT overwritten (pass --force-baseline to replace it)`;
  } else {
    outFile = BASELINE;
  }
}

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const log = [];
const say = (s) => { log.push(s); console.log(s); };

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=cubicle_farm`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(800);

  const rows = await page.evaluate(async () => {
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const { DEV_PRESETS } = await import('/src/ui/DevPanel.js');
    const ex = window.__explore;
    const out = [];
    // The seven story presets stop at Act 7, so `algorithm_defeated` is never
    // set and the penthouse_bar set is never measured. The producer asked what
    // the census reports for it, so it gets an eighth synthetic state -- the
    // real post-game one, act7 plus the win plus the renovation that builds the
    // wing at all.
    const act7 = DEV_PRESETS.find(p => p.key === 'act7');
    const STATES = [...DEV_PRESETS, {
      key: 'post',
      label: 'POST-GAME (synthetic: act7 + algorithm_defeated + renovation_penthouse)',
      flags: { ...act7.flags, algorithm_defeated: true, renovation_penthouse: true },
    }];
    for (const p of STATES) {
      ex.player.flags = {};
      Object.assign(ex.player.flags, p.flags);
      ex._syncActFromFlags();
      ex._refreshStoryProgress(true);
      const f = ex.player.flags;                 // AFTER derivation
      const match = (c) => {
        if (!c) return true;
        if (c.flag && !f[c.flag]) return false;
        if (c.notFlag && f[c.notFlag]) return false;
        return true;
      };
      const dupes = [];
      // CROSS-ROOM pass (round 2). The within-room count above catches the
      // head-inside-a-head case; it says nothing about the SAME id being
      // simultaneously placeable in two DIFFERENT rooms under one flag state,
      // which is how the Intern came to be seated at his desk on floor 6 while
      // also rehearsing at the head of the conference table one door away.
      const byIdGlobal = {};
      for (const [rid, room] of Object.entries(ROOMS)) {
        const byId = {};
        for (const n of (room.npcs || [])) {
          if (!match(n.condition)) continue;
          (byId[n.id] ||= []).push(n);
          (byIdGlobal[n.id] ||= new Set()).add(rid);
        }
        for (const [id, list] of Object.entries(byId)) {
          if (list.length > 1) dupes.push(`${rid}:${id} x${list.length}`);
        }
      }
      const cross = Object.entries(byIdGlobal)
        .filter(([, set]) => set.size > 1)
        .map(([id, set]) => ({ id, rooms: [...set].sort() }))
        .sort((a, b) => a.id.localeCompare(b.id));
      out.push({
        key: p.key, label: p.label,
        rooms: Object.keys(ROOMS).length,
        act: ex.player.actIndex,
        objective: String(ex._getStoryObjective() || '').replace(/<br>/g, ' | ').replace(/<[^>]+>/g, ''),
        dupes, cross,
      });
    }
    return out;
  });

  // The penthouse wing is the ACCEPTED CONVENTION and is reported separately,
  // not counted as a defect. Six allies are seated in `penthouse_bar` from
  // `algorithm_defeated` on, and every one of them also stands in the room they
  // work in: the game has never simulated one body per character, the wing is a
  // post-game hangout behind a 10,000,000 AUM renovation, and the player can
  // only ever be in one room. What is NOT convention is two live placements of
  // the same id in two rooms whose act-scoped dialog describes the same moment
  // differently -- that is the class the Intern was in.
  const CONVENTION_ROOMS = new Set(['penthouse_bar']);
  // `_resolveRoomId` swaps one canonical id for a larger variant on a
  // renovation flag, so a pair like [penthouse + penthouse_expanded] is ONE
  // room with two layouts and exactly one of them is ever loaded. Counting
  // those as "two rooms at once" is the census lying, not the data.
  const VARIANTS = [
    ['skip_office', 'skip_office_large'],
    ['penthouse', 'penthouse_expanded'],
  ];
  const collapse = (rooms) => {
    let r = [...rooms];
    for (const [a, b] of VARIANTS) if (r.includes(a) && r.includes(b)) r = r.filter(x => x !== b);
    return r;
  };
  // KNOWN, pre-existing, and NOT introduced by this lane. Each is reported by
  // name every run; none is silently swallowed. Adding a row here is a
  // producer decision, not a way to make a number go green.
  const KNOWN = {
    'janitor|archive+parking_garage':
      'the garage patrol entry is unconditional and has been since ship; he sweeps the garage from Act 1 and the Archive scenes start at Act 3',
    'janitor|archive+parking_garage+records_hall':
      'as above, plus the records-hall placement',
    'grandma|conference_room+reception':
      'reachable only in a preset: `chad_defeated && !skip_post_chad` is a window that closes BEFORE act2_complete opens the conference-room entry, and no real ordering holds both',
    'grandma|break_room+reception':
      'same preset artefact as above, one act later',
  };
  const key = (c) => `${c.id}|${collapse(c.rooms).join('+')}`;
  const isConvention = (c) => {
    const r = collapse(c.rooms);
    if (r.length <= 1) return true;                                  // room variants
    if (r.filter(x => !CONVENTION_ROOMS.has(x)).length <= 1) return true;  // the bar
    return Object.hasOwn(KNOWN, key(c));
  };

  let totalDupes = 0, totalCross = 0, totalConv = 0;
  for (const r of rows) {
    totalDupes += r.dupes.length;
    const real = r.cross.filter(c => !isConvention(c));
    const conv = r.cross.filter(c => isConvention(c) && collapse(c.rooms).length > 1);
    totalCross += real.length; totalConv += conv.length;
    say(`${r.key.padEnd(5)} act=${r.act}  ${r.label}`);
    say(`      objective : ${r.objective}`);
    say(`      dupe NPCs : ${r.dupes.length ? r.dupes.join(', ') : 'none'}`);
    say(`      cross-room: ${real.length ? real.map(c => `${c.id} in [${c.rooms.join(' + ')}]`).join('; ') : 'none'}`);
    for (const c of conv) {
      say(`      accepted  : ${c.id} [${collapse(c.rooms).join(' + ')}] — ${KNOWN[key(c)] || 'penthouse_bar off-shift convention'}`);
    }
  }
  const act1 = rows.find(r => r.key === 'act1');
  say(`\nD1: preset labelled "${act1.label}" derives act=${act1.act}  ${act1.act === 1 ? 'PASS' : 'FAIL (label says Act 1)'}`);
  say(`D2: total duplicate-NPC spawns across all presets = ${totalDupes}  ${totalDupes === 0 ? 'PASS' : 'FAIL'}`);
  say(`D3: cross-room simultaneous placements, unaccepted = ${totalCross}  ${totalCross === 0 ? 'PASS' : 'FAIL'}`);
  say(`     accepted pairs reported by name and NOT counted = ${totalConv} (room variants collapsed first)`);
  say(`     coverage: ${rows.length} presets x ${rows[0]?.rooms ?? 0} rooms`);

  if (baselineNote) say(`\nNOTE: ${baselineNote}`);
  writeFileSync(outFile, JSON.stringify({ tag, rows, totalDupes, totalCross, totalConv, log }, null, 2));
  say(`\nwrote ${outFile}`);
  if (act1.act !== 1 || totalDupes !== 0 || totalCross !== 0) process.exitCode = 1;
} finally {
  await browser.close();
}
