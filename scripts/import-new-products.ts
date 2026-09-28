/**
 * Load the autumn delivery into the catalogue.
 *
 * Reads _assets/new-products.json, one entry per garment, with the photograph
 * already cut to 3:4 and named after the slug.
 *
 * Safe to run twice: matched by slug and updated in place.
 *
 *   npm run products:import
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MannequinSlot, PrismaClient, SizeType } from '@prisma/client';

const prisma = new PrismaClient();

/** The shop sets real stock itself; a seed should not invent it. */
const DEFAULT_STOCK = 3;

const LETTER_SIZES = ['S', 'M', 'L', 'XL'];
const SHOE_SIZES = ['40', '41', '42', '43', '44'];

type Kind = {
  subcategory: string;
  /** url slug, used only when the subcategory has to be created */
  subcategorySlug: string;
  parent: string;
  parentName: string;
  slot: MannequinSlot;
  sizeType: SizeType;
  sizes: string[];
};

const KINDS: Record<string, Kind> = {
  kedy: { subcategory: 'Кеды', subcategorySlug: 'kedy', parent: 'obuv', parentName: 'Обувь', slot: 'SHOES', sizeType: 'EU', sizes: SHOE_SIZES },
  dzhemper: { subcategory: 'Джемперы', subcategorySlug: 'dzhempery', parent: 'verh', parentName: 'Верх', slot: 'TOP', sizeType: 'LETTER', sizes: LETTER_SIZES },
  bryuki: { subcategory: 'Брюки', subcategorySlug: 'bryuki', parent: 'niz', parentName: 'Низ', slot: 'BOTTOM', sizeType: 'LETTER', sizes: LETTER_SIZES },
  dzhinsy: { subcategory: 'Джинсы', subcategorySlug: 'dzhinsy', parent: 'niz', parentName: 'Низ', slot: 'BOTTOM', sizeType: 'LETTER', sizes: LETTER_SIZES },
};

type Item = {
  frame: number;
  slug: string;
  name: string;
  kind: string;
  color: [string, string, string];
  price: number;
};

function load(): Item[] {
  const path = join(process.cwd(), '_assets', 'new-products.json');
  return (JSON.parse(readFileSync(path, 'utf8')) as { products: Item[] }).products;
}

/** A stable sku from the slug, so a re-run does not invent a new one. */
function skuFor(slug: string): string {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `LB-N${hash.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`;
}

async function categoryFor(kind: Kind): Promise<string> {
  const existing = await prisma.category.findFirst({
    where: { name: kind.subcategory, parent: { slug: kind.parent } },
    select: { id: true },
  });
  if (existing) return existing.id;

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

  const created = await prisma.category.upsert({
    where: { slug: kind.subcategorySlug },
    update: { isActive: true },
    create: {
      slug: kind.subcategorySlug,
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

async function upsert(item: Item) {
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
}

async function main() {
  const items = load();
  for (const item of items) {
    await upsert(item);
    console.log(`${item.name}: ${item.price} сомони`);
  }

  const total = await prisma.product.count({ where: { isActive: true, isOutfit: false } });
  console.log(`\nзаведено ${items.length}, всего вещей в каталоге: ${total}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
