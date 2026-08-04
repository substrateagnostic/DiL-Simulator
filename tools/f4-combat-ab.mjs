// F4: like-for-like combat look A/B across two dev servers.
//
// The problem this solves: a single wall-clock combat still is not comparable
// between two builds. `?dev&fight=` runs a live turn loop, so at any fixed wait
// the two builds are at different points of a telegraph and the enemy may be
// facing away in one and forward in the other — which is exactly why the last
// round's fight-karen still could not certify "no visual regression".
//
// Method: freeze the engine (window.__combat + __engine.stop(), the rig
// tools/cine-shoot.mjs already proves), then hand-step the sim a FIXED number of
// frames and capture a STRIP on each side. Poses still start from different
// phases, so the comparison is the MINIMUM odiff over every cross pair: that
// finds the best pose alignment between the two strips, and whatever is left is
// the look delta (grade, AO, antialiasing, pixel ratio) rather than animation
// phase. Both strips are kept for eyeballing.
//
//   node tools/f4-combat-ab.mjs --fights=karen,chad --before=http://localhost:5273
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { compare } from 'odiff-bin';

const DIR = path.resolve('screenshots/f4');
fs.mkdirSync(DIR, { recursive: true });
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const FIGHTS = arg('fights', 'karen,chad,grandma').split(',');
const AFTER = arg('after', 'http://localhost:5173');
const BEFORE = arg('before', 'http://localhost:5273');
const FRAMES = +arg('frames', 6);
const STEP = +arg('step', 5);        // sim frames between captures

// Pinned PRNG: blink timers, wander and camera shake are Math.random-driven and
// would add noise on top of the pose phase we are already fighting.
const SEED = `(() => { let s = 20260730 >>> 0;
  Math.random = () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
})();`;

const browser = await chromium.launch({
  headless: true,   // the committed contact sheet is headless; keep the path identical on both sides
  args: ['--force-device-scale-factor=1'],
});

const strip = async (base, fight, tag) => {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(SEED);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${base}/?dev&fixture=act7&fight=${fight}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  // Some fights open with a pre-dialog, so CombatState.enter() (which publishes
  // window.__combat) can land seconds after __shotReady. Wait on the handle, not
  // on a guessed delay.
  await page.waitForFunction(() => !!window.__combat, { timeout: 30000 });
  await page.waitForTimeout(1200);
  const ok = await page.evaluate(() => {
    const c = window.__combat;
    if (!c) return false;
    for (const el of Array.from(document.querySelectorAll('.combat-enemy-intro'))) el.remove();
    c.inputEnabled = false;
    window.__engine.stop();
    window.__engine.renderScene(c.scene.scene, c.scene.camera);
    return true;
  });
  if (!ok) { await ctx.close(); throw new Error(`no window.__combat for ${fight} on ${base}`); }
  const files = [];
  for (let f = 0; f < FRAMES; f++) {
    await page.evaluate((n) => {
      const c = window.__combat;
      for (let k = 0; k < n; k++) {
        c.scene.update(1 / 60);
        if (c.cine) c.cine.update(1 / 60);
        if (c.particles) c.particles.update(1 / 60);
      }
      window.__engine.renderScene(c.scene.scene, c.scene.camera);
    }, f === 0 ? 0 : STEP);
    await page.waitForTimeout(80);
    const p = path.join(DIR, `combat_${fight}_${tag}_${f}.png`);
    await page.screenshot({ path: p });
    files.push(p);
  }
  await ctx.close();
  if (errs.length) console.log(`   (page errors on ${tag}: ${errs.slice(0, 2).join(' | ')})`);
  return files;
};

const out = [];
for (const fight of FIGHTS) {
  try {
    const b = await strip(BEFORE, fight, 'before');
    const a = await strip(AFTER, fight, 'after');
    let best = null;
    for (let i = 0; i < b.length; i++) {
      for (let j = 0; j < a.length; j++) {
        const r = await compare(b[i], a[j], path.join(DIR, `combat_${fight}_x_${i}${j}.png`),
          { threshold: 0.1, antialiasing: true, outputDiffMask: false });
        const pct = r.match ? 0 : r.diffPercentage;
        if (!best || pct < best.pct) best = { pct, i, j, count: r.diffCount || 0 };
      }
    }
    // Keep the mask for the best pair only.
    const mask = path.join(DIR, `combat_${fight}_BEST_diff.png`);
    const bestRes = await compare(b[best.i], a[best.j], mask,
      { threshold: 0.1, antialiasing: true, outputDiffMask: true });
    // Same-side control: two poses from the SAME build, adjacent frames. This is
    // how much a 5-sim-frame pose shift alone moves the image — the floor the
    // cross-build number has to be read against.
    const ctlB = await compare(b[0], b[1], path.join(DIR, `combat_${fight}_ctl_before.png`),
      { threshold: 0.1, antialiasing: true, outputDiffMask: false });
    const ctlA = await compare(a[0], a[1], path.join(DIR, `combat_${fight}_ctl_after.png`),
      { threshold: 0.1, antialiasing: true, outputDiffMask: false });
    // CROSS-MIN CONTROL, and this is the one that decides whether a nonzero
    // best-pair number means anything. A second, independent strip from the SAME
    // build gets the identical best-of-all-pairs treatment. If that also lands
    // above zero, the residual is animation PHASE that no pair on the capture grid
    // happens to align — not a look delta. Round 1 reported meredith_boss at 0.62%
    // with karen/chad/grandma at 0 and could not say which it was.
    const a2 = await strip(AFTER, fight, 'after2');
    let bestCtl = null;
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < a2.length; j++) {
        const r = await compare(a[i], a2[j], path.join(DIR, `combat_${fight}_c_${i}${j}.png`),
          { threshold: 0.1, antialiasing: true, outputDiffMask: false });
        const pct = r.match ? 0 : r.diffPercentage;
        if (!bestCtl || pct < bestCtl.pct) bestCtl = { pct, i, j, count: r.diffCount || 0 };
      }
    }
    out.push({ fight, best, bestRes, ctlBefore: ctlB, ctlAfter: ctlA, bestCtl });
    console.log(`\n=== fight-${fight}`);
    console.log(`  best cross pair before[${best.i}] vs after[${best.j}]: ${best.pct}% (${best.count} px) → ${path.basename(mask)}`);
    console.log(`  best cross pair SAME BUILD after vs after2: ${bestCtl.pct}% (${bestCtl.count} px)  ← the floor for the line above`);
    console.log(`  pose-shift control (same build, 5 sim frames apart): before ${ctlB.match ? 0 : ctlB.diffPercentage}% · after ${ctlA.match ? 0 : ctlA.diffPercentage}%`);
  } catch (e) {
    console.log(`  ✗ ${fight} — ${e.message}`);
  }
}
// Clean the 36 throwaway cross masks, keep strips + BEST masks.
for (const f of fs.readdirSync(DIR)) if (/combat_.*_[xc]_\d\d\.png$/.test(f)) fs.rmSync(path.join(DIR, f));
fs.writeFileSync(path.join(DIR, 'combat-ab.json'), JSON.stringify({ before: BEFORE, after: AFTER, frames: FRAMES, step: STEP, out }, null, 2));
await browser.close();
