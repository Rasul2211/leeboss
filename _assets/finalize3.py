# -*- coding: utf-8 -*-
"""Step 5 v3: wipe both bottom corners on sneaker shots; letterbox wide shots instead of cutting them."""
import glob, os, json
from PIL import Image
from clean import inpaint

OUT_W, OUT_H = 900, 1200
AR = OUT_W / float(OUT_H)
MARGIN = 0.10
SHOE = lambda n: '22-44-' in n or n.count('22-45-0')


def overlaps(a, b):
    return a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]


def contains(win, box):
    return win[0] <= box[0] and win[1] <= box[1] and win[2] >= box[2] and win[3] >= box[3]


def fit_window(box, w, h):
    x0, y0, x1, y1 = box
    m = int(max(x1 - x0, y1 - y0) * MARGIN)
    x0, y0, x1, y1 = x0 - m, y0 - m, x1 + m, y1 + m
    bw, bh = max(1, x1 - x0), max(1, y1 - y0)
    if bw / float(bh) > AR:
        bh = bw / AR
    else:
        bw = bh * AR
    if bw > w:
        bw, bh = w, w / AR
    if bh > h:
        bh, bw = h, h * AR
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    nx0 = min(max(0, cx - bw / 2), w - bw)
    ny0 = min(max(0, cy - bh / 2), h - bh)
    return [int(round(nx0)), int(round(ny0)), int(round(nx0 + bw)), int(round(ny0 + bh))]


def backdrop(im):
    import statistics
    px, (w, h) = im.load(), im.size
    s = []
    for x in range(0, w, 3):
        s.append(px[x, 2]); s.append(px[x, h - 3])
    for y in range(0, h, 3):
        s.append(px[2, y]); s.append(px[w - 3, y])
    return tuple(int(statistics.median([c[k] for c in s])) for k in range(3))


def contain_on_backdrop(im, box):
    """Wide shots keep everything; the filler matches the shot's own backdrop so the seam vanishes."""
    pad = int(max(box[2] - box[0], box[3] - box[1]) * 0.07)
    src = im.crop((max(0, box[0] - pad), max(0, box[1] - pad),
                   min(im.size[0], box[2] + pad), min(im.size[1], box[3] + pad)))
    sw, sh = src.size
    k = min(OUT_W / float(sw), OUT_H / float(sh))
    src = src.resize((max(1, int(sw * k)), max(1, int(sh * k))), Image.LANCZOS)
    canvas = Image.new('RGB', (OUT_W, OUT_H), backdrop(im))
    canvas.paste(src, ((OUT_W - src.size[0]) // 2, (OUT_H - src.size[1]) // 2))
    return canvas



# Stickers the colour passes could not see, read off the marked previews.
MANUAL = {
    'photo_2026-09-22_18-37-33.jpg': [[10, 762, 212, 834]],   # dark "Джинсы" pill
    'photo_2026-09-22_18-38-04.jpg': [[10, 798, 160, 874]],   # red "250 tjs" pill
    'photo_2026-09-22_18-37-15.jpg': [[0, 778, 245, 905]],    # red pill under the "Джинсы" tag
}
EXTRA = 6   # widen every box: anti-aliased pill edges leave a coloured halo


prod = json.load(open('work/product.json'))
sticks = json.load(open('work/boxes.json'))
os.makedirs('work/final3', exist_ok=True)
rep = {}
for f in sorted(glob.glob('work/step2/*.jpg')):
    name = os.path.basename(f)
    im = Image.open(f).convert('RGB')
    w, h = im.size

    zones = [[b[0] - EXTRA, b[1] - EXTRA, b[2] + EXTRA, b[3] + EXTRA]
             for b in sticks.get(name, []) + MANUAL.get(name, [])]
    zones = [[max(0, b[0]), max(0, b[1]), min(w - 1, b[2]), min(h - 1, b[3])] for b in zones]
    if SHOE(name):
        zones.append([0, int(0.645 * h), int(0.55 * w), int(0.96 * h)])       # left label stack
        zones.append([int(0.52 * w), int(0.76 * h), w - 1, int(0.96 * h)])    # right-hand strays

    box = prod[name]['box'] or [0, 0, w - 1, h - 1]
    win = fit_window(box, w, h)
    bw_, bh_ = box[2] - box[0], max(1, box[3] - box[1])
    # only genuinely wide, short shots suffer from a portrait crop
    letterbox = (bw_ / float(bh_)) > AR * 1.05

    for b in zones:
        if letterbox or overlaps(b, win):
            inpaint(im, b)

    if letterbox:
        out = contain_on_backdrop(im, box)
    else:
        out = im.crop(tuple(win)).resize((OUT_W, OUT_H), Image.LANCZOS)
    out.save('work/final3/' + name, quality=92)
    rep[name] = {'window': win, 'letterbox': letterbox}
    print('%-32s %s' % (name, 'letterbox' if letterbox else 'crop ' + str(win)))

json.dump(rep, open('work/final3.json', 'w'), indent=1)
