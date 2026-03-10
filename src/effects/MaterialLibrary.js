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
