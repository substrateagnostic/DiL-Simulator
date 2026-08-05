// THROWAWAY prep script for the idle-menu producer deliverable. Do not wire
// into the build. Adapted from tools/meshy-clip-audit.mjs (same technique:
// sample the CDN preview GIF at fixed intervals, stitch a labelled strip) but
// parameterized for arbitrary id lists + a custom output dir so it never
// writes into the shared _clips/ root (prep-lane discipline: only art/char_refs/
// meshy_pilot/_clips/menu/ and tools/_menu-*.mjs may be touched this pass).
//
//   node tools/_menu-audit.mjs --ids=243,244,245 --tag=idle_a --outdir=<dir> [--frames=6] [--persheet=8]
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const CATALOG = 'art/char_refs/meshy_pilot/_clips/catalog.json';
const catalog = JSON.parse(readFileSync(CATALOG, 'utf8')).result.list;

if (!args.ids) { console.error('need --ids=1,2,3'); process.exit(1); }
const want = String(args.ids).split(',').map(Number);
const picks = want.map(id => catalog.find(a => a.id === id)).filter(Boolean);
if (!picks.length) { console.error('no clips matched'); process.exit(1); }

const OUTDIR = args.outdir || 'art/char_refs/meshy_pilot/_clips/menu/_audit';
mkdirSync(OUTDIR, { recursive: true });
const TAG = args.tag || 'audit';
const FRAMES = Number(args.frames || 6);
const CELL = Number(args.cell || 180);
const PER_SHEET = Number(args.persheet || 8);

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
      ctx.fillStyle = '#ffd479'; ctx.font = 'bold 16px monospace';
      ctx.fillText(`#${chunk[i].id}  ${chunk[i].name}   [${chunk[i].cat}]`, 8, i * rowH + 19);
      ctx.strokeStyle = '#2a2a3a'; ctx.beginPath();
      ctx.moveTo(0, i * rowH + 0.5); ctx.lineTo(c.width, i * rowH + 0.5); ctx.stroke();
    }
    return c.toDataURL('image/png');
  }, {
    chunk: chunk.map(x => ({ data: x.data, id: x.clip.id, name: x.clip.name, cat: x.clip.category + '/' + x.clip.subCategory })),
    cell: CELL, frames: FRAMES,
  });
  const file = join(OUTDIR, `${TAG}_${Math.floor(s / PER_SHEET) + 1}.png`);
  writeFileSync(file, Buffer.from(sheet.split(',')[1], 'base64'));
  console.log(`sheet -> ${file}`);
}

await browser.close();
process.exit(0);
