/**
 * LEEBOSS.TJ - database seed.
 *
 * Product data comes from _assets/catalog/catalog.json, which was built from the
 * shop's own Instagram story screenshots. Fields the photos did not state
 * (composition, care) stay empty rather than being invented.
 */
import { PrismaClient, MannequinSlot, SizeType, FitType, Role, Permission, Build } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type CatalogColor = { key: string; name: string; hex: string };
type CatalogItem = {
  sku: string;
  slug: string;
  name: string;
  subcategory: string;
  mannequinSlot: keyof typeof MannequinSlot;
  sizeType: 'LETTER' | 'EU';
  sizes: string[];
  sizesStated: boolean;
  price: number;
  priceAssumed: boolean;
  brand: string | null;
  colors: CatalogColor[];
  sizeNote: string | null;
  image: string;
};

/** Every variant starts with the same stock: real counts belong to the shop, not to a seed. */
const DEFAULT_STOCK = 4;

/** Demo accounts. The password is intentionally obvious - this build handles no real money. */
const DEMO_PASSWORD = 'leeboss2026';

const PARENTS = [
  { slug: 'verh', name: 'Верх', slot: 'TOP', sizeType: 'LETTER', order: 1 },
  { slug: 'niz', name: 'Низ', slot: 'BOTTOM', sizeType: 'LETTER', order: 2 },
  { slug: 'obuv', name: 'Обувь', slot: 'SHOES', sizeType: 'EU', order: 3 },
  { slug: 'golovnye-ubory', name: 'Головные уборы', slot: 'HEADWEAR', sizeType: 'ONE_SIZE', order: 4 },
  { slug: 'verhnyaya-odezhda', name: 'Верхняя одежда', slot: 'OUTERWEAR', sizeType: 'LETTER', order: 5 },
  { slug: 'aksessuary', name: 'Аксессуары', slot: 'ACCESSORY', sizeType: 'ONE_SIZE', order: 6 },
] as const;

/** Subcategory label -> its parent and url slug. */
const CHILDREN: Record<string, { parent: string; slug: string; order: number }> = {
  'Футболки': { parent: 'verh', slug: 'futbolki', order: 1 },
  'Тениска': { parent: 'verh', slug: 'teniska', order: 2 },
  'Брюки': { parent: 'niz', slug: 'bryuki', order: 1 },
  'Штаны': { parent: 'niz', slug: 'shtany', order: 2 },
  'Джинсы': { parent: 'niz', slug: 'dzhinsy', order: 3 },
  'Кроссовки': { parent: 'obuv', slug: 'krossovki', order: 1 },
  'Кеды': { parent: 'obuv', slug: 'kedy', order: 2 },
  'Шапки': { parent: 'golovnye-ubory', slug: 'shapki', order: 1 },
  'Кепки': { parent: 'golovnye-ubory', slug: 'kepki', order: 2 },
};

/** Oversize items sit further off the body in the fitting room. */
const OVERSIZE = new Set([
  'futbolka-belaya-oversayz',
  'dzhinsy-temno-sinie-shirokie',
  'dzhinsy-golubye-shirokie',
  'dzhinsy-golubye-baggy',
  'dzhinsy-svetlye-potertye',
]);
const SLIM = new Set(['teniska-polo-chernaya', 'teniska-polo-belaya', 'teniska-chernaya-vyazanaya']);

/** Testimonials supplied by the shop owner. */
const TESTIMONIALS: [author: string, text: string][] = [
  ['Алишер', 'Взял футболку и остался доволен. Материал приятный, размер подошёл идеально.'],
  ['Гафур', 'Заказывал спортивный костюм. Качество хорошее, всё аккуратно и быстро доставили.'],
  ['Исмоил', 'Купил рубашку для повседневной носки. Очень понравился фасон и качество ткани.'],
  ['Зиератшох', 'Брал джинсы. Размер подошёл, сидят отлично. Думаю заказать ещё одну вещь.'],
  ['Иброхим', 'Заказал футболку и брюки. Хорошее качество за свою цену, всё понравилось.'],
  ['Муниса', 'Покупала куртку. Вживую выглядит очень стильно, размер соответствует описанию.'],
  ['Мухаммад', 'Заказывал полный образ — футболку, брюки и кроссовки. Всё подошло, получилось очень красиво.'],
];

const ZONES = [
  { city: 'Душанбе', cost: 20, freeThreshold: 500, daysMin: 1, daysMax: 2 },
  { city: 'Худжанд', cost: 40, freeThreshold: null, daysMin: 3, daysMax: 5 },
  { city: 'Бохтар', cost: 40, freeThreshold: null, daysMin: 3, daysMax: 5 },
  { city: 'Куляб', cost: 40, freeThreshold: null, daysMin: 3, daysMax: 5 },
  { city: 'Истаравшан', cost: 40, freeThreshold: null, daysMin: 3, daysMax: 5 },
  { city: 'Хорог', cost: 40, freeThreshold: null, daysMin: 3, daysMax: 5 },
];

// the address must not repeat the name: the two are shown side by side
const PICKUP = [
  { name: 'ТЦ Муниса', address: '2 этаж, ориентир ЦУМ, Душанбе', hoursFrom: '10:00', hoursTo: '21:00' },
  { name: 'ТЦ Сиёма Молл', address: '1 этаж, Душанбе', hoursFrom: '10:00', hoursTo: '22:00' },
];

/** Curated outfits for the home page, built only from products that actually exist. */
const LOOKS: { name: string; items: string[] }[] = [
  { name: 'Городской минимализм', items: ['futbolka-belaya-oversayz', 'bryuki-temno-sinie-lyon', 'nike-cortez'] },
  { name: 'Летний лён', items: ['teniska-polo-belaya', 'bryuki-kremovye-lyon', 'nb-327'] },
  { name: 'Деним и тениска', items: ['teniska-korichnevaya', 'dzhinsy-golubye-baggy', 'adidas-forum-bad-bunny'] },
  { name: 'Чёрный монохром', items: ['teniska-polo-chernaya', 'shtany-chernye', 'converse-chuck-taylor', 'kepka-chernaya'] },
];

function fitFor(slug: string): FitType {
  if (OVERSIZE.has(slug)) return FitType.OVERSIZE;
  if (SLIM.has(slug)) return FitType.SLIM;
  return FitType.REGULAR;
}

/**
 * Empty every table in one statement.
 *
 * Twenty separate deleteMany calls means twenty round trips, and against a
 * database on another continent that is both slow and fragile - a hosted
 * Postgres will drop the connection part way through. TRUNCATE ... CASCADE
 * does the same job atomically in a single trip and ignores row order.
 */
async function reset() {
  const tables = [
    'OrderStatusEvent', 'OrderItem', 'Review', 'Order',
    'CartItem', 'Cart', 'LookItem', 'Look', 'Favorite',
    'ProductVariant', 'ProductColor', 'ProductImage', 'Product', 'Category',
    'MannequinPreset', 'EmployeePermission', 'Address', 'User',
    'DeliveryZone', 'PickupPoint', 'Testimonial',
  ];
  const list = tables.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

async function seedCategories() {
  const ids = new Map<string, string>();
  for (const p of PARENTS) {
    const row = await prisma.category.create({
      data: {
        slug: p.slug,
        name: p.name,
        mannequinSlot: p.slot as MannequinSlot,
        sizeType: p.sizeType as SizeType,
        sortOrder: p.order,
      },
    });
    ids.set(p.slug, row.id);
  }
  for (const [label, c] of Object.entries(CHILDREN)) {
    const parent = PARENTS.find((p) => p.slug === c.parent)!;
    const row = await prisma.category.create({
      data: {
        slug: c.slug,
        name: label,
        mannequinSlot: parent.slot as MannequinSlot,
        sizeType: parent.sizeType as SizeType,
        sortOrder: c.order,
        parentId: ids.get(c.parent)!,
      },
    });
    ids.set(label, row.id);
  }
  return ids;
}

async function seedProducts(categoryIds: Map<string, string>) {
  const file = join(process.cwd(), '_assets', 'catalog', 'catalog.json');
  const items: CatalogItem[] = JSON.parse(readFileSync(file, 'utf8'));
  const bySlug = new Map<string, string>();

  for (const item of items) {
    const note = [
      item.sizeNote,
      item.priceAssumed ? 'Цена уточняется' : null,
      !item.sizesStated ? 'Размерный ряд уточняется' : null,
    ]
      .filter(Boolean)
      .join('. ');

    const product = await prisma.product.create({
      data: {
        sku: item.sku,
        slug: item.slug,
        name: item.name,
        brand: item.brand,
        price: item.price,
        categoryId: categoryIds.get(item.subcategory)!,
        mannequinSlot: MannequinSlot[item.mannequinSlot],
        fitType: fitFor(item.slug),
        sizeNote: note || null,
        images: { create: [{ url: `/${item.image}`, alt: item.name, sortOrder: 0 }] },
        colors: {
          create: item.colors.map((c, i) => ({ key: c.key, name: c.name, hex: c.hex, sortOrder: i })),
        },
      },
      include: { colors: true },
    });

    const sizes = item.sizes.length ? item.sizes : ['ONE'];
    await prisma.productVariant.createMany({
      data: product.colors.flatMap((color) =>
        sizes.map((size) => ({ productId: product.id, colorId: color.id, size, stock: DEFAULT_STOCK })),
      ),
    });

    bySlug.set(item.slug, product.id);
  }
  return bySlug;
}

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await prisma.user.create({
    data: { phone: '+992900000001', name: 'Администратор', role: Role.ADMIN, passwordHash },
  });

  const manager = await prisma.user.create({
    data: {
      phone: '+992900000002',
      name: 'Менеджер заказов',
      role: Role.EMPLOYEE,
      passwordHash,
      permissions: {
        create: [Permission.ORDERS_VIEW, Permission.ORDERS_MANAGE, Permission.CUSTOMERS_VIEW].map(
          (permission) => ({ permission }),
        ),
      },
    },
  });

  const content = await prisma.user.create({
    data: {
      phone: '+992900000003',
      name: 'Контент-менеджер',
      role: Role.EMPLOYEE,
      passwordHash,
      permissions: {
        create: [
          Permission.PRODUCTS_VIEW,
          Permission.PRODUCTS_MANAGE,
          Permission.CATEGORIES_MANAGE,
          Permission.LOOKS_MANAGE,
        ].map((permission) => ({ permission })),
      },
    },
  });

  const customer = await prisma.user.create({
    data: {
      phone: '+992900000010',
      name: 'Алишер',
      role: Role.CUSTOMER,
      passwordHash,
      mannequinPreset: { create: { height: 178, weight: 76, build: Build.AVERAGE, size: 'M' } },
    },
  });

  return { admin, manager, content, customer };
}

async function seedLooks(productIds: Map<string, string>) {
  for (const [i, look] of LOOKS.entries()) {
    const items = look.items
      .map((slug) => ({ slug, id: productIds.get(slug) }))
      .filter((x): x is { slug: string; id: string } => Boolean(x.id));

    if (items.length !== look.items.length) {
      console.warn(`look "${look.name}": skipped missing products`);
    }

    const rows = await Promise.all(
      items.map(async ({ id }) => {
        const p = await prisma.product.findUniqueOrThrow({ where: { id }, select: { mannequinSlot: true } });
        return { productId: id, slot: p.mannequinSlot };
      }),
    );

    await prisma.look.create({
      data: { name: look.name, isPublic: true, sortOrder: i, items: { create: rows } },
    });
  }
}

async function main() {
  await reset();

  const categoryIds = await seedCategories();
  const productIds = await seedProducts(categoryIds);
  await seedUsers();
  await seedLooks(productIds);

  await prisma.deliveryZone.createMany({ data: ZONES });
  await prisma.pickupPoint.createMany({ data: PICKUP });
  await prisma.testimonial.createMany({
    data: TESTIMONIALS.map(([authorName, text], i) => ({ authorName, text, sortOrder: i })),
  });

  const counts = {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    looks: await prisma.look.count(),
    zones: await prisma.deliveryZone.count(),
    testimonials: await prisma.testimonial.count(),
    users: await prisma.user.count(),
  };
  console.table(counts);
  console.log(`demo login: +992900000001 / ${DEMO_PASSWORD} (admin)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
