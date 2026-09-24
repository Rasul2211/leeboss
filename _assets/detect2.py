# -*- coding: utf-8 -*-
"""Step 3a v2: white text splits each pill into fragments - close the mask first."""
import glob, os, json
from PIL import Image, ImageFilter, ImageDraw
from collections import deque

CLOSE = 13               # morphological closing kernel, merges text gaps
MIN_W, MAX_W = 55, 340
MIN_H, MAX_H = 18, 110
MIN_FILL = 0.70


def build(im, test):
    px, (w, h) = im.load(), im.size
    m = Image.new('L', (w, h), 0)
    mp = m.load()
    for y in range(h):
        for x in range(w):
            if test(px[x, y]):
                mp[x, y] = 255
    # closing: dilate then erode -> fills the white lettering inside the pill
    m = m.filter(ImageFilter.MaxFilter(CLOSE)).filter(ImageFilter.MinFilter(CLOSE))
    return m


is_red = lambda c: c[0] > 105 and c[0] - c[1] > 45 and c[0] - c[2] > 45
is_dark = lambda c: max(c) < 80 and max(c) - min(c) < 30


def components(m):
    w, h = m.size
    mp = m.load()
    seen = bytearray(w * h)
    out = []
    for y0 in range(h):
        for x0 in range(w):
            i = y0 * w + x0
            if mp[x0, y0] == 0 or seen[i]:
                continue
            q = deque([(x0, y0)]); seen[i] = 1; pts = []
            while q:
                x, y = q.popleft(); pts.append((x, y))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if mp[nx, ny] and not seen[j]:
                            seen[j] = 1; q.append((nx, ny))
            xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
            bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys)
            bw, bh = bx1 - bx0 + 1, by1 - by0 + 1
            out.append({'box': [bx0, by0, bx1, by1], 'w': bw, 'h': bh,
                        'fill': len(pts) / float(bw * bh)})
    return out


def pill(c):
    return (MIN_W <= c['w'] <= MAX_W and MIN_H <= c['h'] <= MAX_H
            and c['fill'] >= MIN_FILL and c['w'] >= c['h'] * 0.9)


res = {}
os.makedirs('work/preview', exist_ok=True)
for f in sorted(glob.glob('work/step2/*.jpg')):
    im = Image.open(f).convert('RGB')
    found = []
    for kind, test in (('red', is_red), ('dark', is_dark)):
        for c in components(build(im, test)):
            if pill(c):
                c['kind'] = kind; found.append(c)
    name = os.path.basename(f)
    res[name] = found
    pv = im.copy(); dr = ImageDraw.Draw(pv)
    for c in found:
        dr.rectangle(c['box'], outline=(0, 255, 0) if c['kind'] == 'red' else (0, 160, 255), width=4)
    pv.save('work/preview/' + name, quality=88)
    print('%-32s %d: %s' % (name, len(found),
          ', '.join('%s %dx%d@%d,%d' % (c['kind'], c['w'], c['h'], c['box'][0], c['box'][1]) for c in found)))

json.dump(res, open('work/pills.json', 'w'), indent=1)
