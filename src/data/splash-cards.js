// SPLASH CARDS — the ten-image slate, producer-locked 2026-08-03.
//
// Authoritative pick record: `art/splash_cards/PICKS.md`.
// Trigger + timing spec: `.claude/plans/h-run/splash-card-spec.md` sections 9-14.
// Encoder + measured sizes: `python tools/splash-encode.py` (1600x900 WebP q80,
// worst card 219 KB against a 300 KB per-card budget, 1206 KB for the set).
//
// THREE CLASSES, AND THEY MUST NOT BE COLLAPSED.
//
//   REWARD, post-hit (Andrew, slam-LEFT, navy field, crimson accent, rotation
//     -3.4 deg, damage number ON the card). It plays AFTER something the player
//     did succeeded, on the contact frame.
//   THREAT, pre-hit (bosses, slam-RIGHT, crimson field, navy accent, rotation
//     +3.4 deg, NO damage number). It plays BEFORE anything happens, on the
//     player's own turn, off the ultimate telegraph. The ABSENCE of a number is
//     the clearest signal in the system that a threat card means "act now"
//     rather than "well done".
//   The SCRIPTED-LOSS FINISHER, one image, once per save: the first card the
//     player ever sees is one being done TO them, which teaches the grammar.
//
// Rotation sign is load-bearing: -3.4 for Andrew, +3.4 for a boss. It is a
// two-character difference and it is the cheapest tell in the system — the card
// leans the other way before the player has parsed anything else on it.
//
// SCARCITY LAW (spec section 12). Story bosses only. No reception client, no
// `compliance`, no `corporate_lawyer`, no `cfos_assistant`, no gauntlet filler,
// no `parking_enforcer`. Once per boss per fight. Only the ultimate, not every
// HEAVY move. Do not add a card for a New Game+ variant, a phase transition or
// a mutator — a seventh boss card costs a new illustration and a new row here.
//
// The bytes are NOT in the initial JS bundle: `query: '?url'` puts only the
// emitted asset URL in the chunk, exactly the way EpilogueState globs its
// plates, so a boss card the player never reaches is never fetched.
const ART = import.meta.glob('../assets/splash_cards/*.webp', {
  eager: true, query: '?url', import: 'default',
});

function art(stem) {
  const key = Object.keys(ART).find(k => k.endsWith(`/${stem}.webp`));
  return key ? ART[key] : null;
}

export const SPLASH_CARDS = {
  // ── REWARD ────────────────────────────────────────────────────────────
  // C, Deadpan Cut-In. Type zone: the clean left half, flat navy.
  assert_dominance: {
    src: art('assert_dominance'), cls: 'reward',
    title: 'ASSERT DOMINANCE',
    // It tells the player WHY their Confidence bar just emptied, on the frame
    // it empties, which the old banner did not.
    sub: 'MOMENTUM SPENT',
    anchor: 'left', slab: false,
  },
  // D, The Unbothered Exit. Best unassisted type zone in the set — no slab.
  boss_kill: {
    src: art('boss_kill'), cls: 'reward',
    title: 'CASE CLOSED', sub: 'MATTER RESOLVED',
    anchor: 'top-left', slab: false,
  },
  // The promoted wave-1 reject, unretouched: bigger figure, stronger halftone,
  // more debris. It was superseded only for a shoe cropping at the bottom edge,
  // which is a turnaround-sheet law that does not apply to a splash card.
  all_in: {
    src: art('all_in'), cls: 'reward',
    title: 'ALL IN', sub: 'IT LANDED',
    anchor: 'bottom-left', slab: false,
  },

  // ── THREAT ────────────────────────────────────────────────────────────
  boss_karen: {
    src: art('boss_karen'), cls: 'threat',
    title: 'LIVE TWEET RAMPAGE', sub: 'BRACE',
    anchor: 'bottom-left', slab: true,
  },
  // Slab ON: chad_C's crimson diagonal runs THROUGH the lower-left zone, so the
  // second word of the title sits on red. Same failure mode the spec logged for
  // karen_B (a radial device reaching into a zone on its own axis) and the same
  // remedy. Verified on the shipped render, not assumed.
  boss_chad: {
    src: art('boss_chad'), cls: 'threat',
    title: 'RAGE QUIT', sub: 'BRACE',
    anchor: 'bottom-left', slab: true,
  },
  boss_grandma: {
    src: art('boss_grandma'), cls: 'threat',
    title: 'THE GERALD INCIDENT', sub: 'BRACE',
    anchor: 'bottom-left', slab: true,
  },
  boss_meredith: {
    src: art('boss_meredith'), cls: 'threat',
    title: 'FINAL ASSESSMENT', sub: 'BRACE',
    anchor: 'bottom-left', slab: false,
  },
  // G, The Correction in the Corridor. The producer's note on this plate: the
  // type zone mid-left sits in the VOID, and the engine title is what supplies
  // the plate's missing luminance there. Hence anchor 'left' and no slab.
  boss_director: {
    src: art('boss_director'), cls: 'threat',
    title: 'MARKET CORRECTION', sub: 'BRACE',
    anchor: 'left', slab: false,
  },
  // THE GRAMMAR-BREAKER (spec section 13). Every rule in the opposition table
  // is a rule about a BODY — which way it leans, where it advances from, how
  // the camera looks up at it. The Algorithm has no body. It is the only card
  // permitted teal, it does not lean, and it does not advance. `teal: true`
  // lives HERE, in the loader, exactly so that a future pass "correcting" the
  // palette to match the other five has to delete a line that says why not.
  boss_algorithm: {
    src: art('boss_algorithm'), cls: 'threat', teal: true, still: true,
    title: 'TOTAL OPTIMIZATION', sub: 'BRACE',
    anchor: 'bottom-left', slab: true,
  },

  // ── THE SCRIPTED-LOSS FINISHER ────────────────────────────────────────
  // karen C: the colossal accordion of demands walling the player off. Threat
  // grammar (slam-right, red wash, no number) because it is being done TO him.
  karen_finisher: {
    src: art('karen_finisher'), cls: 'threat',
    title: 'ESCALATED', sub: 'YOU LOSE THIS ONE',
    anchor: 'bottom-left', slab: true,
  },
};

// ── BOSS ULTIMATES ──────────────────────────────────────────────────────
// One ability per boss: the highest-power move in its FINAL phase. All are
// >= 28 power so all clear the existing HEAVY telegraph gate (power >= 26).
// Ids verified against src/data/stats.js AFTER the naming sweep — the enemy is
// `meredith_boss`, not `rachel_boss`, and the art directory keeps its old name.
//
// Grandma's ultimate is `gerald_incident` (38), NOT `final_revision`, which is
// a 0-power debuff despite the dramatic name. Check power, not vibes.
export const BOSS_ULTIMATE_CARDS = {
  karen:             { card: 'boss_karen',     ability: 'live_tweet_rampage' },  // 35
  chad:              { card: 'boss_chad',      ability: 'rage_quit_attack' },    // 28
  grandma:           { card: 'boss_grandma',   ability: 'gerald_incident' },     // 38
  meredith_boss:     { card: 'boss_meredith',  ability: 'final_assessment' },    // 35
  regional_director: { card: 'boss_director',  ability: 'market_correction' },   // 30
  algorithm:         { card: 'boss_algorithm', ability: 'total_optimization' },  // 40
};

// Which fights may play the boss-KILL card. Deliberately the same six ids as
// the warning table and nothing else: that caps the reward card at six plays
// across a whole campaign, which is what lets it be this loud. Every gate
// enemy, every gauntlet body and every reception client is excluded by
// omission, per the scarcity law.
export const BOSS_KILL_IDS = new Set(Object.keys(BOSS_ULTIMATE_CARDS));

export function splashCard(id) {
  const c = SPLASH_CARDS[id];
  return (c && c.src) ? c : null;
}
