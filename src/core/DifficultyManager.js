// DifficultyManager.js — the ONE place a difficulty mode is resolved.
//
// `src/data/difficulty.js` holds the table; this holds the state and the
// accessors. Every consumer in the engine asks a question ("what is
// DENIAL_LIMIT here?", "what phases does this enemy have here?") and gets an
// answer that defaults to the shipped value. There is no branch on mode
// anywhere outside this file, which is the property that makes a fourth mode a
// data edit.
//
// THE GATE — OPEN since 2026-08-17 (the producer signed the packet). While
// `DIFFICULTY_LIVE` is false, `bundle` returns the `shipped` entry no matter
// what `_mode` says, so the whole system goes back to inert. `force()` remains
// the harness door — it is how `tools/_m-modes.mjs` measures the `shipped`
// null arm out of a live build, and it is never called from normal play.
//
// WHERE THE STATE LIVES. `_mode` is authoritative at runtime; the save carries
// it (`Player.serialize().difficulty`, additive, defaults to DEFAULT_MODE for
// every save ever written before this). There is NO floor stamp: the producer
// declined `difficultyFloor` (2026-08-17), so switching in either direction is
// free and unrecorded — see `set()`.

import {
  DIFFICULTY_LIVE, DIFFICULTY_MODES, DEFAULT_MODE, MODE_ORDER, PHASE_SURGERY, PHASE_REVIVAL,
} from '../data/difficulty.js';

const SHIPPED = DIFFICULTY_MODES.shipped;

class DifficultyManagerImpl {
  constructor() {
    this._mode = DEFAULT_MODE;
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

  /** Every selectable mode, easiest first. */
  get options() { return MODE_ORDER.map(id => DIFFICULTY_MODES[id]).filter(Boolean); }

  // ── Selection ─────────────────────────────────────────────────────────

  /**
   * Change mode mid-run. Allowed in BOTH directions, no ceremony either way
   * (producer ruling 2026-08-17, Q6): a player stuck on a wall must never have
   * to restart to get past it — the entire finding behind the shipped PIP —
   * and a player curious about Hard for one fight is not punished for looking.
   * The packet's `difficultyFloor` stamp was DECLINED; nothing records where
   * the run has been, so do not add one back without the producer's word.
   *
   * Returns { ok, from, to, direction }.
   */
  set(id) {
    if (!DIFFICULTY_MODES[id] || id === SHIPPED.id) return { ok: false, reason: 'unknown' };
    const from = this._mode;
    const dir = Math.sign(MODE_ORDER.indexOf(id) - MODE_ORDER.indexOf(from));
    this._mode = id;
    this._phaseCache.clear();
    return { ok: true, from, to: id, direction: dir };
  }

  /** Harness-only. Bypasses the gate so a dark build can be measured. */
  force(id) {
    this._forced = (id && DIFFICULTY_MODES[id]) ? id : null;
    this._phaseCache.clear();
    return this._forced;
  }

  // ── Persistence (additive; every field optional) ──────────────────────

  serialize() {
    // ONE field. The packet also proposed `difficultyFloor`; the producer
    // declined it (2026-08-17) before anything shipped, so the key is simply
    // absent — not written-but-unread. Nothing persisted ever carried it.
    return { difficulty: this._mode };
  }

  /**
   * Adopt a save's difficulty. Anything unrecognised — including every save
   * written before this existed, and the dark-build blobs that say
   * `'standard'` (the pre-rename id) — lands on DEFAULT_MODE, which is the
   * same game, so a stale blob cannot change how a fight plays.
   */
  adopt(data) {
    this._mode = data && DIFFICULTY_MODES[data.difficulty] && data.difficulty !== SHIPPED.id
      ? data.difficulty : DEFAULT_MODE;
    this._phaseCache.clear();
    return this._mode;
  }

  /** Start-of-run reset. Called on New Game and on New Game+. */
  reset(id = DEFAULT_MODE) {
    this._mode = DIFFICULTY_MODES[id] && id !== SHIPPED.id ? id : DEFAULT_MODE;
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
   * carry them. Returns the shipped array (same object identity) when nothing
   * applies, so `_buildEnemy` is bit-identical in the default case.
   *
   * PHASE_REVIVAL APPLIES IN EVERY SELECTABLE MODE, surgery or not — the
   * producer shipped it as a bug fix in all modes (2026-08-17, packet §5.3).
   * Only the `shipped` null arm stays pre-fix, so the harness keeps an honest
   * before-column and the gate-closed build stays byte-identical.
   */
  phasesFor(enemyId, shipped) {
    if (!shipped || !shipped.length) return shipped;
    const rows = this.bundle.phases === 'surgery' ? PHASE_SURGERY[enemyId] : null;
    const revive = this.id === SHIPPED.id ? null : PHASE_REVIVAL[enemyId];
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
   * The Audit lane's mode accommodation — the `audit` block on a mode bundle,
   * identity when absent. Today exactly one bundle carries it: Hard.
   *
   * WHY IT EXISTS (packet §7.3 → §7.4 addendum): Hard buys its threat
   * enemy-side (ATK ×1.45), which prices out exactly one build — Audit's
   * Findings ramp needs TURNS, and a mode that raises incoming damage takes
   * them away. Measured at a 42.0 pp lane gap on restructuring_trio@7,
   * uncloseable by ATK dials (×1.30 still 35.3 pp).
   *
   *   fileRate     — findings filed per qualifying DAMAGE hit (shipped: 1).
   *                  Read at the _calcDamage filing site only — the debuff
   *                  notes path stays at 1, a measured call (see the site).
   *                  Resizes the ramp's CLOCK to the mode's turn budget; the
   *                  identity — accumulate, then close — is untouched.
   *   assaultSlow  — outgoing-ATK reduction per Finding EVER FILED on that
   *                  enemy (`_findingsEver`, monotonic, capped at 5), itself
   *                  capped at 0.5 (shipped: 0). Read once, in `enemyTurn`.
   *                  The paper trail slows the assault: the lane gets its
   *                  turns back on the exact axis the mode took them.
   *   seedRecord   — `_findingsEver` starts here (shipped: 0). The shield
   *                  arrives pre-warmed; the burst clock does not.
   *
   * ALL THREE ARE LANE-GATED BY CONSTRUCTION, not by a check: only a player
   * who owns the `findings` node ever files on an enemy (and the seed is
   * gated on that node at the one place it is written), so every other lane —
   * and every Easy/Normal player — reads the identity everywhere these act.
   */
  auditRamp() {
    const a = this.bundle.audit;
    return {
      fileRate: (a && typeof a.fileRate === 'number') ? a.fileRate : 1,
      assaultSlow: (a && typeof a.assaultSlow === 'number') ? a.assaultSlow : 0,
      seedRecord: (a && typeof a.seedRecord === 'number') ? a.seedRecord : 0,
    };
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
