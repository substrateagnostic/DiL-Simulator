# Overnight Sprint 4 — "The Building Is Real" (queued June 11, 2026)

**Alex's brief (his words, lightly structured):** street scenes + street-mission interiors
should render at the BOTTOM of the background skyscrapers for immersion; the parking garage
too, with an elevator up from the bottom; build an actual staircase in the stairwell (previous
models never got the geometry right); enlarge/unify the blueprint ghost tower so rooms render
at consistent size inside one coherent building — estimate a cohesive overall map and position
each room's shell accordingly, "as though we are actually moving through the large skyscraper."

## Phases

### P1 — Canonical building map (data foundation, do FIRST)
New `src/data/buildingMap.js`: for every interior room, `{ floor, offsetX, offsetZ }` placing it
on a single tower floor plate (size the plate to the largest floor ≈ 26×18). Estimate from
story logic: garage = ground (floor 0); reception 1; cubicle farm/break/server/ross/conference 7
(the dialog says "sixth floor"/"DEPT. 7" — pick 7, Janet's line says sixth: reconcile, use 6);
HR 9; executive 21; board 22; penthouse 23; archive = B2, vault = B3 (below ground!); stairwell
spans B2→6 (it's the connector). City rooms + garage are STREET CONTEXT (no shell, see P3).

### P2 — BuildingShell v2: one tower, consistent plate
- Fixed footprint from the canonical plate; the current room's shell offsets by
  `-offsetX/-offsetZ` so the room sits where it actually is on the floor.
- Ghost floors above/below scale with `floor`: at floor 6, ~5 ghost floors below before fading;
  at floor 22, many (cheap: same 6-slab stack but label/опacity implies more; optionally a faint
  continuous tower volume outline instead of per-slab beyond 6).
- Vertical sense: B-floors (archive/vault) render ghost floors ABOVE more strongly, below dark.
- Align the warm exit ghost-rooms with the actual mapped neighbor rooms where known
  (exits carry targetRoom → look up its offset on the same/adjacent floor).
- CityBackdrop stays centered on the canonical tower (CENTER moves to plate center once).

### P3 — Street-level world mode
- `CityBackdrop.setStreetLevel(true)`: towers re-rooted so their BASES sit at y≈0 (rising far
  above the play area) instead of rooftops below; car streaks at y≈-0.5 nearby instead of -16;
  cloud shadows stay. Applied for: city_street, transit_bus (windows show street), records_hall,
  luckys_diner, old_branch, old_vault (basement: bases slightly above, dim), parking_garage.
- Trigger alongside Engine.setTimeOfDay in ExplorationState._applyTimeOfDay (it already special-
  cases CITY_ROOMS; add parking_garage).
- The office tower itself should appear in the street skyline — one tall tower near the garage
  exit (the building you just left). Nice touch: its windows lit per act time.

### P4 — Garage elevator
- New furniture `elevatorDoors` (lobby-grade doors + floor indicator canvas) on the garage north
  wall + interactable → rides up to reception (replaces/augments the existing north exit):
  short TransitionOverlay ride (wipeUp + ding + floor numbers ticking on a toast).
- Elevator is the canonical vertical connector; stairwell remains the back route.

### P5 — Real stairwell staircase
- The stairwell room already uses `slope` (scene rotation) for descent. Build actual stepped
  geometry: `Furniture.stairRun(variant=stepCount)` — N steps + stringers + handrail, sized so
  step rise/run matches the slope angle; place 2-3 runs with landings down the 4×20 room.
  Player walks the slope as today (collision unchanged) — the steps are visual, aligned so feet
  track treads approximately. Verify alignment via contact sheet at multiple z.
- Watch: room slope rotates the whole scene group — stairs built flat in room space will be
  rotated WITH the room, so build them flat and let the slope provide the descent (steps should
  counter-rotate by slope angle to read level... test; previous attempts failed here. Approach:
  build steps with rotation.x = -slope on the group so treads are world-horizontal).

### Carryovers
- AUDIO OVERHAUL diff review+commit (agent a26d469689c1dfbe0 was in flight at session end —
  check src/core/AudioManager.js + ExplorationState._getMusicForRoom diff; npm run check with
  REAL exit code: `npm run check > log 2>&1; echo $?` — pipes mask crashes (see Session 8 gotcha);
  listen test is Alex's).
- Balance sim pass on city encounters (editor Combat Sim, L8/10/12, target 60–90% win).
- Karen bangs could drop a touch lower over the forehead (minor, co-creator may not care).

## Verification
`npm run shoot` contact sheet after each phase; street-level mode needs new shots of all six
city rooms + garage; stairwell shot at top/middle/bottom spawn.

## STATUS (June 11, session 9)
- P1 buildingMap.js DONE (7839903) - canonical floors/offsets, 28x20 plate
- P2 BuildingShell v2 DONE (7839903) - one tower, floor-aware stacks, aligned neighbor ghosts,
  city ring recenters via setCenter
- P3 street-level mode DONE (634a264) - setStreetLevel: bases at ground, 2.4x stretch, curb-height
  car streaks, HQ tower north behind facades (lit per story hour). City rooms + garage.
- P4 garage elevator DONE (47f55b2) - elevatorDoors furniture (G + 1), ride transition w/ ding toast
- P5 stairwell shaft DONE (6e8a2d4) - center-shaft up/down flights; NEEDS IN-GAME WALK:
  near-wall occlusion may hide flights at fixed iso angle; follow-up candidate = near-wall auto-fade
- Audio overhaul committed earlier (683cc64) after diff review.
- Remaining carryover: city encounter balance sim (editor Combat Sim L8/10/12).

## New gotchas (session 9)
- Furniture dispatch is DYNAMIC (Furniture[type]) - no switch; CLAUDE.md's 'add to switch' note
  is stale. Mesh placement precedes blocking logic; special-case blocks (facadeStrip width,
  stairFlight 1x4 northward) live before the FURNITURE_FOOTPRINTS lookup and 'continue'.
- PowerShell .Replace patches can swallow newlines - prefer the Edit tool for code (bit us in
  Furniture.js; rollup error at the glued line).
- shoot.mjs room tiles can capture auto-triggered combat (fixture flags + Enter-clearing advance
  dialogs into start_combat). If a room tile looks like a fight, that's the harness, not the game.
- Narrow corridors: near long wall occludes interior at the iso angle - judge stairwell in motion.
