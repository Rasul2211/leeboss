import 'server-only';
import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * Ids of the current customer's favourites, so a grid can mark its hearts in a
 * single query instead of one per card. Guests simply get an empty set.
 */
export const getFavoriteIds = cache(async (): Promise<Set<string>> => {
  const user = await getCurrentUser();
  if (!user) return new Set();

  const rows = await prisma.favorite.findMany({
    where: { userId: user.id },
    select: { productId: true },
  });
  return new Set(rows.map((row) => row.productId));
});
