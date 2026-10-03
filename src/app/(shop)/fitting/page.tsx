import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { STOREFRONT_TAG, STOREFRONT_TTL } from '@/lib/storefront';
import { OutfitBuilder } from '@/components/builder/OutfitBuilder';
import { ROWS, type BuilderProduct, type Chosen, type RowSlot, type Slot } from '@/lib/outfit';
import { effectivePrice } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Соберите образ',
  description:
    'Листайте верх, низ и обувь LEEBOSS, смотрите, как они сочетаются, и берите весь образ одной кнопкой.',
};

type Search = { look?: string; add?: string };

/*
  This page reads its query string (?add=, ?look=), so it is rendered per
  request - but the shelves it shows are the same for everyone, and are kept
  between requests instead of being read from the database each time.
*/
const loadProducts = unstable_cache(readProducts, ['builder-products'], {
  tags: [STOREFRONT_TAG],
  revalidate: STOREFRONT_TTL,
});

async function readProducts(): Promise<BuilderProduct[]> {
  const rows = await prisma.product.findMany({
    // an outfit is a whole look in one line: it has no place in a strip of
    // single garments
    where: { isActive: true, isOutfit: false },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      slug: true,
      name: true,
      brand: true,
      price: true,
      salePrice: true,
      mannequinSlot: true,
      images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      colors: { select: { key: true, name: true, hex: true }, orderBy: { sortOrder: 'asc' } },
      variants: { where: { stock: { gt: 0 } }, select: { size: true, color: { select: { key: true } } } },
    },
  });

  // a strip shows a photograph and sells what is in it: no photo or no stock,
  // no place in the strip
  return rows.flatMap((row) => {
    const image = row.images[0]?.url;
    if (!image || row.variants.length === 0) return [];
    return [
      {
        id: row.id,
        slug: row.slug,
        name: row.name,
        brand: row.brand,
        price: effectivePrice(row.price, row.salePrice),
        slot: row.mannequinSlot as Slot,
        image,
        colors: row.colors,
        variants: row.variants.map((variant) => ({ colorKey: variant.color.key, size: variant.size })),
      },
    ];
  });
}

const isRow = (slot: string): slot is RowSlot => ROWS.some((row) => row.slot === slot);

async function resolveInitial(params: Search, products: BuilderProduct[]) {
  const initial: Partial<Record<RowSlot, Chosen>> = {};

  if (params.look) {
    const look = await prisma.look.findUnique({
      where: { id: params.look },
      select: { items: { select: { slot: true, colorKey: true, productId: true } } },
    });
    for (const item of look?.items ?? []) {
      if (isRow(item.slot)) initial[item.slot] = { productId: item.productId, colorKey: item.colorKey ?? '' };
    }
  }

  if (params.add) {
    const product = products.find((p) => p.slug === params.add);
    if (product && isRow(product.slot)) {
      initial[product.slot] = { productId: product.id, colorKey: product.colors[0]?.key ?? '' };
    }
  }

  return initial;
}

export default async function BuilderPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [params, products] = await Promise.all([searchParams, loadProducts()]);
  const initial = await resolveInitial(params, products);

  // the builder keeps its own state; a new address must start it afresh
  return <OutfitBuilder key={`${params.look ?? ''}|${params.add ?? ''}`} products={products} initial={initial} />;
}
