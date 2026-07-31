import { AudioManager } from '../core/AudioManager.js';
import { BUILDING_MAP, floorLabel } from '../data/buildingMap.js';

// The elevator ride — a DOM overlay. Doors slide shut over the screen,
// an LED panel ticks through the floors, ding, doors part onto the new
// room (which got swapped while they were closed). Any key skips the
// ticking. Driven by ExplorationState._changeRoom.
//
// A2 unification: this used to fire ONLY on the garage shaft, so the
// reception→executive and floor_13→reception elevators teleported you with
// a plain crossfade while the garage one got the whole performance. Every
// elevator link in the building now routes through here, and the overlay's
// door art matches Furniture.elevatorDoors — brushed steel leaves, obsidian
// jamb, one warm sodium seam where they meet (COMP_CARD §6).

// Every elevator link in the tower, as 'fromRoom>toRoom'. These are the
// exits that have `elevatorDoors` furniture on them; the stairwell↔archive
// run is stairs and keeps its vertical wipe.
const LINKS = new Set([
  'parking_garage>reception',
  'reception>parking_garage',
  'reception>executive_floor',
  'executive_floor>reception',
  'floor_13>reception',
]);

let el = null;

function _build() {
  el = document.createElement('div');
  el.id = 'elevator-ride';
  el.innerHTML = `
    <div class="elev-door elev-door-l"></div>
    <div class="elev-door elev-door-r"></div>
    <div class="elev-seam"></div>
    <div class="elev-led"><span class="elev-arrow"></span><span class="elev-floor"></span></div>
    <div class="elev-call"><button type="button" class="elev-13">13</button></div>
  `;
  const style = document.createElement('style');
  style.textContent = `
    #elevator-ride { position: fixed; inset: 0; z-index: 600; pointer-events: none; overflow: hidden; }
    .elev-door {
      position: absolute; top: 0; bottom: 0; width: 51%;
      /* Brushed steel: a broad cross-panel falloff with a fine vertical
         grain laid over it, matching the 3D leaves' normal map. */
      background:
        repeating-linear-gradient(90deg,
          rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px,
          rgba(0,0,0,0.035) 1px, rgba(0,0,0,0.035) 3px),
        linear-gradient(90deg, #4d545b 0%, #8b939b 42%, #9aa2aa 52%, #6b737b 78%, #444b52 100%);
      border-top: 10px solid #15181c; border-bottom: 10px solid #15181c;
      transition: transform 0.38s cubic-bezier(0.4, 0, 0.6, 1);
      box-shadow: inset 0 0 90px rgba(0,0,0,0.42);
    }
    /* The two shallow reveals the 3D leaves carry, so the overlay and the
       prop are recognisably the same door. */
    .elev-door::before, .elev-door::after {
      content: ''; position: absolute; left: 6%; right: 6%; height: 2px;
      background: rgba(0,0,0,0.34); box-shadow: 0 1px 0 rgba(255,255,255,0.09);
    }
    .elev-door::before { top: 17%; }
    .elev-door::after  { bottom: 17%; }
    .elev-door-l { left: 0; transform: translateX(-101%); }
    .elev-door-r { right: 0; transform: translateX(101%); }
    #elevator-ride.closed .elev-door-l { transform: translateX(0); }
    #elevator-ride.closed .elev-door-r { transform: translateX(0); }
    /* The seam: obsidian recess with one warm sodium line in it. Fades in
       only once the leaves have met. */
    .elev-seam {
      position: absolute; top: 0; bottom: 0; left: 50%; width: 10px;
      transform: translateX(-50%);
      background: linear-gradient(90deg, #0d1013 0%, #0d1013 35%, #ff9a2a 48%, #ff9a2a 52%, #0d1013 65%, #0d1013 100%);
      box-shadow: 0 0 22px rgba(255, 154, 42, 0.5);
      opacity: 0; transition: opacity 0.3s 0.2s;
    }
    #elevator-ride.closed .elev-seam { opacity: 1; }
    .elev-led {
      position: absolute; top: 8%; left: 50%; transform: translateX(-50%);
      background: #0d0906; border: 3px solid #4d545b; border-radius: 5px;
      padding: 10px 26px; font-family: 'Press Start 2P', monospace; font-size: 26px;
      color: #ff9a2a; text-shadow: 0 0 12px rgba(255, 154, 42, 0.7);
      box-shadow: 0 3px 14px rgba(0,0,0,0.6);
      opacity: 0; transition: opacity 0.25s;
    }
    #elevator-ride.closed .elev-led { opacity: 1; }
    .elev-arrow { margin-right: 14px; }
    /* The 13 button. Only mounted once the Quiet Floor has found you once —
       after that it is a floor Andrew can ASK for, which is the whole point
       of proposal 4. Sits under the LED like a real car's call panel. */
    .elev-call {
      position: absolute; top: 8%; left: 50%;
      transform: translate(-50%, 86px);
      opacity: 0; transition: opacity 0.25s 0.15s;
      pointer-events: none;
    }
    #elevator-ride.closed .elev-call.offered { opacity: 1; pointer-events: auto; }
    .elev-13 {
      width: 58px; height: 58px; border-radius: 50%;
      background: #14100b; border: 3px solid #4d545b;
      font-family: 'Press Start 2P', monospace; font-size: 16px;
      color: #6b5a3a; cursor: pointer; padding: 0;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.5);
      transition: color 0.15s, box-shadow 0.15s, border-color 0.15s;
    }
    .elev-13:hover { color: #ff9a2a; border-color: #8b939b; }
    .elev-13.lit {
      color: #ff9a2a; border-color: #ff9a2a;
      text-shadow: 0 0 12px rgba(255, 154, 42, 0.8);
      box-shadow: inset 0 0 14px rgba(255, 154, 42, 0.35), 0 0 18px rgba(255, 154, 42, 0.45);
    }
  `;
  el.appendChild(style);
  document.body.appendChild(el);
}

export const ElevatorRide = {
  // Is this room change a ride in a car, or a walk through a door?
  isElevatorLink(fromRoom, toRoom) {
    return LINKS.has(`${fromRoom}>${toRoom}`);
  },

  // The floor labels the LED ticks through, start → destination, with up to
  // three real intermediate stops drawn from the building map (so the ride
  // from reception to the executive floor passes the department and HR
  // rather than cutting from 1 to 21). Returns null if either end is
  // unmapped, in which case the caller should fall back to a plain fade.
  labelsFor(fromRoom, toRoom) {
    const a = BUILDING_MAP[fromRoom]?.floor;
    const b = BUILDING_MAP[toRoom]?.floor;
    if (a === undefined || b === undefined) return null;
    const up = b > a;
    const between = [...new Set(Object.values(BUILDING_MAP).map(e => e.floor))]
      .filter(f => (up ? f > a && f < b : f < a && f > b))
      .sort((x, y) => (up ? x - y : y - x));
    // Thin the intermediates to at most three so the ride stays under ~2s
    const stops = [];
    if (between.length <= 3) stops.push(...between);
    else for (let i = 1; i <= 3; i++) stops.push(between[Math.round(i * between.length / 4) - 1]);
    return { labels: [a, ...stops, b].map(floorLabel), goingUp: up };
  },

  // Close the doors and tick through floor labels. Resolves when the
  // ride is "arrived" (doors still closed — swap the room now).
  //
  // `opts.offer13` mounts the Quiet Floor call button in the car. If the
  // player presses it the ride re-routes: the tick stops, the LED climbs to
  // 13, and `{ chose13: true }` comes back so the caller can change the
  // destination room. Everything else about the ride is unchanged.
  async close(labels, goingUp, opts = {}) {
    if (!el) _build();
    el.style.display = 'block';
    el.querySelector('.elev-arrow').textContent = goingUp ? '▲' : '▼';
    const floorEl = el.querySelector('.elev-floor');
    const callEl = el.querySelector('.elev-call');
    const btn13 = el.querySelector('.elev-13');
    floorEl.textContent = labels[0];
    btn13.classList.remove('lit');
    callEl.classList.toggle('offered', !!opts.offer13);
    // Doors shut
    requestAnimationFrame(() => el.classList.add('closed'));
    await new Promise(r => setTimeout(r, 420));
    AudioManager.playSfx('door');
    // Tick the floors (skippable)
    let skipped = false;
    let chose13 = false;
    const skip = () => { skipped = true; };
    const press13 = () => {
      if (chose13) return;
      chose13 = true;
      skipped = true;
      btn13.classList.add('lit');
      // 13 is above every room on this shaft, so the car is going up now
      // whichever way it was headed.
      el.querySelector('.elev-arrow').textContent = '▲';
      AudioManager.playSfx('confirm');
    };
    if (opts.offer13) {
      // The car waits a beat with the panel lit before it starts moving. The
      // lobby shaft is a two-label ride (G→1); without this hold the 13 button
      // would be on screen for about half a second, which is not an offer.
      // Keyboard skip stays unregistered until the hold is over so a held
      // movement key can't eat the window.
      btn13.addEventListener('click', press13);
      for (let t = 0; t < 18 && !chose13; t++) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    window.addEventListener('keydown', skip, { once: true });
    for (let i = 1; i < labels.length && !skipped; i++) {
      await new Promise(r => setTimeout(r, 340));
      floorEl.textContent = labels[i];
      AudioManager.playSfx('cursor');
    }
    window.removeEventListener('keydown', skip);
    if (opts.offer13) btn13.removeEventListener('click', press13);
    if (chose13) {
      // Asked-for floors get the climb the detour never gives you.
      const from = parseInt(labels[0], 10);
      const start = Number.isNaN(from) ? 1 : from;
      for (let f = Math.min(start + 1, 13); f <= 13; f++) {
        await new Promise(r => setTimeout(r, 90));
        floorEl.textContent = floorLabel(f);
      }
      floorEl.textContent = floorLabel(13);
    } else {
      // However the ride ended (ticked or skipped), the LED must show where
      // the doors are about to open — skipping used to strand it mid-shaft.
      floorEl.textContent = labels[labels.length - 1];
    }
    callEl.classList.remove('offered');
    await new Promise(r => setTimeout(r, 300));
    AudioManager.playSfx('confirm'); // ding.
    return { chose13 };
  },

  // Part the doors onto the (already swapped) room.
  async open() {
    if (!el) return;
    el.classList.remove('closed');
    await new Promise(r => setTimeout(r, 420));
    el.style.display = 'none';
  },
};
