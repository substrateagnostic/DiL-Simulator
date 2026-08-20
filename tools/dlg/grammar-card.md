# `.dlg` authoring card

A file is UTF-8 with LF endings, no BOM, and spaces for indentation. Blank lines do
nothing. A comment starts when `#` is the first non-space character. Labels name the
next statement and never consume an index. Ids contain only letters, digits, and `_`.
Speaker names begin with a capital letter.

The only three prose forms split at their **first colon**; everything after it is
verbatim (quotes, apostrophes, colons, `#`, `*`, and dashes need no escaping):

```text
Speaker mood=angry: prose
ask Speaker: prompt
  -> label modifiers: answer text
```

The mood is optional, and a prompt may omit its speaker as `ask: prompt`.

Start each scene with `scene id`. Before its first statement it may repeat `mode quiz`
and/or `mode evergreen-hub`. Put `@label` on its own line before a statement. `goto
label` immediately after a text, action, stage, or ask sets that statement's explicit
`next`; without it, control falls through. Every choice arm always names its target.

The 13 lowercase directives are `ask if goto end set fight give xp stat heal quest
recruit teach`. Structural words are `scene`, `mode`, and `stage`.

```text
if flag
if flag -> true_label
if flag else -> false_label
if flag -> true_label else -> false_label

# With no `=`, set writes true.
set flag
set flag = true|false|2|"text"
fight encounter_id
# The first give has no quantity field; `x 2` is also accepted for the second.
give item_id
give item_id x2
xp 100
# Stat also accepts bare and negative integers.
stat maxMP +5
heal
quest quest_id stage 1
quest quest_id objective 2
quest quest_id objective 2 status done
recruit ally_id
teach ally_id ability_id
end
```

Arm modifiers are order-insensitive: `sets f` writes `flag` only; `sets f=true` also
writes `flagValue`; `requires f` and `unless f` gate visibility. Use spaces around `=`
if desired. An arm can combine modifiers.

`check trait_x` makes a **working-style check arm**: one arm, one `_chose_` save key,
two renderings. A holder of the trait flag reads the arm's own prose (prefixed
`[WORKING STYLE — …]` by DialogState) and takes its target; everyone else reads the
fail prose (prefixed `[WORKING STYLE CHECK — FAILED]`, still selectable) and takes the
fail label. The fail variant is the line **directly below** the arm — required, exactly
one, no modifiers:

```text
  ask The Janitor: Which one first?
    -> brew_pass check trait_percolator: Let me at that machine.
    fail -> brew_fail: I can also make coffee. Legally speaking.
```

`check` only accepts a `trait_*` flag from `src/data/traits.js`, may combine with
`requires`/`unless` (they gate the whole arm for everyone), and may NOT combine with
`sets` — an arm-level set would fire on both variants; write pass-only flags as `set`
nodes in the pass branch.

A scheduled `stage` or `stage concurrent` owns lines indented more deeply. A beat is
`[@beatLabel] actor verb [arg] ...`; one beat may contain many verbs. Coordinates are
`x,y`. `after beatLabel` resolves within that stage. Verbs are:

```text
walkTo mark|x,y     face mark|actor       exit mark|x,y
spawnAt mark|x,y    teleportTo mark       gesture id
pose id             expression id         speed number
hold number         sit   stand   spawn   show   nowait
after beatLabel
```

`sit`, `stand`, `spawn`, and `show` mean `true`; `nowait` means `wait:false`. `exit`
always needs an argument.

Five complete shapes:

```text
scene prose_run
  Narrator: The elevator opens: slowly—and nobody speaks.
  Andrew mood=worried: That's probably fine.
  end

scene hub
  mode evergreen-hub
  @hub
  ask Janet: What next?
    -> story requires met_janet: Tell me a story.
    -> done sets left_hub: Leave.
  @story
  Janet: Once there was a patient auditor.
  goto hub
  @done
  end

scene condition_gate
  mode quiz
  if attempted -> question
  set attempted
  Narrator: First attempt.
  @question
  ask: Answer?
    -> right: Yes.
    -> wrong: No.
  @right
  set solved
  goto out
  @wrong
  Narrator: Try later.
  @out
  end

scene staged
  stage concurrent
    @arrive regional spawnAt 8.4,13.4 walkTo desk stand speed 1.2
    player face regional nowait
    regional exit elevator after arrive
  end

scene reward_paying
  Andrew: The audit is complete.
  xp 100
  give trust_badge x1
  stat maxMP +5
  quest audit stage 2
  teach janet binder_slam
  set audit_paid = true
  end
```
