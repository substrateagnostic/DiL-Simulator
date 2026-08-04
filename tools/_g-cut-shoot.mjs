// ============================================================
// tools/_g-cut-shoot.mjs — capture a STAGED cutscene as motion
// ============================================================
// Boots the shipping path (?dev fixture loader -> window.__explore ->
// _loadRoom), sets the scene's flags, lets the game's own room-entered /
// interact listener push the dialog, then advances it with real key events
// while recording video + a frame strip + a per-frame sample of every actor's
// position and facing.
//
//   node tools/_g-cut-shoot.mjs --scene=secret_ending --port=5173
//
// The judges judge MOTION, so the video is the deliverable; actors.json is the
// measurement (who moved, how far, and what they ended up facing).
//
// Playwright gotchas that already cost this repo an hour each:
//   1. InputManager derives justPressed by diffing key state BETWEEN FRAMES.
//      A zero-delay press() is invisible. Hold every tap ~200ms.
//   2. Video recording drops the page to ~10-20fps, so "a few frames" is
//      ~200ms of wall clock.
// HEADED chromium per the house law; closes its own browser.
// ============================================================
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => {
  const hit = process.argv.find(a => a.startsWith(`--${k}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};

// scene recipes: flags to set, flags to clear, room to load, how long to run
const SCENES = {
  secret_ending: {
    room: 'executive_floor',
    set: ['briefing_complete', 'karen_defeated', 'chad_defeated', 'grandma_defeated', 'branch_chosen', 'path_grandma'],
    clear: ['ross_defeated', 'regional_defeated', 'compliance_defeated', 'act2_complete', 'ending_started'],
    advances: 130, gap: 460,
  },
  legal_eagle_ending: {
    room: 'executive_floor',
    set: ['briefing_complete', 'karen_defeated', 'chad_defeated', 'grandma_defeated', 'branch_chosen', 'path_legal'],
    clear: ['ross_defeated', 'regional_defeated', 'compliance_defeated', 'act2_complete', 'ending_started', 'retry_regional'],
    advances: 28, gap: 620,
  },
  bro_code_ending: {
    room: 'executive_floor',
    set: ['briefing_complete', 'karen_defeated', 'chad_defeated', 'grandma_defeated', 'branch_chosen', 'path_bro'],
    clear: ['ross_defeated', 'regional_defeated', 'compliance_defeated', 'act2_complete', 'ending_started', 'retry_compliance'],
    advances: 26, gap: 620,
  },
  rachel_boss_combat: {
    room: 'board_room',
    set: ['act3_complete', 'act4_complete', 'board_room_accessible', 'has_archive_evidence'],
    clear: ['act5_complete', 'rachel_fight_started'],
    advances: 24, gap: 620,
  },
  restructuring_trio_intro: {
    room: 'cubicle_farm',
    set: ['act3_complete', 'act4_complete'],
    clear: ['act5_complete', 'restructuring_trio_started', 'restructuring_trio_defeated'],
    advances: 14, gap: 620,
  },
  penthouse_arrival: {
    room: 'penthouse',
    set: ['act5_complete', 'act6_complete', 'has_rolex'],
    clear: ['penthouse_entered', 'defeated_cfos_assistant'],
    advances: 22, gap: 620,
  },
  the_firm_ambush: {
    room: 'old_vault',
    set: ['city_unlocked', 'delia_moved', 'has_ledger'],
    clear: ['firm_defeated', 'the_firm_started'],
    dialog: 'the_firm_ambush',
    advances: 18, gap: 620,
  },
  grandma_meeting: {
    room: 'conference_room',
    set: ['briefing_complete', 'karen_defeated', 'chad_defeated', 'ross_post_karen', 'ross_post_chad'],
    clear: ['grandma_defeated', 'branch_chosen'],
    dialog: 'grandma_meeting',
    advances: 22, gap: 620,
  },
  karen_defeated: {
    room: 'conference_room',
    set: ['briefing_complete', 'karen_defeated'],
    clear: ['chad_defeated', 'ross_post_karen'],
    dialog: 'karen_defeated',
    advances: 10, gap: 620,
  },
  chief_restructuring_defeated: {
    room: 'executive_floor',
    set: ['branch_chosen', 'path_legal', 'act2_complete', 'act3_complete', 'act4_complete',
      'restructuring_defeated', 'corporate_lawyer_defeated', 'data_lead_defeated', 'chief_fight_started'],
    clear: ['act5_complete'],
    dialog: 'chief_restructuring_defeated',
    advances: 12, gap: 620,
  },
  board_meeting: {
    room: 'board_room',
    set: ['act5_complete', 'board_room_accessible', 'ross_speech_ready',
      'janet_act6_rallied', 'diane_act6_rallied', 'intern_act6_rallied', 'isaiah_evidence', 'grandma_ally'],
    clear: ['board_meeting_held', 'board_meeting_closed', 'act6_complete', 'has_rolex'],
    dialog: 'board_meeting',
    // 178 nodes and five ally contributions, each of which returns to the
    // node-48 floor choice — a full pass is ~110 advances, so 40 stopped the
    // take before BLOCK E and never reached the staging in BLOCK H.
    advances: 140, gap: 480,
  },
  // Fires in `board_room` — the only room with a penthouse exit — from
  // `_changeRoom`'s uncertified-charter branch. By then `act6_complete` has
  // derived `board_meeting_closed`, so the room is empty and the Janitor is
  // spawned in for his five lines.
  charter_challenge: {
    room: 'board_room',
    set: ['act5_complete', 'act6_complete', 'has_rolex', 'board_meeting_held', 'janitor_names_complete'],
    clear: ['charter_certified', 'read_charter_challenge', 'city_unlocked'],
    dialog: 'charter_challenge',
    advances: 26, gap: 620,
  },
  compliance_defeated: {
    room: 'executive_floor',
    set: ['branch_chosen', 'path_bro', 'karen_defeated', 'chad_defeated', 'grandma_defeated'],
    clear: ['compliance_defeated', 'act2_complete', 'ending_started', 'compliance_crossword_done'],
    dialog: 'compliance_defeated',
    advances: 16, gap: 620,
  },
};

const SCENE = arg('scene', 'secret_ending');
const CFG = SCENES[SCENE];
if (!CFG) { console.error(`unknown scene "${SCENE}" — have: ${Object.keys(SCENES).join(', ')}`); process.exit(1); }

const OUT = path.resolve(arg('out', `screenshots/g-run/cutscenes/${SCENE}`));
const PORT = arg('port', '5173');
const VIDEO = arg('video', '1') !== '0';
const ZOOM = Number(arg('zoom', 0));   // 0 = shipping camera; ~5 = detail take
const SKIP = arg('skip', '0') === '1'; // mash Enter through the staging
const W = 1280, H = 720;
const TAP = Number(arg('tap', VIDEO ? 210 : 110));

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--use-gl=angle', '--enable-gpu', `--window-size=${W},${H + 120}`],
  });
  const ctxOpts = { viewport: { width: W, height: H } };
  if (VIDEO) {
    fs.mkdirSync(path.join(OUT, 'video'), { recursive: true });
    ctxOpts.recordVideo = { dir: path.join(OUT, 'video'), size: { width: W, height: H } };
  }
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 40000 });

  // Run the typewriter fast so the take is about the STAGING, not the typing.
  // (Otherwise every node costs two Enters: one to skip the type-on, one to
  // advance — and a 60s take only reaches node 31 of 56.)
  await page.evaluate(async () => {
    const { SETTINGS } = await import('/src/core/Settings.js');
    SETTINGS.textSpeed = 0.12;
  });

  // Arrange the scene through the real player object, then load the room the
  // real way so the game's own room-entered listener pushes the dialog.
  await page.evaluate(({ set, clear, room }) => {
    const ex = window.__explore;
    for (const f of clear) ex.player.flags[f] = false;
    for (const f of set) ex.player.flags[f] = true;
    ex.player.gainXP(3000);
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    ex._loadRoom(room);
    ex._updateLocationDisplay(room);
    window.__cutSamples = [];
  }, CFG);

  // Optional DETAIL take: tighten the orthographic frustum and let the normal
  // follow camera park it on the focal point. Nothing else about the render
  // changes — this is the same trick the A2 audit used for its D* plates,
  // because at the shipping diorama camera a character is ~15px tall and
  // staging is not judgeable from it.
  if (ZOOM) {
    await page.evaluate(async (z) => {
      const { Engine } = await import('/src/core/Engine.js');
      const apply = () => {
        // Engine.camera is briefly null across a room build — without this
        // guard the whole take dies with "Cannot set properties of null".
        const cam = Engine.camera;
        if (cam) {
          const aspect = Engine.width / Engine.height;
          cam.left = -z * aspect; cam.right = z * aspect;
          cam.top = z; cam.bottom = -z;
          cam.updateProjectionMatrix();
        }
        requestAnimationFrame(apply);
      };
      apply();
    }, ZOOM);
  }

  await sleep(900);

  // If the scene is interact-driven rather than entry-driven, push it by hand
  // through the same DialogState constructor ExplorationState uses.
  if (CFG.dialog) {
    await page.evaluate(async (id) => {
      const ex = window.__explore;
      const [{ DialogState }, { DIALOGS }] = await Promise.all([
        import('/src/states/DialogState.js'),
        import('/src/data/dialogs/index.js'),
      ]);
      ex.stateManager.push(new DialogState(DIALOGS[id], ex.player, ex.stateManager, id));
    }, CFG.dialog);
  }

  // Seat table for THIS room, captured before anything can change rooms.
  const SEATS = await page.evaluate(() => window.__explore.roomManager.currentRoom.seats || []);

  // Sample every actor ~15x/s for the whole take.
  await page.evaluate(() => {
    const ex = window.__explore;
    window.__cutT0 = performance.now();
    window.__cutTimer = setInterval(() => {
      const row = { t: Math.round(performance.now() - window.__cutT0), a: {} };
      row.a.player = {
        x: +ex.player.position.x.toFixed(3), z: +ex.player.position.z.toFixed(3),
        r: +ex.player.mesh.rotation.y.toFixed(3), sit: !!ex.player.animator.isSitting,
        walk: !!ex.player.animator.isWalking, y: +ex.player.mesh.position.y.toFixed(3),
      };
      for (const n of ex.roomManager.entityManager.npcs) {
        if (!n.visible) continue;
        row.a[n.id] = {
          x: +n.position.x.toFixed(3), z: +n.position.z.toFixed(3),
          r: +n.mesh.rotation.y.toFixed(3), sit: !!n.animator.isSitting,
          walk: !!n.animator.isWalking, spawned: !!n._stageSpawn,
        };
      }
      window.__cutSamples.push(row);
    }, 66);
  });

  // Entry-driven scenes are pushed by the game's own room-entered listener on
  // an 800-2000ms timer; wait for the DialogState rather than racing it.
  for (let i = 0; i < 30; i++) {
    const top = await page.evaluate(() => window.__explore?.stateManager?.current?.constructor?.name ?? '');
    if (top === 'DialogState') break;
    await sleep(200);
  }

  let n = 0;
  const shots = [];
  const shot = async (tag) => {
    const f = path.join(OUT, `${String(n++).padStart(3, '0')}-${tag}.png`);
    await page.screenshot({ path: f });
    shots.push(path.basename(f));
  };

  await shot('open');

  // A confirm press during a stage beat is a SKIP (DialogState emits
  // 'stage-skip'), so the harness must wait the beats out or it measures its
  // own teleports instead of the staging.
  const stageBusy = () => page.evaluate(() => {
    const top = window.__explore?.stateManager?.current;
    return !!(top && top._stageRunning);
  });
  // --skip=1 exercises the OTHER path on purpose: a player mashing Enter
  // through the staging. Every beat must snap to its end state and the dialog
  // must keep advancing — a stalled beat would be a permanent dialog freeze.
  const waitOutStage = async (capMs = 12000) => {
    if (SKIP) return true;
    const t0 = Date.now();
    while (await stageBusy()) {
      if (Date.now() - t0 > capMs) return false;
      await shot('stage');
      await sleep(180);
    }
    return true;
  };

  for (let i = 0; i < CFG.advances; i++) {
    await waitOutStage();
    await page.keyboard.down('Enter');
    await sleep(TAP);
    await page.keyboard.up('Enter');
    await sleep(CFG.gap - TAP);
    if (i % 2 === 0) await shot(`adv${String(i).padStart(2, '0')}`);
    // Stop the take the moment the dialog is gone. Left running, the harness
    // taps Enter into whatever came next (a boss fight, a room change) and the
    // motion report ends up describing a different room entirely.
    const top = await page.evaluate(() => window.__explore?.stateManager?.current?.constructor?.name ?? '');
    if (i > 3 && top !== 'DialogState') { await shot(`end${i}`); break; }
  }
  await waitOutStage();

  await sleep(600);
  await shot('final');

  const samples = await page.evaluate(() => { clearInterval(window.__cutTimer); return window.__cutSamples; });
  const seats = SEATS;

  // Motion report: per actor, distance travelled, facing delta, seat proof.
  const ids = [...new Set(samples.flatMap(s => Object.keys(s.a)))];
  const report = {};
  for (const id of ids) {
    const rows = samples.map(s => s.a[id]).filter(Boolean);
    if (!rows.length) continue;
    let dist = 0;
    for (let i = 1; i < rows.length; i++) dist += Math.hypot(rows[i].x - rows[i - 1].x, rows[i].z - rows[i - 1].z);
    const last = rows[rows.length - 1];
    const near = seats.reduce((b, s) => {
      const d = Math.hypot(s.x - last.x, s.z - last.z);
      return d < b.d ? { d, s } : b;
    }, { d: Infinity, s: null });
    report[id] = {
      frames: rows.length,
      distanceTiles: +dist.toFixed(2),
      walkedFrames: rows.filter(r => r.walk).length,
      satFrames: rows.filter(r => r.sit).length,
      start: { x: rows[0].x, z: rows[0].z, r: rows[0].r },
      end: { x: last.x, z: last.z, r: last.r, sit: last.sit },
      nearestSeatTiles: near.s ? +near.d.toFixed(2) : null,
      seatFacingDeltaDeg: (last.sit && near.s)
        ? +(Math.abs(((last.r - near.s.facing + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * 180 / Math.PI).toFixed(1)
        : null,
      spawned: !!last.spawned,
    };
  }

  fs.writeFileSync(path.join(OUT, 'actors.json'),
    JSON.stringify({ scene: SCENE, room: CFG.room, seats: seats.length, report, errors, shots, samples }, null, 2));

  const lines = [`SCENE ${SCENE}  room=${CFG.room}  seats=${seats.length}  frames=${samples.length}`];
  for (const [id, r] of Object.entries(report)) {
    lines.push(`  ${id.padEnd(18)} moved ${String(r.distanceTiles).padStart(6)} tiles   walkFrames ${String(r.walkedFrames).padStart(4)}   sitFrames ${String(r.satFrames).padStart(4)}`
      + `   end (${r.end.x}, ${r.end.z}) seat ${r.nearestSeatTiles}t`
      + (r.seatFacingDeltaDeg !== null ? ` seatFacingDelta ${r.seatFacingDeltaDeg}deg` : '')
      + (r.spawned ? '  [SPAWNED]' : ''));
  }
  if (errors.length) lines.push('', 'ERRORS:', ...errors.slice(0, 12));
  const txt = lines.join('\n');
  fs.writeFileSync(path.join(OUT, 'motion.txt'), txt + '\n');
  console.log(txt);

  await ctx.close();
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
