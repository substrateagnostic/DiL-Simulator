# Overnight Sprint 5 — "Publishable" (June 11, 2026)

**Scope (Alex picked ALL + added):** verticality trifecta, settings menu, epilogue slides,
Quiet Floor, PLUS his list: street ground fog (dark/purple, conceals light-blue void floor +
helps tearing), desktop camera closer, more-PS1 character textures + better human geometry,
quest/dialog/common-sense logic pass, combat balance pass, world texture/decoration pass,
common-sense fixtures pass (exterior windows only on real exterior walls per buildingMap;
posters must read as posters and never overlap other fixtures). PLUS my pick: **PS1
post-process pass** (Bayer dither + film grain + per-act color grade, settings toggle).

## Phase order (risk-first, identity-early)

| # | Phase | State | Commit |
|---|-------|-------|--------|
| P1 | Floor-height engine + TRUE stairwell | DONE | see git log |
| P2 | Near-wall auto-fade | DONE | (pushed) |
| P3 | Elevator ride overlay (doors/LED/ding) | DONE | (pushed) |
| P4 | RetroPass + street ground fog + desktop zoom 10.5 | DONE | (pushed) |
| P5 | Character refinement (cloth canvas textures, silhouette) | NEXT SESSION | — |
| P6 | Fixtures common-sense pass | NEXT SESSION (do with P8 majors) | — |
| P7 | Settings menu (volumes, text speed, retro/shake toggles) | DONE | (pushed) |
| P8 | Logic sweep: report DONE (s5-logic-report.md, 29 findings); 3 CRITICALS + act7_complete FIXED+pushed; 8 MAJOR + 17 MINOR remain — apply next session from the report | partial |
| P9 | Balance APPLIED+pushed: 13 enemy overrides, 6 ability tweaks, boss silence-resist, HEAVY telegraph tag. Sim script reusable: node .claude/plans/s5-balance-sim.mjs --validate | DONE |
| P10 | Epilogue engine DONE+pushed; vignette art batch (8) generating via codex at session end — when it lands: downscale to 512px (HANDOFF snippet, target src/assets/epilogues/), copy raws to art/, build+commit | code done |
| P11 | The Quiet Floor | DONE | (pushed) |

## P1 spec — floor heights (the stairwell fix, third attempt, the real one)
- Room data: optional `floorZones: [{ x, z, w, h, y }]` — per-rect floor elevation. Rooms
  without it are flat (zero risk to existing rooms).
- TileMap: `heightAt(tileX, tileZ)` from zones (default 0). Movement rule: |Δh| > 0.35 between
  adjacent tiles blocks UNLESS a `stairZone` rect covers the transition (stairs let you climb).
- Room floor rendering: one plane per zone at its y; full-width step geometry auto-generated
  between adjacent zones that a stairZone covers (treads span the zone border).
- Entities: Player/NPC mesh.y lerps toward heightAt(position) (rate ~10/s). Blob shadow rides
  the group (already does). Camera unchanged (x/z follow).
- Stairwell rebuild: south landing y0 (rows 14-19) -> steps (rows 12-13) -> mid landing y-0.9
  (rows 7-11) -> steps (rows 5-6) -> north landing y-1.8 (rows 0-4, archive level). Remove the
  old stairFlight props from the room. Walls: raise wall height for this room (`wallHeight`
  override?) or accept default. Interactables keep tiles; poster z10 lands mid landing.
- stairFlight furniture stays for decorative use elsewhere (garage corner?) or delete if unused.

## P2 spec — near-wall fade
Room.build keeps wall meshes list w/ orientation. ExplorationState.update (or Room.update):
walls whose outward normal faces the camera (south + east walls) fade material.opacity to
~0.15 when the player is within 2.5 tiles of them, restore otherwise. Materials must be cloned
per-room (NOT shared cache!) — clone in _addWallSegment when enabling fade. Baseboard/crown
fade with their wall.

## P3 spec — elevator ride
ElevatorRideState (or overlay in ExplorationState): tiny 6x4 'elevator_car' room OR pure DOM
overlay (doors close SVG, floor ticker counting via buildingMap floors, ding, 1.6s). DOM
overlay is cheaper and reads great: full-screen doors-close animation, LED floor counter
(G..1 or 1..G, later 1..23 penthouse), muzak sting via AudioManager. Trigger in the existing
elevatorUp/elevatorDown branch of _changeRoom. Skippable (any key).

## P4 spec — PS1 post pass + ground fog + zoom
- ShaderPass after bloom in Engine composer: 4x4 Bayer ordered dither (strength ~0.5/255 at
  dark end — subtle), film grain (time-seeded, ~0.035), color grade via per-act tint uniform
  (Engine.setTimeOfDay already knows the act palette — add grade: {lift, gamma-ish tint}).
  Toggleable: Engine.setRetroPass(false) for the settings menu / reduce-flicker accessibility.
- Street ground fog: at street level the void's light-blue blueprint floor + cloud shadows
  read wrong (Alex). Add a large dark ground disc (0x0c0a14 -> dark purple gradient canvas)
  at y -0.05 outside the room footprint + 6-10 slow-drifting translucent fog quads
  (0x1a1026, additive OFF, opacity ~0.18) around the street rooms. Only in street mode
  (CityBackdrop.setStreetLevel shows/hides). Also hide cloud shadows at street level.
- Desktop camera: _zoomForViewport() -> desktop (h>=540) zoom 12 -> 10.5 (Alex: 'move the
  camera in a bit'). Verify cubicle_farm still fits its dead-zone follow.

## P5 spec — character refinement
- Cloth texture: canvas-painted body textures (subtle 2-tone weave noise + button placket +
  belt line) replacing flat colors on chest/pelvis — map on toon material, tinted per config.
- Geometry: shoulders (small angled boxes at arm joins), neck shorter, shoe wedges (toe taper),
  chest taper tuned per gender-ish silhouette param (broad/slim), slight forearm narrowing.
- Keep PS1 crunch: NearestFilter on cloth textures, low-res canvases (32x48).

## P6 spec — fixtures pass (do AFTER P8 report which may add items)
- Windows: only on walls that are exterior per buildingMap (room edge touches plate edge).
  Interior-facing window arrays get removed or swapped to corkboard/vent.
- motivationalPoster: ensure standalone wall tile (no overlap with cabinets/screens); give the
  poster mesh a real canvas (border + headline text 'HANG IN THERE' variants) so it reads.
- Audit all rooms for: furniture intersecting furniture, wall items at non-wall tiles, decor
  on top of decor. Use the contact sheet per room.

## P7 spec — settings
MenuState new tab 'Settings' + localStorage persist: musicVol, sfxVol (AudioManager gains),
textSpeed (TEXT_SPEED multiplier), screenShake on/off (CombatScene/Engine shake guard),
retroPass on/off (P4), fullscreen request. Also surface on TitleState (gear icon).

## P8/P9 — background agent protocol
Report-only agents (NO edits): P8 sweeps dialogs/quests/gating for logic holes, orphaned flags,
unreachable nodes, common-sense issues; P9 runs a headless CombatEngine sim (node script) for
all story encounters at expected player levels, reports win rates + proposed balance.json
deltas. Apply their findings as separate commits after review.

## P10 spec — epilogues
After algorithm_defeated ending dialog: EpilogueState — sequence of DOM cards (portrait +
2-3 lines, anchor voice) driven by flags: charter_certified/Delia, daemon_kept|killed,
meter_war_done, bus515_done, each act6 ally rallied, deaths count, AUM total. Ends on title.
Skippable per-card. Write in WRITING.md voices.

## P11 spec — Quiet Floor
Room 'floor_13' (16x10, dark, one lit window, a single chair facing it, no NPCs).
After act>=5 and TOD night/predawn: riding the elevator (garage<->reception) has a 20% chance
(once per session) to stop at 13 first: toast 'The elevator pauses. The doors open anyway.'
Exit back via elevator only. Sitting in the chair triggers andrews longest monologue
(thoughts.js + a dedicated dialog). One whisper monitor. REMEMBERED.

## Verification
npm run check w/ REAL exit codes; npm run shoot full sheet at end; mobile spot-check after P4
(zoom change!) at 390x844 + 844x390.
