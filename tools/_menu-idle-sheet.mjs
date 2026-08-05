// THROWAWAY prep script — builds the numbered producer picker sheet for the
// idle-menu deliverable (menu/_idle_menu_contact.png). Numbers 1..N match
// menu/IDLE_MENU.md rows, NOT catalog ids (catalog id is printed small,
// underneath, for cross-reference when the producer wants to look a clip up
// on Meshy's own site). 3 frames per clip in a row so motion reads even as a
// static image, per the deliverable spec.
//
//   node tools/_menu-idle-sheet.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CATALOG = 'art/char_refs/meshy_pilot/_clips/catalog.json';
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8')).result.list;

// Numbered 1-20 to match IDLE_MENU.md.
const PICKS = [
  336, 338, 243, 244, 246, 247, 249, 251, 252, 245,
  333, 48, 47, 56, 297, 315, 313, 314, 311, 25,
];

const OUT = 'art/char_refs/meshy_pilot/_clips/menu/_idle_menu_contact.png';
const FRAMES = 3;
const CELL = 210;
const COLS = 4; // 4 clips per row-of-rows -> 5 rows x 4 cols = 20

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('about:blank');

const strips = [];
for (let i = 0; i < PICKS.length; i++) {
  const id = PICKS[i];
  const clip = catalog.find(a => a.id === id);
  if (!clip) { console.log(`[MISSING] #${id}`); continue; }
  const data = await page.evaluate(async ({ url, frames, cell }) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    try { await img.decode(); } catch { return null; }
    const c = document.createElement('canvas');
    c.width = cell * frames; c.height = cell;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#12121a'; ctx.fillRect(0, 0, c.width, c.height);
    // Spread 3 samples across a wider window than the 6-frame audit strips so
    // a short loop's start/mid/end all land distinctly.
    const gaps = [80, 500, 950];
    for (let i = 0; i < frames; i++) {
      await new Promise(r => setTimeout(r, i === 0 ? gaps[0] : gaps[i] - gaps[i - 1]));
      try { ctx.drawImage(img, i * cell, 0, cell, cell); } catch { /* tainted */ }
    }
    return c.toDataURL('image/png');
  }, { url: clip.previewUrl, frames: FRAMES, cell: CELL });
  if (!data) { console.log(`[skip] ${id} ${clip.name} (no preview)`); continue; }
  strips.push({ num: i + 1, clip, data });
  console.log(`[strip] #${i + 1} -> a${id} ${clip.name}`);
}

const sheet = await page.evaluate(async ({ strips, cols, cell, frames }) => {
  const LBL = 26;
  const cellW = cell * frames, cellH = cell + LBL;
  const rows = Math.ceil(strips.length / cols);
  const c = document.createElement('canvas');
  c.width = cols * cellW; c.height = rows * cellH;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b0b12'; ctx.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < strips.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const x = col * cellW, y = row * cellH;
    const img = new Image(); img.src = strips[i].data; await img.decode();
    ctx.drawImage(img, x, y + LBL);
    ctx.fillStyle = '#ffd479'; ctx.font = 'bold 20px monospace';
    ctx.fillText(`#${strips[i].num}  a${strips[i].clip.id}  ${strips[i].clip.name}`, x + 6, y + 19);
    ctx.strokeStyle = '#2a2a3a'; ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
  }
  return c.toDataURL('image/png');
}, { strips: strips.map(s => ({ num: s.num, data: s.data, clip: { id: s.clip.id, name: s.clip.name } })), cols: COLS, cell: CELL, frames: FRAMES });

writeFileSync(OUT, Buffer.from(sheet.split(',')[1], 'base64'));
console.log(`\ncontact sheet -> ${OUT}  (${strips.length} clips)`);
await browser.close();
process.exit(0);
