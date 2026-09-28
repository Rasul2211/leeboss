import { prisma } from '@/lib/prisma';
import { productCardSelect, type ProductCardData } from '@/lib/catalog';
import { effectivePrice } from '@/lib/money';
import type { CarouselItem } from '@/components/home/ProductCarousel';

/**
 * Which garments can be shown on their own, away from an outfit.
 *
 * Listed by hand rather than filtered by category, because what decides it is
 * the photograph, not the kind of thing: about half the catalogue was shot on a
 * person, and a torso between two pairs of trainers breaks the row. Those
 * pieces stay in the catalogue and out of here until they are reshot.
 */
const SHOES = [
  'adidas-gazelle',
  'nike-dunk-cacao',
  'nike-cortez',
  'nike-air-force-1',
  'adidas-forum',
  'adidas-forum-bad-bunny',
  'bape-sta',
  'converse-chuck-taylor',
  'nb-327',
  'nb-550',
  'on-roger',
];

/** Everything else shot on its own: caps, knitwear, denim. */
const OTHERS = [
  'teniska-chernaya-vyazanaya',
  'teniska-chernaya-fakturnaya',
  'kepka-chernaya',
  'kepka-bezhevaya',
  'dzhinsy-golubye-baggy',
  'dzhinsy-golubye-shirokie',
  'dzhinsy-svetlye-potertye',
  'dzhinsy-temno-sinie-shirokie',
  'dzhinsy-korichnevye-gradient',
  'cactus-bandana',
];

/** The shoe row: one pair at a time, large, the way the shop shoots them. */
export async function getShoeCarousel(): Promise<CarouselItem[]> {
  const rows = await prisma.product.findMany({
    where: { slug: { in: SHOES }, isActive: true },
    select: {
      slug: true,
      name: true,
      brand: true,
      price: true,
      salePrice: true,
      images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
    },
  });

  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  // keep the order written above rather than whatever the query returns
  return SHOES.flatMap((slug) => {
    const row = bySlug.get(slug);
    const image = row?.images[0]?.url;
    if (!row || !image) return [];
    return [
      {
        slug: row.slug,
        name: row.name,
        brand: row.brand,
        price: effectivePrice(row.price, row.salePrice),
        image,
      },
    ];
  });
}

/** The rest, as ordinary cards. */
export async function getSinglesGrid(): Promise<ProductCardData[]> {
  const rows = await prisma.product.findMany({
    where: { slug: { in: OTHERS }, isActive: true },
    select: productCardSelect,
  });

  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  return OTHERS.flatMap((slug) => {
    const row = bySlug.get(slug);
    return row ? [row] : [];
  });
}
