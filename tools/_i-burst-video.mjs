// 60-second provoked-burst capture for the notification judge (run I).
//
// Drives the densest notification minute the game can produce, in one take:
//   0-12s   a story fight, real turns, taunts + combat beats + damage numbers
//   12-20s  victory: XP + achievement burst + autosave + the post-dialog
//   20-38s  the post-dialog played out, then the deferred cards returning
//   38-52s  room transitions: objective updates, room thoughts, autosaves
//   52-60s  the pause menu Log tab, showing what was held and what was merged
//
// Usage: node tools/_i-burst-video.mjs   (needs `npm run dev` on :5173)

import { chromium } from 'playwright';
import { mkdirSync, renameSync, readdirSync } from 'fs';
import { join } from 'path';

const OUT = 'screenshots/i-run-after';
const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: join(OUT, '_vid'), size: { width: 1280, height: 720 } },
  });
  const page = await ctx.newPage();
  const tap = async (k = 'Enter', hold = 90) => {
    await page.keyboard.down(k); await page.waitForTimeout(hold); await page.keyboard.up(k);
  };
  const walk = async (k, ms) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
  const shot = (n) => page.screenshot({ path: join(OUT, `burst-${n}.png`) }).catch(() => {});

  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&fight=karen`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(3000);

  // 0-12s — real turns
  for (let i = 0; i < 9; i++) { await tap('Enter'); await page.waitForTimeout(1100); }
  await shot('01-mid-fight');

  // 12-20s — force the victory burst. A Brace/Retaliate QTE overlay swallows
  // keys, so clear it first and keep asking until the fight is actually over.
  for (let i = 0; i < 8; i++) {
    const over = await page.evaluate(() => !document.querySelector('.combat-hud'));
    if (over) break;
    if (await page.evaluate(() => !!document.querySelector('.minigame-overlay'))) {
      await tap('Escape'); await page.waitForTimeout(500);
    }
    await tap('Backquote', 160);
    await page.waitForTimeout(1400);
  }
  await shot('02-victory-burst');
  await page.waitForTimeout(2200);
  await shot('03-dialog-claims-voice');

  // 20-38s — play the post-dialog out, then watch the deferred cards return
  for (let i = 0; i < 18; i++) {
    const up = await page.evaluate(() => {
      const d = document.querySelector('.dialog-box');
      return !!d && d.offsetParent !== null && getComputedStyle(d).display !== 'none';
    }).catch(() => false);
    if (!up) break;
    await tap('Enter'); await page.waitForTimeout(650);
  }
  await page.waitForTimeout(900);
  await shot('04-deferred-returns');
  await page.waitForTimeout(3000);

  // 38-52s — room transitions
  for (const [k, ms] of [['ArrowUp', 1100], ['ArrowRight', 900], ['ArrowDown', 1100], ['ArrowLeft', 900]]) {
    await walk(k, ms);
    await page.waitForTimeout(1400);
  }
  await shot('05-world-notices');

  // 52-60s — the Log
  await tap('Escape'); await page.waitForTimeout(800);
  await shot('06-menu-log-badge');
  const idx = await page.evaluate(() =>
    [...document.querySelectorAll('.menu-item .menu-item-label')].map(e => e.textContent.trim())
      .findIndex(t => t.startsWith('Log')));
  for (let i = 0; i < idx; i++) { await tap('ArrowDown', 70); await page.waitForTimeout(110); }
  await tap('Enter'); await page.waitForTimeout(1200);
  await shot('07-log-tab');
  await page.waitForTimeout(4000);

  await ctx.close();
  await browser.close();
  const vids = readdirSync(join(OUT, '_vid')).filter(f => f.endsWith('.webm'));
  if (vids[0]) {
    renameSync(join(OUT, '_vid', vids[0]), join(OUT, 'burst-60s.webm'));
    console.log(`wrote ${join(OUT, 'burst-60s.webm')}`);
  }
  console.log('stills: burst-01..07');
};

run().catch(e => { console.error(e); process.exit(1); });
