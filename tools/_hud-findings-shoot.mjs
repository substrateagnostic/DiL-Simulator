// _hud-findings-shoot.mjs — evidence instrument for the FINDINGS HUD chip
// (the Audit lane's standing stacks / monotonic record / Hard documentation
// shield, previously ZERO visible surface — CombatHUD.updateFindingsAll).
//
// Three modes:
//
//   node tools/_hud-findings-shoot.mjs --mode=invariance --tag=before [--port=4173]
//   node tools/_hud-findings-shoot.mjs --mode=invariance --tag=after  [--port=4173]
//     NON-Audit build (starters only), karen, seeded Math.random so the
//     telegraph/locks roll identically across runs. Canvas hidden + CSS
//     animations frozen, full-page still + DOM dump. Run `before` on the
//     pre-change bundle and `after` on the post-change bundle; --mode=diff
//     compares the pair pixel-for-pixel. The claim under test: a build that
//     does not own the `findings` node renders a bit-identical HUD.
//
//   node tools/_hud-findings-shoot.mjs --mode=diff
//     Compares invariance-before.png / invariance-after.png (byte compare,
//     then a canvas pixel diff in the browser if bytes differ) and the two
//     DOM dumps. Exits 1 on any differing pixel or DOM byte.
//
//   node tools/_hud-findings-shoot.mjs --mode=audit --fight=karen --level=3 \
//        --difficulty=normal [--turns=16] [--video] [--port=4173]
//     AUDIT build (tools/_j-verify.mjs buildUnlocked('audit', level) — the
//     same spend order every balance table uses), headed, qtier pinned.
//     Drives an off-weakness tagged line (the filing loop), snapping a still
//     on every Findings delta: file beats, standing stacks, the close, and
//     on Hard the seeded record + ATK read. Identity checks per CAPTURE LAW:
//     enemy id, difficulty claim vs `window.__difficulty`, and the AUDIT
//     OBSERVABLE off the live engine — `_findingsEver` at boot (seedRecord 3
//     on Hard, 0 otherwise) and the enemy's built ATK vs the mode multiplier.
//
// HEADED per HANDOFF_PACKAGE §4.7. Long takes run against `vite preview`
// (dist), never the dev server — the HMR-reload trap.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, renameSync } from 'fs';
import { join } from 'path';
import { PLAYER_BASE_STATS, LEVEL_GROWTH, ENEMY_STATS } from '../src/data/stats.js';
import { DIFFICULTY_MODES } from '../src/data/difficulty.js';
import { buildUnlocked } from './_j-verify.mjs';

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const has = (k) => process.argv.includes(`--${k}`);
const PORT = arg('port', '4173');
const MODE = arg('mode', 'audit');
const TAG = arg('tag', 'before');
const FIGHT = arg('fight', 'karen');
const LEVEL = Number(arg('level', '3'));
const DIFF = arg('difficulty', 'normal');
const MAX_TURNS = Number(arg('turns', '16'));
const OUT = join('screenshots', 'hud-findings');
mkdirSync(OUT, { recursive: true });

// ── mode: diff (no browser needed unless bytes differ) ──────────────────
if (MODE === 'diff') {
  const a = readFileSync(join(OUT, 'invariance-before.png'));
  const b = readFileSync(join(OUT, 'invariance-after.png'));
  const domA = readFileSync(join(OUT, 'invariance-before.html'), 'utf8');
  const domB = readFileSync(join(OUT, 'invariance-after.html'), 'utf8');
  // The invariance CLAIM is pixels. The DOM is supporting evidence: the one
  // legal delta is the hidden findings div itself (same pattern as the
  // always-present hidden .combat-locks div) — anything else is a fault.
  const HIDDEN_DIV = '<div class="combat-findings" style="display:none;"></div>\n        ';
  const domSame = domA === domB;
  const domNormalized = domB.split(HIDDEN_DIV).join('');
  const domOk = domSame || domNormalized === domA;
  console.log(`DOM dump: ${domSame ? 'IDENTICAL' : (domOk
    ? 'differs ONLY by the hidden combat-findings div (expected)'
    : 'DIFFERS beyond the hidden div — FAULT')} (${domA.length} vs ${domB.length} bytes)`);
  if (!domOk) {
    let i = 0; while (i < Math.min(domA.length, domB.length) && domA[i] === domB[i]) i++;
    console.log('first DOM divergence at char', i, ':',
      JSON.stringify(domA.slice(Math.max(0, i - 60), i + 80)), 'vs',
      JSON.stringify(domB.slice(Math.max(0, i - 60), i + 80)));
  }
  if (a.equals(b)) {
    console.log('PNG: byte-identical.');
    process.exit(domOk ? 0 : 1);
  }
  console.log('PNG bytes differ — running canvas pixel diff...');
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const res = await page.evaluate(async ({ da, db }) => {
    const load = (src) => new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = bad; im.src = src; });
    const ia = await load(da), ib = await load(db);
    if (ia.width !== ib.width || ia.height !== ib.height) return { fatal: `size ${ia.width}x${ia.height} vs ${ib.width}x${ib.height}` };
    const cv = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data; };
    const pa = cv(ia), pb = cv(ib);
    let diff = 0, minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
    for (let i = 0; i < pa.length; i += 4) {
      if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2] || pa[i + 3] !== pb[i + 3]) {
        diff++;
        const px = (i / 4) % ia.width, py = Math.floor((i / 4) / ia.width);
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
    }
    return { diff, total: pa.length / 4, box: diff ? [minX, minY, maxX, maxY] : null };
  }, { da: `data:image/png;base64,${a.toString('base64')}`, db: `data:image/png;base64,${b.toString('base64')}` });
  await browser.close();
  console.log('pixel diff:', JSON.stringify(res));
  process.exit((res.diff === 0 && domOk) ? 0 : 1);
}

// ── shared boot ─────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: false, args: ['--window-size=1940,1120'] });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  ...(has('video') ? { recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } } } : {}),
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).split('\n')[0]));

const diffParam = MODE === 'audit' ? `&difficulty=${DIFF}` : '';
await page.goto(`http://localhost:${PORT}/?dev&fixture=act7&qtier=high${diffParam}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__explore, { timeout: 60000 });
await page.waitForTimeout(1200);

if (MODE === 'invariance') {
  // NON-Audit build: force the five starters exactly, seed the RNG so the
  // telegraph/locks/damage rolls replay identically run-to-run, then start.
  await page.evaluate(({ fight }) => {
    const ex = window.__explore;
    ex.player.unlockedAbilities = new Set(['file_motion', 'coffee_break', 'stall', 'raise_concerns', 'spot_check']);
    let s = 42;
    Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    ex._startCombat(fight);
  }, { fight: FIGHT });
  await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });
  // Sanity: this arm must NOT own the findings node.
  const nodes = await page.evaluate(() => [...(window.__combat.engine.nodes || [])]);
  if (nodes.includes('findings')) { console.error('INVARIANCE ARM FAULT: findings node present'); process.exit(1); }
  // Let the intro banner and any queued plates drain, then freeze and shoot.
  await page.waitForTimeout(5000);
  await page.waitForFunction(() => !document.querySelector('.combat-banner'), { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => {
    const st = document.createElement('style');
    st.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
    document.head.appendChild(st);
    document.querySelectorAll('canvas').forEach(c => { c.style.visibility = 'hidden'; });
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `invariance-${TAG}.png`) });
  const dom = await page.evaluate(() => document.getElementById('ui-overlay')?.outerHTML || 'NO-OVERLAY');
  writeFileSync(join(OUT, `invariance-${TAG}.html`), dom);
  const state = await page.evaluate(() => {
    const e = window.__combat.engine.enemies[0];
    return { enemyId: e.enemyId, telegraph: e.telegraphedAbility, locks: (e.locks || []).map(l => l.tag).join(',') };
  });
  console.log(`invariance-${TAG}:`, JSON.stringify(state), 'pageErrors:', errors);
  await ctx.close(); await browser.close();
  process.exit(0);
}

// ── mode: audit ─────────────────────────────────────────────────────────
const unlocked = [...buildUnlocked('audit', LEVEL)];
console.log(`audit build @L${LEVEL}:`, unlocked.join(', '));
await page.evaluate(({ ids, fight }) => {
  const ex = window.__explore;
  ex.player.unlockedAbilities = new Set(ids);
  ex._startCombat(fight);
}, { ids: unlocked, fight: FIGHT });
await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });

// Level-pin through the same arithmetic combat-sim uses.
await page.evaluate(({ lv, base, growth }) => {
  const p = window.__combat.engine.player;
  const n = lv - 1;
  p.maxHP = base.maxHP + growth.maxHP * n; p.hp = p.maxHP;
  p.maxMP = base.maxMP + growth.maxMP * n; p.mp = p.maxMP;
  p.atk = base.atk + growth.atk * n;
  p.def = base.def + growth.def * n;
  p.spd = base.spd + growth.spd * n;
  p.level = lv;
}, { lv: LEVEL, base: PLAYER_BASE_STATS, growth: LEVEL_GROWTH });

// IDENTITY, three checks (CAPTURE LAW): the enemy, the mode claim, and the
// AUDIT OBSERVABLE the mode would actually change on this fight.
const ident = await page.evaluate(() => {
  const eng = window.__combat.engine;
  const e = eng.enemies[0];
  return {
    claimed: window.__difficulty?.id ?? null,
    enemyId: e?.enemyId, atk: e?.atk,
    nodes: [...eng.nodes], findingsEver: e?._findingsEver || 0,
    tier: window.__engine?.qualityTier,
  };
});
const expectSeed = (DIFFICULTY_MODES[DIFF]?.audit?.seedRecord) || 0;
const atkMult = DIFFICULTY_MODES[DIFF]?.enemyMult?.atk || 1;
const expectAtk = Math.max(1, Math.round((ENEMY_STATS[ident.enemyId]?.atk || 0) * atkMult));
const faults = [];
// Multi-enemy encounters put the FIRST roster body at index 0 — pass
// --first=<enemyId> to name it (e.g. restructuring_trio -> brand_consultant).
const expectFirst = arg('first', FIGHT);
if (ident.enemyId !== expectFirst) faults.push(`enemy ${ident.enemyId} != ${expectFirst}`);
if (ident.claimed !== DIFF) faults.push(`mode claim ${ident.claimed} != ${DIFF}`);
if (!ident.nodes.includes('findings')) faults.push('findings node missing — not an Audit build');
if (ident.findingsEver !== expectSeed) faults.push(`seed observable: _findingsEver ${ident.findingsEver}, expected ${expectSeed}`);
if (ident.atk !== expectAtk) faults.push(`enemy ATK ${ident.atk}, expected ${expectAtk} (${atkMult}x)`);
if (ident.tier !== 'high') faults.push(`qualityTier ${ident.tier}`);
if (faults.length) { console.error('IDENTITY FAIL:', faults.join('; ')); await ctx.close(); await browser.close(); process.exit(1); }
console.log('identity:', JSON.stringify(ident));

let shot = 0;
const snap = async (label, crop = false) => {
  shot++;
  const p = join(OUT, `${FIGHT}-${DIFF}-${String(shot).padStart(2, '0')}-${label}.png`);
  await page.screenshot({ path: p });
  if (crop) {
    await page.locator('.combat-enemy-row').screenshot({ path: p.replace('.png', '-row.png') }).catch(() => {});
  }
  return p;
};
const findings = async () => page.evaluate(() => {
  const eng = window.__combat?.engine;
  if (!eng) return null;
  const f = eng.getFindings ? eng.getFindings(0) : null;
  const rowText = document.querySelector('.combat-findings')?.textContent || '';
  return f ? { ...f, rowText } : { none: true, rowText };
});

const special = async (name) => {
  const ok = await page.click('.combat-action-btn:text-is("Special")', { timeout: 4000 }).then(() => true).catch(() => false);
  if (!ok) return false;
  await page.waitForTimeout(450);
  const hit = await page.click(`.combat-submenu-item:has-text("${name}")`, { timeout: 3000 }).then(() => true).catch(() => false);
  if (!hit) await page.click('.combat-submenu-item:has-text("Back")').catch(() => {});
  return hit;
};
const waitTurn = async () => {
  // NB: waitForFunction is (fn, ARG, options) — an options object in the
  // second slot is silently treated as the arg and the DEFAULT 30s timeout
  // applies, which a three-enemy round can exceed.
  await page.waitForFunction(
    () => !window.__combat || window.__combat.inputEnabled === true || window.__combat.engine?.isOver,
    undefined, { timeout: 90000 });
  await page.waitForTimeout(250);
};

// The filing loop: an OFF-weakness tagged hit files a Finding; at max the next
// tagged hit closes the file. Pick the first tagged starter whose tag is not
// the enemy's CURRENT weakness (the Pivot can move it mid-fight).
const TAG_BTN = [['audit', 'Spot Check'], ['legal', 'File Motion'], ['social', 'Raise Concerns']];
const ledger = [];
let closeMsgSeen = false;
await snap('boot', true);

for (let t = 1; t <= MAX_TURNS; t++) {
  await waitTurn();
  const alive = await page.evaluate(() => !!window.__combat && !window.__combat.engine?.isOver);
  if (!alive) break;
  const pre = await findings();
  const st = await page.evaluate(() => {
    const eng = window.__combat.engine; const e = eng.enemies[0];
    return { hp: eng.player.hp, maxHP: eng.player.maxHP, mp: eng.player.mp,
      eHP: e?.hp, eMax: e?.maxHP, weakness: e?.weakness || null };
  });
  ledger.push({ turn: t, ...st, findings: pre });
  console.log(`t${t}`, JSON.stringify({ ...st, findings: pre }));
  const lowHP = st.hp / st.maxHP < 0.35;
  if (lowHP) {
    const healed = await special('Coffee Break');
    if (!healed) await page.click('.combat-action-btn:text-is("Attack")').catch(() => {});
  } else {
    const pick = TAG_BTN.find(([tag]) => tag !== st.weakness);
    const used = pick && st.mp >= 14 ? await special(pick[1]) : false;
    if (!used) await page.click('.combat-action-btn:text-is("Attack")').catch(() => {});
  }
  // Multi-enemy fights open a target picker after the ability — Enter takes
  // the cursor's default (first alive enemy). DOM keydown listener, so a
  // plain keyboard.press works here.
  await page.waitForTimeout(350);
  if (await page.evaluate(() => !!document.querySelector('.target-picker-overlay'))) {
    await page.keyboard.down('Enter'); await page.waitForTimeout(90); await page.keyboard.up('Enter');
  }
  // Watch for the Findings delta and snap it mid-beat.
  const before = pre && !pre.none ? pre.count : 0;
  let snapped = false;
  for (let w = 0; w < 30; w++) {
    await page.waitForTimeout(120);
    const now = await findings();
    if (!now) break;
    if (!now.none && now.count !== before) {
      if (now.count < before) {
        await snap(`close-t${t}`, true);
        // The close announcement posts at +320ms on the CONSEQUENCE plate —
        // poll it down before it retires (ttl 1000-2800ms).
        for (let m = 0; m < 15 && !closeMsgSeen; m++) {
          await page.waitForTimeout(200);
          closeMsgSeen = await page.evaluate(() =>
            [...document.querySelectorAll('.combat-message')].some(el => /FILE CLOSED/.test(el.textContent)));
        }
        if (closeMsgSeen) await snap(`close-message-t${t}`, false);
      } else {
        await snap(`file${now.count}-t${t}`, true);
      }
      snapped = true;
      break;
    }
  }
  if (!snapped && (t === 1 || t === 3)) await snap(`t${t}`, true);
  // Did the close message land on the CONSEQUENCE surface?
  if (!closeMsgSeen) {
    closeMsgSeen = await page.evaluate(() =>
      [...document.querySelectorAll('.combat-message')].some(m => /FILE CLOSED/.test(m.textContent)));
    if (closeMsgSeen) await snap('close-message', false);
  }
  // Objection Sustained / Loop In housekeeping so the driver never wedges.
  await page.waitForTimeout(1800);
  const tb = await page.evaluate(() => window.__combat?.engine?.turnBackReady || null);
  if (tb) {
    const b = await page.click('.combat-action-btn:text-is("Brace")', { timeout: 2500 }).then(() => true).catch(() => false);
    if (b) { await page.waitForTimeout(650); await page.keyboard.down('Enter'); await page.waitForTimeout(120); await page.keyboard.up('Enter'); }
  }
  const loop = await page.evaluate(() => !!document.querySelector('.loop-in-overlay'));
  if (loop) { await page.keyboard.down('Escape'); await page.waitForTimeout(80); await page.keyboard.up('Escape'); }
  await page.waitForTimeout(2400);
}
const last = await page.evaluate(() => window.__combat?.engine
  ? { over: window.__combat.engine.isOver, result: window.__combat.engine.result }
  : { over: true, result: 'ended (state popped)' });
await snap('final', true);
const summary = { mode: MODE, fight: FIGHT, level: LEVEL, difficulty: DIFF, identity: ident,
  closeMsgSeen, last, pageErrors: errors };
writeFileSync(join(OUT, `${FIGHT}-${DIFF}-ledger.json`), JSON.stringify({ summary, ledger }, null, 1));
console.log('SUMMARY', JSON.stringify(summary, null, 1));
await ctx.close(); await browser.close();
if (has('video')) {
  const vids = readdirSync(OUT).filter(f => f.endsWith('.webm'));
  if (vids.length) {
    const newest = vids.map(f => ({ f, t: statSync(join(OUT, f)).mtimeMs })).sort((x, y) => y.t - x.t)[0].f;
    const want = `${FIGHT}-${DIFF}-fight.webm`;
    if (newest !== want) renameSync(join(OUT, newest), join(OUT, want));
    console.log('video ->', join(OUT, want));
  }
}
console.log('done ->', OUT);
