// THROWAWAY empirical probe for F-10 rider (iii): is CLAUDE.md's
// "Furniture rotation convention" bullet inverted?
//
// CLAUDE.md (before this run) said: "`rotation: 0` faces north (toward -z).
// `Math.PI` faces south."  g-run/A2-cutscene-audit.md said the opposite.
// Neither is an opinion — it is measurable off the shipping geometry.
//
//   node tools/_f-rotation-probe.mjs
//
// Method, three independent reads that must agree:
//   1. THE ROTATION MATRIX. Apply mesh.rotation.y = t to the local +z and -z
//      unit vectors and print the world vector. This is what Room.js:1387 does
//      (`obj.rotation.y = rotation`).
//   2. THE MODEL'S OWN FRONT. Build a piece whose front is unambiguous and
//      measure which local z-half the front face sits in. `whiteboard` is the
//      probe: it is a flat board with a writing surface, mounted flush to a
//      wall, so its front is whichever side is thinner/offset.
//   3. THE SHIPPING PLACEMENTS. Room data already encodes the answer: a
//      whiteboard at z=0.2 (NORTH wall) carries rotation 0 and MUST face south
//      into the room; a poster at z=roomHeight-1.1 (SOUTH wall) carries
//      rotation Math.PI and MUST face north. Count them.
//
// Plus the character read, which is not geometry at all but pure arithmetic:
// NPC.faceToward does `Math.atan2(x - px, z - pz)`. A target directly SOUTH
// (dz>0, dx=0) yields atan2(0, +) = 0.

import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { Furniture } from '../src/world/Furniture.js';
import { ROOMS } from '../src/data/rooms/index.js';

const R = (t) => {
  const m = new THREE.Object3D();
  m.rotation.y = t;
  m.updateMatrixWorld(true);
  const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(m.quaternion);
  const back = new THREE.Vector3(0, 0, -1).applyQuaternion(m.quaternion);
  return { fwd, back };
};
const v = (x) => `(${x.x.toFixed(3)}, ${x.z.toFixed(3)})`;
const compass = (w) => {
  // Room grids put z=0 at the NORTH wall, so +z is SOUTH and +x is EAST.
  if (Math.abs(w.z) > Math.abs(w.x)) return w.z > 0 ? 'SOUTH' : 'NORTH';
  return w.x > 0 ? 'EAST' : 'WEST';
};

console.log('=== 1. ROTATION MATRIX (what Room.js:1387 applies) ===');
for (const [label, t] of [['0', 0], ['PI/2', Math.PI / 2], ['PI', Math.PI], ['-PI/2', -Math.PI / 2]]) {
  const { fwd } = R(t);
  console.log(`  rotation ${label.padEnd(6)} -> local +z lands at world ${v(fwd)}  = ${compass(fwd)}`);
}

console.log('\n=== 2. THE MODEL FRONT (which way does a wall-mounted piece protrude?) ===');
// DISCRIMINANT. A wall-mounted piece is flush on the wall side and protrudes on
// the ROOM side — that is what a marker tray, a frame bead or a mount bracket
// IS. So the local z-half the group extends furthest into is its front.
// (First cut of this probe used "the largest panel" instead and got the
// whiteboard backwards: the board panel is symmetric about z=0 and carries no
// information at all. The 0.06 m marker tray at z=+0.03 is the whole signal.)
for (const type of ['whiteboard', 'motivationalPoster', 'executivePoster', 'abstractPainting']) {
  if (typeof Furniture[type] !== 'function') { console.log(`  ${type}: not a factory`); continue; }
  let g;
  // Several factories paint a CanvasTexture; node has no `document`. Those are
  // skipped rather than shimmed — the discriminant only needs geometry, and
  // whiteboard alone already answers the question.
  try { g = Furniture[type](); } catch (e) { console.log(`  ${type.padEnd(19)} SKIPPED (needs DOM: ${e.message})`); continue; }
  g.updateMatrixWorld(true);
  let minZ = Infinity, maxZ = -Infinity, deepest = null;
  g.traverse((o) => {
    if (!o.geometry) return;
    o.geometry.computeBoundingBox();
    const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
    if (bb.max.z > maxZ) { maxZ = bb.max.z; deepest = o.geometry.type; }
    minZ = Math.min(minZ, bb.min.z);
  });
  const front = Math.abs(maxZ) > Math.abs(minZ) ? '+z' : '-z';
  console.log(`  ${type.padEnd(19)} z extent ${minZ.toFixed(3)} .. ${maxZ.toFixed(3)}`
    + `  protrudes ${front}  (furthest part: ${deepest})`
    + `  => rotation 0 faces ${front === '+z' ? 'SOUTH' : 'NORTH'}`);
}

console.log('\n=== 3. SHIPPING PLACEMENTS (room data already voted) ===');
{
  let n0 = 0, nPI = 0, bad = 0;
  const rows = [];
  for (const [rid, room] of Object.entries(ROOMS)) {
    for (const f of room.furniture || []) {
      if (!['whiteboard', 'motivationalPoster', 'executivePoster', 'abstractPainting', 'smartBoard', 'boosterMount', 'grandPainting'].includes(f.type)) continue;
      const rot = f.rotation ?? 0;
      const nearNorth = f.z <= 0.6;
      const nearSouth = f.z >= room.height - 1.6;
      if (nearNorth && Math.abs(rot) < 0.01) { n0++; rows.push(`  ${rid}/${f.type} z=${f.z} NORTH wall, rotation 0`); }
      else if (nearSouth && Math.abs(Math.abs(rot) - Math.PI) < 0.01) { nPI++; rows.push(`  ${rid}/${f.type} z=${f.z} SOUTH wall, rotation PI`); }
      else if (nearNorth && Math.abs(Math.abs(rot) - Math.PI) < 0.01) { bad++; rows.push(`  !! ${rid}/${f.type} z=${f.z} NORTH wall, rotation PI`); }
    }
  }
  console.log(rows.slice(0, 12).join('\n'));
  console.log(`  ... NORTH-wall pieces at rotation 0 : ${n0}`);
  console.log(`      SOUTH-wall pieces at rotation PI: ${nPI}`);
  console.log(`      NORTH-wall pieces at rotation PI: ${bad}`);
  console.log('  A wall-mounted board must face INTO the room. North-wall pieces');
  console.log('  carry rotation 0, so rotation 0 faces SOUTH.');
}

console.log('\n=== 4. CHARACTER FACING (NPC.faceToward arithmetic) ===');
{
  const npcSrc = readFileSync(new URL('../src/entities/NPC.js', import.meta.url), 'utf8');
  const line = npcSrc.split('\n').find(l => l.includes('Math.atan2'));
  console.log(`  ${line.trim()}`);
  const south = Math.atan2(0, 1), north = Math.atan2(0, -1), east = Math.atan2(1, 0), west = Math.atan2(-1, 0);
  console.log(`  target due SOUTH (dz=+1) -> facing ${south.toFixed(4)}  (0)`);
  console.log(`  target due NORTH (dz=-1) -> facing ${north.toFixed(4)}  (PI)`);
  console.log(`  target due EAST  (dx=+1) -> facing ${east.toFixed(4)}  (PI/2)`);
  console.log(`  target due WEST  (dx=-1) -> facing ${west.toFixed(4)}  (-PI/2)`);
}

console.log('\nVERDICT: rotation/facing 0 = SOUTH (+z). PI = NORTH. PI/2 = EAST. -PI/2 = WEST.');
