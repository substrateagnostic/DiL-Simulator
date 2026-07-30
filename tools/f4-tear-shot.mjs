// F4: make the parking-garage skyline tear VISIBLE, not just countable.
//
// The geometric evidence is unambiguous (f3-garage-diag: 9 overlapping tower
// AABBs at HEAD, 3 of them intersecting the HQ tower, vs 0 after the fix). The
// visual evidence was not: the shipped garage camera is predawn and the frame is
// nearly black, so no still of it can show the towers at all — which is why the
// previous round could prove "gone" but not "was there".
//
// So: aim a camera at the cluster that overlaps (towers 35/37/39 vs HQ, from the
// diag JSON), on a bright time of day, engine frozen, identical framing on both
// dev servers. Same camera, same tod, one commit apart.
//
//   node tools/f4-tear-shot.mjs --before=http://localhost:5273 --after=http://localhost:5173
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { compare } from 'odiff-bin';

const DIR = path.resolve('screenshots/f4');
fs.mkdirSync(DIR, { recursive: true });
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const BEFORE = arg('before', 'http://localhost:5273');
const AFTER = arg('after', 'http://localhost:5173');
const TOD = arg('tod', 'afternoon');

// The overlapping cluster, straight out of f4_garage_HEAD_diag.json:
//   tower 35  x 7.72..11.48  z -14.98..-11.33   y ..17.49
//   tower 37  x 11.28..16.25 z -16.78..-12.78   y ..21.71
//   tower 39  x 16.50..22.10 z -13.97..-10.85   y ..27.13
//   HQ        x 7.50..18.50  z -14.00.. -6.00   y ..45.60
const TARGET = { x: 14, y: 16, z: -11 };
const DIST = 34;

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
    '--disable-features=CalculateNativeWinOcclusion', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows', '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});

const shot = async (base, tag) => {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${base}/?dev&fixture=act7&shot=parking_garage&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 40000 });
  await page.waitForTimeout(1800);
  const info = await page.evaluate(({ T, D, tod }) => {
    const E = window.__engine;
    E.stop();
    try { E.setTimeOfDay(tod); } catch (e) { /* older builds */ }
    for (const el of document.querySelectorAll('.dialog-box, #dialog-box, .dialog-container'))
      el.style.display = 'none';
    const cam = E.camera;
    cam.position.set(T.x + D, T.y + D * 0.82, T.z + D);
    cam.lookAt(T.x, T.y, T.z);
    cam.left = -30; cam.right = 30; cam.top = 17; cam.bottom = -17;
    cam.near = 0.1; cam.far = 400;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
    // Hide the garage interior so nothing but the skyline is in frame — the
    // question is entirely about tower geometry.
    const room = E.scene.children.find(c => c.name && c.name.startsWith('room_'));
    if (room) room.visible = false;
    E.renderScene(E.scene, cam);
    E.renderScene(E.scene, cam);

    // TEAR METRIC, not an adjective. A tear in a skyline built from soft haze
    // gradients is a STRAIGHT VERTICAL LUMINANCE DISCONTINUITY: read the frame
    // back, average each column's luminance over the full height, and find the
    // largest step between adjacent columns. Smooth atmosphere gives a small
    // number everywhere; a seam gives one large spike at the seam's x.
    const gl = E.renderer.getContext();
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const col = new Float64Array(w);
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        const i = row + x * 4;
        col[x] += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      }
    }
    for (let x = 0; x < w; x++) col[x] /= h;
    let maxStep = 0, maxAt = -1;
    const steps = [];
    for (let x = 1; x < w; x++) {
      const d = Math.abs(col[x] - col[x - 1]);
      steps.push(d);
      if (d > maxStep) { maxStep = d; maxAt = x; }
    }
    steps.sort((a, b) => a - b);
    const median = steps[steps.length >> 1];
    return {
      tod: E.cityBackdrop?.tod, towers: E.cityBackdrop?.buildings?.length, hq: !!E.cityBackdrop?.hqTower,
      tear: {
        maxColumnStep: +maxStep.toFixed(2), atX: maxAt,
        medianColumnStep: +median.toFixed(3),
        ratio: +(maxStep / (median || 1e-6)).toFixed(1),
      },
    };
  }, { T: TARGET, D: DIST, tod: TOD });
  await page.waitForTimeout(250);
  const p = path.join(DIR, `tear_${tag}.png`);
  await page.screenshot({ path: p });
  await ctx.close();
  console.log(`  ${tag}: tod=${info.tod} towers=${info.towers} hq=${info.hq} -> ${path.basename(p)}${errs.length ? ' ERRORS ' + errs[0] : ''}`);
  console.log(`     tear metric: max column-luminance step ${info.tear.maxColumnStep} at x=${info.tear.atX} · median step ${info.tear.medianColumnStep} · ratio ${info.tear.ratio}x`);
  return { p, info };
};

const b = await shot(BEFORE, 'HEAD_8864a75');
const a = await shot(AFTER, 'working_tree');
const r = await compare(b.p, a.p, path.join(DIR, 'tear_diff.png'),
  { threshold: 0.1, antialiasing: true, outputDiffMask: true });
console.log('\nskyline diff (same camera, same tod, one commit apart):', JSON.stringify(r));
fs.writeFileSync(path.join(DIR, 'tear.json'), JSON.stringify({
  before: { base: BEFORE, file: path.basename(b.p), ...b.info },
  after: { base: AFTER, file: path.basename(a.p), ...a.info },
  diff: r, camera: { target: TARGET, dist: DIST, ortho: [-30, 30, 17, -17] }, tod: TOD,
}, null, 2));
await browser.close();
