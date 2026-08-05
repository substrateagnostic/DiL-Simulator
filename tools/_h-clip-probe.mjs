// _h-clip-probe — THROWAWAY. Free catalog reconnaissance for the attack-feel
// re-cast proposal. NO Meshy generation: it reads the already-fetched
// catalog.json, and measures candidate clip DURATION off the public preview GIF
// (free CDN asset) with ffprobe.
//
// The GIF-duration method is VALIDATED before it is used: eight clips whose GLB
// duration is already known from the shipping slate are probed first, and the
// error is printed. If the GIFs are re-timed the numbers will disagree and the
// method is thrown out — that check is the point.
//
//   node tools/_h-clip-probe.mjs --validate
//   node tools/_h-clip-probe.mjs --bands=Fighting/Punching,Fighting/CastingSpell
//   node tools/_h-clip-probe.mjs --ids=88,205,210,318,543
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const CAT = JSON.parse(readFileSync('art/char_refs/meshy_pilot/_clips/catalog.json', 'utf8')).result.list;
const GT = JSON.parse(readFileSync('art/char_refs/meshy_pilot/_clips/gender/clip_gender_table.json', 'utf8')).clips;
const GMAP = new Map(GT.map(r => [r.action_id, r]));
const CACHE = join(process.env.TEMP || '/tmp', 'h-gifcache');
mkdirSync(CACHE, { recursive: true });

// The 2026-08-01 pass-2 sweep corrected these two rows (FINAL_SLATE §7) and
// established the female block inside Fighting/Punching. Applied here so the
// proposal never re-derives a known-wrong gender.
const OVERRIDES = { 214: 'female', 113: 'male' };
const P2_FEMALE_PUNCH = new Set([204, 205, 208, 210, 211, 212, 213, 214, 216, 217, 218]);

async function gifSeconds(id, url) {
  const f = join(CACHE, `a${id}.gif`);
  if (!existsSync(f)) {
    const r = await fetch(url);
    if (!r.ok) return null;
    writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  }
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0',
      '-show_entries', 'stream=nb_read_frames,avg_frame_rate,duration', '-of', 'json', f], { encoding: 'utf8' });
    const s = JSON.parse(out).streams[0];
    const [n, d] = String(s.avg_frame_rate || '0/1').split('/').map(Number);
    const fps = d ? n / d : 0;
    const frames = Number(s.nb_read_frames || 0);
    return { seconds: s.duration ? +Number(s.duration).toFixed(3) : (fps ? +(frames / fps).toFixed(3) : null), frames, fps: +fps.toFixed(2) };
  } catch { return null; }
}

const genderOf = (id) => {
  if (OVERRIDES[id]) return OVERRIDES[id] + '*';
  if (P2_FEMALE_PUNCH.has(id)) return 'female*';
  const r = GMAP.get(id);
  return r ? `${r.motionSignature}(${r.confidence[0]})` : '—';
};

const rows = [];
if (process.argv.includes('--validate')) {
  // GLB durations from art/MESHY_SLATE.md §4 + FINAL_SLATE §2 (read off the GLBs).
  const KNOWN = { 191: 1.800, 214: 3.500, 138: 3.500, 420: 4.100, 178: 1.667, 174: 2.867, 176: 5.633, 391: 3.767, 49: 9.033, 59: 9.367, 205: 3.870, 389: 5.200, 210: 4.000, 543: 0.930, 175: 4.530, 123: 3.000, 88: 3.400, 173: 4.900 };
  console.log('id   name                              GLB(s)  GIF(s)  err     frames fps');
  for (const [id, glb] of Object.entries(KNOWN)) {
    const c = CAT.find(r => r.id === +id);
    const g = await gifSeconds(+id, c.previewUrl);
    if (!g) { console.log(`a${id} ${c.name} — no gif`); continue; }
    console.log(`a${String(id).padEnd(4)} ${c.name.slice(0, 32).padEnd(33)} ${glb.toFixed(3).padStart(6)}  ${String(g.seconds).padStart(6)}  ${(g.seconds - glb >= 0 ? '+' : '') + (g.seconds - glb).toFixed(3)}  ${String(g.frames).padStart(5)} ${g.fps}`);
  }
  process.exit(0);
}

const bands = arg('bands', '').split(',').filter(Boolean);
const ids = arg('ids', '').split(',').filter(Boolean).map(Number);
const want = CAT.filter(r => (bands.length && bands.includes(`${r.category}/${r.subCategory}`)) || ids.includes(r.id));
console.log(`id     name                                   band                      gender      gif(s)  tag`);
for (const c of want) {
  const g = await gifSeconds(c.id, c.previewUrl);
  rows.push({ id: c.id, name: c.name, band: `${c.category}/${c.subCategory}`, gender: genderOf(c.id), seconds: g?.seconds ?? null, tag: c.tag || '' });
  console.log(`a${String(c.id).padEnd(5)} ${c.name.slice(0, 38).padEnd(39)} ${(`${c.category}/${c.subCategory}`).padEnd(25)} ${genderOf(c.id).padEnd(11)} ${String(g?.seconds ?? '?').padStart(6)}  ${c.tag || ''}`);
}
mkdirSync(join('screenshots', 'h-run'), { recursive: true });
writeFileSync(join('screenshots', 'h-run', 'clip-probe.json'), JSON.stringify(rows, null, 1));
console.log(`\n${rows.length} rows -> screenshots/h-run/clip-probe.json`);
