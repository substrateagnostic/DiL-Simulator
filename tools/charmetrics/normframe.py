#!/usr/bin/env python3
"""normframe — put a render and a reference in the SAME frame before measuring.

Why this exists (v7 FIX round-1, critic notes [A: charmetrics] and [B1]):

    The only charmetrics numbers that ever beat the ~0.37 procedural baseline
    were measured on differently-framed images. Full-frame v7 scored IoU 0.377
    (karen) / 0.382 (chad) with hard-gate failures reading
    "scale delta 0.580 / 0.500 > 0.08" and "aspect ratio delta 0.563" — i.e.
    the render framed the figure at roughly half the reference's scale inside a
    frame of a different shape. Silhouette IoU is computed on the overlaid
    masks, so under those conditions it is measuring FRAMING, not form, and no
    conclusion about the model can be drawn from it in either direction.

    The published "tight crop" numbers (karen 0.665 / chad 0.617) were not
    apples-to-apples either: they were hand-cropped by eye, they self-flagged
    reconstructionModeSuspected, and one of them was a render whose face was a
    blank white mannequin (a map-stripped form pass measured against a fully
    painted reference).

    This normalises both sides mechanically and identically:
      · find the foreground (everything outside a tolerance of the corner
        background colour),
      · crop to its bounding box,
      · rescale so the figure occupies exactly FILL of the canvas height,
      · centre it on a canvas of exactly CANVAS pixels in the shared background
        colour.

    After that, scaleDelta and aspectRatioDelta are ~0 BY CONSTRUCTION and every
    remaining signal is about the shape of the figure, which is the only thing
    the number was ever supposed to mean.

Usage:
    python tools/charmetrics/normframe.py in.png out.png
    python tools/charmetrics/normframe.py --sheet-front sheet.png out.png
        (crops the FRONT view out of a 3-view turnaround sheet first, so
         references are SINGLE-VIEW crops as the admission gate requires)
"""
from __future__ import annotations

import sys
from PIL import Image
import numpy as np

CANVAS = (512, 1024)
FILL = 0.94
BG = (214, 214, 214)
TOL = 14


def _mask(a: np.ndarray, bg: np.ndarray) -> np.ndarray:
    return (np.abs(a.astype(np.int16) - bg.astype(np.int16)).max(axis=2) > TOL)


def _corner_bg(a: np.ndarray) -> np.ndarray:
    h, w, _ = a.shape
    pts = [a[2, 2], a[2, w - 3], a[h - 3, 2], a[h - 3, w - 3]]
    return np.median(np.stack(pts), axis=0).astype(np.uint8)


def sheet_front(im: Image.Image) -> Image.Image:
    """Cut the leftmost (front) figure out of a 3-view turnaround sheet.

    The generated sheets put front / 45 / profile across the top ~72% of the
    canvas and a hand row underneath. Columns are found by projecting the
    foreground mask over the figure band only, then splitting on gaps.
    """
    a = np.asarray(im.convert('RGB'))
    bg = _corner_bg(a)
    h, w, _ = a.shape
    band = _mask(a[: int(h * 0.71)], bg)
    cols = band.sum(axis=0)
    thresh = max(3, cols.max() * 0.03)
    on = cols > thresh
    groups, start = [], None
    for x in range(w):
        if on[x] and start is None:
            start = x
        elif not on[x] and start is not None:
            if x - start > w * 0.06:
                groups.append((start, x))
            start = None
    if start is not None and w - start > w * 0.06:
        groups.append((start, w))
    if not groups:
        return im
    x0, x1 = groups[0]
    sub = band[:, x0:x1]
    rows = np.where(sub.any(axis=1))[0]
    y0, y1 = int(rows[0]), int(rows[-1]) + 1
    pad = 6
    return im.crop((max(0, x0 - pad), max(0, y0 - pad),
                    min(w, x1 + pad), min(int(h * 0.71), y1 + pad)))


def normalise(im: Image.Image) -> Image.Image:
    a = np.asarray(im.convert('RGB'))
    bg = _corner_bg(a)
    m = _mask(a, bg)
    ys, xs = np.where(m)
    if len(ys) == 0:
        return im.convert('RGB').resize(CANVAS)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    fig = im.convert('RGB').crop((int(x0), int(y0), int(x1), int(y1)))
    target_h = int(CANVAS[1] * FILL)
    scale = target_h / fig.height
    new_w = max(1, int(round(fig.width * scale)))
    if new_w > CANVAS[0]:
        scale *= CANVAS[0] / new_w
        new_w, target_h = CANVAS[0], max(1, int(round(fig.height * scale)))
    fig = fig.resize((new_w, target_h), Image.LANCZOS)
    out = Image.new('RGB', CANVAS, BG)
    out.paste(fig, ((CANVAS[0] - new_w) // 2, (CANVAS[1] - target_h) // 2))
    return out


def main() -> int:
    args = sys.argv[1:]
    do_sheet = False
    if args and args[0] == '--sheet-front':
        do_sheet = True
        args = args[1:]
    if len(args) != 2:
        print(__doc__)
        return 2
    im = Image.open(args[0])
    if do_sheet:
        im = sheet_front(im)
    normalise(im).save(args[1])
    print(f'  wrote {args[1]}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
