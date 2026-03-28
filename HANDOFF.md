# Session Handoff — March 24, 2026

## What Was Done This Session

### Bug Fixes

1. **Roguelite XP too low** — Old formula `(15 + t * 135) * lvlScale` scaled with player level and went below 60. New formula: `Math.round(60 + t * 60)` — fixed 60–120 range based solely on client wealth tier. In `ClientGenerator.js` `scaleEnemyStats()`.

2. **Act 6 "Prepare for the Finale" showing 2/4 allies pre-complete** — `janet_rallied` and `diane_rallied` were set in Act 4 dialogs and reused in the Act 6 counter. Fixed by introducing `janet_act6_rallied` and `diane_act6_rallied` flags. `janet_act6` dialog sets `janet_act6_rallied`; `diane_act6` dialog sets `diane_act6_rallied`. The Act 6 objective counter updated to use the new flags.

3. **Diane's documents given on dialog instead of found in room** — `diane_act6` was setting both `diane_act6_rallied` and `diane_evidence` on conversation. Removed `diane_evidence` from the dialog. Added a new `diane_documents` dialog and a filing cabinet interactable at `x:14, z:8` in the HR Department. Diane now tells the player where to look; the cabinet sets `diane_evidence`.

4. **Ross not rallying in Act 6** — His `defeated_regional` room entry had `dialogId: 'ross_returned'`, which overrides act routing. Added a new Ross room entry with `condition: { flag: 'act5_complete' }` and no `dialogId` so `_getDialogId()` reaches `ross_act6`. Added `notFlag: 'act5_complete'` to the `ross_returned` entry.

5. **Archive janitor visible during "Get the Janitor's Rolex" mission** — Last archive janitor entry (`condition: { flag: 'janitor_rallied' }`) now has `notFlag: 'act5_complete'` so it hides once Act 6 begins.

6. **Break room DEF poster stuck behind arcade cabinet** — Moved `motivationalPoster` furniture from `x:8.9, z:6` to `x:5, z:6.9` (south wall interior face) and matching interactable from `x:9, z:6` to `x:5, z:6.9`.

### Features

7. **Prepare for the Finale objective** — Now lists remaining allies and evidence by name with `<br>`-separated bullet points in the HUD. Toast strips HTML before display. Format: `Rally:<br>• Janet<br>...` / `Evidence:<br>• Diane's documents<br>...`

8. **Board Room redesign** — Room expanded from 12×10 to 16×12 with hardwood floor. New `boardroomTable` furniture asset: 8-tile long dark mahogany table, gold trim band, gold inlay lines, 8 tapered column legs with gold caps, stretcher rails, built-in speakerphone. 14 executive chairs (7 per long side + head). 3 grand paintings on north wall. Sculptures in all 4 corners. Tall plants flanking table ends. Credenzas along side walls. Whiteboard on east wall. All spawn coordinates updated in connecting rooms.

9. **`grandPainting` furniture asset** — New asset replacing `oilPainting` in the board room. 1.4×1.1 ornate gold frame with raised bevel border strips, corner ornaments, highlight edge line, dark liner, and 7-layer landscape canvas (dark earth → amber → foliage → hills → horizon glow → lower sky → deep sky). Added to `NO_BLOCK` in `Room.js`.

### Key Flag Reference (story progression)

| Flag | When set | Effect |
|------|----------|--------|
| `ready_for_ross` | Auto-derived in `_refreshStoryProgress()` when all 4 met_ flags set | Unlocks Ross dialog |
| `branch_chosen` | After Henderson decision with Ross | Ross moves to exec floor conf table |
| `defeated_regional` | Auto on combat victory vs `regional` encounter | Regional NPC hides; Ross returns to office |
| `defeated_regional_director` | Auto on combat victory vs `regional_director` (penthouse) | Separate penthouse chain flag |
| `regional_director_defeated` | Set by `regional_director_defeated` post-dialog action | Used by ExplorationState to trigger Algorithm fight |
| `retry_karen` | On first Karen defeat | Enables roguelite tutorial phase |
| `defeated_karen` | Auto on Karen victory | Ends roguelite tutorial |
| `act5_complete` | After Rachel defeated | Starts Act 6; hides archive janitor |
| `janet_act6_rallied` | `janet_act6` dialog | Act 6 ally counter (not `janet_rallied`) |
| `diane_act6_rallied` | `diane_act6` dialog | Act 6 ally counter |
| `diane_evidence` | `diane_documents` dialog (HR cabinet) | Act 6 evidence counter |

## Current State

- **Build**: `npx vite build` passes clean (chunk size warning only)
- **No test suite** — verification is manual playtest

## Known Issues / Future Work

- **Rachel SVP**: no character model; remove after defeat
- **After defeating regional manager**: Ross dialog (`ross_returned`) written but not deeply integrated into story flow — may need expansion
- **Vault room**: redesign with bomb door entrance, bank lockboxes
- **Archive room**: more/taller file cabinets, fix monitor direction
- **FBI invasion sequence**: triggers after trust charter retrieved
- **Full expansion plan**: see `.claude/plans/eager-nibbling-shannon.md` for Phases 1–9
