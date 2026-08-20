# THE EMPLOYER RENAME PACKET — TRUST ISSUES

**Date:** 2026-08-19 · **Branch:** display-case · **Lane:** report-only (no src/ edits; this file is the deliverable)
**Commission:** replace "Vaults Fargo" per the producer's rename ruling (clearance sweep finding H-1, `.claude/plans/clearance-sweep/REPORT.md`).
**The two reasons, both law:** (1) it is not a great parody name/joke; (2) the producer works at Wells Fargo and wants to share the game with his team without it reading as being about them. Therefore the replacement must NOT be a parody of Wells Fargo or any real institution — no one-letter-off names, no wells, no fargo, no stagecoach, no western-frontier banking iconography. A freestanding fictional trust/wealth institution, funny in the game's deadpan register: the kind of name that appears on a lobby wall and a severance packet.

---

## 1. The incumbent brand-world — inventory and rename-cost table

### 1.1 The headline: this rename is PROSE-ONLY

Verified by case-insensitive grep across the whole tree on 2026-08-19: `fargo` appears in **zero** flag ids, save keys, scene ids, room ids, encounter ids, file names, portrait stems, or `dialogs.lock.json` labels. `package.json`, `src/data/story/**`, `Quest.md`, `Gameplay.md`, `HANDOFF.md`, `ROADMAP.md`, and `public/` filenames are all clean. The carry contract (`FLAGS_OF_RECORD`), the lock ledger, and every save in the wild are untouched. No migration shim is needed and none should be written — this confirms the clearance report's H-1 costing. Also checked: "Vaults" is never used alone as an in-world shorthand (one comment wraps "the Vaults / Fargo tower" across two lines; it is counted below), and no canvas-drawn texture anywhere renders the name — `Furniture.js` signage, the arcade, the REMEMBERED monitor, and the CityBackdrop HQ tower (a facade-textured box, no lettering) are all clean.

The one binary that carries the name is `public/og.png` (the social unfurl card renders the kicker "Vaults Fargo · Trust Dept." into pixels) — regenerated in one command by `scripts/make-og.mjs`.

### 1.2 Rename-cost table — every live occurrence, by surface

**A. Dialog corpus — 18 lines to edit across 10 `.dlg` files** (then `npm run dialogs:build` regenerates `index.js`; word-for-word in-place replacement inserts no node, so the lock is untouched and every `_chose_` save key is stable by construction):

| file:line | line (abbreviated) | form needed |
|---|---|---|
| 01:19 | Diane: "Welcome to Vaults Fargo. Please don't touch the orchid." | spoken (full form fits here — first employer mention) |
| 01:150 | Alex from IT: "…Welcome to Vaults Fargo." | spoken |
| 02:435 | ask Narrator: "…the rest of Andrew's career at Vaults Fargo." | spoken (choice PROMPT — prose only, indices pinned by `@label`) |
| 03:716 | letterhead "VAULTS FARGO TRUST CHARTER — ORIGINAL" | **document** (see the "Trust-doubling" note in §3) |
| 05:20 | "…matches old Vaults Fargo sysadmin conventions." | spoken |
| 05:27 | "…The original Vaults Fargo branch charter." | spoken |
| 05:199 | "VAULTS FARGO TRUST ARCHIVE — BRANCH 4471 — ESTABLISHED 1947" | **document** |
| 05:512 | "VAULTS FARGO TRUST CHARTER — BRANCH 4471 — ORIGINAL CHARTER OF FIDUCIARY OBLIGATION" | **document** — the story's moral-hero document |
| 05:1268 | Corporate Lawyer: "…the interests of Vaults Fargo Regional Operations." | spoken |
| 05:1278 | "Not by Vaults Fargo corporate. That distinction may matter later." | spoken |
| 07:38 | Janet: "I've been at Vaults Fargo since before it was 'strategic.'" | spoken |
| 09:213 | "…an autonomous cooperative within Vaults Fargo. The first of its kind." | spoken |
| 09:374 | "The Vaults Fargo building at 4471 Trust Avenue…" | spoken (short form — avoids Trust ×2 against "Trust Avenue") |
| 11:94 | Diane: "Vaults Fargo had an original employee handbook. 1947." | spoken |
| 11:125 | "VAULTS FARGO EMPLOYEE HANDBOOK — ORIGINAL EDITION, 1947" | **document** |
| 12:113 | "the founding file of Vaults Fargo Branch No. 1…" | spoken |
| 13:152 | Diane: "Mr. Fargo's secretary could clear a full rack in four minutes." | **the founder's only appearance** — becomes "Mr. \<Founder\>'s secretary" |
| 13:162 | "*Welcome to the Vaults Fargo Year in Review. Advancing Trust. Securing Tomorrow.*" | spoken; carries the corporate tagline (see §3 note) |

**B. JS strings, player-facing — 4 sites:**

| file:line | string |
|---|---|
| `src/data/thoughts.js:43` | "Someone left a Vaults Fargo bumper sticker on a Porsche. Peak irony." |
| `src/data/ClientGenerator.js:223` | "Used to be with Vaults Fargo — knows the drill" (returning-client attribute) |
| `src/data/billableDay.js:299` | "Vaults Fargo offers two ways to fill a business day." (board subtitle) |
| `src/states/EpilogueState.js:207` | epilogue card title `'VAULTS FARGO BRANCH No. 1'` |

**C. Build/meta — 1 string + 1 binary regen:**

| site | action |
|---|---|
| `scripts/make-og.mjs:134` | kicker "Vaults Fargo &middot; Trust Dept." → new name |
| `public/og.png` | regenerate (`node scripts/make-og.mjs`); the old name is rendered into the shipped pixels |

**D. Source comments — not player-facing, but the repo is PUBLIC (verified in the clearance sweep), and repo hygiene is half the producer's reason. 9 sites:**

| file:line | content |
|---|---|
| `src/effects/CityBackdrop.js:597, 630, 894-895, 949` | "the Vaults Fargo tower / HQ" ×4 |
| `src/data/buildingMap.js:1` | "The canonical Vaults Fargo tower…" |
| `src/data/rooms/index.js:2848` | "THE ROASTERY (née VAULTS FARGO No. 1)" |
| `src/data/dialogs/03-act-3-endings.dlg:296-298` | the B15 comment naming **"Stagecoach Stampede"** — the one place the Wells Fargo derivation is explicit in source. See the honesty rule in §4. |
| `index.html:44` | comment: "styles/arcade.css was the STAGECOACH STAMPEDE sheet…" |

**E. Docs — 2 sites:** `CLAUDE.md:460` ("the shipped Stagecoach build") and `CLAUDE.md:462` (STAGECOACH STAMPEDE stylesheet history). Same honesty rule as D.

**F. Frozen fixtures — 3 files × 19 occurrences, a decision, not a sweep:** `tools/dlg/baseline.json`, `baseline.after13.json`, `baseline.pre-normalize.json` are the dialog-compiler migration's identity-proof snapshots (read only by `tools/dlg/prove-identity.mjs` / `convert.mjs`, which are NOT in `npm run check`). A prose sweep breaks their deep-equality with the live corpus. Either re-dump `baseline.json` afterward (`node tools/dlg/baseline.mjs --write`, one command) or accept that the migration-proof tools go red if ever rerun. `baseline.pre-normalize.json` is frozen history by name and should stay frozen either way.

**G. History — NOT swept, by the naming-law precedent:** `.claude/plans/**` (including the clearance report itself), `alexmemory.md`, `art/` refs, `screenshots/`, and all git history. Frozen record. **Do not rewrite git history** — four lanes share this tree, and the precedent (the 2026-08-04 id sweep) already accepted that old names survive in history; the producer's concern is the visible tree.

**Totals: 23 live text edits (18 dlg + 4 JS + 1 og script), 11 comment/doc sites, 2 regenerated artifacts (`dialogs/index.js`, `public/og.png`), 3 fixture files pending one decision. Zero identifiers. Zero visual/art edits.**

### 1.3 What deliberately SURVIVES the rename

- **The city-of-Fargo jokes** — 09:217 "Meredith was reassigned to a regional office in Fargo. Actual Fargo." and `bestiary.js:16` "Reassigned to Fargo. ACTUAL Fargo." These are about Fargo, North Dakota, and they get FUNNIER post-rename: the punchline stops echoing the employer's own name and becomes a pure geography insult.
- **1947** — the founding year is not Fargo-derived (Wells Fargo is 1852). The whole watch mythology (charter signed 1947, page 47, "47. For 1947.", twenty-two years, the Janitor's architect claim) is year-anchored and unaffected. **DO NOT EXPLAIN THE WATCH** stands.
- **4471 Trust Avenue / Branch 4471** — no real-mark content.
- **"Advancing Trust. Securing Tomorrow."** (13:162) — the Year-in-Review's own fake-corporate voice; works under any name. Recommend keeping it in that line regardless of kit; the kit taglines below are for og art and any future lobby-wall surface. Producer's pick.
- **Minneapolis** (05:1476, 09:10) — out of this commission's scope, but noted: with the parody name gone, the Minneapolis pin loses most of its H-1 weight (a fictional 1947 trust bank in a Midwest city is just a setting).
- **TRUST ISSUES** — the game's own brand, the neon, the title screen: untouched.

### 1.4 The lore the replacement must thread INTO (read in full for this packet)

1. **The founder exists in exactly one line** (13:152, the penthouse pool-table scene): Diane learned pool in the sub-basement in 1961 from "Mr. Fargo's secretary." So the institution is founder-eponymous, the founder was active mid-century, and his entire characterization is that his secretary was excellent at pool and deserved more thanks. The replacement founder should stay this light — a surname, a secretary, an era. The first name below is packet flavor; **the game never renders it.**
2. **The founding file** (12:113-115, the deep stacks): "Branch No. 1. Architect's drawings. A loan ledger. A photograph of nine people on marble steps," inscribed "First day. Nobody knew where anything was. We decided that whoever stayed would learn." Nine people, unnamed. A founder hook can live here without contradiction.
3. **The 1947 handbook, Article 1** (11:118/148-149): "An employee's first duty is to the truth, told plainly." — six words swapped in the 2019 edition. The founder plausibly wrote this sentence; the kits use it.
4. **The charter** (05:512): "ORIGINAL CHARTER OF FIDUCIARY OBLIGATION," dated 1947 — the story's moral hero and the Architect-ending key. The Janitor: "Year the charter was signed. Year this building looked a man in the eye and made a promise it meant to keep" (07:102).
5. **Branch No. 1 is now The Roastery** (12:164, rooms C5): marble steps, basement vault, "marble doesn't take buyouts." The epilogue card at `EpilogueState.js:207` is titled after it.
6. **The predecessors ledger / page 112** (file 13, F-9 block): the green ledger, REMEMBERED entries, the section before page 112 — none of it names the employer or founder. Nothing to contradict.
7. **Curtis Briggs** (13:90-92): "Same as yesterday. Same as 1947." — the Janitor's history binds to the YEAR and the building, never to the Fargo name. Clean.

---

## 2. Candidate slate — 23 names, every one web-vetted

Drafting method: one batched `claude -p --model claude-opus-4-6` call carrying the register, the anti-parody law, the 1947/founder canon, and a hard avoid-list including Twin Cities banking history (Norwest, Northwestern National, First Bank System, Marquette, Bremer, IDS/Ameriprise, TCF, US Bancorp, Piper, Thrivent, Securian) — the game pins Minneapolis, and the replacement must not trade one local echo for another. Every candidate was then individually web-searched against real banks, trust companies, and wealth managers; failures are struck ON THE PAGE with the reason kept, per the clearance report's convention. Web search is US-only and is not a trademark-register (USPTO/TESS) search — the report's action item 10 applies to whichever name wins.

| # | Name | Verdict | Vetting result |
|---|---|---|---|
| 1 | Halsted Trust Company | **STRUCK** | Halsted Financial Services LLC — a real, heavily-complained-about Skokie IL debt collector; plus Caleb O. Halsted, president of the Bank of the Manhattan Company 1847-60. A collections-agency collision under a misconduct storyline is the H-1 shape again. |
| 2 | Thorne Fiduciary Trust | **STRUCK** | Oakleigh Thorne — real historical president of the Trust Company of America (and a living billionaire descendant of the same name). A famous trust-company Thorne exists. |
| 3 | Steadman National Bank & Trust | **STRUCK** | Charles Steadman's infamous "dead man funds" (the Steadman/Ameritor funds, the worst-performing mutual funds in history) + Steadman Financial Group, a live Ohio planning firm. |
| 4 | Lathrop & Sons | **STRUCK** | Lathrop Investment Management Corp (real RIA, ~$957M AUM) + Lathrop GPM, a real law firm with a trusts-and-estates practice and Twin Cities roots (Gray Plant Mooty merger). A genuine loss — "there were no sons; the correction would require a board vote" was the best joke on the slate — and it would also have doubled the "& Sons" shape with the existing Donovan & Sons button-maker lore. |
| 5 | Overton Trust Corporation | **STRUCK** | Overton Bank and Trust, N.A. — a real Fort Worth bank (1978-1998, merged into Frost); also First State Bank of Overton (TX), and the "Overton window" reads as political vocabulary. |
| 6 | Whitmore Savings & Trust | **PASS → KIT B** | No institution found; hits are place-based (Whitmore Lake, MI). Historical banker John Whitmore died 1826. Pop echo: LOST's Charles Widmore is one letter off but fictional — and the game already jokes about the LOST numbers (01:445). |
| 7 | Denning Trust & Estate Company | PASS (bench) | Denning & Company — a real San Francisco private-equity placement firm (Paul F. Denning). Different sector, moderate adjacency. Lord Denning is a judge, not a bank — a literate legal echo this game would enjoy. Bench, not kit, on the adjacency. |
| 8 | Aldrich & Renwick | **STRUCK** | Aldrich Wealth LP — real Oregon RIA, $6.5B AUM. Also Sen. Nelson Aldrich, architect of the Federal Reserve (the Aldrich Plan) and Rockefeller in-law — a famous banking-history surname. |
| 9 | Vickery National Trust | **STRUCK** | Vickery Financial Services Inc (Athens GA, SEC-registered since 1982) and Vickery Financial LLC (Cadillac MI) — two real advisories carry the exact surname+financial. |
| 10 | Redfield Bank & Trust | **STRUCK** | Redfield Financial Group — real planning firm. Secondary: Resident Evil's Redfields own the surname in games specifically. |
| 11 | Quillen Fiduciary Trust | PASS (bench) | No firm named Quillen; individual advisors named Quillen exist at WSFS/Rockland. Note: Quill Bank (real Utah fintech) is one morpheme away, and "Fiduciary Trust" collides shape-wise with the real Fiduciary Trust Company (Boston, 1885) — the noun pair, not the surname. Bench: rename the noun ("Quillen Trust Company") if promoted. |
| 12 | Garnett Trust & Savings | **STRUCK (register)** | Clean of firms (only a Citigroup risk executive named Garnett on a bank board), but in a Minneapolis-pinned game the surname belongs to Kevin Garnett. The lobby wall would get laughs for the wrong reason. |
| 13 | Yardley Trust Company | **STRUCK** | Yardley Wealth Management LLC — real fee-only RIA (~$200M AUM) in Yardley, PA. |
| 14 | Kellner & Marsh | **STRUCK** | Marsh — Marsh & McLennan, one of the largest financial-services brands on earth (its MMA arm literally runs "Wealth Advisors"). The Kellner half also brushes real merger-arb history (Kellner DiLeo & Co). |
| 15 | Underhill Trust Corporation | **PASS → KIT A (recommended)** | No "Underhill Trust," no Underhill bank, no trust company. Surname adjacency limited to small advisories (Underhill Financial Advisors, Tucson; Underhill Investments, Berkley MI; Robert A. Underhill P.C., Seattle) — the same common-surname class the clearance report accepted at M-6. Historical banker Daniel Oscar Underhill died 1929, different first name. Pop echoes disclosed: "Mr. Underhill" is Frodo's alias in Fellowship, and Fletch charges his country-club tab to "the Underhills" — a billing-fraud joke, which in a game about fee skimming is an echo pointing the right direction. Neither is an institution. |
| 16 | Earnshaw National Bank & Trust | **PASS → KIT C** | No firm found; nearest is a retired technology executive named Stan Earnshaw on a financial-literacy nonprofit board (the game never renders a first name; see kit). Literary echo: Wuthering Heights' Mr. Earnshaw — a WRITING.md-compatible anchor, though it pulls English rather than Midwest. |
| 17 | Faircloth Fiduciary | **STRUCK** | Faircloth Wealth Management (Raymond James, Modesto CA) + a Truist wealth regional director named Faircloth. |
| 18 | Norling Bank & Trust | **STRUCK (distance check)** | Clean on search — no Norling institution exists — but it fails the Wells Fargo distance check this commission exists to run: a "Nor-" prefixed Minneapolis bank founded mid-century echoes Norwest / Northwest Bancorporation (Minneapolis, 1929), Wells Fargo's own merger ancestor. The producer's team would clock it in one read. Struck for exactly the reason the rename is happening. |
| 19 | Blackwell Trust & Estate Company | **STRUCK** | Multiple real Blackwell Financial firms (Salem VA; Blackwell Financial Services; Blackwell Financial Corp). |
| 20 | Hewitt Trust & Loan | **STRUCK** | Hewitt Associates → Aon Hewitt. One of the most recognizable names in benefits/financial services. |
| 21 | Colwick Trust Company | PASS (bench) | Nothing found in finance; Colwick is a Nottingham suburb. Fully clean — benched only because it is the least funny of the survivors (a name with no texture is a missed opportunity on a lobby wall). First alternate if a kit name dies in the USPTO check. |
| 22 | Ashford National Bank & Trust | **STRUCK** | Ashford Hospitality Trust — a real NYSE REIT literally styled "Ashford … Trust," plus Ashford Inc. |
| 23 | Harrow & Tull *(carried from the clearance report's contingency row, re-vetted)* | PASS (bench) | Still no exact registrant. New adjacency found on re-vet: Tull Financial Group (small Chesapeake VA firm) and Harrowgate Fiduciary Trust (a fiduciary trust org one syllable from "Harrow"). Register critique: it reads London solicitors, not Midwest 1947 — and "Mr. Tull" plays a flute in every head over forty. Bench. |

**Survivors: 6** (Underhill, Whitmore, Earnshaw promoted to kits; Denning, Quillen, Colwick, Harrow & Tull benched). **Struck: 16, every strike sourced.** The strike rate is the finding: the plausible-Midwest-surname space is heavily occupied by real RIAs, which is why "sounds real" and "is not real" need checking one name at a time.

---

## 3. The three brand kits

Every kit defines **three forms**, because "Vaults Fargo" is one token everywhere and no good replacement is: **FULL** (lobby wall, first welcome, Year in Review), **SPOKEN** (the other dialog lines), **DOC** (the uppercase document/letterhead lines). The Trust-doubling trap: three document lines append "TRUST CHARTER"/"TRUST ARCHIVE" to the name (03:716, 05:199, 05:512) and one spoken line runs into "4471 Trust Avenue" (09:374) — any name containing "Trust" must swap those four sites with its surname-only DOC form or the line reads "TRUST TRUST."

### KIT A — UNDERHILL TRUST (recommended)

| artifact | value |
|---|---|
| Institution | **Underhill Trust Corporation** · FULL "Underhill Trust Corporation" · SPOKEN "Underhill Trust" (or bare "Underhill" where rhythm wants it) · DOC "UNDERHILL" |
| Founder | **Mr. Milton Underhill** (in-game text renders only "Mr. Underhill's"). Lore hook: one of the nine on the marble steps — and the man whose six words held from 1947 to 2019: Article 1 is his sentence ("An employee's first duty is to the truth, told plainly."). The sub-basement pool table was his idea; his secretary could clear a rack in four minutes. Vetted: no Milton Underhill in finance; nearest is banker Daniel Oscar Underhill, d. 1929. |
| Tagline | **"Where trust is kept."** — deadpan, and accidentally a floor plan. (13:162 keeps "Advancing Trust. Securing Tomorrow." as the Year-in-Review's own voice.) |
| Legacy arcade title | **ANNUAL REVIEW** — the cabinet's fictional 90s title; its rebuild as SPRINT REVIEW becomes an agile-transformation joke the game never has to explain. No known game-title collision; period-plausible. |
| Cost landing | 09:374 → "The Underhill building at 4471 Trust Avenue" (short form dodges Trust ×2); the three DOC lines take bare "UNDERHILL" ("UNDERHILL TRUST CHARTER — BRANCH 4471…"); og kicker → "Underhill &middot; Trust Dept." (full form would double). Every other site takes "Underhill Trust" verbatim. Epilogue card: 'UNDERHILL TRUST BRANCH No. 1'. 13:152 → "Mr. Underhill's secretary…" |

**Why it wins:** the name does thematic work for free. The game's building mythology is already subterranean and faintly ominous — the sub-basement, the boiler card, the mason's error of 1947, floor 13, an epilogue that ends "The building is not asleep. It is keeping watch." An institution named Underhill Trust is that mythology said out loud in a register no compliance officer would blink at. "TRUST ISSUES — a trust officer simulator at Underhill Trust" scans. Maximal phonetic and iconographic distance from Wells Fargo: no W, no F, no alliteration, no geography, no transport. The vetting is the cleanest of the funny survivors, with the two pop echoes disclosed above (neither is an institution; the Fletch one is doing thematically aligned work).

### KIT B — WHITMORE SAVINGS & TRUST (the invisible one)

| artifact | value |
|---|---|
| Institution | **Whitmore Savings & Trust** · FULL same · SPOKEN "Whitmore" · DOC "WHITMORE" |
| Founder | **Mr. Russell Whitmore** — the tenth man: he took the photograph, which is why the founding picture shows nine people on the marble steps. Contradicts nothing; explains a number the game never explains. Vetted: no Russell Whitmore in finance (historical banker John Whitmore d. 1826). |
| Tagline | **"Quiet confidence. Lasting commitment."** |
| Legacy arcade title | **COPY JAM** — the 90s cabinet as office-machine mishap; period-plausible, no known collision. |
| Cost landing | The mechanically cheapest kit: SPOKEN "Whitmore" lands at every site verbatim, including all four Trust-adjacent lines; the two welcome lines (01:19, 01:150) optionally take the full form. og kicker → "Whitmore &middot; Trust Dept." Epilogue card: 'WHITMORE BRANCH No. 1'. |

**Why you'd pick it:** if the goal is a name so unremarkable that nobody at any real institution could suspect it points anywhere, this is it — phone-book plausibility, zero real-firm hits, zero banking-history weight. The cost of that safety is texture: it is the least load-bearing joke of the three. The generator's own line is the honest review: "saying it aloud is like reading aloud from a phone book — which is the ambient mood of the lobby."

### KIT C — EARNSHAW NATIONAL BANK & TRUST (the literary one)

| artifact | value |
|---|---|
| Institution | **Earnshaw National Bank & Trust** · FULL same · SPOKEN "Earnshaw National" (or "Earnshaw") · DOC "EARNSHAW" |
| Founder | **Mr. Stanley Earnshaw** — believed in fiduciary duty the way other men believe in weather. Lore hook: the loan ledger in the founding file is in his hand, and he signed the charter in April 1947. Vetted: no Stanley Earnshaw in finance; a living retired tech executive "Stan Earnshaw" sits on a financial-literacy nonprofit board — the game never renders a first name, and "Vernon" is the drop-in if the producer wants zero overlap anyway. |
| Tagline | **"Unwavering since 1947."** — threads the canon year into the letterhead. |
| Legacy arcade title | **FILING FRENZY** — pure 90s shovelware energy; no major collision known. |
| Cost landing | SPOKEN "Earnshaw National" reads beautifully in the two flagship lines ("I've been at Earnshaw National since before it was 'strategic.'"); DOC "EARNSHAW" for the four Trust-adjacent sites; og kicker "Earnshaw National &middot; Trust Dept." Epilogue card: 'EARNSHAW NATIONAL BRANCH No. 1'. |

**Why you'd pick it:** it is the WRITING.md pick — the voice bible anchors every character to a literary register, and "Earnshaw" (Wuthering Heights) is a name-as-anchor in exactly that tradition, with real 1947-carved-in-limestone music. The cost: the echo pulls English moors rather than Midwest marble, and it is the only kit whose surname has a living near-namesake adjacent to finance (nonprofit board; disclosed above).

**Bench, in order, if a kit name dies in the USPTO/TESS check:** Colwick Trust Company (cleanest reserve), Quillen Trust Company (rename the noun from "Fiduciary Trust" first), Denning Trust & Estate Company (accept the PE-placement adjacency consciously), Harrow & Tull (accept the register drift).

---

## 4. Recommendation and migration sketch

### Recommendation

**Kit A — Underhill Trust.** It is the only candidate that pays rent beyond not-being-Wells-Fargo: the accidental ominousness compounds with the building mythology the game already owns, "Where trust is kept" belongs on the same wall as the orchid, and the vetting is clean at the institution level with the two pop echoes disclosed rather than discovered. Whitmore is the pick if the producer wants absolute zero echo and the cheapest sweep; Earnshaw if he wants the voice-bible move. All three satisfy both laws: none is a parody of anything, and none shares a syllable, an icon, or a founding myth with Wells Fargo.

One caveat carried forward from the clearance report regardless of kit: this packet's vetting is web-search only. **Run the USPTO/TESS check on the winning name before the sweep lane starts** (report action item 10).

### Migration sketch (for the eventual rename lane — order of operations)

1. **Producer picks the kit and freezes the three forms** (FULL / SPOKEN / DOC). Every downstream edit is mechanical after this.
2. **Dialog sweep** — the 18 `.dlg` lines per the §1.2 form column. In-place word replacement only; never insert a node. Then `npm run dialogs:build` and commit `.dlg` + regenerated `index.js` together. `dialogs.lock.json` will not change — if it does, stop: something inserted a node.
3. **JS strings** — the 4 sites in §1.2-B, plus `scripts/make-og.mjs:134`, then `node scripts/make-og.mjs` to regenerate `public/og.png` (needs the dev server per the script header, or pass `--shot`).
4. **Comment sweep** (9 sites) under the **honesty rule**: code comments record true history of this repo, so do not retro-fictionalize them. "Stagecoach Stampede" in 03:296-298, `index.html:44`, and `CLAUDE.md:460/462` should be reworded to describe without naming ("the cabinet's pre-rebuild western-era title", "the old build's stylesheet") — history stays true, the mark leaves the visible tree. The kit's legacy arcade title (ANNUAL REVIEW etc.) is for FICTION surfaces — if the cabinet's backstory ever gets an in-game line, that is its name; it does not overwrite the historical record in comments.
5. **Docs** — CLAUDE.md's two Stagecoach references (step 4's rule), and add the rename to the project-history note the same way the 2026-08-04 id sweep is recorded.
6. **Fixture decision** — re-dump `tools/dlg/baseline.json` (`node tools/dlg/baseline.mjs --write`) or accept the migration-proof tools going stale; `baseline.pre-normalize.json` stays frozen either way.
7. **Verify** — `npm run check` (dialogs:check, story:sim, validate:data, build all green); the discriminator pair per CLAUDE.md: re-dump the HEAD baseline then `node tools/_fr1-dialog-indices.mjs` must PASS (read its last line, not the exit code) while `_g-stage-verify` goes red BY DESIGN — that pair is the proof only prose moved; finally `grep -ri fargo src scripts index.html` must return exactly the two city-of-Fargo jokes and nothing else. No visual pass needed: no rendered texture carries the name (verified §1.1).
8. **What does NOT move, stated loudly:** no flag, no save key, no scene id, no room id, no file name, no encounter id, no portrait stem — none exist bearing the name (§1.1). No git-history rewrite. The city-of-Fargo jokes stay. 1947, Branch 4471, 4471 Trust Avenue, the watch, page 47, and the Minneapolis pin all stay (the last as a separately-ruled item). `.claude/plans/**`, `alexmemory.md`, and art/screenshot history stay frozen.

*Packet generated in a report-only lane; no file outside `.claude/plans/clearance-sweep/` was created or modified.*
