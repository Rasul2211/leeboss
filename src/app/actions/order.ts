'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { DeliveryMethod, OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { cartSubtotal, findCartId, getCartItems } from '@/lib/cart';
import { deliveryCost } from '@/lib/delivery';
import { checkoutSchema, fieldErrors } from '@/lib/validation';
import { effectivePrice } from '@/lib/money';

export type CheckoutState = { errors?: Record<string, string> };

/**
 * Order numbers come from a Postgres sequence rather than from counting rows.
 * Two people checking out in the same second would otherwise be handed the
 * same number, and the column is unique - one of them would simply fail.
 */
async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  await tx.$executeRawUnsafe('CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1');
  const rows = await tx.$queryRawUnsafe<{ nextval: bigint }[]>("SELECT nextval('order_number_seq')");
  const value = Number(rows[0]?.nextval ?? 1);
  return `LB-${String(value).padStart(6, '0')}`;
}

export async function createOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    comment: formData.get('comment') || undefined,
    deliveryMethod: formData.get('deliveryMethod'),
    pickupPointId: formData.get('pickupPointId') || undefined,
    deliveryZoneId: formData.get('deliveryZoneId') || undefined,
    address: formData.get('address') || undefined,
    paymentMethod: formData.get('paymentMethod'),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const input = parsed.data;
  const [user, cartId, items] = await Promise.all([getCurrentUser(), findCartId(), getCartItems()]);

  if (!cartId || items.length === 0) {
    return { errors: { form: 'Корзина пуста' } };
  }

  const zone = input.deliveryZoneId
    ? await prisma.deliveryZone.findUnique({ where: { id: input.deliveryZoneId } })
    : null;

  if (input.deliveryMethod !== DeliveryMethod.PICKUP && !zone) {
    return { errors: { deliveryZoneId: 'Выберите город' } };
  }

  const subtotal = cartSubtotal(items);
  const shipping = deliveryCost(input.deliveryMethod as DeliveryMethod, zone, subtotal);

  let number: string;

  try {
    number = await prisma.$transaction(async (tx) => {
      // reserve stock first: an order that cannot be fulfilled must not exist
      for (const item of items) {
        const reserved = await tx.productVariant.updateMany({
          where: { id: item.variant.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (reserved.count !== 1) {
          throw new OutOfStock(item.variant.product.name, item.variant.size);
        }
      }

      const orderNumber = await nextOrderNumber(tx);

      const order = await tx.order.create({
        data: {
          number: orderNumber,
          userId: user?.id ?? null,
          status: OrderStatus.NEW,
          paymentMethod: input.paymentMethod as PaymentMethod,
          // the demo card flow marks itself paid; cash is settled at handover
          paymentStatus:
            input.paymentMethod === PaymentMethod.CARD_DEMO
              ? PaymentStatus.PAID
              : PaymentStatus.PENDING,
          deliveryMethod: input.deliveryMethod as DeliveryMethod,
          deliveryZoneId: zone?.id ?? null,
          pickupPointId: input.pickupPointId ?? null,
          city: zone?.city ?? null,
          address: input.address ?? null,
          customerName: input.name,
          customerPhone: input.phone,
          comment: input.comment ?? null,
          subtotal,
          deliveryCost: shipping,
          total: subtotal + shipping,
          items: {
            create: items.map((item) => ({
              productId: item.variant.product.id,
              variantId: item.variant.id,
              name: item.variant.product.name,
              size: item.variant.size,
              colorName: item.variant.color.name,
              price: effectivePrice(item.variant.product.price, item.variant.product.salePrice),
              quantity: item.quantity,
            })),
          },
          events: { create: { status: OrderStatus.NEW, note: 'Заказ оформлен на сайте' } },
        },
        select: { number: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId } });
      return order.number;
    });
  } catch (error) {
    if (error instanceof OutOfStock) {
      return { errors: { form: `${error.product} (${error.size}) разобрали, пока вы оформляли заказ` } };
    }
    throw error;
  }

  revalidatePath('/cart');
  revalidatePath('/', 'layout');
  redirect(`/order/${number}`);
}

class OutOfStock extends Error {
  constructor(
    readonly product: string,
    readonly size: string,
  ) {
    super('out of stock');
  }
}
