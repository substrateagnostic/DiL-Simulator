// BODY-BOB evidence on the THREE CAMERAS THAT MATTER, through the shipping
// call path (fixture boot + real title flow), never a convenience stage.
//
//   node tools/_bb-cams.mjs --tag=after  [--port=5311]
//   node tools/_bb-cams.mjs --tag=before [--port=5311] --legacy
//
// `--legacy` reinstalls the PRE-FIX bob on `CharacterAnimator.prototype` from
// the page, so the before/after pair is shot by the same binary on the same
// cameras and nothing but the animator differs. The patch is a verbatim copy
// of the old `_breathe`: one offset on torso + head + arms only, sin phase, at
// ANIM.IDLE_BOUNCE 0.02 / WALK_BOUNCE 0.06, IDLE_SPEED 2 / WALK_SPEED 8 (the
// shipped values, which this lane does not change).
//
// Cameras:
//   A · NEW GAME vignette   — seated Andrew, the CLOSEST camera in the game
//   B · Wardrobe mirror     — standing Andrew idling, the closest STANDING one
//   C · Cubicle farm        — ordinary room distance: walk + a seated NPC
//   D · Janet quiz          — the producer's own framing
//
// Per camera it samples one idle cycle (3.15 s) as FIXED CLIPS and odiffs each
// against frame 0, so "the neck/collar pixels across the idle cycle" is a
// number. Stills and a webm land beside them.
import { chromium } from 'playwright';
import { compare } from 'odiff-bin';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const PORT = arg('port', '5311');
const TAG = arg('tag', 'after');
const LEGACY = process.argv.includes('--legacy');
// EVERY intermediate write goes OUTSIDE the repo. `screenshots/` sits inside
// the Vite root and vite.config.js has no watch-ignore for it, so a cycle diff
// writing 16 PNGs into the project makes the dev server issue a full-reload —
// which tore the New Game vignette down mid-take twice, once reported as an
// 81 % "diff" that was in fact the title screen. Curated stills are copied
// back at the end, after the browser is closed.
const FINAL = path.join('screenshots', 'bb', TAG, 'cams');
const OUT = path.join(os.tmpdir(), 'ti-bb-cams', TAG);
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, '_frames'), { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

const results = {};
let fails = 0;
const check = (n, ok, d = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); if (!ok) fails++; };

// The pre-fix animator, reinstalled on the prototype. Also parks every child
// back on its authored y first, so the new code's offsets cannot linger on the
// seven nodes the old code never touched.
const LEGACY_PATCH = `(() => {
  const inst = (window.__ngScreen && window.__ngScreen._animator)
    || (window.__explore && window.__explore.player && window.__explore.player.animator);
  if (!inst) return 'no animator';
  const proto = Object.getPrototypeOf(inst);
  if (proto.__legacyBob) return 'already';
  proto.__legacyBob = true;
  proto._settleBody = function () {
    for (const n of this.group.children) {
      if (n.userData && n.userData.bobBaseY != null) n.position.y = n.userData.bobBaseY;
    }
    const speed = this.isWalking ? 8 : 2;
    const bounce = this.isWalking ? 0.06 : 0.02;
    const dy = Math.sin(this.time * speed) * bounce * this.bobScale;
    for (const n of [this.group.body, this.group.head, this.group.leftArm, this.group.rightArm]) {
      if (!n) continue;
      if (n.userData.bobBaseY == null) n.userData.bobBaseY = n.position.y;
      n.position.y = n.userData.bobBaseY + dy;
    }
  };
  return 'patched';
})()`;

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
  recordVideo: { dir: path.join(OUT, '_vid'), size: { width: 1600, height: 900 } },
});
const page = await context.newPage();
await page.addInitScript(() => { try { localStorage.clear(); } catch { /* ignore */ } });
page.on('pageerror', e => console.log('  ! pageerror', String(e).split('\n')[0]));

const tap = async (key = 'Enter', hold = 120) => {
  await page.keyboard.down(key); await page.waitForTimeout(hold); await page.keyboard.up(key);
};
const tapUntil = async (sel, key = 'Enter', tries = 5) => {
  for (let i = 0; i < tries; i++) {
    await tap(key);
    const el = await page.waitForSelector(sel, { timeout: 2500 }).catch(() => null);
    if (el) return el;
  }
  return null;
};
// Freeze the blink for a cycle diff: it is a random-interval eyelid scale that
// would land in some samples and not others and has nothing to do with the bob.
// Instrument-only — it never runs in the game.
const freezeBlink = () => page.evaluate(() => {
  const seen = [];
  const push = (a) => { if (a && !seen.includes(a)) { a._blinkIn = 1e9; a._blinkDur = 0; seen.push(a); } };
  push(window.__ngScreen && window.__ngScreen._animator);
  const ex = window.__explore;
  if (ex) {
    push(ex.player && ex.player.animator);
    const st = ex.stateManager.stack[ex.stateManager.stack.length - 1];
    push(st && st.previewAnimator);
    for (const n of (ex.roomManager && ex.roomManager.entityManager ? ex.roomManager.entityManager.npcs : [])) push(n.animator);
  }
  return seen.length;
});

// Hide every DOM overlay for a cycle diff. A first pass at room distance
// measured 25 % of the crop repainting and the diff mask was an inner-monologue
// card typing itself over the subject — the arbiter's VOICE zone, not a body.
const hideChrome = () => page.evaluate(() => {
  for (const sel of ['.na-root', '.exploration-hud', '.dialog-box', '#dialog-box']) {
    for (const el of document.querySelectorAll(sel)) el.style.display = 'none';
  }
});

// Stop every OTHER body in the room from walking through the crop. The cubicle
// farm has ambient patrols and one of them crossing frame is worth more diff
// than the whole bob — instrument-only, and it does NOT stop their animators,
// so a frozen-in-place NPC still breathes.
const holdOthers = (keepId) => page.evaluate((keep) => {
  const ex = window.__explore;
  let n = 0;
  for (const npc of ex.roomManager.entityManager.npcs) {
    if (npc.id === keep) continue;
    npc._frozen = true; npc._moveTarget = null; npc._moveState = 'idle';
    npc.animator.setWalking(false);
    n++;
  }
  return n;
}, keepId);

// The SHEAR, read off the live scene graph at this instant: how far the torso
// shell sits from the static dressing node that owns the NECK COLUMN, the
// collar, the shirt V and the tie. 0 = the figure is one piece.
const frozenShearMm = (pick) => page.evaluate((which) => {
  const ex = window.__explore;
  const g = which === 'ng' ? (window.__ngScreen && window.__ngScreen._andrew) : (ex && ex.player && ex.player.mesh);
  if (!g) return null;
  const skip = new Set([g.body, g.head, g.leftArm, g.rightArm, g.leftLeg, g.rightLeg]);
  const ys = [];
  for (const c of g.children) {
    if (c.userData && c.userData.blobShadow) continue;
    if (c.isMesh && c.geometry && c.geometry.type === 'PlaneGeometry') continue;
    ys.push(c.position.y - (c.userData.bobBaseY != null ? c.userData.bobBaseY : c.position.y));
  }
  if (!ys.length) return null;
  return +((Math.max(...ys) - Math.min(...ys)) * 1000).toFixed(2);
}, pick);

const installLegacy = async (label) => {
  if (!LEGACY) return;
  const r = await page.evaluate(LEGACY_PATCH);
  check(`${label}: legacy bob installed`, r === 'patched' || r === 'already', String(r));
  await page.waitForTimeout(500);
};

// A panel that is still animating IN is worth more diff than any bob: the
// wardrobe mirror's entrance was measured at 88.8 % of the neck crop on one
// run and 8.5 % on the next, purely on when frame 0 landed. Wait until two
// frames a beat apart agree to within `tol` before a cycle starts.
async function waitStable(clip, { tol = 1.5, tries = 12 } = {}) {
  const a = path.join(OUT, '_frames', '_stab-a.png');
  const b = path.join(OUT, '_frames', '_stab-b.png');
  for (let i = 0; i < tries; i++) {
    await page.screenshot({ path: a, clip });
    await page.waitForTimeout(320);
    await page.screenshot({ path: b, clip });
    const r = await compare(a, b, path.join(OUT, '_frames', '_stab-diff.png'), { threshold: 0.06, antialiasing: true });
    const pct = r.match ? 0 : (r.diffPercentage ?? 0);
    if (pct <= tol) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

// Sample ONE idle cycle (2π/IDLE_SPEED = 3.14 s) as fixed clips, then odiff
// every frame against frame 0. `worstPct` is the answer to "how much of this
// crop is repainted by the bob".
async function cycleDiff(name, clip, { samples = 16, cycleMs = 3150 } = {}) {
  const dir = path.join(OUT, '_frames');
  const files = [];
  for (let k = 0; k < samples; k++) {
    const f = path.join(dir, `${name}-${String(k).padStart(2, '0')}.png`);
    await page.screenshot({ path: f, clip });
    files.push(f);
    await page.waitForTimeout(Math.round(cycleMs / samples));
  }
  let worstPct = 0, worstK = 0, sumPct = 0;
  for (let k = 1; k < files.length; k++) {
    const r = await compare(files[0], files[k], path.join(dir, `${name}-diff-${k}.png`),
      { threshold: 0.06, antialiasing: true, outputDiffMask: true });
    const pct = r.match ? 0 : (r.diffPercentage ?? 0);
    sumPct += pct;
    if (pct > worstPct) { worstPct = pct; worstK = k; }
  }
  const m = { worstPct: +worstPct.toFixed(3), meanPct: +(sumPct / (samples - 1)).toFixed(3), worstFrame: worstK, clip };
  results[name] = m;
  console.log(`  ${name.padEnd(26)} worst=${String(m.worstPct).padStart(7)}%  mean=${String(m.meanPct).padStart(7)}%  (frame ${worstK})`);
  // keep the two ends of the swing as viewable evidence
  fs.copyFileSync(files[0], path.join(OUT, `${name}-f00.png`));
  fs.copyFileSync(files[worstK], path.join(OUT, `${name}-f${String(worstK).padStart(2, '0')}-worst.png`));
  return m;
}

try {
  // ══ A · NEW GAME vignette — the closest camera in the game, Andrew seated ══
  await page.goto(`http://localhost:${PORT}/?dev`);
  await page.waitForSelector('.title-screen', { timeout: 45000 });
  await page.waitForTimeout(1200);
  await tapUntil('.save-slot-panel');
  await page.waitForTimeout(400);
  const ng = await tapUntil('.ng-screen');
  check('A: New Game vignette opened', !!ng);
  if (ng) {
    await page.evaluate(() => window.__ngEngine.setQualityTier('high'));   // CAPTURE LAW
    await page.waitForTimeout(1000);
    await installLegacy('A');
    await freezeBlink();
    await page.screenshot({ path: path.join(OUT, 'A-ng-full.png') });
    await cycleDiff('A-ng-neck', { x: 700, y: 300, width: 260, height: 200 });
    await cycleDiff('A-ng-torso', { x: 690, y: 300, width: 300, height: 330 });
    check('A: tier held high', (await page.evaluate(() => window.__ngEngine.qualityTier)) === 'high');
    results['A-ng-shearMm'] = await frozenShearMm('ng');
    console.log(`  A-ng shear at the seated camera: ${results['A-ng-shearMm']} mm`);
  }

  // ══ B · Wardrobe mirror — the closest STANDING camera, Andrew idling ══
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=bathroom&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1200);
  await installLegacy('B');
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(1.5, 3.6, ex.tileMap);
    ex.camera.snapTo(1.5, 3.6, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(700);
  await tap('e');
  await page.waitForTimeout(1100);
  const inMirror = await page.evaluate(() => {
    const st = window.__explore.stateManager.stack;
    return st[st.length - 1]?.constructor.name;
  });
  check('B: wardrobe mirror open', inMirror === 'WardrobeState', String(inMirror));
  if (inMirror === 'WardrobeState') {
    await freezeBlink();
    await hideChrome();
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(OUT, 'B-mirror-full.png') });
    check('B: mirror panel settled before sampling', await waitStable({ x: 445, y: 190, width: 230, height: 230 }, { tol: 3.5 }));
    await cycleDiff('B-mirror-neck', { x: 445, y: 190, width: 230, height: 230 });
    // Clear of the mirror's own caption band (y ~750-800) — a typewriter line
    // inside the crop was worth 85 % of it on one run.
    await cycleDiff('B-mirror-hem', { x: 420, y: 590, width: 300, height: 160 });
    await tap('Escape');
    await page.waitForTimeout(600);
  }

  // ══ C · Cubicle farm — ordinary room distance ══
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=cubicle_farm&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1500);
  await installLegacy('C');
  // A seated NPC: put the camera on one and shoot its own idle cycle.
  const seated = await page.evaluate(() => {
    const ex = window.__explore;
    const npc = ex.roomManager.entityManager.npcs.find(n => n.sitting && n.visible !== false);
    if (!npc) return null;
    ex.player.setPosition(npc.position.x, npc.position.z + 1.6, ex.tileMap);
    ex.camera.snapTo(npc.position.x, npc.position.z + 1.6, ex.player.mesh.position.y);
    return { id: npc.id, x: npc.position.x, z: npc.position.z };
  });
  check('C: a seated NPC exists in the cubicle farm', !!seated, JSON.stringify(seated));
  await page.waitForTimeout(1200);
  await freezeBlink();
  await holdOthers(seated ? seated.id : null);
  await hideChrome();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'C-room-standing.png') });
  if (seated) await cycleDiff('C-seated-npc', { x: 660, y: 330, width: 300, height: 300 });

  // Walking, at room distance, on video — does it still read as walking?
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(3, 4, ex.tileMap);
    ex.camera.snapTo(3, 4, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, 'C-walk-start.png') });
  for (let i = 0; i < 4; i++) {
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(900); await page.keyboard.up('ArrowDown');
    await page.waitForTimeout(200);
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(900); await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(200);
  }
  await page.screenshot({ path: path.join(OUT, 'C-walk-end.png') });
  check('C: tier held high', (await page.evaluate(() => window.__engine && window.__engine.qualityTier)) === 'high');
  // The player himself at room distance, camera-centred.
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(6, 6, ex.tileMap);
    ex.camera.snapTo(6, 6, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(1200);
  await freezeBlink();
  await holdOthers(null);
  await hideChrome();
  await page.waitForTimeout(600);
  await cycleDiff('C-room-andrew', { x: 700, y: 300, width: 220, height: 280 });

  // ══ E · Andrew at CLOSEUP through the SHIPPING camera ══
  // Technique borrowed from tools/_fr2-b6-sit.mjs: do not build a camera and do
  // not stop the loop (preserveDrawingBuffer is off — a hand-rendered frame is
  // black). Push the SHIPPING orthographic camera's own frustum in and let the
  // game keep rendering itself. Idle gets a cycle diff; the walk gets stills
  // and the take's video, because a diff of a tracking camera measures the
  // camera.
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=cubicle_farm&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1500);
  await installLegacy('E');
  await freezeBlink();
  await holdOthers(null);
  await hideChrome();
  const zoomed = await page.evaluate(() => {
    const ex = window.__explore, eng = window.__engine;
    if (!eng) return false;
    ex.player.setPosition(6, 6, ex.tileMap);
    const aspect = eng.width / eng.height;
    const zoom = 1.55;
    eng.camera.left = -zoom * aspect; eng.camera.right = zoom * aspect;
    eng.camera.top = zoom; eng.camera.bottom = -zoom;
    eng.camera.updateProjectionMatrix();
    eng.setTiltShift?.(false);
    // Hide the CEILING HARDWARE only. At this zoom a lit troffer hangs across
    // Andrew's head and its bloom, not his collar, would be most of the diff.
    // Same licence tools/_fr2-b6-sit.mjs takes to see a thigh: this is a plate
    // of the rig, and everything below head height is untouched.
    window.__bbHidden = [];
    eng.scene.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      let y = 1e9, n = o;
      while (n) { y = Math.min(y, n.position.y); n = n.parent === eng.scene ? null : n.parent; }
      if (o.getWorldPosition) {
        const v = new (o.position.constructor)();
        o.getWorldPosition(v);
        if (v.y > 1.9) { o.visible = false; window.__bbHidden.push(o); }
      }
    });
    ex.camera.clearBounds?.();
    const mp = ex.player.mesh.position;
    ex.camera.snapTo(mp.x, mp.z, mp.y + 0.85);
    return true;
  });
  check('E: shipping camera pushed in on Andrew', zoomed);
  await page.waitForTimeout(1400);
  // STILLS AND VIDEO ONLY on this leg — no diff number. The exploration camera
  // re-aims at the player every frame through a dead-zone lerp, so it drifts a
  // few pixels between samples and a fixed-crop diff here measures the tripod,
  // not the body. The registered warp numbers come off the bench
  // (tools/_bb-probe.mjs) and the two real closeup cameras (A and B); this leg
  // exists to answer "does the walk still read as walking when you get close".
  for (let k = 0; k < 4; k++) {
    await page.screenshot({ path: path.join(OUT, `E-closeup-idle-${k}.png`) });
    await page.waitForTimeout(780);   // quarter of an idle cycle
  }
  // ...and now walk him, at that camera.
  for (let i = 0; i < 3; i++) {
    await page.keyboard.down('ArrowDown'); await page.waitForTimeout(1000); await page.keyboard.up('ArrowDown');
    await page.screenshot({ path: path.join(OUT, `E-closeup-walk-${i}.png`) });
    await page.waitForTimeout(250);
    await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1000); await page.keyboard.up('ArrowUp');
    await page.waitForTimeout(250);
  }
  check('E: tier held high through the closeup take',
    (await page.evaluate(() => window.__engine.qualityTier)) === 'high');

  // ══ D · the producer's own framing — Janet's quiz at the desk ══
  await page.goto(`http://localhost:${PORT}/?dev&shot=cubicle_farm&qtier=high`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1500);
  await installLegacy('D');
  await page.evaluate(() => {
    const ex = window.__explore;
    ex.player.setPosition(3, 11, ex.tileMap);
    ex.camera.snapTo(3, 11, ex.player.mesh.position.y);
  });
  await page.waitForTimeout(700);
  await freezeBlink();
  // Press E at the TOP of the bob, so the frozen still is the worst frame a
  // player can actually be shown — a dialog pauses ExplorationState, so the
  // body stops wherever the bob left it and the collar stays parked there for
  // as long as the conversation lasts. That is what a quiz screenshot is.
  for (let i = 0; i < 400; i++) {
    const atPeak = await page.evaluate(() => {
      const a = window.__explore.player.animator;
      return Math.sin(a.time * 2) > 0.985;
    });
    if (atPeak) break;
    await page.waitForTimeout(25);
  }
  await tap('e', 60); await page.waitForTimeout(800);
  for (let i = 0; i < 14; i++) {
    const t = await page.evaluate(() => {
      const st = window.__explore.stateManager.stack;
      return st[st.length - 1]?.constructor.name;
    });
    if (t !== 'DialogState') break;
    await tap('Enter'); await page.waitForTimeout(340);
  }
  // The quiz pushes itself ~500 ms after the desk scene ends; give it room.
  let quizUp = false;
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(400);
    quizUp = await page.evaluate(() => {
      const st = window.__explore.stateManager.stack;
      return st[st.length - 1]?.constructor.name === 'DialogState';
    });
    if (quizUp) break;
  }
  check('D: quiz reached at the desk', quizUp);
  await page.screenshot({ path: path.join(OUT, 'D-quiz-producer-framing.png') });
  // A dialog FREEZES the body (ExplorationState stops ticking), so a cycle diff
  // here reads 0 whatever the animator does. The number that matters is the
  // shear the still is frozen AT.
  results['D-quiz-frozen-shearMm'] = await frozenShearMm('world');
  console.log(`  D-quiz frozen shear in the producer's own still: ${results['D-quiz-frozen-shearMm']} mm`);
} catch (e) {
  check('harness completed', false, e.message);
  await page.screenshot({ path: path.join(OUT, '99-error.png') }).catch(() => {});
}

fs.writeFileSync(path.join(OUT, `_cams-${TAG}.json`), JSON.stringify({ tag: TAG, legacy: LEGACY, results }, null, 2));
const vid = page.video();
const vpath = vid ? await vid.path().catch(() => null) : null;
await page.close();
await context.close();
await browser.close();
if (vpath && fs.existsSync(vpath)) {
  const dest = path.join(OUT, `bb-${TAG}.webm`);
  if (fs.existsSync(dest)) fs.unlinkSync(dest);
  fs.renameSync(vpath, dest);
  console.log(`video -> ${dest}`);
}
console.log(fails === 0 ? '\nALL PASS' : `\n${fails} FAILURE(S)`);
// Curated stills, the video and the json, copied back into the repo now that
// nothing is watching a live page.
for (const f of fs.readdirSync(OUT)) {
  const src = path.join(OUT, f);
  if (fs.statSync(src).isDirectory()) continue;
  fs.copyFileSync(src, path.join(FINAL, f));
}
console.log(`stills -> ${FINAL}`);
process.exit(fails === 0 ? 0 : 1);
