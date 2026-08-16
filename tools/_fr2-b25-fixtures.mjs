// FIX ROUND 2 - B25. The cubicle farm's ceiling hardware, three ways, at the
// two framings the producer already looked at.
//
// The option study (.claude/plans/playtest-notes/lighting-options.md) applied
// its five variants to the LIVE SCENE GRAPH at runtime and reverted them, which
// was correct for an exploration but is not a picture of a shippable option: it
// had to rebuild the room with `window.__mergeStatics = false` to reach the
// per-fixture groups at all, because Engine.applyRoomFX ends with batchStatics()
// and merges all nine troffers into one mesh.
//
// This tool shoots the SHIPPING PATH instead. The two knobs are real per-room
// `fx` keys now (`fixtureEvery`, `housingScale`, both read by applyRoomFX), and
// main.js's dev fixture boot writes them into ROOM DATA from the URL before the
// room is built. Nothing is patched after the room exists, statics batch exactly
// as they ship, and the plate is therefore a picture of the option rather than
// of an overlay.
//
// The producer's V1 is LAWFUL here in a way the study's V1 was not. The study
// hid four housings and LEFT their pools, shafts and streaks running - four
// floor pools with nothing above them, which is verbatim the round-1 critic
// defect ("a floor that is somehow lit anyway") the fixture rig exists to
// prevent. `fixtureEvery: 2` drops the whole fixture, so the five survivors are
// each fully sourced. That means the floor DOES get darker in four places and
// this tool measures exactly how much rather than claiming it does not.
//
//   node tools/_fr2-b25-fixtures.mjs [--port=5173]
//
// Requires `npm run dev`. Headed - headless picks a different GL backend.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const PORT = arg('port', '5173');
const OUT = arg('out', 'screenshots/fix-round-2/b25-fixtures');
const BASE = `http://localhost:${PORT}`;
mkdirSync(OUT, { recursive: true });

// The three options, as URL query on the shipping fixture boot.
const VARIANTS = [
  { key: 'INCUMBENT', q: '', note: '9 fixtures - shipped' },
  { key: 'V1-LAWFUL', q: '&fxevery=2', note: '5 fixtures, complete pairs (housing+pool+shaft+streak)' },
  { key: 'COMBO', q: '&fxevery=2&fxhousing=1,0.6,0.6', note: '5 complete pairs + V4 housing slimming' },
];

// The producer's own two framings, copied from screenshots/lighting-options/.
// Andrew is hidden and the state paused, so the tile is pixel-comparable.
const FRAMINGS = [
  { key: 'F2-ceiling', x: 9.5, z: 7.5, zoom: 1.9, why: 'ceiling-heavy angle' },
  { key: 'F3-desks', x: 4.0, z: 3.5, zoom: 2.4, why: 'close over the NW pod - where the complaint is loudest' },
];

const rows = [];
const browser = await chromium.launch({ headless: false, args: ['--window-size=1980,1140'] });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

try {
  for (const v of VARIANTS) {
    for (const f of FRAMINGS) {
      const page = await ctx.newPage();
      // Vite's HMR client full-reloads the page when anything in src/ changes -
      // another lane's edit, or this very run's own edit landing late - which
      // destroys the execution context mid-shot ("Execution context was
      // destroyed"). Kill the socket by its PROTOCOL, which is what actually
      // identifies it; the URL is a bare host:port and contains no 'vite'.
      await page.addInitScript(() => {
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
      });
      const url = `${BASE}/?dev&qtier=high&fixture=act4&shot=cubicle_farm&hud=0${v.q}`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });

      const state = await page.evaluate(({ px, pz, zoom }) => {
        const ex = window.__explore, E = window.__engine;
        // FREEZE THE LOOK. Flicker off and the directional restored to its base,
        // or two plates differ by where in the flicker cycle the shutter fell.
        E._flicker = false;
        if (E._dirLight && E._baseDirIntensity) E._dirLight.intensity = E._baseDirIntensity;
        // Andrew out of frame, world asleep.
        if (ex.player?.mesh) ex.player.mesh.visible = false;
        ex.paused = true;
        ex.player.position.x = px; ex.player.position.z = pz;
        ex.camera.snapTo(px, pz, ex.player.mesh?.position.y ?? 0);
        ex.camera.update(1 / 60);
        E.camera.zoom = zoom; E.camera.updateProjectionMatrix();
        // No caption may appear in a plate.
        for (const el of document.querySelectorAll('.na-root, .exploration-hud, .dialog-container')) el.style.display = 'none';

        // CAPTURE LAW sample: tier pinned, both degrade-ladder groups alive.
        const find = (n) => { let hit = null; E.scene.traverse(o => { if (o.name === n) hit = o; }); return hit; };
        const fx = find('room_fx');
        // Count the ceiling troffers actually in the built overlay, off their
        // own name. "Group child of room_fx" is NOT a fixture test - the light
        // shafts are Groups too, and counting those reported 18 for 9.
        let housings = 0, meshes = 0, boxY = null;
        if (fx) for (const c of fx.children) {
          if (c.name === 'ceiling_fixture') { housings++; boxY = boxY ?? c.scale.y; }
          else if (c.isMesh) meshes++;
        }
        return {
          qualityTier: E.qualityTier,
          roomFXVisible: !!find('room_fx')?.visible,
          cityVisible: !!find('city_backdrop')?.visible,
          housings, fxMeshes: meshes, housingScaleY: boxY,
          dirIntensity: E._dirLight?.intensity ?? null,
          flicker: E._flicker,
        };
      }, { px: f.x, pz: f.z, zoom: f.zoom });

      await page.waitForTimeout(900);
      const file = join(OUT, `${f.key}_${v.key}.png`);
      await page.screenshot({ path: file });
      rows.push({ variant: v.key, framing: f.key, file, ...state });
      console.log(`${f.key} ${v.key.padEnd(10)} housings=${state.housings} fxMeshes=${state.fxMeshes} tier=${state.qualityTier} roomFX=${state.roomFXVisible} city=${state.cityVisible}`);
      await page.close();
    }
  }
} finally {
  await ctx.close();
  await browser.close();
}

// ── CAPTURE LAW gate ────────────────────────────────────────────────────────
const bad = rows.filter(r => r.qualityTier !== 'high' || !r.roomFXVisible || !r.cityVisible || r.flicker !== false);
if (bad.length) {
  console.error('CAPTURE LAW FAILED on:', bad.map(b => `${b.framing}/${b.variant}`).join(', '));
  process.exitCode = 1;
}
// Housing census gate: the option is only what it claims if the count moved.
// Each fixture also owns exactly one pool and one streak, so the mesh count
// moves with it - that is what makes a survivor "fully sourced" checkable
// instead of asserted.
const expect = {
  INCUMBENT: { housings: 9, scaleY: 1 },
  'V1-LAWFUL': { housings: 5, scaleY: 1 },
  COMBO: { housings: 5, scaleY: 0.6 },
};
for (const r of rows) {
  const e = expect[r.variant];
  if (r.housings !== e.housings) {
    console.error(`HOUSING COUNT WRONG: ${r.framing}/${r.variant} = ${r.housings}, expected ${e.housings}`);
    process.exitCode = 1;
  }
  if (Math.abs((r.housingScaleY ?? 1) - e.scaleY) > 1e-6) {
    console.error(`HOUSING SCALE WRONG: ${r.framing}/${r.variant} y=${r.housingScaleY}, expected ${e.scaleY}`);
    process.exitCode = 1;
  }
}
const inc = rows.find(r => r.variant === 'INCUMBENT');
for (const r of rows.filter(x => x.variant !== 'INCUMBENT' && x.framing === inc.framing)) {
  const dropped = inc.fxMeshes - r.fxMeshes;
  if (dropped !== (inc.housings - r.housings) * 2) {
    console.error(`ORPHAN POOL RISK: ${r.variant} dropped ${dropped} fx meshes for ${inc.housings - r.housings} housings (want 2 each: pool + streak)`);
    process.exitCode = 1;
  }
}

// ── measure + contact strips, in a headless canvas ──────────────────────────
const shots = await chromium.launch({ headless: true });
const mp = await shots.newPage();
const dataURL = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;

for (const r of rows) {
  const m = await mp.evaluate(async (src) => {
    const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, im.width, im.height).data;
    let sum = 0, sq = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      sum += l; sq += l * l; n++;
    }
    const mean = sum / n;
    return { mean, sd: Math.sqrt(Math.max(0, sq / n - mean * mean)) };
  }, dataURL(r.file));
  r.mean = +m.mean.toFixed(2); r.sd = +m.sd.toFixed(2);
}

for (const f of FRAMINGS) {
  const set = VARIANTS.map(v => rows.find(r => r.framing === f.key && r.variant === v.key));
  const out = join(OUT, `contact_${f.key}.png`);
  const png = await mp.evaluate(async ({ tiles, title }) => {
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
    title: `CUBICLE FARM - ceiling hardware - ${f.key} (${f.why})`,
    tiles: set.map((r, i) => ({
      src: dataURL(r.file),
      label: `${String.fromCharCode(65 + i)}.  ${r.variant}`,
      note: VARIANTS[i].note,
      nums: `${r.housings} housings  |  frame luma mean ${r.mean} sd ${r.sd}`,
    })),
  });
  writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log('wrote', out);
}

// ONE sheet, both framings stacked, so the choice is a single file and a single
// letter.
{
  const out = join(OUT, 'contact_BOTH.png');
  const png = await mp.evaluate(async ({ srcs }) => {
    const load = (s) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });
    const ims = await Promise.all(srcs.map(load));
    const W = Math.max(...ims.map(i => i.width));
    const c = document.createElement('canvas');
    c.width = W; c.height = ims.reduce((a, i) => a + i.height, 0) + 12 * (ims.length - 1);
    const x = c.getContext('2d');
    x.fillStyle = '#11131a'; x.fillRect(0, 0, c.width, c.height);
    let y = 0;
    for (const im of ims) { x.drawImage(im, 0, y); y += im.height + 12; }
    return c.toDataURL('image/png');
  }, { srcs: FRAMINGS.map(f => dataURL(join(OUT, `contact_${f.key}.png`))) });
  writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log('wrote', out);
}

await shots.close();
writeFileSync(join(OUT, 'report.json'), JSON.stringify({ generated: new Date().toISOString(), variants: VARIANTS, framings: FRAMINGS, rows }, null, 2));
console.log('report ->', join(OUT, 'report.json'));
