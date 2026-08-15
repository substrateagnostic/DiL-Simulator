// FIX ROUND 2 — B23, the still that turns a parked item into a producer GO.
//
// C3 is pre-approved in principle: a defeated enemy should COLLAPSE or SIT
// DOWN rather than vanish. Round 1 went looking for a new clip and stalled on
// the vendor catalog having no list endpoint, which left the item parked on an
// API instead of in front of Alex. It does not need the API. The slate already
// binds a stagger clip to every character — a176 on the male build, a391 on
// the female — and MeshyAnimator.playGesture('defeated') already routes to it
// (MeshyAnimator.js: `if (name === 'defeated') return this.play('stagger')`).
// So the zero-spend proposal is: the defeat beat plays the stagger the cast
// already owns, held on its last frame, instead of a fade-out.
//
// This tool shoots that pose on both builds so the proposal is a picture and
// not a paragraph. It buys nothing and fetches nothing.
//
// Karen is the female build (a391), Chad the male (a176) — MeshyClips.genderFor.
//
//   node tools/_fr2-b23-defeat.mjs [--port=5173]

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/fix-round-2/b23-defeat';
mkdirSync(OUT, { recursive: true });

const SUBJECTS = [
  { fight: 'karen', build: 'female', clip: 'a391' },
  { fight: 'chad',  build: 'male',   clip: 'a176' },
];
// Fractions of the clip to grab: mid-collapse and the last frame, which is the
// pose the proposal actually holds.
const MARKS = [0.30, 0.50, 0.70, 0.90];

const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
const rows = [];

try {
  for (const s of SUBJECTS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act7&fight=${s.fight}`);
    await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
    await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
    await page.waitForTimeout(600);

    const meta = await page.evaluate(() => {
      const c = window.__combat;
      c.inputEnabled = false;
      // Interface off — this is a plate of the pose, not of the fight screen.
      for (const sel of ['#ui-overlay', '.combat-hud', '.combat-actions', '.na-root', '.combat-enemy-intro']) {
        for (const el of document.querySelectorAll(sel)) el.style.display = 'none';
      }
      const an = c.scene.enemyGroups[0]?.animator;
      if (!an) return { error: 'no meshy animator on this enemy — procedural rig' };
      // THE SHIPPING ROUTE, not a hand-picked action: the same call a defeat
      // beat would make.
      an.playGesture('defeated');
      const clip = an.actions?.stagger?.getClip?.();
      window.__engine.stop();
      return { durationMs: clip ? Math.round(clip.duration * 1000) : null, clipName: clip?.name ?? null };
    });
    if (meta.error) { rows.push({ ...s, ...meta }); await page.close(); continue; }

    for (let i = 0; i < MARKS.length; i++) {
      await page.evaluate((frac) => {
        const c = window.__combat;
        const clip = c.scene.enemyGroups[0].animator.actions?.stagger?.getClip?.();
        const target = (clip?.duration ?? 1.2) * frac;
        const dt = 1 / 60;
        let t = 0, guard = 0;
        while (t < target && guard++ < 600) { c.scene.update(dt); c.particles.update(dt); t += dt; }
        window.__engine.renderScene(c.scene.scene, c.scene.camera);
      }, MARKS[i]);
      await page.screenshot({ path: `${OUT}/${s.fight}-${s.build}-${s.clip}-${Math.round(MARKS[i] * 100)}pct.png` });
    }
    rows.push({ ...s, ...meta });
    console.log(`${s.fight} (${s.build}, ${s.clip})  stagger clip ${meta.clipName} ${meta.durationMs} ms  -> 2 plates`);
    await page.close();
  }
  writeFileSync(`${OUT}/report.json`, JSON.stringify(rows, null, 2));
  console.log(`\nPRODUCER GO NEEDED (C3 / B23). Plates: ${OUT}/`);
  console.log(`The ask is one word: does the stagger the cast already owns, held on its`);
  console.log(`last frame, read as "this person lost an argument"? If yes the beat costs a`);
  console.log(`call site and no vendor spend. If no, the item stays parked and we price a`);
  console.log(`fetch instead.`);
} catch (e) {
  console.error('HARNESS ERROR', e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
