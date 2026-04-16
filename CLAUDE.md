# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TRUST ISSUES: A Trust Officer Simulator** — a satirical office RPG built with Three.js and Vite. No framework; pure vanilla JS ES modules.

## Commands

```bash
npm run dev      # Start dev server at localhost:5173 (--port 5173 to force it)
npm run build    # Build to dist/ (chunk size warning is expected, not an error)
npm run preview  # Preview production build
```

There is no test suite. Verification is manual playtest + `npx vite build`.

## Architecture

### Core Loop (`src/main.js`)

`Game` boots the engine, pushes `TitleState`, then transitions to `ExplorationState` on start/continue. The main loop calls `InputManager.update()`, `updateTweens(dt)`, and `stateManager.update(dt)` every frame.

### Singletons (`src/core/`)

- **`Engine`** — Three.js renderer, scene, orthographic isometric camera. States that own their own scene call `Engine.renderScene(scene, camera)` + `Engine.skipDefaultRender()` to bypass the default render.
- **`EventBus`** — Simple pub/sub. `on()` returns an unsubscribe function.
- **`GameStateManager`** — Pushdown automaton stack. States implement `enter/exit/pause/resume/update(dt)`.
- **`InputManager`** — Keyboard state tracker. Use `isJustPressed()` / `isConfirmPressed()` / `isCancelPressed()`.
- **`AudioManager`** — Music and SFX playback.
- **`SaveManager`** — localStorage persistence. Auto-save fires after every room transition and every story combat victory. Toast notification is shown on every save.
- **`AchievementManager`** — Checks and unlocks achievements stored in a separate localStorage key. Call `AchievementManager.check(player, { event: 'event_name' })` after key game events. Shows a toast on unlock. Event strings in use: `combat_victory`, `power_move_used`, `brace_success`, `retaliate_used`, `weakness_hit`, `second_wind_used`, `desperate_gamble_used`, `all_in_used`, `combo_hit`, `perfect_brace`, `shop_purchase`, `client_accepted`, `client_declined`.

### State Stack (`src/states/`)

- **`TitleState`** — Title screen; calls a callback with `'new'` or `'continue'`.
- **`ExplorationState`** — Top-down isometric world traversal. Exit tiles take priority over NPC interactions when the player stands on them. Handles auto-save, AUM award on client acceptance, and shop access.
- **`CombatState`** — Turn-based combat; owns its own Three.js scene via `CombatScene`. Pushed on top of `ExplorationState` and popped when combat ends via `onEnd(result)` callback. On story victory: restores player HP and MP to max, then auto-plays `encounter.postDialogId` if defined.
- **`DialogState`** — Pushed over exploration/combat for NPC conversations. Processes a flat array of nodes (`text`, `choice`, `condition`, `action`, `end`). Choice nodes use the `prompt` field for question text. Text/choice nodes support a `next` property for arbitrary index jumps. Space bar is intentionally blocked when choices are visible — only Enter or mouse click confirm a choice.
- **`ClientReviewState`** — DOM UI pushed after winning a Reception encounter. Shows the generated client's financials; player accepts or declines, firing `onDecision(accepted)`.
- **`ShopState`** — Supply shop UI; pushed from ExplorationState when player interacts with `type: 'supply_shop'` furniture (break room). Sells consumables, permanent stat upgrades, and office décor using AUM.
- **`MenuState`** — Pause/inventory menu. Tabs: Stats, Abilities, Cosmetics, Journal (enemy log), Achievements, Save Game. "Journal" not "Bestiary". Stats tab shows level, XP bar, HP/Coffee/ATK/DEF/SPD bars, AUM, upgrade points, and death counter.
- **`ArcadeState`** — Self-contained retro minigame. Owns its own Three.js scene.

### Combat System (`src/combat/`)

- **`CombatEngine`** — Pure logic (no rendering). Key methods: `playerAttack()`, `playerAbility(id)`, `playerItem(id)`, `playerBrace(quality)`, `playerPowerMove()`, `playerPressAdvantage()`, `playerSecondWind()`, `playerRetaliate(multiplier)`, `playerDesperateGamble(risk)`, `playerFlee()`, `enemyTurn()`, `processTurnStart(who)`, `telegraph()`, `getActivePhaseIndex()`.
- **`CombatScene`** — Three.js backdrop; handles enemy/player visual animations.
- **`EnemyAI`** — Enemy ability selection; patterns: `random`, `escalating`, `aggressive`, `tactical`, `rotation`, `strategic`, `chaotic`.

**Combat mechanics:**
- **Telegraph**: `telegraph()` pre-rolls the enemy's next ability at the start of each player turn; consumed by `enemyTurn()`. Hint generated in `CombatState._getTelegraphHint()`. If `enemy.vulnerable > 0`, hint appends `(VULNERABLE — hit for 1.5×!)`.
- **Weakness/Resistance**: abilities have a `tag` (`legal`, `social`, `audit`, `technical`). Enemies have `weakness` and `resistance` fields. Weakness = 1.5×; resistance = 0.7×. Applied in `_calcDamage()` only when hitting the enemy.
- **Vulnerability window**: enemy is `vulnerable = 1` after using Heal or Confuse. The next player hit deals 1.5× and clears the flag. Decrements in `processTurnStart('enemy')` if not consumed.
- **Follow Through combo**: if the enemy has any active debuff (negative stat buff) when the player attacks, damage is ×1.25 and `result.combo = true`.
- **Momentum/Confidence bar** (0–100): gains from hits, crits, weakness hits, combos; loses from big incoming hits and stuns.
  - At `pressAdvantageCost`+: `playerPressAdvantage()` — moderate attack + DEF debuff on enemy. Cost scales with SPD: `max(15, 25 − floor((spd − 8) × 0.5))`. Use `CombatEngine.getPressAdvantageCost()` to read the current cost; never hardcode 25. Pass the result as the sixth arg to `CombatHUD.showMainMenu` so the button label stays in sync.
  - At 50+: `playerSecondWind()` — restore 25% HP, clear one status, costs 50 momentum.
  - At 100: `playerPowerMove()` ("Assert Dominance") — ignores 75% DEF, resets bar to 0.
  - Base gain is `10 + (crit?10:0) + (super?10:0) + (combo?5:0)` per hit. Momentum does **not** drain from incoming damage or stuns — only from spending moves.
- **Brace** (QTE): `CombatState._showBraceMiniGame()` runs a timed bar mini-game before calling `playerBrace(quality)`. Quality is `'perfect'`/`'good'`/`'miss'` — each gives different DEF bonus and duration. A successful brace halves the next incoming hit and sets `player.retaliateReady = true`.
- **Retaliate** (QTE): `CombatState._showRetaliateQTE()` first shows a length-selection screen (3–6 keys, styled like Desperate Gamble). The chosen length sets a base multiplier (3→0.75×, 4→1.0×, 5→1.25×, 6→1.5×). `_runRetaliateSequence()` then runs the memorize/input loop; final multiplier = `base × (correct/total)`. Calls `playerRetaliate(multiplier)` (22 base power, +15 momentum). Only available when `retaliateReady` is true.
- **Desperate Gamble**: Available when player HP < 25%. `CombatState._showDesperateGamble()` presents a risk menu (`safe`/`risky`/`all_in`). Calls `playerDesperateGamble(risk)` — damage scales with risk but `all_in` can backfire.
- **Confuse cooldown**: enemy `confuseCooldown` is set to 3 after using Confuse; `_pickRandom()` and `tactical` pattern skip Confuse while `confuseCooldown > 0`.
- **Boss phases**: `_pickEnemyAbility()` selects the active phase by finding the phase with the **lowest** `hpThreshold` that is still ≥ current HP%. Phases are listed high→low. `getActivePhaseIndex()` returns the 0-based phase index for `CombatState._checkPhaseChange()`.
- **Henderson phases**: Karen/Chad/Grandma each have 2 additional phases (triggered at 50% and 25% HP) with new abilities and `phaseMessages`. Phase transitions fire a screen effect, a message, and an enemy taunt.
- **Combat taunts**: `ANDREW_TAUNTS` in `stats.js` maps event keys (`crit`, `weakness_hit`, `brace_success`, `power_move`, `enemy_crit`, `retaliate`, `confused`) to quip arrays. Enemy taunts come from `ENEMY_STATS[id].taunts`. `CombatHUD.showTaunt(text, side)` renders them as speech bubbles.

**Damage formula**: `max(1, floor((atk + power) × 1.5 − def × 0.5 ± rand(3)))`, then weakness/resist multiplier, then vulnerability multiplier, then combo multiplier. Basic attack uses `power = 0`, so damage ≈ the displayed ATK stat. Abilities set their own `power` value.

- **`enemyOverrides`**: `CombatState` accepts an optional fourth constructor argument `enemyOverrides = {}` which is spread over `ENEMY_STATS[id]` after copying, allowing per-fight stat injection without mutating global data. Use this for scripted fights (e.g., one-shot tutorial: `enemyOverrides: { atk: 999 }`). Pass it through `_startCombat()` → `new CombatState(..., enemyOverrides)` → `new CombatEngine(..., enemyOverrides)`.

**`CombatHUD.showMainMenu` signature**: `showMainMenu(silenced, momentum, bracing, retaliateReady, lowHP, pressAdvantageCost = 25)` — pass all six. The sixth argument controls the Press Advantage threshold and button label; get it from `this.engine.getPressAdvantageCost()` in `CombatState`. Tiered momentum buttons, Retaliate, and Desperate Gamble are injected dynamically based on state. No XP bar in combat HUD — XP progress is only shown in the Stats tab of MenuState.

### World (`src/world/`)

- **`RoomManager`** — Loads rooms from `src/data/rooms/index.js`, instantiates NPCs. NPCs with a `condition` object start **hidden** by default; `EntityManager.update()` shows/hides them each frame based on player flags. This means conditional NPCs never flash visible on room entry.
- **`Room`** — Builds `TileMap`, places `Furniture`, manages exit triggers. Furniture entries support an optional `y` property for vertical offset (e.g., `{ type: 'monitor', x: 8, z: 2, y: 0.06 }`) — useful when a custom furniture model has a taller surface than the standard desk height of 0.72.
- **`TileMap`** — Grid-based collision (`canMove()`).
- **`IsometricCamera`** — Smooth follow camera with dead zone.

### Data (`src/data/`)

All game data is plain JS objects/exports:
- `stats.js` — `PLAYER_BASE_STATS` (includes `aum: 0`), `XP_TABLE` (15 levels, exponential), `LEVEL_GROWTH`, `PLAYER_ABILITIES` (with `tag` fields), `ENEMY_STATS` (with `weakness`/`resistance`/`phases`/`phaseMessages`/`taunts` on Hendersons), `ENEMY_ABILITIES`, `ANDREW_TAUNTS`, `ITEMS`, `pickMessage()`
- `shop.js` — `SHOP_ITEMS` (consumables, upgrades, decor) and `SHOP_CATEGORIES`
- `items.js` — Re-exports `ITEMS` from `stats.js` for convenience + exports `STARTING_INVENTORY` (starting loadout: 2× large coffee, 1× antacid).
- `bestiary.js` — `BESTIARY_DATA`: maps every enemy `id` to `{ name, category, quip }`. Displayed in the Journal tab of MenuState. Add an entry here whenever a new enemy is added to `ENEMY_STATS`.
- `thoughts.js` — `ROOM_THOUGHTS`: maps room IDs to arrays of Andrew inner-monologue strings that fire on first visit. Add new strings here to flesh out new rooms without touching ExplorationState.
- `characters.js` — NPC visual configs
- `cosmetics.js` — Unlockable cosmetics with unlock conditions
- `ClientGenerator.js` — Procedurally generates Reception-room clients. `give_item` actions use the `item` field (not `itemId`). Roguelite enemy HP scales as `Math.round((100 + tier * 160) * levelMultiplier)`.
- `rooms/index.js` — All room definitions. NPC entries support `condition: { flag, notFlag }` for conditional spawning. Break room has `type: 'supply_shop'` furniture that triggers `ShopState`.
- `dialogs/index.js`, `quests/index.js`, `encounters/index.js` — dialog trees, quests, encounter configs

### Effects (`src/effects/`)

- **`MaterialLibrary.js`** — Cached toon material factory. `Materials.toon(color, opts)` and `Materials.custom(color)` return `THREE.MeshToonMaterial` instances (3-stop gradient by default, 4-stop with `opts.stops = 4`). Also exports named shortcuts: `Materials.floor()`, `Materials.wall()`, `Materials.desk()`, `Materials.shoes()`, etc. Results are cached by key — never mutate returned materials.
- **`ParticleSystem.js`** — `burst(position, count, color, speed, lifetime)` for omnidirectional explosions; `stream(from, to, count, color, lifetime)` for directed particle trails. Call `update(dt)` each frame.
- **`PostProcessing.js`** — CSS-based vignette overlay (avoids Three.js EffectComposer). `init()` appends the element; `setVignetteIntensity(0–1)` adjusts it; `dispose()` removes it.

### Entities (`src/entities/`)

- **`Player`** — Holds `stats` (including `aum`), `inventory`, `flags`, `questStates`, `position`, `currentRoom`, `actIndex`, `upgradePoints`, `unlockedAbilities`, `deaths`. Key methods: `gainXP()`, `rest()`, `addItem()/useItem()`, `setFlag()/getFlag()`, `serialize()/deserialize()`. Emits `flag-set` on EventBus. `gainXP()` caps at `XP_TABLE.length` (15).
- **`NPC`** — Per-NPC `interactRange` option (defaults to `PLAYER.INTERACT_RANGE`). `conditionFn` toggled each frame by `EntityManager`. `rebuild(config)` uses `config.name` directly — do NOT spread `{ ...config, name: this.id }` or the display name breaks.
- **`EntityManager`** — `update(dt, flags, paused)` evaluates `conditionFn` for every NPC every frame.
- **`CharacterBuilder.js`** — `buildCharacter(config, options)` builds a Three.js character group from box/sphere primitives using `Materials` from MaterialLibrary. `config` holds color fields (`pantsColor`, `bodyColor`, `shirtColor`, `hairColor`, etc.). `options.detailed = true` doubles sphere/capsule segments for combat close-ups. Returns a group with named refs: `group.leftLeg`, `group.rightLeg`, `group.body`, `group.head`, `group.leftArm`, `group.rightArm`.
- **`CharacterAnimator.js`** — Drives walking/idle/sitting animations on a character group. `setWalking(bool)`, `setSitting(bool)`, `setFacing(angle)`, `update(dt)`. Sitting raises hips to `SEAT_Y` and bends legs; walking drives limb swing via sine.

### UI (`src/ui/`)

All UI is DOM-based HTML/CSS overlaid on the canvas:
- **`CombatHUD`** — `showMainMenu(silenced, momentum, bracing, retaliateReady, lowHP, pressAdvantageCost = 25)`. Renders Brace, Retaliate (when ready), Desperate Gamble (when lowHP), tiered momentum buttons (25/50/100), telegraph row, and Confidence bar. `updateTelegraph(hint)` sets the enemy intent text. `showTaunt(text, side)` renders speech bubbles on `'player'` or `'enemy'` side.
- **`DialogBox`** — `onAdvance` / `onChoice` callbacks; `skipToEnd()` / `isComplete()`. Space blocked on choice nodes (only Enter/click).
- **`TransitionOverlay`** — `fadeOut/fadeIn`, `wipeDownOut/wipeDownIn` (descend), `wipeUpOut/wipeUpIn` (ascend).
- **`TouchControls`** — Injects into `InputManager.keys`; activates only on touch devices.
- **`UIManager`** — Master exploration HUD controller. Creates and owns: location indicator (top-left), quest tracker panel (top-right), mini stats bar, interact prompt (bottom-center), and notification toast. `show()/hide()` control the entire HUD; `setLocation(name)`, `setQuest(text)`, `setMiniStats(hp, mp)`, `showInteractPrompt(text)`, `notify(text)`.
- **`FloatingText`** — DOM-based floating damage/heal numbers. `spawn(text, x, y, type)` where `type` is `'damage'`, `'heal'`, etc. `spawnAt3DPosition(text, worldPos, camera, renderer, type)` projects a 3D world position to screen coordinates automatically.

### Constants & Utilities (`src/utils/`)

- `constants.js` — All numeric tuning (`COLORS`, `TILE_SIZE`, `CAMERA`, `PLAYER`, `CHAR`, `ANIM`, `COMBAT`, `TEXT_SPEED`, `LAYERS`). Change values here rather than hardcoding.
- `math.js` — `randomRange()` and helpers.
- `tween.js` — Lightweight tween; call `updateTweens(dt)` each frame.

## Key Patterns

- **State lifecycle**: `enter()` sets up DOM/scene; `exit()` tears it down (remove DOM elements, dispose Three.js geometries/materials, remove event listeners).
- **Combat result flow**: `onEnd(result)` returns `'victory'`, `'defeat'`, or `'flee'`. On story victory: `defeated_<encounterId>` flag is set automatically by `ExplorationState`, `bestiary_<encounterId>` flag is set, HP/MP restored to max, then `encounter.postDialogId` dialog auto-plays if defined. On defeat: `retry_<encounterId>` flag is set; the next encounter routes to a `<encounterId>_retry` dialog. `ending_started` is reset on defeat so the executive floor boss re-triggers. **Flag naming gotcha**: `defeated_<encounterId>` (e.g., `defeated_regional`) is the auto-set combat victory flag. Post-dialogs sometimes also set a *differently named* flag via a `set_flag` action (e.g., `regional_director_defeated` in the penthouse chain dialog). These are distinct flags — always verify which one ExplorationState's event listeners use before writing NPC conditions.
- **Encounter config**: defined in `encounters/index.js`. Each entry has `enemyId`, `preDialogId` (dialog with `start_combat` action node that triggers the fight), `postDialogId` (auto-played after victory), and `canFlee`. The `start_combat` action in a dialog emits `start-combat` on EventBus; ExplorationState queues it via `_pendingCombat` and fires after `dialog-end`.
- **NPC conditional spawning**: set `condition: { flag: 'x' }` or `condition: { notFlag: 'x' }` in the room data NPC entry. NPCs with any condition initialize hidden; no extra code needed. Multiple entries with the same `id` but different conditions are used for state-dependent dialogs (e.g., the Archive janitor has 5 conditional entries covering each quest stage). **Limitation**: a single condition object supports exactly one `flag` AND/OR one `notFlag`. For compound conditions (e.g., "all 4 coworkers met"), derive a synthetic flag in `ExplorationState._refreshStoryProgress()` and gate on that instead.
- **Reception roguelite loop**: `ClientGenerator` procedurally generates enemies. After victory, `ClientReviewState` is pushed. `bossAnger` player flag drives branching. On client acceptance: AUM earned = max(50, floor(assets × 0.01)). Beneficiary chains: use `generateBeneficiaryChain()` + `applyChainModifiers()`.
- **AUM currency**: stored in `player.stats.aum`. Earned from accepted reception clients. Spent in `ShopState`. Permanent stat upgrades from the shop modify `player.stats` directly.
- **Achievements**: `AchievementManager.check(player, ctx)` is called after key game events. The `ctx.event` string is matched against each achievement's `check` function. For `client_accepted`, ctx must also carry `assets` (number) and `attributes` (array with `.positive` booleans) for the Dream Client / High Roller checks. `client_declined` fires in the decline branch of the reception loop. Act-completion achievements fire from the `flag-set` EventBus listener in ExplorationState via the `ACT_ACHIEVEMENT_FLAGS` array — no explicit event string needed, just call `check(player, {})` when any of those flags is set.
- **Shop category flags**: `ShopState` sets `bought_category_consumable`, `bought_category_upgrade`, and `bought_category_decor` on `player` after each successful purchase. These drive the Supply Run achievement.
- **Janitor riddle retry pattern**: Each riddle dialog starts with a `condition` node checking `riddle_X_attempted`. On first entry (`ifFalse`) it sets that flag then falls through to the intro text. On retry (`ifTrue`) it jumps directly to the riddle question, skipping the intro. Wrong-answer paths end without setting the `janitor_riddle_X_done` flag, so the player can re-enter and try again. When adding new riddle dialogs, always insert this two-node gate at positions 0 and 1.
- **Auto-save**: `ExplorationState._autoSave()` calls `SaveManager.save(player.serialize())` and shows a toast every time. Fires on every room transition and every story combat victory.
- **Quest objective display**: The HUD objective text comes from `_getStoryObjective()` in `ExplorationState` (flag-based hardcoded strings), **not** from `quests/index.js` or `QUEST_OBJECTIVES`. Edit `_getStoryObjective()` to change what the player sees.
- **Leveling**: 15 levels, exponential XP curve. Level 1→2 costs 325 XP (~5 reception fights at 65 XP each). Story bosses alone yield ~835 XP max, landing the player around level 4. Levels 5–10 require roguelite grinding; 11–15 are completionist.
- **Henderson difficulty**: Karen/Chad/Grandma are intentionally tough to force roguelite grinding. Karen requires ~level 3–4, Chad ~5–6, Grandma ~7–8. Each has 2 additional combat phases at 50% and 25% HP.
- **Ability tags and weaknesses**: Karen = weak `legal`, resists `social`; Chad = weak `social`, resists `legal`; Grandma = weak `audit`, resists `social`. Tag the appropriate ability and the 1.5× bonus fires automatically.
- **Stat theming**: HP = Patience, MP = Coffee, ATK = Assertiveness, DEF = Composure, SPD = Bureaucratic Efficiency. Player name hardcoded as `'Andrew'`.
- **Dialog data gotchas**: `give_item` actions use `item` field (not `itemId`). Choice nodes use `prompt` field for the question text (not `text`).
- **Dialog action nodes** (full list): `set_flag`, `start_combat`, `give_item`, `heal`, `quest_update`, `give_xp` (calls `player.gainXP(node.xp)`), `modify_stat` (increments `player.stats[node.stat]` by `node.amount`, min 1).
- **One-time poster/side-quest pattern**: Add a `motivationalPoster` furniture entry + `{ type: 'poster', dialogId: 'quest_*' }` interactable to a room. The dialog tree starts with a `condition` node checking a done-flag (`ifTrue` → "already seen" text, `ifFalse` → reward path). The reward path: `set_flag` done → `give_xp` → `modify_stat` → text node with `next` pointing past the "already seen" text → `end`. **Always update both** the `motivationalPoster` furniture entry and the `{ type: 'poster' }` interactable together — they must share the same coordinates. For wall placement: north wall use `z: 0.1`; south wall use `z: [roomHeight - 1.1]` with `rotation: Math.PI`. Values beyond `z: roomHeight - 0.5` land on the exterior wall and are unreachable.
- **Quest interactable visibility**: Any `{ type: 'poster' }` (or other) interactable placed on an otherwise empty tile is invisible — the player has nothing to click toward. Wall-mounted quest items (signal boosters, terminals, etc.) need a matching `motivationalPoster` furniture entry at `x ± 0.9` from the wall tile with the appropriate rotation. Items described as "on a shelf" need a `fileCabinet` (or similar) at the same tile. The interactable tile and the furniture piece must be at the same `x`/`z` (or within 0.9 units for wall-edge alignment).
- **`questFlagMap` and ability unlocks**: The `questFlagMap` object inside `ExplorationState`'s `flag-set` listener maps completion flags to `questStates` keys that gate `PLAYER_ABILITIES[id].unlockQuest`. Only add a flag here if the quest *actually* unlocks an ability. Adding a side-quest done-flag (e.g. `printer_quest_done`) that has no corresponding ability will prematurely set `questStates` and fire a false "New ability unlocked!" toast — and if another quest later sets the same key, the toast fires a second time.
- **Dialog multi-flag gating**: When a quest requires finding N things before completing, the dialog's completion branch must check **all N flags** — not just the last one found. If node 1 only checks the second item's flag, a player who finds that item first can skip the first step entirely. Fix: add a chained condition node between "all found" and the completion path that checks each remaining flag and redirects to a "you still need X" response if any is missing.
- **`ENEMY_ABILITIES` key uniqueness**: `ENEMY_ABILITIES` in `stats.js` is a plain JS object literal — duplicate keys silently overwrite with no error. When multiple enemies share a generic ability name (e.g. `strategic_pivot`), prefix each key with the enemy name (`chief_strategic_pivot`) to avoid silent collisions. Always grep for the key before adding a new ability.
- **NPC `dialogId` overrides act routing**: `_getDialogId()` returns the NPC's hardcoded `dialogId` before it reaches the act-based table (line ~1130 in `ExplorationState`). If an NPC entry has `dialogId: 'foo'`, it will always show that dialog regardless of act. To re-enable act routing for a previously hardcoded NPC, add a new room entry with the right `condition` and **no** `dialogId`.
- **`_getDialogId()` Janitor priority chain** (fires before hardcoded `dialogId` check): (1) Janitor riddles — only at `actIndex >= 3` AND `met_janitor` AND `read_janitor_act3`; without `read_janitor_act3` the riddles are suppressed so `janitor_act3` can fire first. (2) Intro bypass — if `npc.dialogId === 'janitor_intro'` and `met_janitor`, routes to `janitor_return` instead. Use explicit `dialogId: 'janitor_return'` on room entries where routing should produce the return dialog; never rely on `janitor_intro` as a proxy.
- **Alex IT act routing gates**: `alex_it_act2` (encrypted partition reveal) is gated on `karen_defeated`, NOT `briefing_complete`. Three separate guards enforce this: (1) the special story routing block's `hasAct2` condition; (2) the `alex_story_chosen` flag-set listener; (3) an explicit guard after the side quest routing block that returns `alex_it_return` when `karen_defeated` is false and `alex_it_act2` hasn't been read. The third guard exists because the generic `act >= 1` routing would otherwise bypass the special block entirely. Do not remove any of the three.
- **Printer from Hell gate**: `printer_interact` checks `briefing_complete` at node 2 before showing any spooky behavior. Without the briefing, the player sees only "it's just a printer" and the dialog exits. The two-visit split (old `printer_visit_2` flag) is gone — both beats (HELP ME and HENDERSON FILES) now play in a single interaction.
- **Room access gating**: `_changeRoom()` has a `gatedRooms` table in `ExplorationState`. Rooms `archive`, `hr_department`, `vault`, `board_room`, and `penthouse` are blocked with a toast message unless the corresponding flag is set. The exit tile exists unconditionally in room data — the gate lives entirely in `_changeRoom()`. `hr_accessible` and `vault_accessible` are both set simultaneously by `janitor_act4` (along with `janitor_rallied` and `vault_code_1`).
- **`QUEST_OBJECTIVES` vs `_getStoryObjective()`**: `QUEST_OBJECTIVES` (top of `ExplorationState`) is only consulted by `_updateQuest()`, which fires on the `quest-update` EventBus event emitted by dialog action nodes. The primary HUD display is driven entirely by `_getStoryObjective()` — edit that function to change what the player sees moment-to-moment.
- **Act-scoped flags**: When a flag (e.g. `janet_rallied`) is set in an earlier act and reused in a later act's objective counter, it will appear pre-satisfied. Use act-specific flag names (e.g. `janet_act6_rallied`) for any flag that must only be set within a specific act's flow.
- **Objective display supports HTML**: `_getStoryObjective()` return values are injected as `innerHTML` in `_setQuest()`, so `<br>`, `<b>`, etc. work in the HUD panel. The toast notification strips all HTML tags before display — use `.replace(/<br>/gi, ' ').replace(/<[^>]+>/g, '')` pattern already in `_setQuest()`.
- **Large furniture alignment**: `blockRect(tileX, tileZ, w, h)` blocks tiles starting at `(tileX, tileZ)` and extending in the +x/+z direction. For furniture wider than ~3 tiles, design the mesh with its origin at the left-front corner (not centered) and place it at the left-front tile coordinate so visual and collision match. Add footprint to `FURNITURE_FOOTPRINTS` in `Room.js`.
- **Roguelite XP**: Fixed at 60–120 based on client wealth tier `t` (0–1 normalised against `MAX_ASSET`). Formula: `Math.round(60 + t * 60)` in `scaleEnemyStats()` in `ClientGenerator.js`. Not player-level scaled. Client data (including `xpReward`) is serialised into the `currentClient` player flag at generation time, so XP formula changes only affect newly generated clients. **Post-game (after `algorithm_defeated`)**: `generateClient` draws from `POST_GAME_CLIENT_TYPES` (assets 20M–100M), `MAX_ASSET` raises to 100M, and XP shifts to `Math.round(200 + t * 150)` (200–350). First post-game reception entry fires a one-time Diane toast (gated on `postGameReceptionUnlocked` flag).

## Key Story Flags

Critical flags that are easy to get wrong (not derivable from a single file):

| Flag | When set | Effect |
|------|----------|--------|
| `ready_for_ross` | Auto-derived in `_refreshStoryProgress()` when all 4 `met_*` flags set | Unlocks Ross dialog |
| `branch_chosen` | After Henderson decision with Ross | Ross moves to exec floor conf table |
| `act2_complete` | Set by all three Act 2 finale post-dialogs (`compliance_defeated`, `regional_defeated`, `ross_boss_defeated`) | Moves Ross off exec floor, back to office; starts Act 3 |
| `defeated_regional` | Auto on combat victory vs `regional` encounter | Regional NPC hides (path_legal only — not a reliable act gate) |
| `defeated_regional_director` | Auto on combat victory vs `regional_director` (penthouse) | Separate penthouse chain flag |
| `regional_director_defeated` | Set by `regional_director_defeated` post-dialog action | Used by ExplorationState to trigger Algorithm fight |
| `retry_karen` | On first Karen defeat | Enables roguelite tutorial phase |
| `defeated_karen` | Auto on Karen victory | Ends roguelite tutorial |
| `read_janitor_act3` | End of `janitor_act3` dialog | Guards Janitor riddle unlock — riddles only become available after this is set |
| `has_archive_password` | Compliance crossword (talk to Compliance Auditor at act >= 3) | Gates `archive_terminal` interactable; player must complete crossword first |
| `janitor_rallied` | `janitor_act4` dialog | Simultaneously sets `vault_accessible`, `hr_accessible`, and `vault_code_1` |
| `act5_complete` | After Rachel defeated | Starts Act 6; hides archive janitor |
| `janet_act6_rallied` | `janet_act6` dialog | Act 6 ally counter — NOT `janet_rallied` |
| `diane_act6_rallied` | `diane_act6` dialog | Act 6 ally counter |
| `diane_evidence` | `diane_documents` dialog (HR cabinet at x:14, z:8) | Act 6 evidence counter |
| `act6_complete` | Set when `has_rolex` is received | Triggers Act 7 / penthouse unlock |
| `penthouse_entered` | Set when player first enters penthouse | Triggers `cfos_assistant_combat` dialog chain via `_pendingDialog` |
| `morse_decoded` | `morse_code_rack` dialog after reading Rack C (Server Room x:3 z:3) | Gates HUD stage in 3:47 AM Anomaly — "Find Rack C" vs "Return to Alex" |
| `all_boosters_placed` | Derived in flag-set listener when all three booster flags are true | Gates Network Ghost completion — do not set manually, it fires automatically |
| `phantom_hr_found` | `phantom_expense_hr` interactable (HR x:11 z:9) | Required alongside `phantom_workstation_found` for Phantom Approver completion |

## Reference Files

- `HANDOFF.md` — recent bug fixes and known issues; check at session start.
- `Quest.md` — full quest list with objectives and XP rewards. Authoritative source for story structure and side quest steps.
- `Gameplay.md` — roguelite loop, item reference, achievements, cosmetics, and combat attributes. Authoritative source for those systems.
- `.claude/plans/eager-nibbling-shannon.md` — expansion plans (Phases 1–9). Create `.claude/plans/` if it doesn't exist yet.
