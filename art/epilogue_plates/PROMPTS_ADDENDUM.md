# PROMPTS.md ADDENDUM — F-1 epilogue plates
*2026-08-03, art lane. Delivered as a standalone file because `art/PROMPTS.md` may be
contended by another wave. **Fold sections 1 and 2 into `art/PROMPTS.md` when the file is
free**, then delete this note. Nothing here is a `src/` change and no git command was run.*

---

## 1 · THE SIXTH PROMPT — `epilogue_board` (authored here, was missing)

`art/PROMPTS.md`'s "Epilogue Card Art — OPEN REQUEST" enumerates **five** missing stems. There
are **six**. `epilogue_board` / **THE PREPARED REMARKS** was added afterwards by Run C's NG+
card (`EpilogueState.js:174`, gated `ng_plus_count >= 1 && board_meeting_held`) and never got a
prompt — so the rarest card in the game, the one only a second-lap player who also held the
optional Board Meeting ever sees, was rendering the empty plate-pending frame.

**Add this row to the open-request table, in the same voice and structure as the other five:**

| stem | prompt suffix | card text it must sit under |
|------|---------------|------------------------------|
| epilogue_board | `", a long mahogany board table seen close and low from one place setting, a squared stack of ring binders with plain colour index tabs and one folded sheet of notes set precisely against the table edge, a water carafe and a single filled glass beside them, an empty chair drawn in at that same side, and further down the table two pairs of resting hands with everything above the cuffs cut off by the top edge of the frame"` | THE PREPARED REMARKS (NG+ only) — fourteen months of fiduciary reports, tabbed and indexed, and a three-minute speech that made two board members look at their hands |

**Plate-specific constraint block** (the equivalent of `epilogue_voice`'s "no faces" note):

> **No faces and no full figures.** The frame's top edge must cut across the far side of the
> table at forearm height so that no head, face, shoulder or torso enters the picture — this
> must be literally true of the composition, not implied. The two pairs of hands are still and
> resting, one pair further away than the other, no gesture and no drama. Binder tabs are
> **blank** colour tabs; the folded sheet shows abstract ruled marks only. **Andrew is not in
> this picture** — the card is about the preparation, not the man, which is also why no
> character identity is needed and no character sheet is consulted.

**Why the picture is this picture.** The card's line is *"Andrew brought fourteen months of
fiduciary reports, tabbed and indexed, and a three-minute speech that made two board members
look at their hands."* Two of its three nouns are canon objects, not metaphors:

- The **hands** are verbatim from the meeting's top tier — `dialogs/index.js` node 129,
  *"Several of them are looking at their hands."* The plate renders the game's own sentence.
- The **empty chair drawn in on Andrew's side** is node 127 — the Board Member from seat
  twelve, who has not spoken since 1988, gets up and sits down next to him. Leaving the chair
  empty lets the card carry the tier-3 read without committing to it (the card also plays for
  a tier-1 run, where nobody crossed the table).
- The **carafe** is node 125's, and it is the room's own recurring prop.

The NG+ card is not a victory lap and must not be drawn as one: a second-lap Andrew is not
stronger, he is *prepared*. So the subject of the plate is the squared, tabbed, aligned stack —
work done in advance — and the register is quiet, not triumphant. Hence the hard negation
against every stock-boardroom celebration cue.

---

## 2 · COMPLIANCE ADDITIONS APPLIED TO ALL SIX PROMPTS

The five existing prompts were **not rewritten** — every prompt suffix was used verbatim, and
the EPILOGUE STYLE PREFIX was used verbatim. Three blocks were *appended* because
`~/claude-memory/imagegen-playbook.md` makes them mandatory and the F1-era prompts predate that
requirement. Recommend these become part of the epilogue template in `PROMPTS.md`:

**(a) L1 — a negation clause naming the mode each plate would collapse to.** Required by the
playbook for every prompt; none of the five had one. Per plate:

| stem | the mode it collapses to, now forbidden by name |
|---|---|
| janitor | bright institutional corridor / the "liminal backrooms" internet aesthetic; yellow wet-floor sign; cleaning trolley |
| skip | modern glass-walled startup conference room; laptops; flat-screen; whiteboard; daylight |
| intern | modern presentation / stock business slide; readable legend, axis numbers, data labels; flat-screen TV |
| grandma | **festive Christmas cookie plate / food-photography flat-lay** — no red ribbon, no holly, no icing, no sprinkles, no top-down camera, no kitchen (this is the playbook's own canonical failure, §L1) |
| voice | a person in the chair; modern minimalist office; glowing monitor as light source |
| board | modern glass boardroom; stock-photo business meeting; handshake; applause; celebration |

**(b) L7 — an absolute no-readable-text block.** The style prefix says "no text"; that is
weaker than the law. Every prompt now carries: *no lettering, words, numerals, dates, signage,
labels, legends, axis text, name plates, titled book spines or document text anywhere; any
paper, screen, chart, tab or sign carries abstract ruled tick-marks and blank ruled lines only.*
Verified clean at 512 on all twelve candidates.

**(c) L13 — the style-reference neutralizer preamble**, adapted from the portrait template to
environments: match palette / line quality / cel-shading / light behaviour / grain, but take
room, objects and framing from the description and copy no subject, layout, character or face
from the reference.

**Not applied, deliberately:** L5's padding + no-crop list. That law belongs to turnaround
sheets and cutouts. These are full-bleed square illustrations, and `splash-card-spec.md` §7.4
already ruled that a limb or object running off the edge is normal and often desirable on a
card. `epilogue_board`'s whole composition depends on a crop.

**Style references used** (nearest cousin per playbook L13, from `art/epilogues_raw/`):
`janitor → epilogue_daemon_gone` · `grandma → epilogue_delia` · `skip, intern, voice, board →
epilogue_charter`.

---

## 3 · GENERATION LOG

**Billing model: 0 credits — ChatGPT subscription path** (codex built-in `image_generation`,
no `OPENAI_API_KEY`). Cost is rate limit and wall clock, not dollars. **12 generations, 12
successes, 0 retries, 0 rejections.** codex-cli 0.146.0, `--sandbox read-only
--skip-git-repo-check`, `model_reasoning_effort=low`, one style reference attached per call,
prompt piped from a file. Native output 1254×1254 (the built-in tool's fixed ~1.5 Mpx budget —
`size` is not an available parameter); LANCZOS to 512² PNG to match the eight shipped plates.

| date | stem | candidates | status | notes |
|---|---|---|---|---|
| 2026-08-03 | epilogue_janitor | A, B | both usable | A = deep one-point corridor, mop in the near left; B = closer, mop and bucket dominant against cinder block |
| 2026-08-03 | epilogue_skip | A, B | both usable | A = wide room, shirt large in the near foreground; B = shirt centred on the door frame |
| 2026-08-03 | epilogue_intern | A, B | both usable | A = warmer, rows of chairs, tie in the near foreground; B = cooler, boardroom, tie over a chair back mid-frame |
| 2026-08-03 | epilogue_grandma | A, B | both usable | A = third-person across the teller counter; B = closer to first-person, both forearms in frame |
| 2026-08-03 | epilogue_voice | A, B | both usable | A = chair centred, seen from behind; B = side-on, chair three-quarters away |
| 2026-08-03 | **epilogue_board** | A, B | both usable | **first generation of this stem, prompt authored above.** A = with the two pairs of hands (the card's own sentence); B = the same table with nobody present |

**Measured against the eight shipped plates** (mean/std luminance at 512): shipped set spans
mean 16.9–49.3, std 16.8–58.4. All twelve new candidates land inside that envelope
(mean 23.5–44.0, std 27.3–41.7), so the sequence reads as one set numerically, not just by eye.
PNG sizes 336–444 KB vs the shipped set's 469–591 KB.

**Logged divergence, per playbook §5.8:** two of the *already-shipped* plates carry readable
numerals — `epilogue_charter` renders "1947" on the charter and `epilogue_delia` renders "2009"
on the framed newspaper. The six new plates are strictly text-free per L7 and
`splash-card-spec.md:36-39`. The new plates are therefore *cleaner* than the old ones, not
inconsistent with them in any way a player would read as a defect. No action recommended; noted
so nobody "fixes" the new ones toward the old behaviour.

---

## 4 · HOW TO SHIP A PICK

No code change is needed — `EpilogueState.js:10` globs `../assets/epilogues/*.png`. For each
stem, copy the chosen letter:

```bash
# shipped 512 plate  (this is the one the game loads)
cp art/epilogue_plates/shipped_512/<stem>_<LETTER>.png  src/assets/epilogues/<stem>.png
# archive the master alongside the other eight
cp art/epilogue_plates/raw/<stem>_<LETTER>.png          art/epilogues_raw/<stem>.png
```

**Format ruling taken:** PNG 512², matching the eight shipped plates. `splash-card-spec.md`
recommends WebP q80 for full-frame illustrations, but the F-remainder audit flagged that as a
producer call with an explicit *"do not ship a mixed set"*. Matching the existing convention is
the lower-risk half of that call; converting all fourteen to WebP remains available and is a
separate, uniform pass.

**Directory note:** `art/epilogue_plates/raw/` and `logs/` are excluded by a local
`art/epilogue_plates/.gitignore` (masters are ~2.5 MB each), mirroring the repo's existing
`art/epilogues_raw/` exclusion. `prompts/`, `shipped_512/`, `contact_sheet.png` and this file
are intended to be committed.

---
---

# PART TWO — THE REGENERATION PASS (2026-08-03, art lane)

*Producer ballot on the six new plates: **janitor B, skip A, grandma A, voice A, board A
LOCKED**; **intern A and B both REJECTED**. Two rulings came out of that ballot — THE
PROJECTOR LAW (§5) and COLOUR LATITUDE (§6) — and both are now standing conventions, not
one-off notes. This part covers the intern regeneration and a full regeneration of the eight
plates that shipped back in June, which predate the current playbook.*

Everything from this pass lives under `art/epilogue_plates/regen/`
(`prompts/`, `raw/`, `logs/`) with the 512s in `shipped_512/regen/`. `raw/` and `logs/` are
already covered by the existing `.gitignore` patterns at any depth — verified with
`git check-ignore`. No `src/` file was touched and no git command was run.

---

## 5 · THE PROJECTOR LAW — reusable constraint block

**The catch (producer, 2026-08-03):** intern A and B both failed because *the projector's aim
was physically impossible relative to the projected image* — "reads too AI." Both prior
candidates put a sleek modern digital projector somewhere in the room, drew a beam leaving it
on one axis, and drew a perfectly square frontal image on the screen on a different one. The
eye reads that instantly even when it cannot name it, and what it names instead is *generated*.

It generalises past projectors. **Any light source with a visible consequence — projector,
screen, lamp and its pool, window and its blind-bars, open doorway, CRT, sodium lamp — must be
geometrically honest.** Paste this block verbatim into every prompt in this family. It is
written to be domain-agnostic on purpose.

> ```
> LIGHT-SOURCE GEOMETRY - ABSOLUTE. This is the gate this plate is judged on, before
> style, before mood, before anything else. Every light source visible in frame must be
> physically consistent with the light it is shown producing.
>  - The source FACES what it lights. Its emitting face - lens, bulb, shade opening, screen
>    surface, window aperture, open doorway - points AT the lit surface and at nothing else.
>    A source pointed away from the thing it is lighting is the single failure that must not
>    happen here.
>  - If a beam or shaft is drawn at all, its axis runs in a straight line from the emitter to
>    the CENTRE of the lit patch, and the lit patch sits exactly where that line lands. No
>    beam that misses its own image. No lit patch without a source in frame, or clearly just
>    out of frame, on the correct axis to have thrown it.
>  - The projected or thrown shape agrees with the throw angle. A source off to one side
>    throws a keystoned, trapezoidal, off-axis shape, never a perfectly square frontal one. A
>    perfectly rectangular, perfectly frontal image means the source is dead-on and centred
>    and is therefore between the camera and the surface, or behind the camera.
>  - Every cast shadow runs directly away from its own source, along that source's axis, with
>    a softness that matches the source's size. Every shadow in frame agrees with every other
>    shadow about where the light is. Blind-bar shadows agree with the window that made them.
>  - No second unexplained light. Nothing glows for compositional convenience.
> Do not draw a light source as decoration. Draw it as a cause.
> ```

**The beam is garnish, not evidence.** The producer's second point, and the more useful one: a
correctly-lit screen with *no* dusty cone is more honest and less of a generator cliché than a
beam. So the three intern candidates are built as a proof ladder, and each one carries a
per-candidate paragraph that either forbids or fully specifies the beam:

| | how the geometry is proved | beam? |
|---|---|---|
| **A** | camera stands **on the throw axis**, directly behind the cart, so we see the projector's back panel and its lens points away from us at the screen. On-axis means the chart reads square-on, correctly. | **none** — explicit prohibition on cone, haze, dust, god-rays |
| **B** | camera perpendicular to the throw, so the whole geometry lays out left-to-right like a diagram: cart at left with the lens barrel pointed right, screen at right, and the projected chart visibly **keystoned into a trapezoid** because the throw is low and off-centre. The keystone *is* the evidence. | **none** — same prohibition |
| **C** | the one beam candidate, with a hard rule: **the cone's silhouette and the lit rectangle are the same shape**, four edges landing on four edges. Plus a consequence the generator has to solve for — two chair backs interrupt the bottom of the cone and cut two dark notches into the bottom of the projected image. | yes, fully specified |

All three landed first try, and C's shadow-notches came back correct — worth knowing that
naming a *physical consequence* of the beam is a stronger constraint than describing the beam.

Paired with the light-geometry block, the intern prompt also gained an L1 negation the prior
pass did not have: **`ABSOLUTELY NOT A SLEEK MODERN DIGITAL PROJECTOR`** (no white plastic
wedge, no matte-black cinema unit, no ceiling mount, no pico) with the replacement described
positively per L3 — *heavy boxy beige-grey 1990s machine, one large round glass lens barrel
proud of the front face, vented cooling grille, chunky rocker switch, thick coiled cable, on a
wheeled steel AV cart*. All three candidates read as period hardware.

---

## 6 · COLOUR LATITUDE — the second standing ruling

**Producer, 2026-08-03:** *"not opposed to some colour, especially for any shots that land
outside the office."*

Applied as a **palette-only** derivative of the house prefix, never a rendering change. Plates
inside the bank keep the amber-dusk prefix verbatim; plates set outside it swap in this block:

> ```
> STYLE (house register with COLOUR LATITUDE applied - this card is set OUTSIDE the bank):
> Painterly cel-shaded illustration in exactly the rendering language of the attached style
> reference: the same brush economy, the same hard-edged cel shadow shapes, the same soft
> grain, the same cinematic quiet, the same square composition, no text, no watermark, no
> logos, no captions.
> The PALETTE, and only the palette, opens up. This plate is allowed fuller, more saturated
> local colour than the bank interiors because it is not in the bank. Keep the set's value
> discipline exactly: a deep shadow floor, one narrow band of true highlight, and most of the
> picture living in the middle values; keep the warm-versus-cool opposition doing the work.
> The colour is RICHER, not brighter, not flatter, and never poster-flat or candy. Nothing
> here should read as a different illustrator.
> ```

| plate | inside/outside | latitude used? |
|---|---|---|
| charter, daemon_kept, daemon_gone, team, intern | bank interior | **no** — house amber-dusk prefix verbatim |
| delia (a diner on Fennimore) | outside | **yes** — red vinyl, buttercream tile, chrome, green street trees |
| reyes (Fennimore Avenue) | outside | **yes** — green-gold foliage, warm brick, blue sky, saturated car paint |
| marlene (a kerbside stop at 5:15) | outside | **yes** — sodium orange against teal dusk, saturated bus blue |
| building (the tower from the street) | outside | **yes** — deep blue-teal sky, warm orange horizon band, sodium amber |

**The guard that turned out to be necessary.** "Richer, not brighter" is not self-enforcing.
The first delia pair read the latitude as *flat midday daylight* and came back at mean
luminance 71/75 at 512, against a shipped-eight envelope of 17–49 and a locked-six envelope of
27–44 — a hard cut in the sequence, between grandma (44) and daemon_kept (24). Fixed by adding
an explicit **VALUE DISCIPLINE** paragraph and moving the light to a low late-afternoon sun
raking almost level through the storefront; delia C/D land at 55/50. Keep that paragraph on
any future exterior:

> ```
> VALUE DISCIPLINE, this candidate's whole reason to exist: this plate must sit at the SAME
> overall key as the rest of the set - a deep shadow floor, most of the picture living in the
> middle values, and only a narrow band of true highlight where the sun actually lands. The
> sun is LOW and comes in almost horizontally, so it rakes across surfaces in hard-edged
> shapes and leaves large areas in warm shade. Do NOT light this scene flatly, do NOT fill
> the shadows, do NOT render an evenly bright daytime interior. Colour is still rich, but it
> is rich IN SHADOW, lit by one low warm source, the way the rest of the set is lit.
> ```

---

## 7 · THE OLDER EIGHT — what each regen had to say, and the A/B axis

The eight June plates predate the current playbook: no L1 negation clause, no L13 preamble, no
absolute L7 block (two of them render legible years — see §9). Each was regenerated as a pair
against the **new six** as style reference, so the whole fourteen converge on the locked set's
painterly-cel amber dusk rather than on June's brighter, more comic-illustrated register.

The A/B axis is deliberate and consistent: **A stays closest to what the card has always
shown; B is the "portrait by absence" reading** that the locked six pushed the set toward (four
of the five locked picks contain no person, and the fifth shows only hands).

| stem | the card's sentence | A | B | style ref |
|---|---|---|---|---|
| **charter** | "Article 9, witnessed and sealed… Machines respect paperwork; it's people who needed convincing." | the sealed page: charter open on the desk, brass embossing press, fountain pen, a blind-embossed rosette raked by low light so the impression reads as *depth* | the framed charter on the panelled wall with an empty oxblood chair turned squarely to face it — the chair is the person who needed convincing | board A / voice A |
| **delia** | "The framed 2009 newspaper hangs where the interest-rate board used to be. Jules comps her patty melt… She lets them." | Delia in booth four under the frame, patty melt and mug, unfaded ghost rectangle and old screw holes where the rate board was bolted | the wall and the booth: frame + ghost rectangle up top, half-eaten patty melt, folded reading glasses on their beaded chain, one hand at the bottom edge, no face | grandma A (+ `portraits_raw/delia.png` as identity ref on A/C) |
| **daemon_kept** | "Process 7 reconciles its timestamps… Last Tuesday it logged: CAME DOWNSTAIRS JUST TO SAY GOODNIGHT." | the lit terminal, green glow falling only on surfaces that face it, taped index card, amber stair-light as the second honest source | *the goodnight*: one-point down the aisle, a green wedge from the terminal and an amber wedge from an open doorway crossing on the floor. Nobody in the doorway — the doorway is the person | janitor B |
| **daemon_gone** | "Rack 7 hums at the same pitch as the others now. Nobody has taken the label down." | the dark terminal as a black mirror holding one correctly-placed reflection of a grate shaft; the taped card is the brightest small thing | *the label*: extreme close on the rack rail, curled yellowed label, raking work-light, and a row of identical indicator lights — the rack is ordinary now and only the label says otherwise | janitor B |
| **reyes** | "Three appeals upheld stands as the city record… Fennimore Avenue parks perfectly now, out of respect." | Reyes mid-block, backwards cap, clipboard, laminated card in hand, surveying a row of cars parked with absurd equidistance | *the street that learned*: kerb-height down the row, no person, a squared stack of fresh laminated cards on the near meter and one card under a wiper further down | skip A |
| **marlene** | "On time. Every day. Exactly… she doesn't check her mirrors anymore." | Marlene at the wheel through the open window, hands on the wheel, looking ahead — and the big side mirror in the near foreground shows the empty street and **not her face** | *the mirror*: the mirror owns the frame, reflecting the long empty street behind, nobody in it at all | skip A |
| **team** | "The ones who stayed still take the 4:55 coffee together. Nobody calls it a meeting." | the five in a loose irregular ring, mid-sentence, nobody looking at camera, blind bars across two of them | *nobody calls it a meeting*: five mismatched mugs put down where they were put down, five chairs pushed out at five careless angles, a mauve cardigan over one chair back, no people | skip A (+ shipped `epilogue_team.png` as cast-identity ref on A) |
| **building** | "One floor of windows stays lit near the top. The building is not asleep. It is keeping watch." | the tower from across the street, exactly one band of lit windows near the crown and every other window dark, sodium street below, orange horizon band | *the look up*: worm's-eye from the plaza, piers converging, the lit band foreshortened into a shallow trapezoid that follows the same convergence | skip A |

**L1 negation clauses added (one per stem, naming the mode it would otherwise collapse to):**

| stem | forbidden by name |
|---|---|
| charter | certificate template / stock legal photo — scrollwork border, calligraphic banner, gold foil starburst, red ribbon rosette, gavel, scales, diploma, signing-a-contract hero shot |
| delia | glossy modern café / food-photography — marble counter, Edison bulbs, chalkboard menu, latte art, top-down flat-lay, macro of the food, barista, laptop |
| daemon_kept & _gone | modern data centre / cyberpunk server shot — blue LED strips, glowing floor, neon, fibre-optic spray, holograms, infinite blade racks, Matrix rain |
| reyes | American police officer / civic hero shot — badge, firearm, patrol car, light bar, aviators, salute, crossed-arms recruitment pose; also *not* a rain-slick noir street |
| marlene | modern transit brand shot / nostalgia postcard — livery graphics, ad wrap, readable destination roll, motion-blur streaks, vintage 1950s bus, school bus, double-decker |
| team | corporate stock team photo — facing camera, thumbs up, high-five, champagne, confetti, clapping, posed lineup, startup kitchen, glass wall |
| building | glass corporate HQ render / skyline stock photo — curtain wall, crane, archviz gloss, fisheye, HDR halo, traffic light-trails, helicopter view, logo or illuminated crown sign |
| intern | modern presentation / stock business slide **and** sleek modern digital projector (§5) |

---

## 8 · GENERATION LOG — regen pass

**Billing model: 0 credits — ChatGPT subscription path** (codex built-in `image_generation`,
no `OPENAI_API_KEY` is set or needed). Cost is rate limit and wall clock, not dollars.

**22 codex calls → 21 images. 1 retry, 0 rejections, 0 prompt rewrites.** codex-cli 0.146.0,
`gpt-5.6-sol`, native output 1254×1254 (the built-in tool's fixed ~1.5 Mpx budget; `size` is
not an available parameter), LANCZOS → 512² PNG. Wall clock ≈ 20 min for the 19-image batch at
4–6 concurrent.

Invocation, repeatable verbatim (both playbook guards present; prompt piped from a file):

```bash
codex exec --sandbox read-only --skip-git-repo-check \
  -c model_reasoning_effort='"low"' \
  -i art/epilogue_plates/raw/epilogue_skip_A.png \
  - < art/epilogue_plates/regen/prompts/epilogue_intern_B.txt
```

**Output association, for anyone parallelising this.** `codex exec` does *not* echo the image
path, and `~/.codex/generated_images/` is keyed by session UUID — so "newest file wins" races
badly at 6 concurrent. The reliable hook is the `session id:` line codex prints in its own
header: parse it, then read `~/.codex/generated_images/<sid>/*.png`. Race-free, and it makes
the retry-on-non-path guard trivial (empty or missing dir ⇒ retry).

| date | stem | candidates | status | notes |
|---|---|---|---|---|
| 2026-08-03 | epilogue_intern | A, B, C | all three usable | regeneration of a REJECTED stem. A on-axis/no-beam, B keystone/no-beam, C beam with cone==image. All first try |
| 2026-08-03 | epilogue_charter | A, B | both usable | first pass to carry no numerals at all — the old plate rendered "1947" (§9) |
| 2026-08-03 | epilogue_delia | A, B | **superseded, kept** | correct in every respect except key: mean 71/75 at 512, outside the set envelope. Preserved as the instructive rejection (playbook §5.6) — they are what "colour latitude" looks like when it is read as *brighter* |
| 2026-08-03 | epilogue_delia | C, D | both usable | same two compositions with the VALUE DISCIPLINE block + low raking sun. 55.2 / 50.2. **C needed one retry** — the "no path returned" transient; cleared first retry, exactly as the playbook predicts |
| 2026-08-03 | epilogue_daemon_kept | A, B | both usable | B is the two-honest-sources aisle (green wedge × amber doorway) |
| 2026-08-03 | epilogue_daemon_gone | A, B | both usable | B is a pure object plate — no screen, no green, anywhere |
| 2026-08-03 | epilogue_reyes | A, B | both usable | A brings her to canon (§10) |
| 2026-08-03 | epilogue_marlene | A, B | both usable | the empty mirror is the card's own sentence in both |
| 2026-08-03 | epilogue_team | A, B | both usable | all five identifiable at a glance in A |
| 2026-08-03 | epilogue_building | A, B | both usable | exactly one lit band in both, everything else dark |

**Measured — luminance mean/std at 512.** Shipped eight span 16.8–49.3 mean; the locked six
26.8–44.0. All 19 shipping regen candidates land 23.4–58.0 (delia A/B excepted at 71/75, kept
as reference). Nothing in the set now sits more than ~9 points outside the locked six's range
except charter A (49.9), reyes A (58.0) and delia C (55.2) — all three deliberately the
brightest beats in a dark sequence, and all three below the old `epilogue_charter`'s 49.3/58.4.

**L7 verified by zoom audit, not by glance.** Every candidate's text-bearing surface was
cropped and inspected at ~3× — CRT screens, the taped index card, the rack label, the framed
newspaper, corkboard notices, meter faces, license plates, the bus destination display, the
framed charter, the building crown. **Zero legible glyphs across all 21.** The delia newspaper
carries abstract column rules, a grey photo mass, and the canon half-finished crossword grid
with loose pen strokes — strokes, not letters.

---

## 9 · BAKED TEXT REMOVED — what the card-text layer must now absorb

Two of the eight shipped plates render legible numerals. The regens do not. Per playbook §5.8
this is logged, not silently fixed:

| plate | baked text | load-bearing? | ruling |
|---|---|---|---|
| `epilogue_delia` | **"2009"** in display type on the framed newspaper | **yes, but already covered** — the card's own first line is *"The framed 2009 newspaper hangs where the interest-rate board used to be."* | nothing to do. The engine text already says the year; the plate was saying it twice |
| `epilogue_charter` | **"1947"** centred under the document, plus a gold seal that reads as the US Great Seal (a real emblem) | **yes, and NOT covered** — THE CHARTER's card line never names the year, so removing it from the plate loses it | **flagged for the card-text layer.** 1947 is the game's most-repeated date (charter, Archive terminal, vault code "47", D. Henderson founding trustee). If it should survive, it belongs in `EpilogueState.js` prose, not in pixels. Suggested minimal edit, producer's call: *"Article 9 of the 1947 charter, witnessed and sealed…"* |

Also noted, no action: `epilogue_daemon_kept`'s CRT renders dense pseudo-glyphs. They do not
resolve into words at any zoom, so the old plate is not an L7 violation — but the regen
replaces them with explicitly abstract phosphor rows and a block cursor, which is cleaner and
matches the rest of the set. Nobody should "fix" the new one back toward the old behaviour.

---

## 10 · DIVERGENCES THE PICKER SHOULD KNOW ABOUT

Three places where a regen intentionally differs from what currently ships. Each is a real
choice, not a drift, and each is cheap to reverse with one generation.

1. **Officer Reyes now matches canon.** `characters.js:609` gives her a **backwards ball cap**,
   a clipboard, deep skin tone, broad build. The June plate drew her with a bun, no cap, and a
   lighter tone. Both regen candidates follow `characters.js`; A is the one where it is
   visible. If the shipped look is preferred, say so — but the two will not agree.
2. **Delia is quieter, and her cardigan is plum.** The June plate has her mid-belly-laugh in a
   navy cardigan; `characters.js:595` gives plum `0x7a5a6a`. The regens use plum and play the
   card's actual sentence (*"She lets them. Dignity knows when to make an exception."*) as
   unhurried, privately amused rather than laughing. The trade is real: the old laugh is the
   single warmest beat in a mostly melancholy sequence. A big-laugh variant is one generation
   away.
3. **Nobody is in `epilogue_charter` any more.** The June plate has an anonymous grey-haired
   executive seen from behind. He is not in the card's text, he is not identifiably anyone in
   the cast, and the locked six pushed the set toward object-and-absence. Charter B replaces
   him with an empty chair turned to face the document, which is what *"it's people who needed
   convincing"* actually says. If a figure is wanted, that is the plate to say so on.

---

## 11 · HOW TO SHIP A REGEN PICK

Same as §4 — `EpilogueState.js:10` globs the directory, so no code change:

```bash
# shipped 512 plate (the one the game loads)
cp art/epilogue_plates/shipped_512/regen/<stem>_<LETTER>.png  src/assets/epilogues/<stem>.png
# archive the master
cp art/epilogue_plates/regen/raw/<stem>_<LETTER>.png          art/epilogues_raw/<stem>.png
```

**Contact sheets for the ballot**, all under `art/epilogue_plates/regen/`:

| sheet | what it is for |
|---|---|
| `contact_intern.png` | the 3 new intern candidates over the 2 rejected ones — the projector-law before/after |
| `contact_eight.png` | the regen candidates for the older eight, A/B adjacent, plus delia C/D |
| `contact_eight_vs_shipped.png` | old shipped / regen A / regen B, stem by stem — the convergence check |
| `contact_sequence_fourteen.png` | all fourteen cards in actual epilogue play order, locked picks marked — **judge the set here, per L12** |
