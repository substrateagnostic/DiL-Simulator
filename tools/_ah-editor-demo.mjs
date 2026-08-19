// ANDREW HARVEST piece 3 demo — editor upgrades + SSE live preview, driven
// end to end through the real surfaces. Requires BOTH servers running:
//   npm run editor          (localhost:3747)
//   npx vite --port=NNNN    (game dev server; pass --port=NNNN, default 5173)
//
// Legs:
//  1. Editor boots, Rooms tab, cubicle_farm: exit overlay + facing arrows in
//     frame (screenshot), zoom display reacts to the scroll wheel.
//  2. Game tab (dev mode) subscribes to /api/live: POST /api/live-move
//     reports clients >= 1.
//  3. A real canvas drag in the editor moves a cubicle_farm furniture piece;
//     the game rebuilds the room and the piece's group carries the new
//     position in its name (before/after screenshots).
//  4. R rotates the selected piece 90 degrees (edit-rot field moves, an
//     override is staged); Ctrl+Z undoes it (override drops back).
//  5. Nothing was written to disk: room-overrides.json is byte-identical
//     (auto-save toggle stays OFF for the whole demo).
import { chromium } from 'playwright';
import fs from 'node:fs';

const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OV_PATH = 'src/data/room-overrides.json';
const ovBefore = fs.readFileSync(OV_PATH, 'utf8');
const fails = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) fails.push(name);
};

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 } });
const editor = await ctx.newPage();
const game = await ctx.newPage();

try {
  // ── Game first: subscribe to the SSE stream ──────────────────────────
  await game.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=cubicle_farm&hud=0`, { waitUntil: 'load' });
  await game.waitForFunction(() => window.__shotReady === true && !!window.__explore, { timeout: 45_000 });
  await game.waitForFunction(() => !!window.__explore._liveEditorDispose, { timeout: 10_000 })
    .catch(() => {});
  const connected = await game.evaluate(() => !!window.__explore._liveEditorDispose);
  check('game connected the live-editor client', connected);

  // ── Editor: Rooms tab, cubicle_farm ──────────────────────────────────
  await editor.goto('http://localhost:3747/', { waitUntil: 'load' });
  await editor.click('div.tab:has-text("Rooms")');
  await editor.selectOption('#room-select', 'cubicle_farm');
  await editor.waitForTimeout(600);
  await editor.screenshot({ path: 'screenshots/ah-run/editor/rooms-overlays-100.png' });

  const zoom0 = await editor.textContent('#zoom-display');
  const canvas = editor.locator('#room-canvas');
  const box0 = await canvas.boundingBox();
  await editor.mouse.move(box0.x + box0.width / 2, box0.y + box0.height / 2);
  for (let i = 0; i < 6; i++) await editor.mouse.wheel(0, -120);
  await editor.waitForTimeout(300);
  const zoom1 = await editor.textContent('#zoom-display');
  check('scroll-wheel zoom moves the % display', zoom0 === '100%' && zoom1 === '160%', `${zoom0} -> ${zoom1}`);
  await editor.screenshot({ path: 'screenshots/ah-run/editor/rooms-zoom-160.png' });
  for (let i = 0; i < 6; i++) await editor.mouse.wheel(0, 120); // back to 100%
  await editor.waitForTimeout(200);

  // SSE has at least one client (the game tab)
  const clients = await editor.evaluate(async () => {
    const r = await fetch('/api/live-move', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'ping', roomId: 'nowhere' }),
    });
    return (await r.json()).clients;
  });
  check('SSE stream has a subscriber', clients >= 1, `clients=${clients}`);

  // ── Pick a furniture piece and note its game-side group ──────────────
  const room = await editor.evaluate(async () => (await fetch('/api/rooms/cubicle_farm')).json());
  // An unconditional, distinctive piece: first plant/waterCooler/printer, else index 0.
  let idx = room.furniture.findIndex(f => /plant|waterCooler|printer/i.test(f.type));
  if (idx < 0) idx = 0;
  const piece = room.furniture[idx];
  const before = await game.evaluate(({ type }) => {
    const names = [];
    window.__explore.roomManager.currentRoom.group.traverse(o => {
      if (o.name && o.name.startsWith(type + '_')) names.push(o.name);
    });
    return names;
  }, { type: piece.type });
  await game.screenshot({ path: 'screenshots/ah-run/editor/game-before-move.png' });

  // ── Real canvas drag: move the piece 2 tiles east, 1 south ───────────
  const cp = 22;
  const box = await canvas.boundingBox();
  const sx = box.x + (piece.x * cp) * (box.width / (room.width * cp));
  const sy = box.y + (piece.z * cp) * (box.height / (room.height * cp));
  const tx = box.x + ((piece.x + 2) * cp) * (box.width / (room.width * cp));
  const ty = box.y + ((piece.z + 1) * cp) * (box.height / (room.height * cp));
  await editor.mouse.move(sx, sy);
  await editor.mouse.down();
  for (let s = 1; s <= 10; s++) {
    await editor.mouse.move(sx + (tx - sx) * s / 10, sy + (ty - sy) * s / 10);
    await editor.waitForTimeout(35);
  }
  await editor.mouse.up();
  await editor.waitForTimeout(1200); // broadcast + debounce + rebuild

  const after = await game.evaluate(({ type }) => {
    const names = [];
    window.__explore.roomManager.currentRoom.group.traverse(o => {
      if (o.name && o.name.startsWith(type + '_')) names.push(o.name);
    });
    return names;
  }, { type: piece.type });
  // The editor snaps to 0.5-tile increments, so the landing spot is snapped.
  const snap = v => Math.round(v * 2) / 2;
  const expected = `${piece.type}_${snap(piece.x + 2)}_${snap(piece.z + 1)}`;
  check('game rebuilt with the dragged position', after.includes(expected) && !before.includes(expected),
    `expected group ${expected}; before=[${before.join(', ')}] after=[${after.join(', ')}]`);
  await game.screenshot({ path: 'screenshots/ah-run/editor/game-after-move.png' });

  // ── R-rotate + undo ──────────────────────────────────────────────────
  const rot0 = await editor.inputValue('#edit-rot');
  await editor.keyboard.press('r');
  await editor.waitForTimeout(250);
  const rot1 = await editor.inputValue('#edit-rot');
  check('R rotates the selected piece 90 degrees', Number(rot1) === (Number(rot0) + 90) % 360, `${rot0} -> ${rot1}`);
  await editor.screenshot({ path: 'screenshots/ah-run/editor/rotate-r.png' });

  const ovStagedBefore = await editor.evaluate((i) => JSON.stringify(roomOverrides.cubicle_farm?.furniture?.[String(i)] ?? null), idx);
  await editor.keyboard.press('Control+z');
  await editor.waitForTimeout(250);
  const ovStagedAfter = await editor.evaluate((i) => JSON.stringify(roomOverrides.cubicle_farm?.furniture?.[String(i)] ?? null), idx);
  check('Ctrl+Z reverts the staged override', ovStagedBefore !== ovStagedAfter, `${ovStagedBefore} -> ${ovStagedAfter}`);
  await editor.screenshot({ path: 'screenshots/ah-run/editor/undo.png' });

  // ── Nothing hit the disk (auto-save stayed off) ──────────────────────
  const ovAfter = fs.readFileSync(OV_PATH, 'utf8');
  check('room-overrides.json untouched on disk', ovAfter === ovBefore);

  // ── Production bundle carries none of this (when dist/ exists) ───────
  if (fs.existsSync('dist/assets')) {
    const dirty = fs.readdirSync('dist/assets').filter(f => f.endsWith('.js'))
      .filter(f => /api\/live|LiveEditorClient|EventSource/.test(fs.readFileSync(`dist/assets/${f}`, 'utf8')));
    check('dist .js bundles grep clean of the SSE client', dirty.length === 0, dirty.join(', '));
  }
} finally {
  await browser.close();
}
console.log(fails.length ? `RESULT: ${fails.length} FAIL — ${fails.join(', ')}` : 'RESULT: ALL PASS');
process.exitCode = fails.length ? 1 : 0;
