# The Working-Style Check — design seed (filed 2026-08-18, producer idea, cosigned direction pending scope)

Producer's sketch (verbatim intent): give traits a check mechanic — a few dialog options/trees
that unlock only on a "skill check" for your trait; everyone else sees a "skill check failed"
option that hints at the system for S2; maybe a unique reward or two for passing.

## Director's shape (discussed same night)

1. **No hidden numeric stat.** No +10 Charisma. The check keys directly on the `trait_*` flag —
   the trait IS the stat, per the packet's own law ("the trait is WHO ANDREW IS"). A number
   implies a growth system S1 doesn't have and S2 would owe.
2. **Failed checks are content, not walls.** Disco Elysium precedent: the fail option is
   SELECTABLE and funny — `[WORKING STYLE CHECK — FAILED]` prefix, deadpan fail line, scene
   continues. Office satire fail lines write themselves.
3. **S2 is the payoff, and it's structural.** Ocean's Eleven × Suits = a heist is a sequence of
   "who on the crew can do this" gates. S1's visible checks pre-teach the crew mechanic. The
   carry contract already carries all three `trait_*` flags in FLAGS_OF_RECORD, so C2 reads the
   working style off the transfer card for free. A passed check may carry as ONE additive
   whitelisted flag (carry rules: additive only, no renames).
4. **Rewards are data-only.** `cosmetics.js` unlock accepts `{ flag }` — a check-pass flag
   gating a one-of-a-kind cosmetic costs zero plumbing (e.g. a Percolator-only mug).
5. **S1 pilot scope: 2–3 sites, late acts (5–7), one reward.** Rare enough to stay a tease.
   Hint density is the design; more sites = a system S1 didn't price.

## The one real engineering line

`.dlg` `ask` arms have NO per-arm conditions today (the variant-site pattern covers LINES, not
choice arms). The pilot needs a small compiler + DialogState feature: an arm carrying
`if trait_x` renders its pass text for holders and its authored fail variant for everyone else.
Touches the compiler, DialogState._processNode choice rendering, and the lock ledger discipline
(arms are `_chose_` save-key indexed — pass/fail variants of ONE arm must share ONE index, never
two arms, or the save key forks on trait). Wants a quiet tree and its own lane + judge.

## Status

- Filed as seed. NOT scheduled. Producer said "at some point" / "Idk" — this is a direction,
  not an order. Surface for scheduling after the current wave (wardrobe/ghost/bob) lands and
  merges.
- Cross-ref: `.claude/plans/q-run/TRAIT-PACKET.md` (perks now LIVE as of d9d420b),
  `SEASON_SHEET.md` (S2 heist structure, round 9 quiz/slider ruling).
