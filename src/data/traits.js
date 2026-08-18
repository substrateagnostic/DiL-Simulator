// TRAITS — Andrew's WORKING STYLE, decided by Janet's quiz (scene `janet_quiz`,
// the unskippable browser homepage on his desk PC, day one).
//
// THE SPLIT THAT GOVERNS THIS FILE: the quiz and its dialog variants are
// CONTENT and ship live; the combat PERKS are BALANCE and ship DARK until the
// producer signs the trait packet (.claude/plans/q-run/TRAIT-PACKET.md).
// `TRAIT_PERKS_LIVE` is that signature. Flipping it is a producer decision,
// not a bug fix.
//
// Design laws, from the commission (SEASON_SHEET producer round 9):
//   - The trait is WHO ANDREW IS; the Practice Group build is HOW HE FIGHTS.
//     A perk must never issue a Practice-Group-exclusive currency (Litigation
//     turn economy, Compliance Composure-off-DEFENCE, Audit Composure-off-
//     OBJECTIONS) and must never touch the weakness-hit currency stack.
//   - Each perk stays flavor-forward: measured ≤ ~2 pp win-rate impact at
//     karen@3 (tools/_q-trait-sim.mjs, numbers in the packet).
//   - Exactly one `trait_*` flag is ever set per save, by the quiz's result
//     page. Old saves have none, and every trait-conditional line falls back
//     to the original line by construction — the flags are ADDITIVE on saves,
//     and all three are carried in SaveManager's FLAGS_OF_RECORD.
export const TRAIT_PERKS_LIVE = false;

// Dev/sim override so the dark plumbing stays testable: the balance harness
// (and a curious dev console) can flip `globalThis.__traitPerksOn = true`
// without touching the shipped constant.
export function traitPerksActive() {
  return TRAIT_PERKS_LIVE || globalThis.__traitPerksOn === true;
}

export const TRAITS = {
  advance_reader: {
    id: 'advance_reader',
    flag: 'trait_advance_reader',
    name: 'The Advance Reader',
    // Perk: OPENING STATEMENT — Andrew walks into every fight already briefed.
    // Starting Confidence (momentum), once, at combat start. Touches no
    // Composure, no Locks, no turn economy.
    //
    // WHY 8 AND NOT 10 — measured, not taste (tools/_q-trait-sim.mjs +
    // .claude/plans/q-run/trait-sim-raw.txt): every basic hit banks exactly
    // 10 Confidence, so a 10-point head start removes one whole attack from
    // the road to Assert Dominance and SHIFTS THE BURST TURN — and at karen@3
    // the CASUAL policy's wins are 100 % power-move-carried (0.0 % win rate
    // in runs that never reach 100), so that one-turn shift measured
    // −6.0 pp COMPETENT / −7.5 pp CASUAL. At 8, the attack count to 100 is
    // unchanged on the modal path and the measured delta is +0.2/+0.4 pp.
    // Any future retune must stay BELOW the 10-point action quantum.
    perk: { startMomentum: 8 },
  },
  shock_absorber: {
    id: 'shock_absorber',
    flag: 'trait_shock_absorber',
    name: 'The Shock Absorber',
    // Perk: BUILT FOR IMPACT — the Brace QTE's timing bands widen slightly.
    // Multiplies into the same `qteModifiers` channel the Ergonomic Wrist
    // Support relic uses, so the two stack multiplicatively and sanely.
    perk: { qteWindow: 1.2 },
  },
  percolator: {
    id: 'percolator',
    flag: 'trait_percolator',
    name: 'The Percolator',
    // Perk: FRESH POT — +1 Coffee (MP) at the start of each of Andrew's
    // turns. A drip, not a surge; the name is the mechanic.
    perk: { mpPerTurn: 1 },
  },
};

// The one trait this save holds, or null. Reads flags only — no new
// persistence, which is what makes the whole system additive on saves.
export function activeTrait(player) {
  for (const t of Object.values(TRAITS)) {
    if (player?.getFlag?.(t.flag)) return t;
  }
  return null;
}

// Perk accessor every combat hook goes through. Returns `fallback` unless the
// perks are LIVE and this save's trait defines the key — so with the switch
// dark, every call site is bit-identical to shipped behaviour.
export function traitPerkValue(player, key, fallback) {
  if (!traitPerksActive()) return fallback;
  const t = activeTrait(player);
  const v = t?.perk?.[key];
  return typeof v === 'number' ? v : fallback;
}
