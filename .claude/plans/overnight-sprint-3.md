# Overnight Sprint 3 — June 11, 2026

**Brief (Alex + co-creator):** Replace the caricature models. Direction picked from
`art/direction/` boards: **C + A hybrid, applied EVERYWHERE** (battles and exploration share
one builder, as today). PS1-era low-poly realism (Tomb Raider/MGS register): realistic adult
proportions, segmented faceted geometry, **painted canvas face textures** — with a per-character
**satire dial**: high for silly characters, zero + A-board muted palette for scary ones, neutral
for normal people. "Some silly, some scary, some more normal looking."

**Continuation protocol:** same as sprints 1–2. Verify with `npm run shoot` (contact sheet),
commit per phase, update STATUS. Fresh instance: read this + HANDOFF.md Session 7 entry.

## STATUS

| # | Phase | State | Commit |
|---|-------|-------|--------|
| P0 | This doc | DONE | 822579a |
| P1 | PS1 builder (CharacterBuilder v4) + Karen prototype vs board C | DONE | 3eeaa0d |
| P2 | Full-cast rollout with tone dials + accessory re-anchor | DONE (pushed) | e95ff92 |
| P3 | Follow-ups: outdoor street walls, wider 3v1 framing, Delia moods | DONE | e7e5888 + 588a61d |
| P4 | Achievements (7 new), Quest.md+Gameplay.md updates | DONE (balance sim pass deferred to S4) | 12e9b56 |
| P5 | PROMOTED (Alex): full audio anti-repetition overhaul — variation engine (rotating progressions, phrase pools, layered intensity), randomized SFX variants, + new city/Firm themes. As much tonight as fits; rest -> sprint 4. | pending | — |

## P1 technical spec — CharacterBuilder v4 ("PS1 mode")

**Proportions.** Total height stays ~1.45 world units (door/room scale assumes it).
~5.75 head-heights (readability compromise between true-real 7 and chibi 3.5):
head R ≈ 0.125, legs ≈ 0.62, torso ≈ 0.52, arms ≈ 0.52. Keep `CHAR` constants but v4
derives its own dims; do NOT reuse the chibi multipliers.

**Geometry (PS1 hallmarks).**
- Segmented torso: chest box (wider, tapered via `taper`) + pelvis box with a slight gap line.
- Two-segment limbs: upper+lower boxes per arm/leg, lower slightly pre-bent (~0.08 rad).
  Pivot groups stay at shoulder/hip — `leftLeg/rightLeg/leftArm/rightArm` group refs contract
  UNCHANGED (CharacterAnimator swings whole limb; pre-bend sells the joint).
- Head: tapered box (wider at brow, narrower jaw), faceted; hair = thin geometry per existing
  style set (bob/karen/cap/bun/slick/shawl/short) scaled to new head + scalp painted into the
  face texture. Beards painted into texture (drop jaw-block geometry).
- Keep: blob shadow, monolith build untouched, hunch/heightScale/widthScale silhouette params.

**Faces = painted canvas textures (the core trick).**
- `FacePainter.paint(config, expression)` → 128×128 canvas → CanvasTexture, cached per
  (characterId, expression). Painted: skin shading, eyes (size/lid per tone), brows (angle =
  browAngle + expression), nose shading, mouth (expression), blush/wrinkles/stubble per config.
- `config.tone: 'normal' | 'silly' | 'scary'` →
  - silly: features +20% scale, saturated palette, rounder eyes
  - scary: features compressed, heavy lids, desaturate ALL body colors by ~35% (A-board
    discipline), darker eye sockets
  - normal: neutral features, mild desaturation (~12%)
- Expressions (neutral/angry/smug/worried/hurt/victory) = texture swaps.
  `CharacterAnimator.setExpression` keeps its API but swaps `group.faceMesh.material.map`
  from `group.faceTextures[name]`. Combat + dialog-mood wiring unchanged.
- Blink: still eye-mesh based? NO — blink becomes a texture swap too (`<expr>_blink` variant
  painted with closed eyes) OR skip blinking in v4 (acceptable). Decide in build: skip first,
  add if cheap.

**Tone assignments (characters.js `tone` field).**
- silly: chad, networking_guy, intern, ross (mild), karen (mild — satire ~0.5)
- scary: rachel, rachel_boss, firm_partner/associate/paralegal, compliance,
  chief_of_restructuring, regional_director, corporate_lawyer (algorithm = monolith, n/a)
- normal: everyone else (andrew, janet, isaiah, diane, delia, janitor, alex_it, clerk, etc.)

**Known integration risks.**
- `SEAT_Y = 0.44` in CharacterAnimator vs new leg length 0.62: sitting pose needs retune
  (group.position.y = SEAT_Y - legLen → negative; clamp ≥ 0.02 and adjust leg bend).
- Combat stage scale: retune (current 1.9/1.6 was for big-head chibi; slimmer models likely
  want ~2.1/1.8 and camera lookAt back to ~0.85).
- Cosmetic visuals (_addCosmeticVisual) anchored to CHAR constants — re-anchor to v4 dims.
- Accessory handY/handX formulas — recompute from v4 arm construction.
- Exploration readability: verify at room scale via contact sheet; if faces vanish, bump head
  to R 0.135.

## P3 notes
- city_street: `walls: false` + new `facadeStrip` furniture along north (building fronts with
  door/window canvas textures) + low curb meshes south; keep exits working (gates live in
  _changeRoom, not walls).
- CombatScene: multi-enemy → camera z 5→5.8 and lookAt y 0.95→0.9.
- Delia moods: angry/smug/worried, style prefix verbatim from art/PROMPTS.md, base description
  from delia entry; downscale to 256.

## P4 notes
- New achievements (AchievementManager + Gameplay.md table): The Countersignature (charter_certified),
  Honorary Gray Area (meter_war_done), The 5:15 Runs On Time (bus515_done), One More Rememberer
  (daemon_kept), A Finished Shift (daemon_killed), Lap Two (ng_plus on save), Served (defeat the_firm).
- Quest.md: Act 6½ section + Janet/Janitor personal missions.
- Balance: editor combat sim vs city encounters at L8/10/12 — tune CITY ability powers/HP if
  win rates fall outside 60–90%.
