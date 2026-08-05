# ATTACK FEEL — design document (H run, read-only design lane)

*Written 2026-08-03. Comp: **Persona 5 Royal** (combat choreography, turn-beat
rhythm, UI confidence). Scope authorised by the producer: **ENGINE + CATALOG
only** — no Blender, no new keyframe authoring. Blender is a held escalation and
§6 is the honest recommendation on whether to spend it.*

**This lane wrote nothing under `src/`, ran no git command, modified no shipped
asset, and spent zero Meshy credits.** Everything below is measured off the
current build through the shipping call path, or read out of the free public
catalog.

---

## 0. What was measured, and with what

Instruments (all throwaway, `tools/_h-*`, safe to delete):

| tool | what it does |
|---|---|
| `tools/_h-beat-trace.mjs` | headed Playwright against `npm run dev`. Wraps the live `CombatState`/`CombatScene`/`CombatHUD`/`CombatCinematics`/`MeshyAnimator`/`AudioManager` methods on the real instance, drives one real Attack, and logs every beat with `performance.now()`. Simultaneously runs a 60 Hz rAF sampler reading the **actual `AnimationMixer` state** (clip, clip-time, blend weight), the striking hand's position in the hips' own frame, camera pose, `freezeTimer`, `shakeAmount`, the *computed* HP-bar width, and the live damage-number count. Plus a CDP screencast whose frame timestamps are converted into the same clock. |
| `tools/_h-beat-report.mjs` | turns the trace into the ms timeline below |
| `tools/_h-beat-strip.mjs` | contact strip from the screencast, labelled with measured offsets |
| `tools/_h-clip-keyframe.mjs` | loads each clip through `MeshyCast.CLIP_LOADER` + `MeshyRetarget.captureRest/retargetClip` onto Andrew's real rig, steps a real mixer with `setTime`, and reports where inside each clip the committed strike lives |
| `tools/_h-clip-probe.mjs` | free catalog recon: 680-row `catalog.json` + the gender table, with clip DURATION measured off the public preview GIF via `ffprobe` |

**Call-path discipline (HANDOFF §4.3).** Nothing here renders through a
convenience harness. The trace instruments the live `window.__combat` instance
in a real fight; the keyframe tool binds clips through `MeshyCast.instance()`
and the shipping retargeter. The one place a harness value is used instead of a
shipping value is enemy `maxHP`, pinned so the fight cannot end mid-measurement
— which is why the HP-bar numbers are quoted from the `hp400` run (maxHP 400,
a realistic boss bar) and not the `99999` run.

**Cross-validation.** The contact frame was found two independent ways — live
rAF sampling in three separate fight runs, and offline mixer stepping of the
same clip — and they agree: a191's strike peaks at clip time **0.522–0.533 s**
in all four measurements.

**GIF-duration method, validated before use.** Eighteen clips whose GLB duration
is already known were probed off their preview GIFs: 17 of 18 landed within
**−0.19 … 0.00 s** (systematic one-frame undershoot). The single outlier is
`a88` at +1.50 s — and the offline keyframe tool then measured a88's real GLB at
**4.867 s**, i.e. the GIF was right and `FINAL_SLATE.md`'s recorded "3.4 s" for
a88 is wrong. Treat GIF duration as ±0.2 s.

Artifacts: `screenshots/h-run/` (four traces with frames, two contact strips,
`clip-keyframes.json`, `clip-probe.json`).

Rig: Windows laptop, RTX 4050 (the perf target), headed Chromium, 1440×810,
sampler ran at 57.6–59.4 Hz.

---

## 1. CURRENT-STATE BEAT TIMELINE — measured

### 1.1 Player basic attack, Andrew vs Karen (Meshy cast, default)

Offsets in **milliseconds from the committing input** (`_executePlayerAttack`).
Three runs agree within ±10 ms on every engine event.

```
     0   INPUT — _executePlayerAttack
    +2   cine.play('attack')  -> DEFAULT_ATTACK timeline armed
    +3   CombatScene.playerAttackAnim -> playGesture('attack_ally')
    +4   MeshyAnimator.play('attack')  clip a191, 1.800 s
           beat 1.000 x mixer 0.800  ->  2250 ms WALL CLOCK, 250 ms crossfade in
    +6   AudioManager.playSfx('hit')          <-- the hit sound
    +9   _refreshHUD -> hud.updateEnemyHP     <-- the bar is commanded down
   +13   camera pose 'windup'
   +55   enemy HP bar visibly starts draining
   +80   group.position SET to (baseX-1.4, baseZ-1.8)   <-- the "lunge", instant
   +89   full-screen white flash 50 ms; slash sprites spawn
  +174   camera pose 'actor'
  +233   enemyHurtAnim -> enemy plays a178 (2083 ms wall)
  +235   flashEnemy(0.15) ; shake(0.3)
  +236   DAMAGE NUMBER SPAWNS  ("28", 30 px)
  +240   group.position SET back to the mark            <-- lunge over
  +346   hitStop(0.05) + camera pose 'target'   (35-42 ms of freeze measured)
  +477   enemy HP bar has finished draining
  +586   camera released to rest (cineReset)
+741..812  ****  THE FIST REACHES FULL EXTENSION. CONTACT.  ****
             a191 clip time 0.522-0.533 s of 1.800
 +1212   turn passes to the enemy — a191 still has ~1040 ms left to play
 +1617   enemy attack begins
 +3321   control returns to the player  (3321-3331 across runs)
```

Derived, and these are the whole problem:

| relationship | measured |
|---|---|
| hit **sound** before contact | **−735 ms** |
| enemy **hurt reaction** before contact | **−548 ms** |
| **damage number** before contact | **−505 … −576 ms** |
| **hit-stop** before contact | **−395 ms** |
| enemy **HP bar finished draining** before contact | **−264 ms** |
| **camera home** before contact | **−155 ms** |
| lunge travel window | +80 … +240 ms — **it does not overlap the strike at all** |
| clip completion at turn hand-off | **46 %** |
| full exchange (input → enemy attack → control) | **3321–3331 ms** |

Screen channels, frame-sampled: hit-stop active 35–42 ms; shake 377 ms;
punch-in never fires on a normal player hit; full-screen flash 1 frame;
damage number on screen 1094 ms; camera z travels 5.000 → 2.317 across the
exchange (2.68 units, almost all of it the enemy-turn victim cut).

Evidence strip: `screenshots/h-run/strip-player-attack.png`.
Contact frame close-up: `screenshots/h-run/_zoom-741.png` — at the frame the
punch lands, Andrew's arm is fully extended into **empty air a stage-width from
Karen**, his **hand is open with the fingers spread**, Karen is already airborne
in her recovery from a hit that was scored half a second earlier, and the
damage number is mid-fade.

### 1.2 Enemy attack, Karen vs Andrew

The enemy turn opens with a **hard 400 ms of nothing** (`setTimeout(…, 400)` at
`CombatState.js:746`). Offsets below are from `enemyAttackAnim`, which is that
+405 ms.

```
     0   enemyAttackAnim -> playGesture('attack_karen') -> play('attack')
           clip a214, 3.500 s, beat 1.691 x mixer 0.800 -> 2587 ms WALL CLOCK
     0   group SET to z-0.6 (the coil)
   +11   camera pose 'lean'
  +160   group SET to z+1.1, x+0.12, rotY+0.06 (the lunge)
  +205   shake(0.4) ; red flash 100 ms ; allyHurtAnim -> a174 (2396 ms wall)
  +206   playSfx('hit')
  +207   DAMAGE NUMBER SPAWNS ("29", bigdamage, 50 px)
  +286   camera HARD CUT to 'victim' (ease 18) + hitStop(0.06) + shake(0.5)
           ****  the attacker leaves frame here  ****
  +350   group SET back to the mark
  +384   punchIn(0.5) + hit-spark burst on Andrew
  +747   a214's small first push peaks
  +874   camera released to rest
+1072 .. +1898   ****  a214's COMMITTED TWO-FIST SHOVE  ****
                    (clip 1.45-2.567 s at the 1.353x effective rate)
 +1700   the shove peaks
 +1709   turn ends
 +1710   control returns to the player
```

Derived:

| relationship | measured |
|---|---|
| damage number before the committed shove begins | **−865 ms** |
| camera cuts away from the attacker before her shove | **−786 ms** |
| the shove **peaks 10 ms before the player menu comes back** | — |
| a214 is still playing 472 ms after control returns, then is cut off by the crossfade | — |

Evidence strip: `screenshots/h-run/strip-enemy-attack.png`. At the measured
contact frame Karen is **entirely off camera**. The player never sees the blow
that hit him.

### 1.3 Power move ("Assert Dominance")

```
    0   INPUT ; cine.play('power') ; showBanner('ASSERT DOMINANCE')
   +5   _refreshHUD -> HP bar commanded down
  +54   camera 'low' + backdropDarken(0.30, 1200)
 +112   HP bar starts draining
 +345   rimBeat(0.4)
 +427   camera 'low' re-assert
 +547   HP bar has FINISHED draining      <-- 139 ms before the impact beat
 +686   flash(white,0.3) + shake(1.5) + hitStop(0.11) + punchIn(0.7)
        + enemyHurtAnim + playerAbilityLunge(1.0) + damage number "151"
 +698   cine impact step: hitStop(0.16), punchIn(0.9), rimBeat(1.3), flash
+1200   camera released to rest
+2016   turn ends
```

**Andrew's body never plays a clip on the signature move.** `_executePowerMove`
(`CombatState.js:2131`) calls `playerAbilityLunge()` — a group translate — and
never `playerAttackAnim`. No `playGesture`, no `MeshyAnimator.play`. He stands
in his calm stance and slides 1.0 units while the screen does the work.

**The same is true of every ability in the game.** Every case in
`_playAbilityAnim` (`CombatState.js:1602–1850`) uses `playerAbilityLunge` only.
So `file_motion`, `cite_precedent`, and the rest are a group slide plus
particles. Ditto `_executePressAdvantage` (2170). The only actions that play a
body clip are: basic attack, ally attack / Loop-In, break-counter, Retaliate,
Desperate Gamble.

---

## 2. THE PERSONA REFERENCE, decomposed

*Described from the game's grammar, not extracted from its assets. Numbers are
target ranges, not claims about P5R's source data.*

### 2.1 What actually makes a P5R attack read

1. **Cuts, not lerps.** The camera CUTS to the action framing on the frame the
   command resolves, holds dead still through the strike, and CUTS back. Our rig
   eases every move (`_camEase` exponential smoothing). Easing reads as
   hesitation; cutting reads as confidence. This is the single largest stylistic
   difference and it is free.
2. **Travel and wind-up are one motion.** The attacker crosses to the target
   *during* the wind-up, arriving as the strike begins. Ours are two motions on
   two clocks that never overlap.
3. **The strike rise is short.** From "arm starts moving" to contact is on the
   order of 100–150 ms. Everything before that is anticipation, everything after
   is hold.
4. **Everything lands on the contact frame.** Freeze, silhouette pop, impact
   streak, SFX, and the number are one event. Nothing pre-empts the fist.
5. **The freeze is short and hard.** 3–5 frames on a normal hit. Long enough to
   register as weight, short enough that the fight does not stutter.
6. **The follow-through is HELD.** The attacker holds the extended pose for a
   handful of frames after the freeze releases — that hold is what makes a hit
   feel committed. Then the recovery is quick.
7. **The HP bar moves AFTER the freeze**, over ~250–350 ms, with a lag/ghost bar
   trailing it so the player sees the size of the bite.
8. **The number is a graphic object, not text.** It punches in past its final
   size, overshoots, settles, HOLDS, then leaves. It is skewed off-axis. It does
   not slowly float up and dissolve.
9. **Extra time is bought with agency, not with idling.** A weakness gets a
   longer freeze and a card — and then hands the turn straight back to the same
   character ("1 More!"). The player is never watching dead air.

### 2.2 Target beat-timeline template

Expressed **relative to CONTACT (t = 0)**, which is the frame the design must be
built around. Total-beat figures are input → control return.

#### NORMAL ATTACK — total 0.90–1.15 s

| t (ms) | what fires |
|---|---|
| −380 … −140 | approach + wind-up as ONE motion: body travel tweened, clip's coil playing under it |
| −140 … 0 | strike rise (≤150 ms) |
| **0** | **CONTACT.** hit-stop **50–70 ms**; target silhouette flash 1–2 frames; impact streak (1–2 frames, directional); SFX; **damage number spawns and scale-punches**; shake 0.30–0.35 |
| +70 | freeze releases; camera holds the impact framing |
| +80 … +400 | HP bar drains (250–350 ms) with a ghost bar; target recoil clip; attacker HOLDS the extended pose for 100–160 ms then recovers |
| +400 … +560 | camera cuts / settles back to rest |
| +560 … +700 | control returns |

#### WEAKNESS HIT — total 1.10–1.35 s, and it must hand the turn back

| t (ms) | delta from normal |
|---|---|
| **0** | hit-stop **110–150 ms**; camera punch-in 0.55–0.7; rim spike; number in the weakness colour at 1.5× |
| +140 | "WEAKNESS" card / banner slams in (already exists as `showBanner`) |
| +400 | target knock-down or stagger read |
| +700 | **control returns to the SAME actor** — this is what buys the extra 300 ms |

#### CRIT — total 1.00–1.25 s

hit-stop **90–120 ms**, punch-in 0.55, second 1-frame flash, number at 1.7×
in the crit colour. Otherwise the normal template.

#### POWER MOVE (All-Out-Attack analog) — total 2.2–2.8 s

| t (ms) | what fires |
|---|---|
| −1000 … −250 | charge: low camera, backdrop darken, rim build **(already correct today)** |
| −250 … 0 | **the swing itself, which currently does not exist** — a real body clip with travel |
| **0** | freeze **150–200 ms**; white flash; huge number; rim 1.3; punch 0.9 |
| +200 … +900 | finisher hold: banner, held pose, particles |
| +900 … +1400 | camera out, control returns |

---

## 3. GAP ANALYSIS

Tagged **ENGINE** (impact framing we own), **CATALOG** (a better clip exists),
**AUTHORING** (genuinely needs Blender). Most of the feel is ENGINE.

| # | defect | measured | tag | size |
|---|---|---|---|---|
| **G1** | **Contact desync.** Every impact channel is scheduled off a fixed `setTimeout` from the command, not off the clip's contact frame. | number −505 ms, SFX −735 ms, hurt −548 ms, hit-stop −395 ms, camera-home −155 ms | ENGINE | **L** |
| **G2** | **Global `mixer.timeScale = 0.8` slows every reaction, not just the idle it was authored for.** `MeshyAnimator.js:34` sets it on the whole mixer; `MeshyCast` never supplies `def.timeScale`, so all 33 characters run every clip at 0.8×. The carefully-derived beat window is then 25 % longer than designed. | a191 1.800 s → **2250 ms** wall; a214 → **2587 ms** | ENGINE | **S** |
| **G3** | **Travel and strike never overlap.** `playerAttackAnim` *sets* `group.position` at +80 ms and sets it back at +240 ms. Contact is at +780 ms. The lunge is a teleport, and it is over before the arm moves. | travel 80–240, contact 741–812 | ENGINE | **M** |
| **G4** | **HP bar drains before the hit.** `_refreshHUD()` runs synchronously inside `_executePlayerAttack`. The CSS transition is `width 0.5s ease`. | bar 55 → 477 ms, contact 780 ms | ENGINE | **S** |
| **G5** | **Hit SFX fires with the command.** `CombatState.js:1532` sits between two synchronous statements. Instrumented, not inferred: `SFX cue="hit"` at **+6 ms**. | −735 ms | ENGINE | **S** |
| **G6** | **Hit-stop is short, late, and does not stop the camera.** Requested 50 ms, measured 35–42 ms; fires 395 ms early. `CombatScene.update` early-returns during freeze but `CombatState.update` calls `cine.update(dt)` and `particles.update(dt)` *unconditionally* — so the camera timeline advances through a "freeze". The comment at `CombatState.js:2538` claims the opposite. | | ENGINE | **S** |
| **G7** | **The camera abandons the impact.** `DEFAULT_ATTACK` returns to rest at t=0.52 (measured +586 ms); contact is at +780. Punch-in never fires on a normal player hit. | | ENGINE | **S** |
| **G8** | **The enemy's strike is never seen.** `ENEMY_ATTACK` cuts to the `victim` pose at t=0.30 with ease 18 — a hard cut — removing the attacker from frame 786 ms before her committed shove. | | ENGINE | **M** |
| **G9** | **No body clip on the power move, on any ability, or on Press Advantage.** They call `playerAbilityLunge` only. | `CombatState.js:2131`, `1602–1850`, `2170` | ENGINE | **M** |
| **G10** | **`cast` is aliased to `attack`.** `MeshyClips.js:227`. Every heal / buff / debuff / confuse turn is the same punch. | | CATALOG + ENGINE | **S** |
| **G11** | **The punch reads as an open-handed reach.** Verified from the GLB JSON chunks: the rig is **24 joints, zero finger bones** (`Hips, L/R UpLeg/Leg/Foot/ToeBase, Spine02/01/Spine, L/R Shoulder/Arm/ForeArm/Hand, neck, Head, head_end, headfront`), and every clip carries exactly 25 channels over those nodes. **No clip in the 680-row catalog can ever close a fist** — the hand pose is frozen at bind for the life of the model. | see §6 | AUTHORING (with a strong non-Blender workaround) | — |
| **G12** | **Beat lengths are ~2× the comp.** Player attack 2250 ms, enemy 2587 ms, hurt 2083–2396 ms against a 0.9–1.3 s target. | | CATALOG + ENGINE | **M** |
| **G13** | **The female Brace barely holds a guard.** a420's hands are up for only 1.60–1.90 s of a 4.10 s clip that plays on `LoopRepeat` — 17 % of a 5.03 s wall-clock loop. The male a138 by contrast never drops below 56 % of its range and reads as a guard throughout. The two builds' Brace do not read as the same mechanic. | keyframe curves, §4.4 | CATALOG | **M** |
| **G14** | **The damage number has no confidence.** `floatUp` / `floatUpBig` float up 70–80 px and dissolve over 1.2 s; on screen 1094 ms. No skew, no hold, no exit. | `styles/combat.css:377–441` | ENGINE | **S/M** |
| **G15** | **The victim ride-out clips the lens into Andrew's shoulder** — at +1737 ms of the enemy beat a pink blur occupies the right third of the frame. | `strip-enemy-attack.png` tile 8 | ENGINE | **S** |
| **G16** | **No follow-through, and the attack gets interrupted.** After contact the clip runs another ~1.5 s with nothing authored on it, the turn moves on at 46 % completion, and Andrew's own `hurt` crossfades in over the unfinished punch. | | ENGINE | **S** |
| **G17** | **400 ms of dead air opens every enemy turn**, plus a 419 ms gap between the player's number leaving and the enemy's arriving. | `CombatState.js:746` | ENGINE | **S** |

**Honest counts: 14 ENGINE, 3 CATALOG, 1 AUTHORING.** The feel is in the engine.

---

## 4. CLIP RE-CAST PROPOSAL

The re-cast is **per archetype**, with three bosses earning signatures. The
gender-of-performance law is respected absolutely: every clip below is
performed by a body of the same build as the sculpt it plays on.

### 4.1 The measurement that changes the casting question

`tools/_h-clip-keyframe.mjs`, every clip stepped on Andrew's real rig through
the shipping retargeter. `peak%` is where inside the clip the committed strike
sits; `rise` is how long the strike takes from a genuine low to the peak.

| clip | perf | dur (s) | peak (s) | peak% | committed window | rise |
|---|---|---|---|---|---|---|
| **a191** Left Jab from Guard | m | 1.800 | 0.533 | 29.6 % | 0.433–0.717 | **200 ms** |
| **a205** Punch Combo 5 | f | 3.867 | 0.933 | 24.1 % | 0.850–1.083 | **167 ms** |
| **a210** Boxing Guard, Prep Straight Punch | f | 4.000 | 1.900 | 47.5 % | 1.867–2.033 | **117 ms** |
| **a214** Punch Forward with Both Fists | f | 3.500 | 2.300 | 65.7 % | **1.450–2.567** | 950 ms |
| a178 Hit Reaction | f | 1.667 | 0.500 | 30.0 % | 0.333–0.583 | 500 ms |
| a420 guard | f | 4.100 | 1.700 | 41.5 % | 1.600–1.867 | — |
| a138 guard | m | 3.500 | 2.867 | 81.9 % | 1.983–3.483 | — |
| a318 Scheming Hand Rub | f | 3.333 | 3.333 | 100 % | last frame only | — |
| a88 Chest Pound Taunt | m | **4.867** | 4.133 | 84.9 % | 3.983–4.267 | 450 ms |
| a543 Step Back | f | 0.933 | 0.167 | 17.9 % | 0.050–0.383 | 167 ms |
| a409 Finger Wag No | f | 5.033 | 0.850 | 16.9 % | 0.750–1.067 | 233 ms |

*Limitation, stated: `rise` is only meaningful when the curve genuinely dips
below 25 % of its range before the peak. That is true for a191, a205, a210 and
a214 — the four clips this section makes claims about. For clips that start
already extended (a138, a49, a59, a175) the printed rise is an artefact of the
threshold walk and must be ignored. Separately, hand-from-hips is a poor
discriminant for `hurt`/`stagger`, where the motion is in the torso; the a174
row in `clip-keyframes.json` should not be read as "a174 has no beat".*

**Two things fall out of this table.**

1. **a205 and a210 contain 117–167 ms strike rises.** That is Persona-grade
   snap, and it is already on disk. The reason the female attack currently reads
   as slow is not the performance — it is that 75 % of the clip is approach and
   recovery that the game plays at full length.
2. **a214's real strike is its SECOND half.** The committed two-fist shove lives
   at 1.45–2.57 s. Today the clip is compressed 1.691× so the *whole* 3.5 s
   fits the beat — which speeds up the shove *and* keeps 1.45 s of dead
   pre-motion. Trimming instead of compressing solves both.

### 4.2 The mechanism: trim, don't compress

`THREE.AnimationUtils.subclip` exists in the pinned three@0.183 (verified). The
trim belongs in `MeshyClips.clipFor()` immediately after `retargetClip`, keyed
into the existing `retargeted` cache — one function, no new module, no asset
change, no credits.

Proposed source-clip trim windows, read off the curves above:

| clip | trim (source s) | length | contact inside trim | note |
|---|---|---|---|---|
| **a191** | 0.150 – 0.950 | **0.80 s** | 0.383 s | coil at the head, 0.15 s of hold, clean recovery |
| **a214 (shove)** | 1.250 – 2.150 | **0.90 s** | 0.250 s | opens on the retract, hits at 0.25, then a **0.65 s held shove** — the follow-through is free |
| **a214 (fast alt)** | 0.500 – 1.150 | 0.65 s | 0.420 s | the small first push, if a shorter female beat is wanted |
| **a205** | 0.600 – 1.300 | 0.70 s | 0.333 s | the fastest female punch on disk; little natural hold |
| **a210** | 1.550 – 2.350 | 0.80 s | 0.350 s | 117 ms rise, unambiguously martial |
| **a178** (hurt f) | 0.000 – 1.100 | 1.10 s | 0.500 s | drops 0.57 s of settle tail |

**Where the a214 @ 1.691 watch-item should land: nowhere.** Trim it to
1.250–2.150 and play it at **1.000×**. Nothing is sped up, so the fast-forward
risk the slate flagged is retired rather than tuned. The gender beat lengths
then match by construction (0.80 vs 0.90 s) instead of by correction, and
`BEAT_TOLERANCE` becomes a safety net rather than a load-bearing knob.

### 4.3 Per-archetype attack casting

All clips marked **[disk]** are already extracted and cost nothing; they live in
the gitignored `art/char_refs/meshy_pilot/_clips/gender/clips/` and would need
copying into `public/meshy/clips/` by the build lane. **[3 cr]** means a Meshy
animation task the producer must approve.

| archetype | members | male-built pick | female-built pick | why |
|---|---|---|---|---|
| **Player + allies** | andrew, alex_it, isaiah / janet, diane | **a191 trimmed 0.15–0.95** (shipping) | **a205 trimmed 0.60–1.30** [disk] | the repeated beat; needs the shortest rise and the cleanest read. a205's 167 ms rise is the best female number on disk. |
| **Suit / corporate** | karen, rachel_boss, firm_*, regional_director, chief_of_restructuring, corporate_lawyer, compliance, regional, ross_boss, brand_consultant, data_analytics_lead, cfos_assistant, restructuring_analyst | **a191 trimmed** | **a214 trimmed 1.25–2.15** [disk] | the two-hand shove *is* the satire — "she pushes the file at you". Open hands are CORRECT here (see §6). |
| **Physical / gym** | chad, security_guard, networking_guy / parking_enforcer, hr_rep | **a193 Left Hook from Guard** — male(high), **1.00 s**, needs no trim [3 cr] | **a210 trimmed 1.55–2.35** [disk] | the only archetype where a boxing read is right. a193 is the shortest punch in the catalog. |
| **Elder** | client_m_elder / grandma, client_f_elder | a191 trimmed, retimed 0.85× | a214 trimmed, retimed 0.85× | slower is characterful here; a retime on a *trimmed* clip is a 15 % change, not a 69 % one |
| **Roguelite clients** | client_m_*, client_f_* | archetype default | archetype default | never share a stage with a story boss |
| **The Algorithm** | — | procedural, out of scope | — | producer ruling |

**Boss signatures worth the spend (3 cr each, all optional):**

- **Chad → a193** "Left Hook from Guard" (male, high, 1.00 s). His whole
  character is that he thinks he can fight.
- **Grandma → the `Fighting/AttackingwithWeapon` band** (38 rows, **never
  screened for performed gender** — this must be preview-screened free before
  any spend). Her cane is already bone-socketed on `RightHand` with an upright
  constraint (`MeshyProps`), so a weapon-band swing is the one clip class that
  would actually use the prop.
- **Karen → a214 trimmed** as above. No spend. The purse stays baked into the
  mesh (HANDOFF §2.2 is unchanged by this document).

### 4.4 The Brace re-cast (G13)

a420 holds a guard for 17 % of its loop, on `hold: true`. Two options, both
CATALOG:

1. **Free:** trim a420 to **1.550–2.000 s** (0.45 s) and loop that — the hands
   stay up because the loop *is* the hands-up window. Short loops are already
   accepted on this project (five idles are ~2 s, `MESHY_SLATE.md` §8.2).
2. **3 cr:** re-cast to **a210** (female, high confidence, boxing guard) — which
   is the clip `FINAL_SLATE.md` ranked #2 for exactly this role and rejected only
   because it "reads as guard first and satire second". If a210 is taken as the
   female *attack* per §4.3, use **a543 Step Back** [disk, 0.93 s] instead as
   the guard, which loops cleanly at its natural length.

The male a138 needs no change but should be trimmed to **1.98–3.48** so the
loop is the hands-up section rather than the whole approach.

### 4.5 The `cast` split (G10), and the a318 wiring

The producer earmarked **a318 "Scheming Hand Rub"** (female, high, 3.333 s
measured) as the cast fill. Measured verdict: **a318's hand curve peaks on its
very last frame and has no committed beat** — which corroborates
`FINAL_SLATE.md`'s "near-static at combat distance" rendered judgement. It is
castable, but only as a *held* scheming pose, not as a beat.

Recommendation, in order:

1. **Free today, zero credits:** `art/char_refs/meshy_pilot/_clips/raw/action_17.glb`
   and `action_18.glb` are **already downloaded**. `a17 "Skill 1"` (male, high,
   **1.10 s**) and `a18 "Skill 2"` (male, high, **1.33 s**) strip through
   `tools/meshy-clip-fetch.mjs --rawdir=… --rawtag=…` for **zero credits** (that
   path never spends — proven in `MESHY_SLATE.md` §5). Pair **{m: a17, f: a318}**
   and the alias is broken with no spend. a318 is the weaker half; it is a
   *scheme*, and a scheme that barely moves is defensible characterisation for a
   trust officer.
2. **If a318 proves too static in playtest (3 cr):** the `Fighting/CastingSpell`
   band is **almost entirely female-performed** (`FINAL_SLATE.md` §7, from the
   full 590-preview sweep) and is short: **a137 1.36 s, a133 2.20 s, a129 2.24 s,
   a135 2.28 s**. A two-handed forward spell gesture is exactly the register for
   "files a motion". **Caveat: the 218-row `clip_gender_table.json` does not
   cover these rows individually — the band verdict is a sweep-level claim.
   Preview-screen the specific id free (`tools/_gender-screen.mjs --ids=…`)
   before spending.**

`cast` must be split as a **pair or not at all** — that law from the slate
stands, and the a17/a318 pair satisfies it for free.

### 4.6 Full free-vs-spend ledger for §4

| free today (on disk / strippable at 0 cr) | needs 3 cr each |
|---|---|
| a191, a214, a205, a210, a543, a318, a88, a409, a138, a420 trims | a193 (Chad) |
| a17 / a18 strip from existing raws | a137 / a133 / a129 / a135 (female cast, if a318 fails) |
| every trim window in §4.2 and §4.4 | `AttackingwithWeapon` screen → 1 clip (Grandma) |

**The entire re-cast can ship at ZERO Meshy spend** if Chad accepts a191 and
a318 holds as the female cast. The three spend items are polish.

---

## 5. IMPACT-FRAMING SPEC

Concrete engine work, each mapped to the owner today, sized, in build order.
A builder can execute this cold.

### 5.0 The one new concept: a contact table

Everything in Phase 2 depends on the engine knowing *when the fist lands*.
Define it once, in source-clip seconds, beside the trim:

```js
// src/combat/MeshyClips.js  (new, ~15 lines)
// trim + contact are in SOURCE clip seconds, measured by
// tools/_h-clip-keyframe.mjs. contactMs is derived, never hardcoded.
export const CLIP_BEATS = {
  191: { trim: [0.150, 0.950], contact: 0.533 },
  214: { trim: [1.250, 2.150], contact: 1.500 },
  205: { trim: [0.600, 1.300], contact: 0.933 },
  210: { trim: [1.550, 2.350], contact: 1.900 },
  178: { trim: [0.000, 1.100], contact: 0.500 },
  138: { trim: [1.983, 3.483] },
  420: { trim: [1.550, 2.000] },
};
```

`MeshyAnimator` gains `contactMs(role)` = `(contact − trim[0]) / (beat × mixer)
× 1000`. `CombatScene` gains `allyContactMs(i)` / `enemyContactMs(i)`.
Any role with no entry returns `null`, and every call site falls back to its
current hardcoded delay — so a partially-filled table degrades to today's
behaviour instead of breaking.

### 5.1 Phase 1 — the free wins (do these first, they are independently shippable)

| # | change | owner today | size |
|---|---|---|---|
| 1.1 | **Stop slowing reactions.** Set `mixer.timeScale = 1` and apply the 0.8 as the *idle action's* `setEffectiveTimeScale(0.8)` instead. Immediately shortens every reaction by 20 %. | `MeshyAnimator.js:34`, `_toIdle()`, `play()` | **S** |
| 1.2 | **Move SFX to impact.** `playSfx` moves inside the impact callback in the basic-attack branch and every `_playAbilityAnim` case. | `CombatState.js:1532` and 17 `playSfx` sites in `_playAbilityAnim` (1602–1860) | **S** |
| 1.3 | **Split `_refreshHUD`.** Extract `_refreshHPBars()`; `_refreshHUD()` stops touching HP. Bars are refreshed from the impact callback only. | `CombatState._refreshHUD`, `CombatHUD.updateEnemyHP` (949-line file, line 283) | **S** |
| 1.4 | **Ghost bar.** Add `.combat-enemy-hp-ghost` behind the fill: snaps to the old width on impact, then eases to the new width over 450 ms with a 120 ms delay. Fill itself drops to 180 ms. | `styles/combat.css:267–272`, `CombatHUD._renderEnemyRow` | **S** |
| 1.5 | **Freeze means freeze.** Gate `cine.update(dt)` and `particles.update(dt)` on `scene.freezeTimer <= 0`, matching what the comment already claims. | `CombatState.js:2536–2539` | **S** |
| 1.6 | **Kill the enemy-turn dead air.** `setTimeout(…, 400)` → 150 ms. | `CombatState.js:746` | **S** |
| 1.7 | **Fix the shoulder clip.** Pull `victim`/`victimHard` pos.z from −2.72/−2.88 to ≈ −2.30/−2.45 and re-verify against `meshy-framing-gate`. | `CombatCinematics.js:63–64` | **S** |

### 5.2 Phase 2 — contact-locked impact (the core of the fix)

| # | change | owner today | size |
|---|---|---|---|
| 2.1 | **Trim at load.** `AnimationUtils.subclip` after `retargetClip`, cached in the existing `retargeted` map under a trim-aware key. | `MeshyClips.clipsFor/clipFor` | **M** |
| 2.2 | **Re-derive the beat window off trimmed durations.** `BEAT_REFERENCE` becomes a fixed **0.80 s** target for `attack`/`cast`; `beatTimeScales()` unchanged otherwise. Trimmed clips land inside ±15 % naturally, so no clip is time-distorted. | `MeshyClips.js:47–57, 243–255` | **S** |
| 2.3 | **`contactMs()` + one `_scheduleImpact(fn)` helper** replacing every hand-tuned `setTimeout(…, 220/300/350/500)` in the attack paths. Falls back to the current constant when the table has no row. | new in `MeshyAnimator`/`CombatScene`; consumers `CombatState._playPlayerActionResult:1535`, `_playAllyResult:989`, `_runSingleEnemyTurnInterleaved:699`, `_playAbilityAnim` ×17 | **L** |
| 2.4 | **Tween the travel across the rise.** Replace the two `group.position` assignments with a `tween` from mark → strike position over `contactMs`, a hold of 140 ms, then a 200 ms ease back. `src/utils/tween.js` + `updateTweens(dt)` already exist and are already driven. | `CombatScene.playerAttackAnim:937–970`, `enemyAttackAnim:844–865`, `playerAbilityLunge:1049` | **M** |
| 2.5 | **Re-time every cinematic timeline around contact = 0.** With `contactMs` known, `cine.play(name, { contactMs })` offsets the timeline so the impact step lands on the contact frame. Concretely for a trimmed a191 (contact ≈ 380 ms): `windup` 0.00, `actor` 0.10, **impact 0.38**, hold 0.38–0.52, `rest` 0.62. | `CombatCinematics._resolve/play/_exec`, all 9 timelines | **M** |
| 2.6 | **Enemy: cut to the victim AFTER contact.** `ENEMY_ATTACK` holds `lean` through contact, cuts to `victim` at contact + 60 ms. `ENEMY_HEAVY` the same at + 40 ms. | `CombatCinematics.js:176–205` | **S** |

### 5.3 Phase 3 — beat classes and confidence

| # | change | value | size |
|---|---|---|---|
| 3.1 | **Beat-class table** replacing the ad-hoc `shake()` thresholds: `{ normal: {stop:60, punch:0.25, shake:0.32, flash:0.04}, crit: {stop:105, punch:0.55, shake:0.55, flash:0.07}, weak: {stop:130, punch:0.65, shake:0.6, rim:0.85}, power: {stop:180, punch:0.9, shake:1.1} }`. Owner: `CombatScene.shake()` currently *infers* hit-stop from intensity (`716–730`) — invert it, so the class drives all four channels. | one source of truth; today the classes are inferred ad hoc across 24 `scene.shake()` and 45 `scene.flash()` call sites in `CombatState` alone | **M** |
| 3.2 | **Follow-through hold.** After contact, hold the strike pose 140 ms (`action.paused = true` for the hold window) before letting the clip run out. | the single biggest "committed" cue after contact-lock | **S** |
| 3.3 | **Damage number confidence.** New keyframes: spawn at 0.6 scale, overshoot to 1.35 at 90 ms, settle 1.0 at 160 ms, **hold to 620 ms**, then translate-out + fade by 800 ms. Add a 4° skew and a 1-frame white flash on the glyph. Owner: `styles/combat.css:377–441`, `FloatingText.js`. | the cheapest single step toward P5R's UI voice | **S** |
| 3.4 | **Body clips on the power move / abilities / press advantage.** `_executePowerMove` and each `_playAbilityAnim` case call `playGesture('attack')` (or `'cast'` for non-damaging ones) alongside the existing lunge. | removes "the hero has no body on his signature move" | **M** |
| 3.5 | **Split `cast`** per §4.5 — `CLIP_IDS.cast = { m: 17, f: 318 }`, drop the alias at `MeshyClips.js:227`, add both to `preloadClips`. | | **S** |
| 3.6 | **Weakness hands the turn back.** On `effective === 'super'`, after the weakness card, return input to the same actor once per turn (a Loop-In-shaped gate). This is a *design* change and needs the producer's word — it is listed because without it the weakness beat has nothing to spend its extra 300 ms on. | | **M**, needs producer sign-off |

### 5.4 Suggested commit sequence

1. Phase 1 (1.1–1.7) — one commit. Independently valuable, no behaviour risk.
   Re-run `tools/_h-beat-trace.mjs` and diff the timeline; expect every reaction
   20 % shorter, SFX and bar on the impact beat, dead air down ~250 ms.
2. `CLIP_BEATS` + 2.1 + 2.2 — one commit. Verify with
   `node tools/meshy-spine-gate.mjs` (trimming must not move the gate numbers)
   and `tools/_h-clip-keyframe.mjs` (contact fraction inside the trim).
3. 2.3 + 2.4 + 2.5 + 2.6 — one commit. This is the one that changes the feel.
   Re-run the trace; the acceptance test is **|number − contact| ≤ 35 ms**.
4. Phase 3 in two commits (3.1–3.3 framing/UI, 3.4–3.5 bodies), 3.6 held for
   the producer.

---

## 6. CEILING PREDICTION

*Written to be useful for a go/no-go, not to protect the scope.*

**ENGINE + CATALOG reaches the Persona bar on rhythm, impact confidence and turn
flow. It does not reach it on hand articulation or on the finisher's UI
language, and only one of those two is a Blender problem.**

The reason I am confident about the first half is that the defects are not
subtle taste calls — they are a half-second of desync, measured four ways. The
damage number lands 505 ms before the fist; the hit sound 735 ms before; the
camera goes home 155 ms before. Fix that and you have not "improved" the attack,
you have made it *exist*. Nothing in the current build is stopping the strike
from reading — the strike is simply never on screen at the same time as its own
consequences. And the raw material is better than it looks: a205 and a210 carry
**117–167 ms strike rises**, which is Persona-grade snap sitting unused inside
clips the game currently plays at four times their useful length.

**What will still miss, and why.**

1. **The hands.** Verified from the GLB JSON, twice: the rig is 24 joints with
   **no finger bones**, and every clip carries exactly 25 channels over those
   nodes. The hand is a rigid block frozen at bind pose, permanently, on all 33
   models. Every "punch" ends in an open hand with the fingers spread — visible
   at combat framing in `screenshots/h-run/_zoom-741.png`. **No re-cast can fix
   this**, because it is not in the clips.
   - The workaround is not Blender, it is **register plus props**. An open hand
     is *correct* for a shove, a point, a document slam, a finger-wag. Those are
     the right attacks for this game anyway — a trust officer does not box. §4.3
     already casts the suit archetype onto a two-hand shove for exactly this
     reason. And `MeshyProps` already does bone-socketed props with an upright
     constraint (Grandma's cane is the working precedent), so a rolled-up file
     or a clipboard in the hand turns "open fingers" into "holding something".
   - The residue after that workaround is **Chad**, and only Chad — a gym bro
     whose punch should look like a punch. One character.
2. **The All-Out-Attack-class finisher.** P5R's Power Move analog does not win
   on animation; it wins on a **2D splash card** — silhouette, skewed type, a
   character portrait, one enormous number. Our power move can get a real body
   clip (§5.3 item 3.4) and a proper freeze, and it will read as a heavy hit.
   It will not read as a *set piece* until someone draws the card. **That is an
   illustration job, not an animation job, and Blender does not touch it.**
3. **Cut-ins and the comic-book UI voice** generally — the same answer. It is the
   largest remaining gap to "Persona confidence" after §5 lands, and it is a 2D
   art lane.

**Would Blender close the gap? Narrowly, and I would not start it now.**

The honest Blender case is *not* clip authoring. Authoring 33 characters' worth
of bespoke attacks would be enormous, and the catalog already contains strikes
with better snap than we are using. The only clean Blender wins are:

- a **fist bind-pose pass** — a per-model hand-mesh or blend-shape edit across
  33 models to close the fingers. That is a real job for a defect that props and
  register can hide, and it would make every *open-handed* gesture (the calm
  stances, a318, the victory cheers) worse.
- **three to five bespoke boss signature strikes** — genuinely nice, genuinely
  optional, and only worth it once the timing is right, because a bespoke clip
  played 500 ms out of sync looks exactly as bad as a stock one.

**Recommendation: do not open Blender. Ship §5 Phases 1–3, then re-judge.** My
prediction is that most of what currently reads to a critic as "the animation is
bad" will be gone, because it was never the animation — it was the schedule. If
after that pass the judges still fail it, the failure will name *hands* or
*cards*, and only one of those is Blender's to solve.

---

## 7. JUDGE PROTOCOL

What the build lane must capture so an Opus-max / Fable-xhigh pair can judge
motion honestly. Every artifact is a **video or a measured timeline**, never a
contact sheet of a single frame (HANDOFF §4.4: judge stances by video).

### 7.1 The measured gate — run before any human-eye judging

`node tools/_h-beat-trace.mjs --fight=<x> --hp=400` then `_h-beat-report.mjs`.
**PASS requires all of:**

| metric | ceiling |
|---|---|
| \|damage number − contact\| | **≤ 35 ms** (2 frames) |
| \|hit SFX − contact\| | **≤ 35 ms** |
| \|hit-stop start − contact\| | **≤ 35 ms** |
| HP-bar travel start − contact | **+60 … +160 ms** (after, never before) — **measured with `tools/_h-hpbar-probe.mjs`, NOT with this harness; see 7.1a** |
| camera released to rest − contact | **≥ +350 ms** |
| body-travel window ∩ strike-rise window | **non-empty** |
| clip completion at turn hand-off | **≥ 90 %** |
| total exchange (input → control) | **≤ 2600 ms** (from 3321–3331) |
| attack beat wall-clock, both builds | **0.75 – 1.15 s**, within 15 % of each other |

### 7.1a The HP-bar row is measured off-capture, and here is why

**Added 2026-08-04, judge fix round 2.** The round-1 ledger reported this row as
**contact +78 ms**. That was not a reading — it was `HUD_enemy_hp_cmd` plus the
`transition-delay` in `styles/combat.css`, i.e. CSS arithmetic. The frame
sampler in the same run printed **+226 ms**. The correct instrument value for
that build/run is **+226**, and the ledger has been corrected (`alexmemory.md`,
and explicitly in the round-2 commit body).

Re-running the same harness on the same build then printed **+337** and **+305**.
The build did not change between those runs; the harness did not either. What
varies is the **CDP screencast**, which stalls the main thread:

| run | `FX_hitstop` in the EVENT log | hit-stop in the FRAME sample | sampler lag | HP-bar − contact |
|---|---|---|---|---|
| round-1 `after` | +357 ms | 339–374 ms | ~0 | **+226** |
| `r2a` | +454 ms | 667–682 ms | **+213 ms** | **+337** |
| `r2b` | +441 ms | 625–637 ms | **+184 ms** | **+305** |

Hit-stop is scheduled ~11 ms off contact *by construction*, so a frame-sampled
hit-stop 200 ms late is the instrument, not the game. In the round-1 run the rAF
cadence held but the *style→paint commit* did not: style write → travel start
measured **208 ms** there against **89 ms** off-capture.

So the gate row is measured with `tools/_h-hpbar-probe.mjs` — the same rAF
sampler, the same `getComputedStyle(.combat-enemy-hp-fill).width`, the same
peak-hand-reach definition of contact, **no screencast**, five consecutive
attacks in one session, median reported. The player is never under a screencast;
this is the closer instrument, not the more forgiving one.

Current build, `--fight=karen --n=5`, `transition: width 0.18s linear 0.06s`:

```
  # | contact | styleWrite | hp start | hp end | travel | start-contact | start-write
  1 |     517 |        439 |      583 |    767 |    184 |            66 |         144
  2 |     411 |        422 |      502 |    687 |    185 |            92 |          81
  3 |     415 |        405 |      481 |    664 |    183 |            67 |          76
  4 |     415 |        397 |      488 |    665 |    178 |            73 |          91
  5 |     423 |        410 |      498 |    677 |    179 |            75 |          89
  MEDIAN start-contact = 73 ms   start-write = 89 ms   travel = 183 ms
```

**+73 ms, band +60…+160: PASS.** The band is NOT widened and the CSS
`transition-delay` is NOT changed — pulling the 0.06 s toward 0 would land the
row near +13 ms, i.e. *below* the band, which is the defect the band exists to
stop. The ghost bar still carries the readable part.

Regression guards that must not move: `node tools/meshy-spine-gate.mjs`
(exit 0; `Hips>Spine02` stays 32.8–40.5°, joint excess ≤ 6°, gaze dy ≤ 0.010,
floor penetration within ±0.01 m) and `node tools/meshy-framing-gate.mjs --all`
(54 combatants, 0 failing). Trimming a clip changes its ground-offset minimum —
**`groundOffsets()` is computed from the clip minimum, so a trim can lift a
character off the floor. The spine gate is the guard for that and it is not
optional.**

### 7.2 The videos to capture

All **headed**, 1920×1080, 60 fps, through `tools/meshy-comp-video.mjs`'s
existing driver. Each beat class gets its own clip so a judge is never asked to
find the beat inside a long fight.

| # | fight | beat class | what it must contain | framing |
|---|---|---|---|---|
| V1 | karen | **normal player attack** | 3 consecutive basic attacks, no crit | rest camera, uncut |
| V2 | karen | **enemy attack** | 2 consecutive Karen attacks | uncut, so the victim cut is judged in context |
| V3 | chad | **weakness hit** | a `social`-tagged ability into Chad's weakness | uncut |
| V4 | karen | **crit** | forced crit (`COMBAT.CRITICAL_CHANCE = 1` via the dev hook) | uncut |
| V5 | karen | **power move** | Assert Dominance from a full bar | uncut |
| V6 | grandma | **composure break** | a weakness-tag break on a female enemy, then on a male (Chad) back to back | uncut — the gender pair is only judgeable side by side |
| V7 | the_firm | **multi-enemy** | one AoE ability, one Loop-In | uncut |
| V8 | karen | **A/B pair** | the identical V1 sequence rendered on the CURRENT build and the new one | two files, same seed, same pins |

**V8 is the one that decides the round.** The campaign's method is the blind
side-by-side (HANDOFF §1); a judge who is shown only the new build will grade
against memory.

### 7.3 The still that must accompany every video

One labelled contact strip per beat class, built with
`tools/_h-beat-strip.mjs`, at the measured offsets **contact−200, contact−80,
contact, contact+60, contact+160, contact+400**. The judge is being asked one
question at the contact tile: *does anything on this frame tell you a blow
landed?* Today the answer is no — the number is fading and the camera has left.

### 7.4 The brief to give the two critics

- Role: **lead combat animator / fight director at a AAA studio**, comping
  against Persona 5 Royal specifically for *beat rhythm, impact confidence and
  turn-flow swagger* — not for model quality, not for art direction, not for
  UI layout. Those have their own comps and their own lanes.
- Give them the §2.2 template as the rubric, and **the measured numbers from
  §7.1 alongside the video**, so a taste argument can be settled against a clock.
- Give them explicit permission to fail the round, and tell them a critic that
  manufactures objections to look useful is failing its job (HANDOFF §4.1).
- **Divergent lenses.** Critic A judges *timing only*, with the video at 0.25×
  speed and frame-stepping allowed. Critic B judges at **full speed, once
  through, no scrubbing** — because "does it feel good" is a first-pass
  question and a critic who frame-steps will never answer it. Two lenses, one
  PASS each, or the round continues.
- Ask both for **one sentence naming the single worst remaining beat**. If both
  name the hands, the Blender question in §6 has been answered by the artifacts
  instead of by argument.

---

## 8. Things that would mislead you if I did not say them

1. **The enemy `maxHP` was pinned in every trace run** so the fight could not end
   mid-measurement. Every number except the HP-bar timings is unaffected by
   this; the HP-bar numbers are quoted only from the `hp400` run, where 28
   damage against a 400 bar is a realistic 7 % bite.
2. **The contact frame is defined as peak hand-extension in the hips' own
   frame.** For a punch or a shove that is the contact frame. For `hurt` and
   `stagger`, where the motion is in the torso, the metric is weak and I have
   made no claims off it. Anyone extending this work should add a
   head-displacement channel for the reaction roles.
3. **`riseMs` in `clip-keyframes.json` is only valid for clips that dip below
   25 % of their range before the peak.** I initially read a138's printed
   2867 ms as "the Brace takes 3.6 s to raise its hands" — that is **wrong**,
   a138 sits high from frame 0. The claim was removed. Four clips (a191, a205,
   a210, a214) satisfy the condition and are the only ones §4 quotes rises for.
4. **`FINAL_SLATE.md` records a88 as 3.4 s; the GLB measures 4.867 s.** Two
   independent instruments (preview GIF 4.90 s, mixer stepping 4.867 s) agree.
   If a88 is ever cast, budget for the real length.
5. **The `Fighting/CastingSpell` "almost entirely female" verdict is a
   band-level claim** from the 590-preview sweep recorded in `FINAL_SLATE.md`
   §7; the 218-row `clip_gender_table.json` does not carry those rows
   individually and pass 2 did not persist its per-clip reads as JSON. Screen
   the specific id free before spending on it.
6. **Clip durations for candidates not on disk (a193, a212, a137, the weapon
   band) come from preview GIFs, ±0.2 s**, validated in §0 — not from GLBs. The
   *strike curves* in §4.1 are only available for clips on disk; a193's 1.00 s
   is a duration, not a measured rise.
7. **Trimming changes `groundOffsets()`**, which is the clip *minimum*. A trim
   that removes the lowest frame lifts a character off the floor. §7.1 names the
   spine gate as the guard; do not let a builder skip it because "it's only a
   trim".
8. **§5.3 item 3.6 (weakness hands the turn back) is a design change, not a
   feel change,** and it touches the combat economy. It is in the doc because
   the Persona weakness beat has nothing to spend its extra time on without it —
   but it needs Alex's word, not a builder's.
9. **The dev server for this lane ran on :5174 because :5173 was already
   occupied** (presumably wave G). My server and browsers are killed; :5173 was
   never touched.
10. **I did not judge whether the current animation looks good.** This document
    measures *when* things happen and proposes *what* should happen. The
    aesthetic verdict is §7's job and belongs to critics who did not write this.
