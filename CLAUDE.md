# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**TRUST ISSUES: A Wells Fargo Simulator** — a satirical office RPG built with Three.js and Vite. No framework; pure vanilla JS ES modules.

## Commands

```bash
npm run dev      # Start dev server at localhost:5173 (auto-opens browser)
npm run build    # Build to dist/
npm run preview  # Preview production build
```

There is no test suite.

## Architecture

### Core Loop (`src/main.js`)

`Game` boots the engine, pushes `TitleState`, then transitions to `ExplorationState` on start/continue. The main loop calls `InputManager.update()`, `updateTweens(dt)`, and `stateManager.update(dt)` every frame.

### Singletons (`src/core/`)

- **`Engine`** — Three.js renderer, scene, orthographic isometric camera. States that own their own scene call `Engine.renderScene(scene, camera)` + `Engine.skipDefaultRender()` to bypass the default render.
- **`EventBus`** — Simple pub/sub. `on()` returns an unsubscribe function.
- **`GameStateManager`** — Pushdown automaton stack. States implement `enter/exit/pause/resume/update(dt)`.
- **`InputManager`** — Keyboard state tracker. Use `isJustPressed()` / `isConfirmPressed()` / `isCancelPressed()`.
- **`AudioManager`** — Music and SFX playback.
- **`SaveManager`** — localStorage persistence.

### State Stack (`src/states/`)

- **`TitleState`** — Title screen; calls a callback with `'new'` or `'continue'`.
- **`ExplorationState`** — Top-down isometric world traversal (not in the file list above but imported in `main.js`).
- **`CombatState`** — Turn-based combat; owns its own Three.js scene via `CombatScene`. Pushed on top of `ExplorationState` and popped when combat ends via `onEnd(result)` callback.
- **`MenuState`** — Pause/inventory menu pushed over exploration.

### Combat System (`src/combat/`)

- **`CombatEngine`** — Pure logic (no rendering). Holds `player` and `enemy` stat objects with buffs/DoTs/status effects. Methods: `playerAttack()`, `playerAbility(id)`, `playerItem(id)`, `playerFlee()`, `enemyTurn()`, `processTurnStart(who)`.
- **`CombatScene`** — Three.js scene for the combat backdrop; handles enemy/player visual animations.
- **`EnemyAI`** — Enemy ability selection logic.

### World (`src/world/`)

- **`RoomManager`** — Loads `Room` objects from `src/data/rooms/index.js` data, instantiates NPCs via `EntityManager`, handles room transitions with `TransitionOverlay`.
- **`TileMap`** — Grid-based tile layout.
- **`IsometricCamera`** — Smooth follow camera with dead zone.

### Data (`src/data/`)

All game data is plain JS objects/exports:
- `stats.js` — `PLAYER_BASE_STATS`, `XP_TABLE`, `LEVEL_GROWTH`, `PLAYER_ABILITIES`, `ENEMY_STATS`, `ENEMY_ABILITIES`, `ITEMS`
- `characters.js` — NPC character configs (appearance, dialogue references)
- `dialogs/index.js`, `quests/index.js`, `encounters/index.js` — dialog trees, quests, encounter configs (e.g. `canFlee`)
- Rooms are in `src/data/rooms/` (not visible above but imported by `RoomManager`)

### Entities (`src/entities/`)

- **`CharacterBuilder`** — Builds Three.js `Group` meshes from a config object (colors, dimensions from `CHAR` constants).
- **`CharacterAnimator`** — Walk/idle bone animation via procedural transforms.
- **`NPC`** — Wraps a built character with interaction logic.
- **`EntityManager`** — Tracks and updates all active NPCs.

### Effects (`src/effects/`)

- **`MaterialLibrary`** — Cached Three.js materials.
- **`ParticleSystem`** — Burst particle effects used in combat.
- **`PostProcessing`** — Post-process pass over the main scene.

### UI (`src/ui/`)

All UI is DOM-based HTML/CSS overlaid on the canvas (not Three.js objects):
- **`CombatHUD`** — Combat menus, HP/MP bars, action selection with keyboard navigation.
- **`UIManager`** — General HUD elements during exploration.
- **`FloatingText`** — Damage/heal numbers that float and fade.
- **`TransitionOverlay`** — Screen fade transitions between rooms.

### Constants & Utilities (`src/utils/`)

- `constants.js` — All numeric tuning values (`COLORS`, `TILE_SIZE`, `CAMERA`, `PLAYER`, `CHAR`, `ANIM`, `COMBAT`, `TEXT_SPEED`, `LAYERS`). Change values here rather than hardcoding.
- `math.js` — `randomRange()` and other helpers.
- `tween.js` — Lightweight tween system; call `updateTweens(dt)` each frame.

## Key Patterns

- **State lifecycle**: `enter()` sets up DOM/scene, `exit()` tears it down (remove DOM elements, dispose Three.js geometries/materials, remove event listeners).
- **Combat result flow**: `CombatState` receives an `onEnd(result)` callback from `ExplorationState`; result is `'victory'`, `'defeat'`, or `'flee'`.
- **Stat theming**: HP = Patience, MP = Coffee, ATK = Assertiveness, DEF = Composure, SPD = Bureaucratic Efficiency.
- **Player name**: hardcoded as `'Andrew'` in `CombatState`.
