# PROSE BRIEF — Janet's Quiz (personality traits pilot), TRUST ISSUES

You are drafting dialog for TRUST ISSUES: A Trust Officer Simulator — a satirical
office JRPG. Andrew, a new trust officer at Vaults Fargo Branch No. 1, starts day
one. Janet — a colleague who has watched this floor for fifteen years — has set
the browser homepage on his work PC to an unskippable "working style" personality
quiz. It looks like a corporate instrument. It is not. The questions are too
specific to this exact office to have come from a vendor. The quiz decides which
of three WORKING STYLES Andrew has, and the game remembers it forever.

Your output is wired VERBATIM into the game. Follow the output format exactly.
Write nothing outside the numbered blocks.

## Voice anchors (from WRITING.md — binding)

- **Andrew** — Arthur Dent. Bewildered decency. Asks the obvious question nobody
  else will. Understates catastrophe ("This is probably fine"). Never quips on
  purpose; lands jokes by accident. Under stress he gets POLITER.
- **Janet** — Dorothy Parker. Exhausted wit, surgically dry. One-liners that sound
  like obituaries for her own patience. Never explains the joke. The wine tumbler
  is never explained either. Under stress she gets DRIER.
- **Narrator** — Douglas Adams / dry field guide. Treats absurdity as documented
  fact. Precise numbers ("the third-worst carpet in the building"). Never
  editorializes with adjectives when a measurement will do.
- **Skip Hartley** — Willy Loman in a golf polo. Desperate optimism as
  load-bearing structure. Quotes management books that don't exist. Sincerity
  leaks through exactly when it hurts most.
- **Diane** — August Wilson character. Seen-everything dignity. Complete,
  unhurried sentences. Institutional memory like a ledger. Kindness with a paper
  trail.
- **The Intern** — early Charlie Brown. Catastrophizing politeness. Apologizes to
  furniture. Gets Andrew's name wrong every time (Austin, Arnold, Adam so far —
  always a plausible A-name, never the right one).
- **Alex from IT** — Dirk Gently as a holistic IT detective. Believes in the
  fundamental interconnectedness of all systems. Serene, certain, already three
  tickets ahead. Never defensive. "I didn't *guess* the badge server was lying. I
  simply refused to assume it was telling the truth."
- **Karen Henderson** — Flannery O'Connor grotesque. Entitlement as a moral
  system. Specificity of grievance ("I have been a member since *March*").
- **Chad Henderson** — Bret Easton Ellis lite. Brand names as personality. Only
  character allowed to say "literally." Says "bro" constantly.
- **Grandma Henderson** — Agatha Christie with malice. Sweetness deployed
  tactically. She always knows more than the scene admits.
- **The quiz itself (speaker string "Homepage")** — this is JANET'S authorial
  voice laundered through corporate-assessment boilerplate. Deadpan intake-form
  cadence, en-dash precision, the occasional detail no vendor could know (the
  break-room fridge, the specific printer, the third-floor incident). The quiz
  never jokes. That is what makes it funny.

## Anti-LLM-speak rules (binding)

1. NO TRIADS. LLMs write in threes ("calm, clear, and direct"). Two or four, or one.
2. Ban list: "Here's the thing", "Let's dive in", "I appreciate you", "at the end
   of the day", "honestly?" as an opener, "It's not X, it's Y" more than once
   total, any character naming their own emotion.
3. Subtext stays sub. Characters say what they'd say, not what they mean.
4. Specificity is the joke engine. Years, counts, form numbers, tray numbers,
   brand names. "Lemon. I remember because I bought it."
5. Read it aloud against the anchor. If Dorothy Parker wouldn't sign it, it is
   not a Janet line.
6. Em dashes are fine; write them as " -- " or "—" (either survives).
7. One line = one line. Do not split a numbered slot into multiple lines unless
   the slot says it holds several.

## The three working styles (FIXED — do not rename in the copy)

| id | name | essence | (hidden mechanical bias, for your flavor only) |
|---|---|---|---|
| advance_reader | **The Advance Reader** | Over-prepared. Read the syllabus nobody else knew existed. Walks in already briefed. | starts fights with Confidence |
| shock_absorber | **The Shock Absorber** | Unflappable under impact. The office lands on this person and the person does not move. | steadier under pressure (wider timing windows) |
| percolator | **The Percolator** | Slow, steady accumulation. Does not surge; builds. Runs on process and actual coffee. | resources drip in over time |

The mapping between quiz answers and styles must be LEGIBLE IN RETROSPECT but
not gameable on sight — a player who knows their result should be able to look
back and see it, but a first-time player must not be able to see the scoring.

## OUTPUT FORMAT

Produce numbered blocks exactly as below. Each `>` slot is one line of prose
(dialog text only — no quotes around it, no speaker prefix unless the slot asks
for one). Keep every line under ~200 characters.

---

### BLOCK A — the quiz scene

Scene shape (already engineered; you fill the prose):
Andrew sits at his new desk. The PC wakes. The browser homepage is the quiz.
The tab cannot be closed. 3-4 questions on any path, then a result page.

**A1 — opening narration (Narrator, 2 lines).** The PC wakes; the homepage is a
working-style inventory with a corporate-sounding instrument name you invent
(the name should sound like a vendor product, e.g. an "™" energy, but funnier
and specific); closing the tab does not work — document that fact the way a
field guide would.
> A1A: (Narrator)
> A1B: (Narrator)

**A2 — Andrew's reaction (1 line).** Arthur Dent tries the X button politely.
> A2:

**A3 — Q1, the coffee question (Homepage).** Question prompt + 3 answers.
Answer mapping (hold exactly): (a) = Advance Reader — brought his own,
prepared before arriving; (b) = Shock Absorber — drinks whatever is already
there, regardless of age or provenance; (c) = Percolator — makes a fresh pot
properly and waits for the whole brew.
> A3Q: (the question)
> A3a:
> A3b:
> A3c:

**A4 — Q2, the printer jam question (Homepage).** The printer (a Xerox
WorkCentre 7845i, display reads PC LOAD LETTER — it is haunted, but the quiz
would not know that... or would it) jams while you are behind three colleagues.
Question + 3 answers. Mapping: (a) = Advance Reader — already knows the jam is
in tray 3, read the manual once in 2019; (b) = Shock Absorber — clears it
calmly, absorbs the queue's mood; (c) = Percolator — fixes it slowly and
properly so it never jams again, however long that takes.
> A4Q:
> A4a:
> A4b:
> A4c:

**A5 — tiebreak questions (Homepage).** Three two-answer questions, each played
only when the first two answers disagreed. Each must split exactly its pair:
- A5-1 splits Advance Reader (a: prepares again) vs Shock Absorber (b: takes it
  as it comes): a meeting is moved up an hour.
- A5-2 splits Advance Reader (a: outlines everything on Monday) vs Percolator
  (b: steady pages every day): a large report is due Friday.
- A5-3 splits Shock Absorber (a: unbothered in the moment) vs Percolator
  (b: patient accumulation wins eventually): the fire alarm goes off during lunch.
> A5-1Q:
> A5-1a:
> A5-1b:
> A5-2Q:
> A5-2a:
> A5-2b:
> A5-3Q:
> A5-3a:
> A5-3b:

**A6 — Q-last, the unscored question (Homepage).** One absurd question with 3
answers that obviously cannot matter (and mechanically do not). Janet's dry
hand shows here more than anywhere. All three answers route to the same place.
> A6Q:
> A6a:
> A6b:
> A6c:

**A7 — the calculating beat (Narrator, 1 line).** The quiz computes. A progress
bar behaves the way office progress bars behave.
> A7:

**A8 — result pages.** One per style: the result line as the quiz would print
it (Homepage; must contain the style name in caps), then ONE self-description
sentence (Homepage — this is the style's one-line definition, deadpan,
faintly insulting the way accurate assessments are), then Andrew's one-line
reaction (Arthur Dent; different per result).
> A8-AR-1: (Homepage, contains THE ADVANCE READER)
> A8-AR-2: (Homepage, the one-line self-description)
> A8-AR-3: (Andrew)
> A8-SA-1: (Homepage, contains THE SHOCK ABSORBER)
> A8-SA-2: (Homepage)
> A8-SA-3: (Andrew)
> A8-PC-1: (Homepage, contains THE PERCOLATOR)
> A8-PC-2: (Homepage)
> A8-PC-3: (Andrew)

**A9 — shared outro (2 lines).** Narrator: the quiz emails the results to an
undisclosed recipient list and the browser finally releases the tab; the
homepage reverts to something worse or stranger. Keep the author unnamed — the
player must not be told it was Janet here.
> A9A: (Narrator)
> A9B: (Narrator)

---

### BLOCK B — trait-conditional line variants in existing scenes

For each site: the surrounding lines are QUOTED for context and will not
change. You write the variant lines. "ADD-BEFORE" means your line plays and
then the original line still plays. "REPLACE" means your line plays INSTEAD of
the original — it must do the original's narrative job (noted each time).

**B1 — janet_intro, ADD-BEFORE.** Janet's deadpan acknowledgment of the quiz —
the one line in the game that implies she set the homepage, without ever
saying so. It must reference the player's specific result name. Context:
  Janet: I'm Janet. I handle the... *sip* ...smaller accounts. The ones where nobody's fighting. So, like, three of them.
  [YOUR LINE HERE]
  Janet: Welcome to the sixth floor. We call it 'The Trust Fall.' Nobody catches you.
> B1-AR: (Janet)
> B1-SA: (Janet)
> B1-PC: (Janet)

**B2 — skip_intro, ADD-BEFORE.** Skip has read the emailed results and
processes Andrew's style through a management book that does not exist.
Context:
  Skip Hartley: Andrew! My man! Come in, come in. Close the door. Actually, leave it open. Actually, close it halfway. Power move.
  [YOUR LINE HERE]
  Skip Hartley: So. The Henderson Trust. This is the big one, buddy. This is our Super Bowl. Our moon landing. Our... what's that thing where they do the thing?
> B2-AR: (Skip Hartley)
> B2-SA: (Skip Hartley)
> B2-PC: (Skip Hartley)

**B3 — diane_intro, REPLACE.** Diane's goodbye. The original is:
  "Well, good luck. And seriously -- my desk, bottom drawer, antacids. Anytime you need them."
Your replacement must still offer the antacids in her bottom drawer (the game
hands one over on the next line) and must fold in one seen-everything
observation about Andrew's style — she has watched three predecessors fail
with theirs. Context after your line:
  Diane: Here, take one now. Consider it a welcome gift.
> B3-AR: (Diane)
> B3-SA: (Diane)
> B3-PC: (Diane)

**B4 — intern_intro, REPLACE.** The Intern's goodbye. Original: "Good luck,
Adam!" Your replacement must still get Andrew's first name wrong (a plausible
A-name that is not Andrew and not one he has already used: Austin, Arnold,
Adam are used) and may garble the style name too. It must stay ONE short line,
because the next two lines are:
  Andrew: Andrew.
  The Intern: That's what I said!
> B4-AR: (The Intern)
> B4-SA: (The Intern)
> B4-PC: (The Intern)

**B5 — alex_it_intro, ADD-BEFORE.** Alex already knows the result — not
because he read the email, but because the network told him something truer.
Dirk Gently serenity; one line. Context:
  Alex from IT: Andrew, right? I knew at 8:52 -- the badge server and I keep each other informed. Welcome to Vaults Fargo.
  [YOUR LINE HERE]
  Alex from IT: I'm Alex. IT department. Well, I AM the IT department. Had a team once. They all 'transferred.' That's corporate for 'fled.'
> B5-AR: (Alex from IT)
> B5-SA: (Alex from IT)
> B5-PC: (Alex from IT)

**B6 — karen_meeting, REPLACE.** Andrew's reply to Karen. Context:
  Karen Henderson: I know what you are. You're the fourth one. The last one cried. Will you cry? You look like you might cry.
  [YOUR LINE — original: "I'm... not going to cry."]
  Karen Henderson: Good. Because I have DOCUMENTATION. I have EMAILS. I have a BINDER.
Your replacement must still amount to "no, I will not cry," in the style's
key, politely. Karen's "Good." must still land.
> B6-AR: (Andrew)
> B6-SA: (Andrew)
> B6-PC: (Andrew)

**B7 — chad_meeting, REPLACE.** Andrew's opener, which Chad interrupts.
Original: "Mr. Henderson, thank you for meeting with me about the trust
dist--" Your replacement MUST end mid-word with "--" because the next line is:
  Chad Henderson: Call me Chad, bro. Mr. Henderson was my grandpa. Well, I guess that's why we're here. RIP to the GOAT.
> B7-AR: (Andrew)
> B7-SA: (Andrew)
> B7-PC: (Andrew)

**B8 — grandma_meeting, REPLACE.** Andrew's reaction to Grandma revealing the
page-47 clause that gives her everything. Original: "Mrs. Henderson, I... this
changes everything about the distribution plan." The next line is:
  Grandma Henderson: Oh sweetie. I know. That's the point.
Your replacement must keep the stunned register — her "I know" must still land
on it — but flavor HOW this particular Andrew is stunned.
> B8-AR: (Andrew)
> B8-SA: (Andrew)
> B8-PC: (Andrew)

**B9 — skip_post_karen, REPLACE.** Andrew reports the Karen meeting. Original:
"She threw a binder at me, Skip." The binder fact must survive — Skip's next
line is:
  Skip Hartley: And you SURVIVED. That's the narrative. You're a survivor. This is a brand moment, Andrew. We should get you a mug.
> B9-AR: (Andrew)
> B9-SA: (Andrew)
> B9-PC: (Andrew)

**B10 — janet_act2, REPLACE.** Janet's Act-2 opener. Original: "Oh God, you're
still here? I mean -- oh GOOD, you're still here." Your replacement keeps the
you're-still-here beat but reads it through the style she diagnosed on day one
— she has been keeping score. Next line: "*extremely long sip from tumbler*"
> B10-AR: (Janet)
> B10-SA: (Janet)
> B10-PC: (Janet)

**B11 — coffee_machine, REPLACE.** Narrator, the pour line in the break room.
Original: "You pour yourself a large coffee. It tastes like determination and
existential compromise." Replace per style — the Percolator one is allowed to
be quietly triumphant, since this machine is his people. The game gives the
player a large coffee immediately after the line.
> B11-AR: (Narrator)
> B11-SA: (Narrator)
> B11-PC: (Narrator)

---

### BLOCK C — epilogue card

One card in the post-game epilogue, shown only if a style exists. Title: THE
WORKING STYLE. One line per style, in the epilogue's register: dry, past-tense,
what-became-of-it. These sit beside lines like "Skip Hartley ironed his shirt
again the following Tuesday. He has not stopped." The line may close the quiz's
loop (the result taped to a monitor, the instrument's name surviving in
someone's files, Janet's unclaimed authorship) but must stand alone for a
player who took the quiz forty hours ago.
> C-AR:
> C-SA:
> C-PC:

---

Now write the blocks. Every slot filled, nothing else in the output.
