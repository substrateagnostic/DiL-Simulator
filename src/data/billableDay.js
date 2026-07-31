// THE BILLABLE DAY — run structure for the Reception roguelite loop.
//
// Design source: .claude/plans/research-gameplay-comps.md, Part 2.
//   P2.1 — split the currency ledger by scope. Billable Hours are RUN-scoped
//          (earned per client, spent between clients, evaporate at 5:15).
//          AUM stays META-scoped but is held in escrow until the day closes,
//          so losing mid-day costs the day's billing without touching
//          permanent progress (XP, book of business, personal bests).
//   P2.2 — hold costs flat, escalate the requirement. Boon prices are fixed
//          all day; the clients get harder with each slot.
//   P2.4 — bosses break a rule instead of raising a stat. The subtractive
//          mutators below take something away from Andrew (information,
//          a damage tag, items) rather than inflating the client.
//   P2.6 — a hard clock. A day is 3-5 clients, roughly 10-15 minutes, and
//          it ends on its own at 5:15.
//
// Everything numeric lives in DAY_BALANCE and is overridable from
// balance.json (key: "billableDay") the same way stats.js and shop.js work,
// so the editor can tune the day without a code change.

import _balance from './balance.json' with { type: 'json' };

// ── Tunables ────────────────────────────────────────────────────────────────

export const DAY_BALANCE = {
  // Day composition. minClients/maxClients are the absolute clamp; the real
  // board length comes from partyDayLength below.
  minClients: 3,
  maxClients: 6,

  // Escalation per slot beyond the first (slot 0 is unscaled).
  // Applied multiplicatively to the generated client's combat stats.
  // Sim-tuned. Re-measured with `node tools/day-sim.mjs --slots --days 300`
  // against the real CombatEngine and the real ClientGenerator (competent
  // policy, levels 4/6/8). As shipped:
  //
  //   party        slot0   slot1   slot2   slot3   slot4   full day
  //   solo         93-96%  83-90%  74-79%  67-70%    -     51-57%
  //   + one ally   99-100% 96-99%  93-97%  88-91%  71-85%  78-85%
  //   + two allies 99-100% 99-100% 97-99%  94-96%  84-89%  72-79%
  //
  // Every rung is now inside the 40-85% fairness band. It got there on TWO
  // dials, not one — see partyEscalationScale and partyDayLength below.
  // Steeper per-step values (the first pass ran hp 0.18 / atk 0.12) collapsed
  // the closer to a 25% win rate and made the day unclearable at every level.
  hpPerStep: 0.09,
  atkPerStep: 0.05,
  defPerStep: 0.05,
  spdPerStep: 0.03,
  xpPerStep: 0.15,
  // The last client of a day is the Close of Business — an extra bump on top
  // of its slot escalation, and it always carries at least one mutator.
  closingHpBonus: 0.10,
  closingAtkBonus: 0.05,

  // ── Party scaling ──────────────────────────────────────────────────────
  // One dial, both ends of the fairness band. Before this dial existed, solo
  // Andrew closed a full day 29-54% of the time (below the 40-85% band at its
  // low end) while a two-ally party closed 85-98% (above it at the top), and
  // "recruit the party" was written in the docs as the intended answer with
  // nothing in the game saying so before a five-client escrow was staked.
  //   partyEscalationScale[n] multiplies the per-slot escalation for a party of
  //   n allies (0 = Andrew alone). Solo gets a shallower climb; a full bench
  //   gets a steeper one, so bringing people is a real trade instead of a
  //   difficulty-off switch.
  //
  // STAT ESCALATION IS THE WRONG LEVER FOR A FULL BENCH, and the sweep says so
  // out loud. `node tools/day-sim.mjs --pscale 1.35,1.90,2.40` moves the
  // two-ally full-day clear at L8 by less than two points across the whole
  // range (96.4% / 98.0% / 94.4%) while the same sweep drags solo from 46% to
  // 37%. Three combatants beat a stat block regardless of how big the stat
  // block is — what a party does not beat is the CLOCK. So the second dial is
  // day LENGTH, per P2.6: the run has to be able to end before attrition alone
  // decides it, and a bench that clears every fight should be asked to clear
  // more of them.
  //   partyDayLength[n] = [min, max] clients booked for a party of n allies.
  //   Solo tops out at 4 (a five-client solo board was mostly a test of whether
  //   attrition ran out first); a full bench is booked 4-6 and pays for all of
  //   them. Clamped to minClients/maxClients so a balance.json override cannot
  //   produce an impossible board.
  //
  // Both dials, re-derived together (`--pscale` sweep, 250 days/cell, then a
  // 400-day confirmation run). With the length dial in place the escalation
  // rungs that put every party size inside the 40-85% band are 0.72 / 1.60 /
  // 2.60 — the two-ally rung has to be that steep precisely because length is
  // doing most of the work up there and stats are doing almost none.
  partyEscalationScale: [0.72, 1.60, 2.60],
  partyDayLength: [[3, 4], [3, 5], [4, 6]],

  // Escalate the REQUIREMENT, not just the stat block (report P2.2). Each slot
  // sets a minimum asset tier, expressed as a fraction of the wealth ceiling
  // for the current game phase (25M pre-post-game, 100M after). Without this
  // a slot-4 Retiree can be softer than a slot-1 Family Dynasty and the day
  // stops reading as a climb. Also raises the fee — a harder client pays more.
  assetFloorPerStep: 0.06,
  assetFloorMax: 0.30,
  assetFloorTries: 12,

  // Billable Hours awarded per cleared client
  hoursBase: 6,
  hoursCleanFile: 3,      // finished at or above cleanFileHP of max Patience
  hoursEfficient: 2,      // finished within efficientTurns rounds
  hoursUnderBudget: 2,    // used no items
  hoursPerStep: 1,        // later clients bill more
  cleanFileHP: 0.75,
  efficientTurns: 6,

  // ── Closing premium ────────────────────────────────────────────────────
  // The escrow used to bank at face value: exactly the AUM the same clients
  // would have paid as walk-ins, minus the forfeit risk, minus the full heal,
  // minus the escalation. Measured with tools/day-sim.mjs at a 1.00 premium,
  // a level-4 solo day banked ~0.67x what walk-in spam banked per fight — the
  // staked mode paid LESS than the safe one, which inverts the whole point of
  // P2.1 (run currency exists to create pressure that meta currency rewards).
  //
  // The bell now pays a premium on everything in escrow:
  //   base            for closing the day at all — the forfeit risk was real
  //   perfect         every client on the board signed, not just survived
  //   unbilled hours  Balatro's interest analogue (P2.2): the SHARE of the
  //                   day's Hours you did not spend on boons pays out, so
  //                   "buy safety" vs "bank it" is a live decision on every
  //                   between-clients screen.
  //
  // The hoard bonus is a RATIO, not a per-hour rate. A flat rate with a cap
  // measured out at a constant +0.20 in every single simulated day (a day
  // earns 30-50 Hours and even an aggressive spender ends above any sane cap),
  // which is a dial that never moves — the exact "free win" this was supposed
  // to avoid. Against hoursEarned it is always live: spend everything and get
  // nothing, spend nothing and get the full closingPremiumHoard.
  closingPremiumBase: 1.20,
  closingPremiumPerfect: 0.15,
  closingPremiumHoard: 0.20,

  // Attrition. Inside a day, a reception victory does NOT fully restore
  // Patience/Coffee — that is what makes the heal boon and the escalation
  // curve mean anything. Walk-in mode and every story fight are untouched.
  victoryHealPct: 0.20,

  // Mutator schedule. Slot 0 is always clean (the day has to teach itself).
  // From mutatorFirstSlot on, each slot rolls for one; the closer is forced.
  mutatorFirstSlot: 1,
  mutatorChance: 0.45,
  mutatorChanceClosing: 1.0,
  // One mutator on a mid-day client; the Close of Business may stack two.
  // maxMutatorsPerClient used to be a flat 1, which made the draw loop in
  // rollDayMutators vestigial (it could only ever run once). The closer is
  // where a second constraint is legible, so that is where it lives.
  maxMutatorsPerClient: 1,
  maxMutatorsClosing: 2,
  // Chance the closer actually takes the second one, so it stays an event
  // rather than a rule.
  secondMutatorChanceClosing: 0.40,
};

// Apply balance.json overrides (set via `npm run editor`)
if (_balance.billableDay) Object.assign(DAY_BALANCE, _balance.billableDay);

// ── Day boons ───────────────────────────────────────────────────────────────
// Bought between clients with Billable Hours. `apply` mutates the player and
// the day record and returns a short confirmation string for the toast.
//
// Kinds:
//   'instant'   — resolves immediately (heal, item)
//   'day_stat'  — permanent-for-the-day stat change, reverted at close
//   'next'      — arms a flag consumed when the next client is generated
//
// TEXT: names and descriptions are wired verbatim from the Opus 4.6 draft.

export const DAY_BOONS = [
  {
    id: 'second_cup',
    name: 'Second Cup',
    desc: 'Restores 40% max Patience and 25% max Coffee, sourced from the fourth-floor Keurig.',
    cost: 6,
    kind: 'instant',
    repeatable: true,
  },
  {
    id: 'assert_yourself',
    name: 'Firm Handshake',
    desc: 'Adds +3 Assertiveness through close of business per the Q3 development plan.',
    cost: 10,
    kind: 'day_stat',
    stat: 'atk',
    amount: 3,
    repeatable: true,
  },
  {
    id: 'deep_breath',
    name: 'Deep Breath',
    desc: '+3 Composure for the rest of the day, per the wellness memo no one else read.',
    cost: 9,
    kind: 'day_stat',
    stat: 'def',
    amount: 3,
    repeatable: true,
  },
  {
    id: 'peek_calendar',
    name: 'Calendar Peek',
    desc: "Reveals the next client's full stats and restrictions before they sit down.",
    cost: 5,
    kind: 'next',
    field: 'revealNext',
    repeatable: false,
  },
  {
    id: 'reschedule',
    name: 'Reschedule',
    desc: 'Bumps the next client and pulls a different appointment from the waitlist.',
    cost: 8,
    kind: 'next',
    field: 'rerollNext',
    repeatable: false,
  },
  {
    id: 'expense_report',
    name: 'Expense Report',
    desc: 'Requisitions one random consumable from the third-floor supply room.',
    cost: 7,
    kind: 'instant',
    repeatable: true,
  },
];

// Consumables the Expense Report boon can draw from (ids from ITEMS in stats.js)
export const EXPENSE_REPORT_POOL = [
  'coffee_large', 'antacid', 'stress_ball', 'energy_drink', 'compliance_manual',
];

// ── Subtractive client mutators ─────────────────────────────────────────────
// Balatro Boss Blind model (report P2.4): attack the assumption the player's
// plan rests on instead of raising a stat. Each is enforced in CombatState.
//
// `subtractive: true` distinguishes these from the three additive mutators
// already generated by ClientGenerator (thorns / volatile / compound).

export const DAY_MUTATORS = [
  {
    id: 'under_nda',
    label: 'Under NDA',
    desc: "You cannot see the client's telegraph while the NDA is in effect.",
    subtractive: true,
  },
  {
    id: 'retained_counsel',
    label: 'Retained Counsel',
    desc: 'All legal-tagged abilities are disabled while opposing counsel is present.',
    subtractive: true,
  },
  {
    id: 'expense_freeze',
    label: 'Expense Freeze',
    desc: 'Accounting has frozen your expense account for this engagement.',
    subtractive: true,
  },
  {
    // Was "a second phase with a heavier ability pool at 50% HP" — which is a
    // stat check wearing a subtractive badge. This is the report's named
    // version: it takes Andrew's momentum instead of adding to the client.
    id: 'escalation_clause',
    label: 'Escalation Clause',
    desc: "While this client is present, Andrew's Confidence decays by 10 each turn.",
    combatLine: 'The client has invoked the escalation clause. Andrew can feel his momentum leaving.',
    subtractive: true,
  },
];

export const DAY_MUTATORS_BY_ID = Object.fromEntries(DAY_MUTATORS.map(m => [m.id, m]));

// ── Diane / UI copy ─────────────────────────────────────────────────────────
// Diane runs reception. Voice anchor: August Wilson character — seen-everything
// dignity, complete unhurried sentences, kindness with a paper trail.
// Wired verbatim from the Opus 4.6 draft; do not paraphrase in code.

export const DAY_TEXT = {
  diane: {
    day_offer: 'I have a full day booked if you want the hours. Or I can send the next walk-in back whenever you are ready.',
    day_start: 'I have {n} on your calendar today. I will send them back one at a time.',
    day_midway: 'You have {left} remaining on the day. I will hold the next one until you are ready.',
    day_final_client: 'This is your last appointment. After this one, I ring the bell and your day closes.',
    bell: 'It is five-fifteen. {aum} banked for the day. I have already filed the summary.',
    bell_perfect: 'It is five-fifteen and every one of them signed. {aum} banked. I do not get to say that often, and I have been at this desk eleven years.',
    day_forfeit: "The day's billing is void. Your AUM does not carry over when an appointment goes that way. It is in the handbook.",
    day_abandon: 'You are walking away with appointments still on the books. The day\'s AUM is voided, same as any incomplete day.',
    walk_in: 'Walk-in it is. I will send them back.',
    day_resume: 'You still have {left} on the schedule. I kept your place.',
    // Shown on the board before a solo player stakes a day. Nothing in the game
    // said this out loud before; "recruiting the party is the intended answer"
    // was written only in Gameplay.md, which is not where the escrow is staked.
    solo_warning: 'You are booking a full day with no one backing you up. I am not going to tell you that is a bad idea, but I am going to note in the log that I said this to you, and the time I said it.',
    // Said at the bell the first time a day closes with a premium on it, so
    // the reason the staked mode pays more is stated out loud by a person
    // rather than inferred from a table.
    premium: 'The whole day pays out better than the parts would individually. I have watched the numbers long enough to know that is not an accident.',
  },
  ui: {
    board_title: 'DAILY ROSTER',
    board_subtitle: 'Vaults Fargo offers two ways to fill a business day.',
    between_title: 'BETWEEN APPOINTMENTS',
    between_subtitle: 'Billable Hours expire at 5:15 PM without exception.',
    summary_title: 'CLOSING BELL',
    summary_subtitle: "A complete accounting of the day's appointments and revenue.",
    hours_label: 'Billable Hours',
    forfeit_warning: 'All AUM earned today will be voided. This cannot be reversed.',
    boon_sold_out: 'Already Requisitioned',
    cannot_afford: 'Insufficient Hours',
    // Day-scoped stat boons are suspended off the Reception floor.
    boon_floor_only: 'Authorized for Reception floor engagements only',
    boons_suspended: 'Billable day benefits suspended. These supplements are authorized for Reception floor use only.',
    boons_resumed: 'Billable day benefits reinstated. Supplements are active for the remainder of the engagement cycle.',
    // Closing-bell premium breakdown (see closingPremiumParts).
    premium_escrow: 'Gross Day Receipts',
    premium_multiplier: 'Closing Adjustment Factor',
    premium_base: 'Board Completion Adjustment',
    premium_perfect: 'Full Conversion Supplement',
    premium_hoard: 'Discretionary Hours Retention',
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Roll how many clients are on today's board.
 * `partySize` is the number of ALLIES (0 = Andrew alone). Length is the second
 * fairness dial: a solo day is capped shorter (a five-client solo board is
 * mostly a test of whether attrition ran out first), a full bench is booked
 * longer (stat escalation barely touches three combatants — see
 * DAY_BALANCE.partyEscalationScale).
 */
export function dayLengthRange(partySize = 0) {
  const table = DAY_BALANCE.partyDayLength;
  const floor = DAY_BALANCE.minClients;
  const ceil = DAY_BALANCE.maxClients;
  let lo = floor;
  let hi = ceil;
  if (Array.isArray(table) && table.length > 0) {
    const row = table[Math.max(0, Math.min(table.length - 1, partySize))];
    if (Array.isArray(row) && row.length === 2) { lo = row[0]; hi = row[1]; }
  }
  lo = Math.max(floor, Math.min(ceil, lo));
  hi = Math.max(lo, Math.min(ceil, hi));
  return [lo, hi];
}

export function rollDayLength(partySize = 0) {
  const [lo, hi] = dayLengthRange(partySize);
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/** Escalation multiplier for a party of `partySize` allies. */
export function partyEscalationScale(partySize = 0) {
  const table = DAY_BALANCE.partyEscalationScale || [1];
  const i = Math.max(0, Math.min(table.length - 1, partySize));
  return table[i] ?? 1;
}

/**
 * Escalation step for slot `index` of a `total`-client day.
 * Slot 0 returns 0; the closer returns total - 1.
 */
export function escalationStep(index) {
  return Math.max(0, index);
}

/**
 * Roll the subtractive mutators for a client in slot `index` of `total`.
 * The first slot is always clean; the closer always carries one.
 */
export function rollDayMutators(index, total) {
  if (index < DAY_BALANCE.mutatorFirstSlot) return [];
  const closing = index >= total - 1;
  const chance = closing ? DAY_BALANCE.mutatorChanceClosing : DAY_BALANCE.mutatorChance;
  if (Math.random() >= chance) return [];
  const picked = [];
  const pool = [...DAY_MUTATORS];
  // How many the slot may draw. Only the closer can ever ask for two, and it
  // still has to roll for the second — otherwise the loop below could never
  // iterate and the whole draw was a one-shot dressed as a loop.
  let n = Math.max(1, DAY_BALANCE.maxMutatorsPerClient);
  if (closing) {
    const cap = Math.max(n, DAY_BALANCE.maxMutatorsClosing || n);
    if (cap > n && Math.random() < (DAY_BALANCE.secondMutatorChanceClosing ?? 0)) n = cap;
  }
  for (let i = 0; i < n && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const [m] = pool.splice(idx, 1);
    picked.push({ id: m.id, label: m.label, desc: m.desc, subtractive: true });
  }
  return picked;
}

/**
 * Billable Hours earned for clearing a client.
 * `perf` comes from CombatState's victory snapshot (taken before the heal).
 */
export function computeHours(perf = {}, index = 0) {
  const B = DAY_BALANCE;
  const parts = [];
  let hours = B.hoursBase;
  parts.push({ label: 'Meeting billed', value: B.hoursBase });

  const step = escalationStep(index);
  if (step > 0 && B.hoursPerStep > 0) {
    const bonus = step * B.hoursPerStep;
    hours += bonus;
    parts.push({ label: 'Escalation', value: bonus });
  }
  if ((perf.hpRatio ?? 0) >= B.cleanFileHP) {
    hours += B.hoursCleanFile;
    parts.push({ label: 'Clean file', value: B.hoursCleanFile });
  }
  if ((perf.turns ?? 99) <= B.efficientTurns) {
    hours += B.hoursEfficient;
    parts.push({ label: 'Inside the hour', value: B.hoursEfficient });
  }
  if ((perf.itemsUsed ?? 0) === 0) {
    hours += B.hoursUnderBudget;
    parts.push({ label: 'Under budget', value: B.hoursUnderBudget });
  }
  return { hours, parts };
}

/**
 * Multiplier applied to escrowed AUM at the 5:15 bell.
 * Returns 1 for a day that did not actually close (forfeit / walk-off), so the
 * caller can use it unconditionally.
 *
 * Breakdown is returned alongside the number so the closing summary can show
 * the player WHY they got paid what they got paid — a premium nobody can see
 * is the same as no premium.
 */
export function closingPremiumParts(day) {
  const B = DAY_BALANCE;
  if (!day || (day.served || 0) < (day.total || 0) || (day.total || 0) <= 0) {
    return { multiplier: 1, parts: [] };
  }
  const parts = [];
  let mult = B.closingPremiumBase;
  parts.push({ label: DAY_TEXT.ui.premium_base, value: B.closingPremiumBase - 1 });

  if ((day.signed || 0) >= (day.total || 0)) {
    mult += B.closingPremiumPerfect;
    parts.push({ label: DAY_TEXT.ui.premium_perfect, value: B.closingPremiumPerfect });
  }
  const hours = Math.max(0, day.hours || 0);
  const earned = Math.max(1, day.hoursEarned || hours);
  const ratio = Math.min(1, hours / earned);
  const hourBonus = Math.round(ratio * B.closingPremiumHoard * 100) / 100;
  if (hourBonus > 0) {
    mult += hourBonus;
    parts.push({
      label: DAY_TEXT.ui.premium_hoard,
      detail: `${hours} of ${earned} hours unbilled`,
      value: hourBonus,
    });
  }
  return { multiplier: Math.round(mult * 100) / 100, parts };
}

/** Just the number. */
export function closingPremium(day) {
  return closingPremiumParts(day).multiplier;
}

/** True if this client's mutator list disables the given rule. */
export function dayMutatorActive(mutators, id) {
  return Array.isArray(mutators) && mutators.some(m => m && m.id === id);
}

// ── Day record ──────────────────────────────────────────────────────────────
// The whole run lives in one player flag, `dayState`. Flags are already
// JSON-serialized by Player.serialize(), so an interrupted day survives a save
// and a reload with no schema change and no migration: an old save simply has
// no `dayState` key, getFlag() returns false, and readDay() returns null.

export const DAY_FLAG = 'dayState';

/** Read the in-progress day, or null. Tolerates a corrupt/legacy value. */
export function readDay(player) {
  const raw = player?.getFlag?.(DAY_FLAG);
  if (!raw || typeof raw !== 'object' || !raw.active) return null;
  return raw;
}

/** Persist the day record. */
export function writeDay(player, day) {
  player.setFlag(DAY_FLAG, day);
}

/** Remove the day record entirely. */
export function clearDay(player) {
  player.setFlag(DAY_FLAG, null);
}

/** A fresh day record. `dayNumber` is 1-based and counts completed days + 1. */
export function newDay(dayNumber, total, player, partySize = 0) {
  return {
    active: true,
    dayNumber,
    total,
    // Pinned at the bell you rang, not at the client you are looking at.
    partySize,
    index: 0,
    served: 0,
    signed: 0,
    declined: 0,
    hours: 0,
    hoursEarned: 0,
    hoursSpent: 0,
    aumPending: 0,
    xpStart: player?.stats?.xp ?? 0,
    tempStats: {},
    // Whether tempStats are currently ADDED to player.stats. Day boons are
    // scoped to the Reception floor, so they are revoked on the way out and
    // re-applied on the way back in; the record of what is owed lives in
    // tempStats either way. A legacy in-flight day has no such key, and
    // `!== false` reads that as "applied", which is what it was.
    statsApplied: false,
    boonsBought: [],
    revealNext: false,
    rerollNext: false,
    lastHours: 0,
    lastHoursParts: [],
    bestAum: 0,
  };
}

/** Total Hours still available to spend. */
export function hoursAvailable(day) {
  return Math.max(0, (day?.hours ?? 0));
}

/** Can this boon be bought right now? Returns a reason string when not. */
export function boonState(day, boon) {
  if (!boon.repeatable && (day.boonsBought || []).includes(boon.id)) return 'bought';
  if (boon.kind === 'next' && day[boon.field]) return 'bought';
  // Nothing left to reveal/reroll once the closer has been fought.
  if (boon.kind === 'next' && day.index >= day.total - 1) return 'unavailable';
  if (hoursAvailable(day) < boon.cost) return 'poor';
  return 'ok';
}

/**
 * Spend Hours on a boon. Mutates `day` and `player`.
 * Returns { ok, message } — message is a short toast line.
 * `helpers.pickItem` returns an item id from EXPENSE_REPORT_POOL (injectable
 * so the caller can seed it in tests).
 */
export function purchaseBoon(player, day, boonId, helpers = {}) {
  const boon = DAY_BOONS.find(b => b.id === boonId);
  if (!boon) return { ok: false, message: 'No such line item.' };
  const state = boonState(day, boon);
  if (state === 'poor') return { ok: false, message: DAY_TEXT.ui.cannot_afford };
  if (state !== 'ok') return { ok: false, message: DAY_TEXT.ui.boon_sold_out };

  day.hours -= boon.cost;
  day.hoursSpent += boon.cost;
  if (!boon.repeatable) day.boonsBought = [...(day.boonsBought || []), boon.id];

  let message = `${boon.name} filed.`;

  if (boon.kind === 'day_stat') {
    const stat = boon.stat;
    player.stats[stat] = Math.max(1, (player.stats[stat] || 0) + boon.amount);
    day.tempStats = { ...(day.tempStats || {}) };
    day.tempStats[stat] = (day.tempStats[stat] || 0) + boon.amount;
    // Boons are only ever bought from the between-clients screen, i.e. on the
    // Reception floor, so they are live the moment they are filed.
    day.statsApplied = true;
    message = `${boon.name}: ${stat.toUpperCase()} +${boon.amount} until 5:15. ${DAY_TEXT.ui.boon_floor_only}`;
  } else if (boon.kind === 'next') {
    day[boon.field] = true;
    message = `${boon.name} filed.`;
  } else if (boon.id === 'second_cup') {
    const hpGain = Math.round(player.stats.maxHP * 0.40);
    const mpGain = Math.round(player.stats.maxMP * 0.25);
    const beforeHP = player.stats.hp;
    const beforeMP = player.stats.mp;
    player.stats.hp = Math.min(player.stats.maxHP, player.stats.hp + hpGain);
    player.stats.mp = Math.min(player.stats.maxMP, player.stats.mp + mpGain);
    message = `Second Cup: +${player.stats.hp - beforeHP} Patience, +${player.stats.mp - beforeMP} Coffee.`;
  } else if (boon.id === 'expense_report') {
    const pick = helpers.pickItem
      ? helpers.pickItem(EXPENSE_REPORT_POOL)
      : EXPENSE_REPORT_POOL[Math.floor(Math.random() * EXPENSE_REPORT_POOL.length)];
    player.addItem(pick, 1);
    message = `Expense Report approved: 1x ${helpers.itemName ? helpers.itemName(pick) : pick}.`;
  }

  return { ok: true, message, boon };
}

// ── Day-scoped stat boons are scoped to the FLOOR, not just the day ────────
//
// Firm Handshake and Deep Breath are repeatable, so a player who banks ~30
// Hours over three clients can stack +9 Assertiveness / +9 Composure. Leaving
// Reception mid-day is explicitly allowed and preserves the board, which meant
// those boons walked out of the room with Andrew and could be spent on a story
// boss or the Act 5 gauntlet — run-scoped power the walk-in economy never
// prices. The day record already stores exactly what to re-apply, so the fix is
// a suspend/resume pair rather than a forfeit: leave the floor and the boons
// switch off, come back and they switch on. The day itself is untouched.

/** True when tempStats are currently added to player.stats. */
export function dayStatsApplied(day) {
  return !!day && day.statsApplied !== false && Object.keys(day.tempStats || {}).length > 0;
}

/** Add the day's banked stat boons to the player. Idempotent. */
export function applyDayStats(player, day) {
  const temp = day?.tempStats;
  if (!player || !temp || typeof temp !== 'object') return false;
  if (day.statsApplied !== false) return false;      // already on
  if (Object.keys(temp).length === 0) { day.statsApplied = true; return false; }
  for (const [stat, val] of Object.entries(temp)) {
    if (typeof val !== 'number') continue;
    if (player.stats[stat] === undefined) continue;
    player.stats[stat] = Math.max(1, player.stats[stat] + val);
  }
  day.statsApplied = true;
  return true;
}

/**
 * Subtract the day's stat boons but KEEP the record of what is owed, so the
 * same boons can be reinstated on return. Idempotent.
 */
export function revokeDayStats(player, day) {
  const temp = day?.tempStats;
  if (!player || !temp || typeof temp !== 'object') return false;
  if (day.statsApplied === false) return false;      // already off
  const had = Object.keys(temp).length > 0;
  for (const [stat, val] of Object.entries(temp)) {
    if (typeof val !== 'number') continue;
    if (player.stats[stat] === undefined) continue;
    player.stats[stat] = Math.max(1, player.stats[stat] - val);
  }
  day.statsApplied = false;
  return had;
}

/**
 * Undo every day-scoped stat boon and forget them. Called when the day closes,
 * is abandoned, or is forfeited on a defeat. Safe to call twice, and safe to
 * call while the boons are already suspended.
 */
export function revertDayStats(player, day) {
  if (!day?.tempStats || typeof day.tempStats !== 'object') return;
  revokeDayStats(player, day);
  day.tempStats = {};
  day.statsApplied = false;
}
