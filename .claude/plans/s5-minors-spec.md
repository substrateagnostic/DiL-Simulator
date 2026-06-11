# Spec: apply the 17 MINOR logic findings (s5-logic-report.md #13–#29)

**Sequencing constraint:** these touch the SAME files as the P6+P8 majors agent
(rooms/index.js, dialogs/index.js, ExplorationState.js). Do NOT start until that agent's
work is committed (check `git log` for "S5-P8"/"S5-P6" commits). Re-verify each finding
against current code first — the majors agent may have fixed or moved things.

**Source of truth:** `.claude/plans/s5-logic-report.md` MINOR rows #13–#29. Apply each
report-proposed fix unless the code has changed; where the report offers a choice, prefer
the smallest gate/condition addition over restructuring.

**Judgment calls decided in advance:**
- #29 (Gerald/Harold): keep Ross wrong, add the gag — Andrew replies with a one-word
  correction ("…Harold.") that Ross ignores. Loman never hears corrections. Insert a single
  text node only if the indices allow appending without renumbering (otherwise just rename
  to Harold).
- #21 (hr_rep replay): point the room entry at the existing return-line nodes per the report;
  do not write a new dialog.
- #24 (grandma_return): write a 2-3 node return dialog in Christie-with-malice voice
  (WRITING.md) — she's polite, it's terrifying, no reward.
- Riddle/hint gates (#25 etc.): gate on the precise unlock flag named in the report.

**Hard rules:** node indices/types/actions frozen except where the report explicitly says
to retarget next/ifTrue/ifFalse or delete a node (then renumber comments, verify every jump
in that dialog). Multi-entry NPC conditions: one flag + one notFlag per condition object
(CLAUDE.md) — derive a synthetic flag in _refreshStoryProgress if a fix needs more.

**Verify per cluster:** `npm run check > c.log 2>&1; echo $?` must print 0 (never pipe to
tail). For room/NPC changes: `npm run shoot -- --only=room-<id>` and look at the PNG.
Commit in clusters, messages "S5-P8m: ..." + Co-Authored-By: Claude Fable 5
<noreply@anthropic.com>. Do NOT push.
