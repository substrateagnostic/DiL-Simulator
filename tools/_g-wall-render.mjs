// Renders for the walk-behind wall-fade fix, at the SHIPPING isometric camera
// (ISO CAMERA LAW). Numbers alone did not catch this defect and prose never
// will; every station also logs the live wall-prop opacity so the plate and the
// readout are the same run.
//
//   stair-*   the producer's five tie-break stations in `stairwell` (1600x900,
//             framing matched to screenshots/tiebreak/tb-stair-*-SHIPPING.png)
//   exec-*    executive_floor `elevatorDoors` regression: the fade must STILL
//             fire behind the south wall and STILL clear away from it. This is
//             the reason the system exists — if the fix kills it, it is the
//             wrong fix.
//   vault-*   the eight-lockbox SE corner, the densest registration in the game
//
//   node tools/_g-wall-render.mjs --port=5177 --tag=after
//   node tools/_g-wall-render.mjs --port=5177 --tag=before --guardoff
//
// HEADED chromium per the house law; closes its own browser.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => {
  const hit = process.argv.find(a => a.startsWith(`--${k}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};
const PORT = arg('port', '5177');
const TAG = arg('tag', 'after');
const GUARDOFF = process.argv.includes('--guardoff');
const STAIR_OUT = path.resolve('screenshots/g-run/ux');
const OCC_OUT = path.resolve('screenshots/g-run/cutscenes/occluder');
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(STAIR_OUT, { recursive: true });
fs.mkdirSync(OCC_OUT, { recursive: true });

const readout = [];

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--use-gl=angle', '--enable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  if (GUARDOFF) await page.addInitScript('window.__wallGuardOff = true;');
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });

  // Park the player the only way the game moves the camera — by moving Andrew.
  const park = async (room, x, z) => {
    await page.evaluate(({ room: r, x: px, z: pz }) => {
      const ex = window.__explore;
      if (ex.roomManager.currentRoom?.data?.id !== r) ex._loadRoom(r, px, pz);
      const tm = ex.roomManager.currentRoom.getTileMap();
      ex.player.setPosition(px, pz, tm);
      ex.camera.snapTo(px, pz, ex.player.mesh.position.y);
    }, { room, x, z });
    // _updateWallFade blends at min(1, dt*7) per frame from wherever the last
    // station left it, and a room BUILD eats frames — 900 ms left the vault
    // mid-blend at 0.706. 1600 ms converges from any start.
    await sleep(1600);
  };
  const shot = async (dir, name, room, x, z) => {
    await park(room, x, z);
    const nums = await page.evaluate(() => {
      const room2 = window.__explore.roomManager.currentRoom;
      const op = l => l.map(o => +o.material.opacity.toFixed(3));
      return {
        claims: (room2._wallPropTypes || []).slice(),
        east: op(room2.getEastWallProps()), south: op(room2.getSouthWallProps()),
        eastWall: op(room2.getEastWallMeshes().map(m => ({ material: m.material }))),
        southWall: op(room2.getSouthWallMeshes().map(m => ({ material: m.material }))),
      };
    });
    const f = path.join(dir, `${name}.png`);
    await page.screenshot({ path: f });
    readout.push({ shot: name, room, at: [x, z], ...nums });
    console.log(`${name.padEnd(34)} claims=[${nums.claims.join(' ')}] eastProps=[${nums.east}] southProps=[${nums.south}]`);
  };

  // ── stairwell: the producer's five stations, plus his far-west control ──
  await shot(STAIR_OUT, `r3-stair-top-${TAG}`,       'stairwell', 2, 17.5);
  await shot(STAIR_OUT, `r3-stair-17-${TAG}`,        'stairwell', 2, 17);
  await shot(STAIR_OUT, `r3-stair-mid-${TAG}`,       'stairwell', 2, 12);
  await shot(STAIR_OUT, `r3-stair-mid-lower-${TAG}`, 'stairwell', 2, 10);
  await shot(STAIR_OUT, `r3-stair-4-${TAG}`,         'stairwell', 2, 4);
  await shot(STAIR_OUT, `r3-stair-bottom-${TAG}`,    'stairwell', 2, 1.5);
  await shot(STAIR_OUT, `r3-stair-hug-west-${TAG}`,  'stairwell', 1, 12);

  // ── executive_floor: the regression the whole system exists for ──
  await ctx.pages()[0].setViewportSize({ width: 1400, height: 900 });
  await shot(OCC_OUT, `r3-exec-occluder-near-${TAG}`, 'executive_floor', 8, 10.2);
  await shot(OCC_OUT, `r3-exec-occluder-away-${TAG}`, 'executive_floor', 8, 5);

  // ── vault: eight lockbox banks, both walls ──
  await shot(OCC_OUT, `r3-vault-se-near-${TAG}`, 'vault', 6, 6);
  await shot(OCC_OUT, `r3-vault-se-away-${TAG}`, 'vault', 2, 2);

  await ctx.close();
  await browser.close();

  const j = path.join(STAIR_OUT, `r3-wall-render-${TAG}.json`);
  fs.writeFileSync(j, JSON.stringify(readout, null, 1));
  console.log('wrote', j);
})().catch(e => { console.error(e); process.exit(1); });
