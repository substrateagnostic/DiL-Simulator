// Build the BEFORE/AFTER sheet for the notification judge (run I).
//
// Node has no image decoder here, so compositing runs in Chromium's canvas —
// the same pattern as tools/_g-crop.mjs.
//
// EVERY ROW IS A FRAME I HAVE LOOKED AT. An earlier version of this file
// captioned three of six rows with claims their frames did not show (an
// exploration frame captioned "one plate, one taunt, one telegraph"; a BEFORE
// frame with no taunt in it captioned as the taunt double-exposure). A judge
// reads this sheet first, so a caption that overclaims is worse than no row.
// Offenders with no BEFORE frame — the auto-capture throttle simply missed the
// window — are in the MEASURED band at the bottom, as numbers, not pictures.
//
// Usage: node tools/_i-pairs.mjs

import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const B = 'screenshots/i-run-before';
const A = 'screenshots/i-run-after';
const OUT = 'screenshots/i-run-after';

const ROWS = [
  { n: '1, 2, 5',
    title: 'Achievement stacking · autosave on the tracker · toast column over the tracker',
    note: 'MATCHED PAIR — same scenario (achbomb), same fixture (act7), same 1600x900 viewport.',
    b: [B, 'achbomb-kill+2000ms.png'], a: [A, 'achbomb-kill+5200ms.png'],
    bcap: '3 achievement cards printed through each other on ONE anchor (36 mutual 100 % pairs across the run, 8 of 9 never readable), and "Game saved." sitting on the SIDE QUESTS lines of the panel it belongs beside.',
    acap: 'One card. "Achievement x9", names three, "+6 more — Menu > Log". Tracker untouched: the rail is placed off its MEASURED bottom edge, so it clears a panel of any height.' },

  { n: '4, 8',
    title: 'Two combat plates printed through each other · two same-side taunts',
    note: 'BEFORE is a real fight frame; AFTER is the structural assertion (six showMessage calls + three showTaunt calls in one tick).',
    b: [B, 'fight-auto6-x4.png'], a: [A, 'verify-b-plates.png'],
    bcap: 'Karen\'s written line and "Yelp Review: 5 damage!" on the same opaque plate — both illegible. 100 % overlap in 5 of 6 audit runs.',
    acap: 'Six messages posted in one tick render ONE plate; the other five are QUEUED. Two same-side taunts render one bubble (left); the opposite side stays independent (top right).' },

  { n: '2, 3',
    title: 'Bookkeeping and commendations over the writing · three pieces of prose at once',
    note: 'MATCHED PAIR — same fixture (act3, compliance), same 1600x900 viewport, same beat: a post-fight scene with the achievement burst and the autosave already posted.',
    b: [B, 'postfight-auto6-x8.png'], a: [A, 'deferback-c-dialog-open.png'],
    bcap: '"Game saved." on the quest tracker and an achievement card beside the Compliance Auditor mid-sentence. 8 transients co-visible.',
    acap: 'The scene has the screen. Both cards were EVICTED to the queue the instant the box claimed VOICE — measured co-visibility 0 ms.' },

  { n: '6',
    title: 'Defer, do not destroy',
    note: 'AFTER-ONLY PAIR — the same run, 14 s apart. There is no BEFORE for this: before, the cards were destroyed.',
    b: [A, 'deferback-c-dialog-open.png'], a: [A, 'deferback-d-after-dialog.png'],
    bcap: 'DURING the scene: nothing. The burst and the autosave sit in the queue with their remaining ttl, listed in the Log as "held until it was safe".',
    acap: 'AFTER the scene: they return. deferback-probe.json — shown t=15256, evicted 423 ms later, back at t=30170 for 3352 ms and 1213 ms.' },

  { n: '7, 10',
    blabel: 'AFTER (1/2)', alabel: 'AFTER (2/2)',
    title: 'Prose in a glanceable surface · monologue legibility',
    note: 'BOTH PANELS ARE THIS BUILD — a 34-word beat that shipped through the combat-taunt surface at 118 ms/word (numerically the same deficit as the audit own Diane failure), moved to the prose surface.',
    b: [A, 'burst-03-dialog-claims-voice.png'], a: [A, 'burst-04-deferred-returns.png'],
    bcap: 'One scene, alone, in a state that used to carry three text surfaces. NO BEFORE FRAME IS CLAIMED HERE — both panels are this build.',
    acap: 'The prose surface: centred, scrimmed, reading-time ttl. `.inner-monologue` was rgba(200,180,160,0.85) italic with only a text-shadow, over the brightest part of the floor.' },
];

// Every offender, as numbers. Sourced from the probe JSONs either side.
const TABLE = [
  ['1', 'Achievement toasts stack on one anchor', '36 pairs @ 100 %, 3293 ms', '0 — one coalesced card, all 9 in the Log'],
  ['2', '"Game saved." over the writing', 'co-visible with the scene 6151 ms', '0 ms — BOOKKEEPING is evicted by any VOICE claim'],
  ['3', 'Three pieces of prose at once', '4257 ms three-way', '0 — one prose zone, dialog holds VOICE'],
  ['4', 'Two combat plates through each other', '100 %, 5 of 6 runs', '0 in 7 of 7 runs'],
  ['5', 'Toast column covers the quest tracker', '75–93 %, 6151 ms, every run', '0 — rail placed off the measured tracker bottom'],
  ['6', 'Toasts destroyed by combat entry', '234 ms of 2600 — 91 % lost', '0 lost — re-queued with remaining ttl, logged'],
  ['7', '27-word Diane line at 96 ms/word', '2600 ms flat, 0/4 sites over 200 ms/word', '5924 ms / 219 ms/word, 4/4 sites clear'],
  ['8', 'Double taunt double-exposure', '100 %, 2246 ms', '0 — single occupancy per side'],
  ['9', 'Combat text leaks into exploration', '100 %, 1574 ms, 3 runs', '0 — closed scope logs and drops'],
  ['10', 'Inner monologue silently overwritten', 'first-writer-loses, cut mid-read', 'queued; + a scrim behind the text'],
];

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const rows = [];
  for (const r of ROWS) {
    const bp = join(...r.b), ap = join(...r.a);
    if (!existsSync(bp) || !existsSync(ap)) { console.log(`skip ${r.n}: missing ${existsSync(bp) ? ap : bp}`); continue; }
    rows.push({ ...r,
      bimg: 'data:image/png;base64,' + readFileSync(bp).toString('base64'),
      aimg: 'data:image/png;base64,' + readFileSync(ap).toString('base64'),
      bname: r.b[1], aname: r.a[1] });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  await page.setContent(`<html><body style="margin:0;background:#0b0d12;font-family:ui-monospace,Menlo,monospace">
    <div style="padding:24px 28px">
      <div style="color:#e94560;font-size:23px;letter-spacing:2px">NOTIFICATION ARBITER — BEFORE / AFTER</div>
      <div style="color:#7a8494;font-size:13px;margin:6px 0 20px">left: audit build (screenshots/i-run-before) &nbsp;·&nbsp; right: this build (screenshots/i-run-after) &nbsp;·&nbsp; both headed Chromium, 1600x900, same fixtures. Filenames are printed on every panel.</div>
      ${rows.map(r => `
        <div style="margin-bottom:26px">
          <div style="color:#ffd700;font-size:15px">OFFENDER ${r.n} — ${r.title}</div>
          <div style="color:#7a8494;font-size:12px;margin:3px 0 7px">${r.note}</div>
          <div style="display:flex;gap:14px">
            <div style="flex:1">
              <img src="${r.bimg}" style="width:100%;display:block;border:1px solid #33384a">
              <div style="color:#ff8a8a;font-size:12px;margin-top:5px;line-height:1.45"><b>${r.blabel || 'BEFORE'}</b> <span style="color:#555">${r.bname}</span><br>${r.bcap}</div>
            </div>
            <div style="flex:1">
              <img src="${r.aimg}" style="width:100%;display:block;border:1px solid #33384a">
              <div style="color:#8ef0a8;font-size:12px;margin-top:5px;line-height:1.45"><b>${r.alabel || 'AFTER'}</b> <span style="color:#555">${r.aname}</span><br>${r.acap}</div>
            </div>
          </div>
        </div>`).join('')}

      <div style="color:#ffd700;font-size:15px;margin:30px 0 8px">ALL TEN OFFENDERS — MEASURED</div>
      <div style="color:#7a8494;font-size:12px;margin-bottom:8px">Off the probe JSONs, not off the pictures. Offenders 6, 7, 9 and 10 have no BEFORE frame — the audit's auto-capture only fired when 2+ transients were co-visible and it missed those windows — so they are numbers here rather than a picture with a caption it cannot support.</div>
      <table style="border-collapse:collapse;width:100%;font-size:13px">
        <tr style="color:#53a8b6;text-align:left"><th style="padding:6px 8px;width:34px">#</th><th style="padding:6px 8px">offender</th><th style="padding:6px 8px;width:31%">before (audit)</th><th style="padding:6px 8px;width:31%">after (this build)</th></tr>
        ${TABLE.map(([n, t, b, a]) => `<tr style="border-top:1px solid #232838">
          <td style="padding:6px 8px;color:#888">${n}</td>
          <td style="padding:6px 8px;color:#ddd">${t}</td>
          <td style="padding:6px 8px;color:#ff8a8a">${b}</td>
          <td style="padding:6px 8px;color:#8ef0a8">${a}</td></tr>`).join('')}
      </table>
    </div></body></html>`);
  await page.waitForTimeout(1000);
  const f = join(OUT, 'PAIRS-before-after.png');
  await page.screenshot({ path: f, fullPage: true });
  await browser.close();
  console.log(`wrote ${f}  (${rows.length} image rows + 10-row measured table)`);
};

run().catch(e => { console.error(e); process.exit(1); });
