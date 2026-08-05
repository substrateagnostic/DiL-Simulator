// D1 relight evidence: city_street, HEADED, quality tier PINNED, monologue expired.
//
// Three things the generic `npm run shoot` run did not do, all of which made the
// existing light-after plate unjudgeable:
//
//  1. HEADED. Headless chromium picks a different GL backend; a plate captured
//     there is not the plate the producer sees.
//  2. `?qtier=high` PINNED. Engine's adaptive window can demote mid-capture, and
//     the degrade ladder's first rung is AO off -- which moves luminance.
//  3. The room's first-visit thought fires on entry and the bubble sat across
//     the middle of the frame in the shipped plate. ROOM_THOUGHTS lines are
//     posted through the arbiter with a TTL; this waits it out (default 12s)
//     and asserts the bubble is gone before the shutter.
//
//   node tools/_f-relight-shoot.mjs                       -> screenshots/f-run/relight/
//   node tools/_f-relight-shoot.mjs --out=/tmp/x --rooms=city_street,parking_garage
//
// Requires `npm run dev`.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const OUT = arg('out', 'screenshots/f-run/relight');
const ROOMS = arg('rooms', 'city_street').split(',').map(s => s.trim()).filter(Boolean);
const FIXTURE = arg('fixture', 'act7');
const SETTLE = Number(arg('settle', 12000));

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  let ok = 0;
  for (const room of ROOMS) {
    const page = await context.newPage();
    try {
      const url = `${BASE}/?dev&qtier=high&fixture=${FIXTURE}&shot=${room}&hud=0`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
      // The first-visit pair and the act-keyed lines are QUEUED in the
      // arbiter's single-occupancy VOICE zone, each with its own reading-time
      // ttl (2400-9000ms). So this polls the zone empty rather than guessing a
      // number: `.na-root` cards plus the dialog box, every 500ms.
      const clean = async () => page.evaluate(() => {
        const vis = (el) => !!el && el.offsetParent !== null && getComputedStyle(el).opacity !== '0';
        const cards = [...document.querySelectorAll('.na-root .na-zone > *')].filter(vis).length;
        const dlg = [...document.querySelectorAll('.dialog-container')].filter(vis).length;
        return cards + dlg;
      });
      const t0 = Date.now();
      let live = await clean();
      while (Date.now() - t0 < SETTLE || live > 0) {
        if (Date.now() - t0 > SETTLE + 30000) break;
        await page.waitForTimeout(500);
        live = await clean();
      }
      await page.waitForTimeout(600);
      live = await clean();
      const file = join(OUT, `room-${room}.png`);
      await page.screenshot({ path: file });
      console.log(`  ${live === 0 ? 'OK ' : 'XX '} ${file}   textSurfacesVisible=${live}  waited=${Date.now() - t0}ms  qtier=high(pinned)`);
      if (live === 0) ok++;
    } catch (err) {
      console.log(`  XX ${room} - ${String(err).split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }
  await browser.close();
  console.log(`\n${ok}/${ROOMS.length} clean plates -> ${OUT}`);
  process.exit(ok === ROOMS.length ? 0 : 1);
};

run();
