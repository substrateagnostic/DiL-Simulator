# charmetrics — vendored review instruments

Source: https://github.com/img2threejs/img2threejs
Pinned commit: `acd252c182ee3c48154f5f112d731a62aea2dea6` (2026-07-30)
License: Apache License 2.0 — full text copied into [`vendor/LICENSE`](vendor/LICENSE).

## Why

The img2threejs pilot (run against this same pinned SHA, in a scratch clone,
prior to this vendoring pass) concluded:

> **ADOPT-MEASUREMENT-ONLY** — the Stage 4 review instruments (deterministic,
> zero-token, stdlib-only render↔reference comparison) are worth adopting as a
> standalone measurement tool for TRUST ISSUES character/prop art review. The
> rest of the img2threejs pipeline (spec generation, codegen, orchestration)
> is out of scope — this project doesn't build Three.js assets that way.

This directory vendors only the review/diagnostic instruments named in that
verdict, plus every module they transitively import (traced by hand — see
below). Nothing here is wired into the game's build, and nothing here writes
to game data; it is a standalone CLI (`run.py`) invoked by hand against a
render PNG + a reference PNG.

## What's vendored, and why each file is here

Requested instruments (the four files named in the vendoring task):

| File | Role |
|---|---|
| `forge/stage4_review/divine_eye.py` | The 12-signal deterministic render↔reference ensemble + hard-gate verdict/routing. |
| `forge/stage4_review/diagnose_render.py` | Tier-1 cheap diagnostics (silhouette IoU, aspect/scale delta, symmetry, per-part colour delta, geometry integrity) — divine_eye.py imports 5 functions from it. |
| `forge/stage4_review/per_feature.py` | Per-feature (identity-defining feature) pass/fail gating. Self-contained — no local imports, pure logic over pre-computed scores. |
| `forge/stage1_intake/check_reference_admission.py` | Reference-admission gate — rejects a reference before it's ever compared against (empty/fragmented/too-small/duplicate). |

Transitive dependencies (pulled in because the four files above import them —
traced by grepping every `import`/`from` and every `sys.path.insert` in the
closure until it stopped growing; all confirmed stdlib-only, see below):

| File | Why it's needed |
|---|---|
| `forge/stage4_review/objectness.py` | `divine_eye.py` imports `objectness_similarity` (the OSIM-lite structural signal). |
| `forge/stage4_review/geometry_integrity.py` | `diagnose_render.py` imports `measure_geometry_integrity`. |
| `forge/stage1_intake/extract_pbr_evidence.py` | `build_foreground_mask` + `load_image` (pure-Python PNG decode + foreground masking) — imported by nearly everything above. |
| `forge/stage1_intake/extract_part_color_recipe.py` | `diagnose_render.py` imports `lab_distance`, `lab_kmeans_palette`, `srgb_to_lab` for per-part colour delta. |
| `forge/stage3_build/orchestrate_passes.py` | `diagnose_render.py` imports `DEFAULT_PASS_ORDER`, `load_spec` (used only to decide whether colour delta is gated for the current build pass). |
| `forge/_shared/color_metrics.py` | `divine_eye.py` imports `ciede2000`, `srgb_to_lab` (CIEDE2000 colour distance for hue-zone parity). |
| `forge/_shared/image_hash.py` | `divine_eye.py` + `check_reference_admission.py` import pHash helpers (`phash_from_image`, `normalized_similarity`, `hamming`). |
| `forge/_shared/artifact_cache.py` | `extract_part_color_recipe.py` imports a small on-disk memoization cache. |
| `forge/_shared/feature_acceptance_policy.py` | `orchestrate_passes.py` imports `feature_gate_failures`. |
| `forge/_shared/status_banner.py` | `orchestrate_passes.py` (and `diagnose_render.py` directly) import `emit_status`/`load_optional_spec` — a stderr/stdout status-line helper. |

14 files total. The relative directory layout (`forge/stage1_intake/`,
`forge/stage3_build/`, `forge/stage4_review/`, `forge/_shared/`) is preserved
exactly as in upstream, because every file above resolves its sibling imports
at runtime via `sys.path.insert(0, str(Path(__file__).resolve().parent / ...))`
— moving a file out of this layout breaks another file's import.

**Not vendored, on purpose:** `forge/stage1_intake/extract_landmarks.py` (the
head-unit/proportion-grid overlay tool). It is a character-authoring aid, not
a review instrument, and — confirmed by tracing every import above — it is
never imported by any of the four requested files or their dependencies. The
`run.py` wrapper checks defensively for a head-unit value in its results and
reports `n/a` when absent, which is always, unless this file is vendored
later.

## Dependency confirmation

Every vendored file's own docstring claims "stdlib only, no PIL/numpy" (this
was independently verified, not just trusted): `grep -rniE 'numpy|PIL'` across
all 14 files returns only docstring prose describing what's *not* used, never
an actual `import numpy` / `import PIL`. **No `pip install` was necessary or
performed** — this repo's existing Python (3.12.12, confirmed >= the
project's stated 3.10+ floor) runs all vendored files as-is.

(The vendoring task pre-authorized `pip install --user numpy` in case it was
needed. It was not needed. Recorded here in case a future signal — e.g. the
Directional Chamfer Distance / OSIM-numpy upgrade documented as "deferred" in
`divine_eye.py`'s own module docstring — is vendored later and does need it.)

## Patch applied

`forge/stage4_review/divine_eye.py`'s human-readable verdict line prints
`→` (U+2192). Windows consoles default `stdout`/`stderr` to the cp1252
codepage, which cannot encode that character — an unpatched run dies with
`UnicodeEncodeError` the moment it tries to print a verdict. Patched by
inserting a guarded `sys.stdout.reconfigure(encoding="utf-8")` /
`sys.stderr.reconfigure(encoding="utf-8")` block immediately after the
stdlib imports, wrapped in `hasattr(...)` + `try/except` so it is a no-op
(never a new crash) if a stream doesn't support `.reconfigure()` (e.g. under
a test harness that swapped stdout for something else). This fixes it at the
source rather than requiring every caller to set `PYTHONIOENCODING=utf-8` or
`PYTHONUTF8=1` in their environment. The same guard is duplicated at the top
of `run.py` itself, since the wrapper also prints the verdict/signal table.

No other vendored file needed this patch: `check_reference_admission.py`,
`diagnose_render.py`, and `per_feature.py` were audited for non-ASCII
characters in code that actually executes at runtime (not just in
docstrings/comments) — their only printed non-ASCII characters are em/en
dashes (U+2014/U+2013), which cp1252 *can* encode. The `→` in `divine_eye.py`
was the only genuine crash.

## Two process rules (documented in `run.py`, not enforced in code)

1. **Reviews use plain-background, no-ground renders.** A ground plane or
   busy backdrop corrupts the foreground mask every signal here is built on.
2. **Form is judged on unlit, map-stripped renders.** Material maps disabled
   so lighting/texture never mask a geometry problem; per-part colour only
   becomes a gated signal from `material-pass` onward.

## Usage

```
python tools/charmetrics/run.py --render <png> --reference <png> [--out <json>]
```

See `run.py`'s module docstring for full behavior (admission check is
non-blocking here — this is a measurement tool, not a pipeline gate).
