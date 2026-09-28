import { prisma } from '@/lib/prisma';
import { effectivePrice } from '@/lib/money';
import type { CarouselItem } from '@/components/home/ProductCarousel';

/**
 * The garments that can be shown on their own, large and centred.
 *
 * Listed by hand rather than filtered by category, because what decides it is
 * the photograph, not the kind of thing: about half the catalogue was shot on a
 * person, and a torso in the middle of a row of trainers on white breaks the
 * whole row. Those pieces stay in the catalogue and out of here until they are
 * reshot.
 */
const SHOT_ALONE = [
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
  'cactus-bandana',
  'kepka-chernaya',
  'kepka-bezhevaya',
  'teniska-chernaya-vyazanaya',
  'teniska-chernaya-fakturnaya',
  'dzhinsy-golubye-baggy',
  'dzhinsy-golubye-shirokie',
  'dzhinsy-svetlye-potertye',
  'dzhinsy-temno-sinie-shirokie',
  'dzhinsy-korichnevye-gradient',
];

export async function getCarouselItems(): Promise<CarouselItem[]> {
  const rows = await prisma.product.findMany({
    where: { slug: { in: SHOT_ALONE }, isActive: true },
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

  // keep the order written above: it alternates shoes, caps and denim, which a
  // query ordered by price or date would not
  return SHOT_ALONE.flatMap((slug) => {
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
