// _ng-shoot.mjs — evidence harness for the NewGameScreen diorama slider.
//
// Drives the REAL title flow headed (title -> New Game -> slot -> the screen),
// per HANDOFF_PACKAGE §4.3: no convenience constructor, the shipping call path
// or nothing. Produces:
//   screenshots/ng-screen/ng-easy.png / ng-normal.png / ng-hard.png
//   screenshots/ng-screen/ng-garage.png          (the flow's far end)
//   screenshots/ng-screen/ng-slider.webm         (the whole take, slider moving)
// and PASS/FAIL lines for:
//   - the screen opens on New Game (gate is LIVE)
//   - all three stops render, tier pinned high the whole take (CAPTURE LAW)
//   - mouse path works (label click)
//   - Escape returns to the title
//   - confirm lands in the parking garage with the picked mode on the save
//   - Load Game path never shows the screen and keeps the picked mode
//
// Usage: node tools/_ng-shoot.mjs [--port=5199]

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5199';
const OUT = 'screenshots/ng-screen';
fs.mkdirSync(OUT, { recursive: true });

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fails++;
};

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1600, height: 900 } },
});
const page = await context.newPage();

// InputManager diffs key state between frames — hold every tap (CLAUDE.md).
const tap = async (key = 'Enter', hold = 120) => {
  await page.keyboard.down(key); await page.waitForTimeout(hold); await page.keyboard.up(key);
};
// A menu step: press key until `sel` appears (first press can land during the
// audio-resume hiccup or a vite settle — retry beats a 5 s single shot).
const tapUntil = async (sel, key = 'Enter', tries = 4) => {
  for (let i = 0; i < tries; i++) {
    await tap(key);
    const el = await page.waitForSelector(sel, { timeout: 2500 }).catch(() => null);
    if (el) return el;
  }
  throw new Error(`${sel} never appeared after ${tries}x ${key}`);
};
const tier = () => page.evaluate(() => window.__ngEngine?.qualityTier || 'unknown');
const stop = () => page.evaluate(() => {
  const s = window.__ngScreen;
  return s && s.isOpen ? { index: s.index, id: ['easy', 'normal', 'hard'][s.index] } : null;
});

try {
  await page.goto(`http://localhost:${PORT}/?dev`);
  await page.waitForSelector('.title-screen', { timeout: 45000 });
  await page.waitForTimeout(1200);

  // ── Into the screen through the real flow ──
  await tapUntil('.save-slot-panel');       // New Game
  await page.waitForTimeout(400);
  const opened = await tapUntil('.ng-screen').catch(() => null);   // Slot 1
  check('screen opens on New Game', !!opened);
  if (!opened) throw new Error('NewGameScreen never opened');

  // CAPTURE LAW: pin the tier for the whole take, then verify it held.
  await page.evaluate(() => window.__ngEngine.setQualityTier('high'));
  await page.waitForTimeout(1200);

  // Default stop is NORMAL (middle).
  let s = await stop();
  check('default stop is normal', s?.id === 'normal', JSON.stringify(s));
  await page.screenshot({ path: path.join(OUT, 'ng-normal.png') });

  await tap('ArrowLeft');
  await page.waitForTimeout(1100);          // light tween settles
  s = await stop();
  check('ArrowLeft reaches easy', s?.id === 'easy', JSON.stringify(s));
  await page.screenshot({ path: path.join(OUT, 'ng-easy.png') });
  check('tier held high (easy)', (await tier()) === 'high');

  await tap('ArrowRight'); await page.waitForTimeout(450);
  await tap('ArrowRight'); await page.waitForTimeout(1100);
  s = await stop();
  check('ArrowRight reaches hard', s?.id === 'hard', JSON.stringify(s));
  await page.screenshot({ path: path.join(OUT, 'ng-hard.png') });
  check('tier held high (hard)', (await tier()) === 'high');

  // ── Mouse path: click the EASY label, then drag is covered by track click ──
  await page.click('.ng-label[data-i="0"]');
  await page.waitForTimeout(700);
  s = await stop();
  check('label click reaches easy', s?.id === 'easy', JSON.stringify(s));
  // Track click at the far right = hard.
  const track = await page.locator('.ng-track').boundingBox();
  await page.mouse.click(track.x + track.width - 2, track.y + track.height / 2);
  await page.waitForTimeout(700);
  s = await stop();
  check('track click reaches hard', s?.id === 'hard', JSON.stringify(s));

  // ── Escape returns to the title ──
  await tap('Escape');
  await page.waitForTimeout(600);
  const backAtTitle = await page.evaluate(() =>
    !document.querySelector('.ng-screen')
    && !!document.querySelector('.title-screen')
    && document.querySelector('.title-screen').style.display !== 'none');
  check('Escape returns to title', backAtTitle);

  // ── The full flow: pick EASY, land in the garage ──
  await tapUntil('.save-slot-panel');       // New Game again
  await page.waitForTimeout(400);
  await tapUntil('.ng-screen');             // Slot 1
  await page.waitForTimeout(600);
  await tap('ArrowLeft');                   // easy
  await page.waitForTimeout(800);
  await tap('Enter');                       // START
  await page.waitForFunction(() => {
    const ex = window.__explore;
    return ex && ex.player && ex.player.currentRoom === 'parking_garage';
  }, { timeout: 20000 });
  await page.waitForTimeout(2500);
  const landed = await page.evaluate(() => ({
    room: window.__explore.player.currentRoom,
    difficulty: window.__explore.player.serialize().difficulty,
    ngGone: !document.querySelector('.ng-screen'),
  }));
  check('confirm lands in parking garage', landed.room === 'parking_garage', JSON.stringify(landed));
  check('picked mode on the save blob', landed.difficulty === 'easy', landed.difficulty);
  check('screen torn down after confirm', landed.ngGone);
  await page.screenshot({ path: path.join(OUT, 'ng-garage.png') });

  // Bank the save so the Load Game leg has something to load.
  await page.evaluate(() => window.__explore._autoSave());
  await page.waitForTimeout(400);

  // ── Continue unaffected: Load Game never shows the screen ──
  await page.goto(`http://localhost:${PORT}/?dev`);
  await page.waitForSelector('.title-screen', { timeout: 45000 });
  await page.waitForTimeout(1200);
  let sawScreen = false;
  const watcher = setInterval(async () => {
    try { if (await page.$('.ng-screen')) sawScreen = true; } catch { /* nav */ }
  }, 120);
  await page.evaluate(() => {
    [...document.querySelectorAll('.title-menu-item')]
      .find(e => e.textContent.trim() === 'Load Game')?.click();
  });
  await page.waitForSelector('.save-slot-panel', { timeout: 5000 });
  await page.waitForTimeout(400);
  await tap('Enter');                       // the one occupied slot
  await page.waitForFunction(() => {
    const ex = window.__explore;
    return ex && ex.player && !!ex.tileMap;
  }, { timeout: 20000 });
  await page.waitForTimeout(1500);
  clearInterval(watcher);
  const loaded = await page.evaluate(() => ({
    room: window.__explore.player.currentRoom,
    difficulty: window.__explore.player.serialize().difficulty,
  }));
  check('Load Game path never shows the screen', !sawScreen);
  check('loaded save keeps the picked mode', loaded.difficulty === 'easy', JSON.stringify(loaded));
} catch (e) {
  check('harness completed', false, e.message);
} finally {
  const vid = page.video();
  const video = vid ? await vid.path().catch(() => null) : null;
  await page.close();
  await context.close();
  await browser.close();
  if (video && fs.existsSync(video)) {
    const dest = path.join(OUT, 'ng-slider.webm');
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    fs.renameSync(video, dest);
    console.log(`video -> ${dest}`);
  }
}
console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
