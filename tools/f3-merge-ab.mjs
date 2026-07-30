// F3: prove the grade fold is visually lossless.
// Same page, same frame, same camera: capture with the MERGED pass, then swap in
// a runtime-reconstructed LEGACY chain (blur-only TiltShiftPass + standalone
// GradePass) and capture again. Everything is frozen via __engine.stop() first,
// so the only difference between the two images is the pass topology.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { compare } from 'odiff-bin';

const DIR = path.resolve('screenshots/f3');
fs.mkdirSync(DIR, { recursive: true });
const ROOMS = (process.argv.find(a => a.startsWith('--rooms='))?.slice(8) || 'cubicle_farm,parking_garage,penthouse_bar').split(',');

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
    '--disable-features=CalculateNativeWinOcclusion', '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

for (const room of ROOMS) {
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.goto(`http://localhost:5173/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 40000 });
  await page.waitForTimeout(2200);

  // Freeze everything: no tweens, no animators, no city time, no camera drift.
  await page.evaluate(() => {
    const E = window.__engine;
    E.stop();
    window.__redraw = () => E.renderScene(E.scene, E.camera);
    window.__redraw(); window.__redraw();
  });
  await page.waitForTimeout(250);
  const merged = path.join(DIR, `ab_${room}_merged.png`);
  await page.screenshot({ path: merged });

  const info = await page.evaluate(async () => {
    const E = window.__engine;
    const { TiltShiftPass } = await import('/src/effects/TiltShiftPass.js');
    const { GradePass } = await import('/src/effects/GradePass.js');
    const live = E._tiltShiftPass;
    const pr = E.renderer.getPixelRatio();
    const u = live.uniforms;
    const ts = new TiltShiftPass(E.width * pr, E.height * pr, {
      focusCenter: u.focusCenter.value, bandWidth: u.bandWidth.value,
      maxBlur: u.maxBlur.value, strength: u.strength.value,
    });
    const gp = new GradePass(live.gradeKey);
    const i = E.composer.passes.indexOf(live);
    E.composer.passes.splice(i, 1, ts, gp);
    window.__redraw(); window.__redraw();
    return {
      gradeKey: live.gradeKey,
      blurEnabled: live.blurEnabled,
      mergedPasses: i + 1 + (E.composer.passes.length - i - 2),
      legacyEnabled: E.composer.passes.filter(p => p.enabled).map(p => p.name || p.constructor.name),
      tiltUniforms: { focusCenter: u.focusCenter.value, bandWidth: u.bandWidth.value, maxBlur: u.maxBlur.value, strength: u.strength.value },
    };
  });
  await page.waitForTimeout(250);
  const legacy = path.join(DIR, `ab_${room}_legacy.png`);
  await page.screenshot({ path: legacy });

  const r = await compare(legacy, merged, path.join(DIR, `ab_${room}_diff.png`),
    { threshold: 0.01, antialiasing: false, outputDiffMask: true });
  const strict = await compare(legacy, merged, path.join(DIR, `ab_${room}_diff_strict.png`),
    { threshold: 0.0, antialiasing: false, outputDiffMask: true });
  console.log(`[${room}] grade=${info.gradeKey} blur=${info.blurEnabled} legacyChain=${info.legacyEnabled.join(' -> ')}`);
  console.log(`   threshold 0.01: ${JSON.stringify(r)}`);
  console.log(`   threshold 0.00: ${JSON.stringify(strict)}`);
  if (errs.length) console.log('   ERRORS', errs.slice(0, 3));
  await page.close();
}
await browser.close();
