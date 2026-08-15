// Enemy-turn regression probe. Read-only: wraps the live CombatState.
// node probe-enemy.mjs --fight=karen [--port=5174] [--headed]
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const PORT = arg('port', '5174');
const FIGHT = arg('fight', 'karen');
const FIXTURE = arg('fixture', 'act7');
const THROTTLE = Number(arg('throttle', '0'));   // kbps download; 0 = off
const HEADED = process.argv.includes('--headed');

const PROBE = () => {
  const c = window.__combat;
  if (!c) return { ok: false };
  window.__L = [];
  const T = () => +performance.now().toFixed(1);
  const log = (name, extra) => window.__L.push(Object.assign({ t: T(), name }, extra || {}));

  const wrap = (obj, key, name, pick) => {
    if (!obj || typeof obj[key] !== 'function' || obj[key].__w) return;
    const orig = obj[key].bind(obj);
    const f = function (...a) { const r = orig(...a); log(name, pick ? pick(r, ...a) : {}); return r; };
    f.__w = true; obj[key] = f;
  };

  wrap(c.engine, 'enemyTurn', 'ENGINE_enemyTurn', (r, i) => ({
    idx: i, res: r ? { type: r.type, dmg: r.damage, ability: r.abilityName || r.ability, heal: r.healAmount, msg: String(r.message || '').slice(0, 60) } : null,
  }));
  wrap(c.engine, '_pickEnemyAbility', 'ENGINE_pick', (r, e) => ({ picked: r, enemy: e && e.id }));
  wrap(c.scene, 'enemyAttackAnim', 'SCENE_enemyAttackAnim', (r, i) => ({ idx: i }));
  wrap(c.scene, 'enemyCastAnim', 'SCENE_enemyCastAnim', (r, i) => ({ idx: i }));
  wrap(c.scene, 'enemyHurtAnim', 'SCENE_enemyHurtAnim', (r, i) => ({ idx: i }));
  wrap(c, '_runSingleEnemyTurnInterleaved', 'CS_enemyTurnBegin', (r, i) => ({ idx: i }));
  wrap(c, '_processNextTurn', 'CS_nextTurn');

  const info = { enemies: [], allies: [] };
  const probeAnimator = (entry, tag, bucket) => {
    if (!entry) return;
    const a = entry.animator;
    bucket.push({
      tag,
      hasAnimator: !!a,
      animatorType: a ? a.constructor.name : null,
      roles: a && a.actions ? Object.keys(a.actions) : null,
      meshy: !!entry.meshy,
      attackGesture: entry.attackGesture || null,
      contactAttack: (a && a.contactMs) ? a.contactMs('attack') : null,
    });
    if (!a || a.__p) return;
    a.__p = true;
    if (typeof a.play === 'function') {
      const op = a.play.bind(a);
      a.play = function (role, opts) {
        const act = a.actions && a.actions[role];
        const r = op(role, opts);
        log('CLIP_play', { who: tag, role, found: !!act, clip: act ? act.getClip().name : null, ret: r });
        return r;
      };
    }
    if (typeof a.playGesture === 'function') {
      const og = a.playGesture.bind(a);
      a.playGesture = function (n) { log('GESTURE', { who: tag, name: n }); return og(n); };
    }
  };
  (c.scene.enemyGroups || []).forEach((e, i) => probeAnimator(e, 'enemy' + i, info.enemies));
  (c.scene.allyGroups || []).forEach((e, i) => probeAnimator(e, 'ally' + i, info.allies));

  // frame sampler: which action is running with weight on enemy0
  window.__F = [];
  const sample = () => {
    const e = c.scene.enemyGroups && c.scene.enemyGroups[0];
    const a = e && e.animator;
    const f = { t: T(), acts: [] };
    if (a && a.actions) {
      for (const [role, act] of Object.entries(a.actions)) {
        const w = act.getEffectiveWeight ? act.getEffectiveWeight() : 0;
        if (w > 0.001 && act.isRunning()) f.acts.push(`${role}@${act.time.toFixed(2)}w${w.toFixed(2)}`);
      }
      f.cur = a._current;
      f.mixerTS = a.mixer ? a.mixer.timeScale : null;
    }
    f.pos = e ? [+e.group.position.x.toFixed(2), +e.group.position.z.toFixed(2)] : null;
    window.__F.push(f);
    if (window.__F.length < 3000) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);

  return { ok: true, info, enemyIds: (c.engine.enemies || []).map(e => e.id), meshyMode: window.__meshyCast ? 'exposed' : 'n/a' };
};

const run = async () => {
  const browser = await chromium.launch({ headless: !HEADED, args: ['--window-size=1480,900', '--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errs = [];
  page.on('pageerror', e => { errs.push(String(e).split('\n')[0]); });
  page.on('console', m => { const t = m.text(); if (/meshy|clip|warn|error/i.test(t)) errs.push('[console] ' + t.slice(0, 160)); });

  const CLIPDELAY = Number(arg('clipdelay', '0'));
  if (CLIPDELAY > 0) {
    await page.route('**/meshy/clips/**', async (route) => {
      await new Promise(r => setTimeout(r, CLIPDELAY));
      await route.continue();
    });
    console.log(`[clipdelay] ${CLIPDELAY} ms on /meshy/clips/**`);
  }
  if (THROTTLE > 0) {
    const cdp0 = await context.newCDPSession(page);
    await cdp0.send('Network.enable');
    await cdp0.send('Network.emulateNetworkConditions', {
      offline: false, latency: Number(arg('latency', '60')),
      downloadThroughput: (THROTTLE * 1024) / 8, uploadThroughput: (THROTTLE * 1024) / 8,
    });
    console.log(`[throttle] ${THROTTLE} kbps`);
  }
  // Out-of-page timeline of the meshy warm-up race (cannot perturb the app).
  const T0 = Date.now();
  const net = [];
  page.on('request', r => {
    const u = r.url();
    if (u.includes('/meshy/')) net.push({ t: Date.now() - T0, url: u.split('/meshy/')[1], status: 'REQ' });
  });
  page.on('response', r => {
    const u = r.url();
    if (u.includes('/meshy/')) net.push({ t: Date.now() - T0, url: u.split('/meshy/')[1], status: r.status() });
  });
  const url = `http://localhost:${PORT}/?dev&fixture=${FIXTURE}&fight=${FIGHT}&qtier=high`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
  await page.evaluate(() => {
    const c = window.__combat;
    if (c?.engine?.player) { c.engine.player.spd = 999; c.engine.player.maxHP = 9999; c.engine.player.hp = 9999; }
    for (const e of c?.engine?.enemies || []) { e.maxHP = 99999; e.hp = 99999; }
  });
  await page.waitForFunction(() => {
    const c = window.__combat;
    return !!c && c.inputEnabled === true && c.phase === 'ally_turn';
  }, { timeout: 60000 });
  await page.waitForTimeout(1200);

  const tCombat = Date.now() - T0;
  const boot = await page.evaluate(() => ({
    nav: Math.round(performance.getEntriesByType('navigation')[0]?.duration || 0),
    now: Math.round(performance.now()),
  }));
  console.log(`BOOT: navigation ${boot.nav} ms, page clock now ${boot.now} ms`);
  const cached = await page.evaluate(() => {
    const mc = window.__meshyCast;
    if (!mc) return null;
    return Object.keys(mc.MESHY_MODELS).filter(id => mc.isCached(id));
  });
  console.log(`RACE: combat interactive at +${tCombat} ms; meshy cached NOW = ${JSON.stringify(cached)}`);
  console.log('NET (meshy responses):');
  for (const n of net) console.log(`   +${String(n.t).padStart(6)} ms  ${n.status}  ${n.url}`);
  const res = await page.evaluate(PROBE);
  console.log('PROBE:', JSON.stringify(res, null, 2));

  // three player attacks so we see three enemy turns
  for (let i = 0; i < 3; i++) {
    try {
      await page.click('.combat-action-btn:text-is("Attack")', { timeout: 5000 });
    } catch (e) { console.log('click attack failed round', i, String(e).slice(0, 80)); }
    await page.waitForTimeout(9000);
  }

  const out = await page.evaluate(() => ({ L: window.__L, F: window.__F }));
  console.log('--- EVENT LOG ---');
  for (const e of out.L) console.log(String(e.t).padStart(9), e.name, JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => k !== 't' && k !== 'name'))));
  console.log('--- FRAMES (only rows where enemy0 non-idle acts) ---');
  let prev = '';
  for (const f of out.F) {
    const k = (f.cur || '') + '|' + f.acts.join(',');
    if (k !== prev) { console.log(String(f.t).padStart(9), f.cur, f.acts.join(' '), 'pos', JSON.stringify(f.pos), 'mixerTS', f.mixerTS); prev = k; }
  }
  console.log('--- ERRORS/CONSOLE ---');
  for (const e of errs.slice(0, 40)) console.log(e);

  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
