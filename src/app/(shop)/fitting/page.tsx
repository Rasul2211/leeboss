import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { FittingRoom } from '@/components/fitting/FittingRoom';
import { PhotoFittingRoom, type LayerIndex } from '@/components/fitting/PhotoFittingRoom';
import type { FittingProduct } from '@/components/fitting/ItemPicker';
import type { Slot } from '@/lib/mannequin/garments';

export const metadata: Metadata = {
  title: 'Виртуальная примерочная',
  description:
    'Выберите телосложение, соберите полный образ из вещей LEEBOSS и добавьте его в корзину одной кнопкой.',
};

type Search = { look?: string; add?: string };
type Worn = Partial<Record<Slot, { productId: string; colorKey: string }>>;

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

async function resolveInitial(params: Search, products: FittingProduct[]) {
  const worn: Worn = {};
  let slot: Slot = 'TOP';

  if (params.look) {
    const look = await prisma.look.findUnique({
      where: { id: params.look },
      select: {
        items: {
          select: {
            slot: true,
            colorKey: true,
            product: {
              select: {
                id: true,
                colors: { select: { key: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
              },
            },
          },
        },
      },
    });

    for (const item of look?.items ?? []) {
      worn[item.slot as Slot] = {
        productId: item.product.id,
        colorKey: item.colorKey ?? item.product.colors[0]?.key ?? '',
      };
    }
  }

  if (params.add) {
    const product = products.find((p) => p.slug === params.add);
    if (product) {
      worn[product.slot] = { productId: product.id, colorKey: product.colors[0]?.key ?? '' };
      slot = product.slot;
    }
  }

  return { worn, slot };
}

export default async function FittingPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [params, products, bodies] = await Promise.all([
    searchParams,
    loadProducts(),
    prisma.fittingBody.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        bodyType: true,
        label: true,
        imageUrl: true,
        width: true,
        height: true,
      },
    }),
  ]);

  const { worn, slot } = await resolveInitial(params, products);

  /*
    Photographs win when there are any, because a real garment on a real body
    beats anything generated. Until the shoot is done the procedural mannequin
    stands in, so the room never sits empty and nothing regresses while the
    photos are being taken.
  */
  if (bodies.length === 0) {
    return <FittingRoom products={products} initialWorn={worn} initialSlot={slot} />;
  }

  const layerRows = await prisma.fittingLayer.findMany({
    select: { productId: true, bodyId: true, imageUrl: true },
  });

  const layers: LayerIndex = {};
  for (const row of layerRows) {
    (layers[row.productId] ??= {})[row.bodyId] = row.imageUrl;
  }

  return (
    <PhotoFittingRoom
      bodies={bodies}
      products={products}
      layers={layers}
      initialWorn={worn}
      initialSlot={slot}
    />
  );
}
