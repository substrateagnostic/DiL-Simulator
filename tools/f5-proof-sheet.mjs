// F5: build a SELF-EXPLANATORY proof image for the garage tear fix.
//
// The previous `screenshots/f3/PROOF_tear_removed.png` was a bare odiff mask — a
// solid red column at x≈1160 with no caption, no axis, and no record of which two
// files generated it. QA read it, correctly, as unusable: the gate was actually
// carried by `screenshots/f4/tear.json` plus the two stills, and the file NAMED
// "PROOF" was the one piece of evidence that proved nothing on its own.
//
// This regenerates it as a captioned sheet: both stills, labelled with the commit
// they came from, the measured column-step numbers, the method, and the exact
// generating filenames. Rendered in the browser and screenshotted, so it stays a
// PNG that can be dropped into a review.
//
//   node tools/f5-proof-sheet.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const F3 = path.resolve('screenshots/f3');
const F4 = path.resolve('screenshots/f4');
const tear = JSON.parse(fs.readFileSync(path.join(F4, 'tear.json'), 'utf8'));

const rel = (p) => path.relative(F3, p).split(path.sep).join('/');
const before = rel(path.join(F4, tear.before.file));
const after = rel(path.join(F4, tear.after.file));
const mask = rel(path.join(F4, 'tear_diff.png'));

const n = (x) => (typeof x === 'number' ? x.toFixed(2) : String(x));
const b = tear.before.tear, a = tear.after.tear;

const html = `<!doctype html><meta charset="utf-8">
<style>
  :root { color-scheme: dark }
  body { margin:0; background:#0b0b12; color:#dfe6ee;
         font:13px/1.5 ui-monospace,"Cascadia Code",Consolas,monospace; padding:22px 26px }
  h1 { font-size:19px; margin:0 0 2px; letter-spacing:.02em }
  .sub { color:#8fa3b5; margin:0 0 18px }
  .row { display:grid; grid-template-columns:1fr 1fr; gap:14px }
  figure { margin:0; border:1px solid #2a3140; background:#11121c }
  img { width:100%; display:block }
  figcaption { padding:7px 9px; font-size:12px; color:#a8bccd; border-top:1px solid #2a3140 }
  figcaption b { color:#e9f1f7 }
  .bad b { color:#ff6b81 } .good b { color:#5fd39a }
  table { border-collapse:collapse; margin:16px 0 0; font-size:12.5px }
  th,td { border:1px solid #2a3140; padding:5px 10px; text-align:left }
  th { background:#161a26; color:#8fa3b5; font-weight:normal }
  .num { text-align:right; font-variant-numeric:tabular-nums }
  .note { margin:14px 0 0; color:#8fa3b5; max-width:1500px }
  .note b { color:#dfe6ee }
  .files { margin-top:10px; color:#6f8296; font-size:11.5px }
  .maskwrap { margin-top:16px; border:1px solid #2a3140; background:#11121c }
  .maskwrap img { opacity:.95 }
</style>
<h1>PROOF — garage skyline "stretch / tear" removed</h1>
<p class="sub">Producer report: <i>"a building visibly stretches / tears outside the garage."</i>
&nbsp;·&nbsp; Same camera, same time of day (<b>${tear.tod}</b>), same tower seed (${tear.before.towers} towers, HQ ${tear.before.hq ? 'present' : 'absent'}) on both sides.</p>

<div class="row">
  <figure><img src="${before}"><figcaption class="bad">BEFORE — committed <b>8864a75</b> · worst column step <b>${n(b.maxColumnStep)}</b> at x=${b.atX} · ${n(b.ratio)}× the median column step</figcaption></figure>
  <figure><img src="${after}"><figcaption class="good">AFTER — working tree · worst column step <b>${n(a.maxColumnStep)}</b> at x=${a.atX} · ${n(a.ratio)}× the median</figcaption></figure>
</div>

<table>
  <tr><th>metric</th><th>before (8864a75)</th><th>after (working tree)</th><th>change</th></tr>
  <tr><td>worst adjacent-column luminance step</td><td class="num">${n(b.maxColumnStep)}</td><td class="num">${n(a.maxColumnStep)}</td><td class="num">−${n(100 - (a.maxColumnStep / b.maxColumnStep) * 100)}%</td></tr>
  <tr><td>step at x</td><td class="num">${b.atX}</td><td class="num">${a.atX}</td><td>—</td></tr>
  <tr><td>median adjacent-column step (scene texture)</td><td class="num">${n(b.medianColumnStep)}</td><td class="num">${n(a.medianColumnStep)}</td><td>—</td></tr>
  <tr><td><b>outlier ratio</b> (worst ÷ median) — the tear metric</td><td class="num"><b>${n(b.ratio)}×</b></td><td class="num"><b>${n(a.ratio)}×</b></td><td class="num">−${n(100 - (a.ratio / b.ratio) * 100)}%</td></tr>
</table>

<p class="note"><b>What the number measures.</b> A tear is a hard vertical discontinuity: one image column
differs from its neighbour far more than neighbouring columns differ anywhere else in the frame. So the
metric is the mean absolute luminance difference between every pair of adjacent columns, and the statistic
is the <b>worst</b> one divided by the <b>median</b> one. Real scene content produces a low ratio; a
terminating bright bar produces a large one. Before: <b>${n(b.ratio)}×</b>. After: <b>${n(a.ratio)}×</b>.</p>

<p class="note"><b>Why it happened.</b> At street level the towers take <code>scale.y = 2.4</code> — a
non-uniform scale on a UV-mapped box — so the facade canvas (4×6px windows on a 9×10 pitch, 1–2px seam
column) was stretched 2.4× in v: every window row became a tall amber streak and the seam became a bar
a thousand pixels long. The old dimming was a <code>material.color</code> multiply, which cannot compress
dynamic range: the near-black tower body went to pure black and vanished, while the bright seam and
windows survived at 18% and were left floating in void, terminating in a hard flat cut at the box edge.
<b>Fix:</b> at street level the towers sample a seam-free, window-free variant of the same facade canvas —
body gradient, gloss and panel joins only — so there are no thin bright features for the 2.4× stretch to
smear and nothing to orphan. Nine interpenetrating tower pairs (three of them inside the HQ footprint,
visible only at street level) are also separated deterministically, because coplanar box faces z-fight and
a z-fight under a lit seam is a literal tear.</p>

<p class="note"><b>Note the two frames are not meant to match.</b> This is a bug fix, not a
regression check: the skyline is deliberately different. The pixel diff between them
(<code>${mask}</code>, ${n(tear.diff.diffPercentage)}% of the frame) measures the size of the fix, not an
error. The "no visual regression" question is answered separately in
<code>screenshots/f4/room-ab.json</code>, which re-runs every room A/B with the city backdrop hidden on
both sides.</p>

<p class="files">Generated from <code>screenshots/f4/tear.json</code> ·
stills <code>${tear.before.file}</code> / <code>${tear.after.file}</code> ·
camera target (${tear.camera.target.x}, ${tear.camera.target.y}, ${tear.camera.target.z}) dist ${tear.camera.dist}, ortho [${tear.camera.ortho.join(', ')}] ·
rebuild with <code>node tools/f4-tear-shot.mjs</code> then <code>node tools/f5-proof-sheet.mjs</code></p>
`;

const htmlPath = path.join(F3, '_proof_tear.html');
fs.writeFileSync(htmlPath, html);

const browser = await chromium.launch({ headless: true, args: ['--force-device-scale-factor=1', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1660, height: 1200 }, deviceScaleFactor: 1 });
await page.goto('file://' + htmlPath.split(path.sep).join('/'), { waitUntil: 'load' });
await page.waitForTimeout(600);
const out = path.join(F3, 'PROOF_tear_removed.png');
await page.screenshot({ path: out, fullPage: true });
await browser.close();
fs.rmSync(htmlPath);
console.log(`→ ${out}`);
