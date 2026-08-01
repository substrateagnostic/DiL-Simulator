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
