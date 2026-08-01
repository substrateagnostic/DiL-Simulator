// PRODUCER-NOTES harness driver.
//
//   node tools/pn-shoot.mjs --tag=r1                       (all six notes, heroes)
//   node tools/pn-shoot.mjs --tag=r1 --only=neck,hands
//   node tools/pn-shoot.mjs --tag=r1 --ids=chad --only=skull
//
// Writes screenshots/v7/pn/<id>-<tag>-<shot>.png and _<note>-<tag>.json.
// Requires `npm run dev` on :5173.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const OUT = 'screenshots/v7/pn';
const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

const HERO = ['andrew', 'karen', 'chad', 'grandma', 'intern'];
const ids = (arg('ids') || HERO.join(',')).split(',').filter(Boolean);
const tag = arg('tag', 'r1');
const only = (arg('only') || 'neck,bands,skull,hands,hair,expr').split(',').filter(Boolean);

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 900, height: 900 } })).newPage();
  page.on('pageerror', e => console.log('  ! pageerror', String(e).split('\n')[0]));
  await page.goto(`${BASE}/?dev`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(async () => { await import('/tools/pn-stage.js'); });

  for (const note of only) {
    const all = {};
    for (const id of ids) {
      try {
        const res = await page.evaluate(async ({ id, note }) => await window.__pn[note](id), { id, note });
        for (const [k, url] of Object.entries(res.shots || {})) {
          if (!url) continue;
          writeFileSync(join(OUT, `${id}-${tag}-${k}.png`), Buffer.from(String(url).split(',')[1], 'base64'));
        }
        all[id] = res.metrics;
        console.log(`  ✓ ${note}/${id}`, summarize(note, res.metrics));
      } catch (e) {
        console.log(`  ✗ ${note}/${id} — ${String(e).split('\n')[0]}`);
      }
    }
    writeFileSync(join(OUT, `_${note}-${tag}.json`), JSON.stringify(all, null, 2));
  }
  await browser.close();
};

function summarize(note, m) {
  if (!m) return '';
  switch (note) {
    case 'neck': return `mean=${m.neckOverHeadMean}  base=${m.neckOverHeadBase}  top=${m.neckOverHeadTop}  aspect=${m.columnAspect}  taper=${m.taperPct}%  bulge=${m.maxBulgePct}%`;
    case 'bands': case 'bandsForm': return `noseMaxGrad=${m.noseBandMaxGradient}  peaks=${m.peakCount}  smear=${m.smearOverNoseWidth}`;
    case 'skull': return `W/H=${m.headWOverH}  heads=${m.headCountSkull}  cranialHold=${m.cranialHoldPct}%  gonialHold=${m.gonialHoldPct}%  roundDev=${m.profileRoundnessDev}`;
    case 'hands': return `placement=${m.thumbPlacement}  mirrored=${m.mirrorConsistent}  rotatedNotMirrored=${m.rotatedNotMirrored}  anteriorBoth=${m.thumbAnteriorBothHands}`;
    case 'hair': return `strandE=${m.strandEnergy}`;
    case 'expr': return `geo=${JSON.stringify(m.geoDelta)}  hasGeo=${m.hasGeometryChannel}`;
    default: return '';
  }
}

run();
