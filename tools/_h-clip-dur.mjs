// Throwaway: read every clip GLB's animation duration straight out of the
// glTF JSON chunk (max of every sampler input accessor). No three, no browser.
//   node tools/_h-clip-dur.mjs 17 18 318 191 214 174 178 138 420 205 210
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const DIR = 'C:/Users/agall/projects/DiL_Simulator/public/meshy/clips';
const ids = process.argv.slice(2);

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

for (const id of ids) {
  const f = join(DIR, `a${id}.glb`);
  if (!existsSync(f)) { console.log(`a${id}\tMISSING`); continue; }
  const { json, bin } = readGLB(readFileSync(f));
  let dur = 0, keys = 0;
  for (const anim of json.animations || []) {
    for (const s of anim.samplers) {
      const acc = json.accessors[s.input];
      if (acc.max) { dur = Math.max(dur, acc.max[0]); keys = Math.max(keys, acc.count); continue; }
      const v = json.bufferViews[acc.bufferView];
      const start = (v.byteOffset || 0) + (acc.byteOffset || 0);
      const arr = new Float32Array(bin.buffer, bin.byteOffset + start, acc.count);
      dur = Math.max(dur, arr[acc.count - 1]);
      keys = Math.max(keys, acc.count);
    }
  }
  console.log(`a${id}\t${dur.toFixed(3)}s\t${keys} keys\t${(dur / Math.max(1, keys - 1) * 1000).toFixed(1)}ms/key`);
}
