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

// Solved against the v7 skull canon (CharacterBuilder: SKULL/LM/faceLayout).
// Only used if a caller paints a face without going through CharacterBuilder.
const V7_FALLBACK_LAYOUT = {
  hairlineF: 0.0762, browF: 0.2463, eyeF: 0.3228, noseF: 0.5457, mouthF: 0.6203, chinF: 0.8958,
  eyeDXF: 0.1715, eyeWF: 0.0921, eyeHF: 0.0468, noseWF: 0.0864, mouthWF: 0.2005, jawWF: 0.24,
  mouthHF: 0.0568, maskCY: 0.5765, maskR0: 0.30, maskR1: 0.50, maskSX: 1.0, maskSY: 1.231,
};

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
// numeric shade (rgba() takes a hex int, shadeHex returns a css string)
function shadeHexNum(c, f) {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * f));
  const b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
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
      // v7 FIX round-1 — ANGRY vs SMUG were "nearly the same frame … only inner
      // brow angle differs" and would be ONE state at combat distance. They are
      // now separated on four channels at once, not one: brow ANGLE (angry drops
      // the inner end 22px and lifts the outer, smug lifts one whole brow 20px),
      // eye APERTURE (angry glares wide open, smug is a real half-lid at 0.32 —
      // 0.08 vs 0.14 was a 3px difference on a 24px eye, i.e. invisible), mouth
      // SHAPE, and mouth CURVE. Read them as: angry = wide eyes + low straight
      // brows + hard downturn; smug = one raised brow + hooded eyes + one-sided
      // smirk.
      return { browInner: 22, browOuter: -10, lid: 0.0, openY: 1.12, mouth: 'frown', mouthCurve: -9, furrow: true };
    case 'smug':
      return { browInner: -12, browOuter: -20, lid: 0.32, openY: 0.92, mouth: 'smirk', mouthCurve: 9, asym: 1 };
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

  // ── V7 LAYOUT (solved by the geometry, consumed here) ─────────────────
  // CharacterBuilder.faceLayout() converts the skull's anatomical landmarks into
  // canvas fractions, INCLUDING the conformal width correction for how far the
  // surface has turned away at each row. The painter no longer owns any vertical
  // metrology of its own — if the skull changes, these numbers change with it.
  const L = config._layout || V7_FALLBACK_LAYOUT;

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

  // ── LAYOUT — every vertical number now comes from the geometry solve (L).
  // v6 owned its own metrology here and it drifted every round; the eye line
  // measured 56% of skull height against LAW 3's 50%. In v7 the skull's equator
  // IS the eye line, and L.eyeF is wherever that lands on the tile.
  const cx = S * 0.5;
  const eyeY = S * L.eyeF;
  const eyeDX = S * L.eyeDXF;              // pupils ±0.40R — gap = one eye-width
  // Elderly eyes: a narrower opening with a bigger iris.
  const eyeW = S * L.eyeWF * (old ? 0.88 : 1.0);
  const eyeH = S * L.eyeHF * E.openY;
  const browY = S * L.browF;
  const noseTipY = S * L.noseF;
  const mouthY = S * L.mouthF + (old ? -S * 0.006 : 0);
  const chinY = S * L.chinF;

  // ── base skin: FLAT fill at exactly skin so the feathered patch edge
  // blends seamlessly into the head skin. Shaping is centered overlays that
  // fade before the border (no edge mismatch = no seam). ───────────────
  // v6 LAW 3/5 — base skin fills a HAIR brighter + warmer so the face reads as
  // the best-lit surface even in the dark arena (the matte skin material no
  // longer adds a plastic sheen to compensate). Shading stays nearly flat — the
  // lit egg geometry carries the form; painted shadow only whispers.
  // v7 — 1.06 put the painted plate a visible luminance step above the skull
  // skin, so the patch rim read as a lighter oval mask at the temples. The combat
  // FACE-KEY (LAW 5) is what makes faces the best-lit surface; the texture must
  // not also try to.
  // v7 FIX round-2 — 1.015 is exactly the luminance step the deleted edge
  // vignette was hired to hide. The plate now fills at the skull's own skin, so
  // there is no rim mismatch and nothing to darken back down.
  ctx.fillStyle = shadeHex(skin, 1.0);
  ctx.fillRect(0, 0, S, S);
  {
    // WARM LIGHT ONLY. The old gradient ended on a 0.02 "whisper of jaw shade"
    // that ran the full tile width at the mouth/jaw row — the second contributor
    // to the beard band, stacked under the vignette. A face lit from front-and-
    // above (LAW 5) has NO painted jaw shadow; the sculpted mandible casts it.
    const g = ctx.createLinearGradient(0, S * 0.23, 0, S * 0.78);
    g.addColorStop(0, rgba(0xfff2e2, 0.07));      // warm forehead light
    g.addColorStop(1, rgba(0, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, S * 0.23, S, S * 0.55);
  }

  // ── FORM-LIGHT COMPENSATION (v7 FIX round-2) ─────────────────────────
  // With the vignette deleted and jawProfile's welt gone, the residual "beard"
  // is neither paint nor crease: it is the plain cosine falloff of a key placed
  // front-AND-ABOVE (LAW 5). Measured on the lit head close-up, Karen's forehead
  // delivered L≈172 and her jaw L≈112 — a 35% drop across the lower third, which
  // at fight framing is a garment, not a form.
  //
  // The venue rig is not ours to move (and LAW 5 wants it exactly where it is),
  // so the albedo does what a miniature painter does: it counter-lights. A broad
  // warm ramp from the eye line to the chin raises the shaded plane's albedo so
  // the DELIVERED luminance flattens. It has no edge anywhere — it is one linear
  // gradient over half the tile — so it cannot become a band.
  {
    const g2 = ctx.createLinearGradient(0, S * L.eyeF, 0, S * (L.chinF + 0.03));
    g2.addColorStop(0, rgba(0xfff2e6, 0));
    g2.addColorStop(0.45, rgba(0xfff2e6, 0.055));
    g2.addColorStop(1, rgba(0xfff2e6, 0.155));
    ctx.fillStyle = g2;
    ctx.fillRect(0, S * L.eyeF, S, S);
  }

  // temple / side shading — DELETED (v7 FIX round-2). sculptSkull step 2 builds a
  // real temple plane and the toon ramp already darkens it; a second painted
  // hollow on top of it is a third layer of the same mid-face grime.

  // cheek warmth / blush — v6 round-4 LAW 3: a LOCAL cheek dot. The old
  // 0.14S-radius wash reached the jaw and, stacked on the patch-edge vignette,
  // read as windburn over Karen's whole muzzle / grime on Chad's jaw.
  const cheekY = eyeY + (noseTipY - eyeY) * 0.72;
  for (const sx of [cx - eyeDX * 1.30, cx + eyeDX * 1.30]) {
    const cg = ctx.createRadialGradient(sx, cheekY, S * 0.012, sx, cheekY, S * 0.085);
    cg.addColorStop(0, rgba(female ? 0xd06860 : 0xc07858, female ? 0.13 : 0.08));
    cg.addColorStop(1, rgba(0, 0));
    ctx.fillStyle = cg;
    ctx.fillRect(0, 0, S, S);
  }

  // ── eye sockets: soft shadow above the eyes (upper-lid crease, not a
  // bruise — kept restrained so the eye itself reads bright and open) ───
  for (const s of [-1, 1]) {
    const ex = cx + s * eyeDX;
    const sg = ctx.createRadialGradient(ex, eyeY - eyeH * 0.55, S * 0.008, ex, eyeY - eyeH * 0.35, S * 0.062);
    // v7 — the SOCKET IS GEOMETRY now (sculptSkull step 5 recesses it 0.048R under
    // a 0.070R brow shelf), so the painted version drops to almost nothing. Two
    // stacked shadows is exactly how v5/v6 arrived at "scrunched / scary".
    sg.addColorStop(0, rgba(0x2a1810, 0.05));
    sg.addColorStop(0.6, rgba(0x2a1810, 0.02));
    sg.addColorStop(1, rgba(0, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(ex - S * 0.11, eyeY - S * 0.10, S * 0.22, S * 0.12);
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
      wg.addColorStop(0, '#ddd5c9');
      wg.addColorStop(0.5, '#f2eee6');
      wg.addColorStop(1, '#e6dfd3');
    }
    ctx.fillStyle = wg;
    ctx.fillRect(ex - eyeW, eyeY - eyeH, eyeW * 2, eyeH * 2);
    // iris — fills most of the (now shorter, almond) eye height so it reads as a
    // real iris, not a beady dot, while bright sclera still frames it left/right.
    const irisR = eyeH * (old ? 1.10 : 0.92);   // ≈75% of eye width on old faces
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
    ctx.beginPath(); ctx.arc(ex - irisR * 0.28, iy - irisR * 0.36, irisR * (hasGlasses ? 0.40 : 0.31), 0, Math.PI * 2); ctx.fill();
    // Old faces get ONE offset catchlight only (a second bead behind a lens reads
    // as a double glare pool).
    if (!old) {
      ctx.fillStyle = 'rgba(255,255,255,0.34)';
      ctx.beginPath(); ctx.arc(ex + irisR * 0.42, iy + irisR * 0.44, irisR * 0.13, 0, Math.PI * 2); ctx.fill();
    }
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
    // upper-lid CREASE — a soft line one lid-height above the lash. Without it the
    // eye reads as a decal; with it the socket the geometry recesses gets an edge.
    ctx.strokeStyle = rgba(0x4a2f22, 0.26);
    ctx.lineWidth = 0.0045 * S;
    ctx.beginPath();
    ctx.moveTo(ex - eyeW * 0.86, lidY - eyeH * 0.90);
    ctx.quadraticCurveTo(ex, lidY - eyeH * 1.55, ex + eyeW * 0.92, lidY - eyeH * 0.80);
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
    const f = old ? 0.72 : 0.62;
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
    // v7 FIX round-2 — THE ENDS WERE SWAPPED. `moveTo(bx − s·eyeW·0.68, …)` is,
    // for s = −1, bx + 0.68·eyeW — i.e. toward the canvas centre, the INNER end —
    // and it was carrying `browOuter`; the terminal point (the outer end) carried
    // `browInner`. Every expression's brow angle therefore rendered mirrored:
    // 'angry' (inner +22 down, outer −10 up) drew a RAISED inner end, which is
    // the sad/worried brow. This is also why the neutral read as a default
    // furrow — the shape the painter thought it was drawing was never on screen.
    // Inner end first, outer end last, each with its own offset.
    const innerX = bx + s * eyeW * 0.64;   // toward the nose
    const outerX = bx - s * eyeW * 0.72;   // toward the temple
    const midX = bx - s * eyeW * 0.10;
    // v7 FIX round-2 — the brow is a FILLED LEAF, not two stacked strokes. Two
    // round-capped strokes (0.028S under-pass + 0.020S crisp) measured ~24px on a
    // 48px eye at 512², half an eye height against a human ~0.3, with a blunt
    // square cap at BOTH ends — which is precisely "heavy dark caterpillars". A
    // leaf is thickest at the inner third and tapers to a point at the temple,
    // so the brow has a head and a tail and no cap anywhere.
    const bTh = (female ? 0.0090 : 0.0115) * S;      // half-thickness at the head
    const arcY = browY - S * (female ? 0.014 : 0.016) + (inner + outer) * 0.5;
    const leaf = (grow) => {
      ctx.beginPath();
      ctx.moveTo(innerX + s * bTh * 0.5, browY + inner);
      ctx.quadraticCurveTo(midX, arcY - bTh * grow, outerX, browY + outer);
      ctx.quadraticCurveTo(midX, arcY + bTh * grow * 0.92, innerX + s * bTh * 0.5, browY + inner + bTh * grow * 1.15);
      ctx.closePath();
    };
    ctx.fillStyle = browBase;
    ctx.save();
    ctx.globalAlpha = 0.24;
    leaf(1.42);
    ctx.fill();
    ctx.restore();
    leaf(1.0);
    ctx.fill();
    // strand hints — v7 FIX round-2: the old pass drew five 9px ticks in a
    // LIGHTER tone straight through the bar, which rendered at fight framing as
    // comb teeth sticking out of a dark rectangle (visible at 4× in
    // karen-fx8-f). Three short strokes, in the brow's own tone at low alpha,
    // lying ALONG the brow rather than across it.
    ctx.save();
    ctx.globalAlpha = old ? 0.22 : 0.30;
    ctx.lineWidth = 0.0032 * S;
    ctx.strokeStyle = shadeHex(hairC, old ? 0.90 : 0.52);
    for (let i = -1; i <= 1; i++) {
      const px0 = bx + i * eyeW * 0.30;
      const yo = browY + (inner + outer) * 0.5 - S * 0.004;
      ctx.beginPath();
      ctx.moveTo(px0, yo);
      ctx.lineTo(px0 - s * S * 0.014, yo - S * 0.003);
      ctx.stroke();
    }
    ctx.restore();
  }
  // angry forehead furrow between the brows
  if (E.furrow) {
    // Seated BETWEEN the brow heads and running up into the glabella, which is
    // where a corrugator crease lives — v6's fixed offset put two thin sticks in
    // the middle of the forehead once the brow line moved (andrew expr-angry).
    ctx.strokeStyle = rgba(0x2a1810, 0.30);
    ctx.lineWidth = eyeW * 0.10;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * eyeW * 0.24, browY + eyeH * 0.45);
      ctx.quadraticCurveTo(cx + s * eyeW * 0.30, browY - eyeH * 0.30, cx + s * eyeW * 0.20, browY - eyeH * 0.95);
      ctx.stroke();
    }
  }

  // ── nose ── v7: THE NOSE IS GEOMETRY (sculptSkull step 9 builds a real wedge
  // whose half-width runs 0.075R at the bridge to 0.17R at the alae — narrower
  // than the 0.40R eye gap, per LAW 3). The paint pass therefore drops the v6
  // bridge gradient entirely (it was the "vertical stick down the middle of the
  // face") and keeps only what geometry cannot carry: nostril openings, the
  // shadow they cast, and a tip catchlight.
  // v7 FIX round-1 — THE MUSTACHE. Three separate dark marks were stacking in
  // the ~50px band between the nose base and the lip: a 42px-radius under-nose
  // disc at 0.12, two 15×11px nostril ovals at 0.34 spaced 46px apart, and (in
  // drawMouth) a hard-edged 23px philtrum rectangle. At fight framing that band
  // mips down to one dark bar above the mouth — Karen wore a mustache, Chad's
  // was toothbrush-shaped — and at arena close-up it was "a muddy brown smear
  // across the whole nose". All three are now inside the shadow the GEOMETRY
  // already casts: the disc is less than a third of its area at half alpha, the
  // nostrils sit ON the alae rather than under them, and the philtrum bar is
  // gone (see drawMouth).
  const noseW = S * L.noseWF;
  const us = ctx.createRadialGradient(cx, noseTipY + noseW * 0.10, S * 0.004, cx, noseTipY + noseW * 0.10, noseW * 0.52);
  us.addColorStop(0, rgba(0x2a1810, 0.06));
  us.addColorStop(1, rgba(0, 0));
  ctx.fillStyle = us;
  ctx.fillRect(cx - noseW * 0.7, noseTipY - noseW * 0.4, noseW * 1.4, noseW * 1.1);
  // nostrils — small, soft, seated at the alae the wedge actually builds
  ctx.fillStyle = rgba(0x241009, 0.22);
  for (const s2 of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s2 * noseW * 0.46, noseTipY - S * 0.003, noseW * 0.14, noseW * 0.10, s2 * -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  // tip highlight — a small catch on the ridge the geometry pushed forward
  ctx.fillStyle = rgba(0xffffff, 0.08);
  ctx.beginPath(); ctx.arc(cx, noseTipY - noseW * 0.40, noseW * 0.20, 0, Math.PI * 2); ctx.fill();

  // ── mouth ── (expression-driven; more saturated lips = contrast)
  drawMouth(ctx, S, cx, noseTipY, mouthY, lipC, female, E, old, S * L.mouthWF, S * (L.mouthHF || 0.0568));

  // ── age: wrinkles / softening ─────────────────────────────────────
  if (old) {
    // v7 FIX round-1 — 0.32 drew three hard horizontal rules across the forehead
    // that read as a ladder at arena framing (grandma fx7). 0.19 still ages her.
    ctx.strokeStyle = rgba(0x6a4a38, 0.19);
    ctx.lineWidth = 0.0032 * S;
    // forehead lines re-seated against the round-4 brow line (they were painted
    // at 0.268S, which is now up inside the hairline)
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cx - S * 0.150, browY - S * 0.060 - i * S * 0.032);
      ctx.quadraticCurveTo(cx, browY - S * 0.074 - i * S * 0.032, cx + S * 0.150, browY - S * 0.060 - i * S * 0.032);
      ctx.stroke();
    }
    // naso-labial: a SHORT soft crease from beside the nostril to the mouth
    // corner. At the round-4 spacing the old long curve pair closed into a
    // "wine-glass" outline around the mouth.
    // v7 FIX round-1 — eased 0.34 → 0.20. The sculpt's own nose-to-cheek
    // transition was re-graded this round (sculptSkull 6/7/9); stacking a
    // 0.34-alpha painted crease on top of it is what read as "witch-adjacent"
    // at arena close-up even on the one face LAW 3 allows creases on.
    ctx.save();
    ctx.globalAlpha = 0.20;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + s * S * L.noseWF * 0.95, noseTipY + S * 0.004);
      ctx.quadraticCurveTo(cx + s * S * L.mouthWF * 0.86, (noseTipY + mouthY) * 0.5,
        cx + s * S * L.mouthWF * 1.02, mouthY - S * 0.004);
      ctx.stroke();
    }
    ctx.restore();
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
    // Re-seated against the new mouth line (0.875): jaw/chin band, never up on
    // the cheekbones.
    // re-seated against the round-4 mouth line (0.815): jaw/chin band only
    const jw = S * L.mouthWF;
    const spots = [[cx, mouthY + jw * 0.62, jw * 0.66], [cx - jw * 0.72, mouthY + jw * 0.36, jw * 0.50],
      [cx + jw * 0.72, mouthY + jw * 0.36, jw * 0.50], [cx - jw * 1.02, mouthY - jw * 0.16, jw * 0.42],
      [cx + jw * 1.02, mouthY - jw * 0.16, jw * 0.42]];
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
    const bw = S * L.mouthWF * 1.34, bTop = noseTipY + (mouthY - noseTipY) * 0.30;
    const bBot = chinY + (chinY - mouthY) * 0.28;
    ctx.moveTo(cx - bw, bTop);
    ctx.quadraticCurveTo(cx - bw * 1.02, bBot * 0.94, cx, bBot);
    ctx.quadraticCurveTo(cx + bw * 1.02, bBot * 0.94, cx + bw, bTop);
    ctx.quadraticCurveTo(cx + bw * 0.50, mouthY + S * 0.010, cx, mouthY + S * 0.016);
    ctx.quadraticCurveTo(cx - bw * 0.50, mouthY + S * 0.010, cx - bw, bTop);
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
      const a = ((h - Math.floor(h)) - 0.5) * 1.5;   // v7: the sculpt carries the form; noise only breaks the plastic
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
  // Mask centre moved DOWN with the feature stack (eye 0.480 → mouth 0.875) and
  // the opaque core widened, or the new low mouth would sit inside the feather
  // ramp and dissolve (grandma's "no mouth exists in any frame").
  const mCx = cx, mCy = S * L.maskCY;

  // ── THE PATCH-EDGE VIGNETTE IS GONE (v7 FIX round-2, note [A] THE BEARD
  // SMUDGE). Every round since v5 has re-tuned this ring darker→lighter
  // (0.30 → 0.14 → 0.09) and every round it has come back as the same artifact,
  // because a radial darkening centred on the FACE and biting hardest at its
  // lower rim is, geometrically, a beard. On Karen at real combat-intro framing
  // (screenshots/cine/karen_intro.png) the 0.09 ring composited under the arena
  // key as a brown-grey band across the upper lip, both cheeks and the jaw — on
  // a woman in red lipstick. Its own lineage comment named the failure
  // ("windburn on Karen, beard-shadow grime on Chad") and shipped it anyway at a
  // lower alpha.
  //
  // Nothing replaces it. The rim-luminance job it was hired for is handled
  // structurally instead: the alpha feather below now starts fading inside the
  // opaque core (0.20 → 0.62 ramp) so the patch dissolves over a long soft
  // gradient, and the base fill sits at 1.0 of the skull skin (see the fill
  // above) so there is no luminance step to hide in the first place.
  ctx.globalCompositeOperation = 'destination-in';
  // Wider, softer feather (opaque core 0.24, fade out to 0.50 — was 0.28→0.46)
  // so every geometry edge dissolves over a long ramp and the visible boundary
  // is always soft skin, never the patch rim (item 6, whole cast).
  // Opaque core widened (0.30→0.335) and the horizontal scale opened (1.02→1.10)
  // so the face plate stays skin out to ≥75% of the frontal sphere instead of
  // dissolving into an inset oval (Grandma's mask-hole).
  // v7 FIX round-2 — the ramp starts at 0.62 instead of 0.20. With the edge
  // vignette deleted the feather is the ONLY thing seating the patch, so it has
  // to be long: an S-curve that is still 96% opaque where the features live and
  // only reaches zero at the geometry edge. A short ramp from 0.20 was what made
  // the old vignette feel necessary.
  const mask = ctx.createRadialGradient(mCx, mCy, S * L.maskR0, mCx, mCy, S * L.maskR1);
  mask.addColorStop(0, 'rgba(255,255,255,1)');
  mask.addColorStop(0.62, 'rgba(255,255,255,0.985)');
  mask.addColorStop(0.84, 'rgba(255,255,255,0.72)');
  mask.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = mask;
  ctx.save();
  ctx.translate(mCx, mCy);
  ctx.scale(L.maskSX, L.maskSY);
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
function drawMouth(ctx, S, cx, noseTipY, mouthY, lipC, female, E, old = false, mouthHalfW = null, mh = null) {
  // v7 — the mouth half-width arrives PRE-CORRECTED for the conformal squeeze at
  // the mouth row (the surface has turned ~28° away from the lens there, so a
  // tile-space width authored by eye always measured narrow in world space).
  // Corner-to-corner is 0.68R ≈ 34% of head width, which is human.
  const mw = (mouthHalfW || (female ? 0.118 : 0.104) * S) * (female ? 1.04 : 0.98);
  // `mh` is the conformally-corrected HALF-HEIGHT of the lip pair. Every vertical
  // lip dimension below is expressed in it, so the mouth keeps its mass wherever
  // the mouth row lands on the skull.
  const LH = mh || S * 0.0568;
  const curve = E.mouthCurve * (S / 512);
  // v7 FIX round-1 — NO PAINTED PHILTRUM. sculptSkull step 7 builds a real
  // philtrum shelf in geometry; painting a hard-edged 23px dark rectangle on top
  // of it is the second half of the mustache artifact. What remains is a pair of
  // faint philtrum RIDGE highlights (light, not dark), which is what a philtrum
  // actually reads as under a front-and-above key.
  {
    const pg = ctx.createLinearGradient(cx - mw * 0.16, 0, cx + mw * 0.16, 0);
    pg.addColorStop(0, rgba(0xfff0e2, 0));
    pg.addColorStop(0.22, rgba(0xfff0e2, 0.07));
    pg.addColorStop(0.5, rgba(0xfff0e2, 0));
    pg.addColorStop(0.78, rgba(0xfff0e2, 0.07));
    pg.addColorStop(1, rgba(0xfff0e2, 0));
    ctx.fillStyle = pg;
    ctx.fillRect(cx - mw * 0.16, noseTipY + LH * 0.30, mw * 0.32, (mouthY - noseTipY) - LH * 1.1);
  }

  // Male lip alpha raised (0.62/0.68 → 0.82/0.86): Chad's mouth rendered as a
  // single thin dark line with no lip mass at fight framing.
  const upperA = female ? 1.0 : 0.82;
  const lowerA = female ? 1.0 : 0.86;

  if (E.mouth === 'grin' || E.mouth === 'open') {
    // open mouth: dark cavity + teeth + lips around it
    const open = (E.mouth === 'grin' ? LH * 1.30 : LH * 0.86);
    const w = (E.small ? mw * 0.58 : mw * 0.94);
    ctx.fillStyle = '#3a1418';
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + open * 0.2, w, open, 0, 0, Math.PI * 2);
    ctx.fill();
    // upper teeth — v7: a real arc filling the top half of the cavity. At the v6
    // fractions they occupied ~10% of the opening and the grin read as a black
    // hole (karen expr-victory).
    const cy2 = mouthY + open * 0.2;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy2, w, open, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#f4f0e7';
    ctx.beginPath();
    ctx.ellipse(cx, cy2 - open * 0.86, w * 0.98, open * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(0x8a7b6a, 0.30);
    ctx.lineWidth = Math.max(1, open * 0.05);
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * w * 0.30, cy2 - open * 1.0);
      ctx.lineTo(cx + i * w * 0.30, cy2 - open * 0.10);
      ctx.stroke();
    }
    ctx.restore();
    // lip outline
    ctx.strokeStyle = rgba(lipC, 0.88);
    ctx.lineWidth = LH * 0.34;
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + open * 0.2, w, open, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  if (E.mouth === 'grit') {
    // v7 FIX round-1 — the v6 grit was an axis-aligned fillRect + strokeRect:
    // literally a white rectangle with a red border, which is exactly how both
    // critics read it ("a red-rimmed white rectangle", "a flat white denture-grid
    // band"). A clenched mouth is a LENS, not a box. This is a curved band —
    // upper edge bowed up, lower edge bowed down, corners pinched — filled with
    // warm enamel that darkens toward the corners, with the tooth divisions
    // clipped inside it and a lip pair wrapping the whole shape.
    const bw = mw * 1.02, bh = LH * 0.80;
    const lens = () => {
      ctx.beginPath();
      ctx.moveTo(cx - bw * 0.5, mouthY);
      ctx.quadraticCurveTo(cx, mouthY - bh * 0.92, cx + bw * 0.5, mouthY);
      ctx.quadraticCurveTo(cx, mouthY + bh * 0.86, cx - bw * 0.5, mouthY);
      ctx.closePath();
    };
    ctx.save();
    lens();
    ctx.clip();
    const tg = ctx.createLinearGradient(cx - bw * 0.5, 0, cx + bw * 0.5, 0);
    tg.addColorStop(0, '#b9ad9c');
    tg.addColorStop(0.28, '#eae4d8');
    tg.addColorStop(0.72, '#eae4d8');
    tg.addColorStop(1, '#b9ad9c');
    ctx.fillStyle = tg;
    ctx.fillRect(cx - bw, mouthY - bh, bw * 2, bh * 2);
    ctx.strokeStyle = rgba(0x4a2a1c, 0.26);
    ctx.lineWidth = LH * 0.055;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * bw * 0.19, mouthY - bh);
      ctx.lineTo(cx + i * bw * 0.19, mouthY + bh);
      ctx.stroke();
    }
    // the clench line itself — where the two rows meet
    ctx.strokeStyle = rgba(0x3a2018, 0.30);
    ctx.lineWidth = LH * 0.10;
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.5, mouthY + LH * 0.02);
    ctx.quadraticCurveTo(cx, mouthY + LH * 0.14, cx + bw * 0.5, mouthY + LH * 0.02);
    ctx.stroke();
    ctx.restore();
    // lips wrapping the clench, heavier at the corners so the mouth has ends
    ctx.strokeStyle = rgba(lipC, 0.80);
    ctx.lineWidth = LH * 0.24;
    ctx.lineJoin = 'round';
    lens();
    ctx.stroke();
    for (const s of [-1, 1]) {
      const cxs = cx + s * bw * 0.50;
      const cg = ctx.createRadialGradient(cxs, mouthY, 1, cxs, mouthY, mw * 0.24);
      cg.addColorStop(0, rgba(0x3a1c18, 0.42));
      cg.addColorStop(1, rgba(0x3a1c18, 0));
      ctx.fillStyle = cg;
      ctx.fillRect(cxs - mw * 0.3, mouthY - LH * 0.9, mw * 0.6, LH * 1.8);
    }
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
    const mwo = mw * 1.02;
    const dn = curve * 0.6;                         // faint downturn, expression-nudged
    // A LIT lip pair framed by a warm seam: an albedo-dark mouth vanishes into a
    // shadowed, foreshortened elderly lower face. v7 rebuilds it in LH units so it
    // keeps real vertical mass wherever the mouth row lands.
    ctx.fillStyle = rgba(lipC, 0.92);
    ctx.beginPath();
    ctx.moveTo(cx - mwo, mouthY + dn);
    ctx.quadraticCurveTo(cx - mwo * 0.45, mouthY - LH * 0.80, cx, mouthY - LH * 0.42);
    ctx.quadraticCurveTo(cx + mwo * 0.45, mouthY - LH * 0.80, cx + mwo, mouthY + dn);
    ctx.quadraticCurveTo(cx, mouthY + LH * 0.10, cx - mwo, mouthY + dn);
    ctx.fill();
    ctx.fillStyle = rgba(lipC, 0.98);
    ctx.beginPath();
    ctx.moveTo(cx - mwo * 0.88, mouthY + LH * 0.06 + dn);
    ctx.quadraticCurveTo(cx, mouthY + LH * 0.86, cx + mwo * 0.88, mouthY + LH * 0.06 + dn);
    ctx.quadraticCurveTo(cx, mouthY + LH * 0.20, cx - mwo * 0.88, mouthY + LH * 0.06 + dn);
    ctx.fill();
    ctx.fillStyle = rgba(0xffd8c8, 0.42);
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + LH * 0.44, mwo * 0.34, LH * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(0x5a2e26, 0.66);
    ctx.lineWidth = LH * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - mwo, mouthY + dn);
    ctx.quadraticCurveTo(cx, mouthY + LH * 0.10 + curve, cx + mwo, mouthY + dn);
    ctx.stroke();
    // v7 FIX round-2 — GRANDMA'S GRIMACE (note [B]). The bible asks for a face
    // "soft and genuinely kind" and LAW 3 for neutral corners; a 0.40-alpha dark
    // bead on each mouth end plus a 0.20 pool beneath it is a scowl no matter
    // what curve the lips carry. Corners 0.40 → 0.16, sub-lip 0.20 → 0.07.
    for (const s of [-1, 1]) {
      const cxs = cx + s * mwo * 0.98;
      const cg = ctx.createRadialGradient(cxs, mouthY + dn, 1, cxs, mouthY + dn, mwo * 0.26);
      cg.addColorStop(0, rgba(0x3a1c18, 0.16));
      cg.addColorStop(1, rgba(0x3a1c18, 0));
      ctx.fillStyle = cg;
      ctx.fillRect(cxs - mwo * 0.4, mouthY - LH * 0.6, mwo * 0.8, LH * 1.4);
    }
    const slo = ctx.createRadialGradient(cx, mouthY + LH * 1.1, LH * 0.1, cx, mouthY + LH * 1.1, mwo * 0.5);
    slo.addColorStop(0, rgba(0x2a1810, 0.07));
    slo.addColorStop(1, rgba(0x2a1810, 0));
    ctx.fillStyle = slo;
    ctx.fillRect(cx - mwo, mouthY + LH * 0.4, mwo * 2, mwo * 1.0);
    return;
  }

  // closed-lip mouths (neutral / press / frown / smirk): a shaped lip pair.
  const asymL = E.mouth === 'smirk' ? curve : 0;
  const asymR = E.mouth === 'smirk' ? -curve * 0.4 : 0;
  // upper lip
  ctx.fillStyle = rgba(lipC, upperA);
  ctx.beginPath();
  ctx.moveTo(cx - mw, mouthY - 1 + asymL);
  ctx.quadraticCurveTo(cx - mw * 0.45, mouthY - LH * 0.86, cx - mw * 0.10, mouthY - LH * 0.46);
  ctx.quadraticCurveTo(cx, mouthY - LH * 0.70, cx + mw * 0.10, mouthY - LH * 0.46);
  ctx.quadraticCurveTo(cx + mw * 0.45, mouthY - LH * 0.86, cx + mw, mouthY - 1 + asymR);
  ctx.quadraticCurveTo(cx, mouthY - 1, cx - mw, mouthY - 1 + asymL);
  ctx.fill();
  // lower lip
  ctx.fillStyle = rgba(lipC, lowerA);
  const drop = (E.mouth === 'press') ? LH * 0.55 : (female ? LH * 1.10 : LH * 0.94);
  ctx.beginPath();
  ctx.moveTo(cx - mw + 5, mouthY + asymL);
  ctx.quadraticCurveTo(cx, mouthY + drop, cx + mw - 5, mouthY + asymR);
  ctx.quadraticCurveTo(cx, mouthY + LH * 0.10, cx - mw + 5, mouthY + asymL);
  ctx.fill();
  // lip seam (curved per expression) — v6: softened to a warm, lighter line so
  // the closed mouth reads relaxed, not a hard grim slot cut into the face.
  // v6 round-5 — on a female face with an explicit lip colour the 0.0095S seam at
  // 0.74 alpha covered most of the visible vermilion, so Karen's portrait RED lip
  // rendered as a brown line (rider note 2 asks for the red lip to read). Thinner
  // and lighter on female lips; men keep the heavier seam that made their mouths
  // legible at framing.
  ctx.strokeStyle = rgba(0x54291f, female ? 0.52 : 0.66);
  ctx.lineWidth = LH * (female ? 0.13 : 0.17);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - mw, mouthY - 0.5 + asymL);
  ctx.quadraticCurveTo(cx, mouthY + 0.5 + curve, cx + mw, mouthY - 0.5 + asymR);
  ctx.stroke();
  // soft outer vermilion border so the lip MASS has an edge against skin (without
  // it the whole mouth sat at ~0 luminance delta and simply vanished at framing)
  ctx.strokeStyle = rgba(shadeHexNum(lipC, 0.62), female ? 0.52 : 0.34);
  ctx.lineWidth = 0.005 * S;
  ctx.beginPath();
  ctx.moveTo(cx - mw, mouthY - 1 + asymL);
  ctx.quadraticCurveTo(cx - mw * 0.45, mouthY - LH * 0.98, cx, mouthY - LH * 0.58);
  ctx.quadraticCurveTo(cx + mw * 0.45, mouthY - LH * 0.98, cx + mw, mouthY - 1 + asymR);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - mw + 5, mouthY + asymL);
  ctx.quadraticCurveTo(cx, mouthY + drop + LH * 0.10, cx + mw - 5, mouthY + asymR);
  ctx.stroke();
  // lower-lip highlight
  ctx.fillStyle = rgba(0xffffff, female ? 0.26 : 0.14);
  ctx.beginPath();
  ctx.ellipse(cx, mouthY + drop * 0.55, mw * 0.4, LH * (female ? 0.15 : 0.11), 0, 0, Math.PI * 2);
  ctx.fill();
  // mouth-corner accent — a small soft bead so the mouth has ends (v6: halved
  // from 0.55; a heavy corner bead reads as a downturned scowl on the neutral).
  // v7 FIX round-2 — corner accents 0.28 → 0.14. Two dark beads sitting at
  // ±0.94 of the half-width are read by the eye as the mouth's ENDS, and a dark
  // end below the lip line is a downturn. LAW 3 asks for flat corners on the
  // neutral; at 0.28 Karen's arena still had them turned down.
  for (const s of [-1, 1]) {
    const cxs = cx + s * mw * 0.94;
    const cg = ctx.createRadialGradient(cxs, mouthY + (s < 0 ? asymL : asymR), 1, cxs, mouthY, mw * 0.20);
    cg.addColorStop(0, rgba(0x3a2018, 0.14));
    cg.addColorStop(1, rgba(0x3a2018, 0));
    ctx.fillStyle = cg;
    ctx.fillRect(cxs - mw * 0.3, mouthY - S * 0.02, mw * 0.6, S * 0.04);
  }
  // sub-lip / chin shelf shadow — v7 FIX round-2: 0.13 over a 0.62·mw disc was an
  // 80px brown pool sitting directly under the mouth at 512², i.e. the bottom
  // third of the beard band. 0.055 over a tighter, LOWER-seated crescent still
  // separates lip from chin without painting a shadow the key light forbids.
  const sl = ctx.createRadialGradient(cx, mouthY + drop + LH * 0.62, LH * 0.1, cx, mouthY + drop + LH * 0.62, mw * 0.44);
  sl.addColorStop(0, rgba(0x2a1810, 0.055));
  sl.addColorStop(1, rgba(0x2a1810, 0));
  ctx.fillStyle = sl;
  ctx.fillRect(cx - mw, mouthY + drop, mw * 2, mw * 1.1);
}

// All expressions for a character, pre-painted (texture-swap expressions).
export function paintFaceSet(config, size = 512) {
  if (typeof document === 'undefined') return {};
  const set = {};
  for (const e of EXPRESSIONS) set[e] = paintFace(config, e, size);
  return set;
}
