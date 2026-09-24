'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const productId = z.string().min(1);

export type ToggleResult =
  | { status: 'ok'; active: boolean }
  | { status: 'unauthenticated' }
  | { status: 'error'; message: string };

/** Adds or removes a product from the signed-in customer's favourites. */
export async function toggleFavorite(rawId: string): Promise<ToggleResult> {
  const parsed = productId.safeParse(rawId);
  if (!parsed.success) return { status: 'error', message: 'Некорректный товар' };

  const user = await getCurrentUser();
  if (!user) return { status: 'unauthenticated' };

  const existing = await prisma.favorite.findUnique({
    where: { userId_productId: { userId: user.id, productId: parsed.data } },
    select: { id: true },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    revalidatePath('/account/favorites');
    return { status: 'ok', active: false };
  }

  const product = await prisma.product.findFirst({
    where: { id: parsed.data, isActive: true },
    select: { id: true },
  });
  if (!product) return { status: 'error', message: 'Товар недоступен' };

  await prisma.favorite.create({ data: { userId: user.id, productId: product.id } });
  revalidatePath('/account/favorites');
  return { status: 'ok', active: true };
}
