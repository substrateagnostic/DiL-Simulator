// GROUND-OFFSET A/B, on the real arena at the real combat camera.
//
// Boots the game's ?dev fixture into a live fight and shoots the same frame
// twice: once with the per-clip ground offset the shipping code applies, and
// once with it zeroed out on the same live objects. The two stills differ ONLY
// by the fix, so a framing question ("is his head cropped because of this
// change?") is answered by looking, not by arguing.
//
//   node tools/meshy-ground-ab.mjs --fight=ross_boss --tag=ross
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const FIGHT = args.fight || 'ross_boss';
const TAG = args.tag || FIGHT;
const REPO = process.cwd();
const OUT = join(REPO, 'art/char_refs/meshy_pilot/_review_v8');
mkdirSync(OUT, { recursive: true });

const preview = spawn(process.execPath, [join(REPO, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4321', '--strictPort'],
  { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('preview did not start')), 30000);
  preview.stdout.on('data', d => { if (String(d).includes('4321')) { clearTimeout(t); res(); } });
});

const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();
page.on('console', m => { const t = m.text(); if (t.includes('[meshy]')) console.log('  console:', t.slice(0, 200)); });
await page.goto('http://localhost:4321/?dev&fixture=act7&hud=0', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__explore, { timeout: 30000 });
await page.waitForTimeout(1200);
await page.evaluate(f => window.__explore._startCombat(f), FIGHT);
await page.waitForFunction(() => window.__combat?.scene?.enemyGroups?.length > 0, { timeout: 30000 });
await page.waitForTimeout(6000);

// Read the live ground state off the stage: the inner wrapper is the only child
// of the combatant group that carries the offset.
const probe = await page.evaluate(() => {
  const s = window.__combat.scene;
  const read = (g) => {
    let inner = null;
    g.group.children.forEach(c => { if (c.children.some(x => x.type === 'Group' || x.isObject3D) && c.scale.x !== 1) inner = c; });
    inner = inner || g.group.children.find(c => c.scale.x !== 1) || null;
    const box = new (window.__THREE?.Box3 || Object)();
    return {
      id: g.characterId,
      innerY: inner ? +inner.position.y.toFixed(4) : null,
      innerScale: inner ? +inner.scale.x.toFixed(4) : null,
      groupScale: +g.group.scale.x.toFixed(3),
    };
  };
  return { enemy: read(s.enemyGroups[0]), ally: read(s.allyGroups[0]) };
});
console.log('live ground state:', JSON.stringify(probe));

const shot = async (name) => {
  writeFileSync(join(OUT, `ab_${TAG}_${name}.png`), await page.screenshot());
  console.log(`still -> ab_${TAG}_${name}.png`);
};

await shot('grounded');

// Zero the offset on every combatant and freeze the animator's easing so it
// cannot creep back — this reproduces the pre-fix vertical placement exactly.
await page.evaluate(() => {
  const s = window.__combat.scene;
  for (const g of [...s.enemyGroups, ...s.allyGroups]) {
    const a = g.animator;
    if (a && a._groundNode) { a._groundOffsets = {}; a._groundTarget = 0; a._groundCur = 0; a._groundNode.position.y = 0; }
  }
});
await page.waitForTimeout(700);
await shot('hovering');

await browser.close();
preview.kill();
process.exit(0);
