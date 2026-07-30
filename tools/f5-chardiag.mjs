// F5 diagnostic: where do a v5 character's draw calls actually go?
// Prints, per animated node, the number of meshes and why they did not bucket.
//   node tools/f5-chardiag.mjs [--room=cubicle_farm]
import { chromium } from 'playwright';

const BASE = process.env.SHOOT_BASE || 'http://localhost:5173';
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const ROOM = arg('room', 'cubicle_farm');

const browser = await chromium.launch({
  headless: false,
  args: ['--window-position=-2400,0', '--window-size=1940,1180', '--force-device-scale-factor=1',
    '--disable-features=CalculateNativeWinOcclusion', '--ignore-gpu-blocklist'],
});
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto(`${BASE}/?dev&fixture=act7&shot=${ROOM}&hud=0`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
await page.waitForTimeout(2200);

const info = await page.evaluate(() => {
  const E = window.__engine;
  const chars = E.scene.children.filter((c) => c.isGroup && (c.head || c.body || c.leftLeg));
  const describe = (m) => {
    const maps = [];
    for (const k of Object.keys(m)) if (m[k] && m[k].isTexture) maps.push(k);
    return {
      type: m.type, color: m.color?.getHexString(), maps,
      rough: m.roughness, metal: m.metalness, clear: m.clearcoat,
      transparent: m.transparent, vc: m.vertexColors,
      shared: !!m.userData?.batchShared, uuid: m.uuid.slice(0, 8),
    };
  };
  const out = [];
  for (const c of chars.slice(0, 3)) {
    const nodes = [];
    // Walk to depth 2: the animated nodes are direct children of the character
    // group (head/body/limbs), accessories hang off them.
    const visit = (n, label) => {
      const meshes = [];
      n.traverse((o) => { if (o.isMesh) meshes.push(o); });
      const bySig = new Map();
      for (const o of meshes) {
        const d = describe(o.material);
        const sig = [d.type, d.maps.join('+'), d.rough, d.metal, d.clear, d.transparent, d.vc].join('|');
        const e = bySig.get(sig) || { sig, n: 0, colors: new Set(), mats: new Set(), shared: d.shared };
        e.n++; e.colors.add(d.color); e.mats.add(d.uuid);
        bySig.set(sig, e);
      }
      nodes.push({
        label, meshes: meshes.length,
        groups: [...bySig.values()].map((e) => ({ sig: e.sig, meshes: e.n, distinctColors: e.colors.size, distinctMats: e.mats.size, shared: e.shared })),
      });
    };
    for (const child of c.children) visit(child, child.name || child.type);
    let total = 0; c.traverse((o) => { if (o.isMesh) total++; });
    out.push({ name: c.name, meshes: total, nodes });
  }
  return out;
});

for (const c of info) {
  console.log(`\n### ${c.name} — ${c.meshes} meshes`);
  for (const n of c.nodes) {
    console.log(`  ${n.label}: ${n.meshes} meshes -> ${n.groups.length} sig group(s)`);
    for (const g of n.groups) {
      console.log(`      x${g.meshes} mats=${g.distinctMats} colors=${g.distinctColors} shared=${g.shared}  ${g.sig}`);
    }
  }
}
await browser.close();
