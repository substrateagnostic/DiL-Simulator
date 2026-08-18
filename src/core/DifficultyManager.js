// DifficultyManager.js — the ONE place a difficulty mode is resolved.
//
// `src/data/difficulty.js` holds the table; this holds the state and the
// accessors. Every consumer in the engine asks a question ("what is
// DENIAL_LIMIT here?", "what phases does this enemy have here?") and gets an
// answer that defaults to the shipped value. There is no branch on mode
// anywhere outside this file, which is the property that makes a fourth mode a
// data edit.
//
// THE GATE. While `DIFFICULTY_LIVE` is false, `bundle` returns the `shipped`
// entry no matter what `_mode` says, so the whole system is inert and a build is
// byte-identical to the one the producer signed. `force()` is the ONE way past
// it and is for the sim harness only — it is how `tools/_m-modes.mjs` measures
// three modes out of a dark build, and it is never called from `src/`.
//
// WHERE THE STATE LIVES. `_mode` is authoritative at runtime; the save carries
// it (`Player.serialize().difficulty`, additive, defaults to DEFAULT_MODE for
// every save ever written before this). `_floor` is the EASIEST mode that has
// been active during this run and it only ever moves downhill — see `set()`.

import {
  DIFFICULTY_LIVE, DIFFICULTY_MODES, DEFAULT_MODE, MODE_ORDER, PHASE_SURGERY, PHASE_REVIVAL,
} from '../data/difficulty.js';

const SHIPPED = DIFFICULTY_MODES.shipped;

class DifficultyManagerImpl {
  constructor() {
    this._mode = DEFAULT_MODE;
    this._floor = DEFAULT_MODE;
    this._forced = null;
    this._phaseCache = new Map();
  }

  // ── Identity ──────────────────────────────────────────────────────────

  /** Is the feature visible to the player at all? */
  get live() { return DIFFICULTY_LIVE; }

  /** The mode the SAVE says. Meaningful even while the gate is closed. */
  get selected() { return this._mode; }

  /** The mode actually in effect. `shipped` while the gate is closed. */
  get id() {
    if (this._forced) return this._forced;
    return DIFFICULTY_LIVE ? this._mode : SHIPPED.id;
  }

  get bundle() { return DIFFICULTY_MODES[this.id] || SHIPPED; }

  /**
   * The easiest mode this run has ever been played on. Never lost, never
   * inferred, and the number the records read — see `set()`.
   */
  get floor() { return this._floor; }

  /** Every selectable mode, easiest first. */
  get options() { return MODE_ORDER.map(id => DIFFICULTY_MODES[id]).filter(Boolean); }

  // ── Selection ─────────────────────────────────────────────────────────

  /**
   * Change mode mid-run.
   *
   * DOWNWARD IS ALWAYS ALLOWED and needs no ceremony: a player stuck on a wall
   * must never have to restart to get past it, which is the entire finding
   * behind the shipped PIP.
   *
   * UPWARD IS ALSO ALLOWED, and the record is kept instead of the door being
   * locked. `_floor` stamps the easiest mode ever active this run, so a player
   * who drops to Casual for one boss and climbs back does not get to claim the
   * Hard run — and a player who is curious about Hard for one fight is not
   * punished for looking. A lock would buy honesty at the price of making the
   * safest choice the one where you never experiment; the stamp buys the same
   * honesty for nothing. (The alternative — upward only at act boundaries — is
   * in the producer packet as the option not taken.)
   *
   * Returns { ok, from, to, direction, floor }.
   */
  set(id) {
    if (!DIFFICULTY_MODES[id] || id === SHIPPED.id) return { ok: false, reason: 'unknown' };
    const from = this._mode;
    const dir = Math.sign(MODE_ORDER.indexOf(id) - MODE_ORDER.indexOf(from));
    this._mode = id;
    if (MODE_ORDER.indexOf(id) < MODE_ORDER.indexOf(this._floor)) this._floor = id;
    this._phaseCache.clear();
    return { ok: true, from, to: id, direction: dir, floor: this._floor };
  }

  /** Harness-only. Bypasses the gate so a dark build can be measured. */
  force(id) {
    this._forced = (id && DIFFICULTY_MODES[id]) ? id : null;
    this._phaseCache.clear();
    return this._forced;
  }

  // ── Persistence (additive; every field optional) ──────────────────────

  serialize() {
    return { difficulty: this._mode, difficultyFloor: this._floor };
  }

  /**
   * Adopt a save's difficulty. Anything unrecognised — including every save
   * written before this existed — lands on DEFAULT_MODE, which is the shipped
   * game, so a stale blob cannot change how a fight plays.
   */
  adopt(data) {
    const m = data && DIFFICULTY_MODES[data.difficulty] && data.difficulty !== SHIPPED.id
      ? data.difficulty : DEFAULT_MODE;
    const f = data && DIFFICULTY_MODES[data.difficultyFloor] && data.difficultyFloor !== SHIPPED.id
      ? data.difficultyFloor : m;
    this._mode = m;
    // A floor can never be HARDER than the mode you are on; a hand-edited blob
    // that claims otherwise is read as "the floor is where you are".
    this._floor = MODE_ORDER.indexOf(f) <= MODE_ORDER.indexOf(m) ? f : m;
    this._phaseCache.clear();
    return this._mode;
  }

  /** Start-of-run reset. Called on New Game and on New Game+. */
  reset(id = DEFAULT_MODE) {
    this._mode = DIFFICULTY_MODES[id] && id !== SHIPPED.id ? id : DEFAULT_MODE;
    this._floor = this._mode;
    this._phaseCache.clear();
  }

  // ── The accessors the engine calls ────────────────────────────────────

  /**
   * A COMBAT_DEPTH value under the active mode.
   *
   * The SHIPPED value is passed in by the caller rather than imported here, so
   * this module has no edge back into `CombatEngine` — the engine imports this
   * file, and a cycle would work today and break the first time either module
   * grows top-level work. Call it as
   * `Difficulty.depth('DENIAL_LIMIT', COMBAT_DEPTH.DENIAL_LIMIT)`.
   */
  depth(key, shipped) {
    const o = this.bundle.depth;
    return (o && Object.prototype.hasOwnProperty.call(o, key)) ? o[key] : shipped;
  }

  /**
   * The phase rows this enemy fights with.
   *
   * THE PIVOT CANNOT MOVE HERE, BY CONSTRUCTION: the surgery row is spread over
   * the SHIPPED row and carries only `abilities`, so `hpThreshold`, `weakness`
   * and `resistance` survive untouched even if a future surgery entry tries to
   * carry them. Returns the shipped array (same object identity) when the mode
   * asks for shipped phases or the enemy has no surgery row, so `_buildEnemy`
   * is bit-identical in the default case.
   */
  phasesFor(enemyId, shipped) {
    if (!shipped || !shipped.length) return shipped;
    if (this.bundle.phases !== 'surgery') return shipped;
    const rows = PHASE_SURGERY[enemyId];
    const revive = PHASE_REVIVAL[enemyId];
    if (!rows && !revive) return shipped;
    const key = `${this.id}:${enemyId}`;
    const hit = this._phaseCache.get(key);
    if (hit) return hit;
    const out = shipped.map((row, i) => {
      const abilities = rows && rows[i];
      const threshold = revive && revive[i];
      if (!Array.isArray(abilities) && typeof threshold !== 'number') return row;
      const next = { ...row };
      // Two fields, two tables, and neither can reach `weakness`/`resistance`.
      if (Array.isArray(abilities) && abilities.length) next.abilities = [...abilities];
      // A revival may only move a threshold UPWARD off the dead 0 — it must
      // never shorten a phase that already fires, which would silently retune a
      // fight the ladder was measured on.
      if (typeof threshold === 'number' && threshold > row.hpThreshold) next.hpThreshold = threshold;
      return next;
    });
    this._phaseCache.set(key, out);
    return out;
  }

  /**
   * The AI pattern row for an enemy under the active mode.
   *
   * A named id REPLACES the `'*'` contribution rather than stacking on it —
   * that is the only way to write an exception, and `intern: {}` in the Hard
   * bundle is the exception that needs writing.
   */
  aiFor(enemyId, pattern) {
    const ai = this.bundle.ai;
    if (!ai || !pattern) return pattern;
    const named = ai[enemyId];
    const over = named !== undefined ? named : ai['*'];
    if (!over || Object.keys(over).length === 0) return pattern;
    return { ...pattern, ...over };
  }

  /**
   * Multiply one of an ENEMY's built stats. Applied in `_buildEnemy` after NG+,
   * Overtime and the scripted `overrides`, so a fight that hands in an explicit
   * number (the tutorial Karen's `atk: 999`) still wins and a mode cannot
   * silently retune a scripted beat.
   */
  enemyStat(key, value) {
    const m = this.bundle.enemyMult;
    if (!m || typeof m[key] !== 'number' || typeof value !== 'number') return value;
    return Math.max(1, Math.round(value * m[key]));
  }

  /** Multiply one of Andrew's working-copy stats. Never touches the save. */
  playerStat(key, value) {
    const m = this.bundle.playerMult;
    if (!m || typeof m[key] !== 'number' || typeof value !== 'number') return value;
    return Math.max(1, Math.round(value * m[key]));
  }

  /**
   * Proactive incoming-damage resistance for Andrew, 0 when the mode has no
   * assist. Same numbers, same shape and same engine field as the shipped
   * Performance Improvement Plan — the mode simply does not make you file for
   * it after losing. `CombatState` takes the MAX of this and `pipResistance()`
   * so the two never stack.
   */
  assistResist(deaths = 0) {
    const a = this.bundle.assist;
    if (!a) return 0;
    const d = Math.max(0, Number(deaths) || 0);
    return Math.min(a.cap, a.base + a.perDeath * d);
  }
}

export const Difficulty = new DifficultyManagerImpl();
export default Difficulty;
