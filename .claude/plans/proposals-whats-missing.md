# Proposals — "What Is This Game Missing?"
*Producer pass, run E. Written 2026-07-29. Read-only audit → proposals.*

## STATUS: ALL 24 CO-SIGNED BY ALEX (2026-07-29) — implementation authorized
*(via the run campaign; story/dialog proposals get an Opus 4.6 first-pass
writer per Alex's standing order — homage to the model that wrote the
game's dialog. Alex redlines.)*

## NAMING LEDGER — read before implementing ANY proposal (save-safety law)
Every "Rachel" in this document refers to the VILLAIN. The game is LIVE;
players' saves reference existing flags. Therefore:
- Internal IDs **never change**: `rachel`, `rachel_boss`, `rachel_defeated`
  etc. remain the villain's IDs forever. Her DISPLAY NAME becomes
  **Meredith Sterling** (rename display strings, dialog text, portraits
  labels — never IDs or flags).
- `ross`/`ross_boss` likewise keep their IDs; display name becomes
  **Skip Hartley**.
- A NEW friendly NPC is being added: internal ID `rachel_to` (TO = trust
  officer, per the Opus 4.6 draft), display name **"Rachel"** — kind
  trust officer, real-person cameo, drafted in
  `art/drafts/rachel_dialog_draft.md`. She has NO relation to any flag or
  proposal in this doc. Her portraits (when generated) must be described
  TEXTUALLY to imagegen — never from a real photo (photo privacy rule).
Any brief touching these characters must include this ledger verbatim.

Sources read: `Quest.md`, `Gameplay.md`, `WRITING.md`, `ROADMAP.md` (Part 2), `HANDOFF.md` (top two
entries), `RELEASE.md`, `alexmemory.md`, `src/data/dialogs/index.js`, `src/data/rooms/index.js`,
`src/data/quests/index.js`, plus a full code audit of the engagement systems and the story threads.

---

## The finding

**ROADMAP Part 2 is already built.** C1 (client mutators, negotiation beat, personal bests, whale
referral) — shipped. C2 (all five ally personal missions, four ability unlocks) — shipped. C3 (NG+
with ×1.4/×1.3/×1.2 scaling, carry-over, `lap_two`) — shipped. C4 arcade — shipped and deep
(1551 lines, persistent high score, stat rewards). Only **boss rush** and **C5 ambient life** remain
unbuilt from that plan. The engagement roadmap is not the gap.

The gap is **convergence and carry**. Three specific shapes:

1. **Five character arcs converge on a scene that does not exist.** Ross spends five acts building
   toward a sincere board speech (`dialogs/index.js:1793` → `:3049`); Grandma is recruited as a
   character witness (`:3128`); Isaiah and Diane assemble the evidence for it (`:3097`, `:3069`);
   the Intern makes a 47-slide deck (`:3087`). Then `act6_complete` fires the instant `has_rolex`
   is set (`ExplorationState.js:343`) and the game cuts to the penthouse. The Board Room has no
   NPC after Act 5 (`rooms/index.js:1368`). The convergence point is an empty room.

2. **The mystery's real answer is fully built and never named.** REMEMBERED whisper monitors (4%
   roll, `Furniture.js:150`, texture `MaterialLibrary.js:621`), the Janitor's ledger where every
   entry ends REMEMBERED (`dialogs:4056`), Process 7's 16,202 days of unrequired logging (`:3467`),
   the printer secretly archiving every document the building ever printed (`:2718`), the taped
   label on Rack 7 (`:3491`) — five expressions of one idea (*institutional memory is the
   supernatural force*), and no line in the game ever points at the pattern.

3. **The sincerity is all behind coin flips.** Every one of the game's five best non-jokey scenes
   is optional or missable: the Quiet Floor is a 20%-per-session elevator roll (`ExplorationState.js:760`),
   Process 7 is post-game, Delia and the ledger are Act 6½ / personal missions, Janet's warning
   needs `voice_litigator_high`. The main-path spine carries almost none of the emotional range
   that is already written and paid for. Related: the voice-profile system (`andrew_steadied` /
   `andrew_hardened` / `andrew_invoked_charter`) pays off **only** at the Act 5 Rachel victory and
   is never read again — not in Act 6, 6½, 7, any ending, or the epilogue.

So: most of what is missing is **assembly, not manufacture**. That is a good position to be in two
weeks from a release, and it is why this list is front-loaded with S-cost items.

### Red lines honored

- **Alex's pen rules prose.** Every draft line below is a *placement seed*, not copy. Items marked
  **[PEN]** are writing-load-bearing and should not be drafted by an agent without review.
- **Music is Alex's.** No music proposals. Audio items are SFX/ambient-event only; any request for a
  sting is flagged as a request, never a spec.
- Voice bible respected: every proposed beat is assigned to a character whose anchor already
  supports it (`WRITING.md`). No new speaking archetypes are invented.
- Cost key: **XS** = minutes. **S** = one session, data/writing only, no new systems. **M** = 1–2
  sessions, new room / UI / system. **L** = 3+ sessions.

---

## Ranked by value-per-cost

| # | Proposal | Cost | Category |
|---|---|---|---|
| 1 | Three free fixes (dead code, expiring missions, renovation regression) | XS | Systems |
| 2 | Nobody Says Goodbye — epilogue cards for the people | S | Story |
| 3 | Name the Pattern (REMEMBERED) | S | Story |
| 4 | Floor 13 Is Not a Coin Flip | S | World |
| 5 | Carry the Voice Profile to the Finale | S | Emotional |
| 6 | The Board Meeting | M | Story |
| 7 | The Sixth-Floor Bathroom | S | World / Emotional |
| 8 | The Three Trust Officers Before You | M | Story |
| 9 | Rooms That Keep Working | M | World |
| 10 | The Act Dressing Pass | M | World |
| 11 | Thoughts Pass (per-act, 8 missing rooms, both lines) | S | World |
| 12 | Rachel's Footnote | S | Story |
| 13 | Chad's One Sincere Thing | S | Story |
| 14 | Late-Game Cosmetics | S | Systems |
| 15 | The Performance Review (shareable) + og.png | M | Social |
| 16 | Ambient Event Scheduler | S/M | World |
| 17 | The Trophy Wing Does Something | S/M | Systems |
| 18 | Boss Rush | M | Replay |
| 19 | Second Lap (NG+ knowing-replay lines) | M | Replay |
| 20 | Save Robustness: version shim, error boundary, export | M | Release |
| 21 | The Copy Room and the Supply Closet | S | World |
| 22 | The Daily Client | M | Social / Replay |
| 23 | The Janitor's Name | S | Story |
| 24 | The Roof | M | Emotional |

---

## 1 · Three free fixes (XS)

Three defects the audit turned up that cost minutes and return real content.

**(a) Beneficiary chains are dead code.** `ExplorationState.js:1201` gates chain generation on
`player.getFlag('totalClientsSeen')`, and that flag is **never written anywhere in the codebase** —
so `generateBeneficiaryChain()` / `applyChainModifiers()` (`ClientGenerator.js:472-537`) and the
whole chain queue/toast path (`ExplorationState.js:1185-1223`) can never fire. `portfolioClients`
*is* incremented (`:1108`) and means what the gate wants. One-token fix restores an entire authored
roguelite feature: the Henderson-style multi-client family chain.

**(b) The four office ally missions expire.** Alex/Isaiah/Diane/Janet's personal missions require
`<ally>_recruited` **and** `!act6_complete` (routers at `ExplorationState.js:1767-1816`). A player
who beelines the Rolex loses four missions, four ability unlocks, and 750 XP permanently — and
those missions are ROADMAP C2, the most expensive writing already shipped. Extend the window
through post-game (the Janitor's is already `has_rolex`-gated and survives).

**(c) `renovation_corner_office` is a regression.** Buying it swaps `ross_office` →
`ross_office_large` (`ExplorationState.js:628`), and the large variant has only `ross_desk`
(`rooms/index.js:521`) where the original has three poster interactables (`:460-462`) — so the
renovation *deletes* three claimable posters — and `ross_office_large` has no `ROOM_THOUGHTS` entry,
so it also deletes the room's inner monologue. Copy the interactables across, add the thoughts key.
(Also worth a data-tidy: the three posters in Ross's office are named `poster_rec_1/2/3`.)

*Builds on:* nothing. Pure repair.

## 2 · Nobody Says Goodbye — epilogue cards for the people (S) **[PEN]**

The epilogue (`EpilogueState.js:13-74`) hands dedicated, illustrated cards to a parking officer and
a bus driver, and lumps Janet, Diane, Alex, Isaiah and the Janitor into one shared sentence when
`allies >= 2`. Ross, the Intern, Grandma, Karen and **the Janitor** — the man who plants Page 47,
the charter, the Fiduciary Force, the riddles, the ledger and Delia — have no card at all. He also
loses his NPC placement the moment he hands over the Rolex (`rooms/index.js:1154`) and thereafter
falls through to a three-line generic (`dialogs:969`). Proposal: one card each for the Janitor,
Ross, the Intern and Grandma, plus individualized ally cards gated on that ally's *personal
mission* flag (`janitor_names_complete`, `diane_handbook_complete`, etc.) with the shared team card
as the fallback. Each card is one image + one or two lines — the exact shape the system already
takes, and the art pipeline for it exists (`src/assets/epilogues/`, 8 PNGs). This is the single
highest emotional return per line of code in the project: the goodbye the game has earned and does
not take.

*Builds on:* `EpilogueState.js` card array; `src/assets/epilogues/`; existing personal-mission flags.

## 3 · Name the Pattern (S) **[PEN]**

Five threads express one idea and nobody says it. Proposal: **one** scene, ~8 lines, that lets a
character notice the pattern without explaining it — the Janitor is the right voice (August Wilson
griot: parables that turn out to be literal), Alex is the alternative (Dirk Gently: "I refused to
assume the monitor was lying"). Trigger it off the ledger mission's completion, where Andrew has
just read "every entry ends REMEMBERED" (`dialogs:4057`). Second, cheaper half: give the 4% whisper
monitor a one-time Andrew thought the first time he stands next to one (`STORY_THOUGHTS` already
supports flag-keyed lines, `thoughts.js:80`) so the easter egg becomes evidence instead of noise.
Do **not** explain the Fiduciary Force further — the lore dump already exists at `dialogs:1602`. The
ask is a *pointer*, not exposition. Corollary cheap win: the printer's real payoff (the building has
been keeping its own tamper-proof archive, `:2718`) is the best supernatural beat in the game and
lives in an optional Alex subquest; one line of Andrew's thought after it would let the main path
feel the shape.

*Builds on:* `thoughts.js` STORY_THOUGHTS; `janitor_names_return`; the REMEMBERED texture already
shipping in `MaterialLibrary.js:621`.

## 4 · Floor 13 Is Not a Coin Flip (S)

`floor_13_window` (`dialogs:3438-3451`) is the best-written scene in the game — Andrew alone in a
chair on a floor where nobody works, no jokes, "Five more minutes. Then I'll go save the trust
department." It is gated behind `act >= 5` **and** a 20% roll on a single elevator ride, once per
session (`ExplorationState.js:757-765`). Most players will finish the game without ever seeing it.
Proposal: keep the discovery *feeling* accidental but guarantee it — force the detour on the first
qualifying elevator ride of Act 5 (or raise to 100% until seen), and after the first visit expose a
"13" button in the `ElevatorRide` LED panel so it becomes a place Andrew can *choose* to go. Then
add two more window beats keyed to act (`floor_13_sat` already tracks the revisit), so returning
means something. `floor_13` also has no `ROOM_THOUGHTS` entry — deliberate silence there is
correct; leave it.

*Builds on:* `ExplorationState._changeRoom` detour; `src/ui/ElevatorRide.js` (already a DOM overlay
with an LED floor readout); existing `floor_13_sat` revisit branch.

## 5 · Carry the Voice Profile to the Finale (S) **[PEN]**

"Reasonable Doubt" (`src/data/voices.js`) is a real character system — four internal voices, per-run
counts persisted on `Player.voiceCounts`, threshold flags (`voice_litigator_high`,
`voice_witness_high`, …), and a genuine moral fork where Janet warns Andrew he's becoming the thing
he's fighting and the player answers (`dialogs:2183-2196` → `andrew_steadied` / `andrew_hardened`).
It pays off in exactly one place: the Act 5 Rachel victory (`:2461`, `:2481-2541`). After that the
system is invisible. Proposal: read those same flags three more times — (i) one line inserted into
the Algorithm's four-line defeat (`:3215-3219`, currently the thinnest boss dialog in the game);
(ii) a profile-conditional paragraph in each of the four endings; (iii) one epilogue card, "WHO YOU
BECAME," that names it plainly. Zero new systems, zero new flags — the data is already in the save.
This is the cheapest way to make the finale feel like it was watching.

*Builds on:* `voices.js`, `CombatState.js:864-875`, `EpilogueState`, ending dialogs.

## 6 · The Board Meeting (M) **[PEN]**

Stage the scene the game spends five acts promising. Ross has written a sincere speech and is
terrified of it (`:3049`); Grandma is a character witness with a forty-seven-year client letter
(`:3128`); Diane found the six altered words (`:3954`); Isaiah has the receipts; the Intern has 47
slides. Then the act cuts. Proposal: a Board Room scene between `has_rolex` and the penthouse — not
a fight. A dialog set-piece where the player *feeds Ross his lines*: three or four choice nodes
where Andrew hands him either the buzzword or the true thing, and Ross's speech assembles out of
the player's choices, with the recruited allies' contributions appearing only if their flags are
set (`janet_act6_rallied`, `diane_evidence`, `grandma_ally`, …). Outcome quality can gate the same
`ending_*` options the charter choice already gates, or simply change the room's temperature. The
old, silent board member who stands up, gets a coffee mug and sits on Andrew's side of the table
(`:2500`) is the best unnamed character in the game — he belongs here. **Cost note:** M because the
room, the NPC placements, and the Grandma/ally conditional slots all exist; the work is one long
dialog tree plus NPC entries in `rooms/index.js:1298`. This is the highest *absolute* value item on
the list; it is ranked 6th only because five S-cost items land first.

*Builds on:* `board_room` (empty after Act 5), Act 6 ally flags, `ross_speech_ready`,
`grandma_act6`, `diane_handbook` evidence, the existing multi-condition choice-`requires` mechanism
in `team_chat_hub`.

## 7 · The Sixth-Floor Bathroom (S) **[PEN]**

Diane already tells the player about it in Act 1: "The second one cried in the bathroom for forty
minutes and then quit" (`dialogs:250`). The building has 26 rooms and no bathroom, which for an
office satire is a structural omission and for *this* game is a missed room: it is the only space
where Andrew would be alone with a mirror. Proposal: a small room off the cubicle farm (floor 6 in
`buildingMap.js`) with three interactables — the mirror (a monologue that changes by act: Act 1
rehearsing an introduction, Act 4 not recognizing the tie-straightening, Act 7 nothing at all), the
hand dryer (a joke, load-bearing: the room must be funny before it is sincere), and a scratched
tally on the stall door that pays into proposal 8. No combat, no items, no quest. The one room in
the building that exists purely so Andrew can have a face. Furniture cost is three new factory
methods (`Furniture.js` pattern is well-established, 5735 lines of precedent).

*Builds on:* `Furniture.js` factory pattern; `Room` flag-conditional furniture
(`Room.js:813-818`) for the act-varying dressing; `ROOM_THOUGHTS`.

## 8 · The Three Trust Officers Before You (M) **[PEN]**

Fully seeded, never paid off. Andrew's desk drawer holds a sticky note: "RUN WHILE YOU CAN — T.O.
#3" (`dialogs:1124`). Diane names all three: one quit, one cried in the bathroom for forty minutes,
one had "the parking garage incident" (`:250`). Ross confirms the third had "a nervous event in the
parking garage… he flinches when he hears the word 'beneficiary'" (`:225`). Janet says Karen threw a
stapler at the last one (`:626`). Dave Kowalski reported the fraud by the book in 2016 and "the book
ate him alive" (`:385`, `:2762`). That is four predecessors, three implied locations — two of which
already exist (the garage, the desk) and one of which proposal 7 builds — and a payoff object that
also already exists: the Janitor's ledger, whose new section is literally titled "THE ONES WHO
STAYED" with Andrew as its first name (`:4073`). Proposal: three findable artifacts (garage pillar,
bathroom stall door, archive cabinet), each one line of a person, resolving when Andrew reads their
three entries in the ledger. It costs three interactables and a short dialog, and it converts the
game's running joke about attrition into its thesis: the building forgets, somebody keeps the
receipts.

*Builds on:* `parking_garage` (near-dead, 2 interactables), proposal 7's bathroom,
`janitor_names_*` ledger dialogs, Dave Kowalski's existing printer note.

## 9 · Rooms That Keep Working (M)

Seven rooms go dark and stay dark. `conference_room` — the room all of Act 1 builds toward — has
zero NPCs from Act 3 onward (all three Hendersons are `notFlag *_defeated`, `rooms/index.js:585`).
`board_room` empties after Act 5. `archive` loses its Janitor at `has_rolex` (`:1154`) — the room's
occupant vanishes exactly as the story peaks. `vault` has `npcs: []` and two interactables for the
most thematically loaded space in the building. `parking_garage` (ground floor, the Janitor's home,
the door to the city) has two. `penthouse_bar`, `penthouse_aquarium` and `penthouse_analytics` have
**zero NPCs and zero interactables each** — three rooms of pure trophy. Proposal: one persistent
reason-to-be per room, drawn from characters who are already alive and unemployed after their act —
Grandma knitting in the conference room and counting the exits (she already has that exact line,
`:1411`); the board room repurposed as the war room between Acts 6 and 7; the Janitor keeps his
closet in the garage post-Rolex (which also solves half of proposal 2); the vault gets the ledger's
shelf as a re-readable object. This is NPC entries and conditions in room data, not new systems.

*Builds on:* NPC conditional spawning (94 `condition` entries already in `rooms/index.js`), existing
`*_return` dialogs that are currently unreachable or three lines long.

## 10 · The Act Dressing Pass (M)

Time of day already advances by act (`ExplorationState._applyTimeOfDay`, morning → predawn), but it
only touches the sky and the grade — the *interiors* are identical in Act 7 and Act 1. Meanwhile
`Room.build()` already supports per-furniture `condition: { flag, notFlag }` (`Room.js:813-818`) and
94 entries use it. So an act-progression dressing pass is a **data-only** job: banker's boxes
accumulating in the cubicle farm, a cubicle going dark when someone leaves, restructuring signage
and a nameplate on Rachel's temporary office, the coffee machine's OUT OF ORDER sign in Act 5, the
break room fridge emptying, chairs stacked, the whiteboard's Q2 projections getting crossed out.
Same building, seven moods. This is the highest-yield *visual* item left that requires no art
assets, and it plays directly into the Display Case brief — the lacquered miniature should change
under the light as the week goes wrong.

*Builds on:* existing flag-conditional furniture; `_refreshStoryProgress` act flags; the
renovation-swap precedent (which proves whole-room variants work).

## 11 · Thoughts Pass (S) **[PEN]**

Three defects in one cheap system. (a) `ROOM_THOUGHTS` covers 18 of 26 rooms — missing entirely:
`floor_13` (leave silent), `ross_office_large`, and all six Act 6½ city rooms plus `old_vault`. (b)
Delivery picks **one** of the two authored lines at random on first entry and sets a permanent flag
(`ExplorationState.js:426-431`) — so half of every pair Alex wrote is content the player will never
see. Show both, or show the second on a later visit. (c) Nothing is act-keyed: the cubicle farm
reads the same on Monday morning and at predawn on Friday. Proposal: a second, act-indexed line set
for the eight core office rooms (`ROOM_THOUGHTS_BY_ACT[roomId][act]`, falling back to the current
array). Small function change, mostly writing — and it is the cheapest way to make the world feel
like it is being lived in rather than toured.

*Builds on:* `thoughts.js`; `ExplorationState._showRoomThought`.

## 12 · Rachel's Footnote (S) **[PEN]**

Rachel is the Act 3–5 antagonist and gets exactly one moment of interiority in the whole game: when
Andrew's portfolio is strong she says the win will be "a footnote in my report," and the narrator
adds that she says *footnote* like it costs her something (`dialogs:2449-2450`). That stage
direction is the best thing anyone writes about her. She also has no office, despite Grandma
marching to "the Regional Manager's temporary office" (`:850`), and after Act 5 she does not exist
in the world at all — her lawyers come back as The Firm in Act 6½; she doesn't. Proposal: one
scene, six to eight lines, post-Act-5 — Rachel in the elevator lobby with a cardboard box, on her
way to actual Fargo. Not an apology, not a redemption; the DeLillo register holds. She says the one
true thing she has been managing around all game ("Just like the old janitor. Just like everyone
who works in trust too long," `:2437` — she has watched people break here) and then goes back to
abstraction. It costs one dialog and one conditional NPC entry, and it is the difference between a
satire with a villain and a satire with a system.

*Builds on:* existing Rachel character/portrait/mood assets; `executive_floor` or `reception`
conditional NPC slot; `act5_complete`.

## 13 · Chad's One Sincere Thing (S) **[PEN]**

`WRITING.md` promises it in writing: Chad is "sincere about exactly one thing (eventually), which
should land like a brick." That promise is unpaid. Chad has one break-room idle before Karen's
defeat (`rooms/index.js:371`) and then vanishes from the game entirely — no ending line, no
return, no bestiary afterlife beyond Grandma calling him an idiot (`:3125`). He is the most
disposable named character in a cast where nobody else is disposable. Proposal: a post-Act-5 break
room return, six lines, in the Bret Easton Ellis register right up until it isn't. He is the only
Henderson who was in the room when Harold died, or the only one who knows what the trust was
actually *for* — Alex's call. Cheapest available fix to the cast's one thin spot, and it gives the
Act 2 boss trilogy a third afterlife (Karen has `karen_return`, Grandma has `grandma_return`, Chad
has nothing).

*Builds on:* `chad_breakroom_idle` slot; the `karen_return` / `grandma_return` precedent.

## 14 · Late-Game Cosmetics (S)

Fourteen cosmetics, all with real 3D visuals and no dead unlocks (`cosmetics.js`,
`CharacterBuilder.js:1414-1490`) — but look at *when* they unlock: Acts 1–3 plus one from the
penthouse chain. Nothing comes from Act 4, 5, 6, the entire Act 6½ city chapter, any of the five
ally personal missions, the arcade, the renovations, or the roguelite grind. The reward economy dries
up exactly when the game gets long, which is precisely backwards for the stretch where players are
grinding reception clients to reach level 15. Proposal: six to eight new items keyed to the content
that currently pays nothing — Delia's certification, the Firm's served-papers, the Meter War, all
nine renovations, the ledger, a 25-client streak. The unlock plumbing (`isCosmeticUnlocked`, flag or
quest) and the visual builder pattern both exist; each item is a data entry plus a small mesh
function. Consider one non-stat "outfit" item too: the game is about wardrobe as social armor and
Andrew wears the same shirt for seven acts.

*Builds on:* `cosmetics.js`; `_addCosmeticVisual`; existing city/ally/renovation flags.

## 15 · The Performance Review (M) + og.png (XS)

The game is live at trustissues.alexgallefrom.io and has **nothing to share**. Two parts. (a) `public/`
is empty, so the OG/Twitter tags in `index.html:17,24` point at an `og.png` that does not exist —
every link anyone posts today unfurls broken. That is an XS fix with the `npm run shoot` pipeline
already producing 1920×1080 stills. (b) The game already computes a graded portfolio review
(`calculatePortfolioHealth` → A+ … F, `ClientGenerator.js:542`) and already displays a quarterly
review panel (`ExplorationState.js:1225`). Proposal: render an end-of-run **Performance Review** as
a canvas image in the existing pixel-terminal UI idiom — grade, AUM, clients, deaths, level, ending
reached, best single commission, longest accept streak, which allies stayed — with download and
copy-to-clipboard. It is the artifact a player posts, and it doubles as the epilogue's final card
(which is already a stats card, `EpilogueState.js:65-72`). No backend, no accounts, works on itch
and Vercel identically.

*Builds on:* `calculatePortfolioHealth`, `pb_*` records, `player.deaths`, EpilogueState's closing
card, `tools/shoot.mjs` for the og image.

## 16 · Ambient Event Scheduler (S/M)

ROADMAP C5's one genuinely unbuilt half. There is no scheduler anywhere in `src/` (the only
`setInterval` is the dev panel's status poll) and the SFX bank is twelve entries. The office is
silent between footsteps. Proposal: a small per-room ambient event table — a phone ringing three
desks over and stopping, the printer jamming, an elevator dinging on a floor nobody called, the
fluorescent buzz already implied by the flicker rig, the fridge compressor kicking on in the break
room — fired on a jittered timer with a per-room weight table and suppressed during dialog and
combat. All synthesis, no assets, and it is the cheapest possible upgrade to *inhabitedness*.
Explicitly SFX only: **no music.** If any beat wants a musical sting, that is a request to Alex,
not a spec. Companion item at near-zero cost: the water cooler's three-beat conversation
(`dialogs:265-282`) is exhausted permanently after three visits and then replaced outright by the
team hub — rotate it by act instead of retiring it.

*Builds on:* `AudioManager` synthesis; per-room `lighting.flicker` precedent; `ExplorationState`
update loop.

## 17 · The Trophy Wing Does Something (S/M)

`renovation_penthouse` costs 10,000,000 AUM — roughly ten post-game whales — and buys three rooms
with zero NPCs and zero interactables between them: the aquarium/movie room, the analytics suite
with five mission-control consoles, and the bar with a poker table and a pool table. The most
expensive purchase in the game buys furniture you cannot touch. Proposal, one interaction per room:
the movie screen plays a short reel of the run (reuse the epilogue art); the analytics suite is
where the Performance Review terminal from proposal 15 lives (a mission-control wall is the right
home for a records screen); the bar becomes the post-game team hub — the allies are already written
with a hub dialog (`team_chat_hub`) and they should end up somewhere with a pool table. Also
worth doing at the same time: NPC or thought acknowledgement when *any* renovation lands. Nine
renovations at 5M each have real visual payoffs (all nine verified) and not one character notices.

*Builds on:* `team_chat_hub`, epilogue art, penthouse wing rooms, `renovation_*` flags.

## 18 · Boss Rush (M)

The only unbuilt C4 item, and the cheapest replay content in the project: 25 encounters already
exist (`encounters/index.js`), `CombatState` already accepts `enemyOverrides` and multi-enemy
parties, ArcadeState already persists scores under an `arcade_`-prefixed flag (which NG+ already
carries), and the arcade cabinet in the break room already has a launch path. Proposal: a second
mode on the cabinet, post-`algorithm_defeated` — ten story bosses back to back, no shop, HP carried
between fights, par time, best time persisted, one cosmetic at a clear. Zero new combat content;
it is a mode select and a results screen. Sharpest use of the existing balance work in the game.

*Builds on:* `ArcadeState` mode select, `encounters/index.js`, `arcade_highscore` persistence
pattern, `CombatState` result plumbing.

## 19 · Second Lap (M) **[PEN]**

NG+ is mechanically complete and narratively silent: `ng_plus` appears **nowhere** in
`dialogs/index.js` or `stats.js`, and `ng_plus_count` is written but never read. The second lap is
the same Monday morning with harder enemies. Proposal: ~12 `condition: { flag: 'ng_plus' }`
variants at the highest-leverage nodes — Diane's "the third one is the one who had the parking
garage incident" acquires a fourth; the printer's HELP ME reads differently to someone who knows
what it is; Karen's stapler line; the Janitor's day-one Page 47 hint, which he has now given
twice; the tutorial Intern fight. Plus a handful of NG+ enemy taunts in `ANDREW_TAUNTS`/
`ENEMY_STATS[id].taunts`. Multiplies existing content for writing cost only, and the flag is
already in the save. Read `ng_plus_count` while you are in there — lap three should notice.

*Builds on:* `ng_plus` flag, dialog `condition` nodes, taunt tables.

## 20 · Save Robustness (M)

The game is live and saves are localStorage-only. `SaveManager.save()` writes `version: 1`
(`:22-35`) and `load()` never reads it (`:37-57`); `Player.serialize()` has no version field at all,
contrary to ROADMAP R2. There is **no** `window.onerror` / `unhandledrejection` handler anywhere —
the only failure UI is the pre-boot WebGL check in `index.html`. A crash in Act 6 currently has no
guardrail, and there is no export/import, while `RELEASE.md` already documents that itch-browser,
itch-desktop and Vercel are three separate save pools players cannot move between. Proposal: copy
the pattern that already works — `Settings.js:11,25-29` has real versioning with a migration — into
`SaveManager`; add an error boundary that shows "the building shuddered" and preserves the save; add
save export/import as a text blob, which doubles as the only way a friend can hand a run to Alex
for debugging. Least glamorous item on this list and the only one whose absence can lose a player's
week.

*Builds on:* `Settings.js` migration pattern; `SaveManager`; `main.js` boot.

## 21 · The Copy Room and the Supply Closet (S)

Two spaces the dialog already treats as real. The copy room is where the haunted printer's actual
crime scene happened — "I was alone in the copy room and the printer turned on by itself"
(`dialogs:1580`) — except the printer lives in the cubicle farm and the copy room does not exist.
The supply closet is where Alex finds the pre-2016 toner (`:3697`) and where the Intern hides
(`:1582`). Proposal: one small room off the cubicle farm containing both functions (copier + supply
shelving), three interactables, and the printer's Act-2 spooky beat relocated or echoed there. It
is the cheapest new *room* on this list because its contents are already written; it mostly needs
furniture placement. Bundle with proposal 7 (the bathroom) as a single "floor 6 gets its missing
rooms" session.

*Builds on:* existing `printer_interact` / `alex_printer_quest` chains; `Furniture` copier-adjacent
types; floor 6 plate space in `buildingMap.js`.

## 22 · The Daily Client (M)

The reception roguelite is the replay engine and it has no reason to be opened tomorrow. There is
no seeded RNG anywhere (all 11 client rolls are bare `Math.random()`, `ClientGenerator.js`).
Proposal: a date-seeded client of the day — same client for every player on a given date, one
attempt, graded by the existing portfolio formula, with a localStorage day-streak and a line from
Diane when the streak survives a week. Add an 8-line PRNG (mulberry32) and thread a `rng` parameter
through `generateClient`; the mutator/attribute system it feeds is already built and is exactly the
right shape for a daily (three mutators, wealth tiers, whale rolls). Pairs with proposal 15: the
shareable card is what makes a daily social. Cost is M chiefly because of the RNG threading, which
is mechanical.

*Builds on:* `ClientGenerator`, mutators, `calculatePortfolioHealth`, proposal 15's card.

## 23 · The Janitor's Name (S) **[PEN]**

A planted mystery with no answer. Ross notes that nobody knows his name and that Rachel asked for
it *by name* (`dialogs:1570`). In the secret Architect ending he says "My name isn't 'the Janitor.'
It never was" (`:3366`) — and then never says what it is. He is also the game's one continuity
snarl: the Rolex is "a gift from a client" at `:413`, engraved 47 at `:1863`, and "I've worn this
watch since 1947" at `:3113`, against a stated 22 years as SVP and a ledger begun in 1981. Proposal:
resolve the name, once, quietly, and let the contradiction stand as *his* — the ledger's flyleaf is
the natural place (the player has already read one page of it, `:4056`), and the reveal can be a
single narrator line that changes the speaker label on his last line of the game only. Do not
explain the watch. The ambiguity is load-bearing; the missing name is not.

*Builds on:* `janitor_names_*` ledger mission, ending dialogs, `DialogBox` speaker label.

## 24 · The Roof (M) **[PEN]**

The tower is 23 storeys (`buildingMap.js:16`) and has no top. Proposal: a roof reachable from the
stairwell — the game's second no-combat, no-item space, and its designated two-hander: one short
scene per act with whichever ally is currently closest to the story, in that ally's anchor voice.
Janet with the tumbler and no jokes. Isaiah with the journal. Alex explaining that the HVAC unit's
serial number is also a date. It is the natural home for the sincerity the main path lacks
(proposal-3 territory) and the natural counterweight to Floor 13's solitude: Floor 13 is where
Andrew is alone with the building, the roof is where he is alone with a person. Ranked last of the
world items only because it is the most writing per square foot, and because Floor 13 (proposal 4)
delivers a large fraction of the same feeling for a fifth of the cost. If only one of the two
happens, it should be 4.

*Builds on:* `stairwell` (currently a pure-traversal corridor with no NPC array), per-act ally
flags, `CityBackdrop` (the skyline is already built and the roof is the one place it should be seen
from at eye level).

---

## Deliberate no's

Recorded so nobody spends a session on them:

- **No new combat systems.** Momentum, brace, retaliate, telegraph, vulnerability, phases, party
  allies with ability trees, four internal voices, three client mutators, boss silence-resist. The
  combat is the deepest system in the game and it is done. Boss rush (18) reuses it; nothing else
  should extend it.
- **Do not explain The Algorithm further.** It has no builder, no install date, and one creation
  myth — Process 7's "THE BIG ONE WAS BUILT FROM MY KIND. THEN IT WAS POINTED AT PEOPLE"
  (`dialogs:3466`). That is the correct amount. Surface it (it is currently post-game and missable);
  do not expand it. The Kafka-gatekeeper anchor dies the moment it gets an origin story.
- **No fifth ending.** Four is right and the secret one is properly gated. The work is making the
  four *land* (proposals 2, 5) — the epilogue currently does not vary by ending choice at all.
- **No music proposals.** Ambient SFX only (16). Stings are requests, not specs.
- **Don't rebuild the docs into the pitch.** `Gameplay.md` documents neither the ally party system
  nor the voice system nor NG+ — both are shipped and substantial. That is a documentation gap, not
  a design one; fixing it is 30 minutes and belongs in the release checklist, not this list.

## One-session bundles

If this gets picked up in a single window, these group cleanly:

- **"The Goodbye Session"** — 1 + 2 + 5 + 23. All data/writing, no new rooms, and it fixes the
  finale's emotional landing plus three defects.
- **"Floor 6 Gets Its Missing Rooms"** — 7 + 21 + 8. One furniture pass, two small rooms, one
  three-artifact thread that pays into the ledger.
- **"The World Notices"** — 10 + 11 + 16 + 9. Dressing, thoughts, ambience, occupants. Nothing new;
  the building simply starts behaving like the week is happening to it.
- **"Shipping"** — 20 + 15's og.png. Two hours, and the live site stops unfurling broken.
