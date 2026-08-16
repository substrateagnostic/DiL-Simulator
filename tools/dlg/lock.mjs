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
  }
  return result;
}

function orderedLock(lock) {
  const result = { version: 1, scenes: {} };
  for (const [sceneId, scene] of Object.entries(lock.scenes ?? {})) {
    const labels = Object.entries(scene.labels ?? {})
      .sort(([aName, aIndex], [bName, bIndex]) => aIndex - bIndex || aName.localeCompare(bName));
    result.scenes[sceneId] = { labels: Object.fromEntries(labels), length: scene.length };
  }
  return result;
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
  lockAfter.scenes[sceneId] = { labels: labelsAfter, length };
  if (opts.reseed) reseededLocks.add(lockAfter);
  return { indexOf, length, pads, lockAfter };
}
