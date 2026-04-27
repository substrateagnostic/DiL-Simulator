# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TRUST ISSUES: A Trust Officer Simulator** — a satirical office RPG built with Three.js and Vite. No framework; pure vanilla JS ES modules.

## Commands

```bash
npm run dev      # Start dev server at localhost:5173 (--port 5173 to force it)
npm run build    # Build to dist/ (chunk size warning is expected, not an error)
npm run preview  # Preview production build
npm run editor   # Start balance/room/character editor at localhost:3747 (developer-only, never bundled)
```

There is no test suite. Verification is manual playtest + `npx vite build`.

### Balance & Room Editor

`npm run editor` runs `scripts/editor.js` — a plain Node.js HTTP server. Open **http://localhost:3747** for a 12-tab editor: Player, Abilities, Enemies, Allies, Shop, Rooms, Combat Sim, Encounters, Characters, Dialogs, Diff. Changes write to five override JSON files in `src/data/`; Publish button commits and pushes all five. The editor is never included in the Vite build and players cannot access it.

A status pill in the header polls `/api/diff-status` every 5s and shows clean/unpublished state. The `?` Help button opens a modal explaining the override pattern.

**Allies tab** — edit `ALLY_STATS` and `ALLY_ABILITIES` fields for all four allies; writes to `ally-overrides.json`.

**Encounters tab** — full edit with Add Encounter button. Supports both `enemyId` (single) and `enemyIds`/`partyIds` (multi-combatant) structures. Writes to `encounter-overrides.json`.

**Combat Sim tab** — extended to multi-combatant Monte Carlo (N enemies vs M allies).

#### Rooms tab

The Rooms tab has a 2D top-down canvas with full drag-and-drop editing:

- **Drag furniture/NPCs** — click and drag any dot; snaps to 0.25 tile increments, clamped to room bounds
- **Rotate** — select an item, press `R` to rotate 90° clockwise; or use the edit panel preset buttons (N/E/S/W)
- **Scroll to zoom** — 40%–400%, zoom % shown above the canvas
- **Exit tile overlay** — green squares show doorway positions; `→` label appears when zoomed in
- **NPC facing arrows** — orange arrow on each NPC dot shows its `facing` direction
- **Furniture/NPC search** — filter box above the item list; section titles show `(N/Total)` when filtered
- **Flag simulator** — collapsible section below the canvas; toggle story flags to preview which NPCs would be visible/hidden in the current room
- **Undo/redo** — Ctrl+Z / Ctrl+Y, 50-step stack per room, resets on room change

#### Dialogs tab

Read-only browser for all dialog trees. Search by dialog ID, speaker, or text. Click any entry to expand and read its nodes color-coded by type (teal=text, yellow=choice, green=action, purple=condition, gray=end).

#### Real-time 3D live preview

Run both servers simultaneously for live 3D furniture preview:

```bash
npm run dev     # game at localhost:5173/?dev
npm run editor  # editor at localhost:3747
```

The game (when opened with `?dev`) connects to the editor via Server-Sent Events (`http://localhost:3747/api/live`). As you drag furniture in the editor, the mesh moves in the 3D view in real time (~20fps) with no page reload. Interactable tiles follow their furniture automatically when the item crosses a tile boundary. When satisfied with positions, click **Save Room Overrides** — this writes to disk and Vite reloads, baking the positions permanently. Do not click Save mid-drag or Vite will reload.

### Dev Mode

Append `?dev` to the game URL to enable dev mode (e.g. `http://localhost:5173/?dev`). Has no effect on normal play — the flag is read once from `URLSearchParams` in `src/utils/constants.js` (`DEV_MODE`).

**In combat** — press `` ` `` (backtick) during your turn: instantly kills the enemy and routes through the normal victory path, so XP, story flags, and post-dialogs all fire correctly.

**Live editor preview** — opening the game with `?dev` also connects an `EventSource` to `http://localhost:3747/api/live`. While the editor is running, dragging furniture updates the 3D mesh in real time. If the editor is not running, the connection fails silently.

**In exploration** — press `F2`: opens a dev panel with two sections:

- **Save Scum** — three save slots with Save and Load buttons. Save writes the current state to that slot and marks it active (future auto-saves go there). Load deserializes the save, reloads the room, and calls `syncFromPlayerState()`. The active slot is highlighted with ★.
- **Quest Skip** — six cumulative act presets. Clicking a preset writes directly to `player.flags`, then calls `_syncActFromFlags()` and `_refreshStoryProgress()`. Some narrative read-flags are not included, so a small number of NPC dialogs may replay, but all room gates, NPC conditions, and act routing will be correct.

| Preset | Key flags set |
|--------|--------------|
| Act 1 — Briefing Complete | `briefing_complete`, `branch_chosen`, all `met_*` |
| Act 3 — Hendersons Defeated | + `act2_complete`, all Henderson/Act 2 defeat flags |
| Act 4 — Archive Evidence Found | + `act3_complete`, `has_archive_evidence` |
| Act 5 — Charter Recovered | + `act4_complete`, `has_charter`, `janitor_rallied` |
| Act 6 — Rachel Defeated | + `act5_complete`, full gauntlet defeat flags |
| Act 7 — Penthouse Unlocked | + `act6_complete`, `has_rolex`, all Act 6 ally flags |

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
- **`DialogState`** — Pushed over exploration/combat for NPC conversations. Processes a flat array of nodes (`text`, `choice`, `condition`, `action`, `end`). Choice nodes use the `prompt` field for question text. Text/choice nodes support a `next` property for arbitrary index jumps. Space bar is intentionally blocked when choices are visible — only Enter or mouse click confirm a choice. Individual choice entries support `requires` (flag must be truthy) and `requiresNot` (flag must be falsy) fields for dynamic filtering without extra condition nodes.
- **`ClientReviewState`** — DOM UI pushed after winning a Reception encounter. Shows the generated client's financials; player accepts or declines, firing `onDecision(accepted)`.
- **`ShopState`** — Supply shop UI; pushed from ExplorationState when player interacts with `type: 'supply_shop'` furniture (break room). Sells consumables, permanent stat upgrades, and office décor using AUM.
- **`MenuState`** — Pause/inventory menu. Tabs: Stats, Abilities, Cosmetics, Journal (enemy log), Achievements, Save Game. "Journal" not "Bestiary". Stats tab shows level, XP bar, HP/Coffee/ATK/DEF/SPD bars, AUM, upgrade points, and death counter.
- **`ArcadeState`** — Self-contained retro minigame. Owns its own Three.js scene.

### Combat System (`src/combat/`)

- **`CombatEngine`** — Pure logic (no rendering). Operates on `allies[]` and `enemies[]` arrays internally; single-enemy/single-ally backward-compat getters (`enemy`, `player`) still work. Key methods: `playerAttack()`, `playerAbility(id)`, `playerItem(id)`, `playerBrace(quality)`, `playerPowerMove()`, `playerPressAdvantage()`, `playerSecondWind()`, `playerRetaliate(multiplier)`, `playerDesperateGamble(risk)`, `playerFlee()`, `allyTurn(idx)`, `playerVoiceAction(actionId, targetIndex)`, `getAvailableVoices()`, `enemyTurn()`, `processTurnStart(who)`, `telegraph()`, `getActivePhaseIndex()`, `_resolveTarget(targetIndex)`. `voiceState` object tracks per-fight voice state (`sawCrit`, `sawEnemyHeal`, `tookDamageRecently`, `charterUnlocked`, `skepticLocked`, `charterInvoked`, fired-voice flags).
- **`CombatScene`** — Three.js backdrop. `setCombatants(enemyIds, partyIds, player)` positions multiple enemies and party members. Pulsing red ring marks the selected target. Per-target hurt/attack/defeat animations.
- **`EnemyAI`** — Enemy ability selection; patterns: `random`, `escalating`, `aggressive`, `tactical`, `rotation`, `strategic`, `chaotic`. Enemies pick a target ally per attack via aggro logic (55% Andrew bias, otherwise lowest HP-ratio ally).

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
- **`Furniture`** — All furniture is built as static factory methods on the `Furniture` class (e.g., `Furniture.desk()`, `Furniture.pokerTable()`). To add a new type: (1) add a static method in `Furniture.js`, (2) add the type string to the `switch` in `Room._placeFurniture()`, (3) if it shouldn't block player movement, add it to the `NO_BLOCK` set at the top of `Room.js`, (4) if wider than ~3 tiles, add a footprint entry to `FURNITURE_FOOTPRINTS` in `Room.js`.
- **`TileMap`** — Grid-based collision (`canMove()`).
- **`IsometricCamera`** — Smooth follow camera with dead zone.

### Data (`src/data/`)

All game data is plain JS objects/exports:
- `stats.js` — `PLAYER_BASE_STATS` (includes `aum: 0`), `XP_TABLE` (15 levels, exponential), `LEVEL_GROWTH`, `PLAYER_ABILITIES` (with `tag` fields), `ENEMY_STATS` (with `weakness`/`resistance`/`phases`/`phaseMessages`/`taunts` on Hendersons), `ENEMY_ABILITIES`, `ANDREW_TAUNTS`, `ITEMS`, `pickMessage()`. Imports `balance.json` and applies overrides via `Object.assign` at the bottom of the file.
- `shop.js` — `SHOP_ITEMS` (consumables, upgrades, decor, renovation) and `SHOP_CATEGORIES`. Renovations are post-game only (5M AUM each, +2000 XP), except `renovation_penthouse` which costs 10M AUM. Each renovation item has a `flag` that is set on purchase and may trigger visual changes in the target room. Imports `balance.json` and applies shop price overrides.
- `balance.json` — Editor-managed override layer for all tunable values: player base stats, all enemy stats, all ability stats, all shop prices. Written by `npm run editor`. Imported with `with { type: 'json' }` in `stats.js` and `shop.js`.
- `room-overrides.json` — Editor-managed furniture/NPC position overrides. Structure: `{ roomId: { furniture: { "index": { x, z, rotation } }, npcs: { "index": { x, z, facing } } } }`. Applied in `Room.build()` before `_placeFurniture()`.
- `character-overrides.json` — Editor-managed character color overrides. Structure: `{ characterId: { bodyColor: 0xRRGGBB, ... } }`. Applied at the bottom of `characters.js` via `Object.assign` loop.
- `items.js` — Re-exports `ITEMS` from `stats.js` for convenience + exports `STARTING_INVENTORY` (starting loadout: 2× large coffee, 1× antacid).
- `bestiary.js` — `BESTIARY_DATA`: maps every enemy `id` to `{ name, category, quip }`. Displayed in the Journal tab of MenuState. Add an entry here whenever a new enemy is added to `ENEMY_STATS`.
- `thoughts.js` — `ROOM_THOUGHTS`: maps room IDs to arrays of Andrew inner-monologue strings that fire on first visit. Add new strings here to flesh out new rooms without touching ExplorationState.
- `characters.js` — NPC visual configs
- `cosmetics.js` — Unlockable cosmetics with unlock conditions
- `ClientGenerator.js` — Procedurally generates Reception-room clients. `give_item` actions use the `item` field (not `itemId`). Roguelite enemy HP scales as `Math.round((100 + tier * 160) * levelMultiplier)`.
- `rooms/index.js` — All room definitions. NPC entries support `condition: { flag, notFlag }` for conditional spawning. Break room has `type: 'supply_shop'` furniture that triggers `ShopState`.
- `dialogs/index.js`, `quests/index.js`, `encounters/index.js` — dialog trees, quests, encounter configs. Encounters support both `enemyId` (single) and `enemyIds`/`partyIds` arrays (multi-combatant).
- `voices.js` — `VOICES` map (id → trigger function, color, actionId) and `VOICE_ACTIONS` map (actionId → name, quote, needsTarget, effect function). The five voices are `apprentice`, `litigator`, `skeptic`, `witness`, and `the_charter`. All effects are free (no MP) and single-use per fight. `CombatEngine.voiceState` tracks per-fight state; `Player.voiceCounts` tracks campaign-wide usage.
- `allies.js` — `ALLY_STATS` (id → maxHP, maxMP, atk, def, spd, growthFactor, starterAbilities), `ALLY_ABILITIES` (id → cost, power, type, tag, etc.), `ALLY_AI_PATTERNS` (id → pattern string). Loads `ally-overrides.json` at module load and applies via `Object.assign`. Current allies: `janet`, `alex_it`, `isaiah`, `diane`.
- `ally-overrides.json` — Editor-managed ally stat and ability overrides. Written by `npm run editor`.
- `encounter-overrides.json` — Editor-managed encounter overrides. Written by `npm run editor`.

### Effects (`src/effects/`)

- **`MaterialLibrary.js`** — Cached toon material factory. `Materials.toon(color, opts)` and `Materials.custom(color)` return `THREE.MeshToonMaterial` instances (3-stop gradient by default, 4-stop with `opts.stops = 4`). Also exports named shortcuts: `Materials.floor()`, `Materials.wall()`, `Materials.desk()`, `Materials.shoes()`, etc. Results are cached by key — never mutate returned materials.
- **`ParticleSystem.js`** — `burst(position, count, color, speed, lifetime)` for omnidirectional explosions; `stream(from, to, count, color, lifetime)` for directed particle trails. Call `update(dt)` each frame.
- **`PostProcessing.js`** — CSS-based vignette overlay (avoids Three.js EffectComposer). `init()` appends the element; `setVignetteIntensity(0–1)` adjusts it; `dispose()` removes it.

### Entities (`src/entities/`)

- **`Player`** — Holds `stats` (including `aum`), `inventory`, `flags`, `questStates`, `position`, `currentRoom`, `actIndex`, `upgradePoints`, `unlockedAbilities`, `deaths`, `party` (recruited ally id array), `allyState` (per-ally `{ hp, mp, unlockedAbilities }`), `voiceCounts` (`{ apprentice, litigator, skeptic, witness }` — campaign-wide), `allyControl` (`'manual'` | `'auto'`). Key methods: `gainXP()`, `rest()` (restores all allies too), `addItem()/useItem()`, `setFlag()/getFlag()`, `addAlly(allyId)`, `canUnlockAllyAbility(allyId, abilityId)`, `spendPointOnAllyAbility(allyId, abilityId)`, `serialize()/deserialize()`. Emits `flag-set` on EventBus. `gainXP()` caps at `XP_TABLE.length` (15).
- **`NPC`** — Per-NPC `interactRange` option (defaults to `PLAYER.INTERACT_RANGE`). `conditionFn` toggled each frame by `EntityManager`. `rebuild(config)` uses `config.name` directly — do NOT spread `{ ...config, name: this.id }` or the display name breaks.
- **`EntityManager`** — `update(dt, flags, paused)` evaluates `conditionFn` for every NPC every frame.
- **`CharacterBuilder.js`** — `buildCharacter(config, options)` builds a Three.js character group from box/sphere primitives using `Materials` from MaterialLibrary. `config` holds color fields (`pantsColor`, `bodyColor`, `shirtColor`, `hairColor`, etc.). `options.detailed = true` doubles sphere/capsule segments for combat close-ups. Returns a group with named refs: `group.leftLeg`, `group.rightLeg`, `group.body`, `group.head`, `group.leftArm`, `group.rightArm`.
- **`CharacterAnimator.js`** — Drives walking/idle/sitting animations on a character group. `setWalking(bool)`, `setSitting(bool)`, `setFacing(angle)`, `update(dt)`. Sitting raises hips to `SEAT_Y` and bends legs; walking drives limb swing via sine.

### UI (`src/ui/`)

All UI is DOM-based HTML/CSS overlaid on the canvas:
- **`CombatHUD`** — `showMainMenu(silenced, momentum, bracing, retaliateReady, lowHP, pressAdvantageCost = 25)`. Renders Brace, Retaliate (when ready), Desperate Gamble (when lowHP), tiered momentum buttons (25/50/100), telegraph row, Confidence bar, and **Thoughts** button (only visible when `getAvailableVoices()` returns at least one voice). `updateTelegraph(hint)` sets the enemy intent text. `showTaunt(text, side)` renders speech bubbles on `'player'` or `'enemy'` side. `updateBuffStatus(playerBuffs, enemyBuffs)` renders colored pill badges below the stat bars — call from `CombatState._enablePlayerInput()` and `_updateHUD()`. Duration displayed as `b.duration + 1` (a buff at `duration: 2` has 3 turns left). `showVoices(voices)` renders the Thoughts submenu with voice-card layout (border-color matched to voice). `showAllyMenu(ally, enemies)` shows an ally's action menu (Attack, Abilities, Skip, Switch to Auto). `showAllyAbilities(ally, abilities)` renders the ally ability picker. Top row of enemy health bars with selection highlight; compact party-bar row below player stats; target-picker overlay (←/→ cycle, Enter confirm, Esc cancel) for single-target actions when 2+ enemies alive.
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
- **Dialog action nodes** (full list): `set_flag`, `start_combat`, `give_item`, `heal`, `quest_update`, `give_xp` (calls `player.gainXP(node.xp)`), `modify_stat` (increments `player.stats[node.stat]` by `node.amount`, min 1), `recruit_ally` (calls `player.addAlly(node.allyId)`), `unlock_ally_ability` (teaches `node.abilityId` to `node.allyId` for free, no upgrade point cost).
- **One-time poster/side-quest pattern**: Add a `motivationalPoster` furniture entry + `{ type: 'poster', dialogId: 'quest_*' }` interactable to a room. The dialog tree starts with a `condition` node checking a done-flag (`ifTrue` → "already seen" text, `ifFalse` → reward path). The reward path: `set_flag` done → `give_xp` → `modify_stat` → text node with `next` pointing past the "already seen" text → `end`. **Always update both** the `motivationalPoster` furniture entry and the `{ type: 'poster' }` interactable together — they must share the same coordinates. For wall placement: north wall use `z: 0.1`; south wall use `z: [roomHeight - 1.1]` with `rotation: Math.PI`. Values beyond `z: roomHeight - 0.5` land on the exterior wall and are unreachable.
- **Quest interactable visibility**: Any `{ type: 'poster' }` (or other) interactable placed on an otherwise empty tile is invisible — the player has nothing to click toward. Wall-mounted quest items (signal boosters, terminals, etc.) need a matching `motivationalPoster` furniture entry at `x ± 0.9` from the wall tile with the appropriate rotation. Items described as "on a shelf" need a `fileCabinet` (or similar) at the same tile. The interactable tile and the furniture piece must be at the same `x`/`z` (or within 0.9 units for wall-edge alignment).
- **`questFlagMap` and ability unlocks**: The `questFlagMap` object inside `ExplorationState`'s `flag-set` listener maps completion flags to `questStates` keys that gate `PLAYER_ABILITIES[id].unlockQuest`. Only add a flag here if the quest *actually* unlocks an ability. Adding a side-quest done-flag (e.g. `printer_quest_done`) that has no corresponding ability will prematurely set `questStates` and fire a false "New ability unlocked!" toast — and if another quest later sets the same key, the toast fires a second time.
- **Dialog multi-flag gating**: When a quest requires finding N things before completing, the dialog's completion branch must check **all N flags** — not just the last one found. If node 1 only checks the second item's flag, a player who finds that item first can skip the first step entirely. Fix: add a chained condition node between "all found" and the completion path that checks each remaining flag and redirects to a "you still need X" response if any is missing.
- **Multi-combatant encounters**: set `enemyIds: [...]` (array) instead of `enemyId` for multi-enemy fights. Optionally set `partyIds: [...]` to force specific allies (e.g. `['janet']`); omit to use `player.party` automatically. Post-dialog still needs to set per-enemy `defeated_<id>` flags manually if downstream code gates on them — the engine only auto-sets `defeated_<encounterId>`. See `restructuring_trio` as the canonical example.
- **Voices system**: `CombatEngine.voiceState` resets each fight. Triggers evaluate at the start of each player turn via `getAvailableVoices()`. Once a voice fires (`voiceState.fired_<id> = true`) it can't fire again that fight. `Player.voiceCounts[id]++` is incremented on each use and persists in saves. Threshold flags (`voice_litigator_high`, `voice_witness_high`, `voice_skeptic_high`) are auto-set in `Player.addAlly()` / `Player.serialize()` — never set them manually. The `the_charter` voice is unlocked in `CombatState.enter()` by checking `witness_charter_read` on the player and calling `engine.voiceState.charterUnlocked = true`.
- **`ENEMY_ABILITIES` key uniqueness**: `ENEMY_ABILITIES` in `stats.js` is a plain JS object literal — duplicate keys silently overwrite with no error. When multiple enemies share a generic ability name (e.g. `strategic_pivot`), prefix each key with the enemy name (`chief_strategic_pivot`) to avoid silent collisions. Always grep for the key before adding a new ability.
- **JSON imports require `with { type: 'json' }`**: Node.js 24 (used by the editor server) requires the import attribute on all JSON imports. Vite 7 also supports it. Any file that does `import x from './foo.json'` must use `import x from './foo.json' with { type: 'json' }` — otherwise the editor server fails to load that module via dynamic import. Current files: `stats.js`, `shop.js`, `characters.js`, `Room.js`.
- **Buff duration off-by-one**: `processTurnStart()` fires at the *start* of the player's turn before they act. The removal threshold is `< 0` (not `<= 0`) so a buff at `duration: 0` survives the current turn and expires after it. A buff with `buffDuration: 3` in `balance.json` therefore provides 3 full player turns of benefit. Do not change the threshold back to `<= 0`.
- **NPC `dialogId` overrides act routing**: `_getDialogId()` returns the NPC's hardcoded `dialogId` before it reaches the act-based table (line ~1130 in `ExplorationState`). If an NPC entry has `dialogId: 'foo'`, it will always show that dialog regardless of act. To re-enable act routing for a previously hardcoded NPC, add a new room entry with the right `condition` and **no** `dialogId`.
- **`_getDialogId()` Janitor priority chain** (fires before hardcoded `dialogId` check): (1) Janitor riddles — only at `actIndex >= 3` AND `met_janitor` AND `read_janitor_act3`; without `read_janitor_act3` the riddles are suppressed so `janitor_act3` can fire first. (2) Intro bypass — if `npc.dialogId === 'janitor_intro'` and `met_janitor`, routes to `janitor_return` instead. Use explicit `dialogId: 'janitor_return'` on room entries where routing should produce the return dialog; never rely on `janitor_intro` as a proxy.
- **Executive floor Act 5 gate**: `_changeRoom()` blocks `executive_floor` when `restructuring_defeated` is set but `corporate_lawyer_defeated` is not (the gauntlet is in progress). Toast: "The elevator won't open. Someone's waiting for you in the lobby." The gate is not present before `restructuring_defeated` is set (Acts 1–4) or after `corporate_lawyer_defeated` is set. Do not add a separate `gatedRooms` entry — the check is an explicit conditional before the main gate table.
- **Team pre-intro guard in `_getDialogId()`**: `janet`, `intern`, `isaiah`, and `alex_it` return `'team_pre_intro'` if `checked_desk` is not set and the NPC's personal intro-read flag (`read_<id>_intro`) is not set. This prevents the player from doing full NPC conversations before settling at their desk. The guard fires before act routing.
- **Karen NPC multi-entry pattern**: The conference room has three conditional Karen entries sharing `id: 'karen'` at the same position — `briefing_complete+!retry_karen` (first meeting), `retry_karen+!karen_retry_ready` (locked out, uses `karen_not_ready` dialog), `karen_retry_ready+!karen_defeated` (retry available, uses `karen_meeting`). When adding a similar "gated re-fight" NPC, use this three-entry pattern rather than dialog condition nodes.
- **`getCombatStats()` for display**: Always call `player.getCombatStats()` (not `player.stats`) when displaying stats in UI — it applies equipped cosmetic bonuses. `player.stats` holds the raw base values; `getCombatStats()` is the authoritative in-battle and display value.
- **Alex IT act routing gates**: `alex_it_act2` (encrypted partition reveal) is gated on `karen_defeated`, NOT `briefing_complete`. Three separate guards enforce this: (1) the special story routing block's `hasAct2` condition; (2) the `alex_story_chosen` flag-set listener; (3) an explicit guard after the side quest routing block that returns `alex_it_return` when `karen_defeated` is false and `alex_it_act2` hasn't been read. The third guard exists because the generic `act >= 1` routing would otherwise bypass the special block entirely. Do not remove any of the three.
- **Printer from Hell gate**: `printer_interact` checks `briefing_complete` at node 2 before showing any spooky behavior. Without the briefing, the player sees only "it's just a printer" and the dialog exits. The two-visit split (old `printer_visit_2` flag) is gone — both beats (HELP ME and HENDERSON FILES) now play in a single interaction.
- **Conditional room resolution (`_resolveRoomId()`)**: `ExplorationState._resolveRoomId(roomId)` maps a canonical room ID to the actual room ID to load, based on player flags. Used for rooms that expand when a flag is set without changing save data, NPC references, or cross-room exit positions. Currently: `ross_office` → `ross_office_large` (when `corner_office_renovated`) and `penthouse` → `penthouse_expanded` (when `renovation_penthouse`). `player.currentRoom` always stores the *canonical* ID. Add cases here (never change `currentRoom` assignment) when a room should swap layouts on a flag.
- **Room access gating**: `_changeRoom()` has a `gatedRooms` table in `ExplorationState`. Rooms `archive`, `hr_department`, `vault`, `board_room`, `penthouse`, and the three penthouse wings (`penthouse_aquarium`, `penthouse_analytics`, `penthouse_bar`) are blocked with a toast message unless the corresponding flag is set. The exit tile exists unconditionally in room data — the gate lives entirely in `_changeRoom()`. `hr_accessible` and `vault_accessible` are both set simultaneously by `janitor_act4` (along with `janitor_rallied` and `vault_code_1`). The penthouse wing rooms require `renovation_penthouse` and show "The suite wing is unfinished. Fund the renovation first."
- **`QUEST_OBJECTIVES` vs `_getStoryObjective()`**: `QUEST_OBJECTIVES` (top of `ExplorationState`) is only consulted by `_updateQuest()`, which fires on the `quest-update` EventBus event emitted by dialog action nodes. The primary HUD display is driven entirely by `_getStoryObjective()` — edit that function to change what the player sees moment-to-moment.
- **Act-scoped flags**: When a flag (e.g. `janet_rallied`) is set in an earlier act and reused in a later act's objective counter, it will appear pre-satisfied. Use act-specific flag names (e.g. `janet_act6_rallied`) for any flag that must only be set within a specific act's flow.
- **Objective display supports HTML**: `_getStoryObjective()` return values are injected as `innerHTML` in `_setQuest()`, so `<br>`, `<b>`, etc. work in the HUD panel. The toast notification strips all HTML tags before display — use `.replace(/<br>/gi, ' ').replace(/<[^>]+>/g, '')` pattern already in `_setQuest()`.
- **Large furniture alignment**: `blockRect(tileX, tileZ, w, h)` blocks tiles starting at `(tileX, tileZ)` and extending in the +x/+z direction. For furniture wider than ~3 tiles, design the mesh with its origin at the left-front corner (not centered) and place it at the left-front tile coordinate so visual and collision match. Add footprint to `FURNITURE_FOOTPRINTS` in `Room.js`.
- **Room location display names**: `_updateLocationDisplay()` in `ExplorationState.js` uses a hardcoded `names` lookup (around line 1624). The room data `name` field is completely ignored. When adding a new room or renaming one, add an entry to this lookup — otherwise the raw room ID is shown in the HUD.
- **Canvas texture pattern for furniture screens**: Use `new THREE.CanvasTexture(canvas)` with `texture.minFilter = THREE.LinearFilter` and `texture.generateMipmaps = false` for crisp 2D procedural displays (stock tickers, data panels, movie screens, etc.). Draw content via the HTML5 Canvas 2D API before passing to the texture.
- **Z-fighting on PlaneGeometry overlays**: A `PlaneGeometry` screen placed flush against a `BoxGeometry` face will flicker (z-fighting) whenever they share the same world z. Fix: push the plane's z past every box face it overlaps, including front faces of inner trim boxes. Remove `THREE.DoubleSide` — it doesn't prevent z-fighting and forces both faces to render. Check all BoxGeometry components: `z_center + depth/2` gives the front face world position; the plane must exceed the maximum of all these.
- **Furniture rotation convention**: `rotation` in room data sets `mesh.rotation.y` in radians. `rotation: 0` faces north (toward −z). `Math.PI` faces south. `Math.PI/2` faces east. `-Math.PI/2` (or `Math.PI * 1.5`) faces west. The isometric camera angle means east/west rotations look different from what you'd expect in a top-down view — test in-game.
- **Roguelite XP**: Fixed at 60–120 based on client wealth tier `t` (0–1 normalised against `MAX_ASSET`). Formula: `Math.round(60 + t * 60)` in `scaleEnemyStats()` in `ClientGenerator.js`. Not player-level scaled. Client data (including `xpReward`) is serialised into the `currentClient` player flag at generation time, so XP formula changes only affect newly generated clients. **Post-game (after `algorithm_defeated`)**: `generateClient` draws from `POST_GAME_CLIENT_TYPES` (assets 20M–100M), `MAX_ASSET` raises to 100M, and XP shifts to `Math.round(200 + t * 150)` (200–350). First post-game reception entry fires a one-time Diane toast (gated on `postGameReceptionUnlocked` flag). **HP variance**: `scaleEnemyStats()` multiplies `maxHP` by a random factor of `0.70–1.30` so clients at similar wealth tiers feel distinct. **Whale client roll**: 5% chance on every non-post-game reception visit to spawn a whale client (100M–250M assets, drawn from `POST_GAME_CLIENT_TYPES`, uses post-game XP/stat scaling). Crypto volatility is suppressed for whale rolls. AUM earned from a whale follows the same `max(50, floor(assets × 0.01))` formula.

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
| `karen_retry_ready` | Set by ExplorationState when player completes enough tutorial clients after first Karen loss | Gates `karen_not_ready` dialog; without this flag the player gets the "come back later" Karen line instead of the real fight |
| `corporate_lawyer_defeated` | Auto on combat victory vs `corporate_lawyer` encounter | Clears the executive floor Act 5 gate — elevator blocked until this is set |
| `witness_charter_read` | End of `team_chat_hub` Witness-high branch | Unlocks `the_charter` voice in the Rachel boss fight |
| `andrew_invoked_charter` | Set by `charter_read` voice action in Rachel fight | Activates the Charter-read epilogue branch in `rachel_boss_defeated` dialog |
| `andrew_steadied` | Litigator-high `team_chat_hub` branch, "steadied" response | Activates the Steadied epilogue branch in `rachel_boss_defeated` dialog |
| `andrew_hardened` | Litigator-high `team_chat_hub` branch, "hardened" response | Activates the Hardened epilogue branch in `rachel_boss_defeated` dialog |
| `alex_badge_audit_started` | Accepting the Badge Audit quest | Makes PATCH-3 server rack visible in the server room |
| `alex_badge_audit_complete` | Returning to Alex with the patch log | Marks Badge Audit quest done |

## Reference Files

- `HANDOFF.md` — recent bug fixes and known issues; check at session start.
- `Quest.md` — full quest list with objectives and XP rewards. Authoritative source for story structure and side quest steps.
- `Gameplay.md` — roguelite loop, item reference, achievements, cosmetics, and combat attributes. Authoritative source for those systems.
- `.claude/plans/eager-nibbling-shannon.md` — expansion plans (Phases 1–9). Create `.claude/plans/` if it doesn't exist yet.
