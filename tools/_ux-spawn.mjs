// THROWAWAY repro/verify instrument for the UX fix lane (g-run, lane UX).
//
// S2c — spawn height on entering the stairwell. Sampled from the NODE side
// (page.waitForTimeout + a single page.evaluate per sample) rather than an
// in-page rAF loop: an in-page loop starves the game's own loop and reports a
// world that never ticked, which is exactly the convenience-harness trap
// HANDOFF_PACKAGE §4.3 warns about. Every sample here is read off a frame the
// game actually rendered.
//
// Usage: node tools/_ux-spawn.mjs --tag=before --port=5191
// HEADED per HANDOFF_PACKAGE §4.7.

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const tag = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'before';
const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/g-run/ux';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

const sample = () => {
  const ex = window.__explore;
  const tm = ex.roomManager?.currentRoom?.tileMap;
  const p = ex.player;
  const floorY = tm?.heightAt ? tm.heightAt(p.position.x, p.position.z) : 0;
  return {
    room: ex.player.currentRoom,
    meshY: +p.mesh.position.y.toFixed(3),
    floorY: +floorY.toFixed(3),
    delta: +(p.mesh.position.y - floorY).toFixed(3),
    paused: !!ex.paused,
  };
};

try {
  // Act 7 so the Archive's scripted guard encounter cannot fire over the shot.
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&shot=archive&hud=0`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1500);

  const t0 = Date.now();
  await page.evaluate(() => window.__explore._changeRoom('stairwell', 1, 2));

  // Phase 1 — the transition and whatever plays over it. ExplorationState.update
  // does not run while a DialogState is on top, so the float is frozen on screen
  // for exactly as long as the arrival scene lasts. This is the frame the player
  // actually looks at.
  const samples = [];
  let shot = false;
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(100);
    const s = await page.evaluate(sample);
    s.t = Date.now() - t0;
    s.top = await page.evaluate(() => {
      const st = window.__explore.stateManager.stack;
      return st[st.length - 1]?.constructor.name;
    });
    samples.push(s);
    if (!shot && s.room === 'stairwell' && !s.paused) {
      shot = true;
      await page.screenshot({ path: `${OUT}/s2c-first-visible-frame-${tag}.png` });
    }
  }

  // Phase 2 — clear any arrival dialog, hand control back, and let the update
  // loop run free for 2 s. Player.move() lerps the mesh onto the tile height,
  // so this is where the float would self-correct if it ever did.
  for (let i = 0; i < 14; i++) {
    const busy = await page.evaluate(() => {
      const st = window.__explore.stateManager.stack;
      return st[st.length - 1]?.constructor.name !== 'ExplorationState';
    });
    if (!busy) break;
    await page.keyboard.press('Enter');
    await page.waitForTimeout(260);
  }
  await page.waitForTimeout(2000);
  const settled = await page.evaluate(sample);
  settled.t = Date.now() - t0;

  const inRoom = samples.filter(s => s.room === 'stairwell');
  const visible = inRoom.filter(s => !s.paused);
  const worstVisible = Math.max(0, ...visible.map(s => Math.abs(s.delta)));

  console.log(`samples in stairwell: ${inRoom.length} (unpaused: ${visible.length})`);
  console.log(inRoom.map(s => `t${s.t}${s.paused ? 'P' : ''}[${s.top?.replace('State', '')}]d${s.delta}`).join('  '));
  console.log(`ON ARRIVAL, worst visible |meshY - floorY| = ${worstVisible} m`);
  console.log(`AFTER control returns + 2 s of free frames = ${Math.abs(settled.delta)} m  (top=${await page.evaluate(() => { const st = window.__explore.stateManager.stack; return st[st.length - 1]?.constructor.name; })})`);

  // ── Second leg: the ORDINARY route in, from the cubicle farm, where no
  // arrival scene plays — so this isolates whether Player.move()'s terrain
  // lerp ever corrects the float once the player has control.
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act4&shot=cubicle_farm&hud=0`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1500);
  const t1 = Date.now();
  await page.evaluate(() => window.__explore._changeRoom('stairwell', 1, 12));
  const leg2 = [];
  for (let i = 0; i < 22; i++) {
    await page.waitForTimeout(120);
    const s = await page.evaluate(sample);
    s.t = Date.now() - t1;
    s.top = await page.evaluate(() => {
      const st = window.__explore.stateManager.stack;
      return st[st.length - 1]?.constructor.name;
    });
    leg2.push(s);
  }
  const l2 = leg2.filter(s => s.room === 'stairwell' && !s.paused);
  const l2worst = Math.max(0, ...l2.map(s => Math.abs(s.delta)));
  const l2last = l2[l2.length - 1];
  console.log(`\nLEG 2 (cubicle farm -> stairwell, no arrival scene):`);
  console.log(l2.map(s => `t${s.t}[${s.top?.replace('State', '')}]d${s.delta}`).join('  '));
  console.log(`  worst = ${l2worst} m; after ~2.5 s of free frames = ${l2last ? Math.abs(l2last.delta) : 'n/a'} m`);

  writeFileSync(`${OUT}/s2c-${tag}.json`, JSON.stringify({
    tag, samples: inRoom, worstVisible, settled,
    leg2: { samples: l2, worst: l2worst, last: l2last },
  }, null, 2));
} finally {
  await browser.close();
}
