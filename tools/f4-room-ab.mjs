// F4: exploration look A/B across the two commits, with provenance.
//
// The merge A/B (tools/f4-merge-perf.mjs) proves the batching is lossless WITHIN
// one build. This answers the other question: what does the working tree look
// like next to HEAD, room by room — the grade fold, the AO intensity drop, the
// pixel-ratio cap and the CityBackdrop rework all together, quantified instead of
// asserted. Same frozen rig on both sides: engine stopped, camera pinned by hand,
// dialogs hidden, PRNG pinned.
//
//   node tools/f4-room-ab.mjs --rooms=cubicle_farm,reception --before=http://localhost:5273
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { compare } from 'odiff-bin';

const DIR = path.resolve('screenshots/f4');
fs.mkdirSync(DIR, { recursive: true });
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm,reception,parking_garage,executive_floor').split(',');
const BEFORE = arg('before', 'http://localhost:5273');
const AFTER = arg('after', 'http://localhost:5173');

const SEED = `(() => { let s = 20260730 >>> 0;
  Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
})();`;

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
    '--disable-features=CalculateNativeWinOcclusion', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});

// FREEZE_LOOK — applied on BOTH sides. The fluorescent hum writes
// `_dirLight.intensity` from Engine._loop, so `stop()` alone leaves whatever
// factor the last live frame happened to apply sitting on the key light, and the
// two builds get different factors. That is a global brightness offset over the
// whole frame and it dominates any real look diff. Pin the hum off and put the
// intensity back to its authored base before capturing.
const shot = async (base, room, tag, { hideCity = false } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEED);
  const page = await ctx.newPage();
  await page.goto(`${base}/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 40000 });
  await page.waitForTimeout(1800);
  const cfg = await page.evaluate((opts) => {
    const E = window.__engine;
    E.stop();
    E._flicker = false;
    if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
    for (const el of document.querySelectorAll('.dialog-box, #dialog-box, .dialog-container'))
      el.style.display = 'none';
    // Isolation: hide the city skyline on BOTH sides. The CityBackdrop rework is
    // a bug fix for the producer's reported "building visibly stretches/tears"
    // artifact — it moves 53 tower slabs apart and swaps the street-level facade
    // for a seam-free variant. Every room with a window therefore diffs, by
    // design. Hiding it on both sides answers the only question that matters for
    // a perf patch: does anything ELSE in the frame move.
    let cityHidden = false;
    if (opts.hideCity) {
      for (const c of E.scene.children) {
        if (c.name === 'city_backdrop' || c.name === 'building_shell') { c.visible = false; cityHidden = true; }
      }
    }
    E.camera.position.set(24, 24, 24);
    E.camera.lookAt(6, 0, 6);
    E.camera.updateMatrixWorld(true);
    E.renderScene(E.scene, E.camera);
    E.renderScene(E.scene, E.camera);
    const n = E._n8aoPass?.configuration;
    return {
      pixelRatio: E.renderer.getPixelRatio(),
      antialias: E.renderer.getContext().getContextAttributes().antialias,
      passes: E.composer.passes.filter(p => p.enabled).map(p => p.constructor.name).join(' → '),
      aoIntensity: n?.intensity, aoSamples: n?.aoSamples, aoHalfRes: n?.halfRes,
      shadowAutoUpdate: E.renderer.shadowMap.autoUpdate,
      dirIntensity: E._dirLight?.intensity, cityHidden,
      drawCalls: E.renderer.info.render.calls,
    };
  }, { hideCity });
  await page.waitForTimeout(200);
  const p = path.join(DIR, `room_${room}_${tag}.png`);
  await page.screenshot({ path: p });
  await ctx.close();
  return { p, cfg };
};

const out = [];
for (const room of ROOMS) {
  try {
    const b = await shot(BEFORE, room, 'before');
    const a = await shot(AFTER, room, 'after');
    const ctl = await shot(AFTER, room, 'after_ctl');    // same build twice = floor
    const bCtl = await shot(BEFORE, room, 'before_ctl'); // HEAD against itself = floor
    const bNoCity = await shot(BEFORE, room, 'before_noCity', { hideCity: true });
    const aNoCity = await shot(AFTER, room, 'after_noCity', { hideCity: true });
    const aNoCityCtl = await shot(AFTER, room, 'after_noCity_ctl', { hideCity: true });
    const dOpt = { threshold: 0.1, antialiasing: true, outputDiffMask: true };
    const diff = await compare(b.p, a.p, path.join(DIR, `room_${room}_diff.png`), dOpt);
    const control = await compare(a.p, ctl.p, path.join(DIR, `room_${room}_control.png`), dOpt);
    const controlBefore = await compare(b.p, bCtl.p, path.join(DIR, `room_${room}_control_before.png`), dOpt);
    // THE ATTRIBUTION ROW. City skyline hidden on both sides: whatever is left is
    // the perf patch's own effect on the look.
    const minusCity = await compare(bNoCity.p, aNoCity.p, path.join(DIR, `room_${room}_diff_noCity.png`), dOpt);
    // ...and its own floor, measured the same way. The city-visible control is
    // inflated by CityBackdrop's beacon/streak/mist animation, which is keyed on
    // accumulated wall-clock time and therefore lands differently on every page
    // load. THIS is the number `minusCity` has to be read against.
    const controlNoCity = await compare(aNoCity.p, aNoCityCtl.p, path.join(DIR, `room_${room}_control_noCity.png`), dOpt);
    out.push({ room, diff, control, controlBefore, minusCity, controlNoCity, beforeCfg: b.cfg, afterCfg: a.cfg });
    console.log(`\n=== ${room}`);
    console.log(`  before→after (everything):        ${diff.match ? 'identical' : `${diff.diffPercentage}% (${diff.diffCount} px)`}`);
    console.log(`  before→after, CITY HIDDEN both:   ${minusCity.match ? 'identical' : `${minusCity.diffPercentage}% (${minusCity.diffCount} px)`}  ← the perf patch's own look delta`);
    console.log(`  CONTROL no-city (its floor):      ${controlNoCity.match ? 'identical' : `${controlNoCity.diffPercentage}% (${controlNoCity.diffCount} px)`}`);
    console.log(`  CONTROL after-vs-after:           ${control.match ? 'identical' : `${control.diffPercentage}% (${control.diffCount} px)`}`);
    console.log(`  CONTROL before-vs-before:         ${controlBefore.match ? 'identical' : `${controlBefore.diffPercentage}% (${controlBefore.diffCount} px)`}`);
    console.log(`  before cfg: ${JSON.stringify(b.cfg)}`);
    console.log(`  after  cfg: ${JSON.stringify(a.cfg)}`);
  } catch (e) {
    console.log(`  ✗ ${room} — ${e.message}`);
  }
}
fs.writeFileSync(path.join(DIR, 'room-ab.json'), JSON.stringify({ before: BEFORE, after: AFTER, out }, null, 2));
await browser.close();
