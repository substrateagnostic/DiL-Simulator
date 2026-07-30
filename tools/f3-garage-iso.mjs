// F3 garage tear isolation: same camera, several layer configurations.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('screenshots/f3');
fs.mkdirSync(DIR, { recursive: true });
const TAG = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'iso';

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
    '--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows',
    '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:5173/?dev&fixture=act7&shot=parking_garage&hud=0', { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 30000 });
await page.waitForTimeout(1500);

// walk east so the player sits near the far corner (where the artifact appeared)
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(650);
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(600);

const shot = async (name) => { await page.waitForTimeout(320); await page.screenshot({ path: path.join(DIR, `${TAG}_${name}.png`) }); };

await shot('00_asIs');

// 1. towers restored to full bright -> reveals the street-level city silhouettes
await page.evaluate(() => {
  const cb = window.__engine.cityBackdrop;
  for (const b of cb.buildings) b.mesh.material.color.setHex(0xffffff);
  if (cb.hqTower) cb.hqTower.material.color.setHex(0xffffff);
});
await shot('01_towersBright');

// 2. only towers (hide every non-tower child of the city group)
const layer = await page.evaluate(() => {
  const cb = window.__engine.cityBackdrop;
  const towers = new Set(cb.buildings.map(b => b.mesh));
  if (cb.hqTower) towers.add(cb.hqTower);
  window.__f3hidden = [];
  for (const c of cb.group.children) if (!towers.has(c) && c.visible) { c.visible = false; window.__f3hidden.push(c); }
  return { hidden: window.__f3hidden.length, total: cb.group.children.length };
});
console.log('non-tower city children hidden:', layer.hidden, 'of', layer.total);
await shot('02_towersOnly');

// 3. city group entirely hidden -> anything remaining is room geometry
await page.evaluate(() => { window.__engine.cityBackdrop.group.visible = false; });
await shot('03_noCity');

// 4. room hidden, city restored -> the city alone, bright
await page.evaluate(() => {
  const cb = window.__engine.cityBackdrop;
  cb.group.visible = true;
  for (const c of window.__f3hidden) c.visible = true;
  const s = window.__engine.scene;
  window.__f3roomHidden = [];
  for (const c of s.children) {
    if (c === cb.group || c.isLight) continue;
    if (c.visible) { c.visible = false; window.__f3roomHidden.push(c); }
  }
});
await shot('04_cityOnly');

// 5. street level OFF while still in the garage -> is the 2.4x stretch the artifact?
await page.evaluate(() => {
  for (const c of window.__f3roomHidden) c.visible = true;
  window.__engine.cityBackdrop.setStreetLevel(false);
});
await shot('05_streetLevelOff');

await page.evaluate(() => window.__engine.cityBackdrop.setStreetLevel(true));
await shot('06_streetLevelBackOn');

// dump per-tower screen-space extents at street level (which towers fill the frame)
const screen = await page.evaluate(() => {
  const E = window.__engine, cb = E.cityBackdrop, cam = E.camera;
  cb.group.updateMatrixWorld(true);
  const rows = [];
  const proj = (v) => { const p = v.clone().project(cam); return [ (p.x * 0.5 + 0.5) * 1920, (1 - (p.y * 0.5 + 0.5)) * 1080 ]; };
  const all = cb.buildings.map((b, i) => ({ i, mesh: b.mesh, h: b.h, radius: b.radius, variant: b.variant }));
  if (cb.hqTower) all.push({ i: 'HQ', mesh: cb.hqTower, h: 46, radius: 18, variant: 1 });
  for (const t of all) {
    const g = t.mesh.geometry; g.computeBoundingBox();
    const bb = g.boundingBox;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (let i = 0; i < 8; i++) {
      const v = new (window.__engine.camera.constructor === Object ? Object : Object)();
      const c = { x: i & 1 ? bb.max.x : bb.min.x, y: i & 2 ? bb.max.y : bb.min.y, z: i & 4 ? bb.max.z : bb.min.z };
      const vv = new t.mesh.position.constructor(c.x, c.y, c.z).applyMatrix4(t.mesh.matrixWorld);
      const [sx, sy] = proj(vv);
      minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
    }
    const w = maxX - minX, h2 = maxY - minY;
    const onScreen = maxX > 0 && minX < 1920 && maxY > 0 && minY < 1080;
    rows.push({ i: t.i, variant: t.variant, radius: +t.radius.toFixed(1), h: +t.h.toFixed(1),
      sx: [Math.round(minX), Math.round(maxX)], sy: [Math.round(minY), Math.round(maxY)],
      screenW: Math.round(w), screenH: Math.round(h2), onScreen });
  }
  return rows.filter(r => r.onScreen).sort((a, b) => b.screenW * b.screenH - a.screenW * a.screenH);
});
fs.writeFileSync(path.join(DIR, `${TAG}_screen.json`), JSON.stringify(screen, null, 1));
console.log('towers on screen:', screen.length);
for (const r of screen.slice(0, 14)) console.log(` t${r.i} var${r.variant} r${r.radius} h${r.h} screen ${r.screenW}x${r.screenH} x[${r.sx}] y[${r.sy}]`);

await browser.close();
