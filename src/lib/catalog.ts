import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Shape every product grid renders from. */
export const productCardSelect = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  price: true,
  salePrice: true,
  images: { select: { url: true, alt: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
  colors: { select: { key: true, name: true, hex: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProductSelect;

export type ProductCardData = Prisma.ProductGetPayload<{ select: typeof productCardSelect }>;

export const SORTS = {
  new: { createdAt: 'desc' },
  cheap: { price: 'asc' },
  expensive: { price: 'desc' },
  name: { name: 'asc' },
} as const satisfies Record<string, Prisma.ProductOrderByWithRelationInput>;

export type SortKey = keyof typeof SORTS;

export const SORT_LABELS: Record<SortKey, string> = {
  new: 'Сначала новые',
  cheap: 'Сначала дешёвые',
  expensive: 'Сначала дорогие',
  name: 'По названию',
};

export function isSortKey(value: string | undefined): value is SortKey {
  return value != null && value in SORTS;
}

/** Top-level sections with their subcategories, for the header menu and catalogue rail. */
export async function getCategoryTree() {
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

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    include: {
      category: { select: { slug: true, name: true, sizeType: true, parent: { select: { slug: true, name: true } } } },
      images: { orderBy: { sortOrder: 'asc' } },
      colors: { orderBy: { sortOrder: 'asc' } },
      variants: { select: { id: true, size: true, stock: true, colorId: true } },
      reviews: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        select: { id: true, rating: true, text: true, createdAt: true, user: { select: { name: true } } },
      },
    },
  });
}

export async function getNewArrivals(take = 6) {
  return prisma.product.findMany({
    where: { isActive: true },
    select: productCardSelect,
    orderBy: { createdAt: 'desc' },
    take,
  });
}

/**
 * Best sellers are counted from real order lines. With no orders yet this
 * returns an empty list and the home page simply omits the block - nothing
 * is invented to fill the space.
 */
export async function getBestSellers(take = 6): Promise<ProductCardData[]> {
  const rows = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take,
  });
  if (rows.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: rows.map((r) => r.productId) }, isActive: true },
    select: productCardSelect,
  });

  const rank = new Map(rows.map((r, i) => [r.productId, i]));
  return products.sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}

/** Discounted items. Empty until someone sets a sale price in the admin panel. */
export async function getOnSale(take = 6) {
  return prisma.product.findMany({
    where: { isActive: true, salePrice: { not: null } },
    select: productCardSelect,
    orderBy: { updatedAt: 'desc' },
    take,
  });
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

export async function getTestimonials() {
  return prisma.testimonial.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, authorName: true, text: true },
  });
}
