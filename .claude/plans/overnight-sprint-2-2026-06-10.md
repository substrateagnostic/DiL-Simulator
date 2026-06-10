# Overnight Sprint 2 — June 10–11, 2026 ("the ~100-day run")

**Alex's brief:** full low-poly flat-shaded conversion (Necropolis-adjacent), characters as
low-poly caricatures with real faces (not flat dots), sense of the world outside the rooms,
IT/server room rework, archive cabinets darker, better screenshot pipeline for Claude, and the
mandatory Act 6½ city chapter (**The Countersignature** — see `countersignature-design.md`).
Game is ~⅓ desired length: prefer additive content; mandatory spine + optional sides.
All dialog follows `WRITING.md` (root) — Alex IT anchor corrected to **Dirk Gently**.

**Continuation protocol:** same as sprint 1 — after each phase: `npm run check`, contact-sheet
verify, commit, update STATUS here. Fresh instance: read ROADMAP.md → this file →
countersignature-design.md → WRITING.md, then continue at first non-✅ phase.

## STATUS

| # | Phase | State | Commit |
|---|-------|-------|--------|
| P0 | Docs (this file, WRITING.md, countersignature-design.md) | ✅ | 9294173 |
| P1 | Screenshot pipeline: tools/shoot.mjs + ?dev fixture/shot params | ✅ 31/31 | 6c9aa47 |
| P2 | Low-poly caricature characters + faces + expression system | ✅ | 812c960 |
| P3 | Environment: server room rework, archive mood, new IT furniture | DONE | 7ebd7f7 |

**P2 addenda:** Alex feedback applied — faces squish down under hair/hats (FACE_DROP map);
held accessories anchor to computed handY/handX (cane plants, mop has a head); grandma shawl
= hood + rim + chin knot. PENDING: alex_it portrait regen (late-30s, sandy hair + ginger beard,
Dirk Gently serenity — prompt rev 2 in art/PROMPTS.md) queued for after the mood batch finishes;
ALSO regen alex_it_angry/_smug/_worried with the new base. Mood-batch raws committed at 1024 —
downscale to 256 (HANDOFF PowerShell snippet) and recommit when batch completes.
| P4 | World outside: city backdrop, cloud shadows, act time-of-day | DONE | 65804d7 |
| P5 | Act 6.5 The Countersignature (6 rooms, The Firm 3v1, full dialog, gates/objectives) | DONE | 3bcfd50 |
| P6 | Art: Delia + 15 mood variants + alex_it rev 2, normalized 256px (34 portraits, 4.2MB) | DONE | 243cef3 |
| P7 | STRETCH: voice-anchor refinement of existing dialog — bg agent running at session end. Protocol: review git diff src/data/dialogs/index.js (spot-check ~10 dialogs vs WRITING.md), npm run check, then commit. Agent must NOT touch structure/indices. If corrupted: git checkout -- the file and redo in chunks. | RUNNING bg | — |

## Known follow-ups (not blocking)
- City street uses standard perimeter walls — low curbs + facade strips would read more outdoors.
- MeshToonMaterial ignores flatShading (three r183) — faceted look is geometry-driven for now.
- Combat camera could frame 3v1 slightly wider (Firm heads near top edge).
- charter_challenge hardcodes "Mr. Galle" — fun nod; confirm Alex approves.
- Delia mood portraits not generated (base only — fallback works).
- City chapter + whale referral untested end-to-end by a human.

## Phase notes (fill as built)

### P1 — pipeline
- `?dev&fixture=<act1|act3|act5|act7|postgame>` → skip title, new Player, apply DevPanel preset
  flags, spawn. `&shot=<roomId>` → teleport there, hide HUD after load. `&fight=<encounterId>` →
  start that combat. Implement in `main.js`/`ExplorationState` behind DEV_MODE only.
- `tools/shoot.mjs`: plain `playwright` npm pkg (devDependency), 1920×1080, iterates a manifest
  of shots, writes `screenshots/contact/<name>.png` + an `index.html` contact sheet.
- `npm run shoot` / `npm run shoot -- --only=server_room`.

### P2 — characters
- Faceted flat-shaded geometry (`flatShading: true` variants in MaterialLibrary — new
  `Materials.flat(color)`); keep cached materials separate from smooth toon cache.
- Head: faceted icosphere-ish; modeled brow ridge, nose wedge, jaw box, mouth strip.
- Expression presets: neutral/angry/smug/worried/hurt/victory — drive brow rotation, mouth
  scale/shape, eye scale. Hook: dialog `mood` field (already plumbed) + combat events
  (hurt → flinch face, victory → victory face) via CharacterAnimator.setExpression().
- Caricature params per character extended: noseScale, jawScale, browAngle (characters.js).
- Keep group refs contract (leftLeg/rightLeg/leftArm/rightArm/body/head/leftEye/rightEye)
  and monolith build untouched.

### P3 — environment
- `Materials.toon()` gains flat-shaded gradient look globally OR new flat() used by Furniture;
  unify palette (pick 32-color office palette, document in MaterialLibrary header).
- Server room: 10×12, raised-floor tile pattern, two rack aisles with hot (orange) / cold (blue)
  glow, overhead cable trays, Alex's den (corner desk, 6-monitor wall with officeScreen canvases,
  beanbag, kettle). Keep all existing interactable coordinates working — move entries if needed.
- Archive: cabinet material darker (0x5a4a3a-ish), dimmer rig, dust motes optional.

### P4 — outside
- `CityBackdrop.js` (effects/): low-poly block skyline group added to Engine.scene below room
  level (y≈-6), fog-faded, blinking emissive windows, car-light streak sprites on a loop;
  visible around every room through the void. Per-act time-of-day: act 1–2 morning, 3–4 afternoon,
  5 dusk, 6 night, 6½ golden hour (city chapter is daylight — override per room), 7 pre-dawn.
  Implement as Engine.setTimeOfDay(phase) called from _syncActFromFlags/room load.
- Cloud shadows: large soft alpha blobs translating slowly across floor receiveShadow meshes
  (fake: transparent dark sprites at y=0.02, additive drift).
- City chapter rooms use open-sky lighting + the backdrop at street level (y=0).

### P5 — city chapter
Per `countersignature-design.md`. Build order: rooms data → location names/music/gates →
encounters+enemies (Firm 3v1 uses existing multi-combatant engine) → dialogs (WRITING.md voices,
the five must-land beats) → objective text per stage → bestiary entries → playtest via pipeline
fixtures (`fixture=act65`).

### P6 — art
- Background codex job (proven pipeline, ~3min/image): `delia.png` (Gwendolyn Brooks warmth,
  70s, silver locs, cardigan over Recorder's-office lanyard, booth-4 light) + mood variants
  `<stem>_angry/_smug/_worried` for karen, ross, janet, alex_it, rachel, janitor.
  Style prefix verbatim from art/PROMPTS.md. Downscale to 256 via the PowerShell snippet in
  HANDOFF (System.Drawing), raws → art/portraits_raw/.

## Hard-won facts (carry-over from sprint 1)

- Playwright keys: down → ~90ms → up. MCP viewport collapses on reload — P1 replaces MCP for
  verification. Console combat trigger: import EventBus from '/src/core/EventBus.js', emit
  'start-combat' then 'dialog-end'.
- `ENEMY_STATS.reception_client.mutators` must always be reset by generateClient.
- `_addWallSegment` returns [wall, baseboard, crown].
- Monolith: never drive rotation.y outside the animator.
- Portraits: drop 256² PNG in src/assets/portraits/, stem map in DialogBox.PORTRAIT_KEYS.
- NG+ scaling lives in CombatEngine._buildEnemy (before overrides).

## Night-cap additions (post-P6, committed 55d6dcf)
- BuildingShell: blueprint ghost tower around every interior room + warm ghost rooms beyond exits.
- Whisper monitors (~4%: one spreadsheet cell reads REMEMBERED).
- Daemon at Rack 7: interactable wired (server_room 3,4, algorithm_defeated gate). Dialog STAGED
  in .claude/plans/daemon-dialog.snippet.js — merge into dialogs/index.js (before final };,
  drop the export wrapper) AFTER the P7 agent finishes, then npm run check, commit, delete snippet.
