# -*- coding: utf-8 -*-
"""Step 3: find every burnt-in sticker and paint it out."""
import glob, os, json
from PIL import Image, ImageFilter, ImageDraw
from collections import deque

CLOSE = 13
PAD = 9


def mask_of(im, test):
    px, (w, h) = im.load(), im.size
    m = Image.new('L', (w, h), 0)
    mp = m.load()
    for y in range(h):
        for x in range(w):
            if test(px[x, y]):
                mp[x, y] = 255
    return m


def closed(m):
    return m.filter(ImageFilter.MaxFilter(CLOSE)).filter(ImageFilter.MinFilter(CLOSE))


is_red = lambda c: c[0] > 105 and c[0] - c[1] > 45 and c[0] - c[2] > 45
is_dark = lambda c: max(c) < 80 and max(c) - min(c) < 30


def comps(m):
    w, h = m.size
    mp = m.load()
    seen = bytearray(w * h)
    out = []
    for y0 in range(h):
        for x0 in range(w):
            if not mp[x0, y0] or seen[y0 * w + x0]:
                continue
            q = deque([(x0, y0)]); seen[y0 * w + x0] = 1; n = 0
            bx0 = bx1 = x0; by0 = by1 = y0
            while q:
                x, y = q.popleft(); n += 1
                if x < bx0: bx0 = x
                if x > bx1: bx1 = x
                if y < by0: by0 = y
                if y > by1: by1 = y
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and mp[nx, ny] and not seen[ny * w + nx]:
                        seen[ny * w + nx] = 1; q.append((nx, ny))
            bw, bh = bx1 - bx0 + 1, by1 - by0 + 1
            out.append({'box': [bx0, by0, bx1, by1], 'w': bw, 'h': bh,
                        'fill': n / float(bw * bh)})
    return out


def solid_pills(im):
    out = []
    for test in (is_red, is_dark):
        for c in comps(closed(mask_of(im, test))):
            if 55 <= c['w'] <= 340 and 18 <= c['h'] <= 175 and c['fill'] >= 0.68:
                out.append(c['box'])
    return out


def text_pills(im):
    """Light pills carry dark lettering - cluster the glyphs instead of the fill."""
    w, h = im.size
    glyphs = [c for c in comps(mask_of(im, is_dark))
              if 6 <= c['w'] <= 70 and 9 <= c['h'] <= 70 and c['fill'] >= 0.20]
    boxes = [g['box'] for g in glyphs]
    merged, used = [], [False] * len(boxes)
    for i, b in enumerate(boxes):
        if used[i]:
            continue
        grp = [b]; used[i] = True; changed = True
        while changed:
            changed = False
            gx0 = min(x[0] for x in grp); gy0 = min(x[1] for x in grp)
            gx1 = max(x[2] for x in grp); gy1 = max(x[3] for x in grp)
            for j, o in enumerate(boxes):
                if used[j]:
                    continue
                if o[0] <= gx1 + 26 and o[2] >= gx0 - 26 and o[1] <= gy1 + 20 and o[3] >= gy0 - 20:
                    grp.append(o); used[j] = True; changed = True
        gx0 = min(x[0] for x in grp); gy0 = min(x[1] for x in grp)
        gx1 = max(x[2] for x in grp); gy1 = max(x[3] for x in grp)
        bw, bh = gx1 - gx0 + 1, gy1 - gy0 + 1
        near_edge = gx0 < 70 or gx1 > w - 70
        vert_ok = gy0 < h * 0.38 or gy1 > h * 0.60
        if len(grp) >= 3 and 55 <= bw <= 340 and 16 <= bh <= 175 and near_edge and vert_ok:
            merged.append([gx0, gy0, gx1, gy1])
    return merged


def union(boxes, w, h):
    boxes = [[max(0, b[0] - PAD), max(0, b[1] - PAD),
              min(w - 1, b[2] + PAD), min(h - 1, b[3] + PAD)] for b in boxes]
    changed = True
    while changed:
        changed = False
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]
                if a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]:
                    boxes[i] = [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]
                    boxes.pop(j); changed = True; break
            if changed:
                break
    return boxes


def inpaint(im, box):
    """Fill a rectangle by blending horizontal and vertical edge interpolation."""
    x0, y0, x1, y1 = box
    w, h = im.size
    px = im.load()
    lx, rx = max(0, x0 - 1), min(w - 1, x1 + 1)
    ty, by = max(0, y0 - 1), min(h - 1, y1 + 1)
    patch = {}
    for y in range(y0, y1 + 1):
        cl, cr = px[lx, y], px[rx, y]
        for x in range(x0, x1 + 1):
            t = (x - x0 + 1) / float(x1 - x0 + 2)
            patch[(x, y)] = [cl[k] + (cr[k] - cl[k]) * t for k in range(3)]
    for x in range(x0, x1 + 1):
        ct, cb = px[x, ty], px[x, by]
        for y in range(y0, y1 + 1):
            t = (y - y0 + 1) / float(y1 - y0 + 2)
            v = [ct[k] + (cb[k] - ct[k]) * t for k in range(3)]
            dx = min(x - x0, x1 - x) + 1
            dy = min(y - y0, y1 - y) + 1
            wh = dy / float(dx + dy)          # closer to a vertical edge -> trust the row blend
            hcol = patch[(x, y)]
            px[x, y] = tuple(int(round(hcol[k] * wh + v[k] * (1 - wh))) for k in range(3))
    # soften the seam
    reg = im.crop((x0, y0, x1 + 1, y1 + 1)).filter(ImageFilter.GaussianBlur(2.2))
    im.paste(reg, (x0, y0))


os.makedirs('work/step3', exist_ok=True)
os.makedirs('work/mark', exist_ok=True)
rep = {}
for f in sorted(glob.glob('work/step2/*.jpg')):
    im = Image.open(f).convert('RGB')
    w, h = im.size
    boxes = union(solid_pills(im) + text_pills(im), w, h)
    name = os.path.basename(f)
    mk = im.copy(); dr = ImageDraw.Draw(mk)
    for b in boxes:
        dr.rectangle(b, outline=(255, 0, 255), width=4)
    mk.save('work/mark/' + name, quality=88)
    for b in boxes:
        inpaint(im, b)
    im.save('work/step3/' + name, quality=95)
    rep[name] = boxes
    print('%-32s %d box(es)' % (name, len(boxes)))

json.dump(rep, open('work/boxes.json', 'w'), indent=1)
