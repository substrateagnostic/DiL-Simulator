// _h-beat-report — THROWAWAY. Turns _h-beat-trace's trace.json into the
// millisecond beat timeline the design doc quotes. No opinions, only offsets.
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const TAG = arg('tag', 'base');
const DIR = join('screenshots', 'h-run', `trace-${TAG}`);
const T = JSON.parse(readFileSync(join(DIR, 'trace.json'), 'utf8'));

const ev = T.events;
const fr = T.frames;
const out = [];
const P = (s) => { out.push(s); console.log(s); };

// ── anchors ────────────────────────────────────────────────────────────
const find = (name, from = 0) => ev.find(e => e.name === name && e.t >= from);
const clickT = (find('HARNESS_click_attack') || find('HARNESS_click_power')).t;
const inputT = (find('INPUT_player_attack') || find('INPUT_power_move') || ev.find(e=>e.name==='CINE_play')).t;
const enemyTurnT = find('ENEMY_TURN_BEGIN', inputT)?.t;

// ── clip contact-frame extraction ──────────────────────────────────────
// The reach axis is chosen off the data: the hips-local axis with the largest
// excursion across the attack clip window is the strike axis.
function contactAnalysis(who, t0, t1, label) {
  const win = fr.filter(f => f.t >= t0 && f.t <= t1 && f[who] && f[who].hR);
  if (win.length < 5) return null;
  const axes = ['x', 'y', 'z', 'd'];
  const spans = {};
  for (const side of ['hL', 'hR']) {
    for (const a of axes) {
      const vals = win.map(f => f[who][side][a]);
      spans[`${side}.${a}`] = { span: +(Math.max(...vals) - Math.min(...vals)).toFixed(4), max: Math.max(...vals), min: Math.min(...vals) };
    }
  }
  // strike axis = biggest excursion among the two hands' distance-from-hips
  const best = Object.entries(spans).filter(([k]) => k.endsWith('.d')).sort((a, b) => b[1].span - a[1].span)[0];
  const [side] = best[0].split('.');
  const series = win.map(f => ({ t: f.t, v: f[who][side].d, act: (f[who].acts[0] || {}) }));
  let peak = series[0];
  for (const s of series) if (s.v > peak.v) peak = s;
  return { side, spans, peak, series, label };
}

P(`# BEAT TRACE — ${T.fight}, tag=${TAG}`);
P(`frames sampled ${fr.length} @ ~${(fr.length / ((fr[fr.length - 1].t - fr[0].t) / 1000)).toFixed(1)} Hz   screencast ${T.screencast.length}`);
P('');

// ── PLAYER ATTACK ──────────────────────────────────────────────────────
P('## PLAYER BASIC ATTACK — offsets in ms from the committing input');
P('```');
const pWin = ev.filter(e => e.t >= clickT - 5 && e.t <= (enemyTurnT ?? clickT + 4000));
for (const e of pWin) {
  const d = Object.entries(e).filter(([k]) => !['t', 'name'].includes(k))
    .map(([k, v]) => `${k}=${typeof v === 'number' ? v : JSON.stringify(v)}`).join(' ');
  P(`${String(Math.round(e.t - inputT)).padStart(6)}  ${e.name.padEnd(24)} ${d}`);
}
P('```');
P('');

const pc = contactAnalysis('ally0', inputT - 100, inputT + 2800, 'player attack');
if (pc) {
  P(`ALLY strike axis: ${pc.side} (hips-local distance). peak reach at t=${Math.round(pc.peak.t - inputT)} ms after input,`);
  P(`  clip=${pc.peak.act.role} clipTime=${pc.peak.act.time}s weight=${pc.peak.act.w} reach=${pc.peak.v}`);
  P(`  hand excursion spans: ${JSON.stringify(Object.fromEntries(Object.entries(pc.spans).map(([k, v]) => [k, v.span])))}`);
  // reach trajectory, downsampled
  P('  reach trace (ms after input -> hips-local hand distance / clip time / weight):');
  const step = Math.max(1, Math.floor(pc.series.length / 34));
  for (let i = 0; i < pc.series.length; i += step) {
    const s = pc.series[i];
    const bar = '#'.repeat(Math.round((s.v - Math.min(...pc.series.map(x => x.v))) / (pc.peak.v - Math.min(...pc.series.map(x => x.v)) || 1) * 40));
    P(`    ${String(Math.round(s.t - inputT)).padStart(6)}  ${s.v.toFixed(3)}  ${String(s.act.role || '-').padEnd(7)} ${String(s.act.time ?? '').padEnd(7)} w=${String(s.act.w ?? '').padEnd(5)} ${bar}`);
  }
}
P('');

// ── ENEMY ATTACK ───────────────────────────────────────────────────────
if (enemyTurnT != null) {
  P('## ENEMY ATTACK — offsets in ms from the enemy turn beginning');
  P('```');
  const eWin = ev.filter(e => e.t >= enemyTurnT - 5 && e.t <= enemyTurnT + 4500);
  for (const e of eWin) {
    const d = Object.entries(e).filter(([k]) => !['t', 'name'].includes(k))
      .map(([k, v]) => `${k}=${typeof v === 'number' ? v : JSON.stringify(v)}`).join(' ');
    P(`${String(Math.round(e.t - enemyTurnT)).padStart(6)}  ${e.name.padEnd(24)} ${d}`);
  }
  P('```');
  const animT = find('ANIM_enemy_attack', enemyTurnT)?.t ?? enemyTurnT;
  const ec = contactAnalysis('enemy0', animT - 100, animT + 3200, 'enemy attack');
  if (ec) {
    P('');
    P(`ENEMY strike axis: ${ec.side}. peak reach at t=${Math.round(ec.peak.t - animT)} ms after enemyAttackAnim(),`);
    P(`  clip=${ec.peak.act.role} clipTime=${ec.peak.act.time}s weight=${ec.peak.act.w} reach=${ec.peak.v}`);
    P('  reach trace (ms after enemyAttackAnim -> hips-local hand distance):');
    const lo = Math.min(...ec.series.map(x => x.v));
    const step = Math.max(1, Math.floor(ec.series.length / 34));
    for (let i = 0; i < ec.series.length; i += step) {
      const s = ec.series[i];
      const bar = '#'.repeat(Math.round((s.v - lo) / ((ec.peak.v - lo) || 1) * 40));
      P(`    ${String(Math.round(s.t - animT)).padStart(6)}  ${s.v.toFixed(3)}  ${String(s.act.role || '-').padEnd(7)} ${String(s.act.time ?? '').padEnd(7)} w=${String(s.act.w ?? '').padEnd(5)} ${bar}`);
    }
  }
}
P('');

// ── engine-side channels ───────────────────────────────────────────────
P('## SCREEN CHANNELS (frame-sampled)');
const chan = (pred, label) => {
  const runs = [];
  let cur = null;
  for (const f of fr) {
    if (pred(f)) { if (!cur) cur = { a: f.t, b: f.t }; else cur.b = f.t; }
    else if (cur) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  P(`${label}: ` + (runs.length ? runs.map(r => `[${Math.round(r.a - inputT)}..${Math.round(r.b - inputT)}] (${Math.round(r.b - r.a)}ms)`).join(' ') : 'never'));
};
chan(f => f.freeze > 0, 'hit-stop active');
chan(f => f.shake > 0.02, 'camera shake');
chan(f => f.punchT < 1, 'punch-in active');
chan(f => f.bgFlash, 'full-screen flash');
chan(f => f.numbers > 0, 'damage number on screen');

// camera z excursion
const camz = fr.map(f => ({ t: f.t, z: f.camZ }));
const zmin = Math.min(...camz.map(c => c.z)), zmax = Math.max(...camz.map(c => c.z));
P(`camera z range ${zmin.toFixed(3)} .. ${zmax.toFixed(3)} (base 5.000)  peak push-in ${(5 - zmin).toFixed(3)} units`);

// HP bar
const bar = fr.filter(f => f.hpBarPx != null);
if (bar.length) {
  const changes = [];
  for (let i = 1; i < bar.length; i++) if (Math.abs(bar[i].hpBarPx - bar[i - 1].hpBarPx) > 0.05) changes.push(bar[i]);
  if (changes.length) {
    P(`HP bar animates ${Math.round(changes[0].t - inputT)}..${Math.round(changes[changes.length - 1].t - inputT)} ms (${Math.round(changes[changes.length - 1].t - changes[0].t)} ms of travel)`);
  } else P('HP bar: no measurable width change in window');
}

// screencast mapping for the frames the doc will cite
const nearest = (ms) => {
  const target = inputT + ms;
  let b = T.screencast[0];
  for (const s of T.screencast) if (Math.abs(s.t - target) < Math.abs(b.t - target)) b = s;
  return `f${String(b.i).padStart(4, '0')}.jpg (${Math.round(b.t - inputT)}ms)`;
};
P('');
P('## SCREENCAST INDEX (ms after input -> file)');
for (const ms of [0, 80, 160, 220, 300, 400, 500, 700, 900, 1200]) P(`  ${String(ms).padStart(5)} -> ${nearest(ms)}`);

writeFileSync(join(DIR, 'report.txt'), out.join('\n'));
console.error('\nwrote ' + join(DIR, 'report.txt'));
