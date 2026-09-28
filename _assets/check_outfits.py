"""
Check the catalogue lists for the mistakes that are easy to make by hand.

Two of the twenty frames turned out to be the same outfit photographed twice,
and two different caps had been given the same name, so both read as one thing.
Neither is visible while reading the file; both are obvious to a script.

  npm run outfits:check
"""
import collections
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, '_assets', 'outfits.json')
PRODUCTS_DATA = os.path.join(ROOT, '_assets', 'new-products.json')
FRAMES = os.path.join(ROOT, 'public', 'looks')
PRODUCT_PHOTOS = os.path.join(ROOT, 'public', 'products')


def check(outfits):
    problems = []

    # one frame stands behind one outfit: a repeated frame means the same
    # outfit is being sold twice
    for name, count in collections.Counter(o['file'] for o in outfits).items():
        if count > 1:
            problems.append(f'кадр {name} использован {count} раза')

    for key, label in (('slug', 'адрес'), ('name', 'название')):
        for value, count in collections.Counter(o[key] for o in outfits).items():
            if count > 1:
                problems.append(f'{label} «{value}» повторяется {count} раза')

    # a garment belongs to one outfit; the same title in two of them means
    # either a duplicate frame or two different things named alike
    where = collections.defaultdict(list)
    for outfit in outfits:
        for piece in outfit['pieces']:
            where[piece['title']].append(outfit['name'])
    for title, names in where.items():
        if len(names) > 1:
            problems.append(f'вещь «{title}» числится в образах: {", ".join(names)}')

    for outfit in outfits:
        counts = collections.Counter(p['title'] for p in outfit['pieces'])
        for title, count in counts.items():
            if count > 1:
                problems.append(f'в «{outfit["name"]}» вещь «{title}» указана {count} раза')
        if not 2 <= len(outfit['pieces']) <= 5:
            problems.append(f'в «{outfit["name"]}» {len(outfit["pieces"])} вещей, ожидалось от 2 до 5')

    # the same thing costing two different amounts is a typo, not a discount
    prices = collections.defaultdict(set)
    for outfit in outfits:
        for piece in outfit['pieces']:
            prices[piece['title']].add(piece['price'])
    for title, values in prices.items():
        if len(values) > 1:
            problems.append(f'у «{title}» разные цены: {sorted(values)}')

    for outfit in outfits:
        if not os.path.exists(os.path.join(FRAMES, f'{outfit["file"]}.jpg')):
            problems.append(f'нет файла {outfit["file"]}.jpg')
        for piece in outfit['pieces']:
            if piece['price'] <= 0:
                problems.append(f'у «{piece["title"]}» цена {piece["price"]}')

    return problems


def check_products(items):
    """The same kinds of mistake, for the garments sold on their own."""
    problems = []

    for key, label in (('slug', 'адрес'), ('name', 'название'), ('frame', 'кадр')):
        for value, count in collections.Counter(i[key] for i in items).items():
            if count > 1:
                problems.append(f'{label} «{value}» повторяется {count} раза')

    for item in items:
        if not re.fullmatch(r'[a-z0-9-]+', item['slug']):
            problems.append(f'адрес «{item["slug"]}» не латиницей')
        if not re.fullmatch(r'#[0-9a-f]{6}', item['color'][2]):
            problems.append(f'у «{item["slug"]}» испорченный цвет {item["color"][2]}')
        if item['price'] <= 0:
            problems.append(f'у «{item["slug"]}» цена {item["price"]}')
        if not os.path.exists(os.path.join(PRODUCT_PHOTOS, f'{item["slug"]}.jpg')):
            problems.append(f'нет фотографии {item["slug"]}.jpg')

    return problems


def main():
    with open(DATA, encoding='utf-8') as handle:
        outfits = json.load(handle)['outfits']

    with open(PRODUCTS_DATA, encoding='utf-8') as handle:
        products = json.load(handle)['products']

    problems = check(outfits) + check_products(products)
    pieces = sum(len(o['pieces']) for o in outfits)
    print(f'образов: {len(outfits)}, вещей в них: {pieces}, отдельных товаров: {len(products)}')

    if problems:
        print('НАЙДЕНЫ ОШИБКИ:')
        for problem in problems:
            print(f'  - {problem}')
        sys.exit(1)

    print('повторов и пропусков нет')


if __name__ == '__main__':
    main()
