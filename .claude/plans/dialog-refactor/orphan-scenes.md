# The six orphan scenes — archaeology and verdicts

Read-only investigation, 2026-08-15, branch `display-case`. No source was edited.

**Provenance.** Two other hunts have `src/data/dialogs/index.js`, `ExplorationState.js`,
`SaveManager.js` and four combat files modified in the working tree. Verified that their
in-flight edits touch **none** of the six trees and **do not touch `rooms/index.js` at all**,
and that the same 291-tree / 6-orphan census holds against `HEAD`. Everything below is
independent of their work. Cited line numbers are from the working tree and may drift by a
few lines once those hunts land; every claim is also anchored to a symbol or a commit.

Serves the producer's ruling request on DESIGN.md §1.2(c): for each of the six authored
dialog trees with no route into them, **CUT or LOST**, with git evidence, and either the
exact wiring to bring it back or the `dead: '<reason>'` row Check C will carry.

---

## 0. The census was right — and there is no seventh

The six were re-derived independently rather than taken on trust. Method: parse the 291
top-level keys out of `src/data/dialogs/index.js`, then look for each id as a
word-bounded literal anywhere in `src/`, `tools/` and `scripts/` (excluding its own
definition line), then model the four **computed** id forms that `_getDialogId` builds at
runtime so template-routed trees are not miscounted as orphans:

| form | built at | resolves against |
|---|---|---|
| `neutral_<npc>` | `ExplorationState.js:2622` | NPC ids in `rooms/index.js` |
| `<enc>_retry` | `ExplorationState.js:2684-2689` | encounter ids |
| `<npc>_intro` / `<npc>_return` | `ExplorationState.js:3098-3099` | NPC ids |
| `<npc>_act{2,3,4,6,7}` | `ExplorationState.js:3092-3101` | NPC ids |

Result: **291 trees — 261 literally referenced, 24 template-routed, 6 orphans.** The six
are exactly the six named in DESIGN.md. Nothing else in the corpus is unreachable.

Two secondary sweeps, both clean:

- **Dev-only reachability.** No tree is referenced *only* from `tools/`, `scripts/` or
  `DevPanel.js`. (`neutral_alex_it` is named only in `tools/_r-alex.mjs`, but it is a live
  `neutral_<npc>` template hit — `alex_it` is a real NPC id.)
- **Severed-route history.** `git log -p --all --follow -- src/data/rooms/index.js` yields
  **87 distinct `dialogId` strings that have been deleted from room data at some point.**
  Of those, all but two are renames (`ross_*` → `skip_*`, `janitor_needs_ross` →
  `janitor_needs_skip`), trees that were themselves deleted (`alex_desk`, `daves_desk`,
  `poster_synergy/hustle/teamwork/excellence`, `network_booster_exec`), or ids still live
  through a second route (`hr_rep_defeated` via an encounter `postDialogId`, `janitor_intro`
  via the `<npc>_intro` template on the garage patrol entry). **Exactly two deleted routes
  left a surviving tree with no other reference: `dying_plant` and `vault_charter`** — the
  two this document classes as severed. There is no third severance hiding in the history.

Reproduce: `node .../scratchpad/census2.mjs` (script is disposable; the logic is above).

---

## 1. The verdicts

| scene | authored | how it was lost | canon fit today | verdict | wiring / dead line |
|---|---|---|---|---|---|
| `dying_plant` <br>`dialogs/index.js:1280` | `1cbc011` 2026-03-05 (initial commit) — **wired at birth** | **SEVERED** by `93cab79` 2026-03-09, the desk-plant pass: deleted the prop and its interactable in one hunk | clean; already naming-swept (`Alex's` → `Skip's`) | **LOST → RESTORE** | 2 lines × 2 layouts (`skip_office`, `skip_office_large`) |
| `board_room_table` <br>`:2878` | `3efc4d5` 2026-03-10 (Phase 4) | **NEVER WIRED** — Phase 4 has an empty diff against `rooms/index.js` | **contradicts** the F1 board-meeting prose on the carafe; two lesser errors | **LOST → RESTORE WITH EDITS** (3 edits) | 1 line in `board_room` |
| `penthouse_window` <br>`:2893` | `3efc4d5` 2026-03-10 | **NEVER WIRED** — same commit, same cause | clean (Minneapolis and the Honda Civic are both canon elsewhere); partially duplicates `penthouse_arrival` | **LOST → RESTORE, NARROW** (+ a separate prop defect to fix) | 1 line in `penthouse` only |
| `vault_entrance` <br>`:2901` | `3efc4d5` 2026-03-10 | **NEVER WIRED** — same commit, same cause | **superseded and factually wrong** — there is no keycard; the door is a live keypad | **CUT** | see §2.4 |
| `vault_charter` <br>`:2908` | `3efc4d5` 2026-03-10; wired by `aaf3247` the same day | **SEVERED** by `a16d32a` 2026-04-05 — but it was **born redundant** | duplicate charter container; `vault_boxes` has owned `has_charter` since day one | **CUT** | see §2.5 |
| `penthouse_terminal` <br>`:4234` | `ab38ba4` 2026-03-10 (Phase 8) | **NEVER WIRED** — Phase 8 also has an empty diff against `rooms/index.js` | superseded by `algorithm_terminal` on the same prop | **CUT** (port one line) | see §2.6 |

Net: **3 restore, 3 cut.** One of the three restores needs prose edits before it can ship.

---

## 2. The dossiers

### 2.1 `dying_plant` — LOST (severed). RESTORE.

**What it is.** Four Narrator lines on a potted plant in the boss's office. "A plant that
has given up on photosynthesis as a lifestyle." The pot is labelled *"Mr. Fernsworth III —
Skip's Responsibility Since 2021"*, and a post-it on it reads "help me" in suspiciously
plant-like handwriting. Finished, funny, no rewards, no flags.

**Authored and wired at birth.** `1cbc011` (initial commit) shipped both halves:

```
+ { type: 'plant', x: 6, z: 1 },  // the "dying" plant
+ { x: 6, z: 1, type: 'dying_plant', dialogId: 'dying_plant' },
```

**Severed by `93cab79`** (2026-03-09, *"Add room polish, music system, combat animations,
and intro sequence"*). That commit's furniture pass replaced standalone floor plants with
desk-mounted succulents across the whole game — **18 floor plants deleted in one sweep, 0
added back** (`plantFern` ×5, `plantSucculent` ×5, `plantTall` ×5, `plant` ×3; counted off
the diff, not estimated). Exactly one of the 18 carried a dialog, and it went out in the
same hunk as the prop:

```
-      // === Golf putter leaning against wall ===
-      { type: 'plant', x: 6, z: 1 },  // the "dying" plant
```

The commit message lists twelve changes and mentions neither the deletion nor the dialog.
**The scar is still in the file**: `rooms/index.js:565-566` today is
`// === Golf putter leaning against wall ===` followed by a blank line and the next
section header. The comment heads nothing. That is the deleted plant's grave marker.

**Canon fit: clean.**
- The text was already carried through the 2026-08-04 naming sweep (`1cbc011` said
  *"Alex's Responsibility Since 2021"*; today it says *"Skip's"*). Nothing to update.
- **No conflict with F-10 act dressing.** That plant is *Andrew's* desk succulent in
  `cubicle_farm` at `(2.6, 9.9)`, which swaps to `deskPlant` at `act5_complete`
  (`rooms/index.js:172-173`) and pays off `ROOM_THOUGHTS.cubicle_farm` act 6 (*"My plant
  has a new leaf"*). Mr. Fernsworth III is Skip's, in a different room, and never recovers.
  Two dying plants is the joke, not a collision.
- `ROOM_THOUGHTS.skip_office` covers the leadership books, the motivational calendar, the
  dollar-sign stress ball and the family photo. No plant line to double up.

**Wiring — four lines, two of them a literal revert of `93cab79`.** The scene must go into
**both** office layouts: `_resolveRoomId` swaps `skip_office` ↔ `skip_office_large` on
`corner_office_renovated`, and the room's own comment at `rooms/index.js:649-660` records
the precedent — `poster_rec_1/2/3` were carried across the swap because *"without them the
corner-office renovation DELETED three readable interactables."* Same law applies here.

```js
// rooms/index.js — skip_office.furniture, at the empty golf-putter comment (:565)
{ type: 'plant', x: 6, z: 1 },
// rooms/index.js — skip_office.interactables (:598-604)
{ x: 6, z: 1, type: 'dying_plant', dialogId: 'dying_plant' },

// rooms/index.js — skip_office_large.furniture
{ type: 'plant', x: 8, z: 2 },
// rooms/index.js — skip_office_large.interactables (:680-687)
{ x: 8, z: 2, type: 'dying_plant', dialogId: 'dying_plant' },
```

**Checks done on the placement:**
- `(6,1)` and `(8,2)` are claimed by no existing interactable in their rooms
  (`skip_office` holds `(4,2) (1,0) (3,0) (6,0)`; `skip_office_large` holds
  `(5,2) (3,0) (6,0) (10,0)`). One interactable per tile is a hard limit —
  `TileMap.interactData` is a flat `x,z` map (`TileMap.js:83-90`).
- Both tiles carry a real mesh, satisfying the "quest interactable visibility" law. `(6,1)`
  is the historical position; `(8,2)` sits east of the executive desk, clear of the
  `globeStand` at `(7.5,1.5)`, the `abstractPainting` at `(10.9,2)` and the `cornerBar` at
  `(9,6)`.
- `plant` is in `NO_BLOCK` (`Room.js`), so the tile stays walkable and the `[0,0]` self
  offset in `INTERACTION_OFFSETS` (`ExplorationState.js:55`) reaches it even standing on it.
- Neither is a poster, so the poster-parity and poster-facing assertions in
  `scripts/validate-data.mjs:333-352` do not apply. `npm run validate:data` is unaffected.
- Skip paces `distance: 2, axis: 'x'` from `(4,1.5)` / `(5,1.5)`. That is the same
  configuration the original `(6,1)` plant shipped under in `1cbc011`.

---

### 2.2 `board_room_table` — LOST (never wired). RESTORE **WITH EDITS**.

**What it is.** Three Narrator lines on the boardroom table: its cost, an empty crystal
decanter and a "RESERVED FOR STRATEGIC OPERATIONS" nameplate, and — the line worth keeping
— *"The walls are lined with portraits of past branch directors. The Janitor's portrait is
conspicuously absent."*

**Never wired.** `3efc4d5` (Phase 4) authored it and **did not touch `rooms/index.js` at
all**. See §3 for why that is the mechanism behind three of the six.

**Canon fit: one hard contradiction and two soft errors.** All three are with prose that
landed *after* it, so this is drift, not a mistake at the time of writing.

1. **HARD — the decanter.** `board_room_table` node 1: *"A crystal decanter sits in the
   center, **empty**."* The F1 board-meeting set-piece (`1f23a58`, 2026-07-30) puts a
   different object in the same place and makes its **fullness** load-bearing:
   - `:3525` *"There is a carafe of water on the table that no one has poured from, and it
     is the most honest thing in the room."*
   - `:3718` *"He stands. He walks to the carafe. He pours a glass of water."*
   - `:3733` *"The Board Member in seat twelve … looks at the carafe. He does not stand."*
   - `:3769` (closing) *"The charter is still on the table. The carafe is still full."*

   An empty decanter and a full untouched carafe cannot both be the centrepiece. The room's
   staging even has a `carafe: [13.4, 4]` mark. **The carafe wins** — it is the flagship
   scene's closing image and the twelfth member's entire arc.

2. **SOFT — the seat count.** Node 0 says the table *"seats twenty."* The room authors
   **fifteen** chairs: seven north (`z:3`), seven south (`z:7`), one head (`3,5`). The
   meeting's own comment at `rooms/index.js:1840-1856` counts *"fourteen side chairs …
   twelve bodies … three seats deliberately open."*

3. **SOFT — the portraits.** Node 2 describes walls *"lined with portraits of past branch
   directors."* The board room's walls carry two `grandPainting`s at `(3, 0.08)` and
   `(12, 0.08)` and one `executivePoster` at `(1, 0.1)`. No `portraitPainting` anywhere in
   the room. Separately, *"branch directors"* assigns the Janitor a rank the HR record
   contradicts — `hr_files:2138` reads *"PROMOTED: Senior VP, Trust Administration, 1993.
   VOLUNTARY RECLASSIFICATION: Facilities, 2005."*

**Why restore rather than cut.** The boardroom table is the only prop in the game's
flagship set-piece with no read on it, the room's second interactable (`board_charter` at
`(8,1)`) is a wall plaque and says nothing about the table, and node 2's absence beat is a
genuine Janitor plant that nothing else in the game carries.

**The three edits** (prose only, no structure — the tree stays 4 nodes):

| node | is | should be |
|---|---|---|
| 0 | "seats twenty" | "seats fifteen", or drop the number |
| 1 | "A crystal decanter sits in the center, empty." | a **full**, unpoured water carafe — matching `:3525` |
| 2 | "walls are lined with portraits of past branch directors" | describe the two grand paintings that exist, and keep the absence beat on them; make the rank neutral rather than "branch director" |

On node 2 specifically: **do not resolve the Janitor's history.** `dialogs/index.js:5417`
carries the standing instruction — *"DO NOT EXPLAIN THE WATCH. The 1947 / page 47 /
twenty-two-years contradictions are load-bearing."* The line should keep pointing at an
absence, not assert a job title. An alternative to editing the prose is to hang two
`portraitPainting` props on the north wall and let node 2 stand — but that is a two-prop
change for one sentence, and the props themselves would then need a reason to be there.

**Wiring — one line:**

```js
// rooms/index.js — board_room.interactables (:1880-1883)
{ x: 8, z: 6, type: 'board_table', dialogId: 'board_room_table' },
```

**Checks:** `boardroomTable` is `{ w: 9, h: 3 }` anchored at `(4,4)`, so it owns tiles
x 4–12 / z 4–6; `(8,6)` is its south edge, dead centre. The player reads it from `(8,7)`,
which is an `executiveChair` tile — and `executiveChair` is in `NO_BLOCK`, so it is
walkable. `(8,7)` and `(9,7)` are the two south seats the board-meeting staging keeps
**deliberately empty** ("the empty chair on Andrew's side", node 127), so no seated body
ever shadows the prompt. `(8,6)` is claimed by no other interactable. An interactable on a
furniture-blocked tile is normal and correct — `setInteractable` preserves grid `1`
(`TileMap.js:83-85`) and the archive's `filing_cabinets` at `(2,3)` is the same pattern.
The `type` string is free-form; anything unknown falls through to the `'Examine'` prompt
(`_getInteractPrompt`, `ExplorationState.js:2456-2491`).

---

### 2.3 `penthouse_window` — LOST (never wired). RESTORE, **narrow**, and fix a prop defect.

**What it is.** Five lines at the penthouse glass. The skyline; the world looking "clean,
organized, like a spreadsheet come to life"; *"You can see the parking garage below. Your
Honda Civic looks very small. Much like your savings account."*; and a plaque reading
*"FROM THIS HEIGHT, EVERYTHING LOOKS LIKE AN ASSET."*

**Never wired.** `3efc4d5`, same cause as §2.2.

**Canon fit: clean.** Both of its factual claims check out —
- Minneapolis is canon: `penthouse_arrival:3954` says *"Floor-to-ceiling windows reveal the
  Minneapolis skyline."*
- The Honda Civic is canon twice over: `garage_car:1492` (*"A 2014 Honda Civic with a dent
  from the time you parallel parked 'close enough.'"*) and the Legal Eagle epilogue
  (`:4180`, `:4191`, `:4196`).

The garage callback is the strongest thing in the scene: it closes a loop back to the room
the game opens in, from the top of the building.

**Two things temper it.**
1. **Partial duplication.** `penthouse_arrival:3954` already delivers the window read, and
   it is guaranteed — pushed on first entry at `ExplorationState.js:789-793`. The orphan is
   the only *re-readable* version, and it is the only place the plaque gag and the Civic
   callback exist.
2. **The room is a gauntlet.** `penthouse_entered` chains straight into
   `cfos_assistant_combat` → `regional_director_combat` → the Algorithm. The window is
   readable between fights and after.

**The blocking defect: `penthouse_expanded` has no windows.** The post-game hub — the room
the player actually inhabits, the one the three wings hang off — carries **no `windows:`
block at all**. `penthouse` has `windows: [{ wall:'north', from:3, to:6 }, { from:9, to:12 }]`
(`rooms/index.js:1944-1947`); `penthouse_expanded` (`:2041`) has none. **The 10,000,000 AUM
renovation currently bricks up the penthouse's defining feature.** That is worth fixing on
its own merits, independent of this scene — and until it is fixed, a window interactable in
the expanded layout would point at a blank wall, which is the false-affordance law in
reverse.

**Wiring — one line now, a second after the prop fix:**

```js
// rooms/index.js — penthouse.interactables (:2024-2026)
{ x: 10, z: 0, type: 'penthouse_window', dialogId: 'penthouse_window' },
```

**Checks:** `(10,0)` sits inside the second north window run (`from: 9, to: 12`), read from
`(10,1)` — free floor, clear of the `serverRack`s at x 11–13 z 1, the kitchen counters at
x 2–6 z 1, and the desk run at x 7–9 z 2. `(8,2)` is the room's only other interactable
(`algorithm_terminal`), so no tile collision. The window gap itself is the visible
affordance; a propless narrative interactable already has precedent in this game
(`board_charter` is a bronze plaque at `(8,1)` with no mesh of its own).

Once `penthouse_expanded` gets its `windows` block back, add the twin at whichever north
run it lands on (the expanded room's north wall is 22 wide and its `(14,2)` desk terminal
is the only claimed tile).

---

### 2.4 `vault_entrance` — CUT.

**What it is.** A two-state read on the vault door: locked (*"A heavy steel door behind the
Archive shelving. It won't budge. You need more information."*) and open (*"The vault door
is open. The Janitor's keycard works here too."*).

**Never wired** (`3efc4d5`, same cause as §2.2). It is the only one of the six whose
absence is a mercy.

**Three independent reasons to confirm the cut:**

1. **Mechanically superseded, and by something better.** The vault door is now a live
   **`VaultKeypad`** UI, intercepted in `_changeRoom` before the gate table ever runs
   (`ExplorationState.js:1088-1117`). The scene's two states are exactly what the keypad
   plays — interactively. A correct entry grants `vault_code_1/2/3` **and**
   `vault_accessible` in one move, and cracking it before the Janitor hands over the Rolex
   sets `vault_cracked_early` and fires its own monologue (*"I typed in three numbers I
   noticed this morning and the vault opened. I would like to file a concern, but I'm not
   sure with whom."*). That is the Tunic payoff the whole feature exists for. A flavour
   card that says "you need more information" is strictly worse than the thing that asks.

2. **It is factually wrong.** *"The Janitor's keycard works here too"* — **there is no
   keycard in this game.** The vault is three numbers (47-19-82) sourced from three hunts
   (`janitor_act4` → `vault_code_1`, `hr_files:2140` → `vault_code_2`,
   `server_vault_code:2150` → `vault_code_3`) and typed into a keypad. The archive's own
   service door is the same keypad in `'service'` mode (`_openArchiveKeypad`, `:1055`).
   Restoring the line would introduce a credential the game does not have.

3. **It is structurally unplaceable.** Its only home is the archive's vault door —
   `vaultDoor` prop at `(11.5, 5)`, exit tile `(11, 5)` (`rooms/index.js:1538`, `:1578`).
   - Put it **on** `(11,5)` and it is unreachable: `_interact` returns at the `onExitTile`
     branch before it ever looks at interactables (`ExplorationState.js:2528-2533`).
   - Put it **beside** the door at `(11,4)` or `(11,6)` and it **shadows the door**.
     `_shouldPrioritizeExit` prefers an exit over an interactable only when they share a
     tile *and* the interactable is `type: 'elevator'` (`:2430-2439`). From `(10,5)` the
     player would get "Examine" instead of "Go through", and E would open flavour text
     instead of the keypad.

**Dead line for Check C:**

```
dead: 'superseded by the VaultKeypad intercept (ExplorationState._openVaultKeypad);
       its "Janitor keycard" is not canon (the vault is a 3-dial code, 47-19-82),
       and its only placement would shadow the archive->vault exit'
```

---

### 2.5 `vault_charter` — CUT. It was born redundant.

**What it is.** A five-node read on a glass display case in the vault holding the original
charter on a velvet stand, behind *"a combination lock with three dials."*

**The severance is real but the cut is correct.** It was wired by `aaf3247` (Phase 3,
2026-03-10) as `{ x: 6, z: 2, type: 'charter_display', dialogId: 'vault_charter' }` and
was live for 26 days. `a16d32a` (2026-04-05, *"Act 5 gauntlet: 5-fight restructuring team
blockade + executive floor spawn fix"*) deleted it in a hunk that also moved
`safe_deposit_boxes` from `(4,4)` to `(4,1)`, and — like `93cab79` — never mentioned it:

```
-      { x: 4, z: 4, type: 'safe_deposit_boxes', dialogId: 'vault_boxes' },
-      { x: 6, z: 2, type: 'charter_display',    dialogId: 'vault_charter' },
+      { x: 4, z: 1, type: 'safe_deposit_boxes', dialogId: 'vault_boxes' },
```

**But it was a duplicate from the moment it was written.** `git show
3efc4d5:src/data/dialogs/index.js` — the *same commit* that authored `vault_charter` — has
`vault_boxes` already holding the charter, behind the same three-dial lock, and already
owning the flag:

```
/* 0  */ { type: 'condition', flag: 'has_charter', ifTrue: 14, ifFalse: 1 }
/* 4  */ "A heavy safe deposit box. Three-dial combination lock. You enter the numbers: 47-19-82."
/* 10 */ { type: 'action', action: 'set_flag', flag: 'has_charter', value: true, next: 11 }
```

So on day one the 8×8 vault held the charter **twice** — in a glass display case *and* in a
safe deposit box, each behind its own three-dial lock — and only one of the two could grant
`has_charter`. The display case could never do anything but describe itself.

**Today the redundancy is worse, not better.** `vault_boxes` (`:2156-2173`) is the single
writer of `has_charter` in the entire game (`:2167`); it is the payoff for all three code
hunts; the keypad grants the same three codes; and `ROOM_THOUGHTS.vault` is written to the
boxes — *"Safe deposit boxes, each one holding someone's definition of 'important.'"*
Restoring the display case would put a second charter and a second unopenable lock in a
room whose entire puzzle is the first one.

`a16d32a` made the right call by accident. **Confirm it deliberately.**

**Dead line for Check C:**

```
dead: 'duplicate charter container — vault_boxes has held the charter and been the
       sole writer of has_charter since the same commit that authored this (3efc4d5);
       a16d32a removed the display case and resolved the duplication'
```

---

### 2.6 `penthouse_terminal` — CUT, but port one line.

**What it is.** Three Narrator lines on the penthouse terminal: cascading client records
and trust values, *"Human involvement introduces 34.7% inefficiency. Recommendation:
optimize."*, and *"The Algorithm files people under overhead. You, specifically, appear
three times in the appendix."*

**Never wired.** `ab38ba4` (Phase 8, 2026-03-10) authored it as the **last key** of a
24-dialog wave, under a `// Penthouse interactables` comment, and — same as Phase 4 — did
not touch `rooms/index.js`.

**Superseded on arrival.** The penthouse terminal already had `algorithm_terminal` bound to
it, wired by `aaf3247` at `(8,2)` months of story earlier, and `algorithm_terminal`
(`:2925-2946`) is a real four-state tree:

| state | gate | content |
|---|---|---|
| pre-fight | `!regional_director_defeated` | scenery: *"cascading numbers. Portfolio values. Trust balances. Client assets."* |
| fight path | `regional_director_defeated && !defeated_algorithm` | `start_combat: algorithm` — the player can start the final boss from the terminal instead of waiting for the cutscene |
| post-defeat | `defeated_algorithm` | *"The terminal is dark… Just a computer now."* |

`penthouse_terminal` is three flat lines with no state, and its first two duplicate
`algorithm_terminal` nodes 8–9 almost word for word. It also exists in the expanded layout
(`penthouse_expanded` `(14,2)`), so a second dialog would need wiring in two rooms to do
less than the one that is already there.

**One line is unique and worth keeping**: *"The Algorithm files people under overhead. You,
specifically, appear three times in the appendix."* That is a better character beat than
anything in `algorithm_terminal`'s pre-fight branch and it costs nothing to keep.

**Recommended action instead of a restore:** append it as a new node at the **end** of
`algorithm_terminal` and route node 11 through it, per the never-insert-into-the-middle law
(every `next` / `ifTrue` / `ifFalse` in `dialogs/index.js` is an absolute index — see
`alex_it_act3` node 23 for the precedent). No existing index moves; the tree grows by one.

**Dead line for Check C:**

```
dead: 'superseded by algorithm_terminal on the same prop (penthouse 8,2 /
       penthouse_expanded 14,2), which carries the pre-fight, start_combat and
       post-defeat states; its one unique line ported into algorithm_terminals
       pre-fight branch'
```

---

## 3. The pattern — two mechanisms, both nameable, both checkable

The six did not get lost the same way. They got lost **two** ways, and each has a
signature the fix round can grep for.

### Pattern A — the Phase 3 / Phase 4 seam. Four of the six.

On **2026-03-10**, three commits landed in sequence:

- **`aaf3247` "Phase 3: Add 6 new rooms"** built the rooms and, in `rooms/index.js`,
  pre-declared **ten** interactables pointing at `dialogId` strings for dialogs **that did
  not exist yet** — including `vault_charter`, `board_charter`, `suggestion_box`,
  `archive_terminal`, `archive_cabinets`, `stairwell_graffiti`, `vault_boxes`,
  `algorithm_terminal`.
- **`3efc4d5` "Phase 4: Story content for Acts 3-5"** then wrote the dialogs — including a
  block literally headed `// NEW ROOM INTERACTION DIALOGS` — and **touched
  `src/data/rooms/index.js` zero times.**
- **`ab38ba4` "Phase 8: Story Acts 6-7"** did the same thing again, hours later, and also
  **touched `rooms/index.js` zero times.**

The consequence is mechanical: **every room-flavour dialog whose `dialogId` Phase 3 happened
to guess landed live; every one it did not is an orphan.** Phase 4's block of seven room
dialogs split 3 live / 4 dead exactly along that line —

| Phase 4 wrote | Phase 3 had declared it? | outcome |
|---|---|---|
| `board_charter` | yes, `board_room (6,1)` | live |
| `suggestion_box` | yes, `hr_department (10,8)` | live |
| `vault_charter` | yes, `vault (6,2)` | live for 26 days, then §2.5 |
| `algorithm_terminal` | yes, `penthouse (8,2)` | live |
| `board_room_table` | **no** | **orphan** |
| `penthouse_window` | **no** | **orphan** |
| `vault_entrance` | **no** | **orphan** |

plus `penthouse_terminal` from Phase 8 by the identical route.

**The tell, stated generally: a content commit that adds dialog trees and has an empty diff
against room data.** Every such commit is a candidate for having authored content nobody
can reach. This is precisely what DESIGN.md's Check C automates — and the reason it will
pay for itself is that the seam was not a one-off mistake, it was a **workflow**: rooms and
prose were written by different passes with no handshake between them.

### Pattern B — the prop sweep took the reader with it. Two of the six.

A commit whose stated subject is a visual or furniture pass deletes a prop and, **in the
same hunk**, the interactable bound to it. The commit message never mentions it.

- **`93cab79`** (§2.1) — a game-wide "floor plants → desk plants" pass. 18 floor plants
  deleted; one of them carried `dying_plant`; out it went. **Scar left behind:** an empty
  `// === Golf putter leaning against wall ===` comment that still heads nothing at
  `rooms/index.js:565-566` five months later.
- **`a16d32a`** (§2.5) — an Act-5 gauntlet commit that also tidied the vault's
  interactables. **Scar left behind:** the vault went from two interactables to one.

**The tell: a deleted `dialogId:` line in a `rooms/index.js` diff.** The sweep is cheap and
I have already run it to exhaustion — see §0. **Result: `dying_plant` and `vault_charter`
are the complete set. There is no third severed route in the history.** That negative is
worth having on record: Pattern B is closed, Pattern A is the one that could still be
hiding something if new content lands the same way.

### The prescription

Both patterns are the same underlying gap — **nothing has ever asserted that a written
scene is reachable.** Check C closes it. Two riders worth building in while it is being
written:

1. **Report never-wired and severed separately.** They are different producer decisions.
   A never-wired scene is a scope question ("did we mean to build this?"); a severed scene
   is a regression ("something we shipped stopped working"). Four and two here.
2. **Make Check C's finding cite the git evidence.** `dying_plant` took one `git log -S` to
   diagnose and the answer was unambiguous. If the check prints "no route" without saying
   "and there used to be one, deleted in `93cab79`", the next person re-does this work.

---

## 4. Incidental findings

Three things this dig turned up that are not about the six. None is urgent; all are cheap.

1. **`penthouse_expanded` has no windows** (`rooms/index.js:2041`). `penthouse` carries two
   north-wall window runs; the expanded post-game layout carries none. The 10M AUM
   renovation removes the floor-to-ceiling glass that `penthouse_arrival` narrates as the
   room's defining feature. Blocks half of §2.3 and is a defect in its own right.

2. **Dead branch in `_getDialogId`** (`ExplorationState.js:2737`). The Janitor intro bypass
   tests `npc.dialogId === 'janitor_intro'`, but **no room entry carries that dialogId any
   more** — all nine `janitor` entries either hardcode a story dialog or (the garage patrol
   at `rooms/index.js:1164`, and the `has_rolex` archive entry) carry none at all. The
   intro is still reachable, via the generic `<npc>_intro` template on the garage entry, so
   nothing is broken — but the branch cannot fire and reads as if it is load-bearing.

3. **The act ladder has no act-5 row** (`ExplorationState.js:3092-3101`). Rows exist for
   acts 7, 6, 4, 3, 2. A dialog named `<npc>_act5` would be silently unreachable. **No such
   dialog exists today**, so this is a trap rather than a bug — but it is exactly the shape
   of thing the refactor's route table should make explicit rather than implicit.

---

## 5. Summary for the ruling

- **RESTORE — `dying_plant`.** Severed by a furniture sweep that never meant to touch it.
  Canon-clean, already naming-swept. Four lines across two office layouts; two of them are a
  literal revert of `93cab79`.
- **RESTORE WITH EDITS — `board_room_table`.** Never wired. Three prose edits first: the
  decanter must become the F1 carafe and must be **full**; "seats twenty" → fifteen; the
  portrait line must describe props that exist and must not give the Janitor a rank. One
  line of wiring at `(8,6)`.
- **RESTORE (narrow) — `penthouse_window`.** Never wired. Canon-clean; the Civic callback
  and the "EVERYTHING LOOKS LIKE AN ASSET" plaque exist nowhere else. One line at `(10,0)`
  in `penthouse`. The `penthouse_expanded` twin waits on that room getting its windows back.
- **CUT — `vault_entrance`.** Superseded by the VaultKeypad, factually wrong about a
  keycard the game does not have, and structurally unplaceable without shadowing the door.
- **CUT — `vault_charter`.** Born redundant: `vault_boxes` has held the charter and owned
  `has_charter` since the same commit. `a16d32a` resolved it; ratify that.
- **CUT — `penthouse_terminal`.** Superseded by `algorithm_terminal` on the same prop.
  Port its one unique line ("you appear three times in the appendix") as an appended node.
