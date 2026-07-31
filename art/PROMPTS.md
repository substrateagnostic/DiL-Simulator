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
| ross | ", a middle-aged middle manager in a green golf polo with a bluetooth earpiece permanently in ear, holding a red 'WORLD'S OKAYEST BOSS' mug, forced optimistic grin hiding panic" |
| diane | ", a sharp Black woman in her 40s at a reception desk, immaculate blazer, headset mic, expression that says she has seen everything and is impressed by none of it" |
| janet | ", a weary woman in her 50s in a mauve cardigan over a white blouse, hair in a loose bun, holding a wine tumbler of 'water', deadpan thousand-yard HR-survivor stare" |
| alex_it | ", a man in his late 30s with short ash-blond hair with subtle grey flecks and a fuller trimmed taupe grey-brown beard, warm knowing grin, loud orange hawaiian shirt open over a plaid flannel, lit by the glow of unseen monitors, expression of serene holistic certainty — a detective of interconnected systems who already knows how the ticket resolves" *(rev 2, 2026-06-10: aged up, Dirk Gently energy, modeled on the co-creator — never pass the reference photo to codex)* |
| intern | ", a terrified college intern swimming in an oversized gray-blue suit, crooked name tag, deer-in-headlights expression, clutching a stack of folders" |
| janitor | ", a mysterious elderly Black man in a gray-blue jumpsuit, white stubble, gold Rolex glinting on his wrist, mop handle over shoulder, knowing half-smile of a man who owns more than he appears to" |
| rachel | ", a severe executive woman with a silver angular bob, navy power suit, pearl earrings, tablet clutched like a weapon, cold restructuring smile that does not reach her eyes" *(NAMING LEDGER: internal id `rachel` = the villain SVP, display name **Meredith Sterling**. Not the same person as `rachel_to` below.)* |
| rachel_to | ", a quietly warm young woman in her mid-twenties, a junior trust officer from the cubicle farm, long golden-blonde hair (#d4b87a) worn loose past her shoulders and drawn as a few large flat outlined masses rather than many fine strands, fair skin (#f0d6b0), soft rounded features, warm hazel-green eyes (#6a8a5a), small pearl stud earrings, a soft blue blouse (#7a9ab5) with an open collar and no jacket, a small unperformed half-smile that never becomes a grin, relaxed shoulders, open and unguarded, the only person in the building who is not performing — kind without announcing it, no severity and no corporate armor anywhere in the face. RENDERING, non-negotiable: hard flat cel shading with only two or three flat tone steps per surface and a crisp shadow edge, thick uniform dark ink outlines around the head, hair masses, collar and shoulders, bold graphic comic-book inking, deliberately limited palette, matching the attached portraits' exact line weight and shading language. NO soft airbrushed gradients, NO delicate thin linework, NO painterly rendering, NO photorealism, NO fine strand-by-strand hair." *(2026-07-31. NAMING LEDGER: internal id `rachel_to` = the friendly cubicle-farm trust officer, display name **Rachel** — NOT the villain `rachel` above. Palette per her `characters.js` entry; voice anchor Kent Haruf per `art/drafts/rachel_dialog_draft.md`. Modeled in part on a real colleague — never pass the reference photo to codex; `art/char_refs/human/real_people_notes.md` is the textual-only pipeline. The RENDERING block was added after a first pass came back soft-painterly and off-model for the cast; keep it on any future portrait.)* |
| isaiah | ", a calm Hispanic man in his early 40s with warm medium-tan skin, short dark hair neatly cut, thin wire-frame glasses, trim dark stubble, steady deep-brown eyes, the faintest knowing half-smile, quiet unshakeable dignity, business casual: a slate-blue button-down shirt open at the collar, relaxed shoulders, composed and unhurried — the only emotionally regulated person in the building, a stoic who journals" *(rev 2, 2026-07-29: recast Hispanic at producer request; modeled on a real colleague — never pass the reference photo to codex. Old Black-man rev 1 archived in `art/portraits_archive/isaiah/`.)* |
| compliance | ", a pale auditor in a black suit and red tie wearing indoor sunglasses, clipboard held to chest, completely unreadable expression" |
| regional | ", a silver-haired regional manager in a power suit with gold tie, golf tan, predatory salesman grin, holding a putter like a scepter" |
| algorithm | ", a monolithic black server slab with a single glowing red optical sensor, cascading teal code reflections, faint cyan edge lighting, ominous and serene, no face, no humanity" |

## Generation log

| date | stem | status | notes |
|------|------|--------|-------|
| 2026-06-10 | — | pipeline wired, awaiting first batch | DialogBox auto-detects PNGs in src/assets/portraits/ |
| 2026-07-29 | isaiah | rev 2 shipped (neutral only — no mood variants exist for isaiah) | Generated via `codex exec` + `$imagegen2`, style-refed against janet/alex_it/andrew 1024 raws. 1024 raw → `art/portraits_raw/isaiah.png`, LANCZOS → 256 in `src/assets/portraits/isaiah.png`. |
| 2026-07-31 | rachel_to | rev 2 shipped (neutral only) | Generated via `codex exec` + `$imagegen2`, style-refed against karen/janet/andrew 1024 raws. Rev 1 came back soft-painterly with thin linework — correct likeness, wrong house style — so the prompt gained the explicit RENDERING block and was re-run once; rev 1 kept at `art/portraits_raw/rachel_to_alt_painterly.png` if the producer prefers it. 1254 raw → `art/portraits_raw/rachel_to.png`, LANCZOS → 256² RGBA in `src/assets/portraits/rachel_to.png`. Framing sits marginally wider (chest-up) than andrew/janet — flag if it reads out of set in DialogBox. |

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
