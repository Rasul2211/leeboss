"""
Reframe the product photographs that were padded badly.

Two earlier passes left marks. Where a photograph was not 3:4, the gap was
filled with a blurred copy of itself; where an overlay had been cut off the
bottom, the last row of pixels was dragged down to the edge, which left streaks
under every pair of trainers. On a phone both read as a damaged picture.

Here each of those photographs is rebuilt from the frame as it was before the
padding, with the real picture marked by hand (BOX, in the 900x1200 frame):

  cover  the picture is close to 3:4 already - crop it to 3:4, nothing invented
  pad    the picture is too wide to crop without cutting the goods - continue
         the backdrop above and below it. The backdrop is read at the two ends
         of the edge and graded between them, so nothing that touches the edge
         (a sole, a shadow) is dragged into a streak. The first rows
         past the edge mirror the backdrop and fade out, so the join is not a
         hard line; under trainers the pair itself is mirrored too, the way a
         polished floor would.

Sources are read from git at fixed commits, so running this twice gives the
same files and never works on its own output.

  python _assets/reframe.py            собрать в _assets/out/reframed и показать лист
  python _assets/reframe.py --apply    записать в public/products
"""
import io
import os
import subprocess
import sys
import zlib

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(ROOT, 'public', 'products')
PREVIEW = os.path.join(ROOT, '_assets', 'out', 'reframed')

W, H = 900, 1200

# the frame before the blurred fill, and the frame as it stood after it
PRE = '39b6fb4'
CUR = '6743a91'

# name: (commit, mode, box, anchor)
#   box    = (left, top, right, bottom) of the real picture
#   anchor = where the picture sits in the 3:4 frame: for cover, which part of
#            the surplus is kept (0 = left/top, 1 = right/bottom); for pad, how
#            the added backdrop is shared out (0 = all below, 1 = all above)
# For frames taken before the fill the box is tightened to the flat bands found
# in the file itself, so a top or bottom written a few pixels out does no harm.
SPEC = {
    # trainers: wide pictures on a plain backdrop, streaks underneath
    'adidas-gazelle': (CUR, 'pad', (0, 0, 900, 955), 0.5),
    'bape-sta': (CUR, 'pad', (20, 20, 880, 872), 0.5),
    'converse-chuck-taylor': (CUR, 'pad', (0, 102, 900, 882), 0.5),
    'nb-550': (CUR, 'pad', (0, 0, 900, 928), 0.5),
    'nike-air-force-1': (CUR, 'pad', (0, 0, 900, 958), 0.5),
    'nike-cortez': (CUR, 'pad', (0, 0, 900, 1008), 0.5),
    'on-roger': (CUR, 'pad', (32, 32, 868, 928), 0.5),
    'adidas-forum': (PRE, 'pad', (0, 64, 900, 1000), 0.5),
    'adidas-forum-bad-bunny': (PRE, 'pad', (0, 112, 900, 1000), 0.5),
    'cactus-bandana': (PRE, 'pad', (0, 86, 900, 878), 0.5),
    'nb-327': (PRE, 'pad', (0, 62, 900, 744), 0.5),
    'nike-dunk-cacao': (PRE, 'pad', (0, 24, 900, 1058), 0.0),
    'nb-530': (PRE, 'cover', (0, 62, 900, 1134), 1.0),

    # tops and hats: flat bands above and below
    'teniska-bezhevaya-belaya': (PRE, 'cover', (0, 100, 900, 1100), 0.15),
    'teniska-chernaya-vyazanaya': (PRE, 'cover', (0, 86, 900, 1168), 0.5),
    'teniska-korichnevaya-bezhevaya': (PRE, 'pad', (0, 96, 900, 904), 0.5),
    'teniska-korichnevaya': (PRE, 'cover', None, 0.5),
    'teniska-polo-belaya': (PRE, 'cover', (0, 80, 900, 1120), 0.5),
    'teniska-polo-chernaya': (PRE, 'cover', (52, 0, 848, 1200), 1.0),
    'teniska-temno-sinyaya': (PRE, 'cover', None, 0.5),
    'kepka-chernaya': (PRE, 'cover', None, 0.5),
    'futbolka-belaya-oversayz': (PRE, 'cover', None, 0.5),
    'futbolki-bazovye': (PRE, 'cover', None, 0.5),
    'futbolki-s-printom': (PRE, 'pad', (32, 140, 868, 1068), 0.5),
    'shapki-vyazanye-melanzh': (PRE, 'pad', (0, 134, 900, 796), 0.5),
    'shapki-vyazanye': (PRE, 'pad', (0, 302, 900, 1098), 1.0),

    # trousers: a white frame, or a smudge along the bottom edge
    'shtany-korichnevye': (CUR, 'cover', (24, 16, 876, 1164), 0.5),
    'shtany-temno-sinie': (CUR, 'cover', (24, 16, 876, 1164), 0.5),
    'bryuki-kremovye': (CUR, 'cover', (0, 0, 900, 1004), 0.3),
    'dzhinsy-chernye': (CUR, 'cover', (0, 0, 900, 1052), 0.5),
    'bryuki-korichnevye': (CUR, 'cover', (0, 0, 900, 1172), 0.5),
}

# pictures whose top edge is the goods themselves, not backdrop: the space
# above is given the tone found along the bottom edge, with no mirroring
TOP_FROM_BOTTOM = {'shapki-vyazanye-melanzh'}

# pairs shot from above on a plain floor: what touches the bottom edge is
# mirrored below it, faintly, instead of being cut off by a straight line
ON_FLOOR = {
    'adidas-gazelle', 'bape-sta', 'converse-chuck-taylor', 'nb-550', 'nike-air-force-1',
    'nike-cortez', 'on-roger', 'adidas-forum', 'adidas-forum-bad-bunny', 'cactus-bandana',
    'nb-327', 'nike-dunk-cacao',
}

FLAT = 4.0
MIN_BAND = 12
FADE = 110
CORNER = 36


def source(name, commit):
    data = subprocess.run(
        ['git', 'show', f'{commit}:public/products/{name}.jpg'],
        cwd=ROOT, capture_output=True, check=True,
    ).stdout
    return Image.open(io.BytesIO(data)).convert('RGB')


def flat_band(lines):
    """How many leading lines are one flat colour."""
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


def auto_box(im):
    a = np.asarray(im)
    h, w, _ = a.shape
    top = flat_band([a[y, :] for y in range(h // 2)])
    bottom = flat_band([a[h - 1 - y, :] for y in range(h // 2)])
    left = flat_band([a[:, x] for x in range(w // 2)])
    right = flat_band([a[:, w - 1 - x] for x in range(w // 2)])
    # a JPEG edge next to a flat band is soft; step inside it
    pad = lambda n: n + 3 if n else 0
    return pad(left), pad(top), w - pad(right), h - pad(bottom)


def cover(im, anchor):
    """Crop to 3:4, keeping the part the anchor points at."""
    w, h = im.size
    if w / h > W / H:
        keep = round(h * W / H)
        x = round((w - keep) * anchor)
        im = im.crop((x, 0, x + keep, h))
    else:
        keep = round(w * H / W)
        y = round((h - keep) * anchor)
        im = im.crop((0, y, w, y + keep))
    return im.resize((W, H), Image.LANCZOS)


def backdrop_row(block):
    """
    The backdrop along one edge, as a single smooth row of colour.

    Read from the two ends of the edge and graded between them. The middle of
    the edge is where the goods are - a sole, a cuff, a shadow - and anything
    taken from there gets carried on as a stripe; the corners of these pictures
    are backdrop, lit a little differently left and right.
    """
    block = block.astype(np.float32)
    width = block.shape[1]
    left = np.median(block[:, :CORNER].reshape(-1, 3), axis=0)
    right = np.median(block[:, -CORNER:].reshape(-1, 3), axis=0)
    across = np.linspace(0, 1, width, dtype=np.float32)[:, None]
    return left * (1 - across) + right * across


def fade(count):
    """Weights 1 -> 0 over the first rows past an edge, eased at both ends."""
    t = np.linspace(0, 1, count, dtype=np.float32)
    return (1 - t * t * (3 - 2 * t))[:, None, None]


def backdrop_only(mirror, fill):
    """1 where the mirrored rows are backdrop, 0 where they are the goods."""
    apart = np.abs(mirror - fill).max(axis=2)
    keep = np.clip(1 - (apart - 7) / 12, 0, 1)
    soft = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))
    return (np.asarray(soft).astype(np.float32) / 255)[:, :, None]


def pad(im, anchor, rng, top_from_bottom=False, on_floor=False):
    """Fit the width, then continue the backdrop above and below."""
    w, h = im.size
    new_h = round(h * W / w)
    if new_h >= H:
        return cover(im, 0.5)

    im = im.resize((W, new_h), Image.LANCZOS)
    a = np.asarray(im).astype(np.float32)

    gap = H - new_h
    above = round(gap * anchor)
    below = gap - above

    canvas = np.empty((H, W, 3), np.float32)
    canvas[above:above + new_h] = a

    for side, count in (('top', above), ('bottom', below)):
        if count <= 0:
            continue
        from_bottom = side == 'bottom' or top_from_bottom
        fill = np.tile(backdrop_row(a[-8:] if from_bottom else a[:8])[None, :, :], (count, 1, 1))
        # a photograph has grain; a perfectly flat fill beside it looks pasted in
        fill += rng.normal(0, 1.3, (count, W, 1))

        # the rows nearest the picture mirror it and fade into the fill
        near = min(count, FADE, new_h // 3)
        if near and not (side == 'top' and top_from_bottom):
            # rows ordered outward from the picture's edge, on both sides
            mirror = a[::-1][:near] if side == 'bottom' else a[:near]
            outward = fill[:near] if side == 'bottom' else fill[count - near:][::-1]
            weight = fade(near)
            if not (on_floor and side == 'bottom'):
                weight = weight * backdrop_only(mirror, outward)
            mixed = mirror * weight + outward * (1 - weight)
            if side == 'bottom':
                fill[:near] = mixed
            else:
                fill[count - near:] = mixed[::-1]

        canvas[slice(0, above) if side == 'top' else slice(above + new_h, H)] = fill

    return Image.fromarray(np.clip(canvas, 0, 255).astype(np.uint8))


def build(name):
    commit, mode, box, anchor = SPEC[name]
    im = source(name, commit)
    found = auto_box(im) if commit == PRE or not box else None
    if box and found:
        box = (max(box[0], found[0]), max(box[1], found[1]), min(box[2], found[2]), min(box[3], found[3]))
    im = im.crop(box or found)
    if mode == 'cover':
        return cover(im, anchor)
    rng = np.random.default_rng(zlib.crc32(name.encode()))
    return pad(im, anchor, rng, top_from_bottom=name in TOP_FROM_BOTTOM, on_floor=name in ON_FLOOR)


def main():
    apply = '--apply' in sys.argv
    out = DEST if apply else PREVIEW
    os.makedirs(out, exist_ok=True)

    for name in SPEC:
        build(name).save(os.path.join(out, f'{name}.jpg'), quality=90, optimize=True)

    print(f'{len(SPEC)} фото -> {os.path.relpath(out, ROOT)}')
    if not apply:
        print('Это пробная сборка. Чтобы записать на сайт: python _assets/reframe.py --apply')


if __name__ == '__main__':
    main()
