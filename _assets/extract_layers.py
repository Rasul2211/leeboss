# -*- coding: utf-8 -*-
"""
Turn a photo session into fitting-room layers.

The idea that makes this cheap: photograph the model once with nothing on that
the clothes will hide, then once per garment, without moving the camera. The
difference between the base frame and a garment frame IS the garment, so the
cut-out comes out of arithmetic instead of an hour of masking per item.

Layout expected under _assets/fitting/<bodyType>/:

    base.jpg                the model in neutral underwear
    <product-slug>.jpg      the same model wearing that product

Output lands in public/fitting/<bodyType>/ as PNGs with transparency, plus a
manifest.json the import script feeds into the database.

Run:  python _assets/extract_layers.py slim
"""
import json
import os
import sys
from PIL import Image, ImageChops, ImageFilter

# a pixel counts as "changed" once it differs from the base by this much,
# measured on the sum of the three channels
DIFF_THRESHOLD = 34
# specks smaller than this are camera noise, not clothing
MIN_BLOB_FRACTION = 0.0015
# how far the model is allowed to have drifted between frames
MAX_SHIFT = 12


def load(path):
    return Image.open(path).convert('RGB')


def _mismatch(a, b, dx, dy):
    """Total brightness difference once the second image is shifted."""
    diff = ImageChops.difference(a, ImageChops.offset(b, dx, dy))
    return sum(i * n for i, n in enumerate(diff.histogram()))


def best_alignment(base, frame, limit=MAX_SHIFT):
    """
    Find the shift that best lines the frame up with the base.

    However carefully the session is run, the model breathes and shifts a
    little. Left uncorrected, even a few pixels of drift outline the whole
    silhouette in false differences and the extracted garment comes out with a
    halo of body around it.

    Searched coarsely at quarter scale first, then refined pixel by pixel:
    scanning the full range at full resolution would be sixteen times the work
    for the same answer, and scanning only coarsely misses shifts that are not
    a multiple of four.
    """
    grey_base = base.convert('L')
    grey_frame = frame.convert('L')

    small_base = grey_base.resize((base.width // 4, base.height // 4))
    small_frame = grey_frame.resize((frame.width // 4, frame.height // 4))

    coarse, coarse_score = (0, 0), None
    reach = max(1, limit // 4)
    for dy in range(-reach, reach + 1):
        for dx in range(-reach, reach + 1):
            score = _mismatch(small_base, small_frame, dx, dy)
            if coarse_score is None or score < coarse_score:
                coarse_score, coarse = score, (dx * 4, dy * 4)

    best, best_score = coarse, None
    for dy in range(coarse[1] - 3, coarse[1] + 4):
        for dx in range(coarse[0] - 3, coarse[0] + 4):
            if abs(dx) > limit or abs(dy) > limit:
                continue
            score = _mismatch(grey_base, grey_frame, dx, dy)
            if best_score is None or score < best_score:
                best_score, best = score, (dx, dy)
    return best


def garment_mask(base, frame):
    """Everything that changed between the two frames, cleaned up."""
    dx, dy = best_alignment(base, frame)
    if dx or dy:
        frame = ImageChops.offset(frame, dx, dy)

    diff = ImageChops.difference(base, frame).convert('L')
    mask = diff.point(lambda v: 255 if v > DIFF_THRESHOLD else 0)

    # close the speckle inside the garment, then drop the speckle outside it
    mask = mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    return mask, frame


def largest_region(mask):
    """Keep the one big shape and throw away the confetti."""
    w, h = mask.size
    px = mask.load()
    seen = bytearray(w * h)
    best, best_size = None, 0

    for y0 in range(0, h, 2):
        for x0 in range(0, w, 2):
            if px[x0, y0] == 0 or seen[y0 * w + x0]:
                continue
            stack, pixels = [(x0, y0)], []
            seen[y0 * w + x0] = 1
            while stack:
                x, y = stack.pop()
                pixels.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and px[nx, ny] and not seen[ny * w + nx]:
                        seen[ny * w + nx] = 1
                        stack.append((nx, ny))
            if len(pixels) > best_size:
                best_size, best = len(pixels), pixels

    if not best or best_size < w * h * MIN_BLOB_FRACTION:
        return None

    cleaned = Image.new('L', (w, h), 0)
    cp = cleaned.load()
    for x, y in best:
        cp[x, y] = 255
    return cleaned


def extract(base_path, frame_path, out_path):
    base = load(base_path)
    frame = load(frame_path)
    if base.size != frame.size:
        return None, 'кадры разного размера'

    mask, aligned = garment_mask(base, frame)
    region = largest_region(mask)
    if region is None:
        return None, 'разницы между кадрами почти нет'

    # a hard edge looks cut out with scissors; one pixel of blur reads as cloth
    region = region.filter(ImageFilter.GaussianBlur(1.0))

    out = aligned.convert('RGBA')
    out.putalpha(region)
    box = out.getbbox()
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out.save(out_path, 'PNG', optimize=True)
    return box, None


def main():
    if len(sys.argv) < 2:
        print('укажите телосложение: slim, average или heavy')
        return 1

    body = sys.argv[1].lower()
    src = os.path.join('_assets', 'fitting', body)
    dst = os.path.join('public', 'fitting', body)
    base_path = os.path.join(src, 'base.jpg')

    if not os.path.isdir(src):
        print('нет папки', src)
        return 1
    if not os.path.exists(base_path):
        print('нет базового кадра', base_path)
        return 1

    base = load(base_path)
    os.makedirs(dst, exist_ok=True)
    base.save(os.path.join(dst, 'base.jpg'), quality=92)

    manifest = {'bodyType': body.upper(), 'width': base.width, 'height': base.height, 'layers': []}
    frames = sorted(f for f in os.listdir(src) if f.lower().endswith(('.jpg', '.jpeg', '.png')))

    for name in frames:
        slug = os.path.splitext(name)[0]
        if slug == 'base':
            continue
        out_path = os.path.join(dst, slug + '.png')
        box, error = extract(base_path, os.path.join(src, name), out_path)
        if error:
            print('  %-34s ПРОПУЩЕН — %s' % (slug, error))
            continue
        manifest['layers'].append({'slug': slug, 'file': f'/fitting/{body}/{slug}.png', 'box': box})
        print('  %-34s готов  %s' % (slug, box))

    with open(os.path.join(dst, 'manifest.json'), 'w', encoding='utf-8') as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=1)

    print('\nслоёв получено: %d, размер кадра %dx%d' % (len(manifest['layers']), base.width, base.height))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
