// THROWAWAY instrumentation for the notification audit (i-run).
// Extracts every _showToast(...) literal from src/ and computes the
// reading-time deficit against the shipped fixed duration.
// Reading model: 200 ms/word + 400 ms fixation floor (standard UX toast model,
// ~300 wpm silent reading for short glanceable strings).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'C:/Users/agall/projects/DiL_Simulator/src';
const MS_PER_WORD = 200;
const FLOOR = 400;
const SHIPPED_DEFAULT = 2600;

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.js')) out.push(p);
  }
  return out;
}

// Grab the first string argument of a _showToast( call, handling ' " ` and escapes.
function extractCalls(src, file) {
  const rows = [];
  const re = /_showToast\(\s*(['"`])/g;
  let m;
  while ((m = re.exec(src))) {
    const quote = m[1];
    let i = m.index + m[0].length;
    let s = '';
    let closed = false;
    while (i < src.length) {
      const c = src[i];
      if (c === '\\') { s += src[i + 1]; i += 2; continue; }
      if (c === quote) { closed = true; break; }
      s += c;
      i++;
    }
    if (!closed) continue;
    // find the tone argument (2nd arg) and explicit duration (3rd) if present
    const tail = src.slice(i + 1, i + 120);
    const toneM = tail.match(/^\s*,\s*['"`]([a-z]+)['"`]/);
    const durM = tail.match(/^\s*,\s*['"`][a-z]+['"`]\s*,\s*(\d+)/);
    const line = src.slice(0, m.index).split('\n').length;
    rows.push({
      file: file.replace(/\\/g, '/').split('/src/')[1],
      line,
      tone: toneM ? toneM[1] : 'info',
      duration: durM ? Number(durM[1]) : SHIPPED_DEFAULT,
      text: s,
    });
  }
  return rows;
}

const all = [];
for (const f of walk(ROOT)) {
  const src = readFileSync(f, 'utf8');
  if (src.includes('_showToast(')) all.push(...extractCalls(src, f));
}

// Template placeholders (${...}) count as ~1 word; strip them for the raw count
// but note that runtime values (client names, numbers) can be LONGER.
function words(t) {
  return t
    .replace(/\$\{[^}]*\}/g, 'X')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

const rows = all
  .filter(r => !r.text.startsWith('[DEV]'))
  .map(r => {
    const w = words(r.text);
    const needed = FLOOR + w * MS_PER_WORD;
    return { ...r, words: w, needed, deficit: needed - r.duration, dynamic: /\$\{/.test(r.text) };
  })
  .sort((a, b) => b.deficit - a.deficit);

const under = rows.filter(r => r.deficit > 0);
console.log(`TOTAL _showToast literal call sites (excl. [DEV]): ${rows.length}`);
console.log(`Shipped duration is FIXED at ${SHIPPED_DEFAULT} ms for ALL of them (no length scaling).`);
console.log(`Under-timed (needed > shipped): ${under.length}  (${Math.round(100 * under.length / rows.length)}%)`);
console.log(`Worst deficit: ${rows[0].deficit} ms  |  Longest string: ${Math.max(...rows.map(r => r.words))} words`);
console.log(`Median words: ${rows.map(r => r.words).sort((a, b) => a - b)[Math.floor(rows.length / 2)]}`);
console.log('');
console.log('=== WORST 20 BY READING-TIME DEFICIT ===');
console.log('deficit  words  need   ship  tone       file:line              text');
for (const r of rows.slice(0, 20)) {
  console.log(
    `${String(r.deficit).padStart(6)}   ${String(r.words).padStart(4)}  ${String(r.needed).padStart(5)}  ${String(r.duration).padStart(4)}  ${r.tone.padEnd(9)} ${(r.file + ':' + r.line).padEnd(22)} ${r.text.slice(0, 78)}`
  );
}
console.log('');
console.log('=== TONE DISTRIBUTION ===');
const byTone = {};
for (const r of rows) byTone[r.tone] = (byTone[r.tone] || 0) + 1;
console.log(byTone);
console.log('');
console.log(`Strings with runtime interpolation (can grow at play time): ${rows.filter(r => r.dynamic).length}`);
