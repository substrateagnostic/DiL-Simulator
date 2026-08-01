// Stitch framing-gate stills into ONE readable review sheet.
//
// Takes the PNGs meshy-framing-gate.mjs --shots leaves in
// art/char_refs/meshy_pilot/_framing/ and lays them out in a labelled grid with
// the crown gate line drawn across every cell, so a judge can see in one glance
// whether a scalp is above or below it.
//
//   node tools/meshy-frame-sheet.mjs --fights=chief_of_restructuring,regional_director,rachel_boss,chad,grandma --out=v81_worst4_plus_shortest.png
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const REPO = process.cwd();
const DIR = join(REPO, 'art/char_refs/meshy_pilot/_framing');
const fights = String(args.fights || 'chief_of_restructuring,regional_director,rachel_boss,chad,grandma').split(',');
const COLS = Number(args.cols || 3);
const CELLW = Number(args.cellw || 720);
const OUT = join(DIR, args.out || 'framing_sheet.png');
const CROWN_MIN = Number(args.crown || 160);

const gate = existsSync(join(REPO, 'art/char_refs/meshy_pilot/_framing_gate.json'))
  ? JSON.parse(readFileSync(join(REPO, 'art/char_refs/meshy_pilot/_framing_gate.json'), 'utf8')) : { results: [] };

const cells = fights.map(f => {
  const p = join(DIR, `frame_${f}.png`);
  if (!existsSync(p)) { console.warn(`missing ${p}`); return null; }
  const row = gate.results.find(r => r.fight === f && r.side === 'enemy');
  return {
    fight: f,
    data: 'data:image/png;base64,' + readFileSync(p).toString('base64'),
    label: row ? `${f}  —  scale ${row.scale.toFixed(2)}  crown ${row.crownPx.toFixed(0)} px  feet ${row.footPx.toFixed(0)} px` : f,
  };
}).filter(Boolean);

const CELLH = Math.round(CELLW * 810 / 1440);
const PAD = 10, LABEL = 26;
const rows = Math.ceil(cells.length / COLS);
const W = COLS * (CELLW + PAD) + PAD;
const H = rows * (CELLH + LABEL + PAD) + PAD + 34;

const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#101018">
<canvas id="c" width="${W}" height="${H}"></canvas><script>
const cells = ${JSON.stringify(cells.map(c => ({ data: c.data, label: c.label })))};
const ctx = document.getElementById('c').getContext('2d');
ctx.fillStyle = '#101018'; ctx.fillRect(0,0,${W},${H});
ctx.fillStyle = '#e8e8f0'; ctx.font = 'bold 18px monospace';
ctx.fillText(${JSON.stringify(args.title || `V8.1 combat framing — crown gate at y=${CROWN_MIN} px (dashed), enemy nameplate y=15..145`)}, ${PAD}, 24);
window.__done = (async () => {
  for (let i = 0; i < cells.length; i++) {
    const col = i % ${COLS}, row = (i / ${COLS}) | 0;
    const x = ${PAD} + col * (${CELLW} + ${PAD});
    const y = 34 + ${PAD} + row * (${CELLH} + ${LABEL} + ${PAD});
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = cells[i].data; });
    ctx.drawImage(img, x, y, ${CELLW}, ${CELLH});
    // gate line, in the still's own pixel space scaled to the cell
    const gy = y + ${CROWN_MIN} * ${CELLH} / 810;
    ctx.save(); ctx.strokeStyle = '#39ff88'; ctx.setLineDash([8,6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + ${CELLW}, gy); ctx.stroke(); ctx.restore();
    ctx.fillStyle = '#9ad7ff'; ctx.font = '14px monospace';
    ctx.fillText(cells[i].label, x, y + ${CELLH} + 18);
  }
  return true;
})();
</script></body>`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: Math.min(W, 1800), height: 800 } });
await page.setContent(html);
await page.waitForFunction(() => window.__done);
await page.evaluate(() => window.__done);
const buf = await page.locator('#c').screenshot();
writeFileSync(OUT, buf);
await browser.close();
console.log('sheet ->', OUT, `${W}x${H}`);
