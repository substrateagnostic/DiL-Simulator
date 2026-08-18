// _n-audit.mjs — AUDIT-ON-HARD REWORK instrument (packet §7.3).
//
// The question: Hard buys threat enemy-side (ATK ×1.45) and that prices out
// exactly one Practice Group — Audit's Findings ramp needs turns, and Hard
// takes them away. Measured 42.0 pp lane gap at restructuring_trio@7
// (Audit 44.3 % vs Litigation 86.3 %), uncloseable by ATK dials.
//
// This tool measures candidate accommodations THROUGH THE SHIPPING PATH:
// the knobs live in `DIFFICULTY_MODES.hard.audit` (data, per the mode law),
// are resolved by `Difficulty.auditRamp()`, and are read by the real
// CombatEngine. The harness only writes the data block between arms — the
// same thing a difficulty.js edit would do — and never patches the engine.
//
//   node tools/_n-audit.mjs --explore --runs 400     # candidate arms, failing cells
//   node tools/_n-audit.mjs --lanes --arm A2C5 --runs 600   # full 12-rung 3-lane Hard table
//   node tools/_n-audit.mjs --touch --runs 400       # Easy/Normal/other-lane null checks
//   node tools/_n-audit.mjs --degen --arm A2C5 --runs 600   # degenerate-line hunt
//   node tools/_n-audit.mjs --feel --arm A2C5 --runs 600    # low-water / near-death, audit lane
import { runFight, enc } from './combat-sim.mjs';
import { POLICIES, buildUnlocked, instrument, PARTY, LADDER, initEnemyAbilities } from './_j-verify.mjs';
import { Difficulty } from '../src/core/DifficultyManager.js';
import { DIFFICULTY_MODES } from '../src/data/difficulty.js';
import { PLAYER_ABILITIES } from '../src/data/stats.js';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};
const has = (k) => process.argv.includes(`--${k}`);
const RUNS = Number(arg('runs', 400));
const pct = (x) => (x * 100).toFixed(1) + '%';
const n2 = (x) => x.toFixed(2);
const pad = (s, n) => String(s).padStart(n);

// ── THE CANDIDATE ARMS ──────────────────────────────────────────────────
// base = Hard as the packet measured it. Letters: A = ramp clock (fileRate),
// C = paper-trail assault slow, B = Composure per filing (exploration knob).
export const ARMS = {
  base: null,
  // Round 1 (transient assaultSlow, fileRate on both filing sites):
  // explore-1/2.txt. Round 2 (damage-site fileRate, `_findingsEver` slow):
  // explore-r2a/b.txt. Round 3 (seeded record): explore-r3a/b.txt.
  // The composurePerFiling knob (candidate b) LOST and was stripped from the
  // engine — a B arm run today would silently measure nothing.
  A2: { fileRate: 2 },
  A3: { fileRate: 3 },
  S5: { assaultSlow: 0.05 },
  S6: { assaultSlow: 0.06 },
  P4: { fileRate: 2, assaultSlow: 0.04 },
  P5: { fileRate: 2, assaultSlow: 0.05 },
  P6: { fileRate: 2, assaultSlow: 0.06 },
  P3_6: { fileRate: 3, assaultSlow: 0.06 },
  P6s2: { fileRate: 2, assaultSlow: 0.06, seedRecord: 2 },
  // THE WINNER — baked into difficulty.js's hard bundle 2026-08-17.
  P6s3: { fileRate: 2, assaultSlow: 0.06, seedRecord: 3 },
  P6s5: { fileRate: 2, assaultSlow: 0.06, seedRecord: 5 },
  P5s3: { fileRate: 2, assaultSlow: 0.05, seedRecord: 3 },
};

function withArm(mode, block, fn) {
  const bundle = DIFFICULTY_MODES[mode];
  const prevAudit = bundle.audit;
  if (block) bundle.audit = block; else delete bundle.audit;
  const prevForce = Difficulty.force(mode);
  try { return fn(); } finally {
    Difficulty.force(prevForce);
    if (prevAudit === undefined) delete bundle.audit; else bundle.audit = prevAudit;
  }
}

// ── batch — _j-verify's shape, plus a low-water sampler ─────────────────
function batch(encId, level, treeId, runs, opts = {}) {
  const cfg = enc(encId);
  if (PARTY[encId] && cfg.party.length === 0) cfg.party = [...PARTY[encId]];
  const unlocked = opts.unlocked || buildUnlocked(treeId, level);
  const agg = {
    wins: 0, rounds: 0, hpLeft: 0, supers: 0, breaks: 0, braces: 0,
    compW: 0, compOTH: 0, fizzles: 0, brokenTurns: 0, ucProcs: 0, msjProcs: 0,
    lowWater: 0, nearDeath: 0, timeouts: 0,
  };
  for (let i = 0; i < runs; i++) {
    const st = {
      actions: 0, supers: 0, breaks: 0, braces: 0, perfect: 0, compW: 0, compOTH: 0,
      fizzles: 0, brokenTurns: 0, ucProcs: 0, msjProcs: 0, tags: {}, tagTotal: 0, low: 1,
    };
    const r = runFight(
      { ...cfg, unlocked, pipResist: opts.pipResist || 0 },
      level,
      {
        policy: opts.policy || ((e, s, u) => POLICIES[treeId](e, s, u)),
        onEngine: (e) => {
          instrument(e, st);
          // low-water sampler: after every enemy turn and turn-start tick.
          for (const m of ['enemyTurn', 'processTurnStart']) {
            const real = e[m].bind(e);
            e[m] = (...a) => {
              const out = real(...a);
              const f = e.player.hp / Math.max(1, e.player.maxHP);
              if (f < st.low) st.low = f;
              return out;
            };
          }
        },
      },
    );
    if (r.win) { agg.wins++; agg.hpLeft += r.hpPct; }
    if (r.timeout) agg.timeouts++;
    agg.rounds += r.rounds;
    const lw = r.win ? st.low : 0;
    agg.lowWater += lw;
    if (lw <= 0.25) agg.nearDeath++;
    for (const k of ['supers', 'breaks', 'braces', 'compW', 'compOTH', 'fizzles', 'brokenTurns', 'ucProcs', 'msjProcs']) agg[k] += st[k];
  }
  return {
    win: agg.wins / runs, rounds: agg.rounds / runs,
    hpLeft: agg.wins ? agg.hpLeft / agg.wins : 0,
    supers: agg.supers / runs, breaks: agg.breaks / runs, braces: agg.braces / runs,
    compW: agg.compW / runs, compOTH: agg.compOTH / runs,
    effT: (agg.rounds - agg.fizzles - agg.brokenTurns) / runs,
    uc: agg.ucProcs / runs, msj: agg.msjProcs / runs,
    lowWater: agg.lowWater / runs, nearDeath: agg.nearDeath / runs,
    timeouts: agg.timeouts,
  };
}

// The cells where Hard's audit gap lives (LANES-final HARD block).
const FAIL_CELLS = [
  ['karen', 4], ['chad', 5], ['grandma', 7],
  ['restructuring_trio', 7], ['restructuring_trio', 8],
  ['meredith_boss', 8], ['regional_director', 10],
];

function runExplore() {
  const armNames = (arg('arms', null) || Object.keys(ARMS).join(',')).split(',');
  console.log(`\n=== EXPLORATION — AUDIT LANE ON HARD, PER ARM (${RUNS} runs/cell) ===`);
  console.log('Arms are data blocks on DIFFICULTY_MODES.hard.audit; engine unpatched.');
  for (const name of armNames) {
    if (!(name in ARMS)) { console.log(`unknown arm ${name}`); continue; }
    console.log(`\n-- ${name}  ${JSON.stringify(ARMS[name])}`);
    console.log('encounter              lvl    win  rounds  HP-left  breaks  compW  compOTH  lowW   nearD');
    withArm('hard', ARMS[name], () => {
      for (const [e, lv] of FAIL_CELLS) {
        const r = batch(e, lv, 'audit', RUNS);
        console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ${pad(pct(r.win), 5)}  ${pad(n2(r.rounds), 6)}  `
          + `${pad(pct(r.hpLeft), 7)}  ${pad(n2(r.breaks), 6)}  ${pad(n2(r.compW), 5)}  ${pad(n2(r.compOTH), 7)}  `
          + `${pad(pct(r.lowWater), 5)}  ${pad(pct(r.nearDeath), 5)}`);
      }
    });
  }
}

function runLanes() {
  const name = arg('arm', 'base');
  console.log(`\n=== THE DIVERSITY BAND ON HARD, ARM ${name} ${JSON.stringify(ARMS[name])} (${RUNS} runs/cell) ===`);
  console.log('encounter              lvl   win: lit / comp / audit          band');
  let worst = 0, worstAt = '';
  withArm('hard', ARMS[name], () => {
    for (const [e, lv] of LADDER) {
      const r = ['litigation', 'compliance', 'audit'].map(t => batch(e, lv, t, RUNS));
      const wins = r.map(x => x.win);
      const band = (Math.max(...wins) - Math.min(...wins)) * 100;
      if (band > worst) { worst = band; worstAt = `${e}@${lv}`; }
      console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ` + r.map(x => pad(pct(x.win), 6)).join(' /')
        + `   ${pad(band.toFixed(1) + ' pp', 8)}`);
    }
  });
  console.log(`   MAX BAND: ${worst.toFixed(1)} pp at ${worstAt}`);
}

// ── the null checks: nobody else may move ───────────────────────────────
function runTouch() {
  const name = arg('arm', 'A2C5');
  const cells = [['grandma', 7], ['restructuring_trio', 7], ['meredith_boss', 9]];
  console.log(`\n=== TOUCH TEST — the accommodation may only reach Audit-on-Hard (${RUNS} runs/cell) ===`);
  console.log('Every pair below must sit inside sampler noise (~2-3 pp at these n).');
  // 1. Other lanes on Hard, block off vs on.
  for (const t of ['litigation', 'compliance']) {
    console.log(`\n-- ${t} on HARD, arm base vs ${name}`);
    for (const [e, lv] of cells) {
      const a = withArm('hard', null, () => batch(e, lv, t, RUNS));
      const b = withArm('hard', ARMS[name], () => batch(e, lv, t, RUNS));
      console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ${pad(pct(a.win), 6)} -> ${pad(pct(b.win), 6)}   (${((b.win - a.win) * 100).toFixed(1)} pp)`);
    }
  }
  // 2. Audit on NORMAL and EASY — the bundles carry no audit block, so the
  //    accessor must return identity there whatever the hard bundle says.
  for (const mode of ['normal', 'easy']) {
    console.log(`\n-- audit lane on ${mode.toUpperCase()}, hard block ${name} present vs absent`);
    for (const [e, lv] of cells) {
      const hard = DIFFICULTY_MODES.hard;
      const a = withArm(mode, undefined, () => batch(e, lv, 'audit', RUNS));
      hard.audit = ARMS[name];
      let b;
      try { b = withArm(mode, undefined, () => batch(e, lv, 'audit', RUNS)); } finally { delete hard.audit; }
      console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ${pad(pct(a.win), 6)} -> ${pad(pct(b.win), 6)}   (${((b.win - a.win) * 100).toFixed(1)} pp)`);
    }
  }
}

// ── the degenerate-line hunt ────────────────────────────────────────────
// 1. HOLD-THE-FILE: build to maxF-1 and refuse to close — basic attacks
//    forever, keeping the +8 %/stack ramp and (under C) the assault slow.
//    If this beats the honest close loop, the accommodation built a stall.
// 2. eff.T: the file-close -> super -> Objection Sustained chain (capstone,
//    L10) must not delete the enemy's turn economy.
function holdTheFileTurn(engine, sim, unlocked) {
  engine.telegraph();
  const p = engine.player;
  let ti = -1, hp = Infinity;
  engine.enemies.forEach((e, i) => { if (e.hp > 0 && e.hp < hp) { hp = e.hp; ti = i; } });
  if (ti < 0) return;
  const target = engine.enemies[ti];
  const hpRatio = p.hp / p.maxHP;
  const maxF = unlocked.has('material_weakness') ? 4 : 5;
  const stacks = target._findings || 0;
  if (hpRatio < 0.40 && p.momentum >= 50) { engine.playerSecondWind(); return; }
  if (hpRatio < 0.35 && !p.silencedThisTurn) { engine.playerAbility('coffee_break'); return; }
  if (p.momentum >= 100) { engine.playerPowerMove(ti); return; }
  if (stacks < maxF - 1 && !p.silencedThisTurn && p.mp >= PLAYER_ABILITIES.tie_out.cost && unlocked.has('tie_out')) {
    engine.playerAbility('tie_out', ti); return;   // file up…
  }
  if (sim.coffees > 0 && p.mp < 20) { sim.coffees--; engine.playerItem('coffee_large'); return; }
  engine.playerAttack(ti);                          // …then sit on the file forever
}

function runDegen() {
  const name = arg('arm', 'A2C5');
  console.log(`\n=== DEGENERATE-LINE HUNT, ARM ${name} ${JSON.stringify(ARMS[name])} (${RUNS} runs/cell) ===`);
  console.log('\n-- 1. HOLD-THE-FILE vs the honest close loop (audit lane, HARD)');
  console.log('encounter              lvl   honest win/rounds     hold win/rounds      verdict');
  const cells = [['chad', 6], ['grandma', 8], ['meredith_boss', 9], ['restructuring_trio', 8]];
  withArm('hard', ARMS[name], () => {
    for (const [e, lv] of cells) {
      const hon = batch(e, lv, 'audit', RUNS);
      const hold = batch(e, lv, 'audit', RUNS, { policy: holdTheFileTurn });
      const bad = hold.win > hon.win + 0.02;
      console.log(`${e.padEnd(21)} ${pad(lv, 3)}   ${pad(pct(hon.win), 6)} / ${pad(n2(hon.rounds), 5)}     `
        + `${pad(pct(hold.win), 6)} / ${pad(n2(hold.rounds), 5)}     ${bad ? '*** HOLD WINS — DEGENERATE ***' : 'honest play wins'}`);
    }
  });
  console.log('\n-- 2. THE CHAIN: closes -> supers -> Uc/MSJ + Loop In (audit @10, capstone owned)');
  console.log('   headline counters here; the suppressed-arm eff.T ratio is --efft.');
  console.log('encounter              lvl   eff.T   uc/f   msj/f  breaks   win');
  const chainCells = [['grandma', 10], ['meredith_boss', 10], ['regional_director', 10], ['algorithm', 10], ['restructuring_trio', 10]];
  withArm('hard', ARMS[name], () => {
    for (const [e, lv] of chainCells) {
      const on = batch(e, lv, 'audit', RUNS);
      console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ${pad(n2(on.effT), 6)}  ${pad(n2(on.uc), 5)}  ${pad(n2(on.msj), 5)}  ${pad(n2(on.breaks), 6)}  ${pad(pct(on.win), 6)}`);
    }
  });
}

// eff.T with a clean suppressed-arm baseline (the _j-verify --onemore shape).
function runEffT() {
  const name = arg('arm', 'A2C5');
  console.log(`\n=== EFFECTIVE ENEMY TURNS — audit lane on HARD, arm ${name} (${RUNS} runs/cell) ===`);
  console.log('encounter              lvl   eff.T   vs suppressed   uc/f   msj/f');
  const cells = [['grandma', 10], ['meredith_boss', 10], ['regional_director', 10], ['algorithm', 10], ['restructuring_trio', 10]];
  withArm('hard', ARMS[name], () => {
    for (const [e, lv] of cells) {
      const on = batch(e, lv, 'audit', RUNS);
      // suppressed arm: kill the arming hook before any turn runs
      const supp = (() => {
        const cfg = enc(e);
        if (PARTY[e] && cfg.party.length === 0) cfg.party = [...PARTY[e]];
        const unlocked = buildUnlocked('audit', lv);
        let rounds = 0, fizz = 0, brok = 0;
        for (let i = 0; i < RUNS; i++) {
          const st = { actions: 0, supers: 0, breaks: 0, braces: 0, perfect: 0, compW: 0, compOTH: 0, fizzles: 0, brokenTurns: 0, ucProcs: 0, msjProcs: 0, tags: {}, tagTotal: 0 };
          const r = runFight({ ...cfg, unlocked }, lv, {
            policy: (en, s, u) => POLICIES.audit(en, s, u),
            onEngine: (en) => { instrument(en, st); en._armTurnBack = () => {}; },
          });
          rounds += r.rounds; fizz += st.fizzles; brok += st.brokenTurns;
        }
        return (rounds - fizz - brok) / RUNS;
      })();
      const ratio = supp > 0 ? on.effT / supp : 1;
      console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ${pad(n2(on.effT), 6)}   ${pad(pct(ratio), 8)}       ${pad(n2(on.uc), 5)}  ${pad(n2(on.msj), 5)}`);
    }
  });
}

function runFeel() {
  const name = arg('arm', 'A2C5');
  console.log(`\n=== FEEL — audit lane on HARD, base vs ${name} (${RUNS} runs/cell) ===`);
  console.log('encounter              lvl    win            rounds        low-water      near-death');
  withArm('hard', null, () => { /* warm */ });
  for (const [e, lv] of FAIL_CELLS) {
    const a = withArm('hard', null, () => batch(e, lv, 'audit', RUNS));
    const b = withArm('hard', ARMS[name], () => batch(e, lv, 'audit', RUNS));
    console.log(`${e.padEnd(21)} ${pad(lv, 3)}  ${pad(pct(a.win), 6)}->${pad(pct(b.win), 6)}  `
      + `${pad(n2(a.rounds), 5)}->${pad(n2(b.rounds), 5)}  ${pad(pct(a.lowWater), 6)}->${pad(pct(b.lowWater), 6)}  `
      + `${pad(pct(a.nearDeath), 6)}->${pad(pct(b.nearDeath), 6)}`);
  }
}

// ── isolation runs for the three judge-bait edges ───────────────────────
function runIso() {
  const name = arg('arm', 'P6s3');
  console.log(`\n=== ISOLATION (${RUNS} runs/cell) ===`);

  console.log('\n-- (a) touch outliers, higher n: the knobs are structurally unreachable');
  console.log('   for these lanes (no findings node -> no filing, no seed, ever=0), so any');
  console.log('   delta is sampler variance. Re-drawn at this n to show it.');
  for (const [t, e, lv] of [['litigation', 'grandma', 7], ['compliance', 'restructuring_trio', 7]]) {
    const a = withArm('hard', null, () => batch(e, lv, t, RUNS));
    const b = withArm('hard', ARMS[name], () => batch(e, lv, t, RUNS));
    console.log(`${t} ${e}@${lv}: ${pct(a.win)} -> ${pct(b.win)}  (${((b.win - a.win) * 100).toFixed(1)} pp)`);
  }

  console.log('\n-- (b) HOLD-THE-FILE at trio@8: is the win pre-existing policy shape or the');
  console.log('   accommodation? Same pair under base Hard and under Normal (no block).');
  for (const [label, mode, block] of [['hard+P6s3', 'hard', ARMS[name]], ['hard base', 'hard', null], ['normal', 'normal', undefined]]) {
    const hon = withArm(mode, block, () => batch('restructuring_trio', 8, 'audit', RUNS));
    const hold = withArm(mode, block, () => batch('restructuring_trio', 8, 'audit', RUNS, { policy: holdTheFileTurn }));
    console.log(`${label.padEnd(11)} honest ${pct(hon.win)} / ${n2(hon.rounds)}r   hold ${pct(hold.win)} / ${n2(hold.rounds)}r   `
      + `delta ${((hold.win - hon.win) * 100).toFixed(1)} pp`);
  }

  console.log('\n-- (c) the 1-point cross-lane splash: a completionist litigator (L12) buys');
  console.log('   the findings keystone for 1 point and carries the seed onto Hard.');
  for (const [e, lv] of [['grandma', 7], ['restructuring_trio', 8], ['meredith_boss', 9]]) {
    const pure = withArm('hard', ARMS[name], () => batch(e, lv, 'litigation', RUNS, { unlocked: buildUnlocked('litigation', 12) }));
    const splash = withArm('hard', ARMS[name], () => {
      const u = buildUnlocked('litigation', 12);
      u.add('findings');
      return batch(e, lv, 'litigation', RUNS, { unlocked: u });
    });
    console.log(`${e.padEnd(21)} ${pad(lv, 3)}  pure-lit@12 ${pct(pure.win)} / hp ${pct(pure.hpLeft)}   `
      + `+findings ${pct(splash.win)} / hp ${pct(splash.hpLeft)}   delta ${((splash.win - pure.win) * 100).toFixed(1)} pp`);
  }
}

async function main() {
  await initEnemyAbilities();
  if (has('explore')) runExplore();
  if (has('iso')) runIso();
  if (has('lanes')) runLanes();
  if (has('touch')) runTouch();
  if (has('degen')) runDegen();
  if (has('efft')) runEffT();
  if (has('feel')) runFeel();
  if (!['explore', 'lanes', 'touch', 'degen', 'efft', 'feel'].some(has)) {
    console.log('pick: --explore --lanes --touch --degen --efft --feel   (--arm NAME --runs N)');
  }
}

main();
