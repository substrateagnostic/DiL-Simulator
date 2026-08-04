// THROWAWAY: prove the two RENAMED combat GLBs are actually fetched and parsed
// by the shipping loader, not silently 404'd into the procedural fallback.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/naming-sweep';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ headless: false, args: ['--use-gl=angle', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const net = [];
page.on('response', r => { if (r.url().includes('/meshy/')) net.push(`${r.status()} ${r.url().split('/').pop()}`); });

await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&hud=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });

const res = await page.evaluate(async () => {
  const M = await import('/src/combat/MeshyCast.js');
  await M.preload(['skip_boss', 'meredith_boss']);
  const out = {};
  for (const id of ['skip_boss', 'meredith_boss']) {
    const inst = M.instance(id);
    let meshes = 0;
    if (inst) (inst.scene || inst).traverse(c => { if (c.isSkinnedMesh) meshes++; });
    out[id] = {
      url: M.MESHY_MODELS[id]?.url,
      cached: M.isCached(id),
      loaded: !!inst,
      meshes,
    };
  }
  return out;
});
await sleep(500);
console.log('MESHY network:', net.join(' | ') || '(none)');
console.log(JSON.stringify(res, null, 2));
const ok = net.every(l => l.startsWith('200')) && net.some(l => l.includes('skip_boss_idle.glb'))
  && net.some(l => l.includes('meredith_boss_idle.glb'))
  && res.skip_boss.loaded && res.meredith_boss.loaded;
await page.screenshot({ path: path.join(OUT, 'E-glb-probe.png') });
console.log(ok ? 'GLB-PROBE PASS' : 'GLB-PROBE FAIL');
await browser.close();
process.exit(ok ? 0 : 1);
