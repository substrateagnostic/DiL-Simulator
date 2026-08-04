# Portrait Art Prompts — TRUST ISSUES

Generated via Codex $imagegen2. Keep the STYLE PREFIX identical for every portrait so the cast
reads as one set. Output: 512×512 PNG → `src/assets/portraits/<stem>.png`. Mood variants are
`<stem>_<mood>.png` (moods used by dialog nodes: `angry`, `smug`, `worried`, `defeated`).

## STYLE PREFIX (use verbatim at the start of every prompt)

> Retro corporate-satire RPG dialog portrait, bust framing (head and shoulders), flat cel-shaded
> illustration, thick clean dark outlines, muted office palette over deep navy background
> (#1a1a2e), single warm key light from upper left, subtle film grain, no text, no watermark,
> square composition, character facing slightly left toward the reader

## Cast prompts (append to style prefix)

| stem | prompt suffix |
|------|---------------|
| andrew | ", a tired but earnest young trust officer in his late 20s, slightly rumpled navy suit and crooked blue tie, brown hair, holding a coffee mug, expression of determined exhaustion" |
| karen | ", a 50s suburban woman with a sharp asymmetric blonde bob with frosted tips, pink blazer, pearl studs, gold purse strap on shoulder, lips pursed mid-demand to see a manager, eyebrows raised in entitled disbelief" |
| chad | ", a beefy man in his 30s wearing a backwards baseball cap and a too-tight red polo, holding a protein shake, confident smirk, gym-bro energy, gold chain" |
| grandma | ", a tiny elderly woman in a lavender shawl and thick glasses, white hair in a bun, deceptively sweet smile with calculating eyes, holding knitting needles like weapons" |
| skip | ", a middle-aged middle manager in a green golf polo with a bluetooth earpiece permanently in ear, holding a red 'WORLD'S OKAYEST BOSS' mug, forced optimistic grin hiding panic" |
| diane | ", a sharp Black woman in her 40s at a reception desk, immaculate blazer, headset mic, expression that says she has seen everything and is impressed by none of it" |
| janet | ", a weary woman in her 50s in a mauve cardigan over a white blouse, hair in a loose bun, holding a wine tumbler of 'water', deadpan thousand-yard HR-survivor stare" |
| alex_it | ", a man in his late 30s with short ash-blond hair with subtle grey flecks and a fuller trimmed taupe grey-brown beard, warm knowing grin, loud orange hawaiian shirt open over a plaid flannel, lit by the glow of unseen monitors, expression of serene holistic certainty — a detective of interconnected systems who already knows how the ticket resolves" *(rev 2, 2026-06-10: aged up, Dirk Gently energy, modeled on the co-creator — never pass the reference photo to codex)* |
| intern | ", a terrified college intern swimming in an oversized gray-blue suit, crooked name tag, deer-in-headlights expression, clutching a stack of folders" |
| janitor | ", a mysterious elderly Black man in a gray-blue jumpsuit, white stubble, gold Rolex glinting on his wrist, mop handle over shoulder, knowing half-smile of a man who owns more than he appears to" |
| meredith | ", a severe executive woman with a silver angular bob, navy power suit, pearl earrings, tablet clutched like a weapon, cold restructuring smile that does not reach her eyes" *(NAMING LEDGER, rewritten 2026-08-04: internal id `meredith` = the villain SVP, display name **Meredith Sterling**. Was `rachel`/`rachel_boss` until the rename. Not the same person as `rachel` below.)* |
| rachel | ", a quietly warm young woman in her mid-twenties, a junior trust officer from the cubicle farm, long golden-blonde hair (#d4b87a) worn loose past her shoulders and drawn as a few large flat outlined masses rather than many fine strands, fair skin (#f0d6b0), soft rounded features, warm hazel-green eyes (#6a8a5a), small pearl stud earrings, a soft blue blouse (#7a9ab5) with an open collar and no jacket, a small unperformed half-smile that never becomes a grin, relaxed shoulders, open and unguarded, the only person in the building who is not performing — kind without announcing it, no severity and no corporate armor anywhere in the face. RENDERING, non-negotiable: hard flat cel shading with only two or three flat tone steps per surface and a crisp shadow edge, thick uniform dark ink outlines around the head, hair masses, collar and shoulders, bold graphic comic-book inking, deliberately limited palette, matching the attached portraits' exact line weight and shading language. NO soft airbrushed gradients, NO delicate thin linework, NO painterly rendering, NO photorealism, NO fine strand-by-strand hair." *(2026-07-31; ledger rewritten 2026-08-04. NAMING LEDGER: internal id `rachel` = the friendly cubicle-farm trust officer, display name **Rachel** — she inherited the clean `rachel` id from the villain (who was `rachel`, now `meredith`) in the 2026-08-04 sweep; she was `rachel_to` before that. NOT the villain `meredith` above. Palette per her `characters.js` entry; voice anchor Kent Haruf per `art/drafts/rachel_dialog_draft.md`. Modeled in part on a real colleague — never pass the reference photo to codex; `art/char_refs/human/real_people_notes.md` is the textual-only pipeline. The RENDERING block was added after a first pass came back soft-painterly and off-model for the cast; keep it on any future portrait.)* |
| isaiah | ", a calm Hispanic man in his early 40s with warm medium-tan skin, short dark hair neatly cut, thin wire-frame glasses, trim dark stubble, steady deep-brown eyes, the faintest knowing half-smile, quiet unshakeable dignity, business casual: a slate-blue button-down shirt open at the collar, relaxed shoulders, composed and unhurried — the only emotionally regulated person in the building, a stoic who journals" *(rev 2, 2026-07-29: recast Hispanic at producer request; modeled on a real colleague — never pass the reference photo to codex. Old Black-man rev 1 archived in `art/portraits_archive/isaiah/`.)* |
| compliance | ", a pale auditor in a black suit and red tie wearing indoor sunglasses, clipboard held to chest, completely unreadable expression" |
| regional | ", a silver-haired regional manager in a power suit with gold tie, golf tan, predatory salesman grin, holding a putter like a scepter" |
| algorithm | ", a monolithic black server slab with a single glowing red optical sensor, cascading teal code reflections, faint cyan edge lighting, ominous and serene, no face, no humanity" |

## Generation log

| date | stem | status | notes |
|------|------|--------|-------|
| 2026-06-10 | — | pipeline wired, awaiting first batch | DialogBox auto-detects PNGs in src/assets/portraits/ |
| 2026-07-29 | isaiah | rev 2 shipped (neutral only — no mood variants exist for isaiah) | Generated via `codex exec` + `$imagegen2`, style-refed against janet/alex_it/andrew 1024 raws. 1024 raw → `art/portraits_raw/isaiah.png`, LANCZOS → 256 in `src/assets/portraits/isaiah.png`. |
| 2026-07-31 | alex_it | rev 3 shipped — all four moods (neutral / angry / smug / worried) | **Likeness revision: ginger beard removed.** Now ash-blond hair with subtle grey flecks + a fuller trimmed taupe grey-brown beard, strong straight brow, steady eyes, defined jaw under the beard. Old rev-2 ginger set archived to `art/portraits_archive/alex_it/{raw,shipped_256}/`. Style-refed against each mood's OWN old raw for framing/composition, with an explicit colour-override instruction in the preamble ("same framing and rendering as the reference, but hair and beard colours per this description, not the reference's") plus a hard HAIR AND BEARD COLOUR block forbidding ginger/red/orange/copper — the reference image will otherwise re-impose the colour it is supposed to be correcting. 1254 raws → `art/portraits_raw/alex_it*.png`, LANCZOS → 256² RGBA shipped. Never pass the co-creator's reference photo. |
| 2026-07-31 | rachel | rev 2 shipped (neutral only) | Generated via `codex exec` + `$imagegen2`, style-refed against karen/janet/andrew 1024 raws. Rev 1 came back soft-painterly with thin linework — correct likeness, wrong house style — so the prompt gained the explicit RENDERING block and was re-run once; rev 1 kept at `art/portraits_raw/rachel_alt_painterly.png` if the producer prefers it. 1254 raw → `art/portraits_raw/rachel.png`, LANCZOS → 256² RGBA in `src/assets/portraits/rachel.png`. Framing sits marginally wider (chest-up) than andrew/janet — flag if it reads out of set in DialogBox. |

---

# Epilogue Card Art — OPEN REQUEST (added 2026-07-30, run F1)

`src/states/EpilogueState.js` renders one illustrated 512×512 card per epilogue beat.
Eight plates exist in `src/assets/epilogues/`; **five cards added in run F ship with no
plate** and currently render inside an empty frame (`EpilogueState._renderCard` draws a
plate-pending panel so the sequence keeps its rhythm). This is the last unfinished piece of
proposal 2 and it should land before the producer's emotional-finale playtest.

Missing stems (drop the PNG in `src/assets/epilogues/<stem>.png`; the `import.meta.glob`
loader picks it up with no code change — keep a 1024 raw in `art/epilogues_raw/`):

`epilogue_janitor` · `epilogue_skip` · `epilogue_intern` · `epilogue_grandma` · `epilogue_voice`

## EPILOGUE STYLE PREFIX (use verbatim; matched to the eight shipped plates)

> Painterly cel-shaded illustration of a 1990s American bank office interior at dusk, warm
> amber light through venetian blinds cutting hard diagonal bars across the scene, muted
> desaturated palette of brown, olive and deep shadow, soft grain, cinematic quiet, square
> composition, no text, no watermark, no logos, no captions

| stem | prompt suffix | card text it must sit under |
|------|---------------|------------------------------|
| epilogue_janitor | ", an empty sixth-floor corridor seen from floor level, a mop standing upright in its bucket against the wall handle-up, waxed linoleum holding the reflection of the blinds, nobody in frame" | the mop in the closet, handle up; nobody has learned his name |
| epilogue_skip | ", an empty board room with fourteen executive chairs around a long mahogany table, one chair at the far end pulled out and turned slightly toward the room, a pressed dress shirt on a hanger hooked over the door frame" | Skip ironed his shirt again the following Tuesday / the folded speech / STORAGE B |
| epilogue_intern | ", a dim conference room with a projector still running, a slide of a bar chart thrown across an empty screen and across the empty chairs, one abandoned cheap tie draped over a chair back, a fern in the corner" | the 47-slide deck, cited in two compliance reviews; apologized to the projector |
| epilogue_grandma | ", a small elderly woman's hands in close framing setting a tin of snickerdoodles on a bank counter, a knitting bag beside it, a numbered ticket dispenser out of focus behind" | banks on the second floor every Wednesday at ten; counts the exits |
| epilogue_voice | ", a single empty office chair at a desk photographed from behind, a suit jacket over its back, the window beyond showing city dusk, one desk lamp lit, the room otherwise dark — a portrait of a person by their absence" | WHO YOU BECAME — the voice-profile card; must read for both the kind and the hardened variant |

**Constraints:** no faces in `epilogue_voice` (it must fit four different closing lines);
no readable text anywhere in any plate; keep to the eight existing plates' palette so the
sequence reads as one set. Photo-privacy rule applies as always — describe textually, never
pass a reference photo.

---

# Character Model Reference Sheets — LOCKED TEMPLATE (added 2026-07-31, run G1)

Topology/proportion references for the 3D character rebuild. **Not shipped game art** —
they live in `art/char_refs/generated/` (gitignored) and exist to guide `CharacterBuilder.js`.
Producer ballot 2026-07-31 confirmed: **three views, height pinned at 7 heads, and the
semi-realistic rendering drift is KEPT** for these sheets (the flat-cel law in the style prefix
above binds *shipped portraits only*).

Pipeline is the same as the portraits — `codex exec` + `$imagegen2`, one character per call,
style-refed against that character's own 1024 raw in `art/portraits_raw/`:

```
codex exec -C <repo> -s danger-full-access --dangerously-bypass-approvals-and-sandbox \
  -i <repo>/art/portraits_raw/<id>.png - < <prompt>.txt
```

## Template blocks (concatenate in this order)

1. **VIEWS** — "THREE views of the SAME character standing in a row at identical scale with
   heads and feet aligned: a straight FRONT view; a TRUE THREE-QUARTER view rotated 45 degrees
   so one shoulder is clearly nearer the camera and the far shoulder is partly hidden; a PURE
   SIDE PROFILE rotated a full 90 degrees so only one eye, one arm and one leg are visible in
   silhouette. Standing neutral relaxed A-pose, complete crown to shoes, nothing cropped."
   *The profile view is the highest-value one — it is the only angle that adjudicates the
   hair-containment law and the neck taper.*
2. **CHARACTER** — silhouette, palette hexes and signature props per `CHARACTER_BIBLE.md` LAW 7
   and the character's `characters.js` entry.
3. **HAND CALLOUT ROW** — "along the bottom, clearly separated by empty space, four larger hand
   studies: one open relaxed hand front, the same side, one closed gripping hand front wrapped
   around <that character's prop>, the same side."
4. **STYLE** — "matching the attached portrait's palette and rendering — clean shapes, limited
   muted office palette, cel shading with clear form, one soft warm key light from upper left,
   semi-realistic reference-sheet rendering that reads the volumes clearly."
5. **PROPORTION LAW** — "EXACTLY 7 head-heights, do not elongate the legs in a
   fashion-illustration way, the crotch line sits at half the total standing height, small head,
   natural <2.0 male / 1.6 female / 2.4 Chad> head-widths shoulder width, visible neck column no
   more than half a head wide, hair contained above the jawline and never wrapping forward past
   the ear line — verify this in the side profile view — face on human thirds with the eye line
   at half the skull height, relaxed pleasant open eyes, fingertips reach mid-thigh, arm span
   equal to standing height, single-silhouette limbs with no lumpy ball joints, no caricature,
   no chibi." **Grandma is the one exception at 6 heads** (bible ruling: she may stay petite).
6. **HYGIENE** — "plain flat light neutral-gray background, even flat lighting, no text, no
   lettering, no labels, no watermark, no captions, no logos, no measurement lines."

## `_hands_reference.png`

One standalone universal hand sheet covering the characters generated before the hand-callout
row was added (andrew, karen). It documents the **game's actual hand vocabulary** as built in
`CharacterBuilder.js:499–508` — a soft mitten-like palm mass with the four fingers merged plus
ONE separated thumb sphere — in three rows: open/relaxed, gripping-empty, and gripping the
game's real props (coffee mug, smartphone, briefcase handle), each front + side.

**Known divergence, logged:** the per-character hand callout rows came back with *realistic
articulated* hands on every sheet despite asking for the mitten form — the surrounding
semi-realistic figure overrides it. That is arguably the more useful reference (it shows the
anatomy the mitten is abstracting), so it was left alone; `_hands_reference.png` is the
authority on the simplified vocabulary the 3D build actually uses.

## Style-reference substitution rule (added 2026-07-31, run G1-b)

Most enemies have **no portrait of their own** in `art/portraits_raw/`. Attaching *some*
reference is still much better than attaching none — the reference is what holds the batch to
one rendering language. So: attach the **nearest cousin portrait** (same suit register, same
era, same rendering) and neutralise the identity carry-over in the preamble:

> "The attached image is a STYLE AND RENDERING reference only — match its palette, line
> quality, cel-shading language and overall illustration feel, but the character's identity,
> face, hair, build, clothing and colours come from THIS description and NOT from the
> reference image."

That preamble is the generalised form of the alex_it colour-override lesson above, and it held
across all 18 enemy sheets — none of them came back wearing the reference's clothes.
Cousins used: `compliance.png` for black-suit males, `regional.png` for exec/silver males,
`janitor.png` for deep-skin males, `janet.png`/`diane.png`/`meredith.png` for women,
`skip.png` for soft/earpiece males, `andrew.png` for the modular sheets.

**Anti-likeness escalation.** When a sheet comes back resembling a specific real person, the
identity preamble is NOT enough — the reference itself is the likeness vector. The fix that
worked (janitor v3) has two parts: (1) **swap the reference** for a sheet of a *different*
character so no likeness can transfer at all, and (2) steer the features **positively away**
from the archetype rather than only forbidding it — "full rounded face not long lean, wide
flat cheeks with no sharp cheekbones, broad low nose, square heavy jaw, short thick neck,
even unfreckled skin." Negative-only instructions ("must not resemble any actor") were tried
first in v2 and did not move the face.

## Modular client sheets

Three sheets serve `ClientGenerator`'s procedural variety instead of one character each. They
break the three-view rule on purpose — they are **rows of alternatives**, not turnarounds:

- `_client_modular_bodies` — four male body archetypes (slight-young / average-trim /
  broad-heavy / petite-elderly at 6 heads) in an identical plain grey base layer on one ground
  line so only build differs, plus a six-study hair row on identical bald bust forms.
- `_client_modular_bodies_f` — the same for women, at the 1.6-head-width shoulder line, with a
  women's hair row (low bun / loose bun / structured blonde wedge / short crop / long loose
  blonde / silver elder bun with periwinkle shawl). Generated because the first bodies sheet
  came back all-male and `generateVisualConfig()` branches ~50/50 on `MALE_NAME_SET`.
- `_client_modular_outfits` — three full outfits on one identical body (business formal /
  business casual / eccentric-wealthy) plus a six-object accessory row matching the
  `accessories` strings in `generateVisualConfig()` (coffee mug, protein shake, purse, cane,
  clipboard, sunglasses).

## Sheet log

| date | sheet | notes |
|------|-------|-------|
| 2026-07-31 | karen_body (v1) | 2-view calibration pass, superseded by v2; kept for comparison |
| 2026-07-31 | andrew_body | 2-view calibration pass; predates the three-view + hand-row template |
| 2026-07-31 | karen_body_v2 | first sheet on the locked three-view template |
| 2026-07-31 | chad, grandma, skip, meredith, janet, intern, janitor, diane, alex_it, rachel | full friendly-cast batch on the locked template; `intern` needed one retry (transient generator failure, not a refusal) |
| 2026-07-31 | _hands_reference | universal mitten+thumb hand vocabulary sheet |
| 2026-07-31 | **ross_body rev 2** (pre-rename plate name; the character is `skip`, and the plate file under the gitignored `art/char_refs/generated/` keeps its old name) | accuracy re-run. v1 came back trim and confident — wrong man. Fixed with a hard body block: "ROUNDED THROUGH THE MIDDLE with a visible soft belly … shoulders faintly slumped forward and rolled inward … weak receding chin … NOT trim, NOT athletic, NOT confident … the belly must be clearly readable in the SIDE PROFILE view." One pass; kit intact (earpiece, red mug, khakis, brown belt, loafers). Old sheet kept at `ross_body_v1.png`. **Lesson: for a soft build, name the view that has to prove it** — "visible belly" alone gets absorbed by the figure, "readable in the side profile" does not. |
| 2026-07-31 | **janitor_body rev 3** | de-actoring re-run, two passes. v2 (kept at `janitor_body_v2.png`) added "wholly original face, must not resemble any actor" while still style-refed against `janitor.png` — the resemblance survived, because the reference *was* the likeness. v3 swapped the reference to `diane_body.png` (different character entirely) and steered features positively away from the archetype; resemblance broken. Gold Rolex now visible in all three views AND in all four hand studies. Old sheets at `janitor_body_v1.png` / `_v2.png`. |
| 2026-07-31 | compliance, regional, corporate_lawyer, chief_of_restructuring, cfos_assistant, restructuring_analyst, brand_consultant, data_analytics_lead, security_guard, hr_rep, regional_director, meredith_boss, skip_boss, parking_enforcer, networking_guy, firm_partner, firm_associate, firm_paralegal | full enemy roster on the locked template, 18 sheets. `algorithm` skipped (canon monolith, not a person). `parking_enforcer` and `networking_guy` each needed one retry — same transient generator failure the `intern` sheet hit ("The single image is still rendering; I'm waiting for that same generation call to finish", no path returned). Retry-on-non-path guard handled both on the first re-run. |
| 2026-07-31 | _client_modular_bodies, _client_modular_bodies_f, _client_modular_outfits | modular construction sheets for `ClientGenerator` variety (see section above) |

### Open notes from the G1-b batch

- **`parking_enforcer` gender mismatch.** `src/data/characters.js` has `gender: 'm'`, but
  `dialogs/index.js` `parking_enforcer_intro` says *"she says, already writing"* and
  *"Reyes smiles for the first time…"*. Prose is canon, so the sheet is drawn female. The
  `characters.js` field should be corrected to `'f'` before the model is built.
- **Recurring proportion drift.** Sheets with narrow/tall briefs (`cfos_assistant`,
  `brand_consultant`, `corporate_lawyer`, `hr_rep`, `meredith_boss`, `_client_modular_outfits`)
  land nearer **8 heads** than the stated 7, with fashion-illustration leg length. "EXACTLY 7
  head-heights" is losing to the word *tall* / *narrow* / *slim* elsewhere in the prompt.
  Treat the 7-head law as authored by `CHARACTER_BIBLE.md` LAW 1, not by these sheets, when
  the two disagree.
- **The Firm's relative heights are NOT readable off the sheets** — each was drawn
  independently. Use the `characters.js` scalars (partner 1.08 / associate 1.02 /
  paralegal 0.96) for the trio's staging.
- **Neutral-face law was applied to villains too** (bible LAW 3/4): menace lives in
  silhouette, tailoring and stance, never in a warped face. `skip_boss` is the one deliberate
  exception — a wide-eyed unhinged neutral, because that *is* his character state.
