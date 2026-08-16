// _l-fight-ab.mjs — the BEFORE/AFTER fight capture for the balance proposal.
//
// The numbers in `.claude/plans/l-run/BALANCE-PROPOSAL.md` are a claim about
// FEEL, and a table cannot settle feel. This drives one boss at its intended
// level through the SHIPPING path — real menu clicks, real engine, real
// renderer — records video and a per-turn ledger, and does it twice: once on
// the clean tree and once with the proposal applied.
//
//   npm run dev                                    # :5173 must be up
//   node tools/_l-apply.mjs --on                   # apply the proposal
//   node tools/_l-fight-ab.mjs --tag=after  --fight=grandma
//   node tools/_l-apply.mjs --off                  # put the tree back
//   node tools/_l-fight-ab.mjs --tag=before --fight=grandma
//
// CAPTURE LAW, both halves, because both have been violated before:
//  * FIDELITY — `?qtier=high` pins the tier AND switches the adaptive governor
//    off (`setQualityTier` with no `adaptive` flag). The tier and the two
//    groups the degrade ladder hides are SAMPLED EVERY TURN and the run FAILS
//    itself if either moved. A capture left on the governor is not a picture of
//    the game.
//  * IDENTITY — the recipe states the roster it expects and the run fails if
//    the enemy on stage is not the one named. A balance capture that is
//    secretly of a different boss proves nothing about the boss it claims.
//
// The player is NOT pinned. `_judge-live-fight.mjs` sets maxHP to 900 so the
// operator can watch the whole fight; that is exactly the wrong thing here,
// because whether Andrew survives IS the measurement.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readdirSync, statSync, renameSync } from 'fs';
import { join } from 'path';

const arg = (k, d) => { const m = process.argv.find(a => a.startsWith(`--${k}=`)); return m ? m.split('=')[1] : d; };
const PORT = arg('port', '5173');
const TAG = arg('tag', 'before');
const FIGHT = arg('fight', 'grandma');
const FIXTURE = arg('fixture', 'act7');
const MAX_TURNS = Number(arg('turns', '14'));
const OUT = join('screenshots', 'l-run', `${FIGHT}-${TAG}`);
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

await page.goto(`http://localhost:${PORT}/?dev&fixture=${FIXTURE}&fight=${FIGHT}&qtier=high`,
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
// BUILD IDENTITY. A capture is a claim about WHICH BUILD it is, and a preview
// server serves whatever `dist/` happens to hold. Two runs were once tagged
// `before` against an `after` bundle because the tree had been reverted but
// `dist/` had not been rebuilt. Press Advantage's live cost is the cheapest
// observable that separates them: base 40 vs 52, so at level 7 (spd 14) it
// reads 37 on the baseline and 49 with the proposal applied.
const paCost = await page.evaluate(() => window.__combat.engine.getPressAdvantageCost());
const expectOn = TAG.startsWith('after');
const looksOn = paCost >= 45;
if (looksOn !== expectOn) {
  console.error(`BUILD IDENTITY FAIL: tag=${TAG} expects proposal ${expectOn ? 'ON' : 'OFF'}, `
    + `but the served bundle reports Press Advantage cost ${paCost} (>=45 means ON). `
    + 'Rebuild dist/ for the state you are shooting.');
  await ctx.close(); await browser.close(); process.exit(1);
}
console.log(`build identity OK: PressAdvantage=${paCost}, proposal ${looksOn ? 'ON' : 'OFF'}`);

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

const last = await probe();
const live = ledger.filter(r => !r.gone && typeof r.playerHP === 'number');
const lowWater = live.length ? Math.min(...live.map(r => r.playerHP / r.playerMax)) : 1;
const end = live[live.length - 1] || {};
const summary = {
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
