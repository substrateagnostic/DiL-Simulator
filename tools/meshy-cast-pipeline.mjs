// Meshy combat-cast pipeline driver (generalized from the pilot's andrew script).
// Per character: multi-image-to-3d -> rigging -> one idle animation clip, then
// copies the self-contained animation GLB into public/meshy/<id>_idle.glb.
//
//   node tools/meshy-cast-pipeline.mjs --manifest=<manifest.json> [--only=a,b] [--concurrency=10]
//
// Manifest entry: { "<id>": { "inputDir": "...", "views": ["f.png","q.png","p.png"],
//                             "height": 1.75, "actionId": 11, "animKey": "idle11" } }
//
// Laws honored (art/MESHY_WAVE.md + ~/claude-memory/imagegen-playbook.md):
// - every artifact downloaded IMMEDIATELY on task success (Meshy purges at 3 days)
// - spend attested via per-task consumed_credits, never balance deltas
// - resume-safe: task ids land in <id>_pipeline_report.json the moment they are
//   created; a re-run re-polls existing tasks instead of re-spending
// - the API key is read from the gitignored un_party_game/.env and never printed
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';

const ENV_PATH = 'C:/Users/agall/projects/un_party_game/.env';
const REPO = 'C:/Users/agall/projects/DiL_Simulator';
const PILOT = join(REPO, 'art/char_refs/meshy_pilot');
const PUBLIC_MESHY = join(REPO, 'public/meshy');
const BASE = 'https://api.meshy.ai/openapi/v1';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const manifest = JSON.parse(readFileSync(args.manifest, 'utf8'));
const only = args.only ? String(args.only).split(',') : null;
const CONCURRENCY = Number(args.concurrency || 10);

const key = (() => {
  for (const line of readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*MESHY_API_KEY\s*=\s*(.+?)\s*$/);
    if (m) return m[1];
  }
  throw new Error('MESHY_API_KEY not found');
})();
const HEADERS = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

const ts = () => new Date().toISOString().slice(11, 19);
const log = (id, msg) => console.log(`[${ts()}] [${id}] ${msg}`);

const api = async (method, path, body) => {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${BASE}${path}`, { method, headers: HEADERS, body: body ? JSON.stringify(body) : undefined });
    if (res.ok) return res.json();
    const text = await res.text();
    if (res.status >= 500 || res.status === 429) {
      await new Promise(r => setTimeout(r, 8000 * (attempt + 1)));
      continue;
    }
    throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  }
  throw new Error(`retries exhausted on ${path}`);
};

const poll = async (path, id, label) => {
  for (;;) {
    const t = await api('GET', path);
    if (t.status === 'SUCCEEDED') { log(id, `${label} SUCCEEDED (credits=${t.consumed_credits ?? '?'})`); return t; }
    if (t.status === 'FAILED' || t.status === 'CANCELED') {
      throw new Error(`${label} ${t.status}: ${JSON.stringify(t.task_error || {}).slice(0, 400)}`);
    }
    await new Promise(r => setTimeout(r, 10000));
  }
};

const download = async (url, dest) => {
  if (!url || typeof url !== 'string' || !/^https?:/.test(url)) return null;
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}: ${dest}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  return dest;
};

const dataUri = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;

async function runCharacter(id, cfg) {
  const outRoot = join(PILOT, cfg.outDir || id);
  const reportPath = join(outRoot, `${id}_pipeline_report.json`);
  const report = existsSync(reportPath)
    ? JSON.parse(readFileSync(reportPath, 'utf8'))
    : { id, started: new Date().toISOString(), height_meters: cfg.height, action_id: cfg.actionId, tasks: {} };
  report.height_meters = cfg.height; report.action_id = cfg.actionId;
  const save = () => { mkdirSync(outRoot, { recursive: true }); writeFileSync(reportPath, JSON.stringify(report, null, 2)); };

  // ── Stage 1: multi-image-to-3d ──
  if (!report.tasks.base?.id) {
    const images = cfg.views.map(f => dataUri(join(cfg.inputDir, f)));
    const body = {
      image_urls: images, ai_model: 'latest', topology: 'triangle',
      target_polycount: 30000, should_remesh: true, should_texture: true,
      pose_mode: 'a-pose', remove_lighting: true, height_meters: cfg.height,
    };
    const res = await api('POST', '/multi-image-to-3d', body);
    report.tasks.base = { id: res.result }; save();
    log(id, `base task ${res.result} (${cfg.views.length} views, h=${cfg.height})`);
  }
  const baseTask = await poll(`/multi-image-to-3d/${report.tasks.base.id}`, id, 'base');
  report.tasks.base.consumed_credits = baseTask.consumed_credits; save();
  if (!existsSync(join(outRoot, '01_base', 'model.glb'))) {
    await download(baseTask.model_urls?.glb, join(outRoot, '01_base', 'model.glb'));
    await download(baseTask.model_urls?.fbx, join(outRoot, '01_base', 'model.fbx'));
    for (const [k, v] of Object.entries(baseTask.texture_urls?.[0] || {})) {
      await download(v, join(outRoot, '01_base', 'textures', `${k}.png`));
    }
    await download(baseTask.thumbnail_url, join(outRoot, '01_base', 'thumbs', 'thumbnail.png'));
    log(id, 'base artifacts downloaded');
  }

  // ── Stage 2: rigging ──
  if (!report.tasks.rig?.id) {
    const res = await api('POST', '/rigging', { input_task_id: report.tasks.base.id, height_meters: cfg.height });
    report.tasks.rig = { id: res.result }; save();
    log(id, `rig task ${res.result}`);
  }
  const rigTask = await poll(`/rigging/${report.tasks.rig.id}`, id, 'rig');
  report.tasks.rig.consumed_credits = rigTask.consumed_credits; save();
  const rr = rigTask.result || {};
  if (!existsSync(join(outRoot, '02_rigged', `${id}_rigged.glb`))) {
    await download(rr.rigged_character_glb_url, join(outRoot, '02_rigged', `${id}_rigged.glb`));
    await download(rr.rigged_character_fbx_url, join(outRoot, '02_rigged', `${id}_rigged.fbx`));
    for (const [k, v] of Object.entries(rr.basic_animations || {})) {
      if (typeof v !== 'string' || !/^https?:/.test(v)) continue;
      const ext = v.split('?')[0].match(/\.(glb|fbx)$/i)?.[1]?.toLowerCase() || 'bin';
      await download(v, join(outRoot, '02_rigged', `${k}.${ext}`));
    }
    log(id, 'rig artifacts downloaded');
  }

  // ── Stage 3: idle animation ──
  if (!report.tasks.anim?.id) {
    const res = await api('POST', '/animations', { rig_task_id: report.tasks.rig.id, action_id: cfg.actionId });
    report.tasks.anim = { id: res.result, action_id: cfg.actionId }; save();
    log(id, `anim task ${res.result} (action ${cfg.actionId})`);
  }
  const animTask = await poll(`/animations/${report.tasks.anim.id}`, id, 'anim');
  report.tasks.anim.consumed_credits = animTask.consumed_credits; save();
  const ar = animTask.result || {};
  const animDir = join(outRoot, '03_anim', cfg.animKey || `action_${cfg.actionId}`);
  // Download every artifact url in the result (incl. armature-only variants when offered)
  for (const [k, v] of Object.entries(ar)) {
    if (typeof v !== 'string' || !/^https?:/.test(v)) continue;
    const ext = v.split('?')[0].match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || 'bin';
    await download(v, join(animDir, `${k.replace(/_url$/, '')}.${ext}`));
  }
  log(id, 'anim artifacts downloaded');

  // ── Runtime copy ──
  const animGlb = join(animDir, 'animation_glb.glb');
  if (existsSync(animGlb)) {
    mkdirSync(PUBLIC_MESHY, { recursive: true });
    copyFileSync(animGlb, join(PUBLIC_MESHY, `${id}_idle.glb`));
    log(id, `runtime GLB -> public/meshy/${id}_idle.glb`);
  } else {
    log(id, 'WARNING: no animation_glb.glb artifact for runtime copy');
  }

  report.finished = new Date().toISOString(); save();
  const spent = Object.values(report.tasks).reduce((s, t) => s + (t.consumed_credits || 0), 0);
  log(id, `DONE (total ${spent} credits)`);
  return { id, spent };
}

const ids = Object.keys(manifest).filter(id => !only || only.includes(id));
console.log(`[${ts()}] wave start: ${ids.length} characters, concurrency ${CONCURRENCY}`);
const queue = [...ids];
const results = []; const failures = [];
const worker = async () => {
  for (;;) {
    const id = queue.shift();
    if (!id) return;
    try { results.push(await runCharacter(id, manifest[id])); }
    catch (e) { failures.push({ id, error: String(e).slice(0, 300) }); log(id, `FAILED: ${String(e).slice(0, 300)}`); }
  }
};
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
console.log(`[${ts()}] wave complete: ${results.length} ok, ${failures.length} failed`);
console.log(JSON.stringify({ results, failures }, null, 2));
if (failures.length) process.exit(1);
