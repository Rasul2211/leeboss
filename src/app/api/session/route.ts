import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { GUEST_MARK } from '@/lib/auth/session';
import { getCartCount, hasGuestCart } from '@/lib/cart';

/**
 * Everything on a shop page that belongs to one visitor.
 *
 * The pages themselves are the same for everyone and come from the CDN; the
 * browser asks this once for the three things that are not: who is signed in,
 * how full the basket is, and which hearts are filled.
 */
export const dynamic = 'force-dynamic';

export type SessionPayload = {
  user: { name: string; staff: boolean } | null;
  cartCount: number;
  favoriteIds: string[];
};

export async function GET() {
  const user = await getCurrentUser();

  const [cartCount, favorites] = await Promise.all([
    getCartCount(),
    user
      ? prisma.favorite.findMany({ where: { userId: user.id }, select: { productId: true } })
      : [],
  ]);

  const payload: SessionPayload = {
    user: user ? { name: user.name.split(' ')[0] ?? user.name, staff: isStaff(user) } : null,
    cartCount,
    favoriteIds: favorites.map((row) => row.productId),
  };

  const response = NextResponse.json(payload, {
    headers: { 'Cache-Control': 'private, no-store' },
  });

  // nothing personal to report: leave a note so the browser stops asking until
  // the visitor signs in or puts something in the basket
  if (!user && !(await hasGuestCart())) {
    response.cookies.set(GUEST_MARK, '1', { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 });
  }

  return response;
}
