"""
Fill the flat bands at the edges of a product photograph.

Trimming the borders off left a second problem behind. Some of the photographs
are landscape - a row of hats, a pair of trainers seen from above - and padding
them out to the 3:4 the cards use meant a stripe of flat colour above and below.
On a grid where every other card is filled to its edges, that reads as a mistake.

So the stripe is replaced by the photograph itself: blown up, blurred, and laid
underneath. The card is full, the garment keeps its own proportions, and nothing
is cropped away.

  python _assets/fill_bands.py            показать, что будет сделано
  python _assets/fill_bands.py --apply    заполнить
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'products')

TARGET = (900, 1200)
FLAT = 4.0
MIN_BAND = 20


def band(lines):
    n = 0
    first = None
    for line in lines:
        px = line.reshape(-1, 3).astype(np.float32)
        if px.std(axis=0).mean() > FLAT:
            break
        mean = px.mean(axis=0)
        if first is None:
            first = mean
        elif np.abs(mean - first).mean() > FLAT:
            break
        n += 1
    return n if n >= MIN_BAND else 0


def content_box(a):
    h, w, _ = a.shape
    top = band([a[y, :] for y in range(h // 2)])
    bottom = band([a[h - 1 - y, :] for y in range(h // 2)])
    left = band([a[:, x] for x in range(w // 2)])
    right = band([a[:, w - 1 - x] for x in range(w // 2)])
    return left, top, w - right, h - bottom


def fill(im):
    """Cover a 3:4 canvas with a blurred copy, then set the photo on top."""
    want_w, want_h = TARGET
    w, h = im.size
    scale = max(want_w / w, want_h / h)
    back = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    bx, by = back.size
    back = back.crop(((bx - want_w) // 2, (by - want_h) // 2,
                      (bx - want_w) // 2 + want_w, (by - want_h) // 2 + want_h))
    back = back.filter(ImageFilter.GaussianBlur(28))

    fit = min(want_w / w, want_h / h)
    front = im.resize((max(1, round(w * fit)), max(1, round(h * fit))), Image.LANCZOS)
    back.paste(front, ((want_w - front.width) // 2, (want_h - front.height) // 2))
    return back


def main():
    apply = '--apply' in sys.argv
    changed = 0

    for name in sorted(os.listdir(SRC)):
        if not name.endswith('.jpg'):
            continue
        path = os.path.join(SRC, name)
        im = Image.open(path).convert('RGB')
        a = np.asarray(im)
        box = content_box(a)

        if box == (0, 0, im.width, im.height):
            continue

        print(f'{name[:40]:40s} полей: слева {box[0]:3d} сверху {box[1]:3d} '
              f'справа {im.width - box[2]:3d} снизу {im.height - box[3]:3d}')
        changed += 1

        if apply:
            fill(im.crop(box)).save(path, quality=88, optimize=True)

    print(f'\nкадров с полями: {changed}' + ('' if apply else '  (запустите с --apply)'))


if __name__ == '__main__':
    main()
