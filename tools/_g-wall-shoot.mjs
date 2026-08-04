// Parked-camera detail stills through the shipping path. The camera is moved
// the only way the game moves it — by putting Andrew where you want to look —
// and the ortho frustum is tightened so a wall or a tableau is legible.
//
//   node tools/_g-wall-shoot.mjs --port=5177 --out=screenshots/g-run/cutscenes/posters \
//        --shots=executive_floor@13,6@3.4@exec-east-wall;board_room@13,9@3.4@board-east-wall
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
const OUT = path.resolve(arg('out', 'screenshots/g-run/cutscenes/stills'));
const FIXTURE = arg('fixture', 'act7');
const SHOTS = arg('shots', '').split(';').filter(Boolean).map(s => {
  const [room, at, zoom, name] = s.split('@');
  const [x, z] = at.split(',').map(Number);
  return { room, x, z, zoom: Number(zoom), name };
});
const FLAGS = arg('set', '').split(',').filter(Boolean);
const CLEAR = arg('clear', '').split(',').filter(Boolean);

fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--use-gl=angle', '--enable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}/?dev&fixture=${FIXTURE}&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 40000 });

  await page.evaluate(async ({ set, clear }) => {
    const ex = window.__explore;
    for (const f of clear) ex.player.flags[f] = false;
    for (const f of set) ex.player.flags[f] = true;
    ex._syncActFromFlags();
    ex._refreshStoryProgress(true);
    const { Engine } = await import('/src/core/Engine.js');
    window.__zoomLoop = (z) => {
      const apply = () => {
        // Engine.camera is briefly null across a room build.
        const cam = Engine.camera;
        if (cam) {
          const a = Engine.width / Engine.height;
          cam.left = -z * a; cam.right = z * a; cam.top = z; cam.bottom = -z;
          cam.updateProjectionMatrix();
        }
        window.__zr = requestAnimationFrame(apply);
      };
      cancelAnimationFrame(window.__zr);
      apply();
    };
  }, { set: FLAGS, clear: CLEAR });

  for (const s of SHOTS) {
    await page.evaluate(({ room, x, z, zoom }) => {
      const ex = window.__explore;
      ex._loadRoom(room, x, z);
      ex._updateLocationDisplay(room);
      ex.camera.snapTo(x, z, 0);
      window.__zoomLoop(zoom);
    }, s);
    await sleep(1500);
    const f = path.join(OUT, `${s.name}.png`);
    await page.screenshot({ path: f });
    console.log('wrote', f);
  }

  await ctx.close();
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
