import * as THREE from 'three';
import { COLORS } from '../utils/constants.js';

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

function toon(color, opts = {}) {
  const key = `${color}_${opts.stops || 3}_${opts.emissive || 0}`;
  if (cache[key]) return cache[key];

  const mat = new THREE.MeshToonMaterial({
    color: new THREE.Color(color),
    gradientMap: (opts.stops === 4) ? gradientMap4 : gradientMap3,
  });

  if (opts.emissive) {
    mat.emissive = new THREE.Color(opts.emissive);
    mat.emissiveIntensity = opts.emissiveIntensity || 0.3;
  }

  cache[key] = mat;
  return mat;
}

export const Materials = {
  // Environment
  floor: () => toon(COLORS.FLOOR),
  carpet: () => toon(COLORS.CARPET),
  wall: () => toon(COLORS.WALL),
  ceiling: () => toon(COLORS.CEILING),
  cubicleWall: () => toon(COLORS.CUBICLE_WALL),
  desk: () => toon(COLORS.DESK),
  deskDark: () => toon(COLORS.DESK_DARK),
  monitor: () => toon(0x222222),
  monitorScreen: () => toon(COLORS.MONITOR_GLOW, { emissive: COLORS.MONITOR_GLOW, emissiveIntensity: 0.5 }),
  chair: () => toon(0x333333),
  chairFabric: () => toon(0x444466),
  plant: () => toon(0x3a7a3a),
  plantPot: () => toon(0xc1622a),
  paper: () => toon(0xf5f0e8),
  coffee: () => toon(COLORS.COFFEE),
  mug: () => toon(COLORS.COFFEE_MUG),
  mugRed: () => toon(0xcc3333),
  metal: () => toon(0x888888),
  glass: () => toon(0xaaccee, { stops: 4 }),
  whiteboard: () => toon(0xf0f0f0),
  tile: () => toon(0xd8d0c0),
  fridge: () => toon(0xdddddd),
  microwave: () => toon(0x444444),
  vendingMachine: () => toon(0x2244aa, { emissive: 0x112244, emissiveIntensity: 0.2 }),

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

  // Hardwood plank pattern — light oak with grain lines and plank seams
  hardwoodPattern(w, h) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Base oak colour
    ctx.fillStyle = '#c8a96e';
    ctx.fillRect(0, 0, size, size);

    // Subtle grain streaks
    ctx.strokeStyle = 'rgba(160,120,60,0.18)';
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
    ctx.strokeStyle = 'rgba(100,70,30,0.35)';
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
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(w / 3, h / 3);

    return new THREE.MeshToonMaterial({
      map: texture,
      color: new THREE.Color(0xd4aa72),
      gradientMap: gradientMap3,
    });
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
    const dr = Math.max(0, r - 28);
    const dg = Math.max(0, g - 28);
    const db = Math.max(0, b - 28);

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

    return new THREE.MeshToonMaterial({
      map: texture,
      color: new THREE.Color(color),
      gradientMap: gradientMap3,
    });
  },
};
