import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { STOREFRONT_TAG, STOREFRONT_TTL } from '@/lib/storefront';
import { type SortKey } from '@/lib/catalog-url';

export { isSortKey, type SortKey } from '@/lib/catalog-url';

/** Shape every product grid renders from. */
export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  price: true,
  salePrice: true,
  // an outfit is photographed square; its card must not crop it to 3:4
  isOutfit: true,
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
  colors: { select: { key: true, name: true, hex: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export const SORTS = {
  new: { createdAt: 'desc' },
  cheap: { price: 'asc' },
  expensive: { price: 'desc' },
  name: { name: 'asc' },
} as const satisfies Record<SortKey, Prisma.ProductOrderByWithRelationInput>;

export const SORT_LABELS: Record<SortKey, string> = {
  new: 'Сначала новые',
  cheap: 'Сначала дешёвые',
  expensive: 'Сначала дорогие',
  name: 'По названию',
};

/**
 * Top-level sections with their subcategories, for the header menu and catalogue rail.
 *
 * Kept between requests: the header is on every page, including the ones that
 * cannot be prerendered (basket, checkout, account), and none of them should
 * wait on the database for a menu that changes a few times a year.
 */
export const getCategoryTree = unstable_cache(loadCategoryTree, ['category-tree'], {
  tags: [STOREFRONT_TAG],
  revalidate: STOREFRONT_TTL,
});

async function loadCategoryTree() {
  return prisma.category.findMany({
    where: { parentId: null, isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      mannequinSlot: true,
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          slug: true,
          name: true,
          sizeType: true,
          _count: { select: { products: { where: { isActive: true } } } },
        },
      },
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
}

type ListArgs = {
  categorySlug?: string;
  search?: string;
  sort?: SortKey;
  page?: number;
  perPage?: number;
  sizes?: string[];
  colorKeys?: string[];
};

/**
 * One query for the whole catalogue. A category slug may point at a section
 * ("niz") or a leaf ("dzhinsy"); both must work from the same URL shape.
 */
export async function listProducts({
  categorySlug,
  search,
  sort = 'new',
  page = 1,
  perPage = 24,
  sizes,
  colorKeys,
}: ListArgs) {
  const where: Prisma.ProductWhereInput = { isActive: true };

  if (categorySlug) {
    where.category = {
      OR: [{ slug: categorySlug }, { parent: { slug: categorySlug } }],
    };
  }

  if (search?.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { brand: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ];
  }

  // a size or colour filter must match a variant that is actually in stock
  const variantFilters: Prisma.ProductVariantWhereInput[] = [];
  if (sizes?.length) variantFilters.push({ size: { in: sizes }, stock: { gt: 0 } });
  if (colorKeys?.length) variantFilters.push({ color: { key: { in: colorKeys } }, stock: { gt: 0 } });
  if (variantFilters.length) {
    where.AND = variantFilters.map((v) => ({ variants: { some: v } }));
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: productCardSelect,
      orderBy: SORTS[sort],
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

/** Once per render: the page and its metadata both ask for the same product. */
export const getProductBySlug = cache(async (slug: string) => {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { select: { slug: true, name: true, sizeType: true, parent: { select: { slug: true, name: true } } } },
      images: { orderBy: { sortOrder: 'asc' } },
      colors: { orderBy: { sortOrder: 'asc' } },
      variants: { select: { id: true, size: true, stock: true, colorId: true } },
      pieces: { orderBy: { sortOrder: 'asc' }, select: { id: true, title: true, price: true } },
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, rating: true, text: true, createdAt: true, user: { select: { name: true } } },
      },
    },
  });
});

/** A category by its address, with what the catalogue page needs around it. */
export const getCategoryBySlug = cache(async (slug: string) => {
  return prisma.category.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      parent: {
        select: {
          slug: true,
          name: true,
          // the sections next door, so a leaf page is not a dead end
          children: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: { slug: true, name: true },
          },
        },
      },
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: { slug: true, name: true },
      },
    },
  });
});

/** What goes with what: under trousers, show tops and shoes, and so on. */
const WORN_WITH: Record<string, string[]> = {
  TOP: ['BOTTOM', 'SHOES'],
  OUTERWEAR: ['BOTTOM', 'SHOES'],
  BOTTOM: ['TOP', 'SHOES'],
  SHOES: ['BOTTOM', 'TOP'],
  HEADWEAR: ['TOP', 'BOTTOM'],
  ACCESSORY: ['TOP', 'BOTTOM'],
};

/** A steady number from a slug, so each product gets its own pick but always the same one. */
function seedOf(text: string): number {
  let seed = 0;
  for (const char of text) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return seed;
}

/** Takes `count` items starting from a point that depends on the seed. */
function pickFrom<T>(items: T[], count: number, seed: number): T[] {
  if (items.length <= count) return items;
  const start = seed % items.length;
  return Array.from({ length: count }, (_, index) => items[(start + index) % items.length]!);
}

type RelatedTo = {
  id: string;
  slug: string;
  categoryId: string;
  isOutfit: boolean;
  mannequinSlot: string;
  category: { parent: { slug: string } | null };
};

/**
 * What to show under a product: more of the same kind, and what it is worn with.
 *
 * "More of the same" is the product's own section first (other trousers under
 * trousers), topped up from the sections beside it when that one is small.
 * An outfit is a whole look already, so under it there are only other outfits.
 */
export async function getRelatedProducts(product: RelatedTo) {
  const seed = seedOf(product.slug);
  const base = { isActive: true, id: { not: product.id } } satisfies Prisma.ProductWhereInput;

  if (product.isOutfit) {
    const outfits = await prisma.product.findMany({
      where: { ...base, isOutfit: true },
      select: productCardSelect,
      orderBy: { createdAt: 'desc' },
      take: 24,
    });
    return { similar: pickFrom(outfits, 6, seed), wornWith: [] as ProductCardData[] };
  }

  const slots = WORN_WITH[product.mannequinSlot] ?? [];
  const [same, nearby, ...others] = await Promise.all([
    prisma.product.findMany({
      where: { ...base, isOutfit: false, categoryId: product.categoryId },
      select: productCardSelect,
      orderBy: { createdAt: 'desc' },
      take: 24,
    }),
    product.category.parent
      ? prisma.product.findMany({
          where: {
            ...base,
            isOutfit: false,
            categoryId: { not: product.categoryId },
            category: { parent: { slug: product.category.parent.slug } },
          },
          select: productCardSelect,
          orderBy: { createdAt: 'desc' },
          take: 12,
        })
      : Promise.resolve([] as ProductCardData[]),
    ...slots.map((slot) =>
      prisma.product.findMany({
        where: { ...base, isOutfit: false, mannequinSlot: slot as Prisma.EnumMannequinSlotFilter['equals'] },
        select: productCardSelect,
        orderBy: { createdAt: 'desc' },
        take: 24,
      }),
    ),
  ]);

  const similar = pickFrom(same, 6, seed);
  if (similar.length < 6) similar.push(...pickFrom(nearby, 6 - similar.length, seed));

  // two from each kind it is worn with, interleaved so the row is not all shoes
  const picks = others.map((list, index) => pickFrom(list, 2, seed + index));
  const wornWith = [0, 1].flatMap((row) => picks.flatMap((list) => (list[row] ? [list[row]] : [])));

  return { similar, wornWith };
}

export async function getPublicLooks() {
  return prisma.look.findMany({
    where: { isPublic: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name: true,
      items: {
        select: {
          slot: true,
          product: { select: productCardSelect },
        },
      },
    },
  });
}
