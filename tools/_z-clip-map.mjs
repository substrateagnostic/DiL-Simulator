// Static clip-resolution census: for every encounter cast id, does the shipping
// lookup chain resolve a stance clip, a gender and a reaction pair that all
// exist on disk? Read-only.
import { existsSync } from 'fs';
import { join } from 'path';

const { ENCOUNTERS } = await import('../src/data/encounters/index.js');
const { CHARACTER_CONFIGS } = await import('../src/data/characters.js');
const { MESHY_MODELS, resolveId } = await import('../src/combat/MeshyCast.js');
const { ENEMY_STATS } = await import('../src/data/stats.js');

// MeshyClips imports three.js + MeshyCast; safe under node? it registers a provider.
const clips = await import('../src/combat/MeshyClips.js');
const { CLIP_IDS, IDLE_IDS, genderFor, idleIdFor, reactionIdFor } = clips;

const ids = new Set();
for (const [k, cfg] of Object.entries(ENCOUNTERS)) {
  const list = (cfg.enemyIds && cfg.enemyIds.length) ? cfg.enemyIds : [cfg.enemyId || k];
  for (const id of list) ids.add(id);
  for (const p of cfg.partyIds || []) ids.add(p);
}
ids.add('andrew');
for (const p of ['janet', 'alex_it', 'isaiah', 'diane']) ids.add(p);

const DIR = join(process.cwd(), 'public', 'meshy');
let bad = 0;
const rows = [];
for (const id of [...ids].sort()) {
  const modelId = resolveId(id, CHARACTER_CONFIGS[id]);
  const def = MESHY_MODELS[modelId];
  const hasCfg = !!CHARACTER_CONFIGS[id];
  const glbOk = def ? existsSync(join(DIR, def.url)) : null;
  const g = genderFor(id, modelId);
  const idleId = idleIdFor(id, modelId);
  const idleRow = (IDLE_IDS[modelId] ?? IDLE_IDS[id]) != null;
  const idleOk = existsSync(join(DIR, 'clips', `a${idleId}.glb`));
  const react = {};
  let reactBad = false;
  for (const role of Object.keys(CLIP_IDS)) {
    const aid = reactionIdFor(role, id, modelId);
    const ok = aid != null && existsSync(join(DIR, 'clips', `a${aid}.glb`));
    react[role] = `${aid}${ok ? '' : '!MISSING'}`;
    if (!ok) reactBad = true;
  }
  const problem = !hasCfg || (def && !glbOk) || !idleOk || reactBad || (def && !idleRow) ? 'X' : ' ';
  if (problem === 'X') bad++;
  rows.push(`${problem} ${id.padEnd(26)} model=${String(modelId).padEnd(24)} cfg=${hasCfg ? 'y' : 'NO'} glb=${def ? (glbOk ? 'y' : 'MISSING') : '-'} g=${g} idle=a${idleId}${idleOk ? '' : '!MISSING'}${idleRow ? '' : ' (fallback-stance)'} attack=a${react.attack} cast=a${react.cast} hurt=a${react.hurt}`);
}
console.log(rows.join('\n'));
console.log(`\n${ids.size} cast ids, ${bad} with a resolution problem`);

// Enemy stats ids with no CHARACTER_CONFIGS at all -> setCombatants `continue`s
const noBody = Object.keys(ENEMY_STATS).filter(id => !CHARACTER_CONFIGS[id]);
console.log('ENEMY_STATS ids with no CHARACTER_CONFIGS (invisible on stage):', noBody.join(', ') || 'none');
