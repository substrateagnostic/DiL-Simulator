// HANDOFF MEASUREMENT for the lighting/level lane — the Board Room going dark.
//
// The round-2 attribution ("elapsed time") did not survive contact: the
// producer idled 95 s in the same room with the same flags and it stayed lit.
// This runs the producer's exact repro (load, touch nothing, sample at 2 s /
// 47 s / 102 s) in TWO populations, because the round-3 A/B pair pointed at the
// cast rather than the clock: the PRE-FIX board-meeting take, which ends with
// all 18 bodies hidden, is FULLY LIT at `settled`, while the fixed take, which
// ends with all 18 still seated, is dark in the same frame.
//
//   node tools/_g-board-dark.mjs --port=5177 --out=screenshots/g-run/board/dark
//
// Reports mean floor luminance in a fixed centre crop plus the light rig, so
// the lighting lane gets a number and a plate, not an adjective.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const arg = (k, d) => {
  const hit = process.argv.find(a => a.startsWith(`--${k}=`));
  return hit ? hit.split('=').slice(1).join('=') : d;
};
const PORT = arg('port', '5177');
const OUT = path.resolve(arg('out', 'screenshots/g-run/board/dark'));
const MARKS = (arg('marks', '2,47,102')).split(',').map(Number);
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });

const BASE = ['act5_complete', 'board_room_accessible', 'branch_chosen'];
const CAST = ['skip_speech_ready', 'janet_act6_rallied', 'diane_act6_rallied',
  'intern_act6_rallied', 'isaiah_evidence', 'grandma_ally'];

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--use-gl=angle', '--enable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const rows = [];

  for (const pop of [{ name: 'cast-present', set: [...BASE, ...CAST] }, { name: 'cast-absent', set: BASE }]) {
    await page.goto(`http://localhost:${PORT}/?dev&fixture=act6&hud=0`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
    await page.evaluate(({ set, clear }) => {
      const ex = window.__explore;
      for (const f of clear) ex.player.flags[f] = false;
      for (const f of set) ex.player.flags[f] = true;
      ex._syncActFromFlags();
      ex._refreshStoryProgress(true);
      ex._loadRoom('board_room', 8, 9);
      ex.player.currentRoom = 'board_room';
    }, { set: pop.set, clear: ['board_meeting_held', 'board_meeting_closed', 'act6_complete', 'has_rolex', ...(pop.name === 'cast-absent' ? CAST : [])] });

    let elapsed = 0;
    for (const m of MARKS) {
      await sleep(Math.max(0, m * 1000 - elapsed));
      elapsed = m * 1000;
      const f = path.join(OUT, `${pop.name}-${String(m).padStart(3, '0')}s.png`);
      await page.screenshot({ path: f });
      const probe = await page.evaluate(async () => {
        // DO NOT `import('/src/core/Engine.js')` here. Vite serves the running
        // app's copy with an HMR cache-buster (`?t=<ms>`) the moment anything in
        // the tree has been edited this session, so a bare-specifier import
        // instantiates a SECOND, uninitialised Engine — `scene` and `renderer`
        // both null. Reach the live singleton through the object graph instead.
        const ex = window.__explore;
        let scene = ex.player.mesh;
        while (scene.parent) scene = scene.parent;
        const lights = [];
        scene.traverse(o => { if (o.isLight) lights.push({ type: o.type, i: +o.intensity.toFixed(3), v: o.visible }); });
        const backdrop = [];
        scene.traverse(o => { if (/backdrop|city|shell/i.test(o.name || '')) backdrop.push({ n: o.name, v: o.visible }); });
        let casters = 0, meshes = 0;
        scene.traverse(o => { if (o.isMesh && o.visible) { meshes++; if (o.castShadow) casters++; } });
        return {
          lights, backdrop: backdrop.slice(0, 6), meshes,
          isScene: !!scene.isScene,
          visibleNPCs: ex.roomManager.entityManager.npcs.filter(n => n.visible).length,
          shadowCasters: casters,
        };
      });
      // Mean luminance of a fixed centre crop, read off the rendered pixels.
      const lum = await page.evaluate(async () => {
        const c = document.querySelector('canvas');
        const g = document.createElement('canvas'); g.width = 240; g.height = 120;
        const x = g.getContext('2d');
        x.drawImage(c, c.width / 2 - 120, c.height / 2 - 60, 240, 120, 0, 0, 240, 120);
        const d = x.getImageData(0, 0, 240, 120).data;
        let s = 0;
        for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        return +(s / (d.length / 4)).toFixed(2);
      });
      rows.push({ pop: pop.name, t: m, lum, ...probe });
      console.log(`${pop.name.padEnd(13)} t=${String(m).padStart(3)}s  meanLum=${String(lum).padStart(6)}  ` +
        `npcs=${probe.visibleNPCs} shadowCasters=${probe.shadowCasters} exposure=${probe.exposure} ` +
        `lights=${probe.lights.map(l => `${l.type}:${l.i}${l.v ? '' : '(off)'}`).join(',')}`);
    }
  }

  fs.writeFileSync(path.join(OUT, 'dark.json'), JSON.stringify(rows, null, 1));
  await ctx.close();
  await browser.close();
  console.log('wrote', OUT);
})().catch(e => { console.error(e); process.exit(1); });
