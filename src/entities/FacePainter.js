import * as THREE from 'three';

// PS1-style painted faces. Like the originals, the face is a texture on
// the front of the head — which makes expression changes texture swaps
// and gives every character a tone dial:
//
//   tone: 'silly'  — features +20%, rounder eyes, saturated
//   tone: 'scary'  — compressed features, heavy lids, dark sockets
//   tone: 'normal' — neutral features (default)
//
// Textures are cached per (cacheKey, expression). Body-palette treatment
// for tones lives in CharacterBuilder (desaturation); this file only
// paints faces.

const SIZE = 128;
const cache = {};

const EXPRESSIONS = ['neutral', 'angry', 'smug', 'worried', 'hurt', 'victory'];

function hex(c) {
  return '#' + c.toString(16).padStart(6, '0');
}

function shade(c, f) {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

export function paintFace(config, expression = 'neutral') {
  // Headless guard: the data validator builds characters under Node,
  // where there is no canvas. Models render faceless there, which is
  // fine — nobody is looking.
  if (typeof document === 'undefined') return null;
  const id = config.faceCacheKey || config.name || 'anon';
  const key = `${id}_${expression}`;
  if (cache[key]) return cache[key];

  const tone = config.tone || 'normal';
  const skin = config.skinColor ?? 0xf5c6a0;
  const hairC = config.hairColor ?? 0x4a3728;
  const dial = tone === 'silly' ? 1.2 : tone === 'scary' ? 0.85 : 1.0;

  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d');

  // Skin base with vertical shading (brow lighter, jaw darker).
  // Capped below 1.0 so light skin never crosses the bloom threshold.
  const g = ctx.createLinearGradient(0, 0, 0, SIZE);
  g.addColorStop(0, shade(skin, 0.98));
  g.addColorStop(0.65, shade(skin, 0.93));
  g.addColorStop(1, shade(skin, tone === 'scary' ? 0.74 : 0.85));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Cheek/eye-socket shading
  ctx.fillStyle = `rgba(0,0,0,${tone === 'scary' ? 0.16 : 0.06})`;
  ctx.beginPath(); ctx.ellipse(38, 56, 16, 11 * dial, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(90, 56, 16, 11 * dial, 0, 0, Math.PI * 2); ctx.fill();
  if (tone === 'silly') {
    ctx.fillStyle = 'rgba(220,90,90,0.18)'; // blush
    ctx.beginPath(); ctx.ellipse(30, 78, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(98, 78, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Expression parameters
  const E = {
    neutral: { browLift: 0, browAngle: 0, eyeOpen: 1, mouth: 'flat' },
    angry:   { browLift: -5, browAngle: 0.45, eyeOpen: 0.75, mouth: 'frown' },
    smug:    { browLift: 0, browAngle: -0.2, eyeOpen: 0.8, mouth: 'half' },
    worried: { browLift: 7, browAngle: -0.35, eyeOpen: 1.15, mouth: 'o' },
    hurt:    { browLift: -3, browAngle: 0.35, eyeOpen: 0.25, mouth: 'grit' },
    victory: { browLift: 4, browAngle: -0.1, eyeOpen: 1, mouth: 'grin' },
  }[expression] || { browLift: 0, browAngle: 0, eyeOpen: 1, mouth: 'flat' };

  const baseBrow = (config.browAngle || 0) * 18;
  const eyeY = 54 + (E.browLift < 0 ? 1 : 0);
  const eyeW = 11 * dial;
  const eyeH = Math.max(1.5, 7.5 * dial * E.eyeOpen * (tone === 'scary' ? 0.8 : 1));

  // Eyes: whites + iris + lid line
  for (const ex of [40, 88]) {
    ctx.fillStyle = tone === 'scary' ? '#ded8cc' : '#f4f1ea';
    ctx.beginPath(); ctx.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#241c14';
    ctx.beginPath(); ctx.ellipse(ex, eyeY, Math.min(eyeW * 0.45, 4.6 * dial), Math.min(eyeH, 4.6 * dial), 0, 0, Math.PI * 2); ctx.fill();
    if (tone !== 'silly') {
      ctx.strokeStyle = shade(skin, 0.6);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(ex - eyeW, eyeY - eyeH); ctx.lineTo(ex + eyeW, eyeY - eyeH * 0.7); ctx.stroke();
    }
  }

  // Brows
  ctx.strokeStyle = hex(hairC);
  ctx.lineWidth = tone === 'silly' ? 5 : 4;
  ctx.lineCap = 'round';
  const browY = 42 - E.browLift;
  for (const [bx, dir] of [[40, 1], [88, -1]]) {
    const ang = (E.browAngle + 0) * dir + (dir === 1 ? baseBrow / 40 : -baseBrow / 40);
    ctx.beginPath();
    ctx.moveTo(bx - 11, browY + ang * 8);
    ctx.lineTo(bx + 11, browY - ang * 8);
    ctx.stroke();
  }

  // Nose: simple shading wedge
  ctx.fillStyle = `rgba(0,0,0,${tone === 'scary' ? 0.18 : 0.1})`;
  const noseS = (config.noseScale || 1) * dial;
  ctx.beginPath();
  ctx.moveTo(64, 58);
  ctx.lineTo(64 - 5 * noseS, 76);
  ctx.lineTo(64 + 5 * noseS, 76);
  ctx.closePath();
  ctx.fill();

  // Mouth
  const mouthY = 92;
  const mw = 15 * dial * (config.mouthWidth || 1);
  ctx.strokeStyle = tone === 'scary' ? '#3a2020' : '#5a2c2c';
  ctx.lineWidth = tone === 'silly' ? 4 : 3;
  ctx.beginPath();
  if (E.mouth === 'flat') {
    ctx.moveTo(64 - mw * 0.8, mouthY); ctx.lineTo(64 + mw * 0.8, mouthY);
  } else if (E.mouth === 'frown') {
    ctx.arc(64, mouthY + 8, mw, Math.PI * 1.18, Math.PI * 1.82);
  } else if (E.mouth === 'half') {
    ctx.arc(64 + 4, mouthY - 3, mw * 0.7, Math.PI * 0.12, Math.PI * 0.6);
  } else if (E.mouth === 'o') {
    ctx.ellipse(64, mouthY, mw * 0.4, mw * 0.55, 0, 0, Math.PI * 2);
  } else if (E.mouth === 'grit') {
    ctx.moveTo(64 - mw, mouthY); ctx.lineTo(64 + mw, mouthY);
    ctx.moveTo(64 - mw * 0.6, mouthY - 3); ctx.lineTo(64 - mw * 0.6, mouthY + 3);
    ctx.moveTo(64, mouthY - 3); ctx.lineTo(64, mouthY + 3);
    ctx.moveTo(64 + mw * 0.6, mouthY - 3); ctx.lineTo(64 + mw * 0.6, mouthY + 3);
  } else if (E.mouth === 'grin') {
    ctx.arc(64, mouthY - 4, mw, Math.PI * 0.15, Math.PI * 0.85);
  }
  ctx.stroke();
  if (E.mouth === 'grin') {
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.arc(64, mouthY - 4, mw * 0.85, Math.PI * 0.2, Math.PI * 0.8);
    ctx.fill();
  }

  // Wrinkles for the seasoned (scary chars + anyone with gray/white hair)
  if (tone === 'scary' || hairC >= 0x999999) {
    ctx.strokeStyle = `rgba(0,0,0,0.12)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(48, 30); ctx.quadraticCurveTo(64, 26, 80, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(26, 70); ctx.lineTo(32, 80); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(102, 70); ctx.lineTo(96, 80); ctx.stroke();
  }

  // Beard / stubble painted straight onto the texture
  if (config.beard) {
    ctx.fillStyle = hex(config.beardColor || hairC);
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(26, 84);
    ctx.quadraticCurveTo(30, 122, 64, 126);
    ctx.quadraticCurveTo(98, 122, 102, 84);
    ctx.quadraticCurveTo(92, 96, 64, 100);
    ctx.quadraticCurveTo(36, 96, 26, 84);
    ctx.closePath();
    ctx.fill();
    // Moustache
    ctx.fillRect(48, 82, 32, 6);
    ctx.globalAlpha = 1;
    // Re-stroke the mouth over the beard
    ctx.strokeStyle = '#2a1a14';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(64 - mw * 0.6, mouthY); ctx.lineTo(64 + mw * 0.6, mouthY);
    ctx.stroke();
  }

  // PS1 grain: light dither noise
  const noise = ctx.getImageData(0, 0, SIZE, SIZE);
  for (let i = 0; i < noise.data.length; i += 4) {
    const n = ((i / 4) * 2654435761 % 255) / 255; // deterministic hash noise
    const d = (n - 0.5) * 8;
    noise.data[i] += d; noise.data[i + 1] += d; noise.data[i + 2] += d;
  }
  ctx.putImageData(noise, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;   // the PS1 crunch
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  cache[key] = tex;
  return tex;
}

// All expressions for a character, pre-painted (texture-swap expressions)
export function paintFaceSet(config) {
  if (typeof document === 'undefined') return {};
  const set = {};
  for (const e of EXPRESSIONS) set[e] = paintFace(config, e);
  return set;
}
