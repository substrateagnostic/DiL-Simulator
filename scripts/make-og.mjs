// Open Graph card generator — writes public/og.png (1200x630).
//
//   node scripts/make-og.mjs
//   node scripts/make-og.mjs --shot=screenshots/contact/room-fight-karen.png
//   node scripts/make-og.mjs --live            (grab a fresh still off npm run dev)
//   node scripts/make-og.mjs --live --room=penthouse --fixture=act7
//
// Every shared link (Twitter/X, Discord, Slack, iMessage, itch) unfurls with
// this image, so it ships in public/ and is copied to dist/ verbatim by Vite.
//
// Renders an HTML composition in headless Chromium (already a devDependency for
// the screenshot harness — no native canvas build needed) over a letterboxed
// game still. The pixel display font is loaded from Google Fonts when the
// network is available and falls back to a blocky monospace stack when it
// isn't; the script prints which one it used so the result is never a silent
// downgrade. Palette is the game's: navy #1a1a2e / #0a0a14, red #e94560,
// cream #f0ead6, teal #53a8b6.

import { chromium } from 'playwright';
import { mkdirSync, readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;

const SHOT = resolve(ROOT, arg('shot', 'screenshots/contact/room-reception.png'));
const OUT = resolve(ROOT, arg('out', 'public/og.png'));

// --live captures the still itself from the running dev server instead of
// reading the contact sheet. Use it when screenshots/contact is stale (the
// harness overwrites those files, and a capture that raced the boot screen
// will quietly turn this card into a loading screen).
const LIVE = process.argv.includes('--live');
const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const ROOM = arg('room', 'reception');
const FIXTURE = arg('fixture', 'act7');

const W = 1200;
const H = 630;

if (!LIVE && !existsSync(SHOT)) {
  console.error(`✗ source still not found: ${SHOT}\n  Run: npm run shoot -- --only=reception   (or pass --live)`);
  process.exit(1);
}

// The reception still is 1920x1080 with the lit room around (890, 460). Offsets
// letterbox it so the room lands right-of-centre and the text column sits over
// the dark skyline on the left. --ox/--oy allow re-aiming for another still.
const OX = Number(arg('ox', -110));
const OY = Number(arg('oy', -95));

const buildHtml = (shotB64) => `
<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #0a0a14; }
  #card { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #0a0a14; }
  #still {
    position: absolute; left: ${OX}px; top: ${OY}px;
    width: 1920px; height: 1080px;
    image-rendering: auto;
  }
  /* Navy scrim: opaque under the type, clear over the lit room */
  #scrim {
    position: absolute; inset: 0;
    background: linear-gradient(100deg,
      rgba(10,10,20,0.97) 0%,
      rgba(10,10,20,0.94) 30%,
      rgba(16,18,38,0.55) 52%,
      rgba(16,18,38,0.10) 72%,
      rgba(16,18,38,0.00) 100%);
  }
  /* Corner falloff so the card reads as one object at thumbnail size */
  #vignette {
    position: absolute; inset: 0;
    background: radial-gradient(120% 100% at 62% 45%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.55) 100%);
  }
  /* CRT scanlines — 2px, very low contrast */
  #scan {
    position: absolute; inset: 0;
    background: repeating-linear-gradient(180deg,
      rgba(255,255,255,0.030) 0px, rgba(255,255,255,0.030) 1px,
      rgba(0,0,0,0.000) 1px, rgba(0,0,0,0.000) 3px);
  }
  #frame {
    position: absolute; inset: 0;
    border: 4px solid #e94560;
    box-shadow: inset 0 0 0 3px #0a0a14;
  }
  #type {
    position: absolute; left: 74px; top: 50%; transform: translateY(-50%);
    width: 620px;
  }
  .kicker {
    font-family: 'VT323', 'Courier New', monospace;
    font-size: 26px; letter-spacing: 5px; color: #53a8b6;
    text-transform: uppercase; margin-bottom: 22px;
    text-shadow: 0 2px 0 #000;
  }
  .title {
    font-family: 'Press Start 2P', 'Courier New', monospace;
    font-size: 62px; line-height: 1.16; letter-spacing: 1px;
    color: #f0ead6;
    text-shadow: 5px 5px 0 #000, 0 0 26px rgba(233,69,96,0.35);
  }
  .title .red { color: #e94560; text-shadow: 5px 5px 0 #000, 0 0 30px rgba(233,69,96,0.55); }
  .rule {
    width: 300px; height: 5px; background: #e94560; margin: 30px 0 24px;
    box-shadow: 3px 3px 0 #000;
  }
  .tagline {
    font-family: 'VT323', 'Courier New', monospace;
    font-size: 42px; color: #f0ead6; letter-spacing: 1px;
    text-shadow: 0 2px 0 #000;
  }
  .sub {
    font-family: 'VT323', 'Courier New', monospace;
    font-size: 27px; color: #9aa4b8; margin-top: 12px;
    text-shadow: 0 2px 0 #000;
  }
</style></head>
<body>
  <div id="card">
    <img id="still" src="data:image/png;base64,${shotB64}">
    <div id="scrim"></div>
    <div id="vignette"></div>
    <div id="scan"></div>
    <div id="type">
      <div class="kicker">Vaults Fargo &middot; Trust Dept.</div>
      <div class="title">TRUST<br><span class="red">ISSUES</span></div>
      <div class="rule"></div>
      <div class="tagline">A Trust Officer Simulator</div>
      <div class="sub">Your patience is your HP. Your coffee is your mana.</div>
    </div>
    <div id="frame"></div>
  </div>
</body></html>`;

// Grab a 1920x1080 still straight off the dev server's ?dev fixture loader —
// the same path tools/shoot.mjs uses, including its __shotReady signal.
const captureStill = async (browser) => {
  const url = `${BASE}/?dev&fixture=${FIXTURE}&shot=${ROOM}&hud=0`;
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
  // Clear any auto-fired room dialog, then let the scene settle
  for (let i = 0; i < 12; i++) {
    const busy = await page.evaluate(() => {
      const dlg = document.querySelector('.dialog-container');
      return !!dlg && dlg.style.display !== 'none' && dlg.offsetParent !== null;
    });
    if (!busy) break;
    await page.keyboard.down('Enter');
    await page.waitForTimeout(90);
    await page.keyboard.up('Enter');
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1800);
  const buf = await page.screenshot({ type: 'png' });
  await page.close();
  console.log(`  · captured a fresh still: ${url}`);
  return buf.toString('base64');
};

const run = async () => {
  mkdirSync(dirname(OUT), { recursive: true });
  const browser = await chromium.launch();
  const shotB64 = LIVE
    ? await captureStill(browser)
    : readFileSync(SHOT).toString('base64');
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  await page.setContent(buildHtml(shotB64), { waitUntil: 'load' });

  // Give the webfonts a chance; carry on with the fallback stack if offline.
  try {
    await page.waitForFunction(
      () => document.fonts.check('16px "Press Start 2P"') && document.fonts.check('16px "VT323"'),
      { timeout: 8000 },
    );
    console.log('  · pixel webfonts loaded (Press Start 2P + VT323)');
  } catch {
    console.warn('  ! webfonts unavailable — fell back to the monospace stack (offline?)');
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);

  await page.screenshot({ path: OUT, type: 'png' });
  await browser.close();
  console.log(`✓ wrote ${OUT} (${W}x${H}) from ${LIVE ? `${BASE} · ${ROOM} · ${FIXTURE}` : SHOT}`);
};

run().catch((e) => { console.error(e); process.exit(1); });
