#!/usr/bin/env python3
"""charmetrics — thin CLI wrapper around the vendored img2threejs review instruments.

Usage:
    python tools/charmetrics/run.py --render <png> --reference <png> [--out <json>]

Runs, in order:
  1. Reference-admission gate (vendor/forge/stage1_intake/check_reference_admission.py)
     — rejects a reference that is a meaningless silhouette (empty, fragmented,
     too small, or a near-duplicate of one already admitted). Non-blocking here:
     a rejected reference is reported with reasons, then evaluation proceeds
     anyway, since this wrapper is a measurement tool, not a build-pipeline gate.
  2. Divine Eye render-vs-reference (vendor/forge/stage4_review/divine_eye.py)
     — the 12-signal deterministic ensemble (silhouette IoU, scale delta, aspect
     ratio, symmetry, pHash, SSIM, edge overlap, blowout parity, flat-region
     ratio, tonal parity, objectness, hue-zone parity) plus hard-gate/verdict
     routing. Zero-token, zero-LLM — pure pixel math.

TWO PROCESS RULES (per the img2threejs pilot; not enforced in code here — the
caller is responsible for feeding the right renders in):
  RULE 1 — Reviews (the Divine Eye signal comparison above) use PLAIN-BACKGROUND,
           NO-GROUND renders. A ground plane or busy backdrop corrupts the
           foreground mask that every signal here is built on (silhouette IoU,
           symmetry, edge overlap, blowout/flat/tonal parity all read the masked
           foreground). Render with a flat/transparent background and nothing
           under the subject's feet before comparing.
  RULE 2 — Form (silhouette/proportion/pose) is judged on UNLIT, MAP-STRIPPED
           renders — i.e. material maps disabled (see diagnose_render.py's
           strip_material_maps) so lighting and texture never mask a geometry
           problem. Only from material-pass onward does per-part colour become
           a real (gated) signal — see diagnose_render.py's color_is_gated().

Adoption note: this pilot concluded ADOPT-MEASUREMENT-ONLY — these instruments
are vendored as read-only review/diagnostic tools. Nothing here is wired into
the game's build or asset pipeline; it is invoked by hand (or by a future CI
step) against a render + a reference to get numbers.

Pinned to img2threejs @ acd252c182ee3c48154f5f112d731a62aea2dea6. See VENDORED.md.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# Force UTF-8 stdout/stderr up front (same reasoning as the divine_eye.py vendor
# patch — Windows consoles default to cp1252, which cannot encode the U+2192
# arrows the vendored verdict line prints). Guarded: never crash if the stream
# has already been swapped for something without .reconfigure().
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

VENDOR_FORGE = Path(__file__).resolve().parent / "vendor" / "forge"
sys.path.insert(0, str(VENDOR_FORGE / "stage1_intake"))
sys.path.insert(0, str(VENDOR_FORGE / "stage4_review"))

from check_reference_admission import check_admission  # noqa: E402
from divine_eye import evaluate  # noqa: E402

# Signal display order/labels — mirrors divine_eye.evaluate()'s `signals` dict
# (12 entries: 10 always-present + 2 that degrade gracefully to None).
SIGNAL_LABELS: list[tuple[str, str]] = [
    ("silhouetteIoU", "Silhouette IoU (hard gate)"),
    ("scaleDelta", "Scale delta (hard gate)"),
    ("aspectRatioDelta", "Aspect ratio delta"),
    ("symmetryParity", "Bilateral symmetry parity"),
    ("phashSimilarity", "pHash similarity"),
    ("ssim", "Global SSIM (luma)"),
    ("edgeOverlap", "Edge-map overlap (Sobel)"),
    ("blowoutParity", "Blowout parity"),
    ("flatRegionScore", "Flat-region parity"),
    ("tonalParity", "Tonal/contrast parity"),
    ("objectness", "Objectness (OSIM-lite)"),
    ("hueZoneParity", "Hue-zone parity (report-only)"),
]

# Possible spellings for a head-unit estimate, in case a caller's evaluate()/
# check_admission() result ever grows one. Not produced by the instruments
# vendored here (that measurement lives in forge/stage1_intake/extract_landmarks.py,
# which is out of scope for this vendor drop — a character-authoring aid, not a
# review instrument, and not imported by any of the four vendored files).
HEAD_UNIT_KEYS = ("headUnit", "headUnitCount", "headUnitEstimate", "headUnits")


def _find_head_unit(*sources: dict[str, Any]) -> Any:
    for source in sources:
        for key in HEAD_UNIT_KEYS:
            if key in source:
                return source[key]
            provenance = source.get("provenance")
            if isinstance(provenance, dict) and key in provenance:
                return provenance[key]
    return None


def _print_admission(admission: dict[str, Any]) -> None:
    status = "ADMITTED" if admission["admitted"] else "REJECTED"
    prov = admission["provenance"]
    print(f"Reference admission: {status}  ({prov['viewpoint']})  "
          f"{prov['width']}x{prov['height']}px  pHash={prov['pHash']}")
    for reason in admission["reasons"]:
        print(f"  - {reason}")
    if not admission["admitted"]:
        print("  (rejected reference — continuing to Divine Eye anyway; "
              "this wrapper measures, it does not gate)")


def _print_signal_table(result: dict[str, Any]) -> None:
    signals = result["signals"]
    print()
    print(f"Divine Eye verdict: {result['verdict'].upper()} -> {result['action']}  "
          f"fidelity={result['fidelity']} (target {result['fidelityTarget']})")
    if result["hardGateFailures"]:
        for failure in result["hardGateFailures"]:
            print(f"  HARD: {failure}")
    if result.get("reconstructionModeSuspected"):
        print("  (reconstruction-mode rescue considered — photo reference vs procedural render)")
    print()
    print(f"{'signal':<32}{'score':>10}")
    print("-" * 42)
    for key, label in SIGNAL_LABELS:
        value = signals.get(key)
        score_text = "n/a" if value is None else f"{value:.4f}"
        print(f"{label:<32}{score_text:>10}")
    print("-" * 42)
    print(f"disagreement spread: {result['disagreementSpread']}")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--render", required=True, type=Path, help="path to the render PNG")
    parser.add_argument("--reference", required=True, type=Path, help="path to the reference PNG")
    parser.add_argument("--out", type=Path, default=None, help="optional path to write the combined JSON result")
    args = parser.parse_args(argv)

    reference_path = args.reference.expanduser().resolve()
    render_path = args.render.expanduser().resolve()

    try:
        admission = check_admission(reference_path, viewpoint="reference")
        _print_admission(admission)

        result = evaluate(reference_path, render_path)
        _print_signal_table(result)

        head_unit = _find_head_unit(result, admission)
        print(f"\nHead-unit estimate: {head_unit if head_unit is not None else 'n/a (not produced by the vendored instruments)'}")
    except Exception as exc:  # noqa: BLE001 - surface any failure cleanly, this is a review tool
        print(f"error: {exc}", file=sys.stderr)
        return 2

    combined = {
        "reference": str(reference_path),
        "render": str(render_path),
        "admission": admission,
        "divineEye": result,
    }

    if args.out is not None:
        out_path = args.out.expanduser().resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(combined, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"\nWrote {out_path}")

    # This wrapper's job is to produce numbers, not to gate a pipeline: exit 0
    # whenever admission + evaluation both ran successfully, regardless of the
    # fidelity verdict. Use the printed verdict/action to decide what to do next.
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
