"""
Cut one photograph per garment out of the finished-outfit frames.

Every garment already sits in its own part of the frame, so a rectangle around
it is a usable product photograph: a little carpet shows at the corners, which
is how the shop photographs everything anyway.

Cutting along the outline instead was tried and abandoned. Shoes and bags lie
on top of the clothes, so an outline cut slices a shirt into pieces, and pale
trousers against the pale border of the carpet come back as a shape with no
folds in it. A rectangle keeps the photograph whole.

  python _assets/crop_look_items.py
"""
import json
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, '_assets', 'look-items.json')
LOOKS = os.path.join(ROOT, 'public', 'looks')
OUT = os.path.join(ROOT, 'public', 'products')

# catalogue photographs are 3:4 portrait; matching that keeps the grid even
TARGET_RATIO = 3 / 4


def to_pixels(box, w, h):
    return [int(box[0] / 100 * w), int(box[1] / 100 * h),
            int(box[2] / 100 * w), int(box[3] / 100 * h)]


def fit_ratio(box, w, h):
    """Grow the shorter side until the box is 3:4, staying inside the frame."""
    x0, y0, x1, y1 = box
    bw, bh = x1 - x0, y1 - y0

    if bw / bh > TARGET_RATIO:
        want = bw / TARGET_RATIO
        grow = (want - bh) / 2
        y0, y1 = y0 - grow, y1 + grow
    else:
        want = bh * TARGET_RATIO
        grow = (want - bw) / 2
        x0, x1 = x0 - grow, x1 + grow

    # a box pushed past an edge slides back in rather than being clipped, so
    # the garment stays centred instead of drifting to one side
    if x0 < 0:
        x1, x0 = x1 - x0, 0
    if y0 < 0:
        y1, y0 = y1 - y0, 0
    if x1 > w:
        x0, x1 = x0 - (x1 - w), w
    if y1 > h:
        y0, y1 = y0 - (y1 - h), h

    return [int(max(0, x0)), int(max(0, y0)), int(min(w, x1)), int(min(h, y1))]


def main():
    with open(DATA, encoding='utf-8') as handle:
        data = json.load(handle)

    made = 0
    for look in data['looks']:
        source = os.path.join(LOOKS, f"{look['file']}.jpg")
        im = Image.open(source).convert('RGB')
        w, h = im.size

        for item in look['items']:
            box = fit_ratio(to_pixels(item['box'], w, h), w, h)
            crop = im.crop(box)
            # upscale to the catalogue's own size so every card is equally sharp
            crop = crop.resize((900, 1200), Image.LANCZOS)
            crop.save(os.path.join(OUT, f"{item['slug']}.jpg"), quality=88, optimize=True)
            made += 1

    print(f'нарезано фотографий: {made}')


if __name__ == '__main__':
    main()
