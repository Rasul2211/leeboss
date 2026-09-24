# -*- coding: utf-8 -*-
import glob, os
from PIL import Image
import statistics

def row_stats(im):
    px = im.load()
    w, h = im.size
    out = []
    step = 7  # sample every 7th column for speed
    for y in range(h):
        vals = []
        for x in range(0, w, step):
            r, g, b = px[x, y]
            vals.append((r + g + b) / 3.0)
        m = sum(vals) / len(vals)
        sd = statistics.pstdev(vals)
        out.append((m, sd))
    return out

def content_band(im, dark=26, flat=12):
    """Find the story image band: skip near-black flat rows at top and bottom."""
    st = row_stats(im)
    h = len(st)
    top = 0
    while top < h and st[top][0] < dark and st[top][1] < flat:
        top += 1
    bot = h - 1
    while bot > top and st[bot][0] < dark and st[bot][1] < flat:
        bot -= 1
    return top, bot, st

rows = []
for f in sorted(glob.glob('raw/*.jpg')):
    im = Image.open(f).convert('RGB')
    top, bot, st = content_band(im)
    rows.append((os.path.basename(f), top, bot, bot - top + 1))

for name, top, bot, hh in rows:
    print('%-32s top=%4d bot=%4d h=%4d' % (name, top, bot, hh))

tops = [r[1] for r in rows]
bots = [r[2] for r in rows]
print()
print('top   min/med/max: %d / %d / %d' % (min(tops), statistics.median(tops), max(tops)))
print('bot   min/med/max: %d / %d / %d' % (min(bots), statistics.median(bots), max(bots)))
