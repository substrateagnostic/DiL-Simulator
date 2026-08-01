// Dump the painted face TILE for a character (no geometry, no lighting) so the
// texture pass can be judged separately from the sculpt.
//   node tools/v7-tex.mjs --ids=karen,chad --tag=t1 [--expr=neutral]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const OUT = 'screenshots/v7';
const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const ids = arg('ids', 'karen').split(',');
const tag = arg('tag', 'tex');
const expr = arg('expr', 'neutral');
const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 900 } })).newPage();
  page.on('pageerror', e => console.log('  ! ', String(e).split('\n')[0]));
  await page.goto(`${BASE}/?dev`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(async () => { await import('/tools/v7-stage.js'); });
  for (const id of ids) {
    const d = await page.evaluate(async ({ i, e }) => {
      const g = window.__v7.THREE ? null : null;
      const grp = (await import('/src/entities/CharacterBuilder.js')).buildCharacter(window.__v7.CHARACTER_CONFIGS[i], { detailed: true });
      const t = grp.faceTextures[e];
      return t && t.image ? t.image.toDataURL('image/png') : null;
    }, { i: id, e: expr });
    if (!d) { console.log(`  ✗ ${id}`); continue; }
    writeFileSync(join(OUT, `${id}-${tag}-tile.png`), Buffer.from(String(d).split(',')[1], 'base64'));
    console.log(`  ✓ ${id}`);
  }
  await browser.close();
};
run();
