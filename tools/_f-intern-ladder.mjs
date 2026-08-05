// D3 evidence: the Intern is in exactly ONE room at every step of Act 6, and
// the rally still lands.
//
// The census in tools/_ux-dev.mjs proves the placements are disjoint under the
// eight preset states. It does NOT prove the ladder still WORKS -- and the
// dangerous half of this fix is that the conference-room rehearsal carries a
// hardcoded `dialogId`, which per CLAUDE.md outranks act routing, so a single
// entry there would have shadowed `intern_act6` forever and left the Act 6 ally
// counter stuck at 4/5 with no way to say so. This walks the real ladder
// through the shipping resolver and asserts, at each step, both the room count
// and the dialog the game would actually serve.
//
// HEADED, `?qtier=high`.
import { chromium } from 'playwright';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

try {
  await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act6&shot=cubicle_farm`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(800);

  // Each step: a flag delta, then "which rooms hold a live Intern" and "what
  // does the game serve when you talk to him".
  const STEPS = [
    ['act 5, at his desk', { act5_complete: false }, ['cubicle_farm']],
    ['act 6 opens, he is rehearsing', { act5_complete: true }, ['conference_room']],
    ['rehearsal read, act routing resumes', { read_intern_rehearsal: true }, ['conference_room']],
    ['rallied, he moves to the board room', { intern_act6_rallied: true }, ['board_room']],
    ['meeting closed, back at his desk', { board_meeting_closed: true }, ['cubicle_farm']],
  ];

  const rows = await page.evaluate(async ({ STEPS }) => {
    const { ROOMS } = await import('/src/data/rooms/index.js');
    const ex = window.__explore;
    // A clean Act-6-eve state: story through act 5, lunch thief finished, the
    // rehearsal unread, nobody rallied.
    for (const k of ['read_intern_rehearsal', 'intern_act6_rallied', 'board_meeting_closed',
      'board_meeting_held', 'act6_complete', 'has_rolex', 'algorithm_defeated']) ex.player.flags[k] = false;
    ex.player.flags.lunch_thief_culprit_revealed = true;
    ex.player.flags.lunch_thief_complete = true;
    const out = [];
    for (const [label, delta, expect] of STEPS) {
      Object.assign(ex.player.flags, delta);
      ex._syncActFromFlags?.();
      ex._refreshStoryProgress(true);
      const f = ex.player.flags;
      const match = (c) => !c
        || ((!c.flag || f[c.flag]) && (!c.notFlag || !f[c.notFlag]));
      const rooms = [];
      let entries = 0;
      for (const [rid, room] of Object.entries(ROOMS)) {
        const live = (room.npcs || []).filter(n => n.id === 'intern' && match(n.condition));
        if (live.length) { rooms.push(`${rid}${live.length > 1 ? `x${live.length}` : ''}`); entries += live.length; }
      }
      // What would the game SERVE? Load the room he is in and ask the resolver.
      let served = null;
      if (rooms.length === 1) {
        const rid = rooms[0].replace(/x\d+$/, '');
        await ex._changeRoom(rid, 1, 1);
        await new Promise(r => setTimeout(r, 400));
        const npc = (ex.roomManager?.entityManager?.npcs || []).find(n => n.id === 'intern' && n.mesh?.visible);
        served = npc ? ex._getNpcDialogId(npc) : null;
      }
      out.push({ label, rooms, entries, served, expect });
    }
    return out;
  }, { STEPS });

  for (const r of rows) {
    check(`${r.label}: exactly one live placement`,
      r.entries === 1 && r.rooms.length === 1 && r.rooms[0] === r.expect[0],
      `rooms=[${r.rooms.join(', ')}] entries=${r.entries} serves=${r.served}`);
  }
  // The one that matters: after the rehearsal is read, the resolver must reach
  // the rally, not the rehearsal again.
  const rehearse = rows[1], resumed = rows[2];
  check('the rehearsal is what he serves when it opens', rehearse.served === 'intern_rehearsal', `serves=${rehearse.served}`);
  check('THE RALLY IS REACHABLE once the rehearsal has been read',
    resumed.served === 'intern_act6', `serves=${resumed.served} (a single hardcoded entry would pin this at intern_rehearsal forever)`);

  console.log(`\n${fails ? `INTERN LADDER FAIL (${fails})` : 'INTERN LADDER PASS'} — ${rows.length + 2} checks`);
} finally {
  await browser.close();
}
process.exit(fails ? 1 : 0);
