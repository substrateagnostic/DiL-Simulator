# THE REBALANCE WAVE — PRODUCER PACKET

*Everything in this document is DARK. `DIFFICULTY_LIVE = false` in
`src/data/difficulty.js`; the machinery is committed, wired and measured, and the
game a player downloads today is byte-for-byte the one you last signed. Flipping
that one constant is the whole release. It is your call, and this document is the
thing you would need in order to make it.*

Wave: 2026-08-17. Branch `display-case`, not merged.
Prior art this rests on: `27e9c0f` / `4de4693` / `8b19724` / `66c3a88` (the balance
lane) and `.claude/plans/j-run/COMBAT-PLAYSTYLE-DOSSIER.md`.

---

## 0. THE THING THAT NEEDS ONE WORD FROM YOU

Six questions. Everything else in here is background for them.

| # | question | the shortest honest answer I have |
|---|---|---|
| **Q1** | **Which name set?** A (Intern / Associate / Partner Track), B (Advisory / Fiduciary / Discretionary), C (Development Plan / Meets Expectations / Exceeds Expectations). | I have B in the file because it is the register the game speaks in. §2. |
| **Q2** | **Do the three modes ship at all?** | If yes, flip `DIFFICULTY_LIVE`. If no, everything stays inert and costs nothing. |
| **Q3** | **Is Casual allowed to be a different fight from Standard?** | It has to be. The 21-cell table measured the alternative and killed it — Grandma at PIP 20 % fell **38.3 % → 19.8 %**. §4. |
| **Q4** | **Standard cannot reach three cells — chad@6, the Regional Director and the Algorithm. Accept, or spend another wave?** | Accept, I think. All three are the same thing and it is not a boss problem. §6.3. |
| **Q5** | **Hard breaks the lane-diversity law badly. Ship it anyway, or hold Hard?** | This is the one I am least sure of. Audit collapses to 44.3 % on one rung against Litigation's 86.3 %. §7.3. |
| **Q6** | **Upward mid-run switching: allowed with a stamp on the file, or locked?** | Allowed with the stamp. Reasoning in §3.3; I will change it in ten minutes if you disagree. |

---

## 1. WHY THREE KNOBS AND NOT ONE

The balance lane measured the thing that makes this necessary and I am restating it
because it is the whole argument:

> **A real Standard difficulty band is not purchasable on a one-knob game.**
> Boss ability power at 1.15× moved the 21-cell casual floor by **12.16 pp, 21
> cells down and 0 up**. Every enemy-stat lever failed on that table. The only
> components that survived were the ones a casual player is structurally
> incapable of reaching — the Escalation Response fires on a turn the player took
> away, and the casual policy takes away **0.0 %** of enemy turns on every solo
> rung. That is a very small set of levers, and it ran out before it reached
> chad@6 and the Regional Director.

So Tier 1 shipped alone and Tier 2 was declined, correctly, because its bill was a
13-round Meredith and dead Breaks.

Three modes dissolve that. A lever only has to be paid for by the players who
chose the band it belongs to. Casual gets a floor obligation and nothing else;
Hard gets to take the bill Standard refused; Standard gets the surgery.

There is a second finding from this wave that sharpens it, and it is new:

> **A change to what a boss DOES is worth three to six times more against the
> floor than against the ceiling**, because a casual fight is 25–31 enemy turn
> attempts and a competent one is 5–7. The same edit compounds over six times as
> many turns. That is the one-knob problem stated from the other end, and it is
> why Casual and Standard cannot share a boss kit.

---

## 2. THE THREE MODES

A mode is a named bundle of multipliers in `src/data/difficulty.js`. There is no
code fork anywhere: the engine asks four questions and every one of them defaults
to the shipped value.

### 2.1 The name candidates — Q1

| | **A — the onboarding ladder** | **B — the engagement letter** *(in the file now)* | **C — the performance review** |
|---|---|---|---|
| Casual | **Intern**<br>*Supervised. Mistakes are development opportunities.* | **Advisory**<br>*Non-binding. We will walk you through it.* | **Development Plan**<br>*A structured framework. Nobody is being written up.* |
| Standard | **Associate**<br>*The job as written.* | **Fiduciary**<br>*The standard of care. Act in their interest.* | **Meets Expectations**<br>*The documented standard for this role.* |
| Hard | **Partner Track**<br>*No supervision. No cover. No supply budget.* | **Discretionary**<br>*Full authority. Full liability. No second signature.* | **Exceeds Expectations**<br>*You asked for this in writing.* |

Switching is `ACTIVE_NAME_SET = 'A' | 'B' | 'C'`, one character.

**Two honest notes.** A reads instantly but is the least specific to this game —
it would fit any office comedy. C's "Development Plan" deliberately rhymes with
the shipped **Performance Improvement Plan**, which is exactly the machinery
Casual absorbs, so the rhyme is *true* — and it is also a collision, because the
PIP is a separate item that still ships and a player could reasonably think the
mode and the item are the same thing. B is the only set where all three words are
real trust-department words and each one is honest about what the mode does.

### 2.2 The exact knobs

| | CASUAL | STANDARD | HARD |
|---|---|---|---|
| incoming-damage assist for Andrew | **20 % + 2 %/defeat, cap 80 %** | — | — |
| boss phase lists | **shipped** | **surgery** (§5) | **surgery** |
| dead phase revival | shipped | **on** (§5.3) | **on** |
| Grandma `healChance` / `debuffChance` | shipped (0.35 / 0.30) | **0.22 / 0.20** | 0.22 / 0.20 |
| Meredith AI heal cadence | shipped (1 in 3) | shipped | **1 in 5** |
| Escalation Response | 0.85, Algorithm exempt | 0.85, Algorithm exempt | **1.00, exemption lifted** |
| enemy ATK | ×1 | ×1 | **×1.45** |
| DENIAL_LIMIT / Press Advantage / Coffee | 2 / 40 / 75 | 2 / 40 / 75 | **2 / 40 / 75** |
| XP | ×1 | ×1 | ×1 |

**Read the last two rows twice, because they are the surprising part.** Hard
carries **none** of the declined Tier 2 package. I built it that way first — with
DENIAL_LIMIT 1, Press Advantage 52 and Coffee 60 — measured it, and threw it away.
§7.2 has the numbers. The short version: player-economy screws buy difficulty by
making fights *longer*, and Hard's Meredith came out at **20.8 rounds** with
**0.04 Breaks per fight**. Hard is now entirely enemy-side: the opposition is
relentless and hits harder, and your own toolkit is untouched.

**No XP multiplier, on purpose.** It is the obvious fourth field and it is a trap:
payout scaling changes the level Andrew arrives at each rung on, which moves every
cell in every table by an amount no single-fight sim can see. The game also
already ships one XP multiplier — the Accelerated Review Cycle's time-and-a-half —
and two of them stacking is a pacing bug with a delay fuse.

---

## 3. THE PLUMBING

### 3.1 Where it lives

`src/data/difficulty.js` is the table. `src/core/DifficultyManager.js` resolves a
bundle and answers four questions the engine asks: *what are this enemy's phase
rows*, *what is this enemy's AI row*, *what is this COMBAT_DEPTH value*, *what is
this multiplier on Andrew's working-copy stats*. Nothing else in the codebase
branches on difficulty.

### 3.2 The gate, proven rather than claimed

With `DIFFICULTY_LIVE = false`:

```
gate live: false   id: shipped   selected: standard
grandma  phasesFor returns the SAME ARRAY OBJECT: true
algorithm  same: true      regional_director  same: true
meredith_boss  same: true  chad  same: true  karen  same: true
DENIAL_LIMIT 2   Press Advantage base 40
aiFor(grandma) returns the same pattern object: true
assistResist(0) = 0    assistResist(20) = 0    playerStat(maxMP, 75) = 75
a save blob with no difficulty field adopts to: standard
```

The picker does not render, and the pause-menu row is not spliced in — the row
order and every other row's index are unchanged.

### 3.3 Mid-run switching — Q6

**Downward is always allowed and asks nothing.** A player stuck on a wall must
never have to restart to get past it; that is the entire finding behind the
shipped PIP and it does not stop being true because the assist moved into a mode.

**Upward is also allowed, and the file keeps the record instead of the door being
locked.** `difficultyFloor` stamps the easiest mode ever active during the run, so
a player who drops to Advisory for one boss and climbs back does not get to claim
the Discretionary run — and a player who is curious about Discretionary for one
fight is not punished for looking. The picker prints the stamp back at you
(`[on file]`), so it is never a surprise discovered in an epilogue.

**The option not taken:** upward only at act boundaries. It is more defensible on
paper and worse in practice — it buys honesty at the price of making the safest
choice the one where you never experiment, and the stamp buys the same honesty for
nothing. One line in `DifficultyManager.set()` if you want it the other way.

### 3.4 The save

Additive, in the strong sense. Two new fields on the blob (`difficulty`,
`difficultyFloor`) and the same two on the carry envelope. Nothing was renamed,
removed or repurposed; no save-format change; every save and every export card
already in a player's hands reads them as `standard`, which is the shipped game.

### 3.5 The UI

One implementation, two call sites — `src/ui/DifficultyPanel.js`. It appears on
New Game (before the run exists) and in the pause menu under SETTINGS beside
Controls. It uses the pause menu's own language: VT323, the `#e94560` left-rail
selection mark, the muted `#7a8aaa` the portal header already speaks in. It owns
no keyboard listener — the host state polls it, like every other screen in this
game — because a DOM listener would have made the Enter that confirms a mode also
reach the title screen's own select handler on the same frame.

---

## 4. CASUAL — AND THE THING THE 21-CELL TABLE REJECTED

Casual is the **Performance Improvement Plan promoted from a post-defeat offer to
a mode's spine**. Identical numbers, identical engine field, identical code path;
the mode simply does not make you lose first and then find it in a menu. The PIP
item still ships and still works — `CombatState` takes the MAX of the two, so a
Casual player who also files the paperwork is not resistant twice and a Standard
player who files it is bit-identical to today.

### 4.1 The gate rejected the first draft — Q3

Casual was first authored with the Part 2 surgery on, on the argument that the
surgery is a readability fix as much as a difficulty one and that shipping two
different Grandmas is two bosses rather than one boss with a knob. The 21-cell
table said no, at 800 runs a cell:

| arm | mean \|Δ\| over the 14 saturated cells | signed | worst cell | null arm |
|---|---|---|---|---|
| Casual **with** surgery | 6.58 pp | **−5.58 pp** | **−21.5 pp** (grandma@7) | 1.10 pp |
| Casual **without** surgery *(shipped)* | 1.21 pp | **+0.39 pp** | +2.6 pp | 1.51 pp |

grandma@7 at PIP 20 % went **38.3 % → 19.8 %**. grandma@8 went **62.1 % → 43.5 %**.

*How to read the columns:* they are the resistance a player has **requisitioned** —
the shipped PIP formula is `0.20 + 0.02 × deaths`, so column 0 is an unfiled
player, column 20 % is a filed player at 0 deaths and column 30 % is a filed
player at 5. A mode with an assist runs the identical formula off the identical
death count, so **columns 2 and 3 hand both arms the same number and isolate the
surgery**, while column 1 is the assist doing its whole job.

Column 1 — the assist, final build:

| | shipped | Casual | Δ |
|---|---|---|---|
| karen@3 | 16.3 % | 62.0 % | +47.0 |
| karen@4 | 46.1 % | 78.3 % | +31.9 |
| grandma@7 | 5.4 % | 38.0 % | +33.3 |
| grandma@8 | 25.6 % | 62.5 % | +43.0 |
| meredith@9 | 26.8 % | 70.1 % | +44.8 |
| regional_director@10 | 60.1 % | 90.0 % | +26.1 |
| algorithm@10 | 86.3 % | 94.5 % | +8.7 |

`.claude/plans/m-run/FLOOR-final.txt`.

### 4.2 What Casual does to a competent player

The competent-policy ladder with the assist applied (`LADDER-casual.txt`, 600
runs). Low-water rises 2.5–10.0 pp and near-death goes to nearly zero, and the
Break economy is intact on every cell — Casual makes the fight survivable, not
shallower.

| | shipped low-water | Casual | shipped near-death | Casual |
|---|---|---|---|---|
| karen@3 | 62.4 % | 67.9 % | 2.8 % | 0.3 % |
| chad@5 | 59.9 % | 68.7 % | 6.5 % | 0.5 % |
| grandma@7 | 69.7 % | 73.9 % | 4.0 % | 1.3 % |
| trio@7 | 46.9 % | 56.4 % | 9.8 % | 1.5 % |
| meredith@8 | 65.0 % | 67.2 % | 5.5 % | 3.2 % |
| algorithm@10 | 81.3 % | 83.3 % | 0.3 % | 0.2 % |

---

## 5. PART 2 — THE PHASE-LIST SURGERY

### 5.1 The diagnosis, one line

A boss's phase `abilities` array is drawn **flat**, so a phase list holding one
attack and four heals/debuffs/stuns spends 80 % of its turns dealing zero damage.
Re-baselined with the Escalation Response live: **Grandma 68.3 % and 66.2 % quiet
turns; Meredith 48.6 % and 48.9 %; the Algorithm 48.9 %.**

### 5.2 The mechanism is repetition, and it is not new engine code

`_pickEnemyAbility` draws uniformly from the phase array in every pattern that
reaches a random draw, so a repeated id is a weight. The idiom already ships —
`ENEMY_AI_PATTERNS.regional.phase2` is `['synergy_blast', 'synergy_blast',
'golden_parachute']`.

**Four rules, held by every row and checked by `node tools/_m-modes.mjs --census`:**

- Base row 0 is never touched. Every documented weakness and every dialog hint
  stays true.
- `hpThreshold` / `weakness` / `resistance` cannot move — the resolver spreads
  `{ abilities }` over the shipped row, so **the Pivot is safe by construction,
  not by promise**.
- **Nothing is deleted.** Every heal, debuff, stun and counter that shipped in a
  phase is still in that phase. A boss that never heals is a different fight, and
  Grandma not producing shortbread is a worse joke.
- Only ids the boss **already owns**. No new abilities were written.

Measured damaging share of each phase pool, shipped → surgery:

| boss | phase | before | after |
|---|---|---|---|
| chad | 0 / 1 | 66.7 % / 66.7 % | 75.0 % / 75.0 % |
| **grandma** | 0 | 33.3 % | **55.6 %** |
| **grandma** | 1 | **20.0 %** | **55.6 %** |
| meredith | 0 / 1 / 2 | 66.7 / 33.3 / 66.7 % | 80.0 / 60.0 / 80.0 % |
| regional_director | 0 / 1 / 2 | 100 % throughout | 100 % (only the DoT is re-weighted) |
| algorithm | 0 / 1 / 2 | 50.0 / 60.0 / 40.0 % | 60.0 / 71.4 / 62.5 % |

Lock coverage is unmoved on all five bosses (`_lockableSet` caps at
`ceil(dedupedIds / 3)` and no id was added). The census carries a `--selftest`
that mutates the table three ways — a deletion, a foreign id, and an id addition
that moves a lock cap — and all three turn it red. A gate that has never been seen
to fail is not a gate.

### 5.3 A shipped bug this uncovered, and it is worth its own line

`_pickEnemyAbility` selects a phase with `hpPercent <= phase.hpThreshold`, and
`hpPercent <= 0` is only ever true at death. **Two boss phases carry
`hpThreshold: 0` and have therefore never fired in a shipped build** — the
Regional Director's third row and the Algorithm's third row.

**`total_optimization`, at 40 power, is the single biggest ability in the game and
no player has ever been hit by it.**

Meredith had the identical bug; the J-run fixed hers by moving 0 → 0.12 and left
these two. 0.12 is the same window and for the same reason: a boss's last phase is
also where its *social* row sits, and a social row from level 8 is a damage
upgrade for Andrew rather than a threat, so sub-12 % is short enough that the
upgrade cannot pay for itself.

**Measured cost: about nothing** (−0.2 to +0.3 pp of low-water, inside the
sampler). It is a bug fix, not a difficulty lever, and it could reasonably ship on
its own in all three modes if you want one small thing out the door early.

### 5.4 What Standard buys — before/after, 600 runs

`.claude/plans/m-run/LADDER-final.txt`. Bold is a rung that moved.

| rung | low-water shipped → Standard | near-death shipped → Standard | dmg/enemy-turn | quiet |
|---|---|---|---|---|
| karen@3 | 62.4 → 62.2 | 2.8 → 1.8 | 16.7 → 16.8 | 31.0 → 31.7 |
| karen@4 | 66.6 → 66.4 | 0.5 → 0.5 | 14.7 → 14.3 | 31.9 → 33.0 |
| chad@5 | 59.9 → 59.9 | 6.5 → 6.0 | 17.4 → 16.8 | 5.9 → 5.5 |
| chad@6 | 88.4 → 88.7 | 0.0 → 0.0 | 7.5 → 7.2 | 4.1 → 4.1 |
| **grandma@7** | **69.7 → 65.1** | **4.0 → 7.3** | **9.98 → 12.56** | **68.3 → 63.0** |
| **grandma@8** | **79.2 → 72.8** | **0.7 → 4.3** | **8.31 → 11.36** | **66.2 → 60.6** |
| trio@7 | 46.9 → 45.3 | 9.8 → 11.5 | 11.0 → 10.9 | 47.3 → 47.2 |
| trio@8 | 50.5 → 49.0 | 4.5 → 6.3 | 10.9 → 11.0 | 47.6 → 47.7 |
| **meredith@8** | **65.0 → 58.7** | **5.5 → 13.8** | **11.66 → 14.32** | **48.6 → 41.8** |
| **meredith@9** | **67.3 → 63.0** | **5.7 → 9.7** | **11.64 → 13.76** | **48.9 → 41.7** |
| regional_director@10 | 74.2 → 74.1 | 0.2 → 0.5 | 15.2 → 15.5 | 18.6 → 15.2 |
| algorithm@10 | 81.3 → 78.9 | 0.3 → 1.3 | 7.68 → 8.77 | 48.9 → 45.6 |

Against the band the balance lane proposed and you took Tier 1 on — **low-water
40–75 %, near-death 5–35 %** — Standard now puts **seven of twelve rungs fully in
band**: chad@5, grandma@7, grandma@8 (near-death 4.3, just under), trio@7, trio@8,
meredith@8, meredith@9. §6.3 is about the five that are not.

### 5.5 The capture evidence

Headed Chromium, `?qtier=high`, **quality tier held on every run** (sampled every
turn; the run fails itself if the adaptive governor moves it). Mode identity is
checked twice: against what the resolver claims, and against a live OBSERVABLE
read off the engine — the boss's phase-pool sizes and its built ATK. The first
draft of that check read only the ACTIVE phase, which at boot is `null` because
the boss is at 100 % HP, so a shipped capture and a surgery capture printed
identical identity blocks and the check was decorative. It reads every row now.
Videos, per-turn ledgers and frame-by-frame stills in `screenshots/m-run/`.

**A single fight's outcome is n=1 and is FEEL, not the difficulty claim.** What is
stable across runs is what the boss **published as its intent**, because that is
what the surgery changes directly.

| boss | mode | pools on stage | damaging telegraphs |
|---|---|---|---|
| **grandma@7** | shipped (n=2) | `[6, 5]` | **4 of 28 — 14.3 %** |
| **grandma@7** | Standard (n=3) | `[9, 9]` | **8 of 24 — 33.3 %** |
| meredith@9 | Hard (n=1) | `[5, 5, 5]`, thresholds `0.6 / 0.3 / 0.12` | 15 of 23 — 65.2 % |
| chad@6 | shipped (n=2) | `[3, 3]` | 7 of 7 |
| chad@6 | Standard (n=2) | `[4, 4]` | 4 of 6 |

The Grandma line is the whole wave in one number. In the two shipped runs, the
single most common thing she said was **"I Changed the Will" — 8 times and 6 times
out of 14 telegraphs each**, a −4/−4 debuff, more than half of everything she
published. In the Standard runs the fight is over in 6–9 turns instead of running
past the 14-turn cap.

**The chad rows are not evidence and I am not presenting them as such.** His fights
publish three or four telegraphs total, so a two-run census on him has a resolution
of roughly 30 pp and 7-of-7 vs 4-of-6 is one coin. The claim that chad is unchanged
rests on the 600-run sim (quiet 5.9 % → 5.5 %, low-water 59.9 → 59.9), not on this.

**One capture failed and it failed informatively.** The Standard Meredith run at
level 9 **killed the scripted player at turn 10** (HP 54 → defeat); the game routed
to its retry path, the page navigated, and the harness threw. There is no clean
video for that arm — the ledger up to the defeat is in
`screenshots/m-run/meredith_boss-standard-r1/`. The harness does not handle the
defeat-and-retry path and should before the next wave uses it.

## 6. THE HONEST COSTS — STANDARD

### 6.1 Casual and Standard fight measurably different Grandmas

This is the price of §4.1 and it is real. On Casual, Grandma's phase-1 list is one
attack among five; on Standard it is five damage draws among nine. The two modes
are not the same fight described differently. I think this is correct — it is what
a difficulty mode *is* — but it is the largest single design concession in the
wave and you should know it was a measurement that forced it, not a preference.

### 6.2 The lane-diversity band moves, and it was already over the law

J's law is ≤ 8.0 pp between the three Practice Groups at every rung.

| arm | max band | at |
|---|---|---|
| shipped | **10.3 pp** | restructuring_trio@7 |
| Standard | **12.8 pp** | grandma@7 (Audit 86.0 vs Litigation 98.8) |

**The shipped build already breaches its own law**, which is consistent with the
prior art's note that four passes of the identical config read 6.3 / 6.5 / 7.5 /
10.0 pp. Standard adds 2.5 pp on top of that. The mechanism: Grandma's *base*
weakness is `audit`, the Pivot moves her off it, and the Audit lane's Findings
ramp needs turns that a faster Grandma does not give. This table has no null arm
and n=400; read it as "Audit loses roughly 10–13 pp on Grandma", not as 12.8 exact.

### 6.3 Standard cannot reach three cells, and they are one phenomenon — Q4

chad@6 (88.7 % low-water, 0.0 % near-death), regional_director@10 (74.1 / 0.5) and
algorithm@10 (78.9 / 1.3) did not move and **no phase list can move them.**

- **chad@6 is granted 2.51 enemy turn attempts against the 22.1 he would need.**
  62.4 % of his turns are denied and the fight is 3.5 rounds. His quiet-turn rate
  is 4.1 % — he was never wasting turns, he simply does not get any. You cannot
  fix that by changing what he does with turns he does not have.
- The Regional Director and the Algorithm are **party fights** (Janet and Isaiah),
  and their kits are already 100 % and 60 % damaging.

There is a pattern across the whole table worth naming: **the second, higher level
of every rung is softer than the first, uniformly.** chad@5 59.9 → chad@6 88.7.
grandma@7 65.1 → grandma@8 72.8. meredith@8 58.7 → meredith@9 63.0. That is not
twelve boss-tuning problems, it is one progression observation — the ladder's
upper rung measures a player who ground reception clients past the intended level,
and chad is the extreme because his `balance.json` stats are the lowest of the
bosses (300 HP, ATK 8).

**Sized options, none applied:**

| option | what it costs |
|---|---|
| Accept, and say chad@6 is a victory lap for a player who over-prepared | free |
| A Standard-side enemy-ATK multiplier scoped to those three encounters | one new field (`enemyMult` already exists per-mode; it would need per-enemy keys). Newly *purchasable* because Casual has its own assist — this is exactly the thing the three-mode frame unlocks. Unmeasured. |
| Level-scaling for over-levelled rungs | a much bigger change and a different wave |

### 6.4 A metric caveat I have to state

`quiet` counts any enemy turn that landed and moved Andrew's HP by zero — which
books a **DoT application** as a quiet turn, because the damage arrives on
Andrew's own turn-start two beats later. Karen reads 32 % quiet almost entirely on
`yelp_review`. I did not redefine the metric (the prior art's tables would stop
comparing); I added `dotT` beside it in every table so you can subtract. Karen's
real bookkeeping rate is under 1 %. **Karen was deliberately not touched** — she
is the Break tutorial and her TTK is already the best rung in the game.

---

## 7. HARD — AND ITS OWN HONESTY TABLE

### 7.1 What it delivers, 600 runs

| rung | win | rounds | low-water | near-death | dmg/enemy-turn |
|---|---|---|---|---|---|
| karen@3 | 87.2 % | 5.26 | 45.0 % | 17.0 % | 28.4 |
| karen@4 | 95.5 % | 4.50 | 55.4 % | 7.2 % | 23.3 |
| chad@5 | 96.7 % | 5.21 | 51.6 % | 14.2 % | 22.1 |
| chad@6 | 100 % | 3.44 | 87.1 % | 0.0 % | 8.5 |
| grandma@7 | 87.0 % | 7.17 | 56.5 % | 18.7 % | 18.8 |
| grandma@8 | 94.5 % | 6.42 | 68.5 % | 9.0 % | 14.8 |
| trio@7 | 96.7 % | 6.70 | 35.7 % | 27.5 % | 13.9 |
| trio@8 | 98.5 % | 7.15 | 38.5 % | 23.3 % | 13.6 |
| meredith@8 | 74.8 % | 10.50 | 42.3 % | 34.3 % | 25.1 |
| meredith@9 | 82.5 % | 9.81 | 51.2 % | 28.7 % | 24.5 |
| regional_director@10 | 98.7 % | 4.80 | 62.8 % | 6.7 % | 22.8 |
| algorithm@10 | 96.8 % | 6.23 | 65.6 % | 13.7 % | 16.0 |

**No slogs. The longest fight in the game is 10.5 rounds**, against the 13-round
line you set. That is the whole reason Hard is enemy-side.

### 7.2 The Tier 2 package was built, measured, and thrown away

I owe you this because the brief named Tier 2 as the ready-made candidate core.
Hard v1 was DENIAL_LIMIT 1 + Press Advantage 52 + Coffee 60 + escalation 1.00:

| | Hard v1 (Tier 2) | Hard as proposed |
|---|---|---|
| meredith@8 rounds | **20.8** | 10.9 |
| meredith@9 rounds | 18.0 | 10.4 |
| Breaks/fight, karen@3 | **0.06** (shipped 0.37) | 0.56 |
| Breaks/fight, meredith@9 | **0.04** | 0.07 |
| Breaks under floor | **karen ×2, meredith ×2, regional_director** | meredith ×2 |

**DENIAL_LIMIT 1 is the component that does both.** A seal freezes the Composure
bar, so limiting denial to one turn deletes the Break system on any boss the
player denies often — and it lengthens every fight it touches. Dropping it alone
took the Break economy from five failing cells to zero. Press Advantage 52 and
Coffee 60 then bought threat by removing Andrew's tempo, which is the same trade
in a different coat: **player-economy screws buy difficulty by making fights
longer.** Hard takes its threat from the opposition instead.

### 7.3 Hard's declared costs — Q5

**(a) The lane-diversity law is broken badly, and this is the one I would hold
Hard over.**

| arm | max band | at | the collapsing lane |
|---|---|---|---|
| shipped | 10.3 pp | trio@7 | — |
| Hard (ATK ×1.45) | **42.0 pp** | trio@7 | **Audit 44.3 % vs Litigation 86.3 %** |
| Hard (ATK ×1.30, measured as the alternative) | **35.3 pp** | trio@7 | same |

Also Hard: meredith@8 Audit 56.5 % against Compliance 97.0 %; regional_director@10
Audit 67.3 % against Litigation 99.0 %.

Softening the multiplier does **not** fix it (42.0 → 35.3 pp), because the cause is
structural: the Audit lane's Findings ramp needs turns, and a mode that raises
incoming damage kills you before the ramp pays. **Hard is currently playable on
two of three Practice Groups.**

Three ways to go: *accept it* (a hard mode narrowing viable builds is a normal
genre convention — Hades' higher Heat does exactly this); *hold Hard* until Audit
gets an accommodation; or *ship Hard with a line in its blurb that says so*, which
is the option I would want to argue for if you are undecided.

**(b) Meredith's Break rate.** 0.12 and 0.07 per fight against floors of 0.14 and
0.13 (60 % of the shipped 0.23 / 0.22). She is the lowest-Break boss in the shipped
game already, and any harder mode makes a competent player brace and heal more,
which is fewer tagged hits, which is less Composure. Eleven of twelve cells hold;
these two do not. The sized fix is a per-mode `maxComposure` multiplier that
*lowers* her bar on Hard so the counterplay stays reachable — one more field, and
it only fixes one boss, so I did not add it unasked.

**(c) chad@6 is soft on Hard too** (87.1 % low-water, 0.0 % near-death). Same phenomenon as §6.3.

**(d) The Break floor law itself was wrong in my first draft, and I am leaving
that visible.** I declared hand-picked floors (0.50 for the Break tutorial, 0.25
for the mid bosses) and the **shipped game failed four of ten cells** against them.
A floor the shipped build cannot clear is not a floor, it is an opinion with a
table around it. The rule is now derived in the same run: **≥ max(0.10, 0.60 ×
the shipped rate for that boss)**.

---

## 8. WHAT I WOULD TELL YOU IF YOU ONLY READ ONE PARAGRAPH

The three-mode frame is the real deliverable and I am confident in it: it is data,
it is inert, the gate is proven, and it makes levers purchasable that a one-knob
game measured as unpurchasable. Standard's surgery does what it was commissioned
to do on the two bosses that had the disease — Grandma's published threats go from
14 % damaging to 33 %, and her low-water drops 4.6 pp at level 7 and 6.4 pp at level 8 — and it honestly does
nothing for chad@6, which turns out not to be a boss problem at all. Casual is the
PIP with the shame removed and the floor table says it costs nothing. **Hard is
the part I would not ship without you looking at §7.3 first**, because a mode that
is only playable on two of three build lanes is a mode with a hole in it, and I
could not close the hole by turning a dial.

---

## 9. REPRODUCTION

```bash
node tools/_m-modes.mjs --selftest --census       # the mechanism + the gate's own gate
node tools/_m-modes.mjs --ladder --breaks --runs 600
node tools/_m-modes.mjs --floor --null --modes shipped,casual --runs 800
node tools/_m-modes.mjs --lanes --modes shipped,standard,hard --runs 400

npm run dev                                       # then, headed:
node tools/_m-fight-ab.mjs --mode=shipped  --fight=grandma --turns=22
node tools/_m-fight-ab.mjs --mode=standard --fight=grandma --turns=22
node tools/_m-fight-ab.mjs --mode=hard     --fight=meredith_boss --turns=26
```

Evidence: `.claude/plans/m-run/` (CENSUS, LADDER-final, LADDER-casual, FLOOR-final,
LANES-final, HARD-nodl, HARD-enemy, HARD-v3, HARD-v4, HARD-alt130, _base-diag) and
`screenshots/m-run/` (videos + per-turn ledgers).

To make any of it real: `DIFFICULTY_LIVE = true` in `src/data/difficulty.js`, and
`ACTIVE_NAME_SET` to your pick.
