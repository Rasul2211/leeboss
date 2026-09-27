/**
 * Load the garments photographed in the shop's finished outfits into the
 * catalogue, and build a look out of each frame.
 *
 * Reads _assets/look-items.json, which carries one entry per garment with the
 * rectangle it occupies in its frame; crop_look_items.py turns those rectangles
 * into product photographs first.
 *
 * Safe to run twice: everything is matched by slug and updated in place, so a
 * second run changes nothing rather than creating a second copy.
 *
 *   python _assets/crop_look_items.py
 *   npm run looks:import
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MannequinSlot, PrismaClient, SizeType } from '@prisma/client';

const prisma = new PrismaClient();

/** Every variant starts at the same count: real stock belongs to the shop. */
const DEFAULT_STOCK = 4;

type Kind = {
  subcategory: string;
  parent: string;
  parentName: string;
  slot: MannequinSlot;
  sizeType: SizeType;
  sizes: string[];
};

const LETTER_SIZES = ['S', 'M', 'L', 'XL'];
const SHOE_SIZES = ['40', '41', '42', '43', '44'];

const KINDS: Record<string, Kind> = {
  futbolka: { subcategory: 'Футболки', parent: 'verh', parentName: 'Верх', slot: 'TOP', sizeType: 'LETTER', sizes: LETTER_SIZES },
  teniska: { subcategory: 'Тениска', parent: 'verh', parentName: 'Верх', slot: 'TOP', sizeType: 'LETTER', sizes: LETTER_SIZES },
  rubashka: { subcategory: 'Рубашки', parent: 'verh', parentName: 'Верх', slot: 'TOP', sizeType: 'LETTER', sizes: LETTER_SIZES },
  bryuki: { subcategory: 'Брюки', parent: 'niz', parentName: 'Низ', slot: 'BOTTOM', sizeType: 'LETTER', sizes: LETTER_SIZES },
  dzhinsy: { subcategory: 'Джинсы', parent: 'niz', parentName: 'Низ', slot: 'BOTTOM', sizeType: 'LETTER', sizes: LETTER_SIZES },
  kedy: { subcategory: 'Кеды', parent: 'obuv', parentName: 'Обувь', slot: 'SHOES', sizeType: 'EU', sizes: SHOE_SIZES },
  krossovki: { subcategory: 'Кроссовки', parent: 'obuv', parentName: 'Обувь', slot: 'SHOES', sizeType: 'EU', sizes: SHOE_SIZES },
  lofery: { subcategory: 'Лоферы', parent: 'obuv', parentName: 'Обувь', slot: 'SHOES', sizeType: 'EU', sizes: SHOE_SIZES },
  sandalii: { subcategory: 'Сандалии', parent: 'obuv', parentName: 'Обувь', slot: 'SHOES', sizeType: 'EU', sizes: SHOE_SIZES },
  kepka: { subcategory: 'Кепки', parent: 'golovnye-ubory', parentName: 'Головные уборы', slot: 'HEADWEAR', sizeType: 'ONE_SIZE', sizes: ['ONE'] },
};

/** url slug for a subcategory that the seed does not already create */
const NEW_SUBCATEGORY_SLUGS: Record<string, string> = {
  'Рубашки': 'rubashki',
  'Лоферы': 'lofery',
  'Сандалии': 'sandalii',
};

type Item = {
  slug: string;
  name: string;
  kind: string;
  color: [string, string, string];
  price: number;
  box: number[];
};

type Look = { file: string; name: string; items: Item[]; reuse?: string[] };

function load(): Look[] {
  const path = join(process.cwd(), '_assets', 'look-items.json');
  return (JSON.parse(readFileSync(path, 'utf8')) as { looks: Look[] }).looks;
}

/** A stable sku from the slug, so re-running does not invent a new one. */
function skuFor(slug: string): string {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `LB-${hash.toString(36).toUpperCase().padStart(7, '0').slice(0, 7)}`;
}

async function categoryFor(kind: Kind): Promise<string> {
  const existing = await prisma.category.findFirst({
    where: { name: kind.subcategory, parent: { slug: kind.parent } },
    select: { id: true },
  });
  if (existing) return existing.id;

  // the parent sections come from the seed; only create one if it is missing
  const parent = await prisma.category.upsert({
    where: { slug: kind.parent },
    update: {},
    create: {
      slug: kind.parent,
      name: kind.parentName,
      sizeType: kind.sizeType,
      mannequinSlot: kind.slot,
      sortOrder: 9,
    },
    select: { id: true },
  });

  const slug = NEW_SUBCATEGORY_SLUGS[kind.subcategory] ?? kind.subcategory.toLowerCase();
  const created = await prisma.category.upsert({
    where: { slug },
    update: { isActive: true },
    create: {
      slug,
      name: kind.subcategory,
      sizeType: kind.sizeType,
      mannequinSlot: kind.slot,
      sortOrder: 9,
      parentId: parent.id,
    },
    select: { id: true },
  });
  return created.id;
}

async function upsertProduct(item: Item): Promise<string> {
  const kind = KINDS[item.kind];
  if (!kind) throw new Error(`неизвестный тип «${item.kind}» у ${item.slug}`);

  const categoryId = await categoryFor(kind);
  const [key, colourName, hex] = item.color;

  const product = await prisma.product.upsert({
    where: { slug: item.slug },
    update: { name: item.name, price: item.price, categoryId, isActive: true },
    create: {
      sku: skuFor(item.slug),
      slug: item.slug,
      name: item.name,
      price: item.price,
      categoryId,
      mannequinSlot: kind.slot,
      images: { create: [{ url: `/products/${item.slug}.jpg`, alt: item.name, sortOrder: 0 }] },
      colors: { create: [{ key, name: colourName, hex, sortOrder: 0 }] },
    },
    select: { id: true, colors: { select: { id: true } } },
  });

  const colour = product.colors[0];
  if (colour) {
    // createMany skips rows that clash, which is what a second run should do
    await prisma.productVariant.createMany({
      data: kind.sizes.map((size) => ({
        productId: product.id,
        colorId: colour.id,
        size,
        stock: DEFAULT_STOCK,
      })),
      skipDuplicates: true,
    });
  }

  return product.id;
}

async function upsertLook(look: Look, index: number, ids: Map<string, string>) {
  const slugs = [...look.items.map((i) => i.slug), ...(look.reuse ?? [])];

  const existing = await prisma.look.findFirst({
    where: { name: look.name, isPublic: true },
    select: { id: true },
  });

  const record = existing
    ? await prisma.look.update({
        where: { id: existing.id },
        data: { sortOrder: index },
        select: { id: true },
      })
    : await prisma.look.create({
        data: { name: look.name, isPublic: true, sortOrder: index },
        select: { id: true },
      });

  // rebuild the contents rather than diffing them: a look is a short list and
  // this keeps a re-run from leaving a stale item behind
  await prisma.lookItem.deleteMany({ where: { lookId: record.id } });

  for (const slug of slugs) {
    const productId = ids.get(slug);
    if (!productId) continue;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { mannequinSlot: true, colors: { select: { key: true }, take: 1 } },
    });
    if (!product) continue;

    await prisma.lookItem.create({
      data: {
        lookId: record.id,
        productId,
        slot: product.mannequinSlot,
        colorKey: product.colors[0]?.key ?? null,
      },
    });
  }
}

/** The shop sells no accessories, so the section must not sit in the menu. */
async function dropAccessories() {
  const category = await prisma.category.findUnique({
    where: { slug: 'aksessuary' },
    select: { id: true, _count: { select: { products: true } } },
  });
  if (!category) {
    console.log('раздел «Аксессуары»: уже отсутствует');
    return;
  }

  if (category._count.products > 0) {
    // deleting would take the products with it, so the section is only hidden
    await prisma.category.update({ where: { id: category.id }, data: { isActive: false } });
    console.log(`раздел «Аксессуары»: скрыт, в нём ${category._count.products} товаров`);
    return;
  }

  await prisma.category.delete({ where: { id: category.id } });
  console.log('раздел «Аксессуары»: удалён');
}

async function main() {
  const looks = load();
  const ids = new Map<string, string>();

  for (const look of looks) {
    for (const item of look.items) {
      ids.set(item.slug, await upsertProduct(item));
    }
  }
  console.log(`товаров заведено: ${ids.size}`);

  // existing catalogue products can be reused by slug in a look
  for (const look of looks) {
    for (const slug of look.reuse ?? []) {
      if (ids.has(slug)) continue;
      const found = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
      if (found) ids.set(slug, found.id);
    }
  }

  for (const [index, look] of looks.entries()) {
    await upsertLook(look, index + 1, ids);
  }
  console.log(`образов собрано: ${looks.length}`);

  await dropAccessories();

  const products = await prisma.product.count({ where: { isActive: true } });
  const publicLooks = await prisma.look.count({ where: { isPublic: true } });
  console.log(`\nв каталоге товаров: ${products}, публичных образов: ${publicLooks}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
