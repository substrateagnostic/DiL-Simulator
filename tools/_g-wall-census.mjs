// WALL-PROP CENSUS — A GATE, NOT A REPORT.
//
// `Room._registerWallProp()` opts a prop into the south/east walk-behind fade.
// The fade is a CONDITIONAL affordance: the prop is meant to be solid where the
// player normally stands and ghost only while he is behind it. If the fade's
// trigger band covers every position the player can occupy in that room, the
// prop is not fading — it is deleted. That is exactly what happened to the
// stairwell handrails (`stairwell` is 4 wide; the east trigger is
// `px > width - 3.5` = 0.5, and `Player.move` clamps x to [0.4, w-1.4] = [0.4,
// 2.6], so the rails were transparent at every reachable position).
//
// The previous version of this census PRINTED `stairRail@3.3,16` and nobody
// read it. A census that only prints is a census that gets skimmed, so this one
// EXITS 1.
//
// THE INVARIANT:
//   For every registered wall prop, there must exist at least one reachable
//   player position in that room where the prop's target opacity is 1.0.
//
//   usage: node tools/_g-wall-census.mjs --port=5177 [--json=out.json]
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
const JSON_OUT = arg('json', '');
const FIXTURE = arg('fixture', 'act7');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--use-gl=angle', '--enable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
  const page = await ctx.newPage();
  // --guardoff reproduces the PRE-FIX registration (both guards bypassed) so the
  // gate can be shown to fail on the defect it exists to catch. Never ship a run
  // with it on.
  if (process.argv.includes('--guardoff')) await page.addInitScript('window.__wallGuardOff = true;');
  await page.goto(`http://localhost:${PORT}/?dev&fixture=${FIXTURE}&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });

  const ids = await page.evaluate(async () => {
    const m = await import('/src/data/rooms/index.js');
    return m.ROOM_IDS;
  });

  const rows = [];
  for (const id of ids) {
    await page.evaluate((rid) => { window.__explore._loadRoom(rid); }, id);
    await sleep(140);
    const r = await page.evaluate(async () => {
      const ex = window.__explore;
      const room = ex.roomManager.currentRoom;
      if (!room || !room.data) return null;
      // Read the SHIPPING constants, never re-type them here — a gate with its
      // own copy of the threshold is a gate that passes after the code drifts.
      const { WALL_FADE_INSET, MIN_SOLID_SPAN } = await import('/src/world/Room.js');
      const { PLAYER } = await import('/src/utils/constants.js');
      const w = room.data.width, h = room.data.height;
      const eastBand = w - WALL_FADE_INSET;
      const southBand = h - WALL_FADE_INSET;
      const minX = PLAYER.EDGE_CLAMP, maxX = w - PLAYER.EDGE_CLAMP_FAR;
      const minZ = PLAYER.EDGE_CLAMP, maxZ = h - PLAYER.EDGE_CLAMP_FAR;
      // Sample the reachable band in 0.1-tile steps and ask, for each axis,
      // whether ANY sample sits outside the fade trigger.
      const solidXs = [];
      for (let x = minX; x <= maxX + 1e-9; x += 0.1) if (!(x > eastBand)) solidXs.push(+x.toFixed(2));
      const solidZs = [];
      for (let z = minZ; z <= maxZ + 1e-9; z += 0.1) if (!(z > southBand)) solidZs.push(+z.toFixed(2));
      return {
        id: room.data.id, w, h, minSolidSpan: MIN_SOLID_SPAN,
        eastBand: +eastBand.toFixed(2), southBand: +southBand.toFixed(2),
        minX: +minX.toFixed(2), maxX: +maxX.toFixed(2), minZ: +minZ.toFixed(2), maxZ: +maxZ.toFixed(2),
        claims: (room._wallPropTypes || []).slice(),
        eastMats: (room.getEastWallProps() || []).length,
        southMats: (room.getSouthWallProps() || []).length,
        // widest reachable run where the prop is solid, in tiles
        eastSolidSpan: solidXs.length ? +((solidXs[solidXs.length - 1] - solidXs[0]) + 0.1).toFixed(2) : 0,
        southSolidSpan: solidZs.length ? +((solidZs[solidZs.length - 1] - solidZs[0]) + 0.1).toFixed(2) : 0,
        eastSolidAt: solidXs.length ? solidXs[solidXs.length - 1] : null,
        southSolidAt: solidZs.length ? solidZs[solidZs.length - 1] : null,
      };
    });
    if (r) rows.push(r);
  }

  await ctx.close();
  await browser.close();

  const withProps = rows.filter(r => r.claims.length);
  const totalProps = withProps.reduce((a, r) => a + r.claims.length, 0);

  console.log('=== WALL-PROP CENSUS ===');
  const faults = [];
  for (const r of withProps) {
    // Which axis is each claim on? Re-derive from the same predicate Room uses.
    const east = r.claims.filter(c => {
      const [, at] = c.split('@'); const [x] = at.split(',').map(Number); return x >= r.w - 1.4;
    });
    const south = r.claims.filter(c => {
      const [, at] = c.split('@'); const [, z] = at.split(',').map(Number); return z >= r.h - 1.4;
    });
    console.log(`  ${r.id.padEnd(22)} ${r.w}x${r.h}  props=${String(r.claims.length).padStart(2)}  ` +
      `eastBand=${r.eastBand} solidSpan=${r.eastSolidSpan}t | southBand=${r.southBand} solidSpan=${r.southSolidSpan}t`);
    for (const c of r.claims) console.log(`      - ${c}`);
    // FAIL, don't report. A registered prop must stand solid over at least
    // MIN_SOLID_SPAN tiles of reachable floor. A bare "> 0" would pass the
    // stairwell — its solid band is the 0.1-tile sliver between the player's
    // hard clamp (0.4) and the fade trigger (0.5), i.e. pressed into the
    // opposite wall, which is not a position anyone plays from.
    if (east.length && r.eastSolidSpan < r.minSolidSpan) {
      faults.push({ room: r.id, axis: 'east', props: east, band: r.eastBand, reach: [r.minX, r.maxX], span: r.eastSolidSpan });
    }
    if (south.length && r.southSolidSpan < r.minSolidSpan) {
      faults.push({ room: r.id, axis: 'south', props: south, band: r.southBand, reach: [r.minZ, r.maxZ], span: r.southSolidSpan });
    }
  }
  console.log(`TOTAL: ${totalProps} props / ${withProps.length} rooms (of ${rows.length} scanned)`);

  if (JSON_OUT) {
    fs.mkdirSync(path.dirname(path.resolve(JSON_OUT)), { recursive: true });
    fs.writeFileSync(path.resolve(JSON_OUT), JSON.stringify({ totalProps, rooms: withProps.length, rows: withProps, faults }, null, 1));
    console.log('wrote', path.resolve(JSON_OUT));
  }

  if (faults.length) {
    console.log('\n=== FAIL: prop registered with NO reachable solid position ===');
    for (const f of faults) {
      console.log(`  room ${f.room} / ${f.axis} wall: trigger band starts at ${f.band}, ` +
        `player reach is [${f.reach[0]}, ${f.reach[1]}] -> solid over only ${f.span} tiles`);
      for (const p of f.props) console.log(`      ${p}`);
    }
    console.log(`FAULTS: ${faults.length}`);
    process.exit(1);
  }
  console.log('FAULTS: 0');
})().catch(e => { console.error(e); process.exit(1); });
