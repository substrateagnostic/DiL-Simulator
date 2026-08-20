# ADVERSARIAL JUDGE VERDICT — NG+ re-tune packet (P4)

One Fable-high adversarial pass, fresh agent, no context inherited from the builder.
Instructions: try to BREAK the packet with the raw evidence and independent spot
re-simulations. The tree was left exactly as found (proposal OFF, `git diff` clean on
CombatEngine.js). Verbatim below.

---

## Verified before findings (so the findings have context)

- §3 arithmetic recomputed from the diff + `ngLapExponent` (exponents 0/1/1+d confirmed
  at `CombatEngine.js:219-223`): shipped 1.70/1.955/2.053 HP, 1.45/1.667/1.751 ATK,
  1.30/1.43/1.479 DEF; proposed 1.45/1.595/1.730 HP, 1.45/1.769/2.095 ATK,
  1.30/1.43/1.551 DEF. All table entries correct within rounding.
- Every §0/§1/§4 headline number was located in the raw files and matches
  (LADDER-base.txt:33-36, MATRIX-base.txt:21/65/68, MATRIX-base-real.txt:42/51/62-72,
  MATRIX-P4-real.txt:41/50/61-71, MATRIX-P4-lane.txt:43, TOUCH-P4.txt, NULL.txt). §2's
  H45 (75.0%/13.1), ASU25 (41.5/43.0), P2 (78.5), P7 (26-28% Hard NG+3 audit) all check
  out in their CAND files. The n-run calibration (86.7/60.7 @300) exists at
  `.claude/plans/n-run/_judge-ng-300.txt:3-4`.
- My 5 re-simulations (500 runs each) reproduce the packet within its own noise bar:
  base mer12@NG+1 Hard lane 84.4/95.6/**54.0** vs packet 85.3/96.0/57.2; P4 same cell
  92.0/96.8/**71.8** vs packet 89.8/96.2/68.5 (the named-residual improvement reproduces,
  +17.8 pp in my pair vs +11.3 claimed); P4 alg@10 Normal NG+2 real 78.2/band 20.4 vs
  80.2/18.2; touch test 0.6/1.4/-0.2 pp (null); ladder meredith 99.8/94.4/85.0 vs
  99.5/94.3/82.3.
- Instrument: `enc()` returns fresh objects (no cfg contamination), `withCand`
  records/restores correctly in reverse order, the header now prints inside the candidate
  scope, lane/real/carry loadouts are exactly what the packet says (CARRY == ng-sim
  verbatim incl. algorithm's janet/isaiah party; LANE == `_n-audit`'s `buildUnlocked`),
  assist applied in `cellFor` per the `_m-modes` law, `_ng-apply.mjs` PROPOSED lines are
  byte-exact P4.
- Laws: no code forks (3 data lines); Hard's `enemyMult` still ATK-only; `assaultSlow` is
  multiplicative on final effective ATK (`CombatEngine.js:1705`), so the cap law
  (1.45x0.70=1.015 >= Normal) holds at every lap under the new constants by construction
  — the packet's finding-3 arithmetic is right; PIP stays one max'd field;
  scripted-override build order untouched; `_check.log` green.
- Tree left as found: `_ng-apply --check` = OFF,
  `git diff --exit-code src/combat/CombatEngine.js` clean.

## Findings

1. **MATERIAL — §7 "No XP movement … lap pacing and the level curve are bit-identical"
   is false at NG+3.** `_buildEnemy` applies `rung('xpReward')` through the same decayed
   exponent (`CombatEngine.js:399,404`). The decay 0.35->0.85 moves `ngLapExponent(3)`
   1.35->1.85, so NG+3 XP goes 1.25x1.20^1.35 = **x1.60 -> x1.75 (+9.5 % XP on every
   NG+3 enemy)** — the x1.60 is Gameplay.md's own documented cell (line 983). The
   *constants* are held; the effective number is not. (Same mechanism moves NG+3 DEF
   1.48->1.55, which §3's table does disclose — XP gets no such disclosure anywhere,
   including §0's "every XP number untouched.") Practical impact is small (level cap 15),
   but a law-compliance line in the signature packet is wrong, and §8's Gameplay.md
   rewrite would expose it.

2. **MATERIAL — §4's staircase claim "NG+3 lands at or below the live baseline on both
   informative rows (82.3 vs 86.0, 58.8 vs 55.6)" is contradicted by its own
   parenthetical and by re-measurement on the algorithm row.** 58.8 is *above* 55.6. My
   two independent reads: **63.8 % (500 runs)** and **63.0 % (600 runs)**; pooled with
   the packet's 58.8 ~ **61.8 +/- 1.2** against base 55.6 +/- 2.2 — P4's algorithm
   CARRY@NG+3 sits **~4-8 pp above today's live build**, i.e. on the finale P4 makes
   *every* CARRY lap easier than live. The lap-to-lap *step* steepens (86.0->~62 is a
   real stair), but the absolute top rung softens, and the packet asserts the opposite.
   Meredith's row holds (82.3/82.7/85.0 vs 86.0).

3. **MATERIAL — §5.3's declared lane-kit cost ("karen@4 at NG+2/NG+3 … drops 8-15 pp")
   understates the worst cell by 2x, because the range was computed on Normal only
   without saying so.** karen@4 **Hard** NG+3 litigation: 35.7 % -> **6.3 %** (-29.4 pp;
   MATRIX-base-lane-ng3.txt:22 vs MATRIX-P4-lane.txt:36). Normal's cells do land in
   8-15.6.

4. **MATERIAL — undeclared >4 pp regressions at NG+3, mostly on the lane §5.2's framing
   ("the slow lanes feel it") excludes — litigation.** All one cause (per-lap ATK 1.22 +
   decay 0.85), all in the raw files, none named in §5: LANE Hard NG+3 grandma lit -15.5
   (48.8->33.3) and comp -8.2, mer12 lit -8.7 (52.5->43.8); LANE Normal NG+3 mer9 lit
   -10.5 (65.3->54.8), grandma lit -6.7; REAL Hard NG+3 algorithm lit -6.5 (95.5->89.0);
   CARRY Hard meredith NG+3 -7.4 (72.4->65.0). Borderline (~4 pp): real mer12 audit Hard
   -4.0, rd comp Hard -4.5, rd lane Normal lit -4.2. Laps 1-2 are genuinely clean — I
   found zero undeclared >4 pp drops there in either loadout; every audit cell improves.

5. **MINOR — the CAND evidence files carry lying headers.** Every `CAND-*.txt` except
   `CAND-P7-ladder.txt` prints the SHIPPED multipliers under the candidate's label (e.g.
   CAND-H45-real.txt:6 says maxHP 1.700 for the 1.45 candidate). The harness comment
   admits this happened "for one sweep"; the artifacts show it was **every sweep but the
   last**. The cells themselves are valid — CAND-P4-real matches MATRIX-P4-real within
   noise, and H45/ASU25 deltas match their knob directions — but these are exactly the
   "lying evidence file" the repo's capture law names, and §9 presents the directory as
   reproduction evidence without flagging it.

6. **MINOR — instrument latent bug: `withMode` never restores.** `Difficulty.force(id)`
   returns the *new* forced id (`DifficultyManager.js:76-80`), so `withMode`'s `finally`
   re-forces the same mode instead of restoring. No shipped number is contaminated
   (every `cellFor` sits inside an explicit `withMode`), but the first future "at rest"
   cell run after any `withMode` will silently measure the last forced mode.

7. **MINOR — §0's "NG+1 and the Hard x NG+1 stack cannot move by construction" is false
   as compressed.** Only the ATK/DEF threat product is pinned; NG+1 *cells* move by
   design (entry HP is the headline knob) and §4 itself reports NG+1 moving +2.3 to
   +11.3 pp. `_ng-apply.mjs` scopes the sentence correctly to the per-lap ATK knob; §0
   lost the scope.

8. **MINOR — §5.1 "Algorithm 63.6 -> 86.0 %. Still inside Gameplay.md's authored 40-85
   band (at its edge)":** 86.0 is outside 40-85. Within noise of the edge, but "inside"
   is the wrong word on a signature line.

9. **MINOR — §4's Break-economy guard ("lit 1.65 -> 1.20 breaks at 7.8 -> 6.5 rounds")
   has no supporting row in any saved file** — no `brk` column exists anywhere in
   ng-run/ (the `--breaks` run was not captured). Rounds are consistent with the saved
   files (7.62->6.37).

10. **MINOR — §6's "improved from 54.5 / 40.8":** the second half (40.8->39.0) is a
    decline within noise, not an improvement. Also §7's "15-23 % less" HP is the ratio
    in the wrong direction (shipped is 17-23 % *more*; proposed is 14.7-18.4 % *less*).

11. **NOTE — framing ruling (§5.4) is defensible, not goalpost-moving.** The CARRY@NG+1
    <= FRESH@NG rule predates modes (ng-sim, Gameplay.md and the engine comment are all
    mode-agnostic, measured against `shipped`), Hard's FRESH@NG is tuned near the floor
    (60.8-64 % meredith), and **the base build already violates the rule on Hard at
    karen/grandma/meredith** (LADDER-base.txt:40-46) — P4 adds only the algorithm row
    (87.6->96.0), which §5.4 declares. §6 residual 1 (the Normal NG+1 inversion) is
    genuinely pre-existing: base +4.6/+5.0/+3.0 vs P4 +2.5/+5.7/+4.2 — same band. NOTE
    also: LADDER-base is 500 runs where §9's repro says 600 (disclosed in §1); §3's NG+3
    ATK is 2.095, tabled as 2.10.

## Verdict

**PASS WITH CORRECTIONS.** The diff does exactly what it says, the instrument is sound
where it counts, the headline cells reproduce under independent re-simulation (the named
residual reproduces *stronger* than claimed), and the costs are real and in the raw
files. Before signature, correct: (1) the §7/§0 no-XP-movement claim — NG+3 XP moves
x1.60->x1.75 via the decay exponent, either accept and document it or exempt `xpReward`
from the decayed exponent; (2) §4's algorithm-NG+3 "at or below the live baseline" — it
is above it by ~4-8 pp on re-measurement, so the finale's top rung softens rather than
holds; (3) §5's NG+3 cost declaration — the 8-15 pp karen band is Normal-only (Hard NG+3
lit is -29.4), and litigation pays at NG+3 too (-6.5 to -15.5 on five cells), not just
"the slow lanes."

---

*Builder's disposition (same day): all corrections folded into PROPOSAL.md §§0/3/4/5/6/7/9
and §10; the `withMode` restore bug fixed in `tools/_ng-retune.mjs` (with a comment naming
the same latent shape in `tools/_m-modes.mjs` for its owner); `BREAKS-P4.txt` captured at
600 runs; the CAND header defect declared in §9 rather than regenerated (the cells are
valid and regeneration would re-roll every number §2 cites).*
