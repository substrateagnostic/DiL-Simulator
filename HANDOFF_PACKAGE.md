# TRUST ISSUES — Handoff Package

*Written 2026-08-01 by the acting director (Claude Opus 5) for Alex Galle-From.
Self-contained: hand this single file to any agent — Codex, Claude, anything — and
it can pick up the thread without the conversation history.*

---

## 0. What this project is

**TRUST ISSUES: A Trust Officer Simulator** — a satirical office JRPG. Three.js +
Vite, vanilla JS ES modules, no framework. Repo: `C:\Users\agall\projects\DiL_Simulator`.
Live on Alex's Vercel site off `main`. Windows box; PowerShell is primary, Git Bash
available. `CLAUDE.md` in the repo root is the authoritative codebase map — read it
before touching code, and **update it whenever you change a pattern it documents**.

**State as of this writing:** `main` == `display-case` == `1bad620`. The whole
2026 campaign (visual rebuild Waves 1–5, Runs A/B/C/E/F1, the Meshy combat cast,
the spine fix, the gender-matched casting slate) is merged and deployed. Build is
green, 40.5 MB dist, JS bundle unchanged from before the cast landed.

---

## 1. The founding prompt, filled in

This is the method Alex started the campaign with, with the comp blanks filled from
the rulings we made along the way. Use it verbatim for any new "make this AAA" push.

> Refactor/redesign/rebuild this game into a game comparable **graphically** to
> **Dungeons of Hinterberg** (character band and readability), **Clair Obscur:
> Expedition 33** (combat staging and material language), and **Persona 5 Royal**
> (combat choreography, UI confidence, turn-beat rhythm) — with the art direction
> ruled as **"The Display Case": Link's Awakening (2019 remake) tilt-shift diorama
> × Severance's corporate dread.** It should be utterly perfect, visually beautiful,
> with every single thing done at AAA quality — from textures to physics to anything
> you could think of.
>
> Fan out sub-agents and have sub-agents tackle each one individually so that the
> game is utterly perfect. Loop on each item and have **two separate sub-agents**
> check it visually to ensure it looks triple-A. Those separate sub-agents should be
> **really harsh critics**, and if it doesn't look triple-A compared to the comps,
> it should keep going.
>
> Don't stop until each sub-agent is utterly wowed with the quality when compared
> with the actual comp games. It should literally compare them side by side blind
> and say which one looks better. Fan out sub-agents and ultracode.

**Comp reference by domain** (use the right one; don't cite a comp for a domain it
doesn't govern):

| domain | comp | what it governs |
|---|---|---|
| Art direction / world | Link's Awakening 2019 remake × Severance | tilt-shift diorama, toy-real materials, corporate dread |
| Character models | Dungeons of Hinterberg | stylized-human adult band; never caricature, never chibi |
| Combat staging & feel | Clair Obscur: Expedition 33 | free-action economy, staging, material language |
| Combat choreography & UI | Persona 5 Royal | attack beats, turn rhythm, HUD confidence |

---

## 2. Remaining items, in priority order

**Immediately next (gated on Alex's word after playtester feedback):**

1. **Attack-animation re-judge against the Persona comp.** The cast now has correct
   rigs and gender-matched clips; the attack *choreography* has never been judged.
   Comp is Persona 5 Royal. Method: adversarial loop (§4.1).
2. **Prop attacks.** Karen's purse is baked into her mesh — a purse-swing needs
   either a detachable/socketed prop (Grandma's cane is the working precedent:
   bone-socketed on `RightHand` with an upright constraint) or a custom clip.
   Catalog has `a43`/`a635` "Handbag Walk" as a *reference only* — it walks the
   character out of frame.

**Open visual items (small, none blocking):**

3. `brand_consultant` trips the posture gate's absolute trunk ceiling by ~1° on one
   frame of nine (gesture idle judged against a calm-breathing ceiling). Swap on
   offer: `brand_consultant→a34`, `regional→a333`.
4. Five idles are ~2 s loops where the old shared stance was 11.3 s (chad a388,
   janet a317, hr_rep a297, a251, a249). Characterful on Chad; worth a look on the
   others.
5. `cast` role currently reuses the attack clip. **`a318` "Scheming Hand Rub"** is
   the recommended fill and is exactly the register for a trust officer casting a
   legal maneuver. `a17`/`a18` also downloaded, unwired.
6. ~~Dark-suit scratch-noise in baked base color (from `remove_lighting` on near-black
   fabric)~~ **FIXED 2026-08-03.** `tools/meshy-destreak.mjs` re-derives every atlas
   from the 2048 raws with a one-sided 5×5 median restricted to the dark band, then
   the normal 1024/q92 encode. All 33 GLBs, geometry/rig/clip counts bit-identical,
   whole cast **+0.06 MB**. Before/after at fight distance *and* inspection zoom:
   `screenshots/g-run/misc/streak_before|after/`. The fight-distance delta is
   0.00–0.02 % of pixels, so the earlier "invisible at fight distance" call was
   correct — this only ever showed at inspection zoom, and cost 70 KB to clear.
   **Reyes' bright shoulder patches are NOT addressed** and remain open.
7. Karen's head sits behind the enemy info banner at the rest camera; Andrew's head
   crops at frame edge on his lunge. **Pre-existing arena framing traits**, not model
   defects.
8. **`timeScale` a214 at 1.691×** is the most aggressive correction applied — watch
   it in playtest for a sped-up read.

**Larger lanes, unstarted:**

9. **Run D — AAA Audio.** SFX, ambience, mixing, plus music auditions. **Music is
   Alex's domain and his veto is absolute** — he explicitly invited auditions, but
   never ship music without his word.
10. **Run F remainder** — the 24 co-signed proposals in
    `.claude/plans/proposals-whats-missing.md` (rooms-that-keep-working, act dressing
    pass, sixth-floor bathroom, three trust officers before you, poster meta-puzzle,
    …). The epilogue-card **art** pass is queued here (goodbye cards are text-only).
11. **Alex's playtest-redline list** — see the `NEEDS YOU` section of `alexmemory.md`.
12. **The naming refactor, now permitted.** Live saves were ruled burnable (Alex,
    2026-08-01), so internal ids may finally match display names:
    `ross`/`ross_boss` → Skip Hartley, `rachel`/`rachel_boss` → Meredith Sterling,
    friendly `rachel_to` → "Rachel". This is a mechanical, grep-verified single sweep
    across flags, dialogs, encounters, rooms, `MESHY_MODELS`/`MeshyCast`, save
    (de)serialize, and the dev-panel presets. Ideal codex job. Do it in ONE commit
    with a verification grep in the message body.
13. **Framed autumn-photo easter egg** — proposed, awaiting Alex's go.

**Standing infrastructure fact (do not regress):**

14. Meshy's auto-rigger emits **two different pelvis-frame conventions** (Hips rest
    ≈ identity vs Hips rest-rotated 112–174°, both producing a straight bind pose).
    Any future character is a coin flip between them. `MeshyRetarget` runs per
    character **at load time** off each clip's own armature — that is permanent
    infrastructure, not a patch. Never bypass it, and re-verify any new clip with
    `tools/meshy-spine-gate.mjs`.

---

## 3. Tooling map

```
npm run dev      # localhost:5173      npm run build    # dist/
npm run preview  # production preview  npm run editor   # localhost:3747 balance/room editor
npm run check    # build gate — MUST be exit 0 before any commit
npm run perf     # perf harness
```

URL flags: `?dev` (dev mode; F2 dev panel + backtick instant-kill in combat),
`?nomeshy` (force procedural combat models).

Instruments — all write measurements, not opinions:

| tool | what it does |
|---|---|
| `tools/meshy-cast-pipeline.mjs` | manifest-driven, resume-safe Meshy gen→rig→anim pipeline |
| `tools/meshy-cast-shoot.mjs` | multi-angle character stills through the shipping code path |
| `tools/meshy-clip-fetch.mjs` | clip download + strip (`--outdir`, `--rawdir`, `--rawtag`) |
| `tools/meshy-clip-strip.mjs` | frame strips for judging a clip on a real body |
| `tools/meshy-spine-gate.mjs` | slate-aware spine/floor discriminants (see §4.3) |
| `tools/meshy-framing-gate.mjs` | every combatant in frame at the real combat camera |
| `tools/meshy-comp-video.mjs` | scripted fight video capture |
| `tools/meshy-destreak.mjs` | dark-fabric destreak; re-derives runtime GLBs from the 2048 raws (`--audit` measures only) |
| `tools/meshy-atlas-audit.mjs` | dark-band high-pass energy per atlas; also dumps the embedded atlas |
| `tools/meshy-cloth-zoom.mjs` | fight-distance + inspection-zoom parity stills for any texture change (headed) |
| `tools/pn-shoot.mjs` + `pn-stage.js` | procedural v7 instruments (`--only=neck,skull,hands,hair,profile,shoes,grip,idle,…`) |
| `tools/charmetrics/` | vendored img2threejs review instruments (pinned SHA) |

---

## 4. Conventions — the laws

These were all earned by a failure that cost real time. Violating them re-costs it.

### 4.1 The adversarial loop (the core method)
Build → render → hand to a **separate, harsh critic agent that did not build it** →
fix → repeat until PASS. The critic must judge **artifacts (renders, videos, numbers)
and never the builder's prose**. Give the critic a role ("lead 3D character artist at
a AAA studio"), the comp, and permission to fail the round. Two critics with
divergent lenses beat one critic run twice. A critic that manufactures objections to
look useful is failing its job — say so in the brief.

### 4.2 Measure, don't vibe
Every number comes off a **render**, never off a formula. If you can put a number on
it, do: luminance at final display size, hue delta, silhouette IoU, bone-angle
deltas, floor penetration in metres *and* head-heights. Numbers survive taste
arguments and catch regressions that eyes rationalize.

### 4.3 Verify the call path
**The single most expensive lesson of this campaign.** A review sheet that renders
through a convenience harness instead of the shipping code path will lie to you —
ours did, for two rounds, showing a defect worse than the game had. Render through
the real entry points (`clipsFor()`, `groundOffset()`, the actual combat camera).
Current gate values to hold: `Hips>Spine02` **32.8–40.5°** (ceiling 60; raw-bound
reads 90–164), joint excess over own bind **≤6°**, gaze dy **≤0.010**, floor
penetration **within ±0.01 m**.

### 4.4 Craft laws
- **ISO CAMERA LAW** — judge at the camera the player actually uses. Combat is the
  closest camera in this game; a defect that hides at turnaround distance and shows
  at combat distance is a *visible defect*.
- **Actors, not tripods** — characters must read as performing, not posed.
- **Plain background, no ground plane** for form review; unlit + map-stripped for
  topology review.
- **Judge stances by VIDEO, not contact sheet** — a sheet freezes one frame of a
  multi-second clip and will make a walking character look like it is marching.

### 4.5 Prose
Dialog is **first-drafted by Claude Opus 4.6** (`claude -p --model claude-opus-4-6`,
heartbeat-wrapped) and wired **verbatim**. Alex redlines **in playtest**, never in
draft — chopping dialog out of context is a known mistake. Prose is canon: when the
writing and a config disagree about a character, the writing wins (this is how Reyes
was corrected to *she*, and why the Compliance Auditor stays *they*).

### 4.6 Hard prohibitions
- **Real people's photographs NEVER go to an image generator.** Describe likeness
  textually only. `art/char_refs/human/` is eyes-only; Alex's own reference photo is
  never sent anywhere (his child is in it).
- **No merge to `main` without Alex's explicit word.** `main` is the live site.
  (He gave it on 2026-08-01 for the current state — that authorization does not
  extend forward.)
- **Live saves** are burnable as of 2026-08-01 — this *unblocks* the naming refactor.
  It does not license careless breakage.

### 4.7 Mechanical discipline (Windows/PowerShell)
- `npm run check` green and **verify the exit code** before every commit. Never
  `;`-chain a commit after a check — the commit runs even when the check fails.
- **No double quotes inside git commit messages.** PowerShell parses fragments as
  pathspecs and the commit dies. Use single-quoted here-strings; the closing `'@`
  must be at column 0.
- **Text surgery on UTF-8 files** uses `[System.IO.File]::ReadAllText/WriteAllText`
  with `New-Object System.Text.UTF8Encoding($false)`. `Get-Content -Raw` /
  `Set-Content` round-trips corrupt em-dashes and Cyrillic.
- **Heartbeat-wrap every long-running background job** (a 25 s echo loop) or the
  harness reaps it silently.
- **Kill every dev server, browser and node tree you spawn.** Alex's laptop is
  RAM-constrained and orphans have made it unusable more than once.
- Renders must be **headed** Chromium — headless SwiftShader is ~8 s/character and
  misleads timing.

### 4.8 Vendor economics
- **Meshy** (ULTRA account, key `MESHY_API_KEY` in
  `C:\Users\agall\projects\un_party_game\.env` — never print it): never conserve
  credits, retries are free, 100 concurrent tasks. **Attest spend from per-task
  `consumed_credits`, never from balance deltas** — concurrent lanes share the meter.
  **Assets purge after 3 days: download immediately on success.** Input plates must
  be A-pose with **hands clear of the body** (overlapping hands fuse into the mesh —
  this cost us a set of stump arms). Rigging strips PBR to base color; we re-shade
  with the house toon ramp anyway.
- **Image generation**: the full field manual is
  `C:\Users\agall\claude-memory\imagegen-playbook.md` — invocation, the negation-clause
  law, "prompt the cut not the dye", padding + no-crop lists, one-sheet-then-crop,
  and a symptom→cause→fix table. Read it before generating anything.

### 4.9 Model economy
Opus-class for builders and judges; Fable for the thorniest taste calls;
codex gpt-5.6-sol at xhigh for thorny *mechanical* work (matrix math, retarget
solvers, loader internals, large mechanical refactors). Sonnet for mechanical
catalog/sweep work. Never Haiku on this project.

---

## 5. How to document changes

Five surfaces, each with a job. Keep them in sync; a lane that ships code and
documents nothing has not shipped.

1. **`alexmemory.md` — the producer ledger.** Newest block at the **TOP**. One block
   per completed lane. Format that works:
   ```
   ## [LANE NAME + DATE]
   - what landed, with NUMBERS (before → after)
   - commits, pushed y/n
   - spend, per-task attested
   - what the producer must review, and where the artifact is
   - HONEST list: anything that would mislead his review if unmentioned
   ```
   The `NEEDS YOU` section is always current — Alex's open gates live there.
   Use `[System.IO.File]` UTF-8 no-BOM to prepend (§4.7).
2. **`CLAUDE.md`** — the codebase map and gotcha list. **Update it in the same commit
   that changes a pattern it documents.** This is the file that stops the next agent
   repeating a solved mistake.
3. **`art/*.md` — per-wave results docs.** `MESHY_WAVE.md` (the 31-character
   generation wave), `MESHY_SLATE.md` (the shipping casting slate), `CHARACTER_BIBLE.md`
   (proportion/topology law + producer amendments), `PROMPTS.md` (locked reference-sheet
   template + generation log), `COMP_CARD.md` (art direction).
4. **Domain docs**: `Quest.md` (story + side quests), `Gameplay.md` (roguelite loop,
   items, achievements), `ROADMAP.md` (forward plan), `HANDOFF.md` (recent fixes and
   known issues — check at session start).
5. **Commits.** Message body carries the numbers, not adjectives. Trailer:
   ```
   Co-Authored-By: <model name> <noreply@anthropic.com>
   Claude-Session: <session url>
   ```

**Reporting discipline for any agent finishing a lane:** end with an explicit
*"things that would mislead you if I didn't say them"* section. Every genuinely
useful report in this campaign had one, and several caught defects the builder's own
verification had missed.

---

## 6. Cast facts worth not rediscovering

- 33 combat models, Meshy-generated, ~19.7 MB total (optimized from 289 MB via
  gltfpack meshopt + 1024 JPEG atlases). Committed as tracked runtime assets under
  `public/meshy/`. **The Algorithm is procedural and stays that way.**
- **Never re-derive a runtime GLB from `public/meshy/` itself.** Those files are
  already 1024/JPEG and meshopt-compressed; re-running the optimizer in place
  double-encodes the atlas and its `repack()` does not understand
  `EXT_meshopt_compression` bufferViews. Always start from
  `art/char_refs/meshy_pilot/_raw_runtime/<id>_idle.glb` (2048 PNG, 290 MB,
  gitignored). `meshy-optimize.mjs` defaults `--src=public/meshy` for historical
  reasons — pass `--src` explicitly.
- Combat uses Meshy models by default; **exploration is still procedural v7** and
  must not be touched by combat work. This split is a producer ruling, not an
  accident: portraits for dialog, procedural for the world, Meshy for the fight.
- Reaction roles are **gender-paired** on the sculpt's build:
  `guard {m:a138, f:a420}`, `hurt {m:a174, f:a178}`, `stagger {m:a176, f:a391}`,
  `victory {m:a49, f:a59}`, `attack {m:a191, f:a214}`. Idles are per-character (33-row
  table in `art/MESHY_SLATE.md`). Gendered motion signature survives retargeting and
  is **lower-body only** (stance width, pelvic height); arm carriage carries none.
- The male idle pool is at **exactly zero slack** — 16 clips for 16 male characters.
  One more male character breaks it; roguelite client bodies may share (Alex's ruling).
- **Chad turning his back during a Composure Break is intentional** (Alex, 2026-08-01):
  a gym-bro who breaks and cowers is characterization, not a defect. Do not "fix" it.
- Cold combat entry 0.96–1.35 s against a 2.5 s ceiling; `the_firm` is the closest
  encounter to that ceiling.

---

*If you are an agent reading this cold: read `CLAUDE.md`, then the top three blocks
of `alexmemory.md`, then this file's §2 and §4. That is enough to start. Ask Alex
only for decisions that are genuinely his — taste, canon, scope, spend, and the
merge. Everything else, act and report.*
