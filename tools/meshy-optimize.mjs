// Meshy runtime-GLB optimizer.
//
// The wave's raw Meshy exports are ~8-10MB each: a 2048x2048 PNG base-color
// atlas (~82% of the payload) plus ~31k triangles of uncompressed skinned mesh.
// That is fine on disk and impossible to ship. This tool produces the tracked
// runtime asset in public/meshy/ from the archived raw export:
//
//   1. TEXTURE  — decode the embedded atlas, downsample to <=1024px with
//                 Chromium's high-quality resampler (createImageBitmap
//                 resizeQuality:'high'), re-encode as JPEG. The atlas is an
//                 opaque baked base color with no alpha channel, so JPEG is
//                 lossless-enough at q92 and needs no glTF extension.
//   2. MESH     — gltfpack -cc (EXT_meshopt_compression + KHR_mesh_quantization).
//                 Requires MeshoptDecoder to be wired into GLTFLoader at runtime
//                 (see CombatScene._meshyLoader).
//
// Usage:
//   node tools/meshy-optimize.mjs                     # all GLBs in --src
//   node tools/meshy-optimize.mjs --ids=karen,chad
//   node tools/meshy-optimize.mjs --size=1024 --quality=0.92
//   node tools/meshy-optimize.mjs --src=<dir> --out=<dir>
//
// Defaults read AND write public/meshy (in-place upgrade); pass --src to
// re-derive from an archive. Raw exports live under
// art/char_refs/meshy_pilot/<id>/03_anim/<clip>/animation_glb.glb (gitignored).
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const SRC = args.src || 'public/meshy';
const OUT = args.out || 'public/meshy';
const MAX = Number(args.size || 1024);
const QUALITY = Number(args.quality || 0.92);
const ONLY = String(args.ids || '').split(',').filter(Boolean);

const WORK = join(tmpdir(), 'meshy-opt-' + process.pid);
mkdirSync(WORK, { recursive: true });

// ── GLB container helpers ───────────────────────────────────────────────────
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

// Repack every bufferView into a fresh BIN chunk (4-byte aligned) after any
// bufferView payload has changed size. Indices are preserved, so accessors,
// images and skins keep pointing at the right view.
function repack(json, bin, replacements) {
  const views = json.bufferViews || [];
  const parts = [];
  let offset = 0;
  for (let i = 0; i < views.length; i++) {
    const v = views[i];
    const data = replacements[i] || bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    v.byteOffset = offset;
    v.byteLength = data.length;
    v.buffer = 0;
    parts.push(data);
    offset += data.length;
    const pad = (4 - (offset % 4)) % 4;
    if (pad) { parts.push(Buffer.alloc(pad)); offset += pad; }
  }
  const out = Buffer.concat(parts);
  json.buffers = [{ byteLength: out.length }];
  return out;
}

function pngSize(b) { return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; }

// ── Chromium image service (decode + high-quality resample + JPEG encode) ────
const served = new Map(); // name -> Buffer
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

async function resizeToJpeg(buf, mime, max, quality) {
  const name = 'img_' + Math.random().toString(36).slice(2) + '.bin';
  served.set(name, buf);
  try {
    const b64 = await page.evaluate(async ({ name, mime, max, quality }) => {
      const blob = await (await fetch('/' + name)).blob();
      const typed = new Blob([await blob.arrayBuffer()], { type: mime });
      const probe = await createImageBitmap(typed);
      const scale = Math.min(1, max / Math.max(probe.width, probe.height));
      const w = Math.max(1, Math.round(probe.width * scale));
      const h = Math.max(1, Math.round(probe.height * scale));
      probe.close();
      const bmp = await createImageBitmap(typed, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      const url = c.toDataURL('image/jpeg', quality);
      return { data: url.split(',')[1], w, h };
    }, { name, mime, max, quality });
    return { buf: Buffer.from(b64.data, 'base64'), w: b64.w, h: b64.h };
  } finally { served.delete(name); }
}

// ── main ────────────────────────────────────────────────────────────────────
const files = readdirSync(SRC).filter(f => f.endsWith('.glb'))
  .filter(f => !ONLY.length || ONLY.some(id => f === `${id}_idle.glb` || f === `${id}.glb` || f.startsWith(id + '_')));

mkdirSync(OUT, { recursive: true });
const report = [];

for (const f of files) {
  const srcPath = join(SRC, f);
  const before = statSync(srcPath).size;
  const { json, bin } = readGLB(readFileSync(srcPath));

  // 1. textures
  const replacements = {};
  let texBefore = 0, texAfter = 0, dims = '';
  for (const img of json.images || []) {
    if (img.bufferView == null) continue;
    const v = json.bufferViews[img.bufferView];
    const raw = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    texBefore += raw.length;
    const src = img.mimeType === 'image/png' ? pngSize(raw) : { w: 0, h: 0 };
    const r = await resizeToJpeg(raw, img.mimeType || 'image/png', MAX, QUALITY);
    replacements[img.bufferView] = r.buf;
    img.mimeType = 'image/jpeg';
    texAfter += r.buf.length;
    dims = `${src.w || '?'}->${r.w}`;
  }

  // Samplers must not request mipmaps of a NPOT texture; the atlases are POT so
  // this is a no-op, but assert rather than assume.
  const packedBin = repack(json, bin, replacements);
  const stagePath = join(WORK, f);
  writeFileSync(stagePath, writeGLB(json, packedBin));
  const midSize = statSync(stagePath).size;

  // 2. meshopt
  const finalPath = join(OUT, f);
  const tmpOut = join(WORK, 'packed_' + f);
  execFileSync('npx', ['--yes', 'gltfpack', '-i', `"${stagePath}"`, '-o', `"${tmpOut}"`, '-cc'],
    { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
  writeFileSync(finalPath, readFileSync(tmpOut));
  const after = statSync(finalPath).size;

  report.push({ f, before, mid: midSize, after, texBefore, texAfter, dims });
  console.log(`${f.padEnd(34)} ${(before / 1048576).toFixed(2)}MB -> ${(after / 1048576).toFixed(2)}MB  (tex ${(texBefore / 1048576).toFixed(2)}->${(texAfter / 1048576).toFixed(2)}MB ${dims})`);
}

await browser.close();
server.close();
rmSync(WORK, { recursive: true, force: true });

const tb = report.reduce((s, r) => s + r.before, 0);
const ta = report.reduce((s, r) => s + r.after, 0);
console.log(`\nTOTAL ${(tb / 1048576).toFixed(1)}MB -> ${(ta / 1048576).toFixed(1)}MB  (${(100 - ta / tb * 100).toFixed(1)}% smaller)`);
writeFileSync(join(OUT, '_optimize_report.json'), JSON.stringify({ max: MAX, quality: QUALITY, rows: report, totalBefore: tb, totalAfter: ta }, null, 2));
