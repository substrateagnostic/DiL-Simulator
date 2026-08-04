// ============================================================
// tools/_k-tod-matrix.mjs — is the backdrop difference the ROOM or the ACT?
// ============================================================
// The producer compared two recaptured cutscenes and read the board_room's
// warm-window skyline as OLD art next to the executive_floor's grey/white one.
// There is exactly one CityBackdrop instance in the game and exactly one thing
// that repaints it: ExplorationState._applyTimeOfDay -> Engine.setTimeOfDay,
// keyed off `player.actIndex` (TOD_BY_ACT). If that is the whole story, then
// holding the ROOM fixed and swapping the ACT must swap the look, and holding
// the ACT fixed across both rooms must make them match.
//
// This shoots that 2x2 (plus any extra rooms passed in) through the SHIPPING
// path: real flags -> _syncActFromFlags -> _loadRoom -> _applyTimeOfDay.
//
//   node tools/_k-tod-matrix.mjs --port=5173 --out=screenshots/k-tod
//
// HEADED chromium per the house law; closes its own browser.
// ============================================================
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => {
  const hit = process.argv.find(a => a.startsWith(`--${k}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};
const PORT = arg('port', '5173');
const OUT = arg('out', 'screenshots/k-tod');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Cumulative act flag ladder — the same chain _syncActFromFlags reads.
const ACT_FLAGS = [
  [],                                                     // 0
  ['briefing_complete'],                                  // 1
  ['branch_chosen'],                                      // 2
  ['act2_complete'],                                      // 3
  ['act3_complete'],                                      // 4
  ['act4_complete'],                                      // 5
  ['act5_complete'],                                      // 6
  ['act6_complete'],                                      // 7
];
const flagsForAct = (n) => ACT_FLAGS.slice(0, n + 1).flat();
const ALL_ACT_FLAGS = ACT_FLAGS.flat();

// Rooms to shoot. Access flags come along so _loadRoom finds a built room.
const ROOMS = (arg('rooms', 'executive_floor,board_room') || '').split(',').filter(Boolean);
const ACTS = (arg('acts', '2,6') || '').split(',').filter(Boolean).map(Number);
// `--pairs=room:act,room:act` shoots each room at ONE act — the world tour,
// where every room is shot at the act the player actually meets it in. Takes
// precedence over the rooms x acts cross product.
const PAIRS = (arg('pairs', '') || '').split(',').filter(Boolean)
  .map(p => { const [room, act] = p.split(':'); return { room, act: Number(act) }; });
// Rooms whose exit is gated need their key flag; _loadRoom skips the gate table
// but the room's own NPC/furniture conditions still read these.
const ROOM_KEYS = {
  board_room: ['board_room_accessible', 'skip_speech_ready'],
  penthouse: ['penthouse_unlocked', 'has_rolex'],
  hr_department: ['hr_accessible'],
  vault: ['vault_accessible'],
  old_vault: ['city_unlocked'],
  city_street: ['city_unlocked'],
};

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

// qtier=high pins the quality tier so the adaptive governor cannot walk the
// city backdrop off mid-run (the exact failure the wave-G capture shipped).
await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&hud=0&qtier=high`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 40000 });

const rows = [];
const JOBS = PAIRS.length ? PAIRS : ROOMS.flatMap(room => ACTS.map(act => ({ room, act })));
{
  for (const { room, act } of JOBS) {
    const info = await page.evaluate(async ({ room, act, setFlags, clearFlags, keys }) => {
      const ex = window.__explore;
      const { Engine } = await import('/src/core/Engine.js');
      for (const f of clearFlags) ex.player.flags[f] = false;
      for (const f of setFlags) ex.player.flags[f] = true;
      for (const f of keys) ex.player.flags[f] = true;
      ex._syncActFromFlags();
      ex._loadRoom(room);
      ex._updateLocationDisplay(room);
      return {
        actIndex: ex.player.actIndex,
        tod: Engine.cityBackdrop?.tod ?? null,
        streetLevel: Engine.cityBackdrop?.streetLevel === true,
        tier: Engine.qualityTier ?? Engine._qualityTier ?? null,
        cityVisible: Engine.cityBackdrop?.group?.visible !== false,
      };
    }, { room, act, setFlags: flagsForAct(act), clearFlags: ALL_ACT_FLAGS, keys: ROOM_KEYS[room] || [] });

    // Let the camera settle and the facade textures swap in.
    await sleep(1400);
    const file = path.join(OUT, `${room}__act${act}_${info.tod}.png`);
    await page.screenshot({ path: file });
    rows.push({ room, act, ...info, file });
    console.log(`${room.padEnd(18)} act=${info.actIndex} tod=${String(info.tod).padEnd(11)} street=${info.streetLevel} -> ${file}`);
  }
}

fs.writeFileSync(path.join(OUT, 'matrix.json'), JSON.stringify({ rows, errors }, null, 2));
if (errors.length) console.log('\nERRORS:\n' + errors.join('\n'));
await ctx.close();
await browser.close();
console.log(`\nwrote ${rows.length} plates to ${OUT}`);
