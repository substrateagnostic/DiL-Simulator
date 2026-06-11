# TRUST ISSUES — Combat Balance Simulation Report

**Date:** 2026-06-11 · **Sim:** `.claude/plans/s5-balance-sim.mjs` (headless, imports the real `CombatEngine` + data files; no game files modified)
**Runs:** 300 fights per row · **Modes:** `node .claude/plans/s5-balance-sim.mjs` (baseline) / `--validate` (proposed overrides) / `--tune` (experiments) / `--trace <enc> <lvl> [party|-] [ov]` (turn-by-turn)

## Method

- Player at level L: `PLAYER_BASE_STATS` + `LEVEL_GROWTH × (L−1)`, full HP/MP, 2 Large Coffees (restore 30 MP each, per ITEMS).
- Ability unlocks (1 upgrade point/level, prereqs respected): L2 cite_precedent, L3 due_diligence, L4 cc_all, L6 forensic_audit, L8 per_my_last_email, L9 notarized_strike + root_access (side-quest unlocks assumed done), L10 whistleblower, L12 power_of_attorney.
- Turn loop mirrors `CombatState._startRound`/`_processNextTurn` exactly: SPD-sorted interleaved initiative (allies first on ties), `processTurnStart` per actor, `telegraph()` at the start of every Andrew turn.
- Policy (priority order): Second Wind (HP<40%, mom≥50) → heal when HP<35% **or** the telegraphed hit could near-kill (`hp < est×1.1+10`) via Coffee Break/Power of Attorney → Power Move at 100 → basic attack to break counters → Brace on big telegraphed hits (power ≥30 always, ≥20 when below 50% HP; never twice in a row) → Retaliate (4-key QTE, 90%/key) when no strong weakness ability affordable → Press Advantage at ≥cost while HP≥55% → cc_all when 3+ enemies → best affordable weakness-tagged ability (cc_all allowed as single-target nuke) → coffee item when MP<30 → safe Desperate Gamble below 25% HP → basic attack. Brace QTE: 70% good / 15% perfect / 15% miss. Focus-fire lowest-HP enemy.
- Multi-enemy fights (trio, the_firm) use the engine's native `enemyIds`; allies (`partyIds`) are AI-driven (rotation). Realistic party comps included for Act 5+ fights — Janet is force-recruited at `act5_trigger`, so every later story fight pulls 2 party allies in real play (no `noParty` flags exist on story encounters).

## Baseline results (current data files)

| Encounter | Level | Win % | Med. rounds (win) | Med. HP left (win) | Target | Verdict |
|---|---|---:|---:|---|---|---|
| karen | 3 | 67.0 | 6 | 70 (56%) | 60–90 | OK (band floor) |
| karen | 4 | 61.7 | 6 | 71 (52%) | 60–90 | OK |
| compliance | 4 | **1.7** | 50 | 50 (37%) | 60–90 | Way under |
| regional | 4 | **0.0** | — | — | 60–90 | Way under |
| ross_boss | 4 | 63.3 | 22 | 62 (46%) | 60–90 | OK but slow (22-round median) |
| chad | 5 | **0.0** | — | — | 60–90 | Way under |
| chad | 6 | **0.3** | 14 | 92 (57%) | 60–90 | Way under |
| grandma | 7 | 97.3 | 8 | 122 (71%) | 60–90 | Over (too easy) |
| grandma | 8 | 99.3 | 7 | 135 (73%) | 60–90 | Over |
| restructuring_trio (+janet, forced) | 7 | **2.3** | 11 | 94 (55%) | 60–90 | Way under |
| restructuring_trio (+janet, forced) | 8 | **1.3** | 14 | 103 (56%) | 60–90 | Way under |
| corporate_lawyer (solo) | 8 | 88.0 | 7 | 86 (47%) | 75–95 | OK |
| corporate_lawyer (+janet, realistic) | 8 | 98.0 | 4 | 93 (50%) | 75–95 | Slightly over |
| chief_of_restructuring (solo) | 8 | 99.3 | 8 | 110 (60%) | 75–95 | Over |
| chief_of_restructuring (+janet, realistic) | 8 | 100 | 6 | 141 (77%) | 75–95 | Over |
| rachel_boss (solo) | 8 / 9 | 77.3 / 89.0 | 11 / 8 | 92 / 92 | 60–90 | (info only — Janet always present) |
| rachel_boss (+janet, realistic) | 8 / 9 | 98.3 / 97.3 | 6 / 6 | 94 / 104 | 60–90 | Over |
| the_firm (+janet+alex) | 9 / 10 | 71.0 / 79.7 | 10 / 8 | 102 / 105 (~50%) | 60–90 | **In band — no change** |
| the_firm (solo) | 9 / 10 | 0.7 / 0.3 | — | — | — | (info: party required) |
| parking_enforcer (solo) | 9 | 99.0 | 3 | 107 (55%) | 75–95 | Slightly over (side fight, lenient by design) |
| networking_guy (solo) | 9 | 100 | **2** | 192 (98%) | 75–95 | Over (trivial, dies in 2 rounds) |
| regional_director (solo) | 10 | **0.0** | — | — | — | (info) |
| regional_director (+2 allies, realistic) | 10 | 99.7 | 6 | 104 (50%) | 60–90 | Over |
| algorithm (solo) | 10 / 12 | 23.7 / 63.7 | 22 / 12 | 90 / 105 | — | (info) |
| algorithm (+janet+alex, realistic) | 10 / 12 | **99.7 / 100** | 6 / 5 | 155 (75%) / 184 (79%) | 55–80 | Way over (not climactic) |
| algorithm (+janet+isaiah — no silence) | 10 | 93.7 | 8 | 100 (48%) | 55–80 | Over (comp-dependent) |

## Diagnosis — three structural findings

1. **Flat heal economy creates hard walls.** Andrew's only sustain at L4–7 is Coffee Break (flat 50 HP, costs the turn). Any enemy whose sustained damage ≥ ~45/turn (Chad 51–99, Compliance's 44/64 rotation, Regional + 90-heal parachute) locks the player into a heal-loop that nets ~+5 HP/turn while dealing zero damage — mathematically unwinnable regardless of skill. Verified by turn traces, not just win rates. This is why Chad (0%) is *harder* than Grandma (97%+): Grandma's tactical pattern wastes turns on heals/debuffs and her heals open 1.5× vulnerability windows; Chad's aggressive pattern attacks ~every turn and he outspeeds the player 20 vs 12.
2. **Party action economy + Force Quit trivializes late single bosses.** Every Act 5+ encounter pulls 2 party allies (Janet is force-recruited; no `noParty` flags). Alex from IT's Force Quit silences a boss for 2 *full turns*, recastable ~every 3rd ally turn — a single-boss fight loses ~40% of its turns. Identical stats: regional_director 1150 HP/24 ATK is 65% vs janet+isaiah but **99%** vs janet+alex_it. No stat tuning can satisfy both comps while silence works this way.
3. **Trio difficulty is coupled to solo encounters.** `restructuring_trio` reuses `brand_consultant`/`restructuring_analyst`/`corporate_lawyer` global stats, and `CombatState` does not pass per-encounter `enemyOverrides` for non-primary enemies (engine supports `opts.enemyOverrides`, but CombatState never sends it). Tuning the trio via balance.json necessarily makes the solo versions of those enemies trivial.

## Proposed overrides (validated, NOT applied)

### balance.json → `enemies` (editor-compatible)

| Enemy | Current | Proposed | Rationale |
|---|---|---|---|
| `compliance` | 580 HP / 13 ATK | **310 HP / 10 ATK** | L4 kit can't outrace 580 HP at 46 inc/turn; 0%→81% |
| `regional` | 600 HP / 13 ATK | **350 HP / 11 ATK** | 90-heal + 600 HP is attrition-proof at L4; 0%→73% |
| `ross_boss` | 520 HP / 14 ATK | **440 HP / 12 ATK** | In band but 22-round median drags; →75% at 17 rounds |
| `chad` | 480 HP / 18 ATK / 20 SPD | **300 HP / 8 ATK / 13 SPD** | Breaks the heal-lock; needs the ability tweaks below too; 0%→68/85% |
| `grandma` | 600 HP / 21 ATK / 12 SPD | **750 HP / 27 ATK / 15 SPD** | Easiest Henderson despite being last; 97/99%→92/96% |
| `brand_consultant` | 420 HP / 9 ATK | **300 HP / 6 ATK** | Trio action economy (also trivializes its solo fight — see coupling note) |
| `restructuring_analyst` | 280 HP / 10 ATK | **180 HP / 7 ATK** | Trio: fast first kill relieves the 3v2 pressure |
| `corporate_lawyer` | 420 HP / 14 ATK | **400 HP / 12 ATK** | Trio's lockdown threat; solo stays 91% (in band) |
| `rachel_boss` | 720 HP / 18 ATK | **900 HP / 21 ATK** | With Janet (canonical comp) 98%→85% at L8 |
| `chief_of_restructuring` | 620 HP / 16 ATK | **850 HP / 26 ATK** | 100%→97% — best achievable vs party without absurd numbers |
| `regional_director` | 950 HP / 20 ATK | **1150 HP / 24 ATK** | Tuned for silence-fixed world: 65% (no-silence comp); 97–99% until silence fix lands |
| `algorithm` | 1200 HP / 26 ATK | **1500 HP / 30 ATK** | Climactic 75–81% with silence fix; ~100% without it |
| `networking_guy` | 320 HP / 13 ATK | **550 HP / 18 ATK** | Cosmetic: still ~100% win but lasts 4 rounds instead of 2 |

No changes proposed: `karen` (61–67%, the intended grind gate at the band floor), `the_firm` (71/80% at L9/L10 with party — the best-tuned multi-fight in the game), `parking_enforcer` (99%, lenient side fight), `data_analytics_lead`, `cfos_assistant`, `security_guard`, `hr_rep` (not in scope).

### Enemy-ability tweaks (require `stats.js` edits — balance.json only overrides *player* abilities)

| Ability | Current | Proposed | Rationale |
|---|---|---|---|
| `form_27b_stroke_6` (compliance) | power 35 | **28** | 64-dmg spikes near-half a L4 player's HP bar |
| `golden_parachute` (regional) | heal 90 | **35** | 90 ≈ 1.4 player attacks; stalls the fight unwinnably |
| `billable_assault` (corp. lawyer) | power 28 | **22** | Trio's biggest single hit (52+) |
| `trust_fund_tantrum` (chad) | power 30 | **24** | Keeps sustained damage below the 50/turn heal ceiling |
| `alpha_mode` (chad P2) | +12 ATK/+6 SPD | **+4/+4** | +12 ATK reinstates the heal-lock in phase 2 |
| `rage_quit_attack` (chad P3) | power 42 | **28** | 99-dmg hits at L5 are unanswerable |

### Code recommendations (validated by proxy, not applied)

1. **Boss silence resistance** — for enemies with `phases`, cap `silenced` at 1 turn or convert it to "abilities locked, basic attack still fires" instead of a full lost turn. Proxy-validated: with silence neutralized, algorithm 1500/30 lands at 75–81% (climactic band) and regional_director 1150/24 at 65%; with silence intact the same stats are 97–100%. Without this fix, the final boss's difficulty is decided by which two allies the player happens to bring (100% vs 22% on identical stats).
2. **Wire `ENCOUNTERS[id].enemyOverrides` through `CombatState` → `CombatEngine` opts** (engine already supports it). Decouples the trio from the solo brand_consultant/analyst/lawyer fights — then the table's trio nerfs could be encounter-scoped and the solo fights kept meatier.
3. **Optional:** scale Coffee Break with level (e.g., `40 + 2×level`) — would soften the flat-heal-ceiling math that made Chad unfixable by stats alone, allowing less drastic nerfs.
4. **Telegraph hint depth:** hints show only ability *type*; brace decisions hinge on magnitude. The sim shows brace-on-every-attack turtling *loses* fights — consider a "heavy" tag in `_getTelegraphHint` (e.g., "attack (heavy) — brace!") so real players can make the discrimination the policy needed.

## Post-override results (`--validate`, 300 runs each)

| Encounter | Level | Win % (was) | Med. rounds | Med. HP left | In target? |
|---|---|---:|---:|---|---|
| karen | 3 / 4 | 64 / 59 (67/62) | 6 | ~70 (53%) | Yes (floor) |
| compliance | 4 | **81** (1.7) | 6 | 73 (54%) | Yes |
| regional | 4 | **73** (0) | 14 | 73 (54%) | Yes |
| ross_boss | 4 | **75** (63) | 17 | 70 (51%) | Yes |
| chad | 5 / 6 | **68 / 85** (0/0.3) | 16 / 8 | 82–85 (54%) | Yes |
| grandma | 7 / 8 | **92 / 96** (97/99) | 12 / 9 | 107–125 (65%) | Edge-over at L8 |
| restructuring_trio | 7 / 8 | **55 / 75** (2/1) | 10 / 8 | 87–94 (51%) | L8 yes; L7 edge-under (acceptable for a forced setpiece; retry ≈ 80% in two attempts) |
| brand_consultant (solo, regression) | 7 | 100 | 3 | 154 (90%) | Over — accepted cost of trio fix (see code rec #2) |
| restructuring_analyst (solo, regression) | 7 | 100 | 2 | 144 (84%) | Over — same coupling |
| corporate_lawyer (solo / +janet) | 8 | 91 / 100 | 5 / 4 | 105–116 (60%) | Solo yes; +janet over (gauntlet opener, accepted) |
| chief_of_restructuring (+janet) | 8 | **97** (100) | 8 | 106 (58%) | Edge-over — ceiling without code rec #1 |
| rachel_boss (+janet) | 8 / 9 | **85 / 93** (98/97) | 8.5 / 8 | 92 (50%) | Yes at L8; edge at L9 |
| rachel_boss (solo — non-canonical) | 8 | 37 | 20 | 84 (46%) | info |
| networking_guy | 9 | 100 (100) | 4 (was 2) | 144 (73%) | Over — accepted as comic side fight |
| regional_director (+2 alex comp) | 10 | 97 (99.7) | 7 | 111 (53%) | **65% with silence fix** (tune row) — needs code rec #1 |
| algorithm (+2 alex comp) | 10 / 12 | 100 / 100 | 7 | 142–175 (70%) | **75–81% with silence fix** (tune rows) — needs code rec #1 |

## Limitations (honest accounting)

- **Scripted policy ≠ human play.** The policy is a solid mid-skill player (telegraph-aware healing, selective bracing, weakness exploitation, momentum spending) but it knows telegraphed ability *power* values, which the in-game hint hides (type only) — slightly stronger than a first-time player, comparable to a learned one. It does not use: voices/"Reasonable Doubt" free actions (up to ~4/fight late game), buff abilities (billable_hours, fiduciary_shield, firewall, temporal_audit), shop consumables beyond 2 Large Coffees (no antacids/stress balls), cosmetic stat bonuses, the poster revive, or risky/all-in gambles. Net effect: **real win rates run several points above sim** for players who shop and engage with those systems; the 0% walls stay walls regardless (verified by closed-form heal-economy arithmetic in traces).
- **Win rate is per attempt.** Players retry bosses; a 60% fight is ~84% within two attempts. Bands should be read with that in mind.
- **Levels are stipulated, not earned.** XP pacing wasn't simulated; "the level players reach it" comes from the task/Quest.md, e.g. trio at L7–8 is an assumption (encounter has no stated level).
- **Ally modeling:** allies use the built-in AI rotation with starter abilities only; manual control (the default!) and unlocked tier-2 ally abilities would push party fights a few points higher. Ally HP/MP persistence between gauntlet fights not modeled (each fight starts fresh).
- **Multi-enemy fights were NOT approximated** — the engine natively supports them and the sim uses the real interleaved initiative. No sequential approximation was needed.
- **Sampling noise:** 300 runs → ±3–6% (95% CI) near 50%, tighter at the extremes. Differences <5 points between rows are not meaningful.
- **Two earlier policy iterations materially changed results** (brace-everything turtling → 0% on fights that are 60%+ with selective bracing; over-conservative heal thresholds → heal-lock). The numbers above use the final policy throughout, but treat absolute percentages as ±1 skill tier; *relative* orderings and the structural findings are robust.
