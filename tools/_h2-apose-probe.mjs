// A-POSE PROBE — why is a Meshy body holding its bind pose mid-fight?
// Boots the same fixture+fight as the judge capture, waits for combat, then
// dumps the animator's clip table, current action, mixer state and the
// console's [meshy] lines. Headless; no video.
//   node tools/_h2-apose-probe.mjs --port=4519 --fight=karen [--fixture=act1]
import { chromium } from 'playwright';

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '4519');
const FIGHT = arg('fight', 'karen');
const FIXTURE = arg('fixture', 'act1');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const logs = [];
page.on('console', m => logs.push(m.text()));
page.on('pageerror', e => logs.push('PAGEERROR ' + String(e).split('\n')[0]));

await page.goto(`http://localhost:${PORT}/?dev&fixture=${FIXTURE}&qtier=high`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__explore && !!window.__explore.player, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.evaluate((fight) => {
  const ex = window.__explore;
  ex.player.flags.retry_karen = true;
  ex.player.flags.karen_retry_ready = true;
  ex._startCombat(fight);
}, FIGHT);
await page.waitForFunction(() => !!window.__combat && !!window.__combat.engine, { timeout: 30000 });
await page.waitForTimeout(4000);   // let the intro land

const state = await page.evaluate(() => {
  const c = window.__combat;
  const out = { enemies: [], allies: [] };
  const dump = (entry) => {
    const an = entry.animator;
    if (!an) return { id: entry.characterId, animator: null };
    const isMeshy = !!entry.group.userData.meshy;
    if (!an.actions) return { id: entry.characterId, meshy: isMeshy, procedural: true };
    const roles = {};
    for (const [role, action] of Object.entries(an.actions)) {
      const clip = action.getClip?.();
      roles[role] = {
        dur: clip ? +clip.duration.toFixed(3) : null,
        running: action.isRunning?.() ?? null,
        weight: +((action.getEffectiveWeight?.() ?? -1).toFixed(3)),
        timeScale: action.getEffectiveTimeScale?.() ?? null,
        time: +((action.time ?? -1).toFixed(3)),
      };
    }
    return {
      id: entry.characterId, meshy: isMeshy,
      current: an._current, down: an._down,
      mixerTimeScale: an.mixer?.timeScale,
      roles,
    };
  };
  for (const e of c.scene.enemyGroups) out.enemies.push(dump(e));
  for (const a of c.scene.allyGroups) out.allies.push(dump(a));
  return out;
});
console.log(JSON.stringify(state, null, 1));
console.log('--- console lines mentioning meshy/clip/warn ---');
for (const l of logs) if (/meshy|clip|retarget|warn|error|fail/i.test(l)) console.log(l);
await browser.close();
