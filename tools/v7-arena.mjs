// Head close-ups under the REAL combat lighting rig.
//   node tools/v7-arena.mjs --ids=karen,chad --tag=a1 [--expr=angry]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const OUT = 'screenshots/v7';
const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ids = (arg('ids', 'andrew,karen,chad,grandma')).split(',');
const tag = arg('tag', 'arena');
const expr = arg('expr', '');
const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 900 } })).newPage();
  page.on('pageerror', e => console.log('  ! ', String(e).split('\n')[0]));
  await page.goto(`${BASE}/?dev`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(async () => { await import('/tools/v7-stage.js'); });
  for (const id of ids) {
    for (const [suffix, az] of [['f', 0], ['q', 0.55]]) {
      const d = await page.evaluate(async ({ i, e, a }) => window.__v7.shootArena(i, { expression: e || undefined, az: a }), { i: id, e: expr, a: az });
      writeFileSync(join(OUT, `${id}-${tag}-${suffix}.png`), Buffer.from(String(d).split(',')[1], 'base64'));
    }
    console.log(`  ✓ ${id}`);
  }
  await browser.close();
};
run();
