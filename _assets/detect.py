# -*- coding: utf-8 -*-
"""Step 3a: locate the price/name stickers burned into the story photos."""
import glob, os, json
from PIL import Image
from collections import deque

MIN_W, MAX_W = 45, 330
MIN_H, MAX_H = 16, 90
MIN_FILL = 0.55          # blob must actually fill its bounding box (pills are solid)


def red_mask(im):
    px, (w, h) = im.load(), im.size
    m = bytearray(w * h)
    for y in range(h):
        base = y * w
        for x in range(w):
            r, g, b = px[x, y]
            if r > 110 and r - g > 50 and r - b > 50:
                m[base + x] = 1
    return m


def dark_mask(im):
    """Solid near-black pills. Dark garments are excluded later by shape/fill tests."""
    px, (w, h) = im.load(), im.size
    m = bytearray(w * h)
    for y in range(h):
        base = y * w
        for x in range(w):
            r, g, b = px[x, y]
            if r < 78 and g < 78 and b < 78 and max(r, g, b) - min(r, g, b) < 26:
                m[base + x] = 1
    return m


def components(mask, w, h):
    seen = bytearray(w * h)
    out = []
    for i in range(w * h):
        if not mask[i] or seen[i]:
            continue
        q = deque([i])
        seen[i] = 1
        pts = []
        while q:
            p = q.popleft()
            pts.append(p)
            py, pxs = divmod(p, w)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = py + dy, pxs + dx
                if 0 <= ny < h and 0 <= nx < w:
                    n = ny * w + nx
                    if mask[n] and not seen[n]:
                        seen[n] = 1
                        q.append(n)
        ys = [p // w for p in pts]
        xs = [p % w for p in pts]
        x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        fill = len(pts) / float(bw * bh)
        out.append({'box': (x0, y0, x1, y1), 'w': bw, 'h': bh, 'fill': fill, 'n': len(pts)})
    return out


def pill_like(c):
    return (MIN_W <= c['w'] <= MAX_W and MIN_H <= c['h'] <= MAX_H
            and c['fill'] >= MIN_FILL and c['w'] > c['h'])


res = {}
for f in sorted(glob.glob('work/step2/*.jpg')):
    im = Image.open(f).convert('RGB')
    w, h = im.size
    found = []
    for kind, mk in (('red', red_mask), ('dark', dark_mask)):
        for c in components(mk(im), w, h):
            if pill_like(c):
                c['kind'] = kind
                found.append(c)
    name = os.path.basename(f)
    res[name] = found
    print('%-32s %d pills: %s' % (name, len(found),
          ', '.join('%s%dx%d@%d,%d' % (c['kind'][0], c['w'], c['h'], c['box'][0], c['box'][1]) for c in found)))

json.dump(res, open('work/pills.json', 'w'), indent=1)
