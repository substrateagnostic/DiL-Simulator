# TRAIT PACKET — the three Working Styles (Janet's quiz)
*For producer sign-off. Names and perks ship DARK until signed —
`TRAIT_PERKS_LIVE` in `src/data/traits.js` is the signature line. The quiz
scene and the dialog variants are content, judged separately, and may go live
ahead of this packet.*

## The frame

Personality selection is diegetic: day one, Andrew's desk, his work PC's
browser homepage has been set — by Janet, who never says so — to an
unskippable working-style quiz. 3–4 questions on any path. The result is
WHO ANDREW IS for the rest of the game: a `trait_<id>` flag, a Stats-tab line,
~11 trait-conditional dialog lines per style across Acts 1–2, one epilogue
card, and (once signed) one small combat perk.

The trait must never collide with Practice Group identity — the build is how
you fight, the trait is who Andrew is. No perk issues a Practice-Group
exclusive currency (Litigation turn economy, Compliance Composure-off-Defence,
Audit Composure-off-Objections) and none touches the weakness-hit stack.

## The three styles

### 1. THE ADVANCE READER — `trait_advance_reader`
Over-prepared. Read the syllabus nobody else knew existed.
- **Perk: OPENING STATEMENT** — starts every fight with **8 Confidence**.
- **Why 8 and not 10 (measured):** every basic hit banks exactly 10
  Confidence, so a 10-point head start deletes one whole attack from the road
  to Assert Dominance and shifts the burst turn. At karen@3 the CASUAL
  policy's wins are **100 % power-move-carried** (0.0 % win rate in runs that
  never reach 100 Confidence), so that one-turn shift measured **−6.0 pp
  COMPETENT / −7.5 pp CASUAL** — the perk was a trap at 10. At 8 the attack
  count to 100 is unchanged on the modal path. Any retune must stay below the
  10-point action quantum.

### 2. THE SHOCK ABSORBER — `trait_shock_absorber`
Unflappable under impact. The office lands on this person and the person does
not move.
- **Perk: BUILT FOR IMPACT** — Brace QTE timing bands **×1.2** (perfect band
  0.10→0.12 of track, good 0.35→0.42). Multiplies into the same
  `qteModifiers` channel as the Ergonomic Wrist Support relic (×1.4), so the
  two stack multiplicatively and sanely. Accessibility-adjacent by design.

### 3. THE PERCOLATOR — `trait_percolator`
Slow, steady accumulation. Does not surge; builds. Runs on process and actual
coffee.
- **Perk: FRESH POT** — **+1 Coffee (MP)** at the start of each of Andrew's
  turns. A drip, not a surge; the name is the mechanic. (Base pool 75, ability
  costs 10–50 — over a ten-round boss this is one cheap ability.)

## The numbers (tools/_q-trait-sim.mjs, 4000 runs/arm, raw in trait-sim-raw.txt)

| rung | perk | COMPETENT Δ | CASUAL Δ |
|---|---|---|---|
| **karen@3 (the bar)** | Advance Reader (8) | **−0.3 pp** | **+1.0 pp** |
| karen@3 | Percolator (+1/turn) | **−0.3 pp** | **+0.6 pp** |
| karen@3 | Shock Absorber (×1.2) | **+0.1 pp** (−0.7 shaky-aim) | 0.0 by construction |
| chad@5 | worst of three | +0.4 pp | −1.2 pp |
| grandma@7 | worst of three | +1.3 pp (Shock Absorber) | ±0.0 pp |

Bar: ≤ ~2 pp at karen@3. **All three pass**, and nothing exceeds 1.3 pp
anywhere on the ladder. The CASUAL policy never Braces, so the Shock Absorber
rows there are structurally zero — reported, not hidden; the shaky-aim arm
(AIM_SHAKY, the player the relic exists for) is the honest COMPETENT read.

## What is already live vs dark

| piece | state |
|---|---|
| Quiz scene (`janet_quiz`), result pages, trait flags | live content (judge-gated) |
| Trait-conditional dialog variants (11 sites × 3 styles) | live content (judge-gated) |
| Stats tab "Working Style" line | live (shows the style name) |
| Epilogue card THE WORKING STYLE | live (plate-pending frame, art pass queued) |
| `FLAGS_OF_RECORD` carry (3 additive keys) | live |
| Combat perks (all three) | **DARK — `TRAIT_PERKS_LIVE = false`** |

Dev/test override: `globalThis.__traitPerksOn = true` (used by the sim
harness; never shipped on).

## Decision requested

Sign or redline: (1) the three style names, (2) the three perks and their
values. Flipping `TRAIT_PERKS_LIVE` to `true` is the whole go-live; no other
change is needed.
