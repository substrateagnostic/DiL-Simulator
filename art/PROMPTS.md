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
| alex_it | ", a chaotic South Asian IT tech in their 20s wearing a loud orange hawaiian shirt, dark messy hair, wide caffeinated eyes lit by an unseen monitor glow, conspiratorial grin" |
| intern | ", a terrified college intern swimming in an oversized gray-blue suit, crooked name tag, deer-in-headlights expression, clutching a stack of folders" |
| janitor | ", a mysterious elderly Black man in a gray-blue jumpsuit, white stubble, gold Rolex glinting on his wrist, mop handle over shoulder, knowing half-smile of a man who owns more than he appears to" |
| rachel | ", a severe executive woman with a silver angular bob, navy power suit, pearl earrings, tablet clutched like a weapon, cold restructuring smile that does not reach her eyes" |
| isaiah | ", a calm Black man in his 30s in a blue button-down and glasses, thoughtful steady expression, the only emotionally regulated person in the building" |
| compliance | ", a pale auditor in a black suit and red tie wearing indoor sunglasses, clipboard held to chest, completely unreadable expression" |
| regional | ", a silver-haired regional manager in a power suit with gold tie, golf tan, predatory salesman grin, holding a putter like a scepter" |
| algorithm | ", a monolithic black server slab with a single glowing red optical sensor, cascading teal code reflections, faint cyan edge lighting, ominous and serene, no face, no humanity" |

## Generation log

| date | stem | status | notes |
|------|------|--------|-------|
| 2026-06-10 | — | pipeline wired, awaiting first batch | DialogBox auto-detects PNGs in src/assets/portraits/ |
