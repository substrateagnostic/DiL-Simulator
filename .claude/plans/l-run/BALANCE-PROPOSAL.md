# THE BALANCE PROPOSAL — "way too easy", answered with numbers

**Lane:** L-run, balance seat. Commissioned 2026-08-05 by the producer: *"yes, balance
pass. Way too easy."*
**Nothing here is shipped.** `src/` at rest is the shipped baseline. The proposal is a
138-line diff at `.claude/plans/l-run/PROPOSAL.diff`, applied and reverted by
`node tools/_l-apply.mjs --on|--off`, which is byte-exact in both directions (verified
against `git diff`). The producer signs the band before it merges.
**Harness:** `tools/_l-balance.mjs`, which imports the lane policies and the tree
derivation from `tools/_j-verify.mjs` so it measures the same trees the Abilities tab
renders. Underneath both is `tools/combat-sim.mjs` — the real `CombatEngine`, the real
`ENEMY_STATS` / `PLAYER_ABILITIES` / `balance.json`, and the same COMPETENT / CASUAL
policies every previous balance ruling on this project used.
**Prior art this must not fight:** `.claude/plans/h-run/weakness-turnback-economy.md`
(the currency is enemy turns; the PIP floor pays for every stat knob) and
`.claude/plans/j-run/COMBAT-PLAYSTYLE-DOSSIER.md` (the currency graph, the Practice
Groups, the diversity band, the bar-scale law).

---

## 0. THE ONE-PARAGRAPH VERSION

The producer is right and the reason is not the one the brief assumed. **The bosses' damage
numbers are fine; their TURNS are not.** Measured on the shipped build, a story boss needs
between **7.5 and 45.1 turn attempts** to kill Andrew at its own damage-per-turn, and gets
between **2.5 and 9.8** — Grandma at level 8 needs 45 and gets 4.9. Two things take those
turns away: **denial** (23–61 % of every boss's turn attempts are fizzled or Broken) and
**quiet turns** (of the turns that survive, 30–74 % deal zero damage, because the phase
lists are mostly heals, buffs, debuffs and stuns and the picker draws from them flat). A
live capture through the shipping path makes it concrete: at the intended level, against
the game's toughest Henderson, a scripted line took **twelve turns and zero damage**.
The proposal therefore spends nothing on enemy stats and everything on enemy turns:
**an ESCALATION RESPONSE** (a boss whose move you just took away answers with a damaging
one — fires only on a turn the player denied, which the casual floor never does), **the
Denial Tax seal at one denial instead of two**, **Press Advantage repriced 40 → 52**, and
**starting Coffee 75 → 60** (B24, already proposed). It moves the 21-cell PIP floor by
**1.24 pp** against an instrument whose own null arm is **1.12 pp**, and it
is the only candidate set tested that does. The brief's premise that *"every ENEMY buff is
casual-safe"* is **false and now measured**: a flat +15 % on boss ability power moves the
floor **12.13 pp, 21 cells down and 0 up, worst cell −23.2 pp** — and still leaves eleven
of twelve rungs outside the requested win band. Two costs are declared
rather than buried: the Practice-Group diversity band widens (**6.5 pp -> 16.5 pp**), all of it
Audit, and NG+ gets harder (`ng-sim`: `algorithm@NG+3` 68.5 % -> 48.0 %). And the honest answer to the requested
70–85 % win band is **no, not at a price this game can pay** — §7 shows what reaching it
costs and why the right band for this instrument is a different number.

---

## 1. THE DIAGNOSIS — where the difficulty actually leaks

`node tools/_l-balance.mjs --diag --runs 300`, shipped build, COMPETENT policy on the
shipped kit (a player who never opens the Abilities tab).

| encounter | lvl | win | rounds | HP-left | eTurns | **denial** | **quiet** | sealed | **dmg/T** | dmg/hit | **TTK** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| karen | 3 | 99.0 % | 4.10 | 72.5 % | 4.10 | 29.8 % | 31.5 % | 0.1 % | 16.58 | 33.05 | **7.5** |
| karen | 4 | 99.3 % | 3.83 | 75.9 % | 3.83 | 33.6 % | 32.1 % | 0.5 % | 14.27 | 30.30 | **9.5** |
| chad | 5 | 99.3 % | 4.44 | 64.3 % | 4.44 | 41.0 % | 5.4 % | 6.0 % | 17.13 | 31.99 | **8.6** |
| chad | 6 | 100 % | 3.48 | 89.3 % | 2.51 | **61.6 %** | 5.7 % | 7.2 % | 6.84 | 20.93 | **23.4** |
| grandma | 7 | 100 % | 6.22 | 87.4 % | 6.22 | 22.8 % | **72.4 %** | 1.6 % | 6.51 | 72.82 | **26.4** |
| **grandma** | **8** | 99.7 % | 5.88 | **89.8 %** | 4.89 | 25.3 % | **73.0 %** | 2.3 % | **4.08** | 47.12 | **45.1** |
| restructuring_trio | 7 | 100 % | 6.00 | 58.5 % | 9.67 | 7.7 % | 49.3 % | 0.4 % | 10.71 | 24.88 | 16.1 |
| restructuring_trio | 8 | 100 % | 6.12 | 58.2 % | 9.78 | 6.8 % | 48.6 % | 0.9 % | 10.73 | 24.04 | 17.1 |
| meredith_boss | 8 | 99.3 % | 7.97 | 75.3 % | 6.98 | 38.4 % | 48.8 % | 8.2 % | 8.71 | 40.87 | 21.1 |
| meredith_boss | 9 | 99.7 % | 7.02 | 82.3 % | 6.03 | 40.8 % | 51.6 % | 8.6 % | 6.63 | 38.87 | 29.6 |
| regional_director | 10 | 100 % | 4.22 | 75.7 % | 3.22 | 32.6 % | 30.2 % | 0.0 % | 16.03 | 28.01 | 13.0 |
| algorithm | 10 | 100 % | 6.07 | 82.4 % | 5.15 | 25.9 % | 48.3 % | 1.4 % | 7.98 | 29.14 | 26.1 |

`eTurns` = enemy turn ATTEMPTS. `denial` = the share of them fizzled or Broken. `quiet` =
of the turns that landed, the share that dealt zero damage. `dmg/T` = player HP lost per
turn ATTEMPT, so a denied turn correctly counts as a zero. **`TTK` = how many turn
attempts the boss would need to kill Andrew at that rate.**

**Read the last two columns together and the complaint stops being a matter of taste.**
Grandma at level 8 needs **45.1** turns and is granted **4.9**. Chad at 6 needs 23.4 and
gets 2.5. The Regional Director — 1150 HP, the top of the ladder — needs 13.0 and gets
3.2. The single closest fight in the game is the **tutorial boss** (Karen at 3: needs 7.5,
gets 4.1), and it is the only rung where the boss is granted more than half of what it
would need.

**`dmg/hit` is not the problem.** Grandma's landed attack does **72.8** to a 172 HP
player — 42 % of the bar in one swing. She simply almost never gets to throw it. That is
the H-run's central finding (*the currency is enemy turns, not damage*) arriving as a
difficulty diagnosis rather than as a design constraint, and it is why this proposal
raises no enemy stat anywhere.

### 1.1 The same thing, on camera

`node tools/_l-fight-ab.mjs --tag=before --fight=grandma --level=7`, headed,
`?qtier=high`, quality tier and the two degrade-ladder groups sampled every turn.
Andrew is level-pinned to 7 — his designed rung — and **not** HP-pinned, because
whether he survives is the measurement.

Over twelve turns at level 7, Grandma's telegraph row read *cookies, cookies, cookies,
changed the will, changed the will, changed the will, cookies, The Look* — nine
announcements, one of them a damaging move, none of which landed. Andrew finished on
**172 / 172, having taken no damage at all**, with Grandma down from 750 HP to 56.
Full ledger and video: `screenshots/l-run/grandma-before/`. The A/B, and the honest
limits of an n = 3 capture, are in §7.1.

---

## 2. THE PREMISE IN THE BRIEF THAT IS FALSE

> *"the H-run law says every ENEMY buff is casual-safe — CASUAL loses HP faster but PIP
> floor compensates: VERIFY that claim per change"*

Verified, and it is the opposite of the law. H-run §4.1 says: *"The CASUAL policy never
uses a tagged ability… Every HP/ATK knob therefore lands entirely on the PIP floor."*
This run reproduces it at higher resolution. `node tools/_l-balance.mjs --pip --runs 1500
--cand A15` (`PIP-A15.txt`) — the same 21 cells the J-run defended, THE PROPOSAL plus
boss ability power **× 1.15**, the cheapest lever the brief asked for first:

| | mean \|Δ\| | signed mean | worst cell | direction |
|---|---|---|---|---|
| **null arm** (baseline measured twice, same run) | 1.24 pp | +0.17 pp | −3.7 pp | 6 down / 14 up |
| **THE PROPOSAL** (`PIP-final.txt`, its own null 1.12 pp) | 1.24 pp | −0.40 pp | −6.2 pp | 11 down / 9 up |
| **THE PROPOSAL + boss power × 1.15** | **12.13 pp** | **−12.13 pp** | **−23.2 pp** | **21 down / 0 up** |

Twenty-one cells, twenty-one of them down. `grandma@7 / PIP 20 %` goes **38.3 % → 18.1 %**
and `karen@4 / PIP 0 %` goes **48.0 % → 24.8 %**. That is not a difficulty knob landing on the
ceiling; it is a tax collected in full from the player the Performance Improvement Plan
exists for. **Every enemy-stat lever in the brief's "cheapest first" list is rejected on
this table**, and the triage behind it (`_triage-ladder.txt`) shows why it would not even
have worked: a flat multiplier moves TTK by a constant factor while the TTK gaps across
the ladder differ by **6×**, so `power × 1.35` took the tutorial boss to a **53.2 %**
coin flip while leaving Grandma at **99.6 %**.

### 2.1 What IS casual-safe, and why

`--diag` also runs the CASUAL policy and asks a question the design has always assumed
the answer to:

| encounter | lvl | casual win | eTurns | **denial** | breaks | braces |
|---|---|---|---|---|---|---|
| karen | 3 | 17.3 % | 12.28 | **0.0 %** | 0.00 | 0.00 |
| karen | 4 | 44.0 % | 13.93 | **0.0 %** | 0.00 | 0.00 |
| grandma | 7 | 4.7 % | 24.38 | **0.0 %** | 0.00 | 0.00 |
| grandma | 8 | 21.7 % | 29.53 | **0.0 %** | 0.00 | 0.00 |
| meredith_boss | 9 | 24.0 % | 31.50 | **0.0 %** | 0.00 | 0.00 |
| regional_director | 10 | 61.7 % | 11.61 | **0.0 %** | 0.00 | 0.00 |
| algorithm | 10 | 88.7 % | 14.68 | **6.1 %** | 0.00 | 0.00 |

CASUAL lands no tagged hit, so it clears no Objection and fills no Composure bar, and it
never Braces. **It denies zero enemy turns on every solo rung.** Anything priced against
a denied turn is therefore unreachable for the floor *by construction* rather than by
tuning — and that is the whole architecture of the proposal.

**The one exception is published rather than buried.** `algorithm@10` reads 6.1 %,
because that fight stages Janet and Isaiah and *the allies* clear locks on the casual
player's behalf. It is the only cell in the PIP table where the proposal moves the floor
outside the null (§4), and it is named for that reason.

---

## 3. THE PROPOSAL

Four components. Three files: the diff adds **15** lines and rewrites **3**.

| # | component | where | what |
|---|---|---|---|
| **E3** | **THE ESCALATION RESPONSE** | `src/combat/EnemyAI.js` — `escalateAfterDenial: 0.85` on 15 rows | A pick the enemy makes **while it is owed a turn** (its last move fizzled, or it was Broken, stunned or blocked, or it is holding the Denial Tax seal) is a damaging move 85 % of the time instead of a uniform draw from a phase list that is mostly cookies. |
| **B3** | **the seal at one denial** | `COMBAT_DEPTH.DENIAL_LIMIT` 2 → 1 | The Denial Tax already exists and is already announced ("Escalated to Committee"). It now fires after one denied turn instead of two. |
| **F1** | **Press Advantage 40 → 52** | `COMBAT_DEPTH.PRESS_ADVANTAGE_BASE` | Andrew takes about two actions a round (main + the free Press Advantage + the Objection-Sustained return) against a boss landing well under one. This is the only player-side knob in the set, and `casualTurn` has no branch that calls it. |
| **C1** | **starting Coffee 75 → 60** | `balance.json` `player.maxMP` | B24 / C4, already proposed and already priced (`.claude/plans/playtest-notes/b24-coffee-proposal.md`: −2.75 pp competent, **+0.15 pp casual**). Folded in here so the producer signs one number, not two. |

### 3.1 The Escalation Response, and why the ordering is the mechanic

`escalateAfterDenial` is checked **before** the AI pattern, not inside it. The first
version sat where each pattern would otherwise have drawn at random — i.e. *after*
`tactical`'s heal branch and *after* its `debuffChance` branch, both of which return
early. Measured on Grandma, only **50.0 %** of the picks she made while owed a turn ever
reached it, so an 0.85 dial delivered about 0.42 and the ladder barely moved. Hoisting it
above the switch is what makes it work, and it is also the only reading that makes sense:
*a boss whose move you just objected away does not answer by baking cookies.*

The effect, isolated (`picks-while-owed` that are damaging, Grandma at 7, 400 fights):

| arm | picks while owed | **damaging** | picks NOT owed | damaging |
|---|---|---|---|---|
| BASELINE | 576 | **19.8 %** | 2327 | 26.0 % |
| E3 | 612 | **87.7 %** | 2421 | 26.9 % |
| E3 + B3 | 488 | **89.3 %** | 2630 | 25.8 % |

The right-hand column is the safety property, measured: **the turns the player did not
take away are unchanged.**

### 3.2 What was measured and CUT, with the reason

| # | candidate | measured | ruling |
|---|---|---|---|
| A1/A2 | boss ability power × 1.20 / × 1.35 | ×1.35 → karen@4 **53.2 % win** while grandma@8 stays 99.6 % | **CUT.** A flat multiplier on a ladder whose TTK gaps differ 6× breaks the tutorial before it touches the problem. And it is paid by the floor (§2). |
| A3 | boss ATK + 25 % | grandma@8 dmg/T **3.98 → 3.61** (i.e. nothing) | **CUT.** Her damage was never the constraint. |
| B1 | `LOCK_PARTIAL_REDUCTION` 0.30 → 0.18 | dmg/T ± 0.5 everywhere | **CUT.** Free, and worth nothing. |
| **B2** | two tags on the 26–33 power haymakers | grandma HP-left −5 pp, **top-tag 49.7 % → 60.8 %** *(measured on the pre-fix package, `_p8-lanes.txt` vs `_final-lanes.txt`; not re-run after the ordering fix)* | **CUT, and this is the interesting one.** It worked. A haymaker demanding two tags is unclearable by a solo Andrew, so the policy stops spending tagged hits on Objections and just presses the printed weakness — buying turn count with **monotony**, which is the exact number the J-run's Pivot was built to lower. Not for sale at that price. **Stated as the reason for a CUT, not as a shipped number** — it was measured before §3.1's ordering fix and would need re-running if anyone wants to revive it. |
| D1 | boss `maxHP` × 1.25 | karen HP-left 72.8 → **76.0 %**, Director 76.1 → **79.3 %**, dmg/T **down** | **CUT, and it confirms H-run §4.** A bigger health bar on a boss that is being denied its turns does not make it dangerous; it makes the fight longer while the boss still does not hit you. |
| E1/E2 | **ungated** `preferAttack` (0.55 / 0.35) | PIP mean 9.12 pp, **−31.6 pp at grandma@8 / PIP 20 %** | **CUT — and it is why E3 is gated.** This is the same dial without the denial gate. It is published here because the difference between E1 and E3 is the entire safety argument, and it was found by the gate rather than by reasoning. |

---

## 4. THE PROPOSAL TABLE

`node tools/_l-balance.mjs --ladder --runs 600 --cand E3,P8`. COMPETENT policy on the
SHIPPED kit — a player who never opens the Abilities tab, which is the population the
producer's complaint is about. `before -> after`.

| encounter | lvl | **win** | rounds | HP-left | **low-water** | **near-death** | denial | **dmg/T** |
|---|---|---|---|---|---|---|---|---|
| karen | 3 | 99.5 → **94.2 %** | 3.96 → 5.22 | 72.6 → 70.6 % | 63.2 → **55.7 %** | 0.8 → **10.3 %** | 31.8 → 21.9 % | 15.18 → **21.49** |
| karen | 4 | 99.5 → 98.0 % | 3.87 → 4.25 | 76.6 → 75.3 % | 66.7 → 64.2 % | 0.8 → 3.7 % | 32.9 → 28.1 % | 14.30 → 18.36 |
| chad | 5 | 99.8 → 98.3 % | 4.30 → 6.03 | 65.3 → 58.8 % | 60.3 → **43.0 %** | 5.3 → **17.7 %** | 41.4 → 25.7 % | 16.58 → 22.52 |
| **chad** | **6** | 100 → 99.7 % | 3.55 → 4.05 | **89.2 → 75.0 %** | **89.2 → 73.5 %** | 0.0 → 2.2 % | **62.1 → 44.2 %** | **6.74 → 15.86** |
| **grandma** | **7** | 100 → **96.3 %** | 6.26 → 8.04 | **87.0 → 72.2 %** | **80.2 → 57.7 %** | 2.2 → **11.3 %** | 22.9 → 17.3 % | **6.25 → 12.96** |
| **grandma** | **8** | 100 → 98.5 % | 5.95 → 7.15 | **89.7 → 77.5 %** | **89.4 → 70.4 %** | 0.0 → 4.5 % | 24.2 → 19.3 % | **4.01 → 10.63** |
| restructuring_trio | 7 | 99.7 → 99.8 % | 6.19 → 6.87 | 58.8 → 58.8 % | 45.6 → 40.2 % | 9.5 → 16.5 % | 8.5 → 4.6 % | 10.89 → 12.64 |
| restructuring_trio | 8 | 100 → 100 % | 6.08 → 7.00 | 59.0 → 58.0 % | 49.7 → 42.6 % | 3.8 → 11.2 % | 7.7 → 3.4 % | 10.51 → 12.17 |
| **meredith_boss** | **8** | 98.7 → **90.0 %** | **8.10 → 13.14** | 73.9 → 60.3 % | **68.8 → 40.5 %** | 4.5 → **32.5 %** | 38.1 → 19.3 % | **9.43 → 20.33** |
| meredith_boss | 9 | 99.7 → 96.3 % | 7.31 → 9.90 | 81.3 → 62.2 % | **79.3 → 49.3 %** | 2.8 → **20.8 %** | 41.8 → 24.5 % | 7.10 → 17.12 |
| **regional_director** | **10** | 100 → 99.5 % | 4.22 → 5.57 | 75.7 → 66.2 % | **75.2 → 55.5 %** | 0.2 → 7.5 % | 32.3 → 23.7 % | 16.06 → **23.59** |
| algorithm | 10 | 100 → 98.8 % | 6.11 → 7.02 | 81.4 → 69.1 % | 80.2 → 63.1 % | 0.8 → 9.5 % | 25.2 → 21.3 % | 8.22 → 13.74 |

**The ladder as a band:**

| | before | after |
|---|---|---|
| win rate | 98.7 – 100 % | **90.0 – 100 %** |
| HP-left at victory | 58.8 – 89.7 % | **58.0 – 77.5 %** |
| **low-water** | 45.6 – 89.4 % | **40.2 – 73.5 %** |
| **near-death** (touched 25 % HP) | 0.0 – 9.5 % | **2.2 – 32.5 %** |
| denial (share of turns taken from the boss) | 7.7 – 62.1 % | **3.4 – 44.2 %** |
| **damage per enemy turn** | 4.01 – 16.58 | **10.63 – 23.59** (× 1.28 – × 2.65) |

Read the **low-water** and **near-death** columns, not the win rate. Win rate saturates
at 100 % long before a fight stops being frightening, and the two rungs that were most
obviously not fights — `chad@6` and `grandma@8`, where Andrew finished having never
dropped below **89 %** of his health bar — now bottom out at 73.5 % and 70.4 %.
`meredith_boss@8` goes from a fight Andrew wins at 68.8 % low-water to one where he
touches 25 % HP **a third of the time**.

**The denial column falls even though nothing about Objections or Composure was
changed.** That is `DENIAL_LIMIT: 1` working as designed: the seal arrives sooner, and a
sealed move cannot be fizzled and does not move the Composure bar. `breaks/fight` drops
with it (Karen 0.36 → 0.07, the Director 0.55 → 0.01), and that is the one mechanical
regression inside combat itself: **on the two shortest boss fights the Break is now
close to unreachable.** It is a consequence of B3 and it is the price of the component
that reaches `chad@6`.

### 4.1 What each component is doing

`E3` alone (same table, middle block of `LADDER-final.txt`) moves the two rungs the
diagnosis named and almost nothing else: `grandma@7` HP-left 87.0 → 78.3 %, `grandma@8`
89.7 → 80.7 %, `meredith@9` 81.3 → 72.5 %, `algorithm` 81.4 → 79.3 %, and `karen` /
`chad` / the trio / the Director within noise. That is the correct shape for a lever
aimed at *quiet turns*: it does nothing to a boss that was already swinging (Chad reads
5.7 % quiet and does not move) and a great deal to one that was not.

`B3` + `F1` + `C1` are what reach `chad@6` and the `regional_director` — the two rungs
whose problem was never quiet turns but the sheer **number** of actions Andrew takes per
round. Press Advantage use falls from 1.92 to 1.14 a fight on the Director and from 2.29
to 1.75 on Meredith.

---

## 5. THE 21-CELL PIP FLOOR — the hard constraint

`node tools/_l-balance.mjs --pip --runs 1500 --cand P8`. CASUAL policy: basic attacks,
the free starter heal, Assert Dominance when the bar fills on its own. Never a tagged
hit, never a Brace.

**The table runs its own NULL ARM** — the shipped baseline measured a second time, as if
it were a candidate. That column is the instrument's resolution, and it exists because
the first pass of this work judged candidates against a flat "≤ 2 pp" rule while two
500-run measurements of the *same* config disagreed by up to **4.0 pp**. A gate finer
than its own null is not a gate.

| encounter | lvl | PIP 0 % | PIP 20 % | PIP 30 % |
|---|---|---|---|---|
| karen | 3 | 16.5 → 15.8 (−0.7) | 62.2 → 62.7 (+0.5) | 74.3 → 75.7 (+1.5) |
| karen | 4 | 47.1 → 45.7 (−1.3) | 76.7 → 76.5 (−0.2) | 86.4 → 86.0 (−0.4) |
| grandma | 7 | 6.0 → 4.3 (−1.7) | 37.7 → 38.9 (+1.2) | 57.0 → 57.0 (0.0) |
| grandma | 8 | 22.7 → 24.7 (+2.0) | 61.7 → 61.8 (+0.1) | 71.2 → 72.7 (+1.5) |
| meredith_boss | 9 | 27.1 → 25.4 (−1.7) | 70.5 → 71.3 (+0.8) | 89.3 → 90.2 (+0.9) |
| regional_director | 10 | 60.7 → 60.3 (−0.3) | 92.5 → 91.3 (−1.2) | 98.0 → 98.3 (+0.3) |
| **algorithm** | **10** | **87.2 → 81.0 (−6.2)** | **94.6 → 92.6 (−2.0)** | **97.9 → 96.3 (−1.5)** |

| | mean \|Δ\| | signed mean | worst cell | direction | verdict |
|---|---|---|---|---|---|
| **NULL ARM** | 1.12 pp | −0.32 pp | −2.8 pp | 11 down / 9 up | resolution |
| **THE PROPOSAL** | **1.24 pp** | **−0.40 pp** | −6.2 pp | **11 down / 9 up** | **PASS — inside the null** |
| *(rejected)* + boss power × 1.15 | 12.13 pp | −12.13 pp | −23.2 pp | 21 down / 0 up | FAIL |

**Twenty of the twenty-one cells move less than the largest single-cell move the NULL ARM
itself produced (−2.8 pp)**, and the direction is a coin flip (11 down / 9 up). Excluding
the three Algorithm cells entirely, the remaining eighteen read mean \|Δ\| **0.91 pp**,
signed mean **+0.07 pp**, 8 down / 9 up — flat, and *below* the null's own 1.12 pp.

**The one cell that is not noise is `algorithm@10 / PIP 0 %` at −6.2 pp, and the
mechanism is named rather than hand-waved.** That fight stages Janet and Isaiah, and
*the allies* land tagged hits
on a casual player's behalf: it is the only encounter in the game where CASUAL denies any
enemy turn at all (**6.1 %**; every solo rung reads 0.0 %). The denial pricing therefore
reaches the floor there and only there. The affected cell reads **81.0 % at zero deaths**,
which is the highest-margin cell in the table and still inside the documented 40–85 %
band. The `regional_director` — the game's other party fight, with the same two allies —
shows **no** such effect (−0.3 / −1.2 / +0.3, all inside the null). **Why the two party
fights differ is not measured and is not claimed here.** The plausible reading is that the
Algorithm's kit carries more lockable moves for the allies to clear, but that is a
hypothesis, not a result, and it is the first thing to check if this cell is ever
tightened.

**Sized mitigation, untested, offered rather than assumed:** dropping the
`escalateAfterDenial` row from `algorithm` alone is one line and would remove one of the
two contributors to that cell. It was not measured, so it is not claimed.

---

## 6. THE OTHER BANDS

### 6.1 The Practice-Group diversity band — THIS IS THE COST

`node tools/_l-balance.mjs --lanes --runs 400`. The J-run's law is **≤ ~10 pp** of win
rate between the three lanes at every rung.

| encounter | lvl | before: lit / comp / audit | band | after: lit / comp / audit | **band** |
|---|---|---|---|---|---|
| karen | 3 | 98.5 / 97.0 / 98.8 | 1.8 | 98.8 / **86.8** / 95.0 | **12.0** |
| karen | 4 | 99.8 / 98.5 / 97.0 | 2.8 | 98.3 / 92.3 / 89.5 | 8.8 |
| chad | 5 | 99.8 / 97.0 / 96.8 | 3.0 | 99.8 / 90.3 / 89.0 | **10.8** |
| chad | 6 | 100 / 100 / 100 | 0.0 | 100 / 98.8 / 99.8 | 1.2 |
| grandma | 7 | 99.8 / 99.5 / 98.3 | 1.5 | 98.0 / 97.8 / 96.5 | 1.5 |
| grandma | 8 | 100 / 100 / 99.5 | 0.5 | 99.8 / 99.8 / 99.3 | 0.5 |
| restructuring_trio | 7 | 97.5 / 97.3 / 91.0 | 6.5 | 95.3 / 95.3 / 90.0 | 5.2 |
| restructuring_trio | 8 | 98.5 / 99.0 / 96.0 | 3.0 | 99.0 / 96.8 / 95.5 | 3.5 |
| **meredith_boss** | **8** | 100 / 100 / 99.5 | 0.5 | 98.3 / 96.5 / **81.8** | **16.5** |
| meredith_boss | 9 | 100 / 100 / 100 | 0.0 | 99.0 / 98.3 / 93.8 | 5.2 |
| regional_director | 10 | 100 / 97.5 / 95.0 | 5.0 | 99.5 / 95.8 / 92.3 | 7.3 |
| algorithm | 10 | 99.8 / 100 / 99.8 | 0.2 | 99.8 / 99.5 / 96.8 | 3.0 |
| | | | **6.5 max** | | **16.5 max** |

**This breaches J's law on three rungs and it is the largest declared cost of the
proposal.** The mechanism is not mysterious: the two lanes that lose are the two SLOW
lanes. Audit's whole identity is accumulating Findings and closing a file, and Compliance's
is counterpunching off a Brace; both are worst in exactly the conditions this proposal
creates — longer fights against a boss that spends more of its turns hitting you.
The J dossier already recorded Audit as the weakest lane and Compliance as the one that
"is terrible in a hurry" (§6.3, §7 D5). This widens an existing weakness rather than
inventing one, but 6.5 → 16.5 pp is not a rounding error.

**Three options, priced:**
1. **Ship it and name the follow-up.** The free unlimited respec already exists and is
   already called Request Restructuring. The follow-up is an Audit-ramp pass — Findings
   accruing faster, or `material_weakness` closing at three — not a softening of this
   proposal.
2. **Soften F1.** Tested: Press Advantage at 48 instead of 52 (`--cand P9`) does **not**
   recover the band (max 14.0 pp, i.e. inside noise of 16.5) and it gives up the Regional
   Director, whose low-water goes back from 55.5 % to 68.2 %. Not worth it.
3. **Hold the whole proposal** until Audit is repaired.

**Recommendation: (1).** The band is a win-rate band and every cell in it is still above
81 %; the fights it describes are ones the lane wins four times in five.

### 6.2 Monotony — the number the J-run's Pivot exists to protect

Top-tag share of Andrew's tagged hits, shipped kit, before → after: karen 64.0 → 65.5,
chad@5 58.8 → 68.9, chad@6 58.1 → 65.1, **grandma 47.5 → 49.6 / 50.6 → 51.7**, trio
72.8 → 83.2, meredith 48.7 → 50.5 / 41.1 → 43.5, **regional_director 67.4 → 54.0**,
algorithm 80.9 → 82.5.

Grandma and Meredith — the two rungs the Pivot was built for — are **flat**, and the
Regional Director improves by 13.4 pp. Chad and the trio worsen by ~10 pp, because with
fewer free actions the policy spends a larger share of a smaller budget on its single
best button. **This is the number that got the B2 component cut** (§3.2): with two-tag
haymakers in, Grandma's top-tag went to 60.8 %, and buying threat with monotony is the
one trade this codebase has already ruled against.

### 6.3 Reception / the roguelite grind

`--day --runs 400`. Competent −2.7 to −5.5 pp; **casual flat** (62.5 → 61.0, 18.5 → 18.3,
76.3 → 78.5, 40.5 → 41.8). `reception_client` carries no `ENEMY_AI_PATTERNS` row, so E3
never fires there **by construction** — the grind that funds the level-ups is touched only
by the Coffee and Press Advantage numbers, and only at the ceiling.

### 6.4 New Game+

`node tools/ng-sim.mjs --runs 400`, the purpose-built instrument, CARRIED kit
(every ability plus maxed permanent upgrades — what NG+ actually hands back).

| encounter | lvl | FRESH@NG | CARRY@NG+1 | CARRY@NG+2 | CARRY@NG+3 |
|---|---|---|---|---|---|
| karen | 4 | 96.3 → 85.0 | 100 → 91.8 | 100 → 82.8 | 98.5 → **68.3** |
| chad | 6 | 100 → 98.3 | 100 → 99.8 | 100 → 100 | 100 → 100 |
| grandma | 8 | 99.8 → 94.8 | 99.8 → 96.0 | 99.8 → 95.0 | 99.0 → 94.0 |
| meredith_boss | 9 | 99.5 → 89.0 | 99.8 → 93.0 | 97.8 → 77.5 | 95.8 → **69.0** |
| algorithm | 10 | 98.3 → 97.3 | 94.8 → 86.5 | 79.0 → 64.5 | 68.5 → **48.0** |

NG+ gets harder. The worst cell is `algorithm@NG+3` at **48.0 %** — and NG+3 is
documented in `CombatEngine.js` as *"below the 40–85 % story band on purpose, because the
top rung of a voluntary ladder is a flex, not a checkpoint — but a flex you can pass."*
48 % passes that description. **The ladder-correctness rule (`CARRY@NG+1 ≤ FRESH@NG`) is
violated at baseline on karen, grandma and meredith and is still violated after; the
proposal neither creates nor fixes it.** If the producer wants NG+ held where it was, the
knobs already exist and are already swept-for: `NG_PLUS_ENTRY.atk` and `NG_PLUS_LAP.decay`
via `node tools/ng-sim.mjs --sweep` / `--lapdecay`. Not folded in here, because it is a
second signature.

### 6.5 A correction to my own instrument, published

`tools/_l-balance.mjs --ng` runs the LEVEL-CURVE kit on an NG+ lap — a player the game
never produces, since NG+ returns every ability and the AUM to rebuy every upgrade. On an
early version of this package it read `meredith@NG+2` at **1.5 %** (`_final-ng.txt`),
which would have been a wall; `ng-sim`, the purpose-built instrument, reads **77.5 %** on
the shipped-code version of the same package. The two runs are not the same arm — the
point is the **order-of-magnitude** disagreement between the two harnesses, not the pair
of numbers. The mode is kept, relabelled, and now prints that warning at the top of its
own output. **Every NG+ claim in this document is from `ng-sim`.**

---

## 7. THE 70–85 % WIN BAND, ANSWERED HONESTLY

The brief asks for competent at-level win rates of 70–85 % on story bosses. The proposal
delivers **90.0 – 100 %**. That gap is deliberate and here is the argument.

**1. It was measured, the bill is on the wrong account, AND IT STILL DOES NOT GET THERE.**
`A15` — this proposal plus boss ability power × 1.15 — costs the PIP floor **12.13 pp
across 21 cells, 21 down and 0 up, worst cell −23.2 pp** (`PIP-A15.txt`), which is the one
constraint the brief made non-negotiable. And for that price it reaches **83.0 – 99.8 %**
(`LADDER-A15.txt`): **exactly one rung of twelve** (`meredith_boss@8`, 83.0 %) lands in
the requested band, while eight of the other eleven are still above 94 %. You cannot buy
the 70–85 % band with the floor's money, because the floor's money does not buy it.

**2. A uniform knob cannot produce a uniform band on this ladder.** The TTK gaps in §1
span **7.5 to 45.1** — a factor of six. Any multiplier moves all of them by the same
factor, so the rung that reaches 70 % first is always the tutorial boss: `power × 1.35`
put Karen at 4 on a **53.2 %** coin flip while Grandma sat at 99.6 %. The band the brief
wants is not reachable by scaling; it would need per-encounter surgery on six bosses,
which is a different and much larger commission.

**3. The COMPETENT policy is a ceiling, not a median.** The J dossier says it plainly:
*"Every policy plays its lane correctly every turn… These numbers are a ceiling per lane,
not a mean."* It reads the telegraph every turn at zero cost, never mis-times a Brace,
and never forgets. Driving *that* player to 75 % puts an actual median player far below
the PIP band the last three balance runs were tuned to defend. The three A/B captures in
§7.1 are the evidence: the same scripted line, run three times on the SAME build, finished
at low-water **100 % / 17.4 % / 9.3 %**.

**4. The metric the producer actually asked for is in the table.** "Way too easy" is not
a win-rate observation — at 98.7–100 % it was already unwinnable-to-lose. It is a
*low-water* observation: Andrew finished `chad@6` and `grandma@8` having never dropped
below 89 % of his health bar. **That number moves 89.4 % → 70.4 %, and near-death goes
0.0 % → 32.5 % on Meredith.** That is the fight showing up.

**Proposed band, for signature:** competent at-level **low-water 40–75 %** and
**near-death 5–35 %**, with win rate reported as a consequence and expected to sit
**90–100 %** on this instrument. If the producer wants the win-rate band anyway, §7 point
1 is the price and it is payable only by the casual floor.

### 7.1 The A/B capture

Same scripted line, same level pin (7), `?qtier=high`, quality tier and both
degrade-ladder groups sampled every turn and held (`qualityTierHeld: true` on all six
runs), build identity asserted from the live Press Advantage cost (37 = baseline,
49 = proposal). Three runs per arm. Videos and per-turn ledgers in
`screenshots/l-run/grandma-{before,before2,before3,after,after2,after3}/`.

**What is stable and IS the evidence — the telegraph census.** Every distinct move
Grandma published across the three runs of each arm:

| arm | telegraphs published | **damaging** | what she announced |
|---|---|---|---|
| **before** | 19 | **4 (21.1 %)** | `changed_the_will` ×7, `fresh_cookies` ×5, `emergency_shortbread` ×3, `guilt_trip` ×3, `passive_aggression` ×1 |
| **after** | 20 | **10 (50.0 %)** | `guilt_trip` ×5, `passive_aggression` ×5, `fresh_cookies` ×4, `changed_the_will` ×3, `emergency_shortbread` ×2, `final_revision` ×1 |

In the cleanest baseline run the whole fight is legible in one column: over twelve turns
Grandma's telegraph row read *cookies, cookies, cookies, changed the will, changed the
will, changed the will, cookies, The Look* — and Andrew ended on **172/172, having taken
no damage at all** while she went from 750 HP to 56. In the after runs her opening
telegraph is `Guilt Trip` and it lands for **85 on a 172 HP bar** on turn one.

**What is NOT evidence, said plainly:** the per-run outcome. Low-water across three runs
reads **100 / 17.4 / 9.3 %** before and **45.3 / 35.5 / 9.3 %** after. The scripted line
is weaker than the COMPETENT policy (no Press Advantage, no Loop In, no items, and a
Brace QTE it sometimes misses), and at n = 3 the variance swamps the effect. **The tables
are the difficulty claim; the capture is the feel claim.**

**One artefact was thrown away rather than shipped.** Two runs were tagged `before`
against an `after` bundle, because the source tree had been reverted but `dist/` had not
been rebuilt. They were deleted and `_l-fight-ab.mjs` now asserts build identity off the
live Press Advantage cost before it records a frame.

---

## 8. THE COFFEE NUMBER, AND THE ONE THING ONLY YOU CAN DECIDE

**The coffee number is 60.** `PLAYER_BASE_STATS.maxMP` 75 → 60, via `balance.json`. It is
B24's own recommendation, unchanged: it removes exactly one cast of headroom at every
level, costs competent play ~2.75 pp of win rate, and is the only candidate B24 tested
that costs the casual floor nothing (+0.15 pp there, and inside the null here). 50 and 40
both tax the floor by ~2 pp, and 40 additionally turns Karen into a difficulty re-tune
smuggled in under a resource change. Folded into this proposal so there is one signature
rather than two.

**Everything else in this document is measured. One thing is not, and cannot be:**

> **Longer?**

Fights get longer. Meredith at 8 goes from **8.1 rounds to 13.1**. Grandma at 7 goes 6.3
→ 8.0, Chad at 5 goes 4.3 → 6.0, the Regional Director 4.2 → 5.6. That is not a side
effect — it is half the mechanism, because a boss that is granted more turns *is* a
longer fight, and the alternative (making each turn hit harder) is the one the PIP floor
refuses to pay for.

A 13-round Meredith is a Persona-length boss. It might be exactly the weight the finale
of Act 5 should have, or it might be a slog in a satirical office RPG whose other fights
run four rounds. No table settles that. **If the answer is yes, the diff merges as
written. If the answer is no, the component to cut is F1 (Press Advantage 40 → 52): it is
the largest contributor to fight length, and cutting it keeps every one of Grandma's and
Meredith's gains while giving back the Regional Director** (low-water 55.5 % → 71.0 %,
the `--cand P5` block of `_pkg-ladder.txt`).

---

## 9. REPRODUCTION

```bash
node tools/_l-balance.mjs --diag   --runs 300    # the diagnosis + the casual-denial check
node tools/_l-balance.mjs --ladder --runs 600 --cand E3,P8
node tools/_l-balance.mjs --pip    --runs 1500 --cand P8   # always runs its own null arm
node tools/_l-balance.mjs --lanes  --runs 400 --cand P8
node tools/_l-balance.mjs --day    --runs 400 --cand P8
node tools/_l-apply.mjs --on && node tools/ng-sim.mjs --runs 400 && node tools/_l-apply.mjs --off

# the A/B capture (npm run dev on the given port first)
node tools/_l-apply.mjs --off && node tools/_l-fight-ab.mjs --tag=before --fight=grandma --port=5188
node tools/_l-apply.mjs --on  && node tools/_l-fight-ab.mjs --tag=after  --fight=grandma --port=5188
node tools/_l-apply.mjs --off
```

Raw output: `.claude/plans/l-run/*.txt`. The diff: `.claude/plans/l-run/PROPOSAL.diff`.
