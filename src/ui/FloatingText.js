// Floating damage/heal numbers as DOM elements.
//
// DELIBERATELY EXEMPT from the NotificationArbiter queue. The audit measured
// `floating damage x everything` at 0 % pixel overlap across every scenario and
// ruled it acceptable: these are short (1200 ms), SPATIAL, and anchored to a
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

export class FloatingText {
  constructor() {
    this.container = document.getElementById('ui-overlay');
    this._live = [];
  }

  spawn(text, x, y, type = 'damage') {
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

    // Remove after animation
    setTimeout(() => {
      const i = this._live.indexOf(el);
      if (i >= 0) this._live.splice(i, 1);
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1200);
  }

  spawnAt3DPosition(text, worldPos, camera, renderer, type = 'damage') {
    // Project 3D position to screen
    const vec = worldPos.clone();
    vec.project(camera);
    const w = renderer.domElement.width / 2;
    const h = renderer.domElement.height / 2;
    const screenX = (vec.x * w) + w;
    const screenY = -(vec.y * h) + h;

    // Add some random offset
    const offsetX = (Math.random() - 0.5) * 40;
    this.spawn(text, screenX + offsetX, screenY - 20, type);
  }
}
