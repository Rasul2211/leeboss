import { prisma } from '@/lib/prisma';
import { productCardSelect, type ProductCardData } from '@/lib/catalog';

/** Every garment the shop sells on its own, newest first: the home page's catalogue. */
export async function getAllGarments(): Promise<ProductCardData[]> {
  return prisma.product.findMany({
    where: { isActive: true, isOutfit: false },
    orderBy: { createdAt: 'desc' },
    select: productCardSelect,
  });
}
