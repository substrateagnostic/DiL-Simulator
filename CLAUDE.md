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
- **`AchievementManager`** — Checks and unlocks achievements stored in a separate localStorage key. Call `AchievementManager.check(player, { event: 'event_name' })` after key game events. Shows a toast on unlock.

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
  - At 25+: `playerPressAdvantage()` — moderate attack + DEF debuff on enemy, costs 25 momentum.
  - At 50+: `playerSecondWind()` — restore 25% HP, clear one status, costs 50 momentum.
  - At 100: `playerPowerMove()` ("Assert Dominance") — ignores 75% DEF, resets bar to 0.
- **Brace** (QTE): `CombatState._showBraceMiniGame()` runs a timed bar mini-game before calling `playerBrace(quality)`. Quality is `'perfect'`/`'good'`/`'miss'` — each gives different DEF bonus and duration. A successful brace halves the next incoming hit and sets `player.retaliateReady = true`.
- **Retaliate** (QTE): `CombatState._showRetaliateQTE()` runs a button-sequence mini-game before calling `playerRetaliate(multiplier)`. Multiplier scales from QTE score (22 base power, +15 momentum). Only available when `retaliateReady` is true.
- **Desperate Gamble**: Available when player HP < 25%. `CombatState._showDesperateGamble()` presents a risk menu (`safe`/`risky`/`all_in`). Calls `playerDesperateGamble(risk)` — damage scales with risk but `all_in` can backfire.
- **Confuse cooldown**: enemy `confuseCooldown` is set to 3 after using Confuse; `_pickRandom()` and `tactical` pattern skip Confuse while `confuseCooldown > 0`.
- **Boss phases**: `_pickEnemyAbility()` selects the active phase by finding the phase with the **lowest** `hpThreshold` that is still ≥ current HP%. Phases are listed high→low. `getActivePhaseIndex()` returns the 0-based phase index for `CombatState._checkPhaseChange()`.
- **Henderson phases**: Karen/Chad/Grandma each have 2 additional phases (triggered at 50% and 25% HP) with new abilities and `phaseMessages`. Phase transitions fire a screen effect, a message, and an enemy taunt.
- **Combat taunts**: `ANDREW_TAUNTS` in `stats.js` maps event keys (`crit`, `weakness_hit`, `brace_success`, `power_move`, `enemy_crit`, `retaliate`, `confused`) to quip arrays. Enemy taunts come from `ENEMY_STATS[id].taunts`. `CombatHUD.showTaunt(text, side)` renders them as speech bubbles.

**Damage formula**: `max(1, floor((atk + power) × 1.5 − def × 0.5 ± rand(3)))`, then weakness/resist multiplier, then vulnerability multiplier, then combo multiplier.

**`CombatHUD.showMainMenu` signature**: `showMainMenu(silenced, momentum, bracing, retaliateReady, lowHP)` — pass all five. Tiered momentum buttons, Retaliate, and Desperate Gamble are injected dynamically based on state. No XP bar in combat HUD — XP progress is only shown in the Stats tab of MenuState.

### World (`src/world/`)

- **`RoomManager`** — Loads rooms from `src/data/rooms/index.js`, instantiates NPCs. NPCs with a `condition` object start **hidden** by default; `EntityManager.update()` shows/hides them each frame based on player flags. This means conditional NPCs never flash visible on room entry.
- **`Room`** — Builds `TileMap`, places `Furniture`, manages exit triggers.
- **`TileMap`** — Grid-based collision (`canMove()`).
- **`IsometricCamera`** — Smooth follow camera with dead zone.

### Data (`src/data/`)

All game data is plain JS objects/exports:
- `stats.js` — `PLAYER_BASE_STATS` (includes `aum: 0`), `XP_TABLE` (15 levels, exponential), `LEVEL_GROWTH`, `PLAYER_ABILITIES` (with `tag` fields), `ENEMY_STATS` (with `weakness`/`resistance`/`phases`/`phaseMessages`/`taunts` on Hendersons), `ENEMY_ABILITIES`, `ANDREW_TAUNTS`, `ITEMS`, `pickMessage()`
- `shop.js` — `SHOP_ITEMS` (consumables, upgrades, decor) and `SHOP_CATEGORIES`
- `characters.js` — NPC visual configs
- `cosmetics.js` — Unlockable cosmetics with unlock conditions
- `ClientGenerator.js` — Procedurally generates Reception-room clients. `give_item` actions use the `item` field (not `itemId`). Roguelite enemy HP scales as `Math.round((100 + tier * 160) * levelMultiplier)`.
- `rooms/index.js` — All room definitions. NPC entries support `condition: { flag, notFlag }` for conditional spawning. Break room has `type: 'supply_shop'` furniture that triggers `ShopState`.
- `dialogs/index.js`, `quests/index.js`, `encounters/index.js` — dialog trees, quests, encounter configs

### Entities (`src/entities/`)

- **`Player`** — Holds `stats` (including `aum`), `inventory`, `flags`, `questStates`, `position`, `currentRoom`, `actIndex`, `upgradePoints`, `unlockedAbilities`, `deaths`. Key methods: `gainXP()`, `rest()`, `addItem()/useItem()`, `setFlag()/getFlag()`, `serialize()/deserialize()`. Emits `flag-set` on EventBus. `gainXP()` caps at `XP_TABLE.length` (15).
- **`NPC`** — Per-NPC `interactRange` option (defaults to `PLAYER.INTERACT_RANGE`). `conditionFn` toggled each frame by `EntityManager`. `rebuild(config)` uses `config.name` directly — do NOT spread `{ ...config, name: this.id }` or the display name breaks.
- **`EntityManager`** — `update(dt, flags, paused)` evaluates `conditionFn` for every NPC every frame.

### UI (`src/ui/`)

All UI is DOM-based HTML/CSS overlaid on the canvas:
- **`CombatHUD`** — `showMainMenu(silenced, momentum, bracing, retaliateReady, lowHP)`. Renders Brace, Retaliate (when ready), Desperate Gamble (when lowHP), tiered momentum buttons (25/50/100), telegraph row, and Confidence bar. `updateTelegraph(hint)` sets the enemy intent text. `showTaunt(text, side)` renders speech bubbles on `'player'` or `'enemy'` side.
- **`DialogBox`** — `onAdvance` / `onChoice` callbacks; `skipToEnd()` / `isComplete()`. Space blocked on choice nodes (only Enter/click).
- **`TransitionOverlay`** — `fadeOut/fadeIn`, `wipeDownOut/wipeDownIn` (descend), `wipeUpOut/wipeUpIn` (ascend).
- **`TouchControls`** — Injects into `InputManager.keys`; activates only on touch devices.

### Constants & Utilities (`src/utils/`)

- `constants.js` — All numeric tuning (`COLORS`, `TILE_SIZE`, `CAMERA`, `PLAYER`, `CHAR`, `ANIM`, `COMBAT`, `TEXT_SPEED`, `LAYERS`). Change values here rather than hardcoding.
- `math.js` — `randomRange()` and helpers.
- `tween.js` — Lightweight tween; call `updateTweens(dt)` each frame.

## Key Patterns

- **State lifecycle**: `enter()` sets up DOM/scene; `exit()` tears it down (remove DOM elements, dispose Three.js geometries/materials, remove event listeners).
- **Combat result flow**: `onEnd(result)` returns `'victory'`, `'defeat'`, or `'flee'`. On story victory: `defeated_<encounterId>` flag is set, `bestiary_<encounterId>` flag is set, HP/MP restored to max, then `encounter.postDialogId` dialog auto-plays if defined. On defeat: `retry_<encounterId>` flag is set; the next encounter routes to a `<encounterId>_retry` dialog. `ending_started` is reset on defeat so the executive floor boss re-triggers.
- **Encounter config**: defined in `encounters/index.js`. Each entry has `enemyId`, `preDialogId` (dialog with `start_combat` action node that triggers the fight), `postDialogId` (auto-played after victory), and `canFlee`. The `start_combat` action in a dialog emits `start-combat` on EventBus; ExplorationState queues it via `_pendingCombat` and fires after `dialog-end`.
- **NPC conditional spawning**: set `condition: { flag: 'x' }` or `condition: { notFlag: 'x' }` in the room data NPC entry. NPCs with any condition initialize hidden; no extra code needed. Multiple entries with the same `id` but different conditions are used for state-dependent dialogs (e.g., the Archive janitor has 5 conditional entries covering each quest stage).
- **Reception roguelite loop**: `ClientGenerator` procedurally generates enemies. After victory, `ClientReviewState` is pushed. `bossAnger` player flag drives branching. On client acceptance: AUM earned = max(50, floor(assets × 0.01)). Beneficiary chains: use `generateBeneficiaryChain()` + `applyChainModifiers()`.
- **AUM currency**: stored in `player.stats.aum`. Earned from accepted reception clients. Spent in `ShopState`. Permanent stat upgrades from the shop modify `player.stats` directly.
- **Achievements**: `AchievementManager.check(player, ctx)` is called after combat victories, level-ups, brace successes, weakness hits, power moves, retaliation, and client acceptances. The `ctx.event` string is matched against each achievement's `check` function.
- **Auto-save**: `ExplorationState._autoSave()` calls `SaveManager.save(player.serialize())` and shows a toast every time. Fires on every room transition and every story combat victory.
- **Quest objective display**: The HUD objective text comes from `_getStoryObjective()` in `ExplorationState` (flag-based hardcoded strings), **not** from `quests/index.js` or `QUEST_OBJECTIVES`. Edit `_getStoryObjective()` to change what the player sees.
- **Leveling**: 15 levels, exponential XP curve. Level 1→2 costs 325 XP (~5 reception fights at 65 XP each). Story bosses alone yield ~835 XP max, landing the player around level 4. Levels 5–10 require roguelite grinding; 11–15 are completionist.
- **Henderson difficulty**: Karen/Chad/Grandma are intentionally tough to force roguelite grinding. Karen requires ~level 3–4, Chad ~5–6, Grandma ~7–8. Each has 2 additional combat phases at 50% and 25% HP.
- **Ability tags and weaknesses**: Karen = weak `legal`, resists `social`; Chad = weak `social`, resists `legal`; Grandma = weak `audit`, resists `social`. Tag the appropriate ability and the 1.5× bonus fires automatically.
- **Stat theming**: HP = Patience, MP = Coffee, ATK = Assertiveness, DEF = Composure, SPD = Bureaucratic Efficiency. Player name hardcoded as `'Andrew'`.
- **Dialog data gotchas**: `give_item` actions use `item` field (not `itemId`). Choice nodes use `prompt` field for the question text (not `text`).

## Session Notes

`HANDOFF.md` in the project root tracks recent bug fixes and known issues. Check it at the start of a new session. The full expansion plan is at `.claude/plans/eager-nibbling-shannon.md`.
