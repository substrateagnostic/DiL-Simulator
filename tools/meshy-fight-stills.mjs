// Fight stills off the REAL arena, at the real combat camera.
//
// Boots the game's own ?dev fixture into a live fight and then fires the exact
// CombatScene entry points CombatState fires (playerBraceAnim, enemyHurtAnim,
// setExpression('defeated') for a Composure Break, setExpression('victory')),
// screenshotting a beat after each. This is a call-path verification, not a
// mock: if a clip is not wired to the beat the game actually uses, the still
// shows the stance instead.
//
//   node tools/meshy-fight-stills.mjs --fight=grandma
//   node tools/meshy-fight-stills.mjs --fight=karen --tag=karen
//
// Stills -> art/char_refs/meshy_pilot/_clips/fight_<tag>_<beat>.png
import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true];
}));
const FIGHT = args.fight || 'grandma';
const TAG = args.tag || FIGHT;
const REPO = process.cwd();
const OUT = join(REPO, 'art/char_refs/meshy_pilot/_clips');
mkdirSync(OUT, { recursive: true });

const preview = spawn(process.execPath, [join(REPO, 'node_modules/vite/bin/vite.js'), 'preview', '--port', '4319', '--strictPort'],
  { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('preview did not start')), 30000);
  preview.stdout.on('data', d => { if (String(d).includes('4319')) { clearTimeout(t); res(); } });
});

const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 810 } })).newPage();
page.on('console', m => { const t = m.text(); if (t.includes('[meshy]')) console.log('  console:', t.slice(0, 160)); });
await page.goto(`http://localhost:4319/?dev&fixture=act7&hud=0`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__explore, { timeout: 30000 });
await page.waitForTimeout(1200);
await page.evaluate(f => window.__explore._startCombat(f), FIGHT);
await page.waitForFunction(() => window.__combat?.scene?.enemyGroups?.length > 0, { timeout: 30000 });
await page.waitForTimeout(3500); // let the intro slide + banner clear

const shot = async (name) => {
  writeFileSync(join(OUT, `fight_${TAG}_${name}.png`), await page.screenshot());
  console.log(`still -> fight_${TAG}_${name}.png`);
};

const kind = await page.evaluate(() => {
  const c = window.__combat.scene;
  const sk = g => { let n = 0; g?.group?.traverse(o => { if (o.isSkinnedMesh) n++; }); return n; };
  return { enemy: sk(c.enemyGroups[0]) ? 'meshy' : 'procedural', ally: sk(c.allyGroups[0]) ? 'meshy' : 'procedural' };
});
console.log(`stage: enemy=${kind.enemy} ally=${kind.ally}`);

await page.waitForTimeout(4000); // let any opening cast clear back to the stance
await shot('stance');

// Andrew stands on the FRONT stage, outside the resting enemy framing, so the
// ally beats need the rig walked over to his mark. _basePos/_baseLook are the
// camera rig's anchors; the cinematic offsets always ease back to them.
const allyCam = async (on) => page.evaluate((v) => {
  const s = window.__combat.scene;
  if (v) { s._basePos.x = 1.55; s._basePos.y = 1.45; s._basePos.z = 5.1; s._baseLook.x = 1.60; s._baseLook.y = 1.00; s._baseLook.z = 2.62; }
  else { s._basePos.x = 0; s._basePos.y = 1.5; s._basePos.z = 5; s._baseLook.x = 0; s._baseLook.y = 0.95; s._baseLook.z = 0; }
}, on);

await allyCam(true);
await page.waitForTimeout(900);
await shot('ally_stance');
await page.evaluate(() => window.__combat.scene.playerBraceAnim(0, 'perfect'));
await page.waitForTimeout(800); await shot('brace');
await page.waitForTimeout(2600);
await allyCam(false);
await page.waitForTimeout(900);

await page.evaluate(() => window.__combat.scene.enemyHurtAnim(0));
await page.waitForTimeout(430); await shot('hurt');
await page.waitForTimeout(1600);

await page.evaluate(() => window.__combat.scene.enemyGroups[0].animator?.setExpression('defeated'));
await page.waitForTimeout(1400); await shot('break');
await page.waitForTimeout(2200);

await page.evaluate(() => window.__combat.scene.enemyAttackAnim(0));
await page.waitForTimeout(400); await shot('attack');
await page.waitForTimeout(1800);

await allyCam(true);
await page.waitForTimeout(800);
await page.evaluate(() => window.__combat.scene.allyGroups[0].animator?.setExpression('victory', 3.5));
await page.waitForTimeout(1300); await shot('victory');

await browser.close();
preview.kill();
process.exit(0);
