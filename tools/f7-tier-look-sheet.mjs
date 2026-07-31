// F7 — WHAT THE DEGRADE TIERS LOOK LIKE. For the art owner, not for the gate.
//
// Round 3 made COMP_CARD's degrade ladder automatic, and extended its bottom
// rung past what the document writes down: `low` also hides `city_backdrop` and
// `room_fx`, because the round-2 draw-call attribution priced them at 36-95 and
// 12-87 calls and the mobile floor could not be met without them. That is a
// LOOK decision wearing a perf decision's clothes, and QA's standing rule on
// this branch is that a look decision needs the art owner's eye, not a
// measurement. So: same frozen frame, same camera, same seed, one image per
// tier, side by side, with the draw-call count under each.
//
// This does not gate anything and does not pass or fail. It exists so the
// sentence "an art owner should choose" has something to choose FROM.
//
//   node tools/f7-tier-look-sheet.mjs [--rooms=a,b,c]
//
// Writes screenshots/perf/f7/tier_<room>_<tier>.png + tier-look.html + tier-look.json.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm,reception,parking_garage').split(',').filter(Boolean);
const TIERS = ['high', 'medium', 'low'];
const OUT = 'screenshots/perf/f7';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: [
    '--window-position=-2400,0', '--window-size=1940,1180',
    '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
    '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--force_high_performance_gpu',
    '--force-device-scale-factor=1', '--autoplay-policy=no-user-gesture-required',
  ],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

const rows = [];
for (const room of ROOMS) {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  // Same freeze rig the determinism gate uses: engine stopped, fluorescent hum
  // off, key light back on its authored base. Otherwise the three tiers are
  // captured at three different points of a light wobble and the sheet shows a
  // brightness difference that has nothing to do with the tier.
  await page.evaluate(() => {
    const E = window.__engine;
    E.setAdaptiveQuality(false);
    E.stop();
    E._flicker = false;
    if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
  });
  const shots = [];
  for (const tier of TIERS) {
    const calls = await page.evaluate((t) => {
      const E = window.__engine;
      E.setQualityTier(t);
      E.renderer.info.autoReset = false;
      E.renderer.info.reset();
      E.renderScene(E.scene, E.camera);
      const c = E.renderer.info.render.calls;
      E.renderer.info.autoReset = true;
      return c;
    }, tier);
    await page.waitForTimeout(200);
    const file = `${OUT}/tier_${room}_${tier}.png`;
    await page.screenshot({ path: file });
    shots.push({ tier, calls, file: file.split('/').pop() });
    console.log(`  ${room} ${tier.padEnd(6)} ${calls} calls -> ${file}`);
  }
  // restore, so a subsequent tool on the same page is not surprised
  await page.evaluate(() => { window.__engine.setQualityTier('high'); window.__engine.start(); });
  rows.push({ room, shots });
  await page.close();
}

const html = `<!doctype html><meta charset="utf-8"><title>Quality tiers — what low costs</title>
<style>body{background:#0b0b12;color:#cdd;font:14px/1.5 system-ui,sans-serif;margin:24px}
h1{font-size:20px}h2{font-size:16px;margin:28px 0 8px;color:#8ab}
.row{display:flex;gap:10px;flex-wrap:wrap}figure{margin:0;flex:1 1 420px;min-width:300px}
img{width:100%;border:1px solid #333;display:block}figcaption{padding:6px 2px;color:#9ab}
b{color:#e8e8f0}.note{max-width:76ch;color:#9ab;border-left:3px solid #345;padding-left:12px}</style>
<h1>Quality tiers — the degrade ladder, as pictures</h1>
<p class="note"><b>What you are choosing.</b> <code>high</code> is the committed look and is unchanged by
this round. <code>medium</code> and <code>low</code> are what Engine's adaptive governor selects on hardware
that cannot hold the frame budget — <code>low</code> only on hardware that could not reach 30fps at
<code>medium</code>. <code>low</code> drops AO, the tilt-shift blur, bloom, the shadow map, <em>and</em> the two
pure-atmosphere scene branches (<code>city_backdrop</code>, <code>room_fx</code>). The last two are an extension
past what COMP_CARD's ladder writes down, and they are the part that needs a signature.
<b>Known risk to look at first:</b> rooms whose whole point is the view out of the window (penthouse and
its wings, executive floor) lose the city entirely at <code>low</code>. If that reads as broken rather than as
degraded, the fix is to keep a reduced city at <code>low</code> rather than none — change the
<code>atmos</code> branch in <code>Engine.setQualityTier()</code>, not the <code>high</code> tier.</p>
${rows.map((r) => `<h2>${r.room}</h2><div class="row">${r.shots.map((s) => `<figure><img src="${s.file}"><figcaption><b>${s.tier}</b> — ${s.calls} draw calls</figcaption></figure>`).join('')}</div>`).join('\n')}
`;
writeFileSync(`${OUT}/tier-look.html`, html);
writeFileSync(`${OUT}/tier-look.json`, JSON.stringify({ when: new Date().toISOString(), rows }, null, 1));
console.log(`\nwrote ${OUT}/tier-look.html`);
await browser.close();
