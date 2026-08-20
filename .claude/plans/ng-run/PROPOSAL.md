# THE NG+ RE-TUNE — the dossier's "largest unpaid bill", priced

**Lane:** NG-run. Commissioned against `.claude/plans/j-run/COMBAT-PLAYSTYLE-DOSSIER.md`
§6.5 ("New Game+ moves, and it needs its own re-tune pass — the largest unpaid bill in the
design") and the n-run audit accommodation's declared NG+ residual
(CLAUDE.md: *"NG+ × Hard still prices Audit out off-ladder … belongs to the already-named
NG+ re-tune bill"*).
**Nothing here is shipped.** `src/` at rest is the shipped baseline. The proposal is a
3-line diff at `.claude/plans/ng-run/PROPOSAL.diff`, applied and reverted by
`node tools/_ng-apply.mjs --on|--off`, byte-exact in both directions (verified against
`git diff --exit-code`). The producer signs before it merges — balance is producer-gated,
always (the l-run precedent).
**Harness:** `tools/_ng-retune.mjs` — NG+ laps × difficulty modes × practice lanes through
the shipping path (`Difficulty.force()` + the engine's own `ngPlus` opts), candidates as
recorded-and-restored writes to the `NG_PLUS_*` exports. Underneath it: the real
`CombatEngine`, `tools/combat-sim.mjs`, and the same lane policies (`tools/_j-verify.mjs`)
every previous balance ruling used.
**Null arm:** 800 runs/cell, the same shipped cell measured twice: |Δ| 0.6–2.0 pp
(`NULL.txt`). Survey cells are 600 runs (1σ ≈ 2 pp at p=0.5); candidate sweeps 400 runs
(1σ ≈ 2.5 pp). **Nothing below ~3 pp is treated as a finding.**

---

## 0. THE ONE-PARAGRAPH VERSION

NG+ buys its difficulty with the one stat the difficulty modes deliberately refused —
enemy maxHP (entry ×1.70, compounding to ×1.96–2.05) — so for the real carried player it
reads almost entirely as ROUNDS, while the mode system stacks its ATK premium
multiplicatively on top of NG+'s (Hard × NG+1 = 1.45 × 1.45 = **2.10×**). The two ramp
lanes pay for every one of those extra rounds at the stacked damage rate, which is the
whole n-run residual: Audit at meredith@12 NG+1 on Hard wins 57 % of **29-round** fights
while Litigation wins 85 % of 10-round ones. On top of that, the J-package and the modes
shipped AFTER these constants were tuned, and the documented staircase quietly collapsed:
Gameplay.md promises Meredith **82.6 → 48.2 → 29.8 %** across CARRY laps; today's live
build measures **97.8 → 92.2 → 86.0 %** (`LADDER-base.txt`). The re-tune moves the NG+
budget off HP and onto per-lap ATK: **entry maxHP 1.70 → 1.45, per-lap maxHP 1.15 → 1.10,
per-lap ATK 1.15 → 1.22, lap decay 0.35 → 0.85** — entry ATK, entry DEF and both
`xpReward` constants untouched (the decay exponent still moves EFFECTIVE NG+3 XP and DEF;
declared in §3/§5). Per-lap terms have exponent 0 at lap 1, so **the NG+1 threat product
(ATK/DEF) and the Hard × NG+1 ATK stack cannot move by construction** — NG+1 *cells* do
move, via the HP cut, and §4 reports them; the ladder keeps a real lap-to-lap descent
(the NG+2 → NG+3 step steepens) while the rounds bill is paid everywhere. Lap-0 is
untouched by construction (`NG_PLUS_*` is only read when `laps > 0`) and measured
untouched (`TOUCH-P4.txt`: −0.3/0.0/+0.2 pp).

## 1. THE DIAGNOSIS — three findings, three loadout models

The instrument runs three loadout models because "the NG+ player" is not one person, and
tuning against the wrong one is how a phantom gets fixed:

- **LANE** — `buildUnlocked(tree, level)`, no shop stats. The n-run's own instrument
  (`_n-audit.mjs`), so these numbers compare 1:1 with the accommodation evidence and the
  CLAUDE.md residual. It UNDERSTATES a real NG+ player (who carries all 19 abilities and
  rebuys the maxed shop upgrades on day one); the lane GAP is the claim, never the
  absolute rate. Calibration: the n-run judge's meredith@12 NG+1 Hard spot check read
  86.7 / 60.7 % at 300 runs; this instrument reads 83.1–85.1 / 56.0–56.8 % at 800
  (`NULL.txt`) — same cell, same shape.
- **REAL** — all abilities + maxed shop stats + the LANE's policy. The honest NG+ lane
  player: NG+ carries everything, the lane is a playstyle.
- **CARRY** — ng-sim.mjs's CARRY definition verbatim (all abilities + shop, COMPETENT
  policy), because the acceptance rule (CARRY@NG+1 ≤ FRESH@NG) was written against it.

**Finding 1 — the staircase collapsed, and it is a regression, not a tune.**
(`LADDER-base.txt`, Normal, 500 runs; the "documented" column is Gameplay.md's own table,
measured before the J-package and the modes shipped.)

| CARRY rung | documented | live today |
|---|---|---|
| meredith_boss NG+1 / +2 / +3 | 82.6 / 48.2 / 29.8 % | 97.8 / 92.2 / 86.0 % |
| algorithm NG+1 / +2 / +3 | 80.8 / 51.4 / 35.6 % | 90.0 / 63.6 / 55.6 % |
| rule: CARRY@NG+1 ≤ FRESH@NG | held on both informative rows | **violated at karen (+4.6), grandma (+5.0), meredith (+3.0)** |

The J-package (Pivot, One More, Break economy) and the surgery raised the carried kit's
effective damage after these constants were set. Nothing in NG+ moved; the ground under
it did.

**Finding 2 — for the real player, NG+ is a rounds tax, not a threat.**
(`MATRIX-base-real.txt`, 600 runs.) Win rates sit at 95–100 % almost everywhere through
NG+2 for Litigation/Compliance while fight length doubles to quadruples; the lane that
cannot go fast pays the whole bill. Audit at meredith@9: 4.8 rounds at lap 0 → 12.0
(NG+1 Hard) → **19.7** (NG+2 Hard, 54.5 % win, near-death 66 %). At lane kits the same
cell chain peaks at **28.7 rounds** (meredith@12 NG+1 Hard) and Easy-mode NG+2 audit
meredith@9 hits **52.8 rounds with 2 timeouts** (`MATRIX-base.txt`). The declined-Tier-2
ruling stands on the record: rounds are a cost by themselves (the 13-round Meredith).

**Finding 3 — the mode stack is multiplicative and the lanes split under it.**
Hard multiplies ATK ×1.45 on top of the NG+ rung: 2.10× at NG+1, 2.42× at NG+2, dmg/T at
the Director reaches 67–82 against a lane-kit L10 pool (win 8.8 / 0.2 / 33.0 % —
`MATRIX-base.txt`). The audit accommodation's own arithmetic survives every lap
(assaultSlow is multiplicative too: a fully documented enemy presses at lapATK × 1.45 ×
0.70 = lapATK × 1.015, i.e. a hair above Normal-at-that-lap, never below — the cap law
generalises by construction). What the accommodation cannot buy back is TIME: the ramp
needs turns, NG+ HP inflation supplies them, and Hard prices each one.

**Diagnosis in two sentences.** NG+ buys difficulty with maxHP — the exact knob the modes
ruled out because more HP is more rounds — so the carried player feels nothing while the
ramp lanes drown in stacked-ATK rounds; and the constants pre-date the J-package, so the
documented staircase no longer exists on the live build. The knob is therefore a budget
swap inside the NG+ constants themselves: HP down (rounds), per-lap ATK up (staircase),
decay up (the NG+3 flex), entry ATK held (the Hard stack must not move at NG+1).

## 2. THE CANDIDATES, MEASURED ALONE THEN COMPOSED

Eight singles and six compositions, 400 runs/cell, REAL loadout, Normal+Hard, the pain
cells (`CAND-*.txt`). The two load-bearing singles:

| single | audit mer9@Hard NG+2 (base 54.5 %, 19.7 rnd) | CARRY staircase (Normal alg NG+3, base 55.6 %) |
|---|---|---|
| **H45** entry HP 1.45 | **75.0 %, 13.1 rnd** | 76.8 % — ladder deleted |
| **ASU25** per-lap atk 1.25 | 41.5 % — worse | 43.0 % — steeper, rounds untouched |

Neither works alone: the HP cut pays the rounds bill and flattens the ladder; the ATK
raise restores the ladder and deepens the hole. Composed, they thread it. The composition
grid (P1/P2/P3/P4/P5) converged on **P4**; two rejections worth the producer's eye:

- **P7 (P4 + entry atk 1.45 → 1.50)** — REJECTED, and the rejection is the evidence for a
  residual below: the entry-ATK dial bought nothing visible at NG+1 (CARRY is saturated
  ~99–100 % regardless) while costing the audit pain cells 2–7 pp and pushing Hard NG+3
  audit to 26–28 %. The NG+1 inversion is not purchasable with NG+ constants at a price
  the lanes can pay.
- **P2 (decay 0.50)** — best pure lane relief, but NG+3 flattens to 78.5 % on the
  algorithm CARRY rung; the flex stops being a flex. Decay is the only knob that reaches
  NG+3 without touching NG+1/NG+2 (lap exponents 0/0/1/1+d), so P4 spends it.

## 3. THE PROPOSAL — P4

```
NG_PLUS_ENTRY.maxHP    1.70 → 1.45      NG_PLUS_SCALING.maxHP  1.15 → 1.10
NG_PLUS_SCALING.atk    1.15 → 1.22      NG_PLUS_LAP.decay      0.35 → 0.85
(entry atk 1.45, entry def 1.30, per-lap def 1.10, both xpReward — UNTOUCHED)
```

Effective enemy multipliers (HP / ATK / DEF):

| lap | shipped | proposed |
|---|---|---|
| NG+1 | 1.70 / 1.45 / 1.30 | **1.45** / 1.45 / 1.30 |
| NG+2 | 1.96 / 1.67 / 1.43 | **1.60 / 1.77** / 1.43 |
| NG+3 | 2.05 / 1.75 / 1.48 | **1.73 / 2.10 / 1.55** |

**The decay exponent also reaches effective NG+3 XP** (the `xpReward` constants are held,
but `rung()` compounds them through the same decayed exponent): **×1.60 → ×1.75** on
every NG+3 enemy, +9.5 %. Declared as a cost/reward in §5.5 rather than engineered away —
exempting `xpReward` from the exponent would be new engine surface in a 3-line dark diff,
and a small XP bump on the flex lap that just got its ATK raised is symmetric. If the
producer wants NG+3 XP pinned at ×1.60, that is a one-function change (`ngLapExponent`
made per-key) and a separate line on the signature.

The shape: each lap now raises the THREAT more than the LENGTH — the same trade the Hard
bundle made ("a hard mode raises the threat per turn; it does not make the fight take
longer"), applied to the ladder that was violating it.

## 4. BEFORE → AFTER (600 runs/cell; base columns from the same instrument)

**The named residual** (lane kits, the n-run comparable — `MATRIX-P4-lane.txt`):

| meredith@12 NG+1 × Hard | base | P4 |
|---|---|---|
| audit win / rounds | 57.2 % / 28.7 | **68.5 % / 23.7** |
| lit−audit gap | 28.1 pp | **21.3 pp** |
| band (max−min) | 38.8 pp | 27.7 pp |

**The honest population** (REAL loadout — `MATRIX-P4-real.txt` vs `MATRIX-base-real.txt`):

| cell (audit unless noted) | base win / rounds | P4 win / rounds |
|---|---|---|
| meredith@9 Hard NG+1 | 90.2 % / 12.0 | **92.5 % / 10.1** |
| meredith@9 Hard NG+2 | 54.5 % / 19.7 | **59.8 % / 14.4** |
| meredith@12 Hard NG+2 | 90.8 % / 15.0 | **95.0 % / 8.9** |
| algorithm@10 Hard NG+1 | 74.0 % / 13.5 | **80.0 % / 11.3** |
| algorithm@10 Hard NG+2 | 51.7 % / 15.9 | **62.8 % / 12.7** |
| algorithm@10 Normal NG+2 | 62.7 % / 14.0 (band 36.3) | **80.2 % / 11.0 (band 18.2)** |
| meredith@9 Normal NG+2 | 84.7 % / 15.0 | **91.2 % / 10.8** |
| meredith@9 **Easy** NG+2, lane kit (the cell that TIMED OUT at base) | 57.8 % / **52.8 rnd**, 2 timeouts | **81.7 % / 20.7 rnd**, 0 timeouts |

**The staircase** (CARRY, Normal — `LADDER-P4.txt`): meredith 99.5 / 94.3 / **82.3 %**,
algorithm 93.5 / 86.0 / **58.8 %**, against live-base 97.8 / 92.2 / 86.0 and 90.0 / 63.6 /
55.6. Meredith's NG+3 lands at or below the live baseline (82.3 vs 86.0; the judge's
re-measures read 82.7–85.0). **The algorithm's NG+3 does not**: the adversarial pass
re-measured it twice (63.8 % at 500 runs, 63.0 % at 600 — pooled with this file's 58.8,
≈ 61.8 ± 1.2 against base 55.6 ± 2.2), so on the finale **every CARRY lap under P4 is
somewhat easier than live** — the lap-to-lap STEP steepens (86.0 → ~62 is a real stair
where 63.6 → 55.6 was a shuffle), but the top rung softens by ~4–8 pp. Declared in §5.
Every CARRY fight is 1–3 rounds shorter. The documented 48/30 shape is **not** restored —
see §6.

**Guard cells.** Lap-0: untouched by construction, measured −0.3 / 0.0 / +0.2 pp
(`TOUCH-P4.txt`). Easy: every P4 cell within noise of base up through NG+3 (worst:
algorithm NG+3 audit 89.2 → 87.3 %). Break economy (`BREAKS-P4.txt`, 600 runs): breaks
per fight scale with fight length and never approach zero — algorithm Hard NG+2 lit
1.66 → 1.18 at 7.8 → 6.4 rounds, audit 0.76 → 0.53; the Break-floor law proper is a
lap-0/mode law and lap-0 does not move.

## 5. WHAT IT COSTS ELSEWHERE — declared, not discovered

1. **CARRY NG+2 and NG+3 get easier on the finale.** Algorithm NG+2 63.6 → 86.0 % — the
   direct price of paying the rounds bill — landing at/just ABOVE the top edge of
   Gameplay.md's authored 40–85 band. Algorithm NG+3 55.6 → ~62 % (judge-pooled
   61.8 ± 1.2): the finale's top rung softens ~4–8 pp rather than holding, even as the
   NG+2 → NG+3 step steepens. Meredith NG+2 94.3 % (base 92.2), NG+3 holds (82.3 vs 86.0).
2. **NG+3 leans ATK, and EVERY lane pays there — litigation included.** All one cause
   (per-lap ATK 1.22 + decay 0.85), all in the raw files: LANE Hard NG+3 grandma lit
   48.8 → 33.3 (−15.5), comp −8.2; meredith@12 lit 52.5 → 43.8 (−8.7); LANE Normal NG+3
   meredith@9 lit 65.3 → 54.8 (−10.5), grandma lit −6.7; REAL Hard NG+3 algorithm lit
   95.5 → 89.0 (−6.5); CARRY Hard meredith NG+3 72.4 → 65.0 (−7.4). Audit at NG+3:
   meredith@9 Normal 81.5 → 75.2, algorithm Normal 53.5 → 47.7, algorithm Hard
   37.5 → 32.0 (400-run base columns, ±3 pp). NG+3 is the documented flex —
   "deliberately below the band" — and this is what re-steepening it costs. **Laps 1–2
   are clean**: the adversarial pass found zero undeclared >4 pp drops at NG+1/NG+2 in
   either loadout, and every audit cell there improves.
3. **Constructed lane-kit players on early rungs pay for the per-lap ATK, and Hard's
   worst cell is severe.** karen@4 at NG+2/NG+3 with a bare 3-ability lane kit and no
   shop stats drops 8–15.6 pp on NORMAL — and on HARD NG+3, karen@4 litigation falls
   35.7 → 6.3 % (−29.4 pp). Lane-loadout model only; the REAL loadout reads 95.8–100 %
   on every karen NG+ cell, and a player on lap 2+ without their carried kit does not
   exist in the game (NG+ hands everything back). The number is on the record.
4. **The CARRY@NG+1 rule now also flags on Hard** (algorithm 96.0 vs FRESH 87.8; the
   base build already flags karen/grandma/meredith on Hard before any knob moves). The
   rule is evaluated on Normal — FRESH@NG on Hard is tuned to be barely passable (61–64 %
   at meredith), so demanding a carried lap-2 be harder than that is not a coherent bar;
   this packet states that ruling explicitly rather than leaving it implied.
5. **Effective NG+3 XP rises ×1.60 → ×1.75** (+9.5 % per NG+3 enemy) through the decay
   exponent, constants untouched (§3). Small in practice — the level cap is 15 and NG+3
   players are at it — and symmetric with the lap's added threat; pinning it is a named
   one-function option on the signature line.

## 6. WHAT THIS DOES **NOT** CLOSE — the residuals, named

- **The NG+1 inversion (CARRY@NG+1 > FRESH@NG by 3–6 pp at saturated ceilings).**
  Pre-existing (it is in `LADDER-base.txt` before any knob moves), caused by the
  J-package's carried-kit power, and NOT purchasable with NG+ constants — P7 measured
  the entry-ATK dial and it bought nothing at NG+1 while taxing the lanes. The on-record
  instrument for it is H-run §8.2's sized knob: **charge the One-More returned turn 25
  Confidence on NG+ laps only** (one engine conditional, measured band-neutral there).
  That is a code-side change and a separate producer decision; this packet only names it.
- **Hard × NG+2/3 audit stays a corner.** meredith@9 NG+2 54.5 → 59.8 % (a real
  improvement, at 19.7 → 14.4 rounds); NG+3 40.8 → 39.0 % (within noise — NOT improved,
  just not worsened). Neither is inside the ~10 pp lap-0 standard. Three difficulty
  systems stack there (mode × lap × lane); closing it fully needs a lap-aware
  accommodation term, which is new engine surface this lane does not propose.
- **Lane-kit Regional Director on Hard NG+ remains near-unwinnable** (25.5 / 3.7 / 43.3 %
  at NG+1). The REAL loadout reads 97.2–99.7 % there; the lane-kit number is mostly the
  loadout model, not the tune, and it barely moves under any candidate.

## 7. STANDING LAWS, CHECKED

- **No code forks** — the diff is three constant lines; every mode remains a data bundle.
- **Modes do not use maxHP** — unchanged; NG+ still uses HP, at 14.7–18.4 % below the
  shipped multipliers per lap.
- **The audit accommodation cap law** — untouched and lap-proof by multiplication
  (§1, finding 3). `fileRate`/`assaultSlow`/`seedRecord` all unchanged (SEED-DECISION.md:
  seed is producer-frozen pending his playtest).
- **PIP/assist single field** — untouched.
- **The NG+ build order** (multiply base, then spread overrides) — untouched; scripted
  fights keep their explicit values.
- **XP** — both `xpReward` CONSTANTS held; NG/NG+1/NG+2 effective XP bit-identical.
  NG+3 effective XP moves ×1.60 → ×1.75 through the decay exponent — declared in §3/§5.5,
  not hidden behind "constants untouched".
- **`npm run check`** — exit 0 on the committed tree (`_check.log`; the chunk-size
  warning is expected per CLAUDE.md).

## 8. ON SIGNATURE (not in the dark diff, on purpose)

1. Rewrite the `NG_PLUS_*` comment block in `CombatEngine.js` — its measured table is
   pre-J-package and already wrong for the LIVE build even without this proposal.
2. Rewrite Gameplay.md's "New Game+" multiplier and win-rate tables from a fresh
   `tools/ng-sim.mjs --runs 500` run — **noting that ng-sim now measures Normal mode**
   (the resolver defaults to `normal` since DIFFICULTY_LIVE flipped; the shipped tables
   were measured against `shipped`).
3. Re-run `node tools/_ng-retune.mjs --matrix --ladder --touch --cand base` and confirm
   the applied tree reproduces the P4 columns (the A/B identity check).

## 9. REPRODUCTION

```
node tools/_ng-apply.mjs --check                                  # OFF at rest
node tools/_ng-retune.mjs --null   --runs 800                     # noise floor
node tools/_ng-retune.mjs --matrix --runs 600 --loadout real      # baseline survey
node tools/_ng-retune.mjs --matrix --cand P4 --runs 600 --loadout real --laps 1,2,3
node tools/_ng-retune.mjs --matrix --cand P4 --runs 600 --loadout lane --modes normal,hard --laps 1,2,3
node tools/_ng-retune.mjs --ladder --cand P4 --runs 600           # acceptance per mode
node tools/_ng-retune.mjs --touch  --cand P4 --runs 600           # lap-0 null
```

Raw evidence in this directory: `MATRIX-base*.txt`, `MATRIX-P4-*.txt`, `LADDER-*.txt`,
`CAND-*.txt`, `TOUCH-P4.txt`, `BREAKS-P4.txt`, `NULL.txt`, `_check.log`.

**Evidence caveats, on the record:** every `CAND-*.txt` except `CAND-P7-ladder.txt` was
generated before the header fix and prints the SHIPPED multipliers under the candidate's
label — the CELLS are valid (candidates are applied per cell inside the restore scope,
and `CAND-P4-real.txt` matches the regenerated `MATRIX-P4-real.txt` within noise), but
read those headers as wrong. The finals (`MATRIX-P4-*`, `LADDER-P4`, `TOUCH-P4`,
`BREAKS-P4`) carry correct headers. `LADDER-base.txt` is 500 runs where §9's repro
commands say 600. §3 tables 2.095 as 2.10.

## 10. JUDGED

One adversarial Fable-high pass over the numbers (`_judge-verdict.md`, full text):
**PASS WITH CORRECTIONS.** The judge recomputed §3's arithmetic, located every headline
in the raw files, re-simulated five cells independently (the named residual reproduced
*stronger* than claimed: its base/P4 pair moved +17.8 pp vs the packet's +11.3), audited
the instrument, and left the tree as found. Its corrections — the NG+3 XP movement, the
algorithm NG+3 staircase overclaim, the Normal-only karen cost range, the undeclared
litigation NG+3 cells, the CAND header defect, and a latent `withMode` restore bug in
the harness (also present in `tools/_m-modes.mjs`, noted there for its owner) — are all
folded into §§0/3/4/5/6/7/9 above and into `tools/_ng-retune.mjs`.

---

## SIGNING LINE

The re-tune ships DARK until this line carries the producer's word.

- [ ] **APPROVED — apply PROPOSAL.diff** (then do §8's three deliverables)
- [ ] **APPROVED WITH CHANGES:** ______________________________________________
      (named option: pin NG+3 XP at ×1.60 — one function, `ngLapExponent` per-key — §5.5)
- [ ] **DECLINED — keep the shipped ladder** (the §1 regression then still stands
      and should be re-billed separately)

Producer: ____________________   Date: ____________
