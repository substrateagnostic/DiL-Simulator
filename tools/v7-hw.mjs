// One-off HARDWARE-GL capture (no SwiftShader) on the RTX 4050 target, so the
// round-2 verdict is not resting entirely on a software rasteriser.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
const BASE = 'http://localhost:5173';
const run = async () => {
  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
           '--force_high_performance_gpu', '--disable-gpu-sandbox'],
  });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 900 } })).newPage();
  await page.goto(`${BASE}/?dev`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return 'no webgl';
    const d = gl.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  console.log('RENDERER:', info);
  await page.evaluate(async () => { await import('/tools/v7-stage.js'); });
  for (const id of ['karen', 'chad', 'grandma', 'intern']) {
    const d = await page.evaluate((i) => window.__v7.shootArena(i, {}), id);
    writeFileSync(`screenshots/v7/${id}-HW-f.png`, Buffer.from(String(d).split(',')[1], 'base64'));
    console.log('  ✓', id);
  }
  await browser.close();
};
run();
