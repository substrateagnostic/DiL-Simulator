// BODY-BOB in COMBAT — the path the v7 fix was originally written for, so the
// one that must not regress. Boots a real fight through the shipping fixture
// (?dev&fixture=act3&fight=karen), samples every direct child of every combat
// body for two seconds, and reports:
//
//   shearMm        differential travel between BODY children. 0 = one piece.
//   bodyTravelMm   how far the body moves (the breath, at combat bobScale 0.35)
//   decor          which children were classed as FLOOR-PINNED and skipped —
//                  CombatScene adds a bounce card and an AO contact ellipse as
//                  children of the character group, and a contact shadow that
//                  rides the body is what makes a settle read as hovering.
//
// NOTE ON WHAT THIS CAN SEE: the shipping combat cast is MESHY GLB driven by
// MeshyAnimator (MESHY_MODELS in src/combat/MeshyCast.js covers everyone except
// the Algorithm monolith and the procedural reception clients). On a Meshy
// body, `group.body/head/leftArm/...` are EMPTY STUB GROUPS and the real model
// hangs off a separate child whose y is owned by MeshyAnimator's ground offset
// — CharacterAnimator never touches it, so a shear number there is measuring
// the wrong animator. The animator class is printed per body for that reason.
// Use --fixture=act7 --fight=algorithm to exercise the CharacterAnimator path.
//
//   node tools/_bb-combat.mjs --tag=after  [--port=5311] [--fight=karen]
//   node tools/_bb-combat.mjs --tag=before [--port=5311] --legacy
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const arg = (k, d) => { const a = process.argv.find(s => s.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const PORT = arg('port', '5311');
const TAG = arg('tag', 'after');
const FIGHT = arg('fight', 'karen');
const FIXTURE = arg('fixture', 'act3');
const LEGACY = process.argv.includes('--legacy');
const WORK = path.join(os.tmpdir(), 'ti-bb-combat', TAG);
const FINAL = path.join('screenshots', 'bb', TAG);
fs.rmSync(WORK, { recursive: true, force: true });
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(FINAL, { recursive: true });

const LEGACY_PATCH = `(() => {
  const st = window.__explore.stateManager.stack;
  const cs = st.find(s => s.constructor.name === 'CombatState');
  const anim = cs && cs.scene && (cs.scene.enemyGroups || []).map(e => e.animator).find(Boolean);
  if (!anim) return 'no animator';
  const proto = Object.getPrototypeOf(anim);
  if (proto.__legacyBob) return 'already';
  proto.__legacyBob = true;
  proto._settleBody = function () {
    for (const n of this.group.children) {
      if (n.userData && n.userData.bobBaseY != null) n.position.y = n.userData.bobBaseY;
    }
    const dy = Math.sin(this.time * (this.isWalking ? 8 : 2)) * (this.isWalking ? 0.06 : 0.02) * this.bobScale;
    for (const n of [this.group.body, this.group.head, this.group.leftArm, this.group.rightArm]) {
      if (!n) continue;
      if (n.userData.bobBaseY == null) n.userData.bobBaseY = n.position.y;
      n.position.y = n.userData.bobBaseY + dy;
    }
  };
  return 'patched';
})()`;

const browser = await chromium.launch({ headless: false });
const page = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
page.on('pageerror', e => console.log('  ! pageerror', String(e).split('\n')[0]));
await page.goto(`http://localhost:${PORT}/?dev&fixture=${FIXTURE}&fight=${FIGHT}&qtier=high`);
await page.waitForFunction(() => window.__shotReady === true, { timeout: 45000 });
await page.waitForTimeout(2500);

const inFight = await page.evaluate(() => {
  const st = window.__explore.stateManager.stack;
  return st[st.length - 1]?.constructor.name;
});
console.log(`  top state: ${inFight}`);
if (LEGACY) console.log('  legacy bob:', await page.evaluate(LEGACY_PATCH));

// Collect the per-child y of every combat body, 40 samples over 2 s.
const SAMPLE = `(() => {
  const st = window.__explore.stateManager.stack;
  const cs = st.find(s => s.constructor.name === 'CombatState');
  if (!cs || !cs.scene) return null;
  const bodies = [];
  for (const key of ['enemyGroups', 'allyGroups']) {
    for (const e of (cs.scene[key] || [])) {
      const g = e.group;
      if (!g || !g.children) continue;
      bodies.push({
        who: key + ':' + (e.characterId || e.id || '?') + ':' + (e.animator ? e.animator.constructor.name : 'none'),
        rootY: g.position.y,
        kids: g.children.map((c, i) => ({
          label: c === g.body ? 'body' : c === g.head ? 'head'
            : c === g.leftArm ? 'leftArm' : c === g.rightArm ? 'rightArm'
            : c === g.leftLeg ? 'leftLeg' : c === g.rightLeg ? 'rightLeg'
            : (c.name || 'child' + i),
          decor: (c.userData && c.userData.blobShadow === true)
            || (c.isMesh && c.geometry && c.geometry.type === 'PlaneGeometry'
              && Math.abs(c.rotation.x + Math.PI / 2) < 0.01),
          y: c.position.y,
        })),
      });
    }
  }
  return bodies;
})()`;

const series = [];
for (let k = 0; k < 40; k++) {
  const s = await page.evaluate(SAMPLE);
  if (s) series.push(s);
  await page.waitForTimeout(50);
}
await page.screenshot({ path: path.join(WORK, `combat-${FIGHT}-${TAG}.png`) });
await browser.close();

if (!series.length) { console.log('  NO COMBAT BODIES SAMPLED'); process.exit(1); }
const out = {};
const nBodies = series[0].length;
let worstShear = 0;
for (let b = 0; b < nBodies; b++) {
  const who = series[0][b].who;
  const nKids = series[0][b].kids.length;
  const travel = [];
  for (let i = 0; i < nKids; i++) {
    const ys = series.map(s => s[b].kids[i].y);
    travel.push({ label: series[0][b].kids[i].label, decor: series[0][b].kids[i].decor,
      mm: +((Math.max(...ys) - Math.min(...ys)) * 1000).toFixed(2) });
  }
  const bodyT = travel.filter(t => !t.decor).map(t => t.mm);
  const shear = +(Math.max(...bodyT) - Math.min(...bodyT)).toFixed(2);
  worstShear = Math.max(worstShear, shear);
  out[who] = { shearMm: shear, bodyTravelMm: Math.max(...bodyT),
    decor: travel.filter(t => t.decor).map(t => `${t.label} ${t.mm}mm`), travel };
  console.log(`  ${who.padEnd(22)} SHEAR=${String(shear).padStart(6)}mm  bodyTravel=${String(Math.max(...bodyT)).padStart(6)}mm  decor=[${travel.filter(t => t.decor).map(t => t.label + ' ' + t.mm + 'mm').join(', ')}]`);
}
fs.writeFileSync(path.join(FINAL, `_combat-${FIGHT}-${TAG}.json`), JSON.stringify(out, null, 2));
fs.copyFileSync(path.join(WORK, `combat-${FIGHT}-${TAG}.png`), path.join(FINAL, `combat-${FIGHT}-${TAG}.png`));
console.log(`\nworst shear across all combat bodies: ${worstShear} mm`);
