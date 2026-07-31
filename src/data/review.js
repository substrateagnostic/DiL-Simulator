// REVIEW POINTS — the achievement list finally buys something.
//
// Into the Breach's cleanest loop is "achievement → Coin → squad": 70
// achievements, one Coin each, Coins buy new ways to play. TRUST ISSUES has
// 40+ achievements that produce a toast and nothing else.
//
// Ledger design (deliberate):
//   • EARNED is derived, never stored — it is simply the number of unlocked
//     achievements. That makes Review Points retroactive for free: a player
//     who unlocked 22 achievements before this shipped loads the game with 22.
//   • SPENT and OWNED live in localStorage beside the achievement list, NOT in
//     the save file. They therefore survive New Game+, save deletion and slot
//     switching, exactly like the achievements they are earned from — and no
//     existing save has to grow a field to hold them.
//   • Purchases are re-applied onto the player as plain flags on every load
//     (`applyReviewPurchases`), so a brand-new save still owns what you bought.
//
// Values anchor (Balatro / Vampire Survivors / Wordle, per the comps report):
// no dailies, no streaks, no login rewards, no timers, no currency that can be
// lost by not playing. Points are earned by doing the thing, once, forever.

import { AchievementManager } from '../core/AchievementManager.js';

const REVIEW_KEY = 'trust_issues_review';

// ── Catalogue ───────────────────────────────────────────────────────────
// Data-driven: adding an entry here is the whole feature. `flag` is set on the
// player when owned; cosmetics read that flag through their normal unlock path.
export const REVIEW_ITEMS = [
  {
    id: 'rp_appreciation_cert',
    kind: 'cosmetic',
    cost: 3,
    name: 'Certificate of Appreciation',
    description: 'Awarded in lieu of a raise, Q3 2004. Laminated. +3 Composure.',
    flag: 'rp_appreciation_cert',
    cosmeticId: 'appreciation_cert',
  },
  {
    id: 'rp_svp_tumbler',
    kind: 'cosmetic',
    cost: 5,
    name: 'SVP-Grade Tumbler',
    description: 'Vacuum-sealed. Previously restricted to Senior VP and above. +2 Assertiveness, +5 max Coffee.',
    flag: 'rp_svp_tumbler',
    cosmeticId: 'svp_tumbler',
  },
  {
    id: 'rp_overtime',
    kind: 'toggle',
    cost: 6,
    cp: 10,
    name: 'Accelerated Review Cycle',
    description: 'Opposition gains +25% Patience, +25% Assertiveness. Time-and-a-half XP. Toggle at will.',
    flag: 'rp_overtime',
    toggleFlag: 'overtime_active',
  },
  // ── The forgiveness item ────────────────────────────────────────────
  // Hades' God Mode, filed as HR paperwork (report P1.6): +20% damage
  // resistance, +2% per recorded defeat, capped at 80%, locking out ZERO
  // achievements or content. Kasavin's framing — "what if we just make you a
  // little bit tougher?" — is the whole design, and P1.6's rule is that
  // forgiveness ships as a thing you PICK UP, never as a shame slider. So:
  //   • cost 0 — you never pay for the option not to be stuck;
  //   • it is a toggle, reversible at any time, like Overtime;
  //   • it scales off `player.deaths`, which the game already tracks, so it is
  //     strongest exactly for the player who needs it and inert for one who
  //     never lost. Enforced in CombatEngine._calcDamage (PIP_* constants).
  {
    id: 'rp_pip',
    kind: 'toggle',
    cost: 0,
    name: 'Performance Improvement Plan',
    description: 'A structured remediation framework. Reduces incoming damage by 20%, with an additional 2% adjustment per recorded defeat, up to 80%. Filed under Employee Development.',
    flag: 'rp_pip',
    toggleFlag: 'pip_active',
  },
  {
    id: 'rp_memo_pack',
    kind: 'bundle',
    cost: 1,
    repeatable: true,
    name: 'Standard Audit Kit',
    description: 'Contains two Due Diligence Memos and two Stress Balls. May be requisitioned repeatedly.',
    grants: [
      { item: 'due_diligence_memo', quantity: 2 },
      { item: 'stress_ball', quantity: 2 },
    ],
  },
];

// ── STRETCH GOALS — the player-authored difficulty ladder ───────────────
//
// The first shipped version of player-authored difficulty was a single toggle
// that added +25% enemy HP and ATK: additive stat inflation, one bite, no
// ladder. P2.3's load-bearing finding is the opposite shape — Ascension and the
// Pact of Punishment work because they are SUBTRACTIVE (they strip resources,
// information and safety margin rather than inflating enemy numbers) and
// because they escalate in one-bite steps that the player prices themselves.
//
// So: eight subtractive goals, each unlocked once with Review Points (the sink
// the tab was missing — 14 one-time points against a 40+ achievement supply
// meant the currency saturated after about fifteen minutes) and then toggled
// freely at no further cost. Active goals sum a Challenge Point total, and
// Review Level = floor(total / 10), exactly Kaycee's Mod's 10 x N formula.
// Each Review Level unlocks a memo (REVIEW_MEMOS) — the narrative-in-the-ladder
// move, which is the only reward here that cannot inflate the balance.
//
// Every effect is enforced in exactly one place, listed in `where`, so the
// list stays auditable.
export const STRETCH_GOALS = [
  {
    id: 'lean_ops', cost: 3, cp: 10,
    name: 'Lean Operations',
    desc: 'Items may not be used during client engagements per the revised supply policy.',
    where: 'CombatState._handleItem',
  },
  {
    id: 'open_door', cost: 4, cp: 10,
    name: 'Open-Door Policy',
    desc: "Confidence decays by 10 each turn as part of the department's transparency initiative.",
    where: 'CombatEngine.processTurnStart',
  },
  {
    id: 'client_first', cost: 4, cp: 10,
    name: 'Client-First Scheduling',
    desc: 'All opposition acts before Andrew on the first round, consistent with our service-first values.',
    where: 'CombatState._buildRoundQueue',
  },
  {
    id: 'approval_process', cost: 6, cp: 20,
    name: 'Streamlined Toolkit',
    desc: 'Second Wind and Assert Dominance have been removed from your approved action list.',
    where: 'CombatEngine.playerSecondWind / playerPowerMove',
  },
  {
    id: 'routine_inspection', cost: 6, cp: 20,
    name: 'Independent Judgment',
    desc: 'Internal advisory counsel has been reassigned. Andrew will make all decisions without consultation.',
    where: 'CombatEngine.getAvailableVoices',
  },
  {
    id: 'lasting_consequences', cost: 4, cp: 10,
    name: 'Expedited Recovery',
    desc: 'Post-engagement Patience restoration is halved to reduce downtime between appointments.',
    where: 'CombatState victory heal',
  },
  {
    id: 'matrixed', cost: 4, cp: 10,
    name: 'Collaborative Rotation',
    desc: 'Ally participation follows a fixed departmental rotation rather than individual discretion.',
    where: 'CombatEngine._noteLoopIn',
  },
  {
    id: 'summary_briefing', cost: 5, cp: 20,
    name: 'Summary Briefing',
    desc: 'Telegraphed actions display the move name only. Detailed lock information has been redacted.',
    where: 'CombatState._getTelegraphHint',
  },
];

export const STRETCH_BY_ID = Object.fromEntries(STRETCH_GOALS.map(g => [g.id, g]));

/** Points per Review Level (Kaycee's Mod formula: level N needs 10 x N). */
export const REVIEW_LEVEL_STEP = 10;

// Narrative in the ladder. Memo N unlocks at Review Level N and is read from
// the Performance Review tab. Meredith Sterling, SVP — she never names Andrew.
export const REVIEW_MEMOS = [
  {
    level: 1,
    subject: 'Re: Q3 Trust Officer Performance Summary',
    body: 'The new officer in 4471 has filed above the branch median for two consecutive periods. His methods are, to use a word I do not normally reach for, interesting. I have asked Diane to keep a record of his client interactions for my review.',
  },
  {
    level: 2,
    subject: 'Fwd: Branch 4471 — Staffing Alignment',
    body: 'The officer\'s retention numbers remain high, which presents a resource allocation problem we did not anticipate. Please have Compliance pull his onboarding file. I want to confirm the background check covered the full seven years.',
  },
  {
    level: 3,
    subject: 'Branch 4471 — Process Integrity Concern',
    body: 'His client outcomes continue to trend outside the model. This is not a compliment. Outcomes that cannot be reproduced by a replacement are a liability, not a performance indicator. I have scheduled an operational review for next quarter.',
  },
  {
    level: 4,
    subject: 'Re: Re: Fwd: 4471 Succession Planning',
    body: 'To be clear, I am not recommending termination. I am recommending that we develop a transition plan for a role that, on paper, should not require one. The fact that it does is the problem I am asking you to solve before I have to.',
  },
];

export const REVIEW_COPY = {
  title: 'Performance Review',
  blurb: 'Each achievement on your permanent record is worth one Review Point. They do not expire.',
  broke: 'Insufficient Review Points. This exceeds your documented performance.',
  toggleOn: 'Accelerated Review Cycle enabled. The department has adjusted its expectations.',
  toggleOff: 'Accelerated Review Cycle suspended. Standard operating tempo restored.',
  pipOn: 'Performance Improvement Plan filed. HR has been notified. Damage mitigation protocols are now in effect.',
  pipOff: 'Performance Improvement Plan withdrawn. HR notes your confidence. Standard damage protocols restored.',
  owned: '[on file]',
  ladderBlurb: 'Active stretch goals sum to a Review Level. Each level is worth ten points toward your annual evaluation.',
  ladderEarn: 'Review Level is documented upon successful client engagement completion. Selection alone does not constitute a recorded performance metric.',
  levelPending: 'Active review level ({active}) exceeds documented record ({recorded}). Complete a client engagement to formalize the adjustment.',
  levelUpToast: 'Review Level {level} documented. Meredith Sterling has updated her expectations accordingly.',
  stretchTab: 'Stretch Goals',
  memoHeader: 'INTERNAL — SVP OFFICE',
};

// ── Ledger ──────────────────────────────────────────────────────────────
function _load() {
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      spent: Number(parsed?.spent) || 0,
      owned: Array.isArray(parsed?.owned) ? parsed.owned : [],
    };
  } catch {
    return { spent: 0, owned: [] };
  }
}

function _save(ledger) {
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(ledger));
  } catch { /* private browsing / quota — the feature degrades, nothing breaks */ }
}

/** Total Review Points ever earned = achievements ever unlocked. Retroactive. */
export function reviewPointsEarned() {
  return AchievementManager.getUnlockedCount();
}

/** Points available to spend right now. */
export function reviewPointsAvailable() {
  return Math.max(0, reviewPointsEarned() - _load().spent);
}

export function ownsReviewItem(id) {
  return _load().owned.includes(id);
}

/**
 * Buy an item. Returns { ok, reason } — the caller renders the message.
 * Repeatable items may be bought again; the rest are one-time.
 */
export function purchaseReviewItem(id, player) {
  const item = REVIEW_ITEMS.find(i => i.id === id);
  if (!item) return { ok: false, reason: 'missing' };
  const ledger = _load();
  if (!item.repeatable && ledger.owned.includes(id)) return { ok: false, reason: 'owned' };
  if (reviewPointsAvailable() < item.cost) return { ok: false, reason: 'broke' };

  ledger.spent += item.cost;
  if (!ledger.owned.includes(id)) ledger.owned.push(id);
  _save(ledger);

  // Consumable bundles land in the current save; everything else is a flag.
  if (item.grants && player) {
    for (const g of item.grants) player.addItem(g.item, g.quantity);
  }
  applyReviewPurchases(player);
  return { ok: true, item };
}

/**
 * Stamp every owned purchase onto the player as a flag. Idempotent, silent
 * (assigns directly rather than going through setFlag, so loading a save does
 * not fire a storm of flag-set listeners), and safe to call on every load.
 */
export function applyReviewPurchases(player) {
  if (!player) return;
  const owned = _load().owned;
  for (const item of REVIEW_ITEMS) {
    if (item.flag && owned.includes(item.id)) player.flags[item.flag] = true;
  }
  // Owning the authorization is not the same as working the hours: a toggle
  // the player never requisitioned can never be active.
  for (const item of REVIEW_ITEMS) {
    if (item.kind === 'toggle' && item.flag && item.toggleFlag && !player.flags[item.flag]) {
      delete player.flags[item.toggleFlag];
    }
  }
  // Same rule for the stretch ladder: a goal that is not unlocked in the
  // ledger cannot be running, even if a stale save flag says otherwise.
  for (const g of STRETCH_GOALS) {
    if (!owned.includes(`sg_${g.id}`)) delete player.flags[`stretch_${g.id}`];
  }
}

/**
 * Flip any owned `kind: 'toggle'` review item (Overtime, the PIP).
 * Returns the new state, or null when the player doesn't own it.
 */
export function toggleReviewItem(player, id) {
  const item = REVIEW_ITEMS.find(i => i.id === id);
  if (!player || !item?.toggleFlag || !player.getFlag(item.flag)) return null;
  const next = !player.getFlag(item.toggleFlag);
  player.setFlag(item.toggleFlag, next);
  return next;
}

/** Flip Overtime. Returns the new state, or null if the player doesn't own it. */
export function toggleOvertime(player) {
  return toggleReviewItem(player, 'rp_overtime');
}

// ── The Performance Improvement Plan ─────────────────────────────────────
// Hades' God Mode numbers exactly: 20% floor, +2% per recorded defeat, 80% cap.
export const PIP_BASE = 0.20;
export const PIP_PER_DEATH = 0.02;
export const PIP_CAP = 0.80;

/**
 * Fraction of incoming damage the PIP removes, 0 when it is off or unowned.
 * `deaths` is `player.deaths`, which the game has always tracked.
 */
export function pipResistance(player) {
  if (!player?.getFlag?.('rp_pip') || !player.getFlag('pip_active')) return 0;
  const deaths = Math.max(0, Number(player.deaths) || 0);
  return Math.min(PIP_CAP, PIP_BASE + PIP_PER_DEATH * deaths);
}

// ── Stretch goal ledger ─────────────────────────────────────────────────
// Unlocks live in the same localStorage ledger as the rest of the Review tab
// (they are bought with achievements, so they belong beside the achievements).
// The ACTIVE set lives on the player, because which goals you are running is a
// property of this save's current fight, not of your permanent record.
// New saves start with nothing active; old saves have no `stretch_*` flags and
// therefore run exactly as they always did.

const STRETCH_FLAG = (id) => `stretch_${id}`;

export function stretchUnlocked(id) {
  return _load().owned.includes(`sg_${id}`);
}

/** Buy the permanent unlock. Returns { ok, reason }. */
export function unlockStretchGoal(id) {
  const goal = STRETCH_BY_ID[id];
  if (!goal) return { ok: false, reason: 'missing' };
  const ledger = _load();
  const key = `sg_${id}`;
  if (ledger.owned.includes(key)) return { ok: false, reason: 'owned' };
  if (reviewPointsAvailable() < goal.cost) return { ok: false, reason: 'broke' };
  ledger.spent += goal.cost;
  ledger.owned.push(key);
  _save(ledger);
  return { ok: true, goal };
}

export function stretchActive(player, id) {
  return !!player?.getFlag?.(STRETCH_FLAG(id)) && stretchUnlocked(id);
}

/** Flip an unlocked goal. Returns the new state, or null when not unlocked. */
export function toggleStretchGoal(player, id) {
  if (!player || !stretchUnlocked(id)) return null;
  const next = !player.getFlag(STRETCH_FLAG(id));
  player.setFlag(STRETCH_FLAG(id), next);
  return next;
}

/** Ids of every stretch goal currently switched on. Passed to CombatEngine. */
export function activeStretchIds(player) {
  if (!player) return [];
  return STRETCH_GOALS.filter(g => stretchActive(player, g.id)).map(g => g.id);
}

/** Total Challenge Points currently active (stretch goals + Overtime). */
export function activeChallengePoints(player) {
  if (!player) return 0;
  let cp = STRETCH_GOALS.reduce((s, g) => s + (stretchActive(player, g.id) ? g.cp : 0), 0);
  if (player.getFlag?.('overtime_active') && player.getFlag?.('rp_overtime')) {
    cp += REVIEW_ITEMS.find(i => i.id === 'rp_overtime')?.cp || 0;
  }
  return cp;
}

/** Review Level = floor(active CP / 10). Kaycee's Mod's 10 x N ladder. */
export function reviewLevel(player) {
  return Math.floor(activeChallengePoints(player) / REVIEW_LEVEL_STEP);
}

/** The high-water Review Level actually EARNED. Never lost, never inferred. */
export function recordedReviewLevel(player) {
  return Number(player?.getFlag?.('pb_review_level')) || 0;
}

/**
 * Memos unlocked by the player's high-water Review Level.
 *
 * This deliberately does NOT consider the currently-active level. It used to —
 * `Math.max(reviewLevel(player), pb_review_level)` — and combined with the fact
 * that the shop recorded the high-water on TOGGLE, the entire memo ladder paid
 * out from a menu: walk to the Break Room, switch on 40 CP of stretch goals,
 * read all four of Meredith's memos, switch everything back off, and never
 * fight a single round under any of it. Kaycee's Mod (report P4.2) dispenses
 * its dev logs for WINNING at Challenge Level N, not for declaring it.
 * The high-water is now written in CombatState's victory path.
 */
export function unlockedMemos(player) {
  const best = recordedReviewLevel(player);
  return REVIEW_MEMOS.filter(m => m.level <= best);
}

/**
 * Record a new high-water Review Level. `level` defaults to the level the
 * player is running right now; CombatState passes the level snapshotted when
 * the fight STARTED, so the record is always "the level you won under".
 * Returns the new level when it rose, else null — the caller toasts on a
 * non-null return.
 */
export function noteReviewLevel(player, level = null) {
  const lvl = level == null ? reviewLevel(player) : level;
  const best = recordedReviewLevel(player);
  if (lvl > best) {
    player.setFlag('pb_review_level', lvl);
    return lvl;
  }
  return null;
}
