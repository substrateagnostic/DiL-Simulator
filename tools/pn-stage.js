// PRODUCER-NOTES measurement stage (dev-only; served by the Vite dev server,
// NEVER imported by src/). Companion to tools/pn-shoot.mjs.
//
// Six producer notes, six instruments — every one of them measures a RENDER or
// the built geometry, never a formula:
//
//   1 neck()   — silhouette width of the neck column at 24 heights, measured by
//                an ID-colour pass so collar/hair occlusion is honoured.
//   2 bands()  — horizontal shadow-line detector: |dL/dy| of the lit face render
//                through the nose band. A "line" is a row-gradient spike.
//   3 skull()  — Chad's note: head scale + roundness + structure energy.
//   4 hands()  — chirality: thumb position in the CHARACTER's frame, per side,
//                plus close-up renders of both hands.
//   5 hair()   — strand energy: high-frequency variance across the hair mask
//                (a bonnet is a flat mass; hair has strand texture).
//   6 expr()   — six expressions × {painted, form-only} so geometry and paint
//                can be judged separately and together.
//
// All renders are PLAIN BACKGROUND / NO GROUND (charmetrics RULE 1).
import * as THREE from 'three';
import { buildCharacter } from '/src/entities/CharacterBuilder.js';
import { CHARACTER_CONFIGS } from '/src/data/characters.js';

const BG = 0xd8d8d8;
const BGV = [216, 216, 216];

function stage(w, h) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  return { renderer, scene };
}

function rig(scene, flat = false) {
  scene.add(new THREE.AmbientLight(0xffffff, flat ? 1.05 : 0.62));
  if (flat) {
    const k = new THREE.DirectionalLight(0xffffff, 0.95);
    k.position.set(0.35, 1.2, 1.3); scene.add(k);
    return;
  }
  const key = new THREE.DirectionalLight(0xfff3e6, 1.55); key.position.set(0.55, 1.35, 1.6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.55); fill.position.set(-1.4, 0.5, 1.1); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5); rim.position.set(-0.6, 0.9, -1.6); scene.add(rim);
}

function hideBlob(root) {
  root.traverse((o) => { if (o.name === 'blobShadow' || (o.userData && o.userData.blobShadow)) o.visible = false; });
}
// FORM PASS (charmetrics RULE 2). Every map off AND every colour set to one
// neutral grey, so what remains on screen is nothing but surface orientation.
// Stripping maps alone is NOT enough: the face patch's material carries
// color 0xffffff with the portrait in `map`, so a map-only strip renders the
// face as a white plate and hides the very geometry you are trying to judge.
function stripMaps(root, grey = 0xc9c9c9) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      for (const k of ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'sheenColorMap']) if (m[k]) m[k] = null;
      if (m.color) m.color = new THREE.Color(grey);
      if (m.transparent) { m.transparent = false; m.opacity = 1; }
      m.needsUpdate = true;
    }
  });
}

const box = (o) => new THREE.Box3().setFromObject(o);

// Orthographic shot. Returns { url, px(w,h), read(x,y)->[r,g,b], worldYOfRow }.
function ortho(renderer, scene, { az = 0, el = 0, center, halfH, w, h }) {
  renderer.setSize(w, h, false);
  const halfW = halfH * (w / h);
  const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.01, 60);
  const R = 6;
  cam.position.set(
    center.x + Math.sin(az) * Math.cos(el) * R,
    center.y + Math.sin(el) * R,
    center.z + Math.cos(az) * Math.cos(el) * R,
  );
  cam.lookAt(center.x, center.y, center.z);
  cam.updateProjectionMatrix();
  renderer.render(scene, cam);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(renderer.domElement, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  const yTop = center.y + halfH, yBot = center.y - halfH;
  return {
    url: c.toDataURL('image/png'),
    data, w, h,
    unitsPerPx: (yTop - yBot) / h,
    rowOf: (wy) => Math.round((yTop - wy) / (yTop - yBot) * h),
    yOf: (row) => yTop - (row + 0.5) / h * (yTop - yBot),
  };
}

const isBG = (d, i) => Math.abs(d[i] - BGV[0]) < 7 && Math.abs(d[i + 1] - BGV[1]) < 7 && Math.abs(d[i + 2] - BGV[2]) < 7;

// Silhouette run length on a row (leftmost → rightmost non-background).
function rowSpan(shot, row) {
  let l = -1, r = -1;
  for (let x = 0; x < shot.w; x++) {
    const i = (row * shot.w + x) * 4;
    if (!isBG(shot.data, i)) { if (l < 0) l = x; r = x; }
  }
  return l < 0 ? null : { l, r, width: (r - l + 1) * shot.unitsPerPx };
}

// Count pixels matching an ID colour on a row (used for the occlusion-honest
// neck measurement). Returns width in WORLD units plus the pixel extent.
function rowID(shot, row, rgb) {
  let n = 0, l = -1, r = -1;
  for (let x = 0; x < shot.w; x++) {
    const i = (row * shot.w + x) * 4;
    if (Math.abs(shot.data[i] - rgb[0]) < 26 && Math.abs(shot.data[i + 1] - rgb[1]) < 26 && Math.abs(shot.data[i + 2] - rgb[2]) < 26) {
      n++; if (l < 0) l = x; r = x;
    }
  }
  return { count: n, width: n * shot.unitsPerPx, span: l < 0 ? 0 : (r - l + 1) * shot.unitsPerPx };
}

// ── ID-colour pass ────────────────────────────────────────────────────
// Everything renders flat; one named mesh renders in the ID colour. Materials
// are swapped and restored, so the group is untouched afterwards.
function idPass(group, targetName, idHex, other = 0x101010) {
  const saved = [];
  const mID = new THREE.MeshBasicMaterial({ color: idHex });
  const mOther = new THREE.MeshBasicMaterial({ color: other });
  group.traverse((o) => {
    if (!o.isMesh) return;
    saved.push([o, o.material]);
    o.material = (o.name === targetName || (o.userData && o.userData.pnId === targetName)) ? mID : mOther;
  });
  return () => { for (const [o, m] of saved) o.material = m; mID.dispose(); mOther.dispose(); };
}

// Chromaticity (luminance-free colour identity). A lit cylinder swings a LOT in
// brightness and almost not at all in hue, so this is what separates "still the
// neck" from "now the collar" on a real render.
function chroma(d, i) {
  const s = d[i] + d[i + 1] + d[i + 2] + 1e-6;
  return [d[i] / s, d[i + 1] / s];
}
function chromaNear(a, b, tol) { return Math.hypot(a[0] - b[0], a[1] - b[1]) < tol; }

// Grow left/right from the centre column while the pixel still reads as the
// same MATERIAL as the reference. This is the honest "how wide does the neck
// look" measurement: it stops at the collar, at the hair curtain, at the jaw
// shadow boundary — exactly where a viewer's eye stops.
function centreRun(shot, row, ref, tol = 0.030) {
  const cx = Math.round(shot.w / 2);
  const at = (x) => (row * shot.w + x) * 4;
  if (isBG(shot.data, at(cx)) || !chromaNear(chroma(shot.data, at(cx)), ref, tol)) return 0;
  let l = cx, r = cx;
  while (l > 0 && !isBG(shot.data, at(l - 1)) && chromaNear(chroma(shot.data, at(l - 1)), ref, tol)) l--;
  while (r < shot.w - 1 && !isBG(shot.data, at(r + 1)) && chromaNear(chroma(shot.data, at(r + 1)), ref, tol)) r++;
  return (r - l + 1) * shot.unitsPerPx;
}

// ══════════════════════════════════════════════════════════════════════
// 1 · NECK — profile measured at EVERY point along the column
// ══════════════════════════════════════════════════════════════════════
export async function neck(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const { renderer, scene } = stage(512, 512);
  rig(scene);
  const g = buildCharacter(cfg, { detailed: true, probe: true });
  hideBlob(g);
  scene.add(g);
  const m = g.metrics || {};
  // neckBaseY is published by the probe build; fall back to the law that puts
  // the collar exactly `neckH + neckExtra` below the chin.
  const nb = m.neckBaseY ?? (m.chinY - (m.neckH + (cfg.neckExtra ?? 0)));
  const chin = m.chinY, headR = m.headR;
  const b = box(g);
  const cz = (b.max.z + b.min.z) / 2;

  // Frame tight on the collar→crown band so a pixel is small in world units.
  const top = m.crownY, bot = nb - headR * 0.9;
  const center = { x: 0, y: (top + bot) / 2, z: cz };
  const halfH = (top - bot) * 0.56;
  const SH = { w: 512, h: 512, halfH, center };

  const lit = ortho(renderer, scene, { ...SH });
  const litP = ortho(renderer, scene, { ...SH, az: -Math.PI * 0.5 });

  // ID pass (exact, needs the probe build). If the neck was merged away this
  // silently yields nothing and the chromaticity measurement below carries.
  const restore1 = idPass(g, 'neckColumn', 0xff00ff);
  const idF = ortho(renderer, scene, { ...SH });
  const idP = ortho(renderer, scene, { ...SH, az: -Math.PI * 0.5 });
  restore1();
  let hasID = false;
  for (let k = 1; k < 10; k++) {
    if (rowID(idF, idF.rowOf(nb + (chin - nb) * (k / 10)), [255, 0, 255]).count > 3) { hasID = true; break; }
  }

  // Reference chromaticity: the centre of the column, mid-way between collar
  // and chin — guaranteed neck on every build.
  const refRow = lit.rowOf((nb + chin) / 2);
  const refF = chroma(lit.data, (refRow * lit.w + Math.round(lit.w / 2)) * 4);
  const refRowP = litP.rowOf((nb + chin) / 2);
  const refP = chroma(litP.data, (refRowP * litP.w + Math.round(litP.w / 2)) * 4);

  // Slice the column at N heights between the collar seam and the chin.
  const N = opts.slices || 24;
  const slices = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const wy = nb + (chin - nb) * t;
    const rowF = idF.rowOf(wy), rowP = idP.rowOf(wy);
    const f = hasID ? rowID(idF, rowF, [255, 0, 255]).span : centreRun(lit, lit.rowOf(wy), refF);
    const p = hasID ? rowID(idP, rowP, [255, 0, 255]).span : centreRun(litP, litP.rowOf(wy), refP);
    const sil = rowSpan(lit, rowF);
    slices.push({
      t: +t.toFixed(3),
      y: +wy.toFixed(5),
      yInHeadR: +((wy - chin) / headR).toFixed(3),
      frontW: +f.toFixed(5),
      sideW: +p.toFixed(5),
      figureW: sil ? +sil.width.toFixed(4) : null,
    });
  }
  // Head width per row, from the unoccluded silhouette above the chin.
  const headRows = [];
  for (let k = 0; k <= 12; k++) {
    const wy = chin + (m.crownY - chin) * (k / 12);
    const s = rowSpan(lit, lit.rowOf(wy));
    headRows.push({ yInHeadR: +((wy - chin) / headR).toFixed(3), w: s ? +s.width.toFixed(4) : null });
  }

  // ── derived producer numbers ──
  const vis = slices.filter(s => s.frontW > 0);
  const headW = m.headWidth;
  const widths = vis.map(s => s.frontW);   // (mean over every visible row)
  const meanW = widths.length ? widths.reduce((a, x) => a + x, 0) / widths.length : 0;
  const visH = vis.length ? (vis[vis.length - 1].y - vis[0].y) : 0;
  // taper: is the column monotonically narrowing bottom → top? any local bulge?
  // The lowest visible slices are CLIPPED BY THE COLLAR — that is the collar
  // doing its job, not a neck that narrows downward. So the column is judged
  // from its widest visible row upward, which is the part a viewer reads as
  // "the neck", and the taper/bulge test only runs over that stretch.
  let maxI = 0;
  for (let i = 1; i < vis.length; i++) if (vis[i].frontW > vis[maxI].frontW) maxI = i;
  let bulge = 0;
  for (let i = maxI + 1; i < vis.length; i++) {
    const d = vis[i].frontW - vis[i - 1].frontW;
    if (d > 0) bulge = Math.max(bulge, d / Math.max(1e-6, vis[i - 1].frontW));
  }
  const base = vis.length ? vis[maxI].frontW : 0;
  const tip = vis.length ? vis[vis.length - 1].frontW : 0;
  const out = {
    id,
    headR, headWidth: +headW.toFixed(5), neckBaseY: nb, chinY: chin,
    visibleHeight: +visH.toFixed(5),
    visibleWidthMean: +meanW.toFixed(5),
    visibleWidthBase: +base.toFixed(5),
    visibleWidthTop: +tip.toFixed(5),
    // THE producer numbers
    neckOverHeadMean: +(meanW / headW).toFixed(3),
    neckOverHeadBase: +(base / headW).toFixed(3),
    neckOverHeadTop: +(tip / headW).toFixed(3),
    columnAspect: +(visH / Math.max(1e-6, meanW)).toFixed(3),   // >1 = column, <0.7 = plinth
    taperPct: +(((base - tip) / Math.max(1e-6, base)) * 100).toFixed(1),
    maxBulgePct: +(bulge * 100).toFixed(2),
    measuredBy: hasID ? 'id-pass' : 'chromaticity',
    slices, headRows,
    lathe: m.neckLathe || null,
  };
  const shots = { neckF: lit.url, neckP: litP.url, neckIdF: idF.url, neckIdP: idP.url };
  renderer.dispose();
  return { metrics: out, shots };
}

// ══════════════════════════════════════════════════════════════════════
// 2 · BANDS — horizontal shadow lines through the nose
// ══════════════════════════════════════════════════════════════════════
export async function bands(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const { renderer, scene } = stage(512, 512);
  rig(scene);
  const g = buildCharacter(cfg, { detailed: true });
  hideBlob(g);
  if (opts.strip) stripMaps(g);
  // The spectacle frame is a dark torus that crosses the nose band; leaving it
  // in measures the eyewear, not the face. Hidden for this instrument only.
  g.traverse((o) => { if (o.userData && o.userData.pnId === 'eyewear') o.visible = false; });
  scene.add(g);
  const m = g.metrics;
  const hb = box(g.head);
  const center = { x: 0, y: (hb.max.y + hb.min.y) / 2, z: (hb.max.z + hb.min.z) / 2 };
  const halfH = (hb.max.y - hb.min.y) * 0.58;
  const shot = ortho(renderer, scene, { center, halfH, w: 512, h: 512 });

  // Mean luminance per row across the central ±0.34 head-widths (the nose /
  // philtrum column — where a painted band and a sculpt ramp both live).
  const halfPx = Math.round((m.headWidth * 0.34) / shot.unitsPerPx);
  const cxPx = Math.round(shot.w / 2);
  const rows = [];
  for (let y = 0; y < shot.h; y++) {
    let s = 0, n = 0;
    for (let x = cxPx - halfPx; x <= cxPx + halfPx; x++) {
      const i = (y * shot.w + x) * 4;
      if (isBG(shot.data, i)) continue;
      s += 0.2126 * shot.data[i] + 0.7152 * shot.data[i + 1] + 0.0722 * shot.data[i + 2];
      n++;
    }
    rows.push(n > 4 ? s / n : null);
  }
  // |dL/dy| over a 3-row window, expressed per 0.1R of head radius so the
  // number is scale-free and comparable across characters.
  const perR = (headR) => (0.1 * headR) / shot.unitsPerPx;
  const step = Math.max(2, Math.round(perR(m.headR) / 3));
  const grad = [];
  for (let y = step; y < shot.h - step; y++) {
    if (rows[y - step] == null || rows[y + step] == null) { grad.push(null); continue; }
    grad.push(Math.abs(rows[y + step] - rows[y - step]) / (2 * step) * perR(m.headR));
  }
  // Scan the NOSE BAND ONLY: skull-Y −0.20 … −0.75. That is the alae ramp, the
  // sub-nasal plane and the under-nose paint — and it deliberately EXCLUDES the
  // eye line (0.0) and the mouth (−0.79), whose gradients are features, not
  // defects.
  const lo = shot.rowOf(m.headY + m.headR * -0.20), hi = shot.rowOf(m.headY + m.headR * -0.75);
  const peaks = [];
  for (let y = Math.max(step + 1, lo); y <= Math.min(shot.h - step - 2, hi); y++) {
    const v = grad[y - step];
    if (v == null) continue;
    const a = grad[y - step - 1], b = grad[y - step + 1];
    if (a != null && b != null && v >= a && v > b && v > 0.6) {
      peaks.push({ yInHeadR: +((shot.yOf(y) - m.headY) / m.headR).toFixed(3), grad: +v.toFixed(2) });
    }
  }
  peaks.sort((p, q) => q.grad - p.grad);
  let maxG = 0;
  for (let y = Math.max(step + 1, lo); y <= Math.min(shot.h - step - 2, hi); y++) {
    const v = grad[y - step]; if (v != null && v > maxG) maxG = v;
  }
  // SMEAR WIDTH — the producer's actual complaint is not "a gradient exists",
  // it is "a horizontal LINE runs across the face". So measure how far the dark
  // stuff at the nose base spreads SIDEWAYS: at the darkest row in the band,
  // the run of pixels below 92% of the face's median luminance, expressed in
  // nose-widths. A nose casts its own shadow; a smear crosses both cheeks.
  let darkRow = -1, darkVal = 1e9;
  for (let y = lo; y <= hi; y++) if (rows[y] != null && rows[y] < darkVal) { darkVal = rows[y]; darkRow = y; }
  const med = (() => {
    const v = rows.filter(x => x != null).slice().sort((a, b) => a - b);
    return v.length ? v[Math.floor(v.length / 2)] : 0;
  })();
  let smear = 0;
  if (darkRow >= 0) {
    for (let x = 0; x < shot.w; x++) {
      const i = (darkRow * shot.w + x) * 4;
      if (isBG(shot.data, i)) continue;
      const L = 0.2126 * shot.data[i] + 0.7152 * shot.data[i + 1] + 0.0722 * shot.data[i + 2];
      if (L < med * 0.92) smear++;
    }
  }
  const noseW = (m.layout && m.layout.noseWF ? m.layout.noseWF * 2 : 0.17) * m.headWidth;
  renderer.dispose();
  return {
    metrics: {
      id,
      noseBandMaxGradient: +maxG.toFixed(2),
      noseBandPeaks: peaks.slice(0, 6),
      peakCount: peaks.length,
      smearOverNoseWidth: +((smear * shot.unitsPerPx) / Math.max(1e-6, noseW)).toFixed(2),
      darkestRowYInHeadR: darkRow >= 0 ? +((shot.yOf(darkRow) - m.headY) / m.headR).toFixed(3) : null,
    },
    shots: { face: shot.url },
  };
}

// ══════════════════════════════════════════════════════════════════════
// 3 · SKULL — Chad's note: scale + roundness + structure
// ══════════════════════════════════════════════════════════════════════
export async function skull(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const { renderer, scene } = stage(512, 512);
  rig(scene, true);          // flat form light — structure, not colour
  const g = buildCharacter(cfg, { detailed: true });
  hideBlob(g); stripMaps(g);
  scene.add(g);
  const m = g.metrics;
  const hb = box(g.head);
  const center = { x: 0, y: (hb.max.y + hb.min.y) / 2, z: (hb.max.z + hb.min.z) / 2 };
  const halfH = (hb.max.y - hb.min.y) * 0.58;
  const f = ortho(renderer, scene, { center, halfH, w: 512, h: 512 });
  const q = ortho(renderer, scene, { center, halfH, w: 512, h: 512, az: -Math.PI * 0.30 });
  const p = ortho(renderer, scene, { center, halfH, w: 512, h: 512, az: -Math.PI * 0.5 });

  // ROUNDNESS: how close the profile silhouette is to a circle. Sample the
  // silhouette half-width at 20 heights over the cranium (y +0.2R…+1.3R) and
  // compare against the best-fit circle of the same height.
  const wid = [];
  for (let k = 0; k <= 20; k++) {
    const y = m.headY + m.headR * (0.20 + (1.30 - 0.20) * (k / 20));
    const s = rowSpan(p, p.rowOf(y));
    wid.push(s ? s.width : 0);
  }
  const maxW = Math.max(...wid);
  const hCr = m.headR * 1.10;
  // deviation from a circular arc of the same span (0 = perfectly round)
  let dev = 0, n = 0;
  for (let k = 0; k <= 20; k++) {
    const u = (k / 20);                       // 0 at the low sample, 1 at the crown
    const circ = maxW * Math.sqrt(Math.max(0, 1 - u * u));
    dev += Math.abs(wid[k] - circ); n++;
  }
  // STRUCTURE ENERGY: mean |∇L| over the face on the FORM pass. A baseball has
  // one smooth gradient; a structured skull has brow/zygoma/gonion breaks.
  let se = 0, sn = 0;
  for (let y = 2; y < f.h - 2; y += 1) {
    for (let x = 2; x < f.w - 2; x += 1) {
      const i = (y * f.w + x) * 4;
      if (isBG(f.data, i)) continue;
      const L = (a) => 0.2126 * f.data[a] + 0.7152 * f.data[a + 1] + 0.0722 * f.data[a + 2];
      const gx = L(i + 4) - L(i - 4), gy = L(i + f.w * 4) - L(i - f.w * 4);
      se += Math.hypot(gx, gy); sn++;
    }
  }
  // FRONT-VIEW SQUARENESS — the two numbers that actually separate a skull from
  // a ball. An ellipsoid loses ~26% of its width between the parietal eminence
  // and the upper crown, and tapers smoothly away below the cheekbone; a
  // structured skull holds its width up the side wall and turns a corner at the
  // gonion instead.
  const wAt = (yR) => { const s2 = rowSpan(f, f.rowOf(m.headY + m.headR * yR)); return s2 ? s2.width : 0; };
  const wPar = wAt(0.35), wCrown = wAt(0.95), wCheek = wAt(-0.45), wGon = wAt(-0.75);
  renderer.dispose();
  return {
    metrics: {
      id,
      headR: m.headR, headWidth: m.headWidth, headHeight: m.headHeight,
      headWOverH: m.headWOverH,
      cranialHoldPct: +((wCrown / Math.max(1e-6, wPar)) * 100).toFixed(1),
      gonialHoldPct: +((wGon / Math.max(1e-6, wCheek)) * 100).toFixed(1),
      headCountSkull: +(m.crownY / (m.crownY - m.chinY)).toFixed(3),
      profileRoundnessDev: +(dev / n / Math.max(1e-6, maxW)).toFixed(4),
      structureEnergy: +(se / Math.max(1, sn)).toFixed(3),
      jawOverCranialGeo: m.jawOverCranialGeo,
    },
    shots: { skullF: f.url, skullQ: q.url, skullP: p.url },
  };
}

// ══════════════════════════════════════════════════════════════════════
// 4 · HANDS — chirality
// ══════════════════════════════════════════════════════════════════════
export async function hands(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const { renderer, scene } = stage(512, 512);
  rig(scene);
  const g = buildCharacter(cfg, { detailed: true, probe: true });
  hideBlob(g);
  scene.add(g);
  g.updateMatrixWorld(true);

  const out = { id, sides: {} };
  const shots = {};
  for (const [label, armKey, sideSign] of [['left', 'leftArm', -1], ['right', 'rightArm', 1]]) {
    const arm = g[armKey];
    if (!arm) continue;
    let palm = null, thumb = null;
    arm.traverse((o) => {
      if (o.userData && o.userData.pnId === 'palm') palm = o;
      if (o.userData && o.userData.pnId === 'thumb') thumb = o;
    });
    if (!palm || !thumb) { out.sides[label] = { error: 'no probe meshes' }; continue; }
    const pw = new THREE.Vector3(), tw = new THREE.Vector3();
    palm.getWorldPosition(pw); thumb.getWorldPosition(tw);
    const dx = tw.x - pw.x, dz = tw.z - pw.z;
    // sideSign is the world-x side the arm hangs on. outboard = same sign.
    out.sides[label] = {
      palmWorld: [+pw.x.toFixed(4), +pw.y.toFixed(4), +pw.z.toFixed(4)],
      thumbWorld: [+tw.x.toFixed(4), +tw.y.toFixed(4), +tw.z.toFixed(4)],
      thumbDX: +dx.toFixed(4),
      thumbDZ: +dz.toFixed(4),
      // +1 = thumb sits OUTBOARD (away from the midline); −1 = INBOARD
      thumbLateral: dx * sideSign > 0 ? 1 : -1,
      // +1 = thumb sits ANTERIOR (forward of the palm centre)
      thumbAnterior: dz > 0 ? 1 : -1,
    };
    // close-ups: front, outboard-side, and from below (the palm-up read)
    const hbb = box(palm);
    const c = { x: (hbb.max.x + hbb.min.x) / 2, y: (hbb.max.y + hbb.min.y) / 2, z: (hbb.max.z + hbb.min.z) / 2 };
    const hh = Math.max(hbb.max.y - hbb.min.y, hbb.max.x - hbb.min.x) * 0.95;
    shots[`hand_${label}_f`] = ortho(renderer, scene, { center: c, halfH: hh, w: 384, h: 384 }).url;
    shots[`hand_${label}_o`] = ortho(renderer, scene, { center: c, halfH: hh, w: 384, h: 384, az: sideSign * Math.PI * 0.5 }).url;
    shots[`hand_${label}_up`] = ortho(renderer, scene, { center: c, halfH: hh, w: 384, h: 384, el: -Math.PI * 0.42 }).url;
  }
  // Mirror-consistency: a correctly built pair is x-mirrored.
  const L = out.sides.left, R = out.sides.right;
  if (L && R && !L.error && !R.error) {
    // A correctly built pair is the MIRROR of one another across x=0: the thumb
    // offsets must have equal-and-opposite x and IDENTICAL z. A pair that is
    // merely ROTATED 180 degrees (equal-and-opposite on BOTH axes) is the
    // chirality bug — one hand is on backwards.
    const dxMirror = Math.abs(L.thumbDX + R.thumbDX) < 0.002;
    const dzSame = Math.abs(L.thumbDZ - R.thumbDZ) < 0.002;
    out.mirrorConsistent = dxMirror && dzSame;
    out.rotatedNotMirrored = dxMirror && Math.abs(L.thumbDZ + R.thumbDZ) < 0.002 && Math.abs(L.thumbDZ) > 0.002;
    out.thumbAnteriorBothHands = L.thumbAnterior > 0 && R.thumbAnterior > 0;
    out.thumbPlacement = Math.abs(L.thumbDZ) > Math.abs(L.thumbDX) ? 'anterior' : (L.thumbLateral > 0 ? 'outboard' : 'inboard');
  }
  renderer.dispose();
  return { metrics: out, shots };
}

// ══════════════════════════════════════════════════════════════════════
// 5 · HAIR — strand energy (a bonnet is flat; hair has strands)
// ══════════════════════════════════════════════════════════════════════
export async function hair(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const { renderer, scene } = stage(512, 512);
  rig(scene);
  const g = buildCharacter(cfg, { detailed: true, probe: true });
  hideBlob(g);
  scene.add(g);
  g.updateMatrixWorld(true);
  const m = g.metrics;
  const hb = box(g.head);
  const center = { x: 0, y: (hb.max.y + hb.min.y) / 2, z: (hb.max.z + hb.min.z) / 2 };
  const halfH = (hb.max.y - hb.min.y) * 0.58;
  const views = { hairF: 0, hairQ: -Math.PI * 0.30, hairP: -Math.PI * 0.5, hairB: -Math.PI };
  const shots = {};
  let energy = 0, count = 0;
  const grads = [];
  for (const [name, az] of Object.entries(views)) {
    const s = ortho(renderer, scene, { center, halfH, w: 512, h: 512, az });
    shots[name] = s.url;
    if (name !== 'hairF') continue;
    // Sample the CROWN band (above the brow) — hair only.
    const y0 = s.rowOf(m.headY + m.headR * 1.30), y1 = s.rowOf(m.headY + m.headR * 0.45);
    for (let y = y0 + 2; y < y1 - 2; y++) {
      for (let x = 2; x < s.w - 2; x++) {
        const i = (y * s.w + x) * 4;
        if (isBG(s.data, i)) continue;
        const L = (a) => 0.2126 * s.data[a] + 0.7152 * s.data[a + 1] + 0.0722 * s.data[a + 2];
        const gm = Math.abs(L(i + 4) - L(i - 4)) + Math.abs(L(i + s.w * 4) - L(i - s.w * 4));
        energy += gm; count++; grads.push(gm);
      }
    }
  }
  // STRAND vs SEAM. Strand texture is high-frequency everywhere (the mean);
  // a shell junction is one LINE of very high gradient (the tail). Reporting
  // only the mean cannot tell "hair" from "a hard polygon seam across the
  // crown", which is what the round-3 critic logged on Karen.
  grads.sort((a, b) => a - b);
  const pct = (p) => grads.length ? grads[Math.min(grads.length - 1, Math.floor(grads.length * p))] : 0;
  const seamMax = +pct(0.998).toFixed(1);
  const seamOverStrand = +(seamMax / Math.max(1e-6, energy / Math.max(1, count))).toFixed(2);

  // THE PALE LOCK — a streak is a highlight IN the hair; a slab is a lens that
  // stands off it. Measured by ID pass: how much of the head it owns, how far
  // BELOW the eye line it hangs, and how far FORWARD of the ear plane it sits.
  const streaks = [];
  g.traverse((o) => { if (o.isMesh && o.userData.pnId === 'hairStreak') streaks.push(o); });
  let streakM = {};
  if (streaks.length) {
    const sb = new THREE.Box3();
    for (const o of streaks) sb.union(new THREE.Box3().setFromObject(o));
    const restore = idPassMulti(g, { hairStreak: 0xff00ff });
    const sF = ortho(renderer, scene, { center, halfH, w: 512, h: 512 });
    const sQ = ortho(renderer, scene, { center, halfH, w: 512, h: 512, az: -Math.PI * 0.30 });
    restore();
    const cnt = (s) => { let n = 0, h = 0; for (let i = 0; i < s.data.length; i += 4) { if (!isBG(s.data, i)) h++; if (near(s.data, i, [255, 0, 255])) n++; } return [n, h]; };
    const [nF, hF] = cnt(sF), [nQ, hQ] = cnt(sQ);
    streakM = {
      streakPctFront: +(nF / Math.max(1, hF) * 100).toFixed(2),
      streakPctQ34: +(nQ / Math.max(1, hQ) * 100).toFixed(2),
      streakLowYInHeadR: +((sb.min.y - m.headY) / m.headR).toFixed(3),
      streakFrontZInHeadR: +((sb.max.z - (g.head.position.z || 0)) / m.headR).toFixed(3),
    };
  }
  renderer.dispose();
  return {
    metrics: {
      id,
      strandEnergy: +(energy / Math.max(1, count)).toFixed(3),
      seamMax, seamOverStrand, samples: count, ...streakM,
    },
    shots,
  };
}

// ══════════════════════════════════════════════════════════════════════
// 6 · EXPRESSIONS — geometry AND paint, side by side
// ══════════════════════════════════════════════════════════════════════
const EXPR = ['neutral', 'angry', 'smug', 'worried', 'hurt', 'victory'];

export async function expr(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const shots = {};
  const metrics = { id, geoDelta: {}, paintDelta: {} };

  for (const mode of ['paint', 'form']) {
    const { renderer, scene } = stage(384, 384);
    rig(scene, mode === 'form');
    const g = buildCharacter(cfg, { detailed: true });
    hideBlob(g);
    if (mode === 'form') stripMaps(g);
    scene.add(g);
    const m = g.metrics;
    const hb = box(g.head);
    const center = { x: 0, y: (hb.max.y + hb.min.y) / 2, z: (hb.max.z + hb.min.z) / 2 };
    const halfH = (hb.max.y - hb.min.y) * 0.56;

    const setExpr = (name) => {
      // texture channel
      if (mode === 'paint' && g.faceTextures && g.faceMesh) {
        const t = g.faceTextures[name];
        if (t) { g.faceMesh.material.map = t; g.faceMesh.material.needsUpdate = true; }
      }
      // geometry channel (hybrid) — morph influences, if the build has them
      const fm = g.faceMesh;
      if (fm && fm.morphTargetInfluences && g.faceMorphIndex) {
        fm.morphTargetInfluences.fill(0);
        const i = g.faceMorphIndex[name];
        if (i != null) fm.morphTargetInfluences[i] = 1;
      }
      if (g.headMorphIndex) {
        g.head.traverse((o) => {
          if (!o.isMesh || !o.morphTargetInfluences) return;
          o.morphTargetInfluences.fill(0);
          const i = g.headMorphIndex[name];
          if (i != null) o.morphTargetInfluences[i] = 1;
        });
      }
    };

    const base = {};
    for (const name of EXPR) {
      setExpr(name);
      const s = ortho(renderer, scene, { center, halfH, w: 384, h: 384 });
      shots[`${mode}_${name}`] = s.url;
      if (name === 'neutral') { base.data = s.data; base.w = s.w; base.h = s.h; continue; }
      // how much did this expression actually change the image?
      let diff = 0, n = 0;
      for (let i = 0; i < s.data.length; i += 4) {
        if (isBG(s.data, i) && isBG(base.data, i)) continue;
        diff += Math.abs(s.data[i] - base.data[i]) + Math.abs(s.data[i + 1] - base.data[i + 1]) + Math.abs(s.data[i + 2] - base.data[i + 2]);
        n++;
      }
      const v = +(diff / Math.max(1, n) / 3).toFixed(3);
      if (mode === 'form') metrics.geoDelta[name] = v; else metrics.paintDelta[name] = v;
    }
    // 3/4 sheet on the paint pass only (the producer's read distance)
    if (mode === 'paint') {
      for (const name of EXPR) {
        setExpr(name);
        shots[`q34_${name}`] = ortho(renderer, scene, { center, halfH, w: 384, h: 384, az: -Math.PI * 0.28 }).url;
      }
    }
    renderer.dispose();
  }
  metrics.hasGeometryChannel = Object.values(metrics.geoDelta).some(v => v > 0.05);
  return { metrics, shots };
}

// The same nose-band scan on a FORM pass. Running both attributes the band:
// if bandsForm ≈ bands, the line is GEOMETRY; if bands >> bandsForm, it is paint.
export async function bandsForm(id, opts = {}) {
  const r = await bands(id, { ...opts, strip: true });
  return { metrics: { ...r.metrics, pass: 'form' }, shots: { faceForm: r.shots.face } };
}

// ══════════════════════════════════════════════════════════════════════
// 7 · SHOES — "they read as discs" (round-3 critic)
// ══════════════════════════════════════════════════════════════════════
// Every number comes off a render of ONE foot (the other leg is hidden so the
// far shoe cannot pollute a silhouette), at the two angles that matter: the
// game's own iso camera (az 45°, el 30° — constants.js CAMERA) and profile.
export async function shoes(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const { renderer, scene } = stage(512, 512);
  rig(scene);
  const g = buildCharacter(cfg, { detailed: true, probe: true });
  hideBlob(g);
  if (g.leftLeg) g.leftLeg.visible = false;
  scene.add(g);
  g.updateMatrixWorld(true);

  // frame on the right foot
  const feet = [];
  g.traverse((o) => {
    if (!o.isMesh || (o.userData.pnId !== 'shoe' && o.userData.pnId !== 'sole')) return;
    const b = new THREE.Box3().setFromObject(o);
    if ((b.max.x + b.min.x) / 2 > 0) feet.push(o);          // the RIGHT foot only
  });
  const bb = new THREE.Box3();
  for (const o of feet) bb.union(new THREE.Box3().setFromObject(o));
  if (!feet.length) { renderer.dispose(); return { metrics: { id, error: 'no shoe probe' }, shots: {} }; }
  const center = { x: (bb.max.x + bb.min.x) / 2, y: (bb.max.y + bb.min.y) / 2, z: (bb.max.z + bb.min.z) / 2 };
  const halfH = Math.max(bb.max.z - bb.min.z, bb.max.y - bb.min.y) * 0.72;
  const SH = { center, halfH, w: 512, h: 512 };

  const prof = ortho(renderer, scene, { ...SH, az: -Math.PI * 0.5 });
  const iso = ortho(renderer, scene, { ...SH, az: Math.PI * 0.25, el: Math.PI / 6 });
  const front = ortho(renderer, scene, { ...SH });
  // The PLAN view has to see the whole footprint; from 86° the body and the
  // thigh hide the heel, which is why an un-masked top shot reported a 1.8
  // aspect on a foot that measures 2.5 (an instrument artefact, not a shoe).
  const hidden = [];
  g.traverse((o) => { if (o.isMesh && o.visible && !feet.includes(o)) { o.visible = false; hidden.push(o); } });
  const top = ortho(renderer, scene, { ...SH, el: 1.50 });

  // ID pass: upper vs sole, so the sole's share of the silhouette is exact.
  const restore = idPassMulti(g, { shoe: 0xff00ff, sole: 0x00ffff });
  const idTop = ortho(renderer, scene, { ...SH, el: 1.50 });
  for (const o of hidden) o.visible = true;
  const idProf = ortho(renderer, scene, { ...SH, az: -Math.PI * 0.5 });
  const idIso = ortho(renderer, scene, { ...SH, az: Math.PI * 0.25, el: Math.PI / 6 });
  restore();

  const cnt = (shot, rgb) => { let n = 0; for (let i = 0; i < shot.data.length; i += 4) if (near(shot.data, i, rgb)) n++; return n; };
  const extent = (shot, rgbs) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let y = 0; y < shot.h; y++) for (let x = 0; x < shot.w; x++) {
      const i = (y * shot.w + x) * 4;
      if (!rgbs.some(c => near(shot.data, i, c))) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < x0 ? null : { x0, x1, y0, y1, w: (x1 - x0 + 1) * shot.unitsPerPx, h: (y1 - y0 + 1) * shot.unitsPerPx };
  };
  const MAG = [255, 0, 255], CYA = [0, 255, 255];
  const eProf = extent(idProf, [MAG, CYA]);
  const eTop = extent(idTop, [MAG, CYA]);

  // In PROFILE the camera sits on −x looking at +x, so screen-right is +z: the
  // toe points right. Overhang is measured about the ANKLE AXIS = the LEG AXIS,
  // which is world z = 0 by construction (the legs are built on z=0 and the foot
  // group carries its own +0.026 offset). Reading the axis off the render's own
  // framing keeps this exact instead of guessing at a collar row that the
  // trouser is standing in front of.
  let toeHeel = null, heelOver = null, toeOver = null;
  if (eProf) {
    const ankleCol = idProf.w / 2 + (0 - center.z) / idProf.unitsPerPx;
    heelOver = (ankleCol - eProf.x0) * idProf.unitsPerPx;
    toeOver = (eProf.x1 - ankleCol) * idProf.unitsPerPx;
    toeHeel = +(toeOver / Math.max(1e-6, heelOver)).toFixed(2);
  }
  // TOE BOX BLUNTNESS from the plan view: half-width at 92% of the foot's
  // length ÷ the widest half-width. A knife point → ~0.1; a real shoe ~0.3–0.45.
  let blunt = null;
  if (eTop) {
    const rowW = (yy) => {
      let l = 1e9, r = -1e9;
      for (let x = 0; x < idTop.w; x++) {
        const i = (yy * idTop.w + x) * 4;
        if (near(idTop.data, i, MAG) || near(idTop.data, i, CYA)) { if (x < l) l = x; if (x > r) r = x; }
      }
      return r < l ? 0 : r - l + 1;
    };
    let maxW = 0;
    for (let y = eTop.y0; y <= eTop.y1; y++) maxW = Math.max(maxW, rowW(y));
    // +z (the toe) points DOWN-screen in this view, so 92% of the length is
    // 92% of the way from y0 to y1.
    const wToe = rowW(Math.round(eTop.y0 + (eTop.y1 - eTop.y0) * 0.92));
    blunt = +(wToe / Math.max(1, maxW)).toFixed(3);
  }
  // SOLE LINE: the share of the lit silhouette the sole owns, per view. Zero =
  // a monolithic blob (the "disc"), which is what the critic was looking at.
  const soleShare = (idShot) => {
    const s = cnt(idShot, CYA), u = cnt(idShot, MAG);
    return +(s / Math.max(1, s + u)).toFixed(3);
  };
  // …and the actual VALUE STEP it draws on the lit render, measured across the
  // sole's top edge in profile (a sole you cannot see is not a sole).
  let step = 0;
  if (eProf) {
    const L = (sh, i) => 0.2126 * sh.data[i] + 0.7152 * sh.data[i + 1] + 0.0722 * sh.data[i + 2];
    const cols = [];
    for (let x = eProf.x0 + 3; x <= eProf.x1 - 3; x += 2) {
      let best = 0;
      for (let y = eProf.y1 - 2; y > eProf.y1 - Math.max(4, (eProf.y1 - eProf.y0) * 0.55); y--) {
        const i = (y * prof.w + x) * 4, j = ((y - 2) * prof.w + x) * 4;
        if (isBG(prof.data, i) || isBG(prof.data, j)) continue;
        best = Math.max(best, Math.abs(L(prof, i) - L(prof, j)));
      }
      if (best) cols.push(best);
    }
    cols.sort((a, b) => a - b);
    step = cols.length ? +cols[Math.floor(cols.length / 2)].toFixed(1) : 0;
  }
  renderer.dispose();
  return {
    metrics: {
      id,
      footprintAspect: eTop ? +(eTop.h / eTop.w).toFixed(2) : null,   // length ÷ width, plan
      profileAspect: eProf ? +(eProf.w / eProf.h).toFixed(2) : null,  // length ÷ height
      toeHeelRatio: toeHeel,
      toeBoxBlunt: blunt,
      soleShareProfile: soleShare(idProf),
      soleShareIso: soleShare(idIso),
      soleValueStep: step,
      lengthWorld: eProf ? +eProf.w.toFixed(4) : null,
      heightWorld: eProf ? +eProf.h.toFixed(4) : null,
      heelOverWorld: heelOver != null ? +heelOver.toFixed(4) : null,
      toeOverWorld: toeOver != null ? +toeOver.toFixed(4) : null,
    },
    shots: { shoeProf: prof.url, shoeIso: iso.url, shoeFront: front.url, shoeTop: top.url },
  };
}

function near(d, i, rgb) {
  return Math.abs(d[i] - rgb[0]) < 40 && Math.abs(d[i + 1] - rgb[1]) < 40 && Math.abs(d[i + 2] - rgb[2]) < 40;
}
// idPass for several named parts at once (userData.pnId or mesh.name).
function idPassMulti(group, map, other = 0x101010) {
  const saved = [];
  const mats = {};
  for (const [k, hex] of Object.entries(map)) mats[k] = new THREE.MeshBasicMaterial({ color: hex });
  const mOther = new THREE.MeshBasicMaterial({ color: other });
  group.traverse((o) => {
    if (!o.isMesh) return;
    saved.push([o, o.material]);
    const key = (o.userData && o.userData.pnId) || o.name;
    o.material = mats[key] || mOther;
  });
  return () => { for (const [o, m] of saved) o.material = m; for (const m of Object.values(mats)) m.dispose(); mOther.dispose(); };
}

// ══════════════════════════════════════════════════════════════════════
// 8 · GARMENT — "the blazer still reads tunic-ish at fight distance"
// ══════════════════════════════════════════════════════════════════════
// A blazer is legible when THREE things are true in the silhouette: the shell
// narrows at the waist, its hem is a HARD horizontal edge, and that edge sits
// near the hip with a trouser column continuing below it. A tunic fails all
// three — one straight column, a soft domed bottom, low on the thigh.
export async function garment(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const { renderer, scene } = stage(512, 640);
  rig(scene);
  const g = buildCharacter(cfg, { detailed: true, probe: true });
  hideBlob(g);
  scene.add(g);
  g.updateMatrixWorld(true);
  const m = g.metrics;
  const hipY = m.legLength;
  const center = { x: 0, y: hipY + m.torsoH * 0.35, z: 0 };
  const halfH = m.torsoH * 1.15;
  const SH = { center, halfH, w: 512, h: 640 };
  const lit = ortho(renderer, scene, { ...SH });
  const litQ = ortho(renderer, scene, { ...SH, az: -Math.PI * 0.28 });

  // The ARMS hang across the chest and waist rows on a female build, so an
  // un-masked silhouette clips both to the same visible width and reports
  // waist/chest = 1.000 on garments that do have a waist. Hidden for this pass.
  const armsWere = [g.leftArm, g.rightArm].filter(Boolean).map(a => [a, a.visible]);
  for (const [a] of armsWere) a.visible = false;
  const restore = idPassMulti(g, { jacketShell: 0xff00ff });
  const idF = ortho(renderer, scene, { ...SH });
  restore();
  for (const [a, v] of armsWere) a.visible = v;
  const MAG = [255, 0, 255];
  const wAt = (wy) => {
    const row = idF.rowOf(wy);
    if (row < 0 || row >= idF.h) return 0;
    let l = 1e9, r = -1e9;
    for (let x = 0; x < idF.w; x++) {
      const i = (row * idF.w + x) * 4;
      if (near(idF.data, i, MAG)) { if (x < l) l = x; if (x > r) r = x; }
    }
    return r < l ? 0 : (r - l + 1) * idF.unitsPerPx;
  };
  // hem: the LOWEST row of jacket per column, over the central 70% of the shell
  const bottomOf = [];
  let minX = 1e9, maxX = -1e9;
  for (let x = 0; x < idF.w; x++) {
    let lo = -1;
    for (let y = idF.h - 1; y >= 0; y--) if (near(idF.data, (y * idF.w + x) * 4, MAG)) { lo = y; break; }
    bottomOf[x] = lo;
    if (lo >= 0) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
  }
  const c0 = Math.round(minX + (maxX - minX) * 0.15), c1 = Math.round(maxX - (maxX - minX) * 0.15);
  const ys = [];
  for (let x = c0; x <= c1; x++) if (bottomOf[x] >= 0) ys.push(idF.yOf(bottomOf[x]));
  const hemY = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : null;
  const hemSd = ys.length ? Math.sqrt(ys.reduce((a, b) => a + (b - hemY) ** 2, 0) / ys.length) : null;

  // the value step the hem draws on the LIT render (blazer vs trouser)
  let hemStep = 0;
  if (hemY != null) {
    const L = (i) => 0.2126 * lit.data[i] + 0.7152 * lit.data[i + 1] + 0.0722 * lit.data[i + 2];
    const rowA = lit.rowOf(hemY + 0.012), rowB = lit.rowOf(hemY - 0.012);
    const vals = [];
    for (let x = c0; x <= c1; x += 2) {
      const i = (rowA * lit.w + x) * 4, j = (rowB * lit.w + x) * 4;
      if (isBG(lit.data, i) || isBG(lit.data, j)) continue;
      vals.push(Math.abs(L(i) - L(j)));
    }
    vals.sort((a, b) => a - b);
    hemStep = vals.length ? +vals[Math.floor(vals.length / 2)].toFixed(1) : 0;
  }
  const wChest = wAt(hipY + m.torsoH * 0.60);
  const wWaist = wAt(hipY + m.torsoH * 0.34);
  const wHip = wAt(hipY + m.torsoH * 0.06);
  renderer.dispose();
  return {
    metrics: {
      id,
      hemY: hemY != null ? +hemY.toFixed(4) : null,
      hemBelowHip: hemY != null ? +(hipY - hemY).toFixed(4) : null,
      hemBelowHipOverTorso: hemY != null ? +((hipY - hemY) / m.torsoH).toFixed(3) : null,
      hemFlatness: hemSd != null ? +(hemSd / m.torsoH).toFixed(4) : null,   // 0 = a straight hem
      hemValueStep: hemStep,
      waistOverChest: +(wWaist / Math.max(1e-6, wChest)).toFixed(3),
      hipOverWaist: +(wHip / Math.max(1e-6, wWaist)).toFixed(3),
      hemHeightOverFigure: hemY != null ? +(hemY / (m.crownY)).toFixed(3) : null,
      torsoH: m.torsoH, legLength: m.legLength,
    },
    shots: { garmentF: lit.url, garmentQ: litQ.url, garmentId: idF.url },
  };
}

// ══════════════════════════════════════════════════════════════════════
// 9 · GRIP — does the held prop actually touch the hand?
// ══════════════════════════════════════════════════════════════════════
export async function grip(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const { renderer, scene } = stage(448, 448);
  rig(scene);
  const g = buildCharacter(cfg, { detailed: true, probe: true });
  hideBlob(g);
  scene.add(g);
  g.updateMatrixWorld(true);
  const props = [], palms = [];
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.pnId === 'prop') props.push(o);
    if (o.userData.pnId === 'palm') palms.push(o);
  });
  if (!props.length || !palms.length) { renderer.dispose(); return { metrics: { id, error: 'no prop/palm probe' }, shots: {} }; }
  const pb = new THREE.Box3(); for (const o of props) pb.union(new THREE.Box3().setFromObject(o));
  let best = null;
  for (const p of palms) {
    const hb = new THREE.Box3().setFromObject(p);
    const gap = new THREE.Vector3(
      Math.max(0, Math.max(hb.min.x - pb.max.x, pb.min.x - hb.max.x)),
      Math.max(0, Math.max(hb.min.y - pb.max.y, pb.min.y - hb.max.y)),
      Math.max(0, Math.max(hb.min.z - pb.max.z, pb.min.z - hb.max.z)));
    const d = gap.length();
    const hand = Math.max(hb.max.x - hb.min.x, hb.max.y - hb.min.y);
    if (!best || d < best.gapWorld) best = { gapWorld: +d.toFixed(4), gapOverHand: +(d / Math.max(1e-6, hand)).toFixed(3), handSize: +hand.toFixed(4) };
  }
  const c = { x: (pb.max.x + pb.min.x) / 2, y: (pb.max.y + pb.min.y) / 2 + 0.03, z: (pb.max.z + pb.min.z) / 2 };
  const halfH = Math.max(pb.max.y - pb.min.y, 0.14) * 1.5;
  const shots = {
    gripF: ortho(renderer, scene, { center: c, halfH, w: 448, h: 448 }).url,
    gripQ: ortho(renderer, scene, { center: c, halfH, w: 448, h: 448, az: -Math.PI * 0.28 }).url,
    gripP: ortho(renderer, scene, { center: c, halfH, w: 448, h: 448, az: Math.PI * 0.5 }).url,
  };
  renderer.dispose();
  return { metrics: { id, ...best, contact: best.gapWorld < 0.006 }, shots };
}

// ══════════════════════════════════════════════════════════════════════
// 10 · BILL — Chad's backwards cap
// ══════════════════════════════════════════════════════════════════════
export async function bill(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const { renderer, scene } = stage(448, 448);
  rig(scene);
  const g = buildCharacter(cfg, { detailed: true, probe: true });
  hideBlob(g);
  scene.add(g);
  g.updateMatrixWorld(true);
  const m = g.metrics;
  const hb = box(g.head);
  const center = { x: 0, y: (hb.max.y + hb.min.y) / 2, z: (hb.max.z + hb.min.z) / 2 };
  const halfH = (hb.max.y - hb.min.y) * 0.62;
  const SH = { center, halfH, w: 448, h: 448 };
  const views = { billP: -Math.PI * 0.5, billQ: -Math.PI * 0.28, billF: 0, billB: -Math.PI * 0.80 };
  const shots = {};
  for (const [k, az] of Object.entries(views)) shots[k] = ortho(renderer, scene, { ...SH, az }).url;

  const billMeshes = [];
  g.traverse((o) => { if (o.isMesh && o.userData.pnId === 'capBill') billMeshes.push(o); });
  const billMesh = billMeshes[0] || null;
  const restore = idPassMulti(g, { capBill: 0xff00ff });
  const idP = ortho(renderer, scene, { ...SH, az: -Math.PI * 0.5 });
  const idQ = ortho(renderer, scene, { ...SH, az: -Math.PI * 0.28 });
  const idF = ortho(renderer, scene, { ...SH });
  const idB = ortho(renderer, scene, { ...SH, az: -Math.PI * 0.80 });
  restore();
  const MAG = [255, 0, 255];
  const px = (s) => { let n = 0; for (let i = 0; i < s.data.length; i += 4) if (near(s.data, i, MAG)) n++; return n; };
  const headPx = (s) => { let n = 0; for (let i = 0; i < s.data.length; i += 4) if (!isBG(s.data, i)) n++; return n; };
  let proj = null;
  if (billMesh) {
    const bb = new THREE.Box3();
    for (const b of billMeshes) bb.union(new THREE.Box3().setFromObject(b));
    // Box3.expandByObject does NOT honour `visible`, so the head box has to be
    // built by hand from everything that is not the bill (hiding the mesh and
    // re-boxing the group silently returns the same box — it reported a 0.63R
    // bill as projecting 0.000R past a head it plainly sticks out of).
    const skull = new THREE.Box3();
    g.head.traverse((o) => { if (o.isMesh && !billMeshes.includes(o)) skull.union(new THREE.Box3().setFromObject(o)); });
    proj = {
      billBackZ: +bb.min.z.toFixed(4),
      headBackZ: +skull.min.z.toFixed(4),
      // how far past the back of the head the bill actually reaches
      projectionOverHeadR: +((skull.min.z - bb.min.z) / m.headR).toFixed(3),
      billLengthOverHeadR: +((bb.max.z - bb.min.z) / m.headR).toFixed(3),
      dropOverHeadR: +((bb.max.y - bb.min.y) / m.headR).toFixed(3),
    };
  }
  renderer.dispose();
  return {
    metrics: {
      id, ...proj,
      billVisibleProfilePct: +(px(idP) / Math.max(1, headPx(idP)) * 100).toFixed(2),
      billVisibleQ34Pct: +(px(idQ) / Math.max(1, headPx(idQ)) * 100).toFixed(2),
      billVisibleFrontPct: +(px(idF) / Math.max(1, headPx(idF)) * 100).toFixed(2),
      billVisibleBack34Pct: +(px(idB) / Math.max(1, headPx(idB)) * 100).toFixed(2),
    },
    shots,
  };
}

// ══════════════════════════════════════════════════════════════════════
// 11 · IRIS — do the six expression textures agree on eye colour?
// ══════════════════════════════════════════════════════════════════════
export async function iris(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const g = buildCharacter(cfg, { detailed: true });
  const L = (g.metrics && g.metrics.layout) || null;
  if (!L || !g.faceTextures) return { metrics: { id, error: 'no layout/textures' }, shots: {} };
  const out = { id, perExpr: {} };
  const shots = {};
  let ref = null;
  for (const [name, tex] of Object.entries(g.faceTextures)) {
    const img = tex && tex.image;
    if (!img) continue;
    const S = img.width;
    const cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const cx2 = cv.getContext('2d', { willReadFrequently: true });
    cx2.drawImage(img, 0, 0);
    const ex = Math.round(S * (0.5 + L.eyeDXF)), ey = Math.round(S * L.eyeF);
    const rw = Math.round(S * L.eyeWF * 0.42), rh = Math.round(S * L.eyeHF * 0.5);
    const d = cx2.getImageData(ex - rw, ey - rh, rw * 2, rh * 2).data;
    // The painted LID is skin, and on the lidded expressions (smug/hurt) it
    // covers the sampling box. Counting it as "the iris" produced a 147-unit
    // false drift on every character in the cast — the instrument was reporting
    // a closed eye as a colour change. Skin-coloured pixels are therefore
    // rejected, and a box with too little iris left is reported as OCCLUDED
    // rather than as a colour.
    const skin = cfg.skinColor ?? 0xe8b48f;
    const sr = (skin >> 16) & 255, sg = (skin >> 8) & 255, sb = skin & 255;
    let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (lum > 205 || lum < 26) continue;                 // sclera / pupil+lash
      if (Math.hypot(d[i] - sr, d[i + 1] - sg, d[i + 2] - sb) < 58) continue;   // lid / skin
      const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
      if (mx - mn < 6 && lum > 120) continue;              // flat highlight
      r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++;
    }
    out.perExpr[name] = {
      mean: n ? [Math.round(r / n), Math.round(gg / n), Math.round(b / n)] : null,
      samples: n,
    };
    // a 2× crop of the eye so it can be LOOKED at, not just measured
    const cc = document.createElement('canvas'); cc.width = rw * 4; cc.height = rh * 4;
    cc.getContext('2d').drawImage(cv, ex - rw, ey - rh, rw * 2, rh * 2, 0, 0, rw * 4, rh * 4);
    shots[`eye_${name}`] = cc.toDataURL('image/png');
  }
  // An expression whose lids are down has no iris to compare; self-calibrate the
  // occlusion cut against the most-open expression instead of a magic constant.
  const maxN = Math.max(...Object.values(out.perExpr).map(v => v.samples));
  for (const v of Object.values(out.perExpr)) {
    v.occluded = v.samples < maxN * 0.35;
    if (v.occluded) v.mean = null;
  }
  ref = out.perExpr.neutral ? out.perExpr.neutral.mean : null;
  let worst = 0, worstName = null;
  for (const [k, v] of Object.entries(out.perExpr)) {
    if (k === 'neutral' || !v.mean || !ref) continue;
    const d = Math.hypot(v.mean[0] - ref[0], v.mean[1] - ref[1], v.mean[2] - ref[2]);
    if (d > worst) { worst = d; worstName = k; }
  }
  out.maxDriftFromNeutral = +worst.toFixed(1);
  out.worstExpr = worstName;
  out.occludedExprs = Object.entries(out.perExpr).filter(([, v]) => v.occluded).map(([k]) => k);
  out.consistent = worst < 26;
  return { metrics: out, shots };
}

window.__pn = { neck, bands, bandsForm, skull, hands, hair, expr, shoes, garment, grip, bill, iris, THREE, CHARACTER_CONFIGS };
