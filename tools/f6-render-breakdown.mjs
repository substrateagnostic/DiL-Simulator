// F6 micro-probe: how many renderer.render() calls does ONE composed frame make,
// and how many draw calls does each one issue? Also prints the shadow-map
// contribution per render. Used to explain a draw-call count that moved.
//   node tools/f6-render-breakdown.mjs [--room=cubicle_farm]
import { chromium } from 'playwright';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOM = arg('room', 'cubicle_farm');

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180',
    '--disable-features=CalculateNativeWinOcclusion', '--ignore-gpu-blocklist',
    '--force_high_performance_gpu', '--force-device-scale-factor=1'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`${BASE}/?dev&fixture=act7&shot=${ROOM}&hud=0`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
for (let i = 0; i < 8; i++) {
  const busy = await page.evaluate(() => {
    const d = document.querySelector('.dialog-container');
    return (!!d && d.style.display !== 'none' && d.offsetParent !== null)
      || document.body.innerText.includes('EMPLOYEE PORTAL');
  }).catch(() => false);
  if (!busy) break;
  await page.keyboard.down('Enter'); await page.waitForTimeout(90);
  await page.keyboard.up('Enter'); await page.waitForTimeout(280);
}
await page.waitForTimeout(2500);

for (const fast of [true, false]) {
  const out = await page.evaluate((f) => {
    window.__n8aoFast = f;
    const E = window.__engine;
    const R = E.renderer;
    R.info.autoReset = false;
    const log = [];
    const orig = R.render.bind(R);
    let n = 0;
    R.render = (sc, cam) => {
      const before = R.info.render.calls;
      orig(sc, cam);
      log.push({ i: n++, scene: sc.name || sc.type, calls: R.info.render.calls - before });
    };
    R.info.reset();
    E.renderScene(E.scene, E.camera);
    const total = R.info.render.calls;
    R.render = orig;
    R.info.autoReset = true;
    return { fast: f, total, renders: log, nodes: (() => { let c = 0; E.scene.traverse(() => c++); return c; })() };
  }, fast);
  console.log(`\nfast=${out.fast}  total draw calls in one composed frame: ${out.total}   (scene nodes ${out.nodes})`);
  for (const r of out.renders) console.log(`   render #${r.i}  ${String(r.calls).padStart(5)} calls   scene=${r.scene}`);
}
await browser.close();
