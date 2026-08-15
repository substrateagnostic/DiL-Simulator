// FIX ROUND 2 — B21: the AFTER number the round was missing.
//
// The playtest note is "enemy attacks too fast to read". The combat hunt
// measured the residual as ATTACKER-ON-CAMERA TIME: with the reverse cut at
// contact+60 ms the attacker was visible for 293 ms on the female attack clip
// and 426 ms on the male. Round 1 moved the cut to contact+180 ms — one line in
// CombatCinematics.ENEMY_ATTACK — and then reported the improvement as
// arithmetic (+120 ms) with no post-fix reading. This is the reading.
//
// METHOD — the shipping path, stepped deterministically.
//   * Boot a real fight, let the intro settle, then FREEZE the engine loop
//     (window.__engine.stop()) exactly as tools/cine-shoot.mjs does, because a
//     headless wall clock runs the game clock in slow motion and would measure
//     the harness.
//   * Fire the REAL beat: cine.play('enemy_attack', { contactMs:
//     scene.enemyContactMs(0) }) + scene.enemyAttackAnim(0). contactMs comes
//     off the live MeshyAnimator, so the clip trim table is in the loop and the
//     male/female split is the real one (a191 contact 0.383 s after its trim,
//     a214 0.250 s).
//   * Step scene + cinematics by hand at 1/60 and read TWO boundaries:
//       CUT — ms from the first frame of the beat to the frame the reverse cut
//         to the victim is issued. This is the hunt's own boundary: replayed on
//         the pre-fix cut this instrument returns 293 ms female / 426 ms male,
//         bit-exact against the numbers in the playtest note, which is how we
//         know it is the same method and not a new one.
//       IN FRAME — the last frame the attacking body's chest still projects
//         inside the viewport. The cut is an ease, not a hard switch, so the
//         body lingers ~130 ms past the cut; this is the generous reading.
//   * A/B in ONE instrument: the `before` arm replays the identical beat with
//     every post-contact CAMERA step pulled back 120 ms, which is exactly the
//     one line round 1 changed. So the delta is measured, not asserted.
//
// Karen is the female build and Chad the male build (MeshyClips.genderFor).
//
//   node tools/_fr2-b21.mjs [--port=5173]

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/fix-round-2';
mkdirSync(OUT, { recursive: true });

const FIGHTS = [
  { fight: 'karen', build: 'female', clip: 'a214' },
  { fight: 'chad',  build: 'male',   clip: 'a191' },
];

const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
const results = [];

try {
  for (const spec of FIGHTS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act7&fight=${spec.fight}`);
    await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
    await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
    await page.waitForTimeout(600);

    const row = await page.evaluate(async (shiftMs) => {
      const c = window.__combat;
      const THREE = await import('/node_modules/three/build/three.module.js');

      const run = (pullBackMs) => {
        // Reset the stage so the second arm starts from the same geometry as
        // the first (enemyAttackAnim drives a travel tween on the body).
        c.scene.enemyGroups[0]?._travel?.stop?.();
        const e = c.scene.enemyGroups[0];
        e.group.position.set(e.baseX, e.group.position.y, e.baseZ);
        c.inputEnabled = false;
        window.__engine.stop();

        const contactMs = c.scene.enemyContactMs(0, 'attack', 200);
        c.cine.play('enemy_attack', {
          heavy: false,
          contactMs,
        });
        // THE A/B: pull every post-contact CAMERA step back by `pullBackMs`.
        // That reproduces the pre-round-1 cut (contact+60 ms) without touching
        // src, so both arms are the same code on the same frame budget.
        const impactT = c.cine._active.steps.find(s => s.impact)?.t ?? 0;
        if (pullBackMs) {
          for (const s of c.cine._active.steps) {
            if (s.cam !== undefined && s.t > impactT) s.t = Math.max(impactT, s.t - pullBackMs / 1000);
          }
          c.cine._active.steps.sort((a, b) => a.t - b.t);
        }
        const cutT = c.cine._active.steps.find(s => s.t > impactT && s.cam !== undefined && s.cam !== 'rest')?.t ?? null;
        c.scene.enemyAttackAnim(0);

        const cam = c.scene.camera;
        const p = new THREE.Vector3();
        const onCamera = () => {
          const g = c.scene.enemyGroups[0].group;
          g.updateWorldMatrix(true, false);
          p.set(0, 1.2, 0).applyMatrix4(g.matrixWorld).project(cam);
          return p.z < 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;
        };

        const dt = 1 / 60;
        let t = 0, lastOn = -1, firstOff = null;
        const samples = [];
        for (let f = 0; f < 180; f++) {
          c.scene.update(dt);
          c.cine.update(dt);
          c.particles.update(dt);
          t += dt;
          const on = onCamera();
          samples.push(on ? 1 : 0);
          if (on) lastOn = t;
          else if (firstOff === null && lastOn >= 0) firstOff = t;
          if (!c.cine._active && firstOff !== null) break;
        }
        window.__engine.start?.();
        return {
          contactMs,
          cutFromStartMs: cutT === null ? null : Math.round(cutT * 1000),
          cutAfterContactMs: cutT === null ? null : Math.round((cutT - impactT) * 1000),
          attackerOnCameraMs: Math.round((firstOff ?? lastOn) * 1000),
          samples: samples.join(''),
        };
      };

      const after = run(0);
      const before = run(shiftMs);
      return { before, after };
    }, 120);

    results.push({ ...spec, ...row });
    const d = (a, b) => `${b - a > 0 ? '+' : ''}${b - a}`;
    console.log(`${spec.fight} (${spec.build} build, ${spec.clip})  contact ${row.after.contactMs} ms`);
    console.log(`   ATTACKER ON CAMERA, to the cut  ${row.before.cutFromStartMs} -> ${row.after.cutFromStartMs} ms  (${d(row.before.cutFromStartMs, row.after.cutFromStartMs)})`);
    console.log(`   ATTACKER ON CAMERA, in frame    ${row.before.attackerOnCameraMs} -> ${row.after.attackerOnCameraMs} ms  (${d(row.before.attackerOnCameraMs, row.after.attackerOnCameraMs)})`);
    console.log(`   cut moved contact+${row.before.cutAfterContactMs} ms -> contact+${row.after.cutAfterContactMs} ms`);
    await page.close();
  }
  writeFileSync(`${OUT}/b21-oncamera.json`, JSON.stringify(results, null, 2));
  console.log(`\nwrote ${OUT}/b21-oncamera.json`);
} catch (e) {
  console.error('HARNESS ERROR', e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
