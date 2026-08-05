// _h-beat-strip — THROWAWAY. Builds the evidence contact strip for the design
// doc: the screencast frames nearest a set of measured beat offsets, labelled
// with the offset and what fires there. Frames come from the shipping build via
// _h-beat-trace's CDP screencast; nothing is re-rendered or re-framed.
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const TAG = arg('tag', 'hp400');
const DIR = join('screenshots', 'h-run', `trace-${TAG}`);
const T = JSON.parse(readFileSync(join(DIR, 'trace.json'), 'utf8'));
const ev = T.events;
const anchorName = arg('anchor', 'INPUT_player_attack');
const anchor = ev.find(e => e.name === anchorName) || ev.find(e => e.name === 'INPUT_power_move') || ev[0];
const marks = arg('marks', '0,150,240,340,480,560,740,900,1200').split(',').map(Number);
const labels = (arg('labels', '') || '').split('|');
const OUT = arg('out', join('screenshots', 'h-run', `strip-${TAG}.png`));

mkdirSync(join('screenshots', 'h-run'), { recursive: true });
const pick = (ms) => {
  const target = anchor.t + ms;
  let b = T.screencast[0];
  for (const s of T.screencast) if (Math.abs(s.t - target) < Math.abs(b.t - target)) b = s;
  return b;
};

const tiles = [];
const tmp = join(DIR, '_tiles');
mkdirSync(tmp, { recursive: true });
marks.forEach((ms, i) => {
  const f = pick(ms);
  const src = join(DIR, 'frames', `f${String(f.i).padStart(4, '0')}.jpg`);
  if (!existsSync(src)) return;
  const out = join(tmp, `t${String(i).padStart(2, '0')}.png`);
  const cap = `${ms >= 0 ? '+' : ''}${ms}ms  (frame @ ${Math.round(f.t - anchor.t)}ms)${labels[i] ? '  ' + labels[i] : ''}`;
  execFileSync('magick', [src, '-resize', '640x360', '-background', '#101014', '-fill', 'white',
    '-pointsize', '18', 'label:' + cap, '-gravity', 'center', '-append', out]);
  tiles.push(out);
});
execFileSync('magick', ['montage', ...tiles, '-tile', `${Math.min(5, tiles.length)}x`, '-geometry', '+4+4', '-background', '#08080a', OUT]);
console.log('wrote', OUT, `(${tiles.length} tiles, anchor ${anchor.name})`);
