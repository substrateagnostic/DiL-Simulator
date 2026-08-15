import * as THREE from 'three';
import { DEV_MODE } from '../utils/constants.js';

// The world outside the building — the NIGHT LAYER of the Display Case.
// Obsidian slab towers with light living in thin seams and edges (not
// window grids), sparse warm lit-window clusters, sodium and magenta
// pools bleeding onto wet-reflective ground, layered haze, slow red
// beacons. Drive (2011) / Tron: Ares — modern retro neon future noir.
// Day keys read as pale Severance-overcast corporate silhouettes.
//
// Owned by Engine (built once into the main scene; combat has its own
// scene and is unaffected). Engine.setTimeOfDay(key) drives the palette.
//
// Implementation notes:
// - Seam lights are BAKED into the facade canvas texture (bright edge
//   columns land exactly on the box edges via standard UVs), so the
//   whole city stays at one draw call per tower.
// - The rooftop parapet ring lives in a reserved region of the same
//   canvas; box UVs are remapped so the top face samples it. Zero extra
//   geometry, and rooftops seen from the office floors get a thin
//   glowing ring instead of stretched window dots.
// - Street-level FX (light pools, cones, wet reflection smears) are
//   built once, hidden, and toggled by setStreetLevel().

const CENTER = { x: 13, z: 8 };   // rough center of the room play area

// ── Six time-of-day palettes ──────────────────────────────────────────
// morning/afternoon: pale overcast corporate (Severance) — slabs as
// milky silhouettes, glass-edge highlights, no neon.
// goldenhour: the hinge — sodium starts to win.
// dusk/night/predawn: full Refn — sodium #ff9a3c and magenta #e94560
// living in seams and pools against true black. COLOR POPS, never floods.
const TIME_OF_DAY = {
  // B20 — THE TWO DAY KEYS NOW MATCH THEIR OWN COMMENT.
  // The line above has said "pale overcast corporate — slabs as milky
  // silhouettes" since these keys were written, but the values were
  // `#2e3540` / `#343b47`: charcoal at ~20 % luma, i.e. night towers. Under
  // the (until now permanent) obsidian sky the result was a dark skyline with
  // scattered white window specks, which is a picture of a city at night. It
  // was misread as one repeatedly, including inside this project.
  //
  // Bodies come up to concrete-under-cloud, roofs with them, and the seams and
  // pools lift enough to stay visible against the brighter slab instead of
  // vanishing. `lit` goes DOWN, not up: an office window in daylight is a dark
  // hole or a reflection, never a lamp, and lit windows at noon were half the
  // reason the plate read as night. Nothing outside `morning` and `afternoon`
  // is touched — goldenhour, dusk, night and predawn are byte-for-byte as
  // shipped, because the Refn grade is the look this game was rebuilt for and
  // it is not what anyone complained about.
  // THE SECOND HALF OF THE TUNE, and it is the half that matters. A first pass
  // took the bodies to `#7a8492`/`#8a94a1` and the plate came back mean 39.5 ->
  // 168.0 with STANDARD DEVIATION 28.5 -> 26.6: brighter and FLATTER, near-white
  // towers dissolving into a near-white sky, which is the same mistake in the
  // opposite direction (see the `fixtures: 'none'` lesson in CLAUDE.md — a flat
  // wash raises mean and drops sd). Overcast daylight is a BRIGHT SKY WITH DARK
  // SLABS IN FRONT OF IT: the sky carries the light, the towers stay in the
  // middle greys and keep their edges. Bodies are therefore ~35 % below the sky
  // value rather than level with it.
  morning: {
    body0: '#525c68', body1: '#69737f', sheen: 0.07,
    lit: 0.018, winWarm: '#eef4f9', winCool: '#dde8f1', coolChance: 0.5,
    seamSodium: '#c3cfda', seamMagenta: '#c3cfda', seamAlpha: 0.30,
    beacon: 0x8a4040, streakA: 0xe6ecf2, streakB: 0xcdd6df, streakOpacity: 0.34,
    poolA: 0xc6d0da, poolB: 0xc6d0da, poolOpacity: 0.14,
    haze: 0xb6c0cc, hazeOpacity: 0.16, roof: '#454e59', sheen2: 0x22272e, fog: 0x9aa5b2,
  },
  afternoon: {
    body0: '#5d6773', body1: '#75808d', sheen: 0.09,
    lit: 0.012, winWarm: '#f2f7fb', winCool: '#e4edf5', coolChance: 0.5,
    seamSodium: '#ced9e3', seamMagenta: '#ced9e3', seamAlpha: 0.26,
    beacon: 0x8a4040, streakA: 0xedf2f6, streakB: 0xd6dee6, streakOpacity: 0.30,
    poolA: 0xced8e2, poolB: 0xced8e2, poolOpacity: 0.12,
    haze: 0xc2ccd6, hazeOpacity: 0.14, roof: '#4f5866', sheen2: 0x262c34, fog: 0xa8b2bf,
  },
  // Night-family seams are ONE warm sodium family (critic: sodium +
  // magenta + cyan + red at once = synthwave, the brief's fail state).
  // The former magenta seam slot carries a deeper amber instead; the
  // only magenta left in the night layer is a wet-reflection pool at
  // street level (Drive: magenta neon on wet reflection, ground only).
  goldenhour: {
    body0: '#1b151d', body1: '#2c2029', sheen: 0.10,
    lit: 0.15, winWarm: '#ffcf8a', winCool: '#a8c4dd', coolChance: 0.10,
    seamSodium: '#e08a3c', seamMagenta: '#c9702c', seamAlpha: 0.75,
    beacon: 0xd05040, streakA: 0xffb877, streakB: 0xdb5530, streakOpacity: 0.55,
    poolA: 0xff9a3c, poolB: 0xe94560, poolOpacity: 0.30,
    haze: 0x2c2030, hazeOpacity: 0.13, roof: '#0d0a0e', sheen2: 0x1a140e, fog: 0x241a28,
  },
  dusk: {
    body0: '#0c0b11', body1: '#171520', sheen: 0.09,
    lit: 0.15, winWarm: '#ffc678', winCool: '#9fc4e8', coolChance: 0.08,
    seamSodium: '#ff9a3c', seamMagenta: '#d97b2e', seamAlpha: 0.95,
    beacon: 0xff3b3b, streakA: 0xffae55, streakB: 0xff5638, streakOpacity: 0.75,
    poolA: 0xff9a3c, poolB: 0xe94560, poolOpacity: 0.40,
    haze: 0x141021, hazeOpacity: 0.14, roof: '#07080c', sheen2: 0x1a1210, fog: 0x0d0a14,
  },
  night: {
    body0: '#08080d', body1: '#121118', sheen: 0.07,
    lit: 0.13, winWarm: '#ffc678', winCool: '#9fc4e8', coolChance: 0.10,
    seamSodium: '#ff9a3c', seamMagenta: '#d97b2e', seamAlpha: 1.0,
    beacon: 0xff3040, streakA: 0xffb35c, streakB: 0xff5636, streakOpacity: 0.85,
    poolA: 0xffa04a, poolB: 0xe94560, poolOpacity: 0.46,
    haze: 0x0d101c, hazeOpacity: 0.13, roof: '#07080c', sheen2: 0x1a1410, fog: 0x07070e,
  },
  predawn: {
    body0: '#090a10', body1: '#13141c', sheen: 0.06,
    lit: 0.085, winWarm: '#f2c187', winCool: '#a9c6e4', coolChance: 0.18,
    seamSodium: '#e08438', seamMagenta: '#c56a2a', seamAlpha: 0.85,
    beacon: 0xff4040, streakA: 0xd99a52, streakB: 0xc84e30, streakOpacity: 0.60,
    poolA: 0xe08a3e, poolB: 0xd84360, poolOpacity: 0.44,
    haze: 0x0c0e18, hazeOpacity: 0.11, roof: '#07080c', sheen2: 0x161010, fog: 0x08080f,
  },
};

// Canvas layout profiles — facade region on top, rooftop region below,
// padding rows between so LinearFilter never bleeds one into the other.
const PROFILE_STD = {
  cw: 96, ch: 256, facH: 190, roofY0: 200, roofY1: 252,
  pitchX: 9, pitchY: 10, winW: 4, winH: 6, margin: 6,
};
const PROFILE_HQ = {
  cw: 128, ch: 512, facH: 446, roofY0: 456, roofY1: 506,
  pitchX: 7, pitchY: 9, winW: 3, winH: 5, margin: 8,
};

// Seam variants per tower: 0/2 sodium, 1 magenta, 3 dark. Tron discipline:
// a FEW saturated seams against dead black — MOST of the skyline doesn't
// glow at all, magenta is a rare accent (1-2 per frame, never a row).
const VARIANT_WEIGHTS = [0.18, 0.08, 0.14, 0.60];

// Global facade tint. Was abused as a street-level dimmer (0x2e2e2e), which is
// what orphaned the seam/window highlights into the "stretch/tear" artifact —
// see setStreetLevel(). Street level now uses a seam-free face instead, so the
// tint stays neutral at both levels. Left as a named dial: lower it toward
// 0x9a9a9a if the street-level slabs ever read too present against the void.
const TOWER_TINT = 0xffffff;

// Per-tower seam intensity tiers — even lit towers don't all sing at the
// same volume (kills the gold-gilded-toy-set uniformity)
const SEAM_LEVELS = [0.45, 0.72, 1.0];

// Mix a hex color toward white — used to build seam core lines that
// stay saturated instead of washing to cream
function lighten(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const mix = (c) => Math.round(c + (255 - c) * k);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

export class CityBackdrop {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'city_backdrop';
    this.time = 0;
    this.tod = null;
    this.buildings = [];
    this.beacons = [];
    this.streaks = [];
    this.cloudShadows = [];
    this.streetFX = [];       // { mesh, kind: 'A'|'B'|'core', baseOpacity }
    this._texCache = {};
    // Trails whisper from the office floors, sing at street level. Wave-2:
    // the office-level whisper is dropped hard — at 0.45 the red (B) tails
    // read as thin scratched-frame artifact lines across the void, not city
    // atmosphere. The red tails are additionally halved vs the sodium (A)
    // heads everywhere (see _streakBFactor) so they never scratch.
    this._streakDim = 0.2;
    // Wave-2 R2: the red (B) tails read as thin red scratch lines across the
    // garage's frame-left/upper void (critic: "rendering artifacts"). Halved
    // again to a near-subliminal whisper so the street reads as sodium motion
    // blur, never a red hairline.
    this._streakBFactor = 0.16;
    this._build();
    scene.add(this.group);
    // Harness handle, same idiom as BuildingShell's `window.__shell`. A test
    // CANNOT reach this through `import('/src/core/Engine.js')`: Vite serves an
    // HMR-updated module at `…?t=<stamp>`, so a dynamic import after any edit
    // to Engine.js hands back a SECOND EngineClass whose `cityBackdrop` is
    // null — and a seam check written against it then passes for the wrong
    // reason. Measured exactly that way.
    if (DEV_MODE) window.__city = this;
    this.setTimeOfDay('morning');
  }

  // ── Facade painter ──────────────────────────────────────────────────
  // One cached canvas per (tod, variant, litBucket, faceSeed, seamLevel,
  // profile). Obsidian slab body with a whisper of gloss, sparse
  // clustered windows, thin seam-light edge columns, and the rooftop
  // parapet ring region. faceSeed varies gloss angle + window layout so
  // the skyline never tiles one smudge; seamLevel varies seam intensity.
  // `street` builds the STREET-LEVEL variant of the same face: body gradient,
  // gloss and panel joins only — no lit windows, no seam column. See the
  // TEAR note on setStreetLevel() for why the bright features have to be
  // *absent* down here rather than dimmed.
  _facadeTexture(todKey, variant, litBucket, hq = false, faceSeed = 0, seamLevel = 2, street = false) {
    const key = `${todKey}|${variant}|${litBucket}|${faceSeed}|${seamLevel}|${hq ? 'hq' : 's'}|${street ? 'st' : 'of'}`;
    if (this._texCache[key]) return this._texCache[key];
    const P = hq ? PROFILE_HQ : PROFILE_STD;
    const t = TIME_OF_DAY[todKey];
    const c = document.createElement('canvas');
    c.width = P.cw; c.height = P.ch;
    const ctx = c.getContext('2d');

    // Deterministic per-key randomness
    let seed = 7919 + variant * 131 + litBucket * 37 + faceSeed * 977 + (hq ? 501 : 0);
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    // 1. Body — near-black slab, faintly lighter at the crown (sky sheen)
    ctx.fillStyle = t.body0;
    ctx.fillRect(0, 0, P.cw, P.ch);
    const g = ctx.createLinearGradient(0, P.facH, 0, 0);
    g.addColorStop(0, t.body0);
    g.addColorStop(1, t.body1);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, P.cw, P.facH);

    // 2. Gloss — one broad reflection band, barely there. Angle, position
    // and width vary per faceSeed so the same smudge never tiles across
    // the skyline; faces read as wet stone, not one repeated decal.
    const gsx = rand() * P.cw * 0.9 - P.cw * 0.3;
    const gc = 0.32 + rand() * 0.34;
    const gl = ctx.createLinearGradient(
      gsx, 0,
      gsx + P.cw * (0.55 + rand() * 0.9),
      P.facH * (0.55 + rand() * 0.5)
    );
    gl.addColorStop(Math.max(0, gc - 0.16), 'rgba(255,255,255,0)');
    gl.addColorStop(gc, `rgba(220,232,244,${t.sheen * (0.6 + rand() * 0.8)})`);
    gl.addColorStop(Math.min(1, gc + 0.16), 'rgba(255,255,255,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, P.cw, P.facH);

    // 3. Curtain-wall panel joins — dark hairlines, a whisper on pale day
    // bodies, invisible in the night obsidian (never graph paper)
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let x = P.pitchX; x < P.cw; x += P.pitchX) ctx.fillRect(x, 0, 1, P.facH);
    ctx.fillStyle = 'rgba(0,0,0,0.035)';
    for (let y = P.pitchY; y < P.facH; y += P.pitchY) ctx.fillRect(0, y, P.cw, 1);

    // 4. Windows — sparse warm clusters (someone's still at their desk),
    // never a full grid. Cluster falloff concentrates the lit cells.
    const dark = variant === 3;
    const clusters = [];
    const nClusters = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < nClusters; i++) {
      clusters.push({ x: rand() * P.cw, y: rand() * P.facH * 0.9 });
    }
    const lit = street ? 0 : t.lit * (dark ? 0.45 : 1) * (hq ? 2.6 : 1) + litBucket * 0.02;
    for (let y = P.margin; y < P.facH - P.margin - P.winH; y += P.pitchY) {
      for (let x = P.margin; x < P.cw - P.margin - P.winW; x += P.pitchX) {
        let d = 1e9;
        for (const cl of clusters) {
          const dx = (x - cl.x) / P.cw, dy = (y - cl.y) / P.facH;
          d = Math.min(d, dx * dx * 1.6 + dy * dy);
        }
        const p = Math.min(0.85, lit * 2.4 * Math.exp(-d * 9));
        if (rand() < p) {
          const cool = rand() < t.coolChance;
          ctx.fillStyle = cool ? t.winCool : t.winWarm;
          ctx.globalAlpha = 0.35 + rand() * 0.6;
          ctx.fillRect(x, y, P.winW, P.winH);
        }
      }
    }
    ctx.globalAlpha = 1;

    // 5. Seam light — ONE thin bright column, LEFT edge of the canvas
    // only. Which box face actually samples it is decided per tower in
    // _remapBoxUVs (seamFace): at most one lit vertical edge per slab,
    // every other face pure silhouette + window scatter. A complete
    // roofline-plus-four-verticals outline is Tron: Legacy game-grid
    // vocabulary (critic-flagged); rooflines and parapet rings no longer
    // glow at all — light lives in a seam, not around the box.
    if (!dark && !street) {
      const seam = variant === 1 ? t.seamMagenta : t.seamSodium;
      // Core stays saturated: the seam color itself, lifted — never cream
      const core = lighten(seam, 0.12);
      const a = t.seamAlpha * SEAM_LEVELS[seamLevel];
      // GROUNDING GLOW (Wave-2 R2): a soft dim column of the seam colour spills
      // a few px off the edge onto the wall face, so the bright seam reads as
      // the LIT EDGE OF A SLAB rather than a disembodied vertical line floating
      // in the void (critic: "reads as a rendering artifact, not a building
      // edge"). Faint enough it never lifts the obsidian body.
      const sr = parseInt(seam.slice(1), 16);
      const rr = (sr >> 16) & 255, gg = (sr >> 8) & 255, bb = sr & 255;
      const glow = ctx.createLinearGradient(1, 0, 9, 0);
      glow.addColorStop(0, `rgba(${rr},${gg},${bb},${(a * 0.34).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(1, 0, 9, P.facH);
      // Core seam — eased a touch off full at night so the columns hum instead
      // of scratching (0.95/0.75 -> 0.86/0.66).
      ctx.globalAlpha = a * 0.86;
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, 1, P.facH);
      ctx.globalAlpha = a * 0.66;
      ctx.fillStyle = seam;
      ctx.fillRect(1, 0, 1, P.facH);
      ctx.globalAlpha = 1;
    }

    // 6. Padding + rooftop region — dark slab, no glowing parapet
    ctx.fillStyle = t.body0;
    ctx.fillRect(0, P.facH, P.cw, P.ch - P.facH);
    ctx.fillStyle = t.roof;
    ctx.fillRect(0, P.roofY0, P.cw, P.roofY1 - P.roofY0);

    const tex = new THREE.CanvasTexture(c);
    // CRITICAL: the canvas is authored in sRGB. Without this flag three
    // samples it as linear and the output transform LIFTS every dark
    // value — near-black obsidian renders as pale translucent-looking
    // slate and saturated sodium seams wash to champagne cream. This one
    // line is what makes the night city actually read obsidian.
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    this._texCache[key] = tex;
    return tex;
  }

  // Remap BoxGeometry UVs: side faces sample the facade region, the top
  // face samples the rooftop region, the bottom face a flat dark patch.
  // seamFace (0 = +x, 1 = -x, 4 = +z, 5 = -z, -1 = none) selects the ONE
  // side face allowed to sample the lit seam column at the canvas' left
  // edge; every other side face is inset past it, so a slab carries at
  // most one glowing vertical edge.
  // ── Orphaned seam guard, near band (F-run) ────────────────────────────────
  // A slab's lit seam column is meant to read as THE LIT EDGE OF A SLAB. That
  // only works while the slab's body is visible. In the dark palettes the body
  // gradient falls to within a few points of the void colour, and a THIN slab
  // is then nothing but its own seam: a floating vertical orange bar, which is
  // exactly the "rendering artifact" note the far band was already fixed for
  // (`_build`, thin && radius > 33).
  //
  // The near band could not take the same baked fix, because a near thin tower
  // is a real, readable building at morning and afternoon — it orphans only
  // after the palette goes dark. So the rule is evaluated per time of day, and
  // it is DERIVED FROM THE PALETTE rather than a hardcoded list of tod keys, so
  // a future TIME_OF_DAY entry inherits the right behaviour instead of
  // reintroducing the bar:
  //
  //   orphan risk  <=>  seamAlpha >= 0.85  AND  body1 luminance < 0.12
  //
  // Measured against the shipping palettes (body1 relative luminance):
  //   morning 0.27 / afternoon 0.31 / goldenhour 0.14  -> body reads, seam kept
  //   dusk 0.086   / night 0.067    / predawn 0.075    -> body gone, seam culled
  _seamOrphans(todKey) {
    const t = TIME_OF_DAY[todKey];
    if (!t) return false;
    const hex = parseInt(String(t.body1).slice(1), 16);
    const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return (t.seamAlpha ?? 0) >= 0.85 && lum < 0.12;
  }

  // The variant a given slab should be TEXTURED with right now. Identical to
  // its baked variant except for the near-band thin slabs above, which drop to
  // 3 (silhouette, no seam column) in the dark palettes. Every site that builds
  // a building facade goes through this — `setTimeOfDay`, `setStreetLevel` and
  // the initial build's morning pass — or the bar walks back in on one path.
  _facadeVariant(b, todKey) {
    if (b.variant === 3) return 3;
    return (b.thin && this._seamOrphans(todKey)) ? 3 : b.variant;
  }

  _remapBoxUVs(geo, hq = false, seamFace = -1) {
    const P = hq ? PROFILE_HQ : PROFILE_STD;
    const uv = geo.attributes.uv;
    const vMin = 1 - P.facH / P.ch;             // facade bottom
    const rv0 = 1 - P.roofY1 / P.ch;            // roof region bottom
    const rv1 = 1 - P.roofY0 / P.ch;            // roof region top
    // BoxGeometry face order: +x, -x, +y(top), -y(bottom), +z, -z — 4 verts each
    for (let f = 0; f < 6; f++) {
      for (let i = 0; i < 4; i++) {
        const idx = f * 4 + i;
        const u = uv.getX(idx), v = uv.getY(idx);
        if (f === 2) {          // top — rooftop region (dark)
          uv.setXY(idx, 0.01 + u * 0.98, rv0 + 0.02 + v * (rv1 - rv0 - 0.04));
        } else if (f === 3) {   // bottom — flat dark point
          uv.setXY(idx, 0.5, (rv0 + rv1) / 2);
        } else {                // sides — facade
          const u2 = f === seamFace ? u : 0.05 + u * 0.90;
          uv.setXY(idx, u2, vMin + v * (1 - vMin));
        }
      }
    }
    uv.needsUpdate = true;
  }

  // Shared soft radial disc (light pools) and streak gradient textures
  _discTexture() {
    if (this._disc) return this._disc;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.32)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    this._disc = new THREE.CanvasTexture(c);
    this._disc.colorSpace = THREE.SRGBColorSpace;
    this._disc.minFilter = THREE.LinearFilter;
    this._disc.generateMipmaps = false;
    return this._disc;
  }

  // Long-exposure trail: bright core fading out at both ends
  _trailTexture() {
    if (this._trail) return this._trail;
    const c = document.createElement('canvas');
    c.width = 128; c.height = 16;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.42, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.58, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 16);
    // soften the vertical profile
    const gv = ctx.createLinearGradient(0, 0, 0, 16);
    gv.addColorStop(0, 'rgba(0,0,0,0.9)');
    gv.addColorStop(0.5, 'rgba(0,0,0,0)');
    gv.addColorStop(1, 'rgba(0,0,0,0.9)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = gv;
    ctx.fillRect(0, 0, 128, 16);
    this._trail = new THREE.CanvasTexture(c);
    this._trail.colorSpace = THREE.SRGBColorSpace;
    this._trail.minFilter = THREE.LinearFilter;
    this._trail.generateMipmaps = false;
    return this._trail;
  }

  // Soft lamplight shaft — a billboard beam, NOT a hard-silhouette cone.
  // Vertical falloff (bright at the lamp head, dissolved before the
  // ground) times a horizontal gaussian feather, so the shaft has no
  // geometric edge anywhere — Drive's sodium is a pool in haze.
  _beamTexture() {
    if (this._beamTex) return this._beamTex;
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    // S2.5: the top stop was a hard 0.9-alpha edge, so a beam whose pole/head
    // fell behind a wall poked over it as a "vertical smear with a clipped top
    // edge" (garage critic). Feather the top to transparent and drop the bright
    // band just below it, so a partly-occluded beam dissolves instead of
    // clipping — the shaft now has no hard edge anywhere.
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.16, 'rgba(255,255,255,0.82)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.24)');
    g.addColorStop(0.82, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 128);
    // Horizontal feather — multiply alpha by a centered soft falloff
    const gh = ctx.createLinearGradient(0, 0, 64, 0);
    gh.addColorStop(0, 'rgba(255,255,255,0)');
    gh.addColorStop(0.22, 'rgba(255,255,255,0.45)');
    gh.addColorStop(0.5, 'rgba(255,255,255,1)');
    gh.addColorStop(0.78, 'rgba(255,255,255,0.45)');
    gh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = gh;
    ctx.fillRect(0, 0, 64, 128);
    this._beamTex = new THREE.CanvasTexture(c);
    this._beamTex.colorSpace = THREE.SRGBColorSpace;
    this._beamTex.minFilter = THREE.LinearFilter;
    this._beamTex.generateMipmaps = false;
    return this._beamTex;
  }

  // One-sided fade (wet reflection smear: bright at the light, gone by
  // the far end)
  _smearTexture() {
    if (this._smear) return this._smear;
    const c = document.createElement('canvas');
    c.width = 128; c.height = 16;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 16);
    const gv = ctx.createLinearGradient(0, 0, 0, 16);
    gv.addColorStop(0, 'rgba(0,0,0,0.85)');
    gv.addColorStop(0.5, 'rgba(0,0,0,0)');
    gv.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = gv;
    ctx.fillRect(0, 0, 128, 16);
    this._smear = new THREE.CanvasTexture(c);
    this._smear.colorSpace = THREE.SRGBColorSpace;
    this._smear.minFilter = THREE.LinearFilter;
    this._smear.generateMipmaps = false;
    return this._smear;
  }

  _build() {
    // Deterministic pseudo-random so the skyline is stable across loads
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const pickVariant = () => {
      let r = rand(), acc = 0;
      for (let v = 0; v < VARIANT_WEIGHTS.length; v++) {
        acc += VARIANT_WEIGHTS[v];
        if (r < acc) return v;
      }
      return 3;
    };

    // ── Obsidian slab towers — a ring around the play area ─────────────
    let lastGlowVariant = -1;
    for (let i = 0; i < 64; i++) {
      const angle = (i / 64) * Math.PI * 2 + rand() * 0.08;
      // Keep the camera corridor clear (iso camera looks in from ~PI/4)
      if (Math.abs(angle - Math.PI / 4) < 0.55) { rand(); rand(); rand(); rand(); continue; }
      // Alternate near/far bands so neighbors can't interpenetrate
      const radius = i % 2 === 0 ? 25 + rand() * 9 : 40 + rand() * 12;
      const x = CENTER.x + Math.cos(angle) * radius;
      const z = CENTER.z + Math.sin(angle) * radius * 0.8;
      // Slab proportions: taller, occasionally knife-thin
      const thin = rand() < 0.3;
      const w = thin ? 1.8 + rand() * 1.4 : 2.6 + rand() * 3.8;
      const h = 6 + rand() * 12;
      const d = thin ? 2.6 + rand() * 3.4 : 2.6 + rand() * 3.8;

      let variant = pickVariant();
      // Magenta is an accent, never a row — two glowing magenta towers
      // in sequence demote the second to sodium (retrowave-kitsch guard)
      if (variant === 1 && lastGlowVariant === 1) variant = 0;
      // Wave-2 R2: thin slabs in the FAR band carry no lit seam. A thin far
      // tower's near-black body vanishes into the void and its lone seam column
      // reads as a disembodied vertical orange/red line — the "rendering
      // artifact" the penthouse_bar / garage stills flagged. Silhouette only.
      //
      // F-run: the NEAR band has the same failure, but only in the dark
      // palettes — see `_seamOrphans()`. It cannot be baked here, because a
      // near thin tower reads perfectly well at 09:00 and only orphans after
      // dusk, and the same mesh lives through both. It is applied per time of
      // day instead, off `rec.thin`.
      if (thin && radius > 33) variant = 3;
      if (variant !== 3) lastGlowVariant = variant;
      const litBucket = Math.floor(rand() * 3);
      const faceSeed = Math.floor(rand() * 4);
      const seamLevel = Math.floor(rand() * 3);
      // One lit edge per slab at most. The camera looks in from +x/+z,
      // so weight those faces; picks that land on a hidden face turn the
      // tower into one more pure silhouette — which is the point.
      const seamFace = variant === 3 ? -1
        : [0, 4, 0, 4, 1, 5][Math.floor(rand() * 6)];
      const geo = new THREE.BoxGeometry(w, h, d);
      this._remapBoxUVs(geo, false, seamFace);
      const mat = new THREE.MeshBasicMaterial({
        map: this._facadeTexture('morning', variant, litBucket, false, faceSeed, seamLevel),
      });
      const building = new THREE.Mesh(geo, mat);
      // Rooftops sit below the room floor — the office is high in its tower
      const baseDrop = 2.5 + rand() * 4;
      building.position.set(x, -h / 2 - baseDrop, z);
      this.group.add(building);
      const rec = { mesh: building, h, baseDrop, variant, litBucket, faceSeed, seamLevel, x, z, radius, thin };
      this.buildings.push(rec);

      // Aircraft beacon on the tallest few — slow red pulse. Every
      // beacon rides a visible mast (a bare red dot in the sky reads as
      // a dead pixel, critic-flagged): small, dim, and attached.
      if (h > 14.5) {
        const roofY = building.position.y + h / 2;
        const mast = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.6, 0.07),
          new THREE.MeshBasicMaterial({ color: 0x2a2f3a })
        );
        mast.position.set(x, roofY + 0.3, z);
        this.group.add(mast);
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.095, 6, 5),
          new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.6 })
        );
        beacon.position.set(x, roofY + 0.6, z);
        this.group.add(beacon);
        this.beacons.push({ mesh: beacon, mast, phase: rand() * Math.PI * 2, building: rec });
      }
    }

    // ── The Vaults Fargo tower — street level only, looming north ──────
    const hqGeo = new THREE.BoxGeometry(11, 46, 8);
    this._remapBoxUVs(hqGeo, true, 4);   // one seam edge, camera-facing
    this.hqTower = new THREE.Mesh(hqGeo, new THREE.MeshBasicMaterial({
      map: this._facadeTexture('morning', 1, 1, true),
    }));
    this.hqTower.position.set(CENTER.x, 23 - 0.4, CENTER.z - 18);
    this.hqTower.visible = false;
    this.group.add(this.hqTower);
    const hqMast = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.7, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x2a2f3a })
    );
    hqMast.position.set(CENTER.x, 45.95, CENTER.z - 18);
    hqMast.visible = false;
    this.group.add(hqMast);
    this.hqMast = hqMast;
    const hqBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 6, 5),
      new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.6 })
    );
    hqBeacon.position.set(CENTER.x, 46.3, CENTER.z - 18);
    hqBeacon.visible = false;
    this.group.add(hqBeacon);
    this.hqBeacon = hqBeacon;
    this.beacons.push({ mesh: hqBeacon, phase: 0.7, hq: true });

    // TEAR FIX (F3), part 2: the "alternate near/far bands so neighbors can't
    // interpenetrate" scheme above only separates *radially*, so same-band
    // neighbours could still overlap in XZ — an audit of the shipped seed found
    // 9 intersecting pairs, several of them slivers under 0.25 units, i.e.
    // near-coplanar box faces. Coplanar faces z-fight, and a z-fight under a
    // lit seam is a literal tear. Three ring towers also sat *inside* the
    // Vaults Fargo HQ footprint, which is only visible at street level — the
    // exact place the artifact was reported. Separate them deterministically.
    this._separateTowers();

    // ── Long-exposure light trails on the streets far below ────────────
    // Two shared materials: A = sodium headstream, B = red/magenta tails
    this._streakMatA = new THREE.MeshBasicMaterial({
      map: this._trailTexture(), color: 0xffb35c, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this._streakMatB = new THREE.MeshBasicMaterial({
      map: this._trailTexture(), color: 0xff3d5e, transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    // CAST-BUGS item 5 — the long-exposure street TRAILS are DELETED. Running at
    // curb height in the walled parking-garage void they had no pole/pool/road to
    // anchor them, so a lane that ran past the room's opening read as a lone
    // diagonal amber line floating in black (the two last orphan smears the rider
    // pixel-located: a streak at frame bottom-right and a dash at the left edge).
    // Same orphan class the earlier waves already culled (shafts, wet-reflection
    // smears, seam reflections); the trails were the last members. The rest of the
    // night city (obsidian towers, lit seams, lamp pools, beacons, haze) carries
    // the road-motion feel without a bare streak. `this.streaks` stays empty so
    // the update loop and the material setters below remain no-ops.

    // ── Street level: wet asphalt ──────────────────────────────────────
    this.streetGround = new THREE.Mesh(
      new THREE.CircleGeometry(85, 28),
      new THREE.MeshBasicMaterial({ color: 0x07080d, transparent: true, opacity: 0.985, depthWrite: false })
    );
    this.streetGround.rotation.x = -Math.PI / 2;
    this.streetGround.position.set(CENTER.x, -0.08, CENTER.z);
    this.streetGround.renderOrder = -2;
    this.streetGround.visible = false;
    this.group.add(this.streetGround);

    // A vast, near-subliminal sheen across the asphalt — the city's
    // collective glow caught in the wet surface, lifting the street
    // just above void-black
    const sheen = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshBasicMaterial({
        map: this._discTexture(), color: 0x1a1410, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    sheen.rotation.x = -Math.PI / 2;
    sheen.position.set(CENTER.x, 0.012, CENTER.z);
    sheen.renderOrder = 0;
    sheen.visible = false;
    this.group.add(sheen);
    this.streetFX.push({ mesh: sheen, kind: 'sheen', base: 1.0 });

    // Sodium/magenta pools + cones + wet reflection smears. The smear
    // runs from each light toward the camera diagonal (+x,+z) — the
    // classic wet-street long reflection.
    const disc = this._discTexture();
    // W / final residuals: every pool here now sits IN FRONT OF or beside the
    // room (z >= CENTER.z). The three pools that used to sit BEHIND the room
    // (CENTER.z - 8, -9, -15) are DELETED. Their poles/heads were occluded by
    // the room's back walls, so all that ever peeked over the wall top was the
    // amber pool disc — the orphan smudge the rider flagged "right of the
    // room's east edge." A streetlight the camera can only see the glow of, not
    // the pole, is an orphan by construction; only front/side lamps survive.
    const POOLS = [
      // [x, z, kind, scale]  — kind 'B' = magenta
      [CENTER.x - 14, CENTER.z + 15, 'A', 1.0],
      [CENTER.x - 4,  CENTER.z + 17, 'A', 1.25],
      [CENTER.x + 7,  CENTER.z + 15, 'B', 1.0],
      [CENTER.x + 16, CENTER.z + 12, 'A', 0.9],
      [CENTER.x - 16, CENTER.z + 2,  'A', 1.15],
      [CENTER.x + 18, CENTER.z + 2,  'A', 1.0],
      [CENTER.x + 2,  CENTER.z + 22, 'A', 1.1],
      [CENTER.x + 11, CENTER.z + 24, 'A', 0.9],
      [CENTER.x - 24, CENTER.z + 6,  'A', 0.9],
    ];
    for (const [px, pz, kind, s] of POOLS) {
      // Faint wet-asphalt patch UNDER the pool so the sodium light lands on
      // a SURFACE instead of floating as a disc in the void (critic: "no
      // ground plane to pool on — read as fireball particle bugs"). Non-
      // additive, lifted just above void-black, soft radial falloff so it
      // has no hard rim — reads as a wet slab catching the lamp.
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(9.5 * s, 9.5 * s),
        new THREE.MeshBasicMaterial({
          // Round-3: exterior lamp pools still "hovered on invisible ground —
          // fuzzy warm discs in pure black touching no surface." The catch is now
          // a MUCH WIDER, near-void-black cool-asphalt disc (was a smaller warm
          // brown that blended into the pool). A dim implied-asphalt halo rings
          // the warm pool so the sodium clearly lands ON a surface, not in void.
          map: disc, color: 0x1c1a16, transparent: true, opacity: 0.9, depthWrite: false,
        })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(px, 0.006, pz);
      ground.renderOrder = 0;
      ground.visible = false;
      this.group.add(ground);
      this.streetFX.push({ mesh: ground, kind: 'ground', base: 1.0 });

      // Pooled light on the asphalt — Wave-2 R2: broadened and dimmed (base
      // 1.0 -> 0.55) so it reads as a soft sodium bokeh diffusing into the
      // ground disc, not a hard bright ellipse hovering in the void.
      const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4 * s, 3.4 * s),
        new THREE.MeshBasicMaterial({
          map: disc, color: 0xffa04a, transparent: true, opacity: 0.28,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(px, 0.02, pz);
      pool.renderOrder = 1;
      pool.visible = false;
      this.group.add(pool);
      this.streetFX.push({ mesh: pool, kind, base: 0.55 });

      // W / final residuals: the hazy light SHAFT (a camera-facing amber
      // billboard) is DELETED. Even eased to base 0.05 it was the source of the
      // garage's orphan amber vertical smears — any lamp whose pole/head fell
      // behind a wall or off the readable floor left the shaft floating
      // unattached in the void (rider: "orphan smears MUST reach zero").
      // Restraint beats decoration: the structured lamp is now pole + head +
      // pool + ground catch only — no free-floating emissive without a pole.

      // The lamp standard — every emissive needs visible structure (rider:
      // amber smears "unattached to any lamp pole"). The pole was 0x232833 —
      // near-invisible against the void, so its beam read as orphaned. Lifted
      // to a legible cool grey and widened so every shaft plainly hangs ON a
      // pole. Kept unlit (retint skips 'pole'), just brighter.
      const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 5.6, 0.13),
        new THREE.MeshBasicMaterial({ color: 0x5a6576 })
      );
      pole.position.set(px, 2.8, pz);
      pole.visible = false;
      this.group.add(pole);
      this.streetFX.push({ mesh: pole, kind: 'pole', base: 1.0 });

      // The lamp itself — a small HARD hot point (critic: "hard-core the
      // lamp heads"). Fully opaque solid core so it reads as a lit bulb and
      // feeds the bloom pass, instead of a soft fuzzy disc.
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd9a8 })
      );
      head.position.set(px, 5.6, pz);
      head.visible = false;
      this.group.add(head);
      this.streetFX.push({ mesh: head, kind: kind === 'B' ? 'coreB' : 'coreA', base: 1.0 });

      // W / final residuals: the wet-reflection SMEAR (a flat amber streak
      // raked toward the camera) is DELETED. Any pool sitting off the readable
      // floor left its smear floating as a diagonal orphan streak in the void
      // (rider: the "Z-shaped smear pair at the garage corner"). The ground
      // catch + pool already plant the lamp on wet asphalt; the raked streak
      // was pure decoration, so it's culled.
    }

    // W / final residuals: the per-tower SEAM REFLECTION smears are DELETED.
    // These flat amber streaks raked off each glowing tower's base had NO pole
    // or head to anchor them — exactly the "smear sprite that lacks an
    // associated pole+head" the rider flagged (the left-field smudges and the
    // pair right of the room's east edge). The tower seams themselves still
    // read; their loose ground reflections do not survive the cull.

    // ── Layered ground haze (street level) ─────────────────────────────
    this.mistPatches = [];
    for (let i = 0; i < 7; i++) {
      const mist = new THREE.Mesh(
        new THREE.CircleGeometry(7 + (i % 3) * 4, 12),
        new THREE.MeshBasicMaterial({ color: 0x0d101c, transparent: true, opacity: 0.13, depthWrite: false })
      );
      mist.rotation.x = -Math.PI / 2;
      mist.position.set(CENTER.x + (i - 3) * 11, 0.22 + (i % 2) * 0.18, CENTER.z + ((i * 7) % 22) - 11);
      mist.visible = false;
      this.group.add(mist);
      this.mistPatches.push({ mesh: mist, speed: 0.3 + (i % 4) * 0.1, phase: i * 1.7 });
    }
    // A second, higher, dimmer layer for depth
    for (let i = 0; i < 3; i++) {
      const mist = new THREE.Mesh(
        new THREE.CircleGeometry(14 + i * 5, 12),
        new THREE.MeshBasicMaterial({ color: 0x0d101c, transparent: true, opacity: 0.055, depthWrite: false })
      );
      mist.rotation.x = -Math.PI / 2;
      mist.position.set(CENTER.x + (i - 1) * 18, 1.9 + i * 0.5, CENTER.z + i * 9 - 9);
      mist.visible = false;
      this.group.add(mist);
      this.mistPatches.push({ mesh: mist, speed: 0.18 + i * 0.07, phase: i * 2.3 });
    }

    // ── Cloud shadows drifting across the office floor ─────────────────
    for (let i = 0; i < 4; i++) {
      const blob = new THREE.Mesh(
        new THREE.CircleGeometry(3 + i * 1.2, 14),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.07, depthWrite: false })
      );
      blob.rotation.x = -Math.PI / 2;
      blob.position.set(i * 9 - 6, 0.008, 2 + i * 4);
      blob.scale.x = 1.6;
      this.group.add(blob);
      this.cloudShadows.push({ mesh: blob, speed: 0.25 + i * 0.08 });
    }
  }

  // Push apart any towers whose XZ footprints intersect, so no two slab faces
  // are coplanar or interpenetrating. Deterministic (no rand()), runs once at
  // build time, and moves the *outer* tower of each pair radially outward so
  // the skyline silhouette keeps its authored near/far banding.
  _separateTowers() {
    const MARGIN = 0.45;                 // clear air between slabs
    const items = this.buildings.map((b) => {
      const p = b.mesh.geometry.parameters;
      return { rec: b, hw: p.width / 2, hd: p.depth / 2, radius: b.radius, fixed: false };
    });
    if (this.hqTower) {
      const p = this.hqTower.geometry.parameters;
      items.push({ rec: { mesh: this.hqTower }, hw: p.width / 2, hd: p.depth / 2, radius: 0, fixed: true });
    }
    for (let pass = 0; pass < 8; pass++) {
      let moved = 0;
      for (let a = 0; a < items.length; a++) {
        for (let b = a + 1; b < items.length; b++) {
          const A = items[a], B = items[b];
          const ap = A.rec.mesh.position, bp = B.rec.mesh.position;
          const gapX = Math.abs(ap.x - bp.x) - (A.hw + B.hw) - MARGIN;
          const gapZ = Math.abs(ap.z - bp.z) - (A.hd + B.hd) - MARGIN;
          if (gapX >= 0 || gapZ >= 0) continue;       // already clear on one axis
          // Move the outer tower (never the HQ, never a fixed item)
          const mover = A.fixed ? B : B.fixed ? A : (A.radius >= B.radius ? A : B);
          if (mover.fixed) continue;
          const other = mover === A ? B : A;
          const mp = mover.rec.mesh.position, op = other.rec.mesh.position;
          let dx = mp.x - op.x, dz = mp.z - op.z;
          const len = Math.hypot(dx, dz) || 1;
          dx /= len; dz /= len;
          const push = Math.min(-gapX, -gapZ) + 0.05;
          mp.x += dx * push; mp.z += dz * push;
          if (mover.rec.x !== undefined) { mover.rec.x = mp.x; mover.rec.z = mp.z; }
          moved++;
        }
      }
      if (!moved) break;
    }
    // Beacons and masts were positioned inside the build loop; re-anchor them
    // to whatever their tower ended up at, or a moved tower leaves a red dot
    // floating in the sky with no mast under it.
    for (const bc of this.beacons) {
      if (bc.hq || !bc.building) continue;
      const p = bc.building.mesh.position;
      bc.mesh.position.x = p.x; bc.mesh.position.z = p.z;
      if (bc.mast) { bc.mast.position.x = p.x; bc.mast.position.z = p.z; }
    }
  }

  // Recenter the whole city on the building's plate center so the ring
  // of towers stays anchored to the SAME building as you change floors.
  setCenter(x, z) {
    this.group.position.set(x - CENTER.x, this.group.position.y, z - CENTER.z);
  }

  // Street-level mode: you're at the BOTTOM of the city. Tower bases
  // land at the ground plane and stretch overhead; light trails run at
  // curb height; sodium pools and wet reflections wake up; the Vaults
  // Fargo tower looms beyond the road.
  setStreetLevel(on) {
    if (this.streetLevel === on) return;
    this.streetLevel = on;
    this.streakY = on ? -0.25 : -16;
    // Long-exposure street trails are motion-blur WHISPERS, not bright bars. At
    // 1.0 they floated as orphan orange/red lines in the garage's walled void
    // with no pole or pool (rider: "garage orphan smears … the rider says
    // zero"). Halved so they read as subliminal road motion, never a bare streak.
    this._streakDim = on ? 0.45 : 0.2;
    const t = TIME_OF_DAY[this.tod];
    if (t) {
      this._streakMatA.opacity = t.streakOpacity * this._streakDim;
      this._streakMatB.opacity = t.streakOpacity * this._streakDim * this._streakBFactor;
    }
    // ── TEAR FIX (F3) ────────────────────────────────────────────────────
    // Producer report: "a building visibly stretches/tears outside the garage."
    // Root cause was two bugs compounding, both in this block:
    //
    // 1. `scale.y = 2.4` is a NON-UNIFORM scale on a UV-mapped box, so the
    //    facade canvas — authored 1:1, with 4×6px windows on a 9×10 pitch and
    //    a 1–2px seam column — is stretched 2.4× in v. Every window row
    //    becomes a 2.4×-tall amber streak and the seam becomes a bar over a
    //    thousand pixels long. That is the "stretch", literally.
    // 2. Dimming via `material.color` is a MULTIPLY, so it cannot compress
    //    dynamic range: the near-black body (#08080d) went to pure black and
    //    disappeared, while the bright seam/windows survived at 18%. All that
    //    was left on screen were the stretched bright features, floating in
    //    void, terminating in hard flat cuts at the box edges. That is the
    //    "tear".
    //
    // Fix: at street level the towers sample a STREET VARIANT of the same
    // facade canvas that has no windows and no seam column — body gradient,
    // gloss and panel joins only. With no thin bright features left there is
    // nothing for the 2.4× stretch to smear and nothing to orphan, so the
    // tint hack is no longer needed and the authored obsidian body reads as a
    // slab silhouette again. This is what the old comment here *wanted*
    // ("light belongs to the road, not the towers") done by removing the
    // features rather than by scaling them down.
    for (const b of this.buildings) {
      if (on) {
        b.mesh.scale.y = 2.4;
        b.mesh.position.y = (b.h * 2.4) / 2 - 0.6;
      } else {
        b.mesh.scale.y = 1;
        b.mesh.position.y = -b.h / 2 - b.baseDrop;
      }
      b.mesh.material.color.setHex(TOWER_TINT);
      if (this.tod) {
        b.mesh.material.map =
          this._facadeTexture(this.tod, this._facadeVariant(b, this.tod), b.litBucket, false, b.faceSeed, b.seamLevel, on);
        b.mesh.material.needsUpdate = true;
      }
    }
    // The Vaults Fargo HQ is only ever visible at street level, and its
    // magenta seam was the single worst offender — a 46-unit amber bar with a
    // hard flat terminus mid-frame. It gets the same seam-free street face.
    if (this.hqTower && this.tod) {
      this.hqTower.material.color.setHex(TOWER_TINT);
      this.hqTower.material.map = this._facadeTexture(this.tod, 1, 1, true, 0, 2, on);
      this.hqTower.material.needsUpdate = true;
    }
    for (const bc of this.beacons) {
      if (bc.hq) continue;
      const b = bc.building;
      if (b) {
        const roofY = b.mesh.position.y + (b.h * b.mesh.scale.y) / 2;
        bc.mesh.position.y = roofY + 0.6;
        if (bc.mast) bc.mast.position.y = roofY + 0.3;
      }
    }
    if (this.hqTower) {
      this.hqTower.visible = on;
      this.hqBeacon.visible = on;
      this.hqMast.visible = on;
    }
    // Wet asphalt replaces the blueprint void floor down here; cloud
    // shadows are an office-window thing and read wrong on the street
    if (this.streetGround) this.streetGround.visible = on;
    for (const fx of this.streetFX) fx.mesh.visible = on;
    for (const m of (this.mistPatches || [])) m.mesh.visible = on;
    for (const cs of this.cloudShadows) cs.mesh.visible = !on;
  }

  setTimeOfDay(key) {
    if (!TIME_OF_DAY[key] || key === this.tod) return;
    this.tod = key;
    const t = TIME_OF_DAY[key];
    // Street level uses the seam-free / window-free face (see setStreetLevel);
    // a time-of-day change must keep whichever variant is currently in play or
    // the stretch/tear artifact walks straight back in.
    const st = this.streetLevel === true;
    for (const b of this.buildings) {
      b.mesh.material.map = this._facadeTexture(key, this._facadeVariant(b, key), b.litBucket, false, b.faceSeed, b.seamLevel, st);
      b.mesh.material.needsUpdate = true;
    }
    if (this.hqTower) {
      this.hqTower.material.map = this._facadeTexture(key, 1, 1, true, 0, 2, st);
      this.hqTower.material.needsUpdate = true;
    }
    for (const bc of this.beacons) bc.mesh.material.color.set(t.beacon);
    this._streakMatA.color.set(t.streakA);
    this._streakMatB.color.set(t.streakB);
    this._streakMatA.opacity = t.streakOpacity * this._streakDim;
    this._streakMatB.opacity = t.streakOpacity * this._streakDim * this._streakBFactor;
    for (const fx of this.streetFX) {
      if (fx.kind === 'pole') continue;   // structure, not light — no retint
      if (fx.kind === 'ground') continue; // wet-asphalt patch — fixed dark, no retint
      if (fx.kind === 'coreA') { fx.mesh.material.color.set(0xffe6c2); continue; }
      if (fx.kind === 'coreB') { fx.mesh.material.color.set(0xffd9c9); continue; }
      if (fx.kind === 'sheen') { fx.mesh.material.color.set(t.sheen2); continue; }
      fx.mesh.material.color.set(fx.kind === 'B' ? t.poolB : t.poolA);
      fx.mesh.material.opacity = t.poolOpacity * fx.base;
    }
    for (const m of (this.mistPatches || [])) {
      m.mesh.material.color.set(t.haze);
      m.baseOpacity = t.hazeOpacity;
    }
    // Fog tint
    if (this.scene.fog) this.scene.fog.color.set(t.fog);
  }

  update(dt) {
    this.time += dt;

    // Beacons pulse slowly — the patient red heartbeat of the skyline
    // (dimmer than v2: accents, never a scatter of hot dots)
    for (const bc of this.beacons) {
      bc.mesh.material.opacity = 0.14 + 0.38 * (0.5 + 0.5 * Math.sin(this.time * 0.55 + bc.phase));
    }

    // Light trails drift along their streets (street level: curb height)
    const sy = this.streakY ?? -16;
    for (const s of this.streaks) {
      const range = 46;
      const p = ((this.time * s.speed + s.offset) % range + range) % range - range / 2;
      if (s.isX) {
        s.mesh.position.set(CENTER.x + p, sy, s.lane);
      } else {
        s.mesh.position.set(s.lane, sy, CENTER.z + p);
      }
    }

    // Cloud shadows drift and wrap across the play area
    for (const cs of this.cloudShadows) {
      cs.mesh.position.x += cs.speed * dt;
      if (cs.mesh.position.x > 34) cs.mesh.position.x = -10;
    }

    if (this.streetLevel) {
      // Ground haze breathes and drifts
      for (const m of this.mistPatches) {
        m.mesh.position.x += m.speed * dt;
        if (m.mesh.position.x > CENTER.x + 45) m.mesh.position.x = CENTER.x - 45;
        const base = m.baseOpacity ?? 0.11;
        m.mesh.material.opacity = base * (0.75 + 0.45 * (0.5 + 0.5 * Math.sin(this.time * 0.4 + m.phase)));
      }
      // Light cones breathe almost imperceptibly
      const t = TIME_OF_DAY[this.tod] || TIME_OF_DAY.night;
      let i = 0;
      for (const fx of this.streetFX) {
        if (!fx.breathe) continue;
        i++;
        fx.mesh.material.opacity =
          t.poolOpacity * fx.base * (0.85 + 0.15 * Math.sin(this.time * 0.7 + i * 1.9));
      }
    }
  }
}
