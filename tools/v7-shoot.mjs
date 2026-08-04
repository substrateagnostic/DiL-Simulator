// V7 character measurement harness.
//
//   node tools/v7-shoot.mjs --ids=andrew,karen,chad,grandma --tag=r0
//   node tools/v7-shoot.mjs --all --tag=r4
//
// Writes screenshots/v7/<id>-<tag>-<view>.png plus <id>-<tag>.json (geometry
// truth metrics). Renders are PLAIN-BACKGROUND / NO-GROUND (charmetrics RULE 1);
// pass --strip to also strip material maps for a form-only pass (RULE 2).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const OUT = 'screenshots/v7';
const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const has = (k) => process.argv.includes(`--${k}`);

const HERO = ['andrew', 'karen', 'chad', 'grandma'];
const CAST = ['andrew','skip','janet','alex_it','intern','diane','janitor','karen','chad','grandma',
  'compliance','regional','skip_boss','meredith','rachel','isaiah','hr_rep','security_guard',
  'cfos_assistant','regional_director','algorithm','brand_consultant','restructuring_analyst',
  'corporate_lawyer','data_analytics_lead','chief_of_restructuring','meredith_boss','delia',
  'parking_enforcer','networking_guy','bus_driver','records_clerk','diner_regular','barista',
  'firm_partner','firm_associate','firm_paralegal','reception_client'];
const ids = (arg('ids') || (has('all') ? CAST.join(',') : HERO.join(','))).split(',').filter(Boolean);
const tag = arg('tag', 'r0');
const strip = has('strip');

const run = async () => {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', e => console.log('  ! pageerror', String(e).split('\n')[0]));
  await page.goto(`${BASE}/?dev`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(async () => { await import('/tools/v7-stage.js'); });
  const views = arg('views');
  if (views) await page.evaluate((v) => { window.__v7views = v.split('+'); }, views);

  const summary = {};
  for (const id of ids) {
    try {
      const res = await page.evaluate(async ({ id, strip }) => {
        const r = await window.__v7.shoot(id, { strip, flat: false, views: window.__v7views });
        return r;
      }, { id, strip });
      // (views are set once below)
      for (const [view, data] of Object.entries(res.shots)) {
        const b = Buffer.from(String(data).split(',')[1], 'base64');
        writeFileSync(join(OUT, `${id}-${tag}-${view}.png`), b);
      }
      writeFileSync(join(OUT, `${id}-${tag}.json`), JSON.stringify(res.metrics, null, 2));
      summary[id] = res.metrics;
      const m = res.metrics;
      console.log(`  ✓ ${id}  heads(skull)=${m.headCountSkull}  heads(hair)=${m.headCountHair}  eyeLine=${m.eyeLinePct}%  W/H=${m.headWOverH}  jaw/cranial=${m.jawOverCranialGeo}  crown=${(m.crownY ?? 0).toFixed(3)}`);
    } catch (e) {
      console.log(`  ✗ ${id} — ${String(e).split('\n')[0]}`);
    }
  }
  writeFileSync(join(OUT, `_summary-${tag}.json`), JSON.stringify(summary, null, 2));
  await browser.close();
};

run();
