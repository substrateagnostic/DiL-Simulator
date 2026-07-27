import * as THREE from 'three';

// FacePainter v5 — hand-painted-miniature portraits (ported from the
// approved proto_chars prototype, with the director's reworks).
//
// The face is a high-res canvas texture mapped onto a CURVED face patch on
// the sculpted head (CharacterBuilder v5). Every 512² (combat) / 256²
// (rooms) tile IS the front-of-head skin: the whole canvas is filled with
// the base skin tone and features are painted as centered overlays that
// fade out before the border, then an alpha-feather oval mask dissolves the
// patch edge into the head skin (kills the jaw/patch seam on all skin tones).
//
// Reworks over the prototype:
//  - DOUBLED feature contrast + size so faces read at real game camera
//    distances (combat close-up AND ortho room zoom), not just the
//    prototype's product-shot stage.
//  - All SIX expressions (neutral/angry/smug/worried/hurt/victory), where
//    the prototype only had neutral. Brows, lids, eye openness and mouth
//    are driven per-expression; the portrait base is shared.
//  - LinearFilter (no PS1 crunch), anisotropy, sRGB.
//  - Headless guard preserved (data validator builds under Node).
//
// Exports (unchanged module surface):
//   paintFace(config, expression='neutral', size=512) -> THREE.CanvasTexture|null
//   paintFaceSet(config, size=512) -> { neutral, angry, smug, worried, hurt, victory }

const EXPRESSIONS = ['neutral', 'angry', 'smug', 'worried', 'hurt', 'victory'];
const cache = {};

// ── small color helpers ──────────────────────────────────────────────
function shadeHex(c, f) {
  const r = Math.min(255, Math.max(0, Math.round(((c >> 16) & 255) * f)));
  const g = Math.min(255, Math.max(0, Math.round(((c >> 8) & 255) * f)));
  const b = Math.min(255, Math.max(0, Math.round((c & 255) * f)));
  return `rgb(${r},${g},${b})`;
}
function rgba(c, a) {
  return `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
}

// ── per-expression feature descriptors ────────────────────────────────
// Values are deltas layered on the neutral portrait. Tuned for the DOUBLED
// contrast/size mandate: brows and lids are heavier, mouths more shaped.
//   browInner/browOuter : vertical px offset of the inner/outer brow end
//                         (negative = raised)
//   lid                 : upper-lid drop as a fraction of eye height
//                         (0 = wide open, 1 = shut)
//   openY               : vertical iris/eye scale (1 = neutral)
//   mouth               : 'flat'|'press'|'frown'|'smirk'|'open'|'grit'|'grin'
//   mouthCurve          : extra px the mouth corners rise(+)/fall(-)
function exprParams(expression) {
  switch (expression) {
    case 'angry':
      // Eyes GLARE open (was lid 0.34 — it shut the eyes into a dark bar at
      // combat distance). A low, furrowed brow + open eye reads as anger and
      // keeps the bright sclera visible so the face doesn't go to a black band.
      return { browInner: 15, browOuter: -6, lid: 0.08, openY: 1.04, mouth: 'frown', mouthCurve: -6, furrow: true };
    case 'smug':
      return { browInner: -6, browOuter: -14, lid: 0.14, openY: 0.98, mouth: 'smirk', mouthCurve: 4, asym: 1 };
    case 'worried':
      return { browInner: -18, browOuter: 6, lid: -0.06, openY: 1.16, mouth: 'open', mouthCurve: -3, small: true };
    case 'hurt':
      return { browInner: 10, browOuter: 8, lid: 0.82, openY: 0.4, mouth: 'grit', mouthCurve: -2 };
    case 'victory':
      return { browInner: -12, browOuter: -6, lid: -0.04, openY: 1.06, mouth: 'grin', mouthCurve: 8 };
    case 'neutral':
    default:
      return { browInner: 0, browOuter: 0, lid: 0.0, openY: 1.05, mouth: 'neutral', mouthCurve: 0 };
  }
}

export function paintFace(config, expression = 'neutral', size = 512) {
  // Headless guard: the data validator builds characters under Node, where
  // there is no canvas. Models render faceless there — nobody is looking.
  if (typeof document === 'undefined') return null;

  const id = config.faceCacheKey || config.name || 'anon';
  const key = `${id}_${expression}_${size}`;
  if (cache[key]) return cache[key];

  const S = size;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');

  const skin = config.skinColor ?? 0xe8b48f;
  const hairC = config.hairColor ?? 0x3a2a1c;
  const eyeC = config.eyeColor ?? 0x5a3a24;
  // gender/age dials: prefer explicit fields, else infer from legacy config.
  const female = config.gender === 'f' || config.faceGender === 'f';
  const old = config.age === 'old' || config.faceAge === 'old';
  const lipC = config.lipColor ?? (female ? 0xb5615a : 0xb06a58);
  const E = exprParams(expression);

  // Layout in fractions of S (prototype was authored at 512).
  const cx = S * 0.5;
  // Features are placed LOW on the tile: the curved patch maps texture-V
  // linearly to polar angle, so mid-tile lands near the head's equator
  // (cheekbone level). Pushing eyes→mouth down to ~0.50–0.78 seats them on
  // the front of the face and kills the long blank "muzzle" chin the higher
  // layout produced (and reads correctly under the up-looking combat cam).
  // eyeY pushed DOWN toward the head's equator so the eyes face the below-
  // looking combat camera instead of tilting up over the brow — that up-tilt
  // was the "dark eye band" (the sclera pointed away from the lens).
  const eyeY = S * 0.534;
  const eyeDX = S * 0.152;        // eye separation from center (addendum: +size)
  // Addendum round-2 (a): features vanished at the ACTUAL combat framing (noses
  // and mouths gone; Chad/Intern eyes pupil-less; Grandma's smudged). Another
  // ~+35% on eyes/mouth on top of the earlier doubles, iris enlarged so it reads
  // as an iris (not sleepy sclera), line weights +40% again, sockets darkened.
  const eyeW = S * 0.156;
  const eyeH = S * 0.100 * E.openY;
  const browY = S * 0.452;
  const noseTipY = S * 0.676;
  const mouthY = S * 0.792;

  // ── base skin: FLAT fill at exactly skin so the feathered patch edge
  // blends seamlessly into the head skin. Shaping is centered overlays that
  // fade before the border (no edge mismatch = no seam). ───────────────
  ctx.fillStyle = shadeHex(skin, 1.0);
  ctx.fillRect(0, 0, S, S);
  // The head is a real lit egg — heavy PAINTED shading double-shades against
  // the 3D lighting and reads as a mask on a lighter chin. Keep the texture
  // nearly FLAT (subtle only) and let the geometry lighting carry the form.
  {
    const g = ctx.createLinearGradient(0, S * 0.23, 0, S * 0.9);
    g.addColorStop(0, rgba(0xffffff, 0.04));
    g.addColorStop(0.5, rgba(0, 0));
    g.addColorStop(1, rgba(0x2a1810, 0.06));      // whisper of jaw shade
    ctx.fillStyle = g;
    ctx.fillRect(0, S * 0.23, S, S * 0.67);
  }

  // temple / side shading — very light, just to seat the eye region
  for (const sx of [S * 0.14, S - S * 0.14]) {
    const tg = ctx.createRadialGradient(sx, S * 0.52, S * 0.04, sx, S * 0.52, S * 0.3);
    tg.addColorStop(0, rgba(0x1a0f08, 0.12));
    tg.addColorStop(1, rgba(0, 0));
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, S, S);
  }

  // cheek warmth / blush
  for (const sx of [cx - S * 0.176, cx + S * 0.176]) {
    const cg = ctx.createRadialGradient(sx, S * 0.63, S * 0.016, sx, S * 0.63, S * 0.14);
    cg.addColorStop(0, rgba(female ? 0xd06860 : 0xc07858, female ? 0.24 : 0.16));
    cg.addColorStop(1, rgba(0, 0));
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, S, S);
  }

  // ── eye sockets: soft shadow above the eyes (upper-lid crease, not a
  // bruise — kept restrained so the eye itself reads bright and open) ───
  for (const s of [-1, 1]) {
    const ex = cx + s * eyeDX;
    const sg = ctx.createRadialGradient(ex, eyeY - S * 0.032, S * 0.012, ex, eyeY - S * 0.02, S * 0.10);
    // Darker lid/socket accent (addendum: darken lid/socket accents) so the eye
    // sits in a defined socket and reads at range — but kept off the eye itself
    // (the shadow is ABOVE the lash line) so the sclera stays bright.
    sg.addColorStop(0, rgba(0x241009, 0.30));
    sg.addColorStop(0.6, rgba(0x241009, 0.14));
    sg.addColorStop(1, rgba(0, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(ex - S * 0.13, eyeY - S * 0.14, S * 0.26, S * 0.17);
  }

  // ── eyes ── (lid drop is expression-driven)
  const lidDrop = eyeH * 2 * E.lid;   // px the upper lid covers
  function eye(s) {
    const ex = cx + s * eyeDX;
    ctx.save();
    // eye opening clip (almond), reduced from the top by lidDrop
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    // sclera (bright, so the eye reads open — not a dark beady dot)
    const wg = ctx.createLinearGradient(0, eyeY - eyeH, 0, eyeY + eyeH);
    wg.addColorStop(0, '#e6e0d6');
    wg.addColorStop(0.5, '#fbf8f2');
    wg.addColorStop(1, '#efe9de');
    ctx.fillStyle = wg;
    ctx.fillRect(ex - eyeW, eyeY - eyeH, eyeW * 2, eyeH * 2);
    // iris — ENLARGED (0.56→0.74 of eyeH) with a dark limbal ring and a clear
    // pupil, so at combat framing the eye reads as an iris with intent rather
    // than blank sclera + lid line (the Chad/Intern "pupil-less, sleepy-dead"
    // note). The bright sclera still frames it left/right.
    const irisR = eyeH * 0.76;
    const iy = eyeY + eyeH * 0.04;
    const ig = ctx.createRadialGradient(ex, iy, irisR * 0.15, ex, iy, irisR);
    ig.addColorStop(0, shadeHex(eyeC, 1.45));
    ig.addColorStop(0.55, shadeHex(eyeC, 1.0));
    ig.addColorStop(0.86, shadeHex(eyeC, 0.5));
    ig.addColorStop(1, shadeHex(eyeC, 0.28));   // dark limbal ring — defines the iris edge
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(ex, iy, irisR, 0, Math.PI * 2); ctx.fill();
    // pupil (larger, jet black)
    ctx.fillStyle = '#080604';
    ctx.beginPath(); ctx.arc(ex, iy, irisR * 0.5, 0, Math.PI * 2); ctx.fill();
    // catchlight — bigger bright bead top-inner so the eye reads glossy/alive
    ctx.fillStyle = 'rgba(255,255,255,0.99)';
    ctx.beginPath(); ctx.arc(ex - irisR * 0.3, iy - irisR * 0.36, irisR * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.arc(ex + irisR * 0.36, iy + irisR * 0.38, irisR * 0.15, 0, Math.PI * 2); ctx.fill();
    // upper lid drop (lowered eyelid skin over the eye)
    if (lidDrop > 0.5) {
      ctx.fillStyle = shadeHex(skin, 0.9);
      ctx.fillRect(ex - eyeW - 2, eyeY - eyeH - 2, eyeW * 2 + 4, lidDrop + eyeH);
    }
    ctx.restore();

    // upper lid line + lash — THICK and dark (addendum: +40% line weight)
    ctx.strokeStyle = rgba(0x120a05, 0.96);
    ctx.lineWidth = (female ? 0.020 : 0.016) * S;
    ctx.lineCap = 'round';
    const lidY = eyeY - eyeH + lidDrop;
    ctx.beginPath();
    ctx.moveTo(ex - eyeW - 2, lidY - eyeH * 0.05);
    ctx.quadraticCurveTo(ex, lidY - eyeH * 0.7, ex + eyeW + 2, lidY - eyeH * 0.1);
    ctx.stroke();
    // lower lid (subtle)
    ctx.strokeStyle = rgba(0x3a241a, 0.42);
    ctx.lineWidth = 0.006 * S;
    ctx.beginPath();
    ctx.moveTo(ex - eyeW + 2, eyeY + eyeH - 2);
    ctx.quadraticCurveTo(ex, eyeY + eyeH + eyeH * 0.3, ex + eyeW - 2, eyeY + eyeH - 3);
    ctx.stroke();
    // outer corner darkening
    ctx.strokeStyle = rgba(0x100906, 0.55);
    ctx.lineWidth = 0.008 * S;
    ctx.beginPath();
    ctx.moveTo(ex + s * (eyeW - 4), eyeY - eyeH * 0.2);
    ctx.lineTo(ex + s * (eyeW + S * 0.02), eyeY + eyeH * 0.1);
    ctx.stroke();
  }
  eye(-1); eye(1);

  // ── brows ── (heavier; expression sets inner/outer height + angle)
  const browBase = shadeHex(hairC, old ? 1.35 : 0.8);
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const bx = cx + s * eyeDX;
    // asym expressions (smug) raise one brow only
    const inner = E.browInner * (E.asym ? (s === E.asym ? 1.4 : 0.3) : 1);
    const outer = E.browOuter * (E.asym ? (s === E.asym ? 1.4 : 0.3) : 1);
    ctx.strokeStyle = browBase;
    ctx.lineWidth = (female ? 0.031 : 0.040) * S;   // addendum round-2: +40% again
    ctx.beginPath();
    // inner end is toward center (+s* -small), outer end away
    ctx.moveTo(bx - s * S * 0.066, browY + outer);
    ctx.quadraticCurveTo(bx - s * S * 0.006, browY - S * 0.018 + (inner + outer) * 0.5, bx + s * S * 0.058, browY + inner);
    ctx.stroke();
    // strand hints
    ctx.lineWidth = 0.004 * S;
    ctx.strokeStyle = shadeHex(hairC, 0.68);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(bx + i * S * 0.023, browY + S * 0.015 + (i < 0 ? outer : inner) * 0.5);
      ctx.lineTo(bx + i * S * 0.023 + s * S * 0.008, browY - S * 0.006 + (i < 0 ? outer : inner) * 0.5);
      ctx.stroke();
    }
  }
  // angry forehead furrow between the brows
  if (E.furrow) {
    ctx.strokeStyle = rgba(0x2a1810, 0.4);
    ctx.lineWidth = 0.008 * S;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * S * 0.02, browY - S * 0.01);
      ctx.lineTo(cx + s * S * 0.028, browY + S * 0.05);
      ctx.stroke();
    }
  }

  // ── nose: bridge highlight + side shadows + nostrils + tip light ──────
  const ng = ctx.createLinearGradient(cx - S * 0.05, 0, cx + S * 0.05, 0);
  ng.addColorStop(0, rgba(0x2a1810, 0.0));
  ng.addColorStop(0.34, rgba(0x2a1810, 0.22));
  ng.addColorStop(0.5, rgba(0xffffff, 0.09));
  ng.addColorStop(0.66, rgba(0x2a1810, 0.22));
  ng.addColorStop(1, rgba(0x2a1810, 0.0));
  ctx.fillStyle = ng;
  ctx.fillRect(cx - S * 0.058, browY + S * 0.012, S * 0.116, noseTipY - browY - S * 0.008);
  // under-nose / tip shadow — deeper + wider so the nose reads as a form at
  // combat range (addendum: noses vanish at real framing)
  const us = ctx.createRadialGradient(cx, noseTipY, S * 0.008, cx, noseTipY, S * 0.074);
  us.addColorStop(0, rgba(0x241009, 0.42));
  us.addColorStop(1, rgba(0, 0));
  ctx.fillStyle = us;
  ctx.fillRect(cx - S * 0.088, noseTipY - S * 0.045, S * 0.176, S * 0.108);
  // nostrils — bigger, darker
  ctx.fillStyle = rgba(0x140a05, 0.58);
  ctx.beginPath(); ctx.ellipse(cx - S * 0.03, noseTipY + S * 0.004, S * 0.014, S * 0.009, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + S * 0.03, noseTipY + S * 0.004, S * 0.014, S * 0.009, -0.3, 0, Math.PI * 2); ctx.fill();
  // tip highlight
  ctx.fillStyle = rgba(0xffffff, 0.12);
  ctx.beginPath(); ctx.arc(cx, noseTipY - S * 0.012, S * 0.016, 0, Math.PI * 2); ctx.fill();

  // ── mouth ── (expression-driven; more saturated lips = contrast)
  drawMouth(ctx, S, cx, noseTipY, mouthY, lipC, female, E);

  // ── age: wrinkles / softening ─────────────────────────────────────
  if (old) {
    ctx.strokeStyle = rgba(0x6a4a38, 0.32);
    ctx.lineWidth = 0.0032 * S;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - S * 0.156, S * 0.293 + i * S * 0.027);
      ctx.quadraticCurveTo(cx, S * 0.277 + i * S * 0.027, cx + S * 0.156, S * 0.293 + i * S * 0.027);
      ctx.stroke();
    }
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * S * 0.051, noseTipY - S * 0.008);
      ctx.quadraticCurveTo(cx + s * S * 0.105, mouthY - S * 0.035, cx + s * S * 0.09, mouthY + S * 0.023);
      ctx.stroke();
    }
    for (const s of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + s * (eyeW + eyeDX - S * 0.012), eyeY - S * 0.012 + i * S * 0.016);
        ctx.lineTo(cx + s * (eyeW + eyeDX + S * 0.031), eyeY - S * 0.023 + i * S * 0.02);
        ctx.stroke();
      }
    }
  }

  // ── stubble / beard ──────────────────────────────────────────────
  if (config.beard === 'stubble' || (config.beard === true && config.beardStyle === 'stubble')) {
    const bc = config.beardColor ?? hairC;
    const spots = [[cx, S * 0.82, S * 0.117], [cx - S * 0.102, S * 0.781, S * 0.082],
      [cx + S * 0.102, S * 0.781, S * 0.082], [cx - S * 0.152, S * 0.695, S * 0.066],
      [cx + S * 0.152, S * 0.695, S * 0.066]];
    for (const [sx, sy, sr] of spots) {
      const bg = ctx.createRadialGradient(sx, sy, 2, sx, sy, sr);
      bg.addColorStop(0, rgba(bc, 0.2));
      bg.addColorStop(1, rgba(bc, 0));
      ctx.fillStyle = bg;
      ctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2);
    }
  } else if (config.beard) {
    ctx.fillStyle = rgba(config.beardColor ?? hairC, 0.88);
    ctx.beginPath();
    ctx.moveTo(cx - S * 0.172, S * 0.637);
    ctx.quadraticCurveTo(cx - S * 0.176, S * 0.816, cx, S * 0.875);
    ctx.quadraticCurveTo(cx + S * 0.176, S * 0.816, cx + S * 0.172, S * 0.637);
    ctx.quadraticCurveTo(cx + S * 0.086, S * 0.727, cx, S * 0.738);
    ctx.quadraticCurveTo(cx - S * 0.086, S * 0.727, cx - S * 0.172, S * 0.637);
    ctx.fill();
  }

  // ── skin micro-noise so skin isn't a plastic slab ────────────────
  // A 2D value hash (not the old index-stride hash, which laid down a regular
  // scanline pattern the head beneath didn't have — the addendum's "UV
  // striping" note). Lower amplitude, truly per-pixel.
  {
    const nd = ctx.getImageData(0, 0, S, S);
    const d = nd.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) continue;
      const px = (i >> 2) % S, py = (i >> 2) / S;
      const h = Math.sin(px * 12.9898 + py * 78.233) * 43758.5453;
      const a = ((h - Math.floor(h)) - 0.5) * 2.4;   // gentler (was 4) — clean Clair-Obscur skin at 4× close-up
      d[i] += a; d[i + 1] += a; d[i + 2] += a;
    }
    ctx.putImageData(nd, 0, 0);
  }

  // ── edge feather: mask the texture to a soft oval that fades to FULLY
  // transparent BEFORE every geometry edge — so the visible boundary is always
  // the soft feather, never the patch rim. The old mask left the bottom rim
  // ~65% opaque, which is exactly the shield-shaped seam / jaw goatee-shadow
  // the addendum called out. The vertical squash pulls the fade in above and
  // below so the chin AND hairline edges dissolve into the head skin. ──
  ctx.globalCompositeOperation = 'destination-in';
  const mCx = cx, mCy = S * 0.56;
  // Wider feather (fade begins at 0.46 of the radius, was 0.60) so the forehead
  // and chin edges dissolve into the head skin over a longer ramp — kills the
  // "straight hard line slicing the forehead" patch seam (addendum, Grandma).
  const mask = ctx.createRadialGradient(mCx, mCy, S * 0.28, mCx, mCy, S * 0.46);
  mask.addColorStop(0, 'rgba(255,255,255,1)');
  mask.addColorStop(0.46, 'rgba(255,255,255,1)');
  mask.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = mask;
  ctx.save();
  ctx.translate(mCx, mCy);
  ctx.scale(1.02, 0.95);
  ctx.translate(-mCx, -mCy);
  ctx.fillRect(0, 0, S, S);
  ctx.restore();
  ctx.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  cache[key] = tex;
  return tex;
}

// ── mouth shapes ──────────────────────────────────────────────────────
function drawMouth(ctx, S, cx, noseTipY, mouthY, lipC, female, E) {
  const mw = (female ? 0.106 : 0.098) * S;   // addendum round-2: +size again (mouths vanished at real framing)
  const curve = E.mouthCurve * (S / 512);
  // philtrum shadow above the lip
  ctx.fillStyle = rgba(0x2a1810, 0.07);
  ctx.fillRect(cx - S * 0.012, noseTipY + S * 0.012, S * 0.024, mouthY - noseTipY - S * 0.016);

  const upperA = female ? 0.86 : 0.5;
  const lowerA = female ? 0.9 : 0.55;

  if (E.mouth === 'grin' || E.mouth === 'open') {
    // open mouth: dark cavity + teeth + lips around it
    const open = E.mouth === 'grin' ? S * 0.05 : S * 0.032;
    const w = E.small ? mw * 0.55 : mw;
    ctx.fillStyle = '#3a1418';
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + open * 0.2, w, open, 0, 0, Math.PI * 2);
    ctx.fill();
    // upper teeth
    ctx.fillStyle = '#f3efe6';
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.9, mouthY + open * 0.2 - open * 0.7);
    ctx.quadraticCurveTo(cx, mouthY + open * 0.2 - open * 0.95, cx + w * 0.9, mouthY + open * 0.2 - open * 0.7);
    ctx.quadraticCurveTo(cx, mouthY + open * 0.2 - open * 0.2, cx - w * 0.9, mouthY + open * 0.2 - open * 0.7);
    ctx.fill();
    // lip outline
    ctx.strokeStyle = rgba(lipC, 0.85);
    ctx.lineWidth = 0.012 * S;
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + open * 0.2, w, open, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (E.mouth === 'grit') {
    // gritted teeth: a wide flat band of teeth with vertical divisions
    ctx.fillStyle = '#efeae0';
    ctx.fillRect(cx - mw * 0.9, mouthY - S * 0.018, mw * 1.8, S * 0.036);
    ctx.strokeStyle = rgba(0x2a1010, 0.5);
    ctx.lineWidth = 0.004 * S;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * mw * 0.28, mouthY - S * 0.018);
      ctx.lineTo(cx + i * mw * 0.28, mouthY + S * 0.018);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(0x3a1a14, 0.8);
    ctx.lineWidth = 0.008 * S;
    ctx.strokeRect(cx - mw * 0.9, mouthY - S * 0.018, mw * 1.8, S * 0.036);
    return;
  }

  // closed-lip mouths (neutral / press / frown / smirk): a shaped lip pair.
  const asymL = E.mouth === 'smirk' ? curve : 0;
  const asymR = E.mouth === 'smirk' ? -curve * 0.4 : 0;
  // upper lip
  ctx.fillStyle = rgba(lipC, upperA);
  ctx.beginPath();
  ctx.moveTo(cx - mw, mouthY - 1 + asymL);
  ctx.quadraticCurveTo(cx - mw * 0.45, mouthY - S * 0.012, cx - 3, mouthY - S * 0.006);
  ctx.quadraticCurveTo(cx, mouthY - S * 0.01, cx + 3, mouthY - S * 0.006);
  ctx.quadraticCurveTo(cx + mw * 0.45, mouthY - S * 0.012, cx + mw, mouthY - 1 + asymR);
  ctx.quadraticCurveTo(cx, mouthY - 1, cx - mw, mouthY - 1 + asymL);
  ctx.fill();
  // lower lip
  ctx.fillStyle = rgba(lipC, lowerA);
  const drop = (E.mouth === 'press') ? S * 0.01 : (female ? S * 0.022 : S * 0.016);
  ctx.beginPath();
  ctx.moveTo(cx - mw + 5, mouthY + asymL);
  ctx.quadraticCurveTo(cx, mouthY + drop, cx + mw - 5, mouthY + asymR);
  ctx.quadraticCurveTo(cx, mouthY + S * 0.004, cx - mw + 5, mouthY + asymL);
  ctx.fill();
  // lip seam (curved per expression) — heavier + darker so the closed mouth
  // reads at combat range on men too (addendum: mouths vanish at real framing)
  ctx.strokeStyle = rgba(0x3a1c16, 0.82);
  ctx.lineWidth = 0.009 * S;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - mw, mouthY - 0.5 + asymL);
  ctx.quadraticCurveTo(cx, mouthY + 0.5 + curve, cx + mw, mouthY - 0.5 + asymR);
  ctx.stroke();
  // lower-lip highlight
  ctx.fillStyle = rgba(0xffffff, female ? 0.26 : 0.14);
  ctx.beginPath();
  ctx.ellipse(cx, mouthY + drop * 0.55, mw * 0.4, (female ? S * 0.006 : S * 0.0045), 0, 0, Math.PI * 2);
  ctx.fill();
}

// All expressions for a character, pre-painted (texture-swap expressions).
export function paintFaceSet(config, size = 512) {
  if (typeof document === 'undefined') return {};
  const set = {};
  for (const e of EXPRESSIONS) set[e] = paintFace(config, e, size);
  return set;
}
