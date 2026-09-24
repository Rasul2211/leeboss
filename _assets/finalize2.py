# -*- coding: utf-8 -*-
"""Step 5 v2: crop only, never pad. Wipe the corner where shoe shots carry name pills."""
import glob, os, json
from PIL import Image
from clean import inpaint

OUT_W, OUT_H = 900, 1200
AR = OUT_W / float(OUT_H)
MARGIN = 0.10

# the 22-44-* / 22-45-0* run is the sneaker set; its labels all sit low-left on bare floor
SHOE = lambda n: '22-44-' in n or n.count('22-45-0')


def fit_window(box, w, h):
    x0, y0, x1, y1 = box
    m = int(max(x1 - x0, y1 - y0) * MARGIN)
    x0, y0, x1, y1 = x0 - m, y0 - m, x1 + m, y1 + m
    bw, bh = max(1, x1 - x0), max(1, y1 - y0)
    if bw / float(bh) > AR:
        bh = bw / AR
    else:
        bw = bh * AR
    if bw > w:                      # never exceed the source
        bw, bh = w, w / AR
    if bh > h:
        bh, bw = h, h * AR
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    nx0 = min(max(0, cx - bw / 2), w - bw)
    ny0 = min(max(0, cy - bh / 2), h - bh)
    return [int(round(nx0)), int(round(ny0)), int(round(nx0 + bw)), int(round(ny0 + bh))]


def overlaps(a, b):
    return a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]


prod = json.load(open('work/product.json'))
sticks = json.load(open('work/boxes.json'))
os.makedirs('work/final2', exist_ok=True)
rep = {}
for f in sorted(glob.glob('work/step2/*.jpg')):
    name = os.path.basename(f)
    im = Image.open(f).convert('RGB')
    w, h = im.size

    zones = list(sticks.get(name, []))
    if SHOE(name):
        zones.append([0, int(0.655 * h), int(0.52 * w), int(0.95 * h)])

    box = prod[name]['box'] or [0, 0, w - 1, h - 1]
    win = fit_window(box, w, h)
    kept = [b for b in zones if overlaps(b, win)]
    for b in kept:
        inpaint(im, b)

    im.crop(tuple(win)).resize((OUT_W, OUT_H), Image.LANCZOS).save('work/final2/' + name, quality=92)
    rep[name] = {'window': win, 'wiped': len(kept)}
    print('%-32s win=%-24s wiped=%d' % (name, str(win), len(kept)))

json.dump(rep, open('work/final2.json', 'w'), indent=1)
