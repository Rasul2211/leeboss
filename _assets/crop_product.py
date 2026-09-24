# -*- coding: utf-8 -*-
"""Step 4: crop to the product itself - this removes corner stickers without retouching."""
import glob, os, json, statistics
from PIL import Image, ImageFilter
from collections import deque

DIFF = 34        # how far a pixel must be from the backdrop to count as product
DOWN = 4         # work on a 1/4 scale mask: fast and less noisy
MIN_FRAC = 0.004


def backdrop(im):
    px, (w, h) = im.load(), im.size
    s = []
    for x in range(0, w, 3):
        s.append(px[x, 2]); s.append(px[x, h - 3])
    for y in range(0, h, 3):
        s.append(px[2, y]); s.append(px[w - 3, y])
    return tuple(int(statistics.median([c[k] for c in s])) for k in range(3))


def product_box(im, skip):
    """Largest blob that differs from the backdrop, ignoring known sticker rects."""
    w, h = im.size
    sm = im.resize((w // DOWN, h // DOWN), Image.BILINEAR).filter(ImageFilter.MedianFilter(3))
    sw, sh = sm.size
    bg = backdrop(im)
    px = sm.load()
    m = bytearray(sw * sh)
    for y in range(sh):
        for x in range(sw):
            c = px[x, y]
            if max(abs(c[k] - bg[k]) for k in range(3)) > DIFF:
                m[y * sw + x] = 1
    for b in skip:                       # blank out the stickers so they cannot join the blob
        for y in range(max(0, b[1] // DOWN - 1), min(sh, b[3] // DOWN + 2)):
            for x in range(max(0, b[0] // DOWN - 1), min(sw, b[2] // DOWN + 2)):
                m[y * sw + x] = 0
    seen = bytearray(sw * sh)
    best = None
    for i in range(sw * sh):
        if not m[i] or seen[i]:
            continue
        q = deque([i]); seen[i] = 1; n = 0
        bx0 = bx1 = i % sw; by0 = by1 = i // sw
        while q:
            p = q.popleft(); n += 1
            y, x = divmod(p, sw)
            if x < bx0: bx0 = x
            if x > bx1: bx1 = x
            if y < by0: by0 = y
            if y > by1: by1 = y
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < sh and 0 <= nx < sw:
                    j = ny * sw + nx
                    if m[j] and not seen[j]:
                        seen[j] = 1; q.append(j)
        if n > sw * sh * MIN_FRAC and (best is None or n > best[0]):
            best = (n, bx0, by0, bx1, by1)
    if not best:
        return None
    _n, bx0, by0, bx1, by1 = best
    return [bx0 * DOWN, by0 * DOWN, min(w - 1, (bx1 + 1) * DOWN), min(h - 1, (by1 + 1) * DOWN)]


boxes = json.load(open('work/boxes.json'))
out = {}
for f in sorted(glob.glob('work/step2/*.jpg')):
    im = Image.open(f).convert('RGB')
    name = os.path.basename(f)
    pb = product_box(im, boxes.get(name, []))
    w, h = im.size
    if pb:
        frac = ((pb[2] - pb[0]) * (pb[3] - pb[1])) / float(w * h)
    else:
        frac = 1.0
    out[name] = {'box': pb, 'frac': round(frac, 3), 'size': [w, h]}
    print('%-32s frac=%.3f box=%s' % (name, frac, pb))

json.dump(out, open('work/product.json', 'w'), indent=1)
