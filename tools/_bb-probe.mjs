// BODY-BOB bench driver. Runs tools/_bb-stage.js `bob()` over the hero cast in
// idle / walk / sit at EXPLORATION bobScale (the path the producer is looking
// at) and, for contrast, at combat bobScale.
//
//   node tools/_bb-probe.mjs --tag=before [--port=5311] [--ids=andrew,janet]
//
// Writes screenshots/bb/<tag>/<id>-<mode>-fNN.png and _bob-<tag>.json.
// Requires a dev server on --port.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const PORT = arg('port', '5311');
const tag = arg('tag', 'before');
const ids = (arg('ids') || 'andrew,janet,karen').split(',').filter(Boolean);
const OUT = join('screenshots', 'bb', tag);

const LEGACY = process.argv.includes('--legacy');
const CASES = [
  { mode: 'idle', combat: false },
  { mode: 'walk', combat: false },
  { mode: 'sit', combat: false },
  { mode: 'idle', combat: true },
];

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: 900, height: 900 } })).newPage();
page.on('pageerror', e => console.log('  ! pageerror', String(e).split('\n')[0]));
await page.goto(`http://localhost:${PORT}/?dev`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const ensureStage = async () => { if (!(await page.evaluate(() => !!window.__bb))) await page.evaluate(async () => { await import('/tools/_bb-stage.js'); }); };
await ensureStage();

const all = {};
for (const id of ids) {
  for (const c of CASES) {
    const key = `${id}-${c.mode}${c.combat ? '-combat' : ''}`;
    try {
      await ensureStage();
      const res = await page.evaluate(async (a) => await window.__bb.bob(a.id, a.o), { id, o: { ...c, legacy: LEGACY } });
      for (const [k, url] of Object.entries(res.shots || {})) {
        if (!url) continue;
        writeFileSync(join(OUT, `${id}${c.combat ? '-combat' : ''}-${k}.png`), Buffer.from(String(url).split(',')[1], 'base64'));
      }
      all[key] = res.metrics;
      const m = res.metrics;
      console.log(`  ${key.padEnd(22)} SHEAR=${String(m.shearMm).padStart(6)}mm  bodyTravel=${String(m.bodyTravelMm).padStart(6)}mm  hemThroughHip=${m.hemThroughHipM}m (${m.hemThroughHipPct}% of torso)  silTop±${m.silTopRangePx}px silBot±${m.silBotRangePx}px  NECKcrop raw=${m.px.neck.rawWorstAbsL} headReg=${m.px.neck.headRegWorstAbsL}  WAISTcrop raw=${m.px.waist.rawWorstAbsL} headReg=${m.px.waist.headRegWorstAbsL}  (head=${m.pxPerHeadHeight}px)`);
    } catch (e) {
      console.log(`  x ${key} — ${String(e).split('\n')[0]}`);
    }
  }
}
writeFileSync(join(OUT, `_bob-${tag}.json`), JSON.stringify(all, null, 2));
await browser.close();
console.log(`\nwrote ${join(OUT, `_bob-${tag}.json`)}`);
