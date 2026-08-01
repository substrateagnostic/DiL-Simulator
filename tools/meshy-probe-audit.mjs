// Probe-ruler audit. CombatScene._buildMeshyCombatant scales the Meshy model by
// probeH / glbH, where probeH is measured off a throwaway PROCEDURAL build of the
// same character. This prints, for every CHARACTER_CONFIGS entry, what the ruler
// reads with accessories included (the old way, getSize().y = max - min) versus
// what it reads with accessories stripped (the way the shipping code measures it
// now). Any accessory that hangs BELOW the floor plane — the golf putter's
// ferrule does — inflates the old reading and silently scales that character up.
//
//   node tools/meshy-probe-audit.mjs
//   node tools/meshy-probe-audit.mjs --json
import * as THREE from 'three';
import { buildCharacter } from '../src/entities/CharacterBuilder.js';
import { CHARACTER_CONFIGS } from '../src/data/characters.js';

const asJson = process.argv.includes('--json');
const rows = [];
for (const [id, cfg] of Object.entries(CHARACTER_CONFIGS)) {
  const withAcc = new THREE.Box3().setFromObject(buildCharacter(cfg, { detailed: false }));
  const noAcc = new THREE.Box3().setFromObject(buildCharacter({ ...cfg, accessories: [] }, { detailed: false }));
  rows.push({
    id,
    accessories: (cfg.accessories || []).join(',') || '-',
    before: +withAcc.getSize(new THREE.Vector3()).y.toFixed(4),   // old: max - min
    after: +noAcc.getSize(new THREE.Vector3()).y.toFixed(4),      // new: accessory-free probe
    minY: +withAcc.min.y.toFixed(4),
    delta: +(withAcc.getSize(new THREE.Vector3()).y - noAcc.getSize(new THREE.Vector3()).y).toFixed(4),
  });
}
rows.sort((a, b) => b.delta - a.delta || a.id.localeCompare(b.id));

if (asJson) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }

console.log(`configs: ${rows.length}`);
console.log('id                          before   after    minY     delta   pct    accessories');
for (const r of rows) {
  const pct = r.after > 0 ? (r.delta / r.after) * 100 : 0;
  console.log(
    `${r.id.padEnd(26)} ${r.before.toFixed(3).padStart(7)} ${r.after.toFixed(3).padStart(7)} ` +
    `${r.minY.toFixed(3).padStart(7)} ${r.delta.toFixed(3).padStart(7)} ${pct.toFixed(1).padStart(5)}%  ${r.accessories}`
  );
}
const changed = rows.filter(r => Math.abs(r.delta) > 1e-4);
console.log(`\nchanged by the fix: ${changed.length} — ${changed.map(r => r.id).join(', ') || 'none'}`);
