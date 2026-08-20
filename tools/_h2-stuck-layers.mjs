// STUCK-LAYER GATE — no finished one-shot may keep accumulating into the pose.
//
// THE DEFECT (found by the H2 attack-feel re-judge, 2026-08-20): every action
// has `clampWhenFinished = true`, and a finished LoopOnce action stays in the
// mixer's active list at FULL WEIGHT, paused on its final frame. MeshyAnimator
// _toIdle() faded the stance back in without fading the finished one-shot out,
// so after one exchange an enemy rendered as the AVERAGE of its stance and
// every clamped final frame that had ever played — the arms-out pseudo A-pose,
// the floating hips ("Karen hovering"), and the muted flinches of the
// producer's original attack-feel note. Invisible to every existing gate: the
// spine gate reads clip DATA, the flash probe reads materials, the beat trace
// reads event timing. Only the mixer's live active-list shows it.
//
// The gate stages a real fight through the shipping fixture path, waits for
// every body to be the Meshy cast, then fires the exact CombatScene beats
// CombatState fires (enemyHurtAnim / enemyCastAnim / enemyAttackAnim /
// allyHurtAnim / playerAttackAnim), lets each finish, and asserts for every
// body: the looping idle is the ONLY accumulating action (weight ~1), and no
// finished one-shot is still contributing above 0.05.
//
//   node tools/_h2-stuck-layers.mjs --port=4519 [--fight=karen] [--legacy]
//
// --legacy sets globalThis.__stuckLayerLegacy (the pre-fix blend) and expects
// the gate to FAIL — a gate that has never been seen to fail is not a gate.
import { chromium } from 'playwright';

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '4519');
const FIGHT = arg('fight', 'karen');
const LEGACY = process.argv.includes('--legacy');

// HEADED, like every capture harness on this project: headless GL renders so
// slowly that the main loop's clamped dt time-dilates the whole game (~0.2x
// measured), and a beat that "never finished" is then the instrument, not the
// animator.
const browser = await chromium.launch({ headless: false, args: ['--window-size=1620,940'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', e => console.log('! pageerror', String(e).split('\n')[0]));
await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&qtier=high`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__explore && !!window.__explore.player, { timeout: 60000 });
await page.waitForTimeout(1500);
if (LEGACY) await page.evaluate(() => { globalThis.__stuckLayerLegacy = true; });
await page.evaluate((fight) => {
  const ex = window.__explore;
  ex.player.flags.retry_karen = true;
  ex.player.flags.karen_retry_ready = true;
  // The beats are driven by hand below; a dead engine cannot end the fight
  // under the probe, so pin the bars out of reach the way _h-beat-videos does.
  ex._startCombat(fight);
}, FIGHT);
await page.waitForFunction(() => !!window.__combat && !!window.__combat.engine, { timeout: 30000 });
await page.evaluate(() => {
  const c = window.__combat;
  c.engine.enemies.forEach(e => { e.maxHP = 99999; e.hp = 99999; });
  c.engine.player.maxHP = 99999; c.engine.player.hp = 99999;
});
await page.waitForFunction(() => {
  const c = window.__combat;
  return c.scene.enemyGroups.every(e => e.group.userData.meshy)
      && c.scene.allyGroups.every(a => a.group.userData.meshy);
}, { timeout: 90000 });
// Wait for the PLAYER-INPUT phase: the engine only moves after a player action,
// so once input is live and no click is ever sent, the real fight flow is
// quiescent and cannot interleave its own beats (holds, impact chains,
// expressions) with the driven sequence below.
await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
await page.waitForTimeout(2500);

// The beat sequence CombatState fires across two exchanges, driven directly on
// the same CombatScene surface, with each one-shot given time to finish
// (longest reaction ≤ 1.5s + 0.3s fade).
const BEATS = [
  ['enemyHurtAnim', 0], ['enemyCastAnim', 0], ['enemyAttackAnim', 0],
  ['allyHurtAnim', 0], ['playerAttackAnim', 0], ['enemyHurtAnim', 0],
];
for (const [fn, idx] of BEATS) {
  await page.evaluate(([f, i]) => { window.__combat.scene[f](i); }, [fn, idx]);
  await page.waitForTimeout(2600);
}
// Long quiet: every crossfade (0.25/0.30s) has finished many times over.
await page.waitForTimeout(2500);

const verdict = await page.evaluate(() => {
  const c = window.__combat;
  const judge = (entry, side, i) => {
    const an = entry.animator;
    if (!an || !an.actions) return null; // procedural slot — nothing to judge
    const rows = [];
    for (const [role, a] of Object.entries(an.actions)) {
      const w = a.getEffectiveWeight();
      const accumulating = (a.isRunning() || a.paused) && w > 0.05;
      if (accumulating) rows.push({ role, w: +w.toFixed(3), t: +a.time.toFixed(2), paused: a.paused });
    }
    return { id: entry.characterId, side, i, active: rows };
  };
  const out = [];
  c.scene.enemyGroups.forEach((e, i) => { const r = judge(e, 'enemy', i); if (r) out.push(r); });
  c.scene.allyGroups.forEach((a, i) => { const r = judge(a, 'ally', i); if (r) out.push(r); });
  return out;
});
await browser.close();

let fail = 0;
for (const body of verdict) {
  const idle = body.active.find(a => a.role === 'idle');
  const stuck = body.active.filter(a => a.role !== 'idle');
  const ok = idle && idle.w > 0.9 && stuck.length === 0;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${body.side}[${body.i}] ${body.id.padEnd(16)} idle=${idle ? idle.w : 'MISSING'} stuck=[${stuck.map(s => `${s.role}@${s.t}s w${s.w}`).join(', ')}]`);
}
if (LEGACY) {
  console.log(fail > 0
    ? `LEGACY MODE: gate FAILS as expected (${fail} bodies carrying stuck layers) — the gate bites.`
    : 'LEGACY MODE: gate PASSED — it can no longer see the defect. Fix the gate.');
  process.exit(fail > 0 ? 0 : 1);
}
console.log(fail === 0 ? 'STUCK-LAYER GATE: PASS' : `STUCK-LAYER GATE: FAIL (${fail} bodies)`);
process.exit(fail === 0 ? 0 : 1);
