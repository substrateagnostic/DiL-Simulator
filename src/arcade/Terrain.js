import * as THREE from 'three';
import { PAL, CARPET_TILE } from './constants.js';

// ============================================================
// TERRAIN — an infinite, C1-continuous office floor
// ============================================================
// The whole Sonic feel lives here. Slopes are not decoration: the
// integrator in Runner.js reads angleAt() every step and converts
// gravity along the tangent, so a well-shaped valley IS the speed
// mechanic. Rules the generator obeys:
//
//   * Every segment starts exactly where the previous one ended
//     (y0 == previous y1) — no vertical seams to trip the ballistic
//     launch test.
//   * Hill / valley / slope shapes all have ZERO derivative at both
//     ends, so slope factor never jumps discontinuously. Only RAMP
//     ends steep, deliberately: that discontinuity IS the launch lip.
//   * GAP segments are non-solid. heightAt() returns null there and the
//     runner is airborne over them by construction.
// ============================================================

const KIND = {
  FLAT: 'flat',
  HILL: 'hill',
  VALLEY: 'valley',
  SLOPE: 'slope',
  RAMP: 'ramp',
  GAP: 'gap',
};

const BOTTOM_Y = -22;      // slab bottom, well below any camera framing
export const KILL_Y = -13; // fall past this and the quarter is over

const smooth = (t) => t * t * (3 - 2 * t);

// ASYMMETRIC BELL — the Green Hill silhouette, and a fairness fix.
// A symmetric bump's steepest uphill equals its steepest downhill, and a
// Genesis-honest slope factor (SLOPE * sin θ) beats ground ACC above ~23°,
// so a symmetric hill steep enough to be fun to descend is a hill you
// physically cannot climb from a standstill. Green Hill never had that
// problem because its hills RISE GENTLY AND DROP HARD. So do ours:
// `up` is the fraction of the length spent rising. Derivative is zero at
// t=0, t=up and t=1, so the slope factor never jumps.
const asym = (t, up) => (t < up
  ? (1 - Math.cos(Math.PI * t / up)) * 0.5
  : (1 + Math.cos(Math.PI * (t - up) / (1 - up))) * 0.5);

const HILL_UP = 0.70;      // gentle rise, hard drop
const VALLEY_DOWN = 0.30;  // hard dive, gentle climb out (you keep the speed)
// Steepest gradient of asym() is amp * PI / (2 * shortSide * len), so
// capping amp at this fraction of len fixes both faces at once:
//   shallow  amp*PI/(2*0.70*len) = 0.325 -> 18.0 deg
//   steep    amp*PI/(2*0.30*len) = 0.759 -> 37.2 deg
// 18 deg is the number that matters. Genesis' own ratio (ACC 0.046875 vs
// SLOPE 0.125) means Sonic stalls on any sustained slope past ~22 deg, and
// this port inherits that exactly — measured: a bot that arrived at a 24 deg
// hill with 4.5 u/s slid backwards for 13 seconds and was eaten by the
// Deadline. The physics is not wrong; a 24 deg walkable hill is. Green Hill
// never asked you to climb one either.
const AMP_PER_LEN = 0.145;

export class Terrain {
  constructor(rand) {
    this.rand = rand || Math.random;
    this.segments = [];
    this._cursor = 0;
    this.generatedTo = 0;
    // Props emitted by the generator; ArcadeState drains this each frame.
    this.pending = [];
    this.reset();
  }

  reset() {
    this.segments.length = 0;
    this.pending.length = 0;
    this._cursor = 0;
    this.generatedTo = 0;
    // A generous run-up: the first 30 units are flat so the opening beat
    // is "hold right and feel it build", not "react".
    this._push({ kind: KIND.FLAT, x0: -20, len: 50, y0: 0, y1: 0 });
    while (this.generatedTo < 160) this._generateNext();
  }

  // ---- queries ----------------------------------------------------------

  _segAt(x) {
    const segs = this.segments;
    if (!segs.length) return null;
    let i = this._cursor;
    if (i >= segs.length) i = segs.length - 1;
    // Local walk — queries are always near the player, so this is O(1).
    while (i > 0 && x < segs[i].x0) i--;
    while (i < segs.length - 1 && x >= segs[i].x0 + segs[i].len) i++;
    this._cursor = i;
    const s = segs[i];
    if (x < s.x0 || x >= s.x0 + s.len) return null;
    return s;
  }

  /** Surface height at x, or null over a gap / off the generated span. */
  heightAt(x) {
    const s = this._segAt(x);
    if (!s || s.kind === KIND.GAP) return null;
    const t = (x - s.x0) / s.len;
    switch (s.kind) {
      case KIND.HILL:   return s.y0 + s.amp * asym(t, HILL_UP);
      case KIND.VALLEY: return s.y0 - s.amp * asym(t, VALLEY_DOWN);
      case KIND.SLOPE:  return s.y0 + (s.y1 - s.y0) * smooth(t);
      case KIND.RAMP:   return s.y0 + (s.y1 - s.y0) * t * t;
      default:          return s.y0;
    }
  }

  /** Surface angle at x in radians. +ve = uphill when travelling +x. */
  angleAt(x) {
    const h = 0.06;
    const a = this.heightAt(x - h);
    const b = this.heightAt(x + h);
    if (a === null || b === null) {
      const c = this.heightAt(x);
      if (c === null) return 0;
      const s = a === null ? c : a;
      const e = b === null ? c : b;
      return Math.atan2(e - s, h * 2);
    }
    return Math.atan2(b - a, h * 2);
  }

  solidAt(x) {
    return this.heightAt(x) !== null;
  }

  // ---- generation -------------------------------------------------------

  _push(seg) {
    seg.y1 = seg.y1 ?? seg.y0;
    this.segments.push(seg);
    this.generatedTo = seg.x0 + seg.len;
    return seg;
  }

  ensureAhead(x) {
    while (this.generatedTo < x) this._generateNext();
    // Prune well behind the camera. Keep a healthy tail so the deadline
    // wall and any lingering query never fall off the front.
    while (this.segments.length > 3 &&
           this.segments[1].x0 < this.segments[this.segments.length - 1].x0 - 420) {
      this.segments.shift();
      this._cursor = Math.max(0, this._cursor - 1);
    }
  }

  _generateNext() {
    const r = this.rand;
    const x0 = this.generatedTo;
    const prev = this.segments[this.segments.length - 1];
    const y0 = prev ? (prev.kind === KIND.HILL ? prev.y0 : prev.kind === KIND.VALLEY ? prev.y0 : prev.y1) : 0;

    // Difficulty ramps with distance travelled, not with time, so a
    // cautious player still meets the same course.
    const d = x0;
    const tier = d < 180 ? 0 : d < 500 ? 1 : d < 1100 ? 2 : 3;

    // Weighted pick. Valleys are over-represented on purpose — they are
    // where the speed comes from, and Green Hill is mostly dips.
    const table = [
      [KIND.FLAT,   [30, 20, 14, 10][tier]],
      [KIND.VALLEY, [26, 30, 30, 28][tier]],
      [KIND.HILL,   [22, 22, 22, 20][tier]],
      [KIND.SLOPE,  [22, 16, 14, 12][tier]],
      [KIND.RAMP,   [0,  8,  11, 14][tier]],
      [KIND.GAP,    [0,  4,  9,  16][tier]],
    ];
    // Never two gaps in a row, and never a gap straight off a valley
    // floor (unfair: you cannot see the far lip while you are in the dip).
    if (prev && (prev.kind === KIND.GAP || prev.kind === KIND.VALLEY)) table[5][1] = 0;
    if (prev && prev.kind === KIND.RAMP) { table[4][1] = 0; table[5][1] = 30; }

    let total = 0;
    for (const row of table) total += row[1];
    let pick = r() * total;
    let kind = KIND.FLAT;
    for (const row of table) { pick -= row[1]; if (pick <= 0) { kind = row[0]; break; } }

    const rng = (a, b) => a + r() * (b - a);
    let seg;

    switch (kind) {
      case KIND.VALLEY: {
        const len = rng(16, 30) + tier * 2;
        const amp = Math.min(rng(2.2, 4.2) + tier * 0.5, len * AMP_PER_LEN);
        seg = this._push({ kind, x0, len, y0, y1: y0, amp });
        this._decorateValley(seg);
        break;
      }
      case KIND.HILL: {
        const len = rng(14, 26);
        const amp = Math.min(rng(1.8, 3.6) + tier * 0.35, len * AMP_PER_LEN);
        seg = this._push({ kind, x0, len, y0, y1: y0, amp });
        this._decorateHill(seg);
        break;
      }
      case KIND.SLOPE: {
        const len = rng(12, 22);
        // smoothstep's peak gradient is 1.5*dy/len. Cap UPHILL at ~18 deg
        // (climbable) and let DOWNHILL run to ~32 deg (worth having).
        const up = len * 0.217, down = len * 0.42;
        let y1 = y0 + (r() < 0.5 ? rng(0, up) : -rng(0, down));
        y1 = Math.max(-6, Math.min(9, y1));
        seg = this._push({ kind, x0, len, y0, y1 });
        this._decorateFlat(seg, tier);
        break;
      }
      case KIND.RAMP: {
        const len = rng(7, 11);
        // The ramp lip is the one place a >30 deg face is wanted — but it
        // must stay under the angle where a slow approach slips back, and
        // the boost pad three units earlier guarantees you arrive at 26 u/s.
        const y1 = Math.min(10, y0 + Math.min(rng(2.4, 4.0), len * 0.39));
        seg = this._push({ kind, x0, len, y0, y1 });
        // A boost pad on the approach is the invitation to commit.
        this.pending.push({ type: 'boostpad', x: x0 - 3.2, yOff: 0 });
        break;
      }
      case KIND.GAP: {
        const len = rng(5.5, 8.0) + tier * 1.1;
        seg = this._push({ kind, x0, len, y0, y1: y0 });
        this._archOverGap(seg);
        break;
      }
      default: {
        const len = rng(10, 20);
        seg = this._push({ kind: KIND.FLAT, x0, len, y0, y1: y0 });
        this._decorateFlat(seg, tier);
        break;
      }
    }

    // Checkpoint desk roughly every 260 units — pushes the deadline back.
    if (Math.floor(x0 / 260) !== Math.floor((x0 + seg.len) / 260) && x0 > 200) {
      this.pending.push({ type: 'checkpoint', x: x0 + seg.len * 0.5 });
    }
  }

  // Valleys: clip arc down the near wall, coffee or a spring at the bottom,
  // and — the payoff — a clean exit so the speed you built survives.
  _decorateValley(seg) {
    const r = this.rand;
    const n = 7 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const t = 0.12 + (i / (n - 1)) * 0.76;
      this.pending.push({ type: 'clip', x: seg.x0 + seg.len * t, yOff: 1.1 });
    }
    if (r() < 0.38) {
      this.pending.push({ type: 'coffee', x: seg.x0 + seg.len * VALLEY_DOWN, yOff: 1.4 });
    }
    if (r() < 0.30) {
      this.pending.push({ type: 'spring', x: seg.x0 + seg.len * VALLEY_DOWN });
    }
  }

  // Hills: obstacle on the crest (you must commit to the jump early) and
  // a clip arc riding the natural launch trajectory off the far side.
  _decorateHill(seg) {
    const r = this.rand;
    const crest = seg.x0 + seg.len * HILL_UP;
    if (r() < 0.55) {
      this.pending.push({ type: 'obstacle', x: crest - r() * 3, tier: 'low' });
    }
    // Clip arc riding the natural launch trajectory off the far (steep) side.
    const n = 5 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.pending.push({
        type: 'clip',
        x: crest + (seg.len * (1 - HILL_UP)) * t * 1.15,
        yOff: 1.0 + Math.sin(t * Math.PI) * 2.3,
      });
    }
  }

  _decorateFlat(seg, tier) {
    const r = this.rand;
    // Pipes and puddles are FLAT-ONLY. Both were originally allowed on
    // SLOPE segments too, and a puddle at the foot of an uphill was an
    // unescapable trap: the drag beat ground ACC, so the run just ended
    // there. Their hitboxes are also authored against a level anchor.
    const flat = seg.kind === KIND.FLAT;
    const count = 1 + (r() < 0.35 + tier * 0.12 ? 1 : 0);
    for (let i = 0; i < count; i++) {
      // On a SLOPE, smoothstep's gradient peaks in the middle and is ~0 at
      // both ends, so decorations go on the ENDS. An obstacle pinned to the
      // steep middle of an uphill is a death spiral: the wipeout drops you
      // to zero speed on a face you can only crawl up, right back in front
      // of the thing that hit you.
      const x = flat
        ? seg.x0 + seg.len * (0.25 + r() * 0.6)
        : seg.x0 + seg.len * (r() < 0.5 ? r() * 0.16 : 0.84 + r() * 0.16);
      const roll = r();
      if (roll < 0.16 && tier > 0 && flat) {
        this.pending.push({ type: 'pipe', x });          // roll under it
      } else if (roll < 0.30 && tier > 0 && flat) {
        this.pending.push({ type: 'puddle', x });        // momentum tax
      } else if (roll < 0.44) {
        this.pending.push({ type: 'obstacle', x, tier: 'hard' });
      } else {
        this.pending.push({ type: 'obstacle', x, tier: 'low' });
      }
    }
    if (r() < 0.5) {
      const n = 4 + Math.floor(r() * 4);
      const x0 = seg.x0 + seg.len * 0.1;
      for (let i = 0; i < n; i++) {
        this.pending.push({ type: 'clip', x: x0 + i * 1.1, yOff: 1.0 });
      }
    }
    if (r() < 0.10) this.pending.push({ type: 'stapler', x: seg.x0 + seg.len * 0.5, yOff: 1.3 });
  }

  // Clip arcs over a gap trace the actual jump parabola, so following the
  // clips is the same act as clearing the hole. Genesis taught with rings.
  _archOverGap(seg) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      this.pending.push({
        type: 'clip',
        x: seg.x0 - 1 + (seg.len + 2) * t,
        absY: seg.y0 + 1.3 + Math.sin(t * Math.PI) * 2.6,
      });
    }
  }

  drainPending() {
    const out = this.pending.slice();
    this.pending.length = 0;
    return out;
  }
}

// ============================================================
// TERRAIN RIBBON — one dynamic mesh, re-sampled at the camera every frame
// ============================================================
// 5 vertex rows x COLS columns, and the row Y offsets matter as much as
// the colours. Vertex colours INTERPOLATE between rows, so a 4-row build
// with the bottom row 22 units down smeared the subfloor tone across half
// the screen and the floor read as one soft grey mass. Five rows with the
// last two nearly coincident give a hard terminator instead:
//
//   r0  top            bright carpet edge   (thin lit strip)
//   r1  top - 0.20     carpet tile A/B      (the checker that shows speed)
//   r2  top - 1.20     carpet tile A/B      (band bottom, same parity)
//   r3  top - 1.34     subfloor checker     <- hard terminator
//   r4  top - 3.80     subfloor checker     (the "dirt" band, dimmer)
//   r5  BOTTOM_Y       strata               (flat dark mass)
//
// The subfloor band's parity is INVERTED against the carpet's, so the two
// checkers stagger the way Green Hill's grass and dirt do. Without it the
// whole area below the carpet was a black void covering a third of the
// frame and there was nothing down there to read speed off.
//
// Carpet tiles alternate via vertex colour: at ~0.07 units of horizontal
// sample spacing the "blend" across a tile boundary is a fraction of a
// pixel at this camera. Green Hill's checker, on an office floor.
// ============================================================

const COLS = 300;
const ROWS = 6;

export class TerrainRibbon {
  constructor(terrain) {
    this.terrain = terrain;
    const verts = COLS * ROWS;
    this.positions = new Float32Array(verts * 3);
    this.colors = new Float32Array(verts * 3);

    const idx = [];
    for (let c = 0; c < COLS - 1; c++) {
      for (let rw = 0; rw < ROWS - 1; rw++) {
        const a = c * ROWS + rw;
        const b = (c + 1) * ROWS + rw;
        // Row index increases DOWNWARD in world Y, so (a, b, a+1) —
        // top-left, top-right, bottom-left — is CLOCKWISE on screen, i.e.
        // back-facing, i.e. culled: the entire floor was invisible and the
        // runner appeared to sprint through open sky. Wind it the other way.
        idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geo.setIndex(idx);
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: true });
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;

    this._cA = new THREE.Color(PAL.carpetA);
    this._cB = new THREE.Color(PAL.carpetB);
    this._cEdge = new THREE.Color(PAL.carpetEdge);
    this._cSkirt = new THREE.Color(PAL.skirting);
    this._cSub = new THREE.Color(PAL.subfloor);
    this._cStrata = new THREE.Color(PAL.strata);
  }

  update(camX, halfWidth) {
    const t = this.terrain;
    const x0 = camX - halfWidth - 2;
    const span = halfWidth * 2 + 4;
    const step = span / (COLS - 1);
    const p = this.positions;
    const c = this.colors;

    for (let i = 0; i < COLS; i++) {
      const x = x0 + i * step;
      const h = t.heightAt(x);
      const base = i * ROWS * 3;
      const solid = h !== null;
      const top = solid ? h : BOTTOM_Y;

      p[base] = x;       p[base + 1] = solid ? top : BOTTOM_Y;         p[base + 2] = 0;
      p[base + 3] = x;   p[base + 4] = solid ? top - 0.20 : BOTTOM_Y;  p[base + 5] = 0;
      p[base + 6] = x;   p[base + 7] = solid ? top - 1.20 : BOTTOM_Y;  p[base + 8] = 0;
      p[base + 9] = x;   p[base + 10] = solid ? top - 1.34 : BOTTOM_Y; p[base + 11] = 0;
      p[base + 12] = x;  p[base + 13] = solid ? top - 3.80 : BOTTOM_Y; p[base + 14] = 0;
      p[base + 15] = x;  p[base + 16] = BOTTOM_Y;                      p[base + 17] = 0;

      // Carpet tile parity + a lit leading edge on the surface row.
      // Written straight into the buffer — no per-column allocation, this
      // runs 300x every frame.
      const odd = Math.floor(x / CARPET_TILE) & 1;
      const surf = odd ? this._cA : this._cB;
      const band = odd ? this._cSub : this._cSkirt;   // inverted parity
      const E = this._cEdge;
      const S = this._cStrata;
      c[base]      = E.r;      c[base + 1]  = E.g;      c[base + 2]  = E.b;
      c[base + 3]  = surf.r;   c[base + 4]  = surf.g;   c[base + 5]  = surf.b;
      c[base + 6]  = surf.r;   c[base + 7]  = surf.g;   c[base + 8]  = surf.b;
      c[base + 9]  = band.r;   c[base + 10] = band.g;   c[base + 11] = band.b;
      c[base + 12] = band.r * 0.55; c[base + 13] = band.g * 0.55; c[base + 14] = band.b * 0.55;
      c[base + 15] = S.r;      c[base + 16] = S.g;      c[base + 17] = S.b;
    }

    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}
