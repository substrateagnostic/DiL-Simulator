// REGRESSION-HUNT instrument (r-run): the STORY-FLAG REACHABILITY WALKER.
//
// The question it answers: starting from a genuinely fresh save, which story
// flags can a player reach, in what order, and which ones can they reach a
// LATER act with while an EARLIER act's flag is still unset?
//
// It is not a screenshot harness and it is not a reimplementation of the game.
// Every routing decision goes through the SHIPPING code:
//
//   * NPC dialog selection  -> `ExplorationState._getNpcDialogId()`  (which is
//     `_getDialogId()` + the silent `neutral_*` quest-stage swap, so a beat the
//     gate rejects shows up here as a neutral line, exactly as the player sees)
//   * interactable routing  -> `ExplorationState._getInteractableDialogId()`
//   * derived flags         -> `ExplorationState._refreshStoryProgress(true)`
//   * derived act index     -> `ExplorationState._syncActFromFlags()`
//   * node-level gating     -> `utils/dialogGating.js`, same import the game uses
//
// The only things modelled by hand are the ExplorationState code-side TRIGGERS
// (room-entry pushes, `update()` pushes, `_changeRoom` gates and the
// `flag-set` -> `_pendingDialog` chains). They are listed in ONE table below,
// `CODE_TRIGGERS`, with a source line reference each, so the model can be
// diffed against the file by eye.
//
// The walk is an OPTIMISTIC monotone fixpoint: at each round every action whose
// preconditions hold is played, every branch of its tree is explored, and every
// flag any branch could set is banked. Optimistic is the right polarity for
// this hunt — if a flag is NOT reachable optimistically, no player can reach it.
//
// Usage:  node tools/_r-actchain.mjs [--port=5173] [--json=<path>]
// Needs `npm run dev`. Runs HEADLESS on purpose: nothing is judged visually.

import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const JSONOUT = process.argv.find(a => a.startsWith('--json='))?.slice(7) || null;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));

let fails = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) fails++;
};

try {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=cubicle_farm&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });
  await page.waitForTimeout(800);

  const run = async (BRANCH) => await page.evaluate(async (BRANCH_LOCK) => {
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const { DIALOGS } = await import('/src/data/dialogs/index.js');
    const { ENCOUNTERS } = await import('/src/data/encounters/index.js');
    const gating = await import('/src/utils/dialogGating.js');

    const ex = window.__explore;
    const p = ex.player;

    // ── the code-side triggers, transcribed from ExplorationState ──────────
    // Each entry: [source, when(flags,room) -> bool, dialogId, latchFlag|null]
    // `room` is the room the trigger belongs to (null = fires from update()
    // wherever `currentRoom` matches, which is the same thing for our purposes).
    const CODE_TRIGGERS = [
      // room-entered listener, ExplorationState.js ~640-752
      { src: 'ES:671', room: 'hr_department', when: f => !f.defeated_hr_rep, dialog: 'hr_rep_combat' },
      { src: 'ES:681', room: 'archive', when: f => !f.visited_archive, dialog: 'security_guard_combat',
        sets: ['visited_archive', 'archive_found'] },
      { src: 'ES:699', room: 'cubicle_farm', when: f => f.has_charter && f.act3_complete && !f.act4_complete && !f.act5_triggered,
        dialog: 'act5_trigger', latch: 'act5_triggered' },
      { src: 'ES:709', room: 'executive_floor', when: f => f.corporate_lawyer_defeated && !f.act5_complete && !f.data_lead_fight_started,
        dialog: 'data_analytics_duo_intro', latch: 'data_lead_fight_started' },
      { src: 'ES:718', room: 'server_room', when: f => f.restructuring_trio_defeated && !f.alex_it_recruit_offered,
        dialog: 'alex_it_recruit', latch: 'alex_it_recruit_offered' },
      { src: 'ES:733', room: 'board_room', when: f => f.act4_complete && !f.act5_complete,
        dialog: 'meredith_boss_combat', sets: ['meredith_fight_started'] },
      { src: 'ES:744', room: 'penthouse', when: f => f.act6_complete && !f.penthouse_entered,
        dialog: 'penthouse_arrival', latch: 'penthouse_entered' },
      // the Act-2 finale, one per branch
      { src: 'ES:647', room: 'executive_floor', when: f => f.branch_chosen && f.path_legal && !(f.regional_defeated || f.compliance_defeated || f.skip_defeated),
        dialog: 'legal_eagle_ending', sets: ['ending_started'] },
      { src: 'ES:647', room: 'executive_floor', when: f => f.branch_chosen && f.path_bro && !(f.regional_defeated || f.compliance_defeated || f.skip_defeated),
        dialog: 'bro_code_ending', sets: ['ending_started'] },
      { src: 'ES:647', room: 'executive_floor', when: f => f.branch_chosen && f.path_grandma && !(f.regional_defeated || f.compliance_defeated || f.skip_defeated),
        dialog: 'secret_ending', sets: ['ending_started'] },
      // update() pushes, ExplorationState.js ~4007 / ~4016
      { src: 'ES:4007', room: 'cubicle_farm', when: f => f.act4_complete && !f.act5_complete && !f.restructuring_trio_started && !f.restructuring_trio_defeated,
        dialog: 'restructuring_trio_intro', latch: 'restructuring_trio_started' },
      { src: 'ES:4016', room: 'executive_floor', when: f => f.data_lead_defeated && !f.chief_fight_started,
        dialog: 'chief_restructuring_combat', latch: 'chief_fight_started' },
    ];

    // flag-set listener chains that queue a `_pendingDialog` (ES ~470-500)
    const PENDING_CHAINS = {
      has_recorder_seal: 'the_firm_ambush',
      penthouse_entered: 'cfos_assistant_combat',
      cfos_defeated: 'regional_director_combat',
      regional_director_defeated: 'algorithm_combat',
    };

    // `_changeRoom` gate table, ExplorationState.js ~1091-1112
    const ROOM_GATES = {
      executive_floor: 'branch_chosen',
      hr_department: 'hr_accessible',
      board_room: 'board_room_accessible',
      penthouse: 'act6_complete',
      city_street: 'city_unlocked',
      old_vault: 'delia_moved',
      penthouse_aquarium: 'renovation_penthouse',
      penthouse_analytics: 'renovation_penthouse',
      penthouse_bar: 'renovation_penthouse',
      // knowledge gates — modelled as flag gates (the normal, non-keypad path)
      archive: 'archive_accessible',
      vault: 'vault_accessible',
    };

    const f = () => p.flags;
    const has = k => !!p.flags[k];

    const reset = () => {
      p.flags = {};
      p.questStates = {};
      p.party = [];
      p.currentRoom = 'parking_garage';
      p.actIndex = 0;
      ex._syncActFromFlags();
    };

    // ── dialog tree walk ──────────────────────────────────────────────────
    // Explore every branch reachable under the CURRENT flag snapshot and
    // return the union of every flag/effect any branch could produce.
    const playTree = (dialogId, depthGuard = new Set()) => {
      const nodes = DIALOGS[dialogId];
      const res = { flags: [], combats: [], xp: 0, recruits: [], quests: [] };
      if (!nodes) return res;
      const gate = gating.getDialogQuestGate(dialogId);
      const stage = gating.getQuestStage(p);
      const nodeOk = (n) => {
        const mn = n.minQuestStage ?? gate?.min;
        const mx = n.maxQuestStage ?? gate?.max;
        if (mn === undefined && mx === undefined) return true;
        return gating.isStageInRange(stage, mn ?? 0, mx ?? Infinity);
      };
      const seen = new Set();
      const stack = [0];
      let shownAny = false;
      while (stack.length) {
        const i = stack.pop();
        if (seen.has(i)) continue;
        seen.add(i);
        const n = nodes[i];
        if (!n) continue;
        if (!nodeOk(n)) {
          stack.push(n.fallback !== undefined ? n.fallback : (n.next !== undefined ? n.next : i + 1));
          continue;
        }
        if (n.type === 'text') shownAny = true;
        if (n.type === 'end') continue;
        if (n.type === 'action') {
          if (n.action === 'set_flag') res.flags.push([n.flag, n.value !== undefined ? n.value : true]);
          if (n.action === 'start_combat') res.combats.push(n.encounter);
          if (n.action === 'give_xp') res.xp += (n.xp || 0);
          if (n.action === 'recruit_ally') res.recruits.push(n.ally);
          if (n.action === 'quest_update') res.quests.push(n.quest);
        }
        if (n.type === 'choice') {
          shownAny = true;
          for (const c of (n.choices || [])) {
            if (!nodeOk(c)) continue;
            if (c.requires && !has(c.requires)) continue;
            if (c.requiresNot && has(c.requiresNot)) continue;
            // A branch lock pins the Henderson decision to ONE path so the walk
            // is a playthrough and not a superposition of all three.
            if (BRANCH_LOCK && c.flag && /^path_/.test(c.flag) && c.flag !== BRANCH_LOCK) continue;
            // `choice.flag` / `choice.flagValue` — DialogState._showChoiceNode
            if (c.flag) res.flags.push([c.flag, c.flagValue !== undefined ? c.flagValue : true]);
            stack.push(c.next !== undefined ? c.next : i + 1);
          }
          continue;
        }
        if (n.type === 'condition') {
          // OPTIMISTIC: take the branch the current flags dictate, but also
          // take the other one when the flag is one this walk can still set.
          const t = n.ifTrue !== undefined ? n.ifTrue : i + 1;
          const fl = n.ifFalse !== undefined ? n.ifFalse : i + 1;
          if (has(n.flag)) stack.push(t); else { stack.push(fl); stack.push(t); }
          continue;
        }
        stack.push(n.next !== undefined ? n.next : i + 1);
      }
      res.shownAny = shownAny;
      if (shownAny) res.flags.push([`read_${dialogId}`, true]);
      return res;
    };

    // ── the walk ──────────────────────────────────────────────────────────
    const TRACK = [
      'briefing_complete', 'ready_for_skip', 'branch_chosen',
      'karen_defeated', 'chad_defeated', 'grandma_defeated',
      'act2_complete', 'knows_server_secret', 'alex_it_act3_done',
      'archive_accessible', 'visited_archive', 'has_archive_password',
      'has_archive_evidence', 'act3_complete', 'read_janitor_act3',
      'janet_rallied', 'diane_rallied', 'skip_rallied', 'janitor_rallied',
      'vault_accessible', 'hr_accessible', 'vault_code_1', 'vault_code_2',
      'vault_code_3', 'has_charter', 'act5_triggered', 'act4_complete',
      'restructuring_trio_defeated', 'corporate_lawyer_defeated',
      'data_lead_defeated', 'chief_restructuring_defeated',
      'board_room_accessible', 'meredith_fight_started', 'act5_complete',
      'skip_speech_ready', 'board_meeting_held', 'rolex_available',
      'has_rolex', 'act6_complete', 'penthouse_entered',
      'regional_director_defeated', 'algorithm_defeated', 'act7_complete',
    ];

    reset();
    const firstSeen = {};
    const order = [];
    const trace = [];
    const reachRooms = new Set(['parking_garage']);
    const playedOnce = new Set();

    const applyFlag = (k, v, why) => {
      const before = !!p.flags[k];
      p.setFlag(k, v);
      const after = !!p.flags[k];
      if (!before && after) {
        if (firstSeen[k] === undefined) { firstSeen[k] = round; if (TRACK.includes(k)) order.push(k); }
        trace.push({ round, flag: k, why });
      }
    };

    const derive = () => {
      ex._refreshStoryProgress(true);
      ex._syncActFromFlags();
      // the two flag-set effects the listener owns that matter to the chain
      if (has('has_rolex') && !has('act6_complete')) applyFlag('act6_complete', true, 'ES:486 has_rolex');
      if (has('algorithm_defeated') && !has('act7_complete')) applyFlag('act7_complete', true, 'ES:463');
      // derived flags _refreshStoryProgress writes are picked up automatically;
      // record any newly-true tracked flag we have not attributed yet
      for (const k of TRACK) {
        if (p.flags[k] && firstSeen[k] === undefined) { firstSeen[k] = round; order.push(k); trace.push({ round, flag: k, why: 'derived' }); }
      }
    };

    const runDialog = (dialogId, why) => {
      if (!DIALOGS[dialogId]) return;
      const r = playTree(dialogId);
      for (const [k, v] of r.flags) applyFlag(k, v, `${why}:${dialogId}`);
      derive();
      for (const encId of r.combats) {
        const enc = ENCOUNTERS[encId];
        applyFlag(`defeated_${encId}`, true, `combat:${encId}`);
        applyFlag(`bestiary_${encId}`, true, `combat:${encId}`);
        const storyBoss = { karen: 'karen_defeated', chad: 'chad_defeated', grandma: 'grandma_defeated' };
        if (enc && storyBoss[enc.enemyId]) applyFlag(storyBoss[enc.enemyId], true, `combat:${encId}`);
        derive();
        if (enc && enc.postDialogId) runDialog(enc.postDialogId, `post:${encId}`);
      }
      // flag-set -> _pendingDialog chains
      for (const [k, d] of Object.entries(PENDING_CHAINS)) {
        if (has(k) && !playedOnce.has(`pend:${d}`)) { playedOnce.add(`pend:${d}`); runDialog(d, 'pending'); }
      }
    };

    let round = 0;
    let changed = true;
    const MAX = 40;
    const npcServed = [];
    while (changed && round < MAX) {
      round++;
      const before = JSON.stringify(Object.keys(p.flags).sort());

      // 1. room reachability
      let grew = true;
      while (grew) {
        grew = false;
        for (const rid of Array.from(reachRooms)) {
          const rd = ROOMS[rid];
          if (!rd) continue;
          for (const e of (rd.exits || [])) {
            const t = e.targetRoom;
            if (reachRooms.has(t)) continue;
            const g = ROOM_GATES[t];
            if (g && !has(g)) continue;
            reachRooms.add(t); grew = true;
          }
        }
      }

      // 2. code-side triggers
      for (const t of CODE_TRIGGERS) {
        if (!reachRooms.has(t.room)) continue;
        if (!t.when(p.flags)) continue;
        p.currentRoom = t.room;
        if (t.latch) applyFlag(t.latch, true, `${t.src}:latch`);
        for (const s of (t.sets || [])) applyFlag(s, true, `${t.src}:set`);
        derive();
        runDialog(t.dialog, t.src);
      }

      // 3. NPCs + interactables in every reachable room
      for (const rid of Array.from(reachRooms)) {
        const rd = ROOMS[rid];
        if (!rd) continue;
        p.currentRoom = rid;
        ex._syncActFromFlags();
        for (const n of (rd.npcs || [])) {
          const c = n.condition;
          if (c) {
            if (c.flag && !has(c.flag)) continue;
            if (c.notFlag && has(c.notFlag)) continue;
          }
          if (n.interactable === false) continue;
          let served = null;
          try { served = ex._getNpcDialogId({ id: n.id, dialogId: n.dialogId || n.id }); } catch (err) { served = null; }
          if (!served) continue;
          npcServed.push({ round, room: rid, npc: n.id, entryDialog: n.dialogId || null, served });
          runDialog(served, `npc:${rid}/${n.id}`);
          // routers chain via _pendingDialog
          ex._pendingDialog = null;
          for (const chosen of ['alex_story_chosen', 'alex_side_chosen', 'alex_main_chosen', 'janitor_story_chosen', 'janitor_riddle_chosen']) {
            if (p.flags[chosen]) { p.setFlag(chosen, false); }
          }
        }
        for (const it of (rd.interactables || [])) {
          if (!it.dialogId) continue;
          if (it.condition) {
            if (it.condition.flag && !has(it.condition.flag)) continue;
            if (it.condition.notFlag && has(it.condition.notFlag)) continue;
          }
          let did = it.dialogId;
          try { did = ex._getInteractableDialogId(it); } catch (err) { /* keep raw */ }
          runDialog(did, `int:${rid}/${it.dialogId}`);
        }
      }

      const after = JSON.stringify(Object.keys(p.flags).sort());
      changed = before !== after;
    }

    // ── ORDER VIOLATIONS ──────────────────────────────────────────────────
    // The act spine must accumulate. Report any later act flag that became
    // reachable in a round at or before an earlier one (or without it at all).
    const SPINE = ['briefing_complete', 'branch_chosen', 'act2_complete', 'act3_complete',
                   'act4_complete', 'act5_complete', 'act6_complete', 'act7_complete'];
    const violations = [];
    for (let i = 1; i < SPINE.length; i++) {
      const cur = firstSeen[SPINE[i]], prev = firstSeen[SPINE[i - 1]];
      if (cur === undefined) { violations.push(`${SPINE[i]} UNREACHABLE`); continue; }
      if (prev === undefined) { violations.push(`${SPINE[i]} reachable (round ${cur}) but ${SPINE[i - 1]} is UNREACHABLE`); continue; }
      if (cur < prev) violations.push(`${SPINE[i]} (round ${cur}) lands BEFORE ${SPINE[i - 1]} (round ${prev})`);
    }

    return {
      rounds: round,
      rooms: Array.from(reachRooms).sort(),
      firstSeen,
      order,
      violations,
      unreachable: TRACK.filter(k => firstSeen[k] === undefined),
      trace: trace.filter(t => TRACK.includes(t.flag)),
      npcServed: npcServed.filter(s => /neutral_/.test(s.served)),
      allServed: npcServed,
      allFlags: Object.keys(p.flags).filter(k => p.flags[k]).sort(),
      finalAct: p.actIndex,
      branch: BRANCH_LOCK,
    };
  }, BRANCH);

  const results = {};
  for (const branch of ['path_legal', 'path_bro', 'path_grandma']) {
    results[branch] = await run(branch);
  }
  const out = results.path_legal;

  for (const [branch, r] of Object.entries(results)) {
    console.log(`\n######## BRANCH ${branch} ########`);
    console.log('ACT SPINE:');
    for (const k of ['briefing_complete', 'branch_chosen', 'act2_complete', 'act3_complete',
                     'act4_complete', 'act5_complete', 'act6_complete', 'act7_complete']) {
      console.log(`  ${k.padEnd(20)} ${r.firstSeen[k] === undefined ? 'UNREACHABLE' : 'round ' + r.firstSeen[k]}`);
    }
    if (r.unreachable.length) console.log('UNREACHABLE TRACKED: ' + r.unreachable.join(', '));
    if (r.violations.length) console.log('VIOLATIONS: ' + r.violations.join(' | '));
    check(`[${branch}] act spine complete and in order`, r.violations.length === 0,
      r.violations.join(' | ') || 'clean');
  }

  console.log('\n=== ROOMS REACHED ===');
  console.log(out.rooms.join(', '));
  console.log(`\n=== ACT SPINE (round first reachable) ===`);
  for (const k of ['briefing_complete', 'branch_chosen', 'act2_complete', 'act3_complete',
                   'act4_complete', 'act5_complete', 'act6_complete', 'act7_complete']) {
    console.log(`  ${k.padEnd(20)} ${out.firstSeen[k] === undefined ? 'UNREACHABLE' : 'round ' + out.firstSeen[k]}`);
  }
  console.log(`\n=== TRACKED FLAG ORDER ===`);
  console.log(out.order.join(' -> '));
  if (out.unreachable.length) {
    console.log('\n=== UNREACHABLE TRACKED FLAGS ===');
    out.unreachable.forEach(k => console.log('  ' + k));
  }
  if (out.npcServed.length) {
    console.log('\n=== NPCs SERVED A NEUTRAL LINE (quest-stage gate rejected the routed dialog) ===');
    const uniq = new Map();
    for (const s of out.npcServed) uniq.set(`${s.room}/${s.npc}/${s.entryDialog}`, s);
    for (const s of uniq.values()) console.log(`  round ${s.round}  ${s.room}/${s.npc}  entry=${s.entryDialog}  -> ${s.served}`);
  }
  console.log('\n=== ORDER VIOLATIONS ===');
  out.violations.forEach(v => console.log('  ' + v));

  check('full act spine reachable', out.violations.length === 0, out.violations.join(' | ') || 'clean');
  check('act4_complete reachable', out.firstSeen.act4_complete !== undefined);
  check('act5_complete reachable', out.firstSeen.act5_complete !== undefined);
  check('act6_complete reachable', out.firstSeen.act6_complete !== undefined);
  check('act4_complete precedes act5_complete',
    out.firstSeen.act4_complete !== undefined && out.firstSeen.act5_complete !== undefined
    && out.firstSeen.act4_complete <= out.firstSeen.act5_complete);

  if (JSONOUT) { writeFileSync(JSONOUT, JSON.stringify(out, null, 2)); console.log(`\nwrote ${JSONOUT}`); }
  console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAIL(S)'}`);
} finally {
  await browser.close();
}
process.exit(fails === 0 ? 0 : 1);
