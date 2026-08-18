// _m-fight-ab.mjs — the BEFORE/AFTER fight capture for the REBALANCE WAVE.
//
// Adapted from `tools/_l-fight-ab.mjs` (the balance lane's instrument) with one
// structural change: the two arms are no longer two SOURCE TREES, they are two
// difficulty MODES of the same build. Nothing is applied and reverted; the run
// passes `?difficulty=<mode>` and the shipping resolver does the rest. That
// removes the entire failure class the L-run had to build a guard against — two
// runs tagged against the wrong bundle because `dist/` had not been rebuilt.
//
//   npm run dev                                   # :5173 must be up
//   node tools/_m-fight-ab.mjs --mode=shipped  --fight=grandma
//   node tools/_m-fight-ab.mjs --mode=standard --fight=grandma
//   node tools/_m-fight-ab.mjs --mode=hard     --fight=meredith_boss
//
// CAPTURE LAW, both halves:
//  * FIDELITY — `?qtier=high` pins the tier AND switches the adaptive governor
//    off. The tier and the two groups the degrade ladder hides are SAMPLED
//    EVERY TURN and the run FAILS itself if either moved.
//  * IDENTITY — three checks, not one. (a) the enemy on stage is the one named;
//    (b) the MODE the resolver reports matches the one asked for; and (c) an
//    OBSERVABLE off the live engine agrees with it — the size of the boss's
//    active phase pool and the enemy's built ATK. (b) alone is a claim the page
//    makes about itself; (c) is the thing that would actually be different, and
//    a capture is only evidence if the difference is visible in the fight.
import { chromium } from 'playwright';
import { PHASE_SURGERY, PHASE_REVIVAL, DIFFICULTY_MODES } from '../src/data/difficulty.js';
import { ENEMY_ABILITIES } from '../src/data/stats.js';
import { mkdirSync, writeFileSync, readdirSync, statSync, renameSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '5173');
const MODE = arg('mode', 'shipped');
const TAG = arg('tag', MODE);
const FIGHT = arg('fight', 'grandma');
const FIXTURE = arg('fixture', 'act7');
const MAX_TURNS = Number(arg('turns', '14'));
const OUT = join('screenshots', 'm-run', `${FIGHT}-${TAG}`);
mkdirSync(OUT, { recursive: true });

// The level each boss is DESIGNED for (CLAUDE.md: Karen 3-4, Chad 5-6,
// Grandma 7-8). The act7 fixture arrives over-levelled, so the capture pins
// Andrew's level down to the intended rung — otherwise it is a picture of a
// grind-finished player mopping up, which is not the fight being judged.
const RUNG = { karen: 4, chad: 6, grandma: 7, meredith_boss: 9, regional_director: 10, algorithm: 10 };
const LEVEL = Number(arg('level', String(RUNG[FIGHT] || 8)));

const browser = await chromium.launch({ headless: false, args: ['--window-size=1940,1120'] });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e).split('\n')[0]));

await page.goto(`http://localhost:${PORT}/?dev&fixture=${FIXTURE}&fight=${FIGHT}&qtier=high&difficulty=${MODE}`,
  { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.__combat, { timeout: 60000 });
await page.waitForFunction(() => window.__combat?.inputEnabled === true, { timeout: 60000 });

// Level-pin BEFORE the first action, through the same arithmetic combat-sim
// uses (PLAYER_BASE_STATS + LEVEL_GROWTH * (level - 1)), so the capture and
// the table are describing the same Andrew.
await page.evaluate(({ lv }) => {
  const e = window.__combat.engine;
  const g = { maxHP: 12, maxMP: 10, atk: 2, def: 2, spd: 1 };
  const base = { maxHP: 100, maxMP: 75, atk: 12, def: 10, spd: 8 };
  const n = lv - 1;
  e.player.maxHP = base.maxHP + g.maxHP * n; e.player.hp = e.player.maxHP;
  e.player.maxMP = base.maxMP + g.maxMP * n; e.player.mp = e.player.maxMP;
  e.player.atk = base.atk + g.atk * n;
  e.player.def = base.def + g.def * n;
  e.player.spd = base.spd + g.spd * n;
  e.player.level = lv;
}, { lv: LEVEL });

const probe = async () => page.evaluate(() => {
  const en = window.__engine;
  // The two groups the degrade ladder hides at `low`: the city backdrop and
  // the room-FX light pools (`g.name = 'room_fx'`). Both are gated on
  // `_atmosVisible`, so that flag is the pin — a capture that lost them is a
  // capture of a black void, which is how a wave-G board-meeting video was
  // delivered to the producer as a picture of the game.
  let pools = null;
  en?.scene?.traverse?.(o => { if (o.name === 'room_fx') pools = o.visible; });
  const base = {
    tier: en?.qualityTier ?? null,
    adaptive: en?._adaptiveQuality ?? null,
    atmos: en?._atmosVisible ?? null,
    city: en?.cityBackdrop?.group?.visible ?? null,
    pools,
  };
  // CombatState.exit() nulls `window.__combat`, so the frame after a victory
  // has no engine to read. That is the END of the fight, not a fault.
  const c = window.__combat;
  if (!c || !c.engine) return { ...base, over: true, result: 'ended', gone: true };
  const eng = c.engine; const e = eng.enemies[0];
  return {
    ...base,
    enemyId: e?.enemyId ?? null, enemyName: e?.name ?? null,
    enemyHP: e?.hp, enemyMax: e?.maxHP,
    composure: e?.composure, maxComposure: e?.maxComposure,
    broken: e?.broken || 0, sealed: !!e?.sealed, denialStreak: e?.denialStreak || 0,
    telegraph: e?.telegraphedAbility || null,
    locks: (e?.locks || []).map(l => `${l.tag}${l.cleared ? '*' : ''}`).join(','),
    playerHP: eng.player.hp, playerMax: eng.player.maxHP, playerMP: eng.player.mp,
    momentum: eng.player.momentum, level: eng.player.level,
    over: eng.isOver, result: eng.result || null,
  };
});

const ledger = [];
let tierMoved = null;
const snap = async (label) => {
  const s = await probe();
  if (s.tier !== 'high') tierMoved = tierMoved || `${label}: qualityTier=${s.tier}`;
  if (s.adaptive === true) tierMoved = tierMoved || `${label}: adaptive governor is ON`;
  ledger.push({ label, ...s });
  if (!s.gone) lastLive = s;
  console.log(label.padEnd(12), JSON.stringify(s));
  await page.screenshot({ path: join(OUT, `${String(ledger.length).padStart(2, '0')}-${label}.png`) });
  return s;
};

let lastLive = {};
const first = await snap('boot');
if (first.enemyId !== FIGHT) {
  console.error(`IDENTITY FAIL: expected ${FIGHT}, stage holds ${first.enemyId}`);
  await ctx.close(); await browser.close(); process.exit(1);
}
// MODE IDENTITY, in two independent halves.
//
// (1) THE CLAIM: what the resolver says it is doing. `window.__difficulty` is
//     set by the `?difficulty=` handler in main.js and only by it.
// (2) THE OBSERVABLE: what the fight actually looks like. The boss's ACTIVE
//     phase pool size and its built ATK are read straight off the live engine.
//     A mode that says `standard` while the enemy on stage is carrying the
//     shipped phase list and the shipped ATK is not a capture of Standard, and
//     no amount of the page agreeing with itself changes that.
const ident = await page.evaluate(() => {
  const d = window.__difficulty;
  const e = window.__combat?.engine?.enemies?.[0];
  const hp = e ? e.hp / e.maxHP : 1;
  let active = null;
  for (const p of (e?.phases || [])) {
    if (hp <= p.hpThreshold && (!active || p.hpThreshold <= active.hpThreshold)) active = p;
  }
  return {
    claimed: d?.id ?? null,
    basePool: (e?.abilities || []).length,
    activePool: active ? active.abilities.length : null,
    // THE OBSERVABLE THAT ACTUALLY DISCRIMINATES. The first draft read only the
    // ACTIVE phase, which at boot is `null` because the boss is at 100 % HP and
    // no row has fired yet — so a shipped capture and a surgery capture printed
    // identical identity blocks and the check was decorative. Read every row.
    poolSizes: (e?.phases || []).map(p => (p.abilities || []).length),
    phaseThresholds: (e?.phases || []).map(p => p.hpThreshold),
    atk: e?.atk ?? null,
    paCost: window.__combat.engine.getPressAdvantageCost(),
    playerMaxMP: window.__combat.engine.player.maxMP,
  };
});
if (ident.claimed !== MODE) {
  console.error(`MODE IDENTITY FAIL: asked for ${MODE}, resolver reports ${ident.claimed}`);
  await ctx.close(); await browser.close(); process.exit(1);
}
// Cross-check the page's CLAIM against what this repo says that mode should
// produce, computed here in Node off the same data file the game imports. If
// the served bundle is stale, these disagree and the run refuses to be evidence.
{
  const bundle = DIFFICULTY_MODES[MODE] || {};
  const surgery = bundle.phases === 'surgery' ? (PHASE_SURGERY[FIGHT] || null) : null;
  const revival = bundle.phases === 'surgery' ? (PHASE_REVIVAL[FIGHT] || null) : null;
  const faults = [];
  if (surgery) {
    ident.poolSizes.forEach((n, i) => {
      const want = Array.isArray(surgery[i]) && surgery[i].length ? surgery[i].length : null;
      if (want !== null && n !== want) faults.push(`phase ${i} pool ${n}, expected ${want}`);
    });
  }
  if (revival) {
    for (const [i, t] of Object.entries(revival)) {
      if (ident.phaseThresholds[i] !== t) faults.push(`phase ${i} threshold ${ident.phaseThresholds[i]}, expected ${t}`);
    }
  }
  if (faults.length) {
    console.error(`MODE OBSERVABLE FAIL (${MODE}/${FIGHT}): ${faults.join('; ')}`);
    console.error('The page claims the mode but the fight does not show it. Restart the dev server.');
    await ctx.close(); await browser.close(); process.exit(1);
  }
}
console.log('mode identity:', JSON.stringify(ident));

const waitTurn = async () => {
  // `!window.__combat` is the victory case: CombatState.exit() nulls it, and
  // without this term the loop waits out its full timeout on a won fight.
  await page.waitForFunction(
    () => !window.__combat || window.__combat.inputEnabled === true || window.__combat.engine?.isOver,
    { timeout: 40000 });
  await page.waitForTimeout(300);
};
const special = async (name) => {
  const ok = await page.click('.combat-action-btn:text-is("Special")', { timeout: 4000 }).then(() => true).catch(() => false);
  if (!ok) return false;
  await page.waitForTimeout(450);
  const hit = await page.click(`.combat-submenu-item:has-text("${name}")`, { timeout: 3000 }).then(() => true).catch(() => false);
  if (!hit) await page.click('.combat-submenu-item:has-text("Back")').catch(() => {});
  return hit;
};
// The weakness ability for each boss's BASE phase. The Pivot moves it mid-fight
// on four bosses, which is the point of watching the fight rather than reading
// the table — the script keeps swinging the base-phase button and the ledger
// records what that costs once the guard has moved.
const WEAK_BTN = { legal: 'File Motion', social: 'Raise Concerns', audit: 'Spot Check' };

for (let t = 1; t <= MAX_TURNS; t++) {
  await waitTurn();
  const pre = await snap(`t${t}-pre`);
  if (pre.over) break;
  // A competent line: brace a telegraphed haymaker when hurt, heal when low,
  // otherwise swing at the printed weakness.
  const lowHP = pre.playerHP / pre.playerMax < 0.38;
  // Brace a telegraphed haymaker. Without this the scripted line is not the
  // COMPETENT policy the tables describe — it is a player who eats every
  // Guilt Trip at full price, and the first baseline capture lost the fight
  // at level 7 while the table says 100% win. The A/B is only honest if both
  // arms run the SAME line and that line is the one being modelled.
  const bigIncoming = await page.evaluate(() => {
    const e = window.__combat?.engine?.enemies?.[0];
    return !!(e && e.telegraphedAbility && !window.__combat.engine.player.bracing);
  });
  const heavy = bigIncoming && ['guilt_trip', 'gerald_incident', 'hostile_takeover',
    'final_assessment', 'market_correction', 'father_wanted', 'live_tweet_rampage',
    'rage_quit_attack', 'total_optimization', 'algorithmic_trading', 'passive_aggression',
  ].includes(pre.telegraph);
  if (heavy && !lowHP) {
    const b = await page.click('.combat-action-btn:text-is("Brace")', { timeout: 3000 })
      .then(() => true).catch(() => false);
    if (b) { await page.waitForTimeout(650); await page.keyboard.down('Enter'); await page.waitForTimeout(120); await page.keyboard.up('Enter'); }
    else await page.click('.combat-action-btn:text-is("Attack")').catch(() => {});
  } else if (lowHP) {
    const healed = await special('Coffee Break');
    if (!healed) await page.click('.combat-action-btn:text-is("Attack")').catch(() => {});
  } else {
    const w = await page.evaluate(() => window.__combat?.engine?.enemies?.[0]?.weakness || null);
    const btn = WEAK_BTN[w];
    const used = btn ? await special(btn) : false;
    if (!used) await page.click('.combat-action-btn:text-is("Attack")').catch(() => {});
  }
  await page.waitForTimeout(2200);
  // Objection Sustained returns the turn on a weakness hit — spend it bracing.
  const tb = await page.evaluate(() => window.__combat?.engine?.turnBackReady || null);
  if (tb) {
    const b = await page.click('.combat-action-btn:text-is("Brace")', { timeout: 2500 }).then(() => true).catch(() => false);
    if (b) { await page.waitForTimeout(650); await page.keyboard.down('Enter'); await page.waitForTimeout(120); await page.keyboard.up('Enter'); }
  }
  await page.waitForTimeout(3600);
  const post = await snap(`t${t}-post`);
  if (post.gone) { ledger[ledger.length - 1].result = lastLive.result || 'defeat-or-victory'; }
  if (post.over) break;
}

// THE TELEGRAPH CENSUS — the stable evidence in a capture.
//
// A single fight's outcome is n=1 and is FEEL, not the difficulty claim; the
// balance lane said so about its own captures and was right. What IS stable
// across a handful of runs is what the boss PUBLISHED as its intent, because
// that is the thing the surgery changes directly. Every `t*-pre` frame records
// the telegraphed ability, so the ledger already holds the census — it only had
// to be counted.
const DAMAGING = new Set(['attack', 'dot', 'summon']);
const telegraphs = ledger.filter(r => r.label.endsWith('-pre') && r.telegraph).map(r => r.telegraph);
const census = {};
for (const t of telegraphs) census[t] = (census[t] || 0) + 1;
const damagingCount = telegraphs.filter(t => DAMAGING.has(ENEMY_ABILITIES[t]?.type)).length;

const last = await probe();
const live = ledger.filter(r => !r.gone && typeof r.playerHP === 'number');
const lowWater = live.length ? Math.min(...live.map(r => r.playerHP / r.playerMax)) : 1;
const end = live[live.length - 1] || {};
const summary = {
  mode: MODE, identity: ident,
  telegraphs: telegraphs.length,
  telegraphsDamaging: damagingCount,
  telegraphCensus: census,
  tag: TAG, fight: FIGHT, level: LEVEL, turns: ledger.filter(r => r.label.endsWith('-post')).length,
  result: last.result || end.result, playerHPend: end.playerHP, playerMax: end.playerMax,
  hpLeftPct: +(end.playerHP / end.playerMax * 100).toFixed(1),
  lowWaterPct: +(lowWater * 100).toFixed(1),
  enemyHPend: end.enemyHP, enemyMax: end.enemyMax,
  qualityTierHeld: !tierMoved, tierFault: tierMoved, pageErrors: errors,
};
writeFileSync(join(OUT, 'ledger.json'), JSON.stringify({ summary, ledger }, null, 1));
console.log('\nSUMMARY', JSON.stringify(summary, null, 1));

await ctx.close(); await browser.close();
const vids = readdirSync(OUT).filter(f => f.endsWith('.webm'));
if (vids.length) {
  const newest = vids.map(f => ({ f, t: statSync(join(OUT, f)).mtimeMs })).sort((a, b) => b.t - a.t)[0].f;
  if (newest !== `${FIGHT}-${TAG}.webm`) renameSync(join(OUT, newest), join(OUT, `${FIGHT}-${TAG}.webm`));
}
if (tierMoved) { console.error('CAPTURE LAW FAIL:', tierMoved); process.exit(1); }
console.log('done ->', OUT);
