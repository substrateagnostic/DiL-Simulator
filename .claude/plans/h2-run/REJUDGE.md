# THE ATTACK-FEEL RE-JUDGE (H2) — 2026-08-20

*The queue item was "Persona attack-feel re-judge (H) — after phase surgery lands"
(alexmemory.md board). Phase surgery landed 08-17; this is the re-judge. Comp:
Persona 5 Royal, per the H design doc (.claude/plans/h-run/attack-feel-design.md).
Everything below was captured through the shipping path: production bundle on
`npx vite preview :4519`, `?qtier=high` pinned and sampled, identity-checked
rosters, fights at their designed player level, real DOM clicks.*

---

## 0. The headline: the producer's original note was still true, and it was one line

The original H note — **"enemies A-posing, Karen hovering, awkward animations"** —
had two halves. The warm-up race (bodies staged procedurally forever) was fixed
on 08-15 (0202e6f). The second half was still shipping, on every Meshy body, and
the first honest full-fight capture of this lane found it in minutes:

**Every action has `clampWhenFinished = true`, and a finished LoopOnce action
stays in the mixer's ACTIVE list at full weight, paused on its final frame.**
`MeshyAnimator._toIdle()` faded the stance back in without fading the finished
one-shot out — and `play()`'s own `prev.fadeOut` can never reach it, because by
the next beat `_current` is `'idle'`. So every role that had EVER played on a
body kept blending its clamped last frame into every subsequent frame:

- Measured on karen, quiet input phase after one exchange: `attack` (a214)
  paused at t=0.867 **w=1.00**, `cast` (a318) paused at t=1.033 **w=1.00**,
  under the running idle at w=1.00. Render = avg(stance, shove-final,
  scheme-final) = **arms out at 45°, palms open, feet pigeoned — the pseudo
  A-pose** (evidence: `screenshots/h2-run/videos/before-karen.webm`, any frame
  from 0:14 on; full-res still `screenshots/h2-run/frames/karen-20s.png`).
- The blended `Hips.position` track is the **"Karen hovering"**.
- A new flinch fades to weight 1 against N stuck layers and reads at 1/(N+1)
  amplitude — the **muted, "not really attacking"** look. It compounds per beat.

Why two weeks of gates never saw it: the spine gate reads **clip data**, the
flash probe reads **materials**, the beat trace reads **event timing**. Nothing
read the mixer's live active list. The 08-04 judge videos even contain it
(`screenshots/h-run/videos/normal-hit.webm` from ~0:18 on) — the panel was
judging contact timing, and the builder's own mislead-list said "I did not
judge whether any of this looks good."

**The fix is one `fadeOut` in `_toIdle()`** (commit `ebf996f`), symmetric with
the `fadeIn` the stance already got. New permanent gate:
`node tools/_h2-stuck-layers.mjs --port=<preview>` — asserts the looping idle
is the only accumulating action on every staged body after real beats;
`--legacy` (via `globalThis.__stuckLayerLegacy`) restores the shipped blend and
the gate fails with karen carrying `hurt+attack+cast` all at w=1.00. Verified
5-body breadth on the trio.

---

## 1. Evidence set (all `screenshots/h2-run/videos/`, production path, qtier=high)

| file | fight | level | turns | result | identity |
|---|---|---|---|---|---|
| `before-karen.webm` | karen | 3 | 6 | defeat | OK — **pre-fix build** (the defect reel) |
| `judge-karen.webm` | karen | 3 | 4 | victory | OK |
| `judge-chad.webm` | chad | 6 | 4 | victory | OK |
| `judge-grandma.webm` | grandma | 8 | 9 | victory | OK |
| `judge-meredith.webm` | meredith_boss | 9 | 10 | victory | OK |
| `judge-client.webm` | reception_client | 5 | 1 | victory | OK |
| `judge-trio.webm` | brand_consultant + restructuring_analyst + corporate_lawyer (+ janet) | 7 | 20 | victory | OK (expect row fixed to the encounter's real cast) |

Contact sheets and 10 Hz beat bursts: `screenshots/h2-run/frames/`.
(`judge-report.json` carries only the second capture batch — the first write
overwrote batch 1's rows, a harness defect fixed the same day (the report now
merges); the karen/chad/grandma rows in this table are from the run's console
output, and their videos are the committed evidence either way.)
Driver: competent-casual policy — presses the printed weakness, coffee when low,
Assert Dominance when offered (`tools/_h2-fight-videos.mjs`).

## 2. Scorecard (post-fix build) — per character, per beat

Scale: **A** reads at full speed with no caveat · **B** reads, with a nameable
nit · **C** functional but flat · **F** broken. Timestamps are into the named
judge video.

### Karen (`judge-karen.webm`)
| beat | score | evidence |
|---|---|---|
| stance/idle personality | **A** — a315 entitled hip-cock with a mid-loop gesture; she is a person between beats | 14–17s, 22–24s |
| attack read (a214 shove) | **B** — windup→two-hand push→reverse cut lands; the windup's arms swing HIGH and for 2–3 frames reads closer to a cheer than a shove | 17.0–18.2s; burst sheet `frames/karen-contact-sheet.png` |
| hurt read | **A** — full-body white pop + recoil + particles + number on one frame | 19.2s (118 weakness), 22.1s (62) |
| Composure Break (a391) | **A** — hands-to-head hold, unmistakable | 28.7–31.3s |
| defeat | **A** — collapse to a floor-sit, stays down under CASE CLOSED | 33.3–37.3s |
| A-pose leakage | **none** (before-karen.webm shows the pre-fix state for contrast) | — |

### Chad (`judge-chad.webm`)
| beat | score | evidence |
|---|---|---|
| stance/idle | **A** — double-bicep flex loop; ALPHA MODE phase line lands on a flex | 13.3–15.3s, 21.3–22.7s |
| attack read (a191 jab) | **B** — the jab lands and the cut carries it, but an open-handed jab on the one character whose identity is "thinks he can fight" is the residue the H doc named; a193 Left Hook raw is ON DISK (see packet §P1) | 18–20s |
| break/stagger (a176) | **A** — doubled over, two breaks read | 20.0s, 26.7–27.3s |
| defeat | **A** — floor-sit under the card | 28.7–30.7s |

### Grandma (`judge-grandma.webm`)
| beat | score | evidence |
|---|---|---|
| stance/idle | **A** — hunched cane stance, cane bone-socketed and planted | throughout; 14–20s |
| attack read | **B** — the shove reads, but the CANE never participates; the one prop in the cast stays decorative in combat (packet §P1) | 30–33s |
| Break + THE GERALD INCIDENT card | **A** — break flash into the threat card is the best beat in the set | 23.3–24.7s, 44.7–45.3s |
| Assert Dominance card + number | **A** | 28.0–28.7s (146) |
| defeat | **A** — seated, stays | 48.7–51.3s |

### Meredith (`judge-meredith.webm`)
| beat | score | evidence |
|---|---|---|
| stance/idle | **B** — poised and correct, but the navy suit on the penthouse void loses her silhouette between rim beats; a lighting note, not an animation one (packet §P3) | 15–25s |
| attack read | **B** — same dark-on-dark caveat; the victim cut + number carry it | 33–35s |
| two Breaks + FINAL ASSESSMENT | **A** — both breaks read; the threat card lands on the telegraph with zero numbers | 24–25.3s, 53.3–54s, 58.7–60s |
| defeat | **A** | 62–66s |

### Reception client (`judge-client.webm`)
One-turn fight at L5 — staged, animated, over. The pool body idles and dies
correctly; nothing to score beyond **no A-pose** and the correct floor-sit.

### The trio + Janet (`judge-trio.webm`)
| beat | score | evidence |
|---|---|---|
| three distinct stances | **A** — no two bodies breathe in lockstep (phase offsets doing their job) | 10–20s |
| Loop-In (Janet replies all) | **A** — banner + her shove + the +50% read; fires three times | ~14s, ~40s, ~78s |
| per-enemy hurt/number spread | **A** — numbers spread by slot, the hit body flinches | throughout |
| Breaks on individual bodies | **A** — white flash picks out the broken one | ~43s, ~82s |
| turn rhythm | **B** — 20 turns / 100s is the longest sit in the set; enemy cast turns (buff/debuff) all share the one scheming clip, which flattens a three-enemy round (packet §P2) | — |

### Andrew (every video)
| beat | score | evidence |
|---|---|---|
| idle | **B** — a336 includes a long "presenting/explaining" arm-out gesture; on-brand for a trust officer, but at menu-idle it can read as him pointing at nothing. Taste call, producer's word (packet §P4) | judge-karen 20.7–22s |
| attack/ability read | **A** — travel-on-rise arrives close, streak + white pop + held follow-through on the contact frame | judge-karen 19.2s, 22.1s |
| Power Move | **A** — body clip + card + number on one beat | judge-grandma 28.0s |
| hurt | **A** — hands-to-face flinch under the victim cut | judge-karen 17.4s |

## 3. The Persona-rubric verdict

| criterion | verdict |
|---|---|
| Attack READ (windup/strike/recover) | **PASS** post-fix. Windup coils, strike arrives on the contact frame, recovery returns to a personality stance instead of a blend-mush. |
| Impact CONFIRM (stop/flash/number/SFX sync) | **PASS** — the 093a98a contact-lock numbers still stand (±35 ms family); visually the white pop + number + burst + follow-through hold land as ONE event. |
| Turn RHYTHM | **PASS with a note** — exchanges run ~4–5 s input-to-input; solo fights never sit dead. The note: at-level story bosses die in 4–10 player turns (26–54 s), which is the already-priced L-run balance finding, not an animation one. |
| Idle/stance personality | **PASS** — every body judged holds an authored, per-character stance between beats. |
| A-pose / T-pose leakage | **NONE FOUND** post-fix, across 10 staged bodies in 6 fights. The gate keeps it that way. |

**One fight one number: the before/after is `before-karen.webm` against
`judge-karen.webm`.** Same fight, same level, same policy, same build except
commit `ebf996f`.

## 4. The independent judge (Fable, fresh context, before/after pairs)

**VERDICT: PASS** — *"the fix converts the between-beat stance from a
bind-blend spread pose into authored, personality-bearing idles across all
three fights while impact frames, break beats, and floor-sit defeats all
survive intact; nothing on the after sheets is newly broken."* On impact:
*"The fix moved impact from 'text told me' to 'the frame told me.'"*

Findings and their disposition:
- **Worst remaining beat (named): the turn-back window** — after a weakness
  hit, both actors snap back to neutral idle while OBJECTION SUSTAINED and
  "You have the floor." hang static ~1.5–2 s. "The game's signature One-More
  moment is owned by a motionless banner over two bodies that have already
  left the beat." → **packet §P6** (the Persona answer is a cut-in card, which
  is the producer's art lane; a body answer needs a held follow-through pose,
  which is a taste call on whose triumph the beat belongs to).
- **Nit, FIXED in the round:** COMPOSURE BROKEN banner double-exposed over the
  boss-kill CASE CLOSED card whenever the killing hit was also the Break
  (chad (8,3), grandma (10,2)), and its "Loses next turn" message was false on
  a dead enemy. `_playBreakFeedback` now returns after the chip pulse when the
  target is dead. Verified both arms: killing break → no banner, no false
  message, boss_kill card clean; normal break → banner unchanged.
- **Nit, packeted:** phase-change lines fire over a body mid-stagger or
  mid-death ("Chad flexes and enters ALPHA MODE" over his slumped break;
  "Karen has GONE NUCLEAR" as she dies) → **packet §P7**.
- Grandma's post-defeat hold is the weakest defeat read at 1.5 fps sampling —
  the defeat gate's measured floor-band numbers cover it, but worth one
  eyeball in motion next producer playtest.

---

## PACKET — for the producer (not implemented, priced)

**P1 — The archetype re-cast, now zero-credit.** The H doc's §4.3 casting
(chad→a193 Left Hook; janet/diane→a205; gym-f→a210; f-guard alt a543) was filed
as needing 3 cr for a193. **The raws are all on disk now** —
`_clips/raw/action_193.glb` and `_clips/gender/raw/andrew_action_{205,210,543}.glb`
— so the whole slate strips for 0 credits via the documented
`meshy-clip-fetch --rawdir/--rawtag` path. Cost is wiring: a per-character
attack override table beside `CLIP_IDS` (+ CLIP_BEATS trim rows measured with
`_h-clip-keyframe`), preload additions, spine gate re-run. Post-fix, the
universal attacks READ, so this is polish, not repair; Chad's open-hand jab and
Grandma's inert cane are the two character arguments for it. Recommend: one
small follow-up lane if you want it, not a blocker.

**P2 — Enemy non-attack turns all share one clip.** Heal, buff, debuff and
confuse all play the single `cast` clip per build. In solo fights it reads; in
the trio a full enemy round can be three identical scheming beats back to back.
A tag-keyed enemy cast split (catalog has candidates; the CastingSpell band is
mostly female-performed per FINAL_SLATE §7) is the same wiring shape as P1.

**P3 — Meredith's silhouette.** Navy suit on the penthouse void: between rim
beats she reads as a shadow (judge-meredith 15–25s). That is the lighting lane's
`ARENA_PALETTES.penthouse` rim/pool numbers, not animation. Flagging, not fixing.

**P4 — Andrew's a336 idle gesture.** The long arm-out "presenting" phase reads
as pointing at nothing during menu idle. If it bothers you, the fix is a trim
row on a336 (keep the weight-shift, drop the point), 10 minutes and a spine-gate
run. If it reads as "trust officer mid-explanation" to you, keep it — I lean keep.

**P5 — Karen's shove windup.** a214's trim opens with both arms swinging high;
2–3 frames read as a cheer before the push (judge-karen 17.0s). The doc's own
alternative is the a214 "fast alt" trim [0.50–1.15]. One CLIP_BEATS row + gates,
if you want the beat meaner.

**P6 — The turn-back window is motionless (the judge's worst-remaining-beat).**
After a weakness hit arms OBJECTION SUSTAINED, both bodies return to neutral
idle while the banner and "You have the floor." hang ~1.5–2 s before the
restricted menu is live. The Persona answer is a cut-in card — the splash-card
system already exists and an OBJECTION SUSTAINED / MOTION FOR SUMMARY JUDGMENT
card would be its natural fifth trigger class, but cards are your locked art
slate (PICKS.md), so this is an illustration decision. The cheaper body answer
— Andrew holds his strike follow-through until input returns — costs a
holdPose call but freezes his breathing for the window; judged riskier than
the banner it replaces without a card behind it.

**P7 — Phase lines fire over bodies that are past them.** "Chad flexes and
enters ALPHA MODE" plays while his break stagger has him slumped; "Karen has
GONE NUCLEAR" announces a phase for a boss the same hit killed.
`_checkPhaseChange` reads HP thresholds with no knowledge of the Break beat or
the kill. Ordering (defer the phase line until the stagger resolves; suppress
it outright on a killing blow) is a small CombatState sequencing change —
filing rather than fixing because phase messaging is authored fight scripting
and the same window is load-bearing for the phase screen effect.

**Retired from the old packet** (shipped since the H hold, verified in these
captures): contact-locked impact chain, beat classes/hit-stop/punch-in grammar,
splash cards (power/threat/kill/loss all fired on camera), Objection Sustained
turn-back, defeat floor-sit, victim-cut timing (B21), body clips on Power
Move/abilities/Press Advantage, the cast split.

---

## Gates run on the fixed build

| gate | verdict |
|---|---|
| `npm run check` | exit 0 |
| `meshy-spine-gate` | PASS 32/33 (brand_consultant trunk 7.16 pre-existing, HANDOFF §2.3) |
| `_fr2-b23-defeat` | ALL ASSERTIONS PASS |
| `_h-flash-probe` | karen 175 ms / grandma 153 / chad 175, lastWhite 0 — PASS |
| `_h2-stuck-layers` (karen, trio) | PASS; `--legacy` arm FAILS as designed |
