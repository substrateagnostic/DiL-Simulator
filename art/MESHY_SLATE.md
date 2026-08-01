# MESHY SLATE — what shipped

**Wired 2026-08-01, branch `display-case`, commit "Meshy V10: the casting slate".**

This is the shipping record for the gender-of-performance casting slate. The
casting *research* — why each clip was picked, what was rejected and on what
evidence — lives in `art/char_refs/meshy_pilot/_clips/gender/FINAL_SLATE.md`
(gitignored with the rest of `art/char_refs/`). This file records what is in
`src/` and `public/meshy/clips/` and the numbers that were measured on it.

---

## 1. What changed

The reaction layer shipped as **seven clips covering all thirty-three
characters**, and three of the seven were female-performed. So twenty-three
male-built bodies flinched, guarded and cheered with a woman's carriage, and ten
female-built bodies punched with a man's. The calm stance was worse: two clips,
hash-assigned, so the whole cast breathed in one of two ways.

Now:

- **Every reaction role is a PAIR**, keyed on the model's build.
- **Every character holds its own calm stance**, from a 33-row table.
- **Beat length is normalized**, because two performances of the same beat are
  not the same length and playing them 1:1 made enemies feel arbitrarily heavier
  or lighter with no design intent behind it.

**The casting axis is the SCULPT'S BUILD**, not the character's pronouns — it is
the `gender` field in `src/data/characters.js`, which is what `CharacterBuilder`
itself branches on for chest width, shoulder line, heel height and skirt cut.
`compliance` (the Auditor) and `brand_consultant` are written they/their and are
cast off male-built sculpts on purpose. **Do not "correct" that on identity
grounds later.**

## 2. Where it lives

| file | what it owns |
|---|---|
| `src/combat/MeshyClips.js` | `CLIP_IDS` (gender-keyed reaction pairs), `IDLE_IDS` (the 33 rows), `genderFor()`, `idleIdFor()`, `beatTimeScales()`, the loader + retarget cache |
| `src/combat/MeshyCast.js` | `preload()` passes the resolved cast to `preloadClips()`; `beatTimeScales` re-exported through the registered provider |
| `src/combat/MeshyAnimator.js` | `play()` defaults `timeScale` to the role's beat multiplier |
| `src/combat/CombatScene.js` | hands `MeshyCast.beatTimeScales(clips)` to the animator |
| `public/meshy/clips/` | 36 clip GLBs, 2771 KB |

`MeshyRetarget.js` and `MeshyPosture.js` are **untouched**.

## 3. Per-character slate, as measured through the shipping `clipsFor()`

`cast` aliases `attack` for every row — splitting it needs a *pair*, and the
study found no female counterpart worth casting. Alias both, or do neither.

Numbers are from `tools/meshy-spine-gate.mjs` (full cast, 9 samples on the
stance, 6 per reaction, driving the real `MeshyClips.clipsFor()`):
`art/char_refs/meshy_pilot/_gate_v9/gate.json`.

| character | build | idle | guard | hurt | stagger | victory | attack/cast | hips>Sp02 max, ALL roles | joint over own bind | gaze dy | stance floor lo..hi (m) | worst reaction floor lo (m) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| alex_it | m | a56 | a138 | a174 | a176 | a49 | a191 | 35.49 | +2.50 | 0.0052 | -0.0003..0.0066 | -0.0077 |
| andrew | m | a336 | a138 | a174 | a176 | a49 | a191 | 34.82 | +2.50 | 0.0060 | -0.0030..0.0035 | -0.0066 |
| brand_consultant | m | a51 | a138 | a174 | a176 | a49 | a191 | 35.51 | +2.50 | 0.0060 | -0.0059..0.0482 | -0.0056 |
| cfos_assistant | m | a314 | a138 | a174 | a176 | a49 | a191 | 34.40 | +2.50 | 0.0059 | -0.0002..0.0041 | -0.0084 |
| chad | m | a388 | a138 | a174 | a176 | a49 | a191 | 33.79 | +2.50 | 0.0060 | -0.0033..0.0099 | -0.0051 |
| chief_of_restructuring | m | a312 | a138 | a174 | a176 | a49 | a191 | 34.75 | +2.50 | 0.0060 | -0.0011..0.0114 | -0.0041 |
| client_f_elder | f | a249 | a420 | a178 | a391 | a59 | a214 | 39.57 | +2.04 | 0.0060 | -0.0024..0.0020 | -0.0028 |
| client_f_pro | f | a243 | a420 | a178 | a391 | a59 | a214 | 34.76 | +2.19 | 0.0060 | -0.0002..0.0056 | -0.0005 |
| client_m_athletic | m | a250 | a138 | a174 | a176 | a49 | a191 | 34.88 | +2.50 | 0.0060 | -0.0036..-0.0003 | -0.0087 |
| client_m_elder | m | a25 | a138 | a174 | a176 | a49 | a191 | 39.38 | +2.50 | 0.0060 | -0.0006..0.0285 | -0.0063 |
| client_m_heavy | m | a312 | a138 | a174 | a176 | a49 | a191 | 34.63 | +2.50 | 0.0060 | -0.0045..0.0082 | -0.0066 |
| client_m_young | m | a251 | a138 | a174 | a176 | a49 | a191 | 34.70 | +2.50 | 0.0060 | -0.0005..0.0001 | -0.0054 |
| compliance | m | a29 | a138 | a174 | a176 | a49 | a191 | 34.67 | +2.50 | 0.0057 | -0.0033..0.0112 | -0.0067 |
| corporate_lawyer | m | a250 | a138 | a174 | a176 | a49 | a191 | 35.00 | +2.50 | 0.0060 | -0.0005..0.0022 | -0.0061 |
| data_analytics_lead | m | a313 | a138 | a174 | a176 | a49 | a191 | 35.15 | +2.50 | 0.0060 | 0.0001..0.0104 | -0.0052 |
| diane | f | a252 | a420 | a178 | a391 | a59 | a214 | 37.73 | +2.48 | 0.0060 | -0.0018..-0.0010 | -0.0020 |
| firm_associate | m | a47 | a138 | a174 | a176 | a49 | a191 | 34.34 | +2.50 | 0.0060 | 0.0022..0.0076 | -0.0062 |
| firm_paralegal | f | a311 | a420 | a178 | a391 | a59 | a214 | 35.49 | +2.50 | 0.0060 | 0.0008..0.0199 | 0.0000 |
| firm_partner | m | a25 | a138 | a174 | a176 | a49 | a191 | 34.73 | +2.50 | 0.0060 | -0.0011..0.0333 | -0.0082 |
| grandma | f | a247 | a420 | a178 | a391 | a59 | a214 | 40.46 | -0.71 | 0.0060 | 0.0004..0.0036 | -0.0016 |
| hr_rep | f | a297 | a420 | a178 | a391 | a59 | a214 | 34.12 | +2.52 | 0.0060 | -0.0041..0.0404 | -0.0017 |
| intern | m | a333 | a138 | a174 | a176 | a49 | a191 | 35.41 | +2.50 | 0.0060 | 0.0006..0.0091 | -0.0054 |
| isaiah | m | a338 | a138 | a174 | a176 | a49 | a191 | 35.30 | +2.50 | 0.0060 | -0.0007..0.0006 | -0.0074 |
| janet | f | a317 | a420 | a178 | a391 | a59 | a214 | 35.09 | +2.50 | 0.0060 | -0.0005..0.0052 | -0.0013 |
| karen | f | a315 | a420 | a178 | a391 | a59 | a214 | 34.32 | +2.50 | 0.0060 | -0.0007..0.0073 | -0.0066 |
| networking_guy | m | a34 | a138 | a174 | a176 | a49 | a191 | 34.78 | +2.50 | 0.0060 | -0.0010..0.0078 | -0.0077 |
| parking_enforcer | f | a309 | a420 | a178 | a391 | a59 | a214 | 32.77 | +2.49 | 0.0058 | -0.0014..0.0031 | -0.0031 |
| rachel_boss | f | a310 | a420 | a178 | a391 | a59 | a214 | 34.18 | +2.50 | 0.0058 | -0.0013..0.0071 | -0.0016 |
| regional | m | a34 | a138 | a174 | a176 | a49 | a191 | 34.99 | +2.50 | 0.0060 | -0.0015..0.0072 | -0.0051 |
| regional_director | m | a2 | a138 | a174 | a176 | a49 | a191 | 34.95 | +2.50 | 0.0060 | -0.0026..0.0061 | -0.0053 |
| restructuring_analyst | m | a251 | a138 | a174 | a176 | a49 | a191 | 34.76 | +2.50 | 0.0060 | -0.0003..0.0008 | -0.0068 |
| ross_boss | m | a333 | a138 | a174 | a176 | a49 | a191 | 35.23 | +2.50 | 0.0060 | -0.0017..0.0058 | -0.0072 |
| security_guard | m | a2 | a138 | a174 | a176 | a49 | a191 | 34.88 | +2.50 | 0.0060 | -0.0006..0.0163 | -0.0021 |

Repeated idles (`a2`, `a25`, `a34`, `a250`, `a251`, `a312`, `a333`) are the
slate's deliberate reuse rows. Each pair is between characters that cannot share
a stage — Tier E minors reuse from solo story bosses, Tier F clients from bosses
a 1-v-1 reception fight never stages — and the per-character `phaseFor()` offset
survives so two bodies never breathe in lockstep even if they ever did meet.

## 4. TimeScale window

Reactions play against the wall clock, so a gender-split layer split the beat.
Rather than pin every clip to one number, each role normalizes to a **window**:

- the **reference** for a role is the duration of the clip that already shipped
  in it — the beat the fight is tuned around — read off the GLB at runtime, so
  swapping a clip re-derives everything;
- the **tolerance** is ±15%;
- a clip is corrected only to the **EDGE** of the band, never to the reference,
  so nothing is sped up further than it has to be.

| role | reference (clip, s) | other build (clip, s) | ratio | timeScale applied |
|---|---|---|---|---|
| `guard` | a138 m, 3.500 | a420 f, 4.100 | 1.171 | **f 1.019** (barely outside the band; a held loop, invisible) |
| `hurt` | a178 f, 1.667 | a174 m, 2.867 | 1.720 | **m 1.496** |
| `stagger` | a391 f, 3.767 | a176 m, 5.633 | 1.495 | **m 1.301** |
| `victory` | a59 f, 9.367 | a49 m, 9.033 | 0.964 | 1.000 — inside the band, untouched |
| `attack` / `cast` | a191 m, 1.800 | a214 f, 3.500 | 1.944 | **f 1.691** |

**Applied window: 1.000 .. 1.691.** Three clips move; two do not.

Where the reference itself is the correction target the study proposed (attack
female 1.95, hurt male 1.72, stagger male 1.50), the window lands 13–15% softer
in every case. The one to watch in playtest is **a214 at 1.691** — a 3.5s swing
compressed to 2.07s. It reads as a committed shove in the fight video; if it
ever reads as fast-forward, widening `BEAT_TOLERANCE` is the single knob.

## 5. Clip provenance — how the 29 new files were produced

The slate's 36 clips were fetched by a research lane running its own copy of the
stripper. Rather than copy that lane's output in on trust, all 29 non-shipping
clips were **re-extracted here through `tools/meshy-clip-fetch.mjs` itself**
(new `--rawdir` / `--rawtag` read another lane's raw exports; they never spend).
Compared against that lane's files:

> **29 of 29 differ only in the 3-character `asset.generator` string.** Parsed
> JSON and BIN payload byte-identical. Zero credits, zero generations.

And the V8/V9 fix cannot be *skipped* by a clip, because it is not in the
stripper: `MeshyRetarget` runs **per character at load**, off the donor rest
pose captured from each clip GLB's own armature. What a stale or foreign file
could do is arrive without that armature, and that is measured:

- **all 36 clips carry 25 tracks** — 24 bone rotations plus the Hips
  translation — over 26 nodes, uniformly;
- **`retargetDroppedTracks` is 0** in every one of the 33 × 7 cells;
- **`Hips>Spine02` is 32.77–40.46°** across every character and every role. The
  V8 discriminant separates a retargeted clip (3.1–39.7°) from a raw-bound one
  (90.3–164.3°) by a ~50° gap. The gate now fails at 60°, inside that gap.

## 6. Verification numbers

`tools/meshy-spine-gate.mjs`, 33 characters, shipping call path:

| | before (unclamped) | shipped | ceiling |
|---|---|---|---|
| worst joint excess over own bind | 58.00° | **2.52°** | 6.0 |
| worst \|gaze dy\| | 0.8511 | **0.0060** | 0.010 |
| worst trunk chord | 27.60° | **7.16°** | 6.0 absolute (elders on delta) |
| `Hips>Spine02`, all roles | — | **32.77 .. 40.46°** | 60 |
| idle posture-clamped | — | **33/33** | — |
| track integrity | — | **33/33** | — |
| clip build / ground measure | — | **7.4 ms / 28.8 ms** avg | — |

**Floor.** The number that matters is PENETRATION, because the per-clip ground
offset is the clip *minimum* — a character can never sink below it, only rise
off it. Worst penetration across all 33 characters and all 7 roles is
**−0.0087 m** (client_m_athletic on a174), against V8/V9's −0.0076 m. Inside the
±0.01 m target; not a regression.

The *upper* numbers grew, and that is the slate's own motion, not hover: gesture
idles have vertical excursion where a breathing stance has almost none. Stance
band is now −0.0059 .. +0.0482 m (was −0.0076 .. +0.0162 with two calm clips).
The +0.0482 is `brand_consultant` on a51 at two samples of nine — a step inside
the outburst. Reactions run −0.0087 .. +0.1453 m, the top of which is the a59
victory cheer leaving the floor exactly as it did before this change.

**In-game.** `tools/meshy-framing-gate.mjs --all`: 54 combatants, 0 failing.
`tools/meshy-entry-timing.mjs`: karen cold entry 960 ms / 1888 KB, the_firm
(3 unique bosses) cold entry 1347 ms / 3705 KB, both against the 2500 ms
warm-up ceiling in `ExplorationState`. Per-character procedural fallback and the
`?nomeshy` escape both re-proved on the production build.

## 7. Loading

`preloadClips(ids)` warms **both builds' reaction pairs always** (10 files,
633 KB) plus **only the staged characters' idles**. Both sides are warmed
because Loop-In can bench-swap an ally of the other build mid-fight, and because
the beat reference durations have to be readable whatever the cast looks like;
warming one side would silently degrade the other to its stance. The 33 idles,
which used to be 2 clips loaded always, are now genuinely per-encounter.

`public/meshy/clips/` went 492 KB → 2771 KB; `public/meshy/` went 19.72 MB →
21.92 MB. **No JS bundle growth** — these are runtime fetches, not imports.

## 8. Known, and deliberate

1. **`brand_consultant` fails the gate's absolute trunk ceiling at 7.16°.** a51
   "Shouting Angrily" is a gesture idle and the 6° ceiling was authored for calm
   breathing stances. It is ONE sample of nine (the rest of the clip sits at
   0.1–3.2°) and his excess over his own bind is 4.25°, inside budget. The gate
   prints the reason so a casting choice cannot read as a rig failure. The
   research file offers the swap if the restructuring trio should read calmer:
   brand_consultant → a34, regional → a333.
2. **Five idles are short loops** — a388 (chad, 1.93s), a251 (1.93s), a317
   (janet, 2.03s), a249 (2.03s), a297 (hr_rep, 2.03s). A 2-second calm stance
   cycles noticeably faster than the 11.3s clip it replaced. It reads as
   characterful on Chad (vanity, on a beat) and is worth a second look on the
   others.
3. **The male stagger a176 turns the torso away from the lens.** At the combat
   camera a Composure Break on a male enemy can show his back for part of the
   beat. It is the register the study wanted (no floor contact, male carriage)
   and it is legible in the stills, but it is the one reaction whose *reading*
   changed most.
4. **`cast` is still aliased to `attack`** for both builds, on purpose.
5. **The male standing-clip pool is at capacity** — 16 usable male-performed
   standing clips for 16 Tier A–D male characters, zero slack. One more male
   character forces either an untested rig's clip or a visible duplicate.

## 9. Instruments

```bash
node tools/meshy-spine-gate.mjs            # full cast, all roles, shipping path; exits 1 on any fail
node tools/meshy-contact-sheet.mjs         # cast sheet in the shipping default mode
node tools/meshy-fight-stills.mjs --fight=karen --tag=slate_karen
node tools/meshy-comp-video.mjs --meshy --tag=slate     # needs npm run dev on :5173
node tools/meshy-framing-gate.mjs --all
node tools/meshy-entry-timing.mjs --fight=the_firm
```

`tools/meshy-spine-floor-review.mjs` is **not slate-aware** — it holds one global
role→clip map and the shipping arrangement is no longer one. Its table is now the
union of both reaction pairs plus the two clips that are still andrew's and
isaiah's stances, which exercises every shared file but says nothing about who
plays what. Use the spine gate for that.

## 10. Deliverables from this pass

| artifact | path |
|---|---|
| cast contact sheet, shipping default mode | `art/char_refs/meshy_pilot/_cast_contact_stances.png` |
| fight video, 74 s incl. both builds' Break and the victory | `art/char_refs/meshy_pilot/comp_videos/fight-karen-slate.mp4` (and `.webm`) |
| per-beat stills, female enemy | `art/char_refs/meshy_pilot/_clips/fight_slate_karen_*.png` |
| per-beat stills, male enemy | `art/char_refs/meshy_pilot/_clips/fight_slate_chad_*.png` |
| gate data | `art/char_refs/meshy_pilot/_gate_v9/gate.json` |

All of those live under the gitignored `art/char_refs/` tree, per convention.
