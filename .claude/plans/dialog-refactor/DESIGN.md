# DIALOG SYSTEM REFACTOR — DESIGN

**Status:** design complete, implementation not started.
**Implementer:** gpt-5.6-sol xhigh (codex), under coordinator oversight.
**Producer decision (not re-litigated here):** the dialog system is refactored before
Chapter 2 authoring begins. Three layers are replaced; the runtime renderer stays.
**Amendment folded in (producer, live, 08-15):** the "producer writes one scene"
ergonomics test is dropped. Dialog is authored by Claude Opus 4.6 drafts, revised by
the producer in a plain text editor. The ergonomics target is therefore (a) LLM
emission and (b) hand-edit safety, with the compiler's diagnostics as the feedback
loop. §2.7 is the replacement acceptance suite.

Everything asserted about current behaviour in this document is cited `file:line`.
Everything counted was measured by a throwaway harness (`tools/_dr-corpus.mjs`,
`tools/_dr-ledger.mjs`, `tools/_dr-graph.mjs`); those three tools are read-only,
write nothing, and are deleted in Phase 9.

---

## 0. THE FOUR LAYERS, AND WHICH ONE SURVIVES

| Layer | Where it lives now | Size | Verdict |
|---|---|---|---|
| **Renderer** | `src/states/DialogState.js` (508 lines), `src/ui/DialogBox.js` | 1 file | **KEEP — untouched.** Its input format does not change by one byte. |
| **Corpus** | `src/data/dialogs/index.js` | 5,615 lines · **291 trees · 3,384 nodes** | **MIGRATE** to a line-oriented authoring format; `index.js` becomes a generated artifact. |
| **Story state** | `_syncActFromFlags` (`ExplorationState.js:3246-3256`), the derived block of `_refreshStoryProgress` (`:3494-3679`), the `flag-set` listener (`:301-553`), the room-entered trigger block (`:640-753`), `UNFINISHED_SCENE_LATCHES` (`:93-101`) | ~700 lines of hand-written conditionals | **EXTRACT** to a declarative story graph + a build-time simulator. |
| **Routing** | `_getDialogId` (`ExplorationState.js:2608-3019`) — **413 lines, 76 `if` statements, 64 return sites** | 1 function | **EXTRACT** to a prioritised rules table + a ~40-line evaluator. |

The renderer is genuinely good and genuinely load-bearing: it is the only place that
knows about the typewriter, the choice-arming window, the knowledge-gate presentation
rule, the stage-node EventBus hand-off and the `read_<id>` contract. Nothing in this
design touches it. **Every phase's proof obligation is expressed as "the array
`DialogState` receives is the same array".**

---

## 1. THE EVIDENCE BASE

### 1.1 What the corpus actually is (measured)

```
TREES: 291   NODES: 3384   mean 11.6 nodes/tree
largest: board_meeting=195  team_chat_hub=120  meredith_boss_defeated=73
         secret_ending=63   ending_architect=40  printer_interact=38
         compliance_crossword=38  branch_decision=36
NODE TYPES: text=2297  action=379  end=357  condition=231  choice=61  stage=58  "Andrew"=1
ACTIONS:    set_flag=260  give_xp=35  start_combat=33  quest_update=14
            modify_stat=14  give_item=13  recruit_ally=4  unlock_ally_ability=4  heal=2
CHOICE:     61 nodes, 177 choices (mean 2.90); 13 carry `flag`; 20 carry requires/requiresNot
JUMPS:      1,318 explicit — 190 backward, 555 forward-skip, 573 redundant (== index+1)
            1,076 distinct jump targets (31.8% of nodes need a name)
STAGE:      58 nodes (14 concurrent), 108 beats
SPEAKERS:   37 distinct, none containing a colon
PROSE:      0 multiline bodies, 0 leading-space bodies, longest 360 chars
```

Three facts from that table drive the whole format design:

1. **68% of nodes are never jumped to.** Only 1,076 of 3,384 need a name. A format
   that forces a label on every node is 2,308 lines of noise.
2. **Prose is single-line, colon-free in the head, and never multiline.** A
   line-oriented format needs no quoting, no escaping and no continuation rule.
3. **573 of 1,318 jumps are redundant** (`next` equal to index+1). Preserving them
   byte-for-byte would put a redundant `goto` on 573 lines of the converted corpus.
   §3.2 disposes of them under a proof that already exists.

### 1.2 The three failure classes this refactor exists to kill

**(a) The absolute-index format is silently corruptible.** CLAUDE.md already records
`team_chat_hub` drifting one slot: 80 of 119 `/* NN */` labels wrong, 48 nodes with no
path from node 0, one permanently uncollectable `modify_stat maxMP +5`. The current
mitigation is a human law ("never insert a node into the middle of a dialog array") and
one build check that only catches *reward* nodes with no path (`scripts/validate-data.mjs:173-189`).

Live proof the format itself is unchecked: **`src/data/dialogs/index.js:1317` carries
`{ type: 'Andrew', speaker: 'Andrew', text: "I'm going to disrupt my way right out of
this building." }`** — a node type that does not exist. `DialogState._processNode`
falls to `default:`, logs a `console.warn` and skips it (`DialogState.js:175-179`).
That Andrew line has never rendered in the shipping game, and `validateDialogs`
(`scripts/validate-data.mjs:63-102`) never checks node types, so nothing has ever said so.

**(b) The act chain is implicit `set_flag` scatter with no reachability proof.**
`act4_complete` has exactly **one** writer in the entire game: `dialogs/index.js:2178`,
node 8 of `act5_trigger`. `act5_trigger` has exactly **one** pusher:
`ExplorationState.js:699-705`, which sets the one-shot latch `act5_triggered`
*synchronously* and pushes the dialog **800 ms later**, while `_changeRoom` ends with
`_autoSave` (`:1337`). The regression hunt landed the diagnosis in-tree at
`ExplorationState.js:69-101` and measured it with `tools/_r-act5latch.mjs`: an
interrupted entry banks `act5_triggered:true / act4_complete:false`, and nothing can
ever push the scene again. Acts 5, 6 and 7 become unreachable.

`UNFINISHED_SCENE_LATCHES` (`ExplorationState.js:93-101`, 7 rows) is a **runtime
repair** for this — reconciled at load and on defeat. This design's contribution is
the **prevention**: the trigger's once-predicate stops being a hand-written flag and
becomes the scene's own `read_<sceneId>`, which `DialogState._endDialog` writes only
after a node has actually been shown (`DialogState.js:466-473`), and the build fails on
any hand-written started/done pair that has no waiver (§4.6, check E).

Measured scale of the class: **11 spend-before-grant latches** in `ExplorationState.js`
(`:642 executive_floor_visited`, `:648 ending_started`, `:682 visited_archive`,
`:683 archive_found`, `:700 act5_triggered`, `:710 data_lead_fight_started`,
`:722 alex_it_recruit_offered`, `:734 meredith_fight_started`, `:745 penthouse_entered`,
`:4008 restructuring_trio_started`, `:4017 chief_fight_started`), against 23 `new
DialogState(` push sites in the same file.

**(c) Nothing proves a scene is reachable at all.** A static name search over the
routing code, room data and encounter data (`tools/_dr-graph.mjs`) finds **6 authored
dialog trees with no route into them anywhere in the game**:

```
dying_plant  board_room_table  penthouse_window  vault_entrance  vault_charter  penthouse_terminal
```

All six are pure flavour (no rewards, no flags), so `validateRewardReachability`
cannot see them and neither can anything else. They are dead content that shipped.

---

## 2. DELIVERABLE 1 — THE AUTHORING FORMAT

### 2.1 Shape decision, and why not JS object literals

Two candidates were considered.

**Rejected: JS object literals keyed by label.** Free tooling (syntax highlight,
prettier), no parser to write. But: the corpus is prose, and prose in JS strings means
permanent quote-escaping (the current file is full of `\'`); a dropped brace corrupts
the file from that point to EOF and reports as `Unexpected token` at a line number
thousands away from the mistake; and a "cut this sentence" edit sits inside a quoted
string that a text editor gives no help with. Under the amendment's two targets — an
LLM emitting hundreds of lines without drift, and a human hand-editing one line — the
**cascade** property is decisive. Bracket-balanced formats cascade. Line formats do not.

**Chosen: a line-oriented text DSL, `src/data/dialogs/*.dlg`.** One node per line.
No brackets to balance, no quotes to escape, no commas. A malformed line is a
*single* diagnostic and every other line in the file still parses — which is exactly
the "structural redundancy that makes single-line errors locally detectable" the
amendment asks for. And because the compiler owns the file, **every diagnostic can
carry `file:line`, the scene id and the nearest label** — the ergonomics surface the
amendment names.

### 2.2 The one parsing rule

Every prose-bearing line is:

```
<head>: <verbatim prose to end of line>
```

split at the **first** colon. There are exactly three prose-bearing line kinds
(`Speaker:`, `ask …:`, `-> label …:`). Everything after that first colon is taken
verbatim — apostrophes, quotes, colons, dashes, asterisks, arrows, anything. **Prose
never needs escaping, in any position, ever.**

Every other line kind is a token grammar with no colon in it. Disambiguation is
structural and machine-checked: **directive keywords are a closed set of 13 lowercase
words; a speaker name must begin with an uppercase letter.** All 37 shipped speakers
satisfy that (measured); the compiler enforces it and says so by name if violated.

### 2.3 Grammar (EBNF — normative)

```ebnf
file        = { blank | comment | scene } ;
comment     = ws "#" any-to-eol ;
blank       = ws eol ;

scene       = "scene" ws id eol { scene-opt } { stmt } ;
scene-opt   = ws "mode" ws ("quiz" | "evergreen-hub") eol ;

stmt        = label | say | ask | cond | goto | action | stage | endn ;

label       = ws "@" id eol ;                        (* attaches to the NEXT stmt *)

say         = ws speaker ":" sp prose eol ;
speaker     = uppercase-start , { any-but-colon } ;

ask         = ws "ask" [ ws speaker ] ":" sp prose eol { arm } ;
arm         = ws "->" ws id { arm-mod } ":" sp prose eol ;
arm-mod     = ws "sets" ws id [ "=" value ]
            | ws "requires" ws id
            | ws "unless" ws id ;

cond        = ws "if" ws id [ ws "->" ws id ] [ ws "else" ws "->" ws id ] eol ;
goto        = ws "goto" ws id eol ;
endn        = ws "end" eol ;

action      = set | fight | give | xp | stat | heal | quest | recruit | teach ;
set         = ws "set" ws id [ "=" value ] eol ;
fight       = ws "fight" ws id eol ;
give        = ws "give" ws id [ ws "x" int ] eol ;
xp          = ws "xp" ws int eol ;
stat        = ws "stat" ws id ws signed-int eol ;
heal        = ws "heal" eol ;
quest       = ws "quest" ws id ws ("stage"|"objective") ws int [ ws "status" ws id ] eol ;
recruit     = ws "recruit" ws id eol ;
teach       = ws "teach" ws id ws id eol ;

stage       = ws "stage" [ ws "concurrent" ] eol { beat } ;
beat        = ws [ "@" id ws ] actor { ws verb [ ws arg ] } eol ;
actor       = id | "player" ;
verb        = "walkTo"|"face"|"sit"|"stand"|"exit"|"gesture"|"pose"|"expression"
            | "spawn"|"spawnAt"|"teleportTo"|"show"|"speed"|"hold"|"after"|"nowait" ;
arg         = id | number | number "," number ;

id          = ( letter | digit | "_" ) + ;
value       = "true" | "false" | number | '"' any-but-quote '"' ;
```

`mode quiz` / `mode evergreen-hub` are **declarations, not behaviour**: they are
cross-checked against `KNOWLEDGE_GATE_DIALOGS` (`DialogState.js:30-35`) and
`EVERGREEN_HUB_DIALOGS` (`DialogState.js:48-50`) at compile time and the build fails on
any disagreement in either direction. The renderer's two `Set` literals are not touched.

### 2.4 Compile mapping (normative, field by field)

| DSL | emitted node |
|---|---|
| `Janet: text` | `{ type:'text', speaker:'Janet', text:'text' }` |
| `Janet mood=angry: text` | adds `mood:'angry'` (9 nodes in corpus) |
| `ask Janet: prompt` + arms | `{ type:'choice', speaker:'Janet', prompt, choices:[…] }` |
| `ask: prompt` (no speaker) | `{ type:'choice', prompt, choices:[…] }` — **no `speaker` key** (17 nodes) |
| `-> lbl: text` | `{ text, next:<lbl> }` |
| `-> lbl sets f: text` | `+ flag:'f'` (3 nodes) |
| `-> lbl sets f=true: text` | `+ flag:'f', flagValue:true` (10 nodes) |
| `-> lbl requires f unless g: t` | `+ requires:'f', requiresNot:'g'` |
| `if f -> a else -> b` | `{ type:'condition', flag:'f', ifTrue:<a>, ifFalse:<b> }` |
| `if f -> a` | `{ type:'condition', flag:'f', ifTrue:<a> }` (falls through when false) |
| `goto lbl` (after any node) | sets that node's `next:<lbl>` — **consumes no index** |
| `set f` | `{ type:'action', action:'set_flag', flag:'f', value:true }` |
| `set f = "report"` | `value:'report'` (3 nodes: `alex_server_secret[13,17,20]`) |
| `fight karen` | `{ action:'start_combat', encounter:'karen' }` |
| `give coffee_large x2` | `{ action:'give_item', item, quantity:2 }` |
| `xp 300` / `stat maxMP +5` / `heal` | the obvious |
| `quest side_lunch_thief stage 1` | `{ action:'quest_update', quest, stage:1 }` |
| `quest x objective 2 status done` | `{ action:'quest_update', quest, objective:2, status:'done' }` |
| `recruit janet` / `teach janet binder_slam` | `recruit_ally` / `unlock_ally_ability` |
| `stage` / `stage concurrent` + beats | `{ type:'stage', beats:[…] }` / `+ concurrent:true` |
| `end` | `{ type:'end' }` |

**`goto` is a modifier, not a node.** It attaches `next` to the statement above it.
Absence of `goto` means implicit fall-through and emits **no `next` key**. That
one-to-one correspondence (`explicit goto ⇔ explicit next`) is what makes the
round-trip exact.

Beat lines: `after <beatLabel>` resolves to the positional beat index — **the author
names it, the compiler counts it.** `nowait` → `wait:false`. `spawn`/`stand`/`show`
with no argument → `true`. `8.4,13.4` → `[8.4, 13.4]`.

### 2.5 Three real scenes, rewritten

These are exact rewrites of shipped trees. Each compiles back to the current array
(after the Phase-1 normalisation of §3.2), which is the Phase-3 proof obligation.

---

#### (A) Condition-heavy, with a retry gate — `janitor_riddle_1`
*(source: `dialogs/index.js:3261-3277`; the two-node retry gate at indices 0–1 is the
pattern CLAUDE.md names "Janitor riddle retry pattern")*

```
scene janitor_riddle_1
  mode quiz

  if riddle_1_attempted -> riddle
  set riddle_1_attempted
  Mysterious Janitor: Ah, Andrew. Looking for wisdom? I have a riddle for you.

  @riddle
  Mysterious Janitor: I am owed by many but owned by none. I am earned by actions, not by transactions. What am I?

  ask Mysterious Janitor: Take your time.
    -> correct: Trust.
    -> wrong:   Money.
    -> wrong:   Respect.

  @correct
  Mysterious Janitor: Trust. Correct. The very thing this building was built to protect.
  Mysterious Janitor: Come back — I have more riddles.
  set janitor_riddle_1_done
  goto out

  @wrong
  Mysterious Janitor: Not quite. Think about what this place is supposed to protect. What people give us when they walk through those doors.
  Mysterious Janitor: Come back when you've thought about it.

  @out
  end
```

What this buys, concretely. The shipped version's retry gate is
`{ condition, ifTrue: 3, ifFalse: 1 }` followed by a `set_flag` with `next: 2`; the
correct branch ends `next: 10`. Four magic integers, all of which move if anyone adds a
line. Here there are none, `mode quiz` makes the opt-out at `DialogState.js:233`
visible at the top of the scene it applies to, and the two wrong answers share one
`@wrong` block by name instead of by "both point at 8".

---

#### (B) A choice hub with `_chose_` memory — `janet_intro`
*(source: `dialogs/index.js:91-122`, 25 nodes. Node 3 is the hub; nodes 7, 17 and 24 all
jump back to it; nodes 22–24 are the "append at the end and route to it" tail that
CLAUDE.md's never-insert law requires.)*

```
scene janet_intro

  Janet: Ah. The new trust officer. They get younger every year. Or I'm aging in the cask. One of those.
  Janet: I'm Janet. I handle the... *sip* ...smaller accounts. The ones where nobody's fighting. So, like, three of them.
  Janet: Welcome to the sixth floor. We call it 'The Trust Fall.' Nobody catches you.

  @hub
  ask Janet: Anyway -- what can I help you with, hon?
    -> tumbler:  What's in the tumbler?
    -> tips:     Any tips for surviving here?
    -> whos_who: Who's who around the office?
    -> leaving:  I should get going.

  @tumbler
  Janet: This? It's... kombucha.
  Andrew: At 9:30 AM?
  Janet: It's fermented. That's the POINT of kombucha. Don't make it weird.
  Janet: *extremely long sip*
  goto hub

  @tips
  Janet: Oh sweetie. Okay. Number one: never eat anything from the break room fridge. The notes in there have gotten... hostile.
  Janet: Number two: if the printer starts making noises, just walk away. We've had three repair techs quit this year.
  Janet: Number three: Skip will use the word 'synergy' at least fourteen times before lunch. Don't drink every time or you'll end up like me.
  Janet: *looks at tumbler* ...Successful. You'll end up successful like me.
  Janet: Oh, and someone's been stealing lunches from the fridge. My money's on Alex from IT, but the Janitor says it's 'an inside job.' Whatever that means.
  goto lunch_thief_hook

  @whos_who
  Janet: Let's see... Skip is your boss. He's... enthusiastic. He once described a simple trust amendment as 'a paradigm-shifting leverage event.'
  Janet: Alex from IT lives in the server room. I'm not sure he has a home. He speaks entirely in acronyms.
  Janet: The Intern... bless his heart. He's been here three months and still thinks fiduciary duty is a type of military service.
  Janet: Diane at reception is the only competent person in this building. If you need anything actually done, talk to her.
  Janet: And then there's the Janitor. He wears a gold Rolex and gives financial advice while mopping. Nobody asks questions.
  goto hub

  @leaving
  set met_janet
  Janet: Anyway, good luck with the Henderson case. You're going to need it. Those people make Thanksgiving look like a contact sport.
  Janet: *sip*
  end

  # Appended after the tail and routed to from @tips. Under the old format this
  # was the only safe way to add a node; under the new one the lock file makes it
  # the only POSSIBLE way — see §3.3.
  @lunch_thief_hook
  if lunch_thief_started -> hub
  quest side_lunch_thief stage 1
  set lunch_thief_started
  goto hub
```

Note the three properties the amendment asked for, visible here:
*re-pointing a jump* is editing one word after `->` on one line, with no counting;
*cutting a sentence* is deleting one whole line whose neighbours are unaffected;
*grep* — `grep -n "@tips\|-> tips" ` gives the definition and every jump into it.

The `_chose_` flag key is `_chose_${dialogId}_${nodeIndex}_${choiceIndex}`
(`DialogState.js:238` and `:273`). Node index survives verbatim because of the lock
file (§3.3); choice index is the position of the arm within the `ask` block, which the
author can see.

---

#### (C) A staged scene — `meredith_footnote`
*(source: `dialogs/index.js:5376-5397`. 15 nodes; node 12 is the stage node whose walk-out
lands before the despawn flag, which is the whole point of the scene.)*

```
scene meredith_footnote

  Narrator: Meredith Sterling is at the secondary desk on the executive floor. She is packing a single cardboard box. It has already been labeled, in her handwriting, in block capitals. She is not rushed.
  Meredith Sterling: Andrew. *She does not look up.* Close the door, please.
  Andrew: I wasn't planning on staying.
  Meredith Sterling: Then close it on your way out. But you should hear this first.
  Meredith Sterling: What you did with the charter was structurally sound. I reviewed it twice. The filing was clean and the precedent was applicable. The board had no procedural basis for override. I would have done it differently, but I would not have done it better.
  Andrew: Is that a compliment?
  Meredith Sterling: It is an assessment. Compliments are retention tools. You need information. *She places a framed photograph into the box, face down.* What you did was not a victory. It was a deferral. The incentives that produced my proposal have not changed. Margin compression and regulatory consolidation are structural forces. I was the instrument. It does not require me.
  Andrew: How long?
  Meredith Sterling: Fourteen years. Eleven if they hire a comptroller from outside the trust division. I have a model. It was right about Lehman within two quarters.
  Andrew: I don't know what to do with that number.
  Meredith Sterling: No. *She closes the box.* You wouldn't.
  Narrator: The label on the box reads STERLING, M. — NON-CORE ASSETS.

  # She carries the box out rather than vanishing at the desk. Scheduled, not
  # concurrent: the walk-out IS the beat, and `meredith_left` has to land after it.
  stage
    @cross  meredith walkTo exec_center speed 1.4
            meredith exit elevator speed 1.4 after cross
            player face elevator nowait

  set meredith_left
  end
```

Three things this scene demonstrates that the format has to get right, and does:
prose containing `*asterisks*`, em-dashes, apostrophes and a colon-free head passes
through untouched (the 360-character line is the longest body in the corpus);
`after cross` is a **named** beat reference, so nobody counts beats;
`stage` vs `stage concurrent` is a word, not a punctuation mark, because
`DialogState._processStage` (`:431-461`) treats them as two different playback modes and
the choice is the single most misread thing about staging.

### 2.6 File layout

`src/data/dialogs/*.dlg`, one file per banner block already present in `index.js`, in
source order, target ≤600 lines per file (≈16 files). Scene ids must be globally
unique; the compiler names both files on a collision. `src/data/dialogs/index.js`
survives as the **generated artifact** with a `DO NOT EDIT` banner, so nothing else in
the codebase changes its imports (`ExplorationState.js` and `scripts/validate-data.mjs`
are the only two importers — measured).

### 2.7 Ergonomics acceptance suite (replaces the write-one-scene test)

All four are build-gated and live in `tools/dlg/`.

**T1 — LLM emission fidelity.** Opus 4.6 is given the one-page grammar card (§2.3 plus
scene A) and asked for 10 new scenes totalling ≥400 lines across all five shapes
(prose run, hub, condition gate, staged, reward-paying). **Accept when:** ≥95% of lines
parse on first emission; every parse failure is confined to its own line (zero
cascade — assert that the count of diagnostics equals the count of injected defects);
and every diagnostic names the scene, the nearest label and the line.

**T2 — Hand-edit safety (mechanised).** Five mutation classes applied at 200 random
sites each over the converted corpus: (1) change a word inside prose, (2) delete a whole
prose line, (3) re-point a `goto`/arm to another existing label, (4) rename a label at
its definition only, (5) insert a prose line mid-scene. **Accept when:** classes 1–3
and 5 always still compile; class 4 always fails with a diagnostic naming the now-dangling
jump *and* the removed label; and `git diff --stat` for classes 1–3 shows exactly one
hunk of ≤3 lines.

**T3 — Diagnostic quality.** A fixture table of ≥25 malformed inputs → expected
diagnostic. Every diagnostic must contain: file, line number, scene id, nearest label,
what was expected in plain words, and — for an unresolved label — the three nearest
labels by edit distance. **Accept when:** no diagnostic contains the string
"unexpected token", a bare stack trace, or a bare node index.

Reference diagnostics (normative style):

```
src/data/dialogs/06-act5.dlg:214  scene meredith_footnote, after @cross
  This beat says `after crass`, but no beat in this stage block is called that.
  Beats here: @cross. Did you mean @cross?

src/data/dialogs/01-intros.dlg:37  scene janet_intro, in the hub at @hub
  The choice "Any tips for surviving here?" jumps to @tps, which this scene
  does not define. Nearest labels: @tips, @hub, @tumbler.

src/data/dialogs/02-props.dlg:88  scene poster_cf_5, line 3
  "andrew: I'm going to disrupt..." — a speaker name must start with a capital
  letter, or this is a directive I do not know. Known directives: ask, if, goto,
  end, set, fight, give, xp, stat, heal, quest, recruit, teach, stage.
```

**T4 — Grep contract.** On the converted corpus: every `@label` is defined exactly once
per scene; every jump target resolves; every scene id is unique across files; every
speaker string used appears in `SPEAKER_COLORS`/`PORTRAIT_KEYS` or is reported (this
subsumes the `validatePortraits` speaker-string trap CLAUDE.md documents).

---

## 3. DELIVERABLE 2 — THE COMPILER

### 3.1 Pipeline

```
src/data/dialogs/*.dlg  ──parse──>  AST  ──resolve──>  indexed nodes  ──emit──>
    src/data/dialogs/index.js   (committed, DO NOT EDIT banner)
                    │
                    └── dialogs.lock.json  (committed, label → index, append-only)
```

- `npm run dialogs:build` — compile, write both artifacts.
- `npm run dialogs:check` — compile to memory, **fail if the on-disk `index.js` differs**.
  Joins `npm run check` ahead of `validate:data`. This is what stops a hand edit to the
  generated file from shipping.
- Dev mode: a Vite plugin compiles `.dlg` in memory on change and HMRs the module, so
  the author's loop is edit → save → the running game has the new line. Shipping always
  compiles through the committed artifact.

### 3.2 The normalisation pre-pass (Phase 1) — the complete ledger

The DSL is a canonical form; the corpus is not yet canonical. Every single divergence
was enumerated (`tools/_dr-ledger.mjs`). **There are seven rows and no others.**

| # | Class | Count | Disposition | Proof it is a no-op |
|---|---|---|---|---|
| 1 | redundant `next` == i+1 | 307 | **delete the field** | `DialogState.js:193` (text), `:395` (action), `:438`/`:453` (stage) all default to `currentIndex + 1` |
| 2 | redundant `ifFalse` == i+1 | 131 | **delete the field** | `DialogState.js:305` |
| 3 | redundant `ifTrue` == i+1 | 75 | **delete the field** | `DialogState.js:303` |
| 4 | choice node spells the prompt `text` not `prompt` | 35 | **rename to `prompt`** | `DialogState.js:257` reads `node.prompt \|\| node.text \|\| ''` |
| 5 | `set_flag` with no `value` | 1 (`receptionist_intro[13]`) | **add `value:true`** | `DialogState.js:329` defaults missing value to `true` |
| 6 | `{ type:'Andrew' }` | 1 (`poster_cf_5[2]`) | **fix to `type:'text'`** | see §7.1 — this one is *not* a no-op, and it is the only row that isn't |
| 7 | choice `flag` with no `flagValue` | 3 (`branch_decision[6]`) | **leave as-is** | the DSL expresses it (`sets f` vs `sets f=true`); `DialogState.js:278` |

Rows 1–3 are 513 nodes and they are the reason this pre-pass exists: without it the
converted corpus carries 513 redundant `goto` lines and 513 labels that mean nothing.
**They are provably invisible to the existing gate**: `tools/_g-stage-verify.mjs:27-32`
deletes `next`/`ifTrue`/`ifFalse`/`fallback` from every node signature before comparing,
and `:35-50` resolves every edge as `n[k] ?? i+1`. That tool was built to prove exactly
this class of change and it can be run unmodified.

Rows 4 and 5 change a node signature, so `_g-stage-verify` *would* flag them. They get
`tools/_dr-semantic-equal.mjs` instead: a comparator that applies `DialogState`'s own
read semantics (a table of five accessors, one per row above) to both sides and asserts
the rendered speaker/prose/choices/flag-writes/edges are identical for every node.

Row 6 is escalated to the producer. It is one line of dialogue that has never been seen.

**Phase 1's obligation is structural equivalence, not byte identity. Phase 3's
obligation is byte identity against the Phase-1 baseline.** Saying which is which is the
whole reason the ledger exists.

### 3.3 `dialogs.lock.json` — the index ledger

```json
{
  "version": 1,
  "scenes": {
    "janet_intro": {
      "labels": { "hub": 3, "tumbler": 4, "tips": 8, "whos_who": 13,
                  "leaving": 18, "lunch_thief_hook": 22 },
      "length": 25
    }
  }
}
```

Rules, all compiler-enforced:

1. **Append-only.** A label present in the lock keeps its index forever. A new label
   takes the next free index. A label removed from the `.dlg` leaves its index
   **reserved**; the compiler emits `{ type:'end' }` into the hole — which is the
   padding convention this corpus already uses (**41 unreferenced `end` pads measured**).
2. **No index is ever reused.** Renaming a label therefore costs one pad. That is
   deliberate: the cost is one wasted array slot, and the thing it buys is that
   `_chose_${dialogId}_${nodeIndex}_${choiceIndex}` (`DialogState.js:238`, `:273`) is
   stable across every build for every save in the wild.
3. **Unlabelled nodes are packed into the gaps between labelled ones, in source
   order.** A scene where nothing labelled has moved cannot have anything else move.
4. The lock file is **committed and reviewed**. Its diff is the human-readable proof
   that a content change added nodes and moved none — which is CLAUDE.md's
   never-insert-into-the-middle law, promoted from a human law to a machine invariant.
5. `--reseed` regenerates the lock from scratch and is **refused** unless
   `DIALOGS_LOCK_RESEED=i-know` is in the environment. It is used exactly once, in
   Phase 3.

Merge conflicts: the lock is keyed per scene, so two authors adding scenes in different
files produce a textual conflict in different objects. The compiler additionally fails
on any duplicate index within a scene, so a bad merge cannot compile.

### 3.4 The auto-converter (old → new)

`tools/dlg/convert.mjs`, run **once**, in Phase 3, against the Phase-1 baseline.

Algorithm:
1. Import `DIALOGS`. For each tree, compute the set of jump targets (1,076 total).
2. Assign each target a label. **The converter must not invent semantics**: labels are
   `n<originalIndex>` (`@n3`, `@n22`). That is exactly the number the `/* NN */`
   comments already print, so a human reading a converted file recognises every jump
   from the old file. Meaningful renaming, if wanted, is a later cosmetic pass, one
   scene at a time, each costing one pad and each gated by the lock diff.
3. Emit statements in index order, printing `@n<i>` before any labelled node, `goto
   @n<j>` after any node with an explicit non-fall-through `next`, and nothing after a
   fall-through.
4. Group scenes into files by the banner comments already in `index.js`; carry every
   `//` comment block across as `#` comments, verbatim, attached to the scene or
   statement that followed it. **The comments in this corpus are load-bearing
   documentation and none may be dropped** — the converter asserts that the count of
   comment lines out equals the count in.
5. Seed `dialogs.lock.json` from the label→index map computed in step 2.

Then compile and diff. **The proof obligation is: `deepEqual(compile(convert(BASELINE)),
BASELINE)` for all 291 trees, and `git diff --exit-code src/data/dialogs/index.js`
returns clean.** Key order is not part of the obligation (the brief says deep-equal);
field *presence* is, which is why the §3.2 ledger exists.

### 3.5 Compiler-side checks (fail the build)

Beyond the grammar: unknown node type (would have caught `poster_cf_5[2]`);
unresolved label, with nearest-three suggestions; duplicate label within a scene;
duplicate scene id across files; a scene with no reachable `end`; a node with no path
from the first statement (this generalises `validateRewardReachability` from reward
nodes to *all* nodes, and reports non-reward orphans as warnings so the existing 41
pads do not turn the build red); `mode` declarations disagreeing with the renderer's two
`Set`s; every `fight <id>` resolving in `ENCOUNTERS`; every `give <id>` in `ITEMS`;
every `stat <id>` in `PLAYER_BASE_STATS`; every stage beat actor/mark resolving
(subsumes `scripts/validate-data.mjs:111-145` and `tools/_g-stage-verify.mjs:150-186`).

---

## 4. DELIVERABLE 3 — THE STORY GRAPH AND ITS SIMULATOR

### 4.1 What is being replaced

| Current | Location | Rows |
|---|---|---|
| Act ladder | `ExplorationState.js:3246-3256` | 7 |
| Derived-flag latches | `:3494-3665` | 13 (8 latch, 5 live) |
| Derived latches in the listener | `:462-463`, `:515-519`, `:521-525` | 3 |
| Quest-id ladder | `:3669-3676` | 7 |
| Room gates | `:1091-1112` | 12 |
| Special gates | `:1119-1140` + the two keypad intercepts | 3 |
| Code-side scene triggers | `:640-753`, `:4004-4022` | 23 push sites |
| Unfinished-scene repair table | `:93-101` | 7 |
| Quest-stage bands | `src/utils/dialogGating.js:17-52` | 6 ranges + 23 critical ids |

### 4.2 Format

`src/data/story/graph.js` — a plain JS module of JSON-shaped objects. JSON-shaped
because the balance/room editor (`scripts/editor.js`) must be able to grow a tab for it
later; a module because the expression AST reads better with a helper import and
because `ALL_RENOVATION_FLAGS` must be derived from `SHOP_ITEMS` rather than copied.

Expressions are arrays — JSON-safe, greppable, no parser:

```js
'flag_name'                       // truthy
['not', X]
['all', X, Y, …]  ['any', X, Y, …]
['act', '>=', 3]
['room', 'board_room']
['count', '>=', 3, 'breaches']    // numeric flag — reserved for C2
['is', 'server_secret_choice', 'report']   // value equality; already needed (3 nodes)
['set', 'RENOVATION_FLAGS']       // every flag in a named set
['pred', 'alexStoryBeat']         // a named predicate, code-backed, whitelisted
```

Named predicates are the escape hatch and they are **capped**: a whitelist in
`src/data/story/predicates.js`, each with a one-line docstring, each pure over
`{ player, npc, room, act, DIALOGS }`. Four are needed at extraction time
(`alexStoryBeat`, `retryLive`, `sideQuestInProgress`, `janitorBeat`); the simulator
requires every one to declare `reads: [...flags]` so reachability analysis can still see
through it.

### 4.3 The five blocks

```js
export const ACTS = [
  { index: 1, id: 'act1', when: 'briefing_complete', quest: 'main_act2' },
  { index: 2, id: 'act2', when: 'branch_chosen',     quest: 'main_act2_finale' },
  { index: 3, id: 'act3', when: 'act2_complete',     quest: 'main_act3' },
  { index: 4, id: 'act4', when: 'act3_complete',     quest: 'main_act4' },
  { index: 5, id: 'act5', when: 'act4_complete',     quest: 'main_act5' },
  { index: 6, id: 'act6', when: 'act5_complete',     quest: 'main_act6' },
  { index: 7, id: 'act7', when: 'act6_complete',     quest: 'main_act7' },
];
```
Highest satisfied index wins — bit-identical to `_syncActFromFlags` and to the `questId`
ladder, which are today two hand-kept parallel lists (`:3246-3256` and `:3669-3676`).

```js
export const DERIVE = [
  { id: 'ready_for_skip', mode: 'latch',
    when: ['all','met_janet','met_intern','met_isaiah','met_alex_it'],
    note: 'Auto-gate Skip until all four coworkers have been met.' },

  { id: 'board_meeting_closed', mode: 'latch',
    when: ['any','board_meeting_held','act6_complete'],
    deferWhile: ['room','board_room'],
    note: 'One-way. Clears 18 Board Room staging NPCs. Deferred while the player is '
        + 'standing in the room or the whole cast deletes itself in one visible frame.' },

  { id: 'intern_at_desk', mode: 'live',
    when: ['any', ['not','act5_complete'], 'board_meeting_closed'] },
  …
];
```

`mode: 'latch'` = write once, never clear (8 rules). `mode: 'live'` = recomputed every
evaluation, two-way (the 5 Intern placement flags at `:3576-3586`, the only two-way
flags in the current block and documented as such). `deferWhile` is the board-room
deferral at `:3650-3665`, kept as data — including the `window.__boardDeferOff` A/B
switch, which becomes `graphEval({ ignoreDefers: true })`.

```js
export const GATES = [
  { room:'executive_floor', requires:'branch_chosen',
    message:'The keycard reader blinks red. AUTHORIZED PERSONNEL ONLY.' },
  { room:'penthouse', requires:'act6_complete',
    message:"The staircase to the Penthouse is sealed. You need the Janitor's Rolex." },
  { room:'archive', kind:'knowledge', code:'47-19-82',
    note:'NOT a flag gate. Intercepted before the gate table — do not add a flag row.' },
  …
];
```

```js
export const TRIGGERS = [
  { id:'act5-restructuring', on:'room-entered', room:'cubicle_farm',
    when: ['all','has_charter','act3_complete',['not','act4_complete']],
    once: 'scene',            // <-- !read_act5_trigger, NOT a hand-written latch
    scene:'act5_trigger', delayMs: 800,
    grants: ['act4_complete','janet_recruited'] },
  …
];
```

```js
export const CARRY = { /* which flags are ofRecord — see §6.4 */ };
```

### 4.4 The one-shot fix, stated plainly

`once` takes three values:

- `'scene'` (**the default, and the only one new content may use**) — the trigger
  re-fires until `read_<scene>` is set. `DialogState._endDialog` writes that flag only
  when a node was actually shown (`DialogState.js:466-473`), so an interrupted scene is
  re-servable by construction. Tonight's bug cannot be authored.
- `'flag:<name>'` — a legacy hand-written latch. **Requires a `waiver: '<reason>'`
  string**, and the simulator prints every waiver in its report.
- `'always'` — repeatable (the Meredith board-room re-entry at `:733-741` is this).

`UNFINISHED_SCENE_LATCHES` (`:93-101`) is then derivable rather than hand-written: every
trigger with `once: 'flag:X'` and a non-empty `grants` yields a row `{ started: X, done:
grants[0] }`. Phase 8 converts the 7 rows to `once: 'scene'` and the repair table
becomes empty — the runtime reconciler is kept as belt-and-braces for saves made before
the change.

### 4.5 Where the grants come from

The simulator does not need the graph to list every flag write. It harvests three
sources and unions them:

1. **Compiled dialogs** — every `set_flag` node and every choice `flag`, with the
   in-tree path condition that reaches it. (260 + 13, measured.)
2. **Auto-grant patterns**, declared once: `defeated_<encounterId>` and
   `bestiary_<encounterId>` on victory (`ExplorationState.js:1447`),
   `retry_<encounterId>` on defeat, `read_<dialogId>` on completion, `_chose_<...>` on
   any choice.
3. **`CODE_GRANTS`**, a declared list of flags written by JS, each carrying its
   `file:line` and its precondition. Seeded from the measured set: 11 one-shot latches,
   `portfolio_strong` (`:2196`), `andrew_invoked_charter` (`CombatState.js:1335`),
   the shop's category and renovation flags, the NG+ `ng_*` reads, `floor_13_found`
   (`:1325`), `act7_complete` (`:463`). The simulator **fails on any flag read anywhere
   that is in none of the three sets and has no `NEVER_SET` row with a reason** — which
   is the check that finds the next `defeated_algorithm`-shaped typo before a player does.

### 4.6 The simulator — `tools/story-sim.mjs`, joins `npm run check`

State = a flag set. The core is a monotone forward closure: repeat { apply DERIVE to
fixpoint; collect every grant whose precondition holds in the current set; add them }
until nothing changes. Latches make this terminate; the 5 live flags are handled by
evaluating both polarities when a precondition depends on one.

**Check A — act completability.** Every `ACTS[].when` flag is in the closure from a
fresh save. *This is tonight's bug, and it is what turns red.*

**Check B — flag reachability.** Every flag read by any dialog `condition`, room NPC
`condition`, furniture `condition`, gate, route, derive rule or objective string is in
the closure, or in `CODE_GRANTS`, or has a `NEVER_SET` waiver with a reason.

**Check C — scene reachability.** Every scene id in the compiled corpus is the `then` of
some route, the `scene` of some trigger, an NPC `dialogId`, an interactable `dialogId`,
an encounter `pre/postDialogId`, or reachable through the generic act ladder — **or
carries a `dead: '<reason>'` row.** *This is what finds the 6 orphans (§1.2c).*

**Check D — gate closability.** Every `GATES[].requires` flag is in the closure, and
reached **before** the first trigger or route that needs the room behind it.

**Check E — no spend-before-grant.** For every trigger, either `once: 'scene'`, or
`once: 'always'`, or a `waiver`. Report every waiver by name in the run summary so the
count only ever goes down.

**Check F — the expiry check (ordering, not just closure).** Closure proves a flag is
*obtainable*; it does not prove it is obtainable *in time*. For every grant G whose
precondition contains a negative term `¬f` where `f` is in the closure, assert that a
topological order exists placing G before `f`. This is the check that would have caught
"four ally missions expired at `act6_complete`, costing a beelining player four missions,
four ability unlocks and 750 XP" (the bug the comment at `ExplorationState.js:2870-2874`
records).

**Check G — route shadowing.** For every rule in `DIALOG_ROUTES` (§5), assert there
exists a satisfying assignment of the flags it reads under which no earlier rule fires.
A rule with no such assignment is dead and is reported by id. *This is the check for the
class CLAUDE.md records twice — "an unanswered riddle shadowed `janitor_act4`" and
"reading a server rack shadowed the Act-2 partition reveal".*

**Output contract.** Human-readable, one line per finding, `file:line` where known;
exit 1 on any failure; a `--report` flag writing a machine-readable JSON for CI. And a
**self-test**: `--selftest` mutates the graph in seven known ways (one per check) and
asserts each check goes red. A gate that has never been seen to fail is not a gate.

### 4.7 The seed of C2's precedent engine

The one design choice that makes this extensible without redesign:
**the derive engine turns any expression into a boolean flag, and the renderer's
condition node only ever needs truthiness** (`DialogState.js:300-308`).

So everything C2 wants is a derive rule, not a new node type:

- **Precedents** are flags with non-boolean values. The corpus already ships three
  (`alex_server_secret[13,17,20]` write `server_secret_choice = "report" | "investigate"
  | "ignore"`) and `Player` stores arbitrary values. A scene that branches on a precedent
  writes `if precedent_hendricks is "settled" -> …`; the compiler emits a synthetic
  derive rule `precedent_hendricks__is_settled` and a plain truthiness condition node.
  **Zero renderer change, zero save-format change.**
- **Litigate / settle / walk** is a choice node with three arms, each `sets
  precedent_<case> = "litigate"|"settle"|"walk"`. The graph gains a `PRECEDENTS` block
  listing case id, the three verdicts and what each grants — which makes the season's
  reveal ("the precedents were the point") a *checkable* structure: the simulator can
  prove the finale's binding lattice is reachable from at least one verdict combination
  and report which.
- **Morality bands** are `['count','>=',N,'breaches']` derive rules over a numeric flag.
  The SEASON_SHEET's "no visible meter" holds because nothing renders the number; the
  band flags drive diegetic routing rows (Meredith's memos turning approving) exactly
  like any other route predicate.
- **Loyalty cases** are the `act6_ready` shape already in the graph
  (`ExplorationState.js:3512-3524`): a latch over N ally flags that changes texture and
  outcome tiers rather than gating.
- **Dual POV** is one optional field on a scene (`pov: 'rachel'`) and one predicate
  (`['pov','rachel']`) in the routing table. The simulator runs once per POV.

---

## 5. DELIVERABLE 4 — THE ROUTING TABLE

### 5.1 Shape

`src/data/story/routes.js`. An ordered array; **array order is priority**, which makes
priority greppable and diffable — today it is 413 lines of nesting where the priority of
a rule is "how far down the function it happens to be".

```js
export const DIALOG_ROUTES = [
  {
    id: 'karen-retry-not-ready',
    npc: 'karen',
    when: ['all', ['pred','retryLive'], ['not','karen_retry_ready']],
    then: 'karen_not_ready',
    why: 'Karen retry is blocked until 3 tutorial clients are handled.',
    src: 'ExplorationState.js:2616-2618',
  },
  …
  { id: 'act-ladder', then: ['ladder'], why: 'The generic act/intro/return resolver.' },
];
```

Fields: `id` (unique, used by the shadow check and by diagnostics), `npc`/`room`
(cheap pre-filters), `when` (the §4.2 expression language), `then` (a scene id, or
`['npcDialogId']`, or `['ladder']`), `why` (one sentence, mandatory — the current
function's value is 60% comments and none of them are machine-attached), `src` (the
line it was extracted from, kept for one release).

The evaluator is ~40 lines: pre-filter, evaluate `when`, first match wins, and — kept
verbatim from today — the result still passes through `_getValidNpcDialogId`
(`ExplorationState.js:2570-2578`) so an out-of-band dialog still degrades to
`neutral_<npc>`. `then: ['ladder']` is the single algorithmic exception: the 13-line
suffix ladder at `:2994-3016` is genuinely a loop over `act7→act2 / intro / return`, and
turning it into 40 table rows would be worse than leaving it as one named resolver.

### 5.2 The two documented exemptions, as rows

**Skip's spent set-piece** (`ExplorationState.js:2705-2710`). Placed *above* the
hardcoded-`dialogId` row, which is the whole point:

```js
{ id: 'skip-board-meeting-spent',
  npc: 'skip',
  when: ['all', ['room','board_room'], 'board_meeting_held'],
  then: 'board_meeting_after',
  why: 'A spent set-piece is not a repeatable prompt. Skip stays in the room after the '
     + 'meeting (board_meeting_closed is deferred until the player walks out), so the E '
     + 'prompt was wired back into the 177-node scene INCLUDING its give_xp 300 on node '
     + '176 — farmable once per press. board_meeting_after pays nothing and sets nothing.',
  src: 'ExplorationState.js:2705-2710' },
```

**The hardcoded-`dialogId` rule with its Alex carve-out** (`:2722-2725`):

```js
{ id: 'npc-hardcoded-dialogid',
  when: ['all', ['pred','npcHasDialogId'],
         ['not', ['all', ['npc','alex_it'], ['npcDialogId','alex_server_secret'],
                  ['pred','alexStoryBeat']]]],
  then: ['npcDialogId'],
  why: 'A story beat outranks flavour. Reading a server rack set server_secret_started, '
     + 'which pinned Alex to alex_server_secret and shadowed the Act-2 partition reveal '
     + 'the objective was sending the player to get. Only that one id is exempted, and '
     + 'only while a beat is actually on offer.',
  src: 'ExplorationState.js:2712-2725' },
```

**Tonight's Meredith ceiling** (`:2732-2743`) — and note what the extraction buys:
the two negatives collapse into the derived flag `meredith_era_over` that
`_refreshStoryProgress` already computes (`:3543-3546`), so the row is one term instead
of two and cannot drift from the NPC condition that reads the same flag:

```js
{ id: 'meredith-first-meeting',
  npc: 'meredith',
  when: ['all', ['not','meredith_era_over'], ['not','meredith_left'], ['not','met_meredith']],
  then: 'meredith_intro',
  why: 'She paces the executive floor in Acts 3-4. Ceilinged so the board-room boss era '
     + 'can never serve the stale Henderson-era intro — a straddling save reached act 5+ '
     + 'with act4_complete unset and the intro fired at night.',
  src: 'ExplorationState.js:2727-2743' },
```

### 5.3 Extraction proof (Phase 7)

A differential harness, `tools/_dr-route-diff.mjs`:
1. Enumerate every NPC id that appears in any room (`ROOMS`), crossed with every room.
2. For each of the **8 DevPanel states** (7 act presets + the synthetic post-game state
   `tools/_ux-dev.mjs` already builds) evaluate old `_getDialogId` and the new evaluator
   and assert equality.
3. Then fuzz: 20,000 random flag assignments over the ~148 flags any route reads,
   same assertion. Any mismatch prints the flag set, the NPC, both answers and the
   rule id that fired.
4. Ship with `?routes=legacy` for one release so a live disagreement can be A/B'd.

---

## 6. DELIVERABLE 5 — MIGRATION PLAN, SEQUENCED FOR CODEX

Sizes: **S** ≤ 1 day / ≤ 300 lines changed; **M** ≤ 3 days / ≤ 1,200 lines;
**L** > that. Every phase ends green on `npm run check` and is a single commit.
**◆ = coordinator review checkpoint before the next phase starts.**

| # | Phase | Size | Deliverable | Proof gate | Rollback |
|---|---|---|---|---|---|
| **P0** | Baseline & harness | S | `tools/dlg/baseline.json` (a frozen deep snapshot of `DIALOGS`), `tools/_dr-semantic-equal.mjs` | snapshot deep-equals live `DIALOGS`; `_g-stage-verify` PASS; `npm run check` PASS | delete two files |
| **P1** | Normalisation pre-pass | S | 550 node edits in `dialogs/index.js` per the §3.2 ledger (513 field deletions, 35 renames, 1 value add, 1 type fix) | `_g-stage-verify` PASS (blind to rows 1–3 by construction); `_dr-semantic-equal` PASS on rows 4–5; row 6 signed by the producer; `npm run check` PASS | `git revert` — one commit, one file |
| ◆ | **Checkpoint 1** | | Coordinator reviews the ledger and the one behaviour change (`poster_cf_5`) | | |
| **P2** | Parser, printer, lock format | M | `tools/dlg/{lex,parse,print,lock}.mjs`, grammar card | `parse(print(parse(x))) === parse(x)` over a 40-fixture set; T3 diagnostics table (≥25 cases) green | nothing shipped yet — pure additions |
| **P3** | Converter + byte-identity | M | ~16 `.dlg` files, `dialogs.lock.json`, `tools/dlg/compile.mjs`, regenerated `index.js` | **`deepEqual(compile(convert(baseline)), baseline)` for all 291 trees** and `git diff --exit-code src/data/dialogs/index.js` clean; comment-line count in == out; `_g-stage-verify` PASS; `npm run check` PASS | `git revert`; `index.js` is unchanged by definition, so the game cannot break |
| ◆ | **Checkpoint 2 — THE ONE THAT MATTERS** | | Coordinator reads a sample of the converted `.dlg` output and signs the byte-identity report | | |
| **P4** | Build cutover | S | `npm run dialogs:build`/`:check` wired into `check`; Vite dev plugin; DO-NOT-EDIT banner | `dialogs:check` red when `index.js` is hand-edited; `tools/_ux-dev.mjs` reports 0 duplicate NPCs on all 8 presets; a manual playtest of one act | drop the plugin, keep editing `index.js` |
| **P5** | Story graph extraction | M | `src/data/story/{graph,predicates}.js`; `ExplorationState` derived block + act ladder replaced by a generic evaluator | **A/B harness**: for all 8 presets × 200 fuzz states, the graph's derived flag set and `actIndex` are identical to the current code's; `npm run check` PASS | keep the old block behind `window.__graphOff` for one release |
| ◆ | **Checkpoint 3** | | Coordinator reviews the 16 derive rules against the current comments — several of those comments are the only record of why a rule exists and must survive as `note` | | |
| **P6** | The simulator | M | `tools/story-sim.mjs` with checks A–G + `--selftest`; joins `npm run check` | `--selftest` shows all seven checks going red on injected defects; the real run is green **except** the findings it is supposed to find (6 dead scenes, 7 latch waivers) — each triaged into a `dead:`/`waiver:` row or a fix | remove from `check`; it is a tool, not a runtime |
| ◆ | **Checkpoint 4** | | Coordinator triages the simulator's first real report — this is where the 6 orphaned scenes get a ruling (route them or mark them dead) | | |
| **P7** | Routing table | M | `src/data/story/routes.js` (~45 rows) + a 40-line evaluator; `_getDialogId` reduced to a call | `_dr-route-diff` equality over 8 presets × all NPCs × all rooms, plus 20,000 fuzz states, **zero mismatches**; `?routes=legacy` A/B available | flip `?routes=legacy` to the default |
| **P8** | One-shot latch repair | S | 7 triggers moved from `once:'flag:*'` to `once:'scene'`; `UNFINISHED_SCENE_LATCHES` kept as a legacy-save reconciler only | simulator check E: waiver count 7 → 0; a scripted interrupt test (kill the page inside the 800 ms window, reload, assert the scene re-serves) | revert the trigger rows; the reconciler still covers it |
| **P9** | Freeze | S | CLAUDE.md dialog section rewritten; `tools/_dr-*.mjs` deleted; grammar card committed next to the `.dlg` files | `npm run check` PASS; CLAUDE.md claims re-derived from the tools, not from memory | n/a |

**What stays frozen throughout:** `DialogState.js`, `DialogBox.js`, the save format,
`SaveManager`'s export envelope, every scene **id** (they are keys in
`KNOWLEDGE_GATE_DIALOGS`, `EVERGREEN_HUB_DIALOGS`, `QUEST_CRITICAL_DIALOGS`, room NPC
`dialogId`s, encounter `pre/postDialogId`s and every `read_<id>` flag already in player
saves), and the C1 prose (the converter is mechanical; **no line of dialogue is
rewritten by this refactor**).

**Ordering rationale.** P1 before P2 because a canonical corpus is what makes the
grammar small. P3 before P4 because the artifact must be proved identical *before* it
becomes the thing that is shipped. P5 before P6 because the simulator needs a graph to
walk. P7 after P6 because check G is what proves the extracted table has no dead rows.
P8 last because it is the only phase that deliberately changes behaviour, and it should
land on top of a simulator that can prove it worked.

---

## 7. DELIVERABLE 6 — RISK LIST, HONEST

### 7.1 Where byte-identity is impossible — exactly one place

`src/data/dialogs/index.js:1317`, `poster_cf_5` node 2:
`{ type: 'Andrew', speaker: 'Andrew', text: "I'm going to disrupt my way right out of
this building." }`. The DSL has no way to spell a node type that does not exist, and
teaching the compiler to emit malformed nodes to preserve a bug is the wrong trade.
Fixing it makes a line of dialogue render that has never rendered in the shipping game
— a one-line, one-poster, zero-flag, zero-reward change. **Producer ruling required at
Checkpoint 1.** If the ruling is "preserve", the fallback is a `raw` escape hatch in the
lock file listing that single node; it must not become a general mechanism.

Everything else in the ledger (§3.2) is provably a no-op under `DialogState`'s own
accessors.

### 7.2 Load-bearing quirks that must survive untouched

| Quirk | Location | Why it is load-bearing |
|---|---|---|
| Space is blocked while choices are visible | `DialogState.js:481-484` | Prevents a held space bar from answering a question the player never read |
| `CHOICE_ARM_MS = 260` | `DialogBox.js:16`, `:406` | The click that skips the typewriter paints buttons under a stationary pointer; the second half of a double-click used to commit an unread choice. **Any harness clicking a choice must wait it out** — a click inside the window is *dropped*, not queued |
| `read_<dialogId>` written only if `shownAnyNode` | `DialogState.js:466-473` | The whole one-shot design in §4.4 rests on this. An empty tree must not bank "this happened" |
| Escape skips the typewriter but never aborts | `DialogState.js:502-506` | Aborting mid-tree skipped `set_flag`/`start_combat` while still marking read — permanently stranding story flags |
| Knowledge-gate presentation | `DialogState.js:22-35`, `:233`, `:271` | Persisted choice-greying plus cursor-parking is an answer key; the quiz trees opt out of both. Presentation only — no gate, flag or retry path |
| Evergreen-hub reset | `DialogState.js:37-50`, `:246-255` | A fully-greyed hub reads as CLOSED; memory resets when every non-exit topic is spent |
| The dialog-level quest gate applies to **every node** | `DialogState.js:311-321`, `dialogGating.js:79-100` | An out-of-band dialog does not fail loudly — it evaporates node by node and ends having shown nothing. Load-bearing *and* dangerous; the simulator's check B is the first thing that will ever see it. (Verified: none of the 23 direct pushes in `ExplorationState` targets a gated id, so today only the NPC path can hit it, and that path degrades to `neutral_<npc>` at `:2570-2578`.) |
| Stage-node `claimed` ack | `DialogState.js:457-460` | With no listener the node is a no-op, not a hang — this is what lets fixtures push dialogs with no world under them |
| `_chose_` key is index-derived | `DialogState.js:238`, `:273` | The lock file (§3.3) exists for this and only this |

### 7.3 Other risks, with mitigations

- **Lock-file merge conflicts.** Two authors adding scenes touch different objects; the
  compiler fails on duplicate indices within a scene, so a bad merge cannot compile.
  Residual: a resolved-wrong merge shifts `_chose_` keys for one scene, which is cosmetic.
- **The converter drops a comment.** The corpus's `//` blocks are the only record of why
  half the tricky routing exists. Mitigation: the converter asserts comment-line count
  in == out, and Checkpoint 2 includes a human read.
- **The routing fuzz misses a state the real game reaches.** Mitigation: the 8 DevPanel
  presets are exact reachable states, the fuzz is on top, and `?routes=legacy` ships for
  one release.
- **The simulator's optimistic closure declares something reachable that a real
  playthrough cannot reach.** This is the honest limit of monotone closure. Check F (the
  expiry check) covers the negative-precondition case, which is the one that has actually
  bitten. It does not cover resource ordering (AUM, level gates); those stay out of scope
  and are named here so nobody believes the gate is stronger than it is.
- **Scope creep into prose.** Explicitly forbidden: the converter is mechanical and
  rewrites no line of dialogue. Any prose change is a separate commit with its own review.

### 7.4 What C2 needs that this design deliberately defers

- **Cross-examination mode** — parked by the producer; would want a new node type and
  therefore a renderer change. Not designed for.
- **A case board UI** — the SEASON_SHEET's one optional new engine state. The graph can
  feed it (PRECEDENTS is already the right shape) but no UI is specified here.
- **Numeric-flag arithmetic in dialogs** — `breaches` increments would want an
  `add breaches 1` action, which is a **new action verb and therefore a renderer
  change** (`DialogState._processAction`, `:326-397`). Deferred deliberately: C1 needs
  none of it, and the moment C2 needs it the change is nine lines in one switch plus one
  row in the compile map. Until then a breach is a plain `set breach_<case>` flag and the
  count is a derive rule over the set.
- **Dual-POV save partitioning** — the graph gains a `pov` field, but whether Rachel's
  chapters share Andrew's flag namespace is a save-format question and the F-8 carry
  contract's rule 3 says no save-format change. Flagged for the C2 kickoff, not solved here.
- **Localisation.** The `.dlg` format puts prose in the last field of a line, which is
  extractable, but no string-id scheme is designed. If C2 ever wants it, the compiler
  gains an id column; it does not want a different format.

---

## 8. SUMMARY OF THE PROOF OBLIGATIONS

Everything above reduces to eight assertions a build can make. In dependency order:

1. `parse(print(parse(x))) === parse(x)` — the format round-trips.
2. `deepEqual(compile(convert(baseline)), baseline)` for all 291 trees — the compiler is
   faithful.
3. `git diff --exit-code src/data/dialogs/index.js` — the shipped artifact is the
   compiled one.
4. `dialogs.lock.json` diff shows additions only — no pre-existing node moved.
5. The graph's derived flags and `actIndex` equal the current code's on 8 presets ×
   200 fuzz states — the extraction is behaviour-preserving.
6. `story-sim` checks A–G green, with every exception a named row carrying a reason.
7. `story-sim --selftest` shows all seven checks going red on injected defects.
8. `_dr-route-diff`: zero mismatches over 8 presets × every NPC × every room + 20,000
   fuzz states — the routing table is the function.

Tonight's failure is assertion 6, check A. After this refactor it is not a bug that can
be found by playing; it is a build that does not go green.
