// Dark-fabric destreak — removes the bright hairline "scratch" strokes that
// Meshy's `remove_lighting` leaves baked into near-black and navy cloth.
//
// WHAT THE DEFECT IS. Meshy bakes base color by de-lighting the generated
// render. On a dark suit the de-light solve is ill-conditioned: a specular
// highlight sitting on a fold has almost no diffuse signal underneath it to
// divide out, so the highlight survives as a thin bright stroke in the albedo.
// You get dozens of 1-3 texel-wide light scratches across the jacket. They are
// invisible on a thumbnail, invisible on skin and shirt, and unmistakable on
// navy at inspection zoom (chief_of_restructuring's shoulder is the worst case).
//
// WHY A MEDIAN AND NOT A BLUR. The strokes are thin, bright, and sparse — a
// textbook impulse-noise signature, which is exactly what a median filter is
// for and exactly what a Gaussian is bad at. A blur would smear the stroke into
// a wider grey bruise and would also soften the seams, buttons and pocket welts
// we want to keep. The median of a 5x5 neighbourhood on a stroke that is 3 texels
// wide returns the fabric under it. Real fabric structure (a welt, a lapel edge,
// a button) is thicker than the kernel is wide, so the median returns itself and
// nothing happens.
//
// WHY IT IS ONE-SIDED. Only pixels BRIGHTER than their local median are pulled
// down. The dark side of the residual is where the folds and shadow lines live —
// the whole reason the jacket reads as cloth and not as a black shape. Touching
// it would flatten the garment. `--symmetric` exists to prove that in a diff.
//
// WHY IT IS MASKED TO DARK PIXELS. The defect only exists where the de-light
// divided by almost nothing. Skin, shirt, tie and hair are above the band and
// are never read or written. The mask is eroded so that UV-island borders — a
// dark texel adjacent to bright gutter — are excluded; without the erosion the
// filter chews the outline of every island.
//
// Chroma is preserved: the pixel is scaled toward the target luminance rather
// than replaced, so a navy scratch relaxes to navy, not to grey.
//
// Usage:
//   node tools/meshy-destreak.mjs --audit                      # measure only, all raws
//   node tools/meshy-destreak.mjs --ids=firm_partner,compliance --out=public/meshy
//   node tools/meshy-destreak.mjs --ids=... --out=<dir> --quality=0.96 --size=1024
//
// Defaults read art/char_refs/meshy_pilot/_raw_runtime (the 2048px archived
// exports) — NEVER the shipped GLBs, which are already downsampled and JPEG'd
// and whose bufferViews are meshopt-compressed. Filtering has to happen at 2048
// before the resample or the resample averages the stroke into the fabric and
// leaves a wider, softer, more visible smear.
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const SRC = args.src || 'art/char_refs/meshy_pilot/_raw_runtime';
const OUT = args.out || null;                  // omit => audit only
const MAX = Number(args.size || 1024);
const QUALITY = Number(args.quality || 0.96);
const ONLY = String(args.ids || '').split(',').filter(Boolean);
const DARK = Number(args.dark || 56);          // luminance ceiling of the band, 0..255
const THRESH = Number(args.thresh || 3.0);     // how far above local median counts as a scratch
const KEEP = Number(args.keep || 0.15);        // fraction of the excess left behind
const SYMMETRIC = !!args.symmetric;
const AUDIT = !!args.audit || !OUT;

// ── GLB container helpers (same contract as tools/meshy-optimize.mjs) ────────
function readGLB(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off);
    const type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
    else if (type === 0x004e4942) bin = data;
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  return { json, bin };
}
function writeGLB(json, bin) {
  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  const binPad = (4 - (bin.length % 4)) % 4;
  const total = 12 + 8 + jsonBuf.length + jsonPad + 8 + bin.length + binPad;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  let o = 12;
  out.writeUInt32LE(jsonBuf.length + jsonPad, o); out.writeUInt32LE(0x4e4f534a, o + 4);
  jsonBuf.copy(out, o + 8); out.fill(0x20, o + 8 + jsonBuf.length, o + 8 + jsonBuf.length + jsonPad);
  o += 8 + jsonBuf.length + jsonPad;
  out.writeUInt32LE(bin.length + binPad, o); out.writeUInt32LE(0x004e4942, o + 4);
  Buffer.from(bin).copy(out, o + 8);
  return out;
}
function repack(json, bin, replacements) {
  const views = json.bufferViews || [];
  const parts = [];
  let offset = 0;
  for (let i = 0; i < views.length; i++) {
    const v = views[i];
    const data = replacements[i] || bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    v.byteOffset = offset; v.byteLength = data.length; v.buffer = 0;
    parts.push(data);
    offset += data.length;
    const pad = (4 - (offset % 4)) % 4;
    if (pad) { parts.push(Buffer.alloc(pad)); offset += pad; }
  }
  const out = Buffer.concat(parts);
  json.buffers = [{ byteLength: out.length }];
  return out;
}

// ── Chromium image service ──────────────────────────────────────────────────
const served = new Map();
const server = createServer((req, res) => {
  const name = decodeURIComponent(req.url.slice(1));
  if (name === '' || name === 'index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    return res.end('<!doctype html><html><body></body></html>');
  }
  const buf = served.get(name);
  if (!buf) { res.writeHead(404); return res.end('nope'); }
  res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': buf.length });
  res.end(buf);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/index.html`);

async function processAtlas(buf, mime, opts) {
  const name = 'img_' + Math.random().toString(36).slice(2) + '.bin';
  served.set(name, buf);
  try {
    return await page.evaluate(async ({ name, mime, o }) => {
      const blob = await (await fetch('/' + name)).blob();
      const typed = new Blob([await blob.arrayBuffer()], { type: mime });
      const bmp = await createImageBitmap(typed);
      const W = bmp.width, H = bmp.height;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bmp, 0, 0); bmp.close();
      const img = ctx.getImageData(0, 0, W, H);
      const d = img.data;

      const L = new Float32Array(W * H);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) L[p] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

      // dark band, minus the gutter, eroded by 2 so island borders are excluded
      const band = new Uint8Array(W * H);
      for (let p = 0; p < W * H; p++) band[p] = (L[p] < o.dark && L[p] > 2) ? 1 : 0;
      const mask = new Uint8Array(W * H);
      let maskN = 0;
      for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
        const p = y * W + x; if (!band[p]) continue;
        let ok = 1;
        for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (!band[p + dy * W + dx]) { ok = 0; break; }
        if (ok) { mask[p] = 1; maskN++; }
      }

      // 5x5 median of luminance over masked pixels only
      const R = 2;
      const win = new Float32Array(25);
      let touched = 0, sumDelta = 0, maxDelta = 0;
      const outD = new Uint8ClampedArray(d);
      for (let y = R; y < H - R; y++) {
        for (let x = R; x < W - R; x++) {
          const p = y * W + x;
          if (!mask[p]) continue;
          let n = 0;
          for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
            const q = p + dy * W + dx;
            if (mask[q]) win[n++] = L[q];
          }
          if (n < 13) continue;
          const arr = Array.prototype.slice.call(win, 0, n).sort((a, b) => a - b);
          const med = arr[n >> 1];
          const excess = L[p] - med;
          const over = o.symmetric ? Math.abs(excess) : excess;
          if (over <= o.thresh) continue;
          const target = o.symmetric
            ? med + Math.sign(excess) * (Math.abs(excess) * o.keep)
            : med + excess * o.keep;
          const cur = Math.max(1e-3, L[p]);
          const s = target / cur;
          const i4 = p * 4;
          outD[i4] = d[i4] * s; outD[i4 + 1] = d[i4 + 1] * s; outD[i4 + 2] = d[i4 + 2] * s;
          touched++;
          const dl = Math.abs(L[p] - target);
          sumDelta += dl; if (dl > maxDelta) maxDelta = dl;
        }
      }

      const stats = {
        w: W, h: H,
        maskFrac: maskN / (W * H),
        touchedFrac: touched / (W * H),
        touchedOfMask: maskN ? touched / maskN : 0,
        meanDelta: touched ? sumDelta / touched : 0,
        maxDelta,
      };
      if (o.auditOnly) return { stats, data: null, w: 0, h: 0 };

      ctx.putImageData(new ImageData(outD, W, H), 0, 0);
      // resample with the shipping resampler, then encode
      const scale = Math.min(1, o.max / Math.max(W, H));
      const w2 = Math.max(1, Math.round(W * scale)), h2 = Math.max(1, Math.round(H * scale));
      const rb = await createImageBitmap(c, { resizeWidth: w2, resizeHeight: h2, resizeQuality: 'high' });
      const c2 = document.createElement('canvas'); c2.width = w2; c2.height = h2;
      c2.getContext('2d').drawImage(rb, 0, 0); rb.close();
      const url = c2.toDataURL('image/jpeg', o.quality);
      return { stats, data: url.split(',')[1], w: w2, h: h2 };
    }, { name, mime, o: opts });
  } finally { served.delete(name); }
}

// ── main ────────────────────────────────────────────────────────────────────
const files = readdirSync(SRC).filter(f => f.endsWith('.glb'))
  .filter(f => !ONLY.length || ONLY.some(id => f === `${id}_idle.glb` || f === `${id}.glb` || f.startsWith(id + '_')));

const WORK = join(tmpdir(), 'meshy-destreak-' + process.pid);
mkdirSync(WORK, { recursive: true });
if (OUT) mkdirSync(OUT, { recursive: true });

const report = [];
for (const f of files) {
  const rawPath = join(SRC, f);
  const { json, bin } = readGLB(readFileSync(rawPath));
  const replacements = {};
  let stats = null;
  for (const img of json.images || []) {
    if (img.bufferView == null) continue;
    const v = json.bufferViews[img.bufferView];
    const raw = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    const r = await processAtlas(raw, img.mimeType || 'image/png',
      { dark: DARK, thresh: THRESH, keep: KEEP, symmetric: SYMMETRIC, max: MAX, quality: QUALITY, auditOnly: AUDIT });
    stats = r.stats;
    if (!AUDIT) { replacements[img.bufferView] = Buffer.from(r.data, 'base64'); img.mimeType = 'image/jpeg'; }
    break; // one base-color atlas per character
  }
  if (!stats) { console.log(`${f}: no embedded atlas`); continue; }

  const row = { f, ...stats };
  if (!AUDIT) {
    const packedBin = repack(json, bin, replacements);
    const stagePath = join(WORK, f);
    writeFileSync(stagePath, writeGLB(json, packedBin));
    const tmpOut = join(WORK, 'packed_' + f);
    execFileSync('npx', ['--yes', 'gltfpack', '-i', `"${stagePath}"`, '-o', `"${tmpOut}"`, '-cc'],
      { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
    const outPath = join(OUT, f);
    const prev = existsSync(outPath) ? statSync(outPath).size : 0;
    writeFileSync(outPath, readFileSync(tmpOut));
    row.prevBytes = prev; row.bytes = statSync(outPath).size;
  }
  report.push(row);
  const size = AUDIT ? '' : `  ${(row.prevBytes / 1024).toFixed(0)}KB -> ${(row.bytes / 1024).toFixed(0)}KB`;
  console.log(`${f.padEnd(32)} dark=${(stats.maskFrac * 100).toFixed(1)}%  scratch=${(stats.touchedOfMask * 100).toFixed(2)}% of dark  meanΔL=${stats.meanDelta.toFixed(2)}  maxΔL=${stats.maxDelta.toFixed(1)}${size}`);
}

report.sort((a, b) => b.touchedOfMask - a.touchedOfMask);
console.log('\nWORST BY SCRATCH DENSITY (share of dark-fabric texels above local median + ' + THRESH + '):');
for (const r of report.slice(0, 16)) console.log(`  ${r.f.padEnd(32)} ${(r.touchedOfMask * 100).toFixed(2)}%  meanΔL=${r.meanDelta.toFixed(2)}`);
if (!AUDIT) {
  const pb = report.reduce((s, r) => s + (r.prevBytes || 0), 0);
  const nb = report.reduce((s, r) => s + (r.bytes || 0), 0);
  console.log(`\nTOTAL ${(pb / 1048576).toFixed(2)}MB -> ${(nb / 1048576).toFixed(2)}MB  (${nb >= pb ? '+' : ''}${((nb - pb) / 1048576).toFixed(2)}MB)`);
}
if (args.json) writeFileSync(String(args.json), JSON.stringify({ src: SRC, dark: DARK, thresh: THRESH, keep: KEEP, quality: QUALITY, size: MAX, rows: report }, null, 2));

await browser.close();
server.close();
rmSync(WORK, { recursive: true, force: true });
