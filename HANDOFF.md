# Run G / CUT lane — FIX ROUND 2 — August 4, 2026 (branch `display-case`)

Four notes, in the order the judge set them. All four landed.

**1 — `board_meeting` was radio.** 178 nodes addressing fourteen empty chairs. Twelve generic
suits + a board chair now sit in the room (`board_member_1..10`, `board_member_twelve`,
`board_chair` in `characters.js`; room entries gated on the same
`ross_speech_ready` / `!board_meeting_closed` pair as the ally block, so they assemble and clear
with the scene). Seventeen `stage` nodes appended at 178-194: Skip crosses to the head of the
table before node 3 describes him there; Andrew steps to `table_edge_s` when the meeting is called
to order; **every ally that actually contributes steps out to the table and back** (`wait: false`
on the step-back so it plays under the next line); Skip takes the head chair on his closing line;
tier 0 puts him back on his feet before node 154 calls him "still standing"; BLOCK H walks him
back to Andrew. Measured (`screenshots/g-run/cutscenes/board_meeting/motion.txt`):
player 1.89, ross 15.13 (135 seated frames), diane 3.87, intern 3.47, isaiah 0.87, janet 3.47,
grandma 5.82 tiles — **non-zero for every speaking actor** — and 0 tiles for all twelve suits.
Cost of the bodies, measured: **p50 +0.70 ms, p95 +1.90 ms** in that room only (5 → 18 visible NPCs).
Three seats stay open by design: the head chair (Skip's), and SOUTH x:8/x:9 (node 127's "empty
chair on Andrew's side"). **The Board Member's tier-3 crossing is still deferred** — that one is a
casting call, not a builder's.

**2 — eight blind posters.** `rotation` sets `mesh.rotation.y` and theta → (sin, cos), so
`Math.PI` (south wall) and `-Math.PI/2` (east wall) point a poster's *back* at the camera. Eight
were mounted that way, `quest_atk_1` among them — a stat reward the player could reach and not
read. All eight moved to a north (z 0.1, rotation 0) or west (x 0.1, rotation Math.PI/2) wall with
their interactables. **`npm run validate:data` now fails the build** on either rotation for
`motivationalPoster`/`executivePoster`, so the law is enforceable rather than advisory.
Plates: `screenshots/g-run/cutscenes/posters_after/`.

**3 — the executive-floor occluder** was `elevatorDoors` at (8,11), not a `building_shell` column
(ledger concern #5 corrected). The south wall already fades to 0.16 when the player walks behind
it; the thing bolted to that wall did not, so it stood at opacity 1.0 over Andrew for the whole
seated act of `secret_ending`. `Room._registerWallProp` folds wall-mounted props into the same
fade — geometric test (within 1.4 tiles of the wall line, bounding height > 1.2 m), not a type
list, so 18 props across 8 rooms are covered for free. Materials are cloned once per distinct
source material (without the dedupe the vault's lockbox banks alone made 544 clones).
Measured wall/prop opacity 0.16/**1.0 → 0.16/0.16** near the wall, back to 1.0/1.0 away from it.
A/B plates: `screenshots/g-run/cutscenes/occluder/`. `secret_ending` re-shot, video replaced.

**4 — `the_firm_ambush` leader.** `spawnAt` only applies to bodies the director CREATED;
`old_vault` carries a retry-only `firm_partner`, so `_resolveActor` returned it and the leader
started at his retry post (2,4) and walked *toward* the stairs the other two were walking away
from. New **`teleportTo`** verb snaps a pre-placed actor before the walk destination is measured.
Re-shot: all three now start at ~(0.9, 1.5) — the `stairs` mark — and walk out to firm_a/b/c.

**Also taken (both listed as cheap extras):** `charter_challenge` spawns the Janitor for his five
lines and walks him out (no prose touched — the structural-equivalence gate still reads 0 changes);
`compliance_defeated` no longer walks the Auditor out of the building, because they have a second
`executive_floor` entry as the crossword post and were back at (13,6) on the next room entry. They
now cross to `board_door` and stay.

**Not done, on the judge's instruction:** ledger concern #4 (Karen — retracted, `isFirstKaren`
sets `retry_karen` on every outcome of the first fight); the prop/handoff verbs (Rolex, cane,
binder, cookies, putter); re-proving the primitive, the seat census, the rotation correction or
the poster east/west call.

Gates: `_g-stage-verify` PASS (275 trees, 23 with stage nodes, **0 structurally changed**, 103
beats resolved). `_g-seat-census` **25 seated / 0 faults** (was 13/0). `_ux-dev` **0 duplicate
visible NPCs** across all 7 presets and 26 rooms — the number that matters most, since this lane
added twelve NPCs to one room. `_ux-world` B2 = 0 NPCs on blocked tiles, S1 = 0 dead posters.
`_ux-smoke` 11/11. `npm run check` exit 0.

---

# Run G / UX lane — FIX ROUND 2 — August 4, 2026 (branch `display-case`)

Three notes from the judge panel (D1–D4). All three answered.

**D1 + D2 — the pause key could bury a committed transition.** `dialog-end` commits a fight
(300 ms), a queued dialog (500 ms) or the epilogue (900 ms) and *then* pushes. Exploration stays
top-of-stack and `paused` stays false for that whole window, so one Escape inside it pushed
`MenuState` and the fight landed **underneath** it — measured before the fix at
`ESCAPE at +216 ms -> WEDGED=true`, stack `[ExplorationState, MenuState, CombatState]`.
Fixed with **one source of truth**, `ExplorationState._transitionArmed()`, which now gates both
doors (`_interact()` and the `isCancelPressed()` branch of `update()`) and carries the two
epilogue terms the old inline guard never had. The epilogue got the `_epilogueArming` latch it
was missing, mirroring `_combatArming`. Defence in depth on top: the combat and epilogue timers
now defer on `menuOpen` exactly the way the dialog timer already did, and **`resume()` flushes
both** — a deferral with no flush would lock the interact key for the session, which is worse
than the bug. `MenuState` gained a cosmetic `pause()`/`resume()` pair so any future burial hides
the panel instead of floating it.

*Deadlock audit:* every term in `_transitionArmed()` is transient. `_pendingCombat` /
`_pendingDialog` / `_pendingEpilogue` clear at the top of their handler branch and are re-set only
on the menu-open deferral path, which `resume()` always drains; the three `*Arming` latches clear
synchronously inside their own timers. The one term worth watching, `_pendingDialog` re-set at the
menu-open check, can only be set while a `MenuState` is on the stack — `ExplorationState` is not
updating then, so the pause key is not readable and there is no lockout.

Measured after: Escape at **+122 / +193 / +303 ms** after `dialog-end` all give
`WEDGED=false`, stack exactly `[ExplorationState, CombatState]`, `MENU DOM {present:false}`.
Pause key unregressed: one Escape opens `MenuState` in plain exploration and again after the
Grandma post-fight dialog is dismissed. Epilogue sibling: Escape inside the 900 ms leaves
`[ExplorationState, EpilogueState]`, no `MenuState`.
Evidence: `screenshots/g-run/ux/round2-*.png`, `dev-round2.json`, `s3-round2.json`.

**D3 — the `showMainMenu` law was false.** `CombatHUD.show()` ended with a bare
`this.showMainMenu()`, contradicting CLAUDE.md's "exactly one caller / never bare". Deleted.
`CombatState._enablePlayerInput()` repaints with all eight arguments before input is enabled, so
nothing is lost — measured `.combat-actions` = 4 buttons (`Attack/Special/Brace/Item`) the moment
input goes live. The empty panel that the deletion exposed during the 1.7 s enemy-intro beat is
handled in CSS (`.combat-actions:empty { display: none }`), not by restoring the call:
intro frame is now `display:none, 0x0`. The law is true.

**D4 — known orphan text nodes, do not re-file.** `alex_badge_audit_return` node 13 and
`janet_vacancy_return` node 10 are orphan `text` nodes. They are invisible to `validate:data`
**by design** — the reachability gate only checks nodes that pay a reward
(`give_item`/`give_xp`/`modify_stat`/`heal`/`recruit_ally`/`unlock_ally_ability`). Pre-existing,
not a regression from this lane.

---

# Run C FIX round 2 — July 31, 2026 — producer critic pass (branch `display-case`, uncommitted)

Six notes ([A1]-[A6]) on the Run C gameplay wave. **All six addressed.** Nothing committed, nothing
merged. `npm run validate:data` green, `npm run check` green. Every new player-facing string was
first-drafted by **Opus 4.6 via CLI** per the standing order and wired verbatim.

| # | Note | Fix | Files |
|---|------|-----|-------|
| A1 | The memo ladder paid out from the settings menu — `noteReviewLevel()` fired on the shop TOGGLE, so 40 CP could be switched on, all four Meredith memos read, and everything switched back off without a round fought. | High-water is now written in the combat victory path, from a level snapshotted at fight START. `unlockedMemos()` reads only `pb_review_level` (it used to `Math.max` in the live level). The tab shows *active* vs *on file* and says what closes the gap. | `data/review.js`, `states/ShopState.js`, `states/CombatState.js` |
| A2 | Unmeasured whale EV distortion — `generateDayClient`'s asset-floor rejection sampling re-rolled the 5% whale chance up to 12x per slot, and a whale always clears the floor and breaks the loop. Measured 4.08% walk-in vs **12.35%** on day slot 4. | The whale is rolled **once per slot** before the retry loop; `generateClient` takes a `suppressWhale` flag for the retries. Re-measured flat at ~5% on every slot. New `day-sim.mjs --whale` audit is the regression test. | `data/ClientGenerator.js`, `tools/day-sim.mjs` |
| A3 | Day-scoped stat boons leaked into story fights — Firm Handshake / Deep Breath are repeatable, and leaving Reception mid-day is allowed, so ~+9/+9 could be carried into a boss. | Boons are now **floor-scoped**: `revokeDayStats` on leaving Reception, `applyDayStats` on return, via `_syncDayStatScope(roomId)` in the room-load path. The day record is untouched — a pause, not a forfeit. Legacy in-flight days (no `statsApplied` key) read as applied. | `data/billableDay.js`, `states/ExplorationState.js` |
| A4 | CASUAL archetype out of the 40-85% band at documented intended levels; no God Mode analogue, no QTE-widening cosmetic. | **Performance Improvement Plan** (Hades God Mode: 20% + 2%/death, cap 80%, opt-in, **0 RP**, locks nothing out) and **Ergonomic Wrist Support** (accessory, +40% Brace window / -20% Retaliate damage). At the PIP's floor, CASUAL clears 40% on every documented rung. | `data/review.js`, `combat/CombatEngine.js`, `states/CombatState.js`, `data/cosmetics.js`, `entities/CharacterBuilder.js` |
| A5 | NG+ top rung was a wall, not a ladder — `rachel_boss` 1.0% / `algorithm` 4.0% at CARRY@NG+3, contradicting the code comment beside the constants. | Per-lap Patience scaling 1.35 -> **1.15** plus a new `NG_PLUS_LAP.decay = 0.35` that softens **only** lap 3 (laps 1-2 have exponents 0 and 1 at any decay, so those columns are bit-identical). NG+3 finale now 29.8% / 35.6%. | `combat/CombatEngine.js`, `tools/ng-sim.mjs` |
| A6 | Dead gate row — `vault: { flag: 'vault_accessible' }` in `gatedRooms` is unreachable behind the keypad intercept. | Row removed, replaced with the same NOTE the `archive` row already carried. `CLAUDE.md`'s room-gating bullet corrected to match (it still listed both). | `states/ExplorationState.js`, `CLAUDE.md` |

**Save-safety.** New flags only (`pb_review_level` already existed; `rp_pip` / `pip_active` /
`statsApplied` are new). No renames, no removals, no schema growth. Verified against a hand-built
legacy save and a legacy in-flight day record: both load, play, and round-trip.

**New harness modes** (all report-only, nothing written back to `src/`):
`combat-sim.mjs --pip` (the CASUAL floor ladder), `combat-sim.mjs --relic` (the Brace/Retaliate
trade under two aim models), `ng-sim.mjs --hpscale` and `--lapdecay` (the two NG+ sweeps),
`day-sim.mjs --whale` (whale rate + AUM share, day vs walk-in).

**One finding worth a producer's eye.** With whales counted on both sides at the corrected rate, the
**solo** Billable Day's AUM/fight ratio against walk-in spam is x0.87-x1.03 — a coin flip, not the
x1.10-x1.14 the old whale-free-only table implied — because a forfeited solo board voids a whale's
$1M-$2.5M fee that a walk-in banks on the spot. With a party it is clearly positive (x1.28-x1.40).
Documented honestly in `Gameplay.md` rather than rebalanced; Diane already warns solo players out
loud, and recruiting is the intended answer. Flagging it in case you want the premium re-priced.

---

# Run F1 FIX — July 30, 2026 — convergence wave pre-gate (branch `display-case`, uncommitted)

Producer critic pass on the Run F convergence wave returned nine notes. All nine addressed.
Nothing merged to main; nothing committed. **`npm run validate:data` green, `npm run check` green.**
Prose for every changed line was first-drafted by **Opus 4.6 via CLI** per the standing order —
brief + output: `art/drafts/f1_fix_draft.md` (sections A–G). Wired verbatim except where a
mechanical node-flow change is logged below for countersign.

## Producer decisions still open — READ BEFORE PLAYTEST

1. **Two triads await your call (WRITING.md anti-LLM rule 1).** Left as written; alternates are
   drafted and ready to paste from `art/drafts/f1_fix_draft.md` §G.
   - `src/data/dialogs/index.js:3439` — Narrator, worst board-meeting tier: *"…collect their
     phones, their pens, their untouched water glasses."* Alternate cuts "their pens."
   - `src/data/dialogs/index.js:3314` — Diane on the floor: *"I know their names, their children's
     names, and which ones bring donuts on Fridays."* Alternate cuts "their names."
   - A third triad, Isaiah's *"Every one acquired… Every one 'restructured.' Every one dissolved…"*
     (`:3339`), is earned anaphora and was deliberately left alone.

2. **Five epilogue plates do not exist.** `epilogue_janitor` / `_skip` / `_intern` / `_grandma` /
   `_voice` are referenced by `EpilogueState` and absent from `src/assets/epilogues/`. Prompts,
   style prefix and constraints are now written up in **`art/PROMPTS.md` → "Epilogue Card Art —
   OPEN REQUEST"**; the pipeline is `codex exec` + `$imagegen2`, same as the portraits. Until they
   land, `_renderCard` draws a plate-pending frame so the sequence keeps its rhythm instead of
   collapsing to bare text mid-sequence. **This is the last unfinished piece of proposal 2.**

## Placement change, logged (spec deviation from proposal 6)

The proposal placed the Board Meeting *"between `has_rolex` and the penthouse."* The wiring puts it
**before** the Rolex — entry is Skip in the Board Room on `ross_speech_ready`, and it closes on
`board_meeting_closed`. That matches the acceptance criterion and is the better scene order (the
Rolex is the ascent, not the argument), but it had never been written down anywhere. It is written
down now. Consequence: taking the Rolex ends the meeting forever, which is note (a) below.

## Fixes

| # | Note | Fix |
|---|------|-----|
| 1 | **Continuity, flagship scene.** Skip attributed Janet's 1994 pen-on-folders detail to Diane, and Janet reclaimed it verbatim 35 nodes later in the same meeting — with Diane stating her nineteen-year tenure (started ~2007) in between. | `dialogs/index.js:3247` Diane → **Janet**. Draft-inherited; `art/drafts/board_meeting_draft.md` corrected in place with a `[F1 CORRECTION]` marker so it cannot re-mint. |
| 2 | **Wrong flag key.** The printer-archive payoff thought was keyed to `printer_quest_done` (the Act-1/2 toner fetch) and fired acts before Andrew knew about a port or an archive. | `thoughts.js` rekeyed to **`quest_network_ghost_complete`** (`dialogs/index.js:2777`), which is the archive reveal. |
| 3 | **Ending contradiction.** Skip's "sits in the board room fifteen minutes before the meeting" card was gated only on `board_meeting_held`; in `ending_dissolution` the department is gone and he has been relocated to "a corner office in a building with no corners." | `EpilogueState.js` Skip card now branches **dissolution first**, then `board_meeting_won`, then `board_meeting_held`, then default — four variants, new prose (§E). `board_member_spoke` appends the seat-twelve line to the top variant. |
| 4 | **Latent bug + spec shortfall.** The team card's ally counter read `isaiah_act6_rallied` and `alex_act6_rallied` — neither written anywhere in `src`. Max 3/5, so `allies >= 5` → "All of them" was unreachable and a full-rally run got the diminished line. The promised individualized ally cards were never shipped. | Counter now reads the five real flags: `janet_act6_rallied`, `diane_act6_rallied`, `isaiah_evidence`, `read_alex_it_act6`, `janitor_rallied`. Five per-ally lines added, each gated on that ally's **personal-mission** flag (`janet_vacancy_complete`, `diane_handbook_complete`, `alex_badge_audit_complete`, `isaiah_receipts_complete`, `janitor_names_complete`), shared sentence retained as the closing line (§F). |
| 5 | **Missing plates.** | See "Producer decisions still open" #2. |
| 6 | **Triads.** | See "Producer decisions still open" #1. |
| 7 | **Janet explains the joke.** "Pen doesn't have an undo button. Neither does trust." | `:3309` — second sentence cut. The thirty-one-pound drawer two nodes later carries it. |
| 8 | **Self-echo inside one ending.** The hardened Dissolution coda reused the reclining seats and the trunk-of-filing-cabinets jokes from node 7 of the same ending, nine nodes earlier. | `:3723` rewritten — *"The parking meter has never expired."* |
| 9 | **Silent point of no return.** `has_rolex` derives `act6_complete` → `board_meeting_closed`, which closes the meeting forever, and `janitor_act6` handed the watch over with no warning. | Warning line + a two-option choice inserted in `janitor_act6`. WAIT branch writes **no flag** and the scene is fully re-enterable (its room condition is `act6_ready && !has_rolex`, unchanged). |

## Mechanical deviations from the 4.6 draft — countersign please

- **`janitor_act6` renumbered.** 4.6 wrote the warning, the prompt, both option labels and the
  WAIT response as prose; turning that into a `choice` node required inserting two nodes and
  renumbering 3→11 (old end node 8 is now 11). No prose was altered. The TAKE branch is byte-identical
  to the old linear path.
- **Alex's ally signal.** 4.6 had no say here; `alex_it_act6` sets no flag of its own, so rather than
  minting a new one (which existing saves could never have) the counter reads the automatic
  `read_alex_it_act6` that `DialogState._endDialog()` already writes. Save-safe by construction.
- **Plate-pending frame** in `EpilogueState._renderCard` is new code, not draft prose.

## Observed, not fixed (out of scope for F1, no note covered it)

`ExplorationState._getDialogId():1732` gives the Janitor's riddles priority over his hardcoded
`dialogId` for the whole game from act 3 onward. A player who reaches `act6_ready` with riddle 1
unfinished gets the riddle instead of `janitor_act6` and must clear all three before the Rolex
scene is reachable. It resolves itself (the riddles are completable and repeatable on failure), so
it is a detour, not a block — but it is an unintended gate on the finale and worth a decision.

## Files touched

`src/data/dialogs/index.js` · `src/data/thoughts.js` · `src/states/EpilogueState.js` ·
`CLAUDE.md` (Key Story Flags: 10 new rows incl. the previously write-only `board_meeting_won` /
`board_member_spoke`) · `art/PROMPTS.md` · `art/drafts/board_meeting_draft.md` ·
`art/drafts/f1_fix_draft.md` (new)

---

# The Campaign — July 29–31 — Runs A/B/F1/C (branch `display-case`, HEAD fc8ac61)

**Producer-cosigned campaign, executed across two nights.** Commits:
`cabc1de` Wave-5 final chars → `91206ec` HUD legibility → `c506182`+
`8864a75` Run A (renames Meredith Sterling/Skip Hartley display-only per
the SAVE-SAFETY NAMING LEDGER in `.claude/plans/proposals-whats-missing.md`
— read it before touching those characters; Rachel/`rachel_to` wired;
elevators canonical; blueprint pulse; og.png/error-boundary/save-shim) →
`cd91112`+`706e9bc` Run B PASSED (perf harness `npm run perf`; shadow
cadence; Room.dispose leak; N8AO retune; garage tear; tier governor) →
`1f23a58` Run F1 (BOARD MEETING 177-node set-piece + Name the Pattern +
Floor 13 button + voice-carry + goodbye cards; all prose Opus 4.6 —
standing order: 4.6 first-drafts ALL dialog via `claude -p --model
claude-opus-4-6`, wire byte-identical, producer redlines IN PLAYTEST) →
`fc8ac61` Run C (Locks/Break/agency economy; THE BILLABLE DAY; vault
keypad 47-19-82; respec; Review Points; NG+ fix; sim-verified).

**Open threads:** Run C's round-3 critics died to the 5h usage cap — a
05:47 cron resumes `wf_651657f7-5fc` for the final verdict (resume:
`Workflow scriptPath .claude/../workflows/scripts/trust-issues-run-c-*.js
+ resumeFromRunId wf_651657f7-5fc`). Board: #8 Audio (music AUDITIONS
invited by Alex — his veto), #10 remaining proposals, #11 JOINT character
pass (imagegen refs + img2threejs — WITH Alex only; his morning gate;
face-topology bible amendments are the bar; epilogue-card art rides
here). Alex's playtest-redline list is in alexmemory.md NEEDS YOU. NO
MERGE to main (game live on his site) until he says.

# Wave 5 addendum — July 27 ~17:55 — AAA CHARACTER PASS (commit 7a31dd9)

Alex's colleagues' critique ("scrunched/scary faces, lumpy bodies,
caricature") drove a v6 pass. **`art/CHARACTER_BIBLE.md` is now LAW** for
all character work (proportions, Sleek Law, Pleasant Neutral, anti-
caricature caps, matte-skin, staging). Canonical identity = the dialog
portraits in `src/assets/portraits/<id>.png` — every 3D head must read as
the same person. Reference packs (gitignored): `art/char_refs/game+human`.
**Won this wave:** adult proportions 6.5–7.3 heads · single-loft limbs
(no joint spheres at 5×) · open catchlight eyes on andrew/karen/chad/
intern · combat face-key (horror under-lighting dead) · allies face the
enemy back-¾ · monolith untouched.
**Punch list (round-2 critic notes, pixel-measured — next session start
here, the critique loop resumes via `wf_6184a4d6-35d` journal):**
1. Grandma: head −30% (she's 3.6 heads = lone chibi), hair shell cut at
   jaw (bearded-egg silhouette), eyes behind glasses need sclera+catchlight.
2. All heads: jaw spans ~100% of cranial width — taper ~15% below cheekbones.
3. All five: trouser pelvis dome ("diaper bump") — merge into trouser
   loft, drop trouser sheen to satin.
4. Karen: level the resting brow, unify face/head skin albedo (porthole
   seam), rebuild bob per portrait (asymmetric platinum, dark underlayer),
   arm length (fingertips must reach mid-thigh).
5. Chad identity: portrait cues missing — backwards cap, stubble band,
   chain, squared jaw (within 1.15 clamp).

---

# Session Handoff — July 27, 2026 — THE DISPLAY CASE REBUILD (overnight, branch `display-case`)

**What happened:** the queued director-mode AAA pass ran end-to-end in one
overnight watch. Seven commits on branch **`display-case`** (683c0bd →
5c945d8), main untouched. Art bible (ruled live with Alex): *"a lacquered
miniature of corporate life — Severance-lit inside, parked in a Drive
2011 / Tron: Ares night — with fights shot like Clair Obscur."* Full comp
card with adversarially-verified citations: `art/COMP_CARD.md`. Plan +
lane specs: `.claude/plans/display-case-rebuild.md`. Running ledger for
Alex: `alexmemory.md` (root). Session craft laws (ISO CAMERA LAW etc.):
auto-memory `display-case-craft-lessons`.

**Wave tour (each commit message has detail):**
1. `44781cb` post stack — TiltShiftPass (ortho-gated), N8AO, GradePass
   (now the chain's SOLE output transform — fixed a linear-as-sRGB
   display bug; combat/title were authored against the broken transform),
   RetroPass off by default = "1998 MODE" settings toggle.
2. `68202bf`+`a2b8aad` interiors/materials/night — Severance troffers with
   real housings, per-room rigs, MaterialLibrary v2 (49 exports preserved,
   physical/clearcoat tiers, ProceduralNormals.js), obsidian seam-light
   city, wet-asphalt street kit, neon floor ghosts, EXIT-sign hum.
3. `8ceb05b`+`9677007` CHARACTERS — CharacterBuilder v5 + FacePainter v5
   (the one consistent playtest criticism, addressed): real-proportioned
   figures, six working expressions, glasses as geometry, scalp-conforming
   hair, 23–32 draw calls/char, `options.detailed` now real (physical tier
   in combat / cheaper in rooms). All 36 human configs have v5 face fields.
4. `5c945d8` combat cinema — `src/combat/CombatCinematics.js` timeline
   sequencer (per-tag ability cinematics, POWER_MOVE, ENEMY_HEAVY
   anticipation, intro banners), camera rig over `_basePos`, per-venue
   arena palettes (`arena` field in encounters), actor wind-up→strike→
   recoil beats, impact sparks on the contact frame.

**New tools:** `tools/cine-shoot.mjs` — captures REAL-input 8-frame attack
bursts to `screenshots/cine/` for motion verification (read them as a
contact strip). `art/comp_refs/` (gitignored) holds official comp stills +
MANIFEST for critic agents.

**Punch list (small, 3×-zoom class — none block a playtest):**
- Prop grips are contact not grasp at 3×+ (Chad's shake, Karen's pencil).
- Knee crease arcs where kneecap meets thigh capsule at 3×+.
- Karen left-heel sliver below the pump; grandma cane-swipe burst unverified on-frame.
- Wind-ups are stylized rear-back+lunge, not full overhead cocks (deliberate).
- Seated-NPC read needs one close-framed verification still (shoot harness has no close room shot).
- Perf: post chain + v5 characters need a real-hardware FPS pass (budget: 60fps mid laptop; degrade order AO → tilt-shift half-res → bloom half-res).

**Gotchas for the next instance:**
- GradePass must NEVER be disabled — it owns tone map + sRGB now
  (neutralize via `strength`, not `enabled`). `renderer.toneMapping` is
  deliberately NoToneMapping.
- Tilt-shift/AO gate on `camera.isOrthographicCamera` — combat gets none.
- CharacterAnimator's `GESTURES` table owns combat pose keyframes;
  CombatScene drives them via `playGesture`.
- The ISO CAMERA LAW (see auto-memory): light must read via camera-visible
  surfaces + authored fakes; specular physics won't deliver into an ortho iso cam.
- `npm run editor` balance/room editor untested against tonight's changes —
  verify before publishing balance from it.

**Next (by value):** Alex + Andrew playtest → their notes are frame data ·
L6 ambient life (walk/idle polish on v5 bodies, watercooler events) ·
R-phase (itch deploy, save versioning, smoke test) per ROADMAP · merge
`display-case` → main after Alex's review.

---

# Session Handoff — June 11, 2026 (Sprints 4+5, Session 9) — OVERNIGHT IN FLIGHT

**Morning protocol (whoever wakes first, human or instance):**
1. THREE background agents were running at session end. Their work is COMMITTED but NOT pushed:
   - P5 agent: character cloth textures + silhouette (CharacterBuilder/FacePainter/MaterialLibrary only)
   - P6+P8 agent: logic-report MAJORS + fixtures pass (rooms/dialogs/ExplorationState/Furniture)
   - Codex agent: 8 epilogue vignettes → src/assets/epilogues/ (1024px raws — downscale to 512,
     archive raws to art/, commit; System.Drawing snippet in the Session 6 handoff below)
2. Review: `git log origin/main..HEAD --oneline`, spot-check `git show` per commit + contact
   sheet (`npm run shoot`, open screenshots/contact/index.html), `npm run check > c.log 2>&1;
   echo $?` (NEVER pipe check to tail — masks crashes), then push.
3. Sprint state: `.claude/plans/overnight-sprint-5.md`. Audits: s5-logic-report.md (8 MAJOR
   with the agent; 17 MINOR open), s5-balance-report.md + reusable sim s5-balance-sim.mjs.

Session 9 shipped (all pushed): floor-height engine + true terraced stairwell (thin slabs,
riser contact shadows, east-wall top door, people-sized doors, doorStyle:'none' elevator
exits), near-wall auto-fade, ElevatorRide overlay (doors/LED/ding + Quiet Floor detour),
RetroPass (Bayer dither + 5-bit quantize + grain + per-hour grade; Engine.setRetroPass),
street ground fog + mist, desktop zoom 10.5, settings menu (core/Settings.js), 3 CRITICAL
logic fixes (Firm dead-end -> the_firm_retry; Alex act2 ceiling; ESC no longer aborts
dialogs), combat balance applied (13 enemy overrides, 6 ability tweaks, boss silence-resist,
HEAVY telegraph tag — chad/compliance/regional were literally 0-2% winnable), EpilogueState
(flag-driven ending cards), floor_13 Quiet Floor.

New gotchas (Session 9): exits need E ("Go through") — they don't auto-fire on stand.
`window.__explore` = DEV_MODE debug handle. Multi-level rooms: `floorZones` in room data;
doors/markers sit on their terrace; walls extend down but door height stays 2.5 (pass the
constant to _addDoorFrames, NOT wallHeight).

---

# Session Handoff — June 11, 2026 (Sprint 3: PS1 models, Session 8)

Full detail: `.claude/plans/overnight-sprint-3.md`. NEXT RUN: `.claude/plans/overnight-sprint-4.md`
("The Building Is Real" — Alex's brief: street-level skyline mode, garage elevator, real
stairwell stairs, one canonical building map for the ghost tower).

## What Was Done

1. **PS1 model direction** — co-creator rejected caricatures; four direction boards generated
   (art/direction/karen_dir_*.png); Alex picked **C+A hybrid, applied everywhere**.
2. **CharacterBuilder v4 + FacePainter** — realistic ~5.75-head proportions, segmented
   chest/pelvis torso, two-piece pre-bent limbs, tapered box heads, **painted canvas faces**
   (FacePainter.js): expressions are texture swaps; `config.tone: silly|scary|normal` drives
   feature exaggeration + body-palette desaturation (scary = board-A muted). 14 tone fields in
   characters.js. Face plane is MeshLambert (MeshBasic glows under bloom). Beards painted into
   the texture. Sitting uses `group.legLength`.
3. **Fennimore Avenue open-air** — walls:false; new `facadeStrip` (left-anchored storefront
   canvas fronts, full-width blocking via special case in Room._placeFurniture) + `curb`;
   exit markers now render for wall-less rooms.
4. **Multi-enemy camera** — CombatScene pulls to z 5.9 when enemyIds.length > 1.
5. **7 new achievements** (countersigned/served/gray_area/on_time/rememberer/finished_shift/
   lap_two) + ACT_ACHIEVEMENT_FLAGS extended; Quest.md (Act 6½ + personal missions + post-game)
   and Gameplay.md updated.
6. **Delia mood portraits** (angry/smug/worried, 256px).
7. **Audio overhaul agent IN FLIGHT at session end** — see sprint-4 carryovers for the review
   protocol. Uncommitted diff expected in src/core/AudioManager.js + ExplorationState.

## New gotchas (Session 8)

- **Pipes mask exit codes**: `npm run check | tail` reports success even when the validator
  CRASHES. Use `npm run check > log 2>&1; echo $?`. This bit us once (committed on a false pass).
- **FacePainter is headless-guarded**: returns null/{} without `document` (the validator builds
  a Player under Node). Never remove the guard.
- **facadeStrip/curb are left-anchored** (place at leftmost tile; variant = width/length).
- **Expression API unchanged** (`setExpression(name, hold)`) but it swaps faceMesh.material.map
  now — old face-rig fields (browL, mouths…) no longer exist.
- Tone colors run through `toneColor()` in CharacterBuilder — editor color overrides apply
  BEFORE desaturation, so edited colors shift slightly for scary/normal characters.

---

# Session Handoff — June 10–11, 2026 (Sprint 2 + Mobile, Session 7)

Full detail: `.claude/plans/overnight-sprint-2-2026-06-10.md` (status, gotchas, follow-ups) and
`.claude/plans/countersignature-design.md` (city chapter design). **Live on Vercel** —
trustissues.alexgallefrom.io auto-deploys from origin/main.

## What Was Done (the "100-day" run)

1. **Screenshot pipeline** — `npm run shoot` (tools/shoot.mjs): headless 1920×1080 captures of
   every room + boss into `screenshots/contact/index.html`. In-game fixtures:
   `?dev&fixture=act7&shot=server_room` / `&fight=karen` / `&hud=0`. This replaces MCP-browser
   verification entirely.
2. **Low-poly caricature characters** — CharacterBuilder v3: icosahedron heads, hex-cylinder
   torsos (taper param), real faces (brows/nose/jaw/5 swappable mouths), expression rig
   (`CharacterAnimator.setExpression`) wired to combat events + dialog `mood`. Faces drop under
   hair/hats (FACE_DROP map); held accessories anchor to computed hand positions; beard support
   (alex_it, janitor, Earl).
3. **Environment** — server room reworked (hot/cold aisles, cable trays, Alex's 6-monitor wall,
   rack LED canvas panels), archive darkened (dark-wood cabinets, single hanging bulb).
4. **The world outside** — CityBackdrop (64 towers, lit windows, beacons, car streaks, cloud
   shadows) + BuildingShell (blueprint ghost tower around every interior room, six storeys deep,
   warm ghost rooms beyond every exit). Time-of-day advances by act (Engine.setTimeOfDay).
5. **Act 6½ — The Countersignature** — mandatory city chapter between the Rolex and the
   penthouse (`charter_certified` now gates penthouse). Six rooms, Delia Okafor, the Form 11-C
   chain, The Firm 3v1 boss, three optional sides. Garage south exit gated on `city_unlocked`.
6. **WRITING.md** — voice bible (anchors per character; Alex IT = Dirk Gently per Alex). A
   58-line refinement pass over legacy dialog landed via reviewed subagent diff.
7. **Portraits** — 34 total at 256² (Delia, mood variants ×15, alex_it rev 2 modeled on the
   co-creator — NEVER pass his reference photo to codex; textual description in art/PROMPTS.md).
8. **Claude's additions** — whisper monitors (~4% show REMEMBERED) and the Daemon at Rack 7
   (post-game KEEP/TERMINATE encounter, server room x:3 z:4).
9. **Mobile pass** — adaptive ortho zoom (`Engine._zoomForViewport`: portrait ≈ 7/aspect,
   landscape <540px = 8, desktop 12); dialog max-height + inner scroll (bleed impossible);
   removed legacy `bottom:170px !important` in touch.css that floated dialogs mid-screen;
   compact HUD/combat variants; safe-area insets; stale interact prompt hidden on pause().

## New gotchas (Session 7)

- **MeshToonMaterial ignores flatShading** — the low-poly look is geometry-driven.
- **touch.css landscape overrides use `!important`** — check there first for mobile layout bugs.
- **Monolith/animator**: never drive `rotation.y` on combat models outside the animator's
  facing lerp (the Algorithm's screen will face away).
- **ENEMY_ABILITIES city kit** is in `CITY_ABILITIES` (stats.js), merged via Object.assign.
- **`_startFixture`** (main.js) is DEV_MODE-only and uses save slot 3 as scratch.

---

# Session Handoff — June 10, 2026 (Overnight Sprint, Session 6)

Ten phases shipped in one overnight session. Full plan + status: `.claude/plans/overnight-sprint-2026-06-10.md`. Forward roadmap: `ROADMAP.md` (root).

## What Was Done

1. **Dev panel V2** (`src/ui/DevPanel.js`, F2 in `?dev`) — tabs: SAVES / SKIP / TELEPORT (gate-bypassing room jump) / FIGHT (all encounters) / FLAGS (inspect/set/clear) / CHEATS (XP/AUM/heal/items), live status bar with room + tile coords. F2 toggles closed.
2. **V2 combat overhaul** — silhouette params (`heightScale/widthScale/headScale/hunch`) per character in `characters.js`; The Algorithm is a floating obsidian **monolith** with code-rain screen (`build: 'monolith'`); hit-stop + camera punch-in dispatched from `CombatScene.shake()` thresholds; attack anticipation/lunge; squash flinch; staggered enemy slide-in intros. New hair styles `bob`/`slick`; new accessories `glasses`/`tablet`/`pearl_earrings`.
3. **V3 lighting/post** — `EffectComposer` + bloom in Engine (shared by combat via swapped RenderPass refs); per-room `lighting` block (ambient/dir/flicker) applied in `RoomManager.loadRoom`; blueprint-grid void backdrop; blob contact shadows under characters (`userData.noFlash` guards combat white-flash).
4. **V4 materials** — data-driven `windows` (skyline canvas day/dusk/night) in 6 rooms; baseboards + crown trim on all wall segments (`_addWallSegment` now returns an array); monitors show spreadsheet/email/code/chart canvases; desk clutter; floor pattern contrast raised.
5. **V5 animation** — squash/stretch body bob, blinks (leftEye/rightEye refs), additive walk lean, chunkier CHAR proportions.
6. **V1 portraits** — JRPG portrait slot in DialogBox (auto-detects `src/assets/portraits/*.png`; `mood` field on dialog nodes → `<stem>_<mood>.png` with fallback). All 15 cast portraits generated via Codex $imagegen2 (style prefix locked in `art/PROMPTS.md`), 1024² raws in `art/portraits_raw/` (gitignored), 256² runtime committed.
7. **Arcade overhaul** — Andrew drives the coach; dust/landing/collect particles; day-night cycle; clouds + ground detail; Lawsuit Hawk (flying, duck under); Gold Watch collectible; near-miss +5; jump buffer + coyote time; exploration HUD hidden during play.
8. **C1 roguelite** — combat mutators from client attributes (thorns/volatile/compound — handled in `CombatEngine._calcDamage` + `processTurnStart`); **Negotiate** button in ClientReviewState (ATK-scaled, 1.5×/0.75× AUM); personal bests in Stats tab (`pb_*` flags); whale referral chain (`whale_referral_pending`).
9. **C2 personal missions** — Janet "The Vacancy" (Gary's timesheet, cubicle farm NE; rewards Binder Slam) and Janitor "The Names" (vault ledger, post-Rolex; +15 maxMP). Pattern matches existing Badge Audit/Receipts/Handbook missions.
10. **C3 New Game+** — menu entry post-`algorithm_defeated`; carries AUM/abilities/upgrade points/cosmetics/records/arcade; resets story; `ng_plus` flag scales enemies ×1.4 HP/×1.3 ATK/×1.2 DEF/×1.25 XP in `CombatEngine._buildEnemy` (before overrides, so scripted fights stay scripted).

## New gotchas

- **Playwright testing**: keys must be `down → ~90ms → up` (plain press lands inside one frame and `isJustPressed` misses it). Combat can be force-started from console: `(await import('/src/core/EventBus.js')).EventBus.emit('start-combat', id)` then `emit('dialog-end')`.
- **`ENEMY_STATS.reception_client.mutators`** is always set (possibly `[]`) by `generateClient` — stale mutators must not leak between clients.
- **Monolith builds** expose stub limb groups so `CharacterAnimator` no-ops; don't drive `rotation.y` on them outside the animator's facing lerp (the screen will face away).
- **`_addWallSegment` returns an array** (wall + baseboard + crown) — callers spread into the fade-mesh lists.
- **Portrait additions need zero code** — drop `<stem>.png` (256²) into `src/assets/portraits/`; stems map from speaker names in `DialogBox.PORTRAIT_KEYS`.

---

# Session Handoff — April 26, 2026

## What Was Done This Session (Session 5)

Balance/room/character editor, combat bug fixes, quest gate fixes, and menu keyboard navigation.

---

### Balance & Room Editor (`npm run editor`)

New developer tool: `npm run editor` starts a Node.js HTTP server at **http://localhost:3747** serving a single-page editor UI with 9 tabs:

- **Player** — edit base stats (maxHP, maxMP, ATK, DEF, SPD)
- **Abilities** — edit every player ability's cost, power, heal amount, buff/debuff duration, momentum gain
- **Enemies** — edit all 19 enemies' maxHP, ATK, DEF, SPD, XP reward
- **Shop** — edit all shop item prices
- **Rooms** — top-down canvas grid of any room; click furniture/NPCs to select; edit X, Z, rotation with preset buttons (N/E/S/W); purple dot = override active; saves to `room-overrides.json`
- **Combat Sim** — pick player level + enemy + shop upgrade counts → simulate 1000 fights → see win rate, damage/turn, turns-to-kill, full player/enemy stat summary
- **XP Curve** — bar chart + table of all 15 level thresholds, XP gap per level, reception fights needed, story XP reachable (green = reachable via story alone)
- **Encounters** — read-only table of all 20 encounters with boss badge, can-flee, pre/post dialog IDs
- **Characters** — native color pickers for all 27 character configs (body, pants, shirt, tie, skin, hair); saves to `character-overrides.json`
- **Diff** — colored git diff of all override files vs HEAD

**Ctrl+S** saves the current tab. **Save** buttons are per-section. **Publish to GitHub** runs `git add` + `git commit` + `git push` for all three override files.

**Server**: `scripts/editor.js` — plain Node.js `http` module, no dependencies. Dynamically imports `rooms/index.js`, `encounters/index.js`, and `characters.js` at runtime via `pathToFileURL`.

**Three override JSON files** (all in `src/data/`):
- `balance.json` — player stats, enemy stats, ability stats, shop prices. Read by `stats.js` and `shop.js` at module load time; overrides are applied via `Object.assign`.
- `room-overrides.json` — per-room furniture and NPC position/rotation overrides, keyed by furniture array index. Applied in `Room.build()` before `_placeFurniture()`.
- `character-overrides.json` — per-character color field overrides. Applied at the bottom of `characters.js` via `Object.assign` loop.

**`with { type: 'json' }` import syntax** — Node.js 24 requires the import attribute on JSON imports; Vite 7 supports it too. All four game files that import JSON now use this syntax: `stats.js`, `shop.js`, `characters.js`, `Room.js`.

---

### Combat Buff Duration Bug Fix

**`processTurnStart()` in `CombatEngine.js`** decremented durations and removed buffs at `<= 0`. Since it fires at the *start* of the player's turn before they act, a 3-turn buff was expiring after 2 player turns (counter hit 0 during player turn 3, removed before the turn happened). Fix: threshold changed `<= 0` → `< 0` so the buff persists until it reaches −1, giving the full advertised duration.

---

### Buff/Debuff Status Pills in Combat HUD

**`CombatHUD`** now renders active buff/debuff pills below the player stat bars:
- Green pills (`buff-positive`) for player buffs showing stat deltas and remaining turns
- Red pills (`buff-debuff`) for debuffs on the enemy
- Teal pills (`buff-enemy`) for buffs on the enemy

New method: `hud.updateBuffStatus(playerBuffs, enemyBuffs)`. Called from `CombatState._enablePlayerInput()` and `CombatState._updateHUD()`. The `combat-stats-wrapper` div wraps both `statsEl` and `buffStatusEl` with `flex-direction: column`.

Duration displays as `b.duration + 1` (post-fix semantics: a buff at `duration: 2` has 3 turns remaining).

---

### Quest Gate Fixes

- **IT server room vault code** — `server_vault_code` interactable (x:5, z:3, the `server_rack` at the far end of the room) was accessible from the start of the game, letting players find Vault Code 3 in Act 1. Added `condition: { flag: 'vault_accessible' }` — now only visible after Act 4 janitor dialog.
- **Stat-boost motivational posters** — all 10 `quest_atk_*` / `quest_def_*` posters scattered across rooms got `condition: { flag: 'retry_karen' }` so they're invisible until the roguelite tutorial phase begins. Players were finding them before the poster mechanic was introduced.

---

### Menu Arrow Key Navigation

**`MenuState`** Abilities and Cosmetics overlays now support keyboard navigation:
- Up/Down arrows (or W/S) move the selection
- Enter/Space confirms selection
- Escape closes the overlay
- Selected item auto-scrolls into view

Implementation: `_abilitySelectedIndex`, `_abilityCount`, `_abilityActions` array built during `_renderAbilities()`; `_cosmeticSelectedIndex`, `_cosmeticCount`, `_cosmeticActions` built during `_renderCosmetics()`. The `update()` method handles both overlays before routing to standard exploration input.

---

# Session Handoff — April 19, 2026

## What Was Done This Session (Session 3)

Penthouse suite visual overhaul: movie screen in The Reef & Reel, full Private Lounge redesign, NASA mission control Analytics Suite, and expanded penthouse layout fixes.

---

### The Reef & Reel (formerly Aquarium Suite)

- Replaced middle `aquariumWall` with a `movieScreen` showing a procedural dusk cityscape canvas: sky gradient, moon, city silhouette, lit windows, wet street reflections, lone figure, film grain, and letterbox bars.
- Room renamed from "Aquarium Suite" to **"The Reef & Reel"** — name mapping added to `_updateLocationDisplay()` in `ExplorationState.js`.
- Room ambient light changed from cold blue (0x0077dd) to warm (0xffeedd) to match the cinema mood.
- `movieScreen` added to `NO_BLOCK` in `Room.js`.

**Z-fighting fix:** Screen `PlaneGeometry` placed at `z:0.18`, pushed in front of the rim face (z:0.15) and gold trim strips (z:0.17). `DoubleSide` removed.

---

### Private Lounge (penthouse_bar)

Expanded room from 14×8 to **18×12**. Complete furniture overhaul:

- **`neonSign()`** — "TRUST ISSUES" hot-pink canvas with chrome border and `PointLight(0xff0099)`. Two signs flanking the bar on the north wall.
- **`humidor()`** — Mahogany cabinet with glass front, interior amber glow (0xcc7700), 2 shelves of cigars, side stand with ashtray and lit cigar (ember `emissiveIntensity:1.0`). Placed NW, rotated `Math.PI/2` to face the room.
- **`leatherArmchair()`** — Oxblood leather (0x4a1208), wing-back, brass nail-heads, turned wooden legs. Two chairs flanking the cigar lounge.
- **`coffeeTable()`** — Low glass-top table with whisky tumbler and cocktail glass. One between cigar chairs, one per VIP booth.
- **`pokerTable()`** — Octagonal `CylinderGeometry(1.0,1.0,0.72,8)`, green felt, cream `TorusGeometry` rail, 5 player positions with cards and chips, 5 built-in chairs. NE corner.
- **`poolTable()`** — Pool lamp/rod/overLight removed per previous session; lamp was re-confirmed removed this session.
- VIP booth couches: L-shaped pairs (wall-side + front-facing) on SW and SE with coffee tables.

Exits updated to accommodate expanded width (`x:17, z:5–6`). Player spawn moved to `x:15, z:6`.

---

### Analytics Suite (penthouse_analytics)

Replaced desk, chair, and three `dataVizPanel` screens with:

- **`megaAnalyticsScreen()`** — 12.5-wide wall screen (`PlaneGeometry`), 1536×256 canvas with 3 panels: market data + line graphs, network topology, system status bars + log. `z:0.08` to avoid z-fighting with trim front face.
- **NASA mission control arc** — 5 `missionControlDesk` consoles in a gentle z-curve (x: 3,5,7,9,11 / z: 3.2,3.6,3.8,3.6,3.2), all `rotation:0` (facing north). 5 `operatorChair` chairs 1.2 units behind each console (z: 4.4,4.8,5.0,4.8,4.4).

**New furniture assets:**
- **`missionControlDesk()`** — Gunmetal console (0x2a2e35), angled monitor deck (`rotation.x=-0.42`), two emissive screens, 5 indicator lights with chrome rings, button grid, keyboard strip, built-in `PointLight(0x002244)`.
- **`operatorChair()`** — Futuristic 5-point star base, single column, narrow seat, tall back with headrest wings, blue LED strips on back edges and headrest top.

Both added to `NO_BLOCK` in `Room.js`.

**Arc layout rule:** Console mesh is 1.28 units wide. Center-to-center x-spacing must be ≥ 2.0 units to avoid visual overlap. All consoles use `rotation:0` so they uniformly face the screen.

---

### Expanded Penthouse (penthouse_expanded)

- **Putting green removed** — the `puttingGreen` furniture entry deleted entirely.
- **Desk cluster moved** — from `x:9–11` to `x:13–15` (near server racks) so it no longer blocks the north exit door.
- **`algorithm_terminal` interactable** — x moved from 10 → 14 to match new desk position.
- **Conference table chairs** — moved from `x:15/19` to `x:16/18` so they sit flush against the table rather than floating 1–2 tiles away.

---

### Location Display Names

Added to `_updateLocationDisplay()` names lookup in `ExplorationState.js`:

```js
penthouse_expanded: 'Penthouse',
penthouse_aquarium: 'The Reef & Reel',
penthouse_analytics: 'Analytics Suite',
penthouse_bar: 'Private Lounge',
```

---

# Session Handoff — April 18, 2026

## What Was Done This Session (Session 2)

Post-game office renovations: Board Room Trophy Wall build-out, Penthouse renovation replacement (helipad → Executive Suite), and expansion of the penthouse into four interconnected wing rooms.

---

### Board Room — Trophy Wall Renovation Assets

Added three new furniture assets and six trophy cases when `renovation_trophy_wall` flag is set:

- **`stockTicker()`** — Canvas-texture screen (640×128, `LinearFilter`, no mipmaps) showing fake companies (TRST / HNDRS / ALGM) with green/amber/red ticker rows. Placed on north wall left of penthouse door (`x:5.5, z:0.1`).
- **`whiskeyWall()`** — Dark wood frame with amber emissive backlit panel, 3 shelves, and detailed bottles (body + shoulder + neck + cap + label layers). Placed on north wall right of penthouse door (`x:10, z:0.1`).
- **`trophyCase()`** (redesigned) — Dark wood cabinet (0x4a2e10, h:1.1), bright glass panel (0xcceeff, emissive 0.25), 4 dark wood corner pillars, blue-emissive lit base, large gold trophy (cup + forked handles torus + knot sphere + orb finial), and a front name plaque. Six cases placed on the west wall.
- **`smartBoard()`** — Added as conditional (`condition: { flag: 'renovation_trophy_wall' }`); whiteboard gets `condition: { notFlag: 'renovation_trophy_wall' }` so they swap cleanly.
- Scaled model removed from board room.
- All new board room assets added to `NO_BLOCK` in `Room.js`.

---

### Penthouse Renovation — Helipad → Executive Suite Upgrade

Replaced `renovation_helipad` (doesn't make sense in a room) with `renovation_penthouse`:

- **`shop.js`** — New item: `renovation_penthouse`, name "Executive Suite Upgrade", price **10,000,000 AUM**, description includes aquarium wall, live analytics displays, and private cocktail lounge.
- **`AchievementManager.js`** — `total_renovation` flag check updated: `renovation_helipad` → `renovation_penthouse`.

---

### Penthouse Expansion — Four-Room Layout

On purchase of `renovation_penthouse`, `_resolveRoomId()` in `ExplorationState` routes `penthouse` → `penthouse_expanded` (same canonical room ID, same save/music behavior — mirrors the `ross_office` → `ross_office_large` pattern).

**`penthouse_expanded`** (22×16): Hub room. Kitchen NW, desk, server racks, putting green, conference table. NPCs: CFOs (x:11 z:10), regional_director (x:11 z:6). Four exits: SOUTH→board_room, NORTH→penthouse_analytics, EAST→penthouse_aquarium, WEST→penthouse_bar.

**`penthouse_aquarium`** (16×8): Dark navy (0x04081a). Three `aquariumWall` panels on north face. Two north-facing couches (`couch()`, rotation:0). Popcorn popper in SE corner. Exit WEST→penthouse_expanded.

**`penthouse_analytics`** (14×8): Three `dataVizPanel` screens on north face. Analyst desk + monitors + chair. Exit SOUTH→penthouse_expanded.

**`penthouse_bar`** (14×8): `loungeBar()` on north wall facing south. Three executive chairs. Speakerphone. Exit EAST→penthouse_expanded.

Wing rooms are gated in `gatedRooms` table requiring `renovation_penthouse` flag with message "The suite wing is unfinished. Fund the renovation first."

---

### New Furniture Assets

All added to `Furniture.js` and registered in `NO_BLOCK` in `Room.js`:

- **`aquariumWall()`** — Dark metal frame (3.5×2.0), blue emissive water volume (0x062244), glass front panel, sand bed, rocks, coral, seagrass, and canvas-sprite fish at `z:0.22` (in front of glass) using `PlaneGeometry` + transparent `MeshBasicMaterial`. Three species drawn via Canvas 2D API: clownfish (orange/white bars), blue tang (blue body/yellow tail/black stripe), goldfish (orange/fan tail). 7 fish per panel with varied positions; some `scale.x = -1` for mirror flip.
- **`dataVizPanel()`** — Dark bezel, 480×420 canvas screen showing "TRUST DEPT — LIVE ANALYTICS" header, bar chart (10 bars, purple gradient), line graph (green), and data readout lines.
- **`loungeBar()`** — Dark counter body, marble top (0xe8e0f4), purple-backlit liquor shelf (0x6622cc, emissive 0.55), 2 shelf planks, 4×2 bottles, 3 purple leather bar stools with foot rings.
- **`couch()`** — Dark navy (0x1a2440) base+arms+back, cushion segments (0x243355), back rest at +Z (rotation:0 faces north toward aquarium), armrest top pads, 4 corner legs.
- **`popcornPopper()`** — Red cart body (0xcc1111), gold trim strips, 4 wheels, transparent glass case, yellow emissive popcorn pile (scaled SphereGeometry), scattered kernel spheres, warm interior glow, red top cap, gold finial.

---

### Fish Visibility Fix

Fish sprites must be at `z:0.22` (in front of glass at z:0.2). The opaque water volume (BoxGeometry centered at z:0.06, half-depth 0.14) spans z:-0.08 to z:0.20 and occludes anything behind or at z:0.20. Using `PlaneGeometry` + `THREE.DoubleSide` transparent material places sprites in front of the glass where they're always visible.

---

## What Was Done This Session (Session 1)

Ross attack fix, boosterMount visuals, whale client pre-algorithm roll, executive floor Act 5 gate, and cosmetic stats display fix.

---

### Rachel Retry Softlock Fix

0. **Dying to Rachel left no way to restart the fight** — The board room auto-trigger was gated on `!rachel_fight_started`. `rachel_fight_started` is set (and auto-saved via `_changeRoom`) on first entry, so after a loss the stale save always blocked the retrigger — clearing the flag in `_handleDefeat()` was lost on reload since `_handleDefeat` called `_loadRoom` (no auto-save) not `_changeRoom`. Fixed: removed `!rachel_fight_started` from the trigger condition entirely. `act5_complete` (set only on Rachel victory) is the only reliable completion gate. Added `_autoSave(false)` at the end of `_handleDefeat()` so gauntlet flag resets persist through reloads (fixes same latent bug for all gauntlet fights).

---

### Stall Ability

-6. **Added `stall` ability** — Tier 0 starter (always unlocked alongside `file_motion` and `coffee_break`). Cost: 0 Coffee. Effect: +25 Confidence, enemy skips their turn. Handled as a new `'stall'` type in `CombatEngine.playerAbility()` via `_gainMomentum(25)` + `skipsTurn: true`. CombatState displays "Stall! +25 Confidence — enemy loses their turn!" and returns 800ms delay. Added `'stall'` to `Player.unlockedAbilities` default set in both constructor and `deserialize` fallback.

---

### MaxHP Cosmetic Bonus Not Applied to Current HP

-5. **Cosmetics with `maxHP` bonus didn't increase starting HP** — `getCombatStats()` added the cosmetic's `maxHP` bonus to `base.maxHP` but never touched `base.hp`. The engine started combat with e.g. `hp: 100, maxHP: 105` — the extra 5 buffer existed but was never filled, so the bonus was invisible unless the player healed past their base max. Fixed: after the cosmetic loop, the difference between old and new `maxHP`/`maxMP` is computed and added to `hp`/`mp` (capped at the new max). Same fix applied to `maxMP` cosmetics for consistency.

---

### Roguelite Ability Messages Using Story Character Names

-4. **"Chad" and "Karen" appeared in roguelite combat messages** — `trust_fund_tantrum` and `speak_to_manager` are shared between the Henderson story fights and roguelite client ability pools. Their messages hardcoded "Chad throws a tantrum..." and "Karen demands to speak to your manager!" Fixed: both abilities' messages rewritten to use generic "the client" / "they" phrasing. Story fights (Karen/Chad) use the same ability entries and are unaffected since the names were never necessary for them to work.

---

### Penthouse Chain HP Increases

-3. **Penthouse bosses too low health** — CFO's Assistant 480→650, Regional Director 720→950, The Algorithm 880→1200. Quest.md HP column updated to match.

---

### Roguelite Anger Balance Pass

-2. **Too many anger-increasing clients** — All 10 negative attributes were delta +2, positives averaged −1.2. With `randomInt(0,2)` for both rolls, expected anger per accepted client was `+0.8` — always trending up. Two changes: (1) Roll distribution changed to `numPos = randomInt(1, 3)` (was 0–2, guarantees ≥1 positive) and `numNeg = randomInt(0, 1)` (was 0–2, caps at 1 negative). Zero-zero tie-break removed (unreachable). (2) Three minor negatives reduced from delta 2 → 1: `demanding`, `fomo`, `day_trader` (annoyances, not deal-breakers — the serious ones like `litigious`, `family_feud`, `social_media` stay at 2). New expected anger per client: `E[numNeg=0.5] × avg(1.7) − E[numPos=2] × avg(1.2) ≈ −0.7`. Anger now trends down on average with room for bad streaks.

---

### Post-Game Clients Serving Stale Pre-Game Cache

-1. **Post-game reception gave low-XP pre-algorithm clients** — `_onReceptionEntered()` checks `currentClient` in player flags and loads the cached client if one exists, without verifying it was generated with `postGame = true`. A client generated before The Algorithm was defeated could persist in the cache and be served post-game (e.g. 10M assets, 85 XP instead of 20M–100M, 200–350 XP). Fixed: added `isPostGame` boolean to the `generateClient()` return object; `_onReceptionEntered()` now discards the cached client if `postGame` is true but `client.isPostGame` is false, then regenerates from the post-game pool.

---

### Ross Attack Fix

1. **Ross never attacked the player** — `ross_act2` enemy had no attack ability; fights could drag indefinitely as he only used debuffs. Added `hard_pivot` to `ENEMY_ABILITIES` (Power 20, attack type, four quip lines) and added `'hard_pivot'` to Ross's `abilities` array in `ENEMY_STATS`.

---

### Network Ghost BoosterMount Visuals

2. **Signal booster furniture invisible in break room and conference room** — The booster mounts were listed as interactables rather than furniture, so no 3D mesh rendered. Moved both to the `furniture` array in `rooms/index.js` as `{ type: 'boosterMount', ... }` with `condition: { notFlag: 'quest_network_ghost_complete' }` so they disappear after the quest ends. Coordinates unchanged: `x:14.9, z:8` (break room) and `x:10.9, z:2` (conference room).

---

### Morse Code Rack Dialog Fix

3. **`morse_code_rack` dialog node 0 `ifFalse` jumped too early** — `ifFalse: 5` skipped the flavor text nodes (5 is the skip-past target, not a flavor node). Changed to `ifFalse: 6` so the "don't know what to look for" path plays through the flavor text before arriving at the exit node.

---

### Pre-Algorithm Whale Client Roll

4. **No rare high-value client surprise before end-game** — `generateClient()` now rolls 5% chance (`Math.random() < 0.05`) on every non-post-game reception visit to spawn a whale client: picks a `POST_GAME_CLIENT_TYPES` entry, forces assets to `randomInt(100_000_000, 250_000_000)`, and calls `scaleEnemyStats(..., true)` for proper post-game HP/XP scaling. Crypto volatility swing is suppressed for whale rolls. XP from a whale fight can reach ~350 — same ceiling as post-game Tier 5.

---

### Executive Floor Gate (Act 5)

5. **Player could access the executive floor mid-Act-5 and skip the gauntlet** — `_changeRoom()` now blocks the `executive_floor` entry when `restructuring_defeated` is set but `corporate_lawyer_defeated` is not, showing toast "The elevator won't open. Someone's waiting for you in the lobby." The gate clears automatically once the corporate lawyer fight is done.

---

### MenuState Cosmetic Stats Display Fix

6. **Stats tab showed raw `player.stats`, ignoring cosmetic bonuses** — Equipped cosmetics (e.g. Golden Calculator +3 ATK) were invisible in the Stats tab. Changed MenuState to call `player.getCombatStats()` instead of reading `player.stats` directly. No logic change — `getCombatStats()` already existed and applied cosmetic modifiers correctly; the display just wasn't using it.

---

### Additional Changes

- **HP variance for roguelite clients** — `scaleEnemyStats()` now multiplies `maxHP` by a `0.70–1.30` random factor so clients at similar wealth tiers feel distinct rather than identically scaled.
- **Karen NPC split into three conditional entries** — `briefing_complete+!retry_karen` → `karen_meeting`; `retry_karen+!karen_retry_ready` → `karen_not_ready` (new dialog: Karen mocks the player for returning too soon); `karen_retry_ready+!karen_defeated` → `karen_meeting`.
- **`karen_intern_first` dialog** (new) — fires when `_getDialogId()` detects the player approaches Karen before `defeated_intern` is set. Karen tells them to spar the intern first.
- **`team_pre_intro` dialog** (new) — `_getDialogId()` returns this for `janet`, `intern`, `isaiah`, and `alex_it` if `checked_desk` is not set and the NPC's intro hasn't been read. Narrator nudges player to settle at their desk first.
- **HUD objective** — when `briefing_complete` is set and `defeated_intern` is not, `_getStoryObjective()` returns `"Spar with the Intern to prepare for the Henderson meetings"`.

---

## Previous Session (April 15, 2026)

Dialog fixes, quest gating for early-game spoiler prevention, and post-game Tier 5 reception clients.

---

### Post-Game Tier 5 Reception Clients

6. **No XP path to level 15 after completing the game** — After defeating The Algorithm, the reception roguelite still used the standard 60–120 XP pool, making level 15 grindy and unengaging. Added a post-game tier:
   - Added `POST_GAME_CLIENT_TYPES` in `ClientGenerator.js` (5 elite types: UHNWI, Sovereign Wealth Consultant, Offshore Dynasty, Corporate Pension Fund, Tech Billionaire Exit — assets 20M–100M).
   - `scaleEnemyStats` now accepts a `postGame` flag: when true, `MAX_ASSET = 100_000_000` and XP formula shifts to `Math.round(200 + t * 150)` (200–350 range).
   - `generateClient` now accepts a `postGame` flag: when true, draws from `POST_GAME_CLIENT_TYPES`.
   - `ExplorationState._onReceptionEntered()` and `_getNextClient()` both check `algorithm_defeated` and pass `postGame` to `generateClient`.
   - One-time unlock toast on first post-game reception entry: Diane says "Word got out. The clients you're seeing now are in a different league entirely." (gated on `postGameReceptionUnlocked` flag).

---

### Diane Intro Dialog

1. **Diane re-introduced herself on every visit** — The opening line "New trust officer? I saw your onboarding paperwork..." played again on repeat visits. Removed node 0 from `diane_intro` (the "New trust officer?" line). All subsequent `next` indices in the dialog shifted down by 1 and were corrected. Dialog now opens with her self-introduction ("I'm Diane. I run reception...").

---

### Printer from Hell — Merged Interaction & Spoiler Gate

2. **Quest required two separate printer interactions to start** — First visit set `printer_visit_2`; second visit started the quest. Merged both beats into a single interaction so the full sequence (HELP ME → HENDERSON FILES → toner runs out → quest starts) plays in one sitting. `printer_visit_2` flag removed.

3. **Printer interaction revealed Henderson plot before Ross briefing** — The printer mentioned the Henderson files even on a fresh game before the player knew about the case. Added `briefing_complete` gate (node 2): if the briefing hasn't happened, the printer shows a single "it's just a printer" line and exits. The full spooky sequence only plays after the briefing is done.

---

### Alex IT Act 2 — Spoiler Gate

4. **`alex_it_act2` (encrypted partition / Caymans) fired immediately after briefing in Act 1** — Three separate routing paths all allowed this dialog too early:
   - The special Alex story routing block gated on `briefing_complete` → changed to `karen_defeated`.
   - The `flag-set` listener's `alex_story_chosen` path had the same `briefing_complete` gate → also changed to `karen_defeated`.
   - The **generic act routing** (`act >= 1 && DIALOGS[alex_it_act2]`) bypassed both special gates entirely → added an explicit guard after the side quest routing block: if `karen_defeated` is not set and `alex_it_act2` hasn't been read, return `alex_it_return` to prevent the generic routing from firing it.

5. **`alex_it_act2` dialog opened as a follow-up to a conversation that never happened** — Node 1 said "Remember that encrypted partition I told you about?" and node 2 had Andrew say "The one that was 'probably nothing'?" — referencing prior dialogue that doesn't exist. Rewritten so Alex introduces the partition fresh: "I found an encrypted partition buried in the server..." Andrew reacts with surprise. Router option also changed from "The encrypted partition. What did you find?" to "You look like you're about to combust. What is it?"

---

## Previous Session (April 12, 2026)

Achievement system expansion, momentum rebalance, cosmetic unlock fixes, roguelite balance pass, and documentation reorganisation.

---

### Cosmetic Unlock Fixes

1. **Three cosmetics permanently unobtainable** — `tin_foil_hat`, `executives_fedora`, and `janitors_keyring` referenced flags (`archive_found`, `executive_floor_visited`, `janitor_confronted`) that were never set anywhere in the codebase. Fixed:
   - `archive_found` — set alongside `visited_archive` in ExplorationState room-entry block for `archive`.
   - `executive_floor_visited` — new block added to `_changeRoom()` that sets the flag on first entry to `executive_floor`.
   - `janitor_confronted` — added `set_flag` action node at position 19 in `janitor_act3` dialog (all subsequent node indices in that dialog shifted +1).

2. **Golden Calculator unlock too late** — was gated on `algorithm_defeated` (post-final boss). Changed to `regional_director_defeated` (penthouse mid-chain) in `cosmetics.js` so it's obtainable before the final fight.

---

### Roguelite Anger Ratio Rebalance

3. **Negative client attributes averaged +2.2 anger delta vs positives at −1.0** — net anger per accepted client was +1.2, making the meter punishing over time. Targeted fix in `ClientGenerator.js`:
   - `litigious` angerDelta: 3 → 2
   - `family_feud` angerDelta: 3 → 2
   - `social_media` angerDelta: 3 → 2
   - `complex_tax` angerDelta: 1 → 2
   - `high_growth` angerDelta: 0 → −1
   - `large_estate` angerDelta: 0 → −1

---

### Janitor Riddle Dead-End Fix

4. **Wrong answer ended dialog with no retry path** — on re-entry the full intro replayed, and if the node list drifted the retry could silently fall to `end`. All three janitor riddles now use a `riddle_X_attempted` condition gate at node 0:
   - Node 0: condition — `ifTrue` jumps to the riddle question, `ifFalse` continues to node 1.
   - Node 1: `set_flag riddle_X_attempted`, falls through to node 2 (intro text).
   - Node 2: intro text → node 3 (riddle question).
   - Wrong-answer paths end without setting the `janitor_riddle_X_done` flag, so re-entry retries cleanly.

---

### Momentum (Confidence Bar) Rebalance

5. **Assert Dominance nearly unreachable** — base gain of +5 required ~20 hits and players were spending at 25%/50%, resetting progress. Two changes in `CombatEngine.js`:
   - Base gain per hit: `5 +` → `10 +` (formula: `10 + (crit?10:0) + (super?10:0) + (combo?5:0)`).
   - Removed all momentum drain from incoming damage and stuns (three `_loseMomentum(10)` calls removed). Momentum now only decreases when a spending move is used.

---

### Achievement System Expansion

6. **Removed 3 individual Henderson achievements** — `karen_slayer`, `chad_bested`, `grandma_survived` removed from `AchievementManager.js`. Only `hendersons_done` (all three defeated) remains as the Henderson milestone.

7. **Added 7 act-completion achievements** — one per act (`act1_complete` through `act7_complete` / `algorithm_defeated` flags), fired from `ACT_ACHIEVEMENT_FLAGS` listener in ExplorationState.

8. **Added 5 combat mastery achievements** — `second_opinion` (Second Wind used), `nothing_to_lose` (Desperate Gamble used), `all_in` (All In chosen), `follow_through` (combo hit), `perfect_form` (perfect Brace QTE). Achievement checks added in `CombatState.js`.

9. **Added 5 roguelite achievements** — `dedicated` (25 clients accepted), `supply_run` (all three shop categories purchased), `hard_pass` (decline after winning), `dream_client` (no negative attributes), `high_roller` (5M+ in assets). `client_accepted` ctx now carries `assets` and `attributes`; `client_declined` event added in ExplorationState.

10. **Shop category tracking** — `ShopState._purchase()` now sets `bought_category_<consumable|upgrade|decor>` flag before calling `AchievementManager.check()`. Required for Supply Run achievement.

11. **Total achievements: 31** — Story (2), Act Completions (7), Combat Mastery (9), Leveling (3), Roguelite (10).

---

### Documentation Reorganisation

12. **Created `Gameplay.md`** — moved Repeatable Reception Roguelite, Item Reference, Achievements, Cosmetics, and Attributes sections out of `Quest.md` into new `Gameplay.md` at project root. `Quest.md` now ends with a pointer to `Gameplay.md`.

13. **`CLAUDE.md` updated** — AchievementManager event list, momentum no-drain rule, 6-param `showMainMenu` signature, shop category flags, janitor riddle retry pattern, `Gameplay.md` added to Reference Files.

---

## Previous Session (April 10, 2026)

Full audit and bug-fix pass on Acts 5–7 and all six Alex IT subquests, plus the three standalone side quests.

---

### Act 5 Fixes

1. **Duplicate ENEMY_ABILITIES keys** — Three abilities silently overwrote each other due to identical JS object keys. Renamed conflicting keys to `chief_strategic_pivot`, `chief_corporate_mandate`, and `data_predictive_model`. Updated ability arrays in `ENEMY_STATS` for Chief of Restructuring and Data Analytics Lead.

2. **Board room accessible immediately on Act 5 start** — `act5_trigger` dialog was setting `board_room_accessible` on launch rather than after the full gauntlet. Moved the flag to `chief_restructuring_defeated` post-dialog.

3. **Act 6 trigger dialog dead code** — Removed `act6_trigger` dialog (was never reachable).

4. **`cfos_assistant_combat` / `regional_director_combat` / `algorithm_combat` missing `start_combat` nodes** — Pre-dialogs had no combat trigger; the `_pendingCombat` chain never fired. Added `start_combat` action nodes to all three.

5. **`intern_act6` dialog set wrong flag** — Was setting `intern_rallied` (Act 4 flag); changed to `intern_act6_rallied`.

6. **Bestiary missing entries** — Added `data_analytics_lead` and `chief_of_restructuring` to `BESTIARY_DATA`.

7. **Act 5 quest stage order wrong** — `quests/index.js` and `QUEST_OBJECTIVES` had Restructuring Analyst before Brand Consultant; corrected to Brand Consultant first.

---

### Act 6 Fixes

8. **`act >= 4` social engineering guard blocked Act 6** — Changed to `act >= 4 && act < 6` so the guard doesn't fire in Act 6+.

9. **`_getStoryObjective()` Act 6 ally count used wrong flags** — Updated to use `janet_act6_rallied`, `diane_act6_rallied`, and added `grandma_ally` as 5th ally. Counter thresholds updated from 4→5.

10. **Archive Janitor missing in Act 6 "Get the Rolex" window** — Added new room entry with `condition: { flag: 'act5_complete', notFlag: 'has_rolex' }`.

---

### Act 7 Fixes

11. **Penthouse combat chain used `setTimeout` race condition** — Replaced three `setTimeout → _startCombat` calls with `_pendingDialog` so each fight waits for the previous dialog to end before chaining.

12. **`_getStoryObjective()` missing CFO's Assistant step** — Added `if penthouse_entered → return "Defeat the CFO's Assistant"`.

13. **`regional_director_defeated` vs `defeated_regional_director` flag confusion** — Documented in CLAUDE.md Key Story Flags table; penthouse chain correctly uses the post-dialog-set flag.

---

### The 3:47 AM Anomaly Fixes

14. **`morse_code_rack` interactable missing from server room** — Quest stage 1 was physically inaccessible. Added interactable at `x:3, z:3` (middle rack row, "Rack C").

15. **`morse_code_rack` dialog set no flag** — Added `set_flag morse_decoded` after the decode path (nodes 1–4 only; the "don't know what to look for" branch does not set it).

16. **HUD objective stuck on "Return to Alex" immediately after quest starts** — Updated tracker to show "Find the Morse code pattern in server rack C" until `morse_decoded`, then "Return to Alex from IT".

---

### The Phantom Approver Fixes

17. **Dialog node 1 only checked `phantom_workstation_found`** — Player could skip the HR filing cabinet entirely (especially in Act 3 when HR is locked) and complete the quest with only the workstation. Added nodes 20–21: condition check for `phantom_hr_found`; if missing, Alex tells player to visit HR first.

---

### Network Ghost Fixes

18. **Break room and conference room signal boosters had no visual furniture** — Stairwell had `motivationalPoster` furniture + interactable (correct pattern); the other two rooms only had interactables. Added `motivationalPoster` at `x:14.9, z:8` (break room) and `x:10.9, z:2` (conference room).

---

### Printer's Soul Fixes

19. **`printer_quest_done` in questFlagMap mapped to `'printers_soul'`** — Completing "The Printer from Hell" was prematurely unlocking `notarized_strike` and showing a false "New ability unlocked!" toast before the Alex subquest was done. Removed the `printer_quest_done` entry from questFlagMap.

20. **Dead node 8 in `alex_it_quest_printer` had wrong quest ID** — `quest: 'daves_legacy'` (copy-paste error). Corrected to `quest: 'printers_soul'`.

21. **`printer_firmware_disk` interactable had no visual furniture** — Added `fileCabinet` at `x:7, z:4` extending the equipment shelf.

---

### The Unauthorized Patch Fixes

22. **Network monitoring terminal had no visual furniture** — Added `monitor` at `x:5, z:6` in server room.

---

### The Printer from Hell / Server Room Secrets Fixes

23. **Printer nodes 36 and 39 claimed `notarized_strike` was unlocked** — After fix #19, the ability no longer unlocks here. Updated printer's final message (node 36) to remove the ability claim; updated narrator (node 39) to announce XP only.

24. **Dead `give_xp: 100` nodes 14 and 18 in `alex_server_secret`** — Unreachable placeholder code; replaced with `end` nodes.

---

## Previous Session (April 9, 2026)

### Documentation

1. **CLAUDE.md updated** — Added previously undocumented systems:
   - `src/effects/` directory: `MaterialLibrary.js`, `ParticleSystem.js`, `PostProcessing.js`.
   - `src/entities/CharacterBuilder.js` and `CharacterAnimator.js`.
   - `src/ui/UIManager.js` and `FloatingText.js`.
   - `src/data/bestiary.js`, `thoughts.js`, `items.js`.
   - `Quest.md` added to Reference Files section.

### Bug Fixes

2. **Roguelite XP too low** — New formula: `Math.round(60 + t * 60)` in `ClientGenerator.js`.
3. **Act 6 ally counter using Act 4 flags** — Introduced `janet_act6_rallied` and `diane_act6_rallied`.
4. **Diane's documents missing** — Added `diane_documents` dialog and filing cabinet interactable at `x:14, z:8` in HR.
5. **Ross not rallying in Act 6** — Added conditional room entry for `ross_act6` routing.
6. **Archive janitor visible during Rolex mission** — Added `notFlag: 'act5_complete'` to final archive janitor entry.
7. **Break room DEF poster stuck behind arcade cabinet** — Moved to `x:5, z:6.9`.

### Features

8. **"Prepare for the Finale" HUD objective** — Lists remaining allies and evidence by name with `<br>`-separated bullet points.
9. **Board Room redesign** — Expanded to 16×12 with `boardroomTable` furniture asset.
10. **`grandPainting` furniture asset** — Replaces `oilPainting`; added to `NO_BLOCK` in `Room.js`.

---

## Current State

- **Build**: `npx vite build` passes clean (chunk size warning only — expected)
- **No test suite** — verification is manual playtest

## Known Issues / Future Work

- **Combat character models**: every enemy reads as the same blocky humanoid in close-up. Silhouette differentiation per enemy type (Grandma: hunched/shorter; Chad: wider; The Algorithm: floating monitor instead of head), accessories/clothing detail, and hit/flinch animations would make fights feel more distinct.
- **Full expansion plan**: see `.claude/plans/eager-nibbling-shannon.md` for Phases 1–9 (create `.claude/plans/` directory first)
