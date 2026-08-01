// Six-expression proof sheet for the v7 face. node tools/v7-expr.mjs --ids=andrew,karen
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const OUT = 'screenshots/v7';
const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ids = (arg('ids', 'andrew,karen,chad,grandma')).split(',');
const tag = arg('tag', 'expr');
const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 900 } })).newPage();
  page.on('pageerror', e => console.log('  ! ', String(e).split('\n')[0]));
  await page.goto(`${BASE}/?dev`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(async () => { await import('/tools/v7-stage.js'); });
  for (const id of ids) {
    const res = await page.evaluate(async (i) => window.__v7.shootExpressions(i), id);
    const got = [];
    for (const [n, d] of Object.entries(res)) {
      if (!d) { console.log(`  ✗ ${id}/${n} MISSING`); continue; }
      writeFileSync(join(OUT, `${id}-${tag}-${n}.png`), Buffer.from(String(d).split(',')[1], 'base64'));
      got.push(n);
    }
    console.log(`  ✓ ${id}  ${got.length}/6  [${got.join(' ')}]`);
  }
  await browser.close();
};
run();
