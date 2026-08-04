// THROWAWAY regression smoke for the UX fix lane (g-run, lane UX).
//
// The `_interact` re-entrancy guard and the `_combatArming` / `_dialogArming`
// latches are the highest-risk change in the lane: if either ever sticks true
// the player can never interact again. This drives NORMAL play at a human pace
// and asserts that every ordinary interaction still lands.
//
// Usage: node tools/_ux-smoke.mjs [--port=5173]
// HEADED per HANDOFF_PACKAGE §4.7.

import { chromium } from 'playwright';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
// InputManager computes isJustPressed by diffing frames, so a zero-delay
// keyboard.press() can land entirely inside one frame and never register.
// Every key in this harness is held for ~60 ms, the way a human holds it.
const tap = async (key = 'Enter') => {
  await page.keyboard.down(key); await page.waitForTimeout(60); await page.keyboard.up(key);
};
let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fails++;
};
const top = () => page.evaluate(() => {
  const st = window.__explore?.stateManager.stack;
  return st?.[st.length - 1]?.constructor.name || 'none';
});
const latches = () => page.evaluate(() => ({
  pendingCombat: window.__explore._pendingCombat || null,
  pendingDialog: window.__explore._pendingDialog || null,
  combatArming: !!window.__explore._combatArming,
  dialogArming: !!window.__explore._dialogArming,
  paused: !!window.__explore.paused,
}));
const clearDialogs = async (max = 40) => {
  for (let i = 0; i < max; i++) {
    if (await top() === 'ExplorationState') return true;
    await tap();
    await page.waitForTimeout(320);
  }
  return await top() === 'ExplorationState';
};

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act3&shot=cubicle_farm`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1500);

  // 1. A plain interactable (Andrew's desk) still opens.
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(3, 11, ex.tileMap);
    ex.camera.snapTo(3, 11, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(600);
  await tap();
  await page.waitForTimeout(700);
  check('plain interactable opens a dialog', await top() === 'DialogState', `top=${await top()}`);
  await clearDialogs();
  check('latches clear after that dialog', Object.values(await latches()).every(v => !v), JSON.stringify(await latches()));

  // 2. Room change through an exit, then interact in the new room.
  await page.evaluate(() => window.__explore._changeRoom('break_room', 8, 5));
  await page.waitForTimeout(2600);
  const room = await page.evaluate(() => window.__explore.player.currentRoom);
  check('room change lands', room === 'break_room', `room=${room}`);
  const foot = await page.evaluate(() => {
    const ex = window.__explore;
    const tm = ex.tileMap;
    return +(ex.player.mesh.position.y - (tm.heightAt ? tm.heightAt(ex.player.position.x, ex.player.position.z) : 0)).toFixed(3);
  });
  check('player feet on the floor after the change', Math.abs(foot) < 0.01, `delta=${foot}`);

  // 3. Furniture the B1 fix re-solidified must still be interactable from beside it.
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(10, 2, ex.tileMap);   // beside the supply shop at (10,1)
    ex.camera.snapTo(10, 2, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(600);
  const prompt = await page.evaluate(() => document.querySelector('.interact-prompt')?.textContent || '');
  check('re-solidified furniture still offers its prompt', prompt.length > 0, `prompt="${prompt}"`);
  await tap();
  await page.waitForTimeout(900);
  check('and it still opens', await top() !== 'ExplorationState', `top=${await top()}`);
  await tap('Escape');
  await page.waitForTimeout(600);
  await clearDialogs();

  // 4. And you cannot walk through it any more.
  const blocked = await page.evaluate(() => !window.__explore.tileMap.isWalkable(10, 1));
  check('supply shop tile is blocked', blocked);

  // 5. A NORMAL-PACE fight: talk to Karen, read at a human rate, fight starts once.
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.flags = {};
    Object.assign(ex.player.flags, {
      checked_desk: true, met_janet: true, met_intern: true, met_isaiah: true, met_alex_it: true,
      read_janet_intro: true, read_intern_intro: true, read_isaiah_intro: true, read_alex_it_intro: true,
      defeated_intern: true, briefing_complete: true,
      retry_karen: true, karen_retry_ready: true,
    });
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    ex._loadRoom('conference_room', 8, 5.5);
    window.__ux = { starts: [] };
    import('/src/core/EventBus.js').then(({ EventBus }) => {
      EventBus.on('start-combat', (d) => window.__ux.starts.push(typeof d === 'string' ? d : d.encounter));
    });
  });
  await page.waitForTimeout(1600);
  await tap();
  await page.waitForTimeout(700);
  check('Karen dialog opens', await top() === 'DialogState', `top=${await top()}`);
  // Human rate: 700 ms per line, no mashing.
  for (let i = 0; i < 60; i++) {
    const n = await page.evaluate(() => (window.__ux?.starts || []).length);
    if (n > 0) break;
    await tap();
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(3500);
  const st = await page.evaluate(() => (window.__ux?.starts || []).slice());
  check('fight starts exactly once at a human pace', st.length === 1, JSON.stringify(st));
  check('CombatState is up', (await top()) === 'CombatState', `top=${await top()}`);
  const l = await latches();
  check('no latch left set once the fight is up', !l.combatArming && !l.dialogArming, JSON.stringify(l));

  console.log(`\n${fails === 0 ? 'SMOKE PASS' : `SMOKE FAIL (${fails})`}`);
  process.exitCode = fails === 0 ? 0 : 1;
} finally {
  await browser.close();
}
