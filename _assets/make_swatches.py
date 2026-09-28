"""
Cut a fabric swatch out of every product photograph.

On the mannequin a garment is a flat block of colour, so a knitted polo and a
printed tee look identical - and the weave is a good part of what the buyer is
paying for. A small square lifted from the middle of the photograph carries it:
the middle is fabric in every shot, whether the piece hangs on a rail or is worn.

The swatch is stretched once over each panel rather than repeated. Making it
tile was tried first, by swapping quadrants and fading the seams, and the seams
showed anyway - a grid of them across a sleeve is worse than a weave that is
slightly too large.

It is also flattened to a neutral mid grey before it is saved. The mannequin
multiplies it by the product's own colour, so a dark photograph and a dark
colour compounded into near-black: a knitted polo listed as brown came out
almost as dark as a black one. Levelled off, the swatch carries only the weave
and the folds, and the colour decides the shade.

  npm run swatches
"""
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'products')
OUT = os.path.join(ROOT, 'public', 'swatches')

SIZE = 256
# how much of the frame the swatch comes from: small enough to stay on the
# garment, large enough to catch a stripe or a rib
SHARE = 0.34


def centre_crop(im):
    w, h = im.size
    side = int(min(w, h) * SHARE)
    # slightly above centre: on a worn shot the middle of the frame is the
    # chest, while lower down a belt or a waistband often cuts in
    cx, cy = w // 2, int(h * 0.44)
    box = (cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)
    return im.crop(box).resize((SIZE, SIZE), Image.LANCZOS)


# what the levelled swatch averages out to: bright enough that a dark colour
# stays readable, dark enough that a white one does not blow out
TARGET = 168
# how much of the original colour is kept; the rest comes from the product
TINT = 0.18


def neutralise(im):
    a = np.asarray(im, dtype=np.float32)
    grey = a.mean(axis=2, keepdims=True)
    # pull each pixel most of the way towards its own brightness, so a stripe
    # stays a stripe but its hue no longer fights the product's colour
    a = grey * (1 - TINT) + a * TINT
    mean = float(a.mean())
    if mean > 1:
        a *= TARGET / mean
    return Image.fromarray(np.clip(a, 0, 255).astype('uint8'), 'RGB')


def main():
    os.makedirs(OUT, exist_ok=True)
    made = 0

    for name in sorted(os.listdir(SRC)):
        if not name.endswith('.jpg'):
            continue
        im = Image.open(os.path.join(SRC, name)).convert('RGB')
        swatch = neutralise(centre_crop(im))
        swatch.save(os.path.join(OUT, name), quality=86, optimize=True)
        made += 1

    print(f'образцов ткани: {made}')


if __name__ == '__main__':
    main()
