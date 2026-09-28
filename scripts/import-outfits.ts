/**
 * Load the shop's finished outfits into the catalogue.
 *
 * An outfit is one catalogue row: the photograph is the frame as it was shot,
 * whole, and the price is the sum of the pieces listed in _assets/outfits.json.
 * Cutting the frames into separate garments was tried and thrown away - shoes
 * lie across the clothes and slice them apart.
 *
 * Safe to run twice: matched by slug and updated in place.
 *
 *   npm run outfits:import
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** The shop sets real stock itself; a seed should not invent it. */
const DEFAULT_STOCK = 3;

/**
 * An outfit needs no mannequin slot, but the column is required, so it takes
 * the one it is closest to. `isOutfit` is what actually keeps it out of the
 * fitting room.
 */
const SLOT = 'TOP' as const;

const CATEGORY = { slug: 'obrazy', name: 'Образы', sortOrder: 0 };

type Piece = { title: string; price: number };
type Outfit = { slug: string; file: string; name: string; pieces: Piece[] };

function load(): Outfit[] {
  const path = join(process.cwd(), '_assets', 'outfits.json');
  return (JSON.parse(readFileSync(path, 'utf8')) as { outfits: Outfit[] }).outfits;
}

/** A stable sku from the slug, so a re-run does not invent a new one. */
function skuFor(slug: string): string {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `LB-O${hash.toString(36).toUpperCase().padStart(6, '0').slice(0, 6)}`;
}

async function categoryId(): Promise<string> {
  const category = await prisma.category.upsert({
    where: { slug: CATEGORY.slug },
    update: { isActive: true, sortOrder: CATEGORY.sortOrder },
    create: {
      slug: CATEGORY.slug,
      name: CATEGORY.name,
      sizeType: 'LETTER',
      mannequinSlot: SLOT,
      sortOrder: CATEGORY.sortOrder,
    },
    select: { id: true },
  });
  return category.id;
}

async function importOutfit(outfit: Outfit, category: string) {
  const total = outfit.pieces.reduce((sum, piece) => sum + piece.price, 0);
  const image = `/looks/${outfit.file}.jpg`;

  const product = await prisma.product.upsert({
    where: { slug: outfit.slug },
    update: { name: outfit.name, price: total, categoryId: category, isOutfit: true, isActive: true },
    create: {
      sku: skuFor(outfit.slug),
      slug: outfit.slug,
      name: outfit.name,
      price: total,
      categoryId: category,
      mannequinSlot: SLOT,
      isOutfit: true,
      images: { create: [{ url: image, alt: outfit.name, sortOrder: 0 }] },
      colors: { create: [{ key: 'kak-na-foto', name: 'Как на фото', hex: '#8d7f6c', sortOrder: 0 }] },
    },
    select: { id: true, colors: { select: { id: true } } },
  });

  // rebuild the price list rather than diffing it: it is three or four lines
  await prisma.productPiece.deleteMany({ where: { productId: product.id } });
  await prisma.productPiece.createMany({
    data: outfit.pieces.map((piece, index) => ({
      productId: product.id,
      title: piece.title,
      price: piece.price,
      sortOrder: index,
    })),
  });

  // one variant: the three sizes a buyer picks are recorded on the order line,
  // because an outfit's top, bottom and shoes are sized separately
  const colour = product.colors[0];
  if (colour) {
    await prisma.productVariant.createMany({
      data: [{ productId: product.id, colorId: colour.id, size: 'ONE', stock: DEFAULT_STOCK }],
      skipDuplicates: true,
    });
  }

  return total;
}

async function main() {
  const outfits = load();
  const category = await categoryId();

  for (const outfit of outfits) {
    const total = await importOutfit(outfit, category);
    console.log(`${outfit.name}: ${outfit.pieces.length} вещи, ${total} сомони`);
  }

  const count = await prisma.product.count({ where: { isOutfit: true, isActive: true } });
  console.log(`\nобразов в каталоге: ${count}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
