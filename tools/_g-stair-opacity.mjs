// STAIRWELL HANDRAIL OPACITY READ — the numeric half of the walk-behind fix.
//
// Shape-compatible with the producer's baseline `screenshots/tiebreak/tb-stair.json`
// so the two diff line-for-line, with three fields added because the fix changes
// WHICH render path the rails are on:
//
//   registeredEast/registeredSouth — is the prop under fade control at all?
//     (post-fix this must be 0: `Room._registerWallProp` refuses a room whose
//      fade trigger covers the whole reachable floor.)
//   meshes  — meshes still owned by the rail group. 0 means `_mergeStatics`
//     batched it, which is the OPAQUE path and where the west pair already was.
//   vertexOpacity — the honest read once a group is merged: walk every mesh in
//     the room, transform its vertices to world space, and collect the material
//     opacity of any mesh that actually puts vertices inside the rail's own
//     bounding box. This survives batching; `group.children[].material` does not.
//
//   node tools/_g-stair-opacity.mjs --port=5177 --out=screenshots/g-run/ux/stair-opacity-AFTER.json
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
const OUT = path.resolve(arg('out', 'screenshots/g-run/ux/stair-opacity.json'));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// The producer's five stations, plus his far-west clamp control.
const STATIONS = [
  { label: 'top', x: 2, z: 17.5 },
  { label: 'mid', x: 2, z: 12 },
  { label: 'mid-lower', x: 2, z: 10 },
  { label: 'bottom', x: 2, z: 1.5 },
  { label: 'hug-west', x: 1, z: 12 },
  { label: 'far-west-clamp', x: 0.45, z: 12 },
];

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--use-gl=angle', '--enable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 600 } });
  const page = await ctx.newPage();
  if (process.argv.includes('--guardoff')) await page.addInitScript('window.__wallGuardOff = true;');
  await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&hud=0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__shotReady === true, { timeout: 60000 });

  const spots = [];
  for (const st of STATIONS) {
    await page.evaluate(({ x, z }) => {
      const ex = window.__explore;
      ex._loadRoom('stairwell', x, z);
      ex.player.setPosition(x, z, ex.roomManager.currentRoom.getTileMap());
    }, st);
    // Let _updateWallFade converge (blend = min(1, dt*7), so ~10 frames).
    await sleep(700);
    const r = await page.evaluate(async ({ x, z, label }) => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { Furniture } = await import('/src/world/Furniture.js');
      const ex = window.__explore;
      const room = ex.roomManager.currentRoom;
      const data = room.data;

      // Local box of one 6-step rail, straight off the shipping factory.
      const proto = Furniture.stairRail(6);
      const local = new THREE.Box3().setFromObject(proto);

      // Every mesh in the room, with world-space vertices, once.
      const meshes = [];
      room.scene.traverse((c) => {
        if (!c.isMesh || !c.visible || !c.geometry?.attributes?.position) return;
        c.updateWorldMatrix(true, false);
        meshes.push({ mesh: c, pos: c.geometry.attributes.position, m: c.matrixWorld });
      });

      const v = new THREE.Vector3();
      const railRows = (data.furniture || [])
        .filter(f => f.type === 'stairRail')
        .map((f) => {
          const box = new THREE.Box3(
            new THREE.Vector3(local.min.x + f.x, local.min.y + (f.y || 0), local.min.z + f.z),
            new THREE.Vector3(local.max.x + f.x, local.max.y + (f.y || 0), local.max.z + f.z),
          ).expandByScalar(0.02);
          const group = room.scene.children.find(c => c.userData?.furnitureType === 'stairRail'
            && Math.abs(c.position.x - f.x) < 1e-6 && Math.abs(c.position.z - f.z) < 1e-6);
          const ownMeshes = [];
          group?.traverse(c => { if (c.isMesh) ownMeshes.push(c); });
          // Vertex-level read: which drawn meshes actually occupy this rail's box?
          const hits = new Map();
          for (const { mesh, pos, m } of meshes) {
            let n = 0;
            for (let i = 0; i < pos.count; i++) {
              v.fromBufferAttribute(pos, i).applyMatrix4(m);
              if (box.containsPoint(v)) { n++; if (n > 4) break; }
            }
            if (n > 4) {
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              for (const mt of mats) hits.set(mt.uuid, { opacity: +mt.opacity.toFixed(3), transparent: !!mt.transparent, name: mesh.name || '(batch)' });
            }
          }
          return {
            x: f.x, z: f.z,
            meshes: ownMeshes.length,
            opacities: ownMeshes.map(m2 => +m2.material.opacity.toFixed(3)),
            vertexOpacity: [...hits.values()],
          };
        });

      const opac = (list) => list.map(o => +o.material.opacity.toFixed(3));
      return {
        roomId: data.id, width: data.width, height: data.height,
        playerX: +ex.player.position.x.toFixed(2), playerZ: +ex.player.position.z.toFixed(2),
        wallPropTypes: (room._wallPropTypes || []).slice(),
        registeredEast: room.getEastWallProps().length,
        registeredSouth: room.getSouthWallProps().length,
        eastOpacities: opac(room.getEastWallProps()),
        southOpacities: opac(room.getSouthWallProps()),
        eastWallOpacity: room.getEastWallMeshes().map(m => +m.material.opacity.toFixed(3)),
        rails: railRows,
        label,
      };
    }, st);
    spots.push(r);
  }

  await ctx.close();
  await browser.close();

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ spots }, null, 1));
  console.log('wrote', OUT);

  let bad = 0;
  for (const s of spots) {
    const ops = s.rails.flatMap(r => r.vertexOpacity.map(o => o.opacity));
    const min = ops.length ? Math.min(...ops) : NaN;
    const ok = s.rails.length === 4 && ops.length > 0 && min >= 0.999;
    if (!ok && s.label !== 'far-west-clamp') bad++;
    console.log(`${s.label.padEnd(15)} claims=[${s.wallPropTypes.join(' ')}] eastProps=${s.registeredEast} ` +
      `rails=${s.rails.length} ownMeshes=[${s.rails.map(r => r.meshes).join(',')}] ` +
      `railOpacity=[${ops.join(',')}] min=${ops.length ? min : 'n/a'} ${ok ? 'OK' : 'FAIL'}`);
  }
  console.log(bad ? `FAIL: ${bad} station(s) with a rail below 1.0` : 'PASS: all four rails read 1.0 at every station');
  if (bad) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
