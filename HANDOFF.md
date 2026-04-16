# Session Handoff — April 15, 2026

## What Was Done This Session

Dialog fixes, quest gating for early-game spoiler prevention, and post-game Tier 5 reception clients.

---

### Post-Game Tier 5 Reception Clients

6. **No XP path to level 15 after completing the game** — After defeating The Algorithm, the reception roguelite still used the standard 60–120 XP pool, making level 15 grindy and unengaging. Added a post-game tier:
   - Added `POST_GAME_CLIENT_TYPES` in `ClientGenerator.js` (5 elite types: UHNWI, Sovereign Wealth Consultant, Offshore Dynasty, Corporate Pension Fund, Tech Billionaire Exit — assets 20M–100M).
   - `scaleEnemyStats` now accepts a `postGame` flag: when true, `MAX_ASSET = 100_000_000` and XP formula shifts to `Math.round(200 + t * 150)` (200–350 range).
   - `generateClient` now accepts a `postGame` flag: when true, draws from `POST_GAME_CLIENT_TYPES`.
   - `ExplorationState._onReceptionEntered()` and `_getNextClient()` both check `algorithm_defeated` and pass `postGame` to `generateClient`.
   - One-time unlock toast on first post-game reception entry: Diane says "Word got out. The clients you're seeing now are in a different league entirely." (gated on `postGameReceptionUnlocked` flag).

---

### Diane Intro Dialog

1. **Diane re-introduced herself on every visit** — The opening line "New trust officer? I saw your onboarding paperwork..." played again on repeat visits. Removed node 0 from `diane_intro` (the "New trust officer?" line). All subsequent `next` indices in the dialog shifted down by 1 and were corrected. Dialog now opens with her self-introduction ("I'm Diane. I run reception...").

---

### Printer from Hell — Merged Interaction & Spoiler Gate

2. **Quest required two separate printer interactions to start** — First visit set `printer_visit_2`; second visit started the quest. Merged both beats into a single interaction so the full sequence (HELP ME → HENDERSON FILES → toner runs out → quest starts) plays in one sitting. `printer_visit_2` flag removed.

3. **Printer interaction revealed Henderson plot before Ross briefing** — The printer mentioned the Henderson files even on a fresh game before the player knew about the case. Added `briefing_complete` gate (node 2): if the briefing hasn't happened, the printer shows a single "it's just a printer" line and exits. The full spooky sequence only plays after the briefing is done.

---

### Alex IT Act 2 — Spoiler Gate

4. **`alex_it_act2` (encrypted partition / Caymans) fired immediately after briefing in Act 1** — Three separate routing paths all allowed this dialog too early:
   - The special Alex story routing block gated on `briefing_complete` → changed to `karen_defeated`.
   - The `flag-set` listener's `alex_story_chosen` path had the same `briefing_complete` gate → also changed to `karen_defeated`.
   - The **generic act routing** (`act >= 1 && DIALOGS[alex_it_act2]`) bypassed both special gates entirely → added an explicit guard after the side quest routing block: if `karen_defeated` is not set and `alex_it_act2` hasn't been read, return `alex_it_return` to prevent the generic routing from firing it.

5. **`alex_it_act2` dialog opened as a follow-up to a conversation that never happened** — Node 1 said "Remember that encrypted partition I told you about?" and node 2 had Andrew say "The one that was 'probably nothing'?" — referencing prior dialogue that doesn't exist. Rewritten so Alex introduces the partition fresh: "I found an encrypted partition buried in the server..." Andrew reacts with surprise. Router option also changed from "The encrypted partition. What did you find?" to "You look like you're about to combust. What is it?"

---

## Previous Session (April 12, 2026)

Achievement system expansion, momentum rebalance, cosmetic unlock fixes, roguelite balance pass, and documentation reorganisation.

---

### Cosmetic Unlock Fixes

1. **Three cosmetics permanently unobtainable** — `tin_foil_hat`, `executives_fedora`, and `janitors_keyring` referenced flags (`archive_found`, `executive_floor_visited`, `janitor_confronted`) that were never set anywhere in the codebase. Fixed:
   - `archive_found` — set alongside `visited_archive` in ExplorationState room-entry block for `archive`.
   - `executive_floor_visited` — new block added to `_changeRoom()` that sets the flag on first entry to `executive_floor`.
   - `janitor_confronted` — added `set_flag` action node at position 19 in `janitor_act3` dialog (all subsequent node indices in that dialog shifted +1).

2. **Golden Calculator unlock too late** — was gated on `algorithm_defeated` (post-final boss). Changed to `regional_director_defeated` (penthouse mid-chain) in `cosmetics.js` so it's obtainable before the final fight.

---

### Roguelite Anger Ratio Rebalance

3. **Negative client attributes averaged +2.2 anger delta vs positives at −1.0** — net anger per accepted client was +1.2, making the meter punishing over time. Targeted fix in `ClientGenerator.js`:
   - `litigious` angerDelta: 3 → 2
   - `family_feud` angerDelta: 3 → 2
   - `social_media` angerDelta: 3 → 2
   - `complex_tax` angerDelta: 1 → 2
   - `high_growth` angerDelta: 0 → −1
   - `large_estate` angerDelta: 0 → −1

---

### Janitor Riddle Dead-End Fix

4. **Wrong answer ended dialog with no retry path** — on re-entry the full intro replayed, and if the node list drifted the retry could silently fall to `end`. All three janitor riddles now use a `riddle_X_attempted` condition gate at node 0:
   - Node 0: condition — `ifTrue` jumps to the riddle question, `ifFalse` continues to node 1.
   - Node 1: `set_flag riddle_X_attempted`, falls through to node 2 (intro text).
   - Node 2: intro text → node 3 (riddle question).
   - Wrong-answer paths end without setting the `janitor_riddle_X_done` flag, so re-entry retries cleanly.

---

### Momentum (Confidence Bar) Rebalance

5. **Assert Dominance nearly unreachable** — base gain of +5 required ~20 hits and players were spending at 25%/50%, resetting progress. Two changes in `CombatEngine.js`:
   - Base gain per hit: `5 +` → `10 +` (formula: `10 + (crit?10:0) + (super?10:0) + (combo?5:0)`).
   - Removed all momentum drain from incoming damage and stuns (three `_loseMomentum(10)` calls removed). Momentum now only decreases when a spending move is used.

---

### Achievement System Expansion

6. **Removed 3 individual Henderson achievements** — `karen_slayer`, `chad_bested`, `grandma_survived` removed from `AchievementManager.js`. Only `hendersons_done` (all three defeated) remains as the Henderson milestone.

7. **Added 7 act-completion achievements** — one per act (`act1_complete` through `act7_complete` / `algorithm_defeated` flags), fired from `ACT_ACHIEVEMENT_FLAGS` listener in ExplorationState.

8. **Added 5 combat mastery achievements** — `second_opinion` (Second Wind used), `nothing_to_lose` (Desperate Gamble used), `all_in` (All In chosen), `follow_through` (combo hit), `perfect_form` (perfect Brace QTE). Achievement checks added in `CombatState.js`.

9. **Added 5 roguelite achievements** — `dedicated` (25 clients accepted), `supply_run` (all three shop categories purchased), `hard_pass` (decline after winning), `dream_client` (no negative attributes), `high_roller` (5M+ in assets). `client_accepted` ctx now carries `assets` and `attributes`; `client_declined` event added in ExplorationState.

10. **Shop category tracking** — `ShopState._purchase()` now sets `bought_category_<consumable|upgrade|decor>` flag before calling `AchievementManager.check()`. Required for Supply Run achievement.

11. **Total achievements: 28** — Story (2), Act Completions (7), Combat Mastery (9), Leveling (3), Roguelite (7).

---

### Documentation Reorganisation

12. **Created `Gameplay.md`** — moved Repeatable Reception Roguelite, Item Reference, Achievements, Cosmetics, and Attributes sections out of `Quest.md` into new `Gameplay.md` at project root. `Quest.md` now ends with a pointer to `Gameplay.md`.

13. **`CLAUDE.md` updated** — AchievementManager event list, momentum no-drain rule, 6-param `showMainMenu` signature, shop category flags, janitor riddle retry pattern, `Gameplay.md` added to Reference Files.

---

## Previous Session (April 10, 2026)

Full audit and bug-fix pass on Acts 5–7 and all six Alex IT subquests, plus the three standalone side quests.

---

### Act 5 Fixes

1. **Duplicate ENEMY_ABILITIES keys** — Three abilities silently overwrote each other due to identical JS object keys. Renamed conflicting keys to `chief_strategic_pivot`, `chief_corporate_mandate`, and `data_predictive_model`. Updated ability arrays in `ENEMY_STATS` for Chief of Restructuring and Data Analytics Lead.

2. **Board room accessible immediately on Act 5 start** — `act5_trigger` dialog was setting `board_room_accessible` on launch rather than after the full gauntlet. Moved the flag to `chief_restructuring_defeated` post-dialog.

3. **Act 6 trigger dialog dead code** — Removed `act6_trigger` dialog (was never reachable).

4. **`cfos_assistant_combat` / `regional_director_combat` / `algorithm_combat` missing `start_combat` nodes** — Pre-dialogs had no combat trigger; the `_pendingCombat` chain never fired. Added `start_combat` action nodes to all three.

5. **`intern_act6` dialog set wrong flag** — Was setting `intern_rallied` (Act 4 flag); changed to `intern_act6_rallied`.

6. **Bestiary missing entries** — Added `data_analytics_lead` and `chief_of_restructuring` to `BESTIARY_DATA`.

7. **Act 5 quest stage order wrong** — `quests/index.js` and `QUEST_OBJECTIVES` had Restructuring Analyst before Brand Consultant; corrected to Brand Consultant first.

---

### Act 6 Fixes

8. **`act >= 4` social engineering guard blocked Act 6** — Changed to `act >= 4 && act < 6` so the guard doesn't fire in Act 6+.

9. **`_getStoryObjective()` Act 6 ally count used wrong flags** — Updated to use `janet_act6_rallied`, `diane_act6_rallied`, and added `grandma_ally` as 5th ally. Counter thresholds updated from 4→5.

10. **Archive Janitor missing in Act 6 "Get the Rolex" window** — Added new room entry with `condition: { flag: 'act5_complete', notFlag: 'has_rolex' }`.

---

### Act 7 Fixes

11. **Penthouse combat chain used `setTimeout` race condition** — Replaced three `setTimeout → _startCombat` calls with `_pendingDialog` so each fight waits for the previous dialog to end before chaining.

12. **`_getStoryObjective()` missing CFO's Assistant step** — Added `if penthouse_entered → return "Defeat the CFO's Assistant"`.

13. **`regional_director_defeated` vs `defeated_regional_director` flag confusion** — Documented in CLAUDE.md Key Story Flags table; penthouse chain correctly uses the post-dialog-set flag.

---

### The 3:47 AM Anomaly Fixes

14. **`morse_code_rack` interactable missing from server room** — Quest stage 1 was physically inaccessible. Added interactable at `x:3, z:3` (middle rack row, "Rack C").

15. **`morse_code_rack` dialog set no flag** — Added `set_flag morse_decoded` after the decode path (nodes 1–4 only; the "don't know what to look for" branch does not set it).

16. **HUD objective stuck on "Return to Alex" immediately after quest starts** — Updated tracker to show "Find the Morse code pattern in server rack C" until `morse_decoded`, then "Return to Alex from IT".

---

### The Phantom Approver Fixes

17. **Dialog node 1 only checked `phantom_workstation_found`** — Player could skip the HR filing cabinet entirely (especially in Act 3 when HR is locked) and complete the quest with only the workstation. Added nodes 20–21: condition check for `phantom_hr_found`; if missing, Alex tells player to visit HR first.

---

### Network Ghost Fixes

18. **Break room and conference room signal boosters had no visual furniture** — Stairwell had `motivationalPoster` furniture + interactable (correct pattern); the other two rooms only had interactables. Added `motivationalPoster` at `x:14.9, z:8` (break room) and `x:10.9, z:2` (conference room).

---

### Printer's Soul Fixes

19. **`printer_quest_done` in questFlagMap mapped to `'printers_soul'`** — Completing "The Printer from Hell" was prematurely unlocking `notarized_strike` and showing a false "New ability unlocked!" toast before the Alex subquest was done. Removed the `printer_quest_done` entry from questFlagMap.

20. **Dead node 8 in `alex_it_quest_printer` had wrong quest ID** — `quest: 'daves_legacy'` (copy-paste error). Corrected to `quest: 'printers_soul'`.

21. **`printer_firmware_disk` interactable had no visual furniture** — Added `fileCabinet` at `x:7, z:4` extending the equipment shelf.

---

### The Unauthorized Patch Fixes

22. **Network monitoring terminal had no visual furniture** — Added `monitor` at `x:5, z:6` in server room.

---

### The Printer from Hell / Server Room Secrets Fixes

23. **Printer nodes 36 and 39 claimed `notarized_strike` was unlocked** — After fix #19, the ability no longer unlocks here. Updated printer's final message (node 36) to remove the ability claim; updated narrator (node 39) to announce XP only.

24. **Dead `give_xp: 100` nodes 14 and 18 in `alex_server_secret`** — Unreachable placeholder code; replaced with `end` nodes.

---

## Previous Session (April 9, 2026)

### Documentation

1. **CLAUDE.md updated** — Added previously undocumented systems:
   - `src/effects/` directory: `MaterialLibrary.js`, `ParticleSystem.js`, `PostProcessing.js`.
   - `src/entities/CharacterBuilder.js` and `CharacterAnimator.js`.
   - `src/ui/UIManager.js` and `FloatingText.js`.
   - `src/data/bestiary.js`, `thoughts.js`, `items.js`.
   - `Quest.md` added to Reference Files section.

### Bug Fixes

2. **Roguelite XP too low** — New formula: `Math.round(60 + t * 60)` in `ClientGenerator.js`.
3. **Act 6 ally counter using Act 4 flags** — Introduced `janet_act6_rallied` and `diane_act6_rallied`.
4. **Diane's documents missing** — Added `diane_documents` dialog and filing cabinet interactable at `x:14, z:8` in HR.
5. **Ross not rallying in Act 6** — Added conditional room entry for `ross_act6` routing.
6. **Archive janitor visible during Rolex mission** — Added `notFlag: 'act5_complete'` to final archive janitor entry.
7. **Break room DEF poster stuck behind arcade cabinet** — Moved to `x:5, z:6.9`.

### Features

8. **"Prepare for the Finale" HUD objective** — Lists remaining allies and evidence by name with `<br>`-separated bullet points.
9. **Board Room redesign** — Expanded to 16×12 with `boardroomTable` furniture asset.
10. **`grandPainting` furniture asset** — Replaces `oilPainting`; added to `NO_BLOCK` in `Room.js`.

---

## Current State

- **Build**: `npx vite build` passes clean (chunk size warning only — expected)
- **No test suite** — verification is manual playtest

## Known Issues / Future Work

- **Rachel SVP**: no character model; not removed after defeat
- **Ross post-regional dialog** (`ross_returned`) written but not deeply integrated into story flow
- **Vault room**: needs redesign with bomb door entrance, bank lockboxes
- **Archive room**: more/taller file cabinets, fix monitor direction
- **FBI invasion sequence**: triggers after trust charter retrieved (not yet implemented)
- **Full expansion plan**: see `.claude/plans/eager-nibbling-shannon.md` for Phases 1–9 (create `.claude/plans/` directory first)
