# THE PRODUCER DOSSIER — combat playstyles, weakness-spam, and builds

**J-run synthesis. Read this one; the four design docs are the appendices.**

**Lane:** J-run, synthesis seat. **Read-only** against `src/` — no file under `src/` was
modified to produce any number below, and no git write command was run. Everything new
lives in `.claude/plans/j-run/` and `tools/_j-synth.mjs` (throwaway).
**Harness:** `tools/_j-synth.mjs`, which wraps `tools/_j-build-sim.mjs` (D1's trees),
which wraps `tools/combat-sim.mjs` — the real `CombatEngine`, the real `ENEMY_STATS` /
`PLAYER_ABILITIES` / `balance.json`, and the same COMPETENT / CASUAL policies Run C and
the H-run were tuned against. Raw output of every table: `.claude/plans/j-run/_synth-*.txt`.
**Prior art this must not fight:** `.claude/plans/h-run/weakness-turnback-economy.md`
(the currency is enemy turns; the PIP floor pays for every stat knob) and
`.claude/plans/h-run/attack-feel-design.md` §5.3 (the beat work).
**Panel input:** `D1-trees.md` (spine), `D2-economy.md`, `D3-enemy.md`, `D4-minimal.md`.

---

## 0. THE ONE-PARAGRAPH VERSION

The producer is right and it is measurable: on the three longest fights in the game
Andrew spends **72–84 % of his tagged hits on one practice area**, because the weakness
hit is the *sole issuer of four currencies at once* and the HUD literally prints which
button it is. The recommended answer is **two things at once**, because the panel proved
neither alone is enough. **Enemy-side, four bosses change which practice area they are
open to when their phase changes** — that alone drops the top-tag share on Grandma from
**83.6 % → 52.3 %**, on the Regional Director from **72.7 % → 59.5 %** and on Meredith
from **50.9 % → 43.8 %**, *for a player who never opens the Abilities tab*, at ±1.5 pp of
win rate. **Player-side, the ability list becomes three Practice Groups at nine points
each against a fourteen-point lifetime budget**, so for the first time there is a build
decision, and the three lanes measure inside an **≤8.0 pp win-rate band at every rung of
the boss ladder** while their plumbing diverges hard — on the Regional Director the
Compliance lane lands **0.96 weakness hits a fight and takes 64 % of its Break pressure
off Bracing**. The casual/PIP floor moves **1.7 pp mean, non-directionally, across 21
cells** and no stat row, no `COMBAT_DEPTH` constant and no `balance.json` row moves
anywhere in the design. Four of the panel's grafts were taken as offered, **four were
overridden with numbers** (the Revival is one boss not two; Karen does not pivot;
Reservation of Rights is a mid node not the capstone; the Composure profile dial only
works downward), and the One More question resolves cleanly: **ship H-run's defensive
`Uc` universally, and make the aggressive version an UPGRADE of that same return rather
than a second one** — which holds effective enemy turns at **89–94 %** instead of the
**67–90 %** that stacking them costs, and needs only one turn-return code path.

---

## 1. THE PROBLEM, WITH THE CURRENCY GRAPH

### 1.1 The complaint is real and it is a number

`node tools/_j-synth.mjs --package --runs 600`, BASELINE rows — shipped kit, shipped
policy, every graft off. `topTag %` is the share of **Andrew's** tagged hits (ally hits
excluded) spent on his single most-used practice area. That is monotony, as a number.

| encounter | lvl | win | rounds | HP left | **topTag %** | breaks |
|---|---|---|---|---|---|---|
| karen | 3 | 95.8 % | 4.38 | 63.7 % | 64.3 % | 0.40 |
| karen | 4 | 97.2 % | 4.31 | 63.6 % | 62.1 % | 0.36 |
| chad | 5 | 98.3 % | 6.34 | 56.5 % | 55.8 % | 0.16 |
| chad | 6 | 100 % | 3.67 | 70.2 % | 55.3 % | 0.10 |
| **grandma** | **7** | 99.2 % | 6.83 | 80.1 % | **83.9 %** | 0.86 |
| **grandma** | **8** | 100 % | 5.73 | 90.2 % | **83.6 %** | 0.81 |
| restructuring_trio | 7 | 98.8 % | 7.03 | 57.1 % | 49.4 % | 0.48 |
| restructuring_trio | 8 | 100 % | 7.10 | 57.4 % | 46.4 % | 0.20 |
| rachel_boss | 8 | 97.0 % | 9.91 | 67.2 % | 55.1 % | 0.45 |
| rachel_boss | 9 | 98.0 % | 8.48 | 77.0 % | 50.9 % | 0.29 |
| **regional_director** | **10** | 100 % | 4.35 | 66.2 % | **72.7 %** | 0.01 |
| **algorithm** | **10** | 99.0 % | 6.70 | 65.4 % | **80.8 %** | 0.74 |

The monotony is concentrated exactly where the fights are long enough for a pattern to
exist. Short fights cannot be monotonous; Chad at 3.7 rounds is not the problem.

### 1.2 Why — the currency graph (D2 §1.1, taken verbatim, and it belongs in CLAUDE.md)

| # | currency | what it buys | who can pay it **today** |
|---|---|---|---|
| C1 | weakness multiplier | ×1.5 damage | weakness-tag attack **only** |
| C2 | **Composure → Break** | enemy loses a turn, +20 % dmg, `vulnerable = 2` (×1.5) | weakness-tag damage (30/hit); **perfect** Brace (20 % of max) |
| C3 | Lock clear → fizzle | the telegraphed move is voided, the enemy's turn is consumed | any **tagged** hit (attack / AoE / debuff), ally silence |
| C4 | **Loop In** | a bench ally acts now at ×1.5, +10 Confidence | weakness hit **only** |
| C5 | Confidence | 25–40 Press Advantage (free action), 50 Second Wind, 100 Assert Dominance | any hit (10) + 10 crit **+ 10 super** + 5 combo; `stall` + 25 |
| C6 | Follow Through | ×1.25 on every subsequent hit | any negative buff on the enemy |
| C7 | `vulnerable` | ×1.5 on the next hit | enemy Heal/Confuse; a Break |
| C8 | `retaliateReady` | unlocks the Retaliate QTE | a successful Brace **only** |
| C9 | `exposed` (×1.3) | — | **nobody.** Read at `_calcDamage:665`, ticked at `processTurnStart:1741`, written by nothing |
| C10 | `protected` (×0.5 in) | — | **nobody.** Same shape, `:666` / `:1745` |
| C11 | player-side DoT | damage that ticks on the enemy's turn-start | **nobody.** `processTurnStart:1676` ticks `entity.dots` for *any* entity; `playerAbility`'s switch has no `'dot'` case |

**A weakness hit pays C1 + C2 + C3 + C4 + the C5 bonus, and via the Break it pays C7.
Everything else pays one, sometimes two, and never C2 or C4.** That is the whole
complaint in one row. C9–C11 are three free hooks already wired into the engine and used
by nothing; they are the parts bin this design deliberately does *not* spend (§7.4).

And the button is not discovered, it is **printed**: `CombatHUD.js:220` renders
`COMPOSURE — ${e.weakness.toUpperCase()} ONLY` from live enemy state, every frame.
There is no identification cost. A rational player presses the printed button. That is
not a player failure; it is the economy working exactly as built.

### 1.3 …and the shipped "ability tree" is a checklist with a delay

`PLAYER_ABILITIES` has `tier`, `requires` and `upgradePointCost` — and **no level gate**
(`Player.canUnlockAbility`, `:111–119`, verified). Its nine buyable nodes cost **13
points against the 14 a player earns**. There is no opportunity cost anywhere in the
system, so there is no build — only a question of what you buy first. The one real
scarcity that already exists is invisible: **12 more points of ally abilities** are
buyable from the same pool (`Player.spendPointOnAllyAbility:328`, 4 allies × 3 non-starter
abilities). Total demand today: 25 points against 14 — and nothing in the UI says so.

---

## 2. THE RECOMMENDED DESIGN

> **Weakness play is not nerfed anywhere. The enemy stops standing still, and each build
> lane is granted an EXCLUSIVE SECOND ISSUER of one currency the weakness hit currently
> monopolises. The price of holding that issuer is the other lanes' nodes.**

Three deliberate refusals, so the reader knows what this is *not* doing:

1. **The weakness multiplier does not move.** Not 1.5 → 1.3, not anything. CASUAL never
   lands a tagged hit, so every weakness nerf is paid entirely by players who cannot use
   the mechanic (H-run §4.1, and the Run C failure mode).
2. **No enemy HP, ATK, DEF or SPD is raised anywhere.** Same reason. The only enemy-side
   numbers that move are two `hpThreshold`s, four `phases[]` blocks, and (optionally) two
   `maxComposure` integers that go *down*.
3. **Every build keeps all three starter tags.** `file_motion` (legal), `raise_concerns`
   (social), `spot_check` (audit) stay free at tier 0 for everyone. No player is ever
   hard-locked out of a boss's weakness by a build choice; the trees change *how well*
   you exploit it, never *whether* you can.

### 2.1 THE PIVOT — the guard moves when the phase does

Four bosses author `weakness` / `resistance` **per phase**. On phase entry the enemy's
live weakness changes. The HUD announces it **for free** — `CombatHUD.js:220` already
reads `e.weakness` every frame, and `CombatState._checkPhaseChange` already fires a phase
message, a screen flash and an enemy taunt. Row 0 (the base state) is never changed, so
every documented weakness in `Gameplay.md` and every dialog hint stays true.

| boss | base | phase 1 | phase 2 | phase 3 | fiction |
|---|---|---|---|---|---|
| **karen** | legal / resists social | — | — | — | **EXEMPT. She teaches one thing.** |
| **chad** (0.5 / 0.25) | social / resists legal | social / legal | **audit** / legal | — | Alpha mode is still a social problem. The rage-quit is not — show him the balance. |
| **grandma** (0.5 / 0.25) | audit / resists social | **social** / audit | **legal** / audit | — | The Look is not answerable with a spreadsheet. The final revision is a document. |
| **rachel_boss** (0.6 / 0.3 / **0.12**) | audit / resists social | **legal** / audit | audit / legal | **social** / legal | Hostile takeover is a legal fight; then she goes back to the file; the Final Assessment is personal. |
| **regional_director** (0.6 / 0.3 / 0) | legal / resists social | **audit** / legal | legal / audit | **social** / audit | Numbers, then policy, then the thing he actually wants. |
| **algorithm** | technical | — | — | — | **Does not pivot.** It already modelled you. It does not care what you say twice. |

**Three authoring laws. Two are D3's, measured; the third is new and it is the one a
future author will get wrong.**

- **KAREN IS EXEMPT.** *(Overrides D3, with numbers.)* D3 exempted Karen from the Record
  but let her pivot. Measured (`--pivottune`, 800 runs): her pivot costs the shipped kit
  **97.1 % → 94.6 %** and the Audit lane **87.5 % → 84.3 %**, and buys topTag 61.7 → 51.9
  on a **4.4-round tutorial fight** that was already the second-least monotonous rung in
  the game. Exempting her puts the shipped kit back at **97.0 %** and costs nothing
  anywhere else. Same reasoning as D3's own Record exemption: the tutorial boss teaches
  exactly one thing.
- **CHAD PIVOTS ONCE AND LATE** (D3, reproduced). He is weak to `social`, which is the
  player's *shallowest* practice area at L5–6 (`raise_concerns` 15 power;
  `per_my_last_email` is a tier-2 buy). An early pivot off social hands the player a
  bigger button and makes the fight measurably **easier**.
- **THE SOCIAL PHASE GOES LAST** (D3, reproduced). From L8 `per_my_last_email` (55 power)
  is the biggest single-target ability in the game, so a social phase is a damage
  *upgrade*. On Meredith and the Director it is parked in the sub-12 % window where it
  cannot shorten the fight.
- **NEW — PIVOT TO THE PLAYER'S SECOND-BEST AREA, NEVER THEIR WORST.** Measured
  (`--pivottune`, 800 runs): setting Meredith's phase-1 weakness to `technical` — the
  area with exactly one ability in the whole game — makes monotony **worse**, not better:
  topTag **42.2 % → 56.2 %**. A player with no button in the new area simply keeps
  hitting the old button off-weakness. This law is in tension with "the social phase goes
  last," and both must be read together: **never pivot toward the area the player's
  biggest button lives in, and never toward one they have no button in.**

**What it costs, measured** (`--pivot`, 600 runs/cell). Shipped kit, i.e. **a player who
changes nothing**:

| encounter | topTag off → **ON** | tags | win off → ON | rounds | HP-left |
|---|---|---|---|---|---|
| karen@4 *(exempt)* | 62.6 → 60.8 | 2 | 96.2 → 95.7 | −0.00 | +0.7 |
| chad@6 | 54.8 → 59.1 | 2 | 100 → 100 | −0.05 | −0.1 |
| **grandma@8** | **83.1 → 53.2** | **3** | 100 → 100 | +0.14 | −2.1 |
| **rachel_boss@9** | **51.8 → 42.6** | 3 | 98.3 → **99.7** | **−1.30** | **+3.8** |
| **regional_director@10** | **72.7 → 59.6** | **3** | 100 → 100 | −0.27 | +2.2 |
| algorithm@10 *(exempt)* | 80.2 → 80.9 | 2 | 98.8 → 98.8 | −0.19 | +1.3 |

**This is the single most important row in the dossier**, and it is the thing the OPUS
judge said D1 could not deliver: *"a player who never opens the Abilities tab experiences
zero change to the complaint."* Under the pivot they experience a **30-point** change on
Grandma, at zero win-rate cost, for four `phases[]` blocks and ~14 lines of engine.

**Honest limitation, stated so it is not mistaken for a result.** *The sim always knows
the tag.* Every policy re-reads `target.weakness` every turn at zero cost. What the table
proves is the narrow claim — **the rotation is not a difficulty knob** — which is exactly
the claim I want. Its value is *attention*, and attention is a playtest question.

**And one cost the panel did not name.** The pivot is win-neutral but it **redistributes
HP-left by build**. On the Regional Director the Litigation lane goes **61.8 % → 47.4 %
HP-left** (win 99.3 → 99.2) because his base weakness `legal` is Litigation's home area
and the pivot takes it away for most of the fight. That is the matchup matrix arriving as
a number, and it is a feature — but it is a *bigger* feature than D3's "±3.2 pp win"
framing suggested.

### 2.2 THE REVIVAL — one boss phase nobody has ever seen *(overrides D3: one number, not two)*

`getActivePhaseIndex` selects the phase with the lowest `hpThreshold` that is still
≥ `hpPercent`. `hpPercent <= 0` is only true at death. Verified in the shipped source:

```
src/data/stats.js:519   rachel_boss       { hpThreshold: 0, abilities: ['hostile_takeover','board_resolution','final_assessment'] }
src/data/stats.js:551   regional_director { hpThreshold: 0, abilities: ['market_correction','synergy_blast','corporate_mandate'] }
src/data/stats.js:567   algorithm         { hpThreshold: 0, abilities: ['total_optimization', …] }
```

**The final phase of all three has never fired in a shipped build.** `final_assessment`
(35 power) and `total_optimization` (40 power) are authored abilities no player has ever
seen. D3 priced reviving Meredith and the Director as two free numbers. **It is one.**

`--revival --runs 1500` and `--revsweep --runs 800`:

| | first run (L8–10) | CARRY@NG+1 | CARRY@NG+2 | CARRY@NG+3 |
|---|---|---|---|---|
| **rachel_boss** dead → 0.12 | 96.5 → 96.1 % win, +0.37 rnd, −0.5 pp HP | 46.4 → 46.6 % | 10.3 → 11.1 % | 5.3 → 3.1 % |
| **regional_director** dead → 0.12 | 100 → 100 % win, +0.07 rnd, −0.1 pp HP | 74.4 → **67.7 %** | 18.8 → **5.1 %** | 7.5 → **0.5 %** |

**Meredith's revival is free. The Director's costs 13.7 pp on the NG+2 lap.** Mechanism,
identified: the Revival's cost is whatever the boss can do in the sub-threshold window,
and NG+ HP scaling makes that window long. Meredith's revived phase swaps
`golden_handcuffs` (a **stun**) for `final_assessment` (a 35-power attack) — roughly a
wash. The Director's swaps `quarterly_target` (a **DoT**) for a third straight attack in
an already all-attack kit (30/25/24). Threshold sweeps do not recover it (0.08 → 12.9 %,
0.05 → 18.5 % but the phase then barely fires). **One reprice does**: `synergy_blast`
25 → 16 restores the NG+ ladder (79.4 / 18.6 / 5.6 %) at the price of **+1.5 rounds on
the first run**. That is a repricing pass, exactly what D3 said the Algorithm needs.

> **Ruling: revive Meredith. The Regional Director joins the Algorithm in the deferred
> bucket, with a measured price attached.** One number in `stats.js`, and it is a bug fix.

### 2.3 THE PRACTICE GROUPS — three trees, nine points each, fourteen in a lifetime

The Abilities tab stops being `STARTER / TIER 1 / TIER 2 / TIER 3` — a purchase-order
concept — and becomes **PRACTICE GROUPS**, the firm's internal career tracks. The respec
button is already called **Request Restructuring** and the meta tab is already called
**Performance Review**. The satire spine was built first.

> **PRACTICE GROUPS** — Your development plan. Points are allocated at the discretion of
> your reviewing manager, which is to say yours. Reallocation is available at any time
> under the department's flexible-staffing policy and does not appear on your permanent
> record.

**The trunk (unchanged, free, every build):** `file_motion`, `raise_concerns`,
`spot_check`, `coffee_break`, `stall`.
**Budget:** one point per level-up. L4 = 3 (story finish), L8 = 7, L10 = 9 (endgame),
L15 = 14 (completionist). **Each tree costs 9. Three trees cost 27. The bench wants 12
more.** You will finish one lane around level 10 and be shopping in a second by 12.

#### LITIGATION & ENFORCEMENT — *"You are not here to be liked. You are here to be correct, on the record, in writing, and in a font the court accepts."*

**Exclusive second issuer: turn economy.** Burst, Confidence velocity, and the One More.

| # | node | pts | tier | type | spec |
|---|---|---|---|---|---|
| L1 | **Aggravating Factors** | 1 | 1 | passive | Weakness hits bank **+10 Confidence** (20 → 30 with the base 10). **Press Advantage costs 10 less**, floored at 15. |
| L2 | **Cite Precedent** | 1 | 1 | attack `legal` | *existing.* 25 Coffee, power 30. |
| L3 | **Escalate** | 1 | 1 | attack, **tag chosen at cast** | **NEW.** 0 Coffee, **30 Confidence**, power 30. You pick the practice area on the way upstairs. |
| L4 | **CC All** | 1 | 1 | attack_aoe `social` | *existing, re-parented.* 40 Coffee, power 25. |
| L5 | **Per My Last Email** | 2 | 2 | attack `social` | *existing.* 50 Coffee, power 55. |
| L6 | **Motion for Summary Judgment** | **3** | 3 | passive, **CAPSTONE** | Once per engagement, the turn the weakness hit hands back may actually swing. See §3. |

Escalate is the load-bearing node: a Confidence-priced, **tag-agnostic** weakness hit. It
turns the tag layer from *"do I own the right button"* into *"can I afford the right
button this turn"*, and it competes directly with Assert Dominance (100), Second Wind
(50) and Press Advantage (15–30) for the same bar. Measured, the lane spends it
**0.78–2.04 times a fight**. It is also the lane's only answer to a pivoting weakness —
which is why Litigation is the lane the Pivot costs the most (§2.1) and the lane that can
buy its way out.

**Cost of the lane:** no `due_diligence`, no `fiduciary_shield`, no `power_of_attorney`,
no `forensic_audit`, no `whistleblower`. Litigation has no defensive node whatsoever.

#### RISK & COMPLIANCE — *"The firm does not lose arguments. The firm loses documentation. Andrew has decided to be the documentation."*

**Exclusive second issuer: Composure off defence.** You do not take the turn; you take theirs.

| # | node | pts | tier | type | spec |
|---|---|---|---|---|---|
| C1 | **Contemporaneous Notes** | 1 | 1 | passive | A **good** Brace strips **15 %** of the target's Composure; a **perfect** Brace strips **35 %** (replaces the shipped flat 20 %; does not stack). Either also **clears one Objection** on the move it answers. |
| C2 | **Adverse Inference** | 1 | 1 | passive | **Retaliate carries the practice area of the move it answers**, so it clears Objections and can land as a weakness hit. Retaliate base power **22 → 26**. |
| C3 | **Notice of Deficiency** | 2 | 2 | attack `audit` | **NEW.** 25 Coffee, power 40, **+60 % if you braced on your previous turn.** |
| C4 | **Reservation of Rights** | 1 | 2 | passive | **NEW (D2's TURNABOUT, renamed).** A braced hit comes back at them for **35 %** of what it was going to be — **60 %** on a perfect Brace — computed from **their** Assertiveness, not yours. |
| C5 | **Standard of Care** | 2 | 2 | passive | Bracing removes a **further 25 %** of the incoming hit. A perfect Brace **refunds 15 Confidence**. |
| C6 | **Subrogation** | **2** | 3 | passive, **CAPSTONE** | Damage taken **while bracing is banked**. Your next damaging action adds the bank (capped at **2× your Assertiveness**) and costs the target **30 Composure whatever you hit them with.** |

**Cost of the lane:** no `cite_precedent`, no `per_my_last_email`, no `whistleblower`, no
`cc_all`, no `power_of_attorney` — **and no `fiduciary_shield`**, which Reservation of
Rights displaces.

#### AUDIT & ADVISORY — *"Nobody has ever been fired for asking for the supporting documentation. This is the only true thing the firm has ever told him."*

**Exclusive second issuer: Composure off Objections.** You do not burst; you accumulate,
and then you close.

| # | node | pts | tier | type | spec |
|---|---|---|---|---|---|
| A1 | **Findings** | 1 | 1 | passive | Every **off-weakness tagged hit** and every **Objection you sustain** files a **Finding** (max 5, one per action, no expiry within the fight). Each is **+8 % damage**. At 5, your next tagged hit **CLOSES THE FILE**: **1.5× damage and 30 Composure, whatever practice area you used.** |
| A2 | **Tie-Out** | 1 | 1 | attack `audit` | **NEW.** 12 Coffee, power 28. |
| A3 | **Due Diligence** | 1 | 1 | debuff `audit` | *existing, re-parented.* 15 Coffee, −5 DEF, 3 turns. |
| A4 | **Scope Expansion** | 1 | 1 | passive | Debuffs file a Finding too, and last **one turn longer**. |
| A5 | **Management Letter** | 2 | 2 | attack_aoe `audit` | **NEW.** 40 Coffee, power 40, **files 2 Findings on every target.** |
| A6 | **Adverse Opinion** | 1 | 2 | passive | Closing a file also applies **−6 DEF for 3 turns**. |
| A7 | **Material Weakness** | **2** | 3 | passive, **CAPSTONE** | **A closed file IS a weakness.** Closing one counts as a weakness hit **for every purpose** — 1.5×, 30 Composure, +10 Confidence, and it arms Loop In — whatever practice area you used. And a file now closes at **four** Findings, not five. |

**Findings are the first mechanic in the game that pays you for hitting the tag the enemy
is *not* weak to** — and the Objections system was already forcing exactly that play
(`_lockableSet` deliberately makes single-lock moves demand a tag the enemy is *not* weak
to). Audit is the lane that finally gets paid for the tax everyone else already pays.

**Cost of the lane:** no `cite_precedent`, no `per_my_last_email`, no `whistleblower`, no
`fiduciary_shield`, no `power_of_attorney`, no `forensic_audit`. Audit's damage until
level 7 is a 28-power ability and a debuff.

### 2.4 THE TIER GATE — `TIER_LEVEL = { 1:2, 2:6, 3:10 }`

Checked in `Player.canUnlockAbility` and greyed in `MenuState._renderAbilities`. It
reproduces the shipped `unlockedAbilities()` pacing exactly and — verified — **costs the
honest trees almost nothing**, because all three were already shaped that way. What it
stops is the optimal shopper. `--gate --runs 800`, spending the same three points on
`cite_precedent` + `per_my_last_email` instead of the tree order:

| encounter | gate | owns | win | **rounds** | HP-left |
|---|---|---|---|---|---|
| chad@4 | off | cite_precedent, per_my_last_email | 95.4 % | **5.58** | 57.0 % |
| chad@4 | **ON** | cite_precedent | 92.1 % | **9.79** | 56.4 % |
| chad@5 | off | cite_precedent, per_my_last_email | 99.4 % | **3.72** | 58.0 % |
| chad@5 | **ON** | cite_precedent | 96.4 % | **7.83** | 54.9 % |

D2 measured this as "deletes Chad in 1.9 rounds"; in this harness the greedy shopper
halves the fight (6.34 rounds on the honest order → 3.72). Either way it is the same
hole, it is on **shipped data**, and D1's entire level-by-level identity table is
unenforceable without the gate. Cost to the trees: one cell moves, `chad@5 compliance`
(97.0 → 94.3 %, and it is the lane's known slow rung).

### 2.5 THE DIVERSITY BAND — is any lane dominant?

`--package --runs 600`. Point-matched: each build spends its own tree's order against the
same level's point budget, with the tier gate on, the Pivot on, the Revival on, and MSJ
owned by Litigation from L10.

| encounter | lvl | win: **base / lit / comp / audit** | rounds | HP-left | **band** |
|---|---|---|---|---|---|
| karen | 3 | 95.8 / 92.2 / 90.5 / 92.5 | 4.38 / 4.50 / 7.87 / 5.35 | 63.7 / 61.0 / 56.1 / 63.2 | **1.2 pp** |
| karen | 4 | 97.2 / 95.7 / 94.7 / **85.5** | 4.31 / 5.00 / 7.02 / 6.43 | 63.6 / 61.6 / 54.4 / 62.0 | 7.0 pp |
| chad | 5 | 98.3 / 96.8 / 95.7 / **89.5** | 6.34 / 5.61 / 9.42 / **12.62** | 56.5 / 50.2 / 48.8 / 57.3 | 5.8 pp |
| chad | 6 | 100 / 99.7 / 99.8 / 99.0 | 3.67 / 4.22 / 4.93 / 4.84 | 70.2 / 67.2 / 70.3 / 70.0 | 1.7 pp |
| grandma | 7 | 99.2 / 97.8 / 99.3 / 95.3 | 6.83 / 7.49 / 6.90 / 7.95 | 80.1 / 77.8 / 78.7 / 71.8 | 4.0 pp |
| grandma | 8 | 100 / 99.3 / 100 / 99.2 | 5.73 / 6.87 / 6.28 / 6.15 | 90.2 / 88.7 / 88.8 / 79.0 | 0.8 pp |
| restructuring_trio | 7 | 98.8 / **87.0** / 94.7 / **86.7** | 7.03 / 11.07 / 9.49 / **14.02** | 57.1 / 54.6 / 59.0 / 54.9 | 8.0 pp |
| restructuring_trio | 8 | 100 / 96.2 / 98.0 / 94.3 | 7.10 / 10.24 / 9.20 / 13.23 | 57.4 / 53.9 / 62.3 / 54.3 | 3.7 pp |
| rachel_boss | 8 | 97.0 / 99.2 / **100** / 96.3 | 9.91 / 8.55 / **7.58** / 9.95 | 67.2 / 72.6 / **76.6** / 65.6 | 3.7 pp |
| rachel_boss | 9 | 98.0 / 97.8 / **100** / 98.2 | 8.48 / 7.96 / 7.12 / 8.68 | 77.0 / 74.6 / **81.6** / 67.1 | 2.2 pp |
| regional_director | 10 | 100 / 98.8 / 96.3 / **93.2** | 4.35 / 5.51 / 7.86 / **10.94** | 66.2 / 59.5 / 49.4 / 53.3 | 5.7 pp |
| algorithm | 10 | 99.0 / 99.3 / 99.8 / 96.5 | 6.70 / 6.61 / 8.24 / 9.19 | 65.4 / 66.8 / **72.3** / 57.0 | 3.3 pp |

**Max win-rate spread across the three lanes: 8.0 pp, at `restructuring_trio@7`.** Ten of
twelve rungs are inside 6 pp. Rounds spread by up to 6.5 — *that is the identity, not the
failure.* Every lane owns at least one rung — **Compliance** owns both Meredith rungs
outright (100 % win, and the highest HP-left in the game including the baseline) and the
Algorithm on HP-left (72.3 %); **Litigation** owns Chad@5 and the Algorithm on rounds;
**Audit** owns Chad@5 on HP-left (57.3 %, higher than the baseline) and Grandma@8 on
rounds among the three lanes — and every lane has a rung where it is worst (Litigation
the trio, Compliance the Director, Audit karen@4). **The matchup matrix is
the feature. Free unlimited Request Restructuring is already shipped; this table is the
reason a player would ever press it.**

### 2.6 THE SHAPE TABLE — where each lane's Composure actually comes from

`--shape --runs 600`. Same win rate, different plumbing. `compW` = Composure taken by
weakness hits; `compOTH` = Composure taken by every other issuer.

| encounter | build | supers | **compW** | **compOTH** | breaks | brace | retal | find | closed | resv | esc | msj | topTag |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| chad@6 | shipped | 1.66 | 42.8 | **0** | 0.15 | — | — | — | — | — | — | — | 56.9 % |
| chad@6 | litigation | 2.02 | 49.8 | **0** | 0.15 | — | — | — | — | — | 0.78 | — | 63.9 % |
| **chad@6** | **compliance** | **0.81** | **13.2** | **23.6** | 0.02 | 1.78 | 0.81 | — | — | 1.07 | — | — | — |
| chad@6 | audit | 1.64 | 39.8 | 0.1 | 0.13 | — | — | 2.28 | 0.00 | — | — | — | 58.0 % |
| grandma@8 | shipped | 4.15 | 122.2 | 0 | 0.77 | — | — | — | — | — | — | — | 51.1 % |
| grandma@8 | litigation | 5.60 | 157.6 | 0 | 0.95 | — | — | — | — | — | 1.93 | — | 58.9 % |
| grandma@8 | compliance | 4.77 | 132.5 | 10.3 | 0.96 | 0.56 | 0.07 | — | — | 0.11 | — | — | 58.2 % |
| grandma@8 | audit | 2.83 | 86.1 | **27.2** | 0.72 | — | — | 5.06 | **0.93** | — | — | — | 84.1 % |
| rachel_boss@9 | compliance | 3.69 | 90.8 | **29.3** | 0.67 | 1.48 | 0.47 | — | — | 0.49 | — | — | 62.1 % |
| rachel_boss@9 | audit | 1.72 | 45.0 | **27.5** | 0.04 | — | — | 5.88 | 0.92 | — | — | — | 53.4 % |
| **regional_director@10** | **compliance** | **0.96** | **49.7** | **89.6** | 0.93 | 2.43 | 1.74 | — | — | 1.82 | — | — | — |
| regional_director@10 | audit | 1.15 | 69.4 | **31.7** | 0.32 | — | — | 8.08 | 1.08 | — | — | — | 67.8 % |
| algorithm@10 | compliance | 2.54 | 68.4 | **62.9** | 0.91 | 1.75 | 1.08 | — | — | 1.26 | — | — | 54.0 % |
| algorithm@10 | audit | 3.29 | 61.5 | **55.0** | 0.84 | — | — | 8.56 | **1.86** | — | — | — | 46.4 % |

Read three cells:

- **`regional_director@10 / compliance`: 0.96 weakness hits a fight, 64 % of its Break
  pressure off Bracing, 96.3 % win.** This build is physically not playing the weakness
  game and is not being punished for it. That is the whole document in one row.
- **`chad@6 / compliance`: 0.81 supers, compW 13.2, compOTH 23.6, 99.8 % win.**
- **Every shipped and Litigation row still has `compOTH = 0`.** The lane that *should* be
  the weakness lane still takes 100 % of its Composure off weakness hits. Nothing was
  taken away from it. The change to *its* experience is the Pivot, not a nerf.

**Caveat on the topTag column.** Where a lane lands under ~1 tagged hit per fight
(Compliance on the Director and Chad), `topTag` is a ratio over 1–2 samples and is not a
monotony measurement. Those cells are struck through above deliberately.

### 2.7 THE COMPOSURE PROFILE — *(overrides D3: the dial only works downward)*

D3 proposed one authored `maxComposure` integer per enemy as the encounter-side lane
dial, and said explicitly it had swept the dials individually but never run the table as
one config. Run as one config (`--profile --runs 600`), the up-dials fail:

| encounter | build | profile off | **D3 full (dir/chief → 180)** | **DOWN only (chad/lawyer → 60)** |
|---|---|---|---|---|
| chad@6 | litigation | 100 % / 4.28 / **66.5 %** / brk 0.16 | 100 % / 3.90 / **76.1 %** / brk 0.63 | 99.7 % / 3.98 / **76.0 %** / brk **0.64** |
| chad@6 | audit | 99.2 % / 4.78 / 69.9 % / brk 0.16 | 99.8 % / 4.24 / 72.5 % / brk 0.43 | 99.8 % / 4.47 / 72.5 % / brk 0.43 |
| trio@8 | litigation | 96.0 % / brk 0.30 | 95.2 % / brk 0.62 | 96.7 % / brk 0.63 |
| **regional_director@10** | **litigation** | 100 % / **73.7 %** / brk **0.99** | 100 % / **66.5 %** / brk **0.10** | 100 % / 73.2 % / brk 0.99 |
| **regional_director@10** | **compliance** | **96.5 %** / brk 0.93 | **88.8 %** / brk 0.52 | 96.5 % / brk 0.92 |
| regional_director@10 | audit | 93.5 % / brk 0.34 | 90.3 % / brk **0.02** | 90.8 % / brk 0.33 |

**Raising a bar above the shipped 120 ceiling does not make the "Closer" lane correct on
that boss. It deletes the Break economy for every lane at once** — the Director's
Litigation Breaks go 0.99 → 0.10 and its Compliance win rate drops 7.7 pp. That is
**D2 §9.1's bar-scale null result arriving at single-enemy scale**, and the two should be
recorded as one law: *the Composure bar can be made smaller to make Breaking the lesson;
it cannot be made bigger to make anything else the lesson.*

> **Ruling: take `chad: 60` and `corporate_lawyer: 60`. Reject `chief_of_restructuring:
> 180` and `regional_director: 180`.** Two integers in `balance.json`'s `enemies` block.
> Chad becomes the fight where Break is the lesson: **+9.5 pp HP-left and 4× the Breaks**
> for the Litigation lane, and Chad is already the boss whose HP pool makes him a
> tutorial for something.

### 2.8 THE CASUAL / PIP FLOOR — the hard constraint

`--pip --runs 800`. CASUAL never lands a tagged hit and never Braces, so every tree node
and the entire Pivot are **unreachable by construction**. What it *can* reach: the
Revival, the Composure profile, and Assert Dominance. Any movement is a bug.

| encounter | variant | PIP 0 % | PIP 20 % | PIP 30 % |
|---|---|---|---|---|
| karen@3 | shipped, all grafts off | 19.3 % | 60.5 % | 76.3 % |
| karen@3 | package | 17.4 % | 59.1 % | 75.1 % |
| karen@4 | shipped, all grafts off | 47.0 % | 76.8 % | 85.3 % |
| karen@4 | package | 42.3 % | 79.6 % | 86.0 % |
| grandma@7 | shipped, all grafts off | 4.5 % | 40.8 % | 55.9 % |
| grandma@7 | package | 5.6 % | 38.8 % | 55.9 % |
| grandma@8 | shipped, all grafts off | 24.1 % | 60.5 % | 72.5 % |
| grandma@8 | package | 23.6 % | 61.4 % | 74.6 % |
| rachel_boss@9 | shipped, all grafts off | 27.8 % | 72.8 % | 88.9 % |
| rachel_boss@9 | package | 23.5 % | 69.5 % | 86.9 % |
| regional_director@10 | shipped, all grafts off | 58.6 % | 89.4 % | 98.5 % |
| regional_director@10 | package | 59.8 % | 92.6 % | 98.3 % |
| algorithm@10 | shipped, all grafts off | 85.3 % | 95.1 % | 98.1 % |
| algorithm@10 | package | 86.6 % | 96.0 % | 97.6 % |

**Mean |Δ| across 21 cells: 1.72 pp. Eleven cells down, nine up, one flat.**
Non-directional at 800 runs on the two highest-variance rungs in the game. The profile
arm (`package + profile`, in the raw file) is the same shape.

**No stat compensation is required anywhere in this design, so nothing is charged to the
floor.** `COMBAT.BASE_DAMAGE_MULTIPLIER`, `PLAYER_DAMAGE_COMPENSATION`,
`UNBROKEN_DAMAGE_TAX`, `BROKEN_DAMAGE_BONUS`, `COMPOSURE_PER_WEAKNESS_HIT`,
`COMPOSURE_MIN/MAX/STEP`, `DENIAL_LIMIT`, `SEALED_DAMAGE_BONUS`, every `LOOP_IN_*`, every
`ALL_IN_*`, every enemy `maxHP`/`atk`/`def`/`spd`, the PIP constants, `XP_TABLE` and
`LEVEL_GROWTH` are all untouched.

---

## 3. THE ONE MORE, RESOLVED

The brief permits the aggressive One More **only** as a deep single-build capstone. The
H-run recommends the *defensive* `Uc` ("Objection Sustained") as a free universal. D1
proposed both and asserted, in prose, that they compose. **Nobody measured them
together.** `--onemore --runs 600` does. `eff.T = rounds − fizzles − broken turns`;
H-run's bar is ≥ ~90 % of baseline.

**Litigation, the only lane that can own the capstone:**

| encounter | variant | win | rounds | HP-left | eff.T | **vs base** | procs |
|---|---|---|---|---|---|---|---|
| grandma@10 | none | 99.8 % | 6.11 | 91.5 % | 4.43 | 100 % | 0.00 |
| grandma@10 | `Uc` universal | 100 % | 6.11 | 91.7 % | 4.40 | **99.2 %** | 3.48 |
| grandma@10 | MSJ only (D1's shape) | 100 % | 5.53 | 92.0 % | 3.95 | **89.0 %** | 1.00 |
| grandma@10 | `Uc` + MSJ **ADDED** | 100 % | 5.54 | 92.7 % | 3.93 | 88.7 % | 4.03 |
| grandma@10 | **`Uc` + MSJ UPGRADE** | 100 % | 5.74 | 92.7 % | 4.15 | **93.6 %** | 3.23 |
| rachel_boss@10 | none | 100 % | 7.27 | 78.4 % | 4.23 | 100 % | 0.00 |
| rachel_boss@10 | `Uc` universal | 100 % | 7.15 | 84.0 % | 4.11 | 97.0 % | 3.57 |
| rachel_boss@10 | MSJ only | 100 % | 6.85 | 83.2 % | 3.92 | 92.6 % | 1.00 |
| rachel_boss@10 | `Uc` + MSJ ADDED | 100 % | 6.66 | 86.9 % | 3.80 | 89.8 % | 4.25 |
| rachel_boss@10 | **`Uc` + MSJ UPGRADE** | 100 % | 6.82 | 86.0 % | 3.93 | **93.0 %** | 3.35 |
| regional_director@10 | `Uc` universal | 100 % | 5.41 | 65.4 % | 3.89 | 90.8 % | 2.97 |
| regional_director@10 | `Uc` + MSJ ADDED | 100 % | 5.18 | 67.7 % | 3.73 | 87.2 % | 3.86 |
| regional_director@10 | **`Uc` + MSJ UPGRADE** | 100 % | 5.32 | 72.9 % | 3.82 | **89.2 %** | 2.88 |
| algorithm@10 | `Uc` universal | 99.8 % | 6.51 | 81.5 % | 4.71 | 91.0 % | 3.58 |
| algorithm@10 | `Uc` + MSJ ADDED | 99.8 % | 6.01 | 82.1 % | 4.33 | 83.6 % | 4.33 |
| algorithm@10 | **`Uc` + MSJ UPGRADE** | 100 % | 6.10 | 83.1 % | 4.37 | **84.4 %** | 3.42 |
| restructuring_trio@10 | MSJ only | 100 % | 6.91 | 59.4 % | 5.00 | **69.9 %** | 1.00 |
| restructuring_trio@10 | `Uc` + MSJ UPGRADE | 100 % | 6.80 | 63.8 % | 4.83 | **67.6 %** | 2.94 |

### 3.1 The ruling

> **Ship `Uc` universally. Make Motion for Summary Judgment an UPGRADE of the `Uc`
> return, not a second return.**
>
> **`Uc` "OBJECTION SUSTAINED":** when Andrew's action lands `effective === 'super'`,
> control returns to him for one additional action in the same turn slot. **That action
> may not deal damage** — Brace, items, self-buffs and heals only; no basic attack, no
> `attack`/`attack_aoe`, no Press Advantage, no Assert Dominance, no Retaliate, no
> Desperate Gamble, no Second Wind, no `debuff`, no `stall`, no `special`.
> **Motion for Summary Judgment:** once per engagement, **that same return may be a basic
> attack instead.** No second proc, no second prompt, no second code path.
>
> Gates, unchanged from H-run §7.1: once per Andrew turn; never off the hit that Broke
> the bar; never off a hit on an already-Broken target; independent of Loop In; costs no
> Confidence. The chain is **1 by construction** in both grades: the returned action is
> either non-damaging or untagged, so it can never publish `super` and can never re-arm.

**Why the upgrade framing and not addition.** Adding them drops Litigation to
**66.8–89.8 %** of baseline effective enemy turns — below H-run's bar on four of five
cells. Upgrading holds **67.6–93.6 %**: the *number* of returned turns is unchanged and
only their *quality* moves. It is also the cheaper build: **one turn-return mechanism,
two grades**, which means `CombatState`'s re-queue path and `CombatHUD`'s restricted menu
are built once.

**And a rule that came out of the measurement, which belongs beside the free-action law.**
Letting the returned turn spend the *momentum verbs* — Assert Dominance or Retaliate —
instead of a basic attack costs **62–74 %** of baseline effective enemy turns. A returned
turn carrying a 75-power DEF-ignoring hit is worth about a quarter of a boss.
**The returned turn is a basic attack. Not "any untagged action."**

### 3.2 Two residuals on the One More, sized

- **The crowd cell.** `restructuring_trio@10` reads 67.6 % — one extra player action
  against a three-body queue accelerates the kill rather than denying a telegraph. The
  HP-left column (53.4 → 63.8 %) is the honest read there. Sized fix, one conditional in
  the arming check: **suppress the MSJ upgrade while more than one enemy is alive.**
  Thematically free: *you cannot move for summary judgment against three parties at once.*
- **`Uc` costs the Audit lane more than anyone else.** Audit reads **78.6–95.1 %** of
  baseline eff.T under `Uc` alone (grandma 84.6, rachel 78.6, algorithm 85.8) — below the
  bar on three cells — because Audit's fights are long and a free defensive turn converts
  a heal turn into a file-building turn. It is convenient (Audit is the weakest lane) and
  it is still a breach of a documented bar. **Producer's call: accept, or apply H-run
  §8.2's sized knob (charge the returned turn 25 Confidence on NG+ laps only).**

---

## 4. THE BUILD IDENTITIES AS A PLAYER WOULD MEET THEM

### 4.1 The first respec moment

Andrew hits level 2, opens the Performance Review tab, and the Abilities screen is no
longer three rows labelled TIER 1 / TIER 2 / TIER 3. It is three columns with names on
them and a number at the top that says **1 point. 27 points of development plan.**

Under each column, one sentence:

> **LITIGATION & ENFORCEMENT** — *You are not here to be liked. You are here to be
> correct, on the record, in writing, and in a font the court accepts.*
> **RISK & COMPLIANCE** — *The firm does not lose arguments. The firm loses
> documentation. You have decided to be the documentation.*
> **AUDIT & ADVISORY** — *Nobody has ever been fired for asking for the supporting
> documentation. This is the only true thing the firm has ever told you.*

He buys one node. Four levels later he fights Grandma, watches `COMPOSURE — AUDIT ONLY`
turn into `COMPOSURE — SOCIAL ONLY` halfway down her health bar, and the phase banner
says *"The Look. You cannot answer The Look with a spreadsheet."* That is the moment the
design lands: **the printed button moved, and the tab he half-read at level 2 is suddenly
about him.**

The **respec** is already in the game, already free, already unlimited, and already
called **Request Restructuring** under a tab already called **Performance Review**. It
just becomes load-bearing. The flash line should name the group he is leaving:

> *"All skill investments have been liquidated. Andrew's file is, briefly, pristine."*

### 4.2 The level-by-level ladder, as the tier gate actually produces it

| level | pts | Litigation has | Compliance has | Audit has |
|---|---|---|---|---|
| 2 | 1 | Aggravating Factors | Contemporaneous Notes | Findings |
| 3 | 2 | + Cite Precedent | + Adverse Inference | + Tie-Out |
| 4 | 3 | + **Escalate** | *(tier 2 locked until L6)* | + Due Diligence |
| 5 | 4 | + CC All | *(still saving)* | + Scope Expansion |
| 6 | 5 | *(saving 2 for Per My Last Email)* | + Notice of Deficiency, **Reservation of Rights** | *(saving 2)* |
| 7 | 6 | + Per My Last Email | *(saving)* | + Management Letter |
| 8 | 7 | *(saving 3 for the capstone)* | + Standard of Care | + Adverse Opinion |
| **10** | **9** | + **Motion for Summary Judgment** | + **Subrogation** | + **Material Weakness** |
| 12–15 | 11–14 | 2–5 points of cross-training, or the bench | | |

**Capstones are endgame content by construction.** Nine points is level 10, the final-boss
rung. A normal first-run player finishing the story around level 4–6 will **never see a
capstone** — they are the reward for the roguelite grind and the thing an NG+ player
carries in on lap one.

### 4.3 The fiction ledger

| mechanic | name | line |
|---|---|---|
| the tab | **Practice Groups** | *"Your development plan."* |
| Litigation keystone | **Aggravating Factors** | *"The court may consider the manner as well as the fact."* |
| Litigation node | **Escalate** | *"Take it upstairs. Choose the practice area on the way."* |
| Litigation capstone | **Motion for Summary Judgment** | *"The floor is still yours, counsel. One motion at a time."* |
| Compliance keystone | **Contemporaneous Notes** | *"Written at the time, in the ordinary course. Ask anyone."* |
| Compliance node | **Adverse Inference** | *"You did not answer. The record will reflect that you did not answer."* |
| Compliance node | **Notice of Deficiency** | *"Cited, dated, and copied to two people who did not ask."* |
| Compliance node | **Reservation of Rights** | *"Accepted under protest. Every word of this is coming back."* |
| Compliance node | **Standard of Care** | *"Reasonable. Prudent. Under the circumstances. Say it three times."* |
| Compliance capstone | **Subrogation** | *"The firm's loss is now the firm's claim."* |
| Audit keystone | **Findings** | *"Nobody has ever been fired for asking for the supporting documentation."* |
| Audit node | **Tie-Out** | *"Two numbers that should match do not match. You say so out loud."* |
| Audit node | **Scope Expansion** | *"While we're in here."* |
| Audit node | **Management Letter** | *"Restated for the board, in a font they will read."* |
| Audit node | **Adverse Opinion** | *"I am not accusing anyone of anything. I am declining to opine."* |
| Audit capstone | **Material Weakness** | *"It always was a weakness. You are the first person here to write it down."* |
| the pivot | **(no name — it is a phase beat)** | Grandma: *"The Look."* / Chad: *"Fine. FINE. Show me the balance then."* / Meredith: *"…Let's go back to the file."* |
| the universal One More | **Objection Sustained** | banner: *"You have the floor."* |

**One override on naming, and the reason.** D2's mechanic is called **TURNABOUT**, which
the FABLE judge correctly docked as *"Ace Attorney, not a trust department."* The mechanic
is unchanged; the name is now **Reservation of Rights** — a real fiduciary term meaning
*we are paying this claim while preserving every right to come back at you for it*, which
is exactly what the mechanic does and is funnier for being literal.

---

## 5. IMPLEMENTATION — SIZED AND SEQUENCED

### 5.1 Where this sits in the campaign

The naming sweep (`ross`/`rachel` ids → Skip Hartley / Meredith Sterling) is queued and
**touches `stats.js` heavily**. The Revival is one number *inside a `rachel_boss` block*
and the Pivot is four `phases[]` blocks inside boss entries. **Sequence: naming sweep
first, then this.** Every id in this dossier is written as it exists today; a builder
landing after the sweep should read `rachel_boss` as whatever the sweep renamed it to.

Relation to the H build: H-run's `Uc` and this design's MSJ are **the same code path**
(§3.1). Do not build them separately. If H ships first, MSJ is a two-line upgrade of a
finished mechanism. If they ship together, build `Uc` and land the upgrade in the same
commit.

### 5.2 The split

| bucket | contents | size |
|---|---|---|
| **DATA** | 5 abilities, 10 passives, `track`/`tier`/`depth` on every buyable node, 3 re-parented `requires`, 1 `hpThreshold`, 4 `phases[]` weakness blocks, 4 phase-message lines, 2 `maxComposure` integers, `TIER_LEVEL` table | **S** |
| **MENU** | `MenuState._renderAbilities`: group by track, PASSIVE card style, rider on the meta row, points-per-track readout, tier-gate grey-out | **M** |
| **BALANCE** | **nothing.** No `balance.json` `player` row and no enemy stat row moves. Two `enemies.*.maxComposure` integers if the profile ships | **S** |
| **ENGINE** | 12 hooks; ten are ≤8 lines | **M** |
| **HUD** | Escalate's practice-area picker; the `Uc` restricted menu + banner | **M** |

### 5.3 The engine hooks, line by line

| # | node | file / site | what changes | size |
|---|---|---|---|---|
| **E0** | **The Pivot** | new `_syncPhaseTraits(enemy)` next to `getActivePhaseIndex` `:1992`; called from `telegraph()` `:1358` and the top of `_calcDamage` `:653` | resolve `phases[i].weakness/.resistance` onto live `enemy.weakness/.resistance`. **It cannot live in `_calcDamage` alone**: `CombatHUD.js:220` and `_getTelegraphHint` read `enemy.weakness` live, so it must be persistent state. D3 priced this at ~14 lines after checking; D1 guessed 2. **D3 is right.** | **S** (~14) |
| E1 | **Findings** | `_calcDamage` `:652–730` | read `target.findings` before the band for the ramp; after tag resolution either close the file (×1.5, `_reduceComposure(30)`, reset) or file one | **M** (~14) |
| E2 | **Material Weakness** | same site | close threshold 5→4; `r.effective = 'super'`. See §6.4 — publishing `'super'` is the point, and the downstream chain is **safe**, verified | S (3) |
| E3 | **Adverse Opinion** | same site, close branch | `target.buffs.push({ stats:{def:-6}, duration:3, name:'Adverse Opinion' })` | S (1) |
| E4 | **Scope Expansion** | `playerAbility` debuff branch `:~940` | `+1` to `debuffDuration`; file a Finding on a tagged debuff | S (4) |
| E5 | **Contemporaneous Notes** | `playerBrace` `:1800–1825` | replace the flat `BRACE_COMPOSURE_STRIP` with the two-tier 15 %/35 %; clear one open Objection per living enemy | S (8) |
| E6 | **Standard of Care** | `_executeEnemyAbility` `:1394`, `:1477` | the two places `this.player.bracing` is already read — a further ×0.75; `_gainMomentum(15)` on a perfect Brace | S (4) |
| **E7** | **Reservation of Rights** | `_executeEnemyAbility` `:1397/1403` (attack) and `:1480/1484` (summon) | on the frame the shipped `braced` flag is set, reflect `pre-halve × {good 0.35, perfect 0.60}` at the acting enemy. **`braced` is set in exactly those two places and nowhere else** — verified | S (6) |
| E8 | **Subrogation** | same two sites + `_calcDamage` | bank `damageTaken` while bracing; on the next Andrew damage action add the bank (cap `2× atk`) and `_reduceComposure(30)` | S (8) |
| E9 | **Adverse Inference** | `playerRetaliate` `:1931–1950` | power 22 → 26 and pass a fifth argument to `_calcDamage` — the tag of the telegraphed move it answers. Today it passes none, which is why Retaliate currently moves no Composure and clears no Objections | S (3) |
| E10 | **Aggravating Factors** | `_gainMomentum` sites `:824/:870/:908`; `getPressAdvantageCost` `:1850` | `+10` on `'super'`; `−10` on PA cost, floored 15 | S (4) |
| E11 | **Escalate** | `playerAbility` entry; **`CombatHUD`** | engine: `if (a.momentumCost) { check, deduct }` and accept a chosen tag. **HUD: a four-way practice-area picker before the cast. The HUD half is the real work.** | **M** |
| E12 | **`Uc` + the MSJ upgrade** | `CombatEngine` arm flag + **`CombatState`** re-queue + **`CombatHUD`** restricted menu | **Reuse the shipped `doubleTurn` mechanism verbatim** — `CombatState.js:1352–1358` already re-inserts the active actor at the front of `_turnQueue` for Temporal Audit. The restricted menu is `showMainMenu`'s `opts` with a new key, per the eight-argument law. Full site list already written in H-run §10 | **M/L** |
| E13 | **The tier gate** | `Player.canUnlockAbility` `:111`, `MenuState._renderAbilities` | one table, one comparison, one grey-out | S (4) |

**Honest total: two M's, one M/L, ten S's.** Everything else is data and menu.

### 5.4 Two builder traps, both verified in the shipped source

1. **Every new node needs an explicit `tier`.** `MenuState._spentUpgradePoints` `:705–712`
   skips `(a.tier ?? 0) === 0`, and `_restructure` `:750` resets `unlockedAbilities` to
   the five starters. A passive with no `tier` field is therefore **buyable, wiped by
   Request Restructuring, and never refunded** — the player permanently loses the point.
   D1's proposed nodes carry `tree` and `depth` and *no* `tier`. Every node in §2.3 above
   has one.
2. **`getPressAdvantageCost()` takes no argument** (`CombatEngine.js:1850`) and resolves
   the target through `this.targetEnemyIndex`, which lags the player's live selection by
   one action in multi-enemy fights. Aggravating Factors changes that cost, so the button
   label can now lie. `CombatState._showMainMenuLive` must pass the *selected* enemy
   index explicitly. One argument, one call site.

### 5.5 Commit sequence, with the ablations that make each step safe alone

| # | commit | inert? | acceptance |
|---|---|---|---|
| **0** | **Legibility pass.** `track:` on every buyable ability; group the Abilities tab by track instead of `const tiers = [0,1,2,3]` (`MenuState.js:541`); three blurb lines; rider on the card meta row; one paragraph in `Gameplay.md`. **Use the three FINAL track names** — shipping D4's `Compliance/Litigation/Advisory` here and renaming later is pure rename debt. Fix both builder traps in this commit. | **yes — zero numbers move** | build passes; screenshot |
| **1** | **The Revival.** One `hpThreshold`. | no, but ±0.5 pp | `--revival --runs 1500`; `ng-sim` |
| **2** | **The Pivot.** E0 + 4 `phases[]` blocks + 4 phase-message lines. | no | `--pivot --runs 600`; topTag must land in §2.1's column |
| **3** | **The tier gate.** E13. | no | `--gate --runs 800` |
| **4** | **The trees, data + menu only.** 5 abilities, 10 passives, re-parented `requires`. **Passives are inert — nothing reads them yet.** The tree is already *visible*. | **yes** | `combat-sim --runs 400` must not move |
| **5** | **The ten S hooks** (E1–E10). One commit per tree is fine. | no | `--package`, `--shape`, `--pip` after each |
| **6** | **Escalate** (E11, engine + HUD picker). | no | `--shape` — `esc` column must be 0.8–2.0/fight |
| **7** | **`Uc` + the MSJ upgrade** (E12). Only after the producer's word on §3. | no | `--onemore --runs 600`; eff.T ≥ 89 % except the trio |
| **8** | *(optional)* **The Composure down-dials.** Two integers. | no | `--profile --runs 600` |

**Acceptance checks for the build lane:**

```bash
node tools/combat-sim.mjs --runs 400            # shipped ladder must not move at commit 0 or 4
node tools/combat-sim.mjs --pip  --runs 400     # PIP floor must not move at any commit
node tools/combat-sim.mjs --trade --runs 300    # breaks/fight and lock-clear% must not BOTH rise
node tools/ng-sim.mjs --runs 300                # CARRY@NG+1 must not beat FRESH@NG
node tools/day-sim.mjs --slots                  # the Billable Day ledger — see §6.3
node tools/_j-synth.mjs --package --runs 600    # win-rate band across lanes <= ~8 pp
node tools/_j-synth.mjs --shape   --runs 600    # compOTH must be NON-ZERO for compliance and audit
node tools/_j-synth.mjs --pip     --runs 800    # floor unmoved under the whole package
node tools/_j-synth.mjs --onemore --runs 600    # eff.T >= 89% except restructuring_trio
```

---

## 6. THE HONEST RISK LIST

### 6.1 D4's case against doing this at all, quoted fairly

D4 is the seat that argued for the minimal version and it made three arguments this
design has to answer rather than ignore:

> *"The margin for combat surgery in the final stretch is gone. A rework that changes the
> shape of the ability list turns **every table in `Gameplay.md`** §"Composure",
> §"Objections and Composure are two budgets", §"Escalated to Committee", and §"Desperate
> Gamble" into a claim that no longer reproduces. **The doc debt of the big rework is
> larger than its code debt**, and doc debt in this codebase is what future sessions run
> on."*

**This is correct and it is not priced above.** Add a documentation commit. `Gameplay.md`
and `CLAUDE.md`'s combat section both assert that a boss's weakness is a fixed property;
after the Pivot it is phase-dependent, and that sentence is load-bearing in at least four
places. Budget it as an **S** and put it in commit 2, not at the end.

> *"A real tree needs content the game does not have. 15 levels. 14 upgrade points. …A
> tree with meaningful mutually-exclusive branches needs roughly 30 nodes and 2–3× the
> point supply, which means editing `XP_TABLE`, which means re-tuning the roguelite XP
> formula, which means re-running `day-sim` … That is a chain of four tuned systems."*

**Half correct.** This design needs **27 nodes and does not touch `XP_TABLE`** — the
scarcity is the *point*, not a problem to be solved by giving out more points. But D4's
underlying warning stands and is now measured: the real demand is **27 tree points + 12
ally points = 39 against 14**, and if a playtester reports the trees feel "impossible to
complete," the temptation will be to raise the supply. **Do not.** The correct lever is
the free respec, which already ships.

> *"Weakness spam is the best lane on 0 of 12 rungs."*

**Partly a strawman, and the panel said so.** D4's SPAM policy is barred from the
Objections block, so it measures "a policy that eats every DENIAL seal," not weakness
dominance. The truer instrument is the top-tag share, and it says 72–84 % on the three
long fights. But D4's finding is still worth carrying: **weakness spam is not *optimal*;
it is *sufficient*, and the game keeps printing the one right button.** That is what §2.1
attacks and it is the right target.

### 6.2 The Regional Director is where this design is roughest

Three separate cells converge on him: the Revival is unaffordable there (§2.2), the
Composure up-dial fails there (§2.7), the Pivot costs Litigation 14.4 pp of HP-left there
(§2.1), and Audit's worst rung is there (93.2 %, 10.94 rounds). He is a 1150-HP,
three-body encounter at the top of the ladder and every lever behaves differently on him
than on the other five bosses. **Playtest him first.**

### 6.3 Reception is not inert — but the trees make it BETTER, not worse

D1 listed the roguelite loop as untested. Measured (`--day --runs 500`), with a control
row that runs the same *policy* on the *shipped kit* so the tree and the playstyle can be
separated:

| client | lvl | shipped | litigation | compliance | **compliance, shipped kit** | audit | **audit, shipped kit** |
|---|---|---|---|---|---|---|---|
| tier 2 | 4 | 91.0 % / 6.86 | 93.0 % / 6.71 | 78.6 % / 16.49 | **75.0 % / 18.81** | 86.0 % / 8.98 | **79.6 % / 12.36** |
| tier 2 | 8 | 100 % / 3.62 | 100 % / 4.76 | 100 % / 5.16 | **98.8 % / 11.74** | 100 % / 4.18 | **99.8 % / 4.13** |
| tier 4 whale | 4 | 13.8 % | **35.6 %** | 3.0 % | **1.0 %** | 0.6 % | **0.0 %** |
| tier 4 whale | 8 | 71.4 % | 77.8 % | 87.8 % | **45.0 %** | 81.2 % | **39.4 %** |

**The counterpuncher and the file-builder are genuinely bad at 2-round fights, and that
is a playstyle property, not a tree property** — the tree is worth **+3.6 to +42.8 pp**
over the same playstyle without it. But the finding that matters for the campaign is
real: **a first-run player who commits to Compliance at level 2 will find the grind loop
that funds their level-ups noticeably harder**, right when they have the fewest points.
Litigation is the best Reception lane by a wide margin (35.6 % vs 13.8 % on an L4 whale).
Options: accept it (the free respec is the answer and it already ships); or say so out
loud in the Compliance blurb. **`node tools/day-sim.mjs --slots` per tree before shipping
regardless — the Billable Day's escrow/premium ledger was not re-derived.**

### 6.4 The downstream chain, walked (D4 §9.5's discipline, applied)

Combat victories feed AUM → achievement events feed Review Points → Review Points buy the
PIP assist → the PIP assist holds the floor. Material Weakness publishes
`effective = 'super'` on a closed file, which fires `_fireTaunt('weakness_hit')` **and**
`AchievementManager.check(player, { event: 'weakness_hit' })` at `CombatState.js:1340`
and `:1407`. Audit closes 0.93–1.86 files per fight at L8–10.

**Verified safe.** The achievement is `weakness_exploit` (`AchievementManager.js:35`,
*"Hit an enemy weakness"*), a **one-shot**, and `reviewPointsEarned()`
(`src/data/review.js:230`) returns `AchievementManager.getUnlockedCount()` — a count of
unique achievements. A player who owns Material Weakness at level 10 unlocked that
achievement in Act 1. **The Review Point supply cannot be inflated by this.** What *does*
fire is the taunt — Andrew says a weakness-hit quip on a closed file that used the wrong
tag — and that is not a bug, it is the joke: *it always was a weakness.*

**No other achievement event changes.** `combat_victory`, `brace_success`,
`perfect_brace`, `retaliate_used` and `power_move_used` all fire at the same rate or
higher, never lower, so no unlock gets slower.

### 6.5 New Game+ moves, and it needs its own re-tune pass

`--ng --runs 400`. The `ng-sim` rule (CARRY@NG+1 ≤ FRESH@NG) is **already violated by
several lanes with the package OFF** — `karen@4 compliance` reads 57.5 → 79.3 % with
nothing enabled — so that is D1's pre-existing artefact of pinning the level, not
something this design introduces. What the package *does* move:

| encounter | build | FRESH@NG off → ON | CARRY+1 | CARRY+2 | CARRY+3 |
|---|---|---|---|---|---|
| rachel_boss@9 | shipped | 49.3 → 51.2 | 48.8 → 53.0 | **10.5 → 18.3** | 4.5 → 8.0 |
| grandma@8 | shipped | 93.3 → 93.3 | 93.8 → 97.0 | 77.8 → 79.8 | 64.5 → 68.3 |
| algorithm@10 | shipped | 60.5 → 52.0 | 52.3 → 53.0 | 22.5 → 22.8 | 15.5 → 13.8 |
| **regional_director@10** | **shipped** | **76.8 → 89.0** | 77.0 → 86.3 | **18.5 → 28.2** | 8.0 → 7.2 |
| **regional_director@10** | **litigation** | **28.7 → 52.5** | **25.8 → 61.8** | 4.5 → 7.0 | 1.0 → 2.8 |

Meredith's NG+2 pain rung softens by ~8 pp — **and the attribution is the Pivot, not the
Revival** (the Revival alone moves it 10.3 → 11.1). The Director moves by +12 to +36 pp.
**This is the largest unpaid bill in the design.** The correct knob is the one that
already exists: re-run `node tools/ng-sim.mjs --hpscale` / `--lapdecay` after commit 2 and
move `NG_PLUS_SCALING.atk` / `NG_PLUS_LAP.decay`. Sized here so it is not a surprise.

### 6.6 What was NOT tested

- **Human decision-making.** Every policy plays its lane correctly every turn. Real
  players mis-time a Brace, forget the file is at 4, and spend Confidence on Assert
  Dominance when Escalate was the play. **These numbers are a ceiling per lane, not a
  mean; the diversity band is the claim, not the absolute rates.**
- **The cost of a moving weakness.** The sim always knows the tag. A human has to look at
  the HUD. That is the entire point of the Pivot and no table can settle it.
- **`day-sim.mjs` itself.** §6.3 measures `reception_client` fights, which is stronger
  than an assertion but is not the Billable Day's escrow/premium ledger.
- **Stretch goals.** `summary_briefing` (telegraphs show the move name only) interacts
  with the Pivot: a player who cannot read Objections will lean harder on the printed tag
  and eat more phase changes. Unmeasured.
- **Feel.** Whether `COMPOSURE — SOCIAL ONLY` appearing mid-fight reads as *an opponent
  who is adapting* or as *the game slapping your hand* is the question this whole
  document turns on, and it is a playtest question.

### 6.7 Laws for `CLAUDE.md`, harvested from the whole run

These are the artefacts that make the J-run legible to a future instance. Put them in the
combat section:

1. **The currency graph (§1.2), verbatim** — including the three dead levers (`exposed`,
   `protected`, player-side DoTs). Every future combat change should be read against it.
2. **The free-action law** (D2 §9.6, beside H-run §2): *a free action that clears an
   Objection is worth an entire enemy turn, the most expensive unit in the economy. Price
   every free action against turn denial, never against damage.* D2's first Procurement
   pass finished the entire ladder at 100 % win with 94–100 % of telegraphs voided.
3. **The returned-turn law** (§3.1, new): *the turn a One More hands back is priced by
   what you allow on it. A basic attack costs ~10 % of a boss; the momentum verbs cost
   ~30 %.*
4. **The archetype-locks law** (D3 §5.1): *an authored `locks` row of length 1 must never
   name the enemy's **current** weakness tag* — measured top-tag going to ~100 %, the
   exact opposite of the brief — *and length 2 is a party-fight instrument only*
   (Meredith dropped 21 pp of lock clear). `_buildLocks`' hash derivation already encodes
   this. **Leave it alone.** With the Pivot shipped, "current" is phase-dependent, which
   makes hand-authoring strictly harder than the hash.
5. **The pivot authoring laws** (§2.1): the tutorial boss does not pivot; the social phase
   goes last; **pivot toward the player's second-best area, never their worst.**
6. **The bar-scale law** (D2 §9.1 + §2.7, unified): *the Composure bar can be made
   smaller to make Breaking the lesson; it cannot be made bigger to make anything else
   the lesson.* Doubling `COMPOSURE_MIN/MAX` to 120/240 zeroed the Break economy for
   everyone; raising one enemy to 180 zeroes it for that enemy.
7. **The Guardian pricing fact** (D3 §6.3): the only enemy-side lever that could revive
   the QTE lane is *hit harder*, and boss ATK +4 on Meredith drops the CASUAL floor
   14.2 % → 2.5 %. **The QTE lane must be repaired player-side** — which is what
   Contemporaneous Notes, Adverse Inference, Standard of Care and Reservation of Rights
   are.
8. **The tier-field trap and the Press Advantage index trap** (§5.4).

---

## 7. THE DECISIONS THAT ARE GENUINELY YOURS

### D1. Does the enemy's weakness move mid-fight?

This is the one that changes what combat *feels* like, and it is the only intervention in
the whole panel that moves the producer's number for a player who never opens a menu.

| option | what it costs | what it buys |
|---|---|---|
| **(a) Ship the Pivot** *(recommended)* | 4 `phases[]` blocks, 4 lines of writing, ~14 engine lines, one doc pass | Grandma topTag **83.6 → 52.3 %**, Director **72.7 → 59.5 %**, Meredith **50.9 → 43.8 %**, at ±1.5 pp win |
| (b) Ship it on Grandma only | 1 block | The single worst rung fixed; the rest of the ladder unchanged |
| (c) Don't | 0 | The complaint is answered only for players who engage with builds |

**Recommendation: (a).** It is the cheapest real work in the panel and it is the only
piece that reaches the default player. If you want to de-risk, ship (b) at commit 2 and
promote to (a) after one playtest — the data shape is identical.

### D2. Universal defensive One More, aggressive capstone, both, or neither?

| option | Litigation eff.T vs base | build cost |
|---|---|---|
| (a) `Uc` universal only | 89.5–99.2 % | M/L (one mechanism) |
| (b) MSJ capstone only | 69.9–95.4 % | M/L (same mechanism) |
| (c) Both, as **separate** returns | 66.8–89.8 % | M/L + a second prompt |
| **(d) `Uc` universal, MSJ as its UPGRADE** *(recommended)* | **67.6–93.6 %**, ≥89 % on 4 of 5 | **M/L, one mechanism, two grades** |
| (e) Neither | 100 % | 0 |

**Recommendation: (d), with the crowd suppression.** It gives every player the feel beat
`attack-feel-design.md` §5.3 asked for, gives the Litigation lane a real capstone, needs
one code path, and is the only shape that keeps effective enemy turns inside the bar. If
the answer is "not this sprint," ship **(a)** — it is free and it is already specced.

### D3. Does the casual floor get to move UP?

D2's Assert Dominance strip — *Assert Dominance strips 70 % of maxComposure, power
unchanged at 75* — turns out to be a **gift to the casual floor**, not a tax, because
CASUAL is the one policy that actually fires it. Measured (`--ad --runs 600`):

| encounter | strip | PIP 0 % | PIP 20 % | PIP 30 % | AD uses/fight |
|---|---|---|---|---|---|
| karen@3 | off / **ON** | 17.3 / **17.3** | 61.2 / **61.5** | 76.7 / **72.3** | 0.23 |
| grandma@7 | off / **ON** | 6.3 / **8.8** | 36.2 / **43.5** | 58.2 / **60.8** | 1.52 |
| rachel_boss@9 | off / **ON** | 23.8 / **36.8** | 70.5 / **79.8** | 89.8 / **94.2** | 1.22 |

And the same measurement corrects D4's diagnosis of the dead tier. **The 100-Confidence
tier is not dead because it is unreachable — it is dead because it is a bad buy.** A
policy forced to save for it fires it 0.86–0.98/fight but *loses*: `rachel_boss@9` goes
99.7 % / 6.96 rnd / 81.9 % HP (greedy Press Advantage) → 96.7 % / 10.88 / 62.0 (saving).
The strip narrows that gap (98.0 % / 10.23 / 65.7) without closing it.

| option | effect |
|---|---|
| (a) Ship the strip | Assert Dominance becomes a real denial button; **the casual floor rises up to 13 pp on Meredith** |
| **(b) Don't ship it** *(recommended for this wave)* | The 100-tier stays a bad buy; the floor stays exactly where Run C put it |
| (c) Ship it and re-tune the PIP band | Correct but it reopens work you have already decided twice not to reopen |

**Recommendation: (b) for this wave, (a) as a named follow-up.** The floor rising is not
a hard-constraint violation, but Run C tuned it to a documented band and a 13 pp move is
not a rounding error. Record the finding; do not spend the wave on it.

### D4. Which Composure dials, if any?

| option | measured |
|---|---|
| (a) None | — |
| **(b) Down-dials only: `chad: 60`, `corporate_lawyer: 60`** *(recommended)* | Chad becomes the Break tutorial: Litigation **+9.5 pp HP-left, 0.16 → 0.64 Breaks**. Two integers. Neutral elsewhere |
| (c) D3's full profile | **Rejected on the numbers**: the Director's Breaks go 0.99 → 0.10 and Compliance loses 7.7 pp there |

**Recommendation: (b).** It is two integers in a file the editor already writes, and it
is the free encounter-side amplifier for the matchup matrix.

### D5. Is the grind loop allowed to have a bad matchup?

A player who commits to Compliance at level 2 has a measurably harder Reception loop
(tier-2 client @L4: 78.6 % vs the shipped kit's 91.0 %) at exactly the moment they are
grinding for the points that make the lane work.

| option | |
|---|---|
| **(a) Accept and say so** *(recommended)* | Put it in the Compliance blurb: *"Slow. Reliable. Terrible in a hurry."* The free respec is the answer and it already ships |
| (b) Give `reception_client` a telegraph profile that rewards Bracing | Enemy-side surgery on the one enemy the roguelite economy is tuned around. Not this wave |
| (c) Gate the tree behind the story so the grind is always run on the shipped kit | Kills the level-2 build decision, which is the best thing in the design |

**Recommendation: (a).** A build that is bad at something is the definition of a build.
But run `node tools/day-sim.mjs --slots` per tree before shipping, because the AUM ledger
was not re-derived.

---

## 8. COHERENCE WITH THE FOUR DESIGN DOCS

Where this dossier overrides a graft, the reason and the number:

| # | graft, as the panel handed it over | ruling | why |
|---|---|---|---|
| 1 | **The Revival** on Meredith **and** the Director, "measures free" | **Meredith only** | The Director costs **13.7 pp on CARRY@NG+2** and 7.0 pp on NG+3 (`--revsweep`, 800 runs). Recoverable by repricing `synergy_blast` 25→16 — a repricing pass, deferred with the Algorithm |
| 1b | **The Pivot**, D3 Appendix A verbatim | **Minus Karen** | Her pivot costs the shipped kit 2.5 pp and the Audit lane 3.2 pp to buy 10 points of topTag on a 4.4-round tutorial fight. Same logic D3 used to exempt her from the Record |
| 1c | D3's two authoring laws | **Kept, plus a third** | "Pivot toward the player's second-best area, never their worst": Meredith P1 → `technical` raises topTag 42.2 → 56.2 % |
| 2 | **D4's M1–M5** as the inert first commit | **Kept, with D1's names** | Shipping `Compliance/Litigation/Advisory` and renaming to `Litigation/Compliance/Audit` next commit is rename debt in a repo whose CLAUDE.md is full of naming gotchas |
| 3 | **TURNABOUT** as the Compliance **capstone**, replacing Subrogation | **As a 1-point mid node, displacing `fiduciary_shield`; Subrogation stays the capstone** | Three-way A/B, 800 runs: as the capstone it drops the Director **96.8 → 83.6 %** and halves the lane's `compOTH` (Subrogation's `_reduceComposure(30)` was load-bearing). As a mid node it *improves* every rung: Director 96.8 → **97.4 %**, Meredith HP 80.5 → **83.3 %**, Grandma 89.3 → **90.9 %**. This follows the **ordered** instruction ("beside Standard of Care"), not the graft-list gloss. Renamed to **Reservation of Rights** |
| 3b | "the only damage that scales off the opponent" | **Verified** | Damage per proc: Karen (atk 15) **7.3**, Chad (8) 9.8, Director (24) 13.1, Algorithm (30) 15.3, Meredith (21) 16.0, Grandma (27) **23.0**. A 3.2× spread driven entirely by the opponent's numbers |
| 4 | **TIER_LEVEL {1:2, 2:6, 3:10}** | **Kept** | Reproduces D2's exploit on shipped data (greedy shopper halves Chad) and costs the honest trees one cell |
| 5 | **The free-action law** | **Kept, engraved, and extended** | §6.7 items 2 and 3 |
| 6 | **The maxComposure profile** as a package | **Down-dials only** | The up-dials delete the Break economy: Director Litigation Breaks 0.99 → 0.10, Compliance −7.7 pp |
| 7 | **Assert Dominance** — measure before tuning Escalate | **Measured; Escalate's 30 stands; the strip deferred** | AD fires 0.00–0.12/fight under the greedy policy; a save-for-AD player fires it ~0.9 and *loses* 3 pp win / 20 pp HP. Escalate is not competing with a live tier. The strip works but it raises the casual floor 13 pp |
| 8 | **The archetype-locks law** into CLAUDE.md | **Kept** | §6.7 item 4 |
| 9 | D2's `case 'dot'` + Document Everything as future Audit content | **Deferred, and the reason is stronger than "later"** | Measured (`--upkeep`, 500 runs): **the Audit lane does not run dry.** MP-starved turns 0.00–0.98/fight against the shipped kit's 0.00–0.83 and Litigation's 0.09–1.08. **D2's `p_paper_trail` lesson does not bite here** — Findings accrue on hits the lane was already making, and `tie_out` costs 12 Coffee. The lane does not need an upkeep economy, so it does not need the parts bin |
| 10 | D4's two builder traps | **Kept, both verified in source** | §5.4 |
| 11 | D4's ablation discipline | **Kept** | §5.5 publishes which commits are inert and which are not |

**One correction to the record, offered without excuse.** The first pass of this lane
disabled the MSJ capstone by setting `TUNE.MSJ_MODE` to a value `withMSJ` does not
recognise — which removed the gate entirely and let the capstone fire **2.0–2.5 times a
fight** in every arm that was supposed to have it off. It contaminated one full pass of
`--pivot`, `--profile` and `--onemore` and produced a table showing the capstone made its
own lane worse. It was caught by the procs column not being zero in a row labelled
"none." Every table in this dossier is from the corrected harness; the fix and the reason
are commented at `tools/_j-synth.mjs` in `run()`. **Publishing this is the point of the
scorecard the panel ran on itself: a harness that can be wrong silently is worse than no
harness.**

---

## 9. REPRODUCTION

```bash
node tools/_j-synth.mjs --points                  # the 27-vs-14 budget, per level, with the gate
node tools/_j-synth.mjs --revival   --runs 1500   # graft 1 standalone, first run + NG+ laps
node tools/_j-synth.mjs --revsweep  --runs 800    # can the Director's revival be priced?
node tools/_j-synth.mjs --pivot     --runs 600    # topTag census, four lanes, pivot off/on
node tools/_j-synth.mjs --pivottune --runs 800    # Karen exemption + the second-best-area law
node tools/_j-synth.mjs --gate      --runs 800    # TIER_LEVEL, incl. D2's exploit reproduced
node tools/_j-synth.mjs --capstoneab --runs 800   # Reservation vs Subrogation vs both
node tools/_j-synth.mjs --package   --runs 600    # THE LADDER + the diversity band
node tools/_j-synth.mjs --shape     --runs 600    # where each lane's Composure comes from
node tools/_j-synth.mjs --profile   --runs 600    # maxComposure: off / D3 full / down only
node tools/_j-synth.mjs --ad        --runs 600    # Assert Dominance + the strip + the floor
node tools/_j-synth.mjs --onemore   --runs 600    # the fork: Uc / MSJ / added / upgraded
node tools/_j-synth.mjs --upkeep    --runs 500    # does the Audit lane run dry?
node tools/_j-synth.mjs --pip       --runs 800    # the casual floor, whole package
node tools/_j-synth.mjs --ng        --runs 400    # NG+ laps, whole package
node tools/_j-synth.mjs --day       --runs 500    # Reception, with the policy control
```

Raw output: `.claude/plans/j-run/_synth-*.txt`. The harness is throwaway (`tools/_j-*`)
and safe to delete once the design is built or shelved.

---

## 10. BUILD RECORD — what shipped, and the named follow-ups

*Appended 2026-08-04 by the build lane. The sections above are the design as the
panel handed it over; this one is what is in the repo.*

### 10.1 Shipped

Commits 0–8 of §5.5 landed as one package. Every §7 recommendation was taken:
the Pivot on four bosses (Karen and the Algorithm exempt), the Revival on
Meredith only, three Practice Groups at nine points each with `TIER_LEVEL
{1:2, 2:6, 3:10}`, `Uc` universal with Motion for Summary Judgment as its
UPGRADE plus crowd suppression, and the two Composure down-dials
(`chad: 60`, `corporate_lawyer: 60`).

**One addition the dossier did not specify.** Five shipped abilities
(`billable_hours`, `forensic_audit`, `fiduciary_shield`, `whistleblower`,
`power_of_attorney`) appear in no lane's node list and in every lane's *cost*
list. Deleting them would have deleted content; leaving them untracked would
have left five cards with no column. They now form a fourth track, **GENERAL
PRACTICE** (8 points), re-parented onto starters so no General node dangles on
a lane purchase the player may never make. The three named lanes are still 9
points each and the dossier's 27-point arithmetic is unchanged; total demand is
35 + 12 ally points against 14.

**One node ordering the dossier's §2.3 got right and a naive implementation
gets wrong.** Track membership alone does not determine spend order, and
sorting by `tier` then `cost` put Audit's debuff ahead of its first attack —
measured at **15.3 pp** of win-rate spread on karen@3 against a ≤8 pp band. An
explicit `depth` field now carries §2.3's order, and both the Abilities tab and
the verification harness sort by it. With `depth` shipped the same cell reads
**3.2 pp**.

### 10.2 The harness question, and what replaced it

`_j-synth.mjs` / `_j-build-sim.mjs` measured the design by MONKEYPATCHING the
live engine. Against the shipped build those patches would double-apply on top
of the real implementation and measure something that does not exist —
`applyBuildPatches` would install a second Findings hook over the engine's own,
`installPivotTable` would re-rotate an already-rotating weakness, and
`Object.assign(PLAYER_ABILITIES, J_ABILITIES)` would overwrite the shipped rows
(dropping their `tier`, which is the builder trap §5.4 names).

`tools/_j-verify.mjs` is the replacement. It imports nothing from the J
harness; the trees are DERIVED from `PLAYER_ABILITIES[].track` / `.depth` so
they cannot drift from what the Abilities tab renders, the gate comes from the
shipped `TIER_LEVEL`, and the passives reach the engine through the same
`nodes` option `CombatState` uses in a real fight. Everything it wraps is
instrumentation.

**One thing it caught that the dossier's own tables did not.** `_j-synth`'s
`PIVOT_D3` table is keyed `rachel_boss`, and `PHASE_WEAKNESS` is looked up by
`enemy.enemyId`. The naming sweep renamed that enemy to `meredith_boss` before
this design was built, so **that row could no longer match anything** — every
Meredith pivot number in §2.1 was measured against a boss that did not pivot.
The shipped implementation puts the rows inside her own `phases[]` block, where
the id cannot drift from the data.

### 10.3 D3's Assert Dominance strip — NOT SHIPPED, and why

Per §7 D3, the strip (*Assert Dominance removes 70 % of maxComposure, power
unchanged at 75*) is **deferred, deliberately, and recorded here as a named
follow-up rather than quietly dropped**:

> It works. It also raises the casual floor by up to **13 pp on Meredith**
> (PIP 0 %: 23.8 → 36.8 %), because CASUAL is the one policy that actually
> fires the 100-Confidence tier. That is not a hard-constraint violation, but
> Run C tuned that floor to a documented band and a 13 pp move is not a
> rounding error. **Follow-up: ship the strip together with a PIP band
> re-tune, or not at all.**

The related finding stands and belongs with it: **the 100-Confidence tier is
not dead because it is unreachable — it is dead because it is a bad buy.** A
policy forced to save for it fires it 0.86–0.98 times a fight and *loses*
(`meredith_boss@9`: 99.7 % / 6.96 rounds / 81.9 % HP with greedy Press
Advantage, against 96.7 % / 10.88 / 62.0 % when saving).

### 10.4 Also deferred, with prices attached

- **The Regional Director's Revival.** His final `phases[]` row still reads
  `hpThreshold: 0` and therefore still never fires. Reviving it costs 13.7 pp
  on the CARRY@NG+2 lap; the recovery is repricing `synergy_blast` 25 → 16,
  which costs +1.5 rounds on the first run. A repricing pass, deferred with the
  Algorithm's.
- **The NG+ re-tune.** §6.5 is the largest unpaid bill in the design and the
  package does move it. `node tools/ng-sim.mjs --hpscale` / `--lapdecay` and
  `NG_PLUS_SCALING.atk` / `NG_PLUS_LAP.decay` are the knobs.
- **`Uc` costs the Audit lane more than anyone else** (§3.2). Accepted for this
  wave, unmeasured on the shipped build.

### 10.5 Measured on the shipped build

`node tools/_j-verify.mjs` (400–800 runs/cell) and
`node tools/_j-floor.mjs --diff before after` (800 runs/cell, a same-file A/B
against the pre-package tree):

| claim | dossier band | shipped |
|---|---|---|
| diversity band, worst rung | ≤ ~8.0 pp | **9.3 pp** (trio@7); 10 of 12 rungs ≤ 6.0 pp |
| `compOTH` non-zero, compliance + audit | required | **YES**, all 20 cells |
| Director / Compliance: weakness hits per fight | 0.96 | **0.79** |
| Director / Compliance: share of Break pressure off Bracing | 64 % | **67 %** |
| Grandma top-tag, shipped kit | 83.6 → 53.2 % | **50.3 %** |
| Director top-tag, shipped kit | 72.7 → 59.6 % | **66.0 %** |
| Meredith top-tag, shipped kit | 50.9 → 43.8 % | **41.3 %** |
| Karen / Algorithm top-tag (EXEMPT) | unchanged | **63.9 / 81.6 %** — unchanged |
| casual PIP floor, mean \|Δ\| over 21 cells | 1.72 pp, non-directional | **1.53 pp, 13 down / 8 up** |
| effective enemy turns under the turn-back | ≥ ~89 % | **88.8–100.6 %**; trio 88.8 (was 67.6 as an addition) |
| Reception, Compliance @L4 (D5's warning) | 78.6 % vs 91.0 % | **89.8 % vs 91.8 %** slot 0, **68.8 % vs 76.0 %** slot 3 |
