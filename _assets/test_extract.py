# -*- coding: utf-8 -*-
"""
Prove the layer extraction works before anyone spends a day shooting.

Builds a synthetic session: a "model" on a wall, then the same model with a
garment shape on the torso, including the camera drift and sensor noise a real
phone produces. Then checks the extracted layer really is the garment and
nothing else.
"""
import os
import random
import sys
from PIL import Image, ImageDraw, ImageChops

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_layers import extract  # noqa: E402

W, H = 600, 900
TMP = os.path.join('_assets', '_test_extract')

failures = 0


def check(label, ok, detail=''):
    global failures
    if not ok:
        failures += 1
    print('  %s  %s%s' % ('ok  ' if ok else 'FAIL', label, ('  — ' + detail) if detail else ''))


def noise(img, amount=4):
    """Sensor noise: without it the test would be unrealistically kind."""
    px = img.load()
    rnd = random.Random(7)
    for y in range(0, img.height, 2):
        for x in range(0, img.width, 2):
            r, g, b = px[x, y]
            d = rnd.randint(-amount, amount)
            px[x, y] = (max(0, min(255, r + d)), max(0, min(255, g + d)), max(0, min(255, b + d)))
    return img


def make_base():
    img = Image.new('RGB', (W, H), (236, 233, 228))
    d = ImageDraw.Draw(img)
    d.ellipse([255, 70, 345, 185], fill=(214, 186, 160))        # head
    d.rounded_rectangle([230, 185, 370, 560], 40, fill=(214, 186, 160))  # torso
    d.rounded_rectangle([243, 555, 291, 850], 24, fill=(214, 186, 160))  # left leg
    d.rounded_rectangle([309, 555, 357, 850], 24, fill=(214, 186, 160))  # right leg
    return noise(img)


def make_frame(base, shift=(0, 0)):
    """The same model wearing a shirt, with the camera drifted a little."""
    img = base.copy()
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([222, 200, 378, 470], 30, fill=(96, 58, 40))
    if shift != (0, 0):
        img = ImageChops.offset(img, shift[0], shift[1])
    return noise(img, 3)


def main():
    os.makedirs(TMP, exist_ok=True)
    base = make_base()
    base_path = os.path.join(TMP, 'base.jpg')
    base.save(base_path, quality=95)

    print('\nБез сдвига камеры')
    frame_path = os.path.join(TMP, 'shirt.jpg')
    make_frame(base).save(frame_path, quality=95)
    out = os.path.join(TMP, 'out_shirt.png')
    box, err = extract(base_path, frame_path, out)
    check('слой извлечён', err is None, err or '')
    if box:
        # the drawn shirt occupies x 222..378, y 200..470
        check('рамка по горизонтали совпадает', abs(box[0] - 222) < 14 and abs(box[2] - 378) < 14,
              'получено x %d..%d' % (box[0], box[2]))
        check('рамка по вертикали совпадает', abs(box[1] - 200) < 14 and abs(box[3] - 470) < 14,
              'получено y %d..%d' % (box[1], box[3]))
        check('голова не попала в слой', box[1] > 186, 'верх слоя y=%d, голова кончается на 185' % box[1])
        check('ноги не попали в слой', box[3] < 556, 'низ слоя y=%d, ноги начинаются с 555' % box[3])

    print('\nСо сдвигом камеры на 6 пикселей')
    frame2 = os.path.join(TMP, 'shirt_shifted.jpg')
    make_frame(base, shift=(6, -4)).save(frame2, quality=95)
    out2 = os.path.join(TMP, 'out_shifted.png')
    box2, err2 = extract(base_path, frame2, out2)
    check('слой извлечён несмотря на сдвиг', err2 is None, err2 or '')
    if box2:
        wide = box2[2] - box2[0]
        tall = box2[3] - box2[1]
        check('размер слоя не раздуло', wide < 210 and tall < 330,
              'получено %dx%d, ожидалось около 156x270' % (wide, tall))

    print('\nКадр без изменений')
    same = os.path.join(TMP, 'same.jpg')
    noise(base.copy(), 3).save(same, quality=95)
    _, err3 = extract(base_path, same, os.path.join(TMP, 'out_same.png'))
    check('одинаковые кадры отвергаются', err3 is not None, err3 or 'слой создан там, где вещи нет')

    print('\n%s\n' % ('Все проверки пройдены.' if failures == 0 else '%d проверок провалено.' % failures))
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
