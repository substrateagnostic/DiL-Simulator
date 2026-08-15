// _z-warm-timing — how long does the combat-transition Meshy warm-up actually
// take, against the 2500 ms ceiling in ExplorationState._startCombat?
//
// Runs through the SHIPPING entry point (MeshyCast.preload, exposed on
// window.__meshyCast under ?dev) on a page that has already booted, so the
// number is the warm-up cost alone and not the app boot.
//
//   node tools/_z-warm-timing.mjs [--port=5199] [--ids=karen,andrew] [--cold]
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const PORT = arg('port', '5199');
const IDS = arg('ids', 'karen,andrew').split(',');
const COLD = process.argv.includes('--cold');

const run = async () => {
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  if (COLD) await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&qtier=high`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__explore, { timeout: 60000 });
  await page.waitForTimeout(2500);   // let the room settle so the main thread is idle

  const r = await page.evaluate(async (ids) => {
    const mc = window.__meshyCast;
    if (!mc) return { err: 'no __meshyCast (import the module first)' };
    mc._resetCache();
    const marks = [];
    const t0 = performance.now();
    await mc.preload(ids);
    const t1 = performance.now();
    return {
      totalMs: Math.round(t1 - t0),
      cached: ids.map(id => [id, mc.isCached(mc.resolveId(id, null) || id)]),
      marks,
    };
  }, IDS);
  console.log(`${COLD ? 'COLD (http cache disabled)' : 'WARM (http cache on)'}  ids=${IDS.join(',')}`);
  console.log(JSON.stringify(r));
  console.log(`CEILING in ExplorationState._startCombat = 2500 ms  ->  ${r.totalMs > 2500 ? 'CAST DEGRADES TO PROCEDURAL' : 'meshy cast survives'}`);

  // Second pass: everything is in the session cache, which is the >=2nd fight.
  const r2 = await page.evaluate(async (ids) => {
    const mc = window.__meshyCast;
    const t0 = performance.now();
    await mc.preload(ids);
    return Math.round(performance.now() - t0);
  }, IDS);
  console.log(`second warm-up (session cache hit): ${r2} ms`);

  // Breakdown: raw byte fetch vs MeshyCast.load (fetch + meshopt parse + prep).
  const bd = await page.evaluate(async () => {
    const mc = window.__meshyCast;
    mc._resetCache();
    const out = [];
    for (const id of ['grandma', 'chad']) {
      const url = `/meshy/${mc.MESHY_MODELS[id].url}`;
      let t = performance.now();
      const buf = await fetch(url, { cache: 'reload' }).then(r => r.arrayBuffer());
      const fetchMs = Math.round(performance.now() - t);
      t = performance.now();
      await mc.load(id);
      out.push({ id, bytes: buf.byteLength, fetchMs, loadMs: Math.round(performance.now() - t) });
    }
    return out;
  });
  for (const b of bd) console.log(`  ${b.id}: ${(b.bytes / 1024).toFixed(0)} KB  rawFetch ${b.fetchMs} ms  MeshyCast.load ${b.loadMs} ms (parse+prep, bytes already in http cache)`);

  // The realistic 2nd+ fight: shared clips already warm, ONE new opponent body.
  const NEXT = (arg('next', 'grandma,regional,security_guard,hr_rep,chad')).split(',');
  for (const id of NEXT) {
    const ms = await page.evaluate(async (one) => {
      const mc = window.__meshyCast;
      const t0 = performance.now();
      await mc.preload([one, 'andrew']);
      return Math.round(performance.now() - t0);
    }, id);
    console.log(`  new opponent "${id}" (clips warm, body cold): ${ms} ms  ${ms > 2500 ? '<- DEGRADES' : ''}`);
  }

  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
