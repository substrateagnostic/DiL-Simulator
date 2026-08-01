// Meshy REACTION-CLIP fetcher + armature-only extractor.
//
// THE FINDING THIS TOOL RESTS ON: every Meshy auto-rig in the cast carries the
// IDENTICAL 24-bone skeleton with identical bone names (Hips, LeftUpLeg, …,
// neck, Head, head_end, headfront). Verified across karen / grandma / chad.
// So a clip only has to be generated ONCE, on one donor rig, and its rotation
// tracks then drive every other character with no retargeting step — the bone
// LENGTHS come from each character's own rest pose, so proportions survive.
//
// Per clip: POST /animations {rig_task_id, action_id} (3 credits) -> download
// the ~9MB animation GLB -> strip meshes/skins/materials/textures and every
// accessor that is not an animation sampler -> a ~40KB armature-only clip GLB.
// Position and scale tracks are dropped except the Hips, because a position
// track authored against the donor's bone offsets would force the donor's
// proportions onto every other body.
//
//   node tools/meshy-clip-fetch.mjs --ids=336,338,178,391 [--donor=andrew]
//   node tools/meshy-clip-fetch.mjs --ids=... --dry   # extract only, no spend
//
// Raw GLBs -> art/char_refs/meshy_pilot/_clips/raw/action_<id>.glb  (gitignored)
// Clip GLBs -> public/meshy/clips/a<id>.glb                         (tracked)
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';

const ENV_PATH = 'C:/Users/agall/projects/un_party_game/.env';
const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const PILOT = join(REPO, 'art/char_refs/meshy_pilot');
const RAW = join(PILOT, '_clips/raw');
const OUT = join(REPO, 'public/meshy/clips');
const BASE = 'https://api.meshy.ai/openapi/v1';
const LEDGER = join(PILOT, '_clips/spend.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const ACTION_IDS = String(args.ids || '').split(',').filter(Boolean).map(Number);
const DONOR = args.donor || 'andrew';
if (!ACTION_IDS.length) { console.error('need --ids'); process.exit(1); }
mkdirSync(RAW, { recursive: true });
mkdirSync(OUT, { recursive: true });

// Donor rig task id. Andrew's pilot report uses an array of stages; the wave
// reports use an object — read both shapes.
function donorRig(id) {
  const f = join(PILOT, id, `${id}_pipeline_report.json`);
  const j = JSON.parse(readFileSync(f, 'utf8'));
  if (Array.isArray(j.tasks)) return j.tasks.find(t => t.stage === 'rigging')?.id;
  return j.tasks?.rig?.id;
}

const key = (() => {
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*MESHY_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1];
  }
  throw new Error('MESHY_API_KEY not found');
})();
const HEADERS = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const ts = () => new Date().toISOString().slice(11, 19);
const log = (m) => console.log(`[${ts()}] ${m}`);

const api = async (method, path, body) => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${BASE}${path}`, { method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined });
    if (res.ok) return res.json();
    const text = await res.text();
    if (res.status >= 500 || res.status === 429) { await new Promise(r => setTimeout(r, 8000 * (attempt + 1))); continue; }
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  throw new Error(`retries exhausted on ${path}`);
};

const poll = async (path, label) => {
  for (;;) {
    const t = await api('GET', path);
    const r = t.result ?? t;
    const status = r.status || t.status;
    if (status === 'SUCCEEDED') return r;
    if (status === 'FAILED' || status === 'CANCELED') throw new Error(`${label} ${status}: ${JSON.stringify(r.task_error || r).slice(0, 300)}`);
    await new Promise(r2 => setTimeout(r2, 6000));
  }
};

const download = async (url, dest) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
};

// ── GLB helpers ─────────────────────────────────────────────────────────────
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
function writeGLB(json, bin) {
  const j = Buffer.from(JSON.stringify(json), 'utf8');
  const jp = (4 - (j.length % 4)) % 4, bp = (4 - (bin.length % 4)) % 4;
  const total = 12 + 8 + j.length + jp + 8 + bin.length + bp;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  let o = 12;
  out.writeUInt32LE(j.length + jp, o); out.writeUInt32LE(0x4e4f534a, o + 4);
  j.copy(out, o + 8); out.fill(0x20, o + 8 + j.length, o + 8 + j.length + jp);
  o += 8 + j.length + jp;
  out.writeUInt32LE(bin.length + bp, o); out.writeUInt32LE(0x004e4942, o + 4);
  bin.copy(out, o + 8);
  return out;
}

// Strip everything that is not the skeleton + the animation.
function extractClip(srcBuf, actionId) {
  const { json, bin } = readGLB(srcBuf);
  if (!json.animations?.length) throw new Error('no animation in source');

  // Drop mesh/skin bindings but KEEP every node, so animation channel target
  // indices stay valid without a remap pass.
  for (const n of json.nodes) { delete n.mesh; delete n.skin; }

  const keptAccessors = new Map(); // old index -> new index
  const accessors = [];
  const keepAccessor = (i) => {
    if (keptAccessors.has(i)) return keptAccessors.get(i);
    const ni = accessors.length;
    accessors.push(JSON.parse(JSON.stringify(json.accessors[i])));
    keptAccessors.set(i, ni);
    return ni;
  };

  const animations = [];
  for (const anim of json.animations) {
    const samplers = [];
    const channels = [];
    for (const ch of anim.channels) {
      const path = ch.target.path;
      const node = json.nodes[ch.target.node];
      // Rotation is the retarget-safe channel. Hips translation is kept so the
      // weight shift / hip bob survives; every other translation and all scale
      // tracks would impose the DONOR's bone offsets on a different body.
      if (path === 'scale') continue;
      if (path === 'translation' && node?.name !== 'Hips') continue;
      const s = anim.samplers[ch.sampler];
      const ns = samplers.length;
      samplers.push({ input: keepAccessor(s.input), output: keepAccessor(s.output), interpolation: s.interpolation || 'LINEAR' });
      channels.push({ sampler: ns, target: { node: ch.target.node, path } });
    }
    animations.push({ name: `action_${actionId}`, samplers, channels });
  }

  // Kill horizontal root travel. The Hips translation track is kept for the
  // vertical weight shift / crouch, but its X and Z are pinned to frame 0:
  // CombatScene already owns stage translation (knockback, lunge, slide-in),
  // and a clip that walks — a31 "Catching Breath" walks right out of frame —
  // would fight it or leave the arena. Y survives so a crouch still crouches.
  const hipsNode = json.nodes.findIndex(n => n.name === 'Hips');
  for (const anim of animations) {
    for (const ch of anim.channels) {
      if (ch.target.path !== 'translation' || ch.target.node !== hipsNode) continue;
      const acc = accessors[anim.samplers[ch.sampler].output];
      const v = json.bufferViews[acc.bufferView];
      const start = (v.byteOffset || 0) + (acc.byteOffset || 0);
      const view = new Float32Array(bin.buffer, bin.byteOffset + start, acc.count * 3).slice();
      const x0 = view[0], z0 = view[2];
      for (let i = 0; i < acc.count; i++) { view[i * 3] = x0; view[i * 3 + 2] = z0; }
      acc._override = Buffer.from(view.buffer);
      delete acc.min; delete acc.max;
    }
  }

  // Repack: only the accessors we kept, and only their bufferViews.
  const parts = [];
  let offset = 0;
  const bufferViews = [];
  for (const acc of accessors) {
    const v = json.bufferViews[acc.bufferView];
    const start = (v.byteOffset || 0) + (acc.byteOffset || 0);
    const compSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[acc.componentType];
    const nComp = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[acc.type];
    const len = acc.count * compSize * nComp;
    const payload = acc._override || bin.subarray(start, start + len);
    delete acc._override;
    parts.push(payload);
    bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: payload.length });
    acc.bufferView = bufferViews.length - 1;
    delete acc.byteOffset;
    offset += len;
    const pad = (4 - (offset % 4)) % 4;
    if (pad) { parts.push(Buffer.alloc(pad)); offset += pad; }
  }

  const out = {
    asset: { version: '2.0', generator: 'trust-issues meshy-clip-fetch' },
    scene: 0,
    scenes: json.scenes,
    nodes: json.nodes,
    accessors,
    bufferViews,
    buffers: [{ byteLength: offset }],
    animations,
  };
  return writeGLB(out, Buffer.concat(parts));
}

// ── main ────────────────────────────────────────────────────────────────────
const rig = donorRig(DONOR);
if (!rig && !args.dry) throw new Error(`no rig task id for donor ${DONOR}`);
log(`donor ${DONOR} rig=${rig ? rig.slice(0, 8) + '…' : '(dry)'}`);

const ledger = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : { donor: DONOR, tasks: {} };
let spent = 0;

for (const actionId of ACTION_IDS) {
  const rawPath = join(RAW, `action_${actionId}.glb`);
  if (!existsSync(rawPath)) {
    if (args.dry) { log(`action ${actionId}: no raw on disk, skipped (--dry)`); continue; }
    const res = await api('POST', '/animations', { rig_task_id: rig, action_id: actionId });
    const taskId = res.result;
    log(`action ${actionId}: task ${taskId}`);
    const r = await poll(`/animations/${taskId}`, `action ${actionId}`);
    // Log every artifact key ONCE so an armature-only variant, if the endpoint
    // ever offers one, is not silently missed.
    log(`action ${actionId}: artifacts ${Object.keys(r).filter(k => /_url$/.test(k)).join(',')}`);
    const url = r.animation_glb_url || r.glb_url;
    if (!url) throw new Error(`no glb url for action ${actionId}: ${JSON.stringify(r).slice(0, 300)}`);
    await download(url, rawPath);
    const t = await api('GET', `/animations/${taskId}`);
    const credits = (t.result?.consumed_credits ?? t.consumed_credits ?? 3);
    ledger.tasks[actionId] = { task: taskId, consumed_credits: credits };
    spent += credits;
    writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
    log(`action ${actionId}: downloaded ${(statSync(rawPath).size / 1048576).toFixed(2)}MB, ${credits} cr`);
  }
  const clip = extractClip(readFileSync(rawPath), actionId);
  const dest = join(OUT, `a${actionId}.glb`);
  writeFileSync(dest, clip);
  log(`action ${actionId}: clip -> ${dest} (${(clip.length / 1024).toFixed(1)} KB)`);
}

log(`spend this run: ${spent} credits (ledger: ${LEDGER})`);
