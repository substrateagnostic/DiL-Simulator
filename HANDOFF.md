# Session Handoff — April 26, 2026

## What Was Done This Session (Session 6)

Dev mode, new starter abilities, input improvements, quest bug fixes, and a major editor upgrade including real-time 3D furniture preview.

---

### Dev Mode (`?dev` URL param)

Append `?dev` to the game URL to enable. Flag is read once from `URLSearchParams` in `src/utils/constants.js` (`DEV_MODE`). Has no effect in normal play.

- **Backtick in combat** — instant victory; routes through normal `_handleResult()` so XP, flags, and post-dialogs all fire correctly
- **F2 in exploration** — dev panel with two sections:
  - **Save Scum** — 3-slot save/load. Save writes to that slot and marks it active. Load deserializes and reloads the room. Active slot shown with ★.
  - **Quest Skip** — 6 cumulative act presets (Acts 1, 3, 4, 5, 6, 7). Writes directly to `player.flags`, then calls `_syncActFromFlags()` + `_refreshStoryProgress()`. Some NPC dialogs may replay; all room gates and act routing will be correct.
- **Live editor preview** — `?dev` also connects an `EventSource` to `http://localhost:3747/api/live`. Dragging furniture in the editor moves the 3D mesh in real time. Silent no-op if editor isn't running.

---

### New Tier-0 Starter Abilities

Added `raise_concerns` (social, power 15, 10 MP) and `spot_check` (audit, power 15, 10 MP) alongside `file_motion` as free starting attacks. Players now begin with one attack of each type. Re-chained `cc_all` to require `raise_concerns` and `due_diligence` to require `spot_check`.

---

### Input Improvements

- **WASD as arrows in retaliate QTE** — W/A/S/D map to Up/Left/Down/Right in the sequence input phase; `WASD_TO_ARROW` map applied before matching against the generated sequence
- **E as confirm everywhere** — added `KeyE` to the confirm check in brace QTE, retaliate length selection, and desperate gamble overlay. `isConfirmPressed()` in InputManager already included E; these were raw `keydown` handlers that didn't go through InputManager.
- **W/S for retaliate length selection** — W/S navigate up/down in the length picker; hint text updated to `↑↓/WS navigate · ENTER/E confirm`

---

### Bug Fixes

- **Karen location misdirection** — `karen_first_loss_tutorial` node 8 now says "head back to the conference room" instead of the ambiguous "go back to Karen" after mentioning the reception desk. Both `karen_retry_ready` toasts updated to point to the conference room explicitly.
- **Alex side quests blocked by archive evidence** — `act4_trigger` routing now checks for in-progress side quests before firing. If any side quest is started but not complete, Alex routes to the side quest instead of forcing `act4_trigger`. Players can finish active quests before Act 3 closes.
- **Compliance crossword too early** — gated on `alex_it_act3_done` in addition to `act >= 3`. Crossword is now only available after Alex directs the player to the archive, not immediately when Act 2 ends.

---

### Editor Upgrades (Session 6)

#### Rooms Tab

- **Drag-and-drop** — furniture and NPC dots draggable on canvas; 2D canvas updates in real time during drag
- **0.25-tile snap** — drag positions snap to 0.25 tile increments (down from 0.5)
- **Zoom** — scroll wheel on canvas, 40%–400%, zoom % shown above canvas. All canvas drawing uses `cellPx()` = `CELL * zoomLevel`
- **NPC facing arrows** — orange directional arrows on each NPC dot (game convention: 0 = north)
- **Exit tile overlay** — green squares on exit tiles; `→` label at high zoom
- **R to rotate** — press R with item selected to rotate 90° clockwise
- **Undo/redo** — Ctrl+Z / Ctrl+Y, 50-step stack per room, resets on room change
- **Furniture/NPC search** — filter box above item list; section titles show `(N/Total)` when filtered
- **Flag simulator** — toggle story flags to preview NPC visibility in the current room; hidden NPCs shown as dimmed dots on canvas

#### Dialogs Tab (new)

Read-only browser for all dialog trees. Searchable by ID, speaker, or first-line text. Click to expand and read nodes color-coded by type.

#### Real-time 3D Live Preview (SSE)

- Editor server exposes `GET /api/live` (SSE, CORS `*`) and `POST /api/live-move`
- Editor sends position updates during drag (throttled to ~20fps, no disk write)
- Game connects `EventSource` to `http://localhost:3747/api/live` when `DEV_MODE` is true
- On receiving `{ type:'move', roomId, category, index, x, z }` for the current room, calls `roomManager.liveMove()` which updates the mesh position directly — no reload
- **Interactable tiles follow furniture** — `TileMap.moveInteractable()` relocates the interact zone when the dragged piece crosses a tile boundary. `Room` tracks `_furnitureOrigPos` and `_furnitureLivePos` per index so subsequent drags use the current position, not the build-time position
- Auto-save on drop removed — was causing Vite HMR full-page reload. Save manually when done

---

# Session Handoff — April 26, 2026

## What Was Done This Session (Session 5)

Balance/room/character editor, combat bug fixes, quest gate fixes, and menu keyboard navigation.

---

### Balance & Room Editor (`npm run editor`)

New developer tool: `npm run editor` starts a Node.js HTTP server at **http://localhost:3747** serving a single-page editor UI with 9 tabs:

- **Player** — edit base stats (maxHP, maxMP, ATK, DEF, SPD)
- **Abilities** — edit every player ability's cost, power, heal amount, buff/debuff duration, momentum gain
- **Enemies** — edit all 19 enemies' maxHP, ATK, DEF, SPD, XP reward
- **Shop** — edit all shop item prices
- **Rooms** — top-down canvas grid of any room; click furniture/NPCs to select; edit X, Z, rotation with preset buttons (N/E/S/W); purple dot = override active; saves to `room-overrides.json`
- **Combat Sim** — pick player level + enemy + shop upgrade counts → simulate 1000 fights → see win rate, damage/turn, turns-to-kill, full player/enemy stat summary
- **XP Curve** — bar chart + table of all 15 level thresholds, XP gap per level, reception fights needed, story XP reachable (green = reachable via story alone)
- **Encounters** — read-only table of all 20 encounters with boss badge, can-flee, pre/post dialog IDs
- **Characters** — native color pickers for all 27 character configs (body, pants, shirt, tie, skin, hair); saves to `character-overrides.json`
- **Diff** — colored git diff of all override files vs HEAD

**Ctrl+S** saves the current tab. **Save** buttons are per-section. **Publish to GitHub** runs `git add` + `git commit` + `git push` for all three override files.

**Server**: `scripts/editor.js` — plain Node.js `http` module, no dependencies. Dynamically imports `rooms/index.js`, `encounters/index.js`, and `characters.js` at runtime via `pathToFileURL`.

**Three override JSON files** (all in `src/data/`):
- `balance.json` — player stats, enemy stats, ability stats, shop prices. Read by `stats.js` and `shop.js` at module load time; overrides are applied via `Object.assign`.
- `room-overrides.json` — per-room furniture and NPC position/rotation overrides, keyed by furniture array index. Applied in `Room.build()` before `_placeFurniture()`.
- `character-overrides.json` — per-character color field overrides. Applied at the bottom of `characters.js` via `Object.assign` loop.

**`with { type: 'json' }` import syntax** — Node.js 24 requires the import attribute on JSON imports; Vite 7 supports it too. All four game files that import JSON now use this syntax: `stats.js`, `shop.js`, `characters.js`, `Room.js`.

---

### Combat Buff Duration Bug Fix

**`processTurnStart()` in `CombatEngine.js`** decremented durations and removed buffs at `<= 0`. Since it fires at the *start* of the player's turn before they act, a 3-turn buff was expiring after 2 player turns (counter hit 0 during player turn 3, removed before the turn happened). Fix: threshold changed `<= 0` → `< 0` so the buff persists until it reaches −1, giving the full advertised duration.

---

### Buff/Debuff Status Pills in Combat HUD

**`CombatHUD`** now renders active buff/debuff pills below the player stat bars:
- Green pills (`buff-positive`) for player buffs showing stat deltas and remaining turns
- Red pills (`buff-debuff`) for debuffs on the enemy
- Teal pills (`buff-enemy`) for buffs on the enemy

New method: `hud.updateBuffStatus(playerBuffs, enemyBuffs)`. Called from `CombatState._enablePlayerInput()` and `CombatState._updateHUD()`. The `combat-stats-wrapper` div wraps both `statsEl` and `buffStatusEl` with `flex-direction: column`.

Duration displays as `b.duration + 1` (post-fix semantics: a buff at `duration: 2` has 3 turns remaining).

---

### Quest Gate Fixes

- **IT server room vault code** — `server_vault_code` interactable (x:5, z:3, the `server_rack` at the far end of the room) was accessible from the start of the game, letting players find Vault Code 3 in Act 1. Added `condition: { flag: 'vault_accessible' }` — now only visible after Act 4 janitor dialog.
- **Stat-boost motivational posters** — all 10 `quest_atk_*` / `quest_def_*` posters scattered across rooms got `condition: { flag: 'retry_karen' }` so they're invisible until the roguelite tutorial phase begins. Players were finding them before the poster mechanic was introduced.

---

### Menu Arrow Key Navigation

**`MenuState`** Abilities and Cosmetics overlays now support keyboard navigation:
- Up/Down arrows (or W/S) move the selection
- Enter/Space confirms selection
- Escape closes the overlay
- Selected item auto-scrolls into view

Implementation: `_abilitySelectedIndex`, `_abilityCount`, `_abilityActions` array built during `_renderAbilities()`; `_cosmeticSelectedIndex`, `_cosmeticCount`, `_cosmeticActions` built during `_renderCosmetics()`. The `update()` method handles both overlays before routing to standard exploration input.

---

# Session Handoff — April 19, 2026

## What Was Done This Session (Session 3)

Penthouse suite visual overhaul: movie screen in The Reef & Reel, full Private Lounge redesign, NASA mission control Analytics Suite, and expanded penthouse layout fixes.

---

### The Reef & Reel (formerly Aquarium Suite)

- Replaced middle `aquariumWall` with a `movieScreen` showing a procedural dusk cityscape canvas: sky gradient, moon, city silhouette, lit windows, wet street reflections, lone figure, film grain, and letterbox bars.
- Room renamed from "Aquarium Suite" to **"The Reef & Reel"** — name mapping added to `_updateLocationDisplay()` in `ExplorationState.js`.
- Room ambient light changed from cold blue (0x0077dd) to warm (0xffeedd) to match the cinema mood.
- `movieScreen` added to `NO_BLOCK` in `Room.js`.

**Z-fighting fix:** Screen `PlaneGeometry` placed at `z:0.18`, pushed in front of the rim face (z:0.15) and gold trim strips (z:0.17). `DoubleSide` removed.

---

### Private Lounge (penthouse_bar)

Expanded room from 14×8 to **18×12**. Complete furniture overhaul:

- **`neonSign()`** — "TRUST ISSUES" hot-pink canvas with chrome border and `PointLight(0xff0099)`. Two signs flanking the bar on the north wall.
- **`humidor()`** — Mahogany cabinet with glass front, interior amber glow (0xcc7700), 2 shelves of cigars, side stand with ashtray and lit cigar (ember `emissiveIntensity:1.0`). Placed NW, rotated `Math.PI/2` to face the room.
- **`leatherArmchair()`** — Oxblood leather (0x4a1208), wing-back, brass nail-heads, turned wooden legs. Two chairs flanking the cigar lounge.
- **`coffeeTable()`** — Low glass-top table with whisky tumbler and cocktail glass. One between cigar chairs, one per VIP booth.
- **`pokerTable()`** — Octagonal `CylinderGeometry(1.0,1.0,0.72,8)`, green felt, cream `TorusGeometry` rail, 5 player positions with cards and chips, 5 built-in chairs. NE corner.
- **`poolTable()`** — Pool lamp/rod/overLight removed per previous session; lamp was re-confirmed removed this session.
- VIP booth couches: L-shaped pairs (wall-side + front-facing) on SW and SE with coffee tables.

Exits updated to accommodate expanded width (`x:17, z:5–6`). Player spawn moved to `x:15, z:6`.

---

### Analytics Suite (penthouse_analytics)

Replaced desk, chair, and three `dataVizPanel` screens with:

- **`megaAnalyticsScreen()`** — 12.5-wide wall screen (`PlaneGeometry`), 1536×256 canvas with 3 panels: market data + line graphs, network topology, system status bars + log. `z:0.08` to avoid z-fighting with trim front face.
- **NASA mission control arc** — 5 `missionControlDesk` consoles in a gentle z-curve (x: 3,5,7,9,11 / z: 3.2,3.6,3.8,3.6,3.2), all `rotation:0` (facing north). 5 `operatorChair` chairs 1.2 units behind each console (z: 4.4,4.8,5.0,4.8,4.4).

**New furniture assets:**
- **`missionControlDesk()`** — Gunmetal console (0x2a2e35), angled monitor deck (`rotation.x=-0.42`), two emissive screens, 5 indicator lights with chrome rings, button grid, keyboard strip, built-in `PointLight(0x002244)`.
- **`operatorChair()`** — Futuristic 5-point star base, single column, narrow seat, tall back with headrest wings, blue LED strips on back edges and headrest top.

Both added to `NO_BLOCK` in `Room.js`.

**Arc layout rule:** Console mesh is 1.28 units wide. Center-to-center x-spacing must be ≥ 2.0 units to avoid visual overlap. All consoles use `rotation:0` so they uniformly face the screen.

---

### Expanded Penthouse (penthouse_expanded)

- **Putting green removed** — the `puttingGreen` furniture entry deleted entirely.
- **Desk cluster moved** — from `x:9–11` to `x:13–15` (near server racks) so it no longer blocks the north exit door.
- **`algorithm_terminal` interactable** — x moved from 10 → 14 to match new desk position.
- **Conference table chairs** — moved from `x:15/19` to `x:16/18` so they sit flush against the table rather than floating 1–2 tiles away.

---

### Location Display Names

Added to `_updateLocationDisplay()` names lookup in `ExplorationState.js`:

```js
penthouse_expanded: 'Penthouse',
penthouse_aquarium: 'The Reef & Reel',
penthouse_analytics: 'Analytics Suite',
penthouse_bar: 'Private Lounge',
```

---

# Session Handoff — April 18, 2026

## What Was Done This Session (Session 2)

Post-game office renovations: Board Room Trophy Wall build-out, Penthouse renovation replacement (helipad → Executive Suite), and expansion of the penthouse into four interconnected wing rooms.

---

### Board Room — Trophy Wall Renovation Assets

Added three new furniture assets and six trophy cases when `renovation_trophy_wall` flag is set:

- **`stockTicker()`** — Canvas-texture screen (640×128, `LinearFilter`, no mipmaps) showing fake companies (TRST / HNDRS / ALGM) with green/amber/red ticker rows. Placed on north wall left of penthouse door (`x:5.5, z:0.1`).
- **`whiskeyWall()`** — Dark wood frame with amber emissive backlit panel, 3 shelves, and detailed bottles (body + shoulder + neck + cap + label layers). Placed on north wall right of penthouse door (`x:10, z:0.1`).
- **`trophyCase()`** (redesigned) — Dark wood cabinet (0x4a2e10, h:1.1), bright glass panel (0xcceeff, emissive 0.25), 4 dark wood corner pillars, blue-emissive lit base, large gold trophy (cup + forked handles torus + knot sphere + orb finial), and a front name plaque. Six cases placed on the west wall.
- **`smartBoard()`** — Added as conditional (`condition: { flag: 'renovation_trophy_wall' }`); whiteboard gets `condition: { notFlag: 'renovation_trophy_wall' }` so they swap cleanly.
- Scaled model removed from board room.
- All new board room assets added to `NO_BLOCK` in `Room.js`.

---

### Penthouse Renovation — Helipad → Executive Suite Upgrade

Replaced `renovation_helipad` (doesn't make sense in a room) with `renovation_penthouse`:

- **`shop.js`** — New item: `renovation_penthouse`, name "Executive Suite Upgrade", price **10,000,000 AUM**, description includes aquarium wall, live analytics displays, and private cocktail lounge.
- **`AchievementManager.js`** — `total_renovation` flag check updated: `renovation_helipad` → `renovation_penthouse`.

---

### Penthouse Expansion — Four-Room Layout

On purchase of `renovation_penthouse`, `_resolveRoomId()` in `ExplorationState` routes `penthouse` → `penthouse_expanded` (same canonical room ID, same save/music behavior — mirrors the `ross_office` → `ross_office_large` pattern).

**`penthouse_expanded`** (22×16): Hub room. Kitchen NW, desk, server racks, putting green, conference table. NPCs: CFOs (x:11 z:10), regional_director (x:11 z:6). Four exits: SOUTH→board_room, NORTH→penthouse_analytics, EAST→penthouse_aquarium, WEST→penthouse_bar.

**`penthouse_aquarium`** (16×8): Dark navy (0x04081a). Three `aquariumWall` panels on north face. Two north-facing couches (`couch()`, rotation:0). Popcorn popper in SE corner. Exit WEST→penthouse_expanded.

**`penthouse_analytics`** (14×8): Three `dataVizPanel` screens on north face. Analyst desk + monitors + chair. Exit SOUTH→penthouse_expanded.

**`penthouse_bar`** (14×8): `loungeBar()` on north wall facing south. Three executive chairs. Speakerphone. Exit EAST→penthouse_expanded.

Wing rooms are gated in `gatedRooms` table requiring `renovation_penthouse` flag with message "The suite wing is unfinished. Fund the renovation first."

---

### New Furniture Assets

All added to `Furniture.js` and registered in `NO_BLOCK` in `Room.js`:

- **`aquariumWall()`** — Dark metal frame (3.5×2.0), blue emissive water volume (0x062244), glass front panel, sand bed, rocks, coral, seagrass, and canvas-sprite fish at `z:0.22` (in front of glass) using `PlaneGeometry` + transparent `MeshBasicMaterial`. Three species drawn via Canvas 2D API: clownfish (orange/white bars), blue tang (blue body/yellow tail/black stripe), goldfish (orange/fan tail). 7 fish per panel with varied positions; some `scale.x = -1` for mirror flip.
- **`dataVizPanel()`** — Dark bezel, 480×420 canvas screen showing "TRUST DEPT — LIVE ANALYTICS" header, bar chart (10 bars, purple gradient), line graph (green), and data readout lines.
- **`loungeBar()`** — Dark counter body, marble top (0xe8e0f4), purple-backlit liquor shelf (0x6622cc, emissive 0.55), 2 shelf planks, 4×2 bottles, 3 purple leather bar stools with foot rings.
- **`couch()`** — Dark navy (0x1a2440) base+arms+back, cushion segments (0x243355), back rest at +Z (rotation:0 faces north toward aquarium), armrest top pads, 4 corner legs.
- **`popcornPopper()`** — Red cart body (0xcc1111), gold trim strips, 4 wheels, transparent glass case, yellow emissive popcorn pile (scaled SphereGeometry), scattered kernel spheres, warm interior glow, red top cap, gold finial.

---

### Fish Visibility Fix

Fish sprites must be at `z:0.22` (in front of glass at z:0.2). The opaque water volume (BoxGeometry centered at z:0.06, half-depth 0.14) spans z:-0.08 to z:0.20 and occludes anything behind or at z:0.20. Using `PlaneGeometry` + `THREE.DoubleSide` transparent material places sprites in front of the glass where they're always visible.

---

## What Was Done This Session (Session 1)

Ross attack fix, boosterMount visuals, whale client pre-algorithm roll, executive floor Act 5 gate, and cosmetic stats display fix.

---

### Rachel Retry Softlock Fix

0. **Dying to Rachel left no way to restart the fight** — The board room auto-trigger was gated on `!rachel_fight_started`. `rachel_fight_started` is set (and auto-saved via `_changeRoom`) on first entry, so after a loss the stale save always blocked the retrigger — clearing the flag in `_handleDefeat()` was lost on reload since `_handleDefeat` called `_loadRoom` (no auto-save) not `_changeRoom`. Fixed: removed `!rachel_fight_started` from the trigger condition entirely. `act5_complete` (set only on Rachel victory) is the only reliable completion gate. Added `_autoSave(false)` at the end of `_handleDefeat()` so gauntlet flag resets persist through reloads (fixes same latent bug for all gauntlet fights).

---

### Stall Ability

-6. **Added `stall` ability** — Tier 0 starter (always unlocked alongside `file_motion` and `coffee_break`). Cost: 0 Coffee. Effect: +25 Confidence, enemy skips their turn. Handled as a new `'stall'` type in `CombatEngine.playerAbility()` via `_gainMomentum(25)` + `skipsTurn: true`. CombatState displays "Stall! +25 Confidence — enemy loses their turn!" and returns 800ms delay. Added `'stall'` to `Player.unlockedAbilities` default set in both constructor and `deserialize` fallback.

---

### MaxHP Cosmetic Bonus Not Applied to Current HP

-5. **Cosmetics with `maxHP` bonus didn't increase starting HP** — `getCombatStats()` added the cosmetic's `maxHP` bonus to `base.maxHP` but never touched `base.hp`. The engine started combat with e.g. `hp: 100, maxHP: 105` — the extra 5 buffer existed but was never filled, so the bonus was invisible unless the player healed past their base max. Fixed: after the cosmetic loop, the difference between old and new `maxHP`/`maxMP` is computed and added to `hp`/`mp` (capped at the new max). Same fix applied to `maxMP` cosmetics for consistency.

---

### Roguelite Ability Messages Using Story Character Names

-4. **"Chad" and "Karen" appeared in roguelite combat messages** — `trust_fund_tantrum` and `speak_to_manager` are shared between the Henderson story fights and roguelite client ability pools. Their messages hardcoded "Chad throws a tantrum..." and "Karen demands to speak to your manager!" Fixed: both abilities' messages rewritten to use generic "the client" / "they" phrasing. Story fights (Karen/Chad) use the same ability entries and are unaffected since the names were never necessary for them to work.

---

### Penthouse Chain HP Increases

-3. **Penthouse bosses too low health** — CFO's Assistant 480→650, Regional Director 720→950, The Algorithm 880→1200. Quest.md HP column updated to match.

---

### Roguelite Anger Balance Pass

-2. **Too many anger-increasing clients** — All 10 negative attributes were delta +2, positives averaged −1.2. With `randomInt(0,2)` for both rolls, expected anger per accepted client was `+0.8` — always trending up. Two changes: (1) Roll distribution changed to `numPos = randomInt(1, 3)` (was 0–2, guarantees ≥1 positive) and `numNeg = randomInt(0, 1)` (was 0–2, caps at 1 negative). Zero-zero tie-break removed (unreachable). (2) Three minor negatives reduced from delta 2 → 1: `demanding`, `fomo`, `day_trader` (annoyances, not deal-breakers — the serious ones like `litigious`, `family_feud`, `social_media` stay at 2). New expected anger per client: `E[numNeg=0.5] × avg(1.7) − E[numPos=2] × avg(1.2) ≈ −0.7`. Anger now trends down on average with room for bad streaks.

---

### Post-Game Clients Serving Stale Pre-Game Cache

-1. **Post-game reception gave low-XP pre-algorithm clients** — `_onReceptionEntered()` checks `currentClient` in player flags and loads the cached client if one exists, without verifying it was generated with `postGame = true`. A client generated before The Algorithm was defeated could persist in the cache and be served post-game (e.g. 10M assets, 85 XP instead of 20M–100M, 200–350 XP). Fixed: added `isPostGame` boolean to the `generateClient()` return object; `_onReceptionEntered()` now discards the cached client if `postGame` is true but `client.isPostGame` is false, then regenerates from the post-game pool.

---

### Ross Attack Fix

1. **Ross never attacked the player** — `ross_act2` enemy had no attack ability; fights could drag indefinitely as he only used debuffs. Added `hard_pivot` to `ENEMY_ABILITIES` (Power 20, attack type, four quip lines) and added `'hard_pivot'` to Ross's `abilities` array in `ENEMY_STATS`.

---

### Network Ghost BoosterMount Visuals

2. **Signal booster furniture invisible in break room and conference room** — The booster mounts were listed as interactables rather than furniture, so no 3D mesh rendered. Moved both to the `furniture` array in `rooms/index.js` as `{ type: 'boosterMount', ... }` with `condition: { notFlag: 'quest_network_ghost_complete' }` so they disappear after the quest ends. Coordinates unchanged: `x:14.9, z:8` (break room) and `x:10.9, z:2` (conference room).

---

### Morse Code Rack Dialog Fix

3. **`morse_code_rack` dialog node 0 `ifFalse` jumped too early** — `ifFalse: 5` skipped the flavor text nodes (5 is the skip-past target, not a flavor node). Changed to `ifFalse: 6` so the "don't know what to look for" path plays through the flavor text before arriving at the exit node.

---

### Pre-Algorithm Whale Client Roll

4. **No rare high-value client surprise before end-game** — `generateClient()` now rolls 5% chance (`Math.random() < 0.05`) on every non-post-game reception visit to spawn a whale client: picks a `POST_GAME_CLIENT_TYPES` entry, forces assets to `randomInt(100_000_000, 250_000_000)`, and calls `scaleEnemyStats(..., true)` for proper post-game HP/XP scaling. Crypto volatility swing is suppressed for whale rolls. XP from a whale fight can reach ~350 — same ceiling as post-game Tier 5.

---

### Executive Floor Gate (Act 5)

5. **Player could access the executive floor mid-Act-5 and skip the gauntlet** — `_changeRoom()` now blocks the `executive_floor` entry when `restructuring_defeated` is set but `corporate_lawyer_defeated` is not, showing toast "The elevator won't open. Someone's waiting for you in the lobby." The gate clears automatically once the corporate lawyer fight is done.

---

### MenuState Cosmetic Stats Display Fix

6. **Stats tab showed raw `player.stats`, ignoring cosmetic bonuses** — Equipped cosmetics (e.g. Golden Calculator +3 ATK) were invisible in the Stats tab. Changed MenuState to call `player.getCombatStats()` instead of reading `player.stats` directly. No logic change — `getCombatStats()` already existed and applied cosmetic modifiers correctly; the display just wasn't using it.

---

### Additional Changes

- **HP variance for roguelite clients** — `scaleEnemyStats()` now multiplies `maxHP` by a `0.70–1.30` random factor so clients at similar wealth tiers feel distinct rather than identically scaled.
- **Karen NPC split into three conditional entries** — `briefing_complete+!retry_karen` → `karen_meeting`; `retry_karen+!karen_retry_ready` → `karen_not_ready` (new dialog: Karen mocks the player for returning too soon); `karen_retry_ready+!karen_defeated` → `karen_meeting`.
- **`karen_intern_first` dialog** (new) — fires when `_getDialogId()` detects the player approaches Karen before `defeated_intern` is set. Karen tells them to spar the intern first.
- **`team_pre_intro` dialog** (new) — `_getDialogId()` returns this for `janet`, `intern`, `isaiah`, and `alex_it` if `checked_desk` is not set and the NPC's intro hasn't been read. Narrator nudges player to settle at their desk first.
- **HUD objective** — when `briefing_complete` is set and `defeated_intern` is not, `_getStoryObjective()` returns `"Spar with the Intern to prepare for the Henderson meetings"`.

---

## Previous Session (April 15, 2026)

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

11. **Total achievements: 31** — Story (2), Act Completions (7), Combat Mastery (9), Leveling (3), Roguelite (10).

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

- **Combat character models**: every enemy reads as the same blocky humanoid in close-up. Silhouette differentiation per enemy type (Grandma: hunched/shorter; Chad: wider; The Algorithm: floating monitor instead of head), accessories/clothing detail, and hit/flinch animations would make fights feel more distinct.
- **Full expansion plan**: see `.claude/plans/eager-nibbling-shannon.md` for Phases 1–9 (create `.claude/plans/` directory first)
