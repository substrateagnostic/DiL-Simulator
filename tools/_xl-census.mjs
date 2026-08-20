// EXTENDED LIGHTING PASS — the 28-room census instrument.
//
// One number per room was never going to be honest: whole-frame luma is
// dominated by the city backdrop (~85% of the frame at the shipping camera,
// measured in _fr2-b26), so this tool measures the ROOM PLATE — the floor
// rect's four corners projected through the live camera into pixel space,
// point-in-quad tested per pixel — plus the rig geometry off an UNBATCHED
// build (window.__mergeStatics = false, Room.js's own documented A/B switch),
// giving the same two coverage fractions _fr2-b26 established as the house
// metric: pool bounding area / floor area, and double-covered fraction.
//
// House references (from the shipped instruments): cubicle_farm 47% / 0.5%,
// server_room after its fix 47.5% / 0%, parking_garage 77% (tolerated).
//
//   node tools/_xl-census.mjs --port=4517 [--rooms=a,b] [--acts=act4,act7]
//                             [--out=screenshots/lighting-extended/before]
//
// Requires `npx vite preview --port=<port>` (NEVER npm run dev for a long
// capture — another lane's src edit HMR-reloads the page mid-run).
// Headed — headless picks a different GL backend.
//
// CAPTURE LAW: qtier pinned high on every URL, tier + room_fx + city_backdrop
// sampled per shot, flicker frozen, dir restored to base. The act is pinned
// per shot by the fixture preset and recorded in the report (the skyline is a
// story clock; the GRADE moves with it, so cross-room comparisons are only
// valid within one act column).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOMS } from '../src/data/rooms/index.js';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const PORT = arg('port', '4517');
const OUT = arg('out', 'screenshots/lighting-extended/before');
const ACTS = arg('acts', 'act4,act7').split(',').filter(Boolean);
const ONLY = arg('rooms', '').split(',').filter(Boolean);
// --fxq=&fxgloss=0.12&fxextra=off — extra ?fx* query appended to every shot
// URL, so a REPLACED rig stays reproducible from a URL after the room data
// moved on (the _fr2-b26 BEFORE-reconstruction rule). Use with --rooms=<one>.
const FXQ = arg('fxq', '');
const BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

// Same constants as Engine.applyRoomFX's FIXTURE_PROFILES — used ONLY to build
// the pool-colour allowlist for the rig dump filter (neon washes #ff2a8e, rack
// glow #1fb6e0 and the specular streak #e9f1ff are additive floor planes too,
// and colour is the only stable discriminator on a built scene graph).
const PROFILE_POOL = { office: 0xffefce, utility: 0x9fc4e6, warm: 0xffd9a0 };

const roomIds = Object.keys(ROOMS).filter(id => !ONLY.length || ONLY.includes(id));

// Post-game flag lift for the rooms whose dressing is post-game — applied
// in-page through the shipping loaders, never by patching a built room.
// NOT the base `penthouse`: _loadRoom resolves ids, so renovation_penthouse
// would silently swap it for penthouse_expanded and the plate quad would be
// computed against the wrong dims. Its act7 shot is the reachable
// pre-renovation state instead.
const POST_ROOMS = new Set(['penthouse_expanded', 'penthouse_aquarium', 'penthouse_analytics', 'penthouse_bar']);

const killHMR = () => {
  const RealWS = window.WebSocket;
  const Dead = function () {
    this.readyState = 3; this.addEventListener = () => {}; this.removeEventListener = () => {};
    this.send = () => {}; this.close = () => {};
  };
  window.WebSocket = function (url, protocols) {
    const p = Array.isArray(protocols) ? protocols.join(',') : String(protocols || '');
    if (p.includes('vite') || String(url).includes('vite')) return new Dead();
    return new RealWS(url, protocols);
  };
  window.WebSocket.prototype = RealWS.prototype;
};

const browser = await chromium.launch({ headless: false, args: ['--window-size=1980,1140'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

const report = {};   // roomId -> { rig, shots: { act4: {...}, act7: {...} } }

try {
  for (const id of roomIds) {
    const rd = ROOMS[id];
    const w = rd.width, h = rd.height;
    report[id] = { w, h, fx: rd.fx || null, lighting: rd.lighting || null, shots: {} };

    // ── rig dump, unbatched, once per room (geometry is act-independent) ──
    {
      const page = await ctx.newPage();
      await page.addInitScript(killHMR);
      await page.addInitScript(() => { window.__mergeStatics = false; });
      await page.goto(`${BASE}/?dev&qtier=high&fixture=act4&shot=${id}&hud=0${FXQ}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
      const rig = await page.evaluate(() => {
        const E = window.__engine;
        const find = (n) => { let hit = null; E.scene.traverse(o => { if (o.name === n) hit = o; }); return hit; };
        const fx = find('room_fx');
        const items = [];
        if (fx) for (const c of fx.children) {
          if (c.name === 'ceiling_fixture') {
            let L = 0;
            c.traverse(o => { const p = o.geometry?.parameters; if (p?.width) L = Math.max(L, p.width * (o.scale?.x ?? 1) * c.scale.x); });
            items.push({ kind: 'fixture', x: +c.position.x.toFixed(2), y: +c.position.y.toFixed(2), z: +c.position.z.toFixed(2), len: +L.toFixed(2) });
          } else if (c.isMesh && c.material?.blending === 2) {
            const g = c.geometry?.parameters || {};
            items.push({
              kind: 'additive',
              x: +c.position.x.toFixed(3), y: +c.position.y.toFixed(3), z: +c.position.z.toFixed(3),
              w: +((g.width ?? 1) * c.scale.x).toFixed(3), d: +((g.height ?? 1) * c.scale.y).toFixed(3),
              opacity: +(c.material.opacity ?? 1).toFixed(3),
              color: '#' + c.material.color.getHexString(),
            });
          }
        }
        const lights = [];
        E.scene.traverse(o => {
          if (o.isPointLight) lights.push({ type: 'point', color: '#' + o.color.getHexString(), i: +o.intensity.toFixed(2), x: +o.position.x.toFixed(1), y: +o.position.y.toFixed(1), z: +o.position.z.toFixed(1), dist: o.distance });
        });
        return { items, pointLights: lights.length, lights };
      });
      await page.close();

      // pool-colour allowlist: the room's profile pool + every extra's pool/tint
      const allowed = new Set();
      const prof = rd.fx?.fixtures;
      if (PROFILE_POOL[prof] != null) allowed.add('#' + PROFILE_POOL[prof].toString(16).padStart(6, '0'));
      for (const ex of (rd.fx?.extra || [])) {
        const c = ex.pool ?? ex.tint ?? 0xccdcf0;
        allowed.add('#' + c.toString(16).padStart(6, '0'));
      }
      const pools = rig.items.filter(i => i.kind === 'additive' && i.y <= 0.03 && i.w < w && i.d < h && allowed.has(i.color));
      const fixtures = rig.items.filter(i => i.kind === 'fixture');
      let area = 0, dbl = 0;
      for (const p of pools) area += p.w * p.d;
      for (let i = 0; i < pools.length; i++) for (let j = i + 1; j < pools.length; j++) {
        const a = pools[i], b = pools[j];
        const ox = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
        const oz = Math.min(a.z + a.d / 2, b.z + b.d / 2) - Math.max(a.z - a.d / 2, b.z - b.d / 2);
        if (ox > 0 && oz > 0) dbl += ox * oz;
      }
      report[id].rig = {
        fixtures: fixtures.length,
        barLens: [...new Set(fixtures.map(f => f.len))],
        pools: pools.length,
        poolAreaM2: +area.toFixed(1),
        coveragePct: +(100 * area / (w * h)).toFixed(1),
        doublePct: +(100 * dbl / (w * h)).toFixed(1),
        pointLights: rig.pointLights,
        poolList: pools,
        fixtureList: fixtures,
      };
    }

    // ── plates, per act ──
    for (const act of ACTS) {
      const page = await ctx.newPage();
      await page.addInitScript(killHMR);
      await page.goto(`${BASE}/?dev&qtier=high&fixture=${act}&shot=${id}&hud=0${FXQ}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
      const state = await page.evaluate(({ id, w, h, post }) => {
        const ex = window.__explore, E = window.__engine;
        if (post) {
          ex.player.setFlag('algorithm_defeated', true);
          ex.player.setFlag('renovation_penthouse', true);
          ex._loadRoom(id);
        }
        // FREEZE THE LOOK
        E._flicker = false;
        if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
        if (ex.player?.mesh) ex.player.mesh.visible = false;
        ex.paused = true;
        const cx = (w - 1) / 2, cz = (h - 1) / 2;
        ex.player.position.x = cx; ex.player.position.z = cz;
        ex.camera.snapTo(cx, cz, 0);
        ex.camera.update(1 / 60);
        E.camera.zoom = 1.0; E.camera.updateProjectionMatrix();
        for (const el of document.querySelectorAll('.na-root, .exploration-hud, .dialog-container')) el.style.display = 'none';
        const find = (n) => { let hit = null; E.scene.traverse(o => { if (o.name === n) hit = o; }); return hit; };
        // project the floor rect corners into pixel space
        E.camera.updateMatrixWorld();
        const m = E.camera.projectionMatrix.clone().multiply(E.camera.matrixWorldInverse).elements;
        const proj = (x, y, z) => {
          const px = m[0] * x + m[4] * y + m[8] * z + m[12];
          const py = m[1] * x + m[5] * y + m[9] * z + m[13];
          const pw = m[3] * x + m[7] * y + m[11] * z + m[15];
          return [(px / pw + 1) / 2 * innerWidth, (1 - py / pw) / 2 * innerHeight];
        };
        const quad = [proj(-0.5, 0, -0.5), proj(w - 0.5, 0, -0.5), proj(w - 0.5, 0, h - 0.5), proj(-0.5, 0, h - 0.5)];
        // west/east half plates, split at the room's x midline — the number a
        // half-lit fiction (bathroom) or an end-falloff (bus) is checked by
        const midX = (w - 1) / 2;
        const quadW = [proj(-0.5, 0, -0.5), proj(midX, 0, -0.5), proj(midX, 0, h - 0.5), proj(-0.5, 0, h - 0.5)];
        const quadE = [proj(midX, 0, -0.5), proj(w - 0.5, 0, -0.5), proj(w - 0.5, 0, h - 0.5), proj(midX, 0, h - 0.5)];
        return {
          qualityTier: E.qualityTier,
          roomFXVisible: !!find('room_fx')?.visible,
          cityVisible: !!find('city_backdrop')?.visible,
          flicker: E._flicker,
          tod: E._todKey,
          quad, quadW, quadE,
          vw: innerWidth, vh: innerHeight,
        };
      }, { id, w, h, post: POST_ROOMS.has(id) && act === 'act7' });
      await page.waitForTimeout(900);
      const file = join(OUT, `${id}_${act}.png`);
      await page.screenshot({ path: file });
      report[id].shots[act] = { file, ...state };
      await page.close();
    }
    console.log(`dumped ${id}: fixtures=${report[id].rig.fixtures} bars=${report[id].rig.barLens.join('/')} cover=${report[id].rig.coveragePct}% dbl=${report[id].rig.doublePct}% pts=${report[id].rig.pointLights}`);
  }
} finally {
  await ctx.close();
  await browser.close();
}

// ── CAPTURE LAW gate ──
const bad = [];
for (const [id, r] of Object.entries(report)) for (const [act, s] of Object.entries(r.shots)) {
  if (s.qualityTier !== 'high' || !s.roomFXVisible || !s.cityVisible || s.flicker !== false) bad.push(`${id}/${act}`);
}
if (bad.length) { console.error('CAPTURE LAW FAILED:', bad.join(', ')); process.exitCode = 1; }

// ── luma inside the projected floor quad, off the PNG files ──
const mb = await chromium.launch({ headless: true });
const mp = await mb.newPage();
for (const [id, r] of Object.entries(report)) {
  for (const [act, s] of Object.entries(r.shots)) {
    const src = `data:image/png;base64,${readFileSync(s.file).toString('base64')}`;
    const lum = await mp.evaluate(async ({ src, quads, vw, vh }) => {
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, im.width, im.height).data;
      // screenshot pixels vs CSS pixels can differ (DPR); scale the quad
      const sx = im.width / vw, sy = im.height / vh;
      const stat = (quad) => {
        const q = quad.map(([px, py]) => [px * sx, py * sy]);
        const inQuad = (px, py) => {
          let inside = false;
          for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
            const [xi, yi] = q[i], [xj, yj] = q[j];
            if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
          }
          return inside;
        };
        const minX = Math.max(0, Math.floor(Math.min(...q.map(p => p[0]))));
        const maxX = Math.min(im.width - 1, Math.ceil(Math.max(...q.map(p => p[0]))));
        const minY = Math.max(0, Math.floor(Math.min(...q.map(p => p[1]))));
        const maxY = Math.min(im.height - 1, Math.ceil(Math.max(...q.map(p => p[1]))));
        let sum = 0, sq = 0, n = 0, lit = 0;
        for (let py = minY; py <= maxY; py += 2) {
          for (let px = minX; px <= maxX; px += 2) {
            if (!inQuad(px, py)) continue;
            const i4 = (py * im.width + px) * 4;
            const l = 0.2126 * d[i4] + 0.7152 * d[i4 + 1] + 0.0722 * d[i4 + 2];
            sum += l; sq += l * l; if (l > 24) lit++; n++;
          }
        }
        const mean = sum / Math.max(1, n);
        return { mean: +mean.toFixed(2), sd: +Math.sqrt(Math.max(0, sq / Math.max(1, n) - mean * mean)).toFixed(2), litPct: +(100 * lit / Math.max(1, n)).toFixed(1), px: n };
      };
      return { plate: stat(quads.quad), west: stat(quads.quadW), east: stat(quads.quadE) };
    }, { src: src, quads: { quad: s.quad, quadW: s.quadW, quadE: s.quadE }, vw: s.vw, vh: s.vh });
    s.plate = lum.plate; s.west = lum.west; s.east = lum.east;
  }
}
await mb.close();

// ── the table ──
const actCols = ACTS;
console.log('\n== CENSUS ==  (plate = projected floor quad; cover/dbl = rig pool fractions)');
console.log('room'.padEnd(22), 'profile'.padEnd(8), 'fix', 'bars(m)'.padEnd(10), 'cover%'.padStart(7), 'dbl%'.padStart(5), 'pts'.padStart(3),
  ...actCols.map(a => `${a} mean/sd/lit%`.padStart(22)));
for (const [id, r] of Object.entries(report)) {
  console.log(
    id.padEnd(22),
    String(r.fx?.fixtures ?? '(derived)').padEnd(8),
    String(r.rig.fixtures).padStart(3),
    r.rig.barLens.join('/').padEnd(10),
    String(r.rig.coveragePct).padStart(7),
    String(r.rig.doublePct).padStart(5),
    String(r.rig.pointLights).padStart(3),
    ...actCols.map(a => {
      const p = r.shots[a]?.plate;
      return p ? `${p.mean}/${p.sd}/${p.litPct}`.padStart(22) : ''.padStart(22);
    }),
  );
}
writeFileSync(join(OUT, 'census.json'), JSON.stringify({ generated: new Date().toISOString(), acts: ACTS, report }, null, 2));
console.log('\nreport ->', join(OUT, 'census.json'));
