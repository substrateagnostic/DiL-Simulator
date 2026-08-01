// Meshy animation-catalog preview auditor.
//
// The catalog's names lie (last night's finding: seven of the numbered "Idle"
// clips are gestures). This samples the CDN preview GIF for each candidate id
// at fixed intervals and stitches a labelled 6-frame strip per clip, ~6 clips
// per sheet, so a whole category can be judged on MOTION in one glance.
//
//   node tools/meshy-clip-audit.mjs --ids=138,139,140 --tag=guard
//   node tools/meshy-clip-audit.mjs --cat=Fighting/Blocking --tag=blocking
//
// Sheets -> art/char_refs/meshy_pilot/_clips/audit_<tag>_N.png
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const OUT = 'art/char_refs/meshy_pilot/_clips';
mkdirSync(OUT, { recursive: true });
const catalog = JSON.parse(readFileSync(join(OUT, 'catalog.json'), 'utf8')).result.list;

let picks = [];
if (args.ids) {
  const want = String(args.ids).split(',').map(Number);
  picks = want.map(id => catalog.find(a => a.id === id)).filter(Boolean);
} else if (args.cat) {
  const [c, s] = String(args.cat).split('/');
  picks = catalog.filter(a => a.category === c && (!s || a.subCategory === s));
}
if (!picks.length) { console.error('no clips matched'); process.exit(1); }

const TAG = args.tag || 'audit';
const FRAMES = 6;
const CELL = 200;
const PER_SHEET = 6;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto('about:blank');

const strips = [];
for (const clip of picks) {
  const data = await page.evaluate(async ({ url, frames, cell }) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    try { await img.decode(); } catch { return null; }
    const c = document.createElement('canvas');
    c.width = cell * frames; c.height = cell;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#12121a'; ctx.fillRect(0, 0, c.width, c.height);
    // The <img> plays the GIF on its own clock; drawing it at intervals samples
    // real frames. 220ms spacing across ~1.3s covers a short loop end to end.
    for (let i = 0; i < frames; i++) {
      await new Promise(r => setTimeout(r, 220));
      try { ctx.drawImage(img, i * cell, 0, cell, cell); } catch { /* tainted */ }
    }
    return c.toDataURL('image/png');
  }, { url: clip.previewUrl, frames: FRAMES, cell: CELL });
  if (!data) { console.log(`[skip] ${clip.id} ${clip.name} (no preview)`); continue; }
  strips.push({ clip, data });
  console.log(`[strip] ${clip.id} ${clip.name}`);
}

// stitch sheets
for (let s = 0; s < strips.length; s += PER_SHEET) {
  const chunk = strips.slice(s, s + PER_SHEET);
  const sheet = await page.evaluate(async ({ chunk, cell, frames }) => {
    const rowH = cell + 26;
    const c = document.createElement('canvas');
    c.width = cell * frames; c.height = rowH * chunk.length;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0b0b12'; ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < chunk.length; i++) {
      const img = new Image(); img.src = chunk[i].data; await img.decode();
      ctx.drawImage(img, 0, i * rowH + 26);
      ctx.fillStyle = '#ffd479'; ctx.font = 'bold 18px monospace';
      ctx.fillText(`#${chunk[i].id}  ${chunk[i].name}   [${chunk[i].cat}]`, 8, i * rowH + 19);
      ctx.strokeStyle = '#2a2a3a'; ctx.beginPath();
      ctx.moveTo(0, i * rowH + 0.5); ctx.lineTo(c.width, i * rowH + 0.5); ctx.stroke();
    }
    return c.toDataURL('image/png');
  }, {
    chunk: chunk.map(x => ({ data: x.data, id: x.clip.id, name: x.clip.name, cat: x.clip.category + '/' + x.clip.subCategory })),
    cell: CELL, frames: FRAMES,
  });
  const file = join(OUT, `audit_${TAG}_${Math.floor(s / PER_SHEET) + 1}.png`);
  writeFileSync(file, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log(`sheet -> ${file}`);
}

await browser.close();
process.exit(0);
