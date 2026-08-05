// THROWAWAY evidence harness for the F-remainder build.
//
//   node tools/_f-evidence.mjs [--port=5173] [--only=transfer,thoughts,ambience,seam,cosmetics]
//
// HEADED per HANDOFF_PACKAGE §4.7. Every check drives the SHIPPING path
// (real key events at a human hold, real menu items, real room changes) —
// see §4.3, "verify the call path".

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const ONLY = (process.argv.find(a => a.startsWith('--only='))?.slice(7) || '').split(',').filter(Boolean);
const want = (k) => !ONLY.length || ONLY.includes(k);
const OUT = 'screenshots/f-run';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));

const tap = async (key, ms = 70) => {
  await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key);
};
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

await page.goto(`http://localhost:${PORT}/?dev`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
// Title -> new game
await tap('Enter'); await page.waitForTimeout(400);
await tap('Enter'); await page.waitForTimeout(3500);
await page.evaluate(() => window.__explore && (window.__explore.paused = false));

// ── 1. THOUGHTS: both lines of a pair, queued, not one of two ──────────────
if (want('thoughts')) {
  const seen = await page.evaluate(async () => {
    const ex = window.__explore;
    const arb = (await import('/src/core/NotificationArbiter.js')).NotificationArbiter;
    const before = arb.getLog().length;
    // Fire the shipping path for a room with a two-line pair the player has
    // not visited: clear the latch and re-run the entry handler.
    ex.player.setFlag('thought_city_street', false);
    ex._showMonologue.call(ex, null);           // no-op guard sanity
    const T = (await import('/src/data/thoughts.js')).ROOM_THOUGHTS.city_street;
    for (const t of T) ex._showMonologue(t);
    // The whole point of the change is that line two QUEUES behind line one
    // instead of overwriting it, so the second only reaches the log when the
    // first has served its reading-time ttl (VOICE floor is 2400 ms). Waiting
    // it out is the measurement: a first-writer-loses surface would still show
    // exactly one entry here.
    await new Promise(r => setTimeout(r, 7000));
    const log = arb.getLog().slice(before);
    return { authored: T.length, posted: log.length, texts: log.map(e => (e.text || '').slice(0, 44)) };
  });
  check('room thoughts: every authored line reaches the arbiter',
    seen.posted === seen.authored, `authored=${seen.authored} posted=${seen.posted} :: ${seen.texts.join(' // ')}`);
  await page.screenshot({ path: `${OUT}/thoughts-show-both.png` });
  // Let the VOICE zone drain fully — the next block measures ambience, which
  // is SUPPOSED to be silent while VOICE is up, and would read 0 for the wrong
  // reason if it started inside this one's tail.
  await page.waitForTimeout(1500);
}

// ── 2. AMBIENCE: the scheduler fires, and defers to VOICE ──────────────────
if (want('ambience')) {
  const amb = await page.evaluate(async () => {
    const ex = window.__explore;
    const AM = (await import('/src/core/AudioManager.js')).AudioManager;
    const arb0 = (await import('/src/core/NotificationArbiter.js')).NotificationArbiter;
    const NC0 = (await import('/src/core/NotificationArbiter.js')).NC;
    // Guard the guard: if a VOICE surface is still up from an earlier block,
    // "0 cues" would pass the free-running check for the wrong reason.
    if (arb0.isActive(NC0.VOICE)) return { blockedAtStart: true };
    const fired = [];
    const real = AM.playSfx.bind(AM);
    AM.playSfx = (t) => { if (String(t).startsWith('amb_')) fired.push(t); return real(t); };
    // Drive 90 simulated seconds of the SHIPPING update loop in the hub.
    for (let i = 0; i < 5400; i++) ex._updateAmbience(1 / 60);
    const duringFree = fired.length;
    // Now hold a VOICE surface and drive another 90 s — the rule is SKIP.
    const arb = (await import('/src/core/NotificationArbiter.js')).NotificationArbiter;
    const NC = (await import('/src/core/NotificationArbiter.js')).NC;
    const rel = arb.hold(NC.VOICE, 'f-evidence');
    const mark = fired.length;
    for (let i = 0; i < 5400; i++) ex._updateAmbience(1 / 60);
    const duringVoice = fired.length - mark;
    rel();
    // A room with no entry (floor_13) must stay silent.
    ex.player.currentRoom = 'floor_13';
    const mark2 = fired.length;
    for (let i = 0; i < 5400; i++) ex._updateAmbience(1 / 60);
    const duringSilentRoom = fired.length - mark2;
    AM.playSfx = real;
    const uniq = [...new Set(fired)];
    // No cue twice in a row.
    let repeats = 0;
    for (let i = 1; i < fired.length; i++) if (fired[i] === fired[i - 1]) repeats++;
    return { duringFree, duringVoice, duringSilentRoom, uniq, repeats };
  });
  check('ambience measurement started with no VOICE up', !amb.blockedAtStart);
  check('ambience fires on the exploration clock', amb.duringFree > 0,
    `${amb.duringFree} cues in 90 s, ${amb.uniq.length} distinct: ${amb.uniq.join(' ')}`);
  check('ambience DEFERS to a VOICE surface', amb.duringVoice === 0,
    `${amb.duringVoice} cues while VOICE held (want 0)`);
  check('a room with no entry stays silent', amb.duringSilentRoom === 0,
    `floor_13 fired ${amb.duringSilentRoom} (want 0)`);
  check('never the same cue twice running', amb.repeats === 0, `${amb.repeats} immediate repeats`);
}

// ── 3. SEAM: near-band thin towers drop their seam in the dark palettes ────
if (want('seam')) {
  const seam = await page.evaluate(async () => {
    const { Engine } = await import('/src/core/Engine.js');
    const cb = Engine.cityBackdrop;
    if (!cb) return null;
    const near = cb.buildings.filter(b => b.thin && b.radius <= 33 && b.variant !== 3);
    const row = {};
    for (const tod of ['morning', 'afternoon', 'goldenhour', 'dusk', 'night', 'predawn']) {
      row[tod] = {
        orphanRule: cb._seamOrphans(tod),
        seamedNearThin: near.filter(b => cb._facadeVariant(b, tod) !== 3).length,
      };
    }
    return { nearThinTotal: near.length, row };
  });
  if (!seam) {
    check('city backdrop reachable', false, 'no window handle');
  } else {
    const dark = ['dusk', 'night', 'predawn'];
    const day = ['morning', 'afternoon'];
    check('near-band thin towers keep their seam in daylight',
      day.every(k => seam.row[k].seamedNearThin === seam.nearThinTotal),
      day.map(k => `${k}=${seam.row[k].seamedNearThin}/${seam.nearThinTotal}`).join(' '));
    check('near-band thin towers drop their seam in the dark palettes',
      dark.every(k => seam.row[k].seamedNearThin === 0),
      dark.map(k => `${k}=${seam.row[k].seamedNearThin}/${seam.nearThinTotal}`).join(' '));
    writeFileSync(`${OUT}/seam-bands.json`, JSON.stringify(seam, null, 2));
  }
}

// ── 4. COSMETICS: the five new unlocks light up off their real flags ───────
if (want('cosmetics')) {
  const cos = await page.evaluate(async () => {
    const p = window.__explore.player;
    const ids = ['form_11c_cert', 'fennimore_citation', 'ledger_pencil', 'high_score_crown', 'stewards_badge'];
    const before = ids.map(id => p.isCosmeticUnlocked(id));
    p.setFlag('charter_certified', true);
    p.setFlag('meter_war_done', true);
    p.setFlag('janitor_names_complete', true);
    p.setFlag('arcade_fire_horses', true);
    const SHOP = (await import('/src/data/shop.js')).SHOP_ITEMS;
    for (const it of SHOP) if (it.category === 'renovation' && it.flag) p.setFlag(it.flag, true);
    window.__explore._refreshStoryProgress(true);
    const after = ids.map(id => p.isCosmeticUnlocked(id));
    // And they must actually BUILD — a cosmetic with no mesh function is a
    // wardrobe entry that equips to nothing.
    const built = {};
    for (const id of ids) {
      p.equipCosmetic(id);
      built[id] = p.mesh.children.length + (p.mesh.head ? p.mesh.head.children.length : 0);
    }
    return { before, after, built, renovationsAll: !!p.getFlag('renovations_all') };
  });
  check('five late-game cosmetics locked before their flags', cos.before.every(v => !v), JSON.stringify(cos.before));
  check('five late-game cosmetics unlock off their real flags', cos.after.every(v => v), JSON.stringify(cos.after));
  check('renovations_all derives from every renovation flag', cos.renovationsAll);
  check('every new cosmetic builds a mesh', Object.values(cos.built).every(n => n > 0), JSON.stringify(cos.built));
}

// ── 5. TRANSFER: export -> code -> decode -> apply, through the real panel ──
if (want('transfer')) {
  // Round-trip the contract itself first (pure, no UI).
  const rt = await page.evaluate(async () => {
    const { SaveManager } = await import('/src/core/SaveManager.js');
    const p = window.__explore.player;
    p.setFlag('act5_complete', true);
    p.stats.aum = 1234567;
    // Size the test against the save that ACTUALLY needs squeezing.
    // `A1-ux-audit.md` C6: every dialog choice writes a permanent `_chose_…`
    // flag, so a completionist blob is thousands of keys. A fresh save is
    // 2 KB and gzip cannot beat base64 overhead on 2 KB — measuring the
    // compression on one would be measuring nothing.
    for (let i = 0; i < 1200; i++) p.setFlag(`_chose_synthetic_dialog_${i}_${i % 4}`, true);
    SaveManager.save(p.serialize());
    const payload = SaveManager.buildExportPayload();
    const code = await SaveManager.encodeExport(payload);
    const back = await SaveManager.decodeExport(code);
    const rawLen = JSON.stringify(payload).length;
    return {
      codeLen: code.length,
      rawLen,
      ratio: +(code.length / rawLen).toFixed(3),
      prefixOK: code.startsWith('TI1-'),
      roundTrip: !!back && back.carry.aum === payload.carry.aum && back.save.stats.aum === 1234567,
      carryKeys: Object.keys(payload.carry).sort(),
      carryFlagCount: Object.keys(payload.carry.flags).length,
      saveFlagCount: Object.keys(payload.save.flags).length,
      garbage: await SaveManager.decodeExport('TI1-Znot-a-real-code'),
      wrongMagic: SaveManager.validateExport({ fmt: 'NOPE', save: {} }),
      card: SaveManager.describeCarry(payload.carry),
    };
  });
  check('code carries the TI1- prefix', rt.prefixOK, `len=${rt.codeLen}`);
  check('code round-trips to the same carry + save', rt.roundTrip);
  check('code is compressed, not raw JSON', rt.ratio < 0.6, `${rt.codeLen} chars vs ${rt.rawLen} raw = ${rt.ratio}x`);
  check('carry flags are a whitelist, not the blob', rt.carryFlagCount <= rt.saveFlagCount,
    `carry=${rt.carryFlagCount} of save=${rt.saveFlagCount}`);
  check('carry reserves the C2 keys', ['moralBand', 'breaches', 'chapter', 'carryVersion'].every(k => rt.carryKeys.includes(k)),
    rt.carryKeys.join(','));
  check('garbage code is rejected, not thrown', rt.garbage === null);
  check('wrong magic is rejected', rt.wrongMagic === null);
  console.log('  card:', JSON.stringify(rt.card));

  // Now the real panel, through the real menu.
  await tap('Escape'); await page.waitForTimeout(700);
  const idx = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    const m = st[st.length - 1];
    return m.menuItems ? m.menuItems.indexOf('Transfer Save') : -1;
  });
  check('Transfer Save is in the pause menu', idx >= 0, `index=${idx}`);
  for (let i = 0; i < idx; i++) { await tap('ArrowDown', 60); await page.waitForTimeout(90); }
  await tap('Enter'); await page.waitForTimeout(1400);
  const panel = await page.evaluate(() => {
    const t = document.querySelector('#tx-code');
    const card = document.querySelector('#tx-card');
    return {
      open: !!t,
      codeFilled: !!t && t.value.startsWith('TI1-'),
      cardRows: card ? card.querySelectorAll('.tx-row').length : 0,
      cardText: card ? card.innerText.replace(/\n+/g, ' | ') : '',
      status: document.querySelector('#tx-status')?.textContent || '',
    };
  });
  check('transfer panel opens with the code staged', panel.open && panel.codeFilled, panel.status);
  check('the card renders its record-of-service rows', panel.cardRows >= 4, panel.cardText);
  await page.screenshot({ path: `${OUT}/transfer-panel.png` });
  // Escape must close it, and confirm must NOT (the box is a textarea).
  await tap('Enter'); await page.waitForTimeout(400);
  const stillOpen = await page.evaluate(() => !!document.querySelector('#tx-code'));
  check('Enter does not dismiss the panel (it is a text field)', stillOpen);
  await tap('Escape'); await page.waitForTimeout(400);
  const closed = await page.evaluate(() => !document.querySelector('#tx-code'));
  check('Escape closes the panel', closed);
}

// ── 6. SCENES: the rooms and people who stopped existing (F-2/4/5/6/12) ────
if (want('scenes')) {
  // Get back to ExplorationState first. EntityManager evaluates every NPC's
  // conditionFn from ExplorationState.update, which returns early while
  // `paused` — so with a MenuState still on the stack from the transfer block
  // EVERY conditional NPC reads hidden and this whole section measures an
  // empty room for the wrong reason. (It did, on the first full run.)
  for (let i = 0; i < 4; i++) {
    const top = await page.evaluate(() => {
      const st = window.__explore.stateManager.stack;
      return st[st.length - 1]?.constructor.name;
    });
    if (top === 'ExplorationState') break;
    await tap('Escape'); await page.waitForTimeout(500);
  }
  await page.waitForTimeout(400);
  const top = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    return `${st[st.length - 1]?.constructor.name}/paused=${!!window.__explore.paused}`;
  });
  check('scene block starts in an unpaused ExplorationState', top === 'ExplorationState/paused=false', top);

  // One flag state that satisfies every new placement at once, applied through
  // the same path the F2 dev panel uses.
  await page.evaluate(async () => {
    const ex = window.__explore;
    Object.assign(ex.player.flags, {
      briefing_complete: true, branch_chosen: true,
      karen_defeated: true, chad_defeated: true, grandma_defeated: true,
      act2_complete: true, act3_complete: true, act4_complete: true,
      act5_complete: true, act6_complete: true, algorithm_defeated: true,
      has_rolex: true, janitor_names_started: true, janitor_has_ledger: true,
      janitor_names_complete: true, read_janitor_pattern: true,
      renovation_penthouse: true, hr_accessible: true, vault_accessible: true,
      met_janitor: true, defeated_intern: true, karen_first_meeting_over: true,
    });
    ex._syncActFromFlags?.();
    ex._refreshStoryProgress(true);
  });

  const SCENES = [
    ['break_room', 'chad', 'chad_return'],
    ['executive_floor', 'meredith', 'meredith_footnote'],
    ['conference_room', 'intern', 'intern_rehearsal'],
    ['penthouse_bar', null, 'penthouse_pool_table'],
    ['penthouse_aquarium', null, 'penthouse_reel'],
    ['penthouse_analytics', null, 'penthouse_analytics_console'],
    ['vault', null, 'vault_ledger_niche'],
    ['parking_garage', null, 'janitor_closet_after'],
  ];
  for (const [room, npcId, dialogId] of SCENES) {
    const r = await page.evaluate(async ({ room, npcId, dialogId }) => {
      const ex = window.__explore;
      const { DIALOGS } = await import('/src/data/dialogs/index.js');
      await ex._changeRoom(room, 1, 1);
      await new Promise(res => setTimeout(res, 500));
      // Visible NPCs the room actually built, with their tiles — two bodies on
      // one tile is a head inside a head whatever the conditions say.
      const vis = (ex.roomManager?.entityManager?.npcs || []).filter(n => n.mesh?.visible);
      const npcs = vis.map(n => `${n.id}@${n.position.x.toFixed(1)},${n.position.z.toFixed(1)}`);
      const tiles = vis.map(n => `${Math.round(n.position.x)},${Math.round(n.position.z)}`);
      const stacked = tiles.filter((t, i) => tiles.indexOf(t) !== i);
      // The interactable/NPC must ROUTE to the dialog we appended, through
      // the shipping resolver — not merely exist in DIALOGS.
      let routed = null;
      if (npcId) {
        // The VISIBLE one. A room can hold several entries under one id and
        // `.find` without this returns whichever was declared first, which is
        // usually the hidden Act-1 body.
        const npc = (ex.roomManager?.entityManager?.npcs || []).find(n => n.id === npcId && n.mesh?.visible);
        // Through _getNpcDialogId, not _getDialogId: the quest-stage validator
        // sits between them and can substitute `neutral_<id>`.
        routed = npc ? ex._getNpcDialogId(npc) : null;
      } else {
        // Room keeps its definition on `.data`; there is no `.interactables`.
        const it = (ex.roomManager?.currentRoom?.data?.interactables || [])
          .find(i => i.dialogId === dialogId);
        // And it must actually be LIVE under the current flags, not merely
        // declared — every one of these is condition-gated.
        const live = it && (!it.condition
          || ((!it.condition.flag || ex.player.getFlag(it.condition.flag))
            && (!it.condition.notFlag || !ex.player.getFlag(it.condition.notFlag))));
        routed = live ? it.dialogId : null;
      }
      return { npcs, stacked, routed, nodes: DIALOGS[dialogId]?.length ?? 0, room: ex.player.currentRoom };
    }, { room, npcId, dialogId });
    check(`${room} -> ${dialogId}`, r.routed === dialogId && r.nodes > 0,
      `routed=${r.routed} nodes=${r.nodes} visible=[${r.npcs.join(' ')}]`);
    check(`${room}: no two bodies on one tile`, r.stacked.length === 0, r.stacked.join(' '));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/scene-${room}.png` });
  }

  // F-12 — the Janitor's name routes only after the pattern scene, and once.
  const jan = await page.evaluate(() => {
    const ex = window.__explore;
    const fake = { id: 'janitor' };
    const before = ex._getDialogId(fake);
    ex.player.setFlag('read_janitor_the_name', true);
    const after = ex._getDialogId(fake);
    ex.player.setFlag('read_janitor_pattern', false);
    ex.player.setFlag('read_janitor_the_name', false);
    const withoutPattern = ex._getDialogId(fake);
    ex.player.setFlag('read_janitor_pattern', true);
    return { before, after, withoutPattern };
  });
  check('F-12 the name routes once the pattern has landed', jan.before === 'janitor_the_name', jan.before);
  check('F-12 the name does not repeat', jan.after !== 'janitor_the_name', jan.after);
  check('F-12 the pattern scene still comes first', jan.withoutPattern === 'janitor_pattern', jan.withoutPattern);
}

// ── 7. LIGHTING: every room's fixture profile, measured off the built scene ─
if (want('light')) {
  const light = await page.evaluate(async () => {
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const ex = window.__explore;
    // OPEN EVERY DOOR FIRST. `_changeRoom` has a gate table plus two keypad
    // intercepts, and a blocked change leaves the PREVIOUS room's FX group in
    // the scene — which reads as "this room has 0 fixtures" and is a lie about
    // the wrong room. (Five rooms reported 0 that way on the first run: the
    // stairwell legitimately, and then archive / hr_department / vault /
    // board_room because the sweep never got in.)
    Object.assign(ex.player.flags, {
      branch_chosen: true, hr_accessible: true, vault_accessible: true,
      archive_accessible: true, board_room_accessible: true,
      act5_complete: true, act6_complete: true, city_unlocked: true,
      delia_moved: true, renovation_penthouse: true, floor_13_found: true,
      has_archive_password: true, vault_code_1: true, vault_code_2: true, vault_code_3: true,
      // The penthouse elevator scans the charter for a Recorder's seal
      // BEFORE the gate table (`SEAL NOT RECOGNIZED`), so act6_complete
      // alone is not enough to get in.
      charter_certified: true, read_charter_challenge: true,
    });
    ex._refreshStoryProgress(true);
    // Reach the FX group through the APP's own object graph, not through a
    // fresh `import('/src/core/Engine.js')`. Vite serves an HMR-updated module
    // at `…?t=<stamp>`, so a plain dynamic import after an edit hands back a
    // SECOND EngineClass instance whose `scene` and `_roomFX` are null — which
    // reads as "zero fixtures in every room" and passes any check written the
    // wrong way round. (It did, once, on this very block.)
    const rows = [];
    for (const id of Object.keys(ROOMS)) {
      await ex._changeRoom(id, 1, 1);
      await new Promise(r => setTimeout(r, 700));
      const fx = ex.roomManager?.mainScene?.getObjectByName('room_fx');
      // A ceiling fixture is a Group whose y sits at wall-top height; the pools
      // and the seam frame are flat planes on the floor. Count what is actually
      // in the scene, not what the data asked for.
      let fixtures = 0, pools = 0;
      if (fx) for (const c of fx.children) {
        if (c.isGroup && c.position.y > 1.5) fixtures++;
        else if (c.isMesh && c.position.y < 0.03 && c.material?.blending === 2) pools++;
      }
      rows.push({
        room: id,
        entered: ex.player.currentRoom === id,
        landedIn: ex.player.currentRoom,
        built: ex.roomManager?.currentRoomId,
        profile: ROOMS[id].fx?.fixtures || '(derived)',
        dir: ROOMS[id].lighting?.dirIntensity ?? null,
        fixtures, pools,
      });
    }
    return rows;
  });
  writeFileSync(`${OUT}/lighting-profiles.json`, JSON.stringify(light, null, 2));
  const authored = light.filter(r => r.profile !== '(derived)');
  check('every room now names its fixture profile', authored.length === light.length,
    `${authored.length}/${light.length} authored`);
  const missed = light.filter(r => !r.entered).map(r => r.room);
  check('the sweep actually entered every room', missed.length === 0, missed.join(' '));
  // The three rooms that were running office ceiling troffers by accident.
  for (const id of ['penthouse_aquarium', 'penthouse_analytics', 'city_street']) {
    const r = light.find(x => x.room === id);
    check(`${id} no longer hangs office troffers`, r && r.profile === 'none' && r.fixtures === 0,
      `profile=${r?.profile} fixtures=${r?.fixtures}`);
  }
  // And the rooms that SHOULD have them, do.
  for (const id of ['cubicle_farm', 'reception', 'executive_floor', 'parking_garage', 'break_room']) {
    const r = light.find(x => x.room === id);
    check(`${id} has sourced fixtures (${r?.profile})`, r && r.fixtures > 0,
      `profile=${r?.profile} fixtures=${r?.fixtures} pools=${r?.pools}`);
  }
  console.log('  profiles: ' + light.map(r => `${r.room}=${r.profile}/${r.fixtures}`).join(' '));
}

const fails = results.filter(r => !r.ok).length;
writeFileSync(`${OUT}/evidence.json`, JSON.stringify({ results, logs: logs.slice(-40) }, null, 2));
console.log(`\n${fails === 0 ? 'F-EVIDENCE PASS' : `F-EVIDENCE FAIL (${fails})`} — ${results.length} checks`);
await browser.close();
process.exit(fails ? 1 : 0);
