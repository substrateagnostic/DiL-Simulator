// FIX ROUND 2 — B8, the number the producer call needs.
//
// The playtest note is "cubicle farm: green strip mid-screen". Round 1
// identified it correctly (it is the authored severanceRunner, not an
// artifact) and darkened it one step, 0x3f7d57 -> 0x2f5f43, plus a carpet
// weave. The judge's reading is that the strip still stands ~30 luma proud of
// the floor and the symptom survives. Whether that is a defect or the Lumon
// identity doing its job is a producer call, NOT a build task — so this tool
// does the one thing a producer call needs and nothing else: it puts the
// number on the table, for the shipped value and for one further step down.
//
// The patches are LOCATED BY PROJECTION, not by hardcoded pixel boxes: the
// runner band's own mesh centre and a floor point two tiles to its side are
// projected through the live camera, so the sample follows the art if the
// layout ever moves. Luma is Rec.709 read off the SAVED PNG (the renderer does
// not set preserveDrawingBuffer; an in-page probe measures 0).
//
//   node tools/_fr2-b8-runner.mjs [--alt=0x24493a]   sample an alternative green too

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import path from 'node:path';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const ALT = process.argv.find(a => a.startsWith('--alt='))?.slice(6) || '0x24493a';
const OUT = 'screenshots/fix-round-2/b8-runner';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const patchLuma = async (file, boxes) => {
  const src = `data:image/png;base64,${readFileSync(path.resolve(file)).toString('base64')}`;
  return page.evaluate(async ({ s, boxes: bs }) => {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    const out = {};
    for (const [name, b] of Object.entries(bs)) {
      const px = Math.max(0, Math.min(im.width - b.w, Math.round(b.x - b.w / 2)));
      const py = Math.max(0, Math.min(im.height - b.h, Math.round(b.y - b.h / 2)));
      const d = x.getImageData(px, py, b.w, b.h).data;
      let sum = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; }
      out[name] = +(sum / n).toFixed(2);
      out[name + 'Rgb'] = [0,1,2].map(k => { let t = 0; for (let i = k; i < d.length; i += 4) t += d[i]; return Math.round(t / n); });
    }
    return out;
  }, { s: src, boxes });
};

try {
  await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act3&shot=cubicle_farm`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1600);

  // Aim at the runner and hide the interface, then hand back the two sample
  // points in SCREEN pixels.
  const aim = await page.evaluate(async () => {
    const ex = window.__explore, eng = window.__engine;
    const THREE = await import('/node_modules/three/build/three.module.js');
    const room = ex.roomManager.currentRoom;
    let band = null;
    room.scene.traverse((o) => {
      if (!band && o.userData?.furnitureType === 'severanceRunner') band = o;
    });
    if (!band) return { error: 'no severanceRunner in this room' };
    // Push the shipping ortho frustum in, or the sample boxes land on cubicles.
    const aspect = eng.width / eng.height;
    const zoom = 3.0;
    eng.camera.left = -zoom * aspect; eng.camera.right = zoom * aspect;
    eng.camera.top = zoom; eng.camera.bottom = -zoom;
    eng.camera.updateProjectionMatrix();
    eng.setTiltShift?.(false);
    const c = new THREE.Vector3(); band.getWorldPosition(c);
    const cc = ex.camera;
    cc.clearBounds?.();
    cc.snapTo(c.x, c.z, 0.05);
    cc.follow(c.x, c.z, 0.05);
    cc.follow = () => {};
    if (ex.player?.mesh) ex.player.mesh.visible = false;
    for (const sel of ['.exploration-hud', '.na-root']) {
      const el = document.querySelector(sel); if (el) el.style.display = 'none';
    }
    const toPx = (v) => {
      const q = v.clone().project(eng.camera);
      return { x: Math.round((q.x + 1) / 2 * eng.width), y: Math.round((1 - q.y) / 2 * eng.height) };
    };
    // SAMPLE A PROFILE, NOT A POINT. The farm is a lattice of ceiling
    // troffers, cubicle walls and bodies, and a single centre-frame point lands
    // on a light bar (measured: 172 luma, i.e. the fixture, not the carpet).
    // So take nine stations along the band's own centreline and, for each, a
    // matched pair of floor stations 2.4 tiles off along its short axis. The
    // MEDIAN of each set is the reading; outliers are exactly the props the
    // point sample was catching.
    band.updateWorldMatrix(true, false);
    const stations = [];
    for (let i = -4; i <= 4; i++) {
      const on = band.localToWorld(new THREE.Vector3(i * 0.9, 0, 0));
      const offA = band.localToWorld(new THREE.Vector3(i * 0.9, 0, 2.4));
      const offB = band.localToWorld(new THREE.Vector3(i * 0.9, 0, -2.4));
      stations.push({ on: toPx(on), offA: toPx(offA), offB: toPx(offB) });
    }
    return {
      bandWorld: { x: +c.x.toFixed(2), y: +c.y.toFixed(2), z: +c.z.toFixed(2) },
      stations,
    };
  });
  if (aim.error) throw new Error(aim.error);

  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/runner-shipped.png` });
  const boxes = {};
  aim.stations.forEach((st, i) => {
    boxes[`on${i}`]   = { ...st.on,   w: 16, h: 10 };
    boxes[`offA${i}`] = { ...st.offA, w: 16, h: 10 };
    boxes[`offB${i}`] = { ...st.offB, w: 16, h: 10 };
  });
  const median = (a) => { const s = [...a].sort((p, q) => p - q); return +s[Math.floor(s.length / 2)].toFixed(2); };
  const fold = (raw) => {
    const on = [], off = [];
    aim.stations.forEach((_, i) => { on.push(raw[`on${i}`]); off.push(raw[`offA${i}`], raw[`offB${i}`]); });
    return { runner: median(on), floor: median(off), onAll: on, offAll: off };
  };
  const shipped = fold(await patchLuma(`${OUT}/runner-shipped.png`, boxes));

  // ALTERNATIVES, priced but not adopted. The material is swapped in place on
  // the live band so every reading comes off the same frame, the same light and
  // the same camera as the shipped one — the only variable is the colour.
  const repaint = async (hex) => { await page.evaluate((h) => {
    const ex = window.__explore;
    const room = ex.roomManager.currentRoom;
    room.scene.traverse((o) => {
      if (o.userData?.furnitureType !== 'severanceRunner') return;
      o.traverse((m) => {
        // The band is the wide quad; the two bone edge stripes are narrow and
        // must not move — they are the Severance floor-line.
        if (!m.isMesh || !m.geometry?.parameters) return;
        if (m.geometry.parameters.height < 0.5) return;
        m.material = m.material.clone();
        m.material.color.setHex(h);
        m.material.needsUpdate = true;
      });
    });
  }, hex); };

  const options = [
    { label: 'pre-round-1', hex: 0x3f7d57, file: 'runner-pre-round-1.png' },
    { label: 'one step darker', hex: Number(ALT), file: 'runner-darker.png' },
    { label: 'one step LIGHTER', hex: 0x4d7f66, file: 'runner-lighter.png' },
    { label: 'toward the floor', hex: 0x6d8a78, file: 'runner-toward-floor.png' },
  ];
  const priced = [];
  for (const o of options) {
    await repaint(o.hex);
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${o.file}` });
    const m = fold(await patchLuma(`${OUT}/${o.file}`, boxes));
    priced.push({ ...o, hex: `0x${o.hex.toString(16)}`, runner: m.runner, floor: m.floor, delta: +(m.runner - m.floor).toFixed(2) });
  }

  const report = {
    room: 'cubicle_farm', ...aim,
    shipped: { ...shipped, delta: +(shipped.runner - shipped.floor).toFixed(2), hex: '0x2f5f43' },
    priced,
    qualityTier: await page.evaluate(() => window.__engine?.qualityTier ?? null),
  };
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
  console.log(`runner vs floor, median of 9 on-band and 18 off-band stations, Rec.709 luma off the saved plate (${report.qualityTier} tier)`);
  console.log(`  SHIPPED           0x2f5f43   runner ${shipped.runner}  floor ${shipped.floor}  delta ${report.shipped.delta}`);
  for (const p of priced) console.log(`  ${p.label.padEnd(17)} ${p.hex.padEnd(10)} runner ${p.runner}  floor ${p.floor}  delta ${p.delta}`);
  console.log(`\nPRODUCER CALL, and one measured fact to make it with: the contrast has`);
  console.log(`ALREADY FLIPPED SIGN. Round 1 darkened the green to close a gap in which`);
  console.log(`the runner was the BRIGHT element; at the shipping camera and the shipping`);
  console.log(`light it is now the DARK element against a bright floor, so every further`);
  console.log(`step down widens the gap instead of closing it. If the note "green strip`);
  console.log(`mid-screen" is to be answered by value at all, the direction is UP.`);
  console.log(`Neither number is a defect on its own — the runner is the Lumon identity as`);
  console.log(`an architectural surface and is SUPPOSED to be a different value from the`);
  console.log(`floor. Alex's call. Plates: ${OUT}/`);
} catch (e) {
  console.error('HARNESS ERROR', e);
  process.exitCode = 1;
} finally {
  await browser.close();
}
