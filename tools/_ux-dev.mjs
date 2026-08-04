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
    for (const p of DEV_PRESETS) {
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
      for (const [rid, room] of Object.entries(ROOMS)) {
        const byId = {};
        for (const n of (room.npcs || [])) {
          if (!match(n.condition)) continue;
          (byId[n.id] ||= []).push(n);
        }
        for (const [id, list] of Object.entries(byId)) {
          if (list.length > 1) dupes.push(`${rid}:${id} x${list.length}`);
        }
      }
      out.push({
        key: p.key, label: p.label,
        rooms: Object.keys(ROOMS).length,
        act: ex.player.actIndex,
        objective: String(ex._getStoryObjective() || '').replace(/<br>/g, ' | ').replace(/<[^>]+>/g, ''),
        dupes,
      });
    }
    return out;
  });

  let totalDupes = 0;
  for (const r of rows) {
    totalDupes += r.dupes.length;
    say(`${r.key.padEnd(5)} act=${r.act}  ${r.label}`);
    say(`      objective : ${r.objective}`);
    say(`      dupe NPCs : ${r.dupes.length ? r.dupes.join(', ') : 'none'}`);
  }
  const act1 = rows.find(r => r.key === 'act1');
  say(`\nD1: preset labelled "${act1.label}" derives act=${act1.act}  ${act1.act === 1 ? 'PASS' : 'FAIL (label says Act 1)'}`);
  say(`D2: total duplicate-NPC spawns across all presets = ${totalDupes}  ${totalDupes === 0 ? 'PASS' : 'FAIL'}`);
  say(`     coverage: ${rows.length} presets x ${rows[0]?.rooms ?? 0} rooms`);

  if (baselineNote) say(`\nNOTE: ${baselineNote}`);
  writeFileSync(outFile, JSON.stringify({ tag, rows, totalDupes, log }, null, 2));
  say(`\nwrote ${outFile}`);
  if (act1.act !== 1 || totalDupes !== 0) process.exitCode = 1;
} finally {
  await browser.close();
}
