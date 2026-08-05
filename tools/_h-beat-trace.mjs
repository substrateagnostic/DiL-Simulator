// _h-beat-trace — THROWAWAY instrumentation for the attack-feel design lane.
//
// Measures, in milliseconds, what the SHIPPING build actually does between the
// player pressing Attack and control coming back — and the same for one enemy
// attack. Read-only: it wraps methods on the live CombatState instance
// (window.__combat, DEV_MODE only) and never writes to src/.
//
// Two independent measurement channels, deliberately:
//   1) EVENT LOG   — every call site that owns a beat, wrapped, stamped with
//                    performance.now(). This is the call-path truth (HANDOFF §4.3).
//   2) FRAME SAMPLE — a rAF loop sampling the real AnimationMixer state (which
//                    clip, what time inside it, what blend weight), the striking
//                    hand's extension toward the target, camera z, freezeTimer
//                    and shakeAmount. This is the BODY truth — it is what tells
//                    you whether the damage number lands on the contact frame.
//   3) SCREENCAST   — CDP frames, timestamps converted into the same clock, so a
//                    claim about a frame can be looked at.
//
// Usage:  node tools/_h-beat-trace.mjs [--port=5174] [--fight=karen] [--tag=base]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const PORT = arg('port', '5174');
const FIGHT = arg('fight', 'karen');
const TAG = arg('tag', 'base');
const OUT = join('screenshots', 'h-run', `trace-${TAG}`);
const FRAMES = join(OUT, 'frames');

const PROBE = () => {
  const c = window.__combat;
  if (!c) return false;
  window.__trace = [];
  window.__frames = [];
  window.__timeOrigin = performance.timeOrigin;
  const T = () => performance.now();
  const log = (name, extra) => { window.__trace.push(Object.assign({ t: +T().toFixed(2), name }, extra || {})); };
  window.__log = log;

  const wrap = (obj, key, name, pick) => {
    if (!obj || typeof obj[key] !== 'function' || obj[key].__wrapped) return;
    const orig = obj[key].bind(obj);
    const f = function (...a) { log(name, pick ? pick(...a) : { args: a.filter(x => typeof x !== 'object').slice(0, 3) }); return orig(...a); };
    f.__wrapped = true;
    obj[key] = f;
  };

  // ── the call sites that own a beat ────────────────────────────────────
  wrap(c, '_executePlayerAttack', 'INPUT_player_attack', (ti) => ({ target: ti }));
  wrap(c, '_executePowerMove', 'INPUT_power_move', (ti) => ({ target: ti }));
  wrap(c, '_enablePlayerInput', 'CONTROL_RETURN');
  wrap(c, '_processNextTurn', 'turn_next');
  wrap(c, '_processNextAllyTurn', 'turn_next_ally');
  wrap(c, '_runSingleEnemyTurnInterleaved', 'ENEMY_TURN_BEGIN', (i) => ({ enemy: i }));
  wrap(c, '_spawnDamageNumberAtEnemy', 'DAMAGE_NUMBER_enemy', (txt, type) => ({ text: String(txt), type }));
  wrap(c, '_spawnDamageNumberForAlly', 'DAMAGE_NUMBER_ally', (txt, type) => ({ text: String(txt), type }));
  wrap(c, '_refreshHUD', 'hud_refresh');

  wrap(c.scene, 'playerAttackAnim', 'ANIM_player_attack', (i) => ({ ally: i }));
  wrap(c.scene, 'playerAbilityLunge', 'ANIM_player_lunge');
  wrap(c.scene, 'enemyAttackAnim', 'ANIM_enemy_attack', (i) => ({ enemy: i }));
  wrap(c.scene, 'enemyCastAnim', 'ANIM_enemy_cast');
  wrap(c.scene, 'enemyHurtAnim', 'ANIM_enemy_hurt', (i) => ({ enemy: i }));
  wrap(c.scene, 'allyHurtAnim', 'ANIM_ally_hurt', (i) => ({ ally: i }));
  wrap(c.scene, 'flashEnemy', 'FX_flash_enemy', (d, i) => ({ dur: d, enemy: i }));
  wrap(c.scene, 'shake', 'FX_shake', (v) => ({ intensity: v }));
  wrap(c.scene, 'hitStop', 'FX_hitstop', (s) => ({ seconds: s }));
  wrap(c.scene, 'punchIn', 'FX_punchin', (a) => ({ amount: a }));
  wrap(c.scene, 'flash', 'FX_flash_screen', (col, d) => ({ color: col, dur: d }));
  wrap(c.scene, 'cineCam', 'CAM_move');
  wrap(c.scene, 'cineReset', 'CAM_reset');
  wrap(c.scene, 'rimBeat', 'FX_rim');
  wrap(c.scene, 'backdropDarken', 'FX_darken');

  wrap(c.hud, 'updateEnemyHP', 'HUD_enemy_hp_cmd', (i, hp, mx) => ({ enemy: i, hp, maxHP: mx }));
  wrap(c.hud, 'updateStats', 'HUD_player_stats_cmd');
  wrap(c.hud, 'showMessage', 'HUD_message', (m) => ({ text: String(m).slice(0, 48) }));
  wrap(c.hud, 'showTaunt', 'HUD_taunt', (m, side) => ({ side }));
  wrap(c.hud, 'showBanner', 'HUD_banner', (m) => ({ text: String(m).slice(0, 40) }));
  wrap(c.floatingText, 'spawn', 'DOM_number_spawn', (txt, x, y, type) => ({ text: String(txt), type, x: Math.round(x), y: Math.round(y) }));

  // AudioManager is a module singleton; in dev the Vite module cache means this
  // dynamic import is the SAME instance the game holds, so the wrap is real.
  import('/src/core/AudioManager.js').then(m => {
    const A = m.AudioManager || m.default;
    if (A && !A.playSfx.__wrapped) {
      const o = A.playSfx.bind(A);
      const f = (n) => { log('SFX', { cue: n }); return o(n); };
      f.__wrapped = true; A.playSfx = f;
    }
  }).catch(() => {});

  wrap(c.cine, 'play', 'CINE_play', (n, o) => ({ timeline: n, opts: JSON.stringify(o || {}).slice(0, 80) }));
  const cineExec = c.cine._exec.bind(c.cine);
  c.cine._exec = function (step, opts) {
    log('CINE_step', { at: step.t, cam: typeof step.cam === 'string' ? step.cam : (step.cam ? 'custom' : undefined), hitstop: step.hitstop, punch: step.punch, shake: step.shake });
    return cineExec(step, opts);
  };

  // ── animator probes (the BODY) ────────────────────────────────────────
  const probeAnimator = (entry, tag) => {
    const a = entry && entry.animator;
    if (!a || a.__probed) return;
    a.__probed = true;
    const origPlay = a.play.bind(a);
    a.play = function (role, opts) {
      const act = a.actions && a.actions[role];
      const clip = act && act.getClip();
      const rate = (opts && opts.timeScale) != null ? opts.timeScale : (a._beats && a._beats[role]) || 1;
      const mixerTS = a.mixer.timeScale;
      log('CLIP_play', {
        who: tag, role,
        clip: clip ? clip.name : null,
        clipDuration: clip ? +clip.duration.toFixed(3) : null,
        beatTimeScale: +rate.toFixed(3),
        mixerTimeScale: +mixerTS.toFixed(3),
        wallClockMs: clip ? Math.round((clip.duration / (rate * mixerTS)) * 1000) : null,
        crossfadeMs: 250,
      });
      return origPlay(role, opts);
    };
    const origGesture = a.playGesture.bind(a);
    a.playGesture = function (name) { log('GESTURE', { who: tag, name }); return origGesture(name); };
    const origExpr = a.setExpression.bind(a);
    a.setExpression = function (n, d) { log('EXPRESSION', { who: tag, name: n, dur: d }); return origExpr(n, d); };
  };
  probeAnimator(c.scene.allyGroups[0], 'ally0');
  c.scene.enemyGroups.forEach((e, i) => probeAnimator(e, 'enemy' + i));

  // ── frame sampler ─────────────────────────────────────────────────────
  const findBone = (root, re) => {
    let hit = null;
    root.traverse(o => { if (!hit && o.isBone && re.test(o.name)) hit = o; });
    return hit;
  };
  const THREEv = { V: null };
  const rig = {};
  const setupRig = (entry, tag) => {
    if (!entry) return;
    const root = entry.group;
    rig[tag] = {
      group: root,
      animator: entry.animator,
      handL: findBone(root, /hand.*_?l$|left.*hand/i),
      handR: findBone(root, /hand.*_?r$|right.*hand/i),
      hips: findBone(root, /^hips$/i),
    };
  };
  setupRig(c.scene.allyGroups[0], 'ally0');
  setupRig(c.scene.enemyGroups[0], 'enemy0');
  window.__rigNames = Object.fromEntries(Object.entries(rig).map(([k, v]) => [k, {
    handL: v.handL && v.handL.name, handR: v.handR && v.handR.name, hips: v.hips && v.hips.name,
  }]));

  const tmp = { a: null, b: null };
  const sample = () => {
    const f = { t: +performance.now().toFixed(2) };
    const s = c.scene;
    f.camZ = +s.camera.position.z.toFixed(4);
    f.camX = +s.camera.position.x.toFixed(4);
    f.camY = +s.camera.position.y.toFixed(4);
    f.freeze = +(s.freezeTimer || 0).toFixed(4);
    f.shake = +(s.shakeAmount || 0).toFixed(4);
    f.punchT = +(s._punchT ?? 1).toFixed(3);
    f.bgFlash = !!s.scene.background;
    // The enemy HP bar as the PLAYER sees it — computed width, so the 0.5s CSS
    // width transition is measured rather than assumed.
    const bar = document.querySelector('.combat-enemy-hp-fill');
    if (bar) f.hpBarPx = +parseFloat(getComputedStyle(bar).width).toFixed(2);
    f.numbers = document.querySelectorAll('.floating-damage').length;
    for (const [tag, r] of Object.entries(rig)) {
      if (!r.animator || !r.animator.actions) continue;
      const acts = [];
      for (const [role, act] of Object.entries(r.animator.actions)) {
        const w = act.getEffectiveWeight();
        if (w > 0.001 && act.isRunning()) acts.push({ role, time: +act.time.toFixed(4), w: +w.toFixed(3), dur: +act.getClip().duration.toFixed(3) });
      }
      f[tag] = { cur: r.animator._current, acts };
      // Striking-hand position expressed in the HIPS' OWN frame — rotation- and
      // stage-blocking-invariant, so the reach axis is a property of the clip and
      // not of where the actor happens to be standing. Peak reach == the frame the
      // strike is committed == the contact frame. Full vector recorded; which axis
      // is "forward" is decided offline off the data, not assumed here.
      if (r.hips && (r.handL || r.handR)) {
        r.group.updateMatrixWorld(true);
        const V = r.hips.position.constructor;
        const loc = (bone) => {
          if (!bone) return null;
          const p = bone.getWorldPosition(new V());
          r.hips.worldToLocal(p);
          return { x: +p.x.toFixed(4), y: +p.y.toFixed(4), z: +p.z.toFixed(4), d: +p.length().toFixed(4) };
        };
        f[tag].hL = loc(r.handL);
        f[tag].hR = loc(r.handR);
      }
    }
    window.__frames.push(f);
    if (window.__frames.length < 4000) requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
  return true;
};

const run = async () => {
  mkdirSync(FRAMES, { recursive: true });
  const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900', '--autoplay-policy=no-user-gesture-required'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 810 } });
  const page = await context.newPage();
  page.on('pageerror', e => console.log('  ! pageerror', String(e).split('\n')[0]));

  const url = `http://localhost:${PORT}/?dev&fixture=act7&fight=${FIGHT}`;
  console.log('goto', url);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__combat, { timeout: 45000 });
  // Pin the fight so it cannot end mid-measurement, and so Andrew acts first.
  await page.evaluate((HP) => {
    const c = window.__combat;
    if (c?.engine?.player) { c.engine.player.spd = 999; c.engine.player.maxHP = 9999; c.engine.player.hp = 9999; }
    for (const e of c?.engine?.enemies || []) { e.maxHP = HP; e.hp = HP; }
  }, Number(arg('hp', '99999')));
  await page.waitForFunction(() => {
    const c = window.__combat;
    return !!c && c.inputEnabled === true && c.phase === 'ally_turn' && c._activeAllyIndex === 0;
  }, { timeout: 45000 });
  await page.waitForTimeout(1500);

  const ok = await page.evaluate(PROBE);
  console.log('probes installed:', ok);
  console.log('rig bones:', JSON.stringify(await page.evaluate(() => window.__rigNames)));

  // ── screencast ────────────────────────────────────────────────────────
  const cdp = await context.newCDPSession(page);
  const shots = [];
  cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
    shots.push({ ts: metadata.timestamp, data });
    try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch { /* closed */ }
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: 1440, maxHeight: 810, everyNthFrame: 1 });

  const mark = (n) => page.evaluate((name) => window.__log(name, { marker: true }), n);

  const MODE = arg('mode', 'basic');
  if (MODE === 'power') {
    // Assert Dominance needs a full Confidence bar; the beat is what is being
    // measured, not how it was earned.
    await page.evaluate(() => { window.__combat.engine.player.momentum = 100; window.__combat._enablePlayerInput(); });
    await page.waitForTimeout(600);
    await mark('HARNESS_click_power');
    await page.click('.combat-action-btn:has-text("ASSERT DOMINANCE")');
  } else {
    await mark('HARNESS_click_attack');
    await page.click('.combat-action-btn:text-is("Attack")');
  }

  // Ride through the player attack AND the enemy's answering turn.
  await page.waitForTimeout(11000);

  await cdp.send('Page.stopScreencast');
  const trace = await page.evaluate(() => ({ trace: window.__trace, frames: window.__frames, timeOrigin: window.__timeOrigin }));

  // Convert screencast epoch-seconds -> the page's performance.now() clock.
  const frameIndex = shots.map((s, i) => ({ i, t: +(s.ts * 1000 - trace.timeOrigin).toFixed(2) }));
  shots.forEach((s, i) => writeFileSync(join(FRAMES, `f${String(i).padStart(4, '0')}.jpg`), Buffer.from(s.data, 'base64')));

  writeFileSync(join(OUT, 'trace.json'), JSON.stringify({
    fight: FIGHT, tag: TAG, timeOrigin: trace.timeOrigin,
    events: trace.trace, frames: trace.frames, screencast: frameIndex,
  }, null, 1));
  console.log(`events=${trace.trace.length} frames=${trace.frames.length} screencast=${shots.length}`);
  console.log('wrote', join(OUT, 'trace.json'));

  await context.close();
  await browser.close();
};

run().catch(e => { console.error(e); process.exit(1); });
