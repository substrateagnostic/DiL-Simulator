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
      // v6 — the hurt beat was the last true horror face: lid 0.82 shut the eyes
      // to a black blindfold band and openY 0.4 crushed the iris. Eyes now stay
      // HALF-open (lid 0.48) with a readable iris (openY 0.6) so a wince reads as
      // pain, not a wraith. Tooth reveal is capped in drawMouth's 'grit'.
      return { browInner: 10, browOuter: 8, lid: 0.48, openY: 0.6, mouth: 'grit', mouthCurve: -2 };
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
  // Glasses-wearers need brighter eyes so the sclera/iris/catchlight read THROUGH
  // the torus lens under the dark venue wash (item 2 — Grandma's grey slits,
  // the Intern's lid-smears). Detected from config.glasses OR an accessories
  // entry whose name mentions glass ('glasses'/'sunglasses').
  const hasGlasses = !!config.glasses ||
    (Array.isArray(config.accessories) && config.accessories.some(
      (a) => typeof a === 'string' && /glass/i.test(a)));
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
  // v6 LAW 3 — PLEASANT NEUTRAL. The v5 eye was a TALL (0.118r) full-face-wide
  // (0.160r) dark oval — the exact "scrunched / bug-eyed / scary" read. v6 lays
  // an OPEN ALMOND: modest width, WIDER than tall (human), properly spaced at
  // ~one eye-width inter-gap (pupils ~2 eye-widths apart), bright sclera + clear
  // iris + a guaranteed catchlight. Small clean beats big and dark.
  const eyeY = S * 0.520;
  const eyeDX = S * 0.176;        // pupil ≈ 2 eye-widths apart, gap ≈ one eye-width
  const eyeW = S * 0.100;         // half-width (full eye ≈ 0.20S)
  const eyeH = S * 0.058 * E.openY; // half-height < half-width → relaxed almond
  const browY = S * 0.430;
  const noseTipY = S * 0.680;
  // Mouth dropped ~15% lower toward the jaw (item 5: "flat line floating high
  // above an enormous blank chin"). Seats the mouth on the lower face so the
  // jaw region reads as anatomy, not Easter Island.
  // Old faces seat the mouth notably higher, close to the nose base: grandma's
  // lower face foreshortens hard on the up-looking combat cam and falls into
  // shadow, so a mouth at the full drop (0.756) landed in a dark, curved-away
  // band and read as a blank chin (cast bug). Pulling it up to just under the
  // nose puts it on the brightly-lit, camera-facing front of the face where it
  // survives the squash.
  const mouthY = S * (old ? 0.836 : 0.808);

  // ── base skin: FLAT fill at exactly skin so the feathered patch edge
  // blends seamlessly into the head skin. Shaping is centered overlays that
  // fade before the border (no edge mismatch = no seam). ───────────────
  // v6 LAW 3/5 — base skin fills a HAIR brighter + warmer so the face reads as
  // the best-lit surface even in the dark arena (the matte skin material no
  // longer adds a plastic sheen to compensate). Shading stays nearly flat — the
  // lit egg geometry carries the form; painted shadow only whispers.
  ctx.fillStyle = shadeHex(skin, 1.06);
  ctx.fillRect(0, 0, S, S);
  {
    const g = ctx.createLinearGradient(0, S * 0.23, 0, S * 0.9);
    g.addColorStop(0, rgba(0xfff2e2, 0.07));      // warm forehead light
    g.addColorStop(0.5, rgba(0, 0));
    g.addColorStop(1, rgba(0x2a1810, 0.05));      // faint whisper of jaw shade
    ctx.fillStyle = g;
    ctx.fillRect(0, S * 0.23, S, S * 0.67);
  }

  // temple / side shading — barely there, just to seat the eye region (v6:
  // halved so the face doesn't gain dark hollows that read as a gaunt scowl)
  for (const sx of [S * 0.14, S - S * 0.14]) {
    const tg = ctx.createRadialGradient(sx, S * 0.52, S * 0.04, sx, S * 0.52, S * 0.3);
    tg.addColorStop(0, rgba(0x1a0f08, 0.06));
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
    const sg = ctx.createRadialGradient(ex, eyeY - S * 0.026, S * 0.010, ex, eyeY - S * 0.016, S * 0.075);
    // v6 — the socket shadow is the #1 "scary" culprit: it merged with the lash
    // and iris into a bruised dark slit. Cut to a whisper (0.20→0.08) — just
    // enough to seat the eye, never a hollow.
    sg.addColorStop(0, rgba(0x2a1810, 0.08));
    sg.addColorStop(0.6, rgba(0x2a1810, 0.03));
    sg.addColorStop(1, rgba(0, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(ex - S * 0.11, eyeY - S * 0.11, S * 0.22, S * 0.13);
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
    // sclera (bright, so the eye reads open — not a dark beady dot). Glasses-
    // wearers get a whiter sclera so the eye survives the lens tint + dark wash.
    const wg = ctx.createLinearGradient(0, eyeY - eyeH, 0, eyeY + eyeH);
    if (hasGlasses) {
      wg.addColorStop(0, '#f0ece4');
      wg.addColorStop(0.5, '#ffffff');
      wg.addColorStop(1, '#f6f1e8');
    } else {
      wg.addColorStop(0, '#e6e0d6');
      wg.addColorStop(0.5, '#fbf8f2');
      wg.addColorStop(1, '#efe9de');
    }
    ctx.fillStyle = wg;
    ctx.fillRect(ex - eyeW, eyeY - eyeH, eyeW * 2, eyeH * 2);
    // iris — fills most of the (now shorter, almond) eye height so it reads as a
    // real iris, not a beady dot, while bright sclera still frames it left/right.
    const irisR = eyeH * 0.92;
    const iy = eyeY + eyeH * 0.02;
    const ig = ctx.createRadialGradient(ex, iy, irisR * 0.15, ex, iy, irisR);
    // Glasses-wearers get a lighter iris so it never reads as a dark blob behind
    // the lens; the limbal ring stays dark so the iris edge is still defined.
    const gf = hasGlasses ? 1.34 : 1.0;
    ig.addColorStop(0, shadeHex(eyeC, 1.5 * gf));
    ig.addColorStop(0.55, shadeHex(eyeC, 1.0 * gf));
    ig.addColorStop(0.86, shadeHex(eyeC, 0.48 * gf));
    ig.addColorStop(1, shadeHex(eyeC, 0.26));   // dark limbal ring — defines the iris edge
    ctx.fillStyle = ig;
    ctx.beginPath(); ctx.arc(ex, iy, irisR, 0, Math.PI * 2); ctx.fill();
    // pupil (jet black, sized so a rim of iris colour still shows)
    ctx.fillStyle = '#070503';
    ctx.beginPath(); ctx.arc(ex, iy, irisR * 0.46, 0, Math.PI * 2); ctx.fill();
    // catchlight — a big pure-white bead top-inner, GUARANTEED to survive at
    // fight framing (item 4). Its centre sits on the pupil/iris boundary so it
    // punches against the black. A tiny secondary sparkle keeps it from reading
    // as a painted dot.
    ctx.fillStyle = 'rgba(255,255,255,1)';
    // Bigger catchlight for glasses-wearers — a punchy bead that still reads as
    // a live eye once the tinted lens sits over it.
    ctx.beginPath(); ctx.arc(ex - irisR * 0.26, iy - irisR * 0.34, irisR * (hasGlasses ? 0.50 : 0.40), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(ex + irisR * 0.4, iy + irisR * 0.42, irisR * 0.16, 0, Math.PI * 2); ctx.fill();
    // upper lid drop (lowered eyelid skin over the eye)
    if (lidDrop > 0.5) {
      ctx.fillStyle = shadeHex(skin, 0.9);
      ctx.fillRect(ex - eyeW - 2, eyeY - eyeH - 2, eyeW * 2 + 4, lidDrop + eyeH);
    }
    ctx.restore();

    // upper lid line + lash — dark and legible, but thinned slightly (0.016→0.014
    // men) and raised so it frames the eye rather than pressing it half-shut into
    // a "sleepy" slit (item 4: eyes read OPEN and alert at distance).
    ctx.strokeStyle = rgba(0x120a05, 0.96);
    ctx.lineWidth = (female ? 0.018 : 0.014) * S;
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
    // outer corner — a soft, level tuck (v6: was a heavy 0.55 down-stroke that
    // pulled the eye into an angry downturn on the neutral). Light + short.
    ctx.strokeStyle = rgba(0x2a1810, 0.24);
    ctx.lineWidth = 0.005 * S;
    ctx.beginPath();
    ctx.moveTo(ex + s * (eyeW - 4), eyeY - eyeH * 0.05);
    ctx.lineTo(ex + s * (eyeW + S * 0.012), eyeY + eyeH * 0.02);
    ctx.stroke();
  }
  eye(-1); eye(1);

  // ── brows ── (heavier; expression sets inner/outer height + angle)
  // Old brows are soft grey, NOT clamped-white: hairC*1.35 on white hair blew
  // out to pure white (invisible), which left only the darker strand-hints
  // showing as disconnected specks floating over the lenses (item 3, Grandma).
  // A visible-but-soft grey base reads as a real elderly brow.
  // Brows must READ even on blonde/white hair (item: karen/chad "zero eyebrows").
  // Prefer an explicit config.browColor; else darken the hair toward a real brow
  // and floor pale hair's luminance so a platinum/blonde brow never washes to
  // invisible against the skin.
  const browBase = (() => {
    if (config.browColor != null) return rgba(config.browColor, 1);
    const f = old ? 0.72 : 0.55;
    let br = Math.round(((hairC >> 16) & 255) * f);
    let bg = Math.round(((hairC >> 8) & 255) * f);
    let bb = Math.round((hairC & 255) * f);
    const lum = 0.3 * br + 0.59 * bg + 0.11 * bb;
    if (!old && lum > 118) { br = 0x6a; bg = 0x4a; bb = 0x30; } // pale hair → legible mid-brown
    return `rgb(${br},${bg},${bb})`;
  })();
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    const bx = cx + s * eyeDX;
    // asym expressions (smug) raise one brow only
    const inner = E.browInner * (E.asym ? (s === E.asym ? 1.4 : 0.3) : 1);
    const outer = E.browOuter * (E.asym ? (s === E.asym ? 1.4 : 0.3) : 1);
    ctx.strokeStyle = browBase;
    ctx.lineWidth = (female ? 0.023 : 0.027) * S;   // relaxed but legible — a real brow, not a furrowed slab
    ctx.beginPath();
    // inner end is toward center (+s* -small), outer end away
    ctx.moveTo(bx - s * S * 0.066, browY + outer);
    ctx.quadraticCurveTo(bx - s * S * 0.006, browY - S * 0.018 + (inner + outer) * 0.5, bx + s * S * 0.058, browY + inner);
    ctx.stroke();
    // strand hints
    ctx.lineWidth = 0.004 * S;
    ctx.strokeStyle = shadeHex(hairC, old ? 0.95 : 0.68);   // faint on white brows (no dark specks)
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
  const us = ctx.createRadialGradient(cx, noseTipY, S * 0.008, cx, noseTipY, S * 0.066);
  us.addColorStop(0, rgba(0x2a1810, 0.22));
  us.addColorStop(1, rgba(0, 0));
  ctx.fillStyle = us;
  ctx.fillRect(cx - S * 0.08, noseTipY - S * 0.04, S * 0.16, S * 0.10);
  // nostrils — small + soft (v6: were bigger/darker blobs that read as a snout)
  ctx.fillStyle = rgba(0x241009, 0.30);
  ctx.beginPath(); ctx.ellipse(cx - S * 0.026, noseTipY + S * 0.004, S * 0.011, S * 0.0075, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + S * 0.026, noseTipY + S * 0.004, S * 0.011, S * 0.0075, -0.3, 0, Math.PI * 2); ctx.fill();
  // tip highlight
  ctx.fillStyle = rgba(0xffffff, 0.12);
  ctx.beginPath(); ctx.arc(cx, noseTipY - S * 0.012, S * 0.016, 0, Math.PI * 2); ctx.fill();

  // ── mouth ── (expression-driven; more saturated lips = contrast)
  drawMouth(ctx, S, cx, noseTipY, mouthY, lipC, female, E, old);

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
  const mCx = cx, mCy = S * 0.56;

  // ── patch-edge vignette: darken the patch toward its border so the rim's
  // luminance matches the skull curving away into shadow. Without it the flat-lit
  // patch stays brighter than the shaded head and the boundary reads as a decal
  // seam at the temples/hairline/jaw (item 6 — the Chad/Grandma "hard arc").
  // Composited BEFORE the alpha feather so it shades the same skin the feather
  // then dissolves. ───────────────────────────────────────────────────────
  {
    const eg = ctx.createRadialGradient(mCx, mCy, S * 0.24, mCx, mCy, S * 0.47);
    eg.addColorStop(0, rgba(0x1a0f08, 0));
    eg.addColorStop(0.74, rgba(0x1a0f08, 0));
    eg.addColorStop(1, rgba(0x140c06, 0.30));   // v6: lighter rim so the face doesn't gain a dark mask edge
    ctx.fillStyle = eg;
    ctx.save();
    ctx.translate(mCx, mCy); ctx.scale(1.04, 0.98); ctx.translate(-mCx, -mCy);
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
  }

  ctx.globalCompositeOperation = 'destination-in';
  // Wider, softer feather (opaque core 0.24, fade out to 0.50 — was 0.28→0.46)
  // so every geometry edge dissolves over a long ramp and the visible boundary
  // is always soft skin, never the patch rim (item 6, whole cast).
  const mask = ctx.createRadialGradient(mCx, mCy, S * 0.24, mCx, mCy, S * 0.50);
  mask.addColorStop(0, 'rgba(255,255,255,1)');
  mask.addColorStop(0.20, 'rgba(255,255,255,1)');
  mask.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = mask;
  ctx.save();
  ctx.translate(mCx, mCy);
  ctx.scale(1.02, 0.96);
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
function drawMouth(ctx, S, cx, noseTipY, mouthY, lipC, female, E, old = false) {
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
    // v6 — a WINCE, not a bared tooth-grid horror mask (item: andrew "cap the
    // tooth reveal"). A shorter, narrower clenched band with soft divisions and a
    // warm (not black) outline reads as a pained grimace without the skull grin.
    const bw = mw * 1.35, bh = S * 0.022;
    ctx.fillStyle = '#e8e2d6';
    ctx.fillRect(cx - bw * 0.5, mouthY - bh * 0.5, bw, bh);
    ctx.strokeStyle = rgba(0x4a2a1c, 0.32);
    ctx.lineWidth = 0.003 * S;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * bw * 0.2, mouthY - bh * 0.5);
      ctx.lineTo(cx + i * bw * 0.2, mouthY + bh * 0.5);
      ctx.stroke();
    }
    // lips framing the clench (warm), so it reads as a mouth, not a floating grid
    ctx.strokeStyle = rgba(lipC, 0.7);
    ctx.lineWidth = 0.007 * S;
    ctx.strokeRect(cx - bw * 0.5, mouthY - bh * 0.5, bw, bh);
    return;
  }

  // ── elderly closed mouth (item 1) ──────────────────────────────────
  // Grandma's lower face is severely foreshortened by the up-looking combat
  // camera: the whole lower-face texture (V≈0.5→0.9) compresses into a thin band
  // just under the glasses, so the normal subtle lip pair renders sub-pixel and
  // vanished to a blank peach field. The elderly mouth is therefore built with
  // real vertical MASS in near-black albedo — a dark, thin-lipped closed mouth
  // with corner darkening and a sub-lip shelf — so ~4× vertical squash still
  // leaves a legible mouth. (Non-old faces keep the softer lip pair below.)
  if (old) {
    const mwo = mw * 1.05;
    const dn = curve * 0.6;                         // faint downturn, expression-nudged
    // High-CONTRAST lit lip pair + a hard dark seam. A near-black dark-mass mouth
    // (the prior approach) vanished into grandma's shadowed, foreshortened lower
    // face — invisible albedo-dark on dark skin. A LIT lip (warm vermilion) framed
    // by a black seam keeps the mouth reading even when the chin falls into shadow.
    // upper lip
    ctx.fillStyle = rgba(lipC, 0.92);
    ctx.beginPath();
    ctx.moveTo(cx - mwo, mouthY - S * 0.002 + dn);
    ctx.quadraticCurveTo(cx - mwo * 0.45, mouthY - S * 0.017, cx, mouthY - S * 0.010);
    ctx.quadraticCurveTo(cx + mwo * 0.45, mouthY - S * 0.017, cx + mwo, mouthY - S * 0.002 + dn);
    ctx.quadraticCurveTo(cx, mouthY + S * 0.003, cx - mwo, mouthY - S * 0.002 + dn);
    ctx.fill();
    // lower lip — a lighter warm catch so the pair has volume
    ctx.fillStyle = rgba(lipC, 0.98);
    ctx.beginPath();
    ctx.moveTo(cx - mwo * 0.86, mouthY + S * 0.002 + dn);
    ctx.quadraticCurveTo(cx, mouthY + S * 0.026, cx + mwo * 0.86, mouthY + S * 0.002 + dn);
    ctx.quadraticCurveTo(cx, mouthY + S * 0.006, cx - mwo * 0.86, mouthY + S * 0.002 + dn);
    ctx.fill();
    // lower-lip specular sliver so it catches the front fill
    ctx.fillStyle = rgba(0xffd8c8, 0.5);
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + S * 0.012, mwo * 0.34, S * 0.006, 0, 0, Math.PI * 2);
    ctx.fill();
    // central seam — v6: softened from a near-black 0.98 gash to a warm brown
    // line so the elderly mouth reads gentle, not clamped grim.
    ctx.strokeStyle = rgba(0x5a2e26, 0.70);
    ctx.lineWidth = 0.011 * S;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - mwo, mouthY + dn);
    ctx.quadraticCurveTo(cx, mouthY + S * 0.004 + curve, cx + mwo, mouthY + dn);
    ctx.stroke();
    // corner accents — soft, just enough to give the mouth ends (v6: 0.9→0.45)
    for (const s of [-1, 1]) {
      const cxs = cx + s * mwo * 0.98;
      const cg = ctx.createRadialGradient(cxs, mouthY + dn, 1, cxs, mouthY + dn, mwo * 0.30);
      cg.addColorStop(0, rgba(0x3a1c18, 0.45));
      cg.addColorStop(1, rgba(0x3a1c18, 0));
      ctx.fillStyle = cg;
      ctx.fillRect(cxs - mwo * 0.4, mouthY - S * 0.024, mwo * 0.8, S * 0.05);
    }
    // sub-lip / chin shelf shadow — a soft crescent (v6: 0.42→0.24, no gouge)
    const slo = ctx.createRadialGradient(cx, mouthY + S * 0.034, S * 0.006, cx, mouthY + S * 0.034, S * 0.085);
    slo.addColorStop(0, rgba(0x2a1810, 0.24));
    slo.addColorStop(1, rgba(0x2a1810, 0));
    ctx.fillStyle = slo;
    ctx.fillRect(cx - S * 0.095, mouthY + S * 0.010, S * 0.19, S * 0.095);
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
  // lip seam (curved per expression) — v6: softened to a warm, lighter line so
  // the closed mouth reads relaxed, not a hard grim slot cut into the face.
  ctx.strokeStyle = rgba(0x6a3e30, 0.55);
  ctx.lineWidth = 0.007 * S;
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
  // mouth-corner accent — a small soft bead so the mouth has ends (v6: halved
  // from 0.55; a heavy corner bead reads as a downturned scowl on the neutral).
  for (const s of [-1, 1]) {
    const cxs = cx + s * mw * 0.94;
    const cg = ctx.createRadialGradient(cxs, mouthY + (s < 0 ? asymL : asymR), 1, cxs, mouthY, mw * 0.22);
    cg.addColorStop(0, rgba(0x3a2018, 0.28));
    cg.addColorStop(1, rgba(0x3a2018, 0));
    ctx.fillStyle = cg;
    ctx.fillRect(cxs - mw * 0.3, mouthY - S * 0.02, mw * 0.6, S * 0.04);
  }
  // sub-lip / chin shelf shadow — a faint crescent so the lower face reads as a
  // jaw with a chin (v6: eased so it never becomes a dark gouge).
  const sl = ctx.createRadialGradient(cx, mouthY + drop + S * 0.03, S * 0.006, cx, mouthY + drop + S * 0.03, S * 0.07);
  sl.addColorStop(0, rgba(0x2a1810, 0.13));
  sl.addColorStop(1, rgba(0x2a1810, 0));
  ctx.fillStyle = sl;
  ctx.fillRect(cx - S * 0.09, mouthY + drop, S * 0.18, S * 0.09);
}

// All expressions for a character, pre-painted (texture-swap expressions).
export function paintFaceSet(config, size = 512) {
  if (typeof document === 'undefined') return {};
  const set = {};
  for (const e of EXPRESSIONS) set[e] = paintFace(config, e, size);
  return set;
}
