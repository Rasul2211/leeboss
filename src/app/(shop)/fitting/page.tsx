import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { FittingRoom } from '@/components/fitting/FittingRoom';
import type { FittingProduct } from '@/components/fitting/ItemPicker';
import type { Slot } from '@/lib/mannequin/garments';

export const metadata: Metadata = {
  title: 'Виртуальная примерочная',
  description:
    'Настройте манекен под свой рост, вес и телосложение, соберите полный образ из вещей LEEBOSS и добавьте его в корзину одной кнопкой.',
};

type Search = { look?: string; add?: string };

async function loadProducts(): Promise<FittingProduct[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [{ mannequinSlot: 'asc' }, { price: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      brand: true,
      price: true,
      salePrice: true,
      mannequinSlot: true,
      fitType: true,
      category: { select: { name: true } },
      images: { select: { url: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
      colors: { select: { key: true, name: true, hex: true }, orderBy: { sortOrder: 'asc' } },
      variants: { select: { stock: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    price: row.salePrice ?? row.price,
    subcategory: row.category.name,
    slot: row.mannequinSlot as Slot,
    fit: row.fitType,
    image: row.images[0]?.url ?? null,
    colors: row.colors,
    inStock: row.variants.some((v) => v.stock > 0),
  }));
}

export default async function FittingPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [params, products] = await Promise.all([searchParams, loadProducts()]);

  const initialWorn: Partial<Record<Slot, { productId: string; colorKey: string }>> = {};
  let initialSlot: Slot = 'TOP';

  // arriving from a saved look: dress the mannequin before the first paint
  if (params.look) {
    const look = await prisma.look.findUnique({
      where: { id: params.look },
      select: {
        items: {
          select: {
            slot: true,
            colorKey: true,
            product: { select: { id: true, colors: { select: { key: true }, orderBy: { sortOrder: 'asc' }, take: 1 } } },
          },
        },
      },
    });

    for (const item of look?.items ?? []) {
      initialWorn[item.slot as Slot] = {
        productId: item.product.id,
        colorKey: item.colorKey ?? item.product.colors[0]?.key ?? '',
      };
    }
  }

  // arriving from a product page: put that one item on
  if (params.add) {
    const product = products.find((p) => p.slug === params.add);
    if (product) {
      initialWorn[product.slot] = { productId: product.id, colorKey: product.colors[0]?.key ?? '' };
      initialSlot = product.slot;
    }
  }

  return <FittingRoom products={products} initialWorn={initialWorn} initialSlot={initialSlot} />;
}
