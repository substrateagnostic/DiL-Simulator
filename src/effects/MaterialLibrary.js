import * as THREE from 'three';
import { COLORS } from '../utils/constants.js';
import { ProceduralNormals } from './ProceduralNormals.js';

// Create a 3-tone gradient texture for toon shading
function createGradientMap(stops = 3) {
  const size = stops;
  const data = new Uint8Array(size);
  if (stops === 3) {
    data[0] = 80;   // shadow
    data[1] = 160;  // mid
    data[2] = 255;  // lit
  } else if (stops === 4) {
    data[0] = 60;
    data[1] = 120;
    data[2] = 190;
    data[3] = 255;
  } else {
    for (let i = 0; i < size; i++) {
      data[i] = Math.floor((i / (size - 1)) * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const gradientMap3 = createGradientMap(3);
const gradientMap4 = createGradientMap(4);

// Material cache
const cache = {};

// ── Cloth canvas textures (PS1 character clothing) ────────────────────
// 32x48 grayscale canvases multiplied through the material color, so one
// texture per VARIANT serves every clothing color. Deterministic hash
// noise only — no Math.random — so character rebuilds are pixel-stable.
// Variants:
//   'plain'   — 2-tone weave + darkened bottom hem (sleeves, jacket sides)
//   'placket' — plain + button placket line down the front (chest front)
//   'belt'    — weave + dark belt band w/ buckle near the top (pelvis)
const CLOTH_W = 32;
const CLOTH_H = 48;

function clothHash(x, y) {
  let h = (x * 374761393 + y * 668265263) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  return (h >>> 16) & 0xff;
}

function clothTexture(variant) {
  const key = `clothtex_${variant}`;
  if (cache[key]) return cache[key];

  const c = document.createElement('canvas');
  c.width = CLOTH_W;
  c.height = CLOTH_H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(CLOTH_W, CLOTH_H);

  for (let y = 0; y < CLOTH_H; y++) {
    for (let x = 0; x < CLOTH_W; x++) {
      // 2-tone weave — hash on (x>>1, y) gives 2px horizontal threads
      let v = (clothHash(x >> 1, y) & 1) ? 250 : 240;

      if (variant === 'belt') {
        // Belt band across the top of the pelvis, lighter buckle center
        if (y >= 0 && y <= 4) {
          v = (x >= 13 && x <= 18) ? 208 : Math.round(v * 0.45);
        }
      } else {
        // Bottom hem darkening (jacket weight)
        if (y >= 42) v = Math.round(v * (1 - (y - 41) * 0.03));
        if (variant === 'placket') {
          // Button placket line down the front + buttons
          if (x === 15 || x === 16) {
            v = Math.round(v * 0.82);
            if (y === 12 || y === 13 || y === 22 || y === 23 || y === 32 || y === 33) v = 120;
          } else if (x === 14 || x === 17) {
            v = Math.round(v * 0.93);
          }
        }
      }

      const i = (y * CLOTH_W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;   // the PS1 crunch
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  cache[key] = tex;
  return tex;
}

// ── Hinterberg per-material stylization (opt-in) ──────────────────────
// Their deferred material-ID channel → our forward equivalent: optional
// rim light + shadow-ramp tint injected into MeshToonMaterial via
// onBeforeCompile. DEFAULT PATH IS UNTOUCHED — a plain toon() with no
// rim/ramp opts compiles to a stock MeshToonMaterial (no recompile, no
// per-frame cost), so the thousands of flat-color props/characters pay
// nothing. Later lanes style a single material by passing:
//   Materials.custom(c, { rimColor: 0x6fb4ff, rimStrength: 0.4 })
//   Materials.custom(c, { rampTint: 0x2a3550, rampStrength: 0.5 })
// rimColor/rimStrength: fresnel glow at grazing angles (silhouette lift).
// rampTint/rampStrength: multiplies the SHADOW end of the toon ramp toward
// a hue (cool shadows / warm shadows) — the cheap Hinterberg ramp steal.
// View dir is real (varying), so it reads on both ortho and combat cams.
function toonRimHooks(mat, o) {
  const rimColor = new THREE.Color(o.rimColor ?? 0xffffff);
  const rampTint = new THREE.Color(o.rampTint ?? 0xffffff);
  const rimStrength = o.rimStrength ?? 0.0;
  const rimPower = o.rimPower ?? 2.5;
  const rampStrength = o.rampStrength ?? (o.rampTint !== undefined ? 0.5 : 0.0);
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rimColor };
    shader.uniforms.uRimStrength = { value: rimStrength };
    shader.uniforms.uRimPower = { value: rimPower };
    shader.uniforms.uRampTint = { value: rampTint };
    shader.uniforms.uRampStrength = { value: rampStrength };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRimView;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n\tvRimView = - mvPosition.xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>',
        '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimStrength;\nuniform float uRimPower;\nuniform vec3 uRampTint;\nuniform float uRampStrength;\nvarying vec3 vRimView;')
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>
      {
        vec3 rimV = normalize( vRimView );
        float ndv = clamp( dot( normal, rimV ), 0.0, 1.0 );
        float rim = pow( 1.0 - ndv, uRimPower ) * uRimStrength;
        gl_FragColor.rgb += uRimColor * rim;
        float luma = dot( gl_FragColor.rgb, vec3( 0.299, 0.587, 0.114 ) );
        float shadowMask = ( 1.0 - smoothstep( 0.0, 0.55, luma ) ) * uRampStrength;
        gl_FragColor.rgb = mix( gl_FragColor.rgb, gl_FragColor.rgb * uRampTint, shadowMask );
      }`);
  };
  // Same program for every rim/ramp material — values live in uniforms —
  // so three shares one compile across all of them.
  mat.customProgramCacheKey = () => 'toonRim';
}

function toon(color, opts = {}) {
  const styled = opts.rimStrength || opts.rampTint !== undefined;
  const key = `${color}_${opts.stops || 3}_${opts.emissive || 0}_${opts.emissiveIntensity || 0}_${opts.smooth ? 's' : 'f'}`
    + (styled ? `_r${opts.rimColor || 0}_${opts.rimStrength || 0}_${opts.rimPower || 0}_${opts.rampTint || 0}_${opts.rampStrength || 0}` : '');
  if (cache[key]) return cache[key];

  // NOTE: MeshToonMaterial ignores flatShading (three r183) — the low-poly
  // faceted look is carried by geometry choice instead (icosahedron heads,
  // hex/pentagon cylinders, low segment counts). The `smooth` opt is kept
  // in the cache key for future material-level experiments.
  const mat = new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: (opts.stops === 4) ? gradientMap4 : gradientMap3,
  });

  if (opts.emissive) {
    mat.emissive = new THREE.Color(opts.emissive);
    mat.emissiveIntensity = opts.emissiveIntensity || 0.3;
  }

  if (styled) toonRimHooks(mat, opts);

  cache[key] = mat;
  return mat;
}

// ── Lacquered-miniature PBR response (the Link's Awakening steal) ──────
// Toon shading is pure diffuse ramp — it has NO specular, so gloss is
// physically impossible in it (round-3 critic: "gloss is absent
// everywhere"). Floors, desks and metal therefore move to a real PBR
// material so the office key and the bar's neon punctual lights throw a
// lacquer highlight. Env-map-free BY DESIGN: a clearcoat lobe + the
// scene's existing directional/point lights carry the sheen, so no PMREM
// / renderer handle is needed and the reflection actually CATCHES the
// room neon (a static env map could not). Brightness matches toon —
// MeshStandard/Physical and MeshToon share the same Lambert+ambient
// irradiance scaling in three, so swapping does not darken the room.
//
// Per-mesh swappable (CombatScene white-flash reassigns child.material)
// and exposes a sane flat .color, exactly like the toon path.
//   opts: roughness, metalness, clearcoat, clearcoatRoughness,
//         normal ('wood'|'metal'|'carpet'|'concrete'), normalRepeat:[u,v],
//         normalScale, map (THREE.Texture), emissive, emissiveIntensity
function pbr(color, opts = {}) {
  const useCoat = (opts.clearcoat ?? 0) > 0;
  const nrmKey = opts.normal
    ? `${opts.normal}_${(opts.normalRepeat || [1, 1]).join('x')}_${opts.normalScale ?? 1}`
    : 'none';
  // map-bearing materials (patterned floors) are never cached here — the
  // caller owns the canvas texture and cache; flat pbr shortcuts cache.
  const cacheable = !opts.map;
  const key = `pbr_${color}_${opts.roughness ?? 0.5}_${opts.metalness ?? 0}_${useCoat ? (opts.clearcoat) : 0}_${opts.clearcoatRoughness ?? 0.1}_${nrmKey}_${opts.emissive || 0}_${opts.emissiveIntensity || 0}`;
  if (cacheable && cache[key]) return cache[key];

  const params = {
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.5,
    metalness: opts.metalness ?? 0.0,
  };
  if (opts.map) params.map = opts.map;
  const mat = useCoat ? new THREE.MeshPhysicalMaterial(params)
                      : new THREE.MeshStandardMaterial(params);
  if (useCoat) {
    mat.clearcoat = opts.clearcoat;
    mat.clearcoatRoughness = opts.clearcoatRoughness ?? 0.12;
  }
  if (opts.normal) {
    const nrm = ProceduralNormals.get(opts.normal, { repeat: opts.normalRepeat || [1, 1] });
    mat.normalMap = nrm;
    const ns = opts.normalScale ?? 0.35;
    mat.normalScale = new THREE.Vector2(ns, ns);
  }
  if (opts.emissive) {
    mat.emissive = new THREE.Color(opts.emissive);
    mat.emissiveIntensity = opts.emissiveIntensity || 0.3;
  }
  if (cacheable) cache[key] = mat;
  return mat;
}

export const Materials = {
  // The cache, exposed READ-ONLY for resource-ownership decisions. Room.dispose()
  // has to answer "is this texture shared, or does it die with the room?" and
  // this object is the authority for everything MaterialLibrary handed out —
  // including the canvas textures cached at cloth/monitor/skyline keys. Never
  // write to it from outside; never dispose anything found in it.
  _cache: cache,
  // Environment.
  // Floors/desks/metal are the lacquered-miniature surfaces — PBR so they
  // catch a specular sheen (toon cannot). Walls/ceiling/props stay toon:
  // matte flat-color charm is the point there, and painting every wall
  // glossy would fight the Severance-sterile read. `floor()`/`tile()` are
  // the plain institutional floor — a WAXED VCT satin (period-correct: a
  // Lumon floor is buffed, not mirror), ready if a room routes to them.
  floor: () => pbr(COLORS.FLOOR, { roughness: 0.62, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.35, normal: 'concrete', normalRepeat: [6, 4], normalScale: 0.12 }),
  // The generic plain-floor fallback (Room._buildFloor's `else`). Was
  // Materials.custom(color) — a FLAT TOON PLANE with no specular, no normal,
  // no clearcoat: the wiring bug that meant three rounds of floor-material
  // work never reached the screen (reception, garage, break room all shipped
  // matte resin). Now a WAXED VCT satin that respects the room's floorColor:
  // real PBR so the office key throws a satin sheen, a troweled concrete
  // micro-normal so the surface stops reading as vertex colour, and a soft
  // clearcoat lobe the fixtures can catch. Value-matched to toon (three's
  // Standard/Physical share MeshToon's irradiance scaling — no darkening).
  satinFloor: (color) => pbr(color, { roughness: 0.6, metalness: 0.0, clearcoat: 0.34, clearcoatRoughness: 0.32, normal: 'concrete', normalRepeat: [8, 6], normalScale: 0.24 }),
  carpet: () => toon(COLORS.CARPET),
  wall: () => toon(COLORS.WALL),
  ceiling: () => toon(COLORS.CEILING),
  // Cubicle partitions were flat toon — "surfaces read vertex colour" (round-3
  // critic). Now a fabric-panel PBR: high roughness (felt, not plastic) + a
  // coarse woven normal at real amplitude so the camera-facing panel face
  // catches the office key as loop-pile tooth instead of a dead grey slab.
  cubicleWall: () => pbr(COLORS.CUBICLE_WALL, { roughness: 0.92, metalness: 0.0, normal: 'carpet', normalRepeat: [3, 2], normalScale: 0.7 }),
  // Wave-2 R2: lower base roughness + a deeper wood-grain normal so the office
  // key throws a visible streaked clearcoat highlight (the "give wood 2% spec so
  // it stops reading as painted foam" note). The grain now shapes that highlight
  // at gameplay zoom instead of a flat brown box.
  desk: () => pbr(COLORS.DESK, { roughness: 0.42, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.14, normal: 'wood', normalRepeat: [2, 2], normalScale: 0.68 }),
  deskDark: () => pbr(COLORS.DESK_DARK, { roughness: 0.4, metalness: 0.0, clearcoat: 0.7, clearcoatRoughness: 0.13, normal: 'wood', normalRepeat: [2, 2], normalScale: 0.68 }),
  monitor: () => toon(0x222222),
  monitorScreen: () => toon(COLORS.MONITOR_GLOW, { emissive: COLORS.MONITOR_GLOW, emissiveIntensity: 0.8 }),
  chair: () => toon(0x333333),
  chairFabric: () => toon(0x444466),
  plant: () => toon(0x3a7a3a),
  plantPot: () => toon(0xc1622a),
  paper: () => toon(0xf5f0e8),
  coffee: () => toon(COLORS.COFFEE),
  mug: () => toon(COLORS.COFFEE_MUG),
  mugRed: () => toon(0xcc3333),
  // Brushed metal — moderate metalness (env-map-free, so a full metal
  // would render near-black; 0.55 keeps a diffuse body + a soft brushed
  // specular from the office key).
  metal: () => pbr(0x888888, { roughness: 0.45, metalness: 0.55, normal: 'metal', normalRepeat: [3, 3], normalScale: 0.22 }),
  glass: () => toon(0xaaccee, { stops: 4 }),
  whiteboard: () => toon(0xf0f0f0),
  tile: () => pbr(0xd8d0c0, { roughness: 0.6, metalness: 0.0, clearcoat: 0.4, clearcoatRoughness: 0.3, normal: 'concrete', normalRepeat: [6, 6], normalScale: 0.1 }),
  fridge: () => toon(0xdddddd),
  microwave: () => toon(0x444444),
  vendingMachine: () => toon(0x2244aa, { emissive: 0x112244, emissiveIntensity: 0.28 }),

  // Character parts
  skin: () => toon(COLORS.SKIN),
  skinDark: () => toon(COLORS.SKIN_DARK),
  hairBrown: () => toon(COLORS.HAIR_BROWN),
  hairDark: () => toon(COLORS.HAIR_DARK),
  hairBlonde: () => toon(COLORS.HAIR_BLONDE),
  hairGray: () => toon(COLORS.HAIR_GRAY),
  hairWhite: () => toon(COLORS.HAIR_WHITE),
  suitBlue: () => toon(COLORS.SUIT_BLUE),
  suitBlack: () => toon(COLORS.SUIT_BLACK),
  shirtWhite: () => toon(COLORS.SHIRT_WHITE),
  khaki: () => toon(COLORS.KHAKI),
  poloGreen: () => toon(COLORS.POLO_GREEN),
  hawaiian: () => toon(COLORS.HAWAIIAN),
  cardigan: () => toon(COLORS.CARDIGAN),
  blazer: () => toon(COLORS.BLAZER),
  redTie: () => toon(COLORS.RED_TIE),
  blueTie: () => toon(COLORS.BLUE_TIE),
  pants: (color) => toon(color || 0x2a2a3a),
  shoes: () => toon(0x1a1a1a),

  // Custom color toon material
  custom: (color, opts) => toon(color, opts),

  // Painted cloth toon material for character clothing. `color` should
  // already be tone-treated (CharacterBuilder's toneColor), so the cache
  // key is effectively (color, tone, variant). Headless-safe: the data
  // validator builds characters under Node where there is no canvas —
  // fall back to the flat toon material there (nobody is looking).
  cloth(color, variant = 'plain') {
    if (typeof document === 'undefined') return toon(color);
    const key = `cloth_${color}_${variant}`;
    if (cache[key]) return cache[key];
    const mat = new THREE.MeshToonMaterial({
      color: new THREE.Color(color),
      map: clothTexture(variant),
      gradientMap: gradientMap3,
    });
    cache[key] = mat;
    return mat;
  },

  // Hardwood plank pattern — light oak with grain lines and plank seams
  // Lacquered plank floor. `tint` (the room's floorColor) cools/darkens
  // the walnut base so hardwood rooms honor their data palette — the
  // penthouse lounges are DARK floors in the data; the old baked-caramel
  // oak ("orange-washed", grade-brief violation) is gone.
  hardwoodPattern(w, h, tint) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base walnut — neutral-cool, never caramel
    ctx.fillStyle = '#8a755f';
    ctx.fillRect(0, 0, size, size);

    // Subtle grain streaks
    ctx.strokeStyle = 'rgba(84,64,46,0.34)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 28; i++) {
      const x = Math.random() * size;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (Math.random() - 0.5) * 10, size / 3,
                        x + (Math.random() - 0.5) * 10, (size * 2) / 3,
                        x + (Math.random() - 0.5) * 8, size);
      ctx.stroke();
    }

    // Plank seams — horizontal lines every ~32px (long-side of planks)
    ctx.strokeStyle = 'rgba(100,70,30,0.55)';
    ctx.lineWidth = 1.2;
    for (let y = 32; y < size; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }

    // Plank end joints — staggered vertical lines
    ctx.strokeStyle = 'rgba(100,70,30,0.28)';
    ctx.lineWidth = 0.9;
    const offsets = [0, 48, 96, 16, 80];
    for (let row = 0; row * 32 < size; row++) {
      const xStart = offsets[row % offsets.length];
      for (let x = xStart; x < size; x += 96) {
        ctx.beginPath();
        ctx.moveTo(x, row * 32);
        ctx.lineTo(x, row * 32 + 32);
        ctx.stroke();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(w / 3, h / 3);

    // Tint: warm the room's floorColor toward walnut while PRESERVING its
    // darkness. The old code lerped 0.58 toward bone, which washed the
    // penthouse's near-black data floor (0x0c0610) to a flat mid-grey —
    // the exact "unpainted resin" the round-3 critic flagged. Now a dark
    // data floor stays a deep lacquered walnut (warm, low-value) that the
    // neon punctual lights pop against; a light data floor lands warm oak.
    // A small shadow floor keeps it from crushing to pitch (grain unread).
    // Warm the floor toward walnut hue while PRESERVING the data value.
    // The old code lerped 0.58 toward bone (washed the bar's near-black
    // floor to flat grey — the "unpainted resin" critic flag). Lifting it
    // instead to a mid walnut over-brightened it under the bar's dark
    // neon mood, reading as pale concrete. So: a gentle 0.32 hue-warm and
    // only a whisper of shadow floor — dark data floors stay DEEP wet
    // walnut (the Drive "magenta-on-reflection" read; neon glints pop
    // against near-black), light data floors land warm oak.
    const base = new THREE.Color(tint ?? 0x6b5335);
    const tintColor = base.lerp(new THREE.Color(0x60422a), 0.24);
    tintColor.r = tintColor.r * 0.98 + 0.006;
    tintColor.g = tintColor.g * 0.98 + 0.0034;
    tintColor.b = tintColor.b * 0.98 + 0.0020;
    // A near-black data floor (the lounge, 0x0c0610) is meant to read WET
    // near-black, not lifted grey — the room's nine point lights otherwise
    // wash a mid-roughness floor to flat lavender (the "matte grey that
    // reflects neither" indictment). Deepen the albedo of very dark floors so
    // the lit patches stay deep walnut and the neon ghost pops against it.
    const baseLuma = 0.299 * base.r + 0.587 * base.g + 0.114 * base.b;
    if (baseLuma < 0.12) tintColor.multiplyScalar(0.62);

    // Lacquered walnut: low base roughness + a crisp clearcoat lobe. No
    // env map — the office key and the bar's coloured point lights are
    // what the coat reflects (a static env could not catch the neon).
    // Wood-grain normal, stretched along the plank axis, streaks the
    // highlight instead of a plastic hotspot.
    // Roughness by VALUE: the near-black lounge floor (penthouse_bar,
    // 0x0c0610) wants to read WET — a low-roughness lacquer the neon glints
    // off, dark between the point-light hotspots so the magenta ghost pops
    // (the "indictment" still: matte grey that reflected neither). A bright
    // oak floor (board room, 0x9a9284) keeps a satin roughness so it doesn't
    // turn to plastic. Lerp between the two on the tint's luma.
    const luma = 0.299 * tintColor.r + 0.587 * tintColor.g + 0.114 * tintColor.b;
    const rough = 0.18 + Math.min(1, luma / 0.38) * (0.44 - 0.18);
    const mat = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: tintColor,
      roughness: rough,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.07,
    });
    mat.normalMap = ProceduralNormals.get('wood', { repeat: [Math.max(2, w / 3), Math.max(2, h / 6)] });
    mat.normalScale = new THREE.Vector2(0.36, 0.36);
    return mat;
  },

  // Clinical VCT tile floor (reception, the Severance lobby). Big square
  // waxed tiles with thin grout, a subtle checker sheen-variation, and a
  // satin clearcoat so the overhead troffers throw a buffed-floor gleam —
  // the "clinical tile catching light" the round-3 critic said never shipped
  // (reception was routing to a FLAT TOON plane). `tint` is the room floorColor.
  tilePattern(w, h, tint) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const col = new THREE.Color(tint ?? 0xd8d0c0);
    const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255);

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, size, size);

    // 2x2 tiles per texture image → checkered satin variation (buffed VCT is
    // never a flat field; adjacent tiles catch the light a hair differently).
    const t = size / 2;
    for (let ty = 0; ty < 2; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        const v = ((tx + ty) & 1) ? 0.955 : 1.035;
        ctx.fillStyle = `rgb(${Math.min(255, r * v) | 0},${Math.min(255, g * v) | 0},${Math.min(255, b * v) | 0})`;
        ctx.fillRect(tx * t + 1.5, ty * t + 1.5, t - 3, t - 3);
      }
    }
    // Fine VCT fleck so each tile has micro-tooth, not a plastic fill
    for (let i = 0; i < 260; i++) {
      const fx = Math.random() * size, fy = Math.random() * size;
      const d = (Math.random() - 0.5) * 40;
      ctx.fillStyle = `rgba(${Math.max(0, r + d) | 0},${Math.max(0, g + d) | 0},${Math.max(0, b + d) | 0},0.5)`;
      ctx.fillRect(fx, fy, 1.3, 1.3);
    }
    // Grout — darker, thin, along the tile seams (image edges + centre cross)
    const dr = Math.max(0, r - 58), dg = Math.max(0, g - 58), db = Math.max(0, b - 58);
    ctx.strokeStyle = `rgba(${dr},${dg},${db},0.85)`;
    ctx.lineWidth = 2.4;
    ctx.strokeRect(0, 0, size, size);
    ctx.beginPath();
    ctx.moveTo(t, 0); ctx.lineTo(t, size);
    ctx.moveTo(0, t); ctx.lineTo(size, t);
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(w / 2, h / 2);   // image spans 2 world units → ~1m tiles

    const mat = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.34,
      metalness: 0.0,
      clearcoat: 0.62,
      clearcoatRoughness: 0.17,
    });
    mat.normalMap = ProceduralNormals.get('concrete', { repeat: [w, h] });
    mat.normalScale = new THREE.Vector2(0.14, 0.14);
    return mat;
  },

  // Poured-concrete slab (parking garage). Broad control joints, coarse
  // aggregate speckle, and a HIGH-amplitude troweled normal so the sodium
  // pools graze real tooth (round-3: "garage concrete reads vertex colour").
  // A whisper of clearcoat for the sealed-slab sheen, no more.
  concretePattern(w, h, tint) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const col = new THREE.Color(tint ?? 0x888888);
    const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255);

    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, size, size);
    // Mottled pour — soft cloudy value drift
    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * size, cy = Math.random() * size, rad = 20 + Math.random() * 60;
      const d = (Math.random() - 0.5) * 26;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      grad.addColorStop(0, `rgba(${Math.max(0, r + d) | 0},${Math.max(0, g + d) | 0},${Math.max(0, b + d) | 0},0.25)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    // Aggregate speckle
    for (let i = 0; i < 520; i++) {
      const fx = Math.random() * size, fy = Math.random() * size;
      const d = (Math.random() - 0.5) * 54;
      ctx.fillStyle = `rgba(${Math.max(0, r + d) | 0},${Math.max(0, g + d) | 0},${Math.max(0, b + d) | 0},0.55)`;
      ctx.fillRect(fx, fy, 1.4, 1.4);
    }
    // Control joints — a couple of dark saw-cut grooves per slab image
    const dr = Math.max(0, r - 64), dg = Math.max(0, g - 64), db = Math.max(0, b - 64);
    ctx.strokeStyle = `rgba(${dr},${dg},${db},0.8)`;
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, size); ctx.moveTo(0, 0); ctx.lineTo(size, 0); ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(w / 4, h / 4);   // ~4m poured bays

    const mat = new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.0,
      clearcoat: 0.16,
      clearcoatRoughness: 0.5,
    });
    mat.normalMap = ProceduralNormals.get('concrete', { repeat: [w * 1.5, h * 1.5] });
    mat.normalScale = new THREE.Vector2(0.42, 0.42);
    return mat;
  },

  // Office monitor screen content — cached canvas textures.
  // Variants: 'spreadsheet' | 'email' | 'code' | 'chart'
  officeScreen(variant = 'spreadsheet') {
    const key = `screen_${variant}`;
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas');
    c.width = 128; c.height = 80;
    const ctx = c.getContext('2d');

    if (variant === 'code') {
      ctx.fillStyle = '#10141c';
      ctx.fillRect(0, 0, 128, 80);
      const colors = ['#6ae28a', '#56b6c2', '#c678dd', '#e5c07b', '#abb2bf'];
      for (let i = 0; i < 11; i++) {
        const y = 6 + i * 7;
        const indent = 4 + (i % 4) * 8;
        const len = 30 + ((i * 37) % 70);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(indent, y, len, 2.5);
      }
    } else if (variant === 'email') {
      ctx.fillStyle = '#f4f6f8';
      ctx.fillRect(0, 0, 128, 80);
      ctx.fillStyle = '#3a5dae';
      ctx.fillRect(0, 0, 128, 12);
      ctx.fillStyle = '#dde4ec';
      ctx.fillRect(0, 12, 34, 68);
      for (let i = 0; i < 6; i++) {
        const y = 18 + i * 10;
        ctx.fillStyle = i === 1 ? '#cfe0f4' : '#ffffff';
        ctx.fillRect(37, y - 4, 88, 9);
        ctx.fillStyle = '#9aa4b2';
        ctx.fillRect(40, y - 1, 50 + (i * 13) % 30, 2);
      }
    } else if (variant === 'chart') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 80);
      ctx.strokeStyle = '#c8d0d8';
      ctx.beginPath(); ctx.moveTo(14, 6); ctx.lineTo(14, 68); ctx.lineTo(120, 68); ctx.stroke();
      const bars = [22, 38, 30, 50, 44, 58];
      bars.forEach((bh, i) => {
        ctx.fillStyle = i % 2 ? '#53a8b6' : '#e94560';
        ctx.fillRect(20 + i * 17, 68 - bh, 11, bh);
      });
      ctx.strokeStyle = '#2a8a4a';
      ctx.beginPath();
      ctx.moveTo(14, 60);
      bars.forEach((bh, i) => ctx.lineTo(26 + i * 17, 62 - bh * 0.8));
      ctx.stroke();
    } else { // spreadsheet (and its rare 'whisper' twin)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 128, 80);
      ctx.fillStyle = '#2a7a4a';
      ctx.fillRect(0, 0, 128, 9);
      ctx.strokeStyle = '#d0d8e0';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 128; x += 18) { ctx.beginPath(); ctx.moveTo(x, 9); ctx.lineTo(x, 80); ctx.stroke(); }
      for (let y = 9; y <= 80; y += 8) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(128, y); ctx.stroke(); }
      ctx.fillStyle = '#444c55';
      for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 7; col++) {
          if ((r * 7 + col) % 3 === 0) ctx.fillRect(2 + col * 18, 12 + r * 8, 10, 2);
        }
      }
      if (variant === 'whisper') {
        // One cell, very occasionally, is not a number. The building
        // talks through whatever is plugged in. Most people never notice.
        ctx.fillStyle = '#1a8a4a';
        ctx.font = 'bold 7px monospace';
        ctx.fillText('REMEMBERED', 2 + 2 * 18, 12 + 5 * 8 + 3);
      } else {
        ctx.fillStyle = '#cc3344';
        ctx.fillRect(2 + 4 * 18, 12 + 5 * 8, 10, 2); // the cell that's wrong
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    cache[key] = tex;
    return tex;
  },

  // City skyline seen through windows — cached per time-of-day variant.
  skyline(variant = 'day') {
    const key = `skyline_${variant}`;
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');

    const skies = {
      day:  ['#9cc4e4', '#d8e6f2'],
      dusk: ['#3a1a52', '#ff9a56'],
      night:['#060a1e', '#101830'],
    };
    const [topCol, botCol] = skies[variant] || skies.day;
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, topCol);
    grad.addColorStop(1, botCol);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);

    if (variant === 'dusk') {
      // Low sun
      ctx.fillStyle = 'rgba(255,200,120,0.9)';
      ctx.beginPath(); ctx.arc(190, 92, 12, 0, Math.PI * 2); ctx.fill();
    }
    if (variant === 'night') {
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 24; i++) {
        ctx.fillRect((i * 47) % 256, (i * 23) % 60, 1, 1);
      }
      ctx.fillStyle = '#e8e4d8';
      ctx.beginPath(); ctx.arc(210, 26, 9, 0, Math.PI * 2); ctx.fill();
    }

    // Building silhouettes — two depth layers
    const buildingCol = variant === 'day' ? '#7e93a8' : variant === 'dusk' ? '#241335' : '#0c1019';
    const backCol     = variant === 'day' ? '#92a8bc' : variant === 'dusk' ? '#382050' : '#121826';
    let x = 0;
    ctx.fillStyle = backCol;
    while (x < 256) {
      const bw = 18 + (x * 7) % 22;
      const bh = 34 + (x * 13) % 36;
      ctx.fillRect(x, 128 - bh - 14, bw, bh + 14);
      x += bw + 4;
    }
    x = -8;
    ctx.fillStyle = buildingCol;
    while (x < 256) {
      const bw = 22 + (x * 11) % 26;
      const bh = 22 + (x * 17) % 50;
      ctx.fillRect(x, 128 - bh, bw, bh);
      // Lit windows
      const litChance = variant === 'day' ? 0.12 : variant === 'dusk' ? 0.4 : 0.55;
      ctx.fillStyle = variant === 'day' ? 'rgba(230,240,250,0.7)' : 'rgba(255,200,90,0.85)';
      for (let wy = 128 - bh + 4; wy < 122; wy += 7) {
        for (let wx = x + 3; wx < x + bw - 3; wx += 6) {
          if (((wx * 31 + wy * 17) % 100) / 100 < litChance) ctx.fillRect(wx, wy, 3, 3);
        }
      }
      ctx.fillStyle = buildingCol;
      x += bw + 6;
    }

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    cache[key] = tex;
    return tex;
  },

  // Carpet pattern — canvas texture with a repeating loop-pile grid
  carpetPattern(w, h, color) {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const dr = Math.max(0, r - 46);
    const dg = Math.max(0, g - 46);
    const db = Math.max(0, b - 46);

    // Base fill
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, size, size);

    // Tight cross-hatch grid
    ctx.strokeStyle = `rgba(${dr},${dg},${db},0.4)`;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= size; i += 8) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
    }

    // Small loop dots at grid intersections
    ctx.fillStyle = `rgba(${dr},${dg},${db},0.55)`;
    for (let x = 4; x < size; x += 8) {
      for (let y = 4; y < size; y += 8) {
        ctx.beginPath();
        ctx.arc(x, y, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(w / 2, h / 2);

    // Carpet is MATTE — no lacquer here — but a woven normal map gives the
    // office key something to graze, so it reads as loop pile with depth
    // instead of the flat matte plane the critic called "unpainted resin".
    // High roughness, zero metalness, NO clearcoat: cloth, not plastic.
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      color: new THREE.Color(color),
      roughness: 0.94,
      metalness: 0.0,
    });
    // Coarser weave (half the tile-repeat → bigger loops) at higher amplitude
    // so the pile actually READS at 1920px iso zoom instead of dissolving to a
    // flat field — round-3 "normals invisible at screenshot scale". Still micro
    // enough to shape a graze, not bumpy porridge.
    mat.normalMap = ProceduralNormals.get('carpet', { repeat: [Math.max(2, w / 2), Math.max(2, h / 2)] });
    mat.normalScale = new THREE.Vector2(0.9, 0.9);
    return mat;
  },
};
