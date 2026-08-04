// Seated-NPC census against the SEAT REGISTRY the game now builds.
//
// Successor to screenshots/g-run/A2-cutscene/stage-gate.mjs, which searched a
// hardcoded prop list and treated a diner booth as one seat at its centre. This
// mirrors Room.js's SEAT_PROPS exactly — including the booth's two benches at
// local x +/-0.61 whose occupants face ACROSS the table, not along it — and
// applies src/data/room-overrides.json the way Room.build() does.
//
// FACING LAW (CLAUDE.md, corrected 2026-08-04): theta -> forward (sin,0,cos),
// so rotation 0 is SOUTH. A chair's back is at local z = -0.20, so a chair and
// its occupant carry the SAME rotation value.
//
//   node tools/_g-seat-census.mjs [--json=<path>]

import overrides from '../src/data/room-overrides.json' with { type: 'json' };
import { writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

// `--ref=<git ref>` measures a PAST state of rooms/index.js, so before/after
// is one command each rather than a stash dance.
const REF = process.argv.find(a => a.startsWith('--ref='))?.slice(6);
let ROOMS;
if (REF) {
  const repo = path.resolve(import.meta.dirname, '..');
  const dir = path.join(repo, '.seat-census-tmp');
  mkdirSync(dir, { recursive: true });
  const f = path.join(dir, 'rooms.js');
  writeFileSync(f, execFileSync('git', ['show', `${REF}:src/data/rooms/index.js`], { cwd: repo, maxBuffer: 64 * 1024 * 1024 }));
  ({ ROOMS } = await import(pathToFileURL(f).href));
} else {
  ({ ROOMS } = await import('../src/data/rooms/index.js'));
}

const SEAT_PROPS = {
  chair:           [{ dx: 0, dz: 0, faceOffset: 0 }],
  executiveChair:  [{ dx: 0, dz: 0, faceOffset: 0 }],
  operatorChair:   [{ dx: 0, dz: 0, faceOffset: 0 }],
  leatherArmchair: [{ dx: 0, dz: 0, faceOffset: 0 }],
  dinerBooth: [
    { dx:  0.61, dz: 0, faceOffset: -Math.PI / 2 },
    { dx: -0.61, dz: 0, faceOffset:  Math.PI / 2 },
  ],
};

const SNAP = 0.9;                 // StageDirector.SEAT_SNAP
const deg = (r) => (r * 180 / Math.PI);
const wrap = (r) => { while (r > Math.PI) r -= 2 * Math.PI; while (r < -Math.PI) r += 2 * Math.PI; return r; };
const compass = (r) => {
  const d = ((deg(wrap(r)) % 360) + 360) % 360;
  // forward = (sin t, cos t): t=0 -> +z SOUTH, t=+90deg -> +x EAST.
  return ['S', 'SE', 'E', 'NE', 'N', 'NW', 'W', 'SW'][Math.round(d / 45) % 8];
};

const rows = [];
let faults = 0, seated = 0;

for (const [roomId, room] of Object.entries(ROOMS)) {
  const fOv = overrides[roomId]?.furniture;
  const seats = [];
  (room.furniture || []).forEach((raw, i) => {
    const f = fOv?.[String(i)] ? { ...raw, ...fOv[String(i)] } : raw;
    const pads = SEAT_PROPS[f.type];
    if (!pads) return;
    const rot = f.rotation || 0;
    const cos = Math.cos(rot), sin = Math.sin(rot);
    for (const p of pads) {
      seats.push({
        type: f.type,
        x: f.x + p.dx * cos + p.dz * sin,
        z: f.z - p.dx * sin + p.dz * cos,
        facing: rot + p.faceOffset,
      });
    }
  });

  const nOv = overrides[roomId]?.npcs;
  (room.npcs || []).forEach((raw, i) => {
    const npc = nOv?.[String(i)] ? { ...raw, ...nOv[String(i)] } : raw;
    if (!npc.sitting) return;
    seated++;
    let best = null, bestD = Infinity;
    for (const s of seats) {
      const d = Math.hypot(s.x - npc.x, s.z - npc.z);
      if (d < bestD) { bestD = d; best = s; }
    }
    const facing = npc.facing || 0;
    const delta = best ? Math.abs(deg(wrap(facing - best.facing))) : null;
    const onSeat = best && bestD <= 0.15;
    const faced = best && delta <= 45;
    const ok = onSeat && faced;
    if (!ok) faults++;
    rows.push({
      room: roomId, npc: npc.id, x: npc.x, z: npc.z,
      facingDeg: +deg(wrap(facing)).toFixed(0), compass: compass(facing),
      seat: best ? `${best.type}@${best.x.toFixed(2)},${best.z.toFixed(2)}` : 'NONE',
      seatDistTiles: best ? +bestD.toFixed(2) : null,
      seatFacingDeltaDeg: delta === null ? null : +delta.toFixed(1),
      reachableBySitBeat: best ? bestD <= SNAP : false,
      ok,
    });
  });
}

const w = (s, n) => String(s).padEnd(n);
const lines = [`seated NPC entries: ${seated}   faults: ${faults}`, ''];
for (const r of rows) {
  lines.push(`${r.ok ? 'ok  ' : 'FAIL'} ${w(r.room, 17)} ${w(r.npc, 17)} @${w(`${r.x},${r.z}`, 12)}`
    + ` facing ${w(r.facingDeg + 'deg ' + r.compass, 10)} seat ${w(r.seat, 30)}`
    + ` dist ${w(r.seatDistTiles, 6)} delta ${r.seatFacingDeltaDeg}deg`);
}
lines.push('');
lines.push('ok = ON its seat (<=0.15 tiles) AND within 45deg of the seat heading.');
const out = lines.join('\n');
console.log(out);

const jsonPath = process.argv.find(a => a.startsWith('--json='))?.slice(7);
if (jsonPath) writeFileSync(jsonPath, JSON.stringify({ seated, faults, rows }, null, 2));
process.exit(faults === 0 ? 0 : 1);
