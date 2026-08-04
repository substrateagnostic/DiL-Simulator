// Mean luminance of a PNG (optionally a centre crop), read off the FILE.
// Reading a WebGL canvas with drawImage() after the frame is composited returns
// black unless `preserveDrawingBuffer` is on — this repo's renderer does not set
// it, so in-page luminance probes silently measure 0. Measure the plate.
//
//   node tools/_g-lum.mjs a.png b.png ...            whole frame
//   node tools/_g-lum.mjs --crop=0.4 a.png b.png     centre 40% box
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const CROP = Number((process.argv.find(a => a.startsWith('--crop=')) || '').split('=')[1] || 0);
const FILES = process.argv.slice(2).filter(a => !a.startsWith('--'));

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  for (const f of FILES) {
    const src = `data:image/png;base64,${fs.readFileSync(path.resolve(f)).toString('base64')}`;
    const r = await p.evaluate(async ({ src: s, crop }) => {
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = s; });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      const w = crop ? Math.round(im.width * crop) : im.width;
      const h = crop ? Math.round(im.height * crop) : im.height;
      const ox = Math.round((im.width - w) / 2), oy = Math.round((im.height - h) / 2);
      const d = x.getImageData(ox, oy, w, h).data;
      let sum = 0, lit = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        sum += l; if (l > 24) lit++;
      }
      const n = d.length / 4;
      return { mean: +(sum / n).toFixed(2), litPct: +(100 * lit / n).toFixed(2), w: im.width, h: im.height };
    }, { src, crop: CROP });
    console.log(`${path.basename(f).padEnd(34)} ${r.w}x${r.h}  meanLum=${String(r.mean).padStart(7)}  pixels>24 = ${String(r.litPct).padStart(6)}%`);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
