'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ensureCartId } from '@/lib/cart';

const schema = z.array(
  z.object({
    productId: z.string().min(1),
    colorKey: z.string(),
    size: z.string().min(1),
  }),
).min(1).max(8);

export type OutfitResult =
  | { ok: true; added: number; skipped: number }
  | { ok: false; message: string };

/**
 * Adds a whole assembled outfit to the cart.
 *
 * Each piece is matched on the exact colour and size the shopper had on the
 * mannequin. A piece that is out of stock in that size is skipped and counted,
 * never quietly swapped for another size - the buyer would find out at the
 * door, which is worse than being told now.
 */
export async function addOutfitToCart(
  input: { productId: string; colorKey: string; size: string }[],
): Promise<OutfitResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Образ пуст или слишком большой' };

  const products = await prisma.product.findMany({
    where: { id: { in: parsed.data.map((i) => i.productId) }, isActive: true },
    select: {
      id: true,
      variants: {
        select: { id: true, size: true, stock: true, color: { select: { key: true } } },
      },
    },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const cartId = await ensureCartId();
  let added = 0;
  let skipped = 0;

  for (const wanted of parsed.data) {
    const product = byId.get(wanted.productId);
    if (!product) {
      skipped += 1;
      continue;
    }

    const inColor = product.variants.filter(
      (v) => v.color.key === wanted.colorKey || !wanted.colorKey,
    );
    const pool = inColor.length ? inColor : product.variants;

    const sizes = new Set(pool.map((v) => v.size));
    // one-size goods (caps, beanies) ignore the clothing size entirely
    const targetSize = sizes.size === 1 && sizes.has('ONE') ? 'ONE' : wanted.size;

    const variant = pool.find((v) => v.size === targetSize && v.stock > 0);
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
