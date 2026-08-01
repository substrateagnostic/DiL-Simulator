# MESHY COMBAT-CAST WAVE — roster log + results (2026-08-01, overnight)

Producer ruling (alexmemory 08-01 ~03:30): **Meshy rigged GLBs replace procedural
characters IN COMBAT ONLY**, behind the `?meshy` dev flag. Exploration keeps the
procedural v7s. Andrew + Karen shipped in the pilot (commits 1636841 / 3e4a5c5 /
2023cf7). This wave delivered the rest of the combat cast: **31 characters
generated, rigged, animated, downloaded, wired, and contact-sheeted.**

Pipeline per character: multi-image-to-3d (A-pose plate crops from ONE sheet,
`remove_lighting`, ~30k polys, canon `height_meters`) → rigging (height again) →
one calm idle clip → toon-ramp conversion at load (`getHouseGradientMap`, kills
PBR shine). Every artifact downloaded on task success (Meshy purges at 3 days)
to `art/char_refs/meshy_pilot/<id>/` (gitignored); runtime GLBs in
`public/meshy/` (gitignored, verified). Tools: `tools/meshy-cast-pipeline.mjs`
(manifest-driven, resume-safe, per-task credit attestation, `--redo-anim`),
`tools/meshy-cast-shoot.mjs` (bind/idle stills + 6-frame clip strips).

## Roster + results

Sources: `ENCOUNTERS` (incl. multi-enemy `enemyIds`), `ENEMY_STATS`,
`ALLY_STATS` via Loop-In/party (up to 2 recruited allies join ANY encounter —
CombatState:41-56), `ClientGenerator` visual config space.
**Excluded**: `algorithm` (producer order — the monolith stays procedural) ·
karen/andrew (pilot) · exploration-only NPCs.

### The two overnight findings that reshaped the wave

1. **Prop-clamped plates poison reconstruction.** 19 of 24 existing turnaround
   sheets predate the hands-clear law and hold a prop against the body
   (clipboard/laptop/binder under the arm). Three were submitted as-is to test
   the boundary: ross_boss and regional came back with the putter FUSED along
   both forearms/fists; security_guard's flashlight duplicated into fist + belt.
   All three were plate-regenerated (props deleted, wide A-pose) and
   re-generated clean — the free-retry lottery was skipped deliberately: a prop
   drawn in three views is signal, not reconstruction noise (unlike Andrew's
   pilot hands case). Failed attempts archived under
   `<id>/attempt1_prop_fusion/` (instructive rejections, playbook §5.6).
   **Clean plates → clean models held with zero exceptions across 31 models.**
2. **The catalog's numbered "Idle" clips are not all idles.** Of the 16
   DailyActions/Idle standing clips, seven are gestures — arm stretch (12),
   crouch-sway (248), boxing guard (250), reach-lunge (253), presenting-push
   ending in a kick (254), greeting wave (599), and a walk-ish weight shift (0).
   The true calm pool is **nine clips: 243, 244, 245, 246, 247, 249, 251, 252,
   11**. Every character was audited on a 6-frame clip strip; 14 wrong-register
   clips were swapped via animation-stage redos (3 cr each) without touching
   the rigs. Distinctness law final form: Andrew (243), Karen (247) and the four
   allies (janet 244, alex_it 245, isaiah 246, diane 11) reserve their clips
   globally; enemies/clients draw from {249, 251, 252} with uniqueness inside
   every co-present fight group (trio/duo/firm verified).

### Enemies (21)

| id | height_m | idle | bind verdict |
|---|---|---|---|
| intern | 1.68 | 249 | PASS — regen plate (folder stack deleted); suit + glasses clean |
| chad | 1.88 | 251 | PASS — regen (shaker deleted); cap/chain/muscle read; calm hold |
| grandma | 1.50 | 249 | **PASS — the wave's cloth win.** Shawl genuinely drapes, lace edge intact, skirt falls as cloth. **Her cane did not survive** — Meshy dropped it entirely (hands empty). Better than fused; procedural exploration grandma keeps hers. |
| compliance | 1.78 | 252 | PASS — regen (clipboard deleted); sunglasses read |
| regional | 1.80 | 251 | PASS — regen after putter-fusion attempt1 (archived); light scratch noise on dark suit (cast-wide trait, see caveats) |
| ross_boss | 1.73 | 252 | PASS — regen after putter fused along BOTH arms in attempt1 (archived); belly reads in profile, startled Skip face intact |
| security_guard | 1.88 | 249 | PASS — regen after flashlight duplication (archived); duty belt kept |
| hr_rep | 1.65 | 251 | PASS — regen (folio deleted) |
| restructuring_analyst | 1.76 | 252 | PASS — regen (laptop deleted) |
| brand_consultant | 1.80 | 249 | PASS — regen (portfolio deleted); rust blazer + blond sweep |
| corporate_lawyer | 1.83 | 251 | PASS — regen (portfolio deleted); three-piece reads |
| data_analytics_lead | 1.77 | 252 | PASS — regen (tablet deleted) |
| cfos_assistant | 1.75 | 249 | PASS — regen (folio deleted) |
| chief_of_restructuring | 1.86 | 252 | PASS — regen (clipboard deleted); broad silver chief |
| rachel_boss (Meredith) | 1.70 | 249 | **PASS — second cloth win.** Pencil skirt drapes clean, tights/heels/silver bob/pearls all read |
| regional_director | 1.85 | 251 | PASS — regen (briefcase deleted) |
| parking_enforcer (Reyes) | 1.68 | 252 | PASS — regen (ticket device + chalk deleted, duty belt kept). Shoulder patches read over-bright under the toon ramp (minor) |
| networking_guy | 1.80 | 249 | PASS — regen (phone deleted, arms down from the raised-arm pose that broke A-pose law) |
| firm_partner | 1.82 | 249 | PASS — regen (portfolio deleted) |
| firm_associate | 1.78 | 251 | PASS — regen (clipboard deleted) |
| firm_paralegal | 1.62 | 252 | PASS — regen (binder deleted); skirt suit + cravat drape well |

### Loop-In bench allies (4)

| id | height_m | idle | bind verdict |
|---|---|---|---|
| janet | 1.63 | 244 | PASS — regen (mug deleted); cardigan drapes; calm weight-shift idle |
| alex_it | 1.78 | 245 | PASS — only sheet in the cast that passed inspection as-is; hands articulated, shirt pattern crisp |
| isaiah | 1.77 | 246 | PASS — first-ever sheet for him (portrait-ref'd); glasses + beard read |
| diane | 1.68 | 11 | PASS — regen (clipboard deleted) |

### Roguelite client body pool (6)

Modular sheets regenerated WITH baked hair (a fixed GLB cannot composite the
old bald-bust modular system); neutral grey = runtime-tintable. Single
front-view submissions (pilot-proven).

| id | height_m | idle | verdict |
|---|---|---|---|
| client_m_young | 1.75 | 249 | PASS — default `reception_client` body |
| client_m_athletic | 1.86 | 251 | PASS |
| client_m_heavy | 1.80 | 252 | PASS |
| client_m_elder | 1.62 | 251 | PASS — stoop reads |
| client_f_pro | 1.68 | 252 | PASS |
| client_f_elder | 1.58 | 249 | PASS |

`MESHY_MODELS.reception_client` → client_m_young. Per-client body selection +
tinting = producer-gated second pass (alongside better calm stances,
block/status stances, per-move reaction clips — noted, not implemented).

## Spend (per-task consumed_credits, never balance deltas)

- 31 characters × (30 base + 5 rig + 3 anim) = 1178 cr
- 14 animation-stage redos (wrong-register catalog clips) × 3 = 42 cr
- 3 archived prop-fusion attempts (ross_boss, regional, security_guard) = 114 cr
- **Wave total: 1334 cr** (pilot's 90 cr not re-counted). Balance 6160 → ~4826.

Plate regens: 22 sheets + 2 recovery re-rolls via codex imagegen — zero credits
(subscription path; the cost is wall clock, ~90-150 s/sheet, and plan rate).

## Honest caveats for the morning review

1. **Grandma's cane is gone in combat** (Meshy dropped it; her fused-cane
   alternative was worse). If the cane matters at fight distance, it needs a
   prop-attachment pass (bone-socketed engine prop, not baked geometry).
2. **Dark suits carry faint light scratch-noise** in the baked base-color
   (visible at inspection zoom on regional/corporate_lawyer/compliance/
   regional_director; subliminal at fight distance). Texture-space artifact of
   remove_lighting on near-black fabric — a known cost, not a blocker.
3. **Some clip strips show subtle turning** during long holds (Idle_5 on
   alex_it). Calm register, but stage-facing drift is possible on long combat
   turns; the CombatScene outer-group rotation is unaffected (yaw is driven by
   the game, not the clip root).
4. **parking_enforcer's shoulder patches** read over-bright (near-white) under
   the house ramp.
5. **The clip-register catalog audit is empirical, not exhaustive** — the seven
   condemned actions were judged from 6-frame strips at 0.8 s spacing; a clip
   could hide a gesture between samples. Every strip is on disk under
   `<id>/shots/clip_strip.png` for spot-checking.
6. **Naming ledger note:** `rachel_boss` internal id stays (save-safety);
   display name Meredith Sterling everywhere player-facing.
7. Sheets for janet / parking_enforcer / networking_guy / firm_partner on disk
   may differ cosmetically from the submitted crops (concurrent retry lanes
   overwrote the sheet file after cropping; the crops that fed Meshy are the
   verified ones, stored alongside).

## Ops log (compressed)

- 22 plate regens + isaiah + 2 client sheets via codex imagegen across 7 lanes;
  4 transient no-path failures recovered by re-run or direct pull from
  `~/.codex/generated_images` (the render usually exists even when the path is
  not echoed — check there before re-spending).
- One self-inflicted failure: editing `regen-lane.sh` while lanes were mid-loop
  corrupted the running bash interpreters' file offsets and killed lanes A/C/D
  at their final items (bash re-reads script files during execution — never
  edit a lane script with lanes live; clone it). All items recovered.
- Three codex sessions wedged 10-15 min (rachel_boss ×2, networking_guy,
  parking_enforcer); killed + relaunched in fresh lanes, which succeeded
  immediately each time.
- Meshy base-stage queue slowed from ~3 min to ~8 min mid-wave (02:30-02:45);
  no failures, no rate-limit rejections. All Meshy tasks SUCCEEDED — zero
  generation failures across 31 base + 31 rig + 45 anim tasks.

---

# PASS TWO — DEFAULT FLIP + THE STANCE/REACTION LAYER (2026-08-01, morning)

Producer order: flip combat to Meshy-by-default, then the second pass (non-A-pose
calm stances, block/status stances, reaction clips, grandma's cane, per-client
bodies + tints).

## The finding this pass rests on

**Every Meshy auto-rig in the cast carries the IDENTICAL 24-bone skeleton with
identical bone names** — Hips, LeftUpLeg, LeftLeg, LeftFoot, LeftToeBase,
RightUpLeg, RightLeg, RightFoot, RightToeBase, Spine02, Spine01, Spine,
LeftShoulder, LeftArm, LeftForeArm, LeftHand, RightShoulder, RightArm,
RightForeArm, RightHand, neck, Head, head_end, headfront. Verified byte-for-byte
across karen / grandma / chad, then empirically on every retarget strip.

So a reaction clip only has to be generated ONCE. `tools/meshy-clip-fetch.mjs`
runs one animation task on a single donor rig (andrew), then strips the 8.6MB
result down to an armature-only GLB of **rotation tracks only, plus a
vertical-only Hips track**, and that one file drives all 33 characters. Bone
LENGTHS come from each character's own rest pose, so proportions survive.

**Whole reaction layer: 511 KB for the entire cast, 69 credits.** The alternative
(re-running the animation stage per character per clip) would have been 31 x 7 =
217 tasks, 651 credits, and 31 fresh 9MB downloads per reaction.

Two rules fell out of the retargeting:

1. **Drop every translation track except the Hips, and pin the Hips to Y.** a31
   ("Catching Breath") walked the character clean out of frame. CombatScene
   already owns stage translation; the clip must not fight it.
2. **Drop all scale tracks.** They carry the donor's proportions.

## Clip audit

`tools/meshy-clip-audit.mjs` samples the CDN preview GIF for a candidate at fixed
intervals and stitches a labelled 6-frame strip — the producer's "audit by
preview, not by name" rule, mechanised. 46 candidates screened across
DailyActions/Idle, LookingAround, Fighting/Blocking, GettingHit, Dying,
Punching, BodyMovements/Acting.

The GIF strip is a FILTER, not the verdict. Every survivor was re-judged on the
real cast with `tools/meshy-clip-strip.mjs`, which binds a clip onto a real
character GLB and renders a strip across the clip's whole duration. Verified on
three body types every time: **regional (male suit, 1.80m), rachel_boss (female
skirt suit, 1.70m), grandma (stooped elder in a shawl, 1.50m)**.

| role | clip | catalog name | dur | verdict |
|---|---|---|---|---|
| calm stance A | **a336** | Long Breathe and Look Around | 11.30s | PASS on all three. Arms hang naturally, weight shifts, minimal stage-facing drift. Not an A-pose. |
| calm stance B | **a338** | Short Breathe and Look Around | 7.90s | PASS — the calmest hold in the catalog. Least turning of any candidate. |
| guard (Brace) | **a138** | Block1 | 3.50s | PASS. Hands up, weight back, bladed. Grandma with her dukes up is on-tone. |
| hit reaction | **a178** | Hit Reaction | 1.67s | PASS. Torso recoil + arm fling, recovers inside 1.7s. The most readable flinch tested. |
| stagger (Break) | **a391** | Head Hold in Pain | 3.77s | PASS, and the pass of the batch — hands to the head, doubling over. Exactly the office read for a Composure Break. |
| victory | **a59** | Victory Cheer | 9.37s | PASS. Arm up, overhead pump. (a403 "Victory Fist Pump" REJECTED — reads as a small bounce.) |
| attack accent | **a191** | Left Jab from Guard | 1.80s | PASS. Clear wind-up / extension / return. |
| cast | a191 | (reuses the attack accent) | | A dedicated scheming clip is a later pass. |

**Rejected, with reasons:** a12 "Idle 2" is a full-body overhead STRETCH (the
numbered-Idle-band trap again). a415 "Happy Sway Standing" is a presenting/
talking register, too busy and it turns the body. a31 "Catching Breath" walks out
of frame. a403 too small. a100 "Spin Down and Stand Up" holds a sword and shield —
invisible on our cast, so the pose reads as gripping nothing. a7/a608 "BeHit
FlyUp" leaves the ground.

**Distinctness law, updated.** Two stances cover 33 characters, so the old
"unique clip per co-present enemy" rule is replaced by clip-pick + PHASE OFFSET,
both stable FNV hashes of the character id (`MeshyClips.stanceFor` /
`phaseFor`). Two characters on stage together almost never share both.

## Wiring

`MeshyAnimator` implements the **CharacterAnimator surface** — playGesture,
setExpression, setFacing, setSignaturePose, setCombatMode, update. Every beat
CombatState already fires lands as an AnimationMixer crossfade (0.25s in, 0.30s
back), so the combat event wiring is untouched:

| existing call site | role |
|---|---|
| `enemyHurtAnim` / `allyHurtAnim` -> `playGesture('hurt')` | hurt |
| `enemyAttackAnim` -> `playGesture(attack_*)` | attack |
| `enemyCastAnim` -> `playGesture('cast')` | cast |
| broken enemy -> `setExpression('defeated')` | **stagger** |
| `enemyDefeatAnim` -> allies `setExpression('victory')` | victory |
| `_executeBrace` -> **new** `scene.playerBraceAnim()` | guard |

Only ONE new call site was needed (Brace had no animator hook at all). Every
character gets all roles rather than the player+bosses subset — the clips are
shared, so restricting them would cost nothing and buy nothing, and a Composure
Break can happen to any enemy in the game.

## Grandma's cane

Bone-socketed at runtime (`MeshyProps.attachCane`) on `RightHand`, built from the
same honey-shaft / crook / pale-ferrule geometry the v7 procedural grandma
carries. Length is solved from the measured hand-to-floor distance, so it lands
on the stage at her 1.50m.

**The cane needed an UPRIGHT CONSTRAINT.** The shared clips were authored for
empty hands, so a rigidly-parented cane swung out horizontally the moment a clip
raised the wrist — on the first Break still it read as a pole through her chest.
The holder now tracks the hand's POSITION and cancels its ROTATION every frame
(after mixer.update, or the constraint reads a frame stale). Verified plumb
across the calm stance, the guard, the hurt and the a391 stagger.

## Roguelite clients

Per-client body selection is driven by `ClientGenerator.generateVisualConfig`,
which now stamps an explicit `meshyBody` onto the visual config from the client's
name-gender and type (Retiree/Widow -> elder body, Athlete/Entrepreneur ->
athletic, Small Business/Pension -> heavy, else young; women get f_pro or
f_elder). `MeshyCast.pickClientBody` reads it, with a colour/accessory heuristic
as the fallback for a legacy save's serialised client.

**Tinting, described honestly:** each client body is ONE mesh on ONE baked atlas
that already carries skin tone and hair colour. There is no clothing-only mask,
so a material tint necessarily washes the whole figure. The tint is therefore a
HUE WASH, not a repaint — the target colour is normalised so its brightest
channel is 1.0 (the tint can only remove light from the other channels, never
darken overall), then pulled 55% back toward white. The neutral grey sweater and
trousers take almost all the visible shift; skin and hair move a little. That is
the trade, and it is why the clients read as different people without 30 more
Meshy generations. Still: `_clips/fight_client_stance.png`.

## THE BUG THIS PASS CAUGHT

**Andrew was invisible on the front stage in every fight of the pushed Phase 1
build.** `Box3.setFromObject` on a SkeletonUtils clone of a gltfpack-quantized
skinned mesh reports ~0 height; the fit ratio came out at **853725x** and the
model scaled off the planet. Grandma was fine only because her cane socket
happened to call `updateMatrixWorld(true)` first. Fixed by measuring ONCE on the
un-cloned model at parse time (`MeshyCast.load`, after an explicit world-matrix
update) and fitting every instance to that stored height, plus a plausibility
clamp that logs and falls back to 1:1 if a ruler ever lies again.

## Spend (per-task consumed_credits)

- 23 animation tasks on the andrew donor rig x 3 cr = **69 cr**
  (ledger: `art/char_refs/meshy_pilot/_clips/spend.json`)
- 7 clips shipped, 16 audited and discarded — the discards are the cost of
  auditing on real bodies instead of on a mannequin GIF.
- Zero base/rig tasks. Zero character regenerations.

## Review artefacts

- Cast contact sheet, shipping stances: `art/char_refs/meshy_pilot/_cast_contact_stances.png`
- Fight stills (grandma): `_clips/fight_grandma_{stance,ally_stance,brace,hurt,break,attack,victory}.png`
- Fight stills (client): `_clips/fight_client_*.png`
- Retarget strips: `_clips/strip_{stance,react,beat}_a*.png`
- Preview audit sheets: `_clips/audit_{stance,guard,hit,stagger,victory,attack,cast}_*.png`

## Still open, honestly

1. The reaction clips carry a body YAW (a138 guard and a191 jab turn to a bladed
   profile). On stage that reads as a real recoil/blade and returns on the
   crossfade, but it is a rotation the stage did not ask for. If it ever fights
   the blocking, the fix is to strip the Hips Y-rotation component.
2. The dark-suit scratch noise and Reyes' shoulder patches were re-judged at
   fight distance on the new stills and are NOT visible — no fix made, per the
   producer's "judge at fight distance FIRST" instruction.
3. The 30s fight video was not cut this pass; the six-beat still set is the
   deliverable.
4. `cast` reuses the attack accent. A scheming/gathering clip (catalog 17/18
   "Skill 1/2", downloaded and discarded this pass) is a later choice.

---

# V8 — SPINE + FLOOR FIX (2026-08-01)

The producer flagged an exaggerated S-spine / sway-back on 18 of the 33 combat
models, and "karen is hovering off the ground", off
`_cast_contact_stances.png`. Both were the same defect, and this document's
pass-two verification is what missed it: it checked that bone NAMES were
byte-identical across all 33 rigs (they are) and then re-judged the stance on
three bodies. Identical names do not imply identical rest ORIENTATIONS.

## Root cause

Meshy's auto-rigger emits two pelvis conventions. In one (andrew — the clip
donor — karen, and 13 others) the Hips bone's rest rotation is ~identity and its
child offsets run along +Y. In the other (all 18 flagged characters) the Hips
bone is rest-rotated 112–174 deg and its child offsets are expressed in that
rotated frame; Spine02 carries a near-inverse rotation that cancels it, so the
BIND pose is straight either way. The bone FRAMES differ; the silhouette does
not.

The shared clips carry LOCAL rotation tracks authored on andrew's rig, and
THREE's AnimationMixer binds by bone name and OVERWRITES each target bone's
local quaternion. That destroys the cancellation: the lumbar offset, authored
pointing "up" in the target's own rotated hip frame, gets interpreted in
andrew's frame and shoots out sideways — pelvis in one place, chest 10–17 cm
behind or in front of it, spine vertical above that. The same mechanism splays
LeftUpLeg/RightUpLeg (rest deltas 113–175 deg).

Second half, same cause: the Hips TRANSLATION track keeps andrew's ABSOLUTE hip
height, so every pelvis was teleported to andrew's hip height regardless of its
own. Measured hover, whole cast, shared stance: 0.060 m (security_guard) to
0.391 m (firm_paralegal); karen 0.166 m — 10% of her height. Bind pose measured
0.0000 m for all 33, and each character's OWN wave-1 baked idle measured −0.016
to +0.077 m, which is what proved the models and the rigs were innocent.

## Fix — `src/combat/MeshyRetarget.js`

Retarget the shared clips per character, in code, at load. Zero credits, no new
assets, the 511 KB one-file reaction layer survives.

**Rotation — WORLD-SPACE delta transfer, hierarchically re-solved.**

    Wt(t) = Wd(t) * inverse(Wd0) * Wt0
    L(t)  = inverse(Wt_parent(t)) * Wt(t)

Bones are solved parent-before-child, once per keyframe, over the union of the
donor track times. The donor rest pose comes free — the stripped clip GLBs keep
andrew's node hierarchy, so `captureRest(gltf.scene)` on the clip IS the rig the
tracks were authored against. No hardcoded table.

**The local-frame form is NOT sufficient, and this is the trap.** The obvious
formula `T(t) = T0 * inverse(D0) * D(t)` applies the delta in the target bone's
OWN frame instead of world. For the root that is `T0*A` where the correct answer
is `A*T0` — they agree only when the delta commutes with the frame offset. It
fixes the calm stance for everyone (the pelvis barely rotates there) and it
fixes firm_paralegal completely (her frame offset is ~180 deg about X and the
clip pelvis motion is mostly pitch about X, so it commutes) — which is exactly
why it looks correct until you check a reaction clip. Measured, hips→Spine02
tilt at t=0.6 with the local form: andrew 6.7 deg on the jab, intern 82.0,
ross_boss 78.3. With the world form: intern 6.8, ross_boss 6.0.

**Root translation.** Hips Y is rebased onto the target's own rest hips and
scaled by the hip-height ratio; X and Z are PINNED to the target's rest. The pin
also retires an asset bug: a59 and a191 were exported before the authoring-side
root pin landed (the jab slid the character 0.64 m across the stage) and a391
sat at a constant +11.2 cm Z. Measured root travel is now 0.0000 m on every clip
for every character. CombatScene owns all stage travel.

**Foot plant.** `groundOffsets()` samples the lowest skinned vertex over each
clip (sole-candidate subset, 400 verts, 14 samples) and `MeshyAnimator` puts
−min on the inner wrapper, eased over the 0.25 s crossfade so a clip change does
not pop. It is per CLIP, not per character: the guard crouch and the stagger dip
reach different lows on the same body, and taking the clip MINIMUM is what stops
a crouch punching the feet through the floor.

## Numbers (all 33, `tools/meshy-spine-floor-review.mjs`)

| | before | after |
|---|---|---|
| hips→Spine02 tilt, shared stance | 90.3–166.4 deg (flagged 18) | 1.1–4.8 deg |
| worst tilt, any of the 7 clips | 166.4 deg | 22.3 deg — and andrew, the donor, reads 19.1 on that same clip |
| foot contact, shared stance | 0.060–0.391 m hover | −0.008 .. +0.015 m |
| foot contact, worst clip | — | +0.079 m at the peak of the victory cheer, identical for the donor: the clip's own bounce |
| root travel, jab | dx 0.14 / dz 0.63 m | 0.0000 m |
| build cost | — | retarget 9.0 ms avg + ground measure 24.1 ms avg, once per model per session, inside the combat fade |

The clean 15 did not regress: andrew 2.05→1.63 deg, karen 1.10→2.89, grandma
24.26→4.61. andrew is provably bit-stable — when donor and target are the same
rig, `Wt0 == Wd0` and the output is the donor track.

## V8 review artefacts

- `art/char_refs/meshy_pilot/_review_v8/review_{side,front,back,tq}_band*.png` —
  all 33, four angles, columns BIND / NAIVE / FIXED t=2 / FIXED t=6, red floor line
- `_review_v8/reactions_<id>.png` — guard/hurt/stagger/victory/attack strips, side view
- `_review_v8/review.json` — per-character tilt, per-clip offsets, foot bands, skate
- `_review_v8/ab_ross_{grounded,hovering}.png` — in-game A/B on the real arena
- `_clips/fight_v8_{ross,grandma}_*.png` — in-game beat stills, real call path

---

# V8.1 — FRAMING: THE RULER AND THE CAMERA (2026-08-01)

V8's spine and floor work was signed off. The round FAILED on framing: seven of
the nine story enemies had their scalp off the top edge of the shipping combat
view, and the enemy nameplate panel (y = 15..145) covered several more. The V8
in-game sample was two characters — ross_boss and grandma — and grandma is the
SHORTEST model in the cast with 164 px of headroom to spare. A sample that
included the best case and nothing near the worst read as clean.

## CORRECTION TO THE V8 RECORD — grounding did NOT push ross's head out of frame

V8 reported that the foot-plant "moved him ~25 px further down, so slightly more
of the head leaves frame." That is backwards, and it is corrected here so nobody
spends a round hunting a regression that never happened.

Re-read `_review_v8/ab_ross_hovering.png` against `_review_v8/ab_ross_grounded.png`:
the soles drop from y≈545 to y≈570 and the SCALP DROPS WITH THEM. Moving a figure
down moves his head down — away from the top edge. Grounding GAINED about 25 px
of top clearance and pushed the head further BEHIND the nameplate panel, which is
occlusion, not cropping. The crop was 100% pre-existing (a flat stage scale, see
below) and V8 slightly improved it.

## Defect 1 — the ruler lied by 5.3% on two characters

`CombatScene._buildMeshyCombatant` fits the GLB by `probeH / glbH`, where probeH
came from `Box3.setFromObject(probe).getSize().y` on a throwaway PROCEDURAL build
of the same character. `getSize().y` is max MINUS min, and the `golf_putter`
accessory (`CharacterBuilder` case 'golf_putter': shaft at y −0.35, head mesh at
y −0.70, club rotated 0.2) hangs BELOW the floor plane. Measured min.y over all
38 configs — two are negative by more than a millimetre, and both carry the putter:

| id | before (max−min) | after (no accessories) | min.y | error |
|---|---|---|---|---|
| ross_boss | 1.680 | 1.596 | −0.084 | +5.3% |
| regional | 1.724 | 1.660 | −0.065 | +3.9% |
| grandma | 1.214 | 1.211 | −0.004 | +0.3% (cane ferrule) |
| chad | 1.708 | 1.707 | 0.000 | +0.06% (cap, above the scalp) |
| the other 34 | — | — | 0.000 | unchanged |

Skip Hartley and the Regional Manager were rendered materially larger than the
rest of the cast for no authored reason. The fix builds the probe with
`accessories: []` — a body ruler measures the body — which is immune to the next
prop someone hangs off a hand, rather than patching `max.y` and waiting for a
prop that floats ABOVE the head. `tools/meshy-probe-audit.mjs` prints the whole
table, before and after, and names every config the change moves.

## Defect 2 — a flat stage scale on a cast with a 48% height spread

The solo stage scale was a constant 1.9 with no reference to how tall the figure
is. The cast runs 1.211 m (grandma) to 1.787 m (the Chief), so 1.9 put the Chief
at 3.40 world units in a frame that holds about 2.8. Measured crown clearance
before, live build, 1440x810, negative = off frame: chief −74, regional_director
−58, rachel_boss −58, regional −56, security_guard −36, chad −35, ross_boss −28,
karen +7, grandma +164.

**The framing law** (`CombatScene.STAGE` / `_stageScale`): on-stage height is a
COMPRESSED remap of true height — 1.20..1.80 m of character maps onto 2.28..2.70
world units, clamped at both ends. Two consequences:

- The tallest figure the stage can EVER produce is 2.70 units, for any character,
  however tall, including ones nobody has made yet. That is what makes a single
  fixed camera lift safe forever.
- Ordering survives. The Chief still stands visibly taller than grandma (2.68 vs
  2.19 measured on stage), just not by half again.

Straight `budget / height` was the other candidate and was rejected: it collapses
everyone at or above ~1.45 m onto exactly one height — a cast of identical
mannequins. Neither could scale alone reach the target: the frame holds ~2.3
units of figure with 160 px of headroom, so a scale-only fix that preserved the
real 48% spread would have put grandma at 1.56 units — shrinking the cast into
irrelevance, which is the failure mode the judge explicitly warned against.

## Defect 2b — the camera, fitted to the tallest combatant

`_basePos.y` 1.5 → **2.05** and `_baseLook.y` 0.95 → **1.50**. Camera and look
target move by the SAME 0.55, so the pitch is unchanged: this is a pure vertical
reframe, not a new downward angle. The old rig put the ground line at 565 px of
an 810 px frame — 245 px of empty floor under the enemy's shoes and not enough
sky for anyone over ~2.3 units. The lift is sized off `STAGE.HI` so a 2.70-unit
figure crowns at ~193 px, 48 px clear of the nameplate.

Side effect, and an improvement: Andrew stops being a full-height 810 px figure
pinned to the right edge and becomes an actual over-the-shoulder foreground —
crown ~226, cropped at the thigh.

Group fights lost their extra 1.6/1.9 trim (`STAGE.GROUP` is now 1.0). The law
already bounds height and `setCombatants` already dollies to z 5.9 for a crowd;
the second trim just shrank the trio into the floor (crowns at 297–323 px under a
130 px nameplate row). One law for everyone.

## Defect 3 — the sampling gap, closed with an instrument

`tools/meshy-framing-gate.mjs` boots the REAL preview build, starts EVERY solo
story encounter plus the three group encounters through the game's own
`_startCombat`, confirms which cast built each body, and measures the CROWN —
the highest SKINNED vertex, CPU-skinned through `SkinnedMesh.applyBoneTransform`
off `matrixWorld`. Never a geometry bounding box: `SkinnedMesh.geometry.boundingBox`
is BIND space and reports garbage. It fails the run (exit 1) if any enemy crown
lands above y = 160. `--nomeshy` gates the procedural fallback cast the same way;
`--shots` writes the stills; `tools/meshy-frame-sheet.mjs` stitches them into one
labelled sheet with the gate line drawn across every cell.

The Algorithm is measured and reported but NOT gated: it has no head, and its
topmost geometry is an unnamed FX BoxGeometry ~0.25 units above the visible
pillar rim. (At the old flat 1.9 it stood 4.12 units and left the frame entirely;
the law puts it at 2.71 and its visible rim at ~170 px.)

## Numbers

| | before | after |
|---|---|---|
| crown clearance, worst story enemy | −74 px (chief_of_restructuring) | **+194 px** |
| story enemies with the crown off frame | 7 of 9 | **0 of 28 gated enemies** |
| enemies behind the nameplate (y < 145) | 9 of 9 | **0** |
| combatants measured in the real build | 2 (one of them the shortest model) | **54** — 28 gated enemies (20 solo Meshy + 8 in group fights), the Algorithm as info, 25 ally rows |
| ross_boss ruler | 1.680 (+5.3%) | 1.596 |
| regional ruler | 1.724 (+3.9%) | 1.660 |
| on-stage height spread | 2.30–3.40 units | 2.19–2.68 units |
| procedural (`?nomeshy`) cast | not measured | 0 failing |

## V8.1 review artefacts

- `art/char_refs/meshy_pilot/_framing/v81_framing_sheet.png` — the four worst
  offenders plus the shortest character, in-game, gate line drawn
- `_framing/frame_<encounter>.png` — every gated encounter, real build, HUD on
- `art/char_refs/meshy_pilot/_framing_gate.json` — the full measurement table
