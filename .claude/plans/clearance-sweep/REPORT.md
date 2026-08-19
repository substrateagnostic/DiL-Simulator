# CLEARANCE + NAMING SWEEP — TRUST ISSUES

**Date:** 2026-08-18 · **Branch:** display-case · **Lane:** report-only (no src/ edits)
**Scope:** every shipped player-facing text surface + web-search checks of every fictional institution name and the main cast.
**Standing rule for this whole document: nothing here is a legal conclusion. Every item is flagged *for attorney review*; the producer is the attorney and every call is his.**

---

## 1. Executive summary

| Severity | Count | Definition used |
|---|---|---|
| **HIGH** | **1** (one cluster, many lines) | Confusable real-institution name + misconduct storyline attached to it |
| **MEDIUM** | **7** | Confusable name in benign context, real trademark as a load-bearing prop, or real-person/real-issuer adjacency worth a deliberate look |
| **LOW** | **~45** | Generic cultural references, transformative parody in benign context, real marks as passing set-dressing, real statutes cited correctly |
| Non-IP content flags | 4 | Judgment items outside brand/name risk (harassment-optics lines, archetype naming, one outsourcing joke, unpaid-intern gag density) |

The single HIGH item is the game's own premise: the employer is **"Vaults Fargo,"** an obvious Wells Fargo parody, and the plot attributes an eight-year, $23.4M fee-skimming and unauthorized-account-modification scheme to people inside it — a fact pattern that rhymes with the real institution's actual enforcement history, set in **Minneapolis**, with the derivation made explicit by a surviving "Stagecoach Stampede" source comment. Everything else in the game is either transformative parody in benign contexts, nominative pop-culture reference, or generic naming.

The tasking presumed ClientGenerator emits company names; it does not — see section 5 (coverage), correction (a).

---

## 2. Q1 — Tiered findings

### 2.1 HIGH

#### H-1. The "Vaults Fargo" cluster — parody bank + institutional-fraud storyline

*The shape the brief names as highest-severity: a confusable name with satirical claims of misconduct attached. All of the following function as one cluster and should be reviewed as one.*

**The mark and its derivation:**
| Where | Text |
|---|---|
| src/data/dialogs/01-act-1-introduction-npcs.dlg:19 | "Welcome to Vaults Fargo. Please don't touch the orchid." (employer named ~20x across files 01, 02, 03, 05, 07, 09, 11, 12, 13) |
| src/data/dialogs/09-act-7-trust-issues-final.dlg:374 | "The Vaults Fargo building at 4471 Trust Avenue…" |
| src/data/dialogs/13-f-remainder-the-rooms-an.dlg:152 | "Mr. Fargo's secretary could clear a full rack in four minutes." — a fictional founder "Mr. Fargo" (William Fargo adjacency) |
| src/data/dialogs/03-act-3-endings.dlg:299 (source comment) | The arcade cabinet's former name **"Stagecoach Stampede"** — the stagecoach is Wells Fargo's core trademark; the comment makes the parody target explicit to anyone reading source |
| src/data/dialogs/05-act-3-the-deeper-ledger.dlg:1476 + 09:10 | "The **Minneapolis** skyline stretches in every direction." — real city, major real-Wells-Fargo operating hub |
| src/data/thoughts.js:43 | "Someone left a Vaults Fargo bumper sticker on a Porsche. Peak irony." |
| src/data/ClientGenerator.js:223 | "Used to be with Vaults Fargo — knows the drill" (returning-client attribute) |
| src/data/billableDay.js:299 | "Vaults Fargo offers two ways to fill a business day." |
| src/states/EpilogueState.js:207 | Epilogue card titled "VAULTS FARGO BRANCH No. 1" |
| src/data/dialogs/13:162 | "*Welcome to the Vaults Fargo Year in Review. Advancing Trust. Securing Tomorrow.*" (fake corporate media in-world) |

**The misconduct attributed inside that fiction (exact lines; NN:LL = dialog file:line):**
- 05:11-12 — "a **shadow ledger**. Every trust account this branch has ever managed. Parallel books… Basis point skims. Fee reallocations."
- 05:32-33 — "$23 million across all accounts over eight years… **systematic breach of fiduciary duty at an institutional level**." / 05:204 — "$23,478,912.20. Skimmed from 47 trust accounts over eight years." (on a screen headed "VAULTS FARGO TRUST ARCHIVE — BRANCH 4471")
- 02:405 — "unauthorized changes to the Henderson Trust for EIGHT YEARS" — an unauthorized-account-modification pattern that echoes the real bank's fake-accounts scandal
- 01:178, 02:399, 03:191, 05:9 — Cayman Islands offshore routing; 05:1355 — "The Regional Manager has been arrested. The SEC found the offshore accounts."
- 06:220-222 — whistleblower retaliation attributed to the employer ("He reported it… They transferred him to a branch that doesn't exist anymore. Closed six months later.")
- 10:329-334 — covert admin_legacy account with read/write on every trust record; tripwire monitoring of client files
- 11:94-151 / 08:170-173 — the employer altered its own 1947 handbook ("Six words changed. Edition stamp: 2019.")
- 13:219-222 — suppressed client disclosure on bank letterhead ("They never sent it.")
- 08:302-343 — sham board governance ("Pre-drafted. With the vote counts already filled in.")

**Facts that cut the other way (recorded for the attorney's weighing, not as a conclusion):** the register is broadly absurdist satire; the wrongdoing is attributed in-fiction to *individuals* (the Regional Manager personally — 05:1271 even has his lawyer disclaim "Not by Vaults Fargo corporate. That distinction may matter later" — and Meredith Sterling), and the institution's founding charter is the story's moral hero; the mark is in-world content, not the game's own branding (the game brands as TRUST ISSUES); and no real entity named "Vaults Fargo" was found (closest reals: Wells Fargo; Loomis, Fargo & Co., armored transport). The .dlg hash-comments (incl. "Stagecoach Stampede") are stripped from the compiled index.js, and the repository IS public (github.com/substrateagnostic/DiL-Simulator, verified PUBLIC via gh on 2026-08-18), so the comments are readable by anyone.

**For attorney review:** parody/expressive-use analysis of the mark, trade-libel/dilution-tarnishment exposure of the misconduct storyline, and whether the Minneapolis pin plus the unauthorized-accounts echo narrows the satire toward an identifiable enterprise more than intended. Rename cost if ever wanted: **prose-only** — "fargo" appears in **zero** flag ids, save keys, room ids, or file names (verified by grep); ~20 dialog lines, 4 JS strings, a handful of comments, plus og.png regeneration. The bestiary joke "Reassigned to Fargo. ACTUAL Fargo." is about the city and survives any rename.

---

### 2.2 MEDIUM

#### M-1. "Henderson" / "the Henderson Trust" — collision with the Janus Henderson trust family
- The core cast (Karen/Chad/Grandma/Harold/Eleanor Henderson) and the central "Henderson Family Trust," named ~243 times across the dialog corpus, plus Act titles, achievement copy, splash cards, and the HNDRS ticker.
- Real-world: **Janus Henderson Investors** runs a family of UK-listed investment trusts literally named "Henderson … Trust" (Henderson High Income Trust plc, Henderson European Trust, Henderson Smaller Companies Investment Trust). No standalone US "Henderson Trust Company" found.
- Context cuts risk: the in-game Henderson Trust is a *private family trust*, not an institution, and the Hendersons are the **victims** of the skimming, not perpetrators — the misconduct-attached-to-name shape points away from them. For attorney review as a confusability question only.
- Rename cost: **severe** — prose everywhere, but internal ids survive (enemy ids are karen/chad/grandma; only hendersons_done (achievement id, localStorage — keep id, change display), a room interactable id "henderson", and an ExplorationState henderson_trust key touch the name).

#### M-2. "Meredith Sterling, SVP" — surname collides with real trust-company brands; misconduct attributed by name
- Character: antagonist SVP who "cooked" restructuring numbers (08:101, 08:163), received a "destroy records" memo (05:416), ran a "cover-up" (05:319-320), dissolved seven branches (08:195-197).
- Real-world: **Sterling Bank & Trust**, **Sterling Trust Co.**, multiple "Sterling Trust" entities exist; Sterling Bancorp's president is coincidentally named Christine **Meredith**. **No real individual "Meredith Sterling" in finance was found** (searched; nearest hits are ships named USS Meredith).
- For attorney review: fictional-person + real-brand-surname adjacency. Rename cost: **moderate, prose-only** — "sterling" appears in zero identifiers; the speaker string is a UI identity (two-table edit: SPEAKER_COLORS + PORTRAIT_KEYS), plus ENEMY_STATS.meredith_boss.name, bestiary, review.js memos/copy, the board-meeting column label "Strategic Operations (Sterling)" (08:162), and ~52 dialog lines. Internal ids meredith/meredith_boss survive.

#### M-3. "Schwalb" — one letter from Charles Schwab
- src/data/stats.js:1257 — "I'm calling Schwalb. They appreciate their clients!" (client-defection taunt).
- Highest-confusability of the four competitor parodies: a single-letter transform, and a web search for "Schwalb financial" **returns Charles Schwab results**. Context is benign (an irrational client praising them), which cuts the other way. Cheapest fix in the report: one string. Candidates in section 3.
- The sibling parodies **Merrill Clinch / Gorman Stately / J.P. Morgue** (stats.js:1255-1258) were web-checked: **no real registrants found** under any of the three; they are two-step transforms with actual jokes in them. LOW.

#### M-4. Stock-ticker prop uses two real Nasdaq symbols
- src/world/Furniture.js:3687-3691 — the office stockTicker() renders: TRST $142.67 up, HNDRS $8.12 down, ALGM $0.01 down -99.9%.
- **TRST is TrustCo Bancorp NY** (real Nasdaq bank holding company) shown at a fictional price; **ALGM is Allegro MicroSystems** shown *crashed to $0.01*. In-world these plainly mean the Trust department and The Algorithm, but a real issuer's symbol displayed collapsing is worth attorney eyes. HNDRS matches no real ticker. Fix cost: one array. Candidates in section 3.

#### M-5. Rolex — a real famous mark as a story-critical, supernatural prop
- "The Janitor's Rolex" is a named quest objective (Quest.md, quests/index.js), an achievement description, and appears ~25x in dialog (07:102-119, 09:122-382, 01:113/604/649, 03:528/748, 05:431-432/522), where the watch glows, hums, "tells trust," and dissolves into the building.
- Nominative use of a famous mark as an expressive prop; no disparagement of the product (it is the game's most revered object). Listed exhaustively so the attorney can assess nominative/expressive use himself.

#### M-6. Real-person namesakes among the cast (spot-checked, reported neutrally)
| Character | Role in game | Findable real namesakes |
|---|---|---|
| Karen Henderson | hostile beneficiary/client | Multiple real bankers/wealth professionals named Karen Henderson (e.g., a trust/wealth officer at Community Bank & Trust, Waco TX; a Capital One treasury manager). Character is a client, not a professional; the name is extremely common. |
| Skip Hartley | hapless-but-sympathetic manager; "Unhinged" boss variant in one secret ending | Real individuals named Skip Hartley exist (e.g., a Houston CEO). None in banking found. |
| Curtis Briggs (the Janitor's real name, revealed once, 13:90) | heroic ex-SVP of Trust Administration | A real, findable San Francisco criminal-defense attorney **Curtis L. Briggs**, whose listed practice areas include trusts & estates. Portrayal is entirely positive. |
| Delia Okafor | retired Deputy Recorder, heroine | No exact match; nearest is "Deli Okafor," a Baltimore County political figure. Portrayal entirely positive. |
| Meredith Sterling | see M-2 | none found |
- Also informational: **"A. GALLE-FROM"** (10:37, Epilogue "Institutional Memory" card) and **"Mr. Galle"** (12:228) — the producer's own surname as the player character's; self-insert, producer already knows.

#### M-7. Mosler / Corbin — real security brands as in-world equipment labels
- src/ui/VaultKeypad.js:42 — "MOSLER SEQUENTIAL ACCESS TERMINAL"; :52 — "CORBIN RESTRICTED ACCESS OVERRIDE".
- **Mosler Safe Company** is a real (defunct 2001, assets to Diebold) bank-vault maker; **Corbin** is a live lock brand (Corbin Russwin, ASSA ABLOY). Both used as period-accurate set dressing on doors, benign context, arguably *adds* verisimilitude the same way a real safe in a film would. For attorney review as prop-trademark use.

---

### 2.3 LOW (grouped; all judged generic, transformative, or passing nominative references in benign context)

**Real product/media marks as office set-dressing or jokes** (file:line verified during extraction):
Xerox WorkCentre 7845i + "PC LOAD LETTER" (Office Space echo) (01:543, 10:475, 14:44); Slack (01:186); TI-84 (01:158); Comic Sans (01:553, 04:16); Sharpie (01:499, 04:23); Tupperware (01:516, 10:245); Post-it x4 (04:61/191/250/259); Scotch tape + Band-Aids + Fruit Roll-Up in one line (05:414); Starbucks receipt (02:57); Red Bull (02:401, 05:618); CompTIA (02:401); SoundCloud (02:273); Febreze (04:7); LinkedIn (03:624, 04:188, 12:363); Doom (04:204); Minecraft (04:233, 05:345); Reddit (04:233, stats.js:1263); Wordle (05:96); Tor (05:838); Helvetica (05:1130); PowerPoint (05:1390, 07:72, 08:208, allies.js:194, stats.js:1412); Google/Googled (03:343, 03:570); Yelp + TripAdvisor (03:23, 03:309, 03:570, stats.js Karen kit — incl. "We don't have a Yelp page. She MADE one"); Twitter-shaped "live-tweets"/"THREAD:" (stats.js:1121-1124); CNBC (stats.js:1245); GameStop + SPY (stats.js:1263-1264); Honda Civic (04:284, 09:291-315); Porsche (thoughts.js:43); Montblanc (cosmetics.js:135 "Borrowed permanently…", stats.js:634); Keurig (billableDay.js:173); Nespresso (13:22); Erewhon (13:32); Maglite (13:135); Kyocera 4100 (13:248); eBay + "Military Mike" (06:137); Super Bowl (01:332); Jason Bourne x2 (02:419-420); the LOST numbers (01:445); "Brazil" homage Form 27B/6 (03:96, 05:445, 06:413-417); SharePoint (14:121); Uber ("Uber for trusts", stats.js:1011); unnamed Dogecoin ("a coin with a dog on it", 13:166; PumpCoin arc 02:91); Lehman named factually (13:57); VT323 font (OFL-licensed, index.html).

**Real institutions/regulators/places in ordinary fictional use:** FINRA (03:96, 06:411 — note the quiz marks fictional Form 27B/6 as the "correct" FINRA answer, plainly satirical), SEC/FBI (05:33, 05:1355), FCC (06:39), CFR Title 12 (06:455), 12 CFR 9.18 (stats.js:1188 — a *correct* citation of the real OCC fiduciary-activities regulation), Form U4 / 1099 / W-2 / W-9 / 1099-MISC / 4506-T (real forms in jokes), "Form 11-C" (12:78 — reuses a real IRS form number for a fictional municipal "Request for Records of Requests for Records"; trivial but noted), prudent investor rule / duty of loyalty / respondeat superior (correct doctrine, comic delivery), Cayman Islands/Bahamas as offshore-fraud venues (standard fiction), Minneapolis (see H-1), Fargo ND, Omaha ("transferred… voluntarily. On the same day."), Branson, Scottsdale, Wharton and Harvard MBAs (villain-adjacent), Obama/Truman/Clinton administrations as time markers, Boy Scouts, Las Vegas chapel (thoughts.js:14), Carrara (thoughts.js:208), Wyoming/Ohio-shaped objects.

**Fictional names that clear:** The Firm (generic phrase; the Grisham echo is a book title, and the three-body chorus is its own joke), Lucky's Diner, The Roastery, Hall of Records, Fennimore Avenue, 4471 Trust Avenue / Branch 4471, PumpCoin, Donovan & Sons Chicago, Lakeview Hospice endowment, Bridgewell-Kaplan Workplace Temperament Inventory (TM) (the TM is part of the joke; "Kaplan" and "Bridgewell" exist as unrelated real names — glance only), "Meredith Sucks dot com" (spoken, never rendered as a link; domain registration not checked), Jim Barfield's "Leading Through Nausea", Gerald Fink's "The Audacity of Adequate Management" (Obama-title echo, lampshaded in-text as fictional: "That book does not exist. Gerald Fink does not exist."), all fictional management-book/webinar titles, "Wealth Solutions" / "Asset Synergy Partners" (rebrand jokes), Mrs. Calloway / the Parks / David Osei / Harold Okafor (fictional clients), stairwell "TRUST FALLS — FLOOR COUNT: 17".

**Non-player-facing but publicly readable in the repo (verified public):** .dlg comments naming Claude/Opus 4.6 as prose drafter (files 08, 09, 11, 13, 14, 15), style-anchor comments naming Bret Easton Ellis, Kent Haruf, Borges, a Mass Effect comment (05:804), and the "Stagecoach Stampede" comment (03:299, counted under H-1). The dialog compiler strips hash-comments from the shipped index.js; Vite minifies JS comments out of dist/.

### 2.4 Non-IP content flags (judgment items, producer-decision)

1. **Skip's innuendo cluster about a female client's "assets"** — 01:287-288, 01:311, 02:240 ("really get in there and… manage them. Thoroughly." / "penetrate the Henderson account from multiple angles…"), lampshaded at 02:241 ("You know those all sound like innuendos, right?"). Named manager, named female client, named employer. Harassment-optics pass, not IP.
2. **The "Karen" archetype** — the tutorial boss is a literal manager-demanding Karen named Karen; the meme naming is widely read as gendered/racialized. Deliberate satire; noted so the decision is on the record.
3. **The Bangalore outsourcing line** — stats.js:1323, spoken by a villain ("Have you seen what contractors in Bangalore charge?"). Villain-voiced, but names a real city/workforce.
4. **Unpaid-intern gag density** — 07:71-74, 10:269-273, 11:242 etc. The game ultimately pays him ("I have DENTAL now!", 09:223); noted only because the joke recurs ~8 times.

---

## 3. Q2 — Fictitious-name inventory, verdicts, and vetted proposals

Register bar: deadpan corporate, punchline on bureaucratic detail. Candidates below were drafted via claude -p --model claude-opus-4-6 (one batched call) and **each was then web-checked**; vetting results are stated per candidate. A candidate that failed vetting is marked FAILED so nobody re-proposes it.

| # | Name | What it is | Verdict (satire register) | Rename cost |
|---|---|---|---|---|
| 1 | **Vaults Fargo** | the employer | **Excellent** — the pun carries the title theme and every branded artifact ("Advancing Trust. Securing Tomorrow.") lands. Also the game's entire HIGH exposure (H-1). | Prose-only; zero ids/flags; ~25 sites + og art. Fictional founder "Mr. Fargo" (13:152) moves with it. |
| 2 | **Henderson** (family + Trust) | core cast + central trust | **Strong** — plain-American, right for a family that fights over pancake-shaped bequests. Collision is with Janus Henderson trust names (M-1); victims-not-villains context. | **Severe** (243 prose mentions, act titles, docs, HNDRS); ids mostly survive. Price only if counsel asks. |
| 3 | **Meredith Sterling, SVP** | antagonist | **Strong** — the surname does exactly what it should. Collision noted at M-2. | Moderate, prose-only + two UI tables (speaker-string law). |
| 4 | **Skip Hartley** | manager | **Keep.** Perfect middle-manager music. Real namesakes exist, none in finance; portrayal sympathetic. | — |
| 5 | **Merrill Clinch** | competitor parody | **Keep** — two-word transform with a real joke ("clinch"). No real registrant found. | one string |
| 6 | **Gorman Stately** | competitor parody | **Keep** — the James-Gorman echo makes it literate. No real registrant found. | one string |
| 7 | **J.P. Morgue** | competitor parody | **Keep** — the strongest of the four. No real registrant found. | one string |
| 8 | **Schwalb** | competitor parody | **Weak** — a one-letter swap with no joke in it, and search engines resolve it to Schwab (M-3). Candidates: **Amerivade** (Ameritrade+evade — "evade" does actual work; no registrant found), **Vainguard** ("vain" changes the meaning; no registrant found, but note it is Vanguard-derived — same class of proximity, attorney's call whether more-transformative is enough), Fidelitus (FAILED vetting — Fidelitus Corp is a real Bengaluru real-estate/HR firm). | **one string** (stats.js:1257) |
| 9 | **The Firm** | the law-firm chorus | **Keep** — generic phrase, and the three-body speech pattern is the name's payoff. | — |
| 10 | **Lucky's Diner / Lucky's** | diner | **Keep** — generic Americana; benign. Many unrelated real diners share it. | — |
| 11 | **The Roastery** (nee Vaults Fargo No. 1) | bank-turned-cafe | **Keep** — the "nee" is the joke; name itself generic (note Starbucks uses "Roastery" for flagship stores; context here is a shabby indie cafe, opposite register). | — |
| 12 | **Hall of Records / the Recorder** | municipal | **Keep** — Borges-with-a-queue-rope is the engine of the chapter. | — |
| 13 | **Bridgewell-Kaplan Workplace Temperament Inventory (TM)** | fake HR product | **Keep** — best fake product name in the game; the TM is part of the deadpan. Attorney glance at the real-name components only. | — |
| 14 | **PumpCoin** | fake crypto | **Keep.** | — |
| 15 | **Fennimore Avenue / 4471 Trust Avenue / Branch 4471** | addresses | **Keep** — no real-address collision found or expected. | — |
| 16 | **Fictional book/webinar titles** ("The Stakeholder Within", "Bounce: Leaning Into What Hits You", "The Patient Yield", "Selling to the Unsellable", "Lead Like a Lion, Land Like a Feather", "Leading Through Nausea", "The Audacity of Adequate Management", "Radical Transparency and the Open-Plan Soul", "Synergistic Disruption in the Post-Trust Era") | Skip's library | **Keep, all** — this shelf is the satire at full power. The Obama-title echo is lampshaded as fictional in-text. | — |
| 17 | **TRST / HNDRS / ALGM** | ticker prop | **Weak as shipped** — two of three are real Nasdaq issuers (M-4). Vetted candidate sets (same Opus call): CHRTR (CAUTION — one letter from Charter Communications' real CHTR); **VFNTL / TRSTD / SYNTHQ** — TRSTD and VFNTL match no real symbols found, and SYNTHQ's phantom NASDAQ bankruptcy-Q suffix is a period joke (6 letters is fine on a prop); **DYNST / MCHNA** and **BNKCH / DVNST / NRLGC** clear on a basic check. Recommend VFNTL / TRSTD / SYNTHQ; verify against a current symbol list at edit time. | **one array** (Furniture.js:3687) |
| 18 | **Contingency only — employer replacements** (if counsel wants distance from Wells Fargo): **Harrow & Tull** (no registrant found — cleanest), **Ironclad National** (caution: Ironclad Inc. is a well-known legal-tech company, different sector), Claridge & Weld (FAILED vetting — Claridge Inc. is the Bronfman family's real Montreal investment firm). | | | see #1 cost |
| 19 | **Contingency only — Henderson replacements**: **Whitfield**, **Holloway** (no major U.S. financial-institution collision found in basic searches — re-verify before use), Drummond (FAILED vetting — Drummonds Bank, UK/NatWest; also Drummond Community Bank, FL). | | | see #2 cost |
| 20 | **Contingency only — Sterling replacements**: **Meredith Voss**, **Meredith Aldridge** (no matching entities/persons of note found), **Meredith Hale** (caution: "Hale" echoes Hale & Dorr / WilmerHale). | | | see #3 cost |

---

## 4. Recommended next actions

1. **(Attorney)** Review H-1 as a single unit — the Vaults Fargo mark + misconduct storyline + Minneapolis pin + stagecoach comment — and rule keep / soften / rename. Everything else in this report is smaller than this one call.
2. **(Attorney)** The GitHub repo IS public (verified via gh, 2026-08-18). Decide whether the "Stagecoach Stampede" comment (03:299) and the style-anchor/author comments should be reworded (comments do not reach the built game).
3. **(Producer, one string)** Replace "Schwalb" (stats.js:1257) — Amerivade is the vetted first pick, pending attorney view on Vanguard/Ameritrade-derived names as a class.
4. **(Producer, one array)** Replace the TRST/ALGM ticker symbols (Furniture.js:3687-3691) with a vetted fictional set.
5. **(Attorney)** Rolex nominative-use pass (M-5; occurrence list is complete in this report's sources).
6. **(Attorney)** Note-and-file the real-person namesake spot-checks (M-6) — no action recommended by this sweep, but the record now exists.
7. **(Attorney)** Mosler/Corbin prop-trademark glance (M-7).
8. **(Producer)** Content-flag pass on section 2.4 items 1-4 — editorial calls, not legal ones.
9. **(Producer)** Decide whether the Henderson and Sterling contingency renames (M-1/M-2) are worth staging now that costs are priced; this sweep's read of the *context* (victims-not-villains; no real individual match) is recorded for the attorney to weigh.
10. **(Attorney, optional)** A USPTO/TESS trademark-register check was **not** performed (web search only); if any name above graduates to a real concern, run the register search before deciding.

---

## 5. Coverage statement

**Read in full (direct):** index.html; src/data/: ClientGenerator.js, stats.js, shop.js, cosmetics.js, bestiary.js, thoughts.js, review.js, allies.js, voices.js, splash-cards.js, traits.js, quests/index.js, encounters/index.js, billableDay.js (all player-facing strings); src/core/AchievementManager.js (full catalogue); src/states/EpilogueState.js (all card text), TitleState.js (menu strings); src/ui/VaultKeypad.js, NewGameScreen/difficulty.js caption sets; src/arcade/ Hud/Props/Backdrop display strings; canvas-drawn text in src/world/Furniture.js (ticker, analytics wall, EXIT/BUS/5:15 signage, TRUST ISSUES neon) and src/effects/MaterialLibrary.js (REMEMBERED monitor); DayState/board UI strings. **Read in full (via two extraction subagents, line-by-line):** all 15 src/data/dialogs/*.dlg (7,534 lines — the corpus source of truth). Context docs Gameplay.md and Quest.md read in full.

**Corrections to the tasking, stated honestly:**
(a) **ClientGenerator emits no company names.** Its pools are 36 person first names + 36 surnames, client-type descriptors ("Retiree", "UHNWI", "Offshore Dynasty"…), and attribute copy. Emittable combinations are person names (e.g. "Patricia Shapiro", "Gerald Okonkwo") and family chains ("The [surname] family") — generic-register; none was individually web-checked (common-name class), and none of the surnames is a financial-institution name. The single brand-bearing pool string is the "Vaults Fargo" returning-client attribute (counted under H-1).
(b) The prompt said 15 dlg files; there are 15, and all were read.

**Web-checked (search engine, US-only tool; no trademark-register search):** Vaults Fargo; Henderson Trust / Henderson Trust Company; Meredith Sterling; Sterling Trust Company; Skip Hartley; Curtis Briggs; Delia Okafor; Karen Henderson (finance); Merrill Clinch / Gorman Stately / J.P. Morgue; Schwalb; TRST and ALGM tickers; Mosler and Corbin; and all 15 drafted replacement candidates (three failed vetting and are marked FAILED in section 3).

**Not checked:** Chad/Eleanor/Harold Henderson individually, minor and offscreen names (Marlene, Jules, Earl, Gerald Hitchcock, Dave Kowalski, Marian Finch, J. Walsh, M. Vasquez, R. Chen, T. Barlow, Morgan, Gary, Joe, T.K., Tyler) — all judged common-name/benign-role; the fictional book titles as registered marks; the meredithsucks.com domain registration; Lucky's Diner / The Roastery against trademark registers; HNDRS and candidate tickers against a full current exchange symbol list; balance.json/room-overrides (numeric only, no strings); dev-only surfaces (DevPanel, editor) — not player-facing.

*Report generated in a report-only lane; no file outside .claude/plans/clearance-sweep/ was created or modified.*
