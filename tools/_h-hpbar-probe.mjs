// HP-BAR PROBE — one metric, measured N times, no screencast.
//
// WHY THIS EXISTS. The round-1 ledger reported the enemy HP bar starting to
// travel at contact +78 ms. That number was CSS ARITHMETIC (style write +
// `transition-delay`), not a reading. The frame sampler in _h-beat-trace.mjs
// printed +226 ms for the same run, and re-running that harness gave numbers
// between +110 and +337 because the CDP screencast stalls the main thread —
// in one run every frame-sampled channel lagged its own event-log entry by
// 213 ms, which is measurement noise, not the build changing.
//
// So: same rAF sampler, SAME frame, no screencast, five consecutive attacks in
// one session, median reported. Both references come out of the same sample
// array, so a stall moves them together and cancels:
//
//   contact  = the frame of PEAK HAND REACH (hips-local), the same definition
//              _h-beat-report.mjs uses.
//   hp start = the first frame `getComputedStyle(.combat-enemy-hp-fill).width`
//              differs from the previous frame by > 0.05 px.
//
// Also printed: style-write -> travel start, which isolates how much of the
// offset is the CSS `transition-delay` and how much is the browser.
//
//   node tools/_h-hpbar-probe.mjs [--port=5173] [--fight=karen] [--n=5] [--tag=x]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=').slice(1).join('=') : d; };
const PORT = arg('port', '5173');
const FIGHT = arg('fight', 'karen');
const N = Number(arg('n', '5'));
const TAG = arg('tag', 'now');
const OUT = join('screenshots', 'h-run', 'hpbar');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 810 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).split('\n')[0]));

await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&fight=${FIGHT}&qtier=high`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
await page.waitForTimeout(1600);

await page.evaluate(() => {
  const c = window.__combat;
  c.engine.player.maxHP = 99999; c.engine.player.hp = 99999; c.engine.player.spd = 999;
  // 400 HP is the same pin _h-beat-trace.mjs uses (--hp=400): each basic attack
  // takes ~6 % of the bar, which is a travel of tens of pixels — far above the
  // 0.05 px detection threshold — and five hits still leave the enemy alive.
  for (const e of c.engine.enemies) { e.maxHP = 400; e.hp = 400; }
});

// One sampler for the whole session; each attack marks its own window.
await page.evaluate(() => {
  const c = window.__combat;
  window.__s = [];
  window.__writes = [];
  const hud = c.hud;
  const orig = hud.updateEnemyHP.bind(hud);
  hud.updateEnemyHP = function (...a) { window.__writes.push(+performance.now().toFixed(2)); return orig(...a); };

  const g = c.scene.allyGroups[0].group;
  let hips = null, hand = null;
  g.traverse(o => { if (o.isBone && o.name === 'Hips') hips = o; if (o.isBone && o.name === 'LeftHand') hand = o; });
  window.__haveRig = !!(hips && hand);
  const V = window.__three_v3 || null;
  const sample = () => {
    const f = { t: +performance.now().toFixed(2) };
    const bar = document.querySelector('.combat-enemy-hp-fill');
    if (bar) f.px = +parseFloat(getComputedStyle(bar).width).toFixed(3);
    if (hips && hand) {
      g.updateMatrixWorld(true);
      const p = hand.getWorldPosition(new hips.position.constructor());
      hips.worldToLocal(p);
      f.reach = +p.length().toFixed(3);
    }
    window.__s.push(f);
    requestAnimationFrame(sample);
  };
  void V;
  requestAnimationFrame(sample);
});

const marks = [];
for (let i = 0; i < N; i++) {
  await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 30000 });
  await page.waitForTimeout(500);
  const t0 = await page.evaluate(() => performance.now());
  await page.click('.combat-action-btn:text-is("Attack")');
  marks.push(t0);
  await page.waitForTimeout(5200);
}

const { s, writes, haveRig } = await page.evaluate(() => ({ s: window.__s, writes: window.__writes, haveRig: window.__haveRig }));
await ctx.close();
await browser.close();

const rows = [];
for (const t0 of marks) {
  const win = s.filter(f => f.t >= t0 - 100 && f.t <= t0 + 1600);
  if (win.length < 10) continue;
  // contact = peak hand reach inside the swing window
  let peak = null;
  for (const f of win) if (f.reach != null && (!peak || f.reach > peak.reach)) peak = f;
  // hp travel start = first >0.05px change after the input
  let start = null, end = null;
  for (let i = 1; i < win.length; i++) {
    if (win[i].px == null || win[i - 1].px == null) continue;
    if (Math.abs(win[i].px - win[i - 1].px) > 0.05) { if (start === null) start = win[i].t; end = win[i].t; }
  }
  const write = writes.find(w => w >= t0 && w <= t0 + 1600);
  if (peak == null || start === null) continue;
  rows.push({
    contactMs: Math.round(peak.t - t0),
    hpStartMs: Math.round(start - t0),
    hpEndMs: Math.round(end - t0),
    styleWriteMs: write != null ? Math.round(write - t0) : null,
    deltaContactMs: Math.round(start - peak.t),
    deltaWriteMs: write != null ? Math.round(start - write) : null,
    travelMs: Math.round(end - start),
    frames: win.length,
  });
}

const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const summary = {
  tag: TAG, fight: FIGHT, runs: rows.length, haveRig, errors,
  medianDeltaContactMs: rows.length ? med(rows.map(r => r.deltaContactMs)) : null,
  medianDeltaWriteMs: rows.length ? med(rows.map(r => r.deltaWriteMs).filter(x => x != null)) : null,
  medianTravelMs: rows.length ? med(rows.map(r => r.travelMs)) : null,
  rows,
};
writeFileSync(join(OUT, `hpbar-${TAG}.json`), JSON.stringify(summary, null, 1));

console.log(`\nHP-BAR PROBE  fight=${FIGHT}  tag=${TAG}  rig=${haveRig}  errors=${errors.length}`);
console.log('  # | contact | styleWrite | hp start | hp end | travel | start-contact | start-write');
rows.forEach((r, i) => console.log(
  `  ${i + 1} | ${String(r.contactMs).padStart(7)} | ${String(r.styleWriteMs).padStart(10)} | ${String(r.hpStartMs).padStart(8)} | ${String(r.hpEndMs).padStart(6)} | ${String(r.travelMs).padStart(6)} | ${String(r.deltaContactMs).padStart(13)} | ${String(r.deltaWriteMs).padStart(11)}`));
console.log(`  MEDIAN start-contact = ${summary.medianDeltaContactMs} ms   start-write = ${summary.medianDeltaWriteMs} ms   travel = ${summary.medianTravelMs} ms`);
