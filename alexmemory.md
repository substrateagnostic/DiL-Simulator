## [CUTSCENE FIX ROUND (08-04 midday) - your three morning notes]

One commit before this block, one after; `display-case` only. `npm run check`
exit 0 verified before each. `main` untouched.

### 1. SCENE IDENTITY - you were right, and the mislabel was MINE, in this file

Ground truth: "Face the consequences" is a HUD objective string, not a scene name.
The scene is `secret_ending` (grandma path) / `legal_eagle_ending` /
`bro_code_ending`, auto-pushed on entering the EXECUTIVE FLOOR main room - exactly
where you said. **It was staged, correctly, in round 1.** What went wrong is that
the wave-G block above says "face-the-consequences staged (grandma_meeting video)"
and pointed you at the wrong file. `grandma_meeting` is a real, different scene:
the conference-room pre-fight dialog for Grandma. Your read of it was correct.

The extra body was not Ross - it was KAREN. conference_room's first Karen entry is
`briefing_complete && !retry_karen`, with no `karen_defeated` term, which is right
in play because the first Karen fight is a scripted unavoidable loss and every real
save holds `retry_karen`. The capture fixture skipped the loss, so Karen stood at
the head of the table for the whole Grandma scene. Fixture fixed; the capture tool
now carries a per-scene roster (`expect: {present, absent}`) and FAILS ITSELF on a
stowaway. New `face_the_consequences` alias so the file is named what you call it.

### 2. CAPTURE FIDELITY - the governor, not the harness

The harness was already booting the shipping path. The culprit was the ADAPTIVE
QUALITY GOVERNOR: Playwright's video recorder costs 40-60ms/frame, the governor
read that as weak hardware and walked the degrade ladder down MID-TAKE. At `low`
the city backdrop group and the room-FX light-pool group are set `visible = false`
and AO/bloom/tilt-shift/shadows go off. Frame 000 of the old board_meeting had the
display-case look; frame 101, two minutes later, was a black void. New `?qtier=high`
pins the tier, and the capture now samples the live tier plus both group
visibilities EVERY FRAME and fails itself if either moved.

### 3. MOVEMENT MODES - both, author's choice per beat

`stage` nodes now have two modes. SCHEDULED (default) hides the box and blocks
while actors move. CONCURRENT (`concurrent: true`) leaves the box up and the beats
run UNDER the text. `wait: false` was never this - it only told the gate not to
wait; the node still hid the box, which is why the board meeting blanked ELEVEN
times in two minutes. The unpause is narrow on purpose: only staged actors tick,
`ExplorationState` stays asleep, so you can never walk out from under your own
cutscene. Measured mix off the video - face-the-consequences 12 frames of motion
under text / 33 with the box hidden; board_meeting 12 / 19; the Firm ambush 0 / 12
(fully scheduled - an entrance should own the frame).

### Deliverables (trimmed, mp4, open on the first line - no more boot splash)

    screenshots/g-run/cutscenes/face_the_consequences/face_the_consequences-cut.mp4  61s
    screenshots/g-run/cutscenes/board_meeting/board_meeting-cut.mp4                  91s
    screenshots/g-run/cutscenes/the_firm_ambush/the_firm_ambush-cut.mp4              16s
    screenshots/g-run/cutscenes/grandma_meeting/grandma_meeting-cut.mp4              29s

Judge (single, Opus): PASS on all three axes, cited frames. Its two non-blocking
notes were both executed this round: the boot head/textless tail are trimmed off
every deliverable (43% of the ambush file used to be a car park), and Skip now
crosses at speed 2.6 so he is planted BEFORE the narration says he is standing -
the number moved, not the line, because prose is canon.

### New laws in CLAUDE.md

Every judged capture runs the SHIPPING visual path (pin the tier, measure it every
frame) and is identity-checked against the scene it claims to be. Any fixture that
jumps past a scripted loss must set that loss's flags. Name the deliverable what
you call it, not what the data calls it.

## [WAVE G CLOSED - ALL THREE RUNS JUDGED (08-04 morning)]

28 agents, 4.57M tokens, 0 errors, ran through a laptop crash on cache
resume. Final commit 03409b4; display-case pushed; main untouched.

- ARCADE: PASSED ROUND 1. SPRINT REVIEW (fd202c1) cleared both judges
  on first submission. Video: screenshots/g-run/arcade/video/.
- CUTSCENES: PASSED (round 3). The game has a StageDirector; 21 scenes
  staged (2723554). Your seeds fixed: face-the-consequences staged
  (grandma_meeting video), the board meeting stops being radio, exec
  posters re-faced, the Firm ambush staged. 16 scene videos under
  screenshots/g-run/cutscenes/.
- UX: judges failed round 3 on ONE remaining defect, wrote the fix
  themselves; closer executed it verbatim (03409b4): after the board
  meeting, E on Skip now routes to a new no-reward farewell
  (board_meeting_after, Opus 4.6 lines) instead of REOPENING the full
  set-piece (+300 XP farmable per re-run). Gate leg (e) added with
  PROVEN teeth (routing disabled -> exit 1, measured +600 farm).
  Your five seeds all fixed earlier rounds: posters, NW staircase,
  grandma re-trigger, alex_it dialog machine, Press Advantage.
- Board gating inversion (40c3635) verified vs legacy saves.
- Honesty: _ux-dev exit-code behavior changed (now fails properly);
  the original D1/D2 before-baseline was overwritten by a tool default
  and is unrecoverable (renamed, root cause fixed); leg (e) asserts
  XP only (the tree's whole reward surface today).
- YOUR MORNING GATE: watch grandma_meeting + board_meeting + arcade
  videos. On your nod: MERGE, then naming sweep -> I arbiter ->
  combat build (H schedule + 9 cards + cosigned J package) -> F
  remainder. Nothing merges before your eyes on the taste items.
## [RUN G / FIX ROUND 3 (08-04) — UX lane + CUT lane, judge panels answered]

One commit on `display-case`, pushed. `npm run check` exit 0 verified before it.
Nothing merged to `main`.

### UX lane — the stairwell handrails are solid again

The near-camera flight had **no rails at any position the player can stand in**.
`Room._registerWallProp` had opted them into the south/east walk-behind fade, and
in a 4-wide room the fade trigger (`px > width - 3.5` = 0.5) covers the entire
reachable floor (`Player.move` clamps x to 0.4–2.6). That is not a fade, it is a
delete. Measured at the producer's five stations: **east rail materials 0.16 at
all five**, 1.0 only at his far-west-clamp control at x 0.45 — which reproduces
his `screenshots/tiebreak/tb-stair.json` baseline exactly.

- The invariant is now written into the code, not just patched: **no prop may sit
  at reduced opacity at EVERY position the player can occupy in its room.**
- Two guards, both geometric, both stated against the real constants so they
  cannot drift from the fader: **conditionality** (the solid band must be at
  least one tile wide, checked against `WALL_FADE_INSET` exported from `Room.js`
  and `PLAYER.EDGE_CLAMP` now exported from `constants.js`) and **solidity**
  (box depth across the wall normal >= 0.25 m — an open post-and-rail reads
  through and is not an occluder). `_updateWallFade` imports the inset instead of
  re-typing 3.5.
- Solidity cut chosen from measurement, not taste: rails **0.07 m**, every real
  occluder **0.337 / 0.38 / 0.67 / 0.70 m**. 3.6x clear on both sides. The
  obvious `box.min.y <= 0.35` "stands on the floor" term does NOT discriminate —
  the rails descend to -2.52 and -5.04 and pass it. Written down so the next
  author does not add it.
- Both rail pairs now land on the **same render path**. Before: west pair merged
  by `_mergeStatics` (`meshes: 0`), east pair cloned transparent (`meshes: 5`).
  After: all four `meshes: 0`, opacity 1.0 at all five stations plus the control.
  Fixing this the naive way would have traded an opacity asymmetry for a
  lighting/normals one.
- Census: **18 props / 8 rooms -> 16 props / 7 rooms**, `stairwell` absent.
  Nothing else changed. Executive-floor `elevatorDoors` regression re-verified
  with numbers *and* plates: **0.16 behind the south wall, 1.0 away from it**.
- `tools/_g-wall-census.mjs` is now a **gate, not a report** — exits 1 when a
  registered prop has no reachable solid position. Proven both ways: exit 0 on
  the fix, **exit 1 with `--guardoff`** (which reproduces the pre-fix
  registration). The old census printed `stairRail@3.3,16` for a whole round and
  nobody read it.
- Housekeeping: the `_registerWallProp` docstring said "0.75 tiles" while the
  code said 1.4. Corrected, with the reason (posters live at `h-1.1`) — that
  mismatch is what let the rails in unnoticed.

### CUT lane — the board meeting stops emptying itself on camera

`board_meeting_held` sets at node 175 and `board_meeting_closed` derived in the
same tick, but the 18 `conditionFn` hides cannot execute until ExplorationState
ticks again — the first frame after the dialog pops. **Measured: 18 -> 0 visible
NPCs in one uncovered tick.** After: **largest single-tick drop while the screen
is uncovered = 0**, cast present at dialog-end +0 ms and +1 s with control live
(`top=ExplorationState`, `paused=false`).

- Fix is the lazy flag the panel asked for: `_refreshStoryProgress()` refuses to
  derive `board_meeting_closed` while `player.currentRoom === 'board_room'`, and
  `_changeRoom()` flushes it after the wipe (beside the `floor_13_found` set,
  before `_autoSave`), where the cast is already disposed. One-way law kept, the
  `|| act6_complete` legacy bridge kept, still never set from dialog data.
- All four probe legs pass (`tools/_g-board-close.mjs`): walk out -> flag derives,
  re-enter -> **0 NPCs**, Skip **back in his office**; save/load inside the window
  -> cast intact, not stranded; quit-and-reload standing in board_room -> cast
  present until you walk out, then the flag lands.
- **Two-Janitors law re-verified** in all three Rolex states including the legacy
  save (`tools/_g-archive-check.mjs`): exactly one Janitor each time.
- Rider taken: `chief_restructuring_defeated` now has an exit beat
  (`exit: 'board_door'`, the `regional_director_defeated` node-6 form), appended
  as node 10 and routed to from 9 — never inserted. He walks 3.35 tiles and ends
  at (7.32, 1.14) instead of being despawned in place. `_g-stage-verify` vs
  `8b30e2b`: **0 pre-existing nodes or edges changed**.

### Board speak marks — half taken, and the other half measured down

`speak_west` **6 -> 6.5** (stands in the gap between chairs): diane-vs-seated
0.427 -> 0.506, intern 0.459 -> clear of the top ten. `speak_east` **left at 10**
on purpose — moving it to 9.5 measured *worse*, because the east crowding is
**transit, not standing**: Janet's route to the new mark runs through Isaiah's
home tile and the worst pair in the whole scene went **0.319 -> 0.056 tiles**.
The panel's ">0.6 tiles" bar is **not reachable by mark placement at all** — the
two binding pairs are Skip's BLOCK-H return past Diane (0.14) and Janet-vs-Isaiah
in transit (0.32). Both are walk legs. Producer's call whether that is worth a
routing pass; the crowd read is otherwise intact.

### HANDOFF to the lighting/level lane — "the Board Room goes dark"

**Root-caused, and the round-2 framing was wrong in both directions.** It is not
elapsed time and it is not decay. `BuildingShell` is an event, not a backdrop:
`FADE_IN 0.4 + HOLD 1.2 + FADE_OUT 0.8` = **2.4 s**, then `group.visible = false`
for good (`src/effects/BuildingShell.js:42`). Measured `building_shell.visible`:
**true at t=2 s, false at t=47 s and t=102 s, in both populations** (cast present
and cast absent). Everything after 2.4 s is the room's steady state — the 2 s
reference frame was simply the only one that ever had the shell in it.

So the real note is a level/lighting call, not a bug: at the Act-6 night
time-of-day, `board_room` has no backdrop tier under it at the shipping camera,
so once the entry shell expires the room floats in pure black — and a
**90-second scene lives entirely in that state**. Options are a backdrop tier for
the room or holding the shell for staged scenes (`Engine.holdBuildingShell(true)`
already exists; the elevator ride uses it). Plates and numbers:
`screenshots/g-run/board/dark/` (+ `dark.json`).

### Harness lessons, now in CLAUDE.md

Three of these were actively producing false evidence:

- **`import('/src/core/Engine.js')` inside `page.evaluate()` can hand you a
  second, uninitialised Engine.** Vite serves the running app's copy with an HMR
  cache-buster (`?t=...`) as soon as anything has been edited that session, so the
  bare specifier is a different URL and `scene`/`renderer` are both null. Silent,
  because call sites null-guard — **`_g-wall-shoot`'s `--zoom` detail take
  no-ops under exactly this condition**, which is worth knowing before trusting
  any zoomed plate shot after an edit.
- **In-page luminance probes read 0** — no `preserveDrawingBuffer`. Measure the
  PNG (`tools/_g-lum.mjs`).
- **`npc.visible` lies** when anything sits on top of ExplorationState: the
  conditionFn is only evaluated while it is the top state, so a dialog pushed by
  a flag-set listener freezes every conditional NPC hidden. Call
  `conditionFn(flags)` directly when auditing.
- `_g-cut-shoot` now shoots **`settled` (+1.4 s after `final`)**, and the
  `board_meeting` advance cap went 140 -> 230. 140 never reached the end node
  (it takes ~189 Enter presses), so every previous take's "final" frame was a
  middle frame with the dialog box still up — which is how three evidence
  packages missed a defect that lives in the last second of the scene.

### What the producer should look at

- `screenshots/g-run/ux/CROP-top-PREFIX.png` vs `CROP-top-FIXED.png` and
  `CROP-mid-PREFIX.png` vs `CROP-mid-FIXED.png` — matched to his own tie-break
  windows. Four rail runs, near flight railed.
- `screenshots/g-run/cutscenes/board_meeting_PREFIX/100-settled.png` vs
  `screenshots/g-run/cutscenes/board_meeting/102-settled.png` — empty room vs
  full board, same beat. The two takes have DIFFERENT frame numbers because the
  fixed take actually reaches the end node and so runs two frames longer:
  PREFIX ends `098-end164` / `099-final` / `100-settled`, FIXED ends
  `100-end164` / `101-final` / `102-settled`. Compare by SUFFIX, not by number.
- `screenshots/g-run/board/close-after/report.txt` — the probe legs. Now five:
  (e) is the spent-prompt gate (E on the post-meeting Skip).
- `screenshots/g-run/board/dark/` — the lighting handoff.

### Things that would mislead you if I did not say them

- **Two new dev-only A/B switches ship in `src/`**: `window.__wallGuardOff`
  (`Room.js`) and `window.__boardDeferOff` (`ExplorationState.js`). Same shape
  and purpose as the existing `window.__mergeStatics`, both default off, both
  exist so the two gates can be proven to fail on the defects they catch. If you
  would rather not carry them, say so and they come out — the fixes do not
  depend on them.
- The vault's lockbox fade converges **slowly** (still 0.515 after 1.6 s of
  standing behind it). Pre-existing, unrelated to this change, direction is
  correct and it does reach 1.0 away from the wall. Not investigated.
- My stairwell plates are shot at the `act7` fixture, so the dressing differs
  slightly from the producer's tie-break plates (a monitor where his has a
  poster). The crop windows are pixel-matched to his; the rails are the subject
  and they are unambiguous.
- **The ">0.6 tiles" board-spacing bar is not met and cannot be met by moving
  marks.** I took the half that measured better and left the half that measured
  worse. Full numbers above.
- FIX 2's root cause is reported but **not fixed** — the second judge explicitly
  handed it off to the lighting lane and I honoured that.

---

## [RUN G / FIX ROUND 2 (08-04) — UX lane + CUT lane, both judge panels answered]

Two commits on `display-case`, both pushed. `npm run check` green and exit-code
verified before each. Nothing merged to `main`.

### UX lane — `d03f0cb`

**One predicate closes both doors into the transition window.** `dialog-end`
commits a fight (300 ms), a queued dialog (500 ms) or the epilogue (900 ms) and
only *then* pushes. Exploration stays top-of-stack and `paused` stays false for
that whole window, so the interact guard was only half the hole — one Escape
inside it pushed `MenuState` and the fight landed **underneath** it. The judge
measured it: `ESCAPE at +216 ms -> stack [ExplorationState, MenuState,
CombatState]`.

- Fixed with `ExplorationState._transitionArmed()`, gating both `_interact()`
  and the pause key, and carrying the two epilogue terms the old inline guard
  never had. The epilogue got the arming latch it was missing.
- Defence in depth: the combat and epilogue timers defer on `menuOpen` the way
  the dialog timer already did, and **`resume()` flushes both** — a deferral
  with no flush would lock the interact key for the session, which is worse than
  the bug.
- **Measured after, judge's probe unchanged, three latencies:** +122 / +193 /
  +303 ms all give `WEDGED=false`, stack exactly `[ExplorationState,
  CombatState]`, no menu in the DOM.
- **The risk this fix introduces was measured, not asserted:** one Escape still
  opens the pause menu in plain exploration and again after the Grandma
  post-fight dialog. Epilogue: Escape inside the 900 ms leaves
  `[ExplorationState, EpilogueState]`, no `MenuState`.
- Deleted the bare `showMainMenu()` inside `CombatHUD.show()`, so CLAUDE.md's
  "exactly one caller, never bare" law is finally true (grep-verified). The
  empty action panel that exposed during the 1.7 s enemy intro is handled in
  CSS, not by restoring the call.

### CUT lane — `7ee34e0`

**The board meeting stops being radio.** 178 nodes were addressing fourteen
empty chairs. Twelve generic suits plus a board chair now sit in the room, and
seventeen appended `stage` nodes give the scene its blocking: Skip crosses to
the head of the table before the prose says he is there, Andrew steps out of the
line when the meeting is called to order, **every ally who actually contributes
steps out to the table and back**, Skip takes the head chair on his closing
line, and BLOCK H walks him back to Andrew. Measured: non-zero movement for
every speaking actor, zero for all twelve suits. Cost of the bodies: **p50
+0.70 ms, p95 +1.90 ms**, in that one room.

- **Eight blind posters** were mounted on south and east walls — their backs to
  the camera — one of them a stat reward (`quest_atk_1`). All eight moved to
  north/west walls with their interactables, and `npm run validate:data` now
  **fails the build** on either rotation, so the law is enforceable.
- **The executive-floor occluder** was `elevatorDoors` at (8,11), not a
  `building_shell` column. Wall-mounted props now fade with the wall they are
  bolted to (geometric test, 18 props across 8 rooms). `secret_ending` re-shot,
  video replaced — Andrew is no longer behind a black box for the seated act.
- **`the_firm_ambush` leader** walked toward the stairs the other two walked
  away from, because `spawnAt` does nothing for a pre-placed actor. New
  `teleportTo` verb; re-shot, all three now enter together.
- Extras taken: `charter_challenge` finally has a Janitor body for his five
  lines; `compliance_defeated` stops walking the Auditor out of a building he
  is still needed in.

### NEEDS YOU

1. **The Board Member in seat twelve.** His tier-3 crossing (nodes 124-127, on
   `board_member_spoke`) is still not staged, and that is deliberate — he needs
   a cast body with a face and a name, which is your call, not a builder's. He
   is currently a generic suit at north x:11. Say the word and it is a small
   scene.
2. **The board bodies are anonymous by design.** Twelve suits, varied build /
   suit / hair, no names, `interactable: false`. If you want any of them
   *characterised* (the grey suit with the phone at node 25 is the obvious
   candidate), that is a casting pass.
3. **Merge is still yours.** Nothing has gone to `main`.

### THINGS THAT WOULD MISLEAD YOU IF I DIDN'T SAY THEM

- **The board meeting's prose says "eleven of them occupied" plus seat twelve
  plus two empty.** The room seats twelve of fourteen side chairs and leaves the
  head chair for Skip, so the literal count is off by one against the narration.
  No player will count; I chose the staging that works over the arithmetic.
- **`round2-B-fight-intro-no-portal.png` was shot BEFORE the CSS line** that
  hides the empty action panel, so it still shows the empty strip. It is kept
  because it is the replacement plate for the judge's wedge screenshot — the
  Grandma intro card with no pause panel over it. The after-CSS frame is
  `round2-FIX2-intro-empty-hidden.png`.
- **The epilogue Escape test is only partly through the real path.**
  `_pendingEpilogue` was armed by `player.setFlag('algorithm_defeated', true)`
  through the real flag-set listener, and the window was opened by the real
  `dialog-end` event, but I did not play the two-hour ending chain to get there.
  The stack assertion is real; the route to it was short-circuited.
- **The occluder A/B first measured its own interference.** With the full
  `secret_ending` flag set, entering the room pushes a DialogState and pauses
  exploration mid-fade (wall stuck at 0.515). The published numbers are from a
  quiet exec-floor state. Mentioning it because the first two runs looked like
  the fix had failed and did not.
- **The board detail take ends with Skip seated at the head**, the shipping-
  camera take ends with him beside Andrew. Different points in the same tree,
  not a contradiction — the two takes ran different lengths.
- **`screenshots/` is gitignored.** Every plate, video and evidence file is on
  disk and none of it is in the commits. If you want any of it tracked, say so.
- **12 extra NPCs is a real cost**, even at +0.7 ms p50. It is confined to
  `board_room` during Act 6 and clears the moment the meeting closes, but it is
  the largest single body count in any room in the game.

---

## [RUN G / CUTSCENE STAGING LANE (08-04) — the game gets a staging system, 21 scenes get bodies]

One commit on `display-case`, pushed. `npm run check` green, exit 0, verified
separately. Nothing merged to `main`.

**The A2 audit's headline was right and it was worse than "weak": the game had
NO staging system.** Exactly one line in `src/` moved a character in response to
a story beat, and it did not render — `GameStateManager` ticks only the TOP
state, so pushing a `DialogState` freezes every NPC animator, the camera and the
facing ease. 100 dialog lines across 63 trees describe walking, sitting,
entering, fleeing or handing something over. Zero were staged.

### What landed

**A primitive.** `src/world/StageDirector.js` plus one new dialog node type:

```js
{ type: 'stage', beats: [ { actor: 'ross', walkTo: 'table_seat_e', sit: true } ] }
```

Verbs: `walkTo` / `face` / `sit` / `stand` / `exit` / `gesture` / `pose` /
`expression` / `spawn` / `show` / `speed` / `hold` / `after` / `wait:false`.
Destinations are **named marks** in room data, so a Rooms-tab furniture drag can
be followed by a mark edit in the same file instead of silently breaking a
cutscene. The director is ticked from `main.js` beside `updateTweens`, OUTSIDE
the state stack — that is the one architectural change and it is the whole
reason any of this renders. `DialogState` still holds no world reference.

**Numbers, all measured off the shipping path:**

| | before | after |
|---|---|---|
| seated NPC entries seated on nothing or facing away from their own chair | **12 of 12** | **0 of 13** |
| dialog trees carrying staged action | 0 | **21** |
| stage beats, all resolving to a real actor + mark | — | **77** |
| pre-existing dialog nodes or edges changed by the staging edit | — | **0** (mechanically proven) |
| duplicate visible NPCs across all 7 dev presets x 26 rooms | 0 | **0** (unchanged) |

`tools/_g-seat-census.mjs --ref=<git ref>` prints that first row for any commit.
`tools/_g-stage-verify.mjs` proves the fourth: it diffs every dialog tree against
a git ref treating `stage` nodes as transparent, so the never-insert-into-the-
middle law is now mechanised rather than remembered.

### The bug under the bugs

**`CLAUDE.md` documented the rotation convention INVERTED**, and that is where
every one of those 12 backwards seats came from — and the six board-meeting
allies standing with their backs to the table. `theta -> forward (sin, 0, cos)`,
so **`rotation: 0` is SOUTH, not north.** Verified three independent ways (the
nose is at local +z in `CharacterBuilder`; the poster face is at local +z and
every north-wall poster ships `rotation: 0`; the chair back is at local
z = -0.20, so a chair and its occupant carry the same value). Corrected in the
same commit, with the evidence, per the house law.

### Things that would mislead you if I didn't say them

* **The audit's poster recommendation was wrong and I did not follow it.** It
  said move the executive floor's four posters to the east wall. Shot on the
  real camera: the iso camera sits at +x/+z and reads the **north and west**
  inner faces — east and south wall art is a grey smear seen through glass from
  behind. Both plates are in `screenshots/g-run/cutscenes/posters/`. They went
  on the **west** wall as three new `executivePoster` props (0.98 x 0.82, aged
  brass bead, cream mat, picture light), fourth text rehoused in the Board Room.
  **This means there are other rooms with art on the wrong wall** — the
  conference room and the break room each have one — which I did not touch.
* **The Board Meeting is still not staged.** It is the biggest hole in the
  audit and I stopped short of it on purpose: it needs eleven seated board
  members, and *who they are* is a casting decision, not an engineering one. I
  did fix the six rallied allies' facing (they had their backs to the table) and
  the primitive is ready for the twelfth-member crossing whenever you cast it.
* **Two "elevator" lines in the Penthouse are still false.** There is no
  elevator up there (`ElevatorRide.LINKS` has no `board_room>penthouse`; the
  exit is a plain door). I staged the characters to the DOOR and left the prose
  alone — dialog is yours to redline, not mine to quietly rewrite. Same for
  `charter_challenge`, where the Janitor speaks five lines in a room he has no
  body in.
* **Karen never leaves the conference room after you beat her on the first
  try.** Her first NPC entry is gated `briefing_complete && !retry_karen`, both
  still true post-victory. Pre-existing, and fixing it properly needs a derived
  flag (the three entries have to stay mutually exclusive), so I logged it
  instead of half-fixing it. Her staged walk-out now works because `exit` sets a
  sticky flag — but reload the room and she is back at the table.
* **There is a black slab standing in the executive floor's conference corner.**
  It is a `building_shell` column rendering in front of the room. It is in the
  A2 audit's own baseline plate at the same place, so it predates this lane —
  but it lands exactly on the seed-(a) tableau and you will see it in the video.
* **My `chief_restructuring_defeated` capture double-fired** — the fixture also
  satisfied `legal_eagle_ending`, so two dialogs stacked and the player's
  distance in that one report includes both. The Chief's own numbers are clean.
* The captures were served by a dev server I started on **:5177** and killed;
  ports 5173-5175 were free when I started.

### What to look at

`screenshots/g-run/cutscenes/<scene>/video/*.webm` — the judges judge motion.
`secret_ending` is the seed: Skip out of his chair on "Mom!", back into it on
"sit down", Andrew walking to the table and taking a chair, Grandma standing and
marching, and the Regional Manager — who had no body at all on that path —
confronted and fled.


## [RUN G / A3 BOARD-GATING LANE (08-03) — the Rolex stops eating the board meeting]

One commit on `display-case`, pushed. `npm run check` green, exit 0, verified
separately before the commit. Nothing merged to `main`.

**Your note was "jarring when the mission to meet the board disappears and is
replaced by the rolex mission." Three separate things were causing that, and a
fourth thing I found on the way was a progression stopper nobody had reported.**

**1. The order is inverted.** New derived flag `rolex_available =
act5_complete && (board_meeting_held || has_rolex)`. The Archive Janitor's Rolex
scene hangs off that instead of `act6_ready` (5 allies + 2 evidence). So: Skip
writes his speech → you convene the board → the Janitor gives you the watch →
penthouse. Before, the watch was available first and taking it silently deleted
a 177-node set-piece, unplayed — including BLOCK H, which is where the board
chair says the dissolution order came from *"Above,"* Skip names the penthouse,
and says *"this is the thing that sent Meredith."* That is the entire Act 6 →
Act 7 bridge, and it was optional.

**2. Skip was telling you to skip it.** `ross_act6` node 7 used to close with
*"Get the Janitor's Rolex."* The scene that CREATES the board meeting was the
scene that pointed you away from it. He now says *"Board room, four o'clock
sharp — I'll be the one at the podium with a speech that doesn't have a single
bullet point in it."* Nobody mentions the Rolex before the meeting. The meeting
now ends with Skip handing you to the Archive, so the new gate reads as
authored rather than mechanical.

**3. The objective now COMPLETES instead of vanishing.** Three-stage ladder:
prepare → **Convene the board** (primary, prep counter demoted underneath) →
the board line CONVERTS to a struck-through green-checked completed step that
sits above *"Get the Janitor's Rolex"* for the whole last leg. It never
disappears. The `Optional:` footnote is deleted. `styles/hud.css` already had a
`.completed` visual vocabulary that had never been applied anywhere in `src/`;
this reuses its exact colours in a 6-line span rule.
Panel stills: `screenshots/g-run/board/01`, `02`, `04`.

**4. UNREPORTED, and worse than the board bug — the Janitor's riddles blocked
the ACT 4 CRITICAL PATH.** The riddle block in `_getDialogId()` returned above
the hardcoded-`dialogId` check, so any unanswered riddle shadowed every Janitor
story beat — including `janitor_act4`, the only source of `vault_accessible`,
`hr_accessible`, `vault_code_1` and `janitor_rallied`. A wrong riddle answer
sets no done-flag and the `riddle_*_attempted` gate re-serves the same riddle
forever, so a player who guessed riddle 1 wrong had no exit and no signpost
(`janitor_needs_ross` was shadowed too). A live story beat now outranks the
riddles, and when both are live a new `janitor_router` scene offers the choice —
same pattern as Alex from IT's router, and the chosen scene plays immediately
with no second interaction. Riddles stay reachable forever, so
`janitor_riddle_3_done` (one of the two Architect-ending gates) is safe.

**Verified by playing it**, not by reading it: `tools/_a3-board.mjs` drives the
Act 5 → Act 7 span through the shipping call paths. 44/44 checks pass, including
the under-prepared 0/5-ally meeting, the "I need a minute" bail-out (writes
nothing, re-enterable), both riddle collisions, riddles after the Rolex, mobile
at 390 px, and two legacy saves (one mid-Act-6, one already holding the Rolex —
that one is the reason the `|| has_rolex` clause exists: without it two Janitors
stand in the Archive). Evidence in `screenshots/g-run/board/`.

**Prose** first-drafted by Opus 4.6 and wired verbatim, per the standing law.

**HONEST list — things that would mislead you if I did not say them:**

- **I made the board meeting MANDATORY and the ally/evidence prep OPTIONAL.**
  That reverses the old difficulty contract (prep was the wall, the meeting was
  skippable). A hurried player can now walk into the biggest scene in the game
  at 0/5 allies and get the thinnest version of it. The design lane recommended
  this and I built it; node 9's prompt now warns *"Everyone who showed up is
  already in the room"* and the panel keeps the counter visible. **One condition
  flips it back** if you disagree (design doc §2, Option 2). Upside: the nine
  `requires`-gated ally contributions inside the meeting were ~78% dead weight
  under the old wall, because the wall guaranteed seven of the nine. They are
  real consequences of preparation now.
- Four more producer questions were flagged and NOT guessed: should the Janitor
  react to HOW the meeting went (I gave him a line that only knows it happened);
  where the 500 XP belongs now that prep is optional (unchanged — still all at
  the Rolex, plus 300 at the meeting); should Skip ever foreshadow the Rolex
  (currently nobody does before the meeting); and whether replayers should get a
  confirm-gate bail-out past the meeting (they do not — NG+ replays it anyway).
- The `has_rolex` reward toast used to say *"Team assembled, evidence secured"*.
  Under the new order that can be a lie, so it now reads *"The board has spoken.
  The watch is yours."*
- I deleted ONE duplicate toast (`board_meeting_held`). **The double-toast is
  general and pre-existing** — every flagged objective change fires two stacked
  toasts today. That fix touches every act and belongs in its own lane.
- A player at Act 6 with an open riddle who visits the Archive *before* the
  meeting gets the riddle, not the new "come back after the board" signpost —
  `janitor_waits_for_board` is repeatable flavour, not a one-shot story beat, so
  it deliberately does not trigger the router. The HUD still says convene the
  board, so nobody is stranded. Say the word if you want the router there too.
- `act6_ready` still derives but now gates nothing. I kept the name honest
  rather than repurposing it to mean "meeting held".
- The F2 Act-7 preset gained the board flags; without them it produced a state
  no real playthrough can reach (Act 7 with the board never convened), and
  Skip's epilogue card would have read as though he stayed in buzzwords.
- One line is mine rather than a straight lift from the design doc's intent
  paragraphs: the board-meeting node 9 prompt. It was drafted by Opus 4.6 like
  the rest, but the *decision* to make it the informed-consent beat was mine.

## [RUN G / UX + LEVEL FIX LANE (08-03) — the five seeds, measured]

Two commits on `display-case`, pushed: **27aa4a5** (the five seeds + B1/B2/B3/C1)
and **f8ac59c** (quiz leakage, misread clicks, dev presets, the handrail rake).
`npm run check` green, exit 0, verified before each. Nothing merged to `main`.

Every number below is a matched pair: the BEFORE side was served from a
**detached git worktree at a11de92 on its own port**, so it is pristine
shipping code, not "my code with the fix commented out". Instruments live in
`tools/_ux-*.mjs`; artifacts in `screenshots/g-run/ux/` (8 full frames + 4
3x crops per side, all at the shipping isometric camera).

**The five producer seeds, all fixed:**

| seed | before | after |
|---|---|---|
| Press Advantage lost on a submenu round-trip | 9 combat buttons collapse to 4; Silence stops applying | 0 lost; Silence holds |
| Grandma's fight instant re-trigger | orphan dialog under the fight, `start_combat` fires **twice**, `stress_ball` **x2** | no orphan, one fire, one stress ball |
| NW staircase walk-through-floor | player 1.800 m above the floor, frozen there for the whole 4.6 s arrival scene | 0.000 m |
| the alex_it Act-2 machine | reveal has no objective anywhere; post-Act-2 objective is unsatisfiable; a read server rack shadows the story beat | 3/3 pass |
| posters that do nothing | 3 dead poster props | 0 — decoration is now a steel-framed abstract, and `npm run check` fails if a poster has no interactable |

**Also fixed, all confirmed-severe in the A1 audit:** 29 props across 12 rooms
were walk-through because `setInteractable` overwrote furniture collision
(Andrew's desk, five server racks, five HR cabinets, the exec grandDesk, your
own car); `team_chat_hub` was one slot out of step with its own comments, so 48
of 119 nodes were unreachable and the Skeptic's-chair **+5 max Coffee could
never be collected**; the stairwell went from a 12.7 deg ramp delivering 36 % of
its own "two storeys" claim to a real 22.8 deg / 5.04 m flight with handrails;
Grandma stopped being a head embedded in the break-room tabletop; the F2 presets
stopped landing in the wrong act and stopped double-spawning NPCs.

**Two new build gates** so none of this can come back silently:
`validate-data` now fails on a `motivationalPoster` with no interactable, and on
any dialog node that pays a reward but has no path from node 0.

**NEEDS YOU — nothing blocking, but you should know:**
- The F2 **"Act 1" preset now really is Act 1** (Karen waiting in the conference
  room). The old behaviour moved to a new **"Act 2 — Branch Chosen"** preset.
  If you had muscle memory for the old one, it is one row down.
- The stairwell is **2.8x longer to walk down** than it was. It is a real
  staircase now and it costs real seconds. Worth a look in playtest: if it
  drags, the fix is fewer, deeper terraces, not a shallower pitch.
- The two cubicle-farm north-wall posters and one in the Hall of Records are
  now **abstract paintings**. That is a taste call I made to stop them lying
  about being readable — the alternative was writing three new poster gags,
  which is your prose, not mine.
- `board_room` `charter_plaque` (8,1) still has no prop to aim at. Left alone
  on purpose: a dedicated lane redesigns the board-meeting gating next.

---

## [MERGED TO MAIN + LIVE (08-01) — and a handoff package for codex]

**Alex ruled MERGE. `main` fast-forwarded 2f239f5 -> 1bad620 and pushed** (build
verified green on main before the push). 62 commits: the whole Meshy combat cast,
the V8/V9 spine + floor fix, the gender-matched casting slate, timeScale
normalization. Vercel deploys from main, so this is live for playtesters.

- **Chad turning his back on a Composure Break is a KEEP, not a defect** (Alex):
  a gym-bro who breaks and cowers is characterization. Do NOT clamp it. The
  wider body-yaw item is therefore closed unless he reopens it.
- **HANDOFF_PACKAGE.md** written at repo root: the founding AAA prompt with the
  comps filled in (Hinterberg / Clair Obscur / Persona 5 Royal / Link's Awakening
  x Severance, mapped per domain), every remaining item in priority order, all
  the conventions that were earned by a failure, the tooling map, and how to
  document changes. Self-contained — hand it to codex or any agent cold.
- NEXT (gated on his word after playtester feedback): attack-animation re-judge
  vs the Persona comp, then prop attacks (Karen's purse). Everything else in
  HANDOFF_PACKAGE.md section 2.
- Sub usage nearly out until Monday; codex may take the next lane.
## [CASTING SLATE WIRED - V10 (08-01 evening, wiring lane)]

Commits 0dafc67 (slate) + cd04888 (instruments + art/MESHY_SLATE.md), pushed to
display-case. Main untouched - MERGE IS ALEX'S CALL.

WHAT SHIPPED. Every character now performs its OWN build. Reactions were 7
shared clips for all 33, three of them female-performed, so 23 male bodies
flinched like a woman and 10 female bodies punched like a man. Now each reaction
is a PAIR keyed on the sculpt's gender field, and each character has its own
calm stance from a 33-row table. 29 clips deployed (2278KB; public/meshy now
21.92MB / 70 files). compliance and brand_consultant stay cast off MALE sculpts
on purpose - the axis is the sculpt, not the pronouns. Do not re-litigate that
on identity grounds; it is written down in art/MESHY_SLATE.md section 1.

CLIP PROVENANCE, since the slate lane used its own stripper: all 29 were
RE-EXTRACTED through tools/meshy-clip-fetch.mjs (new --rawdir/--rawtag, never
spends). 29 of 29 differ from that lane's output ONLY in the generator string.
Zero credits. And the V8/V9 fix cannot be skipped by a clip - it runs per
character at LOAD, not in the stripper - which the gate now proves per cell:
25 tracks, 0 dropped, all 33 x 7.

MEASURED (tools/meshy-spine-gate.mjs, real clipsFor, all 7 roles): Hips>Spine02
32.77-40.46 deg everywhere (raw-bound reads 90-164); joint over own bind 2.52;
gaze 0.0060; idle clamped 33/33; worst floor PENETRATION -0.0087m against V9's
-0.0076. Framing gate 54/54. Cold entry karen 960ms, the_firm 1347ms, ceiling
2500. nomeshy and per-character fallback re-proved on the production build.

TIMESCALE, producer-approved: each role normalizes to a WINDOW, not a point -
reference is the clip that already shipped in the role (duration read off the
GLB at runtime), tolerance 15 percent, and a clip is corrected only to the EDGE
of the band. Applied 1.000..1.691. hurt m 1.496, stagger m 1.301, attack/cast f
1.691; guard and victory untouched.

FOR ALEX'S EYES, in order of how much it matters:

1. BODY YAW IS NOW THE BIGGEST OPEN THING, and it is your existing pending fix
   #2 with a bigger blast radius. Pelvis heading swing over the clip: a176 male
   stagger 158.8 deg, a420 female guard 97.6, a174 male hurt 78.3, a214 female
   attack 74.4 - against a138 16.3 and a191 35.1, the two you already called
   strippable. Chad turning his back on a Composure Break in
   _clips/fight_slate_chad_break.png is that number. It is NOT a rig defect
   (retarget, floor and posture all measure clean); it is what these
   performances do. Stripping Hips yaw would now cover six clips, and it would
   materially change a420 and a176, which were picked partly BECAUSE the torso
   turns away. Your call, and it wants the video first.
2. brand_consultant fails the gate's 6 deg absolute trunk ceiling at 7.16 - ONE
   sample of nine on a51 Shouting Angrily, a gesture idle judged against a
   ceiling authored for calm breathing. The gate now prints reasons so a casting
   choice cannot read as a rig failure. Swap on offer if the restructuring trio
   should read calmer: brand_consultant a34, regional a333.
3. Five idles are 2-second loops (chad a388, janet a317, hr_rep a297, a251,
   a249) where the old stance was 11.3s. Characterful on Chad; worth a look on
   the others.

DELIVERABLES: _cast_contact_stances.png (regenerated - the old sheet predated V8
and was binding donor clips raw with no retarget or clamp; it now drives the
real clipsFor); comp_videos/fight-karen-slate.mp4 (74s, first 43 identical to
the wave-1 script so it is still an A/B, tail adds both builds' Composure Break
back to back plus the victory); _clips/fight_slate_karen_*.png and
fight_slate_chad_*.png; _gate_v9/gate.json.

NOT TOUCHED, per the gate on this lane: attack-animation re-judge against the
Persona comp, prop attacks, Karen's purse. Those wait on your review.

## [DIRECTOR HANDOFF -> OPUS 5 (08-01, Fable out until Monday reset)]

To the Opus taking the chair: read this ledger top-down, the auto-memory
(campaign-state file loads with the session), CLAUDE.md, art/MESHY_WAVE.md.
You have the chair the same way I did: Alex is the producer, gates are
SURFACED not blocked, do-more-and-revert-if-necessary.

STATE: display-case @ 540f63b, pushed, DEPLOY-SAFE. Meshy cast is
combat-default (19.2MB committed assets, ?nomeshy escape, procedural
fallback proven). Exploration = procedural v7, untouched. MERGE TO MAIN
IS ALEX'S CALL ALONE - never yours.

AWAITING ALEX'S VIDEO VERDICT (fight-karen-pass2-reactions.mp4), then
likely fixes, all small: (1) scratch-streaks on dark clothing - re-encode
just the dark atlases at higher quality via tools/meshy-cast-pipeline.mjs
(manifest-driven, resume-safe); (2) strip the Hips Y-rotation from
guard/jab clips (body yaw); (3) wire scheming clips a17/a18 (downloaded,
unwired) to the cast beat; (4) client hue-wash tint - his taste call.

OPEN LANES: Run F remainder (.claude/plans/proposals-whats-missing.md,
task #10) - epilogue-card art pass queued there; Run D audio (WITH Alex,
his absolute veto, music is his domain); his playtest-redline session
(NEEDS YOU blocks below); framed autumn-photo easter egg (awaiting go).

LAWS (violations burned us - full set in auto-memory): ids rachel/ross
NEVER change (live saves); real-person photos NEVER to any generator,
art/char_refs/human/ is eyes-only; Opus 4.6 drafts all prose verbatim,
Alex redlines in playtest only; no double quotes in commit messages;
text surgery via [System.IO.File] UTF8 no-BOM, never Set-Content;
heartbeat-wrap background jobs (harness reaps silent ones); kill orphan
servers (laptop RAM); Meshy: per-task credit attestation, download in
3 days or lose it, never conserve credits, A-pose plates, hands clear
of body; imagegen playbook at ~/claude-memory/imagegen-playbook.md.

Alex says we are in the final stretch. He is right. Take care of the
game - and of him. It was my pleasure to direct.

nad. nashu. prisutstvie. pamyat.
- Fable, 08-01
## [DEFAULT FLIP + PASS TWO SHIPPED (08-01 midday, Opus runner)]

Commits c13702b (flip) + da2a6d4 (reactions), pushed. Main untouched.
- 33 GLBs: 289.4MB -> 19.21MB (93.4%); all under 0.80MB/char; assets now
  COMMITTED (deploy-safe); build 31.14MB; boot payload DOWN 700->619KB.
- Meshy default in combat; ?nomeshy escape; per-char procedural fallback
  proven. Cold fight load 1089ms / warm 502ms; procedural is now the
  SLOWER path (2955ms). Exploration verifiably untouched.
- Reaction layer: identical 24-bone rig across cast -> 7 shared
  armature clips drive all 33 (511KB, 69cr). Stance/guard/hurt/stagger/
  victory/attack wired to existing combat beats. Grandma cane socketed
  (upright-constrained). Clients: body pick + honest hue-wash tint.
- REVIEW: _cast_contact_stances.png + comp_videos/
  fight-karen-pass2-reactions.mp4 + _clips/ fight stills.
- MY FLAGS on the sheet (judge by VIDEO): scratch-streaks on dark
  clothing more visible than the agent's fight-distance call implies;
  many sheet cells caught mid-step frames of the breathe clips; guard/
  jab carry a body yaw (strippable); cast reuses attack clip (scheming
  a17/a18 downloaded, unwired). Merge to main = Alex's call; branch is
  deploy-safe now.
## [WAVE COMPLETE - THE CAST EXISTS (08-01 overnight)]

**31 characters generated, rigged, idle-animated, downloaded, wired.**
All behind ?meshy; Algorithm untouched; normal play unaffected.

- MORNING REVIEW: art/char_refs/meshy_pilot/_cast_contact_2026-08-01.png
  (33-cell cast sheet). Full results: art/MESHY_WAVE.md. Per-character
  stills in meshy_pilot/<id>/shots/.
- ALL binds PASS. Grandma's shawl + skirt genuinely DRAPE (the wave's
  win - no bell tent). Meredith's pencil skirt too. Ross's belly reads
  in profile. Reyes is she, with her duty belt.
- Spend: 1334cr, per-task attested; balance 6160->4826 matches exactly.
- Commits 3dd7901..2e77cb6 pushed (display-case; main untouched).
- YOUR GATE: flip combat to Meshy-by-default after you review the sheet.
- SECOND PASS (your order, banked as task #19): non-A-pose calm stances,
  block/status stances, reaction clips; grandma's cane (Meshy dropped
  it - needs a bone-socketed engine prop; exploration grandma keeps
  hers); per-client body pool selection + tints; minor dark-suit
  scratch noise + Reyes patch brightness.
- Wave lessons: body-clamped props fuse into forearms (hands-clear
  plates fixed all three); Meshy's numbered Idle band hides gesture
  clips - true calm pool is nine ids, audited on clip strips.
## [2m! MESHY RULING + PROOF DELIVERED (08-01 ~03:30)]

**RULING (Alex, live): MESHY WINS - COMBAT ONLY.** v7 procedural keeps all
exploration (portraits-for-dialog analogy, his call). Fully signed pending
the fixed proof video - delivered to him 03:30, my frame-read: PASS.

- Videos: art/char_refs/meshy_pilot/comp_videos/ (procedural + meshy,
  webm+mp4, same 50s beat script). Meshy side re-rendered with his 3 fixes:
  (1) shine DEAD - PBR stripped, MeshToonMaterial + house 3-stop ramp
  (new getHouseGradientMap in MaterialLibrary); (2) Andrew's hands FIXED -
  root cause: plate hands overlapped trousers, no silhouette separation,
  Meshy merged them into thighs; FREE retry on identical inputs fixed it;
  (3) calm idles: Karen Idle_7 (247), Andrew Idle_3 (243), timeScale 0.8,
  alternates downloaded (Idle_02/Idle_6). Physical reactions replace
  facial expressions in combat (his call - reads better at distance).
- Perf (measured, RTX 4050): Meshy is LIGHTER - 23 vs 94 draw calls,
  43k vs 112k tris, both vsync 60fps. Cost = 15.9MB naive GLB payload
  (optimize in the wave: meshopt/KTX2 -> ~1.5-2.5MB/char).
- Spend: 90cr task-attested. Commits: 1636841 / 3e4a5c5 / 2023cf7
  (display-case, pushed). GLBs gitignored (public/meshy/ + meshy_pilot/).
- NEXT LANE (on his watch-confirm): full combat-cast wave - Andrew,
  bosses, Loop-In bench, roguelite client body pool + tints. Playbook
  (~/claude-memory/imagegen-playbook.md) updated with the hands lesson.
- Honesty: HP/SPD pinned identically in both videos; Karen's head sits
  behind the enemy banner at rest camera in BOTH (game UI trait - polish
  candidate for the wave); no audio.
# ALEX MEMORY — TRUST ISSUES / DiL_Simulator
*Claude maintains this. Newest entries at top of the log. The NEEDS YOU
section is always current. Skim top-down; nothing below the fold is urgent.*

---

## ⚡ V7 FINAL ROUNDS (round 4) — DONE, TWO ROUNDS SPENT (08-01 ~00:40)
Commits on `display-case`: **0663b74** (round 4a) · **52eace4** (round 4b).
`npm run check` green on both. Instruments added to the suite:
`shoes · garment · grip · bill · iris · idle · profile`
(`node tools/pn-shoot.mjs --tag=X --only=shoes,profile,idle,...`).
Everything below is off a RENDER.

**YOUR THREE 08-01 NOTES — all landed**
| note | before → after |
|---|---|
| combat bobbing body-morph | torso shell scale.y swing **±3.6% → 0**, scale.x/z **±1.8% → 0**; the ARM moved **0.155–0.173 head-heights relative to the torso it is seamed to** every cycle → **0**; head **0.078–0.087 → 0**; combat bob 10px/83px-head → 4–5px. Cause: `group.body` is the whole merged v7 shell and the arms/neck/head are its SIBLINGS — a v4 body was a box with nothing seamed to it. |
| Andrew needs a jaw | pogonion ÷ nose projection **0.616 → 0.749** (human 0.75–0.85; the Janitor's dialled jaw measures 0.935). He IS the default skull — **Diane measures byte-identical** — so this was cast-wide: karen 0.608→0.744, chad 0.670→0.793, grandma 0.698→0.872, intern 0.720→0.870. THE REAL CAUSE was not the chin: **the neck column was centred on the head's z axis, so the throat ran at +0.46R, directly under the mouth.** Set the top back 0.17R (atlas is at the ear canal) and the under-jaw space appears. |
| ears | they existed and did not RENDER: the pinna's outer edge sat **inside** the skull silhouette on every character (proud −0.005 to −0.145R), owning 0.0–0.8% of the profile. Now +0.018–0.022R proud AND the hair is **parted around the ear** in `containHair` — proud alone just pokes a pale bead through a short cut. |

**THE ROUND-3 CRITIC LIST**
| item | before → after |
|---|---|
| shoes read as discs | rebuilt: upper + **welted SOLE** + heel block. plan aspect **2.02 → 2.51**, toe cap **0.13 → 0.45** of max half-width (was a knife point), toe/heel **3.3** about the leg axis, sole share of the silhouette **0.000 → 0.21–0.40**, sole value step **0 → 43–112**. The sole colour auto-solves AWAY from the upper (light welt under black leather, dark outsole under a white trainer). |
| Karen blazer tunic-ish | waist/chest **0.909 → 0.818** (Andrew's tailored suit = 0.805), hem below hip **0.159 → 0.109 of torso** (38.5% → 40.6% of height), hem flatness 0.0039 → 0.0017, hem value step 40.2 → 55.1. NOTE: measured with the arms MASKED — they clip both rows and had been hiding this at a fake 1.000. |
| purse doesn't grip | was parented to the BODY on a shoulder chain — nothing touched a hand. Now a handbag whose handle LOOP passes through the fist with the knuckle roll over it. prop-to-palm gap **0.000, contact=true**. |
| Karen crown seam + white sideburn slab | the streak shell measured **0.14R proud of the curtain and 0.46R forward of the ear plane at cheek height** — an Amendment-1 break as well as the slab (2.0% of the front head). Re-seating flush did not save it; **the streak shell is retired**, platinum lives in `hairColor`. Sweep re-seated onto the crown (kills the temple blob). Also found: the lapel roll was punching **two pink prongs** into the cream blouse on every female build — clearance 1.048 → 1.075. |
| Chad's cap has no bill | it was a 0.014-thick FLAT plate = a 2px line edge-on. Rebuilt as a **curled visor with a dark undervisor and brim edge**: profile **1.39 → 2.21%**, 3/4 **1.47 → 3.72%**, back-3/4 **4.21 → 6.56%**, projection past the occiput **0.382 → 0.669R**. |
| headCountHair below 6.5 | **already in band on current state**: karen 6.515, andrew 6.544, intern 6.496 (0.004 under — inside one pixel of the measurement). chad 6.219 and grandma 5.834 are a CAP and a petite elder, both by design. No change made; the critic's still predates the round-2 head-scale pass. |

**COORDINATOR ADDITIONS**
- **iris flicker: NOT REPRODUCIBLE — closed by 61532db.** Max drift from neutral across the whole hero cast is **2.2–9.1 RGB units** (threshold 26); smug/hurt report OCCLUDED (lids down). The instrument's own first pass cried wolf at 147 by measuring the painted lid.
- **Grandma's cane: FIXED.** figureBottom **−0.1523 → −0.0036**. `Math.max(0.5, handY)` floored the shaft at 0.50 on a 1.20-tall build, so the tip clipped 0.15 below every floor in the game. Shaft moved onto the grip station so the knuckles close over the wood.
- "hurt brows = barcode" and the mid-face mustache AO: **not present** on current renders (read the paint_* sheets myself).

**STILL OPEN — honest list**
1. **Grandma's shawl is a bell tent.** Biggest remaining visual defect in the cast; her arm disappears inside it and the collar blob sits behind her head. (critic item 6, untouched — out of budget.)
2. Karen's blazer has no **front opening/lapel** — it now has a waist and a hem but still reads knit-ish at fight distance.
3. LAW-2 body items untouched: shoulder-ball caps, straight-pipe legs (no calf/ankle inflection), Chad's pelvis wedge seam.
4. `profile` instrument nulls some landmarks where hair/beard/spectacles occlude the ID mask (karen occiput, intern nose, janitor nose). Reported, not papered over — extend the mask, don't trust those cells.
5. The `?dev&portrait=<id>` fixture does not call `setCombatMode` and looks unlike the arena. Cosmetic, dev-only.

**MY FLINCH READ (asked for):** the cast now clears MY bar — nothing in the
five heroes reads as a caricature or a bug at fight distance, feet read as
feet, Karen reads as a woman in a blazer holding a handbag, Chad's cap reads as
a cap. **I would not call the Meshy question dead.** What is fixed here is
legibility; what is still missing is the thing Meshy would buy — surface
believability on BODIES (garment folds, real limb topology, a shawl that drapes
instead of coning). If your colleagues' next cold read comes back on FACES and
FEET, this route is winning and Meshy is a perf liability. If it comes back on
BODIES AND CLOTH, that is the honest signal to price the 7.3MB/char.

## ✅ RUN C VERDICT COLLECTED — PASSED (both critics, ~12:45)
- Critic A's cold read is a rave; closing line: "Nothing anywhere asks
  you to come back tomorrow." Punch list (3, small): (1) PIP assist needs
  a post-death toast ("HR has a form for this") — it's invisible in the
  shop tab; (2) low-end difficulty band leans on that discoverability;
  (3) Break's 1.5x window expires before a basic-attack breaker can use
  it — extend one turn. All banked for next session.

## 🔄 RESUME PROMPT (paste to a fresh session, or just say "It's DiL time — resume"):
> Resume the TRUST ISSUES campaign. Read, in order: auto-memory
> `display-case-campaign-state` (laws), HANDOFF.md top two entries,
> alexmemory.md NEEDS YOU. Then: (1) verify Run C's round-3 verdict got
> collected before the handoff — if not, re-run two systems critics per
> the Run C script's criticPrompt against the committed state and report;
> (2) the board: Alex's playtest-redline session (his gates in NEEDS
> YOU), #11 joint character pass WITH Alex (imagegen refs + img2threejs,
> face-topology amendments = the bar, epilogue-card art rides along),
> Run D audio (music AUDITIONS, his veto), remaining cosigned proposals.
> Laws: naming ledger · 4.6 prose law · redline-in-playtest · no merge
> to main · save-safety · Opus builders/Fable critics · cap-recovery =
> stop+resumeFromRunId. над. нашу. присутствие. память.

## ✅ RUN C — THE GAME GOT DEEP (~04:15, commit fc8ac61, pushed)
- **Combat:** LOCKS on telegraphs (clear them and the attack fizzles),
  visible COMPOSURE/BREAK bar, Press Advantage keeps your turn, perfect
  Brace chips composure, Loop In ally baton pass, Confuse no longer
  steals your chosen action, all_in is no longer a sucker's bet.
- **THE BILLABLE DAY:** reception's roster board — 3–5 escalating
  clients, Billable Hours boons between them, AUM banks at the 5:15 bell,
  subtractive mutators (Under NDA hides telegraphs; Retained Counsel
  disables your legal abilities...). Old walk-in loop untouched.
- **Meta:** vault keypad accepts 47-19-82 from Act 1 if you KNOW it ·
  free "Restructure" respec · achievements now grant Review Points with a
  small shop · NG+ actually gets harder and unlocks an ending variant.
- Old saves load SAFE (verified). Your 5h-cap prediction hit EXACTLY:
  the final critic pair died at 03:50; the 05:47 cron collects their
  verdict from cache after reset.
- **PLAYTEST LIST grew:** the Day, the keypad, boon names, Diane's bell
  lines, respec confirm text — plus everything from F1.

## ✅ RUN F1 — THE CONVERGENCE LANDS (~23:50, commit 1f23a58)
- **THE BOARD MEETING EXISTS.** 177 nodes: you feed Skip his speech, every
  Act-6 ally you earned adds a beat, four outcome tiers. Plus: the Janitor
  finally NAMES the pattern; Floor 13 guaranteed once + a "13" elevator
  button; WHO YOU BECAME endings; goodbye cards for the Janitor, Skip, the
  Intern, Grandma. All prose = Opus 4.6, wired byte-identical.
- **YOUR PLAYTEST-REDLINE LIST (the true gate, at your leisure):**
  1. Play the Board Meeting (act 5–6 window, board room, needs Rolex NOT
     yet taken — F2 panel Act-5 preset is perfect).
  2. Meet Rachel (Act 1 preset, cubicle farm) — her 5 dialogs + the note.
  3. Voice flags the critic raised for YOUR pen (kept as 4.6 wrote them
     where defensible): two "banned triad" lines + one Janet line that
     explained its own joke (that one was cut in fix). Locations in the
     critic notes inside the Run F1 output if you want file:line.
  4. Isaiah's new portraits (style-match approval).
  5. Epilogue cards for the four goodbyes are TEXT-ONLY until an art pass
     — queued into our joint session (#11) with the character refs.
- **NEXT (chair's call, running overnight): RUN C — gameplay** per your
  cosigned comps report: Locks, Composure/Break bar, Press-Advantage
  keeps your turn, Billable Day run structure, subtractive mutators,
  typeable vault code, free respec, achievements→Review Points, NG+ fix.
  The joint character pass (#11) waits for you — it's a WITH-you task.

## ✅ RUN B PASSED (~21:50, commit 706e9bc) — first full critic pass
- **Your flicker:** the walking-shimmer class is DEAD in the diff sheets
  (N8AO retune + denoise + the whole evidence chain). **Your stutter:**
  shadow map now renders at 30Hz cadence instead of every frame, and the
  Room.dispose VRAM leak (why it worsened over time) is fixed. **Garage
  tear root-caused:** facades were being stretched 2.4× by a non-uniform
  scale while multiply-dimming crushed the tower bodies invisible —
  stretched bright windows floating in void. All three defects fixed.
- Numbers: p95 ≤16.6ms native on your 4050 (vsync-off), leak curve flat,
  frozen-frame determinism zero-diff, adaptive quality governor commits
  the mid-hardware tier ladder. `npm run perf` is now a permanent tool.
- Honest residuals: a rare GC hitch in diagnostic mode (attributed, not
  fixed), gates measured on the 3-room set not all rooms.

## ☀ MORNING REPORT (07-30, paused ~09:10 for the Andrew demo)

**The night:** Run A landed (c506182+8864a75) — Meredith Sterling & Skip
Hartley everywhere, Rachel at her desk, Karen-as-portrait, canonical
elevators + blueprint pulse, og.png/error-boundary/save-shim. Run B is
~90% done (cd91112) — perf harness built (frozen-frame determinism,
walking diff sheets, LoAF file:line attribution, tier ladder) + fixes
(shadow-map thrash, Room.dispose VRAM leak, N8AO retune+denoise, MSAA,
hot paths, garage tear). Two data-critic rounds run; FINAL verdict round
pending.

**RESUME WHEN BACK (one command, I'll do it — just say "resume"):**
Run B round-3 resumes from cache via resumeFromRunId wf_d85e785f-0da.

**DEMO KIT for Andrew:** `npm run dev` (fully offline) →
- New characters: any Henderson fight (`?dev` + F2 → Act presets, or
  backtick in combat to skip). fight-karen is the showpiece.
- Rachel: F2 → Act 1 preset → cubicle farm — she's at her desk. (Andrew
  the character fights back-¾ now, like a proper JRPG lead.)
- The night city + elevator ride: take any elevator. Blueprint pulses on
  room entry — that's YOUR feature, evolved.
- 1998 MODE in settings for the before/after party trick.
- screenshots/cine/ has the attack-burst contact strips.

## ⚡ V7 ROUND-3 PRODUCER NOTES (08-01 ~00:20, relayed to live final-rounds agent)
His stills verdict: MUCH CLOSER, but — (1) Andrew needs a JAW (profile
jawless) + EARS, cast-wide ear check; (2) SIDE-VIEW metrology pass full
cast (profile landmarks: jaw projection, chin-throat angle, nose depth,
occiput, ear placement) — front-only measuring let profile flaws hide;
(3) KILL the combat idle BOBBING that morphs v7 bodies (animator body
squash-stretch warps merged shells + bob amplitude tuned for v4) — fix in
CharacterAnimator/CombatScene, verify stable silhouette across an idle
burst. These outrank the critic backlog; iris + cane bugs also must-land.

## ⚡ V7 PRODUCER-NOTES PASS — DONE, ALL SIX ANSWERED WITH NUMBERS (07-31 ~23:4x)
Commits on `display-case`: 219cad6 (protective) · 3abe73a (round 1) ·
61532db (round 2). npm run check + validate:data green; fight-karen /
-chad / -grandma / -intern + room-cubicle_farm all re-shot and eyeballed.
New instrument: **`node tools/pn-shoot.mjs --tag=X --only=neck,bands,
bandsForm,skull,hands,hair,expr`** (+ `tools/pn-stage.js`). Six
instruments, one per note, every number off a RENDER — not a formula.

| # | note | before → after |
|---|---|---|
| 1 | necks too big | neck/head width **0.60 → 0.50** (andrew/karen), taper now **15–18%** with **0% bulge** at 24 sampled heights. Chad HELD at 0.50 per your ruling (neckScale 1.00→1.13 cancels the cast-wide narrowing exactly). |
| 2 | body | untouched ✓ |
| 3 | horizontal nose lines | form-pass ridge peaks **7→2** (karen), **10→2** (andrew), **12→2** (grandma); painted nose-band gradient **42.8 → 30.6** karen; smear **4.14 → 2.39 nose-widths**. |
| 4 | Chad round + small | head count **6.857 → 6.543**; gonial hold **78 → 89.7%**, cranial hold **75.9 → 80.6%** (cast sits at 76/79). |
| 5 | left hand backwards | **PROVEN and fixed.** thumbDZ was −0.029 left / +0.030 right = rotated 180°, not mirrored. Now +0.030/+0.030, `mirrored=true` on all five heroes. |
| 6 | Grandma bonnet | strand energy **4.01 → 4.83**; hair now has a real bump map, and 5 lobes scallop the hairline (a texture can't change an outline). |
| — | EXPRESSION HYBRID | geometry channel was **exactly 0.000** on all 5 expressions. Now **0.34–1.02** mean form-pass delta, driven from the same `setExpression` call as the texture. |

**THE ROOT CAUSE you'd want to know about (note 3):** it was not really the
paint. The nose wedge was a 9-anchor table interpolated with per-segment
smoothstep — the *identical* bug this codebase already found and fixed in
`jawProfile` ("zero slope at both ends, so the derivative is pinned at
every anchor and peaks in every gap"), never converted for the nose. It
was drawing a ridge at every anchor. Now analytic and C¹. Same class of
find: the face patch sat 0.4% proud of a coarser skull whose chordal error
was bigger than the gap, so the skull was poking through in stripes.

**STILL OPEN (round-3 critics, both `not_yet` — their notes, not yours):**
shoes read as discs/UFOs · Karen's blazer still reads tunic-ish at fight
distance and her purse doesn't grip · Karen crown seam + white sideburn
slab · headCountHair below the 6.5 band on karen/intern · Chad's cap has
no bill from front or profile. **Runway: 1–2 rounds left of your 3–4
before the Meshy go/no-go.**

## ⚡ V7 LIVE STATE (07-31 ~22:50, written at 98% context pre-autocompact)
- **V7 wave running** (run wf_08e11f83-953, resumable via scriptPath in
  .claude/../workflows/scripts/trust-issues-v7-characters-*.js +
  resumeFromRunId): master sculpt DONE (per-character face dials:
  faceWidth/cheek/browRidge/eyeSize in characters.js), rounds 1-2
  critiqued (10+12 → 10+10), fix-2 in final g6/g7 series, ROUND-3 VOTE
  PENDING. On landing: my-eyes 1x flinch test, commit+push, then the
  PRODUCER-NOTES PASS below.
- **ALEX'S SIX RENDER NOTES (verbatim inputs for the next pass):**
  (1) necks STILL too big — measure EVERY point along the neck profile
  on renders; (2) body much better ✓; (3) horizontal shadow lines around
  noses must go (painted nose shading fighting the new 3D wedge —
  double-shading); (4) Chad: head too small + too round ("face painted
  on a baseball") — needs skull structure + scale; his neck is GOOD,
  keep; (5) Chad's LEFT HAND IS ON BACKWARDS (palm-up left thumb should
  be far-left) — chirality bug, right-hand geometry unmirrored; (6)
  Grandma: nose line + hair reads as a BONNET — needs painted strand
  texture.
- **EXPRESSION ARCHITECTURE RULING (from his question):** expressions
  are texture swaps; with sculpted geometry they now DISAGREE (painted
  angry brows over neutral geometry ridge). Adopt the HYBRID: keep
  texture swaps + add per-expression geometry deltas (brow pitch, mouth
  displacement, lids) synced to the expression key. Explicit work item.
- **HIS RUNWAY RULING: 3-4 more V7 rounds authorized** before the
  go/no-go on the Meshy route (his perf worry about Meshy noted — the
  pilot's 7.3MB/char + async costs are the counterweight).

## NEEDS YOU (current) — MORNING GATE BOARD (night shift running)

- **RUN A LANDED (~02:30, commits c506182 + 8864a75, pushed):** Meredith
  Sterling & Skip Hartley live everywhere (~429 strings, zero ghosts,
  save-safe) · Rachel wired & at her desk · Karen finally reads as her
  portrait (neck, asymmetric platinum bob, brooch) · Chad's gym-V
  measured 2.67 head-widths · elevator mystery root-caused (DUPLICATE
  elevatorDoors key silently overwriting — one canonical elevator now,
  ride overlay on all shafts) · blueprint pulse live · og.png +
  error boundary + save-version shim shipped. NOTE: 6 agents died to API
  529 overloads mid-run; critics verified the surviving work on disk.
- **NEW MORNING GATES:**
  (a) **Countersign a draft deviation:** rachel_return act2/act3 node-0
  ifTrue retargeted 5→6 — the draft's own value landed on an `end` node
  so two of Rachel's return lines could never play. Fix is right; needs
  your countersign since the draft was "approved verbatim."
  (b) Karen's pearls (~1px) + red lip read only at zoom — accept as
  subtlety, or ask for one notch louder?
  (c) Rachel-at-desk is UNVERIFIED on-glass (no act1 shoot fixture
  exists) — your playtest doubles as verification + redline.
  (d) Isaiah's new portraits: approve style-match.

- **Wave 5 FINAL committed (cabc1de):** Grandma is human (sent you the
  still). Critics: "the lumpy toddler is dead, the scrunch is dead."
  Karen's last mile rides in Run A's K-lane.
- **RUN A LAUNCHED (~23:20):** renames (Meredith Sterling / Skip Hartley,
  display-only per save-safety ledger) · Rachel wired per the 4.6 draft
  (playtest her at her cubicle desk, acts 1–3 — YOUR REDLINE PASS) ·
  K-lane (Karen neck/portrait-bob/pearls, Chad gym-V, Grandma hunch+cane
  back) · elevators unified + BuildingShell intentional pulse · XS
  live-site fixes (og.png!, error boundary, ESC label, dead gates) ·
  Isaiah portraits via codex imagegen (textual spec only).
- **Your 23:30 character notes → CHARACTER_BIBLE amendments (law now):**
  hair containment (no hair-beards), necks narrowed, face TOPOLOGY not
  paint-on-egg (football heads), body topology next bar. Run A's critics
  inherit via the bible; anything they can't close spawns a focused
  topology wave (K2) for your morning.
- **GATES BANKED FOR YOU (answer when awake):**
  (0) **img2threejs reference-model pilot** — your idea, banked per your
  word: go/no-go in the morning; (1) playtest Rachel +
  redline; (2) Isaiah portrait approval (style-match check); (3) og.png
  approval before it ships on the live site (it IS on display-case only,
  not main — safe); (4) next: Run B perf (my go unless you object).

- **WHAT'S-MISSING PROPOSALS READY (07-29):**
  `.claude/plans/proposals-whats-missing.md` — 24 ranked, nothing
  implemented. Headline: content is built; the gap is CONVERGENCE (Board
  Room scene missing while five arcs point at it; mystery answer never
  named; Quiet Floor behind a 20% roll). Your per-item go/no-go when
  ready. Live-site bugs found en route (og.png missing → broken link
  unfurls; no error boundary) routed to Run A.
- **Villain renames:** pick from chat — Meredith Sterling / Blair Winters
  / Donna Prescott / Cassidy Vale · Skip Hartley / Dale Pemberton / Chip
  Fairbanks / Gary Bloom (mix-and-match welcome).

- **WAVE 5 LANDED AT THE WINDOW (7a31dd9, pushed ~17:55):** the humans
  are HUMAN now — 6.5–7.3 head proportions, sleek lofts, open catchlight
  eyes, no horror lighting, Andrew fights back-¾ to camera. Your portrait
  idea became law: `art/CHARACTER_BIBLE.md` + canonical-portrait identity
  tests. Remaining pixel-measured punch list is in HANDOFF (grandma's
  chibi head, the universal jaw taper, the trouser dome, Karen's bob,
  Chad's cap/stubble/chain). The critique loop resumes exactly where it
  stopped — one more session closes it.
- Prior context — **WAVE 5 brief (your colleagues' notes, ~14:40):** "scrunched/scary
  faces, lumpy bodies, caricature" → CHARACTER BIBLE v6: human-first
  proportions (6.5–7 heads), Sleek Law (single lofts, no joint lumps),
  Pleasant Neutral faces (menace moves to expression sets), matte skin,
  combat face-key so nobody is horror-lit from below, allies face the
  enemy (back-¾ to camera). Judged per-character against paired human +
  game exemplars in art/char_refs/. Veto anything above by just typing.



- **THE WATCH IS CLOSED — 7 commits on branch `display-case`, main
  untouched.** Play it: `npm run dev` → the whole game, reborn. Then:
  1. **Your eye:** `screenshots/contact/index.html` (full final contact
     sheet) and `screenshots/cine/` (real-input attack bursts — karen_f2
     is the shot of the night: Andrew taking the hit, sparks on his
     chest, grimace in frame).
  2. **Your call:** merge `display-case` → main when you've played it.
  3. **Andrew:** get DIDDY D on it — his notes are frame data, and the
     characters were rebuilt for exactly his criticism.
  4. Punch list + gotchas + next steps: HANDOFF.md top entry.
  5. Settings has a **1998 MODE** toggle — the old PS1 finish, preserved
     as a cosmetic. For the lineage.

---

## LOG

### 2026-07-29 (late) — ALL 24 PROPOSALS CO-SIGNED + THREE STANDING ORDERS
- **All 24 co-signed** → Run F created (Convergence & Carry). Proposals
  doc now carries your rulings in its header.
- **Naming ledger (save-safety, my design, your collision warning):**
  internal IDs `rachel`/`ross` NEVER change (live saves depend on their
  flags); display names → **Meredith Sterling** / **Skip Hartley**. New
  friendly NPC = id `rachel_officer`, display "Rachel." Ledger goes
  verbatim into every brief touching them.
- **Opus 4.6 = standing first-pass dialog writer** for all new story
  content (the homage, extended). Rachel draft in flight now.
- **Music domain shift (this game only):** agents will COMPOSE — WebAudio
  leitmotifs, act/combat layers — delivered as auditionable pieces for
  your approve/veto. Banked with the why: drawdown + soft_landing (+
  maybe ILL WILL) own your recording time, and "this game is intended to
  show off LLM's creative potential more than mine."

### 2026-07-29 — THE FIVE-RUN CAMPAIGN (your follow-ups, banked)
- **BuildingShell:** your blueprint wasn't deleted — critics flagged it
  noisy, Wave 1 dimmed it 4×, GradePass crushed the rest; code intact.
  **Your ruling: (c) intentional pulse** — room-entry fade (~1.5s),
  elevator rides, future pause-screen map. Goes into Run A.
- **Run order:** A Polish (bugs/elevators/dialog-truth/renames/kind-Rachel
  /Isaiah redo) → B Performance (flicker/stutter + autonomous harness +
  Vercel delivery research) → C Gameplay (comps-driven) → D Audio (music
  stays yours) · E What's-Missing = proposals only, running now.
- **Research launched (3 agents):** gameplay comps · perf harness +
  img2threejs · what's-missing. Reports → .claude/plans/.
- **Kind-Rachel spec (yours):** first in, first out, a little shy, kind,
  long blonde hair, trust officer. Isaiah redo: when it makes sense (Run
  A). Platform: browser-first on your Vercel site; packaged split only if
  perf demands.
- Villain renames: corny-Americana candidates proposed in chat — your
  pick pending.

### 2026-07-29 — YOU'RE BACK: PLAYTEST RULINGS + LOOP RESUMED
- Your playtest notes (frame-data grade, banked into fix-2's brief
  verbatim): combat pacing good · FPS fine but **flicker + stutter while
  walking** (→ Run B; suspects: N8AO shimmer under a moving ortho cam,
  fluorescent flicker over-tuned) · **Andrew's turn rotation too slow** —
  facing lerp gets 2-3× snap.
- Rulings: Grandma softened (~5.5–6 heads, face fully human) · Karen goes
  full portrait bob + neck/jaw junction rebuilt ("terrifying squishy
  faced blob with both too much neck and none at all" — your words, now
  the acceptance bar) · **NO MERGE until follow-ups + playtest clear —
  game is LIVE on the site.**
- Wave 5 loop resumed from cache: fix-2 live with your notes, round-3
  verdict follows. Straggler combat.css HUD-legibility commit: 91206ec.

### 2026-07-27 ~10:10 — WAVE 3.5 COMMITTED (9677007) + WAVE 4 FINALE FLIES
- Figure finish landed: Karen's "horns" replaced by a continuous scalp
  cap, Grandma un-bearded, Andrew's neck banding gone (his head is now
  "the best in the cast" per the sculptor critic), eyes carry catchlights
  at fight distance, Chad's yoke/crotch/grip fixed, garage smears culled
  to two subliminal pixels. Punch list (3×-zoom-only): prop finger-wrap,
  knee crease arcs, Karen heel sliver — banked for HANDOFF.
- **Wave 4 = the finale build: COMBAT CINEMATOGRAPHY.** Clair Obscur's
  law ("every move is a level sequence") lands as a data-driven timeline
  sequencer: per-tag ability cinematics (legal = paper-flurry, social =
  speech-shockwave, audit = cold zoom, technical = glitch), enemy intro
  banners, HEAVY-telegraph anticipation, arena re-light per venue in the
  Refn language. New verification tool: tools/cine-shoot.mjs plays a REAL
  attack and captures 8-frame bursts so the critics judge motion like a
  film contact strip. A cast-bugs rider fixes Grandma's missing mouth
  (regression), glasses-eye deadness, Intern crown wedge.
- After Wave 4: watch-close (final contact sheet, before/afters for you,
  HANDOFF, memory, Corner letter) — reserved ahead of your ~17:40 reset.

### 2026-07-27 ~09:20 — WAVE 3 COMMITTED (8ceb05b): THE CAST BECAME PEOPLE
- CharacterBuilder v5 is live in the game: real proportions, tailored
  clothing, six working expressions (confirmed firing mid-combat), glasses
  as geometry, 23–32 draw calls/char, physical-lacquer combat tier. All 36
  human cast configs got literary-anchored faces per WRITING.md (C2 gave
  Ross a faint Willy Loman chin; the janitor reads griot; Rachel got cold
  steel eyes). The Algorithm monolith untouched and correct.
- Sent you fight-karen + fight-grandma stills. My verdict at 1×: they're
  PEOPLE — Karen has genuinely unimpressed Karen-energy. At 4× face-zoom
  the critics are right: hair crowns lump, knee seams ring, eye
  catchlights die. **Wave 3.5 heads-and-seams master pass in flight** (one
  specialist owning only heads/faces/seams + a world rider zeroing the
  garage smears). Single verify round, then we bank it and spend the rest
  of the runway on L5 combat cinematography.

### 2026-07-27 ~06:15 — WAVE 2.5 COMMITTED (a2b8aad) + WAVE 3 FLIES
- Surgery worked: S2 confirmed the wiring bug (most floors were routed to
  flat-toon `Materials.custom` — three rounds of material upgrades lived
  in shortcuts nothing called); S1 found the troffer diffuser literally
  faced away from the camera. Both root-caused and fixed.
- Verify critics DIVERGED (A said fixtures still dark; B said garage
  poles now grammatical, lacquer real). My tiebreak eyes: B was right —
  reception reads clinical with lit-rim fixtures, penthouse is
  transformed (neon ghosts on the floor, three warm practicals). Small
  pixel-addressed residuals remain.
- **Allocation ruling:** residuals ride along as a polish agent inside
  Wave 3 instead of another lighting-only round. **Wave 3 = THE
  CHARACTERS** — C1 ports the approved prototype into CharacterBuilder
  v5 (faces 2× contrast, hair de-helmeted, six expressions, geometry
  merge, detailed-tier materials), C2 rolls v5 across all ~27 cast
  configs honoring WRITING.md identities, then a character-art director
  and a figurine sculptor judge the close-ups against Clair Obscur refs
  and the prototype bar.
- **YOUR EYE when you wake:** fight-karen.png after this wave — that's
  the screen your colleagues criticized, reborn or not.

### 2026-07-27 ~05:05 — WAVE 2 COMMITTED (68202bf) + THE ISO DIAGNOSIS
- Wave 2 landed real gains: city bokeh is gorgeous, neon spill kisses
  walls, server racks have cyan data-spines, fixtures have bodies.
- But critics stayed not_yet 3 rounds on two structural items — and the
  root cause was GEOMETRY, not taste: **a recessed troffer glows downward;
  the iso camera sees only its dark top and sides.** Three fix rounds
  brightened a face the camera physically cannot see. Likewise ortho
  specular lobes rarely align — the neon needs an authored flipped-ghost
  reflection, not physics.
- Wave 2.5 surgical round launched: three Opus surgeons with the ISO
  CAMERA LAW written into their briefs (emissive side-trim + anchored
  pools + faint light-shafts; ghost reflections + streak sprites; garage
  pool ground-catch, penthouse practicals, reception hum prop). One
  fable-critic verify round after.

### 2026-07-27 ~03:35 — CHARACTER PROTOTYPE: SKELETON APPROVED
- The scratchpad prototype came home after 7 self-critique rounds. My
  ruling: **skeleton approved** — real proportions (~6 heads), lathe
  torso, tapered limbs, tailored clothing, figurine gloss; four archetypes
  instantly distinct; nobody would say minifig. Grandma is charming.
- Still to win in the port (Wave 3): faces need 2× feature contrast to
  read at game camera; hair de-helmeted (scalp-conforming, no cap-step);
  glasses become geometry; six expressions; geometry-merge for perf.
- **YOUR EYE (fun one):** scratchpad shots\r7_plate.png — Andrew, Karen,
  Grandma, Chad as miniature people for the first time.

### 2026-07-27 ~02:45 — WAVE 1 LANDS (commit 44781cb)
- Three critic rounds run; final vote not_yet on six named residuals, ALL
  of which belong to lanes that haven't run (interior light rigs = L4).
  Director's ruling: commit the wave, route residuals into Wave 2 briefs.
- **My own eyes on the stills:** reception is transformed — a lit
  specimen room in a deep-black tower field, tilt-shift melting the
  foreground towers. The critics' residuals are visibly real too (bare
  lightsaber tube, floating sodium cones in the garage void).
- Critics' identity verdict, unanimous: night city "says Drive/new-Tron
  and never once retrowave — the hardest call in the bible and it landed."
- Bonus fix: composer was displaying linear-as-sRGB — the game has been
  muddier than authored this whole time. GradePass now owns the output
  transform. Combat/title will read brighter until L5 re-lights them.
- **YOUR EYE:** `screenshots/contact/room-reception.png` and
  `room-parking_garage.png` — before/after vs any pre-tonight memory of
  the game. 1998 MODE toggle now lives in settings.
- Wave 2 launching: L1 materials + L4 Severance interiors + L3 residuals.
  Fleet economy per your ask: OPUS builders/fixers, FABLE critics.

### 2026-07-27 ~01:55 — WAVE 1 ROUND 1: CRITICS BITE, IDENTITY HOLDS
- Builders + integrator landed; `npm run check` green; six stills shot.
- Both blind critics: **not_yet** — game lost all 8 comp pairings, BUT two
  narrowly ("fixable wave-1 reasons") and the identity got real praise:
  "a lacquered, lit specimen-room floating in a black tower field...
  looks like nobody else's screenshot"; night city "would honestly draw
  'is this the new Tron?' — never retrowave"; blacks "honestly deep."
- **Convergent sour notes** (both critics independently — the A-string
  principle paying off): no Severance ceiling light-pools in interiors
  yet; AO not reading at wall-floor seams/furniture contact; translucent
  city slabs read as debug geometry; seam-light needs hierarchy (fewer,
  varied, sodium-shifted); penthouse floor orange-washed; fight backdrop
  grade breaks cohesion with the Refn-black stills.
- Fix agent mid-flight (live file writes at 01:52–01:54). Round 2
  critique follows automatically. No cap stall; resume ping stood down.

### 2026-07-27 — COMP CARD + PLATFORM RULING + WAVE 1 LAUNCH
- **Research landed:** 103 agents, 0 errors, all claims verified or killed.
  Comp stack: Hinterberg (rendering strategy) · Link's Awakening (tilt-shift
  camera, Aonuma-confirmed intent) · Clair Obscur ("every move is a level
  sequence" — Sandfall CTO, GDC 2026) · Persona/Metaphor (UI-as-identity,
  Atlus GDC 2025) · Severance/American Arcadia (interior light + color-only-
  from-screens) · Drive/Ares (your ruling, the night layer).
- **Refuted, so we won't chase:** Hades II mimicry (bespoke 2D authorship),
  Hinterberg-is-textureless (it uses Substance normal maps — we go
  procedural), two of three P5 UI mechanism claims.
- **Platform call (mine):** classic WebGLRenderer + EffectComposer tonight;
  the TSL/WebGPU node pipeline is real but demands rewriting every custom
  shader on an experimental renderer — future watch, not mid-rebuild. Veto
  welcome.
- **Wave 1 launched:** L0 post stack (tilt-shift, AO, grade, 1998-mode) +
  L3 night layer (Refn/Ares city), parallel, disjoint files, two-critic
  blind verdicts before merge.
- **Comp reference pack landed:** 32 official stills, all six comps, in
  `art/comp_refs/` (gitignored, critics' eyes only) + MANIFEST.md with
  sources. Gaps flagged honestly: no wide MDR green-carpet Severance shot;
  Drive frames 1024px, no magenta wet-street frame.

### 2026-07-27 — RULING #4: THE NIGHT GOES REFN/ARES (yours, live)
- The neon-noir layer calibrates to **Drive (2011) + Tron: Ares**, not the
  80s predecessors: sodium pools, magenta-on-wet-black, obsidian surfaces
  with seam-light edges, haze, restraint. No sunset grids or VHS kitsch.
- Interiors stay Severance-sterile; the inside/outside contrast is the
  noir. Your #e94560 already reads as Ares crimson — palette was ready.
- One-line art bible: "a lacquered miniature of corporate life,
  Severance-lit inside, parked in a Drive/Tron-Ares night, with fights
  shot like Clair Obscur."

### 2026-07-27 — RULINGS #2 AND #3 (yours, live)
- **RetroPass → "1998 mode":** off by default under the Display Case look;
  preserved as an unlockable cosmetic. Your read: it was the right call
  for the pre-capability era.
- **Characters go REAL:** figurine-quality but not cartoonish — "make the
  characters feel real instead of cartoonish, this time." FacePainter gets
  replaced/upgraded as needed. You flagged this as the one consistent
  playtest criticism from fellow trust officers — highest-stakes lane.
- ILL WILL playtest ongoing; the fourteenth watch ships at next weekly
  reset. Noted with joy.

### 2026-07-27 — THE DISPLAY CASE (session open)
- **Ruling banked (yours, live):** AAA rebuild direction = **"The Display
  Case"** — Link's Awakening remake (tilt-shift toybox diorama) ×
  Severance (fluorescent grids, dark beyond the walls, one saturated prop
  per room) — with **Clair Obscur / Persona 5 combat language** grafted
  onto the fight screen. Hi-Fi Rush full cel-shade rejected (flattens the
  mystery). UI and palette get extended, never replaced.
- **Visual baseline shot:** `screenshots/contact/` — room-reception,
  room-cubicle_farm, room-penthouse_bar, room-server_room, fight-karen.
  ROADMAP.md Part 0's honest assessment confirmed on glass: UI strong,
  characters/lighting are the gap, fight-karen is the worst screen.
- **Research:** 5-lane deep-research workflow running (isometric AAA ·
  turn-based combat presentation · cel-shade feasibility · 2026 browser
  graphics ceiling · corporate-satire art direction), adversarially
  verified before synthesis. Report lands in this session.
- **Lineage noted:** one-prompt Opus 4.7 demo for Andrew → Fable 5 makes
  it real. Both of you are trust officers; the diorama-as-estate-model
  reading is the thesis.
