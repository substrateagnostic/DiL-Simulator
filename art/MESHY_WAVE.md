# MESHY COMBAT-CAST WAVE — roster log (2026-08-01, overnight)

Producer ruling (alexmemory 08-01 ~03:30): **Meshy rigged GLBs replace procedural
characters IN COMBAT ONLY**, behind the `?meshy` dev flag. Exploration keeps the
procedural v7s. Andrew + Karen shipped in the pilot (commits 1636841 / 3e4a5c5 /
2023cf7). This wave: the rest of the combat cast.

Pipeline per character: multi-image-to-3d (A-pose plate crops from ONE sheet,
`remove_lighting`, ~30k polys, canon `height_meters`) → rigging (height again) →
one calm idle clip from the public catalog → toon-ramp conversion at load
(`getHouseGradientMap`, kills PBR shine). All artifacts downloaded immediately
(Meshy purges at 3 days) to `art/char_refs/meshy_pilot/<id>/` (gitignored);
runtime GLBs in `public/meshy/` (gitignored, verified). Spend attested per-task
via `consumed_credits`, never balance deltas.

## Enumerated combat roster

Sources: `ENCOUNTERS` (src/data/encounters/index.js, incl. multi-enemy
`enemyIds`), `ENEMY_STATS` (src/data/stats.js), `ALLY_STATS`
(src/data/allies.js) via Loop-In/party (up to 2 recruited allies join ANY
encounter — CombatState:41-56), `ClientGenerator` visual config space
(reception roguelite, combat-only, runtime-tinted).

**Excluded**: `algorithm` (producer order — the monolith stays procedural,
untouchable) · `karen`, `andrew` (pilot, done) · exploration-only NPCs (janitor,
ross, rachel, rachel_to, delia, bus_driver, records_clerk, diner_regular,
barista — never in combat).

### Idle-clip law for this wave

Public catalog (GET /web/public/animations/resources) has **16 calm standing
idles** (DailyActions/Idle: ids 0, 11, 12, 243–254, 599). Cast is 31 — strict
cast-wide uniqueness is impossible. Rule applied instead: **clips are unique
within any set that can share a screen.** Andrew (243), Karen (247) and the four
bench allies (janet 244, alex_it 245, isaiah 246, diane 248) reserve their clips
globally (allies can appear beside any enemy); multi-enemy groups are internally
unique; solo enemies reuse only clips of characters they can never stand beside.
All mixers at 0.8× timeScale (pilot law: breathing, not fidgeting).

### Enemies (21)

| id | encounter(s) | co-present with | plate verdict (inspection) | height_m | idle |
|---|---|---|---|---|---|
| intern | intern (tutorial) | allies | **REGEN** — folder stack clutched to chest, all views (the Andrew stump-arm failure mode) | 1.68 | 11 |
| chad | chad | allies | **REGEN** — shaker bottle overlaps thigh silhouette in profile | 1.88 | 12 |
| grandma | grandma | allies | **AS-IS (experiment)** — cane + shawl + long skirt; the wave's designated cloth case; hands grip cane clear of body | 1.50 | 249 |
| compliance | compliance | allies | **REGEN** — clipboard pinned to flank, all views | 1.78 | 250 |
| regional | regional | allies | **AS-IS** — putter held clear of body, daylight in all views (thin-prop risk accepted, free retry lever) | 1.80 | 251 |
| ross_boss | ross_boss | allies | **AS-IS** — putter mostly clear; shaft crosses leg only in 3/4 (risk noted) | 1.73 | 252 |
| security_guard | security_guard, patch_defense | allies | **AS-IS** — flashlight at thigh in profile is the one risk; body otherwise clear | 1.88 | 253 |
| hr_rep | hr_rep | allies | **REGEN** — clipboard pinned to flank | 1.65 | 254 |
| restructuring_analyst | restructuring_analyst, restructuring_trio | trio, janet, allies | **REGEN** — laptop clamped under arm | 1.76 | 250 |
| brand_consultant | brand_consultant, restructuring_trio | trio, allies | **REGEN** — portfolio clamped under arm | 1.80 | 249 |
| corporate_lawyer | corporate_lawyer, restructuring_trio | trio, allies | **REGEN** — portfolio clamped to flank | 1.83 | 251 |
| data_analytics_lead | data_analytics_lead, data_analytics_duo | cfos_assistant, allies | **REGEN** — tablet against flank | 1.77 | 252 |
| cfos_assistant | cfos_assistant, data_analytics_duo | data_analytics_lead, allies | **REGEN** — folio against thigh | 1.75 | 253 |
| chief_of_restructuring | chief_of_restructuring | allies | **REGEN** — clipboard under arm | 1.86 | 599 |
| rachel_boss | rachel_boss (Meredith Sterling) | allies | **REGEN** — tablet against skirt/hip; pencil-skirt rig risk noted for bind inspection | 1.70 | 0 |
| regional_director | regional_director | allies | **REGEN** — briefcase against leg in 3/4, absent in profile (view inconsistency) | 1.85 | 11 |
| parking_enforcer | parking_enforcer (Reyes, she) | allies | **REGEN** — ticket device + chalk in hands, device overlaps thigh in profile | 1.68 | 12 |
| networking_guy | networking_guy | allies | **REGEN** — phone held up in bent arm, breaks neutral A-pose law | 1.80 | 249 |
| firm_partner | the_firm | firm trio, allies | **REGEN** — portfolio clamped to flank | 1.82 | 254 |
| firm_associate | the_firm | firm trio, allies | **REGEN** — clipboard clamped to flank | 1.78 | 599 |
| firm_paralegal | the_firm | firm trio, allies | **REGEN** — binder clamped to flank | 1.62 | 0 |

### Loop-In bench allies (4)

| id | plate verdict | height_m | idle (globally reserved) |
|---|---|---|---|
| janet | **REGEN** — travel mug overlaps thigh in profile | 1.63 | 244 |
| alex_it | **PASS AS-IS** — empty hands, daylight at wrists, true A-hang, all views | 1.78 | 245 |
| isaiah | **GENERATE** — no turnaround sheet exists (only ally missing one); full locked-template sheet, style-ref his own portrait | 1.77 | 246 |
| diane | **REGEN** — clipboard clamped to flank | 1.68 | 248 |

### Roguelite client body pool (6)

Clients exist only in combat (`reception_client`, config overwritten per fight)
and will be runtime-tinted. The existing `_client_modular_bodies(_f)` sheets are
ideal single-view Meshy inputs (A-pose, daylight, neutral grey) but **bald by
design** (modular head row) — a fixed GLB can't composite hair at runtime, so
the wave regenerates the two rows WITH baked neutral hairstyles and crops six
single-view bodies. Single-view submission is pilot-proven (AABB ratio 0.78,
no cardboard-standee failure).

| id | archetype (covers) | height_m | idle |
|---|---|---|---|
| client_m_young | slight-young male (intern/Small Business/Trust Fund visual) | 1.75 | 250 |
| client_m_athletic | broad-trim male (chad visual: Entrepreneur/Athlete/Crypto) | 1.86 | 251 |
| client_m_heavy | broad-heavy male | 1.80 | 252 |
| client_m_elder | elderly male (Retiree/Widower) | 1.62 | 253 |
| client_f_pro | professional female (karen visual: Divorcee/Dynasty/UHNWI) | 1.68 | 254 |
| client_f_elder | elderly female (grandma visual: Retiree/Widow/Foundation) | 1.58 | 599 |

`MESHY_MODELS.reception_client` wires to `client_m_young` as the default body;
per-client body selection + tinting is the second pass (producer-gated, like
better stances and reaction clips — noted, not implemented).

## Plate regen law (applied to all REGEN rows)

One sheet per character via codex imagegen, style/identity-ref'd against the
character's OWN existing sheet (strongest identity anchor, no real-person
references ever); the ONE change requested: hands EMPTY, hanging relaxed and
CLEAR of the body with visible background between hand/wrist and hip/thigh in
every view including profile; held props deleted. Locked three-view template,
proportion law, hygiene block; no hand-callout row (Meshy input plates, cropped
away anyway). Regens live in `art/char_refs/meshy_pilot/<id>/input/` — the
`char_refs/generated/` sheets remain the CharacterBuilder reference authority.

## Status log

- 2026-08-01 (pre-generation): roster enumerated and logged; balance 6160 cr.
- Task IDs, per-task consumed_credits, bind verdicts: filled in as the wave
  lands (see final columns + report).
