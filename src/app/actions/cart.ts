'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { countCartItems, ensureCartId, findCartId } from '@/lib/cart';

/**
 * `count` is the basket total after the change. The header badge is drawn in
 * the browser, so it is handed the new number here instead of the whole layout
 * being re-rendered - which, now that the shop window is cached, would also
 * throw that cache away on every tap of "add to basket".
 */
export type CartResult = { ok: true; count: number } | { ok: false; message: string };

const addSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
  // an outfit is one line whose top, bottom and shoes are sized separately, so
  // the three sizes ride along with the line rather than on the variant
  sizeNote: z.string().max(120).default(''),
});

/** Adds one variant to the cart, never beyond what is actually in stock. */
export async function addToCart(
  input: { variantId: string; quantity?: number; sizeNote?: string },
): Promise<CartResult> {
  const parsed = addSchema.safeParse({
    variantId: input.variantId,
    quantity: input.quantity ?? 1,
    sizeNote: input.sizeNote ?? '',
  });
  if (!parsed.success) return { ok: false, message: 'Некорректные данные' };

  // the two lookups do not depend on each other, and each is a round trip
  const [variant, cartId] = await Promise.all([
    prisma.productVariant.findUnique({
      where: { id: parsed.data.variantId },
      select: { id: true, stock: true, product: { select: { isActive: true } } },
    }),
    ensureCartId(),
  ]);

  if (!variant || !variant.product.isActive) return { ok: false, message: 'Товар недоступен' };
  if (variant.stock < 1) return { ok: false, message: 'Этого размера сейчас нет в наличии' };

  const { sizeNote } = parsed.data;
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId_sizeNote: { cartId, variantId: variant.id, sizeNote } },
    select: { quantity: true },
  });

  const wanted = (existing?.quantity ?? 0) + parsed.data.quantity;
  if (wanted > variant.stock) {
    return { ok: false, message: `В наличии только ${variant.stock} шт.` };
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId_sizeNote: { cartId, variantId: variant.id, sizeNote } },
    update: { quantity: wanted },
    create: { cartId, variantId: variant.id, quantity: parsed.data.quantity, sizeNote },
  });

  // nothing is revalidated: the basket page is rendered per request anyway, and
  // revalidating from here would make this tap wait for a page re-render
  return { ok: true, count: await countCartItems(cartId) };
}

/** Adds every in-stock piece of a saved look in one go. */
export async function addLookToCart(
  lookId: string,
): Promise<CartResult & { added?: number; skipped?: number }> {
  const look = await prisma.look.findUnique({
    where: { id: lookId },
    select: {
      items: {
        select: {
          colorKey: true,
          product: {
            select: {
              isActive: true,
              variants: {
                where: { stock: { gt: 0 } },
                select: { id: true, size: true, color: { select: { key: true } } },
                orderBy: { size: 'asc' },
              },
            },
          },
        },
      },
    },
  });
  if (!look) return { ok: false, message: 'Образ не найден' };

  const cartId = await ensureCartId();
  let added = 0;
  let skipped = 0;

  for (const item of look.items) {
    if (!item.product.isActive) {
      skipped += 1;
      continue;
    }
    // prefer the colour the look was built with, otherwise any available one
    const variant =
      item.product.variants.find((v) => v.color.key === item.colorKey) ?? item.product.variants[0];

    if (!variant) {
      skipped += 1;
      continue;
    }

    await prisma.cartItem.upsert({
      where: { cartId_variantId_sizeNote: { cartId, variantId: variant.id, sizeNote: '' } },
      update: { quantity: { increment: 1 } },
      create: { cartId, variantId: variant.id, quantity: 1 },
    });
    added += 1;
  }

  return { ok: true, count: await countCartItems(cartId), added, skipped };
}

export async function setCartItemQuantity(itemId: string, quantity: number): Promise<CartResult> {
  const cartId = await findCartId();
  if (!cartId) return { ok: false, message: 'Корзина пуста' };

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId },
    select: { id: true, variant: { select: { stock: true } } },
  });
  if (!item) return { ok: false, message: 'Позиция не найдена' };

  if (quantity < 1) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    if (quantity > item.variant.stock) {
      return { ok: false, message: `В наличии только ${item.variant.stock} шт.` };
    }
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
  }

  revalidatePath('/cart');
  return { ok: true, count: await countCartItems(cartId) };
}

export async function removeCartItem(itemId: string): Promise<CartResult> {
  const cartId = await findCartId();
  if (!cartId) return { ok: false, message: 'Корзина пуста' };

  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
  revalidatePath('/cart');
  return { ok: true, count: await countCartItems(cartId) };
}
