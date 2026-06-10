// Screenshot harness — deterministic full-res captures of every room and fight.
//
//   npm run shoot                  -> everything, into screenshots/contact/
//   npm run shoot -- --only=server_room   (substring match on shot names)
//   npm run shoot -- --fixture=act5       (override the default act7 fixture)
//
// Requires the dev server running (npm run dev). Uses the ?dev fixture loader
// in main.js (window.__shotReady signal). Writes an index.html contact sheet.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const OUT = 'screenshots/contact';
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);
const fixture = process.argv.find(a => a.startsWith('--fixture='))?.slice(10) || 'act7';

const ROOMS = [
  'parking_garage', 'reception', 'cubicle_farm', 'break_room', 'ross_office',
  'conference_room', 'server_room', 'executive_floor', 'stairwell', 'archive',
  'hr_department', 'vault', 'board_room', 'penthouse', 'penthouse_expanded',
  'penthouse_aquarium', 'penthouse_analytics', 'penthouse_bar',
  // Act 6½ city rooms (no-op until they exist)
  'city_street', 'transit_bus', 'records_hall', 'luckys_diner', 'old_branch', 'old_vault',
];
const FIGHTS = ['intern', 'karen', 'chad', 'grandma', 'compliance', 'rachel_boss', 'algorithm'];

const shots = [
  ...ROOMS.map(r => ({ name: `room-${r}`, url: `${BASE}/?dev&fixture=${fixture}&shot=${r}&hud=0`, wait: 1500 })),
  ...FIGHTS.map(f => ({ name: `fight-${f}`, url: `${BASE}/?dev&fixture=${fixture}&fight=${f}`, wait: 4500 })),
];

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const results = [];

  for (const shot of shots) {
    if (only && !shot.name.includes(only)) continue;
    const page = await context.newPage();
    try {
      await page.goto(shot.url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 20000 });
      // Clear any auto-fired dialogs before capturing (room shots only —
      // fights need their input loop untouched). Enter advances dialogs and
      // selects Resume if a menu is somehow open; held ~90ms so
      // InputManager's per-frame isJustPressed sees it.
      if (!shot.url.includes('fight=')) {
        for (let i = 0; i < 10; i++) {
          const busy = await page.evaluate(() => {
            const t = document.body.innerText;
            return t.includes('[ESC] Exit') || t.includes('EMPLOYEE PORTAL');
          });
          if (!busy) break;
          await page.keyboard.down('Enter');
          await page.waitForTimeout(90);
          await page.keyboard.up('Enter');
          await page.waitForTimeout(300);
        }
      }
      await page.waitForTimeout(shot.wait);
      const file = join(OUT, `${shot.name}.png`);
      await page.screenshot({ path: file });
      results.push({ name: shot.name, ok: true });
      console.log(`  ✓ ${shot.name}`);
    } catch (err) {
      results.push({ name: shot.name, ok: false, err: String(err).split('\n')[0] });
      console.log(`  ✗ ${shot.name} — ${String(err).split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }

  // Contact sheet
  const cells = results.map(r => r.ok
    ? `<figure><img src="${r.name}.png" loading="lazy"><figcaption>${r.name}</figcaption></figure>`
    : `<figure class="fail"><figcaption>✗ ${r.name}<br><small>${r.err}</small></figcaption></figure>`
  ).join('\n');
  writeFileSync(join(OUT, 'index.html'), `<!doctype html>
<meta charset="utf-8"><title>TRUST ISSUES contact sheet</title>
<style>
  body{background:#0a0a14;color:#ddd;font-family:monospace;margin:16px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:12px}
  figure{margin:0;border:1px solid #333;padding:6px;background:#11111e}
  img{width:100%;display:block}
  figcaption{padding:6px 2px;font-size:13px;color:#53a8b6}
  .fail{border-color:#e94560;color:#e94560;min-height:80px}
</style>
<h1>Contact sheet — ${new Date().toISOString()}</h1>
<div class="grid">${cells}</div>`);

  await browser.close();
  const okCount = results.filter(r => r.ok).length;
  console.log(`\n${okCount}/${results.length} shots → ${OUT}/index.html`);
  process.exit(okCount === 0 ? 1 : 0);
};

run();
