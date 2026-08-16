// FIX ROUND 2 - B23. The defeat beat, wired, on real bodies.
//
// Producer ruling C3: a defeated enemy should COLLAPSE or SIT DOWN rather than
// vanish. Round 1 shot a proposal still (the stagger clip held on its last
// frame) because the vendor catalog looked like it had no seated collapse.
// A 255-clip sweep of every non-combat band found two - one per performed
// build - and they are wired now:
//
//   m  a58   "Step to Sit Transition"   trimmed [2.900, 4.800] -> 1.87 s
//   f  a359  "Look Back and Sit"        trimmed [0.350, 2.100] -> 1.73 s
//
// This tool does NOT pose a clip by hand. It runs a real fight, kills the enemy
// through the dev instant-kill (which routes the NORMAL victory path, so the
// beat under test is the one a player gets), and then samples the enemy's stage
// transform and the animator's state on a timeline past the kill. The old beat
// sank the group 2 world units through the floor and shrank it to half size, so
// the assertions are exactly that: the body must still be at its stage height,
// at full scale, and still parented, seconds after it lost.
//
//   node tools/_fr2-b23-defeat.mjs [--port=5173]
//
// Requires `npm run dev`. Headed.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => (process.argv.find(a => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const PORT = arg('port', '5173');
const OUT = arg('out', 'screenshots/fix-round-2/b23-defeat');
mkdirSync(OUT, { recursive: true });

// One per performed build. Karen is female (a359), Chad male (a58) -
// MeshyClips.genderFor off CHARACTER_CONFIGS.gender.
const SUBJECTS = [
  { fight: 'karen', build: 'female', clip: 'a359', name: 'Look Back and Sit' },
  { fight: 'chad', build: 'male', clip: 'a58', name: 'Step to Sit Transition' },
];
// Milliseconds after the COLLAPSE STARTS, not after the keypress. The kill
// routes the normal victory path and _handleResult is reached ~620 ms past the
// contact frame that killed them, so timing from the keypress measures the
// victory sequence's latency and calls it a missing animation. The tool waits
// for the beat to start, reports that latency as a number, and samples from
// there. The last mark is past the clip's own length: the pose has to still be
// on the stage, parked on its final frame.
const MARKS = [0, 400, 900, 1400, 1900];

const browser = await chromium.launch({ headless: false, args: ['--window-size=1480,900'] });
const rows = [];
let failures = 0;

try {
  for (const s of SUBJECTS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.addInitScript(() => {
      const RealWS = window.WebSocket;
      const Dead = function () {
        this.readyState = 3; this.addEventListener = () => {}; this.removeEventListener = () => {};
        this.send = () => {}; this.close = () => {};
      };
      window.WebSocket = function (url, protocols) {
        const p = Array.isArray(protocols) ? protocols.join(',') : String(protocols || '');
        if (p.includes('vite') || String(url).includes('vite')) return new Dead();
        return new RealWS(url, protocols);
      };
      window.WebSocket.prototype = RealWS.prototype;
    });
    await page.goto(`http://localhost:${PORT}/?dev&qtier=high&fixture=act7&fight=${s.fight}`);
    await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
    await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
    await page.waitForTimeout(500);

    // BASELINE, before the kill: the stage transform a living body sits at, so
    // "still at its stage height" is measured against this fight's own numbers
    // and not against a constant typed into a tool.
    const base = await page.evaluate(() => {
      const c = window.__combat;
      const e = c.scene.enemyGroups[0];
      const an = e?.animator;
      const clip = an?.actions?.defeat?.getClip?.();
      return {
        hasMeshy: !!an?.mixer,
        clipName: clip?.name ?? null,
        clipMs: clip ? Math.round(clip.duration * 1000) : null,
        trimmed: clip?.userData?.trimmed ?? null,
        y: +e.group.position.y.toFixed(4),
        scale: +e.group.scale.x.toFixed(4),
        baseScale: +e.baseScale.toFixed(4),
        tier: window.__engine.qualityTier,
      };
    });

    // Interface off - this is a plate of the pose, not of the fight screen.
    await page.evaluate(() => {
      for (const sel of ['#ui-overlay', '.combat-hud', '.combat-actions', '.na-root', '.combat-enemy-intro', '.combat-banner', '.combat-splash']) {
        for (const el of document.querySelectorAll(sel)) el.style.display = 'none';
      }
    });

    // THE SHIPPING KILL. `?dev` backtick routes through the normal victory path
    // (XP, flags, post-dialog), which is what makes this a test of the beat the
    // player sees rather than of a hand-posed clip.
    const killedAt = Date.now();
    await page.keyboard.down('`');
    await page.waitForTimeout(140);
    await page.keyboard.up('`');

    // Wait for the beat to actually start, and MEASURE how long that took.
    await page.waitForFunction(
      () => window.__combat?.scene?.enemyGroups?.[0]?.animator?._current === 'defeat',
      { timeout: 15000 },
    );
    const collapseLatency = Date.now() - killedAt;

    const samples = [];
    const t0 = Date.now();
    for (const ms of MARKS) {
      const wait = ms - (Date.now() - t0);
      if (wait > 0) await page.waitForTimeout(wait);
      const st = await page.evaluate(() => {
        const c = window.__combat;
        const e = c?.scene?.enemyGroups?.[0];
        if (!e) return { gone: true };
        const an = e.animator;
        return {
          gone: false,
          parented: !!e.group.parent,
          visible: e.group.visible,
          y: +e.group.position.y.toFixed(4),
          scale: +e.group.scale.x.toFixed(4),
          rotZ: +e.group.rotation.z.toFixed(3),
          current: an?._current ?? null,
          down: an?._down ?? null,
          // Where the clip is parked. clampWhenFinished holds the last frame,
          // so at rest this equals the clip duration.
          actionTime: an?.actions?.defeat ? +an.actions.defeat.time.toFixed(3) : null,
          actionRunning: an?.actions?.defeat ? an.actions.defeat.isRunning() : null,
        };
      });
      samples.push({ ms, ...st });
      await page.screenshot({ path: join(OUT, `${s.fight}-${s.build}-${s.clip}-t${String(ms).padStart(4, '0')}.png`) });
    }

    // HOW LONG DOES THE BODY STAY? The ruling is "the body remains until the
    // victory sequence clears the stage", so the honest number is when the
    // stage actually clears - poll for it rather than assuming.
    let stageClearedAt = null;
    for (let i = 0; i < 240; i++) {
      const gone = await page.evaluate(() => !window.__combat?.scene?.enemyGroups?.[0]?.group?.parent);
      if (gone) { stageClearedAt = Date.now() - t0; break; }
      await page.waitForTimeout(100);
    }
    await page.close();

    // ── ASSERTIONS ─────────────────────────────────────────────────────────
    const bad = [];
    if (!base.hasMeshy) bad.push('no Meshy animator on this enemy (procedural rig) - beat untested');
    if (base.clipName !== s.clip) bad.push(`defeat clip is ${base.clipName}, expected ${s.clip}`);
    if (base.trimmed !== true) bad.push('defeat clip is NOT trimmed');
    if (base.tier !== 'high') bad.push(`quality tier ${base.tier}`);
    for (const p of samples) {
      if (p.gone) { bad.push(`t${p.ms}: enemy group gone from the scene`); continue; }
      if (!p.parented) bad.push(`t${p.ms}: unparented`);
      if (!p.visible) bad.push(`t${p.ms}: invisible`);
      // The old beat sank 2 units and shrank to 0.5x over ~50 frames.
      if (Math.abs(p.y - base.y) > 0.05) bad.push(`t${p.ms}: y moved ${(p.y - base.y).toFixed(3)} (the old beat sank -2.000)`);
      if (Math.abs(p.scale - base.scale) > 0.02) bad.push(`t${p.ms}: scale ${p.scale} vs ${base.scale} (the old beat ended at 0.5x)`);
      if (p.current !== 'defeat') bad.push(`t${p.ms}: animator on '${p.current}', expected 'defeat'`);
      if (p.down !== true) bad.push(`t${p.ms}: _down latch not set`);
    }
    // Past the clip's own length the pose must be PARKED on the final frame.
    const last = samples[samples.length - 1];
    if (!last.gone && base.clipMs && last.actionTime != null) {
      const dur = base.clipMs / 1000;
      if (Math.abs(last.actionTime - dur) > 0.05) {
        bad.push(`t${last.ms}: clip parked at ${last.actionTime}s, expected the final frame ${dur.toFixed(3)}s`);
      }
    }
    // The whole point of the ruling: the player must SEE the collapse finish.
    if (stageClearedAt != null && base.clipMs && stageClearedAt < base.clipMs) {
      bad.push(`stage cleared at ${stageClearedAt}ms, before the ${base.clipMs}ms collapse finished`);
    }
    rows.push({ ...s, base, collapseLatency, stageClearedAt, samples, failures: bad });
    failures += bad.length;
    console.log(`${s.fight.padEnd(6)} ${s.build.padEnd(7)} ${base.clipName} ${base.clipMs}ms trimmed=${base.trimmed}  kill->collapse ${collapseLatency}ms  seated hold ${stageClearedAt != null ? stageClearedAt - base.clipMs : '?'}ms  stage clears +${stageClearedAt}ms  ${bad.length ? 'FAIL' : 'PASS'}`);
    for (const b of bad) console.log('   !! ' + b);
    for (const p of samples) {
      console.log(`   t${String(p.ms).padStart(4)}  y ${String(p.y).padStart(7)}  scale ${String(p.scale).padStart(6)}  role ${String(p.current).padEnd(7)} down=${p.down}  clip@${p.actionTime}s running=${p.actionRunning}`);
    }
  }
} finally {
  await browser.close();
}

writeFileSync(join(OUT, 'report.json'), JSON.stringify({ generated: new Date().toISOString(), subjects: SUBJECTS, marks: MARKS, rows }, null, 2));

// ── contact strip: the collapse, both builds, one sheet ─────────────────────
const sheets = await chromium.launch({ headless: true });
const sp = await sheets.newPage();
const dataURL = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;
for (const s of SUBJECTS) {
  const row = rows.find(r => r.fight === s.fight);
  if (!row || row.samples.some(x => x.gone)) continue;
  const out = join(OUT, `contact_${s.fight}.png`);
  const png = await sp.evaluate(async ({ tiles, title }) => {
    const load = (u) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; });
    const ims = await Promise.all(tiles.map(t => load(t.src)));
    const TW = 380, PAD = 10, CAP = 30, HEAD = 46;
    const TH = Math.round(TW * ims[0].height / ims[0].width);
    const c = document.createElement('canvas');
    c.width = PAD + tiles.length * (TW + PAD);
    c.height = HEAD + TH + CAP;
    const x = c.getContext('2d');
    x.fillStyle = '#11131a'; x.fillRect(0, 0, c.width, c.height);
    x.fillStyle = '#e8e6df'; x.font = 'bold 21px Segoe UI, sans-serif';
    x.fillText(title, PAD, 30);
    ims.forEach((im, i) => {
      const ox = PAD + i * (TW + PAD);
      x.drawImage(im, ox, HEAD, TW, TH);
      x.strokeStyle = '#3a3f4d'; x.lineWidth = 2; x.strokeRect(ox, HEAD, TW, TH);
      x.fillStyle = '#ffd479'; x.font = 'bold 16px Segoe UI, sans-serif';
      x.fillText(tiles[i].label, ox, HEAD + TH + 21);
    });
    return c.toDataURL('image/png');
  }, {
    title: `DEFEAT - ${s.fight} (${s.build} build) - ${s.clip} "${s.name}" - ms after the collapse starts`,
    tiles: MARKS.map(ms => ({
      src: dataURL(join(OUT, `${s.fight}-${s.build}-${s.clip}-t${String(ms).padStart(4, '0')}.png`)),
      label: `+${ms} ms`,
    })),
  });
  writeFileSync(out, Buffer.from(png.split(',')[1], 'base64'));
  console.log('wrote', out);
}
await sheets.close();

if (failures) { console.error(`\n${failures} assertion failure(s)`); process.exit(1); }
console.log('\nALL ASSERTIONS PASS');
