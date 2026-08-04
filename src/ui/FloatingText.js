// Floating damage/heal numbers as DOM elements.
//
// DELIBERATELY EXEMPT from the NotificationArbiter queue. The audit measured
// `floating damage x everything` at 0 % pixel overlap across every scenario and
// ruled it acceptable: these are short (820 ms), SPATIAL, and anchored to a
// body on screen, so they are a different act of reading from a notification.
// Serialising them through a single-occupancy zone would destroy the exact read
// they exist to give — you would no longer see the three hits of a combo land
// on three enemies.
//
// The one thing the audit did flag was "unbounded count" (§2). A multi-target
// ability on a crowded board can spawn a dozen at once, and every one of them
// is a DOM node with an animation. MAX_LIVE caps it: the oldest is evicted, so
// the numbers you see are always the newest ones.
const MAX_LIVE = 14;
// How long after the last number a new one is treated as a fresh hit and drops
// back to rung 0, rather than stacking above its predecessor.
const RUNG_RESET_MS = 900;
const RUNGS = 4;

export class FloatingText {
  // Kept in lockstep with the CSS animation length (styles/combat.css).
  static LIFETIME_MS = 820;

  constructor() {
    this.container = document.getElementById('ui-overlay');
    this._live = [];
    this._rung = 0;
    this._lastSpawn = 0;
  }

  /**
   * `x`/`y` are the caller's aim point. The RUNG offset is applied here, not in
   * `spawnAt3DPosition` — every combat call site goes through `spawn()`
   * directly (`CombatState._spawnDamageNumberAtEnemy` / `...ForAlly`), so a
   * spread applied one level up did nothing. Two consecutive hits of the same
   * value on the same body measured 88-92 % overlap on random X alone; the
   * rung is what actually separates them, and it reads as a stack.
   */
  spawn(text, x, y, type = 'damage') {
    const now = Date.now();
    this._rung = (now - this._lastSpawn > RUNG_RESET_MS) ? 0 : (this._rung + 1) % RUNGS;
    this._lastSpawn = now;
    x += this._rung % 2 ? 30 : -30;
    y -= this._rung * 26;

    const el = document.createElement('div');
    el.className = `floating-damage ${type}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.container.appendChild(el);

    this._live.push(el);
    while (this._live.length > MAX_LIVE) {
      const old = this._live.shift();
      if (old && old.parentNode) old.parentNode.removeChild(old);
    }

    // Remove after animation. LIFETIME must track styles/combat.css's
    // floatUp/floatUpBig duration — the numbers punch in, HOLD, and leave in
    // 800ms now instead of drifting up and dissolving over 1200.
    setTimeout(() => {
      const i = this._live.indexOf(el);
      if (i >= 0) this._live.splice(i, 1);
      if (el.parentNode) el.parentNode.removeChild(el);
    }, FloatingText.LIFETIME_MS);
  }

  spawnAt3DPosition(text, worldPos, camera, renderer, type = 'damage') {
    // Project 3D position to screen
    const vec = worldPos.clone();
    vec.project(camera);
    const w = renderer.domElement.width / 2;
    const h = renderer.domElement.height / 2;
    const screenX = (vec.x * w) + w;
    const screenY = -(vec.y * h) + h;

    // Rung/spread is applied by spawn(); this only does the projection.
    const offsetX = (Math.random() - 0.5) * 40;
    this.spawn(text, screenX + offsetX, screenY - 20, type);
  }
}
