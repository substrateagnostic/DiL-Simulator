// THROWAWAY verification instrument for THE NAMING SWEEP (2026-08-04).
//
// Four legs, all through the shipping code path, headed Chromium:
//   (A) real boot, brand-new game, no save present
//   (B) a PRE-RENAME save seeded into localStorage — must not crash the boot
//   (C) a real fight against `meredith_boss` reached by walking into the Board Room
//   (D) a real dialog with `skip`, opened with a real `e` keypress
//
// Usage: node tools/_n-rename-verify.mjs [--port=5173]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/naming-sweep';
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const lines = [];
const say = (s) => { console.log(s); lines.push(s); };
let fails = 0;
const check = (n, ok, d = '') => { say(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };

const browser = await chromium.launch({ headless: false, args: ['--use-gl=angle', '--enable-gpu'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

const top = () => page.evaluate(() => {
  const st = window.__explore?.stateManager?.stack;
  return st?.[st.length - 1]?.constructor?.name || 'none';
});
const tap = async (k = 'Enter', ms = 90) => { await page.keyboard.down(k); await sleep(ms); await page.keyboard.up(k); await sleep(150); };

try {
  // ── (A) REAL BOOT, NEW GAME ───────────────────────────────────────────────
  await page.goto(`http://localhost:${PORT}/?dev`, { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await sleep(2500);
  // Title -> NEW GAME -> slot 1
  for (let i = 0; i < 6 && await top() !== 'ExplorationState'; i++) await tap('Enter');
  await sleep(2500);
  const bootState = await top();
  const bootRoom = await page.evaluate(() => window.__explore?.player?.currentRoom);
  await page.screenshot({ path: path.join(OUT, 'A-real-boot-new-game.png') });
  check('(A) real boot reaches ExplorationState', bootState === 'ExplorationState', `top=${bootState} room=${bootRoom}`);
  check('(A) no page errors during boot', errors.length === 0, errors.slice(0, 3).join(' | '));

  // ── (B) STALE PRE-RENAME SAVE ─────────────────────────────────────────────
  // Exactly the shape a playtester's browser holds right now: a room id and a
  // flag set that this build no longer has any of.
  errors.length = 0;
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('trust_issues_save_1', JSON.stringify({
      version: 2,
      currentRoom: 'ross_office',
      position: { x: 4, z: 4 },
      actIndex: 5,
      stats: { hp: 90, maxHP: 120, mp: 30, maxMP: 40, atk: 14, def: 12, spd: 11, level: 6, xp: 2200, aum: 500000 },
      inventory: [{ id: 'coffee_large', qty: 2 }],
      questStates: {},
      upgradePoints: 1,
      deaths: 2,
      party: ['janet'],
      flags: {
        briefing_complete: true, ready_for_ross: true, branch_chosen: true,
        karen_defeated: true, ross_post_karen: true, chad_defeated: true, ross_post_chad: true,
        grandma_defeated: true, act2_complete: true, defeated_ross_boss: true,
        ross_defeated: true, act3_complete: true, ross_rallied: true, janitor_rallied: true,
        met_rachel: true, met_rachel_to: true, rachel_lockdown: true, rachel_fight_started: true,
        read_ross_act3: true, read_rachel_act3: true, ross_speech_ready: true,
        rossAngerDebuffTotal: { atk: 0, def: 0 },
      },
    }));
  });
  await page.goto(`http://localhost:${PORT}/?dev`, { waitUntil: 'load' });
  await sleep(2500);
  // Title menu with a save present is ['New Game', 'Load Game', 'Controls'].
  // Drive the real CONTINUE path: down one, Enter, then the shipping slot-card
  // click handler for the only populated slot.
  await tap('ArrowDown');
  await tap('Enter');
  await sleep(600);
  await page.evaluate(() => { if (window.__slotPick) window.__slotPick(0); });
  await sleep(3500);
  const stale = await page.evaluate(() => ({
    top: (() => { const st = window.__explore?.stateManager?.stack; return st?.[st.length - 1]?.constructor?.name || 'none'; })(),
    room: window.__explore?.player?.currentRoom,
    tileMap: !!window.__explore?.tileMap,
    xp: window.__explore?.player?.stats?.xp,
    aum: window.__explore?.player?.stats?.aum,
    npcs: window.__explore?.roomManager?.entityManager?.npcs?.length ?? -1,
  }));
  await page.screenshot({ path: path.join(OUT, 'B-stale-pre-rename-save.png') });
  say(`(B) stale save loaded: ${JSON.stringify(stale)}`);
  check('(B) stale pre-rename save does not crash the boot path', stale.top === 'ExplorationState' && stale.tileMap === true, JSON.stringify(stale));
  check('(B) it fell back to a real room (unknown ross_office)', stale.room === 'parking_garage', `room=${stale.room}`);
  check('(B) no page errors from the stale save', errors.filter(e => e.startsWith('PAGEERROR')).length === 0,
    errors.filter(e => e.startsWith('PAGEERROR')).slice(0, 3).join(' | '));

  // ── (C) A REAL FIGHT vs meredith_boss ─────────────────────────────────────
  errors.length = 0;
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.evaluate(async () => {
    const { SETTINGS } = await import('/src/core/Settings.js');
    SETTINGS.textSpeed = 0.12;
  });
  await page.evaluate(() => {
    const ex = window.__explore;
    for (const f of ['briefing_complete', 'ready_for_skip', 'branch_chosen', 'karen_defeated',
      'skip_post_karen', 'chad_defeated', 'skip_post_chad', 'grandma_defeated', 'act2_complete',
      'act3_complete', 'skip_rallied', 'janitor_rallied', 'has_archive_evidence', 'act4_complete',
      'has_charter', 'board_room_accessible', 'archive_accessible', 'restructuring_defeated',
      'corporate_lawyer_defeated']) ex.player.flags[f] = true;
    ex.player.gainXP(3000);
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    ex._changeRoom('board_room', 8, 9);
  });
  await sleep(3000);
  // Drain the pre-fight dialog until CombatState is on top.
  for (let i = 0; i < 60 && await top() !== 'CombatState'; i++) await tap('Enter', 70);
  await sleep(2500);
  const fight = await page.evaluate(() => {
    const ex = window.__explore;
    const st = ex.stateManager.stack[ex.stateManager.stack.length - 1];
    return {
      top: st?.constructor?.name,
      encounterId: st?.encounterId ?? null,
      actualEnemyId: st?.actualEnemyId ?? null,
      enemyIds: st?.enemyIdsList ?? null,
      enemyName: st?.engine?.enemies?.[0]?.name ?? st?.engine?.enemy?.name ?? null,
      enemyHP: st?.engine?.enemies?.[0]?.hp ?? st?.engine?.enemy?.hp ?? null,
      meshy: !!ex._meshyPreloaded,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'C1-meredith-fight-open.png') });
  say(`(C) fight state: ${JSON.stringify(fight)}`);
  check('(C) walking into the Board Room opens a fight', fight.top === 'CombatState');
  check('(C) the enemy is meredith_boss', JSON.stringify(fight).includes('meredith_boss'), JSON.stringify(fight));
  // One real attack, then the dev instant-kill so the victory path runs end to end.
  await tap('Enter', 120);
  await sleep(1600);
  await page.screenshot({ path: path.join(OUT, 'C2-meredith-fight-attack.png') });
  // `?dev` backtick is only read inside the `inputEnabled` branch of
  // CombatState.update — i.e. on the player's turn with the menu live. Poll for
  // that window instead of spraying keys at brace QTEs and enemy turns.
  for (let i = 0; i < 80 && await top() !== 'ExplorationState'; i++) {
    const ready = await page.evaluate(() => !!window.__combat?.inputEnabled);
    if (ready) await tap('`', 160); else await tap('Enter', 70);
    await sleep(350);
  }
  await sleep(1500);
  for (let i = 0; i < 80 && await top() !== 'ExplorationState'; i++) await tap('Enter', 70);
  await sleep(1500);
  const after = await page.evaluate(() => ({
    top: (() => { const st = window.__explore.stateManager.stack; return st[st.length - 1]?.constructor?.name; })(),
    defeated_meredith_boss: !!window.__explore.player.flags.defeated_meredith_boss,
    bestiary: !!window.__explore.player.flags.bestiary_meredith_boss,
    act5_complete: !!window.__explore.player.flags.act5_complete,
  }));
  await page.screenshot({ path: path.join(OUT, 'C3-meredith-victory.png') });
  say(`(C) after victory: ${JSON.stringify(after)}`);
  check('(C) victory sets defeated_meredith_boss', after.defeated_meredith_boss, JSON.stringify(after));
  check('(C) victory sets act5_complete (the Act-6 spine)', after.act5_complete, JSON.stringify(after));
  check('(C) no page errors across the fight', errors.filter(e => e.startsWith('PAGEERROR')).length === 0,
    errors.filter(e => e.startsWith('PAGEERROR')).slice(0, 3).join(' | '));

  // ── (D) A REAL DIALOG WITH skip ───────────────────────────────────────────
  errors.length = 0;
  // Independent of (C)'s end state: reboot the fixture, set the Act-2 window
  // (Karen down, Chad not yet), which is when Skip owes the post-Karen debrief.
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.evaluate(() => {
    const ex = window.__explore;
    for (const f of ['briefing_complete', 'ready_for_skip', 'checked_desk',
      'met_janet', 'met_intern', 'met_isaiah', 'met_alex_it', 'karen_defeated'])
      ex.player.flags[f] = true;
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    ex._changeRoom('skip_office', 4, 4);
  });
  await sleep(3000);
  const placed = await page.evaluate(() => {
    const ex = window.__explore;
    const skip = ex.roomManager.entityManager.npcs.find(n => n.id === 'skip' && n.visible);
    if (!skip) return { ok: false, why: 'no visible skip NPC', ids: ex.roomManager.entityManager.npcs.filter(n => n.visible).map(n => n.id) };
    const mx = skip.mesh.position.x, mz = skip.mesh.position.z;
    for (const [dx, dz] of [[0, 0.8], [0, -0.8], [0.8, 0], [-0.8, 0], [0.6, 0.6], [-0.6, 0.6]]) {
      ex.player.setPosition(mx + dx, mz + dz, ex.tileMap);
      const near = ex.roomManager.entityManager.getNearestInteractable(ex.player.position.x, ex.player.position.z);
      if (near && near.id === 'skip') return { ok: true, mesh: [+mx.toFixed(2), +mz.toFixed(2)] };
    }
    return { ok: false, why: 'out of interact range', mesh: [mx, mz] };
  });
  say(`(D) skip placement: ${JSON.stringify(placed)}`);
  await page.keyboard.down('e'); await sleep(180); await page.keyboard.up('e');
  await sleep(700);
  const dlg = await page.evaluate(() => {
    const ex = window.__explore;
    const st = ex.stateManager.stack[ex.stateManager.stack.length - 1];
    return {
      top: st?.constructor?.name,
      dialogId: st?.dialogId ?? null,
      speaker: document.querySelector('.dialog-speaker')?.textContent
        || document.querySelector('#dialog-speaker')?.textContent || null,
      text: (document.querySelector('.dialog-text')?.textContent
        || document.querySelector('#dialog-text')?.textContent || '').slice(0, 90),
      portrait: document.querySelector('.dialog-portrait img')?.getAttribute('src')
        || document.querySelector('.dialog-portrait')?.style?.backgroundImage || null,
    };
  });
  await sleep(600);
  await page.screenshot({ path: path.join(OUT, 'D-skip-dialog.png') });
  say(`(D) dialog: ${JSON.stringify(dlg)}`);
  check('(D) E on skip opens a dialog', dlg.top === 'DialogState', JSON.stringify(dlg));
  check('(D) the speaker renders as Skip Hartley', (dlg.speaker || '').includes('Skip'), `speaker=${dlg.speaker}`);
  check('(D) no page errors in the dialog', errors.filter(e => e.startsWith('PAGEERROR')).length === 0,
    errors.filter(e => e.startsWith('PAGEERROR')).slice(0, 3).join(' | '));

  say(`\n${fails === 0 ? 'RENAME-VERIFY PASS' : `RENAME-VERIFY FAIL — ${fails} problems`}`);
} catch (e) {
  say('HARNESS ERROR: ' + e.message);
  fails++;
} finally {
  await page.screenshot({ path: path.join(OUT, 'Z-final.png') }).catch(() => {});
  await browser.close();
}
process.exit(fails === 0 ? 0 : 1);
