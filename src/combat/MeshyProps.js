// BONE-SOCKETED PROPS for the Meshy combat cast.
//
// Meshy's reconstruction drops or fuses held props (art/MESHY_WAVE.md finding
// 1). Grandma's cane vanished entirely — hands empty. Rather than re-plate her
// holding it (which is what fused a putter into Skip's forearms), the prop is
// built in the engine and PARENTED TO THE HAND BONE, so it grips through the
// idle, the reactions and the attack without ever touching the reconstruction.
//
// The mesh is the same honey-shaft / crook-handle / pale-ferrule cane the v7
// procedural grandma carries (CharacterBuilder 'cane'), so combat and
// exploration read as the same object.
import * as THREE from 'three';
import { Materials } from '../effects/MaterialLibrary.js';

// Attach a prop to a named bone, holding it UPRIGHT at bind time and letting it
// follow the hand from there. The local transform is derived by inverting the
// bone's world matrix against the desired world transform, so it is correct
// whatever scale or orientation the armature node carries.
function socket(model, boneName, builder) {
  let bone = null;
  model.traverse(o => { if (o.isBone && o.name === boneName) bone = o; });
  if (!bone) { console.warn(`[meshy] no bone ${boneName} — prop skipped`); return null; }
  model.updateMatrixWorld(true);

  const handWorld = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
  const floorY = new THREE.Box3().setFromObject(model).min.y;

  const holder = new THREE.Group();
  // desired world transform: sit at the hand, unrotated (shaft straight down)
  const desired = new THREE.Matrix4().makeTranslation(handWorld.x, handWorld.y, handWorld.z);
  const local = new THREE.Matrix4().copy(bone.matrixWorld).invert().multiply(desired);
  local.decompose(holder.position, holder.quaternion, holder.scale);
  bone.add(holder);

  builder(holder, Math.max(0.15, handWorld.y - floorY));

  // UPRIGHT CONSTRAINT. The shared reaction clips were authored for empty hands,
  // so a rigidly-parented cane swings out horizontally the moment a clip raises
  // the wrist — it read as a pole through her chest on the Break still. The
  // holder therefore tracks the hand's POSITION but cancels its ROTATION every
  // frame, so the cane hangs plumb and the hand carries it. Position comes free
  // from the parenting; only the local quaternion is rewritten.
  const q = new THREE.Quaternion();
  return () => {
    bone.getWorldQuaternion(q);
    holder.quaternion.copy(q).invert();
  };
}

export function attachCane(model) {
  return socket(model, 'RightHand', (holder, reach) => {
    // The shaft runs from just above the fist to the floor. `reach` is measured
    // hand-to-floor in the model's own units, so it lands on the stage for a
    // 1.50m grandma exactly as it would for anyone else.
    const wood = Materials.custom(0xe0b070, { stops: 4 });
    const len = reach - 0.01;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.014, len, 14), wood);
    shaft.position.y = -len / 2;
    holder.add(shaft);
    const crook = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.015, 8, 18, Math.PI * 1.2), wood);
    crook.rotation.set(Math.PI / 2, 0, -0.12);
    crook.position.y = 0.022;
    holder.add(crook);
    const ferrule = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.019, 0.028, 10),
      Materials.custom(0x8e8e96, { stops: 4 }),
    );
    ferrule.position.y = -len + 0.012;
    holder.add(ferrule);
  });
}

const BUILDERS = { cane: attachCane };

// Called from CombatScene once the model clone exists and BEFORE it is parented
// into the scaled wrapper, so every measurement is in the model's own space.
// Returns the per-frame updaters the animator has to run after mixer.update.
export function attachProps(model, props) {
  const ticks = [];
  for (const p of props || []) {
    const t = BUILDERS[p]?.(model);
    if (t) ticks.push(t);
  }
  return ticks;
}
