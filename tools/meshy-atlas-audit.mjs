// Meshy atlas auditor — pulls the embedded base-color atlas out of a GLB and
// measures the dark-fabric scratch-streak artifact that Meshy's `remove_lighting`
// bakes into near-black cloth.
//
// Why it exists: the streaks are invisible in a thumbnail and obvious at
// inspection zoom, so "does this character have them" was a taste argument.
// This makes it a number. The metric is HIGH-PASS ENERGY INSIDE THE DARK BAND:
// for every pixel whose luminance is under --dark (default 0.22 in sRGB 0..1),
// take |L - blur3x3(L)| and report the mean and the 99.5th percentile, scaled
// to 0..255. Streaks are a locally-high-frequency luminance ripple, so they land
// almost entirely in that statistic while flat black fabric scores ~0 and a
// legitimately detailed dark region (a lapel edge, a button) contributes only at
// the tail.
//
// Usage:
//   node tools/meshy-atlas-audit.mjs --src=art/char_refs/meshy_pilot/_raw_runtime
//   node tools/meshy-atlas-audit.mjs --src=public/meshy --ids=firm_partner
//   node tools/meshy-atlas-audit.mjs --src=... --dump=<dir>   # also write atlases + crops
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const SRC = args.src || 'art/char_refs/meshy_pilot/_raw_runtime';
const ONLY = String(args.ids || '').split(',').filter(Boolean);
const DARK = Number(args.dark || 0.22);
const DUMP = args.dump ? String(args.dump) : null;

export function readGLB(buf) {
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

export function atlasOf(buf) {
  const { json, bin } = readGLB(buf);
  for (const img of json.images || []) {
    if (img.bufferView == null) continue;
    const v = json.bufferViews[img.bufferView];
    return {
      data: bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength),
      mime: img.mimeType || 'image/png',
    };
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('meshy-atlas-audit.mjs')) {
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

  if (DUMP) mkdirSync(DUMP, { recursive: true });

  const files = readdirSync(SRC).filter(f => f.endsWith('.glb'))
    .filter(f => !ONLY.length || ONLY.some(id => f.startsWith(id + '_') || f === `${id}.glb`));

  const rows = [];
  for (const f of files) {
    const a = atlasOf(readFileSync(join(SRC, f)));
    if (!a) { console.log(`${f}: no embedded atlas`); continue; }
    const name = 'a_' + Math.random().toString(36).slice(2) + '.bin';
    served.set(name, a.data);
    const stat = await page.evaluate(async ({ name, mime, dark }) => {
      const blob = await (await fetch('/' + name)).blob();
      const typed = new Blob([await blob.arrayBuffer()], { type: mime });
      const bmp = await createImageBitmap(typed);
      const c = document.createElement('canvas');
      c.width = bmp.width; c.height = bmp.height;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bmp, 0, 0);
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      const W = c.width, H = c.height;
      // luminance plane, 0..1 sRGB
      const L = new Float32Array(W * H);
      for (let i = 0, p = 0; i < data.length; i += 4, p++) {
        L[p] = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
      }
      // 3x3 box blur, then high-pass residual, restricted to the dark band.
      const res = [];
      let darkCount = 0;
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const p = y * W + x;
          if (L[p] >= dark) continue;
          // skip fully-unused atlas gutter (pure black AND pure black neighbours
          // is indistinguishable from unwrapped space; keep it, it scores 0)
          darkCount++;
          let s = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += L[p + dy * W + dx];
          res.push(Math.abs(L[p] - s / 9) * 255);
        }
      }
      res.sort((a, b) => a - b);
      const pct = (q) => res.length ? res[Math.min(res.length - 1, Math.floor(q * res.length))] : 0;
      const mean = res.length ? res.reduce((s, v) => s + v, 0) / res.length : 0;
      return {
        w: W, h: H,
        darkFrac: darkCount / (W * H),
        hpMean: mean, hp99: pct(0.99), hp995: pct(0.995), hpMax: res.length ? res[res.length - 1] : 0,
      };
    }, { name, mime: a.mime, dark: DARK });
    served.delete(name);

    if (DUMP) {
      const ext = a.mime === 'image/jpeg' ? 'jpg' : 'png';
      writeFileSync(join(DUMP, f.replace(/\.glb$/, `.${ext}`)), a.data);
    }

    rows.push({ f, ...stat });
    console.log(`${f.padEnd(32)} ${stat.w}px dark=${(stat.darkFrac * 100).toFixed(1)}%  hpMean=${stat.hpMean.toFixed(3)}  hp99=${stat.hp99.toFixed(2)}  hp99.5=${stat.hp995.toFixed(2)}  max=${stat.hpMax.toFixed(1)}`);
  }

  rows.sort((a, b) => b.hp995 - a.hp995);
  console.log('\nWORST BY hp99.5 (dark-band high-pass energy):');
  for (const r of rows.slice(0, 14)) console.log(`  ${r.f.padEnd(32)} hp99.5=${r.hp995.toFixed(2)}  hpMean=${r.hpMean.toFixed(3)}  dark=${(r.darkFrac * 100).toFixed(1)}%`);
  if (DUMP) writeFileSync(join(DUMP, '_atlas_audit.json'), JSON.stringify({ src: SRC, dark: DARK, rows }, null, 2));

  await browser.close();
  server.close();
}
