// BOARD-CLOSE PROBE — does the cast outlive the dialog?
//
// Defect this exists to catch: `board_meeting_held` sets at node 175 and
// `board_meeting_closed` used to derive in the same tick, but the 18
// `conditionFn` hides it triggers cannot execute until ExplorationState ticks
// again — the first frame after the dialog pops. The whole population therefore
// deleted itself in ONE VISIBLE FRAME with the player standing there.
// Measured baseline: 18 bodies gone across 60 ms, screen uncovered.
//
// Five checks, all from the shipping path:
//   (a) at dialog-end +0 ms and +1 s the cast is still present AND control is live
//   (b) leave the room and come back — room empty, Skip back in his office
//   (c) save + load inside the window — no stranded cast; re-check the
//       two-Janitors law (`rolex_available` derives off `board_meeting_held`,
//       which this change does not touch, but the Archive is where a mistake
//       here would show)
//   (d) reload the page while still standing in board_room — acceptable outcome
//       is cast present until you walk out
//   (e) THE SPENT PROMPT. Skip staying in the room is correct; his E prompt
//       feeding back into the 177-node set-piece (and its `give_xp 300`) is not.
//       Walk to the LIVE mesh — he PACES, so 7,9 is not where he is — send a
//       real `e`, and fail if the meeting reopens or if one point of XP moves
//       across two full attempts. Choice screens are forced to the TOP option:
//       the `_chose_` cursor otherwise parks on "I need a minute", which exits
//       in ~20 advances and pays nothing, i.e. a false pass.
//
// Plus the acceptance number the panel asked for: the largest single-tick DROP
// in visible NPC count while the screen is uncovered. Must be 0.
//
//   node tools/_g-board-close.mjs --port=5177 --out=screenshots/g-run/board/close-after
//
// HEADED chromium per the house law; closes its own browser.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => {
  const hit = process.argv.find(a => a.startsWith(`--${k}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};
const PORT = arg('port', '5177');
const OUT = path.resolve(arg('out', 'screenshots/g-run/board/close-after'));
const TAP = Number(arg('tap', 90));
const MAX_ADV = Number(arg('adv', 400));
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

// `branch_chosen` is not part of the staging recipe — it is here because
// `_changeRoom`'s gate table blocks `executive_floor` without it, and leg (b)
// has to actually WALK OUT of the board room through the shipping path.
// `branch_chosen` / `archive_accessible` are not part of the staging recipe —
// they are here because `_changeRoom` blocks `executive_floor` without the
// first and diverts `archive` into the keypad without the second, and legs
// (b)/(c) have to actually WALK through the shipping path.
const SET = ['act5_complete', 'board_room_accessible', 'ross_speech_ready', 'branch_chosen', 'archive_accessible',
  'janet_act6_rallied', 'diane_act6_rallied', 'intern_act6_rallied', 'isaiah_evidence', 'grandma_ally'];
const CLEAR = ['board_meeting_held', 'board_meeting_closed', 'act6_complete', 'has_rolex', 'rolex_available'];

const report = [];
const say = (s) => { console.log(s); report.push(s); };

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--use-gl=angle', '--enable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  // --nodefer reproduces the PRE-FIX same-tick derivation, so the defect this
  // probe exists to catch can be MEASURED and not merely described.
  if (process.argv.includes('--nodefer')) await page.addInitScript('window.__boardDeferOff = true;');
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.evaluate(async () => {
    const { SETTINGS } = await import('/src/core/Settings.js');
    SETTINGS.textSpeed = 0.12;
  });

  await page.evaluate(({ set, clear }) => {
    const ex = window.__explore;
    for (const f of clear) ex.player.flags[f] = false;
    for (const f of set) ex.player.flags[f] = true;
    ex.player.gainXP(3000);
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    ex._loadRoom('board_room');
    ex._updateLocationDisplay('board_room');
  }, { set: SET, clear: CLEAR });
  await sleep(1200);

  // Per-frame sampler. `covered` is true whenever the transition overlay is
  // actually painting — a drop under black is a cut, a drop in the clear is
  // the defect.
  await page.evaluate(() => {
    window.__bc = [];
    const tick = () => {
      const ex = window.__explore;
      const npcs = ex?.roomManager?.entityManager?.npcs || [];
      const ov = document.querySelector('.transition-overlay') || document.getElementById('transition-overlay');
      const cs = ov ? getComputedStyle(ov) : null;
      const alpha = cs ? parseFloat(cs.opacity || '0') : 0;
      const top = ex?.stateManager?.stack?.[ex.stateManager.stack.length - 1];
      window.__bc.push({
        t: performance.now(),
        visible: npcs.filter(n => n.visible).length,
        room: ex?.player?.currentRoom,
        closed: !!ex?.player?.flags?.board_meeting_closed,
        held: !!ex?.player?.flags?.board_meeting_held,
        covered: !!(cs && cs.display !== 'none' && cs.visibility !== 'hidden' && alpha > 0.02),
        topState: top?.constructor?.name || null,
        paused: !!ex?.paused,
      });
      window.__bcRaf = requestAnimationFrame(tick);
    };
    tick();
  });

  const preCount = await page.evaluate(() => window.__explore.roomManager.entityManager.npcs.filter(n => n.visible).length);
  say(`staged cast before the meeting: ${preCount} visible NPCs`);

  await page.evaluate(async () => {
    const ex = window.__explore;
    const [{ DialogState }, { DIALOGS }] = await Promise.all([
      import('/src/states/DialogState.js'),
      import('/src/data/dialogs/index.js'),
    ]);
    ex.stateManager.push(new DialogState(DIALOGS.board_meeting, ex.player, ex.stateManager, 'board_meeting'));
  });
  await sleep(500);

  // Drive the meeting to its end with real key events (InputManager diffs key
  // state BETWEEN frames — a zero-delay press is invisible to it).
  let adv = 0, ended = false;
  for (; adv < MAX_ADV; adv++) {
    const dialogUp = await page.evaluate(() => {
      const ex = window.__explore;
      const top = ex.stateManager.stack[ex.stateManager.stack.length - 1];
      return top?.constructor?.name === 'DialogState';
    });
    if (!dialogUp) { ended = true; break; }
    await page.keyboard.down('Enter'); await sleep(TAP); await page.keyboard.up('Enter');
    await sleep(60);
  }
  const tEnd = await page.evaluate(() => performance.now());
  say(`dialog ended after ${adv} advances (ended=${ended})`);

  // (a) +0 ms and +1 s
  const a0 = await page.evaluate(() => {
    const ex = window.__explore;
    const top = ex.stateManager.stack[ex.stateManager.stack.length - 1];
    return {
      visible: ex.roomManager.entityManager.npcs.filter(n => n.visible).length,
      closed: !!ex.player.flags.board_meeting_closed, held: !!ex.player.flags.board_meeting_held,
      topState: top?.constructor?.name, paused: !!ex.paused,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'A-dialog-end-plus-0ms.png') });
  await sleep(1000);
  const a1 = await page.evaluate(() => {
    const ex = window.__explore;
    const top = ex.stateManager.stack[ex.stateManager.stack.length - 1];
    return {
      visible: ex.roomManager.entityManager.npcs.filter(n => n.visible).length,
      closed: !!ex.player.flags.board_meeting_closed, held: !!ex.player.flags.board_meeting_held,
      topState: top?.constructor?.name, paused: !!ex.paused,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'B-dialog-end-plus-1s.png') });
  say(`(a) +0ms   visible=${a0.visible} held=${a0.held} closed=${a0.closed} top=${a0.topState} paused=${a0.paused}`);
  say(`(a) +1s    visible=${a1.visible} held=${a1.held} closed=${a1.closed} top=${a1.topState} paused=${a1.paused}`);

  // The acceptance number: largest single-tick drop while UNCOVERED.
  const samples = await page.evaluate((t) => window.__bc.filter(s => s.t >= t - 3000), tEnd);
  let worst = 0, worstAt = null;
  for (let i = 1; i < samples.length; i++) {
    const d = samples[i - 1].visible - samples[i].visible;
    if (d > worst && !samples[i].covered && !samples[i - 1].covered) { worst = d; worstAt = samples[i]; }
  }
  say(`(a) largest single-tick DROP in visible NPC count while the screen is uncovered: ${worst}` +
    (worstAt ? ` (at t=${worstAt.t.toFixed(0)} room=${worstAt.room})` : ''));

  // Walk through the SHIPPING door path and report where we actually landed —
  // a gate that refuses (toast + early return) must show up as a wrong room,
  // not as a harness timeout that hides the reason.
  const goTo = async (room, x, z) => {
    await page.evaluate(({ r, px, pz }) => window.__explore._changeRoom(r, px, pz), { r: room, px: x, pz: z });
    try {
      await page.waitForFunction((r) => window.__explore.player.currentRoom === r && !window.__explore.paused,
        room, { timeout: 25000 });
    } catch { /* fall through and report the real room */ }
    await sleep(900);
    return page.evaluate(() => window.__explore.player.currentRoom);
  };

  // ── (e) THE SPENT PROMPT ────────────────────────────────────────────────
  // Skip stays bodily in the Board Room after the meeting (that is deliberate —
  // nobody may vanish on camera), and his room entry carries
  // `dialogId: 'board_meeting'`. So the E prompt on him fed straight back into
  // the 177-node set-piece, whose node 176 is `give_xp 300`: a re-runnable
  // reward on a re-runnable prompt. This leg walks to the LIVE mesh, sends a
  // REAL keypress through `_interact()`, and fails if the meeting reopens or if
  // one point of XP moves across two full attempts.
  //
  // FORCING THE TOP OPTION IS THE WHOLE TEST. DialogBox parks the cursor on the
  // first UNSEEN choice, and by now every choice at node 9 has a `_chose_` flag
  // except "I need a minute" — which routes 10 → 11 → end in ~20 advances and
  // pays nothing. Mashing Enter therefore passes an XP assertion against a
  // scene it never entered. Every choice screen here is driven to index 0 with
  // real ArrowUp presses first.
  const pressSkipAndDrain = async (label) => {
    // Adjacent to the LIVE mesh: Skip PACES (`{type:'pace', distance:1.5}`), so
    // his 7,9 authored position is not where he is standing.
    const placed = await page.evaluate(() => {
      const ex = window.__explore;
      const ross = ex.roomManager.entityManager.npcs.find(n => n.id === 'ross' && n.visible);
      if (!ross) return { ok: false, why: 'no visible ross NPC' };
      const mx = ross.mesh.position.x, mz = ross.mesh.position.z;
      for (const [dx, dz] of [[0, 0.8], [0, -0.8], [0.8, 0], [-0.8, 0], [0.6, 0.6], [-0.6, 0.6]]) {
        ex.player.setPosition(mx + dx, mz + dz, ex.tileMap);
        const near = ex.roomManager.entityManager.getNearestInteractable(
          ex.player.position.x, ex.player.position.z);
        if (near && near.id === 'ross') {
          return { ok: true, mesh: [+mx.toFixed(2), +mz.toFixed(2)],
            player: [+ex.player.position.x.toFixed(2), +ex.player.position.z.toFixed(2)],
            armed: ex._transitionArmed() };
        }
      }
      return { ok: false, why: 'could not stand within interact range of ross', mesh: [mx, mz] };
    });
    if (!placed.ok) { say(`(e) ${label}: FAILED TO REACH SKIP — ${placed.why}`); return { ok: false }; }
    say(`(e) ${label}: skip mesh at [${placed.mesh}] player at [${placed.player}] transitionArmed=${placed.armed}`);

    // REAL key event, held across frames. InputManager diffs key state BETWEEN
    // frames — a zero-delay down+up never reads as pressed.
    await page.keyboard.down('e'); await sleep(180); await page.keyboard.up('e');
    await sleep(500);

    const opened = await page.evaluate(() => {
      const ex = window.__explore;
      const top = ex.stateManager.stack[ex.stateManager.stack.length - 1];
      return { state: top?.constructor?.name || null, dialogId: top?.dialogId ?? null };
    });
    say(`(e) ${label}: E opened state=${opened.state} dialogId=${opened.dialogId}`);
    if (opened.state !== 'DialogState') return { ok: true, dialogId: null, advances: 0, lines: [] };

    // Drain it, forcing choice index 0 every time.
    const lines = [];
    let n = 0, choices = 0;
    for (; n < MAX_ADV; n++) {
      const st = await page.evaluate(() => {
        const ex = window.__explore;
        const top = ex.stateManager.stack[ex.stateManager.stack.length - 1];
        if (top?.constructor?.name !== 'DialogState') return null;
        const box = top.dialogBox;
        return {
          choicesVisible: !!box?.choicesVisible,
          selectedIndex: box?.selectedIndex ?? 0,
          speaker: box?.speakerEl?.textContent || null,
          text: (box?.textEl?.textContent || '').slice(0, 90),
        };
      });
      if (!st) break;
      if (st.speaker && !lines.some(l => l.startsWith(st.speaker + ' |'))) {
        lines.push(`${st.speaker} | ${st.text}`);
      }
      if (st.choicesVisible) {
        choices++;
        for (let up = 0; up < st.selectedIndex; up++) {
          await page.keyboard.down('ArrowUp'); await sleep(70); await page.keyboard.up('ArrowUp');
          await sleep(40);
        }
        const idx = await page.evaluate(() => {
          const ex = window.__explore;
          const top = ex.stateManager.stack[ex.stateManager.stack.length - 1];
          return top?.dialogBox?.selectedIndex ?? -1;
        });
        if (idx !== 0) say(`(e) ${label}: WARNING choice cursor is at ${idx}, not the top option`);
      }
      await page.keyboard.down('Enter'); await sleep(TAP); await page.keyboard.up('Enter');
      await sleep(60);
    }
    return { ok: true, dialogId: opened.dialogId, advances: n, choices, lines };
  };

  const xpBefore = await page.evaluate(() => window.__explore.player.stats.xp);
  say(`(e) xp before the re-press: ${xpBefore}`);
  const e1 = await pressSkipAndDrain('press 1');
  const xpMid = await page.evaluate(() => window.__explore.player.stats.xp);
  await page.screenshot({ path: path.join(OUT, 'G-skip-repress.png') });
  const e2 = await pressSkipAndDrain('press 2 (the full second attempt)');
  const xpAfter = await page.evaluate(() => window.__explore.player.stats.xp);
  const eAfter = await page.evaluate(() => {
    const ex = window.__explore;
    const top = ex.stateManager.stack[ex.stateManager.stack.length - 1];
    return { top: top?.constructor?.name, paused: !!ex.paused, room: ex.player.currentRoom,
      visible: ex.roomManager.entityManager.npcs.filter(n => n.visible).length };
  });
  for (const [lbl, r] of [['press 1', e1], ['press 2', e2]]) {
    if (r.ok && r.dialogId) {
      say(`(e) ${lbl}: dialogId=${r.dialogId} advances=${r.advances} choiceScreens=${r.choices}`);
      for (const l of r.lines) say(`(e)     ${l}`);
    }
  }
  say(`(e) xp: before=${xpBefore} afterPress1=${xpMid} afterPress2=${xpAfter}  delta=${xpAfter - xpBefore}`);
  say(`(e) control after: top=${eAfter.top} paused=${eAfter.paused} room=${eAfter.room} visible=${eAfter.visible}`);

  const ePass = e1.ok && e2.ok
    && e1.dialogId !== 'board_meeting' && e2.dialogId !== 'board_meeting'
    && e1.dialogId === 'board_meeting_after' && e2.dialogId === 'board_meeting_after'
    && xpAfter === xpBefore && xpMid === xpBefore
    && eAfter.top === 'ExplorationState' && !eAfter.paused
    && eAfter.visible === preCount;
  say(`(e) SPENT-PROMPT ${ePass ? 'PASS' : 'FAIL'} — E on the post-meeting Skip must not reopen board_meeting and must pay nothing`);

  // (b) leave and re-enter
  const landedExec = await goTo('executive_floor', 8, 5);
  if (landedExec !== 'executive_floor') say(`(b) WARNING: _changeRoom(executive_floor) landed in ${landedExec}`);
  const left = await page.evaluate(() => ({
    closed: !!window.__explore.player.flags.board_meeting_closed,
    room: window.__explore.player.currentRoom,
  }));
  say(`(b) after walking out: room=${left.room} board_meeting_closed=${left.closed}`);

  await goTo('board_room', 8, 9);
  const back = await page.evaluate(() => {
    const ex = window.__explore;
    return {
      visible: ex.roomManager.entityManager.npcs.filter(n => n.visible).length,
      names: ex.roomManager.entityManager.npcs.filter(n => n.visible).map(n => n.id),
    };
  });
  await page.screenshot({ path: path.join(OUT, 'C-reentered-board-room.png') });
  say(`(b) re-entered board_room: ${back.visible} visible NPCs [${back.names.join(' ')}]`);

  await goTo('ross_office', 4, 4);
  const office = await page.evaluate(() => {
    const ex = window.__explore;
    return ex.roomManager.entityManager.npcs.filter(n => n.visible).map(n => n.id);
  });
  await page.screenshot({ path: path.join(OUT, 'D-skip-back-in-office.png') });
  say(`(b) ross_office visible NPCs: [${office.join(' ')}]  skip_present=${office.includes('ross')}`);

  // (c) save + load INSIDE the window — go back to board_room first and redo the
  //     deferral state, then round-trip the save.
  await page.evaluate(() => {
    const ex = window.__explore;
    // currentRoom FIRST: _loadRoom's room-entered listeners run a story
    // refresh, and with currentRoom still pointing at the old room that refresh
    // derives the flag we are trying to leave un-derived.
    ex.player.currentRoom = 'board_room';
    for (const f of ['board_meeting_closed', 'act6_complete', 'has_rolex', 'rolex_available']) ex.player.flags[f] = false;
    ex.player.flags.board_meeting_held = true;
    ex._loadRoom('board_room', 8, 9);
    ex._refreshStoryProgress(true);
  });
  await sleep(900);
  const inWindow = await page.evaluate(async () => {
    const ex = window.__explore;
    const { SaveManager } = await import('/src/core/SaveManager.js');
    SaveManager.save(ex.player.serialize());
    return {
      visible: ex.roomManager.entityManager.npcs.filter(n => n.visible).length,
      closed: !!ex.player.flags.board_meeting_closed,
      deferred: !!ex._boardCloseDeferred,
    };
  });
  say(`(c) saved inside the window: visible=${inWindow.visible} closed=${inWindow.closed} deferred=${inWindow.deferred}`);

  await page.evaluate(async () => {
    const ex = window.__explore;
    const { SaveManager } = await import('/src/core/SaveManager.js');
    const data = SaveManager.load();
    ex.player.deserialize(data);
    ex._loadRoom(ex.player.currentRoom, ex.player.position.x, ex.player.position.z);
    ex.syncFromPlayerState();
  });
  // NPC conditionFn is evaluated in EntityManager.update(), i.e. on the NEXT
  // frame — sampling inside the same evaluate() reads 0 for everyone and lies.
  await sleep(900);
  const loaded = await page.evaluate(() => {
    const ex = window.__explore;
    return {
      room: ex.player.currentRoom,
      visible: ex.roomManager.entityManager.npcs.filter(n => n.visible).length,
      closed: !!ex.player.flags.board_meeting_closed,
      rolexAvailable: !!ex.player.flags.rolex_available,
      deferred: !!ex._boardCloseDeferred,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'E-saveload-inside-window.png') });
  say(`(c) after save/load: room=${loaded.room} visible=${loaded.visible} closed=${loaded.closed} ` +
    `deferred=${loaded.deferred} rolex_available=${loaded.rolexAvailable}`);

  // TWO-JANITORS LAW. The Archive carries three mutually exclusive Janitor
  // entries around the Rolex (`act5_complete && !rolex_available`,
  // `rolex_available && !has_rolex`, `has_rolex`). Exactly one may be visible.
  // Run it in BOTH states that matter: the forward one (meeting held) and the
  // legacy one (a save that already holds the Rolex — the case the
  // `|| has_rolex` clause in the `rolex_available` derivation exists for).
  const arch = { dupes: [] };
  for (const leg of [
    { name: 'forward (board_meeting_held)', set: { act5_complete: true, board_meeting_held: true }, clear: ['has_rolex', 'rolex_available'] },
    { name: 'legacy save (has_rolex)', set: { act5_complete: true, has_rolex: true }, clear: ['rolex_available'] },
  ]) {
    await page.evaluate(({ set, clear }) => {
      const ex = window.__explore;
      for (const f of clear) ex.player.flags[f] = false;
      for (const [k, v] of Object.entries(set)) ex.player.flags[k] = v;
      // Everything an act-5 save necessarily already holds. Without these the
      // EARLIER Janitor entries are also live and the harness manufactures its
      // own duplicate.
      for (const f of ['archive_accessible', 'security_guard_info', 'read_janitor_act3',
        'act3_complete', 'ross_rallied', 'janitor_rallied']) ex.player.flags[f] = true;
      ex._syncActFromFlags();
      ex._refreshStoryProgress(true);
    }, leg);
    const landedArch = await goTo('archive', 6, 8);
    if (landedArch !== 'archive') say(`(c) WARNING: _changeRoom(archive) landed in ${landedArch}`);
    // Evaluate each entry's OWN conditionFn against the live flags — the same
    // predicate EntityManager.update() calls. Reading `npc.visible` is a trap:
    // conditionFn only runs while ExplorationState is the top state, so any
    // dialog a flag-set listener pushes freezes every conditional NPC hidden
    // and reads exactly like "the Janitor is missing".
    const r = await page.evaluate(() => {
      const ex = window.__explore;
      const flags = ex.player.flags;
      const live = ex.roomManager.entityManager.npcs.filter(n => !n.conditionFn || n.conditionFn(flags));
      const counts = {};
      for (const n of live) counts[n.id] = (counts[n.id] || 0) + 1;
      return {
        live: live.map(n => n.id), janitors: counts.janitor || 0,
        dupes: Object.entries(counts).filter(([, c]) => c > 1),
        rolexAvailable: !!flags.rolex_available,
        closed: !!flags.board_meeting_closed,
        stack: ex.stateManager.stack.map(s => s.constructor.name).join('>'),
      };
    });
    if (r.janitors !== 1) arch.dupes.push(['janitor', r.janitors]);
    arch.dupes.push(...r.dupes);
    await page.screenshot({ path: path.join(OUT, `E-archive-${leg.name.split(' ')[0]}.png`) });
    say(`(c) archive / ${leg.name}: liveJanitors=${r.janitors} rolex_available=${r.rolexAvailable} ` +
      `live=[${r.live.join(' ')}] duplicates=${JSON.stringify(r.dupes)} stack=${r.stack}`);
    // Bounce out so the next leg re-enters and rebuilds.
    await goTo('stairwell', 2, 2);
  }

  // (d) quit-and-reload while standing in board_room
  await page.evaluate(async () => {
    const ex = window.__explore;
    for (const f of ['board_meeting_closed', 'act6_complete', 'has_rolex', 'rolex_available']) ex.player.flags[f] = false;
    ex.player.flags.board_meeting_held = true;
    ex.player.currentRoom = 'board_room';
    const { SaveManager } = await import('/src/core/SaveManager.js');
    SaveManager.save(ex.player.serialize());
  });
  // Real player path: title screen -> Load Game -> the slot that has data.
  await page.goto(`http://localhost:${PORT}/?dev`, { waitUntil: 'load' });
  await page.waitForSelector('.title-menu-item', { timeout: 45000 });
  await page.evaluate(() => {
    [...document.querySelectorAll('.title-menu-item')].find(e => e.textContent.trim() === 'Load Game')?.click();
  });
  await page.waitForSelector('.save-slot-card', { timeout: 15000 });
  await page.evaluate(() => window.__slotPick(0));
  await page.waitForFunction(() => !!window.__explore, { timeout: 45000 });
  await sleep(2500);
  const reload = await page.evaluate(() => {
    const ex = window.__explore;
    return {
      room: ex.player.currentRoom,
      visible: ex.roomManager.entityManager.npcs.filter(n => n.visible).length,
      closed: !!ex.player.flags.board_meeting_closed,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'F-reload-in-board-room.png') });
  say(`(d) reload while in board_room: room=${reload.room} visible=${reload.visible} closed=${reload.closed}`);

  await page.evaluate(() => window.__explore._changeRoom('executive_floor', 8, 5));
  await page.waitForFunction(() => window.__explore.player.currentRoom === 'executive_floor' && !window.__explore.paused, { timeout: 20000 });
  await sleep(600);
  const afterWalk = await page.evaluate(() => ({ closed: !!window.__explore.player.flags.board_meeting_closed }));
  say(`(d) then walked out: board_meeting_closed=${afterWalk.closed}`);

  if (errors.length) say('PAGE ERRORS: ' + errors.slice(0, 5).join(' | '));

  fs.writeFileSync(path.join(OUT, 'samples.json'), JSON.stringify(samples, null, 1));
  fs.writeFileSync(path.join(OUT, 'report.txt'), report.join('\n') + '\n');
  await ctx.close();
  await browser.close();
  console.log('wrote', OUT);

  const pass = worst === 0 && a0.visible === preCount && a1.visible === preCount
    && a0.topState === 'ExplorationState' && !a0.paused
    && back.visible === 0 && office.includes('ross') && arch.dupes.length === 0
    && ePass;
  console.log(pass ? 'BOARD-CLOSE PASS' : 'BOARD-CLOSE FAIL');
  if (!pass) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
