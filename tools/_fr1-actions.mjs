// FIX ROUND 1 — B23 catalog hunt: a NON-VIOLENT defeat/collapse clip.
//
// Producer pre-approved the concept (C3): defeated enemies should collapse or
// sit down instead of vanishing. The combat hunt's note is that the catalog's
// "Dying" band is violent-coded — a trust officer losing an argument does not
// get shot. So this lists the whole Meshy action library and filters for the
// OFFICE register: slump, sit down, head in hands, exhausted, give up,
// disappointed, defeated-without-injury.
//
// READ-ONLY. Lists actions; spends nothing. Fetching a candidate is a separate,
// deliberate `tools/meshy-clip-fetch.mjs --ids=` call.
//
//   node tools/_fr1-actions.mjs [--all]

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const ENV_PATH = 'C:/Users/agall/projects/un_party_game/.env';
const BASE = 'https://api.meshy.ai/openapi/v1';
const KEY = (readFileSync(ENV_PATH, 'utf8').match(/MESHY_API_KEY\s*=\s*(\S+)/) || [])[1];
if (!KEY) { console.error('no MESHY_API_KEY'); process.exit(1); }
const HEADERS = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const paths = [
  '/animations/actions?page_size=500',
  '/animations/actions',
  '/actions?page_size=500',
];
let list = null, used = null;
for (const p of paths) {
  try {
    const res = await fetch(`${BASE}${p}`, { headers: HEADERS });
    if (!res.ok) { console.log(`  ${p} -> ${res.status}`); continue; }
    const j = await res.json();
    list = Array.isArray(j) ? j : (j.result || j.data || j.actions || null);
    if (list) { used = p; break; }
  } catch (e) { console.log(`  ${p} -> ${e.message}`); }
}
if (!list) { console.error('could not list the action catalog through any known path'); process.exit(2); }
console.log(`catalog: ${list.length} actions via ${used}`);

const WANT = /(slump|sit\b|sit down|sitting|head in hand|exhaust|tired|weary|defeat|give up|giving up|surrender|disappoint|sad|despair|dejec|resign|slouch|collapse|kneel|crouch|sigh|frustrat|depress|shame|bow|hang head|drop)/i;
const VIOLENT = /(die|dying|death|shot|stab|gun|sword|blood|impale|explod|headshot|kill)/i;

const name = a => a.name || a.action_name || a.label || '';
const id = a => a.id ?? a.action_id ?? a.actionId;
const hits = list.filter(a => WANT.test(name(a)) && !VIOLENT.test(name(a)));
const violentBand = list.filter(a => VIOLENT.test(name(a)));

mkdirSync('.claude/plans/playtest-notes', { recursive: true });
writeFileSync('.claude/plans/playtest-notes/b23-action-catalog.json',
  JSON.stringify({ used, total: list.length, candidates: hits, violentBand, all: process.argv.includes('--all') ? list : undefined }, null, 2));

console.log(`\nNON-VIOLENT CANDIDATES (${hits.length}):`);
for (const a of hits) console.log(`  a${id(a)}  ${name(a)}`);
console.log(`\n(the violent-coded band, for contrast: ${violentBand.length} — ${violentBand.slice(0, 8).map(a => 'a' + id(a)).join(', ')})`);
