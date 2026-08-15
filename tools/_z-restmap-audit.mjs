// _z-restmap-audit — duplicate node names in the cast GLBs.
//
// MeshyRetarget.captureRest() keys the rest pose by NODE NAME and keeps the
// FIRST node with a given name ("Track binding also stops at the first matching
// name"). retargetClip then re-solves world rotations into target locals using
// that map. If a GLB carries two nodes with the same name and the wrong one is
// captured, that bone gets a local rotation solved against a rest frame it does
// not have — which is what a head rotated 180 degrees looks like.
//
//   node tools/_z-restmap-audit.mjs [--port=5199]
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const PORT = arg('port', '5199');

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&qtier=high`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__explore, { timeout: 60000 });
  // Force the meshy module to load by starting (and immediately abandoning) a warm-up.
  await page.evaluate(() => import('/assets/meshy-loader.js').catch(() => null));
  await page.waitForTimeout(500);
  const rows = await page.evaluate(async () => {
    // window.__meshyCast is published by MeshyCast on module evaluation; the
    // combat transition is what imports it, so poke one fight's worth of warm-up.
    if (!window.__meshyCast) {
      await window.__explore._startCombat('karen');
      for (let i = 0; i < 100 && !window.__meshyCast; i++) await new Promise(r => setTimeout(r, 100));
    }
    const mc = window.__meshyCast;
    if (!mc) return [{ id: 'ERR', note: 'meshy module never loaded' }];
    const out = [];
    for (const id of Object.keys(mc.MESHY_MODELS)) {
      const entry = await mc.load(id);
      if (!entry) { out.push({ id, note: 'load failed' }); continue; }
      const seen = new Map();
      let named = 0, bones = 0;
      entry.scene.traverse(o => {
        if (o.isBone) bones++;
        if (!o.name) return;
        named++;
        seen.set(o.name, (seen.get(o.name) || 0) + 1);
      });
      const dupes = [...seen.entries()].filter(([, n]) => n > 1);
      out.push({
        id, bones, named, uniqueNames: seen.size,
        restSize: entry.restPose ? entry.restPose.size : null,
        dupes: dupes.map(([n, c]) => `${n}x${c}`),
      });
    }
    return out;
  });
  let bad = 0;
  for (const r of rows) {
    const flag = (r.dupes && r.dupes.length) ? 'DUP' : '   ';
    if (flag === 'DUP') bad++;
    console.log(`${flag} ${String(r.id).padEnd(24)} bones=${String(r.bones).padStart(3)} named=${String(r.named).padStart(3)} unique=${String(r.uniqueNames).padStart(3)} rest=${String(r.restSize).padStart(3)} ${r.dupes ? r.dupes.join(' ') : (r.note || '')}`);
  }
  console.log(`\n${rows.length} models, ${bad} with duplicate node names`);
  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
