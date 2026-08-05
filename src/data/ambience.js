// ── ROOM AMBIENCE (F-11) ─────────────────────────────────────────────────────
//
// The office was silent between footsteps. `AudioManager.playSfx` shipped
// thirteen cases and every one of them was a REACTION — confirm, cancel,
// cursor, hit, heal, step, door. Nothing in this building made a sound unless
// the player pressed something, in a game whose whole premise is that the
// building is paying attention.
//
// This table is the schedule. `ExplorationState` drains it; the cues live in
// `AudioManager` as `amb_*` cases.
//
// FOUR RULES, all earned from the sibling audits:
//
//  1. **SFX ONLY. NO MUSIC.** Music is Alex's domain and his absolute veto. If
//     a beat here ever wants a musical sting, that is a REQUEST TO ALEX, never
//     a spec. Nothing in this file schedules a note.
//
//  2. **Ambience defers to the writing.** `i-run/notification-audit.md` builds
//     the whole arbiter around "the player's eyes are a single resource"; the
//     ears are the same resource. The scheduler skips its slot outright while a
//     VOICE surface is up (a dialog, a monologue, a bark) rather than ducking
//     under it — a cue the player half-hears during a line is worse than
//     silence, and skipping costs nothing because the next slot is seconds away.
//
//  3. **Cadence is per room, not global.** The server room hums constantly; the
//     Archive is supposed to be quiet enough that the dust is the event. A
//     single global interval would have made both wrong.
//
//  4. **Never the same cue twice running.** Weighted pick with a one-slot
//     memory, same discipline as `AudioManager._pickVariant`. Two printers in a
//     row is a loop; a printer then a pipe is a building.
//
// Adding a room: give it `every: [minSeconds, maxSeconds]` and a `cues` list of
// `[sfxName, weight]`. A room with no entry is silent ON PURPOSE — see
// `floor_13` below, which is the only room in the game whose silence is a
// story beat.

export const ROOM_AMBIENCE = {
  // ── Floor 6, the working floors ─────────────────────────────────────────
  cubicle_farm: {
    every: [7, 16],
    cues: [['amb_keyboard', 4], ['amb_printer', 3], ['amb_phone', 2], ['amb_hvac', 3], ['amb_fluorescent', 1], ['amb_paper', 2]],
  },
  break_room: {
    every: [9, 20],
    cues: [['amb_hvac', 3], ['amb_pipe', 2], ['amb_fluorescent', 2], ['amb_phone', 1]],
  },
  reception: {
    every: [8, 18],
    cues: [['amb_phone', 4], ['amb_elevator', 3], ['amb_paper', 2], ['amb_hvac', 2], ['amb_keyboard', 1]],
  },
  conference_room: {
    every: [11, 24],
    cues: [['amb_hvac', 4], ['amb_fluorescent', 2], ['amb_pipe', 1]],
  },
  skip_office: {
    every: [10, 22],
    cues: [['amb_phone', 3], ['amb_hvac', 3], ['amb_paper', 2]],
  },
  skip_office_large: {
    every: [10, 22],
    cues: [['amb_phone', 3], ['amb_hvac', 3], ['amb_paper', 2]],
  },
  server_room: {
    // The one room where the ambience IS the room. Tightest cadence in the game.
    every: [4, 9],
    cues: [['amb_server', 6], ['amb_hvac', 3], ['amb_fluorescent', 2]],
  },
  hr_department: {
    every: [10, 22],
    cues: [['amb_paper', 4], ['amb_keyboard', 2], ['amb_hvac', 3], ['amb_fluorescent', 1]],
  },
  bathroom: {
    // A tiled room is mostly its own plumbing, and the tube over the mirror is
    // dead — the flicker cue is the one the writing keeps pointing at.
    every: [8, 18],
    cues: [['amb_pipe', 5], ['amb_fluorescent', 4], ['amb_hvac', 2]],
  },
  copy_room: {
    every: [7, 15],
    cues: [['amb_printer', 5], ['amb_paper', 3], ['amb_hvac', 2], ['amb_fluorescent', 1]],
  },

  // ── The parts of the building nobody maintains ──────────────────────────
  stairwell: {
    every: [10, 22],
    cues: [['amb_pipe', 4], ['amb_fluorescent', 3], ['amb_hvac', 2]],
  },
  parking_garage: {
    every: [9, 20],
    cues: [['amb_pipe', 3], ['amb_fluorescent', 3], ['amb_hvac', 2], ['amb_traffic', 2]],
  },
  archive: {
    // Sparse on purpose. The Archive's job is to feel like a held breath.
    every: [16, 34],
    cues: [['amb_paper', 4], ['amb_hvac', 2], ['amb_fluorescent', 1]],
  },
  vault: {
    every: [14, 30],
    cues: [['amb_vault', 5], ['amb_pipe', 1]],
  },

  // ── Upstairs ────────────────────────────────────────────────────────────
  executive_floor: {
    every: [10, 22],
    cues: [['amb_hvac', 4], ['amb_elevator', 2], ['amb_phone', 2], ['amb_paper', 1]],
  },
  board_room: {
    every: [13, 28],
    cues: [['amb_hvac', 5], ['amb_pipe', 1]],
  },
  penthouse: {
    every: [12, 26],
    cues: [['amb_hvac', 4], ['amb_server', 2]],
  },
  penthouse_expanded: {
    every: [12, 26],
    cues: [['amb_hvac', 4], ['amb_server', 2]],
  },
  penthouse_analytics: {
    every: [8, 17],
    cues: [['amb_server', 5], ['amb_keyboard', 2], ['amb_hvac', 2]],
  },
  penthouse_bar: {
    every: [10, 21],
    cues: [['amb_neon', 4], ['amb_hvac', 2], ['amb_diner', 2]],
  },
  penthouse_aquarium: {
    every: [10, 22],
    cues: [['amb_hvac', 3], ['amb_pipe', 3], ['amb_server', 1]],
  },

  // ── Act 6½, outdoors ────────────────────────────────────────────────────
  city_street: {
    every: [6, 13],
    cues: [['amb_traffic', 6], ['amb_bus', 2], ['amb_diner', 1]],
  },
  transit_bus: {
    every: [8, 17],
    cues: [['amb_bus', 4], ['amb_traffic', 3], ['amb_fluorescent', 2]],
  },
  records_hall: {
    every: [12, 26],
    cues: [['amb_paper', 5], ['amb_hvac', 2], ['amb_keyboard', 1]],
  },
  luckys_diner: {
    every: [7, 15],
    cues: [['amb_diner', 5], ['amb_traffic', 2], ['amb_hvac', 1]],
  },
  old_branch: {
    every: [8, 17],
    cues: [['amb_diner', 4], ['amb_traffic', 2], ['amb_paper', 1]],
  },
  old_vault: {
    every: [15, 32],
    cues: [['amb_vault', 5], ['amb_pipe', 2]],
  },

  // floor_13 is DELIBERATELY ABSENT. Its whole design is that nothing is
  // wrong, which is what takes getting used to; the room's silence is the beat.
  // The same reason `ROOM_THOUGHTS` has no floor_13 key. Do not add one.
};

/** Weighted pick that never repeats the previous cue. `state` is per-room. */
export function pickAmbientCue(entry, state = {}) {
  const cues = entry?.cues;
  if (!cues || !cues.length) return null;
  const pool = cues.length > 1 ? cues.filter(c => c[0] !== state.last) : cues;
  let total = 0;
  for (const c of pool) total += c[1];
  let r = Math.random() * total;
  for (const c of pool) {
    r -= c[1];
    if (r <= 0) { state.last = c[0]; return c[0]; }
  }
  state.last = pool[pool.length - 1][0];
  return state.last;
}

/** Seconds until the next slot for a room, uniform inside its cadence band. */
export function nextAmbientDelay(entry) {
  const [lo, hi] = entry?.every || [12, 24];
  return lo + Math.random() * (hi - lo);
}
