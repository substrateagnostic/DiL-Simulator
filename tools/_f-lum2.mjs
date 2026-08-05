// Mean + standard deviation of luminance for a PNG, read off the FILE.
//
// _g-lum.mjs reports mean and a >24 lit fraction. Neither of those distinguishes
// "the whole frame got brighter" from "the frame grew light and dark places",
// and the second is the only thing a relight is for. SD over the per-pixel Rec.709
// luma is the contrast number: a flat wash raises mean and DROPS sd, pooled
// fixtures raise mean and HOLD sd.
//
// Same file-reading rationale as _g-lum: the renderer does not set
// preserveDrawingBuffer, so an in-page canvas probe measures 0. Measure the plate.
//
//   node tools/_f-lum2.mjs a.png b.png ...
//   node tools/_f-lum2.mjs --crop=0.6 a.png b.png     centre 60% box
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const CROP = Number((process.argv.find(a => a.startsWith('--crop=')) || '').split('=')[1] || 0);
const FILES = process.argv.slice(2).filter(a => !a.startsWith('--'));

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  const out = [];
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
      let sum = 0, sq = 0, lit = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        sum += l; sq += l * l; if (l > 24) lit++; n++;
      }
      const mean = sum / n;
      return {
        mean: +mean.toFixed(2),
        sd: +Math.sqrt(Math.max(0, sq / n - mean * mean)).toFixed(2),
        litPct: +(100 * lit / n).toFixed(2),
        w: im.width, h: im.height,
      };
    }, { src, crop: CROP });
    out.push({ file: path.basename(f), ...r });
    console.log(`${path.basename(f).padEnd(38)} ${r.w}x${r.h}  mean=${String(r.mean).padStart(7)}  sd=${String(r.sd).padStart(7)}  >24=${String(r.litPct).padStart(6)}%`);
  }
  await b.close();
  if (process.env.LUM_JSON) fs.writeFileSync(process.env.LUM_JSON, JSON.stringify(out, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
