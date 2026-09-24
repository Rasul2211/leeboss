# -*- coding: utf-8 -*-
"""Step 5: retouch only what survives the crop, then frame every shot to 3:4."""
import glob, os, json, statistics
from PIL import Image
from clean import inpaint

OUT_W, OUT_H = 900, 1200
MARGIN = 0.10
AR = OUT_W / float(OUT_H)


def backdrop(im):
    px, (w, h) = im.load(), im.size
    s = []
    for x in range(0, w, 3):
        s.append(px[x, 2]); s.append(px[x, h - 3])
    for y in range(0, h, 3):
        s.append(px[2, y]); s.append(px[w - 3, y])
    return tuple(int(statistics.median([c[k] for c in s])) for k in range(3))


def framed(box, w, h):
    """Grow the product box by a margin, then stretch it to a 3:4 window."""
    x0, y0, x1, y1 = box
    m = int(max(x1 - x0, y1 - y0) * MARGIN)
    x0, y0, x1, y1 = x0 - m, y0 - m, x1 + m, y1 + m
    bw, bh = x1 - x0, y1 - y0
    if bw / float(bh) > AR:
        nh = bw / AR
        cy = (y0 + y1) / 2.0
        y0, y1 = cy - nh / 2, cy + nh / 2
    else:
        nw = bh * AR
        cx = (x0 + x1) / 2.0
        x0, x1 = cx - nw / 2, cx + nw / 2
    return [int(round(v)) for v in (x0, y0, x1, y1)]


def overlaps(a, b):
    return a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]


prod = json.load(open('work/product.json'))
sticks = json.load(open('work/boxes.json'))
os.makedirs('work/final', exist_ok=True)
rep = {}
for f in sorted(glob.glob('work/step2/*.jpg')):
    name = os.path.basename(f)
    im = Image.open(f).convert('RGB')
    w, h = im.size
    info = prod[name]
    box = info['box'] or [0, 0, w - 1, h - 1]
    win = framed(box, w, h)

    kept = [b for b in sticks.get(name, []) if overlaps(b, win)]
    for b in kept:
        inpaint(im, b)

    bg = backdrop(im)
    canvas = Image.new('RGB', (win[2] - win[0], win[3] - win[1]), bg)
    sx0, sy0 = max(0, win[0]), max(0, win[1])
    sx1, sy1 = min(w, win[2]), min(h, win[3])
    canvas.paste(im.crop((sx0, sy0, sx1, sy1)), (sx0 - win[0], sy0 - win[1]))
    canvas = canvas.resize((OUT_W, OUT_H), Image.LANCZOS)
    canvas.save('work/final/' + name, quality=92)
    rep[name] = {'window': win, 'retouched': len(kept), 'total_stickers': len(sticks.get(name, []))}
    print('%-32s window=%-28s retouched %d/%d' % (name, str(win), len(kept), len(sticks.get(name, []))))

json.dump(rep, open('work/final.json', 'w'), indent=1)
