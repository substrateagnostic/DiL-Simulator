// Combat-entry timing + per-character fallback proof for the Meshy cast.
//
// Runs against the PRODUCTION build (vite preview on dist/), because that is
// what Vercel serves and what the cold-load number has to mean. Each run uses a
// fresh browser context so the GLB fetch is genuinely uncached.
//
//   node tools/meshy-entry-timing.mjs                 # cold + warm, karen fight
//   node tools/meshy-entry-timing.mjs --fight=grandma
//   node tools/meshy-entry-timing.mjs --break=karen   # fallback proof: hide a GLB
//   node tools/meshy-entry-timing.mjs --nomeshy       # procedural baseline
//
// Reports: ms from _startCombat() to both combatants standing on the stage,
// bytes fetched under /meshy/, and whether each stage slot is a Meshy skinned
// mesh or the procedural build.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { renameSync, existsSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const FIGHT = args.fight || 'karen';
const REPO = process.cwd();
const BREAK = args.break ? join(REPO, 'public/meshy', `${args.break}_idle.glb`) : null;
const BREAK_BAK = BREAK ? BREAK + '.hidden' : null;

if (BREAK) {
  if (!existsSync(BREAK)) { console.error(`no such GLB: ${BREAK}`); process.exit(1); }
  renameSync(BREAK, BREAK_BAK);
  console.log(`[fallback test] hid ${args.break}_idle.glb`);
}
const restore = () => { if (BREAK_BAK && existsSync(BREAK_BAK)) renameSync(BREAK_BAK, BREAK); };
process.on('exit', restore);

// dist/ is the served root, so a hidden GLB must be hidden there too.
const DIST_BREAK = args.break ? join(REPO, 'dist/meshy', `${args.break}_idle.glb`) : null;
if (DIST_BREAK && existsSync(DIST_BREAK)) {
  renameSync(DIST_BREAK, DIST_BREAK + '.hidden');
  process.on('exit', () => {
    if (existsSync(DIST_BREAK + '.hidden')) renameSync(DIST_BREAK + '.hidden', DIST_BREAK);
  });
}

const preview = spawn(process.execPath, [join(REPO, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4317', '--strictPort'],
  { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
const BASE = 'http://localhost:4317';
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('vite preview did not start')), 30000);
  preview.stdout.on('data', d => { if (String(d).includes('4317')) { clearTimeout(t); resolve(); } });
});

// HEADED with the real GPU. Headless chromium falls back to SwiftShader, where
// a 1024px texture upload costs ~8s per character and the number means nothing:
// the same load measures 62ms on the same machine's actual GPU. Any timing run
// for this asset path has to be headed.
const browser = await chromium.launch({ headless: false, args: ['--window-size=1300,800'] });

async function run(label, { reuse = null } = {}) {
  const ctx = reuse || await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = reuse ? (ctx.pages()[0] || await ctx.newPage()) : await ctx.newPage();
  let glbBytes = 0; const glbFiles = [];
  const warnings = [];
  page.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') warnings.push(m.text()); });
  page.on('response', async res => {
    if (!res.url().includes('/meshy/')) return;
    try { const b = await res.body(); glbBytes += b.length; glbFiles.push(`${res.url().split('/').pop()}:${(b.length / 1024).toFixed(0)}KB`); }
    catch { glbFiles.push(`${res.url().split('/').pop()}:ERR${res.status()}`); }
  });

  const q = args.nomeshy ? '&nomeshy' : '';
  if (!reuse) {
    await page.goto(`${BASE}/?dev&fixture=act7${q}`, { waitUntil: 'load' });
    await page.waitForFunction(() => !!window.__explore, { timeout: 30000 });
    await page.waitForTimeout(1200); // let the room settle so the fade is the only cost
  }

  const t = await page.evaluate(async (fight) => {
    const t0 = performance.now();
    window.__explore._startCombat(fight);
    const deadline = t0 + 20000;
    const skinned = (g) => { let n = 0; g?.group?.traverse(o => { if (o.isSkinnedMesh) n++; }); return n; };
    while (performance.now() < deadline) {
      const c = window.__combat;
      const e = c?.scene?.enemyGroups?.[0];
      const a = c?.scene?.allyGroups?.[0];
      if (e && a) {
        return {
          ms: Math.round(performance.now() - t0),
          enemy: skinned(e) > 0 ? 'meshy' : 'procedural',
          ally: skinned(a) > 0 ? 'meshy' : 'procedural',
        };
      }
      await new Promise(r => setTimeout(r, 16));
    }
    return { ms: -1, enemy: '?', ally: '?' };
  }, FIGHT);

  console.log(`${label.padEnd(24)} entry=${String(t.ms).padStart(5)}ms  enemy=${t.enemy.padEnd(10)} ally=${t.ally.padEnd(10)} net=${(glbBytes / 1024).toFixed(0)}KB [${glbFiles.join(' ')}]`);
  const meshyWarn = warnings.filter(w => w.includes('[meshy]'));
  if (meshyWarn.length) console.log(`  console: ${meshyWarn.slice(0, 3).join(' | ')}`);
  return { ctx, page, t };
}

const cold = await run(`cold (${FIGHT})`);
// Second fight in the SAME session: the GLBs are already parsed and cached in
// MeshyCast, so the warm number is the floor imposed by the fade itself.
await cold.page.evaluate(async () => {
  window.__combat?.stateManager?.pop?.();
  window.__combat = null;
  await new Promise(r => setTimeout(r, 400));
  if (window.__explore) window.__explore.paused = false;
});
await cold.page.waitForTimeout(1200);
await run(`warm (${FIGHT}, same session)`, { reuse: cold.ctx });

await browser.close();
preview.kill();
restore();
process.exit(0);
