// IDLE CURVE — arm spread of a character's SHIPPING idle clip vs clip time.
// Steps the exact clip the fight plays (retarget + posture clamp, through
// MeshyClips.clipsFor) with a real mixer via setTime, on the character's own
// cloned rig. Answers: does the stance OPEN near bind pose?
//   node tools/_h2-idle-curve.mjs --port=5199 --char=karen
import { chromium } from 'playwright';

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '5199');
const CHAR = arg('char', 'karen');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
page.on('pageerror', e => console.log('! pageerror', String(e).split('\n')[0]));
await page.goto(`http://localhost:${PORT}/?dev&fixture=act1&qtier=high`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__explore && !!window.__explore.player, { timeout: 60000 });
await page.waitForTimeout(1200);
await page.evaluate((ch) => {
  const ex = window.__explore;
  ex.player.flags.retry_karen = true; ex.player.flags.karen_retry_ready = true;
  ex._startCombat(ch === 'karen' ? 'karen' : ch);
}, CHAR);
await page.waitForFunction(() => !!window.__combat, { timeout: 30000 });
await page.waitForFunction(() => window.__combat.scene.enemyGroups[0].group.userData.meshy === true, { timeout: 40000 });

const rows = await page.evaluate(async () => {
  const entry = window.__combat.scene.enemyGroups[0];
  const an = entry.animator;
  const idleClip = an.actions.idle.getClip();
  const root = an.root;
  const Mixer = an.mixer.constructor;
  // A dedicated mixer stepped by hand; the live one keeps running the fight,
  // we sample between rAF ticks so nothing fights us mid-read.
  const mixer = new Mixer(root);
  const action = mixer.clipAction(idleClip);
  an.mixer.stopAllAction();
  action.play();
  const boneL = root.getObjectByName('LeftHand');
  const boneR = root.getObjectByName('RightHand');
  const hips = root.getObjectByName('Hips');
  const V = Object.getPrototypeOf(hips.position).constructor;
  const vl = new V(), vr = new V(), vh = new V();
  const out = [];
  for (let t = 0; t <= idleClip.duration; t += 0.25) {
    mixer.setTime(0); // reset so setTime lands deterministically inside the loop
    mixer.setTime(Math.min(t, idleClip.duration - 1e-4));
    root.updateMatrixWorld(true);
    vl.setFromMatrixPosition(boneL.matrixWorld);
    vr.setFromMatrixPosition(boneR.matrixWorld);
    vh.setFromMatrixPosition(hips.matrixWorld);
    out.push({
      t: +t.toFixed(2),
      spread: +(vl.distanceTo(vr)).toFixed(1),
      handY: +(((vl.y + vr.y) / 2) - vh.y).toFixed(1),
    });
  }
  return { clip: idleClip.name, dur: +idleClip.duration.toFixed(2), rows: out };
});
console.log(JSON.stringify(rows));
await browser.close();
