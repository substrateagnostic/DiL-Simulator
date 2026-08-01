# MESHY COMBAT-CAST WAVE — roster log + results (2026-08-01, overnight)

Producer ruling (alexmemory 08-01 ~03:30): **Meshy rigged GLBs replace procedural
characters IN COMBAT ONLY**, behind the `?meshy` dev flag. Exploration keeps the
procedural v7s. Andrew + Karen shipped in the pilot (commits 1636841 / 3e4a5c5 /
2023cf7). This wave delivered the rest of the combat cast: **31 characters
generated, rigged, animated, downloaded, wired, and contact-sheeted.**

Pipeline per character: multi-image-to-3d (A-pose plate crops from ONE sheet,
`remove_lighting`, ~30k polys, canon `height_meters`) → rigging (height again) →
one calm idle clip → toon-ramp conversion at load (`getHouseGradientMap`, kills
PBR shine). Every artifact downloaded on task success (Meshy purges at 3 days)
to `art/char_refs/meshy_pilot/<id>/` (gitignored); runtime GLBs in
`public/meshy/` (gitignored, verified). Tools: `tools/meshy-cast-pipeline.mjs`
(manifest-driven, resume-safe, per-task credit attestation, `--redo-anim`),
`tools/meshy-cast-shoot.mjs` (bind/idle stills + 6-frame clip strips).

## Roster + results

Sources: `ENCOUNTERS` (incl. multi-enemy `enemyIds`), `ENEMY_STATS`,
`ALLY_STATS` via Loop-In/party (up to 2 recruited allies join ANY encounter —
CombatState:41-56), `ClientGenerator` visual config space.
**Excluded**: `algorithm` (producer order — the monolith stays procedural) ·
karen/andrew (pilot) · exploration-only NPCs.

### The two overnight findings that reshaped the wave

1. **Prop-clamped plates poison reconstruction.** 19 of 24 existing turnaround
   sheets predate the hands-clear law and hold a prop against the body
   (clipboard/laptop/binder under the arm). Three were submitted as-is to test
   the boundary: ross_boss and regional came back with the putter FUSED along
   both forearms/fists; security_guard's flashlight duplicated into fist + belt.
   All three were plate-regenerated (props deleted, wide A-pose) and
   re-generated clean — the free-retry lottery was skipped deliberately: a prop
   drawn in three views is signal, not reconstruction noise (unlike Andrew's
   pilot hands case). Failed attempts archived under
   `<id>/attempt1_prop_fusion/` (instructive rejections, playbook §5.6).
   **Clean plates → clean models held with zero exceptions across 31 models.**
2. **The catalog's numbered "Idle" clips are not all idles.** Of the 16
   DailyActions/Idle standing clips, seven are gestures — arm stretch (12),
   crouch-sway (248), boxing guard (250), reach-lunge (253), presenting-push
   ending in a kick (254), greeting wave (599), and a walk-ish weight shift (0).
   The true calm pool is **nine clips: 243, 244, 245, 246, 247, 249, 251, 252,
   11**. Every character was audited on a 6-frame clip strip; 14 wrong-register
   clips were swapped via animation-stage redos (3 cr each) without touching
   the rigs. Distinctness law final form: Andrew (243), Karen (247) and the four
   allies (janet 244, alex_it 245, isaiah 246, diane 11) reserve their clips
   globally; enemies/clients draw from {249, 251, 252} with uniqueness inside
   every co-present fight group (trio/duo/firm verified).

### Enemies (21)

| id | height_m | idle | bind verdict |
|---|---|---|---|
| intern | 1.68 | 249 | PASS — regen plate (folder stack deleted); suit + glasses clean |
| chad | 1.88 | 251 | PASS — regen (shaker deleted); cap/chain/muscle read; calm hold |
| grandma | 1.50 | 249 | **PASS — the wave's cloth win.** Shawl genuinely drapes, lace edge intact, skirt falls as cloth. **Her cane did not survive** — Meshy dropped it entirely (hands empty). Better than fused; procedural exploration grandma keeps hers. |
| compliance | 1.78 | 252 | PASS — regen (clipboard deleted); sunglasses read |
| regional | 1.80 | 251 | PASS — regen after putter-fusion attempt1 (archived); light scratch noise on dark suit (cast-wide trait, see caveats) |
| ross_boss | 1.73 | 252 | PASS — regen after putter fused along BOTH arms in attempt1 (archived); belly reads in profile, startled Skip face intact |
| security_guard | 1.88 | 249 | PASS — regen after flashlight duplication (archived); duty belt kept |
| hr_rep | 1.65 | 251 | PASS — regen (folio deleted) |
| restructuring_analyst | 1.76 | 252 | PASS — regen (laptop deleted) |
| brand_consultant | 1.80 | 249 | PASS — regen (portfolio deleted); rust blazer + blond sweep |
| corporate_lawyer | 1.83 | 251 | PASS — regen (portfolio deleted); three-piece reads |
| data_analytics_lead | 1.77 | 252 | PASS — regen (tablet deleted) |
| cfos_assistant | 1.75 | 249 | PASS — regen (folio deleted) |
| chief_of_restructuring | 1.86 | 252 | PASS — regen (clipboard deleted); broad silver chief |
| rachel_boss (Meredith) | 1.70 | 249 | **PASS — second cloth win.** Pencil skirt drapes clean, tights/heels/silver bob/pearls all read |
| regional_director | 1.85 | 251 | PASS — regen (briefcase deleted) |
| parking_enforcer (Reyes) | 1.68 | 252 | PASS — regen (ticket device + chalk deleted, duty belt kept). Shoulder patches read over-bright under the toon ramp (minor) |
| networking_guy | 1.80 | 249 | PASS — regen (phone deleted, arms down from the raised-arm pose that broke A-pose law) |
| firm_partner | 1.82 | 249 | PASS — regen (portfolio deleted) |
| firm_associate | 1.78 | 251 | PASS — regen (clipboard deleted) |
| firm_paralegal | 1.62 | 252 | PASS — regen (binder deleted); skirt suit + cravat drape well |

### Loop-In bench allies (4)

| id | height_m | idle | bind verdict |
|---|---|---|---|
| janet | 1.63 | 244 | PASS — regen (mug deleted); cardigan drapes; calm weight-shift idle |
| alex_it | 1.78 | 245 | PASS — only sheet in the cast that passed inspection as-is; hands articulated, shirt pattern crisp |
| isaiah | 1.77 | 246 | PASS — first-ever sheet for him (portrait-ref'd); glasses + beard read |
| diane | 1.68 | 11 | PASS — regen (clipboard deleted) |

### Roguelite client body pool (6)

Modular sheets regenerated WITH baked hair (a fixed GLB cannot composite the
old bald-bust modular system); neutral grey = runtime-tintable. Single
front-view submissions (pilot-proven).

| id | height_m | idle | verdict |
|---|---|---|---|
| client_m_young | 1.75 | 249 | PASS — default `reception_client` body |
| client_m_athletic | 1.86 | 251 | PASS |
| client_m_heavy | 1.80 | 252 | PASS |
| client_m_elder | 1.62 | 251 | PASS — stoop reads |
| client_f_pro | 1.68 | 252 | PASS |
| client_f_elder | 1.58 | 249 | PASS |

`MESHY_MODELS.reception_client` → client_m_young. Per-client body selection +
tinting = producer-gated second pass (alongside better calm stances,
block/status stances, per-move reaction clips — noted, not implemented).

## Spend (per-task consumed_credits, never balance deltas)

- 31 characters × (30 base + 5 rig + 3 anim) = 1178 cr
- 14 animation-stage redos (wrong-register catalog clips) × 3 = 42 cr
- 3 archived prop-fusion attempts (ross_boss, regional, security_guard) = 114 cr
- **Wave total: 1334 cr** (pilot's 90 cr not re-counted). Balance 6160 → ~4826.

Plate regens: 22 sheets + 2 recovery re-rolls via codex imagegen — zero credits
(subscription path; the cost is wall clock, ~90-150 s/sheet, and plan rate).

## Honest caveats for the morning review

1. **Grandma's cane is gone in combat** (Meshy dropped it; her fused-cane
   alternative was worse). If the cane matters at fight distance, it needs a
   prop-attachment pass (bone-socketed engine prop, not baked geometry).
2. **Dark suits carry faint light scratch-noise** in the baked base-color
   (visible at inspection zoom on regional/corporate_lawyer/compliance/
   regional_director; subliminal at fight distance). Texture-space artifact of
   remove_lighting on near-black fabric — a known cost, not a blocker.
3. **Some clip strips show subtle turning** during long holds (Idle_5 on
   alex_it). Calm register, but stage-facing drift is possible on long combat
   turns; the CombatScene outer-group rotation is unaffected (yaw is driven by
   the game, not the clip root).
4. **parking_enforcer's shoulder patches** read over-bright (near-white) under
   the house ramp.
5. **The clip-register catalog audit is empirical, not exhaustive** — the seven
   condemned actions were judged from 6-frame strips at 0.8 s spacing; a clip
   could hide a gesture between samples. Every strip is on disk under
   `<id>/shots/clip_strip.png` for spot-checking.
6. **Naming ledger note:** `rachel_boss` internal id stays (save-safety);
   display name Meredith Sterling everywhere player-facing.
7. Sheets for janet / parking_enforcer / networking_guy / firm_partner on disk
   may differ cosmetically from the submitted crops (concurrent retry lanes
   overwrote the sheet file after cropping; the crops that fed Meshy are the
   verified ones, stored alongside).

## Ops log (compressed)

- 22 plate regens + isaiah + 2 client sheets via codex imagegen across 7 lanes;
  4 transient no-path failures recovered by re-run or direct pull from
  `~/.codex/generated_images` (the render usually exists even when the path is
  not echoed — check there before re-spending).
- One self-inflicted failure: editing `regen-lane.sh` while lanes were mid-loop
  corrupted the running bash interpreters' file offsets and killed lanes A/C/D
  at their final items (bash re-reads script files during execution — never
  edit a lane script with lanes live; clone it). All items recovered.
- Three codex sessions wedged 10-15 min (rachel_boss ×2, networking_guy,
  parking_enforcer); killed + relaunched in fresh lanes, which succeeded
  immediately each time.
- Meshy base-stage queue slowed from ~3 min to ~8 min mid-wave (02:30-02:45);
  no failures, no rate-limit rejections. All Meshy tasks SUCCEEDED — zero
  generation failures across 31 base + 31 rig + 45 anim tasks.
