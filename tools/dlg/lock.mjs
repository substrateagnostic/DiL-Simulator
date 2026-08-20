import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const reseededLocks = new WeakSet();

function cloneLock(lock) {
  const result = { version: 1, scenes: {} };
  for (const [sceneId, scene] of Object.entries(lock?.scenes ?? {})) {
    result.scenes[sceneId] = {
      labels: { ...(scene.labels ?? {}) },
      length: scene.length ?? 0,
    };
    if (scene.arms) {
      result.scenes[sceneId].arms = Object.fromEntries(
        Object.entries(scene.arms).map(([index, sigs]) => [index, [...sigs]]),
      );
    }
  }
  return result;
}

function orderedLock(lock) {
  const result = { version: 1, scenes: {} };
  for (const [sceneId, scene] of Object.entries(lock.scenes ?? {})) {
    const labels = Object.entries(scene.labels ?? {})
      .sort(([aName, aIndex], [bName, bIndex]) => aIndex - bIndex || aName.localeCompare(bName));
    result.scenes[sceneId] = { labels: Object.fromEntries(labels), length: scene.length };
    if (scene.arms && Object.keys(scene.arms).length) {
      const arms = Object.entries(scene.arms).sort(([a], [b]) => Number(a) - Number(b));
      result.scenes[sceneId].arms = Object.fromEntries(arms);
    }
  }
  return result;
}

// THE ARM LEDGER. `_chose_<sceneId>_<nodeIndex>_<choiceIndex>` is a persisted
// save key and the CHOICE index is positional — the label lock pins the node
// index, but until this ledger nothing pinned the arm ORDER inside an ask, so
// an arm inserted mid-list silently remapped the recorded choices of every
// player who had answered that ask (judge finding 1 on the working-style
// check pilot; the hazard predates the feature). An arm's ledger identity is
// its TARGET LABEL (plus `|failLabel` for a check arm) — stable across prose
// rewording, which stays a free edit, while an insertion, removal, reorder or
// retarget at a locked position is a hard compile error.
function armSig(arm) {
  return arm.failNext !== undefined ? `${arm.next}|${arm.failNext}` : String(arm.next);
}

export async function loadLock(filePath) {
  const lock = JSON.parse(await readFile(filePath, 'utf8'));
  if (lock?.version !== 1 || !lock.scenes || typeof lock.scenes !== 'object') {
    throw new Error('A dialog lock file must have version 1 and a scenes object.');
  }
  return lock;
}

export async function saveLock(filePath, lock) {
  if (reseededLocks.has(lock) && process.env.DIALOGS_LOCK_RESEED !== 'i-know') {
    throw new Error('Refusing to write a reseeded dialog lock unless DIALOGS_LOCK_RESEED=i-know.');
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(orderedLock(lock), null, 2)}\n`, 'utf8');
}

export function allocate(sceneId, stmts, lock = { version: 1, scenes: {} }, opts = {}) {
  const lockAfter = cloneLock(lock);
  const existing = opts.reseed ? null : lockAfter.scenes[sceneId];
  const locked = { ...(existing?.labels ?? {}) };
  const priorLength = existing?.length ?? 0;
  const reserved = new Set();
  for (const [label, index] of Object.entries(locked)) {
    if (!Number.isInteger(index) || index < 0) throw new Error(`Lock label @${label} in scene ${sceneId} has an invalid index.`);
    reserved.add(index);
  }

  const sourceLabels = new Map();
  for (const stmt of stmts) {
    for (const label of stmt.labels ?? []) {
      if (sourceLabels.has(label)) throw new Error(`Duplicate label @${label} in scene ${sceneId}.`);
      sourceLabels.set(label, stmt);
    }
  }

  const lockedAtIndex = new Map();
  for (const [label, index] of Object.entries(locked)) {
    if (!lockedAtIndex.has(index)) lockedAtIndex.set(index, []);
    lockedAtIndex.get(index).push(label);
  }
  for (const [index, labels] of lockedAtIndex) {
    const present = labels.map((label) => sourceLabels.get(label)).filter(Boolean);
    if (new Set(present).size > 1) {
      throw new Error(`Duplicate index ${index} in scene ${sceneId} belongs to labels on different statements.`);
    }
  }

  const indexOf = new Map();
  const placed = new Set();
  let cursor = 0;
  let lockedCursor = 0;
  for (const stmt of stmts) {
    const labels = stmt.labels ?? [];
    const fixed = labels.filter((label) => Object.hasOwn(locked, label));
    let index;
    if (fixed.length) {
      const indices = [...new Set(fixed.map((label) => locked[label]))];
      if (indices.length !== 1) {
        throw new Error(`Labels ${fixed.map((label) => `@${label}`).join(', ')} on one statement in scene ${sceneId} map to different locked indices.`);
      }
      index = indices[0];
      const label = fixed[0];
      if (index < lockedCursor) {
        throw new Error(
          `In scene ${sceneId}, moving @${label} from index ${index} behind cursor ${lockedCursor} would change the _chose_ save keys of every player who has taken a choice in this scene.`,
        );
      }
      lockedCursor = index + 1;
      if (placed.has(index)) throw new Error(`Duplicate index ${index} in scene ${sceneId}.`);
      placed.add(index);
      indexOf.set(stmt, index);
      cursor = Math.max(cursor, index + 1);
      continue;
    }
    while (reserved.has(cursor) || placed.has(cursor)) cursor += 1;
    index = cursor;
    placed.add(index);
    indexOf.set(stmt, index);
    cursor += 1;
  }

  const highest = placed.size ? Math.max(...placed) + 1 : 0;
  const length = Math.max(highest, priorLength);
  const pads = [];
  for (let index = 0; index < length; index += 1) if (!placed.has(index)) pads.push(index);

  const labelsAfter = { ...locked };
  for (const stmt of stmts) {
    for (const label of stmt.labels ?? []) {
      if (!Object.hasOwn(labelsAfter, label)) labelsAfter[label] = indexOf.get(stmt);
    }
  }

  // The arm ledger (see armSig above). `armGuard: false` (a scene that already
  // has parse diagnostics) keeps the prior ledger untouched rather than
  // cascading a grammar error into an allocation error — the build is red
  // either way, and diagnostics must stay non-cascading.
  const lockedArms = opts.reseed ? {} : { ...(existing?.arms ?? {}) };
  const armsAfter = { ...lockedArms };
  if (opts.armGuard !== false) {
    for (const stmt of stmts) {
      if (stmt.kind !== 'choice') continue;
      const index = indexOf.get(stmt);
      const current = (stmt.arms ?? []).map(armSig);
      const prior = lockedArms[String(index)] ?? [];
      if (current.length < prior.length) {
        throw new Error(
          `In scene ${sceneId}, the ask at index ${index} lost arm(s) ${current.length}..${prior.length - 1}. Arm order is the _chose_${sceneId}_${index}_<arm> save key: an arm may be appended, never removed — its position stays reserved for every player who has picked it.`,
        );
      }
      for (let position = 0; position < prior.length; position += 1) {
        if (current[position] !== prior[position]) {
          throw new Error(
            `In scene ${sceneId}, the ask at index ${index}: arm ${position} changed identity (-> ${prior[position]} is now -> ${current[position]}). Arm order is the _chose_${sceneId}_${index}_<arm> save key — a new arm must be APPENDED after the existing ones, and moving or retargeting an existing arm changes the recorded choices of every player who has answered this ask.`,
          );
        }
      }
      if (current.length) armsAfter[String(index)] = current;
    }
  }

  lockAfter.scenes[sceneId] = { labels: labelsAfter, length };
  if (Object.keys(armsAfter).length) lockAfter.scenes[sceneId].arms = armsAfter;
  if (opts.reseed) reseededLocks.add(lockAfter);
  return { indexOf, length, pads, lockAfter };
}
