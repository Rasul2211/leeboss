# -*- coding: utf-8 -*-
"""Step 1: strip Instagram chrome, keep only the story photo."""
import glob, os, statistics, json
from PIL import Image

STEP = 4          # column sampling stride
PHOTO_MEAN = 42   # a row belongs to the photo if it is brighter than this
FLAT_SD = 5.0     # a near-uniform row (solid grey/black filler strip)


def profile(im):
    px, (w, h) = im.load(), im.size
    out = []
    for y in range(h):
        v = [sum(px[x, y]) / 3.0 for x in range(0, w, STEP)]
        out.append((sum(v) / len(v), statistics.pstdev(v)))
    return out


def longest_photo_run(prof):
    best = (0, 0, 0)
    start = None
    for y, (m, _sd) in enumerate(prof):
        if m > PHOTO_MEAN:
            if start is None:
                start = y
        else:
            if start is not None:
                if y - start > best[2]:
                    best = (start, y - 1, y - start)
                start = None
    if start is not None and len(prof) - start > best[2]:
        best = (start, len(prof) - 1, len(prof) - start)
    return best[0], best[1]


def trim_flat(prof, top, bot):
    """Drop solid filler strips at the edges, never more than 15% of the band."""
    limit = int((bot - top) * 0.15)
    t0 = top
    while t0 < bot and prof[t0][1] < FLAT_SD and t0 - top < limit:
        t0 += 1
    b0 = bot
    while b0 > t0 and prof[b0][1] < FLAT_SD and bot - b0 < limit:
        b0 -= 1
    return t0, b0


report = {}
os.makedirs('work/step1', exist_ok=True)
for f in sorted(glob.glob('raw/*.jpg')):
    im = Image.open(f).convert('RGB')
    prof = profile(im)
    top, bot = longest_photo_run(prof)
    top, bot = trim_flat(prof, top, bot)
    name = os.path.basename(f)
    im.crop((0, top, im.size[0], bot + 1)).save('work/step1/' + name, quality=95)
    report[name] = {'top': top, 'bot': bot, 'h': bot - top + 1}

for n, r in report.items():
    print('%-32s top=%4d bot=%4d h=%4d' % (n, r['top'], r['bot'], r['h']))
json.dump(report, open('work/step1.json', 'w'), indent=1)
hs = [r['h'] for r in report.values()]
print('\nheights min/med/max: %d / %d / %d' % (min(hs), statistics.median(hs), max(hs)))
