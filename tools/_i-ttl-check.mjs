// Reading-time verification for the NotificationArbiter (run I build lane).
//
// The scenario probe (`_i-notify-probe.mjs`) measures durations under real play
// load, where three.js room streaming stalls the main thread and inflates every
// setTimeout — fine for collisions, useless for timing. This tool posts through
// the REAL shipping call path (`ExplorationState._showToast`, the same function
// all 61 sites call) with the main thread idle, and measures on-screen time with
// the same opacity/rect visibility test the probe uses.
//
// Strings are the audit's own worst offenders (§4), all of which shipped at a
// flat 2600 ms regardless of length.
//
// Usage: node tools/_i-ttl-check.mjs      (needs `npm run dev` on :5173)

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const OUT = 'screenshots/i-run';
const URL = 'http://localhost:5173/?dev&fixture=act3&shot=cubicle_farm';

// [label, text, tone, audit's measured before-duration in ms]
const CASES = [
  ['diane-27w',
   'Diane: "You look tired in a way that is not about sleep. Sit down. I will get you the same coffee I got you the first time."',
   'info', 2600],
  ['steel-door-15w',
   'The steel door swings open with the reluctance of something closed for longer than intended.',
   'objective', 2600],
  ['elevator-14w',
   "The elevator settles between floors. The doors open to a number that wasn't pressed.",
   'info', 2600],
  ['level3-15w',
   "3 clients handled — Level 3 reached! Head to the conference room — Karen's waiting.",
   'objective', 2600],
  ['short-3w', 'Game saved.', 'info', 2600],
  ['short-6w', 'Received Large Coffee', 'item', 2600],
];

const MEASURE = () => {
  window.__ttl = { runs: [] };
  window.__measure = (label) => new Promise((resolve) => {
    const t0 = performance.now();
    let seenAt = null, lastSeen = null, rect = null, cls = null;
    const vis = (el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (parseFloat(cs.opacity) < 0.05) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 2 && r.height >= 2;
    };
    const tick = () => {
      const el = document.querySelector('.na-root .na-card');
      const now = performance.now();
      if (el && vis(el)) {
        if (seenAt === null) { seenAt = now; cls = el.className; }
        lastSeen = now;
        const r = el.getBoundingClientRect();
        rect = { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
      } else if (seenAt !== null && now - lastSeen > 120) {
        resolve({ label, dur: Math.round(lastSeen - seenAt), latency: Math.round(seenAt - t0), rect, cls });
        return;
      }
      if (now - t0 > 20000) { resolve({ label, dur: -1, latency: -1, rect, cls }); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
};

const words = (s) => s.trim().split(/\s+/).length;

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(MEASURE);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 }).catch(() => {});
  // Let the room's own thoughts / objective toasts drain first.
  await page.waitForTimeout(9000);

  const rows = [];
  for (const [label, text, tone, before] of CASES) {
    // Drain anything the world posted on its own, then post through the real
    // _showToast — not through the arbiter directly, so classification is
    // exercised too.
    await page.evaluate(() => window.__arbiter.reset());
    await page.waitForTimeout(400);
    const p = page.evaluate((l) => window.__measure(l), label);
    await page.evaluate(([t, to]) => window.__explore._showToast(t, to), [text, tone]);
    const r = await p;
    const w = words(text);
    rows.push({ ...r, text, words: w, before,
      msPerWordBefore: Math.round(before / w),
      msPerWordAfter: r.dur > 0 ? Math.round(r.dur / w) : -1 });
    console.log(`${label.padEnd(16)} words=${String(w).padStart(2)}  before=${before}ms (${Math.round(before / w)} ms/word)  ->  after=${String(r.dur).padStart(5)}ms (${r.dur > 0 ? Math.round(r.dur / w) : '?'} ms/word)  zone=${(r.cls || '').replace('na-card ', '')}`);
  }

  // Reading-time model sanity: 200 ms/word is the floor we are aiming at.
  const under = rows.filter(r => r.words >= 8 && r.msPerWordAfter < 200 && r.msPerWordAfter > 0);
  console.log(`\nsites at/above 200 ms/word (>=8 words): ${rows.filter(r => r.words >= 8).length - under.length}/${rows.filter(r => r.words >= 8).length}`);
  writeFileSync(join(OUT, 'ttl-check.json'), JSON.stringify(rows, null, 2));
  console.log(`wrote ${join(OUT, 'ttl-check.json')}`);
  await browser.close();
};

run().catch(e => { console.error(e); process.exit(1); });
