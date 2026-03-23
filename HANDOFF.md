# Session Handoff — March 22, 2026

## What Was Done This Session

### Features & Changes

1. **Retaliate QTE redesign** — Player now selects sequence length (3–6 keys) before the QTE. Base multipliers: 3→0.75×, 4→1.0×, 5→1.25×, 6→1.5×. Final = base × (correct/total). Result messages: DEVASTATING COUNTER! (≥1.4×), Direct Counter! (≥1.0×), Counter-Attack! (≥0.66×), Glancing Counter... (<0.66×). Two methods: `_showRetaliateQTE()` handles selection, `_runRetaliateSequence()` handles the QTE.

2. **Enemy HP increases**
   - `regional` (executive floor ending boss): 280 → 500
   - `regional_director` (penthouse chain boss): 400 → 600

3. **Regional manager disappears after defeat** — Added `condition: { notFlag: 'defeated_regional' }` to the `regional` NPC on executive floor.

4. **Ross returns to his office after regional defeat** — Added new Ross entry in `ross_office` with `condition: { flag: 'defeated_regional' }` and `dialogId: 'ross_returned'`. Also added `notFlag: 'defeated_regional'` to Ross's executive floor entry so he leaves the conference table.

5. **Grand executive desk** — New `grandDesk` furniture type in `Furniture.js`. Features: two solid mahogany pedestals with 3 drawer facades each, thick overhanging desktop with gold edge trim, center modesty panel with gold rail. Dark mahogany palette (0x2c1508 / 0x3d1f0a / 0x5a2e10) with gold accents (0xc8960a). Replaces the two standard desks at the main boss position on the executive floor. Footprint `{ w: 3, h: 2 }` added to `FURNITURE_FOOTPRINTS` in `Room.js`.

6. **Executive chair** — New `executiveChair` furniture type. High-back leather chair with headrest, padded armrests, chrome gas cylinder and star base. Replaces standard `chair` behind the grand desk.

7. **Furniture `y` offset support** — `Room.js` placement now reads `item.y || 0` so any furniture entry can specify a vertical offset. Used to raise the three executive monitors (`y: 0.06`) and keyboard above the grand desk's taller surface (0.78 vs standard 0.72).

8. **Executive floor conference chairs** — Rearranged from loose 6-chair spread to a proper 8-chair conference setup: 3 along each long side (z:7.0 and z:9.0), 1 on each short end (x:1.9 and x:6.1).

9. **CLAUDE.md improvements** — Added documentation for: `enemyOverrides` pattern, Retaliate two-phase QTE, furniture `y` offset, NPC condition single-flag limitation + `_refreshStoryProgress()` workaround, flag naming gotcha (`defeated_<encounterId>` auto-set vs post-dialog custom flags).

### Bug Fixes

- **Regional boss wrong enemy** — Previous session had boosted `regional_director` HP and used `defeated_regional_director` flag for NPC conditions. Both were wrong — the executive floor fight uses `regional` (encounter ID), auto-setting `defeated_regional` on victory. Corrected HP target and all flag references.
- **Ross not leaving executive floor** — His executive floor NPC entry lacked `notFlag: 'defeated_regional'`, so he stayed even after the fight. Fixed.

## Current State

- **Build**: `npx vite build` passes clean (chunk size warning only)
- **No test suite** — verification is manual playtest

## Key Flag Reference (story progression)

| Flag | When set | Effect |
|------|----------|--------|
| `ready_for_ross` | Auto-derived in `_refreshStoryProgress()` when all 4 met_ flags set | Unlocks Ross dialog |
| `branch_chosen` | After Henderson decision with Ross | Ross moves to exec floor conf table |
| `defeated_regional` | Auto on combat victory vs `regional` encounter | Regional NPC hides; Ross returns to office |
| `defeated_regional_director` | Auto on combat victory vs `regional_director` (penthouse) | Separate penthouse chain flag |
| `regional_director_defeated` | Set by `regional_director_defeated` post-dialog action | Used by ExplorationState to trigger Algorithm fight |
| `retry_karen` | On first Karen defeat | Enables roguelite tutorial phase |
| `defeated_karen` | Auto on Karen victory | Ends roguelite tutorial |

## Known Issues / Future Work

- **Rachel SVP**: no character model; remove after defeat
- **After defeating regional manager**: Ross dialog (`ross_returned`) written but not deeply integrated into story flow — may need expansion
- **Vault room**: redesign with bomb door entrance, bank lockboxes
- **Archive room**: more/taller file cabinets, fix monitor direction
- **FBI invasion sequence**: triggers after trust charter retrieved
- **Full expansion plan**: see `.claude/plans/eager-nibbling-shannon.md` for Phases 1–9
