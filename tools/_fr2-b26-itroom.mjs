// FIX ROUND 2 - B26. The IT room (server_room), diagnosed and then A/B'd.
//
// The producer note is three words - "lighting is also janky" - with no symptom,
// so this tool's first job is turning that into something checkable. It dumps
// the room's whole light rig off the live scene graph, computes where the
// additive floor washes OVERLAP (the "double-lit surface" defect class), and
// shoots the room at the SHIPPING camera plus an inspection zoom, once per
// option.
//
// WHAT THE DUMP FOUND, and why the options below exist:
//   server_room is 8x10 - the game's second-smallest interior. The `utility`
//   profile gives it perRow: 1, i.e. ONE 4.1 m bar per row (over half the
//   room's width), which is why the room also carries a HAND-PLACED off-grid
//   `fx.extra` troffer at (6,4) of a different length (3.0) to reach its east
//   half. The three bars are therefore at three different (x,z) with two
//   different lengths, and their three floor pools total 81.4 m2 of additive
//   wash on an 80 m2 floor - the only room in the game whose pool bounding area
//   exceeds its own floor. (Office reference cubicle_farm: 47%. Next-highest
//   utility room, parking_garage: 77%.)
//
// Options shot, all through the shipping path via main.js's dev fx overrides:
//   SHIPPED   2 profile bars (4.1 m) + 1 off-grid extra (3.0 m)
//   GRID      perRow: 2, extra removed -> four 1.6 m bars on a true 2x2 grid
//   FIX       GRID + a room-scoped pool footprint (rows are 4.0 m apart, so
//             utility's absolute 4.4 m poolD overlaps by construction)
//
//   node tools/_fr2-b26-itroom.mjs [--port=5173]
//
// Requires `npm run dev`. Headed.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const PORT = arg('port', '5173');
const OUT = arg('out', 'screenshots/fix-round-2/b26-itroom');
const ROOM = arg('room', 'server_room');
const BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

const OPTIONS = [
  // BEFORE is the rig as it SHIPPED, reconstructed from the URL rather than
  // from a stale PNG, so the pair stays honest now that the after has landed in
  // room data: perRow back to the utility default of 1, the profile pool back
  // to segLen + 2.2 by 4.4, and the hand-placed off-grid extra put back at its
  // shipped numbers.
  { key: 'BEFORE', q: '&fxperrow=1&fxpool=6.3,4.4&fxextraadd=6,4,3.0,5.0,5.2', note: '2 profile bars 4.1m + 1 off-grid extra 3.0m' },
  // Halfway: the grid, with the utility pool footprint left alone.
  { key: 'GRID-ONLY', q: '&fxpool=6.3,4.4', note: 'perRow 2, but utility pool 6.3x4.4 kept' },
  // What room data now says. No overrides at all.
  { key: 'AFTER', q: '', note: 'four 1.6m bars 2x2 + pool 2.5x3.8 (rows are 4.0m apart)' },
];

// `zoom: 1` IS the shipping camera (Engine._zoomForViewport returns a 10.5-unit
// ortho half-height on desktop; camera.zoom multiplies it). The P- marks are
// literally what a player sees; the Z- marks are an inspection zoom used only
// for judging hardware, never for a player-experience claim.
const MARKS = [
  { key: 'P-racks', x: 4.0, z: 3.0, zoom: 1.0 },
  { key: 'P-alex', x: 6.0, z: 7.0, zoom: 1.0 },
  { key: 'Z-racks', x: 4.0, z: 3.0, zoom: 2.2 },
  { key: 'Z-alex', x: 6.0, z: 6.5, zoom: 2.2 },
];

const browser = await chromium.launch({ headless: false, args: ['--window-size=1980,1140'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const rows = [];
const rigs = {};

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

const DUMP = () => {
  const ex = window.__explore, E = window.__engine;
  const find = (n) => { let hit = null; E.scene.traverse(o => { if (o.name === n) hit = o; }); return hit; };
  const fx = find('room_fx');
  const items = [];
  if (fx) for (const c of fx.children) {
    const kind = c.name === 'ceiling_fixture' ? 'fixture'
      : c.isGroup ? 'shaft'
      : (c.material?.blending === 2 ? 'additive' : 'plane');
    const g = c.geometry?.parameters || {};
    items.push({
      kind,
      x: +c.position.x.toFixed(3), y: +c.position.y.toFixed(3), z: +c.position.z.toFixed(3),
      w: +((g.width ?? 1) * c.scale.x).toFixed(3),
      d: +((g.height ?? 1) * c.scale.y).toFixed(3),
      opacity: c.material?.opacity != null ? +c.material.opacity.toFixed(3) : null,
      color: c.material?.color ? '#' + c.material.color.getHexString() : null,
    });
  }
  const lights = [];
  E.scene.traverse(o => {
    if (o.isPointLight) lights.push({ type: 'point', color: '#' + o.color.getHexString(), intensity: o.intensity, x: +o.position.x.toFixed(2), y: +o.position.y.toFixed(2), z: +o.position.z.toFixed(2), distance: o.distance });
    else if (o.isAmbientLight) lights.push({ type: 'ambient', color: '#' + o.color.getHexString(), intensity: o.intensity });
    else if (o.isDirectionalLight) lights.push({ type: 'dir', color: '#' + o.color.getHexString(), intensity: o.intensity });
  });
  const rd = window.__roomData || null;
  return { items, lights, width: rd?.width ?? null, height: rd?.height ?? null };
};

try {
  for (const opt of OPTIONS) {
    // ── rig dump on an UNBATCHED build ───────────────────────────────────────
    // applyRoomFX ends with batchStatics(), which merges the overlay's meshes
    // and leaves every merged piece at 0,0,0 with world-space vertices - a
    // footprint read off the shipping build reports every pool at the origin at
    // 1x1. This ONE page sets Room.js's own documented `window.__mergeStatics =
    // false` so the per-fixture transforms survive being measured. No plate is
    // taken from it; every picture below comes from the shipping build.
    {
      const page = await ctx.newPage();
      await page.addInitScript(killHMR);
      await page.addInitScript(() => { window.__mergeStatics = false; });
      await page.goto(`${BASE}/?dev&qtier=high&fixture=act4&shot=${ROOM}&hud=0${opt.q}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
      await page.evaluate((r) => {
        // The room's own dimensions, off room data rather than guessed.
        window.__roomData = { width: undefined, height: undefined };
        const ex = window.__explore;
        const rd = ex.roomData || ex.currentRoom_data || ex._roomData || null;
        if (rd) window.__roomData = { width: rd.width, height: rd.height };
        void r;
      }, ROOM);
      rigs[opt.key] = await page.evaluate(DUMP);
      await page.close();
    }

    for (const m of MARKS) {
      const page = await ctx.newPage();
      await page.addInitScript(killHMR);
      await page.goto(`${BASE}/?dev&qtier=high&fixture=act4&shot=${ROOM}&hud=0${opt.q}`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
      const state = await page.evaluate(({ px, pz, zoom }) => {
        const ex = window.__explore, E = window.__engine;
        E._flicker = false;
        if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
        if (ex.player?.mesh) ex.player.mesh.visible = false;
        ex.paused = true;
        ex.player.position.x = px; ex.player.position.z = pz;
        ex.camera.snapTo(px, pz, ex.player.mesh?.position.y ?? 0);
        ex.camera.update(1 / 60);
        E.camera.zoom = zoom; E.camera.updateProjectionMatrix();
        for (const el of document.querySelectorAll('.na-root, .exploration-hud, .dialog-container')) el.style.display = 'none';
        const find = (n) => { let hit = null; E.scene.traverse(o => { if (o.name === n) hit = o; }); return hit; };
        let housings = 0;
        const fx = find('room_fx');
        if (fx) for (const c of fx.children) if (c.name === 'ceiling_fixture') housings++;
        return {
          qualityTier: E.qualityTier, roomFXVisible: !!fx?.visible,
          cityVisible: !!find('city_backdrop')?.visible, flicker: E._flicker, housings,
        };
      }, { px: m.x, pz: m.z, zoom: m.zoom });

      await page.waitForTimeout(900);
      const file = join(OUT, `${opt.key}_${m.key}.png`);
      await page.screenshot({ path: file });
      rows.push({ option: opt.key, mark: m.key, file, ...state });
      console.log(`${opt.key.padEnd(8)} ${m.key.padEnd(8)} housings=${state.housings} tier=${state.qualityTier} roomFX=${state.roomFXVisible} city=${state.cityVisible}`);
      await page.close();
    }
  }
} finally {
  await ctx.close();
  await browser.close();
}

const bad = rows.filter(r => r.qualityTier !== 'high' || !r.roomFXVisible || !r.cityVisible || r.flicker !== false);
if (bad.length) { console.error('CAPTURE LAW FAILED:', bad.map(b => `${b.option}/${b.mark}`).join(',')); process.exitCode = 1; }

// ── OVERLAP ARITHMETIC on the additive floor washes ─────────────────────────
// The rig comment in Engine.applyRoomFX says pool width is held near the
// fixture so adjacent pools "kiss but don't stack hot". This is the check.
// Bounding-box arithmetic on a radial texture OVERSTATES the stack (the pools
// feather to zero at the rectangle edge), so treat it as an upper bound and a
// comparator between options, not as an alpha the eye sees.
const FLOOR_W = 8, FLOOR_H = 10;   // server_room, from rooms/index.js
const geom = {};
for (const [key, rig] of Object.entries(rigs)) {
  // POOLS ONLY. Excluded, with reasons: #1fb6e0 is the per-rack cyan underglow
  // (a prop cue authored per serverRack, not a ceiling pool); #e9f1ff is the
  // lacquer SPECULAR STREAK, which sits inside its own pool by design, so
  // counting it doubles every option's overlap number by the same artefact and
  // makes the comparison useless; the full-room gloss ramp is w x h.
  const pools = rig.items.filter(i => i.kind === 'additive' && i.y < 0.03 && i.w < FLOOR_W && i.d < FLOOR_H
    && i.color !== '#1fb6e0' && i.color !== '#e9f1ff');
  const fixtures = rig.items.filter(i => i.kind === 'fixture');
  let area = 0, dbl = 0;
  for (const p of pools) area += p.w * p.d;
  for (let i = 0; i < pools.length; i++) for (let j = i + 1; j < pools.length; j++) {
    const a = pools[i], b = pools[j];
    const ox = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2);
    const oz = Math.min(a.z + a.d / 2, b.z + b.d / 2) - Math.max(a.z - a.d / 2, b.z - b.d / 2);
    if (ox > 0 && oz > 0) dbl += ox * oz;
  }
  geom[key] = {
    fixtures: fixtures.length,
    fixtureXZ: fixtures.map(f => `${f.x},${f.z}`),
    pools: pools.length,
    poolAreaM2: +area.toFixed(2),
    coveragePct: +(100 * area / (FLOOR_W * FLOOR_H)).toFixed(1),
    doubleCoveredM2: +dbl.toFixed(2),
    doubleCoveredPct: +(100 * dbl / (FLOOR_W * FLOOR_H)).toFixed(1),
  };
}

// ── luma off the FILES, whole frame and EAST HALF ───────────────────────────
// The east half is the region the hand-placed extra exists to protect ("one
// more ceiling pool lifts the server room right half"), so any option that
// removes it has to be checked there specifically, not just on frame mean.
const shots = await chromium.launch({ headless: true });
const mp = await shots.newPage();
for (const r of rows) {
  const src = `data:image/png;base64,${readFileSync(r.file).toString('base64')}`;
  const m = await mp.evaluate(async (s) => {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    const stat = (ox, oy, w, h) => {
      const d = x.getImageData(ox, oy, w, h).data;
      let sum = 0, sq = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        sum += l; sq += l * l; n++;
      }
      const mean = sum / n;
      return { mean: +mean.toFixed(2), sd: +Math.sqrt(Math.max(0, sq / n - mean * mean)).toFixed(2) };
    };
    return {
      full: stat(0, 0, im.width, im.height),
      // The room sits centred; +x (east) projects to screen RIGHT in this iso.
      east: stat(Math.round(im.width * 0.52), Math.round(im.height * 0.18), Math.round(im.width * 0.30), Math.round(im.height * 0.46)),
      // THE FLOOR. Whole-frame luma in this game is dominated by the city
      // backdrop (85% of the frame at the shipping camera), so a frame mean
      // cannot tell you whether a pool change darkened the floor. This is a
      // box inside the room plate.
      floor: stat(Math.round(im.width * 0.38), Math.round(im.height * 0.34), Math.round(im.width * 0.24), Math.round(im.height * 0.22)),
    };
  }, src);
  r.full = m.full; r.east = m.east; r.floor = m.floor;
}
await shots.close();

console.log('\n== GEOMETRY ==');
for (const [k, g] of Object.entries(geom)) {
  console.log(`${k.padEnd(8)} fixtures=${g.fixtures} @ ${g.fixtureXZ.join(' ')}  pools=${g.pools}  wash ${g.poolAreaM2} m2 = ${g.coveragePct}% of floor  double-covered ${g.doubleCoveredM2} m2 = ${g.doubleCoveredPct}%`);
}
console.log('\n== LUMA (whole frame / east crop) ==');
for (const m of MARKS) {
  for (const o of OPTIONS) {
    const r = rows.find(x => x.mark === m.key && x.option === o.key);
    if (r) console.log(`${m.key.padEnd(8)} ${o.key.padEnd(8)} full ${String(r.full.mean).padStart(6)}/${String(r.full.sd).padStart(5)}   east ${String(r.east.mean).padStart(6)}/${String(r.east.sd).padStart(5)}`);
  }
  console.log('');
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify({ generated: new Date().toISOString(), room: ROOM, options: OPTIONS, marks: MARKS, geom, rigs, rows }, null, 2));
console.log('report ->', join(OUT, 'report.json'));

// ── contact strips, one per mark ────────────────────────────────────────────
const sheets = await chromium.launch({ headless: true });
const sp = await sheets.newPage();
const dataURL = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;
for (const m of MARKS) {
  const set = OPTIONS.map(o => rows.find(r => r.mark === m.key && r.option === o.key)).filter(Boolean);
  if (set.length !== OPTIONS.length) continue;
  const out = join(OUT, `contact_${m.key}.png`);
  const png = await sp.evaluate(async ({ tiles, title }) => {
    const load = (s) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });
    const ims = await Promise.all(tiles.map(t => load(t.src)));
    const TW = 620, PAD = 16, CAP = 74, HEAD = 52;
    const TH = Math.round(TW * ims[0].height / ims[0].width);
    const c = document.createElement('canvas');
    c.width = PAD + tiles.length * (TW + PAD);
    c.height = HEAD + PAD + TH + CAP;
    const x = c.getContext('2d');
    x.fillStyle = '#11131a'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#e8e6df'; x.font = 'bold 24px Segoe UI, sans-serif';
    x.fillText(title, PAD, 34);
    ims.forEach((im, i) => {
      const ox = PAD + i * (TW + PAD);
      x.drawImage(im, ox, HEAD, TW, TH);
      x.strokeStyle = '#3a3f4d'; x.lineWidth = 2; x.strokeRect(ox, HEAD, TW, TH);
      x.fillStyle = '#ffd479'; x.font = 'bold 22px Segoe UI, sans-serif';
      x.fillText(tiles[i].label, ox, HEAD + TH + 28);
      x.fillStyle = '#b8bdc9'; x.font = '15px Segoe UI, sans-serif';
      x.fillText(tiles[i].note, ox, HEAD + TH + 50);
      x.fillText(tiles[i].nums, ox, HEAD + TH + 70);
    });
    return c.toDataURL('image/png');
  }, {
    title: `SERVER ROOM (IT) - ceiling rig - ${m.key}${m.zoom !== 1 ? ` (inspection zoom ${m.zoom}x, NOT the player view)` : ' (shipping camera)'}`,
    tiles: set.map((r, i) => ({
      src: dataURL(r.file),
      label: `${String.fromCharCode(65 + i)}.  ${r.option}`,
      note: OPTIONS[i].note,
      nums: `${geom[r.option].fixtures} bars | pools ${geom[r.option].coveragePct}% of floor, ${geom[r.option].doubleCoveredPct}% double-lit | floor luma ${r.floor.mean}/${r.floor.sd}`,
    })),
  });
  writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log('wrote', out);
}
await sheets.close();
