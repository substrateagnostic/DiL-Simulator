# Session Handoff — April 9, 2026

## What Was Done This Session

### Documentation

1. **CLAUDE.md updated** — Added previously undocumented systems:
   - `src/effects/` directory: `MaterialLibrary.js` (cached toon materials), `ParticleSystem.js` (`burst()` / `stream()`), `PostProcessing.js` (CSS vignette).
   - `src/entities/CharacterBuilder.js` and `CharacterAnimator.js` — character mesh construction and walk/idle/sit animation.
   - `src/ui/UIManager.js` (exploration HUD controller) and `FloatingText.js` (DOM floating damage numbers).
   - `src/data/bestiary.js` (`BESTIARY_DATA`), `thoughts.js` (`ROOM_THOUGHTS`), `items.js` (`STARTING_INVENTORY`).
   - `Quest.md` added to Reference Files section.
   - Fixed `.claude/plans/` note (directory doesn't exist yet; create it if needed).

## Previous Session (March 24, 2026)

### Bug Fixes

1. **Roguelite XP too low** — New formula: `Math.round(60 + t * 60)` — fixed 60–120 range based solely on client wealth tier. In `ClientGenerator.js` `scaleEnemyStats()`.

2. **Act 6 "Prepare for the Finale" showing 2/4 allies pre-complete** — Introduced `janet_act6_rallied` and `diane_act6_rallied` flags to replace reused Act 4 flags.

3. **Diane's documents given on dialog instead of found in room** — Added `diane_documents` dialog and filing cabinet interactable at `x:14, z:8` in HR Department. Cabinet sets `diane_evidence`.

4. **Ross not rallying in Act 6** — Added new Ross room entry with `condition: { flag: 'act5_complete' }` and no `dialogId` so `_getDialogId()` reaches `ross_act6`. Added `notFlag: 'act5_complete'` to the `ross_returned` entry.

5. **Archive janitor visible during "Get the Janitor's Rolex" mission** — Last archive janitor entry now has `notFlag: 'act5_complete'`.

6. **Break room DEF poster stuck behind arcade cabinet** — Moved to `x:5, z:6.9` (south wall interior face).

### Features

7. **Prepare for the Finale objective** — Now lists remaining allies/evidence by name with `<br>`-separated bullet points. Toast strips HTML before display.

8. **Board Room redesign** — Room expanded to 16×12 with hardwood floor, `boardroomTable` furniture asset (8-tile mahogany table with 14 executive chairs), grand paintings, sculptures, credenzas, whiteboard.

9. **`grandPainting` furniture asset** — Replaces `oilPainting` in the board room; ornate gold frame, 7-layer landscape canvas. Added to `NO_BLOCK` in `Room.js`.

## Current State

- **Build**: `npx vite build` passes clean (chunk size warning only)
- **No test suite** — verification is manual playtest

## Known Issues / Future Work

- **Rachel SVP**: no character model; not removed after defeat
- **Ross post-regional dialog** (`ross_returned`) written but not deeply integrated into story flow
- **Vault room**: needs redesign with bomb door entrance, bank lockboxes
- **Archive room**: more/taller file cabinets, fix monitor direction
- **FBI invasion sequence**: triggers after trust charter retrieved (not yet implemented)
- **Full expansion plan**: see `.claude/plans/eager-nibbling-shannon.md` for Phases 1–9 (create `.claude/plans/` directory first)
