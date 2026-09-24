'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureCartId, findCartId } from '@/lib/cart';

export type CartResult = { ok: true } | { ok: false; message: string };

const addSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(20).default(1),
});

/** Adds one variant to the cart, never beyond what is actually in stock. */
export async function addToCart(input: { variantId: string; quantity?: number }): Promise<CartResult> {
  const parsed = addSchema.safeParse({ variantId: input.variantId, quantity: input.quantity ?? 1 });
  if (!parsed.success) return { ok: false, message: 'Некорректные данные' };

  const variant = await prisma.productVariant.findUnique({
    where: { id: parsed.data.variantId },
    select: { id: true, stock: true, product: { select: { isActive: true } } },
  });

  if (!variant || !variant.product.isActive) return { ok: false, message: 'Товар недоступен' };
  if (variant.stock < 1) return { ok: false, message: 'Этого размера сейчас нет в наличии' };

  const cartId = await ensureCartId();
  const existing = await prisma.cartItem.findUnique({
    where: { cartId_variantId: { cartId, variantId: variant.id } },
    select: { quantity: true },
  });

  const wanted = (existing?.quantity ?? 0) + parsed.data.quantity;
  if (wanted > variant.stock) {
    return { ok: false, message: `В наличии только ${variant.stock} шт.` };
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId, variantId: variant.id } },
    update: { quantity: wanted },
    create: { cartId, variantId: variant.id, quantity: parsed.data.quantity },
  });

  revalidatePath('/cart');
  revalidatePath('/', 'layout'); // the header badge lives in the layout
  return { ok: true };
}

/** Adds every in-stock piece of a saved look in one go. */
export async function addLookToCart(lookId: string): Promise<CartResult & { added?: number; skipped?: number }> {
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
      where: { cartId_variantId: { cartId, variantId: variant.id } },
      update: { quantity: { increment: 1 } },
      create: { cartId, variantId: variant.id, quantity: 1 },
    });
    added += 1;
  }

  revalidatePath('/cart');
  revalidatePath('/', 'layout');
  return { ok: true, added, skipped };
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
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function removeCartItem(itemId: string): Promise<CartResult> {
  const cartId = await findCartId();
  if (!cartId) return { ok: false, message: 'Корзина пуста' };

  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId } });
  revalidatePath('/cart');
  revalidatePath('/', 'layout');
  return { ok: true };
}
