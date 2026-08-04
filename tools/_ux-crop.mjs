// THROWAWAY evidence shooter for the UX fix lane (g-run, lane UX).
//
// 3x-scale crops of the two findings that are real but small at the shipping
// camera: Grandma embedded in the break-room tabletop (B2), and the two
// cubicle-farm north-wall props that look exactly like readable posters and are
// not (S1). Same camera as the full frames — only the pixel density and the
// crop rect change, so this is still the ISO CAMERA LAW read, magnified.
//
// Usage: node tools/_ux-crop.mjs --tag=before --port=5191
// HEADED per HANDOFF_PACKAGE §4.7.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const tag = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'before';
const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/g-run/ux';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 3 });

const park = async (x, z) => {
  await page.evaluate(([px, pz]) => {
    const ex = window.__explore;
    const tm = ex.roomManager?.currentRoom?.tileMap;
    ex.player.position.x = px;
    ex.player.position.z = pz;
    ex.player.mesh.position.set(px, tm?.heightAt ? tm.heightAt(px, pz) : 0, pz);
    ex.camera.snapTo(px, pz, ex.player.mesh.position.y);
  }, [x, z]);
  await page.waitForTimeout(900);
};

const boot = async (url) => {
  await page.goto(`http://localhost:${PORT}/${url}`);
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
  await page.waitForTimeout(1600);
};

try {
  // B2 — break-room table 2. Camera parked on the player at (9,9); table 2 sits
  // just up-frame of centre.
  await boot('?dev&fixture=act6&shot=break_room&hud=0');
  await park(9, 9);
  await page.screenshot({
    path: `${OUT}/crop-break-grandma-${tag}.png`,
    clip: { x: 760, y: 300, width: 380, height: 220 },
  });

  // S1 — cubicle-farm north wall, west prop at x 3.5 and east prop at x 14.5.
  await boot('?dev&fixture=act3&shot=cubicle_farm&hud=0');
  await park(3.5, 2.5);
  await page.screenshot({
    path: `${OUT}/crop-cf-poster-west-${tag}.png`,
    clip: { x: 620, y: 250, width: 420, height: 240 },
  });
  await park(14.5, 2.5);
  await page.screenshot({
    path: `${OUT}/crop-cf-poster-east-${tag}.png`,
    clip: { x: 620, y: 250, width: 420, height: 240 },
  });

  // B2 second case — Lucky's counter regular.
  await boot('?dev&fixture=act6&shot=luckys_diner&hud=0');
  await park(6, 4);
  await page.screenshot({
    path: `${OUT}/crop-diner-regular-${tag}.png`,
    clip: { x: 620, y: 250, width: 420, height: 260 },
  });

  console.log(`wrote 4 crops to ${OUT} with tag '${tag}'`);
} finally {
  await browser.close();
}
