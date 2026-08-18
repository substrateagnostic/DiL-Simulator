// BODY-BOB measurement stage (dev-only; served by the Vite dev server, NEVER
// imported by src/). Companion to tools/_bb-probe.mjs.
//
// The note this exists for (producer, 2026-08-15, off a Janet-quiz closeup):
//   "we need to kill/fix the full body bob that distorts the neck/clothing/etc
//    in closeup shots like this one"
//
// The v7-era fix (52eace4) killed the SQUASH & STRETCH on the merged torso
// shell and the phase-shifted head bob, and left a single translation applied
// to torso+arms+head TOGETHER while the legs stay planted. That is still a
// deformation: on a v7 build the jacket hem belongs to `group.body` and the
// trousers belong to `group.leftLeg/rightLeg`, so the whole upper body slides
// up and down THROUGH the pelvis every cycle. It is 0.35x in combat and 1.0x
// at exploration — which is where the producer is looking.
//
// Everything here is measured off the LIVE transforms (exact) and off a
// RENDER (honest), never off a formula. Two render numbers per crop:
//   raw       — frame-diff of a FIXED crop across the cycle (what the eye sees)
//   registered — the same diff after shifting each frame by the figure's own
//                silhouette-bottom travel, which removes rigid translation and
//                leaves ONLY deformation. A rigid body registers to ~0.
import * as THREE from 'three';
import { buildCharacter } from '/src/entities/CharacterBuilder.js';
import { CHARACTER_CONFIGS } from '/src/data/characters.js';
import { CharacterAnimator } from '/src/entities/CharacterAnimator.js';
import { ANIM } from '/src/utils/constants.js';

const BG = 0xd8d8d8;
const BGV = [216, 216, 216];

function stage(w, h) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  return { renderer, scene };
}

function rig(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.62));
  const key = new THREE.DirectionalLight(0xfff3e6, 1.55); key.position.set(0.55, 1.35, 1.6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.55); fill.position.set(-1.4, 0.5, 1.1); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.5); rim.position.set(-0.6, 0.9, -1.6); scene.add(rim);
}

function hideBlob(root) {
  root.traverse((o) => { if (o.name === 'blobShadow' || (o.userData && o.userData.blobShadow)) o.visible = false; });
}

// Orthographic shot at a FIXED world frame (never re-framed per sample — a
// camera that re-centres on the subject hides exactly the motion we measure).
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
  };
}

const isBG = (d, i) => Math.abs(d[i] - BGV[0]) < 7 && Math.abs(d[i + 1] - BGV[1]) < 7 && Math.abs(d[i + 2] - BGV[2]) < 7;
const luma = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

// Mean |ΔL| and changed-pixel share over a row band, with an optional SUB-PIXEL
// row shift applied to frame B (registration). Sub-pixel matters: at closeup a
// 0.5 px misregistration across the jaw/collar edge is worth ~10 units of |ΔL|
// on its own, which would swamp the deformation the diff exists to find.
function bandDiff(a, b, r0, r1, w, shift = 0) {
  const f = Math.floor(shift), frac = shift - f;
  let sum = 0, n = 0, changed = 0;
  for (let y = r0; y < r1; y++) {
    const y0 = y + f, y1 = y0 + 1;
    if (y0 < 0 || y1 >= a.h) continue;
    for (let x = 0; x < w; x++) {
      const ia = (y * w + x) * 4;
      const i0 = (y0 * w + x) * 4, i1 = (y1 * w + x) * 4;
      const lb = luma(b.data, i0) * (1 - frac) + luma(b.data, i1) * frac;
      const d = Math.abs(luma(a.data, ia) - lb);
      sum += d; n++; if (d > 8) changed++;
    }
  }
  return n ? { mean: sum / n, changedPct: (changed / n) * 100 } : { mean: 0, changedPct: 0 };
}

function silhouetteRows(s) {
  let top = -1, bot = -1;
  for (let y = 0; y < s.h; y++) {
    let hit = false;
    for (let x = 0; x < s.w; x++) if (!isBG(s.data, (y * s.w + x) * 4)) { hit = true; break; }
    if (hit) { if (top < 0) top = y; bot = y; }
  }
  return { top, bot };
}

const range = (a) => Math.max(...a) - Math.min(...a);
const r5 = (v) => +v.toFixed(5);

// ══════════════════════════════════════════════════════════════════════
// bob(id, opts) — one full animation cycle, measured on transforms AND pixels
// ══════════════════════════════════════════════════════════════════════
//   opts.mode    'idle' | 'walk' | 'sit'          (default 'idle')
//   opts.combat  true  -> setCombatMode(true)     (default false = EXPLORATION)
//   opts.samples 16
//   opts.px      render width (default 420 x 700) — a CLOSEUP: the figure fills
//                the frame, which is the framing the producer is judging.
export async function bob(id, opts = {}) {
  const cfg = opts.config || CHARACTER_CONFIGS[id];
  const mode = opts.mode || 'idle';
  const W = opts.w || 420, H = opts.h || 700;
  const { renderer, scene } = stage(W, H);
  rig(scene);
  const g = buildCharacter(cfg, { detailed: true });
  hideBlob(g);
  scene.add(g);
  const anim = new CharacterAnimator(g);
  // Freeze the blink: it is a random-interval eyelid scale and would land in
  // some samples and not others, contaminating a diff that is about the bob.
  anim._blinkIn = 1e9;
  if (opts.combat === true) anim.setCombatMode(true);
  // A/B SWITCH — `legacy: true` reproduces the PRE-FIX bob exactly (the v7
  // `_breathe`: one offset on torso + head + arms only, sin phase, at the
  // ANIM.IDLE_BOUNCE / WALK_BOUNCE amplitudes) without touching src/, so the
  // instrument can be shown to fail on the defect it exists to catch. Verified
  // against the shipped pre-fix code: 39.99 mm idle / 119.49 mm walk.
  if (opts.legacy) {
    anim._settleBody = function () {
      const dy = Math.sin(this.time * (this.isWalking ? ANIM.WALK_SPEED : ANIM.IDLE_SPEED))
        * (this.isWalking ? ANIM.WALK_BOUNCE : ANIM.IDLE_BOUNCE) * this.bobScale;
      for (const n of [this.group.body, this.group.head, this.group.leftArm, this.group.rightArm]) {
        if (!n) continue;
        if (n.userData.bobBaseY == null) n.userData.bobBaseY = n.position.y;
        n.position.y = n.userData.bobBaseY + dy;
      }
    };
  }
  if (mode === 'walk') anim.setWalking(true);
  if (mode === 'sit') anim.setSitting(true);

  const m = g.metrics;
  const legLength = m.legLength;
  const chinY = m.chinY;

  // ONE fixed camera frame for the whole take, solved on the FIRST animated
  // frame, so nothing about the framing tracks the motion. `root` is the seated
  // hip drop (setSitting writes group.position.y) — the crops are world-space,
  // so they have to carry it.
  anim.update(1 / 120);
  const root = g.position.y;
  const frame = opts.frame || 'full';
  const FRAMES = {
    full:  { y: root + legLength + m.torsoH * 0.9, halfH: 0.72 },
    neck:  { y: root + chinY - 0.055,              halfH: 0.24 },   // jaw → lapel
    waist: { y: root + legLength + 0.02,           halfH: 0.24 },   // hem ↔ trouser
  };
  const center = { x: 0, y: FRAMES[frame].y, z: 0 };
  const halfH = opts.halfH || FRAMES[frame].halfH;
  const SH = { center, halfH, w: W, h: H, az: 0.28, el: 0.10 };

  // Crops, in WORLD units, converted to rows off the first shot.
  const first = ortho(renderer, scene, SH);
  const rowOf = first.rowOf;
  const neckBand = [rowOf(root + chinY + 0.03), rowOf(root + chinY - 0.13)];         // jaw → collar
  const waistBand = [rowOf(root + legLength + 0.13), rowOf(root + legLength - 0.05)]; // hem ↔ trouser
  const clampRow = (r) => Math.max(0, Math.min(H - 1, r));

  const speed = mode === 'walk' ? ANIM.WALK_SPEED : ANIM.IDLE_SPEED;
  const CYCLE = (2 * Math.PI) / speed;
  const N = opts.samples || 16;
  const DT = 1 / 240;

  // Every DIRECT child of the character group, labelled. `buildCharacter` adds
  // far more than the four nodes the old `_breathe` list knew about — the
  // STATIC DRESSING node (neck column, collar, shirt V, tie, belt), the
  // dowager hump, the pelvis, the skirt/rise and the blob shadow are all
  // siblings. Anything that moves while its neighbours do not IS the defect.
  const named = new Map([[g.body, 'body'], [g.head, 'head'], [g.leftArm, 'leftArm'],
    [g.rightArm, 'rightArm'], [g.leftLeg, 'leftLeg'], [g.rightLeg, 'rightLeg']]);
  // Ground décor (the contact shadow, and in combat the bounce card + AO
  // ellipse) is pinned to the FLOOR by design and is excluded from the shear
  // number — it is supposed to stand still while the body moves.
  const isDecor = (o) => (o.userData && o.userData.blobShadow === true)
    || (o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry'
      && Math.abs(o.rotation.x + Math.PI / 2) < 0.01);
  const kids = g.children.map((c, i) => {
    const b = new THREE.Box3().setFromObject(c);
    return {
      node: c,
      decor: isDecor(c),
      label: named.get(c) || c.name
        || `child${i}[y ${b.min.y.toFixed(2)}..${b.max.y.toFixed(2)}]`,
    };
  });

  const per = [];
  const frames = [];
  const shots = {};
  for (let k = 0; k < N; k++) {
    const target = (k / N) * CYCLE + 1 / 120;
    while (anim.time < target) anim.update(DT);
    const s = ortho(renderer, scene, SH);
    frames.push(s);
    if (k % Math.max(1, Math.floor(N / 4)) === 0) shots[`${mode}_f${String(k).padStart(2, '0')}`] = s.url;
    const sil = silhouetteRows(s);
    per.push({
      t: +anim.time.toFixed(4),
      rootY: g.position.y,
      rootRotX: g.rotation.x,
      bodyY: g.body ? g.body.position.y : 0,
      headY: g.head ? g.head.position.y : 0,
      armY: g.rightArm ? g.rightArm.position.y : 0,
      legY: g.rightLeg ? g.rightLeg.position.y : 0,
      bodyScaleY: g.body ? g.body.scale.y : 1,
      bodyScaleX: g.body ? g.body.scale.x : 1,
      silTop: sil.top, silBot: sil.bot,
      // WORLD y of the torso/head/arm, i.e. what the camera actually sees
      wBodyY: g.position.y + (g.body ? g.body.position.y : 0),
      wHeadY: g.position.y + (g.head ? g.head.position.y : 0),
      wLegY: g.position.y + (g.rightLeg ? g.rightLeg.position.y : 0),
      kidY: kids.map(k => k.node.position.y),
    });
  }

  // ── pixel warp ────────────────────────────────────────────────────────
  // Registration shift: how far the figure's own silhouette bottom moved from
  // frame 0. Subtracting it removes rigid translation.
  const base = frames[0];
  const bands = {
    neck: [clampRow(neckBand[0]), clampRow(neckBand[1])],
    waist: [clampRow(waistBand[0]), clampRow(waistBand[1])],
  };
  const px = {};
  for (const [name, [r0, r1]] of Object.entries(bands)) {
    let rawMax = 0, rawSum = 0, regMax = 0, regSum = 0, upMax = 0, upSum = 0, chMax = 0;
    for (let k = 1; k < frames.length; k++) {
      const raw = bandDiff(base, frames[k], r0, r1, W, 0);
      // Registration shifts come off the LIVE TRANSFORMS, not the silhouette —
      // at a true closeup the silhouette is clipped by the frame edge and a
      // silhouette-derived shift is degenerate (measured: silTop ±0 on a crop
      // that cuts the crown).
      const rows = (dy) => -dy / base.unitsPerPx;
      // FOOT-registered: shift out whole-figure (root) travel.
      const reg = bandDiff(base, frames[k], r0, r1, W, rows(per[k].rootY - per[0].rootY));
      // HEAD-registered: shift out UPPER-BODY travel. This is the number that
      // separates "the torso is sliding" from "the torso is deforming" — a
      // rigid slide registers to ~0 here, a real warp does not.
      const up = bandDiff(base, frames[k], r0, r1, W, rows(per[k].wHeadY - per[0].wHeadY));
      rawSum += raw.mean; regSum += reg.mean; upSum += up.mean;
      if (raw.mean > rawMax) rawMax = raw.mean;
      if (reg.mean > regMax) regMax = reg.mean;
      if (up.mean > upMax) upMax = up.mean;
      if (raw.changedPct > chMax) chMax = raw.changedPct;
    }
    px[name] = {
      rows: [r0, r1],
      rawMeanAbsL: +(rawSum / (frames.length - 1)).toFixed(3),
      rawWorstAbsL: +rawMax.toFixed(3),
      rawWorstChangedPct: +chMax.toFixed(2),
      footRegMeanAbsL: +(regSum / (frames.length - 1)).toFixed(3),
      footRegWorstAbsL: +regMax.toFixed(3),
      headRegMeanAbsL: +(upSum / (frames.length - 1)).toFixed(3),
      headRegWorstAbsL: +upMax.toFixed(3),
    };
  }

  // Head-registered DIFF PICTURE of the worst frame — a diff number nobody can
  // see the shape of is a number that gets argued with.
  {
    let worst = 1, worstV = -1;
    for (let k = 1; k < frames.length; k++) {
      const d = bandDiff(base, frames[k], bands.neck[0], bands.neck[1], W,
        -(per[k].wHeadY - per[0].wHeadY) / base.unitsPerPx).mean;
      if (d > worstV) { worstV = d; worst = k; }
    }
    const shift = -(per[worst].wHeadY - per[0].wHeadY) / base.unitsPerPx;
    const f = Math.floor(shift), frac = shift - f;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ia = (y * W + x) * 4;
      const y0 = Math.max(0, Math.min(H - 1, y + f)), y1 = Math.max(0, Math.min(H - 1, y0 + 1));
      const lb = luma(frames[worst].data, (y0 * W + x) * 4) * (1 - frac) + luma(frames[worst].data, (y1 * W + x) * 4) * frac;
      const d = Math.min(255, Math.abs(luma(base.data, ia) - lb) * 4);
      img.data[ia] = d; img.data[ia + 1] = d; img.data[ia + 2] = d; img.data[ia + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    shots[`${mode}_headregdiff_f${String(worst).padStart(2, '0')}`] = c.toDataURL('image/png');
  }

  renderer.dispose();
  const headH = m.headHeight;
  const hemVsHip = per.map(p => p.bodyY - p.legY);
  const headVsBody = per.map(p => p.headY - p.bodyY);
  const armVsBody = per.map(p => p.armY - p.bodyY);
  return {
    metrics: {
      id, mode, combat: opts.combat === true,
      // THE DEFECT, in metres and in head-heights: how far the merged torso
      // shell (and its jacket hem) travels THROUGH the pelvis per cycle.
      hemThroughHipM: r5(range(hemVsHip)),
      hemThroughHipHeads: r5(range(hemVsHip) / headH),
      hemThroughHipPct: +((range(hemVsHip) / m.torsoH) * 100).toFixed(2),
      // seams the v7 fix already closed — these must stay 0
      headVsBodyM: r5(range(headVsBody)),
      armVsBodyM: r5(range(armVsBody)),
      shellScaleYRange: r5(range(per.map(p => p.bodyScaleY))),
      shellScaleXRange: r5(range(per.map(p => p.bodyScaleX))),
      // whole-body channels (0 before the fix; this is where the motion goes)
      rootYRangeM: r5(range(per.map(p => p.rootY))),
      rootPitchRangeRad: r5(range(per.map(p => p.rootRotX))),
      // what the camera sees
      // THE SHEAR TABLE. Local travel of every direct child, in mm. A figure
      // that moves as one piece has ONE number here (or all zeros with the
      // motion on the root); a figure that shears has some children moving and
      // some not, and the seams between them are the warp.
      childTravelMm: kids.map((k, i) => ({
        label: k.label + (k.decor ? ' (ground décor)' : ''),
        mm: +(range(per.map(p => p.kidY[i])) * 1000).toFixed(2),
      })).sort((a, b) => b.mm - a.mm),
      // THE HEADLINE. Differential travel between BODY children: 0 means the
      // figure moved as one piece; anything else is a seam being pulled open.
      shearMm: (() => {
        const t = kids.filter(k => !k.decor).map((k) => range(per.map(p => p.kidY[kids.indexOf(k)])));
        return +((Math.max(...t) - Math.min(...t)) * 1000).toFixed(2);
      })(),
      bodyTravelMm: (() => {
        const t = kids.filter(k => !k.decor).map((k) => range(per.map(p => p.kidY[kids.indexOf(k)])));
        return +(Math.max(...t) * 1000).toFixed(2);
      })(),
      silTopRangePx: range(per.map(p => p.silTop)),
      silBotRangePx: range(per.map(p => p.silBot)),
      pxPerHeadHeight: +(headH / first.unitsPerPx).toFixed(1),
      px,
      per: per.map(p => ({
        t: p.t, root: r5(p.rootY), pitch: r5(p.rootRotX),
        hemThroughHip: r5(p.bodyY - p.legY), silTop: p.silTop, silBot: p.silBot,
      })),
    },
    shots,
  };
}

window.__bb = { bob, THREE, CHARACTER_CONFIGS };
