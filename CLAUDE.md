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
- **Retaliate** (QTE): `CombatState._showRetaliateQTE()` first shows a length-selection screen (3–6 keys, styled like Desperate Gamble). The chosen length sets a base multiplier (3→0.75×, 4→1.0×, 5→1.25×, 6→1.5×). `_runRetaliateSequence()` then runs the memorize/input loop; final multiplier = `base × (correct/total)`. Calls `playerRetaliate(multiplier)` (22 base power, +15 momentum). Only available when `retaliateReady` is true.
- **Desperate Gamble**: Available when player HP < 25%. `CombatState._showDesperateGamble()` presents a risk menu (`safe`/`risky`/`all_in`). Calls `playerDesperateGamble(risk)` — damage scales with risk but `all_in` can backfire.
- **Confuse cooldown**: enemy `confuseCooldown` is set to 3 after using Confuse; `_pickRandom()` and `tactical` pattern skip Confuse while `confuseCooldown > 0`.
- **Boss phases**: `_pickEnemyAbility()` selects the active phase by finding the phase with the **lowest** `hpThreshold` that is still ≥ current HP%. Phases are listed high→low. `getActivePhaseIndex()` returns the 0-based phase index for `CombatState._checkPhaseChange()`.
- **Henderson phases**: Karen/Chad/Grandma each have 2 additional phases (triggered at 50% and 25% HP) with new abilities and `phaseMessages`. Phase transitions fire a screen effect, a message, and an enemy taunt.
- **Combat taunts**: `ANDREW_TAUNTS` in `stats.js` maps event keys (`crit`, `weakness_hit`, `brace_success`, `power_move`, `enemy_crit`, `retaliate`, `confused`) to quip arrays. Enemy taunts come from `ENEMY_STATS[id].taunts`. `CombatHUD.showTaunt(text, side)` renders them as speech bubbles.

**Damage formula**: `max(1, floor((atk + power) × 1.5 − def × 0.5 ± rand(3)))`, then weakness/resist multiplier, then vulnerability multiplier, then combo multiplier. Basic attack uses `power = 0`, so damage ≈ the displayed ATK stat. Abilities set their own `power` value.

- **`enemyOverrides`**: `CombatState` accepts an optional fourth constructor argument `enemyOverrides = {}` which is spread over `ENEMY_STATS[id]` after copying, allowing per-fight stat injection without mutating global data. Use this for scripted fights (e.g., one-shot tutorial: `enemyOverrides: { atk: 999 }`). Pass it through `_startCombat()` → `new CombatState(..., enemyOverrides)` → `new CombatEngine(..., enemyOverrides)`.

**`CombatHUD.showMainMenu` signature**: `showMainMenu(silenced, momentum, bracing, retaliateReady, lowHP)` — pass all five. Tiered momentum buttons, Retaliate, and Desperate Gamble are injected dynamically based on state. No XP bar in combat HUD — XP progress is only shown in the Stats tab of MenuState.

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
- **`CombatHUD`** — `showMainMenu(silenced, momentum, bracing, retaliateReady, lowHP)`. Renders Brace, Retaliate (when ready), Desperate Gamble (when lowHP), tiered momentum buttons (25/50/100), telegraph row, and Confidence bar. `updateTelegraph(hint)` sets the enemy intent text. `showTaunt(text, side)` renders speech bubbles on `'player'` or `'enemy'` side.
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
- **Achievements**: `AchievementManager.check(player, ctx)` is called after combat victories, level-ups, brace successes, weakness hits, power moves, retaliation, and client acceptances. The `ctx.event` string is matched against each achievement's `check` function.
- **Auto-save**: `ExplorationState._autoSave()` calls `SaveManager.save(player.serialize())` and shows a toast every time. Fires on every room transition and every story combat victory.
- **Quest objective display**: The HUD objective text comes from `_getStoryObjective()` in `ExplorationState` (flag-based hardcoded strings), **not** from `quests/index.js` or `QUEST_OBJECTIVES`. Edit `_getStoryObjective()` to change what the player sees.
- **Leveling**: 15 levels, exponential XP curve. Level 1→2 costs 325 XP (~5 reception fights at 65 XP each). Story bosses alone yield ~835 XP max, landing the player around level 4. Levels 5–10 require roguelite grinding; 11–15 are completionist.
- **Henderson difficulty**: Karen/Chad/Grandma are intentionally tough to force roguelite grinding. Karen requires ~level 3–4, Chad ~5–6, Grandma ~7–8. Each has 2 additional combat phases at 50% and 25% HP.
- **Ability tags and weaknesses**: Karen = weak `legal`, resists `social`; Chad = weak `social`, resists `legal`; Grandma = weak `audit`, resists `social`. Tag the appropriate ability and the 1.5× bonus fires automatically.
- **Stat theming**: HP = Patience, MP = Coffee, ATK = Assertiveness, DEF = Composure, SPD = Bureaucratic Efficiency. Player name hardcoded as `'Andrew'`.
- **Dialog data gotchas**: `give_item` actions use `item` field (not `itemId`). Choice nodes use `prompt` field for the question text (not `text`).
- **Dialog action nodes** (full list): `set_flag`, `start_combat`, `give_item`, `heal`, `quest_update`, `give_xp` (calls `player.gainXP(node.xp)`), `modify_stat` (increments `player.stats[node.stat]` by `node.amount`, min 1).
- **One-time poster/side-quest pattern**: Add a `motivationalPoster` furniture entry + `{ type: 'poster', dialogId: 'quest_*' }` interactable to a room. The dialog tree starts with a `condition` node checking a done-flag (`ifTrue` → "already seen" text, `ifFalse` → reward path). The reward path: `set_flag` done → `give_xp` → `modify_stat` → text node with `next` pointing past the "already seen" text → `end`. **Always update both** the `motivationalPoster` furniture entry and the `{ type: 'poster' }` interactable together — they must share the same coordinates. For wall placement: north wall use `z: 0.1`; south wall use `z: [roomHeight - 1.1]` with `rotation: Math.PI`. Values beyond `z: roomHeight - 0.5` land on the exterior wall and are unreachable.
- **NPC `dialogId` overrides act routing**: `_getDialogId()` returns the NPC's hardcoded `dialogId` before it reaches the act-based table (line ~1130 in `ExplorationState`). If an NPC entry has `dialogId: 'foo'`, it will always show that dialog regardless of act. To re-enable act routing for a previously hardcoded NPC, add a new room entry with the right `condition` and **no** `dialogId`.
- **Act-scoped flags**: When a flag (e.g. `janet_rallied`) is set in an earlier act and reused in a later act's objective counter, it will appear pre-satisfied. Use act-specific flag names (e.g. `janet_act6_rallied`) for any flag that must only be set within a specific act's flow.
- **Objective display supports HTML**: `_getStoryObjective()` return values are injected as `innerHTML` in `_setQuest()`, so `<br>`, `<b>`, etc. work in the HUD panel. The toast notification strips all HTML tags before display — use `.replace(/<br>/gi, ' ').replace(/<[^>]+>/g, '')` pattern already in `_setQuest()`.
- **Large furniture alignment**: `blockRect(tileX, tileZ, w, h)` blocks tiles starting at `(tileX, tileZ)` and extending in the +x/+z direction. For furniture wider than ~3 tiles, design the mesh with its origin at the left-front corner (not centered) and place it at the left-front tile coordinate so visual and collision match. Add footprint to `FURNITURE_FOOTPRINTS` in `Room.js`.
- **Roguelite XP**: Fixed at 60–120 based on client wealth tier `t` (0–1 normalised against `MAX_ASSET`). Formula: `Math.round(60 + t * 60)` in `scaleEnemyStats()` in `ClientGenerator.js`. Not player-level scaled. Client data (including `xpReward`) is serialised into the `currentClient` player flag at generation time, so XP formula changes only affect newly generated clients.

## Key Story Flags

Critical flags that are easy to get wrong (not derivable from a single file):

| Flag | When set | Effect |
|------|----------|--------|
| `ready_for_ross` | Auto-derived in `_refreshStoryProgress()` when all 4 `met_*` flags set | Unlocks Ross dialog |
| `branch_chosen` | After Henderson decision with Ross | Ross moves to exec floor conf table |
| `defeated_regional` | Auto on combat victory vs `regional` encounter | Regional NPC hides; Ross returns to office |
| `defeated_regional_director` | Auto on combat victory vs `regional_director` (penthouse) | Separate penthouse chain flag |
| `regional_director_defeated` | Set by `regional_director_defeated` post-dialog action | Used by ExplorationState to trigger Algorithm fight |
| `retry_karen` | On first Karen defeat | Enables roguelite tutorial phase |
| `defeated_karen` | Auto on Karen victory | Ends roguelite tutorial |
| `act5_complete` | After Rachel defeated | Starts Act 6; hides archive janitor |
| `janet_act6_rallied` | `janet_act6` dialog | Act 6 ally counter — NOT `janet_rallied` |
| `diane_act6_rallied` | `diane_act6` dialog | Act 6 ally counter |
| `diane_evidence` | `diane_documents` dialog (HR cabinet at x:14, z:8) | Act 6 evidence counter |

## Reference Files

- `HANDOFF.md` — recent bug fixes and known issues; check at session start.
- `Quest.md` — full quest list with objectives, XP rewards, and item reference. Authoritative source for story structure and side quest steps.
- `.claude/plans/eager-nibbling-shannon.md` — expansion plans (Phases 1–9). Create `.claude/plans/` if it doesn't exist yet.
