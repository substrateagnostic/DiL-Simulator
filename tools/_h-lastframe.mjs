// Throwaway: is the LAST keyframe of a Meshy clip a real pose or a bind-pose
// snap? Prints, per clip, the max per-channel quaternion delta between the last
// two keys and between the first two keys. A last-frame pop shows up as a
// last-delta an order of magnitude above the running per-frame delta.
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
const DIR = 'C:/Users/agall/projects/DiL_Simulator/public/meshy/clips';

function readGLB(buf) {
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
    else if (type === 0x004e4942) bin = data;
    off += 8 + len + ((4 - (len % 4)) % 4);
  }
  return { json, bin };
}
const f32 = (json, bin, i) => {
  const acc = json.accessors[i];
  const v = json.bufferViews[acc.bufferView];
  const start = (v.byteOffset || 0) + (acc.byteOffset || 0);
  const n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[acc.type];
  return { arr: new Float32Array(bin.buffer, bin.byteOffset + start, acc.count * n), n, count: acc.count };
};

for (const id of process.argv.slice(2)) {
  const p = join(DIR, `a${id}.glb`);
  if (!existsSync(p)) { console.log(`a${id} MISSING`); continue; }
  const { json, bin } = readGLB(readFileSync(p));
  let lastMax = 0, prevMax = 0, midMedian = [];
  for (const anim of json.animations) {
    for (const ch of anim.channels) {
      if (ch.target.path !== 'rotation') continue;
      const s = anim.samplers[ch.sampler];
      const { arr, n, count } = f32(json, bin, s.output);
      if (count < 4) continue;
      const d = (a, b) => {
        let m = 0;
        for (let k = 0; k < n; k++) m = Math.max(m, Math.abs(arr[a * n + k] - arr[b * n + k]));
        return m;
      };
      lastMax = Math.max(lastMax, d(count - 1, count - 2));
      prevMax = Math.max(prevMax, d(count - 2, count - 3));
      for (let i = 1; i < count - 1; i++) midMedian.push(d(i, i - 1));
    }
  }
  midMedian.sort((a, b) => a - b);
  const med = midMedian[Math.floor(midMedian.length / 2)] || 0;
  const ratio = med > 0 ? lastMax / med : Infinity;
  console.log(`a${id}\tlastDelta ${lastMax.toFixed(4)}\tprevDelta ${prevMax.toFixed(4)}\tmedian ${med.toFixed(4)}\tlast/median ${ratio.toFixed(1)}x`);
}
