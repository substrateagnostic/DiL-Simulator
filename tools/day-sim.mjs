// day-sim.mjs — the Billable Day economy harness.
//
// Answers the only question that matters about a staked run: does the risky
// mode pay more than the safe one? (report P2.1 — "run currency creates in-run
// pressure … meta currency guarantees every death banks something"). The day
// stakes its AUM in escrow and forfeits it on a mid-day loss; if it does not
// pay a premium over spamming walk-ins, escalation is a negative-EV activity
// and nobody sane engages with it.
//
//   node tools/day-sim.mjs                      # day vs walk-in, all party sizes
//   node tools/day-sim.mjs --days 400 --levels 4,6,8
//   node tools/day-sim.mjs --premium 1.0,1.25,1.4   # sweep the closing bonus
//   node tools/day-sim.mjs --slots                  # per-slot win + full-day clear
//   node tools/day-sim.mjs --whale                  # whale rate + AUM share, day vs walk-in
//   node tools/day-sim.mjs --pscale 1.35,1.75,2.1   # sweep partyEscalationScale[2]
//
// Runs the REAL ClientGenerator against the REAL CombatEngine using the same
// player policy as tools/combat-sim.mjs. Report-only: nothing is written back.

import { competentTurn, runFight, buildPartyOverrides, unlockedAbilities } from './combat-sim.mjs';
import { ENEMY_STATS, PLAYER_ABILITIES } from '../src/data/stats.js';
import { generateClient, generateDayClient } from '../src/data/ClientGenerator.js';
import {
  DAY_BALANCE, DAY_BOONS, rollDayLength, computeHours, dayMutatorActive, closingPremium,
} from '../src/data/billableDay.js';

const pctS = (x) => (x * 100).toFixed(1) + '%';
const money = (n) => '$' + Math.round(n).toLocaleString();

// AUM earned for signing a client — mirrors ExplorationState._onClientDecision.
const feeFor = (client) => Math.max(50, Math.floor(client.assets * 0.01));

// The sim always signs. Accept rate is a player choice orthogonal to the
// day-vs-walk-in comparison, and holding it at 1.0 keeps the two ledgers
// measuring the same thing.

function applyClient(client) {
  Object.assign(ENEMY_STATS.reception_client, { ...client.enemyStats });
}

// Subtractive mutators, enforced the way CombatState enforces them.
function policyFor(mutators) {
  const nda = dayMutatorActive(mutators, 'under_nda');
  if (!nda) return competentTurn;
  // Under NDA the telegraph is sealed, so the policy cannot read Locks or size
  // an incoming hit. Model it by blanking the telegraph after it is rolled.
  return (engine, sim, unlocked) => {
    const realTelegraph = engine.telegraph.bind(engine);
    engine.telegraph = () => {
      realTelegraph();
      for (const e of engine.enemies) { e.locks = []; }
    };
    try { competentTurn(engine, sim, unlocked); }
    finally { engine.telegraph = realTelegraph; }
  };
}

function unlockedFor(level, mutators) {
  const set = unlockedAbilities(level);
  if (dayMutatorActive(mutators, 'retained_counsel')) {
    for (const id of [...set]) {
      if (PLAYER_ABILITIES[id]?.tag === 'legal') set.delete(id);
    }
  }
  return set;
}

// Between-clients boon policy: keep Andrew alive first (Second Cup whenever
// below 70% Patience and affordable), then bank Firm Handshake. A competent
// player does not let Hours expire.
function spendHours(day, state) {
  const cup = DAY_BOONS.find(b => b.id === 'second_cup');
  const hand = DAY_BOONS.find(b => b.id === 'assert_yourself');
  let spent = true;
  while (spent) {
    spent = false;
    if (state.hpPct < 0.70 && day.hours >= cup.cost) {
      day.hours -= cup.cost; day.hoursSpent += cup.cost;
      state.hpPct = Math.min(1, state.hpPct + 0.40);
      state.mpPct = Math.min(1, state.mpPct + 0.25);
      spent = true; continue;
    }
    if (day.hours >= hand.cost) {
      day.hours -= hand.cost; day.hoursSpent += hand.cost;
      state.atkBonus += hand.amount;
      spent = true; continue;
    }
  }
}

function runDay(level, party, opts = {}) {
  const partySize = party.length;
  const total = opts.total ?? rollDayLength(partySize);
  const partyOverrides = buildPartyOverrides(party, level);
  const day = { hours: 0, hoursEarned: 0, hoursSpent: 0, total };
  const state = { hpPct: 1, mpPct: 1, atkBonus: 0 };
  let escrow = 0, escrowCore = 0, served = 0, xp = 0, fights = 0;

  for (let i = 0; i < total; i++) {
    const client = generateDayClient({ index: i, total, playerLevel: level, partySize });
    applyClient(client);
    const muts = client.mutators || [];
    const r = runFight({
      primary: 'reception_client',
      enemyIds: ['reception_client'],
      party, partyOverrides,
      unlocked: unlockedFor(level, muts),
      playerHpPct: state.hpPct,
      playerMpPct: state.mpPct,
      atkBonus: state.atkBonus,
      coffees: dayMutatorActive(muts, 'expense_freeze') ? 0 : 2,
    }, level, { policy: policyFor(muts) });
    fights++;
    if (opts.slotStats) {
      const st = (opts.slotStats[i] ||= { n: 0, w: 0 });
      st.n++; if (r.win) st.w++;
    }
    if (!r.win) {
      // Forfeit: escrow voided, Hours evaporate, permanent progress survives.
      return { cleared: false, banked: 0, bankedCore: 0, escrowLost: escrow, served, fights, total, xp, hoursLeft: day.hours };
    }
    served++;
    escrow += feeFor(client);
    // Whale-free core: a 5% roll at 100-250M assets pays a $1-2.5M fee and
    // dominates the sample mean in both ledgers. Whales occur at the same rate
    // on both sides, so the core column is the stable read and the raw column
    // is the honest one. Report both; never quote only one.
    if (!client.isWhale) escrowCore += feeFor(client);
    xp += r.xp;
    const { hours } = computeHours({ hpRatio: r.hpPct, turns: r.rounds, itemsUsed: r.itemsUsed }, i);
    day.hours += hours; day.hoursEarned += hours;
    // Attrition: a day victory restores only victoryHealPct of max.
    state.hpPct = Math.min(1, r.hpPct + DAY_BALANCE.victoryHealPct);
    state.mpPct = Math.min(1, r.mpPct + DAY_BALANCE.victoryHealPct);
    if (i < total - 1) spendHours(day, state);
  }

  const premium = opts.premiumOverride ?? closingPremium({
    served, total, signed: served, hours: day.hours, hoursEarned: day.hoursEarned,
  });
  return {
    cleared: true,
    banked: Math.round(escrow * premium),
    bankedCore: Math.round(escrowCore * premium),
    raw: escrow,
    premium,
    escrowLost: 0,
    served, fights, total, xp, hoursLeft: day.hours,
  };
}

function runWalkIns(level, party, count) {
  const partyOverrides = buildPartyOverrides(party, level);
  let aum = 0, aumCore = 0, wins = 0, xp = 0;
  for (let i = 0; i < count; i++) {
    const client = generateClient(null, level, false);
    applyClient(client);
    // Walk-in: full heal every time, fee banks on the spot, no forfeit risk.
    const r = runFight({
      primary: 'reception_client', enemyIds: ['reception_client'],
      party, partyOverrides, unlocked: unlockedAbilities(level),
    }, level, { policy: competentTurn });
    if (r.win) {
      wins++; aum += feeFor(client); xp += r.xp;
      if (!client.isWhale) aumCore += feeFor(client);
    }
  }
  return { aum, aumCore, wins, count, xp, winRate: wins / count };
}

function summarize(level, party, days, premiumOverride) {
  let cleared = 0, banked = 0, bankedCore = 0, fights = 0, xp = 0, served = 0, slots = 0;
  let premSum = 0, premN = 0;
  const slotStats = [];
  const perDayFights = [];
  for (let i = 0; i < days; i++) {
    const r = runDay(level, party, { premiumOverride, slotStats });
    if (r.cleared) cleared++;
    banked += r.banked;
    bankedCore += r.bankedCore || 0;
    if (r.cleared) { premSum += r.premium; premN++; }
    fights += r.fights;
    served += r.served;
    slots += r.total;
    xp += r.xp;
    perDayFights.push(r.fights);
  }
  const walk = runWalkIns(level, party, Math.max(600, fights));
  return {
    clearRate: cleared / days,
    aumPerFight: banked / fights,
    aumPerFightCore: bankedCore / fights,
    walkPerFightCore: walk.aumCore / walk.count,
    walkPerFight: walk.aum / walk.count,
    walkWinRate: walk.winRate,
    xpPerFight: xp / fights,
    walkXpPerFight: walk.xp / walk.count,
    avgPremium: premN ? premSum / premN : 1,
    slotWin: slotStats.map(st => (st && st.n ? st.w / st.n : null)),
    avgSlots: slots / days,
    avgServed: served / days,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { flags: new Set(), opts: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { out.opts[a.slice(2)] = next; i++; }
      else out.flags.add(a.slice(2));
    }
  }
  return out;
}

// ── The whale audit ─────────────────────────────────────────────────────
// The published premium table quotes the whale-free core, and for a long time
// that was the ONLY column published — which meant the mode's dominant AUM term
// was undocumented in the mode whose entire justification is a measured risk
// premium (P2.1). Worse, generateDayClient's asset-floor rejection sampling used
// to re-roll the 5% whale chance on every retry, and a whale always clears the
// floor and breaks the loop, so the day side quietly ran at up to 12.35% on the
// late slots against 4-5% for a walk-in. This mode measures the thing directly:
// no combat, no policy, pure generator. It is the regression test for that fix.
function runWhaleAudit(samples, level) {
  const pctS2 = (x) => (x * 100).toFixed(2) + '%';
  console.log(`\n=== WHALE AUDIT — ${samples} samples/cell, L${level} ===`);
  console.log('A day slot must roll whales at the same rate as a walk-in. Any');
  console.log('slot-dependent climb here is rejection-sampling bias, not design.');

  let wWhales = 0, wFees = 0, wWhaleFees = 0;
  for (let i = 0; i < samples; i++) {
    const c = generateClient(null, level, false);
    wFees += feeFor(c);
    if (c.isWhale) { wWhales++; wWhaleFees += feeFor(c); }
  }
  console.log(`\nwalk-in   rate ${pctS2(wWhales / samples).padStart(7)}   whale share of AUM ${pctS2(wWhaleFees / wFees).padStart(7)}   AUM/client ${money(wFees / samples)}`);

  const TOTAL = 5;
  let dWhales = 0, dFees = 0, dWhaleFees = 0;
  console.log('');
  for (let s = 0; s < TOTAL; s++) {
    let n = 0, fees = 0, whaleFees = 0;
    for (let i = 0; i < samples; i++) {
      const c = generateDayClient({ index: s, total: TOTAL, playerLevel: level, partySize: 2 });
      fees += feeFor(c);
      if (c.isWhale) { n++; whaleFees += feeFor(c); }
    }
    dWhales += n; dFees += fees; dWhaleFees += whaleFees;
    console.log(`day slot ${s}  rate ${pctS2(n / samples).padStart(7)}   whale share of AUM ${pctS2(whaleFees / fees).padStart(7)}   AUM/client ${money(fees / samples)}`);
  }
  console.log(`\nexpected whales per ${TOTAL}-slot day : ${(dWhales / samples).toFixed(3)}`);
  console.log(`expected whales per ${TOTAL} walk-ins  : ${(TOTAL * wWhales / samples).toFixed(3)}`);
  console.log(`day whale share of gross AUM      : ${pctS2(dWhaleFees / dFees)}`);
  console.log(`walk-in whale share of gross AUM  : ${pctS2(wWhaleFees / wFees)}`);
}

const PARTIES = [[], ['janet'], ['janet', 'isaiah']];
const label = (p) => p.length === 0 ? 'solo' : p.length === 1 ? '+1 ally' : '+2 allies';

const { flags, opts } = parseArgs(process.argv.slice(2));
const days = parseInt(opts.days || '250', 10);
const levels = (opts.levels || '4,6,8').split(',').map(Number);

if (flags.has('whale') || opts.whale) {
  runWhaleAudit(parseInt(opts.whale || '20000', 10), levels[levels.length - 1]);
} else if (opts.premium) {
  const sweep = opts.premium.split(',').map(Number);
  console.log(`\n=== CLOSING PREMIUM SWEEP — ${days} days/cell ===`);
  console.log('lvl  party       premium   day clear   AUM/fight (day)   AUM/fight (walk-in)   ratio   core ratio');
  for (const lv of levels) {
    for (const party of PARTIES) {
      for (const prem of sweep) {
        const s = summarize(lv, party, days, prem);
        console.log(
          `${String(lv).padStart(3)}  ${label(party).padEnd(10)} ${prem.toFixed(2).padStart(7)}   ` +
          `${pctS(s.clearRate).padStart(9)}   ${money(s.aumPerFight).padStart(15)}   ` +
          `${money(s.walkPerFight).padStart(19)}   ${(s.aumPerFight / s.walkPerFight).toFixed(2).padStart(5)}   ` +
          `${(s.aumPerFightCore / s.walkPerFightCore).toFixed(2).padStart(10)}`
        );
      }
    }
  }
} else if (opts.pscale) {
  // Sweep the party-size escalation dial. `--pscale a,b,c` replaces the value
  // for the party size under test (solo sweeps index 0, +1 ally index 1,
  // +2 allies index 2), so the same command derives every rung of the table in
  // DAY_BALANCE.partyEscalationScale. Report-only: the module constant is
  // restored after each cell and nothing is written back to balance.json.
  const sweep = opts.pscale.split(',').map(Number);
  const base = [...DAY_BALANCE.partyEscalationScale];
  console.log(`\n=== PARTY ESCALATION SWEEP — ${days} days/cell ===`);
  console.log('Target band: full-day clear 40-85% at every party size.');
  console.log('lvl  party       pscale   day clear   slots   AUM/fight (day)   ratio   core ratio');
  for (const lv of levels) {
    for (const party of PARTIES) {
      for (const v of sweep) {
        const next = [...base];
        next[Math.min(next.length - 1, party.length)] = v;
        DAY_BALANCE.partyEscalationScale = next;
        const s = summarize(lv, party, days);
        console.log(
          `${String(lv).padStart(3)}  ${label(party).padEnd(10)} ${v.toFixed(2).padStart(6)}   ` +
          `${pctS(s.clearRate).padStart(9)}   ${s.avgSlots.toFixed(1).padStart(5)}   ` +
          `${money(s.aumPerFight).padStart(15)}   ${(s.aumPerFight / s.walkPerFight).toFixed(2).padStart(5)}   ` +
          `${(s.aumPerFightCore / s.walkPerFightCore).toFixed(2).padStart(10)}`
        );
      }
    }
  }
  DAY_BALANCE.partyEscalationScale = base;
} else if (flags.has('slots')) {
  console.log(`\n=== PER-SLOT WIN RATE + FULL-DAY CLEAR — ${days} days/cell ===`);
  console.log('lvl  party        slot0   slot1   slot2   slot3   slot4   full day');
  for (const lv of levels) {
    for (const party of PARTIES) {
      const s = summarize(lv, party, days);
      const cells = [0, 1, 2, 3, 4].map(i =>
        (s.slotWin[i] === null || s.slotWin[i] === undefined ? '-' : pctS(s.slotWin[i])).padStart(8));
      console.log(`${String(lv).padStart(3)}  ${label(party).padEnd(10)}` + cells.join('') + `   ${pctS(s.clearRate).padStart(7)}`);
    }
  }
} else {
  console.log(`\n=== THE BILLABLE DAY vs WALK-IN SPAM — ${days} days/cell, competent policy ===`);
  console.log('lvl  party       day clear   slots   AUM/fight (day)   AUM/fight (walk-in)   ratio   core ratio   premium   xp ratio');
  for (const lv of levels) {
    for (const party of PARTIES) {
      const s = summarize(lv, party, days);

      console.log(
        `${String(lv).padStart(3)}  ${label(party).padEnd(10)} ${pctS(s.clearRate).padStart(9)}   ` +
        `${s.avgSlots.toFixed(1).padStart(5)}   ${money(s.aumPerFight).padStart(15)}   ` +
        `${money(s.walkPerFight).padStart(19)}   ${(s.aumPerFight / s.walkPerFight).toFixed(2).padStart(5)}   ` +
        `${(s.aumPerFightCore / s.walkPerFightCore).toFixed(2).padStart(10)}   ${s.avgPremium.toFixed(2).padStart(7)}   ` +
        `${(s.xpPerFight / s.walkXpPerFight).toFixed(2).padStart(8)}`
      );
    }
  }
}
