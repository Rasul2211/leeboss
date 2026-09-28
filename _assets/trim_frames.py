"""
Trim the borders off product photographs.

Most of the catalogue came out of Instagram, where a picture that is not 4:5
gets padded to fit. That padding travelled with the photographs: a third of them
carry bands of flat colour, up to 269px of it, so the garment sits small in the
middle of its card while the next card is filled edge to edge.

A band only counts as padding when its colour differs from what lies just inside
it. That distinction matters: a shirt shot on a white sweep also has a plain
strip at the top of the frame, but it is the same white as the rest of the
background, and cropping it would push the shirt against the edge of the card.

Trimmed frames are then padded back out to 3:4 in the background's own colour,
so every card in the grid is the same shape.

  python _assets/trim_frames.py            проверить, ничего не меняя
  python _assets/trim_frames.py --apply    обрезать
"""
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'products')

TARGET = (900, 1200)
# a line counts as flat when its pixels barely differ from one another
FLAT = 6.0
# ... and as padding when its colour is this far from what is inside it
DIFFERENT = 9.0
MIN_BAND = 10


def edge_band(lines):
    """How many lines from this edge are one flat colour."""
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
    return n, first


def padding(lines):
    """Length of the border to remove, or 0 when the band is the photo's own
    background rather than something added around it."""
    n, colour = edge_band(lines)
    if n < MIN_BAND or colour is None:
        return 0
    inside = lines[n + 2] if len(lines) > n + 2 else None
    if inside is None:
        return 0
    neighbour = inside.reshape(-1, 3).astype(np.float32).mean(axis=0)
    return n if float(np.abs(neighbour - colour).mean()) > DIFFERENT else 0


def box_of(a):
    h, w, _ = a.shape
    left = padding([a[:, x] for x in range(w // 2)])
    right = padding([a[:, w - 1 - x] for x in range(w // 2)])
    top = padding([a[y, :] for y in range(h // 2)])
    bottom = padding([a[h - 1 - y, :] for y in range(h // 2)])
    return left, top, w - right, h - bottom


def background(a, box):
    """The corner colour of what is left, used to pad back out to 3:4."""
    left, top, right, bottom = box
    patch = a[top:top + 12, left:left + 12].reshape(-1, 3)
    return tuple(int(v) for v in patch.mean(axis=0))


def fit(im, colour):
    """Pad to 3:4 rather than crop, so nothing of the garment is lost."""
    w, h = im.size
    want_w, want_h = TARGET
    if w * want_h > h * want_w:
        new_h = round(w * want_h / want_w)
        canvas = Image.new('RGB', (w, new_h), colour)
        canvas.paste(im, (0, (new_h - h) // 2))
    else:
        new_w = round(h * want_w / want_h)
        canvas = Image.new('RGB', (new_w, h), colour)
        canvas.paste(im, ((new_w - w) // 2, 0))
    return canvas.resize(TARGET, Image.LANCZOS)


def main():
    apply = '--apply' in sys.argv
    changed = 0

    for name in sorted(os.listdir(SRC)):
        if not name.endswith('.jpg'):
            continue
        path = os.path.join(SRC, name)
        im = Image.open(path).convert('RGB')
        a = np.asarray(im)
        box = box_of(a)

        if box == (0, 0, im.width, im.height):
            continue

        cut = (box[0], box[1], im.width - box[2], im.height - box[3])
        print(f'{name[:40]:40s} срез Л{cut[0]:4d} В{cut[1]:4d} П{cut[2]:4d} Н{cut[3]:4d}')
        changed += 1

        if apply:
            fit(im.crop(box), background(a, box)).save(path, quality=88, optimize=True)

    print(f'\nкадров с рамкой: {changed}' + ('' if apply else '  (запустите с --apply, чтобы обрезать)'))


if __name__ == '__main__':
    main()
