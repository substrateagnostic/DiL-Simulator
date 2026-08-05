// THROWAWAY research screener for the gender-of-performance study, pass 2.
//
// Rebuilds the preview-screening pipeline the first pass used and did not keep:
//   catalog previewUrl -> download GIF -> ffprobe -count_frames -> ffmpeg
//   select=eq(n,N) exact-frame extraction -> labelled contact sheet.
//
// Frame indexing is exact (select=eq(n,N)), never timing-based, so the same
// frame can never be sampled twice.
//
//   node tools/_gender-screen.mjs --bands=Fighting/Punching --size=240 --out=sheet.png
//   node tools/_gender-screen.mjs --ids=404,420,385 --size=480 --frames=4 --out=detail.png
//   node tools/_gender-screen.mjs --unscreened --list          # just enumerate
//
// GIF + frame cache lives in the scratchpad (disposable). Sheets land in
// _clips/gender/_screen/. Nothing under src/, public/, or the shipped clip
// library is read or written.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { chromium } from 'playwright';

const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const CATALOG = join(REPO, 'art/char_refs/meshy_pilot/_clips/catalog.json');
const TABLE = join(REPO, 'art/char_refs/meshy_pilot/_clips/gender/clip_gender_table.json');
const OUTDIR = join(REPO, 'art/char_refs/meshy_pilot/_clips/gender/_screen');
const CACHE = 'C:/Users/agall/AppData/Local/Temp/claude/C--Users-agall-projects-DiL-Simulator/fa0e7e41-3b95-493d-99f2-c721aa26a910/scratchpad/gifcache';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
mkdirSync(OUTDIR, { recursive: true });
mkdirSync(CACHE, { recursive: true });

const catalog = JSON.parse(readFileSync(CATALOG, 'utf8')).result.list;
const byId = new Map(catalog.map(a => [a.id, a]));
const table = existsSync(TABLE) ? JSON.parse(readFileSync(TABLE, 'utf8')).clips : [];
const screenedUrls = new Set(table.map(r => byId.get(r.id)?.previewUrl).filter(Boolean));

// ── selection ───────────────────────────────────────────────────────────────
let picked;
if (args.ids) {
  const ids = String(args.ids).split(',').map(Number);
  picked = ids.map(i => byId.get(i)).filter(Boolean);
} else if (args.bands) {
  const want = new Set(String(args.bands).split(','));
  picked = catalog.filter(a => want.has(`${a.category}/${a.subCategory}`));
} else if (args.unscreened) {
  picked = catalog.filter(a => !screenedUrls.has(a.previewUrl));
} else { console.error('need --ids / --bands / --unscreened'); process.exit(1); }

// Collapse the 90 "_inplace" duplicates: same previewUrl == same performance.
if (!args.keepdups) {
  const seen = new Set(); const uniq = [];
  for (const a of picked) { if (seen.has(a.previewUrl)) continue; seen.add(a.previewUrl); uniq.push(a); }
  picked = uniq;
}
const SKIP = Number(args.skip || 0), LIMIT = Number(args.limit || 0);
if (SKIP) picked = picked.slice(SKIP);
if (LIMIT) picked = picked.slice(0, LIMIT);

if (args.list) {
  for (const a of picked) console.log(`${String(a.id).padStart(4)}  ${a.category}/${a.subCategory}`.padEnd(46) + a.name);
  console.log(`\n${picked.length} entries`);
  process.exit(0);
}

const SIZE = Number(args.size || 240);
const NFRAMES = Number(args.frames || 2);
const COLS = Number(args.cols || (SIZE >= 400 ? 6 : 8));
const OUT = args.out || 'screen.png';

// ── frame extraction ────────────────────────────────────────────────────────
const sh = (cmd, a) => execFileSync(cmd, a, { encoding: 'buffer', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });

async function gifFor(entry) {
  const f = join(CACHE, `${entry.id}_${entry.previewUrl.split('/').pop()}`);
  if (!existsSync(f)) {
    const res = await fetch(entry.previewUrl);
    if (!res.ok) throw new Error(`gif ${res.status}`);
    writeFileSync(f, Buffer.from(await res.arrayBuffer()));
  }
  return f;
}
function frameCount(f) {
  const out = sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
    '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', f]).toString().trim();
  return Number(out) || 1;
}
function frameAt(f, n, px) {
  return sh('ffmpeg', ['-v', 'error', '-i', f, '-vf', `select=eq(n\\,${n}),scale=${px}:-1:flags=lanczos`,
    '-vsync', '0', '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-']);
}

const rows = [];
for (const e of picked) {
  try {
    const f = await gifFor(e);
    const n = frameCount(f);
    // Even spread across the middle 80% so the settle frame and the loop seam
    // are both avoided; NFRAMES===1 takes the 40% mark.
    const idx = NFRAMES === 1 ? [Math.floor(n * 0.4)]
      : Array.from({ length: NFRAMES }, (_, i) => Math.min(n - 1, Math.floor(n * (0.12 + 0.76 * (i / (NFRAMES - 1))))));
    const shots = idx.map(i => frameAt(f, i, SIZE).toString('base64'));
    const prior = table.find(r => r.id === e.id);
    rows.push({ id: e.id, name: e.name, band: `${e.category}/${e.subCategory}`, rig: e.rigType, shots, prior: prior?.previewAvatar || '' });
    process.stdout.write('.');
  } catch (err) { console.log(`\n[skip ${e.id}] ${String(err).slice(0, 90)}`); }
}
console.log(`\n${rows.length} clips framed`);
if (!rows.length) process.exit(1);

// ── contact sheet ───────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const data = await page.evaluate(async ({ rows, size, cols, nf }) => {
  const LBL = 22, PAD = 3;
  const cellW = size * nf + PAD * 2, cellH = size + LBL + PAD;
  const nRows = Math.ceil(rows.length / cols);
  const c = document.createElement('canvas');
  c.width = cellW * cols; c.height = cellH * nRows;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#0b0b12'; ctx.fillRect(0, 0, c.width, c.height);
  for (let r = 0; r < rows.length; r++) {
    const gx = (r % cols) * cellW, gy = Math.floor(r / cols) * cellH;
    for (let i = 0; i < rows[r].shots.length; i++) {
      const img = new Image(); img.src = 'data:image/png;base64,' + rows[r].shots[i]; await img.decode();
      const sc = Math.min(size / img.width, size / img.height);
      ctx.drawImage(img, gx + PAD + i * size + (size - img.width * sc) / 2, gy + LBL + (size - img.height * sc) / 2,
        img.width * sc, img.height * sc);
    }
    ctx.fillStyle = '#ffd479'; ctx.font = `bold ${Math.max(11, Math.round(size / 18))}px monospace`;
    ctx.save(); ctx.beginPath(); ctx.rect(gx, gy, cellW, LBL); ctx.clip();
    ctx.fillText(`a${rows[r].id} ${rows[r].name}${rows[r].prior ? ' <' + rows[r].prior[0].toUpperCase() + '>' : ''}`, gx + 4, gy + 16);
    ctx.restore();
    ctx.strokeStyle = '#39395a'; ctx.strokeRect(gx + 0.5, gy + 0.5, cellW - 1, cellH - 1);
  }
  return c.toDataURL('image/png');
}, { rows, size: SIZE, cols: COLS, nf: NFRAMES });
writeFileSync(join(OUTDIR, OUT), Buffer.from(data.split(',')[1], 'base64'));
console.log(`sheet -> ${join(OUTDIR, OUT)}  (${rows.length} clips, ${SIZE}px, ${NFRAMES} frames)`);
await browser.close();
process.exit(0);
