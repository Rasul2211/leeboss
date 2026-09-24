import 'server-only';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { effectivePrice } from '@/lib/money';

/*
  A guest's cart is a database row keyed by a cookie; a signed-in customer's
  cart is keyed by the user id. Keeping it server-side means the cart survives
  a device change and that stock is checked against real rows, not local state.

  Reading never creates anything: a server component cannot set cookies, so
  creation happens only inside the server actions below.
*/

const COOKIE = 'lb_cart';
const MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export const cartItemSelect = {
  id: true,
  quantity: true,
  variant: {
    select: {
      id: true,
      size: true,
      stock: true,
      color: { select: { name: true, hex: true } },
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          brand: true,
          price: true,
          salePrice: true,
          images: { select: { url: true, alt: true }, orderBy: { sortOrder: 'asc' }, take: 1 },
        },
      },
    },
  },
} as const;

export async function findCartId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) {
    const cart = await prisma.cart.findFirst({ where: { userId: user.id }, select: { id: true } });
    return cart?.id ?? null;
  }
  const sessionId = (await cookies()).get(COOKIE)?.value;
  if (!sessionId) return null;
  const cart = await prisma.cart.findUnique({ where: { sessionId }, select: { id: true } });
  return cart?.id ?? null;
}

/** Creates the cart if it does not exist yet. Only call from a server action. */
export async function ensureCartId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) {
    const existing = await prisma.cart.findFirst({ where: { userId: user.id }, select: { id: true } });
    if (existing) return existing.id;
    const created = await prisma.cart.create({ data: { userId: user.id }, select: { id: true } });
    return created.id;
  }

  const jar = await cookies();
  let sessionId = jar.get(COOKIE)?.value;
  if (sessionId) {
    const existing = await prisma.cart.findUnique({ where: { sessionId }, select: { id: true } });
    if (existing) return existing.id;
  } else {
    sessionId = randomUUID();
    jar.set(COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: MAX_AGE,
    });
  }
  const created = await prisma.cart.create({ data: { sessionId }, select: { id: true } });
  return created.id;
}

export async function getCartItems() {
  const cartId = await findCartId();
  if (!cartId) return [];
  return prisma.cartItem.findMany({
    where: { cartId },
    select: cartItemSelect,
    orderBy: { id: 'asc' },
  });
}

export async function getCartCount(): Promise<number> {
  const cartId = await findCartId();
  if (!cartId) return 0;
  const result = await prisma.cartItem.aggregate({ where: { cartId }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}

export type CartItem = Awaited<ReturnType<typeof getCartItems>>[number];

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce(
    (sum, item) =>
      sum + effectivePrice(item.variant.product.price, item.variant.product.salePrice) * item.quantity,
    0,
  );
}

/**
 * After signing in, whatever the guest collected is folded into the user's cart
 * and the guest row is dropped, so nothing is silently lost at the login step.
 */
export async function mergeGuestCart(userId: string): Promise<void> {
  const jar = await cookies();
  const sessionId = jar.get(COOKIE)?.value;
  if (!sessionId) return;

  const guest = await prisma.cart.findUnique({
    where: { sessionId },
    select: { id: true, items: { select: { variantId: true, quantity: true } } },
  });
  if (!guest) return;

  if (guest.items.length) {
    const target =
      (await prisma.cart.findFirst({ where: { userId }, select: { id: true } })) ??
      (await prisma.cart.create({ data: { userId }, select: { id: true } }));

    for (const item of guest.items) {
      await prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: target.id, variantId: item.variantId } },
        update: { quantity: { increment: item.quantity } },
        create: { cartId: target.id, variantId: item.variantId, quantity: item.quantity },
      });
    }
  }

  await prisma.cart.delete({ where: { id: guest.id } });
  jar.delete(COOKIE);
}
