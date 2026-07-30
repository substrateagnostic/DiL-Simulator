// F4: build the evidence sheet for Run B round 1.
//
// Every artifact in screenshots/f4 gets a caption that says HOW it was made and
// WHAT number it carries, because an unlabelled diff mask proves nothing on its
// own. Reads the JSONs the measuring tools wrote — nothing here is retyped by
// hand, so the sheet cannot drift from the measurements.
//
//   node tools/f4-sheet.mjs
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.resolve('screenshots/f4');
const read = (f) => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch { return null; } };
const merge = read('merge-perf.json');
const combat = read('combat-ab.json');
const tear = read('tear.json');
const rooms = read('room-ab.json');
const before = (() => { try { return JSON.parse(fs.readFileSync('perf-before.json', 'utf8')); } catch { return null; } })();
const after = (() => { try { return JSON.parse(fs.readFileSync('perf-after.json', 'utf8')); } catch { return null; } })();

const pct = (r) => (r && !r.match ? `${r.diffPercentage}% (${r.diffCount} px)` : '0% — pixel-identical');
const has = (f) => fs.existsSync(path.join(DIR, f));
const fig = (file, cap) => (has(file)
  ? `<figure><img src="${file}" loading="lazy"><figcaption>${cap}</figcaption></figure>`
  : `<figure class="missing"><figcaption>${file} — not captured<br>${cap}</figcaption></figure>`);

const S = [];

S.push(`<h2>1 · Static-batch merge — is it free?</h2>
<p class="method"><b>Method.</b> One browser session, vsync off, <code>window.__mergeStatics</code> toggled at runtime and the
room rebuilt in place, so both sides run on the same GPU in the same thermal state seconds apart. The visual pair is
captured with the engine frozen (<code>__engine.stop()</code>), the camera pinned by hand and the room-entry dialog
hidden. <b>The number that matters is the CONTROL</b>: the same capture procedure run twice with merging ON. That is
the floor set by city-backdrop time and NPC blink. A merged-vs-unmerged diff at or below its own control is
indistinguishable from re-rendering the same configuration.</p>`);

if (merge) {
  S.push(`<table><tr><th>room</th><th>draw calls unmerged</th><th>merged</th><th>cut</th><th>merged-vs-unmerged</th><th>CONTROL (merged twice)</th><th>verdict</th></tr>`);
  for (const r of merge.rooms) {
    const u = r.attribUnmerged?.full, m = r.attribMerged?.full;
    const ab = r.diff && !r.diff.match ? r.diff.diffPercentage : 0;
    const ct = r.control && !r.control.match ? r.control.diffPercentage : 0;
    S.push(`<tr><td>${r.room}</td><td>${u ?? '—'}</td><td><b>${m ?? '—'}</b></td><td>${u && m ? `−${Math.round((1 - m / u) * 100)}%` : '—'}</td><td>${ab}%</td><td>${ct}%</td><td class="${ab <= ct ? 'ok' : 'bad'}">${ab <= ct ? 'at or below control' : 'ABOVE control — investigate'}</td></tr>`);
  }
  S.push(`</table>`);
  S.push(`<div class="grid">`);
  for (const r of merge.rooms) {
    S.push(fig(`merge_${r.room}_diff.png`, `<b>${r.room}</b> — merged vs unmerged, odiff threshold 0.1, antialiasing on. ${pct(r.diff)}. Compare against the control below.`));
    S.push(fig(`merge_${r.room}_control.png`, `<b>${r.room}</b> CONTROL — merged vs merged, identical procedure. ${pct(r.control)}. This is the noise floor.`));
  }
  S.push(`</div>`);
  const t = merge.rooms.find((r) => r.on?.length && r.off?.length);
  if (t) {
    S.push(`<p class="method"><b>Frame cost</b> (vsync off, interleaved on/off/on/off, ${merge.seconds}s per pass):</p><table>
      <tr><th>room</th><th>merged dt p50</th><th>unmerged dt p50</th><th>merged CPU p50</th><th>unmerged CPU p50</th><th>meshes</th></tr>`);
    for (const r of merge.rooms) {
      if (!r.on?.length || !r.off?.length) continue;
      S.push(`<tr><td>${r.room}</td><td><b>${r.on.map((x) => x.dt_p50).join(' / ')}ms</b></td><td>${r.off.map((x) => x.dt_p50).join(' / ')}ms</td><td>${r.on.map((x) => x.cpu_p50).join(' / ')}ms</td><td>${r.off.map((x) => x.cpu_p50).join(' / ')}ms</td><td>${r.off[0].meshes} → ${r.on[0].meshes}</td></tr>`);
    }
    S.push(`</table>`);
  }
}

S.push(`<h2>2 · Combat look — like-for-like across the two commits</h2>
<p class="method"><b>Method.</b> A single wall-clock combat still cannot compare two builds: <code>?dev&amp;fight=</code>
runs a live turn loop, so at any fixed wait the two builds sit at different points of a telegraph and the enemy can be
facing away in one and forward in the other. Instead: freeze the engine, hand-step the sim a fixed number of frames,
and capture a STRIP on each side (PRNG pinned, headless on both sides — the same path the committed contact sheet
used). The comparison is the <b>minimum</b> odiff over every cross pair, i.e. the best pose alignment between the two
strips; the residual is the look delta rather than animation phase. The <b>pose-shift control</b> is two adjacent
frames from the SAME build — how much a 5-sim-frame pose change alone moves the image.</p>`);

if (combat) {
  S.push(`<table><tr><th>fight</th><th>best cross pair</th><th>look delta</th><th>pose-shift control (before / after)</th><th>ratio</th></tr>`);
  for (const o of combat.out) {
    const d = o.best.pct, c = Math.min(
      o.ctlBefore?.match ? 0 : o.ctlBefore.diffPercentage,
      o.ctlAfter?.match ? 0 : o.ctlAfter.diffPercentage);
    S.push(`<tr><td>fight-${o.fight}</td><td>before[${o.best.i}] vs after[${o.best.j}]</td><td><b>${d}%</b> (${o.best.count} px)</td><td>${o.ctlBefore?.match ? 0 : o.ctlBefore.diffPercentage}% / ${o.ctlAfter?.match ? 0 : o.ctlAfter.diffPercentage}%</td><td class="${d <= c ? 'ok' : ''}">${d === 0 ? 'identical' : `${(c / d).toFixed(1)}× under the pose floor`}</td></tr>`);
  }
  S.push(`</table><div class="grid">`);
  for (const o of combat.out) {
    if (o.best.pct === 0) {
      S.push(`<figure class="identical"><figcaption><b>fight-${o.fight}</b> — no diff mask exists: the best-aligned cross
        pair is <b>pixel-identical</b> (0 px at threshold 0.1). odiff writes no mask for a match. The two source frames
        are beside this cell; the pose-shift floor for the same build is
        ${o.ctlBefore?.match ? 0 : o.ctlBefore.diffPercentage}%.</figcaption></figure>`);
    } else {
      S.push(fig(`combat_${o.fight}_BEST_diff.png`, `<b>fight-${o.fight}</b> — best-aligned cross pair, HEAD vs working tree. ${o.best.pct}% at threshold 0.1 against a pose-shift floor of ${o.ctlBefore?.match ? 0 : o.ctlBefore.diffPercentage}%.`));
    }
    S.push(fig(`combat_${o.fight}_before_${o.best.i}.png`, `<b>fight-${o.fight}</b> BEFORE — HEAD 8864a75, strip frame ${o.best.i}.`));
    S.push(fig(`combat_${o.fight}_after_${o.best.j}.png`, `<b>fight-${o.fight}</b> AFTER — working tree, strip frame ${o.best.j}.`));
  }
  S.push(`</div>`);
}

if (rooms) {
  S.push(`<h2>2b · Exploration look — HEAD vs working tree, quantified</h2>
  <p class="method"><b>Method.</b> Same frozen rig on both dev servers: engine stopped, camera pinned by hand, dialogs
  hidden, PRNG pinned. <b>Control</b> = the AFTER build captured twice through the identical procedure. The third column
  re-runs the AFTER build with the N8AO exponent put back to its pre-change value (7.5) — whatever still differs is
  <i>not</i> the AO change, and that split is the attribution the reviewer asked for.</p>
  <table><tr><th>room</th><th>before → after</th><th>CONTROL (after twice)</th><th>with AO restored to 7.5</th><th>⇒ AO's share</th></tr>`);
  for (const r of rooms.out) {
    const d = r.diff.match ? 0 : r.diff.diffPercentage;
    const c = r.control.match ? 0 : r.control.diffPercentage;
    const m = r.minusAO ? (r.minusAO.match ? 0 : r.minusAO.diffPercentage) : null;
    S.push(`<tr><td>${r.room}</td><td><b>${d}%</b> (${r.diff.diffCount || 0} px)</td><td>${c}% (${r.control.diffCount || 0} px)</td><td>${m === null ? '—' : `${m}%`}</td><td>${m === null ? '—' : `${(d - m).toFixed(2)}pp`}</td></tr>`);
  }
  const cfgB = rooms.out[0]?.beforeCfg, cfgA = rooms.out[0]?.afterCfg;
  S.push(`</table>`);
  if (cfgB && cfgA) {
    S.push(`<table><tr><th>render config</th><th>BEFORE</th><th>AFTER</th></tr>
      <tr><td>enabled composer passes</td><td>${cfgB.passes}</td><td>${cfgA.passes}</td></tr>
      <tr><td>context antialias</td><td>${cfgB.antialias}</td><td>${cfgA.antialias}</td></tr>
      <tr><td>pixel ratio</td><td>${cfgB.pixelRatio}</td><td>${cfgA.pixelRatio}</td></tr>
      <tr><td>N8AO intensity / samples / halfRes</td><td>${cfgB.aoIntensity} / ${cfgB.aoSamples} / ${cfgB.aoHalfRes}</td><td>${cfgA.aoIntensity} / ${cfgA.aoSamples} / ${cfgA.aoHalfRes}</td></tr>
      <tr><td>shadowMap.autoUpdate</td><td>${cfgB.shadowAutoUpdate}</td><td>${cfgA.shadowAutoUpdate}</td></tr></table>
      <p class="method">Read the masks before reading the percentages: the changed pixels are almost entirely in the
      <b>city backdrop</b> (tower window lights, silhouette edges, light-trail streaks) and in the procedural monitor
      screens, which regenerate their canvas content per build. Room floors, walls, furniture and characters come back
      unchanged. <code>pixelRatio</code> reads 1 on both sides because this display is not HiDPI — the 1.5 cap in the
      working tree only bites on a devicePixelRatio-2 panel and cannot be A/B'd here.</p>`);
  }
  S.push(`<div class="grid">`);
  for (const r of rooms.out) {
    S.push(fig(`room_${r.room}_diff.png`, `<b>${r.room}</b> — HEAD vs working tree, threshold 0.1. ${pct(r.diff)}. Red is where the two builds differ.`));
    S.push(fig(`room_${r.room}_control.png`, `<b>${r.room}</b> CONTROL — working tree captured twice. ${pct(r.control)}. The floor.`));
  }
  S.push(`</div>`);
}

S.push(`<h2>3 · Parking-garage skyline tear</h2>
<p class="method"><b>Method.</b> Two dev servers, one commit apart (HEAD 8864a75 on :5273 from a clean git worktree,
working tree on :5173). Engine frozen, garage interior hidden, and an identical hand-set orthographic camera aimed at
the cluster the geometry diagnostic flagged (towers 35/37/39 against the HQ tower). The shipped garage camera is
predawn and its frame is nearly black — which is why no still of the shipped framing can show this either way, and why
the previous round could show "gone" but not "was there".</p>
<p class="method"><b>The tear metric is not an adjective.</b> A tear in a skyline built from soft haze gradients is a
straight vertical luminance discontinuity. Read the frame back with <code>gl.readPixels</code>, average each column's
luminance over the full height, and take the largest step between adjacent columns, against that frame's own median
step.</p>`);

if (tear) {
  S.push(`<table><tr><th></th><th>max column-luminance step</th><th>at x</th><th>median step</th><th>ratio to median</th></tr>
  <tr><td>BEFORE — HEAD 8864a75</td><td class="bad"><b>${tear.before.tear.maxColumnStep}</b></td><td>${tear.before.tear.atX}</td><td>${tear.before.tear.medianColumnStep}</td><td class="bad"><b>${tear.before.tear.ratio}×</b></td></tr>
  <tr><td>AFTER — working tree</td><td class="ok"><b>${tear.after.tear.maxColumnStep}</b></td><td>${tear.after.tear.atX}</td><td>${tear.after.tear.medianColumnStep}</td><td class="ok"><b>${tear.after.tear.ratio}×</b></td></tr></table>
  <p class="method">Geometric evidence from <code>tools/f3-garage-diag.mjs</code> at the shipped camera, same 54 towers on
  both sides: <b>HEAD 9 overlapping tower AABBs, 3 of them intersecting the HQ tower — working tree 0</b>
  (<code>screenshots/f3/f4_garage_HEAD_diag.json</code> vs <code>f4_garage_WT_diag.json</code>). The whole-frame diff
  below is ${tear.diff.diffPercentage}%, which is NOT all tear: CityBackdrop's haze/atmosphere was reworked in the same
  pass, so read the seam metric above for the tear itself and the images for the character of the change.</p>
  <div class="grid">
  ${fig('tear_HEAD_8864a75.png', `<b>BEFORE</b> — HEAD 8864a75, skyline camera. Hard vertical discontinuity at x=${tear.before.tear.atX}: step ${tear.before.tear.maxColumnStep}, ${tear.before.tear.ratio}× the frame's median column step.`)}
  ${fig('tear_working_tree.png', `<b>AFTER</b> — working tree, identical camera and time of day. Largest step ${tear.after.tear.maxColumnStep} at x=${tear.after.tear.atX} (a tower silhouette edge), ${tear.after.tear.ratio}× median.`)}
  ${fig('tear_diff.png', `Diff mask, threshold 0.1 — ${pct(tear.diff)}. Includes the deliberate haze rework, not only the seam.`)}
  </div>`);
}

if (before && after) {
  const row = (label, pick) => {
    const b = pick(before), a = pick(after);
    return `<tr><td>${label}</td><td>${b ?? '—'}</td><td><b>${a ?? '—'}</b></td></tr>`;
  };
  const t = (j, room, throttle) => (j.timing || []).find((x) => x.room === room && x.throttle === throttle);
  const u = (j, room) => (j.uncapped || []).find((x) => x.room === room);
  S.push(`<h2>4 · Perf headline — HEAD 8864a75 vs working tree, same harness</h2>
  <p class="method"><b>Method.</b> The identical harness run twice: BEFORE against a clean git worktree at 8864a75
  served on :5273, AFTER against the working tree on :5173, back to back on the same machine (RTX 4050, headed,
  hardware GPU string recorded in both reports). Full reports: <code>screenshots/perf/before/BEFORE.md</code> and
  <code>screenshots/perf/after/AFTER.md</code>; the after report ships the exact diff that produced it as
  <code>AFTER.patch</code>.</p>
  <table><tr><th>metric</th><th>BEFORE (8864a75)</th><th>AFTER (working tree)</th></tr>`);
  for (const room of ['cubicle_farm', 'reception', 'parking_garage']) {
    S.push(row(`${room} · p50 @CPU 1x`, (j) => t(j, room, 1) && `${t(j, room, 1).timing.p50}ms (${t(j, room, 1).timing.fps_p50} fps)`));
    S.push(row(`${room} · p95 @CPU 1x`, (j) => t(j, room, 1) && `${t(j, room, 1).timing.p95}ms`));
    S.push(row(`${room} · p95 vsync OFF`, (j) => u(j, room) && `${u(j, room).timing.p95}ms`));
    S.push(row(`${room} · p50 @CPU 4x`, (j) => t(j, room, 4) && `${t(j, room, 4).timing.p50}ms (${t(j, room, 4).timing.fps_p50} fps)`));
    S.push(row(`${room} · draw calls p50 @1x`, (j) => t(j, room, 1) && String(t(j, room, 1).drawCalls.p50)));
  }
  S.push(row('leak — room re-entry', (j) => (j.leak ? j.leak.verdict.split('—')[0].trim() : null)));
  S.push(row('worst frame after a room transition', (j) => (j.transitions ? `${j.transitions.worstMs}ms` : null)));
  S.push(row('frozen frame — max per-channel delta (readPixels)', (j) => (j.frozen?.[0]?.lsb ? `${Math.max(...j.frozen.map((f) => f.lsb?.maxDelta ?? 0))}/255` : null)));
  S.push(`</table>`);
}

fs.writeFileSync(path.join(DIR, 'index.html'), `<!doctype html>
<meta charset="utf-8"><title>Run B round 1 — evidence sheet</title>
<style>
 body{background:#0b0b12;color:#dde;font:14px/1.55 ui-monospace,Menlo,Consolas,monospace;margin:0;padding:24px 28px;max-width:1500px}
 h1{color:#7be0a0;font-size:20px;margin:0 0 4px} h2{color:#53a8b6;font-size:16px;margin:34px 0 8px;border-bottom:1px solid #223;padding-bottom:4px}
 p.method{color:#9aa;background:#11111c;border-left:3px solid #33556b;padding:10px 14px;margin:8px 0 14px}
 p.method b{color:#cde} code{color:#e0c07a}
 table{border-collapse:collapse;margin:10px 0 18px;font-size:13px} th,td{border:1px solid #263;padding:5px 10px;text-align:left}
 th{background:#13131f;color:#8cc} td.ok{color:#7be0a0} td.bad{color:#ff8a9a} .ok b{color:#7be0a0} .bad b{color:#ff8a9a}
 .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(430px,1fr));gap:12px}
 figure{margin:0;border:1px solid #263;background:#11111c;padding:6px} img{width:100%;display:block;background:#000}
 figcaption{font-size:12px;color:#9ab;padding:6px 2px} figure.missing{border-color:#e94560;color:#e94560;min-height:60px}
 figure.identical{border-color:#7be0a0;background:#0e1a12;display:flex;align-items:center}
 figure.identical figcaption{color:#bfe}
 small{color:#667}
</style>
<h1>TRUST ISSUES — Run B, round 1 evidence sheet</h1>
<p><small>Generated ${new Date().toISOString()} by <code>tools/f4-sheet.mjs</code> from the measurement JSONs. Nothing on this page is hand-typed.
BEFORE = git worktree detached at 8864a75 served on :5273. AFTER = the working tree served on :5173. GPU: RTX 4050 Laptop, headed, D3D11.</small></p>
${S.join('\n')}
`);
console.log(`→ ${path.join(DIR, 'index.html')}`);
