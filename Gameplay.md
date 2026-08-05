# Gameplay.md — TRUST ISSUES: A Trust Officer Simulator

Systems reference: roguelite loop, items, achievements, cosmetics, and combat stats.

---

## Repeatable: Reception Roguelite

Reception runs two ways. Interact with the **reception desk** to open the **Daily Roster** and pick
one; interact with the **client sitting in the waiting area** to start the meeting that is already
booked.

| Mode | What it is | Currency behaviour |
|------|-----------|--------------------|
| **Walk-in** | One client, then another, forever. The original loop, unchanged. | AUM banks the moment you accept. |
| **The Billable Day** | 3–6 escalating clients back to back, with Billable Hours to spend between them. Board length scales with the size of your party. | AUM is held in escrow and only banks at 5:15. |

Walk-in numbers (unchanged):

- **Win combat:** 60–120 XP (scales with client wealth tier: `Math.round(60 + t * 60)` where t = 0–1)
- **Accept client:** AUM = max(50, floor(client assets × 1%))
- **Decline client:** No AUM, no penalty
- **Win:** Patience and Coffee fully restore

AUM is the shop currency. Spend it at the **Supply Shop** in the Break Room (interact with the vending machine area).

### The Billable Day

*Data: `src/data/billableDay.js` · UI: `src/states/DayState.js` · lifecycle: `ExplorationState`.
Design source: `.claude/plans/research-gameplay-comps.md` P2.1/P2.2/P2.4/P2.6.*

Diane puts you on the board for a **day** of 3–6 clients — 3–4 alone, 3–5 with one ally, 4–6 with a
full bench. You cannot go home in the middle of one and keep the money.

**Escalation.** Slot 0 is an ordinary walk-in. Every slot after it raises the client's stats
(+9% Patience, +5% Assertiveness, +5% Composure, +3% Efficiency, +15% XP per slot) *and* raises the
minimum wealth tier that can sit down (+6% of the wealth ceiling per slot, capped at 30% — so a
late slot cannot be a small-business owner). The last client is the **Close of Business**: an extra
+10% Patience / +5% Assertiveness on top, and always at least one mutator. Whale clients
(100M–250M assets) skip the stat multipliers — they are already the ceiling — but keep the XP bump.

**Attrition.** Inside a day, a victory restores only **20%** of max Patience and Coffee instead of
filling the bar. This is the whole point: the day is a resource curve, not four independent fights.
Walk-ins and every story fight still restore fully. Reception fights cannot be fled.

**Billable Hours** are the run currency. They are earned per cleared client and **evaporate at 5:15**:

| Award | Hours | Condition |
|-------|-------|-----------|
| Meeting billed | 6 | Always |
| Escalation | +1 per slot | Slot index (0 for the first client) |
| Clean file | +3 | Finished at 75%+ Patience |
| Inside the hour | +2 | Won within 6 rounds |
| Under budget | +2 | Used no items |

Range: 6 (a bloody grind on the first client) to 17 (a flawless close). Spend them between clients:

| Boon | Cost | Effect |
|------|------|--------|
| Second Cup | 6 h | Restores 40% max Patience and 25% max Coffee. Repeatable. |
| Firm Handshake | 10 h | +3 Assertiveness for the rest of the day. Stacks. |
| Deep Breath | 9 h | +3 Composure for the rest of the day. Stacks. |
| Calendar Peek | 5 h | Opens the next client's file — stats and restrictions. Once per day. |
| Reschedule | 8 h | Throws out the next client and books a different one. Once per day. |
| Expense Report | 7 h | One random consumable. Repeatable. |

Firm Handshake and Deep Breath are **day-scoped and floor-scoped**: they are reverted when the day
ends however it ends, *and* they are suspended the moment Andrew steps off the Reception floor,
reinstated the moment he steps back on. Both are repeatable, so three clients of banked Hours buys
about +9 Assertiveness and +9 Composure; without the floor scope a player could walk out of
Reception mid-day (which is explicitly allowed, and preserves the board) and fight a story boss or
the Act 5 gauntlet carrying run-scoped stats the walk-in economy never prices. The day record stores
exactly what is owed, so leaving is a pause, not a forfeit — a toast says so in both directions.

**The 5:15 bell.** When the last client is resolved the day closes: escrow banks into AUM, Diane
rings the bell, and the summary reports clients seen, signed, AUM banked, XP earned today, and Hours
billed vs. evaporated. Personal bests (`pb_best_day_aum`, `pb_longest_day`, `pb_best_day_hours`,
`pb_perfect_day`) are surfaced there. `daysWorked` increments.

**Forfeit.** Losing a fight mid-day, or choosing *Walk Off the Board* at the desk, voids the day's
escrowed AUM and reverts its boons. **Nothing permanent is lost** — XP, levels, book of business,
`bossAnger`, achievements and personal bests all survive, exactly as they would from a walk-in.
Leaving Reception mid-day does **not** forfeit: the board is stored in the save and Diane picks it
up where you left it.

**Beneficiary chains** are a walk-in feature and are not started inside a day; a queued chain waits
until the board is clear.

### Subtractive client mutators

Later day clients can carry a **restriction** — a Balatro-style rule break that takes something away
from Andrew instead of inflating the client. Slot 0 never has one; every later slot rolls at 45%;
the Close of Business always has one, and **40% of the time it has two**. They are badged in the
client review, announced at the start of the fight, and shown on the between-clients card once you
have paid for the peek.

| Mutator | What it takes |
|---------|---------------|
| **Under NDA** | The telegraph is sealed. You cannot see (or read off their face) what they are about to do. |
| **Retained Counsel** | Every `legal`-tagged ability is disabled. Attack, `social`, `audit` and `technical` still work. |
| **Expense Freeze** | No items this fight. |
| **Escalation Clause** | Andrew's Confidence decays by 10 every turn. Momentum tiers have to be spent, not banked. |

These are additional to the three pre-existing *additive* mutators walk-ins can already roll
(Billable Hours / thorns, Market Mood / volatile, Compound Interest / compound).

### Difficulty reference

Measured with `node tools/day-sim.mjs --slots --days 300` — the real `CombatEngine`, the real
`ClientGenerator`, a competent policy, levels 4 / 6 / 8. Slot win rates are conditional on having
reached that slot. The harness is committed next to this table and the policy it plays is documented
in its header: weakness-tag first, Locks before Break, Press Advantage on cooldown, Second Cup below
70% Patience. A naive basic-attack bot scores near-zero day clears — these numbers are not
policy-independent and should never be quoted without the policy.

| Party | Slot 0 | Slot 1 | Slot 2 | Slot 3 | Slot 4 | Full day cleared |
|-------|--------|--------|--------|--------|--------|------------------|
| Andrew alone | 93–96% | 83–90% | 74–79% | 67–70% | — | **51–57%** |
| + one ally | 99–100% | 96–99% | 93–97% | 88–91% | 71–85% | **78–85%** |
| + two allies | 99–100% | 99–100% | 97–99% | 94–96% | 84–89% | **72–79%** |

Every rung sits inside the 40–85% band. It takes **two dials**, not one, and the sim is what says so:

- **`partyEscalationScale`** `[0.72, 1.60, 2.60]` — how steeply the client stats climb per slot, by
  party size. Solo climbs shallower; a full bench climbs much harder.
- **`partyDayLength`** `[[3,4], [3,5], [4,6]]` — how many clients are booked, by party size. This
  is the load-bearing dial for a full bench: `node tools/day-sim.mjs --pscale 1.35,1.90,2.40` moves
  the two-ally clear rate by under two points across that entire range (96.4% / 98.0% / 94.4% at
  L8), because three combatants beat a stat block no matter how large the stat block is. What a
  party does not beat is the clock, so Diane books them a longer one.

A solo day tops out at four clients, which is why Andrew alone has no slot 4, and Diane says the
quiet part out loud before a solo player stakes a board. Every value above lives in `DAY_BALANCE` in
`src/data/billableDay.js` and can be overridden from `balance.json` under a `billableDay` key.

### The closing premium — why a day is worth staking

Escrowed AUM is **multiplied at the bell**. Without this the Billable Day was a strictly worse deal
than walking in clients one at a time: the same fees, but with a ~50% solo forfeit rate, only a 20%
victory heal, and escalating opponents. A risky mode has to pay a risk premium.

| Line item | Value |
|-----------|-------|
| Board Completion Adjustment | +20%, for closing the whole board rather than walking off |
| Full Conversion Supplement | +15%, when every client on the board signed |
| Discretionary Hours Retention | up to +20%, proportional to the share of Billable Hours left unspent |

Maximum ×1.55; a typical closed day lands around **×1.43**. The Hours line is the interest analogue:
Hours you spend on boons buy safety, Hours you keep buy money, and both are live on every
between-clients screen. The breakdown is itemised on the 5:15 summary — a premium you cannot see is
the same as no premium.

Measured effect (`node tools/day-sim.mjs --days 1200`), AUM per fight versus walk-in spam.
**Two columns, because whales are not a rounding error — they are roughly half the money.**

| Party | Day clear | AUM/fight, whale-free core | AUM/fight, whales included | XP/fight |
|-------|-----------|----------------------------|-----------------------------|----------|
| Andrew alone | 52–59% | **×1.12 – ×1.14** | ×0.87 – ×1.03 | ×1.06 – ×1.10 |
| + one ally | 74–83% | **×1.38 – ×1.52** | ×1.28 – ×1.40 | ×1.22 – ×1.25 |
| + two allies | 69–78% | **×1.35 – ×1.53** | ×1.08 – ×1.40 | ×1.27 – ×1.35 |

**Read the two columns against each other, and read the solo row first.** The core column is the
low-variance estimator and it is above 1.00 everywhere. The whale-inclusive column is the one a
player actually experiences, and with a party it is clearly positive; **solo it is a coin flip
(×0.87–×1.03)**, because a solo board forfeits about 45% of the time and a forfeited board voids a
whale's $1M–$2.5M fee that a walk-in would have banked on the spot. Recruiting is the answer, Diane
says so out loud before a solo player stakes a board, and it is now written down here as well.

#### The whale audit

`node tools/day-sim.mjs --whale 30000 --levels 8` measures the generator with no combat in the way:

| | Whale rate | Whale share of gross AUM | AUM per client |
|---|---|---|---|
| walk-in | 5.05% | 60.4% | $144,488 |
| day slot 0 | 4.97% | 60.5% | $144,256 |
| day slot 1 | 5.17% | 57.3% | $158,536 |
| day slot 2 | 4.87% | 49.7% | $169,347 |
| day slot 3 | 5.28% | 48.1% | $192,795 |
| day slot 4 | 4.90% | 43.4% | $198,243 |

Expected whales per five-slot day: **0.252**. Per five walk-ins: **0.252**. Identical, which is the
point of the audit — and it was **not** true until this pass. `generateDayClient` meets each slot's
asset floor by rejection sampling (up to 12 re-rolls), and the 5% whale roll used to fire inside
that loop; because a whale always clears the floor and breaks the loop, the effective rate climbed
with the slot: **4.70 / 6.45 / 7.95 / 10.17 / 12.35%** against 4.08% for a walk-in, or ~0.42 whales
per day against ~0.20 per five walk-ins. The whale is now rolled **once per slot** before the loop.
The day's higher AUM per client in the later slots is the asset floor doing its job, not the
sampler; the whale share falls across the slots for exactly that reason.

### Records

Closing a day writes four lifetime records, shown in **BILLABLE DAY RECORDS** in the Stats tab
alongside Reception Records: Days Closed, Highest Daily AUM, Largest Board Closed, Most Hours
Earned. Three achievements ride on the bell — Billable Human (first day closed), Full Conversion
Event (every client signed), Fully Utilized (a five-client day).

### Quarterly reviews and the day

The quarterly review fires when the book of business has grown by five clients since the last one.
Inside a day the book does **not** grow one client at a time — signed clients ride in escrow with
the fee and join the book in one lump at the bell, so the trigger is a high-water mark rather than a
"multiple of five" test. A day that adds +5 clients at once still fires exactly one review.

### Post-Game Tier 5 (after defeating The Algorithm)

Once The Algorithm is defeated, the reception roster upgrades to elite clients. Diane will let you know.

- **Client pool:** UHNWI, Sovereign Wealth Consultant, Offshore Dynasty, Corporate Pension Fund, Tech Billionaire Exit (assets 20M–100M)
- **Win combat:** 200–350 XP (formula: `Math.round(200 + t * 150)` against a 100M asset ceiling)
- **Accept/Decline:** Same rules as normal reception
- **Billable Days** work identically; the day's wealth floor scales against the 100M ceiling instead
  of 25M, so a post-game closer is drawn from the top of the elite pool

This is the intended path to level 15.

---

## Office Renovations (Post-Game)

After defeating The Algorithm, a **Renovations** tab appears in the Supply Shop. Renovations are one-time purchases that permanently alter specific rooms with new furniture. Each costs **5,000,000 AUM** (except the Penthouse upgrade at **10,000,000 AUM**) and grants **+2,000 XP**.

| ID | Room | Name | Description |
|----|------|------|-------------|
| `renovation_espresso_bar` | Break Room | Espresso Bar | Professional barista station |
| `renovation_catering_fridge` | Break Room | Executive Catering Wall | Premium fridge and snack shelving |
| `renovation_ergonomic_workstations` | Cubicle Farm | Ergonomic Workstations | Plants and ergonomic additions |
| `renovation_marble_counter` | Reception | Marble Reception Counter | Premium planters and stonework |
| `renovation_lobby_sculpture` | Reception | Lobby Sculptures | Commissioned bronze pieces |
| `renovation_projection_wall` | Conference Room | Smart Projection Wall | Full AV display wall |
| `renovation_corner_office` | Skip's Office | Corner Office Renovation | Grand paintings and executive furnishings |
| `renovation_trophy_wall` | The Board Room | Victory Trophy Wall | Trophy cases, stock ticker, whiskey wall |
| `renovation_penthouse` | The Penthouse | Executive Suite Upgrade | **10M AUM** — unlocks three wing rooms: The Reef & Reel, Analytics Suite, Private Lounge |

### Penthouse Expansion

Purchasing `renovation_penthouse` transforms the penthouse into a four-room hub:

- **Penthouse** (penthouse_expanded, 22×16): Executive hub with kitchen, desk cluster near server racks, conference table, and exits to all three wings.
- **The Reef & Reel** (penthouse_aquarium): Two flanking aquarium walls and a floor-to-ceiling movie screen showing a dusk cityscape scene. Warm ambient lighting. Popcorn popper in the corner.
- **Analytics Suite** (penthouse_analytics): 12.5-wide mega screen across the north wall with live market data, network topology, and system status panels. Five gunmetal mission control consoles in a gentle arc with futuristic operator chairs — NASA-style.
- **Private Lounge** (penthouse_bar, 18×12): Full bar with marble top and purple-backlit liquor wall. Two neon "TRUST ISSUES" signs. NW cigar lounge with humidor, leather armchairs, and coffee table. NE poker table (octagonal, 5 seats). Central pool table. Two VIP booth areas with L-shaped couches and coffee tables.

---

## Item Reference

| Item | Effect | How to get |
|------|--------|-----------|
| Large Coffee | Restores 30 Coffee | Diane (reception desk), Break Room coffee machine |
| Antacid | Restores 40 Patience | Diane's desk drawer, Janitor (Act 4) |
| Energy Drink | Restores 20 Coffee + SPD +3 for 3 turns | Anomaly subquest reward |
| Stress Ball | Restores 60 Patience | Compliance Auditor (post-combat) |
| Compliance Manual | DEF +5 for entire battle | Compliance Auditor (mid-story) |
| Vending Fortune | Restores 10 Patience | Break Room vending machine |
| Due Diligence Memo | Reveals the target's weakness tag, resistance tag, unbroken locks on the telegraphed move, and current Composure | Standard Audit Kit (Performance Review, 1 Review Point) |

---

## Achievements

Achievements are tracked across all saves and viewable in the Pause Menu → Achievements tab. They unlock automatically when the condition is met — no manual claim needed.

### Act Completions

| Icon | Name | How to Unlock |
|------|------|---------------|
| ⚔ | First Blood | Win any combat |
| 🏆 | Family Meeting Over | Defeat all three Hendersons |
| 📎 | First Day Jitters | Complete Act 1 — receive your assignment from Skip |
| ⚖ | The Bill Comes Due | Complete Act 2 — survive the Executive Floor reckoning |
| 🗂 | Follow the Money | Complete Act 3 — uncover the truth in the Archive |
| 📜 | The Building Has Spoken | Complete Act 4 — retrieve the 1947 charter from the Vault |
| 🏢 | Hostile Takeover Blocked | Complete Act 5 — defeat Meredith and drive out the restructuring team |
| 🤝 | United We Stand | Complete Act 6 — rally the team and secure the Janitor's Rolex |
| 💻 | Trust Issues Resolved | Complete Act 7 — defeat The Algorithm |
| 🖋 | The Countersignature | Act 6½ — get the charter certified by the Recorder's living deputy |
| ✉ | Served | Defeat The Firm in the first vault |
| 🖥 | One More Rememberer | Document Process 7 (post-game, Server Room rack 7) |
| 🕯 | A Finished Shift | Let Process 7 reconcile its last timestamp |
| 🔁 | Lap Two | Start New Game+ |

### Combat Mastery

| Icon | Name | How to Unlock |
|------|------|---------------|
| ⚡ | Assert Dominance | Use Assert Dominance (requires 100% Confidence bar) |
| 🛡 | Brace for Impact | Successfully execute the Brace QTE |
| ↩ | Counter-Offer | Retaliate immediately after a successful Brace |
| 🎯 | Due Diligence | Hit an enemy with an ability that matches their weakness tag |
| 🌀 | Second Opinion | Use Second Wind (requires 50% Confidence bar) |
| 🎲 | Nothing to Lose | Use Desperate Gamble (available when HP drops below 25%) |
| 💀 | All In | Choose the All In option on Desperate Gamble |
| 🔗 | Follow Through | Land a Follow Through combo hit (attack an enemy with an active debuff) |
| ✋ | Perfect Form | Hit the exact center of the Brace QTE bar for a Perfect rating |

### Leveling

| Icon | Name | How to Unlock |
|------|------|---------------|
| 📈 | Mid-Level Associate | Reach level 5 |
| 📊 | Senior Associate | Reach level 10 |
| 👔 | Trust Officer | Reach level 15 (maximum level) |

### Roguelite

| Icon | Name | How to Unlock |
|------|------|---------------|
| 💼 | First AUM | Accept your first reception client |
| 📁 | Growing Portfolio | Accept 10 reception clients |
| 📋 | Dedicated | Accept 25 reception clients |
| 🛒 | Retail Therapy | Buy anything at the Supply Shop in the Break Room |
| 🛍 | Supply Run | Buy from all three shop categories (consumable, upgrade, decor) |
| 💰 | AUM Millionaire | Accumulate 1,000,000 total AUM from accepted clients |
| 🚪 | Hard Pass | Decline a client after winning combat |
| ⭐ | Dream Client | Accept a client with no negative attributes |
| 💸 | High Roller | Accept a client with 5,000,000+ in assets |
| 🅿 | Honorary Gray Area | Win the Meter War — beat Officer Reyes three times |
| 🚌 | The 5:15 Runs On Time | Recover Marlene's transfer ledger |

---

## Cosmetics

Cosmetics are equipped in the Pause Menu → Cosmetics tab. Each item occupies one of four slots: **hat**, **glasses**, **badge**, **accessory**. Stat bonuses from equipped cosmetics apply in combat. Only one item per slot can be equipped at a time.

### Hats

| Item | Stat Bonus | How to Unlock |
|------|-----------|---------------|
| Accountant's Visor | +1 DEF | Available from the start |
| Party Hat | +1 SPD | Defeat Karen Henderson (Act 2) |
| Tin Foil Hat | +2 DEF | Enter the Archive for the first time (Act 3) |
| Executive's Fedora | +2 ATK | Visit the Executive Floor for the first time (Act 2 Finale) |

### Glasses

| Item | Stat Bonus | How to Unlock |
|------|-----------|---------------|
| Reading Glasses | +1 ATK | Available from the start |
| Blue Light Blockers | +1 DEF, +1 SPD | Complete The 3:47 AM Anomaly subquest (Alex IT) |
| Power Shades | +2 ATK | Defeat Chad Henderson (Act 2) |

### Badges

| Item | Stat Bonus | How to Unlock |
|------|-----------|---------------|
| Intern Badge | +5 HP | Defeat The Intern (Act 1 tutorial) |
| Compliance Pin | +2 DEF | Defeat the Compliance Auditor (Act 2 Finale) |
| Certificate of Appreciation | +3 DEF | Performance Review — 3 Review Points |
| Corner Office Key | +2 ATK, +2 DEF | Defeat Skip Hartley (Act 2 secret ending only) |

### Accessories

| Item | Stat Bonus | How to Unlock |
|------|-----------|---------------|
| Stress Ball (Belt Clip) | +5 HP | Available from the start |
| Ergonomic Wrist Support | — (+40% Brace window, −20% Retaliate damage) | Available from the start |
| Fountain Pen | +2 ATK | Defeat the Regional Manager (Act 2 Finale) |
| Janitor's Keyring | +3 SPD | Confront the Janitor about his past (Act 3) |
| Golden Calculator | +3 ATK, +5 Coffee | Defeat the Regional Director (Act 7, penthouse chain) |
| SVP-Grade Tumbler | +2 ATK, +5 Coffee | Performance Review — 5 Review Points |

---

## Attributes

Andrew has five combat stats. Each levels up automatically and can also be boosted through the shop, posters, and quest rewards.

### Base Stats (Level 1)

| Stat | In-game name | Starting value | Per level |
|------|-------------|---------------|-----------|
| HP | Patience | 100 | +12 |
| MP | Coffee | 75 | +10 |
| ATK | Assertiveness | 12 | +2 |
| DEF | Composure | 10 | +2 |
| SPD | Bureaucratic Efficiency | 8 | +1 |

---

### HP — Patience

Your health bar. Reaches zero and you lose the fight.

- Restored by items (Antacid, Large Coffee, Stress Ball), the **Second Wind** momentum move (restores 25% max HP), and a full rest after every story combat victory.
- Damage formula: `max(1, floor((ATK + power) × 1.5 − DEF × 0.5 ± rand(3)))`, then modified by weakness/resistance, vulnerability, and combo multipliers.

---

### MP — Coffee

Your ability resource. Abilities cost Coffee to use; basic Attack does not.

- Restored by Large Coffee items and the **Second Wind** momentum move.
- Runs out: you can still Attack, Brace, and use items — just no special abilities.

---

### ATK — Assertiveness

Raw damage output. Every point of ATK feeds directly into the damage formula.

- Basic Attack damage ≈ your ATK stat (no ability power bonus).
- Ability damage = `ATK + ability power`, so higher ATK scales all abilities.
- Reduced temporarily by enemy debuff moves (e.g. Grandma's cookie).
- Boosted by the Confidence bar's **Assert Dominance** power move (ignores 75% of enemy DEF on that hit).

---

### DEF — Composure

Damage reduction. Each point of DEF reduces incoming hits by 0.5 (via `DEF × 0.5` subtracted from raw damage, minimum 1).

- Temporarily increased by **Brace** (QTE mini-game; halves the next incoming hit on any quality).
- Temporarily reduced by enemy debuff abilities (Pattern Recognition, Quarterly Target, etc.).
- The **Press Advantage** momentum move applies a −5 DEF debuff to the enemy for 2 turns.
- A **perfect** Brace also strips 20% of the target's Composure bar (see below) — bracing is a
  route to a Break, not just damage mitigation.

---

### SPD — Bureaucratic Efficiency

Affects two things:

1. **Flee success rate:** `40% + (your SPD − enemy SPD) × 5%`. Higher SPD than the enemy makes escaping easier; lower SPD makes it harder.
2. **Press Advantage cost:** The momentum cost to use Press Advantage scales down with SPD. Formula: `max(25%, 40% − floor((SPD − 8) × 0.5))`. At base SPD 8 the cost is 40%. At SPD 38+ the cost floors at 25%. (It was priced at 25–15% when it ended your turn; it no longer does, so it costs more.)

| SPD | Press Advantage cost |
|-----|---------------------|
| 8 (base) | 40% |
| 12 | 38% |
| 16 | 36% |
| 22 | 33% |
| 30 | 29% |
| 38+ | 25% (minimum) |

---

### Momentum — Confidence

Not a stat but a combat resource (0–100). Gains from hitting, landing crits, exploiting weaknesses, and Follow Through combos.

| Threshold | Move | Cost | Ends your turn? |
|-----------|------|------|-----------------|
| SPD-scaled | **Press Advantage** | 25–40% | **No** — free action, once per turn |
| 50%+ | **Second Wind** | 50% | Yes |
| 100% | **Assert Dominance** | Resets to 0 | Yes |

Press Advantage: moderate attack + −5 DEF debuff on enemy for 2 turns. **It does not consume your
action** — it slots between actions, so momentum reads as tempo rather than a damage battery. Capped
at once per turn.  
Second Wind: restores 25% max HP, clears one status condition.  
Assert Dominance: ignores 75% of enemy DEF on that hit.

---

## Locks — the telegraph names its own counter

Every enemy telegraph you see is a **promise**: once an enemy has decided on a move, it will not
re-roll. Some of those moves arrive carrying **objections** — a row of damage-type chips under the
enemy's HP bar naming the ability tags that can cancel them.

- Land a hit with a **matching tag** before the enemy acts and that chip is struck through.
- Clear **every** chip and the move **is voided**: it never happens and the enemy's turn goes with it.
- Clear **some** of them and the move still lands, **30% weaker per chip cleared**.
- Basic Attack is untagged and clears nothing. Tagged **abilities** — yours *and your allies'* — are
  the currency. This is what makes carrying one ability per damage type worth the upgrade points.

Which moves carry objections is fixed and learnable, not random:

| Rule | Effect |
|------|--------|
| Power 20–33 | 1 objection |
| Power 34+ | 2 objections |
| Stun / Confuse / Counter | 1 objection |
| Per-enemy cap | at most a third of the kit (heaviest moves first), minimum one |
| Tag choice | fixed per ability id — the same move always demands the same types |
| Single-objection moves | never ask for the tag the enemy is already **weak** to |

That last rule matters: you cannot spam one weakness ability and void an enemy's whole kit. A lone
objection is always a *second* type you have to have brought with you.

`technical` is only demanded by enemies actually weak to it (it is quest-gated for Andrew via
Legacy Admin, and Alex from IT carries it). Authors can override any of this per move with
`locks: ['legal','audit']` or `lockCount: 2` in `ENEMY_ABILITIES`, or through the
`enemyAbilities` block in `balance.json`.

---

## Composure (enemy) — the Break bar

Under each enemy's HP bar sits a second, smaller bar. It is that enemy's **Composure**, and it moves
for exactly one reason: **hits that exploit their weakness** — plus, if you have bought them,
the Practice Group nodes that issue Composure some other way (see PRACTICE GROUPS below).

**And the weakness moves.** Chad, Grandma, Meredith Sterling and the Regional Director are open to a
DIFFERENT practice area in each phase of the fight. The bar's label changes with them, on the frame
the phase turns, so the information is never hidden — but the button you have been pressing stops
being the right one. Karen does not do this: she is the tutorial boss and she teaches exactly one
thing. Neither does the Algorithm: it already modelled you, and it does not care what you say twice.

- Bar size is 60 / 90 / 120 depending on the enemy's HP tier — **2, 3 or 4 weakness hits** to empty.
  Chad and the Corporate Lawyer are authored down to **60**: Chad is the fight where Breaking is the
  lesson, and a smaller bar is the only way to teach it. (The bar can be made SMALLER to make Breaking
  the lesson. It cannot be made BIGGER to make anything else the lesson — raising one enemy to 180 was
  measured and it deletes the Break economy for every build at once.)
- Each weakness hit takes 30 off it. A **perfect Brace** takes another 20% of the bar's maximum.
- **While the bar has anything left in it, your damage is ×0.9.** That standing tax is the point:
  Breaking is not a bonus, it is when your real damage turns on.
- Empty the bar and the enemy **loses their next turn** and takes **+20% damage** until they recover.
  Their Composure refills as they do.
- A Break also leaves them **VULNERABLE**: the first hit you land afterwards deals **×1.5** on top of
  everything above, and clears the flag. The window is armed to survive the turn the enemy loses, so
  it is still open when you next get to act — the swing that broke the bar is deliberately excluded
  from it, so breaking and cashing in are two separate hits and the Break is never a self-consuming
  bonus. Squander the turn and the window shuts; it never carries into a second one.

**The tax is a reframing, not a nerf.** Player and ally damage against anything with a Composure bar
also carries a flat ×1.13 baseline raise, so the arithmetic against a pre-Break enemy comes out at
**exactly the damage the game did before Composure existed** — a player who never engages with the
system is not being quietly taxed 10% for ignoring it. Breaking then pays **+33%**, not +20%.
Measured with `node tools/combat-sim.mjs --dps` (basic attack, Karen, L7, 60k samples):

| Configuration | Unbroken | vs baseline | Broken | vs baseline |
|---------------|---------|-------------|--------|-------------|
| No band at all (pre-Composure) | 30.21 | 1.000 | 35.99 | 1.192 |
| Tax alone, no compensation | 26.94 | 0.892 | 36.00 | 1.192 |
| **As shipped** | **30.22** | **1.000** | **40.38** | **1.337** |

Authorable per enemy as `maxComposure` in `ENEMY_STATS` (and therefore through the `enemies` block
in `balance.json`). Setting `maxComposure: 0` removes an enemy from the system in both directions —
no tax, no compensation, no Break.

### Objections and Composure are two budgets, not one

This is the most important thing to know about both systems and it is deliberate: **a single
objection never asks for the tag the enemy is weak to.** So the swing that cancels their move is
almost never the swing that empties their Composure. Andrew gets one tagged hit a turn. He has to
pick.

The trade is close to total, not marginal, and it is measurable:
`node tools/combat-sim.mjs --trade --runs 300` runs the same policy twice, differing in one line —
LOCK-FIRST chases objections, BREAK-FIRST refuses to spend its tagged hit on them.

| Encounter (lvl) | Policy | Win | Breaks/fight | Objections cleared |
|-----------------|--------|-----|--------------|--------------------|
| Karen, 4 | LOCK-FIRST | 96.3% | 0.38 | 63.6% |
| Karen, 4 | BREAK-FIRST | 83.7% | 0.81 | **0.0%** |
| Grandma, 8 | LOCK-FIRST | 99.7% | 0.81 | 81.9% |
| Grandma, 8 | BREAK-FIRST | 98.3% | 0.96 | **0.0%** |
| Meredith Sterling, 9 | LOCK-FIRST | 99.7% | 0.29 | 76.7% |
| Meredith Sterling, 9 | BREAK-FIRST | 93.3% | 1.01 | **0.0%** |
| The Algorithm, 10 (+2 allies) | LOCK-FIRST | 98.7% | 0.76 | 80.6% |
| The Algorithm, 10 (+2 allies) | BREAK-FIRST | 99.0% | 1.00 | **42.9%** |

Three of those four BREAK-FIRST rows clear **zero** objections while roughly doubling or tripling
the Break count. The systems are not additive; they are alternatives.

- **Solo Andrew** is choosing which of the two he plays this fight. Cancelling the big swings is a
  survival plan; Breaking is a damage plan, and it costs 6–13 points of win rate on the two bosses
  whose haymakers are the reason you would ever cancel anything.
- **A party is how you get both**, and the last row is the proof: with Janet and Isaiah on the
  bench, a BREAK-FIRST Andrew still clears 42.9% of the objections, because the allies swing tagged
  abilities on their own turns. That is the mechanical argument for recruiting people, underneath
  the story one.

Andrew says this out loud, once, the first time he is shown a locked move on an enemy with a
weakness and a Composure bar. It is not left for the player to infer.

---

## Escalated to Committee — the denial tax

Voiding a telegraph (all Locks cleared) takes an enemy's turn. Breaking their Composure takes
another. Stacked, a player reading correctly can take a boss's entire kit away and never be touched.
The building has an answer.

- Every turn taken away from an enemy — a voided move, a Break, a silence — counts as a **denial**.
- On the **second consecutive denial** the enemy stops improvising: its next telegraphed move is
  **SEALED**. The objections are still shown, but none of them can be cleared, and its Composure will
  not move while the seal holds.
- A sealed move also lands at **×1.35**. It is the one move in the fight the player was given no
  answer to, so it is the one that hurts — that is what the enemy gets back for the turns it lost.
- The seal clears the moment the sealed move resolves. The counter resets whenever the enemy gets
  to act.

It is announced in the combat log, badged on the telegraph row, and has a one-time teach line the
first time it happens. It is a rule, not a gotcha.

This is a deliberate deviation: it is in none of the comps and was not in the design brief. It
exists to price the fizzle+Break stack, and a seal can only fire against a player who has already
taken two consecutive turns away — a basic-attack policy never sees it.

Measured, `node tools/combat-sim.mjs --denial-ab 1.0,1.35,1.6` (400 runs/cell, competent policy,
Andrew's HP at victory):

| Encounter | Denial off | ×1.00 | ×1.35 (shipped) | ×1.60 |
|-----------|-----------|-------|-----------------|-------|
| Meredith Sterling, L9 | 78.3% | 76.7% | 76.5% | 76.4% |
| The Algorithm, L10 | 65.3% | 66.0% | 65.7% | 65.4% |
| Grandma Henderson, L8 | 90.5% | 90.6% | 90.9% | 90.8% |

Read that honestly: **the seal premium is legibility, not a difficulty dial.** A seal fires once or
twice a fight, so ×1.35 is worth tenths of a point of margin. `DENIAL_LIMIT` is the lever that
actually moves the ceiling (78.3% → 76.7% on Meredith) and it is deliberately small. Neither number
should be raised expecting a harder game; raising the seal premium only manufactures unanswerable
burst, which is the one thing Sandfall's "no frustrating deaths" rule forbids.

### What the difficulty band actually looks like

The 40–85% win-rate band that gets quoted at this game **cannot be met by one stat dial**, because
the spread between how a first-time player fights and how an optimal one fights is roughly 50 points.
`node tools/combat-sim.mjs --runs 500` and `--casual`, at each encounter's intended level:

| Encounter (intended level) | CASUAL policy | CASUAL + PIP filed | COMPETENT policy |
|----------------------------|---------------|--------------------|------------------|
| Karen, L4 | 49.0% | 77.8% | 96.2% |
| Chad, L6 | 74.8% | 97.9% | 100.0% |
| Grandma, L8 | 24.8% | 61.2% | 100.0% |
| Restructuring trio, L8 | 90.6% | 99.9% | 99.8% |
| Meredith Sterling, L9 | 28.4% | 71.5% | 98.0% |
| Regional Director, L10 | 57.0% | 91.1% | 100.0% |
| The Algorithm, L10 | 86.8% | 95.2% | 99.4% |

The middle column is the same CASUAL policy with the Performance Improvement Plan filed at its
weakest setting — zero recorded defeats, 20% resistance — from `--pip --runs 6000`; the ladder it
comes from is below. It is the column that carries the floor, and it only ever reaches a player who
knows the plan exists, which is why the game now files the form at them (next paragraph).

CASUAL is basic attacks plus the free heal and Assert Dominance when the bar fills on its own —
no tags, no Locks, no Composure, no Brace. NAIVE (basic attacks and nothing else, no sustain) wins
**0%** of every story fight except The Algorithm. Buying enough enemy stats to push the COMPETENT
column into the band would put the CASUAL column at zero, so the design position is explicit:
**this game prices the ceiling with denial, not with stats**, and the honest claim is not "smart play
wins 60% of the time" but "smart play stops finishing untouched" — Andrew's HP at victory against
Meredith went 96.2% → 76.5% and against The Algorithm 87.5% → 65.7% across this pass.

#### The floor half of the band

The argument above defends the **ceiling** end of 40–85% and says nothing about the floor, and on
the floor the table above fails at the *low* rung of every documented intent band (CLAUDE.md:
Karen 3–4, Chad 5–6, Grandma 7–8). The instrument for that end is the **Performance Improvement
Plan** — opt-in, free, 20% damage resistance rising 2% per recorded defeat to a cap of 80%.
`node tools/combat-sim.mjs --pip --runs 6000` and `--pip 1 --runs 6000`, CASUAL policy throughout:

| Encounter (lvl) | PIP unfiled | filed, 0 deaths (20%) | 1 (22%) | 5 (30%) | 10 (40%) | 20 (60%) | 30 (80%) |
|-----------------|-------------|-----------------------|---------|---------|----------|----------|----------|
| Karen L3 | 17.1% | 61.3% | **63.7%** | 74.1% | 85.4% | 99.8% | 100.0% |
| Karen L4 | 47.4% | 77.8% | **79.1%** | 85.9% | 94.2% | 100.0% | 100.0% |
| Chad L5 | 60.3% | 94.3% | **97.6%** | 99.8% | 100.0% | 100.0% | 100.0% |
| Chad L6 | 74.6% | 97.9% | **98.4%** | 99.6% | 100.0% | 100.0% | 100.0% |
| Grandma L7 | 5.5% | 37.6% | **42.2%** | 55.5% | 69.9% | 98.7% | 100.0% |
| Grandma L8 | 23.8% | 61.2% | **63.8%** | 71.0% | 83.4% | 99.9% | 100.0% |
| Restructuring trio L8 | 88.8% | 99.9% | **99.8%** | 100.0% | 100.0% | 100.0% | 100.0% |
| Meredith Sterling L9 | 26.9% | 71.5% | **76.6%** | 90.5% | 99.1% | 100.0% | 100.0% |
| Regional Director L10 | 58.8% | 91.1% | **94.5%** | 98.0% | 99.0% | 100.0% | 100.0% |
| The Algorithm L10 | 86.5% | 95.2% | **95.6%** | 97.5% | 99.4% | 100.0% | 100.0% |

The bolded column is the one that matters, and it is bolded rather than the 0-death column for a
mechanical reason: **the plan is surfaced by losing.** `player.deaths` has already incremented by
the time the offer reaches anyone, so 22% is the weakest resistance a player can actually arrive
with. At that setting the PIP clears the 40% floor on every row — including Grandma at L7, which
is 5.5% unassisted. It climbs from there for the player who keeps losing, which is the point:
Hades' God Mode is the model and its whole argument is that the aid should find you.

One row does need saying out loud: **filed cold on an untouched save, Grandma L7 sits at 37.6%**,
just under the line. Nobody reaches that cell by the intended route, but the honest reading is that
the floor instrument is worth about two points less than the round number suggests at its
theoretical minimum, and it is Grandma who exposes it.

**How the plan finds you.** A free item in a shop tab is not an accessibility feature if the player
who needs it never opens the tab, and the two worst cells above (Karen L3 at 17.1%, Grandma L7 at
5.5%) belong to exactly the player least likely to be browsing Employee Development. So the building
files the form at them: on any **story-boss defeat**, once per boss and never again once the plan is
on file, a HUD toast reads

> Per policy, a Performance Improvement Plan has been placed in the Break Room's Performance Review
> tab. Participation is voluntary.

It is suppressed on the scripted first-Karen loss (that beat has its own tutorial) and on the
reception roguelite loop (`ExplorationState._offerPIP`). It states the item, the room and the tab,
and it does not ask twice.

Two honest caveats. **The shipped default is still unassisted**, so the unfiled column is what an
untouched save plays and it is the column the ceiling argument above is about. And the PIP pushes
several rows past 85% at higher death counts — that is not a band failure, it is the aid working;
Hades caps God Mode at 80% resistance for the same reason and locks out nothing for using it.

#### The relic slot

A second, smaller P1.6 instrument, because forgiveness is supposed to ship as **loot with a
tradeoff**: the **Ergonomic Wrist Support** (accessory, available from the start) widens the Brace
timing window by 40% and takes 20% off Retaliate's damage. Measured
(`node tools/combat-sim.mjs --relic --runs 300`, COMPETENT policy, two aim models):

| | Brace split, unequipped | Brace split, equipped | Win-rate delta |
|---|---|---|---|
| steady hands | perfect 15% / good 70% / miss 15% | perfect 26% / good 62% / **miss 12%** | −2.3 to +2.3pp |
| shaky hands | perfect 5% / good 40% / miss 55% | perfect 11% / good 45% / **miss 43%** | −0.7 to +0.7pp |

Report that result as it came out: **it is a feel item, not a power item.** Every win-rate cell is
inside sampling noise, because the COMPETENT policy is already at the ceiling on all ten rows and
has no headroom to show a defensive sidegrade. What the relic actually buys is measurable in the
left columns — a shaky-handed player misses the Brace 43% of the time instead of 55% — and it is
paid for out of Retaliate, which is the reward Brace arms. That is the trade, stated in both
directions.

---

## Desperate Gamble — three real options

Available when Patience drops below 25%. All three are honest bets; none of them dominates.

| Option | Outcome | Expected damage | Consolation |
|--------|---------|----------------|-------------|
| **Safe Bet** | Always lands | ×1.00 | — |
| **Risky** | 60% for ×1.5, else ×0.5 | ×1.10 | — |
| **All In** | 40% for ×2.7, else nothing | ×1.08 | +25 Confidence on the whiff |

Measured with `node tools/combat-sim.mjs --gamble` (200k samples): ×1.000 / ×1.097 / ×1.078, and
All In banks an average of 15 Confidence across all outcomes. Risky is the marginal EV pick, All In
is the swing with a floor under it, Safe is the low-variance pick when a whiff means dying. The
original All In was 30% for ×2.5 — expected value ×0.75, a strictly bad bet with an achievement
attached to it.

---

## Loop In — handing off the follow-up

When Andrew lands a **weakness hit** and a recruited ally is in the fight, he is offered the chance to
**Loop In** that colleague. Take it and they act immediately for **+50% damage**, then they are spent
for the round. Andrew banks +10 Confidence for the handoff. Once per turn.

Declining costs nothing — the turn simply continues.

---

## Confusion — what it actually does

Confusion **never takes your action away.** The move you picked always happens. What it does instead:

- **50% chance** (in fights with more than one enemy) your hit lands on the **wrong target**.
- **Always**: the action arrives at **65% force** — damage *and* healing.

Second Wind clears it. So does the Litigator's voice action.

---

## The Vault Keypad — the knowledge gate

Every other lock in the building is a flag check: the game asks whether a boolean was set. The
Vault door asks *you*.

**TWO doors take the code, and both of them have to.** The Vault opens off exactly one room — the
Archive — and the Archive was itself flag-gated on `archive_accessible`, which the story does not
set until the Act 3 Alex-from-IT conversation. A keypad on the inner door alone was a knowledge gate
nested inside a flag gate, i.e. still a flag gate: "you can open the Vault in Act 1" was a promise
the *map* could not keep no matter what the keypad accepted, and the real sequence break was one act
(the charter in Act 3 instead of Act 4). Tunic's verified structural fact is that every sealed door
opens from minute one; that only holds here if every door on the route does.

| Door | Where | Panel |
|------|-------|-------|
| Stairwell service door | Steel fire door, bottom landing of the stairwell → Archive | CORBIN RESTRICTED ACCESS OVERRIDE. Sets `archive_accessible` (+ `archive_cracked_early` before Act 3). |
| Vault door | East wall of the Archive | MOSLER SEQUENTIAL ACCESS TERMINAL. Sets `vault_accessible` and all three combination flags (+ `vault_cracked_early` before the Rolex). |

Both accept the same three-dial combination **at any point in the game, in any act, regardless of
story flags** — one service override sequence for the whole building, which is both the joke and the
fix. The numbers are genuinely in the world from the first room of the game: the circuit panel in
the Janitor's supply closet in the parking garage. An attentive first-timer really can walk from
that supply closet to the charter in Act 1. A second-time player always can.

- Both story paths are untouched. `alex_it_act3` still sets `archive_accessible` and `janitor_act4`
  still hands over the Rolex and sets `vault_accessible`; players who get there the normal way never
  see either keypad.
- Cracking either one early fires a one-time inner monologue and records the flag, so later dialog
  can notice.
- Taking the charter early does **not** skip to Act 5 — the Restructuring trio cutscene also
  requires `act3_complete`. The sequence break gives you the object early; it does not skip acts.
- `archive_accessible` resets on New Game+ like every other story flag, which is the point: the
  knowledge does not, so a second lap can walk down the stairwell on the first morning.

The route is walkable with no other gate on it — `parking_garage → reception → cubicle_farm →
stairwell → archive → vault` are all real exits in `src/data/rooms/index.js`. And the claim is
checked rather than asserted: `node tools/knowledge-gate-check.mjs` (with a dev server on 5174)
starts a brand-new save in the parking garage at `actIndex 0`, **types** 47-19-82 into both keypads
the way a player would, and ends standing in the Vault. It deliberately does not teleport with
`_changeRoom` from a dev fixture, because that bypasses the gate under test — which is exactly how
the previous version of this claim got published while being false.

---

## Practice Groups — your development plan

The Abilities tab is not a shopping list. It is three career tracks at **nine points each**, plus an
eight-point shared pool, against **one upgrade point per level-up** — fourteen in a whole lifetime,
with twelve more points of ally abilities competing for the same fourteen.

> **PRACTICE GROUPS** — Your development plan. Points are allocated at the discretion of your
> reviewing manager, which is to say yours. Reallocation is available at any time under the
> department's flexible-staffing policy and does not appear on your permanent record.

**The trunk is free and every track keeps all of it**: File Motion (legal), Raise Concerns (social),
Spot Check (audit), Coffee Break, Stall. No build choice can ever lock you out of a boss's weakness.
The tracks change *how well* you exploit it, never *whether* you can.

**LITIGATION & ENFORCEMENT** — *You are not here to be liked. You are here to be correct, on the
record, in writing, and in a font the court accepts.*
Burst and turn economy. **Aggravating Factors** (weakness hits bank +10 Confidence, Press Advantage
costs 10 less) → **Cite Precedent** → **Escalate** (0 Coffee, **30 Confidence**, power 30, and *you
pick the practice area on the way upstairs*) → **CC All** → **Per My Last Email** → the capstone,
**Motion for Summary Judgment**. Escalate is the load-bearing node: it turns the tag layer from *do I
own the right button* into *can I afford the right button this turn*, and it competes directly with
Assert Dominance, Second Wind and Press Advantage for the same bar. It is also the only answer in the
game to a weakness that moves. **The lane has no defensive node whatsoever. That is the price.**

**RISK & COMPLIANCE** — *The firm does not lose arguments. The firm loses documentation. You have
decided to be the documentation.*
You do not take the turn. You take theirs. **Contemporaneous Notes** (a good Brace strips 15 % of
their Composure, a perfect one 35 %, and either clears an Objection) → **Adverse Inference**
(Retaliate carries the practice area of the move it answers, at power 26) → **Notice of Deficiency**
(+60 % if you braced last turn) → **Reservation of Rights** (a braced hit comes back at them for
35 %, or 60 % on a perfect Brace, computed from **their** Assertiveness) → **Standard of Care** → the
capstone, **Subrogation**. Measured on the Regional Director this lane lands **under one weakness hit
a fight** and takes two thirds of its Break pressure off Bracing, and wins anyway.
**Slow. Reliable. Terrible in a hurry** — and the Reception loop is a hurry, so the early grind is
genuinely harder in this lane. That is what Request Restructuring is for.

**AUDIT & ADVISORY** — *Nobody has ever been fired for asking for the supporting documentation. This
is the only true thing the firm has ever told you.*
You do not burst. You accumulate, and then you close. **Findings** — every **off-weakness** tagged hit
and every Objection you sustain files a Finding (max 5, +8 % damage each); at five, your next tagged
hit **CLOSES THE FILE** for 1.5× damage and 30 Composure *whatever practice area you used*. Then
**Tie-Out** → **Due Diligence** → **Scope Expansion** (debuffs file a Finding and last a turn longer)
→ **Management Letter** (hits the room, files two on each) → **Adverse Opinion** → the capstone,
**Material Weakness**: a closed file *counts as a weakness hit for every purpose*, and the file now
closes at four. Findings is the first mechanic in the game that pays you for hitting the tag the enemy
is **not** weak to — which the Objections system was already forcing you to do, and never paid for.

**GENERAL PRACTICE** is the shared pool: Fiduciary Shield, Billable Hours, Forensic Audit, Power of
Attorney, Whistleblower. Nobody's development plan requires any of it, which is exactly why everybody
ends up with some of it.

### The tier gate

| tier | available from |
|---|---|
| 1 | level 2 |
| 2 | level 6 |
| 3 | level 10 |

A capstone is nine points, which is level 10 — the final-boss rung. **A first run that finishes the
story around level 4–6 will never see one.** They are the reward for the roguelite grind and the
thing a New Game+ player carries in on lap one.

### Objection Sustained

Land a weakness hit and **the floor is still yours**: control comes back for one more action in the
same turn. That action **may not deal damage** — Brace, an item, a heal, a self-buff. It is free, it
is universal, it costs no Confidence, and it fires at most once per turn. It will not fire off the hit
that Broke their Composure (the Break already bought you a turn) or off a hit on someone already
Broken.

**Motion for Summary Judgment**, Litigation's capstone, upgrades that same return — **once per
engagement** — into a basic attack. Not a second return. Not a second prompt. And never against a
crowd: you cannot move for summary judgment against three parties at once.

---

## Restructure — free respec

Pause Menu → Abilities → **Request Restructuring**. Two-press confirm, free, unlimited, always
available.

- Refunds every upgrade point spent on Andrew's ability tree *and* on ally abilities.
- Relocks everything back to the five starters (File Motion, Coffee Break, Stall, Raise Concerns,
  Spot Check) and each ally's starter set.
- Quest-unlocked abilities are never touched — those are earned, not bought.
- It cannot be farmed against "Liquidate Final Point": the refund is exactly the points sunk into
  abilities, and a liquidated point was never sunk into one.

---

## Review Points & the Performance Review

**Every achievement you have ever unlocked is worth 1 Review Point.** Retroactive: if you unlocked
22 achievements before this existed, you have 22 points waiting.

Review Points live in `localStorage` beside the achievement list, *not* in the save file. They
survive New Game+, deleting a save, and switching slots. Spend them at the Break Room supply shop,
in the **Performance Review** tab (appears once you have earned at least one point).

| Item | Cost | Effect |
|------|------|--------|
| Certificate of Appreciation | 3 RP | Badge cosmetic. +3 Composure. |
| SVP-Grade Tumbler | 5 RP | Accessory cosmetic. +2 Assertiveness, +5 max Coffee. |
| Accelerated Review Cycle | 6 RP | Permanent, **toggleable** hard mode. Enemies +25% Patience and +25% Assertiveness; you earn +50% XP. Flip it on and off from the same row at no further cost. |
| Performance Improvement Plan | **0 RP** | Permanent, **toggleable** forgiveness. Andrew takes 20% less damage, plus 2% more per recorded defeat, capped at 80%. Locks nothing out. |
| Standard Audit Kit | 1 RP | Repeatable. Two Due Diligence Memos and two Stress Balls. |

Accelerated Review Cycle locks nothing out — no achievement, no content, no ending. It multiplies on
top of New Game+ scaling if both are active. It is also the **only** additive difficulty in the
game, and it is deliberately the small one: everything below takes things away instead.

No dailies. No streaks. No login rewards. Nothing here can be lost by not playing.

### The Performance Improvement Plan

Hades' God Mode, filed as HR paperwork, and its numbers exactly: **20% damage resistance, +2% per
recorded defeat, capped at 80%**, opt-in, reversible at any time, and locking out **zero**
achievements, endings or content. It costs **0 Review Points**, because charging for the option not
to be stuck is not forgiveness, it is a toll. It reads `player.deaths`, which the game has always
tracked, so it is strongest for exactly the player who needs it and inert for one who never lost.

It applies to Andrew only, is the last multiplier in the chain, and touches nothing else — no
weakness, Break, Lock, mutator or ally maths changes. Kasavin's framing is the whole design: *"what
if we just make you a little bit tougher?"*

### Stretch Goals — the subtractive ladder

Same tab, below the items. **Eight stretch goals**, each unlocked once with Review Points and then
toggled on and off freely, forever, at no further cost. Every one of them is *subtractive*: it
strips a resource, a tool or a piece of information rather than inflating an enemy stat. That is the
Ascension shape, and it is the shape because a stat check is just a longer fight, whereas losing
your items is a different fight.

| Stretch goal | RP | CP | What it takes |
|--------------|----|----|---------------|
| Lean Operations | 3 | 10 | No items during client engagements. |
| Open-Door Policy | 4 | 10 | Confidence decays 10 per turn. |
| Client-First Scheduling | 4 | 10 | All opposition acts before Andrew on round one. |
| Expedited Recovery | 4 | 10 | Post-fight Patience restoration is halved. |
| Collaborative Rotation | 4 | 10 | Allies act on a fixed rotation. Loop In is disabled. |
| Streamlined Toolkit | 6 | 20 | Second Wind and Assert Dominance are removed. |
| Independent Judgment | 6 | 20 | The Voices are gone. No free actions. |
| Summary Briefing | 5 | 20 | The telegraph shows the move name only — no Objections. |

**Review Level = floor(active Challenge Points ÷ 10)** — Kaycee's Mod's 10 × N formula exactly.
Turning goals on raises the *active* level; turning them off lowers it.

**The level is recorded by winning at it, not by selecting it.** The high-water mark
(`pb_review_level`) is written in the combat victory path, from the level that was running when the
fight started — so the Performance Review tab shows two numbers, *active* and *on file*, and tells
you to go close an engagement when they disagree. Nothing is ever taken back for losing.

> This used to record on the toggle, which meant the entire ladder paid out from a menu: walk to the
> Break Room, switch on 40 CP, read all four memos, switch everything back off, and never fight a
> round under any of it. Kaycee's Mod dispenses its dev logs for **clearing** Challenge Level N.

Each Review Level up to 4 unlocks a **memo from Meredith Sterling's office**, readable in the same
tab. She never names Andrew. That is the narrative-in-the-ladder move — the one reward a difficulty
ladder can pay out that cannot inflate the balance. Levels above 4 are available (the ceiling is 12
with everything active) but pay only the difficulty.

**Supply and sink.** 41 achievements exist, so the maximum Review Point supply is 41. The one-time
sinks total 50 (14 in items, 36 in stretch unlocks), plus a 1 RP repeatable kit. The currency
therefore cannot saturate — you will not own everything, and choosing what to unlock is itself a
decision. Every effect is enforced in exactly one place, listed in the `where` field of
`STRETCH_GOALS` in `src/data/review.js`, so the list stays auditable.

---

## New Game+

Available from the pause menu after The Algorithm falls. You keep AUM, abilities, upgrade points,
quest states, cosmetics, records and the arcade; the story resets to Monday morning.

**Enemy scaling now compounds per lap** off `ng_plus_count`, capped at 3 laps:

The ladder is **an entry rung plus decaying per-lap compounding**, not one multiplier. Stepping
onto *any* NG+ lap applies the entry rung once (`NG_PLUS_ENTRY` — ×1.70 / ×1.45 / ×1.30 / ×1.25);
every lap after the first compounds `NG_PLUS_SCALING` (×1.15 / ×1.15 / ×1.10 / ×1.20) on top of it,
with each successive lap contributing less than the last (`NG_PLUS_LAP.decay` = 0.35, so the
exponent runs 0, 1, 1.35 rather than 0, 1, 2).

| Laps | Enemy Patience | Enemy Assertiveness | Enemy Composure (DEF) | XP |
|------|---------------|---------------------|------------------------|-----|
| NG   | ×1.00 | ×1.00 | ×1.00 | ×1.00 |
| NG+1 | ×1.70 | ×1.45 | ×1.30 | ×1.25 |
| NG+2 | ×1.95 | ×1.67 | ×1.43 | ×1.50 |
| NG+3 | ×2.05 | ×1.75 | ×1.48 | ×1.60 |

Laps beyond the third stop compounding.

**Why the top rung was cut.** The first shipped version of this ladder used a per-lap Patience
multiplier of ×1.35 with no decay, which put NG+3 at ×3.10 Patience — and measured, that made the
top rung a wall rather than a ladder: Meredith **1.0%** and The Algorithm **4.0%** on a carried kit,
i.e. functionally unwinnable, while the code comment beside the constants claimed the ladder "ends
somewhere a human can stand". Both finales are damage races, so Patience compounding is the term
that turns them into a cliff; `node tools/ng-sim.mjs --hpscale` is the sweep that says so, and
`--lapdecay` is the one that prices the top rung on its own. The numbers below are the result.

The entry rung is large because **New Game+ hands back everything**: all 19 abilities, every upgrade
point, and all your AUM (which rebuys the maxed permanent shop upgrades on day one). A flat ladder
priced against the *base* enemy makes lap 2 easier than lap 1 — the documented Dark Souls
anti-pattern. Measured with `node tools/ng-sim.mjs --runs 500` (competent policy):

| Encounter | Lvl | Fresh kit @ NG | Carried kit @ NG+1 | @ NG+2 | @ NG+3 |
|-----------|-----|---------------|--------------------|--------|--------|
| Karen | 4 | 96.0% | 95.8% | 82.8% | 75.4% |
| Chad | 6 | 100.0% | 100.0% | 99.8% | 98.6% |
| Grandma | 8 | 99.8% | 99.4% | 97.2% | 97.0% |
| Meredith Sterling | 9 | 98.4% | 82.6% | 48.2% | 29.8% |
| The Algorithm | 10 | 99.6% | 80.8% | 51.4% | 35.6% |

The ladder is correct when the carried kit on lap 2 is no easier than the fresh kit on lap 1. It
holds on the two rows that have headroom to measure it (Meredith 98.4% → 82.6%, The Algorithm
99.6% → 80.8%). Karen, Chad and Grandma sit at the ceiling in *both* columns at their intended
levels, so those three rows are uninformative rather than passing — a ±2pt wobble there is sampling
noise, not a ladder failure.

Read the two informative rows as a staircase rather than a cliff: **82.6% → 48.2% → 29.8%** and
**80.8% → 51.4% → 35.6%**. NG+1 and NG+2 land inside the 40–85% band. **NG+3 is deliberately below
it** — roughly one clear in three on the finale — because the top rung of a voluntary ladder is a
flex, not a checkpoint. It is stated here rather than left in a table for someone to discover.
Re-run before touching any of these constants: `--sweep` re-derives the 1.70 entry rung, `--hpscale`
the per-lap Patience, `--lapdecay` the top-rung decay.

Two other things change on a second lap:

- **They remember.** Karen, Chad, Grandma, Meredith Sterling and The Algorithm each gain two
  New Game+ combat taunts, mixed into their normal pool. Nobody mentions saves or restarts — it
  reads as the same meeting happening again.
- **The epilogue can say something it could not say the first time.** Hold the optional Board
  Meeting on a second-or-later run and the epilogue gains a card, THE PREPARED REMARKS, that a
  first run cannot reach. It is one paragraph, not a new ending.
