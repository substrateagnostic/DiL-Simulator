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
    case 'hair': return `strandE=${m.strandEnergy}  seamMax=${m.seamMax} (${m.seamOverStrand}×)  streak front/q34=${m.streakPctFront}/${m.streakPctQ34}%  lowY=${m.streakLowYInHeadR}R  fwdZ=${m.streakFrontZInHeadR}R`;
    case 'expr': return `geo=${JSON.stringify(m.geoDelta)}  hasGeo=${m.hasGeometryChannel}`;
    case 'shoes': return `plan=${m.footprintAspect}  prof=${m.profileAspect}  toe/heel=${m.toeHeelRatio}  blunt=${m.toeBoxBlunt}  sole(prof/iso)=${m.soleShareProfile}/${m.soleShareIso}  step=${m.soleValueStep}`;
    case 'garment': return `hemBelowHip=${m.hemBelowHip}  /torso=${m.hemBelowHipOverTorso}  flat=${m.hemFlatness}  step=${m.hemValueStep}  waist/chest=${m.waistOverChest}  hip/waist=${m.hipOverWaist}`;
    case 'grip': return `gap=${m.gapWorld}  /hand=${m.gapOverHand}  contact=${m.contact}${m.error ? ' ' + m.error : ''}`;
    case 'bill': return `proj=${m.projectionOverHeadR}R  len=${m.billLengthOverHeadR}R  vis prof/q34/front/back=${m.billVisibleProfilePct}/${m.billVisibleQ34Pct}/${m.billVisibleFrontPct}/${m.billVisibleBack34Pct}%`;
    case 'idle': return `top±=${m.topRangePx}px  worstWidth±=${m.worstWidthSwingPx}px  shellScaleY±=${m.shellScaleYRange}  shellScaleX±=${m.shellScaleXRange}  seamTravel head/arm=${m.seamTravelHeadsHead}/${m.seamTravelHeadsArm} heads  (head=${m.pxPerHeadHeight}px)`;
    case 'profile': return `chin=${m.chinFrontOverHeadR}R nose=${m.noseFrontOverHeadR}R chin/nose=${m.chinOverNose}  jawProj=${m.jawProjOverNeck}R  submental=${m.submentalRunOverHeadR}R  gonial=${m.gonialProjOverNeck}R  cervico=${m.cervicomentalDeg}deg  nose=${m.noseProjOverHeadR}R  occiput=${m.occiputBulgeOverHeadR}R@${m.occiputPeakYInHeadR}  ear proud=${m.earProudOverHeadR}R vis prof/q34=${m.earVisibleProfilePct}/${m.earVisibleQ34Pct}%`;
    case 'iris': return `drift=${m.maxDriftFromNeutral} (${m.worstExpr})  consistent=${m.consistent}`;
    default: return '';
  }
}

run();
