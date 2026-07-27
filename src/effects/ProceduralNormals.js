import * as THREE from 'three';

// ProceduralNormals — zero-asset tileable normal maps, canvas-free.
//
// The comp card's one NAMED unproven-quality gap (Hinterberg leans on
// Substance tileable normals; our zero-asset equivalent is procedural).
// Everything here is pure math into a Uint8 array — NO document / canvas,
// so it is inherently headless-safe (the data validator can import this
// file under Node without a DOM). Textures upload lazily at first render.
//
// Design rules (from the comp card warning — "avoid bumpy porridge"):
//   - keep the perturbation FINE and LOW-amplitude; these are micro-
//     surface maps that shape a specular highlight, not displacement.
//   - callers pair these with a SMALL normalScale (0.15–0.5) and let the
//     lacquer clearcoat / punctual speculars do the actual talking.
//
// Variants:
//   'wood'     — directional grain running along +U (plank long axis)
//   'metal'    — fine brushed streaks along +U
//   'carpet'   — loop-pile weave (over/under warp + weft)
//   'concrete' — isotropic micro-noise (troweled screed)
//
// get(variant, { repeat:[u,v], size }) returns a THREE.DataTexture with
// RepeatWrapping. Pixel data is generated once per (variant,size) and a
// thin Texture wrapper is cached per (variant,size,repeat) so different
// consumers (floor vs desk) can tile the SAME grain at different scales
// without regenerating the field.

const SIZE = 256;                 // power-of-two → clean mipmaps + wrap
const pixCache = {};              // `${variant}_${size}` -> Float height grid helpers
const texCache = {};              // `${variant}_${size}_${u}_${v}` -> DataTexture

// ── Deterministic hash + tileable value noise ────────────────────────
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Value noise on a lattice of `period` cells, wrapped so the field tiles
// seamlessly across `size` texels (period must divide evenly for wrap).
function vnoise(u, v, period) {
  const x = u * period, y = v * period;
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const wrap = (n) => ((n % period) + period) % period;
  const p = (a, b) => hash2(wrap(a), wrap(b));
  const a = p(xi, yi), b = p(xi + 1, yi), c = p(xi, yi + 1), d = p(xi + 1, yi + 1);
  const sx = s(xf), sy = s(yf);
  return a * (1 - sx) * (1 - sy) + b * sx * (1 - sy) + c * (1 - sx) * sy + d * sx * sy;
}

// Fractal (2 octaves) — cheap, still tileable because each octave uses a
// period that divides the base.
function fbm(u, v, period) {
  return 0.65 * vnoise(u, v, period) + 0.35 * vnoise(u, v, period * 2);
}

// ── Height fields (return height in ~[0,1] for UV coords u,v in [0,1)) ─
function heightFn(variant) {
  switch (variant) {
    case 'wood':
      // Grain runs along U: compress U, stretch V so streaks are long
      // horizontally. A few sparse darker vessel lines ride the grain.
      return (u, v) => {
        const grain = fbm(u * 2.0, v * 26.0, 16);         // long U-streaks
        const pore = vnoise(u * 3.0, v * 90.0, 32) * 0.25; // fine pores
        return grain * 0.8 + pore;
      };
    case 'metal':
      // Brushed: very long fine streaks along U, tiny amplitude.
      return (u, v) => {
        return vnoise(u * 1.0, v * 200.0, 64) * 0.6 +
               vnoise(u * 0.5, v * 60.0, 16) * 0.4;
      };
    case 'carpet':
      // Loop-pile weave: raised warp columns and weft rows interlocking,
      // plus a speckle so it never reads as a flat grid.
      return (u, v) => {
        const cells = 40;
        const cx = u * cells, cy = v * cells;
        const warp = Math.abs(Math.sin(cx * Math.PI));
        const weft = Math.abs(Math.sin(cy * Math.PI));
        const over = (Math.floor(cx) + Math.floor(cy)) & 1;
        const weave = over ? warp * 0.7 + weft * 0.3 : weft * 0.7 + warp * 0.3;
        const fuzz = hash2(Math.floor(cx * 2), Math.floor(cy * 2)) * 0.18;
        return weave * 0.8 + fuzz;
      };
    case 'concrete':
    default:
      // Isotropic troweled micro-noise.
      return (u, v) => fbm(u * 12.0, v * 12.0, 48) * 0.7 +
                       vnoise(u * 40.0, v * 40.0, 128) * 0.3;
  }
}

// Sample a height grid once (so the Sobel pass reads neighbours cheaply).
function buildGrid(variant, size) {
  const key = `${variant}_${size}`;
  if (pixCache[key]) return pixCache[key];
  const fn = heightFn(variant);
  const grid = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      grid[y * size + x] = fn(x / size, y / size);
    }
  }
  pixCache[key] = { grid, size };
  return pixCache[key];
}

// Sobel the height grid into a tangent-space normal map (RGBA Uint8).
// `strength` sets the baked slope; consumers still scale via normalScale.
function buildNormalData({ grid, size }, strength) {
  const data = new Uint8Array(size * size * 4);
  const at = (x, y) => grid[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // central differences, wrapped for seamlessness
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      let nx = dx, ny = dy, nz = 1.0;
      const inv = 1.0 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= inv; ny *= inv; nz *= inv;
      const i = (y * size + x) * 4;
      data[i]     = Math.round((nx * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  return data;
}

// Per-variant baked slope. Wood/metal are subtle; carpet a touch more so
// the weave catches the steep office key; concrete faint.
const STRENGTH = { wood: 2.4, metal: 1.6, carpet: 4.0, concrete: 2.0 };

export const ProceduralNormals = {
  // variant, { repeat:[u,v], size }
  get(variant, { repeat = [1, 1], size = SIZE } = {}) {
    const tk = `${variant}_${size}_${repeat[0]}_${repeat[1]}`;
    if (texCache[tk]) return texCache[tk];

    const grid = buildGrid(variant, size);
    const data = buildNormalData(grid, STRENGTH[variant] ?? 2.0);
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.anisotropy = 4;               // grain stays crisp at the iso graze
    tex.colorSpace = THREE.NoColorSpace;   // normals are linear data
    tex.needsUpdate = true;
    texCache[tk] = tex;
    return tex;
  },
};

export default ProceduralNormals;
