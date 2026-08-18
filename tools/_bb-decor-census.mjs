// GROUND-DECOR CENSUS. `CharacterAnimator.isGroundDecor` excludes a child from
// the whole-body settle by a GEOMETRIC test (a flat plane lying in the floor).
// That test must catch exactly the floor-pinned props and never a body part.
// This builds EVERY character in the cast and lists every child it would skip.
// PASS = the only skipped child on any build is the contact shadow.
//
//   node tools/_bb-decor-census.mjs [--port=5311]
import { chromium } from 'playwright';
const PORT = process.argv.find(a => a.startsWith('--port='))?.slice(7) || '5311';
const b = await chromium.launch({ headless: false });
const p = await (await b.newContext({ viewport: { width: 900, height: 900 } })).newPage();
p.on('pageerror', e => console.log('  ! pageerror', String(e).split('\n')[0]));
await p.goto(`http://localhost:${PORT}/?dev`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);
const rows = await p.evaluate(async () => {
  const { buildCharacter } = await import('/src/entities/CharacterBuilder.js');
  const { CHARACTER_CONFIGS } = await import('/src/data/characters.js');
  const isDecor = (o) => (o.userData && o.userData.blobShadow === true)
    || (o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry'
      && Math.abs(o.rotation.x + Math.PI / 2) < 0.01);
  const out = [];
  for (const [id, cfg] of Object.entries(CHARACTER_CONFIGS)) {
    for (const detailed of [false, true]) {
      const g = buildCharacter(cfg, { detailed });
      const skipped = g.children.filter(isDecor).map(c => (c.userData && c.userData.blobShadow) ? 'blobShadow'
        : `${c.type}/${c.geometry ? c.geometry.type : '-'}@y${c.position.y.toFixed(3)}`);
      out.push({ id, detailed, kids: g.children.length, skipped });
    }
  }
  return out;
});
await b.close();
let bad = 0;
for (const r of rows) {
  const odd = r.skipped.filter(s => s !== 'blobShadow');
  if (odd.length) { bad++; console.log(`  BAD  ${r.id} detailed=${r.detailed} skipped ${JSON.stringify(odd)}`); }
}
const noShadow = rows.filter(r => !r.skipped.includes('blobShadow'));
console.log(`  ${rows.length} builds (${new Set(rows.map(r => r.id)).size} characters x 2 tiers)`);
console.log(`  builds with NO contact shadow: ${noShadow.length}${noShadow.length ? ' — ' + noShadow.map(r => r.id + '/' + r.detailed).join(', ') : ''}`);
console.log(bad === 0 ? '\nPASS — the only child ever skipped is the contact shadow' : `\nFAIL — ${bad} build(s) skip a non-shadow child`);
process.exit(bad === 0 ? 0 : 1);
