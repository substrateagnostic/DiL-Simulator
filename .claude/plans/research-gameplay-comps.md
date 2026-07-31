# GAMEPLAY COMPS RESEARCH — TRUST ISSUES
### Ranked comp shortlists, stealable mechanical patterns, and a candid gap audit
**Date:** 2026-07-29 · **Scope:** mechanics only (no visuals — see `art/COMP_CARD.md` for the visual comp card)
**Method:** four parallel research passes against developer interviews, GDC talks, design postmortems and
detailed mechanics wikis, favoring 2023–2026 titles. Every numeric claim below is sourced; claims that
could not be confirmed are marked **[UNVERIFIED]** and must not be repeated as fact.
**Code grounding:** all "current state" and gap claims were verified by reading
`src/combat/CombatEngine.js`, `src/data/stats.js`, `src/data/ClientGenerator.js`, `src/data/shop.js`,
`src/data/voices.js`, `src/states/MenuState.js`, `src/states/ClientReviewState.js`,
`src/states/ExplorationState.js`, and `src/data/rooms/index.js`.

---

## PART 0 — WHAT TRUST ISSUES ACTUALLY HAS (code-verified, July 2026)

> **Important:** `CLAUDE.md` materially understates the current build. Several ROADMAP "Part 2 / C1"
> items are already shipped. Any planning that starts from CLAUDE.md will re-propose existing features.
> This inventory is the real baseline.

**Combat (`CombatEngine.js`, 1249 lines) — already multi-combatant.**
- `allies[]` (allies[0] = Andrew) + `enemies[]`. AoE (`attack_aoe`) hits all alive enemies.
  Enemy aggro: 55% bias toward Andrew, otherwise lowest-HP-ratio ally (`_pickEnemyTarget`).
- Ally AI (`allyTurn`, `_pickAllyAbility`): rotation pattern, 65% heal-bias below 40% party HP,
  55% AoE-bias at 2+ enemies. Allies focus the lowest-HP enemy. 5 allies in `allies.js` (415 lines).
- **Voices / "Reasonable Doubt"** (`voices.js`, 205 lines) — 4 internal-monologue facets
  (Apprentice / Litigator / Skeptic / Witness), each with a contextual trigger, each granting ONE
  free action per fight (no MP, no turn cost). `voiceCounts` is persisted on Player and gates
  late-game dialogue. **This is the game's most original mechanic and it is under-exploited.**
- Momentum tiers: Press Advantage (SPD-scaled 15–25), Second Wind (50), Assert Dominance (100).
- Brace QTE (3 quality tiers: perfect 8 DEF/3t, good 5/2, miss 2/1 — perfect and good both halve
  the next hit and set `retaliateReady`). Retaliate QTE with **player-chosen length 3–6 keys →
  base multiplier 0.75×/1.0×/1.25×/1.5×**, final = base × (correct/total).
- Desperate Gamble (<25% HP): safe 1.0× / risky 60% for 1.5× else 0.5× / all_in 30% for 2.5× else 0.
- Weakness/resistance: 4 tags (`legal`/`social`/`audit`/`technical`), **24 of 26 enemies tagged**,
  1.5× / 0.7×. Vulnerability window after enemy Heal/Confuse (1.5×, consumed). Follow Through combo
  ×1.25 when the target has any active debuff.
- Boss phases with `phaseMessages` + `taunts`. 7 AI patterns. Telegraph pre-rolls for all enemies.
- **NG+ scaling exists in the engine**: ×1.4 maxHP, ×1.3 atk, ×1.2 def, ×1.25 xpReward (`_buildEnemy`).
- Evidence of metrics-driven balance in code comments (`healPerLevel` added because "a flat heal
  ceiling made any enemy sustaining ~45+/turn mathematically unwinnable"; boss silence capped at
  1 turn because "difficulty depended on party comp — 100% vs 22% at identical stats"). Good sign.

**Roguelite (`ClientGenerator.js`, 585 lines) — richer than documented.**
- 10 base client types + 5 post-game types. 10 positive / 10 negative attributes.
- **Combat mutators already exist**: `thorns` (Billable Hours — 4 HP per hit you land),
  `volatile` (Market Mood — ATK swings ±30%/turn), `compound` (Compound Interest — +2% maxHP/turn
  at ≥5M assets). Applied in `_calcDamage` and `processTurnStart`.
- HP variance ±30% at equal wealth tier. Level scaling +8%/level. 5% whale roll (100M–250M assets)
  with a `whale_referral_pending` follow-up. Crypto volatility (15% rug pull ×0.3 / 15% moon ×2.5).
- Beneficiary chains (3 clients, shared surname, accept/reject propagates).
- **Negotiate beat shipped** (`ClientReviewState._negotiate`, percentage shown on the button).
- **Personal bests shipped**: `pb_richest_client`, `pb_best_aum_single`, `pb_accept_streak`,
  surfaced in the Stats tab and carried through NG+.
- `bossAnger` 0–10, `portfolioClients` counter, `calculatePortfolioHealth` (score/grade A+–F).

**Content scale.** 26 rooms · 123 `dialogId` interactables (38 of them posters) · 40+ achievements ·
15 levels · 19 player abilities (5 starters, 8 upgrade-tree, 6 quest-unlocked) · 26 enemies ·
7 acts + Act 6½ + post-game.

**NG+ (`MenuState._startNewGamePlus`).** Carries AUM, `equipped`, `unlockedAbilities`,
`upgradePoints`, `questStates`, and flags prefixed `arcade_`/`bestiary_`/`pb_` plus cosmetic
unlock flags. Resets all story flags. Sets `ng_plus` + increments `ng_plus_count`.
**Nothing in the codebase reads `ng_plus_count`.** Two-press confirm. Enemies get the flat scale above.

---

## PART 1 — TURN-BASED COMBAT DEPTH & FEEL

### Ranked comp shortlist

| # | Game | Why it ranks here for TRUST ISSUES |
|---|------|-----------------------------------|
| **1** | **Sea of Stars** (2023, Sabotage) | The **Locks** system is the single most transferable mechanic in this entire report. TRUST ISSUES already has 4 damage tags and a telegraph — Locks is the missing 20 lines that turn both into a puzzle. Also the cheapest to build. |
| **2** | **Clair Obscur: Expedition 33** (2025, Sandfall) | Already the declared visual comp. Mechanically: the reactive-defense layer, the AP economy where basic attack *generates* resource, and per-character unique resources. Highest ceiling, highest cost. |
| **3** | **Honkai: Star Rail** (Toughness/Break) | Not glamorous, but it is the cleanest published math for "make weakness a visible bar instead of an invisible multiplier," including the 0.9× pre-Break damage tax. Pure UI+state work on systems TRUST ISSUES already has. |
| **4** | **Metaphor: ReFantazio** (2024, Atlus) | **Guard denies the enemy extra turns** — the cleanest inversion in the genre, and the answer to "how do I make defense not feel like a wasted turn." Plus Synthesis (2-icon co-op skills) maps directly onto the new ally system. |
| **5** | **Persona 5 Royal** (Baton Pass) | Baton Pass rank multipliers (+25/+50/+75%) are the model for making the *party* the combo engine. Showtime is the model for a comeback valve disguised as spectacle. |
| **6** | **SMT V / Vengeance** (Press Turn) | The risk economy — asymmetric, public, and the reason the icon row *is* the tension meter. Useful as the philosophical anchor even if the literal system is too punishing for a satire. |
| **7** | **Like a Dragon: Infinite Wealth** | Positional turn-based (proximity bonus, back attacks). Listed for completeness — wrong fit for a fixed-camera 1-screen combat stage. Skip. |

### Stealable patterns, ranked by (impact ÷ cost) for TRUST ISSUES

**P1.1 — LOCKS: make the telegraph name its own counter.** ★ top pick
> *Sea of Stars:* an incoming big attack shows a countdown **plus a row of colored lock icons naming
> the damage types required**. Break all locks → the attack is **cancelled and the enemy's turn is
> consumed**. Partial break only scales the damage down. Verified mechanic;
> the exact partial-reduction cap (~25–35%) is **[UNVERIFIED]** as an official figure.
> Sabotage's stated goal for timed hits generally: give players "a skill-based alternative to grinding."

**Map onto TRUST ISSUES:** `_getTelegraphHint()` already exists and already appends
`(VULNERABLE — hit for 1.5×!)`. Extend `telegraph()` to attach a `locks: ['legal','audit']` array
to heavy enemy abilities (power ≥ 25, or all boss phase-openers). Render as tag chips in the
existing telegraph row of `CombatHUD`. Hitting a lock's tag clears that chip. All clear before the
enemy turn → the ability fizzles. This converts the game's four tags from an *invisible multiplier
players may never notice* into **the central read of every turn**, and it retroactively justifies
carrying one ability per tag. It also makes the ability tree a legible shopping list rather than a
damage ladder. Cost: one field in `ENEMY_ABILITIES`, one array on the enemy, one HUD row that
already exists.

**P1.2 — A BREAK BAR: convert weakness from a multiplier into a meter.**
> *HSR:* Toughness is an enemy-only bar above HP, **30–540 in multiples of 30**, reduced **only by
> damage types the enemy is weak to**. While not Broken, **all incoming damage is ×0.9** — a visible,
> standing 10% tax that makes breaking feel like unlocking your real damage. On Break: a Break DMG
> instance (cannot crit), the enemy's **next action is delayed 25%**, plus a type-appropriate debuff.
> *E33:* stability fills passively from damage but **only specific flagged skills actually trigger
> the Break**; a Broken enemy is stunned ~1 turn and takes **+20% damage**.

**Map onto TRUST ISSUES:** rename it **Composure** (the enemy's, mirroring Andrew's DEF stat name)
or **Billable Patience**. Add `composure` / `maxComposure` to `_buildEnemy`. Only weakness-tag hits
reduce it. At zero: enemy loses its next turn (reuse the existing `silencedThisTurn` return path,
which already emits a clean "force-quit and loses the turn" message), takes +20% for a round, and
`vulnerable` fires. This subsumes and upgrades the existing `vulnerable` flag, which currently only
appears after enemy Heal/Confuse and is invisible until the hint text mentions it. Pair with the
0.9× pre-break tax **only if** you also raise base damage — otherwise it reads as a nerf.

**P1.3 — REWARD THE EXTRA ACTION, NOT THE BIGGER NUMBER.** ★ the load-bearing insight
> Convergent across every top comp: *SMT V* weakness/crit converts a full turn icon to a **half
> icon** (a correct read literally doubles your actions; a miss or a nulled element **costs 2 icons**;
> repel/drain **ends your phase outright**). *P5R* One More → extra action, or **Baton Pass** it to an
> ally for **+25%/+50%/+75%** damage at ranks 1/2/3 (rank 2 also restores HP, rank 3 HP+SP) and the
> buffs compound down the chain. *Metaphor* halves an icon on weakness/crit; **Synthesis** skills cost
> 2 icons. *E33* **Gradient Attacks cost no AP and do not end your turn** — they slot *between* actions
> (every 1 AP spent fills 5%; 20 AP = 1 Charge; max 3). *SMT V* Magatsuhi skills likewise **cost no
> Press Turn icon and don't pass control**, and all offensive ones have guaranteed accuracy.

**Map onto TRUST ISSUES:** the momentum bar currently spends into damage (Press Advantage),
sustain (Second Wind), and more damage (Assert Dominance). **Not one tier grants agency.** Two cheap
fixes: (a) make **Press Advantage not end the turn** at a higher momentum cost — it becomes the
Gradient Attack analogue and instantly makes momentum feel like tempo rather than a damage battery;
(b) add a **Baton Pass** equivalent now that allies exist: hitting a weakness lets Andrew hand the
turn to an ally with a stacking damage buff. Thematically perfect for an office satire — call it
**"Loop In"** or **"Delegate"**. `allyTurn()` already exists and is already driven from `CombatState`.

**P1.4 — GUARD DENIES THE ENEMY, NOT JUST YOU.**
> *Metaphor:* **Guarding prevents enemies from hitting your weaknesses**, i.e. it denies *them* the
> extra turn. The only defensive action in the comp set that is offensive in effect.

**Map onto TRUST ISSUES:** Brace currently costs Andrew his whole turn to halve one hit and arm
Retaliate. That is a bad trade at high HP and players will learn to skip it. Give a **perfect** Brace
a second effect that *takes something from the enemy*: cancel the telegraphed ability's debuff
component, or strip one enemy buff, or (best) **reduce enemy Composure** so Bracing is a Break route.
That single change converts Brace from a damage-mitigation tax into a tempo play.

**P1.5 — PER-CHARACTER UNIQUE RESOURCES (now that allies exist).**
> *E33* is the reference: **Gustave** Overcharge (+1/hit, max 10, becomes a 2-hit combo at 10);
> **Lune** 4 elemental Stains that skills both generate and consume; **Maelle** four Stances
> (Defensive −50% taken / Offensive +50% dealt & taken / **Virtuose +200% dealt**), **switching stance
> grants 1 AP**, and ending a turn without switching drops her to Stanceless — a constant upkeep tax;
> **Sciel** Foretell (max 10; Sun charge = +1 AP per charge consumed, Moon = +1 AP per charge placed;
> 1 Sun + 1 Moon at turn start → **Twilight for 2 turns**, Foretell doubled, +25% damage per charge
> consumed); **Verso** ranks **D→C→B→A→S**, climbing on damage dealt and on parry/dodge, **losing rank
> on being hit** (exact thresholds **[UNVERIFIED]**); **Monoco** a 9-position Bestial Wheel and no
> skill tree at all — he learns from enemy drops.
> **The design lesson, stated across all six:** a universal resource *plus* a character-unique
> resource is what makes swapping party members feel like swapping games.

**Map onto TRUST ISSUES:** `allies.js` currently gives each of the five allies stats + an ability
rotation, which means the party is a stat block, not a set of playstyles. One resource each,
office-flavored: **Janet** a Grudge counter (+1 per turn an ally is hit, spends for scaling damage);
**Diane** Rapport (banked by not acting, cashed as a party heal — the receptionist who was paying
attention); **Isaiah** a Paper Trail stack (each documented enemy action adds a stack, consumed for
guaranteed Break); **Alex IT** an Uptime meter (drains, must be maintained, grants free actions
while up); **the Janitor** Seniority (grows every round he survives — he does nothing early and
becomes unanswerable late). This is the highest-ceiling item in Part 1 and the most writing-adjacent,
which is where this project's comparative advantage lies.

**P1.6 — FORGIVENESS SHIPS AS LOOT WITH TRADEOFFS, NEVER AS A SHAME SLIDER.**
> *Sea of Stars Relics* — unlimited simultaneous use, each a *collectible with a tradeoff*:
> *Amulet of Storytelling* (full heal after every fight), *Sixth Sense* (**widens the timed-block
> window**), *Sequent Flare* (clearer timing confirmation), *Guardian Aura* (**−30% damage taken**),
> *Adamant Shard* (guarantees lock-breaking extra hits but **−50% timing bonus damage**),
> *Truestrike Pendant* (removes the **20% resistance** enemies otherwise gain).
> *E33*: parry/dodge windows widen or narrow **by difficulty setting** — Sandfall's balance intent is
> that parrying everything is deliberately too hard and **dodging is the load-bearing defense on Hard**.
> *Tunic* ships **No Fail Mode** and Shouldice's position is blunt: including it "does not 'compromise
> the integrity' of the game."
> *Hades* **God Mode**: +20% damage resistance, **+2% per subsequent death, capped at 80%**, locking
> out **zero** achievements or content. Kasavin: *"What if we just make you a little bit tougher?"*

**Map onto TRUST ISSUES:** the cosmetics system is already an equip-slot system with stat bonuses —
it is a Relic system wearing a different hat. Add QTE-window widening as a *cosmetic* bonus
(e.g. "Ergonomic Wrist Rest: +40% Brace window, −20% Retaliate damage"). Zero new UI. And a
God-Mode analogue is nearly free given `player.deaths` is already tracked: **"Performance
Improvement Plan — +2% Composure per recorded death"**, satirically perfect, no content lockout.

**P1.7 — SANDFALL'S FIRST PRINCIPLE: NO FRUSTRATING DEATHS.** (design constraint, not a mechanic)
> Broche: "the reason why dying feels frustrating in typical turn-based RPGs is because luck is often
> involved… the boss might just attack the wrong character and there's nothing the player can do, or
> the boss has a random behavior pattern that's impossible to counter." The premise was
> **"no frustrating deaths"** and **"a game you can clear without taking a single hit"** — every attack
> in the game is avoidable. Deaths must be attributable to misreading a *learnable* pattern.

**Audit TRUST ISSUES against this and two things fail.** (1) **Confuse.** `_maybeConfuseActor` gives
a **50% chance the player's chosen action instead hits themselves.** That is precisely the failure
mode Broche named — RNG that steals a turn you cannot plan around. It is already mitigated by a
3-turn cooldown, but the fix is to make it *readable*: telegraph "your next action may backfire"
and let Brace or an item clear it, so it becomes a decision instead of a dice roll.
(2) **Desperate Gamble `all_in`** is **30% for 2.5×**, expected value **0.75×** — strictly worse than
`safe`. It has an achievement attached, so players are being taught to take a mathematically bad
bet. Either raise it to ≥40% (EV 1.0×) or give the failure case a consolation (full momentum, or
guaranteed Break) so the variance is the thrill rather than the punishment.

---

## PART 2 — ROGUELITE LOOP ECONOMICS

### Ranked comp shortlist

| # | Game | Why it ranks here for TRUST ISSUES |
|---|------|-----------------------------------|
| **1** | **Hades I / II** (Supergiant) | The currency-scope split and "every run banks something" are the two structural fixes TRUST ISSUES needs most. Also: narrative as an unbounded, non-inflationary reward currency — and this project's strength is writing. |
| **2** | **Balatro** (2024, LocalThunk) | Two lessons: **superexponential requirement against flat costs**, and **bosses that break a rule instead of raising a stat**. The mutator system is already the seed of the second. Also the anti-dark-pattern values anchor. |
| **3** | **Slay the Spire** (Mega Crit) | **Ascension** is the template for player-authored difficulty done *subtractively*, and Intents are the legibility standard TRUST ISSUES' telegraph already half-implements. Metrics-driven balance is already this project's method. |
| **4** | **Vampire Survivors** (poncle) | Two lessons: **the hard clock** (a run ends on its own), and **100% free respec**. Also the three-condition evolution rule as a model for "a plan the player executes." |
| **5** | **Dead Cells** (Motion Twin) | Only for the daily-challenge design argument (see Part 4). |

### Stealable patterns

**P2.1 — SPLIT THE CURRENCY LEDGER BY SCOPE. THE SCARCEST TIER MUST BE SKILL-GATED, NOT TIME-GATED.** ★ top pick
> *Hades I* runs exactly two run-scoped currencies (**Obols**, lost on death; **Centaur Hearts**,
> +25 HP per chamber / +50 from Erebus / 125 Obols at shop) against six meta-scoped ones
> (**Darkness**, **Chthonic Keys** — 24 for all weapons, ~65 to fully open the Mirror — **Gemstones**,
> **Nectar**, and the three **bounty-only** currencies **Diamonds / Ambrosia / Titan Blood**, which are
> obtainable *only* from Heat-gated boss kills). *Hades II* adds **Bones** as a universal trade base
> at the Wretched Broker (Gemstones → Keys → Nectar → Diamonds → Ambrosia → Titan Blood), which exists
> specifically to keep surplus meaningful and stop unattended grinding from being optimal play.
> **Why it works:** run currency creates in-run pressure with no long-term loss anxiety; meta currency
> guarantees every death banks something; and making the top tier skill-gated is the single decision
> that stops the meta layer from being grindable.

**Map onto TRUST ISSUES — and this is the biggest structural gap in the game.** *There is currently
no run.* The reception loop is a single-encounter loop: fight → accept/decline → repeat, with one
permanent currency (AUM). Nothing is ever lost, nothing accumulates within a session, and nothing
escalates. Proposal: **The Billable Day.** Talking to Diane starts a *day* of 3–5 escalating clients.
Introduce a run-scoped currency — **Billable Hours** — earned per fight and spent *between clients
within the day* on temporary buffs, a heal, an extra consumable, or a reroll of the next client.
Unspent Hours are lost at end of day. AUM remains the meta currency and is only banked when the day
closes (or is forfeited if Andrew is defeated mid-day — the risk that makes the escalation matter).
Then gate the scarcest reward — renovation funding, or an ally's personal mission — behind
**Overtime tiers** (see P2.3) rather than behind raw AUM totals. Everything needed already exists:
the client generator, mutators, `bossAnger`, `portfolioClients`, personal bests.

**P2.2 — ESCALATE THE REQUIREMENT SUPEREXPONENTIALLY WHILE HOLDING COSTS FLAT.**
> *Balatro:* White-stake base chip requirements **A1 300 · A2 800 · A3 2,000 · A4 5,000 · A5 11,000 ·
> A6 20,000 · A7 35,000 · A8 50,000** (then Endless: A9 110,000 · A10 560,000 · A11 7.2M · A12 300M).
> Meanwhile **shop prices are flat all run**: Jokers $1–10 ($20 Legendary), Tarot/Planet $3,
> Spectral $4, playing card $1, Voucher $10, packs $4/$6/$8. **Interest is +$1 per $5 held, capped at
> $5/round** (>$25 earns nothing), and **reroll starts at $5 and climbs +$1 per reroll**, resetting
> each shop. Scoring is **chips × mult** — two independent dials, so raising both linearly (Planet
> cards: e.g. Four of a Kind +30 chips/+3 mult per level) yields **quadratic** growth; true
> exponentials need a multiplicative *rate* (Baseball Card 1.5, Triboulet 2, retriggers).
> Matt Greer's analysis: *"almost all scaling in Balatro is quadratic… with exponential growth, the
> variable is the exponent, instead of the base."* Joker slots evaluate **left→right**, so ×Mult must
> sit right of +Mult: `40 × ((4+4)×2) = 640` vs `40 × ((4×2)+4) = 480` — distributivity turns slot
> order into a real decision with **zero new UI**.
> **Why it works:** the gentle curve through Ante 8 lets quadratic builds win; the flat cost curve
> means **the same $6 purchase has wildly different expected value at Ante 2 vs Ante 6**, so the shop
> becomes a *timing* puzzle and no single mechanism ever solves the game.

**Map onto TRUST ISSUES — the current economy has this exactly backwards.** Income is
superexponential (a 5% whale roll at 250M assets pays **2,500,000 AUM** — one client), while costs
are flat-to-mildly-escalating (consumables 2.5K–9K, stat upgrades 500K × (1+timesBought),
renovations a flat 5M). Result: the economy solves itself, the "AUM Millionaire" achievement is
trivially reached, and the 45M total renovation cost is not a challenge curve — it is a wait.
Fixes, cheapest first: (a) invert the shape — hold prices flat and make the *requirement* escalate
(day N requires clearing a client of tier N); (b) add an interest-cap analogue so hoarding AUM past
a threshold stops paying, forcing spend-vs-save decisions; (c) if `pb_accept_streak` is going to be
tracked, make it *pay* — streaks are the natural multiplier dial in a game about a book of business.

**P2.3 — PLAYER-AUTHORED DIFFICULTY, GATED TO REWARD, ESCALATING IN ONE-BITE STEPS.** ★ top pick
> *Hades* **Pact of Punishment**: 15 modifiers, graded ranks, each with a Heat value — Hard Labor
> (5 ranks × 1 Heat, +20% enemy damage each), Lasting Consequences (4 × 1, −25% healing each),
> Jury Summons (3 × 1, +20% enemies), Forced Overtime (2 × 3, +20% enemy speed), Routine Inspection
> (4 × 2, **deactivates 3 Mirror talents per rank**), Approval Process (2, **−1 boon choice**),
> Tight Deadline (2, **−2:00 region timer**). **Bounties are tracked per weapon**; each +1 Heat
> re-opens Titan Blood / Diamonds / Ambrosia; the ladder caps at **20 Heat**, ~21 clears per weapon.
> **Heat resets to zero when you switch weapons**, forcing lateral exploration over vertical grinding.
> Raising Heat by more than 1 at a time **forfeits the lower tiers** — a self-enforcing "go slow"
> incentive that stretches content with no timer.
> *Hades II* **Oath of the Unseen / Fear**: 16–17 Vows (Pain +20/60/100% enemy damage; Time
> 9:00/7:00/5:00 region timer; **Void 60/40/20/0% Arcana Grasp access** — the meta system itself
> becomes the difficulty dial; **Forfeit** turns your first boon per region into a Red Onion;
> **Denial** removes 2 unpicked blessings). **Testaments fire at 1, 2, 4, 8, 12, 16, 20, 24 Fear**
> (non-linear, with random boss reassignment, defeating rote farming); max Fear **67**.
> *Slay the Spire* **Ascension — 20 cumulative tiers, per character, and losing never resets
> progress.** Note the shape: it is almost entirely **subtractive** — A5 heal only 75% of missing HP
> after bosses · A10 start with the Ascender's Bane curse · **A11 −1 potion slot** · A12 upgraded
> cards 50% rarer in Acts 2–3 · A13 bosses drop 25% less gold · A15 events skew negative ·
> A16 shops +10% · **A20 double boss at the end of Act 3.** It strips resources, information and
> safety margin rather than inflating enemy numbers, and each tier is one bite.
> *Vampire Survivors* prices difficulty in currency: **Curse** (+50% ×5 ranks) raises enemy speed,
> HP, per-wave quantity and spawn rate — and players *want* it because more enemies is more XP and
> more spectacle. **Hyper** +50% gold, **Hurry** 2× clock and +25% XP.

**Map onto TRUST ISSUES:** there is currently **zero** player-authored difficulty. This is the
single largest replay lever available and it costs almost nothing to build, because the game already
has a satirical frame that fits it perfectly: **the Performance Review / Stretch Goals.** Diane (or
Ross) offers stackable "stretch goals" before a Billable Day, each worth *Review Points*:
"Skip Lunch" (no items), "Open-Door Policy" (−1 ability slot), "Aggressive Timeline" (enemies act
first), "Cost Center" (no shop between clients), "Matrixed Reporting" (allies act on rotation you
don't control). Keep it **subtractive** like Ascension, gate the top-tier reward (renovation
funding, ally missions, cosmetics) behind Review Point tiers, and **never reset progress on a loss**.
The existing Retaliate length-selection (3–6 keys → 0.75×–1.5×) and Desperate Gamble risk menu prove
the team already knows how to build player-priced risk — this is the same idea one level up.

**P2.4 — BOSSES SHOULD BREAK A RULE, NOT RAISE A STAT.** ★ cheapest big win
> *Balatro* Boss Blinds — 23 regular + 5 Showdown, sorted by what they attack:
> **score-warping** (The Wall 4×, Violet Vessel 6×, The Needle 1× but **only one hand**, The Flint
> halves base Chips *and* Mult); **resource theft** (The Water **0 discards**, The Manacle **−1 hand
> size**, The Hook discards 2 held cards per hand, The Serpent always draw exactly 3, The Ox **sets
> money to $0** if you play your most-played hand); **information denial** (The House, The Fish,
> The Wheel, The Mark — cards drawn face down); **build-breakers** (The Psychic must play 5 cards,
> The Eye no repeat hand types, The Mouth **one hand type all round**, The Arm **permanently −1
> level** to the played hand); **Showdowns** (Amber Acorn flips and shuffles your Jokers, Verdant
> Leaf debuffs everything **until you sell a Joker**, Crimson Heart disables a random Joker each hand,
> Cerulean Bell forces one card always selected). Counterplay is *purchasable* — the Director's Cut /
> Retcon voucher rerolls the boss — rather than luck.
> **Why it works:** the boss attacks **the assumption the build rests on**. It is a legibility test of
> your own engine, and it is the mechanic that makes players say "I know exactly why I lost."
> *Balatro Stakes* apply the same logic to the meta on three orthogonal axes: math (Green/Purple
> scale faster — Green A8 = 100,000 vs White 50,000), resources (Red: Small Blind gives no money;
> Blue: −1 discard), and **build permanence** (Black **30% Eternal** — can't sell or destroy;
> Orange **30% Perishable** — debuffed after 5 rounds; Gold **30% Rental** — $1 to buy, **−$3 every
> round end**). The stickers are the clever move: they attack the player's ability to *edit* the build.

**Map onto TRUST ISSUES:** the `mutators` system in `ClientGenerator` is already this mechanic in
embryo — but all three current mutators are *additive* (thorns adds chip damage, volatile adds ATK
variance, compound adds regen). Not one takes anything away. Add subtractive mutators and the
reception loop stops being a stat check: **"Under NDA"** (telegraph hidden this fight), **"Retained
Counsel"** (your `legal` abilities are disabled — forces tag diversity), **"Expense Freeze"** (no
items), **"Escalation Clause"** (Andrew's momentum decays 10/turn), **"Conflict of Interest"**
(one ally refuses to act). Each is 3–10 lines against systems already in `CombatEngine`, and each
generates the "I know exactly why I lost" legibility that separates a mastery loop from a grind.
This is the highest impact-per-hour item in the entire report.

**P2.5 — MAKE RESPEC FREE OR NEAR-FREE.**
> *Hades* Mirror of Night: each talent line is two mutually exclusive options (Red available at
> unlock, Green unlocked once at **300 Darkness** via Nyx); once both are funded, **swapping is free
> and unlimited**, and a **full refund of all Darkness costs 1 Chthonic Key** with no other penalty.
> Slots gate at 5/10/20/30 Keys; rank costs escalate steeply (Death Defiance 30/500/1000 = 1,530
> Darkness; Fated Authority 8 ranks ≈ 11,000). *Hades II* **Grasp** is a budget, not a tree: Psyche
> raises it **10 → 29**, cards cost 0–5 Grasp each, and the Altar stores **6 saved loadouts** — so the
> meta layer becomes a loadout puzzle. *Vampire Survivors* PowerUps refund **100% of gold with no
> penalty** (added Jan 2022), and maxed PowerUps can be individually **disabled** without a refund.
> **Why it works:** experimentation volume is a function of the cost of being wrong.

**Map onto TRUST ISSUES:** `upgradePoints` spent on the `PLAYER_ABILITIES` tier tree are currently
permanent, and the tree has hard prerequisites (`requires`). With 19 abilities and 6 tags/roles, a
player who spends into the wrong branch is stuck. Add a free respec at the Break Room shop (or, more
in voice, an **HR-mandated "Skills Reassessment"** — free, unlimited, with Diane sighing about it).
Roughly 20 lines. Also expose reroll-of-choice as a meta purchase, following Hades' Fated Authority
(~250 Darkness/rank, one boon reroll per rank) — **meta progression that buys agency over RNG rather
than raw power is the least inflationary form there is.**

**P2.6 — A HARD CLOCK: LET THE RUN END BY ITSELF.**
> *Vampire Survivors:* most stages cap at **30:00** (Il Molise and Moongolow **15:00**; Whiteout and
> Space 54 **20:00** — the cap is per-stage, not universal). At the limit a **Reaper** spawns:
> **65,535 damage, 655,350 HP × player level**, plus another Reaper every subsequent minute.
> **Why it works:** a hard clock makes "the build clicks" a *scheduled climax* and guarantees the
> session ends on its own — the structural opposite of an engagement treadmill.
> Run-length reference band (all **[UNVERIFIED]** as designer intent; press/community figures):
> Hades ~20–45 min · Slay the Spire 45–70 min (55–90 with Act 4) · Balatro 24 rounds max ·
> Risk of Rain 2 ~15 min/loop. **Returnal is the negative control** — runs "upwards of two hours"
> with no mid-run save until Patch 2.0 added Suspend Cycle. A run longer than a session makes death a
> punishment for *scheduling*, not for play.

**Map onto TRUST ISSUES:** the Billable Day (P2.1) should be **3–5 clients, 10–15 minutes**, with the
end of the workday as the diegetic Reaper. "It's 5:15. The 5:15 runs on time." (The game already has
a 5:15 bus quest — the metaphor is sitting right there.)

**P2.7 — "EVERY RUN BANKS SOMETHING," AND NARRATIVE IS THE CHEAPEST THING TO BANK.** ★ best fit for this project
> Kasavin: *"It was an explicit goal of our early development, to take the pain out of dying and
> having to restart."* · *"The moment of death isn't about rage-quitting. You have to be compelled to
> explore further and feel the time you spent wasn't a waste of your time."* · *"Reactivity has always
> been a goal of our narrative design, to have those moments where you feel the game is paying
> attention."* · *"Before any of it repeats, you would have to have looped through the game like 20 or
> 30 times."* Scale: Hades ships **21,020 voiced lines / 305,433 words**; Hades II **~30,000 lines /
> 400,000+ words**. Implementation is a **weighted priority queue of pre-written events keyed to game
> state** (e.g. HP thresholds) — procedural but not generated.
> **Why it works:** narrative is an **unbounded, non-inflationary reward currency**. It can be granted
> on every single run, win or lose, without touching balance. The guarantee is per-*run*, not per-*win*:
> every attempt must bank at least one of currency, narrative, or knowledge.

**Map onto TRUST ISSUES — this is the pattern the project is best positioned to exploit, and it is
already half-built.** `voiceCounts` is persisted on Player and the four Voices already have
state-keyed triggers. That is a weighted event queue in miniature. Extend it: give each Voice a bank
of 15–30 lines keyed to run state (`bossAnger`, `portfolioClients`, accept streak, deaths, which
client type, whether Andrew declined the last three), and fire one per client. Add a "reactive
coworker" pass — Janet comments on the accept streak, Diane on `bossAnger`, Isaiah on the richest
client landed. This costs writing, which is this project's comparative advantage, and it costs
**zero balance risk**. It is also the honest answer to "why would anyone fight a 40th reception
client": not for AUM, but because the building keeps talking.

**P2.8 — THE ANTI-DARK-PATTERN POSITION (values anchor, worth stating in the game's own docs).**
> *LocalThunk:* *"The honest reason I don't have microtransactions/season pass/ads/100 DLCs/etc in
> Balatro isn't just about the ethics of those practices but because when I play other games that have
> those things it makes me want to put my computer in the dishwasher and set it to pots & pans."* ·
> *"Gambling to me, it preys on a misunderstanding of probabilities. I think it's very predatory to
> hijack people's brains to make money off them."* · *"My game is very math-y and statistics heavy, and
> if you understand probabilities, will probably do better in the game."* He wrote into his **will**
> that the Balatro IP may never be sold or licensed to a gambling company.
> *Mega Crit:* the devs are self-described *"microtransaction haters"*; no MTX in StS2 *"now or in the
> future,"* because *"we want players to experience all of the same content as discussion of game
> content and balance is sort of our lifeblood."*
> *Galante (Vampire Survivors):* *"I like to treat players like adults and let them make the decisions
> of how much they want to play."* · on price, *"It wasn't priced in a smart way, it was priced in a
> fair way."* Poncle self-ported to mobile after failing to find a studio that would skip an
> *"oppressive monetization scheme"*; mobile ads are **opt-in only**, exchanged for in-game bonuses.
> **The academic line:** Zagal, Björk & Lewis (FDG 2013) name the two relevant dark patterns —
> **Grinding** (repeated tasks that "cheat" a player of time, sometimes performable *"completely
> unattended"*) and **Playing by Appointment** (habit-building via loss aversion). Madigan's finding
> is that loot randomness is *"more neutral than positive or negative"* and the *"clearly problematic
> areas"* appear when **money exchanges** enter. **The ethical line is monetized uncertainty, not
> uncertainty** — slot-machine *feel* without slot-machine *extraction* is legitimate design space.
> Self-determination theory (Ryan, Rigby & Przybylski 2006) adds the positive frame: competence,
> autonomy and relatedness each independently predict enjoyment **and** higher post-play vitality.
> Player-authored difficulty satisfies autonomy *and* competence at once; streaks and login rewards
> satisfy neither — they substitute scheduling compliance for competence.
> Daniel Cook's mechanical test: a loop is model → action → system → feedback → updated model;
> *"an arc is a broken loop you exit immediately,"* and loops only support mastery when they have
> *"crisply defined cause and effect"* and *"functional feedback that helps players understand
> causation."* **If feedback doesn't update the player's mental model, you have a compulsion loop, not
> a learning loop — regardless of how it's monetized.**

**Map onto TRUST ISSUES:** one honest flag. **The 45M AUM renovation wall is a Grinding dark
pattern by Zagal's definition** — it is time, not skill, and the +2,000 XP per renovation is inert
at the level 15 cap. Either re-price it against the Billable Day economy, gate it behind Review
Point tiers (P2.3), or convert renovations into *rewards for player-authored difficulty* rather than
purchases. Given the game is satire about extractive finance, shipping a grind wall is a tonal
own-goal as well as a design one.

---

## PART 3 — EXPLORATION / INTERACTIVITY DENSITY

### Ranked comp shortlist

| # | Game | Why it ranks here for TRUST ISSUES |
|---|------|-----------------------------------|
| **1** | **Animal Well** (2024, Billy Basso) | 256 rooms by hard cap, then everything spent on per-room depth. TRUST ISSUES is at 26 rooms — the exact right position to apply this. Also the three-audience layering model. |
| **2** | **Tunic** (2022, Andrew Shouldice) | Knowledge as the unlock. The Golden Path (a meta-puzzle assembled from half the collectibles) is the direct answer to TRUST ISSUES' 38 single-verb posters. |
| **3** | **Outer Wilds** | The only comp with a published three-tier access model and an explicit Ship Log rule. Best framework for auditing what a room is *for*. |
| **4** | **Link's Awakening** (1993/2019) | Tiered collectible payout, closed hiding-verb grammar, and — crucially — the Chamber Dungeon *failure* that proves room-atomic content can't carry map-scale meaning. |
| **5** | **Lorelei and the Laser Eyes** (2024) | The clue-distance hierarchy: the single best published answer to "how do I make backtracking feel good." |
| **6** | **Void Stranger** (2023) | Progression by recontextualization — the same 200 floors compress from hours to minutes as knowledge accumulates. |

### Stealable patterns

**P3.1 — CAP THE ROOM COUNT, THEN SPEND EVERYTHING ON PER-ROOM DEPTH.** ★ framing pattern
> *Animal Well:* the map is a **16×16 grid = exactly 256 rooms**, one screen at a time, with Pac-Man
> edge wrap-around. Basso: *"I couldn't create any more because every room had a one-byte ID to it, so
> it only had 256 possible values"* — and the payoff: **"I just focused on making every room as dense
> as possible. It was kind of a fun constraint."** 33MB, custom C++ engine, ~7 years part-time.
> *Link's Awakening* is the same story from the other end: the overworld is a **16×16 grid of 10×8-tile
> screens**, and screens are grouped into **2×2 blocks sharing one tileset ID** because VRAM cannot swap
> tiles mid-transition — so Nintendo inserted tileset `0x0F` ("keep current") **"memory airlocks"**.
> **The cliffs and walls that make Koholint a labyrinth exist because the hardware demanded them.**
> **Why it works:** a hard cap on *count* forces investment in *depth*, and constrains adjacency into
> readable regional identity for free.

**Map onto TRUST ISSUES:** 26 rooms is already the right number — it sits in the Animal Well /
Lorelei band and it should be **declared frozen**. The gap is depth per room. Current density is
**123 `dialogId` interactables across 26 rooms ≈ 4.7/room, and 38 of those 123 are posters**, leaving
~3.3 non-poster interactables per room. Freeze the room count publicly (in ROADMAP), and redirect
all content budget to per-room interactables and cross-room dependencies.

**P3.2 — AUTHOR EVERY SPACE AT THREE ACCESS TIERS SIMULTANEOUSLY.** ★ top pick (audit tool)
> *Outer Wilds* (Kelsey Beachum, GDC 2021 — note the attribution split: GDC 2020
> "Curiosity-Driven Exploration" was Alex Beachum + Loan Verneau) publishes the model explicitly:
> **Surface-level** (literally on planet surfaces; job = make you curious) → **Mid-level** (found by
> following clues; fine if hit accidentally; job = advance a thread *and* point to more) →
> **Hidden** ("extremely unlikely to find by accident… a player needs specific info to get to"), with
> the hard rule: **"Answers to mysteries are always at this level."** Access difficulty replaces the lock.
> *Basso* independently arrives at the same shape: **"There's three layers to the game, and I'm always
> designing the game for three different people at any given point"** — Layer 1 the completable
> metroidvania, Layer 2 secret areas + the **64 eggs**, Layer 3 *community* puzzles built to
> "incentivize collaboration… while keeping a sense of mystery no matter how far you've dug."
> Layer 3 in practice: **16 Secret Bunnies**, the BDTP cipher, and a **50-piece bunny mural where each
> save file receives exactly one random piece after 32 eggs** — structurally unsolvable alone.
> Basso's rationale for burying deep: **"no matter what you put in a game, it will get found."**
> *Deus Ex: Mankind Divided* (Clemence Maurer, GDC 2017) is the AAA version: Prague's density is a
> three-layer stack of environmental storytelling + traditional readables + pure LD-driven navigation,
> "not strictly tied to the critical path or any side mission, but essential in making the world
> coherent."

**Map onto TRUST ISSUES:** use this as an audit pass over all 26 rooms. Right now nearly everything
is **mid-tier**: quest interactables at published coordinates, findable by walking into them. There
is essentially no *hidden* tier — nothing that requires the player to know something specific — and
the surface tier (ambient objects that provoke curiosity without rewarding) is thin because objects
without a `dialogId` are inert. Cheapest fix for the surface tier: give every furniture type a
one-line Andrew observation (`thoughts.js` already exists for rooms; extend the pattern to objects).
Cheapest fix for the hidden tier: see P3.3.

**P3.3 — GATE ON COMPREHENSION, NOT ON INVENTORY.** ★ top pick
> *Tunic:* the manual is the progression system — **56 pages, 28 collectible sheets**, structured as a
> curriculum (pp.9–16 core mechanics, 17–24 equipment, 25–42 regional guides, **43–51 advanced secrets
> with Holy Cross introduced on 43–44**, 52–54 reference). Shouldice: **"A full-screen tutorial popup
> feels deeply invasive and can ruin any sense of wonder, but getting to study a mysterious page feels
> like mystery-solving."** And on trust: *"People like to experiment and love when they make discoveries
> via that experimentation… they are more likely to internalize and 'own' their discoveries."*
> Verified structural fact: **every Sealed Door in Tunic is openable from minute one** if you know its
> D-pad pattern. *"Most of Tunic's 'unlocks' are actually the acquisition of knowledge."* The late-game
> secret sword behind a Holy Cross door in West Garden is a deliberate tell — redundant on a first run,
> but it "implicitly proclaims the possibility of getting to the west gate immediately from the
> beginning." (The "skip 90% of the game" figure is **[UNVERIFIED]**; the verified weaker form is that
> the world is "filled with angles for sequence breaking," with named skips in Any% NMG routes.)
> *Outer Wilds:* **"Knowledge is the only gameplay reward" / "It's also how you progress"** — the deck
> explicitly enumerates what is *excluded* to protect that: no XP, no new abilities, no items, no
> upgrades, **no newly-unlocked play areas**, no collectibles, no scores. **"Zero gating = no funnel
> points."** Beachum on replay's limit, honestly: *"once you know the thing, now you can't ever do it
> again and have the same feeling… unless we 'Eternal Sunshine' people."*
> *Void Stranger:* **~200 single-screen floors** where "the entire floor is always visible" — all
> difficulty legible but unsolved. Progression is **recontextualization, not addition**: the same 200
> floors compress from hours to minutes as knowledge and shortcuts accumulate.
> *Lorelei:* solutions **randomize per playthrough** — *"We think it's interesting if players need to
> understand the puzzles, even if they are looking at guides."*

**Map onto TRUST ISSUES:** every gate in the game is currently a **flag** gate — the `gatedRooms`
table, `condition: { flag, notFlag }` on NPCs, `has_archive_password`, `vault_code_1`. The player is
never asked to *know* anything; the game checks whether a flag was set. But the raw material for
knowledge-gating is already present and wasted: **the vault code, the Morse code at Rack C, the
compliance crossword, the janitor's riddles.** Convert at least one from flag-gate to comprehension-
gate — the vault is the obvious candidate. Let the player **type the code into the vault keypad at
any point in the game**, from Act 1 onward, and open it. A second-time player, or an attentive
first-timer who read the right note early, walks into the vault in Act 2 and the game acknowledges
it. That is the entire Tunic payoff ("I could have done that the whole time!") for the cost of one
input field and one early-branch dialog. It also converts NG+ from a stat multiplier into a genuinely
different playthrough (see P4.1).

**P3.4 — SIGNPOST WITH A CLOSED GRAMMAR OF TELLS, TAUGHT EARLY.**
> *Link's Awakening* hides Secret Seashells in a small, learnable vocabulary of affordances: chests,
> under rocks, in tall grass, dig spots, underwater, and **trees that drop them when Pegasus-dashed**.
> A closed set of hiding verbs makes hunting fair — the player learns the grammar, not the map.
> *Animal Well:* **UV paintings of an egg mark rooms containing a hidden egg**, visible only under the
> UV lantern — a secret that reveals secrets. The Remote highlights nearby chests.
> *Void Stranger:* **"each [hidden chamber] is shortly preceded by a brand room with the exact right
> set up to draw the brand depicted by that mural"** — the game plants the material for the secret
> adjacent to the secret, then trusts you to notice.
> *Rayman Legends* (Stanislav Costiuc) is the best-quantified framework: three hint channels —
> (1) **level-design cues** (foliage/foreground occlusion, lure enemies, lighting shifts, breakables at
> screen edge), (2) **audio proximity** ("whenever we're not far from a captured teensie… we hear cries
> for help"), (3) **UI spatialization** (icons positioned by location so the player knows *where* the
> gap is, converting frustration into precision hunting). Fairness comes from **teaching the secret
> grammar across the first two levels**. Scale: **700 teensies, 10 or 3 per level, "at least half" in
> secret areas.**
> *BotW* (Fujibayashi/Takizawa, GDC 2017) is the terrain version: the **Triangle Rule** — large
> triangles = landmarks, medium = deliberate sightline occlusion so reveals surprise, small = tempo.
> **This is the "feel a secret before you find it" mechanism — signposting via terrain, not icons.**
> Fujibayashi's **multiplicative design** is the general principle: *additive* content (N handmade
> things) versus *multiplicative* (objects react to the player and to each other, so one simple rule
> generates countless events).
> **[UNVERIFIED]:** the phrase "one idea per screen" is *not* attributable to Nintendo — it is real
> design folklore. Use Miyamoto's **"Disneyland" dungeon** (each room delivers a novel experience) and
> Aonuma's post-Wind Waker paradigm (each dungeon's distinctive feature in **one or two core puzzles**,
> combat as connective tissue) instead. Aonuma's actual first question: *"what sort of gameplay do we
> want the player to engage with"* — then theme, then item.

**Map onto TRUST ISSUES:** the project currently has the *opposite* of a taught grammar — CLAUDE.md
documents as a known gotcha that "any interactable placed on an otherwise empty tile is invisible."
The workaround has been to pair each interactable with a `motivationalPoster` furniture entry. That
is a bug being managed, not a vocabulary being taught. Fix it as a **system**, per Harvey Smith's
systemic-level-design principle (implement behavior via *global* object hierarchies with consistent
responses, not localized one-off scripted triggers): give every interactable tile a subtle shared
tell — a faint highlight, a proximity audio cue (Rayman channel 2), a consistent object class. Then
teach it in the Cubicle Farm in Act 1 and never explain it again. Bonus: the game already has a
diegetic "secret that reveals secrets" candidate — **Alex IT's badge scanner / the UV-ish "audit
lens."** One tool that makes hidden interactables visible would be worth more than ten new posters.

**P3.5 — ROOM-ATOMIC CONTENT CANNOT CARRY MAP-SCALE MEANING.** ★ the diagnosis for the posters
> *Link's Awakening 2019* **Chamber Dungeon** is the documented failure. **193 chambers**, unlocked by
> clearing main dungeons, plus **14 Chamber Stones on the island** and **8 from Dampé**. Aonuma's
> constraint philosophy was deliberate: *"certain rooms have treasure chests and certain rooms that
> don't. What's in the treasure chest will be determined by how you connect those rooms together"* —
> and Chamber Dungeons was *"the deciding factor in revisiting this game."* But **every chamber is
> completely self-contained, so no puzzle can span rooms.** Critics: "no grand, interweaving puzzles…
> you're just running from room to room, doing things you've already done." Players optimized for the
> *fastest legal layout*, not elegance.
> The positive counterexamples: *Tunic's* **Golden Path** — a **5×5 grid template on page 49** whose
> 25 cells reference 25 specific manual pages, each hiding a path fragment; overlaying them yields one
> giant Holy Cross input that opens the Mountain Door. **Roughly half the manual becomes one
> meta-puzzle.** And *Link's Awakening's* tiered collectible payout: Secret Seashells went **26 → 50**,
> with rewards at **5** (Heart Piece), **15** (**Seashell Sensor** — a diegetic proximity detector that
> teaches you to trust the ping), **30** (Chamber Stone), **40** (Koholint Sword), **50** (second Stone).
> Tiered payout at short intervals keeps a 50-item collectible from becoming a cliff.
> *Animal Well's* 64-egg cadence does the same: **8** → Animal Flute (fast travel), **16** → Pencil,
> **32** → Top *and* your mural piece, **64** → the 65th Egg.
> *Lorelei's* **clue-distance hierarchy** is the best published answer to backtracking:
> **"bigger puzzles would have their cipher distributed throughout the game, whereas the puzzles
> leading to that cipher should always have the clues close at hand."** Local puzzles self-contained;
> only capstones demand cross-map synthesis. Plus the anti-gridlock rule: non-linear progression
> guarantees "players will never get hit with a puzzle gridlock" — stuck ≠ stopped. And:
> **"No puzzle is created in a vacuum. They all have ideas informing each other."**
> *Metroid Dread* on constructive backtracking: **"each [EMMI] zone is placed on the map such that you
> are forced to cross through multiple times to accomplish your other goals"** — repeat traversal *is*
> the teaching — and post-clear the zone's palette flips from gray to bright, so **the room itself is
> the progress readout.**

**Map onto TRUST ISSUES — this is the exact diagnosis of the 38 motivational posters.** Each is
room-atomic, single-verb (read → +1 ATK or +1 DEF → XP), and references nothing else. 38 instances of
the same interaction is the Chamber Dungeon failure at collectible scale. Two fixes, both cheap:
(a) **tiered payout** — 5 posters → a real reward, 15 → a "Motivation Sensor" that reveals unread
posters on the HUD (the Seashell Sensor, and it doubles as the P3.4 signposting tool), 30 → an
ability, all 38 → something absurd and worth the walk; (b) **make them one meta-puzzle** — put a
fragment of the 1947 charter's missing clause, or a letter of the vault code, on each poster, so 38
atomic pickups become one Golden Path. That single change also feeds P3.3: assemble the code, type it
into the vault, skip Act 4's gate. Three patterns, one implementation.

**P3.6 — THE HONEST NEGATIVE RESULT: NOBODY PUBLISHES AN INTERACTABLES-PER-ROOM NUMBER.**
> No shipped game publishes an interactable-per-room ratio and no GDC talk prescribes one. The Level
> Design Book explicitly refuses: intensity gets plotted 0–100 / 0–5 / 0–10, but it is "just a gut
> feeling that emerges from knowing the game and observing playtests. **It's not a hard science**."
> The usable substitute is **Valve's four beat types** — Explore / Combat / Choreo / Puzzle: classify
> each beat and audit the *mix* per room rather than the count.
> On the content-vs-busywork distinction, the cleanest articulation is JB Oger's *The Inevitable Open
> World Towers*: as worlds scaled, **"the density of interactive content diminished"** — towers are a
> *revelation-pacing band-aid* because "revealing 10 icons ten times" is digestible where 100 at once
> is not, while actual density fell. (Assassin's Creed 2007 shipped **91 towers**.)
> Calibration reference points for maximal reactivity: BG3's Guinness-certified script is
> **2,503,837 words** (2,121,425 dialogue + 382,412 non-dialogue), 500+ voiced characters; Larian's
> method is "approaching it as **weird Dungeon Masters**." Disco Elysium: **"over 1.2 million words."**
> Caution: the "17,000 endings" figure was walked back by Larian's own lead writer as a count of
> interlinking *variables* — reactivity marketing numbers are usually permutation counts.
> **[UNVERIFIED]:** any published Disco Elysium interactable count, and any ZA/UM statement mandating
> "everything is examinable" (community sources note many props are *not* interactive). Also
> **[UNVERIFIED]:** "every object should have a use" is not attributable to Spector or Smith.

**Map onto TRUST ISSUES:** do not chase a density number. Instead run a **Valve four-beat audit** on
all 26 rooms and find the rooms that are single-beat (pure Explore = walking). Those are the rooms
that feel empty, and the count won't tell you which they are.

---

## PART 4 — META-PROGRESSION & REPLAY (for a 4–6h browser satire)

### Ranked comp shortlist

| # | Game | Why it ranks here for TRUST ISSUES |
|---|------|-----------------------------------|
| **1** | **Inscryption — Kaycee's Mod** (Daniel Mullins) | The exact precedent: a roguelite challenge mode **bolted onto a narrative game, post-launch, free**, with a challenge-point ladder that also dispenses narrative. This is the single most directly copyable structure in the report. |
| **2** | **Chrono Trigger NG+** (1995) | The right NG+ philosophy for a short game: carry-over exists to unlock **endings you couldn't reach**, not to re-run content faster. |
| **3** | **Into the Breach** (Subset) | **Achievement → Coin → squad.** The tightest documented "checklist buys new play" loop. TRUST ISSUES has 40+ achievements that buy nothing. |
| **4** | **Celeste** (Matt Thorson) | Assist Mode philosophy + the **harder-but-shorter** ratio (C-sides are 3–4 rooms). The correct shape for challenge content in a short game. |
| **5** | **Slay the Spire Daily Climb / Balatro seeds** | The anti-FOMO daily. Balatro's seeded-run answer is the right one for a browser game with no server. |
| **6** | **Nier: Automata** | Route structure as honest asset reuse — same rooms, new authorial frame. Also the cheapest terminal reward (Ending E is one scene + a credits interaction). |
| **7** | **Hitman Freelancer / Escalations** | New constraints + new win conditions on rooms you already built. |
| **8** | **Undertale** | Persistent memory across resets — a flag the game refuses to forget, and one NPC who comments. Extremely portable to a browser game. |

### Stealable patterns

**P4.1 — NG+ SHOULD UNLOCK ENDINGS, NOT MULTIPLY STATS.** ★ top pick
> *Chrono Trigger:* carrying stats/levels forward is not the point — it is the *enabler*. NG+ makes
> Lavos beatable at almost any story point, and ***when* you fight him selects from 12 endings**
> (13 in the DS/Steam/mobile ports).
> *Dark Souls is the documented anti-pattern:* NG+ raises enemy HP/damage ~**40%**, then ~**8% per
> cycle** through NG+7; the story is identical; and players widely report **NG+ is *easier* than NG**
> because carried gear outpaces the scaling.
> *RE2 Remake* is the cautionary remake: Capcom cut the original's *zapping* system (A-scenario choices
> altering the B-scenario) because four interconnecting stories were judged "very tedious" for modern
> players — and the result is criticized as "the exact same game with a few minor item/puzzle changes."
> **If you cut the causal link between run 1 and run 2, the second run stops being a second run.**
> *Nier: Automata* — Yoko Taro's honest account: the route system *"was a product of our budget from
> Square Enix… we couldn't really make all that much content,"* **but** he refused to make the replay
> *"exactly the same with just raised difficulty," so "I thought about changing the story a little."*
> The terminal reward is cheap: Endings C/D are a **chapter-select re-entry to one late scene**, and E
> is reached by re-viewing C/D and accepting prompts **during the credits**.
> *Undertale:* completing Genocide writes a **permanent flag outside the normal save** so subsequent
> runs are altered and even "True Reset" won't clear it. **Flowey is the only NPC who remembers.**

**Map onto TRUST ISSUES — the current NG+ is precisely the Dark Souls anti-pattern.** It carries
`unlockedAbilities` + `upgradePoints` + `questStates` + all AUM against a flat ×1.4 HP / ×1.3 ATK,
which means NG+ is almost certainly *easier* than NG. And `ng_plus_count` is incremented but **read
by nothing**. Three fixes in ascending cost:
1. **Read the counter.** Gate 1–2 alternate dialog branches per act on `ng_plus_count >= 1`. Andrew
   already has an internal-monologue system (`thoughts.js`) and four Voices — a second-time Andrew
   who *knows* is free characterization. This is the Undertale pattern: one flag, plus NPCs who
   remember. Diane is the natural Flowey.
2. **Make knowledge the carry.** Combine with P3.3: on NG+, the vault keypad, the Morse code, and the
   crossword are all answerable from Act 1. NG+ becomes a *sequence-break run*, which is genuinely
   different play at near-zero content cost.
3. **Add endings the first run cannot reach.** The game already has branch structure (`branch_chosen`,
   the Act 2 secret Ross ending, KEEP/TERMINATE at Rack 7). A Chrono Trigger-style "confront The
   Algorithm early" route, reachable only with carried power, is the highest-value narrative payload
   per line written.

**P4.2 — A CHALLENGE MODE BOLTED ONTO THE NARRATIVE GAME.** ★ top pick, near-exact precedent
> *Inscryption — Kaycee's Mod*, shipped **free** to Steam/Epic/GOG after months of beta with "tens of
> thousands" of testers. Mullins' announcement: *"I have received countless requests for an endlessly
> playable version of Part 1 that emphasizes Leshy's deckbuilding roguelike as a standalone
> experience."* Structure: **13 challenges ("skulls") with Challenge Point values of 5 / 15 / 20 / 30**;
> **Challenge Level *N* requires activating challenges summing to 10 × N CP**; each level unlocks new
> cards, starter decks, further challenges, **and dev logs written by the fictional Kaycee Hobbes** —
> i.e. the challenge ladder also dispenses *narrative*. A "Final Boss" challenge (20 CP) swaps Leshy
> for a three-phase true boss. (The total number of challenge levels is **[UNVERIFIED]** — the CP
> formula is confirmed, the ceiling is not.)
> *Celeste* supplies the ratio: **202 collectibles** (175 red strawberries + 26 golden + 1 Moon Berry);
> B-sides/C-sides for every chapter except Prologue/Epilogue/Farewell, and **C-sides are only 3–4 rooms
> with no checkpoints**; Golden Strawberries unlock only after the Chapter 8 B-side and require a
> **deathless chapter**. **Harder but shorter is the key ratio for a short game — a C-side is a remix,
> not a sequel.** Thorson frames the whole stack as one system: *"the strawberries, b-sides, and assist
> mode are all there to help players find the challenge level that's right for them,"* and on Assist
> Mode: *"Assist Mode breaks the game… ultimately, we want to empower the player… and sometimes that
> means letting go"* — with the granularity note that *"the most important assist options are the
> in-between ones, like slowing the game down 20%, or getting a single extra dash."*
> *Hitman:* IOI's Freelancer goal was "as much replayability as possible through randomizable content"
> — a campaign is **4 syndicates × 3–6 missions** in player-chosen order, with a Showdown where the
> leader must be identified from suspects; Escalations chain objectives onto shipped maps and may
> change time of day, filters, start locations, NPCs, items, music, mechanics. **The cheapest "new
> content" is new constraints + new win conditions on rooms you already built.**
> *Undertale:* Genocide/Pacifist are challenge modes made of narrative — mechanically the hardest
> content *and* the most narratively punishing. Fox on why non-lethal RPGs are rare: *"it's way more
> complex to include it as a potential option,"* since *"hurting things is normalized and has loads of
> established ways to make it feel fun."*

**Map onto TRUST ISSUES:** build **"The Performance Review"** — the Kaycee's Mod of this game. All
the pieces exist: `ArcadeState` (a self-contained state that owns its own scene), 26 enemies with
phases, the `enemyOverrides` injection path, `EncounterConfig`, and the mutator system. A campaign =
a boss-rush ladder (already scoped as ROADMAP C4) where the player activates stretch-goal modifiers
totalling 10 × N Review Points, and each level unlocks a new modifier **plus a page of Rachel's or
the Regional Director's internal memos** — the narrative-in-the-ladder move that makes Kaycee's Mod
more than a difficulty slider. Ship it as the post-game, replacing the 45M AUM renovation grind as
the thing you do after the credits.

**P4.3 — MAKE THE ACHIEVEMENT LIST *BUY* SOMETHING.** ★ cheapest replay lever in the report
> *Into the Breach:* **70 achievements** (55 base + 15 Advanced Edition); **each achievement = 1 Coin**;
> Coins buy squads; the Secret Squad costs **25 Coins**. Justin Ma / Matthew Davis note squads reduce
> run-to-run randomness because your kit is defined before you start.
> *Hades* **Fated List of Minor Prophecies** — and note the brief's "89 entries" is wrong for Hades 1:
> it is **55 tasks**. Three properties make it work: (a) it is an in-fiction object you must
> **commission from the House Contractor for 20 Gemstones**, (b) entries **unlock in step with the
> story** so the list is never a wall of 55 unknowns, (c) rewards are **spendable currency** (e.g.
> weapon prophecies award 2 Ambrosia each), not badges. Hades II's equivalent is an **89-entry** Fated
> List — likely the source of the confusion.
> *Balatro:* four color decks unlock purely on **items discovered** — Blue **20**, Yellow **50**,
> Green **75**, Black **100**, Polychrome **200**. Separately **20 Challenge Decks** (first 5 after
> winning with 5 different decks; all unlock at **15 wins**). Achievements and unlocks are
> **deliberately disabled inside Challenge Decks** because the constraints would trivialize them.
> Effects are **lateral, not stronger**: Plasma *"Balance Chips and Mult; ×2 base Blind size"*, Erratic
> randomizes all ranks/suits, Abandoned removes all face cards, Checkered is 26 Spades + 26 Hearts.
> **Unlocks expand the catalogue rather than the power ceiling**, so the loop is curiosity-driven
> ("what does Plasma even do?") instead of progression-debt-driven.
> *Achievement Design 101* supplies the test: **"Return to these two questions whenever designing
> difficult achievements: 'Why is this hard? Is that reason fun?'"** Good difficulty sources: skill,
> mastery of *core* mechanics, voluntary handicaps. Bad: luck, grinding non-central mechanics, removing
> the fun parts. On grinding: *"Assign these achievements to stuff that the player is doing anyway."*
> On achievements-as-signposts: *"If there's an awesome optional side quest in your game that's easy to
> miss… just add an achievement."* Also: judge an achievement by its **easiest** completion route, and
> never leave one unearnable after a save point.

**Map onto TRUST ISSUES:** 40+ achievements currently produce a toast and a badge. `AchievementManager`
already uses a **separate localStorage key** — so achievements already persist across saves, which is
exactly the substrate Into the Breach needs. Make each unlocked achievement grant **1 Review Point**
(or 1 "Commendation"), spendable on: challenge-mode modifiers, cosmetic slots, a respec, an ally
loadout preset, or a Kaycee's-Mod-style challenge level. Zero new persistence code.
**Existing strength worth protecting:** the Combat Mastery achievements already *teach* — Perfect
Form, Follow Through, Due Diligence and Counter-Offer each name a mechanic a player might otherwise
never discover. That is achievements-as-curriculum done right, and it should be the model for any new
ones. The gap is that the list is flat rather than progressively revealed like the Fated List.

**P4.4 — A DAILY THAT IS A CONVERSATION, NOT A LEASH.**
> *Will Lewis (Caveblazers)* on the minimum viable daily: *"The only two principles are that there is
> a shared seed, and that it changes every day."* Everything else is a choice.
> *Slay the Spire Daily Climb:* preset character, set Ascension level, exactly **3 modifiers**,
> identical seed for everyone — map, card rewards, relic drops and event outcomes are the same for all
> players, making it a test of decision-making rather than luck. **The reward is the leaderboard: no
> progression currency, no streak, and nothing is lost if you skip it.**
> *The one-shot-vs-retries disagreement, with reasons.* One-shot (Caveblazers, OlliOlli) makes players
> "value" their lives. **Sébastien Bénard (Motion Twin, Dead Cells) argues against it:** one-shot is
> *"easily abusable, since watching a video and learning the dungeon by heart before playing will give
> them a considerable and unfair edge,"* whereas *"allowing people unlimited attempts at the daily
> opens up the mode to those who just want to better themselves… more welcoming for the whole community
> rather than just focusing on a specific minority of hardcore players."* Dead Cells records only your
> best score for the day, at a reported **~7,000 runs per day**, and grants blueprints on **cumulative
> lifetime completions** (1st → Swift Sword, 5th → Lacerating Aura, 10th → Meat Skewer) — never
> per-day, never streak-based, so **the reward can never be *lost* by missing a day**.
> *Balatro shipped no daily at all* — seeded runs instead, so a player can post a seed and others play
> it whenever. LocalThunk has said a challenge *creator* is on the list with no timetable.
> *Wordle* is the strongest explicit anti-retention statement available. Wardle: *"I liked the idea that
> everyone around the world was trying to solve the exact same word at the exact same time."* ·
> *"I'm pretty wary of apps that want to consume all of your time and maximize engagement like that. I
> just don't think that stuff's very nice to do to other people quite frankly."* · *"The game won't
> allow you to binge or get addicted."* Shipped with **no ads, no push notifications, no leaderboards,
> no difficulty settings, no practice mode** — practice mode was rejected specifically because it would
> undermine the once-a-day constraint. His 2013 endless prototype lost players after ~20 minutes; the
> daily limit fixed it.
> **Synthesis — the leash features are exactly: streaks, daily-only currency, notification nags, and
> FOMO rotation. Everything else is fair game.**

**Map onto TRUST ISSUES:** it is a browser game with no server, so **Balatro's answer is correct:
seeded runs, not dailies.** Add a seed field to the Billable Day (P2.1) and a shareable seed string.
If a daily is wanted later, copy Slay the Spire exactly: date-derived seed, fixed modifiers,
**no reward and no streak**, plus Dead Cells' unlimited-retries/best-score-of-day stance. Never ship
a streak counter — it is the single feature that converts this from a mastery loop into a leash.

**P4.5 — SESSION LENGTH AS A PROMISE, AND "RESPECTS YOUR TIME" AS A DESIGN VALUE.**
> **Negative finding, stated honestly: no credible published analytics exist on browser-game session
> length.** The nearest artifact is itch.io's *self-reported* "Average session" taxonomy — "A few
> seconds / A few minutes / About a half-hour / About an hour / A few hours / Days or more" — defined
> as "how much time it takes the player to complete a **part** of your game… to reach an objective
> (complete a level, a run, etc.)," i.e. a *chunk* metric, not total length. Devs on itch report action
> games landing in the **5–30 minute** band, and note players "are drawn towards games that allow them
> to feel they progressed with something in a shorter session (say 15–45 minutes), even if the scope of
> the game is longer."
> *A Short Hike* (Adam Robinson-Yu, GDC postmortem): built to a **4-month** deadline via "smart
> shortcuts" (reusing tools and assets from prior projects, deriving an art style from the constraints).
> On pacing as time-respect: if players *"spent too long wandering or too long chatting with NPCs,
> they'd get a little antsy and it would hurt the pacing."* He talks explicitly about **setting player
> expectations before they start** — pacing is a promise, and the promise is made on the store page and
> title screen.
> *Thank Goodness You're Here* — **~2 hours** (≈1.5h if you know the route), and that is the product.
> Coal Supper (two people) *stripped away* game-design elements to protect the comedy.
> *Lorelei and the Laser Eyes* — Simogo removed dexterity entirely (**one stick, one button**), and
> shipped a **physical spiral-bound notebook** designed to "merely push players in a direction, without
> providing answers," rejecting a guide book because it would kill *"the social element of discussing
> puzzles with friends."* **Replay value can live outside the executable.** Scale: **~150 puzzles,
> nearly all unique**; Flesser looked at *Layton* "for quantity and frequency" but wanted puzzles to
> "have a natural place within the narrative."
> **[PARTIALLY VERIFIED]** A CHI 2026 paper, *"From Quarters Per Minute to Daily Quests and Seasons:
> Developer Perspectives on Temporal Design in Video Games,"* is the most citable academic source here
> but the ACM page 403'd — worth a manual pull.

**Map onto TRUST ISSUES:** declare the session chunk explicitly and make a boundary land there. The
game already auto-saves on every room transition and every story combat victory with a toast — that
is the right infrastructure. Target a **~20-minute chunk** (one act beat, or one Billable Day) and
state it on the title screen. And take the Lorelei lesson seriously for a satire: the shareable
artifact for this game is not a leaderboard, it is **the client dossier / the portfolio grade card** —
something a player screenshots and sends to a coworker.

---

## PART 5 — CANDID GAP AUDIT

Ranked by how much each gap costs the game, with the cheapest credible fix noted.

### Tier 1 — structural

**G1. There is no run.** The reception loop is single-encounter: fight → accept/decline → repeat.
No escalating sequence, no run-scoped currency, no within-run build, nothing at risk, nothing lost.
Every comp in Part 2 is built on run/meta separation; TRUST ISSUES has only meta. The whole "one more
run" psychology the brief asks about **has no object to attach to.** → P2.1 (Billable Day).

**G2. No player-authored difficulty, anywhere.** No Heat, no Ascension, no Stakes, no Fear, no Curse.
This is the largest replay lever in the genre and it is entirely absent, despite the game already
shipping two player-priced-risk mechanics (Retaliate length selection, Desperate Gamble risk menu)
that prove the team knows the pattern. → P2.3 (Stretch Goals / Performance Review).

**G3. NG+ is the documented Dark Souls anti-pattern.** Flat ×1.4 HP / ×1.3 ATK / ×1.2 DEF while
carrying all abilities, upgrade points, quest states and AUM — near-certainly *easier* than NG.
`ng_plus_count` is written and **read by nothing**. → P4.1.

**G4. Nothing is knowledge-gated.** Every gate is a flag check. The vault code, Morse code, crossword
and riddles are all *flag* gates dressed as puzzles — the player is never allowed to simply know the
answer and act on it. This forfeits the entire Tunic/Outer Wilds/Void Stranger replay engine, which
is the cheapest replay engine that exists for a short game. → P3.3.

### Tier 2 — feel

**G5. Defense costs a turn and gives nothing back to take from the enemy.** Brace is the only
defensive verb, it consumes the player's whole turn, and its payoff (halve one hit + arm Retaliate)
is a bad trade above ~50% HP. Every 2023–2026 standout gives the defender something to *do* on the
incoming hit (E33 parry/dodge/jump, SoS timed block) or makes guarding *deny the enemy* (Metaphor).
→ P1.4, and optionally a timed-block layer (P1.6's window-widening cosmetics make it accessible).

**G6. The telegraph doesn't name its counter, and weakness is an invisible multiplier.** Four tags on
24 of 26 enemies is real mechanical depth that most players will never perceive, because a 1.5×
multiplier inside `_calcDamage` produces no distinct feedback and the telegraph hint doesn't tell you
which tool solves the incoming threat. This is the highest ratio of *existing depth* to *perceived
depth* in the game. → P1.1 (Locks) + P1.2 (Break bar). Cheapest big win in Part 1.

**G7. Momentum never buys agency.** All three tiers buy damage, sustain, or a debuff. The convergent
finding across E33, P5R, Metaphor and SMT V is that **extra actions read as far more powerful than
extra damage.** → P1.3 (Press Advantage doesn't end the turn; "Loop In" baton pass to allies).

**G8. Allies are stat blocks, not playstyles.** Five allies with rotation AI and no unique resource,
so party composition changes numbers rather than how you play. → P1.5.

**G9. Two mechanics violate "no frustrating deaths."** Confuse is a 50% coin flip that steals the
player's chosen action (precisely the failure mode Broche named), and Desperate Gamble `all_in` is
**30% for 2.5× = 0.75× EV**, i.e. a strictly bad bet with an achievement attached teaching players to
take it. → P1.7.

### Tier 3 — density and economy

**G10. 38 posters are 38 instances of one verb.** Read → +1 ATK or +1 DEF → XP, referencing nothing.
This is the Chamber Dungeon failure at collectible scale: room-atomic content cannot carry map-scale
meaning. → P3.5 (tiered payout + one meta-puzzle; feeds G4 for free).

**G11. Interactable density is ~3.3 non-poster items per room, and the hidden tier is empty.** Nearly
all content is mid-tier (findable by walking into it). No secret requires knowing anything; no tool
changes how you see the office. → P3.2 audit + P3.4 (a shared "tell" grammar + an audit-lens tool).

**G12. The AUM economy has Balatro's shape inverted.** Superexponential income (one 250M whale = 2.5M
AUM) against flat costs (renovations 5M each, 45M total). The economy solves itself, "AUM Millionaire"
is trivial, and the renovation wall is **a Grinding dark pattern by Zagal's definition** — time, not
skill — made worse by its +2,000 XP reward being inert at the level 15 cap. For a satire *about*
extractive finance, shipping a grind wall is a tonal own-goal as well as a design one. → P2.2, P2.8.

**G13. Client mutators are all additive.** `thorns`, `volatile` and `compound` each *add* a thing.
None takes a resource, denies information, or forbids a build — so no client ever forces a replan, and
no loss produces the "I know exactly why I lost" clarity. → P2.4. **Highest impact-per-hour in the
whole report**, because the system already exists and each new mutator is 3–10 lines.

**G14. Achievements buy nothing.** 40+ achievements, already persisted in a separate localStorage key,
producing badges. → P4.3. Cheapest replay lever available.

**G15. The ability tree has no respec.** Permanent `upgradePoints` with hard prerequisites across 19
abilities. All three roguelite comps make respec free or nearly free because experimentation volume is
a function of the cost of being wrong. → P2.5. ~20 lines.

**G16. Post-game is a shop tier plus one quest.** 45M AUM of renovations and *The Daemon at Rack 7*.
No challenge ladder, no boss rush (scoped in ROADMAP C4, not built), no seeded runs. → P4.2.

### Strengths worth protecting (do not refactor these away)

- **The Voices system is genuinely original** and its persisted `voiceCounts` is already the Hades
  "narrative as meta-progression" substrate. It is the single most valuable under-exploited asset in
  the codebase (→ P2.7).
- **Telegraph + 4-tag weakness/resistance on 24/26 enemies + boss phases with taunts** is more
  mechanical depth than most browser JRPGs ship. The gap is perception, not substance.
- **Retaliate's player-chosen length→multiplier and Desperate Gamble's risk menu** are player-priced
  risk done right, in miniature. They are proof-of-concept for P2.3.
- **Combat Mastery achievements teach mechanics** — textbook achievements-as-curriculum.
- **Balance is already metrics-driven** (the sim findings preserved in code comments are exactly Mega
  Crit's GDC 2019 method). Keep the sim.
- **26 rooms is the right number.** Freeze it and spend on depth (Basso's constraint).
- **Zero-asset procedural philosophy + the editor** makes every tuning proposal above cheap to try.

---

## PART 6 — RECOMMENDED ORDER OF ATTACK

Sorted by impact ÷ cost. Items 1–4 are small, self-contained, and address Tier 1–2 gaps.

| # | Do this | Pattern | Fixes | Rough cost |
|---|---------|---------|-------|-----------|
| 1 | **Subtractive client mutators** (Under NDA, Retained Counsel, Expense Freeze, Escalation Clause, Conflict of Interest) | P2.4 Boss Blinds | G13, G1 (partly) | 3–10 lines each, system exists |
| 2 | **Locks on the telegraph** — heavy enemy abilities list required tags; clear them to fizzle | P1.1 Sea of Stars | G6 | one field + one HUD row that exists |
| 3 | **Achievements grant Review Points** that buy modifiers/respec/cosmetics | P4.3 Into the Breach | G14, G15 | persistence already exists |
| 4 | **Read `ng_plus_count`** — 1–2 alternate dialog branches per act; Diane remembers | P4.1 Undertale/Chrono | G3 | writing only |
| 5 | **Free respec** ("HR Skills Reassessment") | P2.5 Mirror/PowerUps | G15 | ~20 lines |
| 6 | **Enemy Composure/Break bar** — weakness hits fill it, zero = lost turn + 20% | P1.2 HSR/E33 | G6 | new field + HUD bar |
| 7 | **Poster tiering + meta-puzzle** (5/15/30/38 rewards; 15 = Motivation Sensor; fragments assemble the vault code) | P3.5 + P3.3 | G10, G4, G11 | data + one input field |
| 8 | **Press Advantage doesn't end the turn**; add "Loop In" baton pass to allies | P1.3 Gradient/Baton | G7 | engine change, ally system exists |
| 9 | **The Billable Day** — 3–5 escalating clients, run-scoped Billable Hours, banked at 5:15 | P2.1 + P2.6 | G1, G12 | the big one; new state + economy |
| 10 | **Stretch Goals / Performance Review ladder** (subtractive modifiers, 10×N points, memos as rewards) | P2.3 + P4.2 | G2, G16 | new state, reuses encounters |
| 11 | **Voice line banks keyed to run state** (15–30 lines each × 4 Voices) | P2.7 Hades | G1 (reward side) | pure writing — the project's edge |
| 12 | **Per-ally unique resources** (Grudge / Rapport / Paper Trail / Uptime / Seniority) | P1.5 E33 | G8 | highest ceiling, highest cost |

---

## APPENDIX A — CORRECTIONS TO THE BRIEF

1. **Hades' Fated List has 55 entries, not 89.** The 89-entry list is **Hades II**'s.
2. **Vampire Survivors Arcanas** are drawn at run start / **11:00** / **21:00** (3 per run) — not at
   limit-break thresholds. **Curse does not shrink Arcanas** — it *buffs* Hex, Sonic Whip, 108 Bocce
   and Twilight Requiem. The **30:00 cap is per-stage, not universal** (15:00 Il Molise/Moongolow,
   20:00 Whiteout/Space 54). Level-up shows **3 *or* 4** options, the 4th Luck-gated.
3. **"One idea per screen" is not a Nintendo principle** — it is design folklore with no attributable
   source. Use Miyamoto's "Disneyland dungeon" (novelty per room) and Aonuma's "one or two core
   puzzles per dungeon" instead.
4. **Secret Seashells: 26 → 50** in the 2019 remake (the brief's figures are correct).
5. **Animal Well's "4–6 uses per item" is [UNVERIFIED].** Basso's official line is only "All items have
   multiple uses!"; guide-level enumeration lands at **2–4 documented uses**, with the Yoyo highest
   at ~4. There are **13 tools**.
6. **Tunic's "skip 90% of the game" is [UNVERIFIED].** The verified form is that every Sealed Door is
   openable from minute one with knowledge, and the world is "filled with angles for sequence breaking."
7. **Outer Wilds GDC attribution:** GDC 2020 "Curiosity-Driven Exploration" = Alex Beachum + Loan
   Verneau; GDC 2021 "Sparking Curiosity-Driven Exploration Through Narrative" = **Kelsey** Beachum.
8. **CLAUDE.md is materially out of date** on this project's own combat and roguelite systems — see
   Part 0. Several ROADMAP C1 items (mutators, negotiation beat, personal bests, whale follow-up) are
   already shipped.

## APPENDIX B — CLAIMS FLAGGED [UNVERIFIED]

E33 parry window duration (~0.3s); E33 Verso rank point thresholds; Sea of Stars timed-hit multiplier
(guides say 2×) and partial lock-break reduction cap (~25–35%); SMT V demon-fusion risk economy;
Balatro's designer rationale for "big numbers feel good" (the layered-feedback framing is from critics,
not LocalThunk) and any Balatro target run length; run-length figures for Hades / StS / Balatro as
*designer intent* (all press/community); Kaycee's Mod total challenge-level ceiling; Motion Twin's
anti-telemetry stance (paraphrase only); browser-game session-length analytics (no credible aggregate
exists); Disco Elysium interactable counts and any "everything is examinable" mandate; "every object
should have a use" attributed to Spector or Smith; formal introduce/develop/test/twist applied to
*rooms* in Metroid Prime/Dread; "every room is a set piece" as a Retro principle.

## APPENDIX C — HIGHEST-VALUE SOURCES

**Combat:** [Automaton — E33 "no frustrating deaths"](https://automaton-media.com/en/news/clair-obscur-expedition-33s-battle-system-was-designed-around-the-premise-of-no-frustrating-deaths-and-a-game-you-can-clear-with/) ·
[Fextralife E33 Combat](https://expedition33.wiki.fextralife.com/Combat) ·
[Maxroll Pictos/Lumina](https://maxroll.gg/clair-obscur-expedition-33/guides/pictos-lumina-guide) ·
[Gamepur — Sea of Stars combat basics](https://www.gamepur.com/guides/sea-of-stars-combat-basics-combo-points-live-mana-lock-breaking-timed-hits) ·
[RPG Site — Boulanger interview](https://www.rpgsite.net/interview/14807-developer-debrief-chatting-with-the-mind-behind-sea-of-stars) ·
[Game8 — Press Turn](https://game8.co/games/Shin-Megami-Tensei-V/archives/348265) ·
[Persona Central — Hashino on Metaphor](https://personacentral.com/metaphor-refantazio-developer-interview-protagonist-archetypes/) ·
[HSR Toughness](https://honkai-star-rail.fandom.com/wiki/Toughness) ·
[Can I Play That — Sea of Stars relics/accessibility](https://caniplaythat.com/2023/11/01/sea-of-stars-accessibility-review/)

**Roguelite:** [Game Developer — Hades narrative rewards](https://www.gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death) ·
[RPG Site — Pact of Punishment](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards) ·
[Hades II Oath of the Unseen](https://hades2.wiki.fextralife.com/Oath+of+the+Unseen) ·
[Inverse — Kasavin on God Mode](https://www.inverse.com/gaming/hades-god-mode-interview) ·
[StS Ascension](https://slaythespire.wiki.gg/wiki/Ascension) ·
[GDC Vault — StS Metrics Driven Design](https://www.gdcvault.com/play/1025731/-Slay-the-Spire-Metrics) ·
[Balatro Boss Blinds](https://balatrowiki.org/w/Boss_Blind) · [Blinds and Antes](https://balatrowiki.org/w/Blinds_and_Antes) ·
[Matt Greer — Balatro score growth](https://www.mattgreer.dev/blog/balatro-score-growth/) ·
[PC Gamer — LocalThunk on microtransactions](https://www.pcgamer.com/games/card-games/balatro-doesnt-have-microtransactions-for-a-very-good-reason-it-makes-me-want-to-put-my-computer-in-the-dishwasher-and-set-it-to-pots-and-pans-localthunk-says/) ·
[VS PowerUps](https://vampire.survivors.wiki/w/PowerUps) ·
[Lost Garden — Loops and Arcs](https://lostgarden.com/2012/04/30/loops-and-arcs/) ·
[Zagal, Björk & Lewis — Dark Patterns (FDG 2013)](https://dblp.org/rec/conf/fdg/ZagalB013.html)

**Exploration:** [Game Developer — Animal Well, discipline & 256 rooms](https://www.gamedeveloper.com/programming/the-scratch-coding-and-discipline-at-the-heart-of-animal-well) ·
[Thinky Games — Basso on three layers](https://thinkygames.com/features/interview-how-animal-well-is-using-secrets-and-mysteries-to-be-a-different-kind-of-metroidvania/) ·
[Game Developer — Tunic manual design](https://www.gamedeveloper.com/business/how-tunic-weaves-wondrous-unknowable-worlds-inspired-by-inscrutable-nes-manuals) ·
[tunic.wiki Golden Path](https://tunic.wiki/books/secrets/page/the-golden-path) ·
[Kelsey Beachum GDC 2021 deck (PDF)](https://media.gdcvault.com/GDC+2021/beachum_gdc_2021(1).pdf) ·
[Set Side B — Link's Awakening hidden overworld structure](https://setsideb.com/the-hidden-structure-of-the-overworld-of-links-awakening/) ·
[Nintendo — Aonuma on Chamber Dungeons](https://zelda.nintendo.com/links-awakening/blog/chamber-dungeons-with-eiji-aonuma/) ·
[Kotaku — Chamber Dungeons disappointment](https://kotaku.com/zelda-link-s-awakenings-chamber-dungeons-are-a-big-dis-1838038985) ·
[Costiuc — Rayman Legends secrets design](https://stanislavcostiuc.com/2016/04/19/secrets-design-in-rayman-legends/) ·
[ScreenRant — Flesser on Lorelei clue distance](https://screenrant.com/lorelei-laser-eyes-interview-challenge-puzzle-simon-flesser/) ·
[Level Design Book — pacing](https://book.leveldesignbook.com/process/preproduction/pacing)

**Meta/replay:** [The Gamer — Kaycee's Mod challenges](https://www.thegamer.com/inscryption-kaycees-mod-all-challenges-explained/) ·
[Game Developer — The 24-hour ticket: examining daily runs](https://www.gamedeveloper.com/design/the-24-hour-ticket-examining-daily-runs-) ·
[Vice — Thorson on Assist Mode](https://www.vice.com/en/article/celeste-difficulty-assist-mode/) ·
[Game Developer — Achievement Design 101](https://www.gamedeveloper.com/design/achievement-design-101) ·
[Into the Breach achievements/Coins](https://intothebreach.fandom.com/wiki/Achievements) ·
[Balatro Unlockables](https://balatrowiki.org/w/Unlockables) ·
[GDC Vault — A Short Hike postmortem](https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A) ·
[TechCrunch — Wardle on Wordle](https://techcrunch.com/2022/01/12/josh-wardle-interview-wordle/) ·
[Point'n'Think — Yoko Taro on route structure](https://www.pointnthink.fr/en/interview-with-yoko-taro/) ·
[Chrono Trigger NG+ / 13 endings](https://www.chronowiki.org/wiki/New_Game_Plus)
