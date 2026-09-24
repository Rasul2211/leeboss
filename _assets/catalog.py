# -*- coding: utf-8 -*-
"""Build the product catalogue that will feed the Prisma seed."""
import json
import os
import shutil

TOP, BOTTOM, SHOES, HEAD = 'TOP', 'BOTTOM', 'SHOES', 'HEADWEAR'
LETTER, EU = 'LETTER', 'EU'

COLORS = {
    'white': ('Белый', '#F3F1EC'),
    'cream': ('Кремовый', '#EBE3D2'),
    'beige': ('Бежевый', '#D9C9A8'),
    'brown': ('Коричневый', '#6B4A32'),
    'khaki': ('Хаки', '#7A6A4F'),
    'black': ('Чёрный', '#1A1A1A'),
    'navy': ('Тёмно-синий', '#23304A'),
    'blue': ('Голубой', '#5B7FA6'),
    'lblue': ('Светло-синий', '#8FA9C4'),
    'grey': ('Серый', '#9A9A9A'),
    'lgrey': ('Светло-серый', '#C6C6C6'),
    'burgundy': ('Бордовый', '#5C1F27'),
    'red': ('Красный', '#B3261E'),
    'purple': ('Фиолетовый', '#7C5AC0'),
    'pink': ('Розовый', '#D1436A'),
    'silver': ('Серебристый', '#BFC3C7'),
    'green': ('Зелёный', '#2F5D50'),
}

# stamp, slug, name, subcategory, slot, sizeType, sizes, sizesStated, price, brand, colours, sizeNote
ITEMS = [
    ('18-36-54', 'bryuki-belye', 'Брюки белые', 'Брюки', BOTTOM, LETTER, ['S', 'M', 'L', 'XL'], True, 250, None, ['white'], None),
    ('18-37-00', 'bryuki-korichnevye', 'Брюки коричневые', 'Брюки', BOTTOM, LETTER, ['S', 'M', 'L', 'XL'], True, 250, None, ['brown'], None),
    ('18-37-04', 'bryuki-temno-sinie-lyon', 'Брюки тёмно-синие льняные', 'Брюки', BOTTOM, LETTER, ['S', 'M', 'L', 'XL'], False, 250, None, ['navy'], None),
    ('18-37-07', 'bryuki-kremovye-lyon', 'Брюки кремовые льняные', 'Брюки', BOTTOM, LETTER, ['S', 'M', 'L', 'XL'], False, 250, None, ['cream'], None),
    ('18-37-11', 'shtany-chernye', 'Штаны чёрные', 'Штаны', BOTTOM, LETTER, ['S', 'M', 'L', 'XL'], False, 250, None, ['black'], None),
    ('18-37-15', 'dzhinsy-chernye', 'Джинсы чёрные', 'Джинсы', BOTTOM, LETTER, ['S', 'M', 'L', 'XL'], False, 250, None, ['black'], None),
    ('18-37-18', 'bryuki-kremovye', 'Брюки кремовые', 'Брюки', BOTTOM, LETTER, ['S', 'M', 'L', 'XL'], False, 250, None, ['cream'], None),
    ('18-37-23', 'shtany-temno-sinie', 'Штаны тёмно-синие', 'Штаны', BOTTOM, LETTER, ['S', 'M', 'L', 'XL'], False, 250, None, ['navy'], None),
    ('18-37-26', 'shtany-korichnevye', 'Штаны коричневые', 'Штаны', BOTTOM, LETTER, ['S', 'M', 'L', 'XL'], False, 250, None, ['khaki'], None),
    ('18-37-30', 'bryuki-temno-sinie', 'Брюки тёмно-синие', 'Брюки', BOTTOM, LETTER, ['S', 'M', 'L', 'XL'], False, 300, None, ['navy'], None),
    ('18-37-33', 'dzhinsy-golubye-klassika', 'Джинсы голубые', 'Джинсы', BOTTOM, LETTER, ['S', 'M', 'L', 'XL'], False, 280, None, ['blue'], None),
    ('18-37-36', 'dzhinsy-temno-sinie-shirokie', 'Джинсы тёмно-синие широкие', 'Джинсы', BOTTOM, LETTER, ['M', 'L', 'XL'], True, 360, None, ['navy'], None),
    ('18-37-40', 'dzhinsy-korichnevye-gradient', 'Джинсы коричневые градиент', 'Джинсы', BOTTOM, LETTER, ['M', 'L', 'XL'], True, 360, None, ['brown'], None),
    ('18-37-44', 'dzhinsy-svetlye-potertye', 'Джинсы светлые потёртые', 'Джинсы', BOTTOM, LETTER, ['M', 'L', 'XL', 'XXL'], True, 330, None, ['lblue'], None),
    ('18-37-47', 'dzhinsy-golubye-shirokie', 'Джинсы голубые широкие', 'Джинсы', BOTTOM, LETTER, ['M', 'L', 'XL', 'XXL'], False, 330, None, ['blue'], None),
    ('18-37-50', 'dzhinsy-golubye-baggy', 'Джинсы голубые багги', 'Джинсы', BOTTOM, LETTER, ['M', 'L', 'XL', 'XXL'], True, 360, None, ['blue'], None),
    ('18-37-53', 'futbolki-s-printom', 'Футболки с принтом', 'Футболки', TOP, LETTER, ['S', 'M', 'L', 'XL'], False, 170, None, ['black', 'cream'], None),
    ('18-37-57', 'futbolka-belaya-oversayz', 'Футболка белая оверсайз', 'Футболки', TOP, LETTER, ['S', 'M', 'L', 'XL'], False, 160, None, ['white'], None),
    ('18-38-00', 'futbolki-bazovye', 'Футболки базовые', 'Футболки', TOP, LETTER, ['S', 'M', 'L', 'XL'], False, 180, None, ['black', 'white'], None),
    ('18-38-04', 'teniska-korichnevaya', 'Тениска коричневая', 'Тениска', TOP, LETTER, ['S', 'M', 'L', 'XL'], False, 250, None, ['brown'], None),
    ('18-38-08', 'teniska-temno-sinyaya', 'Тениска тёмно-синяя', 'Тениска', TOP, LETTER, ['S', 'M', 'L', 'XL'], False, 250, None, ['navy'], None),
    ('18-38-12', 'teniska-polo-chernaya', 'Тениска-поло чёрная', 'Тениска', TOP, LETTER, ['S', 'M', 'L', 'XL'], True, 250, None, ['black'], None),
    ('18-38-16', 'teniska-polo-belaya', 'Тениска-поло белая', 'Тениска', TOP, LETTER, ['S', 'M', 'L', 'XL'], True, 250, None, ['cream'], None),
    ('18-38-19', 'teniska-bezhevaya-belaya', 'Тениска бежевая и белая', 'Тениска', TOP, LETTER, ['M', 'L', 'XL', 'XXL'], False, 230, None, ['beige', 'white'], None),
    ('18-38-23', 'teniska-korichnevaya-bezhevaya', 'Тениска коричневая и бежевая', 'Тениска', TOP, LETTER, ['M', 'L', 'XL', 'XXL'], True, 220, None, ['brown', 'beige'], None),
    ('18-38-26', 'teniska-chernaya-vyazanaya', 'Тениска чёрная вязаная', 'Тениска', TOP, LETTER, ['S', 'M', 'L', 'XL', 'XXL'], True, 230, None, ['black'], None),
    ('18-38-29', 'teniska-chernaya-fakturnaya', 'Тениска чёрная фактурная', 'Тениска', TOP, LETTER, ['S', 'M', 'L', 'XL', 'XXL'], True, 240, None, ['black'], None),
    ('22-44-27', 'nb-327', 'New Balance 327', 'Кроссовки', SHOES, EU, ['39', '40', '44'], True, 130, 'New Balance', ['cream', 'green'], None),
    ('22-44-31', 'on-roger', 'On Roger', 'Кроссовки', SHOES, EU, ['41', '42', '43', '44', '45'], True, 200, 'On', ['white'], None),
    ('22-44-34', 'nb-530', 'New Balance 530', 'Кроссовки', SHOES, EU, ['39', '40', '41', '42', '44'], True, 200, 'New Balance', ['lgrey', 'beige'], None),
    ('22-44-37', 'cactus-bandana', 'Cactus Bandana', 'Кроссовки', SHOES, EU, ['41', '42'], True, 150, None, ['navy', 'beige'], None),
    ('22-44-41', 'nike-dunk-cacao', 'Nike Dunk Cacao', 'Кроссовки', SHOES, EU, ['38', '39', '41', '44'], True, 180, 'Nike', ['brown', 'white'], 'Чуть маломерят'),
    ('22-44-43', 'nike-cortez', 'Nike Cortez', 'Кроссовки', SHOES, EU, ['38', '39', '40', '42', '44'], True, 180, 'Nike', ['white', 'red'], None),
    ('22-44-49', 'adidas-forum', 'Adidas Forum', 'Кроссовки', SHOES, EU, ['40'], True, 200, 'Adidas', ['white', 'black'], None),
    ('22-44-52', 'adidas-forum-bad-bunny', 'Adidas Forum Bad Bunny', 'Кроссовки', SHOES, EU, ['43'], True, 140, 'Adidas', ['beige', 'brown'], None),
    ('22-44-55', 'adidas-gazelle', 'Adidas Gazelle', 'Кроссовки', SHOES, EU, ['40', '41', '42', '43', '44'], True, 200, 'Adidas', ['red'], None),
    ('22-44-58', 'nike-air-force-1', 'Nike Air Force 1', 'Кроссовки', SHOES, EU, ['44'], True, 150, 'Nike', ['beige'], None),
    ('22-45-02', 'bape-sta', 'Bape Sta', 'Кроссовки', SHOES, EU, ['40'], True, 200, 'Bape', ['silver'], None),
    ('22-45-05', 'nb-550', 'New Balance 550', 'Кеды', SHOES, EU, ['39'], True, 150, 'New Balance', ['white', 'green'], None),
    ('22-45-08', 'converse-chuck-taylor', 'Converse Chuck Taylor', 'Кеды', SHOES, EU, ['38'], True, 140, 'Converse', ['black'], None),
    ('22-45-11', 'shapki-vyazanye', 'Шапки вязаные', 'Шапки', HEAD, LETTER, ['ONE'], True, 150, None, ['cream', 'red', 'black', 'navy'], None),
    ('22-45-14', 'shapki-vyazanye-melanzh', 'Шапки вязаные меланж', 'Шапки', HEAD, LETTER, ['ONE'], True, 150, None, ['grey', 'burgundy', 'black', 'cream', 'lgrey', 'beige'], None),
    ('22-45-17', 'kepki-klassicheskie', 'Кепки классические', 'Кепки', HEAD, LETTER, ['ONE'], True, 140, None, ['white', 'purple', 'navy', 'black', 'pink'], None),
    ('22-45-21', 'kepka-bezhevaya', 'Кепка бежевая', 'Кепки', HEAD, LETTER, ['ONE'], True, 160, None, ['cream'], None),
    ('22-45-25', 'kepka-chernaya', 'Кепка чёрная', 'Кепки', HEAD, LETTER, ['ONE'], True, 160, None, ['black'], None),
]

# Prices I set myself after checking somon.tj and wildberries.tj - the owner replaces them in the admin panel.
PRICE_ASSUMED = {'18-37-47', '18-38-19', '22-45-11', '22-45-14', '22-45-17', '22-45-21', '22-45-25'}

SKU_PREFIX = {TOP: 'TP', BOTTOM: 'BT', SHOES: 'SH', HEAD: 'HD'}


def main():
    os.makedirs('catalog/images', exist_ok=True)
    products = []
    counter = {}
    for stamp, slug, name, sub, slot, stype, sizes, stated, price, brand, colours, note in ITEMS:
        shutil.copy2('work/final3/photo_2026-09-22_%s.jpg' % stamp, 'catalog/images/%s.jpg' % slug)
        counter[slot] = counter.get(slot, 0) + 1
        products.append({
            'sku': '%s-%03d' % (SKU_PREFIX[slot], counter[slot]),
            'slug': slug,
            'name': name,
            'subcategory': sub,
            'mannequinSlot': slot,
            'sizeType': stype,
            'sizes': sizes,
            'sizesStated': stated,
            'price': price,
            'priceAssumed': stamp in PRICE_ASSUMED,
            'brand': brand,
            'colors': [{'key': k, 'name': COLORS[k][0], 'hex': COLORS[k][1]} for k in colours],
            'sizeNote': note,
            'image': 'products/%s.jpg' % slug,
            'source': 'photo_2026-09-22_%s.jpg' % stamp,
        })

    with open('catalog/catalog.json', 'w', encoding='utf-8') as fh:
        json.dump(products, fh, ensure_ascii=False, indent=1)

    print('products: %d' % len(products))
    for slot in sorted(counter):
        print('  %-10s %d' % (slot, counter[slot]))
    print('prices I set myself:      %d' % sum(1 for p in products if p['priceAssumed']))
    print('size runs not on photo:   %d' % sum(1 for p in products if not p['sizesStated']))
    print('products with a brand:    %d' % sum(1 for p in products if p['brand']))


if __name__ == '__main__':
    main()
