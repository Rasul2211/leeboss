import { prisma } from '@/lib/prisma';
import { productCardSelect, type ProductCardData } from '@/lib/catalog';
import { effectivePrice } from '@/lib/money';
import type { CarouselItem } from '@/components/home/ProductCarousel';

/**
 * The pairs photographed on their own, in the order they read best side by
 * side. They lead the shoe row; pairs shot on a foot follow after them.
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

const tileSelect = {
  slug: true,
  name: true,
  brand: true,
  price: true,
  salePrice: true,
  images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
} as const;

type TileRow = {
  slug: string;
  name: string;
  brand: string | null;
  price: number;
  salePrice: number | null;
  images: { url: string }[];
};

function toTile(row: TileRow): CarouselItem[] {
  const image = row.images[0]?.url;
  if (!image) return [];
  return [
    {
      slug: row.slug,
      name: row.name,
      brand: row.brand,
      price: effectivePrice(row.price, row.salePrice),
      image,
    },
  ];
}

/** Rows in the order of a hand-written list, then whatever the list does not name. */
function inListOrder<T extends { slug: string }>(rows: T[], order: string[]): T[] {
  const rank = new Map(order.map((slug, index) => [slug, index]));
  return [...rows].sort(
    (a, b) => (rank.get(a.slug) ?? order.length) - (rank.get(b.slug) ?? order.length),
  );
}

/**
 * The shoe row: one pair at a time, large, the way the shop shoots them.
 *
 * Every pair the shop has, so nothing sits behind a "see all": the pairs shot
 * on their own come first in the order above, the rest follow.
 */
export async function getShoeCarousel(): Promise<CarouselItem[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true, isOutfit: false, mannequinSlot: 'SHOES' },
    select: tileSelect,
    orderBy: { createdAt: 'desc' },
  });
  return inListOrder(rows, SHOES).flatMap(toTile);
}

/**
 * What the first screen turns over, tile by tile.
 *
 * The tall tile takes garments photographed on a person, which is the only
 * kind of frame that fills a tall space well; they are named by hand for that
 * reason. The two square tiles take the outfits and the trainers.
 */
const HERO_WORN = [
  'teniska-polo-belaya',
  'bryuki-kremovye-so-strelkami',
  'teniska-korichnevaya',
  'bryuki-temno-sinie-klassika',
  'teniska-temno-sinyaya',
  'shtany-korichnevye',
  'teniska-polo-chernaya',
  'bryuki-temno-sinie-lyon',
];

const HERO_SHOES = ['nike-cortez', 'adidas-gazelle', 'nb-550', 'bape-sta', 'nike-dunk-cacao', 'on-roger'];

export type HeroShowcaseData = {
  worn: CarouselItem[];
  outfits: CarouselItem[];
  shoes: CarouselItem[];
};

export async function getHeroShowcase(): Promise<HeroShowcaseData> {
  const [named, outfits] = await Promise.all([
    prisma.product.findMany({
      where: { slug: { in: [...HERO_WORN, ...HERO_SHOES] }, isActive: true },
      select: tileSelect,
    }),
    prisma.product.findMany({
      where: { isActive: true, isOutfit: true },
      select: tileSelect,
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  const pick = (order: string[]) =>
    inListOrder(named.filter((row) => order.includes(row.slug)), order).flatMap(toTile);

  return { worn: pick(HERO_WORN), outfits: outfits.flatMap(toTile), shoes: pick(HERO_SHOES) };
}

/** A card, plus which section it belongs to - for the filter on the home page. */
export type SectionedProduct = {
  product: ProductCardData;
  section: { slug: string; name: string; sortOrder: number };
};

/**
 * Every garment the shop sells on its own, newest first.
 *
 * The home page shows all of them rather than a handful and a link: on a phone
 * a link is one more page to wait for, and scrolling is free.
 */
export async function getAllGarments(): Promise<SectionedProduct[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true, isOutfit: false },
    orderBy: { createdAt: 'desc' },
    select: {
      ...productCardSelect,
      category: {
        select: {
          slug: true,
          name: true,
          sortOrder: true,
          parent: { select: { slug: true, name: true, sortOrder: true } },
        },
      },
    },
  });

  return rows.map(({ category, ...product }) => ({
    product,
    section: category.parent ?? category,
  }));
}

