// Smoke test: boot the Karen fight in ?meshy mode, wait for the GLB to land,
// screenshot the stage. Usage: node meshy_smoke.mjs [--proc] [--out=name.png]
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const proc = process.argv.includes('--proc');
const out = process.argv.find(a => a.startsWith('--out='))?.slice(6) ||
  (proc ? 'smoke_proc.png' : 'smoke_meshy.png');
const OUTDIR = 'C:/Users/agall/AppData/Local/Temp/claude/C--Users-agall-projects-DiL-Simulator/fa0e7e41-3b95-493d-99f2-c721aa26a910/scratchpad';

const run = async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
  const logs = [];
  page.on('console', m => { const t = m.text(); if (t.includes('meshy') || m.type() === 'error') logs.push(`${m.type()}: ${t}`); });
  page.on('pageerror', e => logs.push('pageerror: ' + String(e).split('\n')[0]));
  const url = `${BASE}/?dev&fixture=act7&fight=karen${proc ? '' : '&meshy'}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
  await page.waitForFunction(() => !!window.__combat, { timeout: 20000 });
  // let GLBs finish loading + a few idle cycles
  await page.waitForTimeout(6000);
  const state = await page.evaluate(() => {
    const c = window.__combat;
    const info = window.__engine?.renderer?.info;
    const eg = c?.scene?.enemyGroups?.[0];
    const ag = c?.scene?.allyGroups?.[0];
    const desc = g => {
      if (!g) return null;
      let meshes = 0, skinned = 0;
      g.group.traverse(o => { if (o.isMesh) meshes++; if (o.isSkinnedMesh) skinned++; });
      return { id: g.characterId, meshes, skinned, scale: g.group.scale.x };
    };
    return { phase: c?.phase, enemy: desc(eg), ally: desc(ag), draws: info?.render?.calls, tris: info?.render?.triangles };
  });
  console.log(JSON.stringify(state, null, 2));
  await page.screenshot({ path: `${OUTDIR}/${out}` });
  console.log('shot:', out);
  for (const l of logs) console.log(' ', l);
  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
