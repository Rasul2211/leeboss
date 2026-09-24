# -*- coding: utf-8 -*-
"""Step 2: drop the story header (avatar, name, date, close button) and flat filler bands."""
import glob, os, statistics, json
from PIL import Image

WHITE = 246       # the close button is near-pure white
FLAT_SD = 9.0     # solid grey/white filler strip
HEADER_LIMIT = 140


def header_bottom(im):
    """Last row of the close button in the top-right corner, or None."""
    px, (w, h) = im.load(), im.size
    last = None
    for y in range(min(HEADER_LIMIT, h)):
        for x in range(w - 70, w - 8):
            r, g, b = px[x, y]
            if r > WHITE and g > WHITE and b > WHITE:
                last = y
                break
    return last


def trim_flat(im, max_frac=0.25):
    px, (w, h) = im.load(), im.size
    def sd(y):
        v = [sum(px[x, y]) / 3.0 for x in range(0, w, 4)]
        return statistics.pstdev(v)
    limit = int(h * max_frac)
    t = 0
    while t < h - 1 and sd(t) < FLAT_SD and t < limit:
        t += 1
    b = h - 1
    while b > t and sd(b) < FLAT_SD and h - 1 - b < limit:
        b -= 1
    return t, b


os.makedirs('work/step2', exist_ok=True)
rep = {}
for f in sorted(glob.glob('work/step1/*.jpg')):
    im = Image.open(f).convert('RGB')
    hb = header_bottom(im)
    cut = hb + 6 if hb is not None else 0
    im = im.crop((0, cut, im.size[0], im.size[1]))
    t, b = trim_flat(im)
    im = im.crop((0, t, im.size[0], b + 1))
    name = os.path.basename(f)
    im.save('work/step2/' + name, quality=95)
    rep[name] = {'header_cut': cut, 'flat_top': t, 'flat_bot': b, 'size': im.size}

json.dump(rep, open('work/step2.json', 'w'), indent=1)
hdr = [r['header_cut'] for r in rep.values()]
print('header cut  min/med/max: %d / %d / %d' % (min(hdr), statistics.median(hdr), max(hdr)))
print('no header found in %d files' % sum(1 for v in hdr if v == 0))
hs = [r['size'][1] for r in rep.values()]
print('final heights min/med/max: %d / %d / %d' % (min(hs), statistics.median(hs), max(hs)))
