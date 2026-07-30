// F3 garage tear diagnostic: enter parking_garage, dump city geometry, walk-burst frames.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.argv.find(a => a.startsWith('--out='))?.slice(6) || 'garage_before';
const ROOM = process.argv.find(a => a.startsWith('--room='))?.slice(7) || 'parking_garage';
// --base lets this run against a second dev server serving a different commit,
// which is how the BEFORE half of the tear evidence is captured from a clean
// worktree at HEAD instead of from an already-fixed working tree.
const BASE = process.argv.find(a => a.startsWith('--base='))?.slice(7) || 'http://localhost:5173';
const DIR = path.resolve('screenshots/f3');
fs.mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto(`${BASE}/?dev&fixture=act7&shot=${ROOM}&hud=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
await page.waitForTimeout(1800);

const gpu = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  const d = gl.getExtension('WEBGL_debug_renderer_info');
  const r = d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
  return { renderer: r, software: /swiftshader|software|llvmpipe|basic render/i.test(r), dpr: devicePixelRatio };
});
console.log('GPU', JSON.stringify(gpu));

const diag = await page.evaluate(() => {
  const E = window.__engine;
  const cb = E.cityBackdrop;
  const THREE = window.__THREE || null;
  const out = { streetLevel: cb.streetLevel, groupPos: cb.group.position.toArray(), tod: cb.tod, towers: [], overlaps: [], camera: {} };
  const cam = E.camera;
  out.camera = {
    pos: cam.position.toArray(), type: cam.type,
    left: cam.left, right: cam.right, top: cam.top, bottom: cam.bottom, near: cam.near, far: cam.far, zoom: cam.zoom,
  };
  cb.group.updateMatrixWorld(true);
  const boxes = [];
  for (let i = 0; i < cb.buildings.length; i++) {
    const b = cb.buildings[i];
    const m = b.mesh;
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
    const rec = {
      i, h: +b.h.toFixed(2), variant: b.variant, radius: +b.radius.toFixed(1),
      scaleY: m.scale.y, posY: +m.position.y.toFixed(2),
      min: bb.min.toArray().map(v => +v.toFixed(2)), max: bb.max.toArray().map(v => +v.toFixed(2)),
      size: [+(bb.max.x - bb.min.x).toFixed(2), +(bb.max.y - bb.min.y).toFixed(2), +(bb.max.z - bb.min.z).toFixed(2)],
    };
    out.towers.push(rec); boxes.push({ rec, bb });
  }
  // HQ tower
  if (cb.hqTower) {
    const m = cb.hqTower; m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld);
    const rec = { i: 'HQ', h: 46, variant: 1, radius: 18, scaleY: m.scale.y, posY: +m.position.y.toFixed(2),
      min: bb.min.toArray().map(v => +v.toFixed(2)), max: bb.max.toArray().map(v => +v.toFixed(2)),
      size: [+(bb.max.x - bb.min.x).toFixed(2), +(bb.max.y - bb.min.y).toFixed(2), +(bb.max.z - bb.min.z).toFixed(2)],
      visible: m.visible };
    out.towers.push(rec); boxes.push({ rec, bb });
  }
  // pairwise AABB overlap
  for (let a = 0; a < boxes.length; a++) {
    for (let b2 = a + 1; b2 < boxes.length; b2++) {
      const A = boxes[a].bb, B = boxes[b2].bb;
      if (A.intersectsBox(B)) {
        const ox = Math.min(A.max.x, B.max.x) - Math.max(A.min.x, B.min.x);
        const oy = Math.min(A.max.y, B.max.y) - Math.max(A.min.y, B.min.y);
        const oz = Math.min(A.max.z, B.max.z) - Math.max(A.min.z, B.min.z);
        out.overlaps.push({ a: boxes[a].rec.i, b: boxes[b2].rec.i,
          overlap: [+ox.toFixed(2), +oy.toFixed(2), +oz.toFixed(2)],
          aRad: boxes[a].rec.radius, bRad: boxes[b2].rec.radius });
      }
    }
  }
  return out;
});
fs.writeFileSync(path.join(DIR, `${OUT}_diag.json`), JSON.stringify(diag, null, 1));
console.log('streetLevel', diag.streetLevel, 'groupPos', diag.groupPos, 'tod', diag.tod);
console.log('towers', diag.towers.length, 'OVERLAPS', diag.overlaps.length);
for (const o of diag.overlaps.slice(0, 40)) console.log('  overlap', o.a, '<->', o.b, 'by', o.overlap, 'radii', o.aRad, o.bRad);

// ── walk burst: hold ArrowRight, capture frames; then ArrowLeft ──
async function burst(tag, key, n, ms) {
  await page.keyboard.down(key);
  for (let i = 0; i < n; i++) {
    await page.waitForTimeout(ms);
    await page.screenshot({ path: path.join(DIR, `${OUT}_${tag}_${String(i).padStart(2, '0')}.png`) });
  }
  await page.keyboard.up(key);
  await page.waitForTimeout(250);
}
await burst('right', 'ArrowRight', 10, 110);
await burst('left', 'ArrowLeft', 10, 110);
await page.screenshot({ path: path.join(DIR, `${OUT}_still.png`) });
console.log('frames ->', DIR);
await browser.close();
