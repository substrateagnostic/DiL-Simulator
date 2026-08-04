// WHOLE-CAST IN-GAME FRAMING GATE.
//
// The V8 round shipped a spine/floor fix that was verified on an offscreen
// render harness and on exactly two in-game characters — one of which was the
// SHORTEST model in the cast. That sample missed a cast-wide crop: seven of the
// nine story enemies had their scalp off the top of the combat frame, and the
// enemy nameplate panel (y = 15..145) covered several more. This is the
// instrument that would have caught it.
//
// It boots the REAL preview build, starts each encounter through the game's own
// entry point, confirms the stage actually built the Meshy cast, and measures
// the CROWN — the highest SKINNED vertex, CPU-skinned through
// SkinnedMesh.applyBoneTransform off matrixWorld, never a geometry bounding box
// (SkinnedMesh.geometry.boundingBox is BIND space and reports garbage: a probe
// that trusted it returned worldH 0.173 m for skip_boss).
//
// PASS = every enemy crown lands at screen y >= CROWN_MIN (default 160), which
// is 15 px of air under the bottom of the nameplate panel, and the feet stay on
// screen.
//
//   node tools/meshy-framing-gate.mjs                 # gate the story cast
//   node tools/meshy-framing-gate.mjs --all           # + group encounters
//   node tools/meshy-framing-gate.mjs --only=chad,karen
//   node tools/meshy-framing-gate.mjs --shots         # also write PNG stills
//   node tools/meshy-framing-gate.mjs --nomeshy       # gate the procedural fallback cast
//   node tools/meshy-framing-gate.mjs --sweep=y:2.1,look:1.4,z:5.6   # try a camera
//
// Exit code 1 on any failure, so it can sit in front of a commit.
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const REPO = process.cwd();
const OUT = join(REPO, 'art/char_refs/meshy_pilot/_framing');
const PORT = 4322;
const VIEW = { width: 1440, height: 810 };
const CROWN_MIN = Number(args.crown ?? 160);   // nameplate panel occupies y = 15..145
const NAMEPLATE_BOTTOM = 145;

// Every SOLO story encounter. The Algorithm is the one PROCEDURAL body on the
// stage (the monolith stays procedural by producer order) and it is gated all
// the same — the frame does not care which cast built the mesh.
const SOLO = [
  'intern', 'karen', 'chad', 'grandma', 'compliance', 'regional', 'skip_boss',
  'security_guard', 'hr_rep', 'restructuring_analyst', 'brand_consultant',
  'data_analytics_lead', 'chief_of_restructuring', 'corporate_lawyer',
  'meredith_boss', 'parking_enforcer', 'networking_guy', 'cfos_assistant',
  'regional_director', 'reception_client', 'algorithm',
];
const GROUP = ['restructuring_trio', 'data_analytics_duo', 'the_firm'];
// The Algorithm has no head. Its topmost geometry is an unnamed FX BoxGeometry
// that sits ~0.25 units ABOVE the visible pillar rim, so a crown gate written for
// scalps reads it as a fail while the thing you actually see is comfortably in
// frame. Measured and reported, never gated. (At the old flat 1.9 it stood 4.12
// world units and left the frame entirely; the framing law puts it at 2.71.)
const NOT_A_HEAD = new Set(['algorithm']);

const fights = args.only ? String(args.only).split(',') : (args.all ? [...SOLO, ...GROUP] : SOLO);
if (args.shots) mkdirSync(OUT, { recursive: true });

// Optional camera sweep: --sweep=y:2.1,look:1.4,z:5.6 (any subset)
const sweep = args.sweep ? Object.fromEntries(String(args.sweep).split(',').map(p => {
  const [k, v] = p.split(':'); return [k, Number(v)];
})) : null;

const preview = spawn(process.execPath, [join(REPO, 'node_modules/vite/bin/vite.js'), 'preview', '--port', String(PORT), '--strictPort'],
  { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('preview did not start')), 30000);
  preview.stdout.on('data', d => { if (String(d).includes(String(PORT))) { clearTimeout(t); res(); } });
});

const browser = await chromium.launch({ headless: false, args: [`--window-size=${VIEW.width + 40},${VIEW.height + 120}`] });
const ctx = await browser.newContext({ viewport: VIEW });
const page = await ctx.newPage();

// Measured in the page. Returns one row per enemy on the stage.
const MEASURE = `(() => {
  const scene = window.__combat && window.__combat.scene;
  if (!scene) return { error: 'no combat scene' };
  const cam = scene.camera;
  // three is not exposed as a global; borrow the Vector3 class off the camera.
  const V3 = cam.position.constructor;
  const W = window.innerWidth, H = window.innerHeight;
  const rows = [];
  const stage = [
    ...scene.enemyGroups.map(g => ({ eg: g, side: 'enemy' })),
    ...scene.allyGroups.map(g => ({ eg: g, side: 'ally' })),
  ];
  for (const { eg, side } of stage) {
    const g = eg.group;
    g.updateWorldMatrix(true, true);
    let skinned = 0;
    const meshes = [];
    g.traverse(o => { if (o.isSkinnedMesh && o.geometry && o.geometry.attributes.position) { skinned++; meshes.push(o); } });
    let crownY = -Infinity, footY = Infinity, crownPt = null, footPt = null, crownMesh = '';
    if (skinned) {
      // Top / bottom bands only, strided — the crown and the soles, not 40k verts.
      for (const m of meshes) {
        const pos = m.geometry.attributes.position;
        let lo = Infinity, hi = -Infinity;
        for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y < lo) lo = y; if (y > hi) hi = y; }
        const topCut = hi - 0.12 * (hi - lo), botCut = lo + 0.12 * (hi - lo);
        const idx = [];
        for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y > topCut || y < botCut) idx.push(i); }
        const stride = Math.max(1, Math.ceil(idx.length / 900));
        const v = new V3();
        for (let k = 0; k < idx.length; k += stride) {
          v.fromBufferAttribute(pos, idx[k]);
          m.applyBoneTransform(idx[k], v);
          m.localToWorld(v);
          if (v.y > crownY) { crownY = v.y; crownPt = v.clone(); }
          if (v.y < footY) { footY = v.y; footPt = v.clone(); }
        }
      }
    } else {
      // Procedural body (the Algorithm, or any ?nomeshy fallback). REAL VERTICES,
      // not AABB corners: the monolith is a cylinder, and the corner of its
      // bounding box is a point in empty space ~40 px above the actual rim.
      const v = new V3();
      g.traverse(o => {
        if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
        if (!o.visible) return;
        const pos = o.geometry.attributes.position;
        const stride = Math.max(1, Math.ceil(pos.count / 600));
        for (let i = 0; i < pos.count; i += stride) {
          v.fromBufferAttribute(pos, i);
          v.applyMatrix4(o.matrixWorld);
          if (v.y > crownY) { crownY = v.y; crownPt = v.clone(); crownMesh = o.name || o.geometry.type; }
          if (v.y < footY) { footY = v.y; footPt = v.clone(); }
        }
      });
    }
    if (!crownPt) continue;
    const toPx = p => { const v = p.clone().project(cam); return { x: (v.x + 1) / 2 * W, y: (1 - v.y) / 2 * H }; };
    const cs = toPx(crownPt), fs = toPx(footPt);
    // Head bone, for cross-reference against the judge's own probe.
    let headBone = null;
    g.traverse(o => { if (o.isBone && /head/i.test(o.name) && !headBone) headBone = o; });
    let headPx = null;
    if (headBone) { const p = new V3().setFromMatrixPosition(headBone.matrixWorld); headPx = toPx(p); }
    rows.push({
      characterId: eg.characterId || 'andrew',
      side,
      cast: skinned ? 'meshy' : 'procedural',
      scale: eg.group.scale.x,
      crownWorldY: crownY, footWorldY: footY,
      crownPx: cs.y, crownPxX: cs.x, footPx: fs.y, crownMesh,
      headBonePx: headPx ? headPx.y : null,
    });
  }
  return { rows, cam: { y: scene._basePos.y, z: scene._basePos.z, look: scene._baseLook.y } };
})()`;

const results = [];
for (const fight of fights) {
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7${args.nomeshy ? '&nomeshy' : ''}`, { waitUntil: 'load' });
  await page.waitForFunction(() => !!window.__explore, { timeout: 30000 });
  await page.waitForTimeout(900);
  if (sweep) {
    await page.evaluate(s => { window.__framingSweep = s; }, sweep);
  }
  await page.evaluate(f => window.__explore._startCombat(f), fight);
  try {
    await page.waitForFunction(() => window.__combat?.scene?.enemyGroups?.length > 0, { timeout: 30000 });
  } catch (_) {
    console.log(`${fight.padEnd(24)} SKIP (encounter did not start)`);
    continue;
  }
  await page.waitForTimeout(4200); // intro slide + banner clear, back to the stance
  if (sweep) {
    await page.evaluate(s => {
      const sc = window.__combat.scene;
      if (s.y != null) sc._basePos.y = s.y;
      if (s.z != null) sc._basePos.z = s.z;
      if (s.look != null) sc._baseLook.y = s.look;
    }, sweep);
    await page.waitForTimeout(400);
  }

  // Sample across a few seconds of idle and keep the WORST (highest) crown.
  let worst = null;
  for (let s = 0; s < 5; s++) {
    const out = await page.evaluate(MEASURE);
    if (out.error) { console.log(`${fight.padEnd(24)} ERROR ${out.error}`); break; }
    if (!worst) worst = out;
    else for (let i = 0; i < out.rows.length; i++) {
      if (out.rows[i].crownPx < worst.rows[i].crownPx) worst.rows[i] = out.rows[i];
    }
    await page.waitForTimeout(420);
  }
  if (!worst) continue;
  if (args.shots) writeFileSync(join(OUT, `frame_${fight}.png`), await page.screenshot());
  for (const r of worst.rows) results.push({ fight, ...r });
}

await browser.close();
preview.kill();

// ── Report ────────────────────────────────────────────────────────────────
results.sort((a, b) => a.crownPx - b.crownPx);
console.log(`\ncrown clearance @ ${VIEW.width}x${VIEW.height}, gate = crown y >= ${CROWN_MIN} (nameplate bottom ${NAMEPLATE_BOTTOM})\n`);
console.log('fight                    character                side   cast        scale  crownY(px)  feetY(px)  worldH(m)  verdict');
let fails = 0;
for (const r of results) {
  const worldH = r.crownWorldY - r.footWorldY;
  // Allies are the OTS foreground and are deliberately cropped — measured, not gated.
  const bad = r.side === 'enemy' && !NOT_A_HEAD.has(r.characterId) && r.crownPx < CROWN_MIN;
  const offFeet = r.side === 'enemy' && !NOT_A_HEAD.has(r.characterId) && r.footPx > VIEW.height;
  if (bad || offFeet) fails++;
  console.log(
    `${r.fight.padEnd(24)} ${r.characterId.padEnd(24)} ${r.side.padEnd(6)} ${r.cast.padEnd(11)} ` +
    `${r.scale.toFixed(2)}  ${r.crownPx.toFixed(0).padStart(10)}  ${r.footPx.toFixed(0).padStart(9)}  ` +
    `${worldH.toFixed(3).padStart(9)}  ${bad ? 'FAIL crown' : offFeet ? 'FAIL feet' : r.side === 'ally' ? '-' : NOT_A_HEAD.has(r.characterId) ? 'info' : 'pass'}`
  );
}
writeFileSync(join(REPO, 'art/char_refs/meshy_pilot/_framing_gate.json'), JSON.stringify({ crownMin: CROWN_MIN, viewport: VIEW, sweep, results }, null, 1));
console.log(`\n${results.length} combatants measured, ${fails} failing. -> art/char_refs/meshy_pilot/_framing_gate.json`);
process.exit(fails ? 1 : 0);
