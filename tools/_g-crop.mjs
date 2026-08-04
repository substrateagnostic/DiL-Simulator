// Find where a crop was taken from its full plate, then cut the SAME window out
// of another plate so an A/B pair is framed pixel-identically. Used to reproduce
// the producer's CROP-top / CROP-mid tie-break windows on the fixed build.
// Template match runs in Chromium's canvas (Node has no image decoder here).
//
//   node tools/_g-crop.mjs --full=a.png --crop=b.png [--cut=c.png --out=d.png]
//
// Prints `offset=X,Y score=N`. score is mean |RGB| error over the whole window;
// 0 means the crop came from exactly there.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => {
  const hit = process.argv.find(a => a.startsWith(`--${k}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};
const url = p => `data:image/png;base64,${fs.readFileSync(path.resolve(p)).toString('base64')}`;

const FULL = arg('full'), CROP = arg('crop'), CUT = arg('cut'), OUT = arg('out');

(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  const res = await p.evaluate(async ({ full, crop, cut }) => {
    const load = (src) => new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = src; });
    const data = async (src) => {
      const im = await load(src);
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0);
      return { w: im.width, h: im.height, d: x.getImageData(0, 0, im.width, im.height).data, im };
    };
    const F = await data(full), C = await data(crop);
    // Coarse pass on a 6x6 lattice of sample points, then exact on the winner.
    const pts = [];
    for (let sy = 0; sy < 6; sy++) for (let sx = 0; sx < 6; sx++) {
      pts.push([Math.floor((sx + 0.5) * C.w / 6), Math.floor((sy + 0.5) * C.h / 6)]);
    }
    let best = null, bestScore = Infinity;
    for (let oy = 0; oy <= F.h - C.h; oy++) {
      for (let ox = 0; ox <= F.w - C.w; ox++) {
        let s = 0;
        for (const [px, py] of pts) {
          const fi = ((oy + py) * F.w + (ox + px)) * 4, ci = (py * C.w + px) * 4;
          s += Math.abs(F.d[fi] - C.d[ci]) + Math.abs(F.d[fi + 1] - C.d[ci + 1]) + Math.abs(F.d[fi + 2] - C.d[ci + 2]);
          if (s >= bestScore) break;
        }
        if (s < bestScore) { bestScore = s; best = [ox, oy]; }
      }
    }
    // Exact score over the full window at the winning offset.
    let tot = 0;
    for (let y = 0; y < C.h; y++) for (let x = 0; x < C.w; x++) {
      const fi = ((best[1] + y) * F.w + (best[0] + x)) * 4, ci = (y * C.w + x) * 4;
      tot += Math.abs(F.d[fi] - C.d[ci]) + Math.abs(F.d[fi + 1] - C.d[ci + 1]) + Math.abs(F.d[fi + 2] - C.d[ci + 2]);
    }
    const out = { offset: best, score: +(tot / (C.w * C.h * 3)).toFixed(3), size: [C.w, C.h] };
    if (cut) {
      const T = await data(cut);
      const c2 = document.createElement('canvas'); c2.width = C.w; c2.height = C.h;
      c2.getContext('2d').drawImage(T.im, best[0], best[1], C.w, C.h, 0, 0, C.w, C.h);
      out.png = c2.toDataURL('image/png');
    }
    return out;
  }, { full: url(FULL), crop: url(CROP), cut: CUT ? url(CUT) : null });

  await b.close();
  console.log(`offset=${res.offset.join(',')} score=${res.score} size=${res.size.join('x')}`);
  if (res.png && OUT) {
    fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
    fs.writeFileSync(path.resolve(OUT), Buffer.from(res.png.split(',')[1], 'base64'));
    console.log('wrote', path.resolve(OUT));
  }
})().catch(e => { console.error(e); process.exit(1); });
