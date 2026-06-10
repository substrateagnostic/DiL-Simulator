# Overnight Sprint — June 10, 2026

**Goal (Alex's words):** "overnight goal to build the F2 Panel Rewrite, [graphics] 1-5, and the
first three 'longer' goals (minus the release plan)... also fix the arcade graphics and add to
the gameplay."

**Continuation protocol:** This doc is the handoff. After each phase: build-check
(`npx vite build`), Playwright screenshot-verify, commit, then update the STATUS table below.
If you're a fresh instance picking this up mid-sprint: read ROADMAP.md (full context), then this
file, then continue at the first non-✅ phase. Dev server may already be running at :5173.

## STATUS

| # | Phase | State | Commit |
|---|-------|-------|--------|
| 1 | F2 dev panel rewrite | 🔨 in progress | — |
| 2 | V2 combat overhaul (silhouettes, hit feel, arenas, intros) | pending | — |
| 3 | V3 lighting & post (rigs, blob shadows, bloom, void) | pending | — |
| 4 | V4 materials & environment (trim, windows, furniture) | pending | — |
| 5 | V5 character proportions & animation | pending | — |
| 6 | V1 dialog portraits (imagegen pipeline + DialogBox slot) | pending | — |
| 7 | Arcade overhaul (graphics + gameplay depth) | pending | — |
| 8 | C1 roguelite deepening | pending | — |
| 9 | C2 ally personal missions ×4 | pending | — |
| 10 | C3 New Game+ | pending | — |

## Phase implementation notes (fill in as built)

### 1. F2 dev panel (`ExplorationState._showDevPanel()`)
Design: tabbed panel — SAVES | SKIP | TELEPORT | FIGHT | FLAGS | CHEATS, plus a live status bar
(room, tile coords, Lv/HP/MP/AUM, act). Key facts:
- `_loadRoom(roomId)` bypasses gates; `RoomManager.loadRoom()` clears the old room itself and
  falls back to `room.data.playerSpawn` then (5,5) when spawn args omitted. Player mesh persists.
- Teleport must also call `AudioManager.playMusic(this._getMusicForRoom(id))` +
  `this._updateLocationDisplay(id)`.
- Encounter launcher: `this._startCombat(encounterId)` directly (panel must close + unpause first).
- Imports needed: `ROOMS` from `../data/rooms/index.js`, `ITEMS` from `../data/items.js`.
  `ENCOUNTERS`, `XP_TABLE`, `SaveManager` already imported.
- After flag edits: `this._syncActFromFlags()` + `this._refreshStoryProgress(true)`.

### Verification harness (works, hard-won)
- Playwright keys: `keyboard.down` → wait ~90ms → `keyboard.up` (plain press() is missed).
- Console combat trigger: `const { EventBus } = await import('/src/core/EventBus.js');
  EventBus.emit('start-combat', 'karen'); EventBus.emit('dialog-end');`
- First-Karen fight one-shots by design (atk 999). Reception roguelite gated until `retry_karen`.

### 2–10. (notes added as each phase is built)

## Decisions made
- Keep zero-asset philosophy except portraits (V1) — faces are worth binary assets.
- UI aesthetic is locked (pixel-font terminal, #e94560/#1a1a2e) — extend, don't redesign.
- Arcade: ArcadeState is self-contained; safe to overhaul aggressively.
