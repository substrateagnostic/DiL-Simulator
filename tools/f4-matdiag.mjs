// F4 diagnostic: why does the static merge only catch 10% of the meshes?
// Prints, for one room: mesh count, distinct material instances, the size of
// each identity bucket, and the same grouped by a VALUE signature (type +
// colour + the maps + the flags) so we can see how much sharing the
// MaterialLibrary cache is actually delivering vs how much is inline `new
// THREE.Mesh*Material` per factory call.
import { chromium } from 'playwright';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOMS = arg('rooms', 'cubicle_farm,parking_garage').split(',');

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1300,900', '--force-device-scale-factor=1',
    '--disable-features=CalculateNativeWinOcclusion', '--ignore-gpu-blocklist', '--force_high_performance_gpu'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(`${BASE}/?dev&fixture=act7&shot=${ROOMS[0]}&hud=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
await page.waitForTimeout(2000);

for (const room of ROOMS) {
  await page.evaluate((r) => window.__explore._loadRoom(r), room);
  await page.waitForTimeout(1200);
  const res = await page.evaluate(() => {
    const g = window.__explore.roomManager.roomGroup;
    const SLOTS = ['map', 'normalMap', 'roughnessMap', 'alphaMap', 'emissiveMap', 'gradientMap'];
    const ident = new Map(), value = new Map();
    let meshes = 0, transparent = 0, matArray = 0, noPos = 0, grouped = 0;
    const attrSets = new Map();
    g.traverse((c) => {
      if (!c.isMesh) return;
      meshes++;
      const m = c.material;
      if (Array.isArray(m)) { matArray++; return; }
      if (!m) return;
      if (m.transparent || m.depthWrite === false) { transparent++; return; }
      const geo = c.geometry;
      if (!geo?.attributes.position) { noPos++; return; }
      if (geo.groups && geo.groups.length > 1) { grouped++; return; }
      const attrs = Object.keys(geo.attributes).sort().join(',') + (geo.index ? '|i' : '|n');
      attrSets.set(attrs, (attrSets.get(attrs) || 0) + 1);
      ident.set(m.uuid, (ident.get(m.uuid) || 0) + 1);
      const sig = [m.type, m.color?.getHexString(), m.roughness, m.metalness, m.opacity,
        m.side, m.flatShading, m.emissive?.getHexString(), m.emissiveIntensity,
        ...SLOTS.map(s => m[s]?.uuid || '-'),
        c.castShadow ? 1 : 0, c.receiveShadow ? 1 : 0, c.renderOrder | 0, attrs].join('~');
      value.set(sig, (value.get(sig) || 0) + 1);
    });
    const hist = (m) => {
      const sizes = [...m.values()].sort((a, b) => b - a);
      return { buckets: sizes.length, top: sizes.slice(0, 8),
        mergeable: sizes.filter(n => n > 1).reduce((a, b) => a + b, 0),
        singletons: sizes.filter(n => n === 1).length };
    };
    return { meshes, transparent, matArray, noPos, grouped,
      attrSets: [...attrSets.entries()].sort((a, b) => b[1] - a[1]),
      byIdentity: hist(ident), byValue: hist(value) };
  });
  console.log(`\n=== ${room}`);
  console.log(`  meshes ${res.meshes} · excluded: transparent ${res.transparent}, matArray ${res.matArray}, multi-group ${res.grouped}, no-pos ${res.noPos}`);
  console.log(`  attribute signatures:`, res.attrSets);
  console.log(`  by material IDENTITY: ${JSON.stringify(res.byIdentity)}`);
  console.log(`  by material VALUE:    ${JSON.stringify(res.byValue)}`);
}
await browser.close();
