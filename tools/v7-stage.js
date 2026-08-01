// V7 measurement stage — dev-only module served by the Vite dev server.
// NEVER imported by src/, so it is never part of a production bundle.
//
// Exposes window.__v7 with a single `shoot(id, opts)` entry point that builds a
// character on a PLAIN background with NO GROUND (charmetrics RULE 1) and can
// strip material maps (RULE 2), then returns PNG data URLs plus a geometry-truth
// metrics block.
import * as THREE from 'three';
import { buildCharacter } from '/src/entities/CharacterBuilder.js';
import { CHARACTER_CONFIGS } from '/src/data/characters.js';

const BG = 0xd8d8d8;

function stripMaps(root, flat) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      for (const k of ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'sheenColorMap']) {
        if (m[k]) { m[k] = null; }
      }
      if (flat) m.color = new THREE.Color(0xc9c9c9);
      m.needsUpdate = true;
    }
  });
}

// The blob-shadow decal is a ground-plane cheat; it corrupts the foreground mask.
function hideBlob(root) {
  root.traverse((o) => { if (o.name === 'blobShadow' || (o.isMesh && o.userData && o.userData.blobShadow)) o.visible = false; });
}

function worldBox(obj) {
  const b = new THREE.Box3();
  b.setFromObject(obj);
  return b;
}

// Measure the silhouette of a render buffer: returns row widths + bbox.
function maskStats(gl, w, h) {
  const buf = new Uint8Array(w * h * 4);
  gl.readRenderTargetPixels ? null : null;
  return buf;
}

export function makeStage(width, height) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  return { renderer, scene };
}

function lightRig(scene, flat) {
  scene.add(new THREE.AmbientLight(0xffffff, flat ? 1.05 : 0.62));
  if (!flat) {
    const key = new THREE.DirectionalLight(0xfff3e6, 1.55);
    key.position.set(0.55, 1.35, 1.6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xdfe8ff, 0.55);
    fill.position.set(-1.4, 0.5, 1.1);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.5);
    rim.position.set(-0.6, 0.9, -1.6);
    scene.add(rim);
  } else {
    // form pass: a single soft top-front light so surface topology reads as
    // gradient without colour or texture doing any of the work
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(0.35, 1.2, 1.3);
    scene.add(key);
  }
}

// Geometry truth. Everything is measured off the built group, not off pixels,
// so numbers never drift with framing.
function measure(group) {
  const m = group.metrics || {};
  const full = worldBox(group);
  let tris = 0, meshes = 0;
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    meshes++;
    const g = o.geometry;
    tris += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
  });
  const out = {
    ...m,
    triangles: Math.round(tris),
    meshCount: meshes,
    figureTop: full.max.y,
    figureBottom: full.min.y,
    figureHeight: full.max.y - full.min.y,
    figureWidth: full.max.x - full.min.x,
    figureDepth: full.max.z - full.min.z,
  };
  if (m.crownY != null && m.chinY != null) {
    out.headVert = m.crownY - m.chinY;
    out.headCountSkull = +(m.crownY / (m.crownY - m.chinY)).toFixed(3);
  }
  if (group.head) {
    const hb = worldBox(group.head);
    out.headHullTop = hb.max.y;          // includes hair
    out.headHullWidth = hb.max.x - hb.min.x;
    if (m.chinY != null) {
      out.headVertHair = hb.max.y - m.chinY;
      out.headCountHair = +(hb.max.y / (hb.max.y - m.chinY)).toFixed(3);
    }
  }
  return out;
}

const VIEWS = {
  front: { az: 0, el: 0 },
  q34: { az: -Math.PI * 0.28, el: 0 },
  prof: { az: -Math.PI * 0.5, el: 0 },
  back34: { az: -Math.PI * 0.78, el: 0 },
};

export async function shoot(id, opts = {}) {
  const cfgOverride = opts.config || null;
  const config = cfgOverride || CHARACTER_CONFIGS[id];
  if (!config) throw new Error('no config: ' + id);
  const W = opts.width || 640, H = opts.height || 1024;
  const flat = opts.flat === true;
  const { renderer, scene } = makeStage(W, H);
  lightRig(scene, flat);
  const group = buildCharacter(config, { detailed: true });
  hideBlob(group);
  if (opts.strip) stripMaps(group, flat);
  scene.add(group);

  const metrics = measure(group);
  const box = worldBox(group);
  const cx = (box.max.x + box.min.x) / 2;
  const cy = (box.max.y + box.min.y) / 2;
  const cz = (box.max.z + box.min.z) / 2;

  const shots = {};
  const R = 6;

  const renderOrtho = (az, el, center, halfH, aspectW, aspectH) => {
    renderer.setSize(aspectW, aspectH, false);
    const halfW = halfH * (aspectW / aspectH);
    const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.01, 40);
    cam.position.set(
      center.x + Math.sin(az) * Math.cos(el) * R,
      center.y + Math.sin(el) * R,
      center.z + Math.cos(az) * Math.cos(el) * R
    );
    cam.lookAt(center.x, center.y, center.z);
    cam.updateProjectionMatrix();
    renderer.render(scene, cam);
    return renderer.domElement.toDataURL('image/png');
  };

  const figHalf = (box.max.y - box.min.y) * 0.54;
  for (const [name, v] of Object.entries(VIEWS)) {
    if (opts.views && !opts.views.includes(name)) continue;
    shots[name] = renderOrtho(v.az, v.el, { x: cx, y: cy, z: cz }, figHalf, W, H);
  }

  // head close-ups — framed on the skull, at the head's own centre
  if (!opts.views || opts.views.includes('head')) {
    const hb = worldBox(group.head);
    const hc = { x: 0, y: (hb.max.y + hb.min.y) / 2, z: (hb.max.z + hb.min.z) / 2 };
    const hHalf = (hb.max.y - hb.min.y) * 0.62;
    shots.head = renderOrtho(0, 0, hc, hHalf, 512, 512);
    shots.headq = renderOrtho(-Math.PI * 0.30, 0, hc, hHalf, 512, 512);
    shots.headp = renderOrtho(-Math.PI * 0.5, 0, hc, hHalf, 512, 512);
  }

  // pixel silhouette of the front view, for jaw/cranial width ratios
  const px = (() => {
    renderer.setSize(512, 820, false);
    const halfH = (box.max.y - box.min.y) * 0.52;
    const halfW = halfH * (512 / 820);
    const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.01, 40);
    cam.position.set(cx, cy, cz + R);
    cam.lookAt(cx, cy, cz);
    cam.updateProjectionMatrix();
    renderer.render(scene, cam);
    const c = document.createElement('canvas');
    c.width = 512; c.height = 820;
    const ctx = c.getContext('2d');
    ctx.drawImage(renderer.domElement, 0, 0);
    const d = ctx.getImageData(0, 0, 512, 820).data;
    const rows = [];
    let minX = 512, maxX = -1, minY = 820, maxY = -1;
    for (let y = 0; y < 820; y++) {
      let l = -1, r = -1;
      for (let x = 0; x < 512; x++) {
        const i = (y * 512 + x) * 4;
        const isBg = Math.abs(d[i] - 216) < 7 && Math.abs(d[i + 1] - 216) < 7 && Math.abs(d[i + 2] - 216) < 7;
        if (!isBg) { if (l < 0) l = x; r = x; }
      }
      rows.push(l < 0 ? 0 : (r - l + 1));
      if (l >= 0) { minX = Math.min(minX, l); maxX = Math.max(maxX, r); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    }
    // world-Y ↔ pixel-row mapping
    const yTop = cy + halfH, yBot = cy - halfH;
    const rowOf = (wy) => Math.round((yTop - wy) / (yTop - yBot) * 820);
    return { rows, bbox: { minX, maxX, minY, maxY }, rowOf, yTop, yBot };
  })();

  const widthAtY = (wy) => {
    const r = px.rowOf(wy);
    if (r < 0 || r >= px.rows.length) return null;
    // world units per pixel
    const upp = (px.yTop - px.yBot) / 820;
    return px.rows[r] * upp;
  };
  if (metrics.crownY != null) {
    const R0 = metrics.headR;
    metrics.pxHeadWidthAtEye = widthAtY(metrics.eyeY);
    metrics.pxWidthAtCheek = widthAtY(metrics.cheekY != null ? metrics.cheekY : metrics.eyeY - 0.15 * R0);
    metrics.pxWidthAtJaw = widthAtY(metrics.jawY != null ? metrics.jawY : metrics.chinY + 0.6 * R0);
    metrics.pxCranialWidth = widthAtY(metrics.crownY - 0.30 * (metrics.crownY - metrics.chinY));
    if (metrics.pxCranialWidth) {
      metrics.jawOverCranial = +(metrics.pxWidthAtJaw / metrics.pxCranialWidth).toFixed(3);
    }
    metrics.pxFigureTopRow = px.bbox.minY;
    metrics.pxFigureBotRow = px.bbox.maxY;
  }

  renderer.dispose();
  return { id, metrics, shots };
}

// Six-expression proof: build once, swap the painted texture onto the conformed
// patch, render the head each time. Verifies both that the set exists and that
// every texture still lands on the v7 layout.
export async function shootExpressions(id) {
  const config = CHARACTER_CONFIGS[id];
  const W = 384, H = 384;
  const { renderer, scene } = makeStage(W, H);
  lightRig(scene, false);
  const group = buildCharacter(config, { detailed: true });
  hideBlob(group);
  scene.add(group);
  const hb = worldBox(group.head);
  const hc = { y: (hb.max.y + hb.min.y) / 2, z: (hb.max.z + hb.min.z) / 2 };
  const halfH = (hb.max.y - hb.min.y) * 0.60;
  const halfW = halfH;
  const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.01, 40);
  cam.position.set(0, hc.y, hc.z + 6);
  cam.lookAt(0, hc.y, hc.z);
  cam.updateProjectionMatrix();
  const out = {};
  const names = ['neutral', 'angry', 'smug', 'worried', 'hurt', 'victory'];
  for (const n of names) {
    const tex = group.faceTextures && group.faceTextures[n];
    if (!tex || !group.faceMesh) { out[n] = null; continue; }
    group.faceMesh.material.map = tex;
    group.faceMesh.material.needsUpdate = true;
    renderer.render(scene, cam);
    out[n] = renderer.domElement.toDataURL('image/png');
  }
  renderer.dispose();
  return out;
}

// ARENA CLOSE-UP — the honest producer-bar test. This instantiates the REAL
// CombatScene (its lighting rig, its stage, its scales) and simply moves the
// camera in on the enemy's head, so what we judge is the face under the venue
// wash it will actually be seen in — not a studio light of our own choosing.
export async function shootArena(id, opts = {}) {
  const { CombatScene } = await import('/src/combat/CombatScene.js');
  const W = opts.width || 720, H = opts.height || 720;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const cs = new CombatScene();
  cs.setCombatants([id], [], null);
  const e = cs.enemyGroups[0];
  e.group.position.x = e.baseX;              // skip the slide-in
  if (opts.expression && e.animator) e.animator.setExpression(opts.expression);
  cs.scene.updateMatrixWorld(true);          // Box3 reads stale child matrices otherwise
  const hb = new THREE.Box3().setFromObject(e.group.head ? e.group.head : e.group);
  const cy = (hb.max.y + hb.min.y) / 2;
  const cam = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
  const dist = opts.dist || 1.05;
  cam.position.set(e.baseX + (opts.az || 0) * dist, cy + 0.10, e.baseZ + dist);
  cam.lookAt(e.baseX, cy, e.baseZ);
  cam.updateProjectionMatrix();
  renderer.render(cs.scene, cam);
  const url = renderer.domElement.toDataURL('image/png');
  renderer.dispose();
  return url;
}

window.__v7 = { shoot, shootExpressions, shootArena, THREE, CHARACTER_CONFIGS };
