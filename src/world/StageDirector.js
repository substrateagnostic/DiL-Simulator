import { NPC } from '../entities/NPC.js';
import { CHARACTER_CONFIGS } from '../data/characters.js';
import { DEV_MODE } from '../utils/constants.js';

/**
 * StageDirector — the game's cutscene staging primitive.
 *
 * WHY THIS EXISTS AND WHY IT LIVES OUTSIDE THE STATE STACK
 * -------------------------------------------------------
 * `GameStateManager.update()` ticks ONLY the top state. The instant a
 * `DialogState` is pushed, `ExplorationState.update()` stops — which stops
 * every NPC animator, the camera follow, and the facing ease — while
 * `Engine`'s default render keeps drawing the world. A conversation is
 * therefore a freeze-frame with text over it, and any staging driven from
 * `ExplorationState` is invisible for the whole scene.
 *
 * So the director is ticked from `main.js`'s global loop via
 * `updateStageDirectors(dt)`, exactly like `updateTweens(dt)` beside it, and
 * it ticks the animators of the actors it drives itself. It deliberately does
 * NOT tick actors it is not driving: idle NPCs stay frozen during dialog,
 * which is the shipped look.
 *
 * AUTHORING — one new dialog node type:
 *
 *   { type: 'stage', beats: [ ...beats ], next?: <index> }
 *
 * Beats in one node run in PARALLEL unless a beat carries `after: <n>`
 * (the index of another beat in the same node). Sequencing across a scene is
 * done by interleaving `stage` nodes with `text` nodes — line, move, line —
 * which is how the prose already reads.
 *
 * Beat grammar (every field optional except `actor` and one verb):
 *   actor       'player' | an NPC id as it appears in room data
 *   walkTo      [x, z] | 'markName' | an actor id  — walk there
 *   face        [x, z] | 'markName' | an actor id | radians — turn to face
 *   sit         true | [x, z] | 'markName' — take the nearest real seat
 *   stand       true — leave the seat
 *   exit        [x, z] | 'markName' — walk there, then hide (despawn if spawned)
 *   gesture     a CharacterAnimator GESTURES key ('cast', 'hurt', 'attack_ally', …)
 *   pose        a SIGNATURE_POSES key
 *   expression  a face key ('angry', 'smug', 'worried', 'hurt', …)
 *   spawn       true — create the actor if the room has no NPC entry for it
 *   spawnAt     [x, z] | 'markName' — where a spawned actor appears
 *   show        true — un-hide an actor whose room condition is false
 *   speed       tiles/s (default 1.8; 1.1 shuffles, 2.6 storms)
 *   hold        seconds to stand still after the other verbs land
 *   after       wait for beat <n> of this node
 *   wait        false — do not block the dialog on this beat
 *
 * STAGE NODES WRITE NO FLAGS. They are pure presentation: a save/load or a
 * skip lands on room data, which still owns where every body is when the room
 * is next built. Anything an actor must HOLD after a scene stays a
 * `condition`-gated NPC entry in `src/data/rooms/index.js`.
 *
 * DEGRADATION IS NON-NEGOTIABLE — a stalled beat is a permanent dialog
 * freeze. Every rule below is enforced here, not by the author:
 *   1. per-beat hard timeout `max(2s, dist/speed × 1.8)` → teleport + continue
 *   2. blocked destination → ring search for the nearest walkable tile
 *   3. missing actor → the beat is a silent no-op
 *   4. hidden actor → no-op unless the beat carries `show: true`
 *   5. `done()` fires exactly once, even if every beat fails
 *   6. `abort()` on room change / state exit snaps everything to its end state
 */

const DEFAULT_SPEED = 1.8;   // tiles/s — matches NPC.MOVE_SPEED
const ARRIVE = 0.12;         // tiles
const SEAT_SNAP = 0.9;       // how far a `sit` beat will reach for a real seat
const WALK_RADIUS = 0.28;    // collision radius while staged-walking
// A turn is an EASE (CharacterAnimator._updateFacing, TURN_RATE 26/s), and the
// only thing ticking that animator during a dialog is this director. Release
// the actor the instant the beat lands and the ease never renders — the body
// pops to the new heading on whatever frame EntityManager wakes up, which is
// after the conversation. So a beat that actually turns someone holds long
// enough to show the turn.
const TURN_TAIL = 0.28;      // seconds
const TURN_EPS = 0.15;       // radians — below this the turn is not worth a tail
// A seated character rotates as ONE BODY here — thighs folded into the chair
// go with it. Past ~40 degrees off the seat's own heading the legs swing out of
// the seat and the pose reads as "swivelled out of the chair", so a `face` beat
// on someone sitting is a SHOULDER turn, not a whole-body one.
const SEATED_TURN_MAX = 0.70;   // radians (~40 degrees)

// One live set, ticked from main.js. Directors add themselves on construction
// and remove themselves in dispose(); update() early-returns when idle.
const _live = new Set();

export function updateStageDirectors(dt) {
  for (const d of _live) d.update(dt);
}

export class StageDirector {
  /** @param {object} state ExplorationState — owns the room, player and tileMap */
  constructor(state) {
    this.state = state;
    this.runners = [];
    this.gates = [];
    this.spawned = [];
    this.touched = new Set();     // every actor this scene has driven
    this._claimedSeats = [];
    this._sceneEnded = false;
    _live.add(this);
  }

  dispose() {
    this.abort();
    _live.delete(this);
  }

  get _em() { return this.state.roomManager?.entityManager || null; }
  get _tileMap() { return this.state.tileMap || null; }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Run one `stage` node's beats. `done` fires once every BLOCKING beat has
   * finished (rule 5). Non-blocking beats (`wait: false`) keep running under
   * the following lines.
   */
  run(beats = [], done = null) {
    this._sceneEnded = false;
    const created = beats.map((spec, index) => ({
      spec, index, phase: 'pending', t: 0, hold: 0,
      actor: null, target: null, speed: DEFAULT_SPEED, timeout: 2,
    }));
    for (const r of created) {
      if (typeof r.spec.after === 'number') r.waitFor = created[r.spec.after] || null;
    }
    this.runners.push(...created);
    this.gates.push({
      done,
      waitOn: created.filter(r => r.spec.wait !== false),
      fired: false,
    });
  }

  /** Snap every in-flight beat to its end state right now (ESC / skip). */
  finishNow() {
    for (const r of this.runners) {
      if (r.phase === 'done') continue;
      if (r.phase === 'pending') this._start(r);
      if (r.phase === 'done') continue;
      if (r.target && r.actor) this._place(r.actor, r.target.x, r.target.z);
      r.hold = 0;
      this._land(r);
    }
    this._releaseActors();
    this._fireGates();
  }

  /**
   * The dialog that owned this scene has ended. Transient (spawned) actors
   * live exactly as long as their dialog; anything still walking finishes
   * first so a `wait: false` exit can play out under the last line.
   */
  endScene() {
    this._sceneEnded = true;
    if (this._idle()) this._despawnAll();
  }

  /**
   * Room change / state exit. Rule 6 — never leave a gate unfired.
   *
   * Order matters and is not obvious: our own state is torn down FIRST, and the
   * pending `done()` callbacks fire LAST, off a detached snapshot. A `done()`
   * advances the dialog, and the very next node can be another `stage` node —
   * which calls `run()` re-entrantly. Tearing down after that would wipe the
   * runners and the gate that call just created, and the dialog would block
   * forever on a scene nobody is driving.
   */
  abort() {
    const runners = this.runners.splice(0);
    const gates = this.gates.splice(0);

    for (const r of runners) {
      if (r.phase === 'done') continue;
      if (r.phase === 'pending') this._start(r);
      if (r.phase === 'done') continue;
      if (r.target && r.actor) this._place(r.actor, r.target.x, r.target.z);
      r.hold = 0;
      this._land(r);
    }
    this._despawnAll();
    this._claimedSeats.length = 0;
    this._releaseActors(true);
    this.touched.clear();
    this._sceneEnded = false;

    for (const g of gates) {
      if (g.fired) continue;
      g.fired = true;
      try { g.done?.(); } catch (e) { console.warn('[StageDirector] done() threw', e); }
    }
  }

  // ── Tick ───────────────────────────────────────────────────────────────

  update(dt) {
    if (this.runners.length === 0) {
      if (this._sceneEnded && this.spawned.length) this._despawnAll();
      return;
    }

    const driving = new Set();
    for (const r of this.runners) {
      if (r.phase === 'done') continue;
      if (r.phase === 'pending') {
        if (r.waitFor && r.waitFor.phase !== 'done') continue;
        this._start(r);
        if (r.phase === 'done') continue;
      }
      this._tick(r, dt);
      if (r.actor && r.phase !== 'done') driving.add(r.actor);
    }

    // Only the bodies this director is moving get an animator tick — see the
    // header. Without this the walk cycle, the facing ease and the breath are
    // all frozen and the character slides like a chess piece.
    for (const a of this.touched) {
      if (driving.has(a)) a.animator?.update(dt);
    }

    // Ride the camera when the PLAYER is the one moving; ExplorationState's
    // own follow call is asleep under the dialog.
    const player = this.state.player;
    if (driving.has(player) && this.state.camera) {
      this.state.camera.follow(player.position.x, player.position.z, player.mesh.position.y);
      this.state.camera.update(dt);
    }

    this._releaseActors();
    this._fireGates();

    if (this._idle()) {
      this.runners.length = 0;
      this._claimedSeats.length = 0;
      if (this._sceneEnded) this._despawnAll();
    }
  }

  _idle() { return this.runners.every(r => r.phase === 'done'); }

  _fireGates() {
    for (const g of this.gates) {
      if (g.fired) continue;
      if (!g.waitOn.every(r => r.phase === 'done')) continue;
      g.fired = true;
      try { g.done?.(); } catch (e) { console.warn('[StageDirector] done() threw', e); }
    }
    this.gates = this.gates.filter(g => !g.fired);
  }

  // An actor is released the moment nothing is driving it, so ExplorationState
  // and EntityManager take their body back cleanly.
  _releaseActors(all = false) {
    const busy = all ? new Set() : new Set(
      this.runners.filter(r => r.phase !== 'done' && r.actor).map(r => r.actor)
    );
    for (const a of this.touched) {
      if (busy.has(a)) continue;
      // Guarantee on release: nothing will tick this animator again until the
      // dialog pops, so land the heading rather than leaving it mid-ease.
      if (a.mesh && typeof a.facingAngle === 'number') a.mesh.rotation.y = a.facingAngle;
      a._stageDriven = false;
    }
  }

  // ── Beat lifecycle ─────────────────────────────────────────────────────

  _start(r) {
    const s = r.spec;
    const actor = this._resolveActor(s);
    r.actor = actor;
    if (!actor) { r.phase = 'done'; return; }                 // rule 3

    if (s.show) { actor.show?.(); }
    if (actor.visible === false) { r.phase = 'done'; return; } // rule 4

    this.touched.add(actor);
    actor._stageDriven = true;
    r.hold = Math.max(0, s.hold || 0);

    if (s.stand) this._stand(actor);
    if (s.expression) actor.animator?.setExpression(s.expression, s.expressionHold ?? 8);
    if (s.pose) actor.animator?.setSignaturePose(s.pose);
    if (s.gesture) actor.animator?.playGesture(s.gesture);

    const rawDest = s.walkTo !== undefined ? s.walkTo : s.exit;
    const dest = rawDest !== undefined ? this._resolvePoint(rawDest) : null;
    if (dest) {
      const target = this._walkableNear(dest);                // rule 2
      if (target) {
        const d = Math.hypot(target.x - actor.position.x, target.z - actor.position.z);
        r.target = target;
        r.speed = s.speed || DEFAULT_SPEED;
        r.timeout = Math.max(2.0, (d / r.speed) * 1.8);       // rule 1
        if (d > ARRIVE) {
          this._stand(actor);
          actor.animator?.setWalking(true);
          this._faceToward(actor, target.x, target.z);
          r.phase = 'walking';
          return;
        }
      } else if (DEV_MODE) {
        console.warn('[StageDirector] no walkable tile near', rawDest, '— facing only');
      }
    }
    this._land(r);
  }

  _tick(r, dt) {
    if (r.phase === 'walking') {
      r.t += dt;
      const a = r.actor;
      const tx = r.target.x, tz = r.target.z;
      const dx = tx - a.position.x, dz = tz - a.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < ARRIVE) { this._land(r); return; }
      if (r.t > r.timeout) {                                   // rule 1
        if (DEV_MODE) console.warn(`[StageDirector] beat ${r.index} (${r.spec.actor}) timed out — teleporting`);
        this._place(a, tx, tz);
        this._land(r);
        return;
      }

      const step = Math.min(r.speed * dt, dist);
      const nx = a.position.x + (dx / dist) * step;
      const nz = a.position.z + (dz / dist) * step;
      const tm = a.tileMap || this._tileMap;
      if (tm && !tm.canMove(nx, nz, WALK_RADIUS, a.position.x, a.position.z)) {
        // Axis slide, exactly like NPC._walkToTarget. A fully blocked frame
        // just burns clock — the timeout above is the escape hatch.
        if (tm.canMove(nx, a.position.z, WALK_RADIUS, a.position.x, a.position.z)) this._place(a, nx, a.position.z);
        else if (tm.canMove(a.position.x, nz, WALK_RADIUS, a.position.x, a.position.z)) this._place(a, a.position.x, nz);
      } else {
        this._place(a, nx, nz);
      }
      this._faceToward(a, tx, tz);
      return;
    }

    if (r.phase === 'holding') {
      r.hold -= dt;
      if (r.hold <= 0) r.phase = 'done';
    }
  }

  // Apply the beat's end state: stop walking, face, sit, exit.
  _land(r) {
    const s = r.spec;
    const a = r.actor;
    a.animator?.setWalking(false);
    const beforeY = a.mesh ? a.mesh.rotation.y : 0;

    // SIT FIRST, then FACE — the seated shoulder-turn clamp only applies once
    // the actor is actually in the chair.
    if (s.sit) this._sit(a, s.sit === true ? null : this._resolvePoint(s.sit), s.face === undefined);

    if (s.face !== undefined) {
      if (typeof s.face === 'number') {
        this._applyFacing(a, s.face);
      } else {
        const p = this._resolvePoint(s.face);
        if (p) this._faceToward(a, p.x, p.z);
      }
    }

    if (s.exit !== undefined) {
      if (a._stageSpawn) {
        this._despawn(a);
      } else {
        // STICKY. EntityManager re-evaluates every conditionFn each frame, so a
        // plain hide() is undone on the next exploration tick whenever the
        // character's room condition is still true — the walk-out would end in
        // a pop-IN, which is worse than the pop-out it replaces. `_stageExited`
        // holds until the room is next built, which is exactly the lifetime
        // room data owns anyway (a `stage` node writes no flags).
        a._stageExited = true;
        a.hide?.();
      }
      r.phase = r.hold > 0 ? 'holding' : 'done';
      return;
    }

    // Hold long enough for the turn to be seen (see TURN_TAIL).
    let d = (a.facingAngle ?? beforeY) - beforeY;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    if (Math.abs(d) > TURN_EPS) r.hold = Math.max(r.hold, TURN_TAIL);

    r.phase = r.hold > 0 ? 'holding' : 'done';
  }

  // ── Actor helpers ──────────────────────────────────────────────────────

  _resolveActor(s) {
    const id = s.actor;
    if (!id) return null;
    // A direct reference wins over an id — rooms carry several NPC entries
    // sharing one id (Karen has three), and a caller that already HAS the body
    // must not be re-resolved to a different one.
    if (typeof id === 'object') return id;
    if (id === 'player' || id === 'andrew') return this.state.player;
    const em = this._em;
    if (!em) return null;
    const matches = em.npcs.filter(n => n.id === id);
    const found = matches.find(n => n.visible) || matches[0] || null;
    if (found) return found;
    if (s.spawn) return this._spawn(id, s.spawnAt !== undefined ? s.spawnAt : s.walkTo);
    return null;
  }

  _spawn(id, at) {
    if (!CHARACTER_CONFIGS[id]) {
      if (DEV_MODE) console.warn(`[StageDirector] cannot spawn "${id}" — no CHARACTER_CONFIGS entry`);
      return null;
    }
    const p = this._resolvePoint(at) || { x: this.state.player.position.x, z: this.state.player.position.z };
    const npc = new NPC(id, p.x, p.z, { facing: 0, interactable: false });
    npc.tileMap = this._tileMap;
    npc._stageSpawn = true;
    this._em?.addNPC(npc);
    this.state.roomManager?.mainScene?.add(npc.mesh);
    this.spawned.push(npc);
    return npc;
  }

  _despawn(npc) {
    const em = this._em;
    if (em) {
      const i = em.npcs.indexOf(npc);
      if (i !== -1) em.npcs.splice(i, 1);
    }
    this.state.roomManager?.mainScene?.remove(npc.mesh);
    npc.mesh?.traverse((c) => { if (c.geometry) c.geometry.dispose(); });
    const j = this.spawned.indexOf(npc);
    if (j !== -1) this.spawned.splice(j, 1);
    this.touched.delete(npc);
  }

  _despawnAll() {
    while (this.spawned.length) this._despawn(this.spawned[0]);
  }

  _place(a, x, z) {
    a.position.x = x;
    a.position.z = z;
    a.mesh.position.x = x;
    a.mesh.position.z = z;
    // The animator OWNS position.y while seated (it drops the hips to SEAT_Y),
    // so only a standing actor rides the terrain.
    if (!a.animator?.isSitting) {
      const tm = a.tileMap || this._tileMap;
      a.mesh.position.y = tm?.heightAt ? tm.heightAt(x, z) : 0;
    }
  }

  _stand(a) {
    if (!a.animator?.isSitting) return;
    a.sitting = false;
    a.animator.setSitting(false);
  }

  /**
   * Take a REAL seat or stay standing. `CharacterAnimator.setSitting` drops the
   * hips to SEAT_Y with no seat check, which is the root cause of every
   * "sitting on air" defect in the game — so a `sit` beat that finds no seat
   * within SEAT_SNAP degrades to standing rather than floating.
   */
  _sit(a, at, adoptFacing) {
    const seats = this.state.roomManager?.currentRoom?.seats || [];
    const from = at || a.position;
    let best = null, bestD = SEAT_SNAP;
    for (const s of seats) {
      if (this._claimedSeats.some(c => c.x === s.x && c.z === s.z)) continue;
      const d = Math.hypot(s.x - from.x, s.z - from.z);
      if (d < bestD) { bestD = d; best = s; }
    }
    if (!best) {
      if (DEV_MODE) console.warn(`[StageDirector] "${a.id || 'player'}" found no seat within ${SEAT_SNAP} tiles — standing instead`);
      return;
    }
    this._claimedSeats.push({ x: best.x, z: best.z });
    a.position.x = best.x;
    a.position.z = best.z;
    a.mesh.position.x = best.x;
    a.mesh.position.z = best.z;
    a.sitting = true;
    a.animator?.setSitting(true);
    if (adoptFacing) {
      a.facingAngle = best.facing;
      a.animator?.setFacing(best.facing);
    }
  }

  _faceToward(a, x, z) {
    this._applyFacing(a, Math.atan2(x - a.position.x, z - a.position.z));
  }

  // Seated actors get a clamped SHOULDER turn (see SEATED_TURN_MAX).
  _applyFacing(a, angle) {
    if (a.animator?.isSitting) {
      const seat = this._seatUnder(a);
      if (seat) {
        let d = angle - seat.facing;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        angle = seat.facing + Math.max(-SEATED_TURN_MAX, Math.min(SEATED_TURN_MAX, d));
      }
    }
    a.facingAngle = angle;
    a.animator?.setFacing(angle);
  }

  _seatUnder(a) {
    const seats = this.state.roomManager?.currentRoom?.seats || [];
    let best = null, bestD = 0.6;
    for (const s of seats) {
      const d = Math.hypot(s.x - a.position.x, s.z - a.position.z);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  // ── Point resolution ───────────────────────────────────────────────────

  // [x, z] | { x, z } | a room `marks` name | an actor id | 'player'
  _resolvePoint(v) {
    if (v === undefined || v === null) return null;
    if (Array.isArray(v) && v.length >= 2) return { x: v[0], z: v[1] };
    if (typeof v === 'object' && typeof v.x === 'number') return { x: v.x, z: v.z };
    if (typeof v !== 'string') return null;

    const marks = this.state.roomManager?.currentRoom?.data?.marks;
    const m = marks?.[v];
    if (Array.isArray(m)) return { x: m[0], z: m[1] };
    if (m && typeof m.x === 'number') return { x: m.x, z: m.z };

    const actor = this._resolveActor({ actor: v });
    if (actor) return { x: actor.position.x, z: actor.position.z };
    if (DEV_MODE) console.warn(`[StageDirector] unresolved point "${v}"`);
    return null;
  }

  // Rule 2 — an authored destination that is inside a desk becomes the nearest
  // walkable tile instead of a beat that burns its whole timeout.
  _walkableNear(dest) {
    const tm = this._tileMap;
    if (!tm) return dest;
    if (tm.canMove(dest.x, dest.z, WALK_RADIUS)) return dest;
    for (const rad of [0.5, 1.0, 1.5, 2.0]) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const x = dest.x + Math.cos(a) * rad;
        const z = dest.z + Math.sin(a) * rad;
        if (tm.canMove(x, z, WALK_RADIUS)) return { x, z };
      }
    }
    return null;
  }
}
