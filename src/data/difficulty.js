// difficulty.js — THREE MODES, ONE TABLE.
//
// WHY THIS FILE EXISTS
// -------------------
// The balance lane (commits 27e9c0f / 4de4693 / 8b19724 / 66c3a88) measured a
// thing the design had been assuming away: **a real Standard difficulty band is
// not purchasable on a one-knob game.** Every lever that makes the boss ladder
// threatening for a competent player is a lever the casual floor pays for —
// boss ability power at 1.15x moved the 21-cell PIP table by 12.16 pp, 21 cells
// down and 0 up. The only components that survived were the ones the floor is
// structurally incapable of reaching (the Escalation Response fires on a denied
// turn; CASUAL denies 0.0 % of turns on every solo rung). That is a very small
// set, and it ran out before it reached chad@6 and the Regional Director.
//
// So the knob is not one knob. It is three, and this file is the only place
// they are written down. **A mode is a named bundle of multipliers and toggles.
// There is no code fork anywhere** — `src/core/DifficultyManager.js` resolves a
// bundle and the engine asks it questions.
//
// THE PRODUCER GATE — OPEN AS OF 2026-08-17
// -----------------------------------------
// The producer answered the packet's six questions and the constant below is
// the flip. His rulings, implemented here: display names are the plain set
// (Easy / Normal / Hard — the A/B/C register sets were all declined); the mode
// ids are `easy` / `normal` / `hard` and are LOAD-BEARING — a visual slider
// start-screen is being built in a parallel lane and binds to these ids, so
// never rename them; the `difficultyFloor` stamp was declined and does not
// exist; and the PHASE_REVIVAL bug fix ships in every selectable mode.
// Setting this back to `false` re-darkens the whole system (the `shipped`
// identity bundle comes back for everything).
//
// THREE AUTHORING LAWS
// --------------------
// 1. **A mode may only carry DATA.** If a mode needs an `if`, the design is
//    wrong. Every field here is read by exactly one accessor on
//    DifficultyManager and every accessor has a documented default.
// 2. **`shipped` is the identity and is never edited.** It is the arm the
//    harness measures every other mode against, and it is what the gate
//    returns. A mode is only honest if the null arm is in the same table.
// 3. **The Pivot is untouchable.** `PHASE_SURGERY` replaces `abilities` and
//    NOTHING else — the resolver spreads it over the shipped row, so
//    `hpThreshold`, `weakness` and `resistance` cannot move even by accident.
//    See `DifficultyManager.phasesFor`.

// ── THE PRODUCER GATE ───────────────────────────────────────────────────
// false: `DifficultyManager` returns `shipped` for everything and the
//        selection UI does not render.
// true:  three modes, a picker on New Game, a picker in the pause menu.
// Flipped 2026-08-17 on the producer's answer to the packet (Q2: ship).
export const DIFFICULTY_LIVE = true;

export const DEFAULT_MODE = 'normal';
/**
 * Player-selectable modes, easiest first. `shipped` is deliberately absent.
 * THE IDS ARE A CONTRACT: the slider start-screen lane binds to
 * `easy` / `normal` / `hard`. Keep them stable; display names live in
 * NAME_SETS, never here.
 */
export const MODE_ORDER = ['easy', 'normal', 'hard'];

// ── NAME SETS — THE PRODUCER PICKED (2026-08-17) ────────────────────────
// The answer to Q1 is the `plain` set: Easy / Normal / Hard, audience-first,
// no trust jargon. Sets A/B/C were all DECLINED; they stay here as the record
// of the decision, not as options to quietly reactivate. `ACTIVE_NAME_SET` is
// still a one-word edit, but changing it now is a producer call.
//
// The Hard blurb used to carry the honest §7.3 line the producer asked for
// (Q5) — "Some approaches struggle here. That is the point." — written while
// the Audit lane collapsed to 44.3 % on one rung. The audit accommodation
// (the `audit` block on the hard bundle, 2026-08-17) closed that gap to
// ~10 pp, so the apology came out of the blurb the same day the reason for
// it did. If the producer wants the sterner line back, it is one string.
export const NAME_SETS = {
  // THE ACTIVE SET. Plain, audience-first (producer, 2026-08-17).
  plain: {
    label: 'Plain — Easy / Normal / Hard (active)',
    easy: { name: 'Easy', blurb: 'You take less damage. Nothing is cut and nothing is locked away.' },
    normal: { name: 'Normal', blurb: 'The game as designed.' },
    hard: { name: 'Hard', blurb: 'The opposition hits harder and wastes nothing.' },
  },
  // DECLINED — the onboarding ladder. Reads instantly; least specific to this game.
  A: {
    label: 'A — the onboarding ladder (declined 2026-08-17)',
    easy: { name: 'Intern', blurb: 'Supervised. Mistakes are development opportunities.' },
    normal: { name: 'Associate', blurb: 'The job as written.' },
    hard: { name: 'Partner Track', blurb: 'No supervision. No cover. No supply budget.' },
  },
  // DECLINED — the engagement letter. Real trust-department words.
  B: {
    label: 'B — the engagement letter (declined 2026-08-17)',
    easy: { name: 'Advisory', blurb: 'Non-binding. We will walk you through it.' },
    normal: { name: 'Fiduciary', blurb: 'The standard of care. Act in their interest.' },
    hard: { name: 'Discretionary', blurb: 'Full authority. Full liability. No second signature.' },
  },
  // DECLINED — the performance review. Rhymed with (and collided with) the PIP.
  C: {
    label: 'C — the performance review (declined 2026-08-17)',
    easy: { name: 'Development Plan', blurb: 'A structured framework. Nobody is being written up.' },
    normal: { name: 'Meets Expectations', blurb: 'The documented standard for this role.' },
    hard: { name: 'Exceeds Expectations', blurb: 'You asked for this in writing.' },
  },
};
export const ACTIVE_NAME_SET = 'plain';

// ── PHASE-LIST SURGERY (Part 2) ─────────────────────────────────────────
//
// THE DIAGNOSIS, in one line: a boss's phase `abilities` array is drawn FLAT,
// so a phase list holding one attack and four heals/debuffs/stuns spends 80 %
// of its turns dealing zero damage. Measured on the shipped ladder with the
// Escalation Response live (`.claude/plans/m-run/LADDER-final.txt`, 600 runs a
// cell): Grandma 68.3 and 66.2 % quiet turns, Meredith 48.6 and 48.9 %, the
// Algorithm 48.9 %.
//
// THE MECHANISM IS REPETITION, and it is deliberately not new engine code.
// `_pickEnemyAbility` draws uniformly from the phase's `abilities` array in
// every pattern that reaches a random draw, so a repeated id is a weight. The
// idiom already ships: `ENEMY_AI_PATTERNS.regional.phase2` is
// `['synergy_blast', 'synergy_blast', 'golden_parachute']`. Repetition is also
// invisible to `_lockableSet`, which builds a Set and caps at
// `ceil(ids.length / 3)` over the DEDUPED ids — so a re-weight cannot silently
// move Lock coverage, and only an ADDED id can.
//
// FOUR RULES, all held by every row below:
//   • Base row 0 (`ENEMY_STATS[id].abilities`) is never touched — every
//     documented weakness and every dialog hint stays true.
//   • `hpThreshold` / `weakness` / `resistance` cannot move: the resolver
//     spreads `{ abilities }` over the shipped row.
//   • Nothing is DELETED. Every heal, debuff, stun and counter that shipped in
//     a phase is still in that phase. A boss that never heals is a different
//     fight, and Grandma not producing shortbread is a worse joke.
//   • Only ids the boss ALREADY OWNS. No row below introduces an ability id
//     that is not already somewhere in that enemy's own kit.
//
// Format: `enemyId: [ phase0Abilities, phase1Abilities, ... ]`. A `null` entry
// leaves that phase exactly as shipped; a short array leaves the tail as
// shipped.
export const PHASE_SURGERY = {
  // KAREN IS NOT TOUCHED, ON PURPOSE. She is the Break tutorial and the one
  // boss with a declared Break-rate floor; her TTK is already the best rung in
  // the table (8.0 turn attempts needed, 4.0 granted) and her 32 % "quiet"
  // reading is mostly `yelp_review`, a DoT whose damage the instrument books on
  // Andrew's turn-start rather than on hers. Nothing is broken here.

  // CHAD — one weight, and an honest note. Chad's problem is NOT quiet turns
  // (4.2 % at level 6); it is that he is granted 2.51 turn attempts against the
  // 22.5 he would need. Surgery cannot reach that and this row does not pretend
  // to: it only stops `alpha_mode` — a +4/+4 buff with a 3-turn duration — from
  // being a third of a fight that lasts three rounds. The buff is still there,
  // and on the longer Casual fight it still does its job.
  chad: [
    ['bro_down', 'trust_fund_tantrum', 'trust_fund_tantrum', 'alpha_mode'],
    ['rage_quit_attack', 'rage_quit_attack', 'trust_fund_tantrum', 'alpha_mode'],
  ],

  // GRANDMA — the flagship. She has always owned a 38-power punch and a
  // 30-power one, and at 25 % HP the shipped list gave her ONE attack against
  // two debuffs, a heal and a stun. Phase 1 gets `guilt_trip` back (her own
  // base-row move, already in her Lock pool, so coverage does not move) and
  // `gerald_incident` gets the weight the writing already gives it.
  grandma: [
    ['guilt_trip', 'guilt_trip', 'guilt_trip', 'passive_aggression', 'passive_aggression',
      'the_look', 'changed_the_will', 'fresh_cookies', 'emergency_shortbread'],
    ['gerald_incident', 'gerald_incident', 'gerald_incident', 'guilt_trip', 'guilt_trip',
      'the_look', 'final_revision', 'changed_the_will', 'emergency_shortbread'],
  ],

  // MEREDITH — the longest fight in the game and half of it is paperwork.
  // Phase 0 is one attack, one debuff and one DoT drawn flat; phase 1 is one
  // attack against a heal and a stun. Both keep everything they had.
  meredith_boss: [
    ['strategic_pivot', 'strategic_pivot', 'strategic_pivot', 'restructure_threat', 'performance_review'],
    ['hostile_takeover', 'hostile_takeover', 'hostile_takeover', 'golden_handcuffs', 'board_resolution'],
    ['final_assessment', 'final_assessment', 'hostile_takeover', 'hostile_takeover', 'board_resolution'],
  ],

  // THE REGIONAL DIRECTOR — already an all-attack kit, so there is very little
  // here and the packet says so. The only real draw is `quarterly_target`, a
  // 22-power DoT that reads as a quiet turn at the moment it lands; phases 0
  // and 1 weight the direct hits ahead of it. Nothing is removed.
  regional_director: [
    ['corporate_mandate', 'synergy_blast', 'synergy_blast', 'quarterly_target'],
    ['market_correction', 'market_correction', 'corporate_mandate', 'quarterly_target'],
    null,
  ],

  // THE ALGORITHM — exempt from the Escalation Response by ruling (4de4693), so
  // its phase lists are the ONLY lever this design has on it. Phase 1 draws a
  // counter, a stun and a DoT against two attacks; phase 2 holds the game's
  // biggest number (`total_optimization`, 40) at one draw in five. Everything
  // stays in the pool.
  algorithm: [
    ['data_harvest', 'data_harvest', 'system_overload', 'pattern_recognition', 'risk_assessment'],
    ['algorithmic_trading', 'algorithmic_trading', 'algorithmic_trading', 'data_harvest',
      'system_overload', 'predictive_model', 'process_termination'],
    ['total_optimization', 'total_optimization', 'total_optimization', 'algorithmic_trading',
      'algorithmic_trading', 'predictive_model', 'process_termination', 'pattern_recognition'],
  ],
};

// ── PHASE REVIVAL — the two rows nobody has ever seen ───────────────────
//
// A SEPARATE TABLE ON PURPOSE. `PHASE_SURGERY` above may only move `abilities`,
// and that restriction is the whole reason the Pivot is safe from it. This
// moves an `hpThreshold`, which is a different kind of edit and gets a
// different name so a reviewer cannot mistake one for the other.
//
// THE BUG IT FIXES, and it is a real one that has shipped since the phase
// system landed: `_pickEnemyAbility` selects a phase with
// `hpPercent <= phase.hpThreshold`, and `hpPercent <= 0` is only ever true at
// death. **Two boss phases in the game carry `hpThreshold: 0` and have
// therefore never fired in a shipped build** — the Regional Director's third
// row and the Algorithm's third row. `total_optimization` at 40 power is the
// single biggest ability in the game and no player has ever been hit by it.
// Meredith had the identical bug; the J-run fixed hers by moving 0 -> 0.12 and
// left these two, with the Director's cost sized at 13.7 pp on a CARRY@NG+2 lap
// and the Algorithm's deferred behind a repricing pass.
//
// 0.12 is not a new number: it is the window the dossier authored for Meredith,
// chosen because a boss's LAST phase is also where its social row sits, and a
// social row from level 8 is a damage UPGRADE for Andrew rather than a threat.
// Sub-12 % is short enough that the upgrade cannot pay for itself.
//
// This is the one lever in this wave that reaches the Regional Director and the
// Algorithm, and it is the one that most literally answers "get their threat
// from their OWN kits": both rows are already written, already balanced, and
// already have their phase message and their Pivot weakness authored.
//
// SHIPS IN EVERY SELECTABLE MODE (producer ruling 2026-08-17, the packet's
// "freebie"): it is a bug fix, not a difficulty lever, measured at -0.2 to
// +0.3 pp of low-water. `DifficultyManager.phasesFor` applies it to easy,
// normal and hard alike; ONLY the `shipped` null arm stays pre-fix, so the
// instruments keep an honest before-column.
export const PHASE_REVIVAL = {
  regional_director: { 2: 0.12 },
  algorithm: { 2: 0.12 },
};

// ── THE MODE BUNDLES ────────────────────────────────────────────────────
//
// Every field is optional and every accessor on DifficultyManager has a
// documented default, so an empty bundle is the shipped game.
//
//   assist      { base, perDeath, cap }  proactive incoming-damage resistance,
//                                        applied to ANDREW only. Same numbers
//                                        and same call path as the shipped
//                                        Performance Improvement Plan; the mode
//                                        simply does not make you file for it.
//   depth       COMBAT_DEPTH overrides, read through DifficultyManager.depth().
//   playerMult  multipliers on the engine's WORKING COPY of Andrew's stats.
//               Nothing here touches the save, so a mode switch is instant and
//               reversible and the number in the pause menu never lies.
//   phases      'shipped' | 'surgery'
//   ai          per-enemy ENEMY_AI_PATTERNS overrides, merged over the shipped
//               row. `'*'` applies to every pattern. **A NAMED ID REPLACES THE
//               `'*'` CONTRIBUTION ENTIRELY** rather than stacking on top of it,
//               which is the only way to write an exception — `intern: {}` below
//               is how the scripted tutorial enemy opts out of a `'*'` rule.
//
// NO XP MULTIPLIER, ON PURPOSE. It is the obvious fourth field and it is a trap:
// payout scaling changes the level Andrew arrives at each rung on, which moves
// every cell in every table by an amount no single-fight sim can see. The game
// also already ships one XP multiplier — the Accelerated Review Cycle's
// time-and-a-half — and two of them stacking is a pacing bug with a delay fuse.
// Modes change the fight, not the ladder.
export const DIFFICULTY_MODES = {
  // ── THE NULL ARM. Never selectable, never edited. ────────────────────
  shipped: {
    id: 'shipped',
    name: 'As Shipped',
    blurb: 'The pre-signature baseline. Not selectable; this is what the gate returns.',
    phases: 'shipped',
  },

  // ── EASY (the packet's CASUAL band) ──────────────────────────────────
  // The Performance Improvement Plan, promoted from a post-defeat offer to this
  // mode's spine. The shipped PIP is Hades' God Mode filed as HR paperwork —
  // 20 % incoming-damage resistance, +2 % per recorded defeat, capped at 80 %,
  // locking out zero achievements and zero content. Its one flaw is that you
  // have to LOSE first and then find it in a menu. Casual is that item, on by
  // default, with the same numbers and the same code path.
  //
  // The PIP item itself still ships and still works: `assistResist` takes the
  // MAX of the two, so a Casual player who also files the paperwork is not
  // stacked to invulnerability and a Standard player who files it is unchanged.
  //
  // THE 21-CELL FLOOR IS THIS MODE'S GATE AND ONLY THIS MODE'S — AND IT ALREADY
  // REJECTED SOMETHING. This bundle was first authored with `phases: 'surgery'`,
  // on the argument that the surgery is a readability fix as much as a
  // difficulty one and that shipping two different Grandmas is two bosses rather
  // than one boss with a knob. The table said no, at 800 runs a cell:
  //
  //     mean |delta| 6.58 pp over the 14 saturated cells, signed -5.58,
  //     worst -21.5 pp, against a NULL ARM of 1.10 pp.
  //     grandma@7 PIP 20 %: 38.3 % -> 19.8 %.   grandma@8: 62.1 % -> 43.5 %.
  //
  // The mechanism is not subtle and it generalises: a casual fight is LONG (25
  // to 31 enemy turn attempts against a competent player's 5 to 7), so the
  // enemy's damaging share compounds over three to six times as many turns. Any
  // change to what a boss DOES is worth several times more against the floor
  // than against the ceiling — which is the whole reason a one-knob game could
  // not buy a Standard band, restated from the other end.
  //
  // So EASY IS DEFINED AS "THE SHIPPED FIGHT, PLUS HELP". Shipped phases,
  // shipped AI weights, shipped everything, and the assist on top. The floor law
  // then holds by construction rather than by tuning, and the honest cost —
  // Easy and Normal fight measurably different Grandmas — is declared in the
  // producer packet rather than buried here. (The one post-packet change:
  // PHASE_REVIVAL now reaches this mode too — the freebie ruling — and the
  // floor table was re-run against it; see the m-run reproduction commands.)
  easy: {
    id: 'easy',
    name: NAME_SETS[ACTIVE_NAME_SET].easy.name,
    blurb: NAME_SETS[ACTIVE_NAME_SET].easy.blurb,
    assist: { base: 0.20, perDeath: 0.02, cap: 0.80 },
    phases: 'shipped',
    // NO `ai` BLOCK, AND THAT IS THE DESIGN. Standard weights Grandma's
    // `healChance` / `debuffChance`, which are UNGATED — they change the fight
    // for a player who never lands a tagged hit, which is exactly the shape the
    // balance lane rejected (an ungated `preferAttack` cost the floor 31.6 pp at
    // grandma@8). Casual takes the phase-list weighting, which is the
    // readability half, and does not take the draw-rate half. That split is
    // also what makes the 21-cell table below legible: its PIP 20/30 % columns
    // are measuring the surgery and nothing else.
  },

  // ── NORMAL (the packet's STANDARD band) ──────────────────────────────
  // The shipped experience plus Part 2. No economy knobs: DENIAL_LIMIT stays 2,
  // Press Advantage stays 40, Coffee stays 75. Those were priced and declined
  // for this band (66c3a88) and this wave does not reopen that.
  normal: {
    id: 'normal',
    name: NAME_SETS[ACTIVE_NAME_SET].normal.name,
    blurb: NAME_SETS[ACTIVE_NAME_SET].normal.blurb,
    phases: 'surgery',
    // THE OTHER FLAT DRAW. Weighting a phase array only reaches the branch that
    // draws from it, and `tactical` gates two branches AHEAD of that draw at
    // fixed rates: `healChance` and `debuffChance`. Grandma is the one boss in
    // the game where those two gates own the fight — 68 % of her turns dealt no
    // damage on the shipped build, and the phase list can only reach the 70 %
    // of picks that get past `debuffChance` at all. So her two gates are
    // weighted too, by the same principle and to the same end: heals and
    // debuffs stay in the fight and stop being drawn flat against her punches.
    //
    // This is the ONE knob in Normal that is NOT gated behind something the
    // casual floor cannot do, so it is the one that has to be paid for on the
    // 21-cell table. EASY therefore does not carry it — see that bundle. The
    // measured effect on this band, 600 runs, grandma@7: low-water 69.7 -> 65.1,
    // near-death 4.0 -> 7.3 %, damage per enemy turn 9.98 -> 12.56.
    ai: { grandma: { healChance: 0.22, debuffChance: 0.20 } },
  },

  // ── HARD ─────────────────────────────────────────────────────────────
  // ENTIRELY ENEMY-SIDE, and the near-miss is worth remembering: Hard v1 WAS
  // the declined Tier 2 package (DENIAL_LIMIT 1, Press Advantage 52, Coffee
  // 60), it was measured, and it was thrown away — a 20.8-round Meredith with
  // 0.04 Breaks per fight, because player-economy screws buy difficulty by
  // making fights LONGER (packet §7.2). What ships is the opposition getting
  // relentless (ATK x1.45, Escalation Response at certainty) while Andrew's
  // own toolkit is untouched. Declared costs, packet §7.3 with the producer's
  // word (Q5): Meredith's Break rate sits under its derived floor on two
  // cells. The §7.3(a) cost — the Audit lane collapsing to 44.3 % on one rung
  // — was CLOSED by the audit accommodation below (2026-08-17, packet §7.4
  // addendum): Audit's worst deficit against the top lane on any rung is
  // 11.5-12.5 pp (builder 600s / judge 400s), and the residual MAX band is
  // 15.0-15.3 pp at karen@3 with AUDIT ON TOP — a ceiling, not a floor.
  //
  // The Algorithm exemption from the Escalation Response is LIFTED here and
  // only here. That exemption exists to protect the casual floor — the
  // Algorithm is the one encounter where a casual player denies any enemy turn
  // at all (5.9 %, because Janet and Isaiah clear Locks on their behalf). Hard
  // has no floor to protect.
  hard: {
    id: 'hard',
    name: NAME_SETS[ACTIVE_NAME_SET].hard.name,
    blurb: NAME_SETS[ACTIVE_NAME_SET].hard.blurb,
    enemyMult: { atk: 1.45 },
    phases: 'surgery',
    // ── THE AUDIT ACCOMMODATION (n-run, 2026-08-17) ──────────────────
    // Hard buys its threat enemy-side, and that priced out exactly one build:
    // the Audit lane's Findings ramp needs TURNS, and ATK x1.45 takes them
    // away — measured at a 42.0 pp lane gap on restructuring_trio@7 (packet
    // §7.3, Audit 44.3 % vs Litigation 86.3 %), uncloseable by ATK dials
    // (x1.30 still 35.3 pp). On Hard, and only on Hard, the file works under
    // audit conditions. Three fields, one accessor
    // (`DifficultyManager.auditRamp`), all intrinsically gated on owning the
    // `findings` node — no other lane, and no Easy/Normal player, is reachable
    // by any of them:
    //
    //   fileRate 2     — exhibits file at double rate (damage-carrying tagged
    //                    hits ONLY; Scope Expansion's debuff notes stay at 1 —
    //                    doubling those let Due Diligence race the file to a
    //                    close no damaging hit was there to cash, measured
    //                    -13.5 pp on meredith_boss@8). The ramp's clock is
    //                    resized to Hard's turn budget; the identity —
    //                    accumulate, then close — is untouched.
    //   assaultSlow    — THE PAPER TRAIL SLOWS THE ASSAULT: -6 % outgoing ATK
    //                    per Finding EVER FILED on that enemy (`_findingsEver`,
    //                    monotonic, capped at 5 → max -30 %, i.e. a fully
    //                    documented opponent presses at 1.45 x 0.70 = 1.015 —
    //                    a hair above Normal, never below it). Keyed on the
    //                    record rather than the standing stacks because stacks
    //                    empty on every close, which vanished the shield at
    //                    the exact moment the lane cashed its payoff — and
    //                    because a monotonic record deletes the hold-the-file
    //                    degenerate line outright.
    //   seedRecord 3   — the record starts three entries deep: the auditor
    //                    read their file before the meeting. Seeds the SHIELD
    //                    only, never `_findings` — the burst clock still
    //                    starts at zero. This is what reaches the trio, where
    //                    the lane's deaths were three undocumented bodies
    //                    swinging 1.45x in the opening rounds (near-death 99 %
    //                    at base; 94 % seeded — trio@7 55.8 % -> 76.8 %).
    //
    // Measured winner (400-600 runs/cell, .claude/plans/n-run/): the lane gap
    // at trio@7 closes 42.0 -> ~9.5 pp and every other failing cell lands
    // inside ~10 pp; Litigation/Compliance on Hard and every lane on
    // Easy/Normal are untouched by construction AND by measurement
    // (n-run touch test). The losing candidates and why they lost are in
    // the packet's §7.4 addendum.
    audit: { fileRate: 2, assaultSlow: 0.06, seedRecord: 3 },
    // `'*'` raises the Escalation Response from 0.85 to certainty on every
    // pattern that has one. `algorithm` is listed explicitly because it is the
    // one row that does NOT have one at rest, and a reader has to be able to see
    // the exemption being lifted rather than infer it from a wildcard.
    // `intern` opts out: a scripted tutorial enemy whose whole kit is 4-power
    // jabs should not escalate at anything, and a named id replaces `'*'`.
    ai: {
      '*': { escalateAfterDenial: 1.0 },
      algorithm: { escalateAfterDenial: 1.0 },
      // Normal's Grandma weights, written out in full rather than inherited:
      // a named id REPLACES the `'*'` contribution, so anything this row does
      // not say, this row does not get.
      grandma: { escalateAfterDenial: 1.0, healChance: 0.22, debuffChance: 0.20 },
      meredith_boss: {
        escalateAfterDenial: 1.0,
        phase1: ['performance_review'],
        phase2: ['strategic_pivot', 'hostile_takeover', 'strategic_pivot', 'hostile_takeover', 'board_resolution'],
      },
      intern: {},
    },
  },
};

/** Display name + blurb for a mode under the currently active name set. */
export function modeCopy(id) {
  const m = DIFFICULTY_MODES[id];
  if (!m) return null;
  return { id, name: m.name, blurb: m.blurb };
}
