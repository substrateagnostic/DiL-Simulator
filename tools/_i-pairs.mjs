// Build the BEFORE/AFTER contact sheets for the notification judge (run I).
//
// Node has no image decoder here, so compositing runs in Chromium's canvas —
// the same pattern as tools/_g-crop.mjs. Each row is BEFORE (audit, from
// screenshots/i-run-before) beside AFTER (this build, screenshots/i-run-after)
// at identical scale, with the offender number and the measurement.
//
// Usage: node tools/_i-pairs.mjs

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const B = 'screenshots/i-run-before';
const A = 'screenshots/i-run-after';
const OUT = 'screenshots/i-run-after';

const ROWS = [
  ['1', 'Achievement toasts stack on one anchor',
   'achbomb-kill+2000ms.png', 'burst-04-deferred-returns.png',
   '9 toasts, 36 mutual pairs at 100 %, 8 never readable',
   '1 card, Achievement x9, names 3 + points at the Log'],
  ['2', 'Game saved. over the writing',
   'postfight-auto6-x8.png', 'burst-03-dialog-claims-voice.png',
   'autosave + achievement co-visible with the scene 6151 ms',
   'scene alone; both evicted to the queue, both return after'],
  ['3', 'Three pieces of prose at once',
   'prose-w5.png', 'prose-w5.png',
   'dialog + inner monologue + policy toast, 4257 ms three-way',
   'dialog only; monologue and PIP notice queued behind it'],
  ['4', 'Two combat plates printed through each other',
   'prose-auto6-x4.png', 'burst-02-victory-burst.png',
   '100 % overlap, 5 of 6 runs, opaque plate erases the first',
   'one plate, one taunt, one telegraph, zero overlap'],
  ['5', 'Toast column covers the quest tracker',
   'smoke-t1.png', 'smoke-t1.png',
   'top:120 vs a tracker ending at y=201 — 75-93 %, every run',
   'rail placed off the tracker MEASURED bottom edge'],
  ['8', 'Double taunt double-exposure',
   'defeat-after02400.png', 'verify-a-taunts.png',
   'both at bottom:220 left:60, 85 % opaque, 100 % for 2246 ms',
   'one per side; the two sides stay independent'],
];

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const rows = [];
  for (const [n, title, bf, af, bcap, acap] of ROWS) {
    const bp = join(B, bf), ap = join(A, af);
    if (!existsSync(bp)) { console.log(`skip ${n}: missing before ${bp}`); continue; }
    if (!existsSync(ap)) { console.log(`skip ${n}: missing after ${ap}`); continue; }
    rows.push({ n, title, bcap, acap,
      b: 'data:image/png;base64,' + readFileSync(bp).toString('base64'),
      a: 'data:image/png;base64,' + readFileSync(ap).toString('base64') });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  await page.setContent(`<html><body style="margin:0;background:#0b0d12;font-family:ui-monospace,Menlo,monospace">
    <div style="padding:22px 26px">
      <div style="color:#e94560;font-size:22px;letter-spacing:2px;margin-bottom:4px">NOTIFICATION ARBITER — BEFORE / AFTER</div>
      <div style="color:#7a8494;font-size:13px;margin-bottom:18px">left: audit build (screenshots/i-run-before) &nbsp;·&nbsp; right: this build &nbsp;·&nbsp; both headed Chromium, same fixtures</div>
      ${rows.map(r => `
        <div style="margin-bottom:22px">
          <div style="color:#ffd700;font-size:15px;margin-bottom:6px">OFFENDER ${r.n} — ${r.title}</div>
          <div style="display:flex;gap:14px">
            <div style="flex:1">
              <img src="${r.b}" style="width:100%;display:block;border:1px solid #33384a">
              <div style="color:#ff8a8a;font-size:12px;margin-top:5px">BEFORE — ${r.bcap}</div>
            </div>
            <div style="flex:1">
              <img src="${r.a}" style="width:100%;display:block;border:1px solid #33384a">
              <div style="color:#8ef0a8;font-size:12px;margin-top:5px">AFTER — ${r.acap}</div>
            </div>
          </div>
        </div>`).join('')}
    </div></body></html>`);
  await page.waitForTimeout(900);
  const f = join(OUT, 'PAIRS-before-after.png');
  await page.screenshot({ path: f, fullPage: true });
  await browser.close();
  console.log(`wrote ${f}  (${rows.length} rows)`);
};

run().catch(e => { console.error(e); process.exit(1); });
