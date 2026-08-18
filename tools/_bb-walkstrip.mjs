// BODY-BOB walk strip — 12 frames of one walk cycle at CLOSEUP, through the
// shipping camera and the shipping render, tiled into one sheet.
//
//   node tools/_bb-walkstrip.mjs --tag=after  [--port=5311]
//   node tools/_bb-walkstrip.mjs --tag=before [--port=5311] --legacy
//
// WALK_SPEED is 8 rad/s, so one stride is 2π/8 = 0.785 s; 12 frames at 70 ms
// covers ~1.07 strides. Frames are written OUTSIDE the repo (Vite watches
// `screenshots/` and a burst of PNGs into the project triggers a full-reload
// that has torn a take down mid-capture), then tiled back in with ffmpeg.
//
// This exists because "judge stances by VIDEO, not a contact sheet" cannot be
// handed to a text-and-images reviewer — a dense strip at 14 fps is the closest
// honest substitute. The real webm is beside it (tools/_bb-cams.mjs).
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const PORT = arg('port', '5311');
const TAG = arg('tag', 'after');
const LEGACY = process.argv.includes('--legacy');
const WORK = path.join(os.tmpdir(), 'ti-bb-walk', TAG);
const FINAL = path.join('screenshots', 'bb', TAG, 'cams');
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

const LEGACY_PATCH = `(() => {
  const inst = window.__explore && window.__explore.player && window.__explore.player.animator;
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
const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
page.on('pageerror', e => console.log('  ! pageerror', String(e).split('\n')[0]));
await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&shot=cubicle_farm&qtier=high`);
await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
await page.waitForTimeout(1500);
if (LEGACY) console.log('  legacy bob:', await page.evaluate(LEGACY_PATCH));

await page.evaluate(() => {
  const ex = window.__explore, eng = window.__engine;
  for (const npc of ex.roomManager.entityManager.npcs) { npc._frozen = true; npc.animator.setWalking(false); }
  for (const sel of ['.na-root', '.exploration-hud']) {
    for (const el of document.querySelectorAll(sel)) el.style.display = 'none';
  }
  ex.player.setPosition(3, 3, ex.tileMap);
  const aspect = eng.width / eng.height, zoom = 1.5;
  eng.camera.left = -zoom * aspect; eng.camera.right = zoom * aspect;
  eng.camera.top = zoom; eng.camera.bottom = -zoom;
  eng.camera.updateProjectionMatrix();
  eng.setTiltShift?.(false);
  ex.camera.clearBounds?.();
  const mp = ex.player.mesh.position;
  ex.camera.snapTo(mp.x, mp.z, mp.y + 0.85);
});
await page.waitForTimeout(1200);

// Walk him for a beat first so the cycle is running, then sample it.
await page.keyboard.down('ArrowDown');
await page.waitForTimeout(700);
const files = [];
for (let k = 0; k < 12; k++) {
  const f = path.join(WORK, `w${String(k).padStart(2, '0')}.png`);
  await page.screenshot({ path: f });
  files.push(f);
  await page.waitForTimeout(70);
}
await page.keyboard.up('ArrowDown');
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(WORK, 'stopped.png') });
await browser.close();

// Tile 4 x 3, downscaled so the sheet is readable in one view.
const out = path.join(FINAL, `F-walkstrip-${TAG}.png`);
execFileSync('ffmpeg', ['-y', '-framerate', '1', '-i', path.join(WORK, 'w%02d.png'),
  '-vf', 'scale=600:-1,tile=4x3', '-frames:v', '1', out], { stdio: 'ignore' });
fs.copyFileSync(path.join(WORK, 'stopped.png'), path.join(FINAL, `F-walk-stopped-${TAG}.png`));
console.log(`strip -> ${out}`);
