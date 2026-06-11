import { AudioManager } from '../core/AudioManager.js';

// The elevator ride — a DOM overlay. Doors slide shut over the screen,
// an LED panel ticks through the floors, ding, doors part onto the new
// room (which got swapped while they were closed). Any key skips the
// ticking. Used by ExplorationState._changeRoom for elevator pairs.

let el = null;

function _build() {
  el = document.createElement('div');
  el.id = 'elevator-ride';
  el.innerHTML = `
    <div class="elev-door elev-door-l"></div>
    <div class="elev-door elev-door-r"></div>
    <div class="elev-led"><span class="elev-arrow"></span><span class="elev-floor"></span></div>
  `;
  const style = document.createElement('style');
  style.textContent = `
    #elevator-ride { position: fixed; inset: 0; z-index: 600; pointer-events: none; overflow: hidden; }
    .elev-door {
      position: absolute; top: 0; bottom: 0; width: 51%;
      background: linear-gradient(90deg, #5a6168 0%, #828a92 45%, #6a727a 55%, #4a5158 100%);
      border-top: 6px solid #3a4046; border-bottom: 6px solid #3a4046;
      transition: transform 0.38s cubic-bezier(0.4, 0, 0.6, 1);
      box-shadow: inset 0 0 60px rgba(0,0,0,0.35);
    }
    .elev-door-l { left: 0; transform: translateX(-101%); border-right: 3px solid #23282c; }
    .elev-door-r { right: 0; transform: translateX(101%); border-left: 3px solid #23282c; }
    #elevator-ride.closed .elev-door-l { transform: translateX(0); }
    #elevator-ride.closed .elev-door-r { transform: translateX(0); }
    .elev-led {
      position: absolute; top: 8%; left: 50%; transform: translateX(-50%);
      background: #16100a; border: 3px solid #3a342c; border-radius: 6px;
      padding: 10px 26px; font-family: 'Press Start 2P', monospace; font-size: 26px;
      color: #ff9a2a; text-shadow: 0 0 12px rgba(255, 154, 42, 0.7);
      opacity: 0; transition: opacity 0.25s;
    }
    #elevator-ride.closed .elev-led { opacity: 1; }
    .elev-arrow { margin-right: 14px; }
  `;
  el.appendChild(style);
  document.body.appendChild(el);
}

export const ElevatorRide = {
  // Close the doors and tick through floor labels. Resolves when the
  // ride is "arrived" (doors still closed — swap the room now).
  async close(labels, goingUp) {
    if (!el) _build();
    el.style.display = 'block';
    el.querySelector('.elev-arrow').textContent = goingUp ? '▲' : '▼';
    const floorEl = el.querySelector('.elev-floor');
    floorEl.textContent = labels[0];
    // Doors shut
    requestAnimationFrame(() => el.classList.add('closed'));
    await new Promise(r => setTimeout(r, 420));
    AudioManager.playSfx('door');
    // Tick the floors (skippable)
    let skipped = false;
    const skip = () => { skipped = true; };
    window.addEventListener('keydown', skip, { once: true });
    for (let i = 1; i < labels.length && !skipped; i++) {
      await new Promise(r => setTimeout(r, 340));
      floorEl.textContent = labels[i];
      AudioManager.playSfx('cursor');
    }
    window.removeEventListener('keydown', skip);
    await new Promise(r => setTimeout(r, 300));
    AudioManager.playSfx('confirm'); // ding.
  },

  // Part the doors onto the (already swapped) room.
  async open() {
    if (!el) return;
    el.classList.remove('closed');
    await new Promise(r => setTimeout(r, 420));
    el.style.display = 'none';
  },
};
