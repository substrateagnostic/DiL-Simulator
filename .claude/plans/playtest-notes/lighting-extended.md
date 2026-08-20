# The extended lighting pass — 28-room census, four fixes, one key

**Date:** 2026-08-20 · **Branch:** display-case · **Commit:** `71ef1e7`
**Instrument:** `tools/_xl-census.mjs` (new, committed) · **Stills:** `screenshots/lighting-extended/{before,after,before-reconstructed}/`
**Method:** every shot through the shipping fixture boot against `npx vite preview --port=4517` (never the dev server), `qtier=high` pinned, flicker frozen, dir restored to base, Andrew hidden, camera at room centre at shipping zoom 1.0. **Acts pinned per shot and named:** act4 (afternoon grade) is the primary comparison column — the same pin the b25/b26 instruments used — with an act7 (predawn) column beside it, because the skyline is a story clock and the GRADE moves with it. Post-game rooms get their flags through the shipping loaders in-page, never patched onto a built room.

**The metric.** Whole-frame luma is ~85% city backdrop, so the census measures the **room plate** — the floor rect's four corners projected through the live camera, point-in-quad per pixel, off the PNG file (never the canvas). Plus the two b26 house fractions off an unbatched build (`window.__mergeStatics = false`): **pool bounding area / floor area** and **double-covered fraction**. West/east half-plates are measured too (the number a half-lit fiction is checked by).

---

## 1. The census (act4 plate, mean/sd Rec.709 luma; cover/dbl = rig pool fractions)

| room | profile | fixtures (m) | cover% | dbl% | pts | act4 mean/sd | verdict |
|---|---|---|---|---|---|---|---|
| cubicle_farm | office | 5 × 4.93 | 26.1 | 0 | 0 | 78.7 / 63.6 | CLEAR — **letter B is live** (5 fixtures; the 47%/0.5% house reference was the 9-fixture incumbent) |
| break_room | warm | 4 × 5.76 | 46.7 | 1.7 | 0 | 86.0 / 73.7 | CLEAR |
| skip_office | office | 2 × 1.76 | 23.6 | 0.5 | 0 | 63.7 / 56.3 | CLEAR |
| skip_office_large | office | 4 × 3.76 | 44.5 | 0.5 | 0 | 64.5 / 55.5 | CLEAR |
| conference_room | office | 2 × 3.76 | 27.8 | 0.3 | 0 | 38.9 / 53.4 | CLEAR (mean dragged by the dark table; pools/whiteboard read) |
| server_room | utility | 4 × 1.76 | 47.5 | 0 | 6 | 26.8 / 38.9 | CLEAR — reproduces its b26 fix exactly (47.5%/0%) |
| reception | office | 2 × 4.76 | 29.0 | 0.3 | 0 | 68.1 / 70.7 | CLEAR |
| parking_garage | utility | 2 × 10.26 | 77.3 | 3.5 | 3 | 80.0 / 68.5 | CLEAR — the tolerated 77%; reads coherent, long strips are garage grammar |
| executive_floor | office | 4 × 5.76 | 39.9 | 0.3 | 0 | 58.5 / 52.8 | CLEAR |
| **stairwell** | utility | **0 — rig never builds** | 0 | 0 | 0 | 82.8 / 26.7 | **STRUCTURAL** — see §4: `applyRoomFX` early-returns on `floorZones`, so its declared fx block is dead data; flat sourceless grey (lit% 96.7) |
| archive | warm | 4 × 3.76 | 53.3 | 2.7 | 1 | 38.7 / 45.2 | CLEAR — one of the best-reading rooms in the game |
| hr_department | office | 4 × 5.76 | 47.8 | 0.4 | 0 | 59.3 / 68.4 | CLEAR |
| vault | utility | 1 × 4.26 | 43.3 | 0 | 1 | 26.9 / 43.5 | CLEAR — single-bar shape is in-family for an 8×8 strong-room; pool anchored, fractions inside house norms |
| board_room | warm | 4 × 5.76 | 46.7 | 1.7 | 0 | 38.4 / 47.3 | CLEAR |
| **penthouse** | none | 0 | 0 | 0 | 8 | 30.4 / 33.7 (act7 lit% **52.1**) | **INDICTED** — sourceless hardwood gloss plateau at the finale; fixed §2 |
| **penthouse_expanded** | none | 0 | 0 | 0 | 9 | 33.8 / 32.3 | **INDICTED** — same defect; fixed §2 |
| penthouse_aquarium | none | 0 | 0 | 0 | 6 | 34.5 / 30.7 | CLEAR — tanks/cinema screens own the room; silence chosen |
| penthouse_analytics | none | 0 | 0 | 0 | 11 | 28.8 / 38.3 | CLEAR — dark ops-center, the analytics wall is the light story |
| floor_13 | none | 0 | 0 | 0 | 1 | 16.2 / 28.5 | CLEAR — deliberately dark, deliberately silent |
| penthouse_bar | none | 0 | 0 | 0 | 14 | 14.1 / 25.6 | CLEAR — the hand-tuned near-black lounge |
| city_street | none | 6 extras | 97.0 | 48.4 | 0 | 82.8 / 41.5 | CLEAR — hand-tuned lamppost rig; the 48.4% double-cover is authored overlap of 0.13-opacity sidewalk strips under 0.52 lamp pools, sub-perceptual by construction |
| **transit_bus** | utility | 1 × 8.26 | **75.5** | 0 | 0 | **29.9 / 23.6** | **INDICTED** — flattest fixture room in the game, wall-to-wall wash; fixed §2 |
| records_hall | warm | 4 × 6.76 | 40.6 | 1.3 | 1 | 48.6 / 46.6 | CLEAR — long amber strips read as archival pendants over the stacks |
| luckys_diner | warm | 2 × 3.76 | 33.3 | 1.7 | 0 | 68.8 / 54.3 | CLEAR |
| old_branch | warm | 4 × 4.76 | 54.9 | 2.3 | 0 | 43.1 / 51.3 | CLEAR |
| old_vault | utility | 1 × 4.26 | 43.3 | 0 | 1 | 31.9 / 47.2 | CLEAR — same single-bar family as vault; abandoned-murk is the fiction, walls carry it |
| **bathroom** | utility | 1 × 4.26 | 57.8 | 0 | 0 | **84.6 / 62.0** | **INDICTED** — second-brightest room in the game while its own fiction says half-lit; fixed §2 |
| copy_room | office | 2 × 2.76 | 29.8 | 0.4 | 0 | 88.9 / 63.5 | CLEAR — brightest room; a copy alcove full of white machines, sd healthy |

Headline: **the rig grammar holds almost everywhere it reaches.** Of 28 rooms, 23 clear on numbers + eyes, one is structurally unreachable by the rig (stairwell), and four were indicted and fixed. No profile-table edits — every fix is room-scoped.

---

## 2. The four fixes (all in `rooms/index.js` fx blocks; one new Engine key)

Judge: one Fable-high pass on all four pairs — **verdict recorded in §2b below.**

### transit_bus — the wall-to-wall wash
The utility profile (sized for the parking garage) gave a 12×5 bus ONE 8.26 m bar whose pool was 10.46 × 4.4 m = **75.5%** of the floor at a fixed 0.26 opacity: "a floor that is somehow lit anyway", with nothing left dark and the benches unreadable (plate 29.9/23.6, flattest fixture room in the game). The one-strip fiction is authored ("a bus interior is one flickering strip and nothing else") and stays: the strip is **hand-authored now at the exact position/length the rig derived** (x 5.5, z 2, 8.1 m), pool 8.5 × 2.8 (**39.7%**) hugging the aisle at **0.40**, and the interior base lifted (ambient 0.6→0.78, dir 0.6→0.72, flicker untouched) so the bus reads as a **lit capsule against the goldenhour street**. Measured: 29.9/23.6 → **35.7/25.9**.

### bathroom — the fiction was already in the file
The room comment says *"One strip, and the tube over the mirror is dead"* and `ROOM_THOUGHTS` says *"one working fluorescent and one dead one"* — the rig delivered one centred always-lit bar and the **second-brightest plate in the game** (84.6 mean). Now: two hand-authored tubes at the rig's own perRow-2 positions (x 2.25 / 4.75, z 2.5) — the west one, **over the mirror, is a dead housing** (dark 0x3a4046 tint, zero-opacity pool, no shaft — a dead fixture composed entirely from existing `fx.extra` keys), the east one works and carries the room's only pool (3.4 × 3.6 at 0.30, over the stalls). Base trimmed (ambient 0.66→0.52, dir 0.84→0.64) so the fixture story leads; the dead half stays readable, just visibly unlit. Measured: 84.6/62.0 → **74.5/56.3**; the dead/working halves now sit ~56 luma apart (west 102.4 / east 46.6 — west carries the pale door + sink tile, east carries the pooled stalls).

### penthouse + penthouse_expanded — the sourceless plateau at the finale
The hardwood gloss ramp is a **sourceless 0.12 additive band**; across the near-black act-7 floor it read as the exact "flat milky-grey plateau" the penthouse_bar rider named — lit-anyway fraction **52.1%** of the plate at predawn, sd 25.4, the second-flattest interior. New room fx key **`gloss`** (see §4) set to **0.05**; one warm under-hood wash anchored to the kitchen rangeHood (`housing: false` — the hood IS the fixture, city_street precedent; 4.6 × 2.3 at 0.30). The practicals (rack cyan, screen glows, points) now own the floor. Measured act7: lit% **52.1 → 27.7**, mean 29.7 → 20.6; act4 30.4/33.7 → 21.5/30.5. Same treatment, same coordinates, in penthouse_expanded.
- BEFORE reconstruction for this pair is URL-honest: `?fxgloss=0.12&fxextra=off` (the b26 rule — a replaced rig stays reproducible after the data moves on). The original before-census penthouse@act7 shot was discarded: `_loadRoom` resolves ids, so its post flag had silently loaded penthouse_expanded (the census tool now documents this in `POST_ROOMS`).

### 2b. Judge verdict (one Fable-high pass, all four pairs; one fix round taken)

| pair | verdict | strongest observation |
|---|---|---|
| transit_bus | **PASS** | "the before's floor was one uniform blue-grey tint with no relationship to the fixture; the after's brightness visibly belongs to the strip, and the benches silhouette against it" — conservative but clears the bar |
| bathroom | **PASS** | "the room now performs its own inner-monologue line on sight — dead tube over the mirror, working tube over the stalls, and the asymmetry is unambiguous" |
| penthouse | **PASS WITH NOTE** | plateau gone, floor owned by its practicals — at the price of the south table + standing figure sitting at the threshold of readability |
| penthouse_expanded | **PASS WITH NOTE** | grammatically clean, but the 22×16 de-glossed centre left the south meeting table reading as "unfinished dark rather than authored dark" |

**Overall: PASS — ship after one small legibility touch.** The prescribed fix (the only one, taken): promote the point practical already beside the south conference table into a real low warm tabletop pool, both penthouse rooms, no floor-wide terms. Landed as one `fx.extra` per room (`pool 3.2 × 2.6 at 0.22`, anchored at the table). Re-measured act7: penthouse lit% 27.7 → **38.9** (mean 20.6 → 21.9 — local, not a wash), penthouse_expanded 23.3 → **23.5** (mean 17.7 → 17.8). Stills: `screenshots/lighting-extended/after-judgefix/`. Eyes: the table's chairs and the standing figure now read against the warm zone; the mid-floor void stays authored-dark.

---

## 3. Untouched-room proof

Same instrument, same build, after the edits: **cubicle_farm** 78.67/63.56 → 78.65/63.59 (Δ 0.02/0.03), **server_room** 26.75/38.87 → 26.85/39.21 (Δ 0.10/0.34 — two-boot backdrop noise; the lighting-options control measured two boots of one build at 0.85% of pixels), **archive** 38.74/45.23 → 38.74/45.23 (**bit-identical**). The `fx.gloss` key defaults to the incumbent expression, so every room that says nothing builds the same bytes; penthouse_bar's hand-cut 0.035 stays as the fallback arm.

---

## 4. Capability gaps (proposal lane — NOT implemented here)

1. **The stairwell cannot be lit by the rig at all.** `Engine.applyRoomFX` early-returns on `floorZones || slope` — the ENTIRE overlay (fixtures, pools, AO frame, contact blobs, gloss) never builds in the game's one multi-level room, so its declared `fx: { fixtures: 'utility' }` is dead data and the shaft reads as a flat sourceless grey (plate 82.8 / sd 26.7, lit% 96.7 — the highest "lit anyway" number in the census). The fix needs per-zone floor heights: pools/blobs placed at each zone's own y, fixtures hung per landing. That is an Engine lane, not an fx-key edit. Until then the census's CAPTURE-LAW gate will flag stairwell as `room_fx missing` — that is the finding, not a broken capture. (Its fx line should stay: the day the gap closes, the room lights itself.)
2. **A dead fixture is composable but not first-class.** The bathroom's dead tube is `{ tint: dark, opacity: 0, poolW/D: 0.1, shaft: 0 }` — it works, but a `lit: false` extra key (housing only, no sourcing trio) would say the intent in one word and stop the 0.1-m ghost pool plane from being emitted at all.
3. **Rig pool OPACITY has no room-scoped key** — poolW/poolD move the footprint but the profile's `poolOpacity` is shared. transit_bus needed opacity 0.40 and had to leave the profile rig for `fx.extra` to get it. A room-scoped `poolOpacity` would have kept it a two-key fix. (Landed in this pass instead: **`fx.gloss`**, room-scoped gloss-ramp opacity, default-preserving — the same shape as the five existing room-scoped overrides.)
4. **Housekeeping landed with this pass:** `fx.extra` housings now carry the `ceiling_fixture` census name (an unnamed hand-authored tube was invisible to any housing count — the bathroom would have censused as 0 fixtures), and the dev fx boot gained `?fxgloss=` (prefix-gated like every fx param).

---

## 5. The dark cubicle-farm options — surfaced, not flipped

`lighting-options.md`'s **letter B shipped**: the census measures cubicle_farm at **5 fixtures** (`fixtureEvery: 2` live), cover 26.1%/0% — every survivor fully sourced, no orphan pools. Still dark: **`housingScale`** (V4 slimmer housings, `[1, 0.6, 0.6]`) — the b25 COMBO measured a further **−26% hardware area** at the desk framings with sourcing intact, and the key sits in the room's fx block at `null` ready to flip. **Recommendation:** hold. Letter B alone took the F3 hardware area down ~50%; flip `housingScale` only if the playtester still reads clutter at the desk framings after living with B — stacking both without a re-read spends the second lever blind. V3 (dimmed diffusers) stays rejected for the b25 reasons; V2 (all housings off) stays rejected as the documented orphan-pool defect.

---

## 6. Reproduce

```bash
npm run build && npx vite preview --port=4517
node tools/_xl-census.mjs --port=4517                                  # full 28-room census
node tools/_xl-census.mjs --port=4517 --rooms=transit_bus,bathroom \
     --out=screenshots/lighting-extended/check                        # spot re-check
node tools/_xl-census.mjs --port=4517 --rooms=penthouse --acts=act7 \
     --fxq="&fxgloss=0.12&fxextra=off" --out=...                      # penthouse BEFORE, from URL
```
