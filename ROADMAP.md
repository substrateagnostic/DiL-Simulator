# ROADMAP.md — TRUST ISSUES: Path to Release

*Written June 10, 2026, after a full visual/systems review (live playtest via Playwright + code audit).
This is the working plan for the graphics overhaul and the push to release-ready. It supersedes the
never-created `.claude/plans/eager-nibbling-shannon.md` referenced in older docs.*

**The thesis:** the game's writing, systems depth, and UI identity are already strong — near release
quality. The 3D presentation lags far behind them. The fastest path to "drastically better" is not
replacing the engine or importing asset packs; it's a systematic polish layer over the existing
procedural style (palette, light, silhouette, animation, context), plus 2D illustrated art where it
counts most: faces.

---

## Part 0 — Honest Assessment (June 2026)

**Strengths to protect:**
- UI is the best part of the presentation: consistent pixel-font corporate-terminal aesthetic,
  red/navy palette, good toasts/menus/dialog boxes. Don't redesign it — extend it.
- Zero-asset philosophy: all furniture is procedural primitives, all audio is WebAudio synthesis,
  bundle is tiny, editor (`npm run editor`) can re-tune everything. This is a feature. Keep it.
- Writing and satire voice ("Through the north door, up the stairs. Well — there are no stairs.").
- Systems depth: momentum/brace/retaliate/telegraph combat, roguelite loop, 31 achievements,
  cosmetics, renovations, post-game. Content volume is already a 4–6 hour game.

**Weaknesses (ranked by how much they hurt):**
1. **Combat close-ups expose the character models.** A giant flat-shaded box torso with a sphere
   head fills half the screen. Every enemy reads as the same blocky humanoid (already noted in
   HANDOFF known issues). This is the single worst screen in the game — and it's the screen
   players spend the most time on.
2. **Characters have no faces with personality.** Two dot eyes. For a *satire* — a genre that
   lives on facial expressions — this is the biggest missed opportunity.
3. **Rooms float in a flat void.** No exterior context, no window light, no mood lighting; one
   ambient + one directional light for every room. Beige walls with zero trim/texture read as
   unfinished clay.
4. **Animation is minimal.** Sine-wave walk, no squash/stretch, no anticipation on attacks, no
   hit reactions beyond color flash/shake.
5. **Asset quality is inconsistent** — penthouse-era furniture (humidor, mission control desks,
   aquarium) is 10× richer than the base office where players spend Acts 1–4 (desk = two boxes).

---

## Part 1 — Visual Overhaul (highest impact first)

### V1. Dialog portraits (2D illustrated) — BIGGEST WIN PER HOUR
JRPG-style character portraits in the dialog box. The cast is ~27 characters; each needs a base
portrait + 2–3 expressions (neutral / angry / smug / defeated) in one consistent style.
- Generate via Codex `$imagegen2` subagent. Style anchor prompt to develop first: flat-shaded
  corporate-satire illustration, limited palette matching UI (#e94560 red, #1a1a2e navy, beige),
  thick outlines, slight CRT grain. Generate a style-guide sheet, get Alex's sign-off, then batch.
- Wire-up: `DialogBox` is DOM — add an `<img>` portrait slot left of the text, keyed by speaker
  name + optional `mood` field on dialog nodes (default neutral). Portraits slide/punch in on
  speaker change. Store under `src/assets/portraits/` (first binary assets in the repo — accept
  this; faces are worth it).
- Also generate: title screen hero art, act title cards, ending slides (see C4).

### V2. Combat presentation overhaul
The combat screen needs to feel like a JRPG fight, not a model viewer.
- **Silhouettes per enemy** (HANDOFF already wants this): per-character body params in
  `characters.js` (heightScale, widthScale, hunch, headSize) consumed by `CharacterBuilder` —
  Grandma hunched/short, Chad wide/V-torso, Karen forward-leaning with The Bob, Algorithm =
  floating monolith/monitor (no humanoid at all), Rachel sharp/angular. ~1 day, transforms variety.
- **Hit feel**: anticipation wind-up before enemy attacks (lean back 150ms), lunge on attack,
  flinch + knockback on hits, hit-stop (60–100ms freeze on big hits), camera punch-in on crits
  (combat cam is perspective — dolly is easy), white flash material swap on impact,
  `ParticleSystem.burst()` on weakness hits (already exists — use it more).
- **Stage variants**: the swirl shader in `CombatScene._createBackground()` is good — parameterize
  its 4 colors + speed per arena (conference room = hostile red, server room = terminal green,
  board room = cold gold, penthouse = void purple). Cheap, big mood payoff.
- **Enemy intro**: name banner + taunt + slide-in instead of popping into existence.

### V3. Lighting & post-processing pass
- **Per-room light rigs**: room data gets an optional `lighting` block (ambient color/intensity +
  point lights). Server room = cool blue + rack glow pools; break room = warm; archive = single
  hanging bulb cone; penthouse = dusk gold. Engine `_setupLighting()` becomes per-room.
- **Blob shadows**: soft dark circle sprite under every character/large furniture (directional
  shadow map at this scale is mushy). Instant grounding, trivially cheap.
- **Bloom**: add `EffectComposer` + `UnrealBloomPass` (threshold high, strength low) so monitors,
  neon signs, aquarium, emissives actually glow. The CSS vignette in `PostProcessing.js` stays.
- **The void**: replace flat `BG_DARK` clear color with a subtle radial gradient + faint blueprint
  grid (the building's floor plan as the abyss — on-theme). Optionally a thin roof-edge/exterior
  shell on rooms so they read as a building cutaway, plus light shafts from windows.
- **Fluorescent flicker**: cubicle farm directional light intensity wobbles ±2% with occasional
  buzz-flicker. Subliminal office dread.

### V4. Material & environment upgrade (Acts 1–4 rooms first)
- Baseboards + wall trim strips; two-tone walls (darker wainscot band).
- Make `carpetPattern`/`hardwoodPattern` actually visible (contrast is currently too low).
- Windows on exterior walls: canvas skyline (day for office floors, dusk for exec, night for
  penthouse) behind glass panes — the existing movie-screen/canvas-texture pattern does this.
- Bring base-office furniture up to penthouse standard: desk gets legs/drawer/cable tray, chairs
  get stems/casters, monitors get bezels + animated screen canvases (ticker, spreadsheet, email).
- Clutter pass: papers, mugs, sticky notes, wastebaskets, ceiling-tile edge, wall clocks.
  Procedural, same factory pattern in `Furniture.js`.

### V5. Character model & animation pass (exploration)
- Chunkier proportions (bigger head, slight body taper) — tune `CHAR` in `constants.js` + builder.
- Squash/stretch on walk bounce; idle breathing + occasional blink (scale eyes); lean into walk
  direction; sitting NPCs type/sip coffee occasionally (`CharacterAnimator` extensions).
- Simple emote bubbles (!, ?, zzz, ♨) over NPC heads during dialog beats — DOM or sprite.

### V6. Hero moments
- Act transition cards: full-screen "ACT 3 — THE DEEPER LEDGER · *Follow the money. Into the
  basement.*" with art (V1 pipeline) + music sting. The act subtitles already exist in Quest.md.
- Ending slide sequence (epilogue cards per major choice — Suikoden style).
- Title screen: layered parallax office-at-night art behind the existing logo treatment.

---

## Part 2 — Engagement & Length

### C1. Deepen the roguelite (the replay engine)
- **Client gimmick modifiers**: rare clients with combat mutators (litigious → counterattacks,
  crypto bro → HP volatility per turn, day trader → SPD swings). Data lives in `ClientGenerator`.
- **Negotiation beat**: post-victory, before accept/decline, an optional risk/reward choice
  (push for higher AUM at anger cost — uses existing `bossAnger` flag).
- **Personal-best screen**: best single-day AUM, longest accept streak, richest client landed —
  localStorage, shown in Stats tab. Cheap, gives the grind a scoreboard.
- **Whale events**: build on the 5% whale roll — once landed, a one-time follow-up mission.

### C2. Ally personal missions (pattern already proven by Alex's Badge Audit)
One short personal mission each for Janet, Diane, Isaiah, and the Janitor, unlocking in Acts 3–6.
Reward: ally-specific combat assist or cosmetic. This is the highest-value *writing* expansion —
it deepens the cast the finale rallies around.

### C3. New Game+ 
Carry cosmetics/achievements/AUM into NG+; enemies get a stat multiplier + new taunt lines;
1–2 alternate dialog branches per act for knowing-replay flavor. Multiplies existing content for
a fraction of the cost of new acts.

### C4. Boss rush & arcade
`ArcadeState` exists — add a post-game arcade cabinet unlock: boss rush (all story bosses back to
back, par times) and keep score. Uses only existing encounters.

### C5. Ambient life
- Watercooler conversations that rotate per act (overheard snippet bubbles).
- Printer jams, phone rings, elevator dings — ambient event scheduler + synth SFX.
- More `thoughts.js` inner monologue (every room × act combination that's currently silent).

---

## Part 3 — Release Readiness

### R1. Distribution (friends first)
- **itch.io** (free/private or public): `vite build` + butler push script. This is the channel.
- PWA manifest + service worker so it installs/plays offline from the browser.
- One-command deploy: `npm run ship` → build, version-stamp, butler push.

### R2. Robustness
- Save versioning: add `version` to `Player.serialize()`; migration shim in `deserialize()`.
- Error boundary: window.onerror → friendly "The building shuddered" screen + save-preserving
  reload (a crash mid-Act-6 must never eat a save).
- Settings: volume sliders exist; add text speed, screen-shake toggle, fullscreen button.

### R3. QA harness (no test suite exists — fix cheaply)
- **Playwright smoke test**: scripted full-act playthrough using flag presets + EventBus combat
  triggers (see Dev Tooling notes below — proven to work). Run before every release.
- `npm run check` (validate:data + build) already exists — wire it + smoke test into a
  pre-release checklist or GitHub Action.

### R4. Final polish pass
- Full fresh-save playthrough each act, fixing dialog typos/flag bugs found.
- Balance verification with the editor's Combat Sim at levels 1/3/5/8/12/15.
- Mobile/touch verification (TouchControls exist; confirm combat QTEs work on touch).
- Credits screen (Alex + trust office friend + "built with Claude" if desired).

---

## Part 4 — Dev Tooling (accelerates everything above)

### F2 dev panel rewrite (approved by Alex, June 10 2026)
Current panel: save scum + act presets. Add:
- **Room teleport grid** — every room ID as a button (calls `_changeRoom` with gates bypassed).
- **Encounter launcher** — every encounter ID as a button (emit `start-combat` + `dialog-end`).
- **Flag inspector** — searchable list of all set flags, click to toggle, text box to set any flag.
- **Cheats row** — +1000 XP, +1M AUM, give all items, heal, set level N.
- **Position readout** — current room + tile coords (makes placing furniture/interactables sane).

### Playwright playtest notes (hard-won, June 10 2026)
- Keyboard input MUST use `keyboard.down(key)` → `waitForTimeout(~90ms)` → `keyboard.up(key)`.
  Plain `press()` puts keydown+keyup inside one frame and `InputManager.isJustPressed()` misses it.
- Combat can be triggered from the console: `const { EventBus } = await
  import('/src/core/EventBus.js')` (Vite serves the same module instance), then
  `EventBus.emit('start-combat', '<encounterId>'); EventBus.emit('dialog-end');`
- First Karen fight one-shots the player by design (`enemyOverrides { atk: 999 }` tutorial loss) —
  a 1506 damage number is not a bug.
- Reception roguelite is gated until `retry_karen` ("handle the Henderson meetings first").

### Art pipeline (imagegen)
- Codex `$imagegen2` via subagent for all 2D art. Process: 1 style-anchor image → Alex approval →
  batch generation with the anchor prompt prefix → manual curation → `src/assets/portraits/`.
- Keep a `art/PROMPTS.md` log of the exact prompts used per character so future art matches.

---

## Suggested order of attack (subscription window: ~2 weeks from June 10, 2026)

| Days | Work |
|------|------|
| 1–2 | F2 dev panel rewrite (tooling first — it speeds up all later verification). V2 silhouettes + hit feel. |
| 3–4 | V1 portrait pipeline: style anchor → cast batch → DialogBox integration. |
| 5–6 | V3 lighting/post (per-room rigs, blob shadows, bloom, void treatment). |
| 7–8 | V4 base-office material/furniture upgrade + windows. |
| 9 | V5 character proportions/animation, V6 act cards. |
| 10–11 | C2 ally missions (writing-heavy), C1 roguelite deepening. |
| 12 | C3 NG+, C4 boss rush. |
| 13 | R1 itch.io deploy + R2 robustness + R3 smoke test. |
| 14 | R4 full playthrough QA + balance + buffer. |

Each phase: build-check (`npm run check`), screenshot-verify via Playwright, commit. Working
increments — sessions get interrupted; that's design constraint #1.

---

*For future instances: read this file + HANDOFF.md at session start. The game is closer to done
than it looks — protect the writing, protect the zero-dependency philosophy where you can, and
spend the effort where players actually look: faces, fights, and light.*
