# Gameplay.md — TRUST ISSUES: A Trust Officer Simulator

Systems reference: roguelite loop, items, achievements, cosmetics, and combat stats.

---

## Repeatable: Reception Roguelite

Talk to the reception desk to start a client encounter. Win the combat, then accept or decline the client.

- **Win combat:** 60–120 XP (scales with client wealth tier: `Math.round(60 + t * 60)` where t = 0–1)
- **Accept client:** AUM = max(50, floor(client assets × 1%))
- **Decline client:** No AUM, no penalty

AUM is the shop currency. Spend it at the **Supply Shop** in the Break Room (interact with the vending machine area).

### Post-Game Tier 5 (after defeating The Algorithm)

Once The Algorithm is defeated, the reception roster upgrades to elite clients. Diane will let you know.

- **Client pool:** UHNWI, Sovereign Wealth Consultant, Offshore Dynasty, Corporate Pension Fund, Tech Billionaire Exit (assets 20M–100M)
- **Win combat:** 200–350 XP (formula: `Math.round(200 + t * 150)` against a 100M asset ceiling)
- **Accept/Decline:** Same rules as normal reception

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
| `renovation_corner_office` | Ross's Office | Corner Office Renovation | Grand paintings and executive furnishings |
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

---

## Achievements

Achievements are tracked across all saves and viewable in the Pause Menu → Achievements tab. They unlock automatically when the condition is met — no manual claim needed.

### Act Completions

| Icon | Name | How to Unlock |
|------|------|---------------|
| ⚔ | First Blood | Win any combat |
| 🏆 | Family Meeting Over | Defeat all three Hendersons |
| 📎 | First Day Jitters | Complete Act 1 — receive your assignment from Ross |
| ⚖ | The Bill Comes Due | Complete Act 2 — survive the Executive Floor reckoning |
| 🗂 | Follow the Money | Complete Act 3 — uncover the truth in the Archive |
| 📜 | The Building Has Spoken | Complete Act 4 — retrieve the 1947 charter from the Vault |
| 🏢 | Hostile Takeover Blocked | Complete Act 5 — defeat Rachel and drive out the restructuring team |
| 🤝 | United We Stand | Complete Act 6 — rally the team and secure the Janitor's Rolex |
| 💻 | Trust Issues Resolved | Complete Act 7 — defeat The Algorithm |

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
| Corner Office Key | +2 ATK, +2 DEF | Defeat Ross (Act 2 secret ending only) |

### Accessories

| Item | Stat Bonus | How to Unlock |
|------|-----------|---------------|
| Stress Ball (Belt Clip) | +5 HP | Available from the start |
| Fountain Pen | +2 ATK | Defeat the Regional Manager (Act 2 Finale) |
| Janitor's Keyring | +3 SPD | Confront the Janitor about his past (Act 3) |
| Golden Calculator | +3 ATK, +5 Coffee | Defeat the Regional Director (Act 7, penthouse chain) |

---

## Party System — Recruited Allies

Starting in Act 5, you can recruit allies who join you in combat. Recruited allies persist across all subsequent fights via `player.party[]`.

### Recruiting

Recruitment dialog choices appear at specific story points. Declining a recruit still shares relevant evidence — you're never punished for keeping a small party. Allies are added via the `recruit_ally` dialog action.

### In Combat

- Allies use SPD-sorted initiative interleave (BG3-style) — their turns are interspersed with enemies each round.
- **Manual control** (default): when an ally's turn comes up, a menu lets you choose Attack, Abilities, Skip, or switch to Auto.
- **Auto control**: ally acts on its own AI (rotation + heal/AoE heuristics). Toggle per fight or set persistently.
- Allies share Andrew's level and scale stats via `LEVEL_GROWTH × growthFactor` (default 0.85).
- Andrew's `rest()` after story victories restores all allies to full HP/MP.

### Ally Abilities

Each ally has 3 starter abilities (known on recruit) and 3 unlockables. Spend 1 upgrade point in the **Abilities tab** of the pause menu to teach an ally a new ability. Some quest rewards (e.g., Badge Audit) unlock abilities for free.

### Ally Roster

| Ally | Recruited | Theme | Starter Abilities |
|------|-----------|-------|-------------------|
| **Janet** | Act 5 cubicle farm (auto-joins) | social/legal | Nope (social), Group Complaint (AoE), Rally (party buff), Fact Check (debuff) |
| **Alex from IT** | Post-trio, IT office | technical/audit | Reply-All Storm, SSH In, Force Quit (silence) |
| **Isaiah** | Post-trio | operations/defense | Motion to Table (ATK debuff), Bridge Builder (party DEF buff), Redirect (taunt) |
| **Diane** | Post `diane_act6_rallied` | HR/audit | HR Complaint (debuff), Receipt (audit hit), Policy Loophole (party buff) |
| **Grandma Henderson** | Act 6 | — | (Henderson family |

---

## Andrew's Voices — Reasonable Doubt

Four facets of Andrew interject during combat as free actions — no MP cost, one use per fight. They appear in a **Thoughts** submenu in the combat action menu, only visible when at least one voice is available.

Usage across the whole campaign is tracked in `Player.voiceCounts` and persists in saves. High usage unlocks branches in the Team Chat Hub (water cooler, available once any ally is recruited).

| Voice | Trigger | Action | Effect |
|-------|---------|--------|--------|
| **The Apprentice** *(#88ccff)* | HP < 50% | Remember Why You're Here | Heal 30% max HP, clear one debuff/status, +10 confidence |
| **The Litigator** *(#cc6644)* | After landing a crit OR after an enemy heals | Sever | 30-power legal attack, ignores 50% DEF, +15 confidence |
| **The Skeptic** *(#888888)* | Round 7+ after taking damage | Just... Walk | Flee if fleeable (90% chance); otherwise +30 confidence + skip turn |
| **The Witness** *(#ddccaa)* | HP < 25% vs Rachel-aligned enemies | For Mrs. Henderson | 50-power attack (+30% to Rachel-aligned targets), +25 confidence, locks the Skeptic |

### Late-Game Reactivity (Team Chat Hub)

| Threshold | Voice | Unlocked Branch |
|-----------|-------|----------------|
| 5 uses | Litigator | Janet warns Andrew he's becoming clinical. Player chooses a response → sets `andrew_steadied` or `andrew_hardened` for epilogue branching. |
| 3 uses | Witness | Andrew reads the 1947 charter. D. Henderson margin note revealed. +100 XP. Sets `witness_charter_read`. |
| 5 uses | Skeptic | Andrew sits at his desk and realizes he could quit — decides not to. +5 maxMP. |

### The Charter Itself

A 5th voice unlocked only if `witness_charter_read` is set **and** you're fighting Rachel (`rachel_boss` encounter). Action: **Read the 1947 Charter Aloud**. Deals massive damage (200 power, ignores DEF, floors at 1/3 of Rachel's max HP). Sets `andrew_invoked_charter`, which determines which of the four Rachel epilogue branches plays.

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

---

### SPD — Bureaucratic Efficiency

Affects two things:

1. **Flee success rate:** `40% + (your SPD − enemy SPD) × 5%`. Higher SPD than the enemy makes escaping easier; lower SPD makes it harder.
2. **Press Advantage cost:** The momentum cost to use Press Advantage scales down with SPD. Formula: `max(15%, 25% − floor((SPD − 8) × 0.5))`. At base SPD 8 the cost is 25%. At SPD 28+ the cost floors at 15%.

| SPD | Press Advantage cost |
|-----|---------------------|
| 8 (base) | 25% |
| 12 | 23% |
| 16 | 21% |
| 22 | 18% |
| 28+ | 15% (minimum) |

---

### Momentum — Confidence

Not a stat but a combat resource (0–100). Gains from hitting, landing crits, exploiting weaknesses, and Follow Through combos.

| Threshold | Move | Cost |
|-----------|------|------|
| 25%+ | **Press Advantage** | SPD-scaled (15–25%) |
| 50%+ | **Second Wind** | 50% |
| 100% | **Assert Dominance** | Resets to 0 |

Press Advantage: moderate attack + −5 DEF debuff on enemy for 2 turns.  
Second Wind: restores 25% max HP, clears one status condition.  
Assert Dominance: ignores 75% of enemy DEF on that hit.
