// WHITE-RUN PROBE — the instrument for the flashEnemy re-entrancy fix.
//
// The judge's complaint was not "the boss looks wrong in a screenshot"; it was
// that a material-swap flash could leave an enemy painted pure white for the
// rest of the fight. A screenshot cannot prove the absence of that. This can.
//
// WHAT IT MEASURES. At 20 Hz, for 10 s past a real Composure Break, it walks
// `CombatScene.enemyGroups[0].group` and counts the meshes currently wearing a
// PURE-WHITE MeshBasicMaterial. The test is deliberately generic —
// `m.isMeshBasicMaterial && m.color.getHex() === 0xffffff` — and not an identity
// check against the shared white material the fix introduces, so the instrument
// stays honest about the implementation it is grading.
//
// PASS = every contiguous white run <= 200 ms AND the final sample reads 0.
// (The flash is authored at 150 ms; 200 ms is one 20 Hz sample of slack.)
//
// HOW THE BREAK IS PROVOKED. Composure only falls to WEAKNESS-tagged hits, so
// the ability differs per boss: karen is weak `legal` (file_motion), grandma
// `audit` (spot_check), chad `social` (raise_concerns). `composure = 5` puts
// every one of them exactly one weakness hit from the Break.
//
// HEADED chromium, `?qtier=high` pinned — the adaptive governor degrades on
// camera otherwise (documented law, HANDOFF 4.7).
//
//   node tools/_h-flash-probe.mjs [--port=5173] [--only=karen,grandma,chad]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=').slice(1).join('=') : d; };
const PORT = arg('port', '5173');
const ONLY = (arg('only', '') || '').split(',').filter(Boolean);
const OUT = join('screenshots', 'h-run', 'flash-probe');
mkdirSync(OUT, { recursive: true });

// boss id -> the weakness-tagged starter that drops its Composure
const SUBJECTS = [
  { fight: 'karen', ability: 'file_motion', tag: 'legal', stagger: 'a391 (f)' },
  { fight: 'grandma', ability: 'spot_check', tag: 'audit', stagger: 'a391 (f)' },
  { fight: 'chad', ability: 'raise_concerns', tag: 'social', stagger: 'a176 (m)' },
];

const SAMPLE_HZ = 20;
const WINDOW_MS = 10000;
const RUN_CEILING_MS = 200;

const rows = [];

for (const s of SUBJECTS) {
  if (ONLY.length && !ONLY.includes(s.fight)) continue;
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).split('\n')[0]));

  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&fight=${s.fight}&qtier=high`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
  await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
  await page.waitForTimeout(1500);

  // Pin the fight open so nothing dies mid-measurement, and arm the Break.
  await page.evaluate(() => {
    const c = window.__combat;
    c.engine.player.maxHP = 9999; c.engine.player.hp = 9999; c.engine.player.mp = 9999;
    c.engine.player.spd = 999;
    for (const e of c.engine.enemies) { e.maxHP = 9000; e.hp = 9000; e.composure = 5; }
  });

  // Install the sampler BEFORE the hit so the pre-hit baseline is on the record.
  await page.evaluate((hz) => {
    const c = window.__combat;
    const entry = c.scene.enemyGroups[0];
    window.__white = [];
    window.__whiteT0 = performance.now();
    let meshes = 0;
    entry.group.traverse(ch => { if (ch.isMesh) meshes++; });
    window.__whiteMeshes = meshes;
    window.__whiteTimer = setInterval(() => {
      let n = 0;
      entry.group.traverse(ch => {
        if (!ch.isMesh) return;
        const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
        for (const m of mats) {
          if (m && m.isMeshBasicMaterial && m.color && m.color.getHex() === 0xffffff) { n++; break; }
        }
      });
      window.__white.push([+(performance.now() - window.__whiteT0).toFixed(1), n]);
    }, 1000 / hz);
  }, SAMPLE_HZ);

  await page.waitForTimeout(500);

  // The real Break, through the shipping code path.
  const fired = await page.evaluate((abilityId) => {
    const c = window.__combat;
    const before = c.engine.enemies[0].composure;
    c._executeAbility(abilityId, 0);
    return { before, after: c.engine.enemies[0].composure, broken: !!c.engine.enemies[0].broken };
  }, s.ability);

  await page.waitForTimeout(WINDOW_MS);

  const data = await page.evaluate(() => {
    clearInterval(window.__whiteTimer);
    return { samples: window.__white, meshes: window.__whiteMeshes };
  });

  await ctx.close();
  await browser.close();

  // Contiguous runs where at least one mesh reads white.
  const runs = [];
  let start = null, prev = null;
  for (const [t, n] of data.samples) {
    if (n > 0 && start === null) start = t;
    if (n === 0 && start !== null) { runs.push([start, prev]); start = null; }
    prev = t;
  }
  if (start !== null) runs.push([start, prev]);          // still white at the end
  const durations = runs.map(([a, b]) => Math.round(b - a) + Math.round(1000 / SAMPLE_HZ));
  const last = data.samples.length ? data.samples[data.samples.length - 1][1] : -1;
  const longest = durations.length ? Math.max(...durations) : 0;
  const pass = longest <= RUN_CEILING_MS && last === 0;

  rows.push({
    fight: s.fight, ability: s.ability, tag: s.tag, stagger: s.stagger,
    meshes: data.meshes, samples: data.samples.length,
    composureBefore: fired.before, composureAfter: fired.after, broke: fired.broken,
    runs: runs.map(([a, b], i) => ({ fromMs: Math.round(a), toMs: Math.round(b), durMs: durations[i] })),
    longestRunMs: longest, lastSampleWhite: last, pass, errors,
  });
  console.log(`${s.fight.padEnd(9)} meshes=${String(data.meshes).padStart(3)} runs=${runs.length} longest=${longest}ms lastWhite=${last} -> ${pass ? 'PASS' : 'FAIL'}`);
  writeFileSync(join(OUT, `${s.fight}-samples.json`), JSON.stringify(data.samples));
}

writeFileSync(join(OUT, 'white-runs.json'), JSON.stringify(rows, null, 1));

const md = [
  '# WHITE-RUN TABLE — flashEnemy re-entrancy',
  '',
  `sampler ${SAMPLE_HZ} Hz, window ${WINDOW_MS / 1000} s past a real Composure Break, headed, qtier=high.`,
  `PASS = longest contiguous white run <= ${RUN_CEILING_MS} ms AND last sample white 0.`,
  '',
  '| fight | stagger | weakness hit | meshes | white runs | longest run | last sample | verdict |',
  '|---|---|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.fight} | ${r.stagger} | ${r.ability} (${r.tag}) | ${r.meshes} | ${r.runs.length} | **${r.longestRunMs} ms** | ${r.lastSampleWhite} | ${r.pass ? 'PASS' : 'FAIL'} |`),
  '',
  '## run detail',
  ...rows.flatMap(r => [
    '', `**${r.fight}** — composure ${r.composureBefore} -> ${r.composureAfter}, broke=${r.broke}, ${r.samples} samples, ${r.errors.length} page errors`,
    ...r.runs.map(x => `  - ${x.fromMs} .. ${x.toMs} ms  (${x.durMs} ms)`),
    ...(r.runs.length ? [] : ['  - (no white sampled)']),
  ]),
  '',
].join('\n');
writeFileSync(join(OUT, 'white-runs.md'), md);
console.log('\n' + md);
