// THROWAWAY evidence shooter for the UX fix lane (g-run, lane UX).
//
// Frames the four world-side seeds at the SHIPPING isometric camera (ISO CAMERA
// LAW) so the before/after pair is judged at the camera the player uses:
//   stair-top     top of the stairwell, looking down the flight
//   stair-mid     halfway down, mid landing in frame
//   stair-bottom  bottom landing at the archive door
//   stair-entry   the frame 250 ms after entering from the Archive (spawn pop)
//   break-grandma break room at Act 5, Grandma at table 2
//   cf-northwall  cubicle-farm north wall, the two dead poster props
//   diner         Lucky's counter regular
//
// Usage: node tools/_ux-shots.mjs --tag=before --port=5191
// HEADED per HANDOFF_PACKAGE §4.7.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const tag = process.argv.find(a => a.startsWith('--tag='))?.slice(6) || 'before';
const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5173';
const OUT = 'screenshots/g-run/ux';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });

// Park the player at a tile and let the shipping camera settle on him.
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
  // ── Stairwell, three stations down the flight ──────────────────────────
  await boot('?dev&fixture=act5&shot=stairwell&hud=0');
  await park(2, 17.5); await page.screenshot({ path: `${OUT}/shot-stair-top-${tag}.png` });
  await park(2, 10);   await page.screenshot({ path: `${OUT}/shot-stair-mid-${tag}.png` });
  await park(2, 1.5);  await page.screenshot({ path: `${OUT}/shot-stair-bottom-${tag}.png` });

  // ── Stairwell ENTRY from the Archive — the spawn-height frame ──────────
  await boot('?dev&fixture=act5&shot=archive&hud=0');
  await page.evaluate(() => window.__explore._changeRoom('stairwell', 1, 2));
  await page.waitForTimeout(2100);   // mid fade-in, before move() can correct
  await page.screenshot({ path: `${OUT}/shot-stair-entry-${tag}.png` });

  // ── Break room — Grandma at table 2. Her room entry is gated on
  //    `act5_complete`, which the act5 preset does NOT set (it ENDS at
  //    act4_complete), so this must boot from act6 or she is not in the room.
  await boot('?dev&fixture=act6&shot=break_room&hud=0');
  await park(9, 9);
  await page.screenshot({ path: `${OUT}/shot-break-grandma-${tag}.png` });

  // ── Cubicle farm north wall — the two identical-looking dead props ─────
  await boot('?dev&fixture=act3&shot=cubicle_farm&hud=0');
  await park(3.5, 2);
  await page.screenshot({ path: `${OUT}/shot-cf-northwall-west-${tag}.png` });
  await park(14.5, 2);
  await page.screenshot({ path: `${OUT}/shot-cf-northwall-east-${tag}.png` });

  // ── Lucky's — the counter regular ──────────────────────────────────────
  await boot('?dev&fixture=act6&shot=luckys_diner&hud=0');
  await park(6, 4);
  await page.screenshot({ path: `${OUT}/shot-diner-regular-${tag}.png` });

  console.log(`wrote 8 shots to ${OUT} with tag '${tag}'`);
} finally {
  await browser.close();
}
