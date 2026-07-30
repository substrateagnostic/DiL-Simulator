# Rachel (Trust Officer) — Dialog Draft

*Character ID: `rachel_to` (the villain SVP is already `rachel` / `rachel_boss`).*
*Speaker tag: `Rachel` throughout — see naming note at bottom.*

---

## 1. VOICE ANCHOR

Three candidates, each with a proof line in the character's mouth:

**A. Elizabeth Strout (Lucy Barton)** — Spare observation, enormous unsaid. Strout's
characters watch more than they speak; what they leave out carries the weight. Shyness
as precision.
> "You've been here late." *(She knows because her coat was still on the hook at six.)*

**B. Kent Haruf (Plainsong)** — Radically unadorned. Characters do kind things and
never discuss them. Kindness expressed through action, not reflection. Three words where
ten would do.
> "I made extra." *(She made it for him. She will never say that.)*

**C. Marilynne Robinson (Gilead)** — Contemplative warmth, attention as a form of love.
Notices the specific detail nobody else files.
> "You take yours black. Most people here don't."

### Recommendation: **Kent Haruf.**

Rachel's defining quality is practical kindness that doesn't announce itself.
Strout characters observe and *feel* — you sense the interior life pressing against the
surface. Haruf characters observe and *do* — you sense the kindness only after they've
left the room. Rachel is the person who puts coffee on your desk and is gone before you
can say thank you. That gap — between the gesture and the absence — is Haruf's whole
mode.

She is also the only voice in the cast that isn't performing. Andrew performs normalcy,
Janet performs indifference, Ross performs competence. Rachel just works. In a building
full of voices, hers is the one that's quiet on purpose. Haruf earns that.

The rest of this draft is written in the Haruf register.

---

## 2. DIALOG SET

### `rachel_to_intro`

First meeting. She was here before Andrew. She will not make a thing of it.

```js
rachel_to_intro: [
  /* 0  */ { type: 'text', speaker: 'Rachel', text: "Oh. Hi." },
  /* 1  */ { type: 'text', speaker: 'Andrew', text: "I didn't think anyone was here yet." },
  /* 2  */ { type: 'text', speaker: 'Rachel', text: "I'm always here first." },
  /* 3  */ { type: 'text', speaker: 'Rachel', text: "I'm Rachel. Trust officer." },
  /* 4  */ { type: 'action', action: 'set_flag', flag: 'met_rachel_to', value: true, next: 5 },
  /* 5  */ { type: 'text', speaker: 'Rachel', text: "Coffee maker's around the corner — sounds like it's dying, but it works." },
  /* 6  */ { type: 'end' },
],
```

---

### `rachel_return_act1`

Early days. She gives him a coffee without preamble. Gated so it fires once.

```js
rachel_return_act1: [
  /* 0  */ { type: 'condition', flag: 'rachel_gift_act1', ifTrue: 5, ifFalse: 1 },
  /* 1  */ { type: 'action', action: 'give_item', item: 'coffee_large', quantity: 1, next: 2 },
  /* 2  */ { type: 'action', action: 'set_flag', flag: 'rachel_gift_act1', value: true, next: 3 },
  /* 3  */ { type: 'text', speaker: 'Rachel', text: "You looked like you needed one." },
  /* 4  */ { type: 'end' },
  /* 5  */ { type: 'text', speaker: 'Rachel', text: "How's the desk?" },
  /* 6  */ { type: 'end' },
],
```

---

### `rachel_return_act2`

Henderson pressure is visible on Andrew. She notices, says almost nothing about it.

```js
rachel_return_act2: [
  /* 0  */ { type: 'condition', flag: 'rachel_gift_act2', ifTrue: 5, ifFalse: 1 },
  /* 1  */ { type: 'text', speaker: 'Rachel', text: "You look tired." },
  /* 2  */ { type: 'action', action: 'give_item', item: 'coffee_large', quantity: 1, next: 3 },
  /* 3  */ { type: 'action', action: 'set_flag', flag: 'rachel_gift_act2', value: true, next: 4 },
  /* 4  */ { type: 'text', speaker: 'Rachel', text: "It's the good roast. From downstairs.", mood: 'worried' },
  /* 5  */ { type: 'end' },
  /* 6  */ { type: 'text', speaker: 'Rachel', text: "Hang in there." },
  /* 7  */ { type: 'end' },
],
```

---

### `rachel_return_act3`

Andrew has been staying late — digging into the archive, the janitor's riddles, the
conspiracy. Rachel is the first person in. She sees the evidence: his desk lamp still
warm, his jacket over the chair.

```js
rachel_return_act3: [
  /* 0  */ { type: 'condition', flag: 'rachel_gift_act3', ifTrue: 5, ifFalse: 1 },
  /* 1  */ { type: 'text', speaker: 'Rachel', text: "You've been here late." },
  /* 2  */ { type: 'action', action: 'give_item', item: 'coffee_large', quantity: 1, next: 3 },
  /* 3  */ { type: 'action', action: 'set_flag', flag: 'rachel_gift_act3', value: true, next: 4 },
  /* 4  */ { type: 'text', speaker: 'Rachel', text: "I made extra." },
  /* 5  */ { type: 'end' },
  /* 6  */ { type: 'text', speaker: 'Rachel', text: "Don't forget to eat something." },
  /* 7  */ { type: 'end' },
],
```

---

### `rachel_note`

Act 4 onward. Rachel's desk is empty. Everything filed. A sticky note on the monitor.
This is the interactable — the player clicks her desk and gets this.

```js
rachel_note: [
  /* 0  */ { type: 'text', speaker: 'Narrator', text: "Rachel's desk. Everything filed. Monitor off. A sticky note." },
  /* 1  */ { type: 'text', speaker: 'Narrator', text: "'Gone home. You should too. — R'" },
  /* 2  */ { type: 'end' },
],
```

---

## 3. ROOM WIRING SUGGESTION

### Cubicle farm NPC entries

Rachel sits at her own desk in the cubicle farm, present Acts 1–3, gone from Act 4.
Coordinates are `TODO` — she needs a desk tile that isn't already occupied.

```js
// Rachel (trust officer) — present before act3_complete, hidden after
{ id: 'rachel_to', x: TODO, z: TODO, facing: 0, sitting: true,
  condition: { notFlag: 'met_rachel_to' } },

{ id: 'rachel_to', x: TODO, z: TODO, facing: 0, sitting: true,
  condition: { flag: 'met_rachel_to', notFlag: 'briefing_complete' },
  dialogId: 'rachel_return_act1' },

{ id: 'rachel_to', x: TODO, z: TODO, facing: 0, sitting: true,
  condition: { flag: 'briefing_complete', notFlag: 'act2_complete' },
  dialogId: 'rachel_return_act2' },

{ id: 'rachel_to', x: TODO, z: TODO, facing: 0, sitting: true,
  condition: { flag: 'act2_complete', notFlag: 'act3_complete' },
  dialogId: 'rachel_return_act3' },
```

### Sticky-note interactable (Act 4+)

```js
// Rachel's empty desk — sticky note appears after she's gone
{ x: TODO, z: TODO, type: 'monitor', dialogId: 'rachel_note',
  condition: { flag: 'act3_complete' } },
```

### Character config (`characters.js` entry)

```js
rachel_to: {
  tone: 'warm',
  name: 'Rachel',
  bodyColor: 0xf0d6b0,     // fair skin
  pantsColor: 0x3a3a5a,    // navy trousers
  shirtColor: 0x7a9ab5,    // soft blue blouse — not corporate-severe, not casual
  hairColor: 0xd4b87a,     // long blonde
  shoeColor: 0x3a2a1a,
  gender: 'f',
  eyeColor: 0x6a8a5a,      // hazel-green — warm, not steel
  jaw: 1.0,
  chin: 1.0,
  // hair: 'long' — needs CharacterBuilder support or a custom hair mesh
},
```

---

## 4. NOTES TO ALEX

Three deliberate choices:

1. **It's always coffee.** Every kindness beat is a `coffee_large`. Not variety for
   variety's sake — repetition IS the characterization. She makes coffee because she's
   first in. She gives it away because that's who she is. The third coffee ("I made
   extra") is the one that should land, because by then the player knows she didn't
   make extra. She made it for him.

2. **The note is yours.** "Gone home. You should too." is already in the Haruf register.
   I didn't change a word. The only addition is "— R" (because sticky notes have
   initials) and the narrator line before it ("Everything filed. Monitor off."), which
   earns the note by showing what kind of person leaves a desk like that.

3. **Naming collision.** The villain SVP is `rachel` / speaker `Rachel`. This new
   character is `rachel_to` in data, but also `Rachel` in dialog. They never share a
   scene — cubicle Rachel is gone by the time SVP Rachel becomes prominent — so context
   disambiguates. But if you want belt-and-suspenders: give one a last initial in the
   speaker tag, or let the intro dialog establish "Everyone calls me Rach" and use that.
   Your call. I wrote it as `Rachel` because that's her name.
