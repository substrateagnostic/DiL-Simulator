/**
 * NotificationArbiter — the single owner of every transient TEXT surface.
 *
 * WHY THIS EXISTS (run I audit, `.claude/plans/i-run/notification-audit.md`):
 * the game had fourteen independent transient-text emitters and no arbiter of
 * any kind — no queue, no priority, no shared layout budget, no reading-time
 * model. Nine of the fourteen created a brand-new DOM node per call at a
 * hard-coded position, so N simultaneous events rendered N boxes on the same
 * pixels. Measured worst case: nine achievement toasts at 100 % mutual overlap,
 * eight of them never seen. Measured message loss: a toast that lived 234 ms of
 * its intended 2600 ms because combat entry hid the HUD while its own timeout
 * still ran (91 % of the message destroyed).
 *
 * THE FOUR RULES this file enforces, and nothing else does:
 *
 *   1. ONE VISIBLE ITEM PER ZONE. A second post to an occupied zone QUEUES
 *      behind the first. It never appends on top of it. This is the whole of
 *      the fix for achievement stacking, double combat plates and double taunts.
 *   2. READING-TIME-SCALED TTL. `400 + words x 200`, clamped per class. Every
 *      duration in the old game was a fixed constant; not one scaled with text
 *      length, which is how a 27-word line of Diane's dialogue ran at 96 ms/word.
 *   3. DEFER, DON'T DESTROY. A deferred or interrupted item goes back in the
 *      queue with its REMAINING ttl and shows when its blocker clears. Combat
 *      entry SUSPENDS the world scope; it does not delete what is on screen.
 *   4. COALESCE. Same-`key` posts merge into one card with a count badge
 *      ("Achievement x3") instead of nine cards on one anchor.
 *
 * Plus the safety net that licenses aggressive deferral: EVERY post is written
 * to a ring buffer read by the Log tab in MenuState. Nothing the arbiter defers,
 * coalesces or drops is unrecoverable.
 *
 * WHAT IT DOES NOT TOUCH. The arbiter routes transient TEXT surfaces. It has no
 * opinion about dialog content, the DialogBox CHOICE_ARM_MS guard, the
 * KNOWLEDGE_GATE_DIALOGS presentation law, or the combat menu's dynamic buttons.
 * DialogBox and the combat QTE overlays only tell it "a VOICE / DECISION surface
 * is up" via hold(); they keep owning their own DOM.
 *
 * THE THREE DELIBERATE EXEMPTIONS. Everything else posts.
 *   - `FloatingText` — measured at 0 % overlap against everything and ruled
 *     acceptable: short, spatial, anchored to a body on screen, so serialising
 *     it would break the read it exists to give. Capped for count only.
 *   - `CombatHUD.showBanner` — audit surface 7, and its own cited "one correct
 *     implementation": it already removes the previous banner before appending
 *     (the pattern this file generalises). Single-occupancy by construction.
 *   - `CombatHUD.showEnemyIntro` — audit surface 8, one per fight by
 *     definition, choreographed against the CombatScene orbit-settle.
 * All three are `_closed`-latched with the rest of the combat HUD, so none of
 * them can paint after the fight ends.
 */

// ── Priority classes ────────────────────────────────────────────────────
// The claim ladder, highest claim first (audit §6). The principle: the
// player's eyes are a single resource, and the game must never spend them on
// bookkeeping while a character is talking.
export const NC = {
  VOICE: 'VOICE',                 // someone is speaking or thinking
  DECISION: 'DECISION',           // information the player must act on this turn
  CONSEQUENCE: 'CONSEQUENCE',     // the result of what the player just did
  PROGRESS: 'PROGRESS',           // state changed in a way that affects planning
  COMMENDATION: 'COMMENDATION',   // pure reward — always deferrable
  BOOKKEEPING: 'BOOKKEEPING',     // the machine talking about itself
};

// Claim rank — lower wins when two items compete for the same zone.
const RANK = {
  [NC.VOICE]: 0, [NC.DECISION]: 1, [NC.CONSEQUENCE]: 2,
  [NC.PROGRESS]: 3, [NC.COMMENDATION]: 4, [NC.BOOKKEEPING]: 5,
};

// Which classes, while held or visible, defer a given class.
// CONSEQUENCE is never deferred: it is the feedback for the button the player
// just pressed and delaying it would read as input lag.
const BLOCKED_BY = {
  [NC.VOICE]: [],
  [NC.DECISION]: [],
  [NC.CONSEQUENCE]: [],
  [NC.PROGRESS]: [NC.VOICE],
  [NC.COMMENDATION]: [NC.VOICE, NC.DECISION],
  [NC.BOOKKEEPING]: [NC.VOICE],
};

// Reading-time bounds per class, in ms. The model is the audit's:
// `400 ms fixation floor + 200 ms/word` (~300 wpm silent reading), then
// clamped. The clamps differ by class because a combat beat and a paragraph of
// prose are not the same reading act:
//   CONSEQUENCE is glanceable and repeats every turn — a long floor would make
//   the fight feel slow, so it drains fast.
//   VOICE is prose. Its floor is long enough to actually read a sentence.
const TTL = {
  [NC.VOICE]: { min: 2400, max: 9000 },
  [NC.DECISION]: { min: 1500, max: 6000 },
  [NC.CONSEQUENCE]: { min: 1000, max: 2800 },
  [NC.PROGRESS]: { min: 1800, max: 7000 },
  [NC.COMMENDATION]: { min: 2200, max: 4500 },
  [NC.BOOKKEEPING]: { min: 1100, max: 2400 },
};

// Zone table. A zone is a single-occupancy layout slot with its own DOM
// container. `scope` decides which zones a state suspends or closes.
//
// The geometry fixes two measured collisions by construction:
//   rail-right sits at top:220 — BELOW the quest tracker, which ends at y=201.
//     The old toast column started at top:120 and covered the panel it referred
//     to by 75–93 % on every single run.
//   rail-bottom-right is a flex column with a gap, so a burst stacks instead of
//     landing on one hard-coded `bottom:80px; right:20px` anchor.
//
// `fade` is how long the card takes to become invisible after it retires, and
// it MUST match the zone's CSS transition. The arbiter waits it out before
// promoting the next item anywhere, so a fading card and its successor are
// never both above the visibility threshold — a fade tail is still
// co-visibility, and the prose surface fades slowly on purpose.
const ZONES = {
  'rail-right':        { scope: 'world',  fade: 260 },
  'rail-bottom-right': { scope: 'world',  fade: 260 },
  'strip-bottom-left': { scope: 'world',  fade: 260 },
  'voice-centre':      { scope: 'world',  fade: 500 },
  'plate-centre':      { scope: 'combat', fade: 260 },
  // A bark is not a paragraph. The VOICE band (2400-9000) is sized for prose;
  // left unbounded it turned a 2500 ms combat taunt into a 7300 ms one, which
  // is clutter in a turn that lasts three seconds. These three zones keep VOICE
  // priority and get a bark-length ttl instead.
  'bubble-top':        { scope: 'combat', fade: 260, ttl: { min: 2000, max: 4200 } },
  'taunt-left':        { scope: 'combat', fade: 260, ttl: { min: 1800, max: 4000 } },
  'taunt-right':       { scope: 'combat', fade: 260, ttl: { min: 1800, max: 4000 } },
};

// Default zone per class for world-scope posts. Callers may override.
const DEFAULT_ZONE = {
  [NC.VOICE]: 'voice-centre',
  [NC.DECISION]: 'rail-right',
  [NC.CONSEQUENCE]: 'plate-centre',
  [NC.PROGRESS]: 'rail-right',
  [NC.COMMENDATION]: 'rail-bottom-right',
  [NC.BOOKKEEPING]: 'strip-bottom-left',
};

// Zones whose content is PROSE. Only these are mutually exclusive with the
// dialog box. Combat taunts are VOICE by claim (a character is speaking) but
// they are character barks tied to a body, on opposite sides of the frame, and
// the audit measured taunt-left x taunt-right at 0 % pixel overlap and ruled it
// acceptable — serialising them would make the fight feel laggy for no gain.
const PROSE_ZONES = new Set(['voice-centre']);

// B2 — PROSE CADENCE. Playtest note: "screen popping up dialogue every 2
// seconds". Measured cause, and it is arithmetic rather than opinion: a first
// visit to a room in a new act queues up to FOUR monologue cards (F-3b fires
// every authored first-visit line, F-3c adds the act-keyed lines), each takes
// its VOICE floor of 2400 ms, the backlog `hurry` multiplier cuts that to
// 1488 ms, and the zone then waits only its 500 ms fade. One card every ~2.0 s,
// four in a row, with no beat of silence anywhere in it.
//
// Two rules, both scoped to PROSE_ZONES so nothing about combat pacing moves:
//   • NO HURRY. A backlog draining faster is right for combat plates, where the
//     player is waiting on their own input. It is exactly wrong for prose: more
//     to read is not a reason to give less time to read it.
//   • A GAP between cards. A monologue that replaces a monologue 500 ms later
//     reads as one continuous popup; a beat of empty screen makes it read as a
//     separate thought. This is the ONLY thing that stops the sequence feeling
//     like a scrolling feed, and it is why the fix is not "show fewer lines".
const PROSE_GAP_MS = 1100;

const COALESCE_PARTS = 3;   // how many merged lines a coalesced card renders
const QUEUE_CAP = 12;       // per zone; oldest pending spills to the Log
const LOG_CAP = 40;
const FADE_MS = 260;

const wordCount = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

class NotificationArbiterClass {
  constructor() {
    this.root = null;
    this._zones = new Map();      // name -> { el, scope, current, queue, timer, shownAt }
    this._holds = new Map();      // tag -> class
    this._suspended = new Map();  // scope name -> suspend depth (states nest)
    this._closed = new Set();     // scope names — posts are logged and dropped
    this._log = [];
    this._seq = 0;
    this._unread = 0;
  }

  // ── DOM ────────────────────────────────────────────────────────────────

  mount() {
    if (this.root && this.root.isConnected) return;
    const overlay = document.getElementById('ui-overlay');
    if (!overlay) return;
    this.root = document.createElement('div');
    this.root.className = 'na-root';
    for (const [name, def] of Object.entries(ZONES)) {
      const el = document.createElement('div');
      el.className = `na-zone na-zone-${name}`;
      this.root.appendChild(el);
      const existing = this._zones.get(name);
      if (existing) {
        existing.el = el;
      } else {
        this._zones.set(name, { el, scope: def.scope, fade: def.fade || FADE_MS, current: null, queue: [], timer: null, shownAt: 0, gateUntil: 0 });
      }
    }
    overlay.appendChild(this.root);
    if (!this._resizeHooked && typeof window !== 'undefined') {
      this._resizeHooked = true;
      // The rail is placed off the quest tracker's measured bottom, and that
      // measurement is taken when a card renders. A resize moves the tracker
      // under a card that is already up, so re-measure.
      window.addEventListener('resize', () => {
        const z = this._zones.get('rail-right');
        if (z && z.el) this._placeRailRight(z);
      });
    }
  }

  _zone(name) {
    this.mount();
    return this._zones.get(name) || null;
  }

  // ── Blockers ───────────────────────────────────────────────────────────
  // A surface the arbiter does NOT own (the dialog box, a QTE overlay) declares
  // its class here so the arbiter can defer against it. Returns a release fn;
  // calling hold() twice with the same tag replaces the previous claim.

  /**
   * @param {string} cls
   * @param {string} tag  same tag replaces the previous claim
   * @param {Element} [el] optional owner element — the hold auto-expires the
   *   moment `el` leaves the document. Use this for surfaces with several
   *   teardown paths (the combat QTE overlays have five between them): a
   *   forgotten release then cannot wedge the queue shut.
   */
  hold(cls, tag, el = null) {
    this._holds.set(tag, { cls, el });
    // The ruling is a CO-VISIBILITY prohibition, not merely an ordering rule:
    // "BOOKKEEPING must never be co-visible with VOICE". A commendation that
    // was already on screen when a scene opens is the same violation as one
    // that arrives during it — `postfight-auto6-x8.png` in the audit is
    // exactly that frame. So a new claim EVICTS anything it outranks, back
    // into the queue with its remaining ttl. Nothing is destroyed; it returns
    // when the scene ends.
    this._evictBlocked();
    return () => this.release(tag);
  }

  /**
   * Re-queue every visible item that is now blocked. Cannot thrash: `_pump`
   * refuses to show a blocked item, so an evicted card stays queued until its
   * blocker actually clears.
   */
  _evictBlocked() {
    for (const [, z] of this._zones) {
      const item = z.current;
      if (!item || !this._isBlocked(item)) continue;
      const elapsed = Date.now() - z.shownAt;
      item.ttl = Math.max(this._minTtl(item), item.ttl - elapsed);
      item.deferred = true;
      this._retire(z, 'deferred', true);
      z.queue.unshift(item);
    }
  }

  release(tag) {
    if (this._holds.delete(tag)) this._pumpAll();
  }

  _heldClasses() {
    const out = [];
    for (const [tag, h] of this._holds) {
      if (h.el && !h.el.isConnected) { this._holds.delete(tag); continue; }
      out.push(h.cls);
    }
    return out;
  }

  /** Is any surface of class `cls` currently claiming the screen? */
  isActive(cls) {
    if (this._heldClasses().includes(cls)) return true;
    for (const z of this._zones.values()) if (z.current && z.current.cls === cls) return true;
    return false;
  }

  _isBlocked(item) {
    // Rule: never two pieces of prose at once. `prose-w5.png` in the audit puts
    // Meredith's dialog line, Andrew's inner monologue and a policy toast on
    // screen simultaneously — three voices, three places, one pair of eyes.
    // The dialog box holds VOICE, so a monologue posted during a scene waits
    // for the scene instead of competing with it.
    const held = this._heldClasses();

    if (item.cls === NC.VOICE) {
      if (!PROSE_ZONES.has(item.zone)) return false;
      if (held.includes(NC.VOICE)) return true;
      for (const [name, z] of this._zones) {
        if (name === item.zone || !PROSE_ZONES.has(name)) continue;
        if (z.current) return true;
      }
      return false;
    }

    const blockers = BLOCKED_BY[item.cls] || [];
    for (const b of blockers) {
      if (held.includes(b)) return true;
      for (const z of this._zones.values()) {
        if (z.current && z.current.cls === b && z.current.id !== item.id) return true;
      }
    }
    return false;
  }

  // ── Scopes ─────────────────────────────────────────────────────────────

  /**
   * Pause a scope. Anything visible in it is put BACK IN THE QUEUE with its
   * remaining ttl — this is rule 3, and it is the whole of the fix for a toast
   * that combat entry used to destroy 91 % of the way through.
   */
  suspendScope(scope) {
    // REFERENCE-COUNTED. States nest: the pause menu can open on top of a
    // fight, and both suspend 'world'. With a plain flag, closing the menu
    // would resume the world scope while the fight was still running and start
    // painting objective toasts over the combat HUD.
    const n = (this._suspended.get(scope) || 0) + 1;
    this._suspended.set(scope, n);
    if (n > 1) return;
    for (const [, z] of this._zones) {
      if (z.scope !== scope || !z.current) continue;
      const item = z.current;
      const elapsed = Date.now() - z.shownAt;
      item.ttl = Math.max(this._minTtl(item), item.ttl - elapsed);
      item.deferred = true;
      this._retire(z, 'deferred', true);
      z.queue.unshift(item);
    }
  }

  _minTtl(item) {
    const b = (ZONES[item.zone] && ZONES[item.zone].ttl) || TTL[item.cls] || TTL[NC.PROGRESS];
    return b.min;
  }

  _maxTtl(item) {
    const b = (ZONES[item.zone] && ZONES[item.zone].ttl) || TTL[item.cls] || TTL[NC.PROGRESS];
    return b.max;
  }

  resumeScope(scope) {
    const n = (this._suspended.get(scope) || 0) - 1;
    if (n > 0) { this._suspended.set(scope, n); return; }
    if (!this._suspended.delete(scope)) return;
    this._pumpAll();
  }

  /**
   * Close a scope: its state is gone, so its pending messages are stale.
   * They go to the Log (recoverable) and are dropped from the queue. Any LATER
   * post into a closed scope is logged and dropped too — that single check is
   * what stops an orphaned combat setTimeout from painting `.combat-message`
   * onto the exploration screen after CombatState.exit(), measured at 100 %
   * overlap with a dialog speaker for 1574 ms in 3 separate runs.
   */
  closeScope(scope) {
    this._closed.add(scope);
    this._suspended.delete(scope);   // a closed scope has no depth to keep
    for (const [, z] of this._zones) {
      if (z.scope !== scope) continue;
      if (z.current) this._retire(z, 'dropped');
      for (const item of z.queue) this._logStatus(item, 'dropped');
      z.queue.length = 0;
    }
  }

  openScope(scope) {
    this._closed.delete(scope);
    this._suspended.delete(scope);
  }

  /** True while `scope` is paused by at least one state. */
  isSuspended(scope) { return (this._suspended.get(scope) || 0) > 0; }

  // ── Posting ────────────────────────────────────────────────────────────

  /**
   * @param {object} o
   * @param {string} o.cls    one of NC.*
   * @param {string} o.text   plain text (rendered as textContent unless `html`)
   * @param {string} [o.html] pre-built markup, used instead of `text`
   * @param {string} [o.zone] override the class default
   * @param {number} [o.ttl]  explicit ms; otherwise reading-time model
   * @param {string} [o.key]  coalescing key
   * @param {string} [o.tone] extra card class ('info' | 'objective' | 'item' | ...)
   * @param {string} [o.speaker] renders a speech card with a name tag
   * @param {boolean} [o.jump] take the slot NOW: evict the occupant and go to
   *   the head of the queue. For the ONE line that ends a scene — the fight's
   *   own victory/defeat announcement, which must not wait behind the chatter
   *   it is closing. Measured before this existed: "Your patience has run
   *   out..." queued behind a backed-up plate zone and was dropped 2500 ms
   *   later by closeScope('combat'). The player lost the line that says why
   *   they lost.
   * @returns {number|null} post id
   */
  post(o) {
    if (!o || (!o.text && !o.html)) return null;
    const cls = NC[o.cls] ? o.cls : NC.PROGRESS;
    const zoneName = o.zone || DEFAULT_ZONE[cls];
    const def = ZONES[zoneName];
    if (!def) return null;

    const item = {
      id: ++this._seq,
      cls,
      zone: zoneName,
      text: o.text || '',
      html: o.html || null,
      // A post that names a speaker IS a speech card, whatever tone the caller
      // thought it was passing. Keeps `speak()` and the auto-classified
      // `_showToast` prose promotions rendering identically.
      tone: o.speaker ? 'speech' : (o.tone || ''),
      speaker: o.speaker || null,
      key: o.key || null,
      ttl: this._ttlFor(cls, o),
      parts: [o.speaker ? `${o.speaker}: ${o.text}` : (o.text || '')],
      count: 1,
      postedAt: Date.now(),
      deferred: false,
    };

    // Closed scope: log it and drop it. Never paint into a dead state.
    if (this._closed.has(def.scope)) {
      this._logStatus(item, 'dropped');
      return item.id;
    }

    const z = this._zone(zoneName);
    if (!z) return null;

    // Coalescing (rule 4). Merge into the visible card if it is still young,
    // or into any pending card with the same key — pending cards have not been
    // read yet, so merging into them loses the player nothing.
    if (item.key) {
      const live = z.current;
      if (live && live.key === item.key && Date.now() - z.shownAt < 600) {
        this._merge(live, item);
        this._render(z, live);
        this._arm(z, live, Math.max(live.ttl, item.ttl));
        this._logStatus(item, 'coalesced');
        return item.id;
      }
      const pend = z.queue.find(q => q.key === item.key);
      if (pend) {
        this._merge(pend, item);
        this._logStatus(item, 'coalesced');
        return item.id;
      }
    }

    if (o.jump) {
      if (z.current) {
        const cur = z.current;
        cur.ttl = this._minTtl(cur);
        this._retire(z, 'dropped', true);
      }
      z.queue.length = 0;
      z.queue.push(item);
      this._pump(z);
      return item.id;
    }

    z.queue.push(item);
    if (z.queue.length > QUEUE_CAP) {
      const spilled = z.queue.shift();
      this._logStatus(spilled, 'dropped');
    }
    this._pump(z);
    return item.id;
  }

  /**
   * Record a message in the Log WITHOUT rendering it.
   *
   * For the three MODAL-LOCAL surfaces — `ShopState._flash`, `DayState._flash`,
   * `MenuState._saveGame`. A modal owns the whole screen, so there is no
   * co-occupancy to arbitrate: nothing else can be on screen to collide with,
   * and a card drawn by the arbiter would have to out-z-index the very panel it
   * belongs to. What those surfaces DID need is single occupancy inside their
   * own root (fixed at each site), a world scope that is suspended while they
   * are open (so a stray toast cannot float over them), and recoverability.
   * This gives them the third.
   */
  note(cls, text) {
    if (!text) return null;
    const item = { id: ++this._seq, cls: NC[cls] ? cls : NC.PROGRESS, text, count: 1, speaker: null, html: null };
    this._logStatus(item, 'shown');
    return item.id;
  }

  /** VOICE convenience: a named character's line delivered outside a scene. */
  speak(speaker, text, opts = {}) {
    return this.post({ ...opts, cls: NC.VOICE, speaker, text, tone: 'speech' });
  }

  /** VOICE convenience: Andrew's inner monologue. */
  monologue(text, opts = {}) {
    return this.post({ ...opts, cls: NC.VOICE, text, tone: 'monologue' });
  }

  _ttlFor(cls, o) {
    const zone = o.zone || DEFAULT_ZONE[cls];
    const bounds = (ZONES[zone] && ZONES[zone].ttl) || TTL[cls] || TTL[NC.PROGRESS];
    if (Number.isFinite(o.ttl)) return Math.max(600, o.ttl);
    const words = wordCount(o.speaker ? `${o.speaker} ${o.text}` : o.text) || wordCount(String(o.html || '').replace(/<[^>]+>/g, ' '));
    return Math.min(bounds.max, Math.max(bounds.min, 400 + words * 200));
  }

  _merge(target, incoming) {
    target.count += incoming.count;
    if (target.parts.length < COALESCE_PARTS) {
      target.parts.push(incoming.speaker ? `${incoming.speaker}: ${incoming.text}` : incoming.text);
    }
    // A merged card carries more to read, so it gets more time — capped.
    target.ttl = Math.min(this._maxTtl(target), target.ttl + 500);
  }

  // ── Pump ───────────────────────────────────────────────────────────────

  _pumpAll() {
    for (const [, z] of this._zones) this._pump(z);
  }

  _pump(z) {
    if (!z || z.current || z.queue.length === 0) return;
    if (this.isSuspended(z.scope) || this._closed.has(z.scope)) return;
    // B2 cadence gate. Only prose zones ever set it, and only on their own
    // retire, so this is a no-op for every other surface in the game.
    if (z.gateUntil && Date.now() < z.gateUntil) return;

    // Highest claim first, insertion order as tie-break. Items stay in the
    // queue while blocked — they are deferred, not dropped.
    let pick = -1;
    let bestRank = Infinity;
    for (let i = 0; i < z.queue.length; i++) {
      const cand = z.queue[i];
      if (this._isBlocked(cand)) continue;
      const rank = RANK[cand.cls] ?? 99;
      if (rank < bestRank) { bestRank = rank; pick = i; }
    }
    if (pick < 0) return;

    const item = z.queue.splice(pick, 1)[0];
    z.current = item;
    z.shownAt = Date.now();
    this._render(z, item);
    this._logStatus(item, item.deferred ? 'shown (deferred)' : 'shown');

    // A backed-up zone drains faster. Without this, three queued combat beats
    // at their own floors would put ~5 s of reading between a button press and
    // the next turn. PROSE IS EXEMPT (B2): a queue of thoughts is not a queue
    // of feedback, and compressing reading time because there is more to read
    // is the defect, not the remedy.
    const hurry = (z.queue.length > 0 && !PROSE_ZONES.has(item.zone)) ? 0.62 : 1;
    this._arm(z, item, Math.round(item.ttl * hurry));

    // Showing a VOICE item can newly block other zones; showing anything can
    // newly unblock them when it retires. Evict first, then re-pump, so
    // ordering stays global.
    if (item.cls === NC.VOICE) { this._evictBlocked(); this._pumpAll(); }
  }

  _arm(z, item, ms) {
    if (z.timer) clearTimeout(z.timer);
    z.timer = setTimeout(() => {
      z.timer = null;
      if (z.current === item) {
        const prose = PROSE_ZONES.has(item.zone);
        this._retire(z, null);
        // Wait the fade out before promoting anything, anywhere. Also gives the
        // player a beat between messages instead of a hard cut. A prose card
        // additionally holds ITS OWN zone shut for PROSE_GAP_MS (B2) — the
        // global pump still runs on the fade, so a combat plate or an objective
        // never waits on a monologue's silence.
        setTimeout(() => this._pumpAll(), z.fade || FADE_MS);
        if (prose) {
          z.gateUntil = Date.now() + PROSE_GAP_MS;
          setTimeout(() => this._pump(z), PROSE_GAP_MS + 20);
        }
      }
    }, Math.max(400, ms));
  }

  /**
   * @param {boolean} [instant] skip the fade. Used when the card is YIELDING to
   *   a higher claim: a 260 ms fade tail is still co-visibility, and the whole
   *   point of the ruling is that a commendation is not on screen at all while
   *   a character is talking. A card that simply timed out keeps its fade.
   */
  _retire(z, logAs, instant = false) {
    if (z.timer) { clearTimeout(z.timer); z.timer = null; }
    const item = z.current;
    z.current = null;
    if (!item) return;
    if (logAs) this._logStatus(item, logAs);
    const el = item.el;
    if (el) {
      if (instant) {
        if (el.parentNode) el.parentNode.removeChild(el);
      } else {
        el.classList.remove('na-in');
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, z.fade || FADE_MS);
      }
      item.el = null;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  /**
   * `rail-right` must clear the quest tracker, and the tracker is not a fixed
   * height: it grows with side-quest lines and with the objective's own word
   * count. The audit measured the OLD column (`top:120`) covering the tracker
   * 75-93 % on every run; a static `top:220` fixes Act 1 and still clipped the
   * Act 7 tracker by 33 %, because by then the panel reaches past y=220.
   *
   * So the zone is placed off the tracker's MEASURED bottom edge. This is the
   * one place the arbiter knows a game selector, and it is deliberate: a magic
   * constant here is a bug that comes back every time the tracker grows a line.
   */
  _placeRailRight(z) {
    const tracker = document.querySelector('.hud-quest-tracker');
    let top = 220;
    if (tracker && tracker.offsetParent !== null) {
      const r = tracker.getBoundingClientRect();
      if (r.height > 2) top = Math.round(r.bottom) + 14;
    }
    z.el.style.top = `${top}px`;
  }

  _render(z, item) {
    if (!z.el) return;
    if (item.zone === 'rail-right') this._placeRailRight(z);
    let el = item.el;
    if (!el) {
      el = document.createElement('div');
      el.className = this._cardClass(item);
      z.el.innerHTML = '';   // single occupancy is structural, not a convention
      z.el.appendChild(el);
      item.el = el;
      requestAnimationFrame(() => el.classList.add('na-in'));
    }
    el.innerHTML = this._cardHTML(item);
  }

  _cardClass(item) {
    // The card keeps the game's existing surface class so the visual language
    // (and every external selector, including the audit's probe) still matches.
    // The ZONE owns position; `.na-zone > *` neutralises the old anchors.
    const base = {
      'rail-right': 'hud-toast',
      'rail-bottom-right': 'hud-toast na-commendation',
      'strip-bottom-left': 'hud-toast na-bookkeeping',
      'plate-centre': 'combat-message',
      'voice-centre': item.tone === 'speech' ? 'inner-monologue na-speech' : 'inner-monologue',
      'bubble-top': 'combat-voice-bubble',
      'taunt-left': 'combat-taunt combat-taunt-player',
      'taunt-right': 'combat-taunt combat-taunt-enemy',
    }[item.zone] || 'hud-toast';
    const tone = item.tone && !['speech', 'monologue'].includes(item.tone) ? ` ${item.tone}` : '';
    return `na-card ${base}${tone}`;
  }

  _cardHTML(item) {
    if (item.html && item.count === 1) return item.html;
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (item.count > 1) {
      const shown = item.parts.map(p => `<div class="na-line">${esc(p)}</div>`).join('');
      const extra = item.count - item.parts.length;
      return `<div class="na-count">${esc(item.key || 'Notice')} x${item.count}</div>${shown}` +
        (extra > 0 ? `<div class="na-more">+${extra} more — Menu &#9656; Log</div>` : '');
    }
    if (item.speaker) {
      return `<div class="na-speaker">${esc(item.speaker)}</div><div class="na-line">${esc(item.text)}</div>`;
    }
    return esc(item.text);
  }

  // ── Log ring ───────────────────────────────────────────────────────────

  _logStatus(item, status) {
    const existing = this._log.find(e => e.id === item.id);
    if (existing) { existing.status = status; existing.count = item.count; return; }
    this._log.push({
      id: item.id,
      cls: item.cls,
      text: item.speaker ? `${item.speaker}: ${item.text}` : (item.text || String(item.html || '').replace(/<[^>]+>/g, ' ').trim()),
      status,
      count: item.count,
      at: Date.now(),
    });
    if (status !== 'shown') this._unread++;
    while (this._log.length > LOG_CAP) this._log.shift();
  }

  /** Newest first. Read by the Log tab in MenuState. */
  getLog() {
    return [...this._log].reverse();
  }

  getUnreadCount() { return this._unread; }
  markLogRead() { this._unread = 0; }

  /** Full teardown — used by NG+ reload paths and by tests. */
  reset() {
    for (const [, z] of this._zones) {
      if (z.timer) clearTimeout(z.timer);
      z.timer = null; z.current = null; z.queue.length = 0; z.gateUntil = 0;
      if (z.el) z.el.innerHTML = '';
    }
    this._holds.clear();
    this._suspended.clear();
    this._closed.clear();
    this._log.length = 0;
    this._unread = 0;
  }

  /** Dev-only introspection for tools/_i-notify-probe and the ux harnesses. */
  debugState() {
    const zones = {};
    for (const [name, z] of this._zones) {
      zones[name] = {
        scope: z.scope,
        current: z.current ? { cls: z.current.cls, text: z.current.text, count: z.current.count } : null,
        queued: z.queue.length,
        suspended: this.isSuspended(z.scope),
        closed: this._closed.has(z.scope),
      };
    }
    return { zones, holds: this._heldClasses(), log: this._log.length };
  }
}

export const NotificationArbiter = new NotificationArbiterClass();

if (typeof window !== 'undefined') window.__arbiter = NotificationArbiter;
