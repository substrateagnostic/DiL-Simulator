# THE DISPLAY CASE REBUILD — architecture plan
*2026-07-27. Director: Fable 5. Producer rulings banked in
`~/.claude/projects/C--Users-agall-projects-DiL-Simulator/memory/aaa-direction-ruling.md`.*

## Art bible (one line)
**A lacquered miniature of corporate life — Severance-lit inside, parked in a
Drive (2011) / Tron: Ares night — with fights shot like Clair Obscur.**
Characters read as real people in miniature, not cartoons. UI and palette are
extended, never replaced. COLOR IS GOOD: saturated pops against the dark stay.

## Producer rulings (2026-07-27, live)
1. Direction A primary (Link's Awakening display-case diorama × Severance
   interiors) + Direction C combat graft (Clair Obscur / Persona 5).
2. RetroPass → OFF by default; preserved as unlockable "1998 mode" cosmetic.
3. Characters: REAL, not cartoonish (the one consistent trust-officer playtest
   criticism). FacePainter may be upgraded/replaced.
4. Night layer: Drive 2011 + Tron: Ares, NOT 80s retrowave. Sodium pools,
   magenta-on-wet-black, obsidian with seam-light edges, haze, restraint.
   "If appropriate" — directional, not law.

## Constraints (non-negotiable)
- Browser-playable at 60fps on mid hardware; Three.js r183 WebGL2 (WebGPU only
  as progressive enhancement, if at all).
- Zero external ASSETS (procedural geometry/canvas textures/WebAudio). npm
  code packages are allowed; reference screenshots for CRITIC EYES ONLY —
  nothing fetched ever ships in the bundle.
- `npm run check` green at every commit. Writing/dialog untouched (his pen).
  Music untouched (his domain). Editor + balance systems keep working.
- Contracts from recon (agent brief, 2026-07-27):
  - Animator refs any new body MUST expose: `leftLeg,rightLeg,leftArm,
    rightArm,body,head,faceMesh,faceTextures,legLength` (+ monolith stubs).
  - `SEAT_Y=0.44` must match `Furniture.chair()` seat if body height changes.
  - Accessory placement math is hard-coded to v4 arm geometry — recompute.
  - `CombatScene.flashEnemy` needs per-mesh swappable `.material`.
  - `Materials.cloth`/FacePainter headless guards (`typeof document`) must
    survive — the data validator runs in Node.
  - Emissive shortcuts feed bloom threshold 0.8 — retune together.
  - RetroPass `strength` uniform is already the 1998-mode toggle.

## Platform ruling (2026-07-27, post-research)
Classic WebGLRenderer + EffectComposer. The TSL/WebGPURenderer node pipeline
is mutually exclusive with our custom shaders and still experimental — future
watch, not tonight. Full rationale + citations: `art/COMP_CARD.md`.

## Execution model (revised from worktrees)
Lanes run as serialized WAVES in the MAIN tree (worktrees lack node_modules →
no check/shoot inside them). Within a wave, parallel agents get DISJOINT file
sets. One dev server (5173) serves the shoot harness for everyone. Commit per
lane on branch `display-case`; `npm run check` before every commit.

## Lanes
**L0 — POST STACK (Engine-level, foundation).** Tilt-shift DoF pass (custom
ortho screen-space gradient blur ShaderPass — the perspective-keyed dof()
node is unusable here; disabled/retuned for combat's perspective cam), AO
(SAO/SSAO first-party or N8AO package — evaluate on ortho), filmic
color-grade pass (replaces RETRO_GRADES as the time-of-day grade carrier so
grades survive 1998-mode being off), bloom retune. RetroPass wired to
settings as cosmetic. Perf budget per COMP_CARD (≤4 full-screen passes,
graceful degradation order: AO → tilt-shift half-res → bloom half-res).

**L1 — MATERIALS (MaterialLibrary v2).** Keep the full API surface + cache
semantics; upgrade returns to lacquered-miniature response (physical or
toon+specular hybrid — prototype both, critic picks). Blast radius:
CharacterBuilder, CombatScene, Furniture, Room. Retune all emissives.

**L2 — CHARACTERS (highest stakes).** CharacterBuilder v5: smooth
real-proportioned procedural bodies (capsule/lathe limbs, rounded shoulders,
necks, real silhouettes per cast member), FacePainter v2 at 512² with real
facial features (lids, iris catchlights, nose/lip shading), LinearFilter,
same expression set. Honor animator contract exactly. After L1 merges.

*L2 addendum (2026-07-27 ~03:35, prototype reviewed by director):* the
scratchpad prototype (proto_chars/chars.js, shots/r7_*.png) is APPROVED as
the skeleton — port its lathe torso + capsule limbs + egg head + curved
face patch (plate mode won the bake-off) + MeshPhysicalMaterial lacquer +
pivot-group contract (kills the v4 bald-flash by construction). Rework in
port, per my eyes on r7: (1) FACES — double feature contrast/size so they
read at GAME camera distances (test at real ortho zoom + combat scale, not
prototype stage); kill Andrew's jaw patch seam; glasses become thin torus
GEOMETRY, never face paint. (2) HAIR — scalp-conforming, no cap-step or
skin gap at the occiput; Karen's bob crown de-helmeted. (3) Port the full
six-expression set (only neutral exists). (4) PERF — mergeGeometries per
character (~50 meshes today, budget ≤300 calls/room) and reconcile
materials with MaterialLibrary v2: physical tier for combat close-ups,
toon+spec hybrid for room NPCs (finally use the dead `detailed` option).
(5) Roll v5 across all ~27 cast configs in characters.js honoring
tone/silhouette fields; SEAT_Y/legLength recheck (0.78 vs 0.44 seat).

**L3 — THE NIGHT (CityBackdrop/BuildingShell/void v2).** Obsidian slab
towers with seam-lights, sodium/magenta pools, wet-reflective street, haze,
slow beacons. Independent of L1/L2 (inline materials — no overlap).

**L4 — INTERIORS (Severance pass).** Per-room fluorescent grid rigs (pooled
cones), sterile-vs-hum contrast (one saturated prop per room), trim/baseboards/
ceiling grid, window glass with night city beyond, furniture upgrade to
penthouse standard, clutter pass. After L1.

**L5 — COMBAT CINEMATOGRAPHY.** Camera choreography via `_basePos` (intro
orbit, attack dolly, crit punch-in, low-angle power moves), obsidian
seam-light arenas per venue, enemy intro banners, anticipation/flinch/impact
frames, speed lines + ability VFX, per-combatant rim light. After L2 for
close-up payoff; camera/arena work may start parallel.

**L6 — LIFE (polish).** Walk/idle/sit animation on new bodies, blink/breath,
emote bubbles, ambient office events. Last.

## Verification architecture ("tuned to the A")
- Reference pack: fetched press stills of the four comps → `art/comp_refs/`
  (gitignored; critics' eyes only).
- Per lane loop: builder agent → `npm run shoot` stills → TWO independent
  critic agents, blind to each other, judge stills against comp refs
  side-by-side ("which reads AAA? what's the sour note?"). Convergent
  criticism = evidence; loop until both critics pass it as AAA-parity.
  Harsh critics by charter: default verdict is NOT YET.
- Producer eye: contact sheets logged to alexmemory.md at every landing;
  RetroPass A/B and any taste fork gets an A/B still pair for Alex.
- Receipts: `npm run check` + shoot suite per merge; merges serialized
  L0→L1→{L2,L3,L4}→L5→L6.

## Fleet (model by temperament)
- Taste-heavy build (L2 characters, L3 night, L5 combat): Fable/Opus agents.
- Mechanical sweeps (L1 blast-radius audit, emissive retune, L4 furniture
  batch): Sonnet.
- Thorny scalpel work (shader debugging, post-pass integration): codex
  (gpt-5.6-sol) with exhaustive briefs.
- Critics: Fable + Opus, independent, per the convergence design.
