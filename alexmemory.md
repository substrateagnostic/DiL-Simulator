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
