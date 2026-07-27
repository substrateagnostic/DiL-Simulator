# COMP CARD — TRUST ISSUES: The Display Case rebuild
*2026-07-27. Synthesized from a 103-agent adversarially-verified research run
(claims cited below survived 2-of-3+ refutation votes; refuted claims listed
last) + Alex's live rulings. Companion to `.claude/plans/display-case-rebuild.md`.*

## Art bible (one line)
**A lacquered miniature of corporate life — Severance-lit inside, parked in a
Drive (2011) / Tron: Ares night — with fights shot like Clair Obscur.**
Characters read as real people in miniature, not cartoons ("directional, not
law" applies everywhere; COLOR IS GOOD — saturated pops stay).

## The comps and what we steal

### 1. Dungeons of Hinterberg (2024) — RENDERING STRATEGY comp
The verified case of an AAA-reading illustrated look built in the renderer,
not in assets [80.lv interview with Microbird, verified verbatim, 6-0].
- **Steal:** per-material stylization control (their deferred material-ID
  channel → our forward equivalent: per-material ramp/tint/rim parameters in
  MaterialLibrary v2); outline system styleable per material (color/width,
  on/off — inverted-hull + selective use, not uniform cartoon edges).
- **Warning (refuted claim):** Hinterberg is NOT texture-free — it leans on
  Substance Designer tileable normal maps [0-3]. Our zero-asset equivalent =
  procedural canvas normal maps (wood grain, brushed metal, carpet weave).
  This is the one unproven-quality-bar item — prototype early.

### 2. Zelda: Link's Awakening remake (2019) — CAMERA/WORLD comp
Tilt-shift miniature-diorama is confirmed authorial intent — Aonuma: "makes
you feel like you're looking into a miniature diorama" [3 outlets, 6-0].
- **Steal:** tilt-shift DoF band (sharp center, blur gradient top/bottom of
  screen — ortho-friendly as a screen-space gradient blur, NOT the
  perspective dof() node); glossy lacquered material response; soft contact
  grounding; the room-as-specimen framing our floating diorama already has.

### 3. Clair Obscur: Expedition 33 (2025) — COMBAT PRESENTATION comp
"Every single move in the game, during battle in particular, is a level
sequence" [Sandfall CTO, GDC 2026; Epic first-party interview — cite these,
not the aggregator blog]. Turn-based combat = bounded rendering budget:
authored camera, scripted timing, predictable asset count [verified 6-0].
- **Steal:** the architecture — a data-driven per-ability cinematic script
  (camera move + animation beat + VFX choreography + timing) bound to
  combatants at runtime, layered on CombatScene's existing hook surface.
  Dramatic rim light on close-ups. Spend the entire per-frame budget on the
  2-4 characters on stage.

### 4. Persona 5 / Metaphor: ReFantazio — UI-AS-IDENTITY comp
Atlus's GDC 2025 session equates the celebrated visual identity with UI
design; UI animations as "emotional accelerators" [primary, 6-0].
- **Steal:** the *principle* — our corporate-terminal UI is a primary AAA
  vector; animate it (punch-ins, wipes, kinetic result banners) in the
  existing red/navy. Triangle-buttons-point-at-actor is directional only
  [single-blog source; two sibling P5 UI claims refuted 0-3 — re-derive
  specifics from screenshots, never from mechanism blogs].

### 5. Severance + American Arcadia — TONE/PALETTE comp (interiors)
Verified formulas [9-0]: Lumon = institutional green against clinical white,
uniform fluorescent TOP-light, zero natural light (DP: "no windows, only top
lighting"). American Arcadia = desaturated dark world where "the only color
comes from the TV screens" — the shipped-game precedent for our
saturated-accents-in-the-void strategy.
- **Steal:** emissive ceiling-panel light pools, no sun, sterile
  white/green/beige interiors with ONE saturated humming prop per room;
  monitors as the only saturated light sources in dark scenes.

### 6. Drive (2011) + Tron: Ares — NIGHT LAYER comp (Alex's ruling #4)
Not researched-verified (film grammar, banked from the director's chair):
sodium pools on true black, magenta neon on wet reflection, obsidian slabs
with light in seams/edges, haze, restraint. NO 80s sunset-grid/VHS kitsch.

## Platform ruling (L0)
**Classic WebGLRenderer + EffectComposer for this rebuild.** The first-party
TSL stack (GTAO/bloom/DoF nodes, verified in three@0.183.2) requires the
experimental WebGPURenderer node pipeline and TSL rewrites of every custom
shader — mutually exclusive with our current renderer [verified 21-0, with
that exact caveat]. All targets are achievable classic-side: custom
tilt-shift ShaderPass (the ortho-compatible approach; the dof() node is
perspective-keyed anyway — open question resolved in our favor), SAO/SSAO or
N8AO for AO, LUT/grade ShaderPass, inverted-hull outlines. WebGPU/TSL
migration = future watch, noted, not tonight.

## Perf budget
60fps on mid-range laptop WebGL2, 30fps floor on recent mobile. Post chain
≤4 full-screen passes (AO + bloom + tilt-shift + grade; RetroPass only when
1998 mode is on). Draw calls: room scenes ≤300, combat ≤150. Degrade
gracefully: AO off → tilt-shift half-res → bloom half-res, in that order.

## Refuted / do-not-chase
- Hades II as comp: its look is bespoke hand-drawn 2D authorship (Jen Zee),
  unstealable by a procedural pipeline beyond palette/composition [0-3].
- Hinterberg "ships with no textures" [0-3] — see procedural-normals note.
- P5 "strict two-color theme" and "papercut irregularity formula" [both 0-3].
