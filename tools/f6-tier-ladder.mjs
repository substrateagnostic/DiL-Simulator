// F6 — is the mobile floor REACHABLE, and at which rung of COMP_CARD's own
// degrade ladder?
//
// COMP_CARD sets two frame budgets ("60fps mid laptop / 30fps recent mobile")
// AND a degrade order for meeting them: AO -> tilt-shift half-res -> bloom
// half-res. The round-2 harness measured the budgets at FULL quality only, so
// its mobile-floor row could only ever fail: it was asking the top tier to hit
// the bottom tier's target.
//
// This walks the ladder at each CPU throttle rate and reports where each budget
// first goes green. Two possible outcomes, both useful:
//   • a rung passes -> that rung IS the shipped low tier, and the budget is met
//     as the document specifies it should be met
//   • no rung passes -> the 4x multiplier is not "recent mobile", it is harsher
//     than any renderer setting can reach, and the proxy has to be re-derived
//     from a real device. Measured, not argued.
//
//   node tools/f6-tier-ladder.mjs [--rooms=...] [--rates=1,2,4] [--seconds=8]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm,reception,parking_garage').split(',').filter(Boolean);
const RATES = arg('rates', '1,2,4').split(',').map(Number);
const SECONDS = +arg('seconds', 8);
const OUT = 'screenshots/perf/f6';
mkdirSync(OUT, { recursive: true });

// Cumulative, in COMP_CARD's stated degrade order. `shadows` is appended
// because the round-2 cost ladder priced it at 100 draw calls for 0.0ms of GPU
// on this machine — i.e. it is pure main-thread submission, which is exactly
// what a CPU-bound floor is made of.
const RUNGS = [
  { id: 'high', label: 'high — as shipped' },
  { id: 'ao', label: '+ AO off (COMP_CARD degrade 1)' },
  { id: 'tilt', label: '+ tilt-shift blur off (degrade 2)' },
  { id: 'bloom', label: '+ bloom off (degrade 3)' },
  { id: 'shadow', label: '+ shadow map off' },
];

const APPLY = (id) => {
  const E = window.__engine;
  // reset to full
  E.setAmbientOcclusion(true);
  E.setTiltShift(true);
  if (E._bloomPass) E._bloomPass.enabled = true;
  E.renderer.shadowMap.enabled = true;
  E.invalidateShadows();
  const order = ['high', 'ao', 'tilt', 'bloom', 'shadow'];
  const upto = order.indexOf(id);
  if (upto >= 1) E.setAmbientOcclusion(false);
  if (upto >= 2) E.setTiltShift(false);
  if (upto >= 3 && E._bloomPass) E._bloomPass.enabled = false;
  if (upto >= 4) E.renderer.shadowMap.enabled = false;
};

const patrol = async (page, seconds) => {
  const seq = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  const end = Date.now() + seconds * 1000;
  let i = 0;
  while (Date.now() < end) {
    const k = seq[i++ % seq.length];
    await page.keyboard.down(k);
    await page.waitForTimeout(Math.max(120, Math.min(1500, end - Date.now())));
    await page.keyboard.up(k);
    if (Date.now() < end) await page.waitForTimeout(70);
  }
};

const measure = async (page, seconds) => {
  await page.evaluate(() => {
    window.__mm = { dt: [], last: performance.now(), on: true, calls: [] };
    const E = window.__engine;
    E.renderer.info.autoReset = false;
    const tick = () => {
      if (!window.__mm.on) return;
      const t = performance.now();
      window.__mm.dt.push(t - window.__mm.last); window.__mm.last = t;
      window.__mm.calls.push(E.renderer.info.render.calls);
      E.renderer.info.reset();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await patrol(page, seconds);
  return page.evaluate(() => {
    window.__mm.on = false;
    window.__engine.renderer.info.autoReset = true;
    const s = [...window.__mm.dt].sort((a, b) => a - b);
    const p = (q) => (s.length ? +s[Math.min(s.length - 1, Math.floor(s.length * q))].toFixed(2) : null);
    const c = [...window.__mm.calls].sort((a, b) => a - b);
    return {
      frames: s.length, p50: p(0.5), p95: p(0.95), p99: p(0.99),
      fps_p50: p(0.5) ? +(1000 / p(0.5)).toFixed(2) : null,
      callsP50: c.length ? c[Math.floor(c.length / 2)] : null,
    };
  });
};

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180',
    '--disable-backgrounding-occluded-windows', '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding', '--disable-features=CalculateNativeWinOcclusion',
    '--ignore-gpu-blocklist', '--force_high_performance_gpu', '--force-device-scale-factor=1',
    '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

const results = [];
for (const room of ROOMS) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto(`${BASE}/?dev&fixture=act7&shot=${room}&hud=0`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  for (let i = 0; i < 8; i++) {
    const busy = await page.evaluate(() => {
      const d = document.querySelector('.dialog-container');
      return (!!d && d.style.display !== 'none' && d.offsetParent !== null)
        || document.body.innerText.includes('EMPLOYEE PORTAL');
    }).catch(() => false);
    if (!busy) break;
    await page.keyboard.down('Enter'); await page.waitForTimeout(90);
    await page.keyboard.up('Enter'); await page.waitForTimeout(280);
  }
  await page.waitForTimeout(2500);

  const cdp = await ctx.newCDPSession(page);
  const rows = [];
  for (const rate of RATES) {
    for (const rung of RUNGS) {
      await page.evaluate(APPLY, rung.id);
      await page.waitForTimeout(450);
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate });
      const m = await measure(page, SECONDS);
      if (rate > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
      rows.push({ rate, rung: rung.id, label: rung.label, ...m });
      console.log(`  ${room} CPU${rate}x ${rung.label.padEnd(34)} p50 ${String(m.p50).padStart(7)} p95 ${String(m.p95).padStart(7)} fps ${String(m.fps_p50).padStart(7)} calls ${m.callsP50}`);
    }
  }
  await page.evaluate(APPLY, 'high');
  results.push({ room, rows });
  await page.close();
}

writeFileSync(`${OUT}/tier-ladder.json`, JSON.stringify({ when: new Date().toISOString(), seconds: SECONDS, results }, null, 2));
console.log(`\nwrote ${OUT}/tier-ladder.json`);
await browser.close();
